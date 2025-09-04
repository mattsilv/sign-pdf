import React from 'react';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: () => void;
  documentName?: string;
}

export function ConsentModal({ 
  isOpen, 
  onClose, 
  onConsent,
  documentName = "this document"
}: ConsentModalProps) {
  const handleConsent = () => {
    onConsent();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConsent();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const resetAndClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="text-modal-overlay" onClick={resetAndClose} onKeyDown={handleKeyDown}>
      <div className="consent-modal" onClick={e => e.stopPropagation()} tabIndex={-1}>
        <div className="text-modal-header">
          <h3>Electronic Signature Consent</h3>
          <button className="close-button" onClick={resetAndClose}>×</button>
        </div>
        
        <div className="consent-modal-content">
          <div className="consent-section">
            <h4>📋 About to Sign: {documentName}</h4>
            <p>You are about to electronically sign this document.</p>
          </div>

          <div className="consent-section">
            <h4>🔍 What we add to your PDF</h4>
            <p>A forensic page will be added with signing timestamp, browser fingerprint, and document hash for authenticity.</p>
          </div>

          <div className="consent-section privacy-highlight">
            <h4>🛡️ Privacy Protection</h4>
            <p>All processing happens locally in your browser. No data is sent to our servers.</p>
          </div>

          <div className="agreement-section">
            <p className="agreement-text">
              By clicking the button below you agree to the terms above.
            </p>
          </div>

          <div className="legal-disclaimer-section">
            <p className="modal-legal-disclaimer">
              <strong>Important:</strong> This is not legal advice. Consult with a qualified attorney for legal guidance.
            </p>
          </div>
        </div>
        
        <div className="text-modal-actions">
          <button onClick={resetAndClose} className="cancel-button">
            Cancel
          </button>
          <button 
            onClick={handleConsent} 
            className="save-button consent-button"
          >
            I Agree & Sign Document
          </button>
        </div>
      </div>
    </div>
  );
}