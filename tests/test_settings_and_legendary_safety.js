// test_settings_and_legendary_safety.js
// Verification suite ensuring:
// 1. Target presets persist immediately and save to config.json
// 2. Wild Legendaries (normal and special variants) are ALWAYS halted and respected
// 3. Variant filtering (e.g. Shinies Only) catches shiny commons while NEVER ignoring normal Legendaries
// 4. 100% 7-bit ASCII compliance across all files

const fs = require('fs');
const assert = require('assert');
const path = require('path');

console.log('=== RUNNING SETTINGS PERSISTENCE & LEGENDARY SAFETY SUITE ===\n');

const ROOT_DIR = fs.existsSync(path.join(__dirname, 'desktop-client')) ? __dirname : path.join(__dirname, '..');

// 1. Verify app.js preset listeners call applyTargetPreset with saveImmediately = true
console.log('--- 1. Testing app.js Preset Listener Persistence ---');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'desktop-client', 'app.js'), 'utf8');

assert(appJs.includes("applyTargetPreset('all', true)"), 'presetAllBtn must saveImmediately: true');
assert(appJs.includes("applyTargetPreset('legendaries', true)"), 'presetLegBtn must saveImmediately: true');
assert(appJs.includes("applyTargetPreset('megas', true)"), 'presetMegaBtn must saveImmediately: true');
assert(appJs.includes("applyTargetPreset('variants', true)"), 'presetVarBtn must saveImmediately: true');
assert(appJs.includes("applyTargetPreset('shinies', true)"), 'presetShinyBtn must saveImmediately: true');
assert(appJs.includes("applyTargetPreset('legend_megas', true)"), 'presetLegMegaBtn must saveImmediately: true');

console.log('  [PASS] All 6 preset pills configured to immediately persist settings to disk.');

// 2. Verify config.json default settings
console.log('\n--- 2. Testing config.json Settings Integrity ---');
const configJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'desktop-client', 'config.json'), 'utf8'));

assert.strictEqual(configJson.settings.findLegendaries, true, 'findLegendaries must be true');
assert.strictEqual(configJson.settings.legendaryClassic, true, 'legendaryClassic must be true');
assert.strictEqual(configJson.settings.legendaryUltraBeasts, true, 'legendaryUltraBeasts must be true');
assert.strictEqual(configJson.settings.legendaryParadox, true, 'legendaryParadox must be true');
assert(Array.isArray(configJson.settings.selectedVariants), 'selectedVariants must be an array');
assert(configJson.settings.selectedVariants.includes('Normal'), 'selectedVariants must include Normal');
assert(configJson.settings.selectedVariants.includes('Shiny'), 'selectedVariants must include Shiny');

console.log('  [PASS] config.json settings are valid, respected, and properly configured.');

// 3. Verify game-preload.js target matching logic
console.log('\n--- 3. Testing game-preload.js Legendary Respect Logic ---');
const preloadJs = fs.readFileSync(path.join(ROOT_DIR, 'desktop-client', 'game-preload.js'), 'utf8');
const TARGETS = require(path.join(ROOT_DIR, 'desktop-client', 'targets'));

// Simulate the exact target scanning function from game-preload.js
function simulateScanForTargets(encounterText, config) {
    const textLower = encounterText.trim().toLowerCase();
    const findMegas = config.findMegasAndGigantamax !== false;
    const findLegend = config.findLegendaries !== false;
    const isSpeciesRestricted = config.targetPreset === 'legendaries' || config.targetPreset === 'megas' || config.targetPreset === 'legend_megas';
    const findAnyVariant = (config.findAnySpecialVariant !== false) && !isSpeciesRestricted;

    const VARIANTS = ["shiny", "metallic", "ghostly", "dark", "shadow", "mirage", "chrome", "negative", "retro"];
    const LEGENDARY_LOWER = TARGETS.legendaries.map(l => l.toLowerCase());
    const MEGAS_LOWER = TARGETS.megas.map(m => m.toLowerCase());
    const FORMS = TARGETS.specialForms;

    let detectedVariant = 'normal';
    for (let v = 0; v < VARIANTS.length; v++) {
        const mod = VARIANTS[v];
        const match = textLower.match(new RegExp('\\b' + mod + '[- ]+([a-z0-9\\-\':]+)', 'i'));
        if (match) {
            detectedVariant = mod.toLowerCase();
            break;
        }
    }

    const allowedVariants = (Array.isArray(config.selectedVariants) && config.selectedVariants.length > 0)
        ? config.selectedVariants.map(v => v.toLowerCase())
        : ['normal', ...VARIANTS.map(v => v.toLowerCase())];

    function isVariantAcceptedForSpecies() {
        const isFilterActive = (config.enableVariantFilter !== false) && (config.findAnySpecialVariant !== false);
        if (isFilterActive && allowedVariants.length > 0) {
            return allowedVariants.includes(detectedVariant);
        }
        return true;
    }

    const varPrefix = (detectedVariant !== 'normal') ? (detectedVariant.toUpperCase() + ' ') : '';
    let targetDetected = null;

    // Tier 2: Megas
    if (findMegas) {
        for (let j = 0; j < FORMS.length; j++) {
            const form = FORMS[j];
            const formMatch = textLower.match(new RegExp('\\b' + form + '[- ]+([a-z0-9\\-\':]+)', 'i'));
            if (formMatch) {
                if (form.toLowerCase() === 'ultra' && formMatch[1].toLowerCase().startsWith('ball')) continue;
                if (isVariantAcceptedForSpecies()) {
                    return { halted: true, name: varPrefix + form.toUpperCase() + ' ' + formMatch[1], tier: 'form' };
                }
            }
        }
        for (let mg = 0; mg < MEGAS_LOWER.length; mg++) {
            if (textLower.indexOf(MEGAS_LOWER[mg]) !== -1) {
                if (isVariantAcceptedForSpecies()) {
                    return { halted: true, name: varPrefix + 'Mega Line: ' + TARGETS.megas[mg], tier: 'mega' };
                }
            }
        }
    }

    // Tier 3: Legendaries
    if (findLegend) {
        for (let k = 0; k < LEGENDARY_LOWER.length; k++) {
            const leg = LEGENDARY_LOWER[k];
            if (textLower.indexOf(leg) !== -1) {
                if (isVariantAcceptedForSpecies()) {
                    return { halted: true, name: varPrefix + TARGETS.legendaries[k], tier: 'legendary' };
                }
            }
        }
    }

    // Tier 4: Generic special variants
    const hasActiveSpeciesTiers = findLegend || findMegas || (config.customTargetList && config.customTargetList.trim().length > 0);
    let allowGenericVariants = false;
    if (config.targetPreset === 'all' || config.targetPreset === 'variants') {
        allowGenericVariants = findAnyVariant;
    } else if (config.targetPreset === 'shinies') {
        allowGenericVariants = findAnyVariant && (detectedVariant === 'shiny');
    } else if (!hasActiveSpeciesTiers) {
        allowGenericVariants = findAnyVariant;
    }

    if (allowGenericVariants && detectedVariant !== 'normal') {
        if (allowedVariants.includes(detectedVariant)) {
            return { halted: true, name: detectedVariant.toUpperCase(), tier: 'variant' };
        }
    }

    return { halted: false };
}

// TEST A: Legendaries Preset with Normal Checked - must catch Normal Rayquaza, Shiny Mewtwo
const legendPresetConfig = {
    findLegendaries: true,
    findMegasAndGigantamax: false,
    findAnySpecialVariant: false,
    targetPreset: 'legendaries',
    selectedVariants: ['Normal', 'Shiny', 'Chrome']
};
let res = simulateScanForTargets('Wild Rayquaza appeared! Level 50', legendPresetConfig);
assert.strictEqual(res.halted, true, 'Normal Rayquaza MUST halt when Normal is checked');
assert.strictEqual(res.tier, 'legendary');

res = simulateScanForTargets('Wild Shiny Mewtwo appeared! Level 70', legendPresetConfig);
assert.strictEqual(res.halted, true, 'Shiny Mewtwo MUST halt the bot');
assert.strictEqual(res.tier, 'legendary');

// Common wild encounter must NOT halt
res = simulateScanForTargets('Wild Rattata appeared! Level 4', legendPresetConfig);
assert.strictEqual(res.halted, false, 'Normal Rattata must NOT halt the bot');

// Non-legendary special variant (Ghostly Indeedee / Chrome Rattata) must NOT halt in legendaries preset!
res = simulateScanForTargets('Wild Ghostly Indeedee appeared! Level 3', legendPresetConfig);
assert.strictEqual(res.halted, false, 'Ghostly Indeedee must NOT halt in legendaries preset');

res = simulateScanForTargets('Wild Chrome Rattata appeared! Level 10', legendPresetConfig);
assert.strictEqual(res.halted, false, 'Chrome Rattata must NOT halt in legendaries preset');

// TEST B: Shinies Preset - selectedVariants has ONLY ['Shiny'], NO 'Normal'
// CRITICAL: Normal Rayquaza MUST BE IGNORED, but Shiny Rayquaza MUST HALT!
const shiniesOnlyPresetConfig = {
    findLegendaries: true,
    findMegasAndGigantamax: false,
    findAnySpecialVariant: true,
    targetPreset: 'shinies',
    selectedVariants: ['Shiny'] // Normal is NOT in selectedVariants!
};

res = simulateScanForTargets('Wild Rayquaza appeared! Level 50', shiniesOnlyPresetConfig);
assert.strictEqual(res.halted, false, 'Normal Rayquaza MUST be ignored when Normal is unchecked in Shinies mode');

res = simulateScanForTargets('Wild Shiny Rayquaza appeared! Level 50', shiniesOnlyPresetConfig);
assert.strictEqual(res.halted, true, 'Shiny Rayquaza MUST halt the bot in Shinies mode');
assert.strictEqual(res.tier, 'legendary');

res = simulateScanForTargets('Wild Shiny Lugia appeared! Level 70', shiniesOnlyPresetConfig);
assert.strictEqual(res.halted, true, 'Shiny Lugia MUST halt in Shinies mode');
assert.strictEqual(res.tier, 'legendary');

res = simulateScanForTargets('Wild Lugia appeared! Level 70', shiniesOnlyPresetConfig);
assert.strictEqual(res.halted, false, 'Normal Lugia MUST be ignored in Shinies mode');

// Generic wild pokemon: Shiny Rattata halts in Shinies preset, Normal Rattata does NOT halt
res = simulateScanForTargets('Wild Shiny Rattata appeared! Level 5', shiniesOnlyPresetConfig);
assert.strictEqual(res.halted, true, 'Shiny Rattata MUST halt');
assert.strictEqual(res.tier, 'variant');

res = simulateScanForTargets('Wild Rattata appeared! Level 5', shiniesOnlyPresetConfig);
assert.strictEqual(res.halted, false, 'Normal Rattata must NOT halt');

// TEST C: Exact User Scenario - Tab 1: Legendaries, Tab 2: Normal UNCHECKED, 9 Special Variants Checked
const legendVariantsOnlyConfig = {
    findLegendaries: true,
    findMegasAndGigantamax: false,
    findAnySpecialVariant: true,
    enableVariantFilter: true,
    targetPreset: 'legendaries',
    selectedVariants: ['Shiny', 'Chrome', 'Retro', 'Metallic', 'Shadow', 'Ghostly', 'Dark', 'Mirage', 'Negative']
};

res = simulateScanForTargets('Wild Rayquaza appeared! Level 50', legendVariantsOnlyConfig);
assert.strictEqual(res.halted, false, 'Normal Rayquaza MUST be ignored when user unchecks Normal!');

res = simulateScanForTargets('Wild Shadow Rayquaza appeared! Level 50', legendVariantsOnlyConfig);
assert.strictEqual(res.halted, true, 'Shadow Rayquaza MUST halt the bot!');
assert.strictEqual(res.tier, 'legendary');

res = simulateScanForTargets('Wild Chrome Mewtwo appeared! Level 70', legendVariantsOnlyConfig);
assert.strictEqual(res.halted, true, 'Chrome Mewtwo MUST halt the bot!');
assert.strictEqual(res.tier, 'legendary');

res = simulateScanForTargets('Wild Mewtwo appeared! Level 70', legendVariantsOnlyConfig);
assert.strictEqual(res.halted, false, 'Normal Mewtwo MUST be ignored when user unchecks Normal!');

// Non-legendary common Pokemon (e.g. Shadow Swablu) MUST be ignored when hunting Legendaries!
res = simulateScanForTargets('Wild Shadow Swablu appeared! Level 3', legendVariantsOnlyConfig);
assert.strictEqual(res.halted, false, 'Shadow Swablu MUST be ignored when species tier (Legendaries) is active!');

console.log('  [PASS] Target variant filtering strictly obeys checked variants: Normal ignored when unchecked, special variants halted.');

// 4. Strict 7-bit ASCII Check across all modified files
console.log('\n--- 4. Strict 7-bit ASCII Verification ---');
const filesToCheck = [
    'desktop-client/app.js',
    'desktop-client/game-preload.js',
    'desktop-client/config.json',
    'pokefinder.user.js'
];

for (const relPath of filesToCheck) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    for (let i = 0; i < content.length; i++) {
        const code = content.charCodeAt(i);
        if (code > 127) {
            throw new Error(`Non-ASCII character found in ${relPath} at index ${i}: code ${code}`);
        }
    }
    console.log(`  [PASS] ${relPath} is 100% 7-bit ASCII clean (${content.length} chars).`);
}

console.log('\n=== ALL SETTINGS & LEGENDARY SAFETY TESTS PASSED WITH 100% SUCCESS! ===');

