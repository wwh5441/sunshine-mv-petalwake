import * as THREE from 'three';

// Final vertex-level separation supplements spring-tail collisions. Capsules
// follow the actual raw shoulder/elbow/wrist positions in world metres.
export class HairArmSurface {
  constructor(vrm,config){
    this.vrm=vrm;this.segments=[];
    for(const side of ['left','right'])for(const c of config){
      this.segments.push({a:vrm.humanoid.getRawBoneNode(side+c.from),b:vrm.humanoid.getRawBoneNode(side+c.to),radius:c.radius});
    }
    this.starts=Array.from({length:4},()=>new THREE.Vector4());
    this.ends=Array.from({length:4},()=>new THREE.Vector4());this.point=new THREE.Vector3();
    this.uniforms={uHairArmStart:{value:this.starts},uHairArmEnd:{value:this.ends}};
    this.update();
  }
  update(){
    this.segments.forEach((s,i)=>{
      s.a.getWorldPosition(this.point);this.starts[i].set(this.point.x,this.point.y,this.point.z,s.radius+.009);
      s.b.getWorldPosition(this.point);this.ends[i].set(this.point.x,this.point.y,this.point.z,0);
    });
  }
}
