export interface NoteInfo {
  name: string; // e.g. "C", "C#", "D", "Eb", etc.
  octave: number; // e.g. 4
  midi: number; // MIDI number e.g. 60 for C4
  spanishName: string; // e.g. "Do 4"
  isBlack: boolean;
  semitoneInOctave: number; // 0 to 11 (C=0, C#=1... B=11)
}

export type ClefType = 'treble' | 'treble8vb' | 'bass' | 'bass8vb' | 'alto' | 'tenor';

export interface KeySignature {
  id: string;
  name: string; // e.g. "Do mayor / La menor"
  sharps: string[]; // array of altered notes e.g. ['F', 'C', 'G']
  flats: string[]; // array of altered notes e.g. ['B', 'E', 'A']
  rootSemitone: number; // Major scale root semitone in octave (0..11, C=0)
}

export interface KeyMapping {
  [relativeIndex: number]: {
    key: string;
    code: string;
  };
}

export interface SavedScore {
  id: string;
  name: string;
  pdfData: ArrayBuffer | null;
  clef: ClefType;
  keySigId: string;
  baseOctave: number;
  volume: number;
  zoomPercent?: number;
  scrollSpeed?: number;
  scrollTop?: number;
  scrollLeft?: number;
  updatedAt: number;
  createdAt: number;
}

