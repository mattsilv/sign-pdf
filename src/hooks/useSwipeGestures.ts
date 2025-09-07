import { useEffect, useRef, useCallback } from 'react';

interface SwipeConfig {
  threshold?: number; // Minimum distance to consider a swipe
  velocity?: number; // Minimum velocity to consider a swipe (pixels/ms)
  allowMouseEvents?: boolean; // Allow mouse events to trigger swipes
}

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: () => void;
  onSwipeMove?: (progress: number, direction: 'left' | 'right' | 'up' | 'down') => void;
  onSwipeEnd?: () => void;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export function useSwipeGestures(
  elementRef: React.RefObject<HTMLElement>,
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) {
  const {
    threshold = 50,
    velocity = 0.3,
    allowMouseEvents = false
  } = config;

  const touchStart = useRef<TouchPoint | null>(null);
  const touchCurrent = useRef<TouchPoint | null>(null);
  const isMouseDown = useRef(false);
  const isSwiping = useRef(false);

  const getDirection = useCallback((deltaX: number, deltaY: number): 'left' | 'right' | 'up' | 'down' | null => {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < threshold && absY < threshold) return null;

    if (absX > absY) {
      return deltaX > 0 ? 'left' : 'right';
    } else {
      return deltaY > 0 ? 'up' : 'down';
    }
  }, [threshold]);

  const handleSwipeEnd = useCallback(() => {
    if (!touchStart.current || !touchCurrent.current) return;

    const deltaX = touchStart.current.x - touchCurrent.current.x;
    const deltaY = touchStart.current.y - touchCurrent.current.y;
    const deltaTime = touchCurrent.current.time - touchStart.current.time;
    
    const velocityX = Math.abs(deltaX / deltaTime);
    const velocityY = Math.abs(deltaY / deltaTime);
    
    const direction = getDirection(deltaX, deltaY);
    
    if (direction && (velocityX > velocity || velocityY > velocity)) {
      switch (direction) {
        case 'left':
          handlers.onSwipeLeft?.();
          break;
        case 'right':
          handlers.onSwipeRight?.();
          break;
        case 'up':
          handlers.onSwipeUp?.();
          break;
        case 'down':
          handlers.onSwipeDown?.();
          break;
      }
    }

    handlers.onSwipeEnd?.();
    touchStart.current = null;
    touchCurrent.current = null;
    isSwiping.current = false;
  }, [getDirection, velocity, handlers]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    touchCurrent.current = touchStart.current;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart.current || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchCurrent.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    const deltaX = touchStart.current.x - touchCurrent.current.x;
    const deltaY = touchStart.current.y - touchCurrent.current.y;
    const direction = getDirection(deltaX, deltaY);

    if (direction && !isSwiping.current) {
      isSwiping.current = true;
      handlers.onSwipeStart?.();
    }

    if (direction && isSwiping.current) {
      const progress = Math.min(
        1,
        Math.max(Math.abs(deltaX), Math.abs(deltaY)) / (threshold * 3)
      );
      handlers.onSwipeMove?.(progress, direction);

      // Prevent default scrolling for horizontal swipes
      if (direction === 'left' || direction === 'right') {
        e.preventDefault();
      }
    }
  }, [threshold, getDirection, handlers]);

  const handleTouchEnd = useCallback(() => {
    handleSwipeEnd();
  }, [handleSwipeEnd]);

  const handleTouchCancel = useCallback(() => {
    handlers.onSwipeEnd?.();
    touchStart.current = null;
    touchCurrent.current = null;
    isSwiping.current = false;
  }, [handlers]);

  // Mouse event handlers for desktop testing
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!allowMouseEvents) return;
    
    isMouseDown.current = true;
    touchStart.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
    touchCurrent.current = touchStart.current;
    isSwiping.current = false;
  }, [allowMouseEvents]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!allowMouseEvents || !isMouseDown.current || !touchStart.current) return;
    
    touchCurrent.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };

    const deltaX = touchStart.current.x - touchCurrent.current.x;
    const deltaY = touchStart.current.y - touchCurrent.current.y;
    const direction = getDirection(deltaX, deltaY);

    if (direction && !isSwiping.current) {
      isSwiping.current = true;
      handlers.onSwipeStart?.();
    }

    if (direction && isSwiping.current) {
      const progress = Math.min(
        1,
        Math.max(Math.abs(deltaX), Math.abs(deltaY)) / (threshold * 3)
      );
      handlers.onSwipeMove?.(progress, direction);
    }
  }, [allowMouseEvents, threshold, getDirection, handlers]);

  const handleMouseUp = useCallback(() => {
    if (!allowMouseEvents || !isMouseDown.current) return;
    
    isMouseDown.current = false;
    handleSwipeEnd();
  }, [allowMouseEvents, handleSwipeEnd]);

  const handleMouseLeave = useCallback(() => {
    if (!allowMouseEvents || !isMouseDown.current) return;
    
    isMouseDown.current = false;
    handlers.onSwipeEnd?.();
    touchStart.current = null;
    touchCurrent.current = null;
    isSwiping.current = false;
  }, [allowMouseEvents, handlers]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Touch events
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    // Mouse events (if enabled)
    if (allowMouseEvents) {
      element.addEventListener('mousedown', handleMouseDown);
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseup', handleMouseUp);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);

      if (allowMouseEvents) {
        element.removeEventListener('mousedown', handleMouseDown);
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseup', handleMouseUp);
        element.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [
    elementRef,
    allowMouseEvents,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  ]);

  return {
    isSwiping: isSwiping.current
  };
}