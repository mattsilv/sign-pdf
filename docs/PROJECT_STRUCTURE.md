# Project Structure Guide

## Directory Organization

```
sign-pdf/
│
├── src/                      # Application source code
│   ├── components/          # React components
│   ├── lib/                 # Utility libraries and helpers
│   │   └── pdf/            # PDF-specific utilities
│   └── App.tsx             # Main application component
│
├── docs/                    # Documentation
│   ├── engineering/        # Technical design docs and primers
│   ├── issues/            # Issue descriptions and investigations
│   └── PROJECT_STRUCTURE.md
│
├── tests/                   # Test files
│   ├── e2e/               # End-to-end Playwright tests
│   ├── playwright/        # Playwright helper scripts
│   └── fixtures/          # Test data and fixtures
│
├── public/                  # Static assets
│   ├── sample-nda.pdf     # Sample document for testing
│   └── pdf.worker.min.mjs # PDF.js worker
│
├── planning/                # Project planning documents
│   └── *.pdf              # Sample signed documents
│
├── .playwright-mcp/         # Playwright screenshots (gitignored)
├── .playwright-data/        # Playwright browser data (gitignored)
├── playwright-report/       # Test reports (gitignored)
├── test-results/           # Test artifacts (gitignored)
│
├── README.md               # Project overview
├── CLAUDE.md              # AI assistant instructions
└── [config files]         # Root-level configs only
```

## File Placement Rules

1. **Documentation**: All markdown docs go in `docs/` subdirectories
   - Technical designs → `docs/engineering/`
   - Issue tracking → `docs/issues/`
   - Guides → `docs/`

2. **Tests**: Organized by type
   - E2E specs → `tests/e2e/*.spec.ts`
   - Test helpers → `tests/playwright/`
   - Test data → `tests/fixtures/`

3. **Source Code**: Component-based organization
   - React components → `src/components/`
   - Utilities by domain → `src/lib/{domain}/`

4. **Root Directory**: Keep minimal
   - Only config files (vite, tsconfig, package.json)
   - README.md and CLAUDE.md
   - No test files or documentation

## Naming Conventions

- Components: PascalCase (e.g., `PDFViewer.tsx`)
- Utilities: camelCase (e.g., `coordinateMapper.ts`)
- Documentation: SCREAMING_SNAKE_CASE for importance (e.g., `COORDINATE_BUG_INVESTIGATION.md`)
- Test files: `*.spec.ts` for specs, descriptive names for helpers