import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PELICAN_CYCLIST as C } from '../../data/pelican_cyclist.js';
import { BicycleKinematics } from './bicycle_kinematics.js';
import { bicycleKnee, createWebFoot, linkMesh, placeLink } from './pelican_limbs.js';

export class PelicanCyclist {
  static async attach(holder) {
    const asset = await new GLTFLoader().loadAsync(C.model);
    return new PelicanCyclist(holder, asset.scene);
  }

  constructor(holder, model) {
    this.holder = holder;
    this.bike = new BicycleKinematics(holder);
    this.body = new THREE.Group(); this.body.name = 'PelicanCyclist';
    model.updateMatrixWorld(true);
    const vertex = new THREE.Vector3();
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry.clone(), positions = geometry.attributes.position;
      const source = geometry.index?.array || Array.from({ length: positions.count }, (_, i) => i), kept = [];
      // Keep the existing bird; replace its standing legs with a pedal rig.
      for (let i = 0; i < source.length; i += 3) {
        const standingFoot = mesh.material.name === 'black' || mesh.material.name === 'yellow';
        if (!standingFoot || [source[i], source[i + 1], source[i + 2]].every(index => vertex.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld).y > 0.30)) kept.push(source[i], source[i + 1], source[i + 2]);
      }
      geometry.setIndex(kept);
      const material = mesh.material.clone();
      material.color.multiplyScalar(C.colorScale);
      const copy = new THREE.Mesh(geometry, material);
      copy.applyMatrix4(mesh.matrixWorld); copy.castShadow = true; copy.receiveShadow = true;
      this.body.add(copy);
    });
    this.body.rotation.y = Math.PI / 2;
    this.body.scale.setScalar(C.bodyScale);
    this.body.position.fromArray(C.bodyPosition);
    holder.add(this.body);
    const yellow = new THREE.MeshStandardMaterial({ color: 0x9b7627, roughness: 0.7 });
    const grey = new THREE.MeshStandardMaterial({ color: 0x777b76, roughness: 0.86 });
    this.legs = [0, 1].map(() => {
      const upper = linkMesh(grey, 0.052), lower = linkMesh(yellow, 0.024), foot = createWebFoot(yellow);
      holder.add(upper, lower, foot);
      return { upper, lower, foot, hip: new THREE.Vector3(), knee: new THREE.Vector3(), target: new THREE.Vector3() };
    });
    this.wings = [-1, 1].map(side => {
      const upper = linkMesh(grey, 0.055), tip = linkMesh(grey, 0.035);
      holder.add(upper, tip);
      return { upper, tip, shoulder: new THREE.Vector3(-0.17, 1.07, side * 0.18), elbow: new THREE.Vector3(), grip: new THREE.Vector3() };
    });
    this.cycleTime = 0;
  }

  update(time, distance) {
    const phase = (time - 99.38) * C.cadence;
    this.cycleTime = phase;
    this.bike.update(distance / C.wheelRadius, phase);
    this.body.position.y = C.bodyPosition[1] + Math.sin(phase * 2) * 0.008;
    for (let i = 0; i < this.legs.length; i++) {
      const leg = this.legs[i];
      leg.hip.fromArray(C.hip); leg.hip.z = (i ? -1 : 1) * C.stance;
      this.bike.pedalPosition(i, leg.target);
      bicycleKnee(leg.hip, leg.target, leg.knee);
      placeLink(leg.upper, leg.hip, leg.knee); placeLink(leg.lower, leg.knee, leg.target);
      leg.foot.position.copy(leg.target);
    }
    const grips = ['Lenkergriff', 'Lenkergriff_1'];
    for (let i = 0; i < this.wings.length; i++) {
      const wing = this.wings[i], node = this.bike.root.getObjectByName(grips[i]);
      this.bike.box.setFromObject(node).getCenter(wing.grip); this.holder.worldToLocal(wing.grip);
      wing.elbow.copy(wing.shoulder).lerp(wing.grip, 0.55); wing.elbow.y -= 0.06;
      placeLink(wing.upper, wing.shoulder, wing.elbow); placeLink(wing.tip, wing.elbow, wing.grip);
    }
  }
}
