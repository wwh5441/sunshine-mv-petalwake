import {LYRIC_CAMERA} from '../../data/lyric_camera.js';
export function applyLyricCamera(game,shot){
  const c=LYRIC_CAMERA[shot.id],camera=game.camera;
  if(c){game.fov=Math.max(game.fov,c.minFov);const h=1/camera.aspect;camera.setViewOffset(1,h,-c.shiftX,c.shiftY*h,1,h);}
  else if(camera.view?.enabled)camera.clearViewOffset();
}
