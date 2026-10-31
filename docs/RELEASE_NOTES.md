# DelugeRPG Stealth Client - Release History & Changelog

---

## DelugeRPG Stealth Client v1.4.6 (Stable Release)

### Key Highlights & Improvements:
- **Universal Attack Moves Intelligence Engine:** Expanded the Evolution & Moves panel into a universal intelligence suite supporting all box Pokemon (`Box Moves (165)`) and flawed attacks filtering (`Flawed (47)`).
- **On-Demand Species Strategy Lookup:** Real-time query analyzer in the search toolbar allows auditing canonical movesets for any Pokemon (owned or unowned) cross-referenced against 381 species in `gym_leaders.json`.
- **In-Game Move Change Automation:** Added direct `[Change]` actions and `/pokemon/change_attack/<id>` IPC bridge with one-click automated 4-move checkbox pre-filling.
- **Zero DelugeRPG Page Overlays:** Eliminated all full-screen modal overlays and backdrops blocking gameplay; enforced docked 1/4 side-panel split view across all tool panels.
- **Variant-Aware 100% Uniqueness Engine:** Strict ownership validation across all 10 DelugeRPG variants (Normal, Shiny, Metallic, Ghostly, Dark, Shadow, Mirage, Retro, Chrome, Negative) without cross-variant false positives.
- **Evolution 4-Choice Deduplication:** Identifies and deduplicates shared current vs evolution attacks, guiding safe single-checkbox selection.
- **Client Bump & Deep Verification:** Bumped to v1.4.6 and verified 115/115 tests passing across all 9 pipelines with 100% 7-bit clean ASCII integrity.

---

## DelugeRPG Stealth Client v1.4.5 (Stable Release)

### Key Highlights & Improvements:
- **Webview Reload Refresh Hardening:** Bypasses `will-navigate` interception guards on manual reload clicks, allowing immediate webview refresh.
- **Auto-Catch State Reset:** Automatically resets active `autoCatchInProgress` lock flags on reload to clear any paused or pending states.
- **Abortive Stop Removal:** Eliminated abortive `stop()` call prior to `reloadIgnoringCache()`, ensuring uninterrupted page loads.
- **Client Bump & Synchronization:** Synchronized package definitions, client telemetry, and test suites to v1.4.5.

---

## DelugeRPG Stealth Client v1.4.4 (Stable Release)

### Key Highlights & Improvements:
- **True STAB Coverage Prioritization:** Prioritizes verified STAB super-effective moves over non-STAB inverse moves (e.g., Chien-pao ranks #1 over Negative Deoxys).
- **Speed Sweeper Carry Hardening:** Refined "Carry at Risk" badge evaluation for pure speed sweepers exhibiting 100% OHKO dominance.
- **Defense Profile Accuracy:** Differentiates STAB quad weaknesses from secondary off-type coverage to prevent false candidate disqualifications.

---

## DelugeRPG Stealth Client v1.4.3 (Stable Release)

### Key Highlights & Improvements:
- **Non-STAB Coverage Disqualification Removal:** Removed overly restrictive candidate disqualifications for offensive speed sweepers lacking defensive resistances.
- **Speed Sweeper Ranking:** Enhanced team engine scoring algorithms to boost fast offensive carriers capable of pre-empting benched threats.
- **Multi-Opponent Attrition Balancing:** Fine-tuned fatigue penalties so top-tier sweepers are evaluated across entire 6-Pokemon trainer rosters.

---

## DelugeRPG Stealth Client v1.4.2 (Stable Release)

### Key Highlights & Improvements:
- **Real-Time Opponent Attack Move Harvester:** Dynamically captures and records newly observed opponent attacks directly during live battles.
- **Persistent Move Memory:** Automatically persists discovered opponent attack profiles to `gym_leaders.json` across client restarts.
- **Coverage Trap Elimination:** Fixed historical move data blindspots (e.g., registering Wake-up Slap on Acerola's Froslass to eliminate 4x Fighting vulnerability traps).
- **Hardened Carry Anchor Selection:** Strongly penalizes recoil moves, fixed-damage moves, and low accuracy moves in automated recommendation scoring.

---

## DelugeRPG Stealth Client v1.4.1 (Stable Release)

### Key Highlights & Improvements:
- **Multi-Version Favorite Opponent Preservation:** Retains custom favorited trainers across multiple difficulty tiers and distinct regional versions.
- **Explicit Tier Badges:** Clean visual badges differentiating Standard, Strong, Ultimate, and VIP trainer tiers.
- **Real-Time Dropdown Synchronization:** Instant synchronization between active navigation controls, category filters, and selected trainer metadata.

---

## DelugeRPG Stealth Client v1.4.0 (Stable Release)

### Key Highlights & Improvements:
- **Authoritative Pokeball Duplicate Detection:** Comprehensive cross-referencing against user collection and Pokedex state to prevent duplicate captures.
- **Strict Variant Uniqueness:** Special variants (Shiny, Metallic, Chrome, Shadow, Mirage, Retro, Negative, Ghostly, Dark) are evaluated as separate unique targets.
- **Type Badge Isolation:** Clean CSS layout ensuring type indicator badges remain distinct without visual overlap.

---

## DelugeRPG Stealth Client v1.3.1 (Stable Release)

### Key Highlights & Improvements:
- **Manual Keyboard Navigation Yielding:** Hardened `isGuestInputField` to prevent non-text controls from trapping physical keyboard focus. Text inputs safely forward focus while game navigation retains keyboard control.
- **Cadence Yielding (`manual-step` IPC):** Physical keyboard inputs (Arrow keys, WASD) and screen D-pad clicks smoothly notify the host controller, automatically yielding automated hunting cadence without move conflicts.
- **Robust Writable Data Storage (`app.asar` Safety):** Introduced `getWritableDataPath` and `readDataFile` in `app.js` to ensure reliable file access when packaged in read-only Electron `app.asar` bundles.
- **Special Variant Hunting Hardening:** Refined target evaluation so wild special variants are never skipped during broad hunting sweeps.
- **Hardened `/team` Network Endpoint Filtering:** Strict isolation of valid DelugeRPG `/team/save` and `/team/edit` requests while ignoring third-party telemetry and ad beacons.
- **Battle Opponent Discovery Deduplication:** Optimized live battle opponent recognition to avoid duplicate IPC emissions and redundant log entries.

---

## DelugeRPG Stealth Client v1.3.0 (Stable Release)

### Key Highlights & Improvements:
- **Entire-Day Auto-Catch Telemetry & Persistent Catch Log:** All caught Pokemon are persistently recorded across the calendar day in `daily_catch_log.json`, surviving client restarts.
- **Calendar Date Rollover:** Automatic midnight date detection cleanly rolls over daily catch records while preserving live Poke Ball stock counts.
- **Detailed Catch Feed:** Scrollable feed rendering official Pokemon sprites, detected variants, encounter levels, used Poke Ball types, and catch timestamps.
- **Live Inventory Strip:** Real-time display of all bag Poke Balls (Pokeball, Greatball, Ultraball, Masterball).
- **Docked Ads Inspector Panel:** Real-time telemetry inspector displaying live ad collapse metrics without interfering with gameplay.

---

## DelugeRPG Stealth Client v1.2.0 (Stable Release)

### Key Highlights & Improvements:
- **Gym Team Builder & Roster Recommendation Engine:** Complete roster coverage for 318 trainers across all 9 regions (Kanto through Paldea) including Gym Leaders, Elite 4, Champions, Strong Trainers, Ultimate Trainers, and VIPs.
- **Smart Counter Recommendation Engine:** Mathematical combat calculations based on official Gen 9 type charts, dual-type resistances, STAB coverage, and user collection movesets.
- **Dynamic Collection Scraper:** Automated multi-page extraction of user Pokemon, forms, levels, and custom move sets.
- **Human-Like Mouse Telemetry & Anti-Bot Hardening:** Geometry-aware sub-pixel targeting, authentic browser event cascades (`pointerover`, `pointerenter`, `pointermove`, `mousedown`, `click`, `mouseup`), realistic mechanical button hold times (65ms - 125ms), and interpolated mouse trajectories.
- **Docked 1/4 Side Panel:** Fully docked side drawer layout (25% width), leaving 75% unblocked for the live game `<webview>` without modal backdrops.

---

## DelugeRPG Stealth Client v1.1.7 (Stable Release)

### Key Highlights & Improvements:
- **Zero-Stock Master Ball Safeguard:** Safely halts catch sequences if Master Ball stock is 0 and redirects back to previous map URL without throwing unintended balls.
- **Live Inventory Stock Extraction & Logging:** Dynamic stock parser extracting Master Ball counts directly from DelugeRPG's battle DOM.
- **Toolbar Status Chip Streamlining:** Widened status chip to prevent text clipping and condensed notification strings across all states.
- **Advanced Google Vignette Suppression:** Prevents full-page interstitial triggers on page transitions and autonomously dismisses overlay dialogs.
- **PokeFinder Userscript Alignment (v4.6):** Synchronized `pokefinder.user.js` with matching zero-stock redirection, map navigation, and ad suppression.

---

## DelugeRPG Stealth Client v1.1.6 (Stable Release)

### Key Highlights & Improvements:
- **Cosmetic Ad Hiding:** Visually collapses display ad banners while letting scripts and trackers run completely unblocked.
- **Real-Time Map Presence & Auto-Start Recovery:** Continuous map synchronization via `map-presence` heartbeats to re-activate auto-start once battles conclude.
- **Graceful Auto-Resume After Manual Captures:** Returning to the map clears pause states and smoothly resumes hunting.
- **In-App Version Indicator:** Dedicated version chip at the bottom of the navigation dropdown menu.

---

## DelugeRPG Stealth Client v1.1.0 (Stable Release)

### Key Highlights & Improvements:
- **Zero-Residue Removal of Auto-Catch:** Completely removed automated Pokeball throwing logic and related UI toggles with zero residue.
- **Manual Catch Preservation:** Retains 100% of movement pacing, obstacle evasion, sound chimes, desktop notifications, and automatic hunting halts for secure manual catching.
- **Pokedex Duplication Avoidance Engine:** Automatically skips encounters already registered in Pokedex (red Pokeball marker).
- **Auto-Start Hunting on Map Load:** Automatically starts walking whenever the DelugeRPG map (`/map`) loads or refreshes.
- **Streamlined Navigation Menu & UI Re-Layout:** Reorganized into clear sections: Targeting & Detection, Walking Movement Mode, and Tools & Settings.
- **Installer Settings & Log Persistence Hardening:** Packaged installer builds automatically persist configs and logs to `%APPDATA%\delugerpg-desktop-client\`.

---

## DelugeRPG Stealth Client v1.0.0 (Stable Release)

### Key Highlights & Improvements:
- **Genuine Chrome Engine:** Chromium 142 User-Agent and client-hints spoofing with automation features cleanly suppressed.
- **Network Privacy:** SOCKS5 and HTTP proxy support with WebRTC leak prevention.
- **Session Isolation:** Persistent partition (`persist:delugerpg`) with one-click clean-slate data wiping.
- **Guest Input Routing:** Full keyboard typing support inside PokeMart quantity boxes, chat, and form fields with zero focus drops.
- **In-DOM Modal Flow:** Replaced native Windows dialogs (`alert()`, `confirm()`) with sleek in-DOM dark theme modals.
- **Intelligent Target Hunting & Filtering:** 6 Target Presets, 10 distinct sprite variants, common Pokemon exclusion, and level filters.
- **Stealth Roaming & Safety:** Anti-stuck obstacle evasion, cadence roaming patterns, and security challenge detection guards.
