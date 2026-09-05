# Tasks: AI Background and Logo Removal

**Input**: Design documents from `/specs/001-ai-background-logo-removal/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Automated tests are required by the feature plan and CreatorNew constitution. Write story tests first and confirm they fail for the intended reason before implementing the corresponding behavior.

**Organization**: Tasks are grouped by user story so each increment can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it modifies different files and does not depend on unfinished work in the same phase.
- **[Story]**: Maps work to User Story 1, 2, or 3 from `spec.md`.
- Every checklist task names its concrete file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish deterministic tooling, model provenance, and test structure without changing production behavior.

- [X] T001 Add pinned `onnxruntime-web`, Vitest, DOM test environment, and Playwright dependencies plus `test`, `test:e2e`, `build:offline`, and model-validation scripts in `package.json` and `package-lock.json`
- [X] T002 [P] Configure unit-test discovery, DOM environment, coverage exclusions, and canvas/worker mocks in `vitest.config.js` and `tests/setup/browser-mocks.js`
- [X] T003 [P] Configure direct-path desktop/mobile browser projects and production-preview startup in `playwright.config.js`
- [ ] T004 [P] Create the authorized fixture catalog and provenance record for foreground, authorized-logo, complex-edge, textured, repeated-pattern, edge-touching, corrupt, and synthetic oversized-dimension inputs in `tests/fixtures/README.md` and `tests/fixtures/`
- [X] T005 Add the pinned model ID, immutable source URL, expected size, SHA-256, 512×512 tensor contract, license, and attribution to `public/models/inpainting-manifest.json`
- [X] T006 Implement reproducible model download, checksum verification, cache reuse, and nonzero failure behavior in `scripts/fetch-inpainting-model.mjs`
- [X] T007 Add an offline production-build path that skips prompt synchronization but preserves Vite and sitemap generation in `package.json` and `scripts/generate-tools-sitemap.mjs`

**Checkpoint**: The project can install, lint, run empty test suites, acquire a pinned model reproducibly, and build without unrelated network synchronization.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Prove the AI runtime and implement shared session boundaries that block all user stories.

**⚠️ CRITICAL**: Do not begin full story implementation until the LaMa compatibility spike passes or an evaluated local replacement is documented.

- [ ] T008 Create a minimal browser compatibility spike for model initialization and one masked inference through WebGPU and WebAssembly in `spikes/inpainting/index.html`, `spikes/inpainting/spike.js`, and `spikes/inpainting/spike.worker.js`
- [ ] T009 Execute the spike on stable Chrome/Edge Windows WebGPU, Chrome Android WebGPU when exposed, Firefox desktop WebAssembly, Safari desktop/iOS WebAssembly, and at least one 4 GB-class mobile device; record compatibility, cold transfer, initialization, warm inference, memory, cancellation, output validity, and the go/no-go decision in `specs/001-ai-background-logo-removal/spike-results.md`
- [X] T010 Update the chosen model, backend matrix, limits, and fallback decision after the spike in `specs/001-ai-background-logo-removal/research.md`, `public/models/inpainting-manifest.json`, and `specs/001-ai-background-logo-removal/plan.md`
- [X] T011 [P] Write failing validation tests for MIME type, byte limit, decode failure, dimensions, animated input handling, oversized-resolution disclosure, explicit reduce-or-cancel choice, and resource warnings in `tests/unit/background-remover/validation.test.js`
- [X] T012 [P] Write failing state tests for SourceImage/EditSession transitions, monotonic job IDs, last-job-wins commits, cancellation, object-URL cleanup, and bounded history in `tests/unit/background-remover/state.test.js`
- [X] T013 Implement image validation, stable error categories, supported-resolution calculation, and an original-preserving reduced-working-copy decision in `js/background-remover/validation.js` to satisfy `tests/unit/background-remover/validation.test.js`
- [X] T014 Implement session state, job-token isolation, cancellation transitions, result ownership, bounded history primitives, and cleanup in `js/background-remover/state.js` to satisfy `tests/unit/background-remover/state.test.js`
- [ ] T015 [P] Create localizable status/error keys for all UI-contract states in `js/site-i18n.js`
- [X] T016 [P] Add feature stylesheet loading and responsive editor scaffolding without altering other tools in `background-remover/index.html` and `css/background-remover.css`
- [X] T017 Refactor `js/background-remover.js` to use `validation.js` and `state.js`, require explicit reduce-or-cancel confirmation for oversized images, and preserve the current default background-removal workflow and page startup behavior

**Checkpoint**: The model gate is documented, shared validation/state tests pass, and the existing tool still loads directly before new modes are added.

---

## Phase 3: User Story 1 — Remove an Image Background Automatically (Priority: P1) 🎯 MVP

**Goal**: Preserve and harden the existing automatic background-removal workflow so users can obtain a transparent PNG without losing the original on failure.

**Independent Test**: Open `/background-remover/` directly, upload a supported foreground image, remove its background, verify the transparent preview, and download the matching PNG; repeat with a processing failure and confirm the original remains available with retry guidance.

### Tests for User Story 1

- [X] T018 [P] [US1] Write failing unit tests for background-service progress normalization, PNG output, cancellation, and safe error mapping in `tests/unit/background-remover/background-service.test.js`
- [ ] T019 [P] [US1] Write failing direct-path Playwright tests for upload, progress, successful transparent result/download, clear/reset, keyboard upload, invalid input, oversized-image reduce/cancel choices, and retained original after failure in `tests/e2e/background-remover-background.spec.js`

### Implementation for User Story 1

- [X] T020 [US1] Move the existing IMG.LY integration behind a cancellable browser-local adapter in `js/background-remover/background-service.js` and satisfy `tests/unit/background-remover/background-service.test.js`
- [X] T021 [US1] Integrate the background service, current-job commit guard, retry, clear, URL cleanup, and transparent-PNG download into `js/background-remover.js`
- [X] T022 [US1] Preserve the default background-mode markup, progress semantics, original/result previews, and failure recovery controls in `background-remover/index.html`
- [X] T023 [US1] Complete focused/responsive background-mode states and non-color-only feedback in `css/background-remover.css`
- [ ] T024 [US1] Run and fix the US1 unit/e2e suite, conduct a timed usability test with at least 10 first-time users, and record SC-001 completion/time plus independent acceptance evidence in `specs/001-ai-background-logo-removal/validation/us1-background-removal.md`

**Checkpoint**: User Story 1 is independently releasable as a hardened version of the existing tool.

---

## Phase 4: User Story 2 — Remove an Owned Logo or Unwanted Object (Priority: P2)

**Goal**: Let an authorized user paint a precise mask and locally reconstruct the selected logo/object region while preserving surrounding pixels and refusing prohibited purposes.

**Independent Test**: Open object mode with an authorized fixture, confirm ownership, add/erase a mask, process locally, and verify that only the selected region plus the allowed blend boundary changes; identify a prohibited watermark-removal purpose and verify that no processing job starts.

### Tests for User Story 2

- [X] T025 [P] [US2] Write failing normalized-stroke, add/erase, brush-bound, coverage, edge-touching, resize, keyboard-cursor, and mask-export tests in `tests/unit/background-remover/mask-editor.test.js`
- [X] T026 [P] [US2] Write failing crop/pad/resize, 512×512 tensor preparation, source-dimension restoration, FR-005 feather-bound calculation, and unchanged-pixel tests outside that boundary in `tests/unit/background-remover/compositor.test.js`
- [ ] T027 [P] [US2] Write failing worker-protocol tests for initialize, WebGPU-to-WASM fallback, progress, transferable buffers, cancellation, disposal, incompatible model, and stale results in `tests/unit/background-remover/inpaint-worker.test.js`
- [ ] T028 [P] [US2] Write failing Playwright tests for mode selection, exact first-use model size/progress within one second, authorization gate, user-identified prohibited-purpose refusal without claiming automatic detection, pointer/touch/keyboard masking, warnings, local processing, cancellation, result, and download in `tests/e2e/background-remover-object.spec.js`

### Implementation for User Story 2

- [X] T029 [P] [US2] Implement normalized pointer/touch/keyboard mask editing, brush controls, visible overlay, coverage/bounds calculation, resize preservation, and accessible status in `js/background-remover/mask-editor.js`
- [X] T030 [P] [US2] Implement padded region extraction, model input preparation, mask conversion, FR-005-bounded feathered compositing, source-resolution restoration, and PNG export in `js/background-remover/compositor.js`
- [X] T031 [US2] Implement the `initialize`, `process`, `cancel`, `dispose`, `status`, `result`, and `error` protocol with explicit tensor/GPU-buffer disposal in `js/background-remover/inpaint.worker.js`
- [X] T032 [US2] Implement lazy worker/runtime/model loading, feature-detected backend selection, progress forwarding, cancellation, and stable error mapping in `js/background-remover/inpaint-service.js`
- [X] T033 [US2] Add accessible mode selection, permitted-use disclosure, ownership confirmation, prohibited-purpose control, editor canvas, mask toolbar, warnings, process/cancel, result, and download markup in `background-remover/index.html`
- [X] T034 [US2] Implement object-mode orchestration, empty/large mask gates, authorization/refusal checks, job isolation, local inference, retry, and result commit in `js/background-remover.js`
- [X] T035 [US2] Style the mode selector, disclosure, editor layers, mask toolbar, warnings, progress, touch targets, keyboard cursor, and mobile/desktop object-mode layouts in `css/background-remover.css`
- [X] T036 [US2] Add exact English/Vietnamese strings and ARIA/status translations for object mode, consent, model loading, warnings, refusal, cancellation, and errors in `js/site-i18n.js`
- [ ] T037 [US2] Define the SC-002 pass/fail rubric for structural plausibility, blur/repetition, seams, subject damage, and pixel tolerance; then run the 20-image authorized benchmark and document image-by-image outcomes in `specs/001-ai-background-logo-removal/validation/object-removal-benchmark.md`
- [ ] T038 [US2] Run and fix the US2 unit/e2e suite and record privacy/network inspection plus independent acceptance evidence in `specs/001-ai-background-logo-removal/validation/us2-object-removal.md`

**Checkpoint**: User Story 2 works independently with browser-local inference, authorization boundaries, and measured quality evidence.

---

## Phase 5: User Story 3 — Review, Compare, and Correct the Result (Priority: P3)

**Goal**: Let users compare original/result, undo or redo edits, revise a mask, reprocess safely, reset, and download exactly the committed visible result.

**Independent Test**: Produce a result, compare it against the original, undo/redo a mask edit, revise and reprocess, confirm a stale prior job cannot overwrite the new result, reset to the original, and download the chosen version.

### Tests for User Story 3

- [ ] T039 [P] [US3] Write failing tests for history branching, undo/redo caps, result retention/release, mask revision, stale reprocessing, reset, and visible-result download selection in `tests/unit/background-remover/history.test.js`
- [ ] T040 [P] [US3] Write failing Playwright tests for comparison controls, keyboard comparison, undo/redo availability, revise/reprocess, rapid-job replacement, reset confirmation, and chosen-result download in `tests/e2e/background-remover-review.spec.js`

### Implementation for User Story 3

- [X] T041 [US3] Extend bounded history with branching undo/redo, result ownership, safe blob release, and full-session reset behavior in `js/background-remover/state.js`
- [ ] T042 [P] [US3] Implement non-destructive original/result comparison rendering and selected-result export helpers in `js/background-remover/compositor.js`
- [ ] T043 [US3] Add accessible compare, undo, redo, revise, reset-confirmation, and download-selected-result markup in `background-remover/index.html`
- [ ] T044 [US3] Wire comparison, history actions, mask revisions, safe reprocessing, reset, and current-result download into `js/background-remover.js`
- [ ] T045 [US3] Style comparison, history, disabled/focus states, reduced motion, and responsive review controls in `css/background-remover.css`
- [ ] T046 [US3] Add English/Vietnamese comparison, history, revision, reset, and download-result strings in `js/site-i18n.js`
- [ ] T047 [US3] Run and fix the US3 unit/e2e suite and record independent acceptance evidence in `specs/001-ai-background-logo-removal/validation/us3-review-correct.md`

**Checkpoint**: All three user stories are independently functional and the latest user intent always controls the visible/downloadable result.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete performance, accessibility, privacy, SEO, release, and regression evidence across all stories.

- [ ] T048 [P] Update title, description, application schema, FAQ, privacy/model-download explanation, permitted-use language, and canonical preservation in `background-remover/index.html`
- [X] T049 [P] Add the pinned model/runtime license, attribution, size, checksum, and update procedure to `README.md` and `public/models/inpainting-manifest.json`
- [X] T050 Audit image/mask/result lifetime, network requests, worker shutdown, object URL revocation, tensor/GPU buffer disposal, and absence of client secrets; record findings in `specs/001-ai-background-logo-removal/validation/privacy-review.md`
- [ ] T051 Run keyboard-only, screen-reader semantics, visible focus, touch targets, zoom, reduced-motion, and mobile/desktop viewport checks; fix issues in `background-remover/index.html` and `css/background-remover.css` and record results in `specs/001-ai-background-logo-removal/validation/accessibility.md`
- [ ] T052 Measure first download, cold/warm initialization, inference duration, UI responsiveness, and low-memory behavior across the representative matrix; apply justified lazy-load/resource fixes in `js/background-remover/inpaint-service.js` and record results in `specs/001-ai-background-logo-removal/validation/performance.md`
- [ ] T053 Run `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build:offline`, and the full `npm run build`; fix only feature-related failures and record exact results in `specs/001-ai-background-logo-removal/validation/quality-gates.md`
- [ ] T054 Verify production `dist/background-remover/index.html` direct loading, relative assets, both modes, console cleanliness, canonical/schema/robots metadata, sitemap inclusion, and model content type/CORS/immutable Cache-Control/size/checksum/worker access in `specs/001-ai-background-logo-removal/validation/release-smoke.md`
- [ ] T055 Review the final implementation against every requirement and measurable outcome in `specs/001-ai-background-logo-removal/spec.md`, documenting passed evidence and any explicitly deferred work in `specs/001-ai-background-logo-removal/validation/requirements-traceability.md`
- [X] T056 Remove spike-only deploy artifacts while retaining evidence; exclude downloaded models, archives, credentials, private images, and temporary files from source control in `.gitignore` and `.npmignore`, while verifying the checksum-approved model is included in the production release as recorded in `specs/001-ai-background-logo-removal/spike-results.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: Starts immediately.
- **Phase 2 — Foundational**: Depends on Phase 1 and blocks all story work. T009 depends on T008; T010 depends on T009. T013 depends on T011, T014 depends on T012, and T017 depends on T013–T016.
- **Phase 3 — US1**: Depends on Phase 2. Tests T018–T019 precede implementation T020–T023; T024 validates the completed story.
- **Phase 4 — US2**: Depends on Phase 2 and the successful T010 model decision. Tests T025–T028 precede implementation. T031 depends on T030 and the spike contract; T032 depends on T031; T034 depends on T029–T033; T037–T038 validate the story.
- **Phase 5 — US3**: Depends on Phase 2 plus the presence of at least one completed result workflow from US1 or US2. Tests T039–T040 precede implementation T041–T046; T047 validates the story.
- **Phase 6 — Polish**: Depends on all stories intended for release.

### User Story Completion Order

```text
Setup → Foundational/model gate ─┬→ US1: Background removal (MVP)
                                 └→ US2: Authorized object removal
US1 or US2 completed ─────────────→ US3: Review and correction
US1 + US2 + US3 ──────────────────→ Polish and release gates
```

- **US1** does not depend on US2 or US3 and is the recommended MVP.
- **US2** does not depend on US1 behavior, but shares foundational validation/session infrastructure.
- **US3** is independently testable against either result-producing mode, then must be regression-tested against both.

## Parallel Opportunities

### Setup

- T002, T003, and T004 can run in parallel after T001's dependency choices are known.
- T005 can run alongside test configuration; T006 follows the manifest contract.

### Foundational

- T011 and T012 can be authored in parallel.
- T013 and T014 can then be implemented in parallel.
- T015 and T016 can run while the spike T008–T010 is being evaluated.

### User Story 1

```text
T018: unit contract for background service
T019: direct-path browser workflow
```

After both tests fail correctly, T020 can proceed while T022–T023 prepare markup/styles; T021 integrates them.

### User Story 2

```text
T025: mask-editor tests
T026: compositor tests
T027: worker-protocol tests
T028: object-mode browser tests
```

After failing tests are established, T029 and T030 can run in parallel. T031–T034 follow protocol order, while T035–T036 can proceed on separate files.

### User Story 3

T039 and T040 can run in parallel. Afterward, T041 and T042 can run in parallel; T043 and T045 can also run in parallel before T044 integration and T046 localization completion.

## Implementation Strategy

### MVP First — User Story 1

1. Complete Setup and the Foundational/model gate.
2. Complete US1 while preserving the current URL and behavior.
3. Stop and run T024 independently.
4. Deploy only if lint, deterministic build, direct-path, privacy, and transparent-output checks pass.

### Incremental Delivery

1. **Foundation**: deterministic tooling, pinned model provenance, compatibility evidence, validation, and state isolation.
2. **US1**: hardened background removal remains immediately useful and independently deployable.
3. **US2**: add authorized logo/object removal only after the local AI gate passes.
4. **US3**: add review/correction without changing processing providers.
5. **Polish**: satisfy quality, privacy, accessibility, performance, SEO, and release gates.

### Failure Strategy

- If T009 shows the selected model is incompatible, T010 must select and document an evaluated local replacement before US2 tasks continue.
- Do not substitute a remote API, expose a secret, or upload user images under this task list; that requires a separate specification and privacy review.
- Record intentionally deferred requirements in T055 rather than silently reducing scope.

## Notes

- `[P]` means the task is safe to execute concurrently based on current file boundaries.
- Story tests must fail for the expected missing behavior before implementation begins.
- Preserve unrelated changes in the dirty worktree and stage only files belonging to this feature.
- Downloaded model binaries, `dist/`, archives, and temporary benchmark outputs are not source of truth.
