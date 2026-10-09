## DelugeRPG Stealth Client v1.1.0 (Stable Release)

Major release delivering full account safety hardening, Pokedex duplication avoidance, map auto-start roaming, an organized navigation layout, robust settings and log persistence for installed executables, and repository restructuring.

### Key Highlights & Changes:

#### 1. Zero-Residue Removal of Auto-Catch
- **Ad & IVT Risk Elimination:** Completely removed automated Pokeball throwing logic and related UI toggles with zero residue. This eliminates bot-detection risks from Google AdSense interstitial ad overlays and invalid traffic flags between map and battle sequences.
- **Manual Catch Preservation:** Retains 100% of the movement pacing, obstacle evasion, sound chimes, desktop notifications, and automatic hunting halts so the player catches targets manually and securely.

#### 2. Pokedex Duplication Avoidance Engine
- **Skip Owned Encounters:** Encounters already registered in your Pokedex (indicated by the in-game red Pokeball marker or captured badge) are automatically ignored.
- **Live Status Toggle:** Dedicated `Avoid Duplicates [ON / OFF]` toggle badge located in the new Targeting & Detection menu.

#### 3. Auto-Start Hunting on Map Load
- **Seamless Roaming:** Automatically starts walking whenever the DelugeRPG map (`/map`) loads or refreshes.
- **Auto-Pause Guard:** Automatically halts hunting when navigating outside map pages.
- **Configurable Toggle:** Dedicated `Auto-Start on Maps [ON / OFF]` toggle in the menu.

#### 4. Streamlined Navigation Menu & UI Re-Layout
- **Clean Top Bar:** Removed toolbar clutter, leaving essential telemetry, zoom controls, chime alert, network shield, and start/pause toggle.
- **Collapsible Menu Organization:** Reorganized into clear sections:
  - *Targeting & Detection:* Target Pokemon Filters, Avoid Duplicates, Auto-Start on Maps.
  - *Walking Movement Mode:* Patterns (Smart Wander, Diagonal Stair, Patrol, etc.) and max steps per turn.
  - *Tools & Settings:* Account Credentials auto-fill, Proxy Configuration, Open System Logs, Reload Map, Wipe Session.

#### 5. Installer EXE Settings & Log Persistence Hardening
- **UserData Path Resolution:** Packaged installer builds automatically persist configs and logs to `%APPDATA%\delugerpg-desktop-client\`.
- **Recursive Schema Merging:** `deepMerge` engine preserves user preferences across client upgrades while seeding newly added settings.
- **Atomic Config Writing:** Writes to `.tmp` file before atomic rename, preventing file corruption.
- **Diagnostic Logging & Viewer:** Both main and renderer processes log to a single rotating log file (capped at 5 MB). Click `Open System Logs` in the menu to view diagnostic logs instantly.

#### 6. Cleaned Workspace Architecture
- Reorganized 27 regression test suites into `tests/` and reference assets into `docs/`.

### Installation & Downloads
- **Setup Installer (Recommended):** Download `DelugeRPG.Stealth.Client.Setup.1.1.0.exe`
- **Portable Edition:** Download `DelugeRPG.Stealth.Client.1.1.0.exe`

---

## DelugeRPG Stealth Client v1.0.0 (Stable Release)

Standalone, hardened desktop gaming client for DelugeRPG featuring intelligent encounter detection, zero-loss input routing, configurable target filtering, and stealth roaming.

### Key Highlights & Features:

#### 1. Hardened Desktop Architecture
- **Genuine Chrome Engine:** Chromium 142 User-Agent and client-hints spoofing with automation features cleanly suppressed.
- **Network Privacy:** SOCKS5 and HTTP proxy support with WebRTC leak prevention.
- **Session Isolation:** Persistent partition (`persist:delugerpg`) with one-click clean-slate data wiping.

#### 2. Smooth Input & Form Interactivity
- **Guest Input Routing:** Full keyboard typing support inside PokeMart quantity boxes, chat, and form fields with zero focus drops or focus stealing.
- **In-DOM Modal Flow:** Replaced all native Windows dialogs (`alert()`, `confirm()`) with sleek in-DOM dark theme modals to preserve OS keyboard routing.

#### 3. Intelligent Target Hunting & Filtering
- **6 Target Presets:** All Targets, Legendaries Only, Megas Only, Variants Only, Legendaries + Megas, and Custom.
- **Species & Sprite Variant Filters:** Filter by 10 distinct sprite variants (Normal, Shiny, Metallic, Ghostly, Dark, Shadow, Mirage, Chrome, Negative, Retro). Normal variants can be toggled on or off with strict enforcement.
- **Common Pokemon Exclusion:** Common wild Pokemon (Swablu, Rattata, etc.) are strictly skipped when legendary/mega hunting, even if they have special variants.
- **Level Filters:** Filter encounters by minimum, maximum, or exact level with target-only or global scoping.

#### 4. Stealth Roaming & Safety
- **Anti-Stuck & Cadence Roaming:** Intelligent obstacle evasion with customizable roaming patterns (Wander, Horizontal Line, Vertical Line, Square Patrol).
- **Security Challenge Guard:** Immediate halting and chime/desktop alert upon reaching `/unlock` or captcha security challenges for manual completion.
- **Smart Pokeball Selection:** Context-aware Pokeball auto-selection with safety fallbacks.

### Installation & Downloads
- **Setup Installer (Recommended):** Download `DelugeRPG.Stealth.Client.Setup.1.0.0.exe`
- **Portable Edition:** Download `DelugeRPG.Stealth.Client.1.0.0.exe`

