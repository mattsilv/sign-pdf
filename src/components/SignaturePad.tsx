import { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';

interface SignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  existingSignature?: string | null;
}

interface StoredSignature {
  mode: 'draw' | 'type';
  data: string;
  timestamp: number;
  version: number;
}

const STORAGE_KEY = 'pdfSigner_signature';
const STORAGE_VERSION = 1;

export function SignaturePadModal({ isOpen, onClose, onSave, existingSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [savedToStorage, setSavedToStorage] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load saved signature from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedSignature: StoredSignature = JSON.parse(saved);
          if (parsedSignature.version === STORAGE_VERSION) {
            setMode(parsedSignature.mode);
            if (parsedSignature.mode === 'type') {
              setTypedSignature(parsedSignature.data);
              setIsEmpty(false);
            }
            setSavedToStorage(true);
          }
        }
      } catch (error) {
        console.error('Failed to load saved signature:', error);
      }
    }
  }, [isOpen]);

  // Load existing signature if editing
  useEffect(() => {
    if (isOpen && existingSignature && signaturePadRef.current) {
      signaturePadRef.current.fromDataURL(existingSignature);
      setIsEmpty(false);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, existingSignature]);

  useEffect(() => {
    if (!canvasRef.current || !isOpen || mode !== 'draw') return;

    const canvas = canvasRef.current;
    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: 'rgb(0, 0, 0)',
    });

    signaturePadRef.current = signaturePad;

    const handleResize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')!.scale(ratio, ratio);
      signaturePad.clear();
      setIsEmpty(true);
    };

    const handleSignatureChange = () => {
      setIsEmpty(signaturePad.isEmpty());
      setHasUnsavedChanges(true);
    };

    signaturePad.addEventListener('beginStroke', handleSignatureChange);
    signaturePad.addEventListener('endStroke', handleSignatureChange);

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      signaturePad.off();
    };
  }, [isOpen, mode]);

  const handleSave = () => {
    let dataUrl: string | null = null;

    if (mode === 'draw' && signaturePadRef.current && !isEmpty) {
      dataUrl = signaturePadRef.current.toDataURL('image/png');
    } else if (mode === 'type' && typedSignature.trim()) {
      // Convert typed text to canvas image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Create canvas with tighter crop around text (roughly 2.67:1 ratio like 160:60)
        // Make canvas larger for quality, it gets scaled down to PDF size
        canvas.width = 640;  // Reduced width for tighter crop
        canvas.height = 240;  // Maintain aspect ratio for 160:60
        
        // REMOVED: White background fill - this was causing the white background issue
        // The canvas is transparent by default
        
        ctx.fillStyle = 'black';
        ctx.font = 'italic 96px "Brush Script MT", "Lucida Handwriting", "Apple Chancery", cursive';
        ctx.textBaseline = 'middle';
        
        // Center the text horizontally
        ctx.textAlign = 'center';
        ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
        
        dataUrl = canvas.toDataURL('image/png');
      }
    }

    if (dataUrl) {
      // Save to localStorage
      try {
        const signature: StoredSignature = {
          mode,
          data: mode === 'type' ? typedSignature : dataUrl,
          timestamp: Date.now(),
          version: STORAGE_VERSION
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(signature));
        setSavedToStorage(true);
      } catch (error) {
        console.error('Failed to save signature to localStorage:', error);
      }

      onSave(dataUrl);
      setHasUnsavedChanges(false);
      onClose();
    }
  };


  const handleClearAll = () => {
    // Clear the current signature in UI
    if (mode === 'draw' && signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsEmpty(true);
    } else if (mode === 'type') {
      setTypedSignature('');
      setIsEmpty(true);
    }
    
    // Clear from storage
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSavedToStorage(false);
      setHasUnsavedChanges(false);
      
      // Also clear from parent component if needed
      if (onSave) {
        onSave('');
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges && !isEmpty) {
      const confirmed = window.confirm('You have an unsaved signature. Are you sure you want to close without saving?');
      if (!confirmed) return;
    }
    onClose();
  };

  const handleModeChange = (newMode: 'draw' | 'type') => {
    if (hasUnsavedChanges && !isEmpty) {
      const confirmed = window.confirm('Switching modes will clear your current signature. Continue?');
      if (!confirmed) return;
    }
    setMode(newMode);
    setIsEmpty(true);
    setTypedSignature('');
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
    setHasUnsavedChanges(false);
  };

  if (!isOpen) return null;

  const checkIfEmpty = () => {
    if (mode === 'draw') {
      return signaturePadRef.current ? signaturePadRef.current.isEmpty() : true;
    }
    return !typedSignature.trim();
  };

  return (
    <div className="signature-modal-overlay" onClick={handleClose}>
      <div className="signature-modal" onClick={e => e.stopPropagation()}>
        <div className="signature-modal-header">
          <h3>{existingSignature ? 'Edit' : 'Create'} Your Signature</h3>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        <div className="signature-mode-selector">
          <label className={`mode-option ${mode === 'draw' ? 'active' : ''}`}>
            <input 
              type="radio" 
              name="mode" 
              value="draw" 
              checked={mode === 'draw'}
              onChange={() => handleModeChange('draw')}
            />
            <span>✏️ Draw Signature</span>
          </label>
          <label className={`mode-option ${mode === 'type' ? 'active' : ''}`}>
            <input 
              type="radio" 
              name="mode" 
              value="type" 
              checked={mode === 'type'}
              onChange={() => handleModeChange('type')}
            />
            <span>⌨️ Type Signature</span>
          </label>
        </div>
        
        <div className="signature-canvas-container">
          {mode === 'draw' ? (
            <canvas
              ref={canvasRef}
              className="signature-canvas"
              width={400}
              height={200}
            />
          ) : (
            <input
              type="text"
              className="signature-text-input"
              value={typedSignature}
              onChange={(e) => {
                setTypedSignature(e.target.value);
                setIsEmpty(!e.target.value.trim());
                setHasUnsavedChanges(true);
              }}
              placeholder="Type your signature here"
              autoFocus
            />
          )}
        </div>
        
        {savedToStorage && (
          <div className="storage-indicator">
            <span className="storage-status">✓ Saved in browser</span>
            <button 
              className="clear-storage-link"
              onClick={handleClearAll}
              type="button"
            >
              Clear
            </button>
          </div>
        )}
        
        <div className="signature-modal-actions">
          <button onClick={handleClearAll}>Clear</button>
          <button 
            onClick={handleSave} 
            disabled={checkIfEmpty()}
            className="save-button"
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}