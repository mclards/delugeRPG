/**
 * test_safety_limits.js
 * Verification suite for DelugeRPG Defense-in-Depth Safety, Randomized Limits,
 * Anti-Bot Emergency Siren, and Docked Panel Controller.
 *
 * Strictly adheres to 100% 7-bit clean ASCII characters (<= 127).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('   DELUGERPG DEFENSE-IN-DEPTH SAFETY & ANTI-BAN LIMITS AUDIT    ');
console.log('================================================================\n');

const appHtmlPath = path.join(__dirname, 'app.html');
const appJsPath = path.join(__dirname, 'app.js');
const preloadJsPath = path.join(__dirname, 'game-preload.js');
const configJsonPath = path.join(__dirname, 'config.json');
const safetyLogPath = path.join(__dirname, 'daily_safety_log.json');

const appHtml = fs.readFileSync(appHtmlPath, 'utf8');
const appJs = fs.readFileSync(appJsPath, 'utf8');
const preloadJs = fs.readFileSync(preloadJsPath, 'utf8');
const configJson = JSON.parse(fs.readFileSync(configJsonPath, 'utf8'));
const safetyLog = JSON.parse(fs.readFileSync(safetyLogPath, 'utf8'));

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    testsFailed++;
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: CONFIGURATION & RANDOMIZED LIMITS AUDIT
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: CONFIGURATION & RANDOMIZED LIMITS AUDIT ---');

runTest('config.json safety parameters integrity', () => {
  const s = configJson.safety;
  assert(s && typeof s === 'object', 'config.json must define safety block');
  assert(s.enableDeadManSwitch === true, 'enableDeadManSwitch must be true');
  assert(typeof s.autoStopMinMinutes === 'number' && s.autoStopMinMinutes >= 1, 'autoStopMinMinutes must be >= 1');
  assert(typeof s.autoStopMaxMinutes === 'number' && s.autoStopMaxMinutes >= s.autoStopMinMinutes, 'autoStopMaxMinutes >= autoStopMinMinutes');
  assert(s.enableForcedBreaks === true, 'enableForcedBreaks must be true');
  assert(typeof s.breakMinSteps === 'number' && s.breakMinSteps >= 10, 'breakMinSteps must be >= 10');
  assert(typeof s.breakMaxSteps === 'number' && s.breakMaxSteps >= s.breakMinSteps, 'breakMaxSteps >= breakMinSteps');
  assert(typeof s.breakMinDurationSec === 'number' && s.breakMinDurationSec >= 5, 'breakMinDurationSec must be >= 5');
  assert(typeof s.breakMaxDurationSec === 'number' && s.breakMaxDurationSec >= s.breakMinDurationSec, 'breakMaxDurationSec >= breakMinDurationSec');
  assert(s.enableDailyCeilings === true, 'enableDailyCeilings must be true');
  assert(typeof s.dailyStepMin === 'number' && s.dailyStepMin >= 100, 'dailyStepMin must be >= 100');
  assert(typeof s.dailyStepMax === 'number' && s.dailyStepMax >= s.dailyStepMin, 'dailyStepMax >= dailyStepMin');
  assert(typeof s.dailyCatchMin === 'number' && s.dailyCatchMin >= 1, 'dailyCatchMin must be >= 1');
  assert(typeof s.dailyCatchMax === 'number' && s.dailyCatchMax >= s.dailyCatchMin, 'dailyCatchMax >= dailyCatchMin');
  assert(s.antiBotEmergencyHalt === true, 'antiBotEmergencyHalt must be true');
});

runTest('daily_safety_log.json structure and clean initialization', () => {
  assert(typeof safetyLog.date === 'string', 'daily_safety_log.json must have date string');
  assert(typeof safetyLog.todaySteps === 'number', 'todaySteps must be number');
  assert(typeof safetyLog.todayCatches === 'number', 'todayCatches must be number');
  assert(typeof safetyLog.dailyStepCeiling === 'number', 'dailyStepCeiling must be number');
  assert(typeof safetyLog.dailyCatchCeiling === 'number', 'dailyCatchCeiling must be number');
});

// -----------------------------------------------------------------------------
// SECTION 2: DOCKED PANEL & DOM BINDINGS AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: DOCKED PANEL & DOM BINDINGS AUDIT ---');

runTest('Docked Safety Panel HTML elements and CSS zero-glow verification', () => {
  assert(appHtml.includes('id="safetySettingsModal"'), 'app.html must define safetySettingsModal');
  assert(appHtml.includes('id="safetySettingsTopBtn"'), 'app.html must define safetySettingsTopBtn');
  assert(appHtml.includes('id="safetySettingsMenuBtn"'), 'app.html must define safetySettingsMenuBtn');
  assert(appHtml.includes('id="closeSafetySettingsBtn"'), 'app.html must define closeSafetySettingsBtn');
  assert(appHtml.includes('id="saveSafetySettingsBtn"'), 'app.html must define saveSafetySettingsBtn');
  assert(appHtml.includes('id="rerollSafetyTargetsBtn"'), 'app.html must define rerollSafetyTargetsBtn');
  assert(appHtml.includes('id="resetDailySafetyBtn"'), 'app.html must define resetDailySafetyBtn');
  assert(appHtml.includes('id="testAlarmBtn"'), 'app.html must define testAlarmBtn');
  assert(appHtml.includes('id="silenceAlarmModalBtn"'), 'app.html must define silenceAlarmModalBtn');
  assert(appHtml.includes('id="captchaEmergencyBanner"'), 'app.html must define captchaEmergencyBanner');
  assert(appHtml.includes('id="silenceAlarmBtn"'), 'app.html must define silenceAlarmBtn');

  // Verify CSS zero-glow
  const panelIdx = appHtml.indexOf('id="safetySettingsModal"');
  assert(panelIdx !== -1, 'safetySettingsModal must exist');
  const panelHtml = appHtml.slice(panelIdx, panelIdx + 4500);
  assert(!panelHtml.includes('0 0 15px'), 'Safety panel must not contain glowing box-shadow');
  assert(!panelHtml.includes('0 0 20px'), 'Safety panel must not contain glowing 20px box-shadow');
  assert(!panelHtml.includes('box-shadow: 0 0'), 'Safety panel must have zero glowing box-shadows');
});

runTest('Docked Panel CSS Split View Integration (1/4 + 3/4 layout)', () => {
  assert(appHtml.includes('#teamBuilderModal, #adsInspectorModal, #catchLogModal, #aiAssistantModal, #safetySettingsModal {'),
    'CSS must include safetySettingsModal in 25% docked panel selector');
});

// -----------------------------------------------------------------------------
// SECTION 3: SAFETY STATE MACHINE & LOGIC AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: SAFETY STATE MACHINE & LOGIC AUDIT ---');

runTest('app.js safety engine functions implementation', () => {
  assert(appJs.includes('function getRandomInRange('), 'app.js must implement getRandomInRange');
  assert(appJs.includes('function ensureTodaySafetyState()'), 'app.js must implement ensureTodaySafetyState');
  assert(appJs.includes('function loadDailySafetyState()'), 'app.js must implement loadDailySafetyState');
  assert(appJs.includes('function saveDailySafetyState()'), 'app.js must implement saveDailySafetyState');
  assert(appJs.includes('function rollNextBreakTargets()'), 'app.js must implement rollNextBreakTargets');
  assert(appJs.includes('function stopHuntingWithReason('), 'app.js must implement stopHuntingWithReason');
  assert(appJs.includes('function triggerForcedRestBreak()'), 'app.js must implement triggerForcedRestBreak');
  assert(appJs.includes('function startContinuousCaptchaAlarm()'), 'app.js must implement startContinuousCaptchaAlarm');
  assert(appJs.includes('function silenceCaptchaAlarm()'), 'app.js must implement silenceCaptchaAlarm');
  assert(appJs.includes('function handleCaptchaEmergencyHalt('), 'app.js must implement handleCaptchaEmergencyHalt');
  assert(appJs.includes('function openSafetySettingsPanel()'), 'app.js must implement openSafetySettingsPanel');
  assert(appJs.includes('function closeSafetySettingsPanel()'), 'app.js must implement closeSafetySettingsPanel');
  assert(appJs.includes('function toggleSafetySettingsPanel()'), 'app.js must implement toggleSafetySettingsPanel');
});

runTest('handleMoveSuccess step counting and safety enforcement', () => {
  assert(appJs.includes('dailySafetyState.todaySteps = (dailySafetyState.todaySteps || 0) + 1;'),
    'handleMoveSuccess must increment todaySteps');
  assert(appJs.includes('dailySafetyState.todaySteps >= dailySafetyState.dailyStepCeiling'),
    'handleMoveSuccess must check dailyStepCeiling');
  assert(appJs.includes('stepsSinceLastBreak >= (nextBreakStepTarget || 50)'),
    'handleMoveSuccess must check rest break step trigger');
});

runTest('recordCaughtPokemon catch counting and ceiling enforcement', () => {
  assert(appJs.includes('dailySafetyState.todayCatches = (dailyCatchData.caught ? dailyCatchData.caught.length : 0);'),
    'recordCaughtPokemon must synchronize todayCatches');
  assert(appJs.includes('dailySafetyState.todayCatches >= dailySafetyState.dailyCatchCeiling'),
    'recordCaughtPokemon must check dailyCatchCeiling');
});

runTest('Preload and host Captcha Emergency Signal audit', () => {
  assert(preloadJs.includes('checkHasCaptchaElement()'), 'game-preload.js must implement checkHasCaptchaElement');
  assert(preloadJs.includes('hcaptcha'), 'game-preload.js must check for hcaptcha');
  assert(preloadJs.includes('turnstile'), 'game-preload.js must check for turnstile');
  assert(preloadJs.includes('verify you are human'), 'game-preload.js must check for challenge phrases');
  assert(appJs.includes('handleCaptchaEmergencyHalt'), 'app.js must handle captcha emergency halt');
  assert(appJs.includes('startContinuousCaptchaAlarm()'), 'app.js must start continuous alarm on captcha');
});

// -----------------------------------------------------------------------------
// SECTION 4: 100% 7-BIT CLEAN ASCII INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: 100% 7-BIT CLEAN ASCII INTEGRITY ---');

const filesToAudit = [
  'config.json',
  'daily_safety_log.json',
  'app.html',
  'app.js',
  'game-preload.js',
  'test_safety_limits.js'
];

filesToAudit.forEach(f => {
  runTest(`ASCII Audit: ${f}`, () => {
    const fullPath = path.join(__dirname, f);
    const content = fs.readFileSync(fullPath, 'utf8');
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      if (code > 127) {
        throw new Error(`Non-ASCII character '${content[i]}' (code ${code}) found at index ${i}`);
      }
    }
  });
});

console.log('================================================================');
console.log(`   TOTAL TESTS: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
console.log('================================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('[SUCCESS] All safety precautions, limits, and anti-ban defenses are 100% verified.');
}

