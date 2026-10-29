/* MediaPipe Hands: on-device landmark inference. Model files are fetched on demand. */
(function (global) {
  'use strict';
  const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/';
  const BONES = [
    [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12], [9,13],[13,14],[14,15],[15,16],
    [13,17],[0,17],[17,18],[18,19],[19,20]
  ];
  let loader = null;
  function timed(promise, ms, message) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })
    ]).finally(() => clearTimeout(timer));
  }
  function loadLibrary() {
    if (global.Hands) return Promise.resolve();
    if (!loader) {
      loader = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = './hands.js';
        script.async = true;
        script.onload = () => global.Hands ? resolve() : reject(new Error('O módulo de mãos não iniciou.'));
        script.onerror = () => reject(new Error('Não foi possível carregar o módulo de mãos.'));
        document.head.appendChild(script);
      });
      loader = timed(loader, 15000, 'O módulo de mãos demorou demais para carregar.').catch(error => { loader = null; throw error; });
    }
    return loader;
  }
  class PocketHands {
    constructor(video, onResults, onStatus) {
      if (!video) throw new Error('PocketHands precisa de um elemento de vídeo.');
      this.video = video;
      this.onResults = typeof onResults === 'function' ? onResults : () => {};
      this.onStatus = typeof onStatus === 'function' ? onStatus : () => {};
      this.latest = [];
      this.handedness = [];
      this.input=document.createElement('canvas');this.input.width=320;this.input.height=240;this.inputContext=this.input.getContext('2d',{alpha:false});this.lastVideoTime=-1;
      this.active = false;
      this._run = null;
      this._generation = 0;
    }
    _current(run) { return this.active && this._run === run && run.generation === this._generation; }
    _status(run, state, message) {
      if (this._current(run)) this.onStatus({ state, message, hands: this.latest.length });
    }
    _close(run) {
      if (!run || run.closed || !run.model || run.busy) return;
      run.closed = true;
      // close() can reject if initialization was interrupted; cancellation stays silent.
      try { Promise.resolve(run.model.close()).catch(() => {}); } catch (_) {}
    }
    async start() {
      if (this.active && this._run) return this._run.ready;
      this.stop();
      this.active = true;
      const run = { generation: ++this._generation, model: null, busy: false, closed: false, timer: null, ready: null, lastState: '' };
      this._run = run;
      run.ready = this._start(run);
      return run.ready;
    }
    async _start(run) {
      this._status(run, 'loading', 'Carregando IA de mãos. O primeiro uso precisa de internet.');
      try {
        await loadLibrary();
        if (!this._current(run)) return false;
        const model = new global.Hands({ locateFile: file => CDN + file });
        run.model = model;
        model.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: 0.65, minTrackingConfidence: 0.65 });
        model.onResults(result => {
          if (!this._current(run)) return;
          this.latest = (result.multiHandLandmarks || []).filter(hand => hand.length === 21).map(hand => hand.map(p => ({ x: p.x, y: p.y, z: p.z })));
          this.handedness = (result.multiHandedness || []).map(item => ({ label: item.label, score: item.score }));
          this.onResults({ landmarks: this.latest, handedness: this.handedness, timestamp: performance.now() });
          const state = this.latest.length ? 'tracking' : 'searching';
          if (run.lastState !== state) {
            run.lastState = state;
            this._status(run, state, this.latest.length ? 'Mão detectada: 21 pontos por mão.' : 'Mostre a mão inteira à câmera, em um local iluminado.');
          }
        });
        run.busy = true;
        const initialize = Promise.resolve(model.initialize());
        initialize.finally(() => { run.busy = false; if (!this._current(run)) this._close(run); }).catch(() => {});
        await timed(initialize, 45000, 'A IA de mãos não carregou. Confira a internet e tente novamente.');
        if (!this._current(run)) { this._close(run); return false; }
        this._status(run, 'ready', 'IA pronta. Mostre as mãos à câmera.');
        this._schedule(run, 0);
        return true;
      } catch (error) {
        if (!this._current(run)) { this._close(run); return false; }
        this._status(run, 'error', error && error.message ? error.message : 'Não foi possível iniciar a IA de mãos.');
        this.active = false;
        this.latest = [];
        this.handedness = [];
        this._close(run);
        return false;
      }
    }
    _schedule(run, delay) {
      if (!this._current(run)) return;
      run.timer = setTimeout(() => this._tick(run), delay);
    }
    async _tick(run) {
      if (!this._current(run) || run.busy) return;
      if (this.video.readyState < 2 || !this.video.videoWidth || this.video.paused || document.hidden || this.video.currentTime===this.lastVideoTime) {
        this._schedule(run, 200);
        return;
      }
      const started = performance.now();
      run.busy = true;
      try {
        this.lastVideoTime=this.video.currentTime;
        const h=Math.max(1,Math.round(320*this.video.videoHeight/this.video.videoWidth));if(this.input.height!==h)this.input.height=h;
        this.inputContext.drawImage(this.video,0,0,320,h);
        const sending = Promise.resolve(run.model.send({ image: this.input }));
        sending.finally(() => { run.busy = false; if (!this._current(run)) this._close(run); }).catch(() => {});
        await timed(sending, 15000, 'O rastreamento de mãos parou de responder. Desative e tente novamente.');
      } catch (error) {
        if (this._current(run)) {
          this._status(run, 'error', error && error.message ? error.message : 'O rastreamento de mãos foi interrompido.');
          this.active = false;
          this.latest = [];
          this.handedness = [];
        }
        this._close(run);
        return;
      }
      this._schedule(run, Math.max(100, 220 - (performance.now() - started)));
    }
    stop() {
      const run = this._run;
      this.active = false;
      this._generation++;
      this._run = null;
      this.latest = [];
      this.handedness = [];
      if (run) { clearTimeout(run.timer); this._close(run); }
    }
    /** Landmarks are unmirrored, normalized camera coordinates. Match the video's viewport. */
    static draw(ctx, landmarks, x, y, width, height) {
      if (!ctx || !landmarks || !landmarks.length || width <= 0 || height <= 0) return;
      const hands = typeof landmarks[0].x === 'number' ? [landmarks] : landmarks;
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
      const stroke = Math.max(1.6, Math.min(width, height) / 180);
      hands.forEach((hand, index) => {
        if (hand.length !== 21 || hand.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return;
        const point = i => [x + hand[i].x * width, y + hand[i].y * height];
        const color = index % 2 ? '#ffcd79' : '#70fff0';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // Dark underlay keeps the mesh readable against bright camera imagery.
        for (const [lineWidth, lineColor] of [[stroke + 3, '#061c2cbb'], [stroke, color]]) {
          ctx.strokeStyle = lineColor; ctx.lineWidth = lineWidth; ctx.beginPath();
          BONES.forEach(([a,b]) => { const pa = point(a), pb = point(b); ctx.moveTo(...pa); ctx.lineTo(...pb); });
          ctx.stroke();
        }
        hand.forEach((p, i) => {
          const px = x + p.x * width, py = y + p.y * height;
          const tip = [4,8,12,16,20].includes(i);
          ctx.beginPath(); ctx.arc(px, py, stroke * (tip ? 2.0 : 1.3), 0, Math.PI * 2);
          ctx.fillStyle = tip ? '#ffffff' : color; ctx.fill();
          ctx.lineWidth = 1.2; ctx.strokeStyle = '#092533'; ctx.stroke();
        });
      });
      ctx.restore();
    }
  }
  PocketHands.MODEL_CDN = CDN;
  PocketHands.BONES = BONES;
  global.PocketHands = PocketHands;
})(window);
