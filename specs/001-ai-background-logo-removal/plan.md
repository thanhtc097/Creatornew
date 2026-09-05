# Implementation Plan: AI Background and Logo Removal

**Branch**: `001-ai-background-logo-removal` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ai-background-logo-removal/spec.md`

## Summary

Upgrade the existing static `/background-remover/` page with two explicit workflows: the current automatic background-removal flow and an authorized logo/object eraser driven by a user-painted mask. Keep image pixels local by running a pinned LaMa ONNX model in a dedicated browser worker, preferring WebGPU and falling back to WebAssembly. Load the inpainting runtime and approximately 93 MB model only after the user enters object-removal mode, preserve the original image in memory, and isolate results with cancellable monotonic job IDs. The existing URL, SEO metadata, static Vite delivery, shared localization, and background-removal behavior remain backward compatible.

## Technical Context

**Language/Version**: JavaScript ES modules, HTML5, CSS; Node.js-compatible Vite 8 build tooling

**Primary Dependencies**: Existing `@imgly/background-removal@1.7.0` browser import for subject segmentation; add pinned `onnxruntime-web` for local LaMa inference; browser Canvas, Pointer Events, Web Workers, WebGPU when available, WebAssembly fallback

**Storage**: No application database or persistent user-image storage. Images, masks, history, and results remain session-memory objects; normal browser HTTP cache may retain immutable runtime/model assets, never user pixels.

**Testing**: Oxlint; add Vitest with a DOM environment for deterministic modules; add Playwright for direct-path desktop/mobile browser flows; curated project-owned image fixtures and pixel-invariant checks; documented visual quality benchmark

**Target Platform**: Current evergreen desktop and mobile browsers supported by CreatorNew. The selected OpenCV LaMa artifact is validated with WebAssembly because its Fourier path failed during WebGPU execution; WebGPU remains rejected for this exact model version. The representative validation matrix includes latest stable Chrome or Edge on Windows, Chrome on a mid-range Android device, Firefox on Windows or macOS, and Safari on iOS or macOS, all using the WebAssembly worker. Include at least one mobile device with 4 GB RAM or the nearest available low-memory equivalent. Static delivery targets cPanel behind Cloudflare.

**Project Type**: Static multi-page web application

**Performance Goals**: Background-removal behavior must not regress; object-removal runtime/model loads only on demand; first use reports exact model size and progress or a download failure within one second; after model readiness, 90% of supported images up to 12 MP produce a preview or actionable failure within 15 seconds on the defined representative device matrix; editor input remains responsive while inference runs; pixels outside the FR-005 blending boundary remain stable within the benchmark tolerance

**Constraints**: Browser-first privacy; no client-exposed secret or image upload; approximately 92.6 MB first-use inpainting model; low-memory mobile devices; fixed 512×512 model input; direct `/background-remover/` navigation; relative Vite base; accessible keyboard/touch controls; English/Vietnamese shared localization; no prohibited watermark or rights-mark removal

**Scale/Scope**: One existing tool page, two edit modes, one image per session, JPG/PNG/WebP up to the existing 25 MB limit, still images only, bounded undo/redo history, no accounts, no server jobs, no video or animated-image editing

## Constitution Check

*GATE: Passed before research and re-checked after Phase 1 design.*

| Principle | Gate | Design Evidence | Result |
|-----------|------|-----------------|--------|
| I. Browser-First Privacy | User pixels must remain local unless a separately disclosed and consented remote path exists. | Both background segmentation and LaMa inpainting run in-browser; only versioned executable/model assets cross the network. Session cleanup revokes URLs and releases buffers. | PASS |
| II. Independent Multi-Page Tools | Stable direct path, shared code separation, Vite multi-page and relative deployment must remain valid. | Existing `/background-remover/` and Vite input remain; feature modules live under `js/background-remover/`; feature CSS is isolated. | PASS |
| III. Accessible Responsive Experience | Keyboard, touch, focus, labels, status, responsive layout, and localization are mandatory. | UI contract defines mode controls, canvas alternatives, focus behavior, live status, touch targets, and translation keys. | PASS |
| IV. Verifiable Changes | Acceptance scenarios precede code; lint/build plus success, invalid, boundary, and failure checks are required. | Quickstart defines lint, unit, e2e, build, fixture, privacy, stale-job, and direct-path checks. | PASS |
| V. Static Delivery, Performance, Discoverability | Static compatibility, lazy heavy assets, SEO/canonical/sitemap preservation, and clean releases are required. | Worker/runtime/model are lazy; version/checksum manifest is release-controlled; canonical and sitemap path are unchanged. | PASS |

### Post-design re-check

The data model is session-only, worker messages contain no network endpoint, and UI contracts preserve direct-path and accessibility requirements. No constitutional exception is required. A technical spike must validate the selected ONNX model against both WebGPU and WebAssembly before feature implementation proceeds; failure selects an evaluated local alternative rather than silently adding remote processing.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-background-logo-removal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ui-contract.md
│   └── worker-protocol.md
└── tasks.md                 # created later by $speckit-tasks
```

### Source Code (repository root)

```text
background-remover/
└── index.html               # stable SEO page and accessible editor markup

css/
├── style.css                # existing shared design primitives
└── background-remover.css   # feature layout, mask canvas, compare, responsive states

js/
├── background-remover.js    # page controller and mode orchestration
├── image-engine.js          # existing shared filename/download helpers
├── site-i18n.js             # existing EN/VI text catalog
└── background-remover/
    ├── state.js             # session state, history, job tokens and cleanup
    ├── validation.js        # file decode, type/size/dimension/resource checks
    ├── mask-editor.js       # pointer/touch/keyboard mask editing
    ├── background-service.js# adapter for existing background removal
    ├── inpaint-service.js   # provider-neutral client and worker lifecycle
    ├── compositor.js        # crop/pad/scale, feather, composite and export
    └── inpaint.worker.js    # local ONNX inference off the UI thread

public/
└── models/
    └── inpainting-manifest.json # pinned URL/version/size/SHA/license metadata

scripts/
└── fetch-inpainting-model.mjs   # reproducible release-time acquisition/checksum

tests/
├── unit/
│   ├── state.test.js
│   ├── validation.test.js
│   ├── mask-editor.test.js
│   └── compositor.test.js
├── e2e/
│   └── background-remover.spec.js
└── fixtures/
    ├── foreground-owned.png
    ├── authorized-logo-owned.png
    ├── complex-edge-owned.png
    └── corrupt-image.jpg
```

**Structure Decision**: Extend the existing plain-JavaScript multi-page tool rather than moving it into the unrelated React scaffold. Keep the page controller small and place reusable feature logic in a dedicated module directory. Add feature CSS after the global stylesheet to reduce cross-tool regression risk. The model binary is not hand-edited or treated as source: a checked-in manifest and acquisition/checksum script define the release asset.

## Implementation Strategy

1. Run a compatibility spike using the pinned OpenCV LaMa ONNX candidate on WebGPU and WebAssembly. Verify operator support, output contract, peak memory, first download, warm inference, cancellation behavior, and representative desktop/mobile results.
2. Preserve the existing background workflow behind a service adapter and add mode switching without changing its default behavior.
3. Build a resolution-independent mask editor that stores normalized strokes, renders a visible overlay, supports add/erase/clear, and exposes keyboard-accessible controls. Canvas drawing itself is pointer/touch driven; keyboard users receive explicit step/position controls rather than a pointer-only workflow.
4. Run inpainting in a dedicated worker. Downscale/pad the mask bounding region to the model input, include contextual pixels, infer locally, then composite only the masked region back at source resolution with a small feathered boundary.
5. Add bounded history for masks and committed results, a monotonic job ID, abort/cancel signaling, and last-job-wins result commits.
6. Add consent and prohibited-use disclosure before object removal. This release refuses prohibited purposes identified by the user and does not claim automated rights-mark detection. Any later detector requires a separately specified and measured classifier.
7. Lazy-load object-removal assets, show exact first-use download progress/size, release tensors and GPU buffers, and provide clear low-memory/unsupported-device recovery.
8. Update localized strings, SEO copy, FAQ/schema, and sitemap validation while retaining the canonical path.

## Model and Release Controls

- Candidate: OpenCV `inpainting_lama_2025jan.onnx`, Apache-2.0, approximately 92.6 MB. Pin exact SHA-256 and license/attribution in `inpainting-manifest.json` after spike verification.
- Never load a mutable “latest” model URL. Keep the binary out of source control, but require release automation to download the pinned artifact, verify its checksum, and place it in the deployable model directory. A release missing the verified model MUST fail rather than ship a broken object-removal mode.
- Prefer same-origin or CreatorNew-controlled CDN delivery. Production validation MUST confirm the model's content type, CORS behavior, immutable `Cache-Control` policy, byte size, checksum, and worker access. Model download never contains user data.
- The compatibility spike rejected WebGPU for `opencv-lama-2025jan` after an Add kernel failed in the Fourier path. This model therefore uses WebAssembly in a worker. WebGL is not selected because it is maintenance-only for this runtime; a future model may re-enable feature-detected WebGPU only after a new spike.
- If the model fails the compatibility/quality gate, evaluate another Apache-2.0 local ONNX export. A remote API is out of scope for this plan and requires a new privacy/server specification.

## Testing and Quality Gates

- Unit: validation, normalized mask operations, coverage thresholds, bounding box/padding, history cap, URL/buffer cleanup, stale-job suppression, and outside-mask pixel invariants.
- Browser: direct-path load, both edit modes, first-use disclosure, ownership consent, prohibited-purpose refusal, pointer/touch/keyboard mask control, compare, undo/redo, reset, cancel, download, responsive layouts, and no-console-error smoke checks.
- AI benchmark: before scoring, define a pass/fail rubric covering structural plausibility, obvious blur/repetition artifacts, seam visibility, subject damage, and changed pixels outside the FR-005 boundary. Evaluate at least 20 project-owned/authorized images across flat, textured, repeated, edge-touching, human, product, and complex-scene backgrounds and record outcomes against SC-002.
- Usability: observe at least 10 first-time users completing the US1 workflow without assistance and record completion rate and elapsed time against SC-001.
- Performance: record model transfer size, cold/warm initialization, inference duration, peak memory where observable, and UI responsiveness on the representative browser/device matrix.
- Release: `npm run lint`, deterministic unit/e2e commands, offline-capable production build, direct `dist/background-remover/` smoke test, metadata/canonical/schema inspection, and sitemap inclusion.

## Complexity Tracking

No constitutional violations require justification. The worker, provider adapter, and acquisition manifest are warranted boundaries for responsiveness, testability, and reproducible delivery of a large third-party model.
