/**
 * Coordinate System Documentation:
 * 
 * PDF Coordinate System:
 * - Origin: Bottom-left corner of the page
 * - Y-axis: Increases UPWARD
 * - Units: Points (1 point = 1/72 inch)
 * 
 * Canvas/CSS Coordinate System:
 * - Origin: Top-left corner
 * - Y-axis: Increases DOWNWARD
 * - Units: Pixels
 * 
 * PDF.js viewport handles the Y-axis flip internally when:
 * - convertToPdfPoint: Takes canvas coords (top-left origin) → PDF coords (bottom-left origin)
 * - convertToViewportPoint: Takes PDF coords → canvas coords
 * 
 * IMPORTANT: PDF.js returns arrays [x, y] not objects {x, y}
 * 
 * CRITICAL LESSON LEARNED:
 * Do NOT manually flip Y coordinates or add custom transformations!
 * PDF.js viewport.convertToPdfPoint() already handles all coordinate
 * transformations correctly. The coordinates it returns can be used
 * directly with pdf-lib for perfect WYSIWYG alignment.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFViewport = any;

export class CoordinateMapper {
  constructor(private viewport: PDFViewport) {}

  /**
   * Convert CSS/Canvas coordinates to PDF points for storage
   * @param x - X position in CSS pixels (from canvas click event)
   * @param y - Y position in CSS pixels (from canvas click event)
   * @returns [xPdf, yPdf] in PDF points with Y-axis properly flipped
   */
  toPdfPoint(x: number, y: number): [number, number] {
    // PDF.js convertToPdfPoint returns an array [x, y]
    // It automatically handles the Y-axis flip from canvas to PDF coords
    const result = this.viewport.convertToPdfPoint(x, y);
    
    // CRITICAL: PDF.js returns an array, not an object
    // Many bugs occur from assuming it returns {x, y}
    if (Array.isArray(result) && result.length >= 2) {
      return [result[0], result[1]] as [number, number];
    }
    
    // Fallback if PDF.js behavior changes (defensive programming)
    console.warn('Unexpected convertToPdfPoint result:', result);
    return [x, y];
  }

  /**
   * Convert PDF points to CSS/Canvas coordinates for rendering
   * @param xPdf - X position in PDF points
   * @param yPdf - Y position in PDF points
   * @returns [x, y] in CSS pixels with Y-axis properly flipped
   */
  toCssPoint(xPdf: number, yPdf: number): [number, number] {
    // PDF.js convertToViewportPoint returns an array [x, y]
    // It automatically handles the Y-axis flip from PDF to canvas coords
    const result = this.viewport.convertToViewportPoint(xPdf, yPdf);
    
    // CRITICAL: PDF.js returns an array, not an object
    if (Array.isArray(result) && result.length >= 2) {
      return [result[0], result[1]] as [number, number];
    }
    
    // Fallback if PDF.js behavior changes
    console.warn('Unexpected convertToViewportPoint result:', result);
    return [xPdf, yPdf];
  }
}