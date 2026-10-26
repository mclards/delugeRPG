// main.js - Electron Main Process for DelugeRPG Desktop Client
// Hardened against network tracking, WebRTC leaks, and fingerprinting

const { app, BrowserWindow, globalShortcut, Menu, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure unified application name so userData path is canonical across dev, portable, and installer updates
app.setName('delugerpg-desktop-client');

// 1. Anti-Detection Switches
// Disable Chromium automation flags so navigator.webdriver is undefined natively
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

// 2. Standard Google Chrome Identity (Matching exact Chromium 142 engine without Electron signature)
const CHROME_VERSION = (process.versions && process.versions.chrome) || '142.0.7444.52';
const CHROME_MAJOR = CHROME_VERSION.split('.')[0] || '142';
const CLEAN_CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + CHROME_VERSION + ' Safari/537.36';
app.userAgentFallback = CLEAN_CHROME_USER_AGENT;

let mainWindow = null;

// Resolve a writable configuration path across packaged, portable, and development environments
function getResolvedConfigPath() {
  const userDataDir = app.getPath('userData');
  try {
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
  } catch (_) {}

  // Check if a portable config.json exists next to the executable
  try {
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
    const portableConfig = path.join(portableDir, 'config.json');
    if (app.isPackaged && fs.existsSync(portableConfig)) {
      fs.accessSync(portableConfig, fs.constants.W_OK);
      return portableConfig;
    }
  } catch (_) {}

  const userConfigPath = path.join(userDataDir, 'config.json');

  // Automatic Migration: Seed config.json to userData if not present
  if (!fs.existsSync(userConfigPath)) {
    try {
      const devPath = path.join(__dirname, 'config.json');
      if (fs.existsSync(devPath)) {
        const bundled = fs.readFileSync(devPath, 'utf8');
        fs.writeFileSync(userConfigPath, bundled, 'utf8');
      }
    } catch (err) {
      console.error('Failed to seed default config.json to userData:', err);
    }
  }

  // Automatic Migration: Seed user collection, gym leaders, daily catch/safety logs, and favorite trainers if missing in userData
  const migrateFiles = ['user_collection.json', 'gym_leaders.json', 'daily_catch_log.json', 'daily_safety_log.json', 'favorite_trainers.json'];
  for (const f of migrateFiles) {
    const targetPath = path.join(userDataDir, f);
    if (!fs.existsSync(targetPath)) {
      try {
        const sourcePath = path.join(__dirname, f);
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
        }
      } catch (_) {}
    }
  }

  return userConfigPath;
}

const CONFIG_PATH = getResolvedConfigPath();
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

const _systemLogBuffer = [];
let _systemLogFlushTimer = null;

function _flushSystemLogs() {
  if (_systemLogBuffer.length === 0) return;
  const chunk = _systemLogBuffer.join('');
  _systemLogBuffer.length = 0;
  _systemLogFlushTimer = null;
  try {
    fs.appendFile(LOG_FILE, chunk, 'utf8', () => {});
  } catch (_) {}
}

function appendSystemLog(line) {
  _systemLogBuffer.push(line);
  if (!_systemLogFlushTimer) {
    _systemLogFlushTimer = setTimeout(_flushSystemLogs, 250);
  }
}

function backendLog(tag, msg) {
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  appendSystemLog(`[${ts}] [${tag}] ${msg}\n`);
}

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

function loadConfig() {
  let defaults = {
    dummyAccount: { username: '', password: '', autoLogin: false },
    network: { useProxy: false, proxyRules: '', proxyBypass: '<local>' },
    settings: {
      profile: 'flagged_network_stealth',
      walkMode: 'wander',
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
      pvpCandidateTier: 'ANY'
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
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      return deepMerge(defaults, JSON.parse(raw));
    }
  } catch (_) {}

  return defaults;
}

function saveConfig(cfg) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = CONFIG_PATH + '.tmp';
    const bakPath = CONFIG_PATH + '.bak';
    const jsonStr = JSON.stringify(cfg, null, 2);
    fs.writeFileSync(tempPath, jsonStr, 'utf8');
    if (fs.existsSync(CONFIG_PATH)) {
      try { fs.copyFileSync(CONFIG_PATH, bakPath); } catch (_) {}
    }
    fs.renameSync(tempPath, CONFIG_PATH);
    if (!app.isPackaged) {
      try {
        fs.writeFileSync(path.join(__dirname, 'config.json'), jsonStr, 'utf8');
      } catch (_) {}
    }
  } catch (err) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (fallbackErr) {
      console.error('Failed to save config:', fallbackErr);
    }
  }
}

// IPC config handlers for renderer synchronization
ipcMain.on('get-config-path-sync', (event) => {
  event.returnValue = CONFIG_PATH;
});

ipcMain.on('get-log-path-sync', (event) => {
  event.returnValue = LOG_FILE;
});

ipcMain.handle('get-config-json', async () => {
  return loadConfig();
});

ipcMain.handle('save-config-json', async (event, newConfig) => {
  try {
    saveConfig(newConfig);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-log-file', async () => {
  const { shell } = require('electron');
  try {
    if (fs.existsSync(LOG_FILE)) {
      await shell.openPath(LOG_FILE);
    } else {
      await shell.openPath(path.dirname(LOG_FILE));
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function setupSessionHardening(ses, config) {
  // A. Apply Proxy if enabled
  if (config.network && config.network.useProxy && config.network.proxyRules) {
    ses.setProxy({
      proxyRules: config.network.proxyRules,
      proxyBypassRules: config.network.proxyBypass || '<local>'
    }).catch(err => console.error('setProxy error:', err));
  } else {
    ses.setProxy({ proxyRules: 'direct://' }).catch(() => {});
  }

  // Enforce session-wide User-Agent matching genuine Chromium engine
  ses.setUserAgent(CLEAN_CHROME_USER_AGENT);

  // B. HTTP Header Sanitization & Consistent Google Chrome Fingerprint
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = Object.assign({}, details.requestHeaders);

    // Enforce uniform standard Chrome User-Agent across all frames (including Turnstile challenges)
    headers['User-Agent'] = CLEAN_CHROME_USER_AGENT;
    headers['sec-ch-ua'] = '"Chromium";v="' + CHROME_MAJOR + '", "Google Chrome";v="' + CHROME_MAJOR + '", "Not(A:Brand";v="24"';
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"Windows"';
    headers['Accept-Language'] = 'en-US,en;q=0.9';

    // Strip automation headers
    delete headers['X-Requested-With'];
    delete headers['X-DevTools-Emulate-Network-Conditions-Client-Id'];

    // Strict parity for native DelugeRPG AJAX endpoints
    if (details.url && details.url.includes('/ajax/')) {
      headers['X-Requested-With'] = 'XMLHttpRequest';
      if (details.url.includes('/ajax/team/edit/save')) {
        headers['Referer'] = 'https://www.delugerpg.com/team/edit';
      }
    }

    callback({ requestHeaders: headers });
  });

  // C. Network POST & AJAX Interceptor: Tracks dispatched actions and round-trip server feedback
  const inFlightAjaxRequests = new Map();

  ses.webRequest.onBeforeRequest({ urls: ['*://*.delugerpg.com/*'] }, (details, callback) => {
    callback({});
    const isCloudflareOrMapPoll = details.url && (details.url.includes('/cdn-cgi/') || details.url.includes('/ajax/map/positions/'));
    const isAjaxOrPost = (details.method === 'POST' || (details.url && details.url.includes('/ajax/'))) && !isCloudflareOrMapPoll;
    if (isAjaxOrPost) {
      inFlightAjaxRequests.set(details.id, {
        url: details.url,
        method: details.method,
        startTime: Date.now()
      });
    }

    if (details.method === 'POST' && !isCloudflareOrMapPoll) {
      setImmediate(() => {
        try {
          let postBody = '';
          if (details.uploadData && details.uploadData.length > 0) {
            const parts = [];
            for (const item of details.uploadData) {
              if (item.bytes) {
                parts.push(Buffer.from(item.bytes).toString('utf8'));
              }
            }
            postBody = parts.join('');
          }
          backendLog('NETWORK_POST', `${details.url} -> ${postBody}`);

          if (details.url && details.url.includes('/ajax/team/edit/save')) {
            const dumpDir = path.join(path.dirname(CONFIG_PATH), 'dom_dumps');
            if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir, { recursive: true });
            const filePath = path.join(dumpDir, 'team_save_network_post.json');
            fs.writeFile(filePath, JSON.stringify({
              timestamp: new Date().toISOString(),
              url: details.url,
              method: details.method,
              postBody: postBody
            }, null, 2), 'utf8', () => {});
          }
        } catch (err) {
          console.error('[NetworkIntercept] Error:', err);
        }
      });
    }
  });

  ses.webRequest.onCompleted({ urls: ['*://*.delugerpg.com/*'] }, (details) => {
    const tracked = inFlightAjaxRequests.get(details.id);
    if (tracked) {
      inFlightAjaxRequests.delete(details.id);
      const elapsed = Date.now() - tracked.startTime;
      const shortUrl = tracked.url.replace(/^https?:\/\/[^\/]+/, '');
      backendLog('NETWORK_FEEDBACK', `${tracked.method} ${shortUrl} -> Status: ${details.statusCode} (${elapsed}ms)`);
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        mainWindow.webContents.send('action-feedback-event', {
          method: tracked.method,
          url: shortUrl,
          status: details.statusCode,
          elapsedMs: elapsed,
          success: details.statusCode >= 200 && details.statusCode < 400
        });
      }
    }
  });

  ses.webRequest.onErrorOccurred({ urls: ['*://*.delugerpg.com/*'] }, (details) => {
    const tracked = inFlightAjaxRequests.get(details.id);
    if (tracked) {
      inFlightAjaxRequests.delete(details.id);
      const elapsed = Date.now() - tracked.startTime;
      const shortUrl = tracked.url.replace(/^https?:\/\/[^\/]+/, '');
      backendLog('NETWORK_FEEDBACK', `FAILED: ${tracked.method} ${shortUrl} -> Error: ${details.error} (${elapsed}ms)`);
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        mainWindow.webContents.send('action-feedback-event', {
          method: tracked.method,
          url: shortUrl,
          status: 0,
          error: details.error,
          elapsedMs: elapsed,
          success: false
        });
      }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'DelugeRPG Client [Hardened]',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    backgroundColor: '#111418',
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  // Register native Edit Menu for keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+A, Backspace) while keeping UI clean
  const menuTemplate = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  mainWindow.setAutoHideMenuBar(true);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, 'app.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    const config = loadConfig();
    const ses = session.fromPartition('persist:delugerpg');
    setupSessionHardening(ses, config);

  // Private in-memory session store for guest preload (prevents touching window.sessionStorage)
  const preloadSessionMemoryStore = Object.create(null);

  // IPC Handler: Clear storage and cache for a clean identity slate
  ipcMain.handle('clear-session-data', async () => {
    try {
      // 1. Wipe private in-memory preload store
      for (const k in preloadSessionMemoryStore) {
        delete preloadSessionMemoryStore[k];
      }
      // 2. Wipe Chromium persistent partition storages & cache
      await ses.clearStorageData({
        storages: ['cookies', 'localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage']
      });
      await ses.clearCache();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC Handler: Soft Battle Cache Flush (Purges client storage & HTTP cache without touching auth cookies)
  ipcMain.handle('soft-session-flush', async () => {
    try {
      await ses.clearCache();
      await ses.clearStorageData({
        storages: ['localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage']
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('preload-session-store', (event, payload) => {
    try {
      const act = payload && payload.action;
      const key = payload && payload.key;
      if (act === 'getAll') {
        event.returnValue = Object.assign({}, preloadSessionMemoryStore);
      } else if (act === 'get' && key) {
        event.returnValue = Object.prototype.hasOwnProperty.call(preloadSessionMemoryStore, key)
          ? preloadSessionMemoryStore[key]
          : null;
      } else if (act === 'set' && key) {
        preloadSessionMemoryStore[key] = String(payload.value);
        event.returnValue = true;
      } else if (act === 'remove' && key) {
        delete preloadSessionMemoryStore[key];
        event.returnValue = true;
      } else {
        event.returnValue = null;
      }
    } catch (_) {
      event.returnValue = null;
    }
  });

  ipcMain.on('preload-session-store-async', (event, payload) => {
    try {
      const act = payload && payload.action;
      const key = payload && payload.key;
      if (act === 'set' && key) {
        preloadSessionMemoryStore[key] = String(payload.value);
      } else if (act === 'remove' && key) {
        delete preloadSessionMemoryStore[key];
      }
    } catch (_) {}
  });

  // IPC Handler: Recover from HTTP 403 Forbidden by purging poisoned Cloudflare cookies & cache
  ipcMain.handle('recover-forbidden-session', async () => {
    try {
      const cookies = await ses.cookies.get({});
      for (const c of cookies) {
        if (c.name && (c.name.startsWith('__cf') || c.name.startsWith('_cf') || c.name === 'cf_clearance')) {
          const proto = c.secure ? 'https://' : 'http://';
          const dom = (c.domain || '').replace(/^\./, '');
          await ses.cookies.remove(proto + dom + (c.path || '/'), c.name).catch(() => {});
        }
      }
      await ses.clearCache();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC Handler: Dynamically update and apply proxy settings
  ipcMain.handle('apply-proxy', async (event, proxySettings) => {
    try {
      const currentConfig = loadConfig();
      currentConfig.network = proxySettings;
      saveConfig(currentConfig);

      if (proxySettings.useProxy && proxySettings.proxyRules) {
        await ses.setProxy({
          proxyRules: proxySettings.proxyRules,
          proxyBypassRules: proxySettings.proxyBypass || '<local>'
        });
      } else {
        await ses.setProxy({ proxyRules: 'direct://' });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC Handler: Restore native OS window focus for keyboard input reliability
  ipcMain.on('restore-window-focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
    }
  });

  createWindow();

  // Register zoom shortcuts and security policies across all window frames, iframes and webviews
  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    try {
      const currentCfg = loadConfig();
      if (currentCfg.network && currentCfg.network.useProxy && typeof contents.setWebRTCIPHandlingPolicy === 'function') {
        contents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
      }
    } catch (_) {}

    contents.on('console-message', (e, level, message) => {
      if (isAdOrTrackerNoise(message)) return;
      if (contents.getType && contents.getType() === 'webview') return;
      const ts = new Date().toISOString().substring(11, 23);
      const line = `[${ts}] [WebContents Console] ${message}\n`;
      try {
        process.stdout.write(line);
      } catch (_) {}
      appendSystemLog(line);
    });

    contents.on('before-input-event', (inputEvent, input) => {
      if (input.type === 'keyDown' && (input.control || input.meta)) {
        if (input.key === '=' || input.key === '+' || input.code === 'NumpadAdd' || input.code === 'Equal') {
          inputEvent.preventDefault();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('zoom-command', 'in');
          }
        } else if (input.key === '-' || input.key === '_' || input.code === 'NumpadSubtract' || input.code === 'Minus') {
          inputEvent.preventDefault();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('zoom-command', 'out');
          }
        } else if (input.key === '0' || input.code === 'Numpad0' || input.code === 'Digit0') {
          inputEvent.preventDefault();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('zoom-command', 'reset');
          }
        }
      }
    });
  });

  // Register F2 global hotkey for pause/resume
  globalShortcut.register('F2', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hotkey-f2');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});