import * as THREE from 'three';
import { SkinnedSurfaceSampler } from './skinned_surface_sampler.js';

// A directional surface of the actual skinned blouse, expressed in chest space.
// The front of this VRM is -Z in the raw chest bone's coordinates.
export class GarmentSurface {
  constructor(vrm, config, options = {}) {
    const anchorName = options.anchor || config.anchor;
    const fieldConfig = options.field || config.field;
    const materialNames = options.materials || config.garmentMaterials || [config.garmentMaterial];
    this.anchor = vrm.humanoid.getRawBoneNode(anchorName);
    this.config = fieldConfig;
    this.world = new THREE.Matrix4();
    this.inverseWorld = new THREE.Matrix4();
    this._matrix = new THREE.Matrix4();
    this._vertex = new THREE.Vector3();
    this.sources = [];
    const { width, height } = this.config;
    this._depth = new Float32Array(width * height);
    this._back = new Float32Array(width * height);
    this._coverage = new Float32Array(width * height);
    this._scratchDepth = new Float32Array(width * height);
    this._scratchBack = new Float32Array(width * height);
    this._scratchCoverage = new Float32Array(width * height);
    this.pixels = new Float32Array(width * height * 4);
    this.texture = new THREE.DataTexture(this.pixels, width, height, THREE.RGBAFormat, THREE.FloatType);
    this.texture.minFilter = this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.flipY = false;

    vrm.scene.updateWorldMatrix(true, false);
    vrm.scene.updateMatrixWorld(true);
    this.inverseWorld.copy(this.anchor.matrixWorld).invert();
    vrm.scene.traverse((mesh) => {
      if (!mesh.isSkinnedMesh || !materialNames.includes(mesh.material?.name)) return;
      this.sources.push(this._selectTorso(mesh));
    });
    this.update();
  }

  _selectTorso(mesh) {
    const c = this.config;
    const all = new Float32Array(mesh.geometry.attributes.position.count * 3);
    this._matrix.multiplyMatrices(this.inverseWorld, mesh.matrixWorld);
    for (let i = 0; i < all.length / 3; i++) {
      mesh.getVertexPosition(i, this._vertex).applyMatrix4(this._matrix).toArray(all, i * 3);
    }
    const source = mesh.geometry.index.array;
    const excluded=new Float32Array(all.length/3);
    if(c.excludeLimbs){
      const si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight;
      for(let i=0;i<si.count;i++)for(let k=0;k<4;k++){
        const name=mesh.skeleton.bones[si.getComponent(i,k)].name;
        if(/upper_arm|lower_arm|hand|finger|shoulder/i.test(name))excluded[i]+=sw.getComponent(i,k);
      }
    }
    const selected = [];
    const vertices = new Map();
    for (let i = 0; i < source.length; i += 3) {
      const ids = [source[i], source[i + 1], source[i + 2]];
      if(ids[0]===ids[1]||ids[1]===ids[2]||ids[0]===ids[2])continue;
      if(c.excludeLimbs&&ids.some(id=>excluded[id]>.10))continue;
      const xs = ids.map((j) => all[j * 3]);
      const ys = ids.map((j) => all[j * 3 + 1]);
      if (Math.max(...xs) < c.minX || Math.min(...xs) > c.maxX ||
          Math.max(...ys) < c.minY || Math.min(...ys) > c.maxY) continue;
      for (const id of ids) {
        if (!vertices.has(id)) vertices.set(id, vertices.size);
        selected.push(vertices.get(id));
      }
    }
    return { mesh, sampler:new SkinnedSurfaceSampler(mesh), vertexIds: [...vertices.keys()], faces: new Uint32Array(selected), points: new Float32Array(vertices.size * 3) };
  }

  update() {
    this.world.copy(this.anchor.matrixWorld);
    this.inverseWorld.copy(this.world).invert();
    this._depth.fill(1);
    this._back.fill(-1);
    this._coverage.fill(0);
    for (const source of this.sources) {
      source.sampler.begin();
      this._matrix.multiplyMatrices(this.inverseWorld, source.mesh.matrixWorld);
      for (let i = 0; i < source.vertexIds.length; i++) {
        const id=source.vertexIds[i];
        source.sampler.vertex(id,this._vertex).applyMatrix4(source.mesh.matrixWorld);
        source.mesh.userData.seatedDrape?.deformWorld(this._vertex,source.mesh.geometry.attributes.seatedDrape.getX(id),source.mesh,id);
        this._vertex.applyMatrix4(this.inverseWorld).toArray(source.points,i*3);
      }
      for (let i = 0; i < source.faces.length; i += 3) this._rasterize(source, i);
    }
    // Conservative padding covers the space between texels and hair triangle edges.
    const { padding, feather } = this.config;
    for (let i = 0; i < padding + feather; i++) this._expand(i < padding ? 0 : 1 / feather);
    for (let i = 0; i < this._depth.length; i++) {
      this.pixels[i * 4] = this._depth[i];
      this.pixels[i * 4 + 1] = this._back[i];
      this.pixels[i * 4 + 2] = this._coverage[i];
    }
    this.texture.needsUpdate = true;
  }

  _rasterize(source, face) {
    const c = this.config, p = source.points, f = source.faces;
    const a = f[face] * 3, b = f[face + 1] * 3, d = f[face + 2] * 3;
    const sx = c.width / (c.maxX - c.minX), sy = c.height / (c.maxY - c.minY);
    const ax = (p[a] - c.minX) * sx - 0.5, ay = (p[a + 1] - c.minY) * sy - 0.5;
    const bx = (p[b] - c.minX) * sx - 0.5, by = (p[b + 1] - c.minY) * sy - 0.5;
    const dx = (p[d] - c.minX) * sx - 0.5, dy = (p[d + 1] - c.minY) * sy - 0.5;
    const den = (by - dy) * (ax - dx) + (dx - bx) * (ay - dy);
    if (Math.abs(den) < 1e-8) return;
    const x0 = Math.max(0, Math.ceil(Math.min(ax, bx, dx))), x1 = Math.min(c.width - 1, Math.floor(Math.max(ax, bx, dx)));
    const y0 = Math.max(0, Math.ceil(Math.min(ay, by, dy))), y1 = Math.min(c.height - 1, Math.floor(Math.max(ay, by, dy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = ((by - dy) * (x - dx) + (dx - bx) * (y - dy)) / den;
      const v = ((dy - ay) * (x - dx) + (ax - dx) * (y - dy)) / den;
      if (u < -1e-5 || v < -1e-5 || u + v > 1.00001) continue;
      const z = u * p[a + 2] + v * p[b + 2] + (1 - u - v) * p[d + 2];
      const at = y * c.width + x;
      this._depth[at] = Math.min(this._depth[at], z);
      this._back[at] = Math.max(this._back[at], z);
      this._coverage[at] = 1;
    }
  }

  _expand(falloff) {
    const { width, height } = this.config;
    this._scratchDepth.set(this._depth);
    this._scratchBack.set(this._back);
    this._scratchCoverage.set(this._coverage);
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const at = y * width + x;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const other = at + dy * width + dx;
        if (this._coverage[other] <= falloff) continue;
        if (falloff > 0 && this._coverage[at] >= this._coverage[other] - falloff) continue;
        this._scratchDepth[at] = Math.min(this._scratchDepth[at], this._depth[other]);
        this._scratchBack[at] = Math.max(this._scratchBack[at], this._back[other]);
        this._scratchCoverage[at] = Math.max(this._scratchCoverage[at], this._coverage[other] - falloff);
      }
    }
    [this._depth, this._scratchDepth] = [this._scratchDepth, this._depth];
    [this._back, this._scratchBack] = [this._scratchBack, this._back];
    [this._coverage, this._scratchCoverage] = [this._scratchCoverage, this._coverage];
  }
}
