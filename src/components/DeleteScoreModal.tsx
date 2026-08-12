import React, { useEffect } from 'react';
import type { SavedScore } from '../types';
import { Trash2, X, AlertTriangle, FileText, Calendar, Music } from 'lucide-react';

interface DeleteScoreModalProps {
  score: SavedScore;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteScoreModal: React.FC<DeleteScoreModalProps> = ({
  score,
  isDeleting = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDeleting]);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} a las ${hours}:${minutes}`;
  };

  return (
    <div className="modal-overlay delete-modal-overlay" onClick={() => !isDeleting && onClose()}>
      <div className="modal-content delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close-btn"
          onClick={onClose}
          disabled={isDeleting}
          title="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-icon accent-red-icon">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="modal-title">¿Eliminar partitura reciente?</h3>
            <p className="modal-subtitle">Esta acción borrará la partitura de tus recientes</p>
          </div>
        </div>

        <div className="modal-body delete-modal-body">
          {/* Card detailing the score to be deleted */}
          <div className="delete-score-preview-card">
            <div className="delete-score-icon-badge">
              <FileText size={22} className={score.pdfData ? 'icon-has-pdf' : 'icon-no-pdf'} />
            </div>
            <div className="delete-score-details">
              <h4 className="delete-score-title" title={score.name}>
                {score.name}
              </h4>
              <div className="delete-score-meta">
                <span className="meta-item">
                  <Calendar size={13} />
                  {formatDate(score.updatedAt)}
                </span>
                {score.pdfData && (
                  <span className="meta-item">
                    <Music size={13} />
                    Clave: {score.clef} • Octava {score.baseOctave}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="delete-warning-box">
            <p>
              Se eliminarán los datos guardados de esta partitura, incluyendo la vista del documento y sus configuraciones.
            </p>
            <span className="delete-warning-highlight">⚠️ Esta acción no se puede deshacer.</span>
          </div>
        </div>

        <div className="modal-footer delete-modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            className="btn btn-danger btn-delete-action"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="btn-spinner" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Eliminar partitura
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
