import * as pdfjs from "pdfjs-dist";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadPdfDocument(file: File): Promise<any> {
  const arrayBuffer = await file.arrayBuffer();
  return await pdfjs.getDocument({ data: arrayBuffer }).promise;
}

// Track current render task to cancel if needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentRenderTask: any = null;

export async function renderPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  canvas: HTMLCanvasElement,
  scale: number
) {
  // Cancel any existing render operation on this canvas
  if (currentRenderTask) {
    try {
      currentRenderTask.cancel();
    } catch {
      // Ignore cancellation errors
    }
    currentRenderTask = null;
  }

  // IMPROVED: Use the actual page rotation to ensure viewer/export consistency
  // PDF coordinate system: origin at bottom-left, Y increases upward
  // Canvas coordinate system: origin at top-left, Y increases downward
  // Using the page's actual rotation ensures both viewer and export use the same orientation
  const pageRotation = page.rotate || 0;
  const viewport = page.getViewport({ scale, rotate: pageRotation });
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
  } catch (error: unknown) {
    // If it's a cancellation error, ignore it
    if ((error as Error)?.name === 'RenderingCancelledException') {
      console.log('PDF rendering cancelled, starting new render');
    } else {
      console.error('PDF rendering error:', error);
      throw error;
    }
  }

  return viewport; // Return for coordinate mapping
}