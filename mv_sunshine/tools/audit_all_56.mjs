// Renders ALL 56 shots (IMG-01..IMG-56) and builds 4 labeled contact sheets for 100% full-timeline visual audit.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PETALWAKE_ROOT, startLocalServer, withMetalBrowser } from './cdp_client.mjs';

const timelinePath = path.join(PETALWAKE_ROOT, 'mv_sunshine/data/timeline_full.json');
const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
const outDir = path.join(PETALWAKE_ROOT, 'mv_sunshine/outputs/audit_56');
fs.mkdirSync(outDir, { recursive: true });

const srv = await startLocalServer();
try {
  await withMetalBrowser(540, 720, async ({ openMVPage }) => {
    const page = await openMVPage(`${srv.baseUrl}/mv_sunshine.html?headless=1&demo=1&q=high`);
    for (const shot of timeline.shots) {
      const sampleT =
        shot.id === 'IMG-01' ? 2.2 : +(shot.start + (shot.end - shot.start) * 0.52).toFixed(2);
      const b64 = await page.evaluate(
        ({ t }) => window.captureMVFrame(t, 'image/jpeg', 0.90),
        { t: sampleT }
      );
      const file = path.join(outDir, `${shot.id}.jpg`);
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    }
    console.log(`[audit_56] Rendered all ${timeline.shots.length} shots to ${outDir}`);
  });
} finally {
  await srv.close();
}

// Stitch into 4 crisp 4x4 contact sheets using Python PIL
const py = `
import glob, os
from PIL import Image

out_dir = ${JSON.stringify(outDir)}
imgs = sorted(glob.glob(os.path.join(out_dir, "IMG-*.jpg")))
W, H = 360, 480
cols, rows = 4, 4
per_sheet = cols * rows
for s_idx in range(0, len(imgs), per_sheet):
    batch = imgs[s_idx:s_idx + per_sheet]
    r_cnt = (len(batch) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * W, r_cnt * H), (18, 15, 12))
    for i, p in enumerate(batch):
        im = Image.open(p).resize((W, H), Image.Resampling.LANCZOS)
        sheet.paste(im, ((i % cols) * W, (i // cols) * H))
    sp = os.path.join(out_dir, f"sheet_{(s_idx // per_sheet) + 1}.jpg")
    sheet.save(sp, quality=90)
    print("[sheet]", sp)
`;
execFileSync('python3', ['-c', py], { stdio: 'inherit' });
