# Quality Gates

**Date**: 2026-08-04

- `npm run lint`: passed with four pre-existing warnings outside the Background Remover feature.
- `npm test`: passed, 16/16 tests across validation, background-service behavior, session state, mask state, and compositing.
- `npm run build:offline`: passed and generated 17 sitemap tool URLs.
- `npm run test:e2e -- --workers=1`: passed, 6/6 direct-path tests on desktop and mobile Chrome emulation, including real-model inference.
- Real pinned-model inference: passed on desktop Chrome through WebAssembly after the spike rejected WebGPU for this artifact.

The full network-dependent `npm run build`, cross-browser/device matrix, accessibility audit, usability study, quality benchmark, CDN-header verification, and production-host smoke test remain release gates.
