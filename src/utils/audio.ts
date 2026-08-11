import { getFrequencyFromMidi } from './musicTheory';

interface Voice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  gain: GainNode;
  hammer?: AudioBufferSourceNode;
}

class PianoAudioEngine {
  private ctx: AudioContext | null = null;
  private activeVoices: Map<number, Voice> = new Map();
  private volume: number = 0.8; // Master volume 0.0 to 1.0 (default 80%)
  private pianoWave: PeriodicWave | null = null;
  private hammerBuffer: AudioBuffer | null = null;
  private masterHighpass: BiquadFilterNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.pianoWave && this.ctx) {
      this.pianoWave = this.createPianoWave(this.ctx);
    }
    if (!this.hammerBuffer && this.ctx) {
      this.hammerBuffer = this.createHammerBuffer(this.ctx);
    }
  }

  /**
   * Generates a custom PeriodicWave containing 16 overtones calibrated to simulate
   * an acoustic piano string harmonic decay profile.
   */
  private createPianoWave(ctx: AudioContext): PeriodicWave {
    const harmonicAmplitudes = [
      0,     // DC offset
      1.00,  // Fundamental (1st)
      0.75,  // 2nd harmonic (octave)
      0.55,  // 3rd harmonic (5th)
      0.40,  // 4th harmonic
      0.30,  // 5th harmonic
      0.22,  // 6th harmonic
      0.16,  // 7th harmonic
      0.12,  // 8th harmonic
      0.09,  // 9th harmonic
      0.07,  // 10th harmonic
      0.05,  // 11th harmonic
      0.04,  // 12th harmonic
      0.03,  // 13th harmonic
      0.02,  // 14th harmonic
      0.015, // 15th harmonic
      0.01,  // 16th harmonic
    ];

    const real = new Float32Array(harmonicAmplitudes.length);
    const imag = new Float32Array(harmonicAmplitudes);

    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  /**
   * Generates a short noise transient buffer (~14ms) simulating the felt hammer strike on string.
   */
  private createHammerBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * 0.014); // ~14ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.exp(-i / (bufferSize * 0.22));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    return buffer;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  public playNote(midi: number) {
    this.initContext();
    if (!this.ctx || !this.pianoWave) return;

    // Stop existing voice if note is re-struck
    this.stopNote(midi);

    const freq = getFrequencyFromMidi(midi);
    const now = this.ctx.currentTime;

    // 1. Dual Oscillators with slight detuning (Unison chorus depth)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();

    osc1.setPeriodicWave(this.pianoWave);
    osc2.setPeriodicWave(this.pianoWave);

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq, now);

    // Detune by +/- 2.5 cents for acoustic string beating/warmth
    osc1.detune.setValueAtTime(-2.5, now);
    osc2.detune.setValueAtTime(2.5, now);

    // 2. Filter Setup - Key-tracking lowpass filter with register-aware overtone preservation
    // CRITICAL FOR LOW NOTES: High floor cutoff (min 3400Hz) preserves harmonics 3..20 so low notes cut through standard speakers cleanly!
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';

    const startCutoff = Math.min(12000, Math.max(3400, freq * 7.5));
    const sustainCutoff = Math.min(6000, Math.max(1200, freq * 2.2));

    // Register-based filter decay speed (low notes keep brightness longer)
    const filterDecayTime = midi < 48 ? 2.2 : midi < 72 ? 1.4 : 0.6;

    filter.frequency.setValueAtTime(startCutoff, now);
    filter.frequency.exponentialRampToValueAtTime(sustainCutoff, now + filterDecayTime);

    // 3. Hammer Attack Transient (Felt impact noise)
    let hammerSource: AudioBufferSourceNode | undefined;
    if (this.hammerBuffer) {
      hammerSource = this.ctx.createBufferSource();
      hammerSource.buffer = this.hammerBuffer;

      const hammerFilter = this.ctx.createBiquadFilter();
      hammerFilter.type = 'bandpass';
      hammerFilter.frequency.setValueAtTime(Math.min(4500, Math.max(1200, freq * 3.5)), now);
      hammerFilter.Q.setValueAtTime(1.8, now);

      const hammerGain = this.ctx.createGain();
      const hammerVol = 0.12 * this.volume;
      hammerGain.gain.setValueAtTime(hammerVol, now);
      hammerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

      hammerSource.connect(hammerFilter);
      hammerFilter.connect(filter);
      hammerSource.start(now);
    }

    // 4. Amplitude Envelope (Attack -> Strike decay -> Sustain decay)
    const noteGain = this.ctx.createGain();
    const peakVolume = 0.4 * this.volume;
    const initialStrikeVolume = peakVolume * 0.65;

    // Register-based string sustain duration
    const stringSustainDuration = midi < 48 ? 4.5 : midi < 72 ? 3.0 : 1.6;

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(peakVolume, now + 0.004); // Fast 4ms attack
    noteGain.gain.exponentialRampToValueAtTime(initialStrikeVolume, now + 0.08); // Hammer strike drop
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + stringSustainDuration); // Natural decay

    // 5. Master Highpass Filter (Remove sub-35Hz rumble/distortion)
    if (!this.masterHighpass) {
      this.masterHighpass = this.ctx.createBiquadFilter();
      this.masterHighpass.type = 'highpass';
      this.masterHighpass.frequency.setValueAtTime(35, this.ctx.currentTime);
      this.masterHighpass.connect(this.ctx.destination);
    }

    // Connect nodes
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.masterHighpass);

    osc1.start(now);
    osc2.start(now);

    this.activeVoices.set(midi, { osc1, osc2, gain: noteGain, hammer: hammerSource });
  }

  public stopNote(midi: number) {
    const voice = this.activeVoices.get(midi);
    if (!voice || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Smooth dampening felt release (120ms release ramp)
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    setTimeout(() => {
      try {
        voice.osc1.stop();
        voice.osc2.stop();
        if (voice.hammer) {
          try {
            voice.hammer.stop();
          } catch {}
        }
        voice.osc1.disconnect();
        voice.osc2.disconnect();
        voice.gain.disconnect();
      } catch {
        // already stopped
      }
    }, 150);

    this.activeVoices.delete(midi);
  }
}

export const audioEngine = new PianoAudioEngine();

