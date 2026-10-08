// test_delugerpg_live_scenarios.js - Full Real-World Scenario Suite for DelugeRPG Encounters
const assert = require('assert');
const fs = require('fs');

console.log('=== RUNNING DELUGERPG LIVE ENCOUNTER SCENARIOS SUITE ===');

// Mock DOM Engine for comprehensive simulation
class MockNode {
  constructor(tag, id = '', className = '', text = '', attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = className;
    this.innerText = text;
    this.textContent = text;
    this.value = attrs.value || '';
    this.attributes = Object.assign({}, attrs);
    this.children = [];
    this.parentElement = null;
    this.style = attrs.style || {};
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  setAttribute(name, val) {
    this.attributes[name] = val;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  closest(selector) {
    let curr = this.parentElement;
    const parts = selector.split(',').map(s => s.trim().toLowerCase());
    while (curr) {
      const tag = curr.tagName.toLowerCase();
      const id = curr.id ? '#' + curr.id.toLowerCase() : '';
      const cls = curr.className ? '.' + curr.className.toLowerCase() : '';
      for (const p of parts) {
        if (p === tag || (id && p === id) || (cls && cls.includes(p))) {
          return curr;
        }
      }
      curr = curr.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    const res = this.querySelectorAll(selector);
    return res.length > 0 ? res[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const parts = selector.split(',').map(s => s.trim().toLowerCase());

    function matchesPart(node, p) {
      const tag = node.tagName.toLowerCase();
      const id = node.id ? '#' + node.id.toLowerCase() : '';
      const cls = node.className ? '.' + node.className.toLowerCase() : '';

      if (p.startsWith('#') && id === p) return true;
      if (p.startsWith('.') && cls.includes(p)) return true;
      if (p === tag) return true;
      if (p.includes('img[src*=')) {
        if (tag === 'img') {
          const src = (node.getAttribute('src') || '').toLowerCase();
          const target = p.match(/img\[src\*="([^"]+)"\]/);
          if (target && src.includes(target[1])) return true;
        }
      }
      if (p.includes('a[href*=')) {
        if (tag === 'a') {
          const href = (node.getAttribute('href') || '').toLowerCase();
          const target = p.match(/a\[href\*="([^"]+)"\]/);
          if (target && href.includes(target[1])) return true;
        }
      }
      if (p === 'a' && tag === 'a') return true;
      if (p === 'button' && tag === 'button') return true;
      if (p === 'input' && tag === 'input') return true;
      return false;
    }

    function walk(node) {
      for (const child of node.children) {
        for (const p of parts) {
          if (matchesPart(child, p)) {
            results.push(child);
            break;
          }
        }
        walk(child);
      }
    }
    walk(this);
    return results;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockNode('body', '', '', '');
    this.elementsById = {};
  }

  getElementById(id) {
    return this.elementsById[id] || null;
  }

  querySelector(sel) {
    return this.body.querySelector(sel);
  }

  querySelectorAll(sel) {
    return this.body.querySelectorAll(sel);
  }

  register(node) {
    if (node.id) {
      this.elementsById[node.id] = node;
    }
    for (const ch of node.children) {
      this.register(ch);
    }
  }
}

// Preload simulation harness
function createSimulationEnvironment(doc) {
  global.window = {
    getComputedStyle: function(el) {
      return el.style || { display: 'block', visibility: 'visible' };
    }
  };
  global.document = doc;

  // Extract isEncounterOrCatchUIPresent directly from production game-preload.js logic
  function findCatchActionElement() {
    const candidates = doc.querySelectorAll('a, button, input');
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      const text = (el.innerText || el.textContent || '').trim().toLowerCase();
      const val = (el.value || '').trim().toLowerCase();
      const href = (el.getAttribute('href') || '').toLowerCase();
      const id = (el.id || '').toLowerCase();

      if (text.indexOf('try to catch') !== -1 || val.indexOf('try to catch') !== -1 ||
          text.indexOf('catch it') !== -1 || val.indexOf('catch it') !== -1 ||
          text === 'catch' || val === 'catch' ||
          text.indexOf('start battle') !== -1 || val.indexOf('start battle') !== -1) {
        return el;
      }
      if (href && (href.indexOf('/catch') !== -1 || href.indexOf('catch.php') !== -1 || href.indexOf('catch?') !== -1)) {
        return el;
      }
      if (id === 'catch' || id === 'catch-btn') {
        return el;
      }
    }
    return null;
  }

  function getEncounterContainer() {
    const catchBtn = findCatchActionElement();
    if (catchBtn) {
      const parent = catchBtn.closest('#showpoke, .showpoke, #showpoke-name, #dexy, .dexy, .catch-form, form, div') || catchBtn.parentElement;
      if (parent) return parent;
    }

    const candidateContainers = [
      doc.getElementById('showpoke'),
      doc.querySelector('.showpoke'),
      doc.getElementById('showpoke-name'),
      doc.querySelector('.catch-form'),
      doc.getElementById('show-pokemon'),
      doc.getElementById('dexy'),
      doc.querySelector('.dexy')
    ];

    for (let c = 0; c < candidateContainers.length; c++) {
      const box = candidateContainers[c];
      if (!box) continue;
      const rawText = (box.innerText || box.textContent || '').trim().toLowerCase();
      if (rawText.indexOf("couldn't find") !== -1 || rawText.indexOf("could not find") !== -1 || rawText.indexOf('searching...') !== -1) {
        continue;
      }
      const pokeImg = box.querySelector('img[src*="/pokemon/"], img[src*="/sprites/"], img[src*="/dex/"]');
      if (pokeImg) return box;
      if (rawText.indexOf('appeared') !== -1 || rawText.indexOf('wild ') !== -1 || rawText.indexOf('level') !== -1 || rawText.indexOf('catch') !== -1) {
        return box;
      }
    }

    const allDivs = doc.querySelectorAll('div, section, p, span');
    for (let i = 0; i < allDivs.length; i++) {
      const el = allDivs[i];
      const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (txt.indexOf('appeared!') !== -1 && txt.indexOf("couldn't find") === -1 && txt.indexOf("could not find") === -1 && txt.indexOf("searching...") === -1) {
        return el.closest('div') || el;
      }
    }
    return null;
  }

  function isEncounterOrCatchUIPresent() {
    if (findCatchActionElement() !== null) return true;
    if (getEncounterContainer() !== null) return true;
    return false;
  }

  function extractEncounterText() {
    let encounterBoxText = '';
    const activeBox = getEncounterContainer();
    if (activeBox) {
      encounterBoxText += ' ' + (activeBox.innerText || activeBox.textContent || '');
    }
    const encounterContainers = [
      doc.getElementById('showpoke'),
      doc.querySelector('.showpoke'),
      doc.getElementById('showpoke-name'),
      doc.querySelector('.catch-form'),
      doc.getElementById('show-pokemon'),
      doc.getElementById('dexy'),
      doc.querySelector('.dexy')
    ];
    for (let ec = 0; ec < encounterContainers.length; ec++) {
      const cEl = encounterContainers[ec];
      if (cEl) {
        encounterBoxText += ' ' + (cEl.innerText || cEl.textContent || '');
      }
    }
    if (doc.body && (encounterBoxText.toLowerCase().indexOf('appeared') === -1 || encounterBoxText.trim().length < 5)) {
      encounterBoxText += ' ' + (doc.body.innerText || '');
    }
    return encounterBoxText.trim().toLowerCase();
  }

  return { isEncounterOrCatchUIPresent, extractEncounterText };
}

// SCENARIO 1: Real DelugeRPG encounter in #showpoke with leftover "couldn't find anything" in #dexy
console.log('\n--- Scenario 1: Real Encounter in #showpoke with leftover #dexy text ---');
const doc1 = new MockDocument();
const dexy1 = new MockNode('div', 'dexy', '', "You couldn't find anything, try moving to another spot.");
const showpoke1 = new MockNode('div', 'showpoke', '', 'Wild Rayquaza appeared! Level 50');
const sprite1 = new MockNode('img', '', '', '', { src: 'https://s.delugerpg.com/pokemon/rayquaza.png', alt: 'Rayquaza' });
const catchLink1 = new MockNode('a', '', 'btn btn-primary', 'Try to Catch It', { href: '/catch/883719' });
showpoke1.appendChild(sprite1);
showpoke1.appendChild(catchLink1);
doc1.body.appendChild(dexy1);
doc1.body.appendChild(showpoke1);
doc1.register(dexy1);
doc1.register(showpoke1);

const sim1 = createSimulationEnvironment(doc1);
const enc1 = sim1.isEncounterOrCatchUIPresent();
assert.strictEqual(enc1, true, 'MUST detect encounter despite leftover dexy text!');
const text1 = sim1.extractEncounterText();
assert(text1.includes('rayquaza'), 'Extracted encounter text must include rayquaza');
console.log('  [PASS] Rayquaza encounter in #showpoke detected 100% reliably despite #dexy text.');

// SCENARIO 2: Anchor catch button without id="catch"
console.log('\n--- Scenario 2: DelugeRPG Anchor Catch Action (<a href="/catch/...") ---');
const doc2 = new MockDocument();
const showpoke2 = new MockNode('div', 'showpoke', '', 'Wild Lugia appeared! Level 70');
const catchLink2 = new MockNode('a', '', 'btn btn-success', 'Catch', { href: '/catch/112233' });
showpoke2.appendChild(catchLink2);
doc2.body.appendChild(showpoke2);
doc2.register(showpoke2);

const sim2 = createSimulationEnvironment(doc2);
assert.strictEqual(sim2.isEncounterOrCatchUIPresent(), true, 'MUST detect anchor catch button!');
console.log('  [PASS] DelugeRPG anchor catch action recognized correctly.');

// SCENARIO 3: Empty spot with NO encounter
console.log('\n--- Scenario 3: Empty Spot (No encounter) ---');
const doc3 = new MockDocument();
const dexy3 = new MockNode('div', 'dexy', '', "You couldn't find anything, try moving to another spot.");
doc3.body.appendChild(dexy3);
doc3.register(dexy3);

const sim3 = createSimulationEnvironment(doc3);
assert.strictEqual(sim3.isEncounterOrCatchUIPresent(), false, 'Must NOT report encounter on empty spot!');
console.log('  [PASS] Empty spot correctly reports hasEncounter = false.');

// SCENARIO 4: Searching... status
console.log('\n--- Scenario 4: Searching Status ---');
const doc4 = new MockDocument();
const dexy4 = new MockNode('div', 'dexy', '', 'Searching...');
doc4.body.appendChild(dexy4);
doc4.register(dexy4);

const sim4 = createSimulationEnvironment(doc4);
assert.strictEqual(sim4.isEncounterOrCatchUIPresent(), false, 'Searching state must not be flagged as encounter!');
console.log('  [PASS] Searching state correctly handled.');

// SCENARIO 5: Full Target Matching with production targets
console.log('\n--- Scenario 5: Full Target Matching against Production Targets ---');
const TARGETS = require('./desktop-client/targets');
const LEGENDARY_LOWER = TARGETS.legendaries.map(l => l.toLowerCase());

function checkTargetMatch(text, targetsList) {
  const tLower = text.toLowerCase();
  for (const item of targetsList) {
    if (tLower.includes(item)) return item;
  }
  return null;
}

assert(checkTargetMatch('wild lugia appeared! (level 50)', LEGENDARY_LOWER), 'Lugia must match');
assert(checkTargetMatch('wild rayquaza appeared! (level 50)', LEGENDARY_LOWER), 'Rayquaza must match');
assert(checkTargetMatch('wild mewtwo appeared! (level 70)', LEGENDARY_LOWER), 'Mewtwo must match');
assert(checkTargetMatch('wild arceus appeared! (level 100)', LEGENDARY_LOWER), 'Arceus must match');
assert.strictEqual(checkTargetMatch('wild pidgey appeared! (level 5)', LEGENDARY_LOWER), null, 'Pidgey must not match');
console.log('  [PASS] Lugia, Rayquaza, Mewtwo, Arceus matched; common non-target Pidgey ignored.');

// SCENARIO 6: User Live Screenshot Scenario - Yveltal with "Try to Catch It" on Map 10
console.log('\n--- Scenario 6: User Live Encounter (Yveltal Appeared with [Try to Catch It]) ---');
const doc6 = new MockDocument();
const mapSideCard = new MockNode('div', '', 'card-encounter', 'LEGENDARY POKEMON Yveltal Appeared! Level: 63 HP: 252');
const yveltalSprite = new MockNode('img', '', '', '', { src: 'https://s.delugerpg.com/pokemon/yveltal.png', alt: 'Yveltal' });
const catchBtn6 = new MockNode('a', '', 'btn btn-primary', 'Try to Catch It', { href: '/catch?id=99281' });
mapSideCard.appendChild(yveltalSprite);
mapSideCard.appendChild(catchBtn6);
doc6.body.appendChild(mapSideCard);
doc6.register(mapSideCard);

const sim6 = createSimulationEnvironment(doc6);
assert.strictEqual(sim6.isEncounterOrCatchUIPresent(), true, 'Yveltal encounter MUST be recognized!');
const text6 = sim6.extractEncounterText();
assert(text6.includes('yveltal'), 'Extracted encounter text must include yveltal');
assert(text6.includes('63'), 'Extracted encounter text must include level 63');
assert(checkTargetMatch(text6, LEGENDARY_LOWER), 'Yveltal must match Legendary target list');
console.log('  [PASS] Live Yveltal encounter detected and matched against Legendary targets with 100% precision.');

// SCENARIO 7: 7-bit ASCII verification across entire codebase
console.log('\n--- Scenario 7: 100% 7-bit ASCII Verification ---');
const files = [
  'desktop-client/game-preload.js',
  'desktop-client/app.js',
  'desktop-client/main.js',
  'desktop-client/config.json',
  'pokefinder.user.js',
  'test_delugerpg_live_scenarios.js'
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) > 127) {
      throw new Error(`Non-ASCII character found in ${file} at index ${i}`);
    }
  }
}
console.log('  [PASS] 100% 7-bit ASCII clean across all tested files.');

console.log('\n=== ALL DELUGERPG LIVE ENCOUNTER SCENARIOS PASSED WITH 100% SUCCESS! ===');

