import * as THREE from 'three';

// Same bone aiming convention as the existing local studio's arm-ik.js.
const inverse = new THREE.Quaternion(), rotation = new THREE.Quaternion();
const origin = new THREE.Vector3(), end = new THREE.Vector3();
const from = new THREE.Vector3(), to = new THREE.Vector3();

export function aimBoneAt(bone, child, target, strength = 1) {
  bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(origin); child.getWorldPosition(end);
  inverse.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion())).invert();
  from.copy(end).sub(origin).applyQuaternion(inverse).normalize();
  to.copy(target).sub(origin).applyQuaternion(inverse).normalize();
  rotation.setFromUnitVectors(from, to);
  if (strength < 1) rotation.slerp(new THREE.Quaternion(), 1 - strength);
  bone.quaternion.premultiply(rotation);
  bone.updateWorldMatrix(false, true);
}

export function solveArm(upper, lower, hand, target) {
  for (let i = 0; i < 24; i++) {
    aimBoneAt(lower, hand, target, 0.9);
    aimBoneAt(upper, hand, target, 0.8);
  }
}

// A fixed bend plane keeps elbows outside the ribcage. CCD alone has many
// valid solutions, including folding a forearm behind/through the torso.
export function solveLimbWithPole(upper, lower, endBone, target, pole) {
  upper.updateWorldMatrix(true, true);
  const shoulder = upper.getWorldPosition(new THREE.Vector3());
  const elbow = lower.getWorldPosition(new THREE.Vector3());
  const wrist = endBone.getWorldPosition(new THREE.Vector3());
  const a = shoulder.distanceTo(elbow), b = elbow.distanceTo(wrist);
  const direction = target.clone().sub(shoulder);
  const distance = Math.min(a + b - 0.002, Math.max(Math.abs(a - b) + 0.002, direction.length()));
  direction.normalize();
  const bend = pole.clone().sub(shoulder);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  const along = (a * a - b * b + distance * distance) / (2 * distance);
  const lift = Math.sqrt(Math.max(0, a * a - along * along));
  const solvedElbow = shoulder.clone().addScaledVector(direction, along).addScaledVector(bend, lift);
  const solvedWrist = shoulder.clone().addScaledVector(direction, distance);
  aimBoneAt(upper, lower, solvedElbow);
  aimBoneAt(lower, endBone, solvedWrist);
  return solvedWrist.distanceTo(target);
}
