import {LYRIC_DESIGNS,LYRIC_TYPE as C,LYRIC_PALETTES as palettes} from '../../data/lyric_design.js';
import {LyricLayout} from './lyric_layout.js';

const smooth=v=>{const u=Math.max(0,Math.min(1,v));return u*u*(3-2*u);};

export class DynamicLyrics {
  constructor(timeline,protection){
    this.timeline=timeline;this.data=protection;this.cache=new Map();this.timings=new Map();this.lastLayout=null;
    this.segments=new Map(protection.segments.map(s=>[s.key,s]));
    this.designs=new Map(LYRIC_DESIGNS.map(d=>[d.index,d]));
  }
  setTiming(lines){for(const line of lines)this.timings.set(line.index,line.syllables);}
  prepare(ctx,W,H){
    const aspect=+(W/H).toFixed(3),key=String(aspect);if(this.cache.has(key))return this.cache.get(key);
    const engine=new LyricLayout(ctx,this.data),plans=new Map(),start=performance.now();
    for(const segment of this.data.segments){const lyric=this.timeline.lyrics.find(l=>l.index===segment.line);plans.set(segment.key,engine.plan(lyric,this.designs.get(lyric.index),segment,aspect));}
    this.cache.set(key,plans);this.preparationMs=performance.now()-start;return plans;
  }
  render(ctx,t,state,W,H){
    const lyric=state.lyric;if(!lyric){this.lastLayout=null;return;}
    const plans=this.prepare(ctx,W,H),plan=plans.get(`${lyric.index}:${state.shot.id}`);if(!plan)return;
    this.lastLayout=plan;
    const s=H/plan.H,fade=smooth((t-lyric.start)/C.entry)*smooth((lyric.end-t)/C.exit),age=t-lyric.start;
    const palette=palettes[plan.tone||plan.design.tone],cues=this.timings.get(lyric.index)||[];
    ctx.save();ctx.scale(s,s);ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.lineJoin='round';
    for(const g of plan.glyphs){
      const cue=cues[g.index],onset=cue?.start??lyric.start+(lyric.end-lyric.start)*g.index/plan.glyphs.length;
      const reveal=smooth((t-onset+.06)/.20),entry=smooth((age-g.index*.009)/C.entry),pulse=Math.max(0,Math.sin(Math.min(1,Math.max(0,(t-onset)/.30))*Math.PI));
      const drift=plan.design.motion==='breeze'?Math.sin(age*.9+g.index*.13)*2:plan.design.motion==='float'?Math.sin(age*.65)*2:0;
      const lift=(1-entry)*C.motionPixels+(plan.design.motion==='rise'?-age*.25:0);
      ctx.save();ctx.translate(g.x+drift,g.y+lift);ctx.scale(1+pulse*.018,1+pulse*.018);
      ctx.font=`400 ${g.size}px ${C.font}`;ctx.globalAlpha=fade*(.12+.88*reveal);
      ctx.shadowColor=palette.shadow;ctx.shadowBlur=4;ctx.shadowOffsetY=1.5;
      ctx.strokeStyle=palette.stroke;ctx.lineWidth=Math.max(.8,g.size*.012);ctx.strokeText(g.char,0,0);
      ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle=g.key&&reveal>.5?palette.accent:palette.base;
      if(plan.design.treatment==='outline'&&g.key){ctx.globalAlpha*=.26+.74*reveal;ctx.lineWidth=Math.max(1.1,g.size*.017);ctx.strokeStyle=reveal>.5?palette.accent:palette.base;ctx.strokeText(g.char,0,0);}
      else ctx.fillText(g.char,0,0);
      ctx.restore();
    }
    ctx.restore();
  }
}
