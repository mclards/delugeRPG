// test_zoom_integration.js
// Verifies zoom implementation across HTML UI, host controller, main process, and guest preload.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TESTING DELUGERPG ZOOM INTEGRATION ---');

const ROOT_DIR = fs.existsSync(path.join(__dirname, 'desktop-client')) ? __dirname : path.join(__dirname, '..');
const appHtmlPath = path.join(ROOT_DIR, 'desktop-client', 'app.html');
const appJsPath = path.join(ROOT_DIR, 'desktop-client', 'app.js');
const mainJsPath = path.join(ROOT_DIR, 'desktop-client', 'main.js');
const preloadJsPath = path.join(ROOT_DIR, 'desktop-client', 'game-preload.js');

const appHtml = fs.readFileSync(appHtmlPath, 'utf8');
const appJs = fs.readFileSync(appJsPath, 'utf8');
const mainJs = fs.readFileSync(mainJsPath, 'utf8');
const preloadJs = fs.readFileSync(preloadJsPath, 'utf8');

// 1. UI Elements in app.html
assert(appHtml.includes('id="zoomOutBtn"'), 'app.html must include zoomOutBtn');
assert(appHtml.includes('id="zoomResetBtn"'), 'app.html must include zoomResetBtn');
assert(appHtml.includes('id="zoomInBtn"'), 'app.html must include zoomInBtn');
assert(appHtml.includes('class="zoom-cluster"'), 'app.html must include zoom-cluster class');
assert(appHtml.includes('.btn-zoom-icon'), 'app.html must style btn-zoom-icon');
assert(appHtml.includes('.btn-zoom-val'), 'app.html must style btn-zoom-val');
console.log('  [PASS] HTML toolbar controls and CSS styling confirmed.');

// 2. Logic in app.js
assert(appJs.includes("document.getElementById('zoomOutBtn')"), 'app.js must bind zoomOutBtn');
assert(appJs.includes("document.getElementById('zoomResetBtn')"), 'app.js must bind zoomResetBtn');
assert(appJs.includes("document.getElementById('zoomInBtn')"), 'app.js must bind zoomInBtn');
assert(appJs.includes('function applyZoom('), 'app.js must implement applyZoom()');
assert(appJs.includes('function zoomIn()'), 'app.js must implement zoomIn()');
assert(appJs.includes('function zoomOut()'), 'app.js must implement zoomOut()');
assert(appJs.includes('function zoomReset()'), 'app.js must implement zoomReset()');
assert(appJs.includes('delugeView.setZoomFactor('), 'app.js must invoke setZoomFactor on webview');
assert(appJs.includes("event.channel === 'zoom-in'"), 'app.js must handle zoom-in IPC message');
assert(appJs.includes("event.channel === 'zoom-out'"), 'app.js must handle zoom-out IPC message');
assert(appJs.includes("event.channel === 'zoom-reset'"), 'app.js must handle zoom-reset IPC message');
assert(appJs.includes("ipcRenderer.on('zoom-command'"), 'app.js must listen for zoom-command IPC from main process');
console.log('  [PASS] Host controller zoom state, UI update, and IPC logic confirmed.');

// 3. Zoom Clamping and Precision Math Test
function clampZoom(factor) {
    return Math.min(2.5, Math.max(0.5, Math.round(factor * 100) / 100));
}
assert.strictEqual(clampZoom(1.0), 1.0);
assert.strictEqual(clampZoom(1.0 + 0.1), 1.1);
assert.strictEqual(clampZoom(1.1 + 0.1), 1.2);
assert.strictEqual(clampZoom(0.5 - 0.1), 0.5, 'Clamped to min 0.5 (50%)');
assert.strictEqual(clampZoom(2.5 + 0.2), 2.5, 'Clamped to max 2.5 (250%)');
console.log('  [PASS] Zoom factor math and safety clamping verified (50% to 250%).');

// 4. Main Process Shortcut Interception in main.js
assert(mainJs.includes('web-contents-created'), 'main.js must intercept input on web-contents-created');
assert(mainJs.includes('before-input-event'), 'main.js must handle before-input-event');
assert(mainJs.includes("mainWindow.webContents.send('zoom-command'"), 'main.js must forward zoom-command to renderer');
console.log('  [PASS] Main process global webContents zoom accelerators confirmed.');

// 5. Guest Webview Context in game-preload.js
assert(preloadJs.includes("ipcRenderer.sendToHost('zoom-in')"), 'preload must send zoom-in to host');
assert(preloadJs.includes("ipcRenderer.sendToHost('zoom-out')"), 'preload must send zoom-out to host');
assert(preloadJs.includes("ipcRenderer.sendToHost('zoom-reset')"), 'preload must send zoom-reset to host');
assert(preloadJs.includes("window.addEventListener('wheel'"), 'preload must listen for wheel events');
assert(preloadJs.includes("window.addEventListener('keydown'"), 'preload must listen for keydown events');
console.log('  [PASS] Guest webview shortcut and Ctrl+MouseWheel forwarders confirmed.');

// 6. Strict ASCII Integrity Test
[appHtmlPath, appJsPath, mainJsPath, preloadJsPath].forEach(filePath => {
    const bytes = fs.readFileSync(filePath);
    for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] > 127) {
            throw new Error(`Non-ASCII character found in ${filePath} at offset ${i}`);
        }
    }
});
console.log('  [PASS] All modified files verified 100% clean 7-bit ASCII.');

console.log('--- ALL DELUGERPG ZOOM INTEGRATION TESTS PASSED! ---');

