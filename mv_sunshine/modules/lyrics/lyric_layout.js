import {LYRIC_TYPE as C} from '../../data/lyric_design.js';
import {ProtectionField} from './protection_field.js';
import {LyricTemplates} from './lyric_templates.js';
import {LYRIC_CAMERA} from '../../data/lyric_camera.js';

const types=['poster','stagger','side-stacks','vertical-pair','ripple','portrait-left','portrait-right'];
export class LyricLayout {
  constructor(ctx,data){this.templates=new LyricTemplates(ctx);this.data=data;}
  plan(lyric,design,segment,aspect){
    const W=960*aspect,H=960,field=new ProtectionField(this.data,segment,aspect),T=this.templates;
    let best=null;const composition=LYRIC_CAMERA[segment.shot],preferred=segment.actor&&composition?(composition.shiftX>0?'portrait-left':'portrait-right'):design.layout;
    for(const type of [preferred,...types.filter(t=>t!==preferred)])for(const size of [144,128,112,100,88,76,68,60,52,46,40]){
      const shape=T.create(lyric.text,design.focus,type,size,W,H,design),b=shape.bounds;
      if(b.w>W*.93||b.h>H*.84)continue;
      const xs=[W*.045,W*.10,(W-b.w)*.5,W*.90-b.w,W*.955-b.w];
      const ys=[H*.082,H*.14,H*.22,H*.34,H*.48,H*.62,H*.92-b.h];
      for(const x of xs)for(const y of ys){
        if(x<W*.035||x+b.w>W*.965||y<H*.075||y+b.h>H*.955)continue;
        const dx=x-b.x,dy=y-b.y,rects=shape.glyphs.map(g=>{const r=T.bounds(g);return {...r,x:r.x+dx,y:r.y+dy};});
        if(rects.some(r=>field.overlaps(r,W,H)))continue;
        const area=b.w*b.h/(W*H),score=shape.averageSize*1.6-Math.abs(area-C.targetFieldArea)*400+(type===preferred?85:0)+area*80;
        if(best&&score<=best.score)continue;
        best={key:segment.key,score,type,design,W,H,fieldArea:area,rects,bounds:{x,y,w:b.w,h:b.h},glyphs:shape.glyphs.map(g=>({...g,x:g.x+dx,y:g.y+dy}))};
      }
    }
    if(!best)best=this.flow(lyric,design,segment,field,W,H);
    best.protectedOverlaps=best.rects.reduce((n,r)=>n+field.overlaps(r,W,H),0);
    best.tone=design.tone;
    const bg=this.data.background,values=bg?.fields[segment.key];
    if(design.tone==='ink'&&values){
      const levels=best.glyphs.map(g=>{const x=Math.max(0,Math.min(bg.width-1,Math.floor((g.x+g.metric.advance*.5)/W*bg.width))),y=Math.max(0,Math.min(bg.height-1,Math.floor((g.y-g.size*.4)/H*bg.height)));return values[y*bg.width+x]/255;}).sort((a,b)=>a-b);
      const mean=levels.reduce((n,v)=>n+v,0)/levels.length;
      if(mean<.52||levels[Math.floor(levels.length*.25)]<.40)best.tone='cream';
    }
    return best;
  }
  flow(lyric,design,segment,field,W,H){
    const chars=lyric.text.replace(/[，。！？、\s]/g,''),T=this.templates;
    for(const size of [64,56,48,40,34]){
      const glyphs=[],rects=[];let index=0;
      for(let y=H*.11+size*.8;y<H*.94&&index<chars.length;y+=size*1.45)for(let x=W*.04;x<W*.94&&index<chars.length;x+=size*.23){
        const char=chars[index],g={char,index,x,y,size,key:design.focus.includes(char),metric:T.metric(char,size)},r=T.bounds(g);
        if(r.x+r.w>W*.96||r.y+r.h>H*.955||field.overlaps(r,W,H))continue;
        glyphs.push(g);rects.push(r);index++;x+=g.metric.advance+size*.03;
      }
      if(index===chars.length){const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y)),right=Math.max(...rects.map(r=>r.x+r.w)),bottom=Math.max(...rects.map(r=>r.y+r.h));return {key:segment.key,score:0,type:'free-flow',design,W,H,glyphs,rects,bounds:{x,y,w:right-x,h:bottom-y},fieldArea:(right-x)*(bottom-y)/(W*H)};}
    }
    throw new Error(`No unobstructed lyric layout for ${segment.key}`);
  }
}
