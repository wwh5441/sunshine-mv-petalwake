const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire('/Users/weckham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { chromium } = req('playwright');
const root = path.resolve(__dirname, '../..');

(async () => {
  const plan = JSON.parse(await fs.readFile(process.argv[2] || path.join(root, 'mv_sunshine/data/review_segments_20261117.json'), 'utf8'));
  const output = path.join(root, 'mv_sunshine/outputs', plan.outputFolder || 'review_20261117');
  const timeline = JSON.parse(await fs.readFile(path.join(root, 'mv_sunshine/data/timeline_full.json'), 'utf8'));
  const onlyShot = process.argv[3] ? timeline.shots.find(s => s.id === process.argv[3]) : null;
  if (process.argv[3] && !onlyShot) throw new Error(`Unknown shot: ${process.argv[3]}`);
  await fs.mkdir(path.join(output, 'frames'), { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 720, height: 960 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 1000)); });
  let frame = 0;
  const manifest = { fps: plan.fps, width: 720, height: 960, fileName: plan.fileName, segments: [] };
  try {
    await page.goto('http://localhost:6280/mv_sunshine.html?headless=1&q=low');
    await page.waitForFunction(() => window.__SUNSHINE_READY__ || window.__SUNSHINE_BOOT_ERROR__, null, { timeout: 120000 });
    const error = await page.evaluate(() => window.__SUNSHINE_BOOT_ERROR__);
    if (error) throw new Error(error);
    for (const segment of plan.segments) {
      const count = Math.round((segment.end - segment.start) * plan.fps);
      manifest.segments.push({ ...segment, frameStart: frame, frameCount: count, duration: count / plan.fps });
      for (let i = 0; i < count; i++) {
        const time = segment.start + i / plan.fps;
        if (onlyShot && (time < onlyShot.start || time >= onlyShot.end)) { frame++; continue; }
        const data = await page.evaluate(t => captureMVFrame(t, 'image/jpeg', 0.92), time);
        await fs.writeFile(path.join(output, 'frames', `${String(frame).padStart(6, '0')}.jpg`), Buffer.from(data, 'base64'));
        frame++;
        if (frame % 120 === 0) console.log(`已渲染 ${frame} 帧`);
        if (errors.length) throw new Error(errors[0]);
      }
      console.log(`完成：${segment.label}`);
    }
    manifest.frames = frame;
    manifest.duration = frame / plan.fps;
    manifest.errors = errors;
    await fs.writeFile(path.join(output, 'render_manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify({ frames: frame, duration: manifest.duration, output }));
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
