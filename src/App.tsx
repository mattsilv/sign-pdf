import { useState } from 'react';
import { PDFViewer } from './components/PDFViewer';
import { ToolPanel } from './components/ToolPanel';
import { Annotation } from './lib/types';
import { stampPdf } from './lib/pdf/export';
import { savePdf } from './lib/pdf/save';
import './App.css';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [selectedTool, setSelectedTool] = useState<'text' | 'signature' | 'check' | 'date'>('text');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

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

  const handleAnnotationAdd = (newAnnotation: Omit<Annotation, 'id'>) => {
    const annotation: Annotation = {
      ...newAnnotation,
      id: Date.now().toString(),
      type: selectedTool,
      ...(selectedTool === 'signature' && signatureDataUrl ? { pngDataUrl: signatureDataUrl } : {}),
      ...(selectedTool === 'date' ? { content: new Date().toLocaleDateString() } : {}),
    };
    setAnnotations(prev => [...prev, annotation]);
  };

  const handleExportPdf = async () => {
    if (!file || annotations.length === 0) return;
    
    setIsExporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const signedPdfBytes = await stampPdf(arrayBuffer, annotations);
      await savePdf(signedPdfBytes, `signed-${file.name}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
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
        <p>Privacy-first PDF signing - all processing happens in your browser</p>
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
              onClearAnnotations={handleClearAnnotations}
              onResetDocument={handleResetDocument}
              onExportPdf={handleExportPdf}
              hasAnnotations={annotations.length > 0}
              isExporting={isExporting}
            />
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
              onPageChange={setCurrentPage}
              onScaleChange={setScale}
            />
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
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
            <ul>
              {annotations.map(ann => (
                <li key={ann.id} className="annotation-item">
                  <span>Page {ann.pageIndex + 1}: {ann.type} - {ann.content || 'N/A'}</span>
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
    </div>
  );
}

export default App;