import { useState } from 'react';
import { SignaturePadModal } from './SignaturePad';

interface ToolPanelProps {
  onSignatureCreate: (dataUrl: string) => void;
  onToolSelect: (tool: 'text' | 'signature' | 'check' | 'date') => void;
  selectedTool: string;
}

export function ToolPanel({ onSignatureCreate, onToolSelect, selectedTool }: ToolPanelProps) {
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

      <SignaturePadModal
        isOpen={isSignaturePadOpen}
        onClose={() => setIsSignaturePadOpen(false)}
        onSave={handleSignatureSave}
      />
    </div>
  );
}