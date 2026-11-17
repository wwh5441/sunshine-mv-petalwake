// Warm noon-to-early-afternoon sunlight grading & floating sunlit dust motes for 《阳光晒暖了被》.
import * as THREE from 'three';
import { U } from '../../src/core/ctx.js';
import { VISUAL_STYLE } from '../data/visual_style.js';

export function applySunshineWarmth(pipeline) {
  // Keep uSunDir intact so pre-baked terrain & town shadow maps align pixel-accurately,
  // while shifting radiance & sky scatter toward cozy golden-warm quilt sunlight.
  U.uSunColor.value.set(3.55, 2.98, 2.28);
  U.uSkyZenith.value.set(0.058, 0.195, 0.575);
  U.uSkyMid.value.set(0.165, 0.415, 0.855);
  U.uSkyHorizon.value.set(0.680, 0.795, 0.905);
  U.uSunHalo.value.set(1.18, 0.86, 0.50);
  U.uAmbSky.value.set(0.40, 0.54, 0.78);
  U.uAmbGround.value.set(0.25, 0.24, 0.15);
  U.uFog.value.set(1.18e-4, 1 / 440, 0, 0);

  const g=VISUAL_STYLE.grade;
  Object.assign(pipeline.params,{exposure:g.exposure[0],bloom:g.bloom[0],rays:g.rays[0],saturation:g.saturation,contrast:g.contrast,vignette:g.vignette,blur:g.blur,fringe:0,distortion:0});
}

export class SunlitMotes {
  constructor(count = 220) {
    this.count = count;
    this.span = 18;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 3);
    let s = 42197;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * this.span;
      pos[i * 3 + 1] = (rnd() - 0.5) * this.span;
      pos[i * 3 + 2] = (rnd() - 0.5) * this.span;
      seed[i * 3] = rnd() * Math.PI * 2;
      seed[i * 3 + 1] = 0.45 + rnd() * 0.85;
      seed[i * 3 + 2] = 0.5 + rnd() * 0.9;
    }
    this.basePos = pos.slice();
    this.seed = seed;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const tex = this._makeSoftDot();
    const mat = new THREE.PointsMaterial({
      size: 0.085,
      map: tex,
      color: new THREE.Color(0xfff1cc),
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  _makeSoftDot() {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0.0, 'rgba(255, 250, 230, 1.0)');
    grad.addColorStop(0.4, 'rgba(255, 236, 185, 0.55)');
    grad.addColorStop(1.0, 'rgba(255, 225, 160, 0.0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  update(time, cameraPos) {
    const attr = this.points.geometry.attributes.position;
    const arr = attr.array;
    const half = this.span * 0.5;
    const wrap = (v, c) => {
      let d = ((v - c + half) % this.span);
      if (d < 0) d += this.span;
      return c - half + d;
    };
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const ph = this.seed[i3];
      const sp = this.seed[i3 + 1];
      const bx = this.basePos[i3] + Math.sin(time * 0.55 * sp + ph) * 0.8 + time * 0.32;
      const by = this.basePos[i3 + 1] + Math.cos(time * 0.42 * sp + ph * 1.3) * 0.55 + time * 0.08;
      const bz = this.basePos[i3 + 2] + Math.sin(time * 0.48 * sp + ph * 0.7) * 0.8 + time * 0.25;
      arr[i3] = wrap(bx, cameraPos.x);
      arr[i3 + 1] = wrap(by, cameraPos.y);
      arr[i3 + 2] = wrap(bz, cameraPos.z);
    }
    attr.needsUpdate = true;
  }
}
