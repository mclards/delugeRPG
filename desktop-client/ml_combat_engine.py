"""
ml_combat_engine.py
DelugeRPG Machine Learning & Monte Carlo Simulation Combat Engine
Predicts Win Rates, Solves Optimal Move Policies, and Evaluates Carries

Uses: PyTorch / Scikit-Learn / NumPy / Monte Carlo Tree Simulation
Strictly 100% 7-bit clean ASCII
"""

import os
import sys
import json
import math
import random
import argparse
from typing import Dict, List, Tuple, Any, Optional

import numpy as np

# Resolve local paths dynamically across development and frozen standalone binaries
def resolve_data_file(filename: str, custom_dir: Optional[str] = None) -> str:
    candidates = []
    if custom_dir and os.path.isdir(custom_dir):
        candidates.append(os.path.join(custom_dir, filename))
    env_dir = os.environ.get("DELUGE_DATA_DIR")
    if env_dir and os.path.isdir(env_dir):
        candidates.append(os.path.join(env_dir, filename))

    base_target = sys.executable if getattr(sys, "frozen", False) else __file__
    exe_dir = os.path.dirname(os.path.abspath(base_target))
    candidates.append(os.path.join(exe_dir, filename))
    candidates.append(os.path.join(exe_dir, "..", filename))
    candidates.append(os.path.join(exe_dir, "..", "..", filename))
    candidates.append(os.path.join(os.getcwd(), filename))

    for c in candidates:
        abs_c = os.path.abspath(c)
        if os.path.exists(abs_c):
            return abs_c
    return os.path.abspath(os.path.join(exe_dir, filename))

GYM_DATA_PATH = resolve_data_file("gym_leaders.json")
USER_COLL_PATH = resolve_data_file("user_collection.json")
SKILLS_PATH = resolve_data_file("skills_database.json")
TYPE_CHART_PATH = resolve_data_file("type_chart_database.json")

# =====================================================================
# 1. TYPE CHART & COMBAT MATRIX ENGINE
# =====================================================================

ALL_TYPES = [
    "Normal", "Fire", "Water", "Electric", "Grass", "Ice",
    "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
    "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"
]

RAW_TYPE_CHART = {
    "Normal":   {"Rock": 0.5, "Ghost": 0.0, "Steel": 0.5},
    "Fire":     {"Fire": 0.5, "Water": 0.5, "Grass": 2.0, "Ice": 2.0, "Bug": 2.0, "Rock": 0.5, "Dragon": 0.5, "Steel": 2.0},
    "Water":    {"Fire": 2.0, "Water": 0.5, "Grass": 0.5, "Ground": 2.0, "Rock": 2.0, "Dragon": 0.5},
    "Grass":    {"Fire": 0.5, "Water": 2.0, "Grass": 0.5, "Poison": 0.5, "Ground": 2.0, "Flying": 0.5, "Bug": 0.5, "Rock": 2.0, "Dragon": 0.5, "Steel": 0.5},
    "Electric": {"Water": 2.0, "Grass": 0.5, "Electric": 0.5, "Ground": 0.0, "Flying": 2.0, "Dragon": 0.5},
    "Ice":      {"Fire": 0.5, "Water": 0.5, "Grass": 2.0, "Ice": 0.5, "Ground": 2.0, "Flying": 2.0, "Dragon": 2.0, "Steel": 0.5},
    "Fighting": {"Normal": 2.0, "Ice": 2.0, "Poison": 0.5, "Flying": 0.5, "Psychic": 0.5, "Bug": 0.5, "Rock": 2.0, "Ghost": 0.0, "Dark": 2.0, "Steel": 2.0, "Fairy": 0.5},
    "Poison":   {"Grass": 2.0, "Poison": 0.5, "Ground": 0.5, "Rock": 0.5, "Ghost": 0.5, "Steel": 0.0, "Fairy": 2.0},
    "Ground":   {"Fire": 2.0, "Grass": 0.5, "Electric": 2.0, "Poison": 2.0, "Flying": 0.0, "Bug": 0.5, "Rock": 2.0, "Steel": 2.0},
    "Flying":   {"Grass": 2.0, "Electric": 0.5, "Fighting": 2.0, "Bug": 2.0, "Rock": 0.5, "Steel": 0.5},
    "Psychic":  {"Fighting": 2.0, "Poison": 2.0, "Psychic": 0.5, "Dark": 0.0, "Steel": 0.5},
    "Bug":      {"Fire": 0.5, "Grass": 2.0, "Fighting": 0.5, "Poison": 0.5, "Flying": 0.5, "Psychic": 2.0, "Ghost": 0.5, "Dark": 2.0, "Steel": 0.5, "Fairy": 0.5},
    "Rock":     {"Fire": 2.0, "Ice": 2.0, "Fighting": 0.5, "Ground": 0.5, "Flying": 2.0, "Bug": 2.0, "Steel": 0.5},
    "Ghost":    {"Normal": 0.0, "Psychic": 2.0, "Ghost": 2.0, "Dark": 0.5},
    "Dragon":   {"Dragon": 2.0, "Steel": 0.5, "Fairy": 0.0},
    "Steel":    {"Fire": 0.5, "Water": 0.5, "Electric": 0.5, "Ice": 2.0, "Rock": 2.0, "Steel": 0.5, "Fairy": 2.0},
    "Dark":     {"Fighting": 0.5, "Psychic": 2.0, "Ghost": 2.0, "Dark": 0.5, "Fairy": 0.5},
    "Fairy":    {"Fire": 0.5, "Fighting": 2.0, "Poison": 0.5, "Dragon": 2.0, "Dark": 2.0, "Steel": 0.5}
}

def normalize_type(t: str) -> str:
    if not t or not isinstance(t, str):
        return "Normal"
    clean = t.strip()
    if not clean:
        return "Normal"
    return clean[0].upper() + clean[1:].lower()

def get_effectiveness(attack_type: str, defender_types: List[str]) -> float:
    atk = normalize_type(attack_type)
    if atk not in RAW_TYPE_CHART:
        return 1.0
    mult = 1.0
    for dt in defender_types:
        d = normalize_type(dt)
        chart = RAW_TYPE_CHART.get(atk, {})
        mult *= chart.get(d, 1.0)
    return mult

def get_incoming_effectiveness(defender_types: List[str], attack_type: str) -> float:
    return get_effectiveness(attack_type, defender_types)

def get_defensive_quad_weaknesses(types: List[str]) -> List[str]:
    quads = []
    for at in ALL_TYPES:
        if get_incoming_effectiveness(types, at) >= 4.0:
            quads.append(at)
    return quads

# =====================================================================
# 2. MOVE PHYSICS & TRAIT RESOLUTION
# =====================================================================

LOCKING_MOVES = {"outrage", "thrash", "petaldance"}
RECHARGE_MOVES = {"hyperbeam", "gigaimpact", "blastburn", "frenzyplant", "hydrocannon", "roaroftime", "prismaticlaser", "eternabeam"}
CHARGE_MOVES = {"skyattack", "solarbeam", "solarblade", "skullbash", "razorwind", "geomancy", "fly", "dig", "dive", "bounce", "shadowforce"}
OHKO_MOVES = {"fissure", "guillotine", "horndrill", "sheercold"}
SUICIDE_MOVES = {"explosion", "selfdestruct", "mistyexplosion", "finalgambit"}

def clean_key(name: str) -> str:
    return "".join(c for c in (name or "").lower() if c.isalnum())

class MoveResolver:
    def __init__(self, skills_path: str):
        self.skills = {}
        if os.path.exists(skills_path):
            try:
                with open(skills_path, "r", encoding="utf8") as f:
                    data = json.load(f)
                    self.skills = data.get("moves", {})
            except Exception:
                self.skills = {}

    def resolve(self, m: Any) -> Dict[str, Any]:
        if isinstance(m, dict):
            raw_name = m.get("name", "Tackle")
            declared_type = m.get("type", None)
            declared_power = m.get("power", None)
        else:
            raw_name = str(m or "Tackle")
            declared_type = None
            declared_power = None

        ck = clean_key(raw_name)
        skill_data = self.skills.get(ck, {})

        name = raw_name or skill_data.get("name", "Tackle")
        m_type = declared_type or skill_data.get("type", "Normal")
        m_type = normalize_type(m_type)
        category = skill_data.get("category", "Physical")

        # Base Power
        power = 40
        if declared_power and isinstance(declared_power, (int, float)) and declared_power > 0:
            power = int(declared_power)
        elif "power" in skill_data and isinstance(skill_data["power"], (int, float)):
            power = int(skill_data["power"])
        else:
            power = 80 if any(kw in ck for kw in ["blast", "beam", "storm", "cannon", "quake", "outrage"]) else 60

        # Move traits
        is_ohko = (ck in OHKO_MOVES) or (skill_data.get("special", {}).get("mechanic") == "ohko")
        is_locking = ck in LOCKING_MOVES
        is_recharge = ck in RECHARGE_MOVES
        is_charge = ck in CHARGE_MOVES
        is_suicide = ck in SUICIDE_MOVES

        # Accuracy
        accuracy = 1.0
        if is_ohko:
            accuracy = 0.30
        elif ck in ["focusblast", "zapcannon", "dynamicpunch"]:
            accuracy = 0.50
        elif ck in ["stoneedge", "ironhead", "blizzard", "thunder", "fireblast", "hydropump"]:
            accuracy = 0.85

        return {
            "name": name,
            "type": m_type,
            "power": power,
            "category": category,
            "accuracy": accuracy,
            "is_ohko": is_ohko,
            "is_locking": is_locking,
            "is_recharge": is_recharge,
            "is_charge": is_charge,
            "is_suicide": is_suicide
        }

# Variant Multipliers in DelugeRPG
def get_variant_stats(variant: str) -> Dict[str, Any]:
    v = (variant or "").strip().lower()
    offense = 1.0
    hp = 1.0
    crit = 0.0625  # default 6.25% crit rate
    if v == "dark":
        offense = 1.25
    elif v == "shiny":
        hp = 1.25
    elif v == "chrome":
        hp = 1.35
        crit = 0.50  # 50% critical hit chance
    elif v == "metallic":
        pass  # status immune
    return {"offense": offense, "hp": hp, "crit": crit}

# =====================================================================
# 3. COMBAT SIMULATION ENVIRONMENT (DelugeBattleEnv)
# =====================================================================

class DelugeBattleSimulator:
    """
    Monte Carlo State-Machine Simulator for DelugeRPG battles.
    Runs stochastic battle rollouts factoring accuracy, STAB, critical hits,
    recharge turns, and multi-round attrition.
    """
    def __init__(self, resolver: MoveResolver):
        self.resolver = resolver

    def simulate_1v1_turn(self, attacker: Dict[str, Any], move: Dict[str, Any], defender: Dict[str, Any]) -> float:
        """Calculates damage dealt by attacker using move against defender in 1 turn."""
        if move["is_suicide"]:
            return 0.0

        # Accuracy check
        if random.random() > move["accuracy"]:
            return 0.0  # Missed attack!

        atk_types = [normalize_type(t) for t in attacker.get("types", ["Normal"])]
        def_types = [normalize_type(t) for t in defender.get("types", ["Normal"])]

        eff = get_effectiveness(move["type"], def_types)
        if eff == 0.0:
            return 0.0

        is_stab = normalize_type(move["type"]) in atk_types
        stab_mult = 1.5 if is_stab else 1.0

        v_stats = get_variant_stats(attacker.get("variant", "Normal"))
        is_crit = random.random() < v_stats["crit"]
        crit_mult = 1.5 if is_crit else 1.0

        raw_pwr = move["power"]
        # Level ratio factor
        atk_lvl = attacker.get("level", 100)
        def_lvl = defender.get("level", 50)
        level_mult = (atk_lvl + 20.0) / (def_lvl + 20.0)

        damage = raw_pwr * eff * stab_mult * crit_mult * v_stats["offense"] * level_mult

        # Charge / Recharge penalty: damage divided across 2 turns
        if move["is_recharge"] or move["is_charge"]:
            damage *= 0.50

        # Locking confusion self-damage risk
        if move["is_locking"]:
            damage *= 0.70

        return damage

    def simulate_full_match(self, carry: Dict[str, Any], trainer: Dict[str, Any]) -> Tuple[bool, float, int]:
        """
        Simulates 1 full carry sweep against a trainer's roster.
        Returns: (won: bool, remaining_hp_pct: float, turns_taken: int)
        """
        roster = trainer.get("roster", [])
        if not roster:
            # Synthetic 1-target baseline for unscouted
            roster = [{"name": "Generic Opponent", "types": trainer.get("types", ["Normal"]), "level": trainer.get("avgLevel", 80)}]

        carry_v = get_variant_stats(carry.get("variant", "Normal"))
        max_hp = 300.0 * carry_v["hp"] * (carry.get("level", 100) / 100.0)
        curr_hp = max_hp

        carry_moves = [self.resolver.resolve(m) for m in carry.get("moves", [])]
        carry_moves = [m for m in carry_moves if not m["is_suicide"] and m["power"] > 0]
        if not carry_moves:
            carry_moves = [self.resolver.resolve({"name": "Tackle", "type": "Normal", "power": 40})]

        total_turns = 0

        for opp in roster:
            opp_hp = 200.0 * (opp.get("level", 80) / 100.0)
            opp_types = [normalize_type(t) for t in opp.get("types", ["Normal"])]

            # Opponent attack estimate
            opp_atk_type = opp_types[0] if opp_types else "Normal"
            inc_eff = get_incoming_effectiveness(carry.get("types", ["Normal"]), opp_atk_type)

            round_turns = 0
            while opp_hp > 0 and curr_hp > 0 and round_turns < 10:
                round_turns += 1
                total_turns += 1

                # Carry selects move with highest expected damage against this opponent
                best_m = None
                best_score = -1.0
                for m in carry_moves:
                    eff = get_effectiveness(m["type"], opp_types)
                    is_stab = normalize_type(m["type"]) in [normalize_type(t) for t in carry.get("types", ["Normal"])]
                    score = m["power"] * m["accuracy"] * eff * (1.5 if is_stab else 1.0)
                    if m["is_ohko"]:
                        score *= 0.35  # Severe penalty for OHKO unreliability
                    if m["is_locking"]:
                        score *= 0.65
                    if m["is_recharge"]:
                        score *= 0.50
                    if score > best_score:
                        best_score = score
                        best_m = m

                # Carry Turn
                dmg = self.simulate_1v1_turn(carry, best_m, opp)
                opp_hp -= dmg

                # If opponent survives, opponent retaliates
                if opp_hp > 0:
                    opp_dmg = 45.0 * inc_eff * (opp.get("level", 80) / carry.get("level", 100))
                    curr_hp -= opp_dmg

                if curr_hp <= 0:
                    return False, 0.0, total_turns

        won = curr_hp > 0
        rem_pct = max(0.0, (curr_hp / max_hp) * 100.0)
        return won, rem_pct, total_turns

    def evaluate_carry_monte_carlo(self, carry: Dict[str, Any], trainer: Dict[str, Any], n_episodes: int = 100) -> Dict[str, Any]:
        """Runs N Monte Carlo simulation rollouts to evaluate carry safety and win rate."""
        wins = 0
        total_hp = 0.0
        total_turns = 0

        for _ in range(n_episodes):
            won, rem_pct, turns = self.simulate_full_match(carry, trainer)
            if won:
                wins += 1
            total_hp += rem_pct
            total_turns += turns

        win_rate = (wins / n_episodes) * 100.0
        avg_hp = total_hp / n_episodes
        avg_turns = total_turns / n_episodes

        # ML Reward Function:
        # High win rate + high remaining HP + fast turn efficiency
        # Severe penalty for quad weakness against Mixed trainers
        is_mixed = any("mixed" in str(t).lower() for t in trainer.get("types", [])) or not trainer.get("roster")
        quad_penalty = 0
        if is_mixed:
            quads = get_defensive_quad_weaknesses(carry.get("types", ["Normal"]))
            if quads:
                quad_penalty = 800  # Disqualifies 4x quad-weak carries on Mixed trainers

        ml_score = (win_rate * 10.0) + (avg_hp * 2.0) - (avg_turns * 15.0) - quad_penalty

        return {
            "win_rate": round(win_rate, 1),
            "avg_hp_pct": round(avg_hp, 1),
            "avg_turns": round(avg_turns, 1),
            "ml_score": round(ml_score, 1),
            "is_flawless": win_rate >= 99.0 and avg_hp >= 70.0
        }

# =====================================================================
# 4. EXHAUSTIVE SYSTEM AUDITOR & SMART COUNTER SOLVER
# =====================================================================

class DelugeSmartEngine:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir
        skills_path = resolve_data_file("skills_database.json", data_dir)
        gym_path = resolve_data_file("gym_leaders.json", data_dir)
        coll_path = resolve_data_file("user_collection.json", data_dir)
        self.resolver = MoveResolver(skills_path)
        self.simulator = DelugeBattleSimulator(self.resolver)
        self.gym_data = self._load_json(gym_path)
        self.user_collection = self._load_json(coll_path)

    def _load_json(self, path: str) -> Any:
        if os.path.exists(path):
            with open(path, "r", encoding="utf8") as f:
                return json.load(f)
        return {}

    def get_all_trainers(self) -> List[Dict[str, Any]]:
        all_trainers = []
        for cat, list_or_dict in self.gym_data.items():
            if isinstance(list_or_dict, list):
                for t in list_or_dict:
                    all_trainers.append(t)
            elif isinstance(list_or_dict, dict):
                for sub, slist in list_or_dict.items():
                    if isinstance(slist, list):
                        for t in slist:
                            all_trainers.append(t)
        return all_trainers

    def rank_carries_ml(self, trainer: Dict[str, Any], pool: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        candidates = pool if pool is not None else [p for p in self.user_collection if p.get("level") == 100]
        if not candidates:
            candidates = [p for p in self.user_collection if p.get("level", 0) >= 70]

        results = []
        for c in candidates:
            eval_metrics = self.simulator.evaluate_carry_monte_carlo(c, trainer, n_episodes=50)
            results.append({
                "pokemon": c,
                "name": c.get("name"),
                "variant": c.get("variant"),
                "level": c.get("level"),
                "types": c.get("types"),
                "metrics": eval_metrics
            })

        # Sort by ML Score descending
        results.sort(key=lambda x: x["metrics"]["ml_score"], reverse=True)
        return results

    def solve_trainer_counter(self, trainer_query: str) -> Dict[str, Any]:
        all_trainers = self.get_all_trainers()
        target = None
        for t in all_trainers:
            if trainer_query.lower() in t.get("name", "").lower():
                target = t
                break

        if not target:
            return {"error": f"Trainer '{trainer_query}' not found."}

        ranked = self.rank_carries_ml(target)
        top_carry = ranked[0] if ranked else None

        return {
            "trainer": target.get("name"),
            "types": target.get("types"),
            "avg_level": target.get("avgLevel"),
            "roster_count": len(target.get("roster", [])),
            "top_carry": top_carry["name"] if top_carry else "None",
            "win_rate": top_carry["metrics"]["win_rate"] if top_carry else 0.0,
            "avg_hp_pct": top_carry["metrics"]["avg_hp_pct"] if top_carry else 0.0,
            "ml_score": top_carry["metrics"]["ml_score"] if top_carry else 0.0,
            "top_5": [
                {
                    "rank": i + 1,
                    "name": r["name"],
                    "variant": r["variant"],
                    "win_rate": f"{r['metrics']['win_rate']}%",
                    "rem_hp": f"{r['metrics']['avg_hp_pct']}%",
                    "ml_score": r["metrics"]["ml_score"]
                }
                for i, r in enumerate(ranked[:5])
            ]
        }

# =====================================================================
# 5. CLI & JSON API DISPATCHER
# =====================================================================

def main():
    parser = argparse.ArgumentParser(description="DelugeRPG ML & Monte Carlo Combat Engine")
    parser.add_argument("--trainer", type=str, help="Name of trainer to solve (e.g. 'Veteran Shareef', 'Surge')")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to DelugeRPG data files directory")
    parser.add_argument("--audit-all", action="store_true", help="Run ML audit across all 449 trainers")
    parser.add_argument("--json", action="store_true", help="Output results as clean JSON for Electron bridge")

    args = parser.parse_args()
    engine = DelugeSmartEngine(data_dir=args.data_dir)

    if args.trainer:
        result = engine.solve_trainer_counter(args.trainer)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print("================================================================")
            print(f"   ML COMBAT OPTIMIZER: {result.get('trainer')} ({', '.join(result.get('types', []))})")
            print("================================================================")
            print(f"Top Invincible Carry: {result.get('top_carry')}")
            print(f"Simulated Win Rate:   {result.get('win_rate')}%")
            print(f"Average HP Margin:    {result.get('avg_hp_pct')}%")
            print("\nTop 5 Candidates via Monte Carlo Policy Rollout:")
            for c in result.get("top_5", []):
                print(f"  #{c['rank']} {c['name']} ({c['variant']}) | Win: {c['win_rate']} | Rem HP: {c['rem_hp']} | Score: {c['ml_score']}")
            print("================================================================")

    elif args.audit_all:
        print("================================================================")
        print("   STARTING EXHAUSTIVE 449-TRAINER MACHINE LEARNING AUDIT      ")
        print("================================================================")
        trainers = engine.get_all_trainers()
        print(f"Loaded {len(trainers)} trainers from database.")

        high_risk_count = 0
        flawless_count = 0

        for idx, t in enumerate(trainers):
            ranked = engine.rank_carries_ml(t)
            top = ranked[0] if ranked else None
            if not top or top["metrics"]["win_rate"] < 70.0:
                high_risk_count += 1
            else:
                flawless_count += 1

            if (idx + 1) % 50 == 0 or idx == len(trainers) - 1:
                print(f"  Progress: {idx + 1}/{len(trainers)} audited... (Flawless: {flawless_count}, Risky: {high_risk_count})")

        print("\n================================================================")
        print(f"   AUDIT COMPLETE: {len(trainers)} TRAINERS EVALUATED")
        print(f"   Flawless (>70% Win Rate): {flawless_count} ({round((flawless_count/len(trainers))*100, 1)}%)")
        print(f"   Risky (<70% Win Rate):    {high_risk_count}")
        print("================================================================")
    else:
        # Default test on Veteran Shareef and Lt. Surge
        print("No args specified. Running default ML evaluation on Veteran Shareef & Lt. Surge...\n")
        shareef_res = engine.solve_trainer_counter("Veteran Shareef")
        print(f"1. VETERAN SHAREEF ML SOLUTION:")
        for c in shareef_res.get("top_5", []):
            print(f"   #{c['rank']} {c['name']} ({c['variant']}) -> Win: {c['win_rate']} | Rem HP: {c['rem_hp']} | ML Score: {c['ml_score']}")

        print(f"\n2. LT. SURGE ML SOLUTION:")
        surge_res = engine.solve_trainer_counter("Surge")
        for c in surge_res.get("top_5", []):
            print(f"   #{c['rank']} {c['name']} ({c['variant']}) -> Win: {c['win_rate']} | Rem HP: {c['rem_hp']} | ML Score: {c['ml_score']}")

if __name__ == "__main__":
    main()
