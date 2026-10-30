// team_engine.js - DelugeRPG Battle Matchup and Counter Calculator
// Evaluates Type Matchups, STAB, Move Coverage, Base Power, Resistances, and Level

let skillsMap = null;
try {
  skillsMap = require('./skills_database.json').moves || {};
} catch (e) {
  skillsMap = {};
}

let typeChartDatabase = null;
try {
  typeChartDatabase = require('./type_chart_database.json');
} catch (e) {
  typeChartDatabase = null;
}

const ALL_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

const TYPE_CHART = {
  Normal:   { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire:     { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water:    { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Grass:    { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Electric: { Water: 2, Grass: 0.5, Electric: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Ice:      { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison:   { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground:   { Fire: 2, Grass: 0.5, Electric: 2, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying:   { Grass: 2, Electric: 0.5, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic:  { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug:      { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock:     { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost:    { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon:   { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Steel:    { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Dark:     { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Fairy:    { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
};

function normalizeType(type) {
  if (!type || typeof type !== 'string') return 'Normal';
  const clean = type.trim();
  if (!clean) return 'Normal';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function normalizeDefenderTypes(types) {
  if (!types) return ['Normal'];
  let list = [];
  if (typeof types === 'string') {
    if (types.includes('/')) {
      list = types.split('/').map(t => normalizeType(t)).filter(Boolean);
    } else {
      list = [normalizeType(types)];
    }
  } else if (Array.isArray(types)) {
    for (const t of types) {
      if (!t) continue;
      if (typeof t === 'string' && t.includes('/')) {
        list.push(...t.split('/').map(sub => normalizeType(sub)));
      } else {
        list.push(normalizeType(t));
      }
    }
  } else {
    list = ['Normal'];
  }
  const unique = Array.from(new Set(list)).filter(Boolean);
  return unique.length > 0 ? unique : ['Normal'];
}

function getMoveEffectiveness(attackType, defenderTypes) {
  const atk = normalizeType(attackType);
  const defs = normalizeDefenderTypes(defenderTypes);
  if (!atk || !TYPE_CHART[atk]) return 1.0;
  let mult = 1.0;
  for (const def of defs) {
    if (!def) continue;
    const chart = TYPE_CHART[atk];
    if (chart && chart[def] !== undefined) {
      mult *= chart[def];
    }
  }
  return mult;
}

function getDefensiveResistance(defenderTypes, attackerTypes) {
  let mult = 1.0;
  const atks = normalizeDefenderTypes(attackerTypes);
  for (const atk of atks) {
    mult *= getMoveEffectiveness(atk, defenderTypes);
  }
  return mult;
}

function getDefensiveProfile(defenderTypes, isInverse = false) {
  let targetTypes = defenderTypes;
  let inverseMode = Boolean(isInverse);
  if (defenderTypes && typeof defenderTypes === 'object' && !Array.isArray(defenderTypes)) {
    if (defenderTypes.types) targetTypes = defenderTypes.types;
    if (isNegativePokemon(defenderTypes)) inverseMode = true;
  }
  const defs = normalizeDefenderTypes(targetTypes);
  const matchups = {};
  const quadWeaknesses = [];
  const weaknesses = [];
  const neutral = [];
  const resists = [];
  const doubleResists = [];
  const immunities = [];

  for (const atk of ALL_TYPES) {
    const m = getTypeMultiplier(atk, defs, inverseMode);
    matchups[atk] = m;
    if (m === 0) immunities.push(atk);
    else if (m === 0.25) doubleResists.push(atk);
    else if (m === 0.5) resists.push(atk);
    else if (m === 1.0) neutral.push(atk);
    else if (m === 2.0) weaknesses.push(atk);
    else if (m === 4.0) quadWeaknesses.push(atk);
  }

  return {
    types: defs,
    matchups,
    quadWeaknesses,
    weaknesses,
    neutral,
    resists,
    doubleResists,
    immunities
  };
}

const STATUS_KEYWORDS = [
  'dance', 'mind', 'wave', 'protect', 'detect', 'spore', 'powder', 'guard', 'wish',
  'rest', 'heal', 'recover', 'roost', 'screen', 'smokescreen', 'taunt', 'substitute',
  'haze', 'curse', 'cheer', 'belly drum', 'nasty plot', 'bulk up', 'coil', 'quiver',
  'growl', 'leer', 'whip', 'screech', 'flash', 'minimize', 'amnesia', 'barrier',
  'acid armor', 'iron defense', 'string shot', 'teleport', 'splash', 'encore',
  'disable', 'attract', 'torment', 'flatter', 'memento', 'baton pass', 'trick',
  'switcheroo', 'confuse ray', 'hypnosis', 'sing', 'sweet kiss', 'yawn', 'will-o-wisp',
  'toxic', 'glare', 'stun spore', 'cotton spore', 'agility', 'growth', 'sharpen',
  'defog', 'mist', 'safeguard', 'tailwind', 'ingrain', 'aqua ring', 'pain split',
  'spikes', 'toxic spikes', 'stealth rock', 'sticky web', 'roar', 'whirlwind'
];

function isLikelyStatusMove(moveName) {
  const lower = (moveName || '').toLowerCase().trim();
  return STATUS_KEYWORDS.some(kw => lower.includes(kw));
}

function estimateMovePower(moveName) {
  const lower = (moveName || '').toLowerCase().trim();
  if (isLikelyStatusMove(lower)) return 0;
  if (/blast|beam|storm|cannon|crush|quake|force|hyper|outrage|meteor|overheat|eruption|spout|doom|judgement|cataclysm|apocalypse|gigaton|climax|barrage|lance|cudgel|cleave|burnup|vcreate|headsmash|dragonenergy|astralbarrage|glaciallance|collision|drift|starstorm/i.test(lower)) {
    return 110;
  }
  if (/pulse|burst|cutter|fang|claw|tail|punch|kick|slash|strike|hammer|slam|thrust|drill|blade|rush|dive|bomb|song|horn|impact|press|clap|rain|headbutt|tackle|crunch|wave|smash|blaze|flame/i.test(lower)) {
    return 80;
  }
  return 60;
}

// DelugeRPG class abilities (current rules: +Atk/+Def/+Spe stats no longer exist).
//   Dark     : +25% attack power
//   Shiny    : +25% HP
//   Chrome   : +35% HP, +50% critical hit chance
//   Metallic : immune to status ailments (poison, burn, sleep, freeze...)
//   Ghostly  : chance to make the opponent flinch
//   Shadow   : disables Metallic / Ghostly abilities
//   Mirage   : reactive (depends on opponent class) - treated as neutral
//   Negative : INVERSE type matchups in regular battles
//   Normal / Retro : no ability
function getVariantMultipliers(variant) {
  const v = (variant || '').toLowerCase().trim();
  let offense = 1.0;
  let hp = 1.0;
  let crit = 1.0;
  let statusImmune = false;
  let flinch = false;
  let inverse = false;

  if (v === 'dark') {
    offense = 1.25;
  } else if (v === 'shiny') {
    hp = 1.25;
  } else if (v === 'chrome') {
    hp = 1.35;
    crit = 1.5;
  } else if (v === 'metallic') {
    statusImmune = true;
  } else if (v === 'ghostly') {
    flinch = true;
  } else if (v === 'negative') {
    inverse = true;
  }
  // 'defense' kept as an alias of effective bulk (HP) for backward compatibility
  return { offense, defense: hp, hp, speed: 1.0, crit, statusImmune, flinch, inverse };
}

function isNegativePokemon(poke) {
  if (!poke) return false;
  if (typeof poke === 'string') {
    const s = poke.trim().toLowerCase();
    return s === 'negative' || /(?:^|\s)negative\b/i.test(s);
  }
  if (typeof poke === 'object') {
    if (poke.variant && poke.variant.toString().trim().toLowerCase() === 'negative') return true;
    if (typeof poke.name === 'string' && /(?:^|\s)negative\b/i.test(poke.name)) return true;
  }
  return false;
}

function isInverseVariant(variant) {
  return isNegativePokemon(variant);
}

// Type multiplier with optional inverse-battle rules (used for Negative class Pokemon):
// super-effective <-> not-very-effective, immunities become super-effective.
function getTypeMultiplier(attackType, defenderTypes, inverse) {
  if (!inverse) return getMoveEffectiveness(attackType, defenderTypes);
  const atk = normalizeType(attackType);
  const defs = normalizeDefenderTypes(defenderTypes);
  if (!atk || !TYPE_CHART[atk]) return 1.0;
  let mult = 1.0;
  for (const def of defs) {
    if (!def) continue;
    const raw = TYPE_CHART[atk][def];
    if (raw === undefined || raw === 1) continue;
    mult *= (raw === 0 || raw < 1) ? 2.0 : 0.5;
  }
  return mult;
}

// Damage multiplier of OUR Pokemon's move against an opponent typing.
// Negative class: DelugeRPG applies Inverse Battle type matchups in regular battles.
// If exactly one of (attacker, defender) is Negative, inverse chart applies.
// If both or neither are Negative, regular chart applies.
function outgoingEffectiveness(poke, moveType, oppTypes, opp = null) {
  let targetTypes = oppTypes;
  let targetOpp = opp;
  if (oppTypes && typeof oppTypes === 'object' && !Array.isArray(oppTypes)) {
    if (oppTypes.types) targetTypes = oppTypes.types;
    if (!targetOpp) targetOpp = oppTypes;
  }
  const mType = normalizeType(moveType);
  const defs = normalizeDefenderTypes(targetTypes);
  const attackerIsNegative = isNegativePokemon(poke);
  const defenderIsNegative = isNegativePokemon(targetOpp);
  const isInverse = Boolean(attackerIsNegative ^ defenderIsNegative);
  return getTypeMultiplier(mType, defs, isInverse);
}

// Damage multiplier of an opponent attack type against OUR Pokemon
function incomingEffectiveness(poke, attackType, attacker = null) {
  const defTypes = normalizeDefenderTypes((poke && poke.types) || ['Normal']);
  const atk = normalizeType(attackType);
  const defenderIsNegative = isNegativePokemon(poke);
  const attackerIsNegative = isNegativePokemon(attacker);
  const isInverse = Boolean(defenderIsNegative ^ attackerIsNegative);
  return getTypeMultiplier(atk, defTypes, isInverse);
}

// Defensive exposure of a Pokemon across a trainer's whole roster.
// For each opponent we assume it attacks with its most damaging STAB type
// (plus any observed move types stored on the roster entry as knownMoveTypes).
// avg  : average incoming multiplier per opponent (1.0 = neutral to everything)
// effective : avg divided by HP class bonus (Shiny / Chrome survive longer)
function getRosterExposure(poke, trainer) {
  const oppList = (trainer && trainer.roster && trainer.roster.length > 0)
    ? trainer.roster
    : [{ name: (trainer && trainer.name) || 'Opponent', types: (trainer && trainer.types) || ['Normal'] }];
  let total = 0;
  let worst = 0;
  let worstStab = 0;
  let leadExposure = 0;
  let resisted = 0;
  let immuneCount = 0;
  let weakCount = 0;
  let quadWeakCount = 0;
  let opponentsWithWeakness = 0;

  for (let i = 0; i < oppList.length; i++) {
    const opp = oppList[i];
    const oppDefenderTypes = normalizeDefenderTypes(opp.types || ['Normal']);
    const moveTypesFromMoves = Array.isArray(opp.moves)
      ? opp.moves.map(m => {
          const rm = resolveMove(m);
          return (!rm.isStatus && rm.power > 0) ? rm.type : null;
        }).filter(Boolean)
      : [];
    const attackTypes = Array.from(new Set([].concat(
      oppDefenderTypes,
      opp.knownMoveTypes || [],
      moveTypesFromMoves
    )));

    let m = 0;
    let stabM = 0;
    for (const at of attackTypes) {
      const inc = incomingEffectiveness(poke, at, opp);
      if (inc > m) m = inc;
      if (oppDefenderTypes.includes(at) && inc > stabM) stabM = inc;
    }
    total += m;
    if (i === 0) leadExposure = m;
    if (m > worst) worst = m;
    if (stabM > worstStab) worstStab = stabM;
    if (m === 0.0) immuneCount++;
    else if (m <= 0.5) resisted++;
    else if (m >= 4.0) quadWeakCount++;
    else if (m >= 2.0) weakCount++;
    if (m >= 2.0) opponentsWithWeakness++;
  }

  const isMixedTrainer = (trainer && (
    (trainer.types && trainer.types.some(t => /mixed/i.test(t))) ||
    (!trainer.types || trainer.types.length === 0)
  ));
  if (isMixedTrainer) {
    const defProfile = getDefensiveProfile(poke && poke.types);
    if (defProfile.quadWeaknesses.length > 0) {
      worst = 4.0;
      worstStab = 4.0;
      quadWeakCount = Math.max(quadWeakCount, defProfile.quadWeaknesses.length);
      leadExposure = Math.max(leadExposure, 4.0);
    } else if (defProfile.weaknesses.length > 0) {
      worst = Math.max(worst, 2.0);
      worstStab = Math.max(worstStab, 2.0);
      weakCount = Math.max(weakCount, defProfile.weaknesses.length);
    }
  }

  const avg = oppList.length > 0 ? total / oppList.length : 1.0;
  const v = getVariantMultipliers(poke && poke.variant);
  return {
    avg,
    worst,
    worstStab,
    leadExposure,
    resisted,
    immuneCount,
    weakCount,
    quadWeakCount,
    opponentsWithWeakness,
    count: oppList.length,
    effective: avg / v.hp
  };
}

// Rank carry candidates defense-first with Double-Type Intelligence:
// A carry must GUARANTEE the survival of the low-level team by:
// 1. Dominating Opponent 1 (the Lead) so it never faints on Turn 1.
// 2. Intelligently countering Double-Type opponents (especially high-level/Mega bosses):
//    - Exploiting 4.0x quad weaknesses on dual-type bosses for instant 1-shot KOs.
//    - Strictly avoiding dual-type resistance traps (< 1.0x resisted attacks).
//    - Resisting dual-type boss STABs to prevent fatal physical/special damage.
// 3. Ensuring no roster-wide quad weaknesses or wall immunities.
function rankCarries(pool, trainer) {
  const oppList = (trainer && trainer.roster && trainer.roster.length > 0)
    ? trainer.roster
    : [{ types: (trainer && trainer.types) || ['Normal'] }];
  const avgLvl = (trainer && trainer.avgLevel) || 50;

  const mapped = (pool || []).map(p => {
    const exposure = getRosterExposure(p, trainer);
    let offense = 0;
    let superEffectiveCount = 0;
    let quadHitsCount = 0;
    let stabSeHitsCount = 0;
    let ohkoTargetCount = 0;
    let minEffectivePower = Infinity;
    let totalEffectivePower = 0;
    let walledCount = 0;
    let resistedAttackCount = 0;
    let dualTypeResistedTrapCount = 0;
    let dualTypeBossSniperBonus = 0;
    let dualTypeDoubleResistBonus = 0;
    let dualTypeWeakPenalty = 0;
    let hasOhkoTrap = false;
    let hasMultiTurnTrap = false;
    let recoilHitCount = 0;
    let preemptedQuadCount = 0;
    let preemptedWeakCount = 0;

    const pokeLevel = typeof p.level === 'number' ? p.level : 50;
    oppList.forEach((opp, oppIdx) => {
      const oppTypes = normalizeDefenderTypes(opp.types || ['Normal']);
      const oppLvl = opp.level || avgLvl;
      const oppVar = getVariantMultipliers(opp.variant);
      const oppHpMult = oppVar.hp || 1.0;
      const lvlRatio = oppLvl > 0 ? Math.min(1.5, Math.max(0.25, pokeLevel / oppLvl)) : 1.0;
      const scoreObj = scoreVsSingleOpponent(p, oppTypes, oppLvl, opp.moves, opp);
      offense += scoreObj.totalScore;
      const bestMove = scoreObj.bestMove;
      const bestMult = bestMove ? bestMove.multiplier : 0;
      const isReliableMove = Boolean(bestMove && !bestMove.isOhko && !bestMove.isRecharge && !bestMove.isCharge && !bestMove.isFixedDamage);
      const rawEffPwr = bestMove
        ? (isReliableMove ? (bestMove.isRecoil ? bestMove.effectivePower * 0.75 : bestMove.effectivePower) : (bestMove.isOhko || bestMove.isFixedDamage ? 0 : bestMove.effectivePower * 0.5))
        : 0;
      const effPwr = (rawEffPwr * lvlRatio) / oppHpMult;

      if (bestMove && bestMove.isOhko) {
        hasOhkoTrap = true;
      }
      if (bestMove && (bestMove.isRecharge || bestMove.isCharge)) {
        hasMultiTurnTrap = true;
      }
      if (bestMove && bestMove.isRecoil) {
        recoilHitCount++;
      }

      // Check for pre-empted benched threats (1-shot before retaliation)
      const moveTypesFromMoves = Array.isArray(opp.moves)
        ? opp.moves.map(m => {
            const rm = resolveMove(m);
            return (!rm.isStatus && rm.power > 0) ? rm.type : null;
          }).filter(Boolean)
        : [];
      const oppAttackTypes = Array.from(new Set([].concat(
        normalizeDefenderTypes(opp.types || ['Normal']),
        opp.knownMoveTypes || [],
        moveTypesFromMoves
      )));
      let oppMaxInc = 0;
      for (const ot of oppAttackTypes) {
        const inc = incomingEffectiveness(p, ot, opp);
        if (inc > oppMaxInc) oppMaxInc = inc;
      }

      const isFastOhko = (oppIdx > 0 && effPwr >= 180 && pokeLevel >= 95 && (pokeLevel >= oppLvl || pokeLevel >= (oppLvl + 25) || pokeLevel >= 100) && bestMove && !bestMove.isRecoil && !bestMove.isOhko && (bestMove.accuracy >= 90));
      if (isFastOhko) {
        if (oppMaxInc >= 4.0) preemptedQuadCount++;
        else if (oppMaxInc >= 2.0) preemptedWeakCount++;
      }

      if (bestMult >= 4.0) quadHitsCount++;
      else if (bestMult >= 2.0) superEffectiveCount++;
      else if (bestMult < 1.0 && bestMult > 0.0) resistedAttackCount++;

      const pokeDefenderTypes = normalizeDefenderTypes(p.types || ['Normal']);
      if (bestMove && pokeDefenderTypes.includes(bestMove.type) && bestMult >= 2.0) {
        stabSeHitsCount++;
      }

      if (effPwr >= 180) {
        ohkoTargetCount++;
      }
      if (effPwr < minEffectivePower) {
        minEffectivePower = effPwr;
      }
      totalEffectivePower += effPwr;

      if (!bestMove || bestMult === 0.0 || bestMove.power === 0) {
        walledCount++;
      }

      // Double-Type Opponent Intelligence
      const isDual = oppTypes.length >= 2;
      if (isDual) {
        // Resistance trap: If our best move is resisted (< 1.0x) by a dual-type opponent,
        // it leaves the carry vulnerable to retaliatory STAB attacks!
        if (bestMult < 1.0) {
          dualTypeResistedTrapCount++;
        }
        // Quad-weakness sniping: If a dual-type boss (>= 80 or Mega) has a 4.0x weakness,
        // reward candidates that can 1-shot it before it can ever attack!
        if (bestMult >= 4.0) {
          const isBoss = (opp.level && opp.level >= 80) || /mega/i.test(opp.name || '');
          dualTypeBossSniperBonus += isBoss ? 250 : 150;
        }

        // Defensive resistance check against dual-type boss STABs
        const inc1 = incomingEffectiveness(p, oppTypes[0], opp);
        const inc2 = incomingEffectiveness(p, oppTypes[1], opp);
        if (inc1 <= 0.5 && inc2 <= 0.5) {
          dualTypeDoubleResistBonus += 80; // Resists BOTH STABs of the dual-type boss!
        } else if ((inc1 <= 0.5 && inc2 <= 1.0) || (inc2 <= 0.5 && inc1 <= 1.0)) {
          dualTypeDoubleResistBonus += 35; // Resists one STAB, neutral to other
        }
        if (inc1 >= 2.0 || inc2 >= 2.0) {
          if (!isFastOhko) {
            dualTypeWeakPenalty += 150;
          }
        }
      }
    });
    offense = offense / oppList.length;
    if (minEffectivePower === Infinity) minEffectivePower = 0;
    const avgEffectivePower = totalEffectivePower / oppList.length;
    const totalSeHits = superEffectiveCount + quadHitsCount;
    const isFullTeamOhko = (ohkoTargetCount === oppList.length);
    const isFullTeamSE = (totalSeHits === oppList.length);

    const v = getVariantMultipliers(p.variant);
    const levelScore = (pokeLevel / 100) * 150;

    // Severe level deficit penalty: An under-leveled Pokemon cannot reliably carry
    let levelDeficitPenalty = 0;
    if (pokeLevel < avgLvl && exposure.immuneCount < oppList.length) {
      levelDeficitPenalty = (avgLvl - pokeLevel) * 35;
    }

    // Lead Opponent (Slot 1) Safety:
    // Carry must never take super-effective damage on Turn 1
    const leadOpp = oppList[0] || { types: ['Normal'] };
    const leadScoreObj = scoreVsSingleOpponent(p, leadOpp.types || ['Normal'], avgLvl, leadOpp.moves, leadOpp);
    const leadEff = (leadScoreObj.bestMove && leadScoreObj.bestMove.multiplier) || 1.0;
    const leadOHKO = (pokeLevel >= avgLvl) && ((leadEff >= 2.0 && leadScoreObj.bestMove.effectivePower >= 90) || (leadScoreObj.bestMove && leadScoreObj.bestMove.effectivePower >= 180));

    let leadDefenseScore = 0;
    if (exposure.leadExposure === 0.0) leadDefenseScore = +100;
    else if (exposure.leadExposure <= 0.25) leadDefenseScore = +60;
    else if (exposure.leadExposure <= 0.5) leadDefenseScore = +40;
    else if (exposure.leadExposure <= 1.0) leadDefenseScore = +20;
    else if (exposure.leadExposure >= 4.0) leadDefenseScore = -600;
    else if (exposure.leadExposure >= 2.0) leadDefenseScore = -300;

    if (leadOHKO) leadDefenseScore += 120;

    const isMixedTrainer = Boolean(trainer && (
      (trainer.types && trainer.types.some(t => /mixed/i.test(t))) ||
      (!trainer.types || trainer.types.length === 0)
    ));

    const isPureSpeedSweeper = Boolean(
      pokeLevel >= 95 &&
      (pokeLevel >= (avgLvl + 25) || pokeLevel >= 100) &&
      (isFullTeamOhko || (ohkoTargetCount >= oppList.length - 1 && exposure.leadExposure <= 0.5)) &&
      exposure.leadExposure <= 1.0 &&
      (exposure.worstStab || 0) <= 1.0 &&
      walledCount === 0 &&
      dualTypeResistedTrapCount === 0 &&
      !hasOhkoTrap &&
      recoilHitCount === 0 &&
      !isMixedTrainer &&
      (exposure.quadWeakCount <= preemptedQuadCount)
    );

    // Roster-wide defense & 1-hit-KO sweep bonuses
    // Prioritize carries that can 1-hit-KO the ENTIRE opponent team (>= 180 effective power on every opponent)
    // so opponents never get a chance to retaliate, while keeping strict defensive safety.
    const immunityScore = exposure.immuneCount * 100;
    const resistScore = exposure.resisted * 45;
    const weakPenalty = isPureSpeedSweeper
      ? (preemptedWeakCount * 35)
      : (exposure.weakCount * 150);
    const quadPenalty = isPureSpeedSweeper
      ? (preemptedQuadCount * 80)
      : (exposure.quadWeakCount * 600);
    const walledPenalty = walledCount * 600;
    const resistedAttackPenalty = resistedAttackCount * 320;
    const multiTurnPenalty = hasMultiTurnTrap ? 300 : 0;
    const speedSweeperBonus = isPureSpeedSweeper ? 400 : 0;

    // Multi-opponent weakness attrition penalty:
    // In DelugeRPG battles with 50/50 turn order, taking super-effective damage from multiple opponents
    // causes the carry to faint over time from cumulative attrition.
    // Pure speed sweepers with clean STAB defense (worstStab <= 1.0) pre-empt benched off-type coverage threats without attrition.
    const attritionPenalty = (!isPureSpeedSweeper && exposure.opponentsWithWeakness >= 2)
      ? (exposure.opponentsWithWeakness * 250)
      : 0;

    const stabSeRatio = oppList.length > 0 ? (stabSeHitsCount / oppList.length) : 0;
    const stabSeBonus = Math.round(stabSeRatio * 750);

    // Full-Team 1-Hit-KO & Weakest-Link Power Scoring:
    // A carry is only as fast as its weakest attack against any member of the opponent's roster.
    const fullTeamOhkoBonus = isFullTeamOhko ? 800 : 0;
    const fullTeamSeBonus = (isFullTeamSE && stabSeHitsCount >= Math.ceil(oppList.length * 0.6)) ? 350 : 0;
    const ohkoRatioBonus = (ohkoTargetCount / oppList.length) * 500;
    const minPowerBonus = Math.min(450, minEffectivePower * 1.4);
    const avgPowerBonus = Math.min(350, avgEffectivePower * 0.8);
    const weakMoveFloorPenalty = (minEffectivePower < 135) ? ((135 - minEffectivePower) * 4.5) : 0;

    // Cumulative neutral attrition penalty (only applies if the carry CANNOT one-shot the opponents!)
    const nonOhkoOpponents = oppList.length - ohkoTargetCount;
    const neutralAttritionPenalty = (nonOhkoOpponents >= 2 && oppList.length >= 4 && (exposure.resisted + exposure.immuneCount) < 2)
      ? (nonOhkoOpponents * 55)
      : 0;

    // Class abilities for bulk and sweep reliability
    const statusBonus = v.statusImmune ? 60 : 0;
    const hpBonus = (v.hp > 1) ? Math.round((v.hp - 1) * 150) : 0;
    const flinchBonus = v.flinch ? 35 : 0;
    const critBonus = v.crit > 1 ? 45 : 0;
    const offenseBonus = v.offense > 1 ? 65 : 0;
    const coverageBonus = (totalSeHits / oppList.length) * 260 + (quadHitsCount * 95);

    const carryScore = offense
      + levelScore
      + leadDefenseScore
      + immunityScore
      + resistScore
      + fullTeamOhkoBonus
      + fullTeamSeBonus
      + ohkoRatioBonus
      + minPowerBonus
      + avgPowerBonus
      + dualTypeBossSniperBonus
      + dualTypeDoubleResistBonus
      + speedSweeperBonus
      + stabSeBonus
      - (dualTypeResistedTrapCount * 400)
      - resistedAttackPenalty
      - multiTurnPenalty
      - (recoilHitCount * 120)
      - weakMoveFloorPenalty
      - dualTypeWeakPenalty
      - weakPenalty
      - quadPenalty
      - walledPenalty
      - neutralAttritionPenalty
      - attritionPenalty
      - levelDeficitPenalty
      - (exposure.effective * (isPureSpeedSweeper ? 60 : 180))
      + statusBonus
      + hpBonus
      + flinchBonus
      + critBonus
      + offenseBonus
      + coverageBonus;

    return {
      poke: p,
      exposure,
      offense,
      carryScore,
      leadOHKO,
      ohkoTargetCount,
      minEffectivePower,
      avgEffectivePower,
      isFullTeamOhko,
      isFullTeamSE,
      isPureSpeedSweeper,
      walledCount,
      dualTypeResistedTrapCount,
      quadHitsCount,
      hasOhkoTrap
    };
  });

  const sortCarries = (a, b) => {
    const aFullOhko = a.isFullTeamOhko ? 1 : 0;
    const bFullOhko = b.isFullTeamOhko ? 1 : 0;
    if (bFullOhko !== aFullOhko) return bFullOhko - aFullOhko;
    const aPure = a.isPureSpeedSweeper ? 1 : 0;
    const bPure = b.isPureSpeedSweeper ? 1 : 0;
    if (bPure !== aPure) return bPure - aPure;
    if (b.ohkoTargetCount !== a.ohkoTargetCount) return b.ohkoTargetCount - a.ohkoTargetCount;
    return b.carryScore - a.carryScore || (b.poke.level || 0) - (a.poke.level || 0);
  };

  // Tier 1: Lead-safe (<= 1.0x), zero elemental weaknesses (< 2.0x) OR Certified Pure Speed Sweeper (pre-empts all benched threats with guaranteed 1-Hit KO sweep)
  const tier1 = mapped.filter(x => x.exposure.leadExposure <= 1.0 && (x.exposure.worst < 2.0 || x.isPureSpeedSweeper) && x.walledCount === 0 && x.dualTypeResistedTrapCount === 0 && !x.hasOhkoTrap && x.poke.level >= avgLvl);
  if (tier1.length > 0) {
    return tier1.sort(sortCarries);
  }

  // Tier 2: Lead-safe (<= 1.0x), no quad weaknesses (< 4.0x), not walled, no OHKO reliance, level >= avgLvl
  const tier2 = mapped.filter(x => x.exposure.leadExposure <= 1.0 && x.exposure.worst < 4.0 && x.walledCount === 0 && !x.hasOhkoTrap && x.poke.level >= avgLvl);
  if (tier2.length > 0) {
    return tier2.sort(sortCarries);
  }

  // Tier 3: Non-quad carries (< 4.0x) with lead OHKO or level advantage
  const tier3 = mapped.filter(x => x.exposure.worst < 4.0 && (x.leadOHKO || x.exposure.leadExposure <= 1.0));
  if (tier3.length > 0) {
    return tier3.sort(sortCarries);
  }

  // Tier 4: Fallback
  return mapped.sort(sortCarries);
}

// Dynamic Move Guidance for Carry:
// Evaluates best move vs Lead (Turn 1), and checks if any dual-type or high-level boss
// requires a different super-effective or quad-effective coverage move (e.g. Dragon Rush / Lava Plume).
function getCarryMoveGuidance(poke, trainer) {
  if (!poke) return 'Attack';
  const oppList = (trainer && trainer.roster && trainer.roster.length > 0)
    ? trainer.roster
    : [{ types: (trainer && trainer.types) || ['Normal'] }];

  const leadOpp = oppList[0] || { types: ['Normal'] };
  const leadScore = scoreVsSingleOpponent(poke, leadOpp.types || ['Normal'], leadOpp.level || 50, leadOpp.moves, leadOpp);
  const leadMove = (leadScore && leadScore.bestMove) ? leadScore.bestMove.name : 'Attack';
  const leadType = (leadScore && leadScore.bestMove) ? leadScore.bestMove.type : 'Normal';
  const leadPwr = (leadScore && leadScore.bestMove) ? leadScore.bestMove.power : 40;

  let bossMove = null;
  let maxBossMult = 0;
  let maxBossEffPwr = 0;
  for (let i = 1; i < oppList.length; i++) {
    const opp = oppList[i];
    const s = scoreVsSingleOpponent(poke, opp.types || ['Normal'], opp.level || 50, opp.moves, opp);
    if (s.bestMove && s.bestMove.name !== leadMove) {
      if (s.bestMove.multiplier >= 2.0 && (s.bestMove.multiplier > maxBossMult || (s.bestMove.multiplier === maxBossMult && s.bestMove.effectivePower > maxBossEffPwr))) {
        maxBossMult = s.bestMove.multiplier;
        maxBossEffPwr = s.bestMove.effectivePower;
        bossMove = s.bestMove.name;
      }
    }
  }

  if (bossMove) {
    return leadMove + ' / ' + bossMove;
  }
  const movePwrStr = leadPwr > 0 ? ' [' + leadPwr + ' Pwr]' : '';
  return leadMove + ' (' + leadType + ')' + movePwrStr;
}

// Get the single most effective or super-effective attack for a Pokemon across the trainer's ENTIRE roster.
// Does NOT assume 1v1 matchup: this Pokemon may fight multiple opponents (or the entire team).
function getRosterWideBestAttack(poke, trainer) {
  if (!poke) return 'Attack';
  const oppList = (trainer && trainer.roster && trainer.roster.length > 0)
    ? trainer.roster
    : [{ types: (trainer && trainer.types) || ['Normal'] }];

  const pokeMoves = (poke.moves || []).map(resolveMove).filter(m => !m.isStatus && m.power > 0);
  if (pokeMoves.length === 0) {
    const primaryType = (poke.types && poke.types[0]) ? normalizeType(poke.types[0]) : 'Normal';
    return primaryType + ' Attack';
  }

  const pokeTypes = normalizeDefenderTypes(poke.types || ['Normal']);
  const vMultipliers = getVariantMultipliers(poke.variant);

  let bestMove = null;
  let maxMoveScore = -Infinity;

  for (const m of pokeMoves) {
    const mType = normalizeType(m.type);
    const isStab = pokeTypes.includes(mType);
    let quadCount = 0;
    let seCount = 0;
    let neutralCount = 0;
    let resistedCount = 0;
    let immuneCount = 0;
    let totalEffPower = 0;

    for (const opp of oppList) {
      const oppTypes = normalizeDefenderTypes(opp.types || ['Normal']);
      const eff = outgoingEffectiveness(poke, mType, oppTypes, opp);
      const acc = m.isOhko ? 0.30 : (m.accuracy ? m.accuracy / 100 : 1.0);
      const effPwr = m.power * acc * eff * (isStab ? 1.5 : 1.0) * vMultipliers.offense;
      totalEffPower += effPwr;

      if (eff >= 4.0) quadCount++;
      else if (eff >= 2.0) seCount++;
      else if (eff >= 1.0) neutralCount++;
      else if (eff > 0.0) resistedCount++;
      else immuneCount++;
    }

    let score = totalEffPower
      + (quadCount * (m.isOhko ? 60 : 300))
      + (seCount * (m.isOhko ? 30 : 120))
      + (neutralCount * 30)
      - (resistedCount * 100)
      - (immuneCount * 600);

    if (isStab) score += 75;
    else score -= 40;
    if (m.isOhko) score -= 350;
    if (m.isLocking) score -= 160;
    if (m.isRecharge) score -= 260;
    if (m.isCharge) score -= 130;
    if (m.isSuicide) score -= 2500;

    if (score > maxMoveScore) {
      maxMoveScore = score;
      bestMove = {
        name: m.name,
        type: mType,
        power: m.power,
        quadCount,
        seCount,
        resistedCount,
        immuneCount,
        totalEffPower
      };
    }
  }

  if (!bestMove) {
    return pokeMoves[0].name;
  }

  const pwrStr = bestMove.power > 0 ? ' [' + bestMove.power + ' Pwr]' : '';
  return bestMove.name + ' (' + bestMove.type + ')' + pwrStr;
}

// Rank trainees by their ability to sweep/defeat opponents alongside the carry:
// Evaluates roster-wide super-effective power, quad hits, level, and survivability.
function rankTraineePartners(traineeList, trainer) {
  const oppList = (trainer && trainer.roster && trainer.roster.length > 0)
    ? trainer.roster
    : [{ types: (trainer && trainer.types) || ['Normal'] }];
  const avgLvl = (trainer && trainer.avgLevel) || 50;

  return (traineeList || []).map(t => {
    const tLvl = t.level || 1;
    let quadHits = 0;
    let seHits = 0;
    let ohkoCount = 0;
    let totalEffPower = 0;
    let walledCount = 0;
    let leadBonus = 0;

    oppList.forEach((opp, idx) => {
      const oppLvl = opp.level || avgLvl;
      const oppVar = getVariantMultipliers(opp.variant);
      const lvlRatio = oppLvl > 0 ? (tLvl / oppLvl) : 1.0;
      const s = scoreVsSingleOpponent(t, opp.types || ['Normal'], oppLvl, opp.moves, opp);
      if (s.bestMove) {
        const scaledPwr = (s.bestMove.effectivePower * Math.min(1.5, Math.max(0.2, lvlRatio))) / (oppVar.hp || 1.0);
        if (s.bestMove.multiplier >= 4.0) quadHits++;
        else if (s.bestMove.multiplier >= 2.0) seHits++;
        else if (s.bestMove.multiplier === 0.0) walledCount++;
        if (scaledPwr >= 160 && !s.bestMove.isOhko) ohkoCount++;
        totalEffPower += scaledPwr;
        if (idx === 0) {
          if (s.bestMove.multiplier >= 2.0) leadBonus += 220;
          if (scaledPwr >= 160) leadBonus += 180;
        }
      }
    });

    const exp = getRosterExposure(t, trainer);
    if (exp.leadExposure <= 0.5) leadBonus += 120;
    else if (exp.leadExposure >= 2.0) leadBonus -= 200;
    const lvlScore = tLvl * 4;
    const score = (ohkoCount * 350) + (quadHits * 400) + (seHits * 150) + leadBonus + (totalEffPower / oppList.length) + lvlScore - (exp.worst >= 4.0 ? 300 : (exp.worst >= 2.0 ? 100 : 0)) - (walledCount * 400);

    return { poke: t, score, quadHits, seHits, ohkoCount, totalEffPower, exp };
  }).sort((a, b) => b.score - a.score);
}

const MULTI_HIT_MOVES = {
  doubleironbash: { hits: 2, power: 120 },
  surgingstrikes: { hits: 3, power: 105 },
  dragondarts: { hits: 2, power: 100 },
  tachyoncutter: { hits: 2, power: 100 },
  dualwingbeat: { hits: 2, power: 80 },
  bonemerang: { hits: 2, power: 100 },
  doublehit: { hits: 2, power: 70 },
  doublekick: { hits: 2, power: 60 },
  twineedle: { hits: 2, power: 50 },
  tripleaxel: { hits: 3, power: 120 },
  tripledive: { hits: 3, power: 90 },
  populationbomb: { hits: 6, power: 120 },
  watershuriken: { hits: 3, power: 60 },
  bulletseed: { hits: 3, power: 75 },
  iciclespear: { hits: 3, power: 75 },
  rockblast: { hits: 3, power: 75 },
  pinmissile: { hits: 3, power: 75 },
  scaleshot: { hits: 3, power: 75 },
  tailburst: { hits: 3, power: 75 }
};

const RECOIL_MOVES = new Set([
  'flareblitz', 'bravebird', 'woodhammer', 'doubleedge', 'headsmash',
  'volttackle', 'wavecrash', 'wildcharge', 'takedown', 'submission',
  'headcharge', 'chloroblast'
]);

const FIXED_DAMAGE_MOVES = new Set([
  'dragonrage', 'sonicboom', 'seismictoss', 'nightshade', 'psywave'
]);

const MOVE_ACCURACY = {
  inferno: 50,
  zapcannon: 50,
  dynamicpunch: 50,
  darkvoid: 50,
  sing: 55,
  grasswhistle: 55,
  supersonic: 55,
  hypnosis: 60,
  blizzard: 70,
  thunder: 70,
  hurricane: 70,
  focusblast: 70,
  megakick: 75,
  irontail: 75,
  poisonpowder: 75,
  sleeppowder: 75,
  stunspore: 75,
  hydropump: 80,
  stoneedge: 80,
  crosschop: 80,
  gunkshot: 80,
  megahorn: 85,
  fireblast: 85,
  willowisp: 85,
  muddywater: 85,
  powerwhip: 85,
  takedown: 85,
  headsmash: 80,
  dracometeor: 90,
  leafstorm: 90,
  overheat: 90,
  rockslide: 90,
  playrough: 90,
  iciclecrash: 90,
  dragontail: 90,
  heatwave: 90,
  aquatail: 90,
  leechseed: 90
};

function resolveMove(m) {
  const rawName = (typeof m === 'object' && m && m.name) ? m.name : (typeof m === 'string' ? m : '');
  const declaredType = (typeof m === 'object' && m && m.type) ? m.type : null;
  const cleanKey = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const skillData = (skillsMap && skillsMap[cleanKey]) ? skillsMap[cleanKey] : null;
  const name = rawName || (skillData ? skillData.name : 'Tackle');
  const normDeclared = normalizeType(declaredType);
  const validDeclared = ALL_TYPES.includes(normDeclared) ? normDeclared : null;
  const type = (skillData && skillData.type) ? skillData.type : (validDeclared || 'Normal');
  let category = skillData ? (skillData.category || 'Physical') : 'Physical';
  let power = 40;

  if (MULTI_HIT_MOVES[cleanKey]) {
    power = MULTI_HIT_MOVES[cleanKey].power;
  } else if (typeof m === 'object' && m && typeof m.power === 'number' && m.power > 0) {
    power = m.power;
  } else if (skillData && typeof skillData.power === 'number') {
    power = skillData.power;
  } else {
    // Universal fallback for moves outside skills_database.json
    if (isLikelyStatusMove(name)) {
      category = 'Status';
      power = 0;
    } else {
      power = estimateMovePower(name);
    }
  }
  const isStatus = category === 'Status' || power === 0;
  const isLocking = ['outrage', 'thrash', 'petaldance'].includes(cleanKey);
  const isRecharge = ['hyperbeam', 'gigaimpact', 'blastburn', 'frenzyplant', 'hydrocannon', 'roaroftime', 'prismaticlaser', 'eternabeam'].includes(cleanKey);
  const isCharge = ['skyattack', 'solarbeam', 'solarblade', 'skullbash', 'razorwind', 'geomancy', 'fly', 'dig', 'dive', 'bounce', 'shadowforce'].includes(cleanKey);
  const isOhko = !!(skillData && skillData.special && skillData.special.mechanic === 'ohko') || ['fissure', 'guillotine', 'horndrill', 'sheercold'].includes(cleanKey);
  const isSuicide = ['explosion', 'selfdestruct', 'mistyexplosion', 'finalgambit'].includes(cleanKey);
  const isRecoil = RECOIL_MOVES.has(cleanKey);
  const isFixedDamage = FIXED_DAMAGE_MOVES.has(cleanKey) || !!(skillData && skillData.special && skillData.special.mechanic === 'fixed_damage');
  const accuracy = (skillData && typeof skillData.accuracy === 'number')
    ? skillData.accuracy
    : (MOVE_ACCURACY[cleanKey] !== undefined ? MOVE_ACCURACY[cleanKey] : (isOhko ? 30 : 100));

  return {
    name,
    type: normalizeType(type),
    power,
    category,
    accuracy,
    isStatus,
    isLocking,
    isRecharge,
    isCharge,
    isOhko,
    isSuicide,
    isRecoil,
    isFixedDamage
  };
}

function extractPokemonFromHtml(html) {
  const pokemons = [];
  const rowPattern = /<div class="row[^"]*"[^>]*data-pkid="([^"]+)"[^>]*>([\s\S]*?)(?=(?:<div class="row[^"]*"[^>]*data-pkid="|<\/div>\s*<\/div>\s*<div id="pagesel"|<\/div>\s*<\/div>\s*<div class="pagination|<div class="pagenum))/g;
  
  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const id = match[1];
    const block = match[2];

    const nameMatch = block.match(/data-name="([^"]+)"/) || block.match(/<span class="nnfield[^"]*">([^<]+)<\/span>/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

    const classMatch = block.match(/data-class="([^"]*)"/);
    let variant = classMatch ? classMatch[1].trim() : '';
    if (!variant) {
      const imgMatch = block.match(/src="[^"]*\/([a-z]+)\/[^"]+\.png"/i);
      if (imgMatch && imgMatch[1]) {
        variant = imgMatch[1].charAt(0).toUpperCase() + imgMatch[1].slice(1).toLowerCase();
      }
    }
    if (!variant || variant.toLowerCase() === 'normal') variant = 'Normal';

    const levelMatch = block.match(/<b>Level:<\/b>\s*(\d+)/i);
    const level = levelMatch ? parseInt(levelMatch[1], 10) : 1;

    const expMatch = block.match(/<b>Exp:<\/b>\s*([0-9,]+)/i);
    const exp = expMatch ? expMatch[1].trim() : '0';

    const types = [];
    const typePattern = /<i class="tbtn tbtn-([a-z]+)" title="([^"]+)"/ig;
    let tMatch;
    while ((tMatch = typePattern.exec(block)) !== null) {
      types.push(tMatch[2].trim());
    }

    const moves = [];
    const attkSectionMatch = block.match(/<div class="attk"[^>]*>([\s\S]*?)<\/div>\s*<div class="opts"/i) || block.match(/<div class="attk"[^>]*>([\s\S]*?)<\/div>/i);
    if (attkSectionMatch) {
      const moveDivPattern = /<div class="hoverclr-([a-z]+)">([^<]+)<\/div>/g;
      let mMatch;
      while ((mMatch = moveDivPattern.exec(attkSectionMatch[1])) !== null) {
        const mType = mMatch[1].charAt(0).toUpperCase() + mMatch[1].slice(1).toLowerCase();
        moves.push({
          name: mMatch[2].trim(),
          type: mType
        });
      }
    }

    const inTeam = block.includes('In Team') || block.includes('/team/replace');

    const spriteMatch = block.match(/<img[^>]+src="([^"]+)"/i);
    const sprite = spriteMatch ? spriteMatch[1] : '';

    const evolveMatch = block.match(/href="(\/pokemon\/evolve\/[^"]+)"/i);
    const canEvolve = Boolean(evolveMatch || block.includes('class="evolve"') || />Evolve<\/a>/i.test(block));
    const evolveUrl = evolveMatch ? evolveMatch[1] : (canEvolve ? ('/pokemon/evolve/' + id) : null);

    pokemons.push({
      id,
      name,
      variant,
      level,
      exp,
      types,
      moves,
      inTeam,
      sprite,
      canEvolve,
      evolveUrl
    });
  }
  return pokemons;
}

function scoreVsSingleOpponent(poke, oppTypes, oppLevel = 50, oppMoves = null, opp = null) {
  let targetTypes = oppTypes;
  let targetOpp = opp;
  if (oppTypes && typeof oppTypes === 'object' && !Array.isArray(oppTypes)) {
    if (oppTypes.types) targetTypes = oppTypes.types;
    if (!targetOpp) targetOpp = oppTypes;
  }
  let bestMove = null;
  let bestMoveScore = -Infinity;
  let maxOffense = 0;

  const normalizedOppTypes = normalizeDefenderTypes(targetTypes);
  const vMultipliers = getVariantMultipliers(poke.variant);
  const pokeTypes = normalizeDefenderTypes(poke.types || ['Normal']);

  const rawMoves = (poke.moves && poke.moves.length > 0) ? poke.moves : [];
  const moves = rawMoves.map(resolveMove).filter(m => !m.isStatus && m.power > 0);

  if (moves.length > 0) {
    for (const m of moves) {
      const eff = outgoingEffectiveness(poke, m.type, normalizedOppTypes, targetOpp);
      const isStab = pokeTypes.includes(normalizeType(m.type));
      const totalMult = eff * (isStab ? 1.5 : 1.0);
      const accFactor = m.isOhko ? 0.30 : (m.accuracy ? m.accuracy / 100 : 1.0);
      const effectivePower = m.power * eff * (isStab ? 1.5 : 1.0) * vMultipliers.offense;
      const evPower = effectivePower * accFactor;

      // Prioritize moves by super-effectiveness first, then expected power:
      // Quad super-effective (>= 4.0x) > super-effective (>= 2.0x) > neutral (>= 1.0x) > resisted (< 1.0x)
      let moveScore = evPower;
      if (eff >= 4.0) moveScore += (m.isOhko ? 100 : 500);
      else if (eff >= 2.0) moveScore += (m.isOhko ? 50 : 200);
      else if (eff < 1.0) moveScore -= 300;
      if (eff === 0.0) moveScore -= 2000;

      // STAB consistency & solo carry reliability hardening:
      if (isStab) {
        moveScore += 75; // Reward STAB consistency
      } else if (eff <= 1.0) {
        moveScore -= 50; // Penalize non-STAB attacks on neutral or resisted targets
      }
      if (m.isOhko) moveScore -= 450; // 30% OHKO moves are unacceptable for reliable solo sweeps
      if (m.isLocking) moveScore -= 160; // Outrage / Thrash locking & confusion trap
      if (m.isRecharge) moveScore -= 260; // Recharge turns leave carry vulnerable to defeat
      if (m.isCharge) moveScore -= 130; // 2-turn charge moves waste turns
      if (m.isSuicide) moveScore -= 2500; // Never suicide
      if (m.isFixedDamage) moveScore -= 500; // Fixed-damage moves (40 HP) cannot 1-hit KO high-level opponents
      if (m.accuracy && m.accuracy < 75) moveScore -= (75 - m.accuracy) * 5; // Inaccurate moves leave carry defenseless

      if (moveScore > bestMoveScore) {
        bestMoveScore = moveScore;
        maxOffense = evPower;
        bestMove = {
          name: m.name,
          type: normalizeType(m.type),
          power: m.power,
          multiplier: eff,
          isStab: isStab,
          isOhko: !!m.isOhko,
          isLocking: !!m.isLocking,
          isRecharge: !!m.isRecharge,
          isCharge: !!m.isCharge,
          isRecoil: !!m.isRecoil,
          isFixedDamage: !!m.isFixedDamage,
          accuracy: m.accuracy || (m.isOhko ? 30 : 100),
          totalPowerMult: totalMult,
          effectivePower: effectivePower
        };
      }
    }
  } else {
    // Universal STAB fallback when candidate has no damaging moves (empty moveset or status-only moves)
    for (const pType of pokeTypes) {
      const eff = outgoingEffectiveness(poke, pType, normalizedOppTypes, targetOpp);
      const totalMult = eff * 1.5;
      const effectivePower = 40 * totalMult * vMultipliers.offense;
      let moveScore = effectivePower + (eff >= 2.0 ? 100 : 0);
      if (moveScore > bestMoveScore) {
        bestMoveScore = moveScore;
        maxOffense = effectivePower;
        bestMove = {
          name: pType + ' Attack',
          type: pType,
          power: 40,
          multiplier: eff,
          isStab: true,
          totalPowerMult: totalMult,
          effectivePower: effectivePower
        };
      }
    }
  }

  if (!bestMove || maxOffense === 0) {
    bestMove = {
      name: (rawMoves[0] && rawMoves[0].name) ? rawMoves[0].name : 'Tackle',
      type: (rawMoves[0] && rawMoves[0].type) ? normalizeType(rawMoves[0].type) : 'Normal',
      power: 0,
      multiplier: 0.0,
      isStab: false,
      totalPowerMult: 0,
      effectivePower: 0
    };
  }

  // Defensive evaluation against opponent's single or dual STAB attack types
  let worstDefRisk = (normalizedOppTypes && normalizedOppTypes.length > 0) ? 0 : 1.0;
  let hasImmunity = false;
  let hasResistance = false;
  let resistsAll = true;
  let isMutualSelfTrap = false;

  for (const ot of normalizedOppTypes) {
    const risk = incomingEffectiveness(poke, ot, targetOpp);
    if (risk > worstDefRisk) worstDefRisk = risk;
    if (risk > 0.5) resistsAll = false;
    if (risk === 0.0) hasImmunity = true;
    if (risk <= 0.5) hasResistance = true;
    if ((ot === 'Dragon' || ot === 'Ghost') && pokeTypes.includes(ot) && risk >= 1.5) {
      isMutualSelfTrap = true;
    }
  }

  // Score by worst incoming STAB
  let defScore = 0;
  if (worstDefRisk >= 4.0) defScore = -350; // Fatal quad weakness (OHKO risk)
  else if (worstDefRisk >= 2.0) defScore = -150; // Super-effective weakness
  else if (worstDefRisk === 0.0) defScore = +120; // Complete immunity to all opponent STABs
  else if (worstDefRisk <= 0.25) defScore = +85; // Double resistance wall
  else if (worstDefRisk <= 0.5) defScore = +50; // Resists all opponent STABs
  else if (hasImmunity) defScore = +25; // Immune to one STAB, neutral to other
  else if (hasResistance) defScore = +15; // Resists one STAB, neutral to other

  const pokeLevel = typeof poke.level === 'number' ? poke.level : 50;
  // Mutual self-trap applies only when the user does not have decisive out-match level advantage
  if (isMutualSelfTrap && pokeLevel < (oppLevel + 25)) defScore -= 150;

  // Evaluate opponent's known moveset (e.g., from stalked player profile #viewuteam)
  if (Array.isArray(oppMoves) && oppMoves.length > 0) {
    let worstCovRisk = 0;
    for (const rawM of oppMoves) {
      const rm = resolveMove(rawM);
      if (!rm.isStatus && rm.power > 0 && rm.type) {
        const covRisk = incomingEffectiveness(poke, rm.type, targetOpp);
        if (covRisk > worstCovRisk) worstCovRisk = covRisk;
      }
    }
    if (worstCovRisk >= 4.0) {
      defScore -= 120; // Avoid getting 4x sniped by opponent's coverage move
      if (worstCovRisk > worstDefRisk) worstDefRisk = worstCovRisk;
      resistsAll = false;
    } else if (worstCovRisk >= 2.0 && worstDefRisk < 2.0) {
      defScore -= 45; // Penalize 2x exposure to opponent's coverage move
    }
  }

  // Class abilities: HP bonus (Shiny / Chrome), status immunity (Metallic), flinch (Ghostly)
  if (vMultipliers.hp > 1.0) defScore += Math.round((vMultipliers.hp - 1.0) * 60);
  if (vMultipliers.statusImmune) defScore += 10;
  if (vMultipliers.flinch) defScore += 5;

  let traitDeduction = 0;
  if (bestMove.isOhko) traitDeduction += 300;
  if (bestMove.isLocking) traitDeduction += 90;
  if (bestMove.isRecharge) traitDeduction += 140;
  if (bestMove.isCharge) traitDeduction += 70;

  const offenseScore = (bestMove.effectivePower > 0)
    ? Math.max(0, (bestMove.effectivePower / 40) * 35 + (bestMove.multiplier >= 2.0 ? 30 : 0) + (bestMove.multiplier >= 4.0 ? 25 : 0) + (bestMove.isStab ? 15 : 0) - traitDeduction)
    : -200;

  // Universal Level Scaling: level contributes to combat stats and survivability
  const levelRatio = oppLevel > 0 ? (pokeLevel / oppLevel) : (pokeLevel / 50);
  let levelScore = (pokeLevel / 100) * 25;

  if (levelRatio < 0.4 && !hasImmunity) {
    levelScore -= 35; // Severe level deficit penalty (fragile, cannot survive)
  } else if (levelRatio >= 1.5) {
    levelScore += 15; // High-level outmatch advantage
  }

  // Initiative First-Strike OHKO bonus: high-level counters that one-shot eliminate incoming damage
  let initiativeBonus = 0;
  if (pokeLevel >= oppLevel && bestMove.multiplier >= 2.0 && bestMove.effectivePower >= 90) {
    initiativeBonus = 40;
  }

  const totalScore = offenseScore + defScore + levelScore + initiativeBonus;

  return {
    pokemon: poke,
    bestMove: bestMove,
    maxOffense: maxOffense,
    worstDefRisk: worstDefRisk,
    resistsAll: resistsAll,
    totalScore: totalScore
  };
}

function getBaseSpecies(name) {
  if (!name) return '';
  return name
    .replace(/^(Dark|Shiny|Shadow|Ghostly|Ghost|Metallic|Mirage|Negative|Chrome|Retro)\s+/i, '')
    .replace(/^(Mega|Primal|G-Max|Gigantamax)\s+/i, '')
    .replace(/^(Alolan|Galarian|Hisuian|Paldean)\s+/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/-(Wash|Heat|Frost|Fan|Mow|Origin|Therian|Incarnate|Altered|Dusk-Mane|Dawn-Wings|Rapid-Strike|Single-Strike|Paldea|Hisui|Galar|Alola|Sky|Attack|Defense|Speed)$/i, '')
    .replace(/\s+[XYZ]$/i, '')
    .trim()
    .toLowerCase();
}

const ULTRA_BEASTS = [
  'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela', 'kartana',
  'guzzlord', 'poipole', 'naganadel', 'stakataka', 'blacephalon'
];

const PARADOX_SPECIES = [
  'great tusk', 'scream tail', 'brute bonnet', 'flutter mane', 'slither wing', 'sandy shocks',
  'iron treads', 'iron bundle', 'iron hands', 'iron jugulis', 'iron moth', 'iron thorns',
  'roaring moon', 'iron valiant', 'walking wake', 'iron leaves',
  'gouging fire', 'raging bolt', 'iron boulder', 'iron crown'
];

const GMAX_SPECIES = [
  'venusaur', 'charizard', 'blastoise', 'butterfree', 'pikachu', 'meowth', 'machamp', 'gengar',
  'kingler', 'lapras', 'eevee', 'snorlax', 'garbodor', 'melmetal', 'rillaboom', 'cinderace',
  'inteleon', 'corviknight', 'orbeetle', 'drednaw', 'coalossal', 'flapple', 'appletun',
  'sandaconda', 'toxtricity', 'centiskorch', 'hatterene', 'grimmsnarl', 'alcremie', 'copperajah',
  'duraludon', 'urshifu',
  // Pre-evolutions capable of evolving into G-Max forms
  'bulbasaur', 'ivysaur', 'charmander', 'charmeleon', 'squirtle', 'wartortle',
  'caterpie', 'metapod', 'pichu', 'machop', 'machoke',
  'gastly', 'haunter', 'krabby', 'munchlax', 'trubbish', 'meltan',
  'grookey', 'thwackey', 'scorbunny', 'raboot', 'sobble', 'drizzile',
  'rookidee', 'corvisquire', 'blipbug', 'dottler', 'chewtle', 'rolycoly', 'carkol',
  'applin', 'silicobra', 'toxel', 'sizzlipede', 'hatenna', 'hattrem',
  'impidimp', 'morgrem', 'milcery', 'cufant', 'kubfu'
];

const LEGENDARY_SPECIES = [
  'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew', 'raikou', 'entei', 'suicune', 'lugia', 'ho-oh', 'celebi',
  'regirock', 'regice', 'registeel', 'latias', 'latios', 'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys',
  'uxie', 'mesprit', 'azelf', 'dialga', 'palkia', 'heatran', 'regigigas', 'giratina', 'cresselia', 'phione', 'manaphy',
  'darkrai', 'shaymin', 'arceus', 'victini', 'cobalion', 'terrakion', 'virizion', 'tornadus', 'thundurus', 'reshiram',
  'zekrom', 'landorus', 'kyurem', 'keldeo', 'meloetta', 'genesect', 'xerneas', 'yveltal', 'zygarde', 'diancie', 'hoopa',
  'volcanion', 'type: null', 'type null', 'silvally', 'tapu koko', 'tapu lele', 'tapu bulu', 'tapu fini', 'cosmog',
  'cosmoem', 'solgaleo', 'lunala', 'necrozma', 'magearna', 'marshadow', 'zeraora', 'meltan', 'melmetal', 'zacian',
  'zamazenta', 'eternatus', 'kubfu', 'urshifu', 'zarude', 'regieleki', 'regidrago', 'glastrier', 'spectrier', 'calyrex',
  'enamorus', 'wo-chien', 'chien-pao', 'ting-lu', 'chi-yu', 'koraidon', 'miraidon', 'okidogi', 'munkidori', 'fezandipiti',
  'ogerpon', 'terapagos', 'pecharunt'
];

function isUltraBeast(pokeOrName) {
  if (!pokeOrName) return false;
  const raw = typeof pokeOrName === 'string' ? pokeOrName : (pokeOrName.name || '');
  const base = getBaseSpecies(raw);
  return ULTRA_BEASTS.some(u => base.includes(u));
}

function isParadoxPokemon(pokeOrName) {
  if (!pokeOrName) return false;
  const raw = typeof pokeOrName === 'string' ? pokeOrName : (pokeOrName.name || '');
  const base = getBaseSpecies(raw);
  return PARADOX_SPECIES.some(p => base === p || base.includes(p));
}

function isLegendaryPokemon(pokeOrName) {
  if (!pokeOrName) return false;
  const raw = typeof pokeOrName === 'string' ? pokeOrName : (pokeOrName.name || '');
  if (isUltraBeast(raw) || isParadoxPokemon(raw)) return false;
  const base = getBaseSpecies(raw);
  return LEGENDARY_SPECIES.some(l => base === l || base.includes(l));
}

function isCommonPokemon(pokeOrName) {
  if (!pokeOrName) return false;
  return !isLegendaryPokemon(pokeOrName) && !isUltraBeast(pokeOrName) && !isParadoxPokemon(pokeOrName);
}

function isAlreadyGmax(pokeOrName) {
  if (!pokeOrName) return false;
  const raw = typeof pokeOrName === 'string' ? pokeOrName : (pokeOrName.name || '');
  const lower = raw.toLowerCase().trim();
  const variant = (typeof pokeOrName === 'object' && pokeOrName.variant) ? String(pokeOrName.variant).toLowerCase() : '';
  return lower.includes('g-max') || lower.includes('gigantamax') || lower.includes('gmax') || variant.includes('g-max') || variant.includes('gmax');
}

function isGmaxEligible(pokeOrName) {
  if (!pokeOrName) return false;
  if (isAlreadyGmax(pokeOrName)) return false;
  return isGmaxPokemon(pokeOrName);
}

function isGmaxPokemon(pokeOrName) {
  if (!pokeOrName) return false;
  const raw = typeof pokeOrName === 'string' ? pokeOrName : (pokeOrName.name || '');
  const lower = raw.toLowerCase().trim();
  const variant = (typeof pokeOrName === 'object' && pokeOrName.variant) ? String(pokeOrName.variant).toLowerCase() : '';
  if (lower.includes('mega ') || lower.includes('mega-') || lower.includes('primal ') || lower.endsWith(' mega') || lower.endsWith(' primal') || variant.includes('mega')) return false;
  if (lower.includes('g-max') || lower.includes('gigantamax') || lower.includes('gmax')) return true;
  const base = getBaseSpecies(raw);
  return GMAX_SPECIES.includes(base);
}

const MEGA_SPECIES = [
  'venusaur', 'charizard', 'blastoise', 'beedrill', 'pidgeot', 'alakazam', 'slowbro',
  'gengar', 'kangaskhan', 'pinsir', 'gyarados', 'aerodactyl', 'mewtwo', 'ampharos',
  'steelix', 'scizor', 'heracross', 'houndoom', 'tyranitar', 'sceptile', 'blaziken',
  'swampert', 'gardevoir', 'gallade', 'sableye', 'mawile', 'aggron', 'medicham',
  'manectric', 'sharpedo', 'camerupt', 'altaria', 'banette', 'absol', 'glalie',
  'salamence', 'metagross', 'latias', 'latios', 'rayquaza', 'lopunny', 'garchomp',
  'lucario', 'abomasnow', 'diancie', 'audino', 'kyogre', 'groudon',
  // Pre-evolutions capable of mega evolving
  'bulbasaur', 'ivysaur', 'charmander', 'charmeleon', 'squirtle', 'wartortle',
  'weedle', 'kakuna', 'pidgey', 'pidgeotto', 'abra', 'kadabra', 'slowpoke',
  'gastly', 'haunter', 'mareep', 'flaaffy', 'onix', 'scyther', 'houndour',
  'larvitar', 'pupitar', 'treecko', 'grovyle', 'torchic', 'combusken', 'mudkip',
  'marshtomp', 'ralts', 'kirlia', 'aron', 'lairon', 'meditite', 'electrike',
  'carvanha', 'numel', 'swablu', 'shuppet', 'snorunt', 'bagon', 'shelgon',
  'beldum', 'metang', 'buneary', 'gible', 'gabite', 'riolu', 'snover'
];

function isMegaPokemon(pokeOrName) {
  if (!pokeOrName) return false;
  const raw = typeof pokeOrName === 'string' ? pokeOrName : (pokeOrName.name || '');
  const lower = raw.toLowerCase().trim();
  if (lower.includes('mega ') || lower.includes('primal ') || lower.endsWith(' mega') || lower.endsWith(' primal')) return true;
  const base = getBaseSpecies(raw);
  return MEGA_SPECIES.includes(base);
}

function isActualMegaEvolution(pokeOrName) {
  if (!pokeOrName) return false;
  const raw = typeof pokeOrName === 'string' ? pokeOrName : (pokeOrName.name || '');
  const lower = raw.toLowerCase().trim();
  return lower.includes('mega ') || lower.includes('primal ') || lower.startsWith('mega-') || lower.endsWith(' mega') || lower.endsWith(' primal');
}

function evaluateOwnershipAndMegaEquivalence(nameOrText, collection, explicitVariant) {
  if (!nameOrText || !Array.isArray(collection) || collection.length === 0) {
    return {
      isDuplicate: false,
      isOwned: false,
      hasMegaOwned: false,
      hasExactOwned: false,
      ownedPokemon: null,
      type: 'UNOWNED',
      alertTitle: '',
      alertMessage: '',
      reason: ''
    };
  }

  let candidate = String(nameOrText).trim();
  candidate = candidate.replace(/\s*\(Lv\s*\d+[^)]*\)\s*/gi, ' ');
  candidate = candidate.replace(/\b(?:Custom Target|Ultra Beast|Paradox|Legendary|Mega Line|Mega|Wild Encounter)\s*:\s*/gi, '');
  candidate = candidate.replace(/^(?:ULTRABEAST|ULTRA BEASTS?|PARADOX POKEMON|PARADOX|LEGENDARY POKEMON|LEGENDARY|MEGA EVOLUTION|MEGA POKEMON)\s+/i, '');
  const appearedMatch = candidate.match(/(?:(?:a\s+)?wild\s+|caught\s+)?([A-Za-z0-9\s\(\)\-':.%]+?)\s+appeared/i);
  if (appearedMatch && appearedMatch[1]) {
    const lines = appearedMatch[1].split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
    candidate = lines.length > 0 ? lines[lines.length - 1] : appearedMatch[1];
  } else {
    const nonBannerLines = candidate.split(/[\r\n]+/).map(s => s.trim()).filter(l => l && !/^(?:hp:|level:|lvl:|\d+\/\d+|try to catch|select a pokeball)/i.test(l));
    if (nonBannerLines.length > 0) {
      candidate = nonBannerLines[0].replace(/\s*(?:level|lvl|hp)[\s:].*$/i, '').trim();
    }
  }
  candidate = candidate.replace(/^(?:ULTRABEAST|ULTRA BEASTS?|PARADOX POKEMON|PARADOX|LEGENDARY POKEMON|LEGENDARY|MEGA EVOLUTION|MEGA POKEMON)\s+/i, '');
  candidate = candidate.replace(/^(?:a\s+)?wild\s+/i, '');
  candidate = candidate.replace(/^caught\s+/i, '');
  candidate = candidate.replace(/\b(?:Custom Target|Ultra Beast|Paradox|Legendary|Mega Line|Mega|Wild Encounter)\s*:\s*/gi, '').trim();

  const VARIANT_PREFIX_REGEX = /^(normal|shiny|metallic|ghostly|ghost|dark|shadow|mirage|chrome|negative|retro)\s+/i;
  let candidateVariant = 'normal';
  if (explicitVariant && typeof explicitVariant === 'string' && explicitVariant.trim()) {
    candidateVariant = explicitVariant.trim().toLowerCase();
    if (candidateVariant === 'ghost') candidateVariant = 'ghostly';
  } else {
    const vMatch = candidate.match(VARIANT_PREFIX_REGEX);
    if (vMatch) {
      candidateVariant = vMatch[1].toLowerCase();
      if (candidateVariant === 'ghost') candidateVariant = 'ghostly';
    }
  }

  const candSpecies = candidate.replace(VARIANT_PREFIX_REGEX, '').trim();
  const cleanCandidate = candSpecies.toLowerCase().replace(/[^a-z0-9]/g, '');
  const baseSpecies = getBaseSpecies(candSpecies);
  if (!baseSpecies && !cleanCandidate) {
    return {
      isDuplicate: false,
      isOwned: false,
      hasMegaOwned: false,
      hasExactOwned: false,
      ownedPokemon: null,
      type: 'UNOWNED',
      alertTitle: '',
      alertMessage: '',
      reason: ''
    };
  }

  const matchingSpecies = [];
  const matchingMegas = [];
  let exactMatch = null;

  for (let i = 0; i < collection.length; i++) {
    const p = collection[i];
    if (!p || !p.name) continue;

    let pVariant = 'normal';
    if (p.variant && typeof p.variant === 'string' && p.variant.trim().toLowerCase() !== 'normal') {
      pVariant = p.variant.trim().toLowerCase();
    } else {
      const pVMatch = p.name.match(VARIANT_PREFIX_REGEX);
      if (pVMatch) {
        pVariant = pVMatch[1].toLowerCase();
      }
    }
    if (pVariant === 'ghost') pVariant = 'ghostly';

    const pSpecies = p.name.replace(VARIANT_PREFIX_REGEX, '').trim();
    const pClean = pSpecies.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pBase = getBaseSpecies(pSpecies);

    const isVariantMatch = (pVariant === candidateVariant);
    const isNameMatch = (pClean === cleanCandidate);

    if (isVariantMatch && isNameMatch) {
      if (!exactMatch || (p.level || 0) > (exactMatch.level || 0)) {
        exactMatch = p;
      }
    }

    if (pBase && baseSpecies && pBase === baseSpecies) {
      matchingSpecies.push(p);
      if (isActualMegaEvolution(p.name)) {
        matchingMegas.push(p);
      }
    }
  }

  const capitalize = (s) => s ? (s.charAt(0).toUpperCase() + s.slice(1)) : '';

  if (matchingMegas.length > 0) {
    matchingMegas.sort((a, b) => (b.level || 0) - (a.level || 0));
    const topMega = matchingMegas[0];
    const fullMegaName = (topMega.name.toLowerCase().startsWith((topMega.variant || 'Normal').toLowerCase()) || topMega.variant === 'Normal')
      ? topMega.name
      : `${topMega.variant} ${topMega.name}`;

    return {
      isDuplicate: true,
      isOwned: true,
      hasMegaOwned: true,
      hasExactOwned: Boolean(exactMatch),
      ownedPokemon: topMega,
      type: 'MEGA_ALREADY_OWNED',
      alertTitle: 'STOP: MEGA EVOLUTION ALREADY OWNED',
      alertMessage: `You already own ${fullMegaName} (Lv ${topMega.level || 100})!`,
      reason: `You already own the Mega Evolution of ${capitalize(baseSpecies)}. 100% uniqueness protection active.`
    };
  }

  if (exactMatch) {
    const fullExactName = (exactMatch.name.toLowerCase().startsWith((exactMatch.variant || 'Normal').toLowerCase()) || exactMatch.variant === 'Normal')
      ? exactMatch.name
      : `${exactMatch.variant} ${exactMatch.name}`;

    return {
      isDuplicate: true,
      isOwned: true,
      hasMegaOwned: false,
      hasExactOwned: true,
      ownedPokemon: exactMatch,
      type: 'EXACT_ALREADY_OWNED',
      alertTitle: 'STOP: POKEMON ALREADY OWNED',
      alertMessage: `You already own ${fullExactName} (Lv ${exactMatch.level || 100})!`,
      reason: `Exact Pokemon already exists in your collection. 100% uniqueness protection active.`
    };
  }

  if (matchingSpecies.length > 0) {
    matchingSpecies.sort((a, b) => (b.level || 0) - (a.level || 0));
    const topSp = matchingSpecies[0];

    // Species exists in collection under a DIFFERENT variant (e.g. user owns Dark Eternatus, encountered Normal Eternatus).
    // In DelugeRPG, distinct variants are completely separate targets and must NOT be flagged as duplicate encounters.
    return {
      isDuplicate: false,
      isOwned: true,
      hasMegaOwned: false,
      hasExactOwned: false,
      ownedPokemon: topSp,
      type: 'SPECIES_ALREADY_OWNED',
      alertTitle: '',
      alertMessage: '',
      reason: ''
    };
  }

  return {
    isDuplicate: false,
    isOwned: false,
    hasMegaOwned: false,
    hasExactOwned: false,
    ownedPokemon: null,
    type: 'UNOWNED',
    alertTitle: '',
    alertMessage: '',
    reason: ''
  };
}

function filterCandidatePool(collection, filterType) {
  if (!collection || !Array.isArray(collection)) return [];
  const type = (filterType || 'ANY').toUpperCase();
  switch (type) {
    case 'GMAX':
      return collection.filter(isGmaxEligible);
    case 'MEGA':
    case 'MEGAS':
      return collection.filter(isMegaPokemon);
    case 'GMAX_MEGA':
      return collection.filter(p => isGmaxEligible(p) || isMegaPokemon(p));
    case 'LEGENDARY':
      return collection.filter(isLegendaryPokemon);
    case 'ULTRABEAST':
      return collection.filter(isUltraBeast);
    case 'PARADOX':
      return collection.filter(isParadoxPokemon);
    case 'COMMON':
      return collection.filter(isCommonPokemon);
    case 'ANY':
    default:
      return collection;
  }
}

function buildBestTeam(trainer, collection, fullCollection = null) {
  if (!trainer || !collection || collection.length === 0) return [];

  const isChallenge = Boolean(
    trainer.isChallenge ||
    (trainer.name && trainer.name.toLowerCase().includes('challenge')) ||
    (trainer.battleUrl && trainer.battleUrl.toLowerCase().includes('challenge'))
  );

  let candidatePool = collection;
  if (isChallenge) {
    candidatePool = candidatePool.filter(p => !isAlreadyGmax(p));
  }
  if (candidatePool.length === 0) return [];

  // Dedicated G-Max Challenge Hybrid Team: 1 Level 100 G-Max Target (to evolve) + 5 Top Universal Carries (to sweep)
  if (isChallenge && (!trainer.roster || trainer.roster.length === 0)) {
    const fullPool = (fullCollection && Array.isArray(fullCollection) && fullCollection.length > 0)
      ? fullCollection
      : collection;

    // 1. Pick the best Level 100 G-Max eligible Pokemon as Slot 1 Target
    const gmaxEligible = candidatePool.concat(fullPool).filter(isGmaxEligible);
    const lvl100Gmax = gmaxEligible.filter(p => (p.level || 0) === 100);
    const targetPool = (lvl100Gmax.length > 0 ? lvl100Gmax : gmaxEligible).slice();

    targetPool.sort((a, b) => {
      const aScore = scoreVsSingleOpponent(a, ['Mixed'], 100).totalScore;
      const bScore = scoreVsSingleOpponent(b, ['Mixed'], 100).totalScore;
      return bScore - aScore;
    });

    const chosen = [];
    const chosenIds = new Set();
    const chosenSpecies = new Set();

    const targetPoke = targetPool[0];
    if (targetPoke) {
      chosenIds.add(targetPoke.id);
      chosenSpecies.add(getBaseSpecies(targetPoke.name));
      const bestM = getBestUniversalMove(targetPoke);
      const movePwr = (bestM && bestM.power > 0) ? ' [' + bestM.power + ' Pwr]' : '';
      const pTypes = (targetPoke.types && targetPoke.types.length > 0) ? targetPoke.types : ['Normal'];
      chosen.push({
        slot: 1,
        id: targetPoke.id,
        name: targetPoke.name,
        variant: targetPoke.variant || 'Normal',
        level: targetPoke.level || 100,
        types: pTypes,
        sprite: targetPoke.sprite || '',
        role: 'G-MAX TARGET',
        targetName: 'G-Max Evolution Target',
        bestMove: bestM ? (bestM.name + ' (' + bestM.type + ')' + movePwr) : `${pTypes[0]} Attack`,
        score: 1000
      });
    }

    // 2. Slots 2 through 6: Fill with the 5 BEST CARRIES from the collection (strictly 0 quad weaknesses)
    const carriesPool = fullPool.filter(p => !chosenIds.has(p.id) && !isAlreadyGmax(p));
    const cleanCarries = carriesPool.filter(p => {
      const prof = getDefensiveProfile(p.types || ['Normal']);
      return prof.quadWeaknesses.length === 0;
    });
    const effectiveCarryPool = cleanCarries.length >= 5 ? cleanCarries : carriesPool;
    const godSquad = buildGodSquadTeam(effectiveCarryPool, 'ANY');

    for (const c of godSquad) {
      if (chosen.length >= 6) break;
      if (chosenIds.has(c.id)) continue;
      const spec = getBaseSpecies(c.name);
      if (chosenSpecies.has(spec)) continue;

      chosenIds.add(c.id);
      chosenSpecies.add(spec);
      chosen.push(Object.assign({}, c, {
        slot: chosen.length + 1,
        targetName: 'Mystery Trainer Sweeper'
      }));
    }

    // Pass 2: If small pool or unfilled slots, fill up to targetCount
    const targetCount = Math.min(6, (candidatePool.length > fullPool.length ? candidatePool.length : fullPool.length));
    if (chosen.length < targetCount) {
      const remainingCarries = carriesPool.filter(p => !chosenIds.has(p.id));
      remainingCarries.sort((a, b) => {
        const aLvl = (a.level || 0);
        const bLvl = (b.level || 0);
        if (bLvl !== aLvl) return bLvl - aLvl;
        return scoreVsSingleOpponent(b, ['Mixed'], 100).totalScore - scoreVsSingleOpponent(a, ['Mixed'], 100).totalScore;
      });

      for (const pick of remainingCarries) {
        if (chosen.length >= targetCount) break;
        chosenIds.add(pick.id);
        const bestM = getBestUniversalMove(pick);
        const movePwr = (bestM && bestM.power > 0) ? ' [' + bestM.power + ' Pwr]' : '';
        const pTypes = (pick.types && pick.types.length > 0) ? pick.types : ['Normal'];
        chosen.push({
          slot: chosen.length + 1,
          id: pick.id,
          name: pick.name,
          variant: pick.variant || 'Normal',
          level: pick.level || 100,
          types: pTypes,
          sprite: pick.sprite || '',
          role: 'MYSTERY CARRIER',
          targetName: 'Mystery Trainer Sweeper',
          bestMove: bestM ? (bestM.name + ' (' + bestM.type + ')' + movePwr) : `${pTypes[0]} Attack`,
          score: 800
        });
      }
    }

    return chosen;
  }

  // 1. Roster-based counter matching (Champions, Elite 4, Gym Leaders with rosters, or live battle page scan)
  if (trainer.roster && Array.isArray(trainer.roster) && trainer.roster.length > 0) {
    const chosen = [];
    const chosenIds = new Set();
    const chosenSpecies = new Set();

    for (let i = 0; i < trainer.roster.length; i++) {
      const opp = trainer.roster[i];
      const oppTypes = (opp.types && opp.types.length > 0) ? opp.types : ['Normal'];
      const oppLevel = opp.level || trainer.avgLevel || 50;

      const available = candidatePool.filter(p => !chosenIds.has(p.id));
      const scored = available
        .map(p => {
          const evalPoke = isChallenge ? Object.assign({}, p, { level: 100 }) : p;
          const s = scoreVsSingleOpponent(evalPoke, oppTypes, oppLevel, opp.moves, opp);
          s.pokemon = p;
          let versatilityBonus = 0;
          for (let oi = 0; oi < trainer.roster.length; oi++) {
            if (oi === i) continue;
            const otherOpp = trainer.roster[oi];
            const otherTypes = (otherOpp.types && otherOpp.types.length > 0) ? otherOpp.types : ['Normal'];
            for (const m of (p.moves || []).map(resolveMove)) {
              if (!m.isStatus && m.power > 0) {
                const eff = outgoingEffectiveness(p, m.type, otherTypes, otherOpp);
                if (eff >= 2.0) {
                  versatilityBonus += (eff >= 4.0 ? 4 : 2);
                  break;
                }
              }
            }
          }
          return { opp, ...s, totalScore: s.totalScore + versatilityBonus };
        });

      // Prefer unique species to eliminate duplicate clones and field diverse teams
      const diverseScored = scored.filter(s => !chosenSpecies.has(getBaseSpecies(s.pokemon.name)));
      const pool = (diverseScored.length > 0 && diverseScored.some(s => s.totalScore > 0))
        ? diverseScored
        : scored;

      pool.sort((a, b) => b.totalScore - a.totalScore);

      if (pool.length > 0) {
        const best = pool[0];
        chosenIds.add(best.pokemon.id);
        chosenSpecies.add(getBaseSpecies(best.pokemon.name));

        let roleDesc = '';
        if (best.worstDefRisk <= 0.0) {
          roleDesc = 'Immune Wall (vs ' + opp.name + ')';
        } else if (best.bestMove.multiplier >= 4.0) {
          roleDesc = 'Critical Counter ' + best.bestMove.multiplier.toFixed(1) + 'x (vs ' + opp.name + ')';
        } else if (best.worstDefRisk <= 0.5) {
          roleDesc = 'Hard Counter (vs ' + opp.name + ')';
        } else if (best.bestMove.multiplier >= 2.0) {
          roleDesc = 'Super-Effective ' + best.bestMove.multiplier.toFixed(1) + 'x (vs ' + opp.name + ')';
        } else {
          roleDesc = 'High-Level Tank (vs ' + opp.name + ')';
        }

        const movePwrStr = best.bestMove.power > 0 ? ' [' + best.bestMove.power + ' Pwr]' : '';
        chosen.push({
          slot: chosen.length + 1,
          id: best.pokemon.id,
          name: best.pokemon.name,
          variant: best.pokemon.variant,
          level: best.pokemon.level,
          types: best.pokemon.types,
          sprite: best.pokemon.sprite,
          bestMove: best.bestMove.name + ' (' + best.bestMove.type + ')' + movePwrStr,
          targetName: opp.name,
          role: roleDesc,
          score: Math.round(best.totalScore)
        });
      }
    }

    // Fill remaining slots up to 6
    const targetCount = Math.min(6, candidatePool.length);
    if (chosen.length < targetCount) {
      const trainerTypes = (trainer.types && trainer.types.length > 0) ? trainer.types : ['Normal'];
      const trainerAvgLvl = trainer.avgLevel || 50;
      const available = candidatePool.filter(p => !chosenIds.has(p.id));
      const remainingScored = available
        .map(p => {
          const evalPoke = isChallenge ? Object.assign({}, p, { level: 100 }) : p;
          const s = scoreVsSingleOpponent(evalPoke, trainerTypes, trainerAvgLvl);
          s.pokemon = p;
          return s;
        });
      remainingScored.sort((a, b) => b.totalScore - a.totalScore);

      function formatReserveMember(item, slotNum) {
        let anchorRole = '';
        if (item.worstDefRisk <= 0.0) {
          anchorRole = 'Immune Anchor';
        } else if (item.bestMove.multiplier >= 4.0) {
          anchorRole = 'Critical Counter (STAB 4.0x)';
        } else if (item.worstDefRisk <= 0.5) {
          anchorRole = 'Defensive Counter (Resists Gym)';
        } else if (item.bestMove.multiplier >= 2.0) {
          anchorRole = 'Super-Effective (' + item.bestMove.multiplier.toFixed(1) + 'x)';
        } else {
          anchorRole = 'High-Level Anchor';
        }
        const movePwrStr = item.bestMove.power > 0 ? ' [' + item.bestMove.power + ' Pwr]' : '';
        return {
          slot: slotNum,
          id: item.pokemon.id,
          name: item.pokemon.name,
          variant: item.pokemon.variant,
          level: item.pokemon.level,
          types: item.pokemon.types,
          sprite: item.pokemon.sprite,
          bestMove: item.bestMove.name + ' (' + item.bestMove.type + ')' + movePwrStr,
          targetName: 'Reserve Anchor',
          role: anchorRole,
          score: Math.round(item.totalScore)
        };
      }

      // Pass 1: Diverse species (skip low-level babies < 80 if powerhouse >= 90 is available, unless challenge mode)
      for (const item of remainingScored) {
        if (chosen.length >= targetCount) break;
        const spec = getBaseSpecies(item.pokemon.name);
        if (!chosenSpecies.has(spec)) {
          if (!isChallenge) {
            const topRemaining = remainingScored.find(x => !chosenIds.has(x.pokemon.id));
            if (topRemaining && (topRemaining.pokemon.level || 0) >= 90 && (item.pokemon.level || 0) < 80) {
              continue;
            }
          }
          chosenIds.add(item.pokemon.id);
          chosenSpecies.add(spec);
          chosen.push(formatReserveMember(item, chosen.length + 1));
        }
      }

      // Pass 2: Fill remaining unfilled slots up to targetCount (prioritizing high levels/powerhouses)
      const remainingUnchosen = remainingScored.filter(item => !chosenIds.has(item.pokemon.id));
      remainingUnchosen.sort((a, b) => {
        const aLvl = isChallenge ? 100 : (a.pokemon.level || 0);
        const bLvl = isChallenge ? 100 : (b.pokemon.level || 0);
        const aBonus = aLvl >= 90 ? 1000 : 0;
        const bBonus = bLvl >= 90 ? 1000 : 0;
        return (bBonus + b.totalScore) - (aBonus + a.totalScore);
      });
      for (const item of remainingUnchosen) {
        if (chosen.length >= targetCount) break;
        chosenIds.add(item.pokemon.id);
        chosen.push(formatReserveMember(item, chosen.length + 1));
      }
    }

    // Ensure challenge team has at least one Lv 100 member if available in pool (DelugeRPG Rule 2)
    if (isChallenge && !chosen.some(p => p.level === 100) && candidatePool.some(p => p.level === 100)) {
      const bestLvl100 = candidatePool.filter(p => p.level === 100 && !chosenIds.has(p.id))[0];
      if (bestLvl100 && chosen.length > 0) {
        chosen[chosen.length - 1] = formatReserveMember({
          pokemon: bestLvl100,
          bestMove: { name: (bestLvl100.moves && bestLvl100.moves[0] ? bestLvl100.moves[0].name : 'Attack'), type: 'Normal', power: 0, multiplier: 1.0 },
          worstDefRisk: 1.0,
          totalScore: 100
        }, chosen.length);
      }
    }

    return chosen;
  }

  // 2. Gym theme type matching
  const trainerTypes = trainer.types && trainer.types.length > 0 ? trainer.types : ['Normal'];
  const trainerAvgLvl = trainer.avgLevel || 50;
  const scored = candidatePool.map(p => {
    const evalPoke = isChallenge ? Object.assign({}, p, { level: 100 }) : p;
    const s = scoreVsSingleOpponent(evalPoke, trainerTypes, trainerAvgLvl);
    s.pokemon = p;
    return s;
  });
  scored.sort((a, b) => b.totalScore - a.totalScore);

  const targetCount = Math.min(6, candidatePool.length);
  const selected = [];
  const seenIds = new Set();
  const seenSpecies = new Set();

  function formatSelectedMember(s, slotNum) {
    let roleDesc = '';
    if (s.worstDefRisk <= 0.0) {
      roleDesc = 'Immune Anchor';
    } else if (s.bestMove.multiplier >= 4.0) {
      roleDesc = 'Critical Counter (STAB 4.0x)';
    } else if (s.worstDefRisk <= 0.5) {
      roleDesc = 'Defensive Counter (Resists Gym)';
    } else if (s.bestMove.multiplier >= 2.0) {
      roleDesc = 'Super-Effective (' + s.bestMove.multiplier.toFixed(1) + 'x)';
    } else if (s.pokemon.level === 100) {
      roleDesc = 'High-Level Tank';
    } else {
      roleDesc = 'Neutral Anchor';
    }
    const movePwrStr = s.bestMove.power > 0 ? ' [' + s.bestMove.power + ' Pwr]' : '';
    return {
      slot: slotNum,
      id: s.pokemon.id,
      name: s.pokemon.name,
      variant: s.pokemon.variant,
      level: s.pokemon.level,
      types: s.pokemon.types,
      sprite: s.pokemon.sprite,
      bestMove: s.bestMove.name + ' (' + s.bestMove.type + ')' + movePwrStr,
      role: roleDesc,
      score: Math.round(s.totalScore)
    };
  }

  // Pass 1: Select top scorers preferring diverse species (skip low-level babies < 80 if powerhouse >= 90 is available, unless challenge mode)
  for (const s of scored) {
    const spec = getBaseSpecies(s.pokemon.name);
    if (!seenIds.has(s.pokemon.id) && !seenSpecies.has(spec)) {
      if (!isChallenge) {
        const topRemaining = scored.find(x => !seenIds.has(x.pokemon.id));
        if (topRemaining && (topRemaining.pokemon.level || 0) >= 90 && (s.pokemon.level || 0) < 80) {
          continue;
        }
      }
      seenIds.add(s.pokemon.id);
      seenSpecies.add(spec);
      selected.push(formatSelectedMember(s, selected.length + 1));
      if (selected.length === targetCount) break;
    }
  }

  // Pass 2: Fill any remaining slots up to targetCount (prioritizing high levels/powerhouses)
  if (selected.length < targetCount) {
    const remainingScoredUnseen = scored.filter(s => !seenIds.has(s.pokemon.id));
    remainingScoredUnseen.sort((a, b) => {
      const aLvl = isChallenge ? 100 : (a.pokemon.level || 0);
      const bLvl = isChallenge ? 100 : (b.pokemon.level || 0);
      const aBonus = aLvl >= 90 ? 1000 : 0;
      const bBonus = bLvl >= 90 ? 1000 : 0;
      return (bBonus + b.totalScore) - (aBonus + a.totalScore);
    });
    for (const s of remainingScoredUnseen) {
      seenIds.add(s.pokemon.id);
      selected.push(formatSelectedMember(s, selected.length + 1));
      if (selected.length === targetCount) break;
    }
  }

  // Ensure challenge team has at least one Lv 100 member if available in pool (DelugeRPG Rule 2)
  if (isChallenge && !selected.some(p => p.level === 100) && candidatePool.some(p => p.level === 100)) {
    const bestLvl100 = candidatePool.filter(p => p.level === 100 && !seenIds.has(p.id))[0];
    if (bestLvl100 && selected.length > 0) {
      selected[selected.length - 1] = formatSelectedMember({
        pokemon: bestLvl100,
        bestMove: { name: (bestLvl100.moves && bestLvl100.moves[0] ? bestLvl100.moves[0].name : 'Attack'), type: 'Normal', power: 0, multiplier: 1.0 },
        worstDefRisk: 1.0,
        totalScore: 100
      }, selected.length);
    }
  }

  return selected;
}

function canSoloTrainer(poke, trainer) {
  if (!poke || !trainer) return false;
  const oppList = (trainer.roster && trainer.roster.length > 0)
    ? trainer.roster
    : [{ name: trainer.name, types: trainer.types || ['Normal'] }];

  const pokeMoves = (poke.moves || []).map(resolveMove).filter(m => !m.isStatus && m.power > 0);
  if (pokeMoves.length === 0) return false;

  const pokeTypes = normalizeDefenderTypes(poke.types || ['Normal']);
  const trainerAvgLvl = trainer.avgLevel || 30;
  const pokeLvl = typeof poke.level === 'number' ? poke.level : 1;

  let worstIncoming = 0;
  let worstStabIncoming = 0;
  let leadIncoming = 0;
  let allOpponentsZeroDamage = true;
  let isMutualSelfTrap = false;
  const oppMaxDamages = [];

  for (let oppIdx = 0; oppIdx < oppList.length; oppIdx++) {
    const opp = oppList[oppIdx];
    const oppDefenderTypes = normalizeDefenderTypes(opp.types || ['Normal']);
    const moveTypesFromMoves = Array.isArray(opp.moves)
      ? opp.moves.map(m => {
          const rm = resolveMove(m);
          return (!rm.isStatus && rm.power > 0) ? rm.type : null;
        }).filter(Boolean)
      : [];
    const oppAttackTypes = Array.from(new Set([].concat(
      oppDefenderTypes,
      opp.knownMoveTypes || [],
      moveTypesFromMoves
    )));
    let oppMaxDamage = 0;
    for (const ot of oppAttackTypes) {
      const inc = incomingEffectiveness(poke, ot, opp);
      if (inc > worstIncoming) worstIncoming = inc;
      if (inc > oppMaxDamage) oppMaxDamage = inc;
      if (oppDefenderTypes.includes(ot) && inc > worstStabIncoming) worstStabIncoming = inc;
      if ((ot === 'Dragon' || ot === 'Ghost') && pokeTypes.includes(ot) && inc >= 1.5) {
        isMutualSelfTrap = true;
      }
    }
    if (oppIdx === 0) leadIncoming = oppMaxDamage;
    oppMaxDamages.push(oppMaxDamage);
    if (oppMaxDamage > 0) allOpponentsZeroDamage = false;
  }

  const isMixedTrainer = (
    (trainer.types && trainer.types.some(t => /mixed/i.test(t))) ||
    (!trainer.types || trainer.types.length === 0)
  );
  if (isMixedTrainer) {
    const defProfile = getDefensiveProfile(poke.types);
    if (defProfile.quadWeaknesses.length > 0) {
      return false; // Cannot guarantee solo against unpredictable mixed roster with 4x OHKO vulnerability
    }
  }

  // Mutual self-type trap (Dragon vs Dragon, Ghost vs Ghost): cannot solo unless user has decisive level advantage
  if (isMutualSelfTrap && pokeLvl < (trainerAvgLvl + 25)) return false;

  // Level deficit guard:
  // An under-leveled Pokemon can ONLY solo if:
  // - Complete immune wall: all incoming attacks deal 0 damage
  // - Early-game gym (trainerAvgLvl <= 30) with moderate gap (<= 25 levels) and strictly safe defense (worstIncoming <= 1.0)
  //   (e.g. Kangaskhan Lv 2 vs Ghost Morty Lv 23, Comfey Lv 3 vs Brock Lv 13)
  // In high-level battles (trainerAvgLvl > 30), any non-immune level deficit will take non-zero damage and faint!
  const lvlDeficit = trainerAvgLvl - pokeLvl;
  if (lvlDeficit > 0) {
    if (allOpponentsZeroDamage) {
      // 100% immune wall: safe
    } else if (trainerAvgLvl <= 30 && lvlDeficit <= 25 && worstIncoming <= 1.0) {
      // Early-game gym moderate gap
    } else {
      return false;
    }
  }

  // Outmatch condition across roster:
  // Must defeat every member without being walled (no 0x immunities),
  // and have super-effective damage on majority of team (>= 60%, or 100% for <= 2 pkmn teams)
  let seCount = 0;
  let ohkoCount = 0;
  let lethalThreatsPreempted = true;
  const vMultipliers = getVariantMultipliers(poke.variant);
  for (let i = 0; i < oppList.length; i++) {
    const opp = oppList[i];
    const oppTypes = normalizeDefenderTypes(opp.types || ['Normal']);
    const oppLvl = opp.level || trainerAvgLvl;
    const lvlRatio = oppLvl > 0 ? Math.min(1.5, Math.max(0.25, pokeLvl / oppLvl)) : 1.0;
    let bestEff = 0;
    let maxPower = 0;
    let maxReliableEffPower = 0;

    for (let j = 0; j < pokeMoves.length; j++) {
      const m = pokeMoves[j];
      if (m.isSuicide || m.isOhko || m.isFixedDamage) continue;
      const eff = outgoingEffectiveness(poke, m.type, oppTypes, opp);
      const isStab = pokeTypes.includes(normalizeType(m.type));
      const recoilFactor = m.isRecoil ? 0.75 : 1.0;
      const effPwr = m.power * eff * (isStab ? 1.5 : 1.0) * vMultipliers.offense * ((m.isRecharge || m.isCharge) ? 0.5 : 1.0) * recoilFactor * lvlRatio;
      if (effPwr > maxReliableEffPower) maxReliableEffPower = effPwr;
      if (eff > bestEff || (eff === bestEff && m.power > maxPower)) {
        bestEff = eff;
        maxPower = m.power;
      }
    }

    if (bestEff === 0.0) return false; // Opponent is completely immune to soloer attacks
    if (bestEff < 1.0 && maxReliableEffPower < 135) return false; // Resisted weak attack cannot reliably solo
    if (maxReliableEffPower >= 180) ohkoCount++;
    if (oppMaxDamages[i] >= 2.0 && (i === 0 || maxReliableEffPower < 180)) {
      lethalThreatsPreempted = false;
    }
    if (bestEff >= 2.0) {
      seCount++;
    } else {
      // For neutral damage, soloer must have solid base power or level dominance
      if (maxPower < 75 && maxReliableEffPower < 135 && pokeLvl < trainerAvgLvl + 10) return false;
    }
  }

  // Fatal weakness guard:
  // An opponent's STAB 4x attack (e.g. Lapras Ice STAB vs Landorus) is an inescapable 1-shot KO and can never solo.
  if (worstStabIncoming >= 4.0) return false;

  const isPureSpeedSweeper = Boolean(
    pokeLvl >= 95 &&
    (pokeLvl >= (trainerAvgLvl + 25) || pokeLvl >= 100) &&
    leadIncoming <= 1.0 &&
    (ohkoCount === oppList.length || (ohkoCount >= oppList.length - 1 && leadIncoming <= 0.5)) &&
    lethalThreatsPreempted &&
    worstStabIncoming <= 1.0 &&
    !isMixedTrainer
  );
  if (worstIncoming >= 4.0 && !isPureSpeedSweeper) return false;
  if (worstIncoming >= 2.0 && !isPureSpeedSweeper) return false;

  const isHighLvlSafe = (pokeLvl >= 95 || pokeLvl >= trainerAvgLvl + 15) && worstIncoming <= 1.0;
  const hasMassiveLevelDominance = (pokeLvl >= trainerAvgLvl + 25) && worstIncoming <= 1.0;
  const minRequiredSE = (ohkoCount === oppList.length || hasMassiveLevelDominance)
    ? 0
    : (isHighLvlSafe ? 1 : (oppList.length <= 2 ? oppList.length : Math.ceil(oppList.length * 0.6)));
  if (seCount < minRequiredSE) return false;

  return true;
}

function getBestMoveVsTrainer(poke, trainer) {
  const oppList = (trainer.roster && trainer.roster.length > 0)
    ? trainer.roster
    : [{ name: trainer.name, types: trainer.types || ['Normal'] }];

  const pokeMoves = (poke.moves || []).map(resolveMove).filter(m => !m.isStatus && m.power > 0);
  if (pokeMoves.length === 0) {
    const primaryType = (poke.types && poke.types[0]) ? normalizeType(poke.types[0]) : 'Normal';
    return { name: 'Tackle', type: primaryType, power: 40, multiplier: 1.0, effectivePower: 40 };
  }

  const vMultipliers = getVariantMultipliers(poke.variant);
  const pokeTypes = normalizeDefenderTypes(poke.types || ['Normal']);
  let best = null;
  let maxScore = -1;

  for (const m of pokeMoves) {
    const mType = normalizeType(m.type);
    const isStab = pokeTypes.includes(mType);

    let minEff = 999;
    let sumEff = 0;
    for (const opp of oppList) {
      const eff = outgoingEffectiveness(poke, mType, opp.types || ['Normal'], opp);
      if (eff < minEff) minEff = eff;
      sumEff += eff;
    }
    const avgEff = sumEff / oppList.length;
    let effectivePower = m.power * avgEff * (isStab ? 1.5 : 1.0) * vMultipliers.offense;

    // Disqualify moves that have 0.0x immunity against any opponent
    if (minEff === 0.0) {
      effectivePower = 0;
    }

    const score = effectivePower + (minEff >= 2.0 ? 50 : 0);
    if (score > maxScore) {
      maxScore = score;
      best = {
        name: m.name,
        type: mType,
        power: m.power,
        multiplier: minEff >= 2.0 ? minEff : avgEff,
        effectivePower: effectivePower
      };
    }
  }

  return best || { name: pokeMoves[0].name, type: normalizeType(pokeMoves[0].type), power: pokeMoves[0].power, multiplier: 1.0, effectivePower: 40 };
}

function getBestUniversalMove(poke) {
  if (!poke) return { name: 'Tackle', type: 'Normal', power: 40, multiplier: 1.0, effectivePower: 40 };
  const pokeMoves = (poke.moves || []).map(resolveMove).filter(m => !m.isStatus && m.power > 0);
  const pokeTypes = normalizeDefenderTypes(poke.types || ['Normal']);
  const vMultipliers = getVariantMultipliers(poke.variant);

  if (pokeMoves.length === 0) {
    const primaryType = pokeTypes[0] || 'Normal';
    return { name: primaryType + ' Strike', type: primaryType, power: 40, multiplier: 1.0, effectivePower: 40 };
  }

  let best = null;
  let maxScore = -1;

  for (const m of pokeMoves) {
    const mType = normalizeType(m.type);
    const isStab = pokeTypes.includes(mType);
    let sumEff = 0;
    for (const defType of ALL_TYPES) {
      sumEff += getMoveEffectiveness(mType, [defType]);
    }
    const avgEff = sumEff / ALL_TYPES.length;

    let movePenalty = 0;
    if (m.isOhko) movePenalty += 2000;
    if (m.isSuicide) movePenalty += 3000;
    if (m.isRecharge) movePenalty += 1500;
    if (m.isLocking) movePenalty += 1000;
    if (m.isCharge) movePenalty += 800;
    const lowerName = (m.name || '').toLowerCase();
    if (lowerName.includes('focus punch')) movePenalty += 1200;
    if (lowerName.includes('mind blown')) movePenalty += 500;

    const accFactor = (m.accuracy !== undefined && m.accuracy !== null) ? (m.accuracy / 100) : 1.0;
    const effectivePower = (m.power * (isStab ? 1.5 : 1.0) * avgEff * vMultipliers.offense * accFactor) - movePenalty;
    if (effectivePower > maxScore) {
      maxScore = effectivePower;
      best = {
        name: m.name,
        type: mType,
        power: m.power,
        multiplier: Number(avgEff.toFixed(2)),
        effectivePower: Math.round(effectivePower)
      };
    }
  }
  return best || { name: pokeMoves[0].name, type: normalizeType(pokeMoves[0].type), power: pokeMoves[0].power, multiplier: 1.0, effectivePower: 40 };
}

// Build a Universal 6-Pokemon PvP "God Squad" with role & type diversity
function buildGodSquadTeam(collection, tierFilter) {
  if (!collection || !Array.isArray(collection) || collection.length === 0) return [];
  const pool = filterCandidatePool(collection, tierFilter || 'ANY');
  const sorted = pool.slice().sort((a, b) => (b.level || 0) - (a.level || 0));
  if (sorted.length === 0) return [];

  const roles = [
    {
      role: 'LEAD SWEEPER',
      desc: 'High-speed fast starter & offensive breaker',
      evaluator: (p) => {
        let s = (p.level || 0) * 3;
        const prof = getDefensiveProfile(p.types || ['Normal']);
        if (prof.quadWeaknesses.length > 0) s -= 300;
        if (prof.immunities.length > 0) s += prof.immunities.length * 25;
        if (prof.weaknesses.length <= 2) s += 35;
        const name = (p.name || '').toLowerCase();
        if (/flutter mane|mewtwo|darkrai|zeraora|calyrex|regieleki|palkia/i.test(name)) s += 70;
        const v = getVariantMultipliers(p.variant);
        if (v.offense > 1) s += 25;
        if (v.flinch) s += 25;
        const uMove = getBestUniversalMove(p);
        if (uMove && uMove.effectivePower >= 70) s += uMove.effectivePower;
        return s;
      }
    },
    {
      role: 'WALLBREAKER',
      desc: 'High attack nuke with safe defense',
      evaluator: (p) => {
        let s = (p.level || 0) * 3;
        const prof = getDefensiveProfile(p.types || ['Normal']);
        if (prof.quadWeaknesses.length > 0) s -= 300;
        if (prof.weaknesses.length <= 2) s += 40;
        const name = (p.name || '').toLowerCase();
        if (/zacian|dialga|palkia|kartana|groudon|urshifu|hoopa/i.test(name)) s += 70;
        const v = getVariantMultipliers(p.variant);
        if (v.offense > 1) s += 30;
        if (v.crit > 1) s += 20;
        const uMove = getBestUniversalMove(p);
        if (uMove && uMove.effectivePower >= 80) s += uMove.effectivePower;
        return s;
      }
    },
    {
      role: 'IMMORTAL TANK',
      desc: 'Massive bulk with status immunity & zero fatal weakness',
      evaluator: (p) => {
        let s = (p.level || 0) * 3;
        const prof = getDefensiveProfile(p.types || ['Normal']);
        if (prof.quadWeaknesses.length > 0) s -= 400;
        s += (prof.immunities.length * 35) + (prof.doubleResists.length * 20) + (prof.resists.length * 10) - (prof.weaknesses.length * 15);
        const name = (p.name || '').toLowerCase();
        if (/zacian|melmetal|ting-lu|giratina|kyogre|regigigas|dondozo|zygarde/i.test(name)) s += 70;
        const v = getVariantMultipliers(p.variant);
        if (v.statusImmune) s += 40;
        if (v.hp > 1) s += 25;
        const uMove = getBestUniversalMove(p);
        if (uMove && uMove.effectivePower >= 70) s += 30;
        return s;
      }
    },
    {
      role: 'FAIRY DRAGON-SLAYER',
      desc: 'Dragon immunity & fairy STAB check',
      evaluator: (p) => {
        let s = (p.level || 0) * 3;
        const prof = getDefensiveProfile(p.types || ['Normal']);
        if (prof.quadWeaknesses.length > 0) s -= 300;
        const types = (p.types || []).map(t => normalizeType(t));
        if (types.includes('Fairy')) s += 70;
        if (prof.immunities.includes('Dragon')) s += 40;
        const name = (p.name || '').toLowerCase();
        if (/flutter mane|zacian|magearna|xerneas|diancie|iron valiant/i.test(name)) s += 60;
        const v = getVariantMultipliers(p.variant);
        if (v.statusImmune) s += 25;
        const uMove = getBestUniversalMove(p);
        if (uMove && uMove.type === 'Fairy' && uMove.effectivePower >= 70) s += 25;
        return s;
      }
    },
    {
      role: 'GROUND/ELECTRIC PIVOT',
      desc: 'Immunities to ground & electric with high defense',
      evaluator: (p) => {
        let s = (p.level || 0) * 3;
        const types = (p.types || []).map(t => normalizeType(t));
        const prof = getDefensiveProfile(types);
        if (prof.quadWeaknesses.length > 0) s -= 300;
        if (prof.immunities.includes('Ground') || prof.immunities.includes('Electric')) s += 50;
        if (prof.weaknesses.length <= 2) s += 40;
        const name = (p.name || '').toLowerCase();
        if (/thundurus|celesteela|zeraora|rotom|zapdos|gliscor|ting-lu/i.test(name)) s += 60;
        const v = getVariantMultipliers(p.variant);
        if (v.crit > 1) s += 30;
        if (v.hp > 1) s += 20;
        return s;
      }
    },
    {
      role: 'ARMOR ANCHOR',
      desc: 'Heavy steel resistance wall',
      evaluator: (p) => {
        let s = (p.level || 0) * 3;
        const types = (p.types || []).map(t => normalizeType(t));
        const prof = getDefensiveProfile(types);
        if (prof.quadWeaknesses.length > 0) s -= 300;
        if (types.includes('Steel')) s += 60;
        const name = (p.name || '').toLowerCase();
        if (/dialga|melmetal|celesteela|iron crown|cobalion|registeel|heatran/i.test(name)) s += 60;
        const v = getVariantMultipliers(p.variant);
        if (v.statusImmune) s += 30;
        s += (prof.resists.length * 8) + (prof.doubleResists.length * 15);
        return s;
      }
    }
  ];

  const chosen = [];
  const chosenIds = new Set();
  const chosenSpecies = new Set();

  for (let i = 0; i < roles.length; i++) {
    const roleDef = roles[i];
    let best = null;
    let bestScore = -Infinity;

    for (const p of sorted) {
      if (chosenIds.has(p.id)) continue;
      const baseSp = getBaseSpecies(p.name);
      if (chosenSpecies.has(baseSp)) continue;

      const score = roleDef.evaluator(p);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    if (!best) {
      for (const p of sorted) {
        if (!chosenIds.has(p.id) && !chosenSpecies.has(getBaseSpecies(p.name))) {
          best = p;
          break;
        }
      }
    }

    if (best) {
      chosenIds.add(best.id);
      chosenSpecies.add(getBaseSpecies(best.name));
      const pTypes = (best.types && best.types.length > 0) ? best.types : ['Normal'];
      const bestMove = getBestUniversalMove(best);
      const movePwrStr = (bestMove && bestMove.power > 0) ? ' [' + bestMove.power + ' Pwr]' : '';

      chosen.push({
        slot: chosen.length + 1,
        id: best.id,
        name: best.name,
        variant: best.variant || 'Normal',
        level: best.level || 100,
        types: pTypes,
        sprite: best.sprite || '',
        role: roleDef.role,
        roleDesc: roleDef.desc,
        bestMove: bestMove ? `${bestMove.name} (${bestMove.type})${movePwrStr}` : `${pTypes[0]} Attack`,
        targetOpponentName: 'Universal Meta'
      });
    }
  }

  return chosen;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TYPE_CHART,
    ALL_TYPES,
    typeChartDatabase,
    normalizeType,
    normalizeDefenderTypes,
    getDefensiveProfile,
    getMoveEffectiveness,
    getDefensiveResistance,
    resolveMove,
    getBaseSpecies,
    extractPokemonFromHtml,
    scoreVsSingleOpponent,
    buildBestTeam,
    buildGodSquadTeam,
    canSoloTrainer,
    getBestMoveVsTrainer,
    getBestUniversalMove,
    getVariantMultipliers,
    getTypeMultiplier,
    outgoingEffectiveness,
    incomingEffectiveness,
    getRosterExposure,
    rankCarries,
    getCarryMoveGuidance,
    getRosterWideBestAttack,
    rankTraineePartners,
    ULTRA_BEASTS,
    PARADOX_SPECIES,
    GMAX_SPECIES,
    MEGA_SPECIES,
    LEGENDARY_SPECIES,
    isUltraBeast,
    isParadoxPokemon,
    isLegendaryPokemon,
    isCommonPokemon,
    isGmaxPokemon,
    isMegaPokemon,
    isActualMegaEvolution,
    evaluateOwnershipAndMegaEquivalence,
    isAlreadyGmax,
    isGmaxEligible,
    filterCandidatePool,
    isNegativePokemon,
    isInverseVariant
  };
}
