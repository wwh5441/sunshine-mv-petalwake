import * as THREE from 'three';
import {LYRIC_PROTECTION as C,LYRIC_PROP_TARGETS,LYRIC_SCENE_REGIONS} from '../../data/lyric_protection_targets.js';

function targetObjects(game,shot){
  const objects=[];
  if(shot.mode!=='unmanned')objects.push(game.princess.group);
  if(shot.mode.startsWith('fly'))objects.push(game.heroBroom);
  for(const [name,...children]of LYRIC_PROP_TARGETS[shot.id]||[]){let object=game.scannedSets.stageObjects[name];for(const child of children)object=object?.children[child];if(object)objects.push(object);}
  if(shot.id==='IMG-30')objects.push(game.scannedSets.bike);
  return objects.filter(Boolean);
}
function dilate(mask){
  const out=mask.slice();
  for(let y=0;y<C.height;y++)for(let x=0;x<C.width;x++)if(mask[y*C.width+x]){
    for(let dy=-C.padding;dy<=C.padding;dy++)for(let dx=-C.padding;dx<=C.padding;dx++){
      const xx=x+dx,yy=y+dy;if(xx>=0&&xx<C.width&&yy>=0&&yy<C.height)out[yy*C.width+xx]=1;
    }
  }
  return out;
}
function spans(mask){
  return Array.from({length:C.height},(_,y)=>{const row=[];let start=-1;for(let x=0;x<=C.width;x++){
    const occupied=x<C.width&&mask[y*C.width+x];
    if(occupied&&start<0)start=x;
    if(!occupied&&start>=0){row.push(start,x);start=-1;}
  }return row;});
}

// Offline diagnostic only: sample each lyrical shot/line segment's actual
// rendered actor/prop silhouettes. The live player only reads the compact mask.
export function sampleLyricProtection(game){
  const r=game.renderer,rt=new THREE.WebGLRenderTarget(C.width,C.height,{format:THREE.RGBAFormat,depthBuffer:true});
  const pixels=new Uint8Array(C.width*C.height*4),segments=[];
  const state={target:r.getRenderTarget(),clear:r.getClearColor(new THREE.Color()).clone(),alpha:r.getClearAlpha(),auto:r.autoClear,shadow:r.shadowMap.enabled};
  try{
    for(const line of game.director.timeline.lyrics)for(const shot of game.director.timeline.shots){
      const start=Math.max(line.start,shot.start),end=Math.min(line.end,shot.end);if(end<=start)continue;
      let mask=new Uint8Array(C.width*C.height);game.director.lastTime=-999;
      const objects=targetObjects(game,shot);
      for(let i=0;i<C.samples;i++){
        const t=start+(end-start)*(.002+.996*i/(C.samples-1));
        game.director.seekAndStep(t,{realtime:true});game.princess.hairClearance.update();game.camera.updateMatrixWorld(true);
        r.setRenderTarget(rt);r.setClearColor(0,0);r.autoClear=false;r.shadowMap.enabled=false;r.clear(true,true,true);
        for(const object of objects)r.render(object,game.camera);
        r.readRenderTargetPixels(rt,0,0,C.width,C.height,pixels);
        for(let y=0;y<C.height;y++)for(let x=0;x<C.width;x++)if(pixels[((C.height-1-y)*C.width+x)*4+3]>C.alphaThreshold)mask[y*C.width+x]=1;
      }
      for(const [x,y,w,h]of LYRIC_SCENE_REGIONS[shot.id]||[])for(let yy=Math.floor(y*C.height);yy<Math.ceil((y+h)*C.height);yy++)for(let xx=Math.floor(x*C.width);xx<Math.ceil((x+w)*C.width);xx++)mask[yy*C.width+xx]=1;
      const coreRows=spans(mask);mask=dilate(mask);
      // Demo HUD and frame-edge padding are protected too.
      for(let y=0;y<C.height;y++)for(let x=0;x<C.width;x++)if(y<11||y>C.height-5||x<4||x>C.width-5)mask[y*C.width+x]=1;
      segments.push({key:`${line.index}:${shot.id}`,line:line.index,shot:shot.id,actor:shot.mode!=='unmanned',start,end,coreRows,rows:spans(mask)});
    }
  }finally{r.setRenderTarget(state.target);r.setClearColor(state.clear,state.alpha);r.autoClear=state.auto;r.shadowMap.enabled=state.shadow;rt.dispose();}
  return {version:1,sourceRevision:game.director.timeline.meta.revision,width:C.width,height:C.height,referenceAspect:.75,samplesPerSegment:C.samples,paddingPixels:C.padding,segments};
}
