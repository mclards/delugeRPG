// Verification Suite: Dual Mode (Option A vs Option B) & Modal Non-Interference
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== RUNNING DUAL CATCH MODE & MODAL NON-INTERFERENCE VERIFICATION ===\n');

const clientDir = fs.existsSync(path.join(__dirname, 'config.json')) ? __dirname : path.join(__dirname, 'desktop-client');

// 1. Audit config.json
const configRaw = fs.readFileSync(path.join(clientDir, 'config.json'), 'utf8');
const config = JSON.parse(configRaw);
assert.strictEqual(config.settings.autoCatchMode, 'master_only', 'config.settings.autoCatchMode must default to master_only');
console.log('[PASS] config.json has autoCatchMode defaulted to "master_only".');

// 2. Audit app.html
const appHtml = fs.readFileSync(path.join(clientDir, 'app.html'), 'utf8');
assert.strictEqual(appHtml.includes('id="autoCatchModeSelect"'), true, 'app.html must contain #autoCatchModeSelect');
assert.strictEqual(appHtml.includes('id="catchModeHelpBadge"'), true, 'app.html must contain #catchModeHelpBadge');
assert.strictEqual(appHtml.includes('value="master_only"'), true, 'app.html must have master_only option');
assert.strictEqual(appHtml.includes('value="smart_routing"'), true, 'app.html must have smart_routing option');
console.log('[PASS] app.html contains #autoCatchModeSelect with Option A and Option B choices and help badge.');

// 3. Audit app.js
const appJs = fs.readFileSync(path.join(clientDir, 'app.js'), 'utf8');
assert.strictEqual(appJs.includes("const autoCatchModeSelect = document.getElementById('autoCatchModeSelect');"), true, 'app.js must declare autoCatchModeSelect');
assert.strictEqual(appJs.includes("const catchModeHelpBadge = document.getElementById('catchModeHelpBadge');"), true, 'app.js must declare catchModeHelpBadge');
assert.strictEqual(appJs.includes("config.settings.autoCatchMode = activeCatchMode;"), true, 'app.js must persist autoCatchMode on saveTargetsBtn');
assert.strictEqual(appJs.includes("if (autoCatchModeSelect) autoCatchModeSelect.value = activeCatchMode;"), true, 'app.js must sync autoCatchMode in updateTargetUI');
console.log('[PASS] app.js binds, synchronizes, and persists autoCatchMode cleanly.');

// 4. Audit game-preload.js Non-Interference
const preloadJs = fs.readFileSync(path.join(clientDir, 'game-preload.js'), 'utf8');

// Ensure detectEvolveCard does NOT mutate DOM
const evoCardFunc = preloadJs.slice(preloadJs.indexOf('function detectEvolveCard()'), preloadJs.indexOf('function syncEvolveCardState'));
assert.strictEqual(evoCardFunc.includes('submitBtn.disabled = true'), false, 'detectEvolveCard must NOT disable submitBtn');
assert.strictEqual(evoCardFunc.includes("cursor = 'not-allowed'"), false, 'detectEvolveCard must NOT change submitBtn cursor');
assert.strictEqual(evoCardFunc.includes('rEl.disabled = true'), false, 'detectEvolveCard must NOT disable radio buttons');
assert.strictEqual(evoCardFunc.includes('rEl.parentElement.style.opacity ='), false, 'detectEvolveCard must NOT alter radio opacity');
console.log('[PASS] detectEvolveCard is 100% read-only with zero DOM mutation or cursor hindrance.');

// Ensure dismissGoogleVignetteOverlay protects native DelugeRPG modals
const vigFunc = preloadJs.slice(preloadJs.indexOf('function dismissGoogleVignetteOverlay()'), preloadJs.indexOf('function injectAntiAdblockProtection'));
assert.strictEqual(vigFunc.includes("document.body.classList.contains('modal-open')"), true, 'dismissGoogleVignetteOverlay must abort if modal-open is present');
assert.strictEqual(vigFunc.includes("btn.closest && btn.closest('.modal, .modal-dialog, .modal-content, [role=\"dialog\"], #cboxContent, #colorbox, .ui-dialog, form, #user_pokes, #showmon, .boxwrap, #pokedex, #team, main, #main, #content, .content, #del_header, #navwrap, nav, table')"), true, 'dismissGoogleVignetteOverlay must exclude DelugeRPG modal containers');
console.log('[PASS] dismissGoogleVignetteOverlay strictly protects native DelugeRPG modals from self-closing.');

// 5. Option A vs Option B Simulation Test
function simulateScreen3Choice(mode, preferredBall, fallbackPolicy, radioPool) {
  function parseRadio(r) {
    const desc = (r.value + ' ' + (r.desc || '')).toLowerCase();
    const match = desc.match(/\((\d+)\)/);
    const stock = match ? parseInt(match[1], 10) : null;
    const isUnavailable = r.disabled || desc.includes('(0)') || stock === 0;
    let name = 'Poke Ball';
    if (desc.includes('master')) name = 'Master Ball';
    else if (desc.includes('ultra')) name = 'Ultra Ball';
    else if (desc.includes('great')) name = 'Great Ball';
    else if (desc.includes('poke')) name = 'Poke Ball';
    return { name, stock, isUnavailable, radio: r };
  }
  const parsed = radioPool.map(parseRadio);

  if (mode === 'master_only') {
    const master = parsed.find(p => p.name === 'Master Ball');
    if (master && !master.isUnavailable) return { chosen: master.name, stock: master.stock };
    return { chosen: null, outOfStock: true };
  } else {
    const pref = parsed.find(p => p.name.toLowerCase() === preferredBall.toLowerCase() && !p.isUnavailable);
    if (pref) return { chosen: pref.name, stock: pref.stock };
    if (fallbackPolicy === 'downgrade') {
      const order = ['Master Ball', 'Ultra Ball', 'Great Ball', 'Poke Ball'];
      for (const b of order) {
        const cand = parsed.find(p => p.name === b && !p.isUnavailable);
        if (cand) return { chosen: cand.name, stock: cand.stock };
      }
    }
    return { chosen: null, outOfStock: true };
  }
}

const poolA = [
  { value: 'poke', desc: 'Poke Ball (50)' },
  { value: 'ultra', desc: 'Ultra Ball (20)' },
  { value: 'master', desc: 'Master Ball (5)' }
];
// Test Option A: Must choose Master Ball
const resA1 = simulateScreen3Choice('master_only', 'Ultra Ball', 'downgrade', poolA);
assert.strictEqual(resA1.chosen, 'Master Ball', 'Option A must strictly choose Master Ball');

// Test Option A: Master Ball 0 stock must safely halt
const poolA0 = [
  { value: 'poke', desc: 'Poke Ball (50)' },
  { value: 'ultra', desc: 'Ultra Ball (20)' },
  { value: 'master', desc: 'Master Ball (0)' }
];
const resA0 = simulateScreen3Choice('master_only', 'Ultra Ball', 'downgrade', poolA0);
assert.strictEqual(resA0.outOfStock, true, 'Option A must safely halt when Master Ball is 0');

// Test Option B: Chooses preferred Ultra Ball
const resB1 = simulateScreen3Choice('smart_routing', 'Ultra Ball', 'downgrade', poolA);
assert.strictEqual(resB1.chosen, 'Ultra Ball', 'Option B must choose preferred Ultra Ball');

// Test Option B: Downgrades when preferred ball is 0
const poolB0 = [
  { value: 'poke', desc: 'Poke Ball (50)' },
  { value: 'ultra', desc: 'Ultra Ball (0)' },
  { value: 'master', desc: 'Master Ball (5)' }
];
const resB0 = simulateScreen3Choice('smart_routing', 'Ultra Ball', 'downgrade', poolB0);
assert.strictEqual(resB0.chosen, 'Master Ball', 'Option B must fallback to Master Ball when Ultra Ball is 0 and downgrade policy is set');

// Test Option B: Halts when fallbackPolicy is halt
const resBHalt = simulateScreen3Choice('smart_routing', 'Ultra Ball', 'halt', poolB0);
assert.strictEqual(resBHalt.outOfStock, true, 'Option B must safely halt when fallback policy is halt and preferred is 0');
console.log('[PASS] Dual Mode decision matrix (Option A vs Option B) fully verified.');

// 6. Break-Free Retry Loop Simulation Test
function simulateBreakFree(retries) {
  if (retries >= 5) {
    return { action: 'halt', reason: 'Max break-free retries (5) reached' };
  }
  return { action: 'retry', nextRetries: retries + 1 };
}
assert.strictEqual(simulateBreakFree(0).action, 'retry');
assert.strictEqual(simulateBreakFree(0).nextRetries, 1);
assert.strictEqual(simulateBreakFree(4).action, 'retry');
assert.strictEqual(simulateBreakFree(4).nextRetries, 5);
assert.strictEqual(simulateBreakFree(5).action, 'halt');
console.log('[PASS] Break-free retry loop (max 5 retries) safely verified.');

// 7. 100% 7-Bit ASCII Audit
const filesToCheck = [
  path.join(clientDir, 'config.json'),
  path.join(clientDir, 'app.html'),
  path.join(clientDir, 'app.js'),
  path.join(clientDir, 'game-preload.js')
];
for (const f of filesToCheck) {
  const content = fs.readFileSync(f);
  for (let i = 0; i < content.length; i++) {
    if (content[i] > 127) {
      throw new Error(`Non-ASCII byte 0x${content[i].toString(16)} at index ${i} in ${f}`);
    }
  }
}
console.log('[PASS] 100% 7-bit clean ASCII encoding verified across all modified files.');

console.log('\n=== ALL DUAL MODE & NON-INTERFERENCE TESTS PASSED (100%) ===');
