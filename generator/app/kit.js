// kit.js: small, safe building blocks your generator can use.
// You do not need to edit this file. Your agent can use these, or plain three.js (kit.THREE).
//
// Conventions (same everywhere):
//   - Numbers are in your generator's units (meta.units, feet by default).
//   - Y is up. The ground is y = 0. The center of the grid is x = 0, z = 0.
//   - Front of the view is +z. Plan view looks down from above with -z at the top.
//   - Angles are in degrees.
//   - box / cylinder / beam / extrude sit ON their y value (their bottom is at y).
//     sphere is centered on its x, y, z.

import * as THREE from 'three';

export { THREE };

const DEG = Math.PI / 180;

function fail(fn, msg) {
  throw new Error(`kit.${fn}: ${msg}`);
}

function num(fn, name, v, { positive = false, fallback } = {}) {
  if (v === undefined && fallback !== undefined) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(fn, `"${name}" must be a number, got ${JSON.stringify(v)}`);
  if (positive && v <= 0) fail(fn, `"${name}" must be bigger than 0, got ${v}`);
  return v;
}

/** A plain, matte material. color can be '#rrggbb' or a color name. */
export function material(color = '#d8d3c7', { opacity = 1, roughness = 0.85, metalness = 0 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent: opacity < 1,
    opacity,
  });
}

// The material a shape gets: o.material if it is a real material, otherwise one made from o.color.
function pickMaterial(fn, o) {
  const m = o.material;
  if (m === undefined || m === null) return material(o.color);
  if (typeof m === 'string') return material(m); // material: '#9c7a54' is read as a color
  const ok = (x) => x && x.isMaterial === true;
  if (ok(m) || (Array.isArray(m) && m.length && m.every(ok))) return m;
  fail(fn, '"material" must be made with kit.material(color) or be a three.js material. To just set a color, use color: \'#rrggbb\'.');
}

function finish(fn, geometry, o, minThick) {
  const mesh = new THREE.Mesh(geometry, pickMaterial(fn, o));
  if (minThick !== undefined) mesh.userData.minThick = minThick; // used by the STL thin-part check
  mesh.position.set(
    num(fn, 'x', o.x, { fallback: 0 }),
    num(fn, 'y', o.y, { fallback: 0 }),
    num(fn, 'z', o.z, { fallback: 0 }),
  );
  mesh.rotation.set(
    num(fn, 'rx', o.rx, { fallback: 0 }) * DEG,
    num(fn, 'ry', o.ry, { fallback: 0 }) * DEG,
    num(fn, 'rz', o.rz, { fallback: 0 }) * DEG,
    'YXZ',
  );
  if (o.name) mesh.name = String(o.name);
  return mesh;
}

/**
 * A box. w = width along x, d = depth along z, h = height along y.
 * It sits on y and rotates around its bottom center.
 * kit.box({ w: 6, d: 1.5, h: 0.125, x: 0, y: 1.4, z: 0, ry: 0, color: '#9c7a54', name: 'seat' })
 */
export function box(o = {}) {
  const w = num('box', 'w', o.w, { positive: true });
  const d = num('box', 'd', o.d, { positive: true });
  const h = num('box', 'h', o.h, { positive: true });
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return finish('box', g, o, Math.min(w, d, h));
}

/**
 * A vertical cylinder (or a cone if rTop is different). It sits on y.
 * kit.cylinder({ r: 0.25, h: 3, x: 1, z: 2, segments: 32 })
 */
export function cylinder(o = {}) {
  const r = num('cylinder', 'r', o.r, { positive: true });
  const rTop = num('cylinder', 'rTop', o.rTop, { fallback: r });
  if (rTop < 0) fail('cylinder', '"rTop" cannot be negative');
  const h = num('cylinder', 'h', o.h, { positive: true });
  const seg = Math.max(3, Math.round(num('cylinder', 'segments', o.segments, { fallback: 32 })));
  const g = new THREE.CylinderGeometry(rTop, r, h, seg, 1, false);
  g.translate(0, h / 2, 0);
  return finish('cylinder', g, o, Math.min(2 * Math.max(r, rTop), h));
}

/** A sphere centered on x, y, z. */
export function sphere(o = {}) {
  const r = num('sphere', 'r', o.r, { positive: true });
  const seg = Math.max(8, Math.round(num('sphere', 'segments', o.segments, { fallback: 32 })));
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg / 2)));
  return finish('sphere', g, o, 2 * r);
}

/**
 * A straight member between two points: a column, a rib, a strut, a cable.
 * from/to are [x, y, z]. Round (r) or square (size).
 * kit.beam({ from: [0, 0, 0], to: [4, 3, 0], r: 0.1 })
 * kit.beam({ from: [0, 3, 0], to: [8, 3, 0], size: 0.3 })
 */
export function beam(o = {}) {
  const a = o.from, b = o.to;
  if (!Array.isArray(a) || a.length !== 3 || !Array.isArray(b) || b.length !== 3) {
    fail('beam', '"from" and "to" must each be [x, y, z]');
  }
  const A = new THREE.Vector3(num('beam', 'from[0]', a[0]), num('beam', 'from[1]', a[1]), num('beam', 'from[2]', a[2]));
  const B = new THREE.Vector3(num('beam', 'to[0]', b[0]), num('beam', 'to[1]', b[1]), num('beam', 'to[2]', b[2]));
  const len = A.distanceTo(B);
  if (len <= 1e-9) fail('beam', '"from" and "to" are the same point');
  let g, thick;
  if (o.size !== undefined) {
    const s = num('beam', 'size', o.size, { positive: true });
    g = new THREE.BoxGeometry(s, len, s);
    thick = s;
  } else {
    const r = num('beam', 'r', o.r, { positive: true });
    const seg = Math.max(3, Math.round(num('beam', 'segments', o.segments, { fallback: 16 })));
    g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
    thick = 2 * r;
  }
  const mesh = new THREE.Mesh(g, pickMaterial('beam', o));
  mesh.userData.minThick = thick;
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  // Orient it so a square beam keeps one face level (no diamond-shaped joists).
  const dir = B.clone().sub(A).normalize();
  let side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir);
  if (side.lengthSq() < 1e-10) side.set(1, 0, 0); else side.normalize();
  const third = new THREE.Vector3().crossVectors(side, dir).normalize();
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, dir, third));
  if (o.name) mesh.name = String(o.name);
  return mesh;
}

/**
 * A plan shape pushed straight up: a floor plate, a wall in plan, a planter, a tower footprint.
 * points are [x, z] pairs in plan (at least 3). h is the height. It sits on y.
 * holes (optional) is a list of point lists cut out of the shape.
 * kit.extrude({ points: [[-10,-5],[10,-5],[10,5],[-10,5]], h: 12, y: 0 })
 */
export function extrude(o = {}) {
  const pts = o.points;
  if (!Array.isArray(pts) || pts.length < 3) fail('extrude', '"points" needs at least 3 [x, z] pairs');
  const h = num('extrude', 'h', o.h, { positive: true });
  // Shape lives in x/y; after the rotation below, shape y becomes -z in the world.
  const toVecs = (list, label) => list.map((p, i) => {
    if (!Array.isArray(p) || p.length !== 2) fail('extrude', `${label}[${i}] must be [x, z]`);
    return new THREE.Vector2(num('extrude', `${label}[${i}][0]`, p[0]), -num('extrude', `${label}[${i}][1]`, p[1]));
  });
  // three.js only fixes hole direction in some cases, so set it ourselves:
  // outline clockwise, holes counter-clockwise. Otherwise holes export inside-out.
  let outer = toVecs(pts, 'points');
  if (Math.abs(THREE.ShapeUtils.area(outer)) < 1e-12) fail('extrude', 'the points have no area (are they all in a line?)');
  if (!THREE.ShapeUtils.isClockWise(outer)) outer = outer.reverse();
  const shape = new THREE.Shape(outer);
  (o.holes || []).forEach((hole, k) => {
    if (!Array.isArray(hole) || hole.length < 3) fail('extrude', `holes[${k}] needs at least 3 [x, z] pairs`);
    let hv = toVecs(hole, `holes[${k}]`);
    if (THREE.ShapeUtils.isClockWise(hv)) hv = hv.reverse();
    shape.holes.push(new THREE.Path(hv));
  });
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  return finish('extrude', g, o); // plan thickness varies, so the STL check measures it
}

/**
 * A curved (or straight) solid that follows a path: arches, sagging louvers, twisted ribs, handrails, rings.
 * path: list of [x, y, z] points (at least 2). The shape passes through them.
 * profile: { w, h } for a rectangle (w is sideways, h is up/down where possible) or { r } for a round section.
 * smooth: true (default) makes a smooth curve through the points; false keeps straight segments.
 * closed: true joins the end back to the start (a ring). steps: how finely to divide it (default 48).
 * Keep bends wider than the profile: a curve tighter than the section folds over itself and won't print.
 * kit.sweep({ path: [[-10, 14, 0], [0, 13, 0], [10, 14, 0]], profile: { w: 0.33, h: 0.67 } })
 */
export function sweep(o = {}) {
  const path = o.path;
  if (!Array.isArray(path) || path.length < 2) fail('sweep', '"path" needs at least 2 [x, y, z] points');
  const pts = path.map((p, i) => {
    if (!Array.isArray(p) || p.length !== 3) fail('sweep', `path[${i}] must be [x, y, z]`);
    return new THREE.Vector3(num('sweep', `path[${i}][0]`, p[0]), num('sweep', `path[${i}][1]`, p[1]), num('sweep', `path[${i}][2]`, p[2]));
  });
  const prof = o.profile || {};
  const round = prof.r !== undefined;
  const r = round ? num('sweep', 'profile.r', prof.r, { positive: true }) : 0;
  const w = round ? 0 : num('sweep', 'profile.w', prof.w, { positive: true });
  const h = round ? 0 : num('sweep', 'profile.h', prof.h, { positive: true });
  const closed = !!o.closed;
  if (closed && pts.length < 3) fail('sweep', 'a closed path needs at least 3 points');
  const smooth = o.smooth !== false;
  const steps = Math.max(2, Math.round(num('sweep', 'steps', o.steps, { fallback: 48 })));

  // Points along the path
  let samples;
  if (smooth && pts.length > 2) {
    const curve = new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
    samples = curve.getSpacedPoints(steps);
    if (closed) samples.pop();
  } else {
    samples = pts.slice();
    if (closed && samples[0].distanceTo(samples[samples.length - 1]) < 1e-9) samples.pop();
  }
  // drop repeated points
  samples = samples.filter((p, i, a) => i === 0 || p.distanceTo(a[i - 1]) > 1e-9);
  const n = samples.length;
  if (n < 2) fail('sweep', 'the path has no length');

  // Tangents
  const tan = samples.map((p, i) => {
    const prev = samples[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = samples[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    if (!(smooth && pts.length > 2) && prev !== p && next !== p) {
      // straight segments: the section at a corner sits on the bisector of the two legs
      const t = next.clone().sub(p).normalize().add(p.clone().sub(prev).normalize());
      if (t.lengthSq() > 1e-12) return t.normalize();
    }
    return next.clone().sub(prev).normalize();
  });
  // Frames carried along the path without twisting (parallel transport).
  // Start with "up" as close to world up as possible.
  const up0 = Math.abs(tan[0].y) > 0.99 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  let side = new THREE.Vector3().crossVectors(up0, tan[0]).normalize();
  let upv = new THREE.Vector3().crossVectors(tan[0], side).normalize();
  const sides = [side.clone()], ups = [upv.clone()];
  for (let i = 1; i < n; i++) {
    const q = new THREE.Quaternion().setFromUnitVectors(tan[i - 1], tan[i]);
    side = side.clone().applyQuaternion(q).normalize();
    upv = new THREE.Vector3().crossVectors(tan[i], side).normalize();
    side = new THREE.Vector3().crossVectors(upv, tan[i]).normalize();
    sides.push(side.clone()); ups.push(upv.clone());
  }
  // A closed ring must end in the same frame it started in, or the last piece twists.
  // Spread the leftover twist evenly around the ring.
  if (closed && n > 2) {
    const q = new THREE.Quaternion().setFromUnitVectors(tan[n - 1], tan[0]);
    const sEnd = sides[n - 1].clone().applyQuaternion(q);
    sEnd.addScaledVector(tan[0], -sEnd.dot(tan[0])).normalize();
    const ang = Math.atan2(new THREE.Vector3().crossVectors(sides[0], sEnd).dot(tan[0]), sides[0].dot(sEnd));
    for (let i = 1; i < n; i++) {
      const fix = new THREE.Quaternion().setFromAxisAngle(tan[i], -ang * i / n);
      sides[i].applyQuaternion(fix).normalize();
      ups[i].applyQuaternion(fix).normalize();
    }
  }

  // Cross-section outline (counter-clockwise in side/up coordinates)
  const seg = round ? Math.max(6, Math.round(num('sweep', 'segments', o.segments, { fallback: 16 }))) : 4;
  const outline = round
    ? Array.from({ length: seg }, (_, k) => [Math.cos((k / seg) * Math.PI * 2) * r, Math.sin((k / seg) * Math.PI * 2) * r])
    : [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];

  // At the sharp corners of a straight-segment path, stretch the section so each leg keeps its full width.
  const miter = samples.map((p, i) => {
    if (smooth && pts.length > 2) return null;
    if (!closed && (i === 0 || i === n - 1)) return null;
    const d1 = p.clone().sub(samples[(i - 1 + n) % n]).normalize();
    const d2 = samples[(i + 1) % n].clone().sub(p).normalize();
    const cosHalf = Math.sqrt(Math.max(0, (1 + d1.dot(d2)) / 2));
    const m = d2.clone().sub(d1);
    if (m.lengthSq() < 1e-12) return null;
    return { m: m.normalize(), k: 1 / Math.max(cosHalf, 0.25) - 1 };
  });
  const pos = [];
  const off = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    for (const [a, b] of outline) {
      off.set(0, 0, 0).addScaledVector(sides[i], a).addScaledVector(ups[i], b);
      if (miter[i]) off.addScaledVector(miter[i].m, off.dot(miter[i].m) * miter[i].k);
      const v = samples[i].clone().add(off);
      pos.push(v.x, v.y, v.z);
    }
  }
  const idx = [];
  const ringCount = closed ? n : n - 1;
  for (let i = 0; i < ringCount; i++) {
    const i2 = (i + 1) % n;
    for (let k = 0; k < seg; k++) {
      const k2 = (k + 1) % seg;
      const a = i * seg + k, b = i * seg + k2, c = i2 * seg + k2, d = i2 * seg + k;
      idx.push(a, b, c, a, c, d);
    }
  }
  if (!closed) {
    // end caps: fan around a center point
    const startC = pos.length / 3; pos.push(samples[0].x, samples[0].y, samples[0].z);
    const endC = pos.length / 3; pos.push(samples[n - 1].x, samples[n - 1].y, samples[n - 1].z);
    for (let k = 0; k < seg; k++) {
      const k2 = (k + 1) % seg;
      idx.push(startC, k2, k);
      idx.push(endC, (n - 1) * seg + k, (n - 1) * seg + k2);
    }
  }
  // Make sure faces point outward (positive volume); flip if not.
  let vol = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
         - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
         + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  if (vol < 0) for (let t = 0; t < idx.length; t += 3) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }

  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  if (!round) { g = g.toNonIndexed(); } // crisp edges for rectangular sections
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, pickMaterial('sweep', o));
  mesh.userData.minThick = round ? 2 * r : Math.min(w, h);
  if (o.name) mesh.name = String(o.name);
  return mesh;
}

/**
 * Reference geometry: shown faint, never exported, not counted in the Model numbers.
 * Use it for the room, the site boundary, a neighbor, a person. Pass shapes or a list.
 * kit.reference(kit.box({ w: 30, d: 40, h: 14 }))
 */
export function reference(...items) {
  const g = new THREE.Group();
  g.userData.reference = true;
  const mat = new THREE.MeshStandardMaterial({ color: '#9aa3ad', transparent: true, opacity: 0.25, depthWrite: false });
  items.flat(Infinity).forEach((it) => {
    if (!it) return;
    it.traverse((o) => {
      if (o.isMesh) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && m.dispose());
        o.material = mat;
      }
    });
    g.add(it);
  });
  return g;
}

/** Put several parts in one group (to move or rotate them together). */
export function group(...children) {
  const g = new THREE.Group();
  children.flat(Infinity).forEach((c) => { if (c) g.add(c); });
  return g;
}

/** Degrees to radians, for when you use three.js directly. */
export const deg = (d) => d * DEG;

/** Feet and inches to feet. kit.ft(5, 9) is 5.75. Only useful when meta.units is 'feet'. */
export const ft = (feet, inches = 0) => feet + inches / 12;

/** Inches to feet. kit.inch(18) is 1.5. Only useful when meta.units is 'feet'. */
export const inch = (inches) => inches / 12;

/** Blend from a to b. t = 0 gives a, t = 1 gives b. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Keep v between lo and hi. */
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Repeatable randomness. The same seed always gives the same numbers,
 * so a saved variation comes back exactly the same.
 * const rand = kit.random(p.seed); rand() gives a number from 0 to 1.
 */
export function random(seed = 1) {
  let a = (Math.floor(Number(seed) || 0) >>> 0) ^ 0x9e3779b9;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
