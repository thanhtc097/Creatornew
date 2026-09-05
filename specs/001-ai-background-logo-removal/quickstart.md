# Quickstart Validation: AI Background and Logo Removal

## Prerequisites

- Node.js and dependencies installed from the repository lockfile.
- A browser matrix containing at least one WebGPU-capable Chromium browser and one WebAssembly fallback browser/device.
- The pinned model asset acquired and checksum-verified through the planned model acquisition script.
- Only project-owned or explicitly authorized fixtures under `tests/fixtures/`.

## Setup and deterministic checks

```powershell
npm ci
npm run lint
npm test
```

Expected: lint and all state, validation, mask, stale-job, cleanup, and compositing invariant tests pass.

The implementation must provide a deterministic build command that does not require prompt-library network synchronization. Run that command, then serve the production output locally. The existing `npm run build` may still be used for the full release when network sync is intentionally available.

## Technical spike gate

Before implementing the full UI:

1. Acquire the exact model described by `public/models/inpainting-manifest.json`.
2. Verify SHA-256 and license metadata.
3. Load it through the planned worker on WebGPU and WebAssembly.
4. Process at least the flat, textured, repeated-pattern, edge-touching, and complex-scene fixtures.
5. Record cold transfer, initialization, warm inference, peak memory where observable, cancellation, and output validity.

Expected: both selected execution paths either pass the documented device matrix or fail with a supported, actionable compatibility state. No remote image request occurs. If model operators are incompatible, stop and select another evaluated local model before feature work continues.

## Browser workflow validation

Run the planned Playwright suite, then manually verify the following against the production build.

### Background removal

1. Open `/background-remover/` directly.
2. Upload `foreground-owned.png`.
3. Remove the background and download the transparent PNG.
4. Confirm alpha transparency, correct dimensions/name, and that the original remains recoverable.

### Authorized logo/object removal

1. Select **Erase owned logo/object**.
2. Read the permitted-use disclosure and confirm authorization.
3. Upload `authorized-logo-owned.png`.
4. Draw and erase parts of a mask with pointer/touch, then repeat the essential path with keyboard controls.
5. Process, compare original/result, undo/redo, revise, reprocess, and download.

Expected: the selected region is reconstructed; pixels outside the mask/blend boundary remain unchanged within tolerance; visible output equals downloaded output.

### Prohibited-purpose refusal

Identify the purpose as removing third-party rights-management information.

Expected: processing does not begin, no model job is created, and a clear refusal with permitted alternatives receives focus.

### Failure and concurrency

- Try corrupt, unsupported, empty-mask, excessive-mask, edge-touching, and resource-stress cases.
- Start a job, cancel it, then start another job.
- Change mode or source while a job is active.

Expected: original and current valid result are preserved; stale/cancelled results never overwrite the latest result; recovery actions are available.

## Accessibility and responsive validation

- Complete primary flows with keyboard only.
- Verify visible focus, live status, semantic mode selection, canvas description/status, non-color-only warnings, and practical touch targets.
- Test mobile and desktop widths, portrait/landscape, zoom, and reduced-motion preference.
- Verify all added visible/dynamic strings through the existing English/Vietnamese localization behavior.

## Privacy and network validation

With browser network tools open:

1. Process both modes.
2. Confirm requests contain only static page, runtime, model, and ordinary site assets.
3. Confirm no request body or URL contains file name, pixels, mask, result, or session content.
4. Reset/replace/unload and confirm object URLs/jobs are released and no further processing commits.

## SEO and release validation

- Confirm canonical remains `https://creatornew.com/background-remover/`.
- Validate title, description, application schema, FAQ copy, robots directive, and sitemap inclusion.
- Confirm the page works from the built direct path with relative assets.
- Record model/runtime license attribution and exact release checksum.

## Quality benchmark

Evaluate at least 20 authorized images across representative scene types. Record:

- selected-area ratio;
- usable/not-usable judgment under the agreed visual rubric;
- unintended changes outside the allowed blend boundary;
- cold/warm duration and backend;
- device/browser and failure category.

Expected: the benchmark demonstrates the measurable outcomes in `spec.md`, or the feature does not advance to release.
