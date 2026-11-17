import {ProtectionField} from '../../modules/lyrics/protection_field.js';

// Check the entire dynamic glyph envelope against the undilated subject mask.
// The masks contain nine sampled silhouettes per segment plus authored key areas.
export function auditLyricLayout(game,fps=30){
  const renderer=game.overlay2d.lyrics,plans=renderer.prepare(game.overlay2d.ctx,game.overlay2d.w,game.overlay2d.h),rows=[];
  const smooth=v=>{const u=Math.max(0,Math.min(1,v));return u*u*(3-2*u);};
  for(const segment of renderer.data.segments){
    const p=plans.get(segment.key),line=game.director.timeline.lyrics.find(l=>l.index===segment.line),cues=renderer.timings.get(line.index)||[];
    const field=new ProtectionField(renderer.data,{...segment,rows:segment.coreRows},p.W/p.H);
    const row={key:segment.key,type:p.type,fieldArea:p.fieldArea,frames:0,overlaps:0,outside:0,text:p.glyphs.map(g=>g.char).join(''),examples:[]};
    for(let t=segment.start;t<segment.end;t+=1/fps){
      const age=t-line.start;
      for(const g of p.glyphs){
        const onset=cues[g.index]?.start??line.start+(line.end-line.start)*g.index/p.glyphs.length;
        const pulse=Math.max(0,Math.sin(Math.min(1,Math.max(0,(t-onset)/.30))*Math.PI)),scale=1+pulse*.018,entry=smooth((age-g.index*.009)/.30);
        const drift=p.design.motion==='breeze'?Math.sin(age*.9+g.index*.13)*2:p.design.motion==='float'?Math.sin(age*.65)*2:0,lift=(1-entry)*6+(p.design.motion==='rise'?-age*.25:0);
        const m=g.metric,pad=5,rect={x:g.x+drift+(-m.left-pad)*scale,y:g.y+lift+(-m.ascent-pad)*scale,w:(m.left+m.right+pad*2)*scale,h:(m.ascent+m.descent+pad*2)*scale};
        const overlap=field.overlaps(rect,p.W,p.H);if(overlap){row.overlaps++;if(row.examples.length<3)row.examples.push({t,char:g.char,rect,overlap});}
        if(rect.x<0||rect.y<0||rect.x+rect.w>p.W||rect.y+rect.h>p.H)row.outside++;
      }
      row.frames++;
    }
    row.exactText=row.text===line.text.replace(/[，。！？、\s]/g,'');rows.push(row);
  }
  return {fps,segments:rows.length,frames:rows.reduce((n,r)=>n+r.frames,0),overlaps:rows.reduce((n,r)=>n+r.overlaps,0),outside:rows.reduce((n,r)=>n+r.outside,0),missingText:rows.filter(r=>!r.exactText),rows};
}
