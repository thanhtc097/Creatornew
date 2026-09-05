# Research: AI Background and Logo Removal

## Decision 1: Browser-local inpainting

**Decision**: Use LaMa inpainting locally in the browser for the authorized logo/object-removal workflow.

**Rationale**: CreatorNew is static and promises browser-first privacy. Local inference avoids image upload, API secrets, retention policy, recurring inference cost, and server availability. LaMa is designed for resolution-robust image inpainting and is Apache-2.0 licensed.

**Alternatives considered**:

- Remote commercial inference: potentially broader device compatibility and higher quality, but requires a secret-safe backend, upload consent, retention/deletion controls, rate limits, abuse controls, and operating cost. Out of scope.
- Classical canvas/OpenCV inpainting: much smaller and faster, but does not honestly meet the requested AI quality for textured or larger logo regions.
- Diffusion inpainting: higher generative potential, but current browser payload and multi-step compute are too large for the first release.

**Sources**: [LaMa project and Apache-2.0 license](https://github.com/advimman/lama), [LaMa WACV paper](https://openaccess.thecvf.com/content/WACV2022/papers/Suvorov_Resolution-Robust_Large_Mask_Inpainting_With_Fourier_Convolutions_WACV_2022_paper.pdf)

## Decision 2: ONNX Runtime Web with WebGPU and WebAssembly

**Decision**: Run a pinned ONNX model through ONNX Runtime Web in a dedicated worker. The implementation spike rejected WebGPU for the selected OpenCV LaMa artifact because inference failed at an Add kernel in its Fourier path; use WebAssembly for this model version.

**Rationale**: ONNX Runtime Web officially supports in-browser inference and WebAssembly broadly. A worker prevents inference from blocking editor interaction. The exact model loaded and initialized with WebGPU but failed during a real masked inference, whereas the same pinned artifact completed through WebAssembly. WebGL is not chosen because the runtime documents it as maintenance mode.

**Alternatives considered**:

- Transformers.js: useful pipeline abstraction but adds no necessary value for a direct, fixed inpainting tensor contract.
- WebGPU-only: smaller support surface but excludes valid browsers/devices and violates graceful fallback expectations.
- Main-thread inference: simpler wiring but risks frozen controls and inaccessible cancellation/status behavior.

**Sources**: [ONNX Runtime Web overview](https://onnxruntime.ai/docs/tutorials/web/), [WebGPU execution provider](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html), [browser support matrix](https://onnxruntime.ai/docs/get-started/with-javascript/web.html), [performance guidance](https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html)

## Decision 3: Model candidate and compatibility spike

**Decision**: Begin with OpenCV's Apache-2.0 `inpainting_lama_2025jan.onnx` candidate (approximately 92.6 MB) and make WebGPU/WASM compatibility and quality a blocking spike before implementation.

**Rationale**: It is substantially smaller than common FP32 LaMa exports near 200 MB. However, its stated OpenCV DNN use does not prove all Fourier/FFT operators work in ONNX Runtime Web, so the plan does not treat it as validated until exercised in target browsers.

**Alternatives considered**:

- Carve/LaMa FP32 ONNX: Apache-2.0 but approximately 207–208 MB, producing a worse first-use experience.
- Moebius/diffusion ONNX: approximately gigabyte-scale combined assets and multi-step inference, unsuitable for default static web delivery.
- Unpinned Hugging Face URL: easier initially but mutable and not reproducible.

**Sources**: [OpenCV LaMa model files](https://huggingface.co/opencv/inpainting_lama/tree/main), [OpenCV LaMa model card](https://huggingface.co/opencv/inpainting_lama/blob/main/README.md), [Carve LaMa ONNX](https://huggingface.co/Carve/LaMa-ONNX/tree/main)

## Decision 4: Lazy, reproducible model delivery

**Decision**: Load the runtime/model only after object-removal mode is selected. Define the exact model in a checked-in manifest and use a release-time acquisition script that verifies its checksum before packaging.

**Rationale**: Background-removal users should not pay the inpainting download cost. A versioned manifest and checksum protect reproducibility without treating a large generated/downloaded binary as hand-maintained source.

**Alternatives considered**:

- Bundle model into the normal JavaScript chunk: harms every page load and caching.
- Download directly from a mutable third-party branch: risks silent changes, availability issues, and irreproducible releases.
- Commit the large binary without an acquisition process: increases repository weight and obscures provenance.

## Decision 5: Region-based 512×512 processing and controlled compositing

**Decision**: Compute a padded bounding region around the user mask, resize/pad that working region to the fixed model input, infer, and composite only the masked area plus a small feather boundary back into the original-resolution image.

**Rationale**: This respects device limits and the fixed model contract while preserving pixels outside the authorized selection. It also makes the outside-mask invariant testable.

**Alternatives considered**:

- Resize the entire source and replace the full image: damages unselected pixels and degrades high-resolution output.
- Full-resolution tiling in v1: improves large-region fidelity but greatly expands seam handling, runtime, memory, and test scope.
- Automatic object segmentation: adds another large model and does not replace the need for user-controlled authorization/masking.

## Decision 6: Policy boundary through disclosure and intent confirmation

**Decision**: Require ownership/authorization confirmation and explicit permitted-use copy. Refuse requests the user identifies as removing copyright watermarks, third-party ownership/authenticity marks, signatures, or security marks.

**Rationale**: The requested feature has legitimate uses but must not be positioned as a rights-management bypass. No reliable automatic rights-mark classifier is in scope, so the product must not make an unverified detection claim.

**Alternatives considered**:

- Automatic watermark detector: not selected because no evaluated classifier, dataset, false-positive target, or performance budget exists.
- No policy gate: inconsistent with the bounded feature specification.

## Decision 7: Test stack and evidence

**Decision**: Add Vitest for pure/session modules and Playwright for direct-path browser workflows, plus a curated authorized image benchmark and pixel-invariant comparison.

**Rationale**: The repository currently has lint/build only. Deterministic state and compositing logic can be automated, while AI visual quality needs a recorded evaluation rubric across representative images.

**Alternatives considered**:

- Manual-only testing: insufficient for stale-job, history, mask-boundary, and cleanup regressions.
- Snapshot-only UI testing: cannot prove output pixel invariants or accessibility interactions.
