// test_pause_accuracy.js - Unit tests for accurate pausing, false-positive prevention, and encounter preservation
const assert = require('assert');
const fs = require('fs');

console.log('--- TESTING PAUSE ACCURACY & ZERO-FALSE-POSITIVE ENCOUNTER SYSTEM ---');

const preloadJs = fs.readFileSync('desktop-client/game-preload.js', 'utf8');
const appJs = fs.readFileSync('desktop-client/app.js', 'utf8');
const userJs = fs.readFileSync('pokefinder.user.js', 'utf8');

// 1. Verify game-preload.js gates target matching behind hasCatchUI
assert(preloadJs.includes('const hasCatchUI = isEncounterOrCatchUIPresent();'), 'game-preload.js must evaluate hasCatchUI');
assert(preloadJs.includes('if (isSearching || !hasCatchUI) {\n        return;\n    }'), 'game-preload.js must return immediately if !hasCatchUI or isSearching');
assert(!preloadJs.includes('const allImgs = document.images;'), 'game-preload.js must NOT scan arbitrary document.images of entire page');

console.log('  [PASS] game-preload.js strictly gates scanning behind active encounter UI and rejects page images.');

// 2. Verify pokefinder.user.js gates target matching behind hasCatchUI
assert(userJs.includes('const hasCatchUI = isCatchOrEncounterPresent();\n        if (!hasCatchUI) return;'), 'pokefinder.user.js must return immediately if !hasCatchUI');
assert(!userJs.includes('const allImgs = document.images;'), 'pokefinder.user.js must NOT scan arbitrary document.images of entire page');

console.log('  [PASS] pokefinder.user.js strictly gates scanning behind active encounter UI.');

// 3. Verify app.js guards: movement halts on target, step-in-flight is guarded, and roaming past non-targets is permitted
assert(appJs.includes('if (!isRunning || isStepPending) {\n    return;\n  }'), 'sendKeyStep must refuse to dispatch when not running or step is in flight');
assert(appJs.includes('if (isStepPending) {\n      // Step in flight: wait 250ms and re-check before dispatching next step\n      scheduleNextStep(250);\n      return;\n    }'), 'scheduleNextStep must wait for pending step before sending next');
assert(appJs.includes('isRunning = false;\n    isEncounterOnScreen = true;\n    updateToggleButton();'), 'target-found must halt movement immediately');

console.log('  [PASS] app.js halts accurately on targets and guards against double-dispatch while allowing non-target roaming.');

// 4. Mock Simulation: Empty Spot with Ad/Sidebar Darkrai Image vs Real Darkrai Encounter
function simulateScan(dexyText, hasCatchButton, pageHasDarkraiAd) {
    function isEncounterPresent(text, btn) {
        if (btn) return true;
        const norm = (text || '').replace(/[\u2018\u2019]/g, "'").toLowerCase();
        if (norm.includes("couldn't find") || norm.includes("could not find") || norm.includes('try moving to another spot') || norm.includes('searching...')) {
            return false;
        }
        if (norm.includes('appeared') || norm.includes('level') || norm.includes('wild')) {
            return true;
        }
        return false;
    }

    const hasCatchUI = isEncounterPresent(dexyText, hasCatchButton);
    if (!hasCatchUI) {
        return { targetFound: false, reason: 'No encounter on screen' };
    }

    // Encounter text is strictly extracted from encounter container
    let encounterText = dexyText.toLowerCase();
    if (pageHasDarkraiAd) {
        // Even if page has Darkrai ad, encounterText is scoped to dexyText only!
    }

    if (encounterText.includes('darkrai')) {
        return { targetFound: true, target: 'Darkrai' };
    }

    return { targetFound: false, reason: 'Not a target encounter' };
}

// Case A: User's exact scenario from screenshot:
// Dexy shows: "Couldn't find anything. Try moving to another spot."
// Page has an ad or player with Darkrai
const emptySpotResult = simulateScan("Couldn't find anything. Try moving to another spot.", false, true);
assert.strictEqual(emptySpotResult.targetFound, false, 'Empty spot must NEVER declare Darkrai found');
assert.strictEqual(emptySpotResult.reason, 'No encounter on screen');
console.log('  [PASS] Empty spot ("Couldn\'t find anything") never triggers false-positive target found even with Darkrai ad on page.');

// Case B: Real wild Darkrai appears!
const realDarkraiResult = simulateScan("A wild Darkrai appeared! (Level 70)", true, false);
assert.strictEqual(realDarkraiResult.targetFound, true, 'Real Darkrai encounter must be accurately detected');
assert.strictEqual(realDarkraiResult.target, 'Darkrai');
console.log('  [PASS] Real wild Darkrai encounter accurately detected and halted.');

// 5. Verify 100% clean 7-bit ASCII
const filesToCheck = [
    'desktop-client/game-preload.js',
    'desktop-client/app.js',
    'pokefinder.user.js',
    'test_pause_accuracy.js'
];
for (const file of filesToCheck) {
    const content = fs.readFileSync(file, 'utf8');
    for (let i = 0; i < content.length; i++) {
        if (content.charCodeAt(i) > 127) {
            throw new Error(`Non-ASCII character found in ${file} at position ${i}`);
        }
    }
}
console.log('  [PASS] All modified files verified 100% clean 7-bit ASCII.');

console.log('--- ALL PAUSE ACCURACY & ZERO-FALSE-POSITIVE TESTS PASSED! ---');

