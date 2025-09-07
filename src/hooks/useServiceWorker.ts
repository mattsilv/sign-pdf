import { useEffect, useState } from 'react';

interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

export function useServiceWorker(): ServiceWorkerStatus {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
    error: null
  });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return;
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          '/service-worker.js',
          { scope: '/' }
        );

        console.log('Service Worker registered:', registration);

        setStatus(prev => ({
          ...prev,
          isRegistered: true,
          registration
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                setStatus(prev => ({
                  ...prev,
                  isUpdateAvailable: true
                }));
                console.log('New service worker available');
              }
            });
          }
        });

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour

      } catch (error) {
        console.error('Service Worker registration failed:', error);
        setStatus(prev => ({
          ...prev,
          error: error as Error
        }));
      }
    };

    // Register on load
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
      return () => window.removeEventListener('load', registerServiceWorker);
    }
  }, []);

  return status;
}

// Helper function to cache a PDF for offline use
export async function cachePDFForOffline(
  pdfBlob: Blob,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return { success: false, error: 'Service Worker not available' };
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(
      {
        type: 'CACHE_PDF',
        url: `/cached-pdfs/${filename}`,
        blob: pdfBlob
      },
      [messageChannel.port2]
    );
  });
}

// Helper function to request cache cleanup
export async function cleanupCache(): Promise<{ success: boolean; error?: string }> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return { success: false, error: 'Service Worker not available' };
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'CLEANUP_CACHE' },
      [messageChannel.port2]
    );
  });
}

// Helper to show update notification
export function promptForUpdate(registration: ServiceWorkerRegistration) {
  if (window.confirm('A new version of the app is available. Would you like to update?')) {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}