# DelugeRPG Stealth Client v1.2.0 (Stable Release)

## Highlights & Improvements

### 1. Gym Team Builder & Roster Recommendation Engine
- **Full Opponent Database**: Integrated complete roster coverage for 318 trainers across all 9 regions (Kanto through Paldea) including Gym Leaders, Elite 4, Champions, Strong Trainers, Ultimate Trainers, and VIPs.
- **Smart Counter Recommendation Engine**: Mathematical combat calculations based on official Gen 9 type charts, dual-type resistances, STAB coverage, and user collection movesets.
- **Dynamic Collection Scraper**: Automated multi-page extraction of user Pokemon, forms, levels, and custom move sets without manual input.
- **One-Click Team Sync**: Human-paced automated team application on `/team/change` with real-time feedback and state verification.

### 2. Human-Like Mouse Telemetry & Anti-Bot Hardening
- **Geometry-Aware Sub-Pixel Targeting**: Replaced programmatic `.click()` calls with realistic random sub-pixel coordinate calculation inside element bounding boxes (`0.25 <= x, y <= 0.75`).
- **Full Pointer Lifecycle Events**: Dispatches authentic browser event cascades (`pointerover`, `pointerenter`, `pointermove`, `mouseover`, `mousemove`, `pointerdown`, `mousedown`, `focus`, `click`, `mouseup`, `pointerup`).
- **Physical Click Hold Duration**: Simulates realistic mechanical mouse button hold times (65ms - 125ms) before button release.
- **Micro-Jitter & Trajectory Simulation**: Added multi-step interpolated mouse trajectories (`simulateMouseMovement`) between Master Ball selection and Throw button to eliminate bot detection footprints.
- **Gaussian Reaction Pacing**: Enforces humanized reaction delays strictly respecting the >= 1700ms safety floor.

### 3. Seamless Transition Flows & Instant Focus
- **Anywhere to Team Change & Save**: Direct navigation, instant DOM element readiness detection, elimination of jarring `window.location.reload()` calls, and live IPC step updates.
- **Anywhere to Battle Now**: Unified URL resolution (`resolveTargetBattleUrl`), immediate `<webview>` focus (`delugeView.focus()`), and instant live battle URL detection.
- **Mutual Exclusion UI Locks**: Prevents concurrent race conditions by locking opposing action buttons during active team saves or battle entries.

### 4. Master Ball Auto-Catch Hardening
- **Humanized Trajectory & Action Pacing**: Natural mouse movement and pacing between target detection, ball dropdown selection, and throw execution.
- **Configurable Pacing Floor**: Strict enforcement of human reaction delays (1000ms - 10000ms delay window with non-uniform randomness).
- **Option A Zero-Stock Safeguard**: Safe automatic redirection back to map when Master Ball stock reaches zero, preventing unintended regular ball throws.

### 5. UI Cleanliness & Desktop Experience
- **100% 7-Bit Clean ASCII Integrity**: Character codes strictly <= 127 across all codebase, markup, styles, and databases.
- **Zero-Glow Minimalist Design**: Clean flat and beveled aesthetics (`box-shadow: none !important`), eliminating clutter, glowing borders, and visual distractions.
- **Docked 1/4 Side Panel**: Fully docked side drawer layout (25% width), leaving 75% unblocked for the live game `<webview>` without modal backdrops.

### 6. Deep Verification Gate Passed
- **52/52 Tests Passed**: 100% pass rate across all 9 verification pipelines in `test_deep_verification.js`.
- **Zero-Logout Safety**: Session authentication cookies and Cloudflare tokens preserved.

---

### Included Release Binaries
- **Windows Setup Installer**: `DelugeRPG Stealth Client Setup 1.2.0.exe` (NSIS automated installer with desktop shortcut)
- **Standalone Portable**: `DelugeRPG Stealth Client 1.2.0.exe` (Single standalone executable, no installation needed)

