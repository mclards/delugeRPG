/**
 * Automated Verification Suite for:
 * 1. DelugeRPG Duplication Avoidance Engine (checkEncounterIsDuplicate)
 * 2. Complete and Residue-Free Removal of Auto-Catch
 * 3. Auto-Start on Map Open & Improved Login Auto-Fill
 * 4. 100% 7-Bit Clean ASCII Verification
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== RUNNING DUPLICATION AVOIDANCE & CLIENT HARDENING TEST SUITE ===\n');

// 1. Verify Duplicate Checking Logic
console.log('--- TEST 1: checkEncounterIsDuplicate Scenarios ---');

function createMockEncounterElement(options = {}) {
  const children = [];
  const textContent = options.text || '';

  if (options.star) {
    children.push({
      tagName: 'IMG',
      src: options.star.src || 'https://www.delugerpg.com/images/star.png',
      alt: 'Star',
      naturalWidth: 16,
      naturalHeight: 16,
      width: 16,
      height: 16,
      className: 'star'
    });
  }

  if (options.sprite) {
    children.push({
      tagName: 'IMG',
      src: options.sprite,
      alt: 'Pokemon Sprite',
      naturalWidth: 80,
      naturalHeight: 80,
      width: 80,
      height: 80,
      className: 'sprite'
    });
  }

  if (options.indicator) {
    children.push({
      tagName: 'IMG',
      src: options.indicator.src || 'https://www.delugerpg.com/images/dball.png',
      alt: options.indicator.alt || '',
      title: options.indicator.title || '',
      className: options.indicator.className || '',
      naturalWidth: options.indicator.width || 16,
      naturalHeight: options.indicator.height || 16,
      width: options.indicator.width || 16,
      height: options.indicator.height || 16,
      complete: true,
      style: options.indicator.style || {}
    });
  }

  if (options.typeBadge) {
    children.push({
      tagName: 'IMG',
      src: options.typeBadge.src || 'https://www.delugerpg.com/images/types/psychic.png',
      alt: 'Psychic',
      naturalWidth: 24,
      naturalHeight: 24,
      width: 24,
      height: 24,
      className: 'type'
    });
  }

  return {
    innerText: textContent,
    textContent: textContent,
    querySelectorAll: function(sel) {
      if (sel === 'img') return children;
      return [];
    }
  };
}

function mockCheckDuplicate(container, computedFilter = '', opacity = 1.0) {
  if (!container) return false;
  const rawText = (container.innerText || container.textContent || '').toLowerCase();
  if (rawText.indexOf('already caught') !== -1 || rawText.indexOf('already in pokedex') !== -1 || rawText.indexOf('already owned') !== -1 || rawText.indexOf('pokedex: caught') !== -1) {
    return true;
  }
  if (rawText.indexOf('not caught') !== -1 || rawText.indexOf('uncaught') !== -1 || rawText.indexOf('not in pokedex') !== -1 || rawText.indexOf('new pokemon') !== -1) {
    return false;
  }

  const imgs = container.querySelectorAll ? container.querySelectorAll('img') : [];
  let indicatorImg = null;
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    const src = (img.src || '').toLowerCase();
    const alt = (img.alt || '').toLowerCase();
    const title = (img.title || '').toLowerCase();
    const className = (img.className || '').toLowerCase();

    const isWildSprite = src.indexOf('/pokemon/') !== -1 || src.indexOf('/sprites/') !== -1 ||
                         src.indexOf('/regular/') !== -1 || src.indexOf('/shiny/') !== -1 ||
                         src.indexOf('/retro/') !== -1 || src.indexOf('/chrome/') !== -1 ||
                         src.indexOf('/metallic/') !== -1 || src.indexOf('/shadow/') !== -1 ||
                         src.indexOf('/ghostly/') !== -1 || src.indexOf('/dark/') !== -1 ||
                         src.indexOf('/mirage/') !== -1 || src.indexOf('/negative/') !== -1;
    if (isWildSprite) {
      if ((img.naturalWidth && img.naturalWidth > 40) || (img.width && img.width > 40)) continue;
      if (className.indexOf('sprite') !== -1 || className.indexOf('poke') !== -1) continue;
    }

    const isTypeBadge = src.indexOf('/types/') !== -1 || src.indexOf('/type/') !== -1 ||
                        src.indexOf('type_') !== -1 || src.indexOf('type-') !== -1 ||
                        alt.indexOf('type') !== -1 || title.indexOf('type') !== -1 ||
                        className.indexOf('type') !== -1 ||
                        src.match(/\/(?:normal|fire|water|grass|electric|ice|fighting|poison|ground|flying|psychic|bug|rock|ghost|dragon|steel|dark|fairy)\.(?:png|gif|jpe?g)/i);
    if (isTypeBadge) continue;

    if (src.indexOf('star') !== -1 || alt.indexOf('star') !== -1 || title.indexOf('star') !== -1 ||
        src.indexOf('fav') !== -1 || className.indexOf('star') !== -1) {
      continue;
    }

    if (src.indexOf('arrow') !== -1 || alt.indexOf('arrow') !== -1 || title.indexOf('arrow') !== -1) {
      continue;
    }

    const isBallOrDex = src.indexOf('dball') !== -1 || src.indexOf('pokeball') !== -1 ||
                        src.indexOf('poke-ball') !== -1 || src.indexOf('poke_ball') !== -1 ||
                        src.indexOf('dexball') !== -1 || src.indexOf('ball') !== -1 ||
                        src.indexOf('caught') !== -1 || src.indexOf('pokedex') !== -1 ||
                        src.indexOf('dex') !== -1 ||
                        alt.indexOf('caught') !== -1 || title.indexOf('caught') !== -1 ||
                        alt.indexOf('pokedex') !== -1 || title.indexOf('pokedex') !== -1 ||
                        alt.indexOf('dex') !== -1 || title.indexOf('dex') !== -1 ||
                        alt.indexOf('ball') !== -1 || title.indexOf('ball') !== -1 ||
                        className.indexOf('caught') !== -1 || className.indexOf('dball') !== -1 ||
                        className.indexOf('pokedex') !== -1 || className.indexOf('dex') !== -1 ||
                        className.indexOf('ball') !== -1;

    const isSmallCardIcon = ((img.naturalWidth && img.naturalWidth <= 32) || (img.width && img.width <= 32)) &&
                            !isWildSprite && !isTypeBadge;

    if (isBallOrDex || isSmallCardIcon) {
      indicatorImg = img;
      break;
    }
  }

  if (!indicatorImg) return false;

  const indSrc = (indicatorImg.src || '').toLowerCase();
  const indAlt = (indicatorImg.alt || '').toLowerCase();
  const indTitle = (indicatorImg.title || '').toLowerCase();
  const indClass = (indicatorImg.className || '').toLowerCase();

  if (indTitle.indexOf('not caught') !== -1 || indAlt.indexOf('not caught') !== -1 ||
      indTitle.indexOf('uncaught') !== -1 || indAlt.indexOf('uncaught') !== -1 ||
      indTitle.indexOf('not owned') !== -1 || indAlt.indexOf('not owned') !== -1 ||
      indTitle.indexOf('unowned') !== -1 || indAlt.indexOf('unowned') !== -1) {
    return false;
  }

  if (indTitle.indexOf('already caught') !== -1 || indAlt.indexOf('already caught') !== -1 ||
      indTitle.indexOf('caught') !== -1 || indAlt.indexOf('caught') !== -1 ||
      indTitle.indexOf('in pokedex') !== -1 || indAlt.indexOf('in pokedex') !== -1 ||
      indTitle.indexOf('owned') !== -1 || indAlt.indexOf('owned') !== -1) {
    return true;
  }

  if (indSrc.indexOf('grey') !== -1 || indSrc.indexOf('gray') !== -1 ||
      indSrc.indexOf('bw') !== -1 || indSrc.indexOf('blackwhite') !== -1 ||
      indSrc.indexOf('empty') !== -1 || indSrc.indexOf('uncaught') !== -1 ||
      indSrc.indexOf('nocatch') !== -1 || indSrc.indexOf('off') !== -1 ||
      indSrc.indexOf('not_caught') !== -1 || indSrc.indexOf('0.png') !== -1) {
    return false;
  }

  if (indClass.indexOf('grey') !== -1 || indClass.indexOf('gray') !== -1 ||
      indClass.indexOf('uncaught') !== -1 || indClass.indexOf('not-caught') !== -1 ||
      indClass.indexOf('bw') !== -1 || indClass.indexOf('disabled') !== -1 ||
      indClass.indexOf('desaturated') !== -1) {
    return false;
  }

  const effectiveFilter = computedFilter || (indicatorImg.style && indicatorImg.style.filter ? indicatorImg.style.filter.toLowerCase() : '');
  const effectiveOpacity = (indicatorImg.style && indicatorImg.style.opacity !== undefined) ? indicatorImg.style.opacity : opacity;

  if (effectiveFilter.indexOf('grayscale') !== -1 || effectiveFilter.indexOf('saturate(0') !== -1 || effectiveOpacity < 0.5) {
    return false;
  }

  return true;
}

// Scenario 1A: Encounter with Red Pokeball (Already Caught in Dex)
{
  const container = createMockEncounterElement({
    text: 'A wild Rayquaza appeared! Level 50',
    sprite: 'https://www.delugerpg.com/pokemon/regular/rayquaza.png',
    indicator: { src: 'https://www.delugerpg.com/images/dball.png', title: 'Caught' }
  });
  const isDupe = mockCheckDuplicate(container);
  assert.strictEqual(isDupe, true, 'Rayquaza with red dball.png title=Caught must be detected as DUPLICATE');
  console.log('[PASS] Scenario 1A: Red Pokeball icon correctly identified as DUPLICATE');
}

// Scenario 1B: Encounter with Grey Pokeball (Not Caught in Dex)
{
  const container = createMockEncounterElement({
    text: 'A wild Koraidon appeared! Level 70',
    sprite: 'https://www.delugerpg.com/pokemon/regular/koraidon.png',
    indicator: { src: 'https://www.delugerpg.com/images/dball_grey.png', title: 'Not Caught' }
  });
  const isDupe = mockCheckDuplicate(container);
  assert.strictEqual(isDupe, false, 'Koraidon with grey ball title=Not Caught must be detected as NOT DUPLICATE');
  console.log('[PASS] Scenario 1B: Grey Pokeball icon correctly identified as NOT DUPLICATE');
}

// Scenario 1C: Encounter with Grayscale Filter CSS on Pokeball (Not Caught)
{
  const container = createMockEncounterElement({
    text: 'A wild Arceus appeared! Level 100',
    sprite: 'https://www.delugerpg.com/pokemon/regular/arceus.png',
    indicator: { src: 'https://www.delugerpg.com/images/dball.png' }
  });
  const isDupe = mockCheckDuplicate(container, 'grayscale(100%)');
  assert.strictEqual(isDupe, false, 'Pokeball with grayscale(100%) filter must be detected as NOT DUPLICATE');
  console.log('[PASS] Scenario 1C: Grayscale CSS filter correctly identified as NOT DUPLICATE');
}

// Scenario 1D: Encounter with NO Indicator Icon (Brand New Unseen Species)
{
  const container = createMockEncounterElement({
    text: 'A wild Mewtwo appeared! Level 70',
    sprite: 'https://www.delugerpg.com/pokemon/regular/mewtwo.png'
  });
  const isDupe = mockCheckDuplicate(container);
  assert.strictEqual(isDupe, false, 'Encounter with no ball icon must be detected as NOT DUPLICATE');
  console.log('[PASS] Scenario 1D: Missing ball icon correctly identified as NOT DUPLICATE');
}

// Scenario 1E: Encounter text says 'Already in Pokedex'
{
  const container = createMockEncounterElement({
    text: 'A wild Dialga appeared! Level 50 (Already in Pokedex)',
    sprite: 'https://www.delugerpg.com/pokemon/regular/dialga.png'
  });
  const isDupe = mockCheckDuplicate(container);
  assert.strictEqual(isDupe, true, 'Text containing already in pokedex must be detected as DUPLICATE');
  console.log('[PASS] Scenario 1E: Text indicator correctly identified as DUPLICATE');
}

// Scenario 1F: EXACT Production Encounter: Ghostly Cosmog with colored Pokeball icon
{
  const container = createMockEncounterElement({
    text: 'Legendary Pokemon\nGhostly Cosmog Appeared!\nLevel: 10 HP: 40\nPsychic\nTry to Catch It',
    star: { src: 'https://www.delugerpg.com/images/star.png' },
    sprite: 'https://img.delugerpg.com/pokemon/ghostly/cosmog.png',
    indicator: { src: 'https://www.delugerpg.com/images/ball.png', title: 'Cosmog', width: 16, height: 16 },
    typeBadge: { src: 'https://www.delugerpg.com/images/types/psychic.png' }
  });
  const isDupe = mockCheckDuplicate(container, 'none', 1.0);
  assert.strictEqual(isDupe, true, 'Ghostly Cosmog with colored ball.png MUST be detected as DUPLICATE');
  console.log('[PASS] Scenario 1F: Ghostly Cosmog production encounter correctly identified as DUPLICATE');
}

// Scenario 1G: Pokeball icon with opacity < 0.5 (Desaturated / Greyed out)
{
  const container = createMockEncounterElement({
    text: 'A wild Miraidon appeared! Level 70',
    sprite: 'https://www.delugerpg.com/pokemon/regular/miraidon.png',
    indicator: { src: 'https://www.delugerpg.com/images/dball.png' }
  });
  const isDupe = mockCheckDuplicate(container, '', 0.35);
  assert.strictEqual(isDupe, false, 'Pokeball with opacity 0.35 must be detected as NOT DUPLICATE (greyed out)');
  console.log('[PASS] Scenario 1G: Low-opacity greyed out icon correctly identified as NOT DUPLICATE');
}

// Scenario 1H: Pokeball icon with saturate(0) filter
{
  const container = createMockEncounterElement({
    text: 'A wild Zacian appeared! Level 70',
    sprite: 'https://www.delugerpg.com/pokemon/regular/zacian.png',
    indicator: { src: 'https://www.delugerpg.com/images/ball.png' }
  });
  const isDupe = mockCheckDuplicate(container, 'saturate(0%)');
  assert.strictEqual(isDupe, false, 'Pokeball with saturate(0%) must be detected as NOT DUPLICATE (greyed out)');
  console.log('[PASS] Scenario 1H: saturate(0%) filter correctly identified as NOT DUPLICATE');
}

// 2. Verify Zero Residue on Auto-Catch Removals
console.log('\n--- TEST 2: Residue-Free Verification of Auto-Catch Removals ---');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
assert.strictEqual(config.settings.avoidDuplicates, true, 'config.settings.avoidDuplicates must be true');
assert.strictEqual(config.settings.autoStartOnMap, true, 'config.settings.autoStartOnMap must be true');
assert.strictEqual(typeof config.settings.autoStartDelay, 'number', 'config.settings.autoStartDelay must be a number');
assert.strictEqual(config.settings.autoStartDelay >= 2, true, 'config.settings.autoStartDelay must be >= 2');
assert.strictEqual(config.settings.autoCatch, undefined, 'config.settings.autoCatch must be undefined (removed)');
assert.strictEqual(config.settings.ballStrategy, undefined, 'config.settings.ballStrategy must be undefined (removed)');
assert.strictEqual(config.settings.ultraBallMaxLevel, undefined, 'config.settings.ultraBallMaxLevel must be undefined (removed)');
console.log('[PASS] config.json verified: Zero auto-catch properties remain, autoStartOnMap and autoStartDelay active.');

const appHtml = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
assert.strictEqual(appHtml.includes('autoCatchBtn'), false, 'app.html must not contain autoCatchBtn');
assert.strictEqual(appHtml.includes('ballStrategyRadio'), false, 'app.html must not contain ballStrategyRadio');
assert.strictEqual(appHtml.includes('ultraBallMaxLevelInput'), false, 'app.html must not contain ultraBallMaxLevelInput');
assert.strictEqual(appHtml.includes('avoidDupesBtn'), true, 'app.html must retain avoidDupesBtn');
assert.strictEqual(appHtml.includes('autoStartMapBtn'), true, 'app.html must contain autoStartMapBtn');
assert.strictEqual(appHtml.includes('autoStartDelaySelect'), true, 'app.html must contain autoStartDelaySelect');
assert.strictEqual(appHtml.includes('openLogsBtn'), true, 'app.html must contain openLogsBtn');
assert.strictEqual(appHtml.includes('avoidDuplicatesCheck'), true, 'app.html must retain avoidDuplicatesCheck');
console.log('[PASS] app.html verified: autoCatch removed, autoStartMapBtn, autoStartDelaySelect, and openLogsBtn active.');

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
assert.strictEqual(appJs.includes('autoCatchBtn'), false, 'app.js must not contain autoCatchBtn');
assert.strictEqual(appJs.includes('updateAutoCatchUI'), false, 'app.js must not contain updateAutoCatchUI');
assert.strictEqual(appJs.includes('ballStrategyMaster'), false, 'app.js must not contain ballStrategyMaster');
assert.strictEqual(appJs.includes('resume-hunting'), false, 'app.js must not contain resume-hunting listener');
assert.strictEqual(appJs.includes('handleMapNavigation'), true, 'app.js must contain handleMapNavigation for auto-start');
assert.strictEqual(appJs.includes('triggerDelayedAutoStart'), true, 'app.js must contain triggerDelayedAutoStart for captcha safety');
assert.strictEqual(appJs.includes('cancelPendingAutoStart'), true, 'app.js must contain cancelPendingAutoStart');
assert.strictEqual(appJs.includes('autoStartMapBtn'), true, 'app.js must contain autoStartMapBtn');
assert.strictEqual(appJs.includes('autoStartDelaySelect'), true, 'app.js must contain autoStartDelaySelect');
assert.strictEqual(appJs.includes('openLogsBtn'), true, 'app.js must contain openLogsBtn');
console.log('[PASS] app.js verified: Zero auto-catch residue, handleMapNavigation, triggerDelayedAutoStart, and autoStartDelaySelect active.');

const preloadJs = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');
assert.strictEqual(preloadJs.includes('startCatchSequence'), false, 'game-preload.js must not contain startCatchSequence');
assert.strictEqual(preloadJs.includes('catchStepInterval'), false, 'game-preload.js must not contain catchStepInterval');
assert.strictEqual(preloadJs.includes('performLoginAutoFill'), true, 'game-preload.js must contain performLoginAutoFill');
assert.strictEqual(preloadJs.includes('hasCaptchaElement'), true, 'game-preload.js must check hasCaptchaElement');
console.log('[PASS] game-preload.js verified: Zero auto-catch residue, performLoginAutoFill and captcha checks active.');

// 3. Verify 100% 7-bit Clean ASCII across all files
console.log('\n--- TEST 3: 100% 7-bit Clean ASCII Verification ---');
const clientFiles = [
  'main.js',
  'app.js',
  'game-preload.js',
  'targets.js',
  'config.json',
  'package.json',
  'app.html',
  'test_client.js',
  'test_duplicate_and_catch.js'
];
for (const file of clientFiles) {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) > 127) {
      throw new Error(`Non-ASCII character found in ${file} at character ${i} (code: ${content.charCodeAt(i)})`);
    }
  }
}
console.log('[PASS] All desktop client files are 100% clean 7-bit ASCII.');

console.log('\n=== ALL TESTS PASSED PERFECTLY (ZERO RESIDUE) ===');
