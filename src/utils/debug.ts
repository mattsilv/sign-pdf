// Debug utilities

export interface DebugInfo {
  type: 'click' | 'render' | 'transform' | 'error';
  page?: number;
  viewport?: { x: number; y: number };
  pdf?: { x: number; y: number };
  annotation?: { x: number; y: number };
  message?: string;
}

// Helper function to emit debug events
export const emitDebugInfo = (info: DebugInfo) => {
  window.dispatchEvent(new CustomEvent('pdf-debug', { detail: info }));
};