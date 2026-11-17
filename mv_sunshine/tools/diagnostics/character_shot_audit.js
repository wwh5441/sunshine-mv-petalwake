import * as THREE from 'three';
import { broomGrip } from '../../modules/character/broom_rig.js';
import { HERO_FLIGHT } from '../../data/hero_flight.js';

const armNames=['leftUpperArm','leftLowerArm','leftHand','leftMiddleDistal','rightUpperArm','rightLowerArm','rightHand','rightMiddleDistal'];

// Continuous pose sampling plus independently intersecting the deformed meshes.
// This is a browser diagnostic, with still screenshots only; no video export.
export function auditCharacterShot(game,shot,surface,town,props,steps=60,options={}){
  const h=game.princess,d=game.director,point=new THREE.Vector3(),world=new THREE.Vector3();
  const result={id:shot.id,start:shot.start,end:shot.end,mode:shot.mode,samples:0,maxScreenX:0,maxScreenY:0,maxHandError:0,minCameraClearance:1,armSurfaceIntersections:0,distalIntersections:0,armSceneContacts:[],occlusions:[],surfaceExamples:[],lipRange:[1,0],snapshots:[]};
  d.lastTime=-999;
  for(let i=0;i<=steps;i++){
    const t=shot.start+(shot.end-shot.start)*(.001+.998*i/steps);
    d.seekAndStep(t,options);h.group.updateWorldMatrix(true,true);game.camera.updateMatrixWorld(true);
    const geo=surface.check();
    result.armSurfaceIntersections+=geo.intersections;result.distalIntersections+=geo.distalIntersections;
    if(geo.intersections&&result.surfaceExamples.length<4)result.surfaceExamples.push({t,...geo});
    result.minCameraClearance=Math.min(result.minCameraClearance,town.clearance(game.camera.position,1).distance,props.clearance(game.camera.position,1).distance);
    for(const name of armNames){
      h.flightPose.bones[name].getWorldPosition(world);point.copy(world).project(game.camera);
      result.maxScreenX=Math.max(result.maxScreenX,Math.abs(point.x));result.maxScreenY=Math.max(result.maxScreenY,Math.abs(point.y));
      if(shot.mode==='stand_pad' && /LowerArm|Hand/.test(name)){
        if(town.segment(game.camera.position,world).blocked||props.segment(game.camera.position,world).blocked)result.occlusions.push({t,name});
        const radius=/Hand/.test(name)?.025:.045;
        const clearance=Math.min(town.clearance(world,radius).distance,props.clearance(world,radius).distance);
        if(clearance<radius-.002)result.armSceneContacts.push({t,name,clearance});
      }
    }
    for(const side of ['left','right']){
      h.flightPose.bones[side+'Hand'].getWorldPosition(point);
      if(shot.mode!=='stand_pad'){
        // The shaft touches the palm, not the wrist bone at its outer edge.
        const palmOffset=new THREE.Vector3(side==='left'?1:-1,0,0).multiplyScalar(HERO_FLIGHT.grip.palmOffset).applyQuaternion(h.group.getWorldQuaternion(new THREE.Quaternion()));
        palmOffset.multiplyScalar(h.group.getWorldScale(new THREE.Vector3()).x);
        point.add(palmOffset);
      }
      const target=shot.mode==='stand_pad'?new THREE.Vector3(...h.armPose.last[side].target):h.group.localToWorld(broomGrip(side));
      result.maxHandError=Math.max(result.maxHandError,point.distanceTo(target));
    }
    const mouth=['aa','ih','ou','ee','oh'].reduce((v,k)=>v+h.vrm.expressionManager.getValue(k),0);
    result.lipRange[0]=Math.min(result.lipRange[0],mouth);result.lipRange[1]=Math.max(result.lipRange[1],mouth);
    result.samples++;
    if([3,30,57].includes(i))result.snapshots.push({t,base64:window.captureMVFrame(t,'image/jpeg',.91)});
  }
  return result;
}
