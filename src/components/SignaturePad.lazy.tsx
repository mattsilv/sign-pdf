import { lazy, Suspense } from 'react';

// Lazy load the SignaturePadModal component
const SignaturePadModalComponent = lazy(() => import('./SignaturePad').then(module => ({
  default: module.SignaturePadModal
})));

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string | null) => void;
  existingSignature: string | null;
}

export function SignaturePadLazy({ isOpen, onClose, onSave, existingSignature }: SignaturePadModalProps) {
  if (!isOpen) return null;
  
  return (
    <Suspense fallback={
      <div className="signature-modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="signature-modal-content">
          <p>Loading signature pad...</p>
        </div>
      </div>
    }>
      <SignaturePadModalComponent 
        isOpen={isOpen} 
        onClose={onClose} 
        onSave={onSave} 
        existingSignature={existingSignature} 
      />
    </Suspense>
  );
}