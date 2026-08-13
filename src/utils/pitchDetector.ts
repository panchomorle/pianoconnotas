import { getNoteInfoFromMidi } from './musicTheory';
import type { NoteInfo } from '../types';

export interface PitchDetectorOptions {
  onNoteDetected: (noteInfo: NoteInfo) => void;
  onNoteEnd: () => void;
  onError?: (error: Error) => void;
  minVolumeThreshold?: number; // RMS threshold, default 0.015
  holdTimeMs?: number; // Delay before clearing note on silence, default 180ms
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
      minVolumeThreshold: 0.015,
      holdTimeMs: 180,
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
      this.analyser.fftSize = 2048; // 2048 buffer length for ~43Hz resolution per bin
      this.analyser.smoothingTimeConstant = 0.8;

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
      } catch {}
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

    const freq = this.detectPitchAutocorrelation(buffer, this.audioCtx.sampleRate);

    if (freq && freq >= 60 && freq <= 1300) { // C2 (~65Hz) to E6 (~1318Hz)
      const midiFloat = 69 + 12 * Math.log2(freq / 440);
      const midi = Math.round(midiFloat);

      // MIDI note bounds (Piano range typically 21 [A0] to 108 [C8])
      if (midi >= 21 && midi <= 108) {
        if (this.holdTimer !== null) {
          window.clearTimeout(this.holdTimer);
          this.holdTimer = null;
        }

        if (this.currentMidi !== midi) {
          this.currentMidi = midi;
          const noteInfo = getNoteInfoFromMidi(midi);
          this.options.onNoteDetected(noteInfo);
        }
      }
    } else {
      // Below RMS threshold or out of pitch range
      if (this.currentMidi !== null && this.holdTimer === null) {
        this.holdTimer = window.setTimeout(() => {
          this.currentMidi = null;
          this.options.onNoteEnd();
          this.holdTimer = null;
        }, this.options.holdTimeMs);
      }
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Autocorrelation Pitch Detection Algorithm with RMS noise gating and parabolic interpolation.
   */
  private detectPitchAutocorrelation(buf: Float32Array, sampleRate: number): number | null {
    const SIZE = buf.length;
    let sumSquares = 0;

    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      sumSquares += val * val;
    }

    const rms = Math.sqrt(sumSquares / SIZE);
    const minRms = this.options.minVolumeThreshold ?? 0.015;

    if (rms < minRms) {
      return null; // Silent or noise below threshold
    }

    // Trim quiet edges to improve autocorrelation quality
    let r1 = 0;
    let r2 = SIZE - 1;
    const thres = 0.2;

    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) {
        r1 = i;
        break;
      }
    }

    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    }

    const trimmedBuf = buf.subarray(r1, r2);
    const trimmedSize = trimmedBuf.length;

    // Autocorrelation buffer
    const c = new Float32Array(trimmedSize);
    for (let i = 0; i < trimmedSize; i++) {
      for (let j = 0; j < trimmedSize - i; j++) {
        c[i] = c[i] + trimmedBuf[j] * trimmedBuf[j + i];
      }
    }

    // Find first dip in autocorrelation
    let d = 0;
    while (c[d] > c[d + 1]) {
      d++;
      if (d >= trimmedSize - 1) return null;
    }

    // Find peak lag after first dip
    let maxval = -1;
    let maxpos = -1;

    for (let i = d; i < trimmedSize; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    if (maxpos <= 0 || maxpos >= trimmedSize - 1) return null;

    // Parabolic interpolation for sub-sample accuracy
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

    return sampleRate / T0;
  }
}
