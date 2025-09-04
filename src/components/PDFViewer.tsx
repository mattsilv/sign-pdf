import { useEffect, useRef, useState } from 'react';
import { loadPdfDocument, renderPage } from '../lib/pdf/viewer';
import { CoordinateMapper } from '../lib/pdf/coordinates';
import { Annotation } from '../lib/types';

interface PDFViewerProps {
  file: File | null;
  annotations: Annotation[];
  currentPage: number;
  scale: number;
  selectedTool: string;
  signatureDataUrl: string | null;
  onAnnotationAdd: (annotation: Omit<Annotation, 'id'>) => void;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
}

export function PDFViewer({ 
  file, 
  annotations, 
  currentPage, 
  scale,
  selectedTool,
  signatureDataUrl,
  onAnnotationAdd,
  onPageChange,
  onScaleChange
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [viewport, setViewport] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);

  // Load PDF
  useEffect(() => {
    if (!file) return;
    
    loadPdfDocument(file).then(doc => {
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      onPageChange(1);
    });
  }, [file, onPageChange]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || currentPage === 0) return;

    const renderCurrentPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const newViewport = await renderPage(page, canvasRef.current!, scale);
      setViewport(newViewport);
    };

    renderCurrentPage();
  }, [pdfDoc, currentPage, scale]);

  // Handle canvas clicks for annotation placement
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewport) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const mapper = new CoordinateMapper(viewport);
    const [xPdf, yPdf] = mapper.toPdfPoint(x, y);

    const baseAnnotation = {
      pageIndex: currentPage - 1, // 0-based for storage
      xPdf,
      yPdf,
    };

    if (selectedTool === 'signature' && signatureDataUrl) {
      onAnnotationAdd({
        ...baseAnnotation,
        type: 'signature' as const,
        pngDataUrl: signatureDataUrl,
        widthPdf: 100,
        heightPdf: 50,
      });
    } else if (selectedTool === 'text') {
      const text = prompt('Enter text:') || 'Sample Text';
      onAnnotationAdd({
        ...baseAnnotation,
        type: 'text' as const,
        content: text,
      });
    } else if (selectedTool === 'check') {
      onAnnotationAdd({
        ...baseAnnotation,
        type: 'check' as const,
      });
    } else if (selectedTool === 'date') {
      onAnnotationAdd({
        ...baseAnnotation,
        type: 'date' as const,
        content: new Date().toLocaleDateString(),
      });
    }
  };

  // Render annotations for current page
  const currentPageAnnotations = annotations.filter(
    ann => ann.pageIndex === currentPage - 1
  );

  return (
    <div className="pdf-viewer">
      {/* Page Navigation */}
      {totalPages > 1 && (
        <div className="page-nav">
          <button 
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Tool Instruction Message */}
      {selectedTool === 'signature' && (
        <div className="tool-instruction" style={{
          textAlign: 'center',
          margin: '10px 0',
          padding: '8px 16px',
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          borderRadius: '4px',
          color: '#2e7d32',
          fontSize: '14px'
        }}>
          Click into your PDF below to add your signature
        </div>
      )}

      {/* PDF Canvas with Overlay */}
      <div 
        ref={containerRef}
        className="pdf-container"
        style={{ position: 'relative' }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ display: 'block', cursor: 'crosshair' }}
        />
        
        {/* Annotation Overlay */}
        {viewport && currentPageAnnotations.map((annotation) => {
          const mapper = new CoordinateMapper(viewport);
          const [x, y] = mapper.toCssPoint(annotation.xPdf, annotation.yPdf);
          
          return (
            <div
              key={annotation.id}
              className="annotation-overlay"
              style={{
                position: 'absolute',
                left: x,
                top: y,
                background: 'rgba(255, 255, 0, 0.3)',
                border: '1px dashed #333',
                padding: '2px 4px',
                fontSize: '12px',
                pointerEvents: 'none'
              }}
            >
              {annotation.type === 'text' || annotation.type === 'date' 
                ? annotation.content 
                : annotation.type === 'signature' 
                ? (annotation.pngDataUrl ? <img src={annotation.pngDataUrl} alt="signature" style={{width: '100px', height: '50px'}} /> : '[signature]')
                : annotation.type === 'check' 
                ? '✓' 
                : `[${annotation.type}]`}
            </div>
          );
        })}
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button onClick={() => onScaleChange(Math.max(0.5, scale - 0.25))}>-</button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => onScaleChange(Math.min(3.0, scale + 0.25))}>+</button>
      </div>
    </div>
  );
}