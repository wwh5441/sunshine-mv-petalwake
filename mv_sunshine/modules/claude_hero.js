// VRM performance, with authored spring groups and post-skinning clearance.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { HERO_CLEARANCE } from '../data/hero_clearance.js';
import { installArmHairColliders } from './character/arm_hair_colliders.js';
import { HairClearance } from './character/hair_clearance.js';
import { HeroArmPose } from './character/hero_arm_pose.js';
import { HeroFlightPose } from './character/hero_flight_pose.js';
import { LyricPerformance } from './character/lyric_performance.js';
import { SecondaryMotion } from './character/secondary_motion.js';
import { applyHeroAppearance } from './character/hero_appearance.js';
import { HERO_MOTION_FILES, HERO_BODY_POSES } from '../data/hero_motion.js';
import { HeroBodyMotion } from './character/hero_body_motion.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};



export class ClaudeHero {
  static async load(
    vrmUrl = './mv_sunshine/assets/claude_chan.vrm',
    vrmaBase = './mv_sunshine/assets/vrma',
    lyricUrl = './mv_sunshine/data/lyric_performance.json'
  ) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

    const vrmPromise = loader.loadAsync(vrmUrl);
    const lyricPromise = fetch(lyricUrl).then((r) => (r.ok ? r.json() : { lines: [] })).catch(() => ({ lines: [] }));
    const vrmaEntries = await Promise.all(
      Object.entries(HERO_MOTION_FILES).map(async ([key, fn]) => {
        const gltf = await loader.loadAsync(`${vrmaBase}/${fn}`);
        return [key, gltf.userData.vrmAnimations?.[0] || null];
      })
    );
    const [vrmGltf, lyricData] = await Promise.all([vrmPromise, lyricPromise]);
    return new ClaudeHero(vrmGltf.userData.vrm, Object.fromEntries(vrmaEntries), lyricData);
  }

  constructor(vrm, vrmAnimations, lyricData = { lines: [] }) {
    this.vrm = vrm;
    this.group = new THREE.Group();

    this.scale = 1.18;
    this.vrm.scene.scale.setScalar(this.scale);
    this.vrm.scene.rotation.y = Math.PI;
    this.vrm.scene.position.set(0, 0, 0);
    this.group.add(this.vrm.scene);

    applyHeroAppearance(this.vrm);
    this.secondaryMotion = new SecondaryMotion(this.vrm,this.scale);
    this.flying = false;

    this.mixer = new THREE.AnimationMixer(this.vrm.scene);
    this.clips = {};
    this.actions = {};
    for (const [key, vrmAnim] of Object.entries(vrmAnimations)) {
      if (!vrmAnim) continue;
      const clip = createVRMAnimationClip(vrmAnim, this.vrm);
      this.clips[key] = clip;
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      this.actions[key] = action;
    }
    this.activeKey = null;
    this._lookTarget = null;

    // Preserve base quaternions for head & neck so additive gaze never accumulates across frames
    this._gazeBones = ['head', 'neck']
      .map((name) => {
        const node = this.vrm.humanoid.getNormalizedBoneNode(name);
        return node ? { name, node, base: node.quaternion.clone(), rest: node.quaternion.clone() } : null;
      })
      .filter(Boolean);

    this.performance = new LyricPerformance(lyricData);
    this.flightPose = new HeroFlightPose(this);
    this.armPose = new HeroArmPose(this);
    this.bodyMotion=new HeroBodyMotion(this);
    this.hairColliders = installArmHairColliders(this.vrm, HERO_CLEARANCE);
    this.hairClearance = new HairClearance(this.vrm, HERO_CLEARANCE);
  }

  _resetExpressions() {
    const em = this.vrm.expressionManager;
    if (!em) return;
    for (const k of [
      'aa', 'ih', 'ou', 'ee', 'oh',
      'happy', 'relaxed', 'surprised', 'sad', 'angry',
      'blink', 'blinkLeft', 'blinkRight',
      'detail_happy_eye', 'detail_happy_mouth',
      'detail_relaxed_eye', 'detail_relaxed_mouth',
      'detail_brow_happy', 'detail_brow_relaxed', 'detail_brow_surprised',
    ]) {
      em.setValue(k, 0);
    }
  }

  _setExpr(name, val) {
    this.vrm.expressionManager?.setValue(name, clamp(val, 0, 1));
  }

  resetPhysics() {
    this.vrm.springBoneManager?.reset();
    if (this.hairClearance) this.hairClearance.dirty = true;
  }

  _stepVrmAndPhysics(dt, isFlight = false) {
    this.secondaryMotion.step(dt,isFlight);
  }

  _aimEyes(cameraPos) {
    if(!this.vrm.lookAt||!cameraPos)return;
    // This target is in world space, so it must not be parented to the actor.
    this._lookTarget ||= new THREE.Object3D();
    this._lookTarget.position.copy(cameraPos);
    this._lookTarget.updateMatrixWorld(true);
    this.vrm.lookAt.target=this._lookTarget;
  }

  fly(shotProgress, time, dt, cameraPos = null) {
    this.flying=true;
    if(this.vrm.lookAt)this.vrm.lookAt.target=null;
    this.flightPose.apply(time, shotProgress, dt);
  }

  act(poseName, shotProgress, time, dt, cameraPos = null) {
    const u = clamp(shotProgress, 0, 1);
    this.flying=false;

    // Step 1: Leave flight pose if active & restore base quaternions (zero per-frame accumulation!)
    if (this.flightPose.entered) {
      this.flightPose.leave();
      this.armPose.reset();
    }
    for (const g of this._gazeBones) g.node.quaternion.copy(g.base);
    this.armPose.restore();

    // Step 2: Sample a quiet portion of the existing retargeted motion.
    const cfg = HERO_BODY_POSES[poseName] || HERO_BODY_POSES.mocap_idle_warm;
    const action = this.actions[cfg.clip] || this.actions.model_pose;
    const clipObj = this.clips[cfg.clip] || this.clips.model_pose;

    if (action && clipObj) {
      if (this.activeKey !== cfg.clip) {
        this.mixer.stopAllAction();
        action.reset();
        action.setEffectiveWeight(1.0);
        action.play();
        this.activeKey = cfg.clip;
      }
      const dur = Math.max(0.1, clipObj.duration);
      const localT = (cfg.start + u * cfg.span) % dur;
      this.mixer.setTime(localT);
    }

    // Save clean sampled head/neck quaternions BEFORE bounded additive gaze
    for (const g of this._gazeBones) g.base.copy(g.node.quaternion);

    // Step 2b: Apply lyric-synced arm gestures & mouth shapes
    const sample = this.performance.sample(time);
    this.bodyMotion.apply(sample,time);
    this.armPose.apply(sample, time);

    const head = this.vrm.humanoid.getNormalizedBoneNode('head');
    const neck = this.vrm.humanoid.getNormalizedBoneNode('neck');
    const breath = Math.sin(time * 2.15);
    if (head && neck) {
      const gazeU = Math.sin(u * Math.PI);
      head.rotation.x += cfg.headPitch * (0.5 + 0.5 * gazeU) - breath * 0.010;
      head.rotation.y += cfg.headYaw * Math.sin(u * Math.PI * 0.9 - 0.3);
      neck.rotation.x += cfg.headPitch * 0.35;
    }

    this._aimEyes(cameraPos);

    this._resetExpressions();
    const bc = (time + 0.45) % 3.6;
    const autoBlink = bc < 0.15 ? Math.sin((bc / 0.15) * Math.PI) : 0;

    if (poseName === 'mocap_sleepy') {
      const dozeK = smooth((u - 0.32) / 0.42);
      const yawnK = smooth((u - 0.08) / 0.18) * (1 - smooth((u - 0.42) / 0.18));
      this._setExpr('relaxed', 0.45);
      this._setExpr('detail_brow_relaxed', 0.82);
      this._setExpr('detail_relaxed_mouth', 0.72);
      this._setExpr('aa', yawnK * 0.54);
      this._setExpr('oh', yawnK * 0.28);
      this._setExpr('blink', Math.max(autoBlink, yawnK * 0.55, dozeK * 0.92));
    } else if (poseName === 'mocap_blush_happy' || poseName === 'mocap_greeting') {
      const smileK = smooth(u / 0.30);
      this._setExpr('happy', 0.48 * smileK);
      this._setExpr('detail_brow_happy', 0.82);
      this._setExpr('detail_happy_mouth', 0.88);
      this._setExpr('detail_happy_eye', 0.72 * smileK);
      this._setExpr('blink', autoBlink * (1 - 0.65 * smileK));
    } else if (poseName === 'mocap_goodbye') {
      this._setExpr('happy', 0.36);
      this._setExpr('detail_brow_happy', 0.72);
      this._setExpr('detail_happy_mouth', 0.78);
      this._setExpr('blink', autoBlink);
    } else if (poseName === 'mocap_wake_joy') {
      const wakeK = smooth(u / 0.24);
      this._setExpr('happy', 0.52 * wakeK);
      this._setExpr('detail_brow_happy', 0.84 * wakeK);
      this._setExpr('detail_happy_mouth', 0.90 * wakeK);
      this._setExpr('detail_happy_eye', 0.62 * wakeK);
      this._setExpr('blink', Math.max((1 - wakeK) * 0.95, autoBlink * wakeK));
    } else if (poseName === 'mocap_thinking') {
      this._setExpr('relaxed', 0.30);
      this._setExpr('detail_brow_relaxed', 0.62);
      this._setExpr('detail_relaxed_mouth', 0.55);
      this._setExpr('detail_happy_mouth', 0.38);
      this._setExpr('blink', autoBlink);
    } else {
      this._setExpr('happy', 0.26);
      this._setExpr('detail_brow_relaxed', 0.48);
      this._setExpr('detail_brow_happy', 0.52);
      this._setExpr('detail_happy_mouth', 0.72);
      this._setExpr('detail_relaxed_eye', 0.34);
      this._setExpr('blink', autoBlink);
    }
    this.performance.applyMouth(this, sample);

    // Step 3: Update VRM & substepped spring physics (0 when paused!)
    this._stepVrmAndPhysics(dt, false);

    // Step 4 & 5: Mark surface dirty so renderScene refreshes world/bind matrices & updates Garment + Skirt surfaces!
    this.hairClearance.dirty = true;
  }
}
