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
}

export function ToolPanel({ 
  onSignatureCreate, 
  onToolSelect, 
  selectedTool, 
  onClearAnnotations, 
  onResetDocument, 
  onExportPdf, 
  hasAnnotations, 
  isExporting 
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
        </div>

        <div className="tool-actions">
          {hasAnnotations && (
            <button 
              className="export-button compact"
              onClick={onExportPdf}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          )}
          <button 
            className="clear-annotations-button compact"
            onClick={onClearAnnotations}
            disabled={!hasAnnotations}
          >
            Clear
          </button>
          <button 
            className="reset-document-button compact"
            onClick={onResetDocument}
          >
            Start Over
          </button>
        </div>
      </div>

      <SignaturePadModal
        isOpen={isSignaturePadOpen}
        onClose={() => setIsSignaturePadOpen(false)}
        onSave={handleSignatureSave}
      />
    </div>
  );
}