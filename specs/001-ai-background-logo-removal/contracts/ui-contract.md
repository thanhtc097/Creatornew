# UI Contract: Background Remover Upgrade

## Stable entry point

- Canonical path remains `/background-remover/`.
- Default mode remains **Remove background** so existing users encounter the current primary workflow first.
- Page remains functional when opened directly, without home-page state.

## Mode selector

- Two labeled controls: **Remove background** and **Erase owned logo/object**.
- The selected mode is programmatically exposed and keyboard operable.
- Switching modes never destroys the source image; it cancels any in-flight job and changes only mode-specific controls/result state.

## Background mode

- Accepts a validated image, shows original/result previews, progress, clear, remove, and transparent-PNG download.
- Existing upload limit and supported formats remain visible.
- Failure preserves the original and exposes retry.

## Object mode

- Before processing, show permitted-use disclosure and require confirmation that the user owns the image or has editing permission.
- Present an explicit prohibited-purpose choice/message covering copyright watermarks, third-party ownership/authenticity indicators, signatures, and security marks. A prohibited purpose cannot start a job.
- Controls: add mask, erase mask, brush size, undo, redo, clear mask, reset, cancel, process, compare, and download.
- Processing is disabled for an empty mask. Excessive coverage and edge-touching/complex selections receive a warning without silently discarding the mask.
- First use reports the model download size and progress before inference.

## Mask editor accessibility

- Pointer and touch drawing use Pointer Events and do not depend on hover.
- Every control has a visible label, focus indicator, and minimum practical touch target.
- Keyboard users can select add/erase, adjust brush size, move the brush cursor in coarse/fine steps, apply at the cursor, undo/redo, clear, process, compare, and download.
- The canvas has a concise accessible description and live text reporting current tool, brush size, cursor position, mask coverage, and warnings.
- Color is never the sole signal distinguishing source, mask, processing, error, or completed state.

## Result and comparison

- Original is always recoverable during the session.
- Comparison works without mutating either source or result.
- Only the newest non-cancelled job may replace the visible result.
- Downloaded content and filename correspond to the visible committed result.

## Status/error vocabulary

Stable categories for localization and testing:

- `ready`
- `model-download`
- `model-initialize`
- `processing`
- `completed`
- `cancelled`
- `invalid-file`
- `unsupported-device`
- `insufficient-memory`
- `model-load-failed`
- `processing-failed`
- `selection-empty`
- `selection-large`
- `permission-required`
- `prohibited-purpose`

All status changes are announced through a polite live region; blocking/refusal errors receive immediate focus at the explanatory message.

## Privacy contract

- State clearly: image pixels, mask, and result remain on the user's device.
- Distinguish downloading model/runtime assets from uploading an image.
- No telemetry may include file names, image pixels, masks, or generated results.
- Reset/replacement/unload releases object URLs, model tensors, GPU buffers, and worker jobs where possible.
