import React, { useState, useEffect } from 'react';
import type { NoteInfo, KeyMapping } from '../types';
import { KEY_SIGNATURES, getMidiNumber, getNoteInfoFromMidi, IS_BLACK_KEY, getScaleSemitones } from '../utils/musicTheory';
import { ChevronLeft, ChevronRight, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface PianoProps {
  baseOctave: number;
  onBaseOctaveChange: (newOctave: number) => void;
  keyMapping: KeyMapping;
  activeMidiSet: Set<number>;
  onNoteStart: (midi: number) => void;
  onNoteEnd: (midi: number) => void;
  onKeyRightClick: (relativeIndex: number, noteInfo: NoteInfo) => void;
  onResetAllKeys: () => void;
  octaveCount: number;
  volume: number;
  onVolumeChange: (newVol: number) => void;
  keySigId: string;
}

export const Piano: React.FC<PianoProps> = ({
  baseOctave,
  onBaseOctaveChange,
  keyMapping,
  activeMidiSet,
  onNoteStart,
  onNoteEnd,
  onKeyRightClick,
  onResetAllKeys,
  octaveCount,
  volume,
  onVolumeChange,
  keySigId,
}) => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    setIsMobile(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const currentKeySig = KEY_SIGNATURES.find((k) => k.id === keySigId) || KEY_SIGNATURES[0];
  const scaleSemitones = getScaleSemitones(currentKeySig);

  const totalSemitones = octaveCount * 12;
  const semitones = Array.from({ length: totalSemitones }, (_, i) => i);

  // Helper function for key context menu / right click rebind trigger
  const handleKeyContextMenu = (
    e: React.MouseEvent | React.TouchEvent,
    relativeIndex: number,
    noteInfo: NoteInfo
  ) => {
    e.preventDefault();
    const nativeEv = e.nativeEvent as PointerEvent | MouseEvent;
    // Do NOT open rebind modal on touch long-presses (sustain notes instead)
    if ('pointerType' in nativeEv && nativeEv.pointerType === 'touch') {
      return;
    }
    if (nativeEv.button === 2) {
      onKeyRightClick(relativeIndex, noteInfo);
    }
  };

  // Render a single key element (White or Black)
  const renderPianoKey = (
    relativeIndex: number,
    leftPercent: number,
    widthPercent: number,
    isBlack: boolean
  ) => {
    const midi = getMidiNumber(baseOctave, relativeIndex);
    const noteInfo = getNoteInfoFromMidi(midi);
    const isActive = activeMidiSet.has(midi);
    const isScaleNote = scaleSemitones.has(noteInfo.semitoneInOctave);
    const mapping = keyMapping[relativeIndex];
    const keyLabel = mapping ? mapping.key : '';

    const keyTypeClass = isBlack ? 'black-key' : 'white-key';
    const keyKeyStr = `${isBlack ? 'black' : 'white'}-${relativeIndex}`;

    return (
      <div
        key={keyKeyStr}
        className={`piano-key ${keyTypeClass} ${isScaleNote ? 'in-scale' : ''} ${isActive ? 'active' : ''}`}
        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
        onMouseDown={(e) => {
          if (e.button === 0) onNoteStart(midi);
        }}
        onMouseUp={() => onNoteEnd(midi)}
        onMouseLeave={() => onNoteEnd(midi)}
        onTouchStart={(e) => {
          e.preventDefault();
          onNoteStart(midi);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          onNoteEnd(midi);
        }}
        onTouchCancel={(e) => {
          e.preventDefault();
          onNoteEnd(midi);
        }}
        onContextMenu={(e) => handleKeyContextMenu(e, relativeIndex, noteInfo)}
        title={`${noteInfo.spanishName} (${noteInfo.name}) - Clic derecho para reasignar`}
      >
        <div className="key-tag-wrapper">
          <span className="key-binding-tag white">{keyLabel}</span>
          <span className="key-note-name">{isBlack ? noteInfo.name : noteInfo.spanishName}</span>
        </div>
      </div>
    );
  };

  // 1-Row Render Calculation (Desktop viewports)
  let desktopWhiteCount = 0;
  const desktopSemitoneWhiteIndexMap: number[] = [];
  semitones.forEach((i) => {
    const isBlack = IS_BLACK_KEY[i % 12];
    if (isBlack) {
      desktopSemitoneWhiteIndexMap.push(desktopWhiteCount - 1);
    } else {
      desktopSemitoneWhiteIndexMap.push(desktopWhiteCount);
      desktopWhiteCount++;
    }
  });

  const desktopWhiteKeyWidthPercent = 100 / desktopWhiteCount;
  const desktopBlackKeyWidthPercent = desktopWhiteKeyWidthPercent * 0.58;
  const desktopWhiteKeys = semitones.filter((i) => !IS_BLACK_KEY[i % 12]);
  const desktopBlackKeys = semitones.filter((i) => IS_BLACK_KEY[i % 12]);

  return (
    <div className="piano-container">
      {/* Compact Piano Controls */}
      <div className="piano-toolbar">
        <div className="piano-toolbar-group gap-2">
          <div className="octave-selector">
            <span className="control-label">Transponer:</span>
            <button
              className="btn-icon"
              onClick={() => onBaseOctaveChange(Math.max(1, baseOctave - 1))}
              disabled={baseOctave <= 1}
              title="Disminuir octava (-1)"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="octave-value">
              Octava: <strong>{baseOctave}</strong>
            </span>

            <button
              className="btn-icon"
              onClick={() => onBaseOctaveChange(Math.min(6, baseOctave + 1))}
              disabled={baseOctave >= 6}
              title="Aumentar octava (+1)"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Volume Control Slider */}
          <div className="volume-control-box" title="Ajustar volumen del piano">
            <button
              className="btn-icon"
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
              title={volume > 0 ? 'Silenciar' : 'Activar sonido'}
            >
              {volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="volume-slider"
            />
            <span className="volume-display">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        <button className="btn btn-secondary btn-small" onClick={onResetAllKeys} title="Restablecer teclas">
          <RotateCcw size={14} /> Restablecer
        </button>
      </div>

      {/* Keyboard Bed */}
      {isMobile ? (
        /* Mobile 2-Step Stacked Layout */
        <div className="piano-keyboard-steps">
          {Array.from({ length: octaveCount }, (_, octaveIndex) => {
            const stepStartRelIdx = octaveIndex * 12;
            const stepSemitones = Array.from({ length: 12 }, (_, i) => stepStartRelIdx + i);

            let stepWhiteCount = 0;
            const stepSemitoneWhiteIndexMap: Record<number, number> = {};
            stepSemitones.forEach((idx) => {
              const isBlack = IS_BLACK_KEY[idx % 12];
              if (isBlack) {
                stepSemitoneWhiteIndexMap[idx] = stepWhiteCount - 1;
              } else {
                stepSemitoneWhiteIndexMap[idx] = stepWhiteCount;
                stepWhiteCount++;
              }
            });

            const stepWhiteKeyWidthPercent = 100 / 7;
            const stepBlackKeyWidthPercent = stepWhiteKeyWidthPercent * 0.58;

            const stepWhiteKeys = stepSemitones.filter((i) => !IS_BLACK_KEY[i % 12]);
            const stepBlackKeys = stepSemitones.filter((i) => IS_BLACK_KEY[i % 12]);

            return (
              <div key={`step-${octaveIndex}`} className="piano-keyboard step-keyboard">
                {stepWhiteKeys.map((relativeIndex) => {
                  const whiteIdx = stepSemitoneWhiteIndexMap[relativeIndex];
                  const leftPercent = whiteIdx * stepWhiteKeyWidthPercent;
                  return renderPianoKey(relativeIndex, leftPercent, stepWhiteKeyWidthPercent, false);
                })}
                {stepBlackKeys.map((relativeIndex) => {
                  const leftWhiteIdx = stepSemitoneWhiteIndexMap[relativeIndex];
                  const leftPercent =
                    (leftWhiteIdx + 1) * stepWhiteKeyWidthPercent - stepBlackKeyWidthPercent / 2;
                  return renderPianoKey(relativeIndex, leftPercent, stepBlackKeyWidthPercent, true);
                })}
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop 1-Row Layout */
        <div className="piano-keyboard">
          {desktopWhiteKeys.map((relativeIndex) => {
            const whiteIdx = desktopSemitoneWhiteIndexMap[relativeIndex];
            const leftPercent = whiteIdx * desktopWhiteKeyWidthPercent;
            return renderPianoKey(relativeIndex, leftPercent, desktopWhiteKeyWidthPercent, false);
          })}
          {desktopBlackKeys.map((relativeIndex) => {
            const leftWhiteIdx = desktopSemitoneWhiteIndexMap[relativeIndex];
            const leftPercent =
              (leftWhiteIdx + 1) * desktopWhiteKeyWidthPercent - desktopBlackKeyWidthPercent / 2;
            return renderPianoKey(relativeIndex, leftPercent, desktopBlackKeyWidthPercent, true);
          })}
        </div>
      )}
    </div>
  );
};

