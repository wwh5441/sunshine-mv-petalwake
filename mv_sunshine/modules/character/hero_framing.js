import * as THREE from 'three';
import { HERO_FRAMING as C } from '../../data/hero_framing.js';

const inverse=new THREE.Matrix4(),point=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3();

// A small optical correction follows authored arm gestures without moving the
// camera through the balcony. Wide shots keep their original size and route.
export function frameHero(game, look) {
  const h=game.princess,cam=game.camera,points=[];
  h.group.updateWorldMatrix(true,true);cam.updateMatrixWorld(true);
  for(const name of C.bones){
    const b=h.vrm.humanoid.getNormalizedBoneNode(name);if(!b)continue;
    const p=b.getWorldPosition(new THREE.Vector3());points.push(p);
    if(name==='head')points.push(p.clone().add(new THREE.Vector3(0,C.headClearance,0)));
    if(/Hand|Distal/.test(name)){
      points.push(p.clone().add(new THREE.Vector3(C.handClearance,0,0)));
      points.push(p.clone().add(new THREE.Vector3(-C.handClearance,0,0)));
    }
  }
  inverse.copy(cam.matrixWorld).invert();
  const tan=Math.tan(cam.fov*Math.PI/360),asp=cam.aspect;
  const ox=cam.view?.enabled?-2*cam.view.offsetX/cam.view.width:0,oy=cam.view?.enabled?2*cam.view.offsetY/cam.view.height:0;
  let left=Infinity,rightEdge=-Infinity,bottom=Infinity,top=-Infinity;
  for(const p of points){point.copy(p).applyMatrix4(inverse);if(point.z>=-.05)continue;
    const x=point.x/(-point.z*tan*asp)+ox,y=point.y/(-point.z*tan)+oy;
    left=Math.min(left,x);rightEdge=Math.max(rightEdge,x);bottom=Math.min(bottom,y);top=Math.max(top,y);
  }
  const shift=(lo,hi,limit)=>lo < -limit && hi > limit ? (lo+hi)*.5 : lo < -limit ? lo+limit : hi > limit ? hi-limit : 0;
  const dx=shift(left,rightEdge,C.horizontal),dy=shift(bottom,top,C.vertical);
  if(Math.abs(dx)+Math.abs(dy)>.0001){
    const distance=cam.position.distanceTo(look);
    right.setFromMatrixColumn(cam.matrixWorld,0);up.setFromMatrixColumn(cam.matrixWorld,1);
    look.addScaledVector(right,dx*distance*tan*asp).addScaledVector(up,dy*distance*tan);
    cam.lookAt(look);cam.updateMatrixWorld(true);
    inverse.copy(cam.matrixWorld).invert();
  }
  let required=tan;
  for(const p of points){point.copy(p).applyMatrix4(inverse);if(point.z>=-.05)continue;
    const lx=Math.max(.15,C.horizontal-(point.x>=0?ox:-ox)),ly=Math.max(.15,C.vertical-(point.y>=0?oy:-oy));
    required=Math.max(required,Math.abs(point.x/point.z)/(asp*lx),Math.abs(point.y/point.z)/ly);
  }
  game.fov=Math.max(game.fov,2*Math.atan(required)*180/Math.PI);game.applyFov();
}
