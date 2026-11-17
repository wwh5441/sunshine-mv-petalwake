import * as THREE from 'three';

// Diagnostic-only spatial index of the original, decoded town triangles.
// This includes side walls, eaves and railings that the roof height field misses.
export class SceneQueries {
  constructor(town, bounds, cellSize=1) {
    this.bounds=bounds;this.cellSize=cellSize;this.cells=new Map();this.triangles=[];
    const vertex=new THREE.Vector3(),box=new THREE.Box3();
    const roots=Array.isArray(town)?town:[town.group];
    for(const root of roots){
    root.updateWorldMatrix(true,true);
    root.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.geometry.index)return;
      const p=mesh.geometry.attributes.position,idx=mesh.geometry.index.array;
      if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
      box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
      if(!bounds.intersectsBox(box))return;
      const points=new Float32Array(p.count*3);
      for(let i=0;i<p.count;i++)vertex.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).toArray(points,i*3);
      for(let i=0;i<idx.length;i+=3){
        const a=new THREE.Vector3().fromArray(points,idx[i]*3),b=new THREE.Vector3().fromArray(points,idx[i+1]*3),c=new THREE.Vector3().fromArray(points,idx[i+2]*3);
        box.setFromPoints([a,b,c]);if(!bounds.intersectsBox(box))continue;
        const id=this.triangles.length;this.triangles.push(new THREE.Triangle(a,b,c));
        this.eachCell(box,key=>{let list=this.cells.get(key);if(!list)this.cells.set(key,list=[]);list.push(id);});
      }
    });
    }
  }

  eachCell(box,fn){
    const c=this.cellSize;
    for(let x=Math.floor(box.min.x/c);x<=Math.floor(box.max.x/c);x++)for(let y=Math.floor(box.min.y/c);y<=Math.floor(box.max.y/c);y++)for(let z=Math.floor(box.min.z/c);z<=Math.floor(box.max.z/c);z++)fn(`${x},${y},${z}`);
  }
  candidates(box){const ids=new Set();this.eachCell(box,k=>{for(const id of this.cells.get(k)||[])ids.add(id);});return ids;}
  clearance(point,radius=1){
    const box=new THREE.Box3().setFromCenterAndSize(point,new THREE.Vector3().setScalar(radius*2)),out=new THREE.Vector3();
    let distance=radius,closest=null;
    for(const id of this.candidates(box)){const tri=this.triangles[id];tri.closestPointToPoint(point,out);const d=out.distanceTo(point);if(d<distance){distance=d;closest=out.clone();}}
    return {distance,closest};
  }
  segment(start,end,padding=.0){
    const box=new THREE.Box3().setFromPoints([start,end]).expandByScalar(padding),d=end.clone().sub(start),length=d.length(),ray=new THREE.Ray(start,d.normalize()),point=new THREE.Vector3();
    let distance=length,closest=null;
    for(const id of this.candidates(box)){const t=this.triangles[id];if(!ray.intersectTriangle(t.a,t.b,t.c,false,point))continue;const hit=point.distanceTo(start);if(hit>.002&&hit<distance-.002){distance=hit;closest=point.clone();}}
    return {blocked:!!closest,distance,closest};
  }
}
