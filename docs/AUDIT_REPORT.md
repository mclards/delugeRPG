# DelugeRPG Project - Deep Verification Audit

- Date: 2026-10-08
- Scope: `desktop-client/` (main.js, app.js, app.html, game-preload.js, targets.js, config.json, launch scripts), `pokefinder.user.js`, and all 19 root `test_*.js` files.
- Method: Read the code by hand, extracted facts across files with scripts, compared the three target lists, and gathered test-suite metrics. **No source code was changed.**
- Severity scale: CRITICAL > HIGH > MEDIUM > LOW > INFO.

> Honesty note: Several things I told you during earlier sessions turn out to be wrong or overstated. They are marked **[CORRECTION]** below. The most important one is a regression I introduced in the last session (finding C-1).

---

## 0. Executive Summary

| # | Severity | Finding |
|---|----------|---------|
| C-1 | CRITICAL | Hunting loop deadlocks silently on any non-target wild encounter (regression from the last "pause accuracy" change) |
| H-1 | HIGH | The XHR/fetch "movement hook" does nothing: the preload runs in an isolated world, so it never sees the page's requests |
| H-2 | HIGH | Obstacle detection almost never fires: any DOM mutation counts as a "successful move" |
| H-3 | HIGH | CAPTCHA / `/unlock` detection is dead code (an early return runs before it) |
| H-4 | HIGH | Plaintext credentials hard-coded in `main.js` fallback and stored in `config.json` |
| H-5 | HIGH | Test suite gives false confidence: mostly source-string matching and re-implemented logic; it does not catch C-1 |
| M-1 | MEDIUM | "Stuck in maze -> reload" recovery can never trigger (counter is reset every step) |
| M-2 | MEDIUM | Resuming with a target still on screen re-triggers or stalls immediately |
| M-3 | MEDIUM | Target-text false positives: `ultra` form matches "Ultra Ball", oversized `closest('div')` capture, body-text level fallback |
| M-4 | MEDIUM | `hasCatchUI` selector `a[href*="catch"]` can match unrelated links |
| M-5 | MEDIUM | Performance: full DOM scan runs every 300 ms **and** on every body mutation |
| M-6 | MEDIUM | `F2` is a system-wide global shortcut (stolen from every other app) |
| M-7 | MEDIUM | `allowpopups` webview with no window-open handler; no permission handler |
| M-8 | MEDIUM | Not portable / not installable: no `electron` dependency, hard-coded user paths, env-var workaround |
| M-9 | MEDIUM | Userscript still has the identical-text false-collision bug and a fixed 1500 ms cadence |
| L-x | LOW | Missing notification icon, a new AudioContext per beep, scratch files, duplicated lists, UA defined in two places, etc. |

**Overall health (my opinion): 5/10.** The feature set is broad and the code is readable. However, the core state machine has a live deadlock, two of the "intelligence" layers (network hook, obstacle detection) don't work the way they were described, and the tests can't detect any of this.

---

## 1. CRITICAL

### C-1. Hunting loop deadlocks on every non-target encounter
**Files:** `desktop-client/app.js:1225-1228`, `app.js:1030` (approx., `scheduleNextStep` guard), `app.js:1049` (timer callback guard), `game-preload.js:~258-263`.

What happens, step by step:
1. `game-preload.js` sends `encounter-status { hasEncounter: hasCatchUI }` on every scan (every 300 ms plus every mutation).
2. `app.js:1227` sets `isEncounterOnScreen = hasEnc` **for any wild encounter**, including Rattata or other non-targets. Since the last change, `isEncounterOrCatchUIPresent()` also returns true whenever the dexy text contains `wild` or `level`.
3. The pending walk timer then fires. `if (!isRunning || isEncounterOnScreen) return;` returns **without rescheduling**.
4. Nothing will ever clear `isEncounterOnScreen`. Clearing it needs the dexy to change, which needs a step, which is exactly what's blocked. The only ways out are `resume-hunting` (auto-catch flow only) or the user toggling manually.

Effect: The button still shows **Hunting** and the status stays at "Hunting (Left)", but the trainer stops forever at the first ordinary wild Pokemon. No alert or sound plays.

Origin: introduced in the last session, when `isEncounterOnScreen` guards were added to `sendKeyStep` and `scheduleNextStep` (around 16:56 today). Most of today's ban-free running probably happened before this change.

Fix direction (not applied): Only set the halt flag from `target-found`, not from `encounter-status`. Or, if the encounter is a non-target, keep walking and reschedule instead of returning.

---

## 2. HIGH

### H-1. XHR / fetch hook can't observe the page [CORRECTION]
**Files:** `game-preload.js:694-740`, `app.html:1326-1334`.
- The `<webview>` has no `webpreferences` attribute, so `contextIsolation` uses its default, which is **true**. The preload runs in an isolated JavaScript world.
- Patching `XMLHttpRequest.prototype` and `window.fetch` there only changes the isolated world's copies. DelugeRPG's own scripts use the main world's unpatched objects.
- Result: these hooks never fire for the game's movement requests. Earlier I said the AJAX hook "guarantees zero false obstacles". **That was wrong.** Any reduction in false positives actually came from H-2, which over-reports success.
- Even if the hook did reach the main world, it would mark **any** request (ads, analytics, polling) as a successful move. `_delugeUrl` is recorded but never checked.
- The same applies to `delete window.process/require/...` at `game-preload.js:17-24`. It only affects the isolated world, so the "environment hygiene" claim has no effect on what the page can see.

### H-2. Obstacle detection is mostly inert
**Files:** `game-preload.js:742-757`, `game-preload.js:841`.
- The `MutationObserver` watches `document.body` with `{childList, subtree, attributes, characterData}`. **Any** mutation counts as a successful move.
- The map page constantly mutates: other players' animated sprites (the "Animate players" checkbox), ads, timers, and the dexy itself. In practice `activeStep` resolves as success within milliseconds of almost every step, including steps into walls.
- So the 1400 ms collision timer and the 2-strike logic (`game-preload.js:781-821`) seldom get a chance to run.
- This explains why false obstacles went away. It is also why real walls will often go undetected, and the bot keeps pressing into them until the randomized wander turns it.

### H-3. CAPTCHA / unlock alarm never fires
**File:** `game-preload.js:211-222`.
```
const isHuntingPage = path.indexOf('/map') !== -1 || path.indexOf('/catch') !== -1;
if (!isHuntingPage) return;          // <- returns for '/unlock'
if (path.indexOf('/unlock') !== -1) { ipcRenderer.sendToHost('unlock-detected'); ... }  // unreachable
```
- `/unlock` contains neither `/map` nor `/catch`, so the unlock branch is unreachable.
- The host handler (`app.js:1287-1299`, with alarm sound and alert) is therefore dead.
- Mitigation that does exist: the 300 ms poller (`game-preload.js:854-860`) and `did-navigate` both auto-pause when you leave `/map`. So hunting does stop, but **silently**, with no alarm, which is the whole point of that handler.

### H-4. Plaintext credentials in source and config
**Files:** `desktop-client/main.js:28`, `desktop-client/config.json` (`dummyAccount.username`, `dummyAccount.password`), `app.js:1886-1890`.
- `loadConfig()`'s fallback object hard-codes a real-looking username and password (value redacted here). Anyone who receives the source gets the credentials.
- `config.json` stores the password in plaintext, and `fillLoginBtn` writes any newly typed password to disk.
- Not logged directly, but `game-preload.js:177` does `console.log('[PokePreload] Synced config:', JSON.stringify(config))`. `app.js:1156-1158` then forwards every guest console message to the host console. `update-config` sends `config.settings` only, not `dummyAccount`, so currently no password leaks there. This is fragile.
- Recommendation: remove the hard-coded fallback credentials. Store secrets with `safeStorage` or the OS keychain, or at least keep them out of the shipped folder.

### H-5. Test suite credibility is low
Metrics from the 19 root tests:

| Pattern | Evidence |
|---|---|
| Source-string assertions (`appJs.includes('...exact code...')`) | 158 `.includes(` calls; heavy in toggle (22), zoom (26), presets (23), pause_accuracy (16), outside_map (14), level_filter (13) |
| Re-implemented logic tested against itself | test_one_step_and_diagonal, test_two_step_roaming, test_walk_and_broaden, test_stuck_recovery, test_smart_pokeball, test_pokeball_selection, test_catch_return, test_active_hunting_guard (section 4), test_pause_accuracy (section 4) |
| Executes real production code | Only `targets.js` (required by 3 tests) and target arrays `eval`'d out of `pokefinder.user.js` (3 tests) |

Specific problems:
- **No test executes `app.js` or `game-preload.js` logic.** The state machine, IPC flow, timers, collision handling, catch sequence, and config save have zero real coverage. That is why C-1, H-1, H-2, H-3, and M-1 all pass with 19/19 green.
- Some tests assert on exact whitespace and newlines (e.g. `"if (isSearching || !hasCatchUI) {\n        return;\n    }"`). A reformat breaks them; a behavioral bug does not.
- Some names now contradict production. `test_one_step_and_diagonal` says "Wander mode changes direction every 1 step" and `test_two_step_roaming` says "turns every 2 steps", but production wander now randomizes 1..maxSteps (`app.js:~957-963`). They pass because they test their own copies.
- **[CORRECTION]** The `test_pause_accuracy.js` I wrote last session is in the same category. Its `simulateScan` is a re-implementation, and it would not catch C-1.
- The 7-bit ASCII check is duplicated in about 9 files. Meanwhile 8 test files contain non-ASCII characters themselves (check marks and crosses in console output). That contradicts the project's own ASCII rule if the rule applies to tests.
- There is no test runner, no `npm test` script, no CI, and no git repository (`.git` absent). Regressions can't be bisected or reverted.
- `desktop-client/test_client.js` is not run by the root loop and asserts on `config.dummyAccount`.

**Test-suite credibility: 3/10.** It's useful as a smoke check that strings and files exist, not as evidence that the behavior is correct.

---

## 3. MEDIUM

### M-1. "Stuck in maze -> reload" can never trigger
**Files:** `app.js:1013-1017` (750 ms fallback), `app.js:1155-1164`, `app.js:1117-1143`.
- Every step starts a 750 ms fallback that calls `handleMoveSuccess`, which sets `consecutiveBlockedCount = 0`.
- The preload's collision verdict arrives at 1400 ms, always **after** that reset. So a blocked step goes 0 -> 1, and the next step's fallback resets it to 0.
- `consecutiveBlockedCount >= 6` (`app.js:1136`) is unreachable. The fallback also clears `isStepPending` at 750 ms, before the real verdict arrives.
- Secondary inconsistency: `handleMoveBlocked` sets `wanderStepsLeft = stepsPerDirection - 1` (always the maximum). The normal wander path randomizes 1..max.

### M-2. Resume with a target still on screen
**Files:** `game-preload.js:197-202`, `app.js:836-848`.
- Pausing resets `lastFoundTarget = ''`. If you press Space to resume while the found Pokemon is still displayed, the next scan re-detects it and pauses again within 300 ms (with another alarm and notification).
- With C-1 present, `toggleHunting` sets `isEncounterOnScreen = false`, but the next `encounter-status` sets it back to true before or around the first step. The behavior depends on timing.
- In practice you must walk off the tile manually before resuming. This is undocumented.

### M-3. Target-text false positives inside the encounter scan
**File:** `game-preload.js:~263-330, 395-460`.
- **`ultra` in `specialForms`:** the regex `\bultra[- ]+(\w+)` matches **"Ultra Ball"** in the catch form's pokeball radio labels. With `findMegasAndGigantamax` on, any encounter that shows the ball selector can report `ULTRA ball (Special Form)`. `mega` and `primal` have similar risks with item text.
- **`closest('form, div, table, td, section')`** around every catch button can return a very large container (layout wrapper div). Its whole `innerText`, including sidebar, event banners ("Must be a Flying Type Pokemon"), and other players' names, is added to the text that gets matched.
- **Short-name substring matching** (`indexOf`): mega names like `aron`, `abra`, `onix`, `numel`, and `ralts` match inside longer words or usernames when large regions are captured.
- **Level fallback** (`extractWildLevel(document.body.innerText)`) can read *your own* Pokemon's level elsewhere on the page when the encounter box has none. That defeats the level gate.
- **Variant regex** `\bdark[- ]+(\w+)` matches phrases like "Dark Type" in captured text.

### M-4. `hasCatchUI` selector is too broad
**File:** `game-preload.js:226-232`.
- `a[href*="catch" i]` and `[class*="catch" i]`-style selectors match any visible link or element containing "catch" (menus, event pages, help links).
- If such an element is permanently on the map page, `hasCatchUI` is always true. Together with C-1, the bot would never take a step. Without C-1, scanning always runs on large text regions (see M-3).

### M-5. Performance
**Files:** `game-preload.js:756, 854-862`.
- `scanForTargets()` runs on **every** body mutation (unthrottled) **and** every 300 ms.
- Each run does several `querySelectorAll` calls, `getComputedStyle`, and `innerText` reads. Those force layout and rebuild large strings, then run 136 + 107 substring searches and regex constructions (`new RegExp` inside loops at `game-preload.js:388, 426`).
- On a busy map this means hundreds of scans per second of main-thread work, plus IPC spam (`map-status`, `encounter-status` every scan).
- Recommendation: throttle to one scan per animation frame or 250 ms, observe only the dexy container, and precompile the regexes.

### M-6. Global F2 shortcut
**File:** `main.js:195-199`.
- `globalShortcut.register('F2')` captures F2 **system-wide** while the client runs (e.g. rename in Explorer or Excel stops working). The registration result isn't checked.
- Space is already handled in-window (host `app.js:1419-1431`, guest `game-preload.js:825-835`).
- Host and guest Space listeners don't double-fire: key events in a focused webview don't reach the host window. **No double-toggle bug found.**

### M-7. Window and permission surface
**Files:** `app.html:1333` (`allowpopups`), `main.js` (no `setWindowOpenHandler`, no `setPermissionRequestHandler`).
- Third-party ad scripts inside the webview can open new Electron windows freely.
- Site permission requests (notifications, media, geolocation) are granted or denied by Electron defaults without any policy.
- Host window: `nodeIntegration: true, contextIsolation: false` (`main.js:84-87`). This is acceptable **only** because it loads a local file and never navigates. Keep it that way.

### M-8. Build and launch portability
- `desktop-client/package.json` has **no `electron` dependency** and no lockfile, so `npm start` fails ("Cannot find module 'electron'"), as seen earlier today.
- `launch.bat`, `launch.ps1`, and the root `launch*.bat` files hard-code `C:\Users\User\AppData\Roaming\npm\node_modules\electron\dist\electron.exe`.
- A user/system-level `ELECTRON_RUN_AS_NODE=1` exists in your environment. It makes `electron.exe` behave as plain Node, so the launch scripts must strip it. Anything else launching Electron on this machine will break too.
- `launch.bat` runs `taskkill /f /im electron.exe`, which kills **every** Electron app (VS Code-based tools, Discord, etc.), not just this client.

### M-9. Userscript (`pokefinder.user.js`) lags the desktop client
- `pokefinder.user.js:594-629`: collision uses `posChanged || textChanged`. On empty grass the dexy text stays the same ("couldn't find anything"), so the **identical-text false collision** bug fixed in the desktop client is still here. False collisions trigger 8 s direction blocks and, after 6, a `location.reload()`.
- Walk loop is a fixed `setInterval(..., 1500)` (`pokefinder.user.js:577-640`) with no jitter. This differs from the desktop client's design intent.
- `location.reload()` is called in 3 places (`590`, `626`, `1040`), including after 80 battle retries.
- The gating change (scan only when `hasCatchUI`) is in place, and the target lists match the desktop client (see L-5).

---

## 4. LOW / INFO

- **L-1** `app.js:1273-1276`: `new Notification(..., { icon: 'assets/icon.png' })`, but `desktop-client/assets/` does not exist.
- **L-2** `app.js:747`: a new `AudioContext` is created for every beep. Chromium limits concurrent contexts, and they are never `close()`d. Long sessions with many alerts can eventually fail to play sound.
- **L-3** Two writers to `config.json`: the renderer (`app.js:37`, synchronous `fs.writeFileSync`) and main (`main.js:150-152` in `apply-proxy`). Currently sequential in practice, but there's no single owner and writes aren't atomic (a crash mid-write corrupts config; `loadConfig` then silently falls back to hard-coded defaults, including H-4's credentials).
- **L-4** The user-agent string is defined in two places: the `app.html:1332` attribute (hard-coded `142.0.7444.52`) and `main.js:13-16` (derived from `process.versions.chrome`). If Electron is upgraded they'll disagree.
- **L-5** The target lists are copied three times: `targets.js`, an inline copy in `game-preload.js:27-137`, and `pokefinder.user.js`. **Verified in sync today** (136 legendaries, 107 mega-line species in all three). They'll drift on the next edit; the preload can't `require` `targets.js` only because of the sandbox choice. `"Ho-Oh"`/`"Ho-oh"` are duplicates (harmless).
- **L-6** `game-preload.js:8, 11`: a top-level `return` outside a function. It works only because Electron wraps preloads in a CommonJS function. It would break under any other loader or linter.
- **L-7** `game-preload.js:761-764`: `keyMap`, `codeMap`, `keyCode`, and `keyName` are now unused (left over from removing the synthetic KeyboardEvent).
- **L-8** `XMLHttpRequest.prototype.open` stores `this._delugeUrl`, which is never read.
- **L-9** `app.js`: 104 top-level mutable/const bindings and 43 top-level functions in one ~1940-line file. No modules. UI, state machine, config, network, and zoom are all mixed together. Hard to test (root cause of H-5).
- **L-10** `innerHTML` is used only with constant HTML entities (`app.js:218-245, 427, 433, 813, 819`). **No XSS path from webview data found.** Target names reach the UI via `textContent`/template strings in `updateStatus`.
- **L-11** Scratch and debug files ship inside `desktop-client/`: `scratch_test_input.js`, `scratch_test_pokemart.js`, `scratch_test_preload.js`, `test_preload_check.js` (writes `test_output.log`), and `test_client.js`. Root also has `verify_client_safety.js`, `launch.bat`, and `launch_desktop_client.bat`, which overlap with the client's launchers.
- **L-12** No README, no version control, no changelog. Config keys such as `profile` and `autoPauseOnTarget` have no documented meaning. `autoPauseOnTarget` is not obviously consulted; pausing on a target is unconditional in `app.js:1243-1262`.
- **INFO** No `alert()`/`confirm()` misuse found beyond blocking dialogs during the unlock and wipe flows. The `alert` in the unlock handler would block the renderer, but that path is unreachable anyway (H-3).

---

## 5. Things Verified as Working Correctly

- Hunting only scans and beeps while `isRunning` (host `app.js:1245`) / `isHuntingActive` (preload `game-preload.js:207`).
- Leaving `/map` auto-pauses via three independent paths (`did-navigate*` events, a pre-step URL check, and the preload's 300 ms poller).
- Guest input focus guard (`focusin`/`pointerdown`/`focusout`) stops steps while you type in game inputs.
- Space hotkey ignores inputs, textareas, selects, contentEditable, and open modals; no double toggle.
- Max-steps-per-turn randomization (`app.js:~957-963`) is correct for wander mode.
- Toggle button labels and colors (`Hunting` green / `Paused` amber) match the spec.
- Target databases are consistent across all three copies (as of today).
- `isStepPending` cannot get stuck true: it is cleared by the 750 ms fallback, by move results, and on toggle.
- Smart pokeball selection skips `(0)`, disabled, and struck-through balls, and keeps a valid user choice.
- All audited source files are 7-bit ASCII (test files excepted, see H-5).

---

## 6. Risk Note (non-technical)

This project automates gameplay on a third-party site. That is very likely against DelugeRPG's Terms of Service no matter how the client behaves. One ban-free day is not evidence of safety; detection and enforcement may be delayed or done in batches. Keep that risk in mind for any account you care about. This audit evaluates code correctness and quality; it does not try to improve evasion.

---

## 7. Suggested Fix Order (nothing applied)

1. **C-1**: Stop treating non-target encounters as a halt condition; make the walk timer always reschedule unless paused.
2. **H-3**: Move the `/unlock` check above the map-page guard.
3. **H-4**: Remove the hard-coded credentials from `main.js`; move secrets out of plaintext.
4. **H-2 / H-1 / M-1**: Redesign move confirmation. Watch only the trainer element or the dexy node, delete the inert XHR/fetch hooks, and remove or lengthen the 750 ms fallback so verdicts aren't overwritten.
5. **M-3 / M-4 / M-5**: Narrow encounter-text extraction to the dexy container, drop `ultra` from forms (or exclude "ball"), use word-boundary matching, and throttle scans.
6. **H-5**: Extract the state machine and scanner into pure modules that tests can `require`. Replace string-match tests with behavioral ones, add `npm test`, and initialize git.
7. **M-8**: Add `electron` as a devDependency with a lockfile, and use relative launcher paths. Don't `taskkill` all Electron processes.

