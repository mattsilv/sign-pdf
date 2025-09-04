import { useState } from 'react';
import { SignaturePadModal } from './SignaturePad';

interface ToolPanelProps {
  onSignatureCreate: (dataUrl: string) => void;
  onToolSelect: (tool: 'text' | 'signature' | 'check' | 'date') => void;
  selectedTool: string;
  onClearAnnotations: () => void;
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
  onClearAnnotations, 
  onResetDocument, 
  onExportPdf, 
  hasAnnotations, 
  isExporting,
  signatureDataUrl
}: ToolPanelProps) {
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false);

  const handleSignatureSave = (dataUrl: string) => {
    onSignatureCreate(dataUrl);
    onToolSelect('signature');
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
                  setIsSignaturePadOpen(true);
                } else {
                  onToolSelect(tool.id);
                }
              }}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
          {signatureDataUrl && (
            <button
              className="tool-button edit-signature"
              onClick={() => setIsSignaturePadOpen(true)}
            >
              <span className="tool-icon">✎️</span>
              <span className="tool-label">Edit Signature</span>
            </button>
          )}
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