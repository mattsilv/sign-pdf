import { Annotation } from "../types";

/**
 * Lazy-loaded wrapper for PDF export functionality
 * This reduces initial bundle size by ~720KB
 */
export async function stampPdfLazy(
  originalBytes: ArrayBuffer,
  annotations: Annotation[]
): Promise<Uint8Array> {
  // Dynamic import of heavy pdf-lib and fontkit libraries
  const { stampPdf } = await import('./export');
  return stampPdf(originalBytes, annotations);
}

/**
 * Preload export dependencies for better UX
 * Call this when user hovers over or focuses the export button
 */
export function preloadExportDependencies(): void {
  import('./export');
}