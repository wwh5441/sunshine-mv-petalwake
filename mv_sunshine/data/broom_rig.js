// One assembly frame shared by the shaft, straw, lantern and hand IK.
export const BROOM_RIG = {
  scale: 1.45,
  handleRadius: .028,
  seat: { t:1/3, pelvisOffset:[0,.145,0] },
  curve: [[0,.06,.72],[0,.07,.10],[0,.43,-.32],[0,.47,-1.40]],
  straw: { minZ: .48, pivot: [0,-.026,.50], mount: [0,.06,.72] },
  lantern: { minWeight: .15, pivot: [-.0007971589,-.035,-.82395035], mount: [0,.47,-1.40] },
  grips: { left: { t: .64, side: -.035 }, right: { t: .59, side: .035 } },
};
