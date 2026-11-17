import * as THREE from 'three';
import { SEATED_DRAPE as C } from '../../data/seated_drape.js';
import { SeatedSkirtFrame } from './seated_skirt_frame.js';
import { SEATED_UNIFORMS,SEATED_POSITION,SEATED_NORMAL } from './seated_skirt_shader.js';

export class SeatedSkirt {
  constructor(hero){
    this.hero=hero;this.entered=false;this.frame=new SeatedSkirtFrame();
    this.reference=new THREE.Vector3();this.destination=new THREE.Vector3();
    this.uniforms={uSeatWorld:{value:hero.group.matrixWorld},uSeatInverse:{value:new THREE.Matrix4()},uSeatFrames:{value:this.frame.texture},uSeatPattern:{value:new THREE.Vector3(C.top,C.length,C.samples)},uSeated:{value:0}};
    this.meshes=[];const materials=new Set(),v=new THREE.Vector3();
    hero.group.updateWorldMatrix(true,true);hero.vrm.scene.updateMatrixWorld(true);
    const inverse=hero.group.matrixWorld.clone().invert();
    const hips=hero.group.worldToLocal(hero.vrm.humanoid.getNormalizedBoneNode('hips').getWorldPosition(new THREE.Vector3()));
    hero.vrm.scene.traverse(mesh=>{
      if(!mesh.isSkinnedMesh||!['Material_upper_body','Material_lower_body','Material_accessories'].includes(mesh.material?.name))return;
      const g=mesh.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,mask=new Float32Array(si.count),ref=new Float32Array(si.count*3),normal=new Float32Array(si.count*3);
      const hipsAreGarment=mesh.material.name!=='Material_lower_body'||/^Spring_/.test(mesh.name);
      const nrmMatrix=new THREE.Matrix3().getNormalMatrix(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
      for(let i=0;i<si.count;i++){
        mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse).sub(hips).toArray(ref,i*3);
        v.fromBufferAttribute(g.attributes.normal,i).applyNormalMatrix(nrmMatrix).toArray(normal,i*3);
        for(let k=0;k<4;k++){
          const name=mesh.skeleton.bones[si.getComponent(i,k)].name;
          if(/^DS_skirt/.test(name)||(hipsAreGarment&&name==='hips'))mask[i]+=sw.getComponent(i,k);
        }
      }
      g.setAttribute('seatedDrape',new THREE.BufferAttribute(mask,1));
      g.setAttribute('seatReference',new THREE.BufferAttribute(ref,3));
      g.setAttribute('seatReferenceNormal',new THREE.BufferAttribute(normal,3));
      mesh.userData.seatedDrape=this;this.meshes.push(mesh);
      if(!materials.has(mesh.material)){this.patch(mesh.material);materials.add(mesh.material);}
      const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});this.patch(depth);mesh.customDepthMaterial=depth;
    });
  }
  patch(material){
    const original=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey.bind(material);
    material.onBeforeCompile=(shader,renderer)=>{
      original(shader,renderer);Object.assign(shader.uniforms,this.uniforms);
      shader.vertexShader=SEATED_UNIFORMS+shader.vertexShader.replace('#include <project_vertex>',SEATED_POSITION+'\n#include <project_vertex>').replace('#include <skinnormal_vertex>','#include <skinnormal_vertex>\n'+SEATED_NORMAL);
    };
    material.customProgramCacheKey=()=>key()+'-seated-drape-v3';material.needsUpdate=true;
  }
  enter(){this.entered=true;this.uniforms.uSeated.value=1;}
  apply(){this.hero.group.updateWorldMatrix(true,true);this.uniforms.uSeatInverse.value.copy(this.hero.group.matrixWorld).invert();}
  deformWorld(point,weight,mesh,index){
    if(!this.entered||weight<.001)return point;
    const reference=this.reference.fromBufferAttribute(mesh.geometry.attributes.seatReference,index),t=Math.max(0,Math.min(1,(reference.y-C.top+.08)/.10)),blend=weight*(1-t*t*(3-2*t));
    point.applyMatrix4(this.uniforms.uSeatInverse.value).lerp(this.frame.deform(reference,this.destination),blend);
    return point.applyMatrix4(this.uniforms.uSeatWorld.value);
  }
  leave(){this.entered=false;this.uniforms.uSeated.value=0;}
}
