import { useState } from 'react';
import { PDFViewer } from './components/PDFViewer';
import { VirtualizedPDFViewer } from './components/VirtualizedPDFViewer';
import { ToolPanel } from './components/ToolPanel';
import { ConsentModal } from './components/ConsentModal';
import { CoordinateDebugger } from './components/CoordinateDebugger';
import { Annotation } from './lib/types';
// Forensics lazy loaded on demand to reduce initial bundle
import { ForensicsService } from './lib/forensics';
import { savePdf } from './lib/pdf/save';
import './App.css';

function App() {
  // Note: Debug components removed - see git history for playground/test modes

  const [file, setFile] = useState<File | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [selectedTool, setSelectedTool] = useState<'text' | 'signature' | 'check' | 'date'>('text');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [enableCompliance, setEnableCompliance] = useState(false);
  
  // Feature flag: Enable virtualization for better performance with large PDFs
  const useVirtualization = true; // Set to true to enable page virtualization

  // Preload export dependencies when hovering export button
  const handleExportHover = () => {
    import('./lib/pdf/export.lazy');
    if (enableCompliance) {
      import('./lib/pdf/forensics.lazy');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setAnnotations([]);
      setCurrentPage(1);
    }
  };

  const loadSampleDocument = async () => {
    setIsLoadingSample(true);
    try {
      const response = await fetch('/sample-nda.pdf');
      const blob = await response.blob();
      const sampleFile = new File([blob], 'sample-nda.pdf', { type: 'application/pdf' });
      setFile(sampleFile);
      setAnnotations([]);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load sample document:', error);
      alert('Failed to load sample document. Please try uploading your own PDF.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleAnnotationAdd = (newAnnotation: Omit<Annotation, 'id' | 'orderNumber'>) => {
    // Calculate the next order number
    const maxOrderNumber = Math.max(0, ...annotations.map(a => a.orderNumber || 0));
    
    const annotation: Annotation = {
      ...newAnnotation,
      id: Date.now().toString(),
      orderNumber: maxOrderNumber + 1,
      type: selectedTool,
      ...(selectedTool === 'signature' && signatureDataUrl ? { pngDataUrl: signatureDataUrl } : {}),
      ...(selectedTool === 'signature' ? { content: newAnnotation.content || 'Signature' } : {}),
      ...(selectedTool === 'date' ? { content: new Date().toLocaleDateString() } : {}),
      ...(selectedTool === 'check' ? { content: '✓' } : {}),
    };
    setAnnotations(prev => [...prev, annotation]);
  };

  const handleExportPdf = async () => {
    if (!file || annotations.length === 0) return;
    
    if (enableCompliance) {
      // Show consent modal for compliant signing
      setShowConsentModal(true);
    } else {
      // Simple export without forensic features
      await handleSimpleExport();
    }
  };

  const handleSimpleExport = async () => {
    if (!file || annotations.length === 0) return;
    
    setIsExporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Use lazy-loaded export to reduce initial bundle size
      const { stampPdfLazy } = await import('./lib/pdf/export.lazy');
      const stampedPdfBytes = await stampPdfLazy(arrayBuffer, annotations);
      
      // Generate filename with today's date
      const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\//g, '-');
      
      // Remove original extension and add date
      const baseName = file.name.replace(/\.pdf$/i, '');
      const filename = `${baseName}-${today}.pdf`;
      
      await savePdf(stampedPdfBytes, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleConsentGiven = async () => {
    if (!file || annotations.length === 0) return;
    
    setIsExporting(true);
    try {
      const consentTimestamp = new Date().toISOString();
      const arrayBuffer = await file.arrayBuffer();
      
      // Collect forensic data
      const forensicData = await ForensicsService.collectForensicData(
        arrayBuffer, 
        consentTimestamp
      );
      
      // Generate signed PDF with forensic page (lazy-loaded)
      const { stampPdfWithForensicsLazy } = await import('./lib/pdf/forensics.lazy');
      const signedPdfBytes = await stampPdfWithForensicsLazy(
        arrayBuffer, 
        annotations, 
        forensicData, 
        file.name
      );
      
      // Generate filename with today's date
      const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\//g, '-');
      
      // Remove original extension and add date
      const baseName = file.name.replace(/\.pdf$/i, '');
      const filename = `${baseName}-signed-${today}.pdf`;
      
      await savePdf(signedPdfBytes, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
      setShowConsentModal(false);
    }
  };

  const handleClearAnnotations = () => {
    if (annotations.length > 0) {
      const confirmed = window.confirm('Are you sure you want to clear all annotations?');
      if (confirmed) {
        setAnnotations([]);
      }
    }
  };

  const handleResetDocument = () => {
    const confirmed = window.confirm('Are you sure you want to start over? This will remove the document and all annotations.');
    if (confirmed) {
      setFile(null);
      setAnnotations([]);
      setCurrentPage(1);
      setSignatureDataUrl(null);
    }
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
    if (selectedAnnotationId === annotationId) {
      setSelectedAnnotationId(null);
    }
  };

  const handleAnnotationUpdate = (id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(ann => 
      ann.id === id ? { ...ann, ...updates } : ann
    ));
  };

  const handleAnnotationSelect = (id: string | null) => {
    setSelectedAnnotationId(id);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF Signer</h1>
        <p>
          <a href="https://github.com/mattsilv/sign-pdf" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Open-source
          </a>
          {' '}privacy-first PDF signing - all processing happens in your browser
        </p>
      </header>

      <main className="app-main">
        {!file ? (
          <div className="file-upload-container">
            <div className="file-upload">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                id="pdf-input"
                className="file-input"
              />
              <label htmlFor="pdf-input" className="file-label">
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ marginRight: '8px', verticalAlign: 'middle' }}
                >
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
                Select PDF from your computer
              </label>
            </div>
            <div className="sample-document-section">
              <p className="or-divider">— or —</p>
              <button 
                className="sample-document-link"
                onClick={loadSampleDocument}
                disabled={isLoadingSample}
              >
                {isLoadingSample ? 'Loading...' : 'Try with Sample NDA Document'}
              </button>
              <p className="sample-description">
                Test the signing tool with a sample mutual NDA document
              </p>
            </div>
          </div>
        ) : (
          <>
            <ToolPanel
              onSignatureCreate={setSignatureDataUrl}
              onToolSelect={setSelectedTool}
              selectedTool={selectedTool}
              onResetDocument={handleResetDocument}
              onExportPdf={handleExportPdf}
              onExportHover={handleExportHover}
              hasAnnotations={annotations.length > 0}
              isExporting={isExporting}
              signatureDataUrl={signatureDataUrl}
              enableCompliance={enableCompliance}
              onComplianceChange={setEnableCompliance}
              currentScale={scale}
              onScaleChange={setScale}
            />
            {useVirtualization ? (
              <VirtualizedPDFViewer
                file={file}
                annotations={annotations}
                currentPage={currentPage}
                scale={scale}
                selectedTool={selectedTool}
                signatureDataUrl={signatureDataUrl}
                selectedAnnotationId={selectedAnnotationId}
                onAnnotationAdd={handleAnnotationAdd}
                onAnnotationUpdate={handleAnnotationUpdate}
                onAnnotationSelect={handleAnnotationSelect}
                onAnnotationDelete={handleDeleteAnnotation}
                onPageChange={setCurrentPage}
                onScaleChange={setScale}
                showThumbnails={true}
              />
            ) : (
              <PDFViewer
                file={file}
                annotations={annotations}
                currentPage={currentPage}
                scale={scale}
                selectedTool={selectedTool}
                signatureDataUrl={signatureDataUrl}
                selectedAnnotationId={selectedAnnotationId}
                onAnnotationAdd={handleAnnotationAdd}
                onAnnotationUpdate={handleAnnotationUpdate}
                onAnnotationSelect={handleAnnotationSelect}
                onAnnotationDelete={handleDeleteAnnotation}
                onPageChange={setCurrentPage}
                onScaleChange={setScale}
              />
            )}
          </>
        )}

        {annotations.length > 0 && (
          <div className="annotations-panel">
            <div className="annotations-header">
              <h3>Annotations ({annotations.length})</h3>
              <button 
                className="export-button"
                onClick={handleExportPdf}
                disabled={isExporting}
              >
                {isExporting 
                  ? (enableCompliance ? 'Signing & Exporting...' : 'Exporting...')
                  : (enableCompliance ? 'Sign & Export PDF' : 'Download PDF')
                }
              </button>
            </div>
            <ul>
              {annotations.map(ann => (
                <li key={ann.id} className="annotation-item">
                  <span>#{ann.orderNumber || '?'} - Page {ann.pageIndex + 1}: {ann.type} - {ann.content || 'N/A'}</span>
                  <button 
                    className="delete-annotation-button"
                    onClick={() => handleDeleteAnnotation(ann.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="annotations-footer">
              <button 
                className="clear-all-annotations-button"
                onClick={handleClearAnnotations}
              >
                Clear All Annotations
              </button>
            </div>
          </div>
        )}
      </main>

      <ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsent={handleConsentGiven}
        documentName={file?.name}
      />

      {/* Debug overlay for coordinate tracking */}
      <CoordinateDebugger />
      
      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="testimonial-card">
          <blockquote className="testimonial-quote">
            <span className="quote-mark">"</span>
            <p className="quote-text">
              Tried it out and downloaded the sample. Pretty nice.<br />
              Better than Adobe® imo.
            </p>
            <span className="quote-mark closing">"</span>
          </blockquote>
          <cite className="testimonial-author">
            — A Real Attorney <span className="disclaimer">(not legal advice)</span>
          </cite>
        </div>
      </section>

      <footer className="app-footer">
        <div className="legal-compliance-info">
          <div className="compliance-badge">🔒 Optional ESIGN Act & UETA Compliance</div>
          <p className="compliance-text">
            When enabled, creates binding signatures with forensic browser fingerprint added to end of your PDF. By these methods combined with your email and the document, it should adhere to e-sign requirements. You must still manually email the PDF to recipient.
          </p>
          <p className="legal-disclaimer">
            <br />
            <strong>*Not legal advice.</strong> This tool provides technical compliance features when enabled. 
            Forensic information is only collected and added to the PDF if you check the compliance option. 
            Consult with an attorney for legal guidance on your specific use case.
            <br /><br />
            Adobe® is a registered trademark of Adobe Inc.
          </p>
        </div>
        <div className="attribution">
          <a href="https://github.com/mattsilv/sign-pdf" target="_blank" rel="noopener noreferrer">
            MIT licensed open-source app
          </a>
          {' '}for public good by{' '}
          <a href="https://www.silv.app" target="_blank" rel="noopener noreferrer">
            silv.app
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;