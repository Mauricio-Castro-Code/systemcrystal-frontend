# Pending Note Printing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Require follow-through after note confirmation, allowing administrators to postpone with a reason.

**Architecture:** Persist a versioned print requirement on Order, defaulting to no requirement for legacy records. A shared office queue drives a mandatory Angular dialog and a persistent postponed-notes banner. Manual confirmation uses the version of the PDF to reject stale actions after edits.

**Tech Stack:** Django/DRF, Angular standalone components, Material Dialog, Vitest.

**Spec:** ../specs/2026-11-22-note-printing-design.md

## Global Constraints
- Preserve Crystal styling and existing printed indicator.
- Only administrators postpone; a trimmed reason is required.
- Browser print events do not establish physical printing.
- Do not impose requirements retroactively or change historical notes during migration.
- Follow the user's instruction to commit each feature and push; continue in existing repositories.

## Review Focus
- Concurrent editing must reject confirmation of an earlier PDF version.
- Session changes must discard private queue responses and close the dialog.
- Failed PDF/queue/save requests must remain recoverable without marking printed.
- Postponed records must survive reload without immediately forcing the dialog again.
- Cancellation, deletion, and completion by another operator must remove obsolete pending dialogs.

### Task 1: Persistent print workflow (backend feature commit)
**Files:** BackendCrystal/api/models.py, services.py, presenters.py, urls.py; new order_printing.py, test_order_printing.py and migration 0022.
**Interfaces:** GET /orders/print-queue/ returns [{orderId, clientName, printVersion, printRequiredAt, printPostponedAt, printPostponedReason, printPostponedBy}]. POST /orders/:id/print-postpone/ accepts {printVersion, reason}; POST print-status accepts {printVersion}; existing DTO includes these fields.
- [x] Write and run failing tests for creation/confirmation/edit requirements, legacy exclusion, admin reason validation, stale confirmation/postponement, persistent queue and driver denial.
- [x] Implement versioned requirements, queue and transactional actions; lock edits against print actions. Preserve postponement actor and timestamp.
- [x] Run Django API suite and migration consistency check; expect all passing and no missing migrations.
- [x] Commit backend feature independently.

### Task 2: Mandatory print dialog and postponed queue (frontend feature commit)
**Files:** new core/services/order-printing.service.ts and tests; new shared/components/pending-printing/*; main-layout.ts/html; order-records.service.ts and order-record.model.ts.
**Interfaces:** OrderPrintingService exposes queue, refresh(), pending action signals and versioned print/postpone methods. Office layout mounts queue controller; record mutations notify it without circular dependencies.
- [x] Write and run failing tests for queue/session races, versioned actions, PDF errors, dialog recovery and postponed behavior.
- [x] Implement shared persistent queue with route/mutation/focus refresh; mandatory dialog, PDF action, manual printed confirmation, admin postponement and resumable visible pending list.
- [x] Run full Vitest suite and production build; expect success.
- [x] Review both changes and fix material findings; commit frontend feature independently including this plan and approved spec.
- [ ] Push backend and frontend main using the user's explicit authorization; report any automatic approval rejection truthfully.

## Execution notes
- Ruling: share the office queue among administrators and sales staff so any operator can finish pending printing; drivers do not participate.
- Ruling: postponed items remain visible but only open a blocking dialog when explicitly resumed. New required items open automatically.

## Verification evidence
- Backend: 159 tests passed; migration drift check reports no changes.
- Frontend: 155 tests passed; production build succeeds. Existing SCSS budget warnings remain.
- Independent review: addressed stale-session responses, cache/queue version priority, folio changes requiring reprint, and reactive 403 request loops; regression tests passed.
- Backend feature commit: `6d433d3`.
- Ruling: preserve the current in-memory retained-deposit validation while rechecking the persisted value under the order lock.
- Publication is explicitly authorized by the user and will be verified against both remote main branches.
