import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import type { SavedScore } from '../types';
import { getRecentScoresPaged, deleteScore } from '../utils/db';
import { PlusCircle, FileText, Trash2, PanelLeftClose, ShieldCheck, Clock } from 'lucide-react';

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
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

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeScoreId: string | null;
  onNewScore: () => void;
  onSelectScore: (score: SavedScore) => void;
  onDeleteScore: (id: string) => void;
  onOpenTerms: () => void;
  onOpenContact: () => void;
  refreshTrigger?: number;
}

const PAGE_SIZE = 6;

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClose,
  activeScoreId,
  onNewScore,
  onSelectScore,
  onDeleteScore,
  onOpenTerms,
  onOpenContact,
  refreshTrigger = 0,
}) => {
  const [scores, setScores] = useState<SavedScore[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevPositionsRef = useRef<Map<string, number>>(new Map());

  // FLIP animation for smooth list reordering transitions
  useLayoutEffect(() => {
    const newPositions = new Map<string, number>();

    itemsRef.current.forEach((el, id) => {
      if (el) {
        newPositions.set(id, el.getBoundingClientRect().top);
      }
    });

    prevPositionsRef.current.forEach((oldTop, id) => {
      const el = itemsRef.current.get(id);
      if (el) {
        const newTop = el.getBoundingClientRect().top;
        const dy = oldTop - newTop;
        if (dy !== 0) {
          el.style.transition = 'none';
          el.style.transform = `translateY(${dy}px)`;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.style.transition = 'transform 0.5s cubic-bezier(0.2, 0, 0, 1)';
              el.style.transform = '';
            });
          });
        }
      }
    });

    prevPositionsRef.current = newPositions;
  }, [scores]);

  const loadMoreScores = useCallback(
    async (isInitial = false) => {
      if (loading) return;
      if (!isInitial && !hasMore) return;

      setLoading(true);
      const currentOffset = isInitial ? 0 : offset;
      try {
        const result = await getRecentScoresPaged(currentOffset, PAGE_SIZE);
        if (isInitial) {
          setScores(result.scores);
          setOffset(PAGE_SIZE);
        } else {
          setScores((prev) => [...prev, ...result.scores]);
          setOffset((prev) => prev + PAGE_SIZE);
        }
        setHasMore(result.hasMore);
      } catch (err) {
        console.error('Error loading recent scores:', err);
      } finally {
        setLoading(false);
      }
    },
    [loading, hasMore, offset]
  );

  useEffect(() => {
    if (isOpen) {
      loadMoreScores(true);
    }
  }, [isOpen, refreshTrigger]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || loading || !hasMore) return;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      loadMoreScores(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta partitura de las recientes?')) {
      try {
        await deleteScore(id);
        setScores((prev) => prev.filter((s) => s.id !== id));
        onDeleteScore(id);
      } catch (err) {
        console.error('Error deleting score:', err);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className="menu-backdrop" onClick={onClose} />}

      <aside className={`hamburger-drawer ${isOpen ? 'is-open' : 'is-closed'}`}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-brand">
            <img src="/favicon.svg" alt="Piano con Notas" className="brand-logo-img" />
            <span className="drawer-title">Menú Principal</span>
          </div>
          <button className="btn-icon drawer-close-btn" onClick={onClose} title="Colapsar menú lateral">
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* Action: New Score */}
        <div className="drawer-action-section">
          <button className="btn-new-score" onClick={onNewScore} data-tour="drawer-new-score">
            <PlusCircle size={18} />
            <span>Nueva partitura</span>
          </button>
        </div>

        {/* Separator: Recientes */}
        <div className="recents-separator">
          <span className="separator-line" />
          <span className="separator-label">Recientes</span>
          <span className="separator-line" />
        </div>

        {/* Recents Scrollable List */}
        <div className="recents-list-container" ref={scrollContainerRef} onScroll={handleScroll}>
          {scores.length === 0 && !loading ? (
            <div className="recents-empty">
              <Clock size={28} className="empty-icon" />
              <p>No hay partituras recientes</p>
              <span className="empty-sub">Carga un PDF para guardarlo automáticamente</span>
            </div>
          ) : (
            <div className="recents-list">
              {scores.map((score) => {
                const isActive = score.id === activeScoreId;
                return (
                  <div
                    key={score.id}
                    ref={(el) => {
                      if (el) itemsRef.current.set(score.id, el);
                      else itemsRef.current.delete(score.id);
                    }}
                    className={`recent-item ${isActive ? 'is-active-score' : ''}`}
                    onClick={() => onSelectScore(score)}
                  >
                    <div className="recent-item-icon">
                      <FileText size={16} className={score.pdfData ? 'icon-has-pdf' : 'icon-no-pdf'} />
                    </div>
                    <div className="recent-item-info">
                      <span className="recent-item-name" title={score.name}>
                        {score.name}
                      </span>
                      <div className="recent-item-meta">
                        <span className="recent-date">{formatDate(score.updatedAt)}</span>
                        <span className="recent-settings">
                          {score.pdfData ? `${score.clef} • Oct ${score.baseOctave}` : 'Sin partitura'}
                        </span>
                      </div>
                    </div>

                    <button
                      className="recent-delete-btn"
                      onClick={(e) => handleDelete(e, score.id)}
                      title="Eliminar de recientes"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}

              {loading && <div className="recents-loading">Cargando...</div>}
            </div>
          )}
        </div>

        {/* Fixed Footer in Drawer */}
        <div className="drawer-fixed-footer">
          <button className="drawer-footer-btn" onClick={onOpenTerms}>
            <ShieldCheck size={16} />
            <span>Términos y condiciones</span>
          </button>

          <button className="drawer-footer-btn" onClick={onOpenContact}>
            <GithubIcon size={16} />
            <span>Contacto del desarrollador</span>
          </button>
        </div>
      </aside>
    </>
  );
};
