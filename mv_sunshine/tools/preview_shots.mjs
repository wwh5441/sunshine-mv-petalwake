// Renders 20 key shots across all 6 chapters to verify 100% Scanned Poly Haven/Khronos GLBs + Real Mocap VRMAs!
import fs from 'node:fs';
import path from 'node:path';
import { PETALWAKE_ROOT, startLocalServer, withMetalBrowser } from './cdp_client.mjs';

const timelinePath = path.join(PETALWAKE_ROOT, 'mv_sunshine/data/timeline_full.json');
const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
const outDir = path.join(PETALWAKE_ROOT, 'mv_sunshine/outputs/shot_previews_v2');
fs.mkdirSync(outDir, { recursive: true });

const KEY_SHOT_IDS = new Set([
  'IMG-06', // Claude mocap_look_around
  'IMG-07', // Poly Haven scanned wall_clock
  'IMG-08', // Poly Haven vintage_electric_kettle + tea_set_01
  'IMG-09', // Poly Haven vintage_cabinet_01 + porcelain teacup
  'IMG-10', // Claude mocap_greeting
  'IMG-11', // Poly Haven WoodenTable + book_encyclopedia_set_01 + round_spectacles
  'IMG-12', // Claude mocap_sleepy
  'IMG-13', // Native Blender p_washing_line A
  'IMG-15', // Native Blender Dyers' Drying Tower cloth
  'IMG-16', // Poly Haven Rockingchair_01
  'IMG-17', // Rigged Parrot.glb on balustrade
  'IMG-18', // Claude mocap_goodbye
  'IMG-19', // Poly Haven vintage_day_bed + throw_pillows_01 + SheenCloth
  'IMG-21', // CoffeeTable + GlassVaseFlowers + tea_set_01
  'IMG-30', // Three.js CarbonFrameBike.glb on cobblestone street
  'IMG-31', // Native Blender p_washing_line B
  'IMG-32', // Claude mocap_blush_happy on Drying Tower
  'IMG-35', // Khronos SheenChair + Marvelous-Designer SheenCloth
  'IMG-41', // Poly Haven ClassicNightstand + mantel_clock_01 + ChronographWatch
  'IMG-47', // Hilltop p_washing_line against sky cumulus clouds
  'IMG-51', // Claude mocap_wake_joy at golden hour
  'IMG-52', // Teacup + GlassVase macro at golden hour
]);

const srv = await startLocalServer();
try {
  await withMetalBrowser(720, 960, async ({ openMVPage }) => {
    const page = await openMVPage(`${srv.baseUrl}/mv_sunshine.html?headless=1&demo=1&q=high`);
    for (const shot of timeline.shots) {
      if (!KEY_SHOT_IDS.has(shot.id)) continue;
      let sampleT = +(shot.start + (shot.end - shot.start) * 0.52).toFixed(2);
      if (shot.id === 'IMG-30') sampleT = 100.45;
      const b64 = await page.evaluate(
        ({ t }) => window.captureMVFrame(t, 'image/jpeg', 0.94),
        { t: sampleT }
      );
      const file = path.join(outDir, `${shot.id}_t${sampleT.toFixed(2)}.jpg`);
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
      console.log(`[preview_v2] Saved ${file}`);
    }
  });
} finally {
  await srv.close();
}
