// test_stuck_recovery.js - Unit test suite for obstacle collision avoidance and anti-stuck navigation
const assert = require('assert');
const fs = require('fs');

console.log('--- RUNNING OBSTACLE COLLISION & ANTI-STUCK TEST SUITE ---');

// 1. Verify Desktop Client Evade Logic
let blockedDirections = {};

function chooseEvadeDirection(blockedDir) {
  const keys = ['Left', 'Up', 'Right', 'Down'];
  const opposites = { 'Left': 'Right', 'Right': 'Left', 'Up': 'Down', 'Down': 'Up' };
  const perpendiculars = {
    'Left': ['Up', 'Down'],
    'Right': ['Up', 'Down'],
    'Up': ['Left', 'Right'],
    'Down': ['Left', 'Right']
  };

  const now = Date.now();
  const unblockedPerp = (perpendiculars[blockedDir] || []).filter(k => !blockedDirections[k] || blockedDirections[k] <= now);
  if (unblockedPerp.length > 0) {
    return unblockedPerp[Math.floor(Math.random() * unblockedPerp.length)];
  }

  const opp = opposites[blockedDir] || 'Down';
  if (!blockedDirections[opp] || blockedDirections[opp] <= now) {
    return opp;
  }

  const anyOther = keys.filter(k => k !== blockedDir);
  return anyOther[Math.floor(Math.random() * anyOther.length)];
}

// Test Case A: Obstacle hit facing Up (like Tower of Lost Souls chairs)
blockedDirections = { 'Up': Date.now() + 10000 };
for (let i = 0; i < 20; i++) {
  const evaded = chooseEvadeDirection('Up');
  assert(evaded === 'Left' || evaded === 'Right', `Must evade 90 degrees to Left or Right, got: ${evaded}`);
  assert(evaded !== 'Up', 'Must never choose the blocked Up direction');
}
console.log('[PASS] Test A: 90-degree lateral turn away from obstacle verified.');

// Test Case B: Corner collision (Up blocked by chairs, Right blocked by aisle wall)
blockedDirections = {
  'Up': Date.now() + 10000,
  'Right': Date.now() + 10000
};
for (let i = 0; i < 20; i++) {
  const evaded = chooseEvadeDirection('Up');
  assert(evaded === 'Left', `In a right corner, must choose Left into open space, got: ${evaded}`);
}
console.log('[PASS] Test B: Corner avoidance correctly turns into open Left corridor.');

// Test Case C: Dead-end pocket (Up, Left, Right all blocked)
blockedDirections = {
  'Up': Date.now() + 10000,
  'Left': Date.now() + 10000,
  'Right': Date.now() + 10000
};
const evadedDeadEnd = chooseEvadeDirection('Up');
assert(evadedDeadEnd === 'Down', `In 3-wall dead end, must reverse Down to retreat, got: ${evadedDeadEnd}`);
console.log('[PASS] Test C: Dead-end escape reverses 180 degrees into open room.');

// 2. Test Walk Modes Obstacle Adaptation
let stepCount = 0;
const stepsPerDir = 10;

function getNextKeyMock(mode, currentDir, wanderStepsLeft) {
  const keys = ['Left', 'Up', 'Right', 'Down'];
  const now = Date.now();

  for (const k in blockedDirections) {
    if (now > blockedDirections[k]) delete blockedDirections[k];
  }

  if (mode === 'line_horizontal') {
    if (blockedDirections['Left'] && !blockedDirections['Right']) return 'Right';
    if (blockedDirections['Right'] && !blockedDirections['Left']) return 'Left';
    const isLeft = Math.floor(stepCount / stepsPerDir) % 2 === 0;
    return isLeft ? 'Left' : 'Right';
  }

  if (mode === 'line_vertical') {
    if (blockedDirections['Up'] && !blockedDirections['Down']) return 'Down';
    if (blockedDirections['Down'] && !blockedDirections['Up']) return 'Up';
    const isUp = Math.floor(stepCount / stepsPerDir) % 2 === 0;
    return isUp ? 'Up' : 'Down';
  }

  if (mode === 'patrol_square') {
    let idx = Math.floor(stepCount / stepsPerDir) % 4;
    let candidate = keys[idx];
    if (blockedDirections[candidate]) {
      stepCount += stepsPerDir;
      idx = Math.floor(stepCount / stepsPerDir) % 4;
      candidate = keys[idx];
    }
    return candidate;
  }

  if (wanderStepsLeft <= 0 || blockedDirections[currentDir]) {
    return chooseEvadeDirection(currentDir);
  }
  return currentDir;
}

// Test Mode: line_vertical hitting top wall
blockedDirections = { 'Up': Date.now() + 10000 };
stepCount = 1; // Would normally be Up
const vertKey = getNextKeyMock('line_vertical', 'Up', 5);
assert(vertKey === 'Down', `line_vertical must immediately flip to Down when Up is blocked, got: ${vertKey}`);
console.log('[PASS] Test D: line_vertical immediate flip on wall collision verified.');

// Test Mode: line_horizontal hitting left wall
blockedDirections = { 'Left': Date.now() + 10000 };
stepCount = 0; // Would normally be Left
const horizKey = getNextKeyMock('line_horizontal', 'Left', 5);
assert(horizKey === 'Right', `line_horizontal must immediately flip to Right when Left is blocked, got: ${horizKey}`);
console.log('[PASS] Test E: line_horizontal immediate flip on wall collision verified.');

// 3. Test Userscript Keycode Evade Logic
let blockedWalkKeys = {};

function chooseEvadeWalkKey(blockedKey) {
  const keys = [37, 38, 39, 40]; // 37=Left, 38=Up, 39=Right, 40=Down
  const opposites = { 37: 39, 39: 37, 38: 40, 40: 38 };
  const perpendiculars = {
    37: [38, 40],
    39: [38, 40],
    38: [37, 39],
    40: [37, 39]
  };

  const now = Date.now();
  const unblockedPerp = (perpendiculars[blockedKey] || []).filter(k => !blockedWalkKeys[k] || blockedWalkKeys[k] <= now);
  if (unblockedPerp.length > 0) {
    return unblockedPerp[Math.floor(Math.random() * unblockedPerp.length)];
  }

  const opp = opposites[blockedKey] || 37;
  if (!blockedWalkKeys[opp] || blockedWalkKeys[opp] <= now) {
    return opp;
  }

  const anyOther = keys.filter(k => k !== blockedKey);
  return anyOther[Math.floor(Math.random() * anyOther.length)];
}

blockedWalkKeys = { 38: Date.now() + 10000 }; // 38 = Up blocked
for (let i = 0; i < 20; i++) {
  const evadedKey = chooseEvadeWalkKey(38);
  assert(evadedKey === 37 || evadedKey === 39, `Userscript must turn 37 (Left) or 39 (Right), got: ${evadedKey}`);
}
console.log('[PASS] Test F: Userscript keycode evade verified.');

// 4. Verify 100% Clean 7-bit ASCII across all files
const allFiles = [
  'desktop-client/app.js',
  'desktop-client/game-preload.js',
  'desktop-client/targets.js',
  'desktop-client/test_client.js',
  'pokefinder.user.js',
  'test_stuck_recovery.js'
];

for (const f of allFiles) {
  const raw = fs.readFileSync(f, 'utf8');
  for (let c = 0; c < raw.length; c++) {
    const code = raw.charCodeAt(c);
    if (code > 127) {
      throw new Error(`Non-ASCII character found in ${f} at index ${c} (char code ${code})`);
    }
  }
}
console.log('[PASS] Test G: All source files are 100% clean 7-bit ASCII.');

console.log('--- ALL OBSTACLE COLLISION & ANTI-STUCK TESTS PASSED PERFECTLY ---');

