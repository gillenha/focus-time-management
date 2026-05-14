// Singleton SFX manager using Web Audio API for zero-latency event sounds.
// Call sfxManager.init() once on app mount; call sfxManager.play(name) directly
// in event handlers — never via useEffect.

const SFX_MANIFEST = {
  bell:           '/effects/bell.mp3',
  enterFlowState: '/effects/enter-flow-state.mp3',
  sessionEnd:     '/effects/session-end.mp3',
  nextTrack:      '/effects/next-track.mp3',
  playPause:      '/effects/play-pause.mp3',
};

const VOLUMES = { bell: 0.5 };
const DEFAULT_VOLUME = 0.25;

class SfxManager {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.ready = false;
    this.initPromise = null;
  }

  init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) {
          console.warn('Web Audio API not supported');
          return;
        }
        this.ctx = new Ctx();

        const entries = Object.entries(SFX_MANIFEST);
        await Promise.all(entries.map(async ([name, path]) => {
          try {
            const res = await fetch(path);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arrayBuffer = await res.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers.set(name, audioBuffer);
          } catch (err) {
            console.warn(`sfxManager: failed to load "${name}" from ${path}:`, err);
          }
        }));

        this.ready = true;
      } catch (err) {
        console.error('sfxManager init failed:', err);
      }
    })();

    return this.initPromise;
  }

  play(name) {
    if (!this.ctx || !this.ready) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const buffer = this.buffers.get(name);
    if (!buffer) {
      console.warn(`sfxManager: no buffer for "${name}"`);
      return;
    }

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.value = VOLUMES[name] ?? DEFAULT_VOLUME;

      source.connect(gain).connect(this.ctx.destination);
      source.start(0);
    } catch (err) {
      console.warn(`sfxManager: play("${name}") failed:`, err);
    }
  }

  isReady() {
    return this.ready;
  }
}

const sfxManager = new SfxManager();
export default sfxManager;
