# Coding conventions

- Java 21, Spring Boot 3, Maven, Google Java Format via Spotless.
- Strict TypeScript, React functional components, Vite, ESLint, and Prettier, run
  on Node 22 LTS inside the tooling container.
- Use validated request records and typed responses. Do not use `any` to bypass
  type checks or hide unvalidated JSON behind assertions.
- Errors use explicit non-success HTTP status codes and sanitized problem
  details. UI failures remain visible; never substitute success-shaped defaults.
- The UI loads nothing from another origin, so the nginx Content-Security-Policy
  keeps holding. Self-host assets. Do not put `style` attributes or `<style>`
  elements in markup; set runtime values through the CSSOM, preferably as custom
  properties that the stylesheet consumes.
- UI motion is an enhancement. Hide an entrance state only under
  `prefers-reduced-motion: no-preference` and `[data-motion='on']`, and keep
  every control and message usable without it.
- Code that runs on every frame reads from the document before it writes to it,
  and publishes a changing number as a registered, non-inherited custom property
  on the elements that use it, not on an ancestor for them to inherit.
- Text keeps its contrast whatever moves behind it. Small text sits on the
  page's ink (`--sheet` or more opaque), never directly on the scene; display
  type that does is marked `data-scene-clear` so the scene stays dim behind it.
- Decorative graphics must not look like data. Caption generative visuals, hide
  them from assistive technology, and derive status visuals from real API state.
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
