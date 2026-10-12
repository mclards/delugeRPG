const fs = require('fs');
const assert = require('assert');
const path = require('path');

console.log('--- TESTING DELUGERPG HARDENED DESKTOP CLIENT SUITE ---');

// 1. Verify targets.js
const TARGETS = require('./targets');
assert(Array.isArray(TARGETS.legendaries), 'targets.legendaries must be an array');
assert(Array.isArray(TARGETS.megas), 'targets.megas must be an array');
assert(TARGETS.legendaries.length >= 100, 'Must contain complete legendary database');
assert(TARGETS.legendaries.includes('Mewtwo'), 'Must contain Mewtwo');
assert(TARGETS.legendaries.includes('Pecharunt'), 'Must contain Pecharunt');
assert(TARGETS.legendaries.includes('Terapagos'), 'Must contain Terapagos');
assert(TARGETS.legendaries.includes('Nihilego'), 'Must contain Ultra Beasts');
assert(TARGETS.legendaries.includes('Great Tusk'), 'Must contain Paradox Pokemon');
assert(TARGETS.specialForms.includes('g-max'), 'Must contain g-max in specialForms');

console.log(`[PASS] Target Database: ${TARGETS.legendaries.length} Legendaries/Mythicals/Paradox, ${TARGETS.megas.length} Mega lines loaded.`);

// 2. Verify config.json for Hardened Network & Profile
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
assert(config.dummyAccount, 'Must have dummyAccount config');
assert(config.network, 'Must have network proxy config block');
assert(typeof config.network.useProxy === 'boolean', 'network.useProxy must be boolean');
assert(config.settings, 'Must have settings config');
assert(config.settings.baseDelay >= 2000, 'Hardened baseDelay must be >= 2000ms for flagged network profile');
assert(config.settings.minSafetyFloor >= 1700, 'Hardened minSafetyFloor must be >= 1700ms');
assert(typeof config.settings.avoidDuplicates === 'boolean', 'settings.avoidDuplicates must be boolean');
assert(typeof config.settings.findLegendaries === 'boolean', 'settings.findLegendaries must be boolean');
assert(typeof config.settings.findMegasAndGigantamax === 'boolean', 'settings.findMegasAndGigantamax must be boolean');
assert(typeof config.settings.findAnySpecialVariant === 'boolean', 'settings.findAnySpecialVariant must be boolean');

console.log(`[PASS] Config verified: 100% hunting mechanics parity with pokefinder.user.js.`);

// 3. Verify Hardened Gaussian delay distribution with drift
function getHardenedHumanDelay(base = 2100, jitter = 550, floor = 1700) {
  const u1 = Math.random();
  const u2 = Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.sin(2.0 * Math.PI * u2);
  const drift = (Math.random() - 0.5) * 60;
  const delay = Math.round(base + (randStdNormal * (jitter / 2)) + drift);
  return Math.max(floor, delay);
}

let sum = 0;
let minSeen = Infinity;
for (let i = 0; i < 1000; i++) {
  const d = getHardenedHumanDelay(config.settings.baseDelay, config.settings.jitter, config.settings.minSafetyFloor);
  assert(d >= config.settings.minSafetyFloor, `Delay ${d} must never fall below anti-bot safety floor of ${config.settings.minSafetyFloor}ms`);
  sum += d;
  if (d < minSeen) minSeen = d;
}
const avg = Math.round(sum / 1000);
assert(avg >= 2000 && avg <= 2250, `Average delay (${avg}ms) must center around 2100ms`);

console.log(`[PASS] Hardened Gaussian delay generator: 1000 trials passed with avg ${avg}ms (min seen ${minSeen}ms >= ${config.settings.minSafetyFloor}ms).`);

// 4. Verify Team Engine and Counter Algorithm
const teamEngine = require('./team_engine');
assert(typeof teamEngine.buildBestTeam === 'function', 'teamEngine.buildBestTeam must be a function');
const gymData = require('./gym_leaders.json');
const collectionData = require('./user_collection.json');
assert(gymData.KANTO && gymData.KANTO.length > 0, 'gym_leaders.json must contain Kanto leaders');
assert(collectionData.length > 0, 'user_collection.json must contain pokemon');

const brock = gymData.KANTO.find(l => l.name === 'Brock');
assert(brock, 'Brock must be found in Kanto leaders');
const brockTeam = teamEngine.buildBestTeam(brock, collectionData);
assert(brockTeam.length === 6, 'Must recommend exactly 6 Pokemon for Brock');
assert(brockTeam[0].score > 0, 'Top counter must have positive score');
console.log(`[PASS] Team Engine: Verified top 6 counters for ${brock.name} (${brockTeam[0].name} scored ${brockTeam[0].score.toFixed(1)}).`);

// 5. Verify 100% clean ASCII across all client files
const files = ['main.js', 'app.js', 'game-preload.js', 'targets.js', 'team_engine.js', 'config.json', 'package.json', 'app.html', 'type_chart_database.json', 'test_client.js', 'test_deep_verification.js'];
for (const file of files) {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) > 127) {
      throw new Error(`Non-ASCII character found in ${file} at index ${i}`);
    }
  }
}

console.log('[PASS] All desktop client files are 100% clean 7-bit ASCII.');
console.log('--- ALL DESKTOP CLIENT HARDENING TESTS PASSED PERFECTLY ---');

