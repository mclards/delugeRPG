---
name: delugerpg-combat-engine
description: >-
  Use this skill when modifying, testing, or querying the DelugeRPG battle matchup calculator (team_engine.js),
  Python Monte Carlo combat engine (ml_combat_engine.py), Live AI Tactical Assistant, or gym_leaders.json database.
---

# DelugeRPG Combat Matchup & Live AI Tactical Engine (Token-Optimized)

## 1. Zero-Token Database Queries (Never `view_file` JSON Databases)
Query `gym_leaders.json`, `user_collection.json`, and `pokemon_moves_db.json` via `node -e` instead of loading them into context:
```powershell
node -e "const db=require('./gym_leaders.json'); console.log(Object.keys(db));"
node -e "const te=require('./team_engine.js'); console.log(Object.keys(te));"
```

## 2. Combat Engine Line-Range Map
* **`team_engine.js` (2130L):**
  * `L45-268`: 18-type matrix (`TYPE_CHART`), variant multipliers (`Shiny`, `Dark`, `Metallic`, `Ghostly`, `Shadow`, `Chrome`, `Retro`, `Negative`/`Inverse`), `outgoingEffectiveness()`, `incomingEffectiveness()`
  * `L275-673`: Roster exposure & Carry ranking (`getRosterExposure`, `rankCarries`, `getCarryMoveGuidance`, `getRosterWideBestAttack`, `rankTraineePartners`)
  * `L697-1020`: Move resolver (`resolveMove`), single-opponent scorer (`scoreVsSingleOpponent`), `getBaseSpecies()`
  * `L1063-1309`: Tier classifiers (`isUltraBeast`, `isParadoxPokemon`, `isLegendaryPokemon`, `isGmaxPokemon`, `isMegaPokemon`), `evaluateOwnershipAndMegaEquivalence()`, `filterCandidatePool()`
  * `L1311-1856`: Gym/Trainer Team Builder (`buildBestTeam`, `canSoloTrainer`, `getBestMoveVsTrainer`)
  * `L1858-2130`: PvP God Squad Builder (`getBestUniversalMove`, `buildGodSquadTeam`) + Evolution & Move Recommender exports
* **`ml_combat_engine.py` (524L) & `bin/ml_combat_engine/ml_combat_engine.exe`:**
  * `L120-207`: `MoveResolver` & `get_variant_stats()`
  * `L208-365`: `DelugeBattleSimulator` (`simulate_1v1_turn`, `simulate_full_match`, `evaluate_carry_monte_carlo`)
  * `L366-521`: `DelugeSmartEngine` (`rank_carries_ml`, `solve_trainer_counter`, CLI entrypoint)

## 3. Scoring, Anomalies & State Machines
* **Composite Score:** `TotalScore = (OffensePower * STAB * LevelWeight) - (DefensiveRisk * 40) + BaseStatBonus`
* **28-Trainer Anomaly Resolution:** Immune carries (e.g. Ground-type `Ting-Lu` vs Electric trainers `Lt. Surge`, `Wattson`, `Jasmine`, `Volkner`) avoid 1-hit KO / Fissure / Outrage traps with 0x defensive exposure.
* **Smart Battle Flow Button (7 States in `renderAiAssistantUI` `L7124-7448`):**
  1. `Prep`: `Deploy [Lead] & Start`
  2. `Attack`: `Attack with [Move] (4.0x)`
  3. `Reattack`: `Reattack with [Move] (4.0x)`
  4. `Continue`: `Continue to Next Turn`
  5. `KO Cont`: `Opponent KO - Continue`
  6. `Switch`: `Deploy [Counter] & Continue`
  7. `Complete`: `Battle Complete`
* **Evolution & Move Recommender (`L6946-7110`, `L7578-7621`):** Evaluates multi-branch evolutions (e.g. Eevee 8 branches, Applin G-Max/Hydrapple), flags `[OWNED]` status, and critiques low-power/redundant/non-STAB moves.

## 4. UI & Detection Rules
* **Manual-Only Detection:** `detectBattleOpponents()` (`game-preload.js` `L4556`) and `scoutPlayerByUsername()` (`L5866`) only trigger on explicit user action (**Check Active Screen**, **Scout**, or **Build**).
* **Lineup Card Rule (`renderTeamLineup` `app.js` `L5833`):** Render only slot #, sprite, Pokemon name + level, move name, and a single right-hand badge (`targetBadgeHtml`). Never stack `cleanRole` or `roleDesc` subtitles, and keep `box-shadow: none !important`.
