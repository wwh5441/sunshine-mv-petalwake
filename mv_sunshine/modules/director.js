// Multi-Rig Cinematic MV Director for 《阳光晒暖了被》 (Full-Song Plan 1 Edition).
// Drives:
//   - Unmanned landscape / tabletop macro / architectural tracking shots
//   - Expressive ClaudeHero VRM 1.0 performances (`stroll_garden`, `cup_blow_smile`, `read_yawn_nap`,
//     `touch_bedsheet`, `daydream_railing`, `sit_chair_breeze`, `sit_chair_sleep`, `hug_quilt_sniff`, `wake_stretch`)
//   - Auto-focused Optical Bokeh Depth-of-Field (`focusDist: "auto"`), 2048x2048 shadow tracking,
//     and 4-stage Time-of-Day sunlight evolution (`CinePostFX`).
import * as THREE from 'three';
import { frameHero } from './character/hero_framing.js';
import { VISUAL_STYLE } from '../data/visual_style.js';
import { PLAYBACK_POLICY as PLAYBACK } from '../data/playback_policy.js';
import {applyLyricCamera} from './lyrics/lyric_camera.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
const cineEase = (u) => 0.32 * smoothstep(u) + 0.68 * clamp(u, 0, 1);

export class MVDirector {
  constructor(game, timeline, updatables = [], motes = null) {
    this.game = game;
    this.timeline = timeline;
    this.updatables = updatables;
    this.motes = motes;
    this.activeShotId = null;
    this.lastTime = -999;
    this._look = new THREE.Vector3();
    this._p0 = new THREE.Vector3();
    this._p1 = new THREE.Vector3();
    this._camDir = new THREE.Vector3();

    // Warm golden sunlit bounce light (illuminates front faces of backlit props & Claude without flattening shadows!)
    this.bounceLight = new THREE.DirectionalLight(0xffdfb8, Math.PI * 0.52);
    this.bounceLight.castShadow = false;
    this.game.pipeline.overlay.add(this.bounceLight, this.bounceLight.target);
  }

  prewarmWorld() {
    const { town, fx, flight, camera, pipeline } = this.game;
    if (!town) return;
    camera.position.set(-90, 26, 1055);
    flight.pos.set(-90, 26, 1055);
    for (let i = 0; i < 180; i++) {
      town.ambient(1 / 30, fx, camera);
      fx.update(1 / 30, i / 30, flight, camera, 1, pipeline.size, pipeline.reversed);
    }
  }

  getShotAt(t) {
    const shots = this.timeline.shots;
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      if (t >= s.start && t < s.end) return { shot: s, index: i };
    }
    const lastIdx = shots.length - 1;
    return { shot: shots[lastIdx], index: lastIdx };
  }

  getActiveLyric(t) {
    for (const l of this.timeline.lyrics) {
      if (t >= l.start && t <= l.end) return l;
    }
    return null;
  }

  getActiveChapterIndex(t) {
    const chs = this.timeline.chapters || [];
    for (let i = 0; i < chs.length; i++) {
      if (t >= chs[i].start && t < chs[i].end) return i;
    }
    return Math.max(0, chs.length - 1);
  }

  _evalCamera(shot, rawU, sampleT) {
    const { camera, flight } = this.game;
    const cam = shot.camera;
    const cu = clamp(rawU, 0, 1);
    const ecu = cineEase(cu);

    if (cam.type === 'orbit_arc') {
      const focus = cam.focus;
      const a0 = ((cam.angleFromDeg || 0) * Math.PI) / 180;
      const a1 = ((cam.angleToDeg || 0) * Math.PI) / 180;
      const ang = lerp(a0, a1, ecu);
      const rad = lerp(cam.radiusFrom ?? cam.radius ?? 4.0, cam.radiusTo ?? cam.radius ?? 4.0, ecu);
      const h = lerp(cam.heightFrom ?? cam.height ?? 1.2, cam.heightTo ?? cam.height ?? 1.2, ecu);
      const lookLift = lerp(cam.lookLiftFrom ?? cam.lookLift ?? 0, cam.lookLiftTo ?? cam.lookLift ?? 0, ecu);

      camera.position.set(
        focus[0] + Math.sin(ang) * rad,
        focus[1] + h,
        focus[2] + Math.cos(ang) * rad
      );
      camera.up.set(0, 1, 0);
      this._look.set(focus[0], focus[1] + lookLift, focus[2]);
      camera.lookAt(this._look);
    } else if (cam.type === 'chase_custom') {
      const f = flight.fwd;
      const hl = Math.hypot(f.x, f.z) || 1;
      const fx = f.x / hl, fz = f.z / hl;
      const rx = -fz, rz = fx;
      const track = (name, fallback) => lerp(cam[`${name}From`] ?? cam[name] ?? fallback, cam[`${name}To`] ?? cam[name] ?? fallback, ecu);
      const back = track('back', 6.5), right = track('right', 0), up = track('up', 1.5);
      const lookAhead = track('lookAhead', 0), lookUp = track('lookUp', 0.35);
      camera.position.set(
        flight.pos.x + rx * right - fx * back,
        flight.pos.y + up,
        flight.pos.z + rz * right - fz * back
      );
      camera.up.set(0, 1, 0);
      this._look.set(
        flight.pos.x + fx * lookAhead,
        flight.pos.y + lookUp,
        flight.pos.z + fz * lookAhead
      );
      camera.lookAt(this._look);
    } else {
      // world_lerp (dolly / slider / crane / macro push-in)
      this._p0.fromArray(cam.from);
      this._p1.fromArray(cam.to);
      camera.position.lerpVectors(this._p0, this._p1, ecu);
      camera.up.set(0, 1, 0);
      this._p0.fromArray(cam.lookFrom);
      this._p1.fromArray(cam.lookTo);
      this._look.lerpVectors(this._p0, this._p1, ecu);
      camera.lookAt(this._look);
    }

    const sway = cam.sway ?? 0.012;
    if (sway > 0) {
      camera.rotation.z += Math.sin(sampleT * 1.35) * 0.0045 * (sway / 0.012);
      camera.position.y += Math.sin(sampleT * 1.7) * sway;
    }
    if (cam.dutchDeg) {
      camera.rotation.z += (cam.dutchDeg * Math.PI) / 180;
    }

    const fov0 = cam.fovFrom ?? cam.fov ?? 54;
    const fov1 = cam.fovTo ?? cam.fov ?? fov0;
    this.game.fov = lerp(fov0, fov1, ecu);
    applyLyricCamera(this.game,shot);
    this.game.applyFov();
  }

  _poseAt(shot, sampleT, dt) {
    const { flight, rider, princess, camera, cinePostFX } = this.game;
    const simT = Math.max(0, sampleT);
    const dur = Math.max(0.01, shot.end - shot.start);
    const rawU = (sampleT - shot.start) / dur;
    const u = rawU < 0 ? rawU : rawU > 1 ? 1 : cineEase(rawU);

    // 1. Evolve dynamic sunlight & sky across Noon -> Afternoon -> Dream -> Apricot Dusk
    cinePostFX?.updateTimeOfDay(simT);

    const flying = shot.mode === 'fly_world' || shot.mode === 'fly_scripted';
    rider.group.visible = false;
    if (princess) princess.group.visible = shot.mode === 'stand_pad' || flying;
    if (this.game.heroBroom) this.game.heroBroom.visible = flying;

    if (shot.mode === 'unmanned') {
      if (princess) princess.group.visible = false;
      this._evalCamera(shot, rawU, sampleT);
      flight.auto = {
        quiet: true,
        step: (_dt, _time, f) => {
          f.pos.copy(this._look);
          f.vel.set(0, 0, 0);
          f.speed = 0;
          f.yaw = 0;
          f.pitch = 0;
          f.roll = 0;
        },
      };
      this.game.advanceSim(dt, simT);
      this._evalCamera(shot, rawU, sampleT);
    } else {
      const r = shot.rider;

      if (shot.mode === 'stand_pad') {
        rider.off.on = true;
        rider.off.y = 0;
        rider.off.sy = 1;
        rider.seat.calm = 1;
        let yaw = ((r.yawDeg || 0) * Math.PI) / 180;
        if (shot.performance?.faceCamera) {
          this._evalCamera(shot, rawU, sampleT);
          yaw = Math.atan2(camera.position.x-r.pos[0], -(camera.position.z-r.pos[2]));
        }
        flight.auto = {
          quiet: true,
          step: (_dt, _time, f) => {
            f.pos.set(r.pos[0], r.pos[1], r.pos[2]);
            f.vel.set(0, 0, 0);
            f.speed = 0;
            f.yaw = yaw;
            f.pitch = 0;
            f.roll = 0;
          },
        };
      } else if (shot.mode === 'fly_world') {
        rider.off.on = false;
        rider.seat.calm = 0;
        const x = lerp(r.from[0], r.to[0], u);
        const y = lerp(r.from[1], r.to[1], u);
        const z = lerp(r.from[2], r.to[2], u);
        const vx = (r.to[0] - r.from[0]) / dur;
        const vy = (r.to[1] - r.from[1]) / dur;
        const vz = (r.to[2] - r.from[2]) / dur;
        const yaw = Math.atan2(vx, -vz);
        const pitch = Math.atan2(vy, Math.hypot(vx, vz) || 1);
        const roll = ((r.rollDeg || 0) * Math.PI) / 180 * Math.sin(clamp(rawU, 0, 1) * Math.PI * 0.85 + 0.15);
        flight.auto = {
          quiet: r.quiet ?? false,
          step: (_dt, _time, f) => {
            f.pos.set(x, y, z);
            f.vel.set(vx, vy, vz);
            f.speed = r.speed || Math.hypot(vx, vy, vz);
            f.yaw = yaw;
            f.pitch = pitch;
            f.roll = roll;
          },
        };
      } else {
        rider.off.on = false;
        rider.seat.calm = 0;
        const x = lerp(r.from[0], r.to[0], u);
        const z = lerp(r.from[1], r.to[1], u);
        const agl = lerp(r.from[2], r.to[2], u);
        const y = flight.surfaceAt(x, z, simT) + agl;
        const eps = 0.02;
        const xN = lerp(r.from[0], r.to[0], u + eps);
        const zN = lerp(r.from[1], r.to[1], u + eps);
        const yN = flight.surfaceAt(xN, zN, simT) + lerp(r.from[2], r.to[2], u + eps);
        const dx = (xN - x) / (eps * dur);
        const dy = (yN - y) / (eps * dur);
        const dz = (zN - z) / (eps * dur);
        flight.auto = {
          quiet: false,
          step: (_dt, _time, f) => {
            f.pos.set(x, y, z);
            f.vel.set(dx, dy, dz);
            f.speed = r.speed || Math.hypot(dx, dy, dz);
            f.yaw = Math.atan2(dx, -dz);
            f.pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz) || 1), -0.45, 0.45);
            f.roll = ((r.rollDeg || 0) * Math.PI) / 180 * Math.sin(clamp(rawU, 0, 1) * Math.PI * 0.8 + 0.2);
            f.agl = agl;
          },
        };
      }

      this.game.advanceSim(dt, simT);
      this._evalCamera(shot, rawU, sampleT);
      if (princess) {
        princess.group.position.copy(flight.pos);
        princess.group.rotation.order = 'YXZ';
        princess.group.rotation.set(flight.pitch, -flight.yaw, -flight.roll);
        if (flying) {
          princess.group.position.y += rider.tilt.position.y;
          princess.fly(clamp(rawU, 0, 1), simT, dt, camera.position);
          if (this.game.heroBroom) {
            this.game.heroBroom.position.copy(princess.group.position);
            this.game.heroBroom.quaternion.copy(princess.group.quaternion);
          }
        } else {
          princess.act(shot.pose || 'mocap_idle_warm', clamp(rawU, 0, 1), simT, dt, camera.position);
        }
        if (shot.mode === 'stand_pad') frameHero(this.game, this._look);
      }
    }

    // 3-point sunlit sculpting:
    //   - Keep front bounce gentle (`0.16*PI`) on character shots so Claude's face never overexposes,
    //     and stronger (`0.48*PI`) on unmanned prop shots so dark walnut & porcelain glow.
    rider.sunVis = 1.0;
    rider.sun.intensity = Math.PI * (shot.mode === 'unmanned' ? 1.12 : VISUAL_STYLE.lights.key);
    rider.fill.intensity = Math.PI * (shot.mode === 'unmanned' ? .45 : VISUAL_STYLE.lights.sky);
    this.bounceLight.intensity = Math.PI * (shot.mode === 'unmanned' ? .48 : VISUAL_STYLE.lights.bounce);
    this._camDir.subVectors(camera.position, this._look).normalize();
    this.bounceLight.position.copy(this._look).addScaledVector(this._camDir, 4.0).add(new THREE.Vector3(1.5, 2.5, 1.5));
    this.bounceLight.target.position.copy(this._look);
    this.bounceLight.target.updateMatrixWorld();
    if (cinePostFX) {
      cinePostFX.updateShadowFocus(this._look, 4.6);
      const dof = shot.dof || {};
      const autoDist = camera.position.distanceTo(this._look);
      cinePostFX.focusDist = dof.focusDist === 'auto' || dof.focusDist == null ? autoDist : dof.focusDist;
      cinePostFX.aperture = dof.aperture ?? 0.0;
    }

    for (const up of this.updatables) up.update(simT);
    this.motes?.update(simT, camera.position);
  }

  seekAndStep(targetT,{realtime=false}={}) {
    const { shot, index } = this.getShotAt(targetT);
    const { wake, vortex, fx, pipeline } = this.game;

    const jumpedBack = targetT < this.lastTime - 1e-4;
    const jumpedFar = targetT - this.lastTime > 0.25;
    const changedShot = shot.id !== this.activeShotId;

    if (changedShot || jumpedBack || jumpedFar) {
      this.activeShotId = shot.id;
      wake.reset();
      vortex.reset();
      for (const r of fx.ribbons) r.reset();
      pipeline.hasPrev = false;
      this.game.flight.turnRate = 0;
      this.game.flight.pitchRate = 0;

      if(realtime){
        // Teleport/sample the new pose before resetting springs. Replay must
        // not simulate 20–32 whole-world frames and draw an extra frame at cuts.
        this._poseAt(shot,targetT,0);
        const hero=this.game.princess;
        if(hero?.group.visible){
          hero.resetPhysics();
          for(let i=0;i<PLAYBACK.liveSettleSteps;i++)hero._stepVrmAndPhysics(PLAYBACK.settleDt,hero.flying);
          hero.hairClearance.dirty=true;
        }
      }else{
      const preSteps = shot.mode === 'fly_scripted' || shot.mode === 'fly_world' ? 32 : 20;
      const subDt = 1 / 60;
      const t0 = targetT - preSteps * subDt;
      for (let i = 1; i <= preSteps; i++) {
        this._poseAt(shot, t0 + i * subDt, subDt);
        if (i === 1) {
          this.game.princess?.resetPhysics?.();
        }
      }
      pipeline.hasPrev = false;
      this.game.renderScene(1 / 60);
      this._poseAt(shot, targetT, 1 / 120);
      }
    } else {
      // A paused/repeated frame must not advance pose or spring physics.
      const elapsed = Math.max(0, targetT - this.lastTime);
      if (elapsed > 1e-8) {
        const delta=realtime?Math.min(elapsed,PLAYBACK.maxLiveDelta):elapsed;
        const subSteps = Math.max(1,Math.min(realtime?PLAYBACK.maxCatchupSteps:Infinity,Math.ceil(delta/(1/60))));
        const subDt = delta / subSteps;
        for (let i = 1; i <= subSteps; i++) {
          this._poseAt(shot, realtime?targetT-delta+i*subDt:this.lastTime+i*subDt, subDt);
        }
      }
    }

    this.lastTime = targetT;

    const clipDur = this.timeline.meta.clipDuration;
    let fade = 1.0;
    if (targetT < 0.65) fade = 0.38 + 0.62 * smoothstep(targetT / 0.65);
    else if (targetT > clipDur - 1.20) fade = smoothstep((clipDur - targetT) / 1.20);
    this.game.pipeline.fade = fade;

    return {
      shot,
      shotIndex: index,
      chapterIndex: this.getActiveChapterIndex(targetT),
      lyric: this.getActiveLyric(targetT),
    };
  }
}
