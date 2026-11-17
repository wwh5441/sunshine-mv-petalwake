// Scanned and authored stage props for 《阳光晒暖了被》.
// Furniture placement is configured in data/stage_layout.js and checked against
// the original town's actual floor polygons by props/floor_support.js.
//     1. Poly Haven `wall_clock` (calibrated 12:00:00 hands, clean walnut-brass rim)
//     2. Sunlit Open-Shelf `vintage_cabinet_01` + Khronos `DiffuseTransmissionTeacup` on Warden's Sunny Terrace
//     3. Panoramic Sea Tea Table (`WoodenTable_01` + `vintage_electric_kettle` + `tea_set_01` +
//        `DiffuseTransmissionTeacup` + `GlassVaseFlowers`) on Old Keep Wildflower Sea Veranda
//     4. Panoramic Sea `Rockingchair_01` gently rocking in the sea breeze on Old Keep Wildflower Sea Veranda
//     5. Khronos `SheenChair` + `throw_pillows_01` + `PottedPlant` on Warden's Sunny Terrace
//     6. Library Ocean-View Reading Desk (`WoodenTable_01` + `book_encyclopedia_set_01` + `round_spectacles`)
//     7. Sunlit Cream-Linen `vintage_day_bed` + `throw_pillows_01` + `ClassicNightstand_01` + `mantel_clock_01` + `ChronographWatch`
//     8. Assembled Country Sage-Green `CarbonFrameBike.glb` & Gliding `Stork.glb` Seabirds
import * as THREE from 'three';
import { placeStageFurniture } from './stage_layout.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class ScannedStageSets {
  constructor(pbrTex, glbProps) {
    this.pbrTex = pbrTex;
    this.glbProps = glbProps;
    this.group = new THREE.Group();

    this.clockHands = { hour: null, min: null, sec: null };
    this.kettleSteam = [];
    this.cupSteam = [];
    this.rockingChairPivot = null;
    this.bike = null;
    this.birds = [];
    this.stageObjects = {};

    this._buildClockAndSunlitCabinet();
    this._buildOldKeepSeaVeranda();
    this._buildLibraryReadingAndDaybed();
    this._buildCobblestoneBicycle();
    this._buildDistantSeabirds();
    placeStageFurniture(this);
  }

  _addShadowCatcher(x, y, z, w, d) {
    const catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.ShadowMaterial({ opacity: 0.30, color: 0x22150a })
    );
    catcher.rotation.x = -Math.PI * 0.5;
    catcher.position.set(x, y, z);
    catcher.receiveShadow = true;
    this.group.add(catcher);
  }

  _buildClockAndSunlitCabinet() {
    // 1. Poly Haven Scanned `wall_clock` @ [-153.25, 14.06, 1057.64] (hands calibrated to 12:00:00 at t = 16.25s)
    const wallClock = this.glbProps.createWallClock();
    wallClock.scale.setScalar(1.35);
    wallClock.position.set(-153.25, 14.06, 1057.64);
    this.clockHands.hour = wallClock.getObjectByName('wall_clock_hours_hand');
    this.clockHands.min = wallClock.getObjectByName('wall_clock_minute_hand');
    this.clockHands.sec = wallClock.getObjectByName('wall_clock_second_hand');
    this.group.add(wallClock);
    this.stageObjects.wallClock = wallClock;

    // 2. Warden's Sunlit Stone Terrace (`y = 22.638m`):
    //    (a) Sun-drenched `vintage_cabinet_01` facing direct SE golden sun (`rotY = 108 deg`) so warm light
    //        pours straight onto the open walnut shelf and porcelain teacup!
    this._addShadowCatcher(-54.9, 22.643, 1023.2, 6.2, 5.4);
    const cabinet = this.glbProps.createVintageCabinet();
    cabinet.position.set(-54.35, 22.638, 1022.25);
    cabinet.rotation.y = (108 * Math.PI) / 180;
    const doorR = cabinet.getObjectByName('vintage_cabinet_01_door_04');
    if (doorR) doorR.rotation.y = 0.85;
    const doorC = cabinet.getObjectByName('vintage_cabinet_01_door_03');
    if (doorC) doorC.rotation.y = -0.42;

    const shelfCup = this.glbProps.createTeacupWithSaucer();
    shelfCup.position.set(0.36, 1.005, 0.14);
    cabinet.add(shelfCup);
    // Warm sunlit bounce into the open cabinet shelf so walnut wood & porcelain glow!
    const cabLight = new THREE.PointLight(0xffe6c0, 2.4, 4.5, 1.5);
    cabLight.position.set(0.35, 1.18, 0.85);
    cabinet.add(cabLight);
    this.group.add(cabinet);
    this.stageObjects.cabinet = cabinet;

    //    (b) Khronos `SheenChair` + Scanned `throw_pillows_01` + `PottedPlant` @ [-55.36, 22.638, 1023.86]
    const chairCorner = new THREE.Group();
    chairCorner.position.set(-55.36, 22.638, 1023.86);
    chairCorner.rotation.y = (110 * Math.PI) / 180;
    chairCorner.add(this.glbProps.createSheenChair());

    const chairPillow = this.glbProps.createThrowPillows();
    chairPillow.scale.setScalar(0.72);
    chairPillow.position.set(0.02, 0.39, -0.02);
    chairCorner.add(chairPillow);

    const plant = this.glbProps.createPottedPlant();
    plant.position.set(-0.68, 0, -0.12);
    chairCorner.add(plant);
    this.group.add(chairCorner);
    this.stageObjects.chairCorner = chairCorner;
  }

  _buildOldKeepSeaVeranda() {
    // Old Keep Panoramic Sea Veranda (`x = -38.2..-36.5, z = 971.5..977.0, y = 30.515m`):
    // Overlooks infinite turquoise sea & daisy cliff when photographed from `angle = 72..114 deg`!
    this._addShadowCatcher(-37.65, 30.520, 974.35, 3.2, 6.8);

    // 1. Honey-Oak Tea Table (`WoodenTable_01` + Kettle + Tea Set + Cup + Crystal Vase) @ [-37.55, 30.515, 976.65]
    const tableGroup = new THREE.Group();
    this.teaTable = tableGroup;
    this.stageObjects.teaTable = tableGroup;
    tableGroup.position.set(-37.55, 30.515, 976.65);
    tableGroup.rotation.y = (92 * Math.PI) / 180;

    tableGroup.add(this.glbProps.createWoodenTable());
    const topY = 0.738;

    const kettle = this.glbProps.createKettle();
    kettle.position.set(-0.36, topY, -0.06);
    kettle.rotation.y = -0.35;
    tableGroup.add(kettle);

    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.pbrTex?.softPuffMap || null,
          color: 0xfffaf0,
          transparent: true,
          opacity: 0.36,
          depthWrite: false,
        })
      );
      kettle.add(sp);
      this.kettleSteam.push({ mesh: sp, idx: i });
    }

    const teaSet = this.glbProps.createTeaSet();
    teaSet.position.set(0.02, topY, -0.05);
    teaSet.rotation.y = 0.25;
    tableGroup.add(teaSet);

    const favCup = this.glbProps.createTeacupWithSaucer();
    favCup.position.set(0.32, topY, 0.11);
    favCup.rotation.y = -0.5;
    tableGroup.add(favCup);

    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.pbrTex?.softPuffMap || null,
          color: 0xfffdf8,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        })
      );
      favCup.add(sp);
      this.cupSteam.push({ mesh: sp, idx: i });
    }

    const tableVase = this.glbProps.createGlassVase();
    tableVase.position.set(-0.14, topY, 0.15);
    tableGroup.add(tableVase);
    this.group.add(tableGroup);

    // 2. Scanned Walnut `Rockingchair_01` @ [-37.65, 30.512, 971.90] overlooking turquoise sea & wildflowers!
    const rockerStage = new THREE.Group();
    rockerStage.position.set(-37.65, 30.512, 971.90);
    rockerStage.rotation.y = (94 * Math.PI) / 180;
    const rockerPivot = new THREE.Group();
    rockerPivot.add(this.glbProps.createRockingChair());
    rockerStage.add(rockerPivot);
    const rockerFill = new THREE.PointLight(0xffdfb8, 2.2, 4.5, 1.5);
    rockerFill.position.set(0.2, 1.05, 1.25);
    rockerStage.add(rockerFill);
    this.rockingChairPivot = rockerPivot;
    this.group.add(rockerStage);
    this.stageObjects.rocker = rockerStage;
  }

  _buildLibraryReadingAndDaybed() {
    this._addShadowCatcher(-2.2, 30.398, 951.8, 5.5, 5.5);

    // 1. Library Ocean-View `WoodenTable_01` Reading Desk @ [-1.18, 30.394, 951.05]
    const deskGroup = new THREE.Group();
    this.readingDesk = deskGroup;
    this.stageObjects.readingDesk = deskGroup;
    deskGroup.position.set(-1.18, 30.394, 951.05);
    deskGroup.rotation.y = (42 * Math.PI) / 180;
    this.readingTable = this.glbProps.createWoodenTable();
    deskGroup.add(this.readingTable);
    this.readingItems = {};

    const deskTopY = 0.738;
    const bookRow = this.glbProps.createBookSet();
    bookRow.position.set(-0.42, deskTopY, -0.10);
    bookRow.rotation.y = 0.12;
    deskGroup.add(bookRow);
    this.readingItems.books = bookRow;

    const flatBook = this.glbProps.createFlatBook();
    flatBook.position.set(-0.02, deskTopY, 0.05);
    flatBook.rotation.y = 0.28;
    deskGroup.add(flatBook);
    this.readingItems.flatBook = flatBook;

    const specs = this.glbProps.createRoundSpectacles();
    specs.position.set(0.24, deskTopY, 0.11);
    specs.rotation.y = -0.48;
    deskGroup.add(specs);
    this.readingItems.spectacles = specs;

    const vase = this.glbProps.createGlassVase();
    vase.position.set(0.46, deskTopY, -0.08);
    deskGroup.add(vase);
    this.readingItems.vase = vase;

    const cup = this.glbProps.createTeacupWithSaucer();
    cup.position.set(-0.18, deskTopY, -0.14);
    deskGroup.add(cup);
    this.readingItems.cup = cup;
    this.group.add(deskGroup);

    // 2. 4K Cream-Linen `vintage_day_bed` + `throw_pillows_01` + `ClassicNightstand_01` @ [-20.35, 26.250, 935.95]
    //    Rotated `180 deg` so cameras at `angle = 160..202 deg` look South toward sunny castle towers & clear sky!
    this._addShadowCatcher(-20.35, 26.254, 935.95, 5.4, 4.6);
    const bedStage = new THREE.Group();
    bedStage.position.set(-20.35, 26.250, 935.95);
    bedStage.rotation.y = Math.PI;

    bedStage.add(this.glbProps.createDayBed());

    const pillows = this.glbProps.createThrowPillows();
    pillows.position.set(-0.48, 0.50, 0.06);
    pillows.rotation.y = 0.22;
    bedStage.add(pillows);

    const ns = new THREE.Group();
    ns.position.set(1.32, 0, -0.06);
    ns.add(this.glbProps.createNightstand());

    const nsTopY = 0.678;
    const mantelClock = this.glbProps.createMantelClock();
    mantelClock.position.set(-0.06, nsTopY, -0.04);
    mantelClock.rotation.y = 0.18;
    ns.add(mantelClock);

    const watch = this.glbProps.createBedsideWatch();
    watch.position.set(0.14, nsTopY, 0.09);
    watch.rotation.y = -0.42;
    ns.add(watch);

    const lantern = this.glbProps.createLantern();
    lantern.position.set(-0.16, 0, 0.28);
    ns.add(lantern);

    bedStage.add(ns);
    this.group.add(bedStage);
    this.stageObjects.bed = bedStage;
  }

  _buildCobblestoneBicycle() {
    this._addShadowCatcher(-102.0, 4.932, 1065.9, 24.0, 4.5);

    const { root, clip } = this.glbProps.createBicycle();
    if (clip) {
      const m = new THREE.AnimationMixer(root);
      const act = m.clipAction(clip);
      act.play();
      m.setTime(0.0);
    }
    const bikeHolder = new THREE.Group();
    bikeHolder.add(root);
    bikeHolder.position.set(-105.0, 4.93, 1065.9);
    this.bike = bikeHolder;
    this.group.add(bikeHolder);
  }

  _buildDistantSeabirds() {
    const spots = [
      { cx: -52, y: 6.2, cz: 1140, r: 12.0, speed: 0.48, phase: 0.3, scale: 0.0080 },
      { cx: -46, y: 7.8, cz: 1134, r: 14.0, speed: 0.42, phase: 2.4, scale: 0.0075 },
      { cx: -44, y: 21.8, cz: 1017, r: 6.5, speed: 0.62, phase: 0.8, scale: 0.0065 },
      { cx: -42, y: 22.8, cz: 1015, r: 8.0, speed: 0.54, phase: 2.9, scale: 0.0060 },
      { cx: -64, y: 28.8, cz: 572, r: 8.5, speed: 0.60, phase: 0.6, scale: 0.0065 },
    ];
    for (const sp of spots) {
      const b = this.glbProps.createAnimatedBird('stork', sp.scale);
      const holder = new THREE.Group();
      holder.add(b.root);
      this.group.add(holder);
      this.birds.push({ holder, ...b, ...sp });
    }
  }

  update(time) {
    // 1. Scanned Wall Clock: calibrated rest offsets (-1.01, +1.05, +2.92) align hands to 12:00:00 at t = 16.25s
    const tempo = time > 158 ? 0.35 : 1.0;
    const relSec = (time - 16.25) * tempo;
    if (this.clockHands.sec) {
      this.clockHands.sec.rotation.z = 2.92 - (relSec / 60) * Math.PI * 2;
    }
    if (this.clockHands.min) {
      this.clockHands.min.rotation.z = 1.05 - ((time - 16.25) * 8 / 3600) * Math.PI * 2;
    }
    if (this.clockHands.hour) {
      this.clockHands.hour.rotation.z = -1.01 - ((time - 16.25) * 8 / 43200) * Math.PI * 2;
    }

    // 2. Kettle & Teacup Feathered Steam
    const boilK = time < 50 ? 1.0 : 0.35;
    for (const { mesh, idx } of this.kettleSteam) {
      const c = (time * 0.95 + idx / this.kettleSteam.length) % 1;
      mesh.position.set(
        0.14 + c * 0.12 + Math.sin(time * 3.1 + idx) * 0.02 * c,
        0.27 + c * 0.34,
        Math.cos(time * 2.7 + idx) * 0.02 * c
      );
      mesh.scale.setScalar(0.055 + c * 0.14);
      mesh.material.opacity = 0.38 * boilK * Math.sin(c * Math.PI);
    }

    const cupWarmth = Math.max(0.06, 1.0 - Math.max(0, (time - 180) / 35));
    for (const { mesh, idx } of this.cupSteam) {
      const c = (time * 0.48 + idx / this.cupSteam.length) % 1;
      mesh.position.set(
        Math.sin(time * 2.0 + idx) * 0.015 * c,
        0.10 + c * 0.18,
        Math.cos(time * 1.7 + idx) * 0.015 * c
      );
      mesh.scale.setScalar(0.045 + c * 0.075);
      mesh.material.opacity = 0.26 * cupWarmth * Math.sin(c * Math.PI);
    }

    // 3. Gently Rocking Wooden Chair in the Sea Breeze
    if (this.rockingChairPivot) {
      this.rockingChairPivot.rotation.x = Math.sin(time * 1.55) * 0.055;
    }

    // 4. Assembled Bicycle coasting smoothly along Market Street (`99.38..103.00s`)
    if (this.bike) {
      const localT = clamp(time - 98.8, -3.0, 8.0);
      const bx = -108.5 + localT * 3.0;
      this.bike.position.set(bx, 4.93, 1065.9 + Math.sin(localT * 1.3) * 0.08);
      this.pelicanCyclist?.update(time, localT * 3.0);
    }

    // 5. Distant Gliding Seabirds
    for (const g of this.birds) {
      const a = time * g.speed + g.phase;
      g.holder.position.set(
        g.cx + Math.cos(a) * g.r,
        g.y + Math.sin(a * 2.0) * 0.65,
        g.cz + Math.sin(a) * g.r
      );
      g.holder.rotation.set(0, Math.atan2(-Math.sin(a), Math.cos(a)), 0.18);
      g.mixer.setTime(((time + g.phase) * 1.15) % 4.0);
    }
  }
}
