# Engineering decisions

## D001 - Preserve the playbook stack and phase order

Use Java 21, Spring Boot 3.5, React/TypeScript, PostgreSQL 17, and Docker Compose.
The published Maven metadata resolved Spring Boot **3.5.16** at implementation
time. Node container tooling (Node 22 since D009, originally Node 24) avoids the
host's Node 14 and missing Java.
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

Both tooling containers reuse the frontend network. Only two networks are needed;
this avoids consuming an extra subnet from the shared Docker address pool. An
unused Firecrawl-only default network was removed after verifying its ownership
and zero attached containers. No global network pruning was performed.

## D005 - Explicit errors and conservative credential handling

Use standard problem responses for invalid requests and explicit failure states
in the UI. Do not return fake health/job data on failures. Generate a local
credential once, keep it untracked, and mount it as a Docker secret. Do not
overwrite an existing credential or automatically reset a persisted database.

## D006 - No Git initialization without separate approval

The filesystem monorepo and local CI configuration can be created without
`.git`. The approval given for Replicas does not apply here. No Git
initialization, commit, remote, push, or hosted CI execution was performed by this
session. A final read-only check nevertheless found Git metadata that was absent
at the initial inventory. Its origin/approval is unverified; it was left untouched.

On 2026-11-20 the owner asked for the work to be pushed to GitHub. By then the
project was published as `sahil-lab/Firecrawl`, with two commits made under the
owner's account on 2026-11-12 and 2026-11-13, which is consistent with the
metadata found at the end of the first session. The working folder was a copy
of that repository's `main` without `.git`. The folder was made a repository on
that history, the work done since was added as one ordinary commit, and it was
pushed as a fast-forward: nothing was rewritten or force-pushed. Identity and
line-ending settings were set for this repository only. The request was read as
covering that commit and a second one that records the publication. Other Git
actions (branches, tags, releases, changes to history or to the repository's
settings) and any deployment are still asked for first. The
[evidence log](EVIDENCE.md) has the details.

## D007 - Tooling and dependency reproducibility

Use npm's lockfile for the frontend/tooling and Maven's managed dependency graph
for the backend. Scaffold React/TypeScript with Vite rather than layering a
generic `tsc --init` configuration over its bundler-specific preset. Preserve
strict TypeScript settings and use a `tsc` production build gate.

Container image major/LTS tags receive upstream patch updates. Record the actual
versions/digests used in the evidence log; immutable production promotion is a
future deployment concern. Dependency downloads do not send project source to a
third-party service.

## D008 - Keep generated dependencies on the container filesystem

The first clean npm restore spent excessive time extracting cached packages onto
the Windows bind mount. Use a project-scoped `firecrawl_node_modules` Docker
volume for generated dependencies, with `nocopy` so partially restored host files
are not imported. Keep authored source, lockfiles, artifacts, and documentation
in the project folder. CPU/memory limits and sequential verification are unchanged.

A later Java thread dump showed Maven blocked in `FileDescriptor.close0` while
reading dependency POMs on the Windows bind mount. Maven's local repository also
uses a project-scoped `firecrawl_maven_cache` volume. Existing public dependency
artifacts were copied locally into that volume; no global cache or host runtime
was changed.

## D009 - Pin frontend tooling to Node 22 LTS

The project owner asked for Node 22. The tooling container is `node:22-alpine`
and the workspace declares `node >=22.13.0 <23` and `npm >=10 <11`. The lower
bound is the oldest 22.x that every locked tool accepts: ESLint 10 requires
`^22.13.0` and Vite 8 requires `>=22.12.0`. npm 10 is the line bundled with
Node 22, so the lockfile is now written by npm 10. `@types/node` follows the
runtime on its 22.x line. Regenerating the lockfile changed no other resolved
version; it also dropped the optional `libc` hint from ten platform-specific
packages.

Host Node is still not used to build or test. Moving to another Node line means
changing the image tag, both `engines` ranges, and `@types/node` together, then
regenerating the lockfile inside the container.

## D010 - Editorial interface inside the existing safety contract

The dashboard is a dark, typographic single page laid over a generated
landscape: a terrain of contour lines, drawn behind the whole page, that the
camera flies through as the page scrolls, with one view per section. Around it
are an opening sequence, scroll-driven reveals, a live request preview, and a
readiness card. The Phase 1 contract is unchanged: the same two API calls, the
same copy for every state, and no new routes. The landscape replaced the flat
contour field of the first redesign, whose record is kept in the
[evidence log](EVIDENCE.md).

- **No new origins.** The nginx policy stays `default-src 'self'` with
  `style-src 'self'`. The typefaces (Geist, Geist Mono, Instrument Serif; OFL-1.1,
  via Fontsource) are bundled as three same-origin Latin `woff2` files. The
  markup carries no `style` attributes or `<style>` elements; values that change
  at runtime are set through the CSSOM, which the policy permits.
- **No animation or graphics library.** Motion is CSS plus a few small hooks, and
  the scene is hand-written WebGL 1: a grid that follows the camera, shaped from
  simplex noise in the vertex shader, with contour lines drawn in the fragment
  shader from the height of that same surface. The only added dependencies are
  the three font packages. The scene asks for hardware WebGL only; where that is
  unavailable nothing is drawn, a static gradient stands in behind the headline,
  and the scene's caption stays hidden.
- **Text does not depend on the scene for its contrast.** Small text is never
  placed on the open scene. It sits on a sheet, chip, scrim, or band of the
  page's ink that is at least 92% opaque, where the faintest text colour keeps
  4.5:1 even if the scene behind were white. Display type does float over the
  scene, so the page marks it (`data-scene-clear`), the scene asks the browser
  where that type is on every frame it draws, and inside those boxes it draws no
  colour channel above 46% of full. That leaves both display colours more than
  3:1 away from the brightest thing that can be behind them. Both rules are
  checked from screenshots in the evidence log, not only computed.
- **The scene must not cost the page its responsiveness.** Its WebGL context is
  created after the page's first paint and its four programs are compiled in
  the background where the browser supports that. It draws every display frame
  only while the camera travels or the pointer is changing the open scene, about
  30 times a second while only the slow cruise moves it, and about 20 behind the
  sheets. The terrain is worked out per grid point, not per pixel. There is no
  multisampling; the scene is drawn at up to twice the layout density, capped at
  2.8 megapixels, and scaled down. The evidence log records what the scene costs
  as built and what its pacing and the absence of multisampling save. The scene
  also watches the page's frame pacing against the display's own refresh rate.
  If frames stay slow for two seconds it steps its resolution down to 70% and
  then 50%, and after that stops on a still frame. It cannot tell whether it is
  the cause, so neither step is permanent: it steps back up once the page has
  been smooth while it was drawing every frame, and a stopped scene starts again
  after 20, 60, and 180 seconds, or as soon as the page is brought back to the
  front.
- **Effects that run on every frame touch as little of the page as they can.**
  The pointer and scroll hooks read what they need from the document before
  they write anything, and publish their numbers as registered, non-inherited
  custom properties on the elements that use them. The selection colours are
  declared once on the root and inherited as highlight styles. The marquee's
  animations rest while it is out of view, and the opening's animations end
  instead of staying in effect. The evidence log records the style work left on
  each frame and, where earlier measurements were kept, what it was before.
- **Motion is an enhancement.** Entrance states hide content only when the
  visitor has not asked for reduced motion and a startup check has confirmed the
  required browser APIs. Otherwise everything is visible from the first paint.
  The opening waits for the display fonts and for the scene's first frame, each
  with a timeout, so neither can keep the page covered. With reduced motion
  there is no opening, the scene is one still picture of the hero's view that
  scrolls away with the hero, the marquee wraps, and the pointer follower is not
  shown.
- **Decoration must not read as data.** The scene is captioned as generative and
  is hidden from assistive technology. It answers the page in three ways, and
  each repeats something the page already says in words: it takes a warning tint
  while the stack is unavailable, sweeps while readiness is being checked, and
  sends one ring across the land when a request has been validated. Readiness
  visuals are themed from the single readiness answer; the request path never
  shows per-hop states that the API does not report. The request preview is
  rendered from the same object that is submitted. The headline is drawn one
  character at a time for the eye and exposed to assistive technology as one
  sentence.
