import { useState } from 'react';

interface TextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  title?: string;
  placeholder?: string;
  defaultValue?: string;
}

export function TextInputModal({ 
  isOpen, 
  onClose, 
  onSave,
  title = "Enter Text",
  placeholder = "Type your text here...",
  defaultValue = ""
}: TextInputModalProps) {
  const [text, setText] = useState(defaultValue);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text);
      setText('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="text-modal-overlay" onClick={onClose}>
      <div className="text-modal" onClick={e => e.stopPropagation()}>
        <div className="text-modal-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="text-modal-content">
          <input
            type="text"
            className="text-input"
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        
        <div className="text-modal-actions">
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={!text.trim()}
            className="save-button"
          >
            Add Text
          </button>
        </div>
      </div>
    </div>
  );
}