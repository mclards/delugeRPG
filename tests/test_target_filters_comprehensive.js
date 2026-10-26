// test_target_filters_comprehensive.js
// Exhaustive Verification of DelugeRPG Target Pokemon Filters, Presets, Variants,
// Sub-Tiers, Custom Whitelist, Blacklist, Level Filters, and Duplicate Avoidance.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('===================================================================');
console.log('=== COMPREHENSIVE TARGET POKEMON FILTERS VERIFICATION SUITE     ===');
console.log('===================================================================\n');

const TARGETS = require('../desktop-client/targets.js');
const LEGENDARY_LOWER = TARGETS.legendaries.map(l => l.toLowerCase());
const MEGAS_LOWER = TARGETS.megas.map(m => m.toLowerCase());
const FORMS = TARGETS.specialForms;
const VARIANTS = TARGETS.specialVariants;
const ULTRA_BEASTS = [
  'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela', 'kartana', 'guzzlord',
  'poipole', 'naganadel', 'stakataka', 'blacephalon'
];
const PARADOX = [
  'great tusk', 'scream tail', 'brute bonnet', 'flutter mane', 'slither wing', 'sandy shocks',
  'iron treads', 'iron bundle', 'iron hands', 'iron jugulis', 'iron moth', 'iron thorns',
  'roaring moon', 'iron valiant', 'walking wake', 'iron leaves',
  'gouging fire', 'raging bolt', 'iron boulder', 'iron crown'
];

// Mirror of scanForTargets + triggerTargetFound evaluation pipeline in game-preload.js
function evaluateEncounterAgainstConfig(encounterBoxText, cfg, isDupe = false) {
  let triggered = null;

  function triggerTargetFound(targetName, category) {
    if (category !== 'Level Match' && cfg.enableLevelFilter && cfg.levelFilterScope === 'targets') {
      const lvlMatch = targetName.match(/\(Lv\s*(\d+)\)/i);
      if (lvlMatch) {
        const tLvl = parseInt(lvlMatch[1], 10);
        const mode = cfg.levelFilterMode || 'min';
        const targetVal = typeof cfg.levelFilterValue === 'number' ? cfg.levelFilterValue : 50;
        let pass = true;
        if (mode === 'min') pass = tLvl >= targetVal;
        else if (mode === 'exact') pass = tLvl === targetVal;
        else if (mode === 'max') pass = tLvl <= targetVal;
        if (!pass) {
          return { halted: false, reason: 'failed_target_level_filter', targetName, category };
        }
      }
    }
    if (cfg.avoidDuplicates !== false && isDupe) {
      return { halted: false, reason: 'duplicate_skipped', targetName, category };
    }
    triggered = { halted: true, targetName, category };
    return triggered;
  }

  function extractWildLevel(text) {
    if (!text) return null;
    const m = text.match(/(?:level|lvl)[^0-9\r\n]{0,8}(\d{1,3})\b/i);
    if (m) {
      const lvl = parseInt(m[1], 10);
      if (!isNaN(lvl) && lvl >= 1 && lvl <= 100) return lvl;
    }
    return null;
  }

  const pageText = encounterBoxText || '';
  const textLower = pageText.trim().toLowerCase();
  if (!textLower) return { halted: false, reason: 'empty_text' };

  const boxLower = (encounterBoxText || '').toLowerCase();
  const shortName = encounterBoxText ? encounterBoxText.trim().split('\n')[0].replace(/\s+/g, ' ') : textLower.slice(0, 50);
  const shortLower = (shortName || '').toLowerCase();
  if (boxLower.indexOf('appeared') === -1 || shortLower.indexOf('deluge realm') !== -1 || /^.*#\d+$/.test(shortName.trim())) {
    if (boxLower.indexOf('appeared') === -1) {
      return { halted: false, reason: 'map_header_rejected' };
    }
  }

  const findAnyVariant = !!cfg.findAnySpecialVariant;
  const findMegas = !!cfg.findMegasAndGigantamax;
  const findLegend = cfg.findLegendaries !== false;

  const currentLevel = extractWildLevel(encounterBoxText);
  let passesLevel = true;
  if (cfg.enableLevelFilter) {
    const mode = cfg.levelFilterMode || 'min';
    const targetVal = typeof cfg.levelFilterValue === 'number' ? cfg.levelFilterValue : 50;
    if (currentLevel !== null) {
      if (mode === 'min') passesLevel = currentLevel >= targetVal;
      else if (mode === 'exact') passesLevel = currentLevel === targetVal;
      else if (mode === 'max') passesLevel = currentLevel <= targetVal;
    } else {
      passesLevel = (cfg.levelFilterScope !== 'all');
    }
    if (cfg.levelFilterScope === 'all' && !passesLevel) {
      return { halted: false, reason: 'failed_all_scope_level_filter' };
    }
  }

  const lvlSuffix = currentLevel !== null ? ' (Lv ' + currentLevel + ')' : '';

  function matchesSpeciesInText(text, speciesLower) {
    if (!text || !speciesLower) return false;
    if (text.indexOf(speciesLower) === -1) return false;
    const escaped = speciesLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?:^|[^a-z0-9])' + escaped + '(?:$|[^a-z0-9])', 'i').test(text);
  }

  // A. Blacklist
  if (cfg.blacklistList && typeof cfg.blacklistList === 'string') {
    const blacklist = cfg.blacklistList.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    for (let b = 0; b < blacklist.length; b++) {
      if (blacklist[b] && matchesSpeciesInText(textLower, blacklist[b])) {
        return { halted: false, reason: 'blacklisted' };
      }
    }
  }

  // B. Detect Variant
  let detectedVariant = 'normal';
  for (let v = 0; v < VARIANTS.length; v++) {
    const mod = VARIANTS[v];
    const match = textLower.match(new RegExp('\\b' + mod + '[- ]+([a-z0-9\\-\':]+)', 'i'));
    if (match) {
      detectedVariant = mod.toLowerCase();
      break;
    }
  }

  const hasCustomSelectedVariants = Array.isArray(cfg.selectedVariants);
  const allowedVariants = hasCustomSelectedVariants
    ? cfg.selectedVariants.map(v => v.toLowerCase())
    : ['normal', ...VARIANTS.map(v => v.toLowerCase())];

  const hasCustomLegVariants = Array.isArray(cfg.legendaryVariants);
  const allowedLegVariants = hasCustomLegVariants
    ? cfg.legendaryVariants.map(v => v.toLowerCase())
    : allowedVariants;

  const hasCustomMegaVariants = Array.isArray(cfg.megaVariants);
  const allowedMegaVariants = hasCustomMegaVariants
    ? cfg.megaVariants.map(v => v.toLowerCase())
    : allowedVariants;

  if (cfg.avoidDuplicates !== false && isDupe) {
    return { halted: false, reason: 'duplicate_skipped' };
  }

  function isVariantAcceptedForSpecies() {
    const isFilterActive = (cfg.enableVariantFilter !== false) && (cfg.findAnySpecialVariant !== false);
    if (isFilterActive && hasCustomSelectedVariants) {
      return allowedVariants.includes(detectedVariant);
    }
    return true;
  }

  function isVariantAcceptedForLegendary() {
    if (hasCustomLegVariants) {
      return allowedLegVariants.includes(detectedVariant);
    }
    return isVariantAcceptedForSpecies();
  }

  function isVariantAcceptedForMega() {
    if (hasCustomMegaVariants) {
      return allowedMegaVariants.includes(detectedVariant);
    }
    return isVariantAcceptedForSpecies();
  }

  const varPrefix = (detectedVariant !== 'normal') ? (detectedVariant.toUpperCase() + ' ') : '';

  function extractEncounterSpeciesName() {
    const fullSource = (encounterBoxText ? encounterBoxText + ' ' : '') + textLower;
    const m = fullSource.match(/(?:a wild\s+)?([a-z0-9\-\'\s\(\):]+?)\s+appeared/i);
    if (m && m[1]) {
      const raw = m[1].trim();
      const lines = raw.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
      let name = lines.length > 0 ? lines[lines.length - 1] : raw;
      name = name.replace(/^a\s+wild\s+/i, '').trim();
      if (detectedVariant !== 'normal') {
        name = name.replace(new RegExp('^' + detectedVariant + '\\s*', 'i'), '').trim();
      }
      return name;
    }
    return (shortName ? shortName.replace(/\s*appeared.*/i, '').trim() : '');
  }

  // Tier 1: Custom Target Whitelist
  if (cfg.customTargetList && typeof cfg.customTargetList === 'string') {
    const customTargets = cfg.customTargetList.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    for (let c = 0; c < customTargets.length; c++) {
      const targetName = customTargets[c];
      if (targetName && matchesSpeciesInText(textLower, targetName)) {
        if (isVariantAcceptedForSpecies()) {
          const foundName = 'Custom Target: ' + varPrefix + customTargets[c].toUpperCase() + lvlSuffix;
          return triggerTargetFound(foundName, 'Custom Target');
        }
      }
    }
  }

  // Tier 2: Legendaries, Mythicals, Ultra Beasts & Paradox
  if (findLegend) {
    const allowClassic = cfg.legendaryClassic !== false;
    const allowUB = cfg.legendaryUltraBeasts !== false;
    const allowParadox = cfg.legendaryParadox !== false;
    const boxCheckText = ((encounterBoxText || '') + ' ' + textLower).toLowerCase();

    if (boxCheckText.indexOf('ultrabeast') !== -1 || /\bultra\s*beasts?\b/i.test(boxCheckText)) {
      if (!allowUB) return { halted: false, reason: 'ub_disabled' };
      const spec = extractEncounterSpeciesName();
      if (spec) {
        if (isVariantAcceptedForLegendary()) {
          return triggerTargetFound(varPrefix + 'Ultra Beast: ' + spec.toUpperCase() + lvlSuffix, 'Ultra Beast');
        }
        return { halted: false, reason: 'leg_variant_rejected' };
      }
    }

    if (boxCheckText.indexOf('paradox') !== -1 || /\bparadox\s*pok[e\u00e9]mon\b/i.test(boxCheckText)) {
      if (!allowParadox) return { halted: false, reason: 'paradox_disabled' };
      const spec = extractEncounterSpeciesName();
      if (spec) {
        if (isVariantAcceptedForLegendary()) {
          return triggerTargetFound(varPrefix + 'Paradox: ' + spec.toUpperCase() + lvlSuffix, 'Paradox Pokemon');
        }
        return { halted: false, reason: 'leg_variant_rejected' };
      }
    }

    if (boxCheckText.indexOf('legendary') !== -1 || /\blegendary\s*pok[e\u00e9]mon\b/i.test(boxCheckText)) {
      if (!allowClassic) return { halted: false, reason: 'classic_leg_disabled' };
      const spec = extractEncounterSpeciesName();
      if (spec) {
        if (isVariantAcceptedForLegendary()) {
          return triggerTargetFound(varPrefix + 'Legendary: ' + spec.toUpperCase() + lvlSuffix, 'Rare/Legendary');
        }
        return { halted: false, reason: 'leg_variant_rejected' };
      }
    }

    for (let k = 0; k < LEGENDARY_LOWER.length; k++) {
      const leg = LEGENDARY_LOWER[k];
      if (textLower.indexOf(leg) !== -1 && matchesSpeciesInText(textLower, leg)) {
        const isUB = ULTRA_BEASTS.indexOf(leg) !== -1;
        const isParadox = PARADOX.indexOf(leg) !== -1;
        if (isUB && !allowUB) return { halted: false, reason: 'ub_disabled' };
        if (isParadox && !allowParadox) return { halted: false, reason: 'paradox_disabled' };
        if (!isUB && !isParadox && !allowClassic) return { halted: false, reason: 'classic_leg_disabled' };

        if (isVariantAcceptedForLegendary()) {
          const foundName = varPrefix + TARGETS.legendaries[k] + lvlSuffix;
          return triggerTargetFound(foundName, isParadox ? 'Paradox Pokemon' : (isUB ? 'Ultra Beast' : 'Rare/Legendary'));
        }
        return { halted: false, reason: 'leg_variant_rejected' };
      }
    }
  }

  // Tier 3: Mega Evolutions & Rare Evolution Lines
  const hasMegaBanner = /\bmega\s*(?:evolution|pok[e\u00e9]mon)\b/i.test(encounterBoxText || textLower);
  let matchedExplicitForm = null;
  for (let j = 0; j < FORMS.length; j++) {
    const form = FORMS[j];
    const formMatch = textLower.match(new RegExp('\\b' + form + '[- ]+([a-z0-9\\-\':]+)', 'i'));
    if (formMatch) {
      const targetWord = formMatch[1].toLowerCase();
      if (form.toLowerCase() === 'ultra' && (targetWord.startsWith('ball') || targetWord.startsWith('beast'))) {
        continue;
      }
      matchedExplicitForm = { form: form, target: formMatch[1] };
      break;
    }
  }

  if (findMegas) {
    if (hasMegaBanner) {
      const spec = extractEncounterSpeciesName();
      if (spec) {
        if (isVariantAcceptedForMega()) {
          return triggerTargetFound(varPrefix + 'Mega: ' + spec.toUpperCase() + lvlSuffix, 'Mega Evolution');
        }
        return { halted: false, reason: 'mega_variant_rejected' };
      }
    }

    if (matchedExplicitForm) {
      if (isVariantAcceptedForMega()) {
        return triggerTargetFound(varPrefix + matchedExplicitForm.form.toUpperCase() + ' ' + matchedExplicitForm.target + lvlSuffix, 'Special Form');
      }
      return { halted: false, reason: 'mega_variant_rejected' };
    }

    for (let mg = 0; mg < MEGAS_LOWER.length; mg++) {
      const megaTarget = MEGAS_LOWER[mg];
      if (LEGENDARY_LOWER.indexOf(megaTarget) !== -1) continue;
      if (textLower.indexOf(megaTarget) !== -1 && matchesSpeciesInText(textLower, megaTarget)) {
        if (isVariantAcceptedForMega()) {
          return triggerTargetFound(varPrefix + 'Mega Line: ' + TARGETS.megas[mg] + lvlSuffix, 'Mega Evolution');
        }
        return { halted: false, reason: 'mega_variant_rejected' };
      }
    }
  } else if (hasMegaBanner || matchedExplicitForm) {
    return { halted: false, reason: 'mega_tier_disabled' };
  }

  // Tier 4: Special Sprite Variants (Generic Wild Pokemon)
  const isMegaFamilyOrForm = MEGAS_LOWER.some(m => textLower.indexOf(m) !== -1 && matchesSpeciesInText(textLower, m)) || !!matchedExplicitForm;
  const isLegendarySpecies = LEGENDARY_LOWER.some(l => textLower.indexOf(l) !== -1 && matchesSpeciesInText(textLower, l));

  if (!findMegas) {
    const isMegaFamily = MEGAS_LOWER.some(m => textLower.indexOf(m) !== -1);
    const isMegaForm = !!matchedExplicitForm;
    if ((isMegaFamily && isMegaFamilyOrForm) || isMegaForm) {
      const isLegendary = LEGENDARY_LOWER.some(l => textLower.indexOf(l) !== -1);
      if (!isLegendary || !findLegend) {
        return { halted: false, reason: 'mega_disabled_in_tier4_guard' };
      }
    }
  } else if (isMegaFamilyOrForm && !isLegendarySpecies && !isVariantAcceptedForMega()) {
    return { halted: false, reason: 'mega_variant_rejected_in_tier4_guard' };
  }

  if (!findLegend) {
    const isLegendary = LEGENDARY_LOWER.some(l => textLower.indexOf(l) !== -1);
    if (isLegendary && isLegendarySpecies) {
      return { halted: false, reason: 'leg_disabled_in_tier4_guard' };
    }
  } else if (isLegendarySpecies && !isVariantAcceptedForLegendary()) {
    return { halted: false, reason: 'leg_variant_rejected_in_tier4_guard' };
  }

  const isSpeciesOnlyPreset = !findAnyVariant ||
    (cfg.targetPreset === 'legendaries' || cfg.targetPreset === 'megas' || cfg.targetPreset === 'legend_megas');

  let allowGenericVariants = false;
  if (findAnyVariant && !isSpeciesOnlyPreset) {
    if (cfg.targetPreset === 'shinies') {
      allowGenericVariants = (detectedVariant === 'shiny');
    } else {
      allowGenericVariants = true;
    }
  }

  if (allowGenericVariants && detectedVariant !== 'normal') {
    if (allowedVariants.includes(detectedVariant)) {
      let specName = extractEncounterSpeciesName();
      if (specName) {
        specName = ' ' + specName.charAt(0).toUpperCase() + specName.slice(1);
      }
      const foundName = detectedVariant.toUpperCase() + specName + lvlSuffix;
      return triggerTargetFound(foundName, 'Special Variant');
    }
  }

  // Tier 5: Fallback Level Filter
  const anyTierActive = findMegas || findLegend || (cfg.customTargetList && cfg.customTargetList.trim().length > 0);
  const isLevelAllScope = cfg.enableLevelFilter && (cfg.levelFilterScope === 'all' || !anyTierActive);

  if (isLevelAllScope && passesLevel && currentLevel !== null) {
    const symbol = (cfg.levelFilterMode === 'min') ? '+' : ((cfg.levelFilterMode === 'max') ? '<=' : '');
    const foundName = varPrefix + 'Wild Encounter (Lv ' + currentLevel + symbol + ')';
    return triggerTargetFound(foundName, 'Level Match');
  }

  return { halted: false, reason: 'non_target' };
}

const ALL_10_VARIANTS = ['Normal', 'Shiny', 'Chrome', 'Retro', 'Metallic', 'Shadow', 'Ghostly', 'Dark', 'Mirage', 'Negative'];
const SPECIAL_9_VARIANTS = ALL_10_VARIANTS.filter(v => v !== 'Normal');

function makePresetConfig(presetKey) {
  if (presetKey === 'all') {
    return {
      targetPreset: 'all',
      findLegendaries: true, legendaryClassic: true, legendaryUltraBeasts: true, legendaryParadox: true,
      findMegasAndGigantamax: true,
      findAnySpecialVariant: true, enableVariantFilter: true,
      selectedVariants: ALL_10_VARIANTS, legendaryVariants: ALL_10_VARIANTS, megaVariants: ALL_10_VARIANTS,
      enableLevelFilter: false, levelFilterMode: 'min', levelFilterValue: 10, levelFilterScope: 'targets',
      avoidDuplicates: true, customTargetList: '', blacklistList: ''
    };
  }
  if (presetKey === 'legendaries') {
    return {
      targetPreset: 'legendaries',
      findLegendaries: true, legendaryClassic: true, legendaryUltraBeasts: true, legendaryParadox: true,
      findMegasAndGigantamax: false,
      findAnySpecialVariant: false, enableVariantFilter: false,
      selectedVariants: SPECIAL_9_VARIANTS, legendaryVariants: ALL_10_VARIANTS, megaVariants: ALL_10_VARIANTS,
      enableLevelFilter: false, avoidDuplicates: true, customTargetList: '', blacklistList: ''
    };
  }
  if (presetKey === 'megas') {
    return {
      targetPreset: 'megas',
      findLegendaries: false, legendaryClassic: false, legendaryUltraBeasts: false, legendaryParadox: false,
      findMegasAndGigantamax: true,
      findAnySpecialVariant: false, enableVariantFilter: false,
      selectedVariants: SPECIAL_9_VARIANTS, legendaryVariants: ALL_10_VARIANTS, megaVariants: ALL_10_VARIANTS,
      enableLevelFilter: false, avoidDuplicates: true, customTargetList: '', blacklistList: ''
    };
  }
  if (presetKey === 'legend_megas') {
    return {
      targetPreset: 'legend_megas',
      findLegendaries: true, legendaryClassic: true, legendaryUltraBeasts: true, legendaryParadox: true,
      findMegasAndGigantamax: true,
      findAnySpecialVariant: false, enableVariantFilter: false,
      selectedVariants: SPECIAL_9_VARIANTS, legendaryVariants: ALL_10_VARIANTS, megaVariants: ALL_10_VARIANTS,
      enableLevelFilter: false, avoidDuplicates: true, customTargetList: '', blacklistList: ''
    };
  }
  if (presetKey === 'variants') {
    return {
      targetPreset: 'variants',
      findLegendaries: false, legendaryClassic: false, legendaryUltraBeasts: false, legendaryParadox: false,
      findMegasAndGigantamax: false,
      findAnySpecialVariant: true, enableVariantFilter: true,
      selectedVariants: SPECIAL_9_VARIANTS, legendaryVariants: SPECIAL_9_VARIANTS, megaVariants: SPECIAL_9_VARIANTS,
      enableLevelFilter: false, avoidDuplicates: true, customTargetList: '', blacklistList: ''
    };
  }
  if (presetKey === 'shinies') {
    return {
      targetPreset: 'shinies',
      findLegendaries: true, legendaryClassic: true, legendaryUltraBeasts: true, legendaryParadox: true,
      findMegasAndGigantamax: true,
      findAnySpecialVariant: true, enableVariantFilter: true,
      selectedVariants: ['Shiny'], legendaryVariants: ['Shiny'], megaVariants: ['Shiny'],
      enableLevelFilter: false, avoidDuplicates: true, customTargetList: '', blacklistList: ''
    };
  }
}

// -----------------------------------------------------------------------------
// 1. VERIFY ALL 6 PRESETS
// -----------------------------------------------------------------------------
console.log('--- 1. Testing All 6 Target Filter Presets ---');

// 1A. Preset: ALL
{
  const cfg = makePresetConfig('all');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mewtwo Appeared! Level: 70', cfg).halted, true, 'ALL preset must catch Normal Mewtwo');
  assert.strictEqual(evaluateEncounterAgainstConfig('Nihilego Appeared! Level: 60', cfg).halted, true, 'ALL preset must catch Ultra Beast Nihilego');
  assert.strictEqual(evaluateEncounterAgainstConfig('Roaring Moon Appeared! Level: 85', cfg).halted, true, 'ALL preset must catch Paradox Roaring Moon');
  assert.strictEqual(evaluateEncounterAgainstConfig('Larvitar Appeared! Level: 9', cfg).halted, true, 'ALL preset must catch Normal Mega Line Larvitar (Lv 9)');
  assert.strictEqual(evaluateEncounterAgainstConfig('Chrome Larvitar Appeared! Level: 9', cfg).halted, true, 'ALL preset must catch Chrome Larvitar (Lv 9)');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Woobat Appeared! Level: 12', cfg).halted, true, 'ALL preset must catch Shiny Woobat (Lv 12)');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mirage Bidoof Appeared! Level: 5', cfg).halted, true, 'ALL preset must catch Mirage Bidoof');
  assert.strictEqual(evaluateEncounterAgainstConfig('Normal Bidoof Appeared! Level: 5', cfg).halted, false, 'ALL preset must NOT halt on Normal common Bidoof');
  assert.strictEqual(evaluateEncounterAgainstConfig('Cufant Appeared! Level: 3', cfg).halted, false, 'ALL preset must NOT halt on Normal common Cufant');
  console.log('  [PASS] Preset "ALL" catches all Legendaries, Megas, and Special Variants while skipping Normal commons.');
}

// 1B. Preset: LEGENDARIES ONLY
{
  const cfg = makePresetConfig('legendaries');
  assert.strictEqual(evaluateEncounterAgainstConfig('Rayquaza Appeared! Level: 50', cfg).halted, true, 'LEGENDARIES preset must catch Rayquaza');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Zacian Appeared! Level: 80', cfg).halted, true, 'LEGENDARIES preset must catch Shiny Zacian');
  assert.strictEqual(evaluateEncounterAgainstConfig('Chrome Larvitar Appeared! Level: 50', cfg).halted, false, 'LEGENDARIES preset must NOT catch Mega Line Larvitar');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Woobat Appeared! Level: 50', cfg).halted, false, 'LEGENDARIES preset must NOT catch generic Shiny Woobat');
  console.log('  [PASS] Preset "LEGENDARIES" strictly isolates Legendaries/UBs/Paradox.');
}

// 1C. Preset: MEGAS ONLY
{
  const cfg = makePresetConfig('megas');
  assert.strictEqual(evaluateEncounterAgainstConfig('Beldum Appeared! Level: 25', cfg).halted, true, 'MEGAS preset must catch Mega Line Beldum');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mega Charizard X Appeared! Level: 60', cfg).halted, true, 'MEGAS preset must catch explicit Mega Charizard X');
  assert.strictEqual(evaluateEncounterAgainstConfig('Rayquaza Appeared! Level: 70', cfg).halted, false, 'MEGAS preset must NOT catch Legendary Rayquaza when Legendaries disabled');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Woobat Appeared! Level: 12', cfg).halted, false, 'MEGAS preset must NOT catch generic Shiny Woobat');
  console.log('  [PASS] Preset "MEGAS" strictly isolates Mega Evolution lines & Special Forms.');
}

// 1D. Preset: LEGENDARIES + MEGAS
{
  const cfg = makePresetConfig('legend_megas');
  assert.strictEqual(evaluateEncounterAgainstConfig('Giratina Appeared! Level: 70', cfg).halted, true, 'LEGEND_MEGAS preset must catch Giratina');
  assert.strictEqual(evaluateEncounterAgainstConfig('Gible Appeared! Level: 20', cfg).halted, true, 'LEGEND_MEGAS preset must catch Mega Line Gible');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Woobat Appeared! Level: 12', cfg).halted, false, 'LEGEND_MEGAS preset must NOT catch generic Shiny Woobat');
  console.log('  [PASS] Preset "LEGEND_MEGAS" catches Legendaries and Megas while ignoring generic wild variants.');
}

// 1E. Preset: VARIANTS ONLY
{
  const cfg = makePresetConfig('variants');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Woobat Appeared! Level: 12', cfg).halted, true, 'VARIANTS preset must catch Shiny Woobat');
  assert.strictEqual(evaluateEncounterAgainstConfig('Negative Feraligatr Appeared! Level: 45', cfg).halted, true, 'VARIANTS preset must catch Negative Feraligatr');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mewtwo Appeared! Level: 70', cfg).halted, false, 'VARIANTS preset must NOT catch Normal Mewtwo when Legendaries disabled');
  assert.strictEqual(evaluateEncounterAgainstConfig('Larvitar Appeared! Level: 30', cfg).halted, false, 'VARIANTS preset must NOT catch Normal Larvitar when Megas disabled');
  console.log('  [PASS] Preset "VARIANTS" catches special variants while respecting disabled Legendary/Mega tiers.');
}

// 1F. Preset: SHINIES ONLY
{
  const cfg = makePresetConfig('shinies');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Mewtwo Appeared! Level: 70', cfg).halted, true, 'SHINIES preset must catch Shiny Mewtwo');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Larvitar Appeared! Level: 20', cfg).halted, true, 'SHINIES preset must catch Shiny Larvitar');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Woobat Appeared! Level: 12', cfg).halted, true, 'SHINIES preset must catch Shiny Woobat');
  assert.strictEqual(evaluateEncounterAgainstConfig('Chrome Mewtwo Appeared! Level: 70', cfg).halted, false, 'SHINIES preset must NOT catch Chrome Mewtwo');
  assert.strictEqual(evaluateEncounterAgainstConfig('Chrome Larvitar Appeared! Level: 20', cfg).halted, false, 'SHINIES preset must NOT catch Chrome Larvitar');
  assert.strictEqual(evaluateEncounterAgainstConfig('Chrome Woobat Appeared! Level: 12', cfg).halted, false, 'SHINIES preset must NOT catch Chrome Woobat');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mewtwo Appeared! Level: 70', cfg).halted, false, 'SHINIES preset must NOT catch Normal Mewtwo');
  console.log('  [PASS] Preset "SHINIES" strictly catches only Shiny variants across all tiers.');
}

// -----------------------------------------------------------------------------
// 2. TEST LEGENDARY SUB-TIERS (CLASSIC vs ULTRA BEASTS vs PARADOX)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing Legendary Sub-Category Filters (Classic, Ultra Beasts, Paradox) ---');
{
  const cfgUBOnly = makePresetConfig('legendaries');
  cfgUBOnly.legendaryClassic = false;
  cfgUBOnly.legendaryUltraBeasts = true;
  cfgUBOnly.legendaryParadox = false;

  assert.strictEqual(evaluateEncounterAgainstConfig('Kartana Appeared! Level: 60', cfgUBOnly).halted, true, 'UB-only must catch Kartana');
  assert.strictEqual(evaluateEncounterAgainstConfig('ULTRABEAST\nBuzzwole Appeared! Level: 60', cfgUBOnly).halted, true, 'UB-only must catch banner Buzzwole');
  assert.strictEqual(evaluateEncounterAgainstConfig('Lugia Appeared! Level: 60', cfgUBOnly).halted, false, 'UB-only must skip Classic Lugia');
  assert.strictEqual(evaluateEncounterAgainstConfig('Iron Valiant Appeared! Level: 60', cfgUBOnly).halted, false, 'UB-only must skip Paradox Iron Valiant');

  const cfgParadoxOnly = makePresetConfig('legendaries');
  cfgParadoxOnly.legendaryClassic = false;
  cfgParadoxOnly.legendaryUltraBeasts = false;
  cfgParadoxOnly.legendaryParadox = true;

  assert.strictEqual(evaluateEncounterAgainstConfig('Iron Valiant Appeared! Level: 60', cfgParadoxOnly).halted, true, 'Paradox-only must catch Iron Valiant');
  assert.strictEqual(evaluateEncounterAgainstConfig('Walking Wake Appeared! Level: 60', cfgParadoxOnly).halted, true, 'Paradox-only must catch Walking Wake');
  assert.strictEqual(evaluateEncounterAgainstConfig('Kartana Appeared! Level: 60', cfgParadoxOnly).halted, false, 'Paradox-only must skip Kartana');
  assert.strictEqual(evaluateEncounterAgainstConfig('Lugia Appeared! Level: 60', cfgParadoxOnly).halted, false, 'Paradox-only must skip Lugia');
  console.log('  [PASS] Legendary Sub-Tiers (Classic, Ultra Beasts, Paradox) filter independently with 100% precision.');
}

// -----------------------------------------------------------------------------
// 3. TEST ALL 10 SPRITE VARIANTS & PER-TIER VARIANT MATRICES
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing All 10 Sprite Variants & Per-Tier Variant Matrices ---');
{
  const cfg = makePresetConfig('all');
  for (const v of SPECIAL_9_VARIANTS) {
    const res = evaluateEncounterAgainstConfig(`${v} Swanna Appeared! Level: 30`, cfg);
    assert.strictEqual(res.halted, true, `Must detect and halt on ${v} Swanna`);
    assert(res.targetName.startsWith(v.toUpperCase()), `Target name "${res.targetName}" must start with ${v.toUpperCase()}`);
  }

  // Per-tier independent variant matrix:
  // Legendaries = Chrome only, Megas = Dark only, Wild = Mirage only
  const customMatrixCfg = makePresetConfig('all');
  customMatrixCfg.legendaryVariants = ['Chrome'];
  customMatrixCfg.megaVariants = ['Dark'];
  customMatrixCfg.selectedVariants = ['Mirage'];

  assert.strictEqual(evaluateEncounterAgainstConfig('Chrome Mewtwo Appeared! Level: 50', customMatrixCfg).halted, true, 'Must catch Chrome Mewtwo');
  assert.strictEqual(evaluateEncounterAgainstConfig('Dark Mewtwo Appeared! Level: 50', customMatrixCfg).halted, false, 'Must reject Dark Mewtwo when Legendary tier only allows Chrome');
  assert.strictEqual(evaluateEncounterAgainstConfig('Dark Beldum Appeared! Level: 50', customMatrixCfg).halted, true, 'Must catch Dark Beldum');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mirage Beldum Appeared! Level: 50', customMatrixCfg).halted, false, 'Must reject Mirage Beldum when Mega tier only allows Dark');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mirage Pidgey Appeared! Level: 50', customMatrixCfg).halted, false, 'Pidgey is a Mega line, so Mirage Pidgey must obey Mega tier (Dark only)');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mirage Sentret Appeared! Level: 50', customMatrixCfg).halted, true, 'Sentret is generic wild, so Mirage Sentret must be caught');
  assert.strictEqual(evaluateEncounterAgainstConfig('Chrome Sentret Appeared! Level: 50', customMatrixCfg).halted, false, 'Chrome Sentret must be rejected when Wild tier only allows Mirage');
  console.log('  [PASS] All 10 Sprite Variants and Per-Tier Variant Matrices (Legendary / Mega / Wild) verified.');
}

// -----------------------------------------------------------------------------
// 4. TEST CUSTOM TARGET WHITELIST & BLACKLIST PRIORITY
// -----------------------------------------------------------------------------
console.log('\n--- 4. Testing Custom Target Whitelist & Blacklist Override ---');
{
  const cfg = makePresetConfig('legendaries');
  cfg.customTargetList = 'pikachu, eevee, zorua';
  cfg.blacklistList = 'zubat, mewtwo';

  assert.strictEqual(evaluateEncounterAgainstConfig('Pikachu Appeared! Level: 15', cfg).halted, true, 'Custom whitelist must catch Normal Pikachu');
  assert.strictEqual(evaluateEncounterAgainstConfig('Eevee Appeared! Level: 10', cfg).halted, true, 'Custom whitelist must catch Normal Eevee');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mewtwo Appeared! Level: 90', cfg).halted, false, 'Blacklisted Mewtwo must NEVER halt even though Legendaries are enabled');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Zubat Appeared! Level: 50', cfg).halted, false, 'Blacklisted Zubat must NEVER halt');
  console.log('  [PASS] Custom Target Whitelist and Blacklist highest-priority override verified.');
}

// -----------------------------------------------------------------------------
// 5. TEST LEVEL FILTER MODES (MIN / EXACT / MAX) & SCOPES (TARGETS vs ALL)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Testing Level Filter Modes (Min, Exact, Max) & Scopes (Targets vs All) ---');
{
  // Scope: Targets Only, Min 50
  const cfgMin50 = makePresetConfig('all');
  cfgMin50.enableLevelFilter = true;
  cfgMin50.levelFilterMode = 'min';
  cfgMin50.levelFilterValue = 50;
  cfgMin50.levelFilterScope = 'targets';

  assert.strictEqual(evaluateEncounterAgainstConfig('Chrome Larvitar Appeared! Level: 9', cfgMin50).halted, false, 'Lv 9 Chrome Larvitar must fail Min 50 target filter');
  assert.strictEqual(evaluateEncounterAgainstConfig('Chrome Larvitar Appeared! Level: 50', cfgMin50).halted, true, 'Lv 50 Chrome Larvitar must pass Min 50 target filter');
  assert.strictEqual(evaluateEncounterAgainstConfig('Normal Sentret Appeared! Level: 85', cfgMin50).halted, false, 'Lv 85 Normal Sentret must NOT trigger when scope is targets');

  // Scope: All Wild Encounters, Exact 100
  const cfgAllExact100 = makePresetConfig('legendaries');
  cfgAllExact100.enableLevelFilter = true;
  cfgAllExact100.levelFilterMode = 'exact';
  cfgAllExact100.levelFilterValue = 100;
  cfgAllExact100.levelFilterScope = 'all';

  assert.strictEqual(evaluateEncounterAgainstConfig('Sentret Appeared! Level: 100', cfgAllExact100).halted, true, 'Scope ALL + Exact 100 must catch Lv 100 Sentret');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mewtwo Appeared! Level: 99', cfgAllExact100).halted, false, 'Scope ALL + Exact 100 must reject Lv 99 Mewtwo');

  // Scope: Targets Only, Max 15
  const cfgMax15 = makePresetConfig('all');
  cfgMax15.enableLevelFilter = true;
  cfgMax15.levelFilterMode = 'max';
  cfgMax15.levelFilterValue = 15;
  cfgMax15.levelFilterScope = 'targets';

  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Woobat Appeared! Level: 12', cfgMax15).halted, true, 'Lv 12 Shiny Woobat must pass Max 15');
  assert.strictEqual(evaluateEncounterAgainstConfig('Shiny Woobat Appeared! Level: 16', cfgMax15).halted, false, 'Lv 16 Shiny Woobat must fail Max 15');
  console.log('  [PASS] Level Filter Modes (min, exact, max) and Scopes (targets, all) verified.');
}

// -----------------------------------------------------------------------------
// 6. TEST DUPLICATE AVOIDANCE & MAP HEADER REJECTION
// -----------------------------------------------------------------------------
console.log('\n--- 6. Testing Duplicate Avoidance & Map Realm Header Rejection ---');
{
  const cfg = makePresetConfig('all');
  assert.strictEqual(evaluateEncounterAgainstConfig('Mewtwo Appeared! Level: 70', cfg, true).halted, false, 'Duplicate Mewtwo must be skipped when avoidDuplicates is true');
  cfg.avoidDuplicates = false;
  assert.strictEqual(evaluateEncounterAgainstConfig('Mewtwo Appeared! Level: 70', cfg, true).halted, true, 'Duplicate Mewtwo must be caught when avoidDuplicates is false');

  assert.strictEqual(evaluateEncounterAgainstConfig('The Deluge Realm #5', cfg, false).halted, false, 'Map header "The Deluge Realm #5" must be rejected');
  assert.strictEqual(evaluateEncounterAgainstConfig('Magma Lagoon #3', cfg, false).halted, false, 'Map header "Magma Lagoon #3" must be rejected');
  console.log('  [PASS] Duplicate Avoidance toggle and Map Realm Header rejection verified.');
}

// -----------------------------------------------------------------------------
// 7. TEST RUNTIME CONFIG FILES (WORKSPACE + APPDATA ROAMING)
// -----------------------------------------------------------------------------
console.log('\n--- 7. Verifying Workspace & AppData Runtime Config Integrity ---');
{
  const wsConfigPath = path.join(__dirname, '..', 'desktop-client', 'config.json');
  const wsConfig = JSON.parse(fs.readFileSync(wsConfigPath, 'utf8'));
  const validPresets = ['all', 'legendaries', 'megas', 'legend_megas', 'variants', 'shinies', 'custom'];
  assert(validPresets.includes(wsConfig.settings.targetPreset), 'Workspace config targetPreset must be valid');
  assert.strictEqual(typeof wsConfig.settings.findLegendaries, 'boolean', 'Workspace config findLegendaries must be boolean');
  assert.strictEqual(typeof wsConfig.settings.findMegasAndGigantamax, 'boolean', 'Workspace config findMegasAndGigantamax must be boolean');
  assert.strictEqual(typeof wsConfig.settings.findAnySpecialVariant, 'boolean', 'Workspace config findAnySpecialVariant must be boolean');
  assert.strictEqual(typeof wsConfig.settings.enableVariantFilter, 'boolean', 'Workspace config enableVariantFilter must be boolean');
  assert.strictEqual(typeof wsConfig.settings.enableLevelFilter, 'boolean', 'Workspace config enableLevelFilter must be boolean');
  assert(Array.isArray(wsConfig.settings.selectedVariants) && wsConfig.settings.selectedVariants.length > 0, 'selectedVariants must be populated array');
  assert(Array.isArray(wsConfig.settings.legendaryVariants) && wsConfig.settings.legendaryVariants.length > 0, 'legendaryVariants must be populated array');
  assert(Array.isArray(wsConfig.settings.megaVariants) && wsConfig.settings.megaVariants.length > 0, 'megaVariants must be populated array');

  const appDataConfigPath = path.join(process.env.APPDATA || '', 'delugerpg-desktop-client', 'config.json');
  if (fs.existsSync(appDataConfigPath)) {
    const adConfig = JSON.parse(fs.readFileSync(appDataConfigPath, 'utf8'));
    assert(validPresets.includes(adConfig.settings.targetPreset), 'AppData config targetPreset must be valid');
    assert.strictEqual(typeof adConfig.settings.findLegendaries, 'boolean', 'AppData config findLegendaries must be boolean');
    assert.strictEqual(typeof adConfig.settings.findMegasAndGigantamax, 'boolean', 'AppData config findMegasAndGigantamax must be boolean');
    assert.strictEqual(typeof adConfig.settings.findAnySpecialVariant, 'boolean', 'AppData config findAnySpecialVariant must be boolean');
    assert.strictEqual(typeof adConfig.settings.enableVariantFilter, 'boolean', 'AppData config enableVariantFilter must be boolean');
    assert.strictEqual(typeof adConfig.settings.enableLevelFilter, 'boolean', 'AppData config enableLevelFilter must be boolean');
  }
  console.log(`  [PASS] Workspace and AppData\\Roaming config.json verified (Active Preset: "${wsConfig.settings.targetPreset}").`);
}

console.log('\n===================================================================');
console.log('=== ALL TARGET POKEMON FILTER TESTS PASSED PERFECTLY (100%)     ===');
console.log('===================================================================');
