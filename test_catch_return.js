console.log('--- TESTING CATCH RETURN & NAVBAR ISOLATION ---');

// Mock elements
class MockEl {
    constructor(tagName, text, href = '', value = '') {
        this.tagName = tagName.toUpperCase();
        this.textContent = text;
        this.href = href;
        this.value = value;
        this.clicked = false;
    }
    getAttribute(attr) {
        if (attr === 'href') return this.href;
        return '';
    }
    click() {
        this.clicked = true;
    }
}

// 1. Simulate Navbar with <a href="/map">Maps</a> and other maps
const navbarMapLink = new MockEl('a', 'Maps', '/map');
const otherMapLink = new MockEl('a', 'Route 2', '/map/2');
const startBattleBtn = new MockEl('input', '', '', 'Start Battle');
const masterballRadio = new MockEl('input', '', '', 'masterball');
const throwBtn = new MockEl('input', '', '', 'Throw Pokeball');
const returnToMapBtn = new MockEl('a', 'Return to Map', '/map');

const elementsDuringBattle = [
    navbarMapLink,
    otherMapLink,
    startBattleBtn,
    masterballRadio,
    throwBtn
];

// Test the return button matcher:
function findReturnButton(elements) {
    return elements.find(el => {
        const text = ((el.textContent || '') + ' ' + (el.value || '')).trim().toLowerCase();
        // MUST be specifically "return to map", NEVER just "maps" or generic "/map" href!
        return text === 'return to map' || text.indexOf('return to map') !== -1;
    });
}

// Test 1: During battle (before throw), does it match navbar?
const matchedBeforeThrow = findReturnButton(elementsDuringBattle);
console.log('✔ Test 1: findReturnButton during battle returns null (no navbar false positive):', matchedBeforeThrow === undefined);
if (matchedBeforeThrow) {
    console.error('❌ Failed Test 1: False positive matched navbar link!');
    process.exit(1);
}

// Test 2: After throw, with actual "Return to Map" button present
const elementsAfterBattle = [
    navbarMapLink,
    returnToMapBtn
];

const matchedAfterThrow = findReturnButton(elementsAfterBattle);
console.log('✔ Test 2: findReturnButton matches "Return to Map" button correctly:', matchedAfterThrow === returnToMapBtn);
if (matchedAfterThrow !== returnToMapBtn) {
    console.error('❌ Failed Test 2: Did not match Return to Map button!');
    process.exit(1);
}

console.log('--- ALL TESTS PASSED CLEANLY ---');
