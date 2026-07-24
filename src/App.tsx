import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Piano } from './components/Piano';
import { StaffViewer } from './components/StaffViewer';
import { PdfViewer } from './components/PdfViewer';
import { KeyRebindModal } from './components/KeyRebindModal';
import type { NoteInfo, ClefType, KeyMapping } from './types';
import { audioEngine } from './utils/audio';
import { getMidiNumber, getNoteInfoFromMidi } from './utils/musicTheory';
import { loadSavedKeybindings, saveKeybindings, DEFAULT_KEYMAPPING } from './utils/keybindings';
import { Sun, Moon, GripVertical } from 'lucide-react';

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [baseOctave, setBaseOctave] = useState<number>(4);
  const [volume, setVolume] = useState<number>(0.8);
  const [keyMapping, setKeyMapping] = useState<KeyMapping>(loadSavedKeybindings);
  const [activeMidiSet, setActiveMidiSet] = useState<Set<number>>(new Set());
  const [lastNote, setLastNote] = useState<NoteInfo | null>(null);

  const [clef, setClef] = useState<ClefType>('treble');
  const [keySigId, setKeySigId] = useState<string>('C_maj');

  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Drag Resizable Splitter State
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(310);
  const isDraggingSplitter = useRef<boolean>(false);

  const [octaveCount, setOctaveCount] = useState<number>(() =>
    window.innerWidth >= 1024 ? 3 : 2
  );

  const [rebindTarget, setRebindTarget] = useState<{
    relativeIndex: number;
    noteInfo: NoteInfo;
  } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      setOctaveCount(window.innerWidth >= 1024 ? 3 : 2);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Splitter Dragging Listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter.current) return;
      // Clamp left panel width between 210px and 550px
      const newWidth = Math.max(210, Math.min(550, e.clientX - 24));
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingSplitter.current) {
        isDraggingSplitter.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDragging = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
  };

  const startNote = useCallback(
    (midi: number) => {
      setActiveMidiSet((prev) => {
        const next = new Set(prev);
        next.add(midi);
        return next;
      });

      const info = getNoteInfoFromMidi(midi);
      setLastNote(info);
      audioEngine.playNote(midi);
    },
    []
  );

  const stopNote = useCallback(
    (midi: number) => {
      setActiveMidiSet((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
      audioEngine.stopNote(midi);
    },
    []
  );

  useEffect(() => {
    const pressedCodes = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (rebindTarget || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.repeat || pressedCodes.has(e.code)) return;

      let matchedIndex: number | null = null;
      for (const [relIdxStr, mapping] of Object.entries(keyMapping)) {
        if (mapping.code === e.code || mapping.key.toUpperCase() === e.key.toUpperCase()) {
          matchedIndex = parseInt(relIdxStr, 10);
          break;
        }
      }

      if (matchedIndex !== null && matchedIndex < octaveCount * 12) {
        e.preventDefault();
        pressedCodes.add(e.code);
        const midi = getMidiNumber(baseOctave, matchedIndex);
        startNote(midi);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (rebindTarget) return;

      pressedCodes.delete(e.code);

      let matchedIndex: number | null = null;
      for (const [relIdxStr, mapping] of Object.entries(keyMapping)) {
        if (mapping.code === e.code || mapping.key.toUpperCase() === e.key.toUpperCase()) {
          matchedIndex = parseInt(relIdxStr, 10);
          break;
        }
      }

      if (matchedIndex !== null && matchedIndex < octaveCount * 12) {
        const midi = getMidiNumber(baseOctave, matchedIndex);
        stopNote(midi);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [baseOctave, keyMapping, octaveCount, rebindTarget, startNote, stopNote]);

  const handleRebindKey = (relativeIndex: number, newKeyChar: string, newCode: string) => {
    setKeyMapping((prev) => {
      const updated = {
        ...prev,
        [relativeIndex]: { key: newKeyChar, code: newCode },
      };
      saveKeybindings(updated);
      return updated;
    });
    setRebindTarget(null);
  };

  const handleResetSingleKey = (relativeIndex: number) => {
    if (DEFAULT_KEYMAPPING[relativeIndex]) {
      setKeyMapping((prev) => {
        const updated = {
          ...prev,
          [relativeIndex]: DEFAULT_KEYMAPPING[relativeIndex],
        };
        saveKeybindings(updated);
        return updated;
      });
    }
    setRebindTarget(null);
  };

  const handleResetAllKeys = () => {
    if (window.confirm('¿Restablecer todas las teclas del piano por defecto?')) {
      setKeyMapping(DEFAULT_KEYMAPPING);
      saveKeybindings(DEFAULT_KEYMAPPING);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header Minimal */}
      <header className="app-header-minimal">
        <div className="theme-toggle-container">
          <button
            className="btn-icon theme-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <span className="theme-label">{theme === 'light' ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </div>
      </header>

      {/* Main Workspace Layout with Resizable Columns */}
      <main className="workspace-layout">
        <div className="staff-wrapper" style={{ width: `${leftPanelWidth}px`, flexShrink: 0 }}>
          <StaffViewer
            lastNote={lastNote}
            clef={clef}
            onClefChange={setClef}
            keySigId={keySigId}
            onKeySigChange={setKeySigId}
          />
        </div>

        {/* Resizable Divider Handle */}
        <div className="resize-divider" onMouseDown={startDragging} title="Arrastrar para ajustar ancho">
          <GripVertical size={14} className="drag-handle-icon" />
        </div>

        <div className="pdf-wrapper">
          <PdfViewer pdfFile={pdfFile} onPdfLoaded={setPdfFile} />
        </div>
      </main>

      {/* Piano Section Centered */}
      <section className="piano-section-centered">
        <Piano
          baseOctave={baseOctave}
          onBaseOctaveChange={setBaseOctave}
          keyMapping={keyMapping}
          activeMidiSet={activeMidiSet}
          onNoteStart={startNote}
          onNoteEnd={stopNote}
          onKeyRightClick={(relIdx, info) => setRebindTarget({ relativeIndex: relIdx, noteInfo: info })}
          onResetAllKeys={handleResetAllKeys}
          octaveCount={octaveCount}
          volume={volume}
          onVolumeChange={handleVolumeChange}
        />
      </section>

      {/* Rebind Modal */}
      {rebindTarget && (
        <KeyRebindModal
          noteInfo={rebindTarget.noteInfo}
          relativeIndex={rebindTarget.relativeIndex}
          currentKeyLabel={keyMapping[rebindTarget.relativeIndex]?.key || ''}
          onRebind={handleRebindKey}
          onReset={handleResetSingleKey}
          onClose={() => setRebindTarget(null)}
        />
      )}
    </div>
  );
}

export default App;
