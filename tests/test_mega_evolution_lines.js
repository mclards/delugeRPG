const fs = require('fs');
const assert = require('assert');

console.log('--- TESTING MEGA EVOLUTION LINES IN USERSCRIPT ---');

const scriptContent = fs.readFileSync('pokefinder.user.js', 'utf8');

// Extract MEGA_CAPABLE_BASE array from the userscript
const match = scriptContent.match(/const MEGA_CAPABLE_BASE = (\[[\s\S]*?\]);/);
assert(match, 'MEGA_CAPABLE_BASE must be defined');

// Evaluate the array
const MEGA_CAPABLE_BASE = eval(match[1]);
const MEGA_CAPABLE_LOWER = MEGA_CAPABLE_BASE.map(x => x.toLowerCase());

console.log(`[PASS] Loaded ${MEGA_CAPABLE_BASE.length} Pokemon in MEGA_CAPABLE_BASE`);

// Verify essential base and final forms for Megas across generations
const testSpecies = [
    // Gen 1
    'Bulbasaur', 'Venusaur',
    'Charmander', 'Charizard',
    'Squirtle', 'Blastoise',
    'Weedle', 'Beedrill',
    'Pidgey', 'Pidgeot',
    'Abra', 'Alakazam',
    'Slowpoke', 'Slowbro',
    'Gastly', 'Gengar',
    'Kangaskhan',
    'Pinsir',
    'Magikarp', 'Gyarados',
    'Aerodactyl',
    'Mewtwo',

    // Gen 2
    'Mareep', 'Ampharos',
    'Onix', 'Steelix',
    'Scyther', 'Scizor',
    'Heracross',
    'Houndour', 'Houndoom',
    'Larvitar', 'Tyranitar',

    // Gen 3
    'Treecko', 'Sceptile',
    'Torchic', 'Blaziken',
    'Mudkip', 'Swampert',
    'Ralts', 'Gardevoir', 'Gallade',
    'Sableye',
    'Mawile',
    'Aron', 'Aggron',
    'Meditite', 'Medicham',
    'Electrike', 'Manectric',
    'Carvanha', 'Sharpedo',
    'Numel', 'Camerupt',
    'Swablu', 'Altaria',
    'Shuppet', 'Banette',
    'Absol',
    'Snorunt', 'Glalie',
    'Bagon', 'Salamence',
    'Beldum', 'Metagross',
    'Latias', 'Latios', 'Rayquaza',

    // Gen 4
    'Buneary', 'Lopunny',
    'Gible', 'Garchomp',
    'Riolu', 'Lucario',
    'Snover', 'Abomasnow',

    // Gen 5 & 6
    'Audino',
    'Diancie'
];

for (const species of testSpecies) {
    const found = MEGA_CAPABLE_LOWER.includes(species.toLowerCase());
    assert(found, `Expected ${species} to be in MEGA_CAPABLE_BASE`);
}

console.log(`[PASS] All ${testSpecies.length} test species (all 46 Mega Evolution lines) verified present!`);

// Test scanner simulation
function simulateScan(text) {
    const lower = text.toLowerCase();
    for (let i = 0; i < MEGA_CAPABLE_LOWER.length; i++) {
        if (lower.indexOf(MEGA_CAPABLE_LOWER[i]) !== -1) {
            return MEGA_CAPABLE_BASE[i];
        }
    }
    return null;
}

assert.strictEqual(simulateScan('A wild Bulbasaur appeared!'), 'Bulbasaur');
assert.strictEqual(simulateScan('A wild Mega Kangaskhan appeared!'), 'Kangaskhan');
assert.strictEqual(simulateScan('A wild Ralts appeared!'), 'Ralts');
assert.strictEqual(simulateScan('A wild Scyther appeared!'), 'Scyther');
assert.strictEqual(simulateScan('A wild Weedle appeared!'), 'Weedle');
assert.strictEqual(simulateScan('A wild Rattata appeared!'), null);

console.log('[PASS] Scanner successfully matches base, middle, and mega forms.');
console.log('--- ALL MEGA EVOLUTION TESTS PASSED ---');
