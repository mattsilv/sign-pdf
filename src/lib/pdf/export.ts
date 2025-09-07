import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Annotation } from "../types";
import { getAnnotationAnchor } from "./geometry";

/**
 * CRITICAL: Coordinate System Documentation for pdf-lib
 * FIXED: Alignment issue - no double anchor application
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
    const pageSize = page.getSize();
    const pageRotation = page.getRotation();
    console.log(`📄 [EXPORT] Page ${pageIdx} dimensions: ${pageSize.width} x ${pageSize.height}, rotation: ${pageRotation}°`);

    for (const item of items) {
      console.log(`🔍 [EXPORT] Processing annotation: ${item.type}, ID: ${item.id}`);
      console.log(`   Has pngDataUrl: ${!!item.pngDataUrl}, Length: ${item.pngDataUrl ? item.pngDataUrl.length : 'N/A'}`);
      
      if (item.type === "signature" && item.pngDataUrl) {
        try {
          console.log(`🖼️  [EXPORT] Embedding PNG for signature at (${item.xPdf}, ${item.yPdf})`);
          const png = await pdfDoc.embedPng(item.pngDataUrl);
          const width = item.widthPdf || 160;
          const height = item.heightPdf || 60;
          const anchor = item.anchor || getAnnotationAnchor(item.type);
          
          console.log(`📄 [EXPORT] Page size: ${pageSize.width}x${pageSize.height}`);
          console.log(`🎯 [EXPORT] Using coordinates: (${item.xPdf}, ${item.yPdf})`);
          console.log(`📏 [EXPORT] Using dimensions: ${width}x${height}`);
          console.log(`⚓ [EXPORT] Anchor: ${anchor} (already applied during placement)`);
          
          // IMPORTANT: Do NOT apply anchor offset here!
          // The stored xPdf/yPdf already represents where the element should be drawn.
          // For signatures with 'center' anchor, the stored position is already the center point.
          // We need to calculate the bottom-left corner for pdf-lib's drawImage.
          let finalX = item.xPdf;
          let finalY = item.yPdf;
          
          // For center-anchored elements, adjust to get bottom-left corner
          if (anchor === 'center') {
            console.log(`🔧 [EXPORT-FIX] Adjusting center anchor: (${item.xPdf}, ${item.yPdf}) - (${width/2}, ${height/2})`);
            finalX = item.xPdf - width / 2;
            finalY = item.yPdf - height / 2;
            console.log(`🔧 [EXPORT-FIX] Result: (${finalX}, ${finalY})`);
          }
          // baseline-left anchored text is already at the correct position
          // (pdf-lib drawText uses baseline positioning)
          
          console.log(`📐 [EXPORT] Drawing signature: ${width}x${height} at (${finalX}, ${finalY})`);
          console.log(`⚠️  [EXPORT] BOUNDS CHECK: Page=${pageSize.width}x${pageSize.height}, Signature bounds: X(${finalX} to ${finalX + width}), Y(${finalY} to ${finalY + height})`);
          
          // Check if signature is outside page bounds
          if (finalX < 0 || finalX + width > pageSize.width || finalY < 0 || finalY + height > pageSize.height) {
            console.error(`❌ [EXPORT] SIGNATURE OUTSIDE PAGE BOUNDS! This is why it's not visible.`);
          }
          
          page.drawImage(png, {
            x: finalX,
            y: finalY,
            width: width,
            height: height,
          });
          
          console.log(`✅ [EXPORT] Signature drawn successfully`);
        } catch (error) {
          console.error(`❌ [EXPORT] Error processing signature:`, error);
        }
      } else if ((item.type === "text" || item.type === "date") && item.content) {
        const anchor = item.anchor || getAnnotationAnchor(item.type);
        
        console.log(`🔍 [EXPORT] ${item.type} annotation #${item.orderNumber || '?'}`);
        console.log(`   Content: "${item.content}"`);
        console.log(`   PDF coordinates: (${item.xPdf}, ${item.yPdf})`);
        console.log(`   Font size: ${fontSize}px, Page: ${pageIdx + 1}`);
        console.log(`   Anchor: ${anchor} (already applied during placement)`);
        
        // For text with baseline-left anchor, the stored position is already correct
        // pdf-lib's drawText positions text at the baseline, which matches our stored coordinates
        const finalX = item.xPdf;
        const finalY = item.yPdf;
        
        console.log(`📐 [EXPORT] Drawing text at: (${finalX}, ${finalY})`);
        
        page.drawText(item.content, {
          x: finalX,
          y: finalY,
          size: fontSize,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
      } else if (item.type === "check") {
        const size = item.widthPdf || 20;
        const height = item.heightPdf || 20;
        const anchor = item.anchor || getAnnotationAnchor(item.type);
        
        // For center-anchored checkmarks, adjust to get bottom-left corner
        let offsetX = item.xPdf;
        let offsetY = item.yPdf;
        
        if (anchor === 'center') {
          offsetX = item.xPdf - size / 2;
          offsetY = item.yPdf - height / 2;
        }
        
        console.log(`✓ [EXPORT] Drawing checkmark: ${size}x${height} at (${offsetX}, ${offsetY}), anchor: ${anchor} (already applied)`);
        
        // Draw vector checkmark
        page.drawLine({
          start: { x: offsetX, y: offsetY + height / 2 },
          end: { x: offsetX + size * 0.4, y: offsetY + height * 0.2 },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
        page.drawLine({
          start: { x: offsetX + size * 0.4, y: offsetY + height * 0.2 },
          end: { x: offsetX + size, y: offsetY + height * 0.9 },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  return pdfDoc.save({ useObjectStreams: false });
}