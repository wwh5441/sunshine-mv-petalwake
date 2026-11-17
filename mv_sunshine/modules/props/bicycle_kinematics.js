import * as THREE from 'three';

export class BicycleKinematics {
  constructor(holder) {
    this.holder = holder;
    this.root = holder.children[0];
    this.root.rotation.y = Math.PI; // the model's front wheel originally faces -X
    this.wheels = ['RadHinten', 'RadVorn'].map(name => this.root.getObjectByName(name)).filter(Boolean);
    this.crank = this.root.getObjectByName('Pedale');
    this.pedals = ['Pedal_Funn_Bigfoot_le', 'Pedal_Funn_Bigfoot_re'].map(name => this.root.getObjectByName(name));
    this.original = new Map([...this.wheels, this.crank, ...this.pedals].filter(Boolean).map(node => [node, node.quaternion.clone()]));
    this.axis = new THREE.Vector3(0, 1, 0);
    this.rotation = new THREE.Quaternion();
    this.point = new THREE.Vector3();
    this.box = new THREE.Box3();
  }

  update(wheelAngle, crankAngle) {
    for (const wheel of this.wheels) wheel.quaternion.copy(this.original.get(wheel)).multiply(this.rotation.setFromAxisAngle(this.axis, -wheelAngle));
    this.crank.quaternion.copy(this.original.get(this.crank)).multiply(this.rotation.setFromAxisAngle(this.axis, crankAngle));
    for (const pedal of this.pedals) pedal.quaternion.copy(this.original.get(pedal)).multiply(this.rotation.setFromAxisAngle(this.axis, -crankAngle));
    this.holder.updateWorldMatrix(true, true);
  }

  pedalPosition(index, target) {
    this.box.setFromObject(this.pedals[index]);
    this.box.getCenter(target);
    this.holder.worldToLocal(target);
    target.y += 0.025;
    return target;
  }
}
