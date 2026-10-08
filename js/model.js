// Girasol facade model, built in code with Three.js.
// Geometry follows DESIGN.md, figures follow SPEC.md.
//   createFacade(): the whole building, used on Log in, Home and A Day.
//   createModule(): one triangle up close, used on The Module.
//   applySky(): sets the page colours for a time of day.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/* ---------- Colours (DESIGN.md) ---------- */
export const COLOR = {
  dawn: "#F4D3CC",
  noon: "#F7F6F2",
  dusk: "#F2A55E",
  night: "#0E1A33",
  sun: "#FFB547",
  energy: "#FFD27A",
  ink: "#1A1A1F",
  paper: "#F7F6F2",
  frame: "#C9CCD1",
  leaf: "#F2F2F0",
  cell: "#0B0C10",
  glass: "#CFE4EE",
  motor: "#3A3D44"
};

/* ---------- Small helpers ---------- */
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const lerp = (a, b, k) => a + (b - a) * k;
const smoothstep = (a, b, v) => {
  const k = clamp((v - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
// DESIGN.md easing, cubic-bezier(0.22, 1, 0.36, 1), close enough for code
const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 4);
// Frame-rate independent approach toward a target
const approach = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));

export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Day cycle ---------- */
// Time of day t: 0 sunrise, 0.5 noon, 1 sunset. Below 0 or above 1 is dark.
const SKY = [
  [-0.2, COLOR.night],
  [0, COLOR.dawn],
  [0.5, COLOR.noon],
  [1, COLOR.dusk],
  [1.2, COLOR.night]
];

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const mixRgb = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

export function skyAt(t) {
  const tt = clamp(t, SKY[0][0], SKY[SKY.length - 1][0]);
  let i = 0;
  while (i < SKY.length - 2 && tt > SKY[i + 1][0]) i++;
  const [t0, c0] = SKY[i];
  const [t1, c1] = SKY[i + 1];
  let bg = mixRgb(hexToRgb(c0), hexToRgb(c1), (tt - t0) / (t1 - t0));

  // Keep WCAG AA (4.5:1) at every moment: if neither Ink nor Paper is
  // strong enough on this sky, deepen the sky a little toward Night.
  const ink = hexToRgb(COLOR.ink);
  const paper = hexToRgb(COLOR.paper);
  const night = hexToRgb(COLOR.night);
  for (let guard = 0; guard < 40; guard++) {
    if (Math.max(contrast(bg, ink), contrast(bg, paper)) >= 4.5) break;
    bg = mixRgb(bg, night, 0.05);
  }
  const dark = contrast(bg, paper) > contrast(bg, ink);
  return { bg: rgbToHex(bg), text: dark ? COLOR.paper : COLOR.ink, dark };
}

let lastSky = "";
export function applySky(t) {
  const sky = skyAt(t);
  if (sky.bg !== lastSky) {
    lastSky = sky.bg;
    const style = document.documentElement.style;
    style.setProperty("--bg", sky.bg);
    style.setProperty("--text", sky.text);
    style.setProperty("--btn-bg", sky.text);
    style.setProperty("--btn-text", sky.dark ? COLOR.ink : COLOR.paper);
  }
  return sky;
}

// Sun height: 1 at noon, 0 at sunrise and sunset, negative after dark
const sunHeight = (t) => (t < 0 ? t * 3 : t > 1 ? (1 - t) * 3 : Math.sin(Math.PI * t));
export const daylightAt = (t) => smoothstep(-0.03, 0.25, sunHeight(t));

/* ---------- Building dimensions (SPEC.md) ---------- */
const SIDE = 4;                           // module side, ft
const TRI_H = (SIDE * Math.sqrt(3)) / 2;  // module height, ft
const WIDTH = 84;                         // facade width, ft
const FLOOR = 96 / 7;                     // 7 storeys in 96 ft
const ROWS = 24;                          // rows of triangles over the 6 upper floors
const SKIN_Y = FLOOR;                     // the skin starts above the glazed ground floor
const SKIN_H = ROWS * TRI_H;
const DEPTH = 48;                         // visual stand-in only, see SPEC.md
const INNER = 0.82;                       // leaves sit inside the frame
const OPEN_MIN = 0.05;                    // 5% closed
const MAX_ANGLE = THREE.MathUtils.degToRad(72);

/* ---------- Shared geometry ---------- */
function triangleShape(scale = 1) {
  // Equilateral triangle, side SIDE * scale, centred on its centroid, pointing up
  const s = (SIDE * scale) / 2;
  const h = TRI_H * scale;
  const shape = new THREE.Shape();
  shape.moveTo(-s, -h / 3);
  shape.lineTo(s, -h / 3);
  shape.lineTo(0, (2 * h) / 3);
  shape.closePath();
  return shape;
}

function frameGeometry(depth = 0.35) {
  const shape = triangleShape(1);
  const hole = triangleShape(INNER);
  shape.holes.push(new THREE.Path(hole.getPoints().slice().reverse()));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// A leaf: its hinge runs along the x axis, its tip points along +y.
const LEAF_BASE = SIDE * INNER * 0.94;
const LEAF_TIP = (SIDE * INNER * Math.sqrt(3)) / 6 * 0.94;

function leafShape(scale = 1, lift = 0) {
  // scale shrinks the leaf about its incentre (used for the solar cell)
  const cy = LEAF_TIP / 3;
  const pts = [
    [-LEAF_BASE / 2, 0],
    [LEAF_BASE / 2, 0],
    [0, LEAF_TIP]
  ].map(([x, y]) => [x * scale, cy + (y - cy) * scale + lift]);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  shape.lineTo(pts[1][0], pts[1][1]);
  shape.lineTo(pts[2][0], pts[2][1]);
  shape.closePath();
  return shape;
}

function makeMaterials() {
  return {
    frame: new THREE.MeshStandardMaterial({ color: COLOR.frame, metalness: 0.85, roughness: 0.38 }),
    leaf: new THREE.MeshStandardMaterial({ color: COLOR.leaf, metalness: 0, roughness: 0.9, side: THREE.DoubleSide }),
    cell: new THREE.MeshStandardMaterial({ color: COLOR.cell, metalness: 0.3, roughness: 0.12, envMapIntensity: 1.4 }),
    motor: new THREE.MeshStandardMaterial({ color: COLOR.motor, metalness: 0.7, roughness: 0.35 })
  };
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,210,122,1)");
  grad.addColorStop(0.25, "rgba(255,181,71,0.55)");
  grad.addColorStop(1, "rgba(255,181,71,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- City skyline (Home) ---------- */
// A made-up skyline, not a real city: rows of plain blocks behind the building.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skylineLayer(z, minH, maxH, seed) {
  const rand = seeded(seed);
  const blocks = [];
  for (let x = -520; x < 520; ) {
    const w = 10 + rand() * 22;
    let h = minH + rand() * (maxH - minH) * 0.6;
    if (rand() > 0.82) h = minH + (maxH - minH) * (0.7 + rand() * 0.3); // the odd tower
    blocks.push({ x: x + w / 2, w, h });
    x += w + rand() * 4;
  }
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, blocks.length);
  const dummy = new THREE.Object3D();
  const BASE = -90; // runs below the bottom of the screen
  blocks.forEach((b, i) => {
    dummy.position.set(b.x, (BASE + b.h) / 2, z);
    dummy.scale.set(b.w, b.h - BASE, 8);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  return { mesh, mat };
}

// Silhouette colours a few shades from the sky, never so dark that text loses AA contrast
function skylineColors(t) {
  const sky = skyAt(t);
  const bg = hexToRgb(sky.bg);
  const text = hexToRgb(sky.text);
  const shadow = sky.dark ? [0, 0, 0] : hexToRgb(COLOR.ink);
  const shade = (amount) => {
    let k = amount;
    let c = mixRgb(bg, shadow, k);
    while (k > 0 && contrast(c, text) < 4.5) {
      k -= 0.01;
      c = mixRgb(bg, shadow, Math.max(k, 0));
    }
    return rgbToHex(c);
  };
  return { far: shade(0.08), near: shade(0.16) };
}

function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

function makeEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
}

/* ---------- Facade layout ---------- */
function makeModule(v, up) {
  const cx = (v[0][0] + v[1][0] + v[2][0]) / 3;
  const cy = (v[0][1] + v[1][1] + v[2][1]) / 3;
  const inner = v.map(([x, y]) => [cx + (x - cx) * INNER, cy + (y - cy) * INNER]);

  // One leaf hinged on each inner edge of the frame
  const leaves = [];
  for (let k = 0; k < 3; k++) {
    const a = inner[k];
    const b = inner[(k + 1) % 3];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    // Make the leaf's +y point from the hinge toward the module centre
    if (-dy * (cx - mx) + dx * (cy - my) < 0) {
      dx = -dx;
      dy = -dy;
    }
    leaves.push({ mx, my, phi: Math.atan2(dy, dx), ox: dy, oy: -dx });
  }

  // Position on the diamond grid: each rhombus panel is 4 x 4 lattice cells
  const ddx = cx + WIDTH / 2;
  const ddy = (cy - SKIN_Y) / TRI_H;
  const u = (ddy + ddx / 2) / 2;
  const w = (ddy - ddx / 2) / 2;

  return {
    cx,
    cy,
    up,
    leaves,
    panel: Math.floor(u / 4) + ":" + Math.floor(w / 4),
    // The opening wave starts on the sunrise side
    delay: ((WIDTH / 2 - cx) / WIDTH) * 0.8 + (1 - (cy - SKIN_Y) / SKIN_H) * 0.2,
    rate: 2.6 + ((Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5453) % 1 + 1) % 1 * 2.2,
    open: OPEN_MIN
  };
}

function layoutModules() {
  const mods = [];
  const x0 = -WIDTH / 2;
  const x1 = WIDTH / 2;
  const eps = 1e-6;
  for (let r = 0; r < ROWS; r++) {
    const y = SKIN_Y + r * TRI_H;
    const offset = (r % 2) * 2;
    for (let x = x0 + offset - 4; x <= x1; x += 4) {
      if (x >= x0 - eps && x + 4 <= x1 + eps) {
        mods.push(makeModule([[x, y], [x + 4, y], [x + 2, y + TRI_H]], true));
      }
      if (x + 2 >= x0 - eps && x + 6 <= x1 + eps) {
        mods.push(makeModule([[x + 2, y + TRI_H], [x + 6, y + TRI_H], [x + 4, y]], false));
      }
    }
  }
  return mods;
}

// Diamond diagrid: lines along the two slanted lattice directions, every 4 modules
function diagridSegments() {
  const segs = [];
  const x0 = -WIDTH / 2;
  const add = (ax, ay, bx, by) => segs.push([ax, ay, bx, by]);
  for (let k = -12; k <= 18; k++) {
    // Lines rising to the right
    let lo = Math.max(4 * k - 42, -4 * k);
    let hi = Math.min(4 * k, 24 - 4 * k);
    if (hi - lo > 0.01) {
      const p = (s) => [x0 + 8 * k - 2 * s, SKIN_Y + TRI_H * (4 * k + s)];
      add(...p(lo), ...p(hi));
    }
    // Lines rising to the left
    lo = Math.max(4 * k, -4 * k);
    hi = Math.min(4 * k + 42, 24 - 4 * k);
    if (hi - lo > 0.01) {
      const p = (s) => [x0 - 8 * k + 2 * s, SKIN_Y + TRI_H * (4 * k + s)];
      add(...p(lo), ...p(hi));
    }
  }
  // Border
  const top = SKIN_Y + SKIN_H;
  add(x0, SKIN_Y, -x0, SKIN_Y);
  add(x0, top, -x0, top);
  add(x0, SKIN_Y, x0, top);
  add(-x0, SKIN_Y, -x0, top);
  return segs;
}

/* ---------- The whole facade ---------- */
const VIEWS = {
  home: { y: 62, halfH: 76, halfW: 50 },
  day: { y: 58, halfH: 70, halfW: 50 },
  breathe: { y: 48, halfH: 54, halfW: 46 }
};

export function createFacade(canvas, options = {}) {
  const mode = options.mode || "home";
  const view = VIEWS[mode] || VIEWS.home;
  const reduced = prefersReducedMotion();

  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  makeEnvironment(renderer, scene);
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 2000);
  const mats = makeMaterials();

  /* Lights */
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0x3a3f4a, 0.6);
  const sunLight = new THREE.DirectionalLight(0xffffff, 2);
  scene.add(hemi, sunLight, sunLight.target);
  sunLight.target.position.set(0, 50, 0);

  /* Groups that separate in the exploded view */
  const building = new THREE.Group();
  const structure = new THREE.Group();
  const diagrid = new THREE.Group();
  const skin = new THREE.Group();
  building.add(structure, diagrid, skin);
  scene.add(building);

  /* Structure: slabs, V-shaped columns, glazed ground floor */
  const concrete = new THREE.MeshStandardMaterial({ color: "#C4C7CC", roughness: 0.85 });
  const slabGeo = new THREE.BoxGeometry(WIDTH + 2, 0.9, DEPTH);
  for (let k = 0; k <= 7; k++) {
    const slab = new THREE.Mesh(slabGeo, concrete);
    slab.position.set(0, k * FLOOR, -0.6 - DEPTH / 2);
    structure.add(slab);
  }

  const columnGeo = new THREE.CylinderGeometry(0.32, 0.32, 1, 8);
  const columns = new THREE.InstancedMesh(columnGeo, concrete, 7 * 6 * 2);
  const dummy = new THREE.Object3D();
  let ci = 0;
  for (let k = 0; k < 7; k++) {
    for (let i = 0; i < 6; i++) {
      const xc = -35 + 14 * i;
      const y0 = k * FLOOR + 0.45;
      const y1 = (k + 1) * FLOOR - 0.45;
      for (const side of [-1, 1]) {
        const dx = side * 3.5;
        const dy = y1 - y0;
        dummy.position.set(xc + dx / 2, (y0 + y1) / 2, -4);
        dummy.rotation.set(0, 0, Math.atan2(-dx, dy));
        dummy.scale.set(1, Math.hypot(dx, dy), 1);
        dummy.updateMatrix();
        columns.setMatrixAt(ci++, dummy.matrix);
      }
    }
  }
  structure.add(columns);

  const interiorMat = new THREE.MeshStandardMaterial({ color: "#262A31", roughness: 0.9, transparent: true });
  const interior = new THREE.Mesh(new THREE.BoxGeometry(WIDTH - 0.5, 6 * FLOOR - 1, DEPTH - 2), interiorMat);
  interior.position.set(0, FLOOR + 3 * FLOOR, -1.6 - (DEPTH - 2) / 2);
  structure.add(interior);

  const glassMat = new THREE.MeshStandardMaterial({
    color: COLOR.glass, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.32, depthWrite: false
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(WIDTH, FLOOR - 0.9, DEPTH - 1), glassMat);
  glass.position.set(0, FLOOR / 2, -0.8 - (DEPTH - 1) / 2);
  structure.add(glass);

  const entryMat = new THREE.MeshStandardMaterial({ color: "#2A2F36", roughness: 0.6, transparent: true });
  const entry = new THREE.Mesh(new THREE.BoxGeometry(12, FLOOR * 0.72, 0.6), entryMat);
  entry.position.set(0, FLOOR * 0.36 + 0.45, -0.6);
  structure.add(entry);

  /* Diagrid */
  const segs = diagridSegments();
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.frame, segs.length);
  segs.forEach(([ax, ay, bx, by], i) => {
    dummy.position.set((ax + bx) / 2, (ay + by) / 2, 0.05);
    dummy.rotation.set(0, 0, Math.atan2(by - ay, bx - ax));
    dummy.scale.set(Math.hypot(bx - ax, by - ay) + 0.5, 0.5, 0.55);
    dummy.updateMatrix();
    bars.setMatrixAt(i, dummy.matrix);
  });
  diagrid.add(bars);

  /* Skin: modules */
  const mods = layoutModules();
  const N = mods.length;
  const frames = new THREE.InstancedMesh(frameGeometry(), mats.frame, N);
  const leaves = new THREE.InstancedMesh(new THREE.ShapeGeometry(leafShape()), mats.leaf, N * 3);
  const cellGeo = new THREE.ShapeGeometry(leafShape(0.72));
  cellGeo.translate(0, 0, 0.03);
  const cells = new THREE.InstancedMesh(cellGeo, mats.cell, N * 3);
  for (const mesh of [frames, leaves, cells]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
  }
  skin.add(frames, leaves, cells);

  // The panel and module that step forward in the exploded view
  const panelCounts = {};
  mods.forEach((m) => (panelCounts[m.panel] = (panelCounts[m.panel] || 0) + 1));
  let featurePanel = null;
  let best = Infinity;
  mods.forEach((m) => {
    if (panelCounts[m.panel] !== 32) return;
    const d = Math.hypot(m.cx - 16, m.cy - (SKIN_Y + SKIN_H * 0.55));
    if (d < best) {
      best = d;
      featurePanel = m.panel;
    }
  });
  const panelMods = mods.filter((m) => m.panel === featurePanel);
  const pcx = panelMods.reduce((s, m) => s + m.cx, 0) / panelMods.length;
  const pcy = panelMods.reduce((s, m) => s + m.cy, 0) / panelMods.length;
  let featureModule = panelMods[0];
  panelMods.forEach((m) => {
    if (m.up && Math.hypot(m.cx - pcx, m.cy - pcy) < Math.hypot(featureModule.cx - pcx, featureModule.cy - pcy)) {
      featureModule = m;
    }
  });

  /* Light behind the skin, revealed as the leaves open */
  const glowMat = new THREE.MeshBasicMaterial({
    color: COLOR.energy, transparent: true, opacity: 0, depthWrite: false, toneMapped: false
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, SKIN_H), glowMat);
  glow.position.set(0, SKIN_Y + SKIN_H / 2, -1.2);
  skin.add(glow);

  /* Energy flowing down the facade into the building */
  let flow = null;
  if (options.flow) {
    const count = 420;
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * WIDTH;
      pos[i * 3 + 1] = 1 + Math.random() * (SKIN_Y + SKIN_H - 1);
      pos[i * 3 + 2] = -0.9;
      speed[i] = 6 + Math.random() * 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: COLOR.energy, size: 0.9, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
    });
    flow = { points: new THREE.Points(geo, mat), pos, speed, count };
    flow.points.frustumCulled = false;
    skin.add(flow.points);
  }

  /* City skyline behind the building */
  let skyline = null;
  if (options.skyline) {
    skyline = {
      far: skylineLayer(-260, 30, 170, 7),
      near: skylineLayer(-150, 15, 100, 21)
    };
    scene.add(skyline.far.mesh, skyline.near.mesh);
  }

  /* Ground: flat ground the colour of the sky, and a line at the building's base */
  let ground = null;
  if (options.ground) {
    const flat = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(6000, 1200), flat(COLOR.dawn));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, -0.05, -300);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(6000, 0.45), flat(COLOR.ink));
    line.position.set(0, 0, 0.6);
    // Draw the plane first so the line and the building always sit on top of it
    plane.renderOrder = -1;
    ground = { plane, line };
    scene.add(plane, line);
  }

  /* The sun */
  const sun = new THREE.Group();
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(3, 32, 16),
    new THREE.MeshBasicMaterial({ color: COLOR.sun, transparent: true, toneMapped: false })
  );
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    // Normal blending: the glow looks the same over open sky and over the skyline
    map: glowTexture(), transparent: true, depthWrite: false, toneMapped: false
  }));
  sunHalo.scale.set(34, 34, 1);
  sun.add(sunHalo, sunDisc);
  sun.visible = options.showSun !== false && mode !== "breathe";
  scene.add(sun);

  /* State */
  const state = {
    t: options.time ?? 0.3,
    tTarget: options.time ?? 0.3,
    explode: 0,
    explodeTarget: 0,
    side: 0,
    sideTarget: 0,
    frameFrac: 1,
    lift: 0,
    intro: options.intro && !reduced ? 0 : null,
    introFrom: options.introFrom ?? -0.08,
    introTo: options.time ?? 0.3,
    flying: null,
    energy: 0,
    clock: 0,
    baseDist: 200,
    ready: false
  };
  if (state.intro !== null) state.t = state.tTarget = state.introFrom;

  const sunPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const effAspect = camera.aspect * state.frameFrac;
    state.baseDist = Math.max(view.halfH / tanV, view.halfW / (tanV * effAspect));
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function placeSun(t) {
    const sunZ = 30;
    const reach = state.baseDist - sunZ;
    const ampX = Math.max(WIDTH / 2 + 18, Math.min(95, tanV * camera.aspect * state.frameFrac * reach * 0.85));
    const topY = view.y + tanV * reach * (0.88 - 2 * state.lift);
    sunPos.set(Math.cos(Math.PI * t) * ampX, 12 + Math.sin(Math.PI * t) * (topY - 12), sunZ);
    sun.position.copy(sunPos);
    const vis = smoothstep(-0.12, 0.04, sunHeight(t));
    sunDisc.material.opacity = vis;
    sunHalo.material.opacity = vis;
  }

  function updateLights(day) {
    sunLight.position.copy(sunPos).add(new THREE.Vector3(0, 10, 60));
    sunLight.intensity = 2.4 * day;
    sunLight.color.set(COLOR.sun).lerp(new THREE.Color("#FFF7EA"), smoothstep(0.1, 0.8, sunHeight(state.t)));
    hemi.intensity = 0.22 + 0.5 * day;
    hemi.color.set(day > 0.3 ? 0xfff4e6 : 0x9fb3d9);
    const env = 0.25 + 0.75 * day;
    mats.frame.envMapIntensity = env;
    mats.cell.envMapIntensity = 1.4 * env;
    mats.leaf.envMapIntensity = 0.4 * env;
    concrete.envMapIntensity = env;
  }

  function updateModules(dt) {
    const day = daylightAt(state.t);
    let introWave = null;
    if (state.intro !== null) introWave = easeOut(state.intro);
    let total = 0;

    const skinZ = state.explode * 56;
    const panelZ = state.explode * 22;
    const moduleZ = state.explode * 18;

    for (let i = 0; i < N; i++) {
      const m = mods[i];
      const prox = 1 - Math.min(1, Math.abs(sunPos.x - m.cx) / 140);
      let target;
      if (mode === "breathe") {
        target = OPEN_MIN + 0.55 * (0.5 + 0.5 * Math.sin(state.clock * 0.7 - m.cx * 0.05 - m.cy * 0.03));
      } else if (introWave !== null) {
        const wave = smoothstep(0, 1, introWave * 1.7 - m.delay * 0.7);
        target = OPEN_MIN + (1 - OPEN_MIN) * wave * day * (0.82 + 0.18 * prox);
      } else {
        target = OPEN_MIN + (1 - OPEN_MIN) * day * (0.82 + 0.18 * prox);
      }
      m.open = approach(m.open, target, introWave !== null ? 9 : m.rate, dt);
      total += m.open;

      let z = 0;
      if (m.panel === featurePanel) z += panelZ;
      if (m === featureModule) z += moduleZ;

      dummy.position.set(m.cx, m.cy, z);
      dummy.rotation.set(0, 0, m.up ? 0 : Math.PI);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      frames.setMatrixAt(i, dummy.matrix);

      // Each leaf turns a little more on the side facing the sun
      let sdx = sunPos.x - m.cx;
      let sdy = sunPos.y - m.cy;
      const sl = Math.hypot(sdx, sdy) || 1;
      sdx /= sl;
      sdy /= sl;
      for (let k = 0; k < 3; k++) {
        const L = m.leaves[k];
        const bias = mode === "breathe" ? 0 : 0.25 * (L.ox * sdx + L.oy * sdy);
        const theta = Math.min(MAX_ANGLE * m.open * (1 + bias), THREE.MathUtils.degToRad(82));
        dummy.position.set(L.mx, L.my, z);
        dummy.rotation.set(theta, 0, L.phi, "ZXY");
        dummy.updateMatrix();
        leaves.setMatrixAt(i * 3 + k, dummy.matrix);
        cells.setMatrixAt(i * 3 + k, dummy.matrix);
      }
    }
    frames.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    cells.instanceMatrix.needsUpdate = true;

    skin.position.z = skinZ;
    diagrid.position.z = state.explode * 28;
    state.energy = (total / N) * day;
  }

  function updateCamera() {
    const e = easeOut(state.explode);
    camTarget.set(0, view.y, e * 30);
    const yaw = e * 0.75;
    const pitch = 0.04 + e * 0.3;
    const dist = state.baseDist * (1 + 0.45 * e);
    camera.position.set(
      camTarget.x + dist * Math.sin(yaw) * Math.cos(pitch),
      camTarget.y + dist * Math.sin(pitch),
      camTarget.z + dist * Math.cos(yaw) * Math.cos(pitch)
    );
    camera.lookAt(camTarget);

    if (state.flying) {
      const f = state.flying;
      const k = easeOut(f.time / f.duration);
      camera.position.lerpVectors(f.fromPos, f.toPos, k);
      const look = new THREE.Vector3().lerpVectors(f.fromLook, f.toLook, k);
      camera.lookAt(look);
    }

    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    if (Math.abs(state.side) > 0.0005 || state.lift !== 0) {
      camera.setViewOffset(w, h, state.side * w, state.lift * h, w, h);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
  }

  /* Loop */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    state.clock += dt;

    if (state.intro !== null) {
      state.intro = Math.min(1, state.intro + dt / 4); // 4 second opening
      state.t = state.tTarget = lerp(state.introFrom, state.introTo, easeOut(state.intro));
      if (state.intro >= 1) {
        state.intro = null;
        options.onIntroEnd && options.onIntroEnd();
      }
    } else {
      state.t = approach(state.t, state.tTarget, 5, dt);
    }
    state.explode = approach(state.explode, state.explodeTarget, 4, dt);
    state.side = approach(state.side, state.sideTarget, 4, dt);

    placeSun(state.t);
    updateLights(daylightAt(state.t));
    updateModules(dt);

    const calm = 1 - state.explode;
    if (ground) {
      const sky = skyAt(state.t);
      ground.plane.material.color.set(sky.bg);
      ground.line.material.color.set(sky.text);
    }
    if (skyline) {
      const tint = skylineColors(state.t);
      skyline.far.mat.color.set(tint.far);
      skyline.near.mat.color.set(tint.near);
    }
    glowMat.opacity = state.energy * 0.85 * calm;
    interiorMat.opacity = 1 - state.explode * 0.9;
    entryMat.opacity = 1 - state.explode * 0.9;
    glassMat.opacity = 0.32 * (1 - state.explode * 0.6);

    if (flow) {
      flow.points.material.opacity = state.energy * calm;
      for (let i = 0; i < flow.count; i++) {
        flow.pos[i * 3 + 1] -= flow.speed[i] * dt * (0.3 + state.energy);
        if (flow.pos[i * 3 + 1] < 1) flow.pos[i * 3 + 1] = SKIN_Y + SKIN_H;
      }
      flow.points.geometry.attributes.position.needsUpdate = true;
    }

    if (state.flying) {
      state.flying.time += dt;
      if (state.flying.time >= state.flying.duration) {
        const done = state.flying.resolve;
        state.flying.time = state.flying.duration;
        done();
      }
    }

    updateCamera();
    renderer.render(scene, camera);
    options.onFrame && options.onFrame(state);

    if (!state.ready) {
      state.ready = true;
      canvas.classList.add("is-ready");
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* Picking a module with the pointer */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    for (const mesh of [frames, leaves, cells]) mesh.computeBoundingSphere();
    const hits = raycaster.intersectObjects([cells, leaves, frames], false);
    if (!hits.length) return -1;
    const hit = hits[0];
    return hit.object === frames ? hit.instanceId : Math.floor(hit.instanceId / 3);
  }

  function flyTo(index) {
    const m = mods[index];
    if (!m) return Promise.resolve();
    const world = new THREE.Vector3(m.cx, m.cy, skin.position.z);
    return new Promise((resolve) => {
      state.flying = {
        time: 0,
        duration: 1.1,
        fromPos: camera.position.clone(),
        toPos: world.clone().add(new THREE.Vector3(0, 0, 7)),
        fromLook: camTarget.clone(),
        toLook: world,
        resolve
      };
    });
  }

  return {
    state,
    moduleCount: N,
    setTime(t, instant = false) {
      state.tTarget = t;
      if (instant) state.t = t;
    },
    setExplode(e, instant = false) {
      state.explodeTarget = e;
      if (instant) state.explode = e;
    },
    // side: 1 puts the building in the left 7 columns, -1 in the right 7 columns
    setSide(side, instant = false) {
      state.sideTarget = side * (0.5 - 7 / 24);
      if (instant) state.side = state.sideTarget;
    },
    // lift: move the building up by this fraction of the screen height (phones)
    setLift(lift) {
      state.lift = lift;
    },
    setFrameFraction(frac) {
      state.frameFrac = frac;
      resize();
    },
    isIntroPlaying: () => state.intro !== null,
    pick,
    flyTo
  };
}

/* ---------- One module up close ---------- */
export function createModule(canvas, options = {}) {
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  makeEnvironment(renderer, scene);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const mats = makeMaterials();

  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x3a3f4a, 0.7));
  const sunLight = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sunLight.position.set(6, 8, 10);
  scene.add(sunLight);

  const root = new THREE.Group();
  scene.add(root);

  // Light behind the module, revealed as it opens
  const glowMat = new THREE.MeshBasicMaterial({
    color: COLOR.energy, transparent: true, opacity: 0, depthWrite: false, toneMapped: false
  });
  const glow = new THREE.Mesh(new THREE.ShapeGeometry(triangleShape(INNER * 0.98)), glowMat);
  glow.position.z = -0.25;
  root.add(glow);

  const frame = new THREE.Mesh(frameGeometry(0.4), mats.frame);
  root.add(frame);

  const leafGeo = new THREE.ExtrudeGeometry(leafShape(), { depth: 0.06, bevelEnabled: false });
  leafGeo.translate(0, 0, -0.03);
  const cellGeo = new THREE.ExtrudeGeometry(leafShape(0.72), { depth: 0.03, bevelEnabled: false });
  const motorGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.55, 20);
  motorGeo.rotateZ(Math.PI / 2);

  const h = TRI_H * INNER;
  const corners = [
    [-SIDE * INNER / 2, -h / 3],
    [SIDE * INNER / 2, -h / 3],
    [0, (2 * h) / 3]
  ];

  const parts = [];
  for (let k = 0; k < 3; k++) {
    const a = corners[k];
    const b = corners[(k + 1) % 3];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    if (-dy * (0 - mx) + dx * (0 - my) < 0) {
      dx = -dx;
      dy = -dy;
    }
    const phi = Math.atan2(dy, dx);

    // Hinge: fixed to the frame edge
    const hinge = new THREE.Group();
    hinge.position.set(mx, my, 0);
    hinge.rotation.z = phi;
    root.add(hinge);

    const motor = new THREE.Mesh(motorGeo, mats.motor);
    motor.position.set(0, -0.02, -0.05);
    hinge.add(motor);

    // Leaf: swings about the hinge
    const pivot = new THREE.Group();
    hinge.add(pivot);
    const leaf = new THREE.Mesh(leafGeo, mats.leaf);
    const cell = new THREE.Mesh(cellGeo, mats.cell);
    cell.position.z = 0.035;
    pivot.add(leaf, cell);

    parts.push({ hinge, pivot, leaf, cell, motor });
  }

  // Anchors for the part labels, in each part's local space
  const anchors = {
    frame: { object: frame, point: new THREE.Vector3(0, (2 * TRI_H) / 3, 0) },
    leaves: { object: parts[0].leaf, point: new THREE.Vector3(0, LEAF_TIP * 0.5, 0) },
    cells: { object: parts[1].cell, point: new THREE.Vector3(0, LEAF_TIP * 0.4, 0) },
    motors: { object: parts[2].motor, point: new THREE.Vector3(0, 0, 0) }
  };

  const state = {
    open: options.open ?? 0.6,
    openShown: OPEN_MIN,
    explode: 0,
    explodeTarget: 0,
    yaw: -0.45,
    pitch: 0.2,
    yawTarget: -0.45,
    pitchTarget: 0.2
  };

  function resize() {
    const w = canvas.clientWidth || 1;
    const hh = canvas.clientHeight || 1;
    renderer.setSize(w, hh, false);
    camera.aspect = w / hh;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // Leave room around the module for the text in the corners
    const dist = Math.max(6.4 / tanV, 6.8 / (tanV * camera.aspect));
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* Drag to rotate */
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: state.yawTarget, pitch: state.pitchTarget };
    canvas.setPointerCapture(e.pointerId);
    options.onInteract && options.onInteract();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    state.yawTarget = drag.yaw + (e.clientX - drag.x) * 0.008;
    state.pitchTarget = clamp(drag.pitch + (e.clientY - drag.y) * 0.006, -1.1, 1.1);
  });
  const endDrag = () => (drag = null);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("keydown", (e) => {
    const step = 0.15;
    if (e.key === "ArrowLeft") state.yawTarget -= step;
    else if (e.key === "ArrowRight") state.yawTarget += step;
    else if (e.key === "ArrowUp") state.pitchTarget = clamp(state.pitchTarget - step, -1.1, 1.1);
    else if (e.key === "ArrowDown") state.pitchTarget = clamp(state.pitchTarget + step, -1.1, 1.1);
    else return;
    e.preventDefault();
    options.onInteract && options.onInteract();
  });

  const v = new THREE.Vector3();
  let last = performance.now();
  let ready = false;
  function frameLoop(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    state.openShown = approach(state.openShown, state.open, 4, dt);
    state.explode = approach(state.explode, state.explodeTarget, 3.5, dt);
    state.yaw = approach(state.yaw, state.yawTarget, 8, dt);
    state.pitch = approach(state.pitch, state.pitchTarget, 8, dt);
    root.rotation.set(state.pitch, state.yaw, 0);

    const e = easeOut(state.explode);
    const theta = MAX_ANGLE * state.openShown;
    parts.forEach((p, k) => {
      p.pivot.rotation.x = theta;
      // Explode: leaves forward, cells further forward, motors back, with slight stagger
      const stagger = clamp(e * 1.15 - k * 0.05, 0, 1);
      p.pivot.position.set(0, 0, stagger * 1.4);
      p.cell.position.z = 0.035 + stagger * 1.1;
      p.motor.position.set(0, -0.25 * stagger, -0.05 - stagger * 1.6);
    });
    glowMat.opacity = 0.85 * state.openShown * (1 - e);

    renderer.render(scene, camera);

    // Part labels follow their parts on screen
    if (options.labels) {
      const w = canvas.clientWidth;
      const hh = canvas.clientHeight;
      for (const [name, el] of Object.entries(options.labels)) {
        const a = anchors[name];
        if (!a || !el) continue;
        v.copy(a.point).applyMatrix4(a.object.matrixWorld).project(camera);
        el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * hh}px)`;
        el.style.opacity = smoothstep(0.55, 0.95, state.explode);
      }
    }

    if (!ready) {
      ready = true;
      canvas.classList.add("is-ready");
    }
    requestAnimationFrame(frameLoop);
  }
  requestAnimationFrame(frameLoop);

  return {
    state,
    setOpen(fraction) {
      state.open = clamp(fraction, OPEN_MIN, 1);
    },
    setExplode(e, instant = false) {
      state.explodeTarget = e;
      if (instant) state.explode = e;
    }
  };
}
