# DelugeRPG Stealth Client v1.3.1 (Stable Release)

## Highlights & Improvements

### 1. Manual Keyboard Navigation Yielding & Focus Trap Elimination
- **Non-Text Input Safety**: Hardened `isGuestInputField` to prevent non-text controls (checkboxes, radio buttons, buttons, selects) from trapping physical keyboard focus. Text inputs still safely forward focus while game navigation retains keyboard control.
- **Cadence Yielding (`manual-step` IPC)**: Physical keyboard inputs (Arrow keys, WASD) and screen D-pad clicks smoothly notify the host controller, automatically yielding automated hunting cadence without move conflicts, desynchronization, or erratic double-stepping.
- **Target Encounter Movement Guard**: Physical movement inputs are strictly blocked only when an active target encounter is present on screen, preventing accidental walk-aways.

### 2. Robust Writable Data Storage (`app.asar` Safety)
- **Packaged Path Resolution**: Introduced `getWritableDataPath` and `readDataFile` in `app.js` to eliminate `ENOENT` read/write errors when the client is packaged inside read-only Electron `app.asar` bundles.
- **UserData Persistence**: Game databases and catch telemetry (`gym_leaders.json`, `user_collection.json`, `daily_catch_log.json`, `config.json`) safely resolve to the persistent user profile directory with seamless fallback to bundled read-only assets.

### 3. Special Variant Hunting Hardening
- **Refined Tier 4 Matching**: Corrected logic in target encounter evaluation so that wild special variants (Shiny, Metallic, Chrome, Shadow, Mirage, Retro, Negative, Ghostly, Dark) are never inadvertently skipped during broad hunting sweeps.
- **Species-Only Preset Isolation**: Species restriction guards only suppress generic variants if the user has explicitly selected a strict species-only hunting preset.

### 4. Hardened `/team` Network Endpoint Filtering
- **Third-Party Beacon Exclusion**: Implemented `isDelugeTeamRequest` inside the XMLHttpRequest and Fetch spy hooks, strictly isolating valid DelugeRPG `/team/save` and `/team/edit` requests while ignoring third-party telemetry and ad beacons (Google DoubleClick, Rubicon, OptAd360).
- **Silent & Clean Operation**: Prevents benign third-party ad network POST requests from triggering spurious team-save notifications or log noise.

### 5. Battle Opponent Discovery Deduplication
- **Deduplicated Discovery**: Optimized live battle opponent recognition to avoid duplicate IPC emissions and redundant log entries during trainer battles and Elite Four runs.

### 6. GUI & Workspace Architectural Compliance
- **100% 7-Bit Clean ASCII Integrity**: Character codes strictly <= 127 across all files, JSON databases, tests, and documentation.
- **Zero Glowing Shadows**: Flat, beveled minimalist styling with `box-shadow: none !important` across all UI badges, buttons, cards, and modal dialogs.
- **Docked 1/4 Side Panels**: Tool panels (Team Builder, Ads Inspector, Today's Auto-Catch) remain docked at 1/4 (25%) width, preserving 3/4 (75%) for active game `<webview>`.

### 7. Full Verification Gate Passed
- **65/65 Tests Passed**: 100% pass rate across all 9 verification pipelines in `test_deep_verification.js`.
- **Zero-Logout Safety**: Session cookies, login tokens, and proxy routes preserved across reloads.

---

### Included Release Binaries
- **Windows Setup Installer**: `DelugeRPG Stealth Client Setup 1.3.1.exe` (NSIS automated installer with desktop shortcut)
- **Standalone Portable**: `DelugeRPG Stealth Client 1.3.1.exe` (Single standalone executable, no installation needed)

