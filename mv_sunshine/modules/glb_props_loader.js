// 100% Photogrammetry & Artist-Sculpted 3D Asset Loader for 《阳光晒暖了被》 (Zero Primitive Geometry):
//   - 15 Poly Haven CC0 4K-Scanned glTF Models (clocks, kettle, tea set, vintage cabinet, wooden tables,
//     books, round spectacles, daybed, throw pillows, rocking chair, brass lantern)
//   - 8 Khronos & Three.js Official Sculpted PBR Models (porcelain teacup, floral glass vase, mango-velvet
//     armchair, Marvelous-Designer cloth throw, potted plant, mechanical watch, carbon bicycle, animated birds)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

function tuneMaterialsForPetalwake(root, colorScale = 0.44) {
  root.traverse((o) => {
    if (o.isLight) {
      o.visible = false;
      o.intensity = 0;
      return;
    }
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const cloned = mats.map((src) => {
      if (!src) return src;
      const m = src.clone();
      if (m.map) m.map.anisotropy = 8;
      if (m.normalMap) m.normalMap.anisotropy = 8;
      if (m.roughnessMap) m.roughnessMap.anisotropy = 8;
      if ('envMapIntensity' in m) m.envMapIntensity = 1.15;

      if ('transmission' in m && m.transmission > 0.01) {
        m.transmission = 0;
        m.transparent = true;
        m.opacity = 0.34;
        m.roughness = Math.min(m.roughness ?? 0.08, 0.12);
        m.envMapIntensity = 1.5;
      }

      if (m.color) m.color.multiplyScalar(colorScale);
      if (m.sheenColor) m.sheenColor.multiplyScalar(colorScale);
      return m;
    });
    o.material = Array.isArray(o.material) ? cloned : cloned[0];
  });
}

/**
 * Normalizes a non-skinned static glTF scene so its bottom sits flush at y = 0,
 * centered in X/Z, and uniformly scaled to `targetHeight` meters (or 1:1 metric if `targetHeight === null`).
 */
function normalizeProp(scene, targetHeight = null, colorScale = 0.44, centerPivot = false) {
  tuneMaterialsForPetalwake(scene, colorScale);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const s = targetHeight ? targetHeight / Math.max(size.y, 1e-4) : 1.0;
  const wrapper = new THREE.Group();
  scene.scale.multiplyScalar(s);
  scene.position.set(
    -center.x * s,
    centerPivot ? -center.y * s : -box.min.y * s,
    -center.z * s
  );
  wrapper.add(scene);
  return wrapper;
}

export async function loadGLBProps(renderer, base = './mv_sunshine/assets') {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('./vendor/three/examples/jsm/libs/draco/gltf/');
  loader.setDRACOLoader(draco);

  const ktx2 = new KTX2Loader();
  ktx2.setTranscoderPath('./vendor/three/examples/jsm/libs/basis/');
  ktx2.detectSupport(renderer);
  loader.setKTX2Loader(ktx2);

  const ph = (slug) => `${base}/polyhaven/${slug}/${slug}_1k.gltf`;
  const pr = (fn) => `${base}/props/${fn}`;

  const [
    teacupGltf,
    vaseGltf,
    chairGltf,
    clothGltf,
    plantGltf,
    watchGltf,
    bikeGltf,
    parrotGltf,
    storkGltf,
    wallClockGltf,
    mantelClockGltf,
    kettleGltf,
    brassPotGltf,
    teaSetGltf,
    cabinetGltf,
    woodTableGltf,
    coffeeTableGltf,
    nightstandGltf,
    booksGltf,
    specsGltf,
    dayBedGltf,
    pillowsGltf,
    rockingChairGltf,
    lanternGltf,
  ] = await Promise.all([
    loader.loadAsync(pr('DiffuseTransmissionTeacup.glb')),
    loader.loadAsync(pr('GlassVaseFlowers.glb')),
    loader.loadAsync(pr('SheenChair.glb')),
    loader.loadAsync(pr('SheenCloth/SheenCloth.gltf')),
    loader.loadAsync(pr('DiffuseTransmissionPlant.glb')),
    loader.loadAsync(pr('ChronographWatch.glb')),
    loader.loadAsync(pr('CarbonFrameBike.glb')),
    loader.loadAsync(pr('Parrot.glb')),
    loader.loadAsync(pr('Stork.glb')),
    loader.loadAsync(ph('wall_clock')),
    loader.loadAsync(ph('mantel_clock_01')),
    loader.loadAsync(ph('vintage_electric_kettle')),
    loader.loadAsync(ph('brass_pot_01')),
    loader.loadAsync(ph('tea_set_01')),
    loader.loadAsync(ph('vintage_cabinet_01')),
    loader.loadAsync(ph('WoodenTable_01')),
    loader.loadAsync(ph('CoffeeTable_01')),
    loader.loadAsync(ph('ClassicNightstand_01')),
    loader.loadAsync(ph('book_encyclopedia_set_01')),
    loader.loadAsync(ph('round_spectacles')),
    loader.loadAsync(ph('vintage_day_bed')),
    loader.loadAsync(ph('throw_pillows_01')),
    loader.loadAsync(ph('Rockingchair_01')),
    loader.loadAsync(ph('Lantern_01')),
  ]);

  // 1. Khronos Porcelain Teacup + Glass Vase + SheenChair + SheenCloth + Plant + Watch
  const teacupFull = normalizeProp(teacupGltf.scene.clone(true), 0.105, 0.84);

  const vaseScene = vaseGltf.scene.clone(true);
  for (const dropName of ['Flowers2', 'GlassTransmission']) {
    vaseScene.getObjectByName(dropName)?.removeFromParent();
  }
  const glassVase = normalizeProp(vaseScene, 0.25, 0.76);

  const chairScene = chairGltf.scene.clone(true);
  const labelNode = chairScene.getObjectByName('SheenChair_label');
  if (labelNode) labelNode.visible = false;
  const sheenChair = normalizeProp(chairScene, 0.80, 0.56);

  const sheenCloth = normalizeProp(clothGltf.scene.clone(true), 0.26, 0.68);

  const plantScene = plantGltf.scene.clone(true);
  const dropList = [];
  plantScene.traverse((o) => {
    if (o.isLight || (o.name && o.name.toLowerCase().includes('firefly'))) dropList.push(o);
  });
  for (const o of dropList) o.removeFromParent();
  const pottedPlant = normalizeProp(plantScene, 0.58, 0.62);

  const watchScene = watchGltf.scene.clone(true);
  watchScene.rotation.x = -Math.PI * 0.5;
  const bedsideWatch = normalizeProp(watchScene, 0.042, 0.78);

  // 2. Poly Haven Photogrammetry Furniture & Props
  // Note: wall_clock keeps native [0,0,0] dial-center pivot so its 3 hands rotate around exact pin!
  tuneMaterialsForPetalwake(wallClockGltf.scene, 0.82);
  const wallClockProto = wallClockGltf.scene;

  const mantelClock = normalizeProp(mantelClockGltf.scene.clone(true), 0.23, 0.94);
  const electricKettle = normalizeProp(kettleGltf.scene.clone(true), 0.28, 0.84);
  const brassPot = normalizeProp(brassPotGltf.scene.clone(true), 0.25, 0.84);
  const teaSet = normalizeProp(teaSetGltf.scene.clone(true), 0.17, 0.82);

  // Vintage Cabinet: full natural walnut + brass albedo so open shelf & porcelain shine!
  const cabinetProto = normalizeProp(cabinetGltf.scene.clone(true), 1.68, 1.0);

  const woodenTable = normalizeProp(woodTableGltf.scene.clone(true), 0.74, 0.86);
  const coffeeTable = normalizeProp(coffeeTableGltf.scene.clone(true), 0.56, 0.86);
  const nightstand = normalizeProp(nightstandGltf.scene.clone(true), 0.68, 0.90);
  const bookSet = normalizeProp(booksGltf.scene.clone(true), 0.24, 0.84);
  const singleBookRaw =
    booksGltf.scene.getObjectByName('book_encyclopedia_set_01_book03')?.clone(true) ||
    booksGltf.scene.children[0]?.clone(true);
  if (singleBookRaw) singleBookRaw.rotation.z = Math.PI * 0.5;
  const flatBook = singleBookRaw ? normalizeProp(singleBookRaw, 0.042, 0.84) : bookSet.clone(true);

  const roundSpecs = normalizeProp(specsGltf.scene.clone(true), 0.045, 0.84);
  const vintageDayBed = normalizeProp(dayBedGltf.scene.clone(true), 1.02, 0.74);
  const throwPillows = normalizeProp(pillowsGltf.scene.clone(true), 0.36, 0.74);
  const rockingChair = normalizeProp(rockingChairGltf.scene.clone(true), 0.96, 0.96);
  const brassLantern = normalizeProp(lanternGltf.scene.clone(true), 0.28, 0.84);

  // 3. Restyle CarbonFrameBike into a classic sage-green & leather countryside bicycle (hide racing logos!)
  bikeGltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (!m) return;
    const nm = m.name || '';
    if (nm === 'Bike_Logo' || nm === 'LabelWhite' || nm === 'LabelBlack') {
      o.visible = false;
    } else if (nm === 'Rahmen' || nm === 'Carbon' || nm === 'Unterschutzplatte') {
      m.color?.setHex(0x8aa892);
      m.roughness = 0.36;
    } else if (nm === 'Sattel' || nm === 'Griffe') {
      m.color?.setHex(0x8c5832);
      m.roughness = 0.58;
    } else if (nm === 'Reifen' || nm === 'Reifen_innen' || nm === 'GummiDunkel') {
      m.color?.setHex(0x4a4640);
    }
  });
  const bikeProto = normalizeProp(bikeGltf.scene, 1.02, 0.62);
  tuneMaterialsForPetalwake(parrotGltf.scene, 0.46);
  tuneMaterialsForPetalwake(storkGltf.scene, 0.46);

  return {
    createTeacupWithSaucer: () => teacupFull.clone(true),
    createGlassVase: () => glassVase.clone(true),
    createSheenChair: () => sheenChair.clone(true),
    createSheenCloth: () => sheenCloth.clone(true),
    createPottedPlant: () => pottedPlant.clone(true),
    createBedsideWatch: () => bedsideWatch.clone(true),

    createWallClock: () => wallClockProto.clone(true),
    createMantelClock: () => mantelClock.clone(true),
    createKettle: () => electricKettle.clone(true),
    createBrassPot: () => brassPot.clone(true),
    createTeaSet: () => teaSet.clone(true),
    createVintageCabinet: () => cabinetProto.clone(true),
    createWoodenTable: () => woodenTable.clone(true),
    createCoffeeTable: () => coffeeTable.clone(true),
    createNightstand: () => nightstand.clone(true),
    createBookSet: () => bookSet.clone(true),
    createFlatBook: () => flatBook.clone(true),
    createRoundSpectacles: () => roundSpecs.clone(true),
    createDayBed: () => vintageDayBed.clone(true),
    createThrowPillows: () => throwPillows.clone(true),
    createRockingChair: () => rockingChair.clone(true),
    createLantern: () => brassLantern.clone(true),

    createBicycle: () => {
      const clone = bikeProto.clone(true);
      return { root: clone, clip: bikeGltf.animations[0] || null };
    },
    createAnimatedBird: (kind = 'stork', scale = 0.008) => {
      const src = kind === 'parrot' ? parrotGltf : storkGltf;
      const clonedScene = SkeletonUtils.clone(src.scene);
      clonedScene.scale.setScalar(scale);
      const mixer = new THREE.AnimationMixer(clonedScene);
      if (src.animations[0]) {
        const act = mixer.clipAction(src.animations[0]);
        act.play();
      }
      return { root: clonedScene, mixer };
    },
  };
}
