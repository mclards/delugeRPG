const fs = require('fs');
const assert = require('assert');

console.log('--- TESTING FILTER: PRIORITY MEGAS, LEGENDARIES, AND NO SIMPLE EVOLUTIONS ---');

const code = fs.readFileSync('pokefinder.user.js', 'utf8');

// Ensure RARE_META_BASE is removed
assert(!code.includes('const RARE_META_BASE'), 'RARE_META_BASE should not exist');
assert(!code.includes('const findRareMeta'), 'findRareMeta toggle should not exist');

// Extract MEGA_CAPABLE_BASE
const megaMatch = code.match(/const MEGA_CAPABLE_BASE = (\[[\s\S]*?\]);/);
assert(megaMatch, 'MEGA_CAPABLE_BASE must exist');
const MEGA_CAPABLE_BASE = eval(megaMatch[1]);
const MEGA_CAPABLE_LOWER = MEGA_CAPABLE_BASE.map(s => s.toLowerCase());

// Extract LEGENDARY_BASE
const legMatch = code.match(/const LEGENDARY_BASE = (\[[\s\S]*?\]);/);
assert(legMatch, 'LEGENDARY_BASE must exist');
const LEGENDARY_BASE = eval(legMatch[1]);
const LEGENDARY_BASE_LOWER = LEGENDARY_BASE.map(s => s.toLowerCase());

const SPECIAL_VARIANTS = ["shiny", "metallic", "ghostly", "dark", "shadow", "mirage", "chrome", "negative", "retro"];
const SPECIAL_FORMS = ["mega", "gigantamax", "primal", "ultra"];

// Simulated scan function matching exact logic in pokefinder.user.js
function scan(text, findSpecial = true, findMegas = true, findLegs = true) {
    const pageText = text.toLowerCase();

    // 1. Special Sprite Variants
    if (findSpecial) {
        for (let i = 0; i < SPECIAL_VARIANTS.length; i++) {
            const mod = SPECIAL_VARIANTS[i];
            const match = pageText.match(new RegExp('\\b' + mod + '\\s+([a-z0-9\\-\':]+)', 'i'));
            if (match) return 'Special: ' + mod.toUpperCase() + ' ' + match[1];
        }
    }

    // 2. Mega Evolutions, Gigantamax, Primal & Ultra forms + Mega-capable lines
    if (findMegas) {
        for (let j = 0; j < SPECIAL_FORMS.length; j++) {
            const form = SPECIAL_FORMS[j];
            const formMatch = pageText.match(new RegExp('\\b' + form + '\\s+([a-z0-9\\-\':]+)', 'i'));
            if (formMatch) return 'Form: ' + form.toUpperCase() + ' ' + formMatch[1];
        }

        for (let mg = 0; mg < MEGA_CAPABLE_LOWER.length; mg++) {
            if (pageText.indexOf(MEGA_CAPABLE_LOWER[mg]) !== -1) {
                return 'Mega Line: ' + MEGA_CAPABLE_BASE[mg];
            }
        }
    }

    // 3. Legendaries & Mythicals
    if (findLegs) {
        for (let k = 0; k < LEGENDARY_BASE_LOWER.length; k++) {
            if (pageText.indexOf(LEGENDARY_BASE_LOWER[k]) !== -1) {
                return 'Legendary: ' + LEGENDARY_BASE[k];
            }
        }
    }

    return null;
}

// 1. Verify that SIMPLE EVOLUTIONS DO NOT MATCH
const simpleEvolutionSpawns = [
    'A wild Mankey appeared! Level 12',
    'A wild Primeape appeared! Level 35',
    'A wild Annihilape appeared! Level 50',
    'A wild Pawniard appeared! Level 20',
    'A wild Bisharp appeared! Level 52',
    'A wild Kingambit appeared! Level 60',
    'A wild Charcadet appeared! Level 14',
    'A wild Armarouge appeared! Level 45',
    'A wild Ceruledge appeared! Level 45',
    'A wild Tinkatink appeared! Level 15',
    'A wild Tinkaton appeared! Level 40',
    'A wild Finizen appeared! Level 22',
    'A wild Palafin appeared! Level 45',
    'A wild Zorua appeared! Level 25',
    'A wild Zoroark appeared! Level 48',
    'A wild Eevee appeared! Level 10',
    'A wild Umbreon appeared! Level 30',
    'A wild Sylveon appeared! Level 30',
    'A wild Feebas appeared! Level 18',
    'A wild Milotic appeared! Level 50',
    'A wild Slakoth appeared! Level 8',
    'A wild Slaking appeared! Level 50',
    'A wild Mimikyu appeared! Level 35',
    'A wild Dratini appeared! Level 15',
    'A wild Dragonite appeared! Level 55',
    'A wild Dreepy appeared! Level 20',
    'A wild Dragapult appeared! Level 60',
    'A wild Frigibax appeared! Level 25',
    'A wild Baxcalibur appeared! Level 55',
    'A wild Litten appeared! Level 5',
    'A wild Incineroar appeared! Level 36',
    'A wild Fuecoco appeared! Level 5',
    'A wild Skeledirge appeared! Level 36',
    'A wild Sprigatito appeared! Level 5',
    'A wild Meowscarada appeared! Level 36',
    'A wild Chimchar appeared! Level 5',
    'A wild Infernape appeared! Level 36',
    'A wild Rattata appeared! Level 4',
    'A wild Bidoof appeared! Level 45'
];

for (const spawn of simpleEvolutionSpawns) {
    const result = scan(spawn);
    assert.strictEqual(result, null, `Simple evolution should NOT match: ${spawn} (got: ${result})`);
}
console.log(`✔ Verified: None of the ${simpleEvolutionSpawns.length} simple evolution Pokémon matched!`);

// 2. Verify that MEGA-CAPABLE POKÉMON MATCH
const megaSpawns = [
    { text: 'A wild Bulbasaur appeared! Level 5', expectedPrefix: 'Mega Line: Bulbasaur' },
    { text: 'A wild Charmander appeared! Level 5', expectedPrefix: 'Mega Line: Charmander' },
    { text: 'A wild Squirtle appeared! Level 5', expectedPrefix: 'Mega Line: Squirtle' },
    { text: 'A wild Weedle appeared! Level 3', expectedPrefix: 'Mega Line: Weedle' },
    { text: 'A wild Pidgey appeared! Level 4', expectedPrefix: 'Mega Line: Pidgey' },
    { text: 'A wild Abra appeared! Level 8', expectedPrefix: 'Mega Line: Abra' },
    { text: 'A wild Slowpoke appeared! Level 12', expectedPrefix: 'Mega Line: Slowpoke' },
    { text: 'A wild Gastly appeared! Level 15', expectedPrefix: 'Mega Line: Gastly' },
    { text: 'A wild Kangaskhan appeared! Level 25', expectedPrefix: 'Mega Line: Kangaskhan' },
    { text: 'A wild Pinsir appeared! Level 24', expectedPrefix: 'Mega Line: Pinsir' },
    { text: 'A wild Magikarp appeared! Level 10', expectedPrefix: 'Mega Line: Magikarp' },
    { text: 'A wild Aerodactyl appeared! Level 30', expectedPrefix: 'Mega Line: Aerodactyl' },
    { text: 'A wild Mareep appeared! Level 7', expectedPrefix: 'Mega Line: Mareep' },
    { text: 'A wild Scyther appeared! Level 28', expectedPrefix: 'Mega Line: Scyther' },
    { text: 'A wild Heracross appeared! Level 28', expectedPrefix: 'Mega Line: Heracross' },
    { text: 'A wild Houndour appeared! Level 16', expectedPrefix: 'Mega Line: Houndour' },
    { text: 'A wild Larvitar appeared! Level 15', expectedPrefix: 'Mega Line: Larvitar' },
    { text: 'A wild Treecko appeared! Level 5', expectedPrefix: 'Mega Line: Treecko' },
    { text: 'A wild Torchic appeared! Level 5', expectedPrefix: 'Mega Line: Torchic' },
    { text: 'A wild Mudkip appeared! Level 5', expectedPrefix: 'Mega Line: Mudkip' },
    { text: 'A wild Ralts appeared! Level 4', expectedPrefix: 'Mega Line: Ralts' },
    { text: 'A wild Mawile appeared! Level 20', expectedPrefix: 'Mega Line: Mawile' },
    { text: 'A wild Sableye appeared! Level 20', expectedPrefix: 'Mega Line: Sableye' },
    { text: 'A wild Aron appeared! Level 12', expectedPrefix: 'Mega Line: Aron' },
    { text: 'A wild Meditite appeared! Level 14', expectedPrefix: 'Mega Line: Meditite' },
    { text: 'A wild Electrike appeared! Level 11', expectedPrefix: 'Mega Line: Electrike' },
    { text: 'A wild Carvanha appeared! Level 18', expectedPrefix: 'Mega Line: Carvanha' },
    { text: 'A wild Numel appeared! Level 15', expectedPrefix: 'Mega Line: Numel' },
    { text: 'A wild Swablu appeared! Level 16', expectedPrefix: 'Mega Line: Swablu' },
    { text: 'A wild Shuppet appeared! Level 22', expectedPrefix: 'Mega Line: Shuppet' },
    { text: 'A wild Absol appeared! Level 26', expectedPrefix: 'Mega Line: Absol' },
    { text: 'A wild Snorunt appeared! Level 15', expectedPrefix: 'Mega Line: Snorunt' },
    { text: 'A wild Bagon appeared! Level 15', expectedPrefix: 'Mega Line: Bagon' },
    { text: 'A wild Beldum appeared! Level 15', expectedPrefix: 'Mega Line: Beldum' },
    { text: 'A wild Buneary appeared! Level 10', expectedPrefix: 'Mega Line: Buneary' },
    { text: 'A wild Gible appeared! Level 15', expectedPrefix: 'Mega Line: Gible' },
    { text: 'A wild Riolu appeared! Level 10', expectedPrefix: 'Mega Line: Riolu' },
    { text: 'A wild Snover appeared! Level 20', expectedPrefix: 'Mega Line: Snover' },
    { text: 'A wild Audino appeared! Level 20', expectedPrefix: 'Mega Line: Audino' },
    { text: 'A wild Chespin appeared! Level 5', expectedPrefix: 'Mega Line: Chespin' },
    { text: 'A wild Fennekin appeared! Level 5', expectedPrefix: 'Mega Line: Fennekin' },
    { text: 'A wild Froakie appeared! Level 5', expectedPrefix: 'Mega Line: Froakie' }
];

for (const item of megaSpawns) {
    const result = scan(item.text);
    assert.strictEqual(result, item.expectedPrefix, `Expected ${item.expectedPrefix} for ${item.text}`);
}
console.log(`✔ Verified: All ${megaSpawns.length} Mega-capable lines matched!`);

// 3. Verify that LEGENDARIES & FORMS MATCH
const legendSpawns = [
    { text: 'A wild Mewtwo appeared! Level 70', expected: 'Mega Line: Mewtwo' }, // Mewtwo is in Mega line & Legendary
    { text: 'A wild Rayquaza appeared! Level 70', expected: 'Mega Line: Rayquaza' },
    { text: 'A wild Dialga appeared! Level 70', expected: 'Legendary: Dialga' },
    { text: 'A wild Palkia appeared! Level 70', expected: 'Legendary: Palkia' },
    { text: 'A wild Giratina appeared! Level 70', expected: 'Legendary: Giratina' },
    { text: 'A wild Arceus appeared! Level 100', expected: 'Legendary: Arceus' },
    { text: 'A wild Zacian appeared! Level 70', expected: 'Legendary: Zacian' },
    { text: 'A wild Koraidon appeared! Level 70', expected: 'Legendary: Koraidon' },
    { text: 'A wild Miraidon appeared! Level 70', expected: 'Legendary: Miraidon' },
    { text: 'A wild Roaring Moon appeared! Level 60', expected: 'Legendary: Roaring Moon' },
    { text: 'A wild Mega Charizard appeared! Level 50', expected: 'Form: MEGA charizard' },
    { text: 'A wild Primal Kyogre appeared! Level 70', expected: 'Form: PRIMAL kyogre' },
    { text: 'A wild Gigantamax Gengar appeared! Level 50', expected: 'Form: GIGANTAMAX gengar' },
    { text: 'A wild Ultra Necrozma appeared! Level 75', expected: 'Form: ULTRA necrozma' },
    { text: 'A wild Chrome Pikachu appeared! Level 25', expected: 'Special: CHROME pikachu' }
];

for (const item of legendSpawns) {
    const result = scan(item.text);
    assert.strictEqual(result, item.expected, `Expected ${item.expected} for ${item.text} (got: ${result})`);
}
console.log(`✔ Verified: All ${legendSpawns.length} Legendaries and Special Forms matched!`);

console.log('--- ALL PRIORITY AND FILTERING TESTS PASSED PERFECTLY! ---');
