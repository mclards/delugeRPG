// main.js - Electron Main Process for DelugeRPG Desktop Client
// Hardened against network tracking, WebRTC leaks, and fingerprinting

const { app, BrowserWindow, globalShortcut, Menu, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. Anti-Detection Switches
// Disable Chromium automation flags so navigator.webdriver is undefined natively
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

// 2. Standard Google Chrome Identity (Matching exact Chromium 142 engine without Electron signature)
const CHROME_VERSION = (process.versions && process.versions.chrome) || '142.0.7444.52';
const CHROME_MAJOR = CHROME_VERSION.split('.')[0] || '142';
const CLEAN_CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + CHROME_VERSION + ' Safari/537.36';
app.userAgentFallback = CLEAN_CHROME_USER_AGENT;

let mainWindow = null;
const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return {
      network: { useProxy: false, proxyRules: '', proxyBypass: '<local>' },
      dummyAccount: { username: '', password: '', autoLogin: false },
      settings: { profile: 'flagged_network_stealth', baseDelay: 2100, jitter: 550, minSafetyFloor: 1700 }
    };
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

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

    callback({ requestHeaders: headers });
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
      contextIsolation: false
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

  // IPC Handler: Clear storage and cache for a clean identity slate
  ipcMain.handle('clear-session-data', async () => {
    try {
      await ses.clearStorageData({
        storages: ['cookies', 'localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage']
      });
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

  createWindow();

  // Register zoom shortcuts and security policies across all window frames, iframes and webviews
  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));

    contents.on('console-message', (e, level, message) => {
      const ts = new Date().toISOString().substring(11, 23);
      const line = `[${ts}] [WebContents Console] ${message}\n`;
      try {
        process.stdout.write(line);
      } catch (_) {}
      try {
        fs.appendFileSync(path.join(__dirname, 'backend_live.log'), line, 'utf8');
      } catch (_) {}
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