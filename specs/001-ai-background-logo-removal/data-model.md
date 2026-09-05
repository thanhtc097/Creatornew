# Data Model: AI Background and Logo Removal

All entities are browser-session objects. Nothing in this model requires persistent user storage.

## SourceImage

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Unique within the page session |
| `file` | File | Original object retained unchanged |
| `name` | string | Display name only; sanitized for output filename |
| `mimeType` | enum | `image/jpeg`, `image/png`, or `image/webp` |
| `byteSize` | integer | Greater than zero and no more than 25 MB |
| `width`, `height` | integer | Positive decoded dimensions within the tested resource ceiling |
| `objectUrl` | string | Revoked on replacement, reset, or unload |
| `decodeStatus` | enum | `pending`, `valid`, `invalid` |

Relationships: owns one active `EditSession`; referenced by every `ProcessingJob` and `EditResult` in that session.

## EditSession

| Field | Type | Rules |
|-------|------|-------|
| `sourceImageId` | string | Required |
| `mode` | enum | `background` or `object` |
| `status` | enum | See transitions below |
| `activeMask` | SelectionMask/null | Required only for object mode |
| `activeResultId` | string/null | Only a committed current result |
| `history` | HistoryEntry[] | Bounded; oldest entries discarded at cap |
| `historyIndex` | integer | Points to current entry |
| `currentJobId` | integer/null | Monotonically increases per submitted job |
| `authorizationConfirmed` | boolean | Required before object removal |
| `prohibitedPurpose` | boolean | When true, object processing is refused |

State transitions:

```text
empty → ready → editing → queued → processing → completed
                    ↘ refused
queued/processing → cancelled → editing
queued/processing → failed → editing
completed → editing (mask change/undo) → queued
any loaded state → empty (reset/replace)
```

Only the active `currentJobId` may commit a result.

## SelectionMask

| Field | Type | Rules |
|-------|------|-------|
| `width`, `height` | integer | Matches normalized editor coordinate space |
| `strokes` | MaskStroke[] | Ordered, bounded history representation |
| `coverageRatio` | number | 0–1; empty masks cannot process; high coverage triggers warning |
| `bounds` | rectangle/null | Minimal non-empty mask rectangle |
| `version` | integer | Increments after every committed edit |

## MaskStroke

| Field | Type | Rules |
|-------|------|-------|
| `operation` | enum | `add` or `erase` |
| `points` | normalized point[] | Each x/y is within 0–1 |
| `radius` | normalized number | Bounded by accessible brush controls |

Normalized strokes allow canvas resize without changing the selected source region.

## ProcessingJob

| Field | Type | Rules |
|-------|------|-------|
| `jobId` | integer | Monotonic within session |
| `sourceImageId` | string | Must match current source |
| `mode` | enum | `background` or `object` |
| `maskVersion` | integer/null | Required for object mode |
| `provider` | enum | `imgly-background` or `local-lama` |
| `backend` | enum/null | `webgpu`, `wasm`, or null before initialization |
| `status` | enum | `queued`, `loading`, `processing`, `completed`, `failed`, `cancelled`, `stale` |
| `progress` | number | 0–100 where measurable |
| `messageKey` | string | Localizable status identifier |
| `startedAt`, `finishedAt` | timestamp/null | Used for measured performance only |
| `errorCode` | string/null | Stable, user-safe error classification |

## EditResult

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Session unique |
| `jobId` | integer | Must equal current job at commit time |
| `mode` | enum | Determines export and preview behavior |
| `blob` | Blob | PNG for background transparency; PNG by default for object result |
| `objectUrl` | string | Revoked when discarded/reset/unloaded |
| `width`, `height` | integer | Matches source dimensions unless explicit safe downscale was accepted |
| `maskVersion` | integer/null | Audit link to object edit |
| `createdAt` | timestamp | Session-only ordering |

## ConsentRecord

| Field | Type | Rules |
|-------|------|-------|
| `authorizationConfirmed` | boolean | User confirms ownership or editing permission |
| `permittedUseAcknowledged` | boolean | User sees permitted-use boundary |
| `prohibitedPurpose` | boolean | True refuses job creation |
| `remoteTransferConsent` | boolean/null | Always null in this local-only plan |

The record is session-only and is not presented as legal proof or persisted analytics.

## HistoryEntry

| Field | Type | Rules |
|-------|------|-------|
| `maskSnapshot` | compact mask state | Required for object editing entries |
| `resultId` | string/null | Optional committed result reference |
| `action` | enum | `stroke`, `erase`, `clear`, `process`, `reset` |

Blob/object URL retention is bounded independently from mask history so undo cannot leak unbounded memory.
