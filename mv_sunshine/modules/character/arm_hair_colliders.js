import * as THREE from 'three';
import {
  VRMSpringBoneCollider,
  VRMSpringBoneColliderShapeCapsule,
  VRMSpringBoneColliderShapeSphere,
} from '@pixiv/three-vrm';

// Install native three-vrm sphere & capsule colliders along head, neck, torso, shoulders, and animated arms.
// Offsets/tails inherit bone matrices. Radii use world metres in this build.
export function installArmHairColliders(vrm, config) {
  const colliders = [];
  vrm.scene.updateWorldMatrix(true, true);

  for (const spec of config.bodyColliders || []) {
    if (spec.type === 'sphere') {
      const bone = vrm.humanoid.getRawBoneNode(spec.bone);
      if (!bone) continue;
      const offset = new THREE.Vector3(...(spec.offset || [0, 0, 0]));
      const collider = new VRMSpringBoneCollider(
        new VRMSpringBoneColliderShapeSphere({ offset, radius: spec.radius })
      );
      collider.name = `HairGuard:${spec.bone}`;
      bone.add(collider);
      colliders.push(collider);
    } else {
      const bone = vrm.humanoid.getRawBoneNode(spec.from);
      const end = vrm.humanoid.getRawBoneNode(spec.to);
      if (!bone || !end) continue;
      const tail = bone.worldToLocal(end.getWorldPosition(new THREE.Vector3()));
      const collider = new VRMSpringBoneCollider(
        new VRMSpringBoneColliderShapeCapsule({ tail, radius: spec.radius })
      );
      collider.name = `HairGuard:${spec.from}-${spec.to}`;
      bone.add(collider);
      colliders.push(collider);
    }
  }

  for (const side of ['left', 'right']) {
    for (const segment of config.arms || []) {
      const bone = vrm.humanoid.getRawBoneNode(side + segment.from);
      const end = vrm.humanoid.getRawBoneNode(side + segment.to);
      if (!bone || !end) continue;
      const tail = bone.worldToLocal(end.getWorldPosition(new THREE.Vector3()));
      const collider = new VRMSpringBoneCollider(
        new VRMSpringBoneColliderShapeCapsule({ tail, radius: segment.radius })
      );
      collider.name = `HairGuard:${side}${segment.from}`;
      bone.add(collider);
      colliders.push(collider);
    }
  }

  const group = { name: 'Body & Animated Arms', colliders };
  for (const joint of vrm.springBoneManager.joints) {
    if (!/DS_hair/.test(joint.bone.name)) continue;
    joint.colliderGroups.push(group);
    vrm.springBoneManager.addJoint(joint);
  }

  // Thigh and shin capsules support cloth motion around the seated legs.
  const legColliders = [];
  for (const side of ['left', 'right']) {
    for (const segment of config.legs || []) {
      const bone = vrm.humanoid.getRawBoneNode(side + segment.from);
      const end = vrm.humanoid.getRawBoneNode(side + segment.to);
      if (!bone || !end) continue;
      const tail = bone.worldToLocal(end.getWorldPosition(new THREE.Vector3()));
      const collider = new VRMSpringBoneCollider(
        new VRMSpringBoneColliderShapeCapsule({ tail, radius: segment.radius })
      );
      collider.name = `SkirtGuard:${side}${segment.from}`;
      bone.add(collider);
      legColliders.push(collider);
    }
  }
  if (legColliders.length) {
    const legGroup = { name: 'Seated Legs', colliders: legColliders };
    for (const joint of vrm.springBoneManager.joints) {
      if (!/DS_skirt/.test(joint.bone.name)) continue;
      joint.colliderGroups.push(legGroup);
      vrm.springBoneManager.addJoint(joint);
    }
  }
  return [...colliders, ...legColliders];
}
