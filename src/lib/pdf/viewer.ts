import * as pdfjs from "pdfjs-dist";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export async function loadPdfDocument(file: File): Promise<any> {
  const arrayBuffer = await file.arrayBuffer();
  return await pdfjs.getDocument({ data: arrayBuffer }).promise;
}

// Track current render task to cancel if needed
let currentRenderTask: any = null;

export async function renderPage(
  page: any,
  canvas: HTMLCanvasElement,
  scale: number
) {
  // Cancel any existing render operation on this canvas
  if (currentRenderTask) {
    try {
      currentRenderTask.cancel();
    } catch (e) {
      // Ignore cancellation errors
    }
    currentRenderTask = null;
  }

  // CRITICAL: PDF.js viewport rotation fix
  // PDF coordinate system: origin at bottom-left, Y increases upward
  // Canvas coordinate system: origin at top-left, Y increases downward
  // The rotate: 0 parameter ensures PDF.js doesn't auto-rotate the document
  // Without this, PDFs may appear upside down or rotated incorrectly
  const viewport = page.getViewport({ scale, rotate: 0 });
  const ctx = canvas.getContext("2d")!;

  // Handle HiDPI
  const outputScale = window.devicePixelRatio || 1;
  
  // Set canvas dimensions
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  // Scale context for HiDPI if needed
  if (outputScale !== 1) {
    ctx.scale(outputScale, outputScale);
  }

  try {
    // Create and track the render task
    currentRenderTask = page.render({
      canvasContext: ctx,
      viewport,
    });
    
    // Wait for rendering to complete
    await currentRenderTask.promise;
    currentRenderTask = null;
  } catch (error: any) {
    // If it's a cancellation error, ignore it
    if (error?.name === 'RenderingCancelledException') {
      console.log('PDF rendering cancelled, starting new render');
    } else {
      console.error('PDF rendering error:', error);
      throw error;
    }
  }

  return viewport; // Return for coordinate mapping
}