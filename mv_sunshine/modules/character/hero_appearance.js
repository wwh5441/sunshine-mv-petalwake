import { VISUAL_STYLE } from '../../data/visual_style.js';

export function applyHeroAppearance(vrm) {
  const config=VISUAL_STYLE.character,changed=new Set();
  vrm.scene.traverse(mesh=>{
    if(!mesh.isMesh)return;
    mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=false;
    for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
      if(!m||changed.has(m))continue;changed.add(m);
      if(m.isMToonMaterial||m.type==='MToonMaterial'){
        const palette=/skin|head|face/i.test(m.name)?config.skin:config.cloth;
        m.color?.setRGB(...palette.lit);m.shadeColorFactor?.setRGB(...palette.shade);
        m.shadingToonyFactor=config.toony;m.shadingShiftFactor=config.shift;
        m.rimLightingMixFactor=0;m.parametricRimColorFactor?.setRGB(0,0,0);
        m.parametricRimLiftFactor=0;m.emissive?.setRGB(0,0,0);
      }else m.color?.multiplyScalar(.32);
    }
  });
}
