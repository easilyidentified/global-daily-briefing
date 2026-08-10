(() => {
  const CATS = [['politics', '정치'], ['economy', '경제'], ['other', '기타']];
  const BG = '#131313';
  const PAL = {
    level: { hub: '#f3f2f2', core: '#ec3013', past: '#6b6866' },
    category: { politics: '#ec3013', economy: '#e6e3e1', other: '#7e7a78' },
    age: ['#ec3013', '#c25a45', '#8f8a87', '#6b6866', '#4d4a48']
  };
  const DEFAULTS = {
    cats: { politics: true, economy: true, other: true },
    days: 40, coreOnly: false, group: 'level', linkMode: 'both', summaries: true,
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
      this.pinned = null; this.cardMap = new Map();

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

      /* summary cards ride above the canvas, anchored to node positions each frame */
      /* overflow:hidden is the backstop — a card must never spill onto the page below the graph */
      this.cardLayer = el('div', 'position:absolute;inset:0;z-index:9;pointer-events:none;overflow:hidden');
      this.appendChild(this.cardLayer);

      this.buildToolbar();
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
      if (this._tbBtns) this.syncToolbar();   /* hint wording follows the breakpoint */
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
      const wide = !this.narrow;
      const room = this.cardsOn;
      /* narrow keeps its full width — the card docks at the bottom, so only
         the bottom edge has to be cleared for it */
      const padL = room && wide ? 240 : 40;
      const padR = room && wide ? 260 : (wide ? 300 : 40);
      const padT = room && wide ? 60 : 40;
      const padB = room && !wide ? (this._dockH || 210) + 26 : (room ? 60 : 90);
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

      const c = this.ctx;
      const pin = this.pinned && this.visible(this.pinned) ? this.pinned : null;
      const hv = this.hover || pin;
      const nb = hv ? this.neighbors(hv) : null;
      this._dimHv = hv; this._dimNb = nb;
      c.clearRect(0, 0, this.w, this.h);
      c.fillStyle = BG; c.fillRect(0, 0, this.w, this.h);
      this.drawGrid(c);

      this.syncCards();

      this._live.forEach(l => {
        const [ax, ay] = this.toScreen(l.a), [bx, by] = this.toScreen(l.b);
        const hot = hv && (l.a === hv || l.b === hv);
        c.globalAlpha = hv ? (hot ? 1 : 0.14) : 1;
        c.strokeStyle = hot ? '#ec3013' : (l.cat ? '#2e2e2e' : '#454545');
        c.lineWidth = Math.max(0.6, (l.cat ? 1 : 0.8 + l.sim * 2.6) * this.scale);
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      });

      const act = this.nodes.filter(n => this.visible(n));
      this.drawLeaders(c);
      act.forEach(n => {
        const [x, y] = this.toScreen(n);
        const r = this.radius(n) * this.scale;
        c.globalAlpha = hv ? (nb.has(n.key) ? 1 : 0.18) : 1;
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
        c.fillStyle = this.color(n); c.fill();
        if (hv === n || this.pinned === n) { c.lineWidth = 2; c.strokeStyle = n.kind === 'core' ? '#f3f2f2' : '#ec3013'; c.stroke(); }
      });

      const show = this.scale >= this.s.textZoom;
      c.textAlign = 'center'; c.textBaseline = 'top';
      act.forEach(n => {
        if (n.kind !== 'hub' && !show && hv !== n) return;
        if (this.cardMap.has(n.key)) return;
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

    /* ---------- summary cards ---------- */
    /* A narrow screen has no gutter to spare: a side card would leave the node
       cloud about 80px to live in. So below the breakpoint no card stands on its
       own — one appears, docked along the bottom, only while a node is pinned. */
    /* NB: `pin(n)` below is the setter-ish action, so this reader needs its own name */
    get narrow() { return this.w <= 720; }
    get activePin() { return this.pinned && this.visible(this.pinned) ? this.pinned : null; }
    get cardsOn() { return !!this.s.summaries && (!this.narrow || !!this.activePin); }

    /* how many cards the gutters hold before the stack outgrows the graph */
    cardBudget() {
      if (this.narrow) return 1;
      return Math.max(2, Math.floor((this.h - 80) / 140) * 2);
    }

    /* which nodes deserve a standing card: today's core issues by default,
       or the pinned node plus everything it links to */
    cardTargets() {
      const out = new Map();
      if (!this.cardsOn) return out;
      const pin = this.activePin;
      const cap = this.cardBudget();
      if (pin) {
        if (pin.kind !== 'hub') out.set(pin.key, { node: pin, mode: 'full' });
        const nb = this.neighbors(pin);
        /* nearest links first, so what gets cut is what sits furthest out */
        this.nodes
          .filter(n => n.kind !== 'hub' && n !== pin && nb.has(n.key) && this.visible(n))
          .sort((a, b) => ((a.x - pin.x) ** 2 + (a.y - pin.y) ** 2) - ((b.x - pin.x) ** 2 + (b.y - pin.y) ** 2))
          .slice(0, Math.max(0, cap - out.size))
          .forEach(n => out.set(n.key, { node: n, mode: 'mini' }));
        return out;
      }
      this.nodes.filter(n => n.kind === 'core' && this.visible(n))
        .slice(0, cap)
        .forEach(n => out.set(n.key, { node: n, mode: 'mini' }));
      return out;
    }

    buildCard(n, mode) {
      const full = mode === 'full';
      const wide = this.w > 720;
      /* docked cards span the graph instead of squeezing into a gutter */
      const W = full ? (wide ? 300 : Math.max(180, this.w - 20)) : (wide ? 200 : 168);
      const kind = n.kind === 'core' ? '오늘 핵심' : '과거 이슈';
      const box = el('div', 'position:absolute;left:0;top:0;width:' + W + 'px;background:' + (full ? '#1f1f1f' : 'rgba(31,31,31,.95)') +
        ';border:1px solid ' + (full ? '#ec3013' : '#3a3a3a') + ';padding:' + (full ? '13px 15px 14px' : '10px 11px 11px') +
        ';font-family:Archivo,sans-serif;color:#e6e3e1;box-shadow:0 10px 26px rgba(0,0,0,.55)' +
        ';transition:opacity .16s,border-color .16s;pointer-events:auto' + (full ? '' : ';cursor:pointer'));
      const head = el('div', 'display:flex;align-items:baseline;gap:8px;font:700 9px/1 Archivo,sans-serif;letter-spacing:.18em;text-transform:uppercase');
      head.append(el('span', 'color:#ec3013', kind), el('span', 'color:#8a8683', n.date));
      box.append(head, el('div', 'margin-top:7px;font:700 ' + (full ? '15px/1.32' : '12.5px/1.35') + ' Archivo,sans-serif;letter-spacing:-.01em;text-wrap:pretty', n.title));
      const ans = el('div', 'margin-top:' + (full ? '10px' : '7px') + ';padding-top:' + (full ? '10px' : '7px') + ';border-top:1px solid #3a3a3a');
      ans.append(
        el('div', 'font:700 8.5px/1 Archivo,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#ec3013;margin-bottom:5px', 'Answer First'),
        el('div', 'font:400 ' + (full ? '12px/1.55' : '11px/1.5') + ' Archivo,sans-serif;color:#b9b6b4;text-wrap:pretty' +
          (full ? '' : ';display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden'), n.answer)
      );
      box.appendChild(ans);
      if (full) {
        const chips = el('div', 'margin-top:11px;display:flex;flex-wrap:wrap;gap:5px');
        (n.topics || []).forEach(k => chips.appendChild(el('span', 'font:600 10px/1 Archivo,sans-serif;letter-spacing:.06em;color:#d9d7d5;border:1px solid #3f3f3f;padding:4px 7px', k)));
        const acts = el('div', 'margin-top:12px;display:flex;gap:8px');
        const jump = el('button', 'flex:1;background:#ec3013;color:#f3f2f2;border:none;padding:9px 11px;font:700 10px/1 Archivo,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;text-align:left', '요약으로 이동');
        jump.addEventListener('click', () => this.dispatchEvent(new CustomEvent('issuejump', { bubbles: true, detail: { key: n.key, category: n.category } })));
        const close = el('button', 'background:none;color:#8a8683;border:1px solid #3f3f3f;padding:9px 11px;font:700 10px/1 Archivo,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer', '닫기');
        close.addEventListener('click', () => this.pin(null));
        acts.append(jump, close);
        box.append(chips, acts);
      }
      /* a standing card stands in for its node: clicking or hovering it has to
         read as clicking or hovering the dot it points at */
      if (!full) {
        box.addEventListener('click', () => this.pin(this.pinned === n ? null : n));
        box.addEventListener('pointerenter', () => {
          this.hover = n;
          box.style.borderColor = '#ec3013';
        });
        box.addEventListener('pointerleave', () => {
          if (this.hover === n) this.hover = null;
          box.style.borderColor = '#3a3a3a';
        });
      }
      return box;
    }

    syncCards() {
      const want = this.cardTargets();
      /* docked width tracks the graph, so the width belongs in the rebuild key */
      let sig = (this.narrow ? 'n' + Math.round(this.w) : 'w') + '|';
      want.forEach((v, k) => { sig += k + ':' + v.mode + '|'; });
      if (sig !== this._cardSig) {
        this._cardSig = sig;
        this.cardMap.forEach((c, k) => { if (!want.has(k) || want.get(k).mode !== c.mode) { c.el.remove(); this.cardMap.delete(k); } });
        want.forEach((v, k) => {
          if (this.cardMap.has(k)) return;
          const node = this.buildCard(v.node, v.mode);
          this.cardLayer.appendChild(node);
          this.cardMap.set(k, { el: node, node: v.node, mode: v.mode, w: node.offsetWidth, h: node.offsetHeight });
        });
      }
      if (!this.cardMap.size) { this._dockH = 0; return; }

      /* narrow: the one pinned card docks along the bottom edge, full width.
         fitStep keeps the node cloud above it, so nothing is covered. */
      if (this.narrow) {
        let tall = 0;
        this.cardMap.forEach(c => {
          c.w = c.el.offsetWidth || c.w; c.h = c.el.offsetHeight || c.h;
          c.tx = 10;
          c.ty = Math.max(10, this.h - c.h - 10);
          c.side = 'B';
          tall = Math.max(tall, c.h);
        });
        this._dockH = tall;
        this.placeCards();
        return;
      }
      this._dockH = 0;

      /* cards live in left and right gutters — never over the node cloud.
         each card stacks near its node's height, then a leader line ties the two. */
      const bottomOf = e => (e && e.style.display !== 'none' && e.offsetWidth) ? e.offsetTop + e.offsetHeight : 0;
      const topOf = e => (e && e.style.display !== 'none' && e.offsetWidth) ? e.offsetTop : this.h;
      const bounds = {
        L: [Math.max(10, Math.max(bottomOf(this.toolbar), bottomOf(this.hint)) + 12), Math.min(this.h - 10, topOf(this.legend) - 12)],
        R: [Math.max(10, bottomOf(this.panelEl) + 12), this.h - 10]
      };
      const L = [], R = [];
      const wideCols = this.w > 720;
      this.cardMap.forEach(c => {
        const [x, y] = this.toScreen(c.node);
        c.nx = x; c.ny = y;
        (wideCols && x < this.w / 2 ? L : R).push(c);
      });
      const GAP = 6;
      const sum = list => list.reduce((t, c) => t + c.h, 0) + Math.max(0, list.length - 1) * GAP;
      /* spill the most central card to the emptier side when one column can't hold its stack */
      const balance = (from, to, fb, tb) => {
        let guard = 0;
        while (from.length > 1 && sum(from) > (fb[1] - fb[0]) && sum(to) + 8 < (tb[1] - tb[0]) && guard++ < 8) {
          from.sort((a, b) => Math.abs(a.nx - this.w / 2) - Math.abs(b.nx - this.w / 2));
          to.push(from.shift());
        }
      };
      balance(L, R, bounds.L, bounds.R);
      if (wideCols) balance(R, L, bounds.R, bounds.L);

      const pack = (list, side) => {
        const [top, bot] = bounds[side];
        list.sort((a, b) => a.ny - b.ny);
        let cur = top;
        list.forEach(c => {
          c.tx = side === 'L' ? 10 : this.w - c.w - 10;
          c.ty = Math.max(cur, c.ny - c.h / 2);   /* unclamped — the cursor must win */
          cur = c.ty + c.h + GAP;
          c.side = side;
        });
        /* only now pull the stack up off the bottom edge, keeping the gaps */
        if (cur - GAP > bot) {
          let back = bot;
          for (let i = list.length - 1; i >= 0; i--) { const c = list[i]; c.ty = Math.min(c.ty, back - c.h); back = c.ty - GAP; }
          if (list.length && list[0].ty < top) { const d = top - list[0].ty; list.forEach(c => { c.ty += d; }); }
        }
      };
      pack(L, 'L'); pack(R, 'R');
      this.placeCards();
    }

    /* ease every card from where it is to the slot just computed for it */
    placeCards() {
      this.cardMap.forEach(c => {
        const jump = c.px == null || c._side !== c.side;
        c._side = c.side;
        c.px = jump ? c.tx : c.px + (c.tx - c.px) * 0.35;
        c.py = jump ? c.ty : c.py + (c.ty - c.py) * 0.35;
        c.el.style.transform = 'translate(' + Math.round(c.px) + 'px,' + Math.round(c.py) + 'px)';
        /* hovering a node fades every card that isn't part of its cluster */
        const dim = this._dimNb && !this._dimNb.has(c.node.key);
        c.alpha = dim ? 0.16 : 1;
        if (c._alpha !== c.alpha) { c._alpha = c.alpha; c.el.style.opacity = c.alpha; }
      });
    }

    drawLeaders(c) {
      if (!this.cardMap.size) return;
      this.cardMap.forEach(k => {
        if (k.px == null) return;
        if (k.side === 'B') return;   /* docked card spans the width — a leader would just cut across it */
        const [x, y] = this.toScreen(k.node);
        const right = k.px > x;
        const ex = right ? k.px : k.px + k.w;
        const ey = Math.max(k.py + 10, Math.min(k.py + k.h - 10, y));
        const bend = ex + (right ? -18 : 18);
        c.globalAlpha = k.alpha == null ? 1 : k.alpha;
        c.setLineDash([2, 4]);
        c.strokeStyle = k.mode === 'full' ? '#ec3013' : '#5f5c5a';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x, y); c.lineTo(bend, y); c.lineTo(ex, ey);
        c.stroke();
        c.setLineDash([]);
      });
      c.globalAlpha = 1;
    }

    pin(n) {
      this.pinned = n;
      this.tip.style.display = 'none';
      /* the card under the cursor is about to be rebuilt, so its pointerleave
         will never fire — drop the hover here or the dimming outlives the pin */
      this.hover = null;
      this._cardSig = null;
      this.syncToolbar();          /* also brings the hint back when unpinning */
      this._fitUntil = performance.now() + 1400;
    }

    setSummaries(on) {
      this.s.summaries = on;
      if (!on) this.pinned = null;
      this._cardSig = null;
      this.cardMap.forEach(c => c.el.remove());
      this.cardMap.clear();
      this.syncToolbar();
      this._fitUntil = performance.now() + 1400;
      this.savePrefs();
    }

    buildToolbar() {
      this.toolbar = el('div', 'position:absolute;left:14px;top:14px;z-index:8;display:flex;background:rgba(26,26,26,.96);border:1px solid #3a3a3a');
      this._tbBtns = [['on', '관계 요약'], ['off', '그래프만']].map(([v, label]) => {
        const b = el('button', 'background:none;color:#8a8683;border:none;padding:10px 13px;font:700 10px/1 Archivo,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;text-align:left', label);
        b.addEventListener('click', () => this.setSummaries(v === 'on'));
        this.toolbar.appendChild(b);
        return [v, b];
      });
      this.appendChild(this.toolbar);
      this.hint = el('div', 'position:absolute;left:14px;top:52px;z-index:8;font:600 10px/1.4 Archivo,sans-serif;letter-spacing:.08em;color:#8a8683;max-width:220px', '노드를 클릭하면 연결된 이슈의 핵심이 함께 펼쳐집니다');
      this.appendChild(this.hint);
      this.syncToolbar();
    }
    syncToolbar() {
      const on = this.s.summaries;
      this._tbBtns.forEach(([v, b]) => {
        const act = (v === 'on') === on;
        b.style.background = act ? '#ec3013' : 'none';
        b.style.color = act ? '#f3f2f2' : '#8a8683';
      });
      /* narrow shows nothing until a node is tapped, so say so */
      this.hint.textContent = this.narrow
        ? '노드를 탭하면 그 이슈의 핵심이 아래에 펼쳐집니다'
        : '노드를 클릭하면 연결된 이슈의 핵심이 함께 펼쳐집니다';
      this.hint.style.display = (on && !this.pinned) ? 'block' : 'none';
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
        if (n && !this.cardMap.has(n.key)) this.showTip(n, mx, my); else this.tip.style.display = 'none';
      });
      cv.addEventListener('pointerup', () => {
        if (this.drag && this._moved < 3) {
          const n = this.drag.node;
          if (n.kind === 'hub') this.dispatchEvent(new CustomEvent('issuecategory', { bubbles: true, detail: n.category }));
          else if (this.s.summaries) this.pin(this.pinned === n ? null : n);
          else this.dispatchEvent(new CustomEvent('issuejump', { bubbles: true, detail: { key: n.key, category: n.category } }));
        }
        if (this.panning && this._moved < 3 && this.pinned) this.pin(null);
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
      this.panelEl = wrap;
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
      check(d, '핵심 요약 카드', () => this.s.summaries, v => this.setSummaries(v));
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
