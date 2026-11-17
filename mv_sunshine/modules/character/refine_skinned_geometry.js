import * as THREE from 'three';

// Add samples along long hair triangles so their interiors also follow the garment.
// Midpoints retain UVs and blended bone influences; integer bone indices are never averaged.
export function refineSkinnedGeometry(geometry, maxEdge, maxPasses = 4) {
  const attributes = Object.fromEntries(Object.entries(geometry.attributes).map(([name, attr]) => [name, {
    size: attr.itemSize, normalized: attr.normalized, Type: attr.array.constructor, values: Array.from(attr.array),
  }]));
  let faces = Array.from(geometry.index.array);
  const p = attributes.position.values, limit = maxEdge * maxEdge;
  for (let pass = 0; pass < maxPasses; pass++) {
    const midpoints = new Map(), next = [];
    let changes = 0;
    const midpoint = (a, b) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (midpoints.has(key)) return midpoints.get(key);
      const id = p.length / 3;
      for (const [name, attr] of Object.entries(attributes)) {
        if (name === 'skinIndex' || name === 'skinWeight') continue;
        for (let k = 0; k < attr.size; k++) attr.values.push((attr.values[a * attr.size + k] + attr.values[b * attr.size + k]) / 2);
      }
      const influences = new Map(), si = attributes.skinIndex.values, sw = attributes.skinWeight.values;
      for (const source of [a, b]) for (let k = 0; k < 4; k++) {
        const bone = si[source * 4 + k];
        influences.set(bone, (influences.get(bone) || 0) + sw[source * 4 + k] * 0.5);
      }
      const chosen = [...influences].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const total = chosen.reduce((sum, entry) => sum + entry[1], 0);
      for (let k = 0; k < 4; k++) { si.push(chosen[k]?.[0] || 0); sw.push((chosen[k]?.[1] || 0) / total); }
      midpoints.set(key, id);
      return id;
    };
    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i], b = faces[i + 1], c = faces[i + 2];
      let longest = 0;
      for (const [v, w] of [[a, b], [b, c], [c, a]]) {
        const d = (p[v * 3] - p[w * 3]) ** 2 + (p[v * 3 + 1] - p[w * 3 + 1]) ** 2 + (p[v * 3 + 2] - p[w * 3 + 2]) ** 2;
        longest = Math.max(longest, d);
      }
      if (longest <= limit) { next.push(a, b, c); continue; }
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
      changes++;
    }
    faces = next;
    if (!changes) break;
  }
  const refined = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(attributes)) {
    refined.setAttribute(name, new THREE.BufferAttribute(new attr.Type(attr.values), attr.size, attr.normalized));
  }
  refined.setIndex(faces);
  refined.normalizeNormals();
  return refined;
}
