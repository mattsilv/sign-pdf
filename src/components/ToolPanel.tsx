import { useState, useEffect } from 'react';
import { SignaturePadModal } from './SignaturePad';

const STORAGE_KEY = 'pdfSigner_signature';

interface ToolPanelProps {
  onSignatureCreate: (dataUrl: string) => void;
  onToolSelect: (tool: 'text' | 'signature' | 'check' | 'date') => void;
  selectedTool: string;
  onResetDocument: () => void;
  onExportPdf: () => void;
  hasAnnotations: boolean;
  isExporting: boolean;
  signatureDataUrl: string | null;
}

export function ToolPanel({ 
  onSignatureCreate, 
  onToolSelect, 
  selectedTool, 
  onResetDocument, 
  onExportPdf, 
  hasAnnotations, 
  isExporting,
  signatureDataUrl
}: ToolPanelProps) {
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false);
  const [hasStoredSignature, setHasStoredSignature] = useState(false);

  // Check for stored signature on mount and when signatureDataUrl changes
  useEffect(() => {
    const checkStoredSignature = () => {
      try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        setHasStoredSignature(!!storedData || !!signatureDataUrl);
      } catch (error) {
        console.error('Error checking stored signature:', error);
        setHasStoredSignature(!!signatureDataUrl);
      }
    };

    checkStoredSignature();
    
    // Listen for storage changes
    window.addEventListener('storage', checkStoredSignature);
    return () => window.removeEventListener('storage', checkStoredSignature);
  }, [signatureDataUrl]);

  const handleSignatureSave = (dataUrl: string) => {
    onSignatureCreate(dataUrl);
    onToolSelect('signature');
    setHasStoredSignature(true);
  };

  const tools = [
    { id: 'text', label: 'Text', icon: 'T' },
    { id: 'signature', label: 'Signature', icon: '✍️' },
    { id: 'check', label: 'Checkmark', icon: '✓' },
    { id: 'date', label: 'Date', icon: '📅' }
  ] as const;

  return (
    <div className="tool-panel">
      <h3>Tools</h3>
      <div className="tool-panel-row">
        <div className="tool-buttons">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`tool-button ${selectedTool === tool.id ? 'active' : ''}`}
              onClick={() => {
                if (tool.id === 'signature') {
                  // If signature exists (either in memory or localStorage), just select the tool
                  if (hasStoredSignature) {
                    onToolSelect('signature');
                    // Load the signature if needed
                    if (!signatureDataUrl) {
                      const storedData = localStorage.getItem(STORAGE_KEY);
                      if (storedData) {
                        const parsed = JSON.parse(storedData);
                        
                        // Check if we have a dataUrl or need to generate one from text
                        if (parsed.mode === 'draw' && parsed.data) {
                          // For drawn signatures, data is the dataUrl
                          onSignatureCreate(parsed.data);
                        } else if (parsed.mode === 'type' && parsed.data) {
                          // For typed signatures, data is the text - need to convert to image
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            canvas.width = 640;
                            canvas.height = 240;
                            ctx.fillStyle = 'black';
                            ctx.font = 'italic 96px "Brush Script MT", "Lucida Handwriting", "Apple Chancery", cursive';
                            ctx.textBaseline = 'middle';
                            ctx.textAlign = 'center';
                            ctx.fillText(parsed.data, canvas.width / 2, canvas.height / 2);
                            const dataUrl = canvas.toDataURL('image/png');
                            onSignatureCreate(dataUrl);
                          }
                        }
                      }
                    }
                  } else {
                    setIsSignaturePadOpen(true);
                  }
                } else {
                  onToolSelect(tool.id);
                }
              }}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="tool-actions">
          {hasAnnotations && (
            <button 
              className="export-button compact"
              onClick={onExportPdf}
              disabled={isExporting}
            >
              <svg 
                className="button-icon" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          )}
          <button 
            className="reset-document-button compact"
            onClick={onResetDocument}
          >
            <svg 
              className="button-icon" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            Start Over
          </button>
          {hasStoredSignature && (
            <button 
              className="edit-signature-link compact"
              onClick={() => setIsSignaturePadOpen(true)}
              style={{
                background: 'transparent',
                color: '#2563eb',
                border: 'none',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: '0.25rem 0.5rem',
                marginLeft: '0.5rem'
              }}
            >
              Edit Signature
            </button>
          )}
        </div>
      </div>

      <SignaturePadModal
        isOpen={isSignaturePadOpen}
        onClose={() => setIsSignaturePadOpen(false)}
        onSave={handleSignatureSave}
        existingSignature={signatureDataUrl}
      />
    </div>
  );
}