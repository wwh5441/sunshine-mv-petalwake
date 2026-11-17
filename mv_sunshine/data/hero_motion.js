// Quiet body motion leaves the lyric gestures readable and the feet planted.
export const HERO_MOTION_FILES = {
  idle: 'idle_loop.vrma',
  model_pose: 'modelPose.vrma',
  greeting: 'greeting.vrma',
};

export const HERO_BODY_POSES = {
  mocap_look_around: { clip:'idle', start:.4, span:1.5, headPitch:-.025, headYaw:.07 },
  mocap_idle_warm: { clip:'idle', start:3.6, span:1.8, headPitch:-.02, headYaw:-.035 },
  mocap_thinking: { clip:'model_pose', start:.6, span:1.4, headPitch:.035, headYaw:.045 },
  mocap_sleepy: { clip:'idle', start:6.4, span:1.6, headPitch:.07, headYaw:-.025 },
  mocap_relax: { clip:'idle', start:4.2, span:1.6, headPitch:-.02, headYaw:.03 },
  mocap_goodbye: { clip:'idle', start:1.2, span:1.8, headPitch:-.025, headYaw:-.035 },
  mocap_blush_happy: { clip:'model_pose', start:1.6, span:1.4, headPitch:-.02, headYaw:.025 },
  mocap_greeting: { clip:'model_pose', start:1.2, span:1.2, headPitch:-.02, headYaw:-.025 },
  mocap_poise: { clip:'model_pose', start:2.4, span:1.2, headPitch:-.02, headYaw:.025 },
  mocap_wake_joy: { clip:'idle', start:1.8, span:1.6, headPitch:-.055, headYaw:.035 },
};
