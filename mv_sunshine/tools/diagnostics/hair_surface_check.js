import * as THREE from 'three';
import { correctedHairPoint } from './corrected_hair_point.js';

function checkAgainstSurface(hero, surface, guardAttrName, regionFilter) {
  const c = surface.config;
  const size = 32;
  const bins = Array.from({ length: size * size }, () => []);
  const ix = (x) => Math.max(0, Math.min(size - 1, Math.floor(((x - c.minX) / (c.maxX - c.minX)) * size)));
  const iy = (y) => Math.max(0, Math.min(size - 1, Math.floor(((y - c.minY) / (c.maxY - c.minY)) * size)));

  for (const source of surface.sources) {
    const p = source.points;
    const f = source.faces;
    for (let i = 0; i < f.length; i += 3) {
      const a = f[i] * 3;
      const b = f[i + 1] * 3;
      const d = f[i + 2] * 3;
      const tri = [p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[d], p[d + 1], p[d + 2]];
      const den = (tri[4] - tri[7]) * (tri[0] - tri[6]) + (tri[6] - tri[3]) * (tri[1] - tri[7]);
      if (Math.abs(den) < 1e-10) continue;
      tri.push(den);
      for (let y = iy(Math.min(tri[1], tri[4], tri[7])); y <= iy(Math.max(tri[1], tri[4], tri[7])); y++) {
        for (let x = ix(Math.min(tri[0], tri[3], tri[6])); x <= ix(Math.max(tri[0], tri[3], tri[6])); x++) {
          bins[y * size + x].push(tri);
        }
      }
    }
  }

  const query = (x, y) => {
    let front = Infinity;
    let back = -Infinity;
    for (const t of bins[iy(y) * size + ix(x)]) {
      const u = ((t[4] - t[7]) * (x - t[6]) + (t[6] - t[3]) * (y - t[7])) / t[9];
      const v = ((t[7] - t[1]) * (x - t[6]) + (t[0] - t[6]) * (y - t[7])) / t[9];
      if (u < -1e-6 || v < -1e-6 || u + v > 1.000001) continue;
      const z = u * t[2] + v * t[5] + (1 - u - v) * t[8];
      front = Math.min(front, z);
      back = Math.max(back, z);
    }
    return [front, back];
  };

  const sampleField = (x, y) => {
    const px = ((x - c.minX) / (c.maxX - c.minX)) * c.width - 0.5;
    const py = ((y - c.minY) / (c.maxY - c.minY)) * c.height - 0.5;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const tx = px - x0;
    const ty = py - y0;
    const value = [0, 0, 0];
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const at =
          (Math.max(0, Math.min(c.height - 1, y0 + dy)) * c.width +
            Math.max(0, Math.min(c.width - 1, x0 + dx))) *
          4;
        const weight = (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty);
        for (let k = 0; k < 3; k++) value[k] += surface.pixels[at + k] * weight;
      }
    }
    return value;
  };

  const stats = {
    samples: 0,
    penetratingBefore: 0,
    penetratingAfter: 0,
    minBefore: 1,
    minAfter: 1,
    worstMesh: null,
  };

  const inspect = (before, after, side, mesh) => {
    const [x, y] = after;
    if (!regionFilter(x, y)) return;
    const [front, back] = query(x, y);
    if (!Number.isFinite(front)) return;
    const oldGap = (side < 0 ? front - before[2] : before[2] - back) * hero.scale;
    const newGap = (side < 0 ? front - after[2] : after[2] - back) * hero.scale;
    stats.samples++;
    if (oldGap < -0.001) stats.penetratingBefore++;
    if (newGap < -0.001) stats.penetratingAfter++;
    stats.minBefore = Math.min(stats.minBefore, oldGap);
    if (newGap < stats.minAfter) {
      stats.minAfter = newGap;
      stats.worstMesh = mesh;
    }
  };

  const matrix = new THREE.Matrix4();
  const v = new THREE.Vector3();
  for (const mesh of hero.hairClearance.meshes) {
    matrix.multiplyMatrices(surface.inverseWorld, mesh.matrixWorld);
    const count = mesh.geometry.attributes.position.count;
    const sides = mesh.geometry.attributes[guardAttrName]?.array;
    if (!sides) continue;
    const before = new Float64Array(count * 3);
    const after = new Float64Array(count * 3);
    for (let i = 0; i < count; i++) {
      mesh.getVertexPosition(i, v).applyMatrix4(matrix).toArray(before, i * 3);
      correctedHairPoint(hero,mesh,i,v).applyMatrix4(surface.inverseWorld);
      v.toArray(after, i * 3);
      inspect(before.subarray(i * 3, i * 3 + 3), after.subarray(i * 3, i * 3 + 3), sides[i], mesh.name);
    }
    const faces = mesh.geometry.index.array;
    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i];
      const b = faces[i + 1];
      const d = faces[i + 2];
      if (sides[a] !== sides[b] || sides[a] !== sides[d]) continue;
      const oldPoint = [];
      const newPoint = [];
      for (let k = 0; k < 3; k++) {
        oldPoint.push((before[a * 3 + k] + before[b * 3 + k] + before[d * 3 + k]) / 3);
        newPoint.push((after[a * 3 + k] + after[b * 3 + k] + after[d * 3 + k]) / 3);
      }
      inspect(oldPoint, newPoint, sides[a], mesh.name);
    }
  }
  return stats;
}

// Independently compare corrected hair triangle samples against BOTH actual torso/shoulder AND actual skirt triangles.
export function checkHairSurface(hero) {
  const torso = checkAgainstSurface(
    hero,
    hero.hairClearance.surface,
    'garmentGuard',
    (x, y) => Math.abs(x) <= 0.23 && y >= -0.16 && y <= 0.23
  );
  const skirt = checkAgainstSurface(
    hero,
    hero.hairClearance.skirtSurface,
    'skirtGuard',
    (x, y) => Math.abs(x) <= 0.38 && y >= -0.52 && y <= 0.10
  );
  return {
    samples: torso.samples + skirt.samples,
    penetratingBefore: torso.penetratingBefore + skirt.penetratingBefore,
    penetratingAfter: torso.penetratingAfter + skirt.penetratingAfter,
    minBefore: Math.min(torso.minBefore, skirt.minBefore),
    minAfter: Math.min(torso.minAfter, skirt.minAfter),
    worstMesh: torso.minAfter <= skirt.minAfter ? torso.worstMesh : skirt.worstMesh,
    torso,
    skirt,
  };
}
