import type { NoteInfo, ClefType } from '../types';
import { KEY_SIGNATURES, getStaffDiatonicOffset, getNoteSpellingInKeySignature } from '../utils/musicTheory';

interface StaffViewerProps {
  lastNote: NoteInfo | null;
  clef: ClefType;
  onClefChange: (clef: ClefType) => void;
  keySigId: string;
  onKeySigChange: (keySigId: string) => void;
}

export const StaffViewer: React.FC<StaffViewerProps> = ({
  lastNote,
  clef,
  onClefChange,
  keySigId,
  onKeySigChange,
}) => {
  const currentKeySig = KEY_SIGNATURES.find((k) => k.id === keySigId) || KEY_SIGNATURES[0];

  const noteSpelling = lastNote ? getNoteSpellingInKeySignature(lastNote.midi, currentKeySig) : null;
  const diatonicOffset = lastNote ? getStaffDiatonicOffset(lastNote.midi, clef, currentKeySig) : null;

  const svgWidth = 290;
  const svgHeight = 135;
  const lineSpacing = 11;
  const staffBottomY = 92;

  const getNoteY = (offset: number) => {
    return staffBottomY - offset * (lineSpacing / 2);
  };

  const ledgerLines: number[] = [];
  if (diatonicOffset !== null) {
    if (diatonicOffset < 0) {
      for (let line = -2; line >= diatonicOffset; line -= 2) {
        ledgerLines.push(getNoteY(line));
      }
    } else if (diatonicOffset > 8) {
      for (let line = 10; line <= diatonicOffset; line += 2) {
        ledgerLines.push(getNoteY(line));
      }
    }
  }

  return (
    <div className="staff-panel">
      <div className="staff-controls-inline">
        <div className="select-group">
          <label htmlFor="clef-select">Clave:</label>
          <select
            id="clef-select"
            value={clef}
            onChange={(e) => onClefChange(e.target.value as ClefType)}
            className="custom-select"
          >
            <option value="treble">Sol (Treble)</option>
            <option value="treble8vb">Sol 8ª baja (Ottava Bassa)</option>
            <option value="bass">Fa (Bass)</option>
            <option value="bass8vb">Fa 8ª baja</option>
            <option value="alto">Do en 3ª (Alto)</option>
            <option value="tenor">Do en 4ª (Tenor)</option>
          </select>
        </div>

        <div className="select-group">
          <label htmlFor="keysig-select">Armadura:</label>
          <select
            id="keysig-select"
            value={keySigId}
            onChange={(e) => onKeySigChange(e.target.value)}
            className="custom-select"
          >
            {KEY_SIGNATURES.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Canvas SVG */}
      <div className="staff-display-area">
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="staff-svg">
          {[0, 1, 2, 3, 4].map((lineIndex) => {
            const y = staffBottomY - lineIndex * lineSpacing;
            return <line key={lineIndex} x1="15" y1={y} x2={svgWidth - 15} y2={y} className="staff-line" />;
          })}

          <line x1="15" y1={staffBottomY - 4 * lineSpacing} x2="15" y2={staffBottomY} className="staff-barline" />

          {/* Clef Glyphs */}
          {clef === 'treble' && (
            <text x="25" y={staffBottomY - 0.5 * lineSpacing} className="clef-glyph treble-clef">
              🎼
            </text>
          )}

          {clef === 'treble8vb' && (
            <g className="clef-8vb-group">
              <text x="25" y={staffBottomY - 0.5 * lineSpacing} className="clef-glyph treble-clef">
                🎼
              </text>
              <text x="32" y={staffBottomY + 12} className="clef-8-tag">
                8
              </text>
            </g>
          )}

          {clef === 'bass' && (
            <text x="25" y={staffBottomY - 1.8 * lineSpacing} className="clef-glyph bass-clef">
              𝄢
            </text>
          )}

          {clef === 'bass8vb' && (
            <g className="clef-8vb-group">
              <text x="25" y={staffBottomY - 1.8 * lineSpacing} className="clef-glyph bass-clef">
                𝄢
              </text>
              <text x="29" y={staffBottomY + 12} className="clef-8-tag">
                8
              </text>
            </g>
          )}

          {clef === 'alto' && (
            <text x="25" y={staffBottomY - 1.8 * lineSpacing} className="clef-glyph alto-clef">
              𝄡
            </text>
          )}

          {clef === 'tenor' && (
            <text x="25" y={staffBottomY - 2.8 * lineSpacing} className="clef-glyph tenor-clef">
              𝄡
            </text>
          )}

          {/* Key Signature Accidentals */}
          {currentKeySig.sharps.map((_, idx) => (
            <text key={`sharp-${idx}`} x={65 + idx * 10} y={staffBottomY - ((idx % 4) + 1.5) * lineSpacing} className="key-accidental">
              ♯
            </text>
          ))}
          {currentKeySig.flats.map((_, idx) => (
            <text key={`flat-${idx}`} x={65 + idx * 10} y={staffBottomY - ((idx % 4) + 1) * lineSpacing} className="key-accidental">
              ♭
            </text>
          ))}

          {/* Ledger Lines */}
          {ledgerLines.map((ly, idx) => (
            <line key={`ledger-${idx}`} x1="170" y1={ly} x2="210" y2={ly} className="staff-ledger-line" />
          ))}

          {/* Active Note Head & Stem */}
          {lastNote && noteSpelling && diatonicOffset !== null && (
            <g className="note-group">
              {noteSpelling.accidental && (
                <text x="165" y={getNoteY(diatonicOffset) + 5} className="note-accidental">
                  {noteSpelling.accidental}
                </text>
              )}

              <ellipse
                cx="190"
                cy={getNoteY(diatonicOffset)}
                rx="6.5"
                ry="5"
                transform={`rotate(-20 190 ${getNoteY(diatonicOffset)})`}
                className="note-head"
              />

              <line
                x1={diatonicOffset >= 4 ? 183.5 : 196.5}
                y1={getNoteY(diatonicOffset)}
                x2={diatonicOffset >= 4 ? 183.5 : 196.5}
                y2={diatonicOffset >= 4 ? getNoteY(diatonicOffset) + 30 : getNoteY(diatonicOffset) - 30}
                className="note-stem"
              />
            </g>
          )}
        </svg>

        <div className="staff-note-badge">
          {lastNote && noteSpelling ? (
            <div className="note-active-info">
              <span className="note-span-es">{noteSpelling.displayNameEs}</span>
              <span className="note-span-en">({noteSpelling.displayNameEn})</span>
            </div>
          ) : (
            <span className="note-placeholder">Toca una tecla</span>
          )}
        </div>
      </div>
    </div>
  );
};
