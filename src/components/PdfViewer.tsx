import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, ZoomIn, ZoomOut, Trash2, FileText, Play, Pause, FastForward } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  pdfFile: File | null;
  onPdfLoaded: (file: File | null) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ pdfFile, onPdfLoaded }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [zoomPercent, setZoomPercent] = useState<number>(100); // 60% to 200%
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [rendering, setRendering] = useState<boolean>(false);

  // Auto-scroll states
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(2);

  const containerRef = useRef<HTMLDivElement>(null);
  const pagesCanvasRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const scrollAccumulatorRef = useRef<number>(0);

  // Load PDF file
  useEffect(() => {
    if (!pdfFile) {
      setPdfDoc(null);
      setNumPages(0);
      setIsAutoScrolling(false);
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
      try {
        setRendering(true);
        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
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

  // Render pages at crisp high resolution (renderScale = 1.8)
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    let isMounted = true;
    const renderScale = 1.8; // Always render crisp high resolution

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

  // Smooth Auto-Scroll loop with sub-pixel accumulator
  useEffect(() => {
    if (!isAutoScrolling || !containerRef.current) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    scrollAccumulatorRef.current = 0;

    // Map speed level 1..5 to pixels per second
    const speedPixelsPerSecondMap: Record<number, number> = {
      1: 2.5,  // Muy Lento (smooth 2.5px/s)
      2: 6,    // Lento (6px/s)
      3: 14,   // Normal (14px/s)
      4: 25,   // Medio (25px/s)
      5: 42,   // Rápido (42px/s)
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
      canvas.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
                <span>{isAutoScrolling ? 'Pausar' : 'Auto-Scroll'}</span>
              </button>

              <div className="speed-selector">
                <FastForward size={13} className="speed-icon" />
                <select
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  className="custom-select speed-select"
                  title="Velocidad de Auto-Scroll"
                >
                  <option value={1}>1x (Muy Lento)</option>
                  <option value={2}>2x (Lento)</option>
                  <option value={3}>3x (Normal)</option>
                  <option value={4}>4x (Medio)</option>
                  <option value={5}>5x (Rápido)</option>
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

            {/* Visual Zoom Controls (Scales CSS size, keeps crisp rendering) */}
            <div className="btn-group">
              <button
                className="btn-icon"
                onClick={() => setZoomPercent((prev) => Math.max(60, prev - 15))}
                title="Alejar zoom (reducir tamaño)"
              >
                <ZoomOut size={14} />
              </button>
              <span className="scale-display">{zoomPercent}%</span>
              <button
                className="btn-icon"
                onClick={() => setZoomPercent((prev) => Math.min(200, prev + 15))}
                title="Acercar zoom (aumentar tamaño)"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            <button className="btn btn-danger btn-small" onClick={() => onPdfLoaded(null)} title="Quitar PDF">
              <Trash2 size={13} /> Quitar
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
        <div className="pdf-scroll-container" ref={containerRef}>
          {rendering && <div className="pdf-loading">Cargando PDF...</div>}

          {Array.from({ length: numPages }, (_, index) => {
            const pageNum = index + 1;
            return (
              <div
                key={pageNum}
                className="pdf-page-wrapper"
                style={{ width: `${zoomPercent}%`, maxWidth: `${Math.max(900, (900 * zoomPercent) / 100)}px` }}
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
      )}
    </div>
  );
};
