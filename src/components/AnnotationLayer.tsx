import { useCallback, useState } from 'react';
import { Annotation } from '../lib/types';
import { useLongPress } from '../hooks/useLongPress';
import type { PageViewport } from 'pdfjs-dist';

interface AnnotationLayerProps {
  annotations: Annotation[];
  viewport: PageViewport;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Annotation>) => void;
  isMobile: boolean;
}

interface AnnotationItemProps {
  annotation: Annotation;
  viewport: PageViewport;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate?: (updates: Partial<Annotation>) => void;
  isMobile: boolean;
}

function AnnotationItem({
  annotation,
  viewport,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
  isMobile
}: AnnotationItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [showResizeHandles, setShowResizeHandles] = useState(false);

  // Long press for mobile selection
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      onSelect();
      setShowResizeHandles(true);
      
      // Show visual feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    },
    onClick: () => {
      if (!isMobile) {
        onSelect();
      }
    },
    threshold: 500
  });

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isSelected) return;
    
    e.stopPropagation();
    setIsDragging(true);
    
    const pos = 'touches' in e 
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
    
    setDragStart(pos);
  }, [isSelected]);

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !dragStart || !onUpdate) return;
    
    const pos = 'touches' in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
    
    const deltaX = pos.x - dragStart.x;
    const deltaY = pos.y - dragStart.y;
    
    onUpdate({
      xPdf: annotation.xPdf + deltaX,
      yPdf: annotation.yPdf - deltaY // Invert Y for PDF coordinates
    });
    
    setDragStart(pos);
  }, [isDragging, dragStart, annotation, onUpdate]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Calculate touch-friendly dimensions
  const minTouchSize = isMobile ? 44 : 0; // 44px minimum for touch targets
  const displayWidth = Math.max(annotation.widthPdf, minTouchSize);
  const displayHeight = Math.max(annotation.heightPdf, minTouchSize);
  
  // Center small annotations in their touch target
  const xOffset = (displayWidth - annotation.widthPdf) / 2;
  const yOffset = (displayHeight - annotation.heightPdf) / 2;

  const style = {
    position: 'absolute' as const,
    left: annotation.xPdf - xOffset,
    top: viewport.height - annotation.yPdf - annotation.heightPdf - yOffset,
    width: displayWidth,
    height: displayHeight,
    cursor: isSelected ? 'move' : 'pointer',
    touchAction: isDragging ? 'none' : 'auto',
    // Add padding for better touch targets on mobile
    padding: isMobile ? '8px' : '0',
    // Visual feedback for touch area
    outline: isMobile && isSelected ? '2px dashed rgba(59, 130, 246, 0.5)' : 'none',
    outlineOffset: '4px'
  };

  return (
    <div
      className={`annotation annotation-${annotation.type} ${
        isSelected ? 'selected' : ''
      } ${isMobile ? 'touch-optimized' : ''}`}
      style={style}
      {...(isMobile ? longPressHandlers : {})}
      onClick={!isMobile ? onSelect : undefined}
      onMouseDown={!isMobile ? handleDragStart : undefined}
      onMouseMove={!isMobile ? handleDragMove : undefined}
      onMouseUp={!isMobile ? handleDragEnd : undefined}
      onTouchStart={isMobile ? handleDragStart : undefined}
      onTouchMove={isMobile ? handleDragMove : undefined}
      onTouchEnd={isMobile ? handleDragEnd : undefined}
    >
      {/* Annotation content */}
      <div className="annotation-content" style={{
        width: annotation.widthPdf,
        height: annotation.heightPdf,
        margin: 'auto',
        pointerEvents: 'none'
      }}>
        {annotation.type === 'signature' && annotation.content && (
          <img 
            src={annotation.content} 
            alt="Signature"
            style={{ width: '100%', height: '100%' }}
          />
        )}
        {annotation.type === 'text' && (
          <div className="text-annotation">{annotation.content}</div>
        )}
        {annotation.type === 'checkmark' && (
          <div className="checkmark-annotation">✓</div>
        )}
        {annotation.type === 'date' && (
          <div className="date-annotation">{annotation.content}</div>
        )}
      </div>
      
      {/* Delete button - larger on mobile */}
      {isSelected && (
        <button
          className={`annotation-delete ${isMobile ? 'touch-delete' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={isMobile ? {
            width: '44px',
            height: '44px',
            fontSize: '24px',
            top: '-22px',
            right: '-22px'
          } : undefined}
          aria-label="Delete annotation"
        >
          ×
        </button>
      )}
      
      {/* Resize handles for mobile */}
      {isSelected && showResizeHandles && isMobile && (
        <>
          <div className="resize-handle resize-handle-nw" />
          <div className="resize-handle resize-handle-ne" />
          <div className="resize-handle resize-handle-sw" />
          <div className="resize-handle resize-handle-se" />
        </>
      )}
    </div>
  );
}

export function AnnotationLayer({
  annotations,
  viewport,
  selectedId,
  onSelect,
  onDelete,
  onUpdate,
  isMobile
}: AnnotationLayerProps) {
  return (
    <div className="annotations-layer">
      {annotations.map(annotation => (
        <AnnotationItem
          key={annotation.id}
          annotation={annotation}
          viewport={viewport}
          isSelected={selectedId === annotation.id}
          onSelect={() => onSelect(annotation.id)}
          onDelete={() => onDelete(annotation.id)}
          onUpdate={onUpdate ? (updates) => onUpdate(annotation.id, updates) : undefined}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}