// three-vrm stiffness is a force coefficient, not a normalized 0..1 value.
// Keep each authored hair/skirt/ribbon group, and simulate in the body's frame.
export class SecondaryMotion {
  constructor(vrm,scale){
    this.vrm=vrm;this.authored=new Map();
    const chest=vrm.humanoid.getRawBoneNode('chest'),hips=vrm.humanoid.getRawBoneNode('hips');
    for(const joint of vrm.springBoneManager.joints){
      this.authored.set(joint,{...joint.settings,gravityDir:joint.settings.gravityDir.clone()});
      joint.settings.hitRadius*=scale;
      if(/DS_hair|DS_ribbon/.test(joint.bone.name))joint.center=chest;
      else if(/DS_skirt/.test(joint.bone.name))joint.center=hips;
      else joint.center=vrm.scene;
    }
    // In this installed three-vrm version, collider radius is a world length.
    // New protection colliders are installed later, already in world metres.
    for(const collider of vrm.springBoneManager.colliders){
      if(typeof collider.shape?.radius==='number')collider.shape.radius*=scale;
    }
  }

  step(dt,flight=false){
    const delta=Math.max(0,Math.min(dt||0,1/20));
    if(!delta){this.vrm.update(0);return;}
    const count=Math.max(1,Math.ceil(delta/(flight?1/180:1/120)));
    for(let i=0;i<count;i++)this.vrm.update(delta/count);
  }
}
