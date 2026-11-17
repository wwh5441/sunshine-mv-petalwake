import * as THREE from 'three';

function fieldAt(surface,p){
  const c=surface.config,px=(p.x-c.minX)/(c.maxX-c.minX)*c.width-.5,py=(p.y-c.minY)/(c.maxY-c.minY)*c.height-.5;
  const x=Math.floor(px),y=Math.floor(py),tx=px-x,ty=py-y,out=[0,0,0];
  for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){
    const at=(Math.max(0,Math.min(c.height-1,y+dy))*c.width+Math.max(0,Math.min(c.width-1,x+dx)))*4;
    const weight=(dx?tx:1-tx)*(dy?ty:1-ty);for(let k=0;k<3;k++)out[k]+=surface.pixels[at+k]*weight;
  }
  return out;
}

// CPU observation of the final vertex shader, followed by a separate comparison
// against real garment triangles in hair_surface_check.js.
export function correctedHairPoint(hero,mesh,index,target=new THREE.Vector3()){
  mesh.getVertexPosition(index,target).applyMatrix4(mesh.matrixWorld);
  const guard=hero.hairClearance;
  if(guard.uniforms.uGarmentEnabled.value<.5)return target;
  const ab=new THREE.Vector3(),nearest=new THREE.Vector3(),delta=new THREE.Vector3();
  for(let i=0;i<4;i++){
    const a=guard.arms.starts[i],b=guard.arms.ends[i];
    ab.set(b.x-a.x,b.y-a.y,b.z-a.z);delta.set(target.x-a.x,target.y-a.y,target.z-a.z);
    const t=Math.max(.08,Math.min(1,delta.dot(ab)/Math.max(ab.lengthSq(),.000001)));
    nearest.set(a.x,a.y,a.z).addScaledVector(ab,t);delta.copy(target).sub(nearest);
    const distance=delta.length(),push=Math.max(0,a.w-distance);
    if(push&&distance>.00001)target.addScaledVector(delta,push/distance);
  }
  for(const [surface,attribute] of [[guard.surface,'garmentGuard'],[guard.skirtSurface,'skirtGuard']]){
    const side=mesh.geometry.attributes[attribute].getX(index),p=target.clone().applyMatrix4(surface.inverseWorld),c=surface.config;
    if(Math.abs(side)<.5||p.x<c.minX||p.x>c.maxX||p.y<c.minY||p.y>c.maxY)continue;
    const f=fieldAt(surface,p);
    p.z+=(side<0?-Math.max(0,p.z-f[0]+c.clearance):Math.max(0,f[1]+c.clearance-p.z))*f[2];
    target.copy(p).applyMatrix4(surface.world);
  }
  for(let i=0;i<4;i++){
    const a=guard.arms.starts[i],b=guard.arms.ends[i];
    ab.set(b.x-a.x,b.y-a.y,b.z-a.z);delta.set(target.x-a.x,target.y-a.y,target.z-a.z);
    const t=Math.max(.08,Math.min(1,delta.dot(ab)/Math.max(ab.lengthSq(),.000001)));
    nearest.set(a.x,a.y,a.z).addScaledVector(ab,t);delta.copy(target).sub(nearest);
    const distance=delta.length(),push=Math.max(0,a.w-distance);
    if(push&&distance>.00001)target.addScaledVector(delta,push/distance);
  }
  return target;
}
