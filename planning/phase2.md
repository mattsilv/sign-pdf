I have already logged in using Wrangler login in the CLI, so we shouldn't have to use a traditional API key. Let me know if we can do this just with Wrangler CLI.

**Cloudflare Pages** (not Workers!) is actually perfect for this - they absolutely still recommend Pages for static sites. Workers are for serverless functions, while Pages is their static site platform.

## Deployment Recommendation: **Cloudflare Pages** 🏆

### Why Cloudflare Pages wins for your PDF signer:

1. **Dead simple GitHub integration** - Connect repo, auto-deploys on push
2. **Faster global edge network** - 300+ locations vs Netlify's ~20
3. **Better privacy alignment** - Your privacy-first PDF tool on a privacy-conscious CDN
4. **Generous free tier** - Unlimited bandwidth, 500 builds/month
5. **Zero config for Vite** - Automatically detects and builds

### Setup in 2 minutes:

```yaml
# .github/workflows/deploy.yml (optional - Pages auto-deploys without this)
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: pdf-signer
          directory: dist
```

**OR even easier - via dashboard:**

1. Push code to GitHub
2. Go to Cloudflare dashboard → Pages
3. Connect GitHub repo
4. Build settings auto-detected:
   - Build command: `npm run build`
   - Output: `dist`
5. Deploy!

### Configure for optimal performance:

```toml
# _headers file in /public
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'none'; frame-ancestors 'none';

/pdf.worker.min.mjs
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
```

### Comparison:

| Feature         | Cloudflare Pages | Netlify     |
| --------------- | ---------------- | ----------- |
| Setup time      | 2 minutes        | 3-5 minutes |
| Build detection | Auto (Vite)      | Auto (Vite) |
| Free bandwidth  | Unlimited        | 100GB/month |
| Edge locations  | 300+             | ~20         |
| Preview deploys | ✅               | ✅          |
| Custom headers  | ✅               | ✅          |
| WASM support    | Native           | Works       |
| Deploy speed    | ~30s             | ~45s        |

### Environment variables (if needed):

```bash
# Cloudflare Pages dashboard or wrangler.toml
[env.production]
VITE_APP_VERSION = "1.0.0"
```

**Bottom line:** Cloudflare Pages is purpose-built for exactly this use case - a privacy-focused, client-side only Vite app. The setup is trivial, performance is unbeatable, and it aligns perfectly with your "no data leaves the browser" architecture.

Want the one-liner? After connecting GitHub:

```bash
git push origin main  # Auto-deploys to https://pdf-signer.pages.dev
```
