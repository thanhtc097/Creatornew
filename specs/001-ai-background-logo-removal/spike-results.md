# Inpainting Compatibility Spike Results

**Date**: 2026-08-04  
**Model**: `opencv-lama-2025jan`  
**SHA-256**: `7df918ac3921d3daf0aae1d219776cf0dc4e4935f035af81841b40adcf74fdf2`

## Result

- Model download completed and checksum verification passed.
- Production Vite build packaged the worker, ONNX Runtime WebAssembly runtime, and verified model asset.
- Chrome desktop WebGPU initialized the model but failed a real masked inference at `/generator/model/model.5/conv1/ffc/convg2g/Add` with a JSEP binary-operation incompatibility.
- Automatic retry through WebAssembly completed the same authorized-image inference and produced a downloadable result.
- Cold local production-path test completed in approximately 58 seconds including initialization; this exceeds the post-readiness performance target and requires optimization/representative-device measurement before release.

## Decision

Use WebAssembly in a dedicated worker for this pinned artifact. Do not attempt WebGPU for this model version. A future model may enable WebGPU only after the same end-to-end inference gate passes. The feature remains browser-local and transfers no image pixels to a server.

## Remaining matrix work

Firefox, Safari, Android, low-memory mobile, cancellation timing, warm inference, peak memory, and the full 20-image quality benchmark remain required before production release.
