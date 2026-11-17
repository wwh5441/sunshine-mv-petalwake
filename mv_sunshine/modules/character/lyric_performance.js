import { GestureTimeline } from './gesture_timeline.js';

const clamp = v => Math.max(0, Math.min(1, v));
const smooth = v => { const u = clamp(v); return u*u*(3-2*u); };
const vowels = ['aa','ih','ou','ee','oh'];

// Sample the song clock directly, so pause/seek/cuts cannot desynchronise singing.
export class LyricPerformance {
  constructor(data) { this.lines = data.lines; this.current = null; this.gestures=new GestureTimeline(this.lines); }

  sample(time) {
    const line = this.lines.find(l => time >= l.start && time < l.end);
    const result = { line, time, weights: {}, syllable: null, ...this.gestures.sample(time) };
    if (!line) return (this.current = result);
    const cues = line.syllables;
    for (let i = 0; i < cues.length; i++) {
      const c = cues[i], next = cues[i+1];
      const end = next ? Math.min(next.start-.025, Math.max(c.end, c.start+.06)) : c.end;
      const holdEnd = next && next.start-c.start < 1 ? next.start-.025 : Math.min(line.end, end+.16);
      if (time < c.start-.035 || time > holdEnd+.045) continue;
      const strength = smooth((time-c.start+.035)/.065) * (1-smooth((time-holdEnd)/.055));
      const at = (time-line.start)/line.step, lo = Math.floor(at), f = at-lo;
      const energy = (line.envelope[lo]||0)*(1-f)+(line.envelope[lo+1]||0)*f;
      const level = (.30 + .57*energy)*strength;
      for (const [shape, weight] of Object.entries(c.weights)) result.weights[shape] = (result.weights[shape]||0)+weight*level;
      if (!result.syllable || strength > result.syllable.strength) result.syllable = { ...c, strength };
    }
    return (this.current = result);
  }

  applyMouth(hero, sample) {
    const total=Object.values(sample.weights).reduce((a,b)=>a+b,0),scale=total>.95?.95/total:1;
    for (const shape of vowels) hero._setExpr(shape, (sample.weights[shape]||0)*scale);
    // Mouth-only smiles otherwise override some authored vowel morphs.
    hero._setExpr('detail_happy_mouth', sample.line ? .12 : .28);
    hero._setExpr('detail_relaxed_mouth', 0);
    if(sample.line){
      const compact=sample.line.text.replace(/[，。\s]/g,'');
      const eyeWord=compact.includes('闭上眼睛')?'睛':compact.includes('眼皮却往下垂')?'皮':null;
      const cue=sample.line.syllables.find(c=>c.text===eyeWord);
      if(cue){
        const closed=smooth((sample.time-cue.start)/.8)*.9;
        hero._setExpr('blink',Math.max(hero.vrm.expressionManager.getValue('blink')||0,closed));
      }
    }
  }
}
