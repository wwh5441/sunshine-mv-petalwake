// A restrained illustrated afternoon: warm sunlight, open shadows, matte cloth.
export const VISUAL_STYLE = {
  character: {
    skin: { lit:[.36,.34,.33], shade:[.29,.28,.28] },
    cloth: { lit:[.32,.30,.29], shade:[.24,.23,.23] },
    toony:.66, shift:.04,
  },
  lights: { key:.72, sky:.68, bounce:.20 },
  grade: { exposure:[.98,.98], saturation:1.02, contrast:1.01, bloom:[.04,.065], rays:[.25,.45], vignette:.10, blur:.18 },
  sun: { noon:[3.30,3.05,2.72], afternoon:[3.45,2.97,2.50], dusk:[3.10,2.60,2.28] },
};
