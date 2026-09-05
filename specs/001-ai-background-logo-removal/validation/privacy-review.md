# Privacy Review

- Image decode, mask creation, segmentation, inpainting, compositing, and download occur in the browser.
- Object mode fetches only the static manifest, model, worker bundle, and ONNX WebAssembly runtime.
- No API key or remote image-processing endpoint exists in the implementation.
- Session replacement/reset revokes object URLs; worker disposal releases the session and terminates pending work.
- Ownership confirmation and prohibited-purpose refusal are session-only and are not persisted as legal evidence.

Production verification must still confirm that Cloudflare/server logs and optional analytics do not collect file names or user image data.
