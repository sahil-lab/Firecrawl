# Coding conventions

- Java 21, Spring Boot 3, Maven, Google Java Format via Spotless.
- Strict TypeScript, React functional components, Vite, ESLint, and Prettier.
- Use validated request records and typed responses. Do not use `any` to bypass
  type checks or hide unvalidated JSON behind assertions.
- Errors use explicit non-success HTTP status codes and sanitized problem
  details. UI failures remain visible; never substitute success-shaped defaults.
- Keep URLs, request bodies, credentials, and real user data out of logs.
- Use UTC for persisted timestamps; version database changes with Flyway.
- Keep migrations additive where practical. Never clean/reset production or
  local persistent data automatically.
- Keep code and tests colocated where sensible. Unit tests use deterministic
  synthetic inputs; end-to-end tests use the actual local stack.
- Run formatting, builds, tests, and smoke checks for each coherent slice. Stop
  at a failed gate, fix it, and rerun the affected gate.
- All development runs inside bounded project-scoped containers. Do not replace
  host tools or change another project's files/services.
- Record verified evidence separately from goals, assumptions, and deferred work.
