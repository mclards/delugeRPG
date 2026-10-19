# DelugeRPG Stealth Client v1.1.7 (Stable Release)

## Highlights & Improvements

### 1. Zero-Stock Master Ball Safeguard (Option A Safe Redirection)
- **Zero Risk Catch Halting**: If Master Ball stock is 0 (or unavailable/disabled) during Wild Battle, the client strictly halts the catch sequence and **never** throws regular Pokeballs.
- **Audio & Desktop Notification**: Triggers an immediate warning chime alert and system notification informing the user of empty stock.
- **Direct Map Redirection**: DelugeRPG's Wild Battle interface contains no exit/return button; the client directly navigates back to the stored previous map URL via `window.location.href` after a natural randomized delay (5s - 15s).
- **Auto-Pause Persistence**: Upon returning to the map, hunting automatically stays paused (`Paused (0 Master Balls - Restock)`) until the user manually restocks inventory.

### 2. Live Inventory Stock Extraction & Logging
- **Dynamic Stock Parser**: Real-time extraction of available Master Ball quantity directly from DelugeRPG's battle DOM (`Master Ball (N)`).
- **Comprehensive Terminal & Backend Logs**:
  - `[AutoCatch] Selecting Master Ball (Stock: N). Waiting Xms.`
  - `[AutoCatch] Throwing Master Ball (Stock: N). Waiting Xms.`
  - `[AutoCatch] Target successfully captured via Master Ball (Remaining Stock: N-1).`
- Gives full inventory visibility on every catch attempt to avoid surprise depletion.

### 3. Toolbar Status Chip & Notification Streamlining
- **Expanded Width**: Widened the header status chip (`#statusChip`) to 360px (min 320px, max 420px) to prevent notification truncation and clipping.
- **Centered, Shortened Status Text**: Cleaned and condensed all notification strings across roaming, ball selection, throwing, and resuming.

### 4. Advanced Google Vignette (Full-Screen Interstitial Ad) Suppression
- **Native Link Prevention**: Dynamically injects `data-google-vignette="false"` on navigation links so Google Auto Ads skips full-page interstitial triggers on page transitions.
- **Autonomous Overlay Dismissal**: Automatically detects Google Vignette overlays, simulates dismiss clicks (`#dismiss-button`, `[aria-label="Close ad"]`), cleans `#google_vignette` URL fragments, and prevents viewport scroll locks.
- **Server Stealth**: Operates purely on cosmetic rendering without blocking network requests, preserving 100% compliance with DelugeRPG server ad verification checks.

### 5. PokeFinder Userscript Alignment (v4.6)
- Synchronized [pokefinder.user.js](pokefinder.user.js) to **v4.6** with identical Option A zero-stock redirection, direct map navigation, live stock quantity logging, and Google Vignette suppression.

### 6. Verified Reliability & Clean ASCII Integrity
- Validated with live production encounters (e.g., *Ghostly Yveltal Lv 62*, *Kartana Lv 51*) with 0 errors and zero detection footprints.
- 100% 7-bit clean ASCII compliance across all client source files.

---

### Included Release Binaries
- **Windows Setup Installer**: `DelugeRPG Stealth Client Setup 1.1.7.exe` (NSIS automated installer with desktop shortcut)
- **Standalone Portable**: `DelugeRPG Stealth Client 1.1.7.exe` (Single standalone executable, no installation needed)

