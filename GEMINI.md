# DelugeRPG Workspace Guidelines & Engineering Rules

## 1. 100% 7-Bit Clean ASCII Integrity
* All code, markup, JSON databases, and documentation in this repository must strictly use 7-bit ASCII characters (character codes <= 127).
* Never introduce non-ASCII punctuation, smart quotes, em-dashes, or raw Unicode characters.
* Use numeric HTML entities (e.g. `&#8635;`, `&#9876;`, `&#128737;`, `&#10003;`) for symbols and icons in DOM.

## 2. Zero-Glow & Clean Minimalist UI Design
* Zero Glowing Shadows: Never add glowing box-shadows (e.g. `box-shadow: 0 0 15px rgba(...)` or button/badge glows). Always maintain flat, beveled styling with `box-shadow: none !important`.
* No Unnecessary Lines & Clutter: Eliminate redundant nested borders, double dividers, dashed outlines, and noisy wireframe borders around badges and container boxes. Use subtle background contrast and clean spacing rather than heavy or double border lines.

## 3. Docked Panels vs. Modal Backdrops
* DelugeRPG gameplay must never be blocked by full-screen modal overlays or backdrops during gameplay.
* Tool panels (such as the Gym Team Builder) must remain docked in a side panel taking 1/4 (`flex: 1`, 25%) of the window, leaving 3/4 (`flex: 3`, 75%) for the live game `<webview>`.

## 4. Verification Gate
* Always run the deep verification suite before completing any turn:
  ```powershell
  cd d:\PROJECTS_IO\delugeRPG\desktop-client
  node test_deep_verification.js
  ```
* All 50 tests across all 9 pipelines must pass with zero failures.

