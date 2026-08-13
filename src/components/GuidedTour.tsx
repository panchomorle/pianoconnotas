import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, X, AlertTriangle } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  description: React.ReactNode;
  isCritical?: boolean;
  desktopOnly?: boolean;
  actionBefore?: () => void;
}

interface GuidedTourProps {
  isActive: boolean;
  onFinish: () => void;
  isMobile: boolean;
  onCloseDrawer: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isActive,
  onFinish,
  isMobile,
  onCloseDrawer,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Reset step index to 0 whenever the tour is activated
  useEffect(() => {
    if (isActive) {
      setCurrentStepIndex(0);
    }
  }, [isActive]);

  // Define steps
  const allSteps: TourStep[] = [
    {
      target: 'hamburger-btn',
      title: 'Menú Principal',
      description: (
        <span>
          Podés:
          <ul className="tour-step-description">
            <li>Crear una <strong>Nueva partitura</strong> (pestaña limpia de trabajo)</li>
            <li>Administrar tus partituras cargadas</li>
          </ul>
        </span>
      ),
      actionBefore: () => {
        onCloseDrawer();
      },
    },
    {
      target: 'mic-toggle',
      title: 'Reconocimiento por Micrófono',
      description: (
        <span>
          Activa el micrófono para cantar o tocar un instrumento y <strong>reconocer notas en tiempo real</strong>. Las notas identificadas se mostrarán automáticamente en el pentagrama e iluminarán las teclas del piano.
        </span>
      ),
      actionBefore: () => {
        onCloseDrawer();
      },
    },
    {
      target: 'theme-toggle',
      title: 'Modo Claro / Oscuro',
      description: (
        <span>
          Alterna fácilmente entre el <strong>Modo Claro</strong> y <strong>Modo Oscuro</strong> para adaptar la interfaz según la iluminación de tu entorno.
        </span>
      ),
      actionBefore: () => {
        onCloseDrawer();
      },
    },
    {
      target: 'staff-panel',
      title: 'Pentagrama, Clave y Armadura',
      isCritical: true,
      description: (
        <div className="tour-critical-box">
          <div className="critical-header">
            <AlertTriangle size={18} className="critical-icon" />
            <strong>¡Ajuste Importante!</strong>
          </div>
          <p>
            Si no ajustas correctamente la <strong>Clave</strong> y la <strong>Armadura</strong> (tonalidad), las notas mostradas en el pentagrama <strong>no coincidirán con la partitura</strong> que estés estudiando.
          </p>
        </div>
      ),
      actionBefore: () => {
        onCloseDrawer();
      },
    },
    {
      target: 'octave-selector',
      title: 'Transposición de Octava',
      description: (
        <span>
          Usa los botones <strong>- / +</strong> para cambiar la octava base (<strong>Transponer</strong>) y desplazarte por registros graves o agudos según la pieza.
        </span>
      ),
      actionBefore: () => {
        onCloseDrawer();
      },
    },
    {
      target: 'volume-control',
      title: 'Control de Volumen',
      description: (
        <span>
          Desliza la barra para ajustar la intensidad del sonido o presiona el altavoz para <strong>silenciar / activar</strong> el audio del piano.
        </span>
      ),
      actionBefore: () => {
        onCloseDrawer();
      },
    },
    {
      target: 'piano-keys',
      title: 'Reasignación de Teclas Físicas',
      desktopOnly: true,
      description: (
        <span>
          Haz <strong>clic derecho</strong> sobre cualquier tecla del piano para asignar la tecla de tu teclado físico que prefieras. Usa <strong>Restablecer</strong> para volver a los controles por defecto.
        </span>
      ),
      actionBefore: () => {
        onCloseDrawer();
      },
    },
  ];

  // Filter steps according to mobile / desktop viewport
  const steps = allSteps.filter((step) => !step.desktopOnly || !isMobile);

  const currentStep = steps[currentStepIndex];

  const updateRect = useCallback(() => {
    if (!currentStep || !isActive) return;

    if (currentStep.actionBefore) {
      currentStep.actionBefore();
    }

    const isHeaderStep =
      currentStep.target === 'hamburger-btn' ||
      currentStep.target === 'theme-toggle' ||
      currentStep.target === 'mic-toggle';

    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
      if (el) {
        // Header items scroll to start; body/lower items scroll to end so target is in middle/lower section
        el.scrollIntoView({
          behavior: 'smooth',
          block: isHeaderStep ? 'start' : 'end',
          inline: 'nearest',
        });

        setTimeout(() => {
          setTargetRect(el.getBoundingClientRect());
        }, 120);
      } else {
        setTargetRect(null);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentStep, isActive]);

  useLayoutEffect(() => {
    updateRect();
  }, [currentStepIndex, isActive, updateRect]);

  useEffect(() => {
    if (!isActive) return;

    const handleResizeOrScroll = () => {
      if (!currentStep) return;
      const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [currentStep, isActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Escape') {
        onFinish();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStepIndex, steps.length]);

  if (!isActive || !currentStep) return null;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const isHeaderStep =
    currentStep.target === 'hamburger-btn' ||
    currentStep.target === 'theme-toggle' ||
    currentStep.target === 'mic-toggle';

  // Position calculation: Header steps render card below header; all body/lower steps render card in upper area (top: 56px)
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        position: 'fixed',
        top: '56px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10001,
      };
    }

    const margin = 12;
    const viewWidth = window.innerWidth;
    const cardWidth = Math.min(340, viewWidth - 24);

    let top: number;
    let left: number;

    if (isHeaderStep) {
      top = targetRect.bottom + margin;
      left = Math.max(
        12,
        Math.min(viewWidth - cardWidth - 12, targetRect.left + targetRect.width / 2 - cardWidth / 2)
      );
    } else {
      // Body & lower steps render card in top area below header (top: 56px)
      top = 56;
      left = Math.max(12, (viewWidth - cardWidth) / 2);
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      zIndex: 10001,
    };
  };

  return (
    <div className="tour-root">
      {/* Backdrop */}
      <div className="tour-backdrop" onClick={onFinish} />

      {/* Spotlight highlight over targeted element */}
      {targetRect && (
        <div
          className={`tour-spotlight ${currentStep.isCritical ? 'spotlight-critical' : ''}`}
          style={{
            top: `${targetRect.top - 4}px`,
            left: `${targetRect.left - 4}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
          }}
        />
      )}

      {/* Floating Tooltip Box */}
      <div className="tour-tooltip-card" style={getTooltipStyle()}>
        <div className="tour-tooltip-header">
          <span className="tour-step-badge">
            Paso {currentStepIndex + 1} de {steps.length}
          </span>
          <button className="tour-skip-btn" onClick={onFinish} title="Saltar tour">
            <X size={16} />
          </button>
        </div>

        <h4 className="tour-step-title">{currentStep.title}</h4>

        <div className="tour-step-description">{currentStep.description}</div>

        <div className="tour-tooltip-footer">
          <button
            className="btn btn-small btn-secondary"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft size={14} /> Anterior
          </button>

          <button className="btn btn-small btn-primary" onClick={handleNext}>
            {currentStepIndex === steps.length - 1 ? (
              <>
                Finalizar <Check size={14} />
              </>
            ) : (
              <>
                Siguiente <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
