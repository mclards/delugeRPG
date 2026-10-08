const fs = require('fs');
const assert = require('assert');

console.log('--- TESTING HERACROSS AND COMPREHENSIVE MEGA ENCOUNTER EXTRACTION ---');

class MockNode {
    constructor(tagName, attrs = {}, textContent = '') {
        this.tagName = tagName.toUpperCase();
        this.attrs = attrs;
        this.id = attrs.id || '';
        this.value = attrs.value || '';
        this.alt = attrs.alt || '';
        this.title = attrs.title || '';
        this.src = attrs.src || '';
        this.textContent = textContent;
        this.innerText = textContent;
        this.children = [];
    }
    appendChild(child) {
        this.children.push(child);
        return child;
    }
    querySelectorAll(selector) {
        const results = [];
        function walk(node) {
            for (const c of node.children) {
                if (selector.includes('img') && c.tagName === 'IMG') results.push(c);
                if (selector.includes('input') && c.tagName === 'INPUT') results.push(c);
                if (selector.includes('button') && c.tagName === 'BUTTON') results.push(c);
                if (selector.includes('a') && c.tagName === 'A') results.push(c);
                walk(c);
            }
        }
        walk(this);
        return results;
    }
}

// Fixed robust extraction logic
function extractEncounterText(dexyElem, catchElements = []) {
    let pageText = '';
    if (dexyElem) {
        pageText += ' ' + (dexyElem.innerText || dexyElem.textContent || '');
        const imgs = dexyElem.querySelectorAll('img');
        for (let i = 0; i < imgs.length; i++) {
            pageText += ' ' + (imgs[i].alt || '') + ' ' + (imgs[i].title || '') + ' ';
            const src = imgs[i].src || '';
            const match = src.match(/\/([a-z0-9\-]+)\.(?:png|gif|jpe?g)/i);
            if (match) pageText += ' ' + match[1];
        }
        const inputs = dexyElem.querySelectorAll('input, button, a');
        for (let i = 0; i < inputs.length; i++) {
            pageText += ' ' + (inputs[i].value || '') + ' ' + (inputs[i].textContent || '');
        }
    }

    for (let c = 0; c < catchElements.length; c++) {
        const el = catchElements[c];
        pageText += ' ' + (el.innerText || el.textContent || '') + ' ' + (el.value || '');
        const imgs = el.querySelectorAll('img');
        for (let i = 0; i < imgs.length; i++) {
            pageText += ' ' + (imgs[i].alt || '') + ' ' + (imgs[i].title || '') + ' ';
            const match = (imgs[i].src || '').match(/\/([a-z0-9\-]+)\.(?:png|gif|jpe?g)/i);
            if (match) pageText += ' ' + match[1];
        }
        const inputs = el.querySelectorAll('input, button, a');
        for (let i = 0; i < inputs.length; i++) {
            pageText += ' ' + (inputs[i].value || '') + ' ' + (inputs[i].textContent || '');
        }
    }

    return pageText.trim().toLowerCase();
}

const TARGETS = require('./desktop-client/targets');
const MEGAS_LOWER = TARGETS.megas.map(m => m.toLowerCase());
const LEGENDARY_LOWER = TARGETS.legendaries.map(l => l.toLowerCase());
const FORMS = TARGETS.specialForms;

function scanTarget(textLower) {
    // 1. Special Forms
    for (let j = 0; j < FORMS.length; j++) {
        const form = FORMS[j];
        const match = textLower.match(new RegExp('\\b' + form + '\\s+([a-z0-9\\-\':]+)', 'i'));
        if (match) return 'Special Form: ' + form.toUpperCase() + ' ' + match[1];
    }
    // 2. Mega families
    for (let mg = 0; mg < MEGAS_LOWER.length; mg++) {
        const megaTarget = MEGAS_LOWER[mg];
        if (textLower.indexOf(megaTarget) !== -1) {
            return 'Mega Line: ' + TARGETS.megas[mg];
        }
    }
    // 3. Legendaries
    for (let k = 0; k < LEGENDARY_LOWER.length; k++) {
        const leg = LEGENDARY_LOWER[k];
        if (textLower.indexOf(leg) !== -1) {
            return 'Legendary: ' + TARGETS.legendaries[k];
        }
    }
    return null;
}

// Test Case 1: Heracross as image with alt="Normal Heracross" (no text in dexy)
const dexy1 = new MockNode('div', { id: 'dexy' }, 'Level: 25');
dexy1.appendChild(new MockNode('img', { alt: 'Normal Heracross', src: 'https://img.delugerpg.com/pokemon/regular/heracross.png' }));
const text1 = extractEncounterText(dexy1);
const match1 = scanTarget(text1);
console.log('✔ Test 1 (Image alt/src Heracross):', match1);
assert.strictEqual(match1, 'Mega Line: Heracross', 'Must detect Heracross from image alt/src');

// Test Case 2: Heracross in catch button value inside form
const dexy2 = new MockNode('div', { id: 'dexy' }, '');
const catchForm = new MockNode('form', { action: '/catch/123' });
catchForm.appendChild(new MockNode('input', { type: 'submit', value: 'Catch Heracross' }));
const text2 = extractEncounterText(dexy2, [catchForm]);
const match2 = scanTarget(text2);
console.log('✔ Test 2 (Catch button Heracross):', match2);
assert.strictEqual(match2, 'Mega Line: Heracross', 'Must detect Heracross from catch button');

// Test Case 3: Other Mega-capable Pokémon (Pinsir, Kangaskhan, Mawile, Lucario)
const testMegaSpecies = ['Pinsir', 'Kangaskhan', 'Mawile', 'Absol', 'Riolu', 'Lucario', 'Larvitar', 'Tyranitar', 'Gible', 'Garchomp'];
for (const species of testMegaSpecies) {
    const d = new MockNode('div', { id: 'dexy' }, `A wild ${species} appeared!`);
    const t = extractEncounterText(d);
    const m = scanTarget(t);
    assert(m && m.includes(species), `Must detect ${species}`);
}
console.log(`✔ Test 3 (All tested Mega-capable species matched): ${testMegaSpecies.join(', ')}`);

// Test Case 4: Non-Mega regular Pokémon must NOT match
const nonMegas = ['Mankey', 'Primeape', 'Pawniard', 'Charcadet', 'Tinkatink', 'Rattata', 'Zorua'];
for (const species of nonMegas) {
    const d = new MockNode('div', { id: 'dexy' }, `A wild ${species} appeared!`);
    const t = extractEncounterText(d);
    const m = scanTarget(t);
    assert.strictEqual(m, null, `${species} must NOT match`);
}
console.log(`✔ Test 4 (Non-Mega simple Pokémon safely ignored): ${nonMegas.join(', ')}`);

console.log('--- ALL HERACROSS AND MEGA ENCOUNTER EXTRACTION TESTS PASSED! ---');

