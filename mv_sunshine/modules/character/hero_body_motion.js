// Small chest/head responses lead the arm, while the authored standing mocap
// supplies weight shifts. No translation is added to the planted feet.
export class HeroBodyMotion {
  constructor(hero){this.bones=hero.flightPose.bones;}
  apply(sample,time){
    const b=this.bones,w=sample.gestureWeights||{},reach=(w.offer||0)+(w.sweet||0)+(w.breeze||0),fold=(w.book||0)+(w.gather||0),stretch=w.stretch||0;
    b.chest.rotation.x+=Math.sin(time*1.65)*.005-fold*.014-stretch*.022;
    b.spine.rotation.z-=reach*.010;
    b.chest.rotation.y-=reach*.025;
    b.head.rotation.x+=fold*.022+(w.sleepy||0)*.028-stretch*.020;
    b.head.rotation.y+=reach*.023;
  }
}
