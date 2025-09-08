import { useEffect, useRef, useState, useCallback } from 'react';
import { loadPdfDocument } from '../lib/pdf/viewer';
import { getAnnotationAnchor, getDefaultDimensions } from '../lib/pdf/geometry';
import { Annotation } from '../lib/types';
import { useVirtualizedPages } from '../hooks/useVirtualizedPages';
import { useSwipeGestures } from '../hooks/useSwipeGestures';
import { PageThumbnails } from './PageThumbnails';
import { TextInputModal } from './TextInputModal';
import { AnnotationLayer } from './AnnotationLayer';
import { emitDebugInfo } from '../utils/debug';
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist';

interface VirtualizedPDFViewerProps {
  file: File | null;
  annotations: Annotation[];
  currentPage: number;
  scale: number;
  selectedTool: string;
  signatureDataUrl: string | null;
  selectedAnnotationId: string | null;
  onAnnotationAdd: (annotation: Omit<Annotation, 'id' | 'orderNumber'>) => void;
  onAnnotationUpdate?: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationSelect: (id: string | null) => void;
  onAnnotationDelete: (id: string) => void;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
  showThumbnails?: boolean;
}

export function VirtualizedPDFViewer({ 
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
  onScaleChange,
  showThumbnails = true
}: VirtualizedPDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageViewports, setPageViewports] = useState<Map<number, PageViewport>>(new Map());
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [pendingTextAnnotation, setPendingTextAnnotation] = useState<{xPdf: number, yPdf: number, pageIndex: number} | null>(null);
  const [initialScaleSet, setInitialScaleSet] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Detect mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                   window.innerWidth <= 768;

  // Use virtualization hook
  const {
    renderedPages,
    getPageCanvas,
    visiblePages
  } = useVirtualizedPages(pdfDoc, currentPage, scale, 1); // Window size of 1 = render current ±1 pages

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

  // Calculate page viewports
  useEffect(() => {
    if (!pdfDoc) return;

    const calculateViewports = async () => {
      const viewports = new Map<number, PageViewport>();
      
      // Calculate viewports for visible pages
      for (const pageNum of visiblePages) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        viewports.set(pageNum, viewport);
      }
      
      setPageViewports(viewports);
    };

    calculateViewports();
  }, [pdfDoc, visiblePages, scale]);

  // Handle page click for annotations
  const handlePageClick = useCallback((event: React.MouseEvent, pageNum: number) => {
    if (!selectedTool || selectedTool === 'cursor') return;
    if (!pdfDoc) return;

    const pageContainer = event.currentTarget as HTMLElement;
    const rect = pageContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const viewport = pageViewports.get(pageNum);
    if (!viewport) return;

    // Convert to PDF coordinates
    const xPdf = x;
    const yPdf = viewport.height - y; // PDF has origin at bottom-left

    // Handle different tools
    if (selectedTool === 'text') {
      setPendingTextAnnotation({ xPdf, yPdf, pageIndex: pageNum });
      setTextModalOpen(true);
    } else if (selectedTool === 'signature' && signatureDataUrl) {
      const dimensions = getDefaultDimensions('signature');
      onAnnotationAdd({
        type: 'signature',
        content: signatureDataUrl,
        xPdf,
        yPdf,
        widthPdf: dimensions.width,
        heightPdf: dimensions.height,
        pageIndex: pageNum,
        anchor: getAnnotationAnchor('signature')
      });
    } else if (selectedTool === 'checkmark') {
      const dimensions = getDefaultDimensions('checkmark');
      onAnnotationAdd({
        type: 'checkmark',
        content: '✓',
        xPdf,
        yPdf,
        widthPdf: dimensions.width,
        heightPdf: dimensions.height,
        pageIndex: pageNum,
        anchor: getAnnotationAnchor('checkmark')
      });
    } else if (selectedTool === 'date') {
      const date = new Date().toLocaleDateString();
      const dimensions = getDefaultDimensions('date');
      onAnnotationAdd({
        type: 'date',
        content: date,
        xPdf,
        yPdf,
        widthPdf: dimensions.width,
        heightPdf: dimensions.height,
        pageIndex: pageNum,
        anchor: getAnnotationAnchor('date')
      });
    }

    // Emit debug info
    emitDebugInfo({
      lastClick: { x, y },
      lastPdfCoords: { x: xPdf, y: yPdf },
      canvasSize: { width: viewport.width, height: viewport.height },
      viewportSize: { width: viewport.width, height: viewport.height },
      scale,
      currentPage: pageNum
    });
  }, [selectedTool, signatureDataUrl, pdfDoc, pageViewports, onAnnotationAdd, scale]);

  // Handle text modal submit
  const handleTextSubmit = (text: string) => {
    if (!pendingTextAnnotation) return;
    
    const dimensions = getDefaultDimensions('text');
    onAnnotationAdd({
      type: 'text',
      content: text,
      xPdf: pendingTextAnnotation.xPdf,
      yPdf: pendingTextAnnotation.yPdf,
      widthPdf: dimensions.width,
      heightPdf: dimensions.height,
      pageIndex: pendingTextAnnotation.pageIndex,
      anchor: getAnnotationAnchor('text')
    });
    
    setTextModalOpen(false);
    setPendingTextAnnotation(null);
  };

  // Render a page with its canvas and annotations
  const renderPageContent = (pageNum: number) => {
    const canvas = getPageCanvas(pageNum);
    const viewport = pageViewports.get(pageNum);
    const pageAnnotations = annotations.filter(a => a.pageIndex === pageNum);

    if (!viewport) return null;

    return (
      <div
        key={pageNum}
        className="pdf-page"
        data-page={pageNum}
        style={{
          width: viewport.width,
          height: viewport.height,
          marginBottom: '20px'
        }}
        onClick={(e) => handlePageClick(e, pageNum)}
      >
        {/* Page number indicator */}
        <div className="page-number">
          Page {pageNum}
        </div>

        {/* Render canvas if available */}
        {canvas && (
          <canvas
            ref={el => {
              if (el && canvas !== el) {
                // Replace with virtualized canvas
                el.width = canvas.width;
                el.height = canvas.height;
                const ctx = el.getContext('2d');
                if (ctx) {
                  ctx.drawImage(canvas, 0, 0);
                }
              }
            }}
            className="pdf-canvas"
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />
        )}

        {/* Loading placeholder */}
        {!canvas && (
          <div className="pdf-page-loading">
            <div className="loading-spinner">Loading page {pageNum}...</div>
          </div>
        )}

        {/* Render annotations for this page */}
        <AnnotationLayer
          annotations={pageAnnotations}
          viewport={viewport}
          selectedId={selectedAnnotationId}
          onSelect={onAnnotationSelect}
          onDelete={onAnnotationDelete}
          onUpdate={onAnnotationUpdate}
          isMobile={isMobile}
        />
      </div>
    );
  };

  // Handle page navigation with animation
  const navigateToPage = useCallback((targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Scroll to the target page
    if (pagesContainerRef.current) {
      const targetPageEl = pagesContainerRef.current.querySelector(
        `.pdf-page[data-page="${targetPage}"]`
      ) as HTMLElement;
      
      if (targetPageEl) {
        targetPageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    
    onPageChange(targetPage);
    
    // Reset transition state after animation
    setTimeout(() => {
      setIsTransitioning(false);
      setSwipeProgress(0);
      setSwipeDirection(null);
    }, 300);
  }, [totalPages, isTransitioning, onPageChange]);

  // Swipe gesture handlers
  const handleSwipeLeft = useCallback(() => {
    navigateToPage(currentPage + 1);
  }, [currentPage, navigateToPage]);

  const handleSwipeRight = useCallback(() => {
    navigateToPage(currentPage - 1);
  }, [currentPage, navigateToPage]);

  const handleSwipeStart = useCallback(() => {
    // Optional: Add haptic feedback if available
    if ('vibrate' in navigator && isMobile) {
      navigator.vibrate(10);
    }
  }, [isMobile]);

  const handleSwipeMove = useCallback((progress: number, direction: 'left' | 'right' | 'up' | 'down') => {
    if (direction === 'left' || direction === 'right') {
      setSwipeProgress(progress);
      setSwipeDirection(direction as 'left' | 'right');
    }
  }, []);

  const handleSwipeEnd = useCallback(() => {
    setSwipeProgress(0);
    setSwipeDirection(null);
  }, []);

  // Use swipe gestures hook
  useSwipeGestures(
    pagesContainerRef,
    {
      onSwipeLeft: handleSwipeLeft,
      onSwipeRight: handleSwipeRight,
      onSwipeStart: handleSwipeStart,
      onSwipeMove: handleSwipeMove,
      onSwipeEnd: handleSwipeEnd,
    },
    {
      threshold: 50,
      velocity: 0.3,
      // Enable mouse events for desktop and testing (Playwright)
      allowMouseEvents: !isMobile || process.env.NODE_ENV === 'development'
    }
  );

  // Handle scroll to detect current page
  const handleScroll = useCallback(() => {
    if (!pagesContainerRef.current || !pdfDoc || isTransitioning) return;

    const container = pagesContainerRef.current;
    
    // Find the page that's most visible
    const pages = container.querySelectorAll('.pdf-page');
    let mostVisiblePage = currentPage;
    let maxVisibleArea = 0;

    pages.forEach((pageEl) => {
      const pageNum = parseInt(pageEl.getAttribute('data-page') || '0');
      if (pageNum === 0) return;

      const rect = pageEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate visible area
      const visibleTop = Math.max(rect.top, containerRect.top);
      const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibleArea = visibleHeight * rect.width;

      if (visibleArea > maxVisibleArea) {
        maxVisibleArea = visibleArea;
        mostVisiblePage = pageNum;
      }
    });

    if (mostVisiblePage !== currentPage) {
      onPageChange(mostVisiblePage);
    }
  }, [currentPage, pdfDoc, onPageChange, isTransitioning]);

  if (!file || !pdfDoc) {
    return <div className="pdf-viewer-empty">No PDF loaded</div>;
  }

  return (
    <div className="virtualized-pdf-viewer" ref={containerRef}>
      {/* Thumbnail navigation */}
      {showThumbnails && (
        <PageThumbnails
          pdfDoc={pdfDoc}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      )}

      {/* PDF pages container */}
      <div 
        className="pdf-pages-container"
        ref={pagesContainerRef}
        onScroll={handleScroll}
        style={{
          transform: swipeDirection && swipeProgress > 0 
            ? `translateX(${swipeDirection === 'left' ? -swipeProgress * 50 : swipeProgress * 50}px)`
            : undefined,
          transition: isTransitioning ? 'transform 0.3s ease-out' : undefined
        }}
      >
        {/* Render all pages (only visible ones will have canvases) */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
          <div key={pageNum} className="page-wrapper">
            {renderPageContent(pageNum)}
          </div>
        ))}
      </div>

      {/* Swipe indicators */}
      {swipeDirection && swipeProgress > 0 && (
        <>
          {/* Left indicator (next page) */}
          {swipeDirection === 'left' && currentPage < totalPages && (
            <div 
              className="swipe-indicator swipe-indicator-left"
              style={{
                opacity: swipeProgress,
                transform: `translateX(${-50 + swipeProgress * 30}px)`
              }}
            >
              <div className="swipe-arrow">→</div>
              <div className="swipe-text">Page {currentPage + 1}</div>
            </div>
          )}
          
          {/* Right indicator (previous page) */}
          {swipeDirection === 'right' && currentPage > 1 && (
            <div 
              className="swipe-indicator swipe-indicator-right"
              style={{
                opacity: swipeProgress,
                transform: `translateX(${50 - swipeProgress * 30}px)`
              }}
            >
              <div className="swipe-arrow">←</div>
              <div className="swipe-text">Page {currentPage - 1}</div>
            </div>
          )}
        </>
      )}

      {/* Text input modal */}
      {textModalOpen && (
        <TextInputModal
          isOpen={textModalOpen}
          onClose={() => {
            setTextModalOpen(false);
            setPendingTextAnnotation(null);
          }}
          onSubmit={handleTextSubmit}
        />
      )}

      {/* Debug info */}
      <div className="virtualization-debug" style={{ 
        position: 'fixed', 
        bottom: 10, 
        right: 10, 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        display: process.env.NODE_ENV === 'development' ? 'block' : 'none'
      }}>
        <div>Current Page: {currentPage}/{totalPages}</div>
        <div>Rendered Pages: {Array.from(renderedPages).join(', ')}</div>
        <div>Visible Pages: {Array.from(visiblePages).join(', ')}</div>
        <div>Scale: {(scale * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
}