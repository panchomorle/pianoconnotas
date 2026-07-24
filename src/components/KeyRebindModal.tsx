import { useEffect } from 'react';
import type { NoteInfo } from '../types';
import { RotateCcw, X, Keyboard } from 'lucide-react';

interface KeyRebindModalProps {
  noteInfo: NoteInfo;
  relativeIndex: number;
  currentKeyLabel: string;
  onRebind: (relativeIndex: number, newKeyChar: string, newCode: string) => void;
  onReset: (relativeIndex: number) => void;
  onClose: () => void;
}

export const KeyRebindModal: React.FC<KeyRebindModalProps> = ({
  noteInfo,
  relativeIndex,
  currentKeyLabel,
  onRebind,
  onReset,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't bind Escape if intended to close, or allow Escape as close
      if (e.code === 'Escape') {
        onClose();
        return;
      }

      let keyChar = e.key.toUpperCase();
      if (e.code === 'Space') keyChar = 'ESPACIO';
      if (e.key === 'ArrowUp') keyChar = '↑';
      if (e.key === 'ArrowDown') keyChar = '↓';
      if (e.key === 'ArrowLeft') keyChar = '←';
      if (e.key === 'ArrowRight') keyChar = '→';

      onRebind(relativeIndex, keyChar, e.code);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [relativeIndex, onRebind, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="Cerrar">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-icon">
            <Keyboard size={28} />
          </div>
          <div>
            <h3 className="modal-title">Reasignar Tecla</h3>
            <p className="modal-subtitle">
              Nota: <strong className="highlight-text">{noteInfo.spanishName}</strong> ({noteInfo.name})
            </p>
          </div>
        </div>

        <div className="modal-body">
          <div className="key-listening-box">
            <p>Pulsa cualquier tecla en tu teclado físico para asignarla a esta nota</p>
            <div className="current-key-badge">
              Tecla actual: <span className="key-tag">{currentKeyLabel}</span>
            </div>
            <div className="pulse-indicator">
              <span className="pulse-dot"></span> Esperando pulsación de tecla...
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => onReset(relativeIndex)}>
            <RotateCcw size={16} /> Restablecer por defecto
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Cancelar (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
