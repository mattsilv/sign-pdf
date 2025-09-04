import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Annotation } from "../types";

export async function stampPdf(
  originalBytes: ArrayBuffer,
  annotations: Annotation[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  pdfDoc.registerFontkit(fontkit);

  // Embed resources once
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

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
        page.drawImage(png, {
          x: item.xPdf,
          y: item.yPdf,
          width: item.widthPdf || 100,
          height: item.heightPdf || 50,
        });
      } else if (item.type === "text" && item.content) {
        page.drawText(item.content, {
          x: item.xPdf,
          y: item.yPdf,
          size: 12,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
      } else if (item.type === "check") {
        // Vector checkmark
        const size = 20;
        page.drawLine({
          start: { x: item.xPdf, y: item.yPdf },
          end: { x: item.xPdf + size * 0.4, y: item.yPdf - size * 0.3 },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
        page.drawLine({
          start: { x: item.xPdf + size * 0.4, y: item.yPdf - size * 0.3 },
          end: { x: item.xPdf + size, y: item.yPdf + size * 0.7 },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  return pdfDoc.save({ useObjectStreams: false });
}