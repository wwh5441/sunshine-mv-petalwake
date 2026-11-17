import {LYRIC_TYPE as C} from '../../data/lyric_design.js';

const clean=text=>text.replace(/[，。！？、\s]/g,'');
export class LyricTemplates {
  constructor(ctx){this.ctx=ctx;this.metrics=new Map();}
  metric(char,size){
    const key=`${char}:${size}`;if(this.metrics.has(key))return this.metrics.get(key);
    this.ctx.font=`400 ${size}px ${C.font}`;const m=this.ctx.measureText(char);
    const value={advance:m.width,left:m.actualBoundingBoxLeft||0,right:m.actualBoundingBoxRight||m.width,ascent:m.actualBoundingBoxAscent||size*.86,descent:m.actualBoundingBoxDescent||size*.12};
    this.metrics.set(key,value);return value;
  }
  create(text,focus,type,size,W,H,design={}){
    const parts=text.split(/[，。]/).filter(Boolean).map(clean),all=parts.join(''),focusAt=all.indexOf(focus),glyphs=[];
    let index=0;
    const add=(str,x,y,font,vertical=false,ripple=false)=>{
      for(const char of str){const m=this.metric(char,font),key=index>=focusAt&&index<focusAt+focus.length&&focusAt>=0;
        glyphs.push({char,index:index++,x,y:y+(ripple?Math.sin(index*.55)*font*.08:0),size:font,key,metric:m});
        if(vertical)y+=font*1.16;else x+=m.advance+font*.035;
      }
    };
    if(type.startsWith('portrait')){
      const right=type==='portrait-right',first=parts[0],second=parts.slice(1).join('')||'';
      add(first,right?W*.86-first.length*size:0,0,size*.94);
      const columns=design.columns?.join('')===second?[...design.columns]:[];
      if(!columns.length)for(let j=0;j<second.length;j+=3)columns.push(second.slice(j,j+3));
      columns.forEach((p,i)=>add(p,right?W*.86-size-i*size*1.22:i*size*1.22,H*.30+i*size*.12,size,true));
    }else if(type==='poster'){
      const chunks=focusAt>=0?[all.slice(0,focusAt),focus,all.slice(focusAt+focus.length)]:parts;
      let y=0;
      for(const part of chunks.filter(Boolean))for(let j=0;j<part.length;j+=5){
        const str=part.slice(j,j+5),font=part===focus?size*1.42:size*.68;
        add(str,j?size*.18:0,y,font);y+=font*1.18+size*.38;
      }
    }else if(type==='vertical-pair'){
      const clauses=parts.length>1?parts:[all.slice(0,Math.ceil(all.length/2)),all.slice(Math.ceil(all.length/2))];
      clauses.filter(Boolean).forEach((p,i)=>add(p,i?W*.91-size:0,i?size*1.4:0,size,true));
    }else if(type==='side-stacks'){
      let row=0;
      for(const [i,p]of parts.entries()){
        const x=i?W*.64:0;let y=i?size*1.35:0;
        for(let j=0;j<p.length;j+=3){add(p.slice(j,j+3),x,y,size);y+=size*1.55;row++;}
      }
      if(parts.length===1&&all.length<=6){glyphs.length=0;index=0;add(all,0,0,size);}
    }else{
      parts.forEach((p,i)=>add(p,type==='stagger'?i*size*.9:0,i*size*(type==='stagger'?1.8:1.55),size,false,type==='ripple'));
    }
    const rects=glyphs.map(g=>this.bounds(g)),bounds={x:Math.min(...rects.map(r=>r.x)),y:Math.min(...rects.map(r=>r.y)),right:Math.max(...rects.map(r=>r.x+r.w)),bottom:Math.max(...rects.map(r=>r.y+r.h))};
    bounds.w=bounds.right-bounds.x;bounds.h=bounds.bottom-bounds.y;
    return {glyphs,bounds,type,averageSize:glyphs.reduce((n,g)=>n+g.size,0)/glyphs.length};
  }
  bounds(g){const m=g.metric,pad=5;return {x:g.x-m.left-pad,y:g.y-m.ascent-pad,w:m.left+m.right+pad*2,h:m.ascent+m.descent+pad*2};}
}
