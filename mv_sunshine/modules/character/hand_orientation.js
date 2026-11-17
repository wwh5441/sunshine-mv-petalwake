import * as THREE from 'three';
import { HAND_POSES } from '../../data/hero_performance.js';

const basisQuaternion=(direction,normal)=>{
  const x=direction.clone().normalize(),y=normal.clone().addScaledVector(x,-normal.dot(x)).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y)));
};

// Orient the hand as a palm, not just the wrist point. Calibrate against this
// model's finger bones instead of assuming the two hands use identical axes.
export class HandOrientation {
  constructor(bones){
    this.bones=bones;this.inverse={};
    for(const side of ['left','right']){
      const finger=bones[side+'MiddleProximal'].position.clone().normalize();
      const width=bones[side+'IndexProximal'].position.clone().sub(bones[side+'LittleProximal'].position);
      const normal=new THREE.Vector3().crossVectors(finger,width).normalize().multiplyScalar(side==='left'?1:-1);
      this.inverse[side]=basisQuaternion(finger,normal).invert();
    }
  }
  quaternion(pose,side,right,back){
    const c=HAND_POSES[pose]||HAND_POSES.rest,s=side==='left'?-1:1;
    const toWorld=v=>right.clone().multiplyScalar(v[0]*s).add(new THREE.Vector3(0,v[1],0)).addScaledVector(back,v[2]);
    return basisQuaternion(toWorld(c.direction),toWorld(c.normal));
  }
  apply(side,sample,right,back,actor){
    const weights=sample.handWeights||sample.gestureWeights||{rest:1};
    let q=null,total=0;
    for(const [key,w]of Object.entries(weights)){
      if(w<1e-7)continue;
      const pose=side==='left'&&!['book','gather','settle','stretch'].includes(key)?'rest':key;
      const next=this.quaternion(pose,side,right,back);
      if(!q)q=next;else q.slerp(next,w/(total+w));
      total+=w;
    }
    q||=this.quaternion('rest',side,right,back);
    const hand=this.bones[side+'Hand'];
    const world=actor.getWorldQuaternion(new THREE.Quaternion()).multiply(q).multiply(this.inverse[side]);
    hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(world);
    hand.updateWorldMatrix(false,true);
  }
  grip(side,direction,normal,actor){
    const hand=this.bones[side+'Hand'];
    const world=actor.getWorldQuaternion(new THREE.Quaternion()).multiply(basisQuaternion(direction,normal)).multiply(this.inverse[side]);
    hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(world);
    hand.updateWorldMatrix(false,true);
  }
}
