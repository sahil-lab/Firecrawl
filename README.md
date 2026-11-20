# Adaptive Web Crawling and Extraction

An original, local engineering prototype inspired by the public product area of
Firecrawl. This project is not affiliated with Firecrawl and does not describe its
private architecture.

## Current scope

**Phase 0 and Phase 1 only.** The implemented skeleton includes a React/TypeScript
dashboard, Java 21/Spring Boot 3 API, PostgreSQL migration, health checks,
side-effect-free crawl-request validation, and reproducible local tests.

No crawler, browser worker, extraction engine, persistent crawl jobs, authentication,
benchmark results, AI agents, or cloud resources are implemented in this phase.
Validating a request never fetches its URL or creates a job.

## Local development

Prerequisite: Docker Desktop running Linux containers with Docker Compose v2 or
newer. Host Java, Node, Maven, and npm are not used; frontend tooling runs on
Node 22 LTS inside the `node:22-alpine` tooling container. Run from this project
folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

The verification script initializes an untracked local database credential, runs
formatting checks, Java and frontend tests/builds, builds the runtime images,
starts the stack, and runs a real HTTP smoke test. It leaves the local stack up.
Verification briefly stops only Firecrawl's database to check readiness failure
and restores it in a `finally` block; the persisted volume is never deleted.
The documented verification command passed locally: 43 backend tests, 9 UI tests,
8 real HTTP checks, production builds, and database migration/restart checks.
See [the evidence log](docs/EVIDENCE.md) for exact commands, resolved failures,
changed files, and what the browser checks did and did not cover.

Open <http://localhost:18101>. The API is available through the same origin under
`/api`. Port 18201 is reserved but **not published**. PostgreSQL has no host port.

```powershell
docker compose -p firecrawl -f .\infra\docker\compose.yaml ps
docker compose -p firecrawl -f .\infra\docker\compose.yaml logs --tail 100 api
docker compose -p firecrawl -f .\infra\docker\compose.yaml down
```

`down` stops only this project and preserves its database volume. Do not add
`--volumes`, prune Docker state, or stop another project's containers.

## Short local walkthrough

1. Open <http://localhost:18101>. The status pill in the header and the "Stack
   readiness" section both show the real API/database readiness.
2. Under "Validate a request", submit the prefilled synthetic URL with the
   acknowledgment unchecked. Expect a field error, not a crawl.
3. Check the acknowledgment and submit again. Expect "Request is valid" and an
   explicit statement that execution is disabled.
4. Type 101 as the page budget (the step buttons stop at 100). Expect a budget
   error; the supported validation range is 1-100.

The request preview beside the form shows the body that is sent. The landscape
behind the page is decorative and generated in the browser; it is not data. It
needs hardware WebGL, and without it the page shows a plain background instead.
With "reduce motion" enabled in the operating system the page renders without
animation and the landscape is a single still picture behind the headline.

This demonstrates the Phase 1 contract only, not the full product or benchmarks.

## Troubleshooting

- Docker must report `OSType=linux`. Keep host Node/Java unchanged.
- If `docker` cannot connect to `dockerDesktopLinuxEngine`, Docker Desktop is not
  running. Start it (`docker desktop start`), then bring this project back with
  `docker compose -p firecrawl -f .\infra\docker\compose.yaml up --detach --wait db api web`.
  The services have no restart policy, so they stay stopped after a reboot.
- The first run downloads public container images and Maven/npm dependencies.
  Tooling is capped at 1 CPU/1 GiB and runs sequentially; allow extra time on a
  busy shared Docker host.
- Node dependencies live in the project-scoped `firecrawl_node_modules` Docker
  volume, not on the slow Windows source bind mount. Keep using container tooling;
  do not run host npm against this workspace.
- Maven's local repository uses the project-scoped `firecrawl_maven_cache` volume
  for the same reason. Authored source and build outputs remain in this folder.
- If port 18101 is occupied, identify its owner. Do not stop other projects or
  silently use a different port.
- Inspect only this project's API/database logs with the Compose commands above.
  Readiness will fail if PostgreSQL or the migration marker is unavailable.
- An existing generated credential is preserved. If it is lost while the
  database volume remains, do not delete the volume or silently reset credentials;
  obtain approval for a recovery plan.
- To reformat after source changes, use
  `docker compose -p firecrawl -f .\infra\docker\compose.yaml --profile tools run --rm --no-deps node npm run format`
  and
  `docker compose -p firecrawl -f .\infra\docker\compose.yaml --profile tools run --rm --no-deps maven mvn --batch-mode --no-transfer-progress '-Dmaven.repo.local=/workspace/.cache/maven' spotless:apply`.
  Quote the dotted Maven property when invoking it from Windows PowerShell.

## Documentation

- [Requirements and acceptance criteria](docs/PRD.md)
- [Architecture and interfaces](docs/ARCHITECTURE.md)
- [Threat model and approval boundaries](docs/THREAT_MODEL.md)
- [Ordered implementation plan](docs/PLAN.md)
- [Engineering decisions](docs/DECISIONS.md)
- [Coding conventions](docs/CODING_CONVENTIONS.md)
- [Commands, results, limitations, and changed files](docs/EVIDENCE.md)
- [Phase 1 OpenAPI contract](packages/contracts/openapi.yaml)

The source playbook is
[01_Firecrawl_Adaptive_Crawler.pdf](01_Firecrawl_Adaptive_Crawler.pdf). All three
pages were read before implementation.

Git initialization, commits, remotes, pushes, and deployment are not authorized
for this project. CI configuration is provided locally, but no hosted CI run is
implied.

The final read-only check found Git metadata that was absent at the initial
inventory. This session ran no `git init`, commit, remote, or push commands.
The metadata's origin/approval is unverified; it was preserved without changes.
