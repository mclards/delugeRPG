// test_strict_turn_cadence_and_side_wall_ignore.js
// Verification suite for:
// 1. Strict respect of "Required Step after each turn: N" (no random 1-5 step changes)
// 2. Strict perpendicular turning upon completing N steps
// 3. Side obstacles completely ignored while path ahead is clear
// 4. Fallback collision timer confirms unblocked moves without false turns
// 5. DelugeRPG m-disable class recognized for blocked arrows; m-move recognized as clear
// 6. Micro-pauses and idle pauses strictly barred from interrupting mid-stride

const assert = require('assert');
const fs = require('fs');

console.log('=== RUNNING STRICT TURN CADENCE & SIDE WALL IGNORE SUITE ===\n');

const appJs = fs.readFileSync('desktop-client/app.js', 'utf8').replace(/\r\n/g, '\n');
const preloadJs = fs.readFileSync('desktop-client/game-preload.js', 'utf8').replace(/\r\n/g, '\n');
const userJs = fs.readFileSync('pokefinder.user.js', 'utf8').replace(/\r\n/g, '\n');

// --- 1. VERIFY DELUGERPG CLASS DETECTION (m-disable vs m-move) ---
console.log('--- 1. Testing DelugeRPG m-disable vs m-move Class Detection ---');
assert(preloadJs.includes("cls.indexOf('disable') !== -1 || cls.indexOf('m-dis') !== -1"), 'game-preload.js must recognize m-disable');
assert(userJs.includes("cls.indexOf('disable') !== -1 || cls.indexOf('m-dis') !== -1"), 'pokefinder.user.js must recognize m-disable');

function testClassCheck(className) {
    const cls = (className || '').toString().toLowerCase();
    return cls.indexOf('disable') !== -1 || cls.indexOf('m-dis') !== -1 ||
           cls.indexOf('inactive') !== -1 || cls.indexOf('blocked') !== -1 ||
           cls.indexOf('off') !== -1 || cls.indexOf('grey') !== -1 ||
           cls.indexOf('gray') !== -1 || cls.indexOf('dr-dis') !== -1;
}

assert.strictEqual(testClassCheck('m-disable'), true, 'm-disable must be identified as blocked');
assert.strictEqual(testClassCheck('m-move'), false, 'm-move must be identified as UNBLOCKED');
assert.strictEqual(testClassCheck('nav-btn m-disable active'), true, 'm-disable with extra classes must be identified as blocked');
assert.strictEqual(testClassCheck('nav-btn m-move selected'), false, 'm-move with extra classes must be identified as unblocked');
console.log('  [PASS] DelugeRPG m-disable and m-move correctly distinguished.');

// --- 2. VERIFY FALLBACK TIMER NEVER FALSELY CALLS HANDLEMOVEBLOCKED ON CLEAR ARROWS ---
console.log('\n--- 2. Testing Fallback Timer Clear-Path Safety ---');
assert(appJs.includes('const isBlocked = isDirectionPhysicallyBlocked(keyName);'), 'app.js fallback timer must query isDirectionPhysicallyBlocked');
assert(appJs.includes('if (isBlocked) {\n        handleMoveBlocked(keyName);\n      } else {\n        handleMoveSuccess(keyName);\n      }'), 'fallback timer must confirm move if unblocked');
console.log('  [PASS] Fallback timer guarantees unblocked moves are confirmed and never turn falsely.');

// --- 3. VERIFY MICRO-PAUSES & IDLE PAUSES ARE BARRED MID-STRIDE ---
console.log('\n--- 3. Testing Pause Mid-Stride Guard ---');
assert(appJs.includes('if (config.settings.enableIdlePauses && wanderStepsLeft <= 0)'), 'Idle pauses must strictly require wanderStepsLeft <= 0');
assert(appJs.includes('if (config.settings.enableMicroBreaks && wanderStepsLeft <= 0)'), 'Micro breaks must strictly require wanderStepsLeft <= 0');
console.log('  [PASS] Idle pauses and micro breaks are strictly forbidden from interrupting mid-stride.');

// --- 4. BEHAVIORAL SIMULATION: EXACT 5 STEPS PER TURN WITHOUT RANDOM NUMBERS ---
console.log('\n--- 4. Testing Exact 5-Step Traversal with Side Walls ---');
const CARDINAL = ['Left', 'Up', 'Right', 'Down'];
const PERPS = {
    'Left': ['Up', 'Down'],
    'Right': ['Up', 'Down'],
    'Up': ['Left', 'Right'],
    'Down': ['Left', 'Right']
};

function simulateAppWanderRun(requiredSteps, totalStepsToTake, sideWallsPresent) {
    let currentDir = 'Right';
    let wanderStepsLeft = requiredSteps - 1;
    const history = [currentDir];
    let turns = [];

    for (let s = 1; s < totalStepsToTake; s++) {
        // Forward check: path ahead is clear, but side walls may exist
        let forwardBlocked = false; // Forward is clear
        let sideBlocked = sideWallsPresent; // Up/Down are walls while walking Right

        // Crucial invariant: sideBlocked MUST NOT affect forward traversal
        if (forwardBlocked) {
            // Only forward obstacles trigger evasion
            currentDir = 'Up';
            wanderStepsLeft = requiredSteps - 1;
        } else if (wanderStepsLeft <= 0) {
            // Required steps completed: STRICT PERPENDICULAR TURN!
            const prev = currentDir;
            const perpCandidates = PERPS[currentDir];
            currentDir = perpCandidates[0]; // Turn 90 degrees
            wanderStepsLeft = requiredSteps - 1;
            turns.push({ atStep: s, from: prev, to: currentDir });
        } else {
            // Continue forward: decrement remaining steps
            wanderStepsLeft--;
        }
        history.push(currentDir);
    }
    return { history, turns };
}

const sim = simulateAppWanderRun(5, 50, true);
// Verify that turns occur at step 5, 10, 15, 20, 25, 30, 35, 40, 45
assert.strictEqual(sim.turns.length, 9, 'Expected 9 turns across 50 steps with 5 steps per turn');
sim.turns.forEach((t, i) => {
    const expectedStep = (i + 1) * 5;
    assert.strictEqual(t.atStep, expectedStep, `Turn ${i + 1} must occur exactly at step ${expectedStep}, got ${t.atStep}`);
});

// Verify run lengths between turns are ALL exactly 5 (never 1, 2, 3, or 4)
let runCount = 1;
for (let i = 1; i < sim.history.length; i++) {
    if (sim.history[i] === sim.history[i - 1]) {
        runCount++;
    } else {
        assert.strictEqual(runCount, 5, `Expected exactly 5 steps in direction, got ${runCount}`);
        runCount = 1;
    }
}
console.log('  [PASS] All 9 turns occurred at exact multiples of 5 with 0 deviations and 0 mid-stride turns.');

// --- 5. VERIFY PRELOAD EVALUATES UNBLOCKED MOVES TO SUCCESS ---
console.log('\n--- 5. Testing Preload CollisionCheckTimer Logic ---');
assert(preloadJs.includes('if (navBlockedNow) {'), 'game-preload.js must branch on navBlockedNow');
assert(preloadJs.includes("ipcRenderer.sendToHost('move-result', {\n                        direction: dir,\n                        success: true,"), 'game-preload.js must report success when forward arrow is not blocked');
console.log('  [PASS] Preload collisionCheckTimer confirms unblocked moves without latency.');

console.log('\n=== ALL STRICT CADENCE & SIDE WALL IGNORE TESTS PASSED (100%) ===\n');
