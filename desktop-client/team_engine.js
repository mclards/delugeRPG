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
  if (typeof types === 'string') {
    if (types.includes('/')) {
      return types.split('/').map(t => normalizeType(t)).filter(Boolean);
    }
    return [normalizeType(types)];
  }
  if (Array.isArray(types)) {
    const res = [];
    for (const t of types) {
      if (!t) continue;
      if (typeof t === 'string' && t.includes('/')) {
        res.push(...t.split('/').map(sub => normalizeType(sub)));
      } else {
        res.push(normalizeType(t));
      }
    }
    return res.length > 0 ? res : ['Normal'];
  }
  return ['Normal'];
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

function getDefensiveProfile(defenderTypes) {
  const defs = normalizeDefenderTypes(defenderTypes);
  const matchups = {};
  const quadWeaknesses = [];
  const weaknesses = [];
  const neutral = [];
  const resists = [];
  const doubleResists = [];
  const immunities = [];

  for (const atk of ALL_TYPES) {
    const m = getMoveEffectiveness(atk, defs);
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
  if (/blast|beam|storm|cannon|crush|quake|force|hyper|outrage|meteor|overheat|eruption|spout|doom|judgement|cataclysm|apocalypse|gigaton|climax/i.test(lower)) {
    return 110;
  }
  if (/pulse|burst|cutter|fang|claw|tail|punch|kick|slash|strike|hammer|slam|thrust|drill|blade|rush|dive|bomb/i.test(lower)) {
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

function isInverseVariant(variant) {
  return (variant || '').toLowerCase().trim() === 'negative';
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
// Negative class: DelugeRPG states it uses inverse matchups, but whether that
// applies to its own attacks, incoming attacks, or both is unconfirmed. To never
// mis-recommend, Negative Pokemon are evaluated PESSIMISTICALLY: the weaker of
// normal/inverse for offense and the stronger of normal/inverse for defense.
function outgoingEffectiveness(poke, moveType, oppTypes) {
  const mType = normalizeType(moveType);
  const defs = normalizeDefenderTypes(oppTypes);
  const normal = getMoveEffectiveness(mType, defs);
  if (!isInverseVariant(poke && poke.variant)) return normal;
  return Math.min(normal, getTypeMultiplier(mType, defs, true));
}

// Damage multiplier of an opponent attack type against OUR Pokemon
function incomingEffectiveness(poke, attackType) {
  const defTypes = normalizeDefenderTypes((poke && poke.types) || ['Normal']);
  const atk = normalizeType(attackType);
  const normal = getMoveEffectiveness(atk, defTypes);
  if (!isInverseVariant(poke && poke.variant)) return normal;
  return Math.max(normal, getTypeMultiplier(atk, defTypes, true));
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
  let resisted = 0;
  for (const opp of oppList) {
    const attackTypes = [].concat(opp.types || ['Normal'], opp.knownMoveTypes || []);
    let m = 0;
    for (const at of attackTypes) {
      const inc = incomingEffectiveness(poke, at);
      if (inc > m) m = inc;
    }
    total += m;
    if (m > worst) worst = m;
    if (m <= 0.5) resisted++;
  }
  const avg = oppList.length > 0 ? total / oppList.length : 1.0;
  const v = getVariantMultipliers(poke && poke.variant);
  return { avg, worst, resisted, count: oppList.length, effective: avg / v.hp };
}

// Rank carry candidates defense-first: a carry must SURVIVE the whole roster
// (resists / immunities), then deal damage. Pure offense carries that take
// neutral hits from every opponent get one-shot by critical STAB attacks.
function rankCarries(pool, trainer) {
  const oppList = (trainer && trainer.roster && trainer.roster.length > 0)
    ? trainer.roster
    : [{ types: (trainer && trainer.types) || ['Normal'] }];
  const avgLvl = (trainer && trainer.avgLevel) || 50;
  return (pool || [])
    .map(p => {
      const exposure = getRosterExposure(p, trainer);
      let offense = 0;
      oppList.forEach(opp => {
        offense += scoreVsSingleOpponent(p, opp.types || ['Normal'], avgLvl).totalScore;
      });
      offense = offense / oppList.length;
      const v = getVariantMultipliers(p.variant);
      const statusBonus = v.statusImmune ? 25 : 0;
      const carryScore = offense - exposure.effective * 800 + statusBonus;
      return { poke: p, exposure, offense, carryScore };
    })
    .filter(x => x.exposure.worst < 2.0)
    .sort((a, b) => b.carryScore - a.carryScore || (b.poke.level || 0) - (a.poke.level || 0));
}

function resolveMove(m) {
  const rawName = (typeof m === 'object' && m && m.name) ? m.name : (typeof m === 'string' ? m : '');
  const declaredType = (typeof m === 'object' && m && m.type) ? m.type : null;
  const cleanKey = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const skillData = (skillsMap && skillsMap[cleanKey]) ? skillsMap[cleanKey] : null;

  const name = rawName || (skillData ? skillData.name : 'Tackle');
  const type = declaredType || (skillData ? skillData.type : 'Normal');
  let category = skillData ? (skillData.category || 'Physical') : 'Physical';
  let power = 40;

  if (skillData && typeof skillData.power === 'number') {
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

  return {
    name,
    type,
    power,
    category,
    isStatus
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

    pokemons.push({
      id,
      name,
      variant,
      level,
      exp,
      types,
      moves,
      inTeam,
      sprite
    });
  }
  return pokemons;
}

function scoreVsSingleOpponent(poke, oppTypes, oppLevel = 50, oppMoves = null) {
  let bestMove = null;
  let maxOffense = 0;

  const normalizedOppTypes = normalizeDefenderTypes(oppTypes);
  const vMultipliers = getVariantMultipliers(poke.variant);
  const pokeTypes = normalizeDefenderTypes(poke.types || ['Normal']);

  const rawMoves = (poke.moves && poke.moves.length > 0) ? poke.moves : [];
  const moves = rawMoves.map(resolveMove).filter(m => !m.isStatus && m.power > 0);

  if (moves.length > 0) {
    for (const m of moves) {
      const eff = outgoingEffectiveness(poke, m.type, normalizedOppTypes);
      const isStab = pokeTypes.includes(normalizeType(m.type));
      const totalMult = eff * (isStab ? 1.5 : 1.0);
      const effectivePower = m.power * eff * (isStab ? 1.5 : 1.0) * vMultipliers.offense;

      if (effectivePower > maxOffense) {
        maxOffense = effectivePower;
        bestMove = {
          name: m.name,
          type: normalizeType(m.type),
          power: m.power,
          multiplier: eff,
          isStab: isStab,
          totalPowerMult: totalMult,
          effectivePower: effectivePower
        };
      }
    }
  } else if (rawMoves.length === 0) {
    for (const pType of pokeTypes) {
      const eff = outgoingEffectiveness(poke, pType, normalizedOppTypes);
      const totalMult = eff * 1.5;
      const effectivePower = 40 * totalMult * vMultipliers.offense;
      if (effectivePower > maxOffense) {
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
    const risk = incomingEffectiveness(poke, ot);
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

  if (isMutualSelfTrap) defScore -= 150;

  // Evaluate opponent's known moveset (e.g., from stalked player profile #viewuteam)
  if (Array.isArray(oppMoves) && oppMoves.length > 0) {
    let worstCovRisk = 0;
    for (const rawM of oppMoves) {
      const rm = resolveMove(rawM);
      if (!rm.isStatus && rm.power > 0 && rm.type) {
        const covRisk = incomingEffectiveness(poke, rm.type);
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

  const offenseScore = (bestMove.effectivePower > 0)
    ? (bestMove.effectivePower / 40) * 35 + (bestMove.multiplier >= 2.0 ? 30 : 0) + (bestMove.multiplier >= 4.0 ? 25 : 0) + (bestMove.isStab ? 15 : 0)
    : -200;

  // Universal Level Scaling: level contributes to combat stats and survivability
  const pokeLevel = typeof poke.level === 'number' ? poke.level : 50;
  const levelRatio = oppLevel > 0 ? (pokeLevel / oppLevel) : (pokeLevel / 50);
  let levelScore = (pokeLevel / 100) * 25;

  if (levelRatio < 0.4 && !hasImmunity) {
    levelScore -= 35; // Severe level deficit penalty (fragile, cannot survive)
  } else if (levelRatio >= 1.5) {
    levelScore += 15; // High-level outmatch advantage
  }

  const totalScore = offenseScore + defScore + levelScore;

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
    .replace(/^(Dark|Shiny|Shadow|Ghostly|Metallic|Mirage|Negative|Chrome|Retro)\s+/i, '')
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

function isGmaxPokemon(pokeOrName) {
  if (!pokeOrName) return false;
  const raw = typeof pokeOrName === 'string' ? pokeOrName : (pokeOrName.name || '');
  const lower = raw.toLowerCase();
  if (lower.includes('g-max') || lower.includes('gigantamax') || lower.includes('gmax')) return true;
  if (lower.includes('mega ')) return false;
  const base = getBaseSpecies(raw);
  return GMAX_SPECIES.includes(base);
}

function filterCandidatePool(collection, filterType) {
  if (!collection || !Array.isArray(collection)) return [];
  const type = (filterType || 'ANY').toUpperCase();
  switch (type) {
    case 'GMAX':
      return collection.filter(isGmaxPokemon);
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

function buildBestTeam(trainer, collection) {
  if (!trainer || !collection || collection.length === 0) return [];

  // 1. Roster-based counter matching (Champions, Elite 4, Gym Leaders with rosters, or live battle page scan)
  if (trainer.roster && Array.isArray(trainer.roster) && trainer.roster.length > 0) {
    const chosen = [];
    const chosenIds = new Set();
    const chosenSpecies = new Set();

    for (let i = 0; i < trainer.roster.length; i++) {
      const opp = trainer.roster[i];
      const oppTypes = (opp.types && opp.types.length > 0) ? opp.types : ['Normal'];
      const oppLevel = opp.level || trainer.avgLevel || 50;

      const available = collection.filter(p => !chosenIds.has(p.id));
      const scored = available
        .map(p => ({ opp, ...scoreVsSingleOpponent(p, oppTypes, oppLevel, opp.moves) }));

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
    const targetCount = Math.min(6, collection.length);
    if (chosen.length < targetCount) {
      const trainerTypes = (trainer.types && trainer.types.length > 0) ? trainer.types : ['Normal'];
      const trainerAvgLvl = trainer.avgLevel || 50;
      const available = collection.filter(p => !chosenIds.has(p.id));
      const remainingScored = available
        .map(p => scoreVsSingleOpponent(p, trainerTypes, trainerAvgLvl));

      const diverseRemaining = remainingScored.filter(s => !chosenSpecies.has(getBaseSpecies(s.pokemon.name)));
      const pool = (diverseRemaining.length >= (targetCount - chosen.length) && diverseRemaining.some(s => s.totalScore > 0))
        ? diverseRemaining
        : remainingScored;

      pool.sort((a, b) => b.totalScore - a.totalScore);

      for (let j = 0; j < pool.length && chosen.length < targetCount; j++) {
        const item = pool[j];
        chosenIds.add(item.pokemon.id);
        chosenSpecies.add(getBaseSpecies(item.pokemon.name));

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
        chosen.push({
          slot: chosen.length + 1,
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
        });
      }
    }

    return chosen;
  }

  // 2. Gym theme type matching
  const trainerTypes = trainer.types && trainer.types.length > 0 ? trainer.types : ['Normal'];
  const trainerAvgLvl = trainer.avgLevel || 50;
  const scored = collection.map(p => scoreVsSingleOpponent(p, trainerTypes, trainerAvgLvl));
  scored.sort((a, b) => b.totalScore - a.totalScore);

  const selected = [];
  const seenIds = new Set();
  const seenSpecies = new Set();
  for (const s of scored) {
    const spec = getBaseSpecies(s.pokemon.name);
    if (!seenIds.has(s.pokemon.id) && (!seenSpecies.has(spec) || selected.length >= collection.length)) {
      seenIds.add(s.pokemon.id);
      seenSpecies.add(spec);

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
      selected.push({
        slot: selected.length + 1,
        id: s.pokemon.id,
        name: s.pokemon.name,
        variant: s.pokemon.variant,
        level: s.pokemon.level,
        types: s.pokemon.types,
        sprite: s.pokemon.sprite,
        bestMove: s.bestMove.name + ' (' + s.bestMove.type + ')' + movePwrStr,
        role: roleDesc,
        score: Math.round(s.totalScore)
      });
      if (selected.length === 6) break;
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
  let allOpponentsZeroDamage = true;
  let isMutualSelfTrap = false;

  for (const opp of oppList) {
    const oppAttackTypes = [].concat(normalizeDefenderTypes(opp.types || ['Normal']), opp.knownMoveTypes || []);
    let oppMaxDamage = 0;
    for (const ot of oppAttackTypes) {
      const inc = incomingEffectiveness(poke, ot);
      if (inc > worstIncoming) worstIncoming = inc;
      if (inc > oppMaxDamage) oppMaxDamage = inc;
      if ((ot === 'Dragon' || ot === 'Ghost') && pokeTypes.includes(ot) && inc >= 1.5) {
        isMutualSelfTrap = true;
      }
    }
    if (oppMaxDamage > 0) allOpponentsZeroDamage = false;
  }

  // Fatal weakness: soloer cannot have super-effective elemental weaknesses (>= 2.0x)
  if (worstIncoming >= 2.0) return false;
  // Mutual self-type trap (Dragon vs Dragon, Ghost vs Ghost): cannot solo
  if (isMutualSelfTrap) return false;

  // Level deficit guard:
  // If opponent is > 15 levels higher:
  // - Complete immune wall (all incoming attacks deal 0 damage): safe!
  // - Or moderate gap (<= 25 levels) with strictly safe defense (worstIncoming <= 1.0)
  // Severe level deficit (> 25 levels) with non-zero incoming damage will get one-shot
  const lvlDeficit = trainerAvgLvl - pokeLvl;
  if (lvlDeficit > 15) {
    if (allOpponentsZeroDamage) {
      // 100% immune wall: safe
    } else if (lvlDeficit <= 25 && worstIncoming <= 1.0) {
      // Moderate gap with safe defense (e.g. Kangaskhan Lv 2 vs Morty Lv 23)
    } else {
      return false;
    }
  }

  // Outmatch condition across roster:
  // Must defeat every member without being walled (no 0x immunities),
  // and have super-effective damage on majority of team (>= 60%, or 100% for <= 2 pkmn teams)
  let seCount = 0;
  for (let i = 0; i < oppList.length; i++) {
    const opp = oppList[i];
    const oppTypes = normalizeDefenderTypes(opp.types || ['Normal']);
    let bestEff = 0;
    let maxPower = 0;

    for (let j = 0; j < pokeMoves.length; j++) {
      const m = pokeMoves[j];
      const eff = outgoingEffectiveness(poke, m.type, oppTypes);
      if (eff > bestEff) {
        bestEff = eff;
        maxPower = m.power;
      }
    }

    if (bestEff === 0.0) return false; // Opponent is completely immune to soloer attacks
    if (bestEff >= 2.0) {
      seCount++;
    } else {
      // For neutral damage, soloer must have high base power and level advantage
      if (maxPower < 70 && pokeLvl < trainerAvgLvl + 10) return false;
    }
  }

  const minRequiredSE = oppList.length <= 2 ? oppList.length : Math.ceil(oppList.length * 0.6);
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
      const eff = outgoingEffectiveness(poke, mType, opp.types || ['Normal']);
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
        let s = (p.level || 0);
        const name = (p.name || '').toLowerCase();
        if (/calyrex|pheromosa|regieleki|rayquaza|deoxys|dragapult|mewtwo|darkrai|koraidon|miraidon/i.test(name)) s += 80;
        const v = getVariantMultipliers(p.variant);
        if (v.offense > 1) s += 25;
        if (v.flinch) s += 25;
        return s;
      }
    },
    {
      role: 'WALLBREAKER',
      desc: 'High physical attack nuke',
      evaluator: (p) => {
        let s = (p.level || 0);
        const name = (p.name || '').toLowerCase();
        if (/kartana|groudon|zacian|urshifu|buzzwole|hoopa|kyurem|roaring moon|slither wing/i.test(name)) s += 80;
        const v = getVariantMultipliers(p.variant);
        if (v.offense > 1) s += 30;
        if (v.crit > 1) s += 20;
        return s;
      }
    },
    {
      role: 'IMMORTAL TANK',
      desc: 'Massive bulk with status immunity',
      evaluator: (p) => {
        let s = (p.level || 0);
        const name = (p.name || '').toLowerCase();
        if (/eternatus|zygarde|melmetal|blissey|giratina|kyogre|regigigas|dondozo|ting-lu/i.test(name)) s += 80;
        const v = getVariantMultipliers(p.variant);
        if (v.statusImmune) s += 40;
        if (v.hp > 1) s += 25;
        return s;
      }
    },
    {
      role: 'FAIRY DRAGON-SLAYER',
      desc: 'Dragon immunity & fairy STAB check',
      evaluator: (p) => {
        let s = (p.level || 0);
        const types = (p.types || []).map(t => normalizeType(t));
        if (types.includes('Fairy')) s += 60;
        const name = (p.name || '').toLowerCase();
        if (/xerneas|diancie|iron valiant|tapu lele|tapu koko|flutter mane|enamorus|magearna|zacian/i.test(name)) s += 60;
        const v = getVariantMultipliers(p.variant);
        if (v.statusImmune) s += 25;
        return s;
      }
    },
    {
      role: 'GROUND/ELECTRIC PIVOT',
      desc: 'Immunities to ground & electric with high crit',
      evaluator: (p) => {
        let s = (p.level || 0);
        const types = (p.types || []).map(t => normalizeType(t));
        const prof = getDefensiveProfile(types);
        if (prof.immunities.includes('Ground') || prof.immunities.includes('Electric')) s += 50;
        const name = (p.name || '').toLowerCase();
        if (/landorus|thundurus|gliscor|zapdos|rotom|garchomp|ting-lu|great tusk/i.test(name)) s += 60;
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
        let s = (p.level || 0);
        const types = (p.types || []).map(t => normalizeType(t));
        if (types.includes('Steel')) s += 60;
        const name = (p.name || '').toLowerCase();
        if (/dialga|melmetal|celesteela|iron crown|cobalion|registeel|heatran|corviknight/i.test(name)) s += 60;
        const v = getVariantMultipliers(p.variant);
        if (v.statusImmune) s += 25;
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
      const dummyTrainer = { types: ['Normal'], avgLevel: 100 };
      const bestMove = getBestMoveVsTrainer(best, dummyTrainer);

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
        bestMove: bestMove ? `${bestMove.name} (${bestMove.type})` : `${pTypes[0]} Attack`,
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
    getVariantMultipliers,
    getTypeMultiplier,
    outgoingEffectiveness,
    incomingEffectiveness,
    getRosterExposure,
    rankCarries,
    ULTRA_BEASTS,
    PARADOX_SPECIES,
    GMAX_SPECIES,
    LEGENDARY_SPECIES,
    isUltraBeast,
    isParadoxPokemon,
    isLegendaryPokemon,
    isCommonPokemon,
    isGmaxPokemon,
    filterCandidatePool
  };
}
