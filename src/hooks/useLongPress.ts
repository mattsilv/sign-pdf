import { useRef, useCallback } from 'react';

interface LongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  threshold?: number; // Time in ms to consider a long press
  preventDefault?: boolean;
}

export function useLongPress({
  onLongPress,
  onClick,
  threshold = 500,
  preventDefault = true
}: LongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const startPress = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }

    isLongPressRef.current = false;
    
    // Store initial position
    const pos = 'touches' in event 
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : { x: event.clientX, y: event.clientY };
    startPosRef.current = pos;

    // Start long press timer
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      
      // Add haptic feedback for long press
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold, preventDefault]);

  const cancelPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  const endPress = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }

    const wasLongPress = isLongPressRef.current;
    cancelPress();

    // If it wasn't a long press and onClick is provided, trigger it
    if (!wasLongPress && onClick) {
      onClick();
    }
  }, [onClick, cancelPress, preventDefault]);

  const movePress = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!startPosRef.current) return;

    // Get current position
    const pos = 'touches' in event
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : { x: event.clientX, y: event.clientY };

    // Calculate movement distance
    const deltaX = Math.abs(pos.x - startPosRef.current.x);
    const deltaY = Math.abs(pos.y - startPosRef.current.y);
    
    // Cancel long press if moved too much (10px threshold)
    if (deltaX > 10 || deltaY > 10) {
      cancelPress();
    }
  }, [cancelPress]);

  return {
    onTouchStart: startPress,
    onTouchEnd: endPress,
    onTouchMove: movePress,
    onTouchCancel: cancelPress,
    onMouseDown: startPress,
    onMouseUp: endPress,
    onMouseMove: movePress,
    onMouseLeave: cancelPress
  };
}