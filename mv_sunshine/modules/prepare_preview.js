// Prepare actor materials and both standing/seated depth paths while the
// loading cover is still present. This draws into the existing webpage only.
export async function preparePreview(game){
  const {director,renderer,camera,pipeline}=game,start=performance.now(),stages=[];
  const representatives=['stand_pad','fly_world'].map(mode=>director.timeline.shots.find(s=>s.mode===mode)).filter(Boolean);
  for(const shot of representatives){
    const at=performance.now();director.lastTime=-999;
    director.seekAndStep(shot.start+.05,{realtime:true});
    const previous=renderer.getRenderTarget();renderer.setRenderTarget(pipeline.compRT);
    try{await renderer.compileAsync(pipeline.overlay,camera);}finally{renderer.setRenderTarget(previous);}
    game.renderScene(1/60);
    renderer.getContext().finish();
    await new Promise(resolve=>requestAnimationFrame(resolve));
    stages.push({shot:shot.id,ms:performance.now()-at});
  }
  director.lastTime=-999;director.seekAndStep(0,{realtime:true});
  pipeline.hasPrev=false;game.renderScene(1/60);
  game.previewPreparation={ms:performance.now()-start,stages};
}
