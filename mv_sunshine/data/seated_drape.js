// Sections of the original long skirt. Centres are relative to the seated hips.
// Keep sections level with gravity: rotating a wide skirt around a knee folds
// its inner surface through the thighs. The lap needs room for BOTH thighs.
export const SEATED_DRAPE = {
  samples:80, top:.13, length:1.09,
  sections:[
    {at:0,    centre:[0,.13,0],           spread:[1,1]},
    {at:.10,  centre:[0,.05,0],           spread:[1.05,1.05]},
    {at:.22,  centre:[-.04,-.02,-.05],    spread:[1.30,1.45]},
    {at:.40,  centre:[-.19,-.145,-.17],   spread:[1.48,1.65]},
    {at:.55,  centre:[-.23,-.31,-.29],    spread:[.97,.97]},
    {at:.80,  centre:[-.24,-.57,-.30],    spread:[.70,.70]},
    {at:1,    centre:[-.23,-.79,-.28],    spread:[.62,.62]},
  ],
};
