const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire('/Users/weckham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { chromium } = req('playwright');
const out = '/Users/weckham/Desktop/科技峰会重要访谈/资料/MV头发穿模诊断_2026-11-17/女主飞行';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-unsafe-swiftshader'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 720, height: 960 } });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 1000)); });
    await page.goto('http://localhost:6280/mv_sunshine.html?headless=1&q=low');
    await page.waitForFunction(() => window.__SUNSHINE_READY__ || window.__SUNSHINE_BOOT_ERROR__, null, { timeout: 120000 });
    const checks = await page.evaluate(async () => {
      const THREE = await import('three'), { HERO_FLIGHT: C } = await import('./mv_sunshine/data/hero_flight.js');
      const { checkHairSurface } = await import('./mv_sunshine/tools/diagnostics/hair_surface_check.js');
      const g = SUNSHINE_MV, h = g.princess, v = new THREE.Vector3(), floor = g.scannedSets.floorSupport;
      const furniture = [];
      for (const [key, mesh] of [['keep', g.scannedSets.teaTable.children[0]], ['library', g.scannedSets.readingTable]]) {
        mesh.updateWorldMatrix(true, true);
        const parent = mesh.parent, inv = parent.matrixWorld.clone().invert(), bounds = new THREE.Box3();
        mesh.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) bounds.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv)); });
        let unsupported = 0, maxGap = 0, samples = 0;
        for (let ix = 0; ix <= 12; ix++) for (let iz = 0; iz <= 8; iz++) {
          v.set(bounds.min.x + (bounds.max.x - bounds.min.x) * ix / 12, bounds.min.y, bounds.min.z + (bounds.max.z - bounds.min.z) * iz / 8).applyMatrix4(parent.matrixWorld);
          for (const [dx, dz] of [[0, 0], [0.08, 0], [-0.08, 0], [0, 0.08], [0, -0.08]]) {
            const y = floor.heightAt(key, v.x + dx, v.z + dz); samples++;
            if (y === null) unsupported++; else maxGap = Math.max(maxGap, Math.abs(v.y - y));
          }
        }
        furniture.push({ key, samples, unsupported, maxGap });
      }
      const flights = [];
      for (const shot of g.director.timeline.shots.filter(s => s.mode.startsWith('fly_'))) {
        g.director.lastTime = -999;
        let handError = 0, maxHairDistance = 0, visible = true, minGround = Infinity;
        for (let i = 0; i <= 60; i++) {
          const t = shot.start + (shot.end - shot.start) * (0.001 + i / 60 * 0.998);
          g.director.seekAndStep(t);
          h.group.updateWorldMatrix(true, true);
          for (const side of ['left', 'right']) {
            h.group.worldToLocal(h.flightPose.bones[side + 'Hand'].getWorldPosition(v));
            handError = Math.max(handError, v.distanceTo(new THREE.Vector3(...C.hands[side])));
          }
          const head = h.vrm.humanoid.getRawBoneNode('head').getWorldPosition(new THREE.Vector3());
          for (const joint of h.vrm.springBoneManager.joints) if (/DS_hair/.test(joint.bone.name)) maxHairDistance = Math.max(maxHairDistance, joint.bone.getWorldPosition(v).distanceTo(head));
          visible &&= h.group.visible && g.heroBroom.visible && !g.rider.group.visible;
          minGround = Math.min(minGround, g.flight.pos.y - g.flight.coverAt(g.flight.pos.x, g.flight.pos.z, t));
        }
        flights.push({ id: shot.id, handError, maxHairDistance, visible, minGround });
      }
      const cycling = [];
      for (let i = 0; i <= 120; i++) {
        const t = 99.38 + 3.62 * i / 120;
        g.director.seekAndStep(Math.min(102.999, t));
        const cyclist = g.scannedSets.pelicanCyclist;
        let error = 0, upperError = 0, lowerError = 0;
        for (let side = 0; side < 2; side++) {
          const leg = cyclist.legs[side];
          error = Math.max(error, leg.foot.position.distanceTo(cyclist.bike.pedalPosition(side, v)));
          upperError = Math.max(upperError, Math.abs(leg.upper.scale.y - 0.36));
          lowerError = Math.max(lowerError, Math.abs(leg.lower.scale.y - 0.39));
        }
        cycling.push({ t, error, upperError, lowerError, wheelQuaternion: cyclist.bike.wheels[0].quaternion.toArray() });
      }
      const standing = [];
      for (const t of [14.2, 27.6, 69.4, 83.2, 109.8, 132, 171, 202]) {
        g.director.seekAndStep(t); g.renderScene(1 / 30);
        standing.push({ t, flying: h.flying, ...checkHairSurface(h) });
      }
      g.director.seekAndStep(96.5); g.renderScene(1 / 30);
      const joints = [...h.vrm.springBoneManager.joints], tails = joints.map(j => j._currentTail.clone());
      for (let i = 0; i < 120; i++) { g.director.seekAndStep(96.5); g.renderScene(1 / 30); }
      const pauseDrift = Math.max(...joints.map((j, i) => j._currentTail.distanceTo(tails[i])));
      return { furniture, flights, cycling, standing, pauseDrift, heroUUID: h.vrm.scene.uuid, legacyVisible: g.rider.group.visible, programErrors: g.renderer.info.programs.filter(p => p.diagnostics?.runnable === false).length };
    });
    await fs.writeFile(path.join(out, '第三轮核验.json'), JSON.stringify({ date: '2026-11-17', errors, ...checks }, null, 2));
    console.log(JSON.stringify({ furniture: checks.furniture, flights: checks.flights, cyclingSamples: checks.cycling.length, pedalError: Math.max(...checks.cycling.map(c => c.error)), upperLegError: Math.max(...checks.cycling.map(c => c.upperError)), lowerLegError: Math.max(...checks.cycling.map(c => c.lowerError)), standingPenetrations: checks.standing.map(s => s.penetratingAfter), pauseDrift: checks.pauseDrift, programErrors: checks.programErrors, errors }));
    if (errors.length || checks.furniture.some(c => c.unsupported || c.maxGap > 0.025) || checks.flights.some(c => !c.visible || c.handError > 0.01 || !Number.isFinite(c.maxHairDistance)) || checks.cycling.some(c => c.error > 0.001 || c.upperError > 0.001 || c.lowerError > 0.001) || checks.pauseDrift || checks.programErrors || checks.standing.some(s => s.penetratingAfter)) throw new Error('核验未通过，见第三轮核验.json');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
