/**
 * VAULT: The Haptic Heist — Procedural Web Audio Engine
 * Zero external audio files. Pure Web Audio API synthesis.
 */

class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.isUnlocked = false;
  }

  /**
   * Разблокировка аудиоконтекста по первому жесту пользователя (iOS/Android requirement)
   */
  init() {
    if (this.isUnlocked && this.ctx && this.ctx.state === 'running') return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!this.ctx) {
      this.ctx = new AudioContextClass();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isUnlocked = true;
  }

  /**
   * Обычный механический клик шестерни (шаг 1 дивизиона = 3.6 градуса)
   * Длительность: 12-16 мс
   */
  playTick() {
    if (!this.ctx || !this.isUnlocked) return;
    const t = this.ctx.currentTime;

    // 1. Короткий шумовой импульс (White Noise Buffer 4ms)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.004);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // 2. Металлический полосовой фильтр (Bandpass 1150 Hz)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150, t);
    filter.Q.setValueAtTime(3.8, t);

    // 3. Быстрая экспоненциальная огибающая
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.014);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  /**
   * Резонансный клик при вхождении в зону штифта (Sweet Spot)
   * Двухслойный звук: высокий металлический щелчок + глухой саб-резонанс
   */
  playSweetSpotTick() {
    if (!this.ctx || !this.isUnlocked) return;
    const t = this.ctx.currentTime;

    // Слой 1: Высокий металлический щелчок (2400 Hz -> 800 Hz)
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(2600, t);
    clickOsc.frequency.exponentialRampToValueAtTime(700, t + 0.02);

    clickGain.gain.setValueAtTime(0.35, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    clickOsc.start(t);
    clickOsc.stop(t + 0.025);

    // Слой 2: Тяжелый саб-импульс соскальзывающего ригеля (85 Hz -> 35 Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(85, t);
    subOsc.frequency.exponentialRampToValueAtTime(32, t + 0.045);

    subGain.gain.setValueAtTime(0.65, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.05);
  }

  /**
   * Фиксация сувальды (Latch Pin)
   * Тяжелый металлический лязг соскакивания блокиратора
   */
  playTumblerLock() {
    if (!this.ctx || !this.isUnlocked) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Финал: Полное распахивание сейфа (Success Chord)
   */
  playUnlockChord() {
    if (!this.ctx || !this.isUnlocked) return;
    const baseFreqs = [261.63, 329.63, 392.00, 523.25]; // C-major chord
    baseFreqs.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  /**
   * Тревога / Срыв замка (Alarm / Jam Buzz)
   */
  playLockJam() {
    if (!this.ctx || !this.isUnlocked) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.25);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

window.AudioEngine = new ProceduralAudioEngine();
