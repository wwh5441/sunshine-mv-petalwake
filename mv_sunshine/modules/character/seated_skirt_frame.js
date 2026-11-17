import * as THREE from 'three';
import { SEATED_DRAPE as C } from '../../data/seated_drape.js';
import { broomSeat } from './broom_rig.js';

// Shape-preserving cubic slopes prevent a section from overshooting its
// neighbours, especially along Y where a reversal would turn cloth inside out.
function slopes(xs,ys){
  const d=xs.slice(1).map((x,i)=>(ys[i+1]-ys[i])/(x-xs[i]));
  return ys.map((_,i)=>{
    if(i===0)return d[0];
    if(i===ys.length-1)return d[d.length-1];
    if(d[i-1]*d[i]<=0)return 0;
    const a=xs[i]-xs[i-1],b=xs[i+1]-xs[i],w1=2*b+a,w2=b+2*a;
    return (w1+w2)/(w1/d[i-1]+w2/d[i]);
  });
}

function channel(xs,ys){
  const m=slopes(xs,ys);
  return s=>{
    const j=Math.max(1,xs.findIndex(x=>x>=s)),i=j-1,h=xs[j]-xs[i],t=(s-xs[i])/h;
    const t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[j]+(t3-t2)*h*m[j];
  };
}

// Gravity-aligned cloth sections enclose the seated legs without giving the
// whole hem a rigid upward lift. CPU queries and the shader share this texture.
export class SeatedSkirtFrame {
  constructor(){
    const xs=C.sections.map(p=>p.at),origin=broomSeat();
    const read=[0,1,2].map(k=>channel(xs,C.sections.map(p=>p.centre[k])));
    const spread=[0,1].map(k=>channel(xs,C.sections.map(p=>p.spread[k])));
    this.pixels=new Float32Array(C.samples*3*4);
    this.texture=new THREE.DataTexture(this.pixels,C.samples,3,THREE.RGBAFormat,THREE.FloatType);
    this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;
    this.texture.generateMipmaps=false;this.texture.flipY=false;
    for(let i=0;i<C.samples;i++){
      const s=i/(C.samples-1);
      this.pixels.set([origin.x+read[0](s),origin.y+read[1](s),origin.z+read[2](s),0],i*4);
      this.pixels.set([spread[0](s),0,0,0],(C.samples+i)*4);
      this.pixels.set([0,0,-spread[1](s),0],(C.samples*2+i)*4);
    }
    this.texture.needsUpdate=true;
  }
  sample(s,row,target=new THREE.Vector3()){
    const at=Math.max(0,Math.min(C.samples-1,s*(C.samples-1))),a=Math.floor(at),b=Math.min(C.samples-1,a+1),u=at-a;
    const p=(row*C.samples+a)*4,q=(row*C.samples+b)*4;
    return target.set(this.pixels[p]*(1-u)+this.pixels[q]*u,this.pixels[p+1]*(1-u)+this.pixels[q+1]*u,this.pixels[p+2]*(1-u)+this.pixels[q+2]*u);
  }
  deform(reference,target){
    const at=Math.max(0,Math.min(C.samples-1,(C.top-reference.y)/C.length*(C.samples-1)));
    const a=Math.floor(at),b=Math.min(C.samples-1,a+1),u=at-a,p=this.pixels;
    target.set(0,0,0);
    for(let row=0;row<3;row++){
      const i=(row*C.samples+a)*4,j=(row*C.samples+b)*4,w=row===0?1:row===1?reference.x:-reference.z;
      target.x+=(p[i]+(p[j]-p[i])*u)*w;
      target.y+=(p[i+1]+(p[j+1]-p[i+1])*u)*w;
      target.z+=(p[i+2]+(p[j+2]-p[i+2])*u)*w;
    }
    return target;
  }
}
