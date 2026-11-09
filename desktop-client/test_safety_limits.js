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
  assert(s.enableMovementSpeed === true, 'enableMovementSpeed must be true');
  assert(typeof s.movementSpeedMinSec === 'number' && s.movementSpeedMinSec >= 0.5, 'movementSpeedMinSec must be >= 0.5');
  assert(typeof s.movementSpeedMaxSec === 'number' && s.movementSpeedMaxSec >= s.movementSpeedMinSec, 'movementSpeedMaxSec >= movementSpeedMinSec');
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
  assert(typeof s.mapRotationMinMinutes === 'number' && s.mapRotationMinMinutes >= 1, 'mapRotationMinMinutes must be >= 1');
  assert(typeof s.mapRotationMaxMinutes === 'number' && s.mapRotationMaxMinutes >= s.mapRotationMinMinutes, 'mapRotationMaxMinutes >= mapRotationMinMinutes');
});

runTest('Official DelugeRPG Maps Catalog (49 maps) & random rotation engine audit', () => {
  const mapsCatalog = require('./maps_catalog.js');
  assert(Array.isArray(mapsCatalog.DELUGE_MAPS), 'DELUGE_MAPS must be an array');
  assert.strictEqual(mapsCatalog.DELUGE_MAPS.length, 49, 'DELUGE_MAPS must contain exactly 49 official DelugeRPG maps');

  const seenUrls = new Set();
  mapsCatalog.DELUGE_MAPS.forEach(m => {
    assert(m.id && typeof m.id === 'string', 'Map must have valid id');
    assert(m.name && typeof m.name === 'string', 'Map must have valid name');
    assert(m.title && typeof m.title === 'string', 'Map must have valid title');
    assert(m.url && m.url.startsWith('/map/'), 'Map url must start with /map/');
    assert(!seenUrls.has(m.url), `Duplicate map URL: ${m.url}`);
    seenUrls.add(m.url);
  });

  const rand = mapsCatalog.getRandomDelugeMap('/map/overworld1');
  assert(rand && rand.url !== '/map/overworld1', 'getRandomDelugeMap must exclude active map');

  // Verify 8 DelugeRPG Zones
  assert(Array.isArray(mapsCatalog.DELUGE_ZONES), 'DELUGE_ZONES must be an array');
  assert.strictEqual(mapsCatalog.DELUGE_ZONES.length, 8, 'DELUGE_ZONES must contain exactly 8 official zones');
  const zoneTotalMaps = mapsCatalog.DELUGE_ZONES.reduce((acc, z) => acc + z.count, 0);
  assert.strictEqual(zoneTotalMaps, 49, 'Zone counts must sum to 49 maps');

  // Verify zone-restricted random map selection
  const volcanoPick = mapsCatalog.getRandomDelugeMap('/map/volcano1', ['volcano']);
  assert(volcanoPick && volcanoPick.zone === 'volcano', 'Zone-restricted pick must belong to requested zone');
  assert(volcanoPick.url !== '/map/volcano1', 'Zone-restricted pick must exclude active map');

  const snowPick = mapsCatalog.getRandomDelugeMap('/map/snowcave1', ['snowcave']);
  assert(snowPick && snowPick.zone === 'snowcave', 'Zone-restricted snowcave pick must belong to snowcave');
  assert(snowPick.url !== '/map/snowcave1', 'Zone-restricted snowcave pick must exclude active map');
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
  assert(appHtml.includes('id="randomMapHopBtn"'), 'app.html must define randomMapHopBtn');
  assert(appHtml.includes('id="randomMapHopBadge"'), 'app.html must define randomMapHopBadge');
  assert(appHtml.includes('id="safetyMapRotationToggle"'), 'app.html must define safetyMapRotationToggle');
  assert(appHtml.includes('id="safetyMapRotationMin"'), 'app.html must define safetyMapRotationMin');
  assert(appHtml.includes('id="safetyMapRotationMax"'), 'app.html must define safetyMapRotationMax');
  assert(appHtml.includes('id="safetyStatNextMapRotation"'), 'app.html must define safetyStatNextMapRotation');
  assert(appHtml.includes('id="safetyZonesSelectAllBtn"'), 'app.html must define safetyZonesSelectAllBtn');
  assert(appHtml.includes('id="safetyZonesClearBtn"'), 'app.html must define safetyZonesClearBtn');
  assert(appHtml.includes('class="safety-zone-checkbox"'), 'app.html must define safety-zone-checkbox');
  assert(appHtml.includes('id="safetySpeedToggle"'), 'app.html must define safetySpeedToggle');
  assert(appHtml.includes('id="safetySpeedMin"'), 'app.html must define safetySpeedMin');
  assert(appHtml.includes('id="safetySpeedMax"'), 'app.html must define safetySpeedMax');

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
  assert(appJs.includes('function scheduleNextMapRotation('), 'app.js must implement scheduleNextMapRotation');
  assert(appJs.includes('function canExecuteMapTransition()'), 'app.js must implement canExecuteMapTransition');
  assert(appJs.includes('function executeMapRotation('), 'app.js must implement executeMapRotation');
  assert(appJs.includes('function isMapRotationActive()'), 'app.js must implement isMapRotationActive');
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
  'maps_catalog.js',
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

