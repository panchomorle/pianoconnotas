import React, { useEffect } from 'react';
import { ShieldCheck, X, ServerOff, FileCheck } from 'lucide-react';

interface TermsModalProps {
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ onClose }) => {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content legal-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="Cerrar">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-icon accent-blue-icon">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h3 className="modal-title">Términos y Condiciones</h3>
            <p className="modal-subtitle">Información legal y privacidad del servicio</p>
          </div>
        </div>

        <div className="modal-body modal-scrollable-body">
          <div className="legal-notice-box">
            <div className="legal-highlight-item">
              <ServerOff size={22} className="icon-gold" />
              <div>
                <strong>Privacidad Local (Sin Servidores)</strong>
                <p>
                  <strong>NO almacenamos tus partituras en nuestros servidores.</strong> Todos los archivos PDF y las
                  configuraciones creadas se guardan exclusivamente de forma local y privada en la memoria de tu
                  navegador (IndexedDB).
                </p>
              </div>
            </div>

            <div className="legal-highlight-item">
              <FileCheck size={22} className="icon-blue" />
              <div>
                <strong>Uso y Propiedad Intelectual</strong>
                <p>
                  El usuario es el único responsable del material y partituras en formato PDF que decida cargar en la
                  aplicación, garantizando que cuenta con los derechos o licencias requeridas para su uso personal o
                  educativo.
                </p>
              </div>
            </div>

            <div className="legal-section">
              <h4>Exención de Responsabilidad</h4>
              <p>
                La aplicación Piano con Notas se proporciona "tal cual" y "según disponibilidad", sin garantías de ningún
                tipo, explícitas o implícitas. Los desarrolladores no asumen responsabilidad alguna por pérdidas de datos,
                fallos del navegador o uso indebido de la plataforma por parte de los usuarios.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Entendido y Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
