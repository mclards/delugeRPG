# DelugeRPG Stealth Client v1.3.0 (Stable Release)

## Highlights & Improvements

### 1. Entire-Day Auto-Catch Telemetry & Persistent Catch Log
- **Persistent Daily Storage**: All automatically caught Pokemon are persistently recorded across the entire calendar day in `daily_catch_log.json` and local storage, surviving client restarts.
- **Calendar Date Rollover**: Automatic midnight date detection cleanly rolls over today's caught list while preserving live Poke Ball stock counts.
- **Detailed Catch Feed**: Scrollable card list rendering official Pokemon sprites, detected variants (Shiny, Metallic, Chrome, Shadow, Mirage, Retro, Negative, Ghostly, Dark), encounter levels, used Poke Ball types, and catch timestamps.
- **Live Inventory Strip**: Real-time display of all bag Poke Balls (Pokeball, Greatball, Ultraball, Masterball).
- **One-Click Log Management**: Instant clear button for resetting today's catch telemetry and refresh button for live sync.

### 2. Live Master Ball Telemetry & Toolbar Integration
- **Relocated Network / Proxy Badge**: Moved `#networkBadge` into the navigation menu dropdown under Tools & Settings, preserving real-time public IP and Starlink status indicators without cluttering the main top toolbar.
- **Top Toolbar Daily Auto-Catch Badge**: Positioned `#dailyCaughtBtn` prominently in the top toolbar showing today's caught Pokemon count (`Today: N`) and real-time Master Ball stock (`MB: N`).
- **Live Inventory Scraping**: Automated regex extraction of in-bag Poke Balls from map pages (`#userpokeballs`, `.bag`, `#inventory`) and live battle catch screens (`Master Ball (N)`).
- **Zero-Stock Protection**: Option A auto-redirection back to previous map with safety alarm if Master Ball stock reaches zero.

### 3. Hardened Multi-Type & Dual-Type Combat Engine
- **Type Chart Database**: Integrated standalone `type_chart_database.json` providing complete 18x18 elemental effectiveness multipliers for both single-type and dual-type calculations.
- **Dual-Type Defense Profiling**: Multiplicative damage calculations (e.g. 4x Grass weakness against Rock/Ground Brock, 4x Ice weakness against Dragon/Flying Lance).
- **Ironclad Defense Evaluation**: Full STAB bonus weighting, move resolution against `skills_database.json`, base power checks, and elimination of false solo judgements.

### 4. Cosmetic Ad Suppression & Header Strict Immunity Guard
- **Instant (0ms) Ad Hiding**: Suppresses Google AdSense, Google Publisher Tag (GPT), and OptAd360 containers before initial layout paint, eliminating banner flashes.
- **DelugeRPG Header Immunity**: Strict immunity guards for `#del_header` and `#navwrap`, completely preventing disappearing header elements during hunting and battle screens.
- **Docked Ads Inspector Panel**: Real-time telemetry inspector displaying live ad collapse metrics without interfering with gameplay.

### 5. GUI & Workspace Architectural Compliance
- **100% 7-Bit Clean ASCII Integrity**: Character codes strictly <= 127 across all files, JSON databases, tests, and documentation.
- **Zero Glowing Shadows**: Flat, beveled minimalist styling with `box-shadow: none !important` on all badges, buttons, cards, and modal dialogs.
- **Docked 1/4 Side Panels**: All tool panels (Team Builder, Ads Inspector, Today's Auto-Catch) remain docked at 1/4 (25%) width, preserving 3/4 (75%) for active game `<webview>` without modal overlays.

### 6. Full Verification Gate Passed
- **62/62 Tests Passed**: 100% pass rate across all 9 verification pipelines in `test_deep_verification.js`.
- **Zero-Logout Safety**: Session cookies, login tokens, and proxy routes preserved across reloads.

---

### Included Release Binaries
- **Windows Setup Installer**: `DelugeRPG Stealth Client Setup 1.3.0.exe` (NSIS automated installer with desktop shortcut)
- **Standalone Portable**: `DelugeRPG Stealth Client 1.3.0.exe` (Single standalone executable, no installation needed)

