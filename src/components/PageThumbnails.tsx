import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PageThumbnailsProps {
  pdfDoc: PDFDocumentProxy | null;
  currentPage: number;
  onPageChange: (page: number) => void;
}

interface ThumbnailData {
  pageNum: number;
  dataUrl: string | null;
  isLoading: boolean;
}

export function PageThumbnails({ pdfDoc, currentPage, onPageChange }: PageThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<Map<number, ThumbnailData>>(new Map());
  const [visibleRange, setVisibleRange] = useState({ start: 1, end: 10 });
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderQueue = useRef<Set<number>>(new Set());
  const isRendering = useRef(false);

  // Thumbnail dimensions
  const THUMBNAIL_WIDTH = 80;
  const THUMBNAIL_SCALE = 0.2;

  // Render a thumbnail
  const renderThumbnail = useCallback(async (pageNum: number) => {
    if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) return;

    try {
      // Mark as loading
      setThumbnails(prev => {
        const newMap = new Map(prev);
        newMap.set(pageNum, {
          pageNum,
          dataUrl: null,
          isLoading: true
        });
        return newMap;
      });

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: THUMBNAIL_SCALE });
      
      // Create off-screen canvas
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const context = canvas.getContext('2d');
      if (!context) return;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      // Update state with rendered thumbnail
      setThumbnails(prev => {
        const newMap = new Map(prev);
        newMap.set(pageNum, {
          pageNum,
          dataUrl,
          isLoading: false
        });
        return newMap;
      });

      // Clean up
      canvas.width = 0;
      canvas.height = 0;
    } catch (error) {
      console.error(`Failed to render thumbnail for page ${pageNum}:`, error);
      setThumbnails(prev => {
        const newMap = new Map(prev);
        newMap.set(pageNum, {
          pageNum,
          dataUrl: null,
          isLoading: false
        });
        return newMap;
      });
    }
  }, [pdfDoc, THUMBNAIL_SCALE]);

  // Process render queue
  const processRenderQueue = useCallback(async () => {
    if (isRendering.current || renderQueue.current.size === 0) return;
    
    isRendering.current = true;
    const pageNum = renderQueue.current.values().next().value;
    renderQueue.current.delete(pageNum);
    
    await renderThumbnail(pageNum);
    
    isRendering.current = false;
    
    // Process next item in queue
    if (renderQueue.current.size > 0) {
      requestAnimationFrame(() => processRenderQueue());
    }
  }, [renderThumbnail]);

  // Queue thumbnail for rendering
  const queueThumbnailRender = useCallback((pageNum: number) => {
    const existing = thumbnails.get(pageNum);
    if (existing?.dataUrl || existing?.isLoading) return;
    
    renderQueue.current.add(pageNum);
    processRenderQueue();
  }, [thumbnails, processRenderQueue]);

  // Handle scroll to update visible range
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !pdfDoc) return;
    
    const container = containerRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    
    // Calculate visible page range based on scroll position
    const thumbnailTotalWidth = THUMBNAIL_WIDTH + 8; // Include margin
    const start = Math.max(1, Math.floor(scrollLeft / thumbnailTotalWidth));
    const end = Math.min(
      pdfDoc.numPages,
      Math.ceil((scrollLeft + containerWidth) / thumbnailTotalWidth) + 1
    );
    
    setVisibleRange({ start, end });
  }, [pdfDoc, THUMBNAIL_WIDTH]);

  // Render visible thumbnails
  useEffect(() => {
    if (!pdfDoc) return;
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      queueThumbnailRender(i);
    }
  }, [pdfDoc, visibleRange, queueThumbnailRender]);

  // Scroll to current page when it changes
  useEffect(() => {
    const thumbnailEl = thumbnailRefs.current.get(currentPage);
    if (thumbnailEl && containerRef.current) {
      const container = containerRef.current;
      const thumbnailRect = thumbnailEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Check if thumbnail is not fully visible
      if (thumbnailRect.left < containerRect.left || thumbnailRect.right > containerRect.right) {
        thumbnailEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [currentPage]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!pdfDoc) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '0');
            if (pageNum > 0) {
              queueThumbnailRender(pageNum);
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '100px',
        threshold: 0.01
      }
    );
    
    // Observe all thumbnail placeholders
    thumbnailRefs.current.forEach(ref => {
      observer.observe(ref);
    });
    
    return () => observer.disconnect();
  }, [pdfDoc, queueThumbnailRender]);

  if (!pdfDoc) return null;

  return (
    <div className="page-thumbnails-container">
      <div 
        ref={containerRef}
        className="page-thumbnails"
        onScroll={handleScroll}
      >
        {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map(pageNum => {
          const thumbnail = thumbnails.get(pageNum);
          const isActive = pageNum === currentPage;
          
          return (
            <div
              key={pageNum}
              ref={el => {
                if (el) thumbnailRefs.current.set(pageNum, el);
              }}
              data-page={pageNum}
              className={`page-thumbnail ${isActive ? 'active' : ''}`}
              onClick={() => onPageChange(pageNum)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPageChange(pageNum);
                }
              }}
              aria-label={`Go to page ${pageNum}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="thumbnail-content">
                {thumbnail?.dataUrl ? (
                  <img 
                    src={thumbnail.dataUrl} 
                    alt={`Page ${pageNum}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="thumbnail-placeholder">
                    {thumbnail?.isLoading ? (
                      <div className="thumbnail-loading">...</div>
                    ) : (
                      <div className="thumbnail-number">{pageNum}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="thumbnail-label">
                {pageNum}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}