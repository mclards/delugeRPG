---
name: delugerpg-client-dev
description: >-
  Use this skill when developing, refactoring, hardening, or debugging the DelugeRPG Desktop Client,
  including its Electron architecture, webview isolation, preload scripts, and test verification pipelines.
---

# DelugeRPG Stealth Desktop Client Development Runbook

This skill outlines the architecture, constraints, IPC protocols, and verification runbooks
for the DelugeRPG Desktop Client codebase.

## Codebase Architecture

```text
desktop-client/
|-- main.js                  # Electron main process (lifecycle, window creation, proxy routing, net spy)
|-- app.html                 # Host window DOM: top toolbar, docked panels, modals, <webview> container
|-- app.js                   # Host window controller (state machine, hunting walker, team builder, UI)
|-- game-preload.js          # Injected webview preload script (DOM hooks, event dispatch, auto-catch)
|-- team_engine.js           # Combat matchup and counter calculation algorithms
|-- targets.js               # Pokemon target database (Legendaries, Mythicals, Ultra Beasts, Megas)
|-- config.json              # Local configuration state (settings, proxy, credentials)
|-- gym_leaders.json         # Opponent database (131 Gym Leaders + 318 trainer tiers)
|-- user_collection.json     # User synced box Pokemon collection
`-- test_deep_verification.js# 50-point full pipeline verification test suite
```

## Non-Negotiable Engineering Constraints

1. **100% 7-Bit Clean ASCII:**
   * Every file in `desktop-client/` must contain exclusively 7-bit ASCII characters (char codes <= 127).
   * In HTML, use character entities (e.g. `&#8635;`, `&#9876;`, `&#128737;`, `&#10003;`).
   * Never introduce unicode punctuation, smart quotes, or em-dashes.

2. **Zero Glowing Box-Shadows & Strict Zero Unnecessary Text Information Lines:**
   * Never apply glowing colored box-shadows (e.g. `box-shadow: 0 0 15px rgba(...)`). Keep buttons and panels flat with `box-shadow: none !important`.
   * **NEVER** add explanatory text lines, tutorial sentences, helper descriptions (`.modal-desc` paragraphs, overview banners), or redundant status text lines inside modals, docked panels, cards, or empty states.
   * **NEVER** stack extra text lines (`cleanRole`, `roleDesc`, or `YOUR PVP TEAM` headers) in `renderTeamLineup` or repeat player/pool counts that are already shown in inputs or buttons.
   * Keep the UI strictly functional and concise while preserving all standard CSS structural borders (`border: 1px solid #1a283e`, `border-bottom`, `border-top`, badge borders). Never remove CSS borders when removing unnecessary text lines.

3. **Docked 3/4 + 1/4 Layout & Manual-Only Action Triggers:**
   * DelugeRPG gameplay must never be obstructed by full-window modal backdrops during gameplay.
   * Tool panels (such as the Gym Team Builder) must be docked into a side panel taking 1/4 (`flex: 1`, 25%) of the window, leaving 3/4 (`flex: 3`, 75%) for the live game `<webview>`.
   * Never auto-load or auto-build Live Battle / Profile Stalk data without the user explicitly clicking **Check Active Screen**, **Scout**, or **Build**.

4. **Anti-Bot Safety Floor (>= 1700ms):**
   * Movement and catch delays must never fall below 1700ms.
   * Walking steps must use non-uniform Gaussian jitter (target avg ~2100ms).

## IPC Communication Channels

| Channel | Direction | Payload | Purpose |
| :--- | :--- | :--- | :--- |
| `start-scan-pokemon` | Host -> Guest | None | Initiates multi-page scan of user box collection |
| `scan-pokemon-status` | Guest -> Host | `{ page, total }` | Reports box collection scanning progress |
| `pokemon-scan-complete` | Guest -> Host | `{ pokemons, pageCount }` | Delivers scanned user Pokemon collection |
| `check-battle-opponents` | Host -> Guest | None | Triggers immediate scan of current battle arena |
| `battle-opponents-detected` | Guest -> Host | `{ trainerName, roster }` | Reports opponent lineup captured in live battle |
| `apply-team-slots` | Host -> Guest | `{ slotPokemonIds }` | Injects recommended counter team into `/team/edit` |
| `team-apply-complete` | Guest -> Host | `{ success, error }` | Confirms counter team assignment |
| `preload-ready` | Guest -> Host | None | Signals guest DOM loaded; triggers config sync |
| `hunting-auto-pause` | Guest -> Host | `{ path }` | Auto-pauses bot if user navigates outside map |

## Verification Runbook

Always execute the complete verification suite after any change:
```powershell
cd d:\PROJECTS_IO\delugeRPG\desktop-client
node test_deep_verification.js
```
All 50 checks across all 9 pipelines must pass with zero failures.
Also verify clean JavaScript syntax before testing:
```powershell
node -c app.js
node -c game-preload.js
```
