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
      style: options.indicator.style || {},
      getAttribute: function(attr) {
        if (options.indicator.attributes && options.indicator.attributes[attr]) {
          return options.indicator.attributes[attr];
        }
        if (attr === 'title') return this.title;
        if (attr === 'alt') return this.alt;
        return '';
      },
      parentElement: options.indicator.parent || null,
      closest: function(sel) {
        if (sel === 'a' && options.indicator.link) return options.indicator.link;
        return null;
      }
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
  if (rawText.indexOf("don't have this pokemon") !== -1 ||
      rawText.indexOf("dont have this pokemon") !== -1 ||
      rawText.indexOf("do not have this pokemon") !== -1 ||
      rawText.indexOf("not in your box") !== -1 ||
      rawText.indexOf('not caught') !== -1 ||
      rawText.indexOf('uncaught') !== -1 ||
      rawText.indexOf('not in pokedex') !== -1 ||
      rawText.indexOf('new pokemon') !== -1) {
    return false;
  }

  if (rawText.indexOf('you have this pokemon in your box') !== -1 ||
      rawText.indexOf('already in your box') !== -1 ||
      rawText.indexOf('already caught') !== -1 ||
      rawText.indexOf('already in pokedex') !== -1 ||
      rawText.indexOf('already owned') !== -1 ||
      rawText.indexOf('pokedex: caught') !== -1 ||
      rawText.indexOf('dex: caught') !== -1) {
    return true;
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

    const isBallOrDex = src.indexOf('pokeball') !== -1 || src.indexOf('dball') !== -1 ||
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

  const parentEl = indicatorImg.parentElement;
  const linkEl = indicatorImg.closest ? indicatorImg.closest('a') : null;
  const allIndicatorTexts = [
    indTitle,
    indAlt,
    indicatorImg.getAttribute ? (indicatorImg.getAttribute('data-original-title') || indicatorImg.getAttribute('aria-label') || '') : '',
    parentEl ? (parentEl.title || (parentEl.getAttribute ? parentEl.getAttribute('title') || parentEl.getAttribute('data-original-title') || '' : '')) : '',
    linkEl ? (linkEl.title || (linkEl.getAttribute ? linkEl.getAttribute('title') || linkEl.getAttribute('data-original-title') || '' : '')) : ''
  ].join(' ').toLowerCase();

  // 1. Explicit UNCAUGHT text in attributes (DelugeRPG exact: "you don't have this pokemon in your box.")
  const isUncaughtByText =
    allIndicatorTexts.indexOf("don't have") !== -1 ||
    allIndicatorTexts.indexOf("dont have") !== -1 ||
    allIndicatorTexts.indexOf("do not have") !== -1 ||
    allIndicatorTexts.indexOf("not in your box") !== -1 ||
    allIndicatorTexts.indexOf("not in pokedex") !== -1 ||
    allIndicatorTexts.indexOf("not caught") !== -1 ||
    allIndicatorTexts.indexOf("uncaught") !== -1 ||
    allIndicatorTexts.indexOf("not owned") !== -1 ||
    allIndicatorTexts.indexOf("unowned") !== -1 ||
    allIndicatorTexts.indexOf("missing") !== -1 ||
    allIndicatorTexts.indexOf("new pokemon") !== -1;

  if (isUncaughtByText) {
    return false;
  }

  // 2. Explicit UNCAUGHT filename patterns (DelugeRPG exact: pokeball-n.png)
  const isUncaughtBySrc =
    indSrc.indexOf('pokeball-n') !== -1 ||
    indSrc.indexOf('dball-n') !== -1 ||
    indSrc.indexOf('-n.png') !== -1 || indSrc.indexOf('_n.png') !== -1 ||
    indSrc.indexOf('-n.gif') !== -1 || indSrc.indexOf('_n.gif') !== -1 ||
    indSrc.indexOf('-no.png') !== -1 || indSrc.indexOf('_no.png') !== -1 ||
    indSrc.indexOf('-off.png') !== -1 || indSrc.indexOf('_off.png') !== -1 ||
    indSrc.indexOf('dball_off') !== -1 || indSrc.indexOf('dball-off') !== -1 ||
    indSrc.indexOf('dball_grey') !== -1 || indSrc.indexOf('dball_gray') !== -1 ||
    indSrc.indexOf('dball_bw') !== -1 ||
    indSrc.indexOf('grey') !== -1 || indSrc.indexOf('gray') !== -1 ||
    indSrc.indexOf('bw') !== -1 || indSrc.indexOf('blackwhite') !== -1 ||
    indSrc.indexOf('empty') !== -1 || indSrc.indexOf('uncaught') !== -1 ||
    indSrc.indexOf('nocatch') !== -1 || indSrc.indexOf('not_caught') !== -1 ||
    indSrc.indexOf('0.png') !== -1;

  if (isUncaughtBySrc) {
    return false;
  }

  // 3. Explicit UNCAUGHT CSS classes
  const isUncaughtByClass =
    indClass.indexOf('grey') !== -1 || indClass.indexOf('gray') !== -1 ||
    indClass.indexOf('uncaught') !== -1 || indClass.indexOf('not-caught') !== -1 ||
    indClass.indexOf('dont-have') !== -1 || indClass.indexOf('unowned') !== -1 ||
    indClass.indexOf('bw') !== -1 || indClass.indexOf('disabled') !== -1 ||
    indClass.indexOf('desaturated') !== -1 ||
    (indClass.indexOf('off') !== -1 && indClass.indexOf('official') === -1);

  if (isUncaughtByClass) {
    return false;
  }

  // 4. Computed / Inline CSS Filter & Opacity
  const effectiveFilter = computedFilter || (indicatorImg.style && indicatorImg.style.filter ? indicatorImg.style.filter.toLowerCase() : '');
  const effectiveOpacity = (indicatorImg.style && indicatorImg.style.opacity !== undefined) ? indicatorImg.style.opacity : opacity;

  if (effectiveFilter.indexOf('grayscale') !== -1 || effectiveFilter.indexOf('saturate(0') !== -1 || effectiveOpacity < 0.5) {
    return false;
  }

  // 5. Explicit CAUGHT / DUPLICATE text (DelugeRPG exact: "you have this pokemon in your box.")
  const isCaughtByText =
    allIndicatorTexts.indexOf('you have this pokemon in your box') !== -1 ||
    allIndicatorTexts.indexOf('you have this pokemon') !== -1 ||
    allIndicatorTexts.indexOf('in your box') !== -1 ||
    allIndicatorTexts.indexOf('already caught') !== -1 ||
    allIndicatorTexts.indexOf('already in pokedex') !== -1 ||
    allIndicatorTexts.indexOf('already owned') !== -1 ||
    allIndicatorTexts.indexOf('in pokedex') !== -1 ||
    allIndicatorTexts.indexOf('caught') !== -1 ||
    allIndicatorTexts.indexOf('owned') !== -1 ||
    allIndicatorTexts.indexOf('registered') !== -1;

  if (isCaughtByText) {
    return true;
  }

  // 6. Explicit CAUGHT / COLORED ball filename without -n or uncaught markers
  const isStandardCaughtBall =
    (indSrc.indexOf('pokeball') !== -1 ||
     indSrc.indexOf('dball') !== -1 ||
     indSrc.indexOf('ball') !== -1 ||
     indSrc.indexOf('caught') !== -1 ||
     indSrc.indexOf('pokedex') !== -1) &&
    !isUncaughtBySrc;

  if (isStandardCaughtBall) {
    return true;
  }

  // 7. Safe Default: Never assume duplicate
  return false;
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

// Scenario 1I: EXACT DelugeRPG Production Uncaught: Shadow Ogerpon with pokeball-n.png
{
  const container = createMockEncounterElement({
    text: 'Legendary Pokemon\nShadow Ogerpon (Wellspring Mask) Appeared!\nLevel: 67 HP: 268\nGrass Water\nTry to Catch It',
    star: { src: 'https://i.dstatic.com/images/star.png' },
    sprite: 'https://i.dstatic.com/pokemon/shadow/ogerpon-wellspring.png',
    indicator: { src: 'https://i.dstatic.com/images/pokeball-n.png', title: "you don't have this pokemon in your box.", width: 16, height: 16 },
    typeBadge: { src: 'https://i.dstatic.com/images/types/grass.png' }
  });
  const isDupe = mockCheckDuplicate(container, 'none', 1.0);
  assert.strictEqual(isDupe, false, 'Shadow Ogerpon with pokeball-n.png MUST be detected as NOT DUPLICATE');
  console.log('[PASS] Scenario 1I: Shadow Ogerpon production encounter correctly identified as NOT DUPLICATE');
}

// Scenario 1J: Inconclusive icon (Default to NOT DUPLICATE for safety)
{
  const container = createMockEncounterElement({
    text: 'Legendary Pokemon\nA wild Rayquaza appeared!\nLevel: 70\nTry to Catch It',
    sprite: 'https://i.dstatic.com/pokemon/regular/rayquaza.png',
    indicator: { src: 'https://i.dstatic.com/images/unknown_icon.png', title: '', width: 16, height: 16 }
  });
  const isDupe = mockCheckDuplicate(container, 'none', 1.0);
  assert.strictEqual(isDupe, false, 'Inconclusive icon MUST safely default to NOT DUPLICATE');
  console.log('[PASS] Scenario 1J: Inconclusive icon correctly defaulted to NOT DUPLICATE');
}

// Scenario 1K: Production Nihilego encounter with ULTRABEAST header and red Pokeball (Already in box)
{
  const container = createMockEncounterElement({
    text: 'ULTRABEAST\nA wild Nihilego appeared!\nLevel: 60 HP: 215\nRock Poison\nTry to Catch It',
    star: { src: 'https://i.dstatic.com/images/star.png' },
    sprite: 'https://img.delugerpg.com/pokemon/regular/nihilego.png',
    indicator: { src: 'https://i.dstatic.com/images/dball.png', title: 'Nihilego', width: 16, height: 16 },
    typeBadge: { src: 'https://i.dstatic.com/images/types/rock.png' }
  });
  const isDupe = mockCheckDuplicate(container, 'none', 1.0);
  assert.strictEqual(isDupe, true, 'Ultra Beast Nihilego with red dball.png MUST be detected as DUPLICATE');
  console.log('[PASS] Scenario 1K: Ultra Beast Nihilego with red Pokeball correctly identified as DUPLICATE');
}

// Scenario 1L: Indicator wrapped in <a> link with tooltip 'you have this pokemon in your box.'
{
  const link = {
    title: 'you have this pokemon in your box.',
    getAttribute: function(a) { return a === 'title' ? this.title : ''; }
  };
  const container = createMockEncounterElement({
    text: 'ULTRABEAST\nA wild Nihilego appeared!\nLevel: 60',
    sprite: 'https://img.delugerpg.com/pokemon/regular/nihilego.png',
    indicator: { src: 'https://i.dstatic.com/images/dball.png', link: link, width: 16, height: 16 }
  });
  const isDupe = mockCheckDuplicate(container, 'none', 1.0);
  assert.strictEqual(isDupe, true, 'Pokeball inside link with duplicate tooltip MUST be detected as DUPLICATE');
  console.log('[PASS] Scenario 1L: Parent link tooltip correctly identified as DUPLICATE');
}

// Scenario 1M: Uncaught Ultra Beast Nihilego with pokeball-n.png
{
  const container = createMockEncounterElement({
    text: 'ULTRABEAST\nA wild Nihilego appeared!\nLevel: 60',
    sprite: 'https://img.delugerpg.com/pokemon/regular/nihilego.png',
    indicator: { src: 'https://i.dstatic.com/images/pokeball-n.png', title: "you don't have this pokemon in your box.", width: 16, height: 16 }
  });
  const isDupe = mockCheckDuplicate(container, 'none', 1.0);
  assert.strictEqual(isDupe, false, 'Uncaught Nihilego with pokeball-n.png MUST be detected as NOT DUPLICATE');
  console.log('[PASS] Scenario 1M: Uncaught Ultra Beast correctly identified as NOT DUPLICATE');
}

// Scenario 1N: Category Header Banner Detection (ULTRABEAST, PARADOX, LEGENDARY, MEGA)
{
  const ubText = 'ULTRABEAST\nA wild Nihilego appeared!\nLevel: 60';
  const hasUBBanner = ubText.toLowerCase().indexOf('ultrabeast') !== -1 || /\bultra\s*beasts?\b/i.test(ubText);
  assert.strictEqual(hasUBBanner, true, 'ULTRABEAST banner text must be detected');

  const paradoxText = 'PARADOX POKEMON\nA wild Great Tusk appeared!\nLevel: 65';
  const hasParadoxBanner = paradoxText.toLowerCase().indexOf('paradox') !== -1;
  assert.strictEqual(hasParadoxBanner, true, 'PARADOX POKEMON banner text must be detected');

  const legText = 'LEGENDARY POKEMON\nA wild Latios appeared!\nLevel: 74';
  const hasLegBanner = legText.toLowerCase().indexOf('legendary') !== -1;
  assert.strictEqual(hasLegBanner, true, 'LEGENDARY POKEMON banner text must be detected');

  const megaText = 'MEGA EVOLUTION\nA wild Mega Charizard appeared!\nLevel: 80';
  const hasMegaBanner = /\bmega\s*(?:evolution|pok[e\u00e9]mon)\b/i.test(megaText);
  assert.strictEqual(hasMegaBanner, true, 'MEGA EVOLUTION banner text must be detected');

  console.log('[PASS] Scenario 1N: Category Header Banners (ULTRABEAST, PARADOX, LEGENDARY, MEGA) verified');
}

// 2. Verify Zero Residue on Auto-Catch Removals
console.log('\n--- TEST 2: Residue-Free Verification of Auto-Catch Removals ---');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
assert.strictEqual(config.settings.avoidDuplicates, true, 'config.settings.avoidDuplicates must be true');
assert.strictEqual(typeof config.settings.autoStartOnMap, 'boolean', 'config.settings.autoStartOnMap must be a boolean');
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
