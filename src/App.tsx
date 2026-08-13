import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Piano } from './components/Piano';
import { StaffViewer } from './components/StaffViewer';
import { PdfViewer, type PdfViewerState } from './components/PdfViewer';
import { KeyRebindModal } from './components/KeyRebindModal';
import { HamburgerMenu } from './components/HamburgerMenu';
import { TermsModal } from './components/TermsModal';
import { ContactModal } from './components/ContactModal';
import { TourWelcomeModal } from './components/TourWelcomeModal';
import { GuidedTour } from './components/GuidedTour';
import { MicToggleButton } from './components/MicToggleButton';

import type { NoteInfo, ClefType, KeyMapping, SavedScore } from './types';
import { audioEngine } from './utils/audio';
import { getMidiNumber, getNoteInfoFromMidi } from './utils/musicTheory';
import { PitchDetector } from './utils/pitchDetector';
import { loadSavedKeybindings, saveKeybindings, DEFAULT_KEYMAPPING } from './utils/keybindings';
import { saveScore, getMostRecentScore, getScore, getAllScoresOrderedByRecent } from './utils/db';

import { Sun, Moon, GripVertical, Menu, FileText, HelpCircle } from 'lucide-react';

export function App() {

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [baseOctave, setBaseOctave] = useState<number>(4);
  const [volume, setVolume] = useState<number>(0.8);
  const [keyMapping, setKeyMapping] = useState<KeyMapping>(loadSavedKeybindings);
  const [activeMidiSet, setActiveMidiSet] = useState<Set<number>>(new Set());
  const [lastNote, setLastNote] = useState<NoteInfo | null>(null);

  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isMicInitializing, setIsMicInitializing] = useState<boolean>(false);
  const [micDetectedMidi, setMicDetectedMidi] = useState<number | null>(null);
  const pitchDetectorRef = useRef<PitchDetector | null>(null);

  const toggleMicrophone = async () => {
    if (isMicActive) {
      if (pitchDetectorRef.current) {
        pitchDetectorRef.current.stop();
        pitchDetectorRef.current = null;
      }
      setIsMicActive(false);
      setMicDetectedMidi(null);
    } else {
      setIsMicInitializing(true);
      const detector = new PitchDetector({
        onNoteDetected: (noteInfo) => {
          setMicDetectedMidi(noteInfo.midi);
          setLastNote(noteInfo);
        },
        onNoteEnd: () => {
          setMicDetectedMidi(null);
        },
        onError: (err) => {
          console.error('Error de micrófono:', err);
          alert('No se pudo acceder al micrófono. Por favor verifica los permisos del navegador.');
          setIsMicActive(false);
          setIsMicInitializing(false);
        },
      });

      try {
        await detector.start();
        pitchDetectorRef.current = detector;
        setIsMicActive(true);
      } catch {
        // Handled in onError
      } finally {
        setIsMicInitializing(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (pitchDetectorRef.current) {
        pitchDetectorRef.current.stop();
      }
    };
  }, []);

  const combinedActiveMidiSet = useMemo(() => {
    if (micDetectedMidi === null) return activeMidiSet;
    const combined = new Set(activeMidiSet);
    combined.add(micDetectedMidi);
    return combined;
  }, [activeMidiSet, micDetectedMidi]);

  const [clef, setClef] = useState<ClefType>('treble');
  const [keySigId, setKeySigId] = useState<string>('C_maj');

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [activeScoreId, setActiveScoreId] = useState<string | null>(null);
  const [activeScoreName, setActiveScoreName] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<PdfViewerState>({
    zoomPercent: 100,
    scrollSpeed: 2,
    scrollTop: 0,
    scrollLeft: 0,
  });

  // Buffer ref to avoid re-reading PDF on every setting change
  const pdfArrayBufferRef = useRef<ArrayBuffer | null>(null);

  // Hamburger Drawer & Responsive State
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [showTourWelcomeModal, setShowTourWelcomeModal] = useState<boolean>(false);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [refreshRecentsTrigger, setRefreshRecentsTrigger] = useState<number>(0);

  // Auto-show welcome modal on first visit
  useEffect(() => {
    const tourSeen = localStorage.getItem('pianoconnotas_tour_completed');
    if (!tourSeen) {
      setShowTourWelcomeModal(true);
    }
  }, []);

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

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setOctaveCount(window.innerWidth >= 1024 ? 3 : 2);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper to generate unique tab name "Nueva pestaña", "Nueva pestaña (2)", etc.
  const generateNewTabName = async (): Promise<string> => {
    try {
      const all = await getAllScoresOrderedByRecent();
      const untitledNames = all
        .map((s) => s.name)
        .filter((name) => name.startsWith('Nueva pestaña'));

      if (!untitledNames.includes('Nueva pestaña')) {
        return 'Nueva pestaña';
      }

      let count = 2;
      while (untitledNames.includes(`Nueva pestaña (${count})`)) {
        count++;
      }
      return `Nueva pestaña (${count})`;
    } catch (err) {
      console.error('Error generating new tab name:', err);
      return 'Nueva pestaña';
    }
  };

  // Helper to create and activate a new empty tab record in IndexedDB
  const createAndActivateNewTab = async () => {
    const newName = await generateNewTabName();
    const scoreId = `score_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newScore: SavedScore = {
      id: scoreId,
      name: newName,
      pdfData: null,
      clef: 'treble',
      keySigId: 'C_maj',
      baseOctave: 4,
      volume: 0.8,
      zoomPercent: 100,
      scrollSpeed: 2,
      scrollTop: 0,
      scrollLeft: 0,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    try {
      await saveScore(newScore);
    } catch (err) {
      console.error('Error creating new score tab:', err);
    }

    pdfArrayBufferRef.current = null;
    setPdfFile(null);
    setActiveScoreId(scoreId);
    setActiveScoreName(newName);
    setClef('treble');
    setKeySigId('C_maj');
    setBaseOctave(4);
    setVolume(0.8);
    audioEngine.setVolume(0.8);
    setViewerState({
      zoomPercent: 100,
      scrollSpeed: 2,
      scrollTop: 0,
      scrollLeft: 0,
    });

    setRefreshRecentsTrigger((prev) => prev + 1);
  };

  // Restore most recent score & settings from IndexedDB on initial mount
  useEffect(() => {
    async function restoreLastState() {
      try {
        const lastScore = await getMostRecentScore();
        if (lastScore) {
          setActiveScoreId(lastScore.id);
          setActiveScoreName(lastScore.name);
          setClef(lastScore.clef);
          setKeySigId(lastScore.keySigId);
          setBaseOctave(lastScore.baseOctave);
          setVolume(lastScore.volume);
          audioEngine.setVolume(lastScore.volume);
          setViewerState({
            zoomPercent: lastScore.zoomPercent ?? 100,
            scrollSpeed: lastScore.scrollSpeed ?? 2,
            scrollTop: lastScore.scrollTop ?? 0,
            scrollLeft: lastScore.scrollLeft ?? 0,
          });

          if (lastScore.pdfData) {
            pdfArrayBufferRef.current = lastScore.pdfData;
            const restoredFile = new File([lastScore.pdfData], lastScore.name, {
              type: 'application/pdf',
            });
            setPdfFile(restoredFile);
          } else {
            pdfArrayBufferRef.current = null;
            setPdfFile(null);
          }
        } else {
          // If no tabs exist, create initial "Nueva pestaña"
          await createAndActivateNewTab();
        }
      } catch (err) {
        console.error('Error restoring score from IndexedDB:', err);
      }
    }
    restoreLastState();
  }, []);

  // Splitter Dragging Listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter.current) return;
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

  // Auto-sync active score settings to IndexedDB
  const syncScoreSettingsToDB = useCallback(
    async (
      updatedClef = clef,
      updatedKeySigId = keySigId,
      updatedBaseOctave = baseOctave,
      updatedVolume = volume
    ) => {
      if (!activeScoreId || !activeScoreName) return;

      try {
        const existingScore = await getScore(activeScoreId);
        const scoreToSave: SavedScore = {
          id: activeScoreId,
          name: activeScoreName,
          pdfData: pdfArrayBufferRef.current,
          clef: updatedClef,
          keySigId: updatedKeySigId,
          baseOctave: updatedBaseOctave,
          volume: updatedVolume,
          zoomPercent: viewerState.zoomPercent,
          scrollSpeed: viewerState.scrollSpeed,
          scrollTop: viewerState.scrollTop,
          scrollLeft: viewerState.scrollLeft,
          updatedAt: Date.now(),
          createdAt: existingScore ? existingScore.createdAt : Date.now(),
        };
        await saveScore(scoreToSave);
        setRefreshRecentsTrigger((prev) => prev + 1);
      } catch (err) {
        console.error('Error saving score update to IndexedDB:', err);
      }
    },
    [activeScoreId, activeScoreName, clef, keySigId, baseOctave, volume, viewerState]
  );

  const handleViewerStateChange = useCallback(
    async (newState: PdfViewerState) => {
      setViewerState(newState);

      if (!activeScoreId || !activeScoreName) return;
      try {
        const existingScore = await getScore(activeScoreId);
        if (existingScore) {
          const updated: SavedScore = {
            ...existingScore,
            zoomPercent: newState.zoomPercent ?? existingScore.zoomPercent ?? 100,
            scrollSpeed: newState.scrollSpeed ?? existingScore.scrollSpeed ?? 2,
            scrollTop: newState.scrollTop ?? existingScore.scrollTop ?? 0,
            scrollLeft: newState.scrollLeft ?? existingScore.scrollLeft ?? 0,
            updatedAt: Date.now(),
          };
          await saveScore(updated);
          setRefreshRecentsTrigger((prev) => prev + 1);
        }
      } catch (err) {
        console.error('Error saving viewer state to IndexedDB:', err);
      }
    },
    [activeScoreId, activeScoreName]
  );

  const handleClefChange = (newClef: ClefType) => {
    setClef(newClef);
    syncScoreSettingsToDB(newClef, keySigId, baseOctave, volume);
  };

  const handleKeySigChange = (newKeySigId: string) => {
    setKeySigId(newKeySigId);
    syncScoreSettingsToDB(clef, newKeySigId, baseOctave, volume);
  };

  const handleBaseOctaveChange = (newOctave: number) => {
    setBaseOctave(newOctave);
    syncScoreSettingsToDB(clef, keySigId, newOctave, volume);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
    syncScoreSettingsToDB(clef, keySigId, baseOctave, newVol);
  };

  // Called when a PDF is uploaded or removed from PdfViewer
  const handlePdfLoaded = async (file: File | null) => {
    setPdfFile(file);

    if (!file) {
      // User clicked "Quitar PDF" in active tab
      pdfArrayBufferRef.current = null;
      if (activeScoreId && activeScoreName) {
        try {
          const existingScore = await getScore(activeScoreId);
          if (existingScore) {
            const updated: SavedScore = {
              ...existingScore,
              pdfData: null,
              updatedAt: Date.now(),
            };
            await saveScore(updated);
            setRefreshRecentsTrigger((prev) => prev + 1);
          }
        } catch (err) {
          console.error('Error updating score on PDF removal:', err);
        }
      }
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      pdfArrayBufferRef.current = buffer;

      let scoreId = activeScoreId;
      if (!scoreId) {
        scoreId = `score_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      }

      const existingScore = await getScore(scoreId);
      const scoreRecord: SavedScore = {
        id: scoreId,
        name: file.name,
        pdfData: buffer,
        clef: existingScore ? existingScore.clef : clef,
        keySigId: existingScore ? existingScore.keySigId : keySigId,
        baseOctave: existingScore ? existingScore.baseOctave : baseOctave,
        volume: existingScore ? existingScore.volume : volume,
        zoomPercent: viewerState.zoomPercent,
        scrollSpeed: viewerState.scrollSpeed,
        scrollTop: viewerState.scrollTop,
        scrollLeft: viewerState.scrollLeft,
        updatedAt: Date.now(),
        createdAt: existingScore ? existingScore.createdAt : Date.now(),
      };

      await saveScore(scoreRecord);
      setActiveScoreId(scoreId);
      setActiveScoreName(file.name);
      setRefreshRecentsTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Error saving uploaded PDF to IndexedDB:', err);
    }
  };

  // Action: "Nueva partitura"
  const handleNewScore = async () => {
    await createAndActivateNewTab();
    if (isMobile) {
      setIsMenuOpen(false);
    }
  };

  // Action: Select score from Recientes list
  const handleSelectScore = async (score: SavedScore) => {
    const updatedScore: SavedScore = {
      ...score,
      updatedAt: Date.now(),
    };

    try {
      await saveScore(updatedScore);
    } catch (err) {
      console.error('Error updating score recent timestamp:', err);
    }

    setActiveScoreId(updatedScore.id);
    setActiveScoreName(updatedScore.name);

    if (updatedScore.pdfData) {
      pdfArrayBufferRef.current = updatedScore.pdfData;
      const file = new File([updatedScore.pdfData], updatedScore.name, { type: 'application/pdf' });
      setPdfFile(file);
    } else {
      pdfArrayBufferRef.current = null;
      setPdfFile(null);
    }

    setClef(updatedScore.clef);
    setKeySigId(updatedScore.keySigId);
    setBaseOctave(updatedScore.baseOctave);
    setVolume(updatedScore.volume);
    audioEngine.setVolume(updatedScore.volume);
    setViewerState({
      zoomPercent: updatedScore.zoomPercent ?? 100,
      scrollSpeed: updatedScore.scrollSpeed ?? 2,
      scrollTop: updatedScore.scrollTop ?? 0,
      scrollLeft: updatedScore.scrollLeft ?? 0,
    });

    setRefreshRecentsTrigger((prev) => prev + 1);

    if (isMobile) {
      setIsMenuOpen(false);
    }
  };

  // Action: Delete score from Recientes list
  const handleDeleteScore = useCallback(
    async (deletedId: string) => {
      if (activeScoreId === deletedId) {
        // If deleted active tab, switch to next most recent or create a new tab
        const mostRecent = await getMostRecentScore();
        if (mostRecent) {
          await handleSelectScore(mostRecent);
        } else {
          await createAndActivateNewTab();
        }
      } else {
        setRefreshRecentsTrigger((prev) => prev + 1);
      }
    },
    [activeScoreId]
  );

  const startNote = useCallback((midi: number) => {
    setActiveMidiSet((prev) => {
      const next = new Set(prev);
      next.add(midi);
      return next;
    });

    const info = getNoteInfoFromMidi(midi);
    setLastNote(info);
    audioEngine.playNote(midi);
  }, []);

  const stopNote = useCallback((midi: number) => {
    setActiveMidiSet((prev) => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
    audioEngine.stopNote(midi);
  }, []);

  useEffect(() => {
    const pressedCodes = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        rebindTarget ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        showTermsModal ||
        showContactModal
      ) {
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
      if (rebindTarget || showTermsModal || showContactModal) return;

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
  }, [
    baseOctave,
    keyMapping,
    octaveCount,
    rebindTarget,
    showTermsModal,
    showContactModal,
    startNote,
    stopNote,
  ]);

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
    <div className="app-layout-wrapper">
      {/* Hamburger Menu Sidebar / Overlay */}
      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeScoreId={activeScoreId}
        onNewScore={handleNewScore}
        onSelectScore={handleSelectScore}
        onDeleteScore={handleDeleteScore}
        onOpenTerms={() => setShowTermsModal(true)}
        onOpenContact={() => setShowContactModal(true)}
        refreshTrigger={refreshRecentsTrigger}
      />

      {/* App Main Content Area */}
      <div className="app-main-content">
        {/* Top Header */}
        <header className="app-header-minimal">
          <div className="header-left-group">
            <button
              className="hamburger-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title={isMenuOpen ? 'Ocultar menú' : 'Mostrar menú'}
              data-tour="hamburger-btn"
            >
              <Menu size={18} />
            </button>

            <button
              className="btn-icon tour-trigger-btn"
              onClick={() => setShowTourWelcomeModal(true)}
              title="Guía y Tour"
              data-tour="tour-btn"
            >
              <HelpCircle size={16} />
            </button>

            <div className="app-brand">
              <img src="/favicon.svg" alt="Piano con Notas" className="brand-logo-img" />
              <h1 className="app-brand-title">Piano con Notas</h1>
            </div>

            {activeScoreName && (
              <div className="active-score-badge" title={activeScoreName}>
                <FileText size={13} />
                <span className="active-score-name">{activeScoreName}</span>
              </div>
            )}
          </div>

          <div className="header-center-group">
            <MicToggleButton
              isActive={isMicActive}
              onToggle={toggleMicrophone}
              isInitializing={isMicInitializing}
            />
          </div>

          <div className="theme-toggle-container" data-tour="theme-toggle">
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
          <div
            className="staff-wrapper"
            style={!isMobile ? { width: `${leftPanelWidth}px`, flexShrink: 0 } : { width: '100%' }}
          >
            <StaffViewer
              lastNote={lastNote}
              clef={clef}
              onClefChange={handleClefChange}
              keySigId={keySigId}
              onKeySigChange={handleKeySigChange}
            />
          </div>

          {/* Resizable Divider Handle */}
          <div className="resize-divider" onMouseDown={startDragging} title="Arrastrar para ajustar ancho">
            <GripVertical size={14} className="drag-handle-icon" />
          </div>

          <div className="pdf-wrapper">
            <PdfViewer
              pdfFile={pdfFile}
              onPdfLoaded={handlePdfLoaded}
              viewerState={viewerState}
              onViewerStateChange={handleViewerStateChange}
            />
          </div>
        </main>

        {/* Piano Section Centered */}
        <section className="piano-section-centered">
          <Piano
            baseOctave={baseOctave}
            onBaseOctaveChange={handleBaseOctaveChange}
            keyMapping={keyMapping}
            activeMidiSet={combinedActiveMidiSet}
            onNoteStart={startNote}
            onNoteEnd={stopNote}
            onKeyRightClick={(relIdx, info) => setRebindTarget({ relativeIndex: relIdx, noteInfo: info })}
            onResetAllKeys={handleResetAllKeys}
            octaveCount={octaveCount}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            keySigId={keySigId}
          />
        </section>
      </div>

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

      {/* Legal Terms Modal */}
      {showTermsModal && <TermsModal onClose={() => setShowTermsModal(false)} />}

      {/* Developer Contact Modal */}
      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} />}

      {/* Tour Welcome Modal */}
      {showTourWelcomeModal && (
        <TourWelcomeModal
          onClose={() => setShowTourWelcomeModal(false)}
          onStartTour={() => {
            setShowTourWelcomeModal(false);
            setIsTourActive(true);
          }}
          onOpenTerms={() => {
            setShowTourWelcomeModal(false);
            setShowTermsModal(true);
          }}
        />
      )}

      {/* Guided Tour Overlay Component */}
      <GuidedTour
        isActive={isTourActive}
        onFinish={() => {
          setIsTourActive(false);
          localStorage.setItem('pianoconnotas_tour_completed', 'true');
        }}
        isMobile={isMobile}
        onCloseDrawer={() => {
          if (isMobile) setIsMenuOpen(false);
        }}
      />
    </div>
  );
}

export default App;
