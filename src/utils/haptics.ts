/**
 * Haptic Feedback Utility
 * Provides haptic feedback for mobile devices using the Vibration API
 * Falls back gracefully on devices without support
 */

export enum HapticPattern {
  // Quick, light feedback
  LIGHT = 'light',
  // Medium intensity, standard interaction
  MEDIUM = 'medium',
  // Strong feedback for important actions
  HEAVY = 'heavy',
  // Success pattern (two quick vibrations)
  SUCCESS = 'success',
  // Warning pattern (three quick vibrations)
  WARNING = 'warning',
  // Error pattern (long vibration)
  ERROR = 'error',
  // Selection changed
  SELECTION = 'selection',
  // Drag start/end
  DRAG = 'drag',
}

class HapticFeedback {
  private enabled: boolean = true;
  private supported: boolean = false;

  constructor() {
    this.checkSupport();
    this.loadPreferences();
  }

  private checkSupport(): void {
    this.supported = 'vibrate' in navigator;
    
    // Also check for iOS-specific haptic feedback
    if (!this.supported && 'ontouchstart' in window) {
      // iOS doesn't support Vibration API but we can detect it
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        // Mark as supported but will use fallback
        this.supported = true;
      }
    }
  }

  private loadPreferences(): void {
    const saved = localStorage.getItem('hapticFeedback');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('hapticFeedback', enabled.toString());
  }

  public isEnabled(): boolean {
    return this.enabled && this.supported;
  }

  public isSupported(): boolean {
    return this.supported;
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.isEnabled()) return;
    
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error);
    }
  }

  public trigger(pattern: HapticPattern): void {
    if (!this.isEnabled()) return;

    switch (pattern) {
      case HapticPattern.LIGHT:
        this.vibrate(10);
        break;
      
      case HapticPattern.MEDIUM:
        this.vibrate(20);
        break;
      
      case HapticPattern.HEAVY:
        this.vibrate(30);
        break;
      
      case HapticPattern.SUCCESS:
        this.vibrate([10, 50, 10]);
        break;
      
      case HapticPattern.WARNING:
        this.vibrate([10, 30, 10, 30, 10]);
        break;
      
      case HapticPattern.ERROR:
        this.vibrate(100);
        break;
      
      case HapticPattern.SELECTION:
        this.vibrate(15);
        break;
      
      case HapticPattern.DRAG:
        this.vibrate(25);
        break;
      
      default:
        this.vibrate(10);
    }
  }

  /**
   * Trigger haptic feedback for button taps
   */
  public tap(): void {
    this.trigger(HapticPattern.LIGHT);
  }

  /**
   * Trigger haptic feedback for toggle switches
   */
  public toggle(): void {
    this.trigger(HapticPattern.MEDIUM);
  }

  /**
   * Trigger haptic feedback for successful actions
   */
  public success(): void {
    this.trigger(HapticPattern.SUCCESS);
  }

  /**
   * Trigger haptic feedback for errors
   */
  public error(): void {
    this.trigger(HapticPattern.ERROR);
  }

  /**
   * Trigger haptic feedback for warnings
   */
  public warning(): void {
    this.trigger(HapticPattern.WARNING);
  }

  /**
   * Trigger haptic feedback for drag operations
   */
  public drag(): void {
    this.trigger(HapticPattern.DRAG);
  }

  /**
   * Trigger haptic feedback for selections
   */
  public select(): void {
    this.trigger(HapticPattern.SELECTION);
  }

  /**
   * Custom vibration pattern
   * @param pattern Array of vibration durations in milliseconds
   */
  public custom(pattern: number | number[]): void {
    this.vibrate(pattern);
  }
}

// Export singleton instance
export const haptics = new HapticFeedback();

// React Hook for haptic feedback
import { useCallback } from 'react';

export function useHaptics() {
  const tap = useCallback(() => haptics.tap(), []);
  const toggle = useCallback(() => haptics.toggle(), []);
  const success = useCallback(() => haptics.success(), []);
  const error = useCallback(() => haptics.error(), []);
  const warning = useCallback(() => haptics.warning(), []);
  const drag = useCallback(() => haptics.drag(), []);
  const select = useCallback(() => haptics.select(), []);
  const trigger = useCallback((pattern: HapticPattern) => haptics.trigger(pattern), []);
  const custom = useCallback((pattern: number | number[]) => haptics.custom(pattern), []);

  return {
    tap,
    toggle,
    success,
    error,
    warning,
    drag,
    select,
    trigger,
    custom,
    isSupported: haptics.isSupported(),
    isEnabled: haptics.isEnabled(),
    setEnabled: haptics.setEnabled.bind(haptics),
  };
}