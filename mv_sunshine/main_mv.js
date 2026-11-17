// Bootstrapper & Frame-Accurate Compositor for 《阳光晒暖了被》
// (100% Scanned Poly Haven / Khronos `.glb` + Real `.vrma` Mocap Edition — Zero Hand-Coded Primitives).
import * as THREE from 'three';
import { U, applyEnv } from '../src/core/ctx.js';
import { Pipeline } from '../src/core/pipeline.js';
import { Terrain, makeNoiseTexture } from '../src/world/terrain.js';
import { Sky } from '../src/world/sky.js';
import { Water } from '../src/world/water.js';
import { CloudBaker } from '../src/world/clouds.js';
import { Meadow } from '../src/world/meadow.js';
import { Flight } from '../src/player/flight.js';
import { Rider } from '../src/player/rider.js';
import { Wake } from '../src/fx/wake.js';
import { VortexWake } from '../src/fx/vortex.js';
import { Strip } from '../src/fx/strip.js';
import { WindFX } from '../src/fx/windfx.js';
import { River } from '../src/world/river.js';
import { Props } from '../src/world/props.js';
import { Town } from '../src/world/town.js';
import { Places } from '../src/world/places.js';

import { applySunshineWarmth, SunlitMotes } from './modules/env_warmth.js';
import { createPBRTextureLibrary } from './modules/pbr_textures.js';
import { loadGLBProps } from './modules/glb_props_loader.js';
import { CinePostFX } from './modules/cine_postfx.js';
import { ClaudeHero } from './modules/claude_hero.js';
import { createBroomProp } from './modules/character/broom_prop.js';
import { ScannedStageSets } from './modules/scanned_sets.js';
import { PelicanCyclist } from './modules/props/pelican_cyclist.js';
import { FloorSupport } from './modules/props/floor_support.js';
import { MVDirector } from './modules/director.js';
import { Overlay2D } from './components/overlay_2d.js';
import { WebPreviewPlayer } from './components/player_controls.js';
import { preparePreview } from './modules/prepare_preview.js';

const params = new URLSearchParams(location.search);
const isHeadless = params.get('headless') === '1';
const demoMode = params.get('demo') !== '0';

if (isHeadless) {
  document.body.classList.remove('preview-mode');
  document.body.classList.add('render-mode', 'headless-mode');
}

const stageEl = document.getElementById('mv-stage');
const webglCanvas = document.getElementById('view');
const overlayCanvas = document.getElementById('overlay');
const bootBanner = document.getElementById('boot-banner');

const compCanvas = document.createElement('canvas');
const compCtx = compCanvas.getContext('2d', { alpha: false });

const renderer = new THREE.WebGLRenderer({
  canvas: webglCanvas,
  antialias: false,
  alpha: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
  reversedDepthBuffer: true,
});
renderer.autoClear = true;
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.NoToneMapping;
renderer.info.autoReset = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(62, 720 / 960, 0.20, 60000);
const world = new THREE.Scene();
const pipeline = new Pipeline(renderer);
if (!pipeline.reversed) {
  camera.near = 0.5;
  camera.far = 40000;
  camera.updateProjectionMatrix();
}

const game = {
  renderer,
  camera,
  world,
  pipeline,
  U,
  time: 0,
  fov: 62,
  highQuality: true,
  ready: false,
};
window.SUNSHINE_MV = game;

function applyFov() {
  const baseV = game.fov;
  const hLimit = 112;
  const hFov = (2 * Math.atan(Math.tan((baseV * Math.PI) / 360) * camera.aspect) * 180) / Math.PI;
  camera.fov =
    hFov > hLimit
      ? (2 * Math.atan(Math.tan((hLimit * Math.PI) / 360) / camera.aspect) * 180) / Math.PI
      : baseV;
  camera.updateProjectionMatrix();
}
game.applyFov = applyFov;

let overlay2d = null;

function resizeStage(explicitW, explicitH) {
  game.viewVersion=(game.viewVersion||0)+1;
  const rect = stageEl.getBoundingClientRect();
  const maxDpr = game.highQuality ? 2.0 : 1.0;
  const dpr = isHeadless ? 1.5 : Math.min(window.devicePixelRatio || 1.5, maxDpr);
  const cssW = explicitW || Math.round(rect.width) || 720;
  const cssH = explicitH || Math.round(rect.height) || 960;
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  pipeline.scale = 1;
  pipeline.setSize(w, h, 1);
  camera.aspect = cssW / cssH;
  applyFov();
  overlay2d?.setSize(w, h);
  const outW = isHeadless ? cssW : w;
  const outH = isHeadless ? cssH : h;
  if (compCanvas.width !== outW || compCanvas.height !== outH) {
    compCanvas.width = outW;
    compCanvas.height = outH;
  }
}
window.addEventListener('resize', () => resizeStage());

const _bl = new THREE.Vector3();
const _br = new THREE.Vector3();

async function boot() {
  const lyricProtection=await fetch('./mv_sunshine/data/lyric_protection.json').then(r=>{if(!r.ok)throw new Error(`Lyric protection HTTP ${r.status}`);return r.json();});
  const lyricFonts=await document.fonts.load('400 80px "SunshineTencent"');
  if(!lyricFonts.length)throw new Error('Tencent lyric font did not load');
  const timeline = await fetch('./mv_sunshine/data/timeline_full.json').then((r) => {
    if (!r.ok) throw new Error(`timeline HTTP ${r.status}`);
    return r.json();
  });

  overlay2d = new Overlay2D(overlayCanvas, timeline, demoMode,lyricProtection);
  game.overlay2d=overlay2d;
  resizeStage(isHeadless ? timeline.meta.width : undefined, isHeadless ? timeline.meta.height : undefined);

  applyEnv('afternoon');
  applySunshineWarmth(pipeline);

  const pbrTex = (game.pbrTex = createPBRTextureLibrary());

  const noise = makeNoiseTexture();
  U.uNoiseTex.value = noise.texture;
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  blank.needsUpdate = true;
  U.uWakeTex.value = blank;
  U.uStripTex.value = blank;
  U.uShadowTex.value = blank;
  U.uTownSh0.value = blank;
  U.uTownSh1.value = blank;
  U.uTownMask0.value = blank;
  U.uTownMask1.value = blank;

  const riderLoad = Rider.load(renderer, './assets/models');
  const glbPropsLoad = loadGLBProps(renderer, './mv_sunshine/assets');
  const claudeLoad = ClaudeHero.load('./mv_sunshine/assets/claude_chan.vrm', './mv_sunshine/assets/vrma');
  const propsLoad = Props.load('./assets');
  const townLoad = Town.load(renderer, './assets');

  const terrain = (game.terrain = await Terrain.load(renderer, './assets'));
  terrain.mainView.mesh.renderOrder = 500;
  world.add(terrain.mainView.mesh);

  const meadow = (game.meadow = new Meadow(terrain, params.get('q') || 'high'));
  world.add(meadow.group);

  const sky = (game.sky = new Sky());
  world.add(sky.mesh);
  const clouds = (game.clouds = new CloudBaker(renderer));
  clouds.begin();
  while (!clouds.done) {
    clouds.step(4);
    await new Promise((r) => setTimeout(r, 0));
  }
  sky.cloudTex.value = clouds.texture;
  sky.cloudOn.value = 1;

  const water = (game.water = new Water(sky));
  water.setupReflection(renderer, terrain);
  world.add(water.mesh);

  const river = (game.river = new River(terrain, terrain.meta, sky));
  world.add(river.group);
  water.material.uniforms.uFallBase.value.set(river.fall.base.x, river.fall.base.z, river.fall.hw * 1.6);

  const worldProps = (game.props = await propsLoad);
  world.add(worldProps.group);
  if (worldProps.overlay) pipeline.overlay.add(worldProps.overlay);

  const town = (game.town = await townLoad);
  world.add(town.group);
  town.bakeShadows();

  const places = (game.places = await Places.load(renderer, terrain, './assets'));
  for (const p of places.list) {
    if (p.treasure) p.treasure.found = true;
  }
  world.add(places.group);
  await Promise.all([
    places.ensure('farewell_bridge').catch(() => {}),
    places.ensure('clock_meadow').catch(() => {}),
    places.ensure('marigold_wreck').catch(() => {}),
    places.ensure('wish_pine').catch(() => {}),
  ]);
  for (const p of places.list) {
    if (p.treasure?.mesh) p.treasure.mesh.visible = false;
  }

  const rider = (game.rider = await riderLoad);
  rider.group.visible = false;
  const princess = (game.princess = await claudeLoad);
  overlay2d.lyrics.setTiming(princess.performance.lines);
  const heroBroom = (game.heroBroom = createBroomProp(rider, pbrTex));
  const glbProps = (game.glbProps = await glbPropsLoad);

  const cinePostFX = (game.cinePostFX = new CinePostFX(pipeline, rider.sun));

  pipeline.overlay.add(rider.group, rider.lights, princess.group, heroBroom);
  pipeline.overlay.environment = sky.bakeEnvironment(renderer);

  // Mount 100% Photogrammetry & Sculpted Stage Sets
  const scannedSets = (game.scannedSets = new ScannedStageSets(pbrTex, glbProps));
  scannedSets.pelicanCyclist = await PelicanCyclist.attach(scannedSets.bike);
  scannedSets.floorSupport = new FloorSupport(town, scannedSets);
  scannedSets.group.traverse((o) => {
    if (!o.isMesh) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (mat?.isShadowMaterial) {
      o.castShadow = false;
      o.receiveShadow = true;
    } else {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  pipeline.overlay.add(scannedSets.group);

  const motes = (game.motes = new SunlitMotes(260));
  pipeline.overlay.add(motes.points);

  const vortex = (game.vortex = new VortexWake(terrain));
  vortex.river = river;
  game.wake = new Wake(renderer, vortex);
  game.strip = new Strip(renderer, vortex);
  const fx = (game.fx = new WindFX(terrain, noise, pipeline.uDepth));
  fx.vortex = vortex;
  fx.strip = game.strip;
  fx.river = river;
  pipeline.overlay.add(fx.group);

  const shore = await import('../src/world/shore.js')
    .then((m) => m.Shore.load(renderer, terrain, './assets'))
    .catch(() => null);
  if (shore) {
    game.shore = shore;
    world.add(shore.attach({ camera, fx, water, town, overlay: pipeline.overlay }).group);
  }

  const flight = (game.flight = new Flight(terrain));
  flight.river = river;
  flight.props = worldProps;
  flight.solid = town;
  places.bind({
    ...game,
    toast: () => {},
  });

  game.advanceSim = (dt, simTime) => {
    game.time = simTime;
    U.uTime.value = simTime;
    flight.update(dt, { turn: 0, pitch: 0, boost: false, brake: false }, simTime);
    rider.update(dt, simTime, flight, terrain);
    vortex.update(dt, flight, simTime, fx.env.wind);
    game.wake.update(dt, flight);
    if (!flight.auto?.quiet) {
      game.strip.update(dt);
    }
    fx.update(dt, simTime, flight, camera, rider.sunVis, pipeline.size, pipeline.reversed);

    rider.group.updateMatrixWorld(true);
    _bl.set(-0.17, -0.02, 1.16).applyMatrix4(rider.group.matrixWorld);
    _br.set(0.17, -0.02, 1.16).applyMatrix4(rider.group.matrixWorld);
    const trail = flight.auto?.quiet
      ? 0
      : THREE.MathUtils.clamp((flight.speed - 24) / 24, 0, 1) * 0.48;
    fx.updateRibbons(dt, _bl, _br, camera.position, trail);

    river.update(dt, fx.sprites, camera.position, fx.sunTint(rider.sunVis));
    places.update(dt, flight, simTime);
    town.ambient(dt, fx, camera);
    game.shore?.update(dt, flight, simTime);

    U.uRider.value.set(flight.pos.x, flight.pos.y, flight.pos.z, flight.speed);
    U.uRiderVel.value.copy(flight.vel);
    pipeline.params.speed = flight.auto?.quiet
      ? 0
      : THREE.MathUtils.clamp((flight.speed - 28) / 42, 0, 0.55);
  };

  game.renderScene = (dt = 1 / 30) => {
    if (!pipeline.sceneRT) resizeStage();
    if (princess.group.visible) princess.hairClearance?.update?.();
    camera.updateMatrixWorld();
    U.uCamPos.value.copy(camera.position);
    rider.renderShadow(pipeline.reversed, princess.group.visible ? princess.group : rider.group);
    water.renderReflection(camera, pipeline.size);
    terrain.select(terrain.mainView, camera);
    meadow.update(camera);
    town.update(dt, U.uTime.value, camera);
    water.update(camera);
    renderer.info.reset();
    pipeline.render(world, camera, dt);
  };

  const director = (game.director = new MVDirector(
    game,
    timeline,
    [scannedSets],
    motes
  ));
  director.prewarmWorld();
  overlay2d.lyrics.prepare(overlay2d.ctx,overlay2d.w,overlay2d.h);

  const initState = director.seekAndStep(0);
  game.renderScene(1 / 30);
  if(!isHeadless)await preparePreview(game);
  overlay2d.render(0, initState);

  bootBanner.classList.add('hidden');
  game.ready = true;
  window.__SUNSHINE_TIMELINE__ = timeline;
  window.__SUNSHINE_READY__ = true;

  window.captureMVFrame = (t, mime = 'image/jpeg', quality = 0.94) => {
    const state = director.seekAndStep(t);
    game.renderScene(1 / 30);
    renderer.getContext().finish();
    overlay2d.render(t, state);

    compCtx.drawImage(webglCanvas, 0, 0, compCanvas.width, compCanvas.height);
    compCtx.drawImage(overlayCanvas, 0, 0, compCanvas.width, compCanvas.height);
    const dataUrl = compCanvas.toDataURL(mime, quality);
    const comma = dataUrl.indexOf(',');
    return dataUrl.slice(comma + 1);
  };

  if (!isHeadless) {
    const player = new WebPreviewPlayer({
      audioUrl: './mv_sunshine/sunshine.mp3',
      timeline,
      overlay2d,
      onResize: () => resizeStage(),
      onToggleQuality: (enabled) => {
        game.highQuality = enabled;
        cinePostFX.dofEnabled = enabled;
        resizeStage();
      },
    });
    game.player = player;

    const liveStep={realtime:true};
    let lastDrawTime=-1,lastDrawVersion=-1,lastViewVersion=-1;
    const loop = () => {
      const t = player.currentTime();
      if(t===lastDrawTime&&player.drawVersion===lastDrawVersion&&game.viewVersion===lastViewVersion){
        requestAnimationFrame(loop);return;
      }
      const state = director.seekAndStep(t,liveStep);
      player.highlightShot(state.shotIndex, state.chapterIndex);
      game.renderScene(1 / 30);
      overlay2d.render(t, state);
      lastDrawTime=t;lastDrawVersion=player.drawVersion;lastViewVersion=game.viewVersion;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

boot().catch((err) => {
  console.error('[Sunshine MV Boot Error]:', err);
  window.__SUNSHINE_BOOT_ERROR__ = String(err?.stack || err?.message || err);
  if (bootBanner) bootBanner.textContent = `加载失败: ${err?.message || err}`;
});
