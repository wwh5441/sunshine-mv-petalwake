#!/usr/bin/env python3
"""Encode the rendered review and matching music excerpts at review resolution."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'mv_sunshine/outputs' / (sys.argv[1] if len(sys.argv) > 1 else 'review_20261117')
FFMPEG = Path('/Users/weckham/.cache/music-live/bin/ffmpeg')

manifest = json.loads((OUT / 'render_manifest.json').read_text())
filters = []
for i, segment in enumerate(manifest['segments']):
    fade_out = max(0, segment['duration'] - 0.025)
    filters.append(
        f"[1:a]atrim=start={segment['start']}:duration={segment['duration']},"
        f"asetpts=PTS-STARTPTS,afade=t=in:d=0.025,afade=t=out:st={fade_out}:d=0.025[a{i}]"
    )
labels = ''.join(f'[a{i}]' for i in range(len(manifest['segments'])))
filters.append(f"{labels}concat=n={len(manifest['segments'])}:v=0:a=1[aout]")
graph = OUT / 'review_audio_filter.txt'
graph.write_text(';\n'.join(filters))
video = OUT / (manifest.get('fileName') or '阳光晒暖了被_头发与飞行修订_720P审片.mp4')
subprocess.run([
    str(FFMPEG), '-hide_banner', '-y', '-loglevel', 'warning',
    '-framerate', str(manifest['fps']), '-i', str(OUT / 'frames/%06d.jpg'),
    '-i', str(ROOT / 'mv_sunshine/sunshine.mp3'), '-filter_complex', ';\n'.join(filters),
    '-map', '0:v:0', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    '-t', str(manifest['duration']), str(video),
], check=True)
check = subprocess.run([str(FFMPEG), '-v', 'error', '-i', str(video), '-f', 'null', '-'], capture_output=True, text=True)
manifest['encoded'] = {'file': str(video), 'bytes': video.stat().st_size, 'fullDecodeExitCode': check.returncode, 'decodeErrors': check.stderr}
(OUT / 'render_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
if check.returncode or check.stderr:
    raise RuntimeError(check.stderr or 'Video decode failed')
print(json.dumps(manifest['encoded'], ensure_ascii=False))
