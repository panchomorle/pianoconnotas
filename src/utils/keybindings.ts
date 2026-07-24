import type { KeyMapping } from '../types';

export const DEFAULT_KEYMAPPING: KeyMapping = {
  // Octave 1 (Lower 12 semitones)
  0:  { key: 'Z', code: 'KeyZ' },
  1:  { key: 'S', code: 'KeyS' },
  2:  { key: 'X', code: 'KeyX' },
  3:  { key: 'D', code: 'KeyD' },
  4:  { key: 'C', code: 'KeyC' },
  5:  { key: 'V', code: 'KeyV' },
  6:  { key: 'G', code: 'KeyG' },
  7:  { key: 'B', code: 'KeyB' },
  8:  { key: 'H', code: 'KeyH' },
  9:  { key: 'N', code: 'KeyN' },
  10: { key: 'J', code: 'KeyJ' },
  11: { key: 'M', code: 'KeyM' },

  // Octave 2 (Middle 12 semitones)
  12: { key: 'Q', code: 'KeyQ' },
  13: { key: '2', code: 'Digit2' },
  14: { key: 'W', code: 'KeyW' },
  15: { key: '3', code: 'Digit3' },
  16: { key: 'E', code: 'KeyE' },
  17: { key: 'R', code: 'KeyR' },
  18: { key: '5', code: 'Digit5' },
  19: { key: 'T', code: 'KeyT' },
  20: { key: '6', code: 'Digit6' },
  21: { key: 'Y', code: 'KeyY' },
  22: { key: '7', code: 'Digit7' },
  23: { key: 'U', code: 'KeyU' },

  // Octave 3 (Upper 12 semitones for 3-octave view)
  24: { key: 'I', code: 'KeyI' },
  25: { key: '9', code: 'Digit9' },
  26: { key: 'O', code: 'KeyO' },
  27: { key: '0', code: 'Digit0' },
  28: { key: 'P', code: 'KeyP' },
  29: { key: '[', code: 'BracketLeft' },
  30: { key: '=', code: 'Equal' },
  31: { key: ']', code: 'BracketRight' },
  32: { key: 'A', code: 'KeyA' },
  33: { key: 'K', code: 'KeyK' },
  34: { key: 'L', code: 'KeyL' },
  35: { key: ';', code: 'Semicolon' },
};

const STORAGE_KEY = 'piano_keybindings_v2';

export function loadSavedKeybindings(): KeyMapping {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_KEYMAPPING, ...parsed };
      }
    }
  } catch (e) {
    console.error('Failed to load keybindings from localStorage:', e);
  }
  return { ...DEFAULT_KEYMAPPING };
}

export function saveKeybindings(mapping: KeyMapping): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  } catch (e) {
    console.error('Failed to save keybindings to localStorage:', e);
  }
}
