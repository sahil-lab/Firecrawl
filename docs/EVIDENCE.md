# Execution evidence

## Source and initial state

- Date: 2026-11-11.
- Read the complete 3-page engineering playbook before implementation.
- SHA-256: `09058572496e5cf441cdeb69076b750cf94b2c9bcba5086b7e40d22b01fe6758`.
- Initial project contained only the PDF; no Git repository or application files.
- Docker client/server: **29.4.1 / 29.4.1**.
- Docker Compose: **v5.1.3**.
- Docker engine: Linux, 22 logical CPUs, 16,467,517,440 bytes memory.
- Reserved ports 18101/18201 were free; no `firecrawl` containers existed.
- Maven Central metadata resolved Spring Boot **3.5.16**.

## Verified outcome - 2026-11-12

The complete documented `scripts/verify.ps1` command exited **0** and printed:

```text
Firecrawl verification passed. Local dashboard: http://localhost:18101
```

Only Phase 0 and Phase 1 were implemented. This is a working infrastructure and
validation skeleton, not a crawler or a production-ready/full-MVP delivery.

| Gate                             | Observed result                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Prettier                         | All matched files passed formatting checks.                                                                             |
| Spotless / Java 21 / Spring Boot | Formatting, compilation, tests, and executable JAR packaging passed.                                                    |
| Backend tests                    | 43 passed; 0 failures, errors, or skipped tests.                                                                        |
| ESLint / TypeScript / Vite       | Lint, strict type checking, and production build passed.                                                                |
| React component tests            | 6 passed; success, field errors, readiness retry, network failure, malformed response, and unexpected response covered. |
| Real-stack HTTP smoke            | 7 passed through nginx -> API -> PostgreSQL, including valid budgets 1/100 and invalid/unknown/malformed input.         |
| Database-unavailable smoke       | 1 passed: readiness HTTP 503/DOWN while liveness remained HTTP 200/UP.                                                  |
| Database recovery                | Database restarted in the verification script's `finally` block; all runtime services returned healthy.                 |
| Migration/restart                | Exactly one successful Flyway V1 entry before and after API restart; `platform_metadata.schema_version = 1`.            |
| Published host check             | HTTP 200 with `{"status":"UP"}` at the loopback readiness URL.                                                          |
| Browser rendering                | Real dashboard loaded with title "Adaptive Crawl Lab" and "API + database ready".                                       |
| Interactive browser automation   | Not verified: click timeouts and lost page handles prevented completion. No responsive visual-test result is claimed.   |
| Hosted CI                        | Workflow authored, but not run remotely; no Git repository initialization or publication was authorized.                |

The automated checks comprise **43 backend + 6 UI + 8 real HTTP tests**. The HTTP
tests are genuine local network/database checks, not mocked controller tests.
The first database startup used a newly created Firecrawl volume. Later runs
preserved that volume and checked migration idempotency rather than resetting it.

## Exact reproducible commands

From Windows PowerShell:

```powershell
Set-Location 'C:\Users\upadhsah\Desktop\project\Firecrawl'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

This is the exact full command that passed. It runs the following gates
sequentially, with errors propagated:

1. Verify Docker and preserve/generate the untracked local database credential.
2. `npm ci --no-audit --no-fund` in the bounded Node container.
3. `npm run format:check`.
4. `mvn --batch-mode --no-transfer-progress -Dmaven.repo.local=/workspace/.cache/maven verify`.
5. `npm run lint`, `npm test`, and `npm run build`.
6. Build both artifact-only runtime images and start `db api web` with `--wait`.
7. `npm run smoke` against `http://web:8080` inside the project network.
8. Stop only Firecrawl's database, run `npm run smoke:db-down`, and restore the
   database in `finally`. Do not run that negative test against a healthy database.
9. Query Flyway history, restart the API, verify readiness and unchanged migration
   count, and check the published loopback endpoint.

Standalone formatting/build/test commands used during implementation:

```powershell
docker compose -p firecrawl -f .\infra\docker\compose.yaml --profile tools run --rm --no-deps maven mvn --batch-mode --no-transfer-progress '-Dmaven.repo.local=/workspace/.cache/maven' spotless:apply verify
docker compose -p firecrawl -f .\infra\docker\compose.yaml --profile tools run --rm --no-deps node sh -c 'npm run format && npm run format:check && npm run lint && npm test && npm run build'
```

Runtime/status and migration inspection:

```powershell
docker compose -p firecrawl -f .\infra\docker\compose.yaml ps
docker compose -p firecrawl -f .\infra\docker\compose.yaml --profile tools run --rm --no-deps --env BASE_URL=http://web:8080 node npm run smoke
docker compose -p firecrawl -f .\infra\docker\compose.yaml exec -T db psql -U firecrawl -d firecrawl -v ON_ERROR_STOP=1 -c "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank; SELECT name, value FROM platform_metadata;"
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:18101/api/actuator/health/readiness' -Headers @{ Accept = 'application/json' } -TimeoutSec 15
```

The last SQL inspection returned version `1`, description `platform metadata`,
success `t`, and marker `schema_version | 1`.

## Actual isolation and resource checks

Docker inspection confirmed these limits and port bindings, not just YAML intent:

| Service       | Memory limit | CPU limit | PID limit | Published port         |
| ------------- | ------------ | --------- | --------- | ---------------------- |
| API           | 512 MiB      | 0.5       | 150       | None                   |
| PostgreSQL    | 256 MiB      | 0.25      | 100       | None                   |
| nginx/web     | 64 MiB       | 0.25      | 30        | `127.0.0.1:18101` only |
| Node tooling  | 1 GiB        | 1.0       | 150       | None                   |
| Maven tooling | 1 GiB        | 1.0       | 150       | None                   |

Runtime allocation totals **832 MiB / 1 CPU**. Tooling is sequential.
Port 18201 is unused. API and PostgreSQL use the internal backend network.
Both tools share the frontend network; there are exactly two Firecrawl networks.
The API runs as UID 10001, nginx as UID 101; both have read-only root filesystems
and bounded `/tmp` tmpfs mounts. Database, Node dependencies, and Maven artifacts
use separate project-scoped volumes. No Docker global settings were modified.

## Toolchain actually used

- Node 24.22.2 and npm 11.19.1 in the Node container.
- Maven 3.9.11 with JDK 21.0.9 for compilation/tests; runtime JRE 21.0.13.
- Spring Boot 3.5.16; PostgreSQL 17.11; nginx 1.30.6.
- Lockfile: React/React DOM 19.3.1, TypeScript 6.0.3, Vite 8.3.8,
  Vitest 4.1.12, ESLint 10.14.0, Prettier 3.6.2.
- Host Node/Java were not replaced or used to build the application.

Resolved image digests (image inspection, or the successful build's `FROM` line
for nginx whose base remained in BuildKit's cache):

```text
node:24-alpine
  sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8
maven:3.9.11-eclipse-temurin-21
  sha256:6fdc855a6ed81d288ca7ca37ac6ff5e9308b612485c0801d70b25a858c83d237
eclipse-temurin:21-jre-alpine
  sha256:ac05c3c42b7c2f1a52c9bd52f01041fa1958231b15ebeae7420429cbc5baf474
postgres:17-alpine
  sha256:3540c0362c809df084ffac0ae69fe794515f9de92692f02178bcdce0ef0302ac
nginxinc/nginx-unprivileged:stable-alpine
  sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
```

## Changed-file inventory

Paths are relative to the Firecrawl project. The source PDF was not changed.
Generated caches, credentials, `target`, `dist`, and `node_modules` are excluded
from the source inventory and ignored. The PDF binary `.gitattributes` entry
observed during inventory was left untouched.

```text
.dockerignore
.gitignore
.prettierignore
.prettierrc.json
.github/workflows/ci.yml
README.md
package.json
package-lock.json
apps/web/.gitignore
apps/web/Dockerfile
apps/web/eslint.config.js
apps/web/index.html
apps/web/package.json
apps/web/tsconfig.app.json
apps/web/tsconfig.json
apps/web/tsconfig.node.json
apps/web/vite.config.ts
apps/web/src/api.ts
apps/web/src/App.tsx
apps/web/src/App.test.tsx
apps/web/src/index.css
apps/web/src/main.tsx
apps/web/src/test/setup.ts
benchmarks/README.md
docs/ARCHITECTURE.md
docs/CODING_CONVENTIONS.md
docs/DECISIONS.md
docs/EVIDENCE.md
docs/PLAN.md
docs/PRD.md
docs/THREAT_MODEL.md
infra/docker/compose.yaml
infra/docker/nginx.conf
infra/docker/nginx-main.conf
packages/contracts/openapi.yaml
scripts/init.ps1
scripts/verify.ps1
services/api/Dockerfile
services/api/pom.xml
services/api/src/main/java/dev/prototype/firecrawl/FirecrawlApplication.java
services/api/src/main/java/dev/prototype/firecrawl/crawl/CrawlValidationController.java
services/api/src/main/java/dev/prototype/firecrawl/crawl/CrawlValidationRequest.java
services/api/src/main/java/dev/prototype/firecrawl/crawl/CrawlValidationResponse.java
services/api/src/main/java/dev/prototype/firecrawl/crawl/HttpUrlValidator.java
services/api/src/main/java/dev/prototype/firecrawl/crawl/ValidHttpUrl.java
services/api/src/main/java/dev/prototype/firecrawl/errors/ApiExceptionHandler.java
services/api/src/main/java/dev/prototype/firecrawl/health/SchemaHealthIndicator.java
services/api/src/main/resources/application.yaml
services/api/src/main/resources/db/migration/V1__platform_metadata.sql
services/api/src/test/java/dev/prototype/firecrawl/crawl/CrawlValidationControllerTest.java
services/api/src/test/java/dev/prototype/firecrawl/crawl/HttpUrlValidatorTest.java
services/api/src/test/java/dev/prototype/firecrawl/health/SchemaHealthIndicatorTest.java
services/worker/README.md
tests/e2e/database-unavailable.test.mjs
tests/e2e/smoke.test.mjs
```

Unused Vite template UI/assets and its template README were removed. The worker
and benchmark directories contain boundary documentation only, not later-phase
implementations.

## Remaining limitations, approvals, and next phase

- No application/runtime blocker remains in the verified Phase 1 CLI workflow.
- Interactive browser automation remains unverified because integrated browser
  tools timed out or lost page handles. The actual page/readiness rendered
  successfully, and all six component tests passed. Follow the README's manual
  walkthrough before claiming a complete interactive browser check.
- This session ran no `git init`, commit, remote, or push commands, and no remote
  CI execution was performed. A final read-only check discovered a hidden `.git`
  directory absent from the initial inventory. `git rev-parse` confirmed this
  project is now a worktree; the metadata's origin/approval is unverified.
  It was left untouched. Further Git actions still require approval.
- Mockito emitted a dynamic-agent warning under Java 21 during tests. Tests pass;
  no compatibility with a later JDK is claimed.
- Cold dependency downloads, shared disk capacity, and Docker subnet availability
  remain host prerequisites. No global pruning, host runtime replacement, or
  other-project shutdown was used.
- No crawler, browser worker, jobs CRUD/persistence, permissions, idempotency,
  Redis/Kafka, AI, benchmark, cloud deployment, or production readiness is claimed.
- Next implementation phase is **Phase 2**: ownership/permission model,
  crawl-job entities/contracts, idempotency, state transitions, and integration
  tests. It has not been started.

## Execution history

The entries below record earlier failures and recovery, not the final result.

### First validation slice

- Vite `create-vite` **9.3.4** generated the React/TypeScript baseline without
  starting a server; placeholder UI/assets were removed.
- Local credential generation and `docker compose ... config --quiet` passed.
- Both PowerShell scripts passed the installed PowerShell parser.
- The first direct Maven command failed before compilation because Windows
  PowerShell split an unquoted dotted `-D` property. Retried with the entire
  `'-Dmaven.repo.local=/workspace/.cache/maven'` argument quoted. The default
  Compose Maven command already uses a correctly separated argument list.
- Cold Maven dependency restoration is slow on this shared host. Registry
  connectivity was verified from the bounded build container, and cache progress
  was observed. No host runtime was replaced and no other project was stopped.
- Spotless formatted and checked all 11 initial Java files; Java 21 compilation
  passed. The first test run reported **41 tests, 1 failure**: Jackson still
  coerced numeric URL input to a string despite scalar coercion being disabled.
  Added explicit textual coercion rules and regression cases for numeric and
  boolean URL values. The rerun passed **43 tests, 0 failures/errors/skips**;
  Spotless, Java 21 compilation, and Spring Boot JAR packaging passed.
- Shared C: disk exhaustion interrupted that fix and left the API entrypoint
  empty. Builds were paused; only this project's disposable npm cache was
  removed. No shared Docker cleanup or other-project shutdown was performed.
  A subsequent check showed 27,282,530,304 free bytes and no running Firecrawl
  tooling containers. The entrypoint was restored before resuming validation.

### Additional failures fixed before the successful final run

- TypeScript rejected a constructor parameter property under `erasableSyntaxOnly`.
  Replaced it with an explicitly declared/assigned readonly field; strict
  settings were not disabled.
- Clean npm restore and Maven metadata reads were slow on Windows bind mounts.
  Node dependencies and the Maven repository moved to Firecrawl-only volumes.
  A Java thread dump identified `FileDescriptor.close0` while reading dependency
  POMs. Existing Maven artifacts were seeded through a local temporary tar
  archive, which was removed after extraction. No global cache was altered.
- Docker's shared default address pool was exhausted. Both tools now reuse the
  frontend network. Removed only `firecrawl_default` after verifying its
  Firecrawl ownership and zero attached containers; backend creation succeeded.
- nginx initially tried to create FastCGI temporary files on a read-only path.
  All temporary paths now use bounded `/tmp`; non-root/read-only execution was
  preserved and runtime inspection confirmed it.
- Windows PowerShell treated Actuator's vendor JSON response as bytes. The host
  health probe now explicitly requests `application/json`.
- The PowerShell wrapper originally bound `psql -A` as its own `Arguments`
  parameter. Native forwarding now uses automatic `$args`, preserving CLI flags.
- Under shared-host contention a UI test exceeded Vitest's default five-second
  test deadline. The bounded single-worker harness now allows 15 seconds per
  test. Assertions, production timeouts, and container resource limits were not
  weakened; the final six-test run passed.
