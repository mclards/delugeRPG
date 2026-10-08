// app.js - Host controller for the hardened standalone desktop client
// Incorporates Gaussian cadence, human fatigue drift, micro-breaks, and network proxy management

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG_PATH = path.join(__dirname, 'config.json');

let config = {
  dummyAccount: { username: "PokeDen", password: "sacups2026", autoLogin: false },
  network: { useProxy: false, proxyRules: "", proxyBypass: "<local>" },
  settings: {
    profile: "flagged_network_stealth",
    walkMode: "wander",
    stepsPerDirection: 1,
    baseDelay: 2100,
    jitter: 550,
    minSafetyFloor: 1700,
    enableMicroBreaks: true,
    enableIdlePauses: true,
    soundAlert: true
  }
};

function loadLocalConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(raw);
  } catch (_) {}
}

function saveLocalConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write config.json:', err);
  }
}

loadLocalConfig();

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
const stepCounterElem = document.getElementById('stepCounter');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const soundBtn = document.getElementById('soundBtn');
const targetModalBtn = document.getElementById('targetModalBtn');
const autoCatchBtn = document.getElementById('autoCatchBtn');
const wipeBtn = document.getElementById('wipeBtn');
const networkBtn = document.getElementById('networkBtn');
const networkBadge = document.getElementById('networkBadge');
const netIcon = document.getElementById('netIcon');
const netText = document.getElementById('netText');
const loginHelperBtn = document.getElementById('loginHelperBtn');
const refreshBtn = document.getElementById('refreshBtn');
const navMenuBtn = document.getElementById('navMenuBtn');
const navDropdown = document.getElementById('navDropdown');

// Modals - Target Filter Elements
const targetModal = document.getElementById('targetModal');
const closeTargetBtn = document.getElementById('closeTargetBtn');
const cancelTargetBtn = document.getElementById('cancelTargetBtn');
const saveTargetsBtn = document.getElementById('saveTargetsBtn');
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

// State
let isRunning = false;
let stepCount = 0;
let patternStepCount = 0;
let walkTimeout = null;
let soundEnabled = config.settings.soundAlert !== false;
let mapIsSearching = false;
let isEncounterOnScreen = false;
let isStepPending = false;
let isGuestInputFocused = false;
let currentZoomFactor = (config.settings && typeof config.settings.zoomFactor === 'number')
  ? config.settings.zoomFactor
  : 1.0;

// Pacing & Fatigue State
let stepsSinceLastMicroBreak = 0;
let stepsSinceLastIdlePause = 0;
let nextMicroBreakThreshold = Math.floor(Math.random() * 15) + 20; // 20 to 35 steps
let nextIdlePauseThreshold = Math.floor(Math.random() * 40) + 110; // 110 to 150 steps
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
      modalSecurityNotice.style.background = 'rgba(16, 185, 129, 0.15)';
      modalSecurityNotice.style.color = '#34d399';
      modalSecurityNotice.textContent = 'VERIFIED SAFE: Connected via Starlink (AS14593 SpaceX). Clean satellite IP isolated from banned home accounts.';
    } else if (currentNetworkInfo.isPLDT) {
      modalSecurityNotice.style.background = 'rgba(239, 68, 68, 0.15)';
      modalSecurityNotice.style.color = '#f87171';
      modalSecurityNotice.textContent = 'DANGER: Connected via PLDT (' + (currentNetworkInfo.ip || 'Home IP') + '). This ISP is shared with banned accounts! Connect Tailscale Starlink exit node!';
    } else if (isProxied) {
      modalSecurityNotice.style.background = 'rgba(16, 185, 129, 0.15)';
      modalSecurityNotice.style.color = '#34d399';
      modalSecurityNotice.textContent = 'PROXIED: Traffic routed securely through ' + config.network.proxyRules;
    } else {
      modalSecurityNotice.style.background = 'rgba(56, 189, 248, 0.1)';
      modalSecurityNotice.style.color = '#38bdf8';
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
  const req = https.get('https://ipwho.is/', { timeout: 4500 }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        if (res.statusCode !== 200) return callback(new Error('HTTP ' + res.statusCode));
        const json = JSON.parse(raw);
        if (!json.success || !json.ip) return callback(new Error('ipwho.is unsuccessful'));
        const org = (json.connection && json.connection.org) || '';
        const ispRaw = (json.connection && json.connection.isp) || '';
        const asn = (json.connection && json.connection.asn) ? ('AS' + json.connection.asn) : '';
        callback(null, parseNetworkDetails(json.ip, org, ispRaw, asn, ''));
      } catch (e) {
        callback(e);
      }
    });
  });
  req.on('timeout', () => { req.destroy(); callback(new Error('Timeout')); });
  req.on('error', (err) => callback(err));
}

function queryIpApi(callback) {
  const req = http.get('http://ip-api.com/json', { timeout: 4500 }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        if (res.statusCode !== 200) return callback(new Error('HTTP ' + res.statusCode));
        const json = JSON.parse(raw);
        if (json.status !== 'success' || !json.query) return callback(new Error('ip-api unsuccessful'));
        callback(null, parseNetworkDetails(json.query, json.org || '', json.isp || '', json.as || '', ''));
      } catch (e) {
        callback(e);
      }
    });
  });
  req.on('timeout', () => { req.destroy(); callback(new Error('Timeout')); });
  req.on('error', (err) => callback(err));
}

function queryIpInfo(callback) {
  const req = https.get('https://ipinfo.io/json', { timeout: 4500 }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        if (res.statusCode !== 200) return callback(new Error('HTTP ' + res.statusCode));
        const json = JSON.parse(raw);
        if (!json.ip) return callback(new Error('ipinfo no ip'));
        callback(null, parseNetworkDetails(json.ip, json.org || '', '', '', json.hostname || ''));
      } catch (e) {
        callback(e);
      }
    });
  });
  req.on('timeout', () => { req.destroy(); callback(new Error('Timeout')); });
  req.on('error', (err) => callback(err));
}

function queryIpify(callback) {
  const req = https.get('https://api.ipify.org?format=json', { timeout: 4500 }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        if (res.statusCode !== 200) return callback(new Error('HTTP ' + res.statusCode));
        const json = JSON.parse(raw);
        if (!json.ip) return callback(new Error('ipify no ip'));
        callback(null, parseNetworkDetails(json.ip, '', '', '', ''));
      } catch (e) {
        callback(e);
      }
    });
  });
  req.on('timeout', () => { req.destroy(); callback(new Error('Timeout')); });
  req.on('error', (err) => callback(err));
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

function updateAutoCatchUI() {
  const isAuto = !!(config.settings && config.settings.autoCatch);
  autoCatchBtn.innerHTML = '&#9733;';
  autoCatchBtn.title = isAuto ? 'Auto-Catch: ON (Throws Master Ball automatically)' : 'Auto-Catch: OFF (Safe mode)';
  autoCatchBtn.className = isAuto ? 'btn btn-icon btn-active' : 'btn btn-icon';
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
  const isLeg = config.settings && config.settings.findLegendaries !== false;
  const classicLeg = config.settings && config.settings.legendaryClassic !== false;
  const ubLeg = config.settings && config.settings.legendaryUltraBeasts !== false;
  const paradoxLeg = config.settings && config.settings.legendaryParadox !== false;

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
  if (filterVariantsCheckbox) filterVariantsCheckbox.checked = isVar;

  variantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = isVar && activeVariants.map(v => v.toLowerCase()).includes(variantMap[id].toLowerCase());
    }
  });

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
  else if (isLeg && !isMega && !isLevel && hasNormal && specialCount === 9 && !hasCustom) presetKey = 'legendaries';
  else if (!isLeg && isMega && !isLevel && hasNormal && specialCount === 9 && !hasCustom) presetKey = 'megas';
  else if (isLeg && isMega && isVar && !isLevel && !hasNormal && isShinyOnly && !hasCustom) presetKey = 'shinies';
  else if (!isLeg && !isMega && isVar && !isLevel && !hasNormal && specialCount === 9 && !hasCustom) presetKey = 'variants';
  else if (isLeg && isMega && !isLevel && hasNormal && specialCount === 9 && !hasCustom) presetKey = 'legend_megas';

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
  let isMega = true;
  let isVar = true;
  let isClassic = true;
  let isUB = true;
  let isParadox = true;
  let selectedVars = Object.values(variantMap);

  if (presetKey === 'legendaries') {
    isLeg = true; isMega = false; isVar = false;
    selectedVars = Object.values(variantMap);
  } else if (presetKey === 'megas') {
    isLeg = false; isMega = true; isVar = false;
    selectedVars = Object.values(variantMap);
  } else if (presetKey === 'variants') {
    isLeg = false; isMega = false; isVar = true;
    selectedVars = Object.values(variantMap).filter(v => v !== 'Normal');
  } else if (presetKey === 'shinies') {
    isLeg = true; isMega = true; isVar = true;
    selectedVars = ['Shiny'];
  } else if (presetKey === 'legend_megas') {
    isLeg = true; isMega = true; isVar = false;
    selectedVars = Object.values(variantMap);
  } else if (presetKey === 'all') {
    isLeg = true; isMega = true; isVar = true;
    selectedVars = Object.values(variantMap);
  }

  if (filterLegendariesCheckbox) filterLegendariesCheckbox.checked = isLeg;
  if (subClassicLegCheckbox) subClassicLegCheckbox.checked = isClassic;
  if (subUltraBeastsCheckbox) subUltraBeastsCheckbox.checked = isUB;
  if (subParadoxCheckbox) subParadoxCheckbox.checked = isParadox;

  if (filterMegasCheckbox) filterMegasCheckbox.checked = isMega;
  if (filterVariantsCheckbox) filterVariantsCheckbox.checked = isVar;

  variantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = selectedVars.includes(variantMap[id]);
    }
  });

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
    config.settings.legendaryClassic = isClassic;
    config.settings.legendaryUltraBeasts = isUB;
    config.settings.legendaryParadox = isParadox;
    config.settings.findMegasAndGigantamax = isMega;
    config.settings.findAnySpecialVariant = isVar;
    config.settings.selectedVariants = selectedVars;
    saveLocalConfig();
    updateTargetUI();
    delugeView.send('update-config', config.settings);
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
updateAutoCatchUI();
updateSoundUI();
updateTargetUI();
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
function updateStatus(text, color = '#94a3b8') {
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
    return p === '/map' || p.startsWith('/map/');
  } catch (_) {
    return false;
  }
}

function autoPauseOutsideMap(source = '') {
  if (isRunning) {
    console.log('[Auto-Pause] Hunting auto-paused because client navigated outside map:', source);
    isRunning = false;
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
    updateToggleButton();
    updateStatus('Auto-Paused (Outside Map)', '#f59e0b');
    syncHuntingState();
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
    if (btnText) btnText.textContent = 'Paused';
    updateStatus('Paused', '#f59e0b');
  }
  syncHuntingState();
}

function toggleHunting() {
  if (!isRunning) {
    const curUrl = delugeView ? delugeView.getURL() : '';
    if (curUrl && !isMapUrl(curUrl)) {
      updateStatus('Cannot Hunt Outside Map!', '#ef4444');
      setTimeout(() => {
        if (!isRunning) updateStatus('Paused (Outside Map)', '#f59e0b');
      }, 2000);
      return;
    }
  }
  isRunning = !isRunning;
  updateToggleButton();
  if (isRunning) {
    isEncounterOnScreen = false;
    isStepPending = false;
    scheduleNextStep(200);
  } else {
    isStepPending = false;
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
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
  if (navBlockedStatus[dir]) return true;
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
  const retreatDiagonals = ADJACENT_45_8[opp] || [];
  const unblockedRetreat = retreatDiagonals.filter(k => !excluded.includes(k) && !isDirectionPhysicallyBlocked(k, now) && (!deadEndCooldowns[k] || deadEndCooldowns[k] <= now));
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

  // 5. Absolute fallback if enclosed on 3 sides: pick opposite
  return opp;
}

function chooseWanderDirection(currentDir) {
  const now = Date.now();
  currentDir = currentDir || 'Right';

  // Gather unblocked candidates from all 8 directions
  const unblocked = ALL_DIRECTIONS_8.filter(d => !isDirectionPhysicallyBlocked(d, now) && (!deadEndCooldowns[d] || deadEndCooldowns[d] <= now));

  if (unblocked.length === 0) {
    const anyUnblocked = ALL_DIRECTIONS_8.filter(d => !isDirectionPhysicallyBlocked(d, now));
    if (anyUnblocked.length > 0) {
      return anyUnblocked[Math.floor(Math.random() * anyUnblocked.length)];
    }
    return chooseEvadeDirection(currentDir);
  }

  // Smooth human-like wandering across open maps in all 8 directions
  const sameDir = currentDir;
  const adjList = ADJACENT_45_8[currentDir] || [];
  const perpList = PERPENDICULARS_8[currentDir] || [];
  const opp = OPPOSITES_8[currentDir];

  const pool = [];
  unblocked.forEach(d => {
    if (d === sameDir) {
      for(let i=0; i<25; i++) pool.push(d); // Huge preference (71%) to maintain current heading
    } else if (adjList.includes(d)) {
      for(let i=0; i<3; i++) pool.push(d); // Minor chance (17%) to gracefully veer 45 degrees
    } else if (perpList.includes(d)) {
      pool.push(d); // Rare chance (5%) for a sharp 90-degree turn
    } else if (d !== opp) {
      pool.push(d); // Very rare chance for a wider angle
    } else if (unblocked.length === 1) {
      pool.push(d); // Only reverse if cornered
    }
  });

  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
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
      wanderStepsLeft = Math.max(3, stepsPerDir);
      updateStatus(`Escaping choke point (${escapeDir})...`, '#38bdf8');
      return escapeDir;
    }
    const anyEscape = ALL_DIRECTIONS_8.filter(k => k !== loop.dirA && k !== loop.dirB && !isDirectionPhysicallyBlocked(k, now));
    if (anyEscape.length > 0) {
      const escapeDir = anyEscape[Math.floor(Math.random() * anyEscape.length)];
      currentDirectionKey = escapeDir;
      wanderStepsLeft = Math.max(3, stepsPerDir);
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
  const perpList = PERPENDICULARS_8[currentDirectionKey] || ['Up', 'Down'];
  const bothPerpsBlocked = perpList.every(k => isDirectionPhysicallyBlocked(k, now));
  const forwardIsBlocked = isDirectionPhysicallyBlocked(currentDirectionKey, now);

  // If inside a straight corridor (both side walls blocked) and forward is clear:
  // PRESERVE MOMENTUM! Never turn around in the middle of a hallway!
  if (!forwardIsBlocked && bothPerpsBlocked) {
    wanderStepsLeft = compulsorySteps;
    return currentDirectionKey;
  }

  // If forward is blocked: trigger immediate zero-latency evasion!
  if (forwardIsBlocked) {
    currentDirectionKey = chooseEvadeDirection(currentDirectionKey);
    wanderStepsLeft = compulsorySteps - 1;
    return currentDirectionKey;
  }

  // Normal turn condition: steps expired at an open junction or room
  if (wanderStepsLeft <= 0) {
    currentDirectionKey = chooseWanderDirection(currentDirectionKey);
    wanderStepsLeft = compulsorySteps - 1;
  } else {
    wanderStepsLeft--;
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
      keyName = evaded;
      currentDirectionKey = evaded;
    }
  }

  try {
    lastDispatchedDirection = keyName;
    recentMoves.push(keyName);
    if (recentMoves.length > 8) recentMoves.shift();
    isStepPending = true;

    const isDiagonal = keyName.indexOf('-') !== -1;

    if (isDiagonal) {
      // Direct nav button click on DelugeRPG D-Pad (#dr-nw, #dr-ne, #dr-sw, #dr-se)
      delugeView.send('click-nav-button', { direction: keyName });
    } else {
      // Cardinal direction: Physical keyboard event + nav button click fallback
      delugeView.focus();
      delugeView.sendInputEvent({ type: 'keyDown', keyCode: keyName });
      const dwell = Math.floor(Math.random() * 40) + 75;
      setTimeout(() => {
        delugeView.sendInputEvent({ type: 'keyUp', keyCode: keyName });
      }, dwell);
      delugeView.send('click-nav-button', { direction: keyName });
    }

    // Subtle human mouse micro-motion to satisfy Deluge m_x telemetry
    if (Math.random() < 0.35) {
      const mx = Math.floor(Math.random() * 400) + 150;
      const my = Math.floor(Math.random() * 250) + 120;
      delugeView.sendInputEvent({ type: 'mouseMove', x: mx, y: my });
    }

    // Notify guest webview preload of dispatched step
    delugeView.send('step-dispatched', { direction: keyName, time: Date.now() });

    // Fallback collision timer: Safety net if preload doesn't resolve within 1600ms
    if (fallbackCollisionTimer) clearTimeout(fallbackCollisionTimer);
    fallbackCollisionTimer = setTimeout(() => {
      // Unconfirmed timeout after 1600ms: treat as collision, NEVER as success!
      handleMoveBlocked(keyName);
    }, 1600);

    patternStepCount++;
  } catch (err) {
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
      // Step in flight: wait 250ms and re-check before dispatching next step
      scheduleNextStep(250);
      return;
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

    // 1. Long Idle Pause (Simulate alt-tabbing or resting)
    stepsSinceLastIdlePause++;
    if (config.settings.enableIdlePauses && stepsSinceLastIdlePause >= nextIdlePauseThreshold) {
      stepsSinceLastIdlePause = 0;
      nextIdlePauseThreshold = Math.floor(Math.random() * 40) + 110;
      const pauseSec = ((14000 + Math.random() * 9000) / 1000).toFixed(1);
      updateStatus(`Resting (${pauseSec}s)...`, '#e879f9');
      scheduleNextStep(parseFloat(pauseSec) * 1000);
      return;
    }

    // 2. Micro-Breaks (Simulate glance/distraction)
    stepsSinceLastMicroBreak++;
    if (config.settings.enableMicroBreaks && stepsSinceLastMicroBreak >= nextMicroBreakThreshold) {
      stepsSinceLastMicroBreak = 0;
      nextMicroBreakThreshold = Math.floor(Math.random() * 15) + 20;
      const restSec = ((4500 + Math.random() * 4000) / 1000).toFixed(1);
      updateStatus(`Micro-pause (${restSec}s)`, '#a855f7');
      scheduleNextStep(parseFloat(restSec) * 1000);
      return;
    }

    // 3. Dispatch Step
    const key = getNextKey();
    sendKeyStep(key);
    updateStatus(`Hunting (${key})`, '#10b981');
    scheduleNextStep();
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
  wanderStepsLeft = (config.settings.stepsPerDirection || 1) - 1;

  updateStatus(`Obstacle! Turning (${evadeDir})...`, '#f59e0b');

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
  if (dir && blockedDirections[dir]) {
    delete blockedDirections[dir];
  }
  stepCount++;
  if (stepCounterElem) {
    stepCounterElem.textContent = `Steps: ${stepCount}`;
  }
}

// Webview Diagnostics & Logging Forwarder
delugeView.addEventListener('console-message', (e) => {
  console.log('[Webview Console]', e.message);
});

delugeView.addEventListener('preload-error', (e) => {
  console.error('[Webview Preload Error]', e.preloadPath, e.error);
});

// Navigation Safety: Auto-pause hunting when navigating outside maps
delugeView.addEventListener('did-navigate', (event) => {
  const url = event.url || (delugeView && delugeView.getURL()) || '';
  if (!isMapUrl(url)) {
    autoPauseOutsideMap(url);
  }
});

delugeView.addEventListener('did-navigate-in-page', (event) => {
  const url = event.url || (delugeView && delugeView.getURL()) || '';
  if (!isMapUrl(url)) {
    autoPauseOutsideMap(url);
  }
});

delugeView.addEventListener('will-navigate', (event) => {
  const url = event.url || '';
  if (!isMapUrl(url)) {
    autoPauseOutsideMap(url);
  }
});

// IPC Listener from webview (game-preload.js)
delugeView.addEventListener('ipc-message', (event) => {
  if (event.channel === 'preload-ready' || event.channel === 'request-config') {
    delugeView.send('update-config', config.settings);
    syncHuntingState();
  }

  if (event.channel === 'hunting-auto-pause') {
    const data = event.args[0] || {};
    autoPauseOutsideMap(data.path || 'outside-map');
  }

  if (event.channel === 'guest-input-focused') {
    isGuestInputFocused = !!(event.args[0]);
    if (isGuestInputFocused && delugeView) {
      try { delugeView.focus(); } catch (_) {}
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
    const data = event.args[0] || {};
    if (data.blocked) {
      for (const d in data.blocked) {
        navBlockedStatus[d] = !!data.blocked[d];
      }
    }
  }

  if (event.channel === 'move-result') {
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

  if (event.channel === 'target-found') {
    isStepPending = false;
    if (!isRunning) {
      // STRICT SAFETY: Only react to screen targets during an active hunting session!
      return;
    }

    const data = event.args[0] || {};
    const name = data.name || 'Rare Pokemon';
    const isAuto = !!data.autoCatch;

    // Halt movement immediately
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
    isRunning = false;
    isEncounterOnScreen = true;
    updateToggleButton();

    if (isAuto) {
      updateStatus(`FOUND: ${name}! (Auto-Catching...)`, '#22c55e');
    } else {
      updateStatus(`FOUND: ${name}!`, '#22c55e');
    }

    // Play alert sounds
    playSound(880, 0.8);
    setTimeout(() => playSound(1100, 0.8), 300);

    new Notification('Target Pokemon Found!', {
      body: `${name} has appeared on the map! ${isAuto ? 'Throwing ball automatically...' : 'Ready for capture.'}`
    });
  }

  if (event.channel === 'resume-hunting') {
    isEncounterOnScreen = false;
    isRunning = true;
    updateToggleButton();
    updateStatus('Caught! Resuming Hunt...', '#10b981');
    scheduleNextStep(1200);
  }

  if (event.channel === 'unlock-detected') {
    // Immediate emergency halt on security challenge
    if (walkTimeout) {
      clearTimeout(walkTimeout);
      walkTimeout = null;
    }
    isRunning = false;
    updateToggleButton();
    updateStatus('CAPTCHA / UNLOCK REQUIRED!', '#ef4444');
    playAlarmSound();

    alert('Security Check Detected (/unlock).\nClient paused. Solve the captcha manually in the window to continue.');
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
  applyZoom(currentZoomFactor);
  delugeView.send('update-config', config.settings);
  syncHuntingState();
  if (config.dummyAccount && config.dummyAccount.autoLogin) {
    delugeView.send('fill-login', config.dummyAccount);
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

  [targetModal, networkModal, accountModal].forEach(m => {
    if (m) m.style.display = 'none';
  });
  if (modalEl) {
    modalEl.style.display = (modalEl === targetModal) ? 'flex' : 'block';
    if (modalBackdrop) modalBackdrop.classList.add('active');
  }
}

function closeAllModals() {
  document.body.classList.remove('modal-open');
  [targetModal, networkModal, accountModal].forEach(m => {
    if (m) m.style.display = 'none';
  });
  if (modalBackdrop) modalBackdrop.classList.remove('active');
  if (delugeView) {
    delugeView.style.pointerEvents = 'auto';
    try { delugeView.focus(); } catch (_) {}
  }
}

// Stop click bubbling on modals so clicks never reach backdrop or outside handlers
[targetModal, networkModal, accountModal].forEach(m => {
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

// Ensure delugeView receives host focus whenever user interacts with game area
if (gameContainer) {
  gameContainer.addEventListener('pointerdown', () => {
    if (delugeView) {
      try { delugeView.focus(); } catch (_) {}
    }
  });
  gameContainer.addEventListener('click', () => {
    if (delugeView) {
      try { delugeView.focus(); } catch (_) {}
    }
  });
}

if (delugeView) {
  delugeView.addEventListener('pointerdown', () => {
    try { delugeView.focus(); } catch (_) {}
  });
  delugeView.addEventListener('click', () => {
    try { delugeView.focus(); } catch (_) {}
  });
}

if (modalBackdrop) {
  modalBackdrop.addEventListener('click', closeAllModals);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllModals();
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
    updateStatus('Max steps: ' + val, '#10b981');
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

// Quick Variant Helper Buttons
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
  const isLeg = filterLegendariesCheckbox ? filterLegendariesCheckbox.checked : false;
  const classicLeg = subClassicLegCheckbox ? subClassicLegCheckbox.checked : true;
  const ubLeg = subUltraBeastsCheckbox ? subUltraBeastsCheckbox.checked : true;
  const paradoxLeg = subParadoxCheckbox ? subParadoxCheckbox.checked : true;

  const isMega = filterMegasCheckbox ? filterMegasCheckbox.checked : false;
  const isVar = filterVariantsCheckbox ? filterVariantsCheckbox.checked : false;

  const selectedVars = [];
  variantIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.checked) {
      selectedVars.push(variantMap[id]);
    }
  });

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
    const isLeg = filterLegendariesCheckbox ? filterLegendariesCheckbox.checked : false;
    const classicLeg = subClassicLegCheckbox ? subClassicLegCheckbox.checked : true;
    const ubLeg = subUltraBeastsCheckbox ? subUltraBeastsCheckbox.checked : true;
    const paradoxLeg = subParadoxCheckbox ? subParadoxCheckbox.checked : true;

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
    else if (isLeg && !isMega && !isLevel && hasNormal && specialCount === 9 && !hasCustom) preset = 'legendaries';
    else if (!isLeg && isMega && !isLevel && hasNormal && specialCount === 9 && !hasCustom) preset = 'megas';
    else if (isLeg && isMega && isVar && !isLevel && !hasNormal && isShinyOnly && !hasCustom) preset = 'shinies';
    else if (!isLeg && !isMega && isVar && !isLevel && !hasNormal && specialCount === 9 && !hasCustom) preset = 'variants';
    else if (isLeg && isMega && !isLevel && hasNormal && specialCount === 9 && !hasCustom) preset = 'legend_megas';

    // In species-restricted presets (legendaries, megas, legend_megas), generic wild variants are never enabled
    const allowGenericVar = (preset === 'all' || preset === 'variants' || preset === 'shinies' || (preset === 'custom' && isVar && !isLeg && !isMega));
    config.settings.findAnySpecialVariant = allowGenericVar;
    config.settings.targetPreset = preset;
    saveLocalConfig();
    updateTargetUI();
    closeTargetModal();

    delugeView.send('update-config', config.settings);
    updateStatus('Targets: ' + preset.toUpperCase() + ' applied', '#10b981');
  });
}

// Collapsible Navigation Dropdown Menu Handlers
if (navMenuBtn && navDropdown) {
  navMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navDropdown.classList.toggle('hidden');
    navMenuBtn.classList.toggle('btn-accent', !navDropdown.classList.contains('hidden'));
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!navDropdown.contains(e.target) && e.target !== navMenuBtn) {
      navDropdown.classList.add('hidden');
      navMenuBtn.classList.remove('btn-accent');
    }
  });

  // Close dropdown on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !navDropdown.classList.contains('hidden')) {
      navDropdown.classList.add('hidden');
      navMenuBtn.classList.remove('btn-accent');
    }
  });

  // Auto-close dropdown when any option inside is clicked
  navDropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      navDropdown.classList.add('hidden');
      navMenuBtn.classList.remove('btn-accent');
    });
  });
}

autoCatchBtn.addEventListener('click', () => {
  config.settings.autoCatch = !config.settings.autoCatch;
  saveLocalConfig();
  updateAutoCatchUI();
  delugeView.send('update-config', config.settings);
});

refreshBtn.addEventListener('click', () => {
  delugeView.reload();
});

// Clean Slate / Wipe Session Storage
wipeBtn.addEventListener('click', async () => {
  const confirmWipe = confirm(
    'Wipe all cookies, cache, and site data?\n\n' +
    'This removes all lingering tokens from previously banned accounts so you start completely fresh.'
  );

  if (!confirmWipe) return;

  if (isRunning) {
    isRunning = false;
    updateToggleButton();
  }

  updateStatus('Wiping Session Data...', '#ef4444');
  const res = await ipcRenderer.invoke('clear-session-data');

  if (res && res.success) {
    alert('Session successfully wiped!\n\nAll cookies, cache, and local storage have been deleted. Loading fresh login page.');
    delugeView.src = 'https://www.delugerpg.com/login';
    updateStatus('Session Wiped: Clean Slate', '#10b981');
  } else {
    alert('Error wiping session data: ' + ((res && res.error) || 'Unknown error'));
  }
});

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
  detectNetworkIdentity();
  openNetworkModal();
});
networkBadge.addEventListener('click', () => {
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
    alert(proxyCfg.useProxy ? 'Proxy successfully configured! Reloading game view.' : 'Proxy disabled. Switched to direct network.');
    delugeView.reload();
    updateStatus('Proxy Applied', '#10b981');
  } else {
    alert('Error applying proxy: ' + ((res && res.error) || 'Unknown'));
  }
});

// Account Modal Management
loginHelperBtn.addEventListener('click', () => {
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
  config.dummyAccount.username = creds.username;
  config.dummyAccount.password = creds.password;
  saveLocalConfig();

  delugeView.send('fill-login', creds);
  closeAllModals();
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

// 3. Host Window Keyboard Shortcuts (Ctrl + + / Ctrl + - / Ctrl + 0)
window.addEventListener('keydown', (e) => {
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
