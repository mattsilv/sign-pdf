import * as pdfjs from "pdfjs-dist";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export async function loadPdfDocument(file: File): Promise<any> {
  const arrayBuffer = await file.arrayBuffer();
  return await pdfjs.getDocument({ data: arrayBuffer }).promise;
}

export async function renderPage(
  page: any,
  canvas: HTMLCanvasElement,
  scale: number
) {
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

  // Render the page
  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return viewport; // Return for coordinate mapping
}