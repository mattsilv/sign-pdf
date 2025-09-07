import React, { useState, useEffect, useRef } from 'react';
import './BottomSheet.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  defaultSnapPoint?: number;
  showHandle?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  snapPoints = [0.25, 0.5, 0.9],
  defaultSnapPoint = 0,
  showHandle = true
}) => {
  const [currentSnapPoint, setCurrentSnapPoint] = useState(defaultSnapPoint);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCurrentSnapPoint(defaultSnapPoint);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, defaultSnapPoint]);

  const handleStart = (clientY: number) => {
    setIsDragging(true);
    setStartY(clientY);
    setCurrentY(clientY);
  };

  const handleMove = (clientY: number) => {
    if (!isDragging || !sheetRef.current) return;
    
    const deltaY = clientY - startY;
    const windowHeight = window.innerHeight;
    const currentHeight = windowHeight * snapPoints[currentSnapPoint];
    const newHeight = Math.max(0, Math.min(windowHeight, currentHeight - deltaY));
    const newSnapPoint = snapPoints.reduce((prev, curr, index) => {
      const currHeight = windowHeight * curr;
      const prevHeight = windowHeight * snapPoints[prev];
      return Math.abs(currHeight - newHeight) < Math.abs(prevHeight - newHeight) ? index : prev;
    }, 0);

    if (contentRef.current) {
      const translateY = Math.max(0, deltaY);
      contentRef.current.style.transform = `translateY(${translateY}px)`;
    }

    setCurrentY(clientY);
  };

  const handleEnd = () => {
    if (!isDragging || !sheetRef.current) return;
    
    const deltaY = currentY - startY;
    const threshold = 50;
    
    if (contentRef.current) {
      contentRef.current.style.transform = '';
    }

    if (deltaY > threshold) {
      const newSnapPoint = Math.max(0, currentSnapPoint - 1);
      if (newSnapPoint < 0 || (currentSnapPoint === 0 && deltaY > threshold * 2)) {
        onClose();
      } else {
        setCurrentSnapPoint(newSnapPoint);
      }
    } else if (deltaY < -threshold) {
      const newSnapPoint = Math.min(snapPoints.length - 1, currentSnapPoint + 1);
      setCurrentSnapPoint(newSnapPoint);
    }

    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMove as any);
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMove as any);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, currentY]);

  if (!isOpen) return null;

  const sheetHeight = `${snapPoints[currentSnapPoint] * 100}vh`;

  return (
    <>
      <div className="bottom-sheet-backdrop" onClick={onClose} />
      <div 
        ref={sheetRef}
        className={`bottom-sheet ${isDragging ? 'dragging' : ''}`}
        style={{ height: sheetHeight }}
      >
        {showHandle && (
          <div 
            className="bottom-sheet-handle-container"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleEnd}
            onMouseDown={handleMouseDown}
          >
            <div className="bottom-sheet-handle" />
          </div>
        )}
        <div ref={contentRef} className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </>
  );
};