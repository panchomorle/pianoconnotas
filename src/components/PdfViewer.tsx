import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, ZoomIn, ZoomOut, Trash2, FileText, Play, Pause, FastForward } from 'lucide-react';

const PDFJS_CDN_BASE = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}`;
pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_BASE}/build/pdf.worker.min.mjs`;

export interface PdfViewerState {
  zoomPercent?: number;
  scrollSpeed?: number;
  scrollTop?: number;
  scrollLeft?: number;
}

interface PdfViewerProps {
  pdfFile: File | null;
  onPdfLoaded: (file: File | null) => void;
  viewerState?: PdfViewerState;
  onViewerStateChange?: (state: PdfViewerState) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfFile,
  onPdfLoaded,
  viewerState,
  onViewerStateChange,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [zoomPercent, setZoomPercent] = useState<number>(viewerState?.zoomPercent ?? 100);
  const [scrollSpeed, setScrollSpeed] = useState<number>(viewerState?.scrollSpeed ?? 2);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [rendering, setRendering] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    setIsMobile(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Auto-scroll states
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);

  // Mouse drag panning state (hand cursor drag across sheet music)
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number }>({
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const pagesCanvasRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const scrollAccumulatorRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to ensure initial scroll position is restored only once per document load
  const hasRestoredScrollRef = useRef<boolean>(false);

  // Ref to hold target focal scroll positions right after zoom adjustments
  const pendingZoomFocalRef = useRef<{ targetScrollTop: number; targetScrollLeft: number } | null>(null);

  // Synchronize viewerState props when switching active score
  useEffect(() => {
    if (viewerState?.zoomPercent !== undefined) {
      setZoomPercent(viewerState.zoomPercent);
    }
    if (viewerState?.scrollSpeed !== undefined) {
      setScrollSpeed(viewerState.scrollSpeed);
    }
  }, [viewerState?.zoomPercent, viewerState?.scrollSpeed, pdfFile]);

  // Debounced notification to parent of zoom/scroll changes
  const notifyViewerStateChange = (newZoom: number, newSpeed: number, newTop: number, newLeft: number) => {
    if (!onViewerStateChange) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      onViewerStateChange({
        zoomPercent: newZoom,
        scrollSpeed: newSpeed,
        scrollTop: Math.round(newTop),
        scrollLeft: Math.round(newLeft),
      });
    }, 350);
  };

  // ResizeObserver to adapt base width when splitter/window resizes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      if (container.clientWidth > 0) {
        setContainerWidth(container.clientWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [pdfFile]);

  // Window-level mouse panning events while dragging
  useEffect(() => {
    if (!isMouseDown) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const newLeft = dragStartRef.current.scrollLeft - dx;
      const newTop = dragStartRef.current.scrollTop - dy;

      containerRef.current.scrollLeft = newLeft;
      containerRef.current.scrollTop = newTop;
      notifyViewerStateChange(zoomPercent, scrollSpeed, newTop, newLeft);
    };

    const handleWindowMouseUp = () => {
      setIsMouseDown(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isMouseDown, zoomPercent, scrollSpeed]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !containerRef.current) return;
    setIsMouseDown(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    };
  };

  const handleScroll = () => {
    if (!containerRef.current || pendingZoomFocalRef.current) return;
    notifyViewerStateChange(
      zoomPercent,
      scrollSpeed,
      containerRef.current.scrollTop,
      containerRef.current.scrollLeft
    );
  };

  // Synchronous focal adjustment after DOM commit for rock-solid zoom stability
  useLayoutEffect(() => {
    if (pendingZoomFocalRef.current && containerRef.current) {
      const { targetScrollTop, targetScrollLeft } = pendingZoomFocalRef.current;
      containerRef.current.scrollTop = targetScrollTop;
      containerRef.current.scrollLeft = targetScrollLeft;
      pendingZoomFocalRef.current = null;

      notifyViewerStateChange(
        zoomPercent,
        scrollSpeed,
        targetScrollTop,
        targetScrollLeft
      );
    }
  }, [zoomPercent, scrollSpeed]);

  // Load PDF file
  useEffect(() => {
    if (!pdfFile) {
      setPdfDoc(null);
      setNumPages(0);
      setIsAutoScrolling(false);
      hasRestoredScrollRef.current = false;
      return;
    }

    hasRestoredScrollRef.current = false;
    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
      try {
        setRendering(true);
        const loadingTask = pdfjsLib.getDocument({
          data: typedArray,
          cMapUrl: `${PDFJS_CDN_BASE}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${PDFJS_CDN_BASE}/standard_fonts/`,
          wasmUrl: `${PDFJS_CDN_BASE}/wasm/`,
        });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setRendering(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setRendering(false);
      }
    };
    fileReader.readAsArrayBuffer(pdfFile);
  }, [pdfFile]);

  // Render pages at crisp high resolution (renderScale = 2.0)
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    let isMounted = true;
    const renderScale = 2.0;

    const renderAllPages = async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (!isMounted) break;
        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: renderScale });
          const canvas = pagesCanvasRef.current.get(pageNum);

          if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              canvas.style.width = '100%';
              canvas.style.height = 'auto';
              canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

              const renderContext = {
                canvasContext: context,
                viewport: viewport,
              };
              await page.render(renderContext as any).promise;
            }
          }
        } catch (e) {
          console.error(`Error rendering PDF page ${pageNum}:`, e);
        }
      }
    };

    renderAllPages();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, numPages]);

  // Restore scroll positions ONLY ONCE when opening/rendering a document
  useEffect(() => {
    if (!rendering && pdfDoc && !hasRestoredScrollRef.current && containerRef.current) {
      if (viewerState?.scrollTop !== undefined) {
        containerRef.current.scrollTop = viewerState.scrollTop;
      }
      if (viewerState?.scrollLeft !== undefined) {
        containerRef.current.scrollLeft = viewerState.scrollLeft;
      }
      hasRestoredScrollRef.current = true;
    }
  }, [rendering, pdfDoc]);

  // Ctrl + Wheel native listener to zoom centered at cursor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 15 : -15;

        setZoomPercent((prevZoom) => {
          const nextZoom = Math.max(60, Math.min(200, prevZoom + delta));
          if (nextZoom === prevZoom) return prevZoom;

          const rect = container.getBoundingClientRect();
          const cursorX = e.clientX - rect.left;
          const cursorY = e.clientY - rect.top;

          const contentX = container.scrollLeft + cursorX;
          const contentY = container.scrollTop + cursorY;

          const scale = nextZoom / prevZoom;
          const newContentX = contentX * scale;
          const newContentY = contentY * scale;

          const targetScrollLeft = Math.max(0, Math.round(newContentX - cursorX));
          const targetScrollTop = Math.max(0, Math.round(newContentY - cursorY));

          pendingZoomFocalRef.current = { targetScrollTop, targetScrollLeft };
          return nextZoom;
        });
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // Smooth Auto-Scroll loop with sub-pixel accumulator
  useEffect(() => {
    if (!isAutoScrolling || !containerRef.current) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    scrollAccumulatorRef.current = 0;

    const speedPixelsPerSecondMap: Record<number, number> = {
      1: 2.5,
      2: 6,
      3: 14,
      4: 25,
      5: 42,
    };

    const speedPxPerSec = speedPixelsPerSecondMap[scrollSpeed] || 6;

    const scrollLoop = (now: number) => {
      const deltaSeconds = (now - lastTime) / 1000;
      lastTime = now;

      if (containerRef.current) {
        scrollAccumulatorRef.current += speedPxPerSec * deltaSeconds;

        if (scrollAccumulatorRef.current >= 1) {
          const pixelsToMove = Math.floor(scrollAccumulatorRef.current);
          containerRef.current.scrollTop += pixelsToMove;
          scrollAccumulatorRef.current -= pixelsToMove;
        }

        const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
        if (containerRef.current.scrollTop >= maxScroll - 2) {
          setIsAutoScrolling(false);
          return;
        }
      }

      animationFrameId = requestAnimationFrame(scrollLoop);
    };

    animationFrameId = requestAnimationFrame(scrollLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAutoScrolling, scrollSpeed]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        onPdfLoaded(file);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onPdfLoaded(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const jumpToPage = (pageNum: number) => {
    const canvas = pagesCanvasRef.current.get(pageNum);
    if (canvas && containerRef.current) {
      canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.max(60, Math.min(200, newZoom));
    if (clamped === zoomPercent) return;

    const container = containerRef.current;
    if (container) {
      const currentScrollTop = container.scrollTop;
      const currentScrollLeft = container.scrollLeft;
      const clientHeight = container.clientHeight;
      const clientWidth = container.clientWidth;

      // Focal point in content coordinates
      const centerY = currentScrollTop + clientHeight / 2;
      const centerX = currentScrollLeft + clientWidth / 2;

      // Scaling factor between target zoom and current zoom
      const scale = clamped / zoomPercent;

      const newCenterY = centerY * scale;
      const newCenterX = centerX * scale;

      const targetScrollTop = Math.max(0, Math.round(newCenterY - clientHeight / 2));
      const targetScrollLeft = Math.max(0, Math.round(newCenterX - clientWidth / 2));

      pendingZoomFocalRef.current = { targetScrollTop, targetScrollLeft };
    }

    setZoomPercent(clamped);
  };

  const handleSpeedSelect = (newSpeed: number) => {
    setScrollSpeed(newSpeed);
    if (containerRef.current) {
      notifyViewerStateChange(
        zoomPercent,
        newSpeed,
        containerRef.current.scrollTop,
        containerRef.current.scrollLeft
      );
    }
  };

  // Base page width fits within the container (leaving margin and scrollbar space)
  const basePageWidth = Math.max(280, Math.min(containerWidth - 28, 850));
  const computedPageWidth = Math.round(basePageWidth * (zoomPercent / 100));

  return (
    <div className="pdf-viewer-panel">
      {pdfFile && (
        <div className="pdf-toolbar">
          <div className="pdf-title">
            <FileText size={16} className="icon-blue" />
            <span className="pdf-filename">{pdfFile.name}</span>
          </div>

          <div className="pdf-controls">
            {/* Auto-Scroll Controls */}
            <div className="auto-scroll-box" title="Auto-Desplazamiento">
              <button
                className={`btn btn-small ${isAutoScrolling ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
              >
                {isAutoScrolling ? <Pause size={13} /> : <Play size={13} />}
                <span className="auto-scroll-label">{isAutoScrolling ? 'Pausar' : 'Auto-Scroll'}</span>
              </button>

              <div className="speed-selector">
                <FastForward size={13} className="speed-icon" />
                <select
                  value={scrollSpeed}
                  onChange={(e) => handleSpeedSelect(Number(e.target.value))}
                  className="custom-select speed-select"
                  title="Velocidad de Auto-Scroll"
                >
                  <option value={1}>{isMobile ? '1x' : '1x (Muy Lento)'}</option>
                  <option value={2}>{isMobile ? '2x' : '2x (Lento)'}</option>
                  <option value={3}>{isMobile ? '3x' : '3x (Normal)'}</option>
                  <option value={4}>{isMobile ? '4x' : '4x (Medio)'}</option>
                  <option value={5}>{isMobile ? '5x' : '5x (Rápido)'}</option>
                </select>
              </div>
            </div>

            {/* Page Selector */}
            {numPages > 1 && (
              <div className="page-jump-select-box">
                <select
                  onChange={(e) => jumpToPage(Number(e.target.value))}
                  className="custom-select page-select"
                  title="Ir a página"
                >
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      Pág. {p} / {numPages}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Visual Zoom Controls */}
            <div className="btn-group">
              <button
                className="btn-icon"
                onClick={() => handleZoomChange(zoomPercent - 15)}
                title="Alejar zoom (reducir tamaño)"
              >
                <ZoomOut size={14} />
              </button>
              <span className="scale-display">{zoomPercent}%</span>
              <button
                className="btn-icon"
                onClick={() => handleZoomChange(zoomPercent + 15)}
                title="Acercar zoom (aumentar tamaño)"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            <button className="btn btn-danger btn-small btn-remove-pdf" onClick={() => onPdfLoaded(null)} title="Quitar PDF">
              <Trash2 size={13} /> <span className="remove-pdf-label">Quitar</span>
            </button>
          </div>
        </div>
      )}

      {!pdfFile ? (
        <div className="pdf-upload-dropzone" onDrop={handleDrop} onDragOver={handleDragOver}>
          <Upload size={36} className="upload-icon" />
          <h4 className="upload-title">Cargar Partitura PDF</h4>
          <p className="upload-subtitle">Arrastra un archivo PDF aquí o explora en tu equipo</p>
          <label className="btn btn-primary btn-small file-input-label">
            Explorar Archivos
            <input type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <div
          className={`pdf-scroll-container ${isMouseDown ? 'is-dragging' : ''}`}
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onScroll={handleScroll}
        >
          {rendering && <div className="pdf-loading">Cargando PDF...</div>}

          <div className="pdf-pages-track">
            {Array.from({ length: numPages }, (_, index) => {
              const pageNum = index + 1;
              return (
                <div
                  key={pageNum}
                  className="pdf-page-wrapper"
                  style={{ width: `${computedPageWidth}px`, maxWidth: 'none' }}
                >
                  <canvas
                    ref={(el) => {
                      if (el) pagesCanvasRef.current.set(pageNum, el);
                      else pagesCanvasRef.current.delete(pageNum);
                    }}
                    className="pdf-page-canvas"
                  />
                  <span className="page-number-footer">Página {pageNum} de {numPages}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
