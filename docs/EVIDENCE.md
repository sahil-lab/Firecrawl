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

## Publication to GitHub - 2026-11-20

At 16:15 on 2026-11-20 the project owner asked for the work to be pushed to
GitHub. Times here are local (UTC+05:30).

- **Starting state.** The project folder was not a Git repository. It sits next
  to an archive named `Firecrawl-main.zip`, and the `gh` command line was signed
  in to github.com as `sahil-lab`, who owns the public repository
  <https://github.com/sahil-lab/Firecrawl>. That repository had one unprotected
  branch, `main`, with two commits under that account: `1f8ac25` "Initial
  project import" (2026-11-12) and `e0560de` "Update project implementation and
  UI" (2026-11-13). The working files matched `e0560de` except for the 50 files
  listed in the two update records below: 15 modified, 35 new, none removed.
- **What was done.** `git init` in the project folder, the repository added as
  `origin` and fetched, and the new `main` pointed at `origin/main` without
  touching the working files, which were then compared with a copy taken
  beforehand (92 files, none different). The author identity of the existing
  commits and `core.autocrlf=false` (every source file uses LF, which the
  formatter expects) were set for this repository only. No global Git setting or
  stored credential was changed; the push authenticated through the existing
  `gh` sign-in.
- **Before committing.** The files to be published contained no access-token or
  private-key patterns, and the value of the generated database credential
  appeared in none of them. `.local`, `.cache`, `node_modules`, `dist`, and
  `target` are ignored, and nothing under them is tracked.
- **Commit and push.** One commit, `2b94826` "Redesign dashboard with a WebGL
  landscape scene and pin Node 22" (50 files, 7,037 insertions, 545 deletions),
  was pushed at 16:42 as a fast-forward of `main` from `e0560de`. Nothing was
  force-pushed, and no branch, tag, release, or pull request was created.
- **Hosted CI.** The push started run 44725691109 of the "Firecrawl skeleton"
  workflow, which runs `scripts/verify.ps1` on a GitHub-hosted `ubuntu-latest`
  runner. Its one job succeeded in 2 min 52 s. The log shows `npm ci` restoring
  257 packages, the formatting check, 43 backend tests, 9 UI tests, a 41-module
  build with the same asset names as the local one (`index-Ca_CdfdJ.js` and
  `index-CTKWAGHS.css`), 7 + 1 HTTP smoke tests, and the script's final line.
- **Earlier hosted runs.** The records below say hosted CI was not run, which
  describes what those sessions did. The repository's Actions history shows that
  the same workflow had run twice before, on the pushes of the two earlier
  commits: it ended in failure 14 s after it started for `1f8ac25`, and
  succeeded in 2 min 32 s for `e0560de`. Neither run was observed when it
  happened, and the failed run's log was not read.
- This section, and the wording about Git in the README, the plan, and decision
  D006, were added in a second commit pushed afterwards. The hosted run for that
  commit is not recorded here.

## Verified outcome - 2026-11-20: landscape scene

The project owner asked for a far more striking interface. The flat contour
field behind the headline was replaced by a landscape scene behind the whole
page, with an opening sequence and a headline drawn one character at a time
(decision D010, rewritten). The work ran from 2026-11-18 to 2026-11-20 and
changed only `apps/web/src` and the documents. The API, database, contract,
runtime topology, dependencies, and lockfile are unchanged. Unless a line says
otherwise, everything in this section was observed on the final tree, whose
build is served as `assets/index-Ca_CdfdJ.js` and `assets/index-CTKWAGHS.css`.

The complete documented `scripts/verify.ps1` command, run from
`C:\Users\upadhsah\Downloads\Firecrawl-main\Firecrawl-main` at 14:35 on
2026-11-20, exited **0** and printed:

```text
Firecrawl verification passed. Local dashboard: http://localhost:18101
```

| Gate                       | Observed result                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolchain                  | Node 22.23.5 and npm 10.9.9 in `node:22-alpine`, at the digest recorded on 2026-11-18. `npm ci` restored 257 packages with no engine warnings.                    |
| Prettier / ESLint / tsc    | All matched files formatted; lint and the strict TypeScript build gate passed.                                                                                    |
| Backend                    | Unchanged source. 43 tests passed; 0 failures, errors, or skipped tests. Spotless and JAR packaging passed.                                                       |
| React component tests      | 9 passed: the eight earlier cases unchanged, plus one that checks the headline is named as one sentence and that the characters drawn for it spell that sentence. |
| Production build           | 41 modules. JS 277.10 kB (88.49 kB gzip), CSS 39.58 kB (9.15 kB gzip), and the same three `woff2` fonts.                                                          |
| Real-stack HTTP smoke      | 7 passed, including the security-header and production-asset assertions against the new bundle.                                                                   |
| Database-unavailable smoke | 1 passed; the database was restored in the script's `finally` block.                                                                                              |
| Migration/restart, host    | Passed inside the script: one successful Flyway V1 entry before and after API restart; loopback readiness HTTP 200/UP.                                            |
| Hosted CI                  | Not run. No Git command was run.                                                                                                                                  |

The automated checks now comprise **43 backend + 9 UI + 8 real HTTP tests**.
For scale, the interface of 2026-11-18 built to JS 252.13 kB (79.21 kB gzip)
and CSS 32.64 kB (7.80 kB gzip). The "Hosted CI" row describes the moment of
that run; the push that followed, and the hosted run it started, are recorded
under "Publication to GitHub" above.

That run was made before this section was written. Afterwards the documents
were formatted and `npm run format:check` passed again. No file under `apps/`
changed after the run, and the stack still served the bundle named above.

### Browser checks of the final build

These ran against the real stack at `http://localhost:18101` in headless
Microsoft Edge 157.0.4341.60, driven over the DevTools protocol by scripts run
with the host's Node. The scripts are not part of this repository, so these are
recorded observations, not a repeatable project gate. The GPU is this machine's
integrated one (Intel Arc Pro Graphics through ANGLE and Direct3D 11), and the
headless browser ran at 60 frames per second. The window is 1440x900 at 1x
unless a row says otherwise. Rows without a time were observed between 13:38
and 14:02 on 2026-11-20 with the laptop on battery. No run cited in this section
overlapped a standby.

| Check                    | Observed result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load                     | No console errors or warnings, failed requests, or Content-Security-Policy reports. The scene ran at full quality on a 2106x1330 buffer, and the page at 60-61 frames per second with the scene calm, under a moving pointer, and at the footer. The real API reported "API + database ready".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Opening                  | In a new browser profile the scene's first frame was drawn 0.63 s after navigation, the opening was released at 0.89 s, and the curtain was gone at 2.03 s. On the next load these were 0.19 s, 0.76 s, and 1.89 s. From release the page ran at 58-62 frames per second in every half second.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Validation, real API     | While a request was held, the controls were disabled and "Validating..." was shown. An acknowledged request with budget 12 showed "Request is valid." and the statement that nothing was fetched, in a status region. Editing a field cleared the result. Budget 101 without acknowledgment showed both API field errors and marked both controls invalid.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Readiness states         | "Checking" and "Stack unavailable" were produced by holding or failing the request in the browser; the stack was not stopped. While checking, the button was disabled and the card's sweep was shown. "Check again" then recovered on the real API and the sweep was gone.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Keyboard only            | 16 tab stops in document order, starting with the skip link, each with a visible focus indicator. The skip link moved to the form. Arrow keys, Enter, and Space operated the form; Enter submitted and the real API answered.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Window sizes             | 320x640 and 390x844 (2x, touch), 820x1180, 1366x640, 1440x900, 1920x1080, 2560x1440, and 3840x2160: no horizontal overflow, both hero actions inside the first window, the scene at full quality, and the page at 60-61 frames per second. At the five sizes other than 1440x900 up to 1920x1080, no element was left hidden once the opening had finished. The scene's buffer was 640x1280, 780x1688, 1382x2026, 2431x1152, 2106x1330, 2222x1260, 2225x1259, and 2227x1257: never more than 2.8 megapixels.                                                                                                                                                                                                                                                                                                                                                     |
| Touch emulation          | At 390x844 and 320x640: no pointer follower or pointer hint. The status link is 36 px tall and answered taps 21 px above and below its centre. Tapping a corner of the acknowledgment row toggled the checkbox, which is itself 25 px. No other link, button, or field was smaller than 40 px, the skip link not counted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Narrow header            | At 320 and 375 px wide the brand link is the mark alone, in a 44x44 px link still named "Adaptive Crawl Lab home"; from 376 px the name is shown. With the longest status label, produced by blocking the readiness request, the two links were 110 px apart at 320 px and 36 px apart at 376 px, and nothing overflowed. (14:43)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Reduced motion           | No opening. None of 87 watched elements was hidden or moved, no animation was running, and there was no pointer follower or hint. The scene was one still picture that scrolled away with the hero, and a pointer and a press changed nothing in it. The marquee was one wrapped row with all six statements visible, and the footer had its ordinary height. See "The still picture" below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Scene without a GPU      | Started with `--disable-gpu`, the browser offered only software WebGL, which the scene declines. It drew nothing, its caption stayed hidden, the static gradient stood in, the opening was released 1.0 s after navigation, the page ran at 61 frames per second, and validation against the real API worked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Scene under load         | The page's CPU was throttled with the pointer still. At 14:32, throttled 10x, the scene went to 70% resolution after 4.6 s and 50% after 8.6 s, and stopped on a still frame after 11.0 s. While stopped the pointer hint was gone, the headline no longer drifted, the footer had its ordinary height, and the form worked. Left alone, the scene started again 19.9 s after stopping; with the pointer then moving over the land it was at 70% after 5.8 s and at full resolution after 11.8 s. Stopped a second time, it was running again when checked about two seconds after the page came back from behind another tab. At 13:56, on battery, it did not give way at 10x in 30 s; at 40x it reached 70% after 7.7 s and 50% after 13.7 s and did not stop in 30 s, and with the pointer moving over the land it was back at full resolution after 16.4 s. |
| Scene after context loss | The WebGL context was taken away and returned twice with `WEBGL_lose_context`. Each time the scene drew nothing, hid its caption, and showed the static gradient; it was drawing again at full quality 28 ms and 23 ms after the context returned, and afterwards a press still changed the picture.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Pointer details          | The marquee paused under the pointer and ran again after it left. The follower showed its pressed state while the mouse button was held, dropped it on release and on a cancelled press, and was hidden when the pointer left the page. The pull on the two magnetic buttons stopped at 12 px and was released when the pointer left.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Footer wordmark          | At widths of 320, 390, 820, 1440, 1920, and 2560 px the wordmark's text ended 0.2-2.1 px inside the footer's content box on each side.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Selection                | The selection colours computed as the accent on its ink for the lede, the URL field, a ledger row, and a headline character.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

**The still picture.** A scene that must not move is checked by capturing a
patch of it several times and comparing the captures. In the reduced-motion run
above, the first of three captures differed from the other two, and the script
kept no record of where. That was not seen again: in twelve further loads, 48
captures taken between 2 and 8 s after navigation were identical within each
load, and in the eleven of those loads where the scene's draw calls were counted
it had drawn once before the first capture (twice, 18 ms apart, in one load) and
not again. For the stopped scene, the 14:32 run above compared captures once
under the throttle and twice after it was lifted, and none differed. A run at
12:35 on an earlier build of that day had found two captures of the stopped
scene differing while the throttle was still on, and did not check again with it
lifted. What made the captures differ in those two runs was not established.

Not verified: Firefox and Safari; physical phones or tablets (emulation only);
screen readers; displays faster than 60 frames per second or with a variable
rate, and real high-density displays (densities were emulated in a headless
browser running at 60); any GPU other than this machine's integrated one; and
browsers without `KHR_parallel_shader_compile`, where the page still waits for
the scene's programs when it starts, or without registered custom properties and
inherited highlight styles, which the pointer effects and the selection colours
use. The scene's steps down were triggered by throttling the page's CPU, not by
a slow GPU. No session longer than a few minutes was observed, and the
comparison of folded and unfolded noise recorded for the contour field was not
repeated for the scene's terrain, which folds its offsets in the same way.
Energy use was not measured. Resource limits and the digests of the unchanged
images were not inspected again.

### Text contrast, measured from screenshots

Decision D010 has two rules: small text never sits on the open scene, and the
scene stays dim behind the display type that does. Both were checked from
screenshots of the final build at 1440x900, 390x844, 320x640, 820x1180, and
1920x1080 (14:01 to 14:13), by a script that finds every run of visible text,
captures the page with the text hidden, and computes the WCAG ratio between
each run's colour and the pixels behind it. The film-grain layer, which lays the
same faint texture over text and background alike, and the pointer follower
were hidden for these captures. No run of text failed in any pass.

| Pass         | What was captured                                                                                                                                                                                                                                                                                                               | Size of the pass                             | Lowest ratio found                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| White        | The scene hidden and the page behind everything painted white, with the stack ready, after a valid and an invalid request, and with the stack unavailable. Text not marked for the scene must reach 4.5:1, or 3:1 if large.                                                                                                     | 136-196 runs of text for each state and size | 4.70:1 for normal text (a label on the budget gauge) and 3.56:1 for large text (a marquee statement)   |
| White, hover | The same while hovering each control and card, at the three sizes without touch.                                                                                                                                                                                                                                                | 100-111 runs                                 | 4.66:1 (the note under the request preview)                                                            |
| Grey         | Display type marked `data-scene-clear`, on the brightest grey the scene can show behind it. It must reach 3:1.                                                                                                                                                                                                                  | 42-45 runs                                   | 3.41:1                                                                                                 |
| Live         | The scene running and provoked, with the text hidden: the hero at rest and scrolled, the pointer and presses on the headline, the ring after a valid and after an invalid request, the section titles at several scroll positions, and the unavailable tint. The brightest channel inside each marked box of text was recorded. | 55-61 captures for each size                 | Brightest channel 118-123 of 255. For the display colour with the least contrast, 3.85-4.07:1 by size. |

The scene's own limit inside those boxes is 46% of full scale, which over the
page's ink comes to 122-123 of 255.

The audit does not judge the footer wordmark and the marquee's outlined second
row (both hidden from assistive technology), the text of disabled controls, text
that is fully transparent or is under or just below the fixed header at the
moment of a capture, graphics that are not text, or focus rings.

Earlier runs of the same audit during this update found the following, and each
was fixed before the final build. Their output was not kept, so the figures are
as noted at the time.

- The faintest text colour measured 4.17:1 on a sheet. `--paper-faint` went from
  `#788279` to `#808a81`, which is the 4.70:1 above.
- The readiness card's radar rings ran behind its hint text (3.91:1). The card
  is now a grid in which the radar has a cell of its own.
- The scene stayed dim inside each marked element's box, which the tails and
  overshoot of large type leave: the brightest channel behind the headline's
  text was 148. The boxes are now taken from the text itself, which is the 123
  above.
- At 320 px the status link overlapped the product name. The narrow-header row
  above is the fix.
- The footer wordmark overhung its right edge by 4-36 px, depending on the
  width. It was measured again and resized; the wordmark row above is the fix.

### Scene measurements

The scene draws continuously, so its cost was measured in the same headless
browser at 1440x900. "GPU share" is the browser's part of the GPU's 3D engine
from the Windows "GPU Engine" counters, given as the range over two windows of
about ten seconds each (one window at 2x density). All other processes together
took 4.7-7.9% in the same windows. The contour field's column is the 2026-11-18
record below. The middle column is the build of 12:32 on 2026-11-20, which
differs from the final one in the footer wordmark's size, the narrow header, and
how far ripples reach. The columns come from separate runs in different power
states, so they are one machine's observations, not a benchmark.

| Condition                                   | Contour field, 2026-11-18           | Scene, 12:45, on mains    | Scene, final build, 13:47, on battery |
| ------------------------------------------- | ----------------------------------- | ------------------------- | ------------------------------------- |
| Calm at the hero                            | 7.6-8.8%, drawing 30 times a second | 12.6-14.6%, drawing 30-35 | 10.6-12.9%, drawing 30-34             |
| Pointer moving over the hero                | 16.2-17.2%, drawing 59-60           | 29.5-34.4%, drawing 60    | 23.3-25.6%, drawing 60                |
| Scrolling                                   | Not measured                        | 34.3-35.9%, drawing 59-60 | 22.2-23.0%, drawing 58-60             |
| Calm behind the validation sheet            | Not applicable                      | 11.6-14.4%, drawing 21-24 | 9.3-11.4%, drawing 20-22              |
| Calm at the footer                          | Not applicable                      | 12.5-13.2%, drawing 35-36 | 10.6-10.9%, drawing 35                |
| Scene taken away                            | Not applicable                      | 0%                        | 0%                                    |
| 2x density: calm, pointer moving, scrolling | 8.3-13.3%, 20.1-25.0%, not measured | 14.0%, 32.3%, 25.3%       | 10.9%, 32.9%, 25.2%                   |

In every window of both scene columns the page ran at 58-60 frames per second,
and at most 4 of the 420-730 frames in a window came late. The scene costs more
than the field it replaced: about 1.2 to 1.9 times its share when calm, and 1.4
to 2.1 times with the pointer moving.

- **Machine state.** The share depends on what else the machine is doing. In
  two runs between 14:45 and 14:49, five to eight minutes after the verification
  script finished, the final build's calm scene measured 44.9% and 41.1%, and
  63.6% and 44.4% with the pointer moving. Other processes took 8-14% in those
  windows, and the measuring script itself needed 67-68 s where it otherwise
  needs 41-45 s. At 14:52 the same run measured 14.6% and 25.5% again. What the
  machine was doing in between was not investigated.
- **Multisampling.** The scene's context is created without it. From 14:53 to
  14:57, on mains, the final build was measured in turn with the context forced
  to four samples and as shipped, twice. With four samples the calm scene took
  19.3% and 20.1%, and 39.4% and 39.3% with the pointer moving; as shipped,
  14.2% and 13.8%, and 29.4% and 31.8%. The page ran at 60 frames per second
  either way. A first attempt at 14:45 fell in the machine state described
  above and was repeated for that reason; in it four samples took 52.6% and
  63.1% calm.
- **Pacing.** In the table, the calm scene drew 30-36 times a second in the open
  and 20-24 behind a sheet, and every frame only while the pointer moved or the
  page scrolled. Calm cost about half of what drawing every frame cost.
- **The scene's own drawing.** The measuring script timed the scene's draw calls
  on the GPU with `EXT_disjoint_timer_query`. The median was 1.9-2.4 ms a frame
  in seven of eight windows (calm, pointer on the land, pointer on the headline,
  scrolling) and 3.6 ms in one, with the 90th percentile at most 4.2 ms. At
  14:52, on mains, the medians were 1.9-2.0 ms.
- **Main thread.** By the browser's own bookkeeping the main thread was busy for
  5-6% of the time with the scene calm, 23-26% with the pointer moving over the
  land, 35-38% over the headline, and 28-30% while scrolling, on battery; on
  mains at 14:52 these were 4%, 16%, 21%, and 18%. In a run at 18:02 on
  2026-11-19, before the per-frame changes below, they were 22.7% calm, 45.5%
  over the land, and 67.2% over the headline, where the page fell to 51 frames
  per second.
- **Style work per frame.** In three-second traces, the pointer over the land
  cost one style pass a frame over 5 elements (0.99 ms); over the headline, two
  passes over 5 and 6 elements (0.82 and 0.48 ms); scrolling through the hero,
  two passes over 25 and 7 elements (0.87 and 0.64 ms); and the marquee in view,
  one pass over 28 elements (0.65 ms). With the marquee out of view its 28
  animations were paused, and with the effects writing nothing there was no
  style pass at all. In the run at 18:02 on 2026-11-19 the pointer over the
  land cost two passes a frame totalling 3.55 ms, and over the headline 6.35 ms.
  On the build of 23:56 that day, scrolling cost 5.6 passes a frame.
- **Reads before writes.** With every read and write of the document by the
  scene and the pointer and scroll effects recorded, each of 120 frames with the
  pointer over the land and 120 frames of scrolling made all of its reads (the
  scroll position, the canvas's box, the boxes of the display type) before its
  first write.
- **Locating the display type.** Asking the browser where the headline's text is
  cost 0.09-0.10 ms a frame. Publishing the pointer's numbers as registered,
  non-inherited properties on the four hero layers cost 0.30 ms a frame; one
  inherited number on the hero, with its 77 descendants, cost 2.63 ms.
- **Startup.** In three loads, the first in a new profile, the scene's compile
  and link calls took 0.4-0.5 ms of main-thread time per load and its longest
  draw call 1.6 ms. Around the first press, the first use of the ripple program,
  the longest frame was 17.8 ms. In three new profiles each, taken in turn, the
  page spent 417, 400, and 433 ms in frame gaps longer than 50 ms before the
  opening was released with the scene, and 233, 283, and 317 ms with WebGL
  withheld by the script; after release, 0, 0, and 50 ms against 0, 0, and 0.
  The curtain lifted at 59-60 frames per second either way.
- **Refresh rate.** The scene judges the page's pace against the display's own
  frame interval, which it estimates from the gaps between frames. The first
  estimator took the smallest average of two neighbouring gaps. On the build of
  12:11 on 2026-11-20 a script applying the same rule to the page's frame times
  saw single short gaps drag it to 14.15 ms on a 16.7 ms display, and that
  build's scene, stepped down by a throttle, did not step back up in 32 s. The
  estimator is now the smallest middle value of five neighbouring gaps: 16.3 ms
  over 1,551 frames on the final build, where the earlier rule would have said
  15.45 ms, and 16.5 ms over 5,319 frames on the 12:32 build.

### Failures and events during this update

- At 14:12 on 2026-11-18 the computer was shut down from the Windows shell; the
  System event log records a power off initiated by Explorer for the signed-in
  user. That interrupted a build and a browser check, which were repeated. The
  computer was started again at 15:40. Docker Desktop, which does not start by
  itself, was started at about 20:59 with `docker desktop start`, a third time
  on the approval the owner gave for the first. Only this project's services
  were started again, on the existing volume and credential, and no other
  project's container was running afterwards.
- The System event log records no bugcheck or unexpected shutdown between 12:00
  on 2026-11-18 and 15:00 on 2026-11-20.
- Two measurement runs overlapped a standby and were discarded: one from 18:06
  to 18:29 on 2026-11-19 with the lid closed, which hung, and one at 00:20 on
  2026-11-20, when the display's idle timeout put the machine into Modern
  Standby. There the headless browser ran at about 42 frames per second whatever
  the page did, and the scene stepped down and stopped. The measuring scripts
  now hold the system and the display awake while they run and report any
  standby entry. No power setting was changed.
- The laptop ran on battery from about 13:38 to 14:24 on 2026-11-20, from 70% to
  31% of charge, and on mains from 14:27.
- A design in which the scene timed its own drawing on the GPU, to judge whether
  it was the reason the page was slow, was built, tested, and removed: with only
  the page's CPU throttled, that scene never gave way.
- Ripples far from the camera were too small to see. They are now longer and
  faster in proportion to their distance, at the same height. This was judged
  from captures, not measured.
- Outputs of the first multisampling comparison, of the contrast audits that
  found the defects listed above, and of one run of the load scenario were not
  kept. Nothing in this section relies on them except where it says so.
- The verification script was run once in this update, on the final tree.

### Files changed in this update

```text
README.md
apps/web/src/App.tsx
apps/web/src/App.test.tsx
apps/web/src/index.css
apps/web/src/components/ContourField.tsx    (removed)
apps/web/src/components/Marquee.tsx
apps/web/src/components/Scene.tsx           (new)
apps/web/src/components/SplitText.tsx       (new)
apps/web/src/components/icons.tsx
apps/web/src/motion/bootstrap.ts
apps/web/src/motion/contourField.ts         (removed)
apps/web/src/motion/contourShader.ts        (removed)
apps/web/src/motion/sceneSignals.ts         (new)
apps/web/src/motion/usePointerEffects.ts
apps/web/src/motion/useScrollEffects.ts
apps/web/src/motion/useSplitOrder.ts        (new)
apps/web/src/motion/scene/poses.ts          (new)
apps/web/src/motion/scene/scene.ts          (new)
apps/web/src/motion/scene/shaders.ts        (new)
apps/web/src/motion/scene/terrain.ts        (new)
apps/web/src/sections/Hero.tsx
apps/web/src/sections/ReadinessSection.tsx
apps/web/src/sections/ScopeSection.tsx
apps/web/src/sections/SiteFooter.tsx
apps/web/src/sections/ValidateSection.tsx
apps/web/src/styles/base.css
apps/web/src/styles/header.css
apps/web/src/styles/hero.css
apps/web/src/styles/motion.css
apps/web/src/styles/readiness.css
apps/web/src/styles/scene.css               (new)
apps/web/src/styles/scope.css
apps/web/src/styles/tokens.css
apps/web/src/styles/validate.css
docs/ARCHITECTURE.md
docs/CODING_CONVENTIONS.md
docs/DECISIONS.md
docs/EVIDENCE.md
docs/PLAN.md
```

No backend, migration, nginx, contract, script, smoke-test, package, or lockfile
change was made.

## Verified outcome - 2026-11-18: Node 22 and interface redesign

This section and the 2026-11-12 record below are kept as history. The toolchain
it records is still the current one. The interface it describes was changed
again on 2026-11-20: the contour field behind the headline, which most of this
section measures, was replaced by the landscape scene recorded above.

Frontend tooling moved to Node 22 LTS and the dashboard was redesigned (decisions
D009 and D010). The work ran from late 2026-11-16 to 2026-11-18. The gate table
and the browser checks below were observed on the tree as it was on 2026-11-18;
where a figure comes from an earlier build of that update, it says so. The API,
database, contract, and runtime topology are unchanged.

The complete documented `scripts/verify.ps1` command exited **0** and printed:

```text
Firecrawl verification passed. Local dashboard: http://localhost:18101
```

| Gate                       | Observed result                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Toolchain                  | Node 22.23.5 and npm 10.9.9 in `node:22-alpine`. `npm ci` restored 257 packages with no engine warnings.               |
| Prettier / ESLint / tsc    | All matched files formatted; lint and the strict TypeScript build gate passed.                                         |
| Backend                    | Unchanged source. 43 tests passed; 0 failures, errors, or skipped tests. Spotless and JAR packaging passed.            |
| React component tests      | 8 passed: the six earlier cases unchanged, plus the request preview with budget stepping and clearing a stale result.  |
| Production build           | 36 modules. JS 252.13 kB (79.21 kB gzip), CSS 32.64 kB (7.80 kB gzip), and three `woff2` fonts totalling 74.66 kB.     |
| Real-stack HTTP smoke      | 7 passed, including the security-header and production-asset assertions against the new bundle.                        |
| Database-unavailable smoke | 1 passed; the database was restored in the script's `finally` block.                                                   |
| Migration/restart, host    | Passed inside the script: one successful Flyway V1 entry before and after API restart; loopback readiness HTTP 200/UP. |
| Hosted CI                  | Not run. No Git command was run.                                                                                       |

The automated checks now comprise **43 backend + 8 UI + 8 real HTTP tests**.
For scale, the previous interface built on the same toolchain was JS 226.23 kB
(70.91 kB gzip) and CSS 3.76 kB, with no font files.

### Toolchain and dependency changes

- `node:22-alpine` resolved to
  `sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a`
  (Alpine 3.24.4). The other images were not pulled again.
- Lockfile: added `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`,
  and `@fontsource/instrument-serif` (each 5.3.0, OFL-1.1); `@types/node`
  24.19.2 -> 22.20.5 with its `undici-types` 7.24.6 -> 6.21.0. No other resolved
  version changed: React 19.3.1, TypeScript 6.0.3, Vite 8.3.8, Vitest 4.1.12,
  ESLint 10.14.0, and Prettier 3.6.2 are as before.
- Before the interface was touched, the previous UI passed formatting, lint, its
  six tests, and the production build on Node 22.23.5.
- Host Node and Java were not replaced and were not used to install or build the
  application or to run the project's tests.

### Browser checks of the redesigned interface

These ran against the real stack at `http://localhost:18101` in headless
Microsoft Edge 157.0.4341.60, driven over the DevTools protocol by a script run
with the host's Node. That script is not part of this repository, so these are
recorded observations, not a repeatable project gate. Every row describes the
final build, served as `assets/index-RYONCHDF.js`.

| Check                        | Observed result                                                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load, 1440x900               | No console errors or warnings, failed requests, or Content-Security-Policy reports. Three fonts loaded from the same origin. The real API reported "API + database ready".                                                                                                                                                          |
| Validation, real API         | An acknowledged request with budget 12 showed "Request is valid." Budget 101 without acknowledgment showed both API field errors and marked both controls invalid. Editing cleared the result.                                                                                                                                      |
| Pending and readiness states | Pending, "Checking readiness...", and "Stack unavailable" were produced by holding or failing the request in the browser; the stack was not stopped. "Check again" then recovered on the real API.                                                                                                                                  |
| Keyboard only                | 16 tab stops in document order, starting with the skip link, each with a visible focus indicator. Arrow keys, Enter, and Space operated the form; Enter submitted and the real API answered.                                                                                                                                        |
| Viewports                    | 320x640, 390x844, 820x1180, 1366x640, 1440x900, 1920x1080, 2560x1440, and 3840x2160: no horizontal overflow, and both hero actions inside the first viewport.                                                                                                                                                                       |
| Touch emulation              | No pointer follower or pointer hint. The status link's tap target is 44 px tall, and tapping a corner of the acknowledgment row toggles the checkbox.                                                                                                                                                                               |
| Reduced motion               | Nothing hidden or offset, no running animations, the contour field drawn as one still frame, and the marquee wrapped with all six statements visible.                                                                                                                                                                               |
| Field without a GPU          | Started with `--disable-gpu`, the browser offered only software WebGL. The field drew nothing, its caption stayed hidden, the page ran at 61 frames per second, and validation against the real API worked.                                                                                                                         |
| Field under load             | With the page's CPU throttled 10x, the field halved its resolution after 2.7 s and stopped on a still frame after 5.0 s, and its pointer hint was removed. It stayed stopped when the throttle was lifted and the form still worked. After scrolling away and back it ran again at the reduced resolution, at 61 frames per second. |
| Field after context loss     | The WebGL context was taken away and returned twice with `WEBGL_lose_context`. Each time the field drew nothing and hid its caption, was drawing again at full quality about 0.13 s after the context returned, and afterwards still answered the pointer and a press.                                                              |

Not verified: Firefox and Safari; physical phones or tablets (emulation only);
screen readers; real high-density or high-refresh displays (pixel densities were
emulated in a headless browser running at 60 frames per second); any GPU other
than this machine's integrated one; and browsers without
`KHR_parallel_shader_compile`, where the page still waits for the field's
programs when it starts. The field's quality reduction was triggered by
throttling the page's CPU, not by a slow GPU. Resource limits and the digests of
the unchanged images were not inspected again.

### Contour field measurements

The field is the only part of the page that draws continuously, so its cost was
measured in the same headless browser at 1440x900 on this machine's integrated
GPU (Intel Arc Pro Graphics through ANGLE and Direct3D 11). "GPU share" is the
browser's part of the GPU's 3D engine from the Windows "GPU Engine" counters,
given as the range over two to five four-second windows. The two builds were
measured in separate runs while other applications were using 10-71% of the same
engine for the earlier build and 20-31% for the final one, so these are one
machine's observations, not a benchmark.

The earlier build is one from this update that drew every display frame, faded
the canvas with a CSS mask, allowed a five-megapixel buffer, and compiled its
programs synchronously.

| Condition                         | Earlier build                                | Final build                                  |
| --------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Field idle, 1x density            | 15-38% GPU share                             | 7.6-8.8%, drawing 30 times a second          |
| Pointer resting on the field, 1x  | 16-38%                                       | 7.5-8.5%, drawing 30 times a second          |
| Pointer moving, 1x                | Not measured                                 | 16.2-17.2%, drawing 59-60 times a second     |
| Ripples alive, 1x                 | 17-35%                                       | 18.1-20.5%, drawing 60 times a second        |
| Field idle, 2x density            | 44-69% on a 5.0 MP buffer; page at 53-60 fps | 8.3-13.3% on a 3.0 MP buffer; page at 60 fps |
| Pointer resting on the field, 2x  | 63-68%; page at 52-54 fps                    | 8.2-12.7%; page at 60 fps                    |
| Pointer moving, 2x                | Not measured                                 | 20.1-25.0%; page at 60 fps                   |
| Ripples alive, 2x                 | Not measured                                 | 26.9-33.2%; page at 60 fps, one window at 52 |
| Shader compile and link, per load | 14.3, 30.0, and 243.8 ms of main-thread time | 0.1-0.4 ms                                   |

- **Mask.** With the shader swapped for a plain clear, so that only compositing
  was measured, the masked canvas took 17.4-18.6% and the unmasked canvas
  11.1-13.0% in the same run. With the terrain seeded and drawn as a still
  frame, the shader's own fade differed from the masked build in 3.05% of pixels
  at 1440x900 and 3.06% at 390x844, never by more than 2 of 255 levels; the same
  build captured twice differed in 0.01%.
- **Frame pacing.** In the final build's own runs, the same field cost 7.6-8.8%
  drawing 30 times a second and 16.2-17.2% drawing every frame under a moving
  pointer.
- **Startup.** The 243.8 ms was the first load in a new browser profile. In three
  cold starts of the final build the field began drawing 0.5-0.8 s after it
  started preparing its programs. Around the first press, the first use of the
  ripple program, the longest frame was 17.8 ms.
- **Frame rate.** The final build sampled at 60 frames per second in seven of
  eight samples at 1x (47 in the first, 3.5 s after load) and at 60-61 in all
  eight at 2x. At 2560x1440 it held 60, and at 3840x2160 it held 60 idle and 57
  with the pointer on it and a ripple.
- **Buffer.** At 1440x900 the field chose 1425x900 at 1x and 2179x1376 at 2x. It
  chose 2303x1303 for a 2560x1440 window and 2305x1302 for a 3840x2160 window,
  where it is scaled up by 1.66 and its lines stayed smooth in the capture.
- **Long sessions.** The drift offset is folded into one period of the noise so
  that positions stay small. A script outside the browser compared folded and
  unfolded noise at 200,000 random points, with offsets of up to 30 days of
  drift; value and slope differed by at most 1.1e-9.

### Failures and events during this update

- The first `node:22-alpine` pull ended with an EOF from the registry's CDN. The
  retry succeeded; nothing was changed to work around it.
- Installing `@types/node@^22` into the workspace alone left Vite's and Vitest's
  optional peer on 24.x, so npm nested a second copy under `apps/web/node_modules`
  on the Windows bind mount. The dependency was re-resolved so one 22.x copy is
  hoisted into the `firecrawl_node_modules` volume; the lockfile has no nested
  entries.
- Once, early after an API start and while the host was busy, a rejected request
  took longer than the UI's 10-second timeout. The UI showed its explicit "Could
  not reach the local API" error rather than a result; the same request then
  answered in about one second and after that in 51 ms. Timeouts were not changed.
- The host restarted twice during the work, and Docker Desktop, which does not
  start by itself, was not running afterwards. The Windows System event log
  records both as bugchecks: 0x13A at 03:17 on 2026-11-17 while the machine was
  awake, and 0x9F at 06:54 on 2026-11-18 while it entered hibernation from
  Modern Standby with the lid closed. The same log lists 21 earlier bugchecks
  since 2026-07-27, 18 of them 0x9F. Whether this project's containers or the
  headless browser runs contributed to either was not investigated.
- After the first restart Docker Desktop was started with `docker desktop start`
  on the owner's approval, and after the second in the same way on that
  approval. Each time only this project's services were started again, on the
  existing volume and credential. Other projects' containers were left as Docker
  restored them; none was running after the second restart.
- The second restart followed a standby that began in the middle of a browser
  check. That run was discarded and repeated.
- The contour field was first drawn with the 2D canvas API. In testing it could
  not keep up with the pointer over it and its quality reduction did not engage
  as intended, so it was rewritten as a WebGL shader and the reduction was
  reworked. That version held 60 frames per second at 1x density but not at 2x,
  which led to the measurements and changes recorded above.
- Earlier runs of the complete verification script on intermediate trees also
  exited 0. One of them took 5003 s because the machine entered Modern Standby
  part-way through.

### Files changed in this update

```text
README.md
package.json
package-lock.json
apps/web/index.html
apps/web/package.json
apps/web/public/favicon.svg                 (new)
apps/web/src/App.tsx
apps/web/src/App.test.tsx
apps/web/src/index.css
apps/web/src/main.tsx
apps/web/src/status.ts                      (new)
apps/web/src/components/ContourField.tsx    (new)
apps/web/src/components/Marquee.tsx         (new)
apps/web/src/components/icons.tsx           (new)
apps/web/src/motion/bootstrap.ts            (new)
apps/web/src/motion/contourField.ts         (new)
apps/web/src/motion/contourShader.ts        (new)
apps/web/src/motion/environment.ts          (new)
apps/web/src/motion/useActiveSection.ts     (new)
apps/web/src/motion/usePointerEffects.ts    (new)
apps/web/src/motion/useReveal.ts            (new)
apps/web/src/motion/useScrollEffects.ts     (new)
apps/web/src/sections/Hero.tsx              (new)
apps/web/src/sections/ReadinessSection.tsx  (new)
apps/web/src/sections/ScopeSection.tsx      (new)
apps/web/src/sections/SiteFooter.tsx        (new)
apps/web/src/sections/SiteHeader.tsx        (new)
apps/web/src/sections/ValidateSection.tsx   (new)
apps/web/src/sections/sections.ts           (new)
apps/web/src/styles/base.css                (new)
apps/web/src/styles/fonts.css               (new)
apps/web/src/styles/header.css              (new)
apps/web/src/styles/hero.css                (new)
apps/web/src/styles/motion.css              (new)
apps/web/src/styles/readiness.css           (new)
apps/web/src/styles/scope.css               (new)
apps/web/src/styles/tokens.css              (new)
apps/web/src/styles/validate.css            (new)
docs/ARCHITECTURE.md
docs/CODING_CONVENTIONS.md
docs/DECISIONS.md
docs/EVIDENCE.md
docs/PLAN.md
infra/docker/compose.yaml
```

No backend, migration, nginx, contract, script, or smoke-test file changed.
`ContourField.tsx`, `contourField.ts`, and `contourShader.ts` were removed again
in the 2026-11-20 update.

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
