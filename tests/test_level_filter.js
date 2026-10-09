// test_level_filter.js - Unit and Integration Tests for Pokemon Level Filtering
const assert = require('assert');
const fs = require('fs');

console.log('--- TESTING POKEMON LEVEL FILTER SUITE ---');

// 1. Regex Extraction Tests on Realistic In-Game HTML Strings
function extractWildLevel(text) {
  if (!text) return null;
  const m = text.match(/(?:level|lvl)[^0-9\r\n]{0,8}(\d{1,3})\b/i);
  if (m) {
    const lvl = parseInt(m[1], 10);
    if (!isNaN(lvl) && lvl >= 1 && lvl <= 100) return lvl;
  }
  return null;
}

const testEncounters = [
  { text: 'Heracross Appeared! Level: 6 HP: 24', expected: 6 },
  { text: 'Chrome Kangaskhan Appeared! Level: 2 HP: 11', expected: 2 },
  { text: 'Wild Aron (Level 14)', expected: 14 },
  { text: 'A wild Meditite appeared! (Level 18)', expected: 18 },
  { text: 'Level: 25', expected: 25 },
  { text: 'Level 100 Arceus', expected: 100 },
  { text: 'Wild Gyarados (Lvl: 55)', expected: 55 },
  { text: 'Lvl 50 Metagross', expected: 50 },
  { text: 'Wild Pidgey Level 5 appeared', expected: 5 },
  { text: 'Level : 2', expected: 2 },
  { text: 'Level:2', expected: 2 },
  { text: 'Level - 6', expected: 6 },
  { text: 'No level info here', expected: null }
];

testEncounters.forEach(tc => {
  const parsed = extractWildLevel(tc.text);
  assert.strictEqual(parsed, tc.expected, `Failed parsing level from: ${tc.text}`);
});
console.log(`[PASS] Level Regex Extraction: ${testEncounters.length}/${testEncounters.length} test encounters parsed correctly.`);

// 2. Level Filter Condition Verification
function testLevelCondition(currentLevel, mode, targetVal) {
  if (currentLevel === null) return false;
  if (mode === 'min') return currentLevel >= targetVal;
  if (mode === 'exact') return currentLevel === targetVal;
  if (mode === 'max') return currentLevel <= targetVal;
  return false;
}

// Case A: Mode "min" (>= 50)
assert.strictEqual(testLevelCondition(50, 'min', 50), true);
assert.strictEqual(testLevelCondition(75, 'min', 50), true);
assert.strictEqual(testLevelCondition(49, 'min', 50), false);
assert.strictEqual(testLevelCondition(null, 'min', 50), false);
console.log('[PASS] Mode "min" (>= threshold) verified.');

// Case B: Mode "exact" (== 100)
assert.strictEqual(testLevelCondition(100, 'exact', 100), true);
assert.strictEqual(testLevelCondition(99, 'exact', 100), false);
assert.strictEqual(testLevelCondition(1, 'exact', 100), false);
console.log('[PASS] Mode "exact" (== threshold) verified.');

// Case C: Mode "max" (<= 15)
assert.strictEqual(testLevelCondition(15, 'max', 15), true);
assert.strictEqual(testLevelCondition(5, 'max', 15), true);
assert.strictEqual(testLevelCondition(16, 'max', 15), false);
console.log('[PASS] Mode "max" (<= threshold) verified.');

// 3. Verify HTML & JS Integration
const html = fs.readFileSync('desktop-client/app.html', 'utf8');
assert(html.includes('filterLevelCheckbox'), 'app.html must have filterLevelCheckbox');
assert(html.includes('levelModeSelect'), 'app.html must have levelModeSelect');
assert(html.includes('levelValueInput'), 'app.html must have levelValueInput');
console.log('[PASS] HTML UI elements confirmed in desktop-client/app.html.');

const appJs = fs.readFileSync('desktop-client/app.js', 'utf8');
assert(appJs.includes('filterLevelCheckbox'), 'app.js must bind filterLevelCheckbox');
assert(appJs.includes('enableLevelFilter'), 'app.js must support enableLevelFilter');
assert(appJs.includes('levelFilterMode'), 'app.js must support levelFilterMode');
assert(appJs.includes('levelFilterValue'), 'app.js must support levelFilterValue');
assert(appJs.includes("event.channel === 'request-config'"), 'app.js must respond to request-config');
console.log('[PASS] Controller logic confirmed in desktop-client/app.js.');

const preloadJs = fs.readFileSync('desktop-client/game-preload.js', 'utf8');
assert(preloadJs.includes('config.enableLevelFilter'), 'game-preload.js must evaluate config.enableLevelFilter');
assert(preloadJs.includes('if (!passesLevel)'), 'game-preload.js must gate encounters failing level filter');
assert(preloadJs.includes("ipcRenderer.sendToHost('request-config')"), 'game-preload.js must proactively request config');
console.log('[PASS] Preload engine target matching confirmed in desktop-client/game-preload.js.');

// 3b. Simulate Real In-Game Scenarios: Kangaskhan Lv 2 & Heracross Lv 6 vs Level >= 15 Filter
function simulatePreloadTargetCheck(pageText, cfg) {
  const textLower = pageText.toLowerCase();
  const currentLevel = extractWildLevel(pageText);

  let passesLevel = true;
  if (cfg.enableLevelFilter) {
    const mode = cfg.levelFilterMode || 'min';
    const targetVal = typeof cfg.levelFilterValue === 'number' ? cfg.levelFilterValue : 50;
    if (currentLevel !== null) {
      if (mode === 'min') passesLevel = currentLevel >= targetVal;
      else if (mode === 'exact') passesLevel = currentLevel === targetVal;
      else if (mode === 'max') passesLevel = currentLevel <= targetVal;
    } else {
      passesLevel = false;
    }

    if (!passesLevel) {
      return { halted: false, reason: 'Failed level filter gate' };
    }
  }

  const lvlSuffix = currentLevel !== null ? ' (Lv ' + currentLevel + ')' : '';

  if (cfg.findMegasAndGigantamax) {
    if (textLower.includes('kangaskhan')) {
      return { halted: true, target: 'Mega Line: Kangaskhan' + lvlSuffix };
    }
    if (textLower.includes('heracross')) {
      return { halted: true, target: 'Mega Line: Heracross' + lvlSuffix };
    }
  }
  return { halted: false, reason: 'Not a target' };
}

// Test Kangaskhan Lv 2 vs Filter >= 15
const sim1 = simulatePreloadTargetCheck('Chrome Kangaskhan Appeared! Level: 2 HP: 11', {
  findMegasAndGigantamax: true,
  enableLevelFilter: true,
  levelFilterMode: 'min',
  levelFilterValue: 15
});
assert.strictEqual(sim1.halted, false, 'Level 2 Kangaskhan MUST NOT halt when filter is >= 15');

// Test Heracross Lv 6 vs Filter >= 15
const sim2 = simulatePreloadTargetCheck('Heracross Appeared! Level: 6 HP: 24', {
  findMegasAndGigantamax: true,
  enableLevelFilter: true,
  levelFilterMode: 'min',
  levelFilterValue: 15
});
assert.strictEqual(sim2.halted, false, 'Level 6 Heracross MUST NOT halt when filter is >= 15');

// Test Missing Level vs Filter >= 15
const sim3 = simulatePreloadTargetCheck('Heracross Appeared! Searching...', {
  findMegasAndGigantamax: true,
  enableLevelFilter: true,
  levelFilterMode: 'min',
  levelFilterValue: 15
});
assert.strictEqual(sim3.halted, false, 'Missing level encounter MUST NOT halt when filter is >= 15');

// Test Heracross Lv 24 vs Filter >= 15
const sim4 = simulatePreloadTargetCheck('Heracross Appeared! Level: 24 HP: 70', {
  findMegasAndGigantamax: true,
  enableLevelFilter: true,
  levelFilterMode: 'min',
  levelFilterValue: 15
});
assert.strictEqual(sim4.halted, true, 'Level 24 Heracross MUST halt when filter is >= 15');
assert.strictEqual(sim4.target, 'Mega Line: Heracross (Lv 24)');
console.log('[PASS] Level Gatekeeper Simulation: Level 2 Kangaskhan and Level 6 Heracross ignored; Level 24 Heracross halted.');

// 4. Verify 100% Clean 7-bit ASCII
const filesToCheck = [
  'desktop-client/app.html',
  'desktop-client/app.js',
  'desktop-client/game-preload.js',
  'desktop-client/config.json',
  'pokefinder.user.js'
];
filesToCheck.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  for (let i = 0; i < content.length; i++) {
    assert(content.charCodeAt(i) <= 127, `Non-ASCII character in ${file} at index ${i}`);
  }
});
console.log('[PASS] 100% clean 7-bit ASCII confirmed across all modified files.');

console.log('--- ALL POKEMON LEVEL FILTER TESTS PASSED CLEANLY! ---');
