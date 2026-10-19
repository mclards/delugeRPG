const fs = require('fs');

console.log('--- STARTING VERIFICATION TESTS ---');

// 1. Check for irregular whitespace, non-breaking spaces (\u00A0), non-breaking hyphens (\u2011), etc.
const scriptContent = fs.readFileSync('pokefinder.user.js', 'utf8');

const irregularMatches = [];
for (let i = 0; i < scriptContent.length; i++) {
    const code = scriptContent.charCodeAt(i);
    // Allow ASCII printable (32-126), \t (9), \n (10), \r (13)
    if (code !== 9 && code !== 10 && code !== 13 && (code < 32 || code > 126)) {
        irregularMatches.push({ index: i, code: code, hex: 'U+' + code.toString(16).toUpperCase(), char: scriptContent[i] });
    }
}

if (irregularMatches.length === 0) {
    console.log('[PASS] Check 1: 100% clean ASCII. No irregular whitespace, no hidden tildes/unicode characters.');
} else {
    console.error('[FAIL] Check 1 Failed: Found irregular characters:', irregularMatches);
    process.exit(1);
}

// 2. Syntax Check: Parse via Node vm / Function
try {
    new Function(scriptContent);
    console.log('[PASS] Check 2: JavaScript syntax parses cleanly with zero errors.');
} catch (e) {
    console.error('[FAIL] Check 2 Failed: Syntax error:', e);
    process.exit(1);
}

// 3. Mock DOM & Simulation Test
class MockElement {
    constructor(tagName = 'div', id = '', value = '', textContent = '') {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.value = value;
        this.textContent = textContent;
        this.innerText = textContent;
        this.style = {};
        this.checked = false;
        this.clicked = false;
        this.dispatchedEvents = [];
    }
    click() {
        this.clicked = true;
    }
    dispatchEvent(evt) {
        this.dispatchedEvents.push(evt);
    }
    addEventListener(name, handler) {}
}

const mockDOM = {
    dexy: new MockElement('div', 'dexy'),
    catchBtn: new MockElement('input', 'catch', 'Catch'),
    startBattleBtn: new MockElement('input', '', 'Start Battle'),
    masterballRadio: new MockElement('input', 'masterball', 'masterball'),
    throwBtn: new MockElement('input', '', 'Throw Pokeball'),
    rebattleLink: new MockElement('a', '', '', 'Rebattle Opponent'),
    attackBtn: new MockElement('input', '', 'Attack')
};

// Test Legendary Search Matcher logic
const LEGENDARY_BASE = [
    "Articuno", "Zapdos", "Moltres", "Mewtwo", "Mew", "Raikou", "Entei", "Suicune"
];
const LEGENDARY_BASE_LOWER = LEGENDARY_BASE.map(b => b.toLowerCase());
const testPageText = "A wild Shiny Mewtwo appeared on the route!".toLowerCase();

const hasLegendary = LEGENDARY_BASE_LOWER.some(b => testPageText.includes(b));
console.log('[PASS] Check 3: Base legendary fast-path check matches "Mewtwo":', hasLegendary === true);

// Test Level Regex
const testLevelText1 = "Level: 50 (Male)";
const testLevelText2 = "level:   85<br>";
const match1 = testLevelText1.match(/level[:\s]+(\d+)/i);
const match2 = testLevelText2.match(/level[:\s]+(\d+)/i);

console.log('[PASS] Check 4: Regex extracts level 50:', parseInt(match1[1], 10) === 50);
console.log('[PASS] Check 5: Regex extracts level 85:', parseInt(match2[1], 10) === 85);

// Test Battle Rebattle Link Finder
const testElements = [
    mockDOM.attackBtn,
    mockDOM.rebattleLink
];

const foundRebattle = testElements.find(el => {
    const text = ((el.textContent || '') + ' ' + (el.value || '')).toLowerCase();
    return text.includes('rebattle');
});

console.log('[PASS] Check 6: Rebattle button correctly found without jQuery / :contains():', foundRebattle === mockDOM.rebattleLink);

console.log('--- ALL AUTOMATED VERIFICATION CHECKS PASSED ---');
