// app.js - Host controller for the hardened standalone desktop client
// Incorporates Gaussian cadence, human fatigue drift, micro-breaks, and network proxy management

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const teamEngine = require('./team_engine.js');
const mapsCatalog = require('./maps_catalog.js');

function deepMerge(target, source) {
  const output = Object.assign({}, target);
  if (source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

let CONFIG_PATH = path.join(__dirname, 'config.json');
try {
  const { ipcRenderer } = require('electron');
  if (ipcRenderer) {
    const resolvedPath = ipcRenderer.sendSync('get-config-path-sync');
    if (resolvedPath) {
      CONFIG_PATH = resolvedPath;
    }
  }
} catch (e) {
  console.warn('Fallback to local config.json path:', e);
}

function getWritableDataPath(filename) {
  try {
    const userDataDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    return path.join(userDataDir, filename);
  } catch (_) {
    return path.join(__dirname, filename);
  }
}

function readDataFile(filename) {
  const userPath = getWritableDataPath(filename);
  if (fs.existsSync(userPath)) {
    try {
      return fs.readFileSync(userPath, 'utf8');
    } catch (_) {}
  }
  const bundledPath = path.join(__dirname, filename);
  if (fs.existsSync(bundledPath)) {
    try {
      return fs.readFileSync(bundledPath, 'utf8');
    } catch (_) {}
  }
  return null;
}

let config = {
  dummyAccount: { username: "PokeDen", password: "sacups2026", autoLogin: false },
  network: { useProxy: false, proxyRules: "", proxyBypass: "<local>" },
  settings: {
    profile: "flagged_network_stealth",
    walkMode: "wander",
    stepsPerDirection: 5,
    baseDelay: 2100,
    jitter: 550,
    minSafetyFloor: 1700,
    enableMicroBreaks: true,
    enableIdlePauses: true,
    soundAlert: true,
    autoPauseOnTarget: true,
    avoidDuplicates: true,
    autoStartOnMap: true,
    autoStartDelay: 3,
    randomMapHopping: false,
    hideAdsCosmetically: true,
    autoCatchMasterBall: false,
    pvpCandidateTier: "ANY"
  },
  safety: {
    enableDeadManSwitch: true,
    autoStopMinMinutes: 5,
    autoStopMaxMinutes: 30,
    enableMovementSpeed: true,
    movementSpeedMinSec: 1.7,
    movementSpeedMaxSec: 2.8,
    enableMapRotation: false,
    mapRotationMinMinutes: 10,
    mapRotationMaxMinutes: 30,
    enableForcedBreaks: true,
    breakMinSteps: 50,
    breakMaxSteps: 200,
    breakMinDurationSec: 45,
    breakMaxDurationSec: 200,
    enableDailyCeilings: true,
    dailyStepMin: 500,
    dailyStepMax: 1000,
    dailyCatchMin: 10,
    dailyCatchMax: 20,
    antiBotEmergencyHalt: true
  }
};

function loadLocalConfig() {
  let defaults = {
    dummyAccount: { username: "PokeDen", password: "sacups2026", autoLogin: false },
    network: { useProxy: false, proxyRules: "", proxyBypass: "<local>" },
    settings: {
      profile: "flagged_network_stealth",
      walkMode: "wander",
      stepsPerDirection: 5,
      baseDelay: 2100,
      jitter: 550,
      minSafetyFloor: 1700,
      enableMicroBreaks: true,
      enableIdlePauses: true,
      soundAlert: true,
      autoPauseOnTarget: true,
      avoidDuplicates: true,
      autoStartOnMap: true,
      autoStartDelay: 3,
    randomMapHopping: false,
      hideAdsCosmetically: true,
      autoCatchMasterBall: false,
      pvpCandidateTier: "ANY"
    },
    safety: {
      enableDeadManSwitch: true,
      autoStopMinMinutes: 5,
      autoStopMaxMinutes: 30,
      enableMovementSpeed: true,
      movementSpeedMinSec: 1.7,
      movementSpeedMaxSec: 2.8,
    enableMapRotation: false,
    mapRotationMinMinutes: 10,
    mapRotationMaxMinutes: 30,
      enableForcedBreaks: true,
      breakMinSteps: 50,
      breakMaxSteps: 200,
      breakMinDurationSec: 45,
      breakMaxDurationSec: 200,
      enableDailyCeilings: true,
      dailyStepMin: 500,
      dailyStepMax: 1000,
      dailyCatchMin: 10,
      dailyCatchMax: 20,
      antiBotEmergencyHalt: true
    }
  };
  try {
    const bundled = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
    defaults = deepMerge(defaults, JSON.parse(bundled));
  } catch (_) {}

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = deepMerge(defaults, JSON.parse(raw));
  } catch (_) {
    config = defaults;
  }
  if (config.settings && (config.settings.targetPreset === 'legendaries' || config.settings.targetPreset === 'megas' || config.settings.targetPreset === 'legend_megas')) {
    config.settings.findAnySpecialVariant = false;
    config.settings.enableVariantFilter = false;
  }
  if (!Array.isArray(config.settings.favoriteTrainers) || config.settings.favoriteTrainers.length === 0) {
    try {
      const favFilePath = getWritableDataPath('favorite_trainers.json');
      if (fs.existsSync(favFilePath)) {
        const fileData = JSON.parse(fs.readFileSync(favFilePath, 'utf8'));
        if (Array.isArray(fileData) && fileData.length > 0) {
          config.settings.favoriteTrainers = fileData;
        }
      }
    } catch (_) {}

    if (!Array.isArray(config.settings.favoriteTrainers) || config.settings.favoriteTrainers.length === 0) {
      try {
        const rawFav = localStorage.getItem('deluge_fav_trainers');
        if (rawFav) {
          const parsed = JSON.parse(rawFav);
          if (Array.isArray(parsed) && parsed.length > 0) {
            config.settings.favoriteTrainers = parsed;
          }
        }
      } catch (_) {}
    }
  }
  if (!Array.isArray(config.settings.favoriteTrainers)) {
    config.settings.favoriteTrainers = [];
  }
}

function saveLocalConfig() {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = CONFIG_PATH + '.tmp';
    const bakPath = CONFIG_PATH + '.bak';
    const jsonStr = JSON.stringify(config, null, 2);
    fs.writeFileSync(tempPath, jsonStr, 'utf8');
    if (fs.existsSync(CONFIG_PATH)) {
      try { fs.copyFileSync(CONFIG_PATH, bakPath); } catch (_) {}
    }
    fs.renameSync(tempPath, CONFIG_PATH);

    // Development workspace sync
    try {
      const devPath = path.join(__dirname, 'config.json');
      if (devPath !== CONFIG_PATH && fs.existsSync(devPath)) {
        fs.writeFileSync(devPath, jsonStr, 'utf8');
      }
    } catch (_) {}
  } catch (err) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    } catch (fallbackErr) {
      console.error('Failed to write config.json:', fallbackErr);
    }
  }

  try {
    const { ipcRenderer } = require('electron');
    if (ipcRenderer) {
      ipcRenderer.invoke('save-config-json', config).catch(() => {});
    }
  } catch (_) {}
}

loadLocalConfig();

const LOG_FILE = path.join(path.dirname(CONFIG_PATH), 'backend_live.log');

function isAdOrTrackerNoise(msg) {
  if (!msg || typeof msg !== 'string') return true;
  const m = msg.toLowerCase().trim();
  if (m === '') return true;
  return m.includes('[gpt]') ||
         m.includes('googletag') ||
         m.includes('goo.gle/gpt') ||
         m.includes('novatiq') ||
         m.includes('pubads') ||
         m.includes('fundingchoices') ||
         m.includes('console.groupend') ||
         m.includes('uctagdata') ||
         m.includes('content security policy') ||
         m.includes('doubleclick') ||
         m.includes('securepubads') ||
         m.includes('adsbygoogle') ||
         m.includes('adservice') ||
         m.includes('pagead') ||
         m.includes('google_ad') ||
         m.includes('adsystem') ||
         m.includes('powerpreference option is currently ignored') ||
         m.includes('no available adapters') ||
         m.includes('requestadapter()') ||
         m.includes('ots parsing error') ||
         m.includes('font-size:0;color:transparent') ||
         m.includes('typeerror: failed to fetch');
}

const _backendLogBuffer = [];
let _backendLogFlushTimer = null;

function _flushBackendLogs() {
  if (_backendLogBuffer.length === 0) return;
  const chunk = _backendLogBuffer.join('');
  _backendLogBuffer.length = 0;
  _backendLogFlushTimer = null;
  try {
    fs.appendFile(LOG_FILE, chunk, 'utf8', () => {});
  } catch (_) {}
}

function backendLog(tag, msg) {
  const ts = new Date().toISOString().substring(11, 23);
  const detail = (typeof msg === 'object') ? JSON.stringify(msg) : String(msg);
  const line = `[${ts}] [${tag}] ${detail}\n`;
  _backendLogBuffer.push(line);
  if (!_backendLogFlushTimer) {
    _backendLogFlushTimer = setTimeout(_flushBackendLogs, 250);
  }
  try {
    if (process && process.stdout && typeof process.stdout.write === 'function') {
      process.stdout.write(line);
    }
  } catch (_) {}
  console.log(`[${tag}]`, msg);
}

try {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(LOG_FILE, `\n=== DELUGERPG LIVE SESSION INITIALIZED AT ${new Date().toISOString()} ===\n`, 'utf8');
} catch (_) {}
backendLog('HostInit', 'Desktop client host controller loaded');

// UI Elements
const gameContainer = document.getElementById('gameContainer');
const delugeView = document.getElementById('delugeView');
const toggleBtn = document.getElementById('toggleBtn');
const btnIcon = document.getElementById('btnIcon');
const btnText = document.getElementById('btnText');
const walkModeSelect = document.getElementById('walkModeSelect');
const stepsPerDirInput = document.getElementById('stepsPerDirInput');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusChip = document.getElementById('statusChip');
const actionFeedbackBadge = document.getElementById('actionFeedbackBadge');
const actionFeedbackDot = document.getElementById('actionFeedbackDot');
const actionFeedbackText = document.getElementById('actionFeedbackText');
const stepCounterElem = document.getElementById('stepCounter');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const soundBtn = document.getElementById('soundBtn');
const targetModalBtn = document.getElementById('targetModalBtn');
const avoidDupesBtn = document.getElementById('avoidDupesBtn');
const avoidDupesBadge = document.getElementById('avoidDupesBadge');
const autoStartMapBtn = document.getElementById('autoStartMapBtn');
const autoStartMapBadge = document.getElementById('autoStartMapBadge');
const randomMapHopBtn = document.getElementById('randomMapHopBtn');
const randomMapHopBadge = document.getElementById('randomMapHopBadge');
const autoStartDelayRow = document.getElementById('autoStartDelayRow');
const autoStartDelaySelect = document.getElementById('autoStartDelaySelect');
const hideAdsBtn = document.getElementById('hideAdsBtn');
const hideAdsBadge = document.getElementById('hideAdsBadge');
const autoCatchBtn = document.getElementById('autoCatchBtn');
const autoCatchBadge = document.getElementById('autoCatchBadge');
const openLogsBtn = document.getElementById('openLogsBtn');
const wipeBtn = document.getElementById('wipeBtn');
const networkBtn = document.getElementById('networkBtn');
const networkBadge = document.getElementById('networkBadge');
const netIcon = document.getElementById('netIcon');
const netText = document.getElementById('netText');
const loginHelperBtn = document.getElementById('loginHelperBtn');
const refreshBtn = document.getElementById('refreshBtn');
const navMenuBtn = document.getElementById('navMenuBtn');
const navDropdown = document.getElementById('navDropdown');
const navVersionBadge = document.getElementById('navVersionBadge');

// Modals - Target Filter Elements
const targetModal = document.getElementById('targetModal');
const closeTargetBtn = document.getElementById('closeTargetBtn');
const cancelTargetBtn = document.getElementById('cancelTargetBtn');
const saveTargetsBtn = document.getElementById('saveTargetsBtn');
const avoidDuplicatesCheck = document.getElementById('avoidDuplicatesCheck');
const filterLegendariesCheckbox = document.getElementById('filterLegendariesCheckbox');
const subClassicLegCheckbox = document.getElementById('subClassicLegCheckbox');
const subUltraBeastsCheckbox = document.getElementById('subUltraBeastsCheckbox');
const subParadoxCheckbox = document.getElementById('subParadoxCheckbox');
const filterMegasCheckbox = document.getElementById('filterMegasCheckbox');
const subMegasCheckbox = document.getElementById('subMegasCheckbox');
const subGMaxCheckbox = document.getElementById('subGMaxCheckbox');
const subStartersCheckbox = document.getElementById('subStartersCheckbox');
const filterPseudoCheckbox = document.getElementById('filterPseudoCheckbox');
const pseudoTierVariantsBadge = document.getElementById('pseudoTierVariantsBadge');
const pseudoVariantsWrap = document.getElementById('pseudoVariantsWrap');
const filterTypesCheckbox = document.getElementById('filterTypesCheckbox');
const typeQuickGroup = document.getElementById('typeQuickGroup');
const btnAllTypes = document.getElementById('btnAllTypes');
const btnClearTypes = document.getElementById('btnClearTypes');
const typesGridWrap = document.getElementById('typesGridWrap');
const dexCompletionMode = document.getElementById('dexCompletionMode');
const avoidDuplicatesWrap = document.getElementById('avoidDuplicatesWrap');
const dexModeLockChip = document.getElementById('dexModeLockChip');
const targetPresetSelect = document.getElementById('targetPresetSelect');
const savePresetBtn = document.getElementById('savePresetBtn');
const deletePresetBtn = document.getElementById('deletePresetBtn');

// Smart Ball Routing Elements
const ballRoutingMasterNotice = document.getElementById('ballRoutingMasterNotice');
const ballRowLegendary = document.getElementById('ballRowLegendary');
const ballSelectLegendary = document.getElementById('ballSelectLegendary');
const ballRowPseudo = document.getElementById('ballRowPseudo');
const ballSelectPseudo = document.getElementById('ballSelectPseudo');
const ballRowMega = document.getElementById('ballRowMega');
const ballSelectMega = document.getElementById('ballSelectMega');
const ballRowTypes = document.getElementById('ballRowTypes');
const ballSelectTypes = document.getElementById('ballSelectTypes');
const ballRowDex = document.getElementById('ballRowDex');
const ballSelectDex = document.getElementById('ballSelectDex');
const ballRowWildVariants = document.getElementById('ballRowWildVariants');
const ballSelectWildVariants = document.getElementById('ballSelectWildVariants');
const ballFallbackPolicy = document.getElementById('ballFallbackPolicy');
const autoCatchModeSelect = document.getElementById('autoCatchModeSelect');
const catchModeMasterRadio = document.getElementById('catchModeMasterRadio');
const catchModeSmartRadio = document.getElementById('catchModeSmartRadio');
const catchModeHelpBadge = document.getElementById('catchModeHelpBadge');

const btnPseudoAllVariants = document.getElementById('btnPseudoAllVariants');
const btnPseudoVariantsOnly = document.getElementById('btnPseudoVariantsOnly');
const btnPseudoShiniesOnly = document.getElementById('btnPseudoShiniesOnly');
const btnPseudoChromeOnly = document.getElementById('btnPseudoChromeOnly');

const pseudoVariantIds = [
  'pseudoVarNormal', 'pseudoVarShiny', 'pseudoVarChrome', 'pseudoVarRetro', 'pseudoVarMetallic',
  'pseudoVarShadow', 'pseudoVarGhostly', 'pseudoVarDark', 'pseudoVarMirage', 'pseudoVarNegative'
];
const pseudoVariantMap = {
  pseudoVarNormal: 'Normal', pseudoVarShiny: 'Shiny', pseudoVarChrome: 'Chrome', pseudoVarRetro: 'Retro',
  pseudoVarMetallic: 'Metallic', pseudoVarShadow: 'Shadow', pseudoVarGhostly: 'Ghostly', pseudoVarDark: 'Dark',
  pseudoVarMirage: 'Mirage', pseudoVarNegative: 'Negative'
};
const filterVariantsCheckbox = document.getElementById('filterVariantsCheckbox');
const btnAllVariants = document.getElementById('btnAllVariants');
const btnVariantsOnly = document.getElementById('btnVariantsOnly');
const btnShiniesOnly = document.getElementById('btnShiniesOnly');
const customTargetInput = document.getElementById('customTargetInput');
const blacklistInput = document.getElementById('blacklistInput');
const clearBlacklistBtn = document.getElementById('clearBlacklistBtn');
const filterLevelCheckbox = document.getElementById('filterLevelCheckbox');
const levelControlsWrap = document.getElementById('levelControlsWrap');
const levelModeSelect = document.getElementById('levelModeSelect');
const levelValueInput = document.getElementById('levelValueInput');
const levelScopeSelect = document.getElementById('levelScopeSelect');
const targetSummaryText = document.getElementById('targetSummaryText');

const presetAllBtn = document.getElementById('presetAllBtn');
const presetLegBtn = document.getElementById('presetLegBtn');
const presetMegaBtn = document.getElementById('presetMegaBtn');
const presetVarBtn = document.getElementById('presetVarBtn');
const presetShinyBtn = document.getElementById('presetShinyBtn');
const presetLegMegaBtn = document.getElementById('presetLegMegaBtn');
const tabTypesBtn = document.getElementById('tabTypesBtn');
const tabVariantsBtn = document.getElementById('tabVariantsBtn');
const legTierVariantsBadge = document.getElementById('legTierVariantsBadge');
const megaTierVariantsBadge = document.getElementById('megaTierVariantsBadge');
const wildTierVariantsBadge = document.getElementById('wildTierVariantsBadge');
const legVariantsWrap = document.getElementById('legVariantsWrap');
const megaVariantsWrap = document.getElementById('megaVariantsWrap');
const subVariantsWrap = document.getElementById('subVariantsWrap');
const btnLegAllVariants = document.getElementById('btnLegAllVariants');
const btnLegVariantsOnly = document.getElementById('btnLegVariantsOnly');
const btnLegShiniesOnly = document.getElementById('btnLegShiniesOnly');
const btnLegChromeOnly = document.getElementById('btnLegChromeOnly');
const btnMegaAllVariants = document.getElementById('btnMegaAllVariants');
const btnMegaVariantsOnly = document.getElementById('btnMegaVariantsOnly');
const btnMegaShiniesOnly = document.getElementById('btnMegaShiniesOnly');
const btnMegaChromeOnly = document.getElementById('btnMegaChromeOnly');
const btnWildChromeOnly = document.getElementById('btnWildChromeOnly');

function formatTierVariantsBadge(vars, isEnabled = true) {
  if (!isEnabled) return 'Off';
  const arr = Array.isArray(vars) ? vars : [];
  if (arr.length === 0) return 'None (0)';
  const lower = arr.map(v => v.toLowerCase());
  const hasNormal = lower.includes('normal');
  const specialCount = lower.filter(v => v !== 'normal').length;
  if (hasNormal && specialCount === 9) return 'All (10)';
  if (!hasNormal && specialCount === 9) return 'Variants (9)';
  if (arr.length === 1) return arr[0] + ' Only';
  if (arr.length <= 2) return arr.join(', ');
  return arr.length + ' Variants';
}

function updateVariantTabCount(count) {
  const el = tabVariantsBtn || document.querySelector('[data-tab="tabVariants"]');
  if (el) {
    el.textContent = 'Variants';
  }
}

const variantIds = [
  'varNormal', 'varShiny', 'varChrome', 'varRetro', 'varMetallic',
  'varShadow', 'varGhostly', 'varDark', 'varMirage', 'varNegative'
];
const variantMap = {
  varNormal: 'Normal',
  varShiny: 'Shiny',
  varChrome: 'Chrome',
  varRetro: 'Retro',
  varMetallic: 'Metallic',
  varShadow: 'Shadow',
  varGhostly: 'Ghostly',
  varDark: 'Dark',
  varMirage: 'Mirage',
  varNegative: 'Negative'
};

const legVariantIds = [
  'legVarNormal', 'legVarShiny', 'legVarChrome', 'legVarRetro', 'legVarMetallic',
  'legVarShadow', 'legVarGhostly', 'legVarDark', 'legVarMirage', 'legVarNegative'
];
const legVariantMap = {
  legVarNormal: 'Normal',
  legVarShiny: 'Shiny',
  legVarChrome: 'Chrome',
  legVarRetro: 'Retro',
  legVarMetallic: 'Metallic',
  legVarShadow: 'Shadow',
  legVarGhostly: 'Ghostly',
  legVarDark: 'Dark',
  legVarMirage: 'Mirage',
  legVarNegative: 'Negative'
};

const megaVariantIds = [
  'megaVarNormal', 'megaVarShiny', 'megaVarChrome', 'megaVarRetro', 'megaVarMetallic',
  'megaVarShadow', 'megaVarGhostly', 'megaVarDark', 'megaVarMirage', 'megaVarNegative'
];
const megaVariantMap = {
  megaVarNormal: 'Normal',
  megaVarShiny: 'Shiny',
  megaVarChrome: 'Chrome',
  megaVarRetro: 'Retro',
  megaVarMetallic: 'Metallic',
  megaVarShadow: 'Shadow',
  megaVarGhostly: 'Ghostly',
  megaVarDark: 'Dark',
  megaVarMirage: 'Mirage',
  megaVarNegative: 'Negative'
};

const networkModal = document.getElementById('networkModal');
const enableProxyCheckbox = document.getElementById('enableProxyCheckbox');
const proxyRulesInput = document.getElementById('proxyRulesInput');
const saveProxyBtn = document.getElementById('saveProxyBtn');
const closeNetBtn = document.getElementById('closeNetBtn');
const cancelNetBtn = document.getElementById('cancelNetBtn');
const refreshIpBtn = document.getElementById('refreshIpBtn');
const modalDetectedIp = document.getElementById('modalDetectedIp');
const modalDetectedIsp = document.getElementById('modalDetectedIsp');
const modalSecurityNotice = document.getElementById('modalSecurityNotice');

const accountModal = document.getElementById('accountModal');
const accUser = document.getElementById('accUser');
const accPass = document.getElementById('accPass');
const fillLoginBtn = document.getElementById('fillLoginBtn');
const closeAccBtn = document.getElementById('closeAccBtn');
const cancelAccBtn = document.getElementById('cancelAccBtn');
const modalBackdrop = document.getElementById('modalBackdrop');
const wipeModal = document.getElementById('wipeModal');
const closeWipeBtn = document.getElementById('closeWipeBtn');
const cancelWipeBtn = document.getElementById('cancelWipeBtn');
const confirmWipeBtn = document.getElementById('confirmWipeBtn');
const trainerIntelModal = document.getElementById('trainerIntelModal');
const closeTrainerIntelBtn = document.getElementById('closeTrainerIntelBtn');
const cancelTrainerIntelBtn = document.getElementById('cancelTrainerIntelBtn');
const inspectBattleBtn = document.getElementById('inspectBattleBtn');
const activeBattleStatusMsg = document.getElementById('activeBattleStatusMsg');
const modalRosterCountBadge = document.getElementById('modalRosterCountBadge');
const teamBuilderModal = document.getElementById('teamBuilderModal');
const teamBuilderBtn = document.getElementById('teamBuilderBtn');
const teamBuilderMenuBtn = document.getElementById('teamBuilderMenuBtn');
const closeTeamBuilderBtn = document.getElementById('closeTeamBuilderBtn');
const scanPokesBtn = document.getElementById('scanPokesBtn');
const scanTrainersBtn = document.getElementById('scanTrainersBtn');
const scanStatusDot = document.getElementById('scanStatusDot');
const scanStatusBadge = document.getElementById('scanStatusBadge');
const syncTrainersBtn = document.getElementById('syncTrainersBtn');
const syncTrainersStatusDot = document.getElementById('syncTrainersStatusDot');
const syncTrainersStatusBadge = document.getElementById('syncTrainersStatusBadge');
let isTrainerRosterSyncRunning = false;
const teamCategorySelect = document.getElementById('teamCategorySelect');
const teamTrainerSelect = document.getElementById('teamTrainerSelect');
const favTrainerBtn = document.getElementById('favTrainerBtn');
const buildTeamBtn = document.getElementById('buildTeamBtn');
const teamResultContainer = document.getElementById('teamResultContainer');
const teamResultList = document.getElementById('teamResultList');
const teamActionRow = document.getElementById('teamActionRow');
const teamActionStatus = document.getElementById('teamActionStatus');
const copyTeamBtn = document.getElementById('copyTeamBtn');
const applyTeamBtn = document.getElementById('applyTeamBtn');
const filteredTrainerCountBadge = document.getElementById('filteredTrainerCountBadge');
const teamEmptyPrompt = document.getElementById('teamEmptyPrompt');
const poolModeAllBtn = document.getElementById('poolModeAllBtn');
const poolModeTrainingBtn = document.getElementById('poolModeTrainingBtn');
const trainingStatsBadge = document.getElementById('trainingStatsBadge');
const candidatePoolFilterSelect = document.getElementById('candidatePoolFilterSelect');
let teamPoolFilter = (config && config.settings && config.settings.teamPoolFilter) || 'ANY';
const teamModeNpcBtn = document.getElementById('teamModeNpcBtn');
const teamModePvpBtn = document.getElementById('teamModePvpBtn');
const teamNpcSection = document.getElementById('teamNpcSection');
const teamPvpSection = document.getElementById('teamPvpSection');
const pvpLiveStatusBadge = document.getElementById('pvpLiveStatusBadge');
const pvpLiveOpponentCard = document.getElementById('pvpLiveOpponentCard');
const pvpLiveSummary = document.getElementById('pvpLiveSummary');
const pvpLiveRosterStrip = document.getElementById('pvpLiveRosterStrip');
const checkLiveBattleBtn = document.getElementById('checkLiveBattleBtn');
const pvpScoutInput = document.getElementById('pvpScoutInput');
const pvpScoutBtn = document.getElementById('pvpScoutBtn');
const pvpScoutStatusBadge = document.getElementById('pvpScoutStatusBadge');
const pvpScoutResultCard = document.getElementById('pvpScoutResultCard');
const pvpScoutedName = document.getElementById('pvpScoutedName');
const pvpScoutClearBtn = document.getElementById('pvpScoutClearBtn');
const pvpScoutedRosterStrip = document.getElementById('pvpScoutedRosterStrip');
const pvpStrategySelect = document.getElementById('pvpStrategySelect');
const pvpCandidateTierSelect = document.getElementById('pvpCandidateTierSelect');
let teamBattleMode = (config && config.settings && config.settings.teamBattleMode) || 'NPC';
let scoutedPlayerOpponent = null;
let activePvpTargetType = 'SCOUT';
let pvpStrategy = (config && config.settings && config.settings.pvpStrategy) || 'COUNTERS';
let pvpCandidateTier = (config && config.settings && config.settings.pvpCandidateTier) || 'ANY';
const battleOpponentBtn = document.getElementById('battleOpponentBtn');
const teamBattleActionSlot = document.getElementById('teamBattleActionSlot');
const teamBattleActionBtn = document.getElementById('teamBattleActionBtn');
const teamBattleAutoCheck = document.getElementById('teamBattleAutoCheck');
const teamBattleAutoLabel = document.getElementById('teamBattleAutoLabel');
const teamBattleLoopCheck = document.getElementById('teamBattleLoopCheck');
const teamBattleLoopLabel = document.getElementById('teamBattleLoopLabel');
let isBattleAutoRunning = false;
let battleAutoStepTimer = null;
let isBattleLoopRunning = false;
let battleLoopTimer = null;
let battleLoopFallbackTimer = null;
let teamSwappedAwaitingNewBattle = false;
let lastAppliedTeamSnapshot = null;
let pendingTrainingRotation = null;
let postCaptchaResumeContext = null;
let postCaptchaResumeTimer = null;
let battleActionInFlightUntil = 0;
let scheduledAutoStepKey = '';
let lastBattleActionEvalLogSig = '';
let lastBattleActionEvalLogTs = 0;
let consecutiveStuckBattleActions = 0;
let lastStuckActionKey = '';
let lastBattleStallRecoveryTs = 0;
const adsInspectorModal = document.getElementById('adsInspectorModal');
const adsInspectorMenuBtn = document.getElementById('adsInspectorMenuBtn');
const closeAdsInspectorBtn = document.getElementById('closeAdsInspectorBtn');
const switchTeamBuilderFromAdsBtn = document.getElementById('switchTeamBuilderFromAdsBtn');
const switchAdsInspectorFromTeamBtn = document.getElementById('switchAdsInspectorFromTeamBtn');
const rescanAdsBtn = document.getElementById('rescanAdsBtn');
const clearAdsLogBtn = document.getElementById('clearAdsLogBtn');
const adsFeedList = document.getElementById('adsFeedList');
const adsEmptyPrompt = document.getElementById('adsEmptyPrompt');
const navAdsCountBadge = document.getElementById('navAdsCountBadge');
const teamHeaderAdsBadge = document.getElementById('teamHeaderAdsBadge');
const adsStatTotal = document.getElementById('adsStatTotal');
const adsStatAdsense = document.getElementById('adsStatAdsense');
const adsStatGpt = document.getElementById('adsStatGpt');
const adsStatVignette = document.getElementById('adsStatVignette');
const adsFilterTabs = document.getElementById('adsFilterTabs');

// Catch Log & Daily Auto-Catch Panel Elements
const dailyCaughtBtn = document.getElementById('dailyCaughtBtn');
const caughtSummaryText = document.getElementById('caughtSummaryText');
const mbSummaryText = document.getElementById('mbSummaryText');
const catchLogModal = document.getElementById('catchLogModal');
const catchLogMenuBtn = document.getElementById('catchLogMenuBtn');
const closeCatchLogBtn = document.getElementById('closeCatchLogBtn');
const switchTeamBuilderFromCatchBtn = document.getElementById('switchTeamBuilderFromCatchBtn');
const clearCatchLogBtn = document.getElementById('clearCatchLogBtn');
const refreshCatchLogBtn = document.getElementById('refreshCatchLogBtn');
const catchFeedList = document.getElementById('catchFeedList');
const catchEmptyPrompt = document.getElementById('catchEmptyPrompt');
const catchDateBadge = document.getElementById('catchDateBadge');
const catchStatCount = document.getElementById('catchStatCount');
const catchStatMbStock = document.getElementById('catchStatMbStock');
const catchStatMbUsed = document.getElementById('catchStatMbUsed');
const ballStockDetails = document.getElementById('ballStockDetails');
const navCaughtCountBadge = document.getElementById('navCaughtCountBadge');

// Live AI Combat Assistant Elements & Bridge
const aiAssistant = require('./ai_agent_bridge.js');
const evolutionEngine = require('./evolution_engine.js');
const aiAssistantModal = document.getElementById('aiAssistantModal');
const aiAssistantTopBtn = document.getElementById('aiAssistantTopBtn');
const aiAssistantMenuBtn = document.getElementById('aiAssistantMenuBtn');
const closeAiAssistantBtn = document.getElementById('closeAiAssistantBtn');
const switchTeamBuilderFromAiBtn = document.getElementById('switchTeamBuilderFromAiBtn');
const switchAiAssistantFromTeamBtn = document.getElementById('switchAiAssistantFromTeamBtn');
const liveAiHudOverlay = document.getElementById('liveAiHudOverlay');
const aiHudMessage = document.getElementById('aiHudMessage');
const aiHudExpandBtn = document.getElementById('aiHudExpandBtn');
const aiHudDismissBtn = document.getElementById('aiHudDismissBtn');
const aiStatusChip = document.getElementById('aiStatusChip');
const aiBattleOpponentBadge = document.getElementById('aiBattleOpponentBadge');
const aiTacticalBriefing = document.getElementById('aiTacticalBriefing');
const aiQuickAnalyzeBtn = document.getElementById('aiQuickAnalyzeBtn');
const aiQuickSimBtn = document.getElementById('aiQuickSimBtn');
const aiQuickWhyBtn = document.getElementById('aiQuickWhyBtn');
const aiQuickHazardsBtn = document.getElementById('aiQuickHazardsBtn');
const aiSimResultStrip = document.getElementById('aiSimResultStrip');
const aiSimWinRateBadge = document.getElementById('aiSimWinRateBadge');
const aiSimHpVal = document.getElementById('aiSimHpVal');
const aiSimScoreVal = document.getElementById('aiSimScoreVal');
const aiChatStream = document.getElementById('aiChatStream');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatSendBtn = document.getElementById('aiChatSendBtn');
const aiQuickEvoBtn = document.getElementById('aiQuickEvoBtn');
const aiQuickMovesBtn = document.getElementById('aiQuickMovesBtn');
const aiInstantActionSlot = document.getElementById('aiInstantActionSlot');
const aiHudActionBtn = document.getElementById('aiHudActionBtn');
let activeAiBattleData = null;
let currentMatchParticipants = new Set();
let currentMatchFaintedPokemon = new Set();
let currentMatchCarryDefeated = false;
let currentMatchPostCarryDeployed = new Set();
let currentMatchPostCarryFainted = new Set();
let justSwitchedActivePokemon = new Set();
let currentMatchSwitchCount = 0;
let currentMatchItemCount = 0;
let lastTurnActionType = null;
let activeEvolveCardData = null;
let lastAnnouncedEvolveSignature = null;
let lastAnalyzedBattle = null;
let lastKnownUserTeam = [];

function healLastKnownUserTeamForNewMatch() {
  if (typeof currentMatchParticipants !== 'undefined') currentMatchParticipants.clear();
  if (typeof currentMatchFaintedPokemon !== 'undefined') currentMatchFaintedPokemon.clear();
  currentMatchCarryDefeated = false;
  if (typeof currentMatchPostCarryDeployed !== 'undefined') currentMatchPostCarryDeployed.clear();
  if (typeof currentMatchPostCarryFainted !== 'undefined') currentMatchPostCarryFainted.clear();
  if (typeof justSwitchedActivePokemon !== 'undefined') justSwitchedActivePokemon.clear();
  currentMatchSwitchCount = 0;
  currentMatchItemCount = 0;
  lastTurnActionType = null;
  if (Array.isArray(lastKnownUserTeam)) {
    lastKnownUserTeam = lastKnownUserTeam.map(mem => {
      if (!mem) return mem;
      const lvl = (typeof mem.level === 'number' && mem.level > 0) ? mem.level : 100;
      const maxHp = (typeof mem.maxHp === 'number' && mem.maxHp > 0) ? mem.maxHp : (lvl * 4);
      return Object.assign({}, mem, { hp: maxHp, maxHp: maxHp, isFainted: false });
    });
  }
}

function applyEquippedTeamState(teamList) {
  const src = Array.isArray(teamList) ? teamList : [];
  const equippedTeam = src.map((p, idx) => {
    const hasNumLvl = Boolean(p && typeof p.level === 'number' && !isNaN(p.level) && p.level > 0);
    const lvl = hasNumLvl ? p.level : 100;
    const maxHp = lvl * 4;
    return {
      id: p ? p.id : undefined,
      name: p ? p.name : '',
      variant: (p && p.variant) ? p.variant : 'Normal',
      types: (p && Array.isArray(p.types) && p.types.length > 0) ? p.types.slice() : ['Normal'],
      level: lvl,
      levelKnown: hasNumLvl,
      hp: maxHp,
      maxHp: maxHp,
      isFainted: false,
      isCarry: Boolean(p && p.isCarry),
      index: idx
    };
  });
  if (equippedTeam.length > 0) {
    lastKnownUserTeam = equippedTeam;
    teamSwappedAwaitingNewBattle = true;
    healLastKnownUserTeamForNewMatch();
    if (activeAiBattleData && (!activeAiBattleData.isInActiveBattle || activeAiBattleData.isVictoryScreen || activeAiBattleData.isPostBattleScreen || activeAiBattleData.isDefeatScreen)) {
      activeAiBattleData.userTeam = equippedTeam.map(m => Object.assign({}, m));
      activeAiBattleData.participatingPokemon = [];
    }
  }
  return equippedTeam;
}

// Evolution & Attack Moves Decision Maker Elements
const evoSearchInput = document.getElementById('evoSearchInput');
const refreshEvoBoxBtn = document.getElementById('refreshEvoBoxBtn');
const evoFilterUniqueBtn = document.getElementById('evoFilterUniqueBtn');
const evoFilterMegasBtn = document.getElementById('evoFilterMegasBtn');
const evoFilterAllBtn = document.getElementById('evoFilterAllBtn');
const evoFilterBlockedBtn = document.getElementById('evoFilterBlockedBtn');
const evoCountUnique = document.getElementById('evoCountUnique');
const evoCountMegas = document.getElementById('evoCountMegas');
const evoCountAll = document.getElementById('evoCountAll');
const evoCountBlocked = document.getElementById('evoCountBlocked');
const evoListHeaderTitle = document.getElementById('evoListHeaderTitle');
const evoReadyCountBadge = document.getElementById('evoReadyCountBadge');
const evoReadyList = document.getElementById('evoReadyList');
let currentEvoFilter = 'UNIQUE';
let currentEvoSearch = '';
let selectedEvoPoke = null;
let selectedMegaPoke = null;
let selectedMovesPoke = null;
let cachedEvolveReadyList = [];
let cachedMegaList = [];
let cachedBoxMovesList = [];

// Safety & Anti-Ban Limits Elements
const safetySettingsModal = document.getElementById('safetySettingsModal');
const safetySettingsTopBtn = document.getElementById('safetySettingsTopBtn');
const safetySettingsMenuBtn = document.getElementById('safetySettingsMenuBtn');
const closeSafetySettingsBtn = document.getElementById('closeSafetySettingsBtn');
const switchTeamBuilderFromSafetyBtn = document.getElementById('switchTeamBuilderFromSafetyBtn');
const safetyStatusChip = document.getElementById('safetyStatusChip');
const safetyStatAutoStop = document.getElementById('safetyStatAutoStop');
const safetyStatNextBreak = document.getElementById('safetyStatNextBreak');
const safetyStatTodaySteps = document.getElementById('safetyStatTodaySteps');
const safetyStatTodayCatches = document.getElementById('safetyStatTodayCatches');
const safetyAutoStopToggle = document.getElementById('safetyAutoStopToggle');
const safetyAutoStopMin = document.getElementById('safetyAutoStopMin');
const safetyAutoStopMax = document.getElementById('safetyAutoStopMax');
const safetySpeedToggle = document.getElementById('safetySpeedToggle');
const safetySpeedMin = document.getElementById('safetySpeedMin');
const safetySpeedMax = document.getElementById('safetySpeedMax');
const safetyMapRotationToggle = document.getElementById('safetyMapRotationToggle');
const safetyMapRotationMin = document.getElementById('safetyMapRotationMin');
const safetyMapRotationMax = document.getElementById('safetyMapRotationMax');
const safetyStatNextMapRotation = document.getElementById('safetyStatNextMapRotation');
const safetyZonesSelectAllBtn = document.getElementById('safetyZonesSelectAllBtn');
const safetyZonesClearBtn = document.getElementById('safetyZonesClearBtn');
const safetyBreakToggle = document.getElementById('safetyBreakToggle');
const safetyBreakMinSteps = document.getElementById('safetyBreakMinSteps');
const safetyBreakMaxSteps = document.getElementById('safetyBreakMaxSteps');
const safetyBreakMinDur = document.getElementById('safetyBreakMinDur');
const safetyBreakMaxDur = document.getElementById('safetyBreakMaxDur');
const safetyDailyToggle = document.getElementById('safetyDailyToggle');
const safetyDailyMinSteps = document.getElementById('safetyDailyMinSteps');
const safetyDailyMaxSteps = document.getElementById('safetyDailyMaxSteps');
const safetyDailyMinCatches = document.getElementById('safetyDailyMinCatches');
const safetyDailyMaxCatches = document.getElementById('safetyDailyMaxCatches');
const safetyAntiBotToggle = document.getElementById('safetyAntiBotToggle');
const testAlarmBtn = document.getElementById('testAlarmBtn');
const silenceAlarmModalBtn = document.getElementById('silenceAlarmModalBtn');
const saveSafetySettingsBtn = document.getElementById('saveSafetySettingsBtn');
const rerollSafetyTargetsBtn = document.getElementById('rerollSafetyTargetsBtn');
const resetDailySafetyBtn = document.getElementById('resetDailySafetyBtn');
const captchaEmergencyBanner = document.getElementById('captchaEmergencyBanner');
const silenceAlarmBtn = document.getElementById('silenceAlarmBtn');

function getBaseSpecies(name) {
  return teamEngine.getBaseSpecies ? teamEngine.getBaseSpecies(name) : (name || '');
}

function formatPokemonFullName(variant, name) {
  const v = (variant || '').trim();
  const n = (name || '').trim();
  if (!v || v === 'Normal') return n;
  if (n.toLowerCase().startsWith(v.toLowerCase() + ' ')) return n;
  return `${v} ${n}`;
}

// State
let isRunning = false;
let stepCount = 0;
let patternStepCount = 0;
let walkTimeout = null;
let soundEnabled = config.settings.soundAlert !== false;
let mapIsSearching = false;
let isEncounterOnScreen = false;
let targetEncounterActive = false;
let guestReportsMap = false;
let isStepPending = false;
let stepPendingTicks = 0;
let userManuallyPaused = false;
let isGuestInputFocused = false;
let currentZoomFactor = (config.settings && typeof config.settings.zoomFactor === 'number')
  ? config.settings.zoomFactor
  : 1.0;
let autoStartTimer = null;
let autoStartCountdownTimer = null;
let autoStartRemainingSeconds = 0;
let wasHuntingBeforeAutoCatch = false;
let wasHuntingBeforeBoxScan = false;
let outOfStockPaused = false;

// Pacing & Fatigue State
let stepsSinceLastMicroBreak = 0;
let stepsSinceLastIdlePause = 0;
let nextMicroBreakThreshold = Math.floor(Math.random() * 15) + 30; // 30 to 45 steps
let nextIdlePauseThreshold = Math.floor(Math.random() * 40) + 110; // 110 to 150 steps
let isResumingFromMicroPause = false;
let isResumingFromIdlePause = false;
let driftAccumulator = 0;

// Direction State
let currentDirectionKey = 'Left';
let wanderStepsLeft = (config && config.settings && config.settings.stepsPerDirection) || 5;
let searchWaitTicks = 0;
let diagonalVertical = 'Up';
let diagonalHorizontal = 'Right';

// Obstacle Avoidance & Anti-Stuck State
let blockedDirections = {};
let consecutiveBlockedCount = 0;
let lastDispatchedDirection = 'Left';
let fallbackCollisionTimer = null;
let isUnlockChallengeActive = false;

// Live Outbound Identity State
let currentNetworkInfo = {
  ip: null,
  isp: null,
  org: null,
  hostname: null,
  isStarlink: false,
  isPLDT: false,
  isChecking: false,
  checkedAt: null
};

// Update Network UI Badge & Modal Card
function updateNetworkBadgeUI() {
  const isProxied = config.network && config.network.useProxy && config.network.proxyRules;

  // 1. Update Modal Elements if present
  if (modalDetectedIp) {
    modalDetectedIp.textContent = currentNetworkInfo.ip || (currentNetworkInfo.isChecking ? 'Detecting...' : 'Unavailable');
  }
  if (modalDetectedIsp) {
    modalDetectedIsp.textContent = currentNetworkInfo.isp || (currentNetworkInfo.isChecking ? 'Detecting...' : 'Direct Connection');
  }
  if (modalSecurityNotice) {
    if (currentNetworkInfo.isStarlink) {
      modalSecurityNotice.style.background = 'rgba(56, 139, 253, 0.15)';
      modalSecurityNotice.style.color = '#388bfd';
      modalSecurityNotice.style.border = '1px solid #388bfd';
      modalSecurityNotice.textContent = 'VERIFIED SAFE: Connected via Starlink (AS14593 SpaceX). Clean satellite IP isolated from banned home accounts.';
    } else if (currentNetworkInfo.isPLDT) {
      modalSecurityNotice.style.background = 'rgba(218, 54, 51, 0.15)';
      modalSecurityNotice.style.color = '#f85149';
      modalSecurityNotice.style.border = '1px solid #da3633';
      modalSecurityNotice.textContent = 'DANGER: Connected via PLDT (' + (currentNetworkInfo.ip || 'Home IP') + '). This ISP is shared with banned accounts! Connect Tailscale Starlink exit node!';
    } else if (isProxied) {
      modalSecurityNotice.style.background = 'rgba(56, 139, 253, 0.12)';
      modalSecurityNotice.style.color = '#e0ecfa';
      modalSecurityNotice.style.border = '1px solid #1a283e';
      modalSecurityNotice.textContent = 'PROXIED: Traffic routed securely through ' + config.network.proxyRules;
    } else {
      modalSecurityNotice.style.background = '#070e1a';
      modalSecurityNotice.style.color = '#8eaad0';
      modalSecurityNotice.style.border = '1px solid #1a283e';
      modalSecurityNotice.textContent = 'Direct connection active (' + (currentNetworkInfo.isp || 'Direct') + ').';
    }
  }

  // 2. Update Toolbar Badge
  if (isProxied) {
    networkBadge.className = 'network-badge network-proxied';
    netIcon.innerHTML = '&#10004;';
    const shortRule = config.network.proxyRules.replace(/^https?:\/\//i, '').replace(/^socks5:\/\//i, '');
    netText.textContent = 'Proxied: ' + (shortRule.length > 18 ? shortRule.slice(0, 15) + '...' : shortRule);
    networkBadge.title = 'Active Proxy: ' + config.network.proxyRules + ' (Real IP hidden). Click to configure.';
  } else if (currentNetworkInfo.isChecking && !currentNetworkInfo.ip) {
    networkBadge.className = 'network-badge network-checking';
    netIcon.innerHTML = '&#8635;';
    netText.textContent = 'Checking Network...';
    networkBadge.title = 'Detecting current public IP and ISP...';
  } else if (currentNetworkInfo.isStarlink) {
    networkBadge.className = 'network-badge network-starlink';
    netIcon.innerHTML = '&#9733;';
    netText.textContent = 'Starlink: ' + currentNetworkInfo.ip;
    networkBadge.title = 'VERIFIED SAFE: Connected via Starlink (AS14593 SpaceX). Real IP: ' + currentNetworkInfo.ip + '. Click to view details or re-check.';
  } else if (currentNetworkInfo.isPLDT) {
    networkBadge.className = 'network-badge network-warning';
    netIcon.innerHTML = '&#9888;';
    netText.textContent = 'PLDT: ' + currentNetworkInfo.ip + ' (FLAGGED)';
    networkBadge.title = 'WARNING: Connected via PLDT (' + currentNetworkInfo.ip + ') - Shared with banned accounts! Connect Tailscale Starlink exit node! Click to re-check.';
  } else if (currentNetworkInfo.ip) {
    networkBadge.className = 'network-badge network-direct';
    netIcon.innerHTML = '&#9679;';
    const cleanIsp = currentNetworkInfo.isp || 'Direct';
    netText.textContent = cleanIsp + ': ' + currentNetworkInfo.ip;
    networkBadge.title = 'Connected via ' + (currentNetworkInfo.org || cleanIsp) + ' (' + currentNetworkInfo.ip + '). Click to view details.';
  } else {
    networkBadge.className = 'network-badge network-direct';
    netIcon.innerHTML = '&#9679;';
    netText.textContent = 'Direct Network';
    networkBadge.title = 'Direct Internet Connection. Click to configure proxy or re-check.';
  }
}

// Detect Real-Time Public IP & ISP with multi-source fallback
function parseNetworkDetails(ip, org = '', ispRaw = '', asn = '', hostname = '') {
  const fullDesc = (org + ' ' + ispRaw + ' ' + asn + ' ' + hostname).toLowerCase();

  const isStarlink = fullDesc.includes('starlink') ||
                     fullDesc.includes('space exploration') ||
                     fullDesc.includes('spacex') ||
                     fullDesc.includes('as14593');

  const isPLDT = fullDesc.includes('pldt') ||
                 fullDesc.includes('philippine long distance') ||
                 fullDesc.includes('as9299');

  let isp = 'Direct IP';
  if (isStarlink) {
    isp = 'Starlink';
  } else if (isPLDT) {
    isp = 'PLDT';
  } else if (org) {
    const cleanOrg = org.replace(/^AS\d+\s+/i, '').trim();
    isp = cleanOrg.length > 15 ? cleanOrg.slice(0, 13) + '..' : cleanOrg;
  } else if (ispRaw) {
    const cleanIsp = ispRaw.replace(/^AS\d+\s+/i, '').trim();
    isp = cleanIsp.length > 15 ? cleanIsp.slice(0, 13) + '..' : cleanIsp;
  }

  return {
    ip,
    isp,
    org: org || ispRaw || '',
    hostname: hostname || '',
    isStarlink,
    isPLDT,
    isChecking: false,
    checkedAt: new Date()
  };
}

function applyNetworkInfo(info, callback) {
  currentNetworkInfo = info;
  updateNetworkBadgeUI();
  if (callback) callback(null, currentNetworkInfo);
}

function queryIpWhoIs(callback) {
  let done = false;
  let timer = null;
  const finish = (err, data) => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    callback(err, data);
  };
  timer = setTimeout(() => {
    try { req.destroy(); } catch (_) {}
    finish(new Error('Timeout'));
  }, 3500);

  const req = https.get('https://ipwho.is/', { timeout: 3500 }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        if (res.statusCode !== 200) return finish(new Error('HTTP ' + res.statusCode));
        const json = JSON.parse(raw);
        if (!json.success || !json.ip) return finish(new Error('ipwho.is unsuccessful'));
        const org = (json.connection && json.connection.org) || '';
        const ispRaw = (json.connection && json.connection.isp) || '';
        const asn = (json.connection && json.connection.asn) ? ('AS' + json.connection.asn) : '';
        finish(null, parseNetworkDetails(json.ip, org, ispRaw, asn, ''));
      } catch (e) {
        finish(e);
      }
    });
  });
  req.on('timeout', () => {
    try { req.destroy(); } catch (_) {}
    finish(new Error('Timeout'));
  });
  req.on('error', (err) => finish(err));
}

function queryIpApi(callback) {
  let done = false;
  let timer = null;
  const finish = (err, data) => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    callback(err, data);
  };
  timer = setTimeout(() => {
    try { req.destroy(); } catch (_) {}
    finish(new Error('Timeout'));
  }, 3500);

  const req = http.get('http://ip-api.com/json', { timeout: 3500 }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        if (res.statusCode !== 200) return finish(new Error('HTTP ' + res.statusCode));
        const json = JSON.parse(raw);
        if (json.status !== 'success' || !json.query) return finish(new Error('ip-api unsuccessful'));
        finish(null, parseNetworkDetails(json.query, json.org || '', json.isp || '', json.as || '', ''));
      } catch (e) {
        finish(e);
      }
    });
  });
  req.on('timeout', () => {
    try { req.destroy(); } catch (_) {}
    finish(new Error('Timeout'));
  });
  req.on('error', (err) => finish(err));
}

function queryIpInfo(callback) {
  let done = false;
  let timer = null;
  const finish = (err, data) => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    callback(err, data);
  };
  timer = setTimeout(() => {
    try { req.destroy(); } catch (_) {}
    finish(new Error('Timeout'));
  }, 3500);

  const req = https.get('https://ipinfo.io/json', { timeout: 3500 }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        if (res.statusCode !== 200) return finish(new Error('HTTP ' + res.statusCode));
        const json = JSON.parse(raw);
        if (!json.ip) return finish(new Error('ipinfo no ip'));
        finish(null, parseNetworkDetails(json.ip, json.org || '', '', '', json.hostname || ''));
      } catch (e) {
        finish(e);
      }
    });
  });
  req.on('timeout', () => {
    try { req.destroy(); } catch (_) {}
    finish(new Error('Timeout'));
  });
  req.on('error', (err) => finish(err));
}

function queryIpify(callback) {
  let done = false;
  let timer = null;
  const finish = (err, data) => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    callback(err, data);
  };
  timer = setTimeout(() => {
    try { req.destroy(); } catch (_) {}
    finish(new Error('Timeout'));
  }, 3500);

  const req = https.get('https://api.ipify.org?format=json', { timeout: 3500 }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        if (res.statusCode !== 200) return finish(new Error('HTTP ' + res.statusCode));
        const json = JSON.parse(raw);
        if (!json.ip) return finish(new Error('ipify no ip'));
        finish(null, parseNetworkDetails(json.ip, '', '', '', ''));
      } catch (e) {
        finish(e);
      }
    });
  });
  req.on('timeout', () => {
    try { req.destroy(); } catch (_) {}
    finish(new Error('Timeout'));
  });
  req.on('error', (err) => finish(err));
}

function detectNetworkIdentity(callback) {
  currentNetworkInfo.isChecking = true;
  updateNetworkBadgeUI();

  // Tier 1: ipwho.is (HTTPS, unauthenticated, rich connection metadata)
  queryIpWhoIs((err, info) => {
    if (!err && info && info.ip) {
      applyNetworkInfo(info, callback);
      return;
    }

    // Tier 2: ip-api.com (HTTP, high reliability)
    queryIpApi((err2, info2) => {
      if (!err2 && info2 && info2.ip) {
        applyNetworkInfo(info2, callback);
        return;
      }

      // Tier 3: ipinfo.io (HTTPS)
      queryIpInfo((err3, info3) => {
        if (!err3 && info3 && info3.ip) {
          applyNetworkInfo(info3, callback);
          return;
        }

        // Tier 4: api.ipify.org (HTTPS, pure IP fallback)
        queryIpify((err4, info4) => {
          if (!err4 && info4 && info4.ip) {
            applyNetworkInfo(info4, callback);
            return;
          }

          // All providers exhausted
          currentNetworkInfo = {
            ip: 'Unavailable',
            isp: 'Direct IP',
            org: '',
            hostname: '',
            isStarlink: false,
            isPLDT: false,
            isChecking: false,
            checkedAt: new Date()
          };
          updateNetworkBadgeUI();
          if (callback) callback(new Error('Network identity detection failed across all providers'));
        });
      });
    });
  });
}

function updateAvoidDupesUI() {
  const isAvoid = config.settings && config.settings.avoidDuplicates !== false;
  if (avoidDupesBadge) {
    avoidDupesBadge.checked = isAvoid;
    avoidDupesBadge.textContent = '';
    avoidDupesBadge.className = isAvoid ? 'dropdown-switch switch-on dropdown-badge-on' : 'dropdown-switch switch-off dropdown-badge-off';
  }
  if (avoidDupesBtn) {
    avoidDupesBtn.title = isAvoid
      ? 'Duplication Avoidance: ON (Never pause or alert on already caught Pokemon)'
      : 'Duplication Avoidance: OFF (Alert/pause on all targets, including duplicates)';
  }
  if (avoidDuplicatesCheck) {
    avoidDuplicatesCheck.checked = isAvoid;
  }
}

function updateAutoStartMapUI() {
  const isAuto = config.settings && config.settings.autoStartOnMap !== false;
  const delaySec = (config.settings && config.settings.autoStartDelay) || 3;
  if (autoStartMapBadge) {
    autoStartMapBadge.checked = isAuto;
    autoStartMapBadge.textContent = '';
    autoStartMapBadge.className = isAuto ? 'dropdown-switch switch-on dropdown-badge-on' : 'dropdown-switch switch-off dropdown-badge-off';
  }
  if (randomMapHopBtn) {
  randomMapHopBtn.addEventListener('click', () => {
    if (!config.settings) config.settings = {};
    if (!config.safety) config.safety = {};
    const nextState = !((config.safety && config.safety.enableMapRotation) || config.settings.randomMapHopping);
    config.settings.randomMapHopping = nextState;
    config.safety.enableMapRotation = nextState;
    saveLocalConfig();
    updateRandomMapUI();
    if (nextState && isRunning) {
      scheduleNextMapRotation();
    } else if (!nextState) {
      if (mapRotationTimer) {
        clearTimeout(mapRotationTimer);
        mapRotationTimer = null;
      }
      nextMapRotationTime = null;
      isMapRotationDue = false;
    }
    updateStatus('Random Map Hopping: ' + (nextState ? 'ON' : 'OFF'), '#10b981');
    backendLog('Settings', 'Random Map Hopping toggled to ' + (nextState ? 'ON' : 'OFF'));
  });
}

if (autoStartMapBtn) {
    autoStartMapBtn.title = isAuto
      ? `Auto-Start on Maps: ON (Begins hunting after ${delaySec}s safety delay when map is opened)`
      : 'Auto-Start on Maps: OFF (Stays paused until manual start)';
  }
  if (autoStartDelaySelect) {
    autoStartDelaySelect.value = String(delaySec);
  }
  if (autoStartDelayRow) {
    autoStartDelayRow.style.opacity = isAuto ? '1' : '0.45';
    autoStartDelayRow.style.pointerEvents = isAuto ? 'auto' : 'none';
  }
}

function updateRandomMapUI() {
  const isEnabled = (config.safety && config.safety.enableMapRotation) || (config.settings && config.settings.randomMapHopping) || false;
  const minMins = (config.safety && config.safety.mapRotationMinMinutes) || 10;
  const maxMins = (config.safety && config.safety.mapRotationMaxMinutes) || 30;

  if (randomMapHopBadge) {
    randomMapHopBadge.checked = !!isEnabled;
    randomMapHopBadge.textContent = '';
    randomMapHopBadge.className = isEnabled ? 'dropdown-switch switch-on dropdown-badge-on' : 'dropdown-switch switch-off dropdown-badge-off';
  }
  if (randomMapHopBtn) {
    randomMapHopBtn.title = isEnabled
      ? `Random Map Hopping: ON (Rotates maps every ${minMins}-${maxMins} mins)`
      : 'Random Map Hopping: OFF (Stays on current map)';
  }
  if (safetyMapRotationToggle) {
    safetyMapRotationToggle.checked = !!isEnabled;
  }
  if (safetyMapRotationMin) {
    safetyMapRotationMin.value = minMins;
  }
  if (safetyMapRotationMax) {
    safetyMapRotationMax.value = maxMins;
  }
}

function updateHideAdsUI() {
  const isHide = config.settings && config.settings.hideAdsCosmetically !== false;
  if (!isHide && config.settings && config.settings.autoCatchMasterBall) {
    config.settings.autoCatchMasterBall = false;
    saveLocalConfig();
  }
  if (hideAdsBadge) {
    hideAdsBadge.checked = isHide;
    hideAdsBadge.textContent = '';
    hideAdsBadge.className = isHide ? 'dropdown-switch switch-on dropdown-badge-on' : 'dropdown-switch switch-off dropdown-badge-off';
  }
  if (hideAdsBtn) {
    hideAdsBtn.title = isHide
      ? 'Cosmetic Ad Hiding: ON (Banners collapsed; 1-click Skip preserved)'
      : 'Cosmetic Ad Hiding: OFF (Show ad banners normally)';
  }
}

function updateAutoCatchUI() {
  const isHideAds = config.settings && config.settings.hideAdsCosmetically !== false;
  let isCatch = config.settings && config.settings.autoCatchMasterBall === true;
  if (!isHideAds && isCatch) {
    isCatch = false;
    if (config.settings) config.settings.autoCatchMasterBall = false;
    saveLocalConfig();
  }
  if (autoCatchBadge) {
    autoCatchBadge.checked = isCatch;
    autoCatchBadge.textContent = '';
    autoCatchBadge.className = isCatch ? 'dropdown-switch switch-on dropdown-badge-on' : 'dropdown-switch switch-off dropdown-badge-off';
  }
  if (autoCatchBtn) {
    if (!isHideAds) {
      autoCatchBtn.title = 'Auto-Catch (Master Ball): Disabled (Turn "Hide Ads" ON first to enable)';
      autoCatchBtn.style.opacity = '0.55';
    } else {
      autoCatchBtn.style.opacity = '1';
      autoCatchBtn.title = isCatch
        ? 'Auto-Catch (Master Ball): ON (Will automatically catch target Pokemon via Master Ball)'
        : 'Auto-Catch (Master Ball): OFF (Click to enable auto-catching targets via Master Ball)';
    }
  }
}

function updateVersionUI() {
  if (navVersionBadge) {
    let appVer = '1.4.20';
    try {
      const pkg = require('./package.json');
      if (pkg && pkg.version) appVer = pkg.version;
    } catch (_) {}
    navVersionBadge.textContent = 'v' + appVer;
  }
}


function updateSoundUI() {
  soundBtn.innerHTML = soundEnabled ? '&#128266;' : '&#128263;';
  soundBtn.title = soundEnabled ? 'Sound Alert: ON' : 'Sound Alert: OFF';
  soundBtn.className = soundEnabled ? 'btn btn-icon btn-accent' : 'btn btn-icon';
}

function updateZoomUI() {
  if (zoomResetBtn) {
    const pct = Math.round(currentZoomFactor * 100);
    zoomResetBtn.textContent = pct + '%';
    zoomResetBtn.title = 'Current Zoom: ' + pct + '%. Click to reset to 100% (Ctrl 0)';
  }
}

function applyZoom(factor) {
  const clamped = Math.min(2.5, Math.max(0.5, Math.round(factor * 100) / 100));
  currentZoomFactor = clamped;
  updateZoomUI();

  try {
    if (delugeView && typeof delugeView.setZoomFactor === 'function') {
      delugeView.setZoomFactor(currentZoomFactor);
    }
  } catch (err) {
    console.warn('Failed to set webview zoom factor:', err);
  }

  try {
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('guest-zoom-update', currentZoomFactor);
    }
  } catch (_) {}

  if (!config.settings) config.settings = {};
  config.settings.zoomFactor = currentZoomFactor;
  saveLocalConfig();
}

function zoomIn() {
  applyZoom(currentZoomFactor + 0.1);
}

function zoomOut() {
  applyZoom(currentZoomFactor - 0.1);
}

function zoomReset() {
  applyZoom(1.0);
}

function calculateTargetSummary(leg, megas, vars, enableLevel, levelMode, levelVal, levelScope, subOptions = {}) {
  const parts = [];
  if (subOptions.customTargets && subOptions.customTargets.length > 0) {
    parts.push("Tier 1: " + subOptions.customTargets.length + " Whitelist (" + subOptions.customTargets.slice(0, 3).join(", ") + (subOptions.customTargets.length > 3 ? "..." : "") + ")");
  }
  if (megas) {
    const megaBadge = Array.isArray(subOptions.megaVariants) ? (" [" + formatTierVariantsBadge(subOptions.megaVariants) + "]") : "";
    const isM = subOptions.megaTierMegas !== false;
    const isG = subOptions.megaTierGMax !== false;
    const isS = subOptions.megaTierStarters !== false;
    if (isM && isG && isS) {
      parts.push("Tier 2: Mega, G-Max & Starters" + megaBadge);
    } else {
      const subs = [];
      if (isM) subs.push("Megas");
      if (isG) subs.push("G-Max");
      if (isS) subs.push("Starters");
      parts.push(subs.length > 0 ? ("Tier 2: (" + subs.join(", ") + ")" + megaBadge) : "Tier 2: 0 Special");
    }
  }
  if (subOptions.pseudo) {
    const pseudoBadge = Array.isArray(subOptions.pseudoVariants) ? (" [" + formatTierVariantsBadge(subOptions.pseudoVariants) + "]") : "";
    parts.push("10 Pseudo Lines" + pseudoBadge);
  }
  if (leg) {
    const classic = subOptions.classicLeg !== false;
    const ub = subOptions.ubLeg !== false;
    const paradox = subOptions.paradoxLeg !== false;
    const legBadge = Array.isArray(subOptions.legendaryVariants) ? (" [" + formatTierVariantsBadge(subOptions.legendaryVariants) + "]") : "";
    if (classic && ub && paradox) {
      parts.push("Tier 3: 135 Legendaries" + legBadge);
    } else {
      const subParts = [];
      if (classic) subParts.push("Classic");
      if (ub) subParts.push("UB");
      if (paradox) subParts.push("Paradox");
      parts.push(subParts.length > 0 ? ("Tier 3: Legendaries (" + subParts.join(", ") + ")" + legBadge) : "Tier 3: 0 Legendaries");
    }
  }

  if (vars) {
    const activeVars = Array.isArray(subOptions.selectedVariants) ? subOptions.selectedVariants : [];
    const hasNormal = activeVars.some(v => v.toLowerCase() === 'normal');
    const specialCount = activeVars.filter(v => v.toLowerCase() !== 'normal').length;
    if (hasNormal && specialCount === 9) {
      parts.push("Wild: [All 10]");
    } else if (hasNormal && specialCount === 0) {
      parts.push("Wild: [Normal Only]");
    } else if (!hasNormal && specialCount === 1 && activeVars.some(v => v.toLowerCase() === 'shiny')) {
      parts.push("Wild: [Shiny Only]");
    } else if (!hasNormal && specialCount === 9) {
      parts.push("Wild: [9 Variants]");
    } else if (!hasNormal && specialCount > 0) {
      parts.push("Wild: [" + specialCount + " Variants]");
    } else if (hasNormal && specialCount > 0) {
      parts.push("Wild: [Normal + " + specialCount + "]");
    }
  }

  if (subOptions.enableTypeFilter && Array.isArray(subOptions.selectedTypes) && subOptions.selectedTypes.length > 0 && subOptions.selectedTypes.length < 18) {
    parts.push("Types: [" + subOptions.selectedTypes.join(", ") + "]");
  }

  if (enableLevel) {
    const symbol = levelMode === 'min' ? '>=' : (levelMode === 'max' ? '<=' : '==');
    const scopeStr = (levelScope === 'all') ? 'All Pokemon' : 'Targets';
    parts.push(scopeStr + ' ' + symbol + ' ' + levelVal);
  }

  let summary = parts.length > 0 ? ("Active: " + parts.join(" + ")) : "WARNING: No targets selected! (All encounters ignored)";
  if (subOptions.blacklist && subOptions.blacklist.length > 0) {
    summary += " | Blacklist: " + subOptions.blacklist.length + " species";
  }
  return summary;
}

// Interactive GUI Mutual Exclusion & State Synchronizer
function syncTargetModalInteractiveStates() {
  // 1. Dex Completionist Mode vs. Avoid Duplicates
  const dexMode = dexCompletionMode ? dexCompletionMode.value : 'standard';
  if (dexMode !== 'standard') {
    if (avoidDuplicatesCheck) {
      avoidDuplicatesCheck.checked = true;
      avoidDuplicatesCheck.disabled = true;
    }
    if (avoidDuplicatesWrap) {
      avoidDuplicatesWrap.style.opacity = '0.5';
      avoidDuplicatesWrap.style.pointerEvents = 'none';
    }
    if (dexModeLockChip) dexModeLockChip.style.display = 'inline-block';
  } else {
    if (avoidDuplicatesCheck) avoidDuplicatesCheck.disabled = false;
    if (avoidDuplicatesWrap) {
      avoidDuplicatesWrap.style.opacity = '1';
      avoidDuplicatesWrap.style.pointerEvents = 'auto';
    }
    if (dexModeLockChip) dexModeLockChip.style.display = 'none';
  }

  // 2. Elemental Types Filter Master Toggle
  const isTypeActive = filterTypesCheckbox ? filterTypesCheckbox.checked : false;
  if (typeQuickGroup) {
    typeQuickGroup.style.opacity = '1';
    typeQuickGroup.style.pointerEvents = 'auto';
  }
  if (typesGridWrap) {
    typesGridWrap.style.opacity = '1';
    typesGridWrap.style.pointerEvents = 'auto';
    typesGridWrap.style.filter = 'none';
  }

  // 3. Smart Ball Routing Couplings & Dual Catch Mode (Option A vs Option B)
  const isAutoCatchMasterOn = config.settings && (config.settings.autoCatchMasterBall !== false);
  if (ballRoutingMasterNotice) {
    ballRoutingMasterNotice.style.display = isAutoCatchMasterOn ? 'none' : 'block';
  }

  const activeCatchMode = (catchModeSmartRadio && catchModeSmartRadio.checked) ? 'smart_routing' : (autoCatchModeSelect ? autoCatchModeSelect.value : ((config.settings && config.settings.autoCatchMode) || 'master_only'));
  if (autoCatchModeSelect) autoCatchModeSelect.value = activeCatchMode;
  if (catchModeMasterRadio && catchModeSmartRadio) {
    if (activeCatchMode === 'smart_routing') {
      catchModeSmartRadio.checked = true;
    } else {
      catchModeMasterRadio.checked = true;
    }
  }

  // Always keep all ball routing rows clean, legible, and fully functional
  if (ballRowLegendary) {
    ballRowLegendary.style.opacity = '1';
    ballRowLegendary.style.pointerEvents = 'auto';
  }
  if (ballRowPseudo) {
    ballRowPseudo.style.opacity = '1';
    ballRowPseudo.style.pointerEvents = 'auto';
  }
  if (ballRowMega) {
    ballRowMega.style.opacity = '1';
    ballRowMega.style.pointerEvents = 'auto';
  }
  if (ballRowTypes) {
    ballRowTypes.style.opacity = '1';
    ballRowTypes.style.pointerEvents = 'auto';
  }
  if (ballRowDex) {
    ballRowDex.style.opacity = '1';
    ballRowDex.style.pointerEvents = 'auto';
  }
  if (ballRowWildVariants) {
    ballRowWildVariants.style.opacity = '1';
    ballRowWildVariants.style.pointerEvents = 'auto';
  }
  if (ballFallbackPolicy && ballFallbackPolicy.parentElement) {
    ballFallbackPolicy.parentElement.style.opacity = '1';
    ballFallbackPolicy.parentElement.style.pointerEvents = 'auto';
  }

  // 4. Delete button enabled only for custom user presets
  if (deletePresetBtn && targetPresetSelect) {
    const curVal = targetPresetSelect.value;
    const isBuiltIn = ['default_legendaries', 'all_powerhouses', 'shiny_hunters', 'dex_completionist', 'custom'].includes(curVal);
    deletePresetBtn.disabled = isBuiltIn;
    deletePresetBtn.style.opacity = isBuiltIn ? '0.35' : '1';
    deletePresetBtn.style.cursor = isBuiltIn ? 'not-allowed' : 'pointer';
  }
}

function updatePseudoBadge(vars, isEnabled = true) {
  if (!pseudoTierVariantsBadge) return;
  pseudoTierVariantsBadge.textContent = formatTierVariantsBadge(vars, isEnabled);
  pseudoTierVariantsBadge.style.color = isEnabled ? '#388bfd' : '#8eaad0';
  pseudoTierVariantsBadge.style.opacity = isEnabled ? '1' : '0.55';
}

function updateTargetUI() {
  const isLegConfig = config.settings && config.settings.findLegendaries !== false;
  const classicLeg = isLegConfig && (config.settings.legendaryClassic !== false);
  const ubLeg = isLegConfig && (config.settings.legendaryUltraBeasts !== false);
  const paradoxLeg = isLegConfig && (config.settings.legendaryParadox !== false);
  const isLeg = isLegConfig && (classicLeg || ubLeg || paradoxLeg);

  const isMegaConfig = config.settings && config.settings.findMegasAndGigantamax !== false;
  const subM = isMegaConfig && (config.settings ? config.settings.megaTierMegas !== false : true);
  const subG = isMegaConfig && (config.settings ? config.settings.megaTierGMax !== false : true);
  const subS = isMegaConfig && (config.settings ? config.settings.megaTierStarters !== false : true);
  const isMega = isMegaConfig && (subM || subG || subS);
  const isPseudo = config.settings && (config.settings.findPseudoLegendaries !== false);
  const isVar = config.settings && config.settings.findAnySpecialVariant !== false;
  const activeTypes = (config.settings && Array.isArray(config.settings.selectedTypes)) ? config.settings.selectedTypes : [];
  const isType = (config.settings && config.settings.enableTypeFilter !== undefined)
    ? !!config.settings.enableTypeFilter
    : (activeTypes.length > 0 && activeTypes.length < 18);
  const activeDexMode = (config.settings && config.settings.dexCompletionMode) || 'standard';
  const ballRouting = (config.settings && config.settings.ballRouting) || {
    legendaries: 'Master Ball', pseudo: 'Ultra Ball', megas: 'Ultra Ball', types: 'Ultra Ball', dex: 'Ultra Ball', variants: 'Ultra Ball'
  };
  const fallbackPolicy = (config.settings && config.settings.ballFallbackPolicy) || 'downgrade';

  const activePseudoVariants = (config.settings && Array.isArray(config.settings.pseudoVariants))
    ? config.settings.pseudoVariants
    : Object.values(pseudoVariantMap);

  const activeVariants = (config.settings && Array.isArray(config.settings.selectedVariants))
    ? config.settings.selectedVariants
    : Object.values(variantMap).filter(v => v !== 'Normal');

  const activeLegVariants = (config.settings && Array.isArray(config.settings.legendaryVariants))
    ? config.settings.legendaryVariants
    : Object.values(legVariantMap);

  const activeMegaVariants = (config.settings && Array.isArray(config.settings.megaVariants))
    ? config.settings.megaVariants
    : Object.values(megaVariantMap);

  const customTargets = (config.settings && typeof config.settings.customTargetList === 'string')
    ? config.settings.customTargetList.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const blacklist = (config.settings && typeof config.settings.blacklistList === 'string')
    ? config.settings.blacklistList.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const isLevel = config.settings && !!config.settings.enableLevelFilter;
  const levelMode = (config.settings && config.settings.levelFilterMode) || 'min';
  const levelVal = (config.settings && typeof config.settings.levelFilterValue === 'number') ? config.settings.levelFilterValue : 50;
  const levelScope = (config.settings && config.settings.levelFilterScope) || 'targets';

  if (filterLegendariesCheckbox) filterLegendariesCheckbox.checked = isLeg;
  if (subClassicLegCheckbox) subClassicLegCheckbox.checked = classicLeg;
  if (subUltraBeastsCheckbox) subUltraBeastsCheckbox.checked = ubLeg;
  if (subParadoxCheckbox) subParadoxCheckbox.checked = paradoxLeg;

  if (filterMegasCheckbox) filterMegasCheckbox.checked = isMega;
  if (subMegasCheckbox) subMegasCheckbox.checked = subM;
  if (subGMaxCheckbox) subGMaxCheckbox.checked = subG;
  if (subStartersCheckbox) subStartersCheckbox.checked = subS;
  if (filterPseudoCheckbox) filterPseudoCheckbox.checked = isPseudo;
  if (filterTypesCheckbox) filterTypesCheckbox.checked = isType;
  const isVarActive = config.settings && (config.settings.enableVariantFilter !== undefined ? !!config.settings.enableVariantFilter : (config.settings.findAnySpecialVariant !== false));
  if (filterVariantsCheckbox) filterVariantsCheckbox.checked = isVarActive;

  pseudoVariantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = activePseudoVariants.map(v => v.toLowerCase()).includes(pseudoVariantMap[id].toLowerCase());
    }
  });

  const typeInputs = document.querySelectorAll('.type-chip-input');
  typeInputs.forEach(inp => {
    const typeName = inp.id.replace('type_', '');
    inp.checked = activeTypes.map(t => t.toLowerCase()).includes(typeName.toLowerCase());
  });

  if (dexCompletionMode) dexCompletionMode.value = activeDexMode;
  if (ballSelectLegendary) ballSelectLegendary.value = ballRouting.legendaries || 'Master Ball';
  if (ballSelectPseudo) ballSelectPseudo.value = ballRouting.pseudo || 'Ultra Ball';
  if (ballSelectMega) ballSelectMega.value = ballRouting.megas || 'Ultra Ball';
  if (ballSelectTypes) ballSelectTypes.value = ballRouting.types || 'Ultra Ball';
  if (ballSelectDex) ballSelectDex.value = ballRouting.dex || 'Ultra Ball';
  if (ballSelectWildVariants) ballSelectWildVariants.value = ballRouting.variants || 'Ultra Ball';
  if (ballFallbackPolicy) ballFallbackPolicy.value = fallbackPolicy;
  const activeCatchMode = (config.settings && config.settings.autoCatchMode) || 'master_only';
  if (autoCatchModeSelect) autoCatchModeSelect.value = activeCatchMode;
  if (catchModeMasterRadio && catchModeSmartRadio) {
    if (activeCatchMode === 'smart_routing') {
      catchModeSmartRadio.checked = true;
    } else {
      catchModeMasterRadio.checked = true;
    }
  }

  updatePseudoBadge(activePseudoVariants, isPseudo);
  syncTargetModalInteractiveStates();

  if (legVariantsWrap) legVariantsWrap.classList.toggle('dimmed', !isLeg);
  if (megaVariantsWrap) megaVariantsWrap.classList.toggle('dimmed', !isMega);
  if (pseudoVariantsWrap) pseudoVariantsWrap.classList.toggle('dimmed', !isPseudo);
  if (subVariantsWrap) subVariantsWrap.classList.toggle('dimmed', !isVarActive);

  variantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = activeVariants.map(v => v.toLowerCase()).includes(variantMap[id].toLowerCase());
    }
  });

  legVariantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = activeLegVariants.map(v => v.toLowerCase()).includes(legVariantMap[id].toLowerCase());
    }
  });

  megaVariantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = activeMegaVariants.map(v => v.toLowerCase()).includes(megaVariantMap[id].toLowerCase());
    }
  });

  if (legTierVariantsBadge) {
    legTierVariantsBadge.textContent = formatTierVariantsBadge(activeLegVariants, isLeg);
    legTierVariantsBadge.style.color = isLeg ? '#388bfd' : '#8eaad0';
    legTierVariantsBadge.style.opacity = isLeg ? '1' : '0.55';
  }
  if (megaTierVariantsBadge) {
    megaTierVariantsBadge.textContent = formatTierVariantsBadge(activeMegaVariants, isMega);
    megaTierVariantsBadge.style.color = isMega ? '#388bfd' : '#8eaad0';
    megaTierVariantsBadge.style.opacity = isMega ? '1' : '0.55';
  }
  if (wildTierVariantsBadge) {
    wildTierVariantsBadge.textContent = formatTierVariantsBadge(activeVariants, isVarActive);
    wildTierVariantsBadge.style.color = isVarActive ? '#388bfd' : '#8eaad0';
    wildTierVariantsBadge.style.opacity = isVarActive ? '1' : '0.55';
  }

  updateVariantTabCount(activeVariants.length);

  if (customTargetInput) customTargetInput.value = (config.settings && config.settings.customTargetList) || '';
  if (blacklistInput) blacklistInput.value = (config.settings && config.settings.blacklistList) || '';

  if (filterLevelCheckbox) filterLevelCheckbox.checked = isLevel;
  if (levelControlsWrap) {
    if (isLevel) levelControlsWrap.classList.remove('dimmed');
    else levelControlsWrap.classList.add('dimmed');
  }
  if (levelModeSelect) levelModeSelect.value = levelMode;
  if (levelValueInput) levelValueInput.value = levelVal;
  if (levelScopeSelect) levelScopeSelect.value = levelScope;
  if (avoidDuplicatesCheck) {
    avoidDuplicatesCheck.checked = (config.settings && config.settings.avoidDuplicates !== false);
  }
  updateAvoidDupesUI();

  if (targetSummaryText) {
    targetSummaryText.textContent = calculateTargetSummary(
      isLeg, isMega, isVarActive, isLevel, levelMode, levelVal, levelScope,
      {
        classicLeg, ubLeg, paradoxLeg,
        pseudo: isPseudo,
        pseudoVariants: activePseudoVariants,
        selectedVariants: activeVariants,
        legendaryVariants: activeLegVariants,
        megaVariants: activeMegaVariants,
        megaTierMegas: config.settings ? config.settings.megaTierMegas !== false : true,
        megaTierGMax: config.settings ? config.settings.megaTierGMax !== false : true,
        megaTierStarters: config.settings ? config.settings.megaTierStarters !== false : true,
        enableTypeFilter: isType,
        selectedTypes: activeTypes,
        customTargets,
        blacklist
      }
    );
  }

  const isShinyOnly = activeVariants.length === 1 && activeVariants[0].toLowerCase() === 'shiny';
  const hasNormal = activeVariants.some(v => v.toLowerCase() === 'normal');
  const specialCount = activeVariants.filter(v => v.toLowerCase() !== 'normal').length;
  const hasCustom = customTargets.length > 0;
  const legAll10 = activeLegVariants.length === 10;
  const megaAll10 = activeMegaVariants.length === 10;

  let presetKey = 'custom';
  if (isLeg && isMega && isVarActive && !isLevel && specialCount === 9 && legAll10 && megaAll10 && !hasCustom) presetKey = 'all';
  else if (isLeg && isMega && isVarActive && !isLevel && !hasNormal && isShinyOnly && !hasCustom) presetKey = 'shinies';
  else if (!isLeg && !isMega && isVarActive && !isLevel && !hasNormal && specialCount === 9 && !hasCustom) presetKey = 'variants';
  else if (isLeg && isMega && !isVarActive && !isLevel && legAll10 && megaAll10 && !hasCustom) presetKey = 'legend_megas';
  else if (isLeg && !isMega && !isVarActive && !isLevel && legAll10 && !hasCustom) presetKey = 'legendaries';
  else if (!isLeg && isMega && !isVarActive && !isLevel && megaAll10 && !hasCustom) presetKey = 'megas';

  if (targetPresetSelect) {
    if (config.settings && config.settings.targetProfiles) {
      Object.keys(config.settings.targetProfiles).forEach(k => {
        if (!targetPresetSelect.querySelector('option[value="' + k + '"]')) {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = config.settings.targetProfiles[k].name || k;
          targetPresetSelect.appendChild(opt);
        }
      });
    }
    const currentPreset = (config.settings && config.settings.targetPreset) || 'custom';
    const optMatch = targetPresetSelect.querySelector('option[value="' + currentPreset + '"]');
    targetPresetSelect.value = optMatch ? currentPreset : 'custom';
  }

  const pills = [
    { btn: presetAllBtn, key: 'all' },
    { btn: presetLegBtn, key: 'legendaries' },
    { btn: presetMegaBtn, key: 'megas' },
    { btn: presetVarBtn, key: 'variants' },
    { btn: presetShinyBtn, key: 'shinies' },
    { btn: presetLegMegaBtn, key: 'legend_megas' }
  ];
  pills.forEach(p => {
    if (p.btn) {
      p.btn.className = (presetKey === p.key) ? 'btn preset-pill-btn btn-active' : 'btn preset-pill-btn';
    }
  });
}

function applyTargetPreset(presetKey, saveImmediately = true) {
  let isLeg = true;
  let isMega = false;
  let isVar = false;
  let isClassic = true;
  let isUB = true;
  let isParadox = true;
  let selectedVars = Object.values(variantMap).filter(v => v !== 'Normal');
  let selectedLegVars = Object.values(legVariantMap);
  let selectedMegaVars = Object.values(megaVariantMap);

  if (presetKey === 'legendaries') {
    isLeg = true;
    isMega = false;
    isVar = false;
    selectedVars = Object.values(variantMap).filter(v => v !== 'Normal');
    selectedLegVars = Object.values(legVariantMap);
    selectedMegaVars = Object.values(megaVariantMap);
  } else if (presetKey === 'megas') {
    isLeg = false;
    isMega = true;
    isVar = false;
    selectedVars = Object.values(variantMap).filter(v => v !== 'Normal');
    selectedLegVars = Object.values(legVariantMap);
    selectedMegaVars = Object.values(megaVariantMap);
  } else if (presetKey === 'legend_megas') {
    isLeg = true;
    isMega = true;
    isVar = false;
    selectedVars = Object.values(variantMap).filter(v => v !== 'Normal');
    selectedLegVars = Object.values(legVariantMap);
    selectedMegaVars = Object.values(megaVariantMap);
  } else if (presetKey === 'shinies') {
    isLeg = true;
    isMega = true;
    isVar = true;
    selectedVars = ['Shiny'];
    selectedLegVars = ['Shiny'];
    selectedMegaVars = ['Shiny'];
  } else if (presetKey === 'variants') {
    isLeg = false;
    isMega = false;
    isVar = true;
    selectedVars = Object.values(variantMap).filter(v => v !== 'Normal');
    selectedLegVars = Object.values(legVariantMap).filter(v => v !== 'Normal');
    selectedMegaVars = Object.values(megaVariantMap).filter(v => v !== 'Normal');
  } else if (presetKey === 'all') {
    isLeg = true;
    isMega = true;
    isVar = true;
    selectedVars = Object.values(variantMap);
    selectedLegVars = Object.values(legVariantMap);
    selectedMegaVars = Object.values(megaVariantMap);
  }

  if (filterLegendariesCheckbox) filterLegendariesCheckbox.checked = isLeg;
  if (subClassicLegCheckbox) subClassicLegCheckbox.checked = isLeg && isClassic;
  if (subUltraBeastsCheckbox) subUltraBeastsCheckbox.checked = isLeg && isUB;
  if (subParadoxCheckbox) subParadoxCheckbox.checked = isLeg && isParadox;

  if (filterMegasCheckbox) filterMegasCheckbox.checked = isMega;
  if (subMegasCheckbox) subMegasCheckbox.checked = isMega;
  if (subGMaxCheckbox) subGMaxCheckbox.checked = isMega;
  if (subStartersCheckbox) subStartersCheckbox.checked = isMega;
  if (filterVariantsCheckbox) filterVariantsCheckbox.checked = isVar;

  if (legVariantsWrap) legVariantsWrap.classList.toggle('dimmed', !isLeg);
  if (megaVariantsWrap) megaVariantsWrap.classList.toggle('dimmed', !isMega);
  if (subVariantsWrap) subVariantsWrap.classList.toggle('dimmed', !isVar);

  variantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = selectedVars.includes(variantMap[id]);
    }
  });

  legVariantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = selectedLegVars.includes(legVariantMap[id]);
    }
  });

  megaVariantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = selectedMegaVars.includes(megaVariantMap[id]);
    }
  });

  if (legTierVariantsBadge) {
    legTierVariantsBadge.textContent = formatTierVariantsBadge(selectedLegVars, isLeg);
    legTierVariantsBadge.style.color = isLeg ? '#388bfd' : '#8eaad0';
    legTierVariantsBadge.style.opacity = isLeg ? '1' : '0.55';
  }
  if (megaTierVariantsBadge) {
    megaTierVariantsBadge.textContent = formatTierVariantsBadge(selectedMegaVars, isMega);
    megaTierVariantsBadge.style.color = isMega ? '#388bfd' : '#8eaad0';
    megaTierVariantsBadge.style.opacity = isMega ? '1' : '0.55';
  }
  if (wildTierVariantsBadge) {
    wildTierVariantsBadge.textContent = formatTierVariantsBadge(selectedVars, isVar);
    wildTierVariantsBadge.style.color = isVar ? '#388bfd' : '#8eaad0';
    wildTierVariantsBadge.style.opacity = isVar ? '1' : '0.55';
  }

  updateVariantTabCount(selectedVars.length);

  const isLevel = filterLevelCheckbox ? filterLevelCheckbox.checked : false;
  const levelMode = levelModeSelect ? levelModeSelect.value : 'min';
  const levelVal = levelValueInput ? (parseInt(levelValueInput.value, 10) || 50) : 50;
  const levelScope = levelScopeSelect ? levelScopeSelect.value : 'targets';
  const customTargets = (customTargetInput && customTargetInput.value)
    ? customTargetInput.value.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const blacklist = (blacklistInput && blacklistInput.value)
    ? blacklistInput.value.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  if (targetSummaryText) {
    targetSummaryText.textContent = calculateTargetSummary(
      isLeg, isMega, isVar, isLevel, levelMode, levelVal, levelScope,
      {
        classicLeg: isClassic, ubLeg: isUB, paradoxLeg: isParadox,
        pseudo: isPseudo,
        pseudoVariants: selectedPseudoVars,
        selectedVariants: selectedVars,
        legendaryVariants: selectedLegVars,
        megaVariants: selectedMegaVars,
        megaTierMegas: subMegasCheckbox ? subMegasCheckbox.checked : true,
        megaTierGMax: subGMaxCheckbox ? subGMaxCheckbox.checked : true,
        megaTierStarters: subStartersCheckbox ? subStartersCheckbox.checked : true,
        enableTypeFilter: isType,
        selectedTypes: selectedTypesList,
        customTargets,
        blacklist
      }
    );
  }

  const pills = [
    { btn: presetAllBtn, key: 'all' },
    { btn: presetLegBtn, key: 'legendaries' },
    { btn: presetMegaBtn, key: 'megas' },
    { btn: presetVarBtn, key: 'variants' },
    { btn: presetShinyBtn, key: 'shinies' },
    { btn: presetLegMegaBtn, key: 'legend_megas' }
  ];
  pills.forEach(p => {
    if (p.btn) {
      p.btn.className = (presetKey === p.key) ? 'btn preset-pill-btn btn-active' : 'btn preset-pill-btn';
    }
  });

  if (saveImmediately) {
    if (avoidDuplicatesCheck) {
      config.settings.avoidDuplicates = avoidDuplicatesCheck.checked;
    }
    if (customTargetInput) {
      config.settings.customTargetList = customTargetInput.value.trim();
    }
    if (blacklistInput) {
      config.settings.blacklistList = blacklistInput.value.trim();
    }
    config.settings.enableLevelFilter = isLevel;
    config.settings.levelFilterMode = levelMode;
    config.settings.levelFilterValue = levelVal;
    config.settings.levelFilterScope = levelScope;
    config.settings.targetPreset = presetKey;
    config.settings.findLegendaries = isLeg;
    config.settings.legendaryClassic = isLeg && isClassic;
    config.settings.legendaryUltraBeasts = isLeg && isUB;
    config.settings.legendaryParadox = isLeg && isParadox;
    config.settings.findMegasAndGigantamax = isMega;
    config.settings.megaTierMegas = subMegasCheckbox ? subMegasCheckbox.checked : true;
    config.settings.megaTierGMax = subGMaxCheckbox ? subGMaxCheckbox.checked : true;
    config.settings.megaTierStarters = subStartersCheckbox ? subStartersCheckbox.checked : true;
    config.settings.findPseudoLegendaries = isPseudo;
    config.settings.pseudoVariants = selectedPseudoVars;
    config.settings.enableTypeFilter = isType;
    config.settings.selectedTypes = selectedTypesList;
    config.settings.dexCompletionMode = activeDex;
    config.settings.ballRouting = routingObj;
    config.settings.ballFallbackPolicy = activeFallback;
    config.settings.findAnySpecialVariant = isVar;
    config.settings.enableVariantFilter = isVar;
    config.settings.selectedVariants = selectedVars;
    config.settings.legendaryVariants = selectedLegVars;
    config.settings.megaVariants = selectedMegaVars;
    saveLocalConfig();
    updateTargetUI();
    delugeView.send('update-config', config.settings);
    syncHuntingState();
    updateStatus('Target filter: ' + presetKey.toUpperCase(), '#10b981');
  }
}

// Initialize Inputs & Badges
accUser.value = (config.dummyAccount && config.dummyAccount.username) || '';
accPass.value = (config.dummyAccount && config.dummyAccount.password) || '';
walkModeSelect.value = (config.settings && config.settings.walkMode) || 'wander';
if (stepsPerDirInput) {
  stepsPerDirInput.value = (config.settings && config.settings.stepsPerDirection) || 5;
}
updateToggleButton();
updateNetworkBadgeUI();
updateSoundUI();
updateTargetUI();
updateAutoStartMapUI();
updateRandomMapUI();
updateHideAdsUI();
updateAutoCatchUI();
updateVersionUI();
updateZoomUI();

// Detect Live Network Identity (Real Public IP & ISP) on Startup
detectNetworkIdentity();
setInterval(detectNetworkIdentity, 60000);

// Audio Synthesizer for alerts
let sharedAudioCtx = null;
const activeAudioNodes = new Set();

function getAudioContext() {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (_) {
    return null;
  }
}

function stopAllActiveSounds() {
  try {
    activeAudioNodes.forEach(node => {
      try { node.osc.stop(); } catch (_) {}
      try { node.osc.disconnect(); } catch (_) {}
      try { node.gain.disconnect(); } catch (_) {}
    });
    activeAudioNodes.clear();
  } catch (_) {}
}

function playSound(freq = 880, duration = 0.5) {
  if (!soundEnabled) return;
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const entry = { osc, gain };
    activeAudioNodes.add(entry);
    osc.onended = () => activeAudioNodes.delete(entry);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function playAlarmSound() {
  if (!soundEnabled) return;
  playSound(440, 0.3);
  setTimeout(() => {
    if (soundEnabled) playSound(880, 0.4);
  }, 250);
}

// Status UI Helpers
function updateStatus(text, color = '#388bfd') {
  statusText.textContent = text;
  statusText.title = text;
  if (statusChip) statusChip.title = text;
  statusDot.style.background = color;
}

let actionFeedbackTimeout = null;
function updateActionFeedback(text, statusType = 'sent') {
  if (!actionFeedbackBadge || !actionFeedbackText || !actionFeedbackDot) return;
  if (isRestBreakActive) return;
  actionFeedbackBadge.style.visibility = 'visible';
  actionFeedbackText.textContent = text;
  actionFeedbackBadge.title = 'Action Feedback: ' + text;
  if (statusType === 'sent') {
    actionFeedbackDot.style.background = '#38bdf8';
  } else if (statusType === 'queued') {
    actionFeedbackDot.style.background = '#f59e0b';
  } else if (statusType === 'success') {
    actionFeedbackDot.style.background = '#22c55e';
  } else if (statusType === 'error') {
    actionFeedbackDot.style.background = '#ef4444';
  }
  if (actionFeedbackTimeout) clearTimeout(actionFeedbackTimeout);
  actionFeedbackTimeout = setTimeout(() => {
    if (actionFeedbackBadge) {
      actionFeedbackBadge.style.visibility = 'hidden';
    }
  }, 5000);
}

function isMapUrl(rawUrl) {
  if (!rawUrl) return false;
  try {
    const u = new URL(rawUrl);
    if (!u.hostname.includes('delugerpg.com')) return false;
    const p = u.pathname.toLowerCase();
    return p.startsWith('/map') || p.includes('/map');
  } catch (_) {
    return false;
  }
}

let isAutoCatchCountdownActive = false;

function isCurrentPageMap() {
  const curUrl = (delugeView && delugeView.getURL()) || '';
  if (curUrl && !isMapUrl(curUrl)) {
    return false;
  }
  return !!guestReportsMap;
}

function isBattlePageUrl(urlStr) {
  const lower = String(urlStr || '').toLowerCase();
  if (!lower || isUnlockOrCaptchaUrl(lower) || isMapUrl(lower) || lower.includes('/login') || lower.includes('/catch') || lower.includes('/battle/wild')) {
    return false;
  }
  try {
    const parsed = new URL(urlStr, 'https://www.delugerpg.com');
    const p = (parsed.pathname || '').toLowerCase();
    if (p === '/gyms' || p === '/trainers' || p === '/gmax' || p === '/gmax/' || p === '/home' || p === '/profile' || p.startsWith('/profile/') || p === '/battle' || p === '/battle/' || p === '/battle/trainers' || p === '/battle/gyms') {
      return false;
    }
    return p.includes('/battle') || p.includes('/challenge') || p.includes('/arena') || p.includes('/npc/') || p.includes('/battle/gym');
  } catch (_) {
    return lower.includes('/battle') || lower.includes('/challenge') || lower.includes('/arena') || lower.includes('/npc/') || lower.includes('/battle/gym');
  }
}

function isCurrentPageBattle() {
  const curUrl = (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '';
  return isBattlePageUrl(curUrl);
}

let isPendingSessionAutoStop = false;
let pendingSessionAutoStopReason = '';
let pendingSessionAutoStopMsg = '';

function triggerSessionAutoStop(reason, statusMsg) {
  const isInActiveBattle = isCurrentPageBattle() && activeAiBattleData && !activeAiBattleData.isVictoryScreen && !activeAiBattleData.isDefeatScreen && !activeAiBattleData.isPostBattleScreen;
  if (isInActiveBattle) {
    backendLog('SafetyAutoStop', `Session auto-stop reached, but active battle is underway. Deferring pause until battle completes.`);
    isPendingSessionAutoStop = true;
    pendingSessionAutoStopReason = reason;
    pendingSessionAutoStopMsg = statusMsg;
    return;
  }
  stopHuntingWithReason(reason, statusMsg, '#f59e0b');
  playAlarmSound();
}

function autoPauseOutsideMap(source = '') {
  if (isMapRotatingNow) return;
  cancelPendingAutoStart('Navigated outside map');
  userManuallyPaused = false;
  if (isRunning) {
    console.log('[Auto-Pause] Hunting auto-paused because client navigated outside map:', source);
    isRunning = false;
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
    updateToggleButton();
    updateStatus('Paused (Outside Map)', '#f59e0b');
    syncHuntingState();
  } else if (!isCurrentPageMap()) {
    updateStatus('Paused (Outside Map)', '#f59e0b');
  }
}

function syncHuntingState() {
  try {
    if (delugeView) {
      delugeView.send('hunting-state-changed', {
        isHunting: isRunning,
        userManuallyPaused: userManuallyPaused
      });
      delugeView.send('update-config', config.settings);
      if (userManuallyPaused) {
        delugeView.send('abort-autocatch');
      }
    }
  } catch (_) {}
}

function syncUserCollectionToGuest() {
  try {
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('sync-user-collection', currentCollection || []);
    }
  } catch (_) {}
}

let lastBoxSyncCheckTime = 0;
let pendingPreHuntingSyncCallback = null;
let isPreHuntingSyncInProgress = false;

function ensureMemorySyncedBeforeHunting(onReady) {
  if (typeof onReady !== 'function') return;

  // 1. Immediately reload user_collection.json from disk into memory and hydrate guest
  try {
    loadTeamBuilderData();
    syncUserCollectionToGuest();
  } catch (_) {}

  // 2. If memory was verified recently (within 5 min) and collection is populated, proceed immediately
  const recentSync = (Date.now() - lastBoxSyncCheckTime < 5 * 60 * 1000);
  if (recentSync && Array.isArray(currentCollection) && currentCollection.length > 0) {
    onReady();
    return;
  }

  // 3. Fast Smart Box Verification (< 400ms page-1 check)
  if (isPreHuntingSyncInProgress || !delugeView || typeof delugeView.send !== 'function') {
    onReady();
    return;
  }

  isPreHuntingSyncInProgress = true;
  let syncTimeout = null;

  const cleanupAndReady = () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    isPreHuntingSyncInProgress = false;
    pendingPreHuntingSyncCallback = null;
    onReady();
  };

  // Defense fallback timeout: proceed after 3.2s so hunting is never blocked
  syncTimeout = setTimeout(() => {
    cleanupAndReady();
  }, 3200);

  pendingPreHuntingSyncCallback = (data) => {
    lastBoxSyncCheckTime = Date.now();
    cleanupAndReady();
  };

  try {
    delugeView.send('start-scan-pokemon', {
      smartCheck: true,
      expectedCount: Array.isArray(currentCollection) ? currentCollection.length : 0
    });
  } catch (_) {
    cleanupAndReady();
  }
}

function handleDuplicateOwnedAlert(alertData) {
  if (!alertData) return;
  if (liveAiHudOverlay && !activeAiBattleData && !activeEvolveCardData) {
    liveAiHudOverlay.style.display = 'none';
  }
  if (typeof backendLog === 'function') {
    backendLog('UNIQUENESS', `Protected encounter uniqueness: ${alertData.alertTitle || ''} - ${alertData.alertMessage || ''}`);
  }
}

function updateToggleButton() {
  if (isRunning) {
    toggleBtn.className = 'btn btn-toggle-main btn-active';
    toggleBtn.title = 'Pause Automated Hunting [Space / F2]';
    btnIcon.innerHTML = '&#10074;&#10074;';
    if (btnText) btnText.textContent = 'Hunting';
    updateStatus('Scanning Map...', '#10b981');
  } else {
    toggleBtn.className = 'btn btn-toggle-main btn-paused';
    toggleBtn.title = 'Start Automated Hunting [Space / F2]';
    btnIcon.innerHTML = '&#9654;';
    if (btnText) {
      if (autoStartRemainingSeconds > 0) {
        btnText.textContent = `Auto (${autoStartRemainingSeconds}s)`;
      } else {
        btnText.textContent = 'Paused';
      }
    }
    if (autoStartRemainingSeconds <= 0) {
      updateStatus('Paused', '#f59e0b');
    }
  }
  syncHuntingState();
}

function toggleHunting() {
  try {
    if (toggleBtn && typeof toggleBtn.blur === 'function') toggleBtn.blur();
  } catch (_) {}
  // If an auto-start countdown is currently in progress, clicking the toggle aborts auto-start and enforces a manual pause!
  if (autoStartRemainingSeconds > 0) {
    cancelPendingAutoStart('Manual pause during auto-start countdown');
    isAutoCatchCountdownActive = false;
    userManuallyPaused = true;
    wasHuntingBeforeAutoCatch = false;
    if (battleAutoStepTimer) {
      clearTimeout(battleAutoStepTimer);
      battleAutoStepTimer = null;
    }
    isBattleAutoRunning = false;
    isRunning = false;
    try {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('abort-autocatch');
      }
    } catch (_) {}
    updateToggleButton();
    updateStatus('Auto-Start Cancelled (Paused)', '#f59e0b');
    return;
  }

  // If an auto-catch countdown is in progress, clicking the toggle aborts auto-catch and enforces a manual pause!
  if (isAutoCatchCountdownActive) {
    isAutoCatchCountdownActive = false;
    userManuallyPaused = true;
    wasHuntingBeforeAutoCatch = false;
    if (battleAutoStepTimer) {
      clearTimeout(battleAutoStepTimer);
      battleAutoStepTimer = null;
    }
    isBattleAutoRunning = false;
    isRunning = false;
    try {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('abort-autocatch');
      }
    } catch (_) {}
    updateToggleButton();
    updateStatus('Auto-Catch Cancelled (Paused)', '#f59e0b');
    return;
  }

  if (!isRunning) {
    if (!isCurrentPageMap()) {
      updateStatus('Cannot Hunt Outside Map!', '#ef4444');
      setTimeout(() => {
        if (!isRunning && !isCurrentPageMap()) updateStatus('Paused (Outside Map)', '#f59e0b');
      }, 2000);
      return;
    }
    if (scanStatusBadge && (scanStatusBadge.textContent.includes('Scanning') || scanStatusBadge.textContent.includes('Reading'))) {
      wasHuntingBeforeBoxScan = true;
      updateStatus('Box Sync In Progress (Will hunt upon completion)', '#388bfd');
      return;
    }
    if (config.settings && config.settings.autoCatchMasterBall === true) {
      if (dailyCatchData && dailyCatchData.masterBallStock === 0) {
        updateStatus('Paused (0 Master Balls - Restock or disable Auto-Catch)', '#ef4444');
        playAlarmSound();
        return;
      }
      if (!isBallInventorySynced && delugeView && typeof delugeView.send === 'function') {
        try { delugeView.send('request-ball-inventory'); } catch (_) {}
      }
    }
    ensureTodaySafetyState();
    if (config.safety && config.safety.enableDailyCeilings !== false) {
      if (dailySafetyState.todaySteps >= dailySafetyState.dailyStepCeiling) {
        updateStatus(`Daily step limit reached (${dailySafetyState.todaySteps}/${dailySafetyState.dailyStepCeiling})`, '#ef4444');
        return;
      }
      const curCatches = Math.max(dailySafetyState.todayCatches || 0, (dailyCatchData && dailyCatchData.caught) ? dailyCatchData.caught.length : 0);
      if (curCatches >= dailySafetyState.dailyCatchCeiling) {
        updateStatus(`Daily catch limit reached (${curCatches}/${dailySafetyState.dailyCatchCeiling})`, '#ef4444');
        return;
      }
    }
  }

  isRunning = !isRunning;
  if (isRunning) {
    stopAllBattleAutomation('Automated hunting started');
    isAutoCatchCountdownActive = false;
    userManuallyPaused = false;
    outOfStockPaused = false;
    isEncounterOnScreen = false;
    isAutoCatchCountdownActive = false;
    isGuestInputFocused = false;
    isStepPending = false;
    stepPendingTicks = 0;
    wanderStepsLeft = (config.settings && config.settings.stepsPerDirection) || 5;
    isResumingFromMicroPause = false;
    isResumingFromIdlePause = false;

    // Safety dead-man switch: randomized auto-stop duration
    if (config.safety && config.safety.enableDeadManSwitch !== false) {
      const stopMins = getRandomInRange(config.safety.autoStopMinMinutes || 5, config.safety.autoStopMaxMinutes || 30);
      sessionAutoStopTime = Date.now() + stopMins * 60 * 1000;
      sessionAutoStopTargetMins = stopMins;
      if (sessionAutoStopTimer) clearTimeout(sessionAutoStopTimer);
      sessionAutoStopTimer = setTimeout(() => {
        triggerSessionAutoStop(`Session auto-stop triggered after ${sessionAutoStopTargetMins}m`, `Paused (Auto-Stop: ${sessionAutoStopTargetMins}m)`);
      }, stopMins * 60 * 1000);
      backendLog('SafetyAutoStop', `Session auto-stop timer scheduled for ${stopMins} minutes`);
    }

    // Initialize forced break targets if not yet set
    if (config.safety && config.safety.enableForcedBreaks !== false) {
      if (!nextBreakStepTarget) {
        rollNextBreakTargets();
      }
    }
    if (isMapRotationActive()) {
      scheduleNextMapRotation();
    }
    updateSafetyTelemetryUI();

    try {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('abort-autocatch');
        delugeView.send('request-dom-dump');
      }
    } catch (_) {}
    if (isDirectionPhysicallyBlocked(currentDirectionKey)) {
      const evaded = chooseEvadeDirection(currentDirectionKey);
      backendLog('HuntingStart', `Initial direction ${currentDirectionKey} is blocked! Evading to ${evaded}`);
      currentDirectionKey = evaded;
    }
    const activeVars = (config.settings && config.settings.selectedVariants) || [];
    backendLog('FilterConfig', `Preset: ${(config.settings && config.settings.targetPreset) || 'default'}, Legendaries: ${config.settings.findLegendaries !== false}, Megas: ${config.settings.findMegasAndGigantamax !== false}, Active Variants (${activeVars.length}): [${activeVars.join(', ')}]`);
    backendLog('HuntingStart', `Automated hunting started: direction=${currentDirectionKey}`);
    updateToggleButton();
    ensureMemorySyncedBeforeHunting(() => {
      if (isRunning) scheduleNextStep(500);
    });
  } else {
    isAutoCatchCountdownActive = false;
    userManuallyPaused = true;
    wasHuntingBeforeAutoCatch = false;
    if (battleAutoStepTimer) {
      clearTimeout(battleAutoStepTimer);
      battleAutoStepTimer = null;
    }
    isBattleAutoRunning = false;
    cancelPendingAutoStart('Hunting paused by user');
    backendLog('HuntingPause', 'Automated hunting paused by user');
    isStepPending = false;
    stepPendingTicks = 0;
    isResumingFromMicroPause = false;
    isResumingFromIdlePause = false;
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
    if (sessionAutoStopTimer) {
      clearTimeout(sessionAutoStopTimer);
      sessionAutoStopTimer = null;
    }
    sessionAutoStopTime = null;
    if (mapRotationTimer) {
      clearTimeout(mapRotationTimer);
      mapRotationTimer = null;
    }
    nextMapRotationTime = null;
    isMapRotationDue = false;
    if (breakCountdownTimer) {
      clearInterval(breakCountdownTimer);
      breakCountdownTimer = null;
    }
    isRestBreakActive = false;
    updateSafetyTelemetryUI();

    try {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('abort-autocatch');
      }
    } catch (_) {}
    updateToggleButton();
  }
}

// Hardened Gaussian Human Reaction Delays with Fatigue Drift & Configurable Speed Bounds
const HARD_ANTI_BAN_STEP_FLOOR_MS = 1700;
function getHardenedHumanDelay() {
  let minMs = HARD_ANTI_BAN_STEP_FLOOR_MS;
  let maxMs = 2800;
  const s = config.safety || {};
  if (s.enableMovementSpeed !== false && typeof s.movementSpeedMinSec === 'number' && typeof s.movementSpeedMaxSec === 'number' && s.movementSpeedMinSec > 0 && s.movementSpeedMaxSec > 0) {
    minMs = Math.round(Math.min(s.movementSpeedMinSec, s.movementSpeedMaxSec) * 1000);
    maxMs = Math.round(Math.max(s.movementSpeedMinSec, s.movementSpeedMaxSec) * 1000);
  } else if (config.settings && config.settings.baseDelay) {
    const base = config.settings.baseDelay || 2250;
    const jitter = config.settings.jitter || 1100;
    const floor = config.settings.minSafetyFloor || HARD_ANTI_BAN_STEP_FLOOR_MS;
    minMs = Math.max(floor, base - Math.round(jitter / 2));
    maxMs = Math.max(minMs + 300, base + Math.round(jitter / 2));
  }
  minMs = Math.max(HARD_ANTI_BAN_STEP_FLOOR_MS, minMs);
  maxMs = Math.max(minMs + 300, maxMs);

  // True Gaussian distribution centered at midpoint between minMs and maxMs
  const mean = (minMs + maxMs) / 2;
  const range = Math.max(100, maxMs - minMs);
  const stdDev = range / 4;

  // Box-Muller transform for true Gaussian distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.sin(2.0 * Math.PI * u2);

  // Slow human fatigue drift (-60ms to +80ms over time)
  driftAccumulator += (Math.random() - 0.48) * 15;
  driftAccumulator = Math.max(-60, Math.min(80, driftAccumulator));

  const calculatedDelay = Math.round(mean + (randStdNormal * stdDev) + driftAccumulator);
  return Math.max(minMs, Math.min(maxMs, calculatedDelay));
}

// Direction Selection & Obstacle Avoidance
const recentMoves = [];
// 8-Direction Navigation Topology & Geometry Constants
const CARDINAL_DIRECTIONS = ['Left', 'Up', 'Right', 'Down'];
const DIAGONAL_DIRECTIONS = ['Up-Left', 'Up-Right', 'Down-Right', 'Down-Left'];
const ALL_DIRECTIONS_8 = ['Left', 'Up', 'Right', 'Down', 'Up-Left', 'Up-Right', 'Down-Right', 'Down-Left'];

const OPPOSITES_8 = {
  'Left': 'Right',
  'Right': 'Left',
  'Up': 'Down',
  'Down': 'Up',
  'Up-Left': 'Down-Right',
  'Down-Right': 'Up-Left',
  'Up-Right': 'Down-Left',
  'Down-Left': 'Up-Right'
};

const PERPENDICULARS_8 = {
  'Left': ['Up', 'Down'],
  'Right': ['Up', 'Down'],
  'Up': ['Left', 'Right'],
  'Down': ['Left', 'Right'],
  'Up-Left': ['Up-Right', 'Down-Left'],
  'Up-Right': ['Up-Left', 'Down-Right'],
  'Down-Left': ['Up-Left', 'Down-Right'],
  'Down-Right': ['Up-Right', 'Down-Left']
};

const ADJACENT_45_8 = {
  'Up': ['Up-Left', 'Up-Right'],
  'Up-Right': ['Up', 'Right'],
  'Right': ['Up-Right', 'Down-Right'],
  'Down-Right': ['Right', 'Down'],
  'Down': ['Down-Right', 'Down-Left'],
  'Down-Left': ['Down', 'Left'],
  'Left': ['Down-Left', 'Up-Left'],
  'Up-Left': ['Left', 'Up']
};

// Component sharing: if a direction hits an obstacle, directions sharing that component will also collide
const SHARED_COMPONENTS_8 = {
  'Up': ['Up', 'Up-Left', 'Up-Right'],
  'Down': ['Down', 'Down-Left', 'Down-Right'],
  'Left': ['Left', 'Up-Left', 'Down-Left'],
  'Right': ['Right', 'Up-Right', 'Down-Right'],
  'Up-Left': ['Up-Left', 'Up', 'Left'],
  'Up-Right': ['Up-Right', 'Up', 'Right'],
  'Down-Left': ['Down-Left', 'Down', 'Left'],
  'Down-Right': ['Down-Right', 'Down', 'Right']
};

const navBlockedStatus = {}; // Persistent DOM button state

function isDirectionPhysicallyBlocked(dir, now = Date.now()) {
  if (!dir) return false;
  const isTransientLoad = navBlockedStatus['Up'] && navBlockedStatus['Down'] && navBlockedStatus['Left'] && navBlockedStatus['Right'];
  if (!isTransientLoad && navBlockedStatus[dir]) return true;
  if (blockedDirections[dir] && blockedDirections[dir] > now) return true;
  return false;
}

const deadEndCooldowns = {};

function detectPingPongLoop() {
  if (recentMoves.length < 4) return null;
  const len = recentMoves.length;
  const m1 = recentMoves[len - 4];
  const m2 = recentMoves[len - 3];
  const m3 = recentMoves[len - 2];
  const m4 = recentMoves[len - 1];

  // Pattern: A -> B -> A -> B where B is opposite of A
  if (m1 === m3 && m2 === m4 && OPPOSITES_8[m1] === m2) {
    return { dirA: m1, dirB: m2 };
  }
  return null;
}

function chooseEvadeDirection(blockedDir) {
  const now = Date.now();

  // Expire old dead ends
  for (const k in deadEndCooldowns) {
    if (now > deadEndCooldowns[k]) delete deadEndCooldowns[k];
  }

  // Component conflict exclusion: never evade into a direction sharing the blocked wall component!
  const excluded = SHARED_COMPONENTS_8[blockedDir] || [blockedDir];

  // 1. Prioritize unblocked perpendicular directions (gliding parallel along obstacle surface)
  const perpList = PERPENDICULARS_8[blockedDir] || ['Up', 'Down', 'Left', 'Right'];
  const unblockedFreshPerp = perpList.filter(k => !excluded.includes(k) && !isDirectionPhysicallyBlocked(k, now) && (!deadEndCooldowns[k] || deadEndCooldowns[k] <= now));
  if (unblockedFreshPerp.length > 0) {
    return unblockedFreshPerp[Math.floor(Math.random() * unblockedFreshPerp.length)];
  }

  // Fallback to any unblocked perpendicular
  const anyUnblockedPerp = perpList.filter(k => !excluded.includes(k) && !isDirectionPhysicallyBlocked(k, now));
  if (anyUnblockedPerp.length > 0) {
    return anyUnblockedPerp[Math.floor(Math.random() * anyUnblockedPerp.length)];
  }

  // 2. Check retreating diagonal or cardinal angles (moving away from obstacle surface)
  const opp = OPPOSITES_8[blockedDir] || 'Down';
  const retreatAngles = ADJACENT_45_8[opp] || [];
  const unblockedRetreat = retreatAngles.filter(k => !excluded.includes(k) && !isDirectionPhysicallyBlocked(k, now) && (!deadEndCooldowns[k] || deadEndCooldowns[k] <= now));
  if (unblockedRetreat.length > 0) {
    return unblockedRetreat[Math.floor(Math.random() * unblockedRetreat.length)];
  }

  // 3. Reversing (180-degree back-out) into opposite direction
  if (!excluded.includes(opp) && !isDirectionPhysicallyBlocked(opp, now)) {
    deadEndCooldowns[blockedDir] = now + 10000;
    return opp;
  }

  // 4. Any unblocked direction from all 8 directions (excluding shared component)
  const anyUnblocked = ALL_DIRECTIONS_8.filter(k => !excluded.includes(k) && !isDirectionPhysicallyBlocked(k, now));
  if (anyUnblocked.length > 0) {
    return anyUnblocked[Math.floor(Math.random() * anyUnblocked.length)];
  }

  // 5. Absolute fallback if enclosed on all sides: pick opposite
  return opp;
}

function chooseWanderDirection(currentDir) {
  const now = Date.now();
  currentDir = currentDir || 'Right';

  // Gather unblocked candidates across all 8 directions (cardinal + diagonal)
  const unblocked = ALL_DIRECTIONS_8.filter(d => !isDirectionPhysicallyBlocked(d, now) && (!deadEndCooldowns[d] || deadEndCooldowns[d] <= now));

  if (unblocked.length === 0) {
    const anyUnblocked = ALL_DIRECTIONS_8.filter(d => !isDirectionPhysicallyBlocked(d, now));
    if (anyUnblocked.length > 0) {
      return anyUnblocked[Math.floor(Math.random() * anyUnblocked.length)];
    }
    return chooseEvadeDirection(currentDir);
  }

  // Weighted 8-way turn selection after completing required steps:
  // Prioritizes 45-degree diagonal/cardinal veers and 90-degree perpendicular turns
  const adjList = ADJACENT_45_8[currentDir] || [];
  const perpList = PERPENDICULARS_8[currentDir] || [];
  const opp = OPPOSITES_8[currentDir];

  const turnPool = [];
  unblocked.forEach(d => {
    if (adjList.includes(d)) {
      turnPool.push(d, d, d, d); // 45-degree diagonal/cardinal veer
    } else if (perpList.includes(d)) {
      turnPool.push(d, d, d); // 90-degree perpendicular turn
    } else if (d !== currentDir && d !== opp) {
      turnPool.push(d); // 135-degree wider turn
    }
  });

  if (turnPool.length > 0) {
    return turnPool[Math.floor(Math.random() * turnPool.length)];
  }

  // Corridor fallback: if all turn angles are blocked, continue forward
  if (unblocked.includes(currentDir)) {
    return currentDir;
  }

  // Dead-end fallback: reverse
  if (unblocked.includes(opp)) {
    return opp;
  }

  return unblocked[Math.floor(Math.random() * unblocked.length)];
}

// Obstacle Avoidance Handlers
function handleMoveBlocked(dir) {
  isStepPending = false;
  if (!isRunning) return;
  if (fallbackCollisionTimer) {
    clearTimeout(fallbackCollisionTimer);
    fallbackCollisionTimer = null;
  }

  wanderStepsLeft = 0;
  const now = Date.now();
  blockedDirections[dir] = now + 2500;
  consecutiveBlockedCount++;

  // Invert diagonal axis immediately on collision
  if (dir === 'Up') diagonalVertical = 'Down';
  else if (dir === 'Down') diagonalVertical = 'Up';
  else if (dir === 'Left') diagonalHorizontal = 'Right';
  else if (dir === 'Right') diagonalHorizontal = 'Left';
  else if (dir === 'Up-Right') {
    if (blockedDirections['Up']) diagonalVertical = 'Down';
    else if (blockedDirections['Right']) diagonalHorizontal = 'Left';
    else { diagonalVertical = 'Down'; diagonalHorizontal = 'Left'; }
  } else if (dir === 'Up-Left') {
    if (blockedDirections['Up']) diagonalVertical = 'Down';
    else if (blockedDirections['Left']) diagonalHorizontal = 'Right';
    else { diagonalVertical = 'Down'; diagonalHorizontal = 'Right'; }
  } else if (dir === 'Down-Right') {
    if (blockedDirections['Down']) diagonalVertical = 'Up';
    else if (blockedDirections['Right']) diagonalHorizontal = 'Left';
    else { diagonalVertical = 'Up'; diagonalHorizontal = 'Left'; }
  } else if (dir === 'Down-Left') {
    if (blockedDirections['Down']) diagonalVertical = 'Up';
    else if (blockedDirections['Left']) diagonalHorizontal = 'Right';
    else { diagonalVertical = 'Up'; diagonalHorizontal = 'Right'; }
  }

  // Synchronize line/patrol phases so the bot doesn't keep trying to finish the turn
  const stepsPerDir = config.settings.stepsPerDirection || 1;
  const remainder = patternStepCount % stepsPerDir;
  if (remainder !== 0) {
    patternStepCount += (stepsPerDir - remainder);
  }

  console.log(`[Obstacle Blocked] Collision in direction: ${dir} (consecutive: ${consecutiveBlockedCount})`);
  backendLog('Collision', `Obstacle blocked in direction: ${dir} (consecutive: ${consecutiveBlockedCount})`);

  if (consecutiveBlockedCount >= 6) {
    updateStatus('Stuck in maze! Respawning...', '#ef4444');
    consecutiveBlockedCount = 0;
    blockedDirections = {};
    wanderStepsLeft = 0;
    delugeView.reload();
    return;
  }

  const evadeDir = chooseEvadeDirection(dir);
  currentDirectionKey = evadeDir;
  wanderStepsLeft = config.settings.stepsPerDirection || 1;

  updateStatus(`Obstacle! Turning (${evadeDir})...`, '#f59e0b');
  backendLog('Evading', `Turning towards ${evadeDir}`);

  if (walkTimeout) clearTimeout(walkTimeout);
  scheduleNextStep(getHardenedHumanDelay());
}

function handleMoveSuccess(dir, preserveNavStatus = false) {
  isStepPending = false;
  if (fallbackCollisionTimer) {
    clearTimeout(fallbackCollisionTimer);
    fallbackCollisionTimer = null;
  }
  consecutiveBlockedCount = 0;
  if (dir) {
    delete blockedDirections[dir];
    if (!preserveNavStatus) {
      delete navBlockedStatus[dir];
    }
  }
  stepCount++;
  backendLog('MoveSuccess', `Step confirmed: ${dir} (total: ${stepCount})`);
  if (stepCounterElem) {
    stepCounterElem.textContent = `Steps: ${stepCount}`;
  }

  // Defense-in-depth safety tracking
  ensureTodaySafetyState();
  dailySafetyState.todaySteps = (dailySafetyState.todaySteps || 0) + 1;
  saveDailySafetyState();
  updateSafetyTelemetryUI();

  // 1. Check daily step ceiling
  if (config.safety && config.safety.enableDailyCeilings !== false) {
    if (dailySafetyState.todaySteps >= dailySafetyState.dailyStepCeiling) {
      stopHuntingWithReason('Daily step ceiling reached', `Paused (Daily Steps: ${dailySafetyState.todaySteps}/${dailySafetyState.dailyStepCeiling})`, '#ef4444');
      playAlarmSound();
      return;
    }
  }

  // 2. Check forced rest break
  if (isRunning && config.safety && config.safety.enableForcedBreaks !== false) {
    stepsSinceLastBreak++;
    if (stepsSinceLastBreak >= (nextBreakStepTarget || 50)) {
      triggerForcedRestBreak();
      return;
    }
  }

  // Schedule next step only after previous step confirmed and new encounter has rendered on screen
  if (isRunning) {
    scheduleNextStep(getHardenedHumanDelay());
  }
}

// Webview Diagnostics & Logging Forwarder
delugeView.addEventListener('console-message', (e) => {
  if (isAdOrTrackerNoise(e.message)) return;
  backendLog('WebviewConsole', e.message);
});

delugeView.addEventListener('preload-error', (e) => {
  backendLog('PreloadError', `${e.preloadPath}: ${e.error}`);
  console.error('[Webview Preload Error]', e.preloadPath, e.error);
});

// Navigation Safety: Auto-pause outside maps, Auto-start when map is opened with safety delay
function cancelPendingAutoStart(reason = '') {
  if (autoStartTimer) {
    clearTimeout(autoStartTimer);
    autoStartTimer = null;
  }
  if (autoStartCountdownTimer) {
    clearInterval(autoStartCountdownTimer);
    autoStartCountdownTimer = null;
  }
  if (autoStartRemainingSeconds > 0) {
    if (reason) {
      backendLog('AutoStart', `Cancelled pending auto-start: ${reason}`);
    }
    autoStartRemainingSeconds = 0;
  }
}

function stopAllBattleAutomation(reason = '') {
  if (battleAutoStepTimer) {
    clearTimeout(battleAutoStepTimer);
    battleAutoStepTimer = null;
  }
  if (battleLoopTimer) {
    clearTimeout(battleLoopTimer);
    battleLoopTimer = null;
  }
  if (battleLoopFallbackTimer) {
    clearTimeout(battleLoopFallbackTimer);
    battleLoopFallbackTimer = null;
  }
  if (typeof aiActionTimeoutTimer !== 'undefined' && aiActionTimeoutTimer) {
    clearTimeout(aiActionTimeoutTimer);
    aiActionTimeoutTimer = null;
  }
  isBattleAutoRunning = false;
  isBattleLoopRunning = false;
  scheduledAutoStepKey = '';
  battleActionInFlightUntil = 0;
  consecutiveStuckBattleActions = 0;
  lastStuckActionKey = '';
  if (typeof clearPendingTrainingRotation === 'function') {
    clearPendingTrainingRotation(reason, { preserveResume: true });
  }
}

function isExplicitNonWildBattleUrl(urlStr) {
  const lower = String(urlStr || '').toLowerCase();
  const isUnlock = (typeof isUnlockOrCaptchaUrl === 'function')
    ? isUnlockOrCaptchaUrl(lower)
    : Boolean(lower.includes('/unlock') || lower.includes('captcha') || lower.includes('/security') || lower.includes('/verify'));
  if (!lower || isUnlock || isMapUrl(lower) || lower.includes('/login') || lower.includes('/catch') || lower.includes('/battle/wild')) {
    return false;
  }
  const path = lower.replace(/^https?:\/\/[^\/]+/i, '').split(/[?#]/)[0];
  if (path === '/gyms' || path === '/trainers' || path === '/gmax' || path === '/gmax/' || path === '/battle' || path === '/battle/' || path === '/battle/trainers' || path === '/battle/gyms') {
    return false;
  }
  return (
    path.includes('/battle/trainer') ||
    path.includes('/battle/gym') ||
    path.includes('/battle/user') ||
    path.includes('/battle/live') ||
    path.includes('/battle/computer') ||
    path.includes('/battle/battle') ||
    path.includes('/challenge') ||
    path.includes('/arena') ||
    path.includes('/npc') ||
    path.includes('/gym/')
  );
}

function isWildHuntingOrCatchContext(overrideUrl = '') {
  const liveUrl = (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '';
  const curUrl = String(overrideUrl || liveUrl).toLowerCase();
  if (curUrl && (isMapUrl(curUrl) || curUrl.includes('/catch') || curUrl.includes('/battle/wild'))) {
    return true;
  }
  if (!isRunning && isExplicitNonWildBattleUrl(curUrl || liveUrl)) {
    return false;
  }
  if (isAutoCatchCountdownActive || isEncounterOnScreen || targetEncounterActive || isRunning) {
    return true;
  }
  if (activeAiBattleData && (activeAiBattleData.isWildCatch || (activeAiBattleData.battleUrl && String(activeAiBattleData.battleUrl).toLowerCase().includes('/catch')))) {
    return true;
  }
  return false;
}

function handleMapNavigation(url) {
  isGuestInputFocused = false;
  const lowerUrl = (url || '').toLowerCase();
  const isWildOrNonBattleNav = Boolean(
    lowerUrl && (
      isMapUrl(lowerUrl) ||
      lowerUrl.includes('/catch') ||
      lowerUrl.includes('/battle/wild') ||
      !isBattlePageUrl(url)
    )
  );
  if (isWildOrNonBattleNav) {
    stopAllBattleAutomation('Navigated outside trainer battle');
    activeAiBattleData = null;
    if (typeof updateTeamBuilderBattleAction === 'function') updateTeamBuilderBattleAction(null);
  }
  if (url && !isMapUrl(url)) {
    guestReportsMap = false;
  }
  const onMap = url ? isMapUrl(url) : guestReportsMap;
  if (!onMap) {
    cancelPendingAutoStart('Navigated outside map');
    userManuallyPaused = false;
    autoPauseOutsideMap(url);
    if (!lowerUrl.includes('/catch') && !lowerUrl.includes('/battle/wild')) {
      isAutoCatchCountdownActive = false;
      isEncounterOnScreen = false;
      targetEncounterActive = false;
    }
  } else {
    // Clear "Outside Map" warning if on map
    if (!isRunning && statusText && statusText.textContent && statusText.textContent.includes('Outside Map')) {
      updateStatus(outOfStockPaused ? 'Paused (0 Master Balls - Restock)' : 'Paused', outOfStockPaused ? '#ef4444' : '#f59e0b');
    } else if (!isRunning && outOfStockPaused) {
      updateStatus('Paused (0 Master Balls - Restock)', '#ef4444');
    }
    if (isUnlockChallengeActive) {
      isUnlockChallengeActive = false;
      backendLog('SecurityChallenge', 'Navigated back to map from /unlock. Captcha completed.');
      updateStatus('Ready to Hunt (Captcha Solved)', '#10b981');
      silenceCaptchaAlarm();
    }
    // Ensure guest preload immediately has current target filters, owned collection, and hunting state on map navigation
    try {
      syncUserCollectionToGuest();
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('update-config', config.settings);
      }
      syncHuntingState();
    } catch (_) {}
    // Auto-start or resume hunting after map load or random map rotation
    const shouldAutoStart = (config.settings && config.settings.autoStartOnMap !== false) || wasHuntingBeforeAutoCatch || wasHuntingBeforeMapRotation;
    if (guestReportsMap && (wasHuntingBeforeMapRotation || (isMapRotatingNow && isRunning))) {
      wasHuntingBeforeMapRotation = false;
      isMapRotatingNow = false;
      isRunning = true;
      userManuallyPaused = false;
      updateToggleButton();
      const delaySec = (config.settings && config.settings.autoStartDelay) || 3;
      updateStatus('Hunting (Map Rotated)', '#10b981');
      backendLog('MapRotation', 'Arrival on new map confirmed. Resumed hunting.');
      ensureMemorySyncedBeforeHunting(() => {
        if (isRunning) scheduleNextStep(delaySec * 1000);
      });
    } else if (guestReportsMap && !isRunning && !userManuallyPaused && !isEncounterOnScreen && shouldAutoStart) {
      if (!autoStartTimer) {
        wasHuntingBeforeAutoCatch = false;
        wasHuntingBeforeMapRotation = false;
        triggerDelayedAutoStart('Map opened');
      }
    }
  }
}

let pendingUnlockRedirectUntil = 0;

function isUnlockOrCaptchaUrl(urlStr) {
  const lower = String(urlStr || '').toLowerCase();
  return Boolean(lower && (lower.includes('/unlock') || lower.includes('captcha') || lower.includes('/security') || lower.includes('/verify')));
}

function handleNavigationCaptchaLifecycle(url) {
  if (!url) return;
  pendingUnlockRedirectUntil = 0;
  if (isUnlockOrCaptchaUrl(url)) {
    pendingGmaxEntryFlow = null;
    handleCaptchaEmergencyHalt('Captcha (/unlock) navigation detected');
  }
}

let captchaRecheckTimer = null;

function requestPostLoadCaptchaRecheck(url) {
  if (!isUnlockChallengeActive && !isCaptchaAlarmActive) return;
  const targetUrl = url || (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '';
  if (!targetUrl || isUnlockOrCaptchaUrl(targetUrl) || targetUrl.toLowerCase().includes('/login')) return;
  if (delugeView && typeof delugeView.send === 'function') {
    try { delugeView.send('request-map-presence'); } catch (_) {}
  }
  if (captchaRecheckTimer) {
    if (typeof clearTimeout === 'function') clearTimeout(captchaRecheckTimer);
    captchaRecheckTimer = null;
  }
  if (typeof setTimeout === 'function') {
    captchaRecheckTimer = setTimeout(() => {
      captchaRecheckTimer = null;
      if (!isUnlockChallengeActive && !isCaptchaAlarmActive) return;
      const latestUrl = (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '';
      if (!latestUrl || isUnlockOrCaptchaUrl(latestUrl) || latestUrl.toLowerCase().includes('/login')) return;
      if (delugeView && typeof delugeView.send === 'function') {
        try { delugeView.send('request-map-presence'); } catch (_) {}
      }
    }, 450);
  }
}

delugeView.addEventListener('did-navigate', (event) => {
  const url = event.url || (delugeView && delugeView.getURL()) || '';
  if (typeof handleEvoAutoCycleNavigation === 'function') handleEvoAutoCycleNavigation(url);
  if (typeof activeEvolveCardData !== 'undefined' && activeEvolveCardData) {
    if (typeof handleEvolveCardClosed === 'function') handleEvolveCardClosed();
    else activeEvolveCardData = null;
  }
  handleNavigationCaptchaLifecycle(url);
  handleMapNavigation(url);
});

delugeView.addEventListener('did-navigate-in-page', (event) => {
  const url = event.url || (delugeView && delugeView.getURL()) || '';
  handleNavigationCaptchaLifecycle(url);
  handleMapNavigation(url);
});

let isGuestWebviewHung = false;
let guestGmaxNoActiveErrorUrl = '';
let pendingGmaxEntryFlow = null;

delugeView.addEventListener('did-finish-load', () => {
  isGuestWebviewHung = false;
  const url = (delugeView && delugeView.getURL()) || '';
  handleNavigationCaptchaLifecycle(url);
  handleMapNavigation(url);
  if (pendingGmaxEntryFlow && (Date.now() - (pendingGmaxEntryFlow.startedAt || 0) < 120000)) {
    try {
      const parsedGmax = new URL(url, 'https://www.delugerpg.com');
      const gmaxPath = (parsedGmax.pathname || '').toLowerCase();
      if (gmaxPath.includes('/battle/trainer') || gmaxPath.includes('/battle/gym') || gmaxPath.includes('/npc/')) {
        pendingGmaxEntryFlow = null;
      } else if (gmaxPath === '/gmax' || gmaxPath === '/gmax/') {
        if (delugeView && typeof delugeView.focus === 'function') {
          try { delugeView.focus(); } catch (_) {}
        }
        if (delugeView && typeof delugeView.send === 'function') {
          delugeView.send('start-gmax-challenge-flow', pendingGmaxEntryFlow);
        }
        pendingGmaxEntryFlow = null;
      }
    } catch (_) {}
  } else if (pendingGmaxEntryFlow) {
    pendingGmaxEntryFlow = null;
  }
  if (url && (url.indexOf('/battle') !== -1 || url.indexOf('/challenge') !== -1)) {
    setTimeout(() => {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('check-battle-opponents');
      }
    }, 200);
  }
  requestPostLoadCaptchaRecheck(url);
  if (typeof handleEvoAutoCyclePageLoaded === 'function') handleEvoAutoCyclePageLoaded(url);
  if (isManualReloadInProgress) {
    isManualReloadInProgress = false;
    if (manualReloadUnlockTimer) {
      clearTimeout(manualReloadUnlockTimer);
      manualReloadUnlockTimer = null;
    }
    const reloadSvg = refreshBtn ? refreshBtn.querySelector('.reload-icon') : null;
    if (reloadSvg) reloadSvg.classList.remove('spinning');
    if (!isRunning) {
      updateStatus(isCurrentPageMap() ? 'Ready' : 'Paused (Outside Map)', isCurrentPageMap() ? '#10b981' : '#f59e0b');
    }
  }
});

delugeView.addEventListener('did-stop-loading', () => {
  requestPostLoadCaptchaRecheck();
  if (isManualReloadInProgress) {
    isManualReloadInProgress = false;
    if (manualReloadUnlockTimer) {
      clearTimeout(manualReloadUnlockTimer);
      manualReloadUnlockTimer = null;
    }
    const reloadSvg = refreshBtn ? refreshBtn.querySelector('.reload-icon') : null;
    if (reloadSvg) reloadSvg.classList.remove('spinning');
    if (!isRunning) {
      updateStatus(isCurrentPageMap() ? 'Ready' : 'Paused (Outside Map)', isCurrentPageMap() ? '#10b981' : '#f59e0b');
    }
  }
});

let isHungWebviewRecoveryInProgress = false;
let guestLoadEventSeq = 0;

if (delugeView) {
  delugeView.addEventListener('did-start-loading', () => { guestLoadEventSeq++; });
  delugeView.addEventListener('dom-ready', () => { guestLoadEventSeq++; });
  delugeView.addEventListener('did-finish-load', () => { guestLoadEventSeq++; });
  delugeView.addEventListener('did-stop-loading', () => { guestLoadEventSeq++; });
}

if (typeof ipcRenderer !== 'undefined' && ipcRenderer && typeof ipcRenderer.on === 'function') {
  ipcRenderer.on('webview-hung-state', (event, data) => {
    if (data && data.hung) {
      isGuestWebviewHung = true;
      backendLog('WEBVIEW', `Host detected unresponsive guest renderer on ${data.url || ''}`);
      updateStatus('Webview hung. Click Reload to recover.', '#f59e0b');
    } else if (data && data.hung === false) {
      isGuestWebviewHung = false;
      backendLog('WEBVIEW', `Host detected guest renderer recovered on ${data.url || ''}`);
      updateStatus(isRunning ? 'Hunting Active' : 'Ready', isRunning ? '#22c55e' : '#10b981');
    }
  });
}

async function recoverHungWebviewAndLoad(targetUrl, sourceLabel = 'Watchdog') {
  if (!delugeView || isHungWebviewRecoveryInProgress) return false;
  const safeTarget = (typeof targetUrl === 'string' && /^https?:\/\//i.test(targetUrl))
    ? targetUrl
    : 'https://www.delugerpg.com/map';
  isHungWebviewRecoveryInProgress = true;
  isGuestWebviewHung = false;
  delugeView.style.pointerEvents = 'auto';
  backendLog('RELOAD_RECOVERY', `${sourceLabel}: crashing hung webview renderer and reloading ${safeTarget}`);
  updateStatus('Resetting frozen webview...', '#38bdf8');
  try {
    const wcId = (typeof delugeView.getWebContentsId === 'function') ? delugeView.getWebContentsId() : null;
    if (wcId && typeof ipcRenderer !== 'undefined' && ipcRenderer && typeof ipcRenderer.invoke === 'function') {
      const res = await ipcRenderer.invoke('recover-hung-webview', { webContentsId: wcId, targetUrl: safeTarget });
      if (res && res.success) {
        return true;
      }
    }
  } catch (err) {
    backendLog('RELOAD_WARN', `Renderer recovery fallback error: ${err.message}`);
  } finally {
    setTimeout(() => { isHungWebviewRecoveryInProgress = false; }, 1200);
  }
  try {
    if (typeof delugeView.stop === 'function') delugeView.stop();
    if (typeof delugeView.loadURL === 'function') {
      delugeView.loadURL(safeTarget).catch(() => { delugeView.src = safeTarget; });
    } else {
      delugeView.src = safeTarget;
    }
  } catch (_) {}
  return false;
}

delugeView.addEventListener('did-fail-load', (e) => {
  guestLoadEventSeq++;
  isGuestWebviewHung = false;
  if (isManualReloadInProgress) {
    isManualReloadInProgress = false;
    if (manualReloadUnlockTimer) {
      clearTimeout(manualReloadUnlockTimer);
      manualReloadUnlockTimer = null;
    }
    const reloadSvg = refreshBtn ? refreshBtn.querySelector('.reload-icon') : null;
    if (reloadSvg) reloadSvg.classList.remove('spinning');
    if (!isRunning) updateStatus('Reload failed (code ' + (e ? e.errorCode : 'unknown') + ')', '#ef4444');
  }
});

delugeView.addEventListener('render-process-gone', (details) => {
  guestLoadEventSeq++;
  isGuestWebviewHung = false;
  const reason = details ? (details.reason || details.status) : 'unknown';
  backendLog('WEBVIEW', `Webview render process gone: reason=${reason}`);
  if (isHungWebviewRecoveryInProgress) {
    updateStatus('Reloading clean webview...', '#38bdf8');
    return;
  }
  updateStatus(`Webview process terminated (${reason}). Click Reload to restore.`, '#ef4444');
});

delugeView.addEventListener('unresponsive', () => {
  isGuestWebviewHung = true;
  backendLog('WEBVIEW', 'Webview became unresponsive');
  updateStatus('Webview unresponsive. Waiting for recovery...', '#f59e0b');
});

delugeView.addEventListener('responsive', () => {
  isGuestWebviewHung = false;
  backendLog('WEBVIEW', 'Webview recovered responsiveness');
  updateStatus(isRunning ? 'Hunting Active' : 'Ready', isRunning ? '#22c55e' : '#10b981');
});

delugeView.addEventListener('will-navigate', (event) => {
  const url = event.url || '';
  if (isUnlockOrCaptchaUrl(url)) {
    pendingUnlockRedirectUntil = Date.now() + 2000;
    pendingGmaxEntryFlow = null;
    handleCaptchaEmergencyHalt('Captcha (/unlock) security redirect detected');
    return;
  }
  const currentUrl = (delugeView && delugeView.getURL && delugeView.getURL()) || '';
  const isBattleComplete = Boolean(activeAiBattleData && (activeAiBattleData.isVictoryScreen || activeAiBattleData.isDefeatScreen || activeAiBattleData.isPostBattleScreen || activeAiBattleData.isGmaxChallengeComplete));
  const isCurrentlyInBattle = (currentUrl.indexOf('/catch/') !== -1 || (currentUrl.indexOf('/battle/') !== -1 && !isBattleComplete));

  if (!isManualReloadInProgress && (isAutoCatchCountdownActive || isCurrentlyInBattle)) {
    try {
      const parsed = new URL(url, 'https://www.delugerpg.com');
      const p = (parsed.pathname || '').toLowerCase();
      const isAllowedMap = isMapUrl(url) || p.startsWith('/map');
      const isAllowedRoute = isAllowedMap || p.startsWith('/catch') || p.startsWith('/battle') || p.startsWith('/gmax') || p.startsWith('/challenge') || p.startsWith('/pokemon') || p.startsWith('/unlock') || p.includes('captcha') || p.includes('verify');
      if (!isAllowedRoute) {
        event.preventDefault();
        backendLog('NAVIGATION_GUARD', `Shielded active battle: Blocked premature navigation to ${p || url}`);
        return;
      }
    } catch (_) {}
  }
  if (url && !isMapUrl(url)) {
    guestReportsMap = false;
    autoPauseOutsideMap(url);
  }
});

delugeView.addEventListener('new-window', (event) => {
  if (event && event.url) {
    const targetUrl = event.url;
    if (targetUrl.includes('delugerpg.com') || targetUrl.startsWith('http')) {
      try {
        if (event.preventDefault) event.preventDefault();
        delugeView.loadURL(targetUrl).catch(() => {});
      } catch (_) {}
    }
  }
});

// IPC Listener from webview (game-preload.js)
delugeView.addEventListener('ipc-message', (event) => {
  if (event.channel === 'trusted-mouse-telemetry') {
    const coords = event.args[0];
    if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
      try {
        delugeView.sendInputEvent({
          type: 'mouseMove',
          x: Math.max(1, Math.round(coords.x)),
          y: Math.max(1, Math.round(coords.y))
        });
      } catch (_) {}
    }
    return;
  }

  if (event.channel === 'trusted-key-step') {
    const payload = event.args[0] || {};
    const dirToKeyCode = {
      'Up': 'Up',
      'Down': 'Down',
      'Left': 'Left',
      'Right': 'Right',
      'Up-Left': 'q',
      'Up-Right': 'e',
      'Down-Left': 'z',
      'Down-Right': 'c'
    };
    const keyCode = dirToKeyCode[payload.direction] || 'Up';
    const holdDurationMs = 42 + Math.floor(Math.random() * 35);

    try {
      delugeView.sendInputEvent({ type: 'keyDown', keyCode });
    } catch (_) {}

    setTimeout(() => {
      try {
        delugeView.sendInputEvent({ type: 'keyUp', keyCode });
      } catch (_) {}

      if (payload.reqId) {
        setTimeout(() => {
          try {
            delugeView.send('trusted-key-done', { reqId: payload.reqId });
          } catch (_) {}
        }, 12);
      }
    }, holdDurationMs);
    return;
  }

  if (event.channel === 'trusted-click-request') {
    const payload = event.args[0] || {};
    const targetX = Math.round(typeof payload.x === 'number' ? payload.x : -1);
    const targetY = Math.round(typeof payload.y === 'number' ? payload.y : -1);

    if (targetX < 0 || targetY < 0 || targetY <= 35 || (targetX <= 75 && targetY <= 75)) {
      backendLog('ACTION_AUDIT', `Blocked hardware click in invalid or header/logo zone (${targetX}, ${targetY})`);
      if (payload.reqId) {
        try {
          delugeView.send('trusted-click-done', { reqId: payload.reqId });
        } catch (_) {}
      }
      return;
    }

    const offsetX = Math.floor((Math.random() - 0.5) * 32) || 12;
    const offsetY = Math.floor((Math.random() - 0.5) * 28) || 10;
    const approachX = Math.max(1, targetX + offsetX);
    const approachY = Math.max(1, targetY + offsetY);
    const midX = Math.max(1, Math.round(targetX + offsetX * 0.4 + (Math.random() - 0.5) * 6));
    const midY = Math.max(1, Math.round(targetY + offsetY * 0.4 + (Math.random() - 0.5) * 6));

    const moveStep1Ms = 60 + Math.floor(Math.random() * 20);
    const moveStep2Ms = 50 + Math.floor(Math.random() * 20);
    const pressDelayMs = 28 + Math.floor(Math.random() * 25);
    const holdDurationMs = 52 + Math.floor(Math.random() * 38);

    try {
      delugeView.sendInputEvent({ type: 'mouseMove', x: approachX, y: approachY });
    } catch (_) {}

    setTimeout(() => {
      try {
        delugeView.sendInputEvent({ type: 'mouseMove', x: midX, y: midY });
      } catch (_) {}

      setTimeout(() => {
        try {
          delugeView.sendInputEvent({ type: 'mouseMove', x: targetX, y: targetY });
        } catch (_) {}

        setTimeout(() => {
          try {
            delugeView.sendInputEvent({ type: 'mouseDown', x: targetX, y: targetY, button: 'left', clickCount: 1 });
          } catch (_) {}

          setTimeout(() => {
            try {
              delugeView.sendInputEvent({ type: 'mouseUp', x: targetX, y: targetY, button: 'left', clickCount: 1 });
            } catch (_) {}

            if (payload.reqId) {
              setTimeout(() => {
                try {
                  delugeView.send('trusted-click-done', { reqId: payload.reqId });
                } catch (_) {}
              }, 18);
            }
          }, holdDurationMs);
        }, pressDelayMs);
      }, moveStep2Ms);
    }, moveStep1Ms);
    return;
  }

  if (event.channel === 'debug-dom-dump') {
    backendLog('DOM_DUMP', event.args[0]);
  }

  if (event.channel === 'capture-dom-dump') {
    const data = event.args[0] || {};
    try {
      const dumpsDir = path.join(path.dirname(CONFIG_PATH), 'dom_dumps');
      if (!fs.existsSync(dumpsDir)) {
        fs.mkdirSync(dumpsDir, { recursive: true });
      }

      const cleanPath = (data.pathname || 'page')
        .replace(/^\/+|\/+$/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_') || 'home';

      const cleanSearch = (data.search || '')
        .replace(/^\?+/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');

      const fileBase = cleanSearch ? `${cleanPath}__${cleanSearch}` : cleanPath;
      const filename = `dump_${fileBase}.html`;
      const targetFile = path.join(dumpsDir, filename);

      fs.writeFileSync(targetFile, data.html, 'utf8');

      // Update manifest index file
      const manifestPath = path.join(dumpsDir, 'manifest.json');
      let manifest = [];
      try {
        if (fs.existsSync(manifestPath)) {
          manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        }
      } catch (_) { manifest = []; }

      const entryKey = (data.pathname || '') + (data.search || '');
      const existingIdx = manifest.findIndex(m => m.key === entryKey);
      const entry = {
        key: entryKey,
        pathname: data.pathname,
        search: data.search,
        url: data.url,
        title: data.title,
        file: filename,
        sizeBytes: Buffer.byteLength(data.html, 'utf8'),
        lastCaptured: new Date().toISOString(),
        reason: data.reason
      };

      if (existingIdx >= 0) {
        manifest[existingIdx] = entry;
      } else {
        manifest.push(entry);
      }
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      const sizeKb = (entry.sizeBytes / 1024).toFixed(1);
      console.log(`[DOMCapture] Captured: ${data.url} -> dom_dumps/${filename} (${sizeKb} KB) [${data.reason}]`);
      backendLog('DOM_CAPTURE', `Captured ${data.url} -> ${filename} (${sizeKb} KB) [${data.reason}]`);

      if (!isRunning) {
        updateStatus(`Captured ${filename}`, '#10b981');
        setTimeout(() => {
          if (!isRunning && statusText && statusText.textContent && statusText.textContent.includes('Captured')) {
            updateStatus('Ready (Snapshot Saved)', '#38bdf8');
          }
        }, 2500);
      }
    } catch (err) {
      console.error('[DOMCapture] Failed to save snapshot:', err);
    }
  }

  if (event.channel === 'scan-pokemon-status') {
    const data = event.args[0] || {};
    if (scanStatusDot) scanStatusDot.style.background = '#388bfd';
    if (scanStatusBadge) {
      scanStatusBadge.style.color = '#388bfd';
      if (data.page && data.total) {
        scanStatusBadge.textContent = `Reading page ${data.page}/${data.total}...`;
      } else {
        scanStatusBadge.textContent = 'Scanning page 1...';
      }
    }
    if (refreshEvoBoxBtn) {
      refreshEvoBoxBtn.disabled = true;
      if (data.page && data.total) {
        refreshEvoBoxBtn.innerHTML = `&#9203; ${data.page}/${data.total}`;
      } else {
        refreshEvoBoxBtn.innerHTML = '&#9203; Scanning...';
      }
    }
  }

  if (event.channel === 'pokemon-page-synced') {
    const data = event.args[0] || {};
    if (Array.isArray(data.pokemons) && data.pokemons.length > 0 && Array.isArray(currentCollection)) {
      let changed = false;
      let selectedEvolvedAway = false;
      data.pokemons.forEach(livePoke => {
        const existing = livePoke.id
          ? currentCollection.find(p => p && p.id === livePoke.id)
          : currentCollection.find(p => p && p.name === livePoke.name && p.level === livePoke.level);
        if (existing) {
          if (selectedEvoPoke && existing.id === selectedEvoPoke.id && livePoke.name && livePoke.name !== selectedEvoPoke.name) {
            selectedEvolvedAway = true;
          }
          if (
            (livePoke.name && existing.name !== livePoke.name) ||
            (livePoke.variant && existing.variant !== livePoke.variant) ||
            (livePoke.level && existing.level !== livePoke.level) ||
            existing.canEvolve !== livePoke.canEvolve ||
            existing.evolveUrl !== livePoke.evolveUrl ||
            existing.inTeam !== livePoke.inTeam
          ) {
            if (livePoke.name) existing.name = livePoke.name;
            if (livePoke.variant) existing.variant = livePoke.variant;
            if (livePoke.level) existing.level = livePoke.level;
            if (Array.isArray(livePoke.types) && livePoke.types.length > 0) existing.types = livePoke.types;
            if (Array.isArray(livePoke.moves) && livePoke.moves.length > 0) existing.moves = livePoke.moves;
            if (livePoke.sprite) existing.sprite = livePoke.sprite;
            existing.canEvolve = livePoke.canEvolve;
            existing.evolveUrl = livePoke.evolveUrl;
            existing.inTeam = livePoke.inTeam;
            changed = true;
          }
        } else {
          currentCollection.push(livePoke);
          changed = true;
        }
      });
      if (selectedEvolvedAway) {
        if (!activeEvolveCardData || !activeEvolveCardData.isOpen || activeEvolveCardData.isMoveSelection) {
          activeEvolveCardData = null;
        }
        selectedEvoPoke = null;
      }
      if (changed) {
        try {
          fs.writeFileSync(getWritableDataPath('user_collection.json'), JSON.stringify(currentCollection, null, 2), 'utf8');
        } catch (_) {}
        syncUserCollectionToGuest();
        if (typeof refreshCandidateListsCache === 'function') {
          refreshCandidateListsCache({ resetCursors: false });
        }
        if (typeof updateRosterModeUI === 'function') {
          updateRosterModeUI();
        }
        if (aiAssistantModal && aiAssistantModal.style.display === 'flex' && typeof renderEvolutionDecisionMakerUI === 'function') {
          renderEvolutionDecisionMakerUI();
        }
      }
      if (typeof handleEvoAutoCyclePageSynced === 'function') {
        handleEvoAutoCyclePageSynced(data.pokemons);
      }
    }
  }

  if (event.channel === 'pokemon-scan-complete') {
    const data = event.args[0] || {};
    if (data.success && Array.isArray(data.pokemons)) {
      if (data.username) {
        checkAndHandleAccountSwitch(data.username);
      }
      currentCollection = data.pokemons;
      try {
        fs.writeFileSync(getWritableDataPath('user_collection.json'), JSON.stringify(currentCollection, null, 2), 'utf8');
      } catch (_) {}
      syncUserCollectionToGuest();
      if (typeof refreshCandidateListsCache === 'function') {
        refreshCandidateListsCache({ resetCursors: true });
      }
      if (scanStatusDot) scanStatusDot.style.background = '#10b981';
      if (scanStatusBadge) {
        scanStatusBadge.style.color = '#c9d8ec';
        scanStatusBadge.textContent = `${currentCollection.length} Pokemon Synced (${data.pageCount || 1} pgs)`;
      }
      if (typeof updateRosterModeUI === 'function') updateRosterModeUI();
      if (refreshEvoBoxBtn) {
        refreshEvoBoxBtn.disabled = false;
        refreshEvoBoxBtn.innerHTML = '&#8635; Scan Box';
      }
      if (aiAssistantModal && aiAssistantModal.style.display === 'flex' && typeof renderEvolutionDecisionMakerUI === 'function') {
        renderEvolutionDecisionMakerUI();
      }
      console.log(`[TeamBuilder] Successfully synced ${currentCollection.length} Pokemon across ${data.pageCount || 1} pages.`);
      backendLog('TEAM_BUILDER', `Synced ${currentCollection.length} Pokemon across ${data.pageCount || 1} pages`);

      if (isBuildSyncInProgress) {
        isBuildSyncInProgress = false;
        if (buildTeamBtn) {
          if (teamBattleMode === 'PVP' && typeof updatePvpBuildButtonLabel === 'function') {
            updatePvpBuildButtonLabel();
          } else {
            buildTeamBtn.innerHTML = '<span>&#9876;</span><span>Build Best Team</span>';
          }
          buildTeamBtn.style.opacity = '1';
        }
        if (pendingBuildLeader) {
          if (teamBattleMode === 'PVP' && typeof executePvPTeamBuild === 'function') {
            executePvPTeamBuild();
          } else if (typeof executeTeamBuild === 'function') {
            executeTeamBuild(pendingBuildLeader);
          }
          pendingBuildLeader = null;
        }
        if (teamActionStatus) {
          teamActionStatus.textContent = 'Freshest box synced & lineup updated!';
          teamActionStatus.style.color = '#238636';
          setTimeout(() => { if (teamActionStatus) teamActionStatus.textContent = ''; }, 2500);
        }
      }
      if (typeof pendingPreHuntingSyncCallback === 'function') {
        const cb = pendingPreHuntingSyncCallback;
        pendingPreHuntingSyncCallback = null;
        cb(data);
      }
      if (wasHuntingBeforeBoxScan) {
        wasHuntingBeforeBoxScan = false;
        if (isCurrentPageMap() && !isEncounterOnScreen && !userManuallyPaused) {
          isRunning = true;
          updateToggleButton();
          updateStatus('Hunting Resumed', '#10b981');
          backendLog('BoxScan', 'Box scan complete. Automatically resumed hunting.');
          scheduleNextStep(1000);
        }
      }
    } else {
      if (scanStatusDot) scanStatusDot.style.background = '#f87171';
      if (scanStatusBadge) {
        scanStatusBadge.style.color = '#f87171';
        scanStatusBadge.textContent = 'Scan failed';
      }
      if (typeof pendingPreHuntingSyncCallback === 'function') {
        const cb = pendingPreHuntingSyncCallback;
        pendingPreHuntingSyncCallback = null;
        cb(data);
      }
      if (wasHuntingBeforeBoxScan) {
        wasHuntingBeforeBoxScan = false;
        if (isCurrentPageMap() && !isEncounterOnScreen && !userManuallyPaused) {
          isRunning = true;
          updateToggleButton();
          updateStatus('Hunting Resumed', '#10b981');
          scheduleNextStep(1000);
        }
      }
      if (isBuildSyncInProgress) {
        isBuildSyncInProgress = false;
        if (buildTeamBtn) {
          if (teamBattleMode === 'PVP' && typeof updatePvpBuildButtonLabel === 'function') {
            updatePvpBuildButtonLabel();
          } else {
            buildTeamBtn.innerHTML = '<span>&#9876;</span><span>Build Best Team</span>';
          }
          buildTeamBtn.style.opacity = '1';
        }
      }
    }
  }

  if (event.channel === 'team-apply-status') {
    const data = event.args[0] || {};
    if (teamActionStatus && data.message) {
      teamActionStatus.textContent = data.message;
      teamActionStatus.style.color = '#388bfd';
    }
  }

  if (event.channel === 'team-apply-complete') {
    const data = event.args[0] || {};
    const wasApplyingBeforeComplete = Boolean(isApplyingTeamOnDeluge);
    isApplyingTeamOnDeluge = false;
    if (applyTeamBtn) {
      if (data.success) {
        applyTeamBtn.innerHTML = '<span>&#10003;</span> <span>Team Saved!</span>';
        setTimeout(() => {
          if (applyTeamBtn) applyTeamBtn.innerHTML = 'Change Team';
        }, 2500);
      } else {
        applyTeamBtn.innerHTML = 'Change Team';
      }
    }
    syncTeamActionButtonsState();
    if (teamActionStatus) {
      if (data.success) {
        teamActionStatus.textContent = 'Team updated successfully on DelugeRPG!';
        teamActionStatus.style.color = '#238636';
      } else {
        teamActionStatus.textContent = 'Failed: ' + (data.error || 'Check game window');
        teamActionStatus.style.color = '#f87171';
      }
    }
    if (data.success) {
      const teamSnapshot = (Array.isArray(lastAppliedTeamSnapshot) && lastAppliedTeamSnapshot.length > 0)
        ? lastAppliedTeamSnapshot
        : lastRecommendedTeam;
      lastAppliedTeamSnapshot = null;
      applyEquippedTeamState(teamSnapshot);
      const isTeamRotationApply = Boolean(pendingTrainingRotation && pendingTrainingRotation.stage === 'APPLYING_TEAM');
      const hasNonMaxedMembers = !areAllTeamPokemonLevel100();
      if (teamBattleAutoCheck && teamBattleAutoCheck.checked && teamBattleLoopCheck && !isUnlockChallengeActive && !isCaptchaAlarmActive && !isGMaxChallengeModeActive() && hasNonMaxedMembers && (teamRosterMode === 'TRAINING' || isTeamRotationApply)) {
        teamBattleLoopCheck.disabled = false;
        teamBattleLoopCheck.checked = true;
        updateLoopCheckboxVisual();
      }
      if (isTeamRotationApply) {
        if (pendingTrainingRotation.watchdogId) {
          clearTimeout(pendingTrainingRotation.watchdogId);
          pendingTrainingRotation.watchdogId = null;
        }
        if (pendingTrainingRotation.timerId) {
          clearTimeout(pendingTrainingRotation.timerId);
          pendingTrainingRotation.timerId = null;
        }
        if (isUnlockChallengeActive || isCaptchaAlarmActive) {
          return;
        }
        pendingTrainingRotation.stage = 'ENTERING_BATTLE';
        isBattleLoopRunning = true;
        isBattleAutoRunning = true;
        if (teamActionStatus) {
          teamActionStatus.textContent = 'New trainee roster equipped! Entering battle...';
          teamActionStatus.style.color = '#10b981';
        }
        const enterDelayMs = 1100 + Math.floor(Math.random() * 500);
        pendingTrainingRotation.timerId = setTimeout(() => {
          if (pendingTrainingRotation) pendingTrainingRotation.timerId = null;
          if (isUnlockChallengeActive || isCaptchaAlarmActive) {
            return;
          }
          if (!pendingTrainingRotation || userManuallyPaused || isPendingSessionAutoStop || !teamBattleAutoCheck || !teamBattleAutoCheck.checked || !teamBattleLoopCheck || !teamBattleLoopCheck.checked || isWildHuntingOrCatchContext()) {
            if (typeof clearPendingTrainingRotation === 'function') {
              clearPendingTrainingRotation('Training rotation aborted before Battle Now');
            }
            return;
          }
          const lockedTrainerVal = pendingTrainingRotation.lockedTrainerVal || '';
          pendingTrainingRotation = null;
          if (typeof restoreLockedTrainerSelection === 'function') {
            restoreLockedTrainerSelection(lockedTrainerVal);
          }
          if (battleOpponentBtn) {
            battleOpponentBtn.disabled = false;
            battleOpponentBtn.click();
          }
        }, enterDelayMs);
        return;
      }
    } else {
      lastAppliedTeamSnapshot = null;
      if (data.captchaDetected) {
        if (pendingTrainingRotation && (pendingTrainingRotation.stage === 'APPLYING_TEAM' || pendingTrainingRotation.stage === 'BUILDING_TEAM')) {
          if (typeof capturePostCaptchaTrainingContext === 'function') capturePostCaptchaTrainingContext();
        } else if (wasApplyingBeforeComplete && teamBattleMode === 'NPC' && teamRosterMode === 'TRAINING' && !isGMaxChallengeModeActive() && teamBattleAutoCheck && teamBattleAutoCheck.checked) {
          postCaptchaResumeContext = {
            needsBuildTeam: false,
            needsApplyTeam: true,
            needsBattleNow: Boolean(teamBattleLoopCheck && teamBattleLoopCheck.checked),
            wasTrainingRotation: false,
            capturedAt: Date.now()
          };
        }
        handleCaptchaEmergencyHalt('Captcha detected while saving team');
        return;
      }
      if (pendingTrainingRotation && pendingTrainingRotation.stage === 'APPLYING_TEAM') {
        if (pendingTrainingRotation.watchdogId) {
          clearTimeout(pendingTrainingRotation.watchdogId);
          pendingTrainingRotation.watchdogId = null;
        }
        if ((pendingTrainingRotation.retryCount || 0) < 1) {
          pendingTrainingRotation.retryCount = (pendingTrainingRotation.retryCount || 0) + 1;
          if (teamActionStatus) {
            teamActionStatus.textContent = 'Team save failed - retrying Change Team...';
            teamActionStatus.style.color = '#f59e0b';
          }
          pendingTrainingRotation.timerId = setTimeout(() => {
            if (!pendingTrainingRotation) return;
            pendingTrainingRotation.timerId = null;
            if (isUnlockChallengeActive || isCaptchaAlarmActive || userManuallyPaused || isPendingSessionAutoStop || !teamBattleAutoCheck || !teamBattleAutoCheck.checked || isWildHuntingOrCatchContext()) {
              if (typeof clearPendingTrainingRotation === 'function') clearPendingTrainingRotation('Training rotation retry aborted');
              return;
            }
            if (applyTeamBtn && !applyTeamBtn.disabled) {
              applyTeamBtn.click();
            } else if (typeof clearPendingTrainingRotation === 'function') {
              clearPendingTrainingRotation('Change Team unavailable for retry');
            }
          }, 2500);
        } else {
          if (typeof clearPendingTrainingRotation === 'function') {
            clearPendingTrainingRotation('Team save failed after retry');
          }
          isBattleLoopRunning = false;
        }
        return;
      }
    }
    if (data.success && isBattleLoopRunning && teamBattleLoopCheck && teamBattleLoopCheck.checked && !isUnlockChallengeActive && !isCaptchaAlarmActive && !isWildHuntingOrCatchContext() && isCurrentPageBattle()) {
      if (teamActionStatus) {
        teamActionStatus.textContent = 'Loop: Fresh team saved! Resuming battle in 1.5s...';
        teamActionStatus.style.color = '#10b981';
      }
      setTimeout(() => {
        if (!isBattleLoopRunning || !teamBattleLoopCheck || !teamBattleLoopCheck.checked || isUnlockChallengeActive || isCaptchaAlarmActive || isWildHuntingOrCatchContext() || !isCurrentPageBattle()) return;
        if (teamSwappedAwaitingNewBattle && !isGMaxChallengeModeActive() && battleOpponentBtn) {
          battleOpponentBtn.disabled = false;
          battleOpponentBtn.click();
          return;
        }
        const seqBeforeApplyRematch = guestLoadEventSeq;
        if (delugeView && typeof delugeView.send === 'function') {
          delugeView.send('click-rematch-button');
        }
        setTimeout(() => {
          const curApplyUrl = (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '';
          const guestNavigated = Boolean((delugeView && typeof delugeView.isLoading === 'function' && delugeView.isLoading()) || guestLoadEventSeq !== seqBeforeApplyRematch);
          if (!isUnlockChallengeActive && !isCaptchaAlarmActive && !isUnlockOrCaptchaUrl(curApplyUrl) && !guestNavigated && !isWildHuntingOrCatchContext() && isCurrentPageBattle() && battleOpponentBtn) {
            battleOpponentBtn.click();
          }
        }, 600);
      }, 1500);
    }
  }

  if (event.channel === 'battle-exp-calibrated') {
    const data = event.args[0] || {};
    handleBattleExpCalibrated(data);
  }

  if (event.channel === 'scan-trainers-status') {
    const data = event.args[0] || {};
    if (data.step === 'started' || data.step === 'probing' || data.step === 'harvesting') {
      isTrainerRosterSyncRunning = true;
      if (syncTrainersBtn) syncTrainersBtn.innerHTML = '&#9632; Stop Sync';
      if (syncTrainersStatusDot) syncTrainersStatusDot.style.background = '#388bfd';
      if (syncTrainersStatusBadge) {
        syncTrainersStatusBadge.style.color = '#388bfd';
        if (data.step === 'harvesting') {
          syncTrainersStatusBadge.textContent = `Syncing ${data.current}/${data.total} (${data.trainerName})...`;
        } else {
          syncTrainersStatusBadge.textContent = data.message || 'Starting trainer sync...';
        }
      }
    } else if (data.step === 'completed') {
      isTrainerRosterSyncRunning = false;
      if (syncTrainersBtn) syncTrainersBtn.innerHTML = '&#8635; Sync Trainers';
      if (syncTrainersStatusDot) syncTrainersStatusDot.style.background = '#10b981';
      if (syncTrainersStatusBadge) {
        syncTrainersStatusBadge.style.color = '#10b981';
        syncTrainersStatusBadge.textContent = data.message || `${data.updatedCount || 0} Trainers Synced`;
      }
      if (typeof updateCategoryFilterCounts === 'function') updateCategoryFilterCounts();
      if (typeof populateGymTrainerSelect === 'function') populateGymTrainerSelect();
      if (typeof updateTrainerIntelStats === 'function') updateTrainerIntelStats();
    } else if (data.step === 'aborted') {
      isTrainerRosterSyncRunning = false;
      if (syncTrainersBtn) syncTrainersBtn.innerHTML = '&#8635; Sync Trainers';
      if (syncTrainersStatusDot) syncTrainersStatusDot.style.background = '#f59e0b';
      if (syncTrainersStatusBadge) {
        syncTrainersStatusBadge.style.color = '#f59e0b';
        syncTrainersStatusBadge.textContent = data.message || 'Sync stopped';
      }
      if (typeof updateCategoryFilterCounts === 'function') updateCategoryFilterCounts();
      if (typeof populateGymTrainerSelect === 'function') populateGymTrainerSelect();
      if (typeof updateTrainerIntelStats === 'function') updateTrainerIntelStats();
    } else if (data.step === 'probe-failed' || data.step === 'error') {
      isTrainerRosterSyncRunning = false;
      if (syncTrainersBtn) syncTrainersBtn.innerHTML = '&#8635; Sync Trainers';
      if (syncTrainersStatusDot) syncTrainersStatusDot.style.background = '#f87171';
      if (syncTrainersStatusBadge) {
        syncTrainersStatusBadge.style.color = '#f87171';
        syncTrainersStatusBadge.textContent = data.message || 'Sync error';
      }
    }
  }

  if (event.channel === 'trainer-profile-synced') {
    const data = event.args[0] || {};
    if (data && data.npcId && Array.isArray(data.roster) && data.roster.length > 0) {
      handleTrainerProfileSynced(data);
    }
  }

  if (event.channel === 'battle-opponents-detected') {
    const data = event.args[0] || {};
    const isPostBattle = Boolean(data.isPostBattleScreen || data.isVictoryScreen || data.isDefeatScreen);
    if (data && ((Array.isArray(data.roster) && data.roster.length > 0) || isPostBattle)) {
      handleLiveBattleOpponents(data);
      if (scanStatusBadge) {
        scanStatusBadge.textContent = `Captured ${data.trainerName}! (${data.roster.length} Pkmn)`;
        scanStatusBadge.style.color = '#238636';
        setTimeout(() => {
          if (scanStatusBadge) {
            scanStatusBadge.textContent = `${currentCollection ? currentCollection.length : 0} Pokemon Synced`;
            scanStatusBadge.style.color = '#8eaad0';
          }
        }, 5000);
      }
      if (activeBattleStatusMsg) {
        activeBattleStatusMsg.style.color = '#238636';
        activeBattleStatusMsg.textContent = `Successfully captured ${data.trainerName}'s ${data.roster.length}-Pokemon team into database!`;
      }
      if (typeof updateTrainerIntelStats === 'function') {
        updateTrainerIntelStats();
      }
    }
  }

  if (event.channel === 'opponent-move-observed') {
    const data = event.args[0] || {};
    if (data.pokemonName && data.moveName) {
      recordLearnedOpponentMove(data.trainerName, data.pokemonName, data.moveName);
    }
  }

  if (event.channel === 'ai-battle-action-status') {
    const data = event.args[0] || {};
    if (typeof aiActionTimeoutTimer !== 'undefined' && aiActionTimeoutTimer) {
      clearTimeout(aiActionTimeoutTimer);
      aiActionTimeoutTimer = null;
    }
    if (teamBattleActionBtn && !isUnlockChallengeActive && !isCaptchaAlarmActive && isCurrentPageBattle() && !isWildHuntingOrCatchContext()) {
      teamBattleActionBtn.disabled = false;
    }
    if (teamActionStatus) {
      if (data.blockedByCatch || isWildHuntingOrCatchContext()) {
        stopAllBattleAutomation('Auto-Catch / Map session active');
      } else if (data.success === false) {
        battleActionInFlightUntil = 0;
        if (data.buttonDisabled) {
          consecutiveStuckBattleActions += 2;
        } else {
          consecutiveStuckBattleActions += 1;
        }
        if (typeof maybeRecoverStuckBattlePage === 'function' && maybeRecoverStuckBattlePage('Action failed: ' + (data.message || data.action || 'unknown'))) {
          return;
        }
        teamActionStatus.textContent = data.message || 'Action in progress...';
        teamActionStatus.style.color = '#f87171';
        if (isUnlockChallengeActive || isCaptchaAlarmActive) {
          stopAllBattleAutomation('Captcha active');
        } else if (data.action === 'click-rematch-button' && teamBattleLoopCheck && teamBattleLoopCheck.checked && teamBattleAutoCheck && teamBattleAutoCheck.checked) {
          const curStatusUrl = (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '';
          const statusNavigating = Boolean(delugeView && typeof delugeView.isLoading === 'function' && delugeView.isLoading());
          if (!isUnlockOrCaptchaUrl(curStatusUrl) && !statusNavigating && !isGMaxChallengeModeActive() && !isWildHuntingOrCatchContext() && isCurrentPageBattle() && battleOpponentBtn) battleOpponentBtn.click();
        } else if (false) {
          if (battleAutoStepTimer) {
            clearTimeout(battleAutoStepTimer);
            battleAutoStepTimer = null;
          }
          isBattleAutoRunning = false;
        } else if (isBattleAutoRunning && teamBattleAutoCheck && teamBattleAutoCheck.checked && !isWildHuntingOrCatchContext() && isCurrentPageBattle()) {
          if (battleAutoStepTimer) clearTimeout(battleAutoStepTimer);
          scheduledAutoStepKey = '';
          battleAutoStepTimer = setTimeout(() => {
            battleAutoStepTimer = null;
            if (!isWildHuntingOrCatchContext() && isCurrentPageBattle() && delugeView && typeof delugeView.send === 'function') {
              delugeView.send('check-battle-opponents');
            }
          }, 1200);
        }
      } else {
        if (data.action === 'forfeit-battle') {
          teamActionStatus.textContent = 'Forfeited! Preparing next loop...';
          if (!isUnlockChallengeActive && !isCaptchaAlarmActive && !isWildHuntingOrCatchContext() && isCurrentPageBattle() && teamBattleLoopCheck && teamBattleLoopCheck.checked && teamBattleAutoCheck && teamBattleAutoCheck.checked) {
            scheduleNextLoopBattle();
          }
        } else {
          teamActionStatus.textContent = data.action === 'select-lead-and-start' ? 'Battle Started!' : (data.action === 'click-rematch-button' ? 'Next Battle Loading...' : 'Move Cast!');
        }
        teamActionStatus.style.color = '#10b981';
        // Watchdog: If next turn does not schedule within 1200ms, request live battle state from webview
        if (isBattleAutoRunning && teamBattleAutoCheck && teamBattleAutoCheck.checked && !isUnlockChallengeActive && !isCaptchaAlarmActive && !isWildHuntingOrCatchContext() && isCurrentPageBattle()) {
          if (!battleAutoStepTimer) {
            battleAutoStepTimer = setTimeout(() => {
              battleAutoStepTimer = null;
              if (!isWildHuntingOrCatchContext() && isCurrentPageBattle() && delugeView && typeof delugeView.send === 'function') {
                delugeView.send('check-battle-opponents');
              }
            }, 1200);
          }
        }
      }
      setTimeout(() => {
        if (teamActionStatus && (teamActionStatus.textContent === 'Battle Started!' || teamActionStatus.textContent === 'Move Cast!' || teamActionStatus.textContent === 'Action Failed')) {
          teamActionStatus.textContent = '';
        }
      }, 3500);
    }
    if (aiStatusChip) {
      if (data.success === false) {
        aiStatusChip.textContent = 'Action Failed';
        aiStatusChip.style.color = '#f87171';
        setTimeout(() => {
          if (aiStatusChip && aiStatusChip.textContent === 'Action Failed') {
            aiStatusChip.textContent = 'Ready';
            aiStatusChip.style.color = '#8eaad0';
          }
        }, 3000);
      } else {
        aiStatusChip.textContent = data.action === 'select-lead-and-start' ? 'Battle Started' : 'Move Cast';
        aiStatusChip.style.color = '#10b981';
      }
    }
    if (data.message) {
      appendAiChatMessage('AI', data.message);
    }
  }

  if (event.channel === 'battle-action-tracked') {
    const data = event.args[0] || {};
    const trustedTag = data.isTrusted ? '\x1b[32m[USER]\x1b[0m' : '\x1b[33m[BOT]\x1b[0m';
    if (data.event === 'click') {
      const elDesc = `<${data.tag}${data.name ? ' name="' + data.name + '"' : ''}${data.type ? ' type="' + data.type + '"' : ''}${data.value ? ' val="' + data.value + '"' : ''}${data.id ? ' id="' + data.id + '"' : ''}>`;
      const formDesc = data.formAction || data.formId ? ` [Form: id="${data.formId || ''}" act="${data.formAction || ''}"]` : '';
      console.log(`\x1b[36m[MATCH TRACKER]\x1b[0m ${trustedTag} \x1b[1mCLICK\x1b[0m ${elDesc} text="${data.text || ''}"${formDesc}`);
      backendLog('MATCH_TRACK', `CLICK ${data.isTrusted ? 'USER' : 'BOT'} ${elDesc} text="${data.text || ''}"${formDesc}`);
    } else if (data.event === 'submit') {
      const subDesc = data.submitter ? `<${data.submitter.tag}${data.submitter.name ? ' name="' + data.submitter.name + '"' : ''} val="${data.submitter.value || ''}">` : 'none';
      const inputsStr = Array.isArray(data.inputs) ? data.inputs.map(i => `${i.name}=${i.value}${i.checked ? '(*)' : ''}`).join(', ') : '';
      console.log(`\x1b[35m[MATCH TRACKER]\x1b[0m ${trustedTag} \x1b[1mSUBMIT\x1b[0m Form: id="${data.formId}" act="${data.formAction}" Submitter: ${subDesc}`);
      if (inputsStr) {
        console.log(`\x1b[35m[MATCH TRACKER]\x1b[0m Form Inputs: [${inputsStr}]`);
      }
      backendLog('MATCH_TRACK', `SUBMIT ${data.isTrusted ? 'USER' : 'BOT'} Form id="${data.formId}" act="${data.formAction}" sub=${subDesc} inputs=[${inputsStr}]`);
    } else if (data.event === 'change') {
      console.log(`\x1b[34m[MATCH TRACKER]\x1b[0m ${trustedTag} \x1b[1mCHANGE\x1b[0m <${data.tag} name="${data.name}" type="${data.type}" val="${data.value}" checked=${data.checked}>`);
      backendLog('MATCH_TRACK', `CHANGE ${data.isTrusted ? 'USER' : 'BOT'} <${data.tag} name="${data.name}" val="${data.value}" checked=${data.checked}>`);
    } else if (data.event === 'bot-action-detail') {
      console.log(`\x1b[33m[MATCH TRACKER]\x1b[0m \x1b[32m[BOT ACTION]\x1b[0m ${data.action}: TargetMove="${data.targetMove || ''}" MatchedRadio="${data.matchedRadio || 'NONE'}" SubmitBtn="${data.submitBtn || 'NONE'}" Form="${data.targetForm || 'NONE'}"`);
      if (Array.isArray(data.candidates) && data.candidates.length > 0) {
        console.log(`\x1b[33m[MATCH TRACKER]\x1b[0m Candidate Buttons: ${JSON.stringify(data.candidates)}`);
      }
      backendLog('MATCH_TRACK', `BOT_ACTION ${data.action} move="${data.targetMove}" radio="${data.matchedRadio}" btn="${data.submitBtn}"`);
    }
  }

  if (event.channel === 'evolve-card-detected') {
    const card = event.args[0] || {};
    handleEvolveCardDetected(card);
  }

  if (event.channel === 'evolve-card-closed') {
    handleEvolveCardClosed();
  }

  if (event.channel === 'gmax-challenge-flow-status') {
    const data = event.args[0] || {};
    if (data.step === 'completed' || data.step === 'error' || data.step === 'aborted') {
      pendingGmaxEntryFlow = null;
      if (battleOpponentBtn) {
        battleOpponentBtn.disabled = false;
        battleOpponentBtn.innerHTML = '<span>&#9876;</span> <span>Battle Now</span>';
      }
      if (applyTeamBtn) applyTeamBtn.disabled = false;
    }
    if (teamActionStatus && data.message) {
      teamActionStatus.textContent = data.message;
      teamActionStatus.style.color = data.step === 'error'
        ? '#f87171'
        : (data.step === 'completed' ? '#10b981' : '#388bfd');
    }
    if (data.step === 'completed' && delugeView && typeof delugeView.send === 'function') {
      setTimeout(() => {
        try { delugeView.send('check-battle-opponents'); } catch (_) {}
      }, 450);
    }
  }

  if (event.channel === 'request-user-collection') {
    syncUserCollectionToGuest();
  }

  if (event.channel === 'duplicate-owned-alert') {
    const alertData = event.args[0] || {};
    handleDuplicateOwnedAlert(alertData);
  }

  if (event.channel === 'player-scout-status') {
    const data = event.args[0] || {};
    if (pvpScoutBtn) {
      pvpScoutBtn.disabled = false;
      pvpScoutBtn.innerHTML = '&#128269; Scout';
    }
    if (pvpScoutStatusBadge) {
      if (data.step === 'error') {
        pvpScoutStatusBadge.textContent = data.message || 'Scout failed';
        pvpScoutStatusBadge.style.color = '#f87171';
      } else if (data.step === 'fetching') {
        pvpScoutStatusBadge.textContent = data.message || 'Scouting...';
        pvpScoutStatusBadge.style.color = '#388bfd';
      }
    }
    if (data.step === 'error' && pvpLiveStatusBadge && pvpLiveStatusBadge.textContent === 'Scanning page...') {
      pvpLiveStatusBadge.textContent = data.message || 'Team Hidden';
      pvpLiveStatusBadge.style.color = '#f87171';
    }
  }

  if (event.channel === 'player-scouted-roster') {
    const data = event.args[0] || {};
    if (pvpScoutBtn) {
      pvpScoutBtn.disabled = false;
      pvpScoutBtn.innerHTML = '&#128269; Scout';
    }
    if (data && Array.isArray(data.roster) && data.roster.length > 0) {
      scoutedPlayerOpponent = {
        name: data.username,
        trainerName: data.username,
        roster: data.roster,
        types: ['Player Team'],
        isPlayer: true,
        battleUrl: data.battleUrl || ('/battle/user/username/' + encodeURIComponent(data.username)),
        isProfileStalk: false
      };
      activePvpTargetType = 'SCOUT';
      if (typeof renderScoutedPlayerCard === 'function') {
        renderScoutedPlayerCard(scoutedPlayerOpponent);
      }
      if (pvpScoutStatusBadge) {
        pvpScoutStatusBadge.textContent = '';
      }
      if (teamBattleMode === 'PVP') {
        if (pvpStrategy !== 'COUNTERS') {
          pvpStrategy = 'COUNTERS';
          if (pvpStrategySelect) pvpStrategySelect.value = 'COUNTERS';
          updatePvpBuildButtonLabel();
        }
        resetTeamPrompt();
      }
    }
  }

  if (event.channel === 'team-intercept-captured') {
    const data = event.args[0] || {};
    try {
      const dumpDir = path.join(path.dirname(CONFIG_PATH), 'dom_dumps');
      if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir, { recursive: true });
      const filePath = path.join(dumpDir, 'team_save_intercept.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      backendLog('TEAM_INTERCEPT', `Captured and saved to ${filePath}`);
      updateStatus('Team Save Intercepted!', '#10b981');
      console.log('[TeamIntercept] Successfully captured team save transaction to dom_dumps/team_save_intercept.json');
    } catch (err) {
      console.error('[TeamIntercept] Error saving intercept:', err);
    }
  }

  if (event.channel === 'ad-detected-event') {
    const ad = event.args[0] || {};
    handleAdDetected(ad);
  }

  if (event.channel === 'ads-listener-update') {
    const data = event.args[0] || {};
    handleAdsSummaryUpdate(data);
  }

  if (event.channel === 'preload-ready' || event.channel === 'request-config') {
    isGuestInputFocused = false;
    syncUserCollectionToGuest();
    delugeView.send('update-config', config.settings);
    syncHuntingState();
    if (isRunning && isCurrentPageMap()) {
      scheduleNextStep(600);
    }
  }

  if (event.channel === 'hunting-auto-pause') {
    const data = event.args[0] || {};
    autoPauseOutsideMap(data.path || 'outside-map');
  }

  if (event.channel === 'guest-input-focused') {
    const prev = isGuestInputFocused;
    isGuestInputFocused = !!(event.args[0]);
    if (prev !== isGuestInputFocused) {
      backendLog('GuestInput', `Guest input focus changed: ${isGuestInputFocused ? 'Focused (Bot movement suspended for user typing)' : 'Blurred (Bot movement resuming)'}`);
      if (isGuestInputFocused) {
        updateStatus('Typing in Page (Paused)', '#f59e0b');
      } else if (isRunning) {
        updateStatus('Hunting Active', '#22c55e');
      }
    }
    if (isGuestInputFocused) {
      ipcRenderer.send('restore-window-focus');
    } else if (isRunning) {
      scheduleNextStep(300);
    }
  }

  if (event.channel === 'user-click-tracked') {
    const data = event.args[0] || {};
    const trustedTag = data.isTrusted ? 'USER' : 'BOT';
    backendLog('USER_CLICK', `[${trustedTag}] Clicked: ${data.desc || 'element'} on ${data.path || '/'}`);
    updateActionFeedback((data.desc || 'action').slice(0, 16) + ' (sent)', 'sent');
    if (data.path && (data.path.indexOf('/battle') !== -1 || data.path.indexOf('/challenge') !== -1)) {
      setTimeout(() => {
        if (delugeView && typeof delugeView.send === 'function') {
          delugeView.send('check-battle-opponents');
        }
      }, 350);
    }
    if (isStepPending && data.path && data.path.indexOf('/map') !== -1) {
      backendLog('ACTION_AUDIT', 'Notice: User clicked while an automated step was pending on DelugeRPG server. DelugeRPG may ignore input until previous step completes.');
    }
  }

  if (event.channel === 'user-action-queued') {
    const data = event.args[0] || {};
    backendLog('ACTION_QUEUED', `Manual move (${data.direction}) buffered while DelugeRPG server is busy`);
    updateActionFeedback(data.direction + ' (waiting on server)', 'queued');
  }

  if (event.channel === 'user-action-dispatched') {
    const data = event.args[0] || {};
    backendLog('ACTION_DISPATCHED', `Queued move (${data.direction}) dispatched after ${data.waitedMs}ms queue wait`);
    updateActionFeedback(data.direction + ' (dispatched)', 'sent');
  }

  if (event.channel === 'xhr-action-sent') {
    const data = event.args[0] || {};
    backendLog('XHR_SENT', `${data.method} ${data.url}`);
    updateActionFeedback((data.url || '/ajax/').slice(0, 18) + '...', 'sent');
  }

  if (event.channel === 'xhr-action-feedback') {
    const data = event.args[0] || {};
    const statusText = data.success ? `${data.status} OK` : `FAILED (${data.status || data.error})`;
    backendLog('XHR_FEEDBACK', `${data.method} ${data.url} -> ${statusText} in ${data.duration}ms`);
    updateActionFeedback((data.url || '').slice(0, 14) + ' -> ' + (data.status || 'OK') + ' (' + data.duration + 'ms)', data.success ? 'success' : 'error');
  }

  if (event.channel === 'manual-step') {
    const data = event.args[0] || {};
    const dir = data.direction || 'Manual';
    if (isStepPending && lastDispatchedDirection === dir) {
      // Discard echo of automated native step
      return;
    }
    backendLog('ManualNavigation', `Manual user movement detected (${dir}). Gracefully yielding step scheduling for 3.5s.`);
    isStepPending = false;
    stepPendingTicks = 0;
    currentDirectionKey = dir;
    wanderStepsLeft = (config.settings.stepsPerDirection || 1) - 1;
    if (isRunning) {
      scheduleNextStep(3500);
    }
  }

  if (event.channel === 'map-status') {
    mapIsSearching = !!(event.args[0] && event.args[0].isSearching);
  }

  if (event.channel === 'encounter-status') {
    const hasEnc = !!(event.args[0] && event.args[0].hasEncounter);
    isEncounterOnScreen = hasEnc;
    if (!hasEnc && !isAutoCatchCountdownActive) {
      targetEncounterActive = false;
    }
  }

  if (event.channel === 'nav-status') {
    backendLog('IPC_NAV_STATUS', event.args[0]);
    const data = event.args[0] || {};
    if (data.blocked) {
      for (const d in data.blocked) {
        navBlockedStatus[d] = !!data.blocked[d];
      }
    }
  }

  if (event.channel === 'move-result') {
    backendLog('IPC_MOVE_RESULT', event.args[0]);
    const data = event.args[0] || {};
    const hasFreshAllBlocked = !!(data.allBlocked && typeof data.allBlocked === 'object');
    if (hasFreshAllBlocked) {
      for (const d in data.allBlocked) {
        navBlockedStatus[d] = !!data.allBlocked[d];
      }
    }
    if (data.blocked || data.navBlocked) {
      handleMoveBlocked(data.direction || lastDispatchedDirection);
    } else if (data.success) {
      handleMoveSuccess(data.direction || lastDispatchedDirection, hasFreshAllBlocked);
    }
  }

  if (event.channel === 'toggle-hunting-hotkey') {
    toggleHunting();
  }

  if (event.channel === 'map-presence') {
    const data = event.args[0] || {};
    if (data.hasCaptcha) {
      handleCaptchaEmergencyHalt('Captcha challenge reported via map-presence');
      return;
    }
    const presenceUrl = String(data.pathname || data.url || '').toLowerCase();
    const activeViewUrl = String((delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '').toLowerCase();
    const viewIsLoading = Boolean(delugeView && typeof delugeView.isLoading === 'function' && delugeView.isLoading());
    if ((isUnlockChallengeActive || isCaptchaAlarmActive) && !viewIsLoading && Date.now() >= pendingUnlockRedirectUntil && presenceUrl && !isUnlockOrCaptchaUrl(presenceUrl) && (!activeViewUrl || (!isUnlockOrCaptchaUrl(activeViewUrl) && !activeViewUrl.includes('/login'))) && !presenceUrl.includes('/login')) {
      silenceCaptchaAlarm();
    }
    if (data.isForbidden) {
      guestReportsMap = false;
      cancelPendingAutoStart('Forbidden page detected');
      if (isRunning) {
        autoPauseOutsideMap('forbidden-page');
      }
      updateStatus('Session Blocked (403) - Recovering...', '#ef4444');
      if (!window.__delugeForbiddenRecoveryInProgress) {
        window.__delugeForbiddenRecoveryInProgress = true;
        ipcRenderer.invoke('recover-forbidden-session').catch(() => {}).finally(() => {
          setTimeout(() => {
            try {
              if (delugeView) delugeView.loadURL('https://www.delugerpg.com/login').catch(() => {});
            } catch (_) {}
            setTimeout(() => { window.__delugeForbiddenRecoveryInProgress = false; }, 5000);
          }, 600);
        });
      }
      return;
    }
    guestReportsMap = !!(data.isMap && data.hasMapEl !== false);
    if (data.isGmaxNoActiveError) {
      guestGmaxNoActiveErrorUrl = String(data.url || data.pathname || '');
    } else if (data.url && guestGmaxNoActiveErrorUrl && guestGmaxNoActiveErrorUrl !== data.url) {
      guestGmaxNoActiveErrorUrl = '';
    }
    const prevEncounter = isEncounterOnScreen;
    isEncounterOnScreen = !!data.hasEncounter;
    if (data.username) {
      checkAndHandleAccountSwitch(data.username);
    }

    if (!guestReportsMap) {
      cancelPendingAutoStart('Playable map DOM not present');
      if (isRunning) {
        autoPauseOutsideMap(data.pathname || 'outside-map');
      }
    } else {
      // Clear "Outside Map" warning if on map
      if (!isRunning && statusText && statusText.textContent && statusText.textContent.includes('Outside Map')) {
        updateStatus(outOfStockPaused ? 'Paused (0 Master Balls - Restock)' : 'Paused', outOfStockPaused ? '#ef4444' : '#f59e0b');
      } else if (!isRunning && outOfStockPaused) {
        updateStatus('Paused (0 Master Balls - Restock)', '#ef4444');
      }

      if (prevEncounter && !isEncounterOnScreen) {
        backendLog('Encounter', 'Target / wild encounter resolved. Returned to clean map view.');
      }

      if (guestReportsMap && wasHuntingBeforeMapRotation && !isEncounterOnScreen) {
        wasHuntingBeforeMapRotation = false;
        isMapRotatingNow = false;
        isRunning = true;
        userManuallyPaused = false;
        updateToggleButton();
        const delaySec = (config.settings && config.settings.autoStartDelay) || 3;
        updateStatus('Hunting (Map Rotated)', '#10b981');
        backendLog('MapRotation', 'Arrival on new map confirmed by guest. Resumed hunting.');
        scheduleNextStep(delaySec * 1000);
      } else {
        const shouldAutoStart = (config.settings && config.settings.autoStartOnMap !== false) || wasHuntingBeforeAutoCatch;
        if (!isRunning && !userManuallyPaused && !isEncounterOnScreen && !isUnlockChallengeActive && shouldAutoStart) {
          if (!autoStartTimer) {
            wasHuntingBeforeAutoCatch = false;
            triggerDelayedAutoStart('Map presence confirmed by guest');
          }
        }
      }
    }
  }

  if (event.channel === 'target-found') {
    stopAllBattleAutomation('Wild target encounter found');
    isStepPending = false;
    isEncounterOnScreen = true;
    targetEncounterActive = true;
    lastTargetFoundTime = Date.now();

    if (isMapRotationDue) {
      backendLog('MapRotation', 'Target Pokemon detected at the exact same time map rotation was due! Deferring map rotation to catch target first.');
    }

    if (!isRunning) {
      // STRICT SAFETY: Only react to screen targets during an active hunting session!
      return;
    }

    const data = event.args[0] || {};
    const rawName = data.name || 'Rare Pokemon';
    const cleanFoundName = formatCleanPokemonName(rawName) || rawName;
    if (config.settings && config.settings.avoidDuplicates !== false && data.isDuplicate) {
      backendLog('TargetDuplicate', `Skipping duplicate target encounter: ${cleanFoundName}`);
      return;
    }
    backendLog('TargetHalt', `TARGET HALT: ${cleanFoundName} (Category: ${data.category || 'Target'})`);

    // Halt movement immediately and cancel any pending auto-start
    cancelPendingAutoStart('Target encounter found');
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
    isRunning = false;
    // CRITICAL: Encounter pause is NOT a manual user pause!
    // userManuallyPaused stays false so client can auto-start once encounter is caught!
    userManuallyPaused = false;
    wasHuntingBeforeAutoCatch = true;
    isEncounterOnScreen = true;
    updateToggleButton();

    updateStatus(`FOUND: ${cleanFoundName}!`, '#22c55e');

    // Play alert sounds
    playSound(880, 0.8);
    setTimeout(() => playSound(1100, 0.8), 300);

    new Notification('Target Pokemon Found!', {
      body: `${cleanFoundName} has appeared on the map! Ready for capture.`
    });
  }

  if (event.channel === 'autocatch-status') {
    const data = event.args[0] || {};
    const step = data.step || '';
    const delaySec = data.delay ? (data.delay / 1000).toFixed(1) : '';

    if (step === 'clicking-try-catch') {
      isAutoCatchCountdownActive = true;
      stopAllBattleAutomation('Auto-Catch: Try Catch');
      const name = data.target || 'Target Pokemon';
      updateStatus(`Auto-Catch: Try Catch (${delaySec}s)...`, '#38bdf8');
      backendLog('AutoCatch', `Target encounter: ${name}. Waiting ${data.delay}ms to click Try to Catch It.`);
    } else if (step === 'starting-battle') {
      isAutoCatchCountdownActive = true;
      stopAllBattleAutomation('Auto-Catch: Start Battle');
      updateStatus(`Auto-Catch: Battle Start (${delaySec}s)...`, '#38bdf8');
      backendLog('AutoCatch', `Battle screen reached. Waiting ${data.delay}ms to click Start Battle.`);
    } else if (step === 'selecting-master-ball' || step === 'selecting-ball') {
      isAutoCatchCountdownActive = true;
      stopAllBattleAutomation('Auto-Catch: Select Ball');
      const isMasterBall = (step === 'selecting-master-ball' || data.ball === 'Master Ball');
      const stockStr = (typeof data.stock === 'number') ? ` (Stock: ${data.stock})` : '';
      if (isMasterBall && typeof data.stock === 'number') {
        dailyCatchData.masterBallStock = data.stock;
        saveDailyCatchLog();
        updateCatchLogBadge();
        renderCatchLogUI();
      }
      updateStatus(`Auto-Catch: Select ${data.ball || 'Ball'} (${delaySec}s)...`, '#eab308');
      backendLog('AutoCatch', `Selecting ${data.ball || 'Master Ball'}${stockStr}. Waiting ${data.delay}ms.`);
    } else if (step === 'throwing-master-ball' || step === 'throwing-ball') {
      isAutoCatchCountdownActive = true;
      stopAllBattleAutomation('Auto-Catch: Throw Ball');
      const isMasterBall = (step === 'throwing-master-ball' || data.ball === 'Master Ball');
      const stockStr = (typeof data.stock === 'number') ? ` (Stock: ${data.stock})` : '';
      if (isMasterBall && typeof data.stock === 'number') {
        dailyCatchData.masterBallStock = data.stock;
        saveDailyCatchLog();
        updateCatchLogBadge();
        renderCatchLogUI();
      }
      updateStatus(`Auto-Catch: Throw ${data.ball || 'Ball'} (${delaySec}s)...`, '#eab308');
      backendLog('AutoCatch', `Throwing ${data.ball || 'Master Ball'}${stockStr}. Waiting ${data.delay}ms.`);
    } else if (step === 'returning-to-map') {
      isAutoCatchCountdownActive = true;
      stopAllBattleAutomation('Auto-Catch: Return Map');
      updateStatus(`Auto-Catch: Return Map (${delaySec}s)...`, '#22c55e');
      backendLog('AutoCatch', `Catch confirmed! Waiting ${data.delay}ms to click Return to Map.`);
    } else if (step === 'completed') {
      isAutoCatchCountdownActive = false;
      const rawTarget = data.target || 'Target Pokemon';
      const cleanTarget = formatCleanPokemonName(rawTarget) || rawTarget;
      const remainingStr = (typeof data.stockRemaining === 'number') ? ` (Remaining Stock: ${data.stockRemaining})` : '';
      updateStatus(`Caught: ${cleanTarget}! Resuming...`, '#22c55e');
      backendLog('AutoCatch', `${cleanTarget} successfully captured via Master Ball${remainingStr}.`);
      userManuallyPaused = false;
      wasHuntingBeforeAutoCatch = true;

      if (isMapRotationActive() && (isMapRotationDue || (nextMapRotationTime && Date.now() >= nextMapRotationTime))) {
        isMapRotationDue = true;
        backendLog('AutoCatch', 'Target captured. Map rotation scheduled to execute upon return to map.');
      }

      recordCaughtPokemon(data.pokemon || {
        name: cleanTarget,
        fullName: rawTarget,
        variant: 'Normal',
        level: '?',
        sprite: '',
        category: 'Wild Encounter',
        ball: 'Master Ball',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }, data.stockRemaining);
    } else if (step === 'out-of-stock') {
      isAutoCatchCountdownActive = false;
      isEncounterOnScreen = false;
      targetEncounterActive = false;
      dailyCatchData.masterBallStock = 0;
      saveDailyCatchLog();
      updateCatchLogBadge();
      renderCatchLogUI();

      const delaySec = data.delay ? (data.delay / 1000).toFixed(1) : '10.0';
      updateStatus(`Master Ball (0)! Returning (${delaySec}s)...`, '#ef4444');
      backendLog('AutoCatch', `Master Ball out of stock. Redirecting directly to previous map in ${data.delay || 10000}ms.`);
      playAlarmSound();
      outOfStockPaused = true;
      userManuallyPaused = true;
      wasHuntingBeforeAutoCatch = false;
      try {
        new Notification('Master Ball Out of Stock!', {
          body: `0 Master Balls available. Redirecting back to previous map in ${delaySec}s. Hunting will remain paused.`
        });
      } catch (_) {}
    }
  }

  if (event.channel === 'ball-inventory-update') {
    const inv = event.args[0] || {};
    updateBallInventory(inv);
  }

  if (event.channel === 'unlock-detected') {
    pendingGmaxEntryFlow = null;
    handleCaptchaEmergencyHalt('Captcha (/unlock) security challenge detected');
  }

  if (event.channel === 'zoom-in') {
    zoomIn();
  }
  if (event.channel === 'zoom-out') {
    zoomOut();
  }
  if (event.channel === 'zoom-reset') {
    zoomReset();
  }
});

// Sync config and auto-fill login on page load if enabled
delugeView.addEventListener('dom-ready', () => {
  try {
    if (delugeView && typeof delugeView.setAudioMuted === 'function') {
      delugeView.setAudioMuted(!soundEnabled);
    }
  } catch (_) {}
  syncHuntingState();
  applyZoom(currentZoomFactor);
  syncUserCollectionToGuest();
  delugeView.send('update-config', config.settings);
  syncHuntingState();
  if (config.dummyAccount && (config.dummyAccount.username || config.dummyAccount.autoLogin)) {
    delugeView.send('fill-login', config.dummyAccount);
  }
  const curUrl = (delugeView && delugeView.getURL()) || '';
  if (!isBallInventorySynced && curUrl && !/\/login|\/unlock/i.test(curUrl)) {
    try {
      delugeView.send('request-ball-inventory');
    } catch (_) {}
  }
  const shouldAutoStart = config.settings && config.settings.autoStartOnMap !== false;
  if (isCurrentPageMap() && !isRunning && !userManuallyPaused && !isEncounterOnScreen && shouldAutoStart) {
    if (isMapRotationActive() && (isMapRotationDue || (nextMapRotationTime && Date.now() >= nextMapRotationTime))) {
      executeMapRotation('post_catch');
    } else if (!autoStartTimer) {
      triggerDelayedAutoStart('Map loaded on dom-ready');
    }
  }
});

// --- UI EVENT LISTENERS ---

toggleBtn.addEventListener('click', toggleHunting);

soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) {
    stopAllActiveSounds();
  }
  try {
    if (delugeView && typeof delugeView.setAudioMuted === 'function') {
      delugeView.setAudioMuted(!soundEnabled);
    }
  } catch (_) {}
  updateSoundUI();
  config.settings.soundAlert = soundEnabled;
  saveLocalConfig();
});

// Centered Modal Window Management
function showModal(modalEl) {
  if (delugeView) {
    delugeView.style.pointerEvents = 'none';
    try { delugeView.blur(); } catch (_) {}
  }
  document.body.classList.add('modal-open');
  window.focus();

  [targetModal, networkModal, accountModal, wipeModal, trainerIntelModal].forEach(m => {
    if (m) m.style.display = 'none';
  });
  if (modalEl) {
    modalEl.style.display = (modalEl === targetModal) ? 'flex' : 'block';
    if (modalBackdrop) modalBackdrop.classList.add('active');
  }
}

function closeAllModals() {
  document.body.classList.remove('modal-open');
  [targetModal, networkModal, accountModal, wipeModal, trainerIntelModal].forEach(m => {
    if (m) m.style.display = 'none';
  });
  if (modalBackdrop) modalBackdrop.classList.remove('active');
  if (delugeView) {
    delugeView.style.pointerEvents = 'auto';
    if (!isGuestInputFocused) {
      try { delugeView.focus(); } catch (_) {}
    }
  }
}
closeAllModals();

// Stop click bubbling on modals so clicks never reach backdrop or outside handlers
[targetModal, networkModal, accountModal, wipeModal, teamBuilderModal, adsInspectorModal, catchLogModal, aiAssistantModal, safetySettingsModal].forEach(m => {
  if (m) {
    m.addEventListener('click', (e) => e.stopPropagation());
    m.addEventListener('mousedown', (e) => e.stopPropagation());
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
  }
});

// Ensure inputs in host window receive immediate focus and allow typing
function setupInputFocusHandlers() {
  const allInputs = document.querySelectorAll('input, select, textarea');
  allInputs.forEach(inp => {
    inp.addEventListener('pointerdown', () => {
      if (delugeView) {
        try { delugeView.blur(); } catch (_) {}
      }
      window.focus();
    });
    inp.addEventListener('focus', () => {
      if (delugeView) {
        try { delugeView.blur(); } catch (_) {}
      }
      window.focus();
    });
  });
}
setupInputFocusHandlers();

// Ensure delugeView receives host focus whenever user interacts with game area (without disrupting guest inputs)
if (gameContainer) {
  gameContainer.addEventListener('pointerdown', (e) => {
    if (e.target !== delugeView && !isGuestInputFocused && delugeView) {
      try { delugeView.focus(); } catch (_) {}
    }
  });
}

if (modalBackdrop) {
  modalBackdrop.addEventListener('click', closeAllModals);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && wipeModal && wipeModal.style.display === 'block' && confirmWipeBtn && !confirmWipeBtn.disabled) {
    e.preventDefault();
    confirmWipeBtn.click();
    return;
  }
  if (e.key === 'Escape') {
    if (modalBackdrop && modalBackdrop.classList.contains('active')) {
      closeAllModals();
    } else if (teamBuilderModal && teamBuilderModal.style.display === 'flex') {
      closeTeamBuilderPanel();
    } else if (adsInspectorModal && adsInspectorModal.style.display === 'flex') {
      closeAdsInspectorPanel();
    } else if (catchLogModal && catchLogModal.style.display === 'flex') {
      closeCatchLogPanel();
    } else if (aiAssistantModal && aiAssistantModal.style.display === 'flex') {
      closeAiAssistantPanel();
    } else if (safetySettingsModal && safetySettingsModal.style.display === 'flex') {
      closeSafetySettingsPanel();
    }
  }
  if (e.code === 'Space' || e.key === ' ') {
    if (e.repeat) return;
    const activeEl = document.activeElement;
    const tag = activeEl ? (activeEl.tagName || '').toUpperCase() : '';
    const type = activeEl && activeEl.type ? String(activeEl.type).toLowerCase() : '';
    const isTextInput = tag === 'TEXTAREA' || tag === 'SELECT' || !!(activeEl && activeEl.isContentEditable) ||
      (tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'hidden', 'image'].includes(type));
    if (!isTextInput && !document.body.classList.contains('modal-open')) {
      e.preventDefault();
      e.stopPropagation();
      if (activeEl && (tag === 'BUTTON' || tag === 'INPUT')) {
        try { activeEl.blur(); } catch (_) {}
      }
      toggleHunting();
    }
  }
});

// Modal Tab Switching Controller
document.querySelectorAll('.modal-tab-btn').forEach(tabBtn => {
  tabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const targetTabId = tabBtn.getAttribute('data-tab');
    const radioId = tabBtn.getAttribute('for');
    if (radioId) {
      const radioEl = document.getElementById(radioId);
      if (radioEl) radioEl.checked = true;
    }
    document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
    tabBtn.classList.add('active');
    const targetContent = document.getElementById(targetTabId);
    if (targetContent) targetContent.classList.add('active');
  });
});

// Target Filter Modal Management
function openTargetModal() {
  closeNavDropdown();
  const targetTab1 = document.getElementById('targetTab1');
  if (targetTab1) targetTab1.checked = true;
  document.querySelectorAll('.modal-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === 'tabSpecies');
  });
  document.querySelectorAll('.modal-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === 'tabSpecies');
  });
  updateTargetUI();
  showModal(targetModal);
}

function closeTargetModal() {
  closeAllModals();
}

if (targetModalBtn) targetModalBtn.addEventListener('click', openTargetModal);
if (closeTargetBtn) closeTargetBtn.addEventListener('click', closeTargetModal);
if (cancelTargetBtn) cancelTargetBtn.addEventListener('click', closeTargetModal);

if (walkModeSelect) {
  walkModeSelect.addEventListener('change', () => {
    if (!config.settings) config.settings = {};
    config.settings.walkMode = walkModeSelect.value;
    patternStepCount = 0;
    wanderStepsLeft = 0;
    saveLocalConfig();
    updateStatus('Walk mode: ' + walkModeSelect.value, '#10b981');
  });
}

if (stepsPerDirInput) {
  const handleStepsChange = () => {
    let val = parseInt(stepsPerDirInput.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 50) val = 50;
    stepsPerDirInput.value = val;
    if (!config.settings) config.settings = {};
    config.settings.stepsPerDirection = val;
    wanderStepsLeft = 0;
    saveLocalConfig();
    updateStatus('Required steps: ' + val, '#10b981');
  };
  stepsPerDirInput.addEventListener('change', handleStepsChange);
  stepsPerDirInput.addEventListener('input', handleStepsChange);
}

// Preset pills click listeners in modal
if (presetAllBtn) presetAllBtn.addEventListener('click', () => applyTargetPreset('all', true));
if (presetLegBtn) presetLegBtn.addEventListener('click', () => applyTargetPreset('legendaries', true));
if (presetMegaBtn) presetMegaBtn.addEventListener('click', () => applyTargetPreset('megas', true));
if (presetVarBtn) presetVarBtn.addEventListener('click', () => applyTargetPreset('variants', true));
if (presetShinyBtn) presetShinyBtn.addEventListener('click', () => applyTargetPreset('shinies', true));
if (presetLegMegaBtn) presetLegMegaBtn.addEventListener('click', () => applyTargetPreset('legend_megas', true));

// Live checkbox and input change updates summary text
function refreshModalSummary() {
  const classicLeg = subClassicLegCheckbox ? subClassicLegCheckbox.checked : false;
  const ubLeg = subUltraBeastsCheckbox ? subUltraBeastsCheckbox.checked : false;
  const paradoxLeg = subParadoxCheckbox ? subParadoxCheckbox.checked : false;
  const isLeg = (classicLeg || ubLeg || paradoxLeg);
  if (filterLegendariesCheckbox) filterLegendariesCheckbox.checked = isLeg;

  const isMega = filterMegasCheckbox ? filterMegasCheckbox.checked : false;
  const isPseudo = filterPseudoCheckbox ? filterPseudoCheckbox.checked : false;
  const isVar = filterVariantsCheckbox ? filterVariantsCheckbox.checked : false;

  if (legVariantsWrap) legVariantsWrap.classList.toggle('dimmed', !isLeg);
  if (megaVariantsWrap) megaVariantsWrap.classList.toggle('dimmed', !isMega);
  if (pseudoVariantsWrap) pseudoVariantsWrap.classList.toggle('dimmed', !isPseudo);
  if (subVariantsWrap) subVariantsWrap.classList.toggle('dimmed', !isVar);

  const selectedVars = [];
  variantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.checked) {
      selectedVars.push(variantMap[id]);
    }
  });

  const selectedLegVars = [];
  legVariantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.checked) {
      selectedLegVars.push(legVariantMap[id]);
    }
  });

  const selectedMegaVars = [];
  megaVariantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.checked) {
      selectedMegaVars.push(megaVariantMap[id]);
    }
  });

  const selectedPseudoVars = [];
  pseudoVariantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.checked) {
      selectedPseudoVars.push(pseudoVariantMap[id]);
    }
  });

  if (legTierVariantsBadge) {
    legTierVariantsBadge.textContent = formatTierVariantsBadge(selectedLegVars, isLeg);
    legTierVariantsBadge.style.color = isLeg ? '#388bfd' : '#8eaad0';
    legTierVariantsBadge.style.opacity = isLeg ? '1' : '0.55';
  }
  if (megaTierVariantsBadge) {
    megaTierVariantsBadge.textContent = formatTierVariantsBadge(selectedMegaVars, isMega);
    megaTierVariantsBadge.style.color = isMega ? '#388bfd' : '#8eaad0';
    megaTierVariantsBadge.style.opacity = isMega ? '1' : '0.55';
  }
  if (pseudoTierVariantsBadge) {
    pseudoTierVariantsBadge.textContent = formatTierVariantsBadge(selectedPseudoVars, isPseudo);
    pseudoTierVariantsBadge.style.color = isPseudo ? '#388bfd' : '#8eaad0';
    pseudoTierVariantsBadge.style.opacity = isPseudo ? '1' : '0.55';
  }
  if (wildTierVariantsBadge) {
    wildTierVariantsBadge.textContent = formatTierVariantsBadge(selectedVars, isVar);
    wildTierVariantsBadge.style.color = isVar ? '#388bfd' : '#8eaad0';
    wildTierVariantsBadge.style.opacity = isVar ? '1' : '0.55';
  }

  updateVariantTabCount(selectedVars.length);

  const customTargets = (customTargetInput && customTargetInput.value)
    ? customTargetInput.value.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const blacklist = (blacklistInput && blacklistInput.value)
    ? blacklistInput.value.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const isLevel = filterLevelCheckbox ? filterLevelCheckbox.checked : false;
  const levelMode = levelModeSelect ? levelModeSelect.value : 'min';
  const levelVal = levelValueInput ? (parseInt(levelValueInput.value, 10) || 50) : 50;
  const levelScope = levelScopeSelect ? levelScopeSelect.value : 'targets';

  const selectedTypesList = [];
  document.querySelectorAll('.type-chip-input:checked').forEach(inp => {
    selectedTypesList.push(inp.id.replace('type_', ''));
  });
  const isTypeActive = (filterTypesCheckbox ? filterTypesCheckbox.checked : false) || (selectedTypesList.length > 0 && selectedTypesList.length < 18);

  if (targetSummaryText) {
    targetSummaryText.textContent = calculateTargetSummary(
      isLeg, isMega, isVar, isLevel, levelMode, levelVal, levelScope,
      {
        classicLeg, ubLeg, paradoxLeg,
        pseudo: isPseudo,
        pseudoVariants: selectedPseudoVars,
        selectedVariants: selectedVars,
        legendaryVariants: selectedLegVars,
        megaVariants: selectedMegaVars,
        megaTierMegas: subMegasCheckbox ? subMegasCheckbox.checked : true,
        megaTierGMax: subGMaxCheckbox ? subGMaxCheckbox.checked : true,
        megaTierStarters: subStartersCheckbox ? subStartersCheckbox.checked : true,
        enableTypeFilter: isTypeActive,
        selectedTypes: selectedTypesList,
        customTargets,
        blacklist
      }
    );
  }
}

// Bind live change listeners to all target modal controls
[
  filterLegendariesCheckbox, subClassicLegCheckbox, subUltraBeastsCheckbox, subParadoxCheckbox,
  filterMegasCheckbox, subMegasCheckbox, subGMaxCheckbox, subStartersCheckbox, filterPseudoCheckbox,
  filterVariantsCheckbox, filterTypesCheckbox
].forEach(cb => {
  if (cb) cb.addEventListener('change', refreshModalSummary);
});

if (filterMegasCheckbox) {
  filterMegasCheckbox.addEventListener('change', () => {
    if (filterMegasCheckbox.checked) {
      ensureMegaTierEnabled();
    } else {
      if (subMegasCheckbox) subMegasCheckbox.checked = false;
      if (subGMaxCheckbox) subGMaxCheckbox.checked = false;
      if (subStartersCheckbox) subStartersCheckbox.checked = false;
    }
    refreshModalSummary();
  });
}

[subMegasCheckbox, subGMaxCheckbox, subStartersCheckbox].forEach(subEl => {
  if (subEl) {
    subEl.addEventListener('change', () => {
      const anySub = (subMegasCheckbox && subMegasCheckbox.checked) ||
        (subGMaxCheckbox && subGMaxCheckbox.checked) ||
        (subStartersCheckbox && subStartersCheckbox.checked);
      if (filterMegasCheckbox) {
        filterMegasCheckbox.checked = anySub;
      }
      refreshModalSummary();
    });
  }
});

[subClassicLegCheckbox, subUltraBeastsCheckbox, subParadoxCheckbox].forEach(subEl => {
  if (subEl) {
    subEl.addEventListener('change', () => {
      const anySub = (subClassicLegCheckbox && subClassicLegCheckbox.checked) ||
        (subUltraBeastsCheckbox && subUltraBeastsCheckbox.checked) ||
        (subParadoxCheckbox && subParadoxCheckbox.checked);
      if (filterLegendariesCheckbox) {
        filterLegendariesCheckbox.checked = anySub;
      }
      refreshModalSummary();
    });
  }
});

if (filterVariantsCheckbox) {
  filterVariantsCheckbox.addEventListener('change', () => {
    if (filterVariantsCheckbox.checked) {
      const anyChecked = variantIds.some(id => {
        const el = document.getElementById(id);
        return el && el.checked;
      });
      if (!anyChecked) {
        variantIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.checked = (id !== 'varNormal');
        });
      }
    }
    refreshModalSummary();
  });
}

function ensureLegTierEnabled() {
  const anySub = (subClassicLegCheckbox && subClassicLegCheckbox.checked) ||
    (subUltraBeastsCheckbox && subUltraBeastsCheckbox.checked) ||
    (subParadoxCheckbox && subParadoxCheckbox.checked);
  if (!anySub) {
    if (subClassicLegCheckbox) subClassicLegCheckbox.checked = true;
    if (subUltraBeastsCheckbox) subUltraBeastsCheckbox.checked = true;
    if (subParadoxCheckbox) subParadoxCheckbox.checked = true;
  }
  if (filterLegendariesCheckbox) filterLegendariesCheckbox.checked = true;
}

function ensureMegaTierEnabled() {
  const anySub = (subMegasCheckbox && subMegasCheckbox.checked) ||
    (subGMaxCheckbox && subGMaxCheckbox.checked) ||
    (subStartersCheckbox && subStartersCheckbox.checked);
  if (!anySub) {
    if (subMegasCheckbox) subMegasCheckbox.checked = true;
    if (subGMaxCheckbox) subGMaxCheckbox.checked = true;
    if (subStartersCheckbox) subStartersCheckbox.checked = true;
  }
  if (filterMegasCheckbox) filterMegasCheckbox.checked = true;
}

const autoActivateLevel = () => {
  if (filterLevelCheckbox && !filterLevelCheckbox.checked) {
    filterLevelCheckbox.checked = true;
    if (levelControlsWrap) levelControlsWrap.classList.remove('dimmed');
    refreshModalSummary();
  }
};
if (levelControlsWrap) {
  levelControlsWrap.addEventListener('click', () => {
    if (filterLevelCheckbox && !filterLevelCheckbox.checked) {
      autoActivateLevel();
    }
  });
}
if (filterLevelCheckbox) {
  filterLevelCheckbox.addEventListener('change', () => {
    if (levelControlsWrap) {
      if (filterLevelCheckbox.checked) levelControlsWrap.classList.remove('dimmed');
      else levelControlsWrap.classList.add('dimmed');
    }
    refreshModalSummary();
  });
}
[levelModeSelect, levelValueInput, levelScopeSelect].forEach(el => {
  if (el) {
    el.addEventListener('focus', autoActivateLevel);
    el.addEventListener('input', autoActivateLevel);
    el.addEventListener('change', autoActivateLevel);
  }
});

variantIds.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', () => {
      const anyChecked = variantIds.some(vid => {
        const vel = document.getElementById(vid);
        return vel && vel.checked;
      });
      if (el.checked && filterVariantsCheckbox && !filterVariantsCheckbox.checked) {
        filterVariantsCheckbox.checked = true;
      } else if (!anyChecked && filterVariantsCheckbox) {
        filterVariantsCheckbox.checked = false;
      }
      refreshModalSummary();
    });
  }
});

legVariantIds.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', () => {
      const anyChecked = legVariantIds.some(vid => {
        const vel = document.getElementById(vid);
        return vel && vel.checked;
      });
      if (el.checked) {
        ensureLegTierEnabled();
      } else if (!anyChecked) {
        if (subClassicLegCheckbox) subClassicLegCheckbox.checked = false;
        if (subUltraBeastsCheckbox) subUltraBeastsCheckbox.checked = false;
        if (subParadoxCheckbox) subParadoxCheckbox.checked = false;
        if (filterLegendariesCheckbox) filterLegendariesCheckbox.checked = false;
      }
      refreshModalSummary();
    });
  }
});

megaVariantIds.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', () => {
      const anyChecked = megaVariantIds.some(vid => {
        const vel = document.getElementById(vid);
        return vel && vel.checked;
      });
      if (el.checked) {
        ensureMegaTierEnabled();
      } else if (!anyChecked) {
        if (filterMegasCheckbox) filterMegasCheckbox.checked = false;
      }
      refreshModalSummary();
    });
  }
});

pseudoVariantIds.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', () => {
      const anyChecked = pseudoVariantIds.some(vid => {
        const vel = document.getElementById(vid);
        return vel && vel.checked;
      });
      if (el.checked) {
        if (filterPseudoCheckbox) filterPseudoCheckbox.checked = true;
      } else if (!anyChecked) {
        if (filterPseudoCheckbox) filterPseudoCheckbox.checked = false;
      }
      refreshModalSummary();
    });
  }
});

function switchToVariantsTab() {
  const targetTabVariants = document.getElementById('targetTab3') || document.getElementById('targetTab2');
  if (targetTabVariants) targetTabVariants.checked = true;
  document.querySelectorAll('.modal-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === 'tabVariants');
  });
  document.querySelectorAll('.modal-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === 'tabVariants');
  });
}

function switchToTypesTab() {
  const targetTabTypes = document.getElementById('targetTab2');
  if (targetTabTypes) targetTabTypes.checked = true;
  document.querySelectorAll('.modal-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === 'tabTypes');
  });
  document.querySelectorAll('.modal-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === 'tabTypes');
  });
}

if (legTierVariantsBadge) legTierVariantsBadge.addEventListener('click', switchToVariantsTab);
if (megaTierVariantsBadge) megaTierVariantsBadge.addEventListener('click', switchToVariantsTab);
if (wildTierVariantsBadge) wildTierVariantsBadge.addEventListener('click', switchToVariantsTab);
if (pseudoTierVariantsBadge) pseudoTierVariantsBadge.addEventListener('click', switchToVariantsTab);

if (btnPseudoAllVariants) {
  btnPseudoAllVariants.addEventListener('click', () => {
    if (filterPseudoCheckbox) filterPseudoCheckbox.checked = true;
    pseudoVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = true;
    });
    refreshModalSummary();
    syncTargetModalInteractiveStates();
  });
}
if (btnPseudoVariantsOnly) {
  btnPseudoVariantsOnly.addEventListener('click', () => {
    if (filterPseudoCheckbox) filterPseudoCheckbox.checked = true;
    pseudoVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id !== 'pseudoVarNormal');
    });
    refreshModalSummary();
    syncTargetModalInteractiveStates();
  });
}
if (btnPseudoShiniesOnly) {
  btnPseudoShiniesOnly.addEventListener('click', () => {
    if (filterPseudoCheckbox) filterPseudoCheckbox.checked = true;
    pseudoVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id === 'pseudoVarShiny');
    });
    refreshModalSummary();
    syncTargetModalInteractiveStates();
  });
}
if (btnPseudoChromeOnly) {
  btnPseudoChromeOnly.addEventListener('click', () => {
    if (filterPseudoCheckbox) filterPseudoCheckbox.checked = true;
    pseudoVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id === 'pseudoVarChrome');
    });
    refreshModalSummary();
    syncTargetModalInteractiveStates();
  });
}

if (btnAllTypes) {
  btnAllTypes.addEventListener('click', () => {
    document.querySelectorAll('.type-chip-input').forEach(inp => inp.checked = true);
    if (filterTypesCheckbox) filterTypesCheckbox.checked = false;
    refreshModalSummary();
    syncTargetModalInteractiveStates();
  });
}
if (btnClearTypes) {
  btnClearTypes.addEventListener('click', () => {
    document.querySelectorAll('.type-chip-input').forEach(inp => inp.checked = false);
    if (filterTypesCheckbox) filterTypesCheckbox.checked = false;
    refreshModalSummary();
    syncTargetModalInteractiveStates();
  });
}

document.querySelectorAll('.type-chip-input').forEach(inp => {
  inp.addEventListener('change', () => {
    const checkedCount = document.querySelectorAll('.type-chip-input:checked').length;
    if (filterTypesCheckbox) {
      filterTypesCheckbox.checked = (checkedCount > 0 && checkedCount < 18);
    }
    syncTargetModalInteractiveStates();
    refreshModalSummary();
  });
});

if (filterTypesCheckbox) {
  filterTypesCheckbox.addEventListener('change', () => {
    syncTargetModalInteractiveStates();
    refreshModalSummary();
  });
}
if (filterPseudoCheckbox) {
  filterPseudoCheckbox.addEventListener('change', () => {
    syncTargetModalInteractiveStates();
    refreshModalSummary();
  });
}
if (dexCompletionMode) {
  dexCompletionMode.addEventListener('change', () => {
    syncTargetModalInteractiveStates();
    refreshModalSummary();
  });
}

// Preset Handler
const BUILT_IN_PRESETS = {
  default_legendaries: {
    findLegendaries: true,
    legendaryClassic: true,
    legendaryUltraBeasts: true,
    legendaryParadox: true,
    findPseudoLegendaries: false,
    findMegasAndGigantamax: false,
    megaTierMegas: false,
    megaTierGMax: false,
    megaTierStarters: false,
    findAnySpecialVariant: false,
    enableTypeFilter: false,
    dexCompletionMode: 'standard'
  },
  all_powerhouses: {
    findLegendaries: true,
    legendaryClassic: true,
    legendaryUltraBeasts: true,
    legendaryParadox: true,
    findPseudoLegendaries: true,
    findMegasAndGigantamax: true,
    megaTierMegas: true,
    megaTierGMax: true,
    megaTierStarters: true,
    findAnySpecialVariant: false,
    enableTypeFilter: false,
    dexCompletionMode: 'standard'
  },
  shiny_hunters: {
    findLegendaries: true,
    legendaryClassic: true,
    legendaryUltraBeasts: true,
    legendaryParadox: true,
    findPseudoLegendaries: true,
    findMegasAndGigantamax: true,
    megaTierMegas: true,
    megaTierGMax: true,
    megaTierStarters: true,
    findAnySpecialVariant: true,
    enableVariantFilter: true,
    enableTypeFilter: false,
    dexCompletionMode: 'standard'
  },
  dex_completionist: {
    findLegendaries: true,
    legendaryClassic: true,
    legendaryUltraBeasts: true,
    legendaryParadox: true,
    findPseudoLegendaries: true,
    findMegasAndGigantamax: true,
    megaTierMegas: true,
    megaTierGMax: true,
    megaTierStarters: true,
    findAnySpecialVariant: false,
    enableTypeFilter: false,
    dexCompletionMode: 'unowned_species'
  }
};

function applyNamedPreset(presetKey) {
  const p = BUILT_IN_PRESETS[presetKey] || (config.settings && config.settings.targetProfiles && config.settings.targetProfiles[presetKey]);
  if (!p) return;
  const isClassic = p.legendaryClassic !== false;
  const isUB = p.legendaryUltraBeasts !== false;
  const isParadox = p.legendaryParadox !== false;
  const isLeg = (p.findLegendaries !== false) && (isClassic || isUB || isParadox);
  if (subClassicLegCheckbox) subClassicLegCheckbox.checked = isClassic;
  if (subUltraBeastsCheckbox) subUltraBeastsCheckbox.checked = isUB;
  if (subParadoxCheckbox) subParadoxCheckbox.checked = isParadox;
  if (filterLegendariesCheckbox) filterLegendariesCheckbox.checked = isLeg;

  const isMegaPreset = p.findMegasAndGigantamax !== false;
  const subM = isMegaPreset && (p.megaTierMegas !== false);
  const subG = isMegaPreset && (p.megaTierGMax !== false);
  const subS = isMegaPreset && (p.megaTierStarters !== false);
  const isMega = isMegaPreset && (subM || subG || subS);
  if (filterMegasCheckbox) filterMegasCheckbox.checked = isMega;
  if (subMegasCheckbox) subMegasCheckbox.checked = subM;
  if (subGMaxCheckbox) subGMaxCheckbox.checked = subG;
  if (subStartersCheckbox) subStartersCheckbox.checked = subS;

  if (filterPseudoCheckbox) filterPseudoCheckbox.checked = p.findPseudoLegendaries !== false;
  if (filterVariantsCheckbox) filterVariantsCheckbox.checked = !!p.findAnySpecialVariant;
  if (filterTypesCheckbox) filterTypesCheckbox.checked = !!p.enableTypeFilter;
  if (dexCompletionMode) dexCompletionMode.value = p.dexCompletionMode || 'standard';
  syncTargetModalInteractiveStates();
  refreshModalSummary();
}

if (targetPresetSelect) {
  targetPresetSelect.addEventListener('change', () => {
    applyNamedPreset(targetPresetSelect.value);
  });
}

if (savePresetBtn) {
  savePresetBtn.addEventListener('click', () => {
    const name = (prompt('Enter name for custom target preset:') || '').trim();
    if (!name) return;
    const cleanKey = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    config.settings.targetProfiles = config.settings.targetProfiles || {};
    config.settings.targetProfiles[cleanKey] = {
      name: name,
      findLegendaries: filterLegendariesCheckbox?.checked,
      legendaryClassic: subClassicLegCheckbox?.checked,
      legendaryUltraBeasts: subUltraBeastsCheckbox?.checked,
      legendaryParadox: subParadoxCheckbox?.checked,
      findPseudoLegendaries: filterPseudoCheckbox?.checked,
      findMegasAndGigantamax: filterMegasCheckbox?.checked,
      megaTierMegas: subMegasCheckbox?.checked,
      megaTierGMax: subGMaxCheckbox?.checked,
      megaTierStarters: subStartersCheckbox?.checked,
      findAnySpecialVariant: filterVariantsCheckbox?.checked,
      enableTypeFilter: filterTypesCheckbox?.checked,
      dexCompletionMode: dexCompletionMode?.value || 'standard'
    };
    saveLocalConfig();
    const opt = document.createElement('option');
    opt.value = cleanKey;
    opt.textContent = name;
    targetPresetSelect.appendChild(opt);
    targetPresetSelect.value = cleanKey;
    syncTargetModalInteractiveStates();
    updateStatus('Saved Preset: ' + name, '#10b981');
  });
}

if (deletePresetBtn) {
  deletePresetBtn.addEventListener('click', () => {
    const curVal = targetPresetSelect ? targetPresetSelect.value : '';
    if (!curVal || ['default_legendaries', 'all_powerhouses', 'shiny_hunters', 'dex_completionist'].includes(curVal)) {
      return;
    }
    if (config.settings && config.settings.targetProfiles && config.settings.targetProfiles[curVal]) {
      delete config.settings.targetProfiles[curVal];
      saveLocalConfig();
      const opt = targetPresetSelect.querySelector('option[value="' + curVal + '"]');
      if (opt) opt.remove();
      targetPresetSelect.value = 'default_legendaries';
      applyNamedPreset('default_legendaries');
      updateStatus('Deleted Custom Preset', '#f59e0b');
    }
  });
}

if (btnLegAllVariants) {
  btnLegAllVariants.addEventListener('click', () => {
    ensureLegTierEnabled();
    legVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = true;
    });
    refreshModalSummary();
  });
}
if (btnLegVariantsOnly) {
  btnLegVariantsOnly.addEventListener('click', () => {
    ensureLegTierEnabled();
    legVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id !== 'legVarNormal');
    });
    refreshModalSummary();
  });
}
if (btnLegShiniesOnly) {
  btnLegShiniesOnly.addEventListener('click', () => {
    ensureLegTierEnabled();
    legVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id === 'legVarShiny');
    });
    refreshModalSummary();
  });
}
if (btnLegChromeOnly) {
  btnLegChromeOnly.addEventListener('click', () => {
    ensureLegTierEnabled();
    legVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id === 'legVarChrome');
    });
    refreshModalSummary();
  });
}

if (btnMegaAllVariants) {
  btnMegaAllVariants.addEventListener('click', () => {
    ensureMegaTierEnabled();
    megaVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = true;
    });
    refreshModalSummary();
  });
}
if (btnMegaVariantsOnly) {
  btnMegaVariantsOnly.addEventListener('click', () => {
    ensureMegaTierEnabled();
    megaVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id !== 'megaVarNormal');
    });
    refreshModalSummary();
  });
}
if (btnMegaShiniesOnly) {
  btnMegaShiniesOnly.addEventListener('click', () => {
    ensureMegaTierEnabled();
    megaVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id === 'megaVarShiny');
    });
    refreshModalSummary();
  });
}
if (btnMegaChromeOnly) {
  btnMegaChromeOnly.addEventListener('click', () => {
    ensureMegaTierEnabled();
    megaVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id === 'megaVarChrome');
    });
    refreshModalSummary();
  });
}

if (btnAllVariants) {
  btnAllVariants.addEventListener('click', () => {
    if (filterVariantsCheckbox) filterVariantsCheckbox.checked = true;
    variantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = true;
    });
    refreshModalSummary();
  });
}

if (btnVariantsOnly) {
  btnVariantsOnly.addEventListener('click', () => {
    if (filterVariantsCheckbox) filterVariantsCheckbox.checked = true;
    variantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id !== 'varNormal');
    });
    refreshModalSummary();
  });
}

if (btnShiniesOnly) {
  btnShiniesOnly.addEventListener('click', () => {
    if (filterVariantsCheckbox) filterVariantsCheckbox.checked = true;
    variantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id === 'varShiny');
    });
    refreshModalSummary();
  });
}

if (btnWildChromeOnly) {
  btnWildChromeOnly.addEventListener('click', () => {
    if (filterVariantsCheckbox) filterVariantsCheckbox.checked = true;
    variantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = (id === 'varChrome');
    });
    refreshModalSummary();
  });
}

if (clearBlacklistBtn) {
  clearBlacklistBtn.addEventListener('click', () => {
    if (blacklistInput) {
      blacklistInput.value = '';
      refreshModalSummary();
    }
  });
}

[customTargetInput, blacklistInput].forEach(inp => {
  if (inp) {
    inp.addEventListener('change', refreshModalSummary);
    inp.addEventListener('input', refreshModalSummary);
  }
});

if (saveTargetsBtn) {
  saveTargetsBtn.addEventListener('click', () => {
    const isAvoid = avoidDuplicatesCheck ? avoidDuplicatesCheck.checked : true;
    config.settings.avoidDuplicates = isAvoid;

    const classicLeg = subClassicLegCheckbox ? subClassicLegCheckbox.checked : false;
    const ubLeg = subUltraBeastsCheckbox ? subUltraBeastsCheckbox.checked : false;
    const paradoxLeg = subParadoxCheckbox ? subParadoxCheckbox.checked : false;
    const isLeg = (classicLeg || ubLeg || paradoxLeg);
    if (filterLegendariesCheckbox) filterLegendariesCheckbox.checked = isLeg;

    const subM = subMegasCheckbox ? subMegasCheckbox.checked : false;
    const subG = subGMaxCheckbox ? subGMaxCheckbox.checked : false;
    const subS = subStartersCheckbox ? subStartersCheckbox.checked : false;
    const isMega = (filterMegasCheckbox ? filterMegasCheckbox.checked : false) && (subM || subG || subS);
    if (filterMegasCheckbox) filterMegasCheckbox.checked = isMega;
    const isPseudo = filterPseudoCheckbox ? filterPseudoCheckbox.checked : false;
    const isVar = filterVariantsCheckbox ? filterVariantsCheckbox.checked : false;
    const selectedTypesList = [];
    document.querySelectorAll('.type-chip-input:checked').forEach(inp => {
      selectedTypesList.push(inp.id.replace('type_', ''));
    });
    const isType = (filterTypesCheckbox ? filterTypesCheckbox.checked : false) || (selectedTypesList.length > 0 && selectedTypesList.length < 18);

    const selectedPseudoVars = [];
    pseudoVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.checked) {
        selectedPseudoVars.push(pseudoVariantMap[id]);
      }
    });

    const activeDex = dexCompletionMode ? dexCompletionMode.value : 'standard';
    const routingObj = {
      legendaries: ballSelectLegendary ? ballSelectLegendary.value : 'Master Ball',
      pseudo: ballSelectPseudo ? ballSelectPseudo.value : 'Ultra Ball',
      megas: ballSelectMega ? ballSelectMega.value : 'Ultra Ball',
      types: ballSelectTypes ? ballSelectTypes.value : 'Ultra Ball',
      dex: ballSelectDex ? ballSelectDex.value : 'Ultra Ball',
      variants: ballSelectWildVariants ? ballSelectWildVariants.value : 'Ultra Ball'
    };
    const activeFallback = ballFallbackPolicy ? ballFallbackPolicy.value : 'downgrade';
    const activeCatchMode = (catchModeSmartRadio && catchModeSmartRadio.checked) ? 'smart_routing' : (autoCatchModeSelect ? autoCatchModeSelect.value : 'master_only');
    config.settings.autoCatchMode = activeCatchMode;
    if (autoCatchModeSelect) autoCatchModeSelect.value = activeCatchMode;

    const selectedVars = [];
    variantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.checked) {
        selectedVars.push(variantMap[id]);
      }
    });

    const selectedLegVars = [];
    legVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.checked) {
        selectedLegVars.push(legVariantMap[id]);
      }
    });

    const selectedMegaVars = [];
    megaVariantIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.checked) {
        selectedMegaVars.push(megaVariantMap[id]);
      }
    });

    const customVal = customTargetInput ? customTargetInput.value.trim() : '';
    const blacklistVal = blacklistInput ? blacklistInput.value.trim() : '';

    const isLevel = filterLevelCheckbox ? filterLevelCheckbox.checked : false;
    const levelMode = levelModeSelect ? levelModeSelect.value : 'min';
    const levelVal = levelValueInput ? (parseInt(levelValueInput.value, 10) || 50) : 50;
    const levelScope = levelScopeSelect ? levelScopeSelect.value : 'targets';

    config.settings.findLegendaries = isLeg;
    config.settings.legendaryClassic = classicLeg;
    config.settings.legendaryUltraBeasts = ubLeg;
    config.settings.legendaryParadox = paradoxLeg;

    config.settings.findMegasAndGigantamax = isMega;
    config.settings.megaTierMegas = subM;
    config.settings.megaTierGMax = subG;
    config.settings.megaTierStarters = subS;
    config.settings.findPseudoLegendaries = isPseudo;
    config.settings.pseudoVariants = selectedPseudoVars;
    config.settings.enableTypeFilter = isType;
    config.settings.selectedTypes = selectedTypesList;
    config.settings.dexCompletionMode = activeDex;
    config.settings.ballRouting = routingObj;
    config.settings.ballFallbackPolicy = activeFallback;

    config.settings.findAnySpecialVariant = isVar;
    config.settings.enableVariantFilter = isVar;
    config.settings.selectedVariants = selectedVars;
    config.settings.legendaryVariants = selectedLegVars;
    config.settings.megaVariants = selectedMegaVars;

    config.settings.customTargetList = customVal;
    config.settings.blacklistList = blacklistVal;

    config.settings.enableLevelFilter = isLevel;
    config.settings.levelFilterMode = levelMode;
    config.settings.levelFilterValue = levelVal;
    config.settings.levelFilterScope = levelScope;

    const hasNormal = selectedVars.includes('Normal');
    const isShinyOnly = selectedVars.length === 1 && selectedVars[0] === 'Shiny';
    const specialCount = selectedVars.filter(v => v !== 'Normal').length;
    const hasCustom = customVal.length > 0;
    const legAll10 = selectedLegVars.length === 10;
    const megaAll10 = selectedMegaVars.length === 10;

    const subLegAll = classicLeg && ubLeg && paradoxLeg;
    const subMegaAll = subM && subG && subS;

    let preset = 'custom';
    if (isLeg && subLegAll && isMega && subMegaAll && isVar && !isLevel && hasNormal && specialCount === 9 && legAll10 && megaAll10 && !hasCustom) preset = 'all';
    else if (isLeg && subLegAll && isMega && subMegaAll && isVar && !isLevel && !hasNormal && isShinyOnly && !hasCustom) preset = 'shinies';
    else if (!isLeg && !isMega && isVar && !isLevel && !hasNormal && specialCount === 9 && !hasCustom) preset = 'variants';
    else if (isLeg && subLegAll && isMega && subMegaAll && !isVar && !isLevel && legAll10 && megaAll10 && !hasCustom) preset = 'legend_megas';
    else if (isLeg && subLegAll && !isMega && !isVar && !isLevel && legAll10 && !hasCustom) preset = 'legendaries';
    else if (!isLeg && isMega && subMegaAll && !isVar && !isLevel && megaAll10 && !hasCustom) preset = 'megas';

    const chosenPreset = targetPresetSelect ? targetPresetSelect.value : preset;
    config.settings.targetPreset = chosenPreset;
    saveLocalConfig();
    updateTargetUI();
    closeTargetModal();

    delugeView.send('update-config', config.settings);
    syncHuntingState();
    updateStatus('Targets: ' + chosenPreset.toUpperCase() + ' applied', '#10b981');
  });
}

if (autoCatchModeSelect) {
  autoCatchModeSelect.addEventListener('change', () => {
    syncTargetModalInteractiveStates();
  });
}
if (catchModeMasterRadio) {
  catchModeMasterRadio.addEventListener('change', () => {
    if (autoCatchModeSelect) autoCatchModeSelect.value = 'master_only';
    config.settings.autoCatchMode = 'master_only';
    syncTargetModalInteractiveStates();
    saveLocalConfig();
  });
}
if (catchModeSmartRadio) {
  catchModeSmartRadio.addEventListener('change', () => {
    if (autoCatchModeSelect) autoCatchModeSelect.value = 'smart_routing';
    config.settings.autoCatchMode = 'smart_routing';
    syncTargetModalInteractiveStates();
    saveLocalConfig();
  });
}

function closeNavDropdown() {
  if (!navDropdown || navDropdown.classList.contains('hidden')) return;
  navDropdown.classList.add('hidden');
  if (navMenuBtn) navMenuBtn.classList.remove('btn-accent');
  const backdrop = document.getElementById('dropdownBackdrop');
  if (backdrop) backdrop.style.display = 'none';
}

function openNavDropdown() {
  if (navDropdown) navDropdown.classList.remove('hidden');
  if (navMenuBtn) navMenuBtn.classList.add('btn-accent');
  const backdrop = document.getElementById('dropdownBackdrop');
  if (backdrop) backdrop.style.display = 'block';
  if (typeof updateSafetyTelemetryUI === 'function') {
    updateSafetyTelemetryUI();
  }
}

function toggleNavDropdown() {
  if (!navDropdown) return;
  if (navDropdown.classList.contains('hidden')) {
    openNavDropdown();
  } else {
    closeNavDropdown();
  }
}

function closeDropdown() {
  closeNavDropdown();
}

// Collapsible Navigation Dropdown Menu Handlers
if (navMenuBtn && navDropdown) {
  navMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNavDropdown();
  });

  const dropdownBackdrop = document.getElementById('dropdownBackdrop');
  if (dropdownBackdrop) {
    dropdownBackdrop.addEventListener('click', closeNavDropdown);
  }

  // Prevent clicks inside navDropdown from bubbling to document or backdrop
  navDropdown.addEventListener('click', (e) => e.stopPropagation());
  navDropdown.addEventListener('mousedown', (e) => e.stopPropagation());

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!navDropdown.contains(e.target) && e.target !== navMenuBtn && (!navMenuBtn || !navMenuBtn.contains(e.target))) {
      closeNavDropdown();
    }
  });

  // Close dropdown on window blur (e.g. clicking into webview)
  window.addEventListener('blur', closeNavDropdown);
  if (delugeView) {
    delugeView.addEventListener('focus', closeNavDropdown);
  }

  // Close dropdown on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !navDropdown.classList.contains('hidden')) {
      closeNavDropdown();
    }
  });

  // Auto-close dropdown when any option inside is clicked (excluding toggle items that maintain state)
  navDropdown.querySelectorAll('.dropdown-item:not(.dropdown-toggle-item)').forEach(item => {
    item.addEventListener('click', () => {
      closeNavDropdown();
    });
  });

  // Accordion toggle handler for collapsible categories inside nav dropdown
  navDropdown.querySelectorAll('.nav-group-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = header.getAttribute('data-target');
      const content = document.getElementById(targetId);
      const arrow = header.querySelector('.nav-group-arrow');
      if (!content) return;
      const isCollapsed = content.classList.contains('collapsed') || content.style.display === 'none';
      if (isCollapsed) {
        content.classList.remove('collapsed');
        content.style.display = 'flex';
        header.setAttribute('aria-expanded', 'true');
        if (arrow) arrow.innerHTML = '&#9662;';
      } else {
        content.classList.add('collapsed');
        content.style.display = 'none';
        header.setAttribute('aria-expanded', 'false');
        if (arrow) arrow.innerHTML = '&#9656;';
      }
    });
  });
}

if (avoidDupesBtn) {
  avoidDupesBtn.addEventListener('click', () => {
    if (!config.settings) config.settings = {};
    config.settings.avoidDuplicates = !(config.settings.avoidDuplicates !== false);
    saveLocalConfig();
    updateAvoidDupesUI();
    delugeView.send('update-config', config.settings);
    updateStatus('Avoid Dupes: ' + (config.settings.avoidDuplicates ? 'ON' : 'OFF'), '#10b981');
  });
}

if (avoidDuplicatesCheck) {
  avoidDuplicatesCheck.addEventListener('change', () => {
    if (!config.settings) config.settings = {};
    config.settings.avoidDuplicates = avoidDuplicatesCheck.checked;
    saveLocalConfig();
    updateAvoidDupesUI();
    delugeView.send('update-config', config.settings);
  });
}

if (autoStartMapBtn) {
  autoStartMapBtn.addEventListener('click', () => {
    if (!config.settings) config.settings = {};
    config.settings.autoStartOnMap = !(config.settings.autoStartOnMap !== false);
    if (!config.settings.autoStartOnMap) {
      cancelPendingAutoStart('Auto-Start disabled by user');
    }
    saveLocalConfig();
    updateAutoStartMapUI();
updateRandomMapUI();
    updateStatus('Auto-Start on Maps: ' + (config.settings.autoStartOnMap ? 'ON' : 'OFF'), '#10b981');
  });
}

if (autoStartDelaySelect) {
  autoStartDelaySelect.addEventListener('change', () => {
    if (!config.settings) config.settings = {};
    const val = parseInt(autoStartDelaySelect.value, 10) || 3;
    config.settings.autoStartDelay = val;
    saveLocalConfig();
    updateAutoStartMapUI();
updateRandomMapUI();
    updateStatus(`Auto-Start Delay: ${val}s (Captcha Safety)`, '#10b981');
    backendLog('Settings', `Auto-start map safety delay updated to ${val}s`);
  });
}

if (hideAdsBtn) {
  hideAdsBtn.addEventListener('click', () => {
    if (!config.settings) config.settings = {};
    const willHide = !(config.settings.hideAdsCosmetically !== false);
    config.settings.hideAdsCosmetically = willHide;
    if (!willHide && config.settings.autoCatchMasterBall) {
      config.settings.autoCatchMasterBall = false;
      backendLog('Settings', 'Auto-Catch disabled automatically because Hide Ads was turned OFF.');
      try {
        if (delugeView && typeof delugeView.send === 'function') {
          delugeView.send('abort-autocatch');
        }
      } catch (_) {}
    }
    saveLocalConfig();
    updateHideAdsUI();
    updateAutoCatchUI();
    delugeView.send('update-config', config.settings);
    updateStatus('Hide Ads: ' + (willHide ? 'ON' : 'OFF'), '#10b981');
    backendLog('Settings', `Cosmetic ad hiding set to ${willHide}`);
  });
}

if (autoCatchBtn) {
  autoCatchBtn.addEventListener('click', () => {
    if (!config.settings) config.settings = {};
    const isHideAds = config.settings.hideAdsCosmetically !== false;
    if (!isHideAds) {
      playAlarmSound();
      updateStatus('Auto-Catch requires Hide Ads to be ON first!', '#ef4444');
      backendLog('Settings', 'Cannot enable Auto-Catch: Hide Ads is OFF.');
      return;
    }
    if (!(config.settings.autoCatchMasterBall === true) && dailyCatchData && dailyCatchData.masterBallStock === 0) {
      playAlarmSound();
      updateStatus('Cannot enable Auto-Catch: 0 Master Balls in bag!', '#ef4444');
      backendLog('Settings', 'Cannot enable Auto-Catch: Master Ball stock is 0.');
      return;
    }
    config.settings.autoCatchMasterBall = !(config.settings.autoCatchMasterBall === true);
    saveLocalConfig();
    updateAutoCatchUI();
    delugeView.send('update-config', config.settings);
    if (!config.settings.autoCatchMasterBall) {
      try {
        if (delugeView && typeof delugeView.send === 'function') {
          delugeView.send('abort-autocatch');
        }
      } catch (_) {}
    } else {
      try {
        if (delugeView && typeof delugeView.send === 'function') {
          delugeView.send('request-ball-inventory');
        }
      } catch (_) {}
    }
    updateStatus('Auto-Catch (Master Ball): ' + (config.settings.autoCatchMasterBall ? 'ON' : 'OFF'), '#10b981');
    backendLog('Settings', `Auto-Catch (Master Ball) set to ${config.settings.autoCatchMasterBall}`);
  });
}

if (openLogsBtn) {
  openLogsBtn.addEventListener('click', () => {
    closeNavDropdown();
    const { ipcRenderer } = require('electron');
    if (ipcRenderer) {
      ipcRenderer.invoke('open-log-file').catch(err => {
        console.error('Failed to open log file:', err);
      });
    }
  });
}

function flushBattleSessionCache() {
  try {
    ipcRenderer.invoke('soft-session-flush').catch(() => {});
  } catch (_) {}
}

let isManualReloadInProgress = false;
let manualReloadUnlockTimer = null;

function resolveSafeReloadTargetUrl(currentUrl) {
  const fallbackMapUrl = 'https://www.delugerpg.com/map';
  const gmaxHubUrl = 'https://www.delugerpg.com/gmax';
  if (!currentUrl || typeof currentUrl !== 'string') return fallbackMapUrl;

  let parsed;
  try {
    parsed = new URL(currentUrl, 'https://www.delugerpg.com');
  } catch (_) {
    return currentUrl;
  }
  const path = (parsed.pathname || '/').toLowerCase();

  let errPath = '';
  if (guestGmaxNoActiveErrorUrl) {
    try {
      errPath = (new URL(guestGmaxNoActiveErrorUrl, 'https://www.delugerpg.com').pathname || '').toLowerCase();
    } catch (_) {
      errPath = guestGmaxNoActiveErrorUrl.toLowerCase();
    }
  }

  const isTerminalGmaxSubpage =
    path.startsWith('/gmax/evolve') ||
    path.startsWith('/gmax/confirm') ||
    path.startsWith('/gmax/forfeit') ||
    path.startsWith('/gmax/abandon');

  const isSameErrorPage = Boolean(
    guestGmaxNoActiveErrorUrl &&
    (guestGmaxNoActiveErrorUrl === currentUrl || (errPath && errPath === path))
  );

  const isChallengeDone = Boolean(
    activeAiBattleData && activeAiBattleData.isGmaxChallengeComplete &&
    (path.startsWith('/challenge/gmax') || path.startsWith('/battle/challenge'))
  );

  if (isTerminalGmaxSubpage || isSameErrorPage || isChallengeDone) {
    if (path === '/gmax' || path === '/gmax/') {
      return fallbackMapUrl;
    }
    return gmaxHubUrl;
  }

  if (isGuestWebviewHung && (path === '/gmax' || path === '/gmax/')) {
    return fallbackMapUrl;
  }
  if (isGuestWebviewHung && path.startsWith('/challenge/gmax')) {
    return gmaxHubUrl;
  }

  return currentUrl;
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    if (manualReloadUnlockTimer) {
      clearTimeout(manualReloadUnlockTimer);
      manualReloadUnlockTimer = null;
    }
    isManualReloadInProgress = true;

    isGuestInputFocused = false;
    cancelPendingAutoStart('Manual page reload');

    // 1. Cleanly halt automated hunting and drop in-flight navigation steps
    if (isRunning) {
      isRunning = false;
      updateToggleButton();
    }
    isStepPending = false;
    stepPendingTicks = 0;
    isResumingFromMicroPause = false;
    isResumingFromIdlePause = false;
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
    if (fallbackCollisionTimer) {
      clearTimeout(fallbackCollisionTimer);
      fallbackCollisionTimer = null;
    }

    // 2. Abort guest hunting & G-Max entry ticks cleanly and ensure webview pointer events stay enabled
    pendingGmaxEntryFlow = null;
    if (delugeView) {
      delugeView.style.pointerEvents = 'auto';
      if (typeof delugeView.send === 'function') {
        try {
          delugeView.send('abort-autocatch');
          delugeView.send('abort-gmax-challenge-flow');
          delugeView.send('hunting-state-changed', { isRunning: false });
        } catch (_) {}
      }
    }
    isEncounterOnScreen = false;
    isAutoCatchCountdownActive = false;

    // 3. Spin reload icon for clear visual feedback
    const reloadSvg = refreshBtn.querySelector('.reload-icon');
    if (reloadSvg) {
      reloadSvg.classList.remove('spinning');
      void reloadSvg.offsetWidth;
      reloadSvg.classList.add('spinning');
    }

    // 4. Stop any stalled navigation/socket first, then redirect off dead/error G-Max pages or reload in place
    if (delugeView) {
      const currentTargetUrl = (typeof delugeView.getURL === 'function' && delugeView.getURL())
        || delugeView.src
        || 'https://www.delugerpg.com/map';
      const reloadTargetUrl = resolveSafeReloadTargetUrl(currentTargetUrl);
      const isRedirectTarget = reloadTargetUrl !== currentTargetUrl;

      if (isRedirectTarget) {
        guestGmaxNoActiveErrorUrl = '';
        backendLog('RELOAD_REDIRECT', `Manual reload redirecting off stale/error page ${currentTargetUrl} -> ${reloadTargetUrl}`);
        updateStatus('Redirecting away from G-Max page...', '#38bdf8');
      } else {
        backendLog('RELOAD', `Manual reload triggered for DelugeRPG webpage: ${reloadTargetUrl}`);
      }

      try {
        if (typeof delugeView.stop === 'function') {
          delugeView.stop();
        }
      } catch (_) {}

      const loadTargetCleanly = () => {
        if (isGuestWebviewHung) {
          isManualReloadInProgress = false;
          if (manualReloadUnlockTimer) {
            clearTimeout(manualReloadUnlockTimer);
            manualReloadUnlockTimer = null;
          }
          if (reloadSvg) reloadSvg.classList.remove('spinning');
          recoverHungWebviewAndLoad(reloadTargetUrl, isRedirectTarget ? 'Manual reload redirect (hung)' : 'Manual reload (hung)').catch(() => {});
          return;
        }
        try {
          if (isRedirectTarget) {
            if (typeof delugeView.loadURL === 'function') {
              delugeView.loadURL(reloadTargetUrl).catch(() => { delugeView.src = reloadTargetUrl; });
            } else {
              delugeView.src = reloadTargetUrl;
            }
          } else if (typeof delugeView.reload === 'function') {
            delugeView.reload();
          } else if (typeof delugeView.reloadIgnoringCache === 'function') {
            delugeView.reloadIgnoringCache();
          } else if (typeof delugeView.loadURL === 'function') {
            delugeView.loadURL(reloadTargetUrl).catch(() => { delugeView.src = reloadTargetUrl; });
          } else {
            delugeView.src = reloadTargetUrl;
          }
        } catch (err) {
          backendLog('RELOAD_WARN', `Native reload failed: ${err.message}`);
          try {
            if (typeof delugeView.loadURL === 'function') {
              delugeView.loadURL(reloadTargetUrl).catch(() => { delugeView.src = reloadTargetUrl; });
            } else {
              delugeView.src = reloadTargetUrl;
            }
          } catch (_) {}
        }

        // Hard recovery if reload() stalls on a pending/hung request or frozen guest renderer
        manualReloadUnlockTimer = setTimeout(() => {
          if (isManualReloadInProgress) {
            backendLog('RELOAD_WARN', `Reload timed out; forcing fresh loadURL(${reloadTargetUrl})`);
            isManualReloadInProgress = false;
            manualReloadUnlockTimer = null;
            if (reloadSvg) reloadSvg.classList.remove('spinning');
            recoverHungWebviewAndLoad(reloadTargetUrl, 'Manual reload timeout').catch(() => {});
          }
        }, 2500);
      };

      loadTargetCleanly();
    }
  });
}

// Clean Slate / Wipe Session Storage (In-DOM confirmation to prevent Windows focus loss)
function openWipeModal() {
  closeNavDropdown();
  if (wipeModal) showModal(wipeModal);
  if (confirmWipeBtn) {
    confirmWipeBtn.disabled = false;
    setTimeout(() => {
      try { confirmWipeBtn.focus(); } catch (_) {}
    }, 20);
  }
}

if (wipeBtn) {
  wipeBtn.addEventListener('click', (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    openWipeModal();
  });
}
if (closeWipeBtn) closeWipeBtn.addEventListener('click', closeAllModals);
if (cancelWipeBtn) cancelWipeBtn.addEventListener('click', closeAllModals);

let isSessionWipeInProgress = false;

if (confirmWipeBtn) {
  confirmWipeBtn.addEventListener('click', async () => {
    if (isSessionWipeInProgress) return;
    isSessionWipeInProgress = true;
    confirmWipeBtn.disabled = true;

    closeAllModals();

    // 1. Halt all bot activity and clear timers
    if (isRunning) {
      isRunning = false;
      updateToggleButton();
    }
    isStepPending = false;
    stepPendingTicks = 0;
    isResumingFromMicroPause = false;
    isResumingFromIdlePause = false;
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
    if (fallbackCollisionTimer) {
      clearTimeout(fallbackCollisionTimer);
      fallbackCollisionTimer = null;
    }
    cancelPendingAutoStart('Session wiped');

    // 2. Abort guest actions, stop active webview connections, and reset in-memory state
    if (delugeView) {
      if (typeof delugeView.send === 'function') {
        try {
          delugeView.send('abort-autocatch');
          delugeView.send('hunting-state-changed', { isRunning: false });
        } catch (_) {}
      }
      if (typeof delugeView.stop === 'function') {
        try { delugeView.stop(); } catch (_) {}
      }
    }
    isGuestInputFocused = false;
    guestReportsMap = false;
    isEncounterOnScreen = false;
    isAutoCatchCountdownActive = false;
    activeAiBattleData = null;
    liveBattleOpponent = null;
    if (typeof updateTeamBuilderBattleAction === 'function') updateTeamBuilderBattleAction(null);
    lastRecommendedTeam = [];
    recentMoves = [];
    navBlockedStatus = {};
    blockedDirections = {};

    updateStatus('Wiping Session Data & Logging Out...', '#ef4444');
    backendLog('SESSION_WIPE', 'Initiating server logout (/ajax/logout) and full persistent session/cookie wipe');
    if (delugeView && typeof delugeView.executeJavaScript === 'function') {
      try {
        await Promise.race([
          delugeView.executeJavaScript(`
            (async () => {
              try {
                await fetch('/ajax/logout', { method: 'GET', credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
              } catch (_) {}
              try {
                document.cookie.split(';').forEach(c => {
                  const eqPos = c.indexOf('=');
                  const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
                  if (name) {
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.delugerpg.com';
                  }
                });
              } catch (_) {}
              try { window.localStorage.clear(); } catch (_) {}
              try { window.sessionStorage.clear(); } catch (_) {}
              return true;
            })()
          `),
          new Promise(resolve => setTimeout(resolve, 900))
        ]);
      } catch (_) {}
    }

    let res = { success: true };
    try {
      const wipePromise = ipcRenderer.invoke('clear-session-data');
      res = await Promise.race([
        wipePromise,
        new Promise(resolve => setTimeout(() => resolve({ success: true, timedOut: true }), 2500))
      ]);
    } catch (err) {
      res = { success: false, error: err && err.message ? err.message : 'IPC error' };
    }

    if (res && res.success) {
      backendLog('SESSION_WIPE', 'Session & cookies wiped cleanly. Redirecting to /login');
      activeAccountUsername = '';
      isBallInventorySynced = false;
      dailyCatchData.username = '';
      dailyCatchData.masterBallStock = null;
      dailyCatchData.bagInventory = {
        pokeBall: null,
        greatBall: null,
        ultraBall: null,
        masterBall: null,
        rawSummary: ''
      };
      saveDailyCatchLog();
      updateCatchLogBadge();
      renderCatchLogUI();

      if (delugeView) {
        try {
          if (typeof delugeView.stop === 'function') {
            try { delugeView.stop(); } catch (_) {}
          }
          if (typeof delugeView.clearHistory === 'function') {
            try { delugeView.clearHistory(); } catch (_) {}
          }
          if (typeof delugeView.loadURL === 'function') {
            delugeView.loadURL('https://www.delugerpg.com/login').catch(() => {
              delugeView.src = 'https://www.delugerpg.com/login';
            });
          } else {
            delugeView.src = 'https://www.delugerpg.com/login';
          }
        } catch (_) {
          delugeView.src = 'https://www.delugerpg.com/login';
        }
      }
      updateStatus('Session Wiped: Clean Slate', '#10b981');
    } else {
      updateStatus('Wipe Failed: ' + ((res && res.error) || 'Unknown error'), '#ef4444');
    }

    isSessionWipeInProgress = false;
    confirmWipeBtn.disabled = false;
  });
}

// Proxy / Network Modal Management
function openNetworkModal() {
  enableProxyCheckbox.checked = !!(config.network && config.network.useProxy);
  proxyRulesInput.value = (config.network && config.network.proxyRules) || '';
  showModal(networkModal);
}

function closeNetworkModal() {
  closeAllModals();
}

networkBtn.addEventListener('click', () => {
  closeNavDropdown();
  detectNetworkIdentity();
  openNetworkModal();
});
networkBadge.addEventListener('click', () => {
  closeNavDropdown();
  detectNetworkIdentity();
  openNetworkModal();
});
closeNetBtn.addEventListener('click', closeNetworkModal);
if (cancelNetBtn) cancelNetBtn.addEventListener('click', closeNetworkModal);
if (refreshIpBtn) {
  refreshIpBtn.addEventListener('click', () => {
    detectNetworkIdentity();
  });
}

saveProxyBtn.addEventListener('click', async () => {
  const proxyCfg = {
    useProxy: enableProxyCheckbox.checked,
    proxyRules: proxyRulesInput.value.trim(),
    proxyBypass: '<local>'
  };

  config.network = proxyCfg;
  saveLocalConfig();

  updateStatus('Applying Proxy...', '#38bdf8');
  const res = await ipcRenderer.invoke('apply-proxy', proxyCfg);

  closeAllModals();
  updateNetworkBadgeUI();

  if (res && res.success) {
    delugeView.reload();
    updateStatus(proxyCfg.useProxy ? 'Proxy Applied & Reloaded' : 'Direct Network Applied', '#10b981');
  } else {
    updateStatus('Proxy Error: ' + ((res && res.error) || 'Unknown'), '#ef4444');
  }
});

// Account Modal Management
loginHelperBtn.addEventListener('click', () => {
  closeNavDropdown();
  if (accountModal.style.display === 'block') {
    closeAllModals();
  } else {
    showModal(accountModal);
  }
});

closeAccBtn.addEventListener('click', closeAllModals);
if (cancelAccBtn) cancelAccBtn.addEventListener('click', closeAllModals);

fillLoginBtn.addEventListener('click', () => {
  const creds = { username: accUser.value.trim(), password: accPass.value.trim() };
  if (!config.dummyAccount) config.dummyAccount = {};
  config.dummyAccount.username = creds.username;
  config.dummyAccount.password = creds.password;
  saveLocalConfig();

  closeAllModals();

  const curUrl = (delugeView && delugeView.getURL()) || '';
  if (curUrl.toLowerCase().indexOf('/login') === -1) {
    updateStatus('Navigating to Login & Filling...', '#38bdf8');
    delugeView.src = 'https://www.delugerpg.com/login';
  } else {
    delugeView.send('fill-login', creds);
    updateStatus('Credentials Auto-Filled', '#10b981');
  }
});

// Global shortcut from main process
ipcRenderer.on('hotkey-f2', () => {
  toggleHunting();
});

// --- ZOOM EVENT LISTENERS ---

// 1. Toolbar Zoom Buttons
if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
if (zoomResetBtn) zoomResetBtn.addEventListener('click', zoomReset);

// 2. Zoom & Reload IPC Commands from Main Process
ipcRenderer.on('zoom-command', (event, cmd) => {
  if (cmd === 'in') zoomIn();
  else if (cmd === 'out') zoomOut();
  else if (cmd === 'reset') zoomReset();
});

ipcRenderer.on('reload-command', () => {
  if (refreshBtn) refreshBtn.click();
});

// 3. Host Window Keyboard Shortcuts (F5 / Ctrl + R / Ctrl + + / Ctrl + - / Ctrl + 0)
window.addEventListener('keydown', (e) => {
  if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
    e.preventDefault();
    if (refreshBtn) refreshBtn.click();
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd' || e.code === 'Equal') {
      e.preventDefault();
      zoomIn();
    } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract' || e.code === 'Minus') {
      e.preventDefault();
      zoomOut();
    } else if (e.key === '0' || e.code === 'Numpad0' || e.code === 'Digit0') {
      e.preventDefault();
      zoomReset();
    }
  }
});

// 4. Ctrl + Mouse Wheel Zoom
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else if (e.deltaY > 0) {
      zoomOut();
    }
  }
}, { passive: false });

// --- GYM BATTLE TEAM BUILDER CONTROLLER ---
let currentCollection = [];
let gymLeadersData = {};
let lastRecommendedTeam = [];
let liveBattleOpponent = null;
let lastLoggedBattleOpponentSig = '';
let teamRosterMode = (config.settings && config.settings.teamRosterMode) || 'ALL';
let isBuildSyncInProgress = false;
let pendingBuildLeader = null;
let lastSelectedBattleUrl = null;

const CANDIDATE_POOL_KEYS = ['ANY', 'GMAX', 'MEGA', 'GMAX_MEGA', 'LEGENDARY', 'ULTRABEAST', 'PARADOX', 'COMMON'];
const candidateListsCache = {
  gmaxTargets: [],
  gmaxLastDisplayedId: null,
  trainingByPool: {},
  trainingCursorsByPool: {},
  lastTrainingBuiltCtx: null
};

function refreshCandidateListsCache(options = {}) {
  const col = Array.isArray(currentCollection) ? currentCollection : [];
  const gmaxFiltered = getEffectiveFilteredPool(col, 'GMAX').filter(p => !teamEngine.isAlreadyGmax(p));
  candidateListsCache.gmaxTargets = (teamEngine && typeof teamEngine.getRankedGmaxChallengeCandidates === 'function')
    ? teamEngine.getRankedGmaxChallengeCandidates(gmaxFiltered, col)
    : [];

  const nextTrainingByPool = {};
  CANDIDATE_POOL_KEYS.forEach(poolKey => {
    const filtered = getEffectiveFilteredPool(col, poolKey);
    nextTrainingByPool[poolKey] = filtered.filter(p => (typeof p.level === 'number' ? p.level : 100) < 100);
  });
  candidateListsCache.trainingByPool = nextTrainingByPool;

  if (options && options.resetCursors) {
    candidateListsCache.gmaxLastDisplayedId = null;
    candidateListsCache.trainingCursorsByPool = {};
    candidateListsCache.lastTrainingBuiltCtx = null;
  }
}

function getEffectiveFilteredPool(collection, filterType) {
  if (!collection || !Array.isArray(collection)) return [];
  const type = (filterType || 'ANY').toUpperCase();
  return teamEngine.filterCandidatePool(collection, type);
}

function getActiveCandidates() {
  if (!currentCollection || currentCollection.length === 0) return [];
  let filtered = getEffectiveFilteredPool(currentCollection, teamPoolFilter);
  const isGmaxChallenge = (teamCategorySelect && teamCategorySelect.value === 'GMAX_CHALLENGE') ||
                          (teamTrainerSelect && teamTrainerSelect.value === 'GMAX_CHALLENGE');
  if (isGmaxChallenge) {
    filtered = filtered.filter(p => !teamEngine.isAlreadyGmax(p));
  }
  if (teamRosterMode === 'TRAINING') {
    const trainees = filtered.filter(p => (typeof p.level === 'number' ? p.level : 100) < 100);
    if (trainees.length > 0) return trainees;
    return (currentCollection || []).filter(p => (typeof p.level === 'number' ? p.level : 100) < 100);
  }
  // Maxed or Strongest Possible Team Mode:
  // Prioritize Level 100 powerhouses so trainees are never picked.
  const lvl100s = filtered.filter(p => (typeof p.level === 'number' ? p.level : 100) === 100);
  if (lvl100s.length >= 6) {
    return lvl100s;
  }
  if (lvl100s.length > 0) {
    const non100s = filtered.filter(p => (typeof p.level === 'number' ? p.level : 100) < 100)
      .slice()
      .sort((a, b) => (b.level || 0) - (a.level || 0));
    return lvl100s.concat(non100s.slice(0, 6 - lvl100s.length));
  }
  const sorted = filtered.slice().sort((a, b) => (b.level || 0) - (a.level || 0));
  return sorted.slice(0, Math.min(18, sorted.length));
}

function updateRosterModeUI() {
  let filtered = getEffectiveFilteredPool(currentCollection || [], teamPoolFilter);
  const isGmaxChallenge = (teamCategorySelect && teamCategorySelect.value === 'GMAX_CHALLENGE') ||
                          (teamTrainerSelect && teamTrainerSelect.value === 'GMAX_CHALLENGE');
  if (isGmaxChallenge) {
    filtered = filtered.filter(p => !teamEngine.isAlreadyGmax(p));
  }
  const inTrainingCount = filtered.filter(p => (typeof p.level === 'number' ? p.level : 100) < 100).length;
  const maxedCount = filtered.filter(p => (typeof p.level === 'number' ? p.level : 100) === 100).length;
  const totalCount = filtered.length;

  const poolModeAllTab = document.getElementById('poolModeAllTab');
  const poolModeTrainingTab = document.getElementById('poolModeTrainingTab');

  if (poolModeAllBtn) {
    poolModeAllBtn.textContent = maxedCount > 0 ? `Maxed (${maxedCount})` : `Strongest (${totalCount})`;
  }
  if (poolModeTrainingBtn) {
    poolModeTrainingBtn.textContent = `Training (${inTrainingCount})`;
  }
  if (poolModeAllTab) {
    poolModeAllTab.checked = (teamRosterMode === 'ALL');
  }
  if (poolModeTrainingTab) {
    poolModeTrainingTab.checked = (teamRosterMode === 'TRAINING');
  }

  const filterLabels = {
    ANY: 'Pokemon',
    GMAX: 'G-Max',
    MEGA: 'Megas',
    GMAX_MEGA: 'G-Max & Megas',
    LEGENDARY: 'Legendaries',
    ULTRABEAST: 'Ultra Beasts',
    PARADOX: 'Paradox',
    COMMON: 'Common'
  };
  const label = filterLabels[teamPoolFilter] || 'Pokemon';

  if (trainingStatsBadge) {
    if (teamRosterMode === 'TRAINING') {
      trainingStatsBadge.textContent = `${inTrainingCount} ${label} in training (<100)`;
      trainingStatsBadge.style.color = '#388bfd';
    } else {
      trainingStatsBadge.textContent = maxedCount > 0
        ? `${maxedCount} ${label} maxed (Lv 100)`
        : `${totalCount} ${label} in pool`;
      trainingStatsBadge.style.color = '#8eaad0';
    }
  }

  if (candidatePoolFilterSelect && candidatePoolFilterSelect.value !== teamPoolFilter) {
    candidatePoolFilterSelect.value = teamPoolFilter;
  }
}

let isApplyingTeamOnDeluge = false;
function syncTeamActionButtonsState() {
  const hasBuiltTeam = Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.length > 0;
  const captchaLocked = Boolean(isUnlockChallengeActive || isCaptchaAlarmActive);
  if (teamActionRow) {
    teamActionRow.style.display = 'flex';
  }
  if (teamBattleActionSlot) {
    teamBattleActionSlot.style.display = 'block';
  }
  if (applyTeamBtn) {
    applyTeamBtn.disabled = Boolean(captchaLocked || isApplyingTeamOnDeluge || !hasBuiltTeam);
    if (captchaLocked) {
      applyTeamBtn.title = 'Disabled: Captcha challenge active';
    } else if (!hasBuiltTeam) {
      applyTeamBtn.title = 'Disabled: Build a team with at least 1 Pokemon first';
    } else {
      applyTeamBtn.title = 'Equip this lineup in DelugeRPG';
    }
  }
  if (copyTeamBtn) {
    copyTeamBtn.disabled = Boolean(!hasBuiltTeam);
  }
  if (battleOpponentBtn && !captchaLocked && !battleOpponentBtn.innerHTML.includes('Entering...')) {
    battleOpponentBtn.disabled = false;
  }
}

function resetTeamPrompt() {
  lastRecommendedTeam = null;
  candidateListsCache.gmaxLastDisplayedId = null;
  candidateListsCache.lastTrainingBuiltCtx = null;
  if (teamResultContainer) teamResultContainer.style.display = 'none';
  if (teamResultList) teamResultList.innerHTML = '';
  syncTeamActionButtonsState();
  if (teamEmptyPrompt) {
    teamEmptyPrompt.style.display = 'flex';
    const iconHtml = teamBattleMode === 'PVP' ? '&#127919;' : '&#9876;';
    teamEmptyPrompt.innerHTML = `
      <div style="font-size: 18px; color: #388bfd; margin-bottom: 4px; opacity: 0.7;">${iconHtml}</div>
      <div style="font-weight: 600; color: #8eaad0; font-size: 11px;">No Active Lineup</div>
    `;
  }
}

function setTeamBattleMode(mode) {
  if (typeof clearPendingTrainingRotation === 'function') {
    clearPendingTrainingRotation('Battle mode changed');
  }
  teamBattleMode = mode;
  if (!config.settings) config.settings = {};
  config.settings.teamBattleMode = mode;
  saveLocalConfig();

  const teamModeNpcTab = document.getElementById('teamModeNpcTab');
  const teamModePvpTab = document.getElementById('teamModePvpTab');

  if (mode === 'PVP') {
    if (teamModePvpTab) teamModePvpTab.checked = true;
    if (teamNpcSection) teamNpcSection.style.display = 'none';
    if (teamPvpSection) teamPvpSection.style.display = 'flex';
    updatePvpBuildButtonLabel();
  } else {
    if (teamModeNpcTab) teamModeNpcTab.checked = true;
    if (teamNpcSection) teamNpcSection.style.display = 'flex';
    if (teamPvpSection) teamPvpSection.style.display = 'none';
    if (buildTeamBtn) {
      buildTeamBtn.innerHTML = '<span>&#9876;</span><span>Build Best Team</span>';
    }
  }
  resetTeamPrompt();
}

function updatePvpBuildButtonLabel() {
  if (!buildTeamBtn) return;
  if (teamBattleMode !== 'PVP') {
    buildTeamBtn.innerHTML = '<span>&#9876;</span><span>Build Best Team</span>';
    return;
  }
  if (pvpStrategy === 'GODSQUAD') {
    buildTeamBtn.innerHTML = '<span>&#9889;</span><span>Build God Squad</span>';
  } else {
    buildTeamBtn.innerHTML = '<span>&#9876;</span><span>Build PvP Counters</span>';
  }
}

function updateLiveChallengerUI(data) {
  if (!data || !Array.isArray(data.roster) || data.roster.length === 0) {
    if (pvpLiveStatusBadge) {
      pvpLiveStatusBadge.textContent = '';
    }
    if (pvpLiveSummary) {
      pvpLiveSummary.textContent = '';
      pvpLiveSummary.style.display = 'none';
    }
    if (pvpLiveRosterStrip) {
      pvpLiveRosterStrip.style.display = 'none';
      pvpLiveRosterStrip.innerHTML = '';
    }
    return;
  }

  const oppName = data.isProfileStalk ? (data.trainerName || 'Player') : (data.trainerTitle || data.trainerName || 'Challenger');
  if (pvpLiveStatusBadge) {
    pvpLiveStatusBadge.textContent = oppName;
    pvpLiveStatusBadge.style.color = '#238636';
  }
  if (pvpLiveSummary) {
    pvpLiveSummary.textContent = '';
    pvpLiveSummary.style.display = 'none';
  }
  if (pvpLiveRosterStrip) {
    pvpLiveRosterStrip.style.display = 'flex';
    pvpLiveRosterStrip.innerHTML = '';
    data.roster.forEach(poke => {
      const thumb = document.createElement('div');
      thumb.style.cssText = 'width:36px; height:36px; background:#070e1a; border:1px solid #1a283e; border-radius:4px; display:flex; align-items:center; justify-content:center; flex-shrink:0;';
      const typeStr = Array.isArray(poke.types) ? poke.types.join('/') : (poke.types || 'Normal');
      const movesStr = (Array.isArray(poke.moves) && poke.moves.length > 0) ? ` | Moves: ${poke.moves.join(', ')}` : '';
      thumb.title = `${poke.name} (Lv ${poke.level || 100}) - ${typeStr}${movesStr}`;
      if (poke.sprite) {
        const img = document.createElement('img');
        img.src = poke.sprite;
        img.style.cssText = 'max-width:32px; max-height:32px; image-rendering:pixelated;';
        thumb.appendChild(img);
      } else {
        thumb.textContent = poke.name.charAt(0);
        thumb.style.color = '#8eaad0';
        thumb.style.fontSize = '11px';
        thumb.style.fontWeight = '700';
      }
      pvpLiveRosterStrip.appendChild(thumb);
    });
  }
}

function renderScoutedPlayerCard(playerData) {
  if (!pvpScoutResultCard) return;
  if (!playerData || !Array.isArray(playerData.roster) || playerData.roster.length === 0) {
    pvpScoutResultCard.style.display = 'none';
    return;
  }
  pvpScoutResultCard.style.display = 'block';
  if (pvpScoutedName) {
    pvpScoutedName.textContent = playerData.name || '';
  }
  if (pvpScoutedRosterStrip) {
    pvpScoutedRosterStrip.innerHTML = '';
    playerData.roster.forEach(poke => {
      const thumb = document.createElement('div');
      thumb.style.cssText = 'width:36px; height:36px; background:#070e1a; border:1px solid #1a283e; border-radius:4px; display:flex; align-items:center; justify-content:center; flex-shrink:0;';
      const typeStr = Array.isArray(poke.types) ? poke.types.join('/') : (poke.types || 'Normal');
      const movesStr = (Array.isArray(poke.moves) && poke.moves.length > 0) ? ` | Moves: ${poke.moves.join(', ')}` : '';
      thumb.title = `${poke.name} (Lv ${poke.level || 100}) - ${typeStr}${movesStr}`;
      if (poke.sprite) {
        const img = document.createElement('img');
        img.src = poke.sprite;
        img.style.cssText = 'max-width:32px; max-height:32px; image-rendering:pixelated;';
        thumb.appendChild(img);
      } else {
        thumb.textContent = poke.name.charAt(0);
        thumb.style.color = '#8eaad0';
        thumb.style.fontSize = '11px';
        thumb.style.fontWeight = '700';
      }
      pvpScoutedRosterStrip.appendChild(thumb);
    });
  }
}

function triggerPlayerScout() {
  if (!pvpScoutInput) return;
  const username = pvpScoutInput.value.trim();
  if (!username) {
    if (pvpScoutStatusBadge) {
      pvpScoutStatusBadge.textContent = 'Enter username';
      pvpScoutStatusBadge.style.color = '#f87171';
    }
    return;
  }
  if (pvpScoutStatusBadge) {
    pvpScoutStatusBadge.textContent = 'Scouting...';
    pvpScoutStatusBadge.style.color = '#388bfd';
  }
  if (pvpScoutBtn) {
    pvpScoutBtn.disabled = true;
    pvpScoutBtn.innerHTML = '<span>&#8635;</span>';
  }
  if (delugeView && typeof delugeView.send === 'function') {
    delugeView.send('scout-player-roster', { username });
  }
}

function setTeamRosterMode(mode) {
  if (typeof clearPendingTrainingRotation === 'function') {
    clearPendingTrainingRotation('Roster mode changed');
  }
  teamRosterMode = mode;
  if (!config.settings) config.settings = {};
  config.settings.teamRosterMode = mode;
  saveLocalConfig();
  updateRosterModeUI();

  if (mode === 'TRAINING') {
    pendingGmaxEntryFlow = null;
    if (delugeView && typeof delugeView.send === 'function') {
      try { delugeView.send('abort-gmax-challenge-flow'); } catch (_) {}
    }
    if (lastSelectedBattleUrl && (lastSelectedBattleUrl.includes('/gmax') || lastSelectedBattleUrl.includes('/challenge'))) {
      lastSelectedBattleUrl = null;
    }
    if (teamCategorySelect && teamCategorySelect.value === 'GMAX_CHALLENGE') {
      teamCategorySelect.value = 'ALL';
      config.settings.teamCategoryFilter = 'ALL';
      saveLocalConfig();
      populateGymTrainerSelect('ALL');
    }
  }

  resetTeamPrompt();
}

if (teamModeNpcBtn) {
  teamModeNpcBtn.addEventListener('click', () => setTeamBattleMode('NPC'));
}
if (teamModePvpBtn) {
  teamModePvpBtn.addEventListener('click', () => setTeamBattleMode('PVP'));
}
if (pvpScoutBtn) {
  pvpScoutBtn.addEventListener('click', triggerPlayerScout);
}
if (pvpScoutInput) {
  pvpScoutInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerPlayerScout();
  });
}
if (pvpScoutClearBtn) {
  pvpScoutClearBtn.addEventListener('click', () => {
    scoutedPlayerOpponent = null;
    activePvpTargetType = 'LIVE';
    if (pvpScoutResultCard) pvpScoutResultCard.style.display = 'none';
    if (pvpScoutInput) pvpScoutInput.value = '';
    if (pvpScoutStatusBadge) {
      pvpScoutStatusBadge.textContent = '';
    }
    resetTeamPrompt();
  });
}
if (checkLiveBattleBtn) {
  checkLiveBattleBtn.addEventListener('click', () => {
    activePvpTargetType = 'LIVE';
    if (pvpLiveStatusBadge) {
      pvpLiveStatusBadge.textContent = 'Scanning page...';
      pvpLiveStatusBadge.style.color = '#388bfd';
    }
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('check-battle-opponents');
    }
    setTimeout(() => {
      if (pvpLiveStatusBadge && pvpLiveStatusBadge.textContent === 'Scanning page...') {
        if (liveBattleOpponent && liveBattleOpponent.roster && liveBattleOpponent.roster.length > 0 && liveBattleOpponent.isManualCheck) {
          updateLiveChallengerUI(liveBattleOpponent);
        } else {
          pvpLiveStatusBadge.textContent = 'No Active Challenger';
          pvpLiveStatusBadge.style.color = '#8eaad0';
        }
      }
    }, 2000);
  });
}
if (pvpStrategySelect) {
  pvpStrategySelect.addEventListener('change', () => {
    pvpStrategy = pvpStrategySelect.value || 'COUNTERS';
    if (!config.settings) config.settings = {};
    config.settings.pvpStrategy = pvpStrategy;
    saveLocalConfig();
    updatePvpBuildButtonLabel();
    resetTeamPrompt();
  });
}
if (pvpCandidateTierSelect) {
  pvpCandidateTierSelect.addEventListener('change', () => {
    pvpCandidateTier = pvpCandidateTierSelect.value || 'ANY';
    if (!config.settings) config.settings = {};
    config.settings.pvpCandidateTier = pvpCandidateTier;
    saveLocalConfig();
    resetTeamPrompt();
  });
}

if (poolModeAllBtn) {
  poolModeAllBtn.addEventListener('click', () => setTeamRosterMode('ALL'));
}
if (poolModeTrainingBtn) {
  poolModeTrainingBtn.addEventListener('click', () => setTeamRosterMode('TRAINING'));
}
if (candidatePoolFilterSelect) {
  candidatePoolFilterSelect.addEventListener('change', () => {
    if (typeof clearPendingTrainingRotation === 'function') {
      clearPendingTrainingRotation('Pool filter changed');
    }
    teamPoolFilter = candidatePoolFilterSelect.value || 'ANY';
    if (!config.settings) config.settings = {};
    config.settings.teamPoolFilter = teamPoolFilter;
    saveLocalConfig();
    updateRosterModeUI();
    resetTeamPrompt();

    if (teamPoolFilter === 'GMAX') {
      if (teamRosterMode === 'ALL' && teamCategorySelect && teamCategorySelect.value !== 'GMAX_CHALLENGE') {
        teamCategorySelect.value = 'GMAX_CHALLENGE';
        if (!config.settings) config.settings = {};
        config.settings.teamCategoryFilter = 'GMAX_CHALLENGE';
        saveLocalConfig();
        populateGymTrainerSelect('GMAX_CHALLENGE');
      }
    } else {
      if (teamCategorySelect && teamCategorySelect.value === 'GMAX_CHALLENGE') {
        teamCategorySelect.value = 'ALL';
        if (!config.settings) config.settings = {};
        config.settings.teamCategoryFilter = 'ALL';
        saveLocalConfig();
        populateGymTrainerSelect('ALL');
      }
    }
  });
}

function recordLearnedOpponentMove(trainerName, pokemonName, moveName, trainerNpcId = null) {
  if (!pokemonName || !moveName) return;

  let cleanMove = String(moveName).replace(/\s+(?:and\s+dealt|and\s+it\s+was|and\s+missed|but\s+it\s+missed|and\s+restored|and\s+fainted|and\s+critical|and\s+it\s+had).*$/i, '').trim();
  cleanMove = cleanMove.replace(/\s+on\s+[A-Za-z0-9\s'-]+$/i, '').trim();
  if (!cleanMove || cleanMove.toLowerCase().startsWith('max potion')) return;

  const resolved = (teamEngine && typeof teamEngine.resolveMove === 'function')
    ? teamEngine.resolveMove(cleanMove)
    : null;
  const resolvedName = (resolved && resolved.name) || cleanMove;
  const moveType = (resolved && resolved.type) || 'Normal';
  const movePower = (resolved && resolved.power) || 40;
  const moveCat = (resolved && resolved.category) || 'Physical';

  let didUpdate = false;
  if (gymLeadersData && typeof gymLeadersData === 'object') {
    Object.values(gymLeadersData).forEach(list => {
      if (!Array.isArray(list)) return;
      list.forEach(t => {
        const matchesTrainer = trainerNpcId
          ? (String(t.npcId) === String(trainerNpcId) || (t.battleUrl && t.battleUrl.endsWith('/' + trainerNpcId)))
          : (!trainerName || (t.name && t.name.toLowerCase() === trainerName.toLowerCase()));
        if (matchesTrainer && Array.isArray(t.roster)) {
          t.roster.forEach(p => {
            if (p.name && p.name.toLowerCase() === pokemonName.toLowerCase()) {
              p.moves = p.moves || [];
              if (!p.moves.some(m => (m && m.name ? m.name : m).toLowerCase() === resolvedName.toLowerCase())) {
                p.moves.push({ name: resolvedName, type: moveType, power: movePower, category: moveCat });
                didUpdate = true;
              }
              p.knownMoveTypes = p.knownMoveTypes || [];
              if (!p.knownMoveTypes.includes(moveType)) {
                p.knownMoveTypes.push(moveType);
                didUpdate = true;
              }
            }
          });
        }
      });
    });
  }

  if (liveBattleOpponent && Array.isArray(liveBattleOpponent.roster)) {
    liveBattleOpponent.roster.forEach(p => {
      if (p.name && p.name.toLowerCase() === pokemonName.toLowerCase()) {
        p.moves = p.moves || [];
        if (!p.moves.some(m => (m && m.name ? m.name : m).toLowerCase() === resolvedName.toLowerCase())) {
          p.moves.push({ name: resolvedName, type: moveType, power: movePower, category: moveCat });
        }
        p.knownMoveTypes = p.knownMoveTypes || [];
        if (!p.knownMoveTypes.includes(moveType)) {
          p.knownMoveTypes.push(moveType);
        }
      }
    });
  }

  if (didUpdate) {
    try {
      const gymPath = getWritableDataPath('gym_leaders.json');
      fs.writeFileSync(gymPath, JSON.stringify(gymLeadersData, null, 2), 'utf8');
      const devPath = path.join(__dirname, 'gym_leaders.json');
      if (devPath !== gymPath && fs.existsSync(devPath)) {
        fs.writeFileSync(devPath, JSON.stringify(gymLeadersData, null, 2), 'utf8');
      }
    } catch (_) {}
  }
}

function loadTeamBuilderData() {
  try {
    const rawColl = readDataFile('user_collection.json');
    if (rawColl) {
      currentCollection = JSON.parse(rawColl);
      let healedCorruptNames = false;
      if (Array.isArray(currentCollection)) {
        for (let i = 0; i < currentCollection.length; i++) {
          const item = currentCollection[i];
          if (item && typeof item.name === 'string' && /[\r\n]/.test(item.name)) {
            const clean = item.name.split(/[\r\n]+/)[0].replace(/\s+(?:close|ok|continue)$/i, '').trim();
            if (clean && clean !== item.name) {
              item.name = clean;
              if (evolutionEngine && typeof evolutionEngine.resolvePokemonTypes === 'function') {
                item.types = evolutionEngine.resolvePokemonTypes(clean, currentCollection);
              }
              healedCorruptNames = true;
            }
          }
        }
        if (healedCorruptNames) {
          try {
            fs.writeFileSync(getWritableDataPath('user_collection.json'), JSON.stringify(currentCollection, null, 2), 'utf8');
          } catch (_) {}
        }
      }
      if (scanStatusDot) {
        scanStatusDot.style.background = currentCollection.length > 0 ? '#10b981' : '#f59e0b';
      }
      if (scanStatusBadge) {
        scanStatusBadge.style.color = '#c9d8ec';
        scanStatusBadge.textContent = `${currentCollection.length} Pokemon Synced`;
      }
      if (candidatePoolFilterSelect && teamPoolFilter) {
        candidatePoolFilterSelect.value = teamPoolFilter;
      }
      if (pvpStrategySelect && pvpStrategy) {
        pvpStrategySelect.value = pvpStrategy;
      }
      if (pvpCandidateTierSelect && pvpCandidateTier) {
        pvpCandidateTierSelect.value = pvpCandidateTier;
      }
      if (typeof refreshCandidateListsCache === 'function') {
        refreshCandidateListsCache({ resetCursors: false });
      }
      updateRosterModeUI();
      syncUserCollectionToGuest();
      if (aiAssistantModal && aiAssistantModal.style.display === 'flex' && typeof renderEvolutionDecisionMakerUI === 'function') {
        renderEvolutionDecisionMakerUI();
      }
    }
  } catch (_) {}

  try {
    const rawGym = readDataFile('gym_leaders.json');
    if (rawGym) {
      gymLeadersData = JSON.parse(rawGym);
      const savedCategory = (config && config.settings && config.settings.teamCategoryFilter) || 'ALL';
      if (teamCategorySelect && savedCategory) {
        teamCategorySelect.value = savedCategory;
      }
      const activeCategory = (teamCategorySelect && teamCategorySelect.value) ? teamCategorySelect.value : 'ALL';
      updateCategoryFilterCounts();
      populateGymTrainerSelect(activeCategory);
      updateTrainerIntelStats();
      if (config && config.settings && config.settings.lastSelectedTrainer && teamTrainerSelect) {
        const targetVal = config.settings.lastSelectedTrainer;
        if (teamTrainerSelect.querySelector(`option[value="${targetVal}"]`)) {
          teamTrainerSelect.value = targetVal;
          const parts = targetVal.split('__');
          const group = gymLeadersData[parts[0]] || [];
          const leader = /^\d+$/.test(parts[1]) ? group[parseInt(parts[1], 10)] : group.find(l => l.name === parts[1]);
          if (leader) {
            if (leader.battleUrl) lastSelectedBattleUrl = leader.battleUrl;
            else if (leader.npcId) lastSelectedBattleUrl = '/battle/trainer/' + leader.npcId;
          }
          updateFavTrainerButton();
        }
      }
    }
  } catch (_) {}
}

function getFavoriteTrainersList() {
  if (!config.settings) config.settings = {};
  if (!Array.isArray(config.settings.favoriteTrainers) || config.settings.favoriteTrainers.length === 0) {
    try {
      const favFilePath = getWritableDataPath('favorite_trainers.json');
      if (fs.existsSync(favFilePath)) {
        const fileData = JSON.parse(fs.readFileSync(favFilePath, 'utf8'));
        if (Array.isArray(fileData) && fileData.length > 0) {
          config.settings.favoriteTrainers = fileData;
          return config.settings.favoriteTrainers;
        }
      }
    } catch (_) {}

    try {
      const stored = localStorage.getItem('deluge_fav_trainers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          config.settings.favoriteTrainers = parsed;
          return config.settings.favoriteTrainers;
        }
      }
    } catch (_) {}

    if (!Array.isArray(config.settings.favoriteTrainers)) {
      config.settings.favoriteTrainers = [];
    }
  }
  return config.settings.favoriteTrainers;
}

function isTrainerFavorite(trainerName) {
  if (!trainerName) return false;
  const list = getFavoriteTrainersList();
  return list.includes(trainerName);
}

function getSelectedTrainerInfo() {
  if (!teamTrainerSelect || !gymLeadersData) return null;
  const selVal = teamTrainerSelect.value;
  if (!selVal || selVal === 'LIVE__BATTLE') {
    if (liveBattleOpponent) {
      return {
        name: liveBattleOpponent.trainerName || liveBattleOpponent.trainerTitle,
        isLive: true,
        leader: liveBattleOpponent
      };
    }
    return null;
  }
  const parts = selVal.split('__');
  if (parts.length >= 2) {
    const groupKey = parts[0];
    const group = gymLeadersData[groupKey] || [];
    const leader = /^\d+$/.test(parts[1]) ? group[parseInt(parts[1], 10)] : group.find(l => l.name === parts[1]);
    if (leader) {
      return {
        name: leader.name,
        groupKey,
        leader
      };
    }
  }
  return null;
}

function updateFavTrainerButton() {
  if (!favTrainerBtn) return;
  const selVal = teamTrainerSelect ? teamTrainerSelect.value : '';
  if (!selVal || selVal === 'LIVE__BATTLE') {
    favTrainerBtn.disabled = true;
    favTrainerBtn.innerHTML = '&#9734;';
    favTrainerBtn.classList.remove('is-fav');
    favTrainerBtn.title = (selVal === 'LIVE__BATTLE') ? 'Live battle opponents cannot be saved as preset favorites' : 'Select an opponent to favorite';
    return;
  }
  const info = getSelectedTrainerInfo();
  if (!info || !info.name) {
    favTrainerBtn.disabled = true;
    favTrainerBtn.innerHTML = '&#9734;';
    favTrainerBtn.classList.remove('is-fav');
    favTrainerBtn.title = 'Select an opponent to favorite';
    return;
  }
  favTrainerBtn.disabled = false;
  const isFav = isTrainerFavorite(info.name);
  if (isFav) {
    favTrainerBtn.innerHTML = '&#9733;';
    favTrainerBtn.classList.add('is-fav');
    favTrainerBtn.title = `Favorited: ${info.name} (Click to remove from favorites)`;
  } else {
    favTrainerBtn.innerHTML = '&#9734;';
    favTrainerBtn.classList.remove('is-fav');
    favTrainerBtn.title = `Add ${info.name} to Favorites`;
  }
}

function updateCategoryFavoritesCount() {
  if (!teamCategorySelect) return;
  const favCount = getFavoriteTrainersList().length;
  const favOpt = teamCategorySelect.querySelector('option[value="FAVORITES"]');
  if (favOpt) {
    favOpt.textContent = `\u2605 Favorite Opponents (${favCount})`;
  }
}

function toggleTrainerFavorite(trainerName) {
  if (!trainerName) return false;
  const list = getFavoriteTrainersList();
  const idx = list.indexOf(trainerName);
  let isNowFav = false;
  if (idx >= 0) {
    list.splice(idx, 1);
    isNowFav = false;
  } else {
    list.push(trainerName);
    isNowFav = true;
  }
  config.settings.favoriteTrainers = list;
  saveLocalConfig();

  // Multi-tier permanent persistence:
  // Tier 1: Dedicated file in user data
  try {
    const favFilePath = getWritableDataPath('favorite_trainers.json');
    fs.writeFileSync(favFilePath, JSON.stringify(list, null, 2), 'utf8');
  } catch (_) {}

  // Tier 2: LocalStorage cache
  try {
    localStorage.setItem('deluge_fav_trainers', JSON.stringify(list));
  } catch (_) {}

  // Tier 3: Dev workspace copy
  try {
    const devFav = path.join(__dirname, 'favorite_trainers.json');
    if (devFav !== getWritableDataPath('favorite_trainers.json') && fs.existsSync(devFav)) {
      fs.writeFileSync(devFav, JSON.stringify(list, null, 2), 'utf8');
    }
  } catch (_) {}

  updateFavTrainerButton();
  updateCategoryFavoritesCount();
  if (teamCategorySelect && teamCategorySelect.value === 'FAVORITES') {
    populateGymTrainerSelect('FAVORITES');
  } else {
    if (teamTrainerSelect) {
      Array.from(teamTrainerSelect.options).forEach(opt => {
        if (!opt.value || opt.value === 'LIVE__BATTLE') return;
        const parts = opt.value.split('__');
        const grp = gymLeadersData[parts[0]] || [];
        const ldr = /^\d+$/.test(parts[1]) ? grp[parseInt(parts[1], 10)] : grp.find(l => l.name === parts[1]);
        if (ldr && ldr.name === trainerName) {
          const typeStr = (ldr.types || []).join('/');
          const lvlStr = ldr.avgLevel ? `Lv ${ldr.avgLevel}` : '';
          const rosterBadge = (Array.isArray(ldr.roster) && ldr.roster.length > 0) ? ` [${ldr.roster.length}/6]` : '';
          const prefix = isNowFav ? '\u2605 ' : '';
          opt.textContent = `${prefix}${ldr.name} (${typeStr}${lvlStr ? ' - ' + lvlStr : ''})${rosterBadge}`;
          opt.style.color = isNowFav ? '#f59e0b' : '#e0ecfa';
          opt.style.fontWeight = isNowFav ? '700' : '500';
        }
      });
    }
  }
  return isNowFav;
}

if (favTrainerBtn) {
  favTrainerBtn.addEventListener('click', () => {
    const info = getSelectedTrainerInfo();
    if (!info || !info.name) return;
    const isNowFav = toggleTrainerFavorite(info.name);
    updateStatus(isNowFav ? `\u2605 ${info.name} saved to Favorites` : `Removed ${info.name} from Favorites`, isNowFav ? '#d29922' : '#8eaad0');
  });
}

function populateGymTrainerSelect(categoryFilter = null) {
  if (!teamTrainerSelect || !gymLeadersData) return;

  if (categoryFilter === null) {
    categoryFilter = (teamCategorySelect && teamCategorySelect.value) ? teamCategorySelect.value : 'ALL';
  }

  if (categoryFilter === 'GMAX_CHALLENGE') {
    teamTrainerSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = 'GMAX_CHALLENGE';
    opt.selected = true;
    opt.textContent = '[G-Max Challenge] Randomized Arena Opponents';
    teamTrainerSelect.appendChild(opt);
    teamTrainerSelect.disabled = true;
    teamTrainerSelect.style.opacity = '0.6';
    teamTrainerSelect.style.cursor = 'not-allowed';

    if (favTrainerBtn) {
      favTrainerBtn.disabled = true;
      favTrainerBtn.style.opacity = '0.4';
      favTrainerBtn.style.cursor = 'not-allowed';
      favTrainerBtn.title = 'Trainer selection disabled for G-Max Challenge';
      favTrainerBtn.classList.remove('is-fav');
    }

    if (filteredTrainerCountBadge) {
      filteredTrainerCountBadge.textContent = 'Challenge Mode';
      filteredTrainerCountBadge.style.color = '#388bfd';
    }

    lastSelectedBattleUrl = '/challenge/gmax';
    return;
  }

  teamTrainerSelect.disabled = false;
  teamTrainerSelect.style.opacity = '1';
  teamTrainerSelect.style.cursor = 'default';
  if (favTrainerBtn) {
    favTrainerBtn.disabled = false;
    favTrainerBtn.style.opacity = '1';
    favTrainerBtn.style.cursor = 'pointer';
  }

  const prevSelectedValue = teamTrainerSelect.value;
  teamTrainerSelect.innerHTML = '';
  let matchCount = 0;

  const liveRosterLen = (liveBattleOpponent && Array.isArray(liveBattleOpponent.roster)) ? liveBattleOpponent.roster.length : 0;
  if (liveBattleOpponent && (liveRosterLen > 0 || prevSelectedValue === 'LIVE__BATTLE')) {
    const liveGroup = document.createElement('optgroup');
    liveGroup.id = 'optgroup-live-battle';
    liveGroup.label = 'CURRENT BATTLE (LIVE DETECTED)';
    liveGroup.style.cssText = 'color: #58a6ff; background: #0c1c38; font-weight: 800; font-style: normal; letter-spacing: 0.5px;';
    const opt = document.createElement('option');
    opt.value = 'LIVE__BATTLE';
    opt.textContent = `[LIVE] ${liveBattleOpponent.trainerTitle || liveBattleOpponent.trainerName} (${liveRosterLen} Pokemon)`;
    opt.style.cssText = 'color: #79c0ff; background: #070e1a; font-weight: 700;';
    liveGroup.appendChild(opt);
    teamTrainerSelect.appendChild(liveGroup);
  }

  const favList = getFavoriteTrainersList();

  if (categoryFilter === 'FAVORITES') {
    const favGroup = document.createElement('optgroup');
    favGroup.label = 'FAVORITE OPPONENTS';
    favGroup.style.cssText = 'color: #f59e0b; background: #261c06; font-weight: 800; font-style: normal; letter-spacing: 0.5px;';
    const seenKeys = new Set();
    const allTierKeys = [
      'VIP_TRAINERS', 'ULTIMATE_TRAINERS', 'STRONG_TRAINERS', 'STANDARD_TRAINERS',
      'KANTO', 'JOHTO', 'HOENN', 'SINNOH', 'UNOVA', 'KALOS', 'ALOLA', 'GALAR', 'PALDEA'
    ];

    allTierKeys.forEach(groupKey => {
      const trainers = gymLeadersData[groupKey];
      if (!Array.isArray(trainers)) return;
      trainers.forEach((leader, idx) => {
        if (favList.includes(leader.name)) {
          const typeStr = (leader.types || []).join('/');
          const distinctKey = `${leader.name}__${leader.avgLevel || 0}__${typeStr}`;
          if (!seenKeys.has(distinctKey)) {
            seenKeys.add(distinctKey);
            const opt = document.createElement('option');
            opt.value = `${groupKey}__${idx}`;
            const lvlStr = leader.avgLevel ? `Lv ${leader.avgLevel}` : '';
            const rosterBadge = (Array.isArray(leader.roster) && leader.roster.length > 0) ? ` [${leader.roster.length}/6]` : '';
            let tierTag = '';
            if (leader.tier) {
              tierTag = ` [${leader.tier}]`;
            } else if (groupKey.endsWith('_TRAINERS')) {
              tierTag = ` [${groupKey.replace('_TRAINERS', '')}]`;
            } else if (leader.badge) {
              tierTag = ` [${leader.region || groupKey} GYM]`;
            } else if (leader.region) {
              tierTag = ` [${leader.region}]`;
            }
            opt.textContent = `\u2605 ${leader.name} (${typeStr}${lvlStr ? ' - ' + lvlStr : ''})${rosterBadge}${tierTag}`;
            opt.style.cssText = 'color: #f59e0b; background: #070e1a; font-weight: 600;';
            favGroup.appendChild(opt);
            matchCount++;
          }
        }
      });
    });

    favGroup.label = `FAVORITE OPPONENTS (${matchCount})`;

    if (matchCount === 0) {
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.disabled = true;
      emptyOpt.selected = true;
      emptyOpt.textContent = 'No favorite opponents saved yet (Click \u2606 to favorite)';
      emptyOpt.style.cssText = 'color: #64748b; background: #070e1a; font-style: italic;';
      favGroup.appendChild(emptyOpt);
    }

    teamTrainerSelect.appendChild(favGroup);
  } else {
    const groupOrder = [
      { key: 'VIP_TRAINERS', label: 'VIP TRAINERS (Gym Leaders & Champions)', color: '#f0883e', bg: '#251408' },
      { key: 'ULTIMATE_TRAINERS', label: 'ULTIMATE TRAINERS (Lvl 100 Masters)', color: '#f85149', bg: '#2d0f11' },
      { key: 'STRONG_TRAINERS', label: 'STRONG TRAINERS (Bosses & Veterans)', color: '#a371f7', bg: '#1d1233' },
      { key: 'STANDARD_TRAINERS', label: 'STANDARD TRAINERS', color: '#8eaad0', bg: '#0e1b30' },
      { key: 'KANTO', label: 'KANTO LEAGUE', color: '#3fb950', bg: '#0a2012' },
      { key: 'JOHTO', label: 'JOHTO LEAGUE', color: '#3fb950', bg: '#0a2012' },
      { key: 'HOENN', label: 'HOENN LEAGUE', color: '#3fb950', bg: '#0a2012' },
      { key: 'SINNOH', label: 'SINNOH LEAGUE', color: '#3fb950', bg: '#0a2012' },
      { key: 'UNOVA', label: 'UNOVA LEAGUE', color: '#3fb950', bg: '#0a2012' },
      { key: 'KALOS', label: 'KALOS LEAGUE', color: '#3fb950', bg: '#0a2012' },
      { key: 'ALOLA', label: 'ALOLA LEAGUE', color: '#3fb950', bg: '#0a2012' },
      { key: 'GALAR', label: 'GALAR LEAGUE', color: '#3fb950', bg: '#0a2012' },
      { key: 'PALDEA', label: 'PALDEA LEAGUE', color: '#3fb950', bg: '#0a2012' }
    ];

    for (const item of groupOrder) {
      const groupKey = item.key;
      const trainers = gymLeadersData[groupKey];
      if (!trainers || !Array.isArray(trainers)) continue;

      if (categoryFilter === 'GYM_LEAGUES') {
        if (groupKey.endsWith('_TRAINERS')) continue;
      } else if (categoryFilter !== 'ALL') {
        if (groupKey !== categoryFilter) continue;
      }

      if (trainers.length === 0) continue;

      const group = document.createElement('optgroup');
      group.label = `${item.label} (${trainers.length})`;
      group.style.cssText = `color: ${item.color}; background: ${item.bg}; font-weight: 800; font-style: normal; letter-spacing: 0.5px;`;

      trainers.forEach((leader, idx) => {
        const opt = document.createElement('option');
        opt.value = `${groupKey}__${idx}`;
        const typeStr = (leader.types || []).join('/');
        const lvlStr = leader.avgLevel ? `Lv ${leader.avgLevel}` : '';
        const rosterBadge = (Array.isArray(leader.roster) && leader.roster.length > 0) ? ` [${leader.roster.length}/6]` : '';
        const isFav = favList.includes(leader.name);
        const favPrefix = isFav ? '\u2605 ' : '';
        opt.textContent = `${favPrefix}${leader.name} (${typeStr}${lvlStr ? ' - ' + lvlStr : ''})${rosterBadge}`;
        opt.style.cssText = isFav
          ? 'color: #f59e0b; background: #070e1a; font-weight: 700;'
          : 'color: #e0ecfa; background: #070e1a; font-weight: 500;';
        group.appendChild(opt);
        matchCount++;
      });

      teamTrainerSelect.appendChild(group);
    }
  }

  if (filteredTrainerCountBadge) {
    filteredTrainerCountBadge.textContent = `${matchCount} available`;
    filteredTrainerCountBadge.style.color = '#64748b';
  }

  const hasTrainerOpt = (val) => {
    if (!val) return false;
    if (typeof teamTrainerSelect.querySelector === 'function') {
      return Boolean(teamTrainerSelect.querySelector(`option[value="${val}"]`));
    }
    if (teamTrainerSelect.options && typeof teamTrainerSelect.options.length === 'number') {
      for (let i = 0; i < teamTrainerSelect.options.length; i++) {
        if (teamTrainerSelect.options[i] && teamTrainerSelect.options[i].value === val) return true;
      }
    }
    return false;
  };
  const savedTrainerVal = (typeof config !== 'undefined' && config && config.settings && config.settings.lastSelectedTrainer)
    ? config.settings.lastSelectedTrainer
    : '';

  if (prevSelectedValue && hasTrainerOpt(prevSelectedValue)) {
    teamTrainerSelect.value = prevSelectedValue;
  } else if (savedTrainerVal && hasTrainerOpt(savedTrainerVal)) {
    teamTrainerSelect.value = savedTrainerVal;
  } else if (liveBattleOpponent && hasTrainerOpt('LIVE__BATTLE')) {
    teamTrainerSelect.value = 'LIVE__BATTLE';
  } else if (teamTrainerSelect.options.length > 0) {
    teamTrainerSelect.selectedIndex = 0;
  }

  updateFavTrainerButton();
  updateCategoryFavoritesCount();
}

if (teamCategorySelect) {
  teamCategorySelect.addEventListener('change', () => {
    if (!config.settings) config.settings = {};
    config.settings.teamCategoryFilter = teamCategorySelect.value;
    saveLocalConfig();

    if (teamCategorySelect.value === 'GMAX_CHALLENGE') {
      if (candidatePoolFilterSelect && candidatePoolFilterSelect.value !== 'GMAX') {
        candidatePoolFilterSelect.value = 'GMAX';
        teamPoolFilter = 'GMAX';
        if (!config.settings) config.settings = {};
        config.settings.teamPoolFilter = 'GMAX';
        saveLocalConfig();
        updateRosterModeUI();
      }
      if (teamRosterMode !== 'ALL') {
        setTeamRosterMode('ALL');
      }
    } else {
      pendingGmaxEntryFlow = null;
      if (delugeView && typeof delugeView.send === 'function') {
        try { delugeView.send('abort-gmax-challenge-flow'); } catch (_) {}
      }
      if (lastSelectedBattleUrl && (lastSelectedBattleUrl.includes('/gmax') || lastSelectedBattleUrl.includes('/challenge'))) {
        lastSelectedBattleUrl = null;
      }
    }
    populateGymTrainerSelect(teamCategorySelect.value);
    resetTeamPrompt();
  });
}

function updateTeamBuilderBadge(isOpen) {
  // Gym Team Builder is a docked panel rather than an on/off toggle switch
}

function openTeamBuilderPanel() {
  if (!teamBuilderModal) return;
  if (adsInspectorModal) adsInspectorModal.style.display = 'none';
  if (catchLogModal) catchLogModal.style.display = 'none';
  if (aiAssistantModal) aiAssistantModal.style.display = 'none';
  if (safetySettingsModal) safetySettingsModal.style.display = 'none';
  if (safetySettingsTopBtn) safetySettingsTopBtn.classList.remove('btn-accent');
  teamBuilderModal.style.display = 'flex';
  if (delugeView) {
    delugeView.classList.remove('full-width');
    delugeView.style.width = '75%';
    delugeView.style.flex = '3';
    delugeView.style.pointerEvents = 'auto';
  }
  if (teamBuilderBtn) {
    teamBuilderBtn.classList.add('btn-accent');
  }
  updateTeamBuilderBadge(true);
  loadTeamBuilderData();
  if (typeof setTeamBattleMode === 'function') {
    setTeamBattleMode(teamBattleMode);
  }
  if (!lastRecommendedTeam || lastRecommendedTeam.length === 0) {
    if (teamEmptyPrompt) teamEmptyPrompt.style.display = 'flex';
    if (teamResultContainer) teamResultContainer.style.display = 'none';
  } else {
    if (teamEmptyPrompt) teamEmptyPrompt.style.display = 'none';
    if (teamResultContainer) teamResultContainer.style.display = 'block';
  }
  syncTeamActionButtonsState();
  if (typeof updateTeamBuilderBattleAction === 'function') {
    updateTeamBuilderBattleAction(activeAiBattleData);
  }
}

function closeTeamBuilderPanel() {
  stopAllBattleAutomation('Team Builder panel closed');
  if (!teamBuilderModal) return;
  teamBuilderModal.style.display = 'none';
  if ((!adsInspectorModal || adsInspectorModal.style.display !== 'flex') &&
      (!catchLogModal || catchLogModal.style.display !== 'flex') &&
      (!aiAssistantModal || aiAssistantModal.style.display !== 'flex') &&
      (!safetySettingsModal || safetySettingsModal.style.display !== 'flex')) {
    if (delugeView) {
      delugeView.classList.add('full-width');
      delugeView.style.width = '100%';
      delugeView.style.flex = '1';
      delugeView.style.pointerEvents = 'auto';
    }
  }
  if (teamBuilderBtn) {
    teamBuilderBtn.classList.remove('btn-accent');
  }
  updateTeamBuilderBadge(false);
}

function toggleTeamBuilderPanel() {
  if (!teamBuilderModal) return;
  const isVisible = teamBuilderModal.style.display === 'flex';
  if (isVisible) {
    closeTeamBuilderPanel();
  } else {
    openTeamBuilderPanel();
  }
}

function openTeamBuilderModal() {
  openTeamBuilderPanel();
}

if (teamBuilderBtn) teamBuilderBtn.addEventListener('click', toggleTeamBuilderPanel);
if (teamBuilderMenuBtn) {
  teamBuilderMenuBtn.addEventListener('click', () => {
    closeNavDropdown();
    toggleTeamBuilderPanel();
  });
}
if (closeTeamBuilderBtn) closeTeamBuilderBtn.addEventListener('click', closeTeamBuilderPanel);

// --- LIVE ADS LISTENER & TELEMETRY CONTROLLER ---
let liveAdsRegistry = [];
let adsFilterType = 'ALL';
let adsTelemetryStats = { total: 0, types: {} };

let lastOptAd360LogTs = 0;
function handleAdDetected(ad) {
  if (!ad) return;
  const isEphemeralOptAd360 = Boolean(ad.type === 'optAd360 Network / Badge' && ad.slotId && String(ad.slotId).startsWith('oa-360-'));
  if (isEphemeralOptAd360) {
    const nowTs = Date.now();
    if ((nowTs - lastOptAd360LogTs) < 15000) return;
    lastOptAd360LogTs = nowTs;
  }
  backendLog('AdsListener', `[${ad.type}] ${ad.tag}${ad.elementId ? '#' + ad.elementId : ''} (Slot: ${ad.slotId || 'none'}, ${ad.dimensions ? ad.dimensions.width + 'x' + ad.dimensions.height : '0x0'}) -> ${ad.status}`);
}

function handleAdsSummaryUpdate(data) {
  if (!data) return;
  const list = Array.isArray(data.ads) ? data.ads : [];
  liveAdsRegistry = list;
  adsTelemetryStats = data.summary || { total: list.length, types: {} };

  if (navAdsCountBadge) {
    navAdsCountBadge.textContent = `${list.length} Hidden`;
  }
  if (teamHeaderAdsBadge) {
    teamHeaderAdsBadge.textContent = `${list.length}`;
  }

  if (adsStatTotal) adsStatTotal.textContent = `${list.length}`;
  if (adsStatAdsense) adsStatAdsense.textContent = `${(adsTelemetryStats.types && adsTelemetryStats.types['Google AdSense']) || 0}`;
  if (adsStatGpt) adsStatGpt.textContent = `${(adsTelemetryStats.types && adsTelemetryStats.types['Google Publisher Tag (GPT)']) || 0}`;
  if (adsStatVignette) adsStatVignette.textContent = `${(adsTelemetryStats.types && adsTelemetryStats.types['Google Vignette Interstitial']) || 0}`;

  if (adsInspectorModal && adsInspectorModal.style.display === 'flex') {
    renderAdsInspectorUI();
  }
}

function getBadgeClassForAdType(type) {
  switch (type) {
    case 'Google AdSense': return 'badge-adsense';
    case 'Google Publisher Tag (GPT)': return 'badge-gpt';
    case 'Google Vignette Interstitial': return 'badge-vignette';
    case 'Sticky / Anchor Banner': return 'badge-anchor';
    case 'Video / Rewarded Ad': return 'badge-video';
    case 'Third-Party Ad Network': return 'badge-thirdparty';
    case 'Deluge Ad Container': return 'badge-container';
    default: return 'badge-label';
  }
}

function renderAdsInspectorUI() {
  if (!adsFeedList) return;

  const filtered = (adsFilterType === 'ALL')
    ? liveAdsRegistry
    : liveAdsRegistry.filter(a => a.type === adsFilterType);

  if (filtered.length === 0) {
    if (adsEmptyPrompt) adsEmptyPrompt.style.display = 'block';
    adsFeedList.innerHTML = '';
    if (adsEmptyPrompt) adsFeedList.appendChild(adsEmptyPrompt);
    return;
  }

  if (adsEmptyPrompt) adsEmptyPrompt.style.display = 'none';

  let html = '';
  const reversed = filtered.slice().reverse();
  for (let i = 0; i < reversed.length; i++) {
    const item = reversed[i];
    const badgeCls = getBadgeClassForAdType(item.type);
    const dimStr = item.dimensions ? `${item.dimensions.width}&times;${item.dimensions.height}` : '0&times;0';
    const idStr = item.elementId ? `#${item.elementId}` : '';
    const slotStr = item.slotId ? `Slot: ${item.slotId}` : '';
    const srcStr = item.src ? `<div style="font-size: 9.5px; color: rgba(244, 238, 232, 0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">Src: ${item.src}</div>` : '';

    html += `
      <div class="ad-telemetry-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          <span class="ad-type-badge ${badgeCls}">${item.type}</span>
          <span style="font-size: 9.5px; color: #8eaad0; font-family: monospace;">${item.detectedAt || ''}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 4px;">
          <span style="font-size: 11px; font-weight: 700; color: #e0ecfa; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${item.tag}${idStr}
          </span>
          <span style="font-size: 10px; color: #388bfd; font-weight: 600; flex-shrink: 0;">${dimStr}</span>
        </div>
        ${slotStr ? `<div style="font-size: 10px; color: #8eaad0; margin-top: 1px;">${slotStr}</div>` : ''}
        ${srcStr}
      </div>
    `;
  }
  adsFeedList.innerHTML = html;
}

function openAdsInspectorPanel() {
  if (!adsInspectorModal) return;
  if (teamBuilderModal) {
    teamBuilderModal.style.display = 'none';
    if (teamBuilderBtn) teamBuilderBtn.classList.remove('btn-accent');
    updateTeamBuilderBadge(false);
  }
  if (catchLogModal) {
    catchLogModal.style.display = 'none';
  }
  if (aiAssistantModal) {
    aiAssistantModal.style.display = 'none';
    if (aiAssistantTopBtn) aiAssistantTopBtn.classList.remove('btn-accent');
  }
  if (safetySettingsModal) {
    safetySettingsModal.style.display = 'none';
    if (safetySettingsTopBtn) safetySettingsTopBtn.classList.remove('btn-accent');
  }
  adsInspectorModal.style.display = 'flex';
  if (delugeView) {
    delugeView.classList.remove('full-width');
    delugeView.style.width = '75%';
    delugeView.style.flex = '3';
    delugeView.style.pointerEvents = 'auto';
  }
  renderAdsInspectorUI();
  try {
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('scan-page-ads');
    }
  } catch (_) {}
}

function closeAdsInspectorPanel() {
  if (!adsInspectorModal) return;
  adsInspectorModal.style.display = 'none';
  if ((!teamBuilderModal || teamBuilderModal.style.display !== 'flex') &&
      (!catchLogModal || catchLogModal.style.display !== 'flex') &&
      (!aiAssistantModal || aiAssistantModal.style.display !== 'flex') &&
      (!safetySettingsModal || safetySettingsModal.style.display !== 'flex')) {
    if (delugeView) {
      delugeView.classList.add('full-width');
      delugeView.style.width = '100%';
      delugeView.style.flex = '1';
      delugeView.style.pointerEvents = 'auto';
    }
  }
}

function toggleAdsInspectorPanel() {
  if (!adsInspectorModal) return;
  const isVisible = adsInspectorModal.style.display === 'flex';
  if (isVisible) {
    closeAdsInspectorPanel();
  } else {
    openAdsInspectorPanel();
  }
}

if (adsInspectorMenuBtn) {
  adsInspectorMenuBtn.addEventListener('click', () => {
    closeNavDropdown();
    toggleAdsInspectorPanel();
  });
}
if (closeAdsInspectorBtn) {
  closeAdsInspectorBtn.addEventListener('click', closeAdsInspectorPanel);
}
if (switchTeamBuilderFromAdsBtn) {
  switchTeamBuilderFromAdsBtn.addEventListener('click', () => {
    closeAdsInspectorPanel();
    openTeamBuilderPanel();
  });
}
if (switchAdsInspectorFromTeamBtn) {
  switchAdsInspectorFromTeamBtn.addEventListener('click', () => {
    closeTeamBuilderPanel();
    openAdsInspectorPanel();
  });
}
if (rescanAdsBtn) {
  rescanAdsBtn.addEventListener('click', () => {
    updateStatus('Scanning DelugeRPG page ads...', '#388bfd');
    try {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('scan-page-ads');
      }
    } catch (_) {}
    setTimeout(() => {
      updateStatus('Ads scan complete', '#238636');
    }, 500);
  });
}
if (clearAdsLogBtn) {
  clearAdsLogBtn.addEventListener('click', () => {
    liveAdsRegistry = [];
    adsTelemetryStats = { total: 0, types: {} };
    if (navAdsCountBadge) navAdsCountBadge.textContent = '0 Hidden';
    if (teamHeaderAdsBadge) teamHeaderAdsBadge.textContent = '0';
    if (adsStatTotal) adsStatTotal.textContent = '0';
    if (adsStatAdsense) adsStatAdsense.textContent = '0';
    if (adsStatGpt) adsStatGpt.textContent = '0';
    if (adsStatVignette) adsStatVignette.textContent = '0';
    try {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('clear-ads-registry');
      }
    } catch (_) {}
    renderAdsInspectorUI();
  });
}
if (adsFilterTabs) {
  adsFilterTabs.addEventListener('click', (e) => {
    const tabEl = e.target.closest('[data-ad-filter]');
    if (!tabEl) return;
    const radioId = tabEl.getAttribute('for');
    if (radioId) {
      const radioEl = document.getElementById(radioId);
      if (radioEl) radioEl.checked = true;
    }
    adsFilterType = tabEl.getAttribute('data-ad-filter') || 'ALL';
    renderAdsInspectorUI();
  });
}

if (scanPokesBtn) {
  scanPokesBtn.addEventListener('click', () => {
    candidateListsCache.gmaxLastDisplayedId = null;
    candidateListsCache.trainingCursorsByPool = {};
    candidateListsCache.lastTrainingBuiltCtx = null;
    if (scanStatusDot) scanStatusDot.style.background = '#388bfd';
    if (scanStatusBadge) {
      scanStatusBadge.style.color = '#388bfd';
      scanStatusBadge.textContent = 'Scanning...';
    }
    if (isRunning) {
      wasHuntingBeforeBoxScan = true;
      isRunning = false;
      updateToggleButton();
      updateStatus('Paused (Syncing Box...)', '#388bfd');
      backendLog('BoxScan', 'Temporarily paused automated hunting during manual box scan for stealth.');
    }
    delugeView.send('start-scan-pokemon');
  });
}

function updateCategoryFilterCounts() {
  if (!teamCategorySelect || !gymLeadersData) return;
  const regions = ['KANTO', 'JOHTO', 'HOENN', 'SINNOH', 'UNOVA', 'KALOS', 'ALOLA', 'GALAR', 'PALDEA'];
  const tiers = ['VIP_TRAINERS', 'ULTIMATE_TRAINERS', 'STRONG_TRAINERS', 'STANDARD_TRAINERS'];
  let gymTotal = 0;
  regions.forEach(reg => {
    const arr = Array.isArray(gymLeadersData[reg]) ? gymLeadersData[reg] : [];
    gymTotal += arr.length;
    const opt = teamCategorySelect.querySelector(`option[value="${reg}"]`);
    if (opt) {
      const regLabel = reg.charAt(0) + reg.slice(1).toLowerCase();
      opt.textContent = `${regLabel} League (${arr.length} Leaders)`;
    }
  });
  let totalOpps = gymTotal;
  const tierLabels = {
    VIP_TRAINERS: 'VIP Trainers',
    ULTIMATE_TRAINERS: 'Ultimate Trainers',
    STRONG_TRAINERS: 'Strong Trainers',
    STANDARD_TRAINERS: 'Standard Trainers'
  };
  tiers.forEach(tier => {
    const arr = Array.isArray(gymLeadersData[tier]) ? gymLeadersData[tier] : [];
    totalOpps += arr.length;
    const opt = teamCategorySelect.querySelector(`option[value="${tier}"]`);
    if (opt) {
      opt.textContent = `${tierLabels[tier]} (${arr.length})`;
    }
  });
  const allOpt = teamCategorySelect.querySelector('option[value="ALL"]');
  if (allOpt) allOpt.textContent = `All Opponents (${totalOpps})`;
  const gymOpt = teamCategorySelect.querySelector('option[value="GYM_LEAGUES"]');
  if (gymOpt) gymOpt.textContent = `All Gym Leagues (${gymTotal} Leaders)`;
  updateCategoryFavoritesCount();
}

function updateTrainerIntelStats() {
  if (!gymLeadersData) return;
  let gymTotal = 0, gymKnown = 0;
  const regions = ['KANTO', 'JOHTO', 'HOENN', 'SINNOH', 'UNOVA', 'KALOS', 'ALOLA', 'GALAR', 'PALDEA'];
  for (const reg of regions) {
    if (Array.isArray(gymLeadersData[reg])) {
      for (const l of gymLeadersData[reg]) {
        gymTotal++;
        if (l.roster && l.roster.length > 0) gymKnown++;
      }
    }
  }
  let oppTotal = gymTotal, oppKnown = gymKnown;
  const tiers = ['VIP_TRAINERS', 'ULTIMATE_TRAINERS', 'STRONG_TRAINERS', 'STANDARD_TRAINERS'];
  for (const tier of tiers) {
    if (Array.isArray(gymLeadersData[tier])) {
      for (const t of gymLeadersData[tier]) {
        oppTotal++;
        if (t.roster && t.roster.length > 0) oppKnown++;
      }
    }
  }
  if (syncTrainersStatusBadge && !isTrainerRosterSyncRunning) {
    syncTrainersStatusBadge.style.color = '#c9d8ec';
    syncTrainersStatusBadge.textContent = `${oppKnown} Trainers Synced`;
  }
  if (modalRosterCountBadge) {
    modalRosterCountBadge.textContent = `${gymKnown}/${gymTotal} Gyms (${Math.round((gymKnown / (gymTotal || 1)) * 100)}%) - ${oppKnown}/${oppTotal} Total`;
  }
  const gymsTile = document.getElementById('modalIntelGymsStat');
  if (gymsTile) gymsTile.textContent = `${gymKnown} / ${gymTotal}`;
  const totalTile = document.getElementById('modalIntelTotalStat');
  if (totalTile) totalTile.textContent = `${oppKnown} / ${oppTotal}`;
}

function stopAllActivitiesForSafety(reasonText) {
  if (isRunning) {
    toggleHunting();
  } else {
    isAutoCatchCountdownActive = false;
    userManuallyPaused = true;
    wasHuntingBeforeAutoCatch = false;
    stopAllBattleAutomation(reasonText || 'Paused for safety');
    cancelPendingAutoStart(reasonText || 'Paused for Trainer Roster Sync');
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
    try {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('abort-autocatch');
      }
    } catch (_) {}
    updateToggleButton();
  }
  const autoChk = document.getElementById('teamBattleAutoCheck');
  if (autoChk && autoChk.checked) {
    autoChk.checked = false;
  }
  if (reasonText) {
    updateStatus(reasonText, '#388bfd');
  }
}

function getTrainersForActiveCategoryFilter() {
  if (!gymLeadersData) return [];
  const categoryFilter = (teamCategorySelect && teamCategorySelect.value) ? teamCategorySelect.value : 'ALL';
  const allGroups = [
    'VIP_TRAINERS', 'ULTIMATE_TRAINERS', 'STRONG_TRAINERS', 'STANDARD_TRAINERS',
    'KANTO', 'JOHTO', 'HOENN', 'SINNOH', 'UNOVA', 'KALOS', 'ALOLA', 'GALAR', 'PALDEA'
  ];
  const favList = getFavoriteTrainersList();
  const seenNpcIds = new Set();
  const list = [];

  for (const groupKey of allGroups) {
    const trainers = gymLeadersData[groupKey];
    if (!Array.isArray(trainers)) continue;
    if (categoryFilter === 'GYM_LEAGUES' && groupKey.endsWith('_TRAINERS')) continue;
    if (categoryFilter !== 'ALL' && categoryFilter !== 'FAVORITES' && categoryFilter !== 'GYM_LEAGUES' && categoryFilter !== 'GMAX_CHALLENGE') {
      if (groupKey !== categoryFilter) continue;
    }
    for (const tr of trainers) {
      if (!tr || !tr.npcId) continue;
      if (categoryFilter === 'FAVORITES' && !favList.includes(tr.name)) continue;
      const npcKey = String(tr.npcId);
      if (seenNpcIds.has(npcKey)) continue;
      seenNpcIds.add(npcKey);
      list.push({
        name: tr.name,
        npcId: tr.npcId,
        groupKey: groupKey
      });
    }
  }
  return list;
}

function handleTrainerProfileSynced(data) {
  if (!gymLeadersData || !data || !data.npcId || !Array.isArray(data.roster) || data.roster.length === 0) return;
  const targetId = String(data.npcId);
  let anyChanged = false;

  const formatMoves = (mList) => {
    if (!Array.isArray(mList) || mList.length === 0) return [];
    const out = [];
    const seen = new Set();
    for (const m of mList) {
      const rawName = typeof m === 'string' ? m : (m && m.name ? m.name : '');
      const cleanName = String(rawName || '').trim();
      if (!cleanName || /^moves\b/i.test(cleanName)) continue;
      const lower = cleanName.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      const resolved = (teamEngine && typeof teamEngine.resolveMove === 'function')
        ? teamEngine.resolveMove(cleanName)
        : null;
      out.push({
        name: (resolved && resolved.name) || cleanName,
        type: (resolved && resolved.type) || (typeof m === 'object' && m.type ? m.type : 'Normal'),
        power: (resolved && resolved.power) || 40,
        category: (resolved && resolved.category) || 'Physical'
      });
    }
    return out;
  };

  const formattedRoster = [];
  let levelSum = 0;
  for (let i = 0; i < data.roster.length; i++) {
    const p = data.roster[i];
    if (!p || !p.name) continue;
    const moves = formatMoves(p.moves);
    const pokeLvl = Number(p.level) || 100;
    levelSum += pokeLvl;
    const pokeTypes = (Array.isArray(p.types) && p.types.length > 0) ? p.types : ['Normal'];
    formattedRoster.push({
      name: p.name,
      types: pokeTypes,
      level: pokeLvl,
      hp: p.hp || 100,
      maxHp: p.maxHp || 100,
      isFainted: false,
      sprite: p.sprite || '',
      moves: moves,
      knownMoveTypes: Array.from(new Set(moves.map(m => m.type).filter(Boolean)))
    });
  }

  if (formattedRoster.length === 0) return;
  const computedAvgLvl = Math.round(levelSum / formattedRoster.length);

  for (const key of Object.keys(gymLeadersData)) {
    const group = gymLeadersData[key];
    if (!Array.isArray(group)) continue;
    for (const tr of group) {
      if (String(tr.npcId) === targetId || (tr.battleUrl && tr.battleUrl.endsWith('/' + targetId))) {
        tr.roster = formattedRoster.map(item => Object.assign({}, item));
        if (computedAvgLvl > 0 && computedAvgLvl < 100) {
          tr.avgLevel = computedAvgLvl;
        } else if (!tr.avgLevel) {
          tr.avgLevel = computedAvgLvl;
        }
        anyChanged = true;
      }
    }
  }

  if (anyChanged) {
    try {
      const gymPath = getWritableDataPath('gym_leaders.json');
      fs.writeFileSync(gymPath, JSON.stringify(gymLeadersData, null, 2), 'utf8');
      const devGymPath = path.join(__dirname, 'gym_leaders.json');
      if (devGymPath !== gymPath && fs.existsSync(devGymPath)) {
        fs.writeFileSync(devGymPath, JSON.stringify(gymLeadersData, null, 2), 'utf8');
      }
    } catch (e) {
      backendLog('TRAINER_SYNC', `Failed saving gym_leaders.json: ${e.message}`);
    }
    updateCategoryFilterCounts();
    populateGymTrainerSelect();
    if (teamTrainerSelect && teamTrainerSelect.value) {
      const info = getSelectedTrainerInfo();
      if (info && info.leader && String(info.leader.npcId) === targetId && Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.length > 0) {
        if (typeof buildAndRenderTeam === 'function') {
          buildAndRenderTeam();
        }
      }
    }
  }
}

function probeTrainerRostersDirectly(targetTrainers) {
  if (!delugeView) return;
  delugeView.send('start-scan-trainer-rosters', { trainers: targetTrainers });
}

if (syncTrainersBtn) {
  syncTrainersBtn.addEventListener('click', () => {
    if (!delugeView) return;
    if (isTrainerRosterSyncRunning) {
      delugeView.send('abort-scan-trainer-rosters');
      return;
    }
    stopAllActivitiesForSafety('Paused all activities for Trainer Roster Sync');
    const targetTrainers = getTrainersForActiveCategoryFilter();
    if (targetTrainers.length === 0) {
      if (syncTrainersStatusDot) syncTrainersStatusDot.style.background = '#f87171';
      if (syncTrainersStatusBadge) {
        syncTrainersStatusBadge.style.color = '#f87171';
        syncTrainersStatusBadge.textContent = 'No trainers in filter';
      }
      return;
    }
    isTrainerRosterSyncRunning = true;
    syncTrainersBtn.innerHTML = '&#9632; Stop Sync';
    if (syncTrainersStatusDot) syncTrainersStatusDot.style.background = '#388bfd';
    if (syncTrainersStatusBadge) {
      syncTrainersStatusBadge.style.color = '#388bfd';
      syncTrainersStatusBadge.textContent = `Syncing 0/${targetTrainers.length}...`;
    }
    probeTrainerRostersDirectly(targetTrainers);
  });
}

if (scanTrainersBtn) {
  scanTrainersBtn.addEventListener('click', () => {
    updateTrainerIntelStats();
    if (activeBattleStatusMsg) {
      activeBattleStatusMsg.textContent = '';
    }
    showModal(trainerIntelModal);
  });
}

if (closeTrainerIntelBtn) closeTrainerIntelBtn.addEventListener('click', closeAllModals);
if (cancelTrainerIntelBtn) cancelTrainerIntelBtn.addEventListener('click', closeAllModals);

if (inspectBattleBtn) {
  inspectBattleBtn.addEventListener('click', () => {
    if (!delugeView) return;
    try {
      const curUrl = delugeView.getURL() || '';
      if (curUrl.includes('/battle')) {
        delugeView.send('check-battle-opponents');
        if (activeBattleStatusMsg) {
          activeBattleStatusMsg.style.color = '#388bfd';
          activeBattleStatusMsg.textContent = 'Scanning active battle...';
        }
      } else {
        if (activeBattleStatusMsg) {
          activeBattleStatusMsg.style.color = '#d29922';
          activeBattleStatusMsg.textContent = 'No battle active on screen.';
        }
      }
    } catch (_) {}
  });
}

function renderTeamLineup(leader, team) {
  if (!teamResultContainer || !teamResultList) return;
  if (teamEmptyPrompt) teamEmptyPrompt.style.display = 'none';
  teamResultContainer.style.display = 'block';
  teamResultList.innerHTML = '';

  if (!team || team.length === 0) {
    lastRecommendedTeam = null;
    const emptyMsg = teamRosterMode === 'TRAINING'
      ? 'No eligible training counters (&lt; Lv 100) found.'
      : 'No eligible counters found.';
    teamResultList.innerHTML = `<div style="padding:16px 10px; color:rgba(244, 238, 232, 0.7); font-size:11px; text-align:center;">${emptyMsg}</div>`;
    syncTeamActionButtonsState();
    if (typeof updateTeamBuilderBattleAction === 'function') {
      updateTeamBuilderBattleAction(activeAiBattleData);
    }
    return;
  }

  team.forEach(p => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:4px 8px; background:#0e1b30; border:1px solid #1a283e; border-radius:4px; font-size:11px; gap:7px;';

    const left = document.createElement('div');
    left.style.cssText = 'display:flex; align-items:center; gap:8px; min-width:0; flex:1;';

    const slotBadge = document.createElement('span');
    slotBadge.style.cssText = 'font-weight:700; color:#388bfd; width:14px; flex-shrink:0;';
    slotBadge.textContent = `${p.slot}.`;
    left.appendChild(slotBadge);

    const thumb = document.createElement('div');
    thumb.className = 'team-sprite-thumb';
    if (p.sprite) {
      const img = document.createElement('img');
      img.src = p.sprite;
      img.alt = p.name;
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = '<span style="font-size:16px; color:#388bfd;">&#9876;</span>';
    }
    left.appendChild(thumb);

    const info = document.createElement('div');
    info.style.cssText = 'min-width:0; overflow:hidden;';
    const varColor = (p.variant && p.variant !== 'Normal') ? '#388bfd' : '#e0ecfa';
    const cleanMove = (p.bestMove || '').split(' (')[0];
    info.innerHTML = `<div style="font-weight:700; color:${varColor}; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name} <span style="font-weight:500; color:#8eaad0;">(Lv ${p.level})</span></div>` +
                     `<div style="font-size:10px; color:#8eaad0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><b style="color:#e0ecfa;">${cleanMove}</b></div>`;
    left.appendChild(info);

    const right = document.createElement('div');
    right.style.cssText = 'text-align:right; white-space:nowrap; flex-shrink:0; display:flex; align-items:center;';

    if (p.role === 'G-MAX TARGET' || p.targetName === 'G-Max Evolution Target') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#58a6ff; background:rgba(88, 166, 255, 0.15); border:1px solid #58a6ff; border-radius:4px;">G-MAX TARGET</span>';
    } else if (p.targetName === 'Safety Anchor & Carry') {
      if (p.isAtRisk) {
        targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#f87171; background:rgba(248, 113, 113, 0.15); border:1px solid #f87171; border-radius:4px;" title="Carry takes super-effective damage; change trainer recommended">&#9888; CARRY AT RISK</span>';
      } else {
        targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#388bfd; background:rgba(56, 139, 253, 0.15); border:1px solid #388bfd; border-radius:4px;">CARRY ANCHOR</span>';
      }
    } else if (p.targetName === 'Backup Carry Anchor' || p.targetName === 'Secondary Safety Anchor') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#388bfd; background:rgba(56, 139, 253, 0.15); border:1px solid #388bfd; border-radius:4px;">BACKUP CARRY</span>';
    } else if (!p.isCarry && (p.level || 0) >= 100) {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#10b981; background:rgba(16, 185, 129, 0.15); border:1px solid #10b981; border-radius:4px;">MAXED</span>';
    } else if (p.targetName === 'Primary Trainee Partner' || p.targetName === 'Primary Trainee') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#2ea043; background:rgba(46, 160, 67, 0.15); border:1px solid #2ea043; border-radius:4px;">PRIMARY TRAINEE</span>';
    } else if (p.targetName === 'Lead Solo Sweeper' || p.targetName === 'Solo Sweeper') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#d29922; background:rgba(210, 153, 34, 0.15); border:1px solid #d29922; border-radius:4px;">SOLO SWEEPER</span>';
    } else if (p.targetName === 'Gym Anchor' || p.targetName === 'Reserve Anchor') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#8eaad0; background:#070e1a; border:1px solid #1a283e; border-radius:4px;">RESERVE</span>';
    } else if (p.targetName === 'Trainee' || (typeof p.targetName === 'string' && p.targetName.startsWith('Trainee'))) {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#238636; background:rgba(35, 134, 54, 0.15); border:1px solid #238636; border-radius:4px;">TRAINEE</span>';
    } else if (p.role === 'LEAD SWEEPER') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#f59e0b; background:rgba(245, 158, 11, 0.15); border:1px solid #f59e0b; border-radius:4px;">LEAD SWEEPER</span>';
    } else if (p.role === 'WALLBREAKER') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#f87171; background:rgba(248, 113, 113, 0.15); border:1px solid #f87171; border-radius:4px;">WALLBREAKER</span>';
    } else if (p.role === 'IMMORTAL TANK') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#388bfd; background:rgba(56, 139, 253, 0.15); border:1px solid #388bfd; border-radius:4px;">TANK</span>';
    } else if (p.role === 'FAIRY DRAGON-SLAYER') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#a371f7; background:rgba(163, 113, 247, 0.15); border:1px solid #a371f7; border-radius:4px;">FAIRY SLAYER</span>';
    } else if (p.role === 'GROUND/ELECTRIC PIVOT' || p.role === 'SPEED PIVOT') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#238636; background:rgba(35, 134, 54, 0.15); border:1px solid #238636; border-radius:4px;">PIVOT</span>';
    } else if (p.role === 'ARMOR ANCHOR' || p.role === 'CLUTCH ANCHOR') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#e0ecfa; background:#1a283e; border:1px solid #388bfd; border-radius:4px;">ANCHOR</span>';
    } else if (p.role === 'MYSTERY CARRIER') {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#388bfd; background:rgba(56, 139, 253, 0.15); border:1px solid #388bfd; border-radius:4px;">CARRIER</span>';
    } else if (p.targetName) {
      targetBadgeHtml = `<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#388bfd; background:rgba(56, 139, 253, 0.15); border:1px solid #1a283e; border-radius:4px;">vs ${p.targetName}</span>`;
    } else {
      targetBadgeHtml = '<span style="display:inline-block; padding:2px 6px; font-size:9.5px; font-weight:700; color:#8eaad0; background:#070e1a; border:1px solid #1a283e; border-radius:4px;">COUNTER</span>';
    }

    right.innerHTML = targetBadgeHtml;

    row.appendChild(left);
    row.appendChild(right);
    teamResultList.appendChild(row);
  });

  for (let s = team.length + 1; s <= 6; s++) {
    const emptyRow = document.createElement('div');
    emptyRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:4px 8px; background:rgba(14, 27, 48, 0.4); border:1px dashed #1a283e; border-radius:4px; font-size:11px; opacity:0.6; box-shadow:none !important;';
    emptyRow.innerHTML = `<div style="display:flex; align-items:center; gap:8px;">` +
      `<span style="font-weight:700; color:#64748b; width:14px; flex-shrink:0;">${s}.</span>` +
      `<span style="color:#64748b; font-size:10.5px; font-style:italic;">Empty Slot</span>` +
      `</div>` +
      `<div><span style="display:inline-block; padding:2px 6px; font-size:9.5px; color:#64748b; border:1px dashed #1a283e; border-radius:4px;">EMPTY</span></div>`;
    teamResultList.appendChild(emptyRow);
  }

  syncTeamActionButtonsState();
  if (teamActionStatus && !isBattleLoopRunning) teamActionStatus.textContent = '';
  if (typeof updateTeamBuilderBattleAction === 'function') {
    updateTeamBuilderBattleAction(activeAiBattleData);
  }
}

function executeTeamBuild(targetLeader, buildOptions = {}) {
  if (!targetLeader) return;

  if (!currentCollection || currentCollection.length === 0) {
    loadTeamBuilderData();
  }

  if (currentCollection.length === 0) {
    if (teamResultContainer) teamResultContainer.style.display = 'block';
    if (teamResultList) teamResultList.innerHTML = '<div style="padding:10px; color:#f87171; font-size:11px; text-align:center;">No Pokemon in database. Click "Scan My Box" first.</div>';
    lastRecommendedTeam = null;
    syncTeamActionButtonsState();
    return;
  }

  if (teamRosterMode === 'TRAINING') {
    // 1. Identify trainees (< Lv 100) strictly matching the selected candidate pool filter
    const poolKey = String(teamPoolFilter || 'ANY').toUpperCase();
    const effectivePool = getEffectiveFilteredPool(currentCollection || [], teamPoolFilter);
    const filterTrainees = effectivePool.filter(p => (typeof p.level === 'number' ? p.level : 100) < 100);
    candidateListsCache.trainingByPool[poolKey] = filterTrainees;

    const filterLabels = {
      ANY: 'Pokemon',
      GMAX: 'G-Max Pokemon',
      MEGA: 'Mega Pokemon',
      GMAX_MEGA: 'G-Max & Mega Pokemon',
      LEGENDARY: 'Legendaries',
      ULTRABEAST: 'Ultra Beasts',
      PARADOX: 'Paradox Pokemon',
      COMMON: 'Common Pokemon'
    };
    const label = filterLabels[teamPoolFilter] || 'Pokemon';

    // If there are no eligible trainees in the selected pool, do NOT build a team (prevents building a team with only a carry)
    if (filterTrainees.length === 0) {
      if (teamResultContainer) teamResultContainer.style.display = 'block';
      if (teamResultList) {
        teamResultList.innerHTML = `<div style="padding:16px 10px; color:rgba(244, 238, 232, 0.7); font-size:11px; text-align:center;">No training ${label} (&lt; Lv 100) available in your collection.<br><span style="color:rgba(244, 238, 232, 0.5); font-size:10px;">Switch Candidate Pool Filter or choose <b>Maxed (Lv 100)</b> mode.</span></div>`;
      }
      lastRecommendedTeam = null;
    syncTeamActionButtonsState();
      return;
    }

    // 2. Pick carry defense-first from the ENTIRE collection (Carry does NOT depend on candidate pool filter):
    // A carry must GUARANTEE the survival of the low-level trainees.
    // First, search the ENTIRE collection for a Level 100 capable of soloing the trainer;
    // If none can strictly solo, rank all collection Level 100s by lead-safety & survivability.
    const collectionLvl100s = (currentCollection || []).filter(p => (p.level || 0) === 100);
    const collectionHighLvls = (currentCollection || []).filter(p => (p.level || 0) >= 70);

    let rankedCarries = [];
    if (collectionLvl100s.length > 0) {
      const allSoloers = collectionLvl100s.filter(p => teamEngine.canSoloTrainer(p, targetLeader));
      if (allSoloers.length > 0) {
        rankedCarries = teamEngine.rankCarries(allSoloers, targetLeader);
      } else {
        rankedCarries = teamEngine.rankCarries(collectionLvl100s, targetLeader);
      }
    }
    if (rankedCarries.length === 0) {
      const fallbackPool = collectionHighLvls.length > 0 ? collectionHighLvls : (currentCollection || []);
      rankedCarries = teamEngine.rankCarries(fallbackPool, targetLeader);
    }
    const carryPoke = rankedCarries.length > 0 ? rankedCarries[0].poke : null;
    const bestCarries = carryPoke ? teamEngine.buildBestTeam(targetLeader, [carryPoke]) : [];
    const carry = bestCarries.length > 0 ? bestCarries[0] : null;

    // Evaluate if opponent is a very strong 6/6 roster opponent that warrants 2 Carries for guaranteed victory
    const needsDualCarries = Boolean(teamEngine.isVeryStrongOpponent && teamEngine.isVeryStrongOpponent(targetLeader) && collectionLvl100s.length >= 2);
    let carry2 = null;
    let carry2Poke = null;

    if (needsDualCarries && carry) {
      const carry1Species = teamEngine.getBaseSpecies(carry.name);
      const carry2Candidate = rankedCarries.find(r => r.poke && r.poke.id !== carry.id && teamEngine.getBaseSpecies(r.poke.name) !== carry1Species);
      carry2Poke = carry2Candidate ? carry2Candidate.poke : null;
      if (carry2Poke) {
        const bestCarries2 = teamEngine.buildBestTeam(targetLeader, [carry2Poke]);
        carry2 = bestCarries2.length > 0 ? bestCarries2[0] : null;
      }
    }

    const hybridTeam = [];
    const usedIds = new Set();
    const usedSpecies = new Set();

    // Slot 1: Unstoppable Lead Carry Anchor (Always Level 100)
    if (carry) {
      usedIds.add(carry.id);
      usedSpecies.add(teamEngine.getBaseSpecies(carry.name));
      const carryGuidance = (carryPoke && typeof teamEngine.getCarryMoveGuidance === 'function')
        ? teamEngine.getCarryMoveGuidance(carryPoke, targetLeader)
        : carry.bestMove;

      const topRank = rankedCarries[0];
      const isAtRisk = topRank
        ? (!topRank.isPureSpeedSweeper && (topRank.exposure.worst >= 2.0 || topRank.walledCount > 0 || (carry.level || 0) < (targetLeader.avgLevel || 50)))
        : false;

      hybridTeam.push({
        slot: 1,
        id: carry.id,
        name: carry.name,
        variant: carry.variant,
        level: carry.level,
        types: carry.types,
        sprite: carry.sprite,
        bestMove: carryGuidance,
        targetName: 'Safety Anchor & Carry',
        role: isAtRisk ? 'Vulnerable Carry' : ('Solo Sweeper Carry (Lv ' + carry.level + ')'),
        score: carry.score,
        isAtRisk: isAtRisk,
        isCarry: true
      });
    }

    // Slot 2: Secondary Carry Anchor (for very strong 6/6 roster opponents)
    if (carry2) {
      usedIds.add(carry2.id);
      usedSpecies.add(teamEngine.getBaseSpecies(carry2.name));
      const carry2Guidance = (carry2Poke && typeof teamEngine.getCarryMoveGuidance === 'function')
        ? teamEngine.getCarryMoveGuidance(carry2Poke, targetLeader)
        : carry2.bestMove;

      hybridTeam.push({
        slot: 2,
        id: carry2.id,
        name: carry2.name,
        variant: carry2.variant,
        level: carry2.level,
        types: carry2.types,
        sprite: carry2.sprite,
        bestMove: carry2Guidance,
        targetName: 'Backup Carry Anchor',
        role: 'Backup Sweeper Carry (Lv ' + carry2.level + ')',
        score: carry2.score || 950,
        isCarry: true
      });
    }

    // 3. Trainees strictly matching the selected candidate pool filter (e.g. G-Max Only, Mega Only, etc.)
    const carryIds = new Set([carry ? carry.id : null, carry2 ? carry2.id : null].filter(Boolean));
    const carrySpeciesSet = new Set([
      carry ? teamEngine.getBaseSpecies(carry.name) : null,
      carry2 ? teamEngine.getBaseSpecies(carry2.name) : null
    ].filter(Boolean));
    const availableMatching = filterTrainees.filter(p => !carryIds.has(p.id) && !carrySpeciesSet.has(teamEngine.getBaseSpecies(p.name)));

    const rankedMatching = (typeof teamEngine.rankTraineePartners === 'function')
      ? teamEngine.rankTraineePartners(availableMatching, targetLeader)
      : availableMatching.map(t => ({ poke: t }));

    const maxTraineeSlots = Math.max(1, 6 - hybridTeam.length);
    const trainerKey = String((targetLeader && (targetLeader.npcId || targetLeader.name)) || 'DEFAULT');
    const prevCtx = candidateListsCache.lastTrainingBuiltCtx;
    const shouldAdvance = Boolean(
      buildOptions &&
      buildOptions.advanceCandidate &&
      prevCtx &&
      prevCtx.poolKey === poolKey &&
      prevCtx.trainerKey === trainerKey &&
      Array.isArray(lastRecommendedTeam) &&
      lastRecommendedTeam.length > 0 &&
      rankedMatching.length > 1
    );
    let startOffset = (candidateListsCache.trainingCursorsByPool[poolKey] || 0);
    if (shouldAdvance) {
      const step = rankedMatching.length > maxTraineeSlots
        ? Math.min(maxTraineeSlots, prevCtx.traineeCount || maxTraineeSlots)
        : 1;
      startOffset = (startOffset + step) % rankedMatching.length;
    } else if (rankedMatching.length > 0) {
      startOffset = startOffset % rankedMatching.length;
    } else {
      startOffset = 0;
    }

    const rotatedMatching = (startOffset > 0 && rankedMatching.length > 0)
      ? rankedMatching.slice(startOffset).concat(rankedMatching.slice(0, startOffset))
      : rankedMatching;

    let builtTraineeCount = 0;
    if (rotatedMatching.length > 0 && hybridTeam.length < 6) {
      const primaryPartner = rotatedMatching[0].poke;
      usedIds.add(primaryPartner.id);
      usedSpecies.add(teamEngine.getBaseSpecies(primaryPartner.name));
      const partnerMove = teamEngine.getRosterWideBestAttack(primaryPartner, targetLeader);
      hybridTeam.push({
        slot: hybridTeam.length + 1,
        id: primaryPartner.id,
        name: primaryPartner.name,
        variant: primaryPartner.variant,
        level: primaryPartner.level,
        types: primaryPartner.types,
        sprite: primaryPartner.sprite,
        bestMove: partnerMove,
        targetName: 'Primary Trainee Partner',
        role: 'Primary Trainee Duo (Lv ' + primaryPartner.level + ')',
        score: rotatedMatching[0].score || 500,
        isCarry: false
      });
      builtTraineeCount++;
    }

    const otherMatching = rotatedMatching.slice(1).map(r => r.poke);
    // 3a. Add unique species from filter-matching trainees
    for (let i = 0; i < otherMatching.length && hybridTeam.length < 6; i++) {
      const t = otherMatching[i];
      if (usedIds.has(t.id)) continue;
      const sp = teamEngine.getBaseSpecies(t.name);
      if (usedSpecies.has(sp)) continue;
      usedIds.add(t.id);
      usedSpecies.add(sp);
      hybridTeam.push({
        slot: hybridTeam.length + 1,
        id: t.id,
        name: t.name,
        variant: t.variant,
        level: t.level,
        types: t.types,
        sprite: t.sprite,
        bestMove: teamEngine.getRosterWideBestAttack(t, targetLeader),
        targetName: 'Trainee #' + (hybridTeam.length + 1),
        role: 'Trainee EXP Receiver (Lv ' + t.level + ')',
        score: 100,
        isCarry: false
      });
      builtTraineeCount++;
    }

    // 3b. If still open slots, add any remaining filter-matching trainees
    for (let i = 0; i < otherMatching.length && hybridTeam.length < 6; i++) {
      const t = otherMatching[i];
      if (usedIds.has(t.id)) continue;
      usedIds.add(t.id);
      usedSpecies.add(teamEngine.getBaseSpecies(t.name));
      hybridTeam.push({
        slot: hybridTeam.length + 1,
        id: t.id,
        name: t.name,
        variant: t.variant,
        level: t.level,
        types: t.types,
        sprite: t.sprite,
        bestMove: teamEngine.getRosterWideBestAttack(t, targetLeader),
        targetName: 'Trainee #' + (hybridTeam.length + 1),
        role: 'Trainee EXP Receiver (Lv ' + t.level + ')',
        score: 100,
        isCarry: false
      });
      builtTraineeCount++;
    }

    // Zero-Backfill Enforcement: Remaining unfilled slots are strictly left empty!
    // (Never backfill from outside candidate pool or with reserve anchors)

    candidateListsCache.trainingCursorsByPool[poolKey] = startOffset;
    candidateListsCache.lastTrainingBuiltCtx = {
      poolKey: poolKey,
      trainerKey: trainerKey,
      traineeCount: Math.max(1, builtTraineeCount)
    };

    lastRecommendedTeam = hybridTeam;
    renderTeamLineup(targetLeader, hybridTeam);
    if (teamActionStatus) {
      const leadMember = hybridTeam[0];
      if (leadMember && leadMember.isAtRisk) {
        teamActionStatus.innerHTML = '<span style="color:#f87171; font-weight:600;">&#9888; Carry has elemental vulnerability - change trainer recommended.</span>';
        teamActionStatus.style.display = 'block';
      } else if (rankedMatching.length > 1) {
        const rangeEnd = Math.min(startOffset + builtTraineeCount, rankedMatching.length);
        teamActionStatus.textContent = `Training ${startOffset + 1}-${rangeEnd}/${rankedMatching.length} (${label})`;
        teamActionStatus.style.color = '#388bfd';
        teamActionStatus.style.display = 'block';
      } else {
        teamActionStatus.textContent = '';
        teamActionStatus.style.display = '';
      }
    }
    return;
  }

  const candidates = getActiveCandidates();
  if (candidates.length === 0) {
    const filterLabels = {
      ANY: 'Pokemon',
      GMAX: 'G-Max Pokemon',
      MEGA: 'Mega Pokemon',
      GMAX_MEGA: 'G-Max & Mega Pokemon',
      LEGENDARY: 'Legendaries',
      ULTRABEAST: 'Ultra Beasts',
      PARADOX: 'Paradox Pokemon',
      COMMON: 'Common Pokemon'
    };
    const label = filterLabels[teamPoolFilter] || 'Pokemon';
    if (teamResultContainer) teamResultContainer.style.display = 'block';
    if (teamResultList) {
      teamResultList.innerHTML = `<div style="padding:16px 10px; color:rgba(244, 238, 232, 0.7); font-size:11px; text-align:center;">No ${label} available in your collection.<br><span style="color:rgba(244, 238, 232, 0.5); font-size:10px;">Switch pool filter to <b>Any</b> or click 'Scan My Box'.</span></div>`;
    }
    lastRecommendedTeam = null;
    syncTeamActionButtonsState();
    return;
  }

  const isChallenge = Boolean(
    targetLeader.isChallenge ||
    (targetLeader.name && targetLeader.name.toLowerCase().includes('challenge')) ||
    (targetLeader.battleUrl && targetLeader.battleUrl.toLowerCase().includes('challenge'))
  );

  if (isChallenge && (!targetLeader.roster || targetLeader.roster.length === 0)) {
    const gmaxTargets = (teamEngine && typeof teamEngine.getRankedGmaxChallengeCandidates === 'function')
      ? teamEngine.getRankedGmaxChallengeCandidates(candidates, currentCollection)
      : [];
    candidateListsCache.gmaxTargets = gmaxTargets;

    let targetIndex = 0;
    if (buildOptions && buildOptions.advanceCandidate && candidateListsCache.gmaxLastDisplayedId && gmaxTargets.length > 0) {
      const prevIdx = gmaxTargets.findIndex(p => p && String(p.id) === String(candidateListsCache.gmaxLastDisplayedId));
      targetIndex = (prevIdx !== -1) ? ((prevIdx + 1) % gmaxTargets.length) : 0;
    }

    const team = teamEngine.buildBestTeam(targetLeader, candidates, currentCollection, { targetIndex: targetIndex });
    candidateListsCache.gmaxLastDisplayedId = (team && team[0] && team[0].id) ? team[0].id : null;
    lastRecommendedTeam = team;
    renderTeamLineup(targetLeader, team);
    if (teamActionStatus && team && team[0] && gmaxTargets.length > 0) {
      teamActionStatus.textContent = gmaxTargets.length > 1
        ? `G-Max Candidate ${targetIndex + 1}/${gmaxTargets.length}: ${team[0].name}`
        : `G-Max Candidate: ${team[0].name}`;
      teamActionStatus.style.color = '#388bfd';
      teamActionStatus.style.display = 'block';
    }
    return;
  }

  const team = teamEngine.buildBestTeam(targetLeader, candidates, currentCollection);
  lastRecommendedTeam = team;
  renderTeamLineup(targetLeader, team);
}

function executePvPTeamBuild() {
  if (!currentCollection || currentCollection.length === 0) {
    loadTeamBuilderData();
  }

  if (!currentCollection || currentCollection.length === 0) {
    if (teamResultContainer) teamResultContainer.style.display = 'block';
    if (teamResultList) {
      teamResultList.innerHTML = '<div style="padding:10px; color:#f87171; font-size:11px; text-align:center;">No Pokemon in database. Click "Scan My Box" first.</div>';
    }
    lastRecommendedTeam = null;
    syncTeamActionButtonsState();
    return;
  }

  const pvpTier = (pvpCandidateTierSelect && pvpCandidateTierSelect.value) ? pvpCandidateTierSelect.value : pvpCandidateTier;

  if (pvpStrategy === 'GODSQUAD') {
    const team = teamEngine.buildGodSquadTeam(currentCollection, pvpTier);
    if (!team || team.length === 0) {
      const tierLabels = {
        ANY: 'Level 100 Pokemon',
        LEGENDARY: 'Legendaries',
        ULTRABEAST: 'Ultra Beasts',
        PARADOX: 'Paradox Pokemon',
        GMAX: 'G-Max Pokemon',
        MEGA: 'Mega Pokemon',
        GMAX_MEGA: 'G-Max & Mega Pokemon'
      };
      const label = tierLabels[pvpTier] || 'Pokemon';
      if (teamResultContainer) teamResultContainer.style.display = 'block';
      if (teamResultList) {
        teamResultList.innerHTML = `<div style="padding:16px 10px; color:#8eaad0; font-size:11px; text-align:center;">Not enough ${label} to build a God Squad.<br><span style="color:#64748b; font-size:10px;">Switch Candidate Tier to <b>All Lv 100s</b> or click 'Scan My Box'.</span></div>`;
      }
      lastRecommendedTeam = null;
    syncTeamActionButtonsState();
      return;
    }
    lastRecommendedTeam = team;
    renderTeamLineup({ name: 'Live PvP Universal Meta', isPvpMeta: true }, team);
  } else {
    // Strategy: Hard-Counters
    const targetOpponent = (activePvpTargetType === 'LIVE' && liveBattleOpponent)
      ? liveBattleOpponent
      : (scoutedPlayerOpponent || liveBattleOpponent);
    if (!targetOpponent || !Array.isArray(targetOpponent.roster) || targetOpponent.roster.length === 0) {
      if (teamResultContainer) teamResultContainer.style.display = 'block';
      if (teamResultList) {
        teamResultList.innerHTML = `
          <div style="padding:16px 10px; color:#8eaad0; font-size:11px; text-align:center;">
            <div style="font-size:18px; margin-bottom:4px;">&#128269;</div>
            <div style="font-weight:700; color:#e0ecfa; margin-bottom:4px;">No Challenger Scanned Yet</div>
            <div style="font-size:10px; line-height:1.4; color:#8eaad0;">
              Click <b>Check Active Screen</b> on a player profile or live battle, or enter a username above and click <b>Scout</b>.
            </div>
          </div>
        `;
      }
      lastRecommendedTeam = null;
    syncTeamActionButtonsState();
      return;
    }

    const filteredPool = getEffectiveFilteredPool(currentCollection, pvpTier);
    if (filteredPool.length === 0) {
      const tierLabels = {
        ANY: 'Level 100 Pokemon',
        LEGENDARY: 'Legendaries',
        ULTRABEAST: 'Ultra Beasts',
        PARADOX: 'Paradox Pokemon',
        GMAX: 'G-Max Pokemon',
        MEGA: 'Mega Pokemon',
        GMAX_MEGA: 'G-Max & Mega Pokemon'
      };
      const label = tierLabels[pvpTier] || 'Pokemon';
      if (teamResultContainer) teamResultContainer.style.display = 'block';
      if (teamResultList) {
        teamResultList.innerHTML = `<div style="padding:16px 10px; color:#8eaad0; font-size:11px; text-align:center;">No ${label} available in your collection.<br><span style="color:#64748b; font-size:10px;">Switch Candidate Tier to <b>All Lv 100s</b> or click 'Scan My Box'.</span></div>`;
      }
      lastRecommendedTeam = null;
    syncTeamActionButtonsState();
      return;
    }

    let candidatePool = filteredPool.filter(p => (p.level || 0) === 100);
    if (candidatePool.length < 6) {
      candidatePool = filteredPool.filter(p => (p.level || 0) >= 80);
    }
    if (candidatePool.length < 6) {
      candidatePool = filteredPool;
    }

    const team = teamEngine.buildBestTeam(targetOpponent, candidatePool);
    lastRecommendedTeam = team;
    renderTeamLineup(targetOpponent, team);
  }
}

if (buildTeamBtn) {
  buildTeamBtn.addEventListener('click', () => {
    if (isUnlockChallengeActive || isCaptchaAlarmActive) return;
    if (teamBattleMode === 'PVP') {
      executePvPTeamBuild();
      return;
    }
    const isGmaxChallenge = (teamRosterMode !== 'TRAINING') && (
                            (teamCategorySelect && teamCategorySelect.value === 'GMAX_CHALLENGE') ||
                            (teamTrainerSelect && teamTrainerSelect.value === 'GMAX_CHALLENGE'));

    let targetLeader = null;
    if (isGmaxChallenge) {
      targetLeader = {
        name: 'G-Max Challenge Arena',
        types: ['Mixed'],
        avgLevel: 100,
        isChallenge: true,
        battleUrl: '/challenge/gmax'
      };
      lastSelectedBattleUrl = '/challenge/gmax';
    } else {
      const selVal = teamTrainerSelect ? teamTrainerSelect.value : '';
      if (!selVal) return;

      if (selVal === 'LIVE__BATTLE') {
        if (!liveBattleOpponent || !liveBattleOpponent.roster) return;
        let matchedTypes = ['Mixed'];
        let matchedAvgLevel = 0;
        let matchedNpcId = liveBattleOpponent.npcId || null;
        if (!matchedNpcId && liveBattleOpponent.battleUrl) {
          const mUrl = String(liveBattleOpponent.battleUrl).match(/\/(?:battle\/(?:trainer|gym)|npc)\/(\d+)/i);
          if (mUrl) matchedNpcId = mUrl[1];
        }
        if (gymLeadersData) {
          let foundLeader = null;
          const allGroups = Object.values(gymLeadersData).filter(Array.isArray);
          if (matchedNpcId) {
            for (const group of allGroups) {
              foundLeader = group.find(t => String(t.npcId || '') === String(matchedNpcId) || (t.battleUrl && t.battleUrl.endsWith('/' + matchedNpcId)));
              if (foundLeader) break;
            }
          }
          if (!foundLeader && liveBattleOpponent.trainerName) {
            const cleanSearchName = liveBattleOpponent.trainerName.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const group of allGroups) {
              foundLeader = group.find(t => t.name && t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanSearchName);
              if (foundLeader) break;
            }
          }
          if (foundLeader) {
            if (Array.isArray(foundLeader.types) && foundLeader.types.length > 0) matchedTypes = foundLeader.types;
            if (foundLeader.avgLevel) matchedAvgLevel = foundLeader.avgLevel;
            if (!matchedNpcId && foundLeader.npcId) matchedNpcId = foundLeader.npcId;
          }
        }
        const rosterLevels = liveBattleOpponent.roster.map(p => (typeof p.level === 'number' ? p.level : 100)).filter(n => n > 0);
        const computedAvgLevel = rosterLevels.length > 0
          ? Math.round(rosterLevels.reduce((s, n) => s + n, 0) / rosterLevels.length)
          : (matchedAvgLevel || 100);
        targetLeader = {
          name: liveBattleOpponent.trainerName,
          roster: liveBattleOpponent.roster,
          types: matchedTypes,
          avgLevel: matchedAvgLevel || computedAvgLevel,
          npcId: matchedNpcId,
          battleUrl: liveBattleOpponent.battleUrl || (matchedNpcId ? ('/battle/trainer/' + matchedNpcId) : null)
        };
      } else {
        const parts = selVal.split('__');
        const groupKey = parts[0];
        const idxOrName = parts[1];
        const group = gymLeadersData[groupKey] || [];
        if (/^\d+$/.test(idxOrName)) {
          targetLeader = group[parseInt(idxOrName, 10)];
        } else {
          targetLeader = group.find(l => l.name === idxOrName);
        }
      }
    }
    if (!targetLeader) return;

    if (targetLeader.battleUrl) {
      lastSelectedBattleUrl = targetLeader.battleUrl;
    } else if (targetLeader.npcId) {
      lastSelectedBattleUrl = '/battle/trainer/' + targetLeader.npcId;
    }

    // Build immediately from synced cache (advancing G-Max target / Training batch cleanly without re-scanning 17 box pages)
    executeTeamBuild(targetLeader, { advanceCandidate: true });
  });
}

if (applyTeamBtn) {
  applyTeamBtn.addEventListener('click', () => {
    if (isUnlockChallengeActive || isCaptchaAlarmActive) return;
    if (!lastRecommendedTeam || lastRecommendedTeam.length === 0) return;
    const ids = lastRecommendedTeam.map(p => p.id).filter(Boolean);
    if (ids.length === 0) {
      if (teamActionStatus) {
        teamActionStatus.textContent = 'No Pokemon IDs found to save.';
        teamActionStatus.style.color = '#f87171';
      }
      return;
    }
    isApplyingTeamOnDeluge = true;
    applyTeamBtn.disabled = true;
    if (battleOpponentBtn) battleOpponentBtn.disabled = true;
    applyTeamBtn.innerHTML = '<span>&#8635;</span> <span>Saving...</span>';
    if (teamActionStatus) {
      teamActionStatus.textContent = 'Applying team on DelugeRPG...';
      teamActionStatus.style.color = '#388bfd';
    }
    lastAppliedTeamSnapshot = lastRecommendedTeam.map(p => Object.assign({}, p));
    delugeView.send('apply-team-slots', { pokemonIds: ids, pokemons: lastRecommendedTeam });
    setTimeout(() => {
      if (isApplyingTeamOnDeluge) {
        isApplyingTeamOnDeluge = false;
        if (applyTeamBtn) applyTeamBtn.innerHTML = 'Change Team';
        syncTeamActionButtonsState();
      }
      if (battleOpponentBtn && !isUnlockChallengeActive && !isCaptchaAlarmActive) battleOpponentBtn.disabled = false;
    }, 12000);
  });
}

if (copyTeamBtn) {
  copyTeamBtn.addEventListener('click', () => {
    if (!lastRecommendedTeam || lastRecommendedTeam.length === 0) return;
    const text = lastRecommendedTeam.map(p => `${p.slot}. ${p.name} (Lv ${p.level}) - Attack: ${p.bestMove} [${p.role}]`).join('\n');
    try {
      navigator.clipboard.writeText(text);
      if (teamActionStatus) {
        teamActionStatus.textContent = 'Copied lineup to clipboard!';
        teamActionStatus.style.color = '#238636';
        setTimeout(() => { if (teamActionStatus) teamActionStatus.textContent = ''; }, 2500);
      }
    } catch (_) {}
  });
}

function resolveTargetBattleUrl() {
  if (teamBattleMode === 'PVP') {
    const pvpTarget = (activePvpTargetType === 'LIVE' && liveBattleOpponent)
      ? liveBattleOpponent
      : (scoutedPlayerOpponent || liveBattleOpponent);
    if (pvpStrategy === 'COUNTERS' && pvpTarget && pvpTarget.battleUrl) {
      return pvpTarget.battleUrl;
    }
    return '/battle/live';
  }
  if (teamCategorySelect && teamCategorySelect.value === 'GMAX_CHALLENGE') {
    return '/gmax';
  }

  // The explicitly selected Target Battle Opponent in the dropdown ALWAYS takes highest priority
  const selVal = teamTrainerSelect ? teamTrainerSelect.value : '';

  if (selVal === 'LIVE__BATTLE') {
    if (liveBattleOpponent) {
      const hasSpecificUrl = /\/battle\/(?:trainer|gym)\/\d+/i.test(String(liveBattleOpponent.battleUrl || '')) || /\/npc\/\d+/i.test(String(liveBattleOpponent.battleUrl || ''));
      if (hasSpecificUrl) return liveBattleOpponent.battleUrl;
      if (liveBattleOpponent.npcId) return `/battle/trainer/${liveBattleOpponent.npcId}`;
      if (gymLeadersData && liveBattleOpponent.trainerName) {
        const cleanName = liveBattleOpponent.trainerName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const allGroups = [
          gymLeadersData.ULTIMATE_TRAINERS,
          gymLeadersData.STRONG_TRAINERS,
          gymLeadersData.VIP_TRAINERS,
          gymLeadersData.STANDARD_TRAINERS,
          gymLeadersData.KANTO, gymLeadersData.JOHTO, gymLeadersData.HOENN,
          gymLeadersData.SINNOH, gymLeadersData.UNOVA, gymLeadersData.KALOS,
          gymLeadersData.ALOLA, gymLeadersData.GALAR, gymLeadersData.PALDEA
        ];
        for (const grp of allGroups) {
          if (Array.isArray(grp)) {
            const found = grp.find(l => l.name && l.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName);
            if (found && found.battleUrl) return found.battleUrl;
            if (found && found.npcId) return `/battle/trainer/${found.npcId}`;
          }
        }
      }
      if (liveBattleOpponent.battleUrl) return liveBattleOpponent.battleUrl;
    }
    return '/battle/trainer';
  }

  if (selVal && gymLeadersData) {
    const parts = selVal.split('__');
    const groupKey = parts[0];
    const idxOrName = parts[1];
    const group = gymLeadersData[groupKey] || [];
    const leader = /^\d+$/.test(idxOrName) ? group[parseInt(idxOrName, 10)] : group.find(l => l.name === idxOrName);
    if (leader) {
      if (leader.battleUrl) return leader.battleUrl;
      if (leader.npcId) return `/battle/trainer/${leader.npcId}`;
    }
  }

  // Fallbacks if dropdown is unselected (never cross G-Max Challenge URL into Training Battles)
  if (lastSelectedBattleUrl) {
    const isChallengeUrl = lastSelectedBattleUrl.includes('/gmax') || lastSelectedBattleUrl.includes('/challenge');
    if (!isChallengeUrl || (teamRosterMode !== 'TRAINING' && teamCategorySelect && teamCategorySelect.value === 'GMAX_CHALLENGE')) {
      return lastSelectedBattleUrl;
    }
  }
  return '/battle/trainer';
}

if (battleOpponentBtn) {
  battleOpponentBtn.addEventListener('click', () => {
    if (isUnlockChallengeActive || isCaptchaAlarmActive) return;
    const isGmaxEntry = Boolean(teamRosterMode !== 'TRAINING' && teamCategorySelect && teamCategorySelect.value === 'GMAX_CHALLENGE');
    const battleUrl = resolveTargetBattleUrl();
    const fullUrl = battleUrl.startsWith('http') ? battleUrl : `https://www.delugerpg.com${battleUrl}`;

    if (isGmaxEntry) {
      const slot0 = (Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.length > 0) ? lastRecommendedTeam[0] : null;
      pendingGmaxEntryFlow = {
        targetName: slot0 ? String(slot0.name || '').trim() : '',
        variant: slot0 ? String(slot0.variant || '').trim() : '',
        startedAt: Date.now()
      };
      if (teamBattleAutoCheck && teamBattleAutoCheck.checked && teamBattleLoopCheck && !teamBattleLoopCheck.checked) {
        teamBattleLoopCheck.disabled = false;
        teamBattleLoopCheck.checked = true;
        updateLoopCheckboxVisual();
      }
    } else {
      pendingGmaxEntryFlow = null;
      if (delugeView && typeof delugeView.send === 'function') {
        try { delugeView.send('abort-gmax-challenge-flow'); } catch (_) {}
      }
    }

    if (teamBattleAutoCheck && teamBattleAutoCheck.checked) {
      userManuallyPaused = false;
      isBattleAutoRunning = true;
    }

    healLastKnownUserTeamForNewMatch();

    battleOpponentBtn.disabled = true;
    if (applyTeamBtn) applyTeamBtn.disabled = true;
    battleOpponentBtn.innerHTML = '<span>&#8635;</span> <span>Entering...</span>';
    if (teamActionStatus) {
      teamActionStatus.textContent = isGmaxEntry
        ? 'Opening G-Max Challenge setup...'
        : 'Entering battle arena on DelugeRPG...';
      teamActionStatus.style.color = '#388bfd';
    }

    // Natural human click-to-navigation pacing
    setTimeout(() => {
      const navSeqBefore = guestLoadEventSeq;
      if (delugeView) {
        try {
          if (isGmaxEntry && pendingGmaxEntryFlow && typeof delugeView.send === 'function') {
            try {
              delugeView.send('start-gmax-challenge-flow', pendingGmaxEntryFlow);
            } catch (_) {}
          }
          delugeView.loadURL(fullUrl).catch(() => {});
          delugeView.focus();
        } catch (err) {
          console.error('Error entering battle arena:', err);
        }

        if (isGmaxEntry) {
          setTimeout(() => {
            if (pendingGmaxEntryFlow && pendingGmaxEntryFlow.active && guestLoadEventSeq === navSeqBefore) {
              backendLog('GMAX_FLOW', 'Guest renderer did not respond to G-Max navigation; resetting frozen webview.');
              recoverHungWebviewAndLoad(fullUrl, 'Battle Now G-Max navigation timeout').catch(() => {});
            }
          }, 3000);
        }
      }

      setTimeout(() => {
        if (battleOpponentBtn) {
          battleOpponentBtn.disabled = Boolean(isUnlockChallengeActive || isCaptchaAlarmActive);
          battleOpponentBtn.innerHTML = '<span>&#9876;</span> <span>Battle Now</span>';
        }
        syncTeamActionButtonsState();
        if (teamActionStatus && teamActionStatus.textContent === 'Entering battle arena on DelugeRPG...') {
          teamActionStatus.textContent = 'In Battle Arena';
          teamActionStatus.style.color = '#238636';
          setTimeout(() => {
            if (teamActionStatus && teamActionStatus.textContent === 'In Battle Arena') {
              teamActionStatus.textContent = '';
            }
          }, 3000);
        }
      }, 1200);
    }, 350);
  });
}

function updateLoopCheckboxVisual() {
  if (!teamBattleLoopCheck || !teamBattleLoopLabel) return;
  const isAutoArmed = Boolean(teamBattleAutoCheck && teamBattleAutoCheck.checked);
  if (!isAutoArmed) {
    teamBattleLoopCheck.checked = false;
    teamBattleLoopCheck.disabled = true;
    teamBattleLoopLabel.style.borderColor = '#1a283e';
    teamBattleLoopLabel.style.color = '#566e96';
    teamBattleLoopLabel.style.opacity = '0.6';
    teamBattleLoopLabel.style.cursor = 'not-allowed';
  } else {
    teamBattleLoopCheck.disabled = false;
    teamBattleLoopLabel.style.cursor = 'pointer';
    teamBattleLoopLabel.style.opacity = '1';
    if (teamBattleLoopCheck.checked) {
      teamBattleLoopLabel.style.borderColor = '#388bfd';
      teamBattleLoopLabel.style.color = '#58a6ff';
    } else {
      teamBattleLoopLabel.style.borderColor = '#1a283e';
      teamBattleLoopLabel.style.color = '#8eaad0';
    }
  }
}

function handleBattleExpCalibrated(data) {
  if (!data || !data.trainerName) return;
  const cleanSearchName = data.trainerName.toLowerCase().replace(/[^a-z0-9]/g, '');

  let targetTrainer = null;
  if (gymLeadersData) {
    for (const key of Object.keys(gymLeadersData)) {
      const group = gymLeadersData[key];
      if (!Array.isArray(group)) continue;
      targetTrainer = group.find(t => {
        const cName = (t.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return cName === cleanSearchName;
      });
      if (targetTrainer) break;
    }
  }

  if (targetTrainer) {
    targetTrainer.expYield = {
      baselinePool: data.totalExpPool || (data.gainedExpPerPoke * (data.participantsCount || 2)),
      lastGainedExp: data.gainedExpPerPoke,
      lastCoinsWon: data.coinsWon || 0,
      lastParticipantsCount: data.participantsCount || 2,
      lastCalibratedAt: Date.now()
    };
    try {
      const gymPath = getWritableDataPath('gym_leaders.json');
      fs.writeFileSync(gymPath, JSON.stringify(gymLeadersData, null, 2), 'utf8');
      backendLog('EXP_CALIBRATOR', 'Calibrated ' + targetTrainer.name + ': ' + data.gainedExpPerPoke + ' EXP/pkmn (' + (data.participantsCount || 2) + ' pkmn, pool: ' + targetTrainer.expYield.baselinePool + ')');
    } catch (e) {
      backendLog('EXP_CALIBRATOR', 'Failed saving exp calibration: ' + e.message);
    }
  }

  if (Array.isArray(data.participatingPokemon) && data.participatingPokemon.length > 0 && typeof syncCollectionLevelsFromTelemetry === 'function') {
    syncCollectionLevelsFromTelemetry(data.participatingPokemon, lastRecommendedTeam);
  }
}

function predictTrainerExpGain(trainer, candidateCount = 2, candidateLevel = 50) {
  if (!trainer) return { predictedExp: 10000, isCalibrated: false, baselinePool: 20000 };
  const count = Math.max(1, candidateCount || 2);

  if (trainer.expYield && trainer.expYield.baselinePool) {
    const base = trainer.expYield.baselinePool;
    let lvlMultiplier = 1.0;
    if (candidateLevel <= 20) lvlMultiplier = 1.15;
    else if (candidateLevel <= 40) lvlMultiplier = 1.08;
    else if (candidateLevel >= 80) lvlMultiplier = 0.95;

    const predicted = Math.round((base / count) * lvlMultiplier);
    return {
      predictedExp: predicted,
      isCalibrated: true,
      baselinePool: base,
      lastGainedExp: trainer.expYield.lastGainedExp || predicted
    };
  }

  const oppCount = (trainer.roster && trainer.roster.length) || 6;
  const oppAvgLvl = trainer.avgLevel || 50;
  const estPool = Math.round(oppCount * oppAvgLvl * 60);
  const predicted = Math.round(estPool / count);
  return {
    predictedExp: predicted,
    isCalibrated: false,
    baselinePool: estPool
  };
}

function areAllTeamPokemonLevel100() {
  // Live participants from victory/battle screen (prioritized over stale sidebar recommendations)
  const battlingTeam = (activeAiBattleData && Array.isArray(activeAiBattleData.userTeam) && activeAiBattleData.userTeam.length > 0)
    ? activeAiBattleData.userTeam
    : [];
  const liveRoster = (Array.isArray(lastKnownUserTeam) && lastKnownUserTeam.length > battlingTeam.length)
    ? lastKnownUserTeam
    : (battlingTeam.length > 0 ? battlingTeam : null);
  const hasFreshSwappedRoster = Boolean(
    typeof teamSwappedAwaitingNewBattle !== 'undefined' &&
    teamSwappedAwaitingNewBattle &&
    Array.isArray(lastKnownUserTeam) &&
    lastKnownUserTeam.length > 0
  );
  const activeSourceRoster = hasFreshSwappedRoster ? lastKnownUserTeam : liveRoster;

  const matchName = (uEntryOrName, mem) => {
    if (typeof matchesTeamEntryName === 'function') {
      return matchesTeamEntryName(uEntryOrName, mem);
    }
    const rawName = (uEntryOrName && typeof uEntryOrName === 'object') ? uEntryOrName.name : uEntryOrName;
    if (!rawName || !mem || !mem.name) return false;
    const uLower = String(rawName).toLowerCase().trim();
    const mLower = String(mem.name).toLowerCase().trim();
    if (uLower === mLower) return true;
    const mVar = (mem.variant && mem.variant !== 'Normal') ? (String(mem.variant).toLowerCase().trim() + ' ') : '';
    return Boolean(mVar && uLower === mVar + mLower);
  };

  // Source of Truth: The active live battling party (all 6 Pokemon), merged with recommended team if liveRoster only captured active participants
  let fullRoster = (activeSourceRoster && activeSourceRoster.length > 0)
    ? activeSourceRoster.slice()
    : (Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.length > 0 ? lastRecommendedTeam.slice() : null);

  if (!fullRoster || fullRoster.length === 0) {
    return false;
  }

  if (fullRoster.length < 6 && Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.length > fullRoster.length) {
    const isSubsetOfRec = fullRoster.every(u => lastRecommendedTeam.some(r => matchName(u.name, r)));
    if (isSubsetOfRec) {
      lastRecommendedTeam.forEach(r => {
        if (!fullRoster.some(u => matchName(u.name, r))) {
          fullRoster.push(r);
        }
      });
    }
  }

  const liveParticipants = hasFreshSwappedRoster ? [] : battlingTeam;

  // The loop only finishes when EVERY single member of the team roster has a verified Level >= 100
  return fullRoster.every(mem => {
    let lvl = (mem && mem.levelKnown !== false && mem.level !== undefined && mem.level !== null) ? parseInt(mem.level, 10) : NaN;
    if (liveParticipants.length > 0 && mem && mem.name) {
      const found = liveParticipants.find(u => u && u.levelKnown !== false && matchName(u, mem));
      if (found && found.level) lvl = parseInt(found.level, 10);
    }
    if (isNaN(lvl) && Array.isArray(lastKnownUserTeam) && mem && mem.name) {
      const kMatch = lastKnownUserTeam.find(k => k && k.levelKnown !== false && matchName(k, mem));
      if (kMatch && kMatch.level !== undefined && kMatch.level !== null) lvl = parseInt(kMatch.level, 10);
    }
    if (isNaN(lvl) && Array.isArray(lastRecommendedTeam) && mem && mem.name) {
      const rMatch = lastRecommendedTeam.find(r => r && matchName(r, mem));
      if (rMatch && rMatch.level !== undefined && rMatch.level !== null) lvl = parseInt(rMatch.level, 10);
    }
    if (isNaN(lvl) && Array.isArray(currentCollection) && mem && mem.name) {
      const match = currentCollection.find(c => c && matchName(c, mem));
      if (match && match.level !== undefined && match.level !== null) lvl = parseInt(match.level, 10);
    }
    return !isNaN(lvl) && lvl >= 100;
  });
}

function isGMaxChallengeModeActive() {
  try {
    const liveUrl = (typeof delugeView !== 'undefined' && delugeView && typeof delugeView.getURL === 'function')
      ? String(delugeView.getURL() || '').toLowerCase()
      : '';
    const battleUrl = (typeof activeAiBattleData !== 'undefined' && activeAiBattleData && activeAiBattleData.battleUrl)
      ? String(activeAiBattleData.battleUrl).toLowerCase()
      : '';

    const classifyExplicitUrl = (u) => {
      if (!u) return null;
      if (u.includes('gmax') || u.includes('/challenge')) return true;
      if (u.includes('/battle/trainer') || u.includes('/battle/gym') || u.includes('/npc/')) return false;
      return null;
    };

    const liveClass = classifyExplicitUrl(liveUrl);
    if (liveClass !== null) return liveClass;

    const battleClass = classifyExplicitUrl(battleUrl);
    if (battleClass !== null) return battleClass;

    if (typeof activeAiBattleData !== 'undefined' && activeAiBattleData && (activeAiBattleData.isGmaxChallenge || activeAiBattleData.isChallengeLocked || activeAiBattleData.isGmaxChallengeComplete || (activeAiBattleData.trainerTitle && activeAiBattleData.trainerTitle.toLowerCase().includes('g-max challenge')))) return true;
    if (typeof teamRosterMode !== 'undefined' && teamRosterMode === 'TRAINING') return false;
    if (typeof teamCategorySelect !== 'undefined' && teamCategorySelect && (teamCategorySelect.value === 'GMAX_CHALLENGE' || teamCategorySelect.value === 'CHALLENGE')) return true;
    if (typeof teamTrainerSelect !== 'undefined' && teamTrainerSelect && (teamTrainerSelect.value || '').toLowerCase().includes('g-max challenge')) return true;
  } catch (_) {}
  return false;
}

function scheduleNextLoopBattle() {
  if (isPendingSessionAutoStop) {
    isPendingSessionAutoStop = false;
    stopHuntingWithReason(pendingSessionAutoStopReason || 'Session auto-stop triggered', pendingSessionAutoStopMsg || 'Paused (Session Auto-Stop Limit)', '#f59e0b');
    playAlarmSound();
    return;
  }
  userManuallyPaused = false;
  if (isWildHuntingOrCatchContext() || !isCurrentPageBattle()) {
    stopAllBattleAutomation('Loop aborted: Wild Catch / Map active');
    return;
  }
  if (battleLoopTimer) return;

  // Highest priority: Captcha & security challenges halt immediately
  if (isUnlockChallengeActive || isCaptchaAlarmActive) {
    isBattleLoopRunning = false;
    if (teamBattleLoopCheck) teamBattleLoopCheck.checked = false;
    updateLoopCheckboxVisual();
    return;
  }

  // Prerequisite: Loop can ONLY run if Auto is checked
  if (!teamBattleAutoCheck || !teamBattleAutoCheck.checked || !teamBattleLoopCheck || !teamBattleLoopCheck.checked) {
    isBattleLoopRunning = false;
    return;
  }

  // Check goal: All team Pokemon on current roster are Level 100 (Training Battles only)
  if (!isGMaxChallengeModeActive() && areAllTeamPokemonLevel100()) {
    if (typeof startContinuousTrainingRotation === 'function' && startContinuousTrainingRotation('BUILDING_TEAM')) {
      return;
    }
    isBattleLoopRunning = false;
    if (teamBattleLoopCheck) teamBattleLoopCheck.checked = false;
    updateLoopCheckboxVisual();
    if (teamActionStatus) {
      teamActionStatus.textContent = 'All team Pokemon reached Lv 100! Training complete.';
      teamActionStatus.style.color = '#10b981';
    }
    return;
  }

  // G-Max Challenge goal: Complete entire challenge
  if (isGMaxChallengeModeActive() && activeAiBattleData && activeAiBattleData.isGmaxChallengeComplete) {
    isBattleLoopRunning = false;
    if (teamBattleLoopCheck) teamBattleLoopCheck.checked = false;
    updateLoopCheckboxVisual();
    if (teamActionStatus) {
      teamActionStatus.textContent = 'G-Max Challenge successfully completed!';
      teamActionStatus.style.color = '#10b981';
    }
    return;
  }

  isBattleLoopRunning = true;
  // Human randomized micro-rest between matches (2400ms - 3600ms) to avoid bot detection and server flooding
  const microRestMs = 2400 + Math.floor(Math.random() * 1200);
  backendLog('LOOP_ENGINE', `Loop timer armed: ${microRestMs}ms until Next Battle click`);
  if (teamActionStatus) {
    teamActionStatus.textContent = 'Loop: Micro-rest (' + (microRestMs / 1000).toFixed(1) + 's) before next match...';
    teamActionStatus.style.color = '#388bfd';
  }

  battleLoopTimer = setTimeout(() => {
    battleLoopTimer = null;
    if (isUnlockChallengeActive || isCaptchaAlarmActive) {
      isBattleLoopRunning = false;
      return;
    }
    if (isWildHuntingOrCatchContext() || !isCurrentPageBattle()) {
      stopAllBattleAutomation('Loop aborted before rematch: Wild Catch / Map active');
      return;
    }
    if (!teamBattleAutoCheck || !teamBattleAutoCheck.checked || !teamBattleLoopCheck || !teamBattleLoopCheck.checked) {
      isBattleLoopRunning = false;
      return;
    }
    if (!isGMaxChallengeModeActive() && areAllTeamPokemonLevel100()) {
      if (typeof startContinuousTrainingRotation === 'function' && startContinuousTrainingRotation('BUILDING_TEAM')) {
        return;
      }
      isBattleLoopRunning = false;
      if (teamBattleLoopCheck) teamBattleLoopCheck.checked = false;
      updateLoopCheckboxVisual();
      if (teamActionStatus) {
        teamActionStatus.textContent = 'All team Pokemon reached Lv 100! Training complete.';
        teamActionStatus.style.color = '#10b981';
      }
      return;
    }

    if (isGMaxChallengeModeActive() && activeAiBattleData && activeAiBattleData.isGmaxChallengeComplete) {
      isBattleLoopRunning = false;
      if (teamBattleLoopCheck) teamBattleLoopCheck.checked = false;
      updateLoopCheckboxVisual();
      return;
    }

    // Arm auto battle for the incoming match
    isBattleAutoRunning = true;

    // Reset match-scoped participant/fainted counters and heal cached party for the incoming match
    healLastKnownUserTeamForNewMatch();

    if (teamActionStatus) {
      teamActionStatus.textContent = 'Loop: Entering next battle...';
      teamActionStatus.style.color = '#388bfd';
    }

    if (teamSwappedAwaitingNewBattle && !isGMaxChallengeModeActive() && battleOpponentBtn) {
      battleOpponentBtn.disabled = false;
      battleOpponentBtn.click();
      return;
    }

    // Attempt direct in-game rematch click on webview first (clicks "NORMAL BATTLE" or "NEXT BATTLE")
    const seqBeforeRematch = guestLoadEventSeq;
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('click-rematch-button');
    }

    // Graceful fallback watchdog: If webview is STILL idle on post-battle screen after 900ms, navigate directly
    if (battleLoopFallbackTimer) {
      clearTimeout(battleLoopFallbackTimer);
      battleLoopFallbackTimer = null;
    }
    battleLoopFallbackTimer = setTimeout(() => {
      battleLoopFallbackTimer = null;
      const curFallbackUrl = (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '';
      const isGuestNavigating = Boolean(
        (delugeView && typeof delugeView.isLoading === 'function' && delugeView.isLoading()) ||
        guestLoadEventSeq !== seqBeforeRematch
      );
      if (isUnlockChallengeActive || isCaptchaAlarmActive || isUnlockOrCaptchaUrl(curFallbackUrl) || isGuestNavigating || !teamBattleAutoCheck || !teamBattleAutoCheck.checked || !teamBattleLoopCheck || !teamBattleLoopCheck.checked) {
        return;
      }
      if (isWildHuntingOrCatchContext() || !isCurrentPageBattle()) {
        stopAllBattleAutomation('Loop fallback aborted: Wild Catch / Map active');
        return;
      }
      if (delugeView) {
        try {
          const cUrl = (delugeView.getURL && delugeView.getURL()) ? delugeView.getURL() : '';
          if (isUnlockOrCaptchaUrl(cUrl)) {
            return;
          }
          if (isWildHuntingOrCatchContext(cUrl) || !isCurrentPageBattle()) {
            stopAllBattleAutomation('Loop fallback aborted on non-battle URL');
            return;
          }
          const isStillPostBattle = Boolean(
            (activeAiBattleData && (activeAiBattleData.isVictoryScreen || activeAiBattleData.isPostBattleScreen || activeAiBattleData.isDefeatScreen || activeAiBattleData.hasNextBattleBtn)) ||
            (cUrl.indexOf('/battle') === -1 && cUrl.indexOf('/challenge') === -1) ||
            cUrl.indexOf('defeat') !== -1 ||
            cUrl.indexOf('result') !== -1
          );
          if (isStillPostBattle) {
            if (activeAiBattleData) {
              activeAiBattleData.isVictoryScreen = false;
              activeAiBattleData.isPostBattleScreen = false;
              activeAiBattleData.isDefeatScreen = false;
              activeAiBattleData.hasNextBattleBtn = false;
            }
            backendLog('LOOP_ENGINE', 'Post-battle screen still active; executing direct arena entry...');
            if (isGMaxChallengeModeActive()) {
              if (delugeView && typeof delugeView.send === 'function') {
                delugeView.send('click-rematch-button');
              }
            } else if (battleOpponentBtn) {
              battleOpponentBtn.click();
            }
          }
        } catch (_) {
          if (isGMaxChallengeModeActive()) {
            if (delugeView && typeof delugeView.send === 'function') {
              delugeView.send('click-rematch-button');
            }
          } else if (battleOpponentBtn) {
            battleOpponentBtn.click();
          }
        }
      } else if (battleOpponentBtn && !isGMaxChallengeModeActive()) {
        battleOpponentBtn.click();
      }
    }, 900);
  }, microRestMs);
}

function clearPendingTrainingRotation(reason = '', options = {}) {
  if (pendingTrainingRotation) {
    if (pendingTrainingRotation.timerId) {
      clearTimeout(pendingTrainingRotation.timerId);
      pendingTrainingRotation.timerId = null;
    }
    if (pendingTrainingRotation.watchdogId) {
      clearTimeout(pendingTrainingRotation.watchdogId);
      pendingTrainingRotation.watchdogId = null;
    }
    pendingTrainingRotation = null;
  }
  if (!options || !options.preserveResume) {
    postCaptchaResumeContext = null;
    if (postCaptchaResumeTimer) {
      clearTimeout(postCaptchaResumeTimer);
      postCaptchaResumeTimer = null;
    }
  }
}

function markCurrentTeamMaxedInCollection() {
  if (!Array.isArray(currentCollection) || currentCollection.length === 0) return false;
  const sourceLists = [
    Array.isArray(lastKnownUserTeam) ? lastKnownUserTeam : [],
    (activeAiBattleData && Array.isArray(activeAiBattleData.userTeam)) ? activeAiBattleData.userTeam : [],
    Array.isArray(lastRecommendedTeam) ? lastRecommendedTeam : []
  ];
  const maxedEntries = [];
  sourceLists.forEach(list => {
    list.forEach(mem => {
      if (!mem || !mem.name) return;
      maxedEntries.push(Object.assign({}, mem, { level: 100, levelKnown: true }));
    });
  });
  if (maxedEntries.length > 0 && typeof syncCollectionLevelsFromTelemetry === 'function') {
    syncCollectionLevelsFromTelemetry(maxedEntries, lastRecommendedTeam);
  }
  const poolKey = String(teamPoolFilter || 'ANY').toUpperCase();
  if (candidateListsCache && candidateListsCache.trainingCursorsByPool) {
    candidateListsCache.trainingCursorsByPool[poolKey] = 0;
    candidateListsCache.lastTrainingBuiltCtx = null;
  }
  if (typeof refreshCandidateListsCache === 'function') {
    refreshCandidateListsCache({ resetCursors: false });
  }
  if (typeof updateRosterModeUI === 'function') {
    updateRosterModeUI();
  }
  return true;
}

function getRemainingTraineesInActivePool() {
  if (!Array.isArray(currentCollection) || currentCollection.length === 0) return [];
  const filtered = (typeof getEffectiveFilteredPool === 'function')
    ? getEffectiveFilteredPool(currentCollection, teamPoolFilter)
    : currentCollection;
  return filtered.filter(p => p && (typeof p.level === 'number' ? p.level : 100) < 100);
}

function canBuildTrainingRoster() {
  if (teamBattleMode !== 'NPC' || teamRosterMode !== 'TRAINING' || isGMaxChallengeModeActive()) {
    return false;
  }
  if (!buildTeamBtn || !applyTeamBtn || !battleOpponentBtn) {
    return false;
  }
  const selVal = teamTrainerSelect ? teamTrainerSelect.value : '';
  if (!selVal) return false;
  if (selVal === 'LIVE__BATTLE') {
    return Boolean(liveBattleOpponent && Array.isArray(liveBattleOpponent.roster) && liveBattleOpponent.roster.length > 0);
  }
  return true;
}

function restoreLockedTrainerSelection(lockedVal) {
  if (!lockedVal || typeof teamTrainerSelect === 'undefined' || !teamTrainerSelect) return false;
  let hasOption = true;
  if (typeof teamTrainerSelect.querySelector === 'function') {
    hasOption = Boolean(teamTrainerSelect.querySelector('option[value="' + lockedVal + '"]'));
  } else if (teamTrainerSelect.options && typeof teamTrainerSelect.options.length === 'number') {
    hasOption = false;
    for (let i = 0; i < teamTrainerSelect.options.length; i++) {
      if (teamTrainerSelect.options[i] && teamTrainerSelect.options[i].value === lockedVal) {
        hasOption = true;
        break;
      }
    }
  }
  if (!hasOption) return false;
  if (teamTrainerSelect.value !== lockedVal) {
    if (typeof backendLog === 'function') {
      backendLog('LOOP_ENGINE', 'Restoring drifted trainer selection from ' + (teamTrainerSelect.value || 'empty') + ' back to ' + lockedVal);
    }
    teamTrainerSelect.value = lockedVal;
    if (typeof updateFavTrainerButton === 'function') {
      updateFavTrainerButton();
    }
  }
  return true;
}

function triggerRotationApplyTeamStep() {
  if (!pendingTrainingRotation) return false;
  pendingTrainingRotation.stage = 'APPLYING_TEAM';
  if (teamActionStatus) {
    teamActionStatus.textContent = 'Equipping next trainee roster...';
    teamActionStatus.style.color = '#388bfd';
  }
  const applyDelayMs = 750 + Math.floor(Math.random() * 450);
  pendingTrainingRotation.timerId = setTimeout(() => {
    if (!pendingTrainingRotation) return;
    pendingTrainingRotation.timerId = null;
    if (isUnlockChallengeActive || isCaptchaAlarmActive) {
      return;
    }
    if (userManuallyPaused || isPendingSessionAutoStop || !teamBattleAutoCheck || !teamBattleAutoCheck.checked || isWildHuntingOrCatchContext() || teamBattleMode !== 'NPC' || teamRosterMode !== 'TRAINING' || isGMaxChallengeModeActive()) {
      clearPendingTrainingRotation('Training rotation aborted before Change Team');
      return;
    }
    if (!applyTeamBtn || !Array.isArray(lastRecommendedTeam) || lastRecommendedTeam.length === 0) {
      clearPendingTrainingRotation('No built team to apply');
      isBattleLoopRunning = false;
      if (teamBattleLoopCheck) teamBattleLoopCheck.checked = false;
      updateLoopCheckboxVisual();
      return;
    }
    applyTeamBtn.disabled = false;
    applyTeamBtn.click();
    pendingTrainingRotation.watchdogId = setTimeout(() => {
      if (pendingTrainingRotation && pendingTrainingRotation.stage === 'APPLYING_TEAM') {
        clearPendingTrainingRotation('Team apply timed out', { preserveResume: false });
        isBattleLoopRunning = false;
        if (teamActionStatus) {
          teamActionStatus.textContent = 'Team save timed out - paused rotation.';
          teamActionStatus.style.color = '#f59e0b';
        }
      }
    }, 14000);
  }, applyDelayMs);
  return true;
}

function startContinuousTrainingRotation(initialStage = 'BUILDING_TEAM') {
  if (pendingTrainingRotation) return true;
  if (isUnlockChallengeActive || isCaptchaAlarmActive || isPendingSessionAutoStop || userManuallyPaused || !teamBattleAutoCheck || !teamBattleAutoCheck.checked || !canBuildTrainingRoster()) {
    return false;
  }
  if (battleLoopTimer) {
    clearTimeout(battleLoopTimer);
    battleLoopTimer = null;
  }
  if (battleLoopFallbackTimer) {
    clearTimeout(battleLoopFallbackTimer);
    battleLoopFallbackTimer = null;
  }
  isBattleLoopRunning = true;

  const lockedTrainerVal = (typeof teamTrainerSelect !== 'undefined' && teamTrainerSelect && teamTrainerSelect.value)
    ? teamTrainerSelect.value
    : ((typeof config !== 'undefined' && config && config.settings && config.settings.lastSelectedTrainer)
      ? config.settings.lastSelectedTrainer
      : '');
  if (typeof backendLog === 'function') {
    backendLog('LOOP_ENGINE', 'Continuous training rotation locked to trainer: ' + (lockedTrainerVal || 'none'));
  }

  const poolKey = String(teamPoolFilter || 'ANY').toUpperCase();
  if (initialStage === 'APPLYING_TEAM') {
    if (!Array.isArray(lastRecommendedTeam) || lastRecommendedTeam.length === 0 || !lastRecommendedTeam.some(p => p && (typeof p.level === 'number' ? p.level : 100) < 100)) {
      isBattleLoopRunning = false;
      return false;
    }
    pendingTrainingRotation = {
      stage: 'APPLYING_TEAM',
      timerId: null,
      watchdogId: null,
      startedAt: Date.now(),
      poolKey: poolKey,
      lockedTrainerVal: lockedTrainerVal,
      retryCount: 0
    };
    return triggerRotationApplyTeamStep();
  }

  markCurrentTeamMaxedInCollection();
  const remaining = getRemainingTraineesInActivePool();
  if (remaining.length === 0) {
    isBattleLoopRunning = false;
    return false;
  }

  pendingTrainingRotation = {
    stage: 'BUILDING_TEAM',
    timerId: null,
    watchdogId: null,
    startedAt: Date.now(),
    poolKey: poolKey,
    lockedTrainerVal: lockedTrainerVal,
    retryCount: 0
  };
  if (teamActionStatus) {
    teamActionStatus.textContent = 'Batch maxed! Building next trainee roster (' + remaining.length + ' left)...';
    teamActionStatus.style.color = '#388bfd';
  }
  const buildDelayMs = 900 + Math.floor(Math.random() * 500);
  pendingTrainingRotation.timerId = setTimeout(() => {
    if (!pendingTrainingRotation) return;
    pendingTrainingRotation.timerId = null;
    if (isUnlockChallengeActive || isCaptchaAlarmActive) {
      return;
    }
    if (userManuallyPaused || isPendingSessionAutoStop || !teamBattleAutoCheck || !teamBattleAutoCheck.checked || isWildHuntingOrCatchContext() || teamBattleMode !== 'NPC' || teamRosterMode !== 'TRAINING' || isGMaxChallengeModeActive()) {
      clearPendingTrainingRotation('Training rotation aborted before Build Best Team');
      return;
    }
    restoreLockedTrainerSelection(pendingTrainingRotation.lockedTrainerVal);
    buildTeamBtn.disabled = false;
    buildTeamBtn.click();
    const hasBuildableTrainees = Array.isArray(lastRecommendedTeam) &&
      lastRecommendedTeam.length > 0 &&
      lastRecommendedTeam.some(p => p && (typeof p.level === 'number' ? p.level : 100) < 100);
    if (!hasBuildableTrainees) {
      clearPendingTrainingRotation('No buildable trainees remaining');
      isBattleLoopRunning = false;
      if (teamBattleLoopCheck) teamBattleLoopCheck.checked = false;
      updateLoopCheckboxVisual();
      if (teamActionStatus) {
        teamActionStatus.textContent = 'All buildable trainees reached Lv 100! Training complete.';
        teamActionStatus.style.color = '#10b981';
      }
      return;
    }
    triggerRotationApplyTeamStep();
  }, buildDelayMs);
  return true;
}

function capturePostCaptchaTrainingContext() {
  if (postCaptchaResumeContext) return;
  const activeRotation = pendingTrainingRotation;
  const isTrainingNpc = Boolean(
    typeof teamBattleMode !== 'undefined' && teamBattleMode === 'NPC' &&
    typeof teamRosterMode !== 'undefined' && teamRosterMode === 'TRAINING' &&
    typeof isGMaxChallengeModeActive === 'function' && !isGMaxChallengeModeActive()
  );
  if (!activeRotation && !isTrainingNpc) return;
  const autoOn = Boolean(teamBattleAutoCheck && teamBattleAutoCheck.checked);
  const loopOn = Boolean(teamBattleLoopCheck && teamBattleLoopCheck.checked);
  if (!activeRotation && (!autoOn || !loopOn)) return;
  postCaptchaResumeContext = {
    needsBuildTeam: Boolean(activeRotation && activeRotation.stage === 'BUILDING_TEAM'),
    needsApplyTeam: Boolean((activeRotation && activeRotation.stage === 'APPLYING_TEAM') || isApplyingTeamOnDeluge),
    needsBattleNow: Boolean(activeRotation || (autoOn && loopOn)),
    wasTrainingRotation: Boolean(activeRotation),
    lockedTrainerVal: (activeRotation && activeRotation.lockedTrainerVal) ||
      ((typeof teamTrainerSelect !== 'undefined' && teamTrainerSelect && teamTrainerSelect.value) ? teamTrainerSelect.value : '') ||
      ((typeof config !== 'undefined' && config && config.settings && config.settings.lastSelectedTrainer) ? config.settings.lastSelectedTrainer : ''),
    capturedAt: Date.now()
  };
}

function schedulePostCaptchaTrainingResume() {
  if (!postCaptchaResumeContext) return;
  const ctx = postCaptchaResumeContext;
  postCaptchaResumeContext = null;
  if (postCaptchaResumeTimer) {
    clearTimeout(postCaptchaResumeTimer);
    postCaptchaResumeTimer = null;
  }
  postCaptchaResumeTimer = setTimeout(() => {
    postCaptchaResumeTimer = null;
    if (isUnlockChallengeActive || isCaptchaAlarmActive || isPendingSessionAutoStop || userManuallyPaused) {
      return;
    }
    if (isRunning || isAutoCatchCountdownActive || isEncounterOnScreen || targetEncounterActive) {
      return;
    }
    const curUrl = (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '';
    const lowerUrl = String(curUrl).toLowerCase();
    if (!curUrl || isUnlockOrCaptchaUrl(curUrl) || lowerUrl.includes('/login') || lowerUrl.includes('/catch') || lowerUrl.includes('/battle/wild')) {
      return;
    }
    if (teamBattleMode !== 'NPC' || teamRosterMode !== 'TRAINING' || isGMaxChallengeModeActive() || !teamBattleAutoCheck || !teamBattleAutoCheck.checked) {
      return;
    }
    if (typeof restoreLockedTrainerSelection === 'function') {
      restoreLockedTrainerSelection(ctx.lockedTrainerVal);
    }
    if (ctx.needsBuildTeam) {
      startContinuousTrainingRotation('BUILDING_TEAM');
      return;
    }
    if (ctx.needsApplyTeam && Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.length > 0 && lastRecommendedTeam.some(p => p && (typeof p.level === 'number' ? p.level : 100) < 100)) {
      startContinuousTrainingRotation('APPLYING_TEAM');
      return;
    }
    if (ctx.needsBattleNow) {
      if (areAllTeamPokemonLevel100()) {
        if (ctx.wasTrainingRotation) {
          startContinuousTrainingRotation('BUILDING_TEAM');
        }
        return;
      }
      if (teamBattleLoopCheck) {
        teamBattleLoopCheck.disabled = false;
        teamBattleLoopCheck.checked = true;
        updateLoopCheckboxVisual();
      }
      const isMidActiveBattle = Boolean(
        isCurrentPageBattle() &&
        activeAiBattleData &&
        !activeAiBattleData.isVictoryScreen &&
        !activeAiBattleData.isDefeatScreen &&
        !activeAiBattleData.isPostBattleScreen &&
        !activeAiBattleData.hasNextBattleBtn
      );
      if (isMidActiveBattle) {
        isBattleAutoRunning = true;
        if (delugeView && typeof delugeView.send === 'function') {
          delugeView.send('check-battle-opponents');
        }
      } else if (battleOpponentBtn) {
        if (teamActionStatus) {
          teamActionStatus.textContent = 'Captcha cleared! Resuming Battle Now...';
          teamActionStatus.style.color = '#10b981';
        }
        battleOpponentBtn.disabled = false;
        battleOpponentBtn.click();
      }
    }
  }, 1250);
}

if (teamBattleAutoCheck) {
  teamBattleAutoCheck.addEventListener('change', () => {
    if (teamBattleAutoCheck.checked) {
      if (isWildHuntingOrCatchContext() || !isCurrentPageBattle()) {
        isBattleAutoRunning = false;
        if (teamBattleAutoLabel) {
          teamBattleAutoLabel.style.borderColor = '#388bfd';
          teamBattleAutoLabel.style.color = '#58a6ff';
        }
        updateLoopCheckboxVisual();
        return;
      }
      userManuallyPaused = false;
      isBattleAutoRunning = true;
      if (teamBattleAutoLabel) {
        teamBattleAutoLabel.style.borderColor = '#388bfd';
        teamBattleAutoLabel.style.color = '#58a6ff';
      }
      updateLoopCheckboxVisual();
      if (teamActionStatus) {
        teamActionStatus.textContent = 'Auto mode active';
        teamActionStatus.style.color = '#388bfd';
      }
      if (activeAiBattleData) {
        updateTeamBuilderBattleAction(activeAiBattleData);
      }
    } else {
      if (typeof clearPendingTrainingRotation === 'function') {
        clearPendingTrainingRotation('Auto mode unchecked');
      }
      stopAllBattleAutomation('Auto mode unchecked');
      if (teamBattleAutoLabel) {
        teamBattleAutoLabel.style.borderColor = '#1a283e';
        teamBattleAutoLabel.style.color = '#8eaad0';
      }
      if (teamBattleLoopCheck) {
        teamBattleLoopCheck.checked = false;
      }
      updateLoopCheckboxVisual();
      if (teamActionStatus) {
        teamActionStatus.textContent = 'Auto mode disengaged';
        teamActionStatus.style.color = '#8eaad0';
        setTimeout(() => {
          if (teamActionStatus && teamActionStatus.textContent === 'Auto mode disengaged') {
            teamActionStatus.textContent = '';
          }
        }, 2000);
      }
    }
  });
}

if (teamBattleLoopCheck) {
  teamBattleLoopCheck.addEventListener('change', () => {
    // Strict rule: Loop can ONLY be enabled if Auto is checked
    if (!teamBattleAutoCheck || !teamBattleAutoCheck.checked) {
      teamBattleLoopCheck.checked = false;
      updateLoopCheckboxVisual();
      return;
    }

    if (teamBattleLoopCheck.checked) {
      if (isWildHuntingOrCatchContext() || !isCurrentPageBattle()) {
        updateLoopCheckboxVisual();
        return;
      }
      userManuallyPaused = false;
      if (!isGMaxChallengeModeActive() && areAllTeamPokemonLevel100()) {
        teamBattleLoopCheck.checked = false;
        updateLoopCheckboxVisual();
        if (teamActionStatus) {
          teamActionStatus.textContent = 'All battling Pokemon reached Lv 100! Training complete.';
          teamActionStatus.style.color = '#10b981';
        }
        return;
      }
      updateLoopCheckboxVisual();
      if (teamActionStatus) {
        teamActionStatus.textContent = isGMaxChallengeModeActive()
          ? 'Loop mode armed (battles until challenge complete)'
          : 'Loop mode armed (battles until all team is Lv 100)';
        teamActionStatus.style.color = '#388bfd';
        setTimeout(() => {
          if (teamActionStatus && (teamActionStatus.textContent.indexOf('Loop mode armed') !== -1)) {
            teamActionStatus.textContent = '';
          }
        }, 3000);
      }
      // If currently on a completed battle screen, start loop micro-rest
      if (activeAiBattleData && (activeAiBattleData.isVictoryScreen || activeAiBattleData.isDefeatScreen || activeAiBattleData.isPostBattleScreen || activeAiBattleData.hasNextBattleBtn)) {
        scheduleNextLoopBattle();
      }
    } else {
      if (typeof clearPendingTrainingRotation === 'function') {
        clearPendingTrainingRotation('Loop mode unchecked');
      }
      if (battleLoopTimer) {
        clearTimeout(battleLoopTimer);
        battleLoopTimer = null;
      }
      if (battleLoopFallbackTimer) {
        clearTimeout(battleLoopFallbackTimer);
        battleLoopFallbackTimer = null;
      }
      isBattleLoopRunning = false;
      updateLoopCheckboxVisual();
      if (teamActionStatus) {
        teamActionStatus.textContent = 'Loop mode disengaged';
        teamActionStatus.style.color = '#8eaad0';
        setTimeout(() => {
          if (teamActionStatus && teamActionStatus.textContent === 'Loop mode disengaged') {
            teamActionStatus.textContent = '';
          }
        }, 2000);
      }
    }
  });
}

function setAutoAndLoopDefaultChecked() {
  if (!teamBattleAutoCheck || !teamBattleLoopCheck) return;
  teamBattleAutoCheck.checked = true;
  if (teamBattleAutoLabel) {
    teamBattleAutoLabel.style.borderColor = '#388bfd';
    teamBattleAutoLabel.style.color = '#58a6ff';
  }
  teamBattleLoopCheck.disabled = false;
  teamBattleLoopCheck.checked = true;
  updateLoopCheckboxVisual();
}

setAutoAndLoopDefaultChecked();

if (teamTrainerSelect) {
  teamTrainerSelect.addEventListener('change', () => {
    if (typeof clearPendingTrainingRotation === 'function') {
      clearPendingTrainingRotation('Trainer changed');
    }
    lastSelectedBattleUrl = null;
    const selVal = teamTrainerSelect.value;
    if (!config.settings) config.settings = {};
    config.settings.lastSelectedTrainer = selVal;
    saveLocalConfig();
    if (selVal && selVal !== 'LIVE__BATTLE' && gymLeadersData) {
      const parts = selVal.split('__');
      const group = gymLeadersData[parts[0]] || [];
      const leader = /^\d+$/.test(parts[1]) ? group[parseInt(parts[1], 10)] : group.find(l => l.name === parts[1]);
      if (leader) {
        if (leader.battleUrl) lastSelectedBattleUrl = leader.battleUrl;
        else if (leader.npcId) lastSelectedBattleUrl = '/battle/trainer/' + leader.npcId;
      }
    }
    updateFavTrainerButton();
  });
}

// --- TODAY'S AUTO-CATCH & MASTER BALL PERSISTENCE ---
const DAILY_CATCH_STORAGE_KEY = 'deluge_daily_catch_log';
let isBallInventorySynced = false;
let activeAccountUsername = '';
let pendingManualInventorySync = false;

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let dailyCatchData = {
  date: getTodayDateKey(),
  username: '',
  caught: [],
  masterBallStock: null,
  masterBallUsedToday: 0,
  bagInventory: {
    pokeBall: null,
    greatBall: null,
    ultraBall: null,
    masterBall: null,
    rawSummary: ''
  }
};

function checkAndHandleAccountSwitch(detectedUsername) {
  const cleanUser = (detectedUsername || '').trim();
  if (!cleanUser) return false;
  const prevUser = (activeAccountUsername || dailyCatchData.username || '').trim();
  if (prevUser && prevUser.toLowerCase() !== cleanUser.toLowerCase()) {
    backendLog('AccountSwitch', `Account switch detected (${prevUser} -> ${cleanUser}). Resetting cached ball stock and triggering mandatory inventory sync.`);
    activeAccountUsername = cleanUser;
    dailyCatchData.username = cleanUser;
    dailyCatchData.masterBallStock = null;
    dailyCatchData.bagInventory = {
      pokeBall: null,
      greatBall: null,
      ultraBall: null,
      masterBall: null,
      rawSummary: ''
    };
    isBallInventorySynced = false;
    outOfStockPaused = false;
    saveDailyCatchLog();
    updateCatchLogBadge();
    renderCatchLogUI();
    try {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('request-ball-inventory');
      }
    } catch (_) {}
    return true;
  }
  activeAccountUsername = cleanUser;
  if (dailyCatchData.username !== cleanUser) {
    dailyCatchData.username = cleanUser;
    saveDailyCatchLog();
  }
  return false;
}

function ensureTodayCatchLog() {
  const todayKey = getTodayDateKey();
  if (dailyCatchData.date !== todayKey) {
    dailyCatchData.date = todayKey;
    dailyCatchData.caught = [];
    dailyCatchData.masterBallUsedToday = 0;
    saveDailyCatchLog();
  }
}

function loadDailyCatchLog() {
  const todayKey = getTodayDateKey();
  let loaded = null;

  try {
    const raw = readDataFile('daily_catch_log.json');
    if (raw) loaded = JSON.parse(raw);
  } catch (_) {}

  if (!loaded) {
    try {
      const raw = localStorage.getItem(DAILY_CATCH_STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (_) {}
  }

  if (loaded && typeof loaded === 'object') {
    dailyCatchData.username = typeof loaded.username === 'string' ? loaded.username : '';
    if (dailyCatchData.username) {
      activeAccountUsername = dailyCatchData.username;
    }
    if (loaded.date === todayKey) {
      dailyCatchData.date = todayKey;
      dailyCatchData.caught = Array.isArray(loaded.caught) ? loaded.caught : [];
      let needsResave = false;
      dailyCatchData.caught.forEach(p => {
        if (p.name) {
          const clean = formatCleanPokemonName(p.name);
          if (clean && clean !== p.name) {
            p.name = clean;
            needsResave = true;
          }
        }
        const newKind = getCaughtPokemonKind(p);
        if (p.kind !== newKind) {
          p.kind = newKind;
          needsResave = true;
        }
        if (p.kind === 'Starter') {
          if (p.category !== 'Starter') {
            p.category = 'Starter';
            needsResave = true;
          }
          if (p.fullName && p.fullName.includes('Mega Line:')) {
            p.fullName = p.fullName.replace(/Mega Line:\s*/i, 'Starter: ');
            needsResave = true;
          }
        } else if (p.kind === 'Rare Line') {
          if (p.category !== 'Rare Line') {
            p.category = 'Rare Line';
            needsResave = true;
          }
          if (p.fullName && p.fullName.includes('Mega Line:')) {
            p.fullName = p.fullName.replace(/Mega Line:\s*/i, 'Rare Line: ');
            needsResave = true;
          }
        }
      });
      if (needsResave) {
        saveDailyCatchLog();
      }
      dailyCatchData.masterBallStock = (typeof loaded.masterBallStock === 'number') ? loaded.masterBallStock : null;
      dailyCatchData.masterBallUsedToday = (typeof loaded.masterBallUsedToday === 'number') ? loaded.masterBallUsedToday : 0;
      if (loaded.bagInventory && typeof loaded.bagInventory === 'object') {
        dailyCatchData.bagInventory = loaded.bagInventory;
      }
    } else {
      // Midnight rollover: new calendar day
      dailyCatchData.date = todayKey;
      dailyCatchData.caught = [];
      dailyCatchData.masterBallUsedToday = 0;
      dailyCatchData.masterBallStock = (typeof loaded.masterBallStock === 'number') ? loaded.masterBallStock : null;
      if (loaded.bagInventory && typeof loaded.bagInventory === 'object') {
        dailyCatchData.bagInventory = loaded.bagInventory;
      }
    }
  }

  saveDailyCatchLog();
  updateCatchLogBadge();
  renderCatchLogUI();
}

function saveDailyCatchLog() {
  try {
    const jsonStr = JSON.stringify(dailyCatchData, null, 2);
    localStorage.setItem(DAILY_CATCH_STORAGE_KEY, jsonStr);
    const filePath = getWritableDataPath('daily_catch_log.json');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tempPath = filePath + '.tmp';
    const bakPath = filePath + '.bak';
    fs.writeFileSync(tempPath, jsonStr, 'utf8');
    if (fs.existsSync(filePath)) {
      try { fs.copyFileSync(filePath, bakPath); } catch (_) {}
    }
    fs.renameSync(tempPath, filePath);
  } catch (_) {}
}

function updateCatchLogBadge() {
  ensureTodayCatchLog();
  const count = dailyCatchData.caught ? dailyCatchData.caught.length : 0;
  if (caughtSummaryText) {
    caughtSummaryText.textContent = `Today: ${count}`;
  }
  if (mbSummaryText) {
    mbSummaryText.textContent = `MB: ${dailyCatchData.masterBallStock !== null ? dailyCatchData.masterBallStock : '--'}`;
    mbSummaryText.style.color = (dailyCatchData.masterBallStock === 0) ? '#ef4444' : '#d29922';
  }
  if (navCaughtCountBadge) {
    navCaughtCountBadge.textContent = `${count} Caught`;
  }
  if (dailyCaughtBtn) {
    dailyCaughtBtn.title = `Today's Auto-Catch: ${count} caught | Master Ball Stock: ${dailyCatchData.masterBallStock !== null ? dailyCatchData.masterBallStock : 'Unknown'}. Click to view details.`;
  }
}

const CATCH_MYTHICAL_SPECIES = [
  'mew', 'celebi', 'jirachi', 'deoxys', 'phione', 'manaphy', 'darkrai', 'shaymin', 'arceus',
  'victini', 'keldeo', 'meloetta', 'genesect', 'diancie', 'hoopa', 'volcanion', 'magearna',
  'marshadow', 'zeraora', 'meltan', 'melmetal', 'zarude', 'pecharunt'
];

const CATCH_ULTRA_BEASTS = [
  'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela', 'kartana',
  'guzzlord', 'poipole', 'naganadel', 'stakataka', 'blacephalon'
];

const CATCH_PARADOX_SPECIES = [
  'great tusk', 'scream tail', 'brute bonnet', 'flutter mane', 'slither wing', 'sandy shocks',
  'iron treads', 'iron bundle', 'iron hands', 'iron jugulis', 'iron moth', 'iron thorns',
  'roaring moon', 'iron valiant', 'walking wake', 'iron leaves',
  'gouging fire', 'raging bolt', 'iron boulder', 'iron crown'
];

const CATCH_LEGENDARY_SPECIES = [
  'articuno', 'zapdos', 'moltres', 'mewtwo', 'raikou', 'entei', 'suicune', 'lugia', 'ho-oh',
  'regirock', 'regice', 'registeel', 'latias', 'latios', 'kyogre', 'groudon', 'rayquaza',
  'uxie', 'mesprit', 'azelf', 'dialga', 'palkia', 'heatran', 'regigigas', 'giratina', 'cresselia',
  'cobalion', 'terrakion', 'virizion', 'tornadus', 'thundurus', 'reshiram', 'zekrom',
  'landorus', 'kyurem', 'xerneas', 'yveltal', 'zygarde', 'type: null', 'type null', 'silvally',
  'tapu koko', 'tapu lele', 'tapu bulu', 'tapu fini', 'cosmog', 'cosmoem', 'solgaleo', 'lunala',
  'necrozma', 'zacian', 'zamazenta', 'eternatus', 'kubfu', 'urshifu', 'regieleki', 'regidrago',
  'glastrier', 'spectrier', 'calyrex', 'enamorus', 'wo-chien', 'chien-pao', 'ting-lu', 'chi-yu',
  'koraidon', 'miraidon', 'okidogi', 'munkidori', 'fezandipiti', 'ogerpon', 'terapagos'
];

const CATCH_DIRECT_MEGA_SPECIES = [
  'venusaur', 'charizard', 'blastoise', 'beedrill', 'pidgeot', 'alakazam', 'slowbro',
  'gengar', 'kangaskhan', 'pinsir', 'gyarados', 'aerodactyl', 'mewtwo', 'ampharos',
  'steelix', 'scizor', 'heracross', 'houndoom', 'tyranitar', 'sceptile', 'blaziken',
  'swampert', 'gardevoir', 'gallade', 'sableye', 'mawile', 'aggron', 'medicham',
  'manectric', 'sharpedo', 'camerupt', 'altaria', 'banette', 'absol', 'glalie',
  'salamence', 'metagross', 'latias', 'latios', 'rayquaza', 'lopunny', 'garchomp',
  'lucario', 'abomasnow', 'diancie', 'audino', 'kyogre', 'groudon'
];

const CATCH_GMAX_MEGA_STARTER_FAMILIES = [
  'bulbasaur', 'ivysaur', 'venusaur',
  'charmander', 'charmeleon', 'charizard',
  'squirtle', 'wartortle', 'blastoise'
];

const CATCH_MEGA_STARTER_FAMILIES = [
  'treecko', 'grovyle', 'sceptile',
  'torchic', 'combusken', 'blaziken',
  'mudkip', 'marshtomp', 'swampert'
];

const CATCH_GMAX_STARTER_FAMILIES = [
  'grookey', 'thwackey', 'rillaboom',
  'scorbunny', 'raboot', 'cinderace',
  'sobble', 'drizzile', 'inteleon'
];

const CATCH_MEGA_GMAX_FAMILIES = [
  'gastly', 'haunter', 'gengar'
];

const CATCH_STARTER_FAMILIES = [
  'bulbasaur', 'ivysaur', 'venusaur',
  'charmander', 'charmeleon', 'charizard',
  'squirtle', 'wartortle', 'blastoise',
  'chikorita', 'bayleef', 'meganium',
  'cyndaquil', 'quilava', 'typhlosion',
  'totodile', 'croconaw', 'feraligatr',
  'treecko', 'grovyle', 'sceptile',
  'torchic', 'combusken', 'blaziken',
  'mudkip', 'marshtomp', 'swampert',
  'turtwig', 'grotle', 'torterra',
  'chimchar', 'monferno', 'infernape',
  'piplup', 'prinplup', 'empoleon',
  'snivy', 'servine', 'serperior',
  'tepig', 'pignite', 'emboar',
  'oshawott', 'dewott', 'samurott',
  'chespin', 'quilladin', 'chesnaught',
  'fennekin', 'braixen', 'delphox',
  'froakie', 'frogadier', 'greninja',
  'rowlet', 'dartrix', 'decidueye',
  'litten', 'torracat', 'incineroar',
  'popplio', 'brionne', 'primarina',
  'grookey', 'thwackey', 'rillaboom',
  'scorbunny', 'raboot', 'cinderace',
  'sobble', 'drizzile', 'inteleon',
  'sprigatito', 'floragato', 'meowscarada',
  'fuecoco', 'crocalor', 'skeledirge',
  'quaxly', 'quaxwell', 'quaquaval'
];

const CATCH_GMAX_SPECIES = [
  'bulbasaur', 'ivysaur', 'venusaur',
  'charmander', 'charmeleon', 'charizard',
  'squirtle', 'wartortle', 'blastoise',
  'caterpie', 'metapod', 'butterfree',
  'pichu', 'pikachu',
  'meowth',
  'machop', 'machoke', 'machamp',
  'gastly', 'haunter', 'gengar',
  'krabby', 'kingler',
  'lapras',
  'eevee',
  'munchlax', 'snorlax',
  'trubbish', 'garbodor',
  'meltan', 'melmetal',
  'grookey', 'thwackey', 'rillaboom',
  'scorbunny', 'raboot', 'cinderace',
  'sobble', 'drizzile', 'inteleon',
  'rookidee', 'corvisquire', 'corviknight',
  'blipbug', 'dottler', 'orbeetle',
  'chewtle', 'drednaw',
  'rolycoly', 'carkol', 'coalossal',
  'applin', 'flapple', 'appletun',
  'silicobra', 'sandaconda',
  'toxel', 'toxtricity',
  'sizzlipede', 'centiskorch',
  'hatenna', 'hattrem', 'hatterene',
  'impidimp', 'morgrem', 'grimmsnarl',
  'milcery', 'alcremie',
  'cufant', 'copperajah',
  'duraludon',
  'kubfu', 'urshifu'
];

const CATCH_MEGA_EVOLUTION_FAMILIES = [
  'bulbasaur', 'ivysaur', 'venusaur',
  'charmander', 'charmeleon', 'charizard',
  'squirtle', 'wartortle', 'blastoise',
  'weedle', 'kakuna', 'beedrill',
  'pidgey', 'pidgeotto', 'pidgeot',
  'abra', 'kadabra', 'alakazam',
  'slowpoke', 'slowbro',
  'gastly', 'haunter', 'gengar',
  'kangaskhan',
  'pinsir',
  'magikarp', 'gyarados',
  'aerodactyl',
  'mareep', 'flaaffy', 'ampharos',
  'onix', 'steelix',
  'scyther', 'scizor',
  'heracross',
  'houndour', 'houndoom',
  'treecko', 'grovyle', 'sceptile',
  'torchic', 'combusken', 'blaziken',
  'mudkip', 'marshtomp', 'swampert',
  'ralts', 'kirlia', 'gardevoir', 'gallade',
  'sableye',
  'mawile',
  'aron', 'lairon', 'aggron',
  'meditite', 'medicham',
  'electrike', 'manectric',
  'carvanha', 'sharpedo',
  'numel', 'camerupt',
  'swablu', 'altaria',
  'shuppet', 'banette',
  'absol',
  'snorunt', 'glalie',
  'buneary', 'lopunny',
  'riolu', 'lucario',
  'snover', 'abomasnow',
  'audino'
];

const CATCH_PSEUDO_LEGENDARIES = [
  'dratini', 'dragonair', 'dragonite',
  'larvitar', 'pupitar', 'tyranitar',
  'bagon', 'shelgon', 'salamence',
  'beldum', 'metang', 'metagross',
  'gible', 'gabite', 'garchomp',
  'deino', 'zweilous', 'hydreigon',
  'goomy', 'sliggoo', 'goodra',
  'jangmo-o', 'hakamo-o', 'kommo-o',
  'dreepy', 'drakloak', 'dragapult',
  'frigibax', 'arctibax', 'baxcalibur'
];

function formatCleanPokemonName(rawName, keepLevel = false) {
  if (!rawName || typeof rawName !== 'string') return '';
  let str = rawName.trim();
  if (!keepLevel) {
    str = str.replace(/\s*\(Lv[.:\s]*\d+[^)]*\)\s*/gi, ' ').trim();
  }
  const tagRegex = /\b(?:G-Max\/Mega\/Starter|Mega\/Starter|G-Max\/Starter|Mega\/G-Max|Mega Line|G-Max Line|Rare Line|Special Form|Special Variant|Mega Evolution|Mega|G-Max|Gigantamax|Starter|Ultra Beast|Paradox Pokemon|Paradox|Legendary|Rare\/Legendary|Pseudo-Legendary|Pseudo|Dex Missing|Missing Dex|New Dex|New Variant|Dex Completionist|Custom Target|Type Match(?:\s*\([^)]*\))?|Elemental Type Match|Wild Encounter):\s*/gi;
  for (let iter = 0; iter < 3; iter++) {
    str = str.replace(tagRegex, '');
  }
  if (str !== 'Wild Encounter') {
    str = str.replace(/^\bWild Encounter\b\s*/i, '');
  }
  return str.replace(/\s+/g, ' ').trim();
}

function getCaughtPokemonKind(p) {
  const name = typeof p === 'string' ? p : ((p && (p.name || p.fullName)) || '');
  const cat = (p && p.category) ? String(p.category).toLowerCase() : '';
  const lower = name.toLowerCase();

  let base = name;
  for (let iter = 0; iter < 3; iter++) {
    base = base
      .replace(/^(Dark|Shiny|Shadow|Ghostly|Ghost|Metallic|Mirage|Negative|Chrome|Retro)\s+/i, '')
      .replace(/^(G-Max\/Mega\/Starter|Mega\/Starter|G-Max\/Starter|Mega\/G-Max|Mega Line|Rare Line|Starter|G-Max Line|Special Form|Mega Evolution):\s+/i, '')
      .replace(/^(Mega|Primal|G-Max|Gigantamax)\s+/i, '')
      .replace(/^(Alolan|Galarian|Hisuian|Paldean)\s+/i, '')
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/-(Wash|Heat|Frost|Fan|Mow|Origin|Therian|Incarnate|Altered|Dusk-Mane|Dawn-Wings|Rapid-Strike|Single-Strike|Paldea|Hisui|Galar|Alola|Sky|Attack|Defense|Speed)$/i, '')
      .replace(/\s+[XYZ]$/i, '')
      .trim();
  }
  base = base.toLowerCase();

  const isExplicitGMax = lower.includes('g-max') || lower.includes('gigantamax');
  const isExplicitMega = lower.includes('mega ') || lower.includes('primal ');

  // 1. Legendary / Mythical / Ultra Beast / Paradox priority
  if (cat.includes('ultra beast') || cat.includes('ultrabeast') || CATCH_ULTRA_BEASTS.includes(base)) {
    return 'Ultra Beast';
  }
  if (cat.includes('paradox') || CATCH_PARADOX_SPECIES.includes(base) || lower.startsWith('iron ') || base.startsWith('iron ')) {
    return 'Paradox';
  }
  if (CATCH_MYTHICAL_SPECIES.includes(base)) {
    return 'Mythical';
  }
  if (cat.includes('legendary') || CATCH_LEGENDARY_SPECIES.includes(base)) {
    return 'Legendary';
  }
  if (cat.includes('pseudo') || CATCH_PSEUDO_LEGENDARIES.includes(base)) {
    if (isExplicitMega) return 'Mega';
    return 'Pseudo-Legendary';
  }

  // 2. Triple Overlap: G-Max / Mega / Starter (Bulbasaur, Charmander, Squirtle lines)
  if (CATCH_GMAX_MEGA_STARTER_FAMILIES.includes(base)) {
    return 'G-Max/Mega/Starter';
  }

  // 3. Double Overlap: Mega / Starter (Treecko, Torchic, Mudkip lines)
  if (CATCH_MEGA_STARTER_FAMILIES.includes(base)) {
    return 'Mega/Starter';
  }

  // 4. Double Overlap: G-Max / Starter (Grookey, Scorbunny, Sobble lines)
  if (CATCH_GMAX_STARTER_FAMILIES.includes(base)) {
    return 'G-Max/Starter';
  }

  // 5. Double Overlap: Mega / G-Max (Gastly, Haunter, Gengar line)
  if (CATCH_MEGA_GMAX_FAMILIES.includes(base)) {
    return 'Mega/G-Max';
  }

  // 6. ALL NON-MEGA STARTER LINES (Gen 2, 4, 5, 6, 7, 9)
  // Chespin, Quilladin, Chesnaught, Froakie, Frogadier, Greninja, Fennekin, Braixen, Delphox, Chikorita, Turtwig, etc.
  // STRICTLY marked as 'Starter', NEVER 'Mega' or 'Mega Line' because they are not Megas!
  if (CATCH_STARTER_FAMILIES.includes(base)) {
    return 'Starter';
  }

  // 7. Rare branch lines without Megas (Slowking, Kleavor, Froslass)
  if (['slowking', 'kleavor', 'froslass'].includes(base)) {
    return 'Rare Line';
  }

  // 8. Explicit forms
  if (isExplicitGMax) {
    return 'G-Max';
  }
  if (isExplicitMega) {
    return 'Mega';
  }

  // 9. Pure Mega lines
  if (CATCH_MEGA_EVOLUTION_FAMILIES.includes(base) || CATCH_DIRECT_MEGA_SPECIES.includes(base)) {
    return 'Mega Line';
  }

  // 10. Pure G-Max family lines (exclude non-G-Max regional Meowth forms)
  const isNonGmaxRegional = /\b(?:alolan|galarian|hisuian|paldean)\b/i.test(lower);
  if (CATCH_GMAX_SPECIES.includes(base) && !isNonGmaxRegional) {
    return 'G-Max Line';
  }

  // 11. Category fallbacks
  if (cat.includes('starter')) {
    return 'Starter';
  }
  if (cat.includes('rare')) {
    return 'Rare Line';
  }
  if (cat.includes('mega')) {
    return 'Mega Line';
  }
  if (cat.includes('gigantamax') || cat.includes('g-max')) {
    return 'G-Max';
  }

  if (cat.includes('dex')) {
    return 'New Dex';
  }
  if (cat.includes('type')) {
    return 'Type Match';
  }
  const hasVariant = /^(Dark|Shiny|Shadow|Ghostly|Ghost|Metallic|Mirage|Negative|Chrome|Retro)\s+/i.test(name);
  if (hasVariant || cat.includes('variant')) {
    return 'Variant';
  }
  return 'Common';
}

function getCaughtPokemonKindBadge(p) {
  const kind = getCaughtPokemonKind(p);
  let bg = '#070e1a';
  let border = '#1a283e';
  let color = '#8eaad0';

  if (kind === 'G-Max/Mega/Starter') {
    bg = 'rgba(168, 85, 247, 0.15)';
    border = '#a855f7';
    color = '#c084fc';
  } else if (kind === 'Mega/Starter') {
    bg = 'rgba(99, 102, 241, 0.15)';
    border = '#6366f1';
    color = '#818cf8';
  } else if (kind === 'G-Max/Starter') {
    bg = 'rgba(249, 115, 22, 0.15)';
    border = '#f97316';
    color = '#fb923c';
  } else if (kind === 'Mega/G-Max') {
    bg = 'rgba(14, 165, 233, 0.15)';
    border = '#0ea5e9';
    color = '#38bdf8';
  } else if (kind === 'Ultra Beast') {
    bg = 'rgba(63, 185, 80, 0.15)';
    border = '#3fb950';
    color = '#3fb950';
  } else if (kind === 'Paradox') {
    bg = 'rgba(236, 72, 153, 0.15)';
    border = '#ec4899';
    color = '#ec4899';
  } else if (kind === 'Mythical') {
    bg = 'rgba(163, 113, 247, 0.15)';
    border = '#a371f7';
    color = '#a371f7';
  } else if (kind === 'Legendary') {
    bg = 'rgba(210, 153, 34, 0.15)';
    border = '#d29922';
    color = '#d29922';
  } else if (kind === 'Gigantamax' || kind === 'G-Max') {
    bg = 'rgba(234, 88, 12, 0.15)';
    border = '#ea580c';
    color = '#f97316';
  } else if (kind === 'G-Max Line') {
    bg = 'rgba(245, 158, 11, 0.15)';
    border = '#f59e0b';
    color = '#fbbf24';
  } else if (kind === 'Mega') {
    bg = 'rgba(56, 139, 253, 0.15)';
    border = '#388bfd';
    color = '#388bfd';
  } else if (kind === 'Mega Line') {
    bg = 'rgba(56, 189, 248, 0.15)';
    border = '#38bdf8';
    color = '#38bdf8';
  } else if (kind === 'Starter') {
    bg = 'rgba(16, 185, 129, 0.15)';
    border = '#10b981';
    color = '#34d399';
  } else if (kind === 'Pseudo-Legendary') {
    bg = 'rgba(45, 212, 191, 0.15)';
    border = '#2dd4bf';
    color = '#2dd4bf';
  } else if (kind === 'Rare Line') {
    bg = 'rgba(168, 85, 247, 0.15)';
    border = '#a855f7';
    color = '#c084fc';
  } else if (kind === 'Variant') {
    bg = 'rgba(244, 63, 94, 0.15)';
    border = '#f43f5e';
    color = '#fb7185';
  } else if (kind === 'New Dex') {
    bg = 'rgba(34, 197, 94, 0.15)';
    border = '#22c55e';
    color = '#4ade80';
  } else if (kind === 'Type Match') {
    bg = 'rgba(14, 165, 233, 0.15)';
    border = '#0ea5e9';
    color = '#38bdf8';
  }

  return `<span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: ${bg}; border: 1px solid ${border}; color: ${color}; font-weight: 600; box-shadow: none !important;">${kind}</span>`;
}

function renderCatchLogUI() {
  ensureTodayCatchLog();
  const count = dailyCatchData.caught ? dailyCatchData.caught.length : 0;

  if (catchDateBadge) {
    catchDateBadge.textContent = dailyCatchData.date || 'Today';
  }
  if (catchStatCount) {
    catchStatCount.textContent = count;
  }
  if (catchStatMbStock) {
    catchStatMbStock.textContent = dailyCatchData.masterBallStock !== null ? dailyCatchData.masterBallStock : '--';
    catchStatMbStock.style.color = (dailyCatchData.masterBallStock === 0) ? '#ef4444' : '#d29922';
  }
  if (catchStatMbUsed) {
    catchStatMbUsed.textContent = dailyCatchData.masterBallUsedToday || 0;
  }

  if (ballStockDetails) {
    if (dailyCatchData.bagInventory && dailyCatchData.bagInventory.rawSummary) {
      ballStockDetails.textContent = dailyCatchData.bagInventory.rawSummary;
    } else if (dailyCatchData.masterBallStock !== null) {
      ballStockDetails.textContent = `Master Ball: ${dailyCatchData.masterBallStock}`;
    } else {
      ballStockDetails.textContent = 'Syncing bag inventory...';
    }
  }

  if (!catchFeedList) return;

  if (count === 0) {
    catchFeedList.innerHTML = `
      <div id="catchEmptyPrompt" style="text-align: center; color: #8eaad0; font-size: 11px; padding: 30px 10px;">
        <div style="display: flex; justify-content: center; margin-bottom: 6px; opacity: 0.85;"><span class="icon-pokeball"></span></div>
        <div style="font-weight: 600; color: #8eaad0;">No Pokemon Caught Today</div>
      </div>
    `;
    return;
  }

  let html = '';
  for (let i = 0; i < dailyCatchData.caught.length; i++) {
    const p = dailyCatchData.caught[i];
    const spriteTag = p.sprite ? `<img src="${p.sprite}" alt="${p.name}">` : `<span class="icon-pokeball"></span>`;
    const kindBadge = getCaughtPokemonKindBadge(p);
    html += `
      <div class="caught-pokemon-card">
        <div class="caught-card-thumb">${spriteTag}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <span style="font-size: 11.5px; font-weight: 700; color: #e0ecfa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${formatCleanPokemonName(p.name || '') || (p.name || '')}</span>
            <span style="font-size: 9.5px; color: #8eaad0; font-weight: 600;">${p.timestamp || ''}</span>
          </div>
          <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
            ${kindBadge}
            <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: #070e1a; border: 1px solid #1a283e; color: #8eaad0; font-weight: 600;">Lv ${p.level || '?'}</span>
          </div>
        </div>
      </div>
    `;
  }
  catchFeedList.innerHTML = html;
}

function recordCaughtPokemon(pokemon, remainingStock) {
  ensureTodayCatchLog();
  if (pokemon) {
    if (pokemon.name) {
      pokemon.name = formatCleanPokemonName(pokemon.name);
    }
    if (!pokemon.kind) {
      pokemon.kind = getCaughtPokemonKind(pokemon);
    }
    dailyCatchData.caught.unshift(pokemon);

    // Defense-in-depth: Immediately update local memory collection with newly caught Pokemon
    try {
      if (Array.isArray(currentCollection)) {
        const cName = pokemon.name || '';
        const cVariant = pokemon.variant || 'Normal';
        const cLevel = pokemon.level || 50;
        const exists = currentCollection.some(p => p && p.name === cName && (p.variant || 'Normal') === cVariant);
        if (!exists) {
          currentCollection.push({
            id: pokemon.id || ('catch_' + Date.now()),
            name: cName,
            variant: cVariant,
            level: cLevel
          });
          try {
            fs.writeFileSync(getWritableDataPath('user_collection.json'), JSON.stringify(currentCollection, null, 2), 'utf8');
          } catch (_) {}
          syncUserCollectionToGuest();
          if (scanStatusBadge) {
            scanStatusBadge.textContent = `${currentCollection.length} Pokemon Synced`;
          }
        }
      }
    } catch (_) {}
  }
  dailyCatchData.masterBallUsedToday = (dailyCatchData.masterBallUsedToday || 0) + 1;
  if (typeof remainingStock === 'number') {
    dailyCatchData.masterBallStock = remainingStock;
  } else if (typeof dailyCatchData.masterBallStock === 'number' && dailyCatchData.masterBallStock > 0) {
    dailyCatchData.masterBallStock -= 1;
  }
  saveDailyCatchLog();
  updateCatchLogBadge();
  renderCatchLogUI();

  // Defense-in-depth safety tracking for daily catches
  ensureTodaySafetyState();
  dailySafetyState.todayCatches = (dailyCatchData.caught ? dailyCatchData.caught.length : 0);
  saveDailySafetyState();
  updateSafetyTelemetryUI();

  if (config.safety && config.safety.enableDailyCeilings !== false) {
    if (dailySafetyState.todayCatches >= dailySafetyState.dailyCatchCeiling) {
      stopHuntingWithReason('Daily catch ceiling reached', `Paused (Daily Catches: ${dailySafetyState.todayCatches}/${dailySafetyState.dailyCatchCeiling})`, '#ef4444');
      playAlarmSound();
    }
  }
}

function updateBallInventory(inv) {
  if (!inv || typeof inv !== 'object') return;
  if (inv.username) {
    checkAndHandleAccountSwitch(inv.username);
  }
  if (!dailyCatchData.bagInventory) dailyCatchData.bagInventory = {};
  const hasAnyBallNumber = typeof inv.masterBall === 'number' || typeof inv.ultraBall === 'number' || typeof inv.greatBall === 'number' || typeof inv.pokeBall === 'number';
  if (typeof inv.masterBall === 'number') {
    dailyCatchData.masterBallStock = inv.masterBall;
    dailyCatchData.bagInventory.masterBall = inv.masterBall;
    isBallInventorySynced = true;
    if (inv.masterBall > 0 && outOfStockPaused) {
      outOfStockPaused = false;
    }
  }
  if (typeof inv.pokeBall === 'number') dailyCatchData.bagInventory.pokeBall = inv.pokeBall;
  if (typeof inv.greatBall === 'number') dailyCatchData.bagInventory.greatBall = inv.greatBall;
  if (typeof inv.ultraBall === 'number') dailyCatchData.bagInventory.ultraBall = inv.ultraBall;

  const summaryParts = [];
  if (typeof dailyCatchData.bagInventory.pokeBall === 'number') summaryParts.push('Poke: ' + dailyCatchData.bagInventory.pokeBall);
  if (typeof dailyCatchData.bagInventory.greatBall === 'number') summaryParts.push('Great: ' + dailyCatchData.bagInventory.greatBall);
  if (typeof dailyCatchData.bagInventory.ultraBall === 'number') summaryParts.push('Ultra: ' + dailyCatchData.bagInventory.ultraBall);
  if (typeof dailyCatchData.masterBallStock === 'number') summaryParts.push('Master: ' + dailyCatchData.masterBallStock);
  if (summaryParts.length > 0) {
    dailyCatchData.bagInventory.rawSummary = summaryParts.join(' | ');
  } else if (inv.rawSummary) {
    dailyCatchData.bagInventory.rawSummary = inv.rawSummary;
  }

  saveDailyCatchLog();
  updateCatchLogBadge();
  renderCatchLogUI();

  if (pendingManualInventorySync || inv.manualSync) {
    pendingManualInventorySync = false;
    const hasCachedBallNumber = typeof dailyCatchData.masterBallStock === 'number' ||
      (dailyCatchData.bagInventory && (
        typeof dailyCatchData.bagInventory.pokeBall === 'number' ||
        typeof dailyCatchData.bagInventory.greatBall === 'number' ||
        typeof dailyCatchData.bagInventory.ultraBall === 'number'
      ));
    if (hasAnyBallNumber || hasCachedBallNumber) {
      const mbStr = (typeof dailyCatchData.masterBallStock === 'number') ? ` (MB: ${dailyCatchData.masterBallStock})` : '';
      updateStatus(`Inventory synced${mbStr}`, '#238636');
    } else {
      updateStatus('Open PokeMart or Battle to view bag inventory', '#f59e0b');
    }
  }

  // Mandatory safety gate: if Auto-Catch (Master Ball) is ON and synced stock is 0, immediately halt!
  if (config.settings && config.settings.autoCatchMasterBall === true && dailyCatchData.masterBallStock === 0) {
    outOfStockPaused = true;
    if (isRunning) {
      stopHuntingWithReason('Master Ball stock is 0 while Auto-Catch is enabled', 'Paused (0 Master Balls - Restock)', '#ef4444');
      playAlarmSound();
    } else if (autoStartRemainingSeconds > 0) {
      cancelPendingAutoStart('Master Ball stock is 0 while Auto-Catch is enabled');
      updateToggleButton();
      updateStatus('Paused (0 Master Balls - Restock)', '#ef4444');
    }
  }
}

function openCatchLogPanel() {
  if (!catchLogModal) return;
  if (teamBuilderModal) {
    teamBuilderModal.style.display = 'none';
    if (teamBuilderBtn) teamBuilderBtn.classList.remove('btn-accent');
    updateTeamBuilderBadge(false);
  }
  if (adsInspectorModal) {
    adsInspectorModal.style.display = 'none';
  }
  if (aiAssistantModal) {
    aiAssistantModal.style.display = 'none';
    if (aiAssistantTopBtn) aiAssistantTopBtn.classList.remove('btn-accent');
  }
  if (safetySettingsModal) {
    safetySettingsModal.style.display = 'none';
    if (safetySettingsTopBtn) safetySettingsTopBtn.classList.remove('btn-accent');
  }
  catchLogModal.style.display = 'flex';
  if (delugeView) {
    delugeView.classList.remove('full-width');
    delugeView.style.width = '75%';
    delugeView.style.flex = '3';
    delugeView.style.pointerEvents = 'auto';
  }
  renderCatchLogUI();
  try {
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('request-ball-inventory');
    }
  } catch (_) {}
}

function closeCatchLogPanel() {
  if (!catchLogModal) return;
  catchLogModal.style.display = 'none';
  if ((!teamBuilderModal || teamBuilderModal.style.display !== 'flex') &&
      (!adsInspectorModal || adsInspectorModal.style.display !== 'flex') &&
      (!aiAssistantModal || aiAssistantModal.style.display !== 'flex') &&
      (!safetySettingsModal || safetySettingsModal.style.display !== 'flex')) {
    if (delugeView) {
      delugeView.classList.add('full-width');
      delugeView.style.width = '100%';
      delugeView.style.flex = '1';
      delugeView.style.pointerEvents = 'auto';
    }
  }
}

function toggleCatchLogPanel() {
  if (!catchLogModal) return;
  if (catchLogModal.style.display === 'flex') {
    closeCatchLogPanel();
  } else {
    openCatchLogPanel();
  }
}

if (dailyCaughtBtn) {
  dailyCaughtBtn.addEventListener('click', toggleCatchLogPanel);
}
if (catchLogMenuBtn) {
  catchLogMenuBtn.addEventListener('click', () => {
    closeNavDropdown();
    toggleCatchLogPanel();
  });
}
if (closeCatchLogBtn) {
  closeCatchLogBtn.addEventListener('click', closeCatchLogPanel);
}
if (switchTeamBuilderFromCatchBtn) {
  switchTeamBuilderFromCatchBtn.addEventListener('click', () => {
    closeCatchLogPanel();
    openTeamBuilderPanel();
  });
}
if (clearCatchLogBtn) {
  clearCatchLogBtn.addEventListener('click', () => {
    ensureTodayCatchLog();
    dailyCatchData.caught = [];
    saveDailyCatchLog();
    ensureTodaySafetyState();
    dailySafetyState.todayCatches = 0;
    saveDailySafetyState();
    updateCatchLogBadge();
    renderCatchLogUI();
    updateSafetyTelemetryUI();
    updateStatus("Today's catch log cleared", '#388bfd');
  });
}
if (refreshCatchLogBtn) {
  refreshCatchLogBtn.addEventListener('click', () => {
    pendingManualInventorySync = true;
    updateStatus('Syncing ball inventory...', '#388bfd');
    try {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('request-ball-inventory', { manual: true });
      }
    } catch (_) {}
    setTimeout(() => {
      if (pendingManualInventorySync) {
        pendingManualInventorySync = false;
        const mbStr = (dailyCatchData && typeof dailyCatchData.masterBallStock === 'number') ? ` (MB: ${dailyCatchData.masterBallStock})` : '';
        updateStatus(`Inventory synced${mbStr}`, '#238636');
      }
    }, 3500);
  });
}

// =====================================================================
// LIVE AI COMBAT ASSISTANT & TACTICAL COPILOT CONTROLLER
// =====================================================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function openAiAssistantPanel() {
  if (!aiAssistantModal) return;
  if (teamBuilderModal) {
    teamBuilderModal.style.display = 'none';
    if (teamBuilderBtn) teamBuilderBtn.classList.remove('btn-accent');
    updateTeamBuilderBadge(false);
  }
  if (adsInspectorModal) adsInspectorModal.style.display = 'none';
  if (catchLogModal) catchLogModal.style.display = 'none';
  if (safetySettingsModal) {
    safetySettingsModal.style.display = 'none';
    if (safetySettingsTopBtn) safetySettingsTopBtn.classList.remove('btn-accent');
  }

  aiAssistantModal.style.display = 'flex';
  if (liveAiHudOverlay) liveAiHudOverlay.style.display = 'none';
  if (delugeView) {
    delugeView.classList.remove('full-width');
    delugeView.style.width = '75%';
    delugeView.style.flex = '3';
    delugeView.style.pointerEvents = 'auto';
  }
  if (aiAssistantTopBtn) aiAssistantTopBtn.classList.add('btn-accent');
  if (delugeView && typeof delugeView.send === 'function') {
    delugeView.send('check-evolve-card');
  }
  renderEvolutionDecisionMakerUI();
  renderAiAssistantUI();
}

function closeAiAssistantPanel() {
  if (!aiAssistantModal) return;
  aiAssistantModal.style.display = 'none';
  if ((!teamBuilderModal || teamBuilderModal.style.display !== 'flex') &&
      (!adsInspectorModal || adsInspectorModal.style.display !== 'flex') &&
      (!catchLogModal || catchLogModal.style.display !== 'flex') &&
      (!safetySettingsModal || safetySettingsModal.style.display !== 'flex')) {
    if (delugeView) {
      delugeView.classList.add('full-width');
      delugeView.style.width = '100%';
      delugeView.style.flex = '1';
      delugeView.style.pointerEvents = 'auto';
    }
  }
  if (aiAssistantTopBtn) aiAssistantTopBtn.classList.remove('btn-accent');
}

function toggleAiAssistantPanel() {
  if (!aiAssistantModal) return;
  if (aiAssistantModal.style.display === 'flex') {
    closeAiAssistantPanel();
  } else {
    openAiAssistantPanel();
  }
}

function updateLiveAiAssistantUI(battleData) {
  const isPostBattle = Boolean(battleData && (battleData.isPostBattleScreen || battleData.isVictoryScreen || battleData.isDefeatScreen));
  if (!battleData || (!isPostBattle && (!Array.isArray(battleData.roster) || battleData.roster.length === 0))) {
    activeAiBattleData = null;
    renderAiAssistantUI();
    if (typeof updateTeamBuilderBattleAction === 'function') {
      updateTeamBuilderBattleAction(null);
    }
    return;
  }
  activeAiBattleData = battleData;
  if (aiAssistant) {
    aiAssistant.setLiveBattle(battleData);
  }

  const isAiPanelOpen = Boolean(aiAssistantModal && aiAssistantModal.style.display === 'flex');
  if (isAiPanelOpen) {
    renderAiAssistantUI();
  }

  if (typeof updateTeamBuilderBattleAction === 'function') {
    updateTeamBuilderBattleAction(battleData);
  }
}

function formatCompactBattleName(rawName) {
  if (!rawName) return '';
  const trimmed = String(rawName).trim();
  if (trimmed.length <= 20) return trimmed;
  const noParens = trimmed.replace(/\s*\([^)]+\)/g, '').trim();
  return noParens || trimmed;
}

function computeAiBattleActionConfig(battleData, collection) {
  if (isUnlockChallengeActive || isCaptchaAlarmActive) {
    return {
      labelHtml: '&#9888; Captcha Active (Disabled)',
      hudText: '&#9888; Captcha Active',
      disabled: true,
      btnClass: 'btn',
      action: null
    };
  }
  if (!battleData) return null;

  // Post-Battle Victory / Defeat Screen Gate: Always evaluate as complete even if roster array is empty
  const isPostBattle = Boolean(
    battleData.isVictoryScreen ||
    battleData.isDefeatScreen ||
    battleData.isPostBattleScreen ||
    battleData.hasNextBattleBtn ||
    battleData.isGmaxChallengeComplete
  );
  if (isPostBattle) {
    const isDefeat = Boolean(battleData.isDefeatScreen);
    const isGmaxComplete = Boolean(battleData.isGmaxChallengeComplete);
    const hasNext = Boolean(battleData.hasNextBattleBtn);

    if (isGmaxComplete) {
      return {
        labelHtml: '&#10003; G-Max Challenge Complete',
        hudText: '&#10003; Complete',
        disabled: true,
        btnClass: 'btn',
        action: null
      };
    }

    if (hasNext) {
      return {
        labelHtml: '&#9889; Next Battle',
        hudText: 'Next Battle',
        disabled: false,
        btnClass: 'btn btn-accent',
        action: () => {
          executeAiBattleAction('click-rematch-button', {});
        }
      };
    }

    return {
      labelHtml: isDefeat ? '&#10003; Battle Finished (Defeat)' : '&#10003; Battle Complete',
      hudText: isDefeat ? '&#10003; Defeat' : '&#10003; Complete',
      disabled: true,
      btnClass: 'btn',
      action: null
    };
  }

  if (!Array.isArray(battleData.roster) || battleData.roster.length === 0) {
    return null;
  }
  battleData.currentMatchItemCount = currentMatchItemCount;
  battleData.lastTurnUsedItem = (lastTurnActionType === 'use-battle-item');
  const analysis = aiAssistant ? aiAssistant.analyzeBattle(battleData, collection) : null;
  if (!analysis || analysis.status === 'IDLE') return null;

  const isOpponentTeamAllFainted = Boolean(
    Array.isArray(battleData.roster) &&
    battleData.roster.length > 0 &&
    battleData.roster.every(p => p.isFainted || (p.hp !== undefined && p.hp <= 0))
  );

  const isUserTeamAllFainted = Boolean(
    Array.isArray(battleData.userTeam) &&
    battleData.userTeam.length > 0 &&
    battleData.userTeam.every(p => p.isFainted || (p.hp !== undefined && p.hp <= 0))
  );

  const hasActiveBattleControls = Boolean(
    analysis.hasContinueBtn ||
    analysis.hasSkipSelectionBtn ||
    analysis.hasAttackBtn ||
    (analysis.availableMoves && analysis.availableMoves.length > 0) ||
    analysis.hasBenchRadios
  );

  const isOppKO = Boolean(analysis.isActiveOpponentFainted || (analysis.activeOpponentHp !== undefined && analysis.activeOpponentHp <= 0));

  const isBattleComplete = Boolean(isPostBattle ||
    (isOpponentTeamAllFainted || isUserTeamAllFainted || (isOppKO && !hasActiveBattleControls)) && !hasActiveBattleControls
  );

  if (isBattleComplete) {
    const isDefeat = Boolean(battleData.isDefeatScreen || (isUserTeamAllFainted && !isOpponentTeamAllFainted));
    return {
      labelHtml: isDefeat ? '&#10003; Battle Finished (Defeat)' : '&#10003; Battle Complete',
      hudText: isDefeat ? '&#10003; Defeat' : '&#10003; Complete',
      disabled: true,
      btnClass: 'btn',
      action: null
    };
  }

  const isTrainingOnlyMode = Boolean(
    ((teamBattleMode === 'NPC' && teamRosterMode === 'TRAINING') || analysis.isTrainingTeam) &&
    !analysis.isChallengeLocked &&
    !battleData.isChallengePreview
  );

  const unparticipatedTrainees = (Array.isArray(battleData.userTeam) ? battleData.userTeam : []).filter(u => {
    if (!u || !u.name) return false;
    if (u.isFainted || (u.hp !== undefined && u.hp <= 0)) return false;
    if (analysis.activeBattler && u.name.toLowerCase() === analysis.activeBattler.name.toLowerCase()) return false;
    if ((u.level || 0) >= 100) return false;
    if (typeof currentMatchParticipants !== 'undefined' && currentMatchParticipants.has(u.name.toLowerCase())) return false;
    return true;
  });
  const capableUnparticipatedTrainees = unparticipatedTrainees.filter(u => (u.level || 0) >= 85);
  const activeBattlerLvl = analysis.activeBattler ? (analysis.activeBattler.level || 100) : 100;
  // When Primary Trainee is >= Lv 85 (near Lv 100 cap, e.g. Buneary Lv 94), allow tagging in the next trainee
  // (even if < Lv 85, e.g. Chrome Weedle Lv 11) so surplus EXP above 100,000 is absorbed instead of wasted.
  const relayTargetTrainees = (analysis.isHighLevelTrainee || activeBattlerLvl >= 85)
    ? unparticipatedTrainees
    : capableUnparticipatedTrainees;

  const isBattlerAlive = !analysis.isActiveBattlerFainted && ((analysis.activeBattlerHp !== undefined) ? analysis.activeBattlerHp > 0 : true);
  const needsPostFaintBenchSelect = Boolean(!isBattlerAlive && analysis.hasBenchRadios && !analysis.isPreparationScreen);

  // Precision Tactical Forfeit: When Carry and all >= Lv 85 fighters are fainted and remaining babies cannot win,
  // or after the Carry is defeated and at most 2 additional post-Carry fighters have fallen,
  // immediately click "Forfeit" and continue the Loop into the next battle without wasting time.
  const blockForfeitOnAliveContinue = Boolean(
    isBattlerAlive &&
    (analysis.hasContinueBtn || analysis.hasSkipSelectionBtn) &&
    !(analysis.postCarryLimitReached && analysis.hasBenchRadios && !analysis.hasAttackBtn && !analysis.hasSkipSelectionBtn)
  );
  if (analysis.shouldForfeitBattle && analysis.hasForfeitBtn && !blockForfeitOnAliveContinue) {
    const forfeitLabel = analysis.postCarryLimitReached
      ? 'Forfeit (Max 2 Post-Carry - Next Loop)'
      : 'Forfeit (Unwinnable - Next Loop)';
    return {
      labelHtml: `&#9873; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${forfeitLabel}</span>`,
      hudText: 'Forfeit & Loop',
      disabled: false,
      btnClass: 'btn btn-danger',
      action: () => {
        executeAiBattleAction('forfeit-battle', {});
      }
    };
  }

  // Only render Continue or Skip Selection if the corresponding buttons are ACTUALLY visible in the DOM
  // and we do not need to select a post-faint replacement from bench radios
  if ((analysis.hasContinueBtn || analysis.hasSkipSelectionBtn) && !needsPostFaintBenchSelect) {
    const shouldRelayBetweenKOs = Boolean(
      isTrainingOnlyMode &&
      !analysis.isCarryDefeated &&
      isBattlerAlive &&
      activeBattlerLvl >= 85 &&
      relayTargetTrainees.length > 0 &&
      currentMatchSwitchCount < 1 &&
      analysis.hasSkipSelectionBtn &&
      analysis.hasBenchRadios
    );

    if (shouldRelayBetweenKOs) {
      const nextTrainee = relayTargetTrainees[0];
      const shortNext = formatCompactBattleName(nextTrainee.name);
      return {
        labelHtml: `&#9889; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Deploy ${escapeHtml(shortNext)} &amp; Continue</span>`,
        hudText: `Deploy ${shortNext}`,
        disabled: false,
        btnClass: 'btn btn-accent',
        action: () => {
          executeAiBattleAction('select-lead-and-start', { pokemonName: nextTrainee.name, autoStart: true, isRelay: true });
        }
      };
    }

    const useSkipSelection = Boolean(isTrainingOnlyMode && isBattlerAlive && analysis.hasSkipSelectionBtn);
    const label = useSkipSelection
      ? 'Skip Selection & Continue'
      : (isOppKO ? 'Opponent KO - Continue' : 'Continue to Next Turn');
    return {
      labelHtml: `&#9889; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(label)}</span>`,
      hudText: useSkipSelection ? 'Skip & Continue' : label,
      disabled: false,
      btnClass: 'btn btn-accent',
      action: () => {
        executeAiBattleAction('click-battle-button', { preferSkipSelection: useSkipSelection });
      }
    };
  }

  if (analysis.hasBenchRadios && !analysis.hasAttackBtn && !analysis.isPreparationScreen) {
    const nextName = analysis.nextAliveCounter || (analysis.bestActiveLead ? analysis.bestActiveLead.name : 'Next Counter');
    const shortNext = formatCompactBattleName(nextName);
    return {
      labelHtml: `&#9889; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Deploy ${escapeHtml(shortNext)} &amp; Continue</span>`,
      hudText: `Deploy ${shortNext}`,
      disabled: false,
      btnClass: 'btn btn-accent',
      action: () => {
        executeAiBattleAction('select-lead-and-start', { pokemonName: nextName, autoStart: true });
      }
    };
  }

  if (analysis.isInActiveBattle) {
    const oppHp = (analysis.activeOpponentHp !== undefined) ? analysis.activeOpponentHp : 100;
    const oppMaxHp = (analysis.activeOpponentMaxHp !== undefined) ? analysis.activeOpponentMaxHp : 100;
    const isOpponentAlive = !analysis.isActiveOpponentFainted && oppHp > 0;
    const isBattlerAlive = !analysis.isActiveBattlerFainted && ((analysis.activeBattlerHp !== undefined) ? analysis.activeBattlerHp > 0 : true);

    if (isOpponentAlive && isBattlerAlive && (analysis.hasAttackBtn || (analysis.availableMoves && analysis.availableMoves.length > 0))) {
      // Clean Single-Switch EXP Relay (>= Lv 85 Capable Trainees Only):
      // Uses the in-battle "Switch Pokemon" button at most ONCE per match after the lead has participated,
      // strictly gating out < Lv 85 babies and preventing back-and-forth switch spam.
      const hasDefeatedAtLeastOneOpp = Boolean(
        Array.isArray(battleData.roster) &&
        battleData.roster.some(p => p.isFainted || (p.hp !== undefined && p.hp <= 0))
      );
      const isRecentlySwitchedIn = Boolean(
        analysis.activeBattler &&
        justSwitchedActivePokemon.has(analysis.activeBattler.name.toLowerCase())
      );
      const shouldMidBattleSwitch = Boolean(
        isTrainingOnlyMode &&
        !analysis.isCarryDefeated &&
        (activeBattlerLvl >= 85 || analysis.isHighLevelTrainee) &&
        (hasDefeatedAtLeastOneOpp || activeBattlerLvl >= 100) &&
        relayTargetTrainees.length > 0 &&
        currentMatchSwitchCount < 1 &&
        analysis.hasSwitchBtn &&
        analysis.hasBenchRadios &&
        !isRecentlySwitchedIn
      );

      if (shouldMidBattleSwitch) {
        const nextTrainee = relayTargetTrainees[0];
        const shortNext = formatCompactBattleName(nextTrainee.name);
        return {
          labelHtml: `&#8635; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Switch to ${escapeHtml(shortNext)} (EXP Relay)</span>`,
          hudText: `Switch: ${shortNext}`,
          disabled: false,
          btnClass: 'btn btn-accent',
          action: () => {
            executeAiBattleAction('switch-pokemon', { pokemonName: nextTrainee.name, autoStart: true, isSwitch: true });
          }
        };
      }

      const shouldTacticalCounterSwitch = Boolean(
        !isTrainingOnlyMode &&
        analysis.shouldSwitchToCounter &&
        analysis.switchCounterName &&
        analysis.hasSwitchBtn &&
        analysis.hasBenchRadios &&
        currentMatchSwitchCount < 2 &&
        !isRecentlySwitchedIn
      );

      if (shouldTacticalCounterSwitch) {
        const shortCounter = formatCompactBattleName(analysis.switchCounterName);
        backendLog('AI_TACTIC', `Tactical switch triggered: ${analysis.switchCounterReason}`);
        return {
          labelHtml: `&#8635; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Switch to ${escapeHtml(shortCounter)}</span>`,
          hudText: `Switch: ${shortCounter}`,
          disabled: false,
          btnClass: 'btn btn-accent',
          action: () => {
            executeAiBattleAction('switch-pokemon', { pokemonName: analysis.switchCounterName, autoStart: true, isSwitch: true });
          }
        };
      }

      if (analysis.shouldUseFullRestore && analysis.hasUseItemBtn && currentMatchItemCount < 1 && lastTurnActionType !== 'use-battle-item') {
        const frCount = typeof analysis.fullRestoreCount === 'number' ? analysis.fullRestoreCount : 1;
        backendLog('AI_TACTIC', `Full Restore triggered: ${analysis.fullRestoreReason}`);
        return {
          labelHtml: `&#128138; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Use Full Restore (${frCount} left)</span>`,
          hudText: `Item: Full Restore (${frCount})`,
          disabled: false,
          btnClass: 'btn btn-accent',
          action: () => {
            executeAiBattleAction('use-battle-item', { itemName: 'Full Restore' });
          }
        };
      }

      const moveObj = analysis.bestMoveObj;
      const rawMoveName = moveObj ? moveObj.name : (analysis.recommendedMove || 'Attack');
      const moveName = String(rawMoveName).split(' (')[0].split(' [')[0].trim() || 'Attack';
      const mult = moveObj && moveObj.multiplier ? moveObj.multiplier : null;
      const multText = (mult !== null && mult !== undefined) ? ` (${mult}x)` : '';
      const isReattack = (oppHp < oppMaxHp && oppHp > 0);
      const verb = isReattack ? 'Reattack' : 'Attack';

      return {
        labelHtml: `&#9889; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${verb} with ${escapeHtml(moveName)}${multText}</span>`,
        hudText: `${verb}: ${moveName}${multText}`,
        disabled: false,
        btnClass: 'btn btn-accent',
        action: () => {
          executeAiBattleAction('execute-battle-move', { moveName: moveName });
        }
      };
    } else if (!isBattlerAlive) {
      // Post-Faint Carry Deployment: Carry takes over cleanly and finishes the battle.
      const nextName = analysis.nextAliveCounter || 'Next Counter';
      const shortNext = formatCompactBattleName(nextName);
      return {
        labelHtml: `&#9889; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Deploy ${escapeHtml(shortNext)} &amp; Continue</span>`,
        hudText: `Deploy ${shortNext}`,
        disabled: false,
        btnClass: 'btn btn-accent',
        action: () => {
          executeAiBattleAction('select-lead-and-start', { pokemonName: nextName, autoStart: true });
        }
      };
    } else {
      const rawFallback = analysis.recommendedMove || 'Attack';
      const fallbackMove = String(rawFallback).split(' (')[0].split(' [')[0].trim() || 'Attack';
      return {
        labelHtml: `&#9889; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Attack with ${escapeHtml(fallbackMove)}</span>`,
        hudText: `Attack: ${fallbackMove}`,
        disabled: false,
        btnClass: 'btn btn-accent',
        action: () => {
          executeAiBattleAction('execute-battle-move', { moveName: fallbackMove });
        }
      };
    }
  }

  if (analysis.isPreparationScreen) {
    if (battleData.isChallengePreview) {
      return {
        labelHtml: '&#9876; Launch Challenge Battle',
        hudText: 'Launch Battle',
        disabled: false,
        btnClass: 'btn btn-accent',
        action: () => {
          executeAiBattleAction('click-battle-button', {});
        }
      };
    } else {
      const fullLeadName = (analysis.bestActiveLead && analysis.bestActiveLead.name) ? analysis.bestActiveLead.name : '';
      const hasFaintedOpponents = Boolean(Array.isArray(battleData.roster) && battleData.roster.some(p => p.isFainted || (p.hp !== undefined && p.hp <= 0)));
      const deployActionLabel = hasFaintedOpponents ? 'Continue' : 'Start';
      const shortLeadName = fullLeadName ? formatCompactBattleName(fullLeadName) : 'Battle';
      const btnText = fullLeadName ? `Deploy ${escapeHtml(shortLeadName)} &amp; ${deployActionLabel}` : 'Start Battle';
      return {
        labelHtml: `&#9889; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${btnText}</span>`,
        hudText: fullLeadName ? `Deploy &amp; ${deployActionLabel}` : 'Start Battle',
        disabled: false,
        btnClass: 'btn btn-accent',
        action: () => {
          if (fullLeadName) {
            executeAiBattleAction('select-lead-and-start', { pokemonName: fullLeadName, autoStart: true });
          } else {
            executeAiBattleAction('click-battle-button', {});
          }
        }
      };
    }
  }

  return null;
}

function updateTeamBuilderBattleAction(battleData) {
  if (!teamBattleActionSlot || !teamBattleActionBtn) return;
  if (typeof syncTeamActionButtonsState === 'function') syncTeamActionButtonsState();
  if (isUnlockChallengeActive || isCaptchaAlarmActive) {
    stopAllBattleAutomation('Captcha active');
    teamBattleActionSlot.style.display = 'block';
    teamBattleActionBtn.className = 'btn';
    teamBattleActionBtn.disabled = true;
    teamBattleActionBtn.innerHTML = '&#9888; Captcha Active (Disabled)';
    teamBattleActionBtn.title = 'Disabled: Captcha challenge active. Acknowledge or solve captcha to resume.';
    teamBattleActionBtn.onclick = null;
    if (teamActionRow) teamActionRow.style.display = 'flex';
    return;
  }
  const inBattlePage = isCurrentPageBattle();
  const inWildOrCatch = isWildHuntingOrCatchContext(battleData && battleData.battleUrl);
  if (inWildOrCatch || !inBattlePage) {
    stopAllBattleAutomation(inWildOrCatch ? 'Wild catch or map hunting active' : 'Outside battle page');
    if (teamActionStatus && /^Auto\s+(?:turn|deploying|executing)/i.test(teamActionStatus.textContent || '')) {
      teamActionStatus.textContent = '';
    }
    teamBattleActionSlot.style.display = 'block';
    teamBattleActionBtn.className = 'btn';
    teamBattleActionBtn.disabled = true;
    teamBattleActionBtn.innerHTML = '&#9889; Attack';
    teamBattleActionBtn.title = inWildOrCatch
      ? 'Disabled: Wild catch or map hunting active'
      : 'Disabled: Enter a battle page on DelugeRPG to attack';
    teamBattleActionBtn.onclick = null;
    return;
  }
  const config = computeAiBattleActionConfig(battleData, currentCollection);
  if (!config) {
    if (battleAutoStepTimer) {
      clearTimeout(battleAutoStepTimer);
      battleAutoStepTimer = null;
    }
    teamBattleActionSlot.style.display = 'block';
    teamBattleActionBtn.className = 'btn';
    teamBattleActionBtn.disabled = true;
    teamBattleActionBtn.innerHTML = '&#9889; Attack';
    teamBattleActionBtn.title = 'Disabled: Waiting for active battle turn';
    teamBattleActionBtn.onclick = null;
    // Resilient poll: If auto is armed during a transient DOM transition, re-check in 600ms
    if (isBattleAutoRunning && teamBattleAutoCheck && teamBattleAutoCheck.checked && !isUnlockChallengeActive && !isCaptchaAlarmActive && !isWildHuntingOrCatchContext() && isCurrentPageBattle()) {
      battleAutoStepTimer = setTimeout(() => {
        battleAutoStepTimer = null;
        if (!isWildHuntingOrCatchContext() && isCurrentPageBattle() && delugeView && typeof delugeView.send === 'function') {
          delugeView.send('check-battle-opponents');
        }
      }, 600);
    }
    return;
  }

  const isExplicitPostBattle = Boolean(battleData && (battleData.isPostBattleScreen || battleData.isVictoryScreen || battleData.isDefeatScreen || battleData.isGmaxChallengeComplete || battleData.hasNextBattleBtn));
  const isTransientInFlight = Boolean(!isExplicitPostBattle && typeof battleActionInFlightUntil !== 'undefined' && Date.now() < battleActionInFlightUntil);
  const isMatchOver = !isTransientInFlight && Boolean(
    isExplicitPostBattle ||
    (config && (config.disabled || !config.action || (config.labelHtml && (config.labelHtml.indexOf('Battle Complete') !== -1 || config.labelHtml.indexOf('Battle Finished') !== -1 || config.labelHtml.indexOf('Challenge Complete') !== -1 || config.labelHtml.indexOf('Next Battle') !== -1))))
  );
  const evalSig = `${isMatchOver}|${config ? config.hudText || 'none' : 'none'}|${Boolean(battleData && battleData.hasNextBattleBtn)}|${Boolean(battleData && battleData.isVictoryScreen)}|${Boolean(teamBattleLoopCheck && teamBattleLoopCheck.checked)}`;
  const nowEvalTs = Date.now();
  const prevEvalSig = (typeof lastBattleActionEvalLogSig !== 'undefined') ? lastBattleActionEvalLogSig : '';
  const prevEvalTs = (typeof lastBattleActionEvalLogTs !== 'undefined') ? lastBattleActionEvalLogTs : 0;
  if (evalSig !== prevEvalSig || (nowEvalTs - prevEvalTs) > 3000) {
    if (typeof lastBattleActionEvalLogSig !== 'undefined') lastBattleActionEvalLogSig = evalSig;
    if (typeof lastBattleActionEvalLogTs !== 'undefined') lastBattleActionEvalLogTs = nowEvalTs;
    backendLog('BATTLE_ACTION_EVAL', `isMatchOver=${isMatchOver}, action="${config ? config.hudText || 'none' : 'none'}", hasNextBattleBtn=${Boolean(battleData && battleData.hasNextBattleBtn)}, isVictoryScreen=${Boolean(battleData && battleData.isVictoryScreen)}, loopChecked=${Boolean(teamBattleLoopCheck && teamBattleLoopCheck.checked)}`);
  }
  if (isMatchOver) {
    if (battleAutoStepTimer) {
      clearTimeout(battleAutoStepTimer);
      battleAutoStepTimer = null;
      if (typeof scheduledAutoStepKey !== 'undefined') scheduledAutoStepKey = '';
    }
    isBattleAutoRunning = false;

    if (isPendingSessionAutoStop) {
      isPendingSessionAutoStop = false;
      stopHuntingWithReason(pendingSessionAutoStopReason || 'Session auto-stop triggered', pendingSessionAutoStopMsg || 'Paused (Session Auto-Stop Limit)', '#f59e0b');
      playAlarmSound();
      return;
    }

    // Check if G-Max Challenge is fully completed
    if (isGMaxChallengeModeActive() && ((battleData && battleData.isGmaxChallengeComplete) || (config && config.labelHtml && config.labelHtml.indexOf('G-Max Challenge Complete') !== -1))) {
      isBattleLoopRunning = false;
      if (teamBattleLoopCheck) teamBattleLoopCheck.checked = false;
      updateLoopCheckboxVisual();
      if (teamActionStatus) {
        teamActionStatus.textContent = 'G-Max Challenge successfully completed!';
        teamActionStatus.style.color = '#10b981';
      }
    } else if (teamBattleLoopCheck && teamBattleLoopCheck.checked && teamBattleAutoCheck && teamBattleAutoCheck.checked && !isWildHuntingOrCatchContext(battleData && battleData.battleUrl) && isCurrentPageBattle()) {
      // Loop mode proceeds to Next Battle or rematch after human micro-rest
      scheduleNextLoopBattle();
    }
  }

  teamBattleActionSlot.style.display = 'block';
  teamBattleActionBtn.className = config.btnClass || 'btn btn-accent';
  teamBattleActionBtn.disabled = Boolean(config.disabled);
  teamBattleActionBtn.innerHTML = config.labelHtml;
  teamBattleActionBtn.title = 'Execute optimal battle move or action directly from Team Builder';
  teamBattleActionBtn.onclick = () => {
    userManuallyPaused = false;
    if (typeof scheduledAutoStepKey !== 'undefined') scheduledAutoStepKey = '';
    if (typeof config.action === 'function') {
      const isNextBattleClick = Boolean(config.labelHtml && config.labelHtml.indexOf('Next Battle') !== -1);
      if (teamBattleAutoCheck && teamBattleAutoCheck.checked) {
        isBattleAutoRunning = true;
      } else {
        isBattleAutoRunning = false;
      }
      if (teamActionStatus) {
        teamActionStatus.textContent = isNextBattleClick
          ? 'Next battle loading...'
          : (isBattleAutoRunning ? 'Auto executing turn...' : 'Applying...');
        teamActionStatus.style.color = '#388bfd';
      }
      teamBattleActionBtn.disabled = true;
      config.action();
    }
  };
  if (teamActionRow) {
    teamActionRow.style.display = 'flex';
  }

  // If loop mode is active on non-complete screens, ensure auto runs
  if (teamBattleLoopCheck && teamBattleLoopCheck.checked && teamBattleAutoCheck && teamBattleAutoCheck.checked) {
    if (!isUnlockChallengeActive && !isCaptchaAlarmActive && !isMatchOver && !isWildHuntingOrCatchContext(battleData && battleData.battleUrl) && isCurrentPageBattle()) {
      isBattleAutoRunning = true;
    }
  }

  if (isBattleAutoRunning && teamBattleAutoCheck && teamBattleAutoCheck.checked && !isMatchOver && !isWildHuntingOrCatchContext(battleData && battleData.battleUrl) && isCurrentPageBattle() && typeof config.action === 'function' && !config.disabled) {
    const opp0 = (battleData && Array.isArray(battleData.roster) && battleData.roster[0]) ? battleData.roster[0] : null;
    const usr0 = (battleData && battleData.userActivePokemon) ? battleData.userActivePokemon : null;
    const autoStepKey = `${config.hudText || ''}|${battleData && battleData.isPreparationScreen ? 'prep' : 'act'}|${opp0 ? (opp0.name + ':' + opp0.hp) : ''}|${usr0 ? (usr0.name + ':' + usr0.hp) : ''}`;
    if (battleAutoStepTimer && typeof scheduledAutoStepKey !== 'undefined' && scheduledAutoStepKey === autoStepKey) {
      return;
    }
    if (battleAutoStepTimer) {
      clearTimeout(battleAutoStepTimer);
      battleAutoStepTimer = null;
    }
    const isPrep = Boolean(battleData && battleData.isPreparationScreen);
    const gU1 = Math.random() || 0.0001;
    const gU2 = Math.random();
    const gZ = Math.sqrt(-2.0 * Math.log(gU1)) * Math.sin(2.0 * Math.PI * gU2);
    const autoDelay = isPrep
      ? Math.max(1150, Math.min(2100, Math.round(1500 + gZ * 260)))
      : Math.max(920, Math.min(1800, Math.round(1220 + gZ * 220)));
    if (teamActionStatus) {
      teamActionStatus.textContent = isPrep
        ? `Auto deploying in ${(autoDelay / 1000).toFixed(1)}s...`
        : `Auto turn in ${(autoDelay / 1000).toFixed(1)}s...`;
      teamActionStatus.style.color = '#388bfd';
    }
    if (typeof scheduledAutoStepKey !== 'undefined') scheduledAutoStepKey = autoStepKey;
    battleAutoStepTimer = setTimeout(() => {
      battleAutoStepTimer = null;
      if (typeof scheduledAutoStepKey !== 'undefined') scheduledAutoStepKey = '';
      if (isUnlockChallengeActive || isCaptchaAlarmActive || isPendingSessionAutoStop) {
        isBattleAutoRunning = false;
        return;
      }
      if (isWildHuntingOrCatchContext(battleData && battleData.battleUrl) || !isCurrentPageBattle()) {
        stopAllBattleAutomation('Auto step aborted: Wild Catch / Map active');
        return;
      }
      if (!teamBattleAutoCheck || !teamBattleAutoCheck.checked) {
        isBattleAutoRunning = false;
        return;
      }
      if (typeof config.action === 'function' && !config.disabled) {
        if (teamActionStatus) {
          teamActionStatus.textContent = 'Auto executing turn...';
          teamActionStatus.style.color = '#388bfd';
        }
        teamBattleActionBtn.disabled = true;
        config.action();
      } else if (isBattleAutoRunning && teamBattleAutoCheck && teamBattleAutoCheck.checked && !isMatchOver && !isWildHuntingOrCatchContext() && isCurrentPageBattle()) {
        // If DOM was mid-animation or action briefly unready, re-poll with jitter rather than static interval
        battleAutoStepTimer = setTimeout(() => {
          battleAutoStepTimer = null;
          if (!isUnlockChallengeActive && !isCaptchaAlarmActive && !isWildHuntingOrCatchContext() && isCurrentPageBattle() && delugeView && typeof delugeView.send === 'function') {
            delugeView.send('check-battle-opponents');
          }
        }, 650 + Math.floor(Math.random() * 350));
      }
    }, autoDelay);
  }
}

function renderAiBattleRoadmap(analysis) {
  if (!analysis || !analysis.counterRoadmap) return '';
  return `
    <div style="margin-top: 6px; background: #0c1524; border: 1px solid #1a283e; border-radius: 4px; padding: 6px 8px; box-shadow: none !important;">
      <div style="font-size: 9px; font-weight: 700; color: #8eaad0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: flex; justify-content: space-between;">
        <span>ROSTER COUNTER ROADMAP</span>
        <span style="color: #388bfd;">${analysis.counterRoadmap.length} Opponents</span>
      </div>
    </div>
  `;
}

function renderAiAssistantUI() {
  if (!aiAssistantModal) return;

  // Prioritize active on-screen Evolve dialog if present
  if (activeEvolveCardData) {
    handleEvolveCardDetected(activeEvolveCardData);
    return;
  }

  const analysis = aiAssistant ? aiAssistant.analyzeBattle(activeAiBattleData, currentCollection) : null;
  lastAnalyzedBattle = analysis;

  if (currentEvoFilter === 'MEGAS' || currentEvoFilter === 'ALL' || currentEvoFilter === 'BLOCKED') {
    if (selectedMovesPoke) {
      selectPokemonForMoves(selectedMovesPoke);
    } else if (selectedMegaPoke) {
      selectPokemonForMoves(selectedMegaPoke);
    } else if (cachedBoxMovesList && cachedBoxMovesList.length > 0) {
      selectPokemonForMoves(cachedBoxMovesList[0]);
    }
  } else {
    const uniqueReady = Array.isArray(cachedEvolveReadyList) ? cachedEvolveReadyList.filter(p => p && p.hasUnique) : [];
    const validSel = (selectedEvoPoke && uniqueReady.some(p => p.id === selectedEvoPoke.id && p.name === selectedEvoPoke.name))
      ? selectedEvoPoke
      : (uniqueReady[0] || null);
    if (validSel) {
      selectedEvoPoke = validSel;
      selectEvolvePokemon(validSel, validSel.bestBranch);
    } else {
      selectedEvoPoke = null;
      if (typeof clearActiveEvoDecisionPanel === 'function') {
        clearActiveEvoDecisionPanel('No Pending Evolutions', 'All Clear', 'No evolve-ready Pokemon');
      } else if (aiInstantActionSlot) {
        aiInstantActionSlot.innerHTML = '';
      }
    }
  }

  if (aiHudActionBtn) {
    aiHudActionBtn.style.display = 'none';
  }
}

function maybeRecoverStuckBattlePage(reason = 'Battle action stalled') {
  if (consecutiveStuckBattleActions < 4) return false;
  if ((Date.now() - lastBattleStallRecoveryTs) < 20000) return false;
  if (isUnlockChallengeActive || isCaptchaAlarmActive || isPendingSessionAutoStop || userManuallyPaused) return false;
  if (isWildHuntingOrCatchContext() || !isCurrentPageBattle()) return false;
  if (!isBattleAutoRunning && !(teamBattleAutoCheck && teamBattleAutoCheck.checked)) return false;

  const curUrl = (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '';
  if (!curUrl || isUnlockOrCaptchaUrl(curUrl)) return false;

  consecutiveStuckBattleActions = 0;
  lastStuckActionKey = '';
  scheduledAutoStepKey = '';
  battleActionInFlightUntil = 0;
  lastBattleStallRecoveryTs = Date.now();
  if (battleAutoStepTimer) {
    clearTimeout(battleAutoStepTimer);
    battleAutoStepTimer = null;
  }
  backendLog('BATTLE_STALL_RECOVERY', `Recovering stuck battle page (${reason}): reloading ${curUrl}`);
  if (teamActionStatus) {
    teamActionStatus.textContent = 'Battle stalled - reloading arena...';
    teamActionStatus.style.color = '#f59e0b';
  }
  if (delugeView && typeof delugeView.loadURL === 'function') {
    const seqBefore = guestLoadEventSeq;
    try {
      delugeView.loadURL(curUrl).catch(() => {});
    } catch (_) {}
    setTimeout(() => {
      if (guestLoadEventSeq === seqBefore && !isUnlockChallengeActive && !isCaptchaAlarmActive && typeof recoverHungWebviewAndLoad === 'function') {
        recoverHungWebviewAndLoad(curUrl, 'Stuck battle recovery').catch(() => {});
      }
    }, 3500);
  }
  return true;
}

let aiActionTimeoutTimer = null;
function executeAiBattleAction(action, payload) {
  if (isWildHuntingOrCatchContext() || !isCurrentPageBattle()) {
    stopAllBattleAutomation('Blocked AI battle action during Map / Auto-Catch');
    backendLog('AutoCatchGuard', `Blocked AI battle action "${action}" while wild catching or hunting on map.`);
    return;
  }
  if (isUnlockChallengeActive || isCaptchaAlarmActive) {
    if (battleAutoStepTimer) {
      clearTimeout(battleAutoStepTimer);
      battleAutoStepTimer = null;
    }
    isBattleAutoRunning = false;
    backendLog('SecurityChallenge', `Blocked battle action "${action}": Captcha active and unacknowledged.`);
    if (teamActionStatus) {
      teamActionStatus.textContent = 'Action Blocked: Captcha Active';
      teamActionStatus.style.color = '#ef4444';
    }
    if (aiStatusChip) {
      aiStatusChip.textContent = 'Captcha Active';
      aiStatusChip.style.color = '#ef4444';
    }
    return;
  }
  if (!delugeView) return;
  battleActionInFlightUntil = Date.now() + 1400;
  scheduledAutoStepKey = '';
  const curOpp0 = (activeAiBattleData && Array.isArray(activeAiBattleData.roster) && activeAiBattleData.roster[0]) ? activeAiBattleData.roster[0] : null;
  const curUsr0 = (activeAiBattleData && activeAiBattleData.userActivePokemon) ? activeAiBattleData.userActivePokemon : null;
  const targetDetail = (payload && (payload.moveName || payload.pokemonName || payload.itemName)) || '';
  const actionKey = `${action}|${targetDetail}|${(activeAiBattleData && activeAiBattleData.isPreparationScreen) ? 'prep' : 'act'}|${curOpp0 ? (curOpp0.name + ':' + curOpp0.hp) : ''}|${curUsr0 ? (curUsr0.name + ':' + curUsr0.hp) : ''}`;
  if (actionKey === lastStuckActionKey) {
    consecutiveStuckBattleActions++;
  } else {
    lastStuckActionKey = actionKey;
    consecutiveStuckBattleActions = 1;
  }
  if (consecutiveStuckBattleActions >= 5 && maybeRecoverStuckBattlePage('Repeated identical action: ' + actionKey)) {
    return;
  }
  if (aiStatusChip) {
    aiStatusChip.textContent = 'Applying...';
    aiStatusChip.style.color = '#388bfd';
  }
  if (teamActionStatus) {
    teamActionStatus.textContent = 'Applying...';
    teamActionStatus.style.color = '#388bfd';
  }
  if (action === 'switch-pokemon' && payload && payload.pokemonName) {
    justSwitchedActivePokemon.add(payload.pokemonName.toLowerCase());
    currentMatchParticipants.add(payload.pokemonName.toLowerCase());
    currentMatchSwitchCount++;
    if (typeof currentMatchCarryDefeated !== 'undefined' && currentMatchCarryDefeated && typeof currentMatchPostCarryDeployed !== 'undefined') {
      currentMatchPostCarryDeployed.add(String(payload.pokemonName).toLowerCase());
    }
  } else if (action === 'select-lead-and-start' && payload && payload.pokemonName) {
    currentMatchParticipants.add(payload.pokemonName.toLowerCase());
    if (typeof currentMatchCarryDefeated !== 'undefined' && currentMatchCarryDefeated && typeof currentMatchPostCarryDeployed !== 'undefined') {
      currentMatchPostCarryDeployed.add(String(payload.pokemonName).toLowerCase());
    }
    if (payload.isRelay) {
      justSwitchedActivePokemon.add(payload.pokemonName.toLowerCase());
      currentMatchSwitchCount++;
    }
  } else if (action === 'execute-battle-move') {
    justSwitchedActivePokemon.clear();
    lastTurnActionType = 'execute-battle-move';
  } else if (action === 'use-battle-item') {
    justSwitchedActivePokemon.clear();
    currentMatchItemCount++;
    lastTurnActionType = 'use-battle-item';
    backendLog('BOT_ACTION', `execute-battle-action: use-battle-item (${payload && payload.itemName ? payload.itemName : 'Full Restore'}) (match item count: ${currentMatchItemCount})`);
  } else if (action === 'forfeit-battle' || action === 'click-rematch-button') {
    healLastKnownUserTeamForNewMatch();
  }
  if (teamBattleActionBtn) {
    teamBattleActionBtn.disabled = true;
  }
  if (aiActionTimeoutTimer) clearTimeout(aiActionTimeoutTimer);
  aiActionTimeoutTimer = setTimeout(() => {
    if (aiStatusChip && aiStatusChip.textContent === 'Applying...') {
      aiStatusChip.textContent = 'Ready';
      aiStatusChip.style.color = '#8eaad0';
    }
    if (teamActionStatus && teamActionStatus.textContent === 'Applying...') {
      teamActionStatus.textContent = '';
    }
    if (teamBattleActionBtn && !isUnlockChallengeActive && !isCaptchaAlarmActive && isCurrentPageBattle() && !isWildHuntingOrCatchContext()) {
      teamBattleActionBtn.disabled = false;
    }
  }, 4000);
  if (action === 'click-rematch-button') {
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('click-rematch-button');
    }
  }
  delugeView.send('apply-ai-battle-action', Object.assign({ action: action }, payload || {}));
}

function equipAiCarryToSlot1(carryObj) {
  if (!carryObj || !delugeView) return;
  let targetTeam = (lastRecommendedTeam && lastRecommendedTeam.length > 0) ? [...lastRecommendedTeam] : [];
  if (targetTeam.length === 0 && Array.isArray(currentCollection)) {
    targetTeam = currentCollection.slice(0, 6);
  }
  const filtered = targetTeam.filter(p => p.id !== carryObj.id);
  const newTeam = [carryObj, ...filtered].slice(0, 6);
  lastRecommendedTeam = newTeam;
  lastAppliedTeamSnapshot = newTeam.map(p => Object.assign({}, p));
  const ids = newTeam.map(p => p.id);
  delugeView.send('apply-team-slots', { pokemonIds: ids, pokemons: newTeam });
  if (aiStatusChip) {
    aiStatusChip.textContent = 'Equipping Carry...';
    aiStatusChip.style.color = '#388bfd';
  }
  appendAiChatMessage('AI', `Equipping ${formatPokemonFullName(carryObj.variant, carryObj.name)} to Slot 1.`);
}

function appendAiChatMessage(sender, text, isHtml = false) {
  if (!aiChatStream) return;
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '6px';
  row.style.alignItems = 'flex-start';
  if (sender === 'USER') {
    row.style.justifyContent = 'flex-end';
    row.innerHTML = `<div style="background: #1f6feb; border: 1px solid #388bfd; border-radius: 4px; padding: 5px 8px; font-size: 10.5px; color: #ffffff; line-height: 1.35; max-width: 85%; box-shadow: none !important;">${escapeHtml(text)}</div>`;
  } else {
    const isFormattedCard = isHtml || (typeof text === 'string' && text.trim().startsWith('<div'));
    const content = isFormattedCard ? text : `<div style="background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px; padding: 5px 8px; font-size: 10.5px; color: #e0ecfa; line-height: 1.35; max-width: 85%; box-shadow: none !important;">${escapeHtml(text)}</div>`;
    row.innerHTML = `<span style="font-size: 12px; flex-shrink: 0; line-height: 1;">&#129302;</span>${content}`;
  }
  aiChatStream.appendChild(row);
  aiChatStream.scrollTop = aiChatStream.scrollHeight;
}

function handleAiChatSubmit() {
  if (!aiChatInput) return;
  const q = (aiChatInput.value || '').trim();
  if (!q) return;
  aiChatInput.value = '';
  appendAiChatMessage('USER', q);

  const carry = (lastRecommendedTeam && lastRecommendedTeam.length > 0) ? lastRecommendedTeam[0] : null;
  const ans = aiAssistant ? aiAssistant.askAssistant(q, { battle: activeAiBattleData, carry: carry, collection: currentCollection }) : 'I am monitoring the battle.';
  setTimeout(() => {
    appendAiChatMessage('AI', ans);
  }, 120);
}

// Event Listeners for AI Combat Assistant
if (aiAssistantTopBtn) {
  aiAssistantTopBtn.addEventListener('click', toggleAiAssistantPanel);
}
if (aiAssistantMenuBtn) {
  aiAssistantMenuBtn.addEventListener('click', () => {
    closeNavDropdown();
    toggleAiAssistantPanel();
  });
}
if (closeAiAssistantBtn) {
  closeAiAssistantBtn.addEventListener('click', closeAiAssistantPanel);
}
if (switchTeamBuilderFromAiBtn) {
  switchTeamBuilderFromAiBtn.addEventListener('click', () => {
    closeAiAssistantPanel();
    openTeamBuilderPanel();
  });
}
if (switchAiAssistantFromTeamBtn) {
  switchAiAssistantFromTeamBtn.addEventListener('click', () => {
    closeTeamBuilderPanel();
    openAiAssistantPanel();
  });
}
if (aiHudExpandBtn) {
  aiHudExpandBtn.addEventListener('click', openAiAssistantPanel);
}
if (aiHudDismissBtn) {
  aiHudDismissBtn.addEventListener('click', () => {
    if (liveAiHudOverlay) liveAiHudOverlay.style.display = 'none';
  });
}
if (aiQuickEvoBtn) {
  aiQuickEvoBtn.addEventListener('click', () => {
    let target = 'Eevee';
    const carry = (lastRecommendedTeam && lastRecommendedTeam.length > 0) ? lastRecommendedTeam[0] : null;
    if (activeEvolveCardData && activeEvolveCardData.fullName) {
      target = activeEvolveCardData.fullName;
    } else if (activeAiBattleData && activeAiBattleData.roster && activeAiBattleData.roster.length > 0) {
      target = activeAiBattleData.roster[0].name;
    } else if (carry && carry.pokemon) {
      target = carry.pokemon.name;
    } else if (Array.isArray(currentCollection) && currentCollection.length > 0) {
      const cand = currentCollection.find(p => ['eevee', 'applin', 'tyrogue', 'scyther', 'slowpoke', 'charcadet', 'poliwag', 'abra', 'gastly', 'charmander'].includes(getBaseSpecies(p.name).toLowerCase()));
      if (cand) target = cand.name;
    }
    appendAiChatMessage('USER', `Best evolution for ${target}`);
    const ans = aiAssistant ? aiAssistant.askAssistant(`evolve ${target}`, { battle: activeAiBattleData, carry: carry, collection: currentCollection, activeEvolveCard: activeEvolveCardData }) : '';
    setTimeout(() => {
      appendAiChatMessage('AI', ans);
    }, 100);
  });
}
if (aiQuickMovesBtn) {
  aiQuickMovesBtn.addEventListener('click', () => {
    let target = 'Charizard';
    let targetMoves = [];
    const carry = (lastRecommendedTeam && lastRecommendedTeam.length > 0) ? lastRecommendedTeam[0] : null;
    if (activeEvolveCardData && activeEvolveCardData.fullName) {
      const evoAnalysis = aiAssistant ? aiAssistant.analyzeEvolutionPath(activeEvolveCardData.baseSpecies || activeEvolveCardData.fullName, currentCollection) : null;
      target = (evoAnalysis && evoAnalysis.bestBranch) ? evoAnalysis.bestBranch.name : (activeEvolveCardData.options && activeEvolveCardData.options.length > 0 ? (activeEvolveCardData.options[0].fullName || activeEvolveCardData.options[0].name) : activeEvolveCardData.fullName);
      targetMoves = activeEvolveCardData.moves || [];
    } else if (carry && carry.pokemon) {
      target = carry.pokemon.name;
      targetMoves = carry.pokemon.moves || [];
    } else if (activeAiBattleData && activeAiBattleData.roster && activeAiBattleData.roster.length > 0) {
      target = activeAiBattleData.roster[0].name;
    } else if (Array.isArray(currentCollection) && currentCollection.length > 0) {
      target = currentCollection[0].name;
      targetMoves = currentCollection[0].moves || [];
    }
    appendAiChatMessage('USER', `Best attack moves for ${target}`);
    const ans = aiAssistant ? aiAssistant.askAssistant(`moves for ${target}`, { battle: activeAiBattleData, carry: carry, collection: currentCollection, activeEvolveCard: activeEvolveCardData, selectedPokemon: { name: target, moves: targetMoves } }) : '';
    setTimeout(() => {
      appendAiChatMessage('AI', ans);
    }, 100);
  });
}
if (aiQuickAnalyzeBtn) {
  aiQuickAnalyzeBtn.addEventListener('click', () => {
    appendAiChatMessage('USER', 'Matchup analysis');
    const analysis = aiAssistant ? aiAssistant.analyzeBattle(activeAiBattleData, currentCollection) : null;
    if (analysis) {
      const msg = analysis.callout + (analysis.hazards && analysis.hazards.length ? ' ' + analysis.hazards.join('. ') : '');
      appendAiChatMessage('AI', msg);
    }
  });
}
if (aiQuickWhyBtn) {
  aiQuickWhyBtn.addEventListener('click', () => {
    appendAiChatMessage('USER', 'Why this carry?');
    const carry = (lastRecommendedTeam && lastRecommendedTeam.length > 0) ? lastRecommendedTeam[0] : null;
    const ans = aiAssistant ? aiAssistant.askAssistant('Why this carry?', { battle: activeAiBattleData, carry: carry }) : '';
    appendAiChatMessage('AI', ans);
  });
}
if (aiQuickHazardsBtn) {
  aiQuickHazardsBtn.addEventListener('click', () => {
    appendAiChatMessage('USER', 'Check enemy hazards');
    const ans = aiAssistant ? aiAssistant.askAssistant('What are the opponent weaknesses and hazards?', { battle: activeAiBattleData }) : '';
    appendAiChatMessage('AI', ans);
  });
}
if (aiQuickSimBtn) {
  aiQuickSimBtn.addEventListener('click', () => handleRunMonteCarloSimulation());
}
if (aiChatSendBtn) {
  aiChatSendBtn.addEventListener('click', handleAiChatSubmit);
}
if (aiChatInput) {
  aiChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAiChatSubmit();
    }
  });
}

// Event Listeners for Evolution & Moves Decision Maker
if (evoFilterUniqueBtn) {
  evoFilterUniqueBtn.addEventListener('click', () => setEvoFilter('UNIQUE'));
}
if (evoFilterMegasBtn) {
  evoFilterMegasBtn.addEventListener('click', () => setEvoFilter('MEGAS'));
}
if (evoFilterAllBtn) {
  evoFilterAllBtn.addEventListener('click', () => setEvoFilter('ALL'));
}
if (evoFilterBlockedBtn) {
  evoFilterBlockedBtn.addEventListener('click', () => setEvoFilter('BLOCKED'));
}
if (evoSearchInput) {
  evoSearchInput.addEventListener('input', (e) => {
    currentEvoSearch = (e.target.value || '').trim().toLowerCase();
    renderEvolutionDecisionMakerUI();
  });
}
if (refreshEvoBoxBtn) {
  refreshEvoBoxBtn.addEventListener('click', () => refreshEvolveBoxList());
}

// =============================================================================
// DELUGERPG DEFENSE-IN-DEPTH SAFETY & RANDOMIZED ANTI-BAN CONTROLLER
// =============================================================================

const DAILY_SAFETY_STORAGE_KEY = 'deluge_daily_safety_state';

let dailySafetyState = {
  date: getTodayDateKey(),
  todaySteps: 0,
  todayCatches: 0,
  dailyStepCeiling: null,
  dailyCatchCeiling: null
};

function getRandomInRange(min, max) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function ensureTodaySafetyState() {
  const todayKey = getTodayDateKey();
  const s = config.safety || {};
  if (dailySafetyState.date !== todayKey) {
    dailySafetyState.date = todayKey;
    dailySafetyState.todaySteps = 0;
    dailySafetyState.todayCatches = 0;
    dailySafetyState.dailyStepCeiling = getRandomInRange(s.dailyStepMin || 500, s.dailyStepMax || 1000);
    dailySafetyState.dailyCatchCeiling = getRandomInRange(s.dailyCatchMin || 10, s.dailyCatchMax || 20);
    saveDailySafetyState();
  } else {
    if (!dailySafetyState.dailyStepCeiling || typeof dailySafetyState.dailyStepCeiling !== 'number') {
      dailySafetyState.dailyStepCeiling = getRandomInRange(s.dailyStepMin || 500, s.dailyStepMax || 1000);
      saveDailySafetyState();
    }
    if (!dailySafetyState.dailyCatchCeiling || typeof dailySafetyState.dailyCatchCeiling !== 'number') {
      dailySafetyState.dailyCatchCeiling = getRandomInRange(s.dailyCatchMin || 10, s.dailyCatchMax || 20);
      saveDailySafetyState();
    }
  }
}

function loadDailySafetyState() {
  const todayKey = getTodayDateKey();
  let loaded = null;
  const s = config.safety || {};

  try {
    const raw = readDataFile('daily_safety_log.json');
    if (raw) loaded = JSON.parse(raw);
  } catch (_) {}

  if (!loaded) {
    try {
      const raw = localStorage.getItem(DAILY_SAFETY_STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (_) {}
  }

  if (loaded && typeof loaded === 'object') {
    if (loaded.date === todayKey) {
      dailySafetyState.date = todayKey;
      dailySafetyState.todaySteps = (typeof loaded.todaySteps === 'number') ? loaded.todaySteps : 0;
      dailySafetyState.todayCatches = (typeof loaded.todayCatches === 'number') ? loaded.todayCatches : 0;
      dailySafetyState.dailyStepCeiling = (typeof loaded.dailyStepCeiling === 'number') ? loaded.dailyStepCeiling : getRandomInRange(s.dailyStepMin || 500, s.dailyStepMax || 1000);
      dailySafetyState.dailyCatchCeiling = (typeof loaded.dailyCatchCeiling === 'number') ? loaded.dailyCatchCeiling : getRandomInRange(s.dailyCatchMin || 10, s.dailyCatchMax || 20);
    } else {
      dailySafetyState.date = todayKey;
      dailySafetyState.todaySteps = 0;
      dailySafetyState.todayCatches = 0;
      dailySafetyState.dailyStepCeiling = getRandomInRange(s.dailyStepMin || 500, s.dailyStepMax || 1000);
      dailySafetyState.dailyCatchCeiling = getRandomInRange(s.dailyCatchMin || 10, s.dailyCatchMax || 20);
    }
  } else {
    dailySafetyState.date = todayKey;
    dailySafetyState.todaySteps = 0;
    dailySafetyState.todayCatches = 0;
    dailySafetyState.dailyStepCeiling = getRandomInRange(s.dailyStepMin || 500, s.dailyStepMax || 1000);
    dailySafetyState.dailyCatchCeiling = getRandomInRange(s.dailyCatchMin || 10, s.dailyCatchMax || 20);
  }

  saveDailySafetyState();
  updateSafetyTelemetryUI();
}

function saveDailySafetyState() {
  try {
    const jsonStr = JSON.stringify(dailySafetyState, null, 2);
    localStorage.setItem(DAILY_SAFETY_STORAGE_KEY, jsonStr);
    const filePath = getWritableDataPath('daily_safety_log.json');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tempPath = filePath + '.tmp';
    const bakPath = filePath + '.bak';
    fs.writeFileSync(tempPath, jsonStr, 'utf8');
    if (fs.existsSync(filePath)) {
      try { fs.copyFileSync(filePath, bakPath); } catch (_) {}
    }
    fs.renameSync(tempPath, filePath);
  } catch (_) {}
}

// --- Map Rotation Engine ---
let mapRotationTimer = null;
let nextMapRotationTime = null;
let mapRotationTargetMins = 0;
let isMapRotationDue = false;
let isMapRotatingNow = false;
let wasHuntingBeforeMapRotation = false;
let lastTargetFoundTime = 0;

function isMapRotationActive() {
  const s = config.safety || {};
  const c = config.settings || {};
  return (s.enableMapRotation === true || c.randomMapHopping === true);
}

function scheduleNextMapRotation(customDelayMs = null) {
  if (mapRotationTimer) {
    clearTimeout(mapRotationTimer);
    mapRotationTimer = null;
  }
  if (!isMapRotationActive()) {
    nextMapRotationTime = null;
    isMapRotationDue = false;
    return;
  }

  const s = config.safety || {};
  const minMins = Math.max(1, parseInt(s.mapRotationMinMinutes, 10) || 10);
  const maxMins = Math.max(minMins, parseInt(s.mapRotationMaxMinutes, 10) || 30);
  const targetMins = getRandomInRange(minMins, maxMins);
  mapRotationTargetMins = targetMins;
  const delayMs = customDelayMs !== null ? customDelayMs : targetMins * 60 * 1000;
  nextMapRotationTime = Date.now() + delayMs;

  mapRotationTimer = setTimeout(() => {
    onMapRotationTimerTrigger();
  }, delayMs);

  backendLog('MapRotation', `Scheduled next random map rotation in ${targetMins} mins`);
}

function onMapRotationTimerTrigger() {
  isMapRotationDue = true;
  if (canExecuteMapTransition()) {
    executeMapRotation('hunting_interval');
  } else {
    backendLog('MapRotation', 'Rotation timer fired, but client is busy. Queued for next safe map turn boundary or post-catch.');
  }
}

function canExecuteMapTransition() {
  if (!isRunning && !wasHuntingBeforeAutoCatch) return false;
  if (!isCurrentPageMap()) return false;
  if (isEncounterOnScreen) return false;
  if (targetEncounterActive) return false;
  if (isAutoCatchCountdownActive) return false;
  if (wasHuntingBeforeAutoCatch) return false;
  if (isGuestInputFocused) return false;
  if (isUnlockChallengeActive) return false;
  if (isCurrentPageBattle()) return false;
  if (activeAiBattleData) return false;
  if (isStepPending) return false;
  if (isMapRotatingNow) return false;
  if (lastTargetFoundTime && (Date.now() - lastTargetFoundTime < 30000)) return false;
  return true;
}

function executeMapRotation(triggerReason = 'hunting_interval') {
  if (!isMapRotationActive()) {
    isMapRotationDue = false;
    return;
  }
  if (isMapRotatingNow) return;

  // STRICT TARGET PRIORITY: If an encounter is on screen or target detected at the same time, CATCH FIRST!
  if (triggerReason !== 'post_catch' && !canExecuteMapTransition()) {
    isMapRotationDue = true;
    backendLog('MapRotation', `Target encounter detected / client busy [${triggerReason}]. Deferring map rotation: CATCH FIRST!`);
    return;
  }

  wasHuntingBeforeMapRotation = isRunning;
  isMapRotatingNow = true;
  isMapRotationDue = false;

  if (walkTimeout) {
    clearTimeout(walkTimeout);
    walkTimeout = null;
  }

  let curUrl = '';
  try {
    curUrl = (delugeView && typeof delugeView.getURL === 'function') ? delugeView.getURL() : '';
  } catch (_) {}

  const allowedZones = (config.safety && Array.isArray(config.safety.mapRotationZones) && config.safety.mapRotationZones.length > 0)
    ? config.safety.mapRotationZones
    : null;
  const nextMap = mapsCatalog.getRandomDelugeMap(curUrl, allowedZones);
  if (!nextMap) {
    isMapRotatingNow = false;
    return;
  }

  const targetUrl = 'https://www.delugerpg.com' + nextMap.url;
  updateStatus(`Rotating: ${nextMap.title}...`, '#38bdf8');
  backendLog('MapRotation', `Executing rotation to ${nextMap.title} (${nextMap.url}) [Trigger: ${triggerReason}]`);

  wanderStepsLeft = 0;
  currentDirectionKey = null;

  try {
    if (delugeView && typeof delugeView.loadURL === 'function') {
      delugeView.loadURL(targetUrl).catch(() => {
        if (delugeView) delugeView.src = targetUrl;
      });
    } else if (delugeView) {
      delugeView.src = targetUrl;
    }
  } catch (err) {
    backendLog('MapRotation', `Error navigating to ${targetUrl}: ${err.message}`);
  }

  setTimeout(() => {
    isMapRotatingNow = false;
  }, 3500);

  scheduleNextMapRotation();
}

let sessionStartTime = null;
let sessionAutoStopTime = null;
let sessionAutoStopTargetMins = null;
let sessionAutoStopTimer = null;

let stepsSinceLastBreak = 0;
let nextBreakStepTarget = null;
let nextBreakDurationSec = null;
let isRestBreakActive = false;
let breakCountdownTimer = null;

function rollNextBreakTargets() {
  const s = config.safety || {};
  nextBreakStepTarget = getRandomInRange(s.breakMinSteps || 50, s.breakMaxSteps || 200);
  nextBreakDurationSec = getRandomInRange(s.breakMinDurationSec || 45, s.breakMaxDurationSec || 200);
}

function stopHuntingWithReason(reason = 'Safety limit reached', statusMsg = 'Paused (Safety Limit)', statusColor = '#ef4444') {
  cancelPendingAutoStart(reason);
  userManuallyPaused = true;
  isRunning = false;
  if (walkTimeout) {
    clearTimeout(walkTimeout);
    walkTimeout = null;
  }
  if (sessionAutoStopTimer) {
    clearTimeout(sessionAutoStopTimer);
    sessionAutoStopTimer = null;
  }
  sessionAutoStopTime = null;
  if (mapRotationTimer) {
    clearTimeout(mapRotationTimer);
    mapRotationTimer = null;
  }
  nextMapRotationTime = null;
  isMapRotationDue = false;
  isMapRotatingNow = false;
  if (breakCountdownTimer) {
    clearInterval(breakCountdownTimer);
    breakCountdownTimer = null;
  }
  isRestBreakActive = false;
  try {
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('abort-autocatch');
    }
  } catch (_) {}
  updateToggleButton();
  updateStatus(statusMsg, statusColor);
  syncHuntingState();
  updateSafetyTelemetryUI();
  backendLog('SafetyHalt', `${reason}: ${statusMsg}`);
}

function triggerForcedRestBreak() {
  isRestBreakActive = true;
  const breakDuration = nextBreakDurationSec || 45;
  backendLog('SafetyBreak', `Forced rest break triggered at ${stepsSinceLastBreak} steps. Resting for ${breakDuration}s.`);

  stepsSinceLastBreak = 0;
  rollNextBreakTargets();

  let remainingSec = breakDuration;
  updateStatus(`Rest break (${remainingSec}s)...`, '#e879f9');
  updateSafetyTelemetryUI();

  if (breakCountdownTimer) clearInterval(breakCountdownTimer);
  breakCountdownTimer = setInterval(() => {
    remainingSec--;
    if (!isRunning || !isRestBreakActive || remainingSec <= 0) {
      clearInterval(breakCountdownTimer);
      breakCountdownTimer = null;
      if (isRunning && isRestBreakActive) {
        isRestBreakActive = false;
        backendLog('SafetyBreak', 'Rest break finished. Resuming hunting.');
        updateStatus('Resuming...', '#10b981');
        updateSafetyTelemetryUI();
      }
    } else {
      updateStatus(`Rest break (${remainingSec}s)...`, '#e879f9');
      updateSafetyTelemetryUI();
    }
  }, 1000);

  scheduleNextStep(breakDuration * 1000);
}

// Continuous Alarm Siren Engine
let captchaAlarmInterval = null;
let isCaptchaAlarmActive = false;
let preCaptchaBattlePrefs = null;

function capturePreCaptchaBattlePrefs() {
  if (typeof capturePostCaptchaTrainingContext === 'function') {
    capturePostCaptchaTrainingContext();
  }
  if (!preCaptchaBattlePrefs && (teamBattleAutoCheck || teamBattleLoopCheck)) {
    preCaptchaBattlePrefs = {
      autoChecked: Boolean(teamBattleAutoCheck && teamBattleAutoCheck.checked),
      loopChecked: Boolean(teamBattleLoopCheck && teamBattleLoopCheck.checked)
    };
  }
}

function restorePreCaptchaBattlePrefs() {
  if (!preCaptchaBattlePrefs) return;
  const saved = preCaptchaBattlePrefs;
  preCaptchaBattlePrefs = null;
  if (teamBattleAutoCheck && saved.autoChecked) {
    teamBattleAutoCheck.checked = true;
    isBattleAutoRunning = true;
    if (teamBattleAutoLabel) {
      teamBattleAutoLabel.style.borderColor = '#388bfd';
      teamBattleAutoLabel.style.color = '#58a6ff';
    }
  }
  const trainingDone = Boolean(!isGMaxChallengeModeActive() && typeof areAllTeamPokemonLevel100 === 'function' && areAllTeamPokemonLevel100());
  if (teamBattleLoopCheck && teamBattleAutoCheck && teamBattleAutoCheck.checked && saved.loopChecked && !trainingDone) {
    teamBattleLoopCheck.disabled = false;
    teamBattleLoopCheck.checked = true;
  }
  updateLoopCheckboxVisual();
}

function playEmergencyBeep(freq = 600, duration = 0.25) {
  if (!soundEnabled) return;
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const entry = { osc, gain };
    activeAudioNodes.add(entry);
    osc.onended = () => activeAudioNodes.delete(entry);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function playAlarmPulse() {
  if (!soundEnabled) return;
  playEmergencyBeep(520, 0.2);
  setTimeout(() => {
    if (isCaptchaAlarmActive && soundEnabled) {
      playEmergencyBeep(880, 0.25);
    }
  }, 220);
}

function startContinuousCaptchaAlarm() {
  capturePreCaptchaBattlePrefs();
  stopAllBattleAutomation('Captcha alarm active');
  if (typeof stopAutoEvolveCycle === 'function') stopAutoEvolveCycle('Captcha active');
  if (teamBattleLoopCheck) {
    teamBattleLoopCheck.checked = false;
  }
  updateLoopCheckboxVisual();

  if (isCaptchaAlarmActive) return;
  isCaptchaAlarmActive = true;
  lastCaptchaHaltDispatchTs = Date.now();

  if (captchaEmergencyBanner) {
    captchaEmergencyBanner.style.display = 'flex';
  }

  playAlarmPulse();

  if (captchaAlarmInterval) {
    clearInterval(captchaAlarmInterval);
  }
  captchaAlarmInterval = setInterval(() => {
    if (!isCaptchaAlarmActive) {
      clearInterval(captchaAlarmInterval);
      captchaAlarmInterval = null;
      return;
    }
    playAlarmPulse();
  }, 900);
}

function silenceCaptchaAlarm() {
  isCaptchaAlarmActive = false;
  pendingUnlockRedirectUntil = 0;
  if (typeof captchaRecheckTimer !== 'undefined' && captchaRecheckTimer) {
    if (typeof clearTimeout === 'function') clearTimeout(captchaRecheckTimer);
    captchaRecheckTimer = null;
  }
  if (captchaAlarmInterval) {
    clearInterval(captchaAlarmInterval);
    captchaAlarmInterval = null;
  }
  if (captchaEmergencyBanner) {
    captchaEmergencyBanner.style.display = 'none';
  }
  isUnlockChallengeActive = false;
  userManuallyPaused = false;
  restorePreCaptchaBattlePrefs();
  updateStatus('Ready (Captcha Alarm Silenced)', '#10b981');
  backendLog('SecurityChallenge', 'Captcha alarm acknowledged and cleared.');

  // Re-enable all desktop client action functions and buttons upon user acknowledgment
  if (battleOpponentBtn) battleOpponentBtn.disabled = false;
  if (typeof syncTeamActionButtonsState === 'function') {
    syncTeamActionButtonsState();
  } else if (applyTeamBtn) {
    applyTeamBtn.disabled = !(Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.length > 0);
  }
  if (buildTeamBtn) buildTeamBtn.disabled = false;
  if (pvpScoutBtn) pvpScoutBtn.disabled = false;
  if (checkLiveBattleBtn) checkLiveBattleBtn.disabled = false;
  if (teamActionStatus && teamActionStatus.textContent.includes('Captcha')) {
    teamActionStatus.textContent = '';
  }

  updateTeamBuilderBattleAction(activeAiBattleData);
  renderAiAssistantUI();
  if (typeof schedulePostCaptchaTrainingResume === 'function') {
    schedulePostCaptchaTrainingResume();
  }
}

let lastCaptchaHaltDispatchTs = 0;
function handleCaptchaEmergencyHalt(reason = 'Captcha challenge detected') {
  const alreadyHalted = isUnlockChallengeActive;
  const nowTs = Date.now();
  capturePreCaptchaBattlePrefs();
  stopAllBattleAutomation(reason);
  if (typeof clearPendingTrainingRotation === 'function') {
    clearPendingTrainingRotation(reason, { preserveResume: true });
  }
  if (typeof stopAutoEvolveCycle === 'function') stopAutoEvolveCycle('Captcha active');
  pendingGmaxEntryFlow = null;
  if (teamBattleAutoCheck) {
    teamBattleAutoCheck.checked = false;
  }
  if (teamBattleLoopCheck) {
    teamBattleLoopCheck.checked = false;
  }
  updateLoopCheckboxVisual();
  cancelPendingAutoStart(reason);
  if (walkTimeout) {
    clearTimeout(walkTimeout);
    walkTimeout = null;
  }
  if (sessionAutoStopTimer) {
    clearTimeout(sessionAutoStopTimer);
    sessionAutoStopTimer = null;
  }
  sessionAutoStopTime = null;
  if (breakCountdownTimer) {
    clearInterval(breakCountdownTimer);
    breakCountdownTimer = null;
  }
  isRestBreakActive = false;
  isRunning = false;
  userManuallyPaused = true;
  if (alreadyHalted && (nowTs - lastCaptchaHaltDispatchTs) < 2500) {
    return;
  }
  lastCaptchaHaltDispatchTs = nowTs;
  try {
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('abort-autocatch');
      delugeView.send('abort-gmax-challenge-flow');
      delugeView.send('abort-scan-trainer-rosters');
    }
  } catch (_) {}
  updateToggleButton();
  updateStatus('CAPTCHA DETECTED - Solve manually in window', '#ef4444');
  syncHuntingState();

  if (!isUnlockChallengeActive) {
    isUnlockChallengeActive = true;
    backendLog('SecurityChallenge', `${reason}. Automated hunting halted for manual solve.`);
    try {
      new Notification('Security Check Detected', {
        body: 'DelugeRPG requires a captcha. Please solve it manually in the window to proceed.'
      });
    } catch (_) {}
  }

  // Strictly disable all desktop client action functions and buttons until captcha is acknowledged
  if (teamBattleActionBtn) {
    teamBattleActionBtn.disabled = true;
    teamBattleActionBtn.innerHTML = '&#9888; Captcha Active (Disabled)';
    teamBattleActionBtn.title = 'Disabled: Captcha challenge active. Acknowledge or solve captcha to resume.';
  }
  if (battleOpponentBtn) battleOpponentBtn.disabled = true;
  if (applyTeamBtn) applyTeamBtn.disabled = true;
  if (buildTeamBtn) buildTeamBtn.disabled = true;
  if (pvpScoutBtn) pvpScoutBtn.disabled = true;
  if (checkLiveBattleBtn) checkLiveBattleBtn.disabled = true;
  if (aiHudActionBtn) aiHudActionBtn.disabled = true;
  if (teamActionStatus) {
    teamActionStatus.textContent = 'Actions Disabled: Captcha Active';
    teamActionStatus.style.color = '#ef4444';
  }

  updateTeamBuilderBattleAction(activeAiBattleData);
  renderAiAssistantUI();

  if (!config.safety || config.safety.antiBotEmergencyHalt !== false) {
    startContinuousCaptchaAlarm();
  }

  if (delugeView) {
    try { delugeView.focus(); } catch (_) {}
  }
}

function loadSafetySettingsIntoUI() {
  const s = config.safety || {};
  if (safetyAutoStopToggle) safetyAutoStopToggle.checked = s.enableDeadManSwitch !== false;
  if (safetyAutoStopMin) safetyAutoStopMin.value = s.autoStopMinMinutes || 5;
  if (safetyAutoStopMax) safetyAutoStopMax.value = s.autoStopMaxMinutes || 30;

  if (safetySpeedToggle) safetySpeedToggle.checked = s.enableMovementSpeed !== false;
  const displaySpdMin = (typeof s.movementSpeedMinSec === 'number' && s.movementSpeedMinSec > 0) ? Math.max(1.7, s.movementSpeedMinSec) : 1.7;
  const displaySpdMax = (typeof s.movementSpeedMaxSec === 'number' && s.movementSpeedMaxSec > 0) ? Math.max(parseFloat((displaySpdMin + 0.3).toFixed(2)), s.movementSpeedMaxSec) : 2.8;
  if (safetySpeedMin) safetySpeedMin.value = displaySpdMin;
  if (safetySpeedMax) safetySpeedMax.value = displaySpdMax;

  if (safetyMapRotationToggle) safetyMapRotationToggle.checked = (s.enableMapRotation === true || (config.settings && config.settings.randomMapHopping === true));
  if (safetyMapRotationMin) safetyMapRotationMin.value = s.mapRotationMinMinutes || 10;
  if (safetyMapRotationMax) safetyMapRotationMax.value = s.mapRotationMaxMinutes || 30;
  updateRandomMapUI();

  if (safetyBreakToggle) safetyBreakToggle.checked = s.enableForcedBreaks !== false;
  if (safetyBreakMinSteps) safetyBreakMinSteps.value = s.breakMinSteps || 50;
  if (safetyBreakMaxSteps) safetyBreakMaxSteps.value = s.breakMaxSteps || 200;
  if (safetyBreakMinDur) safetyBreakMinDur.value = s.breakMinDurationSec || 45;
  if (safetyBreakMaxDur) safetyBreakMaxDur.value = s.breakMaxDurationSec || 200;

  if (safetyDailyToggle) safetyDailyToggle.checked = s.enableDailyCeilings !== false;
  if (safetyDailyMinSteps) safetyDailyMinSteps.value = s.dailyStepMin || 500;
  if (safetyDailyMaxSteps) safetyDailyMaxSteps.value = s.dailyStepMax || 1000;
  if (safetyDailyMinCatches) safetyDailyMinCatches.value = s.dailyCatchMin || 10;
  if (safetyDailyMaxCatches) safetyDailyMaxCatches.value = s.dailyCatchMax || 20;

  if (safetyAntiBotToggle) safetyAntiBotToggle.checked = s.antiBotEmergencyHalt !== false;

  const defaultZones = ['overworld', 'snowcave', 'volcano', 'rockcave', 'pkmnmansion', 'pkmntower', 'powerplant', 'unownruins'];
  const activeZones = (s && Array.isArray(s.mapRotationZones) && s.mapRotationZones.length > 0)
    ? s.mapRotationZones
    : defaultZones;
  document.querySelectorAll('.safety-zone-checkbox').forEach(cb => {
    cb.checked = activeZones.includes(cb.value);
  });

  updateSafetyTelemetryUI();
}

function saveSafetySettingsFromUI() {
  if (!config.safety) config.safety = {};

  const autoMin = Math.max(1, parseInt(safetyAutoStopMin.value, 10) || 5);
  const autoMax = Math.max(autoMin, parseInt(safetyAutoStopMax.value, 10) || 30);

  const bStepMin = Math.max(5, parseInt(safetyBreakMinSteps.value, 10) || 50);
  const bStepMax = Math.max(bStepMin, parseInt(safetyBreakMaxSteps.value, 10) || 200);
  const bDurMin = Math.max(5, parseInt(safetyBreakMinDur.value, 10) || 45);
  const bDurMax = Math.max(bDurMin, parseInt(safetyBreakMaxDur.value, 10) || 200);

  const dStepMin = Math.max(50, parseInt(safetyDailyMinSteps.value, 10) || 500);
  const dStepMax = Math.max(dStepMin, parseInt(safetyDailyMaxSteps.value, 10) || 1000);
  const dCatchMin = Math.max(1, parseInt(safetyDailyMinCatches.value, 10) || 10);
  const dCatchMax = Math.max(dCatchMin, parseInt(safetyDailyMaxCatches.value, 10) || 20);

  config.safety.enableDeadManSwitch = safetyAutoStopToggle ? safetyAutoStopToggle.checked : true;
  config.safety.autoStopMinMinutes = autoMin;
  config.safety.autoStopMaxMinutes = autoMax;

  let spdMin = safetySpeedMin ? parseFloat(safetySpeedMin.value) : 1.7;
  let spdMax = safetySpeedMax ? parseFloat(safetySpeedMax.value) : 2.8;
  if (isNaN(spdMin) || spdMin <= 0) spdMin = 1.7;
  if (isNaN(spdMax) || spdMax <= 0) spdMax = 2.8;
  if (spdMin > 50) spdMin = spdMin / 1000;
  if (spdMax > 50) spdMax = spdMax / 1000;
  spdMin = Math.max(1.7, spdMin);
  if (spdMax < spdMin + 0.3) spdMax = parseFloat((spdMin + 0.3).toFixed(2));
  if (safetySpeedMin) safetySpeedMin.value = spdMin.toFixed(1);
  if (safetySpeedMax) safetySpeedMax.value = spdMax.toFixed(1);
  config.safety.enableMovementSpeed = safetySpeedToggle ? safetySpeedToggle.checked : true;
  config.safety.movementSpeedMinSec = parseFloat(spdMin.toFixed(2));
  config.safety.movementSpeedMaxSec = parseFloat(spdMax.toFixed(2));
  if (!config.settings) config.settings = {};
  config.settings.baseDelay = Math.round(((spdMin + spdMax) / 2) * 1000);
  config.settings.jitter = Math.round((spdMax - spdMin) * 1000);
  config.settings.minSafetyFloor = Math.round(spdMin * 1000);

  const rotMin = Math.max(1, parseInt(safetyMapRotationMin.value, 10) || 10);
  const rotMax = Math.max(rotMin, parseInt(safetyMapRotationMax.value, 10) || 30);
  const rotEnabled = safetyMapRotationToggle ? safetyMapRotationToggle.checked : false;

  config.safety.enableMapRotation = rotEnabled;
  config.safety.mapRotationMinMinutes = rotMin;
  config.safety.mapRotationMaxMinutes = rotMax;
  if (!config.settings) config.settings = {};
  config.settings.randomMapHopping = rotEnabled;

  const defaultZones = ['overworld', 'snowcave', 'volcano', 'rockcave', 'pkmnmansion', 'pkmntower', 'powerplant', 'unownruins'];
  const checkedZones = [];
  document.querySelectorAll('.safety-zone-checkbox').forEach(cb => {
    if (cb.checked) checkedZones.push(cb.value);
  });
  config.safety.mapRotationZones = checkedZones.length > 0 ? checkedZones : defaultZones;

  if (rotEnabled && isRunning) {
    const timeRemainingMs = nextMapRotationTime ? (nextMapRotationTime - Date.now()) : 0;
    if (!nextMapRotationTime || mapRotationTargetMins < rotMin || mapRotationTargetMins > rotMax || timeRemainingMs > (rotMax * 60 * 1000) || timeRemainingMs <= 0) {
      scheduleNextMapRotation();
    }
  } else if (!rotEnabled) {
    if (mapRotationTimer) {
      clearTimeout(mapRotationTimer);
      mapRotationTimer = null;
    }
    nextMapRotationTime = null;
    isMapRotationDue = false;
  }
  updateRandomMapUI();

  config.safety.enableForcedBreaks = safetyBreakToggle ? safetyBreakToggle.checked : true;
  config.safety.breakMinSteps = bStepMin;
  config.safety.breakMaxSteps = bStepMax;
  config.safety.breakMinDurationSec = bDurMin;
  config.safety.breakMaxDurationSec = bDurMax;

  config.safety.enableDailyCeilings = safetyDailyToggle ? safetyDailyToggle.checked : true;
  config.safety.dailyStepMin = dStepMin;
  config.safety.dailyStepMax = dStepMax;
  config.safety.dailyCatchMin = dCatchMin;
  config.safety.dailyCatchMax = dCatchMax;

  config.safety.antiBotEmergencyHalt = safetyAntiBotToggle ? safetyAntiBotToggle.checked : true;

  // Immediately enforce new bounds on active daily ceilings, break targets, and session auto-stop
  ensureTodaySafetyState();
  let dailyChanged = false;
  if (!dailySafetyState.dailyStepCeiling || dailySafetyState.dailyStepCeiling < dStepMin || dailySafetyState.dailyStepCeiling > dStepMax) {
    dailySafetyState.dailyStepCeiling = getRandomInRange(dStepMin, dStepMax);
    dailyChanged = true;
  }
  if (!dailySafetyState.dailyCatchCeiling || dailySafetyState.dailyCatchCeiling < dCatchMin || dailySafetyState.dailyCatchCeiling > dCatchMax) {
    dailySafetyState.dailyCatchCeiling = getRandomInRange(dCatchMin, dCatchMax);
    dailyChanged = true;
  }
  if (dailyChanged) {
    saveDailySafetyState();
  }

  if (!nextBreakStepTarget || nextBreakStepTarget < bStepMin || nextBreakStepTarget > bStepMax ||
      !nextBreakDurationSec || nextBreakDurationSec < bDurMin || nextBreakDurationSec > bDurMax) {
    rollNextBreakTargets();
  }

  if (!config.safety.enableDeadManSwitch) {
    if (sessionAutoStopTimer) {
      clearTimeout(sessionAutoStopTimer);
      sessionAutoStopTimer = null;
    }
    sessionAutoStopTime = null;
  } else if (isRunning && (!sessionAutoStopTime || sessionAutoStopTargetMins < autoMin || sessionAutoStopTargetMins > autoMax)) {
    const stopMins = getRandomInRange(autoMin, autoMax);
    sessionAutoStopTime = Date.now() + stopMins * 60 * 1000;
    sessionAutoStopTargetMins = stopMins;
    if (sessionAutoStopTimer) clearTimeout(sessionAutoStopTimer);
    sessionAutoStopTimer = setTimeout(() => {
      triggerSessionAutoStop(`Session auto-stop triggered after ${sessionAutoStopTargetMins}m`, `Paused (Auto-Stop: ${sessionAutoStopTargetMins}m)`);
    }, stopMins * 60 * 1000);
  }

  if (!config.settings) config.settings = {};
  if (avoidDupesBadge) {
    config.settings.avoidDuplicates = avoidDupesBadge.checked;
  }
  if (autoCatchBadge) {
    config.settings.autoCatchMasterBall = autoCatchBadge.checked;
  }
  if (autoStartMapBadge) {
    config.settings.autoStartOnMap = autoStartMapBadge.checked;
  }
  if (autoStartDelaySelect) {
    config.settings.autoStartDelay = parseInt(autoStartDelaySelect.value, 10) || 3;
  }
  if (walkModeSelect) {
    config.settings.walkMode = walkModeSelect.value;
  }
  if (stepsPerDirInput) {
    config.settings.stepsPerDirection = parseInt(stepsPerDirInput.value, 10) || 5;
  }

  saveLocalConfig();
  loadSafetySettingsIntoUI();

  try {
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('update-config', config.settings);
    }
  } catch (_) {}
  syncHuntingState();

  if (safetyStatusChip) {
    safetyStatusChip.textContent = 'Saved';
    safetyStatusChip.style.color = '#388bfd';
    setTimeout(() => {
      if (safetyStatusChip) {
        safetyStatusChip.textContent = 'Active';
        safetyStatusChip.style.color = '#10b981';
      }
    }, 1500);
  }
  updateStatus('Safety and drawer settings saved', '#10b981');
}

function rerollSafetyTargets() {
  ensureTodaySafetyState();
  const s = config.safety || {};
  dailySafetyState.dailyStepCeiling = getRandomInRange(s.dailyStepMin || 500, s.dailyStepMax || 1000);
  dailySafetyState.dailyCatchCeiling = getRandomInRange(s.dailyCatchMin || 10, s.dailyCatchMax || 20);
  saveDailySafetyState();

  rollNextBreakTargets();

  if (isRunning && isMapRotationActive()) {
    scheduleNextMapRotation();
  }

  if (isRunning && s.enableDeadManSwitch !== false) {
    const stopMins = getRandomInRange(s.autoStopMinMinutes || 5, s.autoStopMaxMinutes || 30);
    sessionAutoStopTime = Date.now() + stopMins * 60 * 1000;
    sessionAutoStopTargetMins = stopMins;
    if (sessionAutoStopTimer) clearTimeout(sessionAutoStopTimer);
    sessionAutoStopTimer = setTimeout(() => {
      triggerSessionAutoStop(`Session auto-stop triggered after ${sessionAutoStopTargetMins}m`, 'Paused (Session Auto-Stop Limit)');
    }, stopMins * 60 * 1000);
  }

  updateSafetyTelemetryUI();
}

function resetDailySafetyCounters() {
  ensureTodaySafetyState();
  dailySafetyState.todaySteps = 0;
  dailySafetyState.todayCatches = 0;
  if (dailyCatchData && Array.isArray(dailyCatchData.caught) && dailyCatchData.caught.length > 0) {
    dailyCatchData.caught = [];
    saveDailyCatchLog();
    updateCatchLogBadge();
    renderCatchLogUI();
  }
  rerollSafetyTargets();
}

function updateSafetyTelemetryUI() {
  ensureTodaySafetyState();
  const s = config.safety || {};

  // 1. Session auto-stop
  if (safetyStatAutoStop) {
    if (!isRunning || !sessionAutoStopTime) {
      safetyStatAutoStop.textContent = (s.enableDeadManSwitch !== false) ? `Ready (${s.autoStopMinMinutes || 5}-${s.autoStopMaxMinutes || 30}m)` : 'Disabled';
      safetyStatAutoStop.style.color = '#8eaad0';
    } else {
      const remainingMs = Math.max(0, sessionAutoStopTime - Date.now());
      const remMins = Math.floor(remainingMs / 60000);
      const remSecs = Math.floor((remainingMs % 60000) / 1000);
      safetyStatAutoStop.textContent = `${remMins}m ${remSecs < 10 ? '0' : ''}${remSecs}s`;
      safetyStatAutoStop.style.color = '#388bfd';
    }
  }

  // 2. Next break
  if (safetyStatNextBreak) {
    if (s.enableForcedBreaks === false) {
      safetyStatNextBreak.textContent = 'Disabled';
      safetyStatNextBreak.style.color = '#8eaad0';
    } else if (isRestBreakActive) {
      safetyStatNextBreak.textContent = 'Resting...';
      safetyStatNextBreak.style.color = '#e879f9';
    } else {
      const stepsLeft = Math.max(0, (nextBreakStepTarget || 50) - stepsSinceLastBreak);
      safetyStatNextBreak.textContent = `in ${stepsLeft}s (${nextBreakDurationSec || 45}s)`;
      safetyStatNextBreak.style.color = '#388bfd';
    }
  }

  // 3. Steps today
  if (safetyStatTodaySteps) {
    const curSteps = dailySafetyState.todaySteps || 0;
    const maxSteps = dailySafetyState.dailyStepCeiling || (s.dailyStepMax || 1000);
    safetyStatTodaySteps.textContent = `${curSteps} / ${maxSteps}`;
    safetyStatTodaySteps.style.color = (curSteps >= maxSteps) ? '#ef4444' : '#e0ecfa';
  }

  // 4. Catches today
  if (safetyStatTodayCatches) {
    const curCatches = dailySafetyState.todayCatches || 0;
    const maxCatches = dailySafetyState.dailyCatchCeiling || (s.dailyCatchMax || 20);
    safetyStatTodayCatches.textContent = `${curCatches} / ${maxCatches}`;
    safetyStatTodayCatches.style.color = (curCatches >= maxCatches) ? '#ef4444' : '#e0ecfa';
  }

  // 5. Next map rotation countdown
  if (safetyStatNextMapRotation) {
    if (!isMapRotationActive()) {
      safetyStatNextMapRotation.textContent = 'Disabled';
      safetyStatNextMapRotation.style.color = '#8eaad0';
    } else if (!isRunning) {
      const minM = (s.mapRotationMinMinutes || 10);
      const maxM = (s.mapRotationMaxMinutes || 30);
      safetyStatNextMapRotation.textContent = `Ready (${minM}-${maxM}m)`;
      safetyStatNextMapRotation.style.color = '#8eaad0';
    } else if (nextMapRotationTime) {
      const remainingMs = Math.max(0, nextMapRotationTime - Date.now());
      const remMins = Math.floor(remainingMs / 60000);
      const remSecs = Math.floor((remainingMs % 60000) / 1000);
      safetyStatNextMapRotation.textContent = `${remMins}m ${remSecs < 10 ? '0' : ''}${remSecs}s`;
      safetyStatNextMapRotation.style.color = (remainingMs === 0) ? '#10b981' : '#38bdf8';
    } else {
      safetyStatNextMapRotation.textContent = 'Scheduling...';
      safetyStatNextMapRotation.style.color = '#38bdf8';
    }
  }
}

function openSafetySettingsPanel() {
  if (navDropdown && navDropdown.classList.contains('hidden')) {
    openNavDropdown();
  }
  const safetyContent = document.getElementById('navGroupSafety');
  const safetyHeader = document.querySelector('[data-target="navGroupSafety"]');
  if (safetyContent && (safetyContent.classList.contains('collapsed') || safetyContent.style.display === 'none')) {
    safetyContent.classList.remove('collapsed');
    safetyContent.style.display = 'flex';
    if (safetyHeader) {
      safetyHeader.setAttribute('aria-expanded', 'true');
      const arrow = safetyHeader.querySelector('.nav-group-arrow');
      if (arrow) arrow.innerHTML = '&#9662;';
    }
  }
  if (safetySettingsModal) safetySettingsModal.style.display = 'none';
  if (safetySettingsTopBtn) safetySettingsTopBtn.classList.remove('btn-accent');
  loadSafetySettingsIntoUI();
}

function closeSafetySettingsPanel() {
  if (safetySettingsModal) safetySettingsModal.style.display = 'none';
  if (safetySettingsTopBtn) safetySettingsTopBtn.classList.remove('btn-accent');
}

function toggleSafetySettingsPanel() {
  if (navDropdown && !navDropdown.classList.contains('hidden')) {
    closeNavDropdown();
  } else {
    openSafetySettingsPanel();
  }
}

if (safetySettingsTopBtn) safetySettingsTopBtn.addEventListener('click', toggleSafetySettingsPanel);
if (safetySettingsMenuBtn) {
  safetySettingsMenuBtn.addEventListener('click', () => {
    closeNavDropdown();
    toggleSafetySettingsPanel();
  });
}
if (closeSafetySettingsBtn) closeSafetySettingsBtn.addEventListener('click', closeSafetySettingsPanel);
if (switchTeamBuilderFromSafetyBtn) {
  switchTeamBuilderFromSafetyBtn.addEventListener('click', () => {
    closeSafetySettingsPanel();
    openTeamBuilderPanel();
  });
}
if (saveSafetySettingsBtn) saveSafetySettingsBtn.addEventListener('click', saveSafetySettingsFromUI);
// Wire up Safety Zone selection buttons
if (safetyZonesSelectAllBtn) {
  safetyZonesSelectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.safety-zone-checkbox').forEach(cb => { cb.checked = true; });
    saveSafetySettingsFromUI();
  });
}
if (safetyZonesClearBtn) {
  safetyZonesClearBtn.addEventListener('click', () => {
    document.querySelectorAll('.safety-zone-checkbox').forEach(cb => { cb.checked = false; });
    saveSafetySettingsFromUI();
  });
}
document.querySelectorAll('.safety-zone-checkbox').forEach(cb => {
  cb.addEventListener('change', () => {
    saveSafetySettingsFromUI();
  });
});

[
  safetyAutoStopToggle, safetyBreakToggle, safetyDailyToggle, safetyAntiBotToggle,
  safetyMapRotationToggle, safetyMapRotationMin, safetyMapRotationMax,
  safetyAutoStopMin, safetyAutoStopMax,
  safetyBreakMinSteps, safetyBreakMaxSteps, safetyBreakMinDur, safetyBreakMaxDur,
  safetyDailyMinSteps, safetyDailyMaxSteps, safetyDailyMinCatches, safetyDailyMaxCatches
].forEach(el => {
  if (el) el.addEventListener('change', saveSafetySettingsFromUI);
});
if (rerollSafetyTargetsBtn) rerollSafetyTargetsBtn.addEventListener('click', rerollSafetyTargets);
if (resetDailySafetyBtn) resetDailySafetyBtn.addEventListener('click', resetDailySafetyCounters);
if (testAlarmBtn) {
  testAlarmBtn.addEventListener('click', () => {
    startContinuousCaptchaAlarm();
  });
}
if (silenceAlarmModalBtn) silenceAlarmModalBtn.addEventListener('click', silenceCaptchaAlarm);
if (silenceAlarmBtn) silenceAlarmBtn.addEventListener('click', silenceCaptchaAlarm);

// Initial load of today's safety state & targets
loadDailySafetyState();
rollNextBreakTargets();
loadSafetySettingsIntoUI();

setInterval(updateSafetyTelemetryUI, 1000);

// Initial load of today's catch log
loadDailyCatchLog();

// Open Team Builder docked side panel by default
openTeamBuilderPanel();

// Action Feedback IPC from main process network layer
ipcRenderer.on('action-feedback-event', (event, data) => {
  if (data && data.url && data.url.includes('/ajax/battle/')) {
    battleActionInFlightUntil = 0;
    if (data.success) {
      consecutiveStuckBattleActions = 0;
      lastStuckActionKey = '';
    } else {
      consecutiveStuckBattleActions += 2;
      if (typeof maybeRecoverStuckBattlePage === 'function') {
        maybeRecoverStuckBattlePage('Battle AJAX failed: ' + (data.error || data.status));
      }
    }
  }
  if (data && !isRestBreakActive) {
    if (data.url && (data.url.includes('/cdn-cgi/') || data.url.includes('/ajax/map/positions/'))) return;
    const statusStr = data.success ? (data.status + ' OK') : (data.error || 'Failed');
    updateActionFeedback((data.url || '').slice(0, 14) + ' -> ' + statusStr + ' (' + data.elapsedMs + 'ms)', data.success ? 'success' : 'error');
  }
});
