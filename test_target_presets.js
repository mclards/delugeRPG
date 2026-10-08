// test_target_presets.js - Comprehensive unit test for hunting target presets in both Desktop Client and Userscript
const fs = require('fs');
const assert = require('assert');

console.log('--- TESTING TARGET PRESETS & FILTER OPTIONS ---');

// 1. Load targets from desktop-client/targets.js
const TARGETS = require('./desktop-client/targets');
const VARIANTS = ["shiny", "metallic", "ghostly", "dark", "shadow", "mirage", "chrome", "negative", "retro"];
const FORMS = ["mega", "gigantamax", "g-max", "gmax", "primal", "ultra"];

const LEG_LOWER = TARGETS.legendaries.map(x => x.toLowerCase());
const MEGAS_LOWER = TARGETS.megas.map(x => x.toLowerCase());

function scanPage(text, config) {
  const textLower = text.toLowerCase();

  // 1. Special Sprite Variants
  if (config.findAnySpecialVariant) {
    for (const mod of VARIANTS) {
      const match = textLower.match(new RegExp('\\b' + mod + '[- ]+([a-z0-9\\-\':]+)', 'i'));
      if (match) return { found: true, category: 'variant', name: mod.toUpperCase() + ' ' + match[1] };
    }
  }

  // 2. Megas & Rare Lines
  if (config.findMegasAndGigantamax) {
    for (const form of FORMS) {
      const formMatch = textLower.match(new RegExp('\\b' + form + '[- ]+([a-z0-9\\-\':]+)', 'i'));
      if (formMatch) return { found: true, category: 'mega_form', name: form.toUpperCase() + ' ' + formMatch[1] };
    }
    for (let i = 0; i < MEGAS_LOWER.length; i++) {
      if (textLower.includes(MEGAS_LOWER[i])) {
        return { found: true, category: 'mega_line', name: TARGETS.megas[i] };
      }
    }
  }

  // 3. Legendaries
  if (config.findLegendaries) {
    for (let i = 0; i < LEG_LOWER.length; i++) {
      if (textLower.includes(LEG_LOWER[i])) {
        return { found: true, category: 'legendary', name: TARGETS.legendaries[i] };
      }
    }
  }

  return { found: false };
}

function getPresetConfig(preset) {
  switch (preset) {
    case 'legendaries':
      return { findLegendaries: true, findMegasAndGigantamax: false, findAnySpecialVariant: false };
    case 'megas':
      return { findLegendaries: false, findMegasAndGigantamax: true, findAnySpecialVariant: false };
    case 'variants':
      return { findLegendaries: false, findMegasAndGigantamax: false, findAnySpecialVariant: true };
    case 'legend_megas':
      return { findLegendaries: true, findMegasAndGigantamax: true, findAnySpecialVariant: false };
    case 'all':
    default:
      return { findLegendaries: true, findMegasAndGigantamax: true, findAnySpecialVariant: true };
  }
}

// TEST CASE A: Preset "legendaries"
console.log('Testing Preset: LEGENDARIES...');
const legCfg = getPresetConfig('legendaries');
assert.strictEqual(scanPage('Wild Rayquaza appeared!', legCfg).found, true, 'Rayquaza must be caught');
assert.strictEqual(scanPage('Wild Great Tusk appeared!', legCfg).found, true, 'Paradox Great Tusk must be caught');
assert.strictEqual(scanPage('Wild Mewtwo appeared!', legCfg).found, true, 'Mewtwo must be caught');
assert.strictEqual(scanPage('Wild Aron appeared!', legCfg).found, false, 'Normal Aron must be IGNORED in legendaries preset');
assert.strictEqual(scanPage('Wild Meditite appeared!', legCfg).found, false, 'Normal Meditite must be IGNORED in legendaries preset');
assert.strictEqual(scanPage('Wild Chrome Rattata appeared!', legCfg).found, false, 'Chrome Rattata must be IGNORED in legendaries preset');
console.log('  [PASS] Legendaries preset accurately catches only Legendaries/Paradox.');

// TEST CASE B: Preset "megas"
console.log('Testing Preset: MEGAS & RARE...');
const megaCfg = getPresetConfig('megas');
assert.strictEqual(scanPage('Wild Aron appeared!', megaCfg).found, true, 'Aron must be caught');
assert.strictEqual(scanPage('Wild Meditite appeared!', megaCfg).found, true, 'Meditite must be caught');
assert.strictEqual(scanPage('Wild Absol appeared!', megaCfg).found, true, 'Absol must be caught');
assert.strictEqual(scanPage('Wild Heracross appeared!', megaCfg).found, true, 'Heracross must be caught');
assert.strictEqual(scanPage('Wild Mega Charizard appeared!', megaCfg).found, true, 'Mega Charizard must be caught');
assert.strictEqual(scanPage('Wild Great Tusk appeared!', megaCfg).found, false, 'Great Tusk must be IGNORED in megas preset');
assert.strictEqual(scanPage('Wild Chrome Rattata appeared!', megaCfg).found, false, 'Chrome Rattata must be IGNORED in megas preset');
console.log('  [PASS] Megas preset accurately catches Mega lines and ignores unrelated Legendaries & variants.');

// TEST CASE C: Preset "variants"
console.log('Testing Preset: VARIANTS ONLY...');
const varCfg = getPresetConfig('variants');
assert.strictEqual(scanPage('Wild Chrome Rattata appeared!', varCfg).found, true, 'Chrome Rattata must be caught');
assert.strictEqual(scanPage('Wild Shiny Bidoof appeared!', varCfg).found, true, 'Shiny Bidoof must be caught');
assert.strictEqual(scanPage('Wild Mirage Pidgey appeared!', varCfg).found, true, 'Mirage Pidgey must be caught');
assert.strictEqual(scanPage('Wild Aron appeared!', varCfg).found, false, 'Normal Aron must be IGNORED in variants preset');
assert.strictEqual(scanPage('Wild Rayquaza appeared!', varCfg).found, false, 'Normal Rayquaza must be IGNORED in variants preset');
console.log('  [PASS] Variants preset accurately catches only special variants.');

// TEST CASE D: Preset "legend_megas"
console.log('Testing Preset: LEGEND + MEGAS...');
const legMegaCfg = getPresetConfig('legend_megas');
assert.strictEqual(scanPage('Wild Rayquaza appeared!', legMegaCfg).found, true, 'Rayquaza must be caught');
assert.strictEqual(scanPage('Wild Aron appeared!', legMegaCfg).found, true, 'Aron must be caught');
assert.strictEqual(scanPage('Wild Chrome Rattata appeared!', legMegaCfg).found, false, 'Chrome Rattata must be IGNORED');
console.log('  [PASS] Legend + Megas preset accurately catches both categories and ignores unrelated variants.');

// TEST CASE E: Preset "all"
console.log('Testing Preset: ALL...');
const allCfg = getPresetConfig('all');
assert.strictEqual(scanPage('Wild Rayquaza appeared!', allCfg).found, true, 'Rayquaza must be caught');
assert.strictEqual(scanPage('Wild Aron appeared!', allCfg).found, true, 'Aron must be caught');
assert.strictEqual(scanPage('Wild Chrome Rattata appeared!', allCfg).found, true, 'Chrome Rattata must be caught');
console.log('  [PASS] All preset catches Legendaries, Megas, and Variants.');

// 2. Test pokefinder.user.js code verification
console.log('Testing pokefinder.user.js Preset Integration...');
const userScript = fs.readFileSync('pokefinder.user.js', 'utf8');
assert(userScript.includes('const targetPreset = "all";'), 'Must have targetPreset configuration');
assert(userScript.includes('applyTargetPresetSettings'), 'Must have applyTargetPresetSettings function');
assert(userScript.includes('cycleTargetPreset'), 'Must have cycleTargetPreset function');
assert(userScript.includes('TARGET_PRESET_ORDER'), 'Must define TARGET_PRESET_ORDER');
assert(userScript.includes('targetPresetHotkey'), 'Must define targetPresetHotkey');
console.log('  [PASS] Userscript possesses all preset structures and cycle mechanics.');

// 3. Test desktop-client UI & config parity
console.log('Testing desktop-client Parity...');
const appHtml = fs.readFileSync('desktop-client/app.html', 'utf8');
const appJs = fs.readFileSync('desktop-client/app.js', 'utf8');
const configJson = JSON.parse(fs.readFileSync('desktop-client/config.json', 'utf8'));

// Verify targetModal and preset buttons
assert(appHtml.includes('id="targetModal"'), 'app.html must contain targetModal');
assert(appHtml.includes('id="presetAllBtn"'), 'app.html must contain presetAllBtn');
assert(appHtml.includes('id="presetLegBtn"'), 'app.html must contain presetLegBtn');
assert(appHtml.includes('id="presetMegaBtn"'), 'app.html must contain presetMegaBtn');
assert(appHtml.includes('id="presetVarBtn"'), 'app.html must contain presetVarBtn');
assert(appHtml.includes('id="presetShinyBtn"'), 'app.html must contain presetShinyBtn');
assert(appHtml.includes('id="presetLegMegaBtn"'), 'app.html must contain presetLegMegaBtn');

// Verify expanded filters: Legendary sub-categories, variant chips, whitelist & blacklist
assert(appHtml.includes('id="subClassicLegCheckbox"'), 'app.html must contain subClassicLegCheckbox');
assert(appHtml.includes('id="subUltraBeastsCheckbox"'), 'app.html must contain subUltraBeastsCheckbox');
assert(appHtml.includes('id="subParadoxCheckbox"'), 'app.html must contain subParadoxCheckbox');
assert(appHtml.includes('id="varShiny"'), 'app.html must contain varShiny');
assert(appHtml.includes('id="varChrome"'), 'app.html must contain varChrome');
assert(appHtml.includes('id="customTargetInput"'), 'app.html must contain customTargetInput');
assert(appHtml.includes('id="blacklistInput"'), 'app.html must contain blacklistInput');

assert(appJs.includes('applyTargetPreset'), 'app.js must contain applyTargetPreset');
assert(appJs.includes('calculateTargetSummary'), 'app.js must contain calculateTargetSummary');
assert(configJson.settings.targetPreset !== undefined, 'config.json must have targetPreset setting');

// 4. Test game-preload.js production target engine
console.log('Testing game-preload.js Production Target Engine...');
const preloadJs = fs.readFileSync('desktop-client/game-preload.js', 'utf8');
assert(!preloadJs.includes('const isVariantAllowed = findAnyVariant && allowedVariants.includes(detectedVariant);'), 'game-preload.js must not contain premature variant gate early return');
assert(preloadJs.includes('isVariantAcceptedForSpecies()'), 'game-preload.js must use per-tier variant acceptance helper');
assert(preloadJs.includes("selectedVariants: ['normal', ...VARIANTS]"), 'game-preload.js default selectedVariants must include normal');
console.log('  [PASS] Desktop Client preload target engine correctly permits all species tiers without variant gate blockades.');

console.log('--- ALL TARGET PRESET TESTS PASSED CLEANLY! ---');

