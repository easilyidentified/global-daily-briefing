(() => {
  const CATS = [['politics', '정치'], ['economy', '경제'], ['other', '기타']];
  const BG = '#131313';
  const PAL = {
    level: { hub: '#ec3013', core: '#e6e3e1', past: '#7e7a78' },
    category: { politics: '#ec3013', economy: '#e6e3e1', other: '#7e7a78' },
    age: ['#ec3013', '#c25a45', '#8f8a87', '#6b6866', '#4d4a48']
  };
  const DEFAULTS = {
    cats: { politics: true, economy: true, other: true },
    days: 40, coreOnly: false, group: 'level', linkMode: 'both',
    simThreshold: 0.25, maxDeg: 3,
    textZoom: 1.1, nodeSize: 1, gravity: 1, repel: 1, linkDist: 110
  };
  const KEY = 'issuegraph.settings.v2';

  let dataP = null;
  const loadData = () => dataP || (dataP = fetch('data/issues.json').then(r => r.json()));

  const el = (tag, style, text) => { const n = document.createElement(tag); if (style) n.setAttribute('style', style); if (text != null) n.textContent = text; return n; };
  const LBL = 'font:700 10px/1 Archivo,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8a8683';
  const ROW = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0';
  const RNG = 'width:92px;accent-color:#ec3013;height:14px';
  const TXT = 'font:600 12px/1.2 Archivo,sans-serif;white-space:nowrap;color:#d9d7d5';

  /* similarity: weighted Jaccard over topic keywords, nudged by shared category */
  function similarity(a, b) {
    const A = a.topics || [], B = b.topics || [];
    if (!A.length || !B.length) return 0;
    const setB = new Set(B);
    let inter = 0;
    A.forEach(t => { if (setB.has(t)) inter++; });
    if (!inter) return 0;
    const jac = inter / (A.length + B.length - inter);
    return Math.min(1, jac + (a.category === b.category ? 0.08 : 0));
  }

  class IssueGraph extends HTMLElement {
    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.s = Object.assign({}, DEFAULTS, this.readPrefs());
      this.s.cats = Object.assign({}, DEFAULTS.cats, this.s.cats);
      this.nodes = []; this.pairs = []; this.catLinks = [];
      this.scale = 1; this.panX = 0; this.panY = 0;
      this.hover = null; this.drag = null; this.panning = null;

      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.height = '100%';
      this.style.background = BG;
      this.style.border = '1px solid #2b2b2b';
      this.style.overflow = 'hidden';

      this.canvas = el('canvas', 'position:absolute;inset:0;display:block;width:100%;height:100%;cursor:grab');
      this.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      this.tip = el('div', 'position:absolute;z-index:6;width:min(330px,70vw);background:#1f1f1f;border:1px solid #3a3a3a;color:#e6e3e1;padding:13px 15px 14px;pointer-events:none;display:none;box-shadow:0 12px 34px rgba(0,0,0,.6);font-family:Archivo,sans-serif');
      this.appendChild(this.tip);

      this.buildPanel();
      this.buildLegend();
      this.bind();

      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this);
      this.resize();

      loadData().then(d => { this.raw = d; this.rebuild(); });
      this.loop = this.loop.bind(this);
      this._raf = requestAnimationFrame(this.loop);
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); this.ro && this.ro.disconnect(); }

    static get observedAttributes() { return ['country']; }
    attributeChangedCallback(n) { if (n === 'country' && this.raw) this.rebuild(); }

    readPrefs() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
    savePrefs() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) {} }

    resize() {
      const r = this.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (Math.abs(r.width - (this.w || 0)) < 0.5 && Math.abs(r.height - (this.h || 0)) < 0.5) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = r.width; this.h = r.height;
      this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._fitUntil = performance.now() + 1200;
    }

    /* ---------- data ---------- */
    rebuild() {
      const code = (this.getAttribute('country') || 'KR').replace(/[{}\s]/g, '');
      const c = this.raw.COUNTRIES[code];
      const anchor = c ? c.latestDate : '2026.08.09';
      const ts = d => Date.parse(String(d).replace(/\./g, '-'));
      const age = d => Math.max(0, Math.round((ts(anchor) - ts(d)) / 86400000));

      const nodes = [], catLinks = [], arts = [];
      CATS.forEach(([id, label], k) => {
        const hub = { key: 'hub-' + id, kind: 'hub', category: id, title: label, date: anchor, answer: '', age: 0, topics: [], x: (k - 1) * 240, y: 0, vx: 0, vy: 0 };
        nodes.push(hub);
        const list = c ? c.issues.filter(n => n.category === id) : [];
        list.forEach((n, j) => {
          const a = age(n.date);
          const o = {
            key: n.id, kind: a === 0 ? 'core' : 'past', category: id, title: n.title, date: n.date,
            answer: n.summary, age: a, topics: n.topics || [],
            x: hub.x + (j - list.length / 2) * 70, y: 90 + (j % 3) * 55, vx: 0, vy: 0
          };
          nodes.push(o); arts.push(o); catLinks.push({ a: hub, b: o, sim: 0, cat: true });
        });
      });

      const pairs = [];
      for (let i = 0; i < arts.length; i++) {
        for (let j = i + 1; j < arts.length; j++) {
          const sim = similarity(arts[i], arts[j]);
          if (sim > 0.05) pairs.push({ a: arts[i], b: arts[j], sim, cat: false });
        }
      }
      pairs.sort((p, q) => q.sim - p.sim);
      this.nodes = nodes; this.pairs = pairs; this.catLinks = catLinks;
      // pre-warm the simulation so the graph appears already settled
      this._live = this.links();
      for (let i = 0; i < 400; i++) this.step();
      for (let i = 0; i < 80; i++) this.fitStep();
      this._fitUntil = performance.now() + 600;
    }

    visible(n) {
      const s = this.s;
      if (!s.cats[n.category]) return false;
      if (n.kind === 'hub') return true;
      if (s.coreOnly && n.kind === 'past') return false;
      return n.age <= s.days;
    }

    /* similarity links, capped per node so the graph stays readable */
    links() {
      const s = this.s, out = [], deg = {};
      if (s.linkMode !== 'category') {
        this.pairs.forEach(p => {
          if (p.sim < s.simThreshold) return;
          if (!this.visible(p.a) || !this.visible(p.b)) return;
          if ((deg[p.a.key] || 0) >= s.maxDeg || (deg[p.b.key] || 0) >= s.maxDeg) return;
          deg[p.a.key] = (deg[p.a.key] || 0) + 1; deg[p.b.key] = (deg[p.b.key] || 0) + 1;
          out.push(p);
        });
      }
      if (s.linkMode !== 'similarity') {
        this.catLinks.forEach(l => { if (this.visible(l.a) && this.visible(l.b)) out.push(l); });
      }
      return out;
    }

    color(n) {
      const s = this.s;
      if (s.group === 'category') return n.kind === 'hub' ? '#f3f2f2' : PAL.category[n.category];
      if (s.group === 'age') return n.kind === 'hub' ? '#f3f2f2' : PAL.age[Math.min(PAL.age.length - 1, Math.floor(n.age / 7))];
      return PAL.level[n.kind];
    }
    radius(n) { return (n.kind === 'hub' ? 17 : n.kind === 'core' ? 10 : 6.5) * this.s.nodeSize; }

    neighbors(n) {
      if (this._nbFor === n && this._nb) return this._nb;
      const set = new Set([n.key]);
      this._live.forEach(l => { if (l.a === n) set.add(l.b.key); if (l.b === n) set.add(l.a.key); });
      this._nbFor = n; this._nb = set;
      return set;
    }

    /* ---------- physics ---------- */
    step() {
      const s = this.s, act = this.nodes.filter(n => this.visible(n));
      for (let i = 0; i < act.length; i++) {
        const a = act[i];
        a.vx += (0 - a.x) * 0.0009 * s.gravity;
        a.vy += (0 - a.y) * 0.0009 * s.gravity;
        for (let j = i + 1; j < act.length; j++) {
          const b = act[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
          const d = Math.sqrt(d2);
          const f = Math.min(4, (2400 * s.repel * (a.kind === 'hub' || b.kind === 'hub' ? 1.6 : 1)) / d2) / d;
          a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
        }
      }
      this._live.forEach(l => {
        const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const want = l.cat ? s.linkDist * 1.15 : s.linkDist * (1.15 - l.sim * 0.5);
        const k = l.cat ? 0.009 : 0.016 * (0.5 + l.sim);
        const f = (d - want) * k / d;
        l.a.vx += dx * f; l.a.vy += dy * f; l.b.vx -= dx * f; l.b.vy -= dy * f;
      });
      act.forEach(n => {
        if (this.drag && this.drag.node === n) { n.vx = 0; n.vy = 0; return; }
        n.vx *= 0.86; n.vy *= 0.86;
        n.x += Math.max(-8, Math.min(8, n.vx));
        n.y += Math.max(-8, Math.min(8, n.vy));
      });
    }

    fitStep() {
      const act = this.nodes.filter(n => this.visible(n));
      if (!act.length || !this.w) return;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      act.forEach(n => {
        const r = this.radius(n) + 22;
        x0 = Math.min(x0, n.x - r); x1 = Math.max(x1, n.x + r);
        y0 = Math.min(y0, n.y - r); y1 = Math.max(y1, n.y + r);
      });
      const padL = 40, padR = this.w > 720 ? 300 : 40, padT = 40, padB = 90;
      const bw = Math.max(80, this.w - padL - padR), bh = Math.max(80, this.h - padT - padB);
      const s = Math.max(0.3, Math.min(1.6, Math.min(bw / (x1 - x0), bh / (y1 - y0))));
      const tx = padL + bw / 2 - this.w / 2 - ((x0 + x1) / 2) * s;
      const ty = padT + bh / 2 - this.h / 2 - ((y0 + y1) / 2) * s;
      this.scale += (s - this.scale) * 0.09;
      this.panX += (tx - this.panX) * 0.09;
      this.panY += (ty - this.panY) * 0.09;
    }

    /* ---------- render ---------- */
    toScreen(n) { return [n.x * this.scale + this.panX + this.w / 2, n.y * this.scale + this.panY + this.h / 2]; }
    toWorld(sx, sy) { return [(sx - this.w / 2 - this.panX) / this.scale, (sy - this.h / 2 - this.panY) / this.scale]; }

    loop() {
      this._raf = requestAnimationFrame(this.loop);
      if (!this.w) return;
      this._live = this.links();
      this._nbFor = null;
      this.step();
      if (this._fitUntil && performance.now() < this._fitUntil) this.fitStep();

      const c = this.ctx, hv = this.hover;
      const nb = hv ? this.neighbors(hv) : null;
      c.clearRect(0, 0, this.w, this.h);
      c.fillStyle = BG; c.fillRect(0, 0, this.w, this.h);
      this.drawGrid(c);

      this._live.forEach(l => {
        const [ax, ay] = this.toScreen(l.a), [bx, by] = this.toScreen(l.b);
        const hot = hv && (l.a === hv || l.b === hv);
        c.globalAlpha = hv ? (hot ? 1 : 0.14) : 1;
        c.strokeStyle = hot ? '#ec3013' : (l.cat ? '#2e2e2e' : '#454545');
        c.lineWidth = Math.max(0.6, (l.cat ? 1 : 0.8 + l.sim * 2.6) * this.scale);
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      });

      const act = this.nodes.filter(n => this.visible(n));
      act.forEach(n => {
        const [x, y] = this.toScreen(n);
        const r = this.radius(n) * this.scale;
        c.globalAlpha = hv ? (nb.has(n.key) ? 1 : 0.18) : 1;
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
        c.fillStyle = this.color(n); c.fill();
        if (hv === n) { c.lineWidth = 2; c.strokeStyle = '#ec3013'; c.stroke(); }
      });

      const show = this.scale >= this.s.textZoom;
      c.textAlign = 'center'; c.textBaseline = 'top';
      act.forEach(n => {
        if (n.kind !== 'hub' && !show && hv !== n) return;
        const [x, y] = this.toScreen(n);
        const r = this.radius(n) * this.scale;
        const big = n.kind === 'hub';
        c.globalAlpha = hv ? (nb.has(n.key) ? 1 : 0.16) : 1;
        c.font = (big ? '800 ' : '600 ') + Math.max(9, Math.min(19, (big ? 14 : 11.5) * Math.min(1.5, this.scale))) + 'px Archivo, sans-serif';
        const t = n.title.length > 17 ? n.title.slice(0, 17) + '…' : n.title;
        c.fillStyle = big ? '#f3f2f2' : '#b9b6b4';
        c.fillText(t, x, y + r + 7);
      });
      c.globalAlpha = 1;
    }

    drawGrid(c) {
      const step = 80 * this.scale;
      if (step < 14) return;
      const mod = (v, m) => ((v % m) + m) % m;
      const ox = mod(this.panX + this.w / 2, step), oy = mod(this.panY + this.h / 2, step);
      c.strokeStyle = '#1e1e1e';
      c.lineWidth = 1;
      c.beginPath();
      for (let x = ox; x < this.w; x += step) { c.moveTo(Math.round(x) + 0.5, 0); c.lineTo(Math.round(x) + 0.5, this.h); }
      for (let y = oy; y < this.h; y += step) { c.moveTo(0, Math.round(y) + 0.5); c.lineTo(this.w, Math.round(y) + 0.5); }
      c.stroke();
    }

    /* ---------- interaction ---------- */
    pick(sx, sy) {
      const act = this.nodes.filter(n => this.visible(n));
      for (let i = act.length - 1; i >= 0; i--) {
        const n = act[i], [x, y] = this.toScreen(n);
        if (Math.hypot(sx - x, sy - y) <= this.radius(n) * this.scale + 6) return n;
      }
      return null;
    }

    showTip(n, sx, sy) {
      const kind = n.kind === 'hub' ? '카테고리' : n.kind === 'core' ? '오늘 핵심' : '과거 이슈';
      this.tip.innerHTML = '';
      if (n.kind === 'hub') {
        this.tip.append(
          el('div', 'font:700 10px/1 Archivo,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ec3013', kind),
          el('div', 'margin-top:9px;font:800 17px/1.3 Archivo,sans-serif;letter-spacing:-.01em', n.title)
        );
      } else {
        const head = el('div', 'display:flex;align-items:baseline;gap:10px;font:700 10px/1 Archivo,sans-serif;letter-spacing:.18em;text-transform:uppercase');
        head.append(el('span', 'color:#ec3013', kind), el('span', 'color:#8a8683', n.date));
        const t = el('div', 'margin-top:9px;font:700 15px/1.32 Archivo,sans-serif;letter-spacing:-.01em;text-wrap:pretty', n.title);
        const box = el('div', 'margin-top:11px;padding-top:11px;border-top:1px solid #3a3a3a');
        box.append(
          el('div', 'font:700 9px/1 Archivo,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#ec3013;margin-bottom:6px', 'Answer First'),
          el('div', 'font:400 12px/1.55 Archivo,sans-serif;color:#b9b6b4;text-wrap:pretty', n.answer)
        );
        const chips = el('div', 'margin-top:11px;display:flex;flex-wrap:wrap;gap:5px');
        (n.topics || []).forEach(k => chips.appendChild(el('span', 'font:600 10px/1 Archivo,sans-serif;letter-spacing:.06em;color:#d9d7d5;border:1px solid #3f3f3f;padding:4px 7px', k)));
        this.tip.append(head, t, box, chips);
      }
      this.tip.style.display = 'block';
      const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
      this.tip.style.left = Math.max(8, Math.min(this.w - tw - 8, sx - tw / 2)) + 'px';
      this.tip.style.top = (sy - th - 16 < 8 ? sy + 20 : sy - th - 16) + 'px';
    }

    bind() {
      const cv = this.canvas;
      const local = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

      cv.addEventListener('wheel', e => {
        e.preventDefault();
        this._fitUntil = 0;
        const [mx, my] = local(e);
        const [wx, wy] = this.toWorld(mx, my);
        const next = Math.max(0.25, Math.min(4, this.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        this.scale = next;
        this.panX = mx - this.w / 2 - wx * next;
        this.panY = my - this.h / 2 - wy * next;
      }, { passive: false });

      cv.addEventListener('pointerdown', e => {
        const [mx, my] = local(e);
        const n = this.pick(mx, my);
        this._fitUntil = 0;
        cv.setPointerCapture(e.pointerId);
        this._moved = 0;
        if (n) this.drag = { node: n };
        else this.panning = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY };
        cv.style.cursor = 'grabbing';
      });
      cv.addEventListener('pointermove', e => {
        const [mx, my] = local(e);
        if (this.drag) {
          const [wx, wy] = this.toWorld(mx, my);
          this.drag.node.x = wx; this.drag.node.y = wy;
          this._moved += 1; return;
        }
        if (this.panning) {
          this.panX = this.panning.px + (e.clientX - this.panning.x);
          this.panY = this.panning.py + (e.clientY - this.panning.y);
          this._moved += 1; return;
        }
        const n = this.pick(mx, my);
        this.hover = n;
        cv.style.cursor = n ? 'pointer' : 'grab';
        if (n) this.showTip(n, mx, my); else this.tip.style.display = 'none';
      });
      cv.addEventListener('pointerup', () => {
        if (this.drag && this._moved < 3) {
          const n = this.drag.node;
          if (n.kind !== 'hub') this.dispatchEvent(new CustomEvent('issuejump', { bubbles: true, detail: { key: n.key, category: n.category } }));
          else this.dispatchEvent(new CustomEvent('issuecategory', { bubbles: true, detail: n.category }));
        }
        this.drag = null; this.panning = null; cv.style.cursor = 'grab';
      });
      cv.addEventListener('pointercancel', () => { this.drag = null; this.panning = null; });
      cv.addEventListener('pointerleave', () => { this.hover = null; this.tip.style.display = 'none'; });
    }

    /* ---------- settings panel ---------- */
    buildPanel() {
      const wrap = el('div', 'position:absolute;top:14px;right:14px;z-index:8;width:288px;background:rgba(26,26,26,.96);border:1px solid #3a3a3a;font-family:Archivo,sans-serif;color:#d9d7d5;box-shadow:0 12px 34px rgba(0,0,0,.55)');
      const head = el('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid #3a3a3a;cursor:pointer');
      head.append(el('span', 'font:700 11px/1 Archivo,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#f3f2f2', 'Graph Settings'));
      const caret = el('span', 'font:700 12px/1 Archivo,sans-serif;color:#8a8683', '+');
      head.appendChild(caret);
      const body = el('div', 'display:none;padding:4px 12px 12px;max-height:440px;overflow-y:auto;overflow-x:hidden');
      head.addEventListener('click', () => {
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        caret.textContent = open ? '+' : '−';
      });
      wrap.append(head, body);
      this.appendChild(wrap);

      const section = (name) => {
        const s = el('div', 'padding:10px 0 4px;border-top:1px solid #333;margin-top:6px');
        s.appendChild(el('div', LBL + ';margin-bottom:6px', name));
        body.appendChild(s); return s;
      };
      const commit = () => this.savePrefs();
      const range = (parent, label, key, min, max, stepv, fmt) => {
        const row = el('div', ROW);
        const val = el('span', 'font:600 11px/1 Archivo,sans-serif;color:#8a8683;min-width:46px;text-align:right', fmt(this.s[key]));
        const input = document.createElement('input');
        input.type = 'range'; input.min = min; input.max = max; input.step = stepv; input.value = this.s[key];
        input.setAttribute('style', RNG);
        input.addEventListener('input', () => { this.s[key] = parseFloat(input.value); val.textContent = fmt(this.s[key]); commit(); });
        const right = el('div', 'display:flex;align-items:center;gap:8px');
        right.append(input, val);
        row.append(el('span', TXT, label), right); parent.appendChild(row);
      };
      const check = (parent, label, get, set) => {
        const row = el('label', ROW + ';cursor:pointer');
        const input = document.createElement('input');
        input.type = 'checkbox'; input.checked = get();
        input.setAttribute('style', 'accent-color:#ec3013;width:15px;height:15px');
        input.addEventListener('change', () => { set(input.checked); commit(); });
        row.append(el('span', TXT, label), input);
        parent.appendChild(row);
      };
      const radio = (parent, name, opts, get, set) => {
        opts.forEach(([v, l]) => {
          const row = el('label', ROW + ';cursor:pointer');
          const input = document.createElement('input');
          input.type = 'radio'; input.name = name + this._uid(); input.checked = get() === v;
          input.setAttribute('style', 'accent-color:#ec3013;width:15px;height:15px');
          input.addEventListener('change', () => { if (input.checked) { set(v); this.syncLegend(); commit(); } });
          row.append(el('span', TXT, l), input);
          parent.appendChild(row);
        });
      };

      const f = section('필터 · Filters');
      CATS.forEach(([id, label]) => check(f, label, () => this.s.cats[id], v => { this.s.cats[id] = v; }));
      range(f, '기간', 'days', 1, 40, 1, v => v >= 40 ? '전체' : v + '일');
      check(f, '오늘 핵심만', () => this.s.coreOnly, v => { this.s.coreOnly = v; });

      const L = section('연결 · Links');
      radio(L, 'lm', [['both', '유사도 + 카테고리'], ['similarity', '유사도만'], ['category', '카테고리만']], () => this.s.linkMode, v => { this.s.linkMode = v; });
      range(L, '유사도 임계값', 'simThreshold', 0.1, 0.7, 0.05, v => v.toFixed(2));
      range(L, '노드당 최대 연결', 'maxDeg', 1, 6, 1, v => v + '');

      const g = section('색상 기준 · Groups');
      radio(g, 'group', [['level', '핵심 수준별'], ['category', '카테고리별'], ['age', '기간별']], () => this.s.group, v => { this.s.group = v; });

      const d = section('표시 · Display');
      range(d, '제목 표시 배율', 'textZoom', 0.4, 3, 0.1, v => '×' + v.toFixed(1));
      range(d, '노드 크기', 'nodeSize', 0.5, 2, 0.1, v => '×' + v.toFixed(1));

      const p = section('힘 · Forces');
      range(p, '중력', 'gravity', 0, 3, 0.1, v => v.toFixed(1));
      range(p, '반발력', 'repel', 0.2, 3, 0.1, v => v.toFixed(1));
      range(p, '링크 거리', 'linkDist', 50, 240, 5, v => v + '');

      const reset = el('button', 'margin-top:12px;width:100%;background:#ec3013;color:#f3f2f2;border:none;padding:11px 14px;font:700 11px/1 Archivo,sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;text-align:left', '뷰 초기화');
      reset.addEventListener('click', () => { this.nodes.forEach(n => { n.vx = (Math.random() - .5) * 4; n.vy = (Math.random() - .5) * 4; }); this._fitUntil = performance.now() + 2200; });
      body.appendChild(reset);
    }
    _uid() { return this._u || (this._u = Math.random().toString(36).slice(2, 7)); }

    buildLegend() {
      this.legend = el('div', 'position:absolute;left:14px;bottom:14px;z-index:7;display:flex;flex-direction:column;gap:6px;font-family:Archivo,sans-serif;background:rgba(26,26,26,.9);border:1px solid #333;padding:10px 12px');
      this.appendChild(this.legend);
      this.syncLegend();
    }
    syncLegend() {
      const sets = {
        level: [[PAL.level.hub, '카테고리'], [PAL.level.core, '오늘 핵심'], [PAL.level.past, '과거 이슈']],
        category: [[PAL.category.politics, '정치'], [PAL.category.economy, '경제'], [PAL.category.other, '기타']],
        age: [[PAL.age[0], '오늘'], [PAL.age[1], '1주 이내'], [PAL.age[2], '2주 이내'], [PAL.age[3], '3주 이내'], [PAL.age[4], '그 이전']]
      };
      this.legend.innerHTML = '';
      (sets[this.s.group] || sets.level).forEach(([c, l]) => {
        const row = el('div', 'display:flex;align-items:center;gap:9px');
        row.append(el('span', 'width:10px;height:10px;background:' + c), el('span', 'font:600 11px/1 Archivo,sans-serif;letter-spacing:.1em;color:#b9b6b4', l));
        this.legend.appendChild(row);
      });
    }
  }

  if (!customElements.get('issue-graph')) customElements.define('issue-graph', IssueGraph);
})();
