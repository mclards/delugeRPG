// Unit test for Hunting Toggle Button (Play/Pause), Colors, Height & Steps Per Turn Input
const fs = require('fs');
const assert = require('assert');

const appHtml = fs.readFileSync('desktop-client/app.html', 'utf8');
const appJs = fs.readFileSync('desktop-client/app.js', 'utf8');
const configJson = JSON.parse(fs.readFileSync('desktop-client/config.json', 'utf8'));

// 1. Verify Toggle Button relocation and structure
assert(appHtml.includes('id="toggleBtn"'), 'toggleBtn must exist in app.html');
assert(appHtml.includes('btn-toggle-main'), 'btn-toggle-main class must exist in app.html');

// Check that toggleBtn is placed right before navMenuBtn / nav-menu-wrapper in nav-right
const toggleBtnIdx = appHtml.indexOf('id="toggleBtn"');
const navMenuWrapperIdx = appHtml.indexOf('class="nav-menu-wrapper"');
assert(toggleBtnIdx !== -1 && navMenuWrapperIdx !== -1, 'Both toggleBtn and nav-menu-wrapper must exist');
assert(toggleBtnIdx < navMenuWrapperIdx, 'toggleBtn must be located before navMenuBtn in toolbar');

// 2. Verify plain, no shadow, beveled tactile CSS styles & height
assert(appHtml.includes('box-shadow: none !important;'), 'btn-toggle-main must have box-shadow: none !important');
assert(appHtml.includes('border-bottom: 2px solid'), 'btn-toggle-main must have a beveled border-bottom tactile edge');
assert(appHtml.includes('min-width: 80px;'), 'btn-toggle-main must have min-width for text label');
assert(appHtml.includes('height: 28px;'), 'btn-toggle-main must have standard 28px toolbar height');

// 3. Verify Play/Pause colors
// btn-active (hunting): emerald green
assert(appHtml.includes('.btn-toggle-main.btn-active'), 'btn-active style must exist');
assert(appHtml.includes('background: #059669;'), 'btn-active must have solid emerald green background');
assert(appHtml.includes('border: 1px solid #10b981;'), 'btn-active must have vibrant emerald border');

// btn-paused (paused): amber
assert(appHtml.includes('.btn-toggle-main.btn-paused'), 'btn-paused style must exist');
assert(appHtml.includes('background: #d97706;'), 'btn-paused must have solid amber background');
assert(appHtml.includes('border: 1px solid #f59e0b;'), 'btn-paused must have vibrant amber border');

// 4. Verify Hunting / Paused label
assert(appHtml.includes('<span id="btnText">Paused</span>'), 'btnText must show Paused initially in HTML');
assert(appJs.includes("btnText.textContent = 'Hunting';"), 'updateToggleButton must set Hunting when active');
assert(appJs.includes("btnText.textContent = 'Paused';"), 'updateToggleButton must set Paused when paused');

// 5. Verify stepsPerDirInput element exists
assert(appHtml.includes('id="stepsPerDirInput"'), 'stepsPerDirInput must exist in app.html');
assert(appJs.includes("const stepsPerDirInput = document.getElementById('stepsPerDirInput');"), 'stepsPerDirInput element must be bound in app.js');
assert(appJs.includes('stepsPerDirInput.value = (config.settings && config.settings.stepsPerDirection) || 1;'), 'stepsPerDirInput must initialize from config');
assert(appJs.includes("stepsPerDirInput.addEventListener('change'"), 'stepsPerDirInput must have change event listener');

// 6. Verify default config has stepsPerDirection
assert.strictEqual(typeof configJson.settings.stepsPerDirection, 'number', 'stepsPerDirection must be a number in config.json');

// 7. Verify compulsory steps logic in app.js
assert(appJs.includes('const compulsorySteps = config.settings.stepsPerDirection || 1;'), 'compulsorySteps must read from stepsPerDirection');
assert(appJs.includes('wanderStepsLeft = compulsorySteps - 1;'), 'wanderStepsLeft must set compulsorySteps - 1 on new direction turn');

console.log('PASS: test_toggle_button_and_steps - Play/Pause label, colors, height, and steps per turn verified!');

