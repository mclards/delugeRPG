// app.js - Host controller for the hardened standalone desktop client
// Incorporates Gaussian cadence, human fatigue drift, micro-breaks, and network proxy management

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const teamEngine = require('./team_engine.js');

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
    hideAdsCosmetically: true,
    autoCatchMasterBall: false,
    pvpCandidateTier: "ANY"
  },
  safety: {
    enableDeadManSwitch: true,
    autoStopMinMinutes: 5,
    autoStopMaxMinutes: 30,
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
      hideAdsCosmetically: true,
      autoCatchMasterBall: false,
      pvpCandidateTier: "ANY"
    },
    safety: {
      enableDeadManSwitch: true,
      autoStopMinMinutes: 5,
      autoStopMaxMinutes: 30,
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
let activeEvolveCardData = null;
let lastAnnouncedEvolveSignature = null;
let lastAnalyzedBattle = null;
let lastKnownUserTeam = [];

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
    let appVer = '1.4.5';
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
    parts.push("Tier 2: 107 Mega Lines" + megaBadge);
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

function updateTargetUI() {
  const isLegConfig = config.settings && config.settings.findLegendaries !== false;
  const classicLeg = isLegConfig && (config.settings.legendaryClassic !== false);
  const ubLeg = isLegConfig && (config.settings.legendaryUltraBeasts !== false);
  const paradoxLeg = isLegConfig && (config.settings.legendaryParadox !== false);
  const isLeg = isLegConfig && (classicLeg || ubLeg || paradoxLeg);

  const isMega = config.settings && config.settings.findMegasAndGigantamax !== false;
  const isVar = config.settings && config.settings.findAnySpecialVariant !== false;

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
  const isVarActive = config.settings && (config.settings.enableVariantFilter !== undefined ? !!config.settings.enableVariantFilter : (config.settings.findAnySpecialVariant !== false));
  if (filterVariantsCheckbox) filterVariantsCheckbox.checked = isVarActive;

  if (legVariantsWrap) legVariantsWrap.classList.toggle('dimmed', !isLeg);
  if (megaVariantsWrap) megaVariantsWrap.classList.toggle('dimmed', !isMega);
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
        selectedVariants: activeVariants,
        legendaryVariants: activeLegVariants,
        megaVariants: activeMegaVariants,
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
        selectedVariants: selectedVars,
        legendaryVariants: selectedLegVars,
        megaVariants: selectedMegaVars,
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
updateHideAdsUI();
updateAutoCatchUI();
updateVersionUI();
updateZoomUI();

// Detect Live Network Identity (Real Public IP & ISP) on Startup
detectNetworkIdentity();
setInterval(detectNetworkIdentity, 60000);

// Audio Synthesizer for alerts
let sharedAudioCtx = null;
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
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function playAlarmSound() {
  playSound(440, 0.3);
  setTimeout(() => playSound(880, 0.4), 250);
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

function autoPauseOutsideMap(source = '') {
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
        stopHuntingWithReason(`Session auto-stop triggered after ${sessionAutoStopTargetMins}m`, `Paused (Auto-Stop: ${sessionAutoStopTargetMins}m)`, '#f59e0b');
        playAlarmSound();
      }, stopMins * 60 * 1000);
      backendLog('SafetyAutoStop', `Session auto-stop timer scheduled for ${stopMins} minutes`);
    }

    // Initialize forced break targets if not yet set
    if (config.safety && config.safety.enableForcedBreaks !== false) {
      if (!nextBreakStepTarget) {
        rollNextBreakTargets();
      }
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
    scheduleNextStep(500);
  } else {
    isAutoCatchCountdownActive = false;
    userManuallyPaused = true;
    wasHuntingBeforeAutoCatch = false;
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

// Hardened Gaussian Human Reaction Delays with Fatigue Drift
function getHardenedHumanDelay() {
  const base = config.settings.baseDelay || 2100;
  const jitter = config.settings.jitter || 550;
  const floor = config.settings.minSafetyFloor || 1700;

  // Box-Muller transform for true Gaussian distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.sin(2.0 * Math.PI * u2);

  // Slow human fatigue drift (-120ms to +150ms over time)
  driftAccumulator += (Math.random() - 0.48) * 20;
  driftAccumulator = Math.max(-120, Math.min(180, driftAccumulator));

  const calculatedDelay = Math.round(base + (randStdNormal * (jitter / 2)) + driftAccumulator);
  return Math.max(floor, calculatedDelay);
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

function getNextKey() {
  const mode = walkModeSelect.value;
  const keys = ['Left', 'Up', 'Right', 'Down'];
  const stepsPerDir = config.settings.stepsPerDirection || 1;
  const now = Date.now();

  // Expire old blocked directions
  for (const k in blockedDirections) {
    if (now > blockedDirections[k]) delete blockedDirections[k];
  }

  // Active Ping-Pong Loop Breaker (Prevents 2-tile / 3-tile trap oscillations in tight corridors)
  const loop = detectPingPongLoop();
  if (loop) {
    console.log(`[Loop Breaker] Detected ping-pong oscillation between ${loop.dirA} and ${loop.dirB}! Forcing escape...`);
    blockedDirections[loop.dirA] = now + 6000;
    blockedDirections[loop.dirB] = now + 6000;
    recentMoves.length = 0;

    const escapePerps = PERPENDICULARS_8[loop.dirA] || ['Up', 'Down'];
    const unblockedEscape = escapePerps.filter(k => !isDirectionPhysicallyBlocked(k, now));
    if (unblockedEscape.length > 0) {
      const escapeDir = unblockedEscape[Math.floor(Math.random() * unblockedEscape.length)];
      currentDirectionKey = escapeDir;
      wanderStepsLeft = stepsPerDir - 1;
      updateStatus(`Escaping choke point (${escapeDir})...`, '#38bdf8');
      return escapeDir;
    }
    const anyEscape = ALL_DIRECTIONS_8.filter(k => k !== loop.dirA && k !== loop.dirB && !isDirectionPhysicallyBlocked(k, now));
    if (anyEscape.length > 0) {
      const escapeDir = anyEscape[Math.floor(Math.random() * anyEscape.length)];
      currentDirectionKey = escapeDir;
      wanderStepsLeft = stepsPerDir - 1;
      updateStatus(`Escaping choke point (${escapeDir})...`, '#38bdf8');
      return escapeDir;
    }
  }

  // MODE: DIAGONAL (True 8-Way Diagonal Sweeping & Surface Reflection)
  if (mode === 'diagonal') {
    if (isDirectionPhysicallyBlocked(diagonalVertical, now)) {
      diagonalVertical = diagonalVertical === 'Up' ? 'Down' : 'Up';
    }
    if (isDirectionPhysicallyBlocked(diagonalHorizontal, now)) {
      diagonalHorizontal = diagonalHorizontal === 'Right' ? 'Left' : 'Right';
    }

    let candidate = `${diagonalVertical}-${diagonalHorizontal}`;
    if (isDirectionPhysicallyBlocked(candidate, now)) {
      const altV = (diagonalVertical === 'Up' ? 'Down' : 'Up') + '-' + diagonalHorizontal;
      if (!isDirectionPhysicallyBlocked(altV, now)) {
        diagonalVertical = diagonalVertical === 'Up' ? 'Down' : 'Up';
        candidate = altV;
      } else {
        const altH = diagonalVertical + '-' + (diagonalHorizontal === 'Right' ? 'Left' : 'Right');
        if (!isDirectionPhysicallyBlocked(altH, now)) {
          diagonalHorizontal = diagonalHorizontal === 'Right' ? 'Left' : 'Right';
          candidate = altH;
        } else {
          const altBoth = (diagonalVertical === 'Up' ? 'Down' : 'Up') + '-' + (diagonalHorizontal === 'Right' ? 'Left' : 'Right');
          if (!isDirectionPhysicallyBlocked(altBoth, now)) {
            diagonalVertical = diagonalVertical === 'Up' ? 'Down' : 'Up';
            diagonalHorizontal = diagonalHorizontal === 'Right' ? 'Left' : 'Right';
            candidate = altBoth;
          } else {
            return chooseEvadeDirection(candidate);
          }
        }
      }
    }
    return candidate;
  }

  if (mode === 'line_horizontal') {
    let isLeft = Math.floor(patternStepCount / stepsPerDir) % 2 === 0;
    let target = isLeft ? 'Left' : 'Right';
    if (isDirectionPhysicallyBlocked(target, now)) {
      const opp = target === 'Left' ? 'Right' : 'Left';
      if (!isDirectionPhysicallyBlocked(opp, now)) {
        const remainder = patternStepCount % stepsPerDir;
        if (remainder !== 0) patternStepCount += (stepsPerDir - remainder);
        return opp;
      }
      return chooseEvadeDirection(target);
    }
    return target;
  }

  if (mode === 'line_vertical') {
    let isUp = Math.floor(patternStepCount / stepsPerDir) % 2 === 0;
    let target = isUp ? 'Up' : 'Down';
    if (isDirectionPhysicallyBlocked(target, now)) {
      const opp = target === 'Up' ? 'Down' : 'Up';
      if (!isDirectionPhysicallyBlocked(opp, now)) {
        const remainder = patternStepCount % stepsPerDir;
        if (remainder !== 0) patternStepCount += (stepsPerDir - remainder);
        return opp;
      }
      return chooseEvadeDirection(target);
    }
    return target;
  }

  if (mode === 'patrol_square') {
    let idx = Math.floor(patternStepCount / stepsPerDir) % 4;
    let candidate = keys[idx];
    if (isDirectionPhysicallyBlocked(candidate, now)) {
      patternStepCount += stepsPerDir;
      idx = Math.floor(patternStepCount / stepsPerDir) % 4;
      candidate = keys[idx];
      if (isDirectionPhysicallyBlocked(candidate, now)) {
        return chooseEvadeDirection(candidate);
      }

    }
    return candidate;
  }

  // Mode: Wander with 8-Way Roaming, Corridor Momentum, and Anti-Looping
  const compulsorySteps = config.settings.stepsPerDirection || 1;
  const forwardIsBlocked = isDirectionPhysicallyBlocked(currentDirectionKey, now);

  // If forward is blocked: trigger immediate zero-latency evasion!
  // Momentum MUST stop immediately when an obstacle is directly in the path:
  // reset remaining steps counter and immediately switch to a different unobstructed direction.
  if (forwardIsBlocked) {
    const prev = currentDirectionKey;
    currentDirectionKey = chooseEvadeDirection(currentDirectionKey);
    wanderStepsLeft = compulsorySteps - 1;
    backendLog('Wander', `Forward ${prev} is blocked! Evaded to ${currentDirectionKey}`);
    return currentDirectionKey;
  }

  // Normal turn condition: compulsory steps completed on clear path
  if (wanderStepsLeft <= 0) {
    const prev = currentDirectionKey;
    currentDirectionKey = chooseWanderDirection(currentDirectionKey);
    wanderStepsLeft = compulsorySteps - 1;
    backendLog('Wander', `Completed cycle. Turned from ${prev} to ${currentDirectionKey}`);
  } else {
    wanderStepsLeft--;
    backendLog('Wander', `Continuing ${currentDirectionKey}, stepsLeft=${wanderStepsLeft}`);
  }

  return currentDirectionKey;
}

// Native Hardware Input Dispatch (isTrusted: true) & Direct Nav Button Click
function sendKeyStep(keyName) {
  if (!isRunning || isStepPending) {
    return;
  }

  // Pre-dispatch Safety Guard: verify webview is still on a map page
  try {
    const curUrl = delugeView ? delugeView.getURL() : '';
    if (curUrl && !isMapUrl(curUrl)) {
      autoPauseOutsideMap(curUrl);
      return;
    }
  } catch (_) {}

  // Guard against stealing cursor/focus when typing in guest inputs
  if (isGuestInputFocused) {
    return;
  }

  const now = Date.now();
  // Pre-dispatch Zero-Collision Guard: Never hit a direction that is currently known to be blocked
  if (isDirectionPhysicallyBlocked(keyName, now)) {
    const evaded = chooseEvadeDirection(keyName);
    if (evaded && evaded !== keyName) {
      backendLog('PreDispatchGuard', `Direction ${keyName} blocked before dispatch! Evading to ${evaded}`);
      keyName = evaded;
      currentDirectionKey = evaded;
      wanderStepsLeft = (config.settings.stepsPerDirection || 1) - 1;
    }
  }

  try {
    lastDispatchedDirection = keyName;
    recentMoves.push(keyName);
    if (recentMoves.length > 8) recentMoves.shift();
    isStepPending = true;

    backendLog('StepDispatch', `Sending key: ${keyName} (patternStepCount=${patternStepCount}, isPending=${isStepPending})`);

    // Atomic movement dispatch: exactly ONE action per step (prevents double-dispatch and encounter skipping)
    delugeView.send('click-nav-button', { direction: keyName });

    // Notify guest webview preload of dispatched step
    delugeView.send('step-dispatched', { direction: keyName, time: Date.now() });

    // Fallback collision timer: Safety net if preload doesn't resolve within 2600ms
    if (fallbackCollisionTimer) clearTimeout(fallbackCollisionTimer);
    fallbackCollisionTimer = setTimeout(() => {
      const isBlocked = isDirectionPhysicallyBlocked(keyName);
      backendLog('FallbackTimer', `Safety timer expired (2600ms) for direction: ${keyName}, physicallyBlocked=${isBlocked}`);
      if (isBlocked) {
        handleMoveBlocked(keyName);
      } else {
        handleMoveSuccess(keyName);
      }
    }, 2600);

    patternStepCount++;
  } catch (err) {
    backendLog('SendKeyStepError', err.message);
    console.error('sendInputEvent error:', err);
  }
}

// Hardened Walking Engine
function scheduleNextStep(customDelay = null) {
  if (!isRunning) return;
  if (walkTimeout) clearTimeout(walkTimeout);

  // Pre-schedule Safety Guard: verify webview is still on a map page
  try {
    const curUrl = delugeView ? delugeView.getURL() : '';
    if (curUrl && !isMapUrl(curUrl)) {
      autoPauseOutsideMap(curUrl);
      return;
    }
  } catch (_) {}

  if (isGuestInputFocused) {
    scheduleNextStep(1000);
    return;
  }

  const delay = customDelay !== null ? customDelay : getHardenedHumanDelay();

  walkTimeout = setTimeout(() => {
    if (!isRunning) return;

    if (isStepPending) {
      stepPendingTicks++;
      if (stepPendingTicks >= 8) {
        // Safety recovery: if a guest move-result was dropped or delayed >2s, reset and continue
        backendLog('StepPendingRecovery', 'isStepPending timeout (2000ms); recovering pending step.');
        isStepPending = false;
        stepPendingTicks = 0;
      } else {
        // Step in flight: wait 250ms and re-check before dispatching next step
        scheduleNextStep(250);
        return;
      }
    } else {
      stepPendingTicks = 0;
    }

    try {
      const stepUrl = delugeView ? delugeView.getURL() : '';
      if (stepUrl && !isMapUrl(stepUrl)) {
        autoPauseOutsideMap(stepUrl);
        return;
      }
    } catch (_) {}

    if (isGuestInputFocused) {
      scheduleNextStep(1000);
      return;
    }

    // Check if map is searching
    if (mapIsSearching) {
      searchWaitTicks++;
      if (searchWaitTicks >= 4) {
        // Safety reset if Deluge network search lagged
        mapIsSearching = false;
        searchWaitTicks = 0;
      } else {
        updateStatus('Searching...', '#38bdf8');
        scheduleNextStep(600);
        return;
      }
    } else {
      searchWaitTicks = 0;
    }

    if (isRestBreakActive) {
      isRestBreakActive = false;
      if (breakCountdownTimer) {
        clearInterval(breakCountdownTimer);
        breakCountdownTimer = null;
      }
    }

    // 0. Check if resuming from a micro-pause or idle pause
    // After the pause, change to another direction and start fresh compulsory steps!
    if (isResumingFromMicroPause || isResumingFromIdlePause) {
      const wasMicro = isResumingFromMicroPause;
      isResumingFromMicroPause = false;
      isResumingFromIdlePause = false;

      const prev = currentDirectionKey;
      currentDirectionKey = chooseWanderDirection(currentDirectionKey);
      const compulsorySteps = Math.max(1, config.settings.stepsPerDirection || 1);
      wanderStepsLeft = compulsorySteps - 1;

      backendLog(wasMicro ? 'MicroBreak' : 'IdlePause', `Resumed after ${wasMicro ? 'micro-pause' : 'idle pause'}: Changed direction from ${prev} to ${currentDirectionKey}, starting fresh ${compulsorySteps} steps`);
      sendKeyStep(currentDirectionKey);
      updateStatus(`Hunting (${currentDirectionKey})`, '#10b981');
      return;
    }

    // 1. Long Idle Pause (Simulate alt-tabbing or resting)
    // ONLY allowed when wanderStepsLeft <= 0 (strictly at turn boundary, NEVER mid-stride during compulsory steps!)
    if (config.settings.enableIdlePauses && wanderStepsLeft <= 0) {
      stepsSinceLastIdlePause++;
      if (stepsSinceLastIdlePause >= nextIdlePauseThreshold) {
        stepsSinceLastIdlePause = 0;
        nextIdlePauseThreshold = Math.floor(Math.random() * 40) + 110;
        wanderStepsLeft = 0;
        isResumingFromIdlePause = true;
        const pauseSec = ((12000 + Math.random() * 6000) / 1000).toFixed(1);
        updateStatus(`Resting (${pauseSec}s)...`, '#e879f9');
        backendLog('IdlePause', `Resting for ${pauseSec}s: Step counter reset, will change direction upon resume`);
        scheduleNextStep(parseFloat(pauseSec) * 1000);
        return;
      }
    }

    // 2. Micro-Breaks (Simulate brief glance/distraction)
    // ONLY allowed when wanderStepsLeft <= 0 (strictly at turn boundary, NEVER mid-stride during compulsory steps!)
    if (config.settings.enableMicroBreaks && wanderStepsLeft <= 0) {
      stepsSinceLastMicroBreak++;
      if (stepsSinceLastMicroBreak >= nextMicroBreakThreshold) {
        stepsSinceLastMicroBreak = 0;
        nextMicroBreakThreshold = Math.floor(Math.random() * 15) + 30;
        wanderStepsLeft = 0;
        isResumingFromMicroPause = true;
        const restSec = ((1400 + Math.random() * 800) / 1000).toFixed(1);
        updateStatus(`Micro-pause (${restSec}s)...`, '#a855f7');
        backendLog('MicroBreak', `Micro-pause for ${restSec}s: Step counter reset, will change direction upon resume`);
        scheduleNextStep(parseFloat(restSec) * 1000);
        return;
      }
    }

    // 3. Dispatch Step (Pacing is driven by move-result confirmation in handleMoveSuccess)
    const key = getNextKey();
    sendKeyStep(key);
    updateStatus(`Hunting (${key})`, '#10b981');
  }, delay);
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

function triggerDelayedAutoStart(sourceReason = 'Map opened') {
  cancelPendingAutoStart();

  const shouldAutoStart = config.settings && config.settings.autoStartOnMap !== false;
  if (!shouldAutoStart) return;
  if (isRunning) return;
  if (userManuallyPaused) return;
  if (isEncounterOnScreen) return;
  if (isUnlockChallengeActive) {
    backendLog('AutoStart', 'Skipping auto-start: captcha challenge active.');
    return;
  }

  if (!isCurrentPageMap()) return;

  if (config.settings && config.settings.autoCatchMasterBall === true) {
    if (dailyCatchData && dailyCatchData.masterBallStock === 0) {
      outOfStockPaused = true;
      updateStatus('Paused (0 Master Balls - Restock)', '#ef4444');
      return;
    }
    if (!isBallInventorySynced && delugeView && typeof delugeView.send === 'function') {
      try { delugeView.send('request-ball-inventory'); } catch (_) {}
    }
  }

  ensureTodaySafetyState();
  if (config.safety && config.safety.enableDailyCeilings !== false) {
    if (dailySafetyState.todaySteps >= dailySafetyState.dailyStepCeiling) {
      updateStatus(`Paused (Daily Steps: ${dailySafetyState.todaySteps}/${dailySafetyState.dailyStepCeiling})`, '#ef4444');
      return;
    }
    const curCatches = Math.max(dailySafetyState.todayCatches || 0, (dailyCatchData && dailyCatchData.caught) ? dailyCatchData.caught.length : 0);
    if (curCatches >= dailySafetyState.dailyCatchCeiling) {
      updateStatus(`Paused (Daily Catches: ${curCatches}/${dailySafetyState.dailyCatchCeiling})`, '#ef4444');
      return;
    }
  }

  const delaySec = Math.max(2, parseInt((config.settings && config.settings.autoStartDelay) || 3, 10));
  autoStartRemainingSeconds = delaySec;

  backendLog('AutoStart', `${sourceReason}. Pending auto-start scheduled in ${delaySec}s to allow map scripts and security checks to settle.`);
  updateStatus(`Auto-Start in ${autoStartRemainingSeconds}s...`, '#f59e0b');
  if (btnText && !isRunning) btnText.textContent = `Auto (${autoStartRemainingSeconds}s)`;

  autoStartCountdownTimer = setInterval(() => {
    autoStartRemainingSeconds--;
    if (autoStartRemainingSeconds > 0) {
      if (!isCurrentPageMap() || isUnlockChallengeActive || isEncounterOnScreen || isRunning || userManuallyPaused) {
        cancelPendingAutoStart('Conditions changed during countdown');
        updateToggleButton();
        return;
      }
      updateStatus(`Auto-Start in ${autoStartRemainingSeconds}s...`, '#f59e0b');
      if (btnText && !isRunning) btnText.textContent = `Auto (${autoStartRemainingSeconds}s)`;
    }
  }, 1000);

  autoStartTimer = setTimeout(() => {
    cancelPendingAutoStart();

    if (!isCurrentPageMap()) {
      backendLog('AutoStart', 'Aborted auto-start: no longer on map URL.');
      return;
    }
    if (isUnlockChallengeActive) {
      backendLog('AutoStart', 'Aborted auto-start: captcha challenge active.');
      return;
    }
    if (isEncounterOnScreen) {
      backendLog('AutoStart', 'Aborted auto-start: encounter currently on screen.');
      return;
    }
    if (isRunning) return;
    if (userManuallyPaused) {
      backendLog('AutoStart', 'Aborted auto-start: user manually paused.');
      return;
    }

    ensureTodaySafetyState();
    if (config.safety && config.safety.enableDailyCeilings !== false) {
      if (dailySafetyState.todaySteps >= dailySafetyState.dailyStepCeiling) {
        updateStatus(`Paused (Daily Steps: ${dailySafetyState.todaySteps}/${dailySafetyState.dailyStepCeiling})`, '#ef4444');
        return;
      }
      const curCatches = Math.max(dailySafetyState.todayCatches || 0, (dailyCatchData && dailyCatchData.caught) ? dailyCatchData.caught.length : 0);
      if (curCatches >= dailySafetyState.dailyCatchCeiling) {
        updateStatus(`Paused (Daily Catches: ${curCatches}/${dailySafetyState.dailyCatchCeiling})`, '#ef4444');
        return;
      }
    }

    backendLog('AutoStart', `Security delay (${delaySec}s) elapsed without captcha. Auto-starting hunting session.`);
    isRunning = true;
    userManuallyPaused = false;
    isGuestInputFocused = false;
    isStepPending = false;
    stepPendingTicks = 0;
    wanderStepsLeft = (config.settings && config.settings.stepsPerDirection) || 5;

    if (config.safety && config.safety.enableDeadManSwitch !== false) {
      if (!sessionAutoStopTimer || !sessionAutoStopTime) {
        const stopMins = getRandomInRange(config.safety.autoStopMinMinutes || 5, config.safety.autoStopMaxMinutes || 30);
        sessionAutoStopTime = Date.now() + stopMins * 60 * 1000;
        sessionAutoStopTargetMins = stopMins;
        if (sessionAutoStopTimer) clearTimeout(sessionAutoStopTimer);
        sessionAutoStopTimer = setTimeout(() => {
          stopHuntingWithReason(`Session auto-stop triggered after ${sessionAutoStopTargetMins}m`, `Paused (Auto-Stop: ${sessionAutoStopTargetMins}m)`, '#f59e0b');
          playAlarmSound();
        }, stopMins * 60 * 1000);
        backendLog('SafetyAutoStop', `Session auto-stop timer scheduled for ${stopMins} minutes`);
      }
    }
    if (config.safety && config.safety.enableForcedBreaks !== false) {
      if (!nextBreakStepTarget) {
        rollNextBreakTargets();
      }
    }
    updateSafetyTelemetryUI();

    updateToggleButton();
    syncHuntingState();
    updateStatus('Hunting Active (Auto-Started)', '#22c55e');
    scheduleNextStep(1000);
  }, delaySec * 1000);
}

function handleMapNavigation(url) {
  isGuestInputFocused = false;
  if (url && !isMapUrl(url)) {
    guestReportsMap = false;
  }
  const onMap = url ? isMapUrl(url) : guestReportsMap;
  if (!onMap) {
    cancelPendingAutoStart('Navigated outside map');
    userManuallyPaused = false;
    autoPauseOutsideMap(url);
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
    // Auto-start hunting only when guest preload has confirmed playable map DOM (guestReportsMap === true)
    const shouldAutoStart = (config.settings && config.settings.autoStartOnMap !== false) || wasHuntingBeforeAutoCatch;
    if (guestReportsMap && !isRunning && !userManuallyPaused && !isEncounterOnScreen && shouldAutoStart) {
      if (!autoStartTimer) {
        wasHuntingBeforeAutoCatch = false;
        triggerDelayedAutoStart('Map opened');
      }
    }
  }
}

delugeView.addEventListener('did-navigate', (event) => {
  const url = event.url || (delugeView && delugeView.getURL()) || '';
  handleMapNavigation(url);
});

delugeView.addEventListener('did-navigate-in-page', (event) => {
  const url = event.url || (delugeView && delugeView.getURL()) || '';
  handleMapNavigation(url);
});

delugeView.addEventListener('did-finish-load', () => {
  const url = (delugeView && delugeView.getURL()) || '';
  handleMapNavigation(url);
  if (isManualReloadInProgress) {
    isManualReloadInProgress = false;
    if (manualReloadUnlockTimer) {
      clearTimeout(manualReloadUnlockTimer);
      manualReloadUnlockTimer = null;
    }
    const reloadSvg = refreshBtn ? refreshBtn.querySelector('.reload-icon') : null;
    if (reloadSvg) reloadSvg.classList.remove('spinning');
    if (!isRunning) updateStatus('Ready', '#10b981');
  }
});

delugeView.addEventListener('did-stop-loading', () => {
  if (isManualReloadInProgress) {
    isManualReloadInProgress = false;
    if (manualReloadUnlockTimer) {
      clearTimeout(manualReloadUnlockTimer);
      manualReloadUnlockTimer = null;
    }
    const reloadSvg = refreshBtn ? refreshBtn.querySelector('.reload-icon') : null;
    if (reloadSvg) reloadSvg.classList.remove('spinning');
    if (!isRunning) updateStatus('Ready', '#10b981');
  }
});

delugeView.addEventListener('did-fail-load', (e) => {
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

delugeView.addEventListener('will-navigate', (event) => {
  const url = event.url || '';
  const currentUrl = (delugeView && delugeView.getURL && delugeView.getURL()) || '';
  const isCurrentlyInBattle = currentUrl.indexOf('/catch/') !== -1 || currentUrl.indexOf('/battle/') !== -1;

  if (!isManualReloadInProgress && (isAutoCatchCountdownActive || isCurrentlyInBattle)) {
    try {
      const parsed = new URL(url, 'https://www.delugerpg.com');
      const p = (parsed.pathname || '').toLowerCase();
      const isAllowedMap = isMapUrl(url) || p.startsWith('/map');
      const isCatchOrBattle = p.startsWith('/catch') || p.startsWith('/battle');
      if (!isAllowedMap && !isCatchOrBattle) {
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

    if (targetX < 0 || targetY < 0 || targetY <= 50 || (targetX <= 80 && targetY <= 80)) {
      backendLog('ACTION_AUDIT', `Blocked hardware click in invalid or header/logo zone (${targetX}, ${targetY})`);
      if (payload.reqId) {
        try {
          delugeView.send('trusted-click-done', { reqId: payload.reqId });
        } catch (_) {}
      }
      return;
    }

    const offsetX = Math.floor((Math.random() - 0.5) * 36) || 14;
    const offsetY = Math.floor((Math.random() - 0.5) * 36) || 12;
    const approachX = Math.max(1, targetX + offsetX);
    const approachY = Math.max(1, targetY + offsetY);
    const moveGapMs = 135 + Math.floor(Math.random() * 25);
    const pressDelayMs = 24 + Math.floor(Math.random() * 20);
    const holdDurationMs = 48 + Math.floor(Math.random() * 35);

    try {
      delugeView.sendInputEvent({ type: 'mouseMove', x: approachX, y: approachY });
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
    }, moveGapMs);
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
      if (scanStatusDot) scanStatusDot.style.background = '#10b981';
      if (scanStatusBadge) {
        scanStatusBadge.style.color = '#c9d8ec';
        scanStatusBadge.textContent = `${currentCollection.length} Pokemon Synced (${data.pageCount || 1} pgs)`;
      }
      if (typeof updateRosterModeUI === 'function') updateRosterModeUI();
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
    } else {
      if (scanStatusDot) scanStatusDot.style.background = '#f87171';
      if (scanStatusBadge) {
        scanStatusBadge.style.color = '#f87171';
        scanStatusBadge.textContent = 'Scan failed';
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
    if (applyTeamBtn) {
      applyTeamBtn.disabled = false;
      if (data.success) {
        applyTeamBtn.innerHTML = '<span>&#10003;</span> <span>Team Saved!</span>';
        setTimeout(() => {
          if (applyTeamBtn) applyTeamBtn.innerHTML = 'Change Team';
        }, 2500);
      } else {
        applyTeamBtn.innerHTML = 'Change Team';
      }
    }
    if (battleOpponentBtn) {
      battleOpponentBtn.disabled = false;
    }
    if (teamActionStatus) {
      if (data.success) {
        teamActionStatus.textContent = 'Team updated successfully on DelugeRPG!';
        teamActionStatus.style.color = '#238636';
      } else {
        teamActionStatus.textContent = 'Failed: ' + (data.error || 'Check game window');
        teamActionStatus.style.color = '#f87171';
      }
    }
  }

  if (event.channel === 'scan-trainers-status') {
    const data = event.args[0] || {};
    if (scanStatusBadge) {
      if (data.step === 'probing') {
        scanStatusBadge.textContent = data.message || 'Testing /npc/ endpoint...';
        scanStatusBadge.style.color = '#388bfd';
      } else if (data.step === 'probe-failed') {
        scanStatusBadge.textContent = `${currentCollection ? currentCollection.length : 0} Pokemon Synced`;
        scanStatusBadge.style.color = '#8eaad0';
        if (activeBattleStatusMsg) {
          activeBattleStatusMsg.style.color = '#8eaad0';
          activeBattleStatusMsg.textContent = 'Auto-recording is active in live battles!';
        }
      } else if (data.step === 'harvesting') {
        scanStatusBadge.textContent = `Harvesting ${data.current}/${data.total} (${data.trainerName})...`;
        scanStatusBadge.style.color = '#388bfd';
      } else if (data.step === 'completed') {
        scanStatusBadge.textContent = 'All trainers harvested!';
        scanStatusBadge.style.color = '#238636';
      } else if (data.step === 'error') {
        scanStatusBadge.textContent = 'Harvest error';
        scanStatusBadge.style.color = '#f87171';
      }
    }
  }

  if (event.channel === 'battle-opponents-detected') {
    const data = event.args[0] || {};
    if (data && Array.isArray(data.roster) && data.roster.length > 0) {
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
    if (teamBattleActionBtn) {
      teamBattleActionBtn.disabled = false;
    }
    if (teamActionStatus) {
      if (data.success === false) {
        teamActionStatus.textContent = data.message || 'Action Failed';
        teamActionStatus.style.color = '#f87171';
      } else {
        teamActionStatus.textContent = data.action === 'select-lead-and-start' ? 'Battle Started!' : 'Move Cast!';
        teamActionStatus.style.color = '#10b981';
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
              if (delugeView) delugeView.loadURL('https://www.delugerpg.com/login');
            } catch (_) {}
            setTimeout(() => { window.__delugeForbiddenRecoveryInProgress = false; }, 5000);
          }, 600);
        });
      }
      return;
    }
    guestReportsMap = !!(data.isMap && data.hasMapEl !== false);
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

      const shouldAutoStart = (config.settings && config.settings.autoStartOnMap !== false) || wasHuntingBeforeAutoCatch;
      if (!isRunning && !userManuallyPaused && !isEncounterOnScreen && !isUnlockChallengeActive && shouldAutoStart) {
        if (!autoStartTimer) {
          wasHuntingBeforeAutoCatch = false;
          triggerDelayedAutoStart('Map presence confirmed by guest');
        }
      }
    }
  }

  if (event.channel === 'target-found') {
    isStepPending = false;
    if (!isRunning) {
      // STRICT SAFETY: Only react to screen targets during an active hunting session!
      return;
    }

    const data = event.args[0] || {};
    const name = data.name || 'Rare Pokemon';
    if (config.settings && config.settings.avoidDuplicates !== false && data.isDuplicate) {
      backendLog('TargetDuplicate', `Skipping duplicate target encounter: ${name}`);
      return;
    }
    backendLog('TargetHalt', `TARGET HALT: ${name} (Category: ${data.category || 'Target'})`);

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

    updateStatus(`FOUND: ${name}!`, '#22c55e');

    // Play alert sounds
    playSound(880, 0.8);
    setTimeout(() => playSound(1100, 0.8), 300);

    new Notification('Target Pokemon Found!', {
      body: `${name} has appeared on the map! Ready for capture.`
    });
  }

  if (event.channel === 'autocatch-status') {
    const data = event.args[0] || {};
    const step = data.step || '';
    const delaySec = data.delay ? (data.delay / 1000).toFixed(1) : '';

    if (step === 'clicking-try-catch') {
      isAutoCatchCountdownActive = true;
      const name = data.target || 'Target Pokemon';
      updateStatus(`Auto-Catch: Try Catch (${delaySec}s)...`, '#38bdf8');
      backendLog('AutoCatch', `Target encounter: ${name}. Waiting ${data.delay}ms to click Try to Catch It.`);
    } else if (step === 'starting-battle') {
      isAutoCatchCountdownActive = true;
      updateStatus(`Auto-Catch: Battle Start (${delaySec}s)...`, '#38bdf8');
      backendLog('AutoCatch', `Battle screen reached. Waiting ${data.delay}ms to click Start Battle.`);
    } else if (step === 'selecting-master-ball') {
      isAutoCatchCountdownActive = true;
      const stockStr = (typeof data.stock === 'number') ? ` (Stock: ${data.stock})` : '';
      if (typeof data.stock === 'number') {
        dailyCatchData.masterBallStock = data.stock;
        saveDailyCatchLog();
        updateCatchLogBadge();
        renderCatchLogUI();
      }
      updateStatus(`Auto-Catch: Select Ball (${delaySec}s)...`, '#eab308');
      backendLog('AutoCatch', `Selecting Master Ball${stockStr}. Waiting ${data.delay}ms.`);
    } else if (step === 'throwing-master-ball') {
      isAutoCatchCountdownActive = true;
      const stockStr = (typeof data.stock === 'number') ? ` (Stock: ${data.stock})` : '';
      if (typeof data.stock === 'number') {
        dailyCatchData.masterBallStock = data.stock;
        saveDailyCatchLog();
        updateCatchLogBadge();
        renderCatchLogUI();
      }
      updateStatus(`Auto-Catch: Throw Ball (${delaySec}s)...`, '#eab308');
      backendLog('AutoCatch', `Throwing Master Ball${stockStr}. Waiting ${data.delay}ms.`);
    } else if (step === 'returning-to-map') {
      isAutoCatchCountdownActive = true;
      updateStatus(`Auto-Catch: Return Map (${delaySec}s)...`, '#22c55e');
      backendLog('AutoCatch', `Catch confirmed! Waiting ${data.delay}ms to click Return to Map.`);
    } else if (step === 'completed') {
      isAutoCatchCountdownActive = false;
      const name = data.target || 'Target Pokemon';
      const remainingStr = (typeof data.stockRemaining === 'number') ? ` (Remaining Stock: ${data.stockRemaining})` : '';
      updateStatus(`Caught: ${name}! Resuming...`, '#22c55e');
      backendLog('AutoCatch', `${name} successfully captured via Master Ball${remainingStr}.`);
      userManuallyPaused = false;
      wasHuntingBeforeAutoCatch = true;

      recordCaughtPokemon(data.pokemon || {
        name: name,
        fullName: name,
        variant: 'Normal',
        level: '?',
        sprite: '',
        category: 'Wild Encounter',
        ball: 'Master Ball',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }, data.stockRemaining);
    } else if (step === 'out-of-stock') {
      isAutoCatchCountdownActive = false;
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
    if (!autoStartTimer) {
      triggerDelayedAutoStart('Map loaded on dom-ready');
    }
  }
});

// --- UI EVENT LISTENERS ---

toggleBtn.addEventListener('click', toggleHunting);

soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
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
  const isVar = filterVariantsCheckbox ? filterVariantsCheckbox.checked : false;

  if (legVariantsWrap) legVariantsWrap.classList.toggle('dimmed', !isLeg);
  if (megaVariantsWrap) megaVariantsWrap.classList.toggle('dimmed', !isMega);
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

  if (targetSummaryText) {
    targetSummaryText.textContent = calculateTargetSummary(
      isLeg, isMega, isVar, isLevel, levelMode, levelVal, levelScope,
      {
        classicLeg, ubLeg, paradoxLeg,
        selectedVariants: selectedVars,
        legendaryVariants: selectedLegVars,
        megaVariants: selectedMegaVars,
        customTargets,
        blacklist
      }
    );
  }
}

// Bind live change listeners to all target modal controls
[
  filterLegendariesCheckbox, subClassicLegCheckbox, subUltraBeastsCheckbox, subParadoxCheckbox,
  filterMegasCheckbox, filterVariantsCheckbox
].forEach(cb => {
  if (cb) cb.addEventListener('change', refreshModalSummary);
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

function switchToVariantsTab() {
  const targetTab2 = document.getElementById('targetTab2');
  if (targetTab2) targetTab2.checked = true;
  document.querySelectorAll('.modal-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === 'tabVariants');
  });
  document.querySelectorAll('.modal-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === 'tabVariants');
  });
}

if (legTierVariantsBadge) legTierVariantsBadge.addEventListener('click', switchToVariantsTab);
if (megaTierVariantsBadge) megaTierVariantsBadge.addEventListener('click', switchToVariantsTab);
if (wildTierVariantsBadge) wildTierVariantsBadge.addEventListener('click', switchToVariantsTab);

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

    const isMega = filterMegasCheckbox ? filterMegasCheckbox.checked : false;
    const isVar = filterVariantsCheckbox ? filterVariantsCheckbox.checked : false;

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

    let preset = 'custom';
    if (isLeg && isMega && isVar && !isLevel && hasNormal && specialCount === 9 && legAll10 && megaAll10 && !hasCustom) preset = 'all';
    else if (isLeg && isMega && isVar && !isLevel && !hasNormal && isShinyOnly && !hasCustom) preset = 'shinies';
    else if (!isLeg && !isMega && isVar && !isLevel && !hasNormal && specialCount === 9 && !hasCustom) preset = 'variants';
    else if (isLeg && isMega && !isVar && !isLevel && legAll10 && megaAll10 && !hasCustom) preset = 'legend_megas';
    else if (isLeg && !isMega && !isVar && !isLevel && legAll10 && !hasCustom) preset = 'legendaries';
    else if (!isLeg && isMega && !isVar && !isLevel && megaAll10 && !hasCustom) preset = 'megas';

    config.settings.targetPreset = preset;
    saveLocalConfig();
    updateTargetUI();
    closeTargetModal();

    delugeView.send('update-config', config.settings);
    syncHuntingState();
    updateStatus('Targets: ' + preset.toUpperCase() + ' applied', '#10b981');
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

let isManualReloadInProgress = false;
let manualReloadUnlockTimer = null;

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    if (manualReloadUnlockTimer) {
      clearTimeout(manualReloadUnlockTimer);
      manualReloadUnlockTimer = null;
    }
    isManualReloadInProgress = true;

    isGuestInputFocused = false;
    cancelPendingAutoStart('Manual page reload');

    // 1. Cleanly halt hunting and drop in-flight steps
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

    // 2. Abort guest actions and purge transient battle/navigation state
    if (delugeView && typeof delugeView.send === 'function') {
      try {
        delugeView.send('abort-autocatch');
        delugeView.send('hunting-state-changed', { isRunning: false });
      } catch (_) {}
    }
    isEncounterOnScreen = false;
    isAutoCatchCountdownActive = false;
    guestReportsMap = false;
    activeAiBattleData = null;
    liveBattleOpponent = null;
    if (typeof updateTeamBuilderBattleAction === 'function') updateTeamBuilderBattleAction(null);
    navBlockedStatus = {};
    blockedDirections = {};
    recentMoves = [];

    const reloadSvg = refreshBtn.querySelector('.reload-icon');
    if (reloadSvg) {
      reloadSvg.classList.remove('spinning');
      void reloadSvg.offsetWidth;
      reloadSvg.classList.add('spinning');
    }
    updateStatus('Reloading page...', '#38bdf8');

    // 3. Fire non-blocking soft cache flush in parallel (clears transient HTTP cache)
    try {
      ipcRenderer.invoke('soft-session-flush').catch(() => {});
    } catch (_) {}

    // 4. Immediate native reload dispatch with URL fallback (no stop() call to prevent aborted navigation)
    if (delugeView) {
      const currentTargetUrl = (typeof delugeView.getURL === 'function' && delugeView.getURL())
        || delugeView.src
        || 'https://www.delugerpg.com/map';
      backendLog('RELOAD', `Manual reload triggered for URL: ${currentTargetUrl}`);
      try {
        if (typeof delugeView.reload === 'function') {
          delugeView.reload();
        } else if (typeof delugeView.reloadIgnoringCache === 'function') {
          delugeView.reloadIgnoringCache();
        } else if (typeof delugeView.loadURL === 'function') {
          delugeView.loadURL(currentTargetUrl).catch(() => { delugeView.src = currentTargetUrl; });
        } else {
          delugeView.src = currentTargetUrl;
        }
      } catch (err) {
        backendLog('RELOAD_WARN', `Native reload failed: ${err.message}`);
        try {
          if (typeof delugeView.reloadIgnoringCache === 'function') {
            delugeView.reloadIgnoringCache();
          } else if (typeof delugeView.loadURL === 'function') {
            delugeView.loadURL(currentTargetUrl).catch(() => { delugeView.src = currentTargetUrl; });
          } else {
            delugeView.src = currentTargetUrl;
          }
        } catch (_) {}
      }
    }

    // Safety timeout in case webview navigation finishes without event
    manualReloadUnlockTimer = setTimeout(() => {
      if (isManualReloadInProgress) {
        isManualReloadInProgress = false;
        manualReloadUnlockTimer = null;
        if (reloadSvg) reloadSvg.classList.remove('spinning');
        if (!isRunning) updateStatus('Ready', '#10b981');
      }
    }, 3000);
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
    return filtered.filter(p => (typeof p.level === 'number' ? p.level : 100) < 100);
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

function resetTeamPrompt() {
  lastRecommendedTeam = null;
  if (teamResultContainer) teamResultContainer.style.display = 'none';
  if (teamResultList) teamResultList.innerHTML = '';
  if (teamActionRow) teamActionRow.style.display = 'none';
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
  teamRosterMode = mode;
  if (!config.settings) config.settings = {};
  config.settings.teamRosterMode = mode;
  saveLocalConfig();
  updateRosterModeUI();

  if (mode === 'TRAINING') {
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

function handleLiveBattleOpponents(data) {
  if (!data || !Array.isArray(data.roster) || data.roster.length === 0) return;

  // Mid-Battle Roster & Team Preservation
  if (data.isInActiveBattle && data.roster.length === 1) {
    const liveOpp = data.roster[0];
    const liveOppName = (liveOpp.name || '').toLowerCase().trim();

    const knownVariants = ['normal', 'shiny', 'metallic', 'ghostly', 'dark', 'shadow', 'mirage', 'retro', 'chrome', 'negative'];
    const stripVar = (s) => {
      let clean = (s || '').toLowerCase().trim();
      for (let i = 0; i < knownVariants.length; i++) {
        const v = knownVariants[i];
        if (clean.indexOf(v + ' ') === 0) {
          clean = clean.substring(v.length + 1).trim();
          break;
        }
      }
      return clean.replace(/[^a-z0-9]/g, '');
    };
    const cleanLiveBase = stripVar(liveOppName);

    // 1. Check if previous activeAiBattleData had full roster for this trainer
    if (activeAiBattleData && activeAiBattleData.trainerName &&
        activeAiBattleData.trainerName.toLowerCase() === (data.trainerName || '').toLowerCase() &&
        Array.isArray(activeAiBattleData.roster) && activeAiBattleData.roster.length > 1) {
      const prevRoster = activeAiBattleData.roster;
      const matchIdx = prevRoster.findIndex(p => {
        const pClean = (p.name || '').toLowerCase().trim();
        return pClean === liveOppName || stripVar(pClean) === cleanLiveBase;
      });
      if (matchIdx !== -1) {
        for (let i = 0; i < matchIdx; i++) {
          prevRoster[i].isFainted = true;
          prevRoster[i].hp = 0;
        }
        prevRoster[matchIdx].hp = liveOpp.hp;
        prevRoster[matchIdx].maxHp = liveOpp.maxHp;
        prevRoster[matchIdx].level = liveOpp.level;
        prevRoster[matchIdx].types = liveOpp.types;
        prevRoster[matchIdx].isFainted = (liveOpp.hp !== undefined && liveOpp.hp <= 0);
        if (liveOpp.sprite) prevRoster[matchIdx].sprite = liveOpp.sprite;
        data.roster = prevRoster;
      } else {
        prevRoster.push(liveOpp);
        data.roster = prevRoster;
      }
    } else if (gymLeadersData && data.trainerName) {
      // 2. Check gymLeadersData for known roster of this trainer
      const cleanName = data.trainerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      let knownLeader = null;
      const allGroups = [
        gymLeadersData.ULTIMATE_TRAINERS,
        gymLeadersData.STRONG_TRAINERS,
        gymLeadersData.VIP_TRAINERS,
        gymLeadersData.STANDARD_TRAINERS
      ];
      for (const group of allGroups) {
        if (!group) continue;
        knownLeader = group.find(t => t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName);
        if (knownLeader) break;
      }
      if (!knownLeader && gymLeadersData.GYM_LEAGUES) {
        for (const reg in gymLeadersData.GYM_LEAGUES) {
          knownLeader = gymLeadersData.GYM_LEAGUES[reg].find(t => t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName);
          if (knownLeader) break;
        }
      }
      if (knownLeader && Array.isArray(knownLeader.roster) && knownLeader.roster.length > 1) {
        const fullRoster = knownLeader.roster.map(p => ({
          name: p.name,
          types: p.types || ['Normal'],
          level: p.level || 100,
          hp: 400,
          maxHp: 400,
          isFainted: false,
          moves: p.moves || []
        }));
        const mIdx = fullRoster.findIndex(p => {
          const pClean = (p.name || '').toLowerCase().trim();
          return pClean === liveOppName || stripVar(pClean) === cleanLiveBase;
        });
        if (mIdx !== -1) {
          for (let i = 0; i < mIdx; i++) {
            fullRoster[i].isFainted = true;
            fullRoster[i].hp = 0;
          }
          fullRoster[mIdx].hp = liveOpp.hp;
          fullRoster[mIdx].maxHp = liveOpp.maxHp;
          fullRoster[mIdx].level = liveOpp.level;
          fullRoster[mIdx].types = liveOpp.types;
          fullRoster[mIdx].isFainted = (liveOpp.hp !== undefined && liveOpp.hp <= 0);
        }
        data.roster = fullRoster;
      }
    }

    // Preserve userTeam if current turn data has empty userTeam but previous had it
    if ((!data.userTeam || data.userTeam.length === 0) && activeAiBattleData && Array.isArray(activeAiBattleData.userTeam) && activeAiBattleData.userTeam.length > 0) {
      data.userTeam = activeAiBattleData.userTeam;
    }
  }

  // Track and retain userTeam across preparation, challenge preview, and active battle screens
  if (Array.isArray(data.userTeam) && data.userTeam.length > 0) {
    lastKnownUserTeam = data.userTeam;
  } else if ((!data.userTeam || data.userTeam.length === 0) && Array.isArray(lastKnownUserTeam) && lastKnownUserTeam.length > 0) {
    data.userTeam = lastKnownUserTeam;
  }

  // Detect G-Max Challenge and Challenge Arena locks
  const isChallenge = Boolean(
    data.isChallengePreview ||
    data.isGmaxChallenge ||
    data.isChallengeLocked ||
    (data.battleUrl && data.battleUrl.indexOf('challenge') !== -1) ||
    (data.trainerTitle && data.trainerTitle.indexOf('Challenge') !== -1)
  );
  if (isChallenge) {
    data.isChallengeLocked = true;
  }

  activeAiBattleData = data;
  if (typeof updateLiveAiAssistantUI === 'function') {
    updateLiveAiAssistantUI(data);
  }
  liveBattleOpponent = {
    name: data.trainerName || 'Challenger',
    trainerName: data.trainerName || 'Challenger',
    trainerTitle: data.trainerTitle || data.trainerName || 'Challenger',
    roster: data.roster,
    battleUrl: data.battleUrl || '/battle/live',
    npcId: data.npcId,
    isProfileStalk: !!data.isProfileStalk,
    isManualCheck: !!data.isManualCheck
  };
  if (data.battleUrl && !lastSelectedBattleUrl) {
    lastSelectedBattleUrl = data.battleUrl;
  }
  const oppSig = `${data.trainerName}:${data.battleUrl || ''}:${data.roster.map(p => p.name).join(',')}`;
  const isNewOpponent = (lastLoggedBattleOpponentSig !== oppSig);
  if (isNewOpponent) {
    lastLoggedBattleOpponentSig = oppSig;
    backendLog('BATTLE_DETECTOR', `Opponent detected: ${data.trainerName} (${data.roster.length} Pokemon)`);
  }

  // Auto-learn into gymLeadersData and persist to gym_leaders.json (skip for stalked player profiles)
  if (gymLeadersData && data.trainerName && !data.isProfileStalk) {
    let targetTrainer = null;
    const cleanSearchName = data.trainerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const allGroups = [
      gymLeadersData.ULTIMATE_TRAINERS,
      gymLeadersData.STRONG_TRAINERS,
      gymLeadersData.VIP_TRAINERS,
      gymLeadersData.STANDARD_TRAINERS
    ];
    for (const group of allGroups) {
      if (!group) continue;
      targetTrainer = group.find(t => {
        const cName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cName === cleanSearchName || (t.npcId && data.npcId && t.npcId === data.npcId);
      });
      if (targetTrainer) break;
    }
    if (!targetTrainer && gymLeadersData.GYM_LEAGUES) {
      for (const reg in gymLeadersData.GYM_LEAGUES) {
        targetTrainer = gymLeadersData.GYM_LEAGUES[reg].find(t => {
          const cName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cName === cleanSearchName;
        });
        if (targetTrainer) break;
      }
    }

    if (targetTrainer && !data.isVictoryScreen) {
      if (!Array.isArray(targetTrainer.roster)) targetTrainer.roster = [];
      let updated = false;
      if (data.isPreparationScreen && Array.isArray(data.roster) && data.roster.length > 0 && data.roster.length <= 6) {
        const cleanCurrent = targetTrainer.roster.map(p => `${p.name}_${p.level}`).join(',');
        const cleanIncoming = data.roster.map(p => `${p.name}_${p.level}`).join(',');
        if (cleanCurrent !== cleanIncoming) {
          targetTrainer.roster = data.roster.map(p => ({
            name: p.name,
            types: p.types || ['Normal'],
            level: p.level || targetTrainer.avgLevel || 50,
            sprite: p.sprite || ''
          }));
          updated = true;
        }
      } else {
        for (const newPoke of data.roster) {
          if (targetTrainer.roster.length >= 6) break;
          const existing = targetTrainer.roster.find(p => p.name.toLowerCase() === newPoke.name.toLowerCase());
          if (!existing) {
            targetTrainer.roster.push({
              name: newPoke.name,
              types: newPoke.types || ['Normal'],
              level: newPoke.level || targetTrainer.avgLevel || 50,
              sprite: newPoke.sprite || ''
            });
            updated = true;
          }
        }
      }
      if (updated) {
        try {
          const gymPath = getWritableDataPath('gym_leaders.json');
          fs.writeFileSync(gymPath, JSON.stringify(gymLeadersData, null, 2), 'utf8');
          backendLog('ROSTER_HARVESTER', `Updated ${targetTrainer.name} roster (${targetTrainer.roster.length}/6 known)`);
          populateGymTrainerSelect();
          if (targetLeader && targetLeader.name && targetLeader.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanSearchName) {
            targetLeader = targetTrainer;
            if (typeof buildAndRenderTeam === 'function') {
              buildAndRenderTeam();
            }
          }
        } catch (e) {
          backendLog('ROSTER_HARVESTER', `Failed saving roster: ${e.message}`);
        }
      }
    }
  }

  if (!teamTrainerSelect) return;

  if (!data.isProfileStalk) {
    let liveGroup = document.getElementById('optgroup-live-battle');
    if (!liveGroup) {
      liveGroup = document.createElement('optgroup');
      liveGroup.id = 'optgroup-live-battle';
      liveGroup.label = 'CURRENT BATTLE (LIVE DETECTED)';
      teamTrainerSelect.insertBefore(liveGroup, teamTrainerSelect.firstChild);
    }
    liveGroup.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = 'LIVE__BATTLE';
    opt.textContent = `${data.trainerTitle || data.trainerName} (${data.roster.length} Pokemon)`;
    liveGroup.appendChild(opt);

    // Pre-select live opponent only if user has not already built an active team lineup
    if (!lastRecommendedTeam || lastRecommendedTeam.length === 0) {
      teamTrainerSelect.value = 'LIVE__BATTLE';
    }
  }

  // Only populate the PvP LIVE OPPONENT card when user explicitly clicked "Check Active Screen"
  if (data.isManualCheck) {
    activePvpTargetType = 'LIVE';
    if (typeof updateLiveChallengerUI === 'function') {
      updateLiveChallengerUI(liveBattleOpponent);
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

function recordLearnedOpponentMove(trainerName, pokemonName, moveName) {
  if (!pokemonName || !moveName) return;

  let moveType = null;
  try {
    const skillsDb = require('./skills_database.json');
    const moveKey = moveName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = skillsDb.moves && (skillsDb.moves[moveKey] || Object.values(skillsDb.moves).find(m => m.name && m.name.toLowerCase() === moveName.toLowerCase()));
    if (found && found.type) {
      moveType = found.type;
    }
  } catch (_) {}

  if (!moveType && typeof teamEngine !== 'undefined' && typeof teamEngine.resolveMove === 'function') {
    const resolved = teamEngine.resolveMove(moveName);
    if (resolved && resolved.type && resolved.type !== 'Normal') {
      moveType = resolved.type;
    }
  }

  if (!moveType) moveType = 'Normal';

  let didUpdate = false;
  if (gymLeadersData && typeof gymLeadersData === 'object') {
    Object.values(gymLeadersData).forEach(list => {
      if (!Array.isArray(list)) return;
      list.forEach(t => {
        const matchesTrainer = !trainerName || (t.name && t.name.toLowerCase() === trainerName.toLowerCase());
        if (matchesTrainer && Array.isArray(t.roster)) {
          t.roster.forEach(p => {
            if (p.name && p.name.toLowerCase() === pokemonName.toLowerCase()) {
              p.moves = p.moves || [];
              if (!p.moves.some(m => m.name && m.name.toLowerCase() === moveName.toLowerCase())) {
                p.moves.push({ name: moveName, type: moveType });
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
        if (!p.moves.some(m => m.name && m.name.toLowerCase() === moveName.toLowerCase())) {
          p.moves.push({ name: moveName, type: moveType });
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
      updateRosterModeUI();
      syncUserCollectionToGuest();
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
      populateGymTrainerSelect(activeCategory);
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

  if (liveBattleOpponent && Array.isArray(liveBattleOpponent.roster) && liveBattleOpponent.roster.length > 0) {
    const liveGroup = document.createElement('optgroup');
    liveGroup.id = 'optgroup-live-battle';
    liveGroup.label = 'CURRENT BATTLE (LIVE DETECTED)';
    liveGroup.style.cssText = 'color: #58a6ff; background: #0c1c38; font-weight: 800; font-style: normal; letter-spacing: 0.5px;';
    const opt = document.createElement('option');
    opt.value = 'LIVE__BATTLE';
    opt.textContent = `[LIVE] ${liveBattleOpponent.trainerTitle || liveBattleOpponent.trainerName} (${liveBattleOpponent.roster.length} Pokemon)`;
    opt.style.cssText = 'color: #79c0ff; background: #070e1a; font-weight: 700;';
    liveGroup.appendChild(opt);
    teamTrainerSelect.appendChild(liveGroup);
    matchCount++;
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

  if (prevSelectedValue && teamTrainerSelect.querySelector(`option[value="${prevSelectedValue}"]`)) {
    teamTrainerSelect.value = prevSelectedValue;
  } else if (liveBattleOpponent) {
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
    if (teamActionRow) teamActionRow.style.display = 'none';
  } else {
    if (teamEmptyPrompt) teamEmptyPrompt.style.display = 'none';
    if (teamResultContainer) teamResultContainer.style.display = 'block';
    if (teamActionRow) teamActionRow.style.display = 'flex';
  }
  if (typeof updateTeamBuilderBattleAction === 'function') {
    updateTeamBuilderBattleAction(activeAiBattleData);
  }
}

function closeTeamBuilderPanel() {
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

function handleAdDetected(ad) {
  if (!ad) return;
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
    if (scanStatusDot) scanStatusDot.style.background = '#388bfd';
    if (scanStatusBadge) {
      scanStatusBadge.style.color = '#388bfd';
      scanStatusBadge.textContent = 'Scanning...';
    }
    delugeView.send('start-scan-pokemon');
  });
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
  if (modalRosterCountBadge) {
    modalRosterCountBadge.textContent = `${gymKnown}/${gymTotal} Gyms (${Math.round((gymKnown / (gymTotal || 1)) * 100)}%) - ${oppKnown}/${oppTotal} Total`;
  }
  const gymsTile = document.getElementById('modalIntelGymsStat');
  if (gymsTile) gymsTile.textContent = `${gymKnown} / ${gymTotal}`;
  const totalTile = document.getElementById('modalIntelTotalStat');
  if (totalTile) totalTile.textContent = `${oppKnown} / ${oppTotal}`;
}

function probeTrainerRostersDirectly(targetTrainers) {
  if (!delugeView) return;
  delugeView.send('start-scan-trainer-rosters', { trainers: targetTrainers });
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
    const emptyMsg = teamRosterMode === 'TRAINING'
      ? 'No eligible training counters (&lt; Lv 100) found.'
      : 'No eligible counters found.';
    teamResultList.innerHTML = `<div style="padding:16px 10px; color:rgba(244, 238, 232, 0.7); font-size:11px; text-align:center;">${emptyMsg}</div>`;
    if (teamActionRow) teamActionRow.style.display = 'none';
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

  if (teamActionRow) teamActionRow.style.display = 'flex';
  if (teamActionStatus) teamActionStatus.textContent = '';
  if (typeof updateTeamBuilderBattleAction === 'function') {
    updateTeamBuilderBattleAction(activeAiBattleData);
  }
}

function executeTeamBuild(targetLeader) {
  if (!targetLeader) return;

  if (!currentCollection || currentCollection.length === 0) {
    loadTeamBuilderData();
  }

  if (currentCollection.length === 0) {
    if (teamResultContainer) teamResultContainer.style.display = 'block';
    if (teamResultList) teamResultList.innerHTML = '<div style="padding:10px; color:#f87171; font-size:11px; text-align:center;">No Pokemon in database. Click "Scan My Box" first.</div>';
    if (teamActionRow) teamActionRow.style.display = 'none';
    return;
  }

  if (teamRosterMode === 'TRAINING') {
    const effectivePool = getEffectiveFilteredPool(currentCollection || [], teamPoolFilter);
    const trainees = effectivePool.filter(p => (p.level || 100) < 100);
    const lvl100Pokes = effectivePool.filter(p => (p.level || 0) === 100);
    const highLvlPokes = effectivePool.filter(p => (p.level || 0) >= 70);

    if (trainees.length === 0) {
      const filterLabels = {
        ANY: 'training candidates (< Lv 100)',
        GMAX: 'G-Max training candidates (< Lv 100)',
        MEGA: 'Mega training candidates (< Lv 100)',
        GMAX_MEGA: 'G-Max & Mega training candidates (< Lv 100)',
        LEGENDARY: 'Legendary training candidates (< Lv 100)',
        ULTRABEAST: 'Ultra Beast training candidates (< Lv 100)',
        PARADOX: 'Paradox training candidates (< Lv 100)',
        COMMON: 'Common training candidates (< Lv 100)'
      };
      const label = filterLabels[teamPoolFilter] || 'training candidates (< Lv 100)';
      if (teamResultContainer) teamResultContainer.style.display = 'block';
      if (teamResultList) {
        teamResultList.innerHTML = `<div style="padding:16px 10px; color:rgba(244, 238, 232, 0.7); font-size:11px; text-align:center;">No ${label} available in your collection.<br><span style="color:rgba(244, 238, 232, 0.5); font-size:10px;">Switch to <b>Maxed Team</b> or switch pool filter to <b>Any</b>.</span></div>`;
      }
      if (teamActionRow) teamActionRow.style.display = 'none';
      return;
    }

    // 1. Pick carry defense-first: A carry must GUARANTEE the survival of the low-level trainees.
    // First, try Level 100s from the user's selected candidate pool that can solo the trainer;
    // If none can solo, search the ENTIRE collection for a Level 100 capable of soloing the trainer;
    // If none can strictly solo, rank all collection Level 100s by lead-safety & survivability.
    // This ensures a low-level team is NEVER led by a fragile or under-leveled Pokemon that dies first!
    const collectionLvl100s = (currentCollection || []).filter(p => (p.level || 0) === 100);
    const collectionHighLvls = (currentCollection || []).filter(p => (p.level || 0) >= 70);

    let rankedCarries = [];
    if (lvl100Pokes.length > 0) {
      const poolSoloers = lvl100Pokes.filter(p => teamEngine.canSoloTrainer(p, targetLeader));
      if (poolSoloers.length > 0) {
        rankedCarries = teamEngine.rankCarries(poolSoloers, targetLeader);
      }
    }
    if (rankedCarries.length === 0 && collectionLvl100s.length > 0) {
      const allSoloers = collectionLvl100s.filter(p => teamEngine.canSoloTrainer(p, targetLeader));
      if (allSoloers.length > 0) {
        rankedCarries = teamEngine.rankCarries(allSoloers, targetLeader);
      }
    }
    if (rankedCarries.length === 0 && collectionLvl100s.length > 0) {
      rankedCarries = teamEngine.rankCarries(collectionLvl100s, targetLeader);
    }
    if (rankedCarries.length === 0) {
      const fallbackPool = highLvlPokes.length > 0 ? highLvlPokes : collectionHighLvls;
      rankedCarries = teamEngine.rankCarries(fallbackPool.length > 0 ? fallbackPool : (currentCollection || []), targetLeader);
    }
    const carryPoke = rankedCarries.length > 0 ? rankedCarries[0].poke : null;
    const bestCarries = carryPoke ? teamEngine.buildBestTeam(targetLeader, [carryPoke]) : [];
    const carry = bestCarries.length > 0 ? bestCarries[0] : null;

    // 2. Trainees filtered to prevent duplicate species with carry
    const carrySpecies = carry ? teamEngine.getBaseSpecies(carry.name) : '';
    const availableTrainees = trainees.filter(p => (!carry || p.id !== carry.id) && (!carrySpecies || teamEngine.getBaseSpecies(p.name) !== carrySpecies));

    const hybridTeam = [];

    // Slot 1: Unstoppable Max Level Carry Anchor (Always Level 100)
    if (carry) {
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
        isAtRisk: isAtRisk
      });
    }

    // Slot 2: Primary Trainee Partner (The trainee that can defeat/sweep the most opponents alongside the carry)
      const rankedPartners = typeof teamEngine.rankTraineePartners === 'function'
        ? teamEngine.rankTraineePartners(availableTrainees, targetLeader)
        : availableTrainees.map(t => ({ poke: t }));

      const primaryPartner = rankedPartners.length > 0 ? rankedPartners[0].poke : null;

      if (primaryPartner) {
        const partnerMove = teamEngine.getRosterWideBestAttack(primaryPartner, targetLeader);
        hybridTeam.push({
          slot: 2,
          id: primaryPartner.id,
          name: primaryPartner.name,
          variant: primaryPartner.variant,
          level: primaryPartner.level,
          types: primaryPartner.types,
          sprite: primaryPartner.sprite,
          bestMove: partnerMove,
          targetName: 'Primary Trainee Partner',
          role: 'Primary Trainee Duo (Lv ' + primaryPartner.level + ')',
          score: rankedPartners[0].score || 500
        });
      }

      // Slots 3 to 6: Remaining trainees (ranked by matchup effectiveness against opponent)
      const otherRankedTrainees = rankedPartners.slice(1).map(r => r.poke);
      for (let i = 0; i < otherRankedTrainees.length && hybridTeam.length < 6; i++) {
        const t = otherRankedTrainees[i];
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
          score: 100
        });
      }

      // Fill remaining slots up to 6 with high-level reserve anchors from collection
      if (hybridTeam.length < 6) {
        const usedIds = new Set(hybridTeam.map(m => m.id));
        const reservePool = (currentCollection || [])
          .filter(p => !usedIds.has(p.id))
          .sort((a, b) => (b.level || 0) - (a.level || 0));
        for (let i = 0; i < reservePool.length && hybridTeam.length < 6; i++) {
          const res = reservePool[i];
          usedIds.add(res.id);
          hybridTeam.push({
            slot: hybridTeam.length + 1,
            id: res.id,
            name: res.name,
            variant: res.variant,
            level: res.level,
            types: res.types,
            sprite: res.sprite,
            bestMove: teamEngine.getRosterWideBestAttack(res, targetLeader),
            targetName: 'Reserve Anchor',
            role: 'Reserve Anchor (Lv ' + res.level + ')',
            score: 200
          });
        }
      }

    lastRecommendedTeam = hybridTeam;
    renderTeamLineup(targetLeader, hybridTeam);
    if (teamActionStatus) {
      const leadMember = hybridTeam[0];
      if (leadMember && leadMember.isAtRisk) {
        teamActionStatus.innerHTML = '<span style="color:#f87171; font-weight:600;">&#9888; Carry has elemental vulnerability - change trainer recommended.</span>';
        teamActionStatus.style.display = 'block';
      } else {
        teamActionStatus.style.display = 'none';
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
    if (teamActionRow) teamActionRow.style.display = 'none';
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
    if (teamActionRow) teamActionRow.style.display = 'none';
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
      if (teamActionRow) teamActionRow.style.display = 'none';
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
      if (teamActionRow) teamActionRow.style.display = 'none';
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
      if (teamActionRow) teamActionRow.style.display = 'none';
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
      const pvpTarget = (activePvpTargetType === 'LIVE' && liveBattleOpponent)
        ? liveBattleOpponent
        : (scoutedPlayerOpponent || liveBattleOpponent);
      const canSyncBox = (pvpStrategy === 'GODSQUAD') || (pvpTarget && Array.isArray(pvpTarget.roster) && pvpTarget.roster.length > 0);
      if (canSyncBox && delugeView && typeof delugeView.send === 'function' && !isBuildSyncInProgress) {
        isBuildSyncInProgress = true;
        pendingBuildLeader = (pvpStrategy === 'GODSQUAD')
          ? { name: 'Live PvP Universal Meta', isPvpMeta: true, isPvp: true }
          : (pvpTarget || { name: 'Live Challenger', isPvp: true });
        buildTeamBtn.innerHTML = '<span>&#8635;</span><span>Syncing Box...</span>';
        if (scanStatusBadge) {
          scanStatusBadge.textContent = 'Syncing box...';
          scanStatusBadge.style.color = '#388bfd';
        }
        delugeView.send('start-scan-pokemon');
      }
      return;
    }
    const isGmaxChallenge = (teamCategorySelect && teamCategorySelect.value === 'GMAX_CHALLENGE') ||
                            (teamTrainerSelect && teamTrainerSelect.value === 'GMAX_CHALLENGE');

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
        if (gymLeadersData && liveBattleOpponent.trainerName) {
          const cleanSearchName = liveBattleOpponent.trainerName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const allGroups = [
            gymLeadersData.ULTIMATE_TRAINERS,
            gymLeadersData.STRONG_TRAINERS,
            gymLeadersData.VIP_TRAINERS,
            gymLeadersData.STANDARD_TRAINERS
          ];
          for (const group of allGroups) {
            if (!group) continue;
            const found = group.find(t => t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanSearchName);
            if (found && found.types && found.types.length > 0) {
              matchedTypes = found.types;
              break;
            }
          }
        }
        targetLeader = {
          name: liveBattleOpponent.trainerName,
          roster: liveBattleOpponent.roster,
          types: matchedTypes
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

    // 1. Build immediately with existing cached collection for zero latency
    executeTeamBuild(targetLeader);

    // 2. Automatically sync freshest Pokemon data from Box (doing the same as Scan My Box)
    if (delugeView && typeof delugeView.send === 'function' && !isBuildSyncInProgress) {
      isBuildSyncInProgress = true;
      pendingBuildLeader = targetLeader;
      buildTeamBtn.innerHTML = '<span>&#8635;</span><span>Syncing Box...</span>';
      if (scanStatusBadge) {
        scanStatusBadge.textContent = 'Syncing box...';
        scanStatusBadge.style.color = '#388bfd';
      }
      delugeView.send('start-scan-pokemon');
    }
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
    applyTeamBtn.disabled = true;
    if (battleOpponentBtn) battleOpponentBtn.disabled = true;
    applyTeamBtn.innerHTML = '<span>&#8635;</span> <span>Saving...</span>';
    if (teamActionStatus) {
      teamActionStatus.textContent = 'Applying team on DelugeRPG...';
      teamActionStatus.style.color = '#388bfd';
    }
    delugeView.send('apply-team-slots', { pokemonIds: ids, pokemons: lastRecommendedTeam });
    setTimeout(() => {
      if (applyTeamBtn && applyTeamBtn.disabled) {
        applyTeamBtn.disabled = false;
        applyTeamBtn.innerHTML = 'Change Team';
      }
      if (battleOpponentBtn) battleOpponentBtn.disabled = false;
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
    return '/challenge/gmax';
  }

  // The explicitly selected Target Battle Opponent in the dropdown ALWAYS takes highest priority
  const selVal = teamTrainerSelect ? teamTrainerSelect.value : '';

  if (selVal === 'LIVE__BATTLE') {
    if (liveBattleOpponent) {
      if (liveBattleOpponent.battleUrl) return liveBattleOpponent.battleUrl;
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

  // Fallbacks if dropdown is unselected
  if (lastSelectedBattleUrl) return lastSelectedBattleUrl;
  return '/battle/trainer';
}

if (battleOpponentBtn) {
  battleOpponentBtn.addEventListener('click', () => {
    if (isUnlockChallengeActive || isCaptchaAlarmActive) return;
    const battleUrl = resolveTargetBattleUrl();
    const fullUrl = battleUrl.startsWith('http') ? battleUrl : `https://www.delugerpg.com${battleUrl}`;

    battleOpponentBtn.disabled = true;
    if (applyTeamBtn) applyTeamBtn.disabled = true;
    battleOpponentBtn.innerHTML = '<span>&#8635;</span> <span>Entering...</span>';
    if (teamActionStatus) {
      teamActionStatus.textContent = 'Entering battle arena on DelugeRPG...';
      teamActionStatus.style.color = '#388bfd';
    }

    // Natural human click-to-navigation pacing
    setTimeout(() => {
      if (delugeView) {
        try {
          const curUrl = delugeView.getURL() || '';
          if (curUrl === fullUrl) {
            delugeView.reload();
          } else {
            delugeView.loadURL(fullUrl);
          }
          delugeView.focus();
        } catch (err) {
          console.error('Error entering battle arena:', err);
        }
      }

      setTimeout(() => {
        if (battleOpponentBtn) {
          battleOpponentBtn.disabled = false;
          battleOpponentBtn.innerHTML = '<span>&#9876;</span> <span>Battle Now</span>';
        }
        if (applyTeamBtn) {
          applyTeamBtn.disabled = false;
        }
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

if (teamTrainerSelect) {
  teamTrainerSelect.addEventListener('change', () => {
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
    html += `
      <div class="caught-pokemon-card">
        <div class="caught-card-thumb">${spriteTag}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <span style="font-size: 11.5px; font-weight: 700; color: #e0ecfa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</span>
            <span style="font-size: 9.5px; color: #8eaad0; font-weight: 600;">${p.timestamp || ''}</span>
          </div>
          <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(56, 139, 253, 0.15); border: 1px solid #388bfd; color: #388bfd; font-weight: 600;">${p.variant || 'Normal'}</span>
            <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: #070e1a; border: 1px solid #1a283e; color: #8eaad0; font-weight: 600;">Lv ${p.level || '?'}</span>
            <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(210, 153, 34, 0.15); border: 1px solid #d29922; color: #d29922; font-weight: 600;">${p.ball || 'Master Ball'}</span>
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
    dailyCatchData.caught.unshift(pokemon);
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
  if (!battleData || !Array.isArray(battleData.roster) || battleData.roster.length === 0) {
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

function handleEvolveMoveSelection(card) {
  const pName = card.targetPokemon || card.fullName || 'Pokemon';
  const availableMoves = Array.isArray(card.availableMoves) ? card.availableMoves : [];

  const evalResult = (evolutionEngine && evolutionEngine.evaluateEvolutionMoveSelection)
    ? evolutionEngine.evaluateEvolutionMoveSelection(pName, availableMoves.map(m => m.name), currentCollection)
    : { recommendedMoves: [], dropMoves: [], slotOrder: [], types: [] };

  card.recommendedMoves = evalResult.recommendedMoves;
  card.dropMoves = evalResult.dropMoves;
  card.slotOrder = evalResult.slotOrder;
  if (evalResult.types && evalResult.types.length > 0) card.types = evalResult.types;

  // 1. Update AI Assistant Header Badges
  if (aiBattleOpponentBadge) {
    aiBattleOpponentBadge.textContent = `Evolve Moves: ${escapeHtml(pName)}`;
    aiBattleOpponentBadge.style.color = '#388bfd';
  }
  if (aiStatusChip) {
    aiStatusChip.textContent = 'Move Advisor Active';
    aiStatusChip.style.color = '#10b981';
  }

  // 2. Render Tactical Briefing Card
  if (aiTacticalBriefing) {
    let recListHtml = '';
    evalResult.recommendedMoves.forEach((m, idx) => {
      recListHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-top: 1px solid #1a283e;">
          <div style="font-size: 10px; font-weight: 600; color: #e0ecfa;">
            <span style="color: #388bfd; font-weight: 700; margin-right: 4px;">[Slot ${idx + 1}]</span>
            ${escapeHtml(m.name)}
            <span style="font-size: 9px; color: #8eaad0; margin-left: 3px;">(${escapeHtml(m.type)}) [${m.power} Pwr]</span>
          </div>
          <div>
            ${m.isStab ? '<span style="font-size: 8.5px; font-weight: 700; color: #10b981; padding: 1px 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 3px;">STAB</span>' : ''}
          </div>
        </div>
      `;
    });

    let dropListHtml = '';
    if (evalResult.dropMoves && evalResult.dropMoves.length > 0) {
      evalResult.dropMoves.forEach(m => {
        dropListHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-top: 1px dashed #1a283e; margin-top: 2px;">
            <div style="font-size: 9.5px; color: #f87171;">
              <span style="font-weight: 700; margin-right: 3px;">&#10006; Uncheck:</span>
              ${escapeHtml(m.name)}
              <span style="font-size: 8.5px; color: #8eaad0;">(${escapeHtml(m.type)} ${m.power} Pwr)</span>
            </div>
            <div style="font-size: 8.5px; color: #8eaad0;">${escapeHtml(m.reason || '')}</div>
          </div>
        `;
      });
    }

    const typeStr = (card.types && card.types.length > 0) ? card.types.join('/') : 'Normal';

    aiTacticalBriefing.innerHTML = `
      <div style="background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px; padding: 6px 8px; box-shadow: none !important;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 700; color: #e0ecfa;">${escapeHtml(pName)}</span>
          <span style="font-size: 9.5px; color: #8eaad0;">Lv ${card.level || 50} &bull; <span style="color: #388bfd; font-weight: 600;">${escapeHtml(typeStr)}</span></span>
        </div>
        <div style="font-size: 8.5px; font-weight: 700; color: #566e96; text-transform: uppercase; margin-bottom: 3px;">RECOMMENDED 4 ATTACKS TO KEEP</div>
        ${recListHtml}
        ${dropListHtml ? `<div style="font-size: 8.5px; font-weight: 700; color: #566e96; text-transform: uppercase; margin-top: 5px; margin-bottom: 2px;">ATTACKS TO DROP / UNCHECK</div>${dropListHtml}` : ''}
      </div>
    `;
  }

  // 3. Render Instant Action Buttons
  if (aiInstantActionSlot) {
    aiInstantActionSlot.innerHTML = '';

    const autoPickBtn = document.createElement('button');
    autoPickBtn.type = 'button';
    autoPickBtn.id = 'aiAutoSelectMovesBtn';
    autoPickBtn.className = 'btn btn-accent';
    autoPickBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';
    autoPickBtn.innerHTML = '&#9876; Auto-Select Recommended Moves';
    autoPickBtn.addEventListener('click', () => {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('apply-recommended-moves', {
          recommendedMoves: evalResult.recommendedMoves.map(m => m.name),
          dropMoves: evalResult.dropMoves.map(m => m.name),
          slot1: evalResult.slotOrder[0]
        });
        updateStatus('Optimal moves applied to DelugeRPG form!', '#238636');
      }
    });
    aiInstantActionSlot.appendChild(autoPickBtn);
  }

  // 4. Post to AI Chat Stream only ONCE per unique evolve modal signature
  const evolveSig = `${pName}:${(evalResult.recommendedMoves || []).map(m => m.name).join(',')}:${(evalResult.dropMoves || []).map(m => m.name).join(',')}`;
  if (lastAnnouncedEvolveSignature !== evolveSig) {
    lastAnnouncedEvolveSignature = evolveSig;
    const topNames = evalResult.recommendedMoves.map(m => m.name).join(', ');
    const dropNames = evalResult.dropMoves.map(m => m.name).join(', ');
    const dropReason = evalResult.dropMoves.length > 0 ? ` (drop ${evalResult.dropMoves.map(m => `${m.name}: ${m.reason}`).join('; ')})` : '';
    const msg = `Move Recommendation for ${pName}: Keep [${topNames}], and uncheck [${dropNames}]${dropReason}. Put ${evalResult.slotOrder[0] || 'primary attack'} in Slot 1.`;
    appendAiChatMessage('AI', msg);
  }
}

function handleEvolveCardDetected(card) {
  if (!card) return;
  // If active battle is taking place, battle intel has 100% precedence
  if (activeAiBattleData && (activeAiBattleData.isInActiveBattle || (Array.isArray(activeAiBattleData.roster) && activeAiBattleData.roster.length > 0))) {
    return;
  }
  activeEvolveCardData = card;

  if (card.isMoveSelection) {
    handleEvolveMoveSelection(card);
    return;
  }

  const rawName = card.fullName || '';
  const species = card.baseSpecies || (getBaseSpecies ? getBaseSpecies(rawName) : rawName);
  const resolvedTypes = (card.types && card.types.length > 0)
    ? card.types
    : (evolutionEngine && evolutionEngine.resolvePokemonTypes ? evolutionEngine.resolvePokemonTypes(card.fullName || species, currentCollection) : ['Normal']);
  card.types = resolvedTypes;

  const evoAnalysis = aiAssistant ? aiAssistant.analyzeEvolutionPath(species, currentCollection) : null;
  const bestBranch = evoAnalysis ? evoAnalysis.bestBranch : null;
  const bestBranchName = bestBranch ? bestBranch.name : '';

  // 1. Update AI Assistant Panel Header Badges
  if (aiBattleOpponentBadge) {
    aiBattleOpponentBadge.textContent = `Evolve: ${card.fullName}`;
    aiBattleOpponentBadge.style.color = '#388bfd';
  }
  if (aiStatusChip) {
    aiStatusChip.textContent = 'Evolve Intel Active';
    aiStatusChip.style.color = '#10b981';
  }

  // 2. Render Tactical Briefing Card
  if (aiTacticalBriefing) {
    let html = `
      <div style="background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px; padding: 6px 8px; box-shadow: none !important;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 700; color: #e0ecfa;">${escapeHtml(card.fullName)}</span>
          <span style="font-size: 9.5px; color: #8eaad0;">Lv ${card.level || 50} &bull; <span style="color: #388bfd; font-weight: 600;">${escapeHtml(resolvedTypes.join('/'))}</span></span>
        </div>
        <div style="font-size: 8.5px; font-weight: 700; color: #566e96; text-transform: uppercase; margin-bottom: 4px;">TARGET EVOLUTIONS</div>
    `;

    const hasAnyMegaOwned = Array.isArray(card.options) && card.options.some(opt => {
      const optRaw = opt.fullName || opt.name || '';
      const optBase = getBaseSpecies ? getBaseSpecies(optRaw) : optRaw;
      const own = evolutionEngine ? evolutionEngine.checkEvolutionOwnership(optBase, currentCollection) : { isOwned: false };
      return own.hasMegaOwned;
    });

    if (hasAnyMegaOwned) {
      html += `
        <div style="background: #2a1215; border: 1px solid #f85149; border-radius: 4px; padding: 5px 8px; margin-bottom: 6px; font-size: 10px; font-weight: 700; color: #ff7b72; text-align: center;">
          &#9888; STOP: You already own the Mega Evolution of this Pokemon! 100% Uniqueness Protection Active.
        </div>
      `;
    }

    if (Array.isArray(card.options) && card.options.length > 0) {
      card.options.forEach(opt => {
        const optRaw = opt.fullName || opt.name || '';
        const optBase = getBaseSpecies ? getBaseSpecies(optRaw) : optRaw;
        const own = evolutionEngine ? evolutionEngine.checkEvolutionOwnership(optBase, currentCollection) : { isOwned: false };
        const isBest = Boolean(bestBranchName && (optBase.toLowerCase() === bestBranchName.toLowerCase() || optRaw.toLowerCase().includes(bestBranchName.toLowerCase())));

        let badgeHtml = '';
        if (own.isOwned) {
          if (own.hasMegaOwned) {
            badgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #ff7b72; padding: 1px 4px; background: rgba(248, 81, 73, 0.15); border: 1px solid rgba(248, 81, 73, 0.4); border-radius: 3px;">&#9888; STOP: MEGA OWNED (Lv ${own.bestLevel})</span>`;
          } else {
            badgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #10b981; padding: 1px 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 3px;">OWNED (Lv ${own.bestLevel})</span>`;
          }
        } else {
          badgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #d29922; padding: 1px 4px; background: rgba(210, 153, 34, 0.15); border: 1px solid rgba(210, 153, 34, 0.3); border-radius: 3px;">NOT IN COLLECTION</span>`;
        }

        let metaHtml = '';
        if (isBest) {
          metaHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #388bfd; padding: 1px 4px; background: rgba(56, 139, 253, 0.15); border: 1px solid rgba(56, 139, 253, 0.3); border-radius: 3px; margin-left: 4px;">TOP META PATH</span>`;
        }

        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-top: 1px solid #1a283e; margin-top: 2px;">
            <div style="font-size: 10px; font-weight: 600; color: #e0ecfa;">
              ${escapeHtml(optRaw)}
              <span style="font-size: 9px; color: #8eaad0; margin-left: 3px;">${escapeHtml(opt.requirement || '')}</span>
            </div>
            <div style="display: flex; align-items: center;">
              ${badgeHtml}
              ${metaHtml}
            </div>
          </div>
        `;
      });
    } else {
      html += `<div style="font-size: 9.5px; color: #8eaad0; padding: 4px 0;">No evolution targets detected</div>`;
    }

    if (bestBranchName) {
      html += `
        <div style="margin-top: 5px; padding: 3px 6px; background: #0b1526; border: 1px solid #1a283e; border-radius: 3px; font-size: 9.5px; color: #8eaad0; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #566e96; font-weight: 700;">RECOMMENDED:</span>
          <span style="color: #388bfd; font-weight: 700;">${escapeHtml(bestBranchName)} (${bestBranch ? bestBranch.types.join('/') : ''})</span>
        </div>
      `;
    }

    html += `</div>`;
    aiTacticalBriefing.innerHTML = html;
  }

  // 3. Render Instant Action Buttons
  if (aiInstantActionSlot) {
    aiInstantActionSlot.innerHTML = '';

    const pathBtn = document.createElement('button');
    pathBtn.type = 'button';
    pathBtn.id = 'aiEvolvePathBtn';
    pathBtn.className = 'btn btn-accent';
    pathBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';
    pathBtn.innerHTML = `&#129516; Path Details: ${escapeHtml(card.fullName)}`;
    pathBtn.addEventListener('click', () => {
      appendAiChatMessage('USER', `Evolution path for ${card.fullName}`);
      const ans = aiAssistant ? aiAssistant.askAssistant(`evolve ${card.fullName}`, { activeEvolveCard: card, collection: currentCollection }) : '';
      setTimeout(() => {
        appendAiChatMessage('AI', ans);
      }, 100);
    });
    aiInstantActionSlot.appendChild(pathBtn);

    const movesBtn = document.createElement('button');
    movesBtn.type = 'button';
    movesBtn.id = 'aiEvolveMovesBtn';
    movesBtn.className = 'btn';
    movesBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 600; justify-content: center; gap: 6px; box-shadow: none !important;';
    const finalSpecies = bestBranchName || (card.options && card.options.length > 0 ? (card.options[0].fullName || card.options[0].name) : card.fullName);
    movesBtn.innerHTML = `&#9876; Final Moveset: ${escapeHtml(finalSpecies)}`;
    movesBtn.addEventListener('click', () => {
      appendAiChatMessage('USER', `Best attack moves for ${finalSpecies}`);
      const ans = aiAssistant ? aiAssistant.askAssistant(`moves for ${finalSpecies}`, { activeEvolveCard: card, collection: currentCollection }) : '';
      setTimeout(() => {
        appendAiChatMessage('AI', ans);
      }, 100);
    });
    aiInstantActionSlot.appendChild(movesBtn);
  }
}

function handleEvolveCardClosed() {
  activeEvolveCardData = null;
  lastAnnouncedEvolveSignature = null;
  const isAiPanelOpen = Boolean(aiAssistantModal && aiAssistantModal.style.display === 'flex');
  if (isAiPanelOpen) {
    renderAiAssistantUI();
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
  if (!battleData || !Array.isArray(battleData.roster) || battleData.roster.length === 0) {
    return null;
  }
  const analysis = aiAssistant ? aiAssistant.analyzeBattle(battleData, collection) : null;
  if (!analysis || analysis.status === 'IDLE') return null;

  const isOpponentTeamAllFainted = Boolean(
    Array.isArray(battleData.roster) &&
    battleData.roster.length > 0 &&
    battleData.roster.every(p => p.isFainted || (p.hp !== undefined && p.hp <= 0))
  );

  const hasActiveBattleControls = Boolean(
    analysis.hasContinueBtn ||
    analysis.hasSkipSelectionBtn ||
    analysis.hasAttackBtn ||
    (analysis.availableMoves && analysis.availableMoves.length > 0) ||
    analysis.hasBenchRadios
  );

  const isBattleComplete = Boolean(
    battleData.isVictoryScreen ||
    (isOpponentTeamAllFainted && !hasActiveBattleControls)
  );

  if (isBattleComplete) {
    return {
      labelHtml: '&#10003; Battle Complete',
      hudText: '&#10003; Complete',
      disabled: true,
      btnClass: 'btn',
      action: null
    };
  }

  if (analysis.hasContinueBtn || analysis.hasSkipSelectionBtn || analysis.isActiveOpponentFainted || (analysis.activeOpponentHp !== undefined && analysis.activeOpponentHp <= 0)) {
    const isOppKO = Boolean(analysis.isActiveOpponentFainted || (analysis.activeOpponentHp !== undefined && analysis.activeOpponentHp <= 0));
    const isBattlerAlive = !analysis.isActiveBattlerFainted && ((analysis.activeBattlerHp !== undefined) ? analysis.activeBattlerHp > 0 : true);
    const isTrainingOnlyMode = Boolean(
      teamBattleMode === 'NPC' &&
      (teamRosterMode === 'TRAINING' || analysis.isTrainingTeam) &&
      !analysis.isChallengeLocked &&
      !battleData.isChallengePreview
    );
    const useSkipSelection = Boolean(isTrainingOnlyMode && isBattlerAlive && (analysis.hasSkipSelectionBtn || isOppKO));
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

  if (analysis.hasBenchRadios && !analysis.hasAttackBtn) {
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
    } else if (analysis.bestActiveLead) {
      const hasFaintedOpponents = Boolean(Array.isArray(battleData.roster) && battleData.roster.some(p => p.isFainted || (p.hp !== undefined && p.hp <= 0)));
      const deployActionLabel = hasFaintedOpponents ? 'Continue' : 'Start';
      const fullLeadName = analysis.bestActiveLead.name;
      const shortLeadName = formatCompactBattleName(fullLeadName);
      return {
        labelHtml: `&#9889; <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Deploy ${escapeHtml(shortLeadName)} &amp; ${deployActionLabel}</span>`,
        hudText: `Deploy &amp; ${deployActionLabel}`,
        disabled: false,
        btnClass: 'btn btn-accent',
        action: () => {
          executeAiBattleAction('select-lead-and-start', { pokemonName: fullLeadName, autoStart: true });
        }
      };
    }
  }

  return null;
}

function updateTeamBuilderBattleAction(battleData) {
  if (!teamBattleActionSlot || !teamBattleActionBtn) return;
  if (isUnlockChallengeActive || isCaptchaAlarmActive) {
    teamBattleActionSlot.style.display = 'block';
    teamBattleActionBtn.className = 'btn';
    teamBattleActionBtn.disabled = true;
    teamBattleActionBtn.innerHTML = '&#9888; Captcha Active (Disabled)';
    teamBattleActionBtn.title = 'Disabled: Captcha challenge active. Acknowledge or solve captcha to resume.';
    teamBattleActionBtn.onclick = null;
    if (teamActionRow) teamActionRow.style.display = 'flex';
    return;
  }
  const config = computeAiBattleActionConfig(battleData, currentCollection);
  if (!config) {
    teamBattleActionSlot.style.display = 'none';
    teamBattleActionBtn.onclick = null;
    return;
  }
  teamBattleActionSlot.style.display = 'block';
  teamBattleActionBtn.className = config.btnClass || 'btn btn-accent';
  teamBattleActionBtn.disabled = Boolean(config.disabled);
  teamBattleActionBtn.innerHTML = config.labelHtml;
  teamBattleActionBtn.title = 'Execute optimal battle move or action directly from Team Builder';
  teamBattleActionBtn.onclick = () => {
    if (typeof config.action === 'function') {
      if (teamActionStatus) {
        teamActionStatus.textContent = 'Applying...';
        teamActionStatus.style.color = '#388bfd';
      }
      teamBattleActionBtn.disabled = true;
      config.action();
    }
  };
  if (teamActionRow) {
    teamActionRow.style.display = 'flex';
  }
}

function renderAiAssistantUI() {
  if (!aiAssistantModal) return;

  // Prioritize active on-screen Evolve dialog if present and no active battle taking place
  if (activeEvolveCardData && (!activeAiBattleData || !activeAiBattleData.roster || activeAiBattleData.roster.length === 0)) {
    handleEvolveCardDetected(activeEvolveCardData);
    return;
  }

  const analysis = aiAssistant ? aiAssistant.analyzeBattle(activeAiBattleData, currentCollection) : null;
  lastAnalyzedBattle = analysis;
  if (!analysis || analysis.status === 'IDLE') {
    if (aiBattleOpponentBadge) {
      aiBattleOpponentBadge.textContent = 'Waiting for Battle';
      aiBattleOpponentBadge.style.color = '#8eaad0';
    }
    if (aiTacticalBriefing) {
      aiTacticalBriefing.innerHTML = '<div style="color: #566e96; text-align: center; padding: 8px 4px; font-size: 10px; font-weight: 600; background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px;">No Active Battle Detected</div>';
    }
    if (aiInstantActionSlot) {
      aiInstantActionSlot.innerHTML = '';
    }
    if (aiStatusChip) {
      aiStatusChip.textContent = 'Ready';
      aiStatusChip.style.color = '#10b981';
    }
    if (aiHudActionBtn) {
      aiHudActionBtn.style.display = 'none';
    }
    return;
  }

  if (aiBattleOpponentBadge) {
    aiBattleOpponentBadge.textContent = `${analysis.trainerName} (${analysis.rosterCount} Pkmn)`;
    aiBattleOpponentBadge.style.color = '#388bfd';
  }

  if (aiStatusChip) {
    aiStatusChip.textContent = 'Observing Battle';
    aiStatusChip.style.color = '#388bfd';
  }

  const cleanActiveLead = analysis.bestActiveLead ? analysis.bestActiveLead.name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const cleanBoxCarry = analysis.bestCarry ? analysis.bestCarry.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const isLeadSameAsCarry = cleanActiveLead && cleanBoxCarry && (cleanActiveLead === cleanBoxCarry || cleanActiveLead.includes(cleanBoxCarry) || cleanBoxCarry.includes(cleanActiveLead));
  const activeTeamHasCarry = Boolean(isLeadSameAsCarry || (activeAiBattleData && activeAiBattleData.userTeam && cleanBoxCarry && activeAiBattleData.userTeam.some(u => {
    const uClean = (u.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return uClean === cleanBoxCarry || cleanBoxCarry.includes(uClean);
  })));

  if (aiTacticalBriefing) {
    const leadName = analysis.bestActiveLead ? analysis.bestActiveLead.name : (analysis.bestCarry || 'Auto Counter');
    const leadMove = (analysis.bestActiveLead && analysis.bestActiveLead.recommendedMove) ? analysis.bestActiveLead.recommendedMove : (analysis.recommendedMove || 'Best STAB');

    let html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
        <div style="background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px; padding: 6px 8px; box-shadow: none !important;">
          <div style="font-size: 9px; font-weight: 700; color: #566e96; text-transform: uppercase;">TARGET</div>
          <div style="font-size: 11px; font-weight: 700; color: #e0ecfa; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(analysis.activeOpponent)}">
            ${escapeHtml(analysis.activeOpponent)}
          </div>
          <div style="font-size: 9.5px; color: #8eaad0; margin-top: 2px;">
            Lv ${analysis.activeOpponentLevel} &bull; <span style="color: #388bfd; font-weight: 600;">${escapeHtml(analysis.activeOpponentTypes.join('/'))}</span>
          </div>
        </div>
        <div style="background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px; padding: 6px 8px; box-shadow: none !important;">
          <div style="font-size: 9px; font-weight: 700; color: #10b981; text-transform: uppercase;">${analysis.isInActiveBattle ? 'ACTIVE BATTLER' : 'COUNTER LEAD'}</div>
          <div style="font-size: 11px; font-weight: 700; color: #10b981; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(leadName)}">
            ${escapeHtml(leadName)}
          </div>
          <div style="font-size: 9.5px; color: #e0ecfa; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(leadMove)}">
            ${escapeHtml(leadMove)}
          </div>
        </div>
      </div>
    `;

    if (analysis.hazards && analysis.hazards.length > 0) {
      html += `<div style="margin-top: 5px; padding: 3px 6px; background: #1c1500; border: 1px solid #6e4900; border-radius: 3px; font-size: 9.5px; color: #d29922; text-align: center; font-weight: 600; box-shadow: none !important;">&#9888; ${escapeHtml(analysis.hazards.join(' &bull; '))}</div>`;
    }

    if (analysis.counterRoadmap && analysis.counterRoadmap.length > 0) {
      let roadmapRows = '';
      for (let i = 0; i < analysis.counterRoadmap.length; i++) {
        const item = analysis.counterRoadmap[i];
        const oppColor = item.isFainted ? '#566e96; text-decoration: line-through;' : (item.isActive ? '#e0ecfa; font-weight: 700;' : '#8eaad0;');
        const badgeBg = item.multiplier >= 4.0 ? '#238636' : (item.multiplier >= 2.0 ? '#1f6feb' : '#21262d');
        const badgeColor = (item.multiplier >= 2.0) ? '#ffffff' : '#8b949e';
        const activeMarker = item.isActive ? '&#9654; ' : '';
        const faintedTag = item.isFainted ? ' [KO]' : '';

        roadmapRows += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #142033; font-size: 9.5px;">
            <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; max-width: 52%;">
              <span style="color: ${oppColor} white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.opponentName)}">
                ${activeMarker}${escapeHtml(item.opponentName)}${faintedTag}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; max-width: 48%; justify-content: flex-end;">
              <span style="color: ${item.isCounterAlive ? '#10b981' : '#ef4444'}; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.counterName)}">
                ${escapeHtml(item.counterName)}
              </span>
              <span style="color: #6b84a6; font-size: 8.5px; white-space: nowrap;">${escapeHtml(item.bestMoveName)}</span>
              <span style="background: ${badgeBg}; color: ${badgeColor}; font-size: 8px; font-weight: 700; padding: 1px 3px; border-radius: 2px; border: 1px solid #30363d; box-shadow: none !important;">${item.multiplier}x</span>
            </div>
          </div>
        `;
      }

      html += `
        <div style="margin-top: 6px; background: #0c1524; border: 1px solid #1a283e; border-radius: 4px; padding: 6px 8px; box-shadow: none !important;">
          <div style="font-size: 9px; font-weight: 700; color: #8eaad0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>ROSTER COUNTER ROADMAP</span>
            <span style="color: #388bfd;">${analysis.counterRoadmap.length} Opponents</span>
          </div>
          <div style="display: flex; flex-direction: column;">
            ${roadmapRows}
          </div>
        </div>
      `;
    }

    const isChallengeLocked = Boolean(
      (activeAiBattleData && (activeAiBattleData.isChallengePreview || activeAiBattleData.isGmaxChallenge || activeAiBattleData.isChallengeLocked || (activeAiBattleData.battleUrl && activeAiBattleData.battleUrl.includes('challenge')))) ||
      analysis.isChallengeLocked ||
      analysis.isInActiveBattle
    );

    if (analysis.bestCarry && !activeTeamHasCarry && !isChallengeLocked) {
      html += `
        <div style="margin-top: 5px; padding-top: 4px; border-top: 1px solid #1a283e; font-size: 9.5px; color: #8eaad0; display: flex; justify-content: space-between; align-items: center;">
          <span>Optimal Box Carry:</span>
          <span style="color: #e0ecfa; font-weight: 600;">${escapeHtml(analysis.bestCarry)}</span>
        </div>
      `;
    }

    aiTacticalBriefing.innerHTML = html;
  }

  // Render Smart Unified Battle Action Button
  if (aiInstantActionSlot) {
    aiInstantActionSlot.innerHTML = '';

    const isChallengeLocked = Boolean(
      (activeAiBattleData && (activeAiBattleData.isChallengePreview || activeAiBattleData.isGmaxChallenge || activeAiBattleData.isChallengeLocked || (activeAiBattleData.battleUrl && activeAiBattleData.battleUrl.includes('challenge')))) ||
      analysis.isChallengeLocked
    );

    const mainBtnConfig = computeAiBattleActionConfig(activeAiBattleData, currentCollection);

    if (mainBtnConfig) {
      const deployBtn = document.createElement('button');
      deployBtn.type = 'button';
      deployBtn.id = 'aiDeployLeadBtn';
      deployBtn.className = mainBtnConfig.btnClass;
      deployBtn.disabled = Boolean(mainBtnConfig.disabled);
      deployBtn.style.cssText = 'width: 100%; height: 28px; font-size: 11px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';
      deployBtn.innerHTML = mainBtnConfig.labelHtml;
      if (mainBtnConfig.action) {
        deployBtn.addEventListener('click', mainBtnConfig.action);
      }
      aiInstantActionSlot.appendChild(deployBtn);

      // In preparation mode, show Equip Carry if eligible
      if (analysis.isPreparationScreen && !activeTeamHasCarry && analysis.bestCarryObj && !isChallengeLocked) {
        const equipBtn = document.createElement('button');
        equipBtn.type = 'button';
        equipBtn.id = 'aiEquipCarryBtn';
        equipBtn.className = 'btn';
        equipBtn.style.cssText = 'width: 100%; height: 24px; font-size: 10px; font-weight: 600; justify-content: center; gap: 6px; box-shadow: none !important; margin-top: 4px;';
        equipBtn.innerHTML = `&#128190; Equip ${escapeHtml(analysis.bestCarry)} to Slot 1`;
        equipBtn.addEventListener('click', () => {
          equipAiCarryToSlot1(analysis.bestCarryObj);
        });
        aiInstantActionSlot.appendChild(equipBtn);
      }

      // Update Floating HUD Action Button to match
      if (aiHudActionBtn) {
        aiHudActionBtn.style.display = 'inline-flex';
        aiHudActionBtn.innerHTML = mainBtnConfig.hudText;
        aiHudActionBtn.disabled = Boolean(mainBtnConfig.disabled);
        if (mainBtnConfig.action) {
          aiHudActionBtn.onclick = mainBtnConfig.action;
        } else {
          aiHudActionBtn.onclick = null;
        }
      }
    } else {
      if (aiHudActionBtn) {
        aiHudActionBtn.style.display = 'none';
      }
    }
  }
}

let aiActionTimeoutTimer = null;
function executeAiBattleAction(action, payload) {
  if (isUnlockChallengeActive || isCaptchaAlarmActive) {
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
  if (aiStatusChip) {
    aiStatusChip.textContent = 'Applying...';
    aiStatusChip.style.color = '#388bfd';
  }
  if (teamActionStatus) {
    teamActionStatus.textContent = 'Applying...';
    teamActionStatus.style.color = '#388bfd';
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
    if (teamBattleActionBtn) {
      teamBattleActionBtn.disabled = false;
    }
  }, 4000);
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

function handleRunMonteCarloSimulation() {
  appendAiChatMessage('USER', 'Simulate (1,000x Rollouts)');
  if (aiStatusChip) {
    aiStatusChip.textContent = 'Simulating...';
    aiStatusChip.style.color = '#388bfd';
  }
  const trainerQuery = (activeAiBattleData && activeAiBattleData.trainerName) || (targetLeader && targetLeader.name) || 'Surge';
  if (!aiAssistant) return;

  aiAssistant.runMonteCarloSimulation(trainerQuery).then(res => {
    if (aiStatusChip) {
      aiStatusChip.textContent = 'Observing Battle';
      aiStatusChip.style.color = '#10b981';
    }
    if (aiSimResultStrip && res && res.win_rate !== undefined) {
      aiSimResultStrip.style.display = 'block';
      if (aiSimWinRateBadge) {
        aiSimWinRateBadge.textContent = `${res.win_rate}% Win`;
        aiSimWinRateBadge.style.color = res.win_rate >= 80 ? '#238636' : '#d29922';
      }
      if (aiSimHpVal) aiSimHpVal.textContent = `${res.avg_hp_pct}%`;
      if (aiSimScoreVal) aiSimScoreVal.textContent = String(res.ml_score || '--');
    }
    const topCarry = res.top_carry || 'Selected Counter';
    const msg = `Monte Carlo simulation complete across 1,000 rollouts for ${res.trainer || trainerQuery}: Predicted Win Rate is ${res.win_rate}%, Average Surviving HP is ${res.avg_hp_pct}%. Optimal policy carry: ${topCarry}.`;
    appendAiChatMessage('AI', msg);
  }).catch(err => {
    if (aiStatusChip) {
      aiStatusChip.textContent = 'Ready';
      aiStatusChip.style.color = '#10b981';
    }
    appendAiChatMessage('AI', `Simulation error: ${err.message || err}`);
  });
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
  aiQuickSimBtn.addEventListener('click', handleRunMonteCarloSimulation);
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

function playEmergencyBeep(freq = 600, duration = 0.25) {
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
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function playAlarmPulse() {
  playEmergencyBeep(520, 0.2);
  setTimeout(() => {
    if (isCaptchaAlarmActive) {
      playEmergencyBeep(880, 0.25);
    }
  }, 220);
}

function startContinuousCaptchaAlarm() {
  if (isCaptchaAlarmActive) return;
  isCaptchaAlarmActive = true;

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
  if (captchaAlarmInterval) {
    clearInterval(captchaAlarmInterval);
    captchaAlarmInterval = null;
  }
  if (captchaEmergencyBanner) {
    captchaEmergencyBanner.style.display = 'none';
  }
  isUnlockChallengeActive = false;
  updateStatus('Ready (Captcha Alarm Silenced)', '#10b981');
  backendLog('SecurityChallenge', 'Captcha alarm acknowledged and silenced by user.');

  // Re-enable all desktop client action functions and buttons upon user acknowledgment
  if (battleOpponentBtn) battleOpponentBtn.disabled = false;
  if (applyTeamBtn) applyTeamBtn.disabled = false;
  if (buildTeamBtn) buildTeamBtn.disabled = false;
  if (pvpScoutBtn) pvpScoutBtn.disabled = false;
  if (checkLiveBattleBtn) checkLiveBattleBtn.disabled = false;
  if (teamActionStatus && teamActionStatus.textContent.includes('Captcha')) {
    teamActionStatus.textContent = '';
  }

  updateTeamBuilderBattleAction(activeAiBattleData);
  renderAiAssistantUI();
}

function handleCaptchaEmergencyHalt(reason = 'Captcha challenge detected') {
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
  try {
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('abort-autocatch');
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
      stopHuntingWithReason(`Session auto-stop triggered after ${sessionAutoStopTargetMins}m`, `Paused (Auto-Stop: ${sessionAutoStopTargetMins}m)`, '#f59e0b');
      playAlarmSound();
    }, stopMins * 60 * 1000);
  }

  saveLocalConfig();
  loadSafetySettingsIntoUI();

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
}

function rerollSafetyTargets() {
  ensureTodaySafetyState();
  const s = config.safety || {};
  dailySafetyState.dailyStepCeiling = getRandomInRange(s.dailyStepMin || 500, s.dailyStepMax || 1000);
  dailySafetyState.dailyCatchCeiling = getRandomInRange(s.dailyCatchMin || 10, s.dailyCatchMax || 20);
  saveDailySafetyState();

  rollNextBreakTargets();

  if (isRunning && s.enableDeadManSwitch !== false) {
    const stopMins = getRandomInRange(s.autoStopMinMinutes || 5, s.autoStopMaxMinutes || 30);
    sessionAutoStopTime = Date.now() + stopMins * 60 * 1000;
    sessionAutoStopTargetMins = stopMins;
    if (sessionAutoStopTimer) clearTimeout(sessionAutoStopTimer);
    sessionAutoStopTimer = setTimeout(() => {
      stopHuntingWithReason(`Session auto-stop triggered after ${sessionAutoStopTargetMins}m`, 'Paused (Session Auto-Stop Limit)', '#f59e0b');
      playAlarmSound();
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
[
  safetyAutoStopToggle, safetyBreakToggle, safetyDailyToggle, safetyAntiBotToggle,
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
  if (data && !isRestBreakActive) {
    if (data.url && (data.url.includes('/cdn-cgi/') || data.url.includes('/ajax/map/positions/'))) return;
    const statusStr = data.success ? (data.status + ' OK') : (data.error || 'Failed');
    updateActionFeedback((data.url || '').slice(0, 14) + ' -> ' + statusStr + ' (' + data.elapsedMs + 'ms)', data.success ? 'success' : 'error');
  }
});
