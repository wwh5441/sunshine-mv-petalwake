// Targets relative to the midpoint of the shoulders, in the performer's frame.
// Negative Z is forward; separate elbow poles keep the sleeves outside the torso.
export const ARM_POSES = {
  rest: { left: [-.32,-.50,-.08], right: [.33,-.495,-.08] },
  offer: { left: [-.32,-.50,-.08], right: [.25,-.35,-.30] },
  book: { left: [-.18,-.35,-.34], right: [.18,-.35,-.34] },
  breeze: { left: [-.32,-.50,-.08], right: [.32,-.36,-.23] },
  wave: { left: [-.32,-.50,-.08], right: [.32,.02,-.17] },
  sweet: { left: [-.32,-.50,-.08], right: [.23,-.30,-.31] },
  settle: { left: [-.28,-.46,-.16], right: [.28,-.47,-.15] },
  sleepy: { left: [-.32,-.50,-.08], right: [.23,-.39,-.23] },
  gather: { left: [-.22,-.32,-.33], right: [.22,-.33,-.33] },
  stretch: { left: [-.34,.22,-.08], right: [.34,.24,-.10] },
};

export const ELBOW_POSES = {
  gather: { left: [-.40,-.40,-.10], right: [.40,-.40,-.10] },
  book: { left: [-.40,-.40,-.10], right: [.40,-.40,-.10] },
  stretch: { left: [-.48,.05,-.05], right: [.48,.05,-.05] },
};

// Finger direction and palm normal, mirrored for the left hand.
export const HAND_POSES = {
  rest:{direction:[.05,-.99,-.10],normal:[-.97,-.04,-.20]},
  offer:{direction:[.10,-.06,-.99],normal:[-.60,.60,-.10]},
  sweet:{direction:[.08,.12,-.99],normal:[-.65,.65,.05]},
  book:{direction:[-.16,-.04,-.99],normal:[-.40,.88,-.05]},
  gather:{direction:[-.10,.02,-.99],normal:[-.60,.70,-.05]},
  settle:{direction:[.05,-.80,-.60],normal:[-.95,.10,-.15]},
  sleepy:{direction:[.08,-.12,-.99],normal:[-.90,.30,-.12]},
  breeze:{direction:[.22,-.18,-.95],normal:[-.70,.65,-.10]},
  wave:{direction:[.04,.99,-.10],normal:[0,-.10,-.99]},
  stretch:{direction:[-.10,.99,-.03],normal:[-.99,-.10,-.10]},
};

// A cue begins on its aligned word, with a short anticipation and recovery.
export const LYRIC_GESTURES = [
  { match: '拿了常用的杯', word: '拿', pose: 'offer' },
  { match: '读着读着就睡', word: '读', pose: 'book', then: { word: '睡', pose: 'sleepy' } },
  { match: '招手', word: '招', pose: 'wave', then: { word: '起', pose: 'breeze' } },
  { match: '我在旁边发呆', word: '我', pose: 'rest', then: { word: '风', pose: 'breeze' } },
  { match: '连一口温水', word: '口', pose: 'offer', then: { word: '甜', pose: 'sweet' } },
  { match: '靠着椅背', word: '靠', pose: 'settle' },
  { match: '闭上眼睛', word: '闭', pose: 'sleepy' },
  { match: '被子收回来', word: '被', pose: 'gather', then: { word: '阳', pose: 'offer' } },
  { match: '就有一点想睡', word: '就', pose: 'sleepy' },
  { match: '我还想再看一眼', word: '看', pose: 'offer', then: { word: '眼皮', pose: 'sleepy' } },
  { match: '伸个懒腰', word: '伸', pose: 'stretch', then: { word: '天', pose: 'breeze' } },
  { match: '我再坐一会', word: '坐', pose: 'settle' },
];

export const ARM_MOTION = {
  anticipation: .34, transition: .92, recovery: 1.05, handDelay:.12,
  elbow: { left: [-.41,-.40,-.01], right: [.41,-.40,-.01] },
  fingers: {Index:[.10,.13,.06],Middle:[.14,.18,.08],Ring:[.20,.25,.10],Little:[.25,.30,.12]},
};
