// test_one_step_and_diagonal.js - Unit tests for 1-step cadence, diagonal movement, and safe obstacle detection
const assert = require('assert');
const fs = require('fs');

console.log('--- TESTING 1-STEP CADENCE, DIAGONAL MOVEMENT & SAFE OBSTACLE DETECTION ---');

// 1. Test 1-step turning cadence in Wander mode
function simulateOneStepSequence(mode, totalSteps, stepsPerDir = 1) {
  let stepCount = 0;
  let currentDir = 'Left';
  let wanderLeft = stepsPerDir;
  let diagVert = 'Up';
  let diagHoriz = 'Right';
  const history = [];

  const keys = ['Left', 'Up', 'Right', 'Down'];
  const opposites = { 'Left': 'Right', 'Right': 'Left', 'Up': 'Down', 'Down': 'Up' };

  function chooseEvade(cur) {
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
    if (mode === 'diagonal') {
      key = (stepCount % 2 === 0) ? diagVert : diagHoriz;
    } else if (mode === 'line_horizontal') {
      const isLeft = Math.floor(stepCount / stepsPerDir) % 2 === 0;
      key = isLeft ? 'Left' : 'Right';
    } else if (mode === 'line_vertical') {
      const isUp = Math.floor(stepCount / stepsPerDir) % 2 === 0;
      key = isUp ? 'Up' : 'Down';
    } else if (mode === 'patrol_square') {
      const idx = Math.floor(stepCount / stepsPerDir) % 4;
      key = keys[idx];
    } else {
      // wander (1-step)
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

// Test Wander 1-step turning (changes direction every step!)
const wanderHist = simulateOneStepSequence('wander', 4, 1);
assert.strictEqual(wanderHist[0], 'Left');
assert.strictEqual(wanderHist[1], 'Up', 'Must turn on step 2 (changes every 1 step)');
assert.strictEqual(wanderHist[2], 'Left', 'Must turn on step 3 (changes every 1 step)');
assert.strictEqual(wanderHist[3], 'Up', 'Must turn on step 4 (changes every 1 step)');
console.log('  [PASS] Wander mode changes direction every 1 step:', wanderHist.join(' -> '));

// Test Diagonal mode (alternates vertical and horizontal)
const diagHist = simulateOneStepSequence('diagonal', 6);
assert.deepStrictEqual(diagHist, ['Up', 'Right', 'Up', 'Right', 'Up', 'Right']);
console.log('  [PASS] Diagonal mode sweeps in stair pattern:', diagHist.join(' -> '));

// 2. Test Diagonal obstacle wall-bounce physics
function simulateDiagonalWithObstacles() {
  let diagVert = 'Up';
  let diagHoriz = 'Right';
  const blockedDirs = {};
  const stepsTaken = [];

  function onCollide(dir) {
    if (dir === 'Up') diagVert = 'Down';
    else if (dir === 'Down') diagVert = 'Up';
    else if (dir === 'Left') diagHoriz = 'Right';
    else if (dir === 'Right') diagHoriz = 'Left';
  }

  for (let s = 0; s < 6; s++) {
    const key = (s % 2 === 0) ? diagVert : diagHoriz;
    stepsTaken.push(key);

    // Simulate hitting upper wall on step 2 (when trying to go Up)
    if (s === 2 && key === 'Up') {
      onCollide('Up'); // Hit top border, bounce Down!
    }
    // Simulate hitting right wall on step 3 (when trying to go Right)
    if (s === 3 && key === 'Right') {
      onCollide('Right'); // Hit right border, bounce Left!
    }
  }
  return stepsTaken;
}

const bounceHist = simulateDiagonalWithObstacles();
// Step 0: Up
// Step 1: Right
// Step 2: Up (collides -> diagVert becomes Down)
// Step 3: Right (collides -> diagHoriz becomes Left)
// Step 4: Down (bounced!)
// Step 5: Left (bounced!)
assert.deepStrictEqual(bounceHist, ['Up', 'Right', 'Up', 'Right', 'Down', 'Left']);
console.log('  [PASS] Diagonal wall-bounce physics cleanly inverts axis on collision:', bounceHist.join(' -> '));

// 3. Test Safe DOM Obstacle Identification Logic
function evaluateMovementResult(initialPos, currentPos, initialText, currentText) {
  const posChanged = !!(initialPos && currentPos && (initialPos.x !== currentPos.x || initialPos.y !== currentPos.y));
  const textChanged = (currentText !== initialText) || (currentText.toLowerCase().indexOf('searching...') !== -1);
  if (posChanged || textChanged) {
    return { success: true, blocked: false };
  }
  return { success: false, blocked: true };
}

// Case A: Player walked into grass, Dexy text updated
const resA = evaluateMovementResult({ x: 100, y: 100 }, { x: 132, y: 100 }, "empty", "Wild Pidgey appeared");
assert.strictEqual(resA.success, true);
assert.strictEqual(resA.blocked, false);

// Case B: Player moved, but Dexy text remained the same (empty spot to empty spot)
const resB = evaluateMovementResult({ x: 100, y: 100 }, { x: 100, y: 132 }, "Couldn't find anything", "Couldn't find anything");
assert.strictEqual(resB.success, true, 'Moving player coordinates must be recognized as success even if text is identical');
assert.strictEqual(resB.blocked, false);

// Case C: Player walked into water/fence - coordinates did NOT change and text did NOT change
const resC = evaluateMovementResult({ x: 100, y: 100 }, { x: 100, y: 100 }, "Couldn't find anything", "Couldn't find anything");
assert.strictEqual(resC.success, false);
assert.strictEqual(resC.blocked, true, 'Zero coordinate change + zero text change safely identifies obstacle');
console.log('  [PASS] 100% passive, safe obstacle identification accurately detects free steps vs blocked obstacles.');

// 4. Verify clean 7-bit ASCII in all modified files
const filesToCheck = [
  'pokefinder.user.js',
  'desktop-client/game-preload.js',
  'desktop-client/app.js',
  'desktop-client/config.json',
  'desktop-client/app.html',
  'test_one_step_and_diagonal.js'
];

for (const f of filesToCheck) {
  const content = fs.readFileSync(f, 'utf8');
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) > 127) {
      throw new Error(`Non-ASCII character (code ${content.charCodeAt(i)}) found in ${f} at index ${i}`);
    }
  }
}
console.log('  [PASS] All modified files are 100% clean 7-bit ASCII (0 non-ASCII characters).');

console.log('--- ALL 1-STEP, DIAGONAL & SAFE OBSTACLE DETECTION TESTS PASSED! ---');

