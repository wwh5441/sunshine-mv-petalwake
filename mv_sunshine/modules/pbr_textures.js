// High-Resolution Procedural PBR Material & Normal-Map Generator for 《阳光晒暖了被》.
// Eliminates flat "plastic primitive" look by synthesizing crisp wood grain, woven quilted cotton,
// sheer lace curtains, hammered copper, and typeset book pages with tangent-space normal maps.
import * as THREE from 'three';

function heightToNormalCanvas(heightData, size, strength = 2.4) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const ym = ((y - 1 + size) % size) * size;
    const yp = ((y + 1) % size) * size;
    const yc = y * size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (heightData[yc + xp] - heightData[yc + xm]) * strength;
      const dy = (heightData[yp + x] - heightData[ym + x]) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const inv = 1.0 / Math.hypot(nx, ny, nz);
      const idx = (yc + x) * 4;
      d[idx] = Math.round((nx * inv * 0.5 + 0.5) * 255);
      d[idx + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255);
      d[idx + 2] = Math.round((nz * inv * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createPBRTextureLibrary() {
  // 1. Quarter-Sawn Warm Oak / Walnut Wood (512x512 Albedo + Normal)
  const S = 512;
  const woodC = document.createElement('canvas');
  woodC.width = woodC.height = S;
  const wCtx = woodC.getContext('2d');
  const wImg = wCtx.createImageData(S, S);
  const wH = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const ring = Math.sin((u * 14.0 + Math.sin(v * Math.PI * 4.0) * 0.35 + Math.sin(u * 31.0 + v * 6.0) * 0.12) * Math.PI);
      const fiber = Math.sin(x * 1.9 + Math.sin(y * 0.15) * 3.0) * 0.5 + 0.5;
      const pore = ((Math.sin(x * 12.7 + y * 3.1) * 43758.5453) % 1 + 1) % 1;
      const h = ring * 0.35 + fiber * 0.45 - (pore > 0.92 ? 0.35 : 0);
      wH[y * S + x] = h;
      const shade = 0.76 + 0.18 * ring + 0.08 * fiber - (pore > 0.93 ? 0.12 : 0);
      const idx = (y * S + x) * 4;
      wImg.data[idx] = Math.min(255, Math.round(168 * shade));
      wImg.data[idx + 1] = Math.min(255, Math.round(118 * shade));
      wImg.data[idx + 2] = Math.min(255, Math.round(78 * shade));
      wImg.data[idx + 3] = 255;
    }
  }
  wCtx.putImageData(wImg, 0, 0);
  const woodMap = new THREE.CanvasTexture(woodC);
  woodMap.colorSpace = THREE.SRGBColorSpace;
  woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping;
  woodMap.anisotropy = 8;
  const woodNormal = heightToNormalCanvas(wH, S, 1.8);

  // 2. Woven Cotton / Puffy Stitched Quilt Normal & Albedo (512x512)
  const qC = document.createElement('canvas');
  qC.width = qC.height = S;
  const qCtx = qC.getContext('2d');
  const qImg = qCtx.createImageData(S, S);
  const qH = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // Quilted diamond/square channels every 128px + fine linen weave
      const gx = (x % 128) / 128;
      const gy = (y % 128) / 128;
      const pillow = Math.sin(gx * Math.PI) * Math.sin(gy * Math.PI);
      const stitchX = gx < 0.03 || gx > 0.97 ? -0.35 : 0;
      const stitchY = gy < 0.03 || gy > 0.97 ? -0.35 : 0;
      const weave = (Math.sin(x * 1.57) * Math.cos(y * 1.57)) * 0.08;
      const h = Math.pow(pillow, 0.45) * 0.85 + stitchX + stitchY + weave;
      qH[y * S + x] = h;
      const lum = 0.90 + 0.10 * Math.pow(pillow, 0.5) + (stitchX + stitchY) * 0.14;
      const idx = (y * S + x) * 4;
      qImg.data[idx] = Math.min(255, Math.round(255 * lum));
      qImg.data[idx + 1] = Math.min(255, Math.round(248 * lum));
      qImg.data[idx + 2] = Math.min(255, Math.round(234 * lum));
      qImg.data[idx + 3] = 255;
    }
  }
  qCtx.putImageData(qImg, 0, 0);
  const quiltMap = new THREE.CanvasTexture(qC);
  quiltMap.colorSpace = THREE.SRGBColorSpace;
  quiltMap.wrapS = quiltMap.wrapT = THREE.RepeatWrapping;
  const quiltNormal = heightToNormalCanvas(qH, S, 2.8);

  // 3. Fine Linen Weave Normal Map (for shirts, bedsheets, curtains, tablecloths)
  const lH = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const warp = Math.sin(x * 0.9) * (y % 4 < 2 ? 1 : -0.4);
      const weft = Math.sin(y * 0.9) * (x % 4 < 2 ? -0.4 : 1);
      lH[y * 256 + x] = (warp + weft) * 0.25;
    }
  }
  const linenNormal = heightToNormalCanvas(lH, 256, 1.4);
  linenNormal.repeat.set(8, 8);

  // 4. Hammered Burnished Copper Normal Map (for boiling kettle)
  const cH = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const cx = (x / 16) | 0, cy = (y / 16) | 0;
      const jx = ((Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5) % 1 + 1) % 1;
      const jy = ((Math.cos(cx * 39.346 + cy * 11.135) * 23421.6) % 1 + 1) % 1;
      const dx = (x % 16) / 16 - (0.3 + 0.4 * jx);
      const dy = (y % 16) / 16 - (0.3 + 0.4 * jy);
      cH[y * 256 + x] = Math.max(0, 0.32 - (dx * dx + dy * dy)) * 1.4;
    }
  }
  const copperNormal = heightToNormalCanvas(cH, 256, 1.9);
  copperNormal.repeat.set(3, 2);

  // 5. Crisp Typeset Book Page Texture (1024x1024 cream laid paper + serif literary layout!)
  const pC = document.createElement('canvas');
  pC.width = pC.height = 1024;
  const pCtx = pC.getContext('2d');
  pCtx.fillStyle = '#fcf5e5';
  pCtx.fillRect(0, 0, 1024, 1024);
  // Subtle warm paper vignette & spine crease shadow
  const grad = pCtx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.0, 'rgba(130, 102, 68, 0.22)');
  grad.addColorStop(0.08, 'rgba(130, 102, 68, 0.02)');
  grad.addColorStop(0.92, 'rgba(130, 102, 68, 0.0)');
  grad.addColorStop(1.0, 'rgba(130, 102, 68, 0.10)');
  pCtx.fillStyle = grad;
  pCtx.fillRect(0, 0, 1024, 1024);

  pCtx.fillStyle = '#5a4c3e';
  pCtx.font = '600 28px Georgia, "Songti SC", serif';
  pCtx.fillText('CHAPTER XII  ·  午后与风的诗篇', 112, 136);
  pCtx.strokeStyle = 'rgba(120, 96, 72, 0.35)';
  pCtx.lineWidth = 2;
  pCtx.beginPath();
  pCtx.moveTo(112, 158);
  pCtx.lineTo(912, 158);
  pCtx.stroke();

  pCtx.font = '24px Georgia, "Songti SC", serif';
  pCtx.fillStyle = '#4c4035';
  const sampleLines = [
    '阳光穿过海港的屋檐，落在翻开的旧书页之间。',
    '微风推着窗外的白衬衫，钟声比平时慢了几倍。',
    'The warm noon breeze drifts in from Larkhaven bay,',
    'turning a single page back to where yesterday slept.',
    '玻璃杯里的温水晃着浅金色的光斑，',
    '麻雀停在木栏杆上，梳理着午后蓬松的羽毛。',
    'A crimson ribbon holds the quiet afternoon in place,',
    'while clouds linger over the warm terracotta roofs.',
    '书里的故事不必急着读完，留到下一次醒来再回味。',
    '只要阳光晒暖了棉被，困意便是最温柔的作陪。',
    'Soft shadows move from fingertips to the armchair back,',
    'measuring the unhurried hours in golden light.',
  ];
  sampleLines.forEach((txt, idx) => {
    const y = 225 + idx * 56 + (idx >= 4 ? 22 : 0) + (idx >= 8 ? 22 : 0);
    pCtx.fillText(txt, 112, y);
  });
  pCtx.font = 'italic 22px Georgia, serif';
  pCtx.fillStyle = '#82705d';
  pCtx.fillText('— 148 —', 468, 948);

  const bookPageMap = new THREE.CanvasTexture(pC);
  bookPageMap.colorSpace = THREE.SRGBColorSpace;
  bookPageMap.anisotropy = 8;

  // 6. Soft Feathered Radial Puff Texture (eliminates hard sphere edges on steam & cotton dust motes!)
  const sC = document.createElement('canvas');
  sC.width = sC.height = 64;
  const sCtx = sC.getContext('2d');
  const sGrad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  sGrad.addColorStop(0.0, 'rgba(255, 252, 244, 0.95)');
  sGrad.addColorStop(0.38, 'rgba(255, 248, 234, 0.48)');
  sGrad.addColorStop(0.72, 'rgba(255, 244, 224, 0.12)');
  sGrad.addColorStop(1.0, 'rgba(255, 240, 215, 0.0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 64, 64);
  const softPuffMap = new THREE.CanvasTexture(sC);
  softPuffMap.colorSpace = THREE.SRGBColorSpace;

  return {
    woodMap,
    woodNormal,
    quiltMap,
    quiltNormal,
    linenNormal,
    copperNormal,
    bookPageMap,
    softPuffMap,
  };
}
