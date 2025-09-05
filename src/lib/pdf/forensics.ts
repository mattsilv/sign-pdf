import { PDFDocument, PDFPage, rgb, StandardFonts, PDFFont } from "pdf-lib";
import { ForensicData, ForensicsService } from "../forensics";

export class ForensicPageGenerator {
  static async addForensicPage(
    pdfDoc: PDFDocument, 
    forensicData: ForensicData,
    originalFilename?: string
  ): Promise<PDFDocument> {
    const page = pdfDoc.addPage();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = page.getSize();
    const margin = 50;
    const lineHeight = 14;
    let y = height - margin;
    
    // Title
    page.drawText('ELECTRONIC SIGNATURE VERIFICATION', {
      x: margin,
      y: y,
      size: 14,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    // Underline
    y -= 8;
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: width - margin, y: y },
      thickness: 2,
      color: rgb(0, 0, 0),
    });
    
    y -= 25;
    
    // Document info section
    const documentSection = {
      title: 'DOCUMENT INFORMATION',
      content: [
        `Document: ${originalFilename || 'signed-document.pdf'}`,
        `Document Hash (SHA-256): ${forensicData.documentHash}`,
        `Signed: ${ForensicsService.formatTimestamp(forensicData.timestamp)}`,
        `Signed at: https://sign.silv.app`,
        `Session ID: ${forensicData.sessionId}`,
        `Consent Given: ${ForensicsService.formatTimestamp(forensicData.consentTimestamp)}`,
      ]
    };
    
    const forensicSection = {
      title: 'FORENSIC FINGERPRINT',
      content: [
        `Unique Visitor ID: ${forensicData.visitorId}`,
        `Canvas Fingerprint: ${this.truncateText(forensicData.browserFingerprint.canvasFingerprint, 60)}`,
        `Connection Type: ${forensicData.browserFingerprint.connectionType}`,
        `Plugins Detected: ${forensicData.browserFingerprint.pluginsCount}`,
        `MIME Types: ${forensicData.browserFingerprint.mimeTypesCount}`,
      ]
    };
    
    const systemSection = {
      title: 'SYSTEM INFORMATION',
      content: [
        `Browser: ${forensicData.browserFingerprint.browserName} ${forensicData.browserFingerprint.browserVersion}`,
        `Operating System: ${forensicData.browserFingerprint.operatingSystem} ${forensicData.browserFingerprint.osVersion}`,
        `Platform: ${forensicData.browserFingerprint.platform}`,
        `IP Address: ${forensicData.ipAddress || 'Not Available'}`,
        `Timezone: ${forensicData.browserFingerprint.timezone}`,
        `Language: ${forensicData.browserFingerprint.language}`,
      ]
    };
    
    const deviceSection = {
      title: 'DEVICE & DISPLAY',
      content: [
        `Screen Resolution: ${forensicData.browserFingerprint.screenResolution}`,
        `Color Depth: ${forensicData.browserFingerprint.colorDepth}-bit`,
        `Available Screen: ${forensicData.browserFingerprint.availableScreenSize}`,
        `Window Size: ${forensicData.browserFingerprint.windowSize}`,
        `Hardware Cores: ${forensicData.browserFingerprint.hardwareConcurrency}`,
        ...(forensicData.browserFingerprint.deviceMemory ? [`Device Memory: ${forensicData.browserFingerprint.deviceMemory}GB`] : []),
      ]
    };
    
    // Add Document Information section
    y = this.addSection(page, documentSection.title, documentSection.content, margin, y, lineHeight, helveticaBold, helvetica);
    y -= 8;
    
    // Add Forensic Fingerprint section
    y = this.addSection(page, forensicSection.title, forensicSection.content, margin, y, lineHeight, helveticaBold, helvetica);
    y -= 8;
    
    // Add System Information and Device & Display side by side
    const columnWidth = (width - (margin * 2) - 20) / 2;
    const leftX = margin;
    const rightX = margin + columnWidth + 20;
    
    // Draw both section titles at the same height
    const sideBySideY = y;
    
    // System Information (left column)
    page.drawText(systemSection.title, {
      x: leftX,
      y: sideBySideY,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    // Device & Display (right column)
    page.drawText(deviceSection.title, {
      x: rightX,
      y: sideBySideY,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    // Draw underlines
    y = sideBySideY - 5;
    page.drawLine({
      start: { x: leftX, y: y },
      end: { x: leftX + 180, y: y },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    page.drawLine({
      start: { x: rightX, y: y },
      end: { x: rightX + 180, y: y },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    y -= lineHeight;
    
    // Draw content for both columns
    let leftY = y;
    let rightY = y;
    
    // System Information content
    for (const line of systemSection.content) {
      page.drawText(line, {
        x: leftX,
        y: leftY,
        size: 9,
        font: helvetica,
        color: rgb(0, 0, 0),
        maxWidth: columnWidth,
      });
      leftY -= lineHeight;
    }
    
    // Device & Display content
    for (const line of deviceSection.content) {
      page.drawText(line, {
        x: rightX,
        y: rightY,
        size: 9,
        font: helvetica,
        color: rgb(0, 0, 0),
        maxWidth: columnWidth,
      });
      rightY -= lineHeight;
    }
    
    // Set y to the lowest point
    y = Math.min(leftY, rightY) - 8;
    
    
    return pdfDoc;
  }
  
  private static addSection(
    page: PDFPage,
    title: string,
    content: string[],
    margin: number,
    startY: number,
    lineHeight: number,
    boldFont: PDFFont,
    regularFont: PDFFont
  ): number {
    let y = startY;
    
    // Section title
    page.drawText(title, {
      x: margin,
      y: y,
      size: 11,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Underline
    y -= 5;
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: margin + 200, y: y },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    y -= lineHeight;
    
    // Section content
    for (const line of content) {
      page.drawText(line, {
        x: margin,
        y: y,
        size: 9,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
    
    return y;
  }
  
  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

// Enhanced export function that includes forensic page
export async function stampPdfWithForensics(
  originalBytes: ArrayBuffer,
  annotations: unknown[],
  forensicData: ForensicData,
  originalFilename?: string
): Promise<Uint8Array> {
  // Import the existing stamp function to reuse its logic
  const { stampPdf } = await import('./export');
  
  // First, stamp the PDF with annotations
  const stampedPdfBytes = await stampPdf(originalBytes, annotations);
  
  // Then load the stamped PDF and add the forensic page
  const pdfDoc = await PDFDocument.load(stampedPdfBytes);
  const pdfWithForensics = await ForensicPageGenerator.addForensicPage(
    pdfDoc, 
    forensicData, 
    originalFilename
  );
  
  // Add PDF metadata
  pdfWithForensics.setTitle(`Electronically Signed: ${originalFilename || 'Document'}`);
  pdfWithForensics.setAuthor('PDF Signer - Privacy-First Electronic Signatures');
  pdfWithForensics.setSubject(`Electronically Signed Document with Forensic Documentation | Hash: ${forensicData.documentHash} | Fingerprint: ${forensicData.visitorId}`);
  pdfWithForensics.setKeywords([
    'electronic signature',
    'ESIGN Act compliant',
    'UETA compliant',
    'forensic documentation',
    'digitally signed',
    `document-hash-${forensicData.documentHash}`,
    `fingerprint-${forensicData.visitorId}`,
    `session-${forensicData.sessionId}`
  ]);
  pdfWithForensics.setProducer(`PDF Signer v1.0 | Session: ${forensicData.sessionId}`);
  pdfWithForensics.setCreator(`PDF Signer - Privacy-First Electronic Signatures | Fingerprint: ${forensicData.visitorId}`);
  pdfWithForensics.setCreationDate(new Date(forensicData.timestamp));
  pdfWithForensics.setModificationDate(new Date(forensicData.timestamp));
  
  return pdfWithForensics.save({ useObjectStreams: false });
}