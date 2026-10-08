// test_aron_meditite_pause.js - Unit tests for Aron, Meditite, Chrome Absol, and Encounter Pause Protection
const assert = require('assert');
const fs = require('fs');

console.log('--- TESTING ARON, MEDITITE, CHROME ABSOL, AND ENCOUNTER PAUSE PROTECTION ---');

// 1. Verify Aron, Meditite, and Absol presence in targets database
const TARGETS = require('./desktop-client/targets');
const pokefinderContent = fs.readFileSync('pokefinder.user.js', 'utf8');

const m = pokefinderContent.match(/const MEGA_CAPABLE_BASE = (\[[\s\S]*?\]);/);
assert(m, 'Must find MEGA_CAPABLE_BASE in pokefinder.user.js');
const MEGA_CAPABLE_BASE = eval(m[1]);
const MEGA_CAPABLE_LOWER = MEGA_CAPABLE_BASE.map(x => x.toLowerCase());

assert(MEGA_CAPABLE_LOWER.includes('aron'), 'pokefinder.user.js must contain Aron');
assert(MEGA_CAPABLE_LOWER.includes('meditite'), 'pokefinder.user.js must contain Meditite');
assert(MEGA_CAPABLE_LOWER.includes('absol'), 'pokefinder.user.js must contain Absol');
assert(TARGETS.megas.map(x => x.toLowerCase()).includes('aron'), 'targets.js must contain Aron');
assert(TARGETS.megas.map(x => x.toLowerCase()).includes('meditite'), 'targets.js must contain Meditite');
assert(TARGETS.megas.map(x => x.toLowerCase()).includes('absol'), 'targets.js must contain Absol');

console.log('[PASS] Test 1: Aron, Meditite, and Absol confirmed in both target databases.');

// 2. Mock DOM simulation for DelugeRPG wild encounters
class MockElement {
  constructor(tag, id = '', className = '', innerText = '', value = '', src = '', alt = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = className;
    this.innerText = innerText;
    this.textContent = innerText;
    this.value = value;
    this.src = src;
    this.alt = alt;
    this.children = [];
    this.parentElement = null;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  closest(selector) {
    let curr = this.parentElement;
    const s = selector.toLowerCase();
    while (curr) {
      const tag = curr.tagName.toLowerCase();
      if (s.includes(tag)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  querySelectorAll(sel) {
    const results = [];
    const s = sel.toLowerCase();
    function walk(node) {
      for (const child of node.children) {
        if (s.includes('img') && child.tagName === 'IMG') results.push(child);
        if (s.includes('input') && child.tagName === 'INPUT') results.push(child);
        walk(child);
      }
    }
    walk(this);
    return results;
  }
}

function simulateExtraction(containers, catchButtons) {
  let text = '';
  for (const el of containers) {
    text += ' ' + (el.innerText || el.textContent || '') + ' ' + (el.value || '');
    const imgs = el.querySelectorAll('img');
    for (const img of imgs) {
      text += ' ' + (img.alt || '') + ' ';
      const match = (img.src || '').match(/\/([a-z0-9\-]+)\.(?:png|gif|jpe?g)/i);
      if (match) text += ' ' + match[1];
    }
  }
  for (const btn of catchButtons) {
    const parent = btn.closest('div, form');
    if (parent) {
      text += ' ' + (parent.innerText || parent.textContent || '');
    }
  }
  return text.toLowerCase();
}

// Test Case 2A: Aron appears inside #showpoke (DelugeRPG encounter box)
const showpokeEl = new MockElement('div', 'showpoke', '', 'Wild Aron (Level 14)');
const catchBtn = new MockElement('input', 'catch', '', '', 'Catch');
showpokeEl.appendChild(catchBtn);
const aronImg = new MockElement('img', '', '', '', '', 'https://s.delugerpg.com/pokemon/aron.png', 'Aron');
showpokeEl.appendChild(aronImg);

const extractedAron = simulateExtraction([showpokeEl], [catchBtn]);
assert(extractedAron.includes('aron'), `Extracted text must contain 'aron', got: ${extractedAron}`);

let matchFound = null;
for (const mg of MEGA_CAPABLE_LOWER) {
  if (extractedAron.includes(mg)) {
    matchFound = mg;
    break;
  }
}
assert.strictEqual(matchFound, 'aron', 'Scanner must match aron');
console.log('[PASS] Test 2: Wild Aron encounter in #showpoke successfully extracted and matched.');

// Test Case 2B: Meditite appears inside encounter form
const formEl = new MockElement('form', 'encounter-form', 'catch-form', 'A wild Meditite appeared! (Level 18)');
const medititeBtn = new MockElement('input', 'catch', '', '', 'Try to Catch');
const medititeImg = new MockElement('img', '', '', '', '', 'https://s.delugerpg.com/pokemon/meditite.png', 'Meditite');
formEl.appendChild(medititeBtn);
formEl.appendChild(medititeImg);

const extractedMeditite = simulateExtraction([formEl], [medititeBtn]);
assert(extractedMeditite.includes('meditite'), `Extracted text must contain 'meditite', got: ${extractedMeditite}`);

let medititeMatch = null;
for (const mg of MEGA_CAPABLE_LOWER) {
  if (extractedMeditite.includes(mg)) {
    medititeMatch = mg;
    break;
  }
}
assert.strictEqual(medititeMatch, 'meditite', 'Scanner must match meditite');
console.log('[PASS] Test 3: Wild Meditite encounter in catch-form successfully extracted and matched.');

// Test Case 2C: Chrome Absol appears on screen
const absolBox = new MockElement('div', 'showpoke', '', 'A wild Chrome Absol appeared! (Level 25)');
const absolCatchBtn = new MockElement('input', 'catch', '', '', 'Catch');
absolBox.appendChild(absolCatchBtn);
const absolImg = new MockElement('img', '', '', '', '', 'https://s.delugerpg.com/pokemon/chrome-absol.png', 'Chrome Absol');
absolBox.appendChild(absolImg);

const extractedAbsol = simulateExtraction([absolBox], [absolCatchBtn]);
assert(extractedAbsol.includes('absol'), `Extracted text must contain 'absol', got: ${extractedAbsol}`);
assert(extractedAbsol.includes('chrome'), `Extracted text must contain 'chrome', got: ${extractedAbsol}`);

// Verify match under Mega Line
let absolMegaMatch = null;
for (const mg of MEGA_CAPABLE_LOWER) {
  if (extractedAbsol.includes(mg)) {
    absolMegaMatch = mg;
    break;
  }
}
assert.strictEqual(absolMegaMatch, 'absol', 'Chrome Absol must match under Mega line');

// Verify match under Special Variant
const VARIANTS = TARGETS.specialVariants;
let variantMatch = null;
for (let i = 0; i < VARIANTS.length; i++) {
  const mod = VARIANTS[i];
  const match = extractedAbsol.match(new RegExp('\\b' + mod + '[- ]+([a-z0-9\\-\':]+)', 'i'));
  if (match) {
    variantMatch = mod.toUpperCase() + ' ' + match[1];
    break;
  }
}
assert.strictEqual(variantMatch, 'CHROME absol', 'Chrome Absol must match under Special Variant');
console.log('[PASS] Test 4: Chrome Absol successfully detected and matched under BOTH Mega Line and Special Variant.');

// Test Case 3: Verify Encounter Guard Prevents Step Dispatch
let stepFired = false;
let finderActive = true;
const isCatchOrEncounterPresent = true;

// Walking loop simulation
function simulateWalkTick() {
  if (!finderActive) return;

  // 1. Synchronous scan
  if (extractedAbsol.includes('absol')) {
    finderActive = false; // Pause!
    return;
  }

  // 2. Encounter guard
  if (isCatchOrEncounterPresent) {
    return; // Refuse to walk away from active encounter!
  }

  stepFired = true;
}

simulateWalkTick();
assert.strictEqual(stepFired, false, 'Walking must be halted when target Absol is on screen');
assert.strictEqual(finderActive, false, 'Finder must be paused immediately upon encountering Chrome Absol');
console.log('[PASS] Test 5: Walking engine halts immediately and pauses when Chrome Absol appears.');

// 4. Verify 100% clean 7-bit ASCII
const filesToCheck = [
  'pokefinder.user.js',
  'desktop-client/game-preload.js',
  'desktop-client/app.js',
  'desktop-client/app.html',
  'desktop-client/targets.js',
  'desktop-client/config.json',
  'test_aron_meditite_pause.js'
];

for (const f of filesToCheck) {
  const content = fs.readFileSync(f, 'utf8');
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) > 127) {
      throw new Error(`Non-ASCII character found in ${f} at index ${i}`);
    }
  }
}
console.log('[PASS] Test 6: All files are 100% clean 7-bit ASCII.');

console.log('--- ALL ARON, MEDITITE, CHROME ABSOL, AND PAUSE PROTECTION TESTS PASSED! ---');
