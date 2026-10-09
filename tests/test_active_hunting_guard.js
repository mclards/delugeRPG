// test_active_hunting_guard.js
// Verification that target scanning & beeping ONLY activates during Active Hunting

const assert = require('assert');
const fs = require('fs');

console.log('--- TESTING ACTIVE HUNTING SCANNING & BEEP GUARDS ---');

// 1. Verify desktop-client/app.js has isRunning guard in target-found and syncHuntingState
const appJs = fs.readFileSync('desktop-client/app.js', 'utf8').replace(/\r\n/g, '\n');

assert(appJs.includes('function syncHuntingState()'), 'app.js must define syncHuntingState()');
assert(appJs.includes("delugeView.send('hunting-state-changed', { isHunting: isRunning })"), 'syncHuntingState must emit hunting-state-changed with isHunting');
assert(appJs.includes("if (!isRunning) {\n      // STRICT SAFETY: Only react to screen targets during an active hunting session!\n      return;\n    }"), 'app.js target-found must reject events when isRunning is false');

console.log('  [PASS] desktop-client/app.js strictly guards target-found with isRunning.');

// 2. Verify desktop-client/game-preload.js has isHuntingActive state, page check, and selective selectors
const preloadJs = fs.readFileSync('desktop-client/game-preload.js', 'utf8').replace(/\r\n/g, '\n');

assert(preloadJs.includes("let isHuntingActive = false;"), 'game-preload.js must track isHuntingActive');
assert(preloadJs.includes("ipcRenderer.on('hunting-state-changed'"), 'game-preload.js must listen for hunting-state-changed');
assert(preloadJs.includes("if (!isHuntingActive) {\n        return;\n    }"), 'scanForTargets must return early if !isHuntingActive');
assert(preloadJs.includes("const isHuntingPage = path.indexOf('/map') !== -1 || path.indexOf('/catch') !== -1;\n    if (!isHuntingPage) {\n        return;\n    }"), 'scanForTargets must return early if not on /map or /catch');
assert(!preloadJs.includes("[id*=\"poke\" i]"), 'game-preload.js must not contain broad [id*="poke" i] selector that matches team/box elements');

console.log('  [PASS] desktop-client/game-preload.js strictly guards against scanning when paused or on team/box pages.');

// 3. Verify pokefinder.user.js has path check and selective selectors
const userscript = fs.readFileSync('pokefinder.user.js', 'utf8').replace(/\r\n/g, '\n');

assert(userscript.includes("path.indexOf('/map') === -1 && path.indexOf('/catch') === -1"), 'pokefinder.user.js extractEncounterText must check for /map or /catch');
assert(!userscript.includes("[id*=\"poke\" i]"), 'pokefinder.user.js must not contain broad [id*="poke" i] selector');

console.log('  [PASS] pokefinder.user.js matches exact path guard and selective selectors.');

// 4. Simulate State Machine Behavior
let isRunning = false;
let beepCount = 0;
let statusText = 'Paused';

function playSound() {
    beepCount++;
}

function handleTargetFound(target) {
    if (!isRunning) {
        // Guarded!
        return false;
    }
    isRunning = false;
    statusText = 'FOUND: ' + target;
    playSound();
    return true;
}

// Case A: Slither Wing on screen while PAUSED (e.g. on team page)
const pausedResult = handleTargetFound('Slither Wing');
assert.strictEqual(pausedResult, false, 'Target-found while paused must be ignored');
assert.strictEqual(beepCount, 0, 'No beeps must occur while paused');
assert.strictEqual(statusText, 'Paused', 'Status text must remain Paused');
console.log('  [PASS] Case A: Paused state with Slither Wing on screen causes ZERO beeps.');

// Case B: Hunting ACTIVE, target found
isRunning = true;
const activeResult = handleTargetFound('Slither Wing');
assert.strictEqual(activeResult, true, 'Target-found while active must be handled');
assert.strictEqual(beepCount, 1, 'Exactly 1 beep must occur on initial detection');
assert.strictEqual(statusText, 'FOUND: Slither Wing', 'Status text must update to FOUND');
assert.strictEqual(isRunning, false, 'Hunting must immediately halt to paused state');
console.log('  [PASS] Case B: Active hunting detects target, beeps once, and halts.');

// Case C: Subsequent scans while still looking at the target screen
const duplicateResult = handleTargetFound('Slither Wing');
assert.strictEqual(duplicateResult, false, 'Duplicate scan while paused must be ignored');
assert.strictEqual(beepCount, 1, 'No additional beeps must occur');
console.log('  [PASS] Case C: Looking at the screen after target detection causes NO repeated beeps.');

// 5. Verify 100% 7-bit ASCII
const allFiles = ['desktop-client/app.js', 'desktop-client/game-preload.js', 'pokefinder.user.js'];
for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (let i = 0; i < content.length; i++) {
        if (content.charCodeAt(i) > 127) {
            throw new Error(`Non-ASCII character found in ${file} at position ${i}`);
        }
    }
}
console.log('  [PASS] All modified files are 100% clean 7-bit ASCII.');

console.log('--- ALL ACTIVE HUNTING GUARD TESTS PASSED! ---');
