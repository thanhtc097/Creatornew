# Worker Protocol: Local Inpainting

The page controller and inpainting worker communicate through structured messages. This is an internal browser interface; it never defines a network API.

## Controller to worker

### `initialize`

```text
type: initialize
model: { id, url, sha256, inputWidth, inputHeight }
preferredBackends: [webgpu, wasm]
```

Expected response: progressive `status` messages followed by `initialized` or `error`.

### `process`

```text
type: process
jobId: positive integer
image: transferable pixel buffer plus dimensions
mask: transferable single-channel buffer plus dimensions/version
region: source-space padded bounding rectangle
```

Rules:

- `jobId` is mandatory and monotonic.
- Image and mask buffers contain only the cropped working region needed for inference.
- The controller does not transfer ownership of the original file object.

### `cancel`

```text
type: cancel
jobId: positive integer
```

The worker stops at the next safe boundary, disposes temporary tensors/buffers, and never emits a committable result for the cancelled job.

### `dispose`

Releases sessions, tensors, GPU buffers, and pending work before worker termination.

## Worker to controller

### `status`

```text
type: status
jobId: integer or null during initialization
stage: model-download | model-initialize | processing
progress: 0..100 or null
messageKey: stable localization key
```

### `initialized`

```text
type: initialized
backend: webgpu | wasm
modelId: pinned model identifier
```

### `result`

```text
type: result
jobId: positive integer
maskVersion: integer
pixels: transferable output buffer
width: integer
height: integer
durationMs: non-negative number
```

The controller commits this result only when `jobId` and `maskVersion` still equal the current session values.

### `cancelled`

```text
type: cancelled
jobId: positive integer
```

### `error`

```text
type: error
jobId: integer or null
code: unsupported-device | insufficient-memory | model-load-failed | incompatible-model | processing-failed | cancelled
recoverable: boolean
messageKey: stable localization key
```

Raw exception messages, file names, pixels, masks, and stack traces are not placed in user-visible text or external telemetry.

## Lifecycle invariants

1. At most one job per worker is actively inferencing.
2. Cancelling or replacing a job makes any later message for that job stale.
3. Result buffers are committed once or disposed.
4. Initialization may be reused across jobs in one session.
5. WebGPU resource ownership is explicit; owned buffers/tensors are disposed after use or worker shutdown.
