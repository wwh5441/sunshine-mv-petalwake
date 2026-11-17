import * as THREE from 'three';
import { GarmentSurface } from './garment_surface.js';
import { patchClearanceMaterial } from './hair_clearance_shader.js';
import { refineSkinnedGeometry } from './refine_skinned_geometry.js';
import { HairArmSurface } from './hair_arm_surface.js';

// Correct torso, shoulder, and skirt overlap after skinning, while leaving authored springs intact.
export class HairClearance {
  constructor(vrm, config) {
    this.vrm = vrm;
    this.dirty = true;
    this.arms=new HairArmSurface(vrm,config.arms);
    this.surface = new GarmentSurface(vrm, config);
    this.skirtSurface = new GarmentSurface(vrm, config, {
      anchor: config.skirtAnchor || 'hips',
      field: config.skirtField,
      materials: [config.skirtMaterial, config.garmentMaterial],
    });
    this.meshes = [];
    const c = config.field;
    const sc = config.skirtField;
    this.uniforms = {
      ...this.arms.uniforms,
      uGarmentWorld: { value: this.surface.world },
      uGarmentInverse: { value: this.surface.inverseWorld },
      uGarmentSurface: { value: this.surface.texture },
      uGarmentBounds: { value: new THREE.Vector4(c.minX, c.minY, c.maxX - c.minX, c.maxY - c.minY) },
      uGarmentClearance: { value: c.clearance },
      uGarmentEnabled: { value: 1 },

      uSkirtWorld: { value: this.skirtSurface.world },
      uSkirtInverse: { value: this.skirtSurface.inverseWorld },
      uSkirtSurface: { value: this.skirtSurface.texture },
      uSkirtBounds: { value: new THREE.Vector4(sc.minX, sc.minY, sc.maxX - sc.minX, sc.maxY - sc.minY) },
      uSkirtClearance: { value: sc.clearance },
    };
    const patched = new Set();
    const matrixTorso = new THREE.Matrix4();
    const matrixSkirt = new THREE.Matrix4();
    const vertex = new THREE.Vector3();

    vrm.scene.traverse((mesh) => {
      if (!mesh.isSkinnedMesh || mesh.material?.name !== config.hairMaterial) return;
      mesh.geometry = refineSkinnedGeometry(mesh.geometry, config.hairMaxEdge);
      const positions = mesh.geometry.attributes.position;
      matrixTorso.multiplyMatrices(this.surface.inverseWorld, mesh.matrixWorld);
      matrixSkirt.multiplyMatrices(this.skirtSurface.inverseWorld, mesh.matrixWorld);
      const mask = new Float32Array(positions.count);
      const skirtMask = new Float32Array(positions.count);
      let reachesBody = false;

      for (let i = 0; i < positions.count; i++) {
        mesh.getVertexPosition(i, vertex);
        const pTorso = vertex.clone().applyMatrix4(matrixTorso);
        const pSkirt = vertex.clone().applyMatrix4(matrixSkirt);
        // Preserve authored front (-Z) vs back (+Z) side of torso/shoulders & skirt
        mask[i] = pTorso.z < 0 ? -1 : 1;
        skirtMask[i] = pSkirt.z < 0 ? -1 : 1;
        if (pTorso.y < c.maxY || pSkirt.y < sc.maxY) reachesBody = true;
      }
      mesh.geometry.setAttribute('garmentGuard', new THREE.BufferAttribute(mask, 1));
      mesh.geometry.setAttribute('skirtGuard', new THREE.BufferAttribute(skirtMask, 1));
      if (reachesBody) {
        this.meshes.push(mesh);
        const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
        patchClearanceMaterial(depth, this.uniforms);
        mesh.customDepthMaterial = depth;
      }
      if (!patched.has(mesh.material)) {
        patchClearanceMaterial(mesh.material, this.uniforms);
        patched.add(mesh.material);
      }
    });
  }

  update() {
    if (!this.dirty) return;
    // Refresh world matrices & skin bind matrices before sampling actual deformed garment & skirt surfaces
    this.vrm.scene.updateWorldMatrix(true, false);
    this.vrm.scene.updateMatrixWorld(true);
    this.surface.update();
    this.skirtSurface.update();
    this.arms.update();
    this.dirty = false;
  }
}
