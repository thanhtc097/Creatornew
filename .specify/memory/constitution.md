# CreatorNew Constitution

## Core Principles

### I. Browser-First Privacy
User files and generated content MUST be processed in the browser whenever the
required capability is available client-side. A feature that uploads user data
to a server MUST state that behavior before the transfer, use the minimum data
needed, define retention and deletion behavior, and include a privacy review in
its specification. Tools MUST fail safely without silently losing, replacing,
or exposing user input.

Rationale: CreatorNew's tools handle images, PDFs, audio, video, and prompts;
local processing is a product promise as well as a security boundary.

### II. Independent Multi-Page Tools
Every tool MUST remain directly addressable through its own stable path and MUST
work when loaded directly, not only after navigation from the home page. Shared
behavior belongs in reusable files under `js/` and `css/`; tool-specific behavior
belongs with that tool. Changes MUST preserve Vite's explicit multi-page inputs
and relative `base` deployment unless an approved specification deliberately
changes the hosting model.

Rationale: CreatorNew is a static multi-page application whose individual tools
are independently discoverable, linkable, and deployable.

### III. Consistent, Accessible, Responsive Experience
New and changed interfaces MUST follow the existing visual language, remain
usable at mobile and desktop widths, and support keyboard navigation, visible
focus, semantic labels, and meaningful status/error feedback. User-facing text
MUST use the shared internationalization approach when the surrounding feature
is localized. A tool MUST not depend on hover, color, or pointer precision alone
to communicate or operate a critical action.

Rationale: Consistency and inclusive interaction are required across a growing
catalog of otherwise independent tools.

### IV. Verifiable Changes
Every implementation MUST define acceptance scenarios before coding. `npm run
lint` and `npm run build` MUST pass for changes that affect application code or
build inputs. Changes to file-processing behavior MUST include representative
success, invalid-input, boundary-size, and failure-path checks; automated tests
SHOULD be added when logic can be isolated, while documented manual checks are
required where browser APIs make automation disproportionate.

Rationale: The repository has many browser workflows and no broad test harness,
so explicit scenarios and repeatable quality gates prevent silent regressions.

### V. Static Delivery, Performance, and Discoverability
Features MUST remain compatible with static hosting. New heavy dependencies,
workers, remote services, or large assets require justification in the plan and
MUST be loaded only where needed. Tool pages MUST retain useful titles, metadata,
canonical navigation, and sitemap coverage where applicable. Build output MUST
not contain source-only, temporary, credential, or private user data.

Rationale: Fast loading and search discoverability are core to the site's reach,
and static delivery keeps operation simple and reliable.

## Technical and Product Constraints

- The supported baseline is JavaScript/JSX, React 19, Vite 8, HTML, and CSS.
- Prefer existing browser APIs and current project dependencies before adding a
  package. A new dependency requires a documented need, bundle impact, license,
  and maintenance assessment in the implementation plan.
- Shared site navigation, branding, localization, and cross-tool behavior MUST
  not be duplicated when an existing shared module can be extended safely.
- Generated artifacts (`dist/`, archives, temporary files) MUST NOT be treated
  as source of truth. Source files and generation scripts define releases.
- Secrets, API credentials, and environment-specific endpoints MUST NOT be
  committed. Client-visible credentials MUST be assumed public.
- Backward compatibility for published paths and existing tool inputs/outputs is
  the default; intentional breaking changes require migration and redirect plans.

## Specification and Delivery Workflow

1. Start each material feature with `$speckit-specify`; capture user stories,
   acceptance scenarios, edge cases, and measurable success criteria without
   prematurely choosing an implementation.
2. Use `$speckit-clarify` when product behavior, privacy boundaries, supported
   formats, limits, or hosting assumptions remain ambiguous.
3. Use `$speckit-plan` to document affected pages and shared modules, browser
   compatibility, privacy/data flow, performance impact, accessibility, SEO,
   and the verification strategy. The Constitution Check MUST pass before work
   proceeds.
4. Use `$speckit-tasks` to create independently verifiable work items. Include
   lint, production build, direct-path loading, responsive behavior, keyboard
   operation, error paths, and relevant processing fixtures.
5. Before completion, run `$speckit-analyze` for cross-artifact consistency and
   then `$speckit-implement`. Record any intentionally deferred work explicitly;
   do not silently reduce acceptance scope.

Reviews MUST reject changes that violate a MUST rule unless the constitution is
amended first. Complexity or exceptions MUST be justified in the feature plan.

## Governance

This constitution governs all Spec Kit artifacts and implementation decisions in
CreatorNew. When another document conflicts with it, this constitution wins.

Amendments MUST be proposed as an explicit change with rationale and impact on
existing specifications, templates, and shipped behavior. Versioning follows
semantic versioning: MAJOR for incompatible principle removals or redefinitions,
MINOR for new principles or materially expanded obligations, and PATCH for
clarifications that do not change obligations. The ratification date remains the
date of first adoption; the last-amended date changes with every amendment.

Every feature plan and review MUST check compliance. The maintainer approving a
change owns any documented exception and its follow-up. The constitution SHOULD
be reviewed when the stack, hosting model, privacy model, or release workflow
changes, and at least once per major product release.

**Version**: 1.0.0 | **Ratified**: 2026-08-03 | **Last Amended**: 2026-08-03
