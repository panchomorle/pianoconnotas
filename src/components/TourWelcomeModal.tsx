import React, { useEffect } from 'react';
import { X, ShieldCheck, ExternalLink, Compass } from 'lucide-react';

interface TourWelcomeModalProps {
  onClose: () => void;
  onStartTour: () => void;
  onOpenTerms: () => void;
}

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const TourWelcomeModal: React.FC<TourWelcomeModalProps> = ({
  onClose,
  onStartTour,
  onOpenTerms,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" data-nosnippet onClick={onClose}>
      <div className="modal-content tour-welcome-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="Cerrar">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-icon accent-blue-icon">
            <Compass size={28} />
          </div>
          <div>
            <h3 className="modal-title">¡Bienvenido a Piano con Notas!</h3>
            <p className="modal-subtitle">Tu asistente para la lectura musical y práctica en teclado</p>
          </div>
        </div>

        <div className="modal-body tour-welcome-body">
          <p className="welcome-intro">
            Esta aplicación te permite practicar piano, interpretar partituras en tiempo real y adaptar la lectura con el pentagrama dinámico.
          </p>

          {/* Embedded Developer GitHub Card */}
          <div className="contact-card welcome-dev-card" data-nosnippet>
            <div className="developer-info">
              <GithubIcon size={36} className="github-avatar-icon" />
              <div>
                <h4 className="dev-name">Juan Pablo</h4>
                <p className="dev-handle">@panchomorle</p>
              </div>
            </div>

            <p className="contact-description">
              Proyecto creado para facilitar el aprendizaje del piano y la teoría musical.
            </p>

            <a
              href="https://github.com/panchomorle"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link-btn"
            >
              <GithubIcon size={16} />
              <span>Visitar GitHub (github.com/panchomorle)</span>
              <ExternalLink size={13} />
            </a>
          </div>

          {/* Quick Access to Terms */}
          <div className="welcome-terms-shortcut">
            <button className="btn-terms-shortcut" onClick={onOpenTerms}>
              <ShieldCheck size={16} />
              <span>Consultar Términos y Condiciones</span>
            </button>
          </div>
        </div>

        <div className="modal-footer tour-welcome-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Omitir por ahora
          </button>
          <button className="btn btn-primary btn-start-tour" onClick={onStartTour}>
            <Compass size={16} />
            <span>Iniciar recorrido</span>
          </button>
        </div>
      </div>
    </div>
  );
};
