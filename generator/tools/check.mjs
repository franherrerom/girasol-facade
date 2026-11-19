// tools/check.mjs: a quick self-check for agents. Students don't need to run this.
//
//   node tools/check.mjs
//
// It loads generator.js the same way the browser does, builds the model at the default
// settings and at every slider's min and max, every dropdown option and both checkbox
// states, and reports problems in plain English. It changes no files.
// Passing this check does NOT mean it works: the student still has to look at the page.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const threeURL = pathToFileURL(path.join(root, 'lib/three/three.module.js')).href;
const addonsURL = pathToFileURL(path.join(root, 'lib/three/addons/')).href;

// Resolve 'three' and 'three/addons/...' to the copies in lib/, like the page's import map.
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(spec, ctx, next) {
    if (spec === 'three') return { url: ${JSON.stringify(threeURL)}, shortCircuit: true };
    if (spec.startsWith('three/addons/')) return { url: ${JSON.stringify(addonsURL)} + spec.slice(13), shortCircuit: true };
    return next(spec, ctx);
  }
`));

const problems = [];
const notes = [];
let mod, kit, THREE;
try {
  kit = await import(pathToFileURL(path.join(root, 'app/kit.js')).href);
  THREE = kit.THREE;
} catch (e) {
  console.log('Could not load app/kit.js (the viewer files may be damaged):', e.message);
  process.exit(2);
}
try {
  mod = await import(pathToFileURL(path.join(root, 'generator.js')).href + '?t=' + Date.now());
} catch (e) {
  console.log('generator.js does not load. Fix this first:');
  console.log('  ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n  '));
  process.exit(1);
}

if (typeof mod.generate !== 'function') problems.push('generator.js must export a function called generate(p, kit).');
const meta = mod.meta || {};
if (meta.units !== undefined && meta.units !== 'feet' && meta.units !== 'meters') problems.push(`meta.units is "${meta.units}". Use 'feet' or 'meters'.`);
const defs = mod.parameters || {};

function typeOf(d) {
  if (d.type) return d.type;
  if (Array.isArray(d.options)) return 'options';
  if (typeof d.value === 'boolean') return 'boolean';
  if (typeof d.value === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(d.value)) return 'color';
  if (typeof d.value === 'string') return 'text';
  return 'number';
}
for (const [k, d] of Object.entries(defs)) {
  if (!d || typeof d !== 'object' || !('value' in d)) { problems.push(`Parameter "${k}" needs a value.`); continue; }
  const t = typeOf(d);
  if (['number', 'length', 'angle'].includes(t)) {
    if (typeof d.min !== 'number' || typeof d.max !== 'number') problems.push(`Parameter "${k}" needs min and max.`);
    else if (d.min >= d.max) problems.push(`Parameter "${k}": min must be smaller than max.`);
    else if (d.value < d.min || d.value > d.max) problems.push(`Parameter "${k}": value is outside min to max.`);
  }
  if (t === 'options' && !d.options.includes(d.value)) problems.push(`Parameter "${k}": value is not one of its options.`);
  if (!['number', 'length', 'angle', 'options', 'boolean', 'color', 'text'].includes(t)) problems.push(`Parameter "${k}": unknown type "${t}".`);
}

const defaults = Object.fromEntries(Object.entries(defs).map(([k, d]) => [k, d.value]));
const cases = [['default settings', defaults]];
for (const [k, d] of Object.entries(defs)) {
  const t = typeOf(d);
  if (['number', 'length', 'angle'].includes(t) && typeof d.min === 'number' && typeof d.max === 'number') {
    cases.push([`${k} at min (${d.min})`, { ...defaults, [k]: d.min }]);
    cases.push([`${k} at max (${d.max})`, { ...defaults, [k]: d.max }]);
  } else if (t === 'options') {
    d.options.forEach((o) => cases.push([`${k} = ${o}`, { ...defaults, [k]: o }]));
  } else if (t === 'boolean') {
    cases.push([`${k} = ${!d.value}`, { ...defaults, [k]: !d.value }]);
  }
}

let worstMs = 0, worstTris = 0;
function triangles(obj) {
  let n = 0;
  obj.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    const t = (g.index ? g.index.count : g.attributes.position.count) / 3;
    n += o.isInstancedMesh ? t * o.count : t;
  });
  return n;
}
if (typeof mod.generate === 'function') {
  for (const [label, p] of cases) {
    let out;
    const t0 = performance.now();
    try { out = mod.generate(Object.freeze({ ...p }), kit); }
    catch (e) { problems.push(`With ${label}: generate() stopped: ${e.message}`); continue; }
    const ms = performance.now() - t0;
    if (out && typeof out.then === 'function') { problems.push('generate() must not be async.'); break; }
    const list = (Array.isArray(out) ? out.flat(Infinity) : [out]).filter((x) => x !== null && x !== undefined && x !== false);
    const bad = list.find((x) => !x || !x.isObject3D);
    if (bad) { problems.push(`With ${label}: generate() returned something that is not a 3D shape.`); continue; }
    const g = new THREE.Group();
    list.forEach((x) => g.add(x));
    let real = 0;
    g.traverse((o) => { if (o.isMesh && !(o.userData && o.userData.reference)) real++; });
    if (!real) { problems.push(`With ${label}: no shapes were made.`); continue; }
    const b = new THREE.Box3().setFromObject(g, true);
    if (![b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite)) problems.push(`With ${label}: the model has broken numbers (NaN or Infinity).`);
    if (b.min.y < -0.001) notes.push(`With ${label}: part of the model is below the ground (lowest y = ${b.min.y.toFixed(3)}). Fine only if that's intended.`);
    const tris = triangles(g);
    worstMs = Math.max(worstMs, ms); worstTris = Math.max(worstTris, tris);
    if (typeof mod.check === 'function') {
      try { const w = mod.check(p); if (w && !Array.isArray(w) && typeof w !== 'string') problems.push('check() should return a list of warning strings.'); }
      catch (e) { problems.push(`With ${label}: check() stopped: ${e.message}`); }
    }
    if (typeof mod.stats === 'function') {
      try { mod.stats(p); } catch (e) { problems.push(`With ${label}: stats() stopped: ${e.message}`); }
    }
  }
}
if (worstTris > 200000) notes.push(`Up to ${Math.round(worstTris).toLocaleString()} triangles. Over 200,000 gets slow in the browser.`);
if (worstMs > 100) notes.push(`generate() took up to ${Math.round(worstMs)} ms here. Over 100 ms makes sliders feel slow.`);

console.log(`Checked ${cases.length} settings for "${meta.name || 'generator.js'}".`);
if (!problems.length) console.log('No problems found.');
else { console.log(`${problems.length} problem(s):`); problems.forEach((x) => console.log('  - ' + x)); }
notes.forEach((x) => console.log('  note: ' + x));
console.log('This is not proof it works. Ask the student to look at the page.');
process.exit(problems.length ? 1 : 0);
