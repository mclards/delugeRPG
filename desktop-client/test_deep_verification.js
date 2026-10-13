// test_deep_verification.js - Comprehensive Deep Verification Suite
// Validates All Functions, Algorithms, Databases, IPC Channels, DOM Bindings, and Pipelines

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('    DELUGERPG FULL DEEP VERIFICATION SUITE - ALL PIPELINES      ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// PIPELINE 1: 100% 7-BIT CLEAN ASCII INTEGRITY
// -----------------------------------------------------------------------------
console.log('--- PIPELINE 1: 100% 7-BIT CLEAN ASCII ENCODING AUDIT ---');

const clientFiles = [
  'main.js',
  'app.js',
  'game-preload.js',
  'team_engine.js',
  'targets.js',
  'config.json',
  'package.json',
  'app.html',
  'gym_leaders.json',
  'user_collection.json',
  'daily_catch_log.json',
  'favorite_trainers.json',
  'skills_database.json',
  'type_chart_database.json',
  'test_client.js',
  'test_duplicate_and_catch.js',
  'test_buttons_verification.js',
  'test_deep_verification.js'
];

for (const f of clientFiles) {
  runTest(`ASCII Audit: ${f}`, () => {
    const fullPath = path.join(__dirname, f);
    assert(fs.existsSync(fullPath), `File ${f} must exist`);
    const content = fs.readFileSync(fullPath, 'utf8');
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      if (code > 127) {
        throw new Error(`Non-ASCII character '${content[i]}' (code ${code}) found at index ${i}`);
      }
    }
  });
}

// -----------------------------------------------------------------------------
// PIPELINE 2: GYM LEADERS & TRAINERS DATABASE AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- PIPELINE 2: GYM LEADERS & OPPONENTS DATABASE AUDIT ---');

const VALID_TYPES = new Set([
  'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Steel', 'Dark', 'Fairy', 'Mixed'
]);

const EXPECTED_REGIONS = [
  'KANTO', 'JOHTO', 'HOENN', 'SINNOH', 'UNOVA', 'KALOS', 'ALOLA', 'GALAR', 'PALDEA'
];

let gymLeaders = {};
runTest('Gym Leaders JSON parsing and structure', () => {
  const gymPath = path.join(__dirname, 'gym_leaders.json');
  gymLeaders = JSON.parse(fs.readFileSync(gymPath, 'utf8'));
  assert(gymLeaders && typeof gymLeaders === 'object', 'Must be a valid JSON object');
});

runTest('All 9 regions present in gym_leaders.json', () => {
  for (const reg of EXPECTED_REGIONS) {
    assert(Array.isArray(gymLeaders[reg]), `Region ${reg} must exist and be an array`);
    assert(gymLeaders[reg].length > 0, `Region ${reg} must contain leaders`);
  }
});

runTest('Gym leader object integrity across all 131 trainers', () => {
  let leaderCount = 0;
  for (const reg of EXPECTED_REGIONS) {
    for (const leader of gymLeaders[reg]) {
      leaderCount++;
      assert(typeof leader.name === 'string' && leader.name.length > 0, `Leader in ${reg} must have valid name`);
      assert(typeof leader.avgLevel === 'number' && leader.avgLevel > 0 && leader.avgLevel <= 100, `${leader.name} must have valid avgLevel (1-100)`);
      assert(Array.isArray(leader.types) && leader.types.length > 0, `${leader.name} must have types array`);
      for (const t of leader.types) {
        assert(VALID_TYPES.has(t), `${leader.name} has invalid Pokemon type: ${t}`);
      }
      assert(typeof leader.battleUrl === 'string' && leader.battleUrl.startsWith('/'), `${leader.name} must have valid battleUrl`);
    }
  }
  assert(leaderCount >= 130, `Expected at least 130 Gym Leaders, found ${leaderCount}`);
  console.log(`       Verified ${leaderCount} Gym Leaders & Elite 4 trainers across 9 regions.`);
});

runTest('Trainer Tiers (Standard, Strong, Ultimate, VIP) database audit (318 trainers)', () => {
  const tiers = ['STANDARD_TRAINERS', 'STRONG_TRAINERS', 'ULTIMATE_TRAINERS', 'VIP_TRAINERS'];
  let totalTierTrainers = 0;
  for (const tierKey of tiers) {
    assert(Array.isArray(gymLeaders[tierKey]), `Tier ${tierKey} must exist and be an array`);
    for (const tr of gymLeaders[tierKey]) {
      totalTierTrainers++;
      assert(typeof tr.name === 'string' && tr.name.length > 0, `Trainer in ${tierKey} must have name`);
      assert(typeof tr.avgLevel === 'number' && tr.avgLevel > 0 && tr.avgLevel <= 100, `${tr.name} must have avgLevel`);
      assert(Array.isArray(tr.types) && tr.types.length > 0, `${tr.name} must have types`);
      for (const t of tr.types) {
        assert(VALID_TYPES.has(t), `${tr.name} has invalid type: ${t}`);
      }
      assert(typeof tr.battleUrl === 'string' && tr.battleUrl.startsWith('/battle/trainer/'), `${tr.name} must have trainer battleUrl`);
    }
  }
  assert.strictEqual(totalTierTrainers, 318, `Expected exactly 318 trainers across 4 tiers, got ${totalTierTrainers}`);
  console.log(`       Verified all ${totalTierTrainers} trainers across Standard, Strong, Ultimate, and VIP tiers.`);
});

runTest('Champions & Elite 4 canonical 6-Pokemon rosters audit', () => {
  const championNames = ['Blue', 'Red', 'Steven', 'Wallace', 'Cynthia', 'Alder', 'Iris', 'Diantha', 'Hau', 'Leon', 'Geeta'];
  for (const cName of championNames) {
    let found = null;
    for (const reg of EXPECTED_REGIONS) {
      const match = gymLeaders[reg].find(l => l.name === cName && l.battleUrl && (l.battleUrl.endsWith('81') || l.battleUrl.endsWith('82')));
      if (match) { found = match; break; }
    }
    assert(found, `Champion ${cName} must exist in database`);
    assert(Array.isArray(found.roster), `Champion ${cName} must have a roster array`);
    assert.strictEqual(found.roster.length, 6, `Champion ${cName} roster must have exactly 6 Pokemon`);
    for (const p of found.roster) {
      assert(typeof p.name === 'string' && p.name.length > 0, `${cName} roster Pokemon must have name`);
      assert(Array.isArray(p.types) && p.types.length > 0, `${cName} roster ${p.name} must have types`);
      for (const t of p.types) {
        assert(VALID_TYPES.has(t), `${cName} roster ${p.name} has invalid type: ${t}`);
      }
    }
  }
});

// -----------------------------------------------------------------------------
// PIPELINE 3: USER POKEMON COLLECTION & PARSING ENGINE
// -----------------------------------------------------------------------------
console.log('\n--- PIPELINE 3: USER POKEMON COLLECTION & HTML PARSING AUDIT ---');

const teamEngine = require('./team_engine');

runTest('HTML Parser extraction from production DOM dump (Page 1)', () => {
  const dumpPath1 = path.join(__dirname, 'dom_dumps', 'dump_pokemon.html');
  assert(fs.existsSync(dumpPath1), 'dump_pokemon.html must exist');
  const html1 = fs.readFileSync(dumpPath1, 'utf8');
  const pokes = teamEngine.extractPokemonFromHtml(html1);
  assert(pokes.length === 48, `Page 1 must contain exactly 48 Pokemon, got ${pokes.length}`);
  
  const first = pokes[0];
  assert(first.id && first.id.length > 0, 'First Pokemon must have ID');
  assert(first.name && first.name.length > 0, 'First Pokemon must have name');
  assert(typeof first.level === 'number' && first.level >= 1, 'First Pokemon must have level');
  assert(Array.isArray(first.moves) && first.moves.length === 4, `First Pokemon must have 4 moves, got ${first.moves.length}`);
  for (const m of first.moves) {
    assert(VALID_TYPES.has(m.type), `Move type ${m.type} must be valid`);
  }
});

runTest('HTML Parser extraction from production DOM dump (Page 2)', () => {
  const dumpPath2 = path.join(__dirname, 'dom_dumps', 'dump_pokemon_page_2.html');
  assert(fs.existsSync(dumpPath2), 'dump_pokemon_page_2.html must exist');
  const html2 = fs.readFileSync(dumpPath2, 'utf8');
  const pokes2 = teamEngine.extractPokemonFromHtml(html2);
  assert(pokes2.length === 48, `Page 2 must contain exactly 48 Pokemon, got ${pokes2.length}`);
});

let userCollection = [];
runTest('user_collection.json structure and completeness', () => {
  const collPath = path.join(__dirname, 'user_collection.json');
  userCollection = JSON.parse(fs.readFileSync(collPath, 'utf8'));
  assert(Array.isArray(userCollection) && userCollection.length >= 48, `Collection must have at least 48 Pokemon, got ${userCollection.length}`);
  for (const p of userCollection) {
    assert(p.id, 'Pokemon must have id');
    assert(p.name, 'Pokemon must have name');
    assert(p.level >= 1 && p.level <= 100, `${p.name} must have level 1-100`);
    assert(Array.isArray(p.types) && p.types.length >= 1, `${p.name} must have types`);
    assert(Array.isArray(p.moves) && p.moves.length === 4, `${p.name} must have 4 moves`);
  }
});

// -----------------------------------------------------------------------------
// PIPELINE 4: COUNTER RECOMMENDATION ALGORITHM & TYPE CHART
// -----------------------------------------------------------------------------
console.log('\n--- PIPELINE 4: COUNTER RECOMMENDATION ALGORITHM & COMBAT MATH ---');

runTest('Type Chart Multiplier Mathematical Accuracy', () => {
  // Super effective single type (2.0x)
  assert.strictEqual(teamEngine.getMoveEffectiveness('Water', ['Fire']), 2.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Electric', ['Water']), 2.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Ice', ['Dragon']), 2.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fighting', ['Normal']), 2.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fairy', ['Dark']), 2.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Dark', ['Ghost']), 2.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Psychic', ['Fighting']), 2.0);
  
  // Super effective dual type (4.0x) - DelugeRPG Type Chart Matrices
  assert.strictEqual(teamEngine.getMoveEffectiveness('Grass', ['Water', 'Ground']), 4.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Ice', ['Flying', 'Dragon']), 4.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fighting', ['Steel', 'Rock']), 4.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fire', ['Bug', 'Steel']), 4.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Dark', ['Psychic', 'Ghost']), 4.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Ground', ['Fire', 'Steel']), 4.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Rock', ['Fire', 'Flying']), 4.0);
  
  // Resistance single type (0.5x)
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fire', ['Water']), 0.5);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Grass', ['Fire']), 0.5);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fighting', ['Psychic']), 0.5);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Dark', ['Fairy']), 0.5);
  
  // Double resistance dual type (0.25x)
  assert.strictEqual(teamEngine.getMoveEffectiveness('Grass', ['Fire', 'Flying']), 0.25);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Bug', ['Fire', 'Flying']), 0.25);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Grass', ['Bug', 'Steel']), 0.25);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fighting', ['Psychic', 'Bug']), 0.25);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Normal', ['Rock', 'Steel']), 0.25);
  
  // Immunities (0x)
  assert.strictEqual(teamEngine.getMoveEffectiveness('Electric', ['Ground']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Ghost', ['Normal']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Dragon', ['Fairy']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Poison', ['Steel']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Normal', ['Ghost']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Ground', ['Flying']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Psychic', ['Dark']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fighting', ['Ghost']), 0.0);

  // Dual-type cancellation to Neutral (2.0x * 0.5x = 1.0x)
  assert.strictEqual(teamEngine.getMoveEffectiveness('Bug', ['Psychic', 'Fighting']), 1.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Electric', ['Water', 'Ground']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fire', ['Water', 'Grass']), 1.0);
});

runTest('Type Chart Database Integrity & Parity Audit', () => {
  const typeDb = require('./type_chart_database.json');
  assert(typeDb && typeDb.meta, 'type_chart_database.json must have meta header');
  assert.strictEqual(typeDb.types.length, 18, 'Must contain all 18 standard types');
  assert.strictEqual(typeDb.meta.stab_multiplier, 1.5, 'STAB multiplier must be exactly 1.5x');
  assert.strictEqual(typeDb.meta.total_defender_combinations, 171, 'Must contain 171 defender combinations');

  // Verify full parity between type_chart_database and teamEngine for single & dual types
  for (const defKey in typeDb.defenders) {
    const entry = typeDb.defenders[defKey];
    for (const atk of typeDb.types) {
      const dbMult = entry.matchups[atk];
      const engineMult = teamEngine.getMoveEffectiveness(atk, entry.types);
      assert.strictEqual(engineMult, dbMult, `Parity mismatch for ${atk} vs ${defKey}: ${engineMult} !== ${dbMult}`);
    }
  }
});

runTest('Dual-Type Matchup Profiling & Ironclad Defense Evaluation', () => {
  // Test Steel/Fairy defensive profile
  const profile = teamEngine.getDefensiveProfile(['Steel', 'Fairy']);
  assert.deepStrictEqual(profile.immunities.sort(), ['Dragon', 'Poison'].sort());
  assert.deepStrictEqual(profile.doubleResists, ['Bug']);
  assert(profile.weaknesses.includes('Fire') && profile.weaknesses.includes('Ground'), 'Must be weak to Fire and Ground');
  assert.strictEqual(profile.quadWeaknesses.length, 0, 'Steel/Fairy has no quad weaknesses');

  // Defensive Resistance Calculation
  const def1 = teamEngine.getDefensiveResistance(['Fire'], ['Grass']);
  assert.strictEqual(def1, 0.5);
  
  const def2 = teamEngine.getDefensiveResistance(['Ground'], ['Electric']);
  assert.strictEqual(def2, 0.0);

  // Test dual-type candidate defense against dual-type opponent:
  // Moltres (Fire/Flying) vs Heracross (Bug/Fighting)
  const moltres = { id: 'moltres_test', name: 'Moltres', types: ['Fire', 'Flying'], variant: 'Normal', level: 50, moves: [{ name: 'Air Slash', type: 'Flying', power: 75 }] };
  const score = teamEngine.scoreVsSingleOpponent(moltres, ['Bug', 'Fighting'], 50);
  assert.strictEqual(score.resistsAll, true, 'Moltres must resist all Heracross STAB attacks');
  assert.strictEqual(score.worstDefRisk, 0.5, 'Worst incoming STAB must be 0.5x (Fighting: 0.5x, Bug: 0.25x)');
  assert.strictEqual(score.bestMove.multiplier, 4.0, 'Air Slash must be 4.0x quad super effective');
});

runTest('Team Builder against Kanto Brock (Rock/Ground)', () => {
  const brock = gymLeaders.KANTO.find(l => l.name === 'Brock');
  const team = teamEngine.buildBestTeam(brock, userCollection);
  assert.strictEqual(team.length, 6, 'Must return 6 Pokemon');
  
  // Top counter should exploit 4x weakness (Grass or Water)
  const top1 = team[0];
  assert(top1.bestMove.includes('(Grass)') || top1.bestMove.includes('(Water)'), `Top counter move must be Grass or Water: ${top1.bestMove}`);
  assert(top1.role.includes('4.0x'), `Top counter role should highlight 4.0x multiplier: ${top1.role}`);
  
  // Verify all 6 slots are unique IDs
  const idSet = new Set(team.map(p => p.id));
  assert.strictEqual(idSet.size, 6, 'All team member IDs must be distinct');
});

runTest('Team Builder against Kanto Misty (Water)', () => {
  const misty = gymLeaders.KANTO.find(l => l.name === 'Misty');
  const team = teamEngine.buildBestTeam(misty, userCollection);
  assert.strictEqual(team.length, 6, 'Must return 6 Pokemon');
  const top1 = team[0];
  assert(top1.bestMove.includes('(Grass)') || top1.bestMove.includes('(Electric)'), `Top counter against Water must be Grass/Electric: ${top1.bestMove}`);
});

runTest('Team Builder against Kanto Blaine (Fire)', () => {
  const blaine = gymLeaders.KANTO.find(l => l.name === 'Blaine');
  const team = teamEngine.buildBestTeam(blaine, userCollection);
  assert.strictEqual(team.length, 6, 'Must return 6 Pokemon');
  const top1 = team[0];
  assert(top1.bestMove.includes('(Water)') || top1.bestMove.includes('(Ground)') || top1.bestMove.includes('(Rock)'), `Top counter against Fire must be Water/Ground/Rock: ${top1.bestMove}`);
});

runTest('Team Builder against Sinnoh Volkner (Electric)', () => {
  const volkner = gymLeaders.SINNOH.find(l => l.name === 'Volkner');
  const team = teamEngine.buildBestTeam(volkner, userCollection);
  assert.strictEqual(team.length, 6, 'Must return 6 Pokemon');
  const top1 = team[0];
  assert(top1.bestMove.includes('(Ground)'), `Top counter against Electric must be Ground: ${top1.bestMove}`);
});

runTest('Roster Countering: Blue Matchup produces 6 tailored counters (Not 6 Fighting)', () => {
  const blue = gymLeaders.KANTO.find(l => l.name === 'Blue');
  const team = teamEngine.buildBestTeam(blue, userCollection);
  assert.strictEqual(team.length, 6, 'Must return 6 Pokemon');

  // Verify that it is NOT picking 6 Fighting types
  const fightingCount = team.filter(p => p.types && p.types.includes('Fighting')).length;
  assert(fightingCount < 6, `Must not blindly pick 6 fighting types against Blue (found ${fightingCount})`);

  // Verify counters for Blue's specific roster slots
  assert.strictEqual(team[0].targetName, 'Pidgeot');
  assert(team[0].bestMove.includes('(Electric)') || team[0].bestMove.includes('(Rock)'), `Slot 1 vs Pidgeot must use Electric/Rock: ${team[0].bestMove}`);

  assert.strictEqual(team[1].targetName, 'Alakazam');
  assert(team[1].bestMove.includes('(Dark)') || team[1].bestMove.includes('(Ghost)') || team[1].bestMove.includes('(Bug)'), `Slot 2 vs Alakazam must use Dark/Ghost/Bug: ${team[1].bestMove}`);

  assert.strictEqual(team[2].targetName, 'Rhydon');
  assert(team[2].bestMove.includes('(Grass)') || team[2].bestMove.includes('(Water)'), `Slot 3 vs Rhydon must use Grass/Water: ${team[2].bestMove}`);

  assert.strictEqual(team[3].targetName, 'Exeggutor');
  assert(team[3].bestMove.includes('(Bug)') || team[3].bestMove.includes('(Fire)') || team[3].bestMove.includes('(Flying)'), `Slot 4 vs Exeggutor must use Bug/Fire/Flying: ${team[3].bestMove}`);

  assert.strictEqual(team[4].targetName, 'Gyarados');
  assert(team[4].bestMove.includes('(Electric)'), `Slot 5 vs Gyarados must use Electric: ${team[4].bestMove}`);

  assert.strictEqual(team[5].targetName, 'Arcanine');
  assert(team[5].bestMove.includes('(Ground)') || team[5].bestMove.includes('(Water)') || team[5].bestMove.includes('(Rock)'), `Slot 6 vs Arcanine must use Ground/Water/Rock: ${team[5].bestMove}`);
});

runTest('Team Builder Edge Cases (Empty collection & Small collection)', () => {
  const brock = gymLeaders.KANTO.find(l => l.name === 'Brock');
  
  // Empty collection
  const emptyTeam = teamEngine.buildBestTeam(brock, []);
  assert.deepStrictEqual(emptyTeam, [], 'Empty collection must return empty team');
  
  // Null inputs
  assert.deepStrictEqual(teamEngine.buildBestTeam(null, userCollection), []);
  assert.deepStrictEqual(teamEngine.buildBestTeam(brock, null), []);
  
  // Small collection (3 pokemon)
  const smallColl = userCollection.slice(0, 3);
  const smallTeam = teamEngine.buildBestTeam(brock, smallColl);
  assert.strictEqual(smallTeam.length, 3, 'Must return exactly 3 Pokemon when only 3 exist');
  assert.strictEqual(smallTeam[0].slot, 1);
  assert.strictEqual(smallTeam[1].slot, 2);
  assert.strictEqual(smallTeam[2].slot, 3);
  
  // Fallback when Pokemon moves array is empty
  const pokeNoMoves = [{
    id: 'test_pk_1',
    name: 'Venusaur',
    variant: 'Normal',
    level: 100,
    types: ['Grass', 'Poison'],
    moves: []
  }];
  const fallbackTeam = teamEngine.buildBestTeam(brock, pokeNoMoves);
  assert.strictEqual(fallbackTeam.length, 1);
  assert(fallbackTeam[0].bestMove.includes('Grass'), 'Must fallback to primary Pokemon typing');

  // Training Mode filter: only non-level 100 Pokemon (< 100)
  const trainingCandidates = userCollection.filter(p => p.level < 100);
  assert(trainingCandidates.length > 0, 'Training candidates must exist in userCollection');
  const trainingTeam = teamEngine.buildBestTeam(brock, trainingCandidates);
  assert.strictEqual(trainingTeam.length, 6, 'Must return 6 training counters');
  trainingTeam.forEach(p => {
    assert(p.level < 100, `Training counter ${p.name} must be < Lv 100, was ${p.level}`);
  });

  // Two Team Builder Modes Audit: Mode 1 (ALL Levels) vs Mode 2 (TRAINING < 100)
  // Mode 1: ALL Levels produces top counters from full collection
  const allTeam = teamEngine.buildBestTeam(brock, userCollection);
  assert.strictEqual(allTeam.length, 6, 'All Levels mode must return 6 counters');
  assert(allTeam.some(p => p.level === 100), 'All Levels mode can include Level 100 powerhouses');

  // Mode 2: TRAINING Mode produces top counters strictly from non-100 trainees
  assert.strictEqual(trainingTeam.length, 6, 'Training mode must return 6 training counters');
  trainingTeam.forEach(p => {
    assert(p.level < 100, `Training counter ${p.name} must be < Lv 100, was ${p.level}`);
  });
});

runTest('Hardened Skill Analysis & False Judgement Elimination Audit', () => {
  // 1. Move Resolution & Base Power Verification
  const woodHammer = teamEngine.resolveMove({ name: 'Wood Hammer', type: 'Grass' });
  assert.strictEqual(woodHammer.power, 120, 'Wood Hammer base power must be 120');
  assert.strictEqual(woodHammer.isStatus, false, 'Wood Hammer is not a status move');

  const splash = teamEngine.resolveMove({ name: 'Splash', type: 'Normal' });
  assert.strictEqual(splash.isStatus, true, 'Splash must be recognized as 0-damage status move');

  const thunderWave = teamEngine.resolveMove({ name: 'Thunder Wave', type: 'Electric' });
  assert.strictEqual(thunderWave.isStatus, true, 'Thunder Wave must be recognized as status move');

  // 2. Iron Thorns False Judgement Elimination (Electric type without Electric moves)
  const ironThorns = userCollection.find(p => p.name === 'Iron Thorns');
  assert(ironThorns, 'Iron Thorns must exist in user collection');
  const misty = gymLeaders.KANTO.find(l => l.name === 'Misty');
  assert(misty, 'Misty must exist in gymLeaders.KANTO');

  // Iron Thorns must NOT use Electric attack against Water Misty
  const ironThornsScore = teamEngine.scoreVsSingleOpponent(ironThorns, ['Water']);
  assert(!ironThornsScore.bestMove.type.includes('Electric'), 'Iron Thorns has no Electric moves; must never claim Electric attack');
  assert.strictEqual(teamEngine.canSoloTrainer(ironThorns, misty), false, 'Iron Thorns must NOT be judged as able to solo Misty');

  // 3. Cosmog False Judgement Elimination (Status moves only)
  const cosmog = userCollection.find(p => p.name === 'Cosmog');
  if (cosmog) {
    const brock = gymLeaders.KANTO.find(l => l.name === 'Brock');
    assert.strictEqual(teamEngine.canSoloTrainer(cosmog, brock), false, 'Cosmog with only Splash/Tackle cannot solo Brock');
  }

  // 4. Survivability & Level Gap Guards
  const comfey = userCollection.find(p => p.name === 'Comfey' && p.level <= 5);
  if (comfey) {
    const brock = gymLeaders.KANTO.find(l => l.name === 'Brock');
    assert.strictEqual(teamEngine.canSoloTrainer(comfey, brock), true, 'Comfey Lv 3 can solo Brock (Rock/Ground, 4x Petal Blizzard)');

    // Against high level trainer without immunity:
    const hikerHugo = (gymLeaders.STANDARD_TRAINERS || []).find(t => t.name === 'Hiker Hugo');
    if (hikerHugo) {
      assert.strictEqual(teamEngine.canSoloTrainer(comfey, hikerHugo), false, 'Comfey Lv 3 must NOT be judged able to solo Lv 45 Hiker Hugo without immunity');
    }
  }

  // 5. Immunity Guard (Normal Kangaskhan vs Ghost Morty)
  const kangaskhan = userCollection.find(p => p.name.includes('Kangaskhan') && p.level <= 10);
  const morty = gymLeaders.JOHTO.find(l => l.name === 'Morty');
  if (kangaskhan && morty) {
    assert.strictEqual(teamEngine.canSoloTrainer(kangaskhan, morty), true, 'Kangaskhan Lv 2 (Normal type immune to Ghost, Bite 2x) can safely solo Morty');
  }

  // 6. Weakness Guard: No false solo judgements when defender has elemental weaknesses
  const lando = userCollection.find(p => p.name.includes('Landorus'));
  const iris = gymLeaders.UNOVA.find(l => l.name === 'Iris');
  if (lando && iris) {
    assert.strictEqual(teamEngine.canSoloTrainer(lando, iris), false, 'Landorus must NOT be judged able to solo Iris due to Lapras Ice 4x weakness');
  }

  const regigigas = userCollection.find(p => p.name.includes('Regigigas'));
  const bruno = gymLeaders.KANTO.find(l => l.name === 'Bruno');
  if (regigigas && bruno) {
    assert.strictEqual(teamEngine.canSoloTrainer(regigigas, bruno), false, 'Regigigas must NOT be judged able to solo Bruno due to Fighting 2x weakness');
  }

  // 7. Carry Defense Ranking & Roster Exposure Calculation Audit
  const lvl100Pokes = userCollection.filter(p => p.level === 100);
  assert(lvl100Pokes.length > 0, 'Level 100 Pokemon must exist in collection');
  const brock = gymLeaders.KANTO.find(l => l.name === 'Brock');
  const rankedCarries = teamEngine.rankCarries(lvl100Pokes, brock);
  assert(Array.isArray(rankedCarries) && rankedCarries.length > 0, 'rankCarries must return ranked list');
  rankedCarries.forEach(c => {
    assert(c.poke && c.exposure, 'Carry must have poke and exposure metrics');
    assert(typeof c.exposure.effective === 'number', 'Effective exposure must be numeric');
    assert(c.exposure.effective >= 0.0 && c.exposure.effective <= 4.0, 'Effective exposure must be in valid bounds');
  });

  // 8. Species Diversity & Move Power Audit
  assert.strictEqual(teamEngine.getBaseSpecies('Ghostly Wo-chien'), 'wo-chien');
  assert.strictEqual(teamEngine.getBaseSpecies('Shaymin (Sky)'), 'shaymin');
  assert.strictEqual(teamEngine.getBaseSpecies('Dark Buzzwole'), 'buzzwole');

  const bertha = (gymLeaders.SINNOH || []).find(l => l.name === 'Bertha');
  if (bertha) {
    const trainingCandidates = userCollection.filter(p => p.level < 100);
    const berthaTeam = teamEngine.buildBestTeam(bertha, trainingCandidates);
    const speciesList = berthaTeam.map(p => teamEngine.getBaseSpecies(p.name));
    const uniqueSpecies = new Set(speciesList);
    assert.strictEqual(uniqueSpecies.size, berthaTeam.length, 'Every Pokemon in the counter team must be a distinct species (no clones)');
    assert(berthaTeam[0].bestMove.includes('Pwr'), 'bestMove must include base power indicator');
  }
});

runTest('Candidate Pool Categorization & List Accuracy Audit', () => {
  assert(Array.isArray(teamEngine.ULTRA_BEASTS) && teamEngine.ULTRA_BEASTS.length === 11, 'Must have 11 Ultra Beasts');
  assert(Array.isArray(teamEngine.PARADOX_SPECIES) && teamEngine.PARADOX_SPECIES.length === 20, 'Must have 20 Paradox species');
  assert(Array.isArray(teamEngine.GMAX_SPECIES) && teamEngine.GMAX_SPECIES.length >= 32, 'Must have all G-Max species');
  assert(Array.isArray(teamEngine.LEGENDARY_SPECIES) && teamEngine.LEGENDARY_SPECIES.length >= 70, 'Must have all Legendaries');

  // Verify sample classifications
  assert.strictEqual(teamEngine.isGmaxPokemon('Venusaur'), true, 'Venusaur must be G-Max capable');
  assert.strictEqual(teamEngine.isGmaxPokemon('G-Max Charizard'), true, 'G-Max Charizard must be G-Max');
  assert.strictEqual(teamEngine.isGmaxPokemon('Metallic Melmetal'), true, 'Melmetal must be G-Max capable');
  assert.strictEqual(teamEngine.isGmaxPokemon('Ghostly Mega Charizard Y'), false, 'Mega forms must not be G-Max candidates');

  assert.strictEqual(teamEngine.isUltraBeast('Dark Buzzwole'), true, 'Buzzwole must be Ultra Beast');
  assert.strictEqual(teamEngine.isUltraBeast('Celesteela'), true, 'Celesteela must be Ultra Beast');

  assert.strictEqual(teamEngine.isParadoxPokemon('Iron Moth'), true, 'Iron Moth must be Paradox');
  assert.strictEqual(teamEngine.isParadoxPokemon('Roaring Moon'), true, 'Roaring Moon must be Paradox');

  assert.strictEqual(teamEngine.isLegendaryPokemon('Calyrex (Shadow Rider)'), true, 'Calyrex must be Legendary');
  assert.strictEqual(teamEngine.isLegendaryPokemon('Zamazenta (Hero)'), true, 'Zamazenta must be Legendary');
  assert.strictEqual(teamEngine.isLegendaryPokemon('Buzzwole'), false, 'Ultra Beasts must not be in Legendary category');
  assert.strictEqual(teamEngine.isLegendaryPokemon('Iron Moth'), false, 'Paradox must not be in Legendary category');

  assert.strictEqual(teamEngine.isCommonPokemon('Dark Chesnaught'), true, 'Chesnaught must be Common');
  assert.strictEqual(teamEngine.isCommonPokemon('Comfey'), true, 'Comfey must be Common');
  assert.strictEqual(teamEngine.isCommonPokemon('Calyrex'), false, 'Legendary must not be Common');

  // Test pool filtering function
  const allPokes = teamEngine.filterCandidatePool(userCollection, 'ANY');
  assert.strictEqual(allPokes.length, userCollection.length, 'ANY must return all collection');
  const gmaxPokes = teamEngine.filterCandidatePool(userCollection, 'GMAX');
  assert(gmaxPokes.length > 0 && gmaxPokes.every(teamEngine.isGmaxPokemon), 'GMAX must return only G-Max');
  const ubPokes = teamEngine.filterCandidatePool(userCollection, 'ULTRABEAST');
  assert(ubPokes.length > 0 && ubPokes.every(teamEngine.isUltraBeast), 'ULTRABEAST must return only UBs');
  const paraPokes = teamEngine.filterCandidatePool(userCollection, 'PARADOX');
  assert(paraPokes.length > 0 && paraPokes.every(teamEngine.isParadoxPokemon), 'PARADOX must return only Paradox');
  const legPokes = teamEngine.filterCandidatePool(userCollection, 'LEGENDARY');
  assert(legPokes.length > 0 && legPokes.every(teamEngine.isLegendaryPokemon), 'LEGENDARY must return only Legendaries');
  const comPokes = teamEngine.filterCandidatePool(userCollection, 'COMMON');
  assert(comPokes.length > 0 && comPokes.every(teamEngine.isCommonPokemon), 'COMMON must return only Commons');
});

runTest('PvP God Squad Algorithm & Universal Meta Coverage Audit', () => {
  assert(typeof teamEngine.buildGodSquadTeam === 'function', 'teamEngine must export buildGodSquadTeam');
  const godSquad = teamEngine.buildGodSquadTeam(userCollection, 'ANY');
  assert.strictEqual(godSquad.length, 6, 'God Squad must assemble 6 Pokemon');

  // Verify 6 distinct species
  const species = new Set(godSquad.map(p => teamEngine.getBaseSpecies(p.name)));
  assert.strictEqual(species.size, 6, 'God Squad must contain 6 unique base species');

  // Verify all 6 distinct roles
  const roles = godSquad.map(p => p.role);
  assert(roles.includes('LEAD SWEEPER'), 'God Squad must include LEAD SWEEPER');
  assert(roles.includes('WALLBREAKER'), 'God Squad must include WALLBREAKER');
  assert(roles.includes('IMMORTAL TANK'), 'God Squad must include IMMORTAL TANK');
  assert(roles.includes('FAIRY DRAGON-SLAYER'), 'God Squad must include FAIRY DRAGON-SLAYER');
  assert(roles.includes('GROUND/ELECTRIC PIVOT'), 'God Squad must include GROUND/ELECTRIC PIVOT');
  assert(roles.includes('ARMOR ANCHOR'), 'God Squad must include ARMOR ANCHOR');

  // Verify tier-restricted God Squad assembly
  const legSquad = teamEngine.buildGodSquadTeam(userCollection, 'LEGENDARY');
  assert(legSquad.length > 0 && legSquad.every(p => teamEngine.isLegendaryPokemon(p.name)), 'LEGENDARY God Squad must contain only Legendaries');
});

// -----------------------------------------------------------------------------
// PIPELINE 5: UI DOM ELEMENTS & ZERO-GLOW CSS AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- PIPELINE 5: UI DOM ELEMENTS & ZERO-GLOW CSS AUDIT ---');

const appHtml = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');

runTest('app.html: All Team Builder DOM elements present', () => {
  const requiredElements = [
    'id="teamBuilderMenuBtn"',
    'id="teamBuilderModal"',
    'id="closeTeamBuilderBtn"',
    'id="scanPokesBtn"',
    'id="scanStatusDot"',
    'id="scanStatusBadge"',
    'id="trainerIntelModal"',
    'id="closeTrainerIntelBtn"',
    'id="teamModeNpcBtn"',
    'id="teamModePvpBtn"',
    'id="teamNpcSection"',
    'id="teamPvpSection"',
    'id="teamCategorySelect"',
    'id="teamTrainerSelect"',
    'id="poolModeAllBtn"',
    'id="poolModeTrainingBtn"',
    'id="candidatePoolFilterSelect"',
    'id="trainingStatsBadge"',
    'id="pvpLiveStatusBadge"',
    'id="pvpLiveOpponentCard"',
    'id="pvpLiveSummary"',
    'id="pvpLiveRosterStrip"',
    'id="checkLiveBattleBtn"',
    'id="pvpScoutInput"',
    'id="pvpScoutBtn"',
    'id="pvpScoutStatusBadge"',
    'id="pvpScoutResultCard"',
    'id="pvpScoutedName"',
    'id="pvpScoutClearBtn"',
    'id="pvpScoutedRosterStrip"',
    'id="pvpStrategySelect"',
    'id="pvpCandidateTierSelect"',
    'id="buildTeamBtn"',
    'id="teamResultContainer"',
    'id="teamResultList"',
    'id="teamActionRow"',
    'id="teamActionStatus"',
    'id="copyTeamBtn"',
    'id="applyTeamBtn"',
    'id="battleOpponentBtn"'
  ];
  for (const el of requiredElements) {
    assert(appHtml.includes(el), `Element ${el} must exist in app.html`);
  }
});

runTest('app.html & app.js: Live Battle PvP & Pre-Battle Player Scout UI Audit', () => {
  const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert(appJsContent.includes('function setTeamBattleMode('), 'app.js must define setTeamBattleMode');
  assert(appJsContent.includes('function updatePvpBuildButtonLabel('), 'app.js must define updatePvpBuildButtonLabel');
  assert(appJsContent.includes('function updateLiveChallengerUI('), 'app.js must define updateLiveChallengerUI');
  assert(appJsContent.includes('function renderScoutedPlayerCard('), 'app.js must define renderScoutedPlayerCard');
  assert(appJsContent.includes('function triggerPlayerScout('), 'app.js must define triggerPlayerScout');
  assert(appJsContent.includes('function executePvPTeamBuild('), 'app.js must define executePvPTeamBuild');
  assert(appJsContent.includes("teamModeNpcBtn.addEventListener('click'"), 'teamModeNpcBtn must have click listener');
  assert(appJsContent.includes("teamModePvpBtn.addEventListener('click'"), 'teamModePvpBtn must have click listener');
  assert(appJsContent.includes("pvpScoutBtn.addEventListener('click'"), 'pvpScoutBtn must have click listener');
  assert(appJsContent.includes("checkLiveBattleBtn.addEventListener('click'"), 'checkLiveBattleBtn must have click listener');
  assert(appJsContent.includes("pvpStrategySelect.addEventListener('change'"), 'pvpStrategySelect must have change listener');
  assert(appJsContent.includes("pvpCandidateTierSelect.addEventListener('change'"), 'pvpCandidateTierSelect must have change listener');
  assert(appJsContent.includes("return '/battle/live'"), 'resolveTargetBattleUrl must route to /battle/live in PvP mode');
});

runTest('app.html & app.js: Smart Matchmaker fully removed with zero residue', () => {
  // Verify app.html zero residue
  assert(!appHtml.includes('suggestTrainingMatchBtn'), 'suggestTrainingMatchBtn must not exist in app.html');
  assert(!appHtml.includes('nextTrainingMatchBtn'), 'nextTrainingMatchBtn must not exist in app.html');
  assert(!appHtml.includes('matchmakerBanner'), 'matchmakerBanner must not exist in app.html');
  assert(!appHtml.includes('Smart Matchmaker'), 'Smart Matchmaker label must not exist in app.html');

  // Verify app.js zero residue
  const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert(!appJs.includes('suggestTrainingMatchBtn'), 'suggestTrainingMatchBtn must not exist in app.js');
  assert(!appJs.includes('nextTrainingMatchBtn'), 'nextTrainingMatchBtn must not exist in app.js');
  assert(!appJs.includes('matchmakerBanner'), 'matchmakerBanner must not exist in app.js');
  assert(!appJs.includes('applyTrainingMatch'), 'applyTrainingMatch must not exist in app.js');
  assert(!appJs.includes('findTopTrainingMatches'), 'findTopTrainingMatches must not exist in app.js');
  assert(!appJs.includes('currentTrainingMatches'), 'currentTrainingMatches must not exist in app.js');

  // Verify team_engine.js zero residue
  const teamEngineJs = fs.readFileSync(path.join(__dirname, 'team_engine.js'), 'utf8');
  assert(!teamEngineJs.includes('findTopTrainingMatches'), 'findTopTrainingMatches must not exist in team_engine.js');
});

runTest('app.html & app.js: Zero glowing shadows and zero unnecessary text information lines on Team Builder & UI elements', () => {
  // Extract teamBuilderModal block
  const start = appHtml.indexOf('id="teamBuilderModal"');
  assert(start !== -1, 'teamBuilderModal must exist');
  const end = appHtml.indexOf('</div>', appHtml.indexOf('id="teamActionRow"'));
  const modalSlice = appHtml.slice(start, end + 300);
  
  // Check that no box-shadow with colored rgba or glow exists
  assert(!modalSlice.includes('0 0 1'), 'Must not have glowing box-shadow in team builder modal');
  assert(!modalSlice.includes('box-shadow: 0 0 20px'), 'Must not have 20px glowing box-shadow');

  // Verify renderTeamLineup in app.js has zero redundant text information lines (no cleanRole/roleDesc/header) while preserving CSS borders
  const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const renderStart = appJsContent.indexOf('function renderTeamLineup(');
  const renderEnd = appJsContent.indexOf('function executeTeamBuild(');
  const renderSlice = appJsContent.slice(renderStart, renderEnd);
  assert(renderSlice.includes('border:1px solid #1a283e'), 'renderTeamLineup must retain 1px solid #1a283e CSS borders on lineup cards');
  assert(!renderSlice.includes('p.roleDesc'), 'renderTeamLineup must not render redundant roleDesc text line');
  assert(!renderSlice.includes('cleanRole'), 'renderTeamLineup must not render redundant cleanRole text line under badge');
  assert(!appHtml.includes('Open any player\'s profile or live battle'), 'app.html must not contain verbose instructional text lines in Live Opponent card');
  assert(!appHtml.includes('Cosmetic zero-shift hiding active'), 'app.html must not contain verbose overview paragraph in Ads Inspector');
  assert(!appHtml.includes('Persistent log of target Pokemon automatically caught today'), 'app.html must not contain verbose overview paragraph in Auto-Catch panel');
});

runTest('app.html & app.js: 3/4 + 1/4 docked split view layout audit (Zero overlap, zero modal backdrop)', () => {
  // Check app.html CSS layout rules
  assert(appHtml.includes('flex-direction: row;'), 'gameContainer must be a horizontal flex row');
  assert(appHtml.includes('width: 75%;') && appHtml.includes('flex: 3;'), 'delugeView must have 3/4 (75%, flex: 3) ratio');
  assert(appHtml.includes('width: 25%;') && appHtml.includes('flex: 1;'), 'teamBuilderModal must have 1/4 (25%, flex: 1) ratio');
  
  // Verify teamBuilderModal is nested inside gameContainer alongside delugeView (zero overlap)
  const gameContainerStart = appHtml.indexOf('id="gameContainer"');
  assert(gameContainerStart !== -1, 'gameContainer must exist');
  const gameContainerBlock = appHtml.slice(gameContainerStart);
  assert(gameContainerBlock.includes('id="delugeView"'), 'delugeView must be inside gameContainer');
  assert(gameContainerBlock.includes('id="teamBuilderModal"'), 'teamBuilderModal must be inside gameContainer');
  assert(!gameContainerBlock.includes('id="teamBuilderModal" class="modal-box"'), 'teamBuilderModal must NOT have modal-box class (docked panel, not a popup modal)');

  // Verify app.js toggle and panel functions
  const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert(appJsContent.includes('function openTeamBuilderPanel()'), 'app.js must define openTeamBuilderPanel');
  assert(appJsContent.includes('function closeTeamBuilderPanel()'), 'app.js must define closeTeamBuilderPanel');
  assert(appJsContent.includes('function toggleTeamBuilderPanel()'), 'app.js must define toggleTeamBuilderPanel');
  assert(!appJsContent.includes('showModal(teamBuilderModal)'), 'app.js must NOT treat teamBuilderModal as a popup modal with backdrop');
});

runTest('app.html & app.js: Regional Filtering & DOM Clean Slate Audit', () => {
  // DOM search removed and prompt bindings verified
  assert(!appHtml.includes('id="trainerSearchInput"'), 'trainerSearchInput must be removed from app.html');
  assert(!appHtml.includes('id="clearTrainerSearchBtn"'), 'clearTrainerSearchBtn must be removed from app.html');
  assert(appHtml.includes('id="filteredTrainerCountBadge"'), 'filteredTrainerCountBadge must exist in app.html');
  assert(appHtml.includes('id="teamEmptyPrompt"'), 'teamEmptyPrompt must exist in app.html');

  // Regional leagues in category dropdown
  assert(appHtml.includes('value="PALDEA"'), 'Paldea League option must exist');
  assert(appHtml.includes('value="KANTO"'), 'Kanto League option must exist');
  assert(appHtml.includes('value="GALAR"'), 'Galar League option must exist');

  // Controller regional filter wiring
  const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert(appJsContent.includes('teamCategorySelect.addEventListener'), 'teamCategorySelect change listener must exist');
  assert(!appJsContent.includes('trainerSearchInput'), 'trainerSearchInput must not exist in app.js');

  // Preload DOM snapshot cleaner verification
  const preloadContent = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');
  assert(preloadContent.includes("if (triggerReason !== 'manual-F8') return;"), 'game-preload.js must disable unprompted auto DOM dumps');

  // Verify only essential fixtures remain in dom_dumps
  const dumps = fs.readdirSync(path.join(__dirname, 'dom_dumps')).filter(f => f.endsWith('.html'));
  assert.strictEqual(dumps.length, 2, `dom_dumps must contain exactly 2 fixture HTML files, found ${dumps.length}`);
  assert(dumps.includes('dump_pokemon.html'), 'dump_pokemon.html must remain');
  assert(dumps.includes('dump_pokemon_page_2.html'), 'dump_pokemon_page_2.html must remain');
});

runTest('app.html & app.js: Favorite Opponents Star Button & Preset Filtering Audit', () => {
  assert(appHtml.includes('id="favTrainerBtn"'), 'favTrainerBtn must exist in app.html');
  assert(appHtml.includes('class="btn-fav-star"'), 'btn-fav-star CSS class must exist in app.html');
  assert(appHtml.includes('value="FAVORITES"'), 'FAVORITES option must exist in teamCategorySelect');

  const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert(appJsContent.includes('const favTrainerBtn = document.getElementById(\'favTrainerBtn\')'), 'favTrainerBtn reference must exist in app.js');
  assert(appJsContent.includes('function getFavoriteTrainersList()'), 'getFavoriteTrainersList must exist in app.js');
  assert(appJsContent.includes('function isTrainerFavorite('), 'isTrainerFavorite must exist in app.js');
  assert(appJsContent.includes('function toggleTrainerFavorite('), 'toggleTrainerFavorite must exist in app.js');
  assert(appJsContent.includes('function updateFavTrainerButton()'), 'updateFavTrainerButton must exist in app.js');
  assert(appJsContent.includes('function updateCategoryFavoritesCount()'), 'updateCategoryFavoritesCount must exist in app.js');
  assert(appJsContent.includes("favTrainerBtn.addEventListener('click'"), 'favTrainerBtn click listener must exist in app.js');
  assert(appJsContent.includes("categoryFilter === 'FAVORITES'"), 'FAVORITES filter branch must exist in populateGymTrainerSelect');
  assert(appJsContent.includes('config.settings.teamCategoryFilter = teamCategorySelect.value'), 'app.js must persist teamCategoryFilter on change');
  assert(appJsContent.includes('config.settings.lastSelectedTrainer = selVal'), 'app.js must persist lastSelectedTrainer on change');
  assert(appJsContent.includes("getWritableDataPath('favorite_trainers.json')"), 'app.js must persist favorites to dedicated favorite_trainers.json file');
});

runTest('app.js: Training Mode Carry Anchor Leads in Slot 1 Audit', () => {
  const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert(appJsContent.includes("targetName: 'Safety Anchor & Carry'") && appJsContent.includes('slot: 1'), 'Carry Anchor must lead at Slot 1 in Training mode');
  assert(appJsContent.includes("targetName: isSolo ? 'Solo Sweeper' : ('Trainee #' + (slotNum - (carry ? 1 : 0)))"), 'Trainee counters must follow sequentially in slots 2 through 6');
});

runTest('app.html & app.js: Ads Inspector docked panel & telemetry UI audit', () => {
  const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert(appHtml.includes('id="adsInspectorModal"'), 'adsInspectorModal must exist in app.html');
  assert(appHtml.includes('id="adsInspectorMenuBtn"'), 'adsInspectorMenuBtn must exist in app.html');
  assert(appHtml.includes('id="rescanAdsBtn"'), 'rescanAdsBtn must exist in app.html');
  assert(appHtml.includes('id="clearAdsLogBtn"'), 'clearAdsLogBtn must exist in app.html');
  assert(appHtml.includes('id="adsFeedList"'), 'adsFeedList must exist in app.html');

  // Verify docked 1/4 layout ratio for adsInspectorModal
  assert(appHtml.includes('#teamBuilderModal, #adsInspectorModal'), 'adsInspectorModal must share docked side panel CSS');

  // Verify controller functions
  assert(appJsContent.includes('function openAdsInspectorPanel()'), 'app.js must define openAdsInspectorPanel');
  assert(appJsContent.includes('function closeAdsInspectorPanel()'), 'app.js must define closeAdsInspectorPanel');
  assert(appJsContent.includes('function toggleAdsInspectorPanel()'), 'app.js must define toggleAdsInspectorPanel');
  assert(appJsContent.includes('function renderAdsInspectorUI()'), 'app.js must define renderAdsInspectorUI');

  // Zero-glow verification
  const start = appHtml.indexOf('id="adsInspectorModal"');
  assert(start !== -1, 'adsInspectorModal must exist in HTML');
  const modalSlice = appHtml.slice(start, start + 3000);
  assert(!modalSlice.includes('0 0 1'), 'Must not have glowing box-shadow in ads inspector modal');
});

runTest('app.html & app.js: Daily Auto-Catch Badge, Docked Panel, & Network Badge Relocation Audit', () => {
  const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

  // Verify Toolbar Badge
  assert(appHtml.includes('id="dailyCaughtBtn"'), 'dailyCaughtBtn must exist in app.html');
  assert(appHtml.includes('id="caughtSummaryText"'), 'caughtSummaryText must exist in app.html');
  assert(appHtml.includes('id="mbSummaryText"'), 'mbSummaryText must exist in app.html');

  // Verify Network Badge Relocation inside Nav Dropdown
  const navDropdownStart = appHtml.indexOf('id="navDropdown"');
  assert(navDropdownStart !== -1, 'navDropdown must exist');
  const navDropdownBlock = appHtml.slice(navDropdownStart, appHtml.indexOf('id="targetModal"'));
  assert(navDropdownBlock.includes('id="networkBadge"'), 'networkBadge must be relocated inside navDropdown');
  assert(navDropdownBlock.includes('id="netIcon"'), 'netIcon must be inside networkBadge in navDropdown');
  assert(navDropdownBlock.includes('id="netText"'), 'netText must be inside networkBadge in navDropdown');

  // Verify Docked Side Panel (1/4 ratio, flex: 1, zero modal backdrop)
  assert(appHtml.includes('id="catchLogModal"'), 'catchLogModal must exist in app.html');
  assert(appHtml.includes('#teamBuilderModal, #adsInspectorModal, #catchLogModal'), 'catchLogModal must share docked side panel CSS');
  assert(appHtml.includes('id="catchFeedList"'), 'catchFeedList must exist in app.html');
  assert(appHtml.includes('id="clearCatchLogBtn"'), 'clearCatchLogBtn must exist in app.html');
  assert(appHtml.includes('id="refreshCatchLogBtn"'), 'refreshCatchLogBtn must exist in app.html');
  assert(appHtml.includes('id="catchStatCount"'), 'catchStatCount must exist in app.html');
  assert(appHtml.includes('id="catchStatMbStock"'), 'catchStatMbStock must exist in app.html');
  assert(appHtml.includes('id="catchStatMbUsed"'), 'catchStatMbUsed must exist in app.html');

  // Verify controller functions in app.js
  assert(appJsContent.includes('function openCatchLogPanel()'), 'app.js must define openCatchLogPanel');
  assert(appJsContent.includes('function closeCatchLogPanel()'), 'app.js must define closeCatchLogPanel');
  assert(appJsContent.includes('function toggleCatchLogPanel()'), 'app.js must define toggleCatchLogPanel');
  assert(appJsContent.includes('function renderCatchLogUI()'), 'app.js must define renderCatchLogUI');
  assert(appJsContent.includes('function recordCaughtPokemon('), 'app.js must define recordCaughtPokemon');
  assert(appJsContent.includes('function updateBallInventory('), 'app.js must define updateBallInventory');
  assert(appJsContent.includes('function loadDailyCatchLog()'), 'app.js must define loadDailyCatchLog');
  assert(appJsContent.includes('function saveDailyCatchLog()'), 'app.js must define saveDailyCatchLog');

  // Verify zero glowing box-shadows on catch log elements
  const catchLogStart = appHtml.indexOf('id="catchLogModal"');
  assert(catchLogStart !== -1, 'catchLogModal must exist in HTML');
  const catchModalSlice = appHtml.slice(catchLogStart, catchLogStart + 4000);
  assert(!catchModalSlice.includes('0 0 1'), 'Must not have glowing box-shadow in catch log panel');
});

// -----------------------------------------------------------------------------
// PIPELINE 6: IPC CHANNELS & CONTROLLER CONTRACT INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- PIPELINE 6: IPC CHANNELS & CONTROLLER INTEGRITY AUDIT ---');

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const preloadJs = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');
const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

runTest('IPC Channel: start-scan-pokemon parity', () => {
  assert(appJs.includes("delugeView.send('start-scan-pokemon')"), 'app.js must send start-scan-pokemon');
  assert(preloadJs.includes("ipcRenderer.on('start-scan-pokemon'"), 'game-preload.js must listen for start-scan-pokemon');
});

runTest('IPC Channel: scan-pokemon-status parity', () => {
  assert(preloadJs.includes("ipcRenderer.sendToHost('scan-pokemon-status'"), 'game-preload.js must emit scan-pokemon-status');
  assert(appJs.includes("event.channel === 'scan-pokemon-status'"), 'app.js must handle scan-pokemon-status');
});

runTest('IPC Channel: pokemon-scan-complete parity', () => {
  assert(preloadJs.includes("ipcRenderer.sendToHost('pokemon-scan-complete'"), 'game-preload.js must emit pokemon-scan-complete');
  assert(appJs.includes("event.channel === 'pokemon-scan-complete'"), 'app.js must handle pokemon-scan-complete');
});

runTest('IPC Channel: start-scan-trainer-rosters parity', () => {
  assert(appJs.includes("delugeView.send('start-scan-trainer-rosters'"), 'app.js must send start-scan-trainer-rosters');
  assert(preloadJs.includes("ipcRenderer.on('start-scan-trainer-rosters'"), 'game-preload.js must listen for start-scan-trainer-rosters');
});

runTest('IPC Channel: scan-trainers-status parity', () => {
  assert(preloadJs.includes("ipcRenderer.sendToHost('scan-trainers-status'"), 'game-preload.js must emit scan-trainers-status');
  assert(appJs.includes("event.channel === 'scan-trainers-status'"), 'app.js must handle scan-trainers-status');
});

runTest('IPC Channel: apply-team-slots parity', () => {
  assert(appJs.includes("delugeView.send('apply-team-slots'"), 'app.js must send apply-team-slots');
  assert(preloadJs.includes("ipcRenderer.on('apply-team-slots'"), 'game-preload.js must listen for apply-team-slots');
});

runTest('IPC Channel: team-apply-complete parity', () => {
  assert(preloadJs.includes("ipcRenderer.sendToHost('team-apply-complete'"), 'game-preload.js must emit team-apply-complete');
  assert(appJs.includes("event.channel === 'team-apply-complete'"), 'app.js must handle team-apply-complete');
});

runTest('IPC Channel: battle-opponents-detected parity', () => {
  assert(preloadJs.includes("ipcRenderer.sendToHost('battle-opponents-detected'"), 'game-preload.js must emit battle-opponents-detected');
  assert(appJs.includes("event.channel === 'battle-opponents-detected'"), 'app.js must handle battle-opponents-detected');
});

runTest('IPC Channel: check-battle-opponents parity', () => {
  assert(appJs.includes("delugeView.send('check-battle-opponents')"), 'app.js must send check-battle-opponents');
  assert(preloadJs.includes("ipcRenderer.on('check-battle-opponents'"), 'game-preload.js must listen for check-battle-opponents');
});

runTest('IPC Channel: scout-player-roster, player-scouted-roster & Manual Profile Modal Stalking parity', () => {
  assert(preloadJs.includes("ipcRenderer.on('scout-player-roster'"), 'game-preload.js must listen for scout-player-roster');
  assert(appJs.includes("delugeView.send('scout-player-roster'"), 'app.js must send scout-player-roster');
  assert(preloadJs.includes("ipcRenderer.sendToHost('player-scouted-roster'"), 'game-preload.js must emit player-scouted-roster');
  assert(appJs.includes("event.channel === 'player-scouted-roster'"), 'app.js must handle player-scouted-roster');
  assert(preloadJs.includes("ipcRenderer.sendToHost('player-scout-status'"), 'game-preload.js must emit player-scout-status');
  assert(appJs.includes("event.channel === 'player-scout-status'"), 'app.js must handle player-scout-status');
  assert(preloadJs.includes("function extractRosterFromProfileDocument("), 'game-preload.js must define extractRosterFromProfileDocument');
  assert(preloadJs.includes("function extractRosterFromProfileJson("), 'game-preload.js must define extractRosterFromProfileJson');
  assert(preloadJs.includes("function extractProfileMetadataFromContainer("), 'game-preload.js must define extractProfileMetadataFromContainer');
  assert(preloadJs.includes("function isProfileModalOpen("), 'game-preload.js must define isProfileModalOpen');
  assert(!preloadJs.includes("initProfileModalObserver"), 'game-preload.js must NOT auto-observe #DModal without user clicking Check Active Screen');
  assert(preloadJs.includes("detectBattleOpponents(true)"), 'check-battle-opponents must invoke detectBattleOpponents(true)');
  assert(preloadJs.includes("#viewuteam li, .viewuteammember"), 'game-preload.js must extract from #viewuteam .viewuteammember');
  assert(preloadJs.includes("/ajax/profile/u/"), 'game-preload.js must query DelugeRPG /ajax/profile/u/ endpoint');
});

runTest('IPC Channel: soft-session-flush parity (Zero-Logout Battle Cache Flush)', () => {
  assert(mainJs.includes("ipcMain.handle('soft-session-flush'"), 'main.js must handle soft-session-flush');
  assert(appJs.includes("ipcRenderer.invoke('soft-session-flush')"), 'app.js must invoke soft-session-flush');
  // Ensure soft-session-flush does NOT delete cookies (guarantees zero-logout)
  const flushStart = mainJs.indexOf("ipcMain.handle('soft-session-flush'");
  const flushBlock = mainJs.slice(flushStart, flushStart + 400);
  assert(!flushBlock.includes("'cookies'"), 'soft-session-flush must NEVER wipe cookies (preserves login session)');
});

runTest('IPC Channel: ads-listener-update parity', () => {
  assert(preloadJs.includes("ipcRenderer.sendToHost('ads-listener-update'"), 'game-preload.js must emit ads-listener-update');
  assert(appJs.includes("event.channel === 'ads-listener-update'"), 'app.js must handle ads-listener-update');
});

runTest('IPC Channel: ad-detected-event parity', () => {
  assert(preloadJs.includes("ipcRenderer.sendToHost('ad-detected-event'"), 'game-preload.js must emit ad-detected-event');
  assert(appJs.includes("event.channel === 'ad-detected-event'"), 'app.js must handle ad-detected-event');
});

runTest('IPC Channel: scan-page-ads parity', () => {
  assert(appJs.includes("delugeView.send('scan-page-ads')"), 'app.js must send scan-page-ads');
  assert(preloadJs.includes("ipcRenderer.on('scan-page-ads'"), 'game-preload.js must listen for scan-page-ads');
});

runTest('IPC Channel: ball-inventory-update & request-ball-inventory parity', () => {
  assert(preloadJs.includes("ipcRenderer.sendToHost('ball-inventory-update'"), 'game-preload.js must emit ball-inventory-update');
  assert(appJs.includes("event.channel === 'ball-inventory-update'"), 'app.js must handle ball-inventory-update');
  assert(appJs.includes("delugeView.send('request-ball-inventory')"), 'app.js must send request-ball-inventory');
  assert(preloadJs.includes("ipcRenderer.on('request-ball-inventory'"), 'game-preload.js must listen for request-ball-inventory');
});

runTest('IPC Channel: manual-step parity & guest input safety', () => {
  assert(preloadJs.includes("ipcRenderer.sendToHost('manual-step'"), 'game-preload.js must emit manual-step');
  assert(appJs.includes("event.channel === 'manual-step'"), 'app.js must handle manual-step');
  assert(preloadJs.includes("const nonTextTypes = ['checkbox', 'radio', 'button'"), 'game-preload.js must exclude checkboxes/buttons from guest input focus traps');
});

// -----------------------------------------------------------------------------
// PIPELINE 7: TEAM APPLY STATE MACHINE & DOM MANIPULATION AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- PIPELINE 7: TEAM APPLY STATE MACHINE & EXECUTION AUDIT ---');

runTest('Team Save Spy & Interceptor: Active on /team/edit', () => {
  assert(preloadJs.includes("function injectTeamSaveSpy()"), 'injectTeamSaveSpy must exist');
  assert(preloadJs.includes("DELUGE_TEAM_INTERCEPT"), 'Must intercept and emit DELUGE_TEAM_INTERCEPT');
  assert(preloadJs.includes("team-intercept-captured"), 'Must send team-intercept-captured to host');
  assert(appJs.includes("team-intercept-captured"), 'app.js must handle team-intercept-captured');
  assert(mainJs.includes("NETWORK_POST"), 'main.js must intercept raw network POST requests');
});

runTest('Writable Data Path & Team Endpoint Security Audit', () => {
  assert(appJs.includes('function getWritableDataPath('), 'app.js must define getWritableDataPath');
  assert(appJs.includes('function readDataFile('), 'app.js must define readDataFile');
  assert(preloadJs.includes('function isDelugeTeamRequest('), 'game-preload.js must filter team requests');
  assert(preloadJs.includes('isSpeciesOnlyPreset'), 'game-preload.js must evaluate isSpeciesOnlyPreset');
});

runTest('Smooth Adblock Simulation & Parent Wrapper Collapse Engine Audit', () => {
  assert(preloadJs.includes('function classifyAdElement('), 'classifyAdElement must exist');
  assert(preloadJs.includes('function smoothCollapseAd('), 'smoothCollapseAd must exist');
  assert(preloadJs.includes('function scanAllAdsInDOM()'), 'scanAllAdsInDOM must exist');
  assert(preloadJs.includes('function initAdsObserver()'), 'initAdsObserver must exist');
  assert(preloadJs.includes('function initAdPushesHook()'), 'initAdPushesHook must exist');
  assert(preloadJs.includes('data-smooth-ad-collapsed'), 'data-smooth-ad-collapsed must be applied to ad elements');
  assert(preloadJs.includes('data-ad-parent-collapsed'), 'data-ad-parent-collapsed must be applied to collapsed parent wrappers');
  assert(preloadJs.includes('div:has(> ins.adsbygoogle:only-child)'), 'COSMETIC_AD_CSS must contain parent wrapper collapse rules');
  assert(preloadJs.includes("div[id^=\"oa-360-\"]"), 'COSMETIC_AD_CSS must contain instant oa-360 rules');
  assert(preloadJs.includes("optAd360 Network / Badge"), 'classifyAdElement must classify optAd360 units');
});

runTest('DelugeRPG Site Header & Navbar Strict Immunity Guard Audit', () => {
  assert(preloadJs.includes('function healDelugeHeader()'), 'healDelugeHeader must exist');
  assert(preloadJs.includes("pid === 'del_header'"), 'smoothCollapseAd must guard del_header from collapse');
  assert(preloadJs.includes("pid === 'navwrap'"), 'smoothCollapseAd must guard navwrap from collapse');
  assert(preloadJs.includes("'#del_header {'"), 'COSMETIC_AD_CSS must contain explicit #del_header immunity rule');
  assert(preloadJs.includes("'#navwrap {'"), 'COSMETIC_AD_CSS must contain explicit #navwrap immunity rule');
  assert(preloadJs.includes("'#menuad {'"), 'COSMETIC_AD_CSS must cleanly collapse #menuad slot');
  assert(preloadJs.includes('preventScroll: true'), 'dispatchHumanClick must prevent viewport scroll on focus');
});

// -----------------------------------------------------------------------------
// PIPELINE 8: CORE HUNTING & SECURITY GUARDS AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- PIPELINE 8: CORE HUNTING, ANTI-BOT & SAFETY GUARDS AUDIT ---');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

runTest('Anti-Bot Safety Floor: >= 1700ms enforced', () => {
  assert(config.settings.minSafetyFloor >= 1700, 'minSafetyFloor must be at least 1700ms');
  assert(config.settings.baseDelay >= 2000, 'baseDelay must be at least 2000ms');
});

runTest('Captcha / Unlock Guard: Active in preload', () => {
  assert(preloadJs.includes('checkHasCaptchaElement'), 'checkHasCaptchaElement must exist');
  assert(preloadJs.includes('unlock-detected'), 'unlock-detected must be dispatched on /unlock or captcha');
});

runTest('Map Presence Synchronization: Active in preload', () => {
  assert(preloadJs.includes('checkAndSyncMapPresence'), 'checkAndSyncMapPresence must exist');
  assert(preloadJs.includes('map-presence'), 'map-presence IPC must be sent to host');
  assert(preloadJs.includes('hunting-auto-pause'), 'hunting-auto-pause must trigger outside map');
});

runTest('NSIS Data Protection & Canonical AppData Isolation Audit', () => {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  assert(pkgJson.build && pkgJson.build.nsis, 'package.json must contain build.nsis configuration');
  assert.strictEqual(pkgJson.build.nsis.deleteAppDataOnUninstall, false, 'deleteAppDataOnUninstall must be false to prevent data loss on update/uninstall');
  assert(mainJs.includes("app.setName('delugerpg-desktop-client')"), 'main.js must set canonical app name for unified userData path');
  assert(mainJs.includes('copyFileSync(CONFIG_PATH, bakPath)'), 'main.js must create .bak atomic backup before writing config.json');
  assert(mainJs.includes('user_collection.json') && mainJs.includes('gym_leaders.json') && mainJs.includes('daily_catch_log.json'), 'main.js must auto-migrate user data files to userData');
  assert(appJs.includes('copyFileSync(CONFIG_PATH, bakPath)'), 'app.js must create .bak atomic backup before writing config.json');
  assert(appJs.includes('copyFileSync(filePath, bakPath)'), 'app.js must create .bak atomic backup before writing daily_catch_log.json');
});

runTest('Full Configurations & Settings Parameters Pipelines Audit', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

  // 1. Account & Network Pipelines
  assert(cfg.dummyAccount && typeof cfg.dummyAccount.username === 'string', 'dummyAccount.username must exist');
  assert(cfg.dummyAccount && typeof cfg.dummyAccount.password === 'string', 'dummyAccount.password must exist');
  assert(cfg.dummyAccount && typeof cfg.dummyAccount.autoLogin === 'boolean', 'dummyAccount.autoLogin must exist');
  assert(cfg.network && typeof cfg.network.useProxy === 'boolean', 'network.useProxy must exist');
  assert(cfg.network && typeof cfg.network.proxyRules === 'string', 'network.proxyRules must exist');
  assert(cfg.network && typeof cfg.network.proxyBypass === 'string', 'network.proxyBypass must exist');

  // 2. Movement & Delay Parameters
  const s = cfg.settings;
  assert(typeof s.profile === 'string', 'settings.profile must exist');
  assert(['wander', 'patrol'].includes(s.walkMode), 'settings.walkMode must be valid');
  assert(typeof s.stepsPerDirection === 'number' && s.stepsPerDirection >= 1, 'settings.stepsPerDirection must be >= 1');
  assert(typeof s.baseDelay === 'number' && s.baseDelay >= 1700, 'settings.baseDelay must be >= 1700');
  assert(typeof s.jitter === 'number', 'settings.jitter must exist');
  assert(typeof s.minSafetyFloor === 'number' && s.minSafetyFloor >= 1700, 'settings.minSafetyFloor must be >= 1700');
  assert(typeof s.enableMicroBreaks === 'boolean', 'settings.enableMicroBreaks must exist');
  assert(typeof s.enableIdlePauses === 'boolean', 'settings.enableIdlePauses must exist');
  assert(typeof s.soundAlert === 'boolean', 'settings.soundAlert must exist');
  assert(typeof s.autoPauseOnTarget === 'boolean', 'settings.autoPauseOnTarget must exist');
  assert(typeof s.zoomFactor === 'number' && s.zoomFactor > 0, 'settings.zoomFactor must be > 0');

  // 3. Automation Toggles
  assert(typeof s.avoidDuplicates === 'boolean', 'settings.avoidDuplicates must exist');
  assert(typeof s.autoStartOnMap === 'boolean', 'settings.autoStartOnMap must exist');
  assert(typeof s.autoStartDelay === 'number' && s.autoStartDelay >= 1, 'settings.autoStartDelay must be >= 1');
  assert(typeof s.hideAdsCosmetically === 'boolean', 'settings.hideAdsCosmetically must exist');
  assert(typeof s.autoCatchMasterBall === 'boolean', 'settings.autoCatchMasterBall must exist');

  // 4. Target & Variant Engine
  assert(typeof s.targetPreset === 'string', 'settings.targetPreset must exist');
  assert(typeof s.findLegendaries === 'boolean', 'settings.findLegendaries must exist');
  assert(typeof s.legendaryClassic === 'boolean', 'settings.legendaryClassic must exist');
  assert(typeof s.legendaryUltraBeasts === 'boolean', 'settings.legendaryUltraBeasts must exist');
  assert(typeof s.legendaryParadox === 'boolean', 'settings.legendaryParadox must exist');
  assert(typeof s.findMegasAndGigantamax === 'boolean', 'settings.findMegasAndGigantamax must exist');
  assert(typeof s.findAnySpecialVariant === 'boolean', 'settings.findAnySpecialVariant must exist');
  assert(typeof s.enableVariantFilter === 'boolean', 'settings.enableVariantFilter must exist');
  assert(typeof s.enableLevelFilter === 'boolean', 'settings.enableLevelFilter must exist');
  assert(['min', 'max', 'exact'].includes(s.levelFilterMode), 'settings.levelFilterMode must be valid');
  assert(typeof s.levelFilterValue === 'number', 'settings.levelFilterValue must exist');
  assert(['targets', 'all'].includes(s.levelFilterScope), 'settings.levelFilterScope must be valid');
  assert(Array.isArray(s.selectedVariants), 'settings.selectedVariants must be an array');
  assert(Array.isArray(s.legendaryVariants), 'settings.legendaryVariants must be an array');
  assert(Array.isArray(s.megaVariants), 'settings.megaVariants must be an array');
  assert(typeof s.customTargetList === 'string', 'settings.customTargetList must exist');
  assert(typeof s.blacklistList === 'string', 'settings.blacklistList must exist');

  // 5. Team Builder & Combat Engine Pipelines
  assert(['ALL', 'TRAINING'].includes(s.teamRosterMode), 'settings.teamRosterMode must be ALL or TRAINING');
  assert(typeof s.teamPoolFilter === 'string', 'settings.teamPoolFilter must exist');
  assert(['NPC', 'PVP'].includes(s.teamBattleMode), 'settings.teamBattleMode must be NPC or PVP');
  assert(typeof s.pvpStrategy === 'string', 'settings.pvpStrategy must exist');
  assert(Array.isArray(s.favoriteTrainers), 'settings.favoriteTrainers must be an array');
  assert(typeof s.teamCategoryFilter === 'string', 'settings.teamCategoryFilter must exist');
  assert(typeof s.lastSelectedTrainer === 'string', 'settings.lastSelectedTrainer must exist');

  // 6. Persistence & Migration Engine Parity
  assert(mainJs.includes('favorite_trainers.json'), 'main.js must migrate favorite_trainers.json');
  assert(appJs.includes("getWritableDataPath('favorite_trainers.json')"), 'app.js must write favorite_trainers.json');
  assert(appJs.includes('config.settings.teamCategoryFilter = teamCategorySelect.value'), 'app.js must save teamCategoryFilter');
  assert(appJs.includes('config.settings.lastSelectedTrainer = selVal'), 'app.js must save lastSelectedTrainer');
});

runTest('Target Preset Engine & Immediate Configuration Rescan Audit', () => {
  assert(appJs.includes("presetKey === 'legendaries'"), 'app.js must handle legendaries preset');
  assert(appJs.includes("presetKey === 'megas'"), 'app.js must handle megas preset');
  assert(appJs.includes("presetKey === 'legend_megas'"), 'app.js must handle legend_megas preset');
  assert(appJs.includes("isLeg = true;\n    isMega = false;\n    isVar = false;") || appJs.includes("isLeg = true;\r\n    isMega = false;\r\n    isVar = false;"), 'applyTargetPreset(legendaries) must set isLeg=true, isMega=false, isVar=false');
  assert(appJs.includes("delugeView.send('update-config', config.settings)"), 'applyTargetPreset must send update-config to preload immediately');
  assert(appJs.includes("syncHuntingState()"), 'applyTargetPreset and saveTargetsBtn must invoke syncHuntingState immediately');
  assert(preloadJs.includes("lastEvaluatedEncounterSignature = ''"), 'preload update-config listener must clear lastEvaluatedEncounterSignature');
  assert(preloadJs.includes("lastFoundTarget = ''"), 'preload update-config listener must clear lastFoundTarget');
});

runTest('Strict Mega and Legendary Exclusion Guards & Per-Tier Variant Assignment Audit', () => {
  assert(mainJs.includes('function backendLog('), 'main.js must define backendLog helper for network interceptor');
  assert(preloadJs.includes('if (!findMegas) {'), 'game-preload.js must enforce strict Mega exclusion guard');
  assert(preloadJs.includes('MEGAS_LOWER.some(m => textLower.indexOf(m) !== -1)'), 'game-preload.js must detect Mega line species');
  assert(preloadJs.includes('if (!findLegend) {'), 'game-preload.js must enforce strict Legendary exclusion guard');
  assert(preloadJs.includes('LEGENDARY_LOWER.some(l => textLower.indexOf(l) !== -1)'), 'game-preload.js must detect Legendary species in exclusion guard');
  assert(preloadJs.includes('isSpeciesOnlyPreset'), 'game-preload.js must evaluate isSpeciesOnlyPreset in Tier 4');
  assert(preloadJs.includes('function isVariantAcceptedForLegendary()'), 'game-preload.js must enforce per-tier variant check for Legendaries');
  assert(preloadJs.includes('function isVariantAcceptedForMega()'), 'game-preload.js must enforce per-tier variant check for Megas');
  assert(preloadJs.includes("targetWord.startsWith('beast')"), 'game-preload.js must exclude Ultra Beast from FORMS ultra false-positive');

  // Extract and execute scanForTargets from game-preload.js in a sandboxed harness
  const TARGETS_DB = require('./targets');
  const LEGENDARY_LOWER = TARGETS_DB.legendaries.map(l => l.toLowerCase());
  const MEGAS_LOWER = TARGETS_DB.megas.map(m => m.toLowerCase());
  const FORMS = TARGETS_DB.specialForms;
  const VARIANTS = TARGETS_DB.specialVariants;
  const ULTRA_BEASTS = [
    'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela', 'kartana', 'guzzlord',
    'poipole', 'naganadel', 'stakataka', 'blacephalon'
  ];
  const PARADOX = [
    'great tusk', 'scream tail', 'brute bonnet', 'flutter mane', 'slither wing', 'sandy shocks',
    'iron treads', 'iron bundle', 'iron hands', 'iron jugulis', 'iron moth', 'iron thorns',
    'roaring moon', 'iron valiant', 'walking wake', 'iron leaves',
    'gouging fire', 'raging bolt', 'iron boulder', 'iron crown'
  ];

  const scanStart = preloadJs.indexOf('const textLower = pageText.trim().toLowerCase();');
  const scanEnd = preloadJs.indexOf('// --- 4. TARGET FOUND HANDLER ---');
  assert(scanStart !== -1 && scanEnd !== -1, 'scanForTargets body must be extractable from game-preload.js');
  const scanSource = preloadJs.slice(scanStart, scanEnd);

  function simulateEncounter(cfgOverrides, encounterBoxText, currentLevel = 60, isDupe = false) {
    let foundResult = null;
    const simConfig = Object.assign({
      targetPreset: 'custom',
      findLegendaries: true,
      legendaryClassic: true,
      legendaryUltraBeasts: true,
      legendaryParadox: true,
      findMegasAndGigantamax: false,
      findAnySpecialVariant: false,
      enableVariantFilter: false,
      selectedVariants: ['Normal', 'Shiny', 'Chrome', 'Retro', 'Metallic', 'Shadow', 'Ghostly', 'Dark', 'Mirage', 'Negative'],
      legendaryVariants: ['Normal', 'Shiny', 'Chrome', 'Retro', 'Metallic', 'Shadow', 'Ghostly', 'Dark', 'Mirage', 'Negative'],
      megaVariants: ['Normal', 'Shiny', 'Chrome', 'Retro', 'Metallic', 'Shadow', 'Ghostly', 'Dark', 'Mirage', 'Negative'],
      customTargetList: '',
      blacklistList: '',
      enableLevelFilter: false,
      levelFilterMode: 'min',
      levelFilterValue: 50,
      levelFilterScope: 'targets',
      avoidDuplicates: true
    }, cfgOverrides);

    const fn = new Function(
      'TARGETS', 'LEGENDARY_LOWER', 'MEGAS_LOWER', 'FORMS', 'VARIANTS', 'ULTRA_BEASTS', 'PARADOX',
      'config', 'encounterBoxText', 'currentLevel', 'isDupe', 'onFound',
      `
      let lastEvaluatedEncounterSignature = '';
      const pageText = encounterBoxText + ' Level: ' + currentLevel;
      const document = { body: { innerText: pageText } };
      function extractWildLevel() { return currentLevel; }
      function getEncounterContainer() { return { innerText: encounterBoxText }; }
      function checkEncounterIsDuplicate() { return isDupe; }
      function triggerTargetFound(name, category) { onFound({ name, category }); }
      const console = { log: () => {} };
      (function() {
        ${scanSource}
      )();
      `
    );
    fn(TARGETS_DB, LEGENDARY_LOWER, MEGAS_LOWER, FORMS, VARIANTS, ULTRA_BEASTS, PARADOX, simConfig, encounterBoxText, currentLevel, isDupe, (res) => {
      foundResult = res;
    });
    return foundResult;
  }

  // 1. User's Exact Saved Multi-Tier Configuration Smoke Test:
  // Legendaries: All 10 variants | Megas: Chrome, Retro, Metallic, Dark | Wild: Chrome only
  const userCustomCfg = {
    targetPreset: 'custom',
    findLegendaries: true,
    legendaryClassic: true,
    legendaryUltraBeasts: true,
    legendaryParadox: true,
    findMegasAndGigantamax: true,
    findAnySpecialVariant: true,
    enableVariantFilter: true,
    selectedVariants: ['Chrome'],
    legendaryVariants: ['Normal', 'Shiny', 'Chrome', 'Retro', 'Metallic', 'Shadow', 'Ghostly', 'Dark', 'Mirage', 'Negative'],
    megaVariants: ['Chrome', 'Retro', 'Metallic', 'Dark']
  };

  assert(simulateEncounter(userCustomCfg, 'LEGENDARY POKEMON\nA wild Articuno appeared!'), 'Normal Articuno must be caught in user config');
  assert(simulateEncounter(userCustomCfg, 'ULTRABEAST\nA wild Nihilego appeared!'), 'Normal Nihilego (UB) must be caught in user config');
  assert(simulateEncounter(userCustomCfg, 'Ultra Beast Buzzwole appeared!'), 'Ultra Beast Buzzwole must not false-trigger FORMS ultra and must be caught');
  assert(simulateEncounter(userCustomCfg, 'PARADOX POKEMON\nA wild Great Tusk appeared!'), 'Normal Great Tusk (Paradox) must be caught in user config');
  assert(simulateEncounter(userCustomCfg, 'A wild Mega Mewtwo X appeared!'), 'Normal Mega Mewtwo X must be governed by Legendary tier and caught');
  assert(simulateEncounter(userCustomCfg, 'A wild Primal Kyogre appeared!'), 'Normal Primal Kyogre must be governed by Legendary tier and caught');
  assert(simulateEncounter(userCustomCfg, 'A wild Chrome Charizard appeared!'), 'Chrome Charizard must be caught (in megaVariants)');
  assert(simulateEncounter(userCustomCfg, 'A wild Dark Lucario appeared!'), 'Dark Lucario must be caught (in megaVariants)');
  assert.strictEqual(simulateEncounter(userCustomCfg, 'A wild Charizard appeared!'), null, 'Normal Charizard must be skipped (Normal not in megaVariants)');
  assert.strictEqual(simulateEncounter(userCustomCfg, 'A wild Shiny Lucario appeared!'), null, 'Shiny Lucario must be skipped (Shiny not in megaVariants)');
  assert.strictEqual(simulateEncounter(userCustomCfg, 'MEGA EVOLUTION\nA wild Mega Gengar appeared!'), null, 'Normal Mega Gengar must be skipped (Normal not in megaVariants)');
  assert(simulateEncounter(userCustomCfg, 'MEGA EVOLUTION\nA wild Metallic Mega Gengar appeared!'), 'Metallic Mega Gengar must be caught (Metallic in megaVariants)');
  assert(simulateEncounter(userCustomCfg, 'A wild Chrome Rattata appeared!'), 'Chrome Rattata must be caught (Chrome in selectedVariants)');
  assert.strictEqual(simulateEncounter(userCustomCfg, 'A wild Shiny Rattata appeared!'), null, 'Shiny Rattata must be skipped (only Chrome in selectedVariants)');
  assert.strictEqual(simulateEncounter(userCustomCfg, 'A wild Rattata appeared!'), null, 'Normal Rattata must be skipped');

  // 2. Legendaries Only Preset Smoke Test
  const legOnlyCfg = {
    targetPreset: 'legendaries',
    findLegendaries: true,
    findMegasAndGigantamax: false,
    findAnySpecialVariant: false,
    enableVariantFilter: false
  };
  assert(simulateEncounter(legOnlyCfg, 'A wild Rayquaza appeared!'), 'Legendaries Only must catch Rayquaza');
  assert(simulateEncounter(legOnlyCfg, 'A wild Mega Rayquaza appeared!'), 'Legendaries Only must catch Mega Rayquaza');
  assert(simulateEncounter(legOnlyCfg, 'ULTRABEAST\nA wild Kartana appeared!'), 'Legendaries Only must catch Kartana');
  assert.strictEqual(simulateEncounter(legOnlyCfg, 'MEGA EVOLUTION\nA wild Mega Charizard X appeared!'), null, 'Legendaries Only must skip Mega Charizard X');
  assert.strictEqual(simulateEncounter(legOnlyCfg, 'A wild G-Max Pikachu appeared!'), null, 'Legendaries Only must skip G-Max Pikachu');
  assert.strictEqual(simulateEncounter(legOnlyCfg, 'A wild Shiny Charmander appeared!'), null, 'Legendaries Only must skip Shiny Charmander');
  assert.strictEqual(simulateEncounter(legOnlyCfg, 'A wild Chrome Bidoof appeared!'), null, 'Legendaries Only must skip Chrome Bidoof');

  // 3. Word-Boundary Blacklist Smoke Test
  const blacklistCfg = Object.assign({}, userCustomCfg, {
    blacklistList: 'abra, mew'
  });
  assert.strictEqual(simulateEncounter(blacklistCfg, 'A wild Mew appeared!'), null, 'Blacklisted Mew must be skipped');
  assert(simulateEncounter(blacklistCfg, 'A wild Mewtwo appeared!'), 'Mewtwo must NOT be blocked by "mew" in blacklist');
  assert.strictEqual(simulateEncounter(blacklistCfg, 'A wild Chrome Abra appeared!'), null, 'Blacklisted Abra must be skipped');
  assert(simulateEncounter(blacklistCfg, 'A wild Chrome Kadabra appeared!'), 'Kadabra must NOT be blocked by "abra" in blacklist');
});

// -----------------------------------------------------------------------------
// PIPELINE 9: EXISTING TEST SUITES INTEGRATION
// -----------------------------------------------------------------------------
console.log('\n--- PIPELINE 9: RUNNING INTEGRATED TEST SUITES ---');

runTest('test_client.js execution', () => {
  require('./test_client.js');
});

runTest('test_duplicate_and_catch.js execution', () => {
  require('./test_duplicate_and_catch.js');
});

runTest('test_buttons_verification.js execution', () => {
  require('./test_buttons_verification.js');
});

// -----------------------------------------------------------------------------
// FINAL SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`    VERIFICATION RESULT: ${passedTests}/${totalTests} TESTS PASSED PERFECTLY`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('[SUCCESS] All functions, pipelines, databases, and algorithms are 100% verified and operational.');
} else {
  console.error('[FAILURE] Verification detected one or more failing checks.');
  process.exit(1);
}
