import { useEffect, useRef, useState } from 'react';
import { loadPdfDocument, renderPage } from '../lib/pdf/viewer';
import { GeometryManager, getAnnotationAnchor, getDefaultDimensions, FontMetricsHelper } from '../lib/pdf/geometry';
import { Annotation } from '../lib/types';
// import { usePointerEvents, type PointerState } from '../hooks/usePointerEvents';
import { usePinchZoom } from '../hooks/usePinchZoom';
import { TextInputModal } from './TextInputModal';
import { emitDebugInfo } from './CoordinateDebugger';
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist';

interface PDFViewerProps {
  file: File | null;
  annotations: Annotation[];
  currentPage: number;
  scale: number;
  selectedTool: string;
  signatureDataUrl: string | null;
  selectedAnnotationId: string | null;
  onAnnotationAdd: (annotation: Omit<Annotation, 'id' | 'orderNumber'>) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationSelect: (id: string | null) => void;
  onAnnotationDelete: (id: string) => void;
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
  onAnnotationDelete,
  onPageChange,
  onScaleChange
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageLayerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [viewport, setViewport] = useState<PageViewport | null>(null);
  const [pageSize, setPageSize] = useState<{width: number, height: number} | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [pendingTextAnnotation, setPendingTextAnnotation] = useState<{xPdf: number, yPdf: number, pageIndex: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number, origXPdf: number, origYPdf: number} | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{handle: string, x: number, y: number, origWidth: number, origHeight: number, aspectRatio: number} | null>(null);
  const [dragTransform, setDragTransform] = useState<{id: string, x: number, y: number} | null>(null);
  const [initialScaleSet, setInitialScaleSet] = useState(false);
  
  // Detect mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                   window.innerWidth <= 768;
  
  // Pinch-to-zoom functionality
  const pinchZoom = usePinchZoom(scale, 0.5, 5, {
    onScaleChange: onScaleChange,
  });
  
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

  // Load PDF and set initial scale
  useEffect(() => {
    if (!file) return;
    
    loadPdfDocument(file).then(async doc => {
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      onPageChange(1);
      
      // Calculate initial scale for mobile to fit width
      if (isMobile && !initialScaleSet) {
        const firstPage = await doc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        
        // Get container width (accounting for padding/margins)
        const containerWidth = window.innerWidth - 32; // 16px padding on each side
        const fitWidthScale = containerWidth / viewport.width;
        
        // Set the scale to fit width
        onScaleChange(fitWidthScale);
        setInitialScaleSet(true);
      }
    });
  }, [file, onPageChange, onScaleChange, isMobile, initialScaleSet]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || currentPage === 0) return;

    const renderCurrentPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      
      // Get actual page size in PDF points for accurate bounds checking
      const actualPageSize = page.getViewport({ scale: 1 });
      setPageSize({ 
        width: actualPageSize.width, 
        height: actualPageSize.height 
      });
      
      console.log(`📄 [PAGE] Actual page size: ${actualPageSize.width}x${actualPageSize.height} PDF points`);
      
      const newViewport = await renderPage(page, canvasRef.current!, scale);
      setViewport(newViewport);
    };

    renderCurrentPage();
  }, [pdfDoc, currentPage, scale]);

  // Check if click is on an existing annotation
  const getAnnotationAtPoint = (x: number, y: number): Annotation | null => {
    if (!viewport) return null;
    
    const geometry = new GeometryManager(viewport, pageSize || undefined);
    const currentAnnotations = annotations.filter(
      ann => ann.pageIndex === currentPage - 1
    );
    
    // Check in reverse order (top annotations first)
    for (let i = currentAnnotations.length - 1; i >= 0; i--) {
      const ann = currentAnnotations[i];
      const [annX, annY] = geometry.toCssPoint(ann.xPdf, ann.yPdf);
      
      // Define hit area based on annotation type - convert PDF dimensions to CSS
      let hitWidthPdf = 50;
      let hitHeightPdf = 20;
      let offsetX = 0;
      let offsetY = 0;
      
      if (ann.type === 'signature') {
        hitWidthPdf = ann.widthPdf || 160;
        hitHeightPdf = ann.heightPdf || 60;
        // Convert PDF dimensions to CSS for accurate hit testing
        const [hitWidthCss, hitHeightCss] = geometry.pdfDimsToCssDims(hitWidthPdf, hitHeightPdf);
        offsetX = -hitWidthCss / 2; // Center anchor
        offsetY = -hitHeightCss / 2;
        
        // Check if click is within annotation bounds using CSS dimensions
        if (x >= annX + offsetX && x <= annX + offsetX + hitWidthCss &&
            y >= annY + offsetY && y <= annY + offsetY + hitHeightCss) {
          return ann;
        }
      } else if (ann.type === 'text' || ann.type === 'date') {
        // Estimate text bounds in PDF points, then convert to CSS
        const textContent = ann.content || '';
        const textWidthPdf = textContent.length * 12 * 0.6; // ~12pt font, 0.6 width ratio
        const textHeightPdf = 16; // ~12pt font height
        const [hitWidthCss, hitHeightCss] = geometry.pdfDimsToCssDims(textWidthPdf, textHeightPdf);
        offsetY = -hitHeightCss / 2; // baseline anchor
        
        // Check if click is within annotation bounds using CSS dimensions
        if (x >= annX + offsetX && x <= annX + offsetX + hitWidthCss &&
            y >= annY + offsetY && y <= annY + offsetY + hitHeightCss) {
          return ann;
        }
      } else if (ann.type === 'check') {
        const [hitWidthCss, hitHeightCss] = geometry.pdfDimsToCssDims(20, 20);
        offsetX = -hitWidthCss / 2; // Center anchor
        offsetY = -hitHeightCss / 2;
        
        // Check if click is within annotation bounds using CSS dimensions
        if (x >= annX + offsetX && x <= annX + offsetX + hitWidthCss &&
            y >= annY + offsetY && y <= annY + offsetY + hitHeightCss) {
          return ann;
        }
      }
    }
    
    return null;
  };

  // Handle canvas clicks for annotation placement (unified mouse/touch)
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    if (!viewport || isDragging || !pageLayerRef.current) return;

    // Use page layer as reference frame instead of canvas - this eliminates gutter offset
    const pageLayer = pageLayerRef.current;
    const rect = pageLayer.getBoundingClientRect();
    
    // Debug: Check for gutter elimination
    console.group('🎯 ALIGNMENT DEBUG - Click Event (Fixed)');
    const canvasRect = canvasRef.current!.getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();
    const gutterX = canvasRect.left - containerRect.left;
    const gutterY = canvasRect.top - containerRect.top;
    const pageLayerGutterX = rect.left - containerRect.left;
    const pageLayerGutterY = rect.top - containerRect.top;
    
    console.log('🧭 GUTTER CHECK - Container vs Canvas:', { gutterX, gutterY });
    console.log('🧭 GUTTER CHECK - Container vs PageLayer:', { pageLayerGutterX, pageLayerGutterY });
    console.log('Page layer rect:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    console.log('Viewport size:', { width: viewport.width, height: viewport.height });
    console.groupEnd();
    
    // Get click position relative to the page layer (aligned with viewport coordinate system)
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Verify mapping is self-inverse (should be within 0.5px)
    const [xPdf, yPdf] = viewport.convertToPdfPoint(x, y);
    const [xBack, yBack] = viewport.convertToViewportPoint(xPdf, yPdf);
    const deltaX = Math.abs(xBack - x);
    const deltaY = Math.abs(yBack - y);
    
    console.log(`🔄 MAPPING VERIFICATION: Click(${x}, ${y}) → PDF(${xPdf}, ${yPdf}) → Back(${xBack}, ${yBack})`);
    console.log(`🔄 MAPPING DELTA: dx=${deltaX.toFixed(2)}, dy=${deltaY.toFixed(2)} (should be < 0.5)`);
    
    if (deltaX > 0.5 || deltaY > 0.5) {
      console.warn('⚠️ MAPPING NOT SELF-INVERSE - coordinate system mismatch detected');
    }
    
    // Check if we clicked on an existing annotation
    const clickedAnnotation = getAnnotationAtPoint(x, y);
    
    if (clickedAnnotation) {
      // Select the annotation instead of placing a new one
      onAnnotationSelect(clickedAnnotation.id);
      return;
    }
    
    // If we didn't click on an annotation, deselect and potentially place new one
    onAnnotationSelect(null);

    console.log(`🖱️ [UI] Click at page-layer coordinates: (${x}, ${y})`);
    console.log(`🔄 [UI] Converted to PDF coordinates: (${xPdf}, ${yPdf})`);
    console.log(`📄 [UI] Page: ${currentPage}, Scale: ${scale}`);
    console.log(`📐 [UI] Viewport size: ${viewport.width}x${viewport.height}`);
    
    // Emit debug info
    emitDebugInfo({
      clickX: x,
      clickY: y,
      pdfX: xPdf,
      pdfY: yPdf,
      canvasWidth: canvasRef.current!.width,
      canvasHeight: canvasRef.current!.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      scale: viewport.scale,
      pageNumber: currentPage
    });

    const baseAnnotation = {
      pageIndex: currentPage - 1, // 0-based for storage
      xPdf,
      yPdf,
    };

    if (selectedTool === 'signature' && signatureDataUrl) {
      const dimensions = getDefaultDimensions('signature');
      const anchor = getAnnotationAnchor('signature');
      
      // Apply bounds checking to prevent out-of-page placement
      const geometry = new GeometryManager(viewport, pageSize || undefined);
      const [clampedX, clampedY] = geometry.clampToPage(xPdf, yPdf, dimensions.width, dimensions.height, anchor);
      
      console.log(`📍 [BOUNDS] Original: (${xPdf}, ${yPdf}), Clamped: (${clampedX}, ${clampedY})`);
      
      const newAnnotation = {
        ...baseAnnotation,
        id: `signature-${Date.now()}`,
        xPdf: clampedX,
        yPdf: clampedY,
        type: 'signature' as const,
        pngDataUrl: signatureDataUrl,
        widthPdf: dimensions.width,
        heightPdf: dimensions.height,
        anchor,
      };
      
      onAnnotationAdd(newAnnotation);
      
      // Emit debug info for the new annotation
      emitDebugInfo({
        lastAnnotation: {
          id: newAnnotation.id,
          xPdf: newAnnotation.xPdf,
          yPdf: newAnnotation.yPdf,
          type: newAnnotation.type
        }
      });
    } else if (selectedTool === 'text') {
      // Store the pending annotation and open modal
      setPendingTextAnnotation(baseAnnotation);
      setTextModalOpen(true);
    } else if (selectedTool === 'check') {
      const dimensions = getDefaultDimensions('check');
      const anchor = getAnnotationAnchor('check');
      
      // Apply bounds checking
      const geometry = new GeometryManager(viewport, pageSize || undefined);
      const [clampedX, clampedY] = geometry.clampToPage(xPdf, yPdf, dimensions.width, dimensions.height, anchor);
      
      onAnnotationAdd({
        ...baseAnnotation,
        xPdf: clampedX,
        yPdf: clampedY,
        type: 'check' as const,
        widthPdf: dimensions.width,
        heightPdf: dimensions.height,
        anchor,
      });
    } else if (selectedTool === 'date') {
      const anchor = getAnnotationAnchor('date');
      const dimensions = getDefaultDimensions('date');
      
      // Apply bounds checking for text
      const geometry = new GeometryManager(viewport, pageSize || undefined);
      const [clampedX, clampedY] = geometry.clampToPage(xPdf, yPdf, dimensions.width, dimensions.height, anchor);
      
      onAnnotationAdd({
        ...baseAnnotation,
        xPdf: clampedX,
        yPdf: clampedY,
        type: 'date' as const,
        content: new Date().toLocaleDateString(),
        anchor,
      });
    }
  };

  // Handle pointer down for drag start (unified mouse/touch)
  const handlePointerDown = (event: React.PointerEvent, annotationId: string) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (!viewport || !pageLayerRef.current) return;
    
    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation) return;
    
    // Set pointer capture for consistent drag behavior
    const element = event.currentTarget as Element;
    if (element.setPointerCapture) {
      element.setPointerCapture(event.pointerId);
    }
    
    // Use page layer coordinates for consistent reference frame
    const rect = pageLayerRef.current.getBoundingClientRect();
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
  
  // Handle resize start (unified pointer events)
  const handleResizeStart = (event: React.PointerEvent, handle: string) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (!viewport || !selectedAnnotationId || !pageLayerRef.current) return;
    
    const annotation = annotations.find(a => a.id === selectedAnnotationId);
    if (!annotation) return;
    
    // Set pointer capture for consistent resize behavior
    const element = event.currentTarget as Element;
    if (element.setPointerCapture) {
      element.setPointerCapture(event.pointerId);
    }
    
    // Use page layer coordinates for consistent reference frame
    const rect = pageLayerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const origWidth = annotation.widthPdf || 160;
    const origHeight = annotation.heightPdf || 60;
    const aspectRatio = origWidth / origHeight;
    
    setIsResizing(true);
    setResizeStart({
      handle,
      x,
      y,
      origWidth,
      origHeight,
      aspectRatio
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
    
    const handlePointerMove = (event: PointerEvent) => {
      // Convert client coordinates to page-layer-relative coordinates
      const rect = pageLayerRef.current!.getBoundingClientRect();
      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;
      
      // Calculate delta in canvas coordinates
      finalDeltaX = currentX - dragStart.x;
      finalDeltaY = currentY - dragStart.y;
      
      // Update CSS transform immediately (no React re-render)
      setDragTransform({ id: selectedAnnotationId, x: finalDeltaX, y: finalDeltaY });
    };
    
    const handlePointerUp = () => {
      // Convert final delta to PDF coordinates and update the actual position
      if (finalDeltaX !== 0 || finalDeltaY !== 0) {
        // Use centralized geometry system for coordinate conversion
        const geometry = new GeometryManager(viewport, pageSize || undefined);
        const [deltaPdfX, deltaPdfY] = geometry.convertDragDelta(
          dragStart.x,
          dragStart.y,
          dragStart.x + finalDeltaX,
          dragStart.y + finalDeltaY
        );
        
        let newXPdf = dragStart.origXPdf + deltaPdfX;
        let newYPdf = dragStart.origYPdf + deltaPdfY;
        
        // Apply bounds checking during drag
        const annotation = annotations.find(a => a.id === selectedAnnotationId);
        if (annotation) {
          const anchor = annotation.anchor || getAnnotationAnchor(annotation.type);
          const widthPdf = annotation.widthPdf || getDefaultDimensions(annotation.type).width;
          const heightPdf = annotation.heightPdf || getDefaultDimensions(annotation.type).height;
          
          const [clampedX, clampedY] = geometry.clampToPage(newXPdf, newYPdf, widthPdf, heightPdf, anchor);
          
          console.log(`🖱️ [DRAG] Delta: CSS(${finalDeltaX}, ${finalDeltaY}) → PDF(${deltaPdfX}, ${deltaPdfY})`);
          console.log(`📍 [DRAG] Original: (${newXPdf}, ${newYPdf}), Clamped: (${clampedX}, ${clampedY})`);
          
          newXPdf = clampedX;
          newYPdf = clampedY;
        }
        
        // Update annotation position once on pointer up
        onAnnotationUpdate(selectedAnnotationId, {
          xPdf: newXPdf,
          yPdf: newYPdf
        });
      }
      
      setIsDragging(false);
      setDragStart(null);
      setDragTransform(null);
    };
    
    // Add event listeners for pointer events
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragStart, selectedAnnotationId, viewport, onAnnotationUpdate]);
  
  // Handle pointer move for resizing
  useEffect(() => {
    if (!isResizing || !resizeStart || !selectedAnnotationId || !viewport) return;
    
    const handlePointerMove = (event: PointerEvent) => {
      const rect = pageLayerRef.current!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Use centralized geometry system for coordinate conversion
      const geometry = new GeometryManager(viewport, pageSize || undefined);
      const [deltaPdfX, deltaPdfY] = geometry.convertDragDelta(
        resizeStart.x,
        resizeStart.y,
        x,
        y
      );
      
      const annotation = annotations.find(a => a.id === selectedAnnotationId);
      if (!annotation || annotation.type !== 'signature') return;
      
      // Calculate the scale factor based on the resize handle
      let scaleFactor = 1;
      
      if (resizeStart.handle.includes('e')) {
        // East handles: scale based on width change
        const newWidth = Math.max(20, resizeStart.origWidth + deltaPdfX);
        scaleFactor = newWidth / resizeStart.origWidth;
      } else if (resizeStart.handle.includes('w')) {
        // West handles: scale based on width change (inverted)
        const newWidth = Math.max(20, resizeStart.origWidth - deltaPdfX);
        scaleFactor = newWidth / resizeStart.origWidth;
      }
      
      if (resizeStart.handle.includes('s')) {
        // South handles: scale based on height change
        const newHeight = Math.max(20, resizeStart.origHeight + deltaPdfY);
        const heightScaleFactor = newHeight / resizeStart.origHeight;
        // Use the larger scale factor to ensure we don't go below minimum
        scaleFactor = Math.max(scaleFactor, heightScaleFactor);
      } else if (resizeStart.handle.includes('n')) {
        // North handles: scale based on height change (inverted)
        const newHeight = Math.max(20, resizeStart.origHeight - deltaPdfY);
        const heightScaleFactor = newHeight / resizeStart.origHeight;
        // Use the larger scale factor to ensure we don't go below minimum
        scaleFactor = Math.max(scaleFactor, heightScaleFactor);
      }
      
      // Calculate new dimensions maintaining aspect ratio
      const newWidth = Math.max(20, resizeStart.origWidth * scaleFactor);
      const newHeight = Math.max(20, resizeStart.origHeight * scaleFactor);
      
      // Update annotation dimensions
      onAnnotationUpdate(selectedAnnotationId, {
        widthPdf: newWidth,
        heightPdf: newHeight
      });
    };
    
    const handlePointerUp = () => {
      setIsResizing(false);
      setResizeStart(null);
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, resizeStart, selectedAnnotationId, viewport, annotations, onAnnotationUpdate]);

  // Handle text modal save
  const handleTextSave = (text: string) => {
    if (pendingTextAnnotation && viewport) {
      const geometry = new GeometryManager(viewport, pageSize || undefined);
      const anchor = getAnnotationAnchor('text');
      
      // Estimate text dimensions for bounds checking
      const textWidth = text.length * 12 * 0.6; // Rough text width estimation
      const textHeight = 16; // Roughly 12pt font height
      
      // Apply bounds checking
      const [clampedX, clampedY] = geometry.clampToPage(
        pendingTextAnnotation.xPdf, 
        pendingTextAnnotation.yPdf, 
        textWidth, 
        textHeight, 
        anchor
      );
      
      console.log(`📍 [TEXT-BOUNDS] Original: (${pendingTextAnnotation.xPdf}, ${pendingTextAnnotation.yPdf}), Clamped: (${clampedX}, ${clampedY})`);
      
      onAnnotationAdd({
        ...pendingTextAnnotation,
        xPdf: clampedX,
        yPdf: clampedY,
        type: 'text' as const,
        content: text,
        anchor,
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

      {/* Tool Instruction Message - Always render to preserve layout */}
      <div className="tool-instruction" style={{
        textAlign: 'center',
        margin: '10px 0',
        padding: '8px 16px',
        backgroundColor: selectedTool === 'signature' ? '#e8f5e8' : 'transparent',
        border: selectedTool === 'signature' ? '1px solid #4caf50' : '1px solid transparent',
        borderRadius: '4px',
        color: selectedTool === 'signature' ? '#2e7d32' : 'transparent',
        fontSize: '14px',
        visibility: selectedTool === 'signature' ? 'visible' : 'hidden',
        minHeight: '20px'
      }}>
        Click into your PDF below to add your signature
      </div>

      {/* PDF Canvas with Overlay */}
      <div 
        ref={containerRef}
        className="pdf-container"
        style={{ position: 'relative' }}
      >
        <div
          ref={pageLayerRef}
          className="page-layer"
          style={{
            position: 'relative',
            width: viewport ? `${viewport.width}px` : 'auto',
            height: viewport ? `${viewport.height}px` : 'auto',
            touchAction: 'pan-x pan-y pinch-zoom',
            transform: `scale(${pinchZoom.state.scale}) translate(${pinchZoom.state.x}px, ${pinchZoom.state.y}px)`,
            transformOrigin: '0 0',
          }}
          onPointerDown={(e) => {
            // Only handle pinch-zoom if not interacting with annotations
            if (!isDragging && !isResizing && !pinchZoom.state.isPinching) {
              pinchZoom.handlers.onPointerDown(e.nativeEvent);
            }
          }}
          onPointerMove={(e) => {
            if (pinchZoom.state.isPinching) {
              pinchZoom.handlers.onPointerMove(e.nativeEvent);
            }
          }}
          onPointerUp={(e) => {
            if (pinchZoom.state.isPinching) {
              pinchZoom.handlers.onPointerUp(e.nativeEvent);
            }
          }}
          onPointerCancel={(e) => {
            if (pinchZoom.state.isPinching) {
              pinchZoom.handlers.onPointerCancel(e.nativeEvent);
            }
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onPointerDown={handleCanvasClick}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              display: 'block',
              margin: 0,
              padding: 0,
              border: 'none',
              cursor: 'crosshair'
            }}
          />
          
          {/* Annotation Overlay */}
          {viewport && currentPageAnnotations.map((annotation) => {
            const geometry = new GeometryManager(viewport, pageSize || undefined);
            const [x, y] = geometry.toCssPoint(annotation.xPdf, annotation.yPdf);
            
            // Use centralized anchor system
            const anchor = annotation.anchor || getAnnotationAnchor(annotation.type);
            let baseTransform = geometry.getAnchorTransform(anchor);
            
            // Special handling for baseline-correct text positioning
            if ((annotation.type === 'text' || annotation.type === 'date') && anchor === 'baseline-left') {
              const fontSize = 12;
              const baselineOffset = FontMetricsHelper.getBaselineOffset(fontSize);
              // Adjust CSS positioning to match PDF baseline
              baseTransform = `translateY(-${baselineOffset}px)`;
              console.log(`🎯 [UI] Rendering ${annotation.type} with baseline offset: ${baselineOffset}px`);
            }
            
            console.log(`🎯 [UI] Rendering ${annotation.type} at CSS: (${x}, ${y}), PDF coords: (${annotation.xPdf}, ${annotation.yPdf}), anchor: ${anchor}`);
            
            
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
                // Customizable padding per annotation type
                padding: (() => {
                  switch (annotation.type) {
                    case 'signature': return '0';
                    case 'check': return '4px'; // Small padding for checkboxes since label is now outside
                    case 'text': return '0'; // Minimal padding like signatures
                    case 'date': return '0'; // Minimal padding like signatures
                    default: return '0';
                  }
                })(),
                fontSize: '12px', // Consistent font size for all annotations
                lineHeight: 'normal', // Consistent line height for all annotations
                pointerEvents: 'auto',
                cursor: (isDragging || isResizing) && annotation.id === selectedAnnotationId ? 'grabbing' : 'grab',
                whiteSpace: 'nowrap',
                touchAction: 'none'
              }}
              onPointerDown={(e) => handlePointerDown(e, annotation.id)}
              onMouseEnter={() => setHoveredAnnotationId(annotation.id)}
              onMouseLeave={() => setHoveredAnnotationId(null)}
            >
              {/* Delete icon - only show on hover/selection */}
              {(annotation.id === hoveredAnnotationId || annotation.id === selectedAnnotationId) && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnnotationDelete(annotation.id);
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLDivElement;
                    target.style.backgroundColor = '#b91c1c';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLDivElement;
                    target.style.backgroundColor = '#dc2626';
                  }}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'background-color 0.2s',
                    userSelect: 'none'
                  }}
                >
                  ×
                </div>
              )}
              
              {/* Annotation content */}
              {annotation.type === 'text' || annotation.type === 'date' 
                ? annotation.content 
                : annotation.type === 'signature' 
                ? (annotation.pngDataUrl ? (() => {
                    // Use centralized geometry for dimension conversion
                    const pdfWidth = annotation.widthPdf || getDefaultDimensions('signature').width;
                    const pdfHeight = annotation.heightPdf || getDefaultDimensions('signature').height;
                    
                    const [cssWidth, cssHeight] = geometry.pdfDimsToCssDims(pdfWidth, pdfHeight);
                    
                    console.log(`🖼️ [SIGNATURE] PDF dims: ${pdfWidth}x${pdfHeight}pt, CSS dims: ${cssWidth}x${cssHeight}px (scale: ${viewport.scale})`);
                    
                    return <img 
                      src={annotation.pngDataUrl} 
                      alt="signature" 
                      style={{
                        width: `${cssWidth}px`, 
                        height: `${cssHeight}px`, 
                        pointerEvents: 'none', 
                        userSelect: 'none'
                      }} 
                    />;
                  })() : '[signature]')
                : annotation.type === 'check' 
                ? '✓' 
                : `[${annotation.type}]`}
              
              {/* Order number badge - positioned outside bottom-left corner */}
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  fontSize: '7px',
                  padding: '2px 3px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
              >
                #{annotation.orderNumber || '?'}
              </div>
              
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
                    pointerEvents: 'auto',
                    touchAction: 'none'
                  }} 
                  onPointerDown={(e) => handleResizeStart(e, 'nw')}
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
                    pointerEvents: 'auto',
                    touchAction: 'none'
                  }}
                  onPointerDown={(e) => handleResizeStart(e, 'ne')}
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
                    pointerEvents: 'auto',
                    touchAction: 'none'
                  }}
                  onPointerDown={(e) => handleResizeStart(e, 'sw')}
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
                    pointerEvents: 'auto',
                    touchAction: 'none'
                  }}
                  onPointerDown={(e) => handleResizeStart(e, 'se')}
                  />
                </>
              )}
            </div>
            );
          })}
        </div>
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