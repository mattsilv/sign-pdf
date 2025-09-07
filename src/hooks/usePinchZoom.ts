import { useState, useCallback, useRef } from 'react';

export interface PinchZoomState {
  scale: number;
  x: number;
  y: number;
  isDragging: boolean;
  isPinching: boolean;
}

export interface PinchZoomCallbacks {
  onScaleChange?: (scale: number) => void;
  onTransformChange?: (transform: { scale: number; x: number; y: number }) => void;
}

/**
 * Custom hook for pinch-to-zoom and pan functionality
 * Optimized for mobile PDF viewing with coordinate preservation
 */
export function usePinchZoom(
  initialScale: number = 1,
  minScale: number = 0.5,
  maxScale: number = 5,
  callbacks: PinchZoomCallbacks = {}
) {
  const [state, setState] = useState<PinchZoomState>({
    scale: initialScale,
    x: 0,
    y: 0,
    isDragging: false,
    isPinching: false,
  });

  const lastPointers = useRef<Map<number, PointerEvent>>(new Map());
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastDistance = useRef<number | null>(null);

  // Calculate distance between two pointers
  const getDistance = useCallback((pointer1: PointerEvent, pointer2: PointerEvent): number => {
    const dx = pointer1.clientX - pointer2.clientX;
    const dy = pointer1.clientY - pointer2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two pointers
  const getCenter = useCallback((pointer1: PointerEvent, pointer2: PointerEvent) => ({
    x: (pointer1.clientX + pointer2.clientX) / 2,
    y: (pointer1.clientY + pointer2.clientY) / 2,
  }), []);

  // Handle pointer down
  const handlePointerDown = useCallback((event: PointerEvent) => {
    event.preventDefault();
    
    // Set pointer capture
    const element = event.currentTarget as Element;
    if (element.setPointerCapture) {
      element.setPointerCapture(event.pointerId);
    }

    lastPointers.current.set(event.pointerId, event);

    const pointerCount = lastPointers.current.size;

    if (pointerCount === 1) {
      // Single pointer - start pan
      setState(prev => ({ ...prev, isDragging: true, isPinching: false }));
    } else if (pointerCount === 2) {
      // Two pointers - start pinch
      const [pointer1, pointer2] = Array.from(lastPointers.current.values());
      lastDistance.current = getDistance(pointer1, pointer2);
      lastCenter.current = getCenter(pointer1, pointer2);
      
      setState(prev => ({ ...prev, isDragging: false, isPinching: true }));
    }
  }, [getDistance, getCenter]);

  // Handle pointer move
  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!lastPointers.current.has(event.pointerId)) return;

    lastPointers.current.set(event.pointerId, event);
    const pointerCount = lastPointers.current.size;

    if (pointerCount === 1 && state.isDragging) {
      // Single pointer pan
      const pointer = event;
      const lastPointer = Array.from(lastPointers.current.values())[0];
      
      const deltaX = pointer.clientX - lastPointer.clientX;
      const deltaY = pointer.clientY - lastPointer.clientY;

      setState(prev => {
        const newState = {
          ...prev,
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        };
        callbacks.onTransformChange?.(newState);
        return newState;
      });
    } else if (pointerCount === 2 && state.isPinching) {
      // Two pointer pinch and pan
      const [pointer1, pointer2] = Array.from(lastPointers.current.values());
      const currentDistance = getDistance(pointer1, pointer2);
      const currentCenter = getCenter(pointer1, pointer2);

      if (lastDistance.current && lastCenter.current) {
        // Calculate scale change
        const scaleChange = currentDistance / lastDistance.current;
        const newScale = Math.min(Math.max(state.scale * scaleChange, minScale), maxScale);

        // Calculate pan based on center movement
        const centerDeltaX = currentCenter.x - lastCenter.current.x;
        const centerDeltaY = currentCenter.y - lastCenter.current.y;

        setState(prev => {
          const newState = {
            ...prev,
            scale: newScale,
            x: prev.x + centerDeltaX,
            y: prev.y + centerDeltaY,
          };
          
          callbacks.onScaleChange?.(newScale);
          callbacks.onTransformChange?.(newState);
          return newState;
        });
      }

      lastDistance.current = currentDistance;
      lastCenter.current = currentCenter;
    }
  }, [state.isDragging, state.isPinching, state.scale, minScale, maxScale, getDistance, getCenter, callbacks]);

  // Handle pointer up
  const handlePointerUp = useCallback((event: PointerEvent) => {
    const element = event.currentTarget as Element;
    if (element.releasePointerCapture) {
      element.releasePointerCapture(event.pointerId);
    }

    lastPointers.current.delete(event.pointerId);
    const pointerCount = lastPointers.current.size;

    if (pointerCount === 0) {
      // No more pointers
      setState(prev => ({ ...prev, isDragging: false, isPinching: false }));
      lastDistance.current = null;
      lastCenter.current = null;
    } else if (pointerCount === 1) {
      // Transition from pinch to pan
      setState(prev => ({ ...prev, isDragging: true, isPinching: false }));
      lastDistance.current = null;
      lastCenter.current = null;
    }
  }, []);

  // Handle pointer cancel
  const handlePointerCancel = useCallback((event: PointerEvent) => {
    handlePointerUp(event);
  }, [handlePointerUp]);

  // Reset to initial state
  const reset = useCallback(() => {
    setState({
      scale: initialScale,
      x: 0,
      y: 0,
      isDragging: false,
      isPinching: false,
    });
    lastPointers.current.clear();
    lastDistance.current = null;
    lastCenter.current = null;
  }, [initialScale]);

  // Set scale programmatically (e.g., from zoom controls)
  const setScale = useCallback((newScale: number) => {
    const clampedScale = Math.min(Math.max(newScale, minScale), maxScale);
    setState(prev => {
      const newState = { ...prev, scale: clampedScale };
      callbacks.onScaleChange?.(clampedScale);
      callbacks.onTransformChange?.(newState);
      return newState;
    });
  }, [minScale, maxScale, callbacks]);

  // Zoom to fit content
  const zoomToFit = useCallback((containerWidth: number, containerHeight: number, contentWidth: number, contentHeight: number) => {
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const fitScale = Math.min(scaleX, scaleY);
    
    setScale(Math.min(fitScale, maxScale));
    setState(prev => ({ ...prev, x: 0, y: 0 }));
  }, [maxScale, setScale]);

  return {
    state,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
    controls: {
      setScale,
      reset,
      zoomToFit,
    },
  };
}