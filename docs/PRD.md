# Requirements

## Product and audience

Adaptive Web Crawling and Extraction is an independent prototype for engineering
teams evaluating safe, cost-conscious website extraction. The eventual product
uses HTTP first, optional browser rendering, per-domain politeness, schema
validation, and extraction provenance. It must not bypass authentication,
paywalls, bot protection, robots rules, or site access conditions.

The current delivery ends at Phase 1. Later capabilities are requirements for
future work, not claims about the skeleton.

## Phase 0/1 user stories

1. A developer can start the application using Docker without replacing host
   runtimes, initializing Git, or accessing cloud infrastructure.
2. An evaluator can open a dashboard and see actual backend/database readiness,
   including an explicit failure state when the API cannot be reached.
3. An evaluator can validate a synthetic candidate crawl request and receive
   actionable field errors. Validation neither persists a job nor accesses the
   submitted URL.
4. A maintainer can reproduce formatting, compilation, unit tests, migration
   verification, and an end-to-end HTTP smoke test using documented commands.

## Phase 1 request contract

`POST /crawl-jobs/validate` accepts JSON with exactly these fields:

- `url`: required, at most 2,048 characters, an absolute HTTP(S) URL with an ASCII
  hostname, no embedded credentials, and no fragment. This is syntax validation,
  not a DNS/SSRF safety decision or permission to crawl.
- `maxPages`: required integer, 1 through 100. This is a conservative future
  request budget, not an implemented execution limit.
- `termsAccepted`: required and `true`; the caller acknowledges that target-site
  permission and rules must be checked before future crawling. This is not
  evidence that robots.txt or terms have actually been evaluated.

A valid request receives HTTP 200 with `valid: true` and
`executionEnabled: false`. Invalid input receives HTTP 400, a
`application/problem+json` body, and field-level messages where available.
Unknown fields, malformed JSON, and fractional/string values for integer/boolean
fields are rejected. Unsupported media types receive HTTP 415.

## Measurable acceptance criteria

| ID   | Acceptance criterion                                                               | Evidence method                      |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| P0-1 | Requirements, architecture, threats, decisions, non-goals, plan, and CI are present. | Document/configuration inspection    |
| P1-1 | Java 21/Spring Boot 3 API and React/TypeScript production builds succeed.             | Maven verify and frontend build      |
| P1-2 | The dashboard is served only on loopback port 18101.                                 | Compose config and real host request |
| P1-3 | A fresh PostgreSQL database applies migration V1 once and remains ready on restart. | Schema-aware readiness and SQL check |
| P1-4 | Liveness is HTTP 200 for a running API; readiness requires the database and schema.  | Health tests and runtime smoke       |
| P1-5 | Valid synthetic input succeeds without fetching a target or creating a job.         | Controller tests and HTTP smoke      |
| P1-6 | Invalid, missing, malformed, and unknown input is rejected with explicit errors.     | Parameterized/controller/HTTP tests  |
| P1-7 | The UI shows readiness, validation success, field errors, and network failure.       | Component tests and browser check    |
| P1-8 | No database/API host ports, real data, cloud actions, or crawl execution are enabled. | Compose contract and smoke assertions |
| P1-9 | All active services and compilation/test containers have CPU/memory/PID limits.      | Compose config and container inspect |

## Non-goals and later acceptance targets

Phase 2 owns crawl-job entities and CRUD, permissions, idempotency, durable state
transitions, and integration coverage for those features. Phase 3 owns robots and
terms enforcement, the URL frontier, deduplication, retries, HTTP/browser workers,
content extraction, schema validation, and provenance. Phases 4-6 own optional
agents, production reliability/telemetry, benchmarks, and packaging.

The playbook's eventual benchmark is 1,000 permitted synthetic static/JS pages,
at least 95% valid extraction, and measured p50/p95 latency and cost per 1,000
successful pages. **None of those benchmark targets are evaluated in Phase 1.**

## Approval boundaries

No real user data or external website access is needed for this delivery. Cloud
resources, destructive operations, Git initialization, commits/remotes/pushes,
and modifications outside this project require separate explicit approval.
