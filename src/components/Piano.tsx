import type { NoteInfo, KeyMapping } from '../types';
import { getMidiNumber, getNoteInfoFromMidi, IS_BLACK_KEY } from '../utils/musicTheory';
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
}) => {
  const totalSemitones = octaveCount * 12;
  const semitones = Array.from({ length: totalSemitones }, (_, i) => i);

  let whiteCount = 0;
  const semitoneWhiteIndexMap: number[] = [];
  semitones.forEach((i) => {
    const isBlack = IS_BLACK_KEY[i % 12];
    if (isBlack) {
      semitoneWhiteIndexMap.push(whiteCount - 1);
    } else {
      semitoneWhiteIndexMap.push(whiteCount);
      whiteCount++;
    }
  });

  const totalWhiteKeys = whiteCount;
  const whiteKeyWidthPercent = 100 / totalWhiteKeys;
  const blackKeyWidthPercent = whiteKeyWidthPercent * 0.58;

  const whiteKeys = semitones.filter((i) => !IS_BLACK_KEY[i % 12]);
  const blackKeys = semitones.filter((i) => IS_BLACK_KEY[i % 12]);

  return (
    <div className="piano-container">
      {/* Compact Piano Controls with Volume Knob */}
      <div className="piano-toolbar">
        <div className="piano-toolbar-group">
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
              Octava: <strong>{baseOctave}</strong> ({octaveCount} octavas)
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

          {/* Interactive Volume Control Knob / Slider */}
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
          <RotateCcw size={14} /> Reajustar Teclas
        </button>
      </div>

      {/* Keyboard Bed */}
      <div className="piano-keyboard">
        {whiteKeys.map((relativeIndex) => {
          const midi = getMidiNumber(baseOctave, relativeIndex);
          const noteInfo = getNoteInfoFromMidi(midi);
          const isActive = activeMidiSet.has(midi);
          const mapping = keyMapping[relativeIndex];
          const keyLabel = mapping ? mapping.key : '';

          const whiteIdx = semitoneWhiteIndexMap[relativeIndex];
          const leftPercent = whiteIdx * whiteKeyWidthPercent;

          return (
            <div
              key={`white-${relativeIndex}`}
              className={`piano-key white-key ${isActive ? 'active' : ''}`}
              style={{ left: `${leftPercent}%`, width: `${whiteKeyWidthPercent}%` }}
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
              onContextMenu={(e) => {
                e.preventDefault();
                onKeyRightClick(relativeIndex, noteInfo);
              }}
              title={`${noteInfo.spanishName} (${noteInfo.name}) - Clic derecho para reasignar`}
            >
              <div className="key-tag-wrapper">
                <span className="key-binding-tag white">{keyLabel}</span>
                <span className="key-note-name">{noteInfo.spanishName}</span>
              </div>
            </div>
          );
        })}

        {blackKeys.map((relativeIndex) => {
          const midi = getMidiNumber(baseOctave, relativeIndex);
          const noteInfo = getNoteInfoFromMidi(midi);
          const isActive = activeMidiSet.has(midi);
          const mapping = keyMapping[relativeIndex];
          const keyLabel = mapping ? mapping.key : '';

          const leftWhiteIdx = semitoneWhiteIndexMap[relativeIndex];
          const leftPercent = (leftWhiteIdx + 1) * whiteKeyWidthPercent - blackKeyWidthPercent / 2;

          return (
            <div
              key={`black-${relativeIndex}`}
              className={`piano-key black-key ${isActive ? 'active' : ''}`}
              style={{ left: `${leftPercent}%`, width: `${blackKeyWidthPercent}%` }}
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
              onContextMenu={(e) => {
                e.preventDefault();
                onKeyRightClick(relativeIndex, noteInfo);
              }}
              title={`${noteInfo.spanishName} (${noteInfo.name}) - Clic derecho para reasignar`}
            >
              <div className="key-tag-wrapper">
                <span className="key-binding-tag black">{keyLabel}</span>
                <span className="key-note-name">{noteInfo.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
