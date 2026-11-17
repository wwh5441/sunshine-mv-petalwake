import * as THREE from 'three';
import { HERO_FLIGHT } from '../../data/hero_flight.js';
import { solveLimbWithPole } from './limb_ik.js';
import { broomGrip,broomSeat } from './broom_rig.js';
import { setSpringCenters } from './spring_centers.js';
import { SeatedSkirt } from './seated_skirt.js';
import { HandOrientation } from './hand_orientation.js';

export class HeroFlightPose {
  constructor(hero) {
    this.hero = hero;
    this.bones = Object.fromEntries(Object.entries(hero.vrm.humanoid.normalizedHumanBones).map(([name, value]) => [name, value.node]));
    this.rest = new Map(Object.entries(this.bones).map(([name, node]) => [name, { position: node.position.clone(), quaternion: node.quaternion.clone() }]));
    this.point = new THREE.Vector3();
    this.pole = new THREE.Vector3();
    this.seat = new THREE.Vector3();
    this.springCenters = new Map([...hero.vrm.springBoneManager.joints].map(joint => [joint, joint.center]));
    this.springGravity = new Map([...hero.vrm.springBoneManager.joints].filter(joint => /DS_(hair|skirt|ribbon)/.test(joint.bone.name)).map(joint => [joint, { power: joint.settings.gravityPower, direction: joint.settings.gravityDir.clone() }]));
    this.wind = new THREE.Vector3();
    this.entered = false;
    this.skirt=new SeatedSkirt(hero);
    this.hands=new HandOrientation(this.bones);
  }

  apply(time, progress, dt) {
    const h = this.hero, b = this.bones;
    this.skirt.enter();
    h.mixer.stopAllAction(); h.activeKey = null;
    h.vrm.scene.position.set(0, 0, 0);
    for (const [name, rest] of this.rest) {
      b[name].position.copy(rest.position); b[name].quaternion.copy(rest.quaternion);
    }
    b.spine.rotation.x += HERO_FLIGHT.lean+Math.sin(time*1.4)*.006;
    b.chest.rotation.x += 0.06+Math.sin(time*1.4-.2)*.004;
    b.head.rotation.set(-0.07+Math.sin(time*.8)*.010, Math.sin(time * 0.45) * 0.03, 0);
    h.group.updateWorldMatrix(true, true);
    // Place the same pelvis on the broom seat, independent of animation root drift.
    this.seat.copy(b.hips.getWorldPosition(this.point));
    h.group.worldToLocal(this.seat);
    h.vrm.scene.position.copy(broomSeat(this.point)).sub(this.seat);
    h.group.updateWorldMatrix(true, true);

    for (const side of ['left', 'right']) {
      const leg = HERO_FLIGHT.legs[side];
      const ankle=h.group.localToWorld(this.point.fromArray(leg.foot));
      const kneePole=h.group.localToWorld(this.pole.fromArray(leg.knee));
      solveLimbWithPole(b[`${side}UpperLeg`],b[`${side}LowerLeg`],b[`${side}Foot`],ankle,kneePole);
      b[`${side}Foot`].rotation.x += 0.16;
      const direction=new THREE.Vector3(side==='left'?1:-1,0,0);
      const target = h.group.localToWorld(broomGrip(side,this.point).addScaledVector(direction,-HERO_FLIGHT.grip.palmOffset));
      const pole=h.group.localToWorld(this.pole.fromArray(HERO_FLIGHT.elbows[side]));
      solveLimbWithPole(b[`${side}UpperArm`], b[`${side}LowerArm`], b[`${side}Hand`], target, pole);
      this.hands.grip(side,direction,new THREE.Vector3(0,-1,0),h.group);
      for (const finger of ['Index', 'Middle', 'Ring', 'Little']) for (const [index,segment] of ['Proximal', 'Intermediate', 'Distal'].entries()) {
        const node = b[`${side}${finger}${segment}`];
        if (node) node.rotation.z += (side === 'left' ? -1 : 1) * HERO_FLIGHT.grip.fingerCurl[index];
      }
    }
    h._resetExpressions();
    h._setExpr('detail_happy_mouth', 0.55);
    h._setExpr('detail_brow_happy', 0.36);
    const blink = (time + 0.45) % 3.6;
    h._setExpr('blink', blink < 0.15 ? Math.sin(blink / 0.15 * Math.PI) : 0);
    h.performance.applyMouth(h, h.performance.sample(time));
    // Travel is tens of metres per second. Simulate secondary motion in the
    // performer's moving frame so a shot cut/flight translation cannot whip hair.
    if (!this.entered) {
      setSpringCenters([...this.springCenters].map(([joint])=>[joint,h.vrm.scene]));
      h.group.updateWorldMatrix(true, true);
      h.vrm.springBoneManager.reset();
      this.entered = true;
    }
    this.wind.set(0, 0, 0.38).applyQuaternion(h.group.quaternion);
    this.wind.y -= 0.90;
    this.wind.normalize();
    for (const [joint, gravity] of this.springGravity) {
      joint.settings.gravityDir.copy(this.wind);
      joint.settings.gravityPower = Math.max(gravity.power, 0.04) * 1.25;
    }
    // Substeps limit secondary-motion integration; paused time stays unchanged.
    h._stepVrmAndPhysics(dt, true);
    this.skirt.apply(time);
    h.hairClearance.dirty = true;
    // Standing clips resume from a clean head/neck base after the next cut.
    for (const gaze of h._gazeBones) gaze.base.copy(gaze.node.quaternion);
  }

  leave() {
    this.skirt.leave();
    setSpringCenters(this.springCenters);
    this.entered = false;
    for (const [joint, gravity] of this.springGravity) {
      joint.settings.gravityDir.copy(gravity.direction);
      joint.settings.gravityPower = gravity.power;
    }
    this.hero.vrm.scene.position.set(0, 0, 0);
    for (const [name, rest] of this.rest) {
      this.bones[name].position.copy(rest.position); this.bones[name].quaternion.copy(rest.quaternion);
    }
    for (const gaze of this.hero._gazeBones) gaze.base.copy(gaze.rest);
  }
}
