// Interactive playback presents one frame at the current song time. Offline
// still inspection retains the director's deterministic warm-up path.
export const PLAYBACK_POLICY={liveSettleSteps:3,settleDt:1/120,maxCatchupSteps:3,maxLiveDelta:1/20};
