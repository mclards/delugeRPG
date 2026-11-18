// test_carry_hardening.js
// Exhaustive Hardening Audit for Carry Anchor Selection, STAB Prioritization & Anti-Locking Engine
// Strictly 100% 7-bit clean ASCII

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const teamEngine = require('./team_engine.js');

console.log('================================================================');
console.log('       DELUGERPG CARRY HARDENING & STAB ACCURACY AUDIT         ');
console.log('================================================================\n');

const gymData = JSON.parse(fs.readFileSync(path.join(__dirname, 'gym_leaders.json'), 'utf8'));
const userCollection = JSON.parse(fs.readFileSync(path.join(__dirname, 'user_collection.json'), 'utf8'));

// 1. Locate Veteran Shareef in gym_leaders.json
let shareef = null;
for (const cat of Object.keys(gymData)) {
  for (const t of gymData[cat]) {
    if (t.name.includes('Shareef')) shareef = t;
  }
}

assert(shareef, 'FAIL: Veteran Shareef not found in gym_leaders.json');
console.log('[PASS] AUDIT 1: Veteran Shareef Profile Verified');
console.log('  Name:     ' + shareef.name);
console.log('  Types:    ' + JSON.stringify(shareef.types));
console.log('  AvgLevel: ' + shareef.avgLevel);
console.log('  Roster:   ' + (shareef.roster ? (shareef.roster.length + ' Pokemon') : 'Unscouted (None)'));

// 2. Test Live Roster Carry Ranking
const poolLvl100s = userCollection.filter(p => p.level === 100);
const liveShareefRoster = {
  name: 'Veteran Shareef',
  tier: 'STRONG',
  npcId: '5128',
  avgLevel: 84,
  types: ['Mixed'],
  roster: [
    { name: 'Leafeon', types: ['Grass'], level: 80 },
    { name: 'Gigalith', types: ['Rock'], level: 85 },
    { name: 'Toxicroak', types: ['Poison', 'Fighting'], level: 82 },
    { name: 'Magmortar', types: ['Fire'], level: 85 },
    { name: 'Hydreigon', types: ['Dark', 'Dragon'], level: 86 }
  ]
};

const rankedLive = teamEngine.rankCarries(poolLvl100s, liveShareefRoster);
assert(rankedLive.length > 0, 'Must rank carries for live Shareef roster');

const topCarry = rankedLive[0];
const topGuidance = teamEngine.getCarryMoveGuidance(topCarry.poke, liveShareefRoster);
console.log('\n[PASS] AUDIT 2: Live Shareef Roster Top Carry Verified');
console.log('  Top Carry:     ' + topCarry.poke.name);
console.log('  Score:         ' + Math.round(topCarry.carryScore));
console.log('  Move Guidance: ' + topGuidance);

// Verify Chrome Landorus with Outrage is NOT chosen as top carry
assert(!topCarry.poke.name.includes('Landorus'), 'Chrome Landorus must not be chosen as top carry for Shareef');
assert(!topGuidance.toLowerCase().includes('outrage'), 'Outrage must not be primary recommended move for Shareef');

// 3. Test Mixed / Unknown Trainer Defense Guard
const unscoutedMixedTrainer = {
  name: 'Unknown Mixed Veteran',
  tier: 'STRONG',
  avgLevel: 85,
  types: ['Mixed']
};

const landorus = userCollection.find(p => p.name.includes('Chrome Landorus'));
assert(landorus, 'Chrome Landorus must exist in collection');

// Landorus has a 4.0x quad weakness to Ice, so it cannot solo an unpredictable mixed roster
const canLandorusSoloMixed = teamEngine.canSoloTrainer(landorus, unscoutedMixedTrainer);
assert.strictEqual(canLandorusSoloMixed, false, 'Landorus must NOT be allowed to solo an unpredictable Mixed trainer due to 4x Ice quad weakness');

const rankedMixed = teamEngine.rankCarries(poolLvl100s, unscoutedMixedTrainer);
assert(rankedMixed.length > 0, 'Must rank carries for Mixed trainer');
assert(!rankedMixed[0].poke.name.includes('Landorus'), 'Landorus must not be top carry for Mixed trainer');
assert(rankedMixed[0].exposure.worst < 4.0, 'Top carry for Mixed trainer must have no 4x quad weaknesses');
console.log('\n[PASS] AUDIT 3: Mixed / Unknown Trainer Defense Guard Verified');
console.log('  Landorus Solo Guard:   Blocked (Vulnerable to 4x Ice)');
console.log('  Top Mixed Carry:       ' + rankedMixed[0].poke.name);
console.log('  Top Mixed Worst Exp:   ' + rankedMixed[0].exposure.worst + 'x (< 4.0x)');

// 4. Test Move Reliability & STAB Consistency
const testDefender = ['Normal'];
const pokeWithMixedMoves = {
  name: 'Test Attacker',
  types: ['Fighting'],
  variant: 'Normal',
  moves: [
    { name: 'Outrage', type: 'Dragon', power: 140 },
    { name: 'Hyper Beam', type: 'Normal', power: 150 },
    { name: 'Fissure', type: 'Ground', power: 100 },
    { name: 'Brick Break', type: 'Fighting', power: 75 }
  ]
};

const scoreResult = teamEngine.scoreVsSingleOpponent(pokeWithMixedMoves, testDefender);
assert.strictEqual(scoreResult.bestMove.name, 'Brick Break', 'STAB move (Brick Break) must beat non-STAB Outrage, recharge Hyper Beam, and OHKO Fissure');
console.log('\n[PASS] AUDIT 4: STAB Consistency & Move Trait Penalization Verified');
console.log('  Selected Move: ' + scoreResult.bestMove.name + ' (' + scoreResult.bestMove.type + ') [Power: ' + scoreResult.bestMove.power + ']');
console.log('  STAB Status:   ' + (scoreResult.bestMove.isStab ? 'STAB Boosted' : 'Non-STAB'));

// 5. Negative Glass-Cannon Solo Guard & Lv 100 Roster Sweep Integrity
const acerolaLv100Roster = {
  name: 'Acerola',
  tier: 'VIP',
  npcId: 753,
  avgLevel: 56,
  types: ['Ghost'],
  roster: [
    { name: 'Banette', types: ['Ghost'], level: 100, moves: [{ name: 'Sucker Punch', type: 'Dark', power: 80 }, { name: 'Shadow Ball', type: 'Ghost', power: 80 }] },
    { name: 'Drifblim', types: ['Ghost', 'Flying'], level: 100, moves: [{ name: 'Ominous Wind', type: 'Ghost', power: 60 }, { name: 'Gust', type: 'Flying', power: 40 }] },
    { name: 'Dhelmise', types: ['Ghost', 'Grass'], level: 100, moves: [{ name: 'Power Whip', type: 'Grass', power: 120 }] },
    { name: 'Froslass', types: ['Ice', 'Ghost'], level: 100, moves: [{ name: 'Blizzard', type: 'Ice', power: 120 }, { name: 'Wake-up Slap', type: 'Fighting', power: 60 }] },
    { name: 'Palossand', types: ['Ghost', 'Ground'], level: 100, moves: [{ name: 'Sand Tomb', type: 'Ground', power: 55 }] }
  ]
};
const negMegaPinsir = {
  id: 'neg_pinsir',
  name: 'Negative Mega Pinsir',
  variant: 'Negative',
  level: 100,
  types: ['Bug', 'Flying'],
  moves: [
    { name: 'Storm Throw', type: 'Fighting' },
    { name: 'X-scissor', type: 'Bug' },
    { name: 'Super Fang', type: 'Normal' },
    { name: 'Guillotine', type: 'Normal' }
  ]
};
const darkMegaSableye = {
  id: 'dark_sableye',
  name: 'Dark Mega Sableye',
  variant: 'Dark',
  level: 100,
  types: ['Dark', 'Ghost'],
  moves: [
    { name: 'Hyperspace Fury', type: 'Dark' },
    { name: 'Astral Barrage', type: 'Ghost' },
    { name: 'Gigaton Hammer', type: 'Steel' },
    { name: 'Earthquake', type: 'Ground' }
  ]
};
assert.strictEqual(
  teamEngine.canSoloTrainer(negMegaPinsir, acerolaLv100Roster),
  false,
  'Negative Mega Pinsir with 4x inverse Grass/Fighting weaknesses must NOT be allowed to solo Lv 100 Ghost/coverage roster'
);
assert.strictEqual(
  teamEngine.canSoloTrainer(darkMegaSableye, acerolaLv100Roster),
  true,
  'Dark Mega Sableye must pass canSoloTrainer against Lv 100 Ghost roster'
);
const carryCompare = teamEngine.rankCarries([negMegaPinsir, darkMegaSableye], acerolaLv100Roster);
assert.strictEqual(
  carryCompare[0].poke.name,
  'Dark Mega Sableye',
  'Clean Dark Mega Sableye sweeper must beat brittle Negative Mega Pinsir'
);
console.log('\n[PASS] AUDIT 5: Fragile Negative Carry Guard & Safe Sweeper Selection Verified');

console.log('\n================================================================');
console.log('   ALL CARRY HARDENING & STAB ACCURACY AUDITS PASSED PERFECTLY  ');
console.log('================================================================\n');

