---
name: delugerpg-client-dev
description: >-
  Use this skill when developing, refactoring, hardening, or debugging the DelugeRPG Desktop Client,
  including its Electron architecture, webview isolation, preload scripts, safety limits, AI assistant, and test pipelines.
---

# DelugeRPG Stealth Desktop Client Runbook (Token-Optimized)

## 1. Fast Symbol & Line-Range Lookup (Use First to Save Tokens)
Before calling `view_file` on large files, always run `locate.js` to jump straight to exact line bounds (`<= 120` lines):
```powershell
node d:\PROJECTS_IO\delugeRPG\.agents\skills\delugerpg-client-dev\scripts\locate.js <symbol_or_id> [file]
node d:\PROJECTS_IO\delugeRPG\.agents\skills\delugerpg-client-dev\scripts\locate.js --map [file]
```

## 2. File & Line-Range Map (`desktop-client/`)
* **`main.js` (498L):**
  * `L24-72`: `getResolvedConfigPath()` | `L139-219`: `loadConfig()`, `saveConfig()`
  * `L257-320`: `setupSessionHardening()` (proxy, timezone, WebRTC) | `L322-498`: `createWindow()`, IPC handlers
* **`app.html` (2909L):**
  * `L7-1779`: CSS (`box-shadow: none !important`, docked 3/4 + 1/4 layout)
  * `L1788-1876`: `#toolbar` (Start/Stop, Auto-Start + Delay, Auto-Catch, Avoid Dupes, Hide Ads, Targets, Team Builder, Safety telemetry, Nav button)
  * `L1877-2146`: `#navDropdown` (AI Assistant at top, collapsible uncollapsed sections: Hunting & Targets, Combat & Team Builder, Ad Blocker & Privacy, System & Diagnostics; zero duplication of `#toolbar` buttons)
  * `L2148-2515`: Modals (`#targetModal`, `#networkModal`, `#accountModal`, `#wipeModal`, `#trainerIntelModal`)
  * `L2516-2905`: Docked 1/4 Side Panels (`#teamBuilderModal` L2516, `#adsInspectorModal` L2709, `#catchLogModal` L2782, `#aiAssistantModal` L2834, `#safetySettingsModal` L2900)
* **`app.js` (8231L):**
  * `L105-225`: `loadLocalConfig()`, `saveLocalConfig()`
  * `L699-1005`: Network identity & proxy badge UI
  * `L1007-1525`: Toolbar toggle UI updaters (`updateAvoidDupesUI`, `updateAutoStartMapUI`, `updateHideAdsUI`, `updateAutoCatchUI`, `updateTargetUI`, `applyTargetPreset`)
  * `L1590-2662`: Map walker engine (`toggleHunting`, `getHardenedHumanDelay`, `scheduleNextStep`, `handleMoveSuccess`, `triggerDelayedAutoStart`, `handleMapNavigation`)
  * `L2688-3335`: `delugeView` `ipc-message` dispatcher
  * `L4685-6505`: Team Builder & PvP controller (`handleLiveBattleOpponents`, `populateGymTrainerSelect`, `renderTeamLineup`, `executeTeamBuild`, `executePvPTeamBuild`)
  * `L6508-6826`: Daily Catch Log & Ball Inventory (`loadDailyCatchLog`, `recordCaughtPokemon`, `renderCatchLogUI`)
  * `L6833-7660`: Live AI Tactical Assistant (`updateLiveAiAssistantUI`, `handleEvolveCardDetected`, `renderAiAssistantUI`, `executeAiBattleAction`, `handleRunMonteCarloSimulation`)
  * `L7665-8231`: Defense-in-Depth Safety & Anti-Ban Engine (`loadDailySafetyState`, `triggerForcedRestBreak`, `handleCaptchaEmergencyHalt`, `saveSafetySettingsFromUI`, `updateSafetyTelemetryUI`)
* **`game-preload.js` (6369L):**
  * `L318-806`: Google Vignette suppression & Cosmetic Ad Hiding (`smoothCollapseAd`, `applyCosmeticAdHiding`)
  * `L943-1164`: Ownership & Mega Evolution equivalence (`evaluateOwnershipAndMegaEquivalence`)
  * `L1167-1875`: Humanized click dispatch & Duplicate detection (`checkEncounterIsDuplicate`)
  * `L1877-2636`: Captcha detector (`checkHasCaptchaElement`) & Encounter scanner (`scanForTargets`, `triggerTargetFound`)
  * `L2639-3038`: Map directional movement & blocked tile detection
  * `L3422-3912`: Ball inventory scraper & Master Ball Auto-Catch (`runAutoCatchLifecycle`)
  * `L3915-4455`: Pokemon box scanner, trainer profile scanner, `/team/edit` slot injector
  * `L4458-6369`: Live Battle opponent detector (`detectBattleOpponents`), AI battle action executor (`apply-ai-battle-action`), Player Scout (`scoutPlayerByUsername`), Evolve card sensor (`detectEvolveCard`)

## 3. Config Schema (`config.json`)
* **`dummyAccount`:** `{ username, password, autoLogin }`
* **`network`:** `{ proxyUrl, spoofTimezone, blockWebRTC }`
* **`settings`:** `{ targetNames, targetClasses, catchAnyClass, huntLegendaries, huntMegas, avoidDuplicates, autoCatchMasterBall, autoStartOnMap, autoStartDelay: 3, hideAdsCosmetically: true, teamBattleMode: "GYM", pvpStrategy: "BALANCED", pvpCandidateTier: "ANY", minMoveDelay: 1700, maxMoveDelay: 2500, soundEnabled: true }`
* **`safety`:** `{ enableDailyCeilings: true, minDailySteps: 1800, maxDailySteps: 3200, minDailyCatches: 35, maxDailyCatches: 75, enableDeadManSwitch: true, sessionMaxMinutes: 45, enableForcedBreaks: true, breakEveryMinSteps: 180, breakEveryMaxSteps: 320, breakDurationMinSec: 45, breakDurationMaxSec: 135, antiBotEmergencyHalt: true }`

## 4. Non-Negotiable Constraints
1. **100% 7-Bit Clean ASCII:** Char codes `<= 127` only. Use HTML entities (`&#8635;`, `&#9876;`, `&#128737;`, `&#10003;`).
2. **Zero Glow & Zero Unnecessary Text Lines:** `box-shadow: none !important`. No filler descriptions, no redundant counts, no `cleanRole`/`roleDesc` subtitles under lineup badges. Preserve all structural borders (`border: 1px solid #1a283e`).
3. **Toolbar vs. Nav Dropdown Separation:** Controls present on `#toolbar` must never be duplicated inside `#navDropdown`. `#navDropdown` uses collapsible `.nav-group` sections (uncollapsed by default) with AI Assistant at the top.
4. **Docked 1/4 Panels & Manual Triggers:** Side panels dock at 25% (`flex: 1`) beside the 75% (`flex: 3`) `<webview>`. Never auto-scan or auto-build opponents without explicit user click.
5. **Safety & Timing Floor:** Step/catch delays `>= 1700ms` (Gaussian avg `~2100ms`). Both `toggleHunting()` and `triggerDelayedAutoStart()` must enforce all 4 safety layers.

## 5. Verification Gate
```powershell
cd d:\PROJECTS_IO\delugeRPG\desktop-client
node test_deep_verification.js
```
All 115 tests across all 9 pipelines (`test_buttons_verification.js`, `test_dropdowns_and_filters.js`, `test_ai_assistant_live.js`, `test_safety_limits.js`) must pass with 0 failures.
