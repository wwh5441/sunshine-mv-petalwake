import * as THREE from 'three';
import { BROOM_RIG } from '../../data/broom_rig.js';
import { broomAxis,broomSeat } from '../../modules/character/broom_rig.js';

function posedMesh(hero,source,index=source.geometry.index){
  const points=new Float32Array(source.geometry.attributes.position.count*3),v=new THREE.Vector3();
  for(let i=0;i<points.length/3;i++){
    source.getVertexPosition(i,v).applyMatrix4(source.matrixWorld);
    source.userData.seatedDrape?.deformWorld(v,source.geometry.attributes.seatedDrape.getX(i),source,i);
    hero.group.worldToLocal(v).toArray(points,i*3);
  }
  const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(points,3));
  geometry.setIndex(index);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  mesh.updateMatrixWorld();
  return mesh;
}

// Separate the outer dress from its apron, lace and ornaments. Weld the UV
// seams in reference space, then select the component spanning waist to hem.
function outerShellIndex(source){
  const g=source.geometry,ref=g.attributes.seatReference,n=ref.count;
  const parent=Array.from({length:n},(_,i)=>i),seen=new Map();
  const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  const join=(i,j)=>{parent[root(i)]=root(j);};
  for(let i=0;i<g.index.count;i+=3){join(g.index.array[i],g.index.array[i+1]);join(g.index.array[i],g.index.array[i+2]);}
  for(let i=0;i<n;i++){
    const key=[ref.getX(i),ref.getY(i),ref.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
    if(seen.has(key))join(i,seen.get(key));else seen.set(key,i);
  }
  const components=new Map();
  for(let i=0;i<n;i++){
    const id=root(i),c=components.get(id)||{id,minY:Infinity,maxY:-Infinity,count:0};
    c.minY=Math.min(c.minY,ref.getY(i));c.maxY=Math.max(c.maxY,ref.getY(i));c.count++;
    components.set(id,c);
  }
  const shell=[...components.values()].filter(c=>c.maxY>.08&&c.minY<-.8).sort((a,b)=>b.count-a.count)[0];
  if(!shell)throw new Error('Outer waist-to-hem cloth component not found');
  const index=[];
  for(let i=0;i<g.index.count;i+=3)if(root(g.index.array[i])===shell.id)index.push(...g.index.array.slice(i,i+3));
  return index;
}

const dispose=mesh=>{mesh.geometry.dispose();mesh.material.dispose();};

function intersectSurfaces(a,b){
  const size=.10,cells=new Map(),triangles=[],box=new THREE.Box3(),p=new THREE.Vector3();
  const each=(box,fn)=>{for(let x=Math.floor(box.min.x/size);x<=Math.floor(box.max.x/size);x++)for(let y=Math.floor(box.min.y/size);y<=Math.floor(box.max.y/size);y++)for(let z=Math.floor(box.min.z/size);z<=Math.floor(box.max.z/size);z++)fn(`${x},${y},${z}`);};
  const triangle=(m,i)=>new THREE.Triangle(...[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,m.geometry.index.getX(i+k))));
  for(let i=0;i<a.geometry.index.count;i+=3){
    const tri=triangle(a,i);box.setFromPoints([tri.a,tri.b,tri.c]);
    const id=triangles.length;triangles.push({tri,box:box.clone()});
    each(box,key=>{let list=cells.get(key);if(!list)cells.set(key,list=[]);list.push(id);});
  }
  const ray=new THREE.Ray(),direction=new THREE.Vector3(),hits=[];
  const edge=(a,b,t)=>{
    direction.copy(b).sub(a);const length=direction.length();ray.set(a,direction.normalize());
    if(!ray.intersectTriangle(t.a,t.b,t.c,false,p))return false;
    const d=p.distanceTo(a);return d>.0002&&d<length-.0002;
  };
  for(let i=0;i<b.geometry.index.count;i+=3){
    const t=triangle(b,i);box.setFromPoints([t.a,t.b,t.c]);const ids=new Set();
    each(box,key=>{for(const id of cells.get(key)||[])ids.add(id);});
    for(const id of ids){const r=triangles[id];if(!box.intersectsBox(r.box))continue;const q=r.tri;
      if(edge(t.a,t.b,q)||edge(t.b,t.c,q)||edge(t.c,t.a,q)||edge(q.a,q.b,t)||edge(q.b,q.c,t)||edge(q.c,q.a,t))hits.push(p.toArray());
    }
  }
  return {count:hits.length,examples:hits.slice(0,12),range:hits.length?new THREE.Box3().setFromPoints(hits.map(p=>new THREE.Vector3(...p))):null};
}

// An independent test of the actual posed leg vertices and triangle centres.
// Horizontal ray parity avoids treating the open waist/hem as closed caps.
export function auditSeatedGarment(hero){
  const sources=hero.flightPose.skirt.meshes;
  const skirt=sources.find(m=>m.name==='Spring_59_skirt'),body=sources.find(m=>m.name==='body_00001001_1');
  const shell=posedMesh(hero,skirt,outerShellIndex(skirt)),legs=posedMesh(hero,body),allCloth=posedMesh(hero,skirt);
  const hips=hero.group.worldToLocal(hero.flightPose.bones.hips.getWorldPosition(new THREE.Vector3()));
  const positions=legs.geometry.attributes.position,samples=[],v=new THREE.Vector3();
  const select=p=>{if(p.y>hips.y-.70&&p.y<hips.y+.025)samples.push(p.clone());};
  for(let i=0;i<positions.count;i++)select(v.fromBufferAttribute(positions,i));
  const ids=legs.geometry.index;
  for(let i=0;i<ids.count;i+=3){
    const a=new THREE.Vector3().fromBufferAttribute(positions,ids.getX(i));
    const b=new THREE.Vector3().fromBufferAttribute(positions,ids.getX(i+1));
    const c=new THREE.Vector3().fromBufferAttribute(positions,ids.getX(i+2));
    select(a.add(b).add(c).multiplyScalar(1/3));
  }
  const ray=new THREE.Raycaster(),directions=[new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,1)],outside=[];
  let disagreements=0;
  for(const point of samples){
    const inside=directions.map(direction=>{
      ray.set(point,direction);let previous=-Infinity,count=0;
      for(const hit of ray.intersectObject(shell))if(hit.distance-previous>1e-5){count++;previous=hit.distance;}
      return count%2===1;
    });
    if(inside[0]!==inside[1])disagreements++;
    if(!inside.some(Boolean))outside.push(point.toArray());
  }
  const seat=broomAxis.getPoint(BROOM_RIG.seat.t),radius=BROOM_RIG.handleRadius;
  ray.set(seat.clone().add(new THREE.Vector3(0,-.5,0)),new THREE.Vector3(0,1,0));
  const butt=ray.intersectObject(legs).find(hit=>hit.point.y>seat.y-.05);
  const scale=hero.group.getWorldScale(new THREE.Vector3()).x;
  const bands=[[-.50,-.40],[-.40,-.30],[-.30,-.20],[-.20,-.10],[-.10,0],[0,.10],[.10,.25]].map(([min,max])=>({min,max,outside:outside.filter(p=>p[1]>=min&&p[1]<max).length,examples:outside.filter(p=>p[1]>=min&&p[1]<max).slice(0,2)}));
  const intersections=intersectSurfaces(allCloth,legs);
  const result={samples:samples.length,outside:outside.length,disagreements,bands,examples:outside.slice(0,12),intersections,seatSurfaceGap:butt?(butt.point.y-seat.y-radius)*scale:null,pelvisTargetError:hips.distanceTo(broomSeat())*scale};
  dispose(shell);dispose(legs);dispose(allCloth);
  return result;
}
