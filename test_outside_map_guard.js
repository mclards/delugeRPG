// test_outside_map_guard.js
// Verification that Hunting automatically pauses when navigating outside maps,
// preventing cursor distraction, focus stealing, and unwanted keystrokes.

const assert = require('assert');
const fs = require('fs');

console.log('--- TESTING OUTSIDE MAP AUTO-PAUSE & CURSOR SAFETY GUARDS ---');

// 1. Verify app.js implementation
const appJs = fs.readFileSync('desktop-client/app.js', 'utf8').replace(/\r\n/g, '\n');

assert(appJs.includes('function isMapUrl(rawUrl)'), 'app.js must define isMapUrl helper');
assert(appJs.includes('function autoPauseOutsideMap('), 'app.js must define autoPauseOutsideMap helper');
assert(appJs.includes("updateStatus('Auto-Paused (Outside Map)', '#f59e0b')"), 'app.js must set status to Auto-Paused (Outside Map)');

// Verify isMapUrl logic via eval
const isMapUrlExtract = appJs.match(/function isMapUrl\(rawUrl\) \{[\s\S]*?\n\}/);
assert(isMapUrlExtract, 'isMapUrl definition extracted');
const isMapUrl = new Function('rawUrl', isMapUrlExtract[0] + '\nreturn isMapUrl(rawUrl);');

// Test isMapUrl matrix
assert.strictEqual(isMapUrl('https://www.delugerpg.com/map'), true, '/map must be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/map/'), true, '/map/ must be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/map/1'), true, '/map/1 must be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/map/20'), true, '/map/20 must be recognized as map');

assert.strictEqual(isMapUrl('https://www.delugerpg.com/battle'), false, '/battle must NOT be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/battle/trainer'), false, '/battle/trainer must NOT be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/pokemon/12345'), false, '/pokemon must NOT be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/user/Profile'), false, '/user must NOT be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/trade'), false, '/trade must NOT be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/box'), false, '/box must NOT be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/team'), false, '/team must NOT be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/pokemart'), false, '/pokemart must NOT be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/change-sprites'), false, '/change-sprites must NOT be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/login'), false, '/login must NOT be recognized as map');
assert.strictEqual(isMapUrl('https://www.delugerpg.com/'), false, 'Homepage must NOT be recognized as map');
assert.strictEqual(isMapUrl('about:blank'), false, 'blank must NOT be recognized as map');
assert.strictEqual(isMapUrl(''), false, 'empty must NOT be recognized as map');

console.log('  [PASS] isMapUrl accurately isolates /map routes from non-map pages.');

// 2. Verify navigation listeners on delugeView
assert(appJs.includes("delugeView.addEventListener('did-navigate'"), 'delugeView must listen for did-navigate');
assert(appJs.includes("delugeView.addEventListener('did-navigate-in-page'"), 'delugeView must listen for did-navigate-in-page');
assert(appJs.includes("delugeView.addEventListener('will-navigate'"), 'delugeView must listen for will-navigate');

console.log('  [PASS] delugeView has did-navigate, did-navigate-in-page, and will-navigate safety hooks.');

// 3. Verify sendKeyStep & scheduleNextStep guards
assert(appJs.includes("if (curUrl && !isMapUrl(curUrl)) {\n      autoPauseOutsideMap(curUrl);\n      return;\n    }"), 'sendKeyStep must guard with isMapUrl before focusing or dispatching keys');
assert(appJs.includes("if (stepUrl && !isMapUrl(stepUrl)) {\n        autoPauseOutsideMap(stepUrl);\n        return;\n      }"), 'scheduleNextStep must guard with isMapUrl');
assert(appJs.includes('if (isGuestInputFocused)'), 'Input focus guard active in scheduleNextStep and sendKeyStep');

console.log('  [PASS] sendKeyStep and scheduleNextStep strictly abort and auto-pause when outside map.');

// 4. Verify toggleHunting start prevention when outside map
assert(appJs.includes("if (!isRunning) {\n    const curUrl = delugeView ? delugeView.getURL() : '';\n    if (curUrl && !isMapUrl(curUrl)) {\n      updateStatus('Cannot Hunt Outside Map!', '#ef4444');"), 'toggleHunting must prevent starting when outside map');

console.log('  [PASS] toggleHunting prevents starting hunting when outside maps.');

// 5. Verify game-preload.js IPC notifications
const preloadJs = fs.readFileSync('desktop-client/game-preload.js', 'utf8').replace(/\r\n/g, '\n');
assert(preloadJs.includes("ipcRenderer.sendToHost('hunting-auto-pause'"), 'game-preload.js must notify host of auto pause');
assert(preloadJs.includes("ipcRenderer.sendToHost('guest-input-focused'"), 'game-preload.js must notify host of guest input focus');

console.log('  [PASS] game-preload.js emits hunting-auto-pause and guest-input-focused.');

// 6. Verify pokefinder.user.js guards
const userJs = fs.readFileSync('pokefinder.user.js', 'utf8').replace(/\r\n/g, '\n');
assert(userJs.includes("if (window.location.pathname.indexOf('/map') === -1) {\n            finderActive = false;\n            updateStatusUI('Paused (Outside Map)', '#ff9800');\n            return;\n        }"), 'pokefinder.user.js resumeMapHunting must guard with pathname');
assert(userJs.includes("if (window.location.pathname.indexOf('/map') === -1) {\n            finderActive = false;\n            return;\n        }"), 'pokefinder.user.js startAutoWalk must guard with pathname');

console.log('  [PASS] pokefinder.user.js includes outside-map roaming guards.');

console.log('--- ALL OUTSIDE MAP AUTO-PAUSE & CURSOR SAFETY TESTS PASSED! ---');

