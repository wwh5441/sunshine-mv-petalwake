import * as THREE from 'three';
import { BROOM_RIG } from '../../data/broom_rig.js';

export const broomAxis = new THREE.CatmullRomCurve3(BROOM_RIG.curve.map(p=>new THREE.Vector3(...p)));
export function broomSeat(target=new THREE.Vector3()){
  return broomAxis.getPoint(BROOM_RIG.seat.t,target).add(new THREE.Vector3(...BROOM_RIG.seat.pelvisOffset));
}
export function broomGrip(side, target = new THREE.Vector3()) {
  const grip=BROOM_RIG.grips[side];
  broomAxis.getPoint(grip.t,target);
  target.x+=grip.side;
  target.y+=BROOM_RIG.handleRadius*.6;
  return target;
}
