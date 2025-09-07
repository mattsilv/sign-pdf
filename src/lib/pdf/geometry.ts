/**
 * Centralized Geometry System - Single Source of Truth for All Coordinate Operations
 * 
 * This module consolidates ALL positioning, scaling, and anchor logic to prevent
 * coordinate drift between UI rendering and PDF export.
 * 
 * Key Principles:
 * 1. All positions stored in PDF coordinate space (bottom-left origin, points)
 * 2. All dimensions stored in PDF points 
 * 3. UI coordinates converted via viewport transforms only
 * 4. Explicit anchor handling for each annotation type
 * 5. No manual scaling/flipping - use PDF.js viewport exclusively
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFViewport = any;

export type AnchorType = 
  | 'center'           // Center on click point (signatures, checks)
  | 'baseline-left'    // Text baseline at click point (text, dates)
  | 'top-left'         // Top-left at click point
  | 'bottom-left';     // Bottom-left at click point

export interface AnnotationGeometry {
  xPdf: number;        // Position in PDF points
  yPdf: number;        // Position in PDF points  
  widthPdf: number;    // Width in PDF points
  heightPdf: number;   // Height in PDF points
  anchor: AnchorType;  // How to position relative to click point
}

export interface FontMetrics {
  ascent: number;      // Height above baseline in pixels
  descent: number;     // Height below baseline in pixels
  baseline: number;    // Baseline offset from top in pixels
}

/**
 * Get the canonical anchor type for each annotation type
 */
export function getAnnotationAnchor(annotationType: string): AnchorType {
  switch (annotationType) {
    case 'signature':
    case 'check':
      return 'center';
    case 'text':
    case 'date':
      return 'baseline-left';
    default:
      return 'center';
  }
}

/**
 * Get default dimensions for annotation types (in PDF points)
 */
export function getDefaultDimensions(annotationType: string): { width: number; height: number } {
  switch (annotationType) {
    case 'signature':
      return { width: 160, height: 60 };
    case 'check':
      return { width: 20, height: 20 };
    case 'text':
    case 'date':
      // Estimated based on font size - will be refined with actual text metrics
      return { width: 100, height: 16 }; // 12pt font ≈ 16pt height
    default:
      return { width: 50, height: 20 };
  }
}

/**
 * Centralized coordinate converter - replaces scattered coordinate logic
 */
export class GeometryManager {
  constructor(private viewport: PDFViewport, private pageSize?: { width: number; height: number }) {}

  /**
   * Get the actual rotation from the PDF page
   */
  getPageRotation(): number {
    // PDF.js viewport includes rotation information
    return this.viewport.rotation || 0;
  }

  /**
   * Convert CSS/Canvas coordinates to PDF points
   */
  toPdfPoint(cssX: number, cssY: number): [number, number] {
    const result = this.viewport.convertToPdfPoint(cssX, cssY);
    if (Array.isArray(result) && result.length >= 2) {
      return [result[0], result[1]];
    }
    console.warn('Unexpected convertToPdfPoint result:', result);
    return [cssX, cssY];
  }

  /**
   * Convert PDF points to CSS coordinates
   */
  toCssPoint(xPdf: number, yPdf: number): [number, number] {
    const result = this.viewport.convertToViewportPoint(xPdf, yPdf);
    if (Array.isArray(result) && result.length >= 2) {
      return [result[0], result[1]];
    }
    console.warn('Unexpected convertToViewportPoint result:', result);
    return [xPdf, yPdf];
  }

  /**
   * Convert PDF dimensions to CSS dimensions using viewport scale
   */
  pdfDimsToCssDims(widthPdf: number, heightPdf: number): [number, number] {
    const cssWidth = widthPdf * this.viewport.scale;
    const cssHeight = heightPdf * this.viewport.scale;
    return [cssWidth, cssHeight];
  }

  /**
   * Convert CSS dimensions to PDF dimensions using viewport scale
   */
  cssDimsToPdfDims(cssWidth: number, cssHeight: number): [number, number] {
    const widthPdf = cssWidth / this.viewport.scale;
    const heightPdf = cssHeight / this.viewport.scale;
    return [widthPdf, heightPdf];
  }

  /**
   * Apply anchor offset to get final draw position for PDF export
   * Returns the bottom-left corner position for pdf-lib drawing
   */
  applyAnchor(xPdf: number, yPdf: number, widthPdf: number, heightPdf: number, anchor: AnchorType): [number, number] {
    switch (anchor) {
      case 'center':
        return [xPdf - widthPdf / 2, yPdf - heightPdf / 2];
      case 'baseline-left':
        // For text: click point is baseline, no horizontal offset
        return [xPdf, yPdf];
      case 'top-left':
        return [xPdf, yPdf - heightPdf];
      case 'bottom-left':
        return [xPdf, yPdf];
      default:
        return [xPdf, yPdf];
    }
  }

  /**
   * Apply anchor offset for CSS positioning
   * Returns CSS transform to position element correctly
   */
  getAnchorTransform(anchor: AnchorType): string {
    switch (anchor) {
      case 'center':
        return 'translate(-50%, -50%)';
      case 'baseline-left':
        // Text baseline positioning - will be refined with font metrics
        return '';
      case 'top-left':
        return '';
      case 'bottom-left':
        return 'translateY(-100%)';
      default:
        return '';
    }
  }

  /**
   * Convert drag delta from CSS to PDF coordinates
   * Replaces manual division and Y-flipping
   */
  convertDragDelta(cssStartX: number, cssStartY: number, cssEndX: number, cssEndY: number): [number, number] {
    const [pdfStartX, pdfStartY] = this.toPdfPoint(cssStartX, cssStartY);
    const [pdfEndX, pdfEndY] = this.toPdfPoint(cssEndX, cssEndY);
    return [pdfEndX - pdfStartX, pdfEndY - pdfStartY];
  }

  /**
   * Get page boundaries in PDF coordinates for clamping
   */
  getPageBounds(): { width: number; height: number } {
    // Use actual page size if provided, otherwise calculate from viewport
    if (this.pageSize) {
      console.log(`📏 [BOUNDS] Using actual page size: ${this.pageSize.width}x${this.pageSize.height} PDF points`);
      return this.pageSize;
    }
    
    // Fallback: PDF.js viewport dimensions are in CSS pixels at current scale
    // Convert back to PDF points for boundary checking
    const pageWidthPdf = this.viewport.width / this.viewport.scale;
    const pageHeightPdf = this.viewport.height / this.viewport.scale;
    
    console.log(`📏 [BOUNDS] Viewport: ${this.viewport.width}x${this.viewport.height} (scale: ${this.viewport.scale})`);
    console.log(`📏 [BOUNDS] Calculated page bounds: ${pageWidthPdf}x${pageHeightPdf} PDF points`);
    
    return { width: pageWidthPdf, height: pageHeightPdf };
  }

  /**
   * Clamp annotation to stay within page bounds
   */
  clampToPage(xPdf: number, yPdf: number, widthPdf: number, heightPdf: number, anchor: AnchorType): [number, number] {
    const bounds = this.getPageBounds();
    const [drawX, drawY] = this.applyAnchor(xPdf, yPdf, widthPdf, heightPdf, anchor);
    
    // Clamp the draw position to ensure the annotation stays on page
    const clampedDrawX = Math.max(0, Math.min(bounds.width - widthPdf, drawX));
    const clampedDrawY = Math.max(0, Math.min(bounds.height - heightPdf, drawY));
    
    // Convert back to anchor position
    switch (anchor) {
      case 'center':
        return [clampedDrawX + widthPdf / 2, clampedDrawY + heightPdf / 2];
      case 'baseline-left':
        return [clampedDrawX, clampedDrawY];
      case 'top-left':
        return [clampedDrawX, clampedDrawY + heightPdf];
      case 'bottom-left':
        return [clampedDrawX, clampedDrawY];
      default:
        return [xPdf, yPdf];
    }
  }
}

/**
 * Font metrics helper for baseline-correct text rendering
 */
export class FontMetricsHelper {
  private static canvas: HTMLCanvasElement | null = null;
  private static context: CanvasRenderingContext2D | null = null;

  /**
   * Get font metrics for the standard font used in both UI and PDF
   */
  static getFontMetrics(fontSize: number = 12): FontMetrics {
    // Initialize canvas if needed
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
    }

    if (!this.context) {
      // Fallback if canvas not available
      return {
        ascent: fontSize * 0.8,
        descent: fontSize * 0.2,
        baseline: fontSize * 0.8
      };
    }

    // Set font to match what we use in UI and PDF
    this.context.font = `${fontSize}px Helvetica, Arial, sans-serif`;
    
    // Measure text metrics
    const metrics = this.context.measureText('Ag'); // Use 'Ag' to get good ascent/descent
    
    return {
      ascent: metrics.actualBoundingBoxAscent || fontSize * 0.8,
      descent: metrics.actualBoundingBoxDescent || fontSize * 0.2,
      baseline: metrics.actualBoundingBoxAscent || fontSize * 0.8
    };
  }

  /**
   * Get baseline offset for CSS positioning to match PDF baseline
   */
  static getBaselineOffset(fontSize: number = 12): number {
    const metrics = this.getFontMetrics(fontSize);
    return metrics.baseline;
  }
}

/**
 * Create a complete annotation geometry object with all required properties
 */
export function createAnnotationGeometry(
  xPdf: number,
  yPdf: number,
  annotationType: string,
  customWidth?: number,
  customHeight?: number
): AnnotationGeometry {
  const anchor = getAnnotationAnchor(annotationType);
  const defaults = getDefaultDimensions(annotationType);
  
  return {
    xPdf,
    yPdf,
    widthPdf: customWidth || defaults.width,
    heightPdf: customHeight || defaults.height,
    anchor
  };
}