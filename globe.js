import * as THREE from 'three';

const DEG = Math.PI / 180;
const R = 1;

const COORDS = {
  KR: [37.55, 126.98], US: [38.9, -77.03], CN: [39.9, 116.4], JP: [35.68, 139.69],
  GB: [51.5, -0.13], DE: [52.52, 13.4], FR: [48.86, 2.35], IL: [31.78, 35.22],
  UA: [50.45, 30.52], IN: [28.61, 77.21], BR: [-15.79, -47.88], AU: [-35.28, 149.13]
};

const LINKS = [
  ['US', 'KR'], ['US', 'JP'], ['US', 'GB'], ['US', 'BR'], ['GB', 'DE'], ['DE', 'FR'],
  ['DE', 'UA'], ['FR', 'IL'], ['CN', 'KR'], ['CN', 'JP'], ['CN', 'IN'], ['IN', 'IL'],
  ['AU', 'JP'], ['AU', 'IN'], ['BR', 'FR'], ['UA', 'IL'], ['KR', 'JP'], ['US', 'CN']
];

function toVec(lat, lng, r) {
  const phi = (90 - lat) * DEG, theta = (lng + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function arcPoints(a, b, lift) {
  const va = toVec(a[0], a[1], R), vb = toVec(b[0], b[1], R);
  const d = va.distanceTo(vb);
  const mid = va.clone().add(vb).multiplyScalar(0.5).normalize().multiplyScalar(R + d * lift);
  return new THREE.QuadraticBezierCurve3(va.clone().multiplyScalar(1.005), mid, vb.clone().multiplyScalar(1.005)).getPoints(64);
}

function discTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d').createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner); g.addColorStop(0.4, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
  const ctx = c.getContext('2d'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const clean = v => (typeof v === 'string' && v.indexOf('{{') === -1 && v.trim()) ? v.trim() : null;

class GlobeStage extends HTMLElement {
  connectedCallback() {
    if (this._init) { cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(this.animate); if (this.ro) this.ro.observe(this); return; }
    this._init = true;
    this.style.display = 'block';
    if (getComputedStyle(this).position === 'static') this.style.position = 'relative';
    this.style.overflow = 'hidden';

    this.labelLayer = document.createElement('div');
    Object.assign(this.labelLayer.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    this.appendChild(this.labelLayer);

    this.flashLayer = document.createElement('div');
    Object.assign(this.flashLayer.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    this.appendChild(this.flashLayer);

    this.countries = [];
    this.selected = clean(this.getAttribute('selected')) || 'KR';
    this.accent = clean(this.getAttribute('accent')) || '#ec3013';
    this.region = clean(this.getAttribute('region')) || 'All';
    this.spin = 0.00028;
    this.rot = { x: -0.15, y: -2.2 };
    this.target = null;

    this.build();
    this.loadLand();
    this.loadCountries();
    this.bindPointer();
    this.ro = new ResizeObserver(() => requestAnimationFrame(() => this.resize()));
    this.ro.observe(this);
    this.animate();
  }

  disconnectedCallback() { cancelAnimationFrame(this._raf); this.ro && this.ro.disconnect(); }

  build() {
    const w = this.clientWidth || 800, h = this.clientHeight || 600;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    this.camera.position.set(0, 0.42, 5.25);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    Object.assign(this.renderer.domElement.style, { display: 'block', position: 'absolute', inset: '0', width: '100%', height: '100%' });
    this.insertBefore(this.renderer.domElement, this.labelLayer);

    // stars
    const N = 2600, pos = new Float32Array(N * 3), sz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(24 + Math.random() * 26);
      pos.set([v.x, v.y, v.z], i * 3);
      sz[i] = Math.random() < 0.07 ? 0.75 : 0.2 + Math.random() * 0.3;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { map: { value: discTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.35)') } },
      vertexShader: `attribute float size; varying float v; void main(){ v=size; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*340.0/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying float v; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vec3(1.0),t.a*min(1.0,0.5+v)); }`
    }));
    this.scene.add(this.stars);

    // sun
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: discTexture('rgba(255,255,255,1)', 'rgba(255,196,150,0.55)'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    sun.position.set(-9, 4.5, -14); sun.scale.setScalar(7);
    this.scene.add(sun);
    const flare = sun.clone(); flare.scale.setScalar(18);
    flare.material = sun.material.clone(); flare.material.opacity = 0.28;
    this.scene.add(flare);

    // moon
    const moonTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = '#6f7076'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 90; i++) {
        const r = 2 + Math.random() * 12;
        x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, r, 0, 7);
        x.fillStyle = Math.random() > .5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.10)'; x.fill();
      }
      return new THREE.CanvasTexture(c);
    })();
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(0.17, 48, 48), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 1, metalness: 0 }));
    this.moon.position.set(2.95, -1.25, -2.3);
    this.scene.add(this.moon);

    this.loadFlashes();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xfff0e0, 2.2);
    key.position.set(-9, 4.5, -6);
    this.scene.add(key);

    // globe group
    this.globe = new THREE.Group();
    this.globe.rotation.set(this.rot.x, this.rot.y, 0);
    this.scene.add(this.globe);

    this.globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.995, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x0c0e11 })
    ));

    // atmosphere rim
    const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.14, 64, 64), new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 n; varying vec3 p; void main(){ n=normalize(normalMatrix*normal); p=normalize((modelViewMatrix*vec4(position,1.0)).xyz); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 n; varying vec3 p; void main(){ float i=pow(1.0-abs(dot(n,p)),3.2); gl_FragColor=vec4(0.42,0.55,0.72,1.0)*i*0.9; }`
    }));
    this.scene.add(rim);
    this.rim = rim;

    // graticule
    const gm = new THREE.LineBasicMaterial({ color: 0x2a2f38, transparent: true, opacity: 0.55 });
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let l = 0; l <= 360; l += 3) pts.push(toVec(lat, l - 180, R * 1.001));
      this.globe.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), gm));
    }
    for (let lng = -180; lng < 180; lng += 30) {
      const pts = [];
      for (let l = -90; l <= 90; l += 3) pts.push(toVec(l, lng, R * 1.001));
      this.globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm));
    }

    this.markerGroup = new THREE.Group();
    this.globe.add(this.markerGroup);
    this.linkGroup = new THREE.Group();
    this.globe.add(this.linkGroup);
  }

  async loadLand() {
    try {
      const [d3, topojson, topo] = await Promise.all([
        import('https://esm.sh/d3-geo@3'),
        import('https://esm.sh/topojson-client@3'),
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json').then(r => r.json())
      ]);
      const land = topojson.feature(topo, topo.objects.land);
      // Rasterise the land polygons once into an equirectangular mask (~50ms),
      // then sample it per dot. Point-in-polygon per dot is orders slower.
      const W = 2048, H = 1024;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const path = d3.geoPath(d3.geoEquirectangular().translate([W / 2, H / 2]).scale(W / (2 * Math.PI)), ctx);
      ctx.fillStyle = '#fff'; ctx.beginPath(); path(land); ctx.fill();
      const px = ctx.getImageData(0, 0, W, H).data;

      const N = 74000, gold = Math.PI * (3 - Math.sqrt(5)), pts = [];
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const lat = Math.asin(y) / DEG;
        let lng = ((gold * i) / DEG) % 360;
        if (lng > 180) lng -= 360;
        const x = Math.min(W - 1, Math.max(0, Math.round((lng + 180) / 360 * W)));
        const yy = Math.min(H - 1, Math.max(0, Math.round((90 - lat) / 180 * H)));
        if (px[(yy * W + x) * 4] > 110) pts.push(toVec(lat, lng, R * 1.004));
      }
      const arr = new Float32Array(pts.length * 3);
      pts.forEach((p, i) => arr.set([p.x, p.y, p.z], i * 3));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.dots = new THREE.Points(g, new THREE.PointsMaterial({
        color: 0xf3f2f2, size: 0.013, sizeAttenuation: true, transparent: true, opacity: 1,
        map: discTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.9)'), alphaTest: 0.35, depthWrite: true
      }));
      this.globe.add(this.dots);
    } catch (e) {
      console.warn('land data unavailable', e);
    }
  }

  async loadCountries() {
    let list;
    try {
      list = (await fetch('data/issues.json').then(r => r.json())).SUPPORTED_COUNTRIES;
    } catch (e) { console.error('globe: country data load failed', e); return; }
    this.countries = list.filter(c => COORDS[c.code]);

    const dotGeo = new THREE.SphereGeometry(0.014, 16, 16);
    this.countries.forEach(c => {
      const [lat, lng] = COORDS[c.code];
      const p = toVec(lat, lng, R * 1.012);
      const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(this.accent || '#ec3013') }));
      m.position.copy(p);
      m.userData.code = c.code;
      this.markerGroup.add(m);

      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: discTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0.25)'),
        color: new THREE.Color(this.accent || '#ec3013'),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9
      }));
      halo.position.copy(p); halo.scale.setScalar(0.085);
      halo.userData.code = c.code;
      this.markerGroup.add(halo);

      const el = document.createElement('button');
      el.type = 'button';
      el.dataset.code = c.code;
      el.dataset.region = c.region;
      el.textContent = c.name;
      Object.assign(el.style, {
        position: 'absolute', pointerEvents: 'auto',
        font: '600 12px/1 Archivo, ui-sans-serif, system-ui, sans-serif', letterSpacing: '.02em',
        color: '#f3f2f2', background: 'rgba(10,11,13,0.55)', border: '1px solid rgba(243,242,242,0.28)',
        borderLeft: '2px solid #ec3013', padding: '5px 9px', cursor: 'pointer', whiteSpace: 'nowrap',
        backdropFilter: 'blur(4px)', transition: 'background .15s, color .15s, border-color .15s'
      });
      el.addEventListener('pointerenter', () => { if (c.code !== this.selected) el.style.background = (this.accent || '#ec3013'); });
      el.addEventListener('pointerleave', () => { if (c.code !== this.selected) el.style.background = 'rgba(10,11,13,0.55)'; });
      el.addEventListener('click', ev => {
        ev.stopPropagation();
        this.dispatchEvent(new CustomEvent('countryselect', { detail: c.code, bubbles: true }));
      });
      this.labelLayer.appendChild(el);
    });

    const lm = new THREE.LineBasicMaterial({ color: 0x9aa4b2, transparent: true, opacity: 0.22 });
    LINKS.forEach(([a, b]) => {
      if (!COORDS[a] || !COORDS[b]) return;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPoints(COORDS[a], COORDS[b], 0.28)), lm.clone());
      line.userData.pair = [a, b];
      this.linkGroup.add(line);
    });

    this.applySelection();
  }

  static get observedAttributes() { return ['selected', 'region', 'accent', 'autorotate', 'showlinks']; }
  attributeChangedCallback(n, o, raw) {
    const v = clean(raw);
    if (n === 'region') { this.region = v || 'All'; return; }
    if (n === 'accent') { if (!v) return; this.accent = v; this.applyAccent(); return; }
    if (n === 'autorotate') { this.spin = v === 'false' ? 0 : 0.00028; return; }
    if (n === 'showlinks') { if (this.linkGroup) this.linkGroup.visible = v !== 'false'; return; }
    if (!this._init) { if (n === 'selected' && v) this.selected = v; return; }
    if (n === 'selected' && v && v !== this.selected) { this.selected = v; this.applySelection(); this.focusOn(v); }
  }

  applyAccent() {
    if (!this.markerGroup) return;
    const c = new THREE.Color(this.accent || '#ec3013');
    this.markerGroup.children.forEach(m => m.material.color.copy(c));
    this.applySelection();
  }

  applySelection() {
    if (!this.linkGroup) return;
    const AC = new THREE.Color(this.accent || '#ec3013');
    const ACS = '#' + AC.getHexString();
    this.linkGroup.children.forEach(l => {
      const on = l.userData.pair.includes(this.selected);
      l.material.color.set(on ? AC : new THREE.Color(0x9aa4b2));
      l.material.opacity = on ? 0.85 : 0.18;
    });
    this.labelLayer.querySelectorAll('button').forEach(el => {
      const on = el.dataset.code === this.selected;
      el.style.background = on ? '#ec3013' : 'rgba(10,11,13,0.55)';
      el.style.borderColor = on ? '#ec3013' : 'rgba(243,242,242,0.28)';
      el.style.borderLeftColor = '#ec3013';
      el.style.color = '#f3f2f2';
      el.style.fontWeight = on ? '700' : '600';
    });
  }

  /* ---- event flashes: everything below is driven by data/flashes.json ---- */
  async loadFlashes() {
    this.flashes = [];
    let list;
    try {
      list = (await fetch('data/flashes.json', { cache: 'no-cache' }).then(r => r.json())).flashes || [];
    } catch (e) { console.error('globe: flash data load failed', e); return; }
    list.forEach(f => this.addFlash(f));
  }

  addFlash(f) {
    const accent = f.color || '#ec3013';
    let anchor, holder;
    if (f.kind === 'country') {
      /* 속보는 12개 마커 국가에 매이지 않는다. latlng를 주면 그 지점에 그대로 꽂힌다.
         (COORDS에만 의존하면 목록 밖 국가의 속보가 조용히 사라진다) */
      const c = f.latlng || COORDS[f.code];
      if (!c) return;
      anchor = new THREE.Object3D();
      anchor.position.copy(toVec(c[0], c[1], R * 1.03));
      holder = this.globe;
    } else {
      anchor = f.ship ? this.makeStarship() : new THREE.Object3D();
      anchor.position.fromArray(f.position || [1.72, 0.42, -0.9]);
      if (f.ship) anchor.lookAt(this.moon.position);
      holder = this.scene;
    }

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: discTexture('rgba(255,255,255,0.95)', accent),
      color: new THREE.Color(accent),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5
    }));
    halo.scale.setScalar(f.kind === 'country' ? 0.14 : 0.32);
    anchor.add(halo);
    holder.add(anchor);

    let core = null;
    if (f.kind === 'country') {
      core = new THREE.Sprite(new THREE.SpriteMaterial({
        map: discTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.6)'),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9
      }));
      core.scale.setScalar(0.05);
      anchor.add(core);
    }

    const label = f.label || '속보';
    const tight = label.length <= 2;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = label;
    Object.assign(chip.style, {
      position: 'absolute', pointerEvents: 'auto', transform: 'translate(-50%,calc(-100% - 9px))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      font: (tight ? '800 14px/1 ' : '700 10px/1 ') + 'Archivo, ui-sans-serif, system-ui, sans-serif',
      letterSpacing: tight ? '0' : '.18em',
      color: '#f3f2f2', background: accent, border: 'none',
      width: tight ? '26px' : 'auto', height: tight ? '26px' : 'auto',
      padding: tight ? '0' : '5px 9px',
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .15s, transform .15s',
      boxShadow: '0 0 0 0 ' + accent
    });

    const tip = document.createElement('span');
    Object.assign(tip.style, {
      position: 'absolute', left: '50%', top: '100%', transform: 'translateX(-50%)',
      width: '0', height: '0', borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent', borderTop: '8px solid ' + accent,
      transition: 'border-color .15s'
    });
    chip.appendChild(tip);    chip.addEventListener('pointerenter', () => { chip.style.background = '#201e1d'; tip.style.borderTopColor = '#201e1d'; });
    chip.addEventListener('pointerleave', () => { chip.style.background = accent; tip.style.borderTopColor = accent; });
    chip.addEventListener('click', ev => {
      ev.stopPropagation();
      if (f.kind === 'country') this.focusOn(f.code, f.latlng);
      this.dispatchEvent(new CustomEvent('newsflash', { detail: f.id, bubbles: true }));
    });
    this.flashLayer.appendChild(chip);

    this.flashes.push({ def: f, anchor, halo, core, chip, base: anchor.position.y, onGlobe: f.kind === 'country' });
  }

  makeStarship() {
    const steel = new THREE.MeshStandardMaterial({ color: 0xdfe4e8, metalness: 0.85, roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x30363c, metalness: 0.5, roughness: 0.6 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.095, 18), steel);
    body.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.05, 18), steel);
    nose.rotation.x = Math.PI / 2; nose.position.z = 0.0725;
    g.add(body, nose);
    const flap = (x, y, z, s) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.024 * s, 0.03 * s), dark);
      m.position.set(x, y, z); g.add(m);
    };
    flap(0, 0.024, -0.032, 1); flap(0, -0.024, -0.032, 1);
    flap(0.021, 0, 0.034, 0.68); flap(-0.021, 0, 0.034, 0.68);
    const burn = new THREE.Sprite(new THREE.SpriteMaterial({
      map: discTexture('rgba(255,255,255,0.95)', 'rgba(255,138,61,0.75)'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9
    }));
    burn.position.z = -0.062; burn.scale.setScalar(0.085);
    g.add(burn);
    g.userData.burn = burn;
    return g;
  }

  stepFlashes() {
    if (!this.flashes || !this.flashes.length) return;
    const t = performance.now() / 1000;
    const k = (Math.sin(t * 2.1) + 1) / 2;
    const r = this.renderer.domElement;
    this.flashes.forEach(fl => {
      fl.halo.material.opacity = 0.26 + k * 0.4;
      fl.halo.scale.setScalar((fl.onGlobe ? 0.12 : 0.29) + k * (fl.onGlobe ? 0.06 : 0.11));
      if (fl.core) fl.core.material.opacity = 0.55 + k * 0.45;
      if (fl.anchor.userData.burn) fl.anchor.userData.burn.material.opacity = 0.6 + Math.sin(t * 7) * 0.24;
      if (!fl.onGlobe) fl.anchor.position.y = fl.base + Math.sin(t * 0.6) * 0.012;
      const w = fl.anchor.getWorldPosition(new THREE.Vector3());
      const v = w.clone().project(this.camera);
      let sx = (v.x * 0.5 + 0.5) * r.clientWidth;
      let sy = (-v.y * 0.5 + 0.5) * r.clientHeight;
      if (fl.onGlobe) {
        const toCam = this.camera.position.clone().sub(w).normalize();
        if (w.clone().normalize().dot(toCam) < 0.06) {
          // behind the earth: ride the silhouette like a game world marker
          const o = new THREE.Vector3(0, 0, 0).project(this.camera);
          const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).multiplyScalar(R).project(this.camera);
          const cx = (o.x * 0.5 + 0.5) * r.clientWidth;
          const cy = (-o.y * 0.5 + 0.5) * r.clientHeight;
          const rad = Math.abs(((right.x * 0.5 + 0.5) * r.clientWidth) - cx);
          const dx = sx - cx, dy = sy - cy;
          const len = Math.hypot(dx, dy) || 1;
          sx = cx + (dx / len) * rad * 1.02;
          sy = cy + (dy / len) * rad * 1.02;
        }
      }
      fl.chip.style.display = 'flex';
      fl.chip.style.left = sx + 'px';
      fl.chip.style.top = sy + 'px';
    });
  }

  focusOn(code, latlng) {
    const c = latlng || COORDS[code];
    if (!c) return;
    let ty = Math.PI / 2 - (c[1] + 180) * DEG;
    const tx = c[0] * DEG * 0.75;
    const cur = this.globe.rotation.y;
    while (ty - cur > Math.PI) ty -= Math.PI * 2;
    while (ty - cur < -Math.PI) ty += Math.PI * 2;
    this.target = { x: tx, y: ty, t: 0 };
  }

  bindPointer() {
    const el = this.renderer.domElement;
    let down = false, px = 0, py = 0;
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', e => { down = true; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; this.target = null; this.dragging = true; });
    el.addEventListener('pointermove', e => {
      if (!down) return;
      this.globe.rotation.y += (e.clientX - px) * 0.005;
      this.globe.rotation.x = Math.max(-0.9, Math.min(0.9, this.globe.rotation.x + (e.clientY - py) * 0.004));
      px = e.clientX; py = e.clientY;
    });
    const up = () => { down = false; el.style.cursor = 'grab'; setTimeout(() => this.dragging = false, 1200); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  resize() {
    const w = this.clientWidth, h = this.clientHeight;
    if (!w || !h) return;
    if (w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  animate = () => {
    this._raf = requestAnimationFrame(this.animate);
    if (this.target) {
      this.target.t = Math.min(1, this.target.t + 0.02);
      const e = 1 - Math.pow(1 - this.target.t, 3);
      this.globe.rotation.y += (this.target.y - this.globe.rotation.y) * e * 0.12;
      this.globe.rotation.x += (this.target.x - this.globe.rotation.x) * e * 0.12;
      if (this.target.t >= 1) { this.target = null; this.dispatchEvent(new CustomEvent('globefocusend', { bubbles: true })); }
    } else if (!this.dragging) {
      this.globe.rotation.y += this.spin;
    }
    if (this.stars) this.stars.rotation.y += 0.00008;
    if (this.moon) this.moon.rotation.y += 0.0006;
    this.stepFlashes();
    this.renderer.render(this.scene, this.camera);
    this.positionLabels();
  };

  positionLabels() {
    if (!this.countries.length) return;
    const w = this.clientWidth, h = this.clientHeight;
    const v = new THREE.Vector3();
    const camDir = this.camera.position.clone().normalize();
    const items = [];

    this.labelLayer.querySelectorAll('button[data-code]').forEach(el => {
      const c = COORDS[el.dataset.code];
      if (!c) return;
      v.copy(toVec(c[0], c[1], R * 1.02)).applyMatrix4(this.globe.matrixWorld);
      const facing = v.clone().normalize().dot(camDir);
      v.project(this.camera);
      const on = el.dataset.code === this.selected;
      const inRegion = !this.region || this.region === 'All' || el.dataset.region === this.region;
      const vis = facing > 0.12 && inRegion;
      el.style.opacity = vis ? (on ? '1' : String(Math.min(1, (facing - 0.12) * 4))) : '0';
      el.style.pointerEvents = vis ? 'auto' : 'none';
      el.style.zIndex = on ? '3' : '2';
      if (!vis) return;
      if (!el._w || !el._h) { el._w = el.offsetWidth; el._h = el.offsetHeight; }
      items.push({ el, on, mx: (v.x * 0.5 + 0.5) * w, my: (-v.y * 0.5 + 0.5) * h, w: el._w, h: el._h });
    });

    // Greedy per-frame layout: selected label wins, then top-to-bottom;
    // each label is nudged clear of every rect already placed this frame.
    items.sort((a, b) => (b.on - a.on) || (a.my - b.my));
    const placed = [], GAP = 4, LEAD = 12;
    for (const it of items) {
      let left = it.mx + LEAD;
      if (left + it.w > w - 8) left = it.mx - LEAD - it.w;
      left = Math.max(4, Math.min(left, w - it.w - 4));
      let top = it.my - it.h / 2;
      for (let pass = 0; pass < 14; pass++) {
        const hit = placed.find(p => left < p.right && left + it.w > p.left && top < p.bottom && top + it.h > p.top);
        if (!hit) break;
        top = hit.bottom + GAP;
      }
      top = Math.max(4, Math.min(top, h - it.h - 4));
      it.el.style.transform = 'none';
      it.el.style.left = left + 'px';
      it.el.style.top = top + 'px';
      placed.push({ left, top, right: left + it.w, bottom: top + it.h });
    }

    const cue = this.cueEl || (this.cueEl = document.querySelector('[data-cue]'));
    if (cue) {
      const r = cue.getBoundingClientRect(), s = this.getBoundingClientRect();
      const cl = r.left - s.left, ct = r.top - s.top, cr = cl + r.width, cb = ct + r.height;
      cue.style.visibility = placed.some(p => p.left < cr && p.right > cl && p.top < cb && p.bottom > ct) ? 'hidden' : 'visible';
    }
  }
}

customElements.define('globe-stage', GlobeStage);
