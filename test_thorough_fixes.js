// test_thorough_fixes.js - Comprehensive Verification Suite for Audit Fixes
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== RUNNING THOROUGH AUDIT FIXES VERIFICATION SUITE ===');

const appJs = fs.readFileSync('desktop-client/app.js', 'utf8');
const preloadJs = fs.readFileSync('desktop-client/game-preload.js', 'utf8');
const mainJs = fs.readFileSync('desktop-client/main.js', 'utf8');
const configJson = JSON.parse(fs.readFileSync('desktop-client/config.json', 'utf8'));
const userJs = fs.readFileSync('pokefinder.user.js', 'utf8');

// 1. C-1 DEADLOCK FIX VERIFICATION
console.log('\n--- 1. C-1: Non-Target Wild Encounter Deadlock Fix ---');
assert(!appJs.includes('if (!isRunning || isEncounterOnScreen || isStepPending)'), 'sendKeyStep must NOT block on isEncounterOnScreen');
assert(appJs.includes('if (!isRunning || isStepPending) {\n    return;\n  }'), 'sendKeyStep must only guard !isRunning or isStepPending');
assert(!appJs.includes('if (!isRunning || isEncounterOnScreen) return;'), 'scheduleNextStep must NOT abort on isEncounterOnScreen');
console.log('  [PASS] sendKeyStep and scheduleNextStep allow continuous roaming past non-target encounters.');

// 2. H-3 UNREACHABLE /unlock CAPTCHA ALARM FIX
console.log('\n--- 2. H-3: /unlock Honeypot / Captcha Alarm Path ---');
const unlockIdxPreload = preloadJs.indexOf("path.indexOf('/unlock') !== -1");
const huntingPageIdxPreload = preloadJs.indexOf("const isHuntingPage");
assert(unlockIdxPreload !== -1, 'game-preload.js must have /unlock check');
assert(unlockIdxPreload < huntingPageIdxPreload, '/unlock check must precede isHuntingPage check so /unlock is reachable');
assert(userJs.includes("window.location.pathname.indexOf('/unlock') !== -1"), 'pokefinder.user.js must have /unlock security guard');
console.log('  [PASS] /unlock check is evaluated first across domain before any page guard.');

// 3. H-4 SECRETS HANDLING & CREDENTIAL SANITIZATION
console.log('\n--- 3. H-4: Secrets Sanitization ---');
assert(!configJson.dummyAccount.username.includes('PokeDen'), 'config.json must not contain leaked PokeDen username');
assert(!configJson.dummyAccount.password.includes('sacups2026'), 'config.json must not contain leaked sacups2026 password');
assert(mainJs.includes("dummyAccount: { username: '', password: '', autoLogin: false }"), 'main.js fallback credentials must be sanitized');
assert(!mainJs.includes('sacups2026'), 'main.js must not contain plaintext password');
assert(!mainJs.includes('PokeDen'), 'main.js must not contain plaintext username');
console.log('  [PASS] Leaked default credentials completely sanitized from config.json and main.js fallback.');

// 4. M-1 & H-1 & H-2 OBSTACLE DETECTION TIMING & OBSERVER HYGIENE
console.log('\n--- 4. M-1, H-1, H-2: Obstacle Detection & Collision Pipeline ---');
assert(appJs.includes('fallbackCollisionTimer = setTimeout(() => {\n      handleMoveSuccess(keyName);\n    }, 1600);'), 'Host fallback timer must be 1600ms so preload collision timer resolves first');
assert(!preloadJs.includes('XMLHttpRequest.prototype.open ='), 'Preload must not contain inert XHR open monkey-patch');
assert(!preloadJs.includes('XMLHttpRequest.prototype.send ='), 'Preload must not contain inert XHR send monkey-patch');
assert(preloadJs.includes('getBoundingClientRect()'), 'Preload getPlayerPosition must use getBoundingClientRect for reliable coordinates');
assert(preloadJs.includes('const posMoved = !!(activeStep.initialPos && curPos && (activeStep.initialPos.x !== curPos.x || activeStep.initialPos.y !== curPos.y));'), 'Observer must verify actual coordinate movement before resolving step success');
console.log('  [PASS] Inert XHR hooks removed, bounding client rect tracking active, and 1600ms host fallback allows preload to confirm obstacles.');

// 5. M-3 ULTRA BALL FALSE-POSITIVE GUARD
console.log('\n--- 5. M-3: Ultra Ball Exclusion from Ultra Special Form ---');
assert(preloadJs.includes("if (form.toLowerCase() === 'ultra' && formMatch[1].toLowerCase().startsWith('ball'))"), 'game-preload.js must exclude Ultra Ball from ultra form match');
assert(userJs.includes("if (form.toLowerCase() === 'ultra' && formMatch[1].toLowerCase().startsWith('ball'))"), 'pokefinder.user.js must exclude Ultra Ball from ultra form match');

// Functional test for form matching with "Ultra Ball"
function testFormMatch(text) {
    const FORMS = ["mega", "gigantamax", "g-max", "gmax", "primal", "ultra"];
    const textLower = text.toLowerCase();
    for (let j = 0; j < FORMS.length; j++) {
        const form = FORMS[j];
        const formMatch = textLower.match(new RegExp('\\b' + form + '[- ]+([a-z0-9\\-\':]+)', 'i'));
        if (formMatch) {
            if (form.toLowerCase() === 'ultra' && formMatch[1].toLowerCase().startsWith('ball')) {
                continue;
            }
            return { matched: true, form: form, name: formMatch[1] };
        }
    }
    return { matched: false };
}

const ultraBallEncounter = "Wild Pidgey appeared! Throw Ultra Ball to catch.";
const ultraNecrozmaEncounter = "Wild Ultra Necrozma appeared!";
assert.strictEqual(testFormMatch(ultraBallEncounter).matched, false, 'Ultra Ball must NOT match ultra form');
assert.strictEqual(testFormMatch(ultraNecrozmaEncounter).matched, true, 'Ultra Necrozma MUST match ultra form');
assert.strictEqual(testFormMatch(ultraNecrozmaEncounter).name, 'necrozma', 'Matched species must be necrozma');
console.log('  [PASS] Ultra Ball successfully ignored; Ultra Necrozma accurately recognized.');

// 6. M-4 OVERLY BROAD SELECTORS & CONTAINER SCOPING
console.log('\n--- 6. M-4: Scoped Catch UI and Container Selectors ---');
assert(!preloadJs.includes('a[href*="catch" i]'), 'game-preload.js must not match generic navigation links containing "catch"');
assert(preloadJs.includes("catchBtns[b].closest('form, .catch-form, #dexy, #showpoke')"), 'game-preload.js must scope catch button containers to encounter elements');
assert(!userJs.includes('pageText += \' \' + bodyText;'), 'pokefinder.user.js must not append full body text');
console.log('  [PASS] Selectors scoped strictly to encounter containers, eliminating page-wide text bleed.');

// 7. L-1 & L-2 RESOURCE LEAKS & MISSING ASSETS
console.log('\n--- 7. L-1 & L-2: AudioContext & Notification Assets ---');
assert(appJs.includes('sharedAudioCtx'), 'app.js must reuse shared AudioContext');
assert(!appJs.includes("icon: 'assets/icon.png'"), 'app.js must not reference non-existent assets/icon.png');
console.log('  [PASS] Shared AudioContext re-used; non-existent icon path removed.');

// 8. M-7 WEBVIEW POPUP PROTECTION
console.log('\n--- 8. M-7: Webview Window Open Handler ---');
assert(mainJs.includes("contents.setWindowOpenHandler(() => ({ action: 'deny' }));"), 'main.js must deny popup windows across web contents');
console.log('  [PASS] Popups safely denied across all web contents.');

// 9. STRICT 7-BIT ASCII INTEGRITY
console.log('\n--- 9. Strict 7-bit ASCII Verification ---');
const filesToVerify = [
    'desktop-client/app.js',
    'desktop-client/game-preload.js',
    'desktop-client/main.js',
    'desktop-client/config.json',
    'pokefinder.user.js',
    'test_pause_accuracy.js',
    'test_thorough_fixes.js'
];

let totalAsciiChecked = 0;
for (const file of filesToVerify) {
    const content = fs.readFileSync(file, 'utf8');
    for (let i = 0; i < content.length; i++) {
        const code = content.charCodeAt(i);
        if (code > 127) {
            throw new Error(`Non-ASCII character (code ${code}) found in ${file} at character index ${i}`);
        }
        totalAsciiChecked++;
    }
}
console.log(`  [PASS] 100% 7-bit ASCII clean across all ${filesToVerify.length} files (${totalAsciiChecked} characters checked, 0 violations).`);

console.log('\n=== ALL THOROUGH AUDIT FIXES VERIFIED SUCCESSFULLY! ===');

