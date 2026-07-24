import { getFrequencyFromMidi } from './musicTheory';

class PianoAudioEngine {
  private ctx: AudioContext | null = null;
  private activeVoices: Map<number, { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode }> = new Map();
  private volume: number = 0.8; // Master volume 0.0 to 1.0 (default 80%)

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  public playNote(midi: number) {
    this.initContext();
    if (!this.ctx) return;

    this.stopNote(midi);

    const freq = getFrequencyFromMidi(midi);
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 4, 8000), now);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 1.5, 2000), now + 1.2);

    const noteGain = this.ctx.createGain();
    const peakVolume = 0.45 * this.volume;
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(peakVolume, now + 0.015);
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakVolume * 0.3), now + 0.8);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);

    this.activeVoices.set(midi, { osc1, osc2, gain: noteGain });
  }

  public stopNote(midi: number) {
    const voice = this.activeVoices.get(midi);
    if (!voice || !this.ctx) return;

    const now = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    setTimeout(() => {
      try {
        voice.osc1.stop();
        voice.osc2.stop();
        voice.osc1.disconnect();
        voice.osc2.disconnect();
        voice.gain.disconnect();
      } catch {
        // already stopped
      }
    }, 180);

    this.activeVoices.delete(midi);
  }
}

export const audioEngine = new PianoAudioEngine();
