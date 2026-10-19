console.log('--- TESTING SMART POKEBALL SELECTION & FALLBACK ---');

class MockRadio {
    constructor(id, value, labelText, count, disabled = false) {
        this.tagName = 'INPUT';
        this.type = 'radio';
        this.id = id;
        this.value = value;
        this.checked = false;
        this.disabled = disabled;
        this.parentElement = { textContent: `${labelText} (${count})` };
        this.clicked = false;
    }
    click() {
        this.clicked = true;
        this.checked = true;
    }
    dispatchEvent(evt) {}
}

const pokeBall = new MockRadio('pokeball', 'pokeball', 'Poke Ball', 9);
const greatBall = new MockRadio('greatball', 'greatball', 'Great Ball', 10);
const ultraBall = new MockRadio('ultraball', 'ultraball', 'Ultra Ball', 3);
const masterBall = new MockRadio('masterball', 'masterball', 'Master Ball', 0, false);

const radios = [pokeBall, greatBall, ultraBall, masterBall];

function selectBestBall(radiosList) {
    // 1. If any valid ball is ALREADY checked, do not unclick it!
    const alreadyChecked = radiosList.find(r => {
        if (!r.checked || r.disabled) return false;
        const text = r.parentElement.textContent || '';
        return text.indexOf('(0)') === -1;
    });
    if (alreadyChecked) return alreadyChecked;

    // 2. Order of priority
    const priorities = ['master', 'ultra', 'great', 'poke'];

    for (const priority of priorities) {
        for (const radio of radiosList) {
            if (radio.disabled) continue;
            const text = (radio.parentElement.textContent || '').toLowerCase();
            // Reject any ball with (0) count!
            if (text.indexOf('(0)') !== -1) continue;

            const identifier = (radio.value + ' ' + radio.id + ' ' + text).toLowerCase();
            if (identifier.indexOf(priority) !== -1) {
                radio.click();
                return radio;
            }
        }
    }
    return null;
}

// Test 1: User has 0 Master Balls, 3 Ultra Balls. Should pick Ultra Ball!
const chosen1 = selectBestBall(radios);
console.log('[PASS] Test 1: Picked ball when Master Ball is (0):', chosen1.parentElement.textContent);
if (chosen1 === ultraBall) {
    console.log('[PASS] PASS: Ultra Ball selected because Master Ball has (0).');
} else {
    console.error('[FAIL] FAIL: Expected Ultra Ball!');
    process.exit(1);
}

// Test 2: User manually checks Poke Ball (9). Should NOT uncheck it!
pokeBall.checked = true;
ultraBall.checked = false;
const chosen2 = selectBestBall(radios);
console.log('[PASS] Test 2: Preserved user-selected ball:', chosen2.parentElement.textContent);
if (chosen2 === pokeBall) {
    console.log('[PASS] PASS: User manual choice was preserved without unclicking.');
} else {
    console.error('[FAIL] FAIL: User choice was overwritten!');
    process.exit(1);
}

// Test 3: Throw button matching with space
const mockThrowBtn = {
    tagName: 'BUTTON',
    value: '',
    textContent: 'THROW POKE BALL'
};

const allButtons = [mockThrowBtn];
const throwBtn = allButtons.find(b => {
    const text = ((b.value || '') + ' ' + (b.textContent || '')).toLowerCase();
    return text.indexOf('throw') !== -1 && text.indexOf('ball') !== -1;
});

console.log('[PASS] Test 3: Found "THROW POKE BALL" button:', throwBtn === mockThrowBtn);
if (!throwBtn) {
    console.error('[FAIL] FAIL: Throw button not found!');
    process.exit(1);
}

console.log('--- ALL SMART POKEBALL TESTS PASSED ---');
