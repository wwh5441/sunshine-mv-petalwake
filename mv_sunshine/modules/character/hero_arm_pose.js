import * as THREE from 'three';
import { ARM_POSES, ELBOW_POSES, ARM_MOTION } from '../../data/hero_performance.js';
import { solveLimbWithPole } from './limb_ik.js';
import { HandOrientation } from './hand_orientation.js';

// Preserve sampled mocap before adding gestures; no quaternion accumulation.
export class HeroArmPose {
  constructor(hero) {
    this.hero = hero;
    this.bones = hero.flightPose.bones;
    this.joints = Object.entries(this.bones).filter(([name]) => /^(left|right)(Shoulder|UpperArm|LowerArm|Hand|Thumb|Index|Middle|Ring|Little)/.test(name))
      .map(([name,node]) => ({ name,node,base:node.quaternion.clone(),rest:node.quaternion.clone() }));
    this.anchor = new THREE.Vector3();
    this.right = new THREE.Vector3();this.back = new THREE.Vector3();
    this.target = new THREE.Vector3(); this.pole = new THREE.Vector3();
    this.last = {};
    this.hands=new HandOrientation(this.bones);
  }

  restore() { for (const j of this.joints) j.node.quaternion.copy(j.base); }
  reset() { for (const j of this.joints) j.base.copy(j.rest); }

  apply(sample, time) {
    const h=this.hero,b=this.bones;
    for (const j of this.joints) {
      j.base.copy(j.node.quaternion);
      if(/Shoulder$/.test(j.name))j.node.quaternion.slerp(j.rest,.4);
      else j.node.quaternion.copy(j.rest);
    }
    h.group.updateWorldMatrix(true,true);
    this.anchor.copy(b.leftUpperArm.getWorldPosition(this.target)).add(b.rightUpperArm.getWorldPosition(this.pole)).multiplyScalar(.5);
    h.group.worldToLocal(this.anchor);
    this.target.copy(b.leftUpperArm.getWorldPosition(this.target));h.group.worldToLocal(this.target);
    this.pole.copy(b.rightUpperArm.getWorldPosition(this.pole));h.group.worldToLocal(this.pole);
    this.right.subVectors(this.pole,this.target);this.right.y=0;this.right.normalize();
    this.back.set(-this.right.z,0,this.right.x);
    const weights=sample.gestureWeights||{rest:1};
    for(const side of ['left','right']) {
      this.target.set(0,0,0);this.pole.set(0,0,0);
      for(const [pose,weight]of Object.entries(weights)){
        this.target.addScaledVector(new THREE.Vector3(...(ARM_POSES[pose]||ARM_POSES.rest)[side]),weight);
        this.pole.addScaledVector(new THREE.Vector3(...(ELBOW_POSES[pose]||ARM_MOTION.elbow)[side]),weight);
      }
      const sway=Math.sin(time*1.65+(side==='left'?0:.7))*.003;
      this.target.y+=sway;
      if(side==='right')this.target.x+=Math.sin(time*5.2)*.012*(weights.wave||0);
      const tx=this.target.x,tz=this.target.z;
      this.target.x=this.right.x*tx+this.back.x*tz;
      this.target.z=this.right.z*tx+this.back.z*tz;
      this.target.add(this.anchor);
      const px=this.pole.x,pz=this.pole.z;
      this.pole.x=this.right.x*px+this.back.x*pz;
      this.pole.z=this.right.z*px+this.back.z*pz;
      this.pole.add(this.anchor);
      h.group.localToWorld(this.target);h.group.localToWorld(this.pole);
      this.last[side]={ target:this.target.toArray(), error:solveLimbWithPole(b[side+'UpperArm'],b[side+'LowerArm'],b[side+'Hand'],this.target,this.pole) };
      this.hands.apply(side,sample,this.right,this.back,h.group);
      for(const finger of ['Index','Middle','Ring','Little']) for(const [index,segment] of ['Proximal','Intermediate','Distal'].entries()) {
        const node=b[side+finger+segment];
        const open=(weights.wave||0)*.75+(weights.stretch||0)*.35;
        if(node)node.rotation.z+=(side==='left'?-1:1)*ARM_MOTION.fingers[finger][index]*(1-open);
      }
    }
  }
}
