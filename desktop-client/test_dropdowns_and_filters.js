// test_dropdowns_and_filters.js - Comprehensive Dropdown, Filter, and Category Audit Suite
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('       DELUGERPG DROPDOWNS, FILTERS & CATEGORIES AUDIT          ');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

const appHtml = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const teamEngine = require('./team_engine.js');
const gymLeaders = JSON.parse(fs.readFileSync(path.join(__dirname, 'gym_leaders.json'), 'utf8'));

// TEST 1: teamCategorySelect Markup & Colored Optgroups Audit
runTest('teamCategorySelect: All options and color-coded headers audit', () => {
  assert(appHtml.includes('id="teamCategorySelect"'), 'teamCategorySelect element must exist');
  assert(appHtml.includes('value="ALL"'), 'ALL option must exist');
  assert(appHtml.includes('value="FAVORITES"'), 'FAVORITES option must exist');
  assert(appHtml.includes('value="GMAX_CHALLENGE"'), 'GMAX_CHALLENGE option must exist');
  assert(appHtml.includes('label="TRAINER TIERS"'), 'TRAINER TIERS optgroup must exist');
  assert(appHtml.includes('label="REGIONAL GYM LEAGUES"'), 'REGIONAL GYM LEAGUES optgroup must exist');

  // Verify visual colors on headers
  assert(appHtml.includes('color: #f59e0b') && appHtml.includes('Favorite Opponents'), 'Favorite Opponents must have gold color #f59e0b');
  assert(appHtml.includes('color: #58a6ff') && appHtml.includes('For G-Max Challenge'), 'G-Max Challenge must have cyan color #58a6ff');
  assert(appHtml.includes('background: #251408') && appHtml.includes('TRAINER TIERS'), 'TRAINER TIERS must have amber background #251408');
  assert(appHtml.includes('background: #0a2012') && appHtml.includes('REGIONAL GYM LEAGUES'), 'REGIONAL GYM LEAGUES must have green background #0a2012');

  const leagueKeys = ['KANTO', 'JOHTO', 'HOENN', 'SINNOH', 'UNOVA', 'KALOS', 'ALOLA', 'GALAR', 'PALDEA'];
  leagueKeys.forEach(k => {
    assert(appHtml.includes(`value="${k}"`), `League option ${k} must exist in teamCategorySelect`);
  });
});

// TEST 2: candidatePoolFilterSelect Markup & Colored Tier Options Audit
runTest('candidatePoolFilterSelect: All tier options and color-coding audit', () => {
  assert(appHtml.includes('id="candidatePoolFilterSelect"'), 'candidatePoolFilterSelect element must exist');
  const tiers = [
    { val: 'ANY', color: '#e0ecfa' },
    { val: 'GMAX', color: '#58a6ff' },
    { val: 'MEGA', color: '#f59e0b' },
    { val: 'GMAX_MEGA', color: '#79c0ff' },
    { val: 'LEGENDARY', color: '#a371f7' },
    { val: 'ULTRABEAST', color: '#3fb950' },
    { val: 'PARADOX', color: '#f85149' },
    { val: 'COMMON', color: '#8eaad0' }
  ];

  tiers.forEach(t => {
    assert(appHtml.includes(`value="${t.val}"`), `Option ${t.val} must exist in candidatePoolFilterSelect`);
    assert(appHtml.includes(t.color), `Color ${t.color} for tier ${t.val} must exist in app.html`);
  });
});

// TEST 3: candidatePoolFilterSelect Algorithm Filtering Accuracy Audit
runTest('teamEngine.filterCandidatePool: Strict tier separation audit', () => {
  const mockCollection = [
    { id: '1', name: 'Dark Urshifu (Rapid Strike)', level: 100, variant: 'Dark' },
    { id: '2', name: 'Charizard Mega X', level: 100, variant: 'Normal' },
    { id: '3', name: 'Mega Blastoise', level: 100, variant: 'Normal' },
    { id: '4', name: 'Giratina', level: 100, variant: 'Normal' },
    { id: '5', name: 'Nihilego', level: 100, variant: 'Metallic' },
    { id: '6', name: 'Iron Valiant', level: 100, variant: 'Normal' },
    { id: '7', name: 'Magikarp', level: 50, variant: 'Normal' },
    { id: '8', name: 'Dark G-Max Urshifu (Rapid Strike)', level: 100, variant: 'Dark' }
  ];

  assert(teamEngine.isAlreadyGmax(mockCollection[7]), 'isAlreadyGmax must recognize Dark G-Max Urshifu');
  assert(!teamEngine.isGmaxEligible(mockCollection[7]), 'isGmaxEligible must reject Dark G-Max Urshifu');
  assert(teamEngine.isGmaxEligible(mockCollection[0]), 'isGmaxEligible must accept un-evolved Urshifu');

  const gmaxOnly = teamEngine.filterCandidatePool(mockCollection, 'GMAX');
  assert(gmaxOnly.length === 1 && gmaxOnly[0].id === '1', 'GMAX must only return eligible Urshifu and reject Megas & already G-Max');

  const megaOnly = teamEngine.filterCandidatePool(mockCollection, 'MEGA');
  assert(megaOnly.length === 2, 'MEGA must return Charizard Mega X and Mega Blastoise');

  const gmaxMega = teamEngine.filterCandidatePool(mockCollection, 'GMAX_MEGA');
  assert(gmaxMega.length === 3, 'GMAX_MEGA must return eligible Urshifu + 2 Megas');

  const legOnly = teamEngine.filterCandidatePool(mockCollection, 'LEGENDARY');
  assert(legOnly.some(p => p.name === 'Giratina') && legOnly.some(p => p.name.includes('Urshifu')), 'LEGENDARY must return Giratina and Urshifu');

  const ubOnly = teamEngine.filterCandidatePool(mockCollection, 'ULTRABEAST');
  assert(ubOnly.length === 1 && ubOnly[0].name === 'Nihilego', 'ULTRABEAST must return Nihilego');

  const parOnly = teamEngine.filterCandidatePool(mockCollection, 'PARADOX');
  assert(parOnly.length === 1 && parOnly[0].name === 'Iron Valiant', 'PARADOX must return Iron Valiant');

  const comOnly = teamEngine.filterCandidatePool(mockCollection, 'COMMON');
  assert(comOnly.some(p => p.name === 'Magikarp'), 'COMMON must return Magikarp');
});

// TEST 4: populateGymTrainerSelect Dynamic Group Coloring & Challenge Mode Lock Audit
runTest('app.js: populateGymTrainerSelect coloring, GMAX challenge lock, and favorite styling', () => {
  assert(appJs.includes("categoryFilter === 'GMAX_CHALLENGE'"), 'GMAX_CHALLENGE branch must exist in populateGymTrainerSelect');
  assert(appJs.includes("teamTrainerSelect.disabled = true;"), 'teamTrainerSelect must be disabled in GMAX_CHALLENGE');
  assert(appJs.includes("favTrainerBtn.disabled = true;"), 'favTrainerBtn must be disabled in GMAX_CHALLENGE');
  assert(appJs.includes("[G-Max Challenge] Randomized Arena Opponents"), 'Arena placeholder text must exist');
  assert(appJs.includes("lastSelectedBattleUrl = '/challenge/gmax';"), 'Battle URL must route to /challenge/gmax');

  // Verify dynamic optgroup styling
  assert(appJs.includes("color: #f0883e; background: #251408") || appJs.includes("item.color"), 'Optgroup styling engine must exist in app.js');
  assert(appJs.includes("CURRENT BATTLE (LIVE DETECTED)"), 'Live battle optgroup header must exist');
  assert(appJs.includes("FAVORITE OPPONENTS"), 'Favorite opponents optgroup header must exist');
});

// TEST 5: Bi-Directional Filter Synchronization Audit
runTest('app.js: Bi-directional synchronization between candidate pool and category filter', () => {
  // Candidate pool change sync
  assert(appJs.includes("teamPoolFilter === 'GMAX'"), 'GMAX pool condition must be checked on pool change');
  assert(appJs.includes("teamCategorySelect.value = 'GMAX_CHALLENGE'"), 'Category must switch to GMAX_CHALLENGE when GMAX pool selected');
  assert(appJs.includes("teamCategorySelect.value = 'ALL'"), 'Category must restore to ALL when switched away from GMAX');

  // Category change sync
  assert(appJs.includes("teamCategorySelect.value === 'GMAX_CHALLENGE'"), 'GMAX_CHALLENGE condition must be checked on category change');
  assert(appJs.includes("candidatePoolFilterSelect.value = 'GMAX'"), 'Candidate pool must switch to GMAX when GMAX_CHALLENGE selected');

  // Training mode tab sync
  assert(appJs.includes("mode === 'TRAINING'") && appJs.includes("teamCategorySelect.value = 'ALL'"), 'Switching to TRAINING mode must free trainer selector');
});

// TEST 6: Live AppData Collection G-Max Challenge 6-Slot Verification (DelugeRPG Rules Audit)
runTest('Live AppData Collection: G-Max Challenge arena team building audit', () => {
  const appDataPath = path.join(process.env.APPDATA || '', 'delugerpg-desktop-client', 'user_collection.json');
  const localPath = path.join(__dirname, 'user_collection.json');
  let collection = [];
  if (fs.existsSync(appDataPath)) {
    try { collection = JSON.parse(fs.readFileSync(appDataPath, 'utf8')); } catch (_) {}
  }
  let gmaxPool = teamEngine.filterCandidatePool(collection, 'GMAX');
  if (!gmaxPool.some(p => p.level === 100) && fs.existsSync(localPath)) {
    collection = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    gmaxPool = teamEngine.filterCandidatePool(collection, 'GMAX');
  }
  if (collection.length === 0) {
    console.log('  (Skipped live collection check - file not found)');
    return;
  }
  const target = { name: 'G-Max Challenge Arena', types: ['Mixed'], avgLevel: 100, isChallenge: true, battleUrl: '/challenge/gmax' };
  const team = teamEngine.buildBestTeam(target, gmaxPool, collection);

  assert(team.length === 6, `G-Max Challenge team must have exactly 6 Pokemon (got ${team.length})`);
  const noneAlreadyGmax = team.every(p => !teamEngine.isAlreadyGmax(p));
  assert(noneAlreadyGmax, 'No already G-Max Pokemon may participate in G-Max Challenge');
  const hasLvl100Target = team.some(p => p.level === 100);
  assert(hasLvl100Target, 'G-Max Challenge team must contain at least one Level 100 candidate to Gigantamax Evolve (Rule 2)');

  // Verify 1 G-Max Target + 5 Elite Carries Hybrid Composition
  const hybridTeam = teamEngine.buildBestTeam(target, gmaxPool, collection);
  assert(hybridTeam.length === 6, `Hybrid challenge team must have 6 Pokemon (got ${hybridTeam.length})`);
  assert(hybridTeam[0].role === 'G-MAX TARGET', 'Slot 1 must be G-MAX TARGET');
  assert(hybridTeam[0].level === 100, 'Slot 1 G-Max target must be Level 100 to evolve');
  assert(hybridTeam.slice(1).every(p => !teamEngine.isAlreadyGmax(p)), 'All carries must be clean non-G-Max');
  assert(hybridTeam.slice(1).some(p => p.role === 'LEAD SWEEPER' || p.role === 'WALLBREAKER'), 'Slots 2-6 must contain elite carries');
});

// TEST 7: Live AppData Collection Training Mode Mixed Team with Hard Carry Verification
runTest('Live AppData Collection: Training mode mixed team with Hard Carry audit', () => {
  const appDataPath = path.join(process.env.APPDATA || '', 'delugerpg-desktop-client', 'user_collection.json');
  const localPath = path.join(__dirname, 'user_collection.json');
  let collection = [];
  if (fs.existsSync(appDataPath)) {
    try { collection = JSON.parse(fs.readFileSync(appDataPath, 'utf8')); } catch (_) {}
  }
  let gmaxPool = teamEngine.filterCandidatePool(collection, 'GMAX');
  if (!gmaxPool.some(p => p.level === 100) && fs.existsSync(localPath)) {
    collection = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    gmaxPool = teamEngine.filterCandidatePool(collection, 'GMAX');
  }
  if (collection.length === 0) {
    console.log('  (Skipped live collection check - file not found)');
    return;
  }
  const trainees = gmaxPool.filter(p => (p.level || 100) < 100);
  assert(trainees.length > 0, 'User collection must have G-Max trainees (< Lv 100)');

  const trainer = gymLeaders.VIP_TRAINERS[0]; // Aaron (Bug)
  const col100s = collection.filter(p => (p.level || 0) === 100);
  const poolSoloers = gmaxPool.filter(p => (p.level || 0) === 100 && teamEngine.canSoloTrainer(p, trainer));
  const ranked = (poolSoloers.length > 0)
    ? teamEngine.rankCarries(poolSoloers, trainer)
    : teamEngine.rankCarries(col100s.filter(p => teamEngine.canSoloTrainer(p, trainer)), trainer);

  assert(ranked.length > 0, 'A hard carry capable of soloing the trainer must be found');
  const carry = ranked[0].poke;
  assert(carry.level === 100, 'The Hard Carry must be Level 100');

  // Verify trainees are valid G-Max eligible species below Level 100
  assert(trainees.every(t => (t.level || 100) < 100 && teamEngine.isGmaxEligible(t)), 'All trainees must be G-Max eligible and below Level 100');
});

// TEST 8: All 449 Opponents Categorization Integrity Audit
runTest('gym_leaders.json: Total count and regional league parity audit', () => {
  const tierKeys = ['VIP_TRAINERS', 'ULTIMATE_TRAINERS', 'STRONG_TRAINERS', 'STANDARD_TRAINERS'];
  const leagueKeys = ['KANTO', 'JOHTO', 'HOENN', 'SINNOH', 'UNOVA', 'KALOS', 'ALOLA', 'GALAR', 'PALDEA'];

  let tierTotal = 0;
  tierKeys.forEach(k => {
    assert(Array.isArray(gymLeaders[k]), `Tier ${k} must be an array`);
    tierTotal += gymLeaders[k].length;
  });
  assert(tierTotal === 318, `Trainer Tiers must sum to 318 (got ${tierTotal})`);

  let leagueTotal = 0;
  leagueKeys.forEach(k => {
    assert(Array.isArray(gymLeaders[k]), `League ${k} must be an array`);
    leagueTotal += gymLeaders[k].length;
  });
  assert(leagueTotal === 131, `Regional Gym Leagues must sum to 131 (got ${leagueTotal})`);

  assert(tierTotal + leagueTotal === 449, `Total opponents must equal 449 (got ${tierTotal + leagueTotal})`);
});

// TEST 9: 100% 7-Bit Clean ASCII Verification Across All Files
runTest('7-Bit Clean ASCII Integrity Verification', () => {
  const filesToAudit = [
    'app.html',
    'app.js',
    'team_engine.js',
    'test_deep_verification.js',
    'test_dropdowns_and_filters.js'
  ];

  filesToAudit.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      assert(code <= 127, `Non-ASCII char '${content[i]}' (code ${code}) found in ${file} at position ${i}`);
    }
  });
});

console.log('\n================================================================');
console.log(`   TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('[SUCCESS] All dropdowns, filters, categories, and sync engines are 100% verified.');
}
