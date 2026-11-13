# Threat model and safety contract

This is a design-time threat model, not an independent security audit or a claim
of production readiness. Phase 1 operates on synthetic input only.

## Assets and trust boundaries

- Local PostgreSQL state and generated database credential.
- Developer workstation and other concurrently running projects.
- Future target-site permissions and resources (not accessed in Phase 1).
- Browser -> loopback nginx -> internal API -> internal PostgreSQL.
- Container package registries are used only for public tooling/dependencies.

## Threats, controls, and verification

| Threat                                | Phase 0/1 control                                                      | Verification / remaining boundary                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| SSRF or accidental target-site access | Validation has no fetch/execution path; API has no egress.             | Synthetic URL validation succeeds without DNS; Phase 3 must validate DNS, redirects, and private networks. |
| Credentials embedded in submitted URL | HTTP(S) URL validator rejects user info.                               | Validator and controller tests.                                                                            |
| Unauthorized crawling                 | No job creation/execution endpoints; explicit UI notice.               | Smoke checks future routes do not succeed.                                                                 |
| Misleading permission acknowledgment  | `termsAccepted` is required but not represented as policy enforcement. | UI/docs distinguish intent from verified permission.                                                       |
| Invalid or excessive input            | Bean validation, strict JSON types/fields, 8 KiB proxy body limit.     | Controller and smoke rejection cases.                                                                      |
| Error/log data disclosure             | Sanitized problem responses; no raw bodies/URLs in logs.               | Tests assert rejected values and parser errors stay out.                                                   |
| Credential leakage                    | Generated untracked file, Docker secrets, excluded build context.      | Configuration inspection; no password printed.                                                             |
| Database exposure                     | No host port; internal project network; non-default local credential.  | Compose/container inspection.                                                                              |
| Browser injection/framing             | React text rendering, CSP, nosniff, referrer and frame restrictions.   | Component tests and HTTP header assertions.                                                                |
| Cross-project interference            | Fixed Compose project, reserved loopback port, bounded resources.      | Inspect labels, port bindings and limits.                                                                  |
| Destructive schema operations         | Additive Flyway migration; clean disabled; no auto-reset.              | Fresh startup/restart and migration history check.                                                         |
| Premature production use              | No public binding, no claims of auth/TLS/HA or production readiness.   | README and explicit phase limits.                                                                          |

## Important limitations

URL syntax validation is **not** SSRF protection. A syntactically valid hostname
can resolve to a private address. Before implementing any fetcher, Phase 3 must
enforce destination policy at connection time and across redirects, handle DNS
rebinding, require robots/terms decisions, and respect per-domain budgets.

There is no application authentication in Phase 1 because no domain mutation or
execution endpoint exists. Do not broaden exposure beyond loopback. Phase 2
must define ownership/permissions before introducing persisted crawl jobs.

Local file-backed Compose secrets are not an encrypted secret manager. Protect
the workstation and never publish the generated `.local` directory. Loss of the
credential while retaining the database volume requires operator-guided recovery,
not a silent password reset.

## Prohibited without separate user approval

- Fetching real user data or bypassing site/authentication/access restrictions.
- Cloud provisioning, external deployment, or paid services.
- Deleting data/volumes, pruning global Docker state, stopping another project.
- Git initialization, commits, remotes, pushes, or other repository publication.
- Authoring files outside this project.

No request to a candidate crawl target is necessary for any Phase 1 test.
