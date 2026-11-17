import * as THREE from 'three';

const cell=.12;
const eachCell=(box,fn)=>{
  for(let x=Math.floor(box.min.x/cell);x<=Math.floor(box.max.x/cell);x++)for(let y=Math.floor(box.min.y/cell);y<=Math.floor(box.max.y/cell);y++)for(let z=Math.floor(box.min.z/cell);z<=Math.floor(box.max.z/cell);z++)fn(`${x},${y},${z}`);
};

// Check the deformed sleeve/hand surfaces against the deformed torso, excluding
// their intentional shoulder join. Skin weights separate parts of a shared mesh.
export class ArmSurfaceCheck {
  constructor(hero){
    this.hero=hero;this.sources=[];
    const roots=['leftUpperArm','rightUpperArm'].map(k=>hero.vrm.humanoid.getRawBoneNode(k));
    const distalRoots=['leftLowerArm','rightLowerArm'].map(k=>hero.vrm.humanoid.getRawBoneNode(k));
    const isArm=bone=>{for(let p=bone;p;p=p.parent)if(roots.includes(p))return true;return false;};
    const isDistal=bone=>{for(let p=bone;p;p=p.parent)if(distalRoots.includes(p))return true;return false;};
    hero.vrm.scene.traverse(mesh=>{
      if(!mesh.isSkinnedMesh||!['Material_upper_body','Material_skin_unified'].includes(mesh.material?.name))return;
      const g=mesh.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,idx=g.index.array;
      const arm=new Float32Array(si.count),distal=new Float32Array(si.count);
      for(let i=0;i<si.count;i++)for(let j=0;j<4;j++){
        const bone=mesh.skeleton.bones[si.getComponent(i,j)];
        if(isArm(bone))arm[i]+=sw.getComponent(i,j);
        if(isDistal(bone))distal[i]+=sw.getComponent(i,j);
      }
      const arms=[],torso=[];
      for(let i=0;i<idx.length;i+=3){const ids=[idx[i],idx[i+1],idx[i+2]];
        if(ids.every(k=>arm[k]>.75))arms.push(...ids);
        else if(ids.every(k=>arm[k]<.015))torso.push(...ids);
      }
      this.sources.push({mesh,arms,torso,distal});
    });
  }

  check(){
    const h=this.hero;
    h.group.updateWorldMatrix(true,true);
    // SkinnedMesh.updateMatrixWorld refreshes its attached bindMatrixInverse;
    // updateWorldMatrix alone leaves CPU skinning stale between flight frames.
    h.vrm.scene.updateMatrixWorld(true);
    const inv=h.group.matrixWorld.clone().invert(),v=new THREE.Vector3();
    const shoulders=['leftUpperArm','rightUpperArm'].map(k=>h.vrm.humanoid.getNormalizedBoneNode(k).getWorldPosition(new THREE.Vector3()).applyMatrix4(inv));
    const hip=h.vrm.humanoid.getNormalizedBoneNode('hips').getWorldPosition(v).applyMatrix4(inv).y;
    const neck=h.vrm.humanoid.getNormalizedBoneNode('neck').getWorldPosition(v).applyMatrix4(inv).y;
    const torso=[],arms=[],cells=new Map(),box=new THREE.Box3();
    for(const source of this.sources){
      const used=new Set([...source.torso,...source.arms]),vertices=new Map();
      for(const id of used){
        source.mesh.getVertexPosition(id,v).applyMatrix4(source.mesh.matrixWorld);
        source.mesh.userData.seatedDrape?.deformWorld(v,source.mesh.geometry.attributes.seatedDrape.getX(id),source.mesh,id);
        v.applyMatrix4(inv);vertices.set(id,v.clone());
      }
      for(const kind of ['torso','arms'])for(let i=0;i<source[kind].length;i+=3){
        const p=source[kind].slice(i,i+3).map(id=>vertices.get(id));box.setFromPoints(p);
        if(box.max.y<hip+.035||box.min.y>neck+.02)continue;
        const record={tri:new THREE.Triangle(...p),box:box.clone(),distal:source[kind].slice(i,i+3).reduce((v,id)=>v+source.distal[id],0)/3>.5};
        if(kind==='arms')arms.push(record);else{const id=torso.length;torso.push(record);eachCell(box,key=>{let list=cells.get(key);if(!list)cells.set(key,list=[]);list.push(id);});}
      }
    }
    const ray=new THREE.Ray(),dir=new THREE.Vector3(),hit=new THREE.Vector3();
    const segmentHits=(a,b,t)=>{
      dir.copy(b).sub(a);const length=dir.length();ray.set(a,dir.normalize());
      if(!ray.intersectTriangle(t.a,t.b,t.c,false,hit))return false;
      const d=hit.distanceTo(a);
      return d>.001&&d<length-.001&&shoulders.every(p=>p.distanceTo(hit)>.23);
    };
    let intersections=0,pairs=0,distalIntersections=0,maxShoulderDistance=0;const examples=[];
    for(const arm of arms){
      const ids=new Set();eachCell(arm.box,key=>{for(const id of cells.get(key)||[])ids.add(id);});
      for(const id of ids){const body=torso[id];if(!body.box.intersectsBox(arm.box))continue;pairs++;
        const a=arm.tri,b=body.tri;
        if(segmentHits(a.a,a.b,b)||segmentHits(a.b,a.c,b)||segmentHits(a.c,a.a,b)||segmentHits(b.a,b.b,a)||segmentHits(b.b,b.c,a)||segmentHits(b.c,b.a,a)){
          intersections++;if(arm.distal)distalIntersections++;
          maxShoulderDistance=Math.max(maxShoulderDistance,Math.min(...shoulders.map(p=>p.distanceTo(hit))));
          if(examples.length<3)examples.push(hit.toArray());
        }
      }
    }
    return {armTriangles:arms.length,torsoTriangles:torso.length,pairs,intersections,distalIntersections,maxShoulderDistance,examples,shoulderJoinExcluded:.23};
  }
}
