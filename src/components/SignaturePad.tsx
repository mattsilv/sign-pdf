import { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';

interface SignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export function SignaturePadModal({ isOpen, onClose, onSave }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!canvasRef.current || !isOpen) return;

    const canvas = canvasRef.current;
    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
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
    };

    signaturePad.addEventListener('beginStroke', handleSignatureChange);
    signaturePad.addEventListener('endStroke', handleSignatureChange);

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      signaturePad.off();
    };
  }, [isOpen]);

  const handleSave = () => {
    if (signaturePadRef.current && !isEmpty) {
      const dataUrl = signaturePadRef.current.toDataURL();
      onSave(dataUrl);
      onClose();
    }
  };

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsEmpty(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="signature-modal-overlay" onClick={onClose}>
      <div className="signature-modal" onClick={e => e.stopPropagation()}>
        <div className="signature-modal-header">
          <h3>Draw Your Signature</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="signature-canvas-container">
          <canvas
            ref={canvasRef}
            className="signature-canvas"
            width={400}
            height={200}
          />
        </div>
        
        <div className="signature-modal-actions">
          <button onClick={handleClear}>Clear</button>
          <button 
            onClick={handleSave} 
            disabled={isEmpty}
            className="save-button"
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}