#!/usr/bin/env zsh
set -euo pipefail

export PATH="/Users/weckham/.cromma-bees/node/node-v24.22.1-darwin-arm64/bin:/Users/weckham/.cache/music-live/bin:$PATH"

FRAMES_DIR="/Users/weckham/Desktop/MUSIC/petalwake/mv_sunshine/outputs/frames_30s_demo"
AUDIO_SRC="/Users/weckham/Desktop/MUSIC/阳光晒暖了被_标准资产包/1.1_阳光晒暖了被_SQ无损母带_48kHz_24bit.wav"
OUT_DIR="/Users/weckham/Desktop/MUSIC/阳光晒暖了被_标准资产包/5_mv/5.1_4K"
OUT_MP4="$OUT_DIR/阳光晒暖了被_前30秒预览_720P_带镜号Demo.mp4"

mkdir -p "$OUT_DIR"

ffmpeg -y \
  -framerate 30 \
  -start_number 0 \
  -i "$FRAMES_DIR/frame_%06d.jpg" \
  -ss 0 -t 32.40 -i "$AUDIO_SRC" \
  -af "afade=t=out:st=31.75:d=0.65" \
  -c:v libx264 \
  -preset medium \
  -crf 18 \
  -pix_fmt yuv420p \
  -r 30 \
  -c:a aac \
  -b:a 256k \
  -ar 48000 \
  -movflags +faststart \
  -shortest \
  "$OUT_MP4"

echo "[encode_30s] Output ready: $OUT_MP4"
ls -lh "$OUT_MP4"
