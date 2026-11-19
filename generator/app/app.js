// app.js: the plumbing. Viewer, sliders, variations, import, export.
// Students and agents should not need to edit this file. Change generator.js instead.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import GUI from 'lil-gui';
import * as kit from './kit.js';

window.__appLoaded = true; // tells index.html the tool's files loaded
const $ = (id) => document.getElementById(id);

// ---------- units ----------
const FT = { feet: 1, inches: 1 / 12, meters: 3.280839895013123, centimeters: 0.03280839895013123, millimeters: 0.0032808398950131233 };
const SHORT = { feet: 'ft', meters: 'm', inches: 'in', millimeters: 'mm', centimeters: 'cm' };
const isLocal = location.protocol === 'http:' && (['localhost', '127.0.0.1', '[::1]', '::1', '[::]', '0.0.0.0'].includes(location.hostname)
  || location.hostname.endsWith('.local') || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname));
// /generator/ and /generator/index.html are the same page, so they share saved variations.
const pageKey = (() => { const p = location.pathname.replace(/index(\.html)?$/i, ''); return p.endsWith('/') ? p : p + '/'; })();
const storageKey = (k) => `generator:${pageKey}:${k}`;

function store(k, v) { try { localStorage.setItem(storageKey(k), JSON.stringify(v)); return true; } catch { return false; } }
function load(k, fallback) { try { const v = localStorage.getItem(storageKey(k)); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } }

const S = {
  mod: null,
  defs: {},
  values: {},
  authUnits: 'feet',
  dispUnits: load('units', 'feet') === 'meters' ? 'meters' : 'feet',
  dispUnitsChosen: load('units', null) !== null, // until the student clicks ft/m, show the tool's own units
  view: '3d',
  lastText: null,
  hasModel: false,
  warnedSlow: false,
  variations: [],
  activeVar: null,
  ctxName: '',
};

// value in authored units -> display units
const lenFactor = () => FT[S.authUnits] / FT[S.dispUnits];
const toDisp = (v) => v * lenFactor();

function fmtLen(vAuth, digits = 2) {
  const feet = vAuth * FT[S.authUnits];
  if (S.dispUnits === 'meters') {
    const m = feet / FT.meters;
    return `${m.toFixed(m < 10 ? 3 : 2)} m`;
  }
  const neg = feet < 0;
  let totalIn = Math.round(Math.abs(feet) * 12 * 4) / 4; // nearest 1/4 inch
  const f = Math.floor(totalIn / 12);
  const i = totalIn - f * 12;
  const iTxt = Number.isInteger(i) ? `${i}` : i.toFixed(2).replace(/0$/, '');
  return `${neg ? '-' : ''}${f}' ${iTxt}"`;
}

function fmtNum(v) {
  if (typeof v !== 'number') return String(v);
  if (Number.isInteger(v)) return v.toLocaleString();
  return (Math.round(v * 100) / 100).toLocaleString();
}

// ---------- toast ----------
let toastTimer;
function toast(msg, ms = 2600) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- renderer / scene ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  document.querySelector('.stage').innerHTML =
    '<div class="fileguard"><h1>3D is not available</h1><p>This browser could not start WebGL. Try Chrome, Edge, Safari or Firefox, and make sure hardware acceleration is on.</p></div>';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('viewport').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f7f6f2');

const hemi = new THREE.HemisphereLight(0xffffff, 0xcfc9bb, 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const groundMat = new THREE.ShadowMaterial({ opacity: 0.16 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.0005;
ground.receiveShadow = true;
scene.add(ground);

const gridGroup = new THREE.Group();
scene.add(gridGroup);
const modelGroup = new THREE.Group();
modelGroup.name = 'model';
scene.add(modelGroup);
const ctxGroup = new THREE.Group();
ctxGroup.name = 'context';
scene.add(ctxGroup);
const refGroup = new THREE.Group(); // kit.reference(): shown faint, never exported
refGroup.name = 'reference';
scene.add(refGroup);
const figureGroup = new THREE.Group();
figureGroup.visible = false;
scene.add(figureGroup);

const persp = new THREE.PerspectiveCamera(40, 1, 0.01, 100000);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -100000, 100000);
let camera = persp;
persp.position.set(10, 8, 14);

let controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', requestRender);

let needsRender = true;
function requestRender() { needsRender = true; }
let renderFailed = false;
const pendingDispose = [];
function loop() {
  requestAnimationFrame(loop); // first, so one bad frame can't stop the viewer
  if (!needsRender) return;
  needsRender = false;
  try {
    renderer.render(scene, camera);
    renderFailed = false;
  } catch (e) {
    if (!renderFailed) showError('Drawing the model failed (a shape has a broken material or setting):', e);
    renderFailed = true;
  }
  // Old shapes are thrown away only after the new ones have been drawn, so shaders are reused.
  while (pendingDispose.length) pendingDispose.shift()();
}

function resize() {
  const el = $('viewport');
  const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
  renderer.setSize(w, h, false);
  persp.aspect = w / h;
  persp.updateProjectionMatrix();
  setOrthoFrustum(orthoHalfH);
  requestRender();
}
let orthoHalfH = 10;
function setOrthoFrustum(halfH) {
  orthoHalfH = halfH;
  const el = $('viewport');
  const aspect = Math.max(1, el.clientWidth) / Math.max(1, el.clientHeight);
  ortho.left = -halfH * aspect; ortho.right = halfH * aspect;
  ortho.top = halfH; ortho.bottom = -halfH;
  ortho.updateProjectionMatrix();
}
new ResizeObserver(resize).observe($('viewport'));

// ---------- bounds / fit / views ----------
function modelBox() {
  const b = new THREE.Box3();
  if (modelGroup.children.length) b.setFromObject(modelGroup, true);
  return b;
}
function sceneBox() {
  const b = modelBox();
  if (ctxGroup.visible && ctxGroup.children.length) b.union(new THREE.Box3().setFromObject(ctxGroup));
  if (refGroup.children.length) b.union(new THREE.Box3().setFromObject(refGroup));
  if (b.isEmpty()) b.set(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 5, 5));
  return b;
}

function setView(view) {
  S.view = view;
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === view));
  camera = view === '3d' ? persp : ortho;
  // OrbitControls remembers which way is up when it is created, so make a fresh one per view.
  camera.up.set(0, view === 'plan' ? 0 : 1, view === 'plan' ? -1 : 0);
  controls.dispose();
  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', requestRender);
  controls.enableRotate = view === '3d';
  fit();
}

function fit() {
  const b = sceneBox();
  const c = b.getCenter(new THREE.Vector3());
  const size = b.getSize(new THREE.Vector3());
  const r = Math.max(size.length() / 2, 0.5);
  controls.target.copy(c);
  if (S.view === '3d') {
    camera.up.set(0, 1, 0);
    const dist = (r / Math.sin(THREE.MathUtils.degToRad(persp.fov / 2))) * 1.05;
    const dir = new THREE.Vector3(-0.8, 0.6, 1).normalize(); // classic view from the front-left (south-west if -z is north)
    camera.position.copy(c).addScaledVector(dir, dist);
    persp.near = Math.max(dist / 1000, 0.001);
    persp.far = dist * 100;
    persp.updateProjectionMatrix();
  } else {
    const el = $('viewport');
    const aspect = Math.max(1, el.clientWidth) / Math.max(1, el.clientHeight);
    let halfW, halfH;
    if (S.view === 'plan') {
      camera.up.set(0, 0, -1);
      camera.position.set(c.x, c.y + r * 4 + 1, c.z);
      halfW = size.x / 2; halfH = size.z / 2;
    } else if (S.view === 'front') {
      camera.up.set(0, 1, 0);
      camera.position.set(c.x, c.y, c.z + r * 4 + 1);
      halfW = size.x / 2; halfH = size.y / 2;
    } else {
      camera.up.set(0, 1, 0);
      camera.position.set(c.x + r * 4 + 1, c.y, c.z);
      halfW = size.z / 2; halfH = size.y / 2;
    }
    camera.zoom = 1;
    setOrthoFrustum(Math.max(halfH, halfW / aspect, 0.25) * 1.15);
  }
  camera.lookAt(c);
  controls.update();
  requestRender();
}

// ---------- grid, shadow, figure, cut ----------
const NICE = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
let gridStep = 0;
function updateGrid(force = false) {
  const b = sceneBox();
  const size = b.getSize(new THREE.Vector3());
  const extentDisp = Math.max(size.x, size.z, 1e-3) * lenFactor();
  // aim for 15 to 60 squares across the model
  let step = NICE[NICE.length - 1];
  for (const n of NICE) { if (extentDisp / n <= 30) { step = n; break; } }
  const span = Math.max(extentDisp * 3, step * 20);
  const divisions = Math.min(2000, Math.ceil(span / step / 20) * 20); // multiple of 20, so dark lines pass through 0
  if (!force && step === gridStep && gridGroup.userData.divisions >= divisions) return;
  gridStep = step;
  gridGroup.children.forEach((c) => { c.geometry.dispose(); c.material.dispose(); });
  gridGroup.clear();
  const sizeAuth = (divisions * step) / lenFactor();
  const minor = new THREE.GridHelper(sizeAuth, divisions, 0xd9d6cc, 0xe6e3da);
  minor.position.y = 0.0005;
  gridGroup.add(minor);
  if (divisions >= 20) {
    const major = new THREE.GridHelper(sizeAuth, divisions / 10, 0xbdb9ad, 0xbdb9ad);
    major.position.y = 0.001;
    gridGroup.add(major);
  }
  gridGroup.userData.divisions = divisions;
  ground.scale.set(sizeAuth * 2, sizeAuth * 2, 1);
  $('gridLabel').textContent = `Grid: ${step} ${SHORT[S.dispUnits]} squares` + (divisions >= 20 ? `, dark lines every ${+(step * 10).toPrecision(3)} ${SHORT[S.dispUnits]}` : '');
}

function updateSun() {
  const b = sceneBox();
  const c = b.getCenter(new THREE.Vector3());
  const r = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 1);
  sun.position.set(c.x - r * 1.2, c.y + r * 2.2, c.z + r * 1.6);
  sun.target.position.copy(c);
  const sc = sun.shadow.camera;
  sc.left = -r * 1.6; sc.right = r * 1.6; sc.top = r * 1.6; sc.bottom = -r * 1.6;
  sc.near = 0.01; sc.far = r * 8;
  sc.updateProjectionMatrix();
}

function buildFigure() {
  figureGroup.children.forEach((c) => c.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }));
  figureGroup.clear();
  const u = 1 / FT[S.authUnits]; // one foot in authored units
  const col = '#7d8a99';
  const parts = [
    kit.box({ w: 0.42 * u, d: 0.3 * u, h: 2.6 * u, x: 0, y: 0, color: col }),          // legs
    kit.box({ w: 1.25 * u, d: 0.62 * u, h: 2.15 * u, x: 0, y: 2.6 * u, color: col }),  // torso
    kit.sphere({ r: 0.38 * u, x: 0, y: 5.37 * u, color: col }),                         // head, top at 5'9"
  ];
  parts.forEach((p) => { p.castShadow = true; figureGroup.add(p); });
  placeFigure();
}
function placeFigure() {
  const b = modelBox();
  const u = 1 / FT[S.authUnits];
  figureGroup.position.set(b.isEmpty() ? 0 : b.max.x + 1.5 * u, 0, b.isEmpty() ? 0 : (b.min.z + b.max.z) / 2);
}

function updateCut() {
  const on = $('cutChk').checked;
  $('cutRange').disabled = !on;
  if (!on) { renderer.clippingPlanes = []; $('cutLabel').textContent = ''; requestRender(); return; }
  const b = modelBox();
  const lo = b.isEmpty() ? 0 : b.min.y, hi = b.isEmpty() ? 1 : b.max.y;
  const y = lo + (hi - lo) * Number($('cutRange').value);
  renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), y)];
  $('cutLabel').textContent = `at ${fmtLen(y)}`;
  requestRender();
}

// ---------- errors ----------
let lastErrorText = '';
function lineHint(err) {
  const m = String(err && err.stack || '').match(/generator\.js[^:\s]*:(\d+):(\d+)/);
  return m ? `generator.js, line ${m[1]}` : '';
}
function showError(title, err) {
  const msg = (err && err.message) ? err.message : String(err);
  const where = lineHint(err);
  lastErrorText = `${title}\n${msg}${where ? `\n(${where})` : ''}`;
  $('errorText').textContent = lastErrorText;
  $('errorBox').hidden = false;
  console.error(title, err);
}
function errorShowing() { return !$('errorBox').hidden; }
function hideError() {
  // A generator.js that failed to load stays reported until a version loads, even if sliders still work.
  if (S.loadError) { showError(S.loadError.title, S.loadError.err); return; }
  $('errorBox').hidden = true; lastErrorText = '';
}
function setLoadError(title, err) { S.loadError = { title: S.hasModel ? `${title}\n(The last working version is still on screen.)` : title, err }; showError(S.loadError.title, err); }
$('errorClose').onclick = () => { $('errorBox').hidden = true; };
$('errorCopy').onclick = () => copyText(
  `My generator page shows this error:\n\n${lastErrorText}\n\nPlease fix generator.js. Follow the rules in AGENTS.md and don't change anything in app/ or lib/.`,
  'Error copied. Paste it to your agent.'
);

async function copyText(text, okMsg = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(okMsg); } catch { toast('Could not copy. Select the text and copy it yourself.'); }
    ta.remove();
  }
}

// ---------- parameters ----------
function paramType(def) {
  if (!def || typeof def !== 'object') return 'invalid';
  if (def.type) return def.type;
  if (Array.isArray(def.options)) return 'options';
  if (typeof def.value === 'boolean') return 'boolean';
  if (typeof def.value === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(def.value)) return 'color';
  if (typeof def.value === 'string') return 'text';
  return 'number';
}

function validateDefs(defs) {
  const problems = [];
  if (!defs || typeof defs !== 'object' || Array.isArray(defs)) {
    throw new Error('generator.js must export "parameters" as an object, like: export const parameters = { length: { value: 6, min: 3, max: 12, type: "length" } }');
  }
  for (const [key, def] of Object.entries(defs)) {
    if (!def || typeof def !== 'object') { problems.push(`Parameter "${key}" must be an object with a value.`); continue; }
    if (!('value' in def)) { problems.push(`Parameter "${key}" has no "value".`); continue; }
    const t = paramType(def);
    if (['number', 'length', 'angle'].includes(t)) {
      if (typeof def.value !== 'number' || !Number.isFinite(def.value)) problems.push(`Parameter "${key}": value must be a number.`);
      if (typeof def.min !== 'number' || typeof def.max !== 'number') problems.push(`Parameter "${key}": give it a min and a max so it gets a slider.`);
      else if (def.min >= def.max) problems.push(`Parameter "${key}": min (${def.min}) must be smaller than max (${def.max}).`);
      else if (def.value < def.min || def.value > def.max) problems.push(`Parameter "${key}": value ${def.value} is outside min ${def.min} to max ${def.max}.`);
    }
    if (t === 'options' && !def.options.includes(def.value)) problems.push(`Parameter "${key}": value "${def.value}" is not one of its options.`);
    if (!['number', 'length', 'angle', 'options', 'boolean', 'color', 'text'].includes(t)) problems.push(`Parameter "${key}": unknown type "${t}". Use length, angle, number, options, boolean, color or text.`);
  }
  return problems;
}

function coerce(def, v) {
  const t = paramType(def);
  if (['number', 'length', 'angle'].includes(t)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return def.value;
    if (typeof def.min === 'number' && typeof def.max === 'number' && def.min < def.max) return Math.min(def.max, Math.max(def.min, v));
    return v;
  }
  if (t === 'options') return def.options.includes(v) ? v : def.value;
  if (t === 'boolean') return typeof v === 'boolean' ? v : def.value;
  if (t === 'color') return (typeof v === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(v)) ? v : def.value;
  return typeof v === typeof def.value ? v : def.value;
}

let gui = null;
function buildGUI() {
  if (gui) gui.destroy();
  $('guiHost').innerHTML = '';
  gui = new GUI({ container: $('guiHost'), title: 'Parameters' });
  const disp = {};
  const keys = Object.keys(S.defs);
  if (!keys.length) {
    $('guiHost').insertAdjacentHTML('beforeend', '<p class="hint">No parameters yet. Ask your agent to add some.</p>');
  }
  for (const key of keys) {
    const def = S.defs[key];
    if (!def || typeof def !== 'object' || !('value' in def)) continue; // reported under Rule checks
    const t = paramType(def);
    const label = def.label || key;
    let ctrl;
    try {
      if (t === 'boolean') ctrl = gui.add(S.values, key).name(label);
      else if (t === 'options') ctrl = gui.add(S.values, key, def.options).name(label);
      else if (t === 'color') ctrl = gui.addColor(S.values, key).name(label);
      else if (t === 'text') ctrl = gui.add(S.values, key).name(label);
      else {
        const f = t === 'length' ? lenFactor() : 1;
        const unit = t === 'length' ? ` (${SHORT[S.dispUnits]})` : t === 'angle' ? ' (°)' : (def.unit ? ` (${def.unit})` : '');
        const hasRange = typeof def.min === 'number' && typeof def.max === 'number' && def.min < def.max;
        let step = (typeof def.step === 'number' && def.step > 0) ? def.step : (hasRange ? (def.max - def.min) / 100 : 0.01);
        if (t === 'length' && f !== 1) step = niceStep(step * f);
        else step = step * f;
        disp[key] = roundTo(S.values[key] * f, step);
        ctrl = hasRange
          ? gui.add(disp, key, roundTo(Math.floor(def.min * f / step + 1e-9) * step, step), roundTo(Math.ceil(def.max * f / step - 1e-9) * step, step), step).name(label + unit)
          : gui.add(disp, key).step(step).name(label + unit); // no min/max: plain number box
        ctrl.onChange((v) => { S.values[key] = coerce(def, v / f); onValuesChanged(); });
        if (def.help) ctrl.domElement.title = def.help;
        continue;
      }
      ctrl.onChange(() => onValuesChanged());
      if (def.help) ctrl.domElement.title = def.help;
    } catch (e) {
      showError(`Could not make a control for "${key}"`, e);
    }
  }
}
function niceStep(s) {
  if (!(s > 0)) return 0.01;
  const p = Math.pow(10, Math.floor(Math.log10(s)));
  const n = s / p;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
}
function roundTo(v, step) {
  if (!(step > 0)) return v;
  const d = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return Number(v.toFixed(Math.min(d, 6)));
}

function onValuesChanged() {
  S.activeVar = null;
  renderVariations();
  renderFeatured();
  scheduleRegen();
}

// ---------- generation ----------
let regenQueued = false;
function scheduleRegen() {
  if (regenQueued) return;
  regenQueued = true;
  requestAnimationFrame(() => { regenQueued = false; regenerate(); });
}

function resourcesOf(obj) {
  const set = new Set();
  obj.traverse((o) => {
    if (o.geometry) set.add(o.geometry);
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      if (!m) return;
      set.add(m);
      for (const v of Object.values(m)) if (v && v.isTexture) set.add(v);
    });
    if (o.isInstancedMesh || o.isSkinnedMesh) set.add(o);
  });
  return set;
}
// Free GPU memory for everything in obj, except resources listed in keep (still in use).
function disposeTree(obj, keep = null) {
  for (const r of resourcesOf(obj)) {
    if (keep && keep.has(r)) continue;
    try { if (typeof r.dispose === 'function') r.dispose(); } catch { /* ignore */ }
  }
}

function countTriangles(root) {
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    const tri = g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
    n += tri * (o.isInstancedMesh ? o.count : 1);
  });
  return Math.round(n);
}

function regenerate() {
  const mod = S.mod;
  if (!mod) return false;
  const p = Object.freeze({ ...S.values });
  let out;
  const t0 = performance.now();
  try {
    out = mod.generate(p, kit);
  } catch (e) {
    const setup = (S.setupProblems || []).length ? `\nAlso fix these parameter problems, they may be the cause:\n- ${S.setupProblems.join('\n- ')}` : '';
    const err = new Error(String(e && e.message !== undefined ? e.message : e) + setup);
    if (e && e.stack) err.stack = e.stack;
    showError('generate() stopped with an error:', err);
    return false;
  }
  const ms = performance.now() - t0;
  if (out && typeof out.then === 'function') {
    showError('generate() must not be async:', new Error('Remove "async" from generate(). It has to return the shapes right away, not a Promise.'));
    return false;
  }
  const root = new THREE.Group();
  const refRoot = new THREE.Group();
  const homes = []; // where each returned shape was before, so a failed build can put it back
  try {
    const list = (Array.isArray(out) ? out.flat(Infinity) : [out]).filter((x) => x !== null && x !== undefined && x !== false);
    for (const item of list) {
      if (!item || !item.isObject3D) throw new Error(`generate() returned something that is not a 3D object: ${Object.prototype.toString.call(item)}. Return a kit shape, a three.js Mesh/Group, or a list of them.`);
    }
    const okMat = (m) => m && m.isMaterial === true;
    for (const item of list) {
      item.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        if (!(okMat(m) || (Array.isArray(m) && m.length && m.every(okMat)))) {
          throw new Error(`The part "${o.name || 'unnamed'}" has a material that isn't a real material. Use kit.material(color), or just give the shape color: '#rrggbb'.`);
        }
        if (!o.geometry || !o.geometry.isBufferGeometry) throw new Error(`The part "${o.name || 'unnamed'}" has no geometry.`);
      });
    }
    for (const item of list) { homes.push([item, item.parent]); root.add(item); }
    // Move kit.reference() shapes out of the design, keeping where they are.
    root.updateMatrixWorld(true);
    const refs = [];
    root.traverse((o) => { if (o !== root && o.userData && o.userData.reference) refs.push(o); });
    refs.forEach((r) => { if (r.parent) refRoot.attach(r); });
    let meshes = 0;
    root.traverse((o) => { if (o.isMesh) meshes++; });
    if (!meshes) throw new Error(refs.length
      ? 'generate() returned only reference shapes. Return at least one real (exported) shape too.'
      : 'generate() returned no shapes. Return at least one kit shape, like kit.box({ w: 1, d: 1, h: 1 }).');
    const b = new THREE.Box3().setFromObject(root, true);
    const vals = [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z];
    if (vals.some((v) => !Number.isFinite(v))) throw new Error('The model has broken numbers (NaN or Infinity). A calculation divided by zero or used a missing parameter.');
  } catch (e) {
    // Put back anything that was part of the last working version, and only free what's new.
    refRoot.children.slice().forEach((c) => root.add(c));
    const keep = new Set([...resourcesOf(modelGroup), ...resourcesOf(refGroup)]);
    homes.forEach(([item, parent]) => { if (parent) parent.add(item); else root.remove(item); });
    homes.forEach(([item, parent]) => { if (parent) item.traverse((o) => { for (const r of resourcesOf(o)) keep.add(r); }); });
    disposeTree(root, keep); disposeTree(refRoot, keep);
    showError('The model could not be built:', e);
    return false;
  }

  const keepNew = new Set([...resourcesOf(root), ...resourcesOf(refRoot)]);
  const oldModel = modelGroup.children.slice(), oldRef = refGroup.children.slice();
  modelGroup.clear();
  root.children.slice().forEach((c) => modelGroup.add(c));
  refGroup.clear();
  refRoot.children.slice().forEach((c) => refGroup.add(c));
  pendingDispose.push(() => oldModel.concat(oldRef).forEach((o) => disposeTree(o, keepNew)));
  modelGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  hideError();

  const first = !S.hasModel;
  S.hasModel = true;
  S.lastMs = ms;
  updateGrid();
  updateSun();
  placeFigure();
  updateCut();
  updateWarnings(p);
  updateStats(p);
  if (first) fit();
  if (ms > 400 && !S.warnedSlow) {
    S.warnedSlow = true;
    toast(`Your generator takes ${Math.round(ms)} ms per update. Ask your agent to make it faster if sliders feel slow.`, 5000);
  }
  requestRender();
  return true;
}

function updateWarnings(p) {
  let warns = [];
  if (typeof S.mod.check === 'function') {
    try {
      const r = S.mod.check(p);
      const asText = (x) => (typeof x === 'string' ? x : (x && (x.message || x.text)) || JSON.stringify(x));
      if (Array.isArray(r)) warns = r.filter(Boolean).map(asText);
      else if (r) warns = [asText(r)];
    } catch (e) {
      warns = [`check() has an error: ${String(e && e.message !== undefined ? e.message : e)}`];
    }
  }
  const all = [...(S.setupProblems || []).map((x) => `Setup: ${x}`), ...warns];
  $('warnList').innerHTML = '';
  all.forEach((w) => { const li = document.createElement('li'); li.textContent = w; $('warnList').appendChild(li); });
  $('warnCard').hidden = all.length === 0;
}

function updateStats(p) {
  const dl = $('statsList');
  dl.innerHTML = '';
  const add = (k, v) => {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    dl.append(dt, dd);
  };
  const b = modelBox();
  const s = b.getSize(new THREE.Vector3());
  add('Width (x)', fmtLen(s.x));
  add('Depth (z)', fmtLen(s.z));
  add('Height (y)', fmtLen(s.y));
  let parts = 0;
  modelGroup.traverse((o) => { if (o.isMesh) parts += o.isInstancedMesh ? o.count : 1; });
  add('Parts', fmtNum(parts));
  add('Triangles', fmtNum(countTriangles(modelGroup)));
  if (typeof S.mod.stats === 'function') {
    try {
      const st = S.mod.stats(p);
      if (st && typeof st === 'object' && !Array.isArray(st)) {
        for (const [k, v] of Object.entries(st)) add(k, (v && typeof v === 'object') ? JSON.stringify(v) : fmtNum(v));
      } else if (st !== undefined && st !== null) {
        add('stats() problem', 'stats() must return an object like { "Spacing (ft)": 2.5 }');
      }
    } catch (e) {
      add('stats() error', String(e && e.message !== undefined ? e.message : e));
    }
  }
}

// ---------- loading generator.js ----------
async function fetchGeneratorText() {
  const r = await fetch('./generator.js', { cache: 'no-store' });
  if (!r.ok) throw new Error(`Could not read generator.js (HTTP ${r.status}). Is it in the same folder as index.html?`);
  return r.text();
}

// Dynamic import() hides syntax error line numbers. A classic probe script reports them.
function syntaxProbe() {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = `./generator.js?probe=${Date.now()}`;
    let done = false;
    const onErr = (ev) => {
      if (ev.filename && ev.filename.includes('generator.js')) {
        done = true;
        window.removeEventListener('error', onErr);
        s.remove();
        resolve(`generator.js, line ${ev.lineno}, column ${ev.colno}`);
      }
    };
    window.addEventListener('error', onErr);
    s.onload = () => setTimeout(() => { if (!done) { window.removeEventListener('error', onErr); s.remove(); resolve(''); } }, 50);
    s.onerror = () => { if (!done) { window.removeEventListener('error', onErr); s.remove(); resolve(''); } };
    document.head.appendChild(s);
  });
}

async function loadGenerator() {
  try { return await loadGeneratorInner(); }
  catch (e) { setLoadError('generator.js could not be set up:', e); return false; }
}
async function missingImports(text) {
  const specs = [...text.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  const bad = [];
  for (const sp of specs) {
    if (sp === 'three') continue;
    let url;
    if (sp.startsWith('three/addons/')) url = './lib/three/addons/' + sp.slice(13);
    else if (sp.startsWith('three/examples/jsm/')) url = './lib/three/addons/' + sp.slice(19);
    else if (sp.startsWith('./') || sp.startsWith('../')) url = sp;
    else { bad.push(`${sp} (packages from the internet can't be used here)`); continue; }
    try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); if (!r.ok) bad.push(`${sp} (not in this folder)`); } catch { bad.push(sp); }
  }
  return bad;
}
async function loadGeneratorInner() {
  let mod;
  try {
    mod = await import(`../generator.js?v=${Date.now()}`);
  } catch (e) {
    const where = await syntaxProbe();
    let bad = [];
    try { bad = await missingImports(S.lastText || await fetchGeneratorText()); } catch { /* ignore */ }
    const err = new Error(e.message + (where ? `\n(${where})` : '') + (bad.length ? `\nThese imports can't be found: ${bad.join(', ')}. Only three.js and the addons in lib/three/addons/ are available.` : ''));
    setLoadError(bad.length ? 'generator.js imports something that is not here:' : 'generator.js could not be loaded (often a typo or a missing bracket):', err);
    return false;
  }
  if (typeof mod.generate !== 'function') {
    setLoadError('generator.js is missing something:', new Error('It must export a function called generate, like:\nexport function generate(p, kit) { return [kit.box({ w: 1, d: 1, h: 1 })]; }'));
    return false;
  }
  let problems;
  try { problems = validateDefs(mod.parameters || {}); }
  catch (e) { setLoadError('generator.js has a problem with its parameters:', e); return false; }

  const meta = mod.meta || {};
  const UNIT_ALIASES = { feet: 'feet', foot: 'feet', ft: 'feet', meters: 'meters', meter: 'meters', metres: 'meters', metre: 'meters', m: 'meters' };
  const units = meta.units === undefined ? 'feet' : UNIT_ALIASES[String(meta.units).toLowerCase()];
  if (!units) {
    setLoadError('generator.js uses units this tool can\'t show:', new Error(`meta.units is "${meta.units}". Use 'feet' or 'meters', and write every number in those units (for inches, use kit.inch(18) in a feet tool).`));
    return false;
  }
  S.loadError = null;
  const oldAuth = S.authUnits;
  const prevDefs = S.defs, prevVals = S.values, unitsChanged = units !== S.authUnits;
  S.mod = mod;
  S.authUnits = units;
  if (!S.dispUnitsChosen) {
    S.dispUnits = units;
    document.querySelectorAll('[data-units]').forEach((x) => x.classList.toggle('on', x.dataset.units === units));
  }
  S.setupProblems = problems;
  if (unitsChanged && oldAuth) rescaleContext(oldAuth, units);
  S.defs = mod.parameters || {};
  const next = {};
  for (const [key, def] of Object.entries(S.defs)) {
    if (!def || typeof def !== 'object' || !('value' in def)) continue;
    const prev = prevDefs[key];
    const sameDefault = prev && paramType(prev) === paramType(def) && JSON.stringify(prev.value) === JSON.stringify(def.value);
    // Keep the slider where it was across reloads, unless the agent changed that parameter's default.
    next[key] = (!unitsChanged && sameDefault && key in prevVals) ? coerce(def, prevVals[key]) : coerce(def, def.value);
  }
  S.values = next;

  const name = meta.name || 'Generator';
  $('toolName').textContent = name;
  $('toolDesc').textContent = meta.description || '';
  renderByline(meta);
  document.title = `${name} · Generator`;
  buildGUI();
  buildFigure();
  regenerate();
  renderVariations();
  return true;
}

async function startLiveReload() {
  if (!isLocal) return;
  $('liveBadge').hidden = false;
  setInterval(async () => {
    let text;
    try { text = await fetchGeneratorText(); } catch { return; }
    if (text === S.lastText) return;
    S.lastText = text;
    const ok = await loadGenerator();
    if (ok) { toast('generator.js changed. Reloaded.'); loadFeatured(); }
  }, 1000);
  // Pick up a newly exported variations.json without a refresh.
  setInterval(async () => {
    let text = '';
    try { const r = await fetch('./variations.json', { cache: 'no-store' }); if (r.ok) text = await r.text(); } catch { return; }
    if (S.lastFeatText === undefined) { S.lastFeatText = text; return; }
    if (text === S.lastFeatText) return;
    S.lastFeatText = text;
    await loadFeatured();
    if (S.featured.length) toast(`variations.json updated: ${S.featured.length} designer's variation${S.featured.length === 1 ? '' : 's'}.`);
  }, 3000);
}

// ---------- variations ----------
function paramFingerprint() { return Object.keys(S.defs).sort().join('|'); }

// Every variation is photographed from the same standard angle, framed to the design,
// so a sheet of variations is a fair side-by-side comparison whatever view you were in.
function modelRadius() { return Math.max(modelBox().getSize(new THREE.Vector3()).length() / 2, 0.25); }
function snapshotDataURL(w = 480, h = 360, rCommon = null) {
  const b = modelBox();
  const c = b.getCenter(new THREE.Vector3());
  const r = rCommon || modelRadius();
  const cam = new THREE.PerspectiveCamera(persp.fov, w / h, 0.001, 1e6);
  const fovH = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
  const dist = (r / Math.sin(Math.min(THREE.MathUtils.degToRad(cam.fov / 2), fovH / 2))) * 1.02;
  cam.position.copy(c).addScaledVector(new THREE.Vector3(-0.8, 0.6, 1).normalize(), dist);
  cam.near = Math.max(dist / 1000, 0.001); cam.far = dist * 100;
  cam.lookAt(c); cam.updateProjectionMatrix();

  const prevSize = renderer.getSize(new THREE.Vector2());
  const prevRatio = renderer.getPixelRatio();
  renderer.setPixelRatio(2);
  renderer.setSize(w, h, false);
  renderer.render(scene, cam);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  out.getContext('2d').drawImage(renderer.domElement, 0, 0, w, h);
  renderer.setPixelRatio(prevRatio);
  renderer.setSize(prevSize.x, prevSize.y, false);
  renderer.render(scene, camera);
  return out.toDataURL('image/jpeg', 0.88);
}

function describeValue(key, v) {
  const def = S.defs[key];
  if (!def) return String(v);
  const t = paramType(def);
  if (t === 'length') return fmtLen(v);
  if (t === 'angle') return `${fmtNum(v)}°`;
  if (t === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') return fmtNum(v) + (def.unit ? ` ${def.unit}` : '');
  return String(v);
}

function saveVariation() {
  if (!S.hasModel) { toast('Nothing to save yet.'); return; }
  const n = (S.variations.reduce((m, v) => Math.max(m, v.n || 0), 0)) + 1;
  const v = {
    n,
    name: `V${n}`,
    values: { ...S.values },
    fp: paramFingerprint(),
    units: S.authUnits,
    img: snapshotDataURL(),
    tool: $('toolName').textContent,
    at: new Date().toISOString(),
  };
  S.variations.push(v);
  let dropped = null;
  if (S.variations.length > 24) dropped = S.variations.shift();
  S.activeVar = v.n;
  if (!store('variations', S.variations)) toast('Saved for now, but the browser is out of storage. Download a sheet so you don\'t lose these.', 5000);
  else if (dropped) toast(`Saved ${v.name}. You can keep 24, so ${dropped.name} (the oldest) was removed. Download sheets as you go.`, 5000);
  else toast(`Saved ${v.name}`);
  renderVariations();
}

function variationValues(v) {
  // Lengths saved while the tool worked in other units are converted.
  const k = (v.units && v.units !== S.authUnits && FT[v.units] && FT[S.authUnits]) ? FT[v.units] / FT[S.authUnits] : 1;
  const next = {};
  let skipped = 0;
  for (const [key, def] of Object.entries(S.defs)) {
    if (!def || typeof def !== 'object') continue;
    if (key in v.values) {
      const raw = v.values[key];
      next[key] = coerce(def, (k !== 1 && paramType(def) === 'length' && typeof raw === 'number') ? raw * k : raw);
    } else { next[key] = coerce(def, def.value); skipped++; }
  }
  return { next, skipped, converted: k !== 1 };
}

// The values as saved, with lengths converted if the tool's units changed since.
function shownValues(v) {
  const k = (v.units && v.units !== S.authUnits && FT[v.units] && FT[S.authUnits]) ? FT[v.units] / FT[S.authUnits] : 1;
  if (k === 1) return v.values;
  return Object.fromEntries(Object.entries(v.values).map(([key, val]) => [key, (S.defs[key] && paramType(S.defs[key]) === 'length' && typeof val === 'number') ? val * k : val]));
}

function applyVariation(v, featured = false) {
  const { next, skipped, converted } = variationValues(v);
  const extra = Object.keys(v.values).filter((k) => !(k in S.defs)).length;
  S.values = next;
  S.activeVar = featured ? `f${v.n}` : v.n;
  buildGUI();
  regenerate();
  renderVariations();
  renderFeatured();
  if (featured) fit(); // visitors: frame the designer's version
  const who = featured ? `the designer's ${v.name}` : v.name;
  if (converted) toast(`${who} was saved when the tool used ${v.units}. Its lengths were converted.`, 4500);
  else if (skipped || extra || v.fp !== paramFingerprint()) toast(`${who} was saved with an older version of this tool, so some settings didn't carry over.`, 4500);
  else toast(`Showing ${who}`);
}

// ---------- the designer's variations (variations.json, published with the tool) ----------
// Saved variations live in one browser. To publish them, the student clicks "Export for website",
// puts variations.json in this folder, and publishes. Every visitor then sees them here, read-only.
S.featured = [];
function validVariation(v) {
  return v && typeof v === 'object' && typeof v.n === 'number' && v.values && typeof v.values === 'object'
    && typeof v.img === 'string' && v.img.startsWith('data:image/');
}
async function loadFeatured() {
  try {
    const r = await fetch('./variations.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('none');
    const data = await r.json();
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.variations) ? data.variations : []);
    S.featured = list.filter(validVariation).slice(0, 24)
      .map((v) => ({ ...v, name: String(v.name || `V${v.n}`).slice(0, 16) }));
  } catch {
    S.featured = [];
  }
  renderFeatured();
}
function renderFeatured() {
  const grid = $('featGrid');
  grid.innerHTML = '';
  $('featCard').hidden = S.featured.length === 0;
  $('featHint').textContent = isLocal
    ? 'From variations.json in your folder. This is what visitors to your website see. Click one to load it.'
    : 'Saved by the designer. Click one to load it, then move the sliders to make it your own.';
  S.featured.forEach((v) => {
    const el = document.createElement('div');
    el.className = 'var' + (S.activeVar === `f${v.n}` ? ' active' : '');
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.title = Object.entries(shownValues(v)).map(([k, val]) => `${S.defs[k]?.label || k}: ${describeValue(k, val)}`).join('\n');
    const img = document.createElement('img'); img.alt = v.name; img.src = v.img;
    const label = document.createElement('span'); label.textContent = v.name;
    el.append(img, label);
    el.onclick = () => applyVariation(v, true);
    el.onkeydown = (ev) => { if (ev.key === 'Enter') applyVariation(v, true); };
    grid.appendChild(el);
  });
}
function exportVariations() {
  if (!S.variations.length) { toast('Save some variations first, then export them.'); return; }
  const data = {
    tool: $('toolName').textContent,
    exported: new Date().toISOString(),
    units: S.authUnits,
    variations: S.variations.map((v) => ({ n: v.n, name: v.name, values: v.values, units: v.units || S.authUnits, fp: v.fp, img: v.img })),
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  download(blob, 'variations.json');
  toast('Downloaded variations.json. Move it into your generator folder (replace the one there), then publish. Visitors will see these as "The designer\'s variations".', 9000);
}
$('exportVarBtn').onclick = exportVariations;

// On a website (not the student's own computer), speak to visitors, not to the builder.
function applyVisitorMode() {
  if (isLocal) return;
  $('useHint').textContent = 'Move the sliders to explore this design. Save the versions you like: they stay in this browser only.';
  $('varTitle').textContent = 'Your variations';
  $('varEmpty').textContent = 'Save the versions you like. They stay in this browser, on this computer only.';
  $('exportVarBtn').hidden = true;
  $('errorCopy').textContent = 'Copy error';
}

// meta.projectPage must be a web link or a page on the same site, never a script.
function safeLink(x) {
  if (typeof x !== 'string' || !x.trim()) return '';
  try {
    const u = new URL(x.trim(), location.href);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
  } catch { return ''; }
}
function renderByline(meta) {
  const by = $('byline');
  by.textContent = '';
  const author = typeof meta.author === 'string' ? meta.author.trim().slice(0, 80) : '';
  const page = safeLink(meta.projectPage);
  if (author) by.append(document.createTextNode(`By ${author}`));
  if (page) {
    if (author) by.append(document.createTextNode(' \u00b7 '));
    const a = document.createElement('a');
    a.href = page; a.target = '_top'; a.textContent = 'About this project';
    by.append(a);
  }
  by.hidden = !(author || page);
}

function renderVariations() {
  const grid = $('varGrid');
  grid.innerHTML = '';
  $('varEmpty').hidden = S.variations.length > 0;
  S.variations.forEach((v) => {
    const el = document.createElement('div');
    el.className = 'var' + (S.activeVar === v.n ? ' active' : '');
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.title = Object.entries(shownValues(v)).map(([k, val]) => `${S.defs[k]?.label || k}: ${describeValue(k, val)}`).join('\n');
    const img = document.createElement('img'); img.alt = v.name; img.src = v.img;
    const label = document.createElement('span'); label.textContent = v.name;
    const del = document.createElement('button'); del.type = 'button'; del.className = 'del';
    del.setAttribute('aria-label', `Delete ${v.name}`); del.textContent = '×';
    el.append(img, label, del);
    el.onclick = (ev) => { if (ev.target.classList.contains('del')) return; applyVariation(v); };
    el.onkeydown = (ev) => { if (ev.key === 'Enter') applyVariation(v); };
    el.querySelector('.del').onclick = () => {
      if (!confirm(`Delete ${v.name}?`)) return;
      S.variations = S.variations.filter((x) => x !== v);
      store('variations', S.variations);
      renderVariations();
    };
    grid.appendChild(el);
  });
  $('sheetBtn').disabled = S.variations.length === 0;
}

function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// Re-photograph every variation at one shared scale, so sizes compare fairly on the sheet.
// Variations saved with an older version of the tool keep their own picture.
function sameScaleImages(vs) {
  const fp = paramFingerprint();
  const keep = { values: S.values, activeVar: S.activeVar };
  const showing = errorShowing();
  const usable = vs.map((v) => v.fp === fp);
  if (!usable.some(Boolean) || showing) return vs.map((v) => v.img);
  const radii = [];
  const urls = vs.map((v) => v.img);
  try {
    vs.forEach((v, i) => {
      if (!usable[i]) return;
      S.values = variationValues(v).next;
      if (regenerate()) radii[i] = modelRadius(); else usable[i] = false;
    });
    const rMax = Math.max(...radii.filter(Boolean), 0.25);
    vs.forEach((v, i) => {
      if (!usable[i]) return;
      S.values = variationValues(v).next;
      if (regenerate()) urls[i] = snapshotDataURL(480, 360, rMax);
    });
  } finally {
    S.values = keep.values;
    S.activeVar = keep.activeVar;
    regenerate();
  }
  return urls;
}

async function downloadSheet() {
  const vs = S.variations;
  if (!vs.length) return;
  const cols = Math.min(3, vs.length), cellW = 480, imgH = 360, pad = 24;
  const ctxM = document.createElement('canvas').getContext('2d');
  ctxM.font = '15px system-ui, sans-serif';
  const textBlocks = vs.map((v) => {
    const lines = [];
    for (const [k, val] of Object.entries(shownValues(v))) {
      lines.push(...wrapText(ctxM, `${S.defs[k]?.label || k}: ${describeValue(k, val)}`, cellW - 8));
    }
    return lines;
  });
  const rows = Math.ceil(vs.length / cols);
  const rowH = [];
  for (let r = 0; r < rows; r++) {
    const maxLines = Math.max(...textBlocks.slice(r * cols, r * cols + cols).map((b) => b.length));
    rowH.push(imgH + 34 + maxLines * 20 + pad);
  }
  const W = pad + cols * (cellW + pad);
  const H = 90 + rowH.reduce((a, b) => a + b, 0);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d1d1b';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`${$('toolName').textContent}: variations`, pad, 46);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#6b6a66';
  ctx.fillText(`${vs.length} variation${vs.length === 1 ? '' : 's'} · ${new Date().toLocaleDateString()} · lengths in ${S.dispUnits} · pictures at one shared scale`, pad, 72);
  const urls = sameScaleImages(vs);
  const imgs = await Promise.all(urls.map((u) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; })));
  let y = 90;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const i = r * cols + k;
      if (i >= vs.length) break;
      const x = pad + k * (cellW + pad);
      if (imgs[i]) ctx.drawImage(imgs[i], x, y, cellW, imgH);
      ctx.strokeStyle = '#dcdad3'; ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, imgH - 1);
      ctx.fillStyle = '#1d1d1b'; ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(vs[i].name, x, y + imgH + 24);
      ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#3a3a37';
      textBlocks[i].forEach((line, j) => ctx.fillText(line, x, y + imgH + 46 + j * 20));
    }
    y += rowH[r];
  }
  c.toBlob((blob) => download(blob, `${slug()}_variations.png`), 'image/png');
}

// ---------- context import ----------
let pendingFile = null;
$('importBtn').onclick = () => { $('importFile').value = ''; $('importFile').click(); };
$('importFile').onchange = () => {
  const f = $('importFile').files[0];
  if (!f) return;
  const ext = f.name.split('.').pop().toLowerCase();
  if (!['obj', 'stl', 'glb'].includes(ext)) { toast('Use an OBJ, STL or GLB file.'); return; }
  if (f.size > 150 * 1024 * 1024) { toast('That file is over 150 MB. Export a simpler version from Rhino.', 5000); return; }
  pendingFile = f;
  $('importName').textContent = `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`;
  $('importUnits').value = S.authUnits;
  $('importUp').value = ext === 'glb' ? 'y' : 'z';
  $('importDlg').returnValue = '';
  $('importDlg').showModal();
};
$('importDlg').addEventListener('close', async () => {
  if ($('importDlg').returnValue !== 'ok' || !pendingFile) return;
  const f = pendingFile; pendingFile = null;
  toast(`Reading ${f.name}…`, 10000);
  try {
    const obj = await readModel(f);
    placeContext(obj, f.name);
  } catch (e) {
    toast('Import failed.');
    showError(`Could not import ${f.name}:`, e);
  }
});

async function readModel(f) {
  const ext = f.name.split('.').pop().toLowerCase();
  if (ext === 'obj') {
    const text = await f.text();
    const obj = new OBJLoader().parse(text);
    return obj;
  }
  const buf = await f.arrayBuffer();
  if (ext === 'stl') {
    const g = new STLLoader().parse(buf);
    return new THREE.Mesh(g);
  }
  const gltf = await new GLTFLoader().parseAsync(buf, '');
  return gltf.scene;
}

function rescaleContext(oldAuth, newAuth) {
  if (!S.ctx) return;
  S.ctx.wrap.scale.setScalar(FT[S.ctx.fileUnits] / FT[newAuth]);
  S.ctx.outer.position.multiplyScalar(FT[oldAuth] / FT[newAuth]);
  toast('Your tool changed units, so the context model was rescaled to match.', 4000);
}

function placeContext(obj, fname) {
  const fileUnits = $('importUnits').value;
  const up = $('importUp').value;
  const wrap = new THREE.Group();
  wrap.add(obj);
  if (up === 'z') wrap.rotation.x = -Math.PI / 2; // file Z-up -> viewer Y-up
  const s = FT[fileUnits] / FT[S.authUnits];
  wrap.scale.setScalar(s);
  const mat = new THREE.MeshStandardMaterial({ color: '#c9c6bd', roughness: 0.95, side: THREE.DoubleSide });
  let meshes = 0;
  obj.traverse((o) => {
    if (o.isMesh) {
      meshes++;
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose && m.dispose());
      o.material = mat;
      o.castShadow = true; o.receiveShadow = true;
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    } else if (o.isLine || o.isPoints) {
      o.visible = false; // curves and points from Rhino are not useful as context
    }
  });
  if (!meshes) throw new Error('No surfaces found in that file. In Rhino, export meshes or polysurfaces, not just curves. Your previous context model was kept.');
  disposeTree(ctxGroup); // only now replace the old context
  ctxGroup.clear();
  const outer = new THREE.Group();
  outer.add(wrap);
  const b = new THREE.Box3().setFromObject(outer);
  const c = b.getCenter(new THREE.Vector3());
  outer.position.set(
    $('importCenter').checked ? -c.x : 0,
    $('importHeight').value === 'drop' ? -b.min.y : 0,
    $('importCenter').checked ? -c.z : 0,
  );
  ctxGroup.add(outer);
  ctxGroup.visible = true;
  S.ctx = { wrap, outer, fileUnits };
  const size = b.getSize(new THREE.Vector3());
  const tris = countTriangles(ctxGroup);
  S.ctxName = fname;
  $('ctxInfo').textContent = `${fname}: ${fmtLen(size.x)} × ${fmtLen(size.z)} × ${fmtLen(size.y)} tall, ${fmtNum(tris)} triangles.`;
  $('ctxShowChk').disabled = false; $('ctxShowChk').checked = true;
  $('ctxClearBtn').disabled = false;
  if (tris > 1500000) toast('That model is heavy and may feel slow. A simplified export from Rhino works better.', 6000);
  else toast(`Imported ${fname}`);
  updateGrid(true); updateSun(); fit();
}
$('ctxShowChk').onchange = () => { ctxGroup.visible = $('ctxShowChk').checked; updateSun(); requestRender(); };
$('ctxClearBtn').onclick = () => {
  disposeTree(ctxGroup); ctxGroup.clear();
  $('ctxInfo').textContent = '';
  $('ctxShowChk').disabled = true; $('ctxClearBtn').disabled = true;
  updateGrid(true); updateSun(); requestRender();
};

// ---------- export ----------
// Bakes every visible mesh in the design into world positions, converted to Z-up and scaled.
// Handles instanced meshes and mirrored parts (flips triangle order so faces point outward).
function collectParts(scale) {
  modelGroup.updateMatrixWorld(true);
  const exportM = new THREE.Matrix4().makeRotationX(Math.PI / 2); // Y-up -> Z-up
  exportM.premultiply(new THREE.Matrix4().makeScale(scale, scale, scale));
  const parts = [];
  let skipped = 0;
  const v = new THREE.Vector3();
  const im = new THREE.Matrix4();
  modelGroup.traverseVisible((o) => {
    if (o.isLine || o.isPoints || o.isSprite) { skipped++; return; }
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index;
    const copies = o.isInstancedMesh ? o.count : 1;
    for (let c = 0; c < copies; c++) {
      const M = new THREE.Matrix4().copy(o.matrixWorld);
      if (o.isInstancedMesh) { o.getMatrixAt(c, im); M.multiply(im); }
      M.premultiply(exportM);
      const flip = M.determinant() < 0;
      const verts = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(M);
        verts[i * 3] = v.x; verts[i * 3 + 1] = v.y; verts[i * 3 + 2] = v.z;
      }
      let tris;
      if (idx) tris = Uint32Array.from(idx.array.slice(0, idx.count));
      else { tris = new Uint32Array(pos.count - (pos.count % 3)); for (let i = 0; i < tris.length; i++) tris[i] = i; }
      if (flip) for (let i = 0; i < tris.length; i += 3) { const t = tris[i + 1]; tris[i + 1] = tris[i + 2]; tris[i + 2] = t; }
      // Thinnest dimension measured along the part's own axes, so rotated fins and louvers are judged correctly.
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const ls = o.geometry.boundingBox.getSize(new THREE.Vector3());
      const sc = new THREE.Vector3();
      M.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
      const ms = Math.min(Math.abs(sc.x), Math.abs(sc.y), Math.abs(sc.z));
      // kit shapes know their own thickness (a curved sweep's box would be misleading); others use their box.
      const minThick = (typeof o.userData.minThick === 'number')
        ? o.userData.minThick * ms
        : Math.min(ls.x * Math.abs(sc.x), ls.y * Math.abs(sc.y), ls.z * Math.abs(sc.z));
      parts.push({ name: (o.name || `part_${parts.length + 1}`).replace(/\s+/g, '_'), verts, tris, minThick });
    }
  });
  return { parts, skipped };
}

function partsBox(parts) {
  const b = new THREE.Box3();
  const v = new THREE.Vector3();
  for (const p of parts) for (let i = 0; i < p.verts.length; i += 3) b.expandByPoint(v.set(p.verts[i], p.verts[i + 1], p.verts[i + 2]));
  return b;
}

function stlBlob(parts) {
  let n = 0;
  for (const p of parts) n += p.tris.length / 3;
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
  const header = 'Generator Starter STL. Units: millimeters. Z up.';
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < header.length ? header.charCodeAt(i) : 32);
  let off = 84, written = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nrm = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (const p of parts) {
    for (let t = 0; t < p.tris.length; t += 3) {
      a.fromArray(p.verts, p.tris[t] * 3); b.fromArray(p.verts, p.tris[t + 1] * 3); c.fromArray(p.verts, p.tris[t + 2] * 3);
      nrm.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
      if (nrm.lengthSq() === 0) continue; // skip degenerate slivers
      nrm.normalize();
      for (const val of [nrm.x, nrm.y, nrm.z, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z]) { dv.setFloat32(off, val, true); off += 4; }
      dv.setUint16(off, 0, true); off += 2;
      written++;
    }
  }
  dv.setUint32(80, written, true);
  return new Blob([buf.slice(0, 84 + written * 50)], { type: 'model/stl' });
}

function objBlob(parts, unitName) {
  const out = [`# Generator Starter OBJ export`, `# Units: ${unitName}. Z up.`, `# Tool: ${$('toolName').textContent}`];
  let base = 1;
  for (const p of parts) {
    out.push(`o ${p.name}`);
    for (let i = 0; i < p.verts.length; i += 3) out.push(`v ${+p.verts[i].toFixed(6)} ${+p.verts[i + 1].toFixed(6)} ${+p.verts[i + 2].toFixed(6)}`);
    for (let t = 0; t < p.tris.length; t += 3) out.push(`f ${p.tris[t] + base} ${p.tris[t + 1] + base} ${p.tris[t + 2] + base}`);
    base += p.verts.length / 3;
  }
  return new Blob([out.join('\n') + '\n'], { type: 'text/plain' });
}

function slug() {
  return ($('toolName').textContent || 'generator').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'generator';
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function mmPerAuth() { return FT[S.authUnits] * 304.8; }

function updateStlInfo() {
  const ratio = Number($('stlScale').value);
  const { parts, skipped } = collectParts(mmPerAuth() / ratio);
  const warn = $('stlWarn');
  warn.innerHTML = '';
  const addW = (t) => { const li = document.createElement('li'); li.textContent = t; warn.appendChild(li); };
  if (!parts.length) { $('stlInfo').textContent = 'Nothing to export.'; return; }
  const s = partsBox(parts).getSize(new THREE.Vector3());
  $('stlInfo').innerHTML = `Print size: <b>${s.x.toFixed(1)} × ${s.y.toFixed(1)} × ${s.z.toFixed(1)} mm</b> (${(s.x / 25.4).toFixed(2)} × ${(s.y / 25.4).toFixed(2)} × ${(s.z / 25.4).toFixed(2)} in), ${parts.length} part${parts.length === 1 ? '' : 's'}.`;
  if (Math.max(s.x, s.y, s.z) > 250) addW('Bigger than many printer beds (about 250 mm). Check with the Fab Lab, or pick a smaller scale.');
  if (Math.max(s.x, s.y, s.z) < 15) addW('Very small. Details this size will disappear when printed.');
  const thinParts = parts.filter((p) => p.minThick < 1);
  if (thinParts.length) {
    const thinnest = Math.min(...thinParts.map((p) => p.minThick));
    addW(`${thinParts.length} of ${parts.length} parts are thinner than 1 mm at this scale (thinnest ${thinnest.toFixed(2)} mm) and may not print. Try a larger scale, or ask your agent for a minimum thickness rule.`);
  }
  if (skipped) addW(`${skipped} line or point object${skipped === 1 ? '' : 's'} can't be printed and will be left out.`);
}

$('stlBtn').onclick = () => {
  if (!S.hasModel) { toast('Nothing to export yet.'); return; }
  const ps = Number(S.mod && S.mod.meta && S.mod.meta.printScale);
  if (ps > 0 && ![...$('stlScale').options].some((o) => Number(o.value) === ps)) {
    $('stlScale').add(new Option(`1:${ps} (your tool's print scale)`, String(ps)));
  }
  // A scale the student picked is remembered, unless the tool's own printScale has changed since.
  const remembered = load('stlScale2', null);
  const fallback = ps > 0 ? String(ps) : (S.authUnits === 'feet' ? '96' : '100');
  $('stlScale').value = (remembered && remembered.forPs === (ps || 0)) ? remembered.scale : fallback;
  if (!$('stlScale').value) $('stlScale').value = S.authUnits === 'feet' ? '96' : '100';
  updateStlInfo();
  $('stlDlg').returnValue = '';
  $('stlDlg').showModal();
};
$('stlScale').onchange = () => updateStlInfo();
$('stlDlg').addEventListener('close', () => {
  if ($('stlDlg').returnValue !== 'ok') return;
  const ratio = Number($('stlScale').value);
  store('stlScale2', { scale: String(ratio), forPs: Number((S.mod && S.mod.meta && S.mod.meta.printScale) || 0) });
  const { parts } = collectParts(mmPerAuth() / ratio);
  if (!parts.length) { toast('Nothing to export.'); return; }
  download(stlBlob(parts), `${slug()}_1-${ratio}.stl`);
  toast('STL downloaded.');
});

$('objBtn').onclick = () => {
  if (!S.hasModel) { toast('Nothing to export yet.'); return; }
  $('objUnits').value = S.authUnits;
  $('objDlg').returnValue = '';
  $('objDlg').showModal();
};
$('objDlg').addEventListener('close', () => {
  if ($('objDlg').returnValue !== 'ok') return;
  const u = $('objUnits').value;
  const { parts } = collectParts(FT[S.authUnits] / FT[u]);
  if (!parts.length) { toast('Nothing to export.'); return; }
  download(objBlob(parts, u), `${slug()}_${u}.obj`);
  toast('OBJ downloaded.');
});

$('shotBtn').onclick = () => {
  renderer.render(scene, camera);
  renderer.domElement.toBlob((b) => download(b, `${slug()}_${S.view}.png`), 'image/png');
};

// ---------- wiring ----------
document.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => setView(b.dataset.view); });
$('fitBtn').onclick = () => fit();
$('figureChk').onchange = () => { figureGroup.visible = $('figureChk').checked; requestRender(); };
$('cutChk').onchange = updateCut;
$('cutRange').oninput = updateCut;
$('saveVarBtn').onclick = saveVariation;
$('sheetBtn').onclick = downloadSheet;
$('resetBtn').onclick = () => {
  const next = {};
  for (const [k, def] of Object.entries(S.defs)) next[k] = coerce(def, def.value);
  S.values = next; S.activeVar = null;
  buildGUI(); regenerate(); renderVariations();
};
$('copySettingsBtn').onclick = () => {
  const lines = Object.entries(S.values).map(([k, v]) => `${S.defs[k]?.label || k}: ${describeValue(k, v)}`);
  copyText(`${$('toolName').textContent} settings\n${lines.join('\n')}\n\nRaw values (${S.authUnits}): ${JSON.stringify(S.values)}`, 'Settings copied.');
};
document.querySelectorAll('[data-units]').forEach((b) => {
  b.classList.toggle('on', b.dataset.units === S.dispUnits);
  b.onclick = () => {
    S.dispUnits = b.dataset.units;
    S.dispUnitsChosen = true;
    store('units', S.dispUnits);
    document.querySelectorAll('[data-units]').forEach((x) => x.classList.toggle('on', x === b));
    buildGUI();
    if (S.hasModel) { updateStats(Object.freeze({ ...S.values })); updateGrid(true); updateCut(); }
    if (S.ctxName) {
      const bb = new THREE.Box3().setFromObject(ctxGroup).getSize(new THREE.Vector3());
      $('ctxInfo').textContent = `${S.ctxName}: ${fmtLen(bb.x)} × ${fmtLen(bb.z)} × ${fmtLen(bb.y)} tall, ${fmtNum(countTriangles(ctxGroup))} triangles.`;
    }
    renderVariations();
    requestRender();
  };
});

// ---------- start ----------
(async function start() {
  S.variations = load('variations', []);
  if (!Array.isArray(S.variations)) S.variations = [];
  // Drop anything in storage that isn't a proper saved variation.
  S.variations = S.variations.filter((v) => v && typeof v === 'object' && typeof v.n === 'number'
    && v.values && typeof v.values === 'object' && typeof v.img === 'string' && v.img.startsWith('data:image/'))
    .map((v) => ({ ...v, name: `V${v.n}` }));
  try { renderVariations(); } catch (e) { console.error(e); }
  applyVisitorMode();
  resize();
  loop();
  try {
    try { S.lastText = await fetchGeneratorText(); } catch (e) { showError('Could not find generator.js:', e); return; }
    await loadGenerator();
    await loadFeatured();
  } finally {
    startLiveReload(); // even if the first load failed, a fixed file reloads by itself
  }
  window.__generator = { S, scene, modelGroup, ctxGroup, refGroup, regenerate, collectParts, stlBlob, objBlob, fit }; // handy for testing
})();
