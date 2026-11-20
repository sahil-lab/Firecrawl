# Ordered delivery plan

## Phase 0 - Contract and safety

- [x] Read all three pages of the engineering PDF and inventory the empty project.
- [x] Verify Docker Engine/Compose and check reserved ports.
- [x] Write requirements, architecture diagram, threat model, non-goals,
      acceptance criteria, decisions, and coding conventions.
- [x] Add ignore rules and local CI workflow.
- [x] Record final verification evidence and file inventory.
- [ ] Resolve Git provenance/approval: no `git init` was run by this session.
      Unexpected metadata appeared after the initial inventory and was preserved
      without changes; its origin/approval is unverified.

## Phase 1 - Working skeleton

- [x] Bootstrap Java 21 / Spring Boot 3 API and React / TypeScript dashboard.
- [x] Bootstrap PostgreSQL and bounded, project-isolated Docker Compose.
- [x] Add Flyway migration and liveness/schema-aware readiness endpoints.
- [x] Add strict, side-effect-free request validation and explicit UI errors.
- [x] Add backend/frontend tests and real-stack HTTP smoke coverage.
- [x] Run formatting, builds, tests, database outage/recovery, and migration/restart
      checks. The complete verification script exited successfully.
- [x] Verify the real dashboard renders and displays API/database readiness.
- [x] Persist exact commands, observed results, limitations, and next steps.
- [x] Redesign the dashboard and move frontend tooling to Node 22 LTS without
      changing the Phase 1 contract (2026-11-18; decisions D009 and D010).
- [x] Replace the hero's flat contour field with a landscape scene behind the
      whole page, again without changing the Phase 1 contract (2026-11-20;
      decision D010).
- [ ] Add a repeatable browser test to the project. The interface was exercised
      in headless Edge (pointer, keyboard, touch emulation, several window
      sizes, reduced motion, measured text contrast, and the scene's fallbacks)
      by scripts that are not part of this repository. The nine component tests
      and eight real HTTP tests pass; the README provides a manual walkthrough.

Implementation remains within Phase 0/1. Git actions remain approval-gated,
and the Git provenance and browser-test limitations remain explicit above.
See [execution evidence](EVIDENCE.md).

## Phase 2 - Next, not authorized in this delivery

Define and implement crawl-job entities/contracts, ownership/permissions,
idempotency, durable state transitions, and integration tests. Read this plan and
the existing tests before starting. Resolve the permission model before exposing
domain mutations. Do not convert the validation endpoint into an executing
endpoint implicitly.

## Phases 3-6 - Deferred

3. Robots/terms enforcement, frontier/canonicalization/deduplication/retries,
   HTTP/optional browser worker, extraction/schema/provenance.
4. Optional agents behind explicit interfaces, budgets, and deterministic behavior.
5. Reliability, retries/dead letters as justified, full telemetry and failure tests.
6. Reproducible permitted synthetic-site benchmarks, limitations, demo, packaging.

The playbook's full-MVP benchmarks and production-readiness checks are not Phase
1 completion criteria. No fabricated measurements or later-phase checkmarks.
