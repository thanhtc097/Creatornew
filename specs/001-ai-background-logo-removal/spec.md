# Feature Specification: AI Background and Logo Removal

**Feature Branch**: `001-ai-background-logo-removal`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Nâng cấp Background Remover bằng AI và thêm chức năng xóa logo bằng AI."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove an Image Background Automatically (Priority: P1)

As a creator, I want to upload an image and have its background removed automatically so I can download a clean transparent image without manual editing.

**Why this priority**: Background removal is the existing tool's primary purpose and must remain the simplest, most reliable workflow.

**Independent Test**: Upload a supported image containing a clear foreground subject, run background removal, inspect the transparent result, and download it.

**Acceptance Scenarios**:

1. **Given** a supported image with a recognizable foreground subject, **When** the user selects automatic background removal, **Then** the tool produces a preview with the main subject retained and the background transparent.
2. **Given** a completed result, **When** the user selects download, **Then** the tool downloads an image that preserves transparency and matches the preview.
3. **Given** processing cannot produce a usable subject mask, **When** processing ends, **Then** the tool keeps the original image available and displays a clear recovery message.

---

### User Story 2 - Remove an Owned Logo or Unwanted Object (Priority: P2)

As a user who owns or is authorized to edit an image, I want to mark an unwanted logo or object and have the selected area reconstructed so I can reuse the image without visible gaps.

**Why this priority**: Object-aware removal adds the requested AI logo-removal value while keeping user control over the exact region being changed.

**Independent Test**: Load an authorized test image containing a small logo, mark only the logo, run removal, and verify that the selected area is reconstructed while surrounding content remains substantially unchanged.

**Acceptance Scenarios**:

1. **Given** an image the user owns or is authorized to modify, **When** the user marks a logo or unwanted object and confirms removal, **Then** only the selected region and a minimal blending boundary are reconstructed.
2. **Given** an inaccurate selection, **When** the user erases part of the mask, changes brush size, or resets the selection, **Then** the preview reflects the revised selection before processing.
3. **Given** the selected area is too large or unsuitable for a credible result, **When** the user requests removal, **Then** the tool warns the user and recommends a smaller selection instead of silently producing a misleading result.
4. **Given** the user attempts to remove a copyright watermark, ownership mark, authenticity mark, signature, or similar third-party rights indicator, **When** the tool detects or the user identifies that purpose, **Then** the workflow refuses that removal and explains the permitted-use boundary.

---

### User Story 3 - Review, Compare, and Correct the Result (Priority: P3)

As a user, I want to compare the original and edited images and make limited corrections so I can judge quality before downloading.

**Why this priority**: AI results are imperfect; review and correction prevent users from downloading damaged outputs and improve trust.

**Independent Test**: Produce an edited image, compare it with the original, undo and redo at least one change, refine an edge or mask, and download the chosen result.

**Acceptance Scenarios**:

1. **Given** a completed edit, **When** the user activates comparison, **Then** the original and edited versions can be inspected without losing work.
2. **Given** the result contains a missed or over-removed area, **When** the user adjusts the mask or edge correction and reprocesses, **Then** the updated preview replaces the prior preview while undo remains available.
3. **Given** the user starts over, **When** reset is confirmed, **Then** all edits are cleared and the original image remains available in the current session.

### Edge Cases

- Unsupported, corrupted, animated, or password-protected input is rejected without altering the original file.
- Images above the supported processing resolution trigger a clear size-resolution notice and an explicit choice to continue with a reduced working copy or cancel while preserving the original.
- Images with hair, fur, transparency, shadows, reflective objects, or multiple overlapping subjects may produce uncertain edges; the result remains editable and is not presented as guaranteed perfect.
- A selection touching the image boundary, covering most of the image, or containing complex repeated patterns receives a quality warning.
- Processing cancellation, insufficient device resources, loss of connectivity while downloading runtime/model assets, or loss of a required local processing capability preserves the original and any saved mask.
- Repeated processing cannot create overlapping jobs or cause an earlier result to overwrite a newer result.
- Keyboard-only and touch users can upload, select a mode, adjust controls, compare, reset, and download.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST provide distinct modes for automatic background removal and user-selected logo/object removal.
- **FR-002**: The tool MUST accept the image formats already supported by CreatorNew and validate type, integrity, file size, and image dimensions before processing. When an image exceeds the supported processing resolution, the tool MUST preserve the original and require an explicit choice to continue with a clearly disclosed reduced working copy or cancel.
- **FR-003**: Automatic background removal MUST preserve the primary foreground subject and create a transparent background preview.
- **FR-004**: Users MUST be able to define an object-removal mask using add, erase, brush-size, clear, and reset controls before processing.
- **FR-005**: Object removal MUST modify only the selected region plus a feathered blending boundary no wider than the greater of 8 source pixels or 0.5% of the image's shorter side, capped at 24 source pixels. Pixels outside that allowed boundary MUST remain unchanged.
- **FR-006**: The tool MUST require users to confirm that they own the image or have permission to remove the selected logo or object.
- **FR-007**: The tool MUST refuse processing when the user identifies the purpose, or a separately validated system capability reliably identifies the purpose, as removing copyright watermarks, third-party ownership marks, authenticity indicators, signatures, security marks, or comparable rights-management information. This release does not claim automatic detection.
- **FR-008**: The interface MUST explain permitted use near the object-removal action and MUST provide a refusal message when a request falls outside that scope.
- **FR-009**: Users MUST be able to compare original and edited versions, undo and redo applicable actions, revise the mask, and reset the session.
- **FR-010**: The tool MUST show meaningful processing, success, warning, cancellation, and failure states without discarding the original input.
- **FR-011**: Users MUST be able to download the accepted result in a format that preserves transparency when background removal is used.
- **FR-012**: Processing MUST occur on the user's device whenever the required capability is available. Any transfer to a remote processor MUST be disclosed before transfer, require explicit consent, minimize transmitted data, and disclose retention and deletion behavior.
- **FR-013**: The tool MUST work when loaded directly from its published Background Remover path and MUST preserve that existing path.
- **FR-014**: The complete workflow MUST support keyboard operation, visible focus, semantic labels, touch interaction, and meaningful non-color-only status feedback.
- **FR-015**: User-facing text MUST follow CreatorNew's shared localization conventions where the surrounding page is localized.
- **FR-016**: The page MUST retain useful search metadata, canonical navigation, and sitemap eligibility.
- **FR-017**: The tool MUST prevent concurrent processing jobs from overwriting one another and MUST treat the most recent confirmed job as authoritative.
- **FR-018**: The tool MUST not retain uploaded images, masks, or generated results beyond the active session unless the user explicitly downloads or saves them.

### Key Entities

- **Source Image**: The original user-provided image, including format, dimensions, file size, and validation status.
- **Edit Mode**: The selected workflow: background removal or authorized logo/object removal.
- **Selection Mask**: The user-defined area to remove, including brush additions, erasures, and boundary information.
- **Processing Job**: One requested edit with its mode, current status, warnings, and relationship to the source image and mask.
- **Edit Result**: The generated preview and downloadable output, including transparency and comparison state.
- **Consent Record**: Session-only confirmation of image ownership or editing permission and, when applicable, consent to remote processing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a moderated or unmoderated usability test with at least 10 first-time users, at least 90% can complete background removal and download a result without assistance in under two minutes.
- **SC-002**: At least 85% of authorized logo/object-removal test cases with a selected area covering no more than 10% of the image meet the documented visual-quality rubric and contain no changed pixels outside the FR-005 blending boundary beyond the defined comparison tolerance.
- **SC-003**: After the required model is ready, for supported images up to 12 megapixels on the defined representative device matrix, 90% of processing attempts show a preview or actionable failure message within 15 seconds.
- **SC-004**: In validation tests, 100% of processing failures and cancellations preserve the original image and do not replace a newer successful result.
- **SC-005**: All primary actions can be completed using keyboard-only navigation and at both mobile and desktop viewport widths.
- **SC-006**: Every remote-processing path, if any, obtains explicit consent before image transfer and passes the documented privacy review.
- **SC-007**: All tested attempts explicitly identified as removing prohibited rights-management information are refused with a clear explanation.
- **SC-008**: The published Background Remover URL loads directly and exposes the complete primary workflow without requiring navigation from the home page.
- **SC-009**: On first use of object removal, the interface displays the exact model download size and visible progress or an actionable download failure within one second of the user's confirmed processing request.

## Assumptions

- “Logo removal” means removing a logo or unwanted object from an image the user owns or has explicit permission to edit; it does not include bypassing copyright, authenticity, ownership, or security markings.
- The current Background Remover URL remains the canonical public path, and the upgrade does not break existing links.
- The first release prioritizes still images; animated-image editing and video logo removal are outside scope.
- Users may refine a mask, but the feature is not intended to replace a full professional image editor.
- Browser-local processing is preferred. A plan proposing remote AI processing must include privacy, retention, cost, availability, and graceful-fallback analysis before implementation.
- No account is required for the primary workflow, consistent with the existing CreatorNew tool experience.
