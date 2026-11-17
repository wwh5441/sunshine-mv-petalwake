// Interactive Full-Song Web Preview Controller (Audio Sync, Chapter Tabs, 56-Shot Strip, Quality & Aspect Toggles).

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ds = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ds}`;
}

export class WebPreviewPlayer {
  constructor({ audioUrl, timeline, overlay2d, onResize, onToggleQuality }) {
    this.timeline = timeline;
    this.clipDur = timeline.meta.clipDuration;
    this.overlay2d = overlay2d;
    this.onResize = onResize;
    this.onToggleQuality = onToggleQuality;

    this.audio = new Audio();
    this.audio.preload = 'auto';
    this._audioReady = fetch(audioUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Audio HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        this.audio.src = URL.createObjectURL(blob);
      })
      .catch((err) => {
        console.warn('Blob audio preload fallback:', err);
        this.audio.src = audioUrl;
      });
    this.playing = false;
    this.manualTime = 0;
    this.scrubbing = false;
    this.highQuality = true;
    this.drawVersion=0;
    this._lastHighlightedShot = -1;

    this._mountDOM();
    this._bindEvents();
  }

  _mountDOM() {
    const stage = document.getElementById('mv-stage');
    this.gate = document.createElement('div');
    this.gate.id = 'play-gate';
    this.gate.innerHTML = `
      <button class="gate-btn" type="button">▶ 点击播放《阳光晒暖了被》全曲实时 3D 预览 (03:48.9)</button>
      <div class="gate-sub">支持 6 大章节与 56 镜秒跳 · 光学散景景深 (DoF) · 竖屏/全屏切换 · 空格键暂停</div>
    `;
    stage.appendChild(this.gate);

    this.bar = document.createElement('div');
    this.bar.id = 'player-bar';

    const chaptersHtml = (this.timeline.chapters || [])
      .map(
        (ch, idx) =>
          `<button class="chapter-tab" data-ch="${idx}" data-start="${ch.start}" type="button">${ch.title}</button>`
      )
      .join('');

    const shotsHtml = this.timeline.shots
      .map((s, idx) => {
        const shortTag = s.sceneTitle.includes('·') ? s.sceneTitle.split('·')[1].slice(0, 5) : s.sceneTitle.slice(0, 5);
        return `<button class="shot-pill" data-idx="${idx}" data-start="${s.start}" title="${s.id} ${s.sceneTitle}" type="button">${s.id.replace('IMG-', '#')} ${shortTag}</button>`;
      })
      .join('');

    this.bar.innerHTML = `
      <div class="ctrl-row">
        <button class="ctrl-btn" id="btn-play" type="button">▶ 播放</button>
        <button class="ctrl-btn" id="btn-replay" type="button">↺ 重播</button>
        <input class="ctrl-slider" id="time-slider" type="range" min="0" max="${this.clipDur}" step="0.02" value="0" />
        <span class="ctrl-time" id="time-label">00:00.0 / ${fmt(this.clipDur)}</span>
        <button class="ctrl-btn active" id="btn-quality" type="button" title="切换 2x 超采样 + 光学散景景深 (DoF) + 接触阴影 (SSAO)">超清景深</button>
        <button class="ctrl-btn active" id="btn-hud" type="button">镜号标</button>
        <button class="ctrl-btn" id="btn-aspect" type="button">全屏铺满</button>
      </div>
      <div class="chapter-tabs" id="chapter-tabs">${chaptersHtml}</div>
      <div class="shot-pills" id="shot-pills">${shotsHtml}</div>
    `;
    document.body.appendChild(this.bar);

    this.btnPlay = this.bar.querySelector('#btn-play');
    this.btnReplay = this.bar.querySelector('#btn-replay');
    this.slider = this.bar.querySelector('#time-slider');
    this.timeLabel = this.bar.querySelector('#time-label');
    this.btnQuality = this.bar.querySelector('#btn-quality');
    this.btnHud = this.bar.querySelector('#btn-hud');
    this.btnAspect = this.bar.querySelector('#btn-aspect');
    this.shotStrip = this.bar.querySelector('#shot-pills');
    this.chapterBtns = [...this.bar.querySelectorAll('.chapter-tab')];
    this.shotBtns = [...this.bar.querySelectorAll('.shot-pill')];
  }

  _bindEvents() {
    this.gate.addEventListener('click', () => this.play());
    this.btnPlay.addEventListener('click', () => (this.playing ? this.pause() : this.play()));
    this.btnReplay.addEventListener('click', () => {
      this.seek(0);
      this.play();
    });

    this.slider.addEventListener('input', () => {
      this.scrubbing = true;
      this.seek(parseFloat(this.slider.value));
    });
    this.slider.addEventListener('change', () => {
      this.scrubbing = false;
    });

    this.btnQuality.addEventListener('click', () => {
      this.drawVersion++;
      this.highQuality = !this.highQuality;
      this.btnQuality.classList.toggle('active', this.highQuality);
      this.btnQuality.textContent = this.highQuality ? '超清景深' : '标准流畅';
      this.onToggleQuality?.(this.highQuality);
    });

    this.btnHud.addEventListener('click', () => {
      this.drawVersion++;
      this.overlay2d.demoMode = !this.overlay2d.demoMode;
      this.btnHud.classList.toggle('active', this.overlay2d.demoMode);
    });

    this.btnAspect.addEventListener('click', () => {
      this.drawVersion++;
      const wide = document.body.classList.toggle('wide-stage');
      this.btnAspect.classList.toggle('active', wide);
      this.btnAspect.textContent = wide ? '3:4 竖屏' : '全屏铺满';
      this.onResize?.();
    });

    for (const btn of this.chapterBtns) {
      btn.addEventListener('click', () => {
        const t = parseFloat(btn.dataset.start) + 0.02;
        this.seek(t);
      });
    }

    for (const btn of this.shotBtns) {
      btn.addEventListener('click', () => {
        const t = parseFloat(btn.dataset.start) + 0.02;
        this.seek(t);
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.playing ? this.pause() : this.play();
      } else if (e.code === 'KeyP') {
        this.btnHud.click();
      } else if (e.code === 'KeyF') {
        this.btnAspect.click();
      }
    });
  }

  async play() {
    this.gate.classList.add('hidden');
    await this._audioReady;
    if (this.audio.currentTime >= this.clipDur - 0.05) {
      this.audio.currentTime = 0;
      this.manualTime = 0;
    } else if (Math.abs(this.audio.currentTime - this.manualTime) > 0.15) {
      try {
        this.audio.currentTime = this.manualTime;
      } catch {}
    }
    try {
      await this.audio.play();
      this.playing = true;
      this.btnPlay.textContent = '⏸ 暂停';
    } catch (err) {
      console.warn('Audio play blocked:', err);
      this.playing = true;
      this._fallbackClock = performance.now() - this.manualTime * 1000;
      this.btnPlay.textContent = '⏸ 暂停';
    }
  }

  pause() {
    this.audio.pause();
    this.playing = false;
    this._fallbackClock = null;
    this.btnPlay.textContent = '▶ 播放';
  }

  seek(t) {
    this.drawVersion++;
    const clamped = Math.max(0, Math.min(this.clipDur - 0.01, t));
    this.manualTime = clamped;
    try {
      this.audio.currentTime = clamped;
    } catch {}
    if (this._fallbackClock != null) {
      this._fallbackClock = performance.now() - clamped * 1000;
    }
  }

  currentTime() {
    let t = this.manualTime;
    if (this.playing) {
      if (!this.audio.paused) {
        t = this.audio.currentTime;
      } else if (this._fallbackClock != null) {
        t = (performance.now() - this._fallbackClock) / 1000;
      }
      if (t >= this.clipDur) {
        this.seek(0);
        t = 0;
      }
      this.manualTime = t;
    }

    const rem = this.clipDur - t;
    this.audio.volume = rem < 1.2 ? Math.max(0, Math.min(1, rem / 1.2)) : 1.0;

    if (!this.scrubbing) {
      this.slider.value = t.toFixed(2);
    }
    this.timeLabel.textContent = `${fmt(t)} / ${fmt(this.clipDur)}`;
    return t;
  }

  highlightShot(shotIndex, chapterIndex = 0) {
    for (let i = 0; i < this.chapterBtns.length; i++) {
      this.chapterBtns[i].classList.toggle('active', i === chapterIndex);
    }
    if (shotIndex === this._lastHighlightedShot) return;
    this._lastHighlightedShot = shotIndex;
    for (let i = 0; i < this.shotBtns.length; i++) {
      this.shotBtns[i].classList.toggle('active', i === shotIndex);
    }
    const activePill = this.shotBtns[shotIndex];
    if (activePill && this.shotStrip) {
      const targetLeft =
        activePill.offsetLeft - this.shotStrip.clientWidth * 0.5 + activePill.clientWidth * 0.5;
      this.shotStrip.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }
}
