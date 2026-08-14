import { getNoteInfoFromMidi } from './musicTheory';
import type { NoteInfo } from '../types';

export interface PitchDetectorOptions {
  onNoteDetected: (noteInfo: NoteInfo) => void;
  onNoteEnd: () => void;
  onError?: (error: Error) => void;
  minVolumeThreshold?: number; // RMS volume threshold, default 0.008
  holdTimeMs?: number; // Delay before clearing note on silence, default 150ms
  maxCentsTolerance?: number; // Max allowed cents deviation from exact note, default 32 cents
  clarityThreshold?: number; // Minimum autocorrelation peak clarity (0.0 - 1.0), default 0.65
}

export class PitchDetector {
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private options: PitchDetectorOptions;

  private holdTimer: number | null = null;
  private currentMidi: number | null = null;

  constructor(options: PitchDetectorOptions) {
    this.options = {
      minVolumeThreshold: 0.008,
      holdTimeMs: 150,
      maxCentsTolerance: 32,
      clarityThreshold: 0.65,
      ...options,
    };
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024; // 1024 fftSize for 21ms ultra-fast audio turnaround
      this.analyser.smoothingTimeConstant = 0.0; // 0.0 smoothing for ZERO time-domain latency

      source.connect(this.analyser);

      this.isRunning = true;
      this.tick();
    } catch (err) {
      this.stop();
      if (this.options.onError && err instanceof Error) {
        this.options.onError(err);
      } else {
        console.error('Error starting pitch detector microphone stream:', err);
      }
      throw err;
    }
  }

  public stop(): void {
    this.isRunning = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.holdTimer !== null) {
      window.clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch { }
      this.audioCtx = null;
    }

    this.analyser = null;

    if (this.currentMidi !== null) {
      this.currentMidi = null;
      this.options.onNoteEnd();
    }
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  private tick = () => {
    if (!this.isRunning || !this.analyser || !this.audioCtx) return;

    const bufferLength = this.analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(buffer);

    const pitchResult = this.detectPitchAutocorrelation(buffer, this.audioCtx.sampleRate);

    if (pitchResult && pitchResult.freq >= 60 && pitchResult.freq <= 1350) {
      const { freq } = pitchResult;
      const midiFloat = 69 + 12 * Math.log2(freq / 440);
      const midi = Math.round(midiFloat);
      const cents = Math.round((midiFloat - midi) * 100);

      const maxCents = this.options.maxCentsTolerance ?? 32;

      if (Math.abs(cents) <= maxCents && midi >= 21 && midi <= 108) {
        if (this.holdTimer !== null) {
          window.clearTimeout(this.holdTimer);
          this.holdTimer = null;
        }

        // ULTRA FAST INSTANT RESPONSE: Fire onNoteDetected immediately on first frame match!
        if (this.currentMidi !== midi) {
          this.currentMidi = midi;
          const noteInfo = getNoteInfoFromMidi(midi);
          this.options.onNoteDetected(noteInfo);
        }
      }
    } else {
      // Below volume/clarity threshold or out of pitch range
      if (this.currentMidi !== null && this.holdTimer === null) {
        const holdTime = this.options.holdTimeMs ?? 150;
        this.holdTimer = window.setTimeout(() => {
          this.currentMidi = null;
          this.options.onNoteEnd();
          this.holdTimer = null;
        }, holdTime);
      }
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Optimized Autocorrelation Pitch Detection Algorithm.
   * Only searches relevant lags (minLag to maxLag) on a 1024 buffer with zero smoothing for maximum speed.
   */
  private detectPitchAutocorrelation(
    buf: Float32Array,
    sampleRate: number
  ): { freq: number; clarity: number } | null {
    const SIZE = buf.length;
    let sumSquares = 0;

    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      sumSquares += val * val;
    }

    const rms = Math.sqrt(sumSquares / SIZE);
    const minRms = this.options.minVolumeThreshold ?? 0.008;

    if (rms < minRms) {
      return null; // Silent or ambient noise below threshold
    }

    const c0 = sumSquares;
    if (c0 === 0) return null;

    // Pitch range 60Hz (C2) to 1350Hz (E6)
    const minLag = Math.floor(sampleRate / 1350);
    const maxLag = Math.ceil(sampleRate / 60);

    if (maxLag >= SIZE) return null;

    const c = new Float32Array(maxLag + 2);
    const startLag = Math.max(1, minLag - 1);
    const endLag = Math.min(SIZE - 1, maxLag + 1);

    for (let lag = startLag; lag <= endLag; lag++) {
      let sum = 0;
      const maxJ = SIZE - lag;
      for (let j = 0; j < maxJ; j++) {
        sum += buf[j] * buf[j + lag];
      }
      c[lag] = sum;
    }

    // Find first dip in autocorrelation starting from minLag
    let d = minLag;
    while (d < maxLag && c[d] > c[d + 1]) {
      d++;
    }

    // Find peak lag after first dip
    let maxval = -1;
    let maxpos = -1;

    for (let i = d; i <= maxLag; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    if (maxpos <= minLag || maxpos >= maxLag) return null;

    // Clarity check: normalized autocorrelation coefficient
    const clarity = maxval / c0;
    const minClarity = this.options.clarityThreshold ?? 0.65;

    if (clarity < minClarity) {
      return null; // Non-tonal noise or unpitched sound
    }

    // Parabolic interpolation for sub-sample frequency resolution
    const x1 = c[maxpos - 1];
    const x2 = c[maxpos];
    const x3 = c[maxpos + 1];

    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;

    let T0 = maxpos;
    if (a !== 0) {
      T0 = maxpos - b / (2 * a);
    }

    if (T0 <= 0) return null;

    const freq = sampleRate / T0;
    return { freq, clarity };
  }
}
