import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface MicToggleButtonProps {
  isActive: boolean;
  onToggle: () => void;
  isInitializing?: boolean;
}

export const MicToggleButton: React.FC<MicToggleButtonProps> = ({
  isActive,
  onToggle,
  isInitializing = false,
}) => {
  return (
    <button
      className={`mic-toggle-btn ${isActive ? 'active' : 'inactive'} ${
        isInitializing ? 'initializing' : ''
      }`}
      onClick={onToggle}
      disabled={isInitializing}
      title={
        isActive
          ? 'Micrófono activo: Cantando se reconocen las notas (Clic para desactivar)'
          : 'Activar micrófono para identificación de notas cantadas'
      }
      aria-label={isActive ? 'Desactivar micrófono' : 'Activar micrófono'}
      data-tour="mic-toggle"
    >
      <div className="mic-icon-wrapper">
        {isActive ? <Mic size={18} className="mic-icon pulse" /> : <MicOff size={18} className="mic-icon" />}
      </div>
      <span className="mic-btn-label">
        {isInitializing ? 'Iniciando...' : isActive ? 'Micrófono ON' : 'Micrófono OFF'}
      </span>
      {isActive && <span className="mic-active-dot" />}
    </button>
  );
};
