// Prefix sums make every glyph's safety query constant-time. The input is a
// padded union of the actor/prop silhouettes over the entire lyric/shot segment.
export class ProtectionField {
  constructor(data,segment,aspect=.75){
    this.width=data.width;this.height=data.height;
    this.aspect=aspect;this.ratio=data.referenceAspect/aspect;
    const w=this.width,h=this.height,p=this.prefix=new Uint32Array((w+1)*(h+1)),bits=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let i=0;i<segment.rows[y].length;i+=2){
      const a=Math.max(0,Math.floor((.5+(segment.rows[y][i]/w-.5)*this.ratio)*w)),b=Math.min(w,Math.ceil((.5+(segment.rows[y][i+1]/w-.5)*this.ratio)*w));
      for(let x=a;x<b;x++)bits[y*w+x]=1;
    }
    for(let y=0;y<h;y++){let sum=0;for(let x=0;x<w;x++){sum+=bits[y*w+x];p[(y+1)*(w+1)+x+1]=p[y*(w+1)+x+1]+sum;}}
  }
  overlaps(rect,W,H){
    const {width:w,height:h,prefix:p}=this,x0=Math.max(0,Math.floor(rect.x/W*w)),x1=Math.min(w,Math.ceil((rect.x+rect.w)/W*w)),y0=Math.max(0,Math.floor(rect.y/H*h)),y1=Math.min(h,Math.ceil((rect.y+rect.h)/H*h));
    if(x0>=x1||y0>=y1)return 0;
    return p[y1*(w+1)+x1]-p[y0*(w+1)+x1]-p[y1*(w+1)+x0]+p[y0*(w+1)+x0];
  }
}
