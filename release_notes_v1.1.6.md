# DelugeRPG Stealth Client v1.1.6 (Stable Release)

## Highlights & Improvements

### 1. Cosmetic Ad Hiding (Safe & Seamless)
- Visually collapses intrusive display ad banners while letting scripts and trackers run completely unblocked.
- Preserves DelugeRPG's native 1-click "Skip Ads" functionality and ensures full compatibility with game servers.
- Cleanly labeled **Hide Ads** toggle in the tools dropdown with quick ON/OFF state persistence.

### 2. Real-Time Map Presence & Auto-Start Recovery
- **Continuous Map Synchronization**: Fixed an issue where navigating away to profile/inventory and returning to the map left the client in an "Outside Map" state.
- **Dynamic Encounter Recovery**: The preload bridge now dispatches real-time `map-presence` heartbeats. Once a wild encounter or battle concludes and the map DOM settles, Auto-Start automatically re-activates.

### 3. Graceful Auto-Resume After Manual Captures
- Target detection pauses hunting safely for manual capture.
- Returning to the map or closing the encounter automatically clears the pause state and resumes hunting smoothly without requiring manual toggle clicks.

### 4. In-App Version Indicator
- Added a dedicated, clean version chip (`v1.1.6`) directly at the bottom of the navigation dropdown menu for instant version verification.

### 5. Core Stealth & Anti-Cheat Guarantees
- Strict Gaussian timing engine (1700ms safety floor, 2100ms base cadence, randomized jitter).
- 100% 7-bit clean ASCII code integrity across all client files.

---

### Included Release Binaries
- **Windows Setup Installer**: `DelugeRPG Stealth Client Setup 1.1.6.exe` (NSIS automated installer with desktop shortcut)
- **Standalone Portable**: `DelugeRPG Stealth Client 1.1.6.exe` (Single standalone executable, no installation needed)

