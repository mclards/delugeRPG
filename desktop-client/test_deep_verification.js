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
  'skills_database.json',
  'test_client.js',
  'test_duplicate_and_catch.js',
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
  // Super effective single type
  assert.strictEqual(teamEngine.getMoveEffectiveness('Water', ['Fire']), 2.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Electric', ['Water']), 2.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Ice', ['Dragon']), 2.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fighting', ['Normal']), 2.0);
  
  // Super effective dual type (4.0x)
  assert.strictEqual(teamEngine.getMoveEffectiveness('Grass', ['Water', 'Ground']), 4.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Ice', ['Flying', 'Dragon']), 4.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fighting', ['Steel', 'Rock']), 4.0);
  
  // Resistance single type (0.5x)
  assert.strictEqual(teamEngine.getMoveEffectiveness('Fire', ['Water']), 0.5);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Grass', ['Fire']), 0.5);
  
  // Double resistance (0.25x)
  assert.strictEqual(teamEngine.getMoveEffectiveness('Grass', ['Fire', 'Flying']), 0.25);
  
  // Immunities (0x)
  assert.strictEqual(teamEngine.getMoveEffectiveness('Electric', ['Ground']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Ghost', ['Normal']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Dragon', ['Fairy']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Poison', ['Steel']), 0.0);
  assert.strictEqual(teamEngine.getMoveEffectiveness('Normal', ['Ghost']), 0.0);
});

runTest('Defensive Resistance Calculation', () => {
  // Fire defender taking Grass attack: Grass vs Fire is 0.5x
  const def1 = teamEngine.getDefensiveResistance(['Fire'], ['Grass']);
  assert.strictEqual(def1, 0.5);
  
  // Ground defender taking Electric attack: Electric vs Ground is 0.0x
  const def2 = teamEngine.getDefensiveResistance(['Ground'], ['Electric']);
  assert.strictEqual(def2, 0.0);
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

// -----------------------------------------------------------------------------
// PIPELINE 5: UI DOM ELEMENTS & CSS AUDIT (ZERO GLOW, CLEAN DESIGN)
// -----------------------------------------------------------------------------
console.log('\n--- PIPELINE 5: UI DOM ELEMENTS & ZERO-GLOW CSS AUDIT ---');

const appHtml = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');

runTest('app.html: All Team Builder DOM elements present', () => {
  const requiredElements = [
    'id="teamBuilderMenuBtn"',
    'id="teamBuilderModal"',
    'id="closeTeamBuilderBtn"',
    'id="scanPokesBtn"',
    'id="scanTrainersBtn"',
    'id="scanStatusBadge"',
    'id="trainerIntelModal"',
    'id="closeTrainerIntelBtn"',
    'id="teamCategorySelect"',
    'id="teamTrainerSelect"',
    'id="poolModeAllBtn"',
    'id="poolModeTrainingBtn"',
    'id="trainingStatsBadge"',
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

runTest('app.html: Zero glowing shadows on Team Builder elements', () => {
  // Extract teamBuilderModal block
  const start = appHtml.indexOf('id="teamBuilderModal"');
  assert(start !== -1, 'teamBuilderModal must exist');
  const end = appHtml.indexOf('</div>', appHtml.indexOf('id="teamActionRow"'));
  const modalSlice = appHtml.slice(start, end + 300);
  
  // Check that no box-shadow with colored rgba or glow exists
  assert(!modalSlice.includes('0 0 1'), 'Must not have glowing box-shadow in team builder modal');
  assert(!modalSlice.includes('box-shadow: 0 0 20px'), 'Must not have 20px glowing box-shadow');
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

runTest('app.html & app.js: Live Search, Regional Filtering & DOM Clean Slate Audit', () => {
  // DOM search and prompt bindings
  assert(appHtml.includes('id="trainerSearchInput"'), 'trainerSearchInput must exist in app.html');
  assert(appHtml.includes('id="clearTrainerSearchBtn"'), 'clearTrainerSearchBtn must exist in app.html');
  assert(appHtml.includes('id="filteredTrainerCountBadge"'), 'filteredTrainerCountBadge must exist in app.html');
  assert(appHtml.includes('id="teamEmptyPrompt"'), 'teamEmptyPrompt must exist in app.html');

  // Regional leagues in category dropdown
  assert(appHtml.includes('value="PALDEA"'), 'Paldea League option must exist');
  assert(appHtml.includes('value="KANTO"'), 'Kanto League option must exist');
  assert(appHtml.includes('value="GALAR"'), 'Galar League option must exist');

  // Controller search & filter wiring
  const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert(appJsContent.includes('trainerSearchInput.addEventListener'), 'trainerSearchInput input listener must exist');
  assert(appJsContent.includes('clearTrainerSearchBtn.addEventListener'), 'clearTrainerSearchBtn click listener must exist');

  // Preload DOM snapshot cleaner verification
  const preloadContent = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');
  assert(preloadContent.includes("if (triggerReason !== 'manual-F8') return;"), 'game-preload.js must disable unprompted auto DOM dumps');

  // Verify only essential fixtures remain in dom_dumps
  const dumps = fs.readdirSync(path.join(__dirname, 'dom_dumps')).filter(f => f.endsWith('.html'));
  assert.strictEqual(dumps.length, 2, `dom_dumps must contain exactly 2 fixture HTML files, found ${dumps.length}`);
  assert(dumps.includes('dump_pokemon.html'), 'dump_pokemon.html must remain');
  assert(dumps.includes('dump_pokemon_page_2.html'), 'dump_pokemon_page_2.html must remain');
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

runTest('IPC Channel: soft-session-flush parity (Zero-Logout Battle Cache Flush)', () => {
  assert(mainJs.includes("ipcMain.handle('soft-session-flush'"), 'main.js must handle soft-session-flush');
  assert(appJs.includes("ipcRenderer.invoke('soft-session-flush')"), 'app.js must invoke soft-session-flush');
  // Ensure soft-session-flush does NOT delete cookies (guarantees zero-logout)
  const flushStart = mainJs.indexOf("ipcMain.handle('soft-session-flush'");
  const flushBlock = mainJs.slice(flushStart, flushStart + 400);
  assert(!flushBlock.includes("'cookies'"), 'soft-session-flush must NEVER wipe cookies (preserves login session)');
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
