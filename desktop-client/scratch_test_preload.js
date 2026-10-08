const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'scratch_test.log');
fs.writeFileSync(logFile, 'Test started at ' + new Date().toISOString() + '\n');

function log(msg) {
  fs.appendFileSync(logFile, msg + '\n');
  console.log(msg);
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

  win.webContents.on('did-attach-webview', (e, wc) => {
    log('[ATTACHED WEBVIEW]');
    wc.on('preload-error', (ev, preloadPath, err) => {
      log('PRELOAD ERROR: ' + preloadPath + ' : ' + (err && err.message));
    });
    wc.on('console-message', (ev, level, msg, line, sourceId) => {
      log('WEBVIEW CONSOLE: ' + msg + ' (' + sourceId + ':' + line + ')');
    });
    wc.on('did-fail-load', (ev, errorCode, errorDescription, validatedURL) => {
      log('DID FAIL LOAD: ' + validatedURL + ' - ' + errorDescription);
    });
    wc.on('did-finish-load', () => {
      log('DID FINISH LOAD');
    });
  });

  win.webContents.on('console-message', (e, level, msg) => {
    log('HOST CONSOLE: ' + msg);
  });

  setTimeout(() => {
    log('Test finished');
    app.quit();
  }, 5000);
});

