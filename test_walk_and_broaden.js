console.log('--- TESTING WALK PATTERNS & BROADENED TARGETS ---');

// 1. Test Walk Key Generator
const keys = [37, 38, 39, 40]; // 37=Left, 38=Up, 39=Right, 40=Down
const keyNames = { 37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down' };

function simulateWalk(mode, steps, stepsPerDirection = 6) {
    let stepCounter = 0;
    let wanderStepsLeft = 0;
    let lastWanderKey = 37;

    function getOppositeKey(k) {
        if (k === 37) return 39;
        if (k === 39) return 37;
        if (k === 38) return 40;
        if (k === 40) return 38;
        return 37;
    }

    const path = [];
    for (let i = 0; i < steps; i++) {
        let key;
        if (mode === "line_horizontal") {
            const isLeft = Math.floor(stepCounter / stepsPerDirection) % 2 === 0;
            key = isLeft ? 37 : 39;
            stepCounter++;
        } else if (mode === "line_vertical") {
            const isUp = Math.floor(stepCounter / stepsPerDirection) % 2 === 0;
            key = isUp ? 38 : 40;
            stepCounter++;
        } else if (mode === "patrol_square") {
            const dirIndex = Math.floor(stepCounter / stepsPerDirection) % 4;
            key = keys[dirIndex];
            stepCounter++;
        } else if (mode === "wander") {
            if (wanderStepsLeft <= 0) {
                wanderStepsLeft = 4; // fixed for test
                const available = [37, 38, 39, 40].filter(k => k !== getOppositeKey(lastWanderKey));
                lastWanderKey = available[0];
            }
            wanderStepsLeft--;
            key = lastWanderKey;
        }
        path.push(keyNames[key]);
    }
    return path;
}

const horizPath = simulateWalk("line_horizontal", 12, 6);
console.log('✔ Horizontal line path (12 steps):', horizPath.join(', '));
if (horizPath.slice(0, 6).every(d => d === 'Left') && horizPath.slice(6, 12).every(d => d === 'Right')) {
    console.log('✔ PASS: Horizontal pacing works correctly (6 Left, 6 Right).');
} else {
    console.error('❌ FAIL: Horizontal pacing failed.');
    process.exit(1);
}

const squarePath = simulateWalk("patrol_square", 24, 6);
console.log('✔ Large square path (24 steps):', squarePath.join(', '));
if (squarePath.slice(0, 6).every(d => d === 'Left') &&
    squarePath.slice(6, 12).every(d => d === 'Up') &&
    squarePath.slice(12, 18).every(d => d === 'Right') &&
    squarePath.slice(18, 24).every(d => d === 'Down')) {
    console.log('✔ PASS: Large square patrol works correctly (6 Left, 6 Up, 6 Right, 6 Down).');
} else {
    console.error('❌ FAIL: Large square patrol failed.');
    process.exit(1);
}

// 2. Test Broadened Target Matcher
const SPECIAL_MODIFIERS = [
    "shiny", "metallic", "ghostly", "dark", "shadow", "mirage", "chrome", "negative", "retro"
];

const SPECIAL_FORMS = [
    "mega", "gigantamax", "primal", "ultra"
];

const LEGENDARIES = [
    "articuno", "zapdos", "moltres", "mewtwo", "mew", "dialga", "palkia", "giratina",
    "xerneas", "yveltal", "zygarde", "solgaleo", "lunala", "zacian", "zamazenta", "koraidon", "miraidon"
];

const RARE_META = [
    "charizard", "dragonite", "tyranitar", "salamence", "metagross", "garchomp",
    "lucario", "greninja", "dragapult", "baxcalibur", "gholdengo", "eevee", "ditto"
];

function checkEncounter(encounterText, options = { special: true, forms: true, legendaries: true, meta: true }) {
    const text = encounterText.toLowerCase();

    // Check special variants
    if (options.special) {
        for (const mod of SPECIAL_MODIFIERS) {
            // Regex to check modifier as a prefix word e.g. "Chrome Charizard"
            const regex = new RegExp(`\\b${mod}\\s+([a-z0-9\\-':]+)`, 'i');
            const match = text.match(regex);
            if (match) {
                return `Special Variant: ${mod.toUpperCase()} ${match[1]}`;
            }
        }
    }

    // Check special forms (Mega, Gigantamax, Primal, Ultra)
    if (options.forms) {
        for (const form of SPECIAL_FORMS) {
            const regex = new RegExp(`\\b${form}\\s+([a-z0-9\\-':]+)`, 'i');
            const match = text.match(regex);
            if (match) {
                return `Special Form: ${form.toUpperCase()} ${match[1]}`;
            }
        }
    }

    // Check legendaries
    if (options.legendaries) {
        for (const leg of LEGENDARIES) {
            if (text.includes(leg)) {
                return `Legendary: ${leg}`;
            }
        }
    }

    // Check rare meta
    if (options.meta) {
        for (const meta of RARE_META) {
            if (text.includes(meta)) {
                return `Meta Favorite: ${meta}`;
            }
        }
    }

    return null;
}

const tests = [
    { text: "A wild Chrome Charizard appeared!", expected: "Special Variant: CHROME charizard" },
    { text: "A wild Retro Pikachu appeared!", expected: "Special Variant: RETRO pikachu" },
    { text: "A wild Mega Rayquaza appeared!", expected: "Special Form: MEGA rayquaza" },
    { text: "A wild Dialga appeared!", expected: "Legendary: dialga" },
    { text: "A wild Palkia appeared!", expected: "Legendary: palkia" },
    { text: "A wild Giratina appeared!", expected: "Legendary: giratina" },
    { text: "A wild Garchomp appeared!", expected: "Meta Favorite: garchomp" },
    { text: "A wild Rattata appeared!", expected: null }
];

let allPassed = true;
for (const t of tests) {
    const res = checkEncounter(t.text);
    if (res === t.expected) {
        console.log(`✔ Match: "${t.text}" => ${res}`);
    } else {
        console.error(`❌ Mismatch for "${t.text}": got "${res}", expected "${t.expected}"`);
        allPassed = false;
    }
}

if (allPassed) {
    console.log('--- ALL BROADENED TARGET TESTS PASSED ---');
} else {
    process.exit(1);
}
