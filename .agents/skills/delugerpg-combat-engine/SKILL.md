---
name: delugerpg-combat-engine
description: >-
  Use this skill when modifying, testing, or querying the DelugeRPG battle matchup calculator,
  type counter algorithms, opponent database (gym_leaders.json), or live battle roster harvester.
---

# DelugeRPG Combat Matchup Engine & Trainer Database

This skill documents the combat mathematics, counter selection logic, and opponent databases
used by the DelugeRPG Gym Team Builder.

## Combat Math & Scoring Algorithm

The matchmaking engine (`team_engine.js`) evaluates candidate Pokemon from the user's box
collection against target opponents using offensive coverage and defensive safety scoring.

### 1. Offensive Multiplier
* Uses the standard 18-type Pokemon effectiveness matrix (`TYPE_CHART`).
* Dual-type defenders multiply multipliers: e.g. Water move vs Fire/Ground = 2.0 * 2.0 = 4.0x.
* **STAB (Same Type Attack Bonus):** 1.5x damage boost when move type matches the user's Pokemon typing.
* Base move power (default 40, OHKO moves scored as 250+).

### 2. Defensive Resistance Penalty
* Calculates incoming damage multiplier from opponent typing to candidate Pokemon typing.
* Immunity (0.0x incoming) grants huge score bonus (`Immune Wall` or `Immune Anchor`).
* Resistance (<= 0.5x incoming) grants defensive bonus (`Hard Counter`).
* Weakness (>= 2.0x incoming) applies strong risk penalty.

### 3. Final Composite Score
```text
TotalScore = (OffensePower * STAB * LevelWeight) - (DefensiveRisk * 40) + BaseStatBonus
```

## Opponent Database Architecture (`gym_leaders.json`)

The database contains 449 total opponents categorized into regional leagues and tiers:

### 1. Regional Gym Leagues (131 Leaders & Elite Four - 100% Complete)
* `KANTO`: 13 Leaders & Elite 4 (Brock, Misty, ..., Lance, Blue)
* `JOHTO`: 14 Leaders & Elite 4 (Falkner, Bugsy, ..., Lance, Red)
* `HOENN`: 15 Leaders & Elite 4 (Roxanne, ..., Steven, Wallace)
* `SINNOH`: 13 Leaders & Elite 4 (Roark, ..., Cynthia)
* `UNOVA`: 19 Leaders & Elite 4 (Cilan, ..., Alder, Iris)
* `KALOS`: 13 Leaders & Elite 4 (Viola, ..., Diantha)
* `ALOLA`: 17 Captains, Kahunas & Elite 4 (Ilima, ..., Kukui, Hau)
* `GALAR`: 14 Leaders & Champions (Milo, ..., Leon)
* `PALDEA`: 13 Leaders & Elite 4 (Katy, ..., Geeta)

### 2. Computer & Player Tiers (318 Trainers)
* `ULTIMATE_TRAINERS`: 6 high-level bosses (Ash, etc.)
* `STRONG_TRAINERS`: 72 mid-high trainers
* `VIP_TRAINERS`: 132 special opponents
* `STANDARD_TRAINERS`: 108 baseline trainers

## Battle & Profile Opponent Detection Lifecycle

1. **Preload Monitor:** `detectBattleOpponents()` in `game-preload.js` inspects `#teamleft`, `#opponent`, `#viewpokes`, or `#DModal .pokemon` when triggered.
2. **Manual-Only User Control:** Opening `#DModal` on a player profile must NEVER auto-trigger `battle-opponents-detected` in the background. Detection is performed on explicit user request (`Check Active Screen` or `Scout`).
3. **Host Persistence:** `handleLiveBattleOpponents()` updates `gym_leaders.json` for NPC trainers, or updates the Live Opponent card in PvP mode when `isManualCheck` is true.

## UI Presentation Guidelines (Team Builder & Matchup Renderers)

1. **Zero Glowing Shadows:**
   * Never render badges, buttons, or lineup cards with glowing box-shadows (`box-shadow: none !important`).
2. **STRICT ZERO UNNECESSARY TEXT INFORMATION LINES RULE:**
   * **Never** render verbose instructional sentences, helper paragraphs, or redundant header/subtitle text lines in Team Builder cards (`Live Opponent`, `Scout Player`, `#teamEmptyPrompt`, `renderTeamLineup`).
   * In `renderTeamLineup()`, each Pokemon row must only display: slot number, sprite thumbnail, Pokemon name + level, clean move name, and a single right-hand badge (`targetBadgeHtml`) -- never render `cleanRole` (`Super-Effective 2.0x`) or `roleDesc` text lines underneath the badge, and never render a redundant `YOUR PVP TEAM / TARGET:` header row above the list.
   * Preserve all standard CSS structural borders (`border: 1px solid #1a283e`, badge borders) -- never remove CSS borders when removing unnecessary text lines.
3. **Species Diversity Guarantee:**
   * The matchmaking engine strips forms and variant prefixes via `getBaseSpecies(name)` to enforce distinct species across trainees, ensuring optimal leveling spread without clone duplication.

