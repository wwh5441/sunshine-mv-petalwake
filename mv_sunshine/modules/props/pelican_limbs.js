import * as THREE from 'three';
import { PELICAN_CYCLIST as C } from '../../data/pelican_cyclist.js';

const up = new THREE.Vector3(0, 1, 0);
export function linkMesh(material, radius) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.82, 1, 10), material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

export function placeLink(mesh, a, b) {
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.y = a.distanceTo(b);
  mesh.quaternion.setFromUnitVectors(up, new THREE.Vector3().subVectors(b, a).normalize());
}

export function bicycleKnee(hip, foot, target) {
  const d = new THREE.Vector3().subVectors(foot, hip), length = d.length();
  const reach = Math.min(C.upperLeg + C.lowerLeg - 1e-5, Math.max(length, 1e-5));
  d.normalize();
  const along = (C.upperLeg ** 2 - C.lowerLeg ** 2 + reach ** 2) / (2 * reach);
  const bend = new THREE.Vector3(1, 0, 0).addScaledVector(d, -d.x).normalize();
  return target.copy(hip).addScaledVector(d, along).addScaledVector(bend, Math.sqrt(Math.max(0, C.upperLeg ** 2 - along ** 2)));
}

export function createWebFoot(material) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.04, -0.055); shape.lineTo(0.12, -0.085);
  shape.quadraticCurveTo(0.17, -0.02, 0.16, 0.055);
  shape.lineTo(0.11, 0.075); shape.lineTo(-0.04, 0.045); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.008, bevelSegments: 2, steps: 1 });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}
