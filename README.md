# PDF Signer - Privacy First

A client-side PDF signing application built with modern web technologies. Sign PDFs with complete privacy - all processing happens in your browser, no data leaves your device.

## ✨ Features

- **Privacy-First**: All PDF processing happens locally in your browser
- **Multiple Annotation Types**: Text, signatures, checkmarks, and dates
- **WYSIWYG Editing**: What you see is exactly what gets exported
- **Cross-Platform**: Works on desktop and mobile browsers
- **Modern Export**: Uses File System Access API with graceful fallbacks

## 🏗️ Tech Stack

- **Vite** 7.1.4 - Build tool
- **React** 18 + TypeScript - UI framework
- **PDF.js** 5.4.149 - PDF rendering and coordinate mapping
- **pdf-lib** 1.17.1 - PDF modification and export
- **signature_pad** 5.1.0 - Digital signature capture
- **@pdf-lib/fontkit** - Font embedding support

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Deployment

This application is designed to deploy to Cloudflare Pages:

1. Connect your GitHub repository to Cloudflare Pages
2. Build settings are auto-detected (Vite)
3. Deploy automatically on git push

## 🔒 Security

- Content Security Policy headers configured
- No external API calls or data transmission
- All PDF processing happens client-side
- Privacy-focused architecture

## 📄 License

MIT