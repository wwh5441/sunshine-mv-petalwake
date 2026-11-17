import { LYRIC_GESTURES,ARM_MOTION as C } from '../../data/hero_performance.js';

const ease=v=>{const t=Math.max(0,Math.min(1,v));return t*t*t*(t*(t*6-15)+10);};

// Blend complete gesture envelopes on the song clock. A second word starts
// from the currently weighted pose, instead of jumping to a full first pose.
// Releases extend across line boundaries; hands follow the arm by 120 ms.
export class GestureTimeline {
  constructor(lines){
    this.cues=[];
    for(const line of lines){
      const text=line.text.replace(/[，。\s]/g,''),rule=LYRIC_GESTURES.find(r=>text.includes(r.match));
      if(!rule)continue;
      const onset=word=>{const index=line.syllables.map(c=>c.text).join('').indexOf(word);return index<0?line.start:line.syllables[index].start;};
      const entries=[{word:rule.word,pose:rule.pose},...(rule.then?[rule.then]:[])];
      for(const entry of entries)this.cues.push({pose:entry.pose,start:onset(entry.word)-C.anticipation,release:line.end-.20,end:line.end+C.recovery});
    }
    this.cues.sort((a,b)=>a.start-b.start);
  }
  weights(time){
    const weights={rest:1};
    for(const cue of this.cues){
      if(time<cue.start)break;
      if(time>=cue.end)continue;
      const w=ease((time-cue.start)/C.transition)*(1-ease((time-cue.release)/(cue.end-cue.release)));
      for(const key of Object.keys(weights))weights[key]*=1-w;
      weights[cue.pose]=(weights[cue.pose]||0)+w;
    }
    return weights;
  }
  sample(time){
    const gestureWeights=this.weights(time),handWeights=this.weights(time-C.handDelay);
    const active=Object.entries(gestureWeights).filter(([key])=>key!=='rest').sort((a,b)=>b[1]-a[1])[0];
    return {gestureWeights,handWeights,gesture:active?.[1]>.001?active[0]:'rest',gestureMix:active?.[1]||0,recovery:1};
  }
}
