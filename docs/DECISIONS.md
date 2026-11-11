# Engineering decisions

## D001 - Preserve the playbook stack and phase order

Use Java 21, Spring Boot 3.5, React/TypeScript, PostgreSQL 17, and Docker Compose.
The published Maven metadata resolved Spring Boot **3.5.16** at implementation
time. Node 24 container tooling avoids the host's Node 14 and missing Java.
The PDF has three pages; its full source SHA-256 is
`09058572496e5cf441cdeb69076b750cf94b2c9bcba5086b7e40d22b01fe6758`.

Only Phases 0 and 1 are authorized. Later copy/paste prompts are requirements for
future turns, not instructions to jump ahead now.

## D002 - Pure validation instead of a partial crawl-job API

A distinct `POST /crawl-jobs/validate` endpoint provides a useful vertical slice
without implying persistence, permission enforcement, or execution. The three
representative crawl-job CRUD routes remain unimplemented until Phase 2.
The request budget is conservatively capped at 100 pages. The returned
`executionEnabled: false` is an explicit phase boundary, not a fallback.

## D003 - Add infrastructure only when needed

PostgreSQL is required for migrations and real readiness. Redis, Kafka,
Playwright workers, and AI services are deferred because Phase 1 has no queue,
cache, or crawler. No cloud architecture is deployed.

## D004 - Isolate this concurrent local project

Use Compose project `firecrawl`, bind nginx to `127.0.0.1:18101`, and do not expose
API or database ports. The reserved API port 18201 remains free. Runtime services
are resource-limited; compilation/tests run in sequential bounded containers.
Runtime images copy compiled artifacts so Java/Node compilation is not hidden
inside unbounded Docker build steps.

## D005 - Explicit errors and conservative credential handling

Use standard problem responses for invalid requests and explicit failure states
in the UI. Do not return fake health/job data on failures. Generate a local
credential once, keep it untracked, and mount it as a Docker secret. Do not
overwrite an existing credential or automatically reset a persisted database.

## D006 - No Git initialization without separate approval

The filesystem monorepo and local CI configuration can be created without
`.git`. The approval given for Replicas does not apply here. No Git
initialization, commit, remote, push, or hosted CI execution is performed.

## D007 - Tooling and dependency reproducibility

Use npm's lockfile for the frontend/tooling and Maven's managed dependency graph
for the backend. Scaffold React/TypeScript with Vite rather than layering a
generic `tsc --init` configuration over its bundler-specific preset. Preserve
strict TypeScript settings and use a `tsc` production build gate.

Container image major/LTS tags receive upstream patch updates. Record the actual
versions/digests used in the evidence log; immutable production promotion is a
future deployment concern. Dependency downloads do not send project source to a
third-party service.
