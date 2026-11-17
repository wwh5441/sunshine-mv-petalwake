// Instrument the real audio-driven player without capturing or exporting video.
export function installPlaybackProfile(game){
  const d=game.director,profile={rows:[],calls:0,poseMs:0,directorMs:0,renderMs:0,garmentMs:0,overlayMs:0},restore=[];
  for(const [obj,key,label]of [[d,'_poseAt','poseMs'],[d,'seekAndStep','directorMs'],[game,'renderScene','renderMs'],[game.princess.hairClearance,'update','garmentMs'],[game.overlay2d,'render','overlayMs']]){
    if(!obj)continue;
    const original=obj[key];restore.push(()=>{obj[key]=original;});
    obj[key]=function(...args){const start=performance.now(),result=original.apply(this,args);profile[label]+=performance.now()-start;if(key==='_poseAt')profile.calls++;return result;};
  }
  return {
    restore:()=>restore.forEach(fn=>fn()),
    measure:(start,end)=>new Promise(async(resolve,reject)=>{
      const p=game.player;p.pause();p.seek(start);await p.play();
      if(p.audio.paused){reject(new Error('Real audio did not start'));return;}
      let prior=performance.now();const deadline=prior+(end-start+8)*1000;profile.rows=[];
      const frame=now=>{
        profile.rows.push({t:p.audio.currentTime,interval:now-prior,calls:profile.calls,pose:profile.poseMs,director:profile.directorMs,render:profile.renderMs,garment:profile.garmentMs,overlay:profile.overlayMs,shot:d.activeShotId});
        prior=now;profile.calls=profile.poseMs=profile.directorMs=profile.renderMs=profile.garmentMs=profile.overlayMs=0;
        if(p.audio.currentTime>=end){p.pause();resolve(profile.rows);}
        else if(now>deadline){p.pause();reject(new Error('Playback profiling timed out'));}
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }),
  };
}
