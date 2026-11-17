// Measured chest-space & hips-space limits from `claude_chan.vrm`, plus bone colliders & sampling density.
export const HERO_CLEARANCE = {
  garmentMaterial: 'Material_upper_body',
  garmentMaterials: ['Material_upper_body', 'Material_skin_unified'],
  skirtMaterial: 'Material_lower_body',
  hairMaterial: 'Material_hair',
  anchor: 'chest',
  skirtAnchor: 'hips',
  hairMaxEdge: 0.018,
  // Bone offsets/tails are local coordinates; capsule radii are world metres.
  // The VRM already includes head/neck/torso guards; do not duplicate them.
  bodyColliders: [],
  arms: [
    { from: 'UpperArm', to: 'LowerArm', radius: 0.105 },
    { from: 'LowerArm', to: 'Hand', radius: 0.058 },
  ],
  legs: [
    { from: 'UpperLeg', to: 'LowerLeg', radius: 0.098 },
    { from: 'LowerLeg', to: 'Foot', radius: 0.068 },
  ],
  // Torso only. Moving sleeves use their own articulated capsules so they do
  // not become one wide front/back projection with the blouse.
  field: {
    width: 80,
    height: 80,
    minX: -0.28,
    maxX: 0.28,
    minY: -0.20,
    maxY: 0.265,
    clearance: 0.012,
    padding: 3,
    feather: 3,
    excludeLimbs: true,
  },
  // Waist + ankle-length skirt surface in hips space
  skirtField: {
    width: 80,
    height: 80,
    minX: -0.44,
    maxX: 0.44,
    minY: -0.58,
    maxY: 0.14,
    clearance: 0.012,
    padding: 3,
    feather: 3,
  },
};
