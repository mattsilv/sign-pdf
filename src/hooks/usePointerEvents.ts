import { useRef, useCallback } from 'react';

export interface PointerState {
  pointerId: number;
  pointerType: string;
  isPrimary: boolean;
  clientX: number;
  clientY: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
}

export interface PointerEventCallbacks {
  onPointerDown?: (pointer: PointerState, allPointers: Map<number, PointerState>) => void;
  onPointerMove?: (pointer: PointerState, allPointers: Map<number, PointerState>) => void;
  onPointerUp?: (pointer: PointerState, allPointers: Map<number, PointerState>) => void;
  onPointerCancel?: (pointer: PointerState, allPointers: Map<number, PointerState>) => void;
}

/**
 * Custom hook for unified pointer event handling
 * Handles mouse, touch, and stylus input through the Pointer Events API
 */
export function usePointerEvents(callbacks: PointerEventCallbacks) {
  const pointersRef = useRef<Map<number, PointerState>>(new Map());
  
  const createPointerState = useCallback((event: PointerEvent): PointerState => ({
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    isPrimary: event.isPrimary,
    clientX: event.clientX,
    clientY: event.clientY,
    pressure: event.pressure,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
  }), []);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    const element = event.currentTarget as Element;
    const pointer = createPointerState(event);
    
    // Set pointer capture to ensure we receive move/up events
    // even if the pointer moves outside the element
    if (element.setPointerCapture) {
      element.setPointerCapture(event.pointerId);
    }
    
    pointersRef.current.set(event.pointerId, pointer);
    callbacks.onPointerDown?.(pointer, new Map(pointersRef.current));
  }, [callbacks, createPointerState]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const pointer = createPointerState(event);
    pointersRef.current.set(event.pointerId, pointer);
    callbacks.onPointerMove?.(pointer, new Map(pointersRef.current));
  }, [callbacks, createPointerState]);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    const element = event.currentTarget as Element;
    const pointer = createPointerState(event);
    
    // Release pointer capture
    if (element.releasePointerCapture) {
      element.releasePointerCapture(event.pointerId);
    }
    
    callbacks.onPointerUp?.(pointer, new Map(pointersRef.current));
    pointersRef.current.delete(event.pointerId);
  }, [callbacks, createPointerState]);

  const handlePointerCancel = useCallback((event: PointerEvent) => {
    const element = event.currentTarget as Element;
    const pointer = createPointerState(event);
    
    // Release pointer capture
    if (element.releasePointerCapture) {
      element.releasePointerCapture(event.pointerId);
    }
    
    callbacks.onPointerCancel?.(pointer, new Map(pointersRef.current));
    pointersRef.current.delete(event.pointerId);
  }, [callbacks, createPointerState]);

  const pointerEventHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };

  return {
    pointerEventHandlers,
    activePointers: pointersRef.current,
  };
}