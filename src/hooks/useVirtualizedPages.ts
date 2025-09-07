import { useEffect, useState, useRef, useCallback } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';

interface VirtualizedPage {
  pageNum: number;
  canvas: HTMLCanvasElement | null;
  isRendering: boolean;
  isRendered: boolean;
}

export function useVirtualizedPages(
  pdfDoc: PDFDocumentProxy | null,
  currentPage: number,
  scale: number,
  windowSize: number = 1
) {
  const [virtualizedPages, setVirtualizedPages] = useState<Map<number, VirtualizedPage>>(new Map());
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const pageCanvases = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderTasks = useRef<Map<number, RenderTask>>(new Map());
  const pageCache = useRef<Map<number, PDFPageProxy>>(new Map());

  // Calculate which pages should be visible
  const getVisiblePages = useCallback((page: number): Set<number> => {
    if (!pdfDoc) return new Set();
    
    const pages = new Set<number>();
    const start = Math.max(1, page - windowSize);
    const end = Math.min(pdfDoc.numPages, page + windowSize);
    
    for (let i = start; i <= end; i++) {
      pages.add(i);
    }
    
    return pages;
  }, [pdfDoc, windowSize]);

  // Clean up a page (release memory)
  const cleanupPage = useCallback((pageNum: number) => {
    // Cancel any in-flight render task
    const renderTask = renderTasks.current.get(pageNum);
    if (renderTask) {
      try {
        renderTask.cancel();
      } catch {
        // Ignore cancellation errors
      }
      renderTasks.current.delete(pageNum);
    }

    // Clear canvas memory
    const canvas = pageCanvases.current.get(pageNum);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 0;
      canvas.height = 0;
      pageCanvases.current.delete(pageNum);
    }

    // Remove from virtualized pages
    setVirtualizedPages(prev => {
      const newMap = new Map(prev);
      newMap.delete(pageNum);
      return newMap;
    });

    // Clear from rendered set
    setRenderedPages(prev => {
      const newSet = new Set(prev);
      newSet.delete(pageNum);
      return newSet;
    });
  }, []);

  // Render a single page
  const renderPage = useCallback(async (pageNum: number): Promise<HTMLCanvasElement | null> => {
    if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) return null;

    try {
      // Check if already rendering
      const existing = virtualizedPages.get(pageNum);
      if (existing?.isRendering) return existing.canvas;
      
      // Mark as rendering
      setVirtualizedPages(prev => {
        const newMap = new Map(prev);
        newMap.set(pageNum, {
          pageNum,
          canvas: null,
          isRendering: true,
          isRendered: false
        });
        return newMap;
      });

      // Get or load the page
      let page = pageCache.current.get(pageNum);
      if (!page) {
        page = await pdfDoc.getPage(pageNum);
        pageCache.current.set(pageNum, page);
      }

      // Create or reuse canvas
      let canvas = pageCanvases.current.get(pageNum);
      if (!canvas) {
        canvas = document.createElement('canvas');
        pageCanvases.current.set(pageNum, canvas);
      }

      // Set up viewport and canvas dimensions
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');

      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTasks.current.set(pageNum, renderTask);
      
      await renderTask.promise;
      
      // Mark as rendered
      setVirtualizedPages(prev => {
        const newMap = new Map(prev);
        newMap.set(pageNum, {
          pageNum,
          canvas,
          isRendering: false,
          isRendered: true
        });
        return newMap;
      });

      setRenderedPages(prev => new Set(prev).add(pageNum));
      
      return canvas;
    } catch (error) {
      // Handle render cancellation gracefully
      if ((error as Error)?.name !== 'RenderingCancelledException') {
        console.error(`Failed to render page ${pageNum}:`, error);
      }
      
      // Clean up on error
      cleanupPage(pageNum);
      return null;
    }
  }, [pdfDoc, scale, virtualizedPages, cleanupPage]);

  // Update visible pages when current page or scale changes
  useEffect(() => {
    if (!pdfDoc) return;

    const visiblePages = getVisiblePages(currentPage);
    
    // Clean up pages that are no longer visible
    renderedPages.forEach(pageNum => {
      if (!visiblePages.has(pageNum)) {
        cleanupPage(pageNum);
      }
    });

    // Render newly visible pages
    visiblePages.forEach(pageNum => {
      if (!renderedPages.has(pageNum)) {
        renderPage(pageNum);
      }
    });
  }, [pdfDoc, currentPage, scale, getVisiblePages, renderedPages, cleanupPage, renderPage]);

  // Clean up when component unmounts or PDF changes
  useEffect(() => {
    return () => {
      // Clean up all pages
      renderedPages.forEach(pageNum => {
        cleanupPage(pageNum);
      });
      
      // Clear page cache
      pageCache.current.clear();
    };
  }, [pdfDoc, renderedPages, cleanupPage]);

  // Get canvas for a specific page
  const getPageCanvas = useCallback((pageNum: number): HTMLCanvasElement | null => {
    return pageCanvases.current.get(pageNum) || null;
  }, []);

  // Check if a page is rendered
  const isPageRendered = useCallback((pageNum: number): boolean => {
    return renderedPages.has(pageNum);
  }, [renderedPages]);

  // Prefetch a page (render it without displaying)
  const prefetchPage = useCallback(async (pageNum: number): Promise<void> => {
    if (!pdfDoc || renderedPages.has(pageNum)) return;
    await renderPage(pageNum);
  }, [pdfDoc, renderedPages, renderPage]);

  return {
    virtualizedPages,
    renderedPages,
    getPageCanvas,
    isPageRendered,
    renderPage,
    cleanupPage,
    prefetchPage,
    visiblePages: getVisiblePages(currentPage)
  };
}