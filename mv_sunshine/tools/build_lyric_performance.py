"""Force-align the known lyrics to the existing soundtrack; emit browser visemes.

Uses the already installed stable-ts/faster-whisper model, without uploading audio.
Run with MUSIC/multitrack/.audio-env/bin/python. Raw tokens remain in diagnostics.
"""
import json
import os
import re
import sys
import subprocess
from pathlib import Path

import numpy as np
import stable_whisper
from scipy.signal import butter, sosfiltfilt
from imageio_ffmpeg import get_ffmpeg_exe

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, '/Users/weckham/Desktop/MUSIC/suno_studio/vendor')
from pypinyin import lazy_pinyin

RAW = ROOT / 'diagnostics/lyric_alignment'
RAW.mkdir(parents=True, exist_ok=True)
SR = 16000
STEP = .02


def viseme(py):
    # Five authored VRM vowels, approximating the Mandarin final.
    final = re.sub(r'^(zh|ch|sh|[bpmfdtnlgkhjqxrzcswy])', '', py)
    if 'a' in final:
        return {'aa': .88, 'oh': .08}
    if 'o' in final:
        return {'oh': .86, 'ou': .1}
    if 'e' in final:
        return {'ee': .82, 'aa': .10}
    if 'v' in final or 'u' in final:
        return {'ou': .90, 'ih': .06}
    return {'ih': .84, 'ee': .10}


def main():
    os.environ['HF_HUB_OFFLINE'] = '1'
    timeline = json.loads((ROOT / 'data/timeline_full.json').read_text())
    decoded = subprocess.run([get_ffmpeg_exe(), '-v', 'error', '-i', str(ROOT / 'sunshine.mp3'),
                              '-ac', '1', '-ar', str(SR), '-f', 'f32le', 'pipe:1'],
                             capture_output=True, check=True).stdout
    audio = np.frombuffer(decoded, dtype='<f4').copy()
    band = sosfiltfilt(butter(3, [180, 2600], btype='bandpass', fs=SR, output='sos'), audio)
    model = None
    lines = []
    for lyric in timeline['lyrics']:
        chars = re.findall(r'[\u4e00-\u9fff]', lyric['text'])
        target = RAW / f"{lyric['index']:02}.json"
        w0, w1 = max(0, lyric['start'] - .12), min(len(audio)/SR, lyric['end'] + .12)
        if target.exists():
            raw = json.loads(target.read_text())
        else:
            if model is None:
                model = stable_whisper.load_faster_whisper('small', device='cpu', compute_type='int8',
                                                           cpu_threads=6, local_files_only=True)
            print(f"Align {lyric['index']:02}: {lyric['text']}", flush=True)
            result = model.align(audio[round(w0*SR):round(w1*SR)], ' '.join(chars), language='zh',
                                 original_split=True, fast_mode=True, suppress_silence=True, verbose=False)
            if result is None:
                raise RuntimeError(f"Alignment failed: {lyric['index']}")
            result.offset_time(w0)
            raw = result.to_dict()
            target.write_text(json.dumps(raw, ensure_ascii=False, indent=2))
        tokens = [word for segment in raw['segments'] for word in segment['words']]
        syllables = []
        for word in tokens:
            units = re.findall(r'[\u4e00-\u9fff]', word['word'])
            for i, (char, py) in enumerate(zip(units, lazy_pinyin(''.join(units)))):
                s = max(lyric['start'], word['start']+(word['end']-word['start'])*i/max(1,len(units)))
                e = min(lyric['end'], word['start']+(word['end']-word['start'])*(i+1)/max(1,len(units)))
                syllables.append({'text':char, 'pinyin':py, 'start':round(s,3), 'end':round(max(s,e),3),
                                  'weights':viseme(py), 'source':'split-token' if len(units)>1 else 'aligned-char',
                                  'review': bool(e-s < .045)})
        rms = []
        for t in np.arange(lyric['start'], lyric['end']+STEP, STEP):
            window=band[max(0,round((t-.02)*SR)):round((t+.02)*SR)]
            rms.append(float(np.sqrt(np.mean(window**2))) if len(window) else 0)
        rms = np.asarray(rms)
        lo, hi = np.percentile(rms, [8, 90])
        env = np.clip((rms-lo*.7)/max(1e-7,hi-lo*.7),0,1)**.6
        line = {**lyric, 'step':STEP, 'envelope':np.round(env,3).tolist(), 'syllables':syllables}
        lines.append(line)
        print(f"  {len(syllables)} chars; short spans: {sum(x['review'] for x in syllables)}", flush=True)
    output={'version':1, 'source':'sunshine.mp3', 'method':'stable-ts faster-whisper small forced alignment on soundtrack; Mandarin pinyin to five VRM vowels; bandpassed amplitude envelope',
            'limitation':'Singing alignment is approximate; split-token intervals and short spans are marked for review. Not phoneme-level ground truth.', 'lines':lines}
    (ROOT/'data/lyric_performance.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
    print('Wrote lyric_performance.json',flush=True)


if __name__ == '__main__':
    main()
