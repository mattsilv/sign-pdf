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
  enableCompliance: boolean;
  onComplianceChange: (enabled: boolean) => void;
}

export function ToolPanel({ 
  onSignatureCreate, 
  onToolSelect, 
  selectedTool, 
  onResetDocument, 
  onExportPdf, 
  hasAnnotations, 
  isExporting,
  signatureDataUrl,
  enableCompliance,
  onComplianceChange
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
      <div className="tool-panel-content">
        <div className="tool-buttons-row">
          <div className="tool-buttons">
            {tools.map(tool => (
              <div key={tool.id} className="tool-button-wrapper">
                <button
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
                {tool.id === 'signature' && (
                  <button 
                    className="edit-signature-link-compact"
                    onClick={() => setIsSignaturePadOpen(true)}
                    style={{
                      visibility: hasStoredSignature ? 'visible' : 'hidden',
                      fontSize: '11px',
                      padding: '2px',
                      marginTop: '2px',
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      height: '16px',
                      width: '100%',
                      textAlign: 'center'
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="tool-actions">
            <button 
              className="export-button compact"
              onClick={onExportPdf}
              disabled={!hasAnnotations || isExporting}
              style={{ opacity: hasAnnotations ? 1 : 0.5 }}
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
              {isExporting 
                ? (enableCompliance ? 'Signing...' : 'Exporting...')
                : (enableCompliance ? 'Sign & Export' : 'Download PDF')
              }
            </button>
            <button 
              className="reset-document-button compact"
              onClick={onResetDocument}
            >
              <svg 
                className="button-icon" 
                width="14" 
                height="14" 
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
          </div>
        </div>

        <div className="compliance-checkbox-row">
          <label className="compliance-checkbox-label">
            <input
              type="checkbox"
              checked={enableCompliance}
              onChange={(e) => onComplianceChange(e.target.checked)}
              className="compliance-checkbox"
              disabled={!hasAnnotations}
            />
            <span style={{ opacity: hasAnnotations ? 1 : 0.5 }}>Make e-sign compliant*</span>
          </label>
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