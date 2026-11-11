# Ordered delivery plan

## Phase 0 - Contract and safety

- [x] Read all three pages of the engineering PDF and inventory the empty project.
- [x] Verify Docker Engine/Compose and check reserved ports.
- [x] Write requirements, architecture diagram, threat model, non-goals,
      acceptance criteria, decisions, and coding conventions.
- [x] Add ignore rules and local CI workflow.
- [ ] Record final verification evidence and file inventory.
- [ ] Git initialization: **not authorized**, deliberately not performed.

## Phase 1 - Working skeleton

- [ ] Bootstrap Java 21 / Spring Boot 3 API and React / TypeScript dashboard.
- [ ] Bootstrap PostgreSQL and bounded, project-isolated Docker Compose.
- [ ] Add Flyway migration and liveness/schema-aware readiness endpoints.
- [ ] Add strict, side-effect-free request validation and explicit UI errors.
- [ ] Add backend/frontend tests and real-stack HTTP smoke coverage.
- [ ] Run formatting checks, builds, tests, migration/restart checks, and browser
      validation; fix failures before marking complete.
- [ ] Persist exact commands, observed results, limitations, and next steps.

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
