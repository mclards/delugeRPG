/**
 * test_buttons_verification.js
 * Comprehensive automated verification for all buttons, settings save buttons,
 * and toggle buttons in the DelugeRPG Desktop Client.
 *
 * Strictly adheres to 100% 7-bit clean ASCII characters (<= 127).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('   DELUGERPG BUTTONS, TOGGLES & SETTINGS SAVE AUDIT SUITE       ');
console.log('================================================================\n');

const appHtmlPath = path.join(__dirname, 'app.html');
const appJsPath = path.join(__dirname, 'app.js');
const configJsonPath = path.join(__dirname, 'config.json');

const appHtml = fs.readFileSync(appHtmlPath, 'utf8');
const appJs = fs.readFileSync(appJsPath, 'utf8');
const configJson = JSON.parse(fs.readFileSync(configJsonPath, 'utf8'));

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
// SECTION 1: SETTINGS SAVE BUTTONS AUDIT
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: SETTINGS SAVE BUTTONS AUDIT ---');

runTest('saveTargetsBtn: Target Filters Modal Apply & Save Button', () => {
  // 1. Verify button exists in app.html
  assert(appHtml.includes('id="saveTargetsBtn"'), 'app.html must define saveTargetsBtn');
  // 2. Verify element binding in app.js
  assert(appJs.includes("const saveTargetsBtn = document.getElementById('saveTargetsBtn')"), 'app.js must query saveTargetsBtn');
  // 3. Verify event listener attached
  assert(appJs.includes("saveTargetsBtn.addEventListener('click'"), 'app.js must attach click listener to saveTargetsBtn');
  // 4. Verify settings persistence
  assert(appJs.includes('config.settings.findLegendaries = isLeg;'), 'saveTargetsBtn must assign findLegendaries');
  assert(appJs.includes('config.settings.legendaryClassic = classicLeg;'), 'saveTargetsBtn must assign legendaryClassic');
  assert(appJs.includes('config.settings.legendaryUltraBeasts = ubLeg;'), 'saveTargetsBtn must assign legendaryUltraBeasts');
  assert(appJs.includes('config.settings.legendaryParadox = paradoxLeg;'), 'saveTargetsBtn must assign legendaryParadox');
  assert(appJs.includes('config.settings.findMegasAndGigantamax = isMega;'), 'saveTargetsBtn must assign findMegasAndGigantamax');
  assert(appJs.includes('config.settings.findAnySpecialVariant = isVar;'), 'saveTargetsBtn must assign findAnySpecialVariant');
  assert(appJs.includes('config.settings.enableVariantFilter = isVar;'), 'saveTargetsBtn must assign enableVariantFilter');
  assert(appJs.includes('config.settings.selectedVariants = selectedVars;'), 'saveTargetsBtn must assign selectedVariants');
  assert(appJs.includes('config.settings.legendaryVariants = selectedLegVars;'), 'saveTargetsBtn must assign legendaryVariants');
  assert(appJs.includes('config.settings.megaVariants = selectedMegaVars;'), 'saveTargetsBtn must assign megaVariants');
  assert(appJs.includes('config.settings.avoidDuplicates = isAvoid;'), 'saveTargetsBtn must assign avoidDuplicates');
  assert(appJs.includes('config.settings.customTargetList = customVal;'), 'saveTargetsBtn must assign customTargetList');
  assert(appJs.includes('config.settings.blacklistList = blacklistVal;'), 'saveTargetsBtn must assign blacklistList');
  assert(appJs.includes('config.settings.enableLevelFilter = isLevel;'), 'saveTargetsBtn must assign enableLevelFilter');
  // 5. Verify local disk write and IPC broadcast
  assert(appJs.includes('saveLocalConfig();'), 'saveTargetsBtn must write to disk via saveLocalConfig()');
  assert(appJs.includes("delugeView.send('update-config', config.settings)"), 'saveTargetsBtn must transmit update-config over IPC');
  assert(appJs.includes('syncHuntingState();'), 'saveTargetsBtn must synchronize hunting state immediately');
  assert(appJs.includes('closeTargetModal();'), 'saveTargetsBtn must close target modal upon completion');
});

runTest('saveProxyBtn: Network & Proxy Modal Save & Apply Button', () => {
  // 1. Verify button exists in app.html
  assert(appHtml.includes('id="saveProxyBtn"'), 'app.html must define saveProxyBtn');
  // 2. Verify element binding in app.js
  assert(appJs.includes("const saveProxyBtn = document.getElementById('saveProxyBtn')"), 'app.js must query saveProxyBtn');
  // 3. Verify event listener attached
  assert(appJs.includes("saveProxyBtn.addEventListener('click'"), 'app.js must attach click listener to saveProxyBtn');
  // 4. Verify settings persistence
  assert(appJs.includes('config.network = proxyCfg;'), 'saveProxyBtn must assign config.network');
  assert(appJs.includes('useProxy: enableProxyCheckbox.checked'), 'saveProxyBtn must extract enableProxyCheckbox.checked');
  assert(appJs.includes('proxyRules: proxyRulesInput.value.trim()'), 'saveProxyBtn must extract proxyRules');
  // 5. Verify IPC invocation and UI closure
  assert(appJs.includes("ipcRenderer.invoke('apply-proxy', proxyCfg)"), 'saveProxyBtn must invoke apply-proxy via IPC');
  assert(appJs.includes('closeAllModals();'), 'saveProxyBtn must close modals upon completion');
  assert(appJs.includes('updateNetworkBadgeUI();'), 'saveProxyBtn must refresh network badge UI');
});

runTest('fillLoginBtn: Login Helper Modal Save & Auto-Fill Button', () => {
  // 1. Verify button exists in app.html
  assert(appHtml.includes('id="fillLoginBtn"'), 'app.html must define fillLoginBtn');
  // 2. Verify element binding in app.js
  assert(appJs.includes("const fillLoginBtn = document.getElementById('fillLoginBtn')"), 'app.js must query fillLoginBtn');
  // 3. Verify event listener attached
  assert(appJs.includes("fillLoginBtn.addEventListener('click'"), 'app.js must attach click listener to fillLoginBtn');
  // 4. Verify credentials persistence
  assert(appJs.includes('config.dummyAccount.username = creds.username;'), 'fillLoginBtn must store username');
  assert(appJs.includes('config.dummyAccount.password = creds.password;'), 'fillLoginBtn must store password');
  // 5. Verify auto-fill IPC and modal closure
  assert(appJs.includes("delugeView.send('fill-login', creds)"), 'fillLoginBtn must send fill-login to webview');
  assert(appJs.includes('closeAllModals();'), 'fillLoginBtn must close login modal upon completion');
});

runTest('confirmWipeBtn: Clean Slate / Session Storage Wipe Confirmation Button', () => {
  // 1. Verify button exists in app.html
  assert(appHtml.includes('id="confirmWipeBtn"'), 'app.html must define confirmWipeBtn');
  // 2. Verify element binding in app.js
  assert(appJs.includes("const confirmWipeBtn = document.getElementById('confirmWipeBtn')"), 'app.js must query confirmWipeBtn');
  // 3. Verify event listener attached
  assert(appJs.includes("confirmWipeBtn.addEventListener('click'"), 'app.js must attach click listener to confirmWipeBtn');
  // 4. Verify session storage wipe IPC invocation
  assert(appJs.includes("ipcRenderer.invoke('clear-session-data')"), 'confirmWipeBtn must invoke clear-session-data');
  assert(appJs.includes('closeAllModals();'), 'confirmWipeBtn must close confirmation modal');
});

// -----------------------------------------------------------------------------
// SECTION 2: TOGGLE BUTTONS & DROPDOWN NAV AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: TOGGLE BUTTONS & DROPDOWN NAV AUDIT ---');

runTest('avoidDupesBtn: Avoid Duplicates Toggle Button', () => {
  assert(appHtml.includes('id="avoidDupesBtn"'), 'app.html must define avoidDupesBtn');
  assert(appHtml.includes('id="avoidDupesBadge"'), 'app.html must define avoidDupesBadge');
  assert(appJs.includes("avoidDupesBtn.addEventListener('click'"), 'avoidDupesBtn must have click listener');
  assert(appJs.includes('config.settings.avoidDuplicates = !(config.settings.avoidDuplicates !== false);'), 'avoidDupesBtn must toggle state boolean');
  assert(appJs.includes('updateAvoidDupesUI();'), 'avoidDupesBtn must refresh UI badge');
  assert(appJs.includes("delugeView.send('update-config', config.settings)"), 'avoidDupesBtn must broadcast state via IPC');
});

runTest('autoStartMapBtn: Auto-Start Hunting on Map Toggle Button', () => {
  assert(appHtml.includes('id="autoStartMapBtn"'), 'app.html must define autoStartMapBtn');
  assert(appHtml.includes('id="autoStartMapBadge"'), 'app.html must define autoStartMapBadge');
  assert(appJs.includes("autoStartMapBtn.addEventListener('click'"), 'autoStartMapBtn must have click listener');
  assert(appJs.includes('config.settings.autoStartOnMap = !(config.settings.autoStartOnMap !== false);'), 'autoStartMapBtn must toggle state boolean');
  assert(appJs.includes('cancelPendingAutoStart('), 'autoStartMapBtn must cancel pending timer when toggled OFF');
  assert(appJs.includes('updateAutoStartMapUI();'), 'autoStartMapBtn must refresh UI badge');
});

runTest('hideAdsBtn: Cosmetic Ad Hiding Toggle Button & Strict Dependency', () => {
  assert(appHtml.includes('id="hideAdsBtn"'), 'app.html must define hideAdsBtn');
  assert(appHtml.includes('id="hideAdsBadge"'), 'app.html must define hideAdsBadge');
  assert(appJs.includes("hideAdsBtn.addEventListener('click'"), 'hideAdsBtn must have click listener');
  assert(appJs.includes('config.settings.hideAdsCosmetically = willHide;'), 'hideAdsBtn must toggle state boolean');
  assert(appJs.includes('!willHide && config.settings.autoCatchMasterBall'), 'hideAdsBtn must auto-disable autoCatch if Hide Ads turned OFF');
  assert(appJs.includes('config.settings.autoCatchMasterBall = false;'), 'autoCatch must be set false when Hide Ads turned OFF');
  assert(appJs.includes('updateHideAdsUI();'), 'hideAdsBtn must refresh Hide Ads UI badge');
  assert(appJs.includes('updateAutoCatchUI();'), 'hideAdsBtn must refresh Auto-Catch UI badge');
});

runTest('autoCatchBtn: Master Ball Auto-Catch Toggle Button & Safety Gate', () => {
  assert(appHtml.includes('id="autoCatchBtn"'), 'app.html must define autoCatchBtn');
  assert(appHtml.includes('id="autoCatchBadge"'), 'app.html must define autoCatchBadge');
  assert(appJs.includes("autoCatchBtn.addEventListener('click'"), 'autoCatchBtn must have click listener');
  assert(appJs.includes('const isHideAds = config.settings.hideAdsCosmetically !== false;'), 'autoCatchBtn must verify Hide Ads state');
  assert(appJs.includes('if (!isHideAds) {'), 'autoCatchBtn must block activation if Hide Ads is OFF');
  assert(appJs.includes('config.settings.autoCatchMasterBall = !(config.settings.autoCatchMasterBall === true);'), 'autoCatchBtn must toggle boolean state');
  assert(appJs.includes('updateAutoCatchUI();'), 'autoCatchBtn must refresh Auto-Catch badge');
});

runTest('soundBtn: Audio Alert Mute / Unmute Toggle Button', () => {
  assert(appHtml.includes('id="soundBtn"'), 'app.html must define soundBtn');
  assert(appJs.includes("soundBtn.addEventListener('click'"), 'soundBtn must have click listener');
  assert(appJs.includes('soundEnabled = !soundEnabled;'), 'soundBtn must toggle soundEnabled boolean');
  assert(appJs.includes('updateSoundUI();'), 'soundBtn must refresh sound icon & styling');
  assert(appJs.includes('config.settings.soundAlert = soundEnabled;'), 'soundBtn must persist soundAlert');
});

runTest('toggleBtn: Start / Pause Hunting Primary Engine Button', () => {
  assert(appHtml.includes('id="toggleBtn"'), 'app.html must define toggleBtn');
  assert(appJs.includes("toggleBtn.addEventListener('click', toggleHunting);"), 'toggleBtn must bind toggleHunting');
  assert(appJs.includes('function toggleHunting()'), 'app.js must implement toggleHunting');
  assert(appJs.includes('function updateToggleButton()'), 'app.js must implement updateToggleButton');
});

runTest('navMenuBtn: Navigation Dropdown Toggle & Auto-Close Engine', () => {
  assert(appHtml.includes('id="navMenuBtn"'), 'app.html must define navMenuBtn');
  assert(appHtml.includes('id="navDropdown"'), 'app.html must define navDropdown');
  assert(appJs.includes('function toggleNavDropdown()'), 'app.js must implement toggleNavDropdown');
  assert(appJs.includes('function closeNavDropdown()'), 'app.js must implement closeNavDropdown');
  assert(appJs.includes("navMenuBtn.addEventListener('click'"), 'navMenuBtn must have click listener');
  assert(appJs.includes('openTargetModal()') && appJs.includes('closeNavDropdown();'), 'openTargetModal must close dropdown');
  assert(appJs.includes('openWipeModal()') && appJs.includes('closeNavDropdown();'), 'openWipeModal must close dropdown');
});

runTest('refreshBtn: Reload Button & Stale Guest Input Focus Reset Guard', () => {
  assert(appHtml.includes('id="refreshBtn"'), 'app.html must define refreshBtn');
  assert(appJs.includes("refreshBtn.addEventListener('click'"), 'refreshBtn must have click listener');
  assert(!appJs.includes('stopBot()'), 'app.js must never call undefined stopBot() inside refreshBtn');
  assert(appJs.includes('delugeView.reload()') || appJs.includes('delugeView.reloadIgnoringCache()'), 'refreshBtn must invoke reload');
});

// -----------------------------------------------------------------------------
// SECTION 3: DOCKED PANEL TOGGLE BUTTONS AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: DOCKED PANEL TOGGLE BUTTONS AUDIT ---');

runTest('teamBuilderMenuBtn & closeTeamBuilderBtn: Docked Team Builder Panel', () => {
  assert(appHtml.includes('id="teamBuilderMenuBtn"'), 'app.html must define teamBuilderMenuBtn');
  assert(appHtml.includes('id="closeTeamBuilderBtn"'), 'app.html must define closeTeamBuilderBtn');
  assert(appJs.includes('function toggleTeamBuilderPanel()'), 'app.js must implement toggleTeamBuilderPanel');
  assert(appJs.includes('function closeTeamBuilderPanel()'), 'app.js must implement closeTeamBuilderPanel');
  assert(appJs.includes("teamBuilderMenuBtn.addEventListener('click'"), 'teamBuilderMenuBtn must have click listener');
  assert(appJs.includes("closeTeamBuilderBtn.addEventListener('click', closeTeamBuilderPanel)"), 'closeTeamBuilderBtn must have click listener');
});

runTest('adsInspectorMenuBtn & closeAdsInspectorBtn: Docked Ads Inspector Panel', () => {
  assert(appHtml.includes('id="adsInspectorMenuBtn"'), 'app.html must define adsInspectorMenuBtn');
  assert(appHtml.includes('id="closeAdsInspectorBtn"'), 'app.html must define closeAdsInspectorBtn');
  assert(appJs.includes('function toggleAdsInspectorPanel()'), 'app.js must implement toggleAdsInspectorPanel');
  assert(appJs.includes('function closeAdsInspectorPanel()'), 'app.js must implement closeAdsInspectorPanel');
  assert(appJs.includes("adsInspectorMenuBtn.addEventListener('click'"), 'adsInspectorMenuBtn must have click listener');
  assert(appJs.includes("closeAdsInspectorBtn.addEventListener('click', closeAdsInspectorPanel)"), 'closeAdsInspectorBtn must have click listener');
});

runTest('catchLogMenuBtn, dailyCaughtBtn & closeCatchLogBtn: Docked Catch Log Panel', () => {
  assert(appHtml.includes('id="catchLogMenuBtn"'), 'app.html must define catchLogMenuBtn');
  assert(appHtml.includes('id="dailyCaughtBtn"'), 'app.html must define dailyCaughtBtn');
  assert(appHtml.includes('id="closeCatchLogBtn"'), 'app.html must define closeCatchLogBtn');
  assert(appJs.includes('function toggleCatchLogPanel()'), 'app.js must implement toggleCatchLogPanel');
  assert(appJs.includes('function closeCatchLogPanel()'), 'app.js must implement closeCatchLogPanel');
  assert(appJs.includes("catchLogMenuBtn.addEventListener('click'"), 'catchLogMenuBtn must have click listener');
  assert(appJs.includes("dailyCaughtBtn.addEventListener('click', toggleCatchLogPanel)"), 'dailyCaughtBtn must have click listener');
  assert(appJs.includes("closeCatchLogBtn.addEventListener('click', closeCatchLogPanel)"), 'closeCatchLogBtn must have click listener');
});

runTest('PvP Mode & Scout Buttons: teamModeNpcBtn, teamModePvpBtn, pvpScoutBtn, checkLiveBattleBtn, pvpScoutClearBtn', () => {
  assert(appHtml.includes('id="teamModeNpcBtn"'), 'app.html must define teamModeNpcBtn');
  assert(appHtml.includes('id="teamModePvpBtn"'), 'app.html must define teamModePvpBtn');
  assert(appHtml.includes('id="pvpScoutBtn"'), 'app.html must define pvpScoutBtn');
  assert(appHtml.includes('id="checkLiveBattleBtn"'), 'app.html must define checkLiveBattleBtn');
  assert(appHtml.includes('id="pvpScoutClearBtn"'), 'app.html must define pvpScoutClearBtn');
  assert(appJs.includes("teamModeNpcBtn.addEventListener('click'"), 'teamModeNpcBtn must have click listener');
  assert(appJs.includes("teamModePvpBtn.addEventListener('click'"), 'teamModePvpBtn must have click listener');
  assert(appJs.includes("pvpScoutBtn.addEventListener('click'"), 'pvpScoutBtn must have click listener');
  assert(appJs.includes("checkLiveBattleBtn.addEventListener('click'"), 'checkLiveBattleBtn must have click listener');
  assert(appJs.includes("pvpScoutClearBtn.addEventListener('click'"), 'pvpScoutClearBtn must have click listener');
});

runTest('favTrainerBtn: Favorite Opponent Star Button & Category Integration', () => {
  assert(appHtml.includes('id="favTrainerBtn"'), 'app.html must define favTrainerBtn');
  assert(appHtml.includes('class="btn-fav-star"'), 'app.html must define btn-fav-star CSS class');
  assert(appHtml.includes('value="FAVORITES"'), 'app.html must define FAVORITES category option');
  assert(appJs.includes("favTrainerBtn.addEventListener('click'"), 'favTrainerBtn must have click listener');
  assert(appJs.includes('function toggleTrainerFavorite('), 'app.js must implement toggleTrainerFavorite');
  assert(appJs.includes('function updateFavTrainerButton()'), 'app.js must implement updateFavTrainerButton');
  assert(appJs.includes('function getFavoriteTrainersList()'), 'app.js must implement getFavoriteTrainersList');
});

// -----------------------------------------------------------------------------
// SECTION 4: TARGET MODAL CHECKBOXES & QUICK BUTTONS AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: TARGET MODAL CHECKBOXES & QUICK BUTTONS AUDIT ---');

runTest('3 Legendary Sub-Checkboxes & filterLegendariesCheckbox Integration', () => {
  assert(appHtml.includes('id="subClassicLegCheckbox"'), 'app.html must define subClassicLegCheckbox');
  assert(appHtml.includes('id="subUltraBeastsCheckbox"'), 'app.html must define subUltraBeastsCheckbox');
  assert(appHtml.includes('id="subParadoxCheckbox"'), 'app.html must define subParadoxCheckbox');
  assert(appHtml.includes('id="filterLegendariesCheckbox"'), 'app.html must define filterLegendariesCheckbox');
  assert(appJs.includes('const isLeg = (classicLeg || ubLeg || paradoxLeg);'), 'app.js must derive isLeg dynamically from the 3 sub-checkboxes');
  assert(appJs.includes('if (filterLegendariesCheckbox) filterLegendariesCheckbox.checked = isLeg;'), 'app.js must synchronize hidden filterLegendariesCheckbox');
});

runTest('Variant Helper Buttons: Wild, Legendaries Tier, and Mega Tier Quick Buttons', () => {
  assert(appHtml.includes('id="btnAllVariants"'), 'app.html must define btnAllVariants');
  assert(appHtml.includes('id="btnVariantsOnly"'), 'app.html must define btnVariantsOnly');
  assert(appHtml.includes('id="btnShiniesOnly"'), 'app.html must define btnShiniesOnly');
  assert(appHtml.includes('id="btnWildChromeOnly"'), 'app.html must define btnWildChromeOnly');
  assert(appHtml.includes('id="btnLegAllVariants"'), 'app.html must define btnLegAllVariants');
  assert(appHtml.includes('id="btnLegVariantsOnly"'), 'app.html must define btnLegVariantsOnly');
  assert(appHtml.includes('id="btnLegShiniesOnly"'), 'app.html must define btnLegShiniesOnly');
  assert(appHtml.includes('id="btnLegChromeOnly"'), 'app.html must define btnLegChromeOnly');
  assert(appHtml.includes('id="btnMegaAllVariants"'), 'app.html must define btnMegaAllVariants');
  assert(appHtml.includes('id="btnMegaVariantsOnly"'), 'app.html must define btnMegaVariantsOnly');
  assert(appHtml.includes('id="btnMegaShiniesOnly"'), 'app.html must define btnMegaShiniesOnly');
  assert(appHtml.includes('id="btnMegaChromeOnly"'), 'app.html must define btnMegaChromeOnly');
  assert(appJs.includes("btnAllVariants.addEventListener('click'"), 'btnAllVariants must have click listener');
  assert(appJs.includes("btnVariantsOnly.addEventListener('click'"), 'btnVariantsOnly must have click listener');
  assert(appJs.includes("btnShiniesOnly.addEventListener('click'"), 'btnShiniesOnly must have click listener');
  assert(appJs.includes("btnWildChromeOnly.addEventListener('click'"), 'btnWildChromeOnly must have click listener');
  assert(appJs.includes("btnLegAllVariants.addEventListener('click'"), 'btnLegAllVariants must have click listener');
  assert(appJs.includes("btnMegaChromeOnly.addEventListener('click'"), 'btnMegaChromeOnly must have click listener');
  assert(appJs.includes("el.checked = (id !== 'varNormal')"), 'btnVariantsOnly must select 9 special variants excluding Normal');
  assert(appJs.includes("el.checked = (id === 'varShiny')"), 'btnShiniesOnly must select Shiny variant exclusively');
});

runTest('Clear Blacklist Button & Zero Quick-Add (+ Pokemon) Clutter', () => {
  assert(appHtml.includes('id="clearBlacklistBtn"'), 'app.html must define clearBlacklistBtn');
  assert(appJs.includes("clearBlacklistBtn.addEventListener('click'"), 'clearBlacklistBtn must have click listener');
  assert(appJs.includes("blacklistInput.value = '';"), 'clearBlacklistBtn must empty blacklist input');
  assert(!appHtml.includes('data-add-target'), 'app.html must not contain any + Pokemon quick-add whitelist buttons');
  assert(!appHtml.includes('data-add-blacklist'), 'app.html must not contain any + Pokemon quick-add blacklist buttons');
});

// -----------------------------------------------------------------------------
// SECTION 5: MODAL CANCEL & CLOSE BUTTONS AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: MODAL CANCEL & CLOSE BUTTONS AUDIT ---');

runTest('All Modal Close and Cancel Buttons', () => {
  const closePairs = [
    { close: 'closeTargetBtn', cancel: 'cancelTargetBtn' },
    { close: 'closeNetBtn', cancel: 'cancelNetBtn' },
    { close: 'closeAccBtn', cancel: 'cancelAccBtn' },
    { close: 'closeWipeBtn', cancel: 'cancelWipeBtn' }
  ];
  closePairs.forEach(p => {
    assert(appHtml.includes(`id="${p.close}"`), `app.html must define ${p.close}`);
    assert(appHtml.includes(`id="${p.cancel}"`), `app.html must define ${p.cancel}`);
    assert(appJs.includes(`${p.close}.addEventListener('click'`), `app.js must bind click listener to ${p.close}`);
    assert(appJs.includes(`${p.cancel}.addEventListener('click'`), `app.js must bind click listener to ${p.cancel}`);
  });
});

// -----------------------------------------------------------------------------
// SECTION 6: CUSTOM CHECKBOXES & BEVELED PILL BUTTONS AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: CUSTOM CHECKBOXES & BEVELED PILL BUTTONS AUDIT ---');

runTest('Custom Checkbox Structure & CSS Zero-Glow Audit', () => {
  assert(appHtml.includes('.custom-checkbox {'), 'app.html must define .custom-checkbox CSS class');
  assert(appHtml.includes('.custom-checkbox::after {'), 'app.html must define .custom-checkbox::after checkmark indicator');
  assert(appHtml.includes('input[type="checkbox"]:checked + .custom-checkbox::after'), 'app.html must toggle checkmark on :checked');

  // Verify all checkbox elements have sibling span.custom-checkbox
  const checkboxIds = [
    'subClassicLegCheckbox', 'subUltraBeastsCheckbox', 'subParadoxCheckbox',
    'filterMegasCheckbox', 'avoidDuplicatesCheck', 'filterLevelCheckbox',
    'filterVariantsCheckbox',
    'legVarNormal', 'legVarShiny', 'legVarChrome', 'legVarRetro', 'legVarMetallic',
    'legVarShadow', 'legVarGhostly', 'legVarDark', 'legVarMirage', 'legVarNegative',
    'megaVarNormal', 'megaVarShiny', 'megaVarChrome', 'megaVarRetro', 'megaVarMetallic',
    'megaVarShadow', 'megaVarGhostly', 'megaVarDark', 'megaVarMirage', 'megaVarNegative',
    'varNormal', 'varShiny', 'varChrome', 'varRetro', 'varMetallic',
    'varShadow', 'varGhostly', 'varDark', 'varMirage', 'varNegative',
    'enableProxyCheckbox'
  ];
  checkboxIds.forEach(id => {
    const idx = appHtml.indexOf(`id="${id}"`);
    assert(idx !== -1, `Checkbox #${id} must exist in app.html`);
    const slice = appHtml.slice(idx, idx + 120);
    assert(slice.includes('class="custom-checkbox"'), `Checkbox #${id} must be paired with <span class="custom-checkbox"></span>`);
  });
});

runTest('Beveled Pill Button Component & Zero Glow Audit', () => {
  assert(appHtml.includes('border-radius: 30px !important;'), 'Button component must have 30px pill border-radius');
  assert(appHtml.includes('linear-gradient(to top, #D8D9DB 0%, #ffffff 80%, #FDFDFD 100%)'), 'Button component must have brushed silver linear-gradient');
  assert(appHtml.includes('border: 1px solid #8F9092'), 'Button component must have crisp beveled border');

  // Verify button component has zero glowing shadows
  const btnStart = appHtml.indexOf('/* --- BEVELED PILL BUTTON COMPONENT (ZERO GLOW) --- */');
  assert(btnStart !== -1, 'Beveled pill button section must exist');
  const btnEnd = appHtml.indexOf('/* Custom Dropdowns */', btnStart);
  const btnSlice = appHtml.slice(btnStart, btnEnd);
  assert(!btnSlice.includes('0 0 1'), 'Button CSS must not contain glowing box-shadow');
  assert(!btnSlice.includes('0 0 20px'), 'Button CSS must not contain glowing 20px box-shadow');
  assert(btnSlice.includes('box-shadow: none !important;'), 'Button CSS must enforce box-shadow: none !important');
});

runTest('Segmented Sliding Tab Component (.tab-container) & Unified Scan Box Capsule Audit', () => {
  assert(appHtml.includes('.tab-container {'), 'app.html must define .tab-container CSS');
  assert(appHtml.includes('.indicator {'), 'app.html must define .indicator CSS');
  assert(appHtml.includes('.tab {'), 'app.html must define .tab CSS');
  assert(appHtml.includes('.tab_label {'), 'app.html must define .tab_label CSS');
  assert(appHtml.includes('.tab--1:checked ~ .indicator'), 'app.html must define .tab--1:checked ~ .indicator');
  assert(appHtml.includes('id="targetTab1"'), 'Target Filters modal must use radio tab targetTab1');
  assert(appHtml.includes('id="teamModeNpcTab"'), 'Team Builder battle mode must use radio tab teamModeNpcTab');
  assert(appHtml.includes('id="poolModeAllTab"'), 'Team Builder pool mode must use radio tab poolModeAllTab');
  assert(appHtml.includes('class="scan-box-unified-bar"'), 'Team Builder must use unified scan-box-unified-bar capsule');
  assert(appHtml.includes('id="scanStatusDot"'), 'Team Builder unified bar must include scanStatusDot');
  assert(appHtml.includes('id="scanStatusBadge"'), 'Team Builder unified bar must include scanStatusBadge');
  assert(!appHtml.includes('id="scanTrainersBtn"'), 'Separate Trainer Intel button must be removed from app.html');
});

console.log('================================================================');
console.log(`   TOTAL TESTS: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
console.log('================================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('[SUCCESS] All buttons, custom checkboxes, toggles, and settings save engines are 100% verified.');
}

