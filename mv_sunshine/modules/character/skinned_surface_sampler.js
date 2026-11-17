import * as THREE from 'three';

// Same skinning operation as the bundled Three.js SkinnedMesh, with each
// bone-world × inverse-bind matrix computed once per surface update.
export class SkinnedSurfaceSampler {
  constructor(mesh){
    this.mesh=mesh;this.palette=new Float64Array(mesh.skeleton.bones.length*16);
    this.matrix=new THREE.Matrix4();this.base=new THREE.Vector3();
  }
  begin(){
    const s=this.mesh.skeleton;
    for(let i=0;i<s.bones.length;i++)this.matrix.multiplyMatrices(s.bones[i].matrixWorld,s.boneInverses[i]).toArray(this.palette,i*16);
  }
  vertex(index,target){
    const mesh=this.mesh,a=mesh.geometry.attributes,p=this.base;
    THREE.Mesh.prototype.getVertexPosition.call(mesh,index,p);
    p.applyMatrix4(mesh.bindMatrix);target.set(0,0,0);
    for(let k=0;k<4;k++){
      const w=a.skinWeight.getComponent(index,k);if(!w)continue;
      const at=a.skinIndex.getComponent(index,k)*16,m=this.palette;
      target.x+=(m[at]*p.x+m[at+4]*p.y+m[at+8]*p.z+m[at+12])*w;
      target.y+=(m[at+1]*p.x+m[at+5]*p.y+m[at+9]*p.z+m[at+13])*w;
      target.z+=(m[at+2]*p.x+m[at+6]*p.y+m[at+10]*p.z+m[at+14])*w;
    }
    return target.applyMatrix4(mesh.bindMatrixInverse);
  }
}
