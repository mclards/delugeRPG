# DelugeRPG Workspace Guidelines & Engineering Rules

## 1. 100% 7-Bit Clean ASCII Integrity
* All code, markup, JSON databases, and documentation in this repository must strictly use 7-bit ASCII characters (character codes <= 127).
* Never introduce non-ASCII punctuation, smart quotes, em-dashes, or raw Unicode characters.
* Use numeric HTML entities (e.g. `&#8635;`, `&#9876;`, `&#128737;`, `&#10003;`) for symbols and icons in DOM.

## 2. Zero-Glow & Zero Unnecessary Text Information Lines (Clean Functional UI)
* **Zero Glowing Shadows:** Never add glowing box-shadows (e.g. `box-shadow: 0 0 15px rgba(...)` or button/badge glows). Always maintain flat styling with `box-shadow: none !important`.
* **STRICT ZERO UNNECESSARY TEXT INFORMATION LINES RULE:**
  * **Never** add explanatory paragraphs, tutorial instructions, helper descriptions, or filler text lines inside modals, docked panels, cards, or empty states (e.g., never add `"Open any player's profile..."`, `"Click Build Best Team to..."`, `"Configure your saved credentials..."`, `"Cosmetic zero-shift hiding active..."`).
  * **Never** stack redundant text information lines on Pokemon lineup cards (`renderTeamLineup`): show only the Pokemon name + level, move name, and a single target/role badge (`vs ...` or `LEAD SWEEPER`) -- never stack `cleanRole` (`Super-Effective 2.0x`) or `roleDesc` subtitles below the badge.
  * **Never** repeat labels or counts that are already visible on buttons or inputs (e.g., do not add a separate `"Candidate Pool: 96 in pool"` or `"rvshow (6 Pokemon)"` text line when the button or input already shows it).
  * Keep all UI controls purely functional and self-explanatory, while preserving all standard CSS structural borders (`border: 1px solid #1a283e`, `border-bottom`, `border-top`, badge borders). Never remove CSS borders when removing unnecessary text lines.

## 3. Docked Panels & Explicit Manual User Actions
* DelugeRPG gameplay must never be blocked by full-screen modal overlays or backdrops during gameplay.
* Tool panels (such as the Gym Team Builder) must remain docked in a side panel taking 1/4 (`flex: 1`, 25%) of the window, leaving 3/4 (`flex: 3`, 75%) for the live game `<webview>`.
* **No Unsolicited Auto-Scans:** Never auto-populate or auto-build Live Battle / Stalked Profile targets in the background when the user opens a modal or page. Scanning and building must only occur when the user explicitly clicks **Check Active Screen**, **Scout**, or **Build**.

## 4. Verification Gate
* Always run the deep verification suite before completing any turn:
  ```powershell
  cd d:\PROJECTS_IO\delugeRPG\desktop-client
  node test_deep_verification.js
  ```
* All 50 tests across all 9 pipelines must pass with zero failures.

