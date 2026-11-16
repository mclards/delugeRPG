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
  if ((!gmaxPool.some(p => p.level === 100 && teamEngine.isGmaxChallengeTargetEligible(p, collection)) || !gmaxPool.some(p => (p.level || 100) < 100)) && fs.existsSync(localPath)) {
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
  if ((!gmaxPool.some(p => p.level === 100 && teamEngine.isGmaxChallengeTargetEligible(p, collection)) || !gmaxPool.some(p => (p.level || 100) < 100)) && fs.existsSync(localPath)) {
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

// TEST 8B: G-Max Challenge Battle Now Routing & 6-Step Auto-Entry State Machine
runTest('G-Max Challenge: Battle Now /gmax routing and 6-step entry state machine', () => {
  const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const preloadJs = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');

  // 1. Verify app.js routing & IPC wiring (Step 1)
  assert(/teamCategorySelect\s*&&\s*teamCategorySelect\.value\s*===\s*'GMAX_CHALLENGE'\)\s*\{\s*return\s*'\/gmax';/.test(appJs), 'resolveTargetBattleUrl() must route GMAX_CHALLENGE to /gmax');
  assert(appJs.includes("'start-gmax-challenge-flow'"), 'app.js must dispatch start-gmax-challenge-flow IPC on Battle Now click / did-finish-load');
  assert(appJs.includes("'gmax-challenge-flow-status'"), 'app.js must listen for gmax-challenge-flow-status updates');

  // 2. Extract and execute the real G-Max state machine helpers from game-preload.js
  const startMarker = '// --- 7B. G-MAX CHALLENGE AUTO-ENTRY STATE MACHINE (6-STEP SEQUENCE) ---';
  const endMarker = 'function processGmaxChallengeEntryStep()';
  const sIdx = preloadJs.indexOf(startMarker);
  const eIdx = preloadJs.indexOf(endMarker);
  assert(sIdx !== -1 && eIdx !== -1 && eIdx > sIdx, 'game-preload.js must define G-Max 6-step state machine helpers');

  const vm = require('vm');
  const helperCode = preloadJs.slice(sIdx, eIdx);

  function makeMockEl(tagName, text, attrs = {}, opts = {}) {
    const el = {
      tagName: String(tagName || 'BUTTON').toUpperCase(),
      innerText: text,
      textContent: text,
      value: tagName.toLowerCase() === 'input' ? text : undefined,
      disabled: Boolean(opts.disabled),
      parentElement: opts.parentElement || null,
      offsetWidth: opts.hidden ? 0 : 120,
      offsetHeight: opts.hidden ? 0 : 32,
      classList: {
        _set: new Set(opts.classes || []),
        contains(c) { return this._set.has(c); }
      },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
      closest(sel) {
        if (opts.inNav && /#del_header|#navwrap|nav|header|#footer/.test(sel)) return {};
        return null;
      },
      querySelectorAll(q) {
        if (Array.isArray(opts.children)) return opts.children;
        return [];
      }
    };
    return el;
  }

  const sandbox = {
    document: {},
    isElementVisible: (el) => Boolean(el && el.offsetWidth > 0 && el.offsetHeight > 0),
    isCatchHoneypotTrap: (el) => Boolean(el && el.getAttribute && el.getAttribute('aria-hidden') === 'true'),
    Date,
    Set,
    String,
    Array,
    Object,
    Boolean,
    RegExp
  };
  vm.createContext(sandbox);
  vm.runInContext(helperCode, sandbox);

  // Step 2: /gmax Choose selection prefers exact Slot 1 G-MAX TARGET card over other eligible cards
  const baseState = { active: true, targetName: 'Metallic Blastoise', clickedSteps: {} };
  const wrongChoose = makeMockEl('button', 'Choose');
  wrongChoose.parentElement = makeMockEl('div', 'Dark Charizard Level: 100 Exp: 100,000', {}, { children: [wrongChoose] });
  const targetChoose = makeMockEl('button', 'Choose');
  targetChoose.parentElement = makeMockEl('div', 'Metallic Blastoise Level: 100 Exp: 100,000', {}, { children: [targetChoose] });
  const notEligibleBtn = makeMockEl('button', 'Not Eligible', { disabled: 'true' }, { disabled: true });
  const navBattleLink = makeMockEl('a', 'Battle', { href: '/battle' }, { inNav: true });
  const step2Controls = [notEligibleBtn, wrongChoose, targetChoose].filter(sandbox.isClickableGmaxControl);
  const step2Match = sandbox.evaluateGmaxEntryStepOnPage(baseState, '/gmax', step2Controls);
  assert(step2Match && step2Match.stage === 'choose', 'Step 2 on /gmax must match Choose stage');
  assert.strictEqual(step2Match.el, targetChoose, 'Step 2 must pick the Choose button inside the Slot 1 G-MAX TARGET card');
  assert(!sandbox.isClickableGmaxControl(notEligibleBtn), 'Not Eligible button must never be treated as clickable');
  assert(!sandbox.isClickableGmaxControl(navBattleLink), 'Header/nav elements must never be treated as clickable');

  // Step 3: /gmax/confirm/... Pay with varying coin prices (with or without space from coin icon)
  const cancelBtn = makeMockEl('a', 'Cancel', { href: '/gmax' });
  const pay23kBtn = makeMockEl('button', 'Pay 23,000 and Start Challenge');
  const step3State = { active: true, targetName: 'Metallic Blastoise', clickedSteps: { choose: 1 } };
  const step3Match = sandbox.evaluateGmaxEntryStepOnPage(step3State, '/gmax/confirm/991', [cancelBtn, pay23kBtn]);
  assert(step3Match && step3Match.stage === 'pay' && step3Match.el === pay23kBtn, 'Step 3 must match variable price Pay ... and Start Challenge button');

  const payLargeCompactBtn = makeMockEl('button', 'Pay 1,250,000and Start Challenge');
  const step3LargeMatch = sandbox.evaluateGmaxEntryStepOnPage(step3State, '/gmax/confirm/992', [payLargeCompactBtn]);
  assert(step3LargeMatch && step3LargeMatch.stage === 'pay' && step3LargeMatch.el === payLargeCompactBtn, 'Step 3 must match compact coin-icon Pay <price>and Start Challenge text');

  // Idempotency: Pay must NEVER be selected twice once clickedSteps.pay is recorded; non-pay retries cleanly after 3s
  const alreadyPaidState = { active: true, targetName: 'Metallic Blastoise', clickedSteps: { choose: 1, pay: 2 } };
  assert.strictEqual(sandbox.evaluateGmaxEntryStepOnPage(alreadyPaidState, '/gmax/confirm/991', [pay23kBtn]), null, 'Pay button must not be clicked twice');
  const timedPayState = { active: true, targetName: 'Metallic Blastoise', clickedSteps: { choose: { ts: Date.now() - 10000, count: 1 }, pay: { ts: Date.now() - 10000, count: 1 } } };
  assert.strictEqual(sandbox.evaluateGmaxEntryStepOnPage(timedPayState, '/gmax/confirm/991', [pay23kBtn]), null, 'Pay button must never auto-retry even after timeout');
  const staleChooseState = { active: true, targetName: 'Metallic Blastoise', clickedSteps: { choose: { ts: Date.now() - 3500, count: 1 } } };
  const chooseRetryMatch = sandbox.evaluateGmaxEntryStepOnPage(staleChooseState, '/gmax', [targetChoose]);
  assert(chooseRetryMatch && chooseRetryMatch.stage === 'choose', 'Non-pay Choose stage must allow 1 bounded retry if still on /gmax after 3s');
  const exhaustedChooseState = { active: true, targetName: 'Metallic Blastoise', clickedSteps: { choose: { ts: Date.now() - 3500, count: 2 } } };
  assert.strictEqual(sandbox.evaluateGmaxEntryStepOnPage(exhaustedChooseState, '/gmax', [targetChoose]), null, 'Non-pay Choose stage must stop after 2 attempts');

  // Step 4: "GMax Challenge Page" green confirmation alert link
  const gmaxPageBtn = makeMockEl('a', 'GMAX CHALLENGE PAGE', { href: '/challenge/gmax' });
  const step4Match = sandbox.evaluateGmaxEntryStepOnPage(alreadyPaidState, '/gmax/confirm/991', [gmaxPageBtn]);
  assert(step4Match && step4Match.stage === 'challengePage' && step4Match.el === gmaxPageBtn, 'Step 4 must match GMAX CHALLENGE PAGE button');

  // Step 5: /gmax AND /challenge/gmax both click BATTLE! and strictly ignore Abandon Challenge
  const abandonBtn = makeMockEl('button', 'Abandon Challenge');
  const battleBtn = makeMockEl('a', 'Battle!');
  const step5State = { active: true, targetName: 'Metallic Blastoise', clickedSteps: { choose: 1, pay: 2, challengePage: 3 } };
  const step5OnGmaxMatch = sandbox.evaluateGmaxEntryStepOnPage(step5State, '/gmax', [abandonBtn, battleBtn]);
  assert(step5OnGmaxMatch && step5OnGmaxMatch.stage === 'battle' && step5OnGmaxMatch.el === battleBtn, 'Step 5 must click BATTLE! on /gmax (challenge dashboard) and avoid Abandon Challenge');
  const step5OnChallengeMatch = sandbox.evaluateGmaxEntryStepOnPage(step5State, '/challenge/gmax', [abandonBtn, battleBtn]);
  assert(step5OnChallengeMatch && step5OnChallengeMatch.stage === 'battle' && step5OnChallengeMatch.el === battleBtn, 'Step 5 must also click BATTLE! on /challenge/gmax');

  // Step 6: Battle screen clicks Continue after BATTLE! disappeared, or hands off when pokeselect radios + Auto > Loop default are active
  const switchBtn = makeMockEl('button', 'Switch Pokemon');
  const homeLink = makeMockEl('a', 'Continue Home', { href: '/home' });
  const continueBtn = makeMockEl('input', 'Continue');
  const step6State = { active: true, targetName: 'Metallic Blastoise', clickedSteps: { choose: 1, pay: 2, challengePage: 3, battle: 4 } };
  const step6Match = sandbox.evaluateGmaxEntryStepOnPage(step6State, '/battle/challenge/555', [switchBtn, homeLink, continueBtn]);
  assert(step6Match && step6Match.stage === 'continue' && step6Match.el === continueBtn, 'Step 6 must click Continue on the resulting battle screen');
  assert(preloadJs.includes('const hasLeadRadios = document.querySelectorAll('), 'game-preload.js must hand off pokeselect lead prep screen to Auto + Loop AI deployer');
  assert(appJs.includes('function setAutoAndLoopDefaultChecked()') && appJs.includes('setAutoAndLoopDefaultChecked();'), 'app.js must default-check Auto and Loop checkboxes on startup');
});

// TEST 8C: Instant Candidate Rotation (G-Max & Training Pools) & Scan-Only Box Refresh
runTest('Candidate Cache & Instant Build Best Team Rotation (G-Max + Training Pools)', () => {
  const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

  // 1. Verify Build Best Team no longer triggers slow multi-page box scan on click
  const buildBtnStart = appJs.indexOf("buildTeamBtn.addEventListener('click'");
  const buildBtnEnd = appJs.indexOf("applyTeamBtn.addEventListener('click'", buildBtnStart);
  assert(buildBtnStart !== -1 && buildBtnEnd > buildBtnStart, 'Must locate buildTeamBtn click block');
  const buildBtnSlice = appJs.slice(buildBtnStart, buildBtnEnd);
  assert(!buildBtnSlice.includes("start-scan-pokemon"), 'buildTeamBtn must build from cached collection without re-scanning all box pages');
  assert(buildBtnSlice.includes('executeTeamBuild(targetLeader, { advanceCandidate: true })'), 'buildTeamBtn must pass advanceCandidate: true for G-Max/Training rotation');

  // 2. Verify Scan My Box & pokemon-scan-complete refresh behind-the-scenes lists and reset cursors
  assert(appJs.includes('function refreshCandidateListsCache('), 'app.js must define refreshCandidateListsCache');
  assert(appJs.includes('refreshCandidateListsCache({ resetCursors: true })'), 'pokemon-scan-complete must rebuild cached candidate lists and reset cursors');
  assert(appJs.includes('trainingCursorsByPool[poolKey]'), 'Training mode must track independent candidate batch cursors per Candidate Pool filter');

  // 3. Functional test: G-Max Slot 1 rotation across multiple Lv 100 G-Max candidates via teamEngine.buildBestTeam
  const mockBox = [
    { id: 'c1', name: 'Dark Mega Sableye', level: 100, types: ['Dark', 'Ghost'], attacks: [{ name: 'Astral Barrage', type: 'Ghost', power: 120 }] },
    { id: 'c2', name: 'Dark Typhlosion', level: 100, types: ['Fire', 'Dark'], attacks: [{ name: 'Eruption', type: 'Fire', power: 150 }] },
    { id: 'c3', name: 'Dark Zacian (Behemoth Blade)', level: 100, types: ['Fairy', 'Steel'], attacks: [{ name: 'Moonblast', type: 'Fairy', power: 95 }] },
    { id: 'c4', name: 'Ghostly Iron Valiant', level: 100, types: ['Fairy', 'Fighting'], attacks: [{ name: 'Moonblast', type: 'Fairy', power: 95 }] },
    { id: 'c5', name: 'Celesteela', level: 100, types: ['Steel', 'Flying'], attacks: [{ name: 'Air Slash', type: 'Flying', power: 75 }] },
    { id: 'g1', name: 'Ghostly Blastoise', level: 100, types: ['Water', 'Ghost'], attacks: [{ name: 'Hydro Pump', type: 'Water', power: 110 }] },
    { id: 'g2', name: 'Metallic Venusaur', level: 100, types: ['Grass', 'Poison'], attacks: [{ name: 'Solar Beam', type: 'Grass', power: 120 }] },
    { id: 'g3', name: 'Shadow Charizard', level: 100, types: ['Fire', 'Flying'], attacks: [{ name: 'Flamethrower', type: 'Fire', power: 90 }] }
  ];
  const gmaxPool = teamEngine.filterCandidatePool(mockBox, 'GMAX');
  const rankedGmax = teamEngine.getRankedGmaxChallengeCandidates(gmaxPool, mockBox);
  assert.strictEqual(rankedGmax.length, 3, `Expected 3 unique Lv 100 G-Max candidates, got ${rankedGmax.length}`);

  const challengeTarget = { name: 'G-Max Challenge Arena', types: ['Mixed'], avgLevel: 100, isChallenge: true, battleUrl: '/challenge/gmax' };
  const team0 = teamEngine.buildBestTeam(challengeTarget, gmaxPool, mockBox, { targetIndex: 0 });
  const team1 = teamEngine.buildBestTeam(challengeTarget, gmaxPool, mockBox, { targetIndex: 1 });
  const team2 = teamEngine.buildBestTeam(challengeTarget, gmaxPool, mockBox, { targetIndex: 2 });

  assert.strictEqual(team0[0].id, rankedGmax[0].id, 'targetIndex 0 must select 1st G-Max target in Slot 1');
  assert.strictEqual(team1[0].id, rankedGmax[1].id, 'targetIndex 1 must rotate Slot 1 to 2nd G-Max target');
  assert.strictEqual(team2[0].id, rankedGmax[2].id, 'targetIndex 2 must rotate Slot 1 to 3rd G-Max target');
  assert.strictEqual(new Set([team0[0].id, team1[0].id, team2[0].id]).size, 3, 'Each Build click rotation must pick a distinct Slot 1 G-Max target');
  assert(!team1.slice(1).some(p => p.id === team1[0].id), 'Rotated Slot 1 target must never duplicate in Slots 2-6 carries');
});

// TEST 9: 100% 7-Bit Clean ASCII Verification Across All Files
runTest('7-Bit Clean ASCII Integrity Verification', () => {
  const filesToAudit = [
    'app.html',
    'app.js',
    'game-preload.js',
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
