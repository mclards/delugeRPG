# DelugeRPG Workspace Guidelines & Engineering Rules

## 1. 100% 7-Bit Clean ASCII Integrity
* All code, markup, JSON databases, and docs must strictly use 7-bit ASCII (char codes <= 127).
* Never introduce non-ASCII punctuation, smart quotes, em-dashes, or raw Unicode characters.
* Use numeric HTML entities (`&#8635;`, `&#9876;`, `&#128737;`, `&#10003;`) for DOM symbols/icons.

## 2. Zero-Glow & Zero Unnecessary Text Information Lines (Clean Functional UI)
* **Zero Glowing Shadows:** Never add glowing box-shadows (`box-shadow: 0 0 15px rgba(...)`). Maintain flat styling with `box-shadow: none !important`.
* **STRICT ZERO UNNECESSARY TEXT INFORMATION LINES RULE:**
  * **Never** add explanatory paragraphs, tutorial instructions, helper descriptions, or filler text lines inside modals, docked panels, cards, or empty states.
  * **Never** stack redundant text lines on Pokemon lineup cards (`renderTeamLineup`): show only Pokemon name + level, move name, and a single target/role badge (`vs ...` or `LEAD SWEEPER`) -- never stack `cleanRole` or `roleDesc` subtitles below the badge.
  * **Never** repeat labels or counts already visible on buttons or inputs.
  * Keep all UI controls purely functional while preserving all standard CSS structural borders (`border: 1px solid #1a283e`, `border-bottom`, `border-top`, badge borders).

## 3. Docked Panels & Explicit Manual User Actions
* Gameplay must never be blocked by full-screen modal overlays or backdrops during gameplay.
* Tool panels (`#teamBuilderModal`, `#adsInspectorModal`, `#catchLogModal`, `#aiAssistantModal`, `#safetySettingsModal`) must dock in a side panel taking 1/4 (`flex: 1`, 25%) of the window, leaving 3/4 (`flex: 3`, 75%) for the `<webview>`.
* **No Unsolicited Auto-Scans:** Never auto-populate or auto-build Live Battle / Stalked Profile targets in the background when opening a modal or page. Scanning/building must only occur on explicit user click (**Check Active Screen**, **Scout**, or **Build**).

## 4. Token Optimization & Context Conservation Protocol
* **Zero Blind Full-File Reads:** Never read large files (`app.js` 8.2kL, `game-preload.js` 6.3kL, `app.html` 2.9kL, `team_engine.js` 2.1kL) in 800-line sweeps.
* **Locate Before Viewing:** Run `node d:\PROJECTS_IO\delugeRPG\.agents\skills\delugerpg-client-dev\scripts\locate.js <query> [file]` to get exact `[StartLine-EndLine]` bounds, then call `view_file` on tight windows (`<= 120` lines).
* **Never View Large JSON Databases:** Query `gym_leaders.json`, `user_collection.json`, and `pokemon_moves_db.json` via compact `node -e` one-liners instead of `view_file`.
* **Concise Responses & Single-Pass Edits:** Batch related edits cleanly and keep user-facing summaries brief and high-signal.

## 5. Verification Gate
* Always run the deep verification suite before completing any turn:
  ```powershell
  cd d:\PROJECTS_IO\delugeRPG\desktop-client
  node test_deep_verification.js
  ```
* All 115 tests across all 9 verification pipelines (including sub-suites) must pass with zero failures.
