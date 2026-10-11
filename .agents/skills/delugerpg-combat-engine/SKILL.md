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

## Battle Opponent Auto-Recording Lifecycle

1. **Preload Monitor:** `detectBattleOpponents()` in `game-preload.js` listens to battle screens:
   * `#teamleft`: Active PvP or Trainer battle roster
   * `#opponent`: NPC battle card
   * `#viewpokes`: Post-battle lineup inspection
2. **IPC Dispatch:** Dispatches `battle-opponents-detected` to host window.
3. **Host Persistence:** `handleLiveBattleOpponents()` matches opponent name in `gym_leaders.json`,
   updates the `roster` array with all detected Pokemon, persists to disk, and refreshes the select dropdown.
4. **Instant Counter:** If Team Builder is open, immediately calculates and renders the 6 tailored counters.

## UI Presentation Guidelines (Team Builder & Matchup Renderers)

1. **Zero Glowing Shadows:**
   * Never render badges, buttons, or lineup cards with glowing box-shadows (`box-shadow: none !important`).
2. **Minimalist Clean Lines:**
   * Never render redundant double borders, dashed outlines, or noisy wireframe borders around badges (e.g. `CARRY ANCHOR`, `TRAINEE`, `RESERVE`).
   * Use flat, subtle alpha fills (`rgba(...)`) and background contrast for pure readability and zero visual clutter.
3. **Species Diversity Guarantee:**
   * The matchmaking engine strips forms and variant prefixes via `getBaseSpecies(name)` to enforce distinct species across trainees, ensuring optimal leveling spread without clone duplication.

