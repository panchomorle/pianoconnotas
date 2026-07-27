import type { NoteInfo, KeySignature, ClefType } from '../types';

export const NOTE_NAMES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_ES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];

export const IS_BLACK_KEY = [false, true, false, true, false, false, true, false, true, false, true, false];

export function getMidiNumber(baseOctave: number, relativeIndex: number): number {
  return (baseOctave + 1) * 12 + relativeIndex;
}

export function getNoteInfoFromMidi(midi: number): NoteInfo {
  const semitoneInOctave = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const isBlack = IS_BLACK_KEY[semitoneInOctave];
  const name = NOTE_NAMES_EN[semitoneInOctave];
  const spanishName = `${NOTE_NAMES_ES[semitoneInOctave]} ${octave}`;

  return {
    name,
    octave,
    midi,
    spanishName,
    isBlack,
    semitoneInOctave,
  };
}

export function getFrequencyFromMidi(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const KEY_SIGNATURES: KeySignature[] = [
  { id: 'C_maj', name: 'Do mayor / La menor (0)', sharps: [], flats: [], rootSemitone: 0 },
  
  // Sostenidos (#)
  { id: 'G_maj', name: 'Sol mayor / Mi menor (1♯)', sharps: ['F'], flats: [], rootSemitone: 7 },
  { id: 'D_maj', name: 'Re mayor / Si menor (2♯)', sharps: ['F', 'C'], flats: [], rootSemitone: 2 },
  { id: 'A_maj', name: 'La mayor / Fa♯ menor (3♯)', sharps: ['F', 'C', 'G'], flats: [], rootSemitone: 9 },
  { id: 'E_maj', name: 'Mi mayor / Do♯ menor (4♯)', sharps: ['F', 'C', 'G', 'D'], flats: [], rootSemitone: 4 },
  { id: 'B_maj', name: 'Si mayor / Sol♯ menor (5♯)', sharps: ['F', 'C', 'G', 'D', 'A'], flats: [], rootSemitone: 11 },
  { id: 'Fs_maj', name: 'Fa♯ mayor / Re♯ menor (6♯)', sharps: ['F', 'C', 'G', 'D', 'A', 'E'], flats: [], rootSemitone: 6 },
  { id: 'Cs_maj', name: 'Do♯ mayor / La♯ menor (7♯)', sharps: ['F', 'C', 'G', 'D', 'A', 'E', 'B'], flats: [], rootSemitone: 1 },

  // Bemoles (b)
  { id: 'F_maj', name: 'Fa mayor / Re menor (1♭)', sharps: [], flats: ['B'], rootSemitone: 5 },
  { id: 'Bb_maj', name: 'Si♭ mayor / Sol menor (2♭)', sharps: [], flats: ['B', 'E'], rootSemitone: 10 },
  { id: 'Eb_maj', name: 'Mi♭ mayor / Do menor (3♭)', sharps: [], flats: ['B', 'E', 'A'], rootSemitone: 3 },
  { id: 'Ab_maj', name: 'La♭ mayor / Fa menor (4♭)', sharps: [], flats: ['B', 'E', 'A', 'D'], rootSemitone: 8 },
  { id: 'Db_maj', name: 'Re♭ mayor / Si♭ menor (5♭)', sharps: [], flats: ['B', 'E', 'A', 'D', 'G'], rootSemitone: 1 },
  { id: 'Gb_maj', name: 'Sol♭ mayor / Mi♭ menor (6♭)', sharps: [], flats: ['B', 'E', 'A', 'D', 'G', 'C'], rootSemitone: 6 },
  { id: 'Cb_maj', name: 'Do♭ mayor / La♭ menor (7♭)', sharps: [], flats: ['B', 'E', 'A', 'D', 'G', 'C', 'F'], rootSemitone: 11 },
];

export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

export function getScaleSemitones(keySig: KeySignature): Set<number> {
  const scaleSemitones = new Set<number>();
  const root = keySig.rootSemitone;
  MAJOR_SCALE_INTERVALS.forEach((interval) => {
    scaleSemitones.add((root + interval) % 12);
  });
  return scaleSemitones;
}

export interface NoteKeySignatureSpelling {
  letter: string; // 'C', 'D', 'E', 'F', 'G', 'A', 'B'
  diatonicStepInOctave: number; // C=0, D=1, E=2, F=3, G=4, A=5, B=6
  accidental: '♯' | '♭' | '♮' | null;
  displayNameEs: string; // e.g. "Re♯ 4" or "Mi♭ 4"
  displayNameEn: string; // e.g. "D#4" or "Eb4"
}

/**
 * Calculates exact music-theoretically correct spelling and accidental
 * for any MIDI note in the context of the active Key Signature.
 */
export function getNoteSpellingInKeySignature(
  midi: number,
  keySig: KeySignature
): NoteKeySignatureSpelling {
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;

  const isFlatKey = keySig.flats.length > 0;
  const sharps = keySig.sharps;
  const flats = keySig.flats;

  let letter = 'C';
  let diatonicStepInOctave = 0;
  let accidental: '♯' | '♭' | '♮' | null = null;
  let accidentalNameEs = '';
  let accidentalNameEn = '';

  if (isFlatKey) {
    // Flat Keys (Fa, Si♭, Mi♭, La♭, Re♭, Sol♭, Do♭ mayor)
    switch (semitone) {
      case 0: // C
        letter = 'C'; diatonicStepInOctave = 0;
        if (flats.includes('C')) { accidental = '♮'; }
        break;

      case 1: // Db
        letter = 'D'; diatonicStepInOctave = 1;
        accidentalNameEs = '♭'; accidentalNameEn = 'b';
        if (flats.includes('D')) { accidental = null; }
        else { accidental = '♭'; }
        break;

      case 2: // D
        letter = 'D'; diatonicStepInOctave = 1;
        if (flats.includes('D')) { accidental = '♮'; }
        break;

      case 3: // Eb
        letter = 'E'; diatonicStepInOctave = 2;
        accidentalNameEs = '♭'; accidentalNameEn = 'b';
        if (flats.includes('E')) { accidental = null; }
        else { accidental = '♭'; }
        break;

      case 4: // E
        letter = 'E'; diatonicStepInOctave = 2;
        if (flats.includes('E')) { accidental = '♮'; }
        break;

      case 5: // F
        letter = 'F'; diatonicStepInOctave = 3;
        if (flats.includes('F')) { accidental = '♮'; }
        break;

      case 6: // Gb
        letter = 'G'; diatonicStepInOctave = 4;
        accidentalNameEs = '♭'; accidentalNameEn = 'b';
        if (flats.includes('G')) { accidental = null; }
        else { accidental = '♭'; }
        break;

      case 7: // G
        letter = 'G'; diatonicStepInOctave = 4;
        if (flats.includes('G')) { accidental = '♮'; }
        break;

      case 8: // Ab
        letter = 'A'; diatonicStepInOctave = 5;
        accidentalNameEs = '♭'; accidentalNameEn = 'b';
        if (flats.includes('A')) { accidental = null; }
        else { accidental = '♭'; }
        break;

      case 9: // A
        letter = 'A'; diatonicStepInOctave = 5;
        if (flats.includes('A')) { accidental = '♮'; }
        break;

      case 10: // Bb
        letter = 'B'; diatonicStepInOctave = 6;
        accidentalNameEs = '♭'; accidentalNameEn = 'b';
        if (flats.includes('B')) { accidental = null; }
        else { accidental = '♭'; }
        break;

      case 11: // B
        letter = 'B'; diatonicStepInOctave = 6;
        if (flats.includes('B')) { accidental = '♮'; }
        break;
    }
  } else {
    // Sharp Keys & C Major (Do, Sol, Re, La, Mi, Si, Fa♯, Do♯ mayor)
    switch (semitone) {
      case 0: // C
        letter = 'C'; diatonicStepInOctave = 0;
        if (sharps.includes('C')) { accidental = '♮'; }
        break;

      case 1: // C#
        letter = 'C'; diatonicStepInOctave = 0;
        accidentalNameEs = '♯'; accidentalNameEn = '#';
        if (sharps.includes('C')) { accidental = null; }
        else { accidental = '♯'; }
        break;

      case 2: // D
        letter = 'D'; diatonicStepInOctave = 1;
        if (sharps.includes('D')) { accidental = '♮'; }
        break;

      case 3: // D#
        letter = 'D'; diatonicStepInOctave = 1;
        accidentalNameEs = '♯'; accidentalNameEn = '#';
        if (sharps.includes('D')) { accidental = null; }
        else { accidental = '♯'; }
        break;

      case 4: // E
        letter = 'E'; diatonicStepInOctave = 2;
        if (sharps.includes('E')) { accidental = '♮'; }
        break;

      case 5: // F
        letter = 'F'; diatonicStepInOctave = 3;
        if (sharps.includes('F')) { accidental = '♮'; }
        break;

      case 6: // F#
        letter = 'F'; diatonicStepInOctave = 3;
        accidentalNameEs = '♯'; accidentalNameEn = '#';
        if (sharps.includes('F')) { accidental = null; }
        else { accidental = '♯'; }
        break;

      case 7: // G
        letter = 'G'; diatonicStepInOctave = 4;
        if (sharps.includes('G')) { accidental = '♮'; }
        break;

      case 8: // G#
        letter = 'G'; diatonicStepInOctave = 4;
        accidentalNameEs = '♯'; accidentalNameEn = '#';
        if (sharps.includes('G')) { accidental = null; }
        else { accidental = '♯'; }
        break;

      case 9: // A
        letter = 'A'; diatonicStepInOctave = 5;
        if (sharps.includes('A')) { accidental = '♮'; }
        break;

      case 10: // A#
        letter = 'A'; diatonicStepInOctave = 5;
        accidentalNameEs = '♯'; accidentalNameEn = '#';
        if (sharps.includes('A')) { accidental = null; }
        else { accidental = '♯'; }
        break;

      case 11: // B
        letter = 'B'; diatonicStepInOctave = 6;
        if (sharps.includes('B')) { accidental = '♮'; }
        break;
    }
  }

  const letterToNameEs: Record<string, string> = {
    C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si'
  };

  const baseEs = letterToNameEs[letter];
  const displayNameEs = `${baseEs}${accidentalNameEs} ${octave}`;
  const displayNameEn = `${letter}${accidentalNameEn}${octave}`;

  return {
    letter,
    diatonicStepInOctave,
    accidental,
    displayNameEs,
    displayNameEn,
  };
}

export function getStaffDiatonicOffset(midi: number, clef: ClefType, keySig: KeySignature): number {
  const octave = Math.floor(midi / 12) - 1;
  const spelling = getNoteSpellingInKeySignature(midi, keySig);

  const totalDiatonicStep = octave * 7 + spelling.diatonicStepInOctave;

  let baseLineDiatonic = 30; // treble (Line 0 = E4)

  if (clef === 'treble8vb') {
    baseLineDiatonic = 23;
  } else if (clef === 'bass') {
    baseLineDiatonic = 18;
  } else if (clef === 'bass8vb') {
    baseLineDiatonic = 11;
  } else if (clef === 'alto') {
    baseLineDiatonic = 24;
  } else if (clef === 'tenor') {
    baseLineDiatonic = 22;
  }

  return totalDiatonicStep - baseLineDiatonic;
}
