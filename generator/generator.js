// generator.js: the Girasol Facade generator. This file is the definition, like a Grasshopper definition.
// It holds three things: what the object is, what can change (sliders), what must stay true (rules).
// Units: feet. Y is up. The ground is y = 0. +z is south, +x is east.
// The skin can wrap any of several building forms. Every module reads the sun on its own face:
// where direct sun hits it squarely it opens, where it is in shade it closes. Same rule everywhere.

export const meta = {
  name: 'Girasol Facade Generator',
  description: 'A solar skin for any surface in Miami: every module opens where the sun hits it and closes in shade.',
  units: 'feet',
  printScale: 96, // 1/8" = 1'-0"
  author: 'Francisco Herrero',
  projectPage: '../project.html',
};

const FORMS = ['Flat wall', 'Curved wall', 'Wave wall', 'Sloped wall', 'Round tower', 'Square tower'];

export const parameters = {
  form:   { label: 'Building form',         value: 'Flat wall', options: FORMS, help: 'The surface the skin wraps' },
  module: { label: 'Module shape',          value: 'Triangle', options: ['Triangle', 'Diamond', 'Hexagon'], help: 'One leaf per side, all opening toward the light' },
  facing: { label: 'Facing',                value: 0,   min: -180, max: 180, step: 15, type: 'angle', help: '0 = south, 90 = west, -90 = east' },
  width:  { label: 'Width or diameter',     value: 84,  min: 48, max: 120, step: 4, type: 'length' },
  floors: { label: 'Floors behind the skin', value: 6,  min: 3,  max: 24,  step: 1 },
  side:   { label: 'Module side',           value: 4,   min: 3,  max: 8,   step: 0.5, type: 'length' },
  bay:    { label: 'Bay size (modules)',    value: 4,   min: 2,  max: 8,   step: 1, help: 'Modules between diagrid lines' },
  open:   { label: 'Opening in full sun',   value: 60,  min: 5,  max: 100, step: 1, unit: '%' },
  hour:   { label: 'Time of day',           value: 12,  min: 6,  max: 18,  step: 0.5, unit: 'h' },
  season: { label: 'Season',                value: 'March', options: ['June', 'March', 'December'] },
  follow: { label: 'Open with the sun',     value: true, help: 'Each module opens as much as direct sun hits its own face, and closes in shade' },
  print:  { label: 'Print version',         value: false, help: 'Skin only, with thicker parts. On a flat wall it prints flat.' },
};

// Fixed numbers, from the Girasol site model and SPEC section 5. Shared by generate(), check() and stats().
const FLOOR = 96 / 7;              // floor to floor, ft
const DEPTH = 48;                  // building depth behind a wall, a stand-in
const LAT = 25.8;                  // Miami, degrees north
const DECL = { June: 23.4, March: 0, December: -23.4 }; // sun declination, degrees
const OPEN_MIN = 5;                // % (fully closed still leaves a sliver)
const MAX_ANGLE = 72;              // degrees at 100% open
const INNER = 0.82;                // leaves sit inside the frame
const LEAF = 0.94;                 // leaf size against its space
const EYE_LOW = 3, EYE_HIGH = 7;   // eye level, ft above each floor (used by the view rules)
const SUN_NONE = 0.1, SUN_FULL = 0.5; // sun on a face: below this it stays closed, above this it is fully open
const SLOPE = 20;                  // the sloped wall leans back this many degrees
const RAD = Math.PI / 180;

// Module shapes: a regular polygon with one triangular leaf hinged on each side.
const SHAPES = { Triangle: 3, Diamond: 4, Hexagon: 6 };
const sidesOf = (p) => SHAPES[p.module] || 3;
const circR = (p) => p.side / (2 * Math.sin(Math.PI / sidesOf(p)));          // center to corner
const apothem = (p) => circR(p) * Math.cos(Math.PI / sidesOf(p));            // center to side
const innerAp = (p) => apothem(p) * INNER;

// Where the sun is, as a direction (x east, y up, z south).
function sunAt(hour, season) {
  const d = DECL[season] * RAD, lat = LAT * RAD, h = (hour - 12) * 15 * RAD;
  const y = Math.sin(lat) * Math.sin(d) + Math.cos(lat) * Math.cos(d) * Math.cos(h);
  const x = -Math.cos(d) * Math.sin(h);
  const z = -(Math.cos(lat) * Math.sin(d) - Math.sin(lat) * Math.cos(d) * Math.cos(h));
  return { x, y, z };
}
// The same sun, seen from the building before it is turned to face its direction.
function sunLocal(p, hour) {
  const s = sunAt(hour, p.season), a = p.facing * RAD;
  return { x: s.x * Math.cos(a) + s.z * Math.sin(a), y: s.y, z: -s.x * Math.sin(a) + s.z * Math.cos(a) };
}

const smooth = (k) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
const angleOf = (open) => (MAX_ANGLE * open) / 100;
const isEye = (y) => {
  const above = y - FLOOR * Math.floor(y / FLOOR);
  return above >= EYE_LOW && above <= EYE_HIGH;
};

// The one rule for every module: how open it is, from the sun on its own face (c = 1 is straight on).
function moduleOpen(p, c, eye) {
  const base = p.follow ? OPEN_MIN + (p.open - OPEN_MIN) * smooth((c - SUN_NONE) / (SUN_FULL - SUN_NONE)) : p.open;
  return base;
}

// ---------- the surface ----------
// Each form is a plan curve pushed up (the sloped wall also leans back). The curve is measured by length,
// so modules keep their size on curves.
function planCurve(form, W) {
  switch (form) {
    case 'Curved wall': { const R = W / (100 * RAD); return { f: (t) => [R * Math.sin(t / R), R * Math.cos(t / R) - R], t0: -W / 2, t1: W / 2 }; }
    case 'Wave wall': { const A = W / 24, lam = W / 3; return { f: (t) => [t, A * Math.sin((2 * Math.PI * t) / lam)], t0: -W / 2, t1: W / 2 }; }
    case 'Round tower': { const R = W / 2; return { f: (a) => [R * Math.sin(a), R * Math.cos(a)], t0: 0, t1: 2 * Math.PI, closed: true }; }
    case 'Square tower': {
      const R = W / 2, e = 1 / 3, pw = (v) => Math.sign(v) * Math.pow(Math.abs(v), e);
      return { f: (a) => [R * pw(Math.sin(a)), R * pw(Math.cos(a))], t0: 0, t1: 2 * Math.PI, closed: true };
    }
    default: return { f: (t) => [t, 0], t0: -W / 2, t1: W / 2 };
  }
}

let surfCache = { key: '', value: null };
function surface(p) {
  const key = `${p.form}|${p.width}`;
  if (surfCache.key === key) return surfCache.value;
  const c = planCurve(p.form, p.width), N = c.closed ? 720 : 400;
  const xs = [], zs = [], cum = [0];
  for (let i = 0; i <= N; i++) { const [x, z] = c.f(c.t0 + ((c.t1 - c.t0) * i) / N); xs.push(x); zs.push(z); }
  for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]));
  // Tangents at each sample (central differences), so normals turn smoothly.
  const tx = [], tz = [];
  for (let i = 0; i <= N; i++) {
    let a = i - 1, b = i + 1;
    if (c.closed) { a = (i - 1 + N) % N; b = (i + 1) % N; } else { a = Math.max(0, a); b = Math.min(N, b); }
    const dx = xs[b] - xs[a], dz = zs[b] - zs[a], l = Math.hypot(dx, dz) || 1;
    tx.push(dx / l); tz.push(dz / l);
  }
  const L = cum[N];
  const beta = p.form === 'Sloped wall' ? SLOPE * RAD : 0;
  const cb = Math.cos(beta), sb = Math.sin(beta);
  const lookup = (u) => {
    u = c.closed ? ((u % L) + L) % L : Math.min(L, Math.max(0, u));
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= u) lo = m; else hi = m; }
    const k = (u - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    const ttx = tx[lo] + (tx[hi] - tx[lo]) * k, ttz = tz[lo] + (tz[hi] - tz[lo]) * k, tl = Math.hypot(ttx, ttz) || 1;
    return [xs[lo] + (xs[hi] - xs[lo]) * k, zs[lo] + (zs[hi] - zs[lo]) * k, ttx / tl, ttz / tl];
  };
  // A point on the skin: u along the curve, v up the skin, measured from the top of the ground floor.
  const place = (u, v) => {
    const [x, z, ux, uz] = lookup(u);
    const nx = -uz, nz = ux; // outward, in plan
    return {
      P: [x - v * sb * nx, FLOOR + v * cb, z - v * sb * nz],
      T: [ux, 0, uz],
      B: [-sb * nx, cb, -sb * nz],
      N: [cb * nx, sb, cb * nz],
    };
  };
  const plan = []; // the curve, offset 0.5 ft inside the skin, for slabs
  const steps = c.closed ? 160 : 80;
  for (let i = 0; i <= (c.closed ? steps - 1 : steps); i++) {
    const [x, z, ux, uz] = lookup((L * i) / steps);
    plan.push([x + uz * 0.5, z - ux * 0.5]);
  }
  const value = { L, closed: !!c.closed, beta, cb, sb, place, lookup, plan };
  surfCache = { key, value };
  return value;
}

// ---------- the modules ----------
let layoutCache = { key: '', value: null };
function layout(p) {
  const key = `${p.form}|${p.width}|${p.floors}|${p.side}|${p.module}`;
  if (layoutCache.key === key) return layoutCache.value;
  const S = surface(p), L = S.L, s = p.side, n = sidesOf(p);
  const H = (p.floors * FLOOR) / S.cb; // skin height measured along the skin
  const spots = [];                    // [u, v, turn]
  let pitch, vStep, rows, firstV;
  if (n === 3) { pitch = s; vStep = (s * Math.sqrt(3)) / 2; }
  else if (n === 4) { pitch = s * Math.SQRT2; vStep = pitch / 2; }
  else { pitch = s * Math.sqrt(3); vStep = 1.5 * s; }
  const nU = S.closed ? Math.max(3, Math.round(L / pitch)) : 0;
  const su = S.closed ? L / nU : pitch;
  const ku = su / pitch; // closed forms stretch modules a little so they close the loop
  const fits = (u, half) => S.closed || (u - half >= -1e-6 && u + half <= L + 1e-6);
  if (n === 3) {
    rows = Math.max(1, Math.round(H / vStep));
    for (let r = 0; r < rows; r++) {
      const v = r * vStep, off = (r % 2) * (su / 2);
      const count = S.closed ? nU : Math.ceil(L / su) + 2;
      for (let k = -1; k < count; k++) {
        const x = off + k * su;
        if (S.closed && k < 0) continue;
        if (fits(x + su / 2, su / 2)) spots.push([x + su / 2, v + vStep / 3, 0]);
        if (fits(x + su, su / 2)) spots.push([x + su, v + (2 * vStep) / 3, Math.PI]);
      }
    }
    firstV = 0;
  } else {
    const tall = n === 4 ? pitch : 2 * s;
    rows = Math.max(1, Math.floor((H - tall) / vStep) + 1);
    firstV = tall / 2;
    for (let r = 0; r < rows; r++) {
      const v = firstV + r * vStep, off = (r % 2) * (su / 2);
      const count = S.closed ? nU : Math.ceil(L / su) + 2;
      for (let k = 0; k < count; k++) {
        const u = off + k * su + (S.closed ? 0 : su / 2);
        if (fits(u, su / 2)) spots.push([u, v, 0]);
      }
    }
  }
  const mods = spots.map(([u, v, turn]) => {
    const f = S.place(u, v);
    return { u, v, turn, ...f, eye: isEye(f.P[1]) };
  });
  const skinH = n === 3 ? rows * vStep : (rows - 1) * vStep + (n === 4 ? pitch : 2 * s);
  const value = { mods, rows, ku, H: skinH, top: FLOOR + skinH * S.cb, L, rise: n === 4 ? 1 : Math.sqrt(3), pitch: su };
  layoutCache = { key, value };
  return value;
}

const dot = (a, s) => a[0] * s.x + a[1] * s.y + a[2] * s.z;
const sunOnFace = (m, s) => (s.y > 0 ? Math.max(0, dot(m.N, s)) : 0);
const petalAngles = (p) => {
  const n = sidesOf(p), out = [];
  for (let k = 0; k < n; k++) out.push(Math.PI / 2 + (k + 0.5) * (2 * Math.PI) / n + Math.PI / 2); // start at the top corner
  return out;
};

// A spread-out sample of modules, so the day sums stay quick on big towers.
function sample(mods, max = 500) {
  if (mods.length <= max) return mods;
  const step = mods.length / max, out = [];
  for (let i = 0; i < max; i++) out.push(mods[Math.floor(i * step)]);
  return out;
}

// ---------- rule math ----------
const holeInches = (p, open) => 2 * innerAp(p) * (1 - LEAF * Math.cos(angleOf(open) * RAD)) * 12;
const clearShare = (open) => INNER * INNER * (1 - LEAF * LEAF * Math.cos(angleOf(open) * RAD));
const CELL_SHARE = 0.72 * 0.72, CELL_EFF = 0.2;   // assumptions: cell covers this much of a leaf; 20% efficient
const SQFT_TO_M2 = 0.0929;
// Strength of direct sun on a clear day (W per sq m). A rough formula from the sun's height.
const directSun = (y) => (y <= 0.02 ? 0 : 1000 * Math.pow(0.7, Math.pow(1 / y, 0.678)));
const leafSqFt = (p) => {
  const n = sidesOf(p), edge = 2 * circR(p) * INNER * Math.sin(Math.PI / n);
  return 0.5 * edge * LEAF * innerAp(p) * LEAF;
};

// Sun caught over one clear day in this season, against the same surface closed flat.
let dayCache = { key: '', value: null };
function dayCatch(p) {
  const key = JSON.stringify([p.form, p.module, p.facing, p.width, p.floors, p.side, p.open, p.season, p.follow]);
  if (dayCache.key === key) return dayCache.value;
  const { mods } = layout(p), list = sample(mods), phis = petalAngles(p);
  let skin = 0, flat = 0;
  for (let h = 5; h <= 19; h += 0.25) {
    const s = sunLocal(p, h), d = directSun(s.y);
    if (!d) continue;
    for (const m of list) {
      const ns = dot(m.N, s), ts = dot(m.T, s), bs = dot(m.B, s);
      const c = Math.max(0, ns);
      const th = angleOf(moduleOpen(p, c, m.eye)) * RAD, sn = Math.sin(th), cs = Math.cos(th);
      let got = 0;
      for (const phi0 of phis) {
        const phi = phi0 + m.turn;
        got += Math.max(0, sn * (Math.sin(phi) * ts - Math.cos(phi) * bs) + cs * ns);
      }
      skin += d * 0.25 * (got / phis.length);
      flat += d * 0.25 * c;
    }
  }
  const cellsM2 = leafSqFt(p) * sidesOf(p) * CELL_SHARE * SQFT_TO_M2;
  const value = {
    ratio: flat > 1e-9 ? skin / flat : 1,
    kWh: (skin / list.length / 1000) * cellsM2 * mods.length * CELL_EFF,
    moduleW: cellsM2 * 1000 * CELL_EFF,
  };
  dayCache = { key, value };
  return value;
}
const leafReach = (p) => innerAp(p) * LEAF * Math.sin(angleOf(p.open) * RAD);
// The least open module at eye level right now (the worst view).
function eyeOpening(p) {
  const s = sunLocal(p, p.hour);
  const eyes = sample(layout(p).mods.filter((m) => m.eye), 800);
  if (!eyes.length) return p.follow ? OPEN_MIN : p.open;
  return Math.min(...eyes.map((m) => moduleOpen(p, sunOnFace(m, s), true)));
}

// ---------- the model ----------
export function generate(p, kit) {
  const THREE = kit.THREE;
  const S = surface(p);
  const { mods, ku, H, top, L, rise, pitch } = layout(p);
  const n = sidesOf(p);
  const inner = p.print ? 0.72 : INNER;
  const frameDepth = p.print ? 0.6 : 0.35;
  const leafT = p.print ? 0.36 : 0.06; // print: about 1.1 mm at 1:96
  const skin = [];                      // everything that turns with Facing
  const R = circR(p);

  const poly = (scale) => {
    const c = new THREE.Shape();
    for (let k = 0; k < n; k++) {
      const a = Math.PI / 2 + (k * 2 * Math.PI) / n;
      const x = R * scale * Math.cos(a), y = R * scale * Math.sin(a);
      if (k === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath();
    return c;
  };

  // Frames
  const fShape = poly(1);
  fShape.holes.push(new THREE.Path(poly(inner).getPoints().slice().reverse()));
  const fGeo = new THREE.ExtrudeGeometry(fShape, { depth: frameDepth, bevelEnabled: false });
  fGeo.translate(0, 0, -frameDepth / 2);
  const frames = new THREE.InstancedMesh(fGeo, kit.material('#c9ccd1', { metalness: 0.6, roughness: 0.4 }), mods.length);
  frames.name = 'module_frames';

  // Leaves: the hinge runs along x, the tip points along +y, toward the module center.
  const ap = R * inner * Math.cos(Math.PI / n), edge = 2 * R * inner * Math.sin(Math.PI / n);
  const base = edge * LEAF, tip = ap * LEAF;
  const leafShape = (k) => {
    const cy = tip / 3, c = new THREE.Shape();
    const pt = (x, y) => [x * k, cy + (y - cy) * k];
    c.moveTo(...pt(-base / 2, 0)); c.lineTo(...pt(base / 2, 0)); c.lineTo(...pt(0, tip)); c.closePath();
    return c;
  };
  const lGeo = new THREE.ExtrudeGeometry(leafShape(1), { depth: leafT, bevelEnabled: false });
  lGeo.translate(0, -0.06, -leafT / 2); // the hinge edge bites into the frame so parts touch
  const cGeo = new THREE.ExtrudeGeometry(leafShape(0.72), { depth: 0.03, bevelEnabled: false });
  cGeo.translate(0, 0, leafT / 2 - 0.01);
  const count = mods.length * n;
  const leaves = new THREE.InstancedMesh(lGeo, kit.material('#f2f2f0'), count);
  const cells = new THREE.InstancedMesh(cGeo, kit.material('#0b0c10', { roughness: 0.15, metalness: 0.3 }), count);
  leaves.name = 'module_leaves';
  cells.name = 'solar_cells';

  const sun = sunLocal(p, p.hour);
  const phis = petalAngles(p);
  const M = new THREE.Matrix4(), L4 = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const Tv = new THREE.Vector3(), Bv = new THREE.Vector3(), Nv = new THREE.Vector3();
  const scaleU = new THREE.Matrix4().makeScale(ku, 1, 1);
  const dummy = new THREE.Object3D();
  mods.forEach((m, i) => {
    Tv.fromArray(m.T); Bv.fromArray(m.B); Nv.fromArray(m.N);
    M.makeBasis(Tv, Bv, Nv).setPosition(m.P[0], m.P[1], m.P[2]).multiply(scaleU).multiply(tmp.makeRotationZ(m.turn));
    frames.setMatrixAt(i, M);
    const theta = angleOf(moduleOpen(p, sunOnFace(m, sun), m.eye)) * RAD;
    phis.forEach((phi, k) => {
      dummy.position.set(ap * Math.sin(phi), -ap * Math.cos(phi), 0);
      dummy.rotation.set(theta, 0, phi, 'ZXY');
      dummy.updateMatrix();
      L4.multiplyMatrices(M, dummy.matrix);
      leaves.setMatrixAt(i * n + k, L4);
      cells.setMatrixAt(i * n + k, L4);
    });
  });
  skin.push(frames, leaves);
  if (!p.print) skin.push(cells); // cells are paper thin: left out of the print

  // Diagrid behind the skin, along the module directions, every "bay" modules.
  const flatForm = p.form === 'Flat wall' || p.form === 'Sloped wall';
  const back = (u, v) => { const f = S.place(u, v); return [f.P[0] - f.N[0] * 0.4, f.P[1] - f.N[1] * 0.4, f.P[2] - f.N[2] * 0.4]; };
  let step = p.bay * pitch, nLines = 0;
  if (S.closed) { const k = Math.max(3, Math.round(L / step)); step = L / k; }
  const reach = H / rise;
  for (const dir of [1, -1]) {
    const from = S.closed ? 0 : -Math.ceil(reach / step) * step;
    const to = S.closed ? L - 1e-6 : L + reach + step;
    for (let u0 = from; u0 <= to; u0 += step) {
      // v range where the line stays on the skin
      let v0 = 0, v1 = H;
      if (!S.closed) {
        const a = ((0 - u0) * rise) / dir, b = ((L - u0) * rise) / dir;
        v0 = Math.max(v0, Math.min(a, b)); v1 = Math.min(v1, Math.max(a, b));
      }
      if (v1 - v0 < 0.5) continue;
      const name = `diagrid_${++nLines}`;
      if (flatForm) {
        skin.push(kit.beam({ from: back(u0 + (dir * v0) / rise, v0), to: back(u0 + (dir * v1) / rise, v1), size: 0.5, color: '#9aa0a8', name }));
      } else {
        const k = Math.max(2, Math.ceil((v1 - v0) / 3)), path = [];
        for (let j = 0; j <= k; j++) { const v = v0 + ((v1 - v0) * j) / k; path.push(back(u0 + (dir * v) / rise, v)); }
        skin.push(kit.sweep({ path, profile: { w: 0.5, h: 0.5 }, smooth: false, color: '#9aa0a8', name }));
      }
    }
  }

  const turnTo = (list) => { const g = kit.group(list); g.rotation.y = -p.facing * RAD; return g; };
  // The print version is the skin only. A flat wall prints flat, diagrid down, with no supports.
  if (p.print) return [turnTo(skin)];

  // The building behind the skin.
  const body = [];
  if (p.form === 'Flat wall') {
    const slabZ = -0.5 - DEPTH / 2, x0 = -p.width / 2;
    for (let k = 1; k <= p.floors + 1; k++) body.push(kit.box({ w: p.width, d: DEPTH, h: 0.9, y: k * FLOOR - 0.9, z: slabZ, color: '#e4e2dc', name: `slab_${k}` }));
    const spacing = 24, cols = Math.max(1, Math.round(p.width / spacing));
    for (let k = 0; k <= p.floors; k++) {
      for (const z of [-6, -DEPTH + 5]) {
        for (let c = 0; c < cols; c++) {
          const cx = x0 + ((c + 0.5) * p.width) / cols, yA = k * FLOOR + 0.3, yB = (k + 1) * FLOOR - 0.9;
          body.push(kit.beam({ from: [cx, yA, z], to: [cx - 5, yB, z], size: 0.6, color: '#b9b7b0', name: `v_column_${k}_${c}_a` }));
          body.push(kit.beam({ from: [cx, yA, z], to: [cx + 5, yB, z], size: 0.6, color: '#b9b7b0', name: `v_column_${k}_${c}_b` }));
        }
      }
    }
    body.push(kit.reference(kit.box({ w: p.width, d: DEPTH - 1, h: FLOOR - 0.9, z: slabZ, color: '#cfe4ee', name: 'ground_glass' })));
  } else if (p.form === 'Sloped wall') {
    // Each floor reaches the leaning skin; they all share one back line, so the section steps.
    const t = Math.tan(S.beta), front = (y) => -(y - FLOOR) * t - 0.5;
    const zb = Math.min(front(top) - DEPTH / 2, -DEPTH);
    for (let k = 1; k <= p.floors + 1; k++) {
      const y = k * FLOOR, zf = Math.min(front(y), -0.5), d = zf - zb;
      body.push(kit.box({ w: p.width, d, h: 0.9, y: y - 0.9, z: zb + d / 2, color: '#e4e2dc', name: `slab_${k}` }));
    }
    const cols = Math.max(1, Math.round(p.width / 24));
    for (let c = 0; c < cols; c++) {
      const cx = -p.width / 2 + ((c + 0.5) * p.width) / cols;
      for (const z of [zb + 4, front(top) - 4]) body.push(kit.beam({ from: [cx, 0.3, z], to: [cx, (p.floors + 1) * FLOOR - 0.9, z], size: 0.6, color: '#b9b7b0', name: `column_${c}_${Math.round(z)}` }));
    }
    body.push(kit.reference(kit.box({ w: p.width, d: -1 - zb, h: FLOOR - 0.9, z: zb / 2 - 0.5, color: '#cfe4ee', name: 'ground_glass' })));
  } else {
    // Curved forms: slabs follow the curve. Walls get a straight back; towers are closed rings with a core.
    let outline = S.plan.slice();
    if (!S.closed) {
      const zMin = Math.min(...outline.map((q) => q[1])) - DEPTH;
      outline = outline.concat([[outline[outline.length - 1][0], zMin], [outline[0][0], zMin]]);
    }
    for (let k = 1; k <= p.floors + 1; k++) body.push(kit.extrude({ points: outline, h: 0.9, y: k * FLOOR - 0.9, color: '#e4e2dc', name: `slab_${k}` }));
    const colStep = 24, cols = Math.max(3, Math.round(L / colStep));
    for (let c = 0; c < cols; c++) {
      const [x, z, ux, uz] = S.lookup(S.closed ? (c * L) / cols : ((c + 0.5) * L) / cols);
      const cx = x + uz * 6, cz = z - ux * 6;
      body.push(kit.beam({ from: [cx, 0.3, cz], to: [cx, (p.floors + 1) * FLOOR - 0.9, cz], size: 0.6, color: '#b9b7b0', name: `column_${c}` }));
    }
    if (S.closed) body.push(kit.cylinder({ r: p.width * 0.16, h: (p.floors + 1) * FLOOR + 6, color: '#d6d3cb', name: 'core' }));
    body.push(kit.reference(kit.extrude({ points: outline, h: FLOOR - 0.9, color: '#cfe4ee', name: 'ground_glass' })));
  }

  const parts = [turnTo(skin.concat(body))];
  // Reference only: the sun, in the real sky.
  const sw = sunAt(p.hour, p.season);
  if (sw.y > 0.1) {
    const d = top * 1.1 + p.width * 0.3;
    parts.push(kit.reference(kit.sphere({ r: 3, x: sw.x * d, y: sw.y * d, z: sw.z * d, color: '#ffb547', name: 'sun' })));
  }
  return parts;
}

// Design rules. Each returns a warning when it breaks.
export function check(p) {
  const w = [];
  const eye = eyeOpening(p);
  const hole = holeInches(p, eye);
  if (hole < 6) w.push(`People rule: the view hole at eye level is ${hole.toFixed(1)} in. It must be at least 6 in so people inside can see out.`);
  const clear = clearShare(eye) * 100;
  if (clear < 25) w.push(`People rule: only ${clear.toFixed(0)}% of the facade is clear at eye level. It must be at least 25%.`);
  const day = dayCatch(p);
  if (day.ratio < 1) w.push(`The skin catches ${day.ratio.toFixed(2)} times the sun of the same surface closed flat, on a clear ${p.season} day. It must be at least 1, or opening costs energy.`);
  const reach = leafReach(p);
  if (reach > 1.5) w.push(`People rule: leaf tips reach ${reach.toFixed(2)} ft past the frame. Keep it under 1.5 ft so a window-cleaning rig can pass.`);
  return w;
}

// Extra numbers for the Model panel.
export function stats(p) {
  const { mods, rows, top } = layout(p);
  const s = sunLocal(p, p.hour);
  const half = OPEN_MIN + (p.open - OPEN_MIN) / 2;
  const lit = mods.filter((m) => sunOnFace(m, s) >= SUN_FULL).length;
  const opened = mods.filter((m) => moduleOpen(p, sunOnFace(m, s), false) >= half).length;
  const day = dayCatch(p);
  return {
    'Eye-level view hole (in)': holeInches(p, eyeOpening(p)),
    'Eye-level clear view (%)': clearShare(eyeOpening(p)) * 100,
    'Day catch vs closed skin (x)': day.ratio,
    'Clear-day energy (kWh, est.)': day.kWh,
    'Best-case module (W, est.)': day.moduleW,
    'Leaf reach (ft)': leafReach(p),
    'Modules': mods.length,
    'Modules in full sun now': lit,
    'Modules open now (%)': mods.length ? (opened / mods.length) * 100 : 0,
    'Rows': rows,
    'Motors (1 per leaf)': mods.length * sidesOf(p),
    'Skin top (ft)': top,
    'Sun height (deg)': Math.asin(sunAt(p.hour, p.season).y) / RAD,
  };
}
