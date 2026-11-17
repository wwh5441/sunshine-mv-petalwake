import * as THREE from 'three';
import { SUPPORT_AREAS } from '../../data/stage_layout.js';

// Read the original town's real horizontal faces, including its curved balconies.
export class FloorSupport {
  constructor(town, sets) {
    this.areas = Object.fromEntries(Object.entries(SUPPORT_AREAS).map(([key, config]) => [key, { ...config, triangles: [] }]));
    town.group.updateMatrixWorld(true);
    const vertex = new THREE.Vector3();
    town.group.traverse(mesh => {
      if (!mesh.isMesh || !mesh.geometry.index) return;
      const p = mesh.geometry.attributes.position, indices = mesh.geometry.index.array;
      const positions = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) vertex.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).toArray(positions, i * 3);
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
        const areaXZ = (positions[b] - positions[a]) * (positions[c + 2] - positions[a + 2]) - (positions[b + 2] - positions[a + 2]) * (positions[c] - positions[a]);
        if (Math.abs(areaXZ) < 1e-4) continue;
        for (const area of Object.values(this.areas)) {
          if ([a, b, c].some(k => Math.abs(positions[k + 1] - area.level) > 0.065)) continue;
          if ([a, b, c].every(k => Math.abs(positions[k] - area.center[0]) > area.radius || Math.abs(positions[k + 2] - area.center[1]) > area.radius)) continue;
          area.triangles.push([positions[a], positions[a + 1], positions[a + 2], positions[b], positions[b + 1], positions[b + 2], positions[c], positions[c + 1], positions[c + 2]]);
        }
      }
    });
    // Oversized rectangular shadow planes used to extend beyond the real balcony.
    sets.group.traverse(mesh => { if (mesh.material?.isShadowMaterial) mesh.visible = false; });
    for (const [name, area] of Object.entries(this.areas)) {
      const geometry = new THREE.BufferGeometry();
      const points = new Float32Array(area.triangles.flat());
      for (let i = 1; i < points.length; i += 3) points[i] += 0.003;
      geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
      geometry.computeVertexNormals();
      const shadow = new THREE.Mesh(geometry, new THREE.ShadowMaterial({ opacity: 0.30, color: 0x22150a, side: THREE.DoubleSide }));
      shadow.name = `SupportedShadow:${name}`; shadow.receiveShadow = true;
      sets.group.add(shadow);
    }
  }

  heightAt(areaName, x, z) {
    let height = null;
    for (const p of this.areas[areaName].triangles) {
      const den = (p[5] - p[8]) * (p[0] - p[6]) + (p[6] - p[3]) * (p[2] - p[8]);
      const u = ((p[5] - p[8]) * (x - p[6]) + (p[6] - p[3]) * (z - p[8])) / den;
      const v = ((p[8] - p[2]) * (x - p[6]) + (p[0] - p[6]) * (z - p[8])) / den;
      if (u < -1e-6 || v < -1e-6 || u + v > 1.000001) continue;
      const y = u * p[1] + v * p[4] + (1 - u - v) * p[7];
      height = height === null ? y : Math.max(height, y);
    }
    return height;
  }
}
