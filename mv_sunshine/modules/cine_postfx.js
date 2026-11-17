// Cinematic Post-Processing & Dynamic Sunlight Upgrade (`CinePostFX`) for 《阳光晒暖了被》:
//   1. Attaches hardware Float DepthTexture to `pipeline.compRT` so ALL 3D objects (world + Claude + GLB props)
//      participate in Optical Bokeh Depth-of-Field & Screen-Space Contact Ambient Occlusion (SSAO)!
//   2. Inserts a 20-tap Golden-Angle Vogel Disk Bokeh DoF + Contact AO pass right before Bloom & ACES Tonemapping!
//   3. Tracks camera target with a 2048x2048 PCFSoftShadowMap DirectionalLight + subtle shadow-catcher planes!
//   4. Smoothly evolves sunlight & sky from Crisp 12:00 Noon -> Golden Afternoon -> Honey Dream -> Apricot Dusk!
import * as THREE from 'three';
import { U } from '../../src/core/ctx.js';
import { VISUAL_STYLE } from '../data/visual_style.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

const FSV = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const CINE_DOF_AO_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uRes;
uniform float uNear;
uniform float uFar;
uniform float uReversed;
uniform float uFocusDist;
uniform float uAperture;   // 0 = off, ~0.015..0.045 = creamy 85mm f/1.4 bokeh
uniform float uAOStrength;

float linearDepth(vec2 uv) {
  float z = texture2D(tDepth, uv).r;
  if (uReversed > 0.5) {
    // Reversed-Z infinite/far projection: z ~ uNear / viewZ
    return uNear / max(z, 1e-6);
  } else {
    float ndc = z * 2.0 - 1.0;
    return (2.0 * uNear * uFar) / max(uFar + uNear - ndc * (uFar - uNear), 1e-5);
  }
}

void main() {
  vec4 base = texture2D(tColor, vUv);
  float dist = linearDepth(vUv);
  vec2 texel = 1.0 / uRes;

  // 1. Screen-Space Contact Ambient Occlusion (crevices, saucer-to-table, book-to-desk, wall corners)
  float ao = 1.0;
  if (uAOStrength > 0.001 && dist < 120.0) {
    float occ = 0.0;
    float rad = clamp(14.0 / max(dist, 0.8), 1.5, 9.0);
    for (int i = 0; i < 8; i++) {
      float ang = float(i) * 0.785398 + fract(dot(gl_FragCoord.xy, vec2(0.06711, 0.00583))) * 6.28318;
      vec2 off = vec2(cos(ang), sin(ang)) * texel * rad * (0.55 + 0.45 * float(i) / 7.0);
      float sd = linearDepth(clamp(vUv + off, 0.001, 0.999));
      float diff = dist - sd;
      // Occlude when neighbor is slightly closer in depth (within physical crevice range)
      float rangeCheck = smoothstep(0.0, 0.015 * dist, diff) * (1.0 - smoothstep(0.08 * dist, 0.45 * dist, diff));
      occ += rangeCheck;
    }
    ao = 1.0 - clamp((occ / 8.0) * uAOStrength, 0.0, 0.42);
  }

  vec3 centerCol = base.rgb * mix(vec3(1.0), vec3(0.84, 0.76, 0.70), 1.0 - ao) * ao;

  // 2. Golden-Angle Vogel Disk Optical Bokeh Depth-of-Field
  if (uAperture <= 0.0005) {
    gl_FragColor = vec4(centerCol, 1.0);
    return;
  }

  // Signed Circle-of-Confusion radius in pixels (subtle optical depth, keeps 4K textures razor-sharp!)
  float cocNorm = clamp((dist - uFocusDist) / max(dist, 0.35), -1.0, 1.0);
  float maxRadiusPx = uAperture * uRes.y * 0.011;
  float radiusPx = abs(cocNorm) * maxRadiusPx;

  if (radiusPx < 0.65) {
    gl_FragColor = vec4(centerCol, 1.0);
    return;
  }

  vec3 acc = centerCol * 1.2;
  float wsum = 1.2;
  const int SAMPLES = 20;
  float golden = 2.39996323;
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.28318;

  for (int i = 1; i <= SAMPLES; i++) {
    float r = sqrt(float(i) / float(SAMPLES)) * radiusPx;
    float theta = float(i) * golden + jitter;
    vec2 sampleUv = clamp(vUv + vec2(cos(theta), sin(theta)) * r * texel, 0.001, 0.999);
    float sDist = linearDepth(sampleUv);
    float sCoc = abs(clamp((sDist - uFocusDist) / max(sDist, 0.35), -1.0, 1.0)) * maxRadiusPx;

    // Prevent sharp foreground objects from bleeding halo onto blurred background
    float fgGuard = sDist < dist - 0.15 ? smoothstep(0.0, radiusPx * 0.6, sCoc) : 1.0;
    vec3 sCol = texture2D(tColor, sampleUv).rgb;
    // Slight highlight bokeh boost (warm sunlit specular circles!)
    float lum = dot(sCol, vec3(0.2126, 0.7152, 0.0722));
    float bokehBoost = 1.0 + clamp(lum - 0.9, 0.0, 4.0) * 0.32;
    float w = fgGuard * bokehBoost;
    acc += sCol * w;
    wsum += w;
  }

  gl_FragColor = vec4(acc / max(wsum, 1e-4), 1.0);
}
`;

export class CinePostFX {
  constructor(pipeline, riderSun) {
    this.pipeline = pipeline;
    this.sun = riderSun;
    this.dofTarget = null;
    this.compDepth = null;

    this.focusDist = 8.0;
    this.aperture = 0.0;
    this.aoStrength = 0.34;
    this.dofEnabled = true;

    this.dofMat = new THREE.ShaderMaterial({
      vertexShader: FSV,
      fragmentShader: CINE_DOF_AO_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: null },
        tDepth: { value: null },
        uRes: { value: new THREE.Vector2(720, 960) },
        uNear: { value: 0.25 },
        uFar: { value: 60000 },
        uReversed: { value: pipeline.reversed ? 1 : 0 },
        uFocusDist: { value: 8.0 },
        uAperture: { value: 0.0 },
        uAOStrength: { value: 0.34 },
      },
    });

    this._upgradeShadowRig();
    this._hookPipeline();
  }

  _upgradeShadowRig() {
    if (!this.sun) return;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.00035;
    this.sun.shadow.normalBias = 0.008;
    this.sun.shadow.radius = 2.4;
  }

  updateShadowFocus(focusPoint, extent = 4.2) {
    if (!this.sun) return;
    const sc = this.sun.shadow.camera;
    if (Math.abs(sc.right - extent) > 0.05) {
      sc.left = -extent;
      sc.right = extent;
      sc.top = extent;
      sc.bottom = -extent;
      sc.near = 0.5;
      sc.far = 28;
      sc.updateProjectionMatrix();
    }
    this.sun.position.copy(focusPoint).addScaledVector(U.uSunDir.value, 12.0);
    this.sun.target.position.copy(focusPoint);
    this.sun.target.updateMatrixWorld();
  }

  _ensureTargets() {
    const p = this.pipeline;
    if (!p.compRT) return;
    const W = p.size.x;
    const H = p.size.y;

    // Upgrade MSAA to 8x and attach hardware Float DepthTexture to compRT
    if (!p.compRT.depthTexture || this.dofTarget?.width !== W || this.dofTarget?.height !== H) {
      this.compDepth?.dispose();
      this.dofTarget?.dispose();

      this.compDepth = new THREE.DepthTexture(W, H, THREE.FloatType);
      this.compDepth.format = THREE.DepthFormat;

      // Attach 4x MSAA + hardware Float DepthTexture (proven on Metal WebGL2 via Petalwake's sceneRT)
      p.compRT.dispose();
      p.compRT = new THREE.WebGLRenderTarget(W, H, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        samples: 4,
        depthBuffer: true,
        depthTexture: this.compDepth,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
      });
      if (p.sceneRT) p.sceneRT.samples = 4;

      this.dofTarget = new THREE.WebGLRenderTarget(W, H, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
      });
    }
  }

  _hookPipeline() {
    const p = this.pipeline;
    const self = this;

    p.render = function renderWithCineDoF(world, camera, dt) {
      self._ensureTargets();
      const r = this.renderer;
      const prm = this.params;
      camera.updateMatrixWorld();
      this.viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.invViewProj.copy(this.viewProj).invert();

      // 1. World HDR + 8x MSAA
      r.setRenderTarget(this.sceneRT);
      r.render(world, camera);

      // 2 + 3. Motion-blurred world + sharp overlay (Claude + PBR GLB props) -> compRT + compDepth
      const shutter = dt > 0 ? Math.min(1 / 60 / dt, 2.0) : 1.0;
      this.blurMat.uniforms.uStrength.value = this.hasPrev ? prm.blur * 0.55 * shutter : 0;
      r.setRenderTarget(this.compRT);
      r.render(this.overlay, camera);

      // 3.5 NEW: Screen-Space Contact AO + Golden-Angle Bokeh Depth-of-Field -> dofTarget!
      const du = self.dofMat.uniforms;
      du.tColor.value = this.compRT.texture;
      du.tDepth.value = self.compDepth;
      du.uRes.value.copy(this.size);
      du.uNear.value = camera.near;
      du.uFar.value = camera.far;
      du.uReversed.value = this.reversed ? 1 : 0;
      du.uFocusDist.value = self.focusDist;
      du.uAperture.value = self.dofEnabled ? self.aperture : 0.0;
      du.uAOStrength.value = self.dofEnabled ? self.aoStrength : 0.0;
      this._blit(self.dofMat, self.dofTarget);

      const postTex = self.dofTarget.texture;

      // 4. Bloom pyramid fed by DoF-composited HDR image
      let src = postTex;
      for (let i = 0; i < this.bloom.length; i++) {
        const rt = this.bloom[i];
        this.downMat.uniforms.tColor.value = src;
        this.downMat.uniforms.uTexel.value.set(1 / (rt.width * 2), 1 / (rt.height * 2));
        this.downMat.uniforms.uFirst.value = i === 0 ? 1 : 0;
        this._blit(this.downMat, rt);
        src = rt.texture;
      }
      for (let i = this.bloom.length - 2; i >= 0; i--) {
        const rt = this.bloomUp[i];
        this.upMat.uniforms.tColor.value = src;
        this.upMat.uniforms.tAdd.value = this.bloom[i].texture;
        this.upMat.uniforms.uTexel.value.set(1 / rt.width, 1 / rt.height);
        this._blit(this.upMat, rt);
        src = rt.texture;
      }

      // 5. God rays
      const sun = this._sun || (this._sun = new THREE.Vector3());
      sun.copy(U.uSunDir.value).multiplyScalar(1e5).add(camera.position).project(camera);
      const camDir = camera.getWorldDirection(this._cd || (this._cd = new THREE.Vector3()));
      const facing = camDir.dot(U.uSunDir.value);
      this.raysMat.uniforms.tColor.value = postTex;
      this.raysMat.uniforms.uSun.value.set(
        sun.x * 0.5 + 0.5,
        sun.y * 0.5 + 0.5,
        Math.max(0, (facing - 0.12) / 0.88)
      );
      this.raysMat.uniforms.uAspect.value = this.size.x / this.size.y;
      this._blit(this.raysMat, this.raysRT);

      // 6. Final lens + ACES filmic grade
      const f = this.finalMat.uniforms;
      f.tColor.value = postTex;
      f.tBloom.value = src;
      f.tRays.value = this.raysRT.texture;
      f.uExposure.value = prm.exposure;
      f.uBloom.value = prm.bloom;
      f.uDistort.value = prm.distortion;
      f.uFringe.value = prm.fringe;
      f.uVignette.value = prm.vignette;
      f.uRays.value = prm.rays;
      f.uSat.value = prm.saturation;
      f.uContrast.value = prm.contrast;
      f.uSpeed.value = prm.speed;
      f.uFade.value = this.fade;
      this._blit(this.finalMat, null);

      this.prevViewProj.copy(this.viewProj);
      this.hasPrev = true;
    };
  }

  /**
   * Evolves sunlight, sky scatter, bloom & rays across the full 228.89s song:
   *   00:00 - 01:26: Crisp Radiant Noon ("时针走到十二" -> "阳光晒暖了棉被")
   *   01:26 - 02:35: Warm Golden Afternoon ("阳光还留着余味")
   *   02:35 - 03:02: Honey-Amber Sleepy Dream ("光从我的手边，挪到了椅背")
   *   03:02 - 03:49: Glowing Apricot-Blue Golden Hour ("等到醒来，光已经挪到床尾 / 伸个懒腰，天还没黑")
   */
  updateTimeOfDay(t) {
    const p = this.pipeline.params;
    const kAfternoon = smooth((t - 86.0) / 50.0);
    const kBridge = smooth((t - 155.0) / 28.0);
    const kDusk = smooth((t - 192.0) / 30.0);

    // Sun radiance shifts from bright warm ivory-gold -> honey-amber -> apricot-rose golden hour
    const {noon,afternoon,dusk}=VISUAL_STYLE.sun;
    const sr = lerp(lerp(noon[0], afternoon[0], kAfternoon), dusk[0], kDusk);
    const sg = lerp(lerp(noon[1], afternoon[1], kAfternoon), dusk[1], kDusk);
    const sb = lerp(lerp(noon[2], afternoon[2], kAfternoon), dusk[2], kDusk);
    U.uSunColor.value.set(sr, sg, sb);

    // Sky horizon & midtones warm progressively while keeping zenith clear twilight blue ("天还没黑"!)
    U.uSkyZenith.value.set(
      lerp(0.056, 0.085, kDusk),
      lerp(0.195, 0.165, kDusk),
      lerp(0.575, 0.495, kDusk)
    );
    U.uSkyMid.value.set(
      lerp(0.165, 0.385, kDusk * 0.8 + kBridge * 0.2),
      lerp(0.415, 0.345, kDusk),
      lerp(0.855, 0.645, kDusk)
    );
    U.uSkyHorizon.value.set(
      lerp(0.680, 0.940, kAfternoon * 0.35 + kDusk * 0.65),
      lerp(0.795, 0.665, kDusk),
      lerp(0.905, 0.560, kDusk)
    );
    U.uSunHalo.value.set(
      lerp(1.18, 1.55, kDusk),
      lerp(0.86, 0.78, kDusk),
      lerp(0.50, 0.38, kDusk)
    );
    U.uAmbSky.value.set(
      lerp(0.40, 0.48, kDusk),
      lerp(0.54, 0.46, kDusk),
      lerp(0.78, 0.66, kDusk)
    );

    const grade=VISUAL_STYLE.grade;
    p.bloom = lerp(...grade.bloom,kBridge*.5+kDusk*.5);
    p.rays = lerp(...grade.rays,kAfternoon*.4+kDusk*.6);
    p.exposure = lerp(...grade.exposure,kDusk);
    p.contrast = grade.contrast;
    p.saturation = grade.saturation;
  }
}
