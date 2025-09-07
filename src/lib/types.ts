import { AnchorType } from './pdf/geometry';

export interface Annotation {
  id: string;
  pageIndex: number;
  xPdf: number; // PDF coordinates (1/72 inch)
  yPdf: number; // Bottom-left origin
  widthPdf?: number;
  heightPdf?: number;
  type: "signature" | "text" | "check" | "date";
  content?: string;
  pngDataUrl?: string; // For signatures
  orderNumber: number; // Display order number for the annotation
  anchor?: AnchorType; // How to position relative to click point
}