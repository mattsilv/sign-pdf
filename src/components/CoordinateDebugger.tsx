import React, { useState, useEffect } from 'react';

interface DebugInfo {
  clickX?: number;
  clickY?: number;
  pdfX?: number;
  pdfY?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  scale?: number;
  pageNumber?: number;
  lastAnnotation?: {
    id: string;
    xPdf: number;
    yPdf: number;
    type: string;
  };
}

export const CoordinateDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Listen for debug events
    const handleDebugEvent = (event: CustomEvent) => {
      setDebugInfo(prev => ({
        ...prev,
        ...event.detail
      }));
    };

    window.addEventListener('pdf-debug' as keyof WindowEventMap, handleDebugEvent as EventListener);
    return () => {
      window.removeEventListener('pdf-debug' as keyof WindowEventMap, handleDebugEvent as EventListener);
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          padding: '5px 10px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          zIndex: 10000
        }}
      >
        Show Debug
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#00ff00',
        padding: 15,
        borderRadius: 8,
        fontFamily: 'monospace',
        fontSize: 12,
        maxWidth: 400,
        zIndex: 10000,
        border: '1px solid #00ff00'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: '#00ff00' }}>🐛 Coordinate Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#00ff00',
            cursor: 'pointer',
            fontSize: 16
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ display: 'grid', gap: 5 }}>
        <div>📍 Last Click:</div>
        {debugInfo.clickX !== undefined && (
          <>
            <div style={{ paddingLeft: 20 }}>
              CSS: ({debugInfo.clickX?.toFixed(1)}, {debugInfo.clickY?.toFixed(1)})
            </div>
            <div style={{ paddingLeft: 20 }}>
              PDF: ({debugInfo.pdfX?.toFixed(1)}, {debugInfo.pdfY?.toFixed(1)})
            </div>
          </>
        )}
        
        <div style={{ marginTop: 10 }}>📐 Canvas:</div>
        <div style={{ paddingLeft: 20 }}>
          Size: {debugInfo.canvasWidth?.toFixed(0)} × {debugInfo.canvasHeight?.toFixed(0)}
        </div>
        
        <div style={{ marginTop: 10 }}>🔍 Viewport:</div>
        <div style={{ paddingLeft: 20 }}>
          Size: {debugInfo.viewportWidth?.toFixed(0)} × {debugInfo.viewportHeight?.toFixed(0)}
        </div>
        <div style={{ paddingLeft: 20 }}>
          Scale: {debugInfo.scale?.toFixed(2)}
        </div>
        <div style={{ paddingLeft: 20 }}>
          Page: {debugInfo.pageNumber}
        </div>
        
        {debugInfo.lastAnnotation && (
          <>
            <div style={{ marginTop: 10 }}>✏️ Last Annotation:</div>
            <div style={{ paddingLeft: 20 }}>
              Type: {debugInfo.lastAnnotation.type}
            </div>
            <div style={{ paddingLeft: 20 }}>
              PDF Pos: ({debugInfo.lastAnnotation.xPdf.toFixed(1)}, {debugInfo.lastAnnotation.yPdf.toFixed(1)})
            </div>
            <div style={{ paddingLeft: 20, fontSize: 10, color: '#666' }}>
              ID: {debugInfo.lastAnnotation.id.substring(0, 8)}...
            </div>
          </>
        )}
        
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #333' }}>
          <div style={{ color: '#ffff00' }}>⚠️ Debug Mode Active</div>
          <div style={{ fontSize: 10, color: '#666' }}>
            Check console for detailed logs
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to emit debug events
export const emitDebugInfo = (info: DebugInfo) => {
  window.dispatchEvent(new CustomEvent('pdf-debug', { detail: info }));
};