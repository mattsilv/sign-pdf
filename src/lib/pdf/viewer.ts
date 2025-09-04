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
  const viewport = page.getViewport({ scale });
  const ctx = canvas.getContext("2d")!;

  // Handle HiDPI
  const outputScale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  await page.render({
    canvasContext: ctx,
    viewport,
    transform:
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
  }).promise;

  return viewport; // Return for coordinate mapping
}