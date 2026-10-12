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
    hideAdsCosmetically: true,
    autoCatchMasterBall: false
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
      autoStartDelay: 5,
      hideAdsCosmetically: true,
      autoCatchMasterBall: false
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

function backendLog(tag, msg) {
  const ts = new Date().toISOString().substring(11, 23);
  const detail = (typeof msg === 'object') ? JSON.stringify(msg) : String(msg);
  const line = `[${ts}] [${tag}] ${detail}\n`;
  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > 5 * 1024 * 1024) {
        const raw = fs.readFileSync(LOG_FILE, 'utf8');
        fs.writeFileSync(LOG_FILE, raw.slice(-500 * 1024), 'utf8');
      }
    }
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (_) {}
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

function updateVariantTabCount(count) {
  const el = tabVariantsBtn || document.querySelector('[data-tab="tabVariants"]');
  if (el) {
    el.innerHTML = '&#10024; Sprite Variants (' + (typeof count === 'number' ? count : 10) + ')';
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
const scanStatusBadge = document.getElementById('scanStatusBadge');
const teamCategorySelect = document.getElementById('teamCategorySelect');
const teamTrainerSelect = document.getElementById('teamTrainerSelect');
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
const battleOpponentBtn = document.getElementById('battleOpponentBtn');
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
let wanderStepsLeft = 1;
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
    avoidDupesBadge.textContent = isAvoid ? 'ON' : 'OFF';
    avoidDupesBadge.className = isAvoid ? 'dropdown-badge dropdown-badge-on' : 'dropdown-badge dropdown-badge-off';
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
  const delaySec = (config.settings && config.settings.autoStartDelay) || 5;
  if (autoStartMapBadge) {
    autoStartMapBadge.textContent = isAuto ? 'ON' : 'OFF';
    autoStartMapBadge.className = isAuto ? 'dropdown-badge dropdown-badge-on' : 'dropdown-badge dropdown-badge-off';
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
    hideAdsBadge.textContent = isHide ? 'ON' : 'OFF';
    hideAdsBadge.className = isHide ? 'dropdown-badge dropdown-badge-on' : 'dropdown-badge dropdown-badge-off';
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
    autoCatchBadge.textContent = isCatch ? 'ON' : 'OFF';
    autoCatchBadge.className = isCatch ? 'dropdown-badge dropdown-badge-on' : 'dropdown-badge dropdown-badge-off';
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
    let appVer = '1.3.1';
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
  if (megas) parts.push("Tier 2: 107 Mega Lines");
  if (leg) {
    const classic = subOptions.classicLeg !== false;
    const ub = subOptions.ubLeg !== false;
    const paradox = subOptions.paradoxLeg !== false;
    if (classic && ub && paradox) {
      parts.push("Tier 3: 135 Legendaries");
    } else {
      const subParts = [];
      if (classic) subParts.push("Classic");
      if (ub) subParts.push("UB");
      if (paradox) subParts.push("Paradox");
      parts.push(subParts.length > 0 ? ("Tier 3: Legendaries (" + subParts.join(", ") + ")") : "Tier 3: 0 Legendaries");
    }
  }

  if (vars) {
    const activeVars = Array.isArray(subOptions.selectedVariants) ? subOptions.selectedVariants : [];
    const hasNormal = activeVars.some(v => v.toLowerCase() === 'normal');
    const specialCount = activeVars.filter(v => v.toLowerCase() !== 'normal').length;
    if (hasNormal && specialCount === 9) {
      parts.push("[Normal + 9 Variants]");
    } else if (hasNormal && specialCount === 0) {
      parts.push("[Normal Only]");
    } else if (!hasNormal && specialCount === 1 && activeVars.some(v => v.toLowerCase() === 'shiny')) {
      parts.push("[\u2605 Shinies Only]");
    } else if (!hasNormal && specialCount === 9) {
      parts.push("[9 Variants (No Normal)]");
    } else if (!hasNormal && specialCount > 0) {
      parts.push("[" + specialCount + " Variants]");
    } else if (hasNormal && specialCount > 0) {
      parts.push("[Normal + " + specialCount + " Variants]");
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

  const activeVariants = (config.settings && Array.isArray(config.settings.selectedVariants) && config.settings.selectedVariants.length > 0)
    ? config.settings.selectedVariants
    : Object.values(variantMap);

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

  variantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = activeVariants.map(v => v.toLowerCase()).includes(variantMap[id].toLowerCase());
    }
  });

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
      isLeg, isMega, isVar, isLevel, levelMode, levelVal, levelScope,
      {
        classicLeg, ubLeg, paradoxLeg,
        selectedVariants: activeVariants,
        customTargets,
        blacklist
      }
    );
  }

  const isShinyOnly = activeVariants.length === 1 && activeVariants[0].toLowerCase() === 'shiny';
  const hasNormal = activeVariants.some(v => v.toLowerCase() === 'normal');
  const specialCount = activeVariants.filter(v => v.toLowerCase() !== 'normal').length;
  const hasCustom = customTargets.length > 0;

  let presetKey = 'custom';
  if (isLeg && isMega && isVar && !isLevel && hasNormal && specialCount === 9 && !hasCustom) presetKey = 'all';
  else if (isLeg && isMega && isVar && !isLevel && !hasNormal && isShinyOnly && !hasCustom) presetKey = 'shinies';
  else if (!isLeg && !isMega && isVar && !isLevel && !hasNormal && specialCount === 9 && !hasCustom) presetKey = 'variants';
  else if (isLeg && isMega && !isLevel && !hasCustom && !isVar) presetKey = 'legend_megas';
  else if (isLeg && !isMega && !isLevel && !hasCustom) presetKey = 'legendaries';
  else if (!isLeg && isMega && !isLevel && !hasCustom) presetKey = 'megas';
  else if (isLeg && isMega && !isLevel && !hasCustom) presetKey = 'legend_megas';

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
  let selectedVars = Object.values(variantMap);

  if (presetKey === 'legendaries') {
    isLeg = true;
    isMega = false;
    isVar = false;
    selectedVars = Object.values(variantMap);
  } else if (presetKey === 'megas') {
    isLeg = false;
    isMega = true;
    isVar = false;
    selectedVars = Object.values(variantMap);
  } else if (presetKey === 'legend_megas') {
    isLeg = true;
    isMega = true;
    isVar = false;
    selectedVars = Object.values(variantMap);
  } else if (presetKey === 'shinies') {
    isLeg = true;
    isMega = true;
    isVar = true;
    selectedVars = ['Shiny'];
  } else if (presetKey === 'variants') {
    isLeg = false;
    isMega = false;
    isVar = true;
    selectedVars = Object.values(variantMap).filter(v => v !== 'Normal');
  } else if (presetKey === 'all') {
    isLeg = true;
    isMega = true;
    isVar = true;
    selectedVars = Object.values(variantMap);
  }

  if (filterLegendariesCheckbox) filterLegendariesCheckbox.checked = isLeg;
  if (subClassicLegCheckbox) subClassicLegCheckbox.checked = isLeg && isClassic;
  if (subUltraBeastsCheckbox) subUltraBeastsCheckbox.checked = isLeg && isUB;
  if (subParadoxCheckbox) subParadoxCheckbox.checked = isLeg && isParadox;

  if (filterMegasCheckbox) filterMegasCheckbox.checked = isMega;
  if (filterVariantsCheckbox) filterVariantsCheckbox.checked = isVar;

  variantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = selectedVars.includes(variantMap[id]);
    }
  });

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
    config.settings.targetPreset = presetKey;
    config.settings.findLegendaries = isLeg;
    config.settings.legendaryClassic = isLeg && isClassic;
    config.settings.legendaryUltraBeasts = isLeg && isUB;
    config.settings.legendaryParadox = isLeg && isParadox;
    config.settings.findMegasAndGigantamax = isMega;
    config.settings.findAnySpecialVariant = isVar;
    config.settings.enableVariantFilter = isVar;
    config.settings.selectedVariants = selectedVars;
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
  stepsPerDirInput.value = (config.settings && config.settings.stepsPerDirection) || 1;
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

function isCurrentPageMap() {
  if (guestReportsMap) return true;
  const curUrl = (delugeView && delugeView.getURL()) || '';
  return isMapUrl(curUrl);
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
      delugeView.send('hunting-state-changed', { isHunting: isRunning });
      delugeView.send('update-config', config.settings);
    }
  } catch (_) {}
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
  // If an auto-start countdown is currently in progress, clicking the toggle aborts auto-start and enforces a manual pause!
  if (autoStartRemainingSeconds > 0) {
    cancelPendingAutoStart('Manual pause during auto-start countdown');
    userManuallyPaused = true;
    wasHuntingBeforeAutoCatch = false;
    isRunning = false;
    updateToggleButton();
    updateStatus('Auto-Start Cancelled (Paused)', '#f59e0b');
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
  }

  isRunning = !isRunning;
  if (isRunning) {
    userManuallyPaused = false;
    outOfStockPaused = false;
    isEncounterOnScreen = false;
    isStepPending = false;
    stepPendingTicks = 0;
    wanderStepsLeft = 0;
    isResumingFromMicroPause = false;
    isResumingFromIdlePause = false;
    try {
      if (delugeView) delugeView.send('request-dom-dump');
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

  // 1. Prioritize unblocked perpendicular cardinal directions (gliding parallel along obstacle surface)
  const perpList = (PERPENDICULARS_8[blockedDir] || ['Up', 'Down', 'Left', 'Right']).filter(k => CARDINAL_DIRECTIONS.includes(k));
  const unblockedFreshPerp = perpList.filter(k => !excluded.includes(k) && !isDirectionPhysicallyBlocked(k, now) && (!deadEndCooldowns[k] || deadEndCooldowns[k] <= now));
  if (unblockedFreshPerp.length > 0) {
    return unblockedFreshPerp[Math.floor(Math.random() * unblockedFreshPerp.length)];
  }

  // Fallback to any unblocked perpendicular
  const anyUnblockedPerp = perpList.filter(k => !excluded.includes(k) && !isDirectionPhysicallyBlocked(k, now));
  if (anyUnblockedPerp.length > 0) {
    return anyUnblockedPerp[Math.floor(Math.random() * anyUnblockedPerp.length)];
  }

  // 2. Reversing (180-degree back-out) into opposite direction
  const opp = OPPOSITES_8[blockedDir] || 'Down';
  if (!excluded.includes(opp) && !isDirectionPhysicallyBlocked(opp, now)) {
    deadEndCooldowns[blockedDir] = now + 10000;
    return opp;
  }

  // 3. Any unblocked cardinal direction (excluding shared component)
  const anyUnblocked = CARDINAL_DIRECTIONS.filter(k => !excluded.includes(k) && !isDirectionPhysicallyBlocked(k, now));
  if (anyUnblocked.length > 0) {
    return anyUnblocked[Math.floor(Math.random() * anyUnblocked.length)];
  }

  // 4. Absolute fallback if enclosed on 3 sides: pick opposite
  return opp;
}

function chooseWanderDirection(currentDir) {
  const now = Date.now();
  currentDir = currentDir || 'Right';

  // Gather unblocked candidates from cardinal directions for reliable grid traversal
  const unblocked = CARDINAL_DIRECTIONS.filter(d => !isDirectionPhysicallyBlocked(d, now) && (!deadEndCooldowns[d] || deadEndCooldowns[d] <= now));

  if (unblocked.length === 0) {
    const anyUnblocked = CARDINAL_DIRECTIONS.filter(d => !isDirectionPhysicallyBlocked(d, now));
    if (anyUnblocked.length > 0) {
      return anyUnblocked[Math.floor(Math.random() * anyUnblocked.length)];
    }
    return chooseEvadeDirection(currentDir);
  }

  // Strictly turn perpendicular when completing required steps!
  // This ensures the bot always turns after taking the required steps (e.g. 5 steps).
  const perpList = (PERPENDICULARS_8[currentDir] || ['Up', 'Down']).filter(d => CARDINAL_DIRECTIONS.includes(d));
  const unblockedPerps = perpList.filter(d => unblocked.includes(d));

  if (unblockedPerps.length > 0) {
    return unblockedPerps[Math.floor(Math.random() * unblockedPerps.length)];
  }

  // Corridor fallback: if both perpendicular sides are walls, continue forward
  if (unblocked.includes(currentDir)) {
    return currentDir;
  }

  // Dead-end fallback: reverse
  const opp = OPPOSITES_8[currentDir];
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

  // MODE: DIAGONAL (True 8-Way Diagonal Sweeping utilizing #dr-nw, #dr-ne, #dr-sw, #dr-se)
  if (mode === 'diagonal') {
    if (isDirectionPhysicallyBlocked(diagonalVertical, now)) {
      diagonalVertical = diagonalVertical === 'Up' ? 'Down' : 'Up';
    }
    if (isDirectionPhysicallyBlocked(diagonalHorizontal, now)) {
      diagonalHorizontal = diagonalHorizontal === 'Right' ? 'Left' : 'Right';
    }

    let candidate = `${diagonalVertical}-${diagonalHorizontal}`;

    // If candidate diagonal button is blocked, reflect off surfaces
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
            candidate = chooseEvadeDirection(candidate);
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

    // Subtle human mouse micro-motion to satisfy Deluge m_x telemetry
    if (Math.random() < 0.35) {
      const mx = Math.floor(Math.random() * 400) + 150;
      const my = Math.floor(Math.random() * 250) + 120;
      delugeView.sendInputEvent({ type: 'mouseMove', x: mx, y: my });
    }

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
  blockedDirections[dir] = now + 3000;
  consecutiveBlockedCount++;

  // Mark all shared component directions as blocked as well so bot NEVER hits same obstacle twice!
  const shared = SHARED_COMPONENTS_8[dir] || [dir];
  shared.forEach(d => {
    blockedDirections[d] = now + 3000;
  });

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
  const remainder = stepCount % stepsPerDir;
  if (remainder !== 0) {
    stepCount += (stepsPerDir - remainder);
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
  scheduleNextStep(Math.floor(Math.random() * 300) + 550);
}

function handleMoveSuccess(dir) {
  isStepPending = false;
  if (fallbackCollisionTimer) {
    clearTimeout(fallbackCollisionTimer);
    fallbackCollisionTimer = null;
  }
  consecutiveBlockedCount = 0;
  if (dir) {
    delete blockedDirections[dir];
    delete navBlockedStatus[dir];
  }
  stepCount++;
  backendLog('MoveSuccess', `Step confirmed: ${dir} (total: ${stepCount})`);
  if (stepCounterElem) {
    stepCounterElem.textContent = `Steps: ${stepCount}`;
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

  const delaySec = Math.max(2, parseInt((config.settings && config.settings.autoStartDelay) || 5, 10));
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

    backendLog('AutoStart', `Security delay (${delaySec}s) elapsed without captcha. Auto-starting hunting session.`);
    isRunning = true;
    userManuallyPaused = false;
    isStepPending = false;
    stepPendingTicks = 0;
    updateToggleButton();
    syncHuntingState();
    updateStatus('Hunting Active (Auto-Started)', '#22c55e');
    scheduleNextStep(1000);
  }, delaySec * 1000);
}

function handleMapNavigation(url) {
  const onMap = isMapUrl(url) || guestReportsMap;
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
    }
    // Auto-start hunting whenever map is opened if enabled or resuming after auto-catch, unless user manually paused!
    const shouldAutoStart = (config.settings && config.settings.autoStartOnMap !== false) || wasHuntingBeforeAutoCatch;
    if (!isRunning && !userManuallyPaused && !isEncounterOnScreen && shouldAutoStart) {
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
});

delugeView.addEventListener('will-navigate', (event) => {
  const url = event.url || '';
  if (!isMapUrl(url) && !guestReportsMap) {
    autoPauseOutsideMap(url);
  }
});

// IPC Listener from webview (game-preload.js)
delugeView.addEventListener('ipc-message', (event) => {
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
    if (scanStatusBadge) {
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
      currentCollection = data.pokemons;
      try {
        fs.writeFileSync(getWritableDataPath('user_collection.json'), JSON.stringify(currentCollection, null, 2), 'utf8');
      } catch (_) {}
      if (scanStatusBadge) scanStatusBadge.textContent = `${currentCollection.length} Pokemon Synced (${data.pageCount || 1} pgs)`;
      if (typeof updateRosterModeUI === 'function') updateRosterModeUI();
      console.log(`[TeamBuilder] Successfully synced ${currentCollection.length} Pokemon across ${data.pageCount || 1} pages.`);
      backendLog('TEAM_BUILDER', `Synced ${currentCollection.length} Pokemon across ${data.pageCount || 1} pages`);

      if (isBuildSyncInProgress) {
        isBuildSyncInProgress = false;
        if (buildTeamBtn) {
          buildTeamBtn.innerHTML = '<span>&#9876;</span><span>Build Best Team</span>';
          buildTeamBtn.style.opacity = '1';
        }
        if (pendingBuildLeader && typeof executeTeamBuild === 'function') {
          executeTeamBuild(pendingBuildLeader);
          pendingBuildLeader = null;
        }
        if (teamActionStatus) {
          teamActionStatus.textContent = 'Freshest box synced & lineup updated!';
          teamActionStatus.style.color = '#238636';
          setTimeout(() => { if (teamActionStatus) teamActionStatus.textContent = ''; }, 2500);
        }
      }
    } else {
      if (scanStatusBadge) scanStatusBadge.textContent = 'Scan failed';
      if (isBuildSyncInProgress) {
        isBuildSyncInProgress = false;
        if (buildTeamBtn) {
          buildTeamBtn.innerHTML = '<span>&#9876;</span><span>Build Best Team</span>';
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
      applyTeamBtn.innerHTML = '<span>&#10003;</span> <span>Team Saved!</span>';
      setTimeout(() => {
        if (applyTeamBtn) applyTeamBtn.innerHTML = 'Change Team';
      }, 2500);
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
    delugeView.send('update-config', config.settings);
    syncHuntingState();
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

  if (event.channel === 'manual-step') {
    const data = event.args[0] || {};
    const dir = data.direction || 'Manual';
    backendLog('ManualNavigation', `Manual user movement detected (${dir}). Gracefully yielding step scheduling.`);
    isStepPending = false;
    stepPendingTicks = 0;
    currentDirectionKey = dir;
    wanderStepsLeft = 0;
    if (isRunning) {
      scheduleNextStep(1200);
    }
  }

  if (event.channel === 'map-status') {
    mapIsSearching = !!(event.args[0] && event.args[0].isSearching);
    if (mapIsSearching) {
      handleMoveSuccess(lastDispatchedDirection);
    }
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
    if (data.allBlocked) {
      for (const d in data.allBlocked) {
        navBlockedStatus[d] = !!data.allBlocked[d];
      }
    }
    if (data.blocked || data.navBlocked) {
      handleMoveBlocked(data.direction || lastDispatchedDirection);
    } else if (data.success) {
      handleMoveSuccess(data.direction || lastDispatchedDirection);
    }
  }

  if (event.channel === 'toggle-hunting-hotkey') {
    toggleHunting();
  }

  if (event.channel === 'map-presence') {
    const data = event.args[0] || {};
    guestReportsMap = !!data.isMap;
    const prevEncounter = isEncounterOnScreen;
    isEncounterOnScreen = !!data.hasEncounter;

    if (!guestReportsMap) {
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
      const name = data.target || 'Target Pokemon';
      updateStatus(`Auto-Catch: Try Catch (${delaySec}s)...`, '#38bdf8');
      backendLog('AutoCatch', `Target encounter: ${name}. Waiting ${data.delay}ms to click Try to Catch It.`);
    } else if (step === 'starting-battle') {
      updateStatus(`Auto-Catch: Battle Start (${delaySec}s)...`, '#38bdf8');
      backendLog('AutoCatch', `Battle screen reached. Waiting ${data.delay}ms to click Start Battle.`);
    } else if (step === 'selecting-master-ball') {
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
      updateStatus(`Auto-Catch: Return Map (${delaySec}s)...`, '#22c55e');
      backendLog('AutoCatch', `Catch confirmed! Waiting ${data.delay}ms to click Return to Map.`);
    } else if (step === 'completed') {
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
    // Immediate emergency halt and cancellation on security challenge
    cancelPendingAutoStart('Captcha (/unlock) security challenge detected');
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
    isRunning = false;
    updateToggleButton();
    updateStatus('CAPTCHA DETECTED - Solve manually in window', '#ef4444');

    if (!isUnlockChallengeActive) {
      isUnlockChallengeActive = true;
      playAlarmSound();
      backendLog('SecurityChallenge', 'Captcha (/unlock) security challenge active. Automated hunting halted for manual solve.');
      try {
        new Notification('Security Check Detected', {
          body: 'DelugeRPG requires a captcha (/unlock). Please solve it manually in the window to proceed.'
        });
      } catch (_) {}
    }

    // Immediately focus webview so the user can click and solve the captcha with zero obstruction
    if (delugeView) {
      try { delugeView.focus(); } catch (_) {}
    }
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
  delugeView.send('update-config', config.settings);
  syncHuntingState();
  if (config.dummyAccount && (config.dummyAccount.username || config.dummyAccount.autoLogin)) {
    delugeView.send('fill-login', config.dummyAccount);
  }
  const curUrl = (delugeView && delugeView.getURL()) || '';
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
[targetModal, networkModal, accountModal, wipeModal, teamBuilderModal, adsInspectorModal, catchLogModal].forEach(m => {
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

if (delugeView) {
  delugeView.addEventListener('pointerdown', () => {
    if (!isGuestInputFocused) {
      try { delugeView.focus(); } catch (_) {}
    }
  });
}

if (modalBackdrop) {
  modalBackdrop.addEventListener('click', closeAllModals);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modalBackdrop && modalBackdrop.classList.contains('active')) {
      closeAllModals();
    } else if (teamBuilderModal && teamBuilderModal.style.display === 'flex') {
      closeTeamBuilderPanel();
    } else if (adsInspectorModal && adsInspectorModal.style.display === 'flex') {
      closeAdsInspectorPanel();
    } else if (catchLogModal && catchLogModal.style.display === 'flex') {
      closeCatchLogPanel();
    }
  }
  if (e.code === 'Space' || e.key === ' ') {
    const activeEl = document.activeElement;
    const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable);
    if (!isInput && !document.body.classList.contains('modal-open')) {
      e.preventDefault();
      toggleHunting();
    }
  }
});

// Modal Tab Switching Controller
document.querySelectorAll('.modal-tab-btn').forEach(tabBtn => {
  tabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const targetTabId = tabBtn.getAttribute('data-tab');
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

// Quick Add Species Tag Buttons
document.querySelectorAll('.quick-tag-btn[data-add-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-add-target');
    if (!target || !customTargetInput) return;
    const currentList = customTargetInput.value.split(',').map(s => s.trim()).filter(Boolean);
    if (!currentList.some(s => s.toLowerCase() === target.toLowerCase())) {
      currentList.push(target);
      customTargetInput.value = currentList.join(', ');
      refreshModalSummary();
    }
  });
});

document.querySelectorAll('.quick-tag-btn[data-add-blacklist]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-add-blacklist');
    if (!target || !blacklistInput) return;
    const currentList = blacklistInput.value.split(',').map(s => s.trim()).filter(Boolean);
    if (!currentList.some(s => s.toLowerCase() === target.toLowerCase())) {
      currentList.push(target);
      blacklistInput.value = currentList.join(', ');
      refreshModalSummary();
    }
  });
});

// Live checkbox and input change updates summary text
function refreshModalSummary() {
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
  if (el) el.addEventListener('change', refreshModalSummary);
});

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

    let preset = 'custom';
    if (isLeg && isMega && isVar && !isLevel && hasNormal && specialCount === 9 && !hasCustom) preset = 'all';
    else if (isLeg && isMega && isVar && !isLevel && !hasNormal && isShinyOnly && !hasCustom) preset = 'shinies';
    else if (!isLeg && !isMega && isVar && !isLevel && !hasNormal && specialCount === 9 && !hasCustom) preset = 'variants';
    else if (isLeg && isMega && !isLevel && !hasCustom && !isVar) preset = 'legend_megas';
    else if (isLeg && !isMega && !isLevel && !hasCustom) preset = 'legendaries';
    else if (!isLeg && isMega && !isLevel && !hasCustom) preset = 'megas';
    else if (isLeg && isMega && !isLevel && !hasCustom) preset = 'legend_megas';

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
  if (navDropdown) navDropdown.classList.add('hidden');
  if (navMenuBtn) navMenuBtn.classList.remove('btn-accent');
  const backdrop = document.getElementById('dropdownBackdrop');
  if (backdrop) backdrop.style.display = 'none';
}

function openNavDropdown() {
  if (navDropdown) navDropdown.classList.remove('hidden');
  if (navMenuBtn) navMenuBtn.classList.add('btn-accent');
  const backdrop = document.getElementById('dropdownBackdrop');
  if (backdrop) backdrop.style.display = 'block';
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
    dropdownBackdrop.addEventListener('mousedown', closeNavDropdown);
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!navDropdown.contains(e.target) && e.target !== navMenuBtn) {
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
    const val = parseInt(autoStartDelaySelect.value, 10) || 5;
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
    config.settings.autoCatchMasterBall = !(config.settings.autoCatchMasterBall === true);
    saveLocalConfig();
    updateAutoCatchUI();
    delugeView.send('update-config', config.settings);
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

if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    if (isRunning) stopBot();
    updateStatus('Flushing battle cache & reloading...', '#38bdf8');
    try {
      if (delugeView && typeof delugeView.executeJavaScript === 'function') {
        try {
          await delugeView.executeJavaScript('sessionStorage.clear(); localStorage.clear();');
        } catch (_) {}
      }
      await ipcRenderer.invoke('soft-session-flush');
    } catch (_) {}

    if (delugeView) {
      if (typeof delugeView.reloadIgnoringCache === 'function') {
        delugeView.reloadIgnoringCache();
      } else {
        delugeView.reload();
      }
    }
    setTimeout(() => {
      updateStatus('Ready', '#10b981');
    }, 1500);
  });
}

// Clean Slate / Wipe Session Storage (In-DOM confirmation to prevent Windows focus loss)
function openWipeModal() {
  closeNavDropdown();
  if (wipeModal) showModal(wipeModal);
}

if (wipeBtn) wipeBtn.addEventListener('click', openWipeModal);
if (closeWipeBtn) closeWipeBtn.addEventListener('click', closeAllModals);
if (cancelWipeBtn) cancelWipeBtn.addEventListener('click', closeAllModals);

if (confirmWipeBtn) {
  confirmWipeBtn.addEventListener('click', async () => {
    closeAllModals();
    if (isRunning) {
      isRunning = false;
      updateToggleButton();
    }

    updateStatus('Wiping Session Data...', '#ef4444');
    const res = await ipcRenderer.invoke('clear-session-data');

    if (res && res.success) {
      delugeView.src = 'https://www.delugerpg.com/login';
      updateStatus('Session Wiped: Clean Slate', '#10b981');
    } else {
      updateStatus('Wipe Failed: ' + ((res && res.error) || 'Unknown error'), '#ef4444');
    }
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

// 2. Zoom IPC Command from Main Process
ipcRenderer.on('zoom-command', (event, cmd) => {
  if (cmd === 'in') zoomIn();
  else if (cmd === 'out') zoomOut();
  else if (cmd === 'reset') zoomReset();
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

function getActiveCandidates() {
  if (!currentCollection || currentCollection.length === 0) return [];
  const filtered = teamEngine.filterCandidatePool(currentCollection, teamPoolFilter);
  if (teamRosterMode === 'TRAINING') {
    return filtered.filter(p => (typeof p.level === 'number' ? p.level : 100) < 100);
  }
  return filtered;
}

function updateRosterModeUI() {
  const filtered = teamEngine.filterCandidatePool(currentCollection || [], teamPoolFilter);
  const inTrainingCount = filtered.filter(p => (typeof p.level === 'number' ? p.level : 100) < 100).length;
  const totalCount = filtered.length;

  if (poolModeAllBtn) {
    poolModeAllBtn.textContent = `All Levels (${totalCount})`;
    if (teamRosterMode === 'ALL') {
      poolModeAllBtn.style.border = '1px solid #388bfd';
      poolModeAllBtn.style.background = '#14233c';
      poolModeAllBtn.style.color = '#ffffff';
      poolModeAllBtn.style.fontWeight = '700';
    } else {
      poolModeAllBtn.style.border = '1px solid transparent';
      poolModeAllBtn.style.background = 'transparent';
      poolModeAllBtn.style.color = '#8eaad0';
      poolModeAllBtn.style.fontWeight = '500';
    }
  }

  if (poolModeTrainingBtn) {
    poolModeTrainingBtn.innerHTML = `&#9889; Training &lt;100 (${inTrainingCount})`;
    if (teamRosterMode === 'TRAINING') {
      poolModeTrainingBtn.style.border = '1px solid #388bfd';
      poolModeTrainingBtn.style.background = '#14233c';
      poolModeTrainingBtn.style.color = '#ffffff';
      poolModeTrainingBtn.style.fontWeight = '700';
    } else {
      poolModeTrainingBtn.style.border = '1px solid transparent';
      poolModeTrainingBtn.style.background = 'transparent';
      poolModeTrainingBtn.style.color = '#8eaad0';
      poolModeTrainingBtn.style.fontWeight = '500';
    }
  }

  const filterLabels = {
    ANY: 'Pokemon',
    GMAX: 'G-Max',
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
      trainingStatsBadge.textContent = `${totalCount} ${label} in pool`;
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
    teamEmptyPrompt.innerHTML = `
      <div style="font-size: 20px; color: #388bfd; margin-bottom: 6px; opacity: 0.9;">&#9876;</div>
      <div style="font-weight: 700; color: #e0ecfa; font-size: 11.5px; margin-bottom: 3px;">Ready to Build</div>
      <div style="line-height: 1.4; max-width: 260px; font-size: 10.5px; color: #8eaad0;">Click <b>Build Best Team</b> to generate the optimal counter lineup.</div>
    `;
  }
}

function setTeamRosterMode(mode) {
  teamRosterMode = mode;
  if (!config.settings) config.settings = {};
  config.settings.teamRosterMode = mode;
  saveLocalConfig();
  updateRosterModeUI();
  resetTeamPrompt();
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
  });
}

function handleLiveBattleOpponents(data) {
  if (!data || !Array.isArray(data.roster) || data.roster.length === 0) return;
  liveBattleOpponent = data;
  if (data.battleUrl) {
    lastSelectedBattleUrl = data.battleUrl;
  }
  const oppSig = `${data.trainerName}:${data.battleUrl || ''}:${data.roster.map(p => p.name).join(',')}`;
  if (lastLoggedBattleOpponentSig !== oppSig) {
    lastLoggedBattleOpponentSig = oppSig;
    backendLog('BATTLE_DETECTOR', `Opponent detected: ${data.trainerName} (${data.roster.length} Pokemon)`);
  }

  // Auto-learn into gymLeadersData and persist to gym_leaders.json
  if (gymLeadersData && data.trainerName) {
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

    if (targetTrainer) {
      if (!Array.isArray(targetTrainer.roster)) targetTrainer.roster = [];
      let updated = false;
      for (const newPoke of data.roster) {
        const existing = targetTrainer.roster.find(p => p.name.toLowerCase() === newPoke.name.toLowerCase());
        if (!existing) {
          targetTrainer.roster.push(newPoke);
          updated = true;
        }
      }
      if (updated) {
        try {
          const gymPath = getWritableDataPath('gym_leaders.json');
          fs.writeFileSync(gymPath, JSON.stringify(gymLeadersData, null, 2), 'utf8');
          backendLog('ROSTER_HARVESTER', `Updated ${targetTrainer.name} roster (${targetTrainer.roster.length}/6 known)`);
          populateGymTrainerSelect();
        } catch (e) {
          backendLog('ROSTER_HARVESTER', `Failed saving roster: ${e.message}`);
        }
      }
    }
  }

  if (!teamTrainerSelect) return;

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

function loadTeamBuilderData() {
  try {
    const rawColl = readDataFile('user_collection.json');
    if (rawColl) {
      currentCollection = JSON.parse(rawColl);
      if (scanStatusBadge) scanStatusBadge.textContent = `${currentCollection.length} Pokemon Synced`;
      if (candidatePoolFilterSelect && teamPoolFilter) {
        candidatePoolFilterSelect.value = teamPoolFilter;
      }
      updateRosterModeUI();
    }
  } catch (_) {}

  try {
    const rawGym = readDataFile('gym_leaders.json');
    if (rawGym) {
      gymLeadersData = JSON.parse(rawGym);
      const activeCategory = (teamCategorySelect && teamCategorySelect.value) ? teamCategorySelect.value : 'ALL';
      populateGymTrainerSelect(activeCategory);
    }
  } catch (_) {}
}

function populateGymTrainerSelect(categoryFilter = null) {
  if (!teamTrainerSelect || !gymLeadersData) return;

  if (categoryFilter === null) {
    categoryFilter = (teamCategorySelect && teamCategorySelect.value) ? teamCategorySelect.value : 'ALL';
  }

  const prevSelectedValue = teamTrainerSelect.value;
  teamTrainerSelect.innerHTML = '';
  let matchCount = 0;

  if (liveBattleOpponent && Array.isArray(liveBattleOpponent.roster) && liveBattleOpponent.roster.length > 0) {
    const liveGroup = document.createElement('optgroup');
    liveGroup.id = 'optgroup-live-battle';
    liveGroup.label = 'CURRENT BATTLE (LIVE DETECTED)';
    const opt = document.createElement('option');
    opt.value = 'LIVE__BATTLE';
    opt.textContent = `[LIVE] ${liveBattleOpponent.trainerTitle || liveBattleOpponent.trainerName} (${liveBattleOpponent.roster.length} Pokemon)`;
    liveGroup.appendChild(opt);
    teamTrainerSelect.appendChild(liveGroup);
    matchCount++;
  }

  const groupOrder = [
    { key: 'VIP_TRAINERS', label: 'VIP TRAINERS (Gym Leaders & Champions)' },
    { key: 'ULTIMATE_TRAINERS', label: 'ULTIMATE TRAINERS (Lvl 100 Masters)' },
    { key: 'STRONG_TRAINERS', label: 'STRONG TRAINERS (Bosses & Veterans)' },
    { key: 'STANDARD_TRAINERS', label: 'STANDARD TRAINERS' },
    { key: 'KANTO', label: 'KANTO LEAGUE' },
    { key: 'JOHTO', label: 'JOHTO LEAGUE' },
    { key: 'HOENN', label: 'HOENN LEAGUE' },
    { key: 'SINNOH', label: 'SINNOH LEAGUE' },
    { key: 'UNOVA', label: 'UNOVA LEAGUE' },
    { key: 'KALOS', label: 'KALOS LEAGUE' },
    { key: 'ALOLA', label: 'ALOLA LEAGUE' },
    { key: 'GALAR', label: 'GALAR LEAGUE' },
    { key: 'PALDEA', label: 'PALDEA LEAGUE' }
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

    trainers.forEach((leader, idx) => {
      const opt = document.createElement('option');
      opt.value = `${groupKey}__${idx}`;
      const typeStr = (leader.types || []).join('/');
      const lvlStr = leader.avgLevel ? `Lv ${leader.avgLevel}` : '';
      const rosterBadge = (Array.isArray(leader.roster) && leader.roster.length > 0) ? ` [${leader.roster.length}/6]` : '';
      opt.textContent = `${leader.name} (${typeStr}${lvlStr ? ' - ' + lvlStr : ''})${rosterBadge}`;
      group.appendChild(opt);
      matchCount++;
    });

    teamTrainerSelect.appendChild(group);
  }

  if (filteredTrainerCountBadge) {
    filteredTrainerCountBadge.textContent = `${matchCount} available`;
    filteredTrainerCountBadge.style.color = '#64748b';
  }

  if (liveBattleOpponent) {
    teamTrainerSelect.value = 'LIVE__BATTLE';
  } else if (prevSelectedValue && teamTrainerSelect.querySelector(`option[value="${prevSelectedValue}"]`)) {
    teamTrainerSelect.value = prevSelectedValue;
  } else if (teamTrainerSelect.options.length > 0) {
    teamTrainerSelect.selectedIndex = 0;
  }
}

if (teamCategorySelect) {
  teamCategorySelect.addEventListener('change', () => {
    populateGymTrainerSelect(teamCategorySelect.value);
  });
}

function updateTeamBuilderBadge(isOpen) {
  const badge = document.getElementById('teamBuilderBadge');
  if (badge) {
    badge.textContent = isOpen ? 'ON' : 'OFF';
    badge.className = 'dropdown-badge ' + (isOpen ? 'dropdown-badge-on' : 'dropdown-badge-off');
  }
}

function openTeamBuilderPanel() {
  if (!teamBuilderModal) return;
  if (adsInspectorModal) adsInspectorModal.style.display = 'none';
  if (catchLogModal) catchLogModal.style.display = 'none';
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
  if (!lastRecommendedTeam || lastRecommendedTeam.length === 0) {
    if (teamEmptyPrompt) teamEmptyPrompt.style.display = 'flex';
    if (teamResultContainer) teamResultContainer.style.display = 'none';
    if (teamActionRow) teamActionRow.style.display = 'none';
  } else {
    if (teamEmptyPrompt) teamEmptyPrompt.style.display = 'none';
    if (teamResultContainer) teamResultContainer.style.display = 'block';
    if (teamActionRow) teamActionRow.style.display = 'flex';
  }
  try {
    if (delugeView && typeof delugeView.send === 'function') {
      delugeView.send('check-battle-opponents');
    }
  } catch (_) {}
}

function closeTeamBuilderPanel() {
  if (!teamBuilderModal) return;
  teamBuilderModal.style.display = 'none';
  if ((!adsInspectorModal || adsInspectorModal.style.display !== 'flex') &&
      (!catchLogModal || catchLogModal.style.display !== 'flex')) {
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 3px; border-top: 1px solid #1a283e; font-size: 9.5px;">
          <span style="color: #8eaad0;">Container: <code style="color: #e0ecfa;">${item.parentContainer || 'None'}</code></span>
          <span style="color: #388bfd; font-weight: 600;">${item.status || 'Smoothly Collapsed'}</span>
        </div>
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
      (!catchLogModal || catchLogModal.style.display !== 'flex')) {
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
    const btn = e.target.closest('button[data-ad-filter]');
    if (!btn) return;
    adsFilterTabs.querySelectorAll('button').forEach(b => b.classList.remove('btn-active'));
    btn.classList.add('btn-active');
    adsFilterType = btn.getAttribute('data-ad-filter') || 'ALL';
    renderAdsInspectorUI();
  });
}

if (scanPokesBtn) {
  scanPokesBtn.addEventListener('click', () => {
    if (scanStatusBadge) scanStatusBadge.textContent = 'Scanning...';
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
}

function probeTrainerRostersDirectly(targetTrainers) {
  if (!delugeView) return;
  delugeView.send('start-scan-trainer-rosters', { trainers: targetTrainers });
}

if (scanTrainersBtn) {
  scanTrainersBtn.addEventListener('click', () => {
    updateTrainerIntelStats();
    if (activeBattleStatusMsg) {
      if (delugeView) {
        try {
          const curUrl = delugeView.getURL() || '';
          if (curUrl.includes('/battle')) {
            delugeView.send('check-battle-opponents');
            activeBattleStatusMsg.style.color = '#388bfd';
            activeBattleStatusMsg.textContent = 'Active battle detected! Scanning arena for opponent team...';
          } else {
            activeBattleStatusMsg.style.color = '#8eaad0';
            activeBattleStatusMsg.textContent = 'Auto-recorder active. Opponent teams are saved automatically when battles begin!';
          }
        } catch (_) {
          activeBattleStatusMsg.textContent = 'Auto-recorder active in battles.';
        }
      }
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
          activeBattleStatusMsg.textContent = 'Scanning active battle for opponent roster...';
        }
      } else {
        if (activeBattleStatusMsg) {
          activeBattleStatusMsg.style.color = '#d29922';
          activeBattleStatusMsg.textContent = 'No battle active on screen. Enter a battle on the left to capture!';
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
      ? 'No eligible training counters (&lt; Lv 100) found in your collection for this opponent.'
      : 'No eligible counters found.';
    teamResultList.innerHTML = `<div style="padding:16px 10px; color:rgba(244, 238, 232, 0.7); font-size:11px; text-align:center;">${emptyMsg}</div>`;
    if (teamActionRow) teamActionRow.style.display = 'none';
    return;
  }

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 6px; font-size:10px; color:#8eaad0; border-bottom:1px solid #1a283e; margin-bottom:6px; font-weight:600;';
  const targetLabel = (leader && leader.name) ? leader.name : 'Opponent';
  const modeBadge = teamRosterMode === 'TRAINING'
    ? ' <span style="color:#388bfd; font-weight:700; margin-left:6px; background:rgba(56, 139, 253, 0.15); border:1px solid rgba(56, 139, 253, 0.3); padding:1px 6px; border-radius:4px;">&#9889; TRAINING (&lt;100)</span>'
    : '';
  header.innerHTML = `<span>YOUR COUNTER TEAM${modeBadge}</span><span>TARGET: ${targetLabel}</span>`;
  teamResultList.appendChild(header);

  team.forEach(p => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:#0e1b30; border:1px solid #1a283e; border-radius:4px; font-size:11px; gap:8px;';

    const left = document.createElement('div');
    left.style.cssText = 'display:flex; align-items:center; gap:8px; min-width:0; flex:1;';

    const slotBadge = document.createElement('span');
    slotBadge.style.cssText = 'font-weight:700; color:#388bfd; width:14px; flex-shrink:0;';
    slotBadge.textContent = `${p.slot}.`;
    left.appendChild(slotBadge);

    if (p.sprite) {
      const img = document.createElement('img');
      img.src = p.sprite;
      img.style.cssText = 'width:28px; height:28px; object-fit:contain; flex-shrink:0;';
      left.appendChild(img);
    }

    const info = document.createElement('div');
    info.style.cssText = 'min-width:0; overflow:hidden;';
    const varColor = (p.variant && p.variant !== 'Normal') ? '#388bfd' : '#e0ecfa';
    info.innerHTML = `<div style="font-weight:700; color:${varColor}; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name} <span style="font-weight:500; color:#8eaad0;">(Lv ${p.level})</span></div>` +
                     `<div style="font-size:10px; color:#8eaad0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Attack: <b style="color:#e0ecfa;">${p.bestMove}</b></div>`;
    left.appendChild(info);

    const right = document.createElement('div');
    right.style.cssText = 'text-align:right; white-space:nowrap; flex-shrink:0; display:flex; flex-direction:column; align-items:flex-end; gap:2px;';

    let targetBadgeHtml = '';
    if (p.targetName === 'Safety Anchor & Carry') {
      targetBadgeHtml = '<span style="display:inline-block; padding:1px 6px; font-size:9.5px; font-weight:700; color:#388bfd; background:rgba(56, 139, 253, 0.15); border:1px solid rgba(56, 139, 253, 0.3); border-radius:4px;">CARRY ANCHOR</span>';
    } else if (p.targetName === 'Lead Solo Sweeper') {
      targetBadgeHtml = '<span style="display:inline-block; padding:1px 6px; font-size:9.5px; font-weight:700; color:#d29922; background:rgba(210, 153, 34, 0.15); border:1px solid rgba(210, 153, 34, 0.3); border-radius:4px;">SOLO SWEEPER</span>';
    } else if (p.targetName === 'Gym Anchor' || p.targetName === 'Reserve Anchor') {
      targetBadgeHtml = '<span style="display:inline-block; padding:1px 6px; font-size:9.5px; font-weight:700; color:#8eaad0; background:#070e1a; border:1px solid #1a283e; border-radius:4px;">RESERVE</span>';
    } else if (p.targetName === 'Trainee' || (typeof p.targetName === 'string' && p.targetName.startsWith('Trainee'))) {
      targetBadgeHtml = '<span style="display:inline-block; padding:1px 6px; font-size:9.5px; font-weight:700; color:#238636; background:rgba(35, 134, 54, 0.15); border:1px solid rgba(56, 180, 100, 0.3); border-radius:4px;">TRAINEE</span>';
    } else if (p.targetName) {
      targetBadgeHtml = `<span style="display:inline-block; padding:1px 6px; font-size:9.5px; font-weight:700; color:#388bfd; background:rgba(56, 139, 253, 0.15); border:1px solid rgba(56, 139, 253, 0.3); border-radius:4px;">vs ${p.targetName}</span>`;
    } else {
      targetBadgeHtml = '<span style="display:inline-block; padding:1px 6px; font-size:9.5px; font-weight:700; color:#8eaad0; background:#070e1a; border:1px solid #1a283e; border-radius:4px;">COUNTER</span>';
    }

    const cleanRole = (p.role || '').replace(/\s*\(vs\s+[^)]+\)/i, '');
    right.innerHTML = targetBadgeHtml +
                      `<div style="font-size:10px; font-weight:600; color:#8eaad0;">${cleanRole}</div>`;

    row.appendChild(left);
    row.appendChild(right);
    teamResultList.appendChild(row);
  });

  if (teamActionRow) teamActionRow.style.display = 'flex';
  if (teamActionStatus) teamActionStatus.textContent = '';
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
    const effectivePool = teamEngine.filterCandidatePool(currentCollection || [], teamPoolFilter);
    const trainees = effectivePool.filter(p => (p.level || 100) < 100);
    const lvl100Pokes = effectivePool.filter(p => (p.level || 0) === 100);
    const highLvlPokes = effectivePool.filter(p => (p.level || 0) >= 70);

    if (trainees.length === 0) {
      const filterLabels = {
        ANY: 'training candidates (< Lv 100)',
        GMAX: 'G-Max training candidates (< Lv 100)',
        LEGENDARY: 'Legendary training candidates (< Lv 100)',
        ULTRABEAST: 'Ultra Beast training candidates (< Lv 100)',
        PARADOX: 'Paradox training candidates (< Lv 100)',
        COMMON: 'Common training candidates (< Lv 100)'
      };
      const label = filterLabels[teamPoolFilter] || 'training candidates (< Lv 100)';
      if (teamResultContainer) teamResultContainer.style.display = 'block';
      if (teamResultList) {
        teamResultList.innerHTML = `<div style="padding:16px 10px; color:rgba(244, 238, 232, 0.7); font-size:11px; text-align:center;">No ${label} available in your collection.<br><span style="color:rgba(244, 238, 232, 0.5); font-size:10px;">Switch to <b>All Levels</b> or switch pool filter to <b>Any</b>.</span></div>`;
      }
      if (teamActionRow) teamActionRow.style.display = 'none';
      return;
    }

    // 1. Pick carry defense-first: prefer from effectivePool if high-level exists, fallback to all lvl100s to protect trainees
    const carryPool = lvl100Pokes.length > 0 ? lvl100Pokes : (highLvlPokes.length > 0 ? highLvlPokes : (currentCollection || []).filter(p => (p.level || 0) === 100));
    let rankedCarries = teamEngine.rankCarries(carryPool.filter(p => teamEngine.canSoloTrainer(p, targetLeader)), targetLeader);
    if (rankedCarries.length === 0) {
      rankedCarries = teamEngine.rankCarries(carryPool.length > 0 ? carryPool : (currentCollection || []).filter(p => (p.level || 0) >= 70), targetLeader);
    }
    const carryPoke = rankedCarries.length > 0 ? rankedCarries[0].poke : null;
    const bestCarries = carryPoke ? teamEngine.buildBestTeam(targetLeader, [carryPoke]) : [];
    const carry = bestCarries.length > 0 ? bestCarries[0] : null;

    // 2. Trainees filtered to prevent duplicate species with carry
    const carrySpecies = carry ? teamEngine.getBaseSpecies(carry.name) : '';
    const availableTrainees = trainees.filter(p => (!carry || p.id !== carry.id) && (!carrySpecies || teamEngine.getBaseSpecies(p.name) !== carrySpecies));

    // 3. Pick top 5 trainees (< 100)
    let traineeCounters = teamEngine.buildBestTeam(targetLeader, availableTrainees).slice(0, 5);

    // 4. Check if any trainee can solo targetLeader
    let soloTraineeIdx = -1;
    for (let idx = 0; idx < traineeCounters.length; idx++) {
      const tc = traineeCounters[idx];
      const orig = availableTrainees.find(p => p.id === tc.id);
      if (orig && teamEngine.canSoloTrainer(orig, targetLeader)) {
        soloTraineeIdx = idx;
        break;
      }
    }

    // If none of top 5 can solo, check remaining available trainees
    if (soloTraineeIdx === -1) {
      for (const p of availableTrainees) {
        if (teamEngine.canSoloTrainer(p, targetLeader)) {
          const scored = teamEngine.buildBestTeam(targetLeader, [p]);
          if (scored.length > 0) {
            const soloTrainee = scored[0];
            traineeCounters = traineeCounters.filter(t => teamEngine.getBaseSpecies(t.name) !== teamEngine.getBaseSpecies(p.name));
            if (traineeCounters.length >= 5) traineeCounters.pop();
            traineeCounters.unshift(soloTrainee);
            soloTraineeIdx = 0;
            break;
          }
        }
      }
    } else if (soloTraineeIdx > 0) {
      // Reorder so solo-capable trainee leads in Slot 1
      const soloTrainee = traineeCounters.splice(soloTraineeIdx, 1)[0];
      traineeCounters.unshift(soloTrainee);
      soloTraineeIdx = 0;
    }

    const hybridTeam = [];
    traineeCounters.forEach((t, idx) => {
      const orig = availableTrainees.find(p => p.id === t.id);
      const isSolo = orig ? teamEngine.canSoloTrainer(orig, targetLeader) : false;
      hybridTeam.push({
        slot: idx + 1,
        id: t.id,
        name: t.name,
        variant: t.variant,
        level: t.level,
        types: t.types,
        sprite: t.sprite,
        bestMove: t.bestMove,
        targetName: isSolo ? 'Lead Solo Sweeper' : ('Trainee #' + (idx + 1)),
        role: isSolo ? 'Lead Solo Sweeper (100% Solo EXP)' : (t.role || ('Trainee Counter (Lv ' + t.level + ')')),
        score: t.score
      });
    });

    if (carry && !hybridTeam.some(p => p.id === carry.id)) {
      hybridTeam.push({
        slot: hybridTeam.length + 1,
        id: carry.id,
        name: carry.name,
        variant: carry.variant,
        level: carry.level,
        types: carry.types,
        sprite: carry.sprite,
        bestMove: carry.bestMove,
        targetName: 'Safety Anchor & Carry',
        role: 'Solo Sweeper Carry (Lv ' + carry.level + ')',
        score: carry.score
      });
    }

    lastRecommendedTeam = hybridTeam;
    renderTeamLineup(targetLeader, hybridTeam);
    return;
  }

  const candidates = getActiveCandidates();
  if (candidates.length === 0) {
    const filterLabels = {
      ANY: 'Pokemon',
      GMAX: 'G-Max Pokemon',
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

  const team = teamEngine.buildBestTeam(targetLeader, candidates);
  lastRecommendedTeam = team;
  renderTeamLineup(targetLeader, team);
}

if (buildTeamBtn) {
  buildTeamBtn.addEventListener('click', () => {
    const selVal = teamTrainerSelect ? teamTrainerSelect.value : '';
    if (!selVal) return;

    let targetLeader = null;
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
    if (!lastRecommendedTeam || lastRecommendedTeam.length === 0) return;
    const ids = lastRecommendedTeam.map(p => p.id);
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
  if (lastSelectedBattleUrl) return lastSelectedBattleUrl;

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

  return '/battle/trainer';
}

if (battleOpponentBtn) {
  battleOpponentBtn.addEventListener('click', () => {
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
    if (selVal && selVal !== 'LIVE__BATTLE' && gymLeadersData) {
      const parts = selVal.split('__');
      const group = gymLeadersData[parts[0]] || [];
      const leader = /^\d+$/.test(parts[1]) ? group[parseInt(parts[1], 10)] : group.find(l => l.name === parts[1]);
      if (leader) {
        if (leader.battleUrl) lastSelectedBattleUrl = leader.battleUrl;
        else if (leader.npcId) lastSelectedBattleUrl = '/battle/trainer/' + leader.npcId;
      }
    }
  });
}

// --- TODAY'S AUTO-CATCH & MASTER BALL PERSISTENCE ---
const DAILY_CATCH_STORAGE_KEY = 'deluge_daily_catch_log';

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let dailyCatchData = {
  date: getTodayDateKey(),
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
        <div style="font-size: 20px; margin-bottom: 6px; color: #388bfd;">&#9918;</div>
        <div style="font-weight: 600; color: #e0ecfa;">No Pokemon caught yet today</div>
        <div style="font-size: 10px; margin-top: 4px; color: #566e96;">Target Pokemon automatically caught during hunts will appear here with sprite, variant, level, and timestamp.</div>
      </div>
    `;
    return;
  }

  let html = '';
  for (let i = 0; i < dailyCatchData.caught.length; i++) {
    const p = dailyCatchData.caught[i];
    const spriteTag = p.sprite ? `<img src="${p.sprite}" alt="${p.name}">` : `<span style="font-size: 18px; color: #388bfd;">&#9918;</span>`;
    html += `
      <div class="caught-pokemon-card">
        <div class="caught-card-thumb">${spriteTag}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <span style="font-size: 11.5px; font-weight: 700; color: #e0ecfa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</span>
            <span style="font-size: 9.5px; color: #8eaad0; font-weight: 600;">${p.timestamp || ''}</span>
          </div>
          <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(56, 139, 253, 0.15); color: #388bfd; border: 1px solid rgba(56, 139, 253, 0.3); font-weight: 600;">${p.variant || 'Normal'}</span>
            <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: #070e1a; color: #8eaad0; border: 1px solid #1a283e; font-weight: 600;">Lv ${p.level || '?'}</span>
            <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(210, 153, 34, 0.15); color: #d29922; border: 1px solid rgba(210, 153, 34, 0.3); font-weight: 600;">${p.ball || 'Master Ball'}</span>
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
}

function updateBallInventory(inv) {
  if (!inv || typeof inv !== 'object') return;
  if (typeof inv.masterBall === 'number') {
    dailyCatchData.masterBallStock = inv.masterBall;
  }
  if (!dailyCatchData.bagInventory) dailyCatchData.bagInventory = {};
  if (typeof inv.pokeBall === 'number') dailyCatchData.bagInventory.pokeBall = inv.pokeBall;
  if (typeof inv.greatBall === 'number') dailyCatchData.bagInventory.greatBall = inv.greatBall;
  if (typeof inv.ultraBall === 'number') dailyCatchData.bagInventory.ultraBall = inv.ultraBall;
  if (typeof inv.masterBall === 'number') dailyCatchData.bagInventory.masterBall = inv.masterBall;
  if (inv.rawSummary) dailyCatchData.bagInventory.rawSummary = inv.rawSummary;

  saveDailyCatchLog();
  updateCatchLogBadge();
  renderCatchLogUI();
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
      (!adsInspectorModal || adsInspectorModal.style.display !== 'flex')) {
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
    updateCatchLogBadge();
    renderCatchLogUI();
    updateStatus("Today's catch log cleared", '#388bfd');
  });
}
if (refreshCatchLogBtn) {
  refreshCatchLogBtn.addEventListener('click', () => {
    updateStatus('Syncing ball inventory...', '#388bfd');
    try {
      if (delugeView && typeof delugeView.send === 'function') {
        delugeView.send('request-ball-inventory');
      }
    } catch (_) {}
    setTimeout(() => {
      updateStatus('Inventory synced', '#238636');
    }, 500);
  });
}

// Initial load of today's catch log
loadDailyCatchLog();

// Open Team Builder docked side panel by default
openTeamBuilderPanel();
