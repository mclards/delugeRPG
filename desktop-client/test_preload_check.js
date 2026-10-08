const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'test_output.log');
fs.writeFileSync(logFile, 'Starting Electron test...\n');

function writeLog(msg) {
  fs.appendFileSync(logFile, msg + '\n');
}

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile(path.join(__dirname, 'app.html'));

  win.webContents.on('did-attach-webview', (e, guestContents) => {
    writeLog('Attached webview successfully!');
    guestContents.on('preload-error', (ev, preloadPath, err) => {
      writeLog('PRELOAD ERROR DETECTED: ' + preloadPath + ' -> ' + (err ? err.stack || err.message : 'no err object'));
    });
    guestContents.on('console-message', (ev, level, msg) => {
      writeLog('GUEST CONSOLE: ' + msg);
    });
  });

  setTimeout(() => {
    writeLog('Done test, quitting.');
    app.quit();
  }, 4000);
});

