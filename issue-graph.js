(() => {
  const CATS = [['politics', '정치'], ['economy', '경제'], ['other', '기타']];
  const BG = '#131313';
  const PAL = {
    level: { hub: '#f3f2f2', core: '#ec3013', past: '#6b6866' },
    category: { politics: '#ec3013', economy: '#e6e3e1', other: '#7e7a78' },
    age: ['#ec3013', '#c25a45', '#8f8a87', '#6b6866', '#4d4a48']
  };
  /* 색을 담는 칸의 이름과 라벨. 팔레트 편집기와 범례가 같은 목록을 본다. */
  const PAL_SLOTS = {
    level: [['hub', '카테고리'], ['core', '오늘 핵심'], ['past', '과거 이슈']],
    category: [['politics', '정치'], ['economy', '경제'], ['other', '기타']],
    age: [['0', '오늘'], ['1', '1주 이내'], ['2', '2주 이내'], ['3', '3주 이내'], ['4', '그 이전']]
  };
  const DEFAULTS = {
    cats: { politics: true, economy: true, other: true },
    pal: {},           /* '그룹.칸' → 색. 비어 있으면 PAL의 기본값을 쓴다 */
    days: 40, coreOnly: false, group: 'level', linkMode: 'both',
    simThreshold: 0.25, maxDeg: 3,
    textZoom: 1.1, nodeSize: 1, gravity: 1, repel: 1, linkDist: 110
  };
  const KEY = 'issuegraph.settings.v2';
  const RAIL_W = 208;        /* 세로 레일 폭 */
  const CARD_W_NARROW = 232; /* 가로 레일 카드 폭 — 한 화면에 1.5장쯤 걸쳐 보여야 더 있다는 게 보인다 */

  let dataP = null;
  const loadData = () => dataP || (dataP = fetch('data/issues.json').then(r => r.json()));

  const el = (tag, style, text) => { const n = document.createElement(tag); if (style) n.setAttribute('style', style); if (text != null) n.textContent = text; return n; };
  const LBL = 'font:600 9.5px/1 Archivo,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#8a8683';
  const ROW = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0';
  const TXT = 'font:500 11.5px/1.2 Archivo,sans-serif;white-space:nowrap;color:#c9c6c4';

  /* 슬라이더·체크박스·색 견본은 인라인 style로는 못 꾸민다 — ::-webkit-slider-thumb
     같은 가상 요소가 필요하기 때문이다. 그래서 규칙 한 벌을 문서에 한 번만 심는다.
     클래스 이름에 ig- 를 붙여 페이지의 다른 요소와 섞이지 않게 했다. */
  const STYLE_ID = 'ig-controls-style';
  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.ig-rng{-webkit-appearance:none;appearance:none;width:96px;height:12px;background:transparent;cursor:pointer}',
      '.ig-rng::-webkit-slider-runnable-track{height:1px;background:#3d3a38}',
      '.ig-rng::-webkit-slider-thumb{-webkit-appearance:none;width:9px;height:9px;margin-top:-4px;border:none;border-radius:50%;background:#c9c6c4}',
      '.ig-rng:hover::-webkit-slider-thumb{background:#f3f2f2}',
      '.ig-rng::-moz-range-track{height:1px;background:#3d3a38}',
      '.ig-rng::-moz-range-thumb{width:9px;height:9px;border:none;border-radius:50%;background:#c9c6c4}',
      '.ig-box{accent-color:#8a8683;width:13px;height:13px;cursor:pointer}',
      '.ig-col{-webkit-appearance:none;appearance:none;width:34px;height:15px;padding:0;border:1px solid #3d3a38;background:none;cursor:pointer}',
      '.ig-col::-webkit-color-swatch-wrapper{padding:0}',
      '.ig-col::-webkit-color-swatch{border:none}',
      '.ig-col::-moz-color-swatch{border:none}'
    ].join('');
    document.head.appendChild(s);
  };

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
      injectStyles();
      this.s = Object.assign({}, DEFAULTS, this.readPrefs());
      this.s.cats = Object.assign({}, DEFAULTS.cats, this.s.cats);
      this.s.pal = Object.assign({}, this.s.pal);
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

      this.buildControls();
      this.buildPanel();
      this.buildLegend();
      this.buildRails();
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
      /* 조작 버튼은 좁은 화면에서만 뜨므로 폭이 바뀔 때마다 다시 판단해야 한다 */
      if (this.grab) this.syncControls();
      if (this.rails) {
        const flipped = this._wasNarrow !== undefined && this._wasNarrow !== this.narrow;
        this._wasNarrow = this.narrow;
        this.syncRailFrames();
        if (flipped) {
          /* 세로↔가로 레일이 바뀌면 카드를 다시 앉히고, 노드 뭉치도 새 축으로 다시 편다 */
          this._cardSig = null;
          if (this.raw) { this.rebuild(); return; }
        }
      } else {
        this._wasNarrow = this.narrow;
      }
      this._fitUntil = performance.now() + 1200;
    }

    /* ---------- data ---------- */
    rebuild() {
      const code = (this.getAttribute('country') || 'KR').replace(/[{}\s]/g, '');
      const c = this.raw.COUNTRIES[code];
      const anchor = c ? c.latestDate : '2026.08.09';
      const ts = d => Date.parse(String(d).replace(/\./g, '-'));
      const age = d => Math.max(0, Math.round((ts(anchor) - ts(d)) / 86400000));

      /* 씨앗 배치가 최종 모양을 정한다 — 물리는 대칭이라 처음 벌려둔 축으로 퍼진다.
         카테고리 허브 셋을 가로로 늘어놓으면 노드 뭉치가 가로로 길어지는데,
         세로로 긴 폰 화면에서는 그 가로폭이 배율을 0.3(하한)까지 끌어내린다.
         배율은 가로·세로 중 작은 쪽으로 정해지므로 세로 여유는 통째로 버려진다.
         그래서 좁은 화면에서는 허브를 세로로 쌓아 뭉치를 세로로 길게 만든다. */
      const tall = this.narrow;
      const nodes = [], catLinks = [], arts = [];
      CATS.forEach(([id, label], k) => {
        const spread = (k - 1) * 240;
        const hub = {
          key: 'hub-' + id, kind: 'hub', category: id, title: label, date: anchor, answer: '', age: 0, topics: [],
          x: tall ? 0 : spread, y: tall ? spread : 0, vx: 0, vy: 0
        };
        nodes.push(hub);
        const list = c ? c.issues.filter(n => n.category === id) : [];
        list.forEach((n, j) => {
          const a = age(n.date);
          const along = (j - list.length / 2) * 70;   /* 허브를 따라 늘어서는 방향 */
          const out = 90 + (j % 3) * 55;              /* 허브에서 밀려나는 방향 */
          const o = {
            key: n.id, kind: a === 0 ? 'core' : 'past', category: id, title: n.title, date: n.date,
            answer: n.summary, age: a, topics: n.topics || [],
            x: tall ? out : hub.x + along, y: tall ? hub.y + along : out, vx: 0, vy: 0
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

    /* 사용자가 고른 색이 있으면 그것을, 없으면 기본 팔레트를 쓴다 */
    palOf(group, slot) {
      const over = this.s.pal && this.s.pal[group + '.' + slot];
      return over || PAL[group][slot];
    }
    color(n) {
      const s = this.s;
      if (s.group === 'category') return n.kind === 'hub' ? this.palOf('level', 'hub') : this.palOf('category', n.category);
      if (s.group === 'age') return n.kind === 'hub' ? this.palOf('level', 'hub') : this.palOf('age', Math.min(PAL.age.length - 1, Math.floor(n.age / 7)));
      return this.palOf('level', n.kind);
    }
    /* 기본 반지름은 DEFAULTS.nodeSize가 아니라 여기서 올린다.
       nodeSize를 올리면 이미 localStorage에 1을 저장해 둔 사용자에게는
       그 값이 이겨서 아무 변화가 없다. 기준 자체를 키워야 전원에게 적용된다. */
    radius(n) { return (n.kind === 'hub' ? 21 : n.kind === 'core' ? 13.5 : 9) * this.s.nodeSize; }

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
      /* 레일이 실제로 먹는 만큼만 비운다 — 레일이 비어 있으면 그 자리는 캔버스 몫이다 */
      const p = this.railPads();
      const padL = p.l, padR = p.r, padT = p.t, padB = p.b;
      const bw = Math.max(80, this.w - padL - padR), bh = Math.max(80, this.h - padT - padB);
      /* 좁은 화면에서는 '전부 우겨넣기'를 포기한다. 다 넣으려 들면 배율이 계속
         떨어져 노드가 점이 되고, 이슈가 쌓일수록 나빠지기만 한다.
         모든 노드에 닿는 것은 레일이 보장하므로(카드를 누르면 그 노드로 이동),
         캔버스는 읽을 수 있는 크기를 지키고 넘치는 만큼은 화면 밖에 둔다. */
      const floor = this.narrow ? 0.58 : 0.3;
      const s = Math.max(floor, Math.min(1.6, Math.min(bw / (x1 - x0), bh / (y1 - y0))));
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
      if (this._focus) this.stepFocus();
      else if (this._fitUntil && performance.now() < this._fitUntil) this.fitStep();

      const c = this.ctx;
      const pin = this.pinned && this.visible(this.pinned) ? this.pinned : null;
      const hv = this.hover || pin;
      const nb = hv ? this.neighbors(hv) : null;
      this._dimHv = hv; this._dimNb = nb;
      c.clearRect(0, 0, this.w, this.h);
      c.fillStyle = BG; c.fillRect(0, 0, this.w, this.h);
      this.drawGrid(c);

      this.syncCards();
      this.dimCards();

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

      /* 제목은 문턱을 넘는 순간 한꺼번에 나타나던 것을 서서히 올라오게 바꿨다.
         설정값(textZoom)은 '완전히 보이는 배율'이고, 그 아래 band 구간에서
         투명도가 0에서 1로 오른다. 배율이 계속 변하는 중에도 눈이 안 놀란다. */
      const tz = this.s.textZoom;
      const band = Math.max(0.1, tz * 0.35);
      const fade = Math.max(0, Math.min(1, (this.scale - (tz - band)) / band));
      c.textAlign = 'center'; c.textBaseline = 'top';
      act.forEach(n => {
        const big = n.kind === 'hub';
        /* 허브와 지금 짚고 있는 노드는 배율과 무관하게 항상 또렷하게 */
        const a = (big || hv === n) ? 1 : fade;
        if (a < 0.02) return;
        if (this.cardMap.has(n.key)) return;
        const [x, y] = this.toScreen(n);
        const r = this.radius(n) * this.scale;
        c.globalAlpha = a * (hv ? (nb.has(n.key) ? 1 : 0.16) : 1);
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
    /* 카드는 '레일'에 산다. 넓은 화면은 좌우 세로 레일, 좁은 화면은 하단 가로 레일.
       레일은 진짜 스크롤 컨테이너라서 카드가 몇 장이든 담긴다.

       예전에는 매 프레임 JS가 카드 위치를 직접 계산했고(balance→pack→placeCards),
       거터에 안 들어가는 만큼은 cardBudget()이 잘라내 조용히 사라졌다.
       이제 배치는 브라우저가 하고 JS는 점선만 그린다 — 카드가 늘어도 프레임당
       비용이 늘지 않고, 잘려나가는 카드도 없다. */
    /* NB: `pin(n)` below is the setter-ish action, so this reader needs its own name */
    get narrow() { return this.w <= 720; }
    get activePin() { return this.pinned && this.visible(this.pinned) ? this.pinned : null; }

    /* 기본은 '오늘 이슈'만. 노드를 찍으면 그때만 그 노드와 연결된 것들이 함께 뜬다.
       상한은 없다 — 레일이 스크롤되므로 이슈가 쌓여도 전부 담긴다. */
    cardTargets() {
      const out = new Map();
      const pin = this.activePin;
      if (pin) {
        if (pin.kind !== 'hub') out.set(pin.key, { node: pin, mode: 'full' });
        const nb = this.neighbors(pin);
        /* 가까운 연결부터 — 레일에서 위(왼쪽)에 오는 것이 관계가 가까운 쪽이 되게 */
        this.nodes
          .filter(n => n.kind !== 'hub' && n !== pin && nb.has(n.key) && this.visible(n))
          .sort((a, b) => ((a.x - pin.x) ** 2 + (a.y - pin.y) ** 2) - ((b.x - pin.x) ** 2 + (b.y - pin.y) ** 2))
          .forEach(n => out.set(n.key, { node: n, mode: 'mini' }));
        return out;
      }
      this.nodes.filter(n => n.kind === 'core' && this.visible(n))
        .forEach(n => out.set(n.key, { node: n, mode: 'mini' }));
      return out;
    }

    buildCard(n, mode) {
      const full = mode === 'full';
      /* 레일 안에서는 폭을 레일이 정한다. flex 아이템이 줄어들지 않게 shrink만 막는다. */
      const kind = n.kind === 'core' ? '오늘 핵심' : '과거 이슈';
      const box = el('div', 'flex:0 0 auto;width:100%;background:' + (full ? '#1f1f1f' : 'rgba(31,31,31,.95)') +
        ';border:1px solid ' + (full ? '#ec3013' : '#3a3a3a') + ';padding:' + (full ? '13px 15px 14px' : '10px 11px 11px') +
        ';font-family:Archivo,sans-serif;color:#e6e3e1;box-shadow:0 10px 26px rgba(0,0,0,.55)' +
        ';scroll-snap-align:start;transition:opacity .16s,border-color .16s;pointer-events:auto' + (full ? '' : ';cursor:pointer'));
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
        const jump = el('button', 'flex:1;background:#ec3013;color:#f3f2f2;border:none;padding:9px 11px;font:700 10px/1 Archivo,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;text-align:left', '더 자세히 보기');
        jump.addEventListener('click', () => this.dispatchEvent(new CustomEvent('issuejump', { bubbles: true, detail: { key: n.key, category: n.category } })));
        const close = el('button', 'background:none;color:#8a8683;border:1px solid #3f3f3f;padding:9px 11px;font:700 10px/1 Archivo,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer', '닫기');
        close.addEventListener('click', () => this.pin(null));
        acts.append(jump, close);
        box.append(chips, acts);
      }
      /* a standing card stands in for its node: clicking or hovering it has to
         read as clicking or hovering the dot it points at */
      if (!full) {
        box.addEventListener('click', () => {
          const same = this.pinned === n;
          this.pin(same ? null : n);
          /* 좁은 화면에서는 노드가 화면 밖에 있을 수 있다. 레일에서 고른 카드의
             노드를 화면 한가운데로 데려와야 '이 카드가 저 점'이라는 게 보인다. */
          if (!same) this.focusNode(n);
        });
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

    /* 레일 셋. 넓은 화면은 좌·우 세로 레일, 좁은 화면은 하단 가로 레일 하나.
       touch-action으로 축을 못박아 둔다 — 세로 레일은 세로만, 가로 레일은 가로만
       가져가고 나머지 축은 페이지에 넘긴다. 그래야 관계도가 페이지 스크롤을
       가로채지 않는다. */
    buildRails() {
      const base = 'position:absolute;z-index:10;display:flex;gap:6px;pointer-events:auto;' +
        'scrollbar-width:thin;scrollbar-color:#3a3a3a transparent';
      this.rails = {
        L: el('div', base + ';flex-direction:column;left:10px;width:' + RAIL_W + 'px;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;scroll-snap-type:y proximity'),
        R: el('div', base + ';flex-direction:column;right:10px;width:' + RAIL_W + 'px;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;scroll-snap-type:y proximity'),
        B: el('div', base + ';flex-direction:row;left:0;right:0;bottom:0;padding:8px 10px;overflow-x:auto;overflow-y:hidden;touch-action:pan-x;scroll-snap-type:x proximity;background:linear-gradient(to top,rgba(19,19,19,.96),rgba(19,19,19,.72))')
      };
      Object.values(this.rails).forEach(r => this.appendChild(r));
      this.syncRailFrames();
    }

    /* 레일이 차지할 자리. 좁은 화면에서는 하단 레일만, 넓은 화면에서는 좌우만 쓴다. */
    syncRailFrames() {
      const nar = this.narrow;
      const top = this.controls ? this.controls.offsetTop + this.controls.offsetHeight + 10 : 60;
      this.rails.L.style.display = nar ? 'none' : 'flex';
      this.rails.R.style.display = nar ? 'none' : 'flex';
      this.rails.B.style.display = nar ? 'flex' : 'none';
      this.rails.L.style.top = '10px';
      this.rails.L.style.bottom = '10px';
      this.rails.R.style.top = top + 'px';   /* 톱니·범례 뭉치 아래에서 시작 */
      this.rails.R.style.bottom = '10px';
      this.rails.B.style.maxHeight = Math.round(Math.min(190, this.h * 0.42)) + 'px';
      this.cardMap.forEach(c => { c.el.style.width = nar ? CARD_W_NARROW + 'px' : '100%'; });
    }

    /* 카드 집합이 바뀔 때만 DOM을 다시 만든다. 매 프레임 하는 일이 아니다. */
    syncCards() {
      const want = this.cardTargets();
      let sig = (this.narrow ? 'n' : 'w') + '|';
      want.forEach((v, k) => { sig += k + ':' + v.mode + '|'; });
      if (sig === this._cardSig) return;
      this._cardSig = sig;

      this.cardMap.forEach((c, k) => {
        if (!want.has(k) || want.get(k).mode !== c.mode) { c.el.remove(); this.cardMap.delete(k); }
      });

      const nar = this.narrow;
      /* 어느 레일에 넣을지는 여기서 한 번만 정한다. 노드는 물리로 계속 움직이므로
         매 프레임 판정하면 카드가 좌우 레일을 오가며 떨린다. */
      const seat = [];
      want.forEach((v, k) => {
        const rail = nar ? 'B' : (v.mode === 'full' || this.toScreen(v.node)[0] >= this.w / 2 ? 'R' : 'L');
        seat.push({ key: k, node: v.node, mode: v.mode, rail });
      });
      /* 세로 레일은 노드 높이순, 가로 레일은 핀 먼저 — 읽는 순서가 화면과 맞게 */
      seat.sort((a, b) => a.mode === b.mode
        ? (nar ? 0 : this.toScreen(a.node)[1] - this.toScreen(b.node)[1])
        : (a.mode === 'full' ? -1 : 1));

      Object.values(this.rails).forEach(r => { while (r.firstChild) r.removeChild(r.firstChild); });
      seat.forEach(s => {
        let c = this.cardMap.get(s.key);
        if (!c) {
          const box = this.buildCard(s.node, s.mode);
          c = { el: box, node: s.node, mode: s.mode };
          this.cardMap.set(s.key, c);
        }
        c.rail = s.rail;
        c.el.style.width = nar ? CARD_W_NARROW + 'px' : '100%';
        this.rails[s.rail].appendChild(c.el);
      });

      /* 레일에 카드가 없으면 자리를 비워 캔버스에 돌려준다 */
      Object.entries(this.rails).forEach(([k, r]) => {
        const used = seat.some(s => s.rail === k);
        r.style.visibility = used ? 'visible' : 'hidden';
      });
    }

    /* 카드 화면 좌표는 offsetTop/Left(레일 안 고정값)와 scrollTop/Left(프레임마다 변함)로
       구한다. getBoundingClientRect를 카드마다 부르면 매 프레임 레이아웃을 강제한다. */
    cardBox(c) {
      const r = this.rails[c.rail];
      if (!r || r.style.display === 'none' || r.style.visibility === 'hidden') return null;
      return {
        x: r.offsetLeft + c.el.offsetLeft - r.scrollLeft,
        y: r.offsetTop + c.el.offsetTop - r.scrollTop,
        w: c.el.offsetWidth, h: c.el.offsetHeight,
        rail: { x: r.offsetLeft, y: r.offsetTop, w: r.offsetWidth, h: r.offsetHeight }
      };
    }

    /* 호버한 무리에 속하지 않는 카드는 흐리게 — 예전 placeCards가 하던 일 중 남은 것 */
    dimCards() {
      this.cardMap.forEach(c => {
        const alpha = (this._dimNb && !this._dimNb.has(c.node.key)) ? 0.22 : 1;
        if (c._alpha !== alpha) { c._alpha = alpha; c.el.style.opacity = alpha; }
      });
    }

    /* 노드를 화면 한가운데(레일에 안 가리는 영역)로 데려온다 */
    focusNode(n) {
      const pad = this.railPads();
      const cx = (pad.l + (this.w - pad.r)) / 2;
      const cy = (pad.t + (this.h - pad.b)) / 2;
      const sc = Math.max(this.scale, this.narrow ? 0.75 : this.scale);
      this._fitUntil = 0;
      this._focus = { x: n.x, y: n.y, cx, cy, scale: sc };
    }
    stepFocus() {
      const f = this._focus;
      if (!f) return;
      this.scale += (f.scale - this.scale) * 0.16;
      const tx = f.cx - this.w / 2 - f.x * this.scale;
      const ty = f.cy - this.h / 2 - f.y * this.scale;
      this.panX += (tx - this.panX) * 0.16;
      this.panY += (ty - this.panY) * 0.16;
      if (Math.abs(tx - this.panX) < 0.6 && Math.abs(ty - this.panY) < 0.6) this._focus = null;
    }

    /* 레일이 먹는 가장자리 폭. fitStep과 focusNode가 같은 값을 봐야 어긋나지 않는다. */
    railPads() {
      const on = r => r && r.style.display !== 'none' && r.style.visibility !== 'hidden';
      return {
        l: on(this.rails && this.rails.L) ? RAIL_W + 24 : 34,
        r: on(this.rails && this.rails.R) ? RAIL_W + 24 : (this.narrow ? 34 : 90),
        t: this.narrow ? 34 : 24,
        b: on(this.rails && this.rails.B) ? this.rails.B.offsetHeight + 18 : 34
      };
    }

    /* 카드와 노드를 잇는 점선. 레일 밖으로 스크롤돼 나간 카드에는 긋지 않는다 —
       스크롤해서 다시 들어오면 그 프레임부터 선이 살아난다. */
    drawLeaders(c) {
      if (!this.cardMap.size) return;
      c.setLineDash([2, 4]);
      c.lineWidth = 1;
      this.cardMap.forEach(k => {
        const b = this.cardBox(k);
        if (!b) return;
        /* 레일이 잘라낸 구간에 걸친 카드는 건너뛴다. 절반 이상 보일 때만 긋는다. */
        const vis = Math.min(b.y + b.h, b.rail.y + b.rail.h) - Math.max(b.y, b.rail.y);
        const visX = Math.min(b.x + b.w, b.rail.x + b.rail.w) - Math.max(b.x, b.rail.x);
        if (vis < b.h * 0.5 || visX < b.w * 0.5) return;
        const [x, y] = this.toScreen(k.node);
        c.globalAlpha = k._alpha == null ? 1 : k._alpha;
        c.strokeStyle = k.mode === 'full' ? '#ec3013' : '#5f5c5a';
        c.beginPath();
        if (k.rail === 'B') {
          /* 하단 레일: 카드 윗변 가운데에서 노드로 곧장 */
          const ex = b.x + b.w / 2;
          c.moveTo(x, y); c.lineTo(ex, b.y - 2);
        } else {
          const right = b.x > x;
          const ex = right ? b.x : b.x + b.w;
          const ey = Math.max(b.y + 10, Math.min(b.y + b.h - 10, y));
          c.moveTo(x, y); c.lineTo(ex + (right ? -18 : 18), y); c.lineTo(ex, ey);
        }
        c.stroke();
      });
      c.setLineDash([]);
      c.globalAlpha = 1;
    }

    pin(n) {
      this.pinned = n;
      this.tip.style.display = 'none';
      /* the card under the cursor is about to be rebuilt, so its pointerleave
         will never fire — drop the hover here or the dimming outlives the pin */
      this.hover = null;
      this._cardSig = null;
      this._fitUntil = performance.now() + 1400;
    }

    /* 오른쪽 위 컨트롤 뭉치 — 톱니 버튼 하나와 그 아래 범례.
       예전엔 왼쪽 위 ON/OFF 버튼 + 안내 문구, 오른쪽 위 288px 설정 패널,
       왼쪽 아래 범례로 네 귀퉁이에 흩어져 있었다. 좁은 화면에서는 그 넷이
       캔버스를 거의 다 덮었다. 하나로 모으고 설정은 눌렀을 때만 띄운다. */
    buildControls() {
      this.controls = el('div', 'position:absolute;right:12px;top:12px;z-index:8;display:flex;flex-direction:column;align-items:flex-end;gap:8px');
      this.gear = el('button', 'width:38px;height:38px;border-radius:50%;background:rgba(26,26,26,.96);border:1px solid #3a3a3a;color:#b9b6b4;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex:0 0 auto');
      this.gear.setAttribute('aria-label', '그래프 설정');
      this.gear.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>' +
        '<path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.62l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.67 8.86a.5.5 0 0 0 .12.62l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.62l1.92 3.32c.12.22.38.3.6.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.48 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.62l-2.03-1.58z"/></svg>';
      this.gear.addEventListener('click', e => { e.stopPropagation(); this.setPanel(!this._panelOpen); });
      this.controls.appendChild(this.gear);

      /* 조작 토글 — 터치에서만 뜻이 있다.
         캔버스에 touch-action:none 을 걸면 손가락 제스처를 관계도가 가져가
         핀치 줌과 패닝이 되지만, 그만큼 페이지 세로 스크롤을 막는다.
         600px 높이 블록이 스크롤을 삼키면 관계도를 지나 아래로 못 내려가므로,
         기본은 꺼둔 채(페이지 우선) 사용자가 필요할 때만 켜게 한다. */
      this.grab = el('button', 'width:38px;height:38px;border-radius:50%;background:rgba(26,26,26,.96);border:1px solid #3a3a3a;color:#b9b6b4;cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;flex:0 0 auto');
      this.grab.setAttribute('aria-label', '관계도 직접 조작 (확대·이동)');
      this.grab.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>';
      this.grab.addEventListener('click', e => { e.stopPropagation(); this.setGrab(!this._grabOn); });
      this.controls.appendChild(this.grab);
      this.appendChild(this.controls);
    }
    /* 켜짐 표시는 붉은 점 색이 아니라 밝기로 낸다 — 붉은색은 데이터(오늘 핵심) 몫이다.
       조작 토글만 배경을 채운다. 페이지 스크롤을 가져가는 모드라 켜진 게 분명해야 한다. */
    syncControls() {
      const on = !!this._panelOpen;
      this.gear.style.borderColor = on ? '#6f6c6a' : '#3a3a3a';
      this.gear.style.color = on ? '#f3f2f2' : '#b9b6b4';
      if (!this.grab) return;
      /* 마우스에는 휠 줌과 드래그가 이미 있으므로 좁은 화면에서만 내놓는다 */
      this.grab.style.display = this.narrow ? 'flex' : 'none';
      const g = !!this._grabOn;
      this.grab.style.borderColor = g ? '#d9d7d5' : '#3a3a3a';
      this.grab.style.color = g ? '#1a1a1a' : '#b9b6b4';
      this.grab.style.background = g ? '#d9d7d5' : 'rgba(26,26,26,.96)';
      this.canvas.style.touchAction = g ? 'none' : 'auto';
    }

    setGrab(on) {
      this._grabOn = !!on;
      if (!this._grabOn) this._pointers && this._pointers.clear();
      this.syncControls();
    }
    setPanel(open) {
      this._panelOpen = !!open;
      this.panelEl.style.display = this._panelOpen ? 'flex' : 'none';
      this.syncControls();
    }

    /* ---------- interaction ---------- */
    /* slop은 노드 테두리 바깥으로 얼마나 빗나가도 잡아줄지다.
       손가락은 마우스보다 접점이 넓고 커서 끝이 안 보이므로 더 넉넉히 준다.
       matchMedia('(pointer:coarse)')는 기기의 주 입력만 보므로,
       터치스크린 노트북에서 마우스를 쓸 때 틀린다. 이벤트별 pointerType이 정확하다. */
    pick(sx, sy, slop) {
      const pad = slop == null ? 6 : slop;
      const act = this.nodes.filter(n => this.visible(n));
      for (let i = act.length - 1; i >= 0; i--) {
        const n = act[i], [x, y] = this.toScreen(n);
        if (Math.hypot(sx - x, sy - y) <= this.radius(n) * this.scale + pad) return n;
      }
      return null;
    }
    slopFor(e) { return e.pointerType === 'touch' ? 16 : 6; }

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

      /* 두 손가락 핀치 — 조작이 켜졌을 때만. 두 점의 거리로 배율을,
         두 점 가운데의 이동으로 위치를 잡는다. 커서 아래 좌표를 고정한 채
         배율만 바꾸는 것은 휠 줌과 같은 계산이다. */
      this._pointers = new Map();
      const pinchState = () => {
        const p = [...this._pointers.values()];
        if (p.length < 2) return null;
        const dx = p[1].x - p[0].x, dy = p[1].y - p[0].y;
        return { d: Math.hypot(dx, dy) || 1, cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2 };
      };

      cv.addEventListener('pointerdown', e => {
        const [mx, my] = local(e);
        if (this._panelOpen) this.setPanel(false);   /* 캔버스를 건드리면 설정 창은 닫는다 */
        this._pointers.set(e.pointerId, { x: mx, y: my });
        if (this._pointers.size === 2) {
          const s = pinchState();
          this.drag = null; this.panning = null;
          this._pinch = { d: s.d, scale: this.scale, world: this.toWorld(s.cx, s.cy), cx: s.cx, cy: s.cy };
          this._focus = null;
          return;
        }
        const n = this.pick(mx, my, this.slopFor(e));
        this._fitUntil = 0;
        this._focus = null;
        cv.setPointerCapture(e.pointerId);
        this._moved = 0;
        if (n) this.drag = { node: n };
        else this.panning = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY };
        cv.style.cursor = 'grabbing';
      });
      cv.addEventListener('pointermove', e => {
        const [mx, my] = local(e);
        if (this._pointers.has(e.pointerId)) this._pointers.set(e.pointerId, { x: mx, y: my });
        if (this._pinch) {
          const s = pinchState();
          if (!s) return;
          const next = Math.max(0.25, Math.min(4, this._pinch.scale * (s.d / this._pinch.d)));
          this.scale = next;
          this.panX = s.cx - this.w / 2 - this._pinch.world[0] * next;
          this.panY = s.cy - this.h / 2 - this._pinch.world[1] * next;
          this._moved = 99;
          return;
        }
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
        const n = this.pick(mx, my, this.slopFor(e));
        this.hover = n;
        cv.style.cursor = n ? 'pointer' : 'grab';
        if (n && !this.cardMap.has(n.key)) this.showTip(n, mx, my); else this.tip.style.display = 'none';
      });
      const release = e => {
        if (e) this._pointers.delete(e.pointerId);
        /* 손가락 하나가 떨어지면 핀치는 끝난다. 남은 손가락으로 패닝을 이어받지
           않는다 — 이어받으면 뗀 순간 화면이 튄다. */
        if (this._pinch && this._pointers.size < 2) { this._pinch = null; this.drag = null; this.panning = null; return true; }
        return false;
      };
      cv.addEventListener('pointerup', e => {
        if (release(e)) { cv.style.cursor = 'grab'; return; }
        if (this.drag && this._moved < 3) {
          const n = this.drag.node;
          if (n.kind === 'hub') this.dispatchEvent(new CustomEvent('issuecategory', { bubbles: true, detail: n.category }));
          else this.pin(this.pinned === n ? null : n);
        }
        if (this.panning && this._moved < 3 && this.pinned) this.pin(null);
        this.drag = null; this.panning = null; cv.style.cursor = 'grab';
      });
      cv.addEventListener('pointercancel', e => { release(e); this.drag = null; this.panning = null; });
      cv.addEventListener('pointerleave', () => { this.hover = null; this.tip.style.display = 'none'; });
    }

    /* ---------- settings panel ---------- */
    /* 설정은 톱니를 눌렀을 때만 뜨는 떠 있는 창이다. z-index가 카드층(9)보다
       높아 카드 위를 덮고 지나가되, 카드 배치 계산에는 끼어들지 않는다.
       좁은 화면에서는 288px가 캔버스보다 넓으므로 폭을 화면에 맞춘다. */
    buildPanel() {
      const wrap = el('div', 'position:absolute;top:58px;right:12px;z-index:20;display:none;flex-direction:column;width:min(288px,calc(100% - 24px));max-height:calc(100% - 70px);background:rgba(26,26,26,.98);border:1px solid #3a3a3a;font-family:Archivo,sans-serif;color:#d9d7d5;box-shadow:0 12px 34px rgba(0,0,0,.55)');
      wrap.addEventListener('pointerdown', e => e.stopPropagation());
      const head = el('div', 'flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid #3a3a3a');
      head.append(el('span', 'font:700 11px/1 Archivo,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#f3f2f2', 'Graph Settings'));
      const close = el('button', 'background:none;border:none;color:#8a8683;font:700 14px/1 Archivo,sans-serif;cursor:pointer;padding:2px 4px', '✕');
      close.setAttribute('aria-label', '설정 닫기');
      close.addEventListener('click', () => this.setPanel(false));
      head.appendChild(close);
      /* 창 높이는 wrap의 max-height가 잡는다. 여기서 min-height:0을 빼면
         본문이 내용 높이만큼 버텨서 스크롤이 안 걸리고 창이 캔버스를 뚫는다. */
      const body = el('div', 'flex:1 1 auto;min-height:0;padding:4px 12px 12px;overflow-y:auto;overflow-x:hidden');
      wrap.append(head, body);
      this.panelEl = wrap;
      this.appendChild(wrap);

      /* 섹션은 접힌 채로 시작한다. 다섯 줄짜리 목차만 보이다가 필요한 것만 편다. */
      const section = (name) => {
        const wrapS = el('div', 'border-top:1px solid #2c2c2c');
        const head = el('button', 'width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;' +
          'background:none;border:none;cursor:pointer;padding:11px 0 10px;text-align:left');
        head.append(el('span', LBL, name));
        const caret = el('span', 'font:400 11px/1 Archivo,sans-serif;color:#6f6c6a', '+');
        head.appendChild(caret);
        const inner = el('div', 'display:none;padding-bottom:8px');
        head.addEventListener('click', () => {
          const open = inner.style.display !== 'none';
          inner.style.display = open ? 'none' : 'block';
          caret.textContent = open ? '+' : '−';
        });
        wrapS.append(head, inner);
        body.appendChild(wrapS);
        return inner;
      };
      const commit = () => this.savePrefs();
      const range = (parent, label, key, min, max, stepv, fmt) => {
        const row = el('div', ROW);
        const val = el('span', 'font:500 10px/1 Archivo,sans-serif;color:#7d7a78;min-width:42px;text-align:right', fmt(this.s[key]));
        const input = document.createElement('input');
        input.type = 'range'; input.min = min; input.max = max; input.step = stepv; input.value = this.s[key];
        input.className = 'ig-rng';
        input.addEventListener('input', () => { this.s[key] = parseFloat(input.value); val.textContent = fmt(this.s[key]); commit(); });
        const right = el('div', 'display:flex;align-items:center;gap:9px');
        right.append(input, val);
        row.append(el('span', TXT, label), right); parent.appendChild(row);
      };
      const check = (parent, label, get, set) => {
        const row = el('label', ROW + ';cursor:pointer');
        const input = document.createElement('input');
        input.type = 'checkbox'; input.checked = get();
        input.className = 'ig-box';
        input.addEventListener('change', () => { set(input.checked); commit(); });
        row.append(el('span', TXT, label), input);
        parent.appendChild(row);
      };
      const radio = (parent, name, opts, get, set) => {
        opts.forEach(([v, l]) => {
          const row = el('label', ROW + ';cursor:pointer');
          const input = document.createElement('input');
          input.type = 'radio'; input.name = name + this._uid(); input.checked = get() === v;
          input.className = 'ig-box';
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
      /* 'level'은 원래 '핵심 수준별'이었지만, 여기서 말하는 핵심은 '오늘 것'이라는
         뜻이라 기간과 같은 축이었다. 이름만 '중요도'로 바꿔 자리를 잡아둔다 —
         실제 중요도 값은 온톨로지가 붙은 뒤에야 계산할 수 있다(ROADMAP.md). */
      radio(g, 'group', [['level', '중요도'], ['category', '카테고리'], ['age', '기간']],
        () => this.s.group, v => { this.s.group = v; this.syncSwatches(); });
      /* 고른 기준의 색을 그 자리에서 바꾼다. 범례와 캔버스가 같은 palOf()를 보므로
         값만 바꾸면 둘 다 즉시 따라온다. */
      this.swatches = el('div', 'margin-top:9px;padding-top:9px;border-top:1px solid #2c2c2c');
      g.appendChild(this.swatches);
      const revert = el('button', 'margin-top:8px;width:100%;background:none;color:#7d7a78;border:1px solid #333;padding:8px 10px;font:600 9.5px/1 Archivo,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;text-align:left', '색 되돌리기');
      revert.addEventListener('click', () => {
        Object.keys(this.s.pal || {}).forEach(k => { if (k.indexOf(this.s.group + '.') === 0) delete this.s.pal[k]; });
        this.syncSwatches(); this.syncLegend(); this.savePrefs();
      });
      g.appendChild(revert);
      this.syncSwatches();

      const d = section('표시 · Display');
      range(d, '제목 표시 배율', 'textZoom', 0.4, 3, 0.1, v => '×' + v.toFixed(1));
      range(d, '노드 크기', 'nodeSize', 0.5, 2, 0.1, v => '×' + v.toFixed(1));

      const p = section('힘 · Forces');
      range(p, '중력', 'gravity', 0, 3, 0.1, v => v.toFixed(1));
      range(p, '반발력', 'repel', 0.2, 3, 0.1, v => v.toFixed(1));
      range(p, '링크 거리', 'linkDist', 50, 240, 5, v => v + '');

      const reset = el('button', 'margin-top:14px;width:100%;background:none;color:#9a9694;border:1px solid #3a3a3a;padding:10px 12px;font:600 10px/1 Archivo,sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;text-align:left', '뷰 초기화');
      reset.addEventListener('click', () => { this.nodes.forEach(n => { n.vx = (Math.random() - .5) * 4; n.vy = (Math.random() - .5) * 4; }); this._fitUntil = performance.now() + 2200; });
      body.appendChild(reset);
    }

    /* 현재 색상 기준에 속한 칸들을 색 견본으로 늘어놓는다 */
    syncSwatches() {
      if (!this.swatches) return;
      this.swatches.innerHTML = '';
      const group = this.s.group;
      (PAL_SLOTS[group] || []).forEach(([slot, label]) => {
        const row = el('label', ROW + ';cursor:pointer;padding:5px 0');
        const input = document.createElement('input');
        input.type = 'color';
        input.value = this.palOf(group, slot);
        input.className = 'ig-col';
        input.addEventListener('input', () => {
          if (!this.s.pal) this.s.pal = {};
          this.s.pal[group + '.' + slot] = input.value;
          this.syncLegend(); this.savePrefs();
        });
        row.append(el('span', TXT, label), input);
        this.swatches.appendChild(row);
      });
    }
    _uid() { return this._u || (this._u = Math.random().toString(36).slice(2, 7)); }

    /* 범례는 '이게 범례이고 색이 각각 뭔지'만 알리면 끝인 물건이라 최소로 만든다.
       왼쪽 아래 큰 상자였던 것을 톱니 아래로 옮겨 컨트롤을 한 덩어리로 모았다. */
    buildLegend() {
      this.legend = el('div', 'display:flex;flex-direction:column;gap:4px;font-family:Archivo,sans-serif;padding:2px 1px');
      this.controls.appendChild(this.legend);
      this.syncLegend();
    }
    /* 색은 palOf()에서 가져온다 — 설정에서 바꾼 색이 곧바로 여기 반영된다.
       'LEGEND' 라벨과 상자 배경은 뺐다. 점과 글자만 남으면 무엇인지 충분히 읽힌다. */
    syncLegend() {
      const group = PAL_SLOTS[this.s.group] ? this.s.group : 'level';
      this.legend.innerHTML = '';
      PAL_SLOTS[group].forEach(([slot, label]) => {
        const row = el('div', 'display:flex;align-items:center;gap:6px');
        row.append(
          el('span', 'width:7px;height:7px;flex:0 0 auto;background:' + this.palOf(group, slot)),
          el('span', 'font:600 9px/1.1 Archivo,sans-serif;letter-spacing:.06em;color:#a5a2a0;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,.9)', label)
        );
        this.legend.appendChild(row);
      });
    }
  }

  if (!customElements.get('issue-graph')) customElements.define('issue-graph', IssueGraph);
})();
