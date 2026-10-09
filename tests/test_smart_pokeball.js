const assert = require('assert');

console.log('--- TESTING SMART POKEBALL SELECTION ---');

class MockRadio {
    constructor(id, value, labelText, count, disabled = false) {
        this.tagName = 'INPUT';
        this.type = 'radio';
        this.id = id;
        this.value = value;
        this.name = 'pokeball';
        this.checked = false;
        this.disabled = disabled;
        this.parentElement = {
            textContent: `${labelText} (${count})`,
            querySelector: () => count === 0 ? {} : null,
            style: {}
        };
        this.nextSibling = null;
        this.labels = [];
    }
    click() {
        this.checked = true;
    }
    dispatchEvent(evt) {}
}

function getRadioDescriptor(radio) {
    let desc = (radio.value || '') + ' ' + (radio.id || '') + ' ' + (radio.name || '') + ' ';
    if (radio.labels && radio.labels.length) {
        for (let l = 0; l < radio.labels.length; l++) {
            desc += ' ' + radio.labels[l].textContent;
        }
    }
    if (radio.parentElement) {
        desc += ' ' + radio.parentElement.textContent;
    }
    return desc.trim();
}

function isRadioUnavailable(radio, desc) {
    if (radio.disabled) return true;
    if (desc.indexOf('(0)') !== -1) return true;
    const parent = radio.parentElement;
    if (parent && (parent.querySelector('strike, del, s') || (parent.style && parent.style.textDecoration && parent.style.textDecoration.indexOf('line-through') !== -1))) {
        return true;
    }
    return false;
}

function selectBall(radioPool) {
    const ballRadios = [];
    for (let i = 0; i < radioPool.length; i++) {
        const r = radioPool[i];
        const desc = getRadioDescriptor(r);
        const dLower = desc.toLowerCase();
        ballRadios.push({ radio: r, desc: desc, dLower: dLower });
    }

    let selectedBall = null;
    let selectedBallName = '';

    // 1. Check if user already checked a valid ball
    for (let i = 0; i < ballRadios.length; i++) {
        const item = ballRadios[i];
        if (item.radio.checked && !isRadioUnavailable(item.radio, item.desc)) {
            selectedBall = item.radio;
            selectedBallName = item.desc;
            break;
        }
    }

    // 2. Select best available by priority
    if (!selectedBall) {
        const priorities = ['master', 'ultra', 'great', 'poke'];
        for (let p = 0; p < priorities.length; p++) {
            const priorityName = priorities[p];
            for (let i = 0; i < ballRadios.length; i++) {
                const item = ballRadios[i];
                if (isRadioUnavailable(item.radio, item.desc)) continue;
                if (item.dLower.indexOf(priorityName) !== -1) {
                    selectedBall = item.radio;
                    selectedBallName = item.desc;
                    selectedBall.click();
                    break;
                }
            }
            if (selectedBall) break;
        }
    }

    return { selectedBall, selectedBallName };
}

// Test case 1: 0 Master, 3 Ultra, 10 Great, 9 Poke
const pBall = new MockRadio('pb', '1', 'Poke Ball', 9);
const gBall = new MockRadio('gb', '2', 'Great Ball', 10);
const uBall = new MockRadio('ub', '3', 'Ultra Ball', 3);
const mBall = new MockRadio('mb', '4', 'Master Ball', 0);
const pool = [pBall, gBall, uBall, mBall];

const res1 = selectBall(pool);
console.log('Result 1 (Auto fallback):', res1.selectedBall.id, '->', res1.selectedBallName);
assert.strictEqual(res1.selectedBall, uBall, 'Should pick Ultra Ball when Master Ball is 0');

// Test case 2: User manually clicked Poke Ball
pBall.checked = true;
uBall.checked = false;
const res2 = selectBall(pool);
console.log('Result 2 (Preserve user click):', res2.selectedBall.id, '->', res2.selectedBallName);
assert.strictEqual(res2.selectedBall, pBall, 'Should preserve user-selected Poke Ball');

// Test case 3: User has Master Ball (1)
mBall.parentElement.textContent = 'Master Ball (1)';
mBall.parentElement.querySelector = () => null;
pBall.checked = false;
const res3 = selectBall(pool);
console.log('Result 3 (Master Ball available):', res3.selectedBall.id, '->', res3.selectedBallName);
assert.strictEqual(res3.selectedBall, mBall, 'Should pick Master Ball when available');

console.log('--- ALL SMART POKEBALL TESTS PASSED SUCCESSFULLY! ---');
