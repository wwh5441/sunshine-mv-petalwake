// Store a tiny luminance field for contrast decisions. This diagnostic runs
// during authoring; the player never reads pixels back from the GPU.
export function sampleLyricBackground(game,protection){
  const width=60,height=80,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),fields={};
  for(const segment of protection.segments){
    const sums=new Float64Array(width*height);
    for(const u of [.08,.50,.92]){
      game.director.seekAndStep(segment.start+(segment.end-segment.start)*u,{realtime:true});
      game.pipeline.hasPrev=false;game.renderScene(1/30);
      ctx.drawImage(game.renderer.domElement,0,0,width,height);
      const image=ctx.getImageData(0,0,width,height).data;
      for(let i=0;i<sums.length;i++)sums[i]+=.2126*image[i*4]+.7152*image[i*4+1]+.0722*image[i*4+2];
    }
    fields[segment.key]=Array.from(sums,v=>Math.round(v/3));
  }
  return {width,height,fields};
}
