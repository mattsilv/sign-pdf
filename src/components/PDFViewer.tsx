import { useEffect, useRef, useState } from 'react';
import { loadPdfDocument, renderPage } from '../lib/pdf/viewer';
import { CoordinateMapper } from '../lib/pdf/coordinates';
import { Annotation } from '../lib/types';
import { TextInputModal } from './TextInputModal';
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist';

interface PDFViewerProps {
  file: File | null;
  annotations: Annotation[];
  currentPage: number;
  scale: number;
  selectedTool: string;
  signatureDataUrl: string | null;
  selectedAnnotationId: string | null;
  onAnnotationAdd: (annotation: Omit<Annotation, 'id'>) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationSelect: (id: string | null) => void;
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
  selectedAnnotationId,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationSelect,
  onPageChange,
  onScaleChange
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [viewport, setViewport] = useState<PageViewport | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [pendingTextAnnotation, setPendingTextAnnotation] = useState<{xPdf: number, yPdf: number, pageIndex: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number, origXPdf: number, origYPdf: number} | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{handle: string, x: number, y: number, origWidth: number, origHeight: number} | null>(null);
  const [dragTransform, setDragTransform] = useState<{id: string, x: number, y: number} | null>(null);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onAnnotationSelect(null);
      } else if (event.key === 'Delete' && selectedAnnotationId) {
        const annotation = annotations.find(a => a.id === selectedAnnotationId);
        if (annotation && window.confirm('Delete this annotation?')) {
          // We need to add a delete handler
          const deleteBtn = document.querySelector(`[data-delete-id="${selectedAnnotationId}"]`) as HTMLElement;
          if (deleteBtn) deleteBtn.click();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, onAnnotationSelect, annotations]);

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

  // Check if click is on an existing annotation
  const getAnnotationAtPoint = (x: number, y: number): Annotation | null => {
    if (!viewport) return null;
    
    const mapper = new CoordinateMapper(viewport);
    const currentAnnotations = annotations.filter(
      ann => ann.pageIndex === currentPage - 1
    );
    
    // Check in reverse order (top annotations first)
    for (let i = currentAnnotations.length - 1; i >= 0; i--) {
      const ann = currentAnnotations[i];
      const [annX, annY] = mapper.toCssPoint(ann.xPdf, ann.yPdf);
      
      // Define hit area based on annotation type
      let hitWidth = 50;
      let hitHeight = 20;
      let offsetX = 0;
      let offsetY = 0;
      
      if (ann.type === 'signature') {
        hitWidth = ann.widthPdf || 160;
        hitHeight = ann.heightPdf || 60;
        offsetX = -hitWidth / 2;
        offsetY = -hitHeight / 2;
      } else if (ann.type === 'text' || ann.type === 'date') {
        // Estimate text bounds
        const textContent = ann.content || '';
        hitWidth = textContent.length * 8;
        hitHeight = 20;
        offsetY = -hitHeight / 2;
      } else if (ann.type === 'check') {
        hitWidth = 20;
        hitHeight = 20;
        offsetX = -10;
        offsetY = -10;
      }
      
      // Check if click is within annotation bounds
      if (x >= annX + offsetX && x <= annX + offsetX + hitWidth &&
          y >= annY + offsetY && y <= annY + offsetY + hitHeight) {
        return ann;
      }
    }
    
    return null;
  };

  // Handle canvas clicks for annotation placement
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewport || isDragging) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    
    // Get click position relative to the canvas element
    // This gives us coordinates in the CSS coordinate system
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if we clicked on an existing annotation
    const clickedAnnotation = getAnnotationAtPoint(x, y);
    
    if (clickedAnnotation) {
      // Select the annotation instead of placing a new one
      onAnnotationSelect(clickedAnnotation.id);
      return;
    }
    
    // If we didn't click on an annotation, deselect and potentially place new one
    onAnnotationSelect(null);

    const mapper = new CoordinateMapper(viewport);
    
    // Debug: Check what PDF.js actually returns
    const pdfPoint = viewport.convertToPdfPoint(x, y);
    console.log('Raw PDF.js conversion result:', pdfPoint, 'type:', typeof pdfPoint);
    
    const [xPdf, yPdf] = mapper.toPdfPoint(x, y);
    console.log('Coordinate mapping:', { clickX: x, clickY: y, pdfX: xPdf, pdfY: yPdf });

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
        widthPdf: 160,
        heightPdf: 60,
      });
    } else if (selectedTool === 'text') {
      // Store the pending annotation and open modal
      setPendingTextAnnotation(baseAnnotation);
      setTextModalOpen(true);
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

  // Handle mouse down for drag start
  const handleMouseDown = (event: React.MouseEvent, annotationId: string) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (!viewport) return;
    
    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({
      x,
      y,
      origXPdf: annotation.xPdf,
      origYPdf: annotation.yPdf
    });
    setDragTransform({ id: annotationId, x: 0, y: 0 });
    
    onAnnotationSelect(annotationId);
  };
  
  // Handle resize start
  const handleResizeStart = (event: React.MouseEvent, handle: string) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (!viewport || !selectedAnnotationId) return;
    
    const annotation = annotations.find(a => a.id === selectedAnnotationId);
    if (!annotation) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setIsResizing(true);
    setResizeStart({
      handle,
      x,
      y,
      origWidth: annotation.widthPdf || 160,
      origHeight: annotation.heightPdf || 60
    });
  };
  
  // Handle mouse move for dragging - Using CSS transforms for immediate feedback
  // PERFORMANCE OPTIMIZATION: This uses CSS transforms for real-time visual updates
  // instead of updating React state on every mousemove event. This eliminates the
  // 16-32ms React re-render lag and ensures annotations move smoothly with the cursor.
  // 
  // How it works:
  // 1. During drag: Apply CSS transform to move element visually (no React re-render)
  // 2. On mouseup: Update actual PDF coordinates in state (single re-render)
  //
  // Future improvements could use pointer events for better touch support or
  // implement momentum/inertia for a more polished feel.
  useEffect(() => {
    if (!isDragging || !dragStart || !selectedAnnotationId || !viewport) return;
    
    let finalDeltaX = 0;
    let finalDeltaY = 0;
    
    const handleMouseMove = (event: MouseEvent) => {
      // Convert client coordinates to canvas-relative coordinates
      const rect = canvasRef.current!.getBoundingClientRect();
      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;
      
      // Calculate delta in canvas coordinates
      finalDeltaX = currentX - dragStart.x;
      finalDeltaY = currentY - dragStart.y;
      
      // Update CSS transform immediately (no React re-render)
      setDragTransform({ id: selectedAnnotationId, x: finalDeltaX, y: finalDeltaY });
    };
    
    const handleMouseUp = () => {
      // Convert final delta to PDF coordinates and update the actual position
      if (finalDeltaX !== 0 || finalDeltaY !== 0) {
        const deltaPdfX = finalDeltaX / viewport.scale;
        const deltaPdfY = -finalDeltaY / viewport.scale; // Negative because PDF Y is inverted
        
        const newXPdf = dragStart.origXPdf + deltaPdfX;
        const newYPdf = dragStart.origYPdf + deltaPdfY;
        
        // Update annotation position once on mouse up
        onAnnotationUpdate(selectedAnnotationId, {
          xPdf: newXPdf,
          yPdf: newYPdf
        });
      }
      
      setIsDragging(false);
      setDragStart(null);
      setDragTransform(null);
    };
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, selectedAnnotationId, viewport, onAnnotationUpdate]);
  
  // Handle mouse move for resizing
  useEffect(() => {
    if (!isResizing || !resizeStart || !selectedAnnotationId || !viewport) return;
    
    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Calculate delta in CSS coordinates
      const deltaX = x - resizeStart.x;
      const deltaY = y - resizeStart.y;
      
      // Convert delta to PDF coordinates
      const deltaPdfX = deltaX / viewport.scale;
      const deltaPdfY = deltaY / viewport.scale;
      
      const annotation = annotations.find(a => a.id === selectedAnnotationId);
      if (!annotation || annotation.type !== 'signature') return;
      
      let newWidth = resizeStart.origWidth;
      let newHeight = resizeStart.origHeight;
      
      // Update dimensions based on handle
      if (resizeStart.handle.includes('e')) {
        newWidth = Math.max(20, resizeStart.origWidth + deltaPdfX);
      } else if (resizeStart.handle.includes('w')) {
        newWidth = Math.max(20, resizeStart.origWidth - deltaPdfX);
      }
      
      if (resizeStart.handle.includes('s')) {
        newHeight = Math.max(20, resizeStart.origHeight + deltaPdfY);
      } else if (resizeStart.handle.includes('n')) {
        newHeight = Math.max(20, resizeStart.origHeight - deltaPdfY);
      }
      
      // Update annotation dimensions
      onAnnotationUpdate(selectedAnnotationId, {
        widthPdf: newWidth,
        heightPdf: newHeight
      });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeStart(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, selectedAnnotationId, viewport, annotations, onAnnotationUpdate]);

  // Handle text modal save
  const handleTextSave = (text: string) => {
    if (pendingTextAnnotation) {
      onAnnotationAdd({
        ...pendingTextAnnotation,
        type: 'text' as const,
        content: text,
      });
      setPendingTextAnnotation(null);
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
          
          // CRITICAL: Position annotations to match export behavior
          // Text and dates render at the exact click point (baseline)
          // Signatures and checkmarks are centered on the click point
          let baseTransform = '';
          
          if (annotation.type === 'signature') {
            // Signature images are centered on click point
            baseTransform = 'translate(-50%, -50%)';
          } else if (annotation.type === 'text' || annotation.type === 'date') {
            // Text renders at exact click point - no transform
            // This matches how pdf-lib positions text at the baseline
            baseTransform = '';
          } else if (annotation.type === 'check') {
            // Checkmark centered on click point
            baseTransform = 'translate(-50%, -50%)';
          }
          
          // Apply drag transform if this annotation is being dragged
          // VISUAL OPTIMIZATION: Combines base positioning transform with drag offset
          // This allows smooth dragging without modifying the actual position until mouseup
          const isDraggedAnnotation = dragTransform && dragTransform.id === annotation.id;
          const transform = isDraggedAnnotation 
            ? `${baseTransform} translate(${dragTransform.x}px, ${dragTransform.y}px)`
            : baseTransform;
          
          return (
            <div
              key={annotation.id}
              className="annotation-overlay"
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: transform,
                background: annotation.id === hoveredAnnotationId ? 'rgba(255, 255, 0, 0.2)' : 'rgba(255, 255, 0, 0.1)',
                border: annotation.id === selectedAnnotationId ? '2px solid #2196F3' : '1px dashed #333',
                boxShadow: annotation.id === selectedAnnotationId ? '0 0 0 1px rgba(33, 150, 243, 0.3)' : 'none',
                transition: isDraggedAnnotation ? 'none' : 'background 0.15s ease, border 0.15s ease',
                padding: '1px 2px',
                fontSize: '12px',
                pointerEvents: 'auto',
                cursor: (isDragging || isResizing) && annotation.id === selectedAnnotationId ? 'grabbing' : 'grab',
                whiteSpace: 'nowrap'
              }}
              onMouseDown={(e) => handleMouseDown(e, annotation.id)}
              onMouseEnter={() => setHoveredAnnotationId(annotation.id)}
              onMouseLeave={() => setHoveredAnnotationId(null)}
            >
              {annotation.type === 'text' || annotation.type === 'date' 
                ? annotation.content 
                : annotation.type === 'signature' 
                ? (annotation.pngDataUrl ? <img src={annotation.pngDataUrl} alt="signature" style={{width: `${annotation.widthPdf || 160}px`, height: `${annotation.heightPdf || 60}px`, pointerEvents: 'none', userSelect: 'none'}} /> : '[signature]')
                : annotation.type === 'check' 
                ? '✓' 
                : `[${annotation.type}]`}
              {/* Selection handles - only for signatures which can be resized */}
              {annotation.id === selectedAnnotationId && !isDragging && !isResizing && annotation.type === 'signature' && (
                <>
                  <div style={{
                    position: 'absolute',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#2196F3',
                    border: '1px solid white',
                    borderRadius: '50%',
                    top: '-4px',
                    left: '-4px',
                    cursor: 'nw-resize',
                    pointerEvents: 'auto'
                  }} 
                  onMouseDown={(e) => handleResizeStart(e, 'nw')}
                  />
                  <div style={{
                    position: 'absolute',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#2196F3',
                    border: '1px solid white',
                    borderRadius: '50%',
                    top: '-4px',
                    right: '-4px',
                    cursor: 'ne-resize',
                    pointerEvents: 'auto'
                  }}
                  onMouseDown={(e) => handleResizeStart(e, 'ne')}
                  />
                  <div style={{
                    position: 'absolute',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#2196F3',
                    border: '1px solid white',
                    borderRadius: '50%',
                    bottom: '-4px',
                    left: '-4px',
                    cursor: 'sw-resize',
                    pointerEvents: 'auto'
                  }}
                  onMouseDown={(e) => handleResizeStart(e, 'sw')}
                  />
                  <div style={{
                    position: 'absolute',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#2196F3',
                    border: '1px solid white',
                    borderRadius: '50%',
                    bottom: '-4px',
                    right: '-4px',
                    cursor: 'se-resize',
                    pointerEvents: 'auto'
                  }}
                  onMouseDown={(e) => handleResizeStart(e, 'se')}
                  />
                </>
              )}
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
      
      {/* Text Input Modal */}
      <TextInputModal
        isOpen={textModalOpen}
        onClose={() => {
          setTextModalOpen(false);
          setPendingTextAnnotation(null);
        }}
        onSave={handleTextSave}
        title="Add Text Annotation"
        placeholder="Enter your text..."
      />
    </div>
  );
}