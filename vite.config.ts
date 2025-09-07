import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate vendor chunks for better caching
          if (id.includes('node_modules')) {
            // Large PDF libraries in their own chunks
            if (id.includes('pdfjs-dist')) {
              return 'pdfjs';
            }
            if (id.includes('pdf-lib') || id.includes('@pdf-lib')) {
              return 'pdf-lib';
            }
            // Signature and fingerprinting libraries
            if (id.includes('signature_pad')) {
              return 'signature';
            }
            if (id.includes('fingerprintjs')) {
              return 'forensics';
            }
            // React and other vendor libs
            if (id.includes('react')) {
              return 'react-vendor';
            }
            // Other vendor code
            return 'vendor';
          }
        }
      }
    },
    // Increase chunk size warning limit since PDFs are inherently large
    chunkSizeWarningLimit: 600
  }
})