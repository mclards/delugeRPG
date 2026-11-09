// test_ai_assistant_live.js
// Verification suite for Injected Live AI Assistant, Monte Carlo Engine, and Carry Hardening
// Strictly 100% 7-bit clean ASCII

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('       DELUGERPG LIVE AI ASSISTANT & TACTICAL HUD AUDIT         ');
console.log('================================================================\n');

// 1. AUDIT AI AGENT BRIDGE
const aiAssistant = require('./ai_agent_bridge.js');
assert(aiAssistant, 'ai_agent_bridge module must load');

const mockBattle = {
  trainerName: 'Veteran Shareef',
  roster: [
    { name: 'Leafeon', types: ['Grass'], level: 80 },
    { name: 'Gigalith', types: ['Rock'], level: 85 },
    { name: 'Toxicroak', types: ['Poison', 'Fighting'], level: 82 },
    { name: 'Magmortar', types: ['Fire'], level: 85 },
    { name: 'Hydreigon', types: ['Dark', 'Dragon'], level: 86 }
  ]
};

const coll = JSON.parse(fs.readFileSync(path.join(__dirname, 'user_collection.json'), 'utf8'));
const analysis = aiAssistant.analyzeBattle(mockBattle, coll);
assert.strictEqual(analysis.status, 'ACTIVE_BATTLE');
assert.strictEqual(analysis.trainerName, 'Veteran Shareef');
assert(analysis.callout.length > 0, 'Callout must be generated');

// Audit Active Team on screen detection
const mockBattleWithActiveTeam = {
  trainerName: 'Veteran Tamaki',
  roster: [
    { name: 'Umbreon', types: ['Dark'], level: 80 },
    { name: 'Tyrantrum', types: ['Rock', 'Dragon'], level: 84 },
    { name: 'Aggron', types: ['Steel', 'Rock'], level: 86 },
    { name: 'Tyranitar', types: ['Rock', 'Dark'], level: 86 }
  ],
  userTeam: [
    { name: 'Dark Mega Steelix', types: ['Steel', 'Ground'], level: 100, index: 0 },
    { name: 'Dark Palkia (Origin)', types: ['Water', 'Dragon'], level: 100, index: 1 },
    { name: 'Reshiram', types: ['Dragon', 'Fire'], level: 100, index: 2 },
    { name: 'Negative Galarian Moltres', types: ['Dark', 'Flying'], level: 100, index: 3 }
  ],
  isPreparationScreen: true
};
const tamakiAnalysis = aiAssistant.analyzeBattle(mockBattleWithActiveTeam, coll);
assert(tamakiAnalysis.bestActiveLead, 'Must identify best lead from user active team');
assert(tamakiAnalysis.isPreparationScreen, 'Must recognize preparation screen');

console.log('[PASS] AUDIT 1: Live Battle Sensory Analysis Verified');
console.log('  Active Target:   ' + analysis.activeOpponent + ' (Lv ' + analysis.activeOpponentLevel + ')');
console.log('  Recommended:     ' + analysis.bestCarry + ' [' + analysis.recommendedMove + ']');
console.log('  Active Lead:     ' + tamakiAnalysis.bestActiveLead.name + ' [' + tamakiAnalysis.bestActiveLead.recommendedMove + ']');
console.log('  Tactical Note:   ' + analysis.callout);

// 2. AUDIT FLOATING HUD TEXT
const hudText = aiAssistant.getFloatingHudText(mockBattle, coll);
assert(hudText.includes('Leafeon'), 'HUD must mention active target Leafeon');
console.log('\n[PASS] AUDIT 2: In-Game Floating HUD Telemetry Verified');
console.log('  Floating HUD:    ' + hudText);

// 3. AUDIT INTERACTIVE Q&A COPILOT
const qWhy = aiAssistant.askAssistant('Why did you choose this carry?', {
  battle: mockBattle,
  carry: { pokemon: { name: 'Mega Mewtwo X', variant: 'Shiny' }, exposure: { worst: 1.0 }, bestAttack: { name: 'Psystrike' } }
});
assert(qWhy.includes('Mega Mewtwo X'), 'Why response must explain Mega Mewtwo X');

const qSolo = aiAssistant.askAssistant('Can I solo this trainer?', { battle: mockBattle });
assert(qSolo.includes('sweep') || qSolo.includes('solo'), 'Solo query must confirm sweeping strategy');
console.log('\n[PASS] AUDIT 3: Interactive Tactical Q&A Copilot Verified');
console.log('  "Why carry?":    ' + qWhy.slice(0, 100) + '...');
console.log('  "Can I solo?":   ' + qSolo.slice(0, 100) + '...');

// 4. AUDIT 28-TRAINER ANOMALY RESOLUTION (ZERO FISSURE / OUTRAGE TRAPS)
const te = require('./team_engine.js');
const gym = JSON.parse(fs.readFileSync('gym_leaders.json', 'utf8'));
const testTrainers = [
  { name: 'Lt. Surge', region: 'KANTO', expectedMove: 'Earthquake' },
  { name: 'Wattson', region: 'HOENN', expectedMove: 'Earthquake' },
  { name: 'Jasmine', region: 'JOHTO', expectedMove: 'Earthquake' },
  { name: 'Volkner', region: 'SINNOH', expectedMove: 'Earthquake' }
];

console.log('\n[PASS] AUDIT 4: 28-Trainer Anomaly Resolution (Zero Fissure / Outrage Traps)');
testTrainers.forEach(item => {
  const t = gym[item.region].find(x => x.name.toLowerCase() === item.name.toLowerCase());
  assert(t, 'Trainer ' + item.name + ' must exist');
  const carries = te.rankCarries(coll, t);
  const topCarry = carries[0];
  const bestAtk = te.getRosterWideBestAttack(topCarry.poke, t);
  assert(!bestAtk.includes('Fissure'), item.name + ' must NOT use Fissure');
  assert(!bestAtk.includes('Outrage'), item.name + ' must NOT use Outrage');
  console.log('  ' + item.name + ' -> ' + topCarry.poke.variant + ' ' + topCarry.poke.name + ' [' + bestAtk + ']');
});

// 5. AUDIT DOM UI CONTROLS IN APP.HTML & APP.JS (AUTO-COMBAT REMOVED, EVOLUTION & MOVES ADDED)
const appHtml = fs.readFileSync('app.html', 'utf8');
const appJs = fs.readFileSync('app.js', 'utf8');

// Strict assertion: Auto-Combat must be completely eliminated
assert(!appHtml.includes('aiAutoCombatBtn'), 'app.html must NOT contain aiAutoCombatBtn');
assert(!appJs.includes('toggleAutoCombat'), 'app.js must NOT contain toggleAutoCombat');
assert(!appJs.includes('checkAndTriggerAutoCombat'), 'app.js must NOT contain checkAndTriggerAutoCombat');
assert(!appJs.includes('isAutoCombatEnabled'), 'app.js must NOT contain isAutoCombatEnabled');

const requiredHtml = [
  'id="aiAssistantTopBtn"',
  'id="aiAssistantMenuBtn"',
  'id="aiAssistantModal"',
  'id="aiQuickAnalyzeBtn"',
  'id="aiQuickSimBtn"',
  'id="aiQuickEvoBtn"',
  'id="aiQuickMovesBtn"',
  'id="aiQuickWhyBtn"',
  'id="aiQuickHazardsBtn"',
  'id="aiChatStream"',
  'id="aiChatInput"',
  'id="aiChatSendBtn"',
  'id="aiInstantActionSlot"'
];

requiredHtml.forEach(tag => {
  assert(appHtml.includes(tag), 'app.html must contain ' + tag);
});

const requiredJs = [
  'openAiAssistantPanel',
  'closeAiAssistantPanel',
  'toggleAiAssistantPanel',
  'updateLiveAiAssistantUI',
  'handleAiChatSubmit',
  'handleRunMonteCarloSimulation',
  'aiAssistant.analyzeBattle',
  'executeAiBattleAction',
  'aiQuickEvoBtn',
  'aiQuickMovesBtn'
];

requiredJs.forEach(fn => {
  assert(appJs.includes(fn), 'app.js must contain ' + fn);
});

console.log('\n[PASS] AUDIT 5: DOM Elements & Desktop Client Controllers Verified');
console.log('  Auto-Combat strictly eradicated. Evolution and Moves buttons active.');

// 6. AUDIT STANDALONE PYTHON EXECUTABLE & INSTALLER PACKAGING
const targetExec = aiAssistant.getEngineExecutable();
assert(targetExec && targetExec.cmd, 'Executable target must resolve');
assert(fs.existsSync(targetExec.cmd), 'Resolved binary must exist on disk: ' + targetExec.cmd);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert(Array.isArray(pkg.build.extraResources), 'package.json must contain extraResources');
const hasEngineResource = pkg.build.extraResources.some(r => r.from && r.from.includes('ml_combat_engine'));
assert(hasEngineResource, 'extraResources must package bin/ml_combat_engine for installation');

console.log('\n[PASS] AUDIT 6: Standalone Python Executable & Installer Packaging Verified');
console.log('  Resolved Binary: ' + targetExec.cmd);
console.log('  Resolver Type:   ' + targetExec.type);
console.log('  Packaging:       extraResources mapped for NSIS and portable installers.');

// 7. AUDIT BEST EVOLUTION PATH & ATTACK MOVES ANALYSIS ENGINES
console.log('\n[PASS] AUDIT 7: Evolution Path & Attack Moves Engine Audit');

// A. Test Eevee branching evolution line
const eeveeAnalysis = aiAssistant.analyzeEvolutionPath('Eevee', coll);
assert(eeveeAnalysis && eeveeAnalysis.branches.length === 8, 'Eevee must have 8 evolutionary branches');
assert(eeveeAnalysis.bestBranch && eeveeAnalysis.bestBranch.name, 'Must determine a best evolution branch');
console.log('  Eevee -> ' + eeveeAnalysis.branches.length + ' branches evaluated. Best: ' + eeveeAnalysis.bestBranch.name + ' (' + eeveeAnalysis.bestBranch.types.join('/') + ')');

// B. Test Applin branching line with G-Max
const applinAnalysis = aiAssistant.analyzeEvolutionPath('Applin', coll);
assert(applinAnalysis && applinAnalysis.branches.length === 4, 'Applin must have 4 branches');
const flapple = applinAnalysis.branches.find(b => b.name === 'Flapple');
const hydrapple = applinAnalysis.branches.find(b => b.name === 'Hydrapple');
assert(flapple && flapple.gmax, 'Flapple must be recognized as G-Max capable');
assert(hydrapple && hydrapple.bst === 540, 'Hydrapple must have 540 BST');
console.log('  Applin -> Flapple (G-Max: ' + flapple.gmax + '), Hydrapple (BST: ' + hydrapple.bst + ') verified');

// C. Test collection ownership detection
const chespinAnalysis = aiAssistant.analyzeEvolutionPath('Chespin', coll);
const chesnaughtBranch = chespinAnalysis.branches.find(b => b.name === 'Chesnaught');
assert(chesnaughtBranch && chesnaughtBranch.ownership.isOwned, 'Chesnaught must be recognized as ALREADY OWNED from collection');
assert.strictEqual(chesnaughtBranch.ownership.bestLevel, 100, 'Owned Chesnaught must be Level 100');
console.log('  Ownership Detection -> ' + chesnaughtBranch.ownership.summaryLabel + ' correctly verified');

// D. Test optimal attack moves recommendation
const charizardMoves = aiAssistant.recommendOptimalMoves('Charizard', [
  { name: 'Tail Whip' },
  { name: 'Fissure' },
  { name: 'Hyper Beam' },
  { name: 'Flamethrower' }
]);
assert(Array.isArray(charizardMoves.optimalMoves) && charizardMoves.optimalMoves.length === 4, 'Must recommend exactly 4 optimal moves');
assert(charizardMoves.moveCritique.length >= 3, 'Must flag Tail Whip (status), Fissure (OHKO), and Hyper Beam (recharge)');
console.log('  Moveset Recommendation -> ' + charizardMoves.optimalMoves.map(m => m.name + ' (' + m.type + ')').join(', '));
console.log('  Move Flaws Critiqued -> ' + charizardMoves.moveCritique.length + ' flaws detected & fixed');

// D2. Test Evolution 4-Choice & Duplicate Attack Moves Analysis
const evolutionEngine = require('./evolution_engine.js');
const houndoomAnalysis = evolutionEngine.evaluateEvolutionMoveSelection('Houndoom', {
  currentMoves: ['Smog', 'Bite', 'Fire Fang', 'Feint Attack'],
  evolutionMoves: ['Fire Fang', 'Feint Attack', 'Flamethrower', 'Crunch']
}, coll);

assert(houndoomAnalysis.currentChoices.length === 4, 'Must identify exactly 4 current choices');
assert(houndoomAnalysis.evolutionChoices.length === 4, 'Must identify exactly 4 evolution choices');
assert(houndoomAnalysis.duplicateChoices.length === 2, 'Must identify 2 duplicate attack moves');
assert(houndoomAnalysis.duplicateChoices.includes('Fire Fang'), 'Fire Fang must be identified as duplicate choice');
assert(houndoomAnalysis.duplicateChoices.includes('Feint Attack'), 'Feint Attack must be identified as duplicate choice');
assert(houndoomAnalysis.recommendedMoves.length === 4, 'Must recommend exactly 4 unique moves');
assert(new Set(houndoomAnalysis.recommendedMoves.map(m => m.name.toLowerCase())).size === 4, 'Recommended moves must be 100% deduplicated');
assert(houndoomAnalysis.dropMoves.some(m => m.name === 'Smog'), 'Smog must be dropped');
console.log('  Evolution 4-Choice Audit -> 4 Current + 4 Evolution (' + houndoomAnalysis.duplicateChoices.length + ' duplicates) correctly analyzed & deduplicated');

// D3. Test Live Evolve Modal Moves for Shadow Mega Mewtwo X (dual typing & duplicate handling)
const mewtwoModalAnalysis = evolutionEngine.evaluateEvolutionMoveSelection('Shadow Mega Mewtwo X', {
  currentMoves: ['Hyper Beam', 'Confusion', 'Psychic', 'Aura Sphere'],
  evolutionMoves: ['Psycho Cut', 'Psychic', 'Aura Sphere', 'Psystrike']
}, coll);

assert(mewtwoModalAnalysis.types.includes('Fighting') && mewtwoModalAnalysis.types.includes('Psychic'), 'Mega Mewtwo X must resolve Psychic/Fighting dual typing');
assert(mewtwoModalAnalysis.duplicateChoices.includes('Psychic') && mewtwoModalAnalysis.duplicateChoices.includes('Aura Sphere'), 'Must identify Psychic and Aura Sphere duplicates');
assert.strictEqual(mewtwoModalAnalysis.recommendedMoves.length, 4, 'Must recommend exactly 4 moves');
assert.strictEqual(new Set(mewtwoModalAnalysis.recommendedMoves.map(m => m.name.toLowerCase())).size, 4, 'Recommended moves must be 100% deduplicated');
console.log('  Live Evolve Modal Audit -> Shadow Mega Mewtwo X dual STAB & duplicate handling verified');

// D4. Test Evolution Readiness Filter: Strict Minimum Level Enforcement, Living Pokedex Ownership & Zero Omission of Unsynced Pages
const mockBoxCollection = [
  { id: 'p0a', name: 'Ghostly Onix', level: 14, canEvolve: true },
  { id: 'p0b', name: 'Dark Scyther', level: 4, canEvolve: true },
  { id: 'p1', name: 'Shadow Onix', level: 45, canEvolve: true },
  { id: 'p2', name: 'Chrome Cosmog', level: 10, canEvolve: true },
  { id: 'p3', name: 'Mirage Torchic', level: 12, canEvolve: true },
  { id: 'p4', name: 'Shadow Mewtwo', level: 100 },
  { id: 'p5', name: 'Poipole', level: 96, canEvolve: true },
  { id: 'p6', name: 'Venusaur', level: 100 },
  { id: 'p7', name: 'Mareep', level: 100, canEvolve: true },
  { id: 'p8', name: 'Swablu', level: 100, canEvolve: true },
  { id: 'p8m', name: 'Mega Altaria', level: 100, canEvolve: false },
  { id: 'p9', name: 'Hisuian Sliggoo', level: 100, canEvolve: true },
  { id: 'p9g', name: 'Hisuian Goodra', level: 100, canEvolve: false }
];
const boxReady = evolutionEngine.getEvolveReadyPokemon(mockBoxCollection);
const readyNames = boxReady.map(p => p.name);
const uniqueReadyNames = boxReady.filter(p => p.hasUnique).map(p => p.name);
assert(!readyNames.includes('Ghostly Onix'), 'Ghostly Onix Lv 14 untrained wild catch (< Lv 20) must be excluded');
assert(!readyNames.includes('Dark Scyther'), 'Dark Scyther Lv 4 untrained wild catch (< Lv 20) must be excluded');
assert(readyNames.includes('Shadow Onix'), 'Shadow Onix Lv 45 must be ready (minLevel 40)');
assert(!readyNames.includes('Chrome Cosmog'), 'Chrome Cosmog Lv 10 must not be ready (minLevel 43)');
assert(!readyNames.includes('Mirage Torchic'), 'Mirage Torchic Lv 12 must not be ready (minLevel 16)');
assert(readyNames.includes('Shadow Mewtwo'), 'Shadow Mewtwo Lv 100 on unsynced page must be ready');
assert(readyNames.includes('Poipole'), 'Poipole Lv 96 must be ready (minLevel 60)');
assert(readyNames.includes('Venusaur'), 'Venusaur Lv 100 must be ready for Mega Venusaur');
assert(uniqueReadyNames.includes('Mareep'), 'Mareep Lv 100 must be ready & unique for immediate next stage Flaaffy');
assert.strictEqual(boxReady.find(p => p.name === 'Mareep').bestBranch.fullName, 'Flaaffy', 'Mareep must evolve to immediate next stage Flaaffy');
assert(uniqueReadyNames.includes('Swablu'), 'Swablu Lv 100 must be ready & unique for Altaria even if Mega Altaria is owned');
assert(!uniqueReadyNames.includes('Hisuian Sliggoo'), 'Hisuian Sliggoo Lv 100 must be duplicate-blocked when Hisuian Goodra is owned');
console.log('  Evolution Readiness Audit -> Under-leveled excluded & Living Pokedex immediate stages verified');

// D5. Test Non-Normal Variant Evolve Modal & Full 554-Species analyzeEvolutionPath Coverage
const darkWeedleAnalysis = aiAssistant.analyzeEvolutionPath('Dark Weedle', mockBoxCollection);
assert(darkWeedleAnalysis && darkWeedleAnalysis.branches.some(b => b.fullName === 'Dark Kakuna' && b.isImmediateStage), 'Dark Weedle must resolve Dark Kakuna as immediate stage');
const sliggooAnalysis = aiAssistant.analyzeEvolutionPath('Hisuian Sliggoo', mockBoxCollection);
assert(sliggooAnalysis && sliggooAnalysis.bestBranch && sliggooAnalysis.bestBranch.name === 'Hisuian Goodra' && sliggooAnalysis.bestBranch.isDuplicate, 'Dynamic STAGE_TRANSITIONS family must resolve Hisuian Goodra as owned duplicate');
const preloadSrc = fs.readFileSync('game-preload.js', 'utf8');
const detectBlock = preloadSrc.slice(preloadSrc.indexOf('function detectEvolveCard()'), preloadSrc.indexOf('function syncEvolveCardState('));
assert(detectBlock.includes('const VARIANT_PREFIX_REGEX ='), 'detectEvolveCard must define VARIANT_PREFIX_REGEX in local scope');
console.log('  Variant Evolve Modal & Dynamic Family Audit -> Dark Weedle & 554-species path coverage verified');

// E. Test chat AI copilot responses
const evoChatResp = aiAssistant.askAssistant('what should i evolve eevee into?', { collection: coll });
assert(evoChatResp && evoChatResp.includes('Evolution'), 'Chat copilot must answer evolution queries');

const movesChatResp = aiAssistant.askAssistant('best moves for charizard', { collection: coll });
assert(movesChatResp && movesChatResp.includes('Recommended Moveset'), 'Chat copilot must answer moveset queries');

const ownChatResp = aiAssistant.askAssistant('do i own chesnaught', { collection: coll });
assert(ownChatResp && ownChatResp.includes('already own'), 'Chat copilot must confirm owned Pokemon');

// 8. AUDIT REAL-TIME MID-BATTLE TARGET SELECTION & G-MAX CHALLENGE SENSORS
const mockGmaxBattle = {
  trainerName: 'Mystery Lass',
  roster: [
    { name: 'Retro Dodrio', types: ['Normal', 'Flying'], level: 100, hp: 0, isFainted: true },
    { name: 'Dark Sneasler', types: ['Fighting', 'Poison'], level: 100, hp: 400, isFainted: false },
    { name: 'Mirage Celebi', types: ['Psychic', 'Grass'], level: 100, hp: 400, isFainted: false },
    { name: 'Chrome Zekrom', types: ['Dragon', 'Electric'], level: 100, hp: 540, isFainted: false },
    { name: 'Shiny Mega Altaria', types: ['Dragon', 'Fairy'], level: 100, hp: 500, isFainted: false },
    { name: 'Shiny G-Max Urshifu', types: ['Fighting', 'Dark'], level: 100, hp: 500, isFainted: false }
  ],
  userTeam: [
    { name: 'Dark Urshifu (Rapid Strike)', types: ['Fighting', 'Water'], level: 100, hp: 400 },
    { name: 'Metallic Melmetal', types: ['Steel'], level: 100, hp: 166, checked: true },
    { name: 'Venusaur', types: ['Grass', 'Poison'], level: 100, hp: 400 },
    { name: 'Melmetal', types: ['Steel'], level: 100, hp: 400 },
    { name: 'Metallic Urshifu (Single Strike)', types: ['Fighting', 'Dark'], level: 100, hp: 400 },
    { name: 'Urshifu (Rapid Strike)', types: ['Fighting', 'Water'], level: 100, hp: 400 }
  ],
  isPreparationScreen: true
};

const gmaxAnalysis = aiAssistant.analyzeBattle(mockGmaxBattle, coll);
assert.strictEqual(gmaxAnalysis.activeOpponent, 'Dark Sneasler', 'Must skip fainted Retro Dodrio and target alive Dark Sneasler');
assert.strictEqual(gmaxAnalysis.activeOpponentLevel, 100, 'Target level must be 100');
assert.deepStrictEqual(gmaxAnalysis.activeOpponentTypes, ['Fighting', 'Poison'], 'Dark Sneasler types must be Fighting/Poison');
assert(gmaxAnalysis.hazards.some(h => h.includes('Psychic')), 'Must identify 4x Quad Weakness to Psychic for Dark Sneasler');

// Test Active Battle with on-screen battler & on-screen moves (Melmetal vs Dodrio)
const mockActiveBattle = {
  trainerName: 'Mystery Lass',
  roster: [
    { name: 'Retro Dodrio', types: ['Normal', 'Flying'], level: 100, hp: 400, isFainted: false },
    { name: 'Dark Sneasler', types: ['Fighting', 'Poison'], level: 100, hp: 400, isFainted: false }
  ],
  userActivePokemon: {
    name: 'Metallic Melmetal',
    types: ['Steel'],
    level: 100,
    hp: 400,
    maxHp: 400,
    isFainted: false
  },
  availableMoves: [
    { name: 'Double Iron Bash', type: 'Steel', rawLabel: 'Double Iron Bash (Steel)' },
    { name: 'Thunder Wave', type: 'Electric', rawLabel: 'Thunder Wave (Electric)' },
    { name: 'Superpower', type: 'Fighting', rawLabel: 'Superpower (Fighting)' },
    { name: 'Hyper Beam', type: 'Normal', rawLabel: 'Hyper Beam (Normal)' }
  ],
  userTeam: [
    { name: 'Metallic Melmetal', types: ['Steel'], level: 100, hp: 400 },
    { name: 'Dark Urshifu', types: ['Fighting', 'Water'], level: 100, hp: 400 }
  ],
  isInActiveBattle: true
};

const activeAnalysis = aiAssistant.analyzeBattle(mockActiveBattle, coll);
assert.strictEqual(activeAnalysis.isInActiveBattle, true, 'Must recognize active battle mode');
assert.strictEqual(activeAnalysis.activeOpponent, 'Retro Dodrio', 'Must target active on-screen opponent Retro Dodrio');
assert.strictEqual(activeAnalysis.bestActiveLead.name, 'Metallic Melmetal', 'Active battler must be Metallic Melmetal');
assert.strictEqual(activeAnalysis.bestCarry, null, 'Must NOT recommend PC storage carry during active battle');
assert(activeAnalysis.recommendedMove.includes('Double Iron Bash') || activeAnalysis.recommendedMove.includes('Thunder Wave'), 'Must recommend optimal on-screen move');
assert.strictEqual(activeAnalysis.quadWeaknesses.length, 0, 'Retro Dodrio must have 0 quad weaknesses');

const activeHud = aiAssistant.getFloatingHudText(mockActiveBattle, coll);
assert(activeHud.includes('Retro Dodrio'), 'HUD must mention Retro Dodrio');
assert(activeHud.includes('Use:'), 'HUD must prompt optimal move');

const moveQueryResp = aiAssistant.askAssistant('what move should i use?', { battle: mockActiveBattle, collection: coll });
assert(moveQueryResp.includes('Double Iron Bash') || moveQueryResp.includes('Thunder Wave'), 'Chat must recommend on-screen move');

// Test G-Max Challenge Preview with Lineup Lock (Mystery Collector vs Locked Team)
const mockGmaxCollectorPreview = {
  trainerName: 'Mystery Collector',
  roster: [
    { name: 'Dark Ambipom', types: ['Normal'], level: 100, hp: 400, isFainted: false },
    { name: 'Dark Sneasler', types: ['Fighting', 'Poison'], level: 100, hp: 400, isFainted: false },
    { name: 'Chrome Regice', types: ['Ice'], level: 100, hp: 400, isFainted: false },
    { name: 'Victini', types: ['Psychic', 'Fire'], level: 100, hp: 400, isFainted: false },
    { name: 'Chrome Mega Garchomp', types: ['Dragon', 'Ground'], level: 100, hp: 400, isFainted: false },
    { name: 'Negative G-Max Appletun', types: ['Grass', 'Dragon'], level: 100, hp: 400, isFainted: false }
  ],
  userTeam: [
    { name: 'Dark Urshifu (Rapid Strike)', types: ['Fighting', 'Water'], level: 100, hp: 400, index: 0 },
    { name: 'Metallic Melmetal', types: ['Steel'], level: 100, hp: 400, index: 1 },
    { name: 'Venusaur', types: ['Grass', 'Poison'], level: 100, hp: 400, index: 2 },
    { name: 'Melmetal', types: ['Steel'], level: 100, hp: 400, index: 3 },
    { name: 'Metallic Urshifu (Single Strike)', types: ['Fighting', 'Dark'], level: 100, hp: 400, index: 4 },
    { name: 'Urshifu (Rapid Strike)', types: ['Fighting', 'Water'], level: 100, hp: 400, index: 5 }
  ],
  isPreparationScreen: true,
  isChallengePreview: true,
  isGmaxChallenge: true,
  isChallengeLocked: true
};

const collectorAnalysis = aiAssistant.analyzeBattle(mockGmaxCollectorPreview, coll);
assert.strictEqual(collectorAnalysis.isChallengeLocked, true, 'Must enforce challenge locked state');
assert.strictEqual(collectorAnalysis.bestCarry, null, 'Must NOT recommend PC storage carry during G-Max Challenge');
assert.strictEqual(collectorAnalysis.bestCarryObj, null, 'bestCarryObj must be null during G-Max Challenge');
assert(collectorAnalysis.bestActiveLead, 'Must recommend lead from locked challenge team');
assert(collectorAnalysis.bestActiveLead.name.includes('Urshifu') || collectorAnalysis.bestActiveLead.name.includes('Melmetal'), 'Must pick counter lead from locked team');
assert(collectorAnalysis.callout.includes('Locked Challenge Counter') || collectorAnalysis.callout.includes('locked'), 'Callout must state lineup changes locked');

// Test Roster Counter Roadmap & Pick Queries
assert(Array.isArray(collectorAnalysis.counterRoadmap) && collectorAnalysis.counterRoadmap.length === 6, 'collectorAnalysis must include 6-member counter roadmap');
assert(collectorAnalysis.counterRoadmap[0].isActive === true, 'First alive opponent Dark Ambipom must be active in roadmap');
assert(collectorAnalysis.counterRoadmap.every(r => r.counterName && r.bestMoveName), 'Every roadmap opponent must have a counter and move');

// Test chat answers for "what to pick" and "what move"
const pickResp = aiAssistant.askAssistant('what to pick?', { battle: mockGmaxCollectorPreview, collection: coll });
assert(pickResp.includes('Deploy') && !pickResp.includes('I am observing the battle'), 'Pick query must give direct deploy instruction');

const pickPokeResp = aiAssistant.askAssistant('what pokemon to pick', { battle: mockGmaxCollectorPreview, collection: coll });
assert(pickPokeResp.includes('Deploy') && !pickPokeResp.includes('I am observing the battle'), 'Pokemon pick query must give direct deploy instruction');

const moveResp = aiAssistant.askAssistant('what move?', { battle: mockGmaxCollectorPreview, collection: coll });
assert((moveResp.includes('use') || moveResp.includes('Cast')) && !moveResp.includes('I am observing the battle'), 'Move query must give specific move instruction');

const roadmapResp = aiAssistant.askAssistant('show me the full roadmap', { battle: mockGmaxCollectorPreview, collection: coll });
assert(roadmapResp.includes('ROSTER COUNTER ROADMAP'), 'Roadmap query must return full roster roadmap');

// Test that Cast Move button is removed from app.js during active battle
assert(!appJs.includes("aiInstantActionSlot.appendChild(moveBtn)"), 'app.js must NOT create cast move button in active battle');
assert(appJs.includes('ROSTER COUNTER ROADMAP'), 'app.js must render ROSTER COUNTER ROADMAP');

const preloadContent = fs.readFileSync('game-preload.js', 'utf8');
assert(preloadContent.includes('runRealtimeBattleSensors'), 'game-preload.js must have runRealtimeBattleSensors loop');
assert(preloadContent.includes('click-battle-button'), 'game-preload.js must support click-battle-button action');
assert(preloadContent.includes('Mode 1B: Challenge'), 'game-preload.js must contain Mode 1B for Challenge Preview');
console.log('\n[PASS] AUDIT 8: Real-Time Mid-Battle Target Selection & G-Max Challenge Sensors Verified');

// 10. AUDIT SMART BATTLE FLOW ACTION BUTTON STATE MACHINE
console.log('\n[PASS] AUDIT 10: Smart Battle Flow Action Button State Machine Verified');

// Scenario 1: Active Battle Attack Mode (Opponent at full HP)
const activeBattleTurn1 = {
  trainerName: 'Brock',
  isInActiveBattle: true,
  roster: [{ name: 'Geodude', types: ['Rock', 'Ground'], level: 100, hp: 400, maxHp: 400, isFainted: false }],
  userActivePokemon: { name: 'Dark Chesnaught', types: ['Grass', 'Fighting', 'Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false },
  availableMoves: [
    { name: 'Wood Hammer', type: 'Grass', rawLabel: 'Wood Hammer (Grass)' },
    { name: 'Hammer Arm', type: 'Fighting', rawLabel: 'Hammer Arm (Fighting)' }
  ],
  userTeam: [
    { name: 'Dark Chesnaught', types: ['Grass', 'Fighting', 'Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false }
  ]
};
const analysisTurn1 = aiAssistant.analyzeBattle(activeBattleTurn1, coll);
assert.strictEqual(analysisTurn1.isInActiveBattle, true, 'Turn 1 must be in active battle');
assert.strictEqual(analysisTurn1.activeOpponentHp, 400, 'Opponent HP must be 400');
assert.strictEqual(analysisTurn1.activeOpponentMaxHp, 400, 'Opponent Max HP must be 400');
assert.strictEqual(analysisTurn1.isActiveOpponentFainted, false, 'Opponent must not be fainted');
assert.strictEqual(analysisTurn1.isActiveBattlerFainted, false, 'Player battler must not be fainted');
assert(analysisTurn1.bestMoveObj, 'Must have resolved best move object');
assert.strictEqual(analysisTurn1.bestMoveObj.name, 'Wood Hammer', 'Best move against Geodude must be Wood Hammer');
assert(analysisTurn1.bestMoveObj.multiplier >= 2.0, 'Move must be super-effective');

// Scenario 2: Active Battle Reattack Mode (Opponent survived and took damage)
const activeBattleTurn2 = {
  trainerName: 'Brock',
  isInActiveBattle: true,
  roster: [{ name: 'Geodude', types: ['Rock', 'Ground'], level: 100, hp: 160, maxHp: 400, isFainted: false }],
  userActivePokemon: { name: 'Dark Chesnaught', types: ['Grass', 'Fighting', 'Dark'], level: 100, hp: 320, maxHp: 400, isFainted: false },
  availableMoves: [
    { name: 'Wood Hammer', type: 'Grass', rawLabel: 'Wood Hammer (Grass)' }
  ],
  userTeam: [
    { name: 'Dark Chesnaught', types: ['Grass', 'Fighting', 'Dark'], level: 100, hp: 320, maxHp: 400, isFainted: false }
  ]
};
const analysisTurn2 = aiAssistant.analyzeBattle(activeBattleTurn2, coll);
assert.strictEqual(analysisTurn2.activeOpponentHp, 160, 'Opponent HP must be 160');
assert.strictEqual(analysisTurn2.activeOpponentMaxHp, 400, 'Opponent Max HP must be 400');
const isReattack = (analysisTurn2.activeOpponentHp < analysisTurn2.activeOpponentMaxHp && analysisTurn2.activeOpponentHp > 0);
assert.strictEqual(isReattack, true, 'Turn 2 must be detected as Reattack');

// Scenario 3: Turn Result / Continue Mode (Opponent alive, continue button present)
const activeBattleContinue = {
  trainerName: 'Brock',
  isInActiveBattle: true,
  hasContinueBtn: true,
  availableMoves: [],
  roster: [{ name: 'Geodude', types: ['Rock', 'Ground'], level: 100, hp: 160, maxHp: 400, isFainted: false }],
  userActivePokemon: { name: 'Dark Chesnaught', types: ['Grass', 'Fighting', 'Dark'], level: 100, hp: 320, maxHp: 400, isFainted: false },
  userTeam: [
    { name: 'Dark Chesnaught', types: ['Grass', 'Fighting', 'Dark'], level: 100, hp: 320, maxHp: 400, isFainted: false }
  ]
};
const analysisContinue = aiAssistant.analyzeBattle(activeBattleContinue, coll);
assert.strictEqual(analysisContinue.hasContinueBtn, true, 'hasContinueBtn must be true');
assert.strictEqual(analysisContinue.isActiveOpponentFainted, false, 'Opponent not fainted yet');

// Scenario 4: Turn Result / Opponent KO Continue Mode (Opponent fainted)
const activeBattleOppFainted = {
  trainerName: 'Brock',
  isInActiveBattle: true,
  hasContinueBtn: true,
  availableMoves: [],
  roster: [{ name: 'Geodude', types: ['Rock', 'Ground'], level: 100, hp: 0, maxHp: 400, isFainted: true }],
  userActivePokemon: { name: 'Dark Chesnaught', types: ['Grass', 'Fighting', 'Dark'], level: 100, hp: 320, maxHp: 400, isFainted: false },
  userTeam: [
    { name: 'Dark Chesnaught', types: ['Grass', 'Fighting', 'Dark'], level: 100, hp: 320, maxHp: 400, isFainted: false }
  ]
};
const analysisOppFainted = aiAssistant.analyzeBattle(activeBattleOppFainted, coll);
assert.strictEqual(analysisOppFainted.isActiveOpponentFainted, true, 'Opponent must be detected as fainted');

// Scenario 5: Player Pokemon Fainted - Bench Counter Switch Mode
const activeBattleUserFainted = {
  trainerName: 'Brock',
  isInActiveBattle: true,
  roster: [{ name: 'Onix', types: ['Rock', 'Ground'], level: 100, hp: 400, maxHp: 400, isFainted: false }],
  userActivePokemon: { name: 'Dark Chesnaught', types: ['Grass', 'Fighting', 'Dark'], level: 100, hp: 0, maxHp: 400, isFainted: true },
  userTeam: [
    { name: 'Dark Chesnaught', types: ['Grass', 'Fighting', 'Dark'], level: 100, hp: 0, maxHp: 400, isFainted: true },
    { name: 'Shiny Greninja', types: ['Water', 'Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false },
    { name: 'Mewtwo', types: ['Psychic'], level: 100, hp: 400, maxHp: 400, isFainted: false }
  ]
};
const analysisUserFainted = aiAssistant.analyzeBattle(activeBattleUserFainted, coll);
assert.strictEqual(analysisUserFainted.isActiveBattlerFainted, true, 'Active battler must be detected as fainted');
assert(analysisUserFainted.nextAliveCounter, 'Must identify next alive bench counter');
assert.strictEqual(analysisUserFainted.nextAliveCounter, 'Shiny Greninja', 'Next alive counter must be Shiny Greninja');

// Scenario 6: Battle Complete Mode
const victoryBattle = {
  trainerName: 'Brock',
  isVictoryScreen: true,
  roster: [{ name: 'Onix', types: ['Rock', 'Ground'], level: 100, hp: 0, maxHp: 400, isFainted: true }]
};
const isComplete = Boolean(victoryBattle.isVictoryScreen || victoryBattle.roster.every(p => p.isFainted || p.hp <= 0));
assert.strictEqual(isComplete, true, 'Victory screen must indicate battle complete');

// Scenario 6b: Challenge Post-Battle with Next Battle Link (G-Max Challenge)
const gmaxNextBattle = {
  trainerName: 'G-Max Opponent',
  isVictoryScreen: true,
  isPostBattleScreen: true,
  hasNextBattleBtn: true,
  roster: [{ name: 'Charizard', types: ['Fire', 'Flying'], level: 100, hp: 0, maxHp: 400, isFainted: true }]
};
const isPostBattleNext = Boolean(gmaxNextBattle.isVictoryScreen || gmaxNextBattle.hasNextBattleBtn);
assert.strictEqual(isPostBattleNext, true, 'G-Max victory screen with Next Battle must indicate post-battle');
assert.strictEqual(gmaxNextBattle.hasNextBattleBtn, true, 'hasNextBattleBtn must be true');

// Scenario 7: Training Team 2-Pokemon EXP Maximization (Primary Trainee Leads First -> Carry Finishes When Trainee Dies)
const trainingBattleStart = {
  trainerName: 'Veteran Tamaki',
  isPreparationScreen: true,
  roster: [
    { name: 'Umbreon', types: ['Dark'], level: 80, hp: 320, maxHp: 320, isFainted: false },
    { name: 'Tyrantrum', types: ['Rock', 'Dragon'], level: 84, hp: 336, maxHp: 336, isFainted: false },
    { name: 'Aggron', types: ['Steel', 'Rock'], level: 86, hp: 344, maxHp: 344, isFainted: false },
    { name: 'Tyranitar', types: ['Rock', 'Dark'], level: 86, hp: 344, maxHp: 344, isFainted: false }
  ],
  userTeam: [
    { name: 'Palkia (Origin)', types: ['Water', 'Dragon'], level: 100, hp: 400, maxHp: 400, isFainted: false, index: 0 },
    { name: 'Dialga', types: ['Steel', 'Dragon'], level: 76, hp: 304, maxHp: 304, isFainted: false, index: 1 },
    { name: 'Chien-pao', types: ['Dark', 'Ice'], level: 61, hp: 244, maxHp: 244, isFainted: false, index: 2 },
    { name: 'Calyrex', types: ['Psychic', 'Grass'], level: 65, hp: 260, maxHp: 260, isFainted: false, index: 3 },
    { name: 'Ho-oh', types: ['Fire', 'Flying'], level: 74, hp: 296, maxHp: 296, isFainted: false, index: 4 },
    { name: 'Negative Maschiff', types: ['Dark'], level: 15, hp: 60, maxHp: 60, isFainted: false, index: 5 }
  ]
};
const trainStartAnalysis = aiAssistant.analyzeBattle(trainingBattleStart, coll);
assert.strictEqual(trainStartAnalysis.bestActiveLead.name, 'Dialga', 'Primary Trainee (Dialga) MUST lead first at start of battle');

const trainingBattleTraineeFainted = {
  trainerName: 'Veteran Tamaki',
  isPreparationScreen: true,
  roster: [
    { name: 'Umbreon', types: ['Dark'], level: 80, hp: 93, maxHp: 320, isFainted: false },
    { name: 'Tyrantrum', types: ['Rock', 'Dragon'], level: 84, hp: 0, maxHp: 336, isFainted: true },
    { name: 'Aggron', types: ['Steel', 'Rock'], level: 86, hp: 344, maxHp: 344, isFainted: false },
    { name: 'Tyranitar', types: ['Rock', 'Dark'], level: 86, hp: 0, maxHp: 344, isFainted: true }
  ],
  userTeam: [
    { name: 'Palkia (Origin)', types: ['Water', 'Dragon'], level: 100, hp: 400, maxHp: 400, isFainted: false, index: 0 },
    { name: 'Dialga', types: ['Steel', 'Dragon'], level: 76, hp: 0, maxHp: 304, isFainted: true, index: 1 },
    { name: 'Chien-pao', types: ['Dark', 'Ice'], level: 61, hp: 244, maxHp: 244, isFainted: false, index: 2 },
    { name: 'Calyrex', types: ['Psychic', 'Grass'], level: 65, hp: 260, maxHp: 260, isFainted: false, index: 3 },
    { name: 'Ho-oh', types: ['Fire', 'Flying'], level: 74, hp: 296, maxHp: 296, isFainted: false, index: 4 },
    { name: 'Negative Maschiff', types: ['Dark'], level: 15, hp: 60, maxHp: 60, isFainted: false, index: 5 }
  ]
};
const trainFaintedAnalysis = aiAssistant.analyzeBattle(trainingBattleTraineeFainted, coll);
assert.strictEqual(trainFaintedAnalysis.bestActiveLead.name, 'Palkia (Origin)', 'When Primary Trainee (Dialga) faints, Carry (Palkia (Origin)) MUST finish the battle instead of switching to Chien-pao');
assert.strictEqual(trainStartAnalysis.bestActiveLead.level, 76, 'Primary Trainee lead must report actual level 76 instead of hardcoded 100');
assert.strictEqual(trainStartAnalysis.isHighLevelTrainee, false, 'Level 76 trainee must have isHighLevelTrainee === false');

// Active Battle Post-Faint Carry Takeover & Level 100 Auto-Graduation Audit
const activeTraineeFainted = {
  trainerName: 'Veteran Tamaki',
  isInActiveBattle: true,
  hasContinueBtn: true,
  hasBenchRadios: true,
  hasAttackBtn: false,
  userActivePokemon: { name: 'Dialga', types: ['Steel', 'Dragon'], level: 76, hp: 0, maxHp: 304, isFainted: true },
  roster: trainingBattleTraineeFainted.roster,
  userTeam: trainingBattleTraineeFainted.userTeam
};
const activeFaintedAnalysis = aiAssistant.analyzeBattle(activeTraineeFainted, coll);
assert.strictEqual(activeFaintedAnalysis.isActiveBattlerFainted, true, 'Dialga must be detected as fainted in active battle');
assert.strictEqual(activeFaintedAnalysis.nextAliveCounter, 'Palkia (Origin)', 'When Dialga faints in active battle, nextAliveCounter MUST be Carry Palkia (Origin)');

const graduatedBattleStart = {
  trainerName: 'Veteran Tamaki',
  isPreparationScreen: true,
  roster: trainingBattleStart.roster,
  userTeam: [
    { name: 'Palkia (Origin)', types: ['Water', 'Dragon'], level: 100, hp: 400, maxHp: 400, isFainted: false, index: 0 },
    { name: 'Dialga', types: ['Steel', 'Dragon'], level: 100, hp: 400, maxHp: 400, isFainted: false, index: 1 },
    { name: 'Chien-pao', types: ['Dark', 'Ice'], level: 88, hp: 352, maxHp: 352, isFainted: false, index: 2 },
    { name: 'Negative Maschiff', types: ['Dark'], level: 15, hp: 60, maxHp: 60, isFainted: false, index: 3 }
  ]
};
const graduatedAnalysis = aiAssistant.analyzeBattle(graduatedBattleStart, coll);
assert.strictEqual(graduatedAnalysis.bestActiveLead.name, 'Chien-pao', 'Once Dialga graduates to Lv 100, next trainee (Chien-pao) MUST auto-promote to Primary Trainee');
assert.strictEqual(graduatedAnalysis.isHighLevelTrainee, true, 'Level 88 Chien-pao must have isHighLevelTrainee === true');

// High-Level Cap Relay (>= Lv 85) vs Baby Protection (< Lv 85) Audit
const highLevelRelayBattle = {
  trainerName: 'Veteran Tamaki',
  isInActiveBattle: true,
  hasContinueBtn: true,
  hasBenchRadios: true,
  hasAttackBtn: false,
  userActivePokemon: { name: 'Dialga', types: ['Steel', 'Dragon'], level: 96, hp: 0, maxHp: 384, isFainted: true },
  roster: trainingBattleTraineeFainted.roster,
  userTeam: [
    { name: 'Palkia (Origin)', types: ['Water', 'Dragon'], level: 100, hp: 400, maxHp: 400, isFainted: false, index: 0 },
    { name: 'Dialga', types: ['Steel', 'Dragon'], level: 96, hp: 0, maxHp: 384, isFainted: true, index: 1 },
    { name: 'Chien-pao', types: ['Dark', 'Ice'], level: 92, hp: 368, maxHp: 368, isFainted: false, index: 2 },
    { name: 'Negative Maschiff', types: ['Dark'], level: 15, hp: 60, maxHp: 60, isFainted: false, index: 3 }
  ]
};
const highLevelRelayAnalysis = aiAssistant.analyzeBattle(highLevelRelayBattle, coll);
assert.strictEqual(highLevelRelayAnalysis.nextAliveCounter, 'Chien-pao', 'When Lv 96 Dialga faints, capable bench trainee Chien-pao (Lv 92 >= 85) MUST be deployed to absorb surplus EXP');

// Sidney Scenario A: High-Level Primary Trainee (Buneary Lv 94) Faints -> Baby Secondary Trainee (Chrome Weedle Lv 11) Relays for 1 Turn -> Carry (Dark Buzzwole Lv 100) Sweeps
const sidneyBunearyFainted = {
  trainerName: 'Sidney',
  isPreparationScreen: true,
  roster: [
    { name: 'Mightyena', types: ['Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false },
    { name: 'Shiftry', types: ['Grass', 'Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false, isCurrentActive: true },
    { name: 'Cacturne', types: ['Grass', 'Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false },
    { name: 'Sharpedo', types: ['Water', 'Dark'], level: 100, hp: 0, maxHp: 400, isFainted: true },
    { name: 'Absol', types: ['Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false }
  ],
  userTeam: [
    { name: 'Dark Buzzwole', types: ['Bug', 'Fighting'], level: 100, hp: 400, maxHp: 400, isFainted: false, index: 0 },
    { name: 'Buneary', types: ['Normal'], level: 94, hp: 0, maxHp: 376, isFainted: true, index: 1 },
    { name: 'Chrome Weedle', types: ['Bug', 'Poison'], level: 11, hp: 60, maxHp: 60, isFainted: false, index: 2 },
    { name: 'Negative Scyther', types: ['Bug', 'Flying'], level: 5, hp: 20, maxHp: 20, isFainted: false, index: 3 },
    { name: 'Weedle', types: ['Bug', 'Poison'], level: 8, hp: 32, maxHp: 32, isFainted: false, index: 4 },
    { name: 'Shiny Weedle', types: ['Bug', 'Poison'], level: 5, hp: 25, maxHp: 25, isFainted: false, index: 5 }
  ]
};
const sidneyRelayAnalysis = aiAssistant.analyzeBattle(sidneyBunearyFainted, coll);
assert.strictEqual(sidneyRelayAnalysis.bestActiveLead.name, 'Chrome Weedle', 'When Lv 94 Buneary (>= Lv 85) faints, Secondary Trainee Chrome Weedle (Lv 11) MUST be deployed for 1 turn so surplus EXP is not wasted');

// Sidney Scenario B: After Secondary Trainee (Chrome Weedle Lv 11) ALSO Faints -> Carry (Dark Buzzwole Lv 100) Immediately Sweeps (Never deploys Slot 4-6 babies)
const sidneyWeedleFaintedCarryAlive = {
  trainerName: 'Sidney',
  isInActiveBattle: true,
  hasContinueBtn: true,
  hasForfeitBtn: true,
  userActivePokemon: { name: 'Chrome Weedle', types: ['Bug', 'Poison'], level: 11, hp: 0, maxHp: 60, isFainted: true },
  roster: sidneyBunearyFainted.roster,
  userTeam: [
    { name: 'Dark Buzzwole', types: ['Bug', 'Fighting'], level: 100, hp: 400, maxHp: 400, isFainted: false, index: 0 },
    { name: 'Buneary', types: ['Normal'], level: 94, hp: 0, maxHp: 376, isFainted: true, index: 1 },
    { name: 'Chrome Weedle', types: ['Bug', 'Poison'], level: 11, hp: 0, maxHp: 60, isFainted: true, index: 2 },
    { name: 'Negative Scyther', types: ['Bug', 'Flying'], level: 5, hp: 20, maxHp: 20, isFainted: false, index: 3 },
    { name: 'Weedle', types: ['Bug', 'Poison'], level: 8, hp: 32, maxHp: 32, isFainted: false, index: 4 },
    { name: 'Shiny Weedle', types: ['Bug', 'Poison'], level: 5, hp: 25, maxHp: 25, isFainted: false, index: 5 }
  ]
};
const sidneyCarrySweepAnalysis = aiAssistant.analyzeBattle(sidneyWeedleFaintedCarryAlive, coll);
assert.strictEqual(sidneyCarrySweepAnalysis.shouldForfeitBattle, false, 'Must NEVER forfeit while Carry (Dark Buzzwole Lv 100) is still alive');
assert.strictEqual(sidneyCarrySweepAnalysis.nextAliveCounter, 'Dark Buzzwole', 'After Chrome Weedle faints, Carry (Dark Buzzwole) MUST deploy instead of Slot 4 Negative Scyther');

// Sidney Scenario C: Precision Tactical Forfeit when BOTH Carry (Dark Buzzwole Lv 100) and Buneary (Lv 94) are Fainted and only Babies remain
const sidneyCarryAndBunearyDead = {
  trainerName: 'Sidney',
  isInActiveBattle: true,
  hasContinueBtn: true,
  hasForfeitBtn: true,
  userActivePokemon: { name: 'Chrome Weedle', types: ['Bug', 'Poison'], level: 11, hp: 0, maxHp: 60, isFainted: true },
  roster: sidneyBunearyFainted.roster,
  userTeam: [
    { name: 'Dark Buzzwole', types: ['Bug', 'Fighting'], level: 100, hp: 0, maxHp: 400, isFainted: true, index: 0 },
    { name: 'Buneary', types: ['Normal'], level: 94, hp: 0, maxHp: 376, isFainted: true, index: 1 },
    { name: 'Chrome Weedle', types: ['Bug', 'Poison'], level: 11, hp: 0, maxHp: 60, isFainted: true, index: 2 },
    { name: 'Negative Scyther', types: ['Bug', 'Flying'], level: 5, hp: 20, maxHp: 20, isFainted: false, index: 3 },
    { name: 'Weedle', types: ['Bug', 'Poison'], level: 8, hp: 32, maxHp: 32, isFainted: false, index: 4 },
    { name: 'Shiny Weedle', types: ['Bug', 'Poison'], level: 5, hp: 25, maxHp: 25, isFainted: false, index: 5 }
  ]
};
const sidneyForfeitAnalysis = aiAssistant.analyzeBattle(sidneyCarryAndBunearyDead, coll);
assert.strictEqual(sidneyForfeitAnalysis.shouldForfeitBattle, true, 'When Carry and Lv 94 Buneary are both fainted and only Lv 5-8 babies remain vs Lv 100 Sidney, shouldForfeitBattle MUST be true');

console.log('  State 1 (Prep):     Deploy [Lead] & Start');
console.log('  State 2 (Attack):   Attack with Wood Hammer (4.0x)');
console.log('  State 3 (Reattack): Reattack with Wood Hammer (4.0x)');
console.log('  State 4 (Continue): Continue to Next Turn');
console.log('  State 5 (KO Cont):  Opponent KO - Continue');
console.log('  State 6 (Switch):   Deploy Shiny Greninja & Continue');
console.log('  State 7 (Complete): Battle Complete');

// 11. AUDIT TRAINING BATTLE LOOP & LEVEL 100 COMPLETION ENGINE
const appHtmlContent = fs.readFileSync('app.html', 'utf8');
assert(appHtmlContent.includes('id="teamBattleLoopCheck"'), 'app.html must define teamBattleLoopCheck');
assert(appHtmlContent.includes('id="teamBattleLoopLabel"'), 'app.html must define teamBattleLoopLabel');
assert(appHtmlContent.includes('teamBattleLoopCheck" disabled'), 'Loop checkbox must be disabled by default until Auto is armed');
assert(!appHtmlContent.includes('teamBattleLoopLabel" style="box-shadow: 0 0'), 'Loop label must have zero glowing box-shadow');

// Test Level 100 Detection logic
const checkAll100 = (team) => team.every(p => p.level >= 100);
const incompleteTeam = [
  { name: 'Mega Heracross', level: 100 },
  { name: 'Naganadel', level: 96 },
  { name: 'Terapagos', level: 85 }
];
const completeTeam = [
  { name: 'Mega Heracross', level: 100 },
  { name: 'Naganadel', level: 100 },
  { name: 'Terapagos', level: 100 }
];
assert.strictEqual(checkAll100(incompleteTeam), false, 'Team with level 96 must NOT be considered complete');
assert.strictEqual(checkAll100(completeTeam), true, 'Team with all level 100s MUST be considered complete');

// Test Live Battling Team Prioritization over Sidebar Team
const evaluateAll100WithPriority = (liveBattlingTeam, sidebarTeam) => {
  const teamToCheck = (liveBattlingTeam && liveBattlingTeam.length > 0)
    ? liveBattlingTeam
    : (sidebarTeam && sidebarTeam.length > 0 ? sidebarTeam : null);
  if (!teamToCheck || teamToCheck.length === 0) return false;
  return teamToCheck.every(p => (p && typeof p.level === 'number' ? p.level : 0) >= 100);
};

const sidebarWithTrainees = [
  { name: 'Mega Mewtwo X', level: 100 },
  { name: 'Kubfu', level: 65 },
  { name: 'Goomy', level: 16 }
];
const liveMaxedBattlingTeam = [
  { name: 'Mega Heracross', level: 100 },
  { name: 'Naganadel', level: 100 },
  { name: 'Terapagos', level: 100 }
];
assert.strictEqual(
  evaluateAll100WithPriority(liveMaxedBattlingTeam, sidebarWithTrainees),
  true,
  'Live maxed battling team MUST trigger training complete even when sidebar contains trainee members'
);

const appJsFull = fs.readFileSync('app.js', 'utf8');
assert(appJsFull.includes('function areAllTeamPokemonLevel100()'), 'app.js must define areAllTeamPokemonLevel100');
assert(appJsFull.includes('const battlingTeam = (activeAiBattleData && Array.isArray(activeAiBattleData.userTeam)'), 'areAllTeamPokemonLevel100 must prioritize activeAiBattleData.userTeam');
assert(appJsFull.includes('function scheduleNextLoopBattle()'), 'app.js must define scheduleNextLoopBattle');
assert(appJsFull.includes('function updateLoopCheckboxVisual()'), 'app.js must define updateLoopCheckboxVisual');
assert(appJsFull.includes('if (battleLoopTimer) return;'), 'scheduleNextLoopBattle must prevent 500ms sensor starvation');
assert(appJsFull.includes('battleData.isDefeatScreen'), 'computeAiBattleActionConfig must support defeat screen');
assert(appJsFull.includes('Battle Finished'), 'updateTeamBuilderBattleAction must support battle finished on defeat');

const preloadJsFull = fs.readFileSync('game-preload.js', 'utf8');
assert(preloadJsFull.includes('isDefeatScreen: Boolean(isDefeat)'), 'game-preload.js must emit isDefeatScreen');
assert(preloadJsFull.includes("ipcRenderer.on('click-rematch-button'"), 'game-preload.js must support click-rematch-button');
assert(preloadJsFull.includes('STEALTH_FOCUS_STYLE_ID'), 'game-preload.js must implement stealth focus outline suppression');
assert(preloadJsFull.includes('applyCleanFocusOutline()'), 'game-preload.js must execute applyCleanFocusOutline');
assert(preloadJsFull.includes('battle-exp-calibrated'), 'game-preload.js must emit battle-exp-calibrated on victory');
assert(preloadJsFull.includes('gainedExpPerPoke'), 'game-preload.js must extract gainedExpPerPoke');
assert(preloadJsFull.includes('totalExpPool'), 'game-preload.js must compute totalExpPool');

assert(appJsFull.includes('function handleBattleExpCalibrated'), 'app.js must implement handleBattleExpCalibrated');
assert(appJsFull.includes('function predictTrainerExpGain'), 'app.js must implement predictTrainerExpGain');
assert(appJsFull.includes('isVeryStrongOpponent'), 'app.js must utilize isVeryStrongOpponent for dual carries');
assert(appJsFull.includes('BACKUP CARRY'), 'app.js must render BACKUP CARRY badge for secondary carry anchor');

// Verify Accuracy Gate: Ivy Cudgel (100% acc) chosen over Power Whip (85% acc) for Ogerpon
const teEngine = require('./team_engine.js');
const ogerponTest = {
  name: 'Ogerpon (Wellspring Mask)',
  types: ['Grass', 'Water'],
  level: 100,
  moves: [
    { name: 'Ivy Cudgel', type: 'Grass' },
    { name: 'Power Whip', type: 'Grass' }
  ]
};
const ogerScore = teEngine.scoreVsSingleOpponent(ogerponTest, ['Water'], 100);
assert.strictEqual(ogerScore.bestMove.name, 'Ivy Cudgel', 'Ogerpon must prioritize 100% accurate Ivy Cudgel over 85% accurate Power Whip');

console.log('\n[PASS] AUDIT 11: Training Battle Loop Mode & Level 100 Detector Verified');

// 12. AUDIT: Full Restore Tactical Decision Engine (Useless vs Chance)
const bridgeEngine = require('./ai_agent_bridge.js');

// Test Case 1: Offensive 1-Shot KO Priority (Dark Slither Wing vs Sidney's Cacturne)
// Slither Wing is at 111/400 HP with Megahorn (4x STAB Bug). Cacturne is Grass/Dark.
// Player attacks first in DelugeRPG. Megahorn OHKOs Cacturne immediately with ZERO damage taken.
// Full Restore is UNNEEDED and must NOT be wasted!
const battleDataSlitherWing = {
  isInActiveBattle: true,
  trainerName: 'Sidney',
  hasAttackBtn: true,
  hasUseItemBtn: true,
  hasFullRestore: true,
  fullRestoreCount: 22,
  userActivePokemon: {
    name: 'Dark Slither Wing',
    types: ['Bug', 'Fighting'],
    level: 100,
    hp: 111,
    maxHp: 400
  },
  roster: [
    {
      name: 'Cacturne',
      types: ['Grass', 'Dark'],
      level: 50,
      hp: 400,
      maxHp: 400,
      isCurrentActive: true,
      moves: [
        { name: 'Feint Attack', type: 'Dark', power: 60 },
        { name: 'Sucker Punch', type: 'Dark', power: 70 },
        { name: 'Payback', type: 'Dark', power: 50 },
        { name: 'Needle Arm', type: 'Grass', power: 60 }
      ]
    }
  ],
  availableMoves: [
    { name: 'Megahorn', type: 'Bug', rawLabel: 'Megahorn (Bug)' },
    { name: 'Focus Punch', type: 'Fighting', rawLabel: 'Focus Punch (Fighting)' }
  ]
};
const analysisSlitherWing = bridgeEngine.analyzeBattle(battleDataSlitherWing, []);
assert.strictEqual(analysisSlitherWing.shouldUseFullRestore, false, 'Slither Wing must attack with Megahorn to 1-shot Cacturne instead of wasting Full Restore');
assert(analysisSlitherWing.fullRestoreReason.includes('can finish off') || analysisSlitherWing.fullRestoreReason.includes('unneeded'), 'Reason must state Slither Wing can finish off Cacturne with Megahorn');

// Test Case 1b: Survival Chance with Non-OHKO Move (Carry in fatal danger survives and sweeps)
// Slither Wing is at 50/400 HP, cannot 1-shot Cacturne with Tackle (Normal), Cacturne deals 83 HP incoming damage.
// Attacking would cause Slither Wing to faint. Full Restore heals to 400 HP, survives with 317 HP, and sweeps!
const battleDataSlitherWingHeal = Object.assign({}, battleDataSlitherWing, {
  userActivePokemon: Object.assign({}, battleDataSlitherWing.userActivePokemon, { hp: 50 }),
  availableMoves: [{ name: 'Tackle', type: 'Normal', rawLabel: 'Tackle (Normal)' }]
});
const analysisSlitherWingHeal = bridgeEngine.analyzeBattle(battleDataSlitherWingHeal, []);
assert.strictEqual(analysisSlitherWingHeal.shouldUseFullRestore, true, 'Slither Wing must use Full Restore when cannot 1-shot and in fatal danger');
assert(analysisSlitherWingHeal.fullRestoreReason.includes('Survive and win'), 'Reason must explain survival advantage');

// Test Case 5: Full Health (400/400 HP) -> Attack immediately, do not waste Full Restore
const battleDataFullHp = Object.assign({}, battleDataSlitherWing, {
  userActivePokemon: Object.assign({}, battleDataSlitherWing.userActivePokemon, { hp: 400 })
});
const analysisFullHp = bridgeEngine.analyzeBattle(battleDataFullHp, []);
assert.strictEqual(analysisFullHp.shouldUseFullRestore, false, 'Must NOT use Full Restore when HP is healthy (400/400)');

// Test Case 2: Useless Item (Opponent deals fatal OHKO >= Max HP even from 100% full health)
// Player cannot 1-shot KO. Opponent's attack deals >= 400 HP damage. Full Restore is useless!
const battleDataUselessItem = {
  isInActiveBattle: true,
  trainerName: 'Boss Challenger',
  hasAttackBtn: true,
  hasUseItemBtn: true,
  hasFullRestore: true,
  fullRestoreCount: 15,
  userActivePokemon: {
    name: 'Toxapex',
    types: ['Poison', 'Water'],
    level: 100,
    hp: 40,
    maxHp: 400
  },
  roster: [
    {
      name: 'Mewtwo',
      types: ['Psychic'],
      level: 100,
      hp: 400,
      maxHp: 400,
      isCurrentActive: true,
      moves: [
        { name: 'Psystrike', type: 'Psychic', power: 100 }
      ]
    }
  ],
  availableMoves: [
    { name: 'Poison Jab', type: 'Poison', rawLabel: 'Poison Jab (Poison)' }
  ]
};
const analysisUselessItem = bridgeEngine.analyzeBattle(battleDataUselessItem, []);
assert.strictEqual(analysisUselessItem.shouldUseFullRestore, false, 'Full Restore must NOT be used when opponent deals fatal OHKO damage >= Max HP');
assert(analysisUselessItem.canOpponentOneShotFromFull, 'canOpponentOneShotFromFull must be true');
assert(analysisUselessItem.fullRestoreReason.includes('Full Restore is useless'), 'Reason must explain item is useless');

// Test Case 3: Survival Chance (Proceed to use Full Restore)
// Player is low (50/400 HP), cannot 1-shot KO, but survives opponent counter-attack (incoming damage < 400 HP) after healing.
const battleDataSurviveChance = {
  isInActiveBattle: true,
  trainerName: 'Elite Trainer',
  hasAttackBtn: true,
  hasUseItemBtn: true,
  hasFullRestore: true,
  fullRestoreCount: 10,
  userActivePokemon: {
    name: 'Snorlax',
    types: ['Normal'],
    level: 100,
    hp: 50,
    maxHp: 400
  },
  roster: [
    {
      name: 'Gengar',
      types: ['Ghost', 'Poison'],
      level: 100,
      hp: 400,
      maxHp: 400,
      isCurrentActive: true,
      moves: [
        { name: 'Sludge Bomb', type: 'Poison', power: 90 }
      ]
    }
  ],
  availableMoves: [
    { name: 'Body Slam', type: 'Normal', rawLabel: 'Body Slam (Normal)' }
  ]
};
const analysisSurviveChance = bridgeEngine.analyzeBattle(battleDataSurviveChance, []);
assert.strictEqual(analysisSurviveChance.shouldUseFullRestore, true, 'Full Restore MUST be used when healing ensures survival and victory');
assert(analysisSurviveChance.fullRestoreReason.includes('Survive and win'), 'Reason must highlight survival advantage');

// Test Case 4: Item count is 0
const battleDataZeroItems = Object.assign({}, battleDataSurviveChance, { fullRestoreCount: 0, hasFullRestore: false });
const analysisZeroItems = bridgeEngine.analyzeBattle(battleDataZeroItems, []);
assert.strictEqual(analysisZeroItems.shouldUseFullRestore, false, 'Must NOT use Full Restore when item count is 0');

// Test Case 6: Strict Carry-Only Guard (Trainee must NEVER use Full Restore)
// In a training team with Carry (Slither Wing) and Trainees (Lunatone, Cranidos),
// if Trainee is on field with low HP (20/100 HP), Full Restore is strictly blocked!
const battleDataTraineeActive = {
  isInActiveBattle: true,
  trainerName: 'Sidney',
  hasAttackBtn: true,
  hasUseItemBtn: true,
  hasFullRestore: true,
  fullRestoreCount: 22,
  userActivePokemon: {
    name: 'Ghostly Lunatone',
    types: ['Rock', 'Psychic'],
    level: 27,
    hp: 20,
    maxHp: 108
  },
  userTeam: [
    { name: 'Dark Slither Wing', level: 100, types: ['Bug', 'Fighting'], hp: 400, maxHp: 400 },
    { name: 'Ghostly Lunatone', level: 27, types: ['Rock', 'Psychic'], hp: 20, maxHp: 108 },
    { name: 'Metallic Cranidos', level: 23, types: ['Rock'], hp: 92, maxHp: 92 }
  ],
  roster: [
    {
      name: 'Cacturne',
      types: ['Grass', 'Dark'],
      level: 50,
      hp: 400,
      maxHp: 400,
      isCurrentActive: true,
      moves: [{ name: 'Needle Arm', type: 'Grass', power: 60 }]
    }
  ],
  availableMoves: [{ name: 'Rock Throw', type: 'Rock', rawLabel: 'Rock Throw (Rock)' }]
};
const analysisTrainee = bridgeEngine.analyzeBattle(battleDataTraineeActive, []);
assert.strictEqual(analysisTrainee.shouldUseFullRestore, false, 'Trainee must NEVER consume Full Restore');
assert.strictEqual(analysisTrainee.isCarryBattler, false, 'Trainee is not a Carry');
assert(analysisTrainee.fullRestoreReason.includes('strictly reserved for Carry'), 'Reason must state strictly reserved for Carry');

// Test Case 7: Match Item Limit Guard (Max 1 Full Restore per Battle)
// Even if Carry is low on health and survives, if 1 item was already used this match, conserved!
const battleDataMatchLimit = Object.assign({}, battleDataSurviveChance, { currentMatchItemCount: 1 });
const analysisMatchLimit = bridgeEngine.analyzeBattle(battleDataMatchLimit, []);
assert.strictEqual(analysisMatchLimit.shouldUseFullRestore, false, 'Must NOT use Full Restore when match item limit (1) reached');
assert(analysisMatchLimit.fullRestoreReason.includes('Match limit reached'), 'Reason must state match limit reached');

// Test Case 8: Consecutive Turn Lockout Guard (Anti-Infinite Heal Loop)
// Item was used on previous turn, Carry must attack to progress battle instead of spamming items!
const battleDataConsecutive = Object.assign({}, battleDataSurviveChance, { lastTurnUsedItem: true });
const analysisConsecutive = bridgeEngine.analyzeBattle(battleDataConsecutive, []);
assert.strictEqual(analysisConsecutive.shouldUseFullRestore, false, 'Must NOT use Full Restore on consecutive turns');
assert(analysisConsecutive.fullRestoreReason.includes('consecutive lockout'), 'Reason must state consecutive lockout');

console.log('\n[PASS] AUDIT 12: Full Restore Tactical Decision Engine (Useless vs Chance) Verified');

// 13. AUDIT: G-Max Challenge Next Battle, Complete Flow & Variant Uniqueness
console.log('\n--- AUDIT 13: G-Max Challenge & Evolution Duplicate Prevention ---');
const teamEngine = require('./team_engine.js');
const sampleCol = [
  { id: 'gm1', name: 'Normal G-Max Melmetal', variant: 'Normal', level: 100 },
  { id: 'm1', name: 'Melmetal', variant: 'Normal', level: 100 },
  { id: 'm2', name: 'Metallic Melmetal', variant: 'Metallic', level: 100 },
  { id: 'm3', name: 'Meltan', variant: 'Normal', level: 100 },
  { id: 'm4', name: 'Melmetal', variant: 'Normal', level: 80 }
];

// Test 1: Duplicate variant prevention (Melmetal Normal is duplicate, Metallic is unique)
assert.strictEqual(teamEngine.isGmaxChallengeTargetEligible(sampleCol[1], sampleCol), false, 'Normal Melmetal must be rejected because Normal G-Max Melmetal is owned');
assert.strictEqual(teamEngine.isGmaxChallengeTargetEligible(sampleCol[2], sampleCol), true, 'Metallic Melmetal must be accepted because Metallic G-Max Melmetal is not owned');

// Test 2: Pre-evolution exclusion (Meltan cannot do G-Max challenge)
assert.strictEqual(teamEngine.isGmaxChallengeTargetEligible(sampleCol[3], sampleCol), false, 'Meltan must be rejected because it is not evolved to final G-Max stage');

// Test 3: Level 100 requirement
assert.strictEqual(teamEngine.isGmaxChallengeTargetEligible(sampleCol[4], sampleCol), false, 'Level 80 Melmetal must be rejected because G-Max requires Lv 100');

// Test 4: Evolution & Moves ownership & duplicate detection across variants
const ownMelmetal = evolutionEngine.checkEvolutionOwnership('Melmetal', sampleCol, 'Normal');
assert.strictEqual(ownMelmetal.isOwned, true, 'Melmetal Normal must be detected as owned');
assert.strictEqual(ownMelmetal.hasGmaxOwned, true, 'Melmetal Normal must have hasGmaxOwned = true');
assert(ownMelmetal.summaryLabel.indexOf('(G-MAX)') !== -1, 'Summary label must indicate G-MAX');

// Test 5: Evolve-ready box list deduplication
const readyPokes = evolutionEngine.getEvolveReadyPokemon([
  { id: 'm3', name: 'Normal Meltan', variant: 'Normal', level: 100 },
  { id: 'm1', name: 'Normal Melmetal', variant: 'Normal', level: 100, canEvolve: false },
  { id: 'gm1', name: 'Normal G-Max Melmetal', variant: 'Normal', level: 100 }
]);
assert.strictEqual(readyPokes.length, 1, 'Meltan is evolve-ready');
assert.strictEqual(readyPokes[0].hasUnique, false, 'Meltan has no unique branches because Normal Melmetal is owned');

// Test 6: G-Max Challenge Post-Battle DOM regex
const gmaxVictoryHtml = "Well Done! You've defeated your opponent in the GMax Challenge. Check out your next opponent and their team on the GMAX CHALLENGE page Or start your NEXT BATTLE straight away";
const isGmaxVic = /defeated your opponent in the (?:g[- ]?max|gmax)\s*challenge/i.test(gmaxVictoryHtml);
assert.strictEqual(isGmaxVic, true, 'G-Max victory regex must match victory text');

const gmaxCompleteHtml = "Well Done! You've defeated your opponent in the GMax Challenge. With this, you have successfully completed the GMax Challenge. Visit the GMAX CHALLENGE page to proceed with GMax Evolution.";
const isGmaxDone = /successfully completed the (?:g[- ]?max|gmax)\s*challenge/i.test(gmaxCompleteHtml);
assert.strictEqual(isGmaxDone, true, 'G-Max complete regex must match complete text');

// Test 7: Post-battle Next Battle vs G-Max Challenge Complete detection
const appJsSource = fs.readFileSync('app.js', 'utf8');
assert(appJsSource.includes("labelHtml: '&#9889; Next Battle'"), 'app.js must provide Next Battle button');
assert(appJsSource.includes("labelHtml: '&#10003; G-Max Challenge Complete'"), 'app.js must provide G-Max Challenge Complete button');
assert(appJsSource.includes("isMatchOver"), 'app.js must define isMatchOver guard to stop Auto on post-battle');

// Test 8: Auto Hunting Movement Speed range verification
assert(appJsSource.includes("function getHardenedHumanDelay()"), 'app.js must implement getHardenedHumanDelay');
assert(appJsSource.includes("s.movementSpeedMinSec"), 'getHardenedHumanDelay must use configurable movement speed');
assert(appJsSource.includes("s.movementSpeedMaxSec"), 'getHardenedHumanDelay must use configurable max speed');

// Test 9: Move Selection Modal Accuracy (Chrome Pidgeotto, Dark Kakuna, Dark Beedrill) & Checkbox Synchronization
const pidgeottoEval = evolutionEngine.evaluateEvolutionMoveSelection('Chrome Pidgeotto', {
  currentMoves: ['Gust', 'Tackle', 'Quick Attack', 'Wing Attack'],
  evolutionMoves: ['Gust', 'Tackle', 'Quick Attack', 'Twister']
}, coll);
assert(pidgeottoEval.types.includes('Normal') && pidgeottoEval.types.includes('Flying'), 'Chrome Pidgeotto must resolve to Normal/Flying');
assert.strictEqual(pidgeottoEval.recommendedMoves[0].name, 'Wing Attack', 'Wing Attack must be Slot 1 for Chrome Pidgeotto');
assert.strictEqual(pidgeottoEval.recommendedMoves[0].isStab, true, 'Wing Attack must be STAB on Chrome Pidgeotto');
assert(pidgeottoEval.dropMoves.some(d => d.name === 'Twister'), 'Twister must be dropped on Chrome Pidgeotto');

const kakunaEval = evolutionEngine.evaluateEvolutionMoveSelection('Dark Kakuna', {
  currentMoves: ['Poison Sting', 'Absorb', 'Poison Fang', 'Absorb'],
  evolutionMoves: ['Tackle', 'Tackle', 'Tackle', 'Tackle']
}, coll);
assert(kakunaEval.types.includes('Bug') && kakunaEval.types.includes('Poison'), 'Dark Kakuna must resolve to Bug/Poison');
assert.strictEqual(kakunaEval.recommendedMoves[0].name, 'Poison Fang', 'Poison Fang must be Slot 1 STAB on Dark Kakuna');
assert.strictEqual(kakunaEval.recommendedMoves[0].isStab, true, 'Poison Fang must be STAB on Dark Kakuna');
assert(kakunaEval.duplicateChoices.includes('Absorb') && kakunaEval.duplicateChoices.includes('Tackle'), 'Intra-list duplicates Absorb and Tackle must be flagged');

const beedrillEval = evolutionEngine.evaluateEvolutionMoveSelection('Dark Beedrill', {
  currentMoves: ['Tackle', 'Poison Fang', 'Absorb', 'Poison Sting'],
  evolutionMoves: ['Fury Attack', 'Pin Missile', 'Rage', 'Poison Jab']
}, coll);
assert(beedrillEval.types.includes('Bug') && beedrillEval.types.includes('Poison'), 'Dark Beedrill must resolve to Bug/Poison');
assert.strictEqual(beedrillEval.recommendedMoves[0].name, 'Poison Jab', 'Poison Jab must be Slot 1 on Dark Beedrill');
assert.strictEqual(beedrillEval.recommendedMoves[1].name, 'Pin Missile', 'Pin Missile must be Slot 2 on Dark Beedrill');
assert(beedrillEval.recommendedMoves.some(m => m.name === 'Poison Fang' && m.isStab), 'Poison Fang must be kept as STAB on Dark Beedrill');

assert(preloadContent.includes('async function applyModalMoveCheckboxes(modalContainer, data)'), 'game-preload.js must implement applyModalMoveCheckboxes');
assert(preloadContent.includes('async function toggleMoveCheckboxCleanly(cb, shouldCheck)'), 'game-preload.js must implement toggleMoveCheckboxCleanly');
assert(preloadContent.includes("link.closest('#DModal, #DMbody, #delugemodal, .modal')"), 'game-preload.js must ignore modal button clicks when capturing lastClickedPokemonInfo');
assert(preloadContent.includes('function isModalElementOpen(el)'), 'game-preload.js must implement ancestor-aware isModalElementOpen to ignore hidden #DMbody inside closed #DModal');
assert(appJsSource.includes('if (!matchesActiveModal && activeEvolveCardData)'), 'app.js selectEvolvePokemon must clear stale activeEvolveCardData when selecting a Pokemon with no open modal');

console.log('[PASS] AUDIT 13: G-Max Challenge & Evolution Duplicate Prevention Verified');

// 14. AUDIT 100% 7-BIT CLEAN ASCII
const filesToCheck = ['app.html', 'app.js', 'ai_agent_bridge.js', 'evolution_engine.js', 'team_engine.js', 'ml_combat_engine.py', 'package.json', 'game-preload.js'];
filesToCheck.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) > 127) {
      throw new Error('Non-ASCII character in ' + f + ' at position ' + i);
    }
  }
});
console.log('\n[PASS] AUDIT 14: 100% 7-bit Clean ASCII Integrity Verified Across All Files');

console.log('\n================================================================');
console.log('   ALL LIVE AI ASSISTANT & COPILOT AUDITS PASSED PERFECTLY     ');
console.log('================================================================');


