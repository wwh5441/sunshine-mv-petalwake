// Full 30fps Metal-WebGL sequence renderer for 《阳光晒暖了被》 0..32.40s (972 frames @ 720x960).
// Splits work along whole-shot boundaries across 2 parallel Metal WebGL tabs so vortex wakes,
// flower petals, cloth ripples, and camera motion blur remain 100% temporally continuous!
import fs from 'node:fs';
import path from 'node:path';
import { PETALWAKE_ROOT, startLocalServer, withMetalBrowser } from './cdp_client.mjs';

const timelinePath = path.join(PETALWAKE_ROOT, 'mv_sunshine/data/timeline_30s.json');
const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));

const fps = timeline.meta.fps || 30;
const clipDur = timeline.meta.clipDuration || 32.4;
const totalFrames = Math.round(clipDur * fps);
const outDir = path.join(PETALWAKE_ROOT, 'mv_sunshine/outputs/frames_30s_demo');
fs.mkdirSync(outDir, { recursive: true });

// Partition frame ranges cleanly at shot #4 boundary (15.42s -> frame 462)
const splitFrame = Math.round(timeline.shots[4].start * fps);
const ranges = [
  { id: 0, start: 0, end: splitFrame },
  { id: 1, start: splitFrame, end: totalFrames },
];

console.log(`[render_30s] Exporting ${totalFrames} frames (0.00s -> ${clipDur.toFixed(2)}s @ ${fps}fps, 720x960)...`);
const t0 = performance.now();
let done = 0;

const srv = await startLocalServer();
try {
  await withMetalBrowser(720, 960, async ({ openMVPage }) => {
    const pages = await Promise.all(
      ranges.map(() => openMVPage(`${srv.baseUrl}/mv_sunshine.html?headless=1&demo=1&q=high`))
    );

    await Promise.all(
      ranges.map(async (range, wi) => {
        const page = pages[wi];
        for (let f = range.start; f < range.end; f++) {
          const sec = f / fps;
          const b64 = await page.evaluate(
            ({ t }) => window.captureMVFrame(t, 'image/jpeg', 0.94),
            { t: sec }
          );
          if (page.errors.length) {
            throw new Error(`Worker ${wi} runtime error at frame ${f}: ${page.errors[0]}`);
          }
          const file = path.join(outDir, `frame_${String(f).padStart(6, '0')}.jpg`);
          await fs.promises.writeFile(file, Buffer.from(b64, 'base64'));
          done++;
          if (done % 120 === 0 || done === totalFrames) {
            const elapsed = (performance.now() - t0) / 1000;
            const rate = (done / elapsed).toFixed(1);
            const pct = ((done / totalFrames) * 100).toFixed(1);
            console.log(`[render_30s] ${done}/${totalFrames} (${pct}%) — ${rate} fps`);
          }
        }
      })
    );
  });
} finally {
  await srv.close();
}

const totalSec = ((performance.now() - t0) / 1000).toFixed(1);
console.log(`[render_30s] Finished ${totalFrames} frames in ${totalSec}s -> ${outDir}`);
