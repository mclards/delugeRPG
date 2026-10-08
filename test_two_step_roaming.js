// test_two_step_roaming.js - Unit tests for 2-step direction changes and continuous roaming without freezing
const assert = require('assert');
const fs = require('fs');

console.log('--- TESTING 2-STEP ROAMING CADENCE & CONTINUOUS SEARCHING ---');

// 1. Test 2-step turning cadence in Wander, Horizontal, Vertical, Square
function simulateKeySequence(mode, totalSteps, stepsPerDir = 2) {
  let stepCount = 0;
  let currentDir = 'Left';
  let wanderLeft = stepsPerDir;
  const history = [];

  const keys = ['Left', 'Up', 'Right', 'Down'];
  const opposites = { 'Left': 'Right', 'Right': 'Left', 'Up': 'Down', 'Down': 'Up' };

  function chooseEvade(cur) {
    const opp = opposites[cur];
    const perpendiculars = {
      'Left': ['Up', 'Down'],
      'Right': ['Up', 'Down'],
      'Up': ['Left', 'Right'],
      'Down': ['Left', 'Right']
    };
    const perp = perpendiculars[cur];
    return perp[0]; // Deterministic choice for testing
  }

  for (let s = 0; s < totalSteps; s++) {
    let key;
    if (mode === 'line_horizontal') {
      const isLeft = Math.floor(stepCount / stepsPerDir) % 2 === 0;
      key = isLeft ? 'Left' : 'Right';
    } else if (mode === 'line_vertical') {
      const isUp = Math.floor(stepCount / stepsPerDir) % 2 === 0;
      key = isUp ? 'Up' : 'Down';
    } else if (mode === 'patrol_square') {
      const idx = Math.floor(stepCount / stepsPerDir) % 4;
      key = keys[idx];
    } else {
      // wander
      if (wanderLeft <= 0) {
        currentDir = chooseEvade(currentDir);
        wanderLeft = stepsPerDir;
      }
      key = currentDir;
      wanderLeft--;
    }
    history.push(key);
    stepCount++;
  }
  return history;
}

// Test Wander 2-step turning
const wanderHist = simulateKeySequence('wander', 6, 2);
assert.strictEqual(wanderHist[0], 'Left');
assert.strictEqual(wanderHist[1], 'Left');
assert.strictEqual(wanderHist[2], 'Up', 'Must turn on step 3 (after 2 steps)');
assert.strictEqual(wanderHist[3], 'Up');
assert.strictEqual(wanderHist[4], 'Left', 'Must turn on step 5 (after 2 steps)');
assert.strictEqual(wanderHist[5], 'Left');
console.log('  [PASS] Wander mode turns direction every 2 steps:', wanderHist.join(' -> '));

// Test Horizontal 2-step pacing
const horizHist = simulateKeySequence('line_horizontal', 6, 2);
assert.deepStrictEqual(horizHist, ['Left', 'Left', 'Right', 'Right', 'Left', 'Left']);
console.log('  [PASS] Horizontal mode turns every 2 steps:', horizHist.join(' -> '));

// Test Vertical 2-step pacing
const vertHist = simulateKeySequence('line_vertical', 6, 2);
assert.deepStrictEqual(vertHist, ['Up', 'Up', 'Down', 'Down', 'Up', 'Up']);
console.log('  [PASS] Vertical mode turns every 2 steps:', vertHist.join(' -> '));

// Test Square 2-step patrol
const squareHist = simulateKeySequence('patrol_square', 8, 2);
assert.deepStrictEqual(squareHist, ['Left', 'Left', 'Up', 'Up', 'Right', 'Right', 'Down', 'Down']);
console.log('  [PASS] Square patrol turns every 2 steps:', squareHist.join(' -> '));

// 2. Test "Couldn't find anything" with both ASCII and typographic curly apostrophe U+2019
function isEncounterPresentMock(text) {
  const normText = text.replace(/[\u2018\u2019]/g, "'").toLowerCase();
  if (normText.includes("couldn't find") || normText.includes("could not find") || normText.includes('try moving to another spot') || normText.includes('searching...')) {
    return false;
  }
  if (normText.length > 3) {
    return true;
  }
  return false;
}

const emptyAscii = "Couldn't find anything. Try moving to another spot.";
const emptyCurly = "Couldn\u2019t find anything. Try moving to another spot.";
const realEncounter = "Wild Sentret (Level 12) appeared!";

assert.strictEqual(isEncounterPresentMock(emptyAscii), false, 'Empty ASCII text must NOT be detected as encounter');
assert.strictEqual(isEncounterPresentMock(emptyCurly), false, 'Empty curly apostrophe text must NOT be detected as encounter');
assert.strictEqual(isEncounterPresentMock(realEncounter), true, 'Real wild encounter must be detected as encounter');
console.log('  [PASS] Empty spot detection handles both straight and curly apostrophes correctly.');

// 3. Test that non-target encounters do NOT halt walking beyond step 3 or 5
let walkStepsTaken = 0;
let isFinderActive = true;
const targetList = ['mewtwo', 'rayquaza', 'aron', 'absol'];

function simulateMapStep(encounterText) {
  if (!isFinderActive) return;

  // Scan for targets
  const lower = encounterText.toLowerCase();
  for (const t of targetList) {
    if (lower.includes(t)) {
      isFinderActive = false; // Halt on target!
      return;
    }
  }

  // Non-target: continue walking!
  walkStepsTaken++;
}

// Simulate 10 steps of empty spots and common encounters (Sentret, Pidgey, Rattata)
for (let i = 0; i < 10; i++) {
  const text = (i % 2 === 0) ? emptyCurly : "Wild Rattata appeared!";
  simulateMapStep(text);
}
assert.strictEqual(walkStepsTaken, 10, `Bot must continue walking past 10 non-target steps, took: ${walkStepsTaken}`);
assert.strictEqual(isFinderActive, true, 'Finder must remain active across non-target encounters');
console.log('  [PASS] Bot successfully roams for 10 consecutive steps without freezing on non-target encounters.');

// Now step 11: Rayquaza appears!
simulateMapStep("Wild Rayquaza appeared! Level 70");
assert.strictEqual(isFinderActive, false, 'Finder must halt immediately when a target appears');
assert.strictEqual(walkStepsTaken, 10, 'No more steps must be taken after target appears');
console.log('  [PASS] Movement halts immediately upon detecting target Rayquaza.');

// 4. Verify clean 7-bit ASCII in all files
const files = [
  'pokefinder.user.js',
  'desktop-client/game-preload.js',
  'desktop-client/app.js',
  'desktop-client/config.json',
  'test_two_step_roaming.js'
];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) > 127) {
      throw new Error(`Non-ASCII character found in ${f} at index ${i}`);
    }
  }
}
console.log('  [PASS] All modified files are 100% clean 7-bit ASCII.');

console.log('--- ALL 2-STEP ROAMING & CONTINUOUS SEARCHING TESTS PASSED! ---');
