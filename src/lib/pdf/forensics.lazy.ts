import { Annotation } from "../types";
import { ForensicData } from "../forensics";

/**
 * Lazy-loaded wrapper for PDF forensics functionality
 * This keeps the heavy pdf-lib and fontkit libraries out of the initial bundle
 */
export async function stampPdfWithForensicsLazy(
  originalBytes: ArrayBuffer,
  annotations: Annotation[],
  forensicData: ForensicData,
  originalFileName: string
): Promise<Uint8Array> {
  // Dynamic import of heavy dependencies
  const { stampPdfWithForensics } = await import('./forensics');
  return stampPdfWithForensics(originalBytes, annotations, forensicData, originalFileName);
}

/**
 * Preload forensics dependencies
 * Call when user toggles compliance mode
 */
export function preloadForensicsDependencies(): void {
  import('./forensics');
}