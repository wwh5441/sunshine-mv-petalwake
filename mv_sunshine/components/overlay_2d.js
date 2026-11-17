// 2D Overlay Compositor for 《阳光晒暖了被》 (Full-Song 03:48.9 Edition):
//   - Opening & Closing pure title cards (`阳光晒暖了被`, strictly clean per AGENTS.md Rule 4)
//   - Warm indie-folk synced subtitles across all 44 lyric lines
//   - AGENTS.md Rule 2 compliant Review Demo HUD (`[IMG-xx | 场景 · 唱词]` + 6-Chapter progress bar)

import {DynamicLyrics} from '../modules/lyrics/dynamic_lyrics.js';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export class Overlay2D {
  constructor(canvas, timeline, demoMode = true,protection) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.timeline = timeline;
    this.demoMode = demoMode;
    this.w = 720;
    this.h = 960;
    this.lyrics=new DynamicLyrics(timeline,protection);
  }

  setSize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.w = w;
    this.h = h;
  }

  render(t, state) {
    const ctx = this.ctx;
    const W = this.w;
    const H = this.h;
    const u = Math.min(W / 720, H / 960);

    ctx.clearRect(0, 0, W, H);
    this._drawTitleCard(ctx, t, this.timeline.titleCard, W, H, u);
    this._drawTitleCard(ctx, t, this.timeline.endTitleCard, W, H, u);
    this.lyrics.render(ctx,t,state,W,H);
    if (this.demoMode) {
      this._drawDemoHUD(ctx, t, state, W, H, u);
    }
  }

  _drawTitleCard(ctx, t, tc, W, H, u) {
    if (!tc || t < tc.start || t > tc.end) return;

    const fadeIn = smoothstep((t - tc.start) / 0.90);
    const fadeOut = smoothstep((tc.end - t) / 0.95);
    const alpha = fadeIn * fadeOut;
    if (alpha <= 0.005) return;

    const driftY = ((1 - fadeIn) * 10 - (1 - fadeOut) * 6) * u;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W * 0.5, H * 0.27 + driftY);

    const r = 210 * u;
    const grad = ctx.createRadialGradient(0, 0, 8 * u, 0, 0, r);
    grad.addColorStop(0, 'rgba(32, 24, 14, 0.34)');
    grad.addColorStop(0.65, 'rgba(32, 24, 14, 0.12)');
    grad.addColorStop(1, 'rgba(32, 24, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(-r, -75 * u, r * 2, 150 * u);

    ctx.font = `400 ${Math.round(46 * u)}px "SunshineTencent"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(28, 18, 8, 0.58)';
    ctx.shadowBlur = 16 * u;
    ctx.shadowOffsetY = 3 * u;
    ctx.fillStyle = '#fffaf0';
    ctx.fillText(tc.title, 0, 0);

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255, 232, 182, 0.72)';
    ctx.lineWidth = Math.max(1, 1.2 * u);
    ctx.beginPath();
    ctx.moveTo(-88 * u, 38 * u);
    ctx.lineTo(88 * u, 38 * u);
    ctx.stroke();

    ctx.restore();
  }

  _drawDemoHUD(ctx, t, state, W, _H, u) {
    const { shot, chapterIndex, lyric } = state;
    const chapters = this.timeline.chapters || [];
    const clipDur = this.timeline.meta.clipDuration;

    ctx.save();

    const snippet = lyric ? lyric.text : shot.lyricHint;
    const label = `[${shot.id} | ${shot.sceneTitle} · ${snippet}]`;

    const fontPx = Math.max(11, Math.round(12.5 * u));
    ctx.font = `600 ${fontPx}px "PingFang SC", sans-serif`;

    const maxLabelW = W - 165 * u;
    let displayLabel = label;
    while (ctx.measureText(displayLabel).width > maxLabelW && displayLabel.length > 12) {
      displayLabel = displayLabel.slice(0, -3) + '…]';
    }
    const tw = ctx.measureText(displayLabel).width;

    const pillX = 16 * u;
    const pillY = 12 * u;
    const pillW = Math.min(W - 140 * u, tw + 24 * u);
    const pillH = 28 * u;

    ctx.fillStyle = 'rgba(14, 12, 10, 0.82)';
    ctx.strokeStyle = 'rgba(246, 201, 120, 0.55)';
    ctx.lineWidth = Math.max(1, 1.15 * u);
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 14 * u);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8eed9';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayLabel, pillX + 12 * u, pillY + pillH * 0.5 + 0.5 * u);

    const clockTxt = `${formatClock(t)} / ${formatClock(clipDur)}`;
    ctx.font = `700 ${Math.max(10, Math.round(11.5 * u))}px ui-monospace, "SF Mono", Menlo, monospace`;
    const timeW = ctx.measureText(clockTxt).width + 20 * u;
    const timeX = W - 16 * u - timeW;

    ctx.fillStyle = 'rgba(14, 12, 10, 0.80)';
    ctx.strokeStyle = 'rgba(246, 201, 120, 0.45)';
    ctx.beginPath();
    ctx.roundRect(timeX, pillY, timeW, pillH, 14 * u);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f6dfc0';
    ctx.textAlign = 'center';
    ctx.fillText(clockTxt, timeX + timeW * 0.5, pillY + pillH * 0.5 + 0.5 * u);

    // 6-Chapter proportional progress bar
    const barLeft = 16 * u;
    const barRight = W - 16 * u;
    const gap = 5 * u;
    const n = chapters.length || 1;
    const usableW = barRight - barLeft - gap * (n - 1);
    const barY = 46 * u;
    const barH = Math.max(2.6, 3.4 * u);

    let cursorX = barLeft;
    for (let i = 0; i < n; i++) {
      const ch = chapters[i];
      const dur = Math.max(0.1, ch.end - ch.start);
      const segW = usableW * (dur / clipDur);
      const prog = clamp((t - ch.start) / dur, 0, 1);

      ctx.fillStyle = 'rgba(255, 238, 205, 0.22)';
      ctx.fillRect(cursorX, barY, segW, barH);

      if (prog > 0) {
        ctx.fillStyle = i === chapterIndex ? '#f7c86c' : '#c49a52';
        ctx.fillRect(cursorX, barY, segW * prog, barH);
      }
      cursorX += segW + gap;
    }

    ctx.restore();
  }
}
