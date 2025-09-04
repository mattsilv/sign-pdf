import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Annotation } from "../types";

/**
 * CRITICAL: Coordinate System Documentation for pdf-lib
 * 
 * pdf-lib uses PDF coordinate system:
 * - Origin: Bottom-left corner (0,0)
 * - Y increases upward
 * 
 * Our stored coordinates (xPdf, yPdf) are already in PDF coordinate space
 * from the PDF.js conversion, so they should work directly with pdf-lib.
 * 
 * However, there are anchor point considerations:
 * - drawText: Positions text at the baseline (not top-left)
 * - drawImage: Positions at bottom-left corner
 * 
 * The issue is that PDF.js convertToPdfPoint gives us the click point,
 * but we need to adjust for how pdf-lib anchors elements.
 */
export async function stampPdf(
  originalBytes: ArrayBuffer,
  annotations: Annotation[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  pdfDoc.registerFontkit(fontkit);

  // Embed resources once
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;

  // Group by page for efficiency
  const byPage = new Map<number, Annotation[]>();
  annotations.forEach((a) => {
    if (!byPage.has(a.pageIndex)) byPage.set(a.pageIndex, []);
    byPage.get(a.pageIndex)!.push(a);
  });

  // Stamp each page
  for (const [pageIdx, items] of byPage) {
    const page = pdfDoc.getPage(pageIdx);

    for (const item of items) {
      if (item.type === "signature" && item.pngDataUrl) {
        const png = await pdfDoc.embedPng(item.pngDataUrl);
        const width = item.widthPdf || 100;
        const height = item.heightPdf || 50;
        
        // CRITICAL FIX: Center the signature on the click point
        // The UI shows the signature centered on the click point,
        // so we need to offset by half width/height
        page.drawImage(png, {
          x: item.xPdf - width / 2,
          y: item.yPdf - height / 2,
          width: width,
          height: height,
        });
      } else if (item.type === "text" && item.content) {
        // IMPORTANT: PDF coordinates from PDF.js are already correct
        // pdf-lib's drawText positions text at the baseline
        // The xPdf, yPdf coordinates we stored are exactly where the user clicked
        // and PDF.js has already done the coordinate transformation
        
        page.drawText(item.content, {
          x: item.xPdf,
          y: item.yPdf,  // Use the exact coordinates without adjustment
          size: fontSize,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
      } else if (item.type === "check") {
        // Vector checkmark - centered on click point
        const size = 20;
        const offsetX = item.xPdf - size / 2;
        const offsetY = item.yPdf - size / 2;
        
        page.drawLine({
          start: { x: offsetX, y: offsetY + size / 2 },
          end: { x: offsetX + size * 0.4, y: offsetY + size * 0.2 },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
        page.drawLine({
          start: { x: offsetX + size * 0.4, y: offsetY + size * 0.2 },
          end: { x: offsetX + size, y: offsetY + size * 0.9 },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  return pdfDoc.save({ useObjectStreams: false });
}