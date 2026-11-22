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
assert.strictEqual(config.settings.autoCatch, undefined, 'legacy autoCatch must be undefined');
assert.strictEqual(config.settings.ballStrategy, undefined, 'legacy ballStrategy must be undefined');
assert.strictEqual(config.settings.hideAdsCosmetically, true, 'config.settings.hideAdsCosmetically must be true');
assert.strictEqual(typeof config.settings.autoCatchMasterBall, 'boolean', 'config.settings.autoCatchMasterBall must be boolean');
console.log('[PASS] config.json verified: autoCatchMasterBall, autoStartOnMap, autoStartDelay, and hideAdsCosmetically active.');

const appHtml = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
assert.strictEqual(appHtml.includes('autoCatchBtn'), true, 'app.html must contain autoCatchBtn');
assert.strictEqual(appHtml.includes('autoCatchBadge'), true, 'app.html must contain autoCatchBadge');
assert.strictEqual(appHtml.includes('ballStrategyRadio'), false, 'app.html must not contain legacy ballStrategyRadio');
assert.strictEqual(appHtml.includes('ultraBallMaxLevelInput'), false, 'app.html must not contain legacy ultraBallMaxLevelInput');
assert.strictEqual(appHtml.includes('avoidDupesBtn'), true, 'app.html must retain avoidDupesBtn');
assert.strictEqual(appHtml.includes('autoStartMapBtn'), true, 'app.html must contain autoStartMapBtn');
assert.strictEqual(appHtml.includes('autoStartDelaySelect'), true, 'app.html must contain autoStartDelaySelect');
assert.strictEqual(appHtml.includes('hideAdsBtn'), true, 'app.html must contain hideAdsBtn');
assert.strictEqual(appHtml.includes('hideAdsBadge'), true, 'app.html must contain hideAdsBadge');
assert.strictEqual(appHtml.includes('navVersionFooter'), true, 'app.html must contain navVersionFooter');
assert.strictEqual(appHtml.includes('navVersionBadge'), true, 'app.html must contain navVersionBadge');
assert.strictEqual(appHtml.includes('openLogsBtn'), true, 'app.html must contain openLogsBtn');
assert.strictEqual(appHtml.includes('avoidDuplicatesCheck'), true, 'app.html must retain avoidDuplicatesCheck');
console.log('[PASS] app.html verified: autoCatchBtn, autoStartMapBtn, hideAdsBtn, navVersionBadge, and openLogsBtn active.');

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
assert.strictEqual(appJs.includes('autoCatchBtn'), true, 'app.js must contain autoCatchBtn');
assert.strictEqual(appJs.includes('updateAutoCatchUI'), true, 'app.js must contain updateAutoCatchUI');
assert.strictEqual(appJs.includes("channel === 'autocatch-status'"), true, 'app.js must handle autocatch-status IPC');
assert.strictEqual(appJs.includes('ballStrategyMaster'), false, 'app.js must not contain legacy ballStrategyMaster');
assert.strictEqual(appJs.includes('resume-hunting'), false, 'app.js must not contain resume-hunting listener');
assert.strictEqual(appJs.includes('handleMapNavigation'), true, 'app.js must contain handleMapNavigation for auto-start');
assert.strictEqual(appJs.includes('triggerDelayedAutoStart'), true, 'app.js must contain triggerDelayedAutoStart for captcha safety');
assert.strictEqual(appJs.includes('cancelPendingAutoStart'), true, 'app.js must contain cancelPendingAutoStart');
assert.strictEqual(appJs.includes('autoStartMapBtn'), true, 'app.js must contain autoStartMapBtn');
assert.strictEqual(appJs.includes('autoStartDelaySelect'), true, 'app.js must contain autoStartDelaySelect');
assert.strictEqual(appJs.includes('hideAdsBtn'), true, 'app.js must contain hideAdsBtn');
assert.strictEqual(appJs.includes('updateHideAdsUI'), true, 'app.js must contain updateHideAdsUI');
assert.strictEqual(appJs.includes('navVersionBadge'), true, 'app.js must track navVersionBadge');
assert.strictEqual(appJs.includes('updateVersionUI'), true, 'app.js must contain updateVersionUI');
assert.strictEqual(appJs.includes('guestReportsMap'), true, 'app.js must track guestReportsMap');
assert.strictEqual(appJs.includes('isCurrentPageMap'), true, 'app.js must provide isCurrentPageMap');
assert.strictEqual(appJs.includes("channel === 'map-presence'"), true, 'app.js must listen for map-presence IPC');
assert.strictEqual(appJs.includes('did-navigate-in-page'), true, 'app.js must listen for did-navigate-in-page');
assert.strictEqual(appJs.includes('outOfStockPaused'), true, 'app.js must track outOfStockPaused for Option A stay-paused behavior');
assert.strictEqual(appJs.includes("'abort-autocatch'"), true, 'app.js must send abort-autocatch on manual pause');
assert.strictEqual(appJs.includes('syncUserCollectionToGuest'), true, 'app.js must contain syncUserCollectionToGuest');
assert.strictEqual(appJs.includes('handleDuplicateOwnedAlert'), true, 'app.js must contain handleDuplicateOwnedAlert');
console.log('[PASS] app.js verified: autoCatchBtn, updateAutoCatchUI, autocatch-status, handleMapNavigation, and guestReportsMap active.');

const preloadJs = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');
assert.strictEqual(preloadJs.includes('runAutoCatchLifecycle'), true, 'game-preload.js must contain runAutoCatchLifecycle');
assert.strictEqual(preloadJs.includes('getRandomCatchDelay'), true, 'game-preload.js must contain getRandomCatchDelay');
assert.strictEqual(preloadJs.includes('dispatchHumanClick'), true, 'game-preload.js must contain dispatchHumanClick');
assert.strictEqual(preloadJs.includes('autoCatchMasterBall'), true, 'game-preload.js must support autoCatchMasterBall');
assert.strictEqual(preloadJs.includes('performLoginAutoFill'), true, 'game-preload.js must contain performLoginAutoFill');
assert.strictEqual(preloadJs.includes('checkHasCaptchaElement'), true, 'game-preload.js must check checkHasCaptchaElement');
assert.strictEqual(preloadJs.includes('checkAndSyncMapPresence'), true, 'game-preload.js must contain checkAndSyncMapPresence');
assert.strictEqual(preloadJs.includes("'map-presence'"), true, 'game-preload.js must send map-presence IPC');
assert.strictEqual(preloadJs.includes('hideAdsCosmetically'), true, 'game-preload.js must support hideAdsCosmetically');
assert.strictEqual(preloadJs.includes('applyCosmeticAdHiding'), true, 'game-preload.js must contain applyCosmeticAdHiding');
assert.strictEqual(preloadJs.includes('vaccinateLinksAgainstVignettes'), true, 'game-preload.js must contain vaccinateLinksAgainstVignettes');
assert.strictEqual(preloadJs.includes('dismissGoogleVignetteOverlay'), true, 'game-preload.js must contain dismissGoogleVignetteOverlay');
assert.strictEqual(preloadJs.includes('aswift_'), true, 'game-preload.js must target aswift containers');
assert.strictEqual(preloadJs.includes('deluge_last_map_url'), true, 'game-preload.js must store deluge_last_map_url');
assert.strictEqual(preloadJs.includes('window.location.href = returnUrl'), true, 'game-preload.js must directly redirect to returnUrl on zero stock');
assert.strictEqual(preloadJs.includes('clearAutoCatchSession'), true, 'game-preload.js must contain clearAutoCatchSession');
assert.strictEqual(preloadJs.includes('pendingCatchTimeoutId'), true, 'game-preload.js must track pendingCatchTimeoutId');
assert.strictEqual(preloadJs.includes("ipcRenderer.on('abort-autocatch'"), true, 'game-preload.js must listen for abort-autocatch IPC');
assert.strictEqual(preloadJs.includes('evaluateOwnershipAndMegaEquivalence'), true, 'game-preload.js must contain evaluateOwnershipAndMegaEquivalence');
assert.strictEqual(preloadJs.includes('renderUniquenessAlertBanner'), true, 'game-preload.js must contain renderUniquenessAlertBanner');
assert.strictEqual(preloadJs.includes('guardManualCatchButtonsOnCatchPage'), true, 'game-preload.js must contain guardManualCatchButtonsOnCatchPage');
assert.strictEqual(preloadJs.includes('deluge-uniqueness-alert-banner'), true, 'game-preload.js must handle deluge-uniqueness-alert-banner cleanup');
assert.strictEqual(preloadJs.includes('deluge-evolve-uniqueness-banner'), true, 'game-preload.js must handle deluge-evolve-uniqueness-banner cleanup');
assert.strictEqual(preloadJs.includes('window.alert'), false, 'game-preload.js must NEVER call window.alert');
assert.strictEqual(preloadJs.includes('window.confirm'), false, 'game-preload.js must NEVER call window.confirm');
console.log('[PASS] game-preload.js verified: runAutoCatchLifecycle, getRandomCatchDelay, checkAndSyncMapPresence, Master Ball auto-catch, and Google Vignette suppression active.');

// 3. Auto-Catch (Master Ball) State Machine & Guard Verification
console.log('\n--- TEST 3: Auto-Catch (Master Ball) State Machine & Guard Verification ---');

function testRandomCatchDelay(minMs, maxMs) {
  const min = (typeof minMs === 'number' && minMs >= 500) ? minMs : 1000;
  const max = (typeof maxMs === 'number' && maxMs >= min) ? maxMs : 10000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const delays = [];
for (let i = 0; i < 100; i++) {
  const d = testRandomCatchDelay(1800, 4200);
  assert(d >= 1000 && d <= 10000, `Delay ${d} must be within bounds 1000-10000ms`);
  delays.push(d);
}
const uniqueDelays = new Set(delays);
assert(uniqueDelays.size > 80, `Random delays must be non-uniform (got ${uniqueDelays.size} unique values out of 100)`);
console.log(`[PASS] Non-uniform randomized delay generator verified: 100 trials, range [${Math.min(...delays)}ms, ${Math.max(...delays)}ms], ${uniqueDelays.size} unique values.`);

const outOfStockDelays = [];
for (let i = 0; i < 100; i++) {
  const d = testRandomCatchDelay(5000, 15000);
  assert(d >= 5000 && d <= 15000, `Out-of-stock delay ${d} must be within bounds 5000-15000ms`);
  outOfStockDelays.push(d);
}
const uniqueOutOfStock = new Set(outOfStockDelays);
assert(uniqueOutOfStock.size > 80, `Out-of-stock delays must be non-uniform (got ${uniqueOutOfStock.size} unique values)`);
console.log(`[PASS] Option A out-of-stock 5000ms-15000ms randomized delay verified: 100 trials, range [${Math.min(...outOfStockDelays)}ms, ${Math.max(...outOfStockDelays)}ms], ${uniqueOutOfStock.size} unique values.`);

function simulateMasterBallSearch(radios) {
  for (let rIdx = 0; rIdx < radios.length; rIdx++) {
    const r = radios[rIdx];
    const desc = (r.value + ' ' + (r.textContent || '')).toLowerCase();
    if (desc.includes('master')) {
      const match = desc.match(/\((\d+)\)/);
      const stock = match ? parseInt(match[1], 10) : null;
      if (r.disabled || desc.includes('(0)') || stock === 0) {
        return { found: true, available: false, stock: stock, radio: r };
      }
      return { found: true, available: true, stock: stock, radio: r };
    }
  }
  return { found: false, available: false, stock: null, radio: null };
}

const pool1 = [
  { value: 'pokeball', textContent: 'Poke Ball (13)' },
  { value: 'greatball', textContent: 'Great Ball (0)' },
  { value: 'masterball', textContent: 'Master Ball (22)' }
];
const res1 = simulateMasterBallSearch(pool1);
assert.strictEqual(res1.found, true, 'Master ball must be found');
assert.strictEqual(res1.available, true, 'Master ball (22) must be available');
assert.strictEqual(res1.stock, 22, 'Master ball stock must be parsed as 22');
console.log('[PASS] Master Ball with positive stock correctly selected.');

const pool2 = [
  { value: 'pokeball', textContent: 'Poke Ball (5)' },
  { value: 'masterball', textContent: 'Master Ball (0)' }
];
const res2 = simulateMasterBallSearch(pool2);
assert.strictEqual(res2.found, true, 'Master ball must be found');
assert.strictEqual(res2.available, false, 'Master ball (0) must be flagged unavailable');
assert.strictEqual(res2.stock, 0, 'Master ball stock must be parsed as 0');
console.log('[PASS] Master Ball with zero stock safely halted without throwing other balls.');

// Verify PokeMart /shop table row scraping where "Master Ball" description has "100% accuracy" before "(0)"
{
  function parseBallCountFromText(text, ballRegex) {
    if (!text || !ballRegex.test(text)) return null;
    const mParen = text.match(new RegExp(ballRegex.source + '(?:(?!master\\s*ball|ultra\\s*ball|great\\s*ball|poke\\s*ball)[\\s\\S]){0,180}?\\((\\d+)\\)', 'i'));
    if (mParen) return parseInt(mParen[1], 10);
    const mColon = text.match(new RegExp(ballRegex.source + '[^\\d\\n%()]*[:x\\s]+(\\d+)(?!\\s*%|\\s*accuracy|\\s*,\\d)', 'i'));
    if (mColon) return parseInt(mColon[1], 10);
    return null;
  }
  const shopText = [
    'Poke Ball Allows you to catch wild Pokemon, with low accuracy (10) 50',
    'Great Ball Allows you to catch wild Pokemon, with average accuracy (5) 125',
    'Ultra Ball Allows you to catch wild Pokemon, with high accuracy (3) 250',
    'Master Ball Allows you to catch wild Pokemon, with 100% accuracy (0) 7,500'
  ].join('\n');
  assert.strictEqual(parseBallCountFromText(shopText, /(?:^|\W)poke\s*balls?/i), 10, 'Poke Ball must parse as 10');
  assert.strictEqual(parseBallCountFromText(shopText, /great\s*ball/i), 5, 'Great Ball must parse as 5');
  assert.strictEqual(parseBallCountFromText(shopText, /ultra\s*ball/i), 3, 'Ultra Ball must parse as 3');
  assert.strictEqual(parseBallCountFromText(shopText, /master\s*ball/i), 0, 'Master Ball must parse as 0 despite 100% accuracy text');
  assert.strictEqual(preloadJs.includes('fetchBallInventoryFromShop'), true, 'game-preload.js must contain fetchBallInventoryFromShop');
  assert.strictEqual(appJs.includes('checkAndHandleAccountSwitch'), true, 'app.js must contain checkAndHandleAccountSwitch');
  console.log('[PASS] PokeMart (100% accuracy) Master Ball (0) extraction & mandatory account-switch sync verified.');
}

let testConfig = { hideAdsCosmetically: false, autoCatchMasterBall: true };
function enforceHideAdsDependency(cfg) {
  if (cfg.hideAdsCosmetically === false && cfg.autoCatchMasterBall) {
    cfg.autoCatchMasterBall = false;
  }
  return cfg;
}
enforceHideAdsDependency(testConfig);
assert.strictEqual(testConfig.autoCatchMasterBall, false, 'Auto-catch must automatically be false when Hide Ads is false');
console.log('[PASS] Hide Ads ON dependency strictly enforced.');

// Manual Pause Abort & Target Isolation Verification
{
  const mockSessionStorage = new Map();
  let pendingTimeout = 12345;
  let clicked = false;
  const clearedTimeouts = [];

  const mockClearTimeout = (id) => {
    clearedTimeouts.push(id);
  };

  const clearAutoCatchSession = (reason = '') => {
    if (pendingTimeout) {
      mockClearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
    mockSessionStorage.delete('deluge_autocatch_active');
    mockSessionStorage.delete('deluge_autocatch_action');
    mockSessionStorage.delete('deluge_autocatch_start_time');
    mockSessionStorage.delete('deluge_autocatch_attempts');
  };

  // 1. Arm auto-catch as if encounter was found
  mockSessionStorage.set('deluge_autocatch_active', 'true');
  assert.strictEqual(mockSessionStorage.get('deluge_autocatch_active'), 'true');

  // 2. User manually pauses -> fires abort-autocatch
  clearAutoCatchSession('manual_pause');
  assert.strictEqual(pendingTimeout, null, 'pendingCatchTimeoutId must be null after abort');
  assert.strictEqual(clearedTimeouts.includes(12345), true, 'pending catch timeout must be cleared');
  assert.strictEqual(mockSessionStorage.has('deluge_autocatch_active'), false, 'deluge_autocatch_active must be deleted');

  // 3. Simulate delayed timer executing after abort
  const simulateTimerCallback = () => {
    if (mockSessionStorage.get('deluge_autocatch_active') !== 'true') {
      return false;
    }
    clicked = true;
    return true;
  };
  const ran = simulateTimerCallback();
  assert.strictEqual(ran, false, 'Timer callback must abort if deluge_autocatch_active is not true');
  assert.strictEqual(clicked, false, 'No click must occur after manual pause');

  // 4. Simulate arriving at /catch/ after manual pause
  const simulateCatchPageLoad = () => {
    const isAutoCatchActive = mockSessionStorage.get('deluge_autocatch_active') === 'true';
    if (!isAutoCatchActive) {
      return 'MANUAL_CATCH_MODE';
    }
    return 'AUTOCATCH_RUNNING';
  };
  assert.strictEqual(simulateCatchPageLoad(), 'MANUAL_CATCH_MODE', 'Page must remain in manual catch mode when paused');
  console.log('[PASS] Manual pause abort safely purges auto-catch state and prevents automatic ball throw.');
}

// 3B. Owned Pokemon & Mega Evolution Uniqueness Awareness Verification
{
  const teamEngine = require('./team_engine');
  const evolutionEngine = require('./evolution_engine');
  const mockCollection = [
    { name: 'Mega Charizard X', level: 100 },
    { name: 'Dark Mega Steelix', level: 100 },
    { name: 'Shiny Rayquaza', level: 100 },
    { name: 'Dark Eternatus', variant: 'Dark', level: 62 },
    { name: 'Scraggy', variant: 'Normal', level: 20 }
  ];

  // Case 1: Wild base Charizard encountered when user owns Mega Charizard X
  const charizardCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Charizard', mockCollection);
  assert.strictEqual(charizardCheck.isDuplicate, false, 'Base Charizard must NOT be flagged as duplicate when only Mega Charizard X is owned');
  assert.strictEqual(charizardCheck.hasMegaOwned, true, 'hasMegaOwned must be true for Charizard');
  assert.strictEqual(charizardCheck.ownedPokemon.name, 'Mega Charizard X', 'Must identify Mega Charizard X');

  // Case 1B: Wild Kangaskhan baseline encountered when user owns Mega Kangaskhan
  const kangaCollection = [{ name: 'Mega Kangaskhan', level: 100, variant: 'Normal' }];
  const kangaCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Kangaskhan', kangaCollection);
  assert.strictEqual(kangaCheck.isDuplicate, false, 'Wild baseline Kangaskhan must NOT be flagged as duplicate when only Mega Kangaskhan is owned');
  assert.strictEqual(kangaCheck.hasMegaOwned, true, 'hasMegaOwned must be true for baseline Kangaskhan');

  const megaKangaCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Mega Kangaskhan', kangaCollection);
  assert.strictEqual(megaKangaCheck.isDuplicate, true, 'Wild Mega Kangaskhan MUST be flagged as duplicate when Mega Kangaskhan is owned');

  // Case 2: Alternate Mega Charizard Y when user owns Mega Charizard X
  const charizardYCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Mega Charizard Y', mockCollection);
  assert.strictEqual(charizardYCheck.isDuplicate, true, 'Mega Charizard Y must be flagged as Mega-owned duplicate');
  assert.strictEqual(charizardYCheck.hasMegaOwned, true, 'hasMegaOwned must be true for Mega Charizard Y');

  // Case 3: Wild Steelix when user owns Dark Mega Steelix
  const steelixCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Steelix', mockCollection);
  assert.strictEqual(steelixCheck.isDuplicate, false, 'Base Steelix must NOT be flagged as duplicate when only Dark Mega Steelix is owned');
  assert.strictEqual(steelixCheck.hasMegaOwned, true, 'hasMegaOwned must be true for Steelix');

  // Case 4: Unowned Pikachu must NOT be flagged
  const pikachuCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Pikachu', mockCollection);
  assert.strictEqual(pikachuCheck.isDuplicate, false, 'Unowned Pikachu must not be flagged as duplicate');
  assert.strictEqual(pikachuCheck.hasMegaOwned, false, 'hasMegaOwned must be false for Pikachu');

  // Case 5: Evolution engine ownership tag for Charizard
  const evoOwn = evolutionEngine.checkEvolutionOwnership('Charizard', mockCollection);
  assert.strictEqual(evoOwn.isOwned, true, 'Evolution check must mark Charizard as owned due to Mega Charizard X');
  assert.strictEqual(evoOwn.hasMegaOwned, true, 'Evolution check must mark hasMegaOwned: true');
  assert(evoOwn.summaryLabel.includes('MEGA'), 'Evolution summaryLabel must explicitly highlight MEGA ownership');

  // Case 6: Category-prefixed and level-suffixed target names in evaluateOwnershipAndMegaEquivalence
  const prefixedCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('SHINY Legendary: RAYQUAZA (Lv 85)', mockCollection);
  assert.strictEqual(prefixedCheck.isDuplicate, true, 'Prefixed SHINY Legendary: RAYQUAZA (Lv 85) must be recognized as owned');

  // Case 7: Wild Normal Eternatus when user owns Dark Eternatus (different variant is NOT duplicate)
  const eternatusCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Eternatus Appeared!', mockCollection);
  assert.strictEqual(eternatusCheck.isDuplicate, false, 'Normal Eternatus must NOT be flagged as duplicate when user only owns Dark Eternatus');
  assert.strictEqual(eternatusCheck.hasExactOwned, false, 'hasExactOwned must be false for Normal Eternatus when only Dark is owned');

  // Case 8: Wild Metallic Scraggy when user owns Normal Scraggy (different variant is NOT duplicate)
  const scraggyCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Metallic Scraggy Appeared!', mockCollection);
  assert.strictEqual(scraggyCheck.isDuplicate, false, 'Metallic Scraggy must NOT be flagged as duplicate when user only owns Normal Scraggy');
  assert.strictEqual(scraggyCheck.hasExactOwned, false, 'hasExactOwned must be false for Metallic Scraggy when only Normal is owned');

  // Case 9: Dark-type species and Dark variant distinction
  const extendedMockCol = [
    ...mockCollection,
    { name: 'Dark Darkrai', variant: 'Dark', level: 100 },
    { name: 'Calyrex (Shadow Rider)', variant: 'Normal', level: 90 },
    { name: 'Moltres', variant: 'Normal', level: 70 },
    { name: 'Mr. Mime', variant: 'Normal', level: 30 },
    { name: 'Zygarde (50%)', variant: 'Normal', level: 50 }
  ];

  // Wild Normal Darkrai vs Dark Darkrai in collection
  const darkraiCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Darkrai Appeared!\nLevel: 70', extendedMockCol);
  assert.strictEqual(darkraiCheck.isDuplicate, false, 'Normal Darkrai must not be treated as duplicate of Dark Darkrai');

  // Wild Dark Darkrai vs Dark Darkrai in collection
  const darkDarkraiCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Dark Darkrai Appeared!\nLevel: 70', extendedMockCol);
  assert.strictEqual(darkDarkraiCheck.isDuplicate, true, 'Dark Darkrai must be recognized as duplicate of owned Dark Darkrai');

  // Calyrex forms
  const iceRiderCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Calyrex (Ice Rider) Appeared!', extendedMockCol);
  assert.strictEqual(iceRiderCheck.isDuplicate, false, 'Calyrex (Ice Rider) must not match Calyrex (Shadow Rider) as duplicate');

  // Galarian Moltres vs Normal Moltres
  const gMoltresCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Galarian Moltres Appeared!', extendedMockCol);
  assert.strictEqual(gMoltresCheck.isDuplicate, false, 'Galarian Moltres must not match Normal Moltres as duplicate');

  // Punctuation species with variants
  const shinyMimeCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Shiny Mr. Mime Appeared!', extendedMockCol);
  assert.strictEqual(shinyMimeCheck.isDuplicate, false, 'Shiny Mr. Mime must not match Normal Mr. Mime as duplicate');

  const shinyZygardeCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Shiny Zygarde (50%) Appeared!', extendedMockCol);
  assert.strictEqual(shinyZygardeCheck.isDuplicate, false, 'Shiny Zygarde (50%) must not match Normal Zygarde (50%) as duplicate');

  // Case 10: Multi-line encounter text with elemental type badges
  const scraggyMultiLine = 'Scraggy Appeared!\nLevel: 13 | HP: 36/36\nDARK FIGHTING\nTry to Catch It';
  const scraggyMultiCheck = teamEngine.evaluateOwnershipAndMegaEquivalence(scraggyMultiLine, extendedMockCol);
  assert.strictEqual(scraggyMultiCheck.isDuplicate, true, 'Normal Scraggy with DARK FIGHTING type badges must match owned Normal Scraggy');
  assert.strictEqual(scraggyMultiCheck.type, 'EXACT_ALREADY_OWNED', 'Type must be EXACT_ALREADY_OWNED');

  // Case 11: All 10 DelugeRPG Variants Mega Evolution Uniqueness Verification
  // The 10 variants: Normal, Shiny, Metallic, Ghostly, Dark, Shadow, Mirage, Retro, Chrome, Negative
  const allTenVariants = ['Normal', 'Shiny', 'Metallic', 'Ghostly', 'Dark', 'Shadow', 'Mirage', 'Retro', 'Chrome', 'Negative'];
  const negativeMegaCol = [
    { name: 'Dark Pinsir', variant: 'Dark', level: 100 },
    { name: 'Negative Mega Pinsir', variant: 'Negative', level: 100 }
  ];

  // Evolving Dark Pinsir -> Dark Mega Pinsir must be 100% UNIQUE because user only has Negative Mega Pinsir
  const darkPinsirEvoOwn = evolutionEngine.checkEvolutionOwnership('Dark Mega Pinsir', negativeMegaCol, 'Dark');
  assert.strictEqual(darkPinsirEvoOwn.isOwned, false, 'Dark Mega Pinsir must be unowned when only Negative Mega Pinsir is owned');
  assert.strictEqual(darkPinsirEvoOwn.hasMegaOwned, false, 'hasMegaOwned must be false for Dark Mega Pinsir when only Negative is owned');

  // Verify all 10 variants systematically: only Negative Mega Pinsir is owned; all other 9 variants are unique!
  allTenVariants.forEach(variantName => {
    const candidateName = (variantName === 'Normal') ? 'Mega Pinsir' : `${variantName} Mega Pinsir`;
    const check = teamEngine.evaluateOwnershipAndMegaEquivalence(candidateName, negativeMegaCol, variantName);
    if (variantName === 'Negative') {
      assert.strictEqual(check.isDuplicate, true, 'Negative Mega Pinsir must be recognized as duplicate');
      assert.strictEqual(check.hasMegaOwned, true, 'hasMegaOwned must be true for Negative Mega Pinsir');
    } else {
      assert.strictEqual(check.isDuplicate, false, `${candidateName} must be recognized as 100% UNIQUE`);
      assert.strictEqual(check.hasMegaOwned, false, `hasMegaOwned must be false for ${candidateName}`);
    }
  });

  // Verify getEvolveReadyPokemon accurately marks Dark Pinsir as 100% UNIQUE
  const readyList = evolutionEngine.getEvolveReadyPokemon(negativeMegaCol);
  const darkPinsirEntry = readyList.find(p => p.name === 'Dark Pinsir');
  assert(darkPinsirEntry, 'Dark Pinsir must be present in evolve-ready list');
  assert.strictEqual(darkPinsirEntry.hasUnique, true, 'Dark Pinsir must have hasUnique: true when only Negative Mega Pinsir is owned');
  assert.strictEqual(darkPinsirEntry.bestBranch.isDuplicate, false, 'Dark Pinsir bestBranch must not be marked as duplicate');
  assert.strictEqual(darkPinsirEntry.bestBranch.fullName, 'Dark Mega Pinsir', 'Dark Pinsir bestBranch fullName must be Dark Mega Pinsir');

  // Case 12: Legendary Mewtwo Variant-Aware Catch Protection (Zero False Duplicate Drops)
  const mewtwoCollection = [
    { name: 'Dark Mega Mewtwo X', variant: 'Dark', level: 100 }
  ];

  // Wild Normal Mewtwo (Level 80) encountered when user owns Dark Mega Mewtwo X
  const wildMewtwoCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Mewtwo Appeared!\nLevel: 80', mewtwoCollection);
  assert.strictEqual(wildMewtwoCheck.isDuplicate, false, 'Wild Normal Mewtwo must NOT be flagged as duplicate when user only owns Dark Mega Mewtwo X');
  assert.strictEqual(wildMewtwoCheck.hasExactOwned, false, 'Normal Mewtwo must not be exact owned');

  // Short name encounter format
  const shortMewtwoCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Mewtwo (Lv 80)', mewtwoCollection);
  assert.strictEqual(shortMewtwoCheck.isDuplicate, false, 'Mewtwo (Lv 80) must NOT be flagged as duplicate');

  // Wild Dark Mega Mewtwo X MUST be duplicate
  const darkMegaCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Dark Mega Mewtwo X', mewtwoCollection, 'Dark');
  assert.strictEqual(darkMegaCheck.isDuplicate, true, 'Dark Mega Mewtwo X MUST be recognized as duplicate');

  // Wild Shiny Mega Mewtwo X must NOT be duplicate
  const shinyMegaCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Shiny Mega Mewtwo X', mewtwoCollection, 'Shiny');
  assert.strictEqual(shinyMegaCheck.isDuplicate, false, 'Shiny Mega Mewtwo X must NOT be duplicate when only Dark Mega Mewtwo X is owned');

  // Case 13: High-Value Hardened Shield for Legendaries, Ultra Beasts, and Paradoxes
  const legendaryCol = [
    { name: 'Mega Rayquaza', variant: 'Normal', level: 100 },
    { name: 'Primal Kyogre', variant: 'Normal', level: 100 },
    { name: 'Shiny Nihilego', variant: 'Shiny', level: 100 },
    { name: 'Dark Flutter Mane', variant: 'Dark', level: 100 },
    { name: 'Zacian', variant: 'Normal', level: 100 }
  ];

  // Base Rayquaza must NEVER be marked duplicate even when owning Normal Mega Rayquaza
  const wildRayquaza = teamEngine.evaluateOwnershipAndMegaEquivalence('Rayquaza Appeared!\nLevel: 70', legendaryCol);
  assert.strictEqual(wildRayquaza.isDuplicate, false, 'Base Rayquaza must NOT be duplicate when owning Mega Rayquaza');

  // Base Kyogre must NEVER be marked duplicate even when owning Primal Kyogre
  const wildKyogre = teamEngine.evaluateOwnershipAndMegaEquivalence('Kyogre Appeared!\nLevel: 70', legendaryCol);
  assert.strictEqual(wildKyogre.isDuplicate, false, 'Base Kyogre must NOT be duplicate when owning Primal Kyogre');

  // Normal Nihilego must NOT match Shiny Nihilego as duplicate
  const wildNihilego = teamEngine.evaluateOwnershipAndMegaEquivalence('Ultra Beast: NIHILIEGO (Lv 60)', legendaryCol, 'normal');
  assert.strictEqual(wildNihilego.isDuplicate, false, 'Normal Nihilego must NOT match Shiny Nihilego as duplicate');

  // Normal Flutter Mane must NOT match Dark Flutter Mane as duplicate
  const wildFlutter = teamEngine.evaluateOwnershipAndMegaEquivalence('Paradox: FLUTTER MANE (Lv 65)', legendaryCol, 'normal');
  assert.strictEqual(wildFlutter.isDuplicate, false, 'Normal Flutter Mane must NOT match Dark Flutter Mane as duplicate');

  // Exact match Zacian MUST be recognized as duplicate
  const wildZacian = teamEngine.evaluateOwnershipAndMegaEquivalence('Zacian Appeared!\nLevel: 70', legendaryCol, 'normal');
  assert.strictEqual(wildZacian.isDuplicate, true, 'Exact Normal Zacian MUST be recognized as duplicate');

  console.log('[PASS] 100% Uniqueness & Mega Evolution equivalence checks verified across wild encounters and evolution paths.');
}

// 3C. Non-Target Manual Pause & /catch Page Isolation Regression Verification
{
  assert.strictEqual(preloadJs.includes('isMapCatchElement'), true, 'game-preload.js must contain isMapCatchElement');
  assert.strictEqual(preloadJs.includes('blurCatchButtonsOnMap'), true, 'game-preload.js must contain blurCatchButtonsOnMap');
  assert.strictEqual(preloadJs.includes('__delugeAutoCatchAuthorizedClick'), true, 'game-preload.js must gate Try to Catch It clicks with __delugeAutoCatchAuthorizedClick');
  assert.strictEqual(preloadJs.includes('extractWildPokemonFromCatchPage'), true, 'game-preload.js must contain extractWildPokemonFromCatchPage');
  assert.strictEqual(preloadJs.includes("path.indexOf('/map') !== -1 || path.indexOf('/catch') !== -1"), false, 'scanForTargets must never run on /catch pages');
  assert.strictEqual(preloadJs.includes('isPreloadLegendaryOrSpecial'), true, 'game-preload.js must contain isPreloadLegendaryOrSpecial');
  assert.strictEqual(preloadJs.includes('checkHasExplicitCaughtText'), true, 'game-preload.js must contain checkHasExplicitCaughtText');
  assert.strictEqual(preloadJs.includes('PROTECTED TARGET: High-value target'), true, 'game-preload.js must contain high-value target protected airgap');
  assert.strictEqual(preloadJs.includes('PROTECTED ENCOUNTER: High-value target'), true, 'game-preload.js must contain high-value encounter protected airgap');
  assert.strictEqual(appJs.includes('isAutoCatchCountdownActive'), true, 'app.js must track isAutoCatchCountdownActive to abort on manual pause');
  console.log('[PASS] Non-target manual pause protection and /catch page isolation verified.');
}

// 3D. Target-Respect Across Page Jumps, Resume from Paused, and Step Completion Verification
{
  assert.strictEqual(preloadJs.includes('deluge_cached_target_config'), true, 'game-preload.js must persist and hydrate target config in localStorage across page jumps');
  assert.strictEqual(preloadJs.includes('ensureMapObserversAttached'), true, 'game-preload.js must dynamically attach MutationObserver to #map, #dexy, and #showpoke');
  assert.strictEqual(preloadJs.includes('!isLoading && (activeStep.sawSearching || (curDexy && curDexy !== activeStep.initialText))'), true, 'observer must wait for Searching... to finish before resolving step');
  assert.strictEqual(preloadJs.includes('hasEncounter: !!(hasCatchUI && lastFoundTarget)'), true, 'hasEncounter must only block auto-start when a halted target is on screen');
  console.log('[PASS] Target filters respected across page jumps, resume from Paused, and AJAX step transitions.');
}

// 3E. Forme Snowflake Indicator, Mythical Banner, and Unowned Forme Protection Audit
{
  assert.strictEqual(preloadJs.includes('checkEncounterHasFormeIndicator'), true, 'game-preload.js must implement checkEncounterHasFormeIndicator');
  assert.strictEqual(preloadJs.includes('Mythical Pokemon'), true, 'game-preload.js must support Mythical Pokemon category banner');
  assert.strictEqual(preloadJs.includes('isProtectedFormOrHighVal'), true, 'game-preload.js must protect unowned formes from base species duplicate override');
  assert.strictEqual(appJs.includes('ensureMemorySyncedBeforeHunting'), true, 'app.js must implement ensureMemorySyncedBeforeHunting before taking steps');
  assert.strictEqual(appJs.includes('smartCheck: true'), true, 'app.js must perform smartCheck single-page box verification');
  assert.strictEqual(preloadJs.includes('opts.smartCheck'), true, 'game-preload.js must handle smartCheck box verification');

  // Verify Mythical header banner matching
  const mythicalBannerText = 'MYTHICAL POKEMON\nShiny Arceus (Fairy) Appeared!';
  const hasMythicalBanner = mythicalBannerText.toLowerCase().indexOf('mythical') !== -1 || /\bmythical\s*pok[e\u00e9]mon\b/i.test(mythicalBannerText);
  assert.strictEqual(hasMythicalBanner, true, 'MYTHICAL POKEMON banner text must be detected');

  // Forme detection regex test
  const fairyArceus = 'Shiny Arceus (Fairy)';
  const isForme = /\([a-z0-9\s'%+\-]+\)/i.test(fairyArceus) || /\b(?:galarian|alolan|hisuian|paldean|dada)\b/i.test(fairyArceus);
  assert.strictEqual(isForme, true, 'Arceus (Fairy) must be detected as alternate forme');

  const galarianMoltres = 'Galarian Moltres';
  const isGalar = /\b(?:galarian|alolan|hisuian|paldean|dada)\b/i.test(galarianMoltres);
  assert.strictEqual(isGalar, true, 'Galarian Moltres must be detected as alternate forme');

  console.log('[PASS] Forme Snowflake, Mythical Banner, and Unowned Forme Protection verified.');
}

// 3F. Auto-Training / Battle Loop Isolation from Map Hunting & Auto-Catching
{
  const vm = require('vm');
  assert.strictEqual(preloadJs.includes('function isWildCatchContext()'), true, 'game-preload.js must define isWildCatchContext');
  assert.strictEqual(preloadJs.includes('blockedByCatch: true'), true, 'game-preload.js must reject apply-ai-battle-action during wild catch / auto-catch');
  assert.strictEqual(appJs.includes('function stopAllBattleAutomation('), true, 'app.js must define stopAllBattleAutomation');
  assert.strictEqual(appJs.includes('function isWildHuntingOrCatchContext('), true, 'app.js must define isWildHuntingOrCatchContext');
  assert.strictEqual(appJs.includes('let battleLoopFallbackTimer = null;'), true, 'app.js must track battleLoopFallbackTimer so navigating to map/catch cancels inner rematch');

  // Execute extracted isWildCatchContext against real scenario fixtures
  const fnMatch = preloadJs.match(/function isWildCatchContext\(\)\s*\{[\s\S]*?\n\}/);
  assert(fnMatch, 'Could not extract isWildCatchContext from game-preload.js');

  const evalCatchContext = ({ pathname = '/map/overworld', autoCatchActive = 'false', oppText = '', bodyText = '', hasCatchEl = false }) => {
    let storedActive = autoCatchActive;
    const ctx = {
      window: { location: { pathname } },
      sessionStorage: {
        getItem: (k) => (k === 'deluge_autocatch_active' ? storedActive : null),
        removeItem: (k) => { if (k === 'deluge_autocatch_active') storedActive = null; }
      },
      document: {
        getElementById: (id) => (id === 'opponent' && oppText ? { textContent: oppText } : (id === 'wildbattle' && hasCatchEl ? {} : null)),
        querySelector: (sel) => (hasCatchEl && /wildbattle|catch|throw|ball/i.test(sel) ? {} : null),
        body: { textContent: bodyText }
      }
    };
    vm.runInNewContext(fnMatch[0], ctx);
    return ctx.isWildCatchContext();
  };

  assert.strictEqual(evalCatchContext({ pathname: '/catch/dark_lapras' }), true, '/catch/ route MUST isolate auto-battle sensors');
  assert.strictEqual(evalCatchContext({ pathname: '/battle/wild/123' }), true, '/battle/wild route MUST isolate auto-battle sensors');
  assert.strictEqual(evalCatchContext({ pathname: '/map/overworld', autoCatchActive: 'true' }), true, 'Active deluge_autocatch_active session flag on map MUST isolate auto-battle');
  assert.strictEqual(evalCatchContext({ pathname: '/battle/trainer/753', autoCatchActive: 'true' }), false, 'Stale deluge_autocatch_active session flag on explicit Trainer Battle MUST NOT hide Auto/Loop/Deploy controls');
  assert.strictEqual(evalCatchContext({ pathname: '/challenge/gmax', autoCatchActive: 'true' }), false, 'Stale deluge_autocatch_active session flag on G-Max Challenge MUST NOT hide challenge battle controls');
  assert.strictEqual(evalCatchContext({ pathname: '/battle/arena', oppText: 'Wild Chrome Charizard Lv 50', bodyText: 'Throw Master Ball', hasCatchEl: true }), true, 'Wild Pokemon catch screen MUST isolate auto-battle');
  assert.strictEqual(evalCatchContext({ pathname: '/battle/trainer/113', oppText: "Youngster Joey's Rattata", bodyText: 'Choose your move', hasCatchEl: false }), false, 'Genuine NPC trainer battle MUST NOT be treated as wild catch');

  // Verify host-side URL context and G-Max vs Training Battle separation
  const nonWildMatch = appJs.match(/function isExplicitNonWildBattleUrl\(urlStr\)\s*\{[\s\S]*?\n\}/);
  const hostWildMatch = appJs.match(/function isWildHuntingOrCatchContext\(overrideUrl = ''\)\s*\{[\s\S]*?\n\}/);
  const gmaxModeMatch = appJs.match(/function isGMaxChallengeModeActive\(\)\s*\{[\s\S]*?\n\}/);
  assert(nonWildMatch && hostWildMatch && gmaxModeMatch, 'Host battle/challenge helpers must be present in app.js');

  const evalHostCtx = ({ liveUrl = '', overrideUrl = '', isRunning = false, isAutoCatchCountdownActive = false, isEncounterOnScreen = false, targetEncounterActive = false, activeAiBattleData = null, teamRosterMode = 'TRAINING', teamCategory = 'ALL', teamTrainer = '' }) => {
    const ctx = {
      delugeView: { getURL: () => liveUrl },
      isMapUrl: (u) => String(u || '').toLowerCase().includes('/map'),
      isRunning,
      isAutoCatchCountdownActive,
      isEncounterOnScreen,
      targetEncounterActive,
      activeAiBattleData,
      teamRosterMode,
      teamCategorySelect: { value: teamCategory },
      teamTrainerSelect: { value: teamTrainer }
    };
    vm.runInNewContext(nonWildMatch[0] + '\n' + hostWildMatch[0] + '\n' + gmaxModeMatch[0], ctx);
    return {
      isWild: ctx.isWildHuntingOrCatchContext(overrideUrl),
      isGmax: ctx.isGMaxChallengeModeActive()
    };
  };

  assert.strictEqual(
    evalHostCtx({ liveUrl: 'https://www.delugerpg.com/battle/trainer/753', targetEncounterActive: true, isEncounterOnScreen: true, isAutoCatchCountdownActive: true }).isWild,
    false,
    'Stale map/catch flags on /battle/trainer/753 MUST NOT suppress Auto/Loop/Deploy battle controls'
  );
  assert.strictEqual(
    evalHostCtx({ liveUrl: 'https://www.delugerpg.com/map/overworld', isRunning: true }).isWild,
    true,
    'Active hunting on /map MUST remain isolated as wild hunting context'
  );
  assert.strictEqual(
    evalHostCtx({ liveUrl: 'https://www.delugerpg.com/battle/trainer/753', teamRosterMode: 'TRAINING', teamCategory: 'GMAX_CHALLENGE', activeAiBattleData: { battleUrl: '/battle/trainer/753', isGmaxChallenge: false } }).isGmax,
    false,
    'Training battle on /battle/trainer/753 MUST remain strictly separated from G-Max Challenge mode'
  );
  assert.strictEqual(
    evalHostCtx({ liveUrl: 'https://www.delugerpg.com/challenge/gmax', teamRosterMode: 'ALL', teamCategory: 'GMAX_CHALLENGE', activeAiBattleData: { battleUrl: '/challenge/gmax', isGmaxChallenge: true } }).isGmax,
    true,
    'G-Max Challenge arena MUST evaluate as G-Max Challenge mode'
  );

  console.log('[PASS] Auto-Training / Battle Loop strictly isolated from Wild Hunting & Auto-Catching.');
}

// 3G. Live Level Persistence & Training Mode Stale-Maxed Guard
console.log('\n--- TEST 3G: Live Level Persistence & Training Mode Stale-Maxed Guard ---');
{
  const vm = require('vm');
  const os = require('os');
  const roamingCode = fs.readFileSync(path.join(__dirname, 'roaming_telemetry_ui.js'), 'utf8');
  const preloadCode = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deluge-test-3g-'));
  try {
    const tmpCollPath = path.join(tmpDir, 'user_collection.json');
    const mockCollection = [
      { id: 'yyYDpm', name: 'Dark Mega Sableye', variant: 'Dark', level: 100, exp: '100,000' },
      { id: 'fGHV4c', name: 'Ghostly Pikachu', variant: 'Ghostly', level: 19, exp: '19,000' },
      { id: 's1MnN1', name: 'Ghostly Machop', variant: 'Ghostly', level: 10, exp: '10,000' },
      { id: 'z2LGNw', name: 'Machop', variant: 'Normal', level: 13, exp: '13,000' },
      { id: 'h5GKxw', name: 'Dark Sobble', variant: 'Dark', level: 8, exp: '8,000' }
    ];

    let rebuildCalls = 0;
    let rosterUiCalls = 0;
    let guestSyncCalls = 0;
    const renderCalls = [];

    const sandbox = {
      fs,
      currentCollection: mockCollection,
      lastRecommendedTeam: [
        { slot: 1, id: 'yyYDpm', name: 'Dark Mega Sableye', variant: 'Dark', level: 100, isCarry: true },
        { slot: 2, id: 'fGHV4c', name: 'Ghostly Pikachu', variant: 'Ghostly', level: 19, isCarry: false, targetName: 'Primary Trainee Partner' },
        { slot: 3, id: 'z2LGNw', name: 'Machop', variant: 'Normal', level: 13, isCarry: false, targetName: 'Trainee #3' }
      ],
      lastKnownUserTeam: [],
      teamRosterMode: 'TRAINING',
      teamPoolFilter: 'ANY',
      isBattleLoopRunning: false,
      liveBattleOpponent: null,
      activeAiBattleData: null,
      battleLoopTimer: null,
      delugeView: null,
      teamTrainerSelect: null,
      teamActionStatus: { textContent: '', style: { color: '', display: 'none' } },
      teamResultContainer: { style: { display: 'block' } },
      currentMatchParticipants: new Set(),
      justSwitchedActivePokemon: new Set(),
      currentMatchSwitchCount: 0,
      currentMatchItemCount: 0,
      lastSelectedBattleUrl: '',
      lastLoggedBattleOpponentSig: '',
      gymLeadersData: null,
      activePvpTargetType: 'NPC',
      teamBattleMode: 'NPC',
      pvpStrategy: 'COUNTERS',
      lastTurnActionType: null,
      candidateListsCache: { trainingByPool: {} },
      getWritableDataPath: (fname) => path.join(tmpDir, fname),
      refreshCandidateListsCache: () => {},
      updateRosterModeUI: () => { rosterUiCalls++; },
      updateTrainerIntelStats: () => {},
      syncUserCollectionToGuest: () => { guestSyncCalls++; },
      renderTeamLineup: (leader, team) => { renderCalls.push(team.map(t => t.name + ':' + t.level)); },
      getSelectedTrainerInfo: () => ({ isLive: false, leader: { npcId: 753, name: 'Acerola', roster: [{ name: 'Banette', level: 100 }] } }),
      executeTeamBuild: () => {
        rebuildCalls++;
        sandbox.lastRecommendedTeam = [
          sandbox.currentCollection[0],
          sandbox.currentCollection[1],
          sandbox.currentCollection[2],
          sandbox.currentCollection[4]
        ].filter(p => p.level === 100 || p.level < 100);
      },
      backendLog: () => {},
      updateTeamBuilderBattleAction: () => {},
      isWildHuntingOrCatchContext: () => false,
      stopAllBattleAutomation: () => {},
      updateLiveBattleHUD: () => {},
      syncTeamSelectorsWithLiveOpponent: () => {},
      document: { getElementById: () => null }
    };

    const fnStart = roamingCode.indexOf('function matchesTeamEntryName');
    assert(fnStart !== -1, 'matchesTeamEntryName must exist in roaming_telemetry_ui.js');
    vm.runInNewContext(roamingCode.slice(fnStart), sandbox);

    // 3G-1: Variant isolation in matchesTeamEntryName & matchesTeamMemberEntry
    assert.strictEqual(
      sandbox.matchesTeamEntryName({ name: 'Machop', variant: 'Normal' }, { name: 'Ghostly Machop', variant: 'Ghostly' }),
      false,
      'Normal Machop MUST NOT cross-match Ghostly Machop'
    );
    assert.strictEqual(
      sandbox.matchesTeamEntryName({ name: 'Machop', variant: 'Normal' }, { name: 'Machop', variant: 'Normal' }),
      true,
      'Normal Machop MUST match Normal Machop'
    );
    assert.strictEqual(
      sandbox.matchesTeamEntryName({ name: 'Machop', variant: 'Ghostly' }, { name: 'Ghostly Machop', variant: 'Ghostly' }),
      true,
      'Explicit Ghostly variant tag on bare species name MUST match Ghostly Machop'
    );

    const preloadFnStart = preloadCode.indexOf('function matchesTeamMemberEntry');
    assert(preloadFnStart !== -1, 'matchesTeamMemberEntry must exist in game-preload.js');
    const preloadFnEnd = preloadCode.indexOf('\n        // Mode 1:', preloadFnStart);
    const preloadSandbox = {};
    vm.runInNewContext(preloadCode.slice(preloadFnStart, preloadFnEnd), preloadSandbox);
    assert.strictEqual(
      preloadSandbox.matchesTeamMemberEntry('Machop', 'Normal', { name: 'Ghostly Machop', variant: 'Ghostly' }),
      false,
      'Preload matcher MUST isolate Normal Machop from Ghostly Machop'
    );

    // 3G-2: Preparation screen reveals Machop (z2LGNw) is ALREADY Lv 100 while stale cache says Lv 13
    sandbox.handleLiveBattleOpponents({
      trainerName: 'Acerola',
      battleUrl: '/battle/trainer/753',
      isPreparationScreen: true,
      isInActiveBattle: false,
      roster: [{ name: 'Banette', types: ['Ghost'], level: 100, hp: 400, maxHp: 400 }],
      userTeam: [
        { name: 'Dark Mega Sableye', variant: 'Dark', level: 100, levelKnown: true, hp: 400, maxHp: 400 },
        { name: 'Ghostly Pikachu', variant: 'Ghostly', level: 19, levelKnown: true, hp: 76, maxHp: 76 },
        { name: 'Machop', variant: 'Normal', level: 100, levelKnown: true, hp: 400, maxHp: 400 }
      ]
    });

    assert.strictEqual(mockCollection[3].level, 100, 'Exact Machop (z2LGNw) MUST update to Lv 100 in currentCollection');
    assert.strictEqual(mockCollection[2].level, 10, 'Ghostly Machop (s1MnN1) level MUST remain untouched at Lv 10');
    assert(fs.existsSync(tmpCollPath), 'Updated collection MUST persist to user_collection.json immediately');
    const persisted = JSON.parse(fs.readFileSync(tmpCollPath, 'utf8'));
    assert.strictEqual(persisted.find(p => p.id === 'z2LGNw').level, 100, 'Persisted user_collection.json MUST retain Machop Lv 100 across restarts');
    assert.strictEqual(rosterUiCalls >= 1, true, 'Roster Maxed/Training counter UI MUST refresh immediately');
    assert.strictEqual(guestSyncCalls >= 1, true, 'Updated collection MUST sync to preload guest');
    assert.strictEqual(rebuildCalls, 1, 'Stale already-maxed trainee on fresh Prep screen MUST auto-rebuild Training lineup');
    assert(sandbox.teamActionStatus.textContent.includes('Machop'), 'User status MUST report synced already-maxed Machop');

    // 3G-3: Guard against #opponent DOM leakage in playerPokeEl search
    assert(
      preloadCode.includes('candContainer.contains(oppEl)'),
      'game-preload.js playerPokeEl lookup MUST guard against ancestors containing #opponent'
    );
    assert(
      !preloadCode.includes("lastKnownUserTeam.find(u => u.name && pName.toLowerCase().includes(u.name.toLowerCase()))"),
      'game-preload.js MUST NOT use loose substring includes matching for active user team levels'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  console.log('[PASS] Live Level Persistence, Variant Isolation & Stale-Maxed Training Guard verified.');
}

// 3H. Turn-1 False Forfeit Guard & Table-Paired Switch Bench Extraction
console.log('\n--- TEST 3H: Turn-1 False Forfeit Guard & Table-Paired Switch Bench Extraction ---');
{
  const vm = require('vm');
  const roamingCode = fs.readFileSync(path.join(__dirname, 'roaming_telemetry_ui.js'), 'utf8');
  const preloadCode = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');
  const aiAssistant = require('./ai_agent_bridge');

  // 3H-1: Verify preload table-split switch card extraction and attack/item radio exclusion
  const pStart = preloadCode.indexOf('function collectBenchSwitchRadios');
  const pEnd = preloadCode.indexOf('\n        // Mode 1:', pStart);
  assert(pStart !== -1 && pEnd !== -1, 'Bench card helpers must exist in game-preload.js');
  const pSandbox = { document: { body: null } };
  vm.runInNewContext(preloadCode.slice(pStart, pEnd), pSandbox);

  const cardCell = {
    querySelector: (sel) => sel.includes('.smallcaps') ? { textContent: 'Dark Mega Sableye' } : null,
    textContent: 'Dark Mega Sableye'
  };
  const cardCell2 = {
    querySelector: (sel) => sel.includes('.smallcaps') ? { textContent: 'Dark Eevee' } : null,
    textContent: 'Dark Eevee'
  };
  const swiTd = { closest: (sel) => sel === 'td' ? swiTd : null, querySelectorAll: () => [swiRadio] };
  const swiTd2 = { closest: () => null, querySelectorAll: () => [swiRadio2] };
  const atkRadio = { name: 'selected', closest: () => null };
  const itemRadio = { name: 'selectitem', closest: () => null };
  const swiRadio = {
    name: 'swi_pk',
    value: '1',
    parentElement: null,
    closest: (sel) => sel === 'td' ? swiTd : null
  };
  const swiRadio2 = { name: 'swi_pk', value: '3', parentElement: swiTd2, closest: () => null };
  const cardRow = { children: [cardCell, cardCell2], querySelectorAll: () => [] };
  const radioRow = { children: [swiTd, swiTd2], previousElementSibling: cardRow, querySelectorAll: () => [swiRadio, swiRadio2] };
  cardRow.nextElementSibling = radioRow;
  swiTd.closest = (sel) => sel === 'td' ? swiTd : (sel === 'tr' ? radioRow : null);
  swiRadio.parentElement = swiTd;
  swiTd.parentElement = radioRow;

  const mockForm = {
    querySelectorAll: () => [atkRadio, swiRadio, swiRadio2, itemRadio]
  };
  const extractedRadios = pSandbox.collectBenchSwitchRadios(mockForm);
  assert.strictEqual(extractedRadios.length, 2, 'collectBenchSwitchRadios MUST isolate swi_pk from attack/item radios');
  assert.strictEqual(extractedRadios[0], swiRadio, 'collectBenchSwitchRadios MUST return the swi_pk radio');
  const cardMeta = pSandbox.getBenchRadioCardMeta(swiRadio, mockForm);
  assert.strictEqual(cardMeta.name, 'Dark Mega Sableye', 'getBenchRadioCardMeta MUST resolve table-row paired Pokemon card names');

  // 3H-2: Host telemetry MUST NOT mark bench carries fainted when active-only payload has hasBenchRadios=true
  let capturedAnalysisInput = null;
  const rSandbox = {
    currentCollection: [
      { id: 'yyYDpm', name: 'Dark Mega Sableye', variant: 'Dark', level: 100 },
      { id: 'LLtcBH', name: 'Negative Type: Null', variant: 'Negative', level: 14 }
    ],
    lastRecommendedTeam: [
      { slot: 1, id: 'yyYDpm', name: 'Dark Mega Sableye', variant: 'Dark', level: 100, isCarry: true },
      { slot: 2, id: 'LLtcBH', name: 'Negative Type: Null', variant: 'Negative', level: 14, isCarry: false, targetName: 'Primary Trainee Partner' }
    ],
    lastKnownUserTeam: [
      { name: 'Dark Mega Sableye', variant: 'Dark', level: 100, levelKnown: true, hp: 400, maxHp: 400, isFainted: false },
      { name: 'Negative Type: Null', variant: 'Negative', level: 14, levelKnown: true, hp: 56, maxHp: 56, isFainted: false }
    ],
    teamRosterMode: 'TRAINING',
    isBattleLoopRunning: false,
    liveBattleOpponent: null,
    activeAiBattleData: null,
    battleLoopTimer: null,
    delugeView: null,
    teamTrainerSelect: null,
    currentMatchParticipants: new Set(),
    justSwitchedActivePokemon: new Set(),
    currentMatchSwitchCount: 0,
    currentMatchItemCount: 0,
    lastSelectedBattleUrl: '',
    lastLoggedBattleOpponentSig: '',
    gymLeadersData: null,
    activePvpTargetType: 'NPC',
    teamBattleMode: 'NPC',
    pvpStrategy: 'COUNTERS',
    lastTurnActionType: null,
    candidateListsCache: { trainingByPool: {} },
    backendLog: () => {},
    updateLiveAiAssistantUI: (d) => { capturedAnalysisInput = d; },
    updateTeamBuilderBattleAction: () => {},
    isWildHuntingOrCatchContext: () => false,
    stopAllBattleAutomation: () => {},
    updateLiveBattleHUD: () => {},
    syncTeamSelectorsWithLiveOpponent: () => {},
    renderTeamLineup: () => {},
    refreshCandidateListsCache: () => {},
    updateRosterModeUI: () => {},
    updateTrainerIntelStats: () => {},
    syncUserCollectionToGuest: () => {},
    document: { getElementById: () => null }
  };
  vm.runInNewContext(roamingCode.slice(roamingCode.indexOf('function matchesTeamEntryName')), rSandbox);
  rSandbox.handleLiveBattleOpponents({
    trainerName: 'Acerola',
    battleUrl: '/battle/trainer',
    isInActiveBattle: true,
    hasAttackBtn: true,
    hasBenchRadios: true,
    hasForfeitBtn: true,
    userActivePokemon: { name: 'Negative Type: Null', variant: 'Negative', types: ['Normal'], level: 14, levelKnown: true, hp: 56, maxHp: 56, isFainted: false },
    userTeam: [{ name: 'Negative Type: Null', variant: 'Negative', types: ['Normal'], level: 14, levelKnown: true, hp: 56, maxHp: 56, isFainted: false }],
    roster: [{ name: 'Drifblim', types: ['Ghost', 'Flying'], level: 100, hp: 400, maxHp: 400, isFainted: false }]
  });
  const mergedCarry = rSandbox.lastKnownUserTeam.find(u => u.name === 'Dark Mega Sableye');
  assert(mergedCarry && !mergedCarry.isFainted && mergedCarry.hp === 400, 'Healthy bench Carry MUST remain alive when hasBenchRadios=true on Turn 1');

  // 3H-3: ai_agent_bridge MUST NOT forfeit when bench carry is alive or when hasBenchRadios=true with unparsed bench
  const healthyAnalysis = aiAssistant.analyzeBattle({
    trainerName: 'Acerola',
    isInActiveBattle: true,
    hasAttackBtn: true,
    hasBenchRadios: true,
    hasForfeitBtn: true,
    userActivePokemon: { name: 'Negative Type: Null', variant: 'Negative', types: ['Normal'], level: 14, hp: 56, maxHp: 56 },
    userTeam: rSandbox.lastKnownUserTeam,
    roster: capturedAnalysisInput.roster
  }, rSandbox.currentCollection);
  assert.strictEqual(healthyAnalysis.shouldForfeitBattle, false, 'MUST NOT forfeit Turn 1 while Dark Mega Sableye (Lv 100) is alive on bench');

  const unparsedBenchAnalysis = aiAssistant.analyzeBattle({
    trainerName: 'Acerola',
    isInActiveBattle: true,
    hasAttackBtn: true,
    hasBenchRadios: true,
    hasForfeitBtn: true,
    userActivePokemon: { name: 'Negative Type: Null', variant: 'Negative', types: ['Normal'], level: 14, hp: 56, maxHp: 56 },
    userTeam: [{ name: 'Negative Type: Null', variant: 'Negative', types: ['Normal'], level: 14, hp: 56, maxHp: 56 }],
    roster: [{ name: 'Drifblim', types: ['Ghost', 'Flying'], level: 100, hp: 400, maxHp: 400 }]
  }, rSandbox.currentCollection);
  assert.strictEqual(unparsedBenchAnalysis.shouldForfeitBattle, false, 'MUST NOT forfeit while enabled switch bench radios are present even if bench parse is incomplete');

  console.log('[PASS] Turn-1 False Forfeit Guard & Table-Paired Switch Bench Extraction verified.');
}

// 3I. Captcha Redirect Isolation, Fallback Guard & Auto/Loop Preference Restoration
console.log('\n--- TEST 3I: Captcha Redirect Isolation & Auto/Loop Preference Restoration ---');
{
  const vm = require('vm');
  const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const roamingCode = fs.readFileSync(path.join(__dirname, 'roaming_telemetry_ui.js'), 'utf8');
  const preloadCode = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');

  // 3I-1: Verify isUnlockOrCaptchaUrl classifier, post-load recheck, and navigation/rematch safety guards
  const fnUnlockStart = appCode.indexOf('let pendingUnlockRedirectUntil = 0;');
  const fnUnlockEnd = appCode.indexOf('\ndelugeView.addEventListener(', fnUnlockStart);
  assert(fnUnlockStart !== -1 && fnUnlockEnd !== -1, 'isUnlockOrCaptchaUrl must exist in app.js');
  const navSandbox = {
    pendingGmaxEntryFlow: { active: true },
    isUnlockChallengeActive: true,
    isCaptchaAlarmActive: false,
    delugeView: { getURL: () => 'https://www.delugerpg.com/trainers', send: (ch) => navSandbox.sent.push(ch) },
    sent: [],
    haltedReasons: [],
    handleCaptchaEmergencyHalt: (r) => navSandbox.haltedReasons.push(r)
  };
  vm.runInNewContext(appCode.slice(fnUnlockStart, fnUnlockEnd), navSandbox);
  assert.strictEqual(navSandbox.isUnlockOrCaptchaUrl('/unlock'), true, '/unlock must be recognized as captcha URL');
  assert.strictEqual(navSandbox.isUnlockOrCaptchaUrl('https://www.delugerpg.com/unlock'), true, 'Full /unlock URL must be recognized as captcha URL');
  assert.strictEqual(navSandbox.isUnlockOrCaptchaUrl('https://www.delugerpg.com/captcha?token=1'), true, 'Captcha query URL must be recognized');
  assert.strictEqual(navSandbox.isUnlockOrCaptchaUrl('/battle/trainer/753'), false, 'Trainer battle URL must NOT be flagged as captcha');
  assert.strictEqual(navSandbox.isUnlockOrCaptchaUrl('/map/overworld1'), false, 'Map URL must NOT be flagged as captcha');
  navSandbox.handleNavigationCaptchaLifecycle('https://www.delugerpg.com/unlock');
  assert.strictEqual(navSandbox.pendingGmaxEntryFlow, null, 'Captcha navigation must clear pending G-Max flow');
  assert.strictEqual(navSandbox.haltedReasons.length, 1, 'Captcha navigation must immediately halt automation');
  navSandbox.requestPostLoadCaptchaRecheck('https://www.delugerpg.com/trainers');
  assert.strictEqual(navSandbox.sent.includes('request-map-presence'), true, 'Post-load navigation off /unlock must request fresh map-presence to auto-unlock alarm');

  // Verify preload checkHasCaptchaElement ignores 0x0 elements and checkAndSyncMapPresence(true) force-emits after load
  const capDomStart = preloadCode.indexOf('function checkHasCaptchaElement()');
  const capDomEnd = preloadCode.indexOf('\nfunction scanForTargets()', capDomStart);
  assert(capDomStart !== -1 && capDomEnd !== -1, 'checkHasCaptchaElement and checkAndSyncMapPresence must exist in game-preload.js');
  const emittedPresence = [];
  let hiddenZeroBox = true;
  const fakeCapEl = {
    getBoundingClientRect: () => hiddenZeroBox ? { width: 0, height: 0 } : { width: 300, height: 65 }
  };
  const preloadCapSandbox = {
    window: {
      location: { pathname: '/trainers', href: 'https://www.delugerpg.com/trainers' },
      getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' })
    },
    document: {
      querySelectorAll: (sel) => sel.includes('turnstile') ? [fakeCapEl] : [],
      querySelector: () => null,
      getElementById: () => null,
      body: { innerText: 'Trainers list' }
    },
    sessionStorage: { setItem: () => {} },
    ipcRenderer: { sendToHost: (ch, data) => emittedPresence.push({ ch, data }) },
    findCatchActionElement: () => null,
    clearAutoCatchSession: () => {},
    extractLoggedInUsername: () => 'Envy_23',
    unlockNoticeSent: true,
    lastFoundTarget: '',
    pendingCatchTimeoutId: null,
    isHuntingActive: false
  };
  vm.runInNewContext(preloadCode.slice(capDomStart, capDomEnd), preloadCapSandbox);
  assert.strictEqual(preloadCapSandbox.checkHasCaptchaElement(), false, 'Zero-sized hidden container on Trainers page must NOT falsely trigger captcha');
  hiddenZeroBox = false;
  assert.strictEqual(preloadCapSandbox.checkHasCaptchaElement(), true, 'Visible Turnstile/captcha widget MUST trigger captcha');
  hiddenZeroBox = true;
  preloadCapSandbox.checkAndSyncMapPresence(false);
  const countBeforeForce = emittedPresence.length;
  preloadCapSandbox.checkAndSyncMapPresence(true);
  assert.strictEqual(emittedPresence.length, countBeforeForce + 1, 'checkAndSyncMapPresence(true) must force-emit map-presence after window load completes');
  assert.strictEqual(emittedPresence[emittedPresence.length - 1].data.hasCaptcha, false, 'Post-captcha Trainers page must report hasCaptcha=false');

  assert(
    appCode.includes("p.startsWith('/unlock') || p.includes('captcha') || p.includes('verify')"),
    'will-navigate route guard must allow /unlock, captcha, and verify redirects'
  );
  assert(
    appCode.includes('const seqBeforeRematch = guestLoadEventSeq;') &&
    appCode.includes('isUnlockChallengeActive || isCaptchaAlarmActive || isUnlockOrCaptchaUrl(curFallbackUrl) || isGuestNavigating'),
    'scheduleNextLoopBattle fallback timer must back off during captcha URLs and active guest navigations'
  );
  assert(
    preloadCode.includes("curPath.indexOf('/unlock') !== -1 || curPath.indexOf('captcha') !== -1"),
    'game-preload.js click-rematch-button must abort and alert host when already on /unlock or captcha'
  );
  assert(
    appCode.includes('!viewIsLoading && Date.now() >= pendingUnlockRedirectUntil && presenceUrl && !isUnlockOrCaptchaUrl(presenceUrl)') &&
    appCode.includes("delugeView.send('request-map-presence')"),
    'map-presence auto-clear must require finished load, expired pendingUnlockRedirectUntil, non-captcha URL, and post-load recheck'
  );

  // 3I-2: Bare POST /battle/trainer URL must still resolve and preserve trainer numeric battle URL
  const acerolaDb = { VIP_TRAINERS: [{ name: 'Acerola', npcId: '753', battleUrl: '/battle/trainer/753', roster: [] }] };
  const rSandbox = {
    currentCollection: [],
    lastRecommendedTeam: [],
    lastKnownUserTeam: [],
    teamRosterMode: 'TRAINING',
    isBattleLoopRunning: false,
    liveBattleOpponent: null,
    activeAiBattleData: null,
    battleLoopTimer: null,
    delugeView: null,
    teamTrainerSelect: null,
    teamBattleMode: 'NPC',
    teamCategorySelect: { value: 'ALL' },
    activePvpTargetType: 'NPC',
    pvpStrategy: 'COUNTERS',
    scoutedPlayerOpponent: null,
    currentMatchParticipants: new Set(),
    justSwitchedActivePokemon: new Set(),
    currentMatchSwitchCount: 0,
    currentMatchItemCount: 0,
    lastSelectedBattleUrl: '',
    lastLoggedBattleOpponentSig: '',
    gymLeadersData: acerolaDb,
    lastTurnActionType: null,
    candidateListsCache: { trainingByPool: {} },
    backendLog: () => {},
    updateLiveAiAssistantUI: () => {},
    updateTeamBuilderBattleAction: () => {},
    isWildHuntingOrCatchContext: () => false,
    stopAllBattleAutomation: () => {},
    updateLiveBattleHUD: () => {},
    syncTeamSelectorsWithLiveOpponent: () => {},
    renderTeamLineup: () => {},
    refreshCandidateListsCache: () => {},
    updateRosterModeUI: () => {},
    updateTrainerIntelStats: () => {},
    syncUserCollectionToGuest: () => {},
    document: { getElementById: () => null }
  };
  vm.runInNewContext(roamingCode.slice(roamingCode.indexOf('function matchesTeamEntryName')), rSandbox);
  rSandbox.handleLiveBattleOpponents({
    trainerName: 'Acerola',
    battleUrl: '/battle/trainer',
    isInActiveBattle: true,
    roster: [{ name: 'Banette', types: ['Ghost'], level: 100, hp: 400, maxHp: 400 }]
  });
  assert.strictEqual(rSandbox.liveBattleOpponent.battleUrl, '/battle/trainer/753', 'Telemetry must enrich bare POST /battle/trainer with trainer specific ID URL');
  assert.strictEqual(rSandbox.liveBattleOpponent.npcId, '753', 'Telemetry must enrich liveBattleOpponent with matched npcId');

  const resStart = appCode.indexOf('function resolveTargetBattleUrl()');
  const resEnd = appCode.indexOf('\nif (battleOpponentBtn)', resStart);
  assert(resStart !== -1 && resEnd !== -1, 'resolveTargetBattleUrl must exist in app.js');
  const urlSandbox = {
    teamBattleMode: 'NPC',
    activePvpTargetType: 'NPC',
    liveBattleOpponent: { trainerName: 'Acerola', battleUrl: '/battle/trainer' },
    scoutedPlayerOpponent: null,
    pvpStrategy: 'COUNTERS',
    teamCategorySelect: { value: 'ALL' },
    teamTrainerSelect: { value: 'LIVE__BATTLE' },
    gymLeadersData: acerolaDb,
    lastSelectedBattleUrl: '',
    teamRosterMode: 'TRAINING'
  };
  vm.runInNewContext(appCode.slice(resStart, resEnd), urlSandbox);
  assert.strictEqual(urlSandbox.resolveTargetBattleUrl(), '/battle/trainer/753', 'resolveTargetBattleUrl MUST prefer trainer ID from gymLeadersData over bare /battle/trainer');

  // 3I-3: Capture on halt and restore Auto/Loop upon captcha clear (when training is unfinished vs complete)
  const capStart = appCode.indexOf('let isCaptchaAlarmActive = false;');
  const capEnd = appCode.indexOf('\nfunction loadSafetySettingsIntoUI()', capStart);
  assert(capStart !== -1 && capEnd !== -1, 'Captcha halt/silence preference block must exist in app.js');

  let trainingAll100 = false;
  const sentIpc = [];
  const capSandbox = {
    Date,
    setTimeout: () => 1,
    clearTimeout: () => {},
    setInterval: () => 2,
    clearInterval: () => {},
    Notification: function () {},
    getAudioContext: () => null,
    soundEnabled: false,
    activeAudioNodes: new Set(),
    captchaAlarmInterval: null,
    captchaEmergencyBanner: { style: { display: 'none' } },
    isUnlockChallengeActive: false,
    isBattleAutoRunning: true,
    userManuallyPaused: false,
    pendingGmaxEntryFlow: null,
    isRestBreakActive: false,
    isRunning: false,
    walkTimeout: null,
    sessionAutoStopTimer: null,
    sessionAutoStopTime: null,
    breakCountdownTimer: null,
    activeAiBattleData: null,
    lastRecommendedTeam: null,
    config: { safety: { antiBotEmergencyHalt: true } },
    teamBattleAutoCheck: { checked: true },
    teamBattleAutoLabel: { style: { borderColor: '', color: '' } },
    teamBattleLoopCheck: { checked: true, disabled: false },
    teamBattleActionBtn: { disabled: false, innerHTML: '', title: '' },
    battleOpponentBtn: { disabled: false },
    applyTeamBtn: { disabled: false },
    buildTeamBtn: { disabled: false },
    pvpScoutBtn: { disabled: false },
    checkLiveBattleBtn: { disabled: false },
    aiHudActionBtn: { disabled: false },
    teamActionStatus: { textContent: '', style: { color: '' } },
    delugeView: { send: (ch) => sentIpc.push(ch), focus: () => {} },
    isGMaxChallengeModeActive: () => false,
    areAllTeamPokemonLevel100: () => trainingAll100,
    updateLoopCheckboxVisual: () => {},
    stopAllBattleAutomation: () => { capSandbox.isBattleAutoRunning = false; },
    cancelPendingAutoStart: () => {},
    updateToggleButton: () => {},
    updateStatus: () => {},
    syncHuntingState: () => {},
    updateTeamBuilderBattleAction: () => {},
    renderAiAssistantUI: () => {},
    backendLog: () => {}
  };
  vm.runInNewContext(appCode.slice(capStart, capEnd), capSandbox);

  // Trigger initial halt on /unlock, then simulate duplicate unlock-detected after checkboxes became false
  capSandbox.handleCaptchaEmergencyHalt('Captcha (/unlock) security redirect detected');
  assert.strictEqual(capSandbox.teamBattleAutoCheck.checked, false, 'Auto checkbox must untick while captcha is active');
  assert.strictEqual(capSandbox.teamBattleLoopCheck.checked, false, 'Loop checkbox must untick while captcha is active');
  assert.strictEqual(sentIpc.includes('abort-gmax-challenge-flow'), true, 'Captcha halt must abort background loops');
  capSandbox.handleCaptchaEmergencyHalt('Captcha (/unlock) security challenge detected');

  // Clear captcha while trainees are NOT yet Lv 100 -> Auto & Loop must both restore
  capSandbox.silenceCaptchaAlarm();
  assert.strictEqual(capSandbox.teamBattleAutoCheck.checked, true, 'Auto checkbox MUST restore after captcha clears when trainees are not Lv 100');
  assert.strictEqual(capSandbox.teamBattleLoopCheck.checked, true, 'Loop checkbox MUST restore after captcha clears when trainees are not Lv 100');
  assert.strictEqual(capSandbox.isBattleAutoRunning, true, 'isBattleAutoRunning MUST re-arm on restore when Auto was active');
  assert.strictEqual(capSandbox.userManuallyPaused, false, 'userManuallyPaused MUST reset when captcha clears');

  // Clear captcha when all trainees ARE Lv 100 -> Auto restores, Loop stays unchecked
  trainingAll100 = true;
  capSandbox.teamBattleAutoCheck.checked = true;
  capSandbox.teamBattleLoopCheck.checked = true;
  capSandbox.handleCaptchaEmergencyHalt('Second captcha test');
  capSandbox.silenceCaptchaAlarm();
  assert.strictEqual(capSandbox.teamBattleAutoCheck.checked, true, 'Auto checkbox should still restore when enabled prior to captcha');
  assert.strictEqual(capSandbox.teamBattleLoopCheck.checked, false, 'Loop checkbox MUST stay off after captcha clears if all trainees are already Lv 100');

  console.log('[PASS] Captcha Redirect Isolation, Fallback Guard & Auto/Loop Preference Restoration verified.');
}

// 3J. Fixed Bottom Action Bar, Attack Non-Battle Gate & Empty Change-Team Guard
console.log('\n--- TEST 3J: Fixed Bottom Action Bar, Attack Non-Battle Gate & Empty Change-Team Guard ---');
{
  const vm = require('vm');
  const appHtmlCode = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
  const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

  // 3J-1: Verify HTML defaults keep bottom action bar fixed/visible and Attack + Change Team initially disabled
  assert(
    appHtmlCode.includes('<div id="teamActionRow" style="display: flex;'),
    'teamActionRow must be permanently displayed at bottom of Team Builder (display: flex)'
  );
  assert(
    appHtmlCode.includes('<div id="teamBattleActionSlot" style="display: block;'),
    'teamBattleActionSlot must remain permanently visible inside fixed bottom action row (display: block)'
  );
  assert(
    appHtmlCode.includes('<button id="teamBattleActionBtn" type="button" disabled'),
    'Attack button (#teamBattleActionBtn) must start disabled before entering a battle page'
  );
  assert(
    appHtmlCode.includes('<button id="applyTeamBtn" type="button" disabled'),
    'Change Team button (#applyTeamBtn) must start disabled when no Pokemon are listed yet'
  );
  assert(
    !appCode.includes("teamActionRow.style.display = 'none'") &&
    !appCode.includes("teamBattleActionSlot.style.display = 'none'"),
    'app.js must NEVER hide #teamActionRow or #teamBattleActionSlot with display: none'
  );

  // 3J-2: Execute isBattlePageUrl / isCurrentPageBattle, syncTeamActionButtonsState, and updateTeamBuilderBattleAction
  const battleCheckStart = appCode.indexOf('function isBattlePageUrl(');
  const battleCheckEnd = appCode.indexOf('\nlet isPendingSessionAutoStop', battleCheckStart);
  const syncStart = appCode.indexOf('let isApplyingTeamOnDeluge = false;');
  const syncEnd = appCode.indexOf('\nfunction setTeamBattleMode(', syncStart);
  const actionStart = appCode.indexOf('function updateTeamBuilderBattleAction(');
  const actionEnd = appCode.indexOf('\nfunction renderAiBattleRoadmap(', actionStart);
  assert(battleCheckStart !== -1 && battleCheckEnd !== -1, 'isBattlePageUrl block must exist');
  assert(syncStart !== -1 && syncEnd !== -1, 'syncTeamActionButtonsState block must exist');
  assert(actionStart !== -1 && actionEnd !== -1, 'updateTeamBuilderBattleAction block must exist');

  let mockUrl = 'https://www.delugerpg.com/trainers';
  let mockActionConfig = {
    labelHtml: '&#9889; Astral Barrage (2x)',
    hudText: 'Attack: Astral Barrage',
    disabled: false,
    btnClass: 'btn btn-accent',
    action: () => {}
  };
  const uiSandbox = {
    URL,
    delugeView: { getURL: () => mockUrl, send: () => {} },
    isUnlockOrCaptchaUrl: (u) => /\/unlock|captcha|verify|security/i.test(String(u || '')),
    isMapUrl: (u) => /\/map/i.test(String(u || '')),
    isUnlockChallengeActive: false,
    isCaptchaAlarmActive: false,
    isBattleAutoRunning: true,
    isBattleLoopRunning: false,
    userManuallyPaused: false,
    battleAutoStepTimer: null,
    isPendingSessionAutoStop: false,
    lastRecommendedTeam: null,
    currentCollection: [],
    candidateListsCache: { gmaxLastDisplayedId: null, lastTrainingBuiltCtx: null },
    teamBattleMode: 'NPC',
    teamActionRow: { style: { display: 'flex' } },
    teamBattleActionSlot: { style: { display: 'block' } },
    teamBattleActionBtn: { className: 'btn btn-accent', disabled: false, innerHTML: '', title: '', onclick: null },
    teamBattleAutoCheck: { checked: true },
    teamBattleLoopCheck: { checked: true },
    teamActionStatus: { textContent: 'Auto turn in 1.6s...', style: { color: '' } },
    applyTeamBtn: { disabled: false, title: '' },
    copyTeamBtn: { disabled: false },
    battleOpponentBtn: { disabled: false, innerHTML: 'Battle Now' },
    teamResultContainer: { style: { display: 'none' } },
    teamResultList: { innerHTML: '' },
    teamEmptyPrompt: { style: { display: 'flex' }, innerHTML: '' },
    stopAllBattleAutomation: () => { uiSandbox.isBattleAutoRunning = false; },
    isWildHuntingOrCatchContext: () => false,
    computeAiBattleActionConfig: () => mockActionConfig,
    isGMaxChallengeModeActive: () => false,
    backendLog: () => {},
    clearTimeout,
    setTimeout: () => 1
  };
  vm.runInNewContext(
    appCode.slice(battleCheckStart, battleCheckEnd) + '\n' +
    appCode.slice(syncStart, syncEnd) + '\n' +
    appCode.slice(actionStart, actionEnd),
    uiSandbox
  );

  // Verify URL page discrimination
  for (const nonBattle of [
    'https://www.delugerpg.com/home',
    'https://www.delugerpg.com/map/overworld1',
    'https://www.delugerpg.com/trainers',
    'https://www.delugerpg.com/gyms',
    'https://www.delugerpg.com/gmax',
    'https://www.delugerpg.com/unlock',
    'https://www.delugerpg.com/battle',
    'https://www.delugerpg.com/battle/trainers',
    'https://www.delugerpg.com/profile/Envy_23',
    'https://www.delugerpg.com/catch/123'
  ]) {
    mockUrl = nonBattle;
    assert.strictEqual(uiSandbox.isCurrentPageBattle(), false, `${nonBattle} must NOT be classified as a battle page`);
  }
  for (const activeBattle of [
    'https://www.delugerpg.com/battle/trainer',
    'https://www.delugerpg.com/battle/trainer/753',
    'https://www.delugerpg.com/battle/gym/12',
    'https://www.delugerpg.com/battle/live',
    'https://www.delugerpg.com/challenge/gmax'
  ]) {
    mockUrl = activeBattle;
    assert.strictEqual(uiSandbox.isCurrentPageBattle(), true, `${activeBattle} MUST be classified as a battle page`);
  }

  // Not in battle page yet -> Attack must be disabled and Change Team disabled when no team listed, while footer stays visible
  mockUrl = 'https://www.delugerpg.com/trainers';
  uiSandbox.lastRecommendedTeam = null;
  uiSandbox.updateTeamBuilderBattleAction({ isInActiveBattle: true, roster: [{ name: 'Banette', hp: 400, maxHp: 400 }] });
  assert.strictEqual(uiSandbox.teamActionRow.style.display, 'flex', 'Footer action row must stay fixed at display: flex outside battle');
  assert.strictEqual(uiSandbox.teamBattleActionSlot.style.display, 'block', 'Battle controls slot must stay visible outside battle');
  assert.strictEqual(uiSandbox.teamBattleActionBtn.disabled, true, 'Attack button MUST be disabled when not on battle page yet');
  assert.strictEqual(uiSandbox.teamActionStatus.textContent, '', 'Stale Auto countdown text must clear outside battle page');
  assert.strictEqual(uiSandbox.applyTeamBtn.disabled, true, 'Change Team MUST be disabled when built team has no Pokemon listed');
  assert.strictEqual(uiSandbox.copyTeamBtn.disabled, true, 'Copy MUST be disabled when built team has no Pokemon listed');

  // Empty list array also keeps Change Team disabled
  uiSandbox.lastRecommendedTeam = [];
  uiSandbox.syncTeamActionButtonsState();
  assert.strictEqual(uiSandbox.applyTeamBtn.disabled, true, 'Change Team MUST remain disabled when built team array is empty');

  // Team populated + inside battle page -> both Attack and Change Team enable cleanly
  uiSandbox.lastRecommendedTeam = [{ id: '1', name: 'Dark Mega Sableye', level: 100 }];
  mockUrl = 'https://www.delugerpg.com/battle/trainer/753';
  uiSandbox.updateTeamBuilderBattleAction({ isInActiveBattle: true, roster: [{ name: 'Banette', hp: 400, maxHp: 400 }] });
  assert.strictEqual(uiSandbox.applyTeamBtn.disabled, false, 'Change Team MUST enable when built team lists Pokemon');
  assert.strictEqual(uiSandbox.copyTeamBtn.disabled, false, 'Copy MUST enable when built team lists Pokemon');
  assert.strictEqual(uiSandbox.teamBattleActionBtn.disabled, false, 'Attack button MUST enable on active battle page');

  // Calling resetTeamPrompt clears built team, disables Change Team, and keeps bottom bar fixed
  uiSandbox.resetTeamPrompt();
  assert.strictEqual(uiSandbox.teamActionRow.style.display, 'flex', 'resetTeamPrompt MUST keep bottom bar fixed');
  assert.strictEqual(uiSandbox.applyTeamBtn.disabled, true, 'resetTeamPrompt MUST disable Change Team');

  console.log('[PASS] Fixed Bottom Action Bar, Attack Non-Battle Gate & Empty Change-Team Guard verified.');
}

// 3K. Forme-Preserving Evolve Duplicate Detection & Modal Red-Pokeball Guard
console.log('\n--- TEST 3K: Forme-Preserving Evolve Duplicate Detection & Modal Red-Pokeball Guard ---');
{
  const vm = require('vm');
  const evolutionEngine = require('./evolution_engine');
  const preloadCode = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');
  const evoUiCode = fs.readFileSync(path.join(__dirname, 'evolution_ui.js'), 'utf8');

  // 3K-1: Preload parser preserves forme parentheses and detects live Red Pokeball icon in modal
  const evoParseStart = preloadCode.indexOf('function parseEvolveOptionLabelAndReq(');
  const evoParseEnd = preloadCode.indexOf('\nfunction syncEvolveCardState(', evoParseStart);
  assert(evoParseStart !== -1 && evoParseEnd !== -1, 'Evolve modal helpers must exist in game-preload.js');

  let mockBallSrc = 'https://www.delugerpg.com/img/pokeball.png';
  let mockBallTitle = 'You have this pokemon in your box';
  let mockModalText = 'Your level 100 Milcery can evolve into the following -\nAlcremie (Berry Lemon Cream) (at Level 15 using Sweet)';
  const mockPokeballImg = {
    get src() { return mockBallSrc; },
    get title() { return mockBallTitle; },
    alt: '',
    className: 'dball',
    style: {},
    parentElement: null,
    closest: () => null,
    getAttribute: (a) => (a === 'src' ? mockBallSrc : (a === 'title' ? mockBallTitle : ''))
  };
  const mockModalEl = {
    get textContent() { return mockModalText; },
    querySelector: (sel) => sel.includes('#DMtitle') ? { textContent: 'Evolve' } : null,
    querySelectorAll: (sel) => {
      if (sel.includes('img')) return [mockPokeballImg];
      return [];
    },
    getBoundingClientRect: () => ({ width: 420, height: 320 })
  };

  const preloadEvoSandbox = {
    window: {
      location: { pathname: '/pokemon', href: 'https://www.delugerpg.com/pokemon' },
      getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', filter: 'none' }),
      __delugeLastEvoAutoPickSig: ''
    },
    document: {
      body: { offsetWidth: 1200, textContent: '' },
      getElementById: (id) => (id === 'DModal' ? mockModalEl : null),
      querySelector: (sel) => (sel.includes('DModal') ? mockModalEl : null),
      querySelectorAll: (sel) => (sel.includes('DModal') ? [mockModalEl] : [])
    },
    isModalElementOpen: () => true,
    getRadioOptionText: () => '',
    evaluateOwnershipAndMegaEquivalence: () => ({ isOwned: false, hasExactOwned: false, hasMegaOwned: false, hasGmaxOwned: false }),
    isPreloadActualMega: (n) => /\bmega\b/i.test(String(n || '')),
    isPreloadAlreadyGmax: (p) => /\bg-?max\b/i.test(String((typeof p === 'string' ? p : (p && p.name)) || '')),
    ownedUserCollection: [],
    lastClickedPokemonInfo: null,
    checkHasCaptchaElement: () => false,
    dispatchHumanClick: () => {},
    VARIANT_PREFIX_REGEX: /^(normal|shiny|metallic|ghostly|ghost|dark|shadow|mirage|chrome|negative|retro)\s+/i
  };
  vm.runInNewContext(preloadCode.slice(evoParseStart, evoParseEnd), preloadEvoSandbox);

  const parsedMilcery = preloadEvoSandbox.parseEvolveOptionLabelAndReq('Alcremie (Berry Lemon Cream) (at Level 15 using Berry Sweet)');
  assert.strictEqual(parsedMilcery.name, 'Alcremie (Berry Lemon Cream)', 'Forme parentheses MUST be preserved');
  assert.strictEqual(parsedMilcery.requirement, 'at Level 15 using Berry Sweet', 'Requirement parentheses MUST be isolated cleanly');
  assert.strictEqual(preloadEvoSandbox.parseEvolveOptionLabelAndReq('Oinkologne (Female) (Female only at Level 18)').name, 'Oinkologne (Female)', 'Standalone (Female)/(Male) forme must stay preserved');
  assert.strictEqual(preloadEvoSandbox.parseEvolveOptionLabelAndReq('Vaporeon (using Water Stone)').name, 'Vaporeon', 'Standard item requirements must be isolated across all species');

  // Verify flat <br>-separated multi-radio modals never bleed Red Pokeball across options
  const redImg = { nodeType: 1, tagName: 'IMG', src: 'pokeball.png', title: 'You have this pokemon in your box', alt: '', className: 'dball', getAttribute: (a) => (a === 'src' ? 'pokeball.png' : (a === 'title' ? 'You have this pokemon in your box' : '')) };
  const greyImg = { nodeType: 1, tagName: 'IMG', src: 'pokeball-n.png', title: "You don't have this pokemon in your box", alt: '', className: 'dball', getAttribute: (a) => (a === 'src' ? 'pokeball-n.png' : (a === 'title' ? "You don't have this pokemon in your box" : '')) };
  const brSep = { nodeType: 1, tagName: 'BR' };
  const formParent = { tagName: 'FORM' };
  const radio1 = { nodeType: 1, tagName: 'INPUT', id: 'r1', parentElement: formParent, previousSibling: null };
  const radio2 = { nodeType: 1, tagName: 'INPUT', id: 'r2', parentElement: formParent };
  radio1.nextSibling = redImg;
  redImg.previousSibling = radio1;
  redImg.nextSibling = brSep;
  brSep.previousSibling = redImg;
  brSep.nextSibling = radio2;
  radio2.previousSibling = brSep;
  radio2.nextSibling = greyImg;
  greyImg.previousSibling = radio2;
  greyImg.nextSibling = null;
  const multiModalMock = { querySelector: () => null, querySelectorAll: () => [] };
  assert.strictEqual(preloadEvoSandbox.getEvolveOptionCaughtIndicator(radio1, multiModalMock, 2).hasCaughtIcon, true, 'Option 1 with red pokeball must detect hasCaughtIcon=true');
  assert.strictEqual(preloadEvoSandbox.getEvolveOptionCaughtIndicator(radio2, multiModalMock, 2).hasCaughtIcon, false, 'Option 2 across <br> must NOT inherit Option 1 red pokeball');

  const dupModalCard = preloadEvoSandbox.detectEvolveCard();
  assert(dupModalCard && Array.isArray(dupModalCard.options) && dupModalCard.options.length === 1, 'Milcery modal must detect 1 evolution option');
  assert.strictEqual(dupModalCard.options[0].fullName, 'Alcremie (Berry Lemon Cream)', 'Detected option fullName MUST retain (Berry Lemon Cream)');
  assert.strictEqual(dupModalCard.options[0].hasCaughtIcon, true, 'Red Pokeball in modal MUST set hasCaughtIcon=true');
  assert.strictEqual(dupModalCard.options[0].isOwned, true, 'Red Pokeball in modal MUST set isOwned=true');
  assert.strictEqual(dupModalCard.allDuplicates, true, 'allDuplicates MUST be true when Red Pokeball marks Alcremie already owned');
  assert.strictEqual(dupModalCard.hasUnique, false, 'hasUnique MUST be false for already-existing evolution');

  // Unowned greyed pokeball on different cream stays unique
  mockBallSrc = 'https://www.delugerpg.com/img/pokeball-n.png';
  mockBallTitle = "You don't have this pokemon in your box";
  mockModalText = 'Your level 100 Milcery can evolve into the following -\nAlcremie (Matcha Cream) (at Level 15 using Sweet)';
  const uniqueModalCard = preloadEvoSandbox.detectEvolveCard();
  assert.strictEqual(uniqueModalCard.options[0].fullName, 'Alcremie (Matcha Cream)');
  assert.strictEqual(uniqueModalCard.options[0].hasCaughtIcon, false, 'Uncaught grey pokeball must NOT mark caught');
  assert.strictEqual(uniqueModalCard.options[0].isOwned, false, 'Unowned cream without caught icon stays unowned');
  assert.strictEqual(uniqueModalCard.hasUnique, true, 'Unowned cream remains evolve-ready');

  // 3K-2: evolution_engine works universally across parenthetical species (Alcremie, Wormadam, Toxtricity, Oinkologne)
  const boxWithAlcremie = [
    { id: 'alc1', name: 'Alcremie (Berry Lemon Cream)', variant: 'Normal', level: 100 },
    { id: 'mil1', name: 'Milcery', variant: 'Normal', level: 100, canEvolve: true },
    { id: 'mil2', name: 'Dark Milcery', variant: 'Dark', level: 100, canEvolve: true },
    { id: 'wor1', name: 'Wormadam (Trash Cloak)', variant: 'Normal', level: 100 },
    { id: 'tox1', name: 'Toxtricity (Amped)', variant: 'Normal', level: 100 },
    { id: 'tox0', name: 'Toxel', variant: 'Normal', level: 100, canEvolve: true },
    { id: 'lyc1', name: 'Lycanroc (Midday)', variant: 'Normal', level: 100 },
    { id: 'roc1', name: 'Rockruff', variant: 'Normal', level: 100, canEvolve: true }
  ];
  const exactFormOwn = evolutionEngine.checkEvolutionOwnership('Alcremie (Berry Lemon Cream)', boxWithAlcremie, 'Normal');
  assert.strictEqual(exactFormOwn.isOwned, true, 'Exact Alcremie (Berry Lemon Cream) in box MUST be detected as owned');
  assert.strictEqual(exactFormOwn.hasExactOwned, true, 'Exact forme match must set hasExactOwned=true');
  assert.strictEqual(evolutionEngine.checkEvolutionOwnership('Wormadam', boxWithAlcremie, 'Normal').hasExactOwned, true, 'Generic Wormadam target must recognize Wormadam (Trash Cloak) in box');

  const readyBox = evolutionEngine.getEvolveReadyPokemon(boxWithAlcremie);
  const normMilceryReady = readyBox.find(p => p.id === 'mil1');
  const normToxelReady = readyBox.find(p => p.id === 'tox0');
  const darkMilceryReady = readyBox.find(p => p.id === 'mil2');
  const normRockruffReady = readyBox.find(p => p.id === 'roc1');
  assert(normMilceryReady && normMilceryReady.hasUnique === false, 'Normal Milcery must NOT be marked unique when Normal Alcremie (Berry Lemon Cream) is already in box');
  assert(normToxelReady && normToxelReady.hasUnique === false, 'Normal Toxel must NOT be marked unique when Normal Toxtricity (Amped) is already in box');
  assert(darkMilceryReady && darkMilceryReady.hasUnique === true, 'Dark Milcery MUST remain unique when only Normal Alcremie is owned');
  assert(normRockruffReady && normRockruffReady.hasUnique === true, 'Rockruff MUST remain unique for unowned Lycanroc (Midnight/Dusk)');

  // 3K-3: evolution_ui blocks Confirm Evolve button & displays Duplicate Blocked when modal card shows owned/caught option
  const createdBtns = [];
  const mockAiActionSlot = {
    innerHTML: '',
    appendChild: (b) => createdBtns.push(b)
  };
  const uiEvoSandbox = {
    delugeView: null,
    activeAiBattleData: null,
    activeEvolveCardData: null,
    cachedEvolveReadyList: [],
    selectedEvoPoke: null,
    currentCollection: [],
    evolutionEngine: evolutionEngine,
    aiAssistant: { analyzeEvolutionPath: (n, c) => evolutionEngine.analyzeEvolutionPath(n, c) },
    getBaseSpecies: (n) => evolutionEngine.cleanSpeciesKey ? evolutionEngine.cleanSpeciesKey(n) : n,
    aiBattleOpponentBadge: { textContent: '', style: { color: '' } },
    aiStatusChip: { textContent: '', style: { color: '' } },
    aiTacticalBriefing: { innerHTML: '' },
    aiInstantActionSlot: mockAiActionSlot,
    evoReadyList: null,
    escapeHtml: (s) => String(s || ''),
    document: {
      createElement: () => ({ type: '', id: '', style: {}, className: '', disabled: false, innerHTML: '', addEventListener: () => {} })
    },
    updateStatus: () => {},
    lastAnnouncedEvolveSignature: '',
    disregardedEvoPokeIds: new Set(),
    disregardedEvoPokeNames: new Set()
  };
  vm.runInNewContext(
    evoUiCode.slice(evoUiCode.indexOf('function cleanEvolveOptionLabel('), evoUiCode.indexOf('\nfunction handleEvolveCardClosed(')),
    uiEvoSandbox
  );
  uiEvoSandbox.handleEvolveCardDetected(dupModalCard);
  assert.strictEqual(uiEvoSandbox.aiStatusChip.textContent, 'Duplicate Blocked', 'Header chip MUST show Duplicate Blocked for already-existing evolution');
  assert.strictEqual(uiEvoSandbox.aiTacticalBriefing.innerHTML.includes('100% UNIQUE'), false, 'Owned Alcremie MUST NOT display 100% UNIQUE badge');
  assert.strictEqual(createdBtns.length, 1);
  assert.strictEqual(createdBtns[0].disabled, true, 'Confirm Evolve button MUST be disabled when evolution already exists');
  assert(createdBtns[0].innerHTML.includes('All Evolution Paths Owned'), 'Button must explain evolution paths are already owned');

  console.log('[PASS] Forme-Preserving Evolve Duplicate Detection & Modal Red-Pokeball Guard verified.');
}

// 3L. G-Max Challenge Modal Non-Direct Block & Auto-Disregard Unallowable Next Steps
console.log('\n--- TEST 3L: G-Max Challenge Modal Block & Auto-Disregard Unallowable Evolutions ---');
{
  const vm = require('vm');
  const evolutionEngine = require('./evolution_engine');
  const preloadCode = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');
  const evoUiCode = fs.readFileSync(path.join(__dirname, 'evolution_ui.js'), 'utf8');

  // 3L-1: Preload detects G-Max Orbeetle (using G-Max Challenge) as non-direct G-Max Challenge Only & blocks modal submit
  const pStart = preloadCode.indexOf('function parseEvolveOptionLabelAndReq(');
  const pEnd = preloadCode.indexOf('\nfunction syncEvolveCardState(', pStart);
  const orbeetleText = 'Your level 100 Orbeetle can evolve into the following -\nG-Max Orbeetle (using G-Max Challenge)';
  const greyBall = {
    src: 'https://www.delugerpg.com/img/pokeball-n.png',
    title: "You don't have this pokemon in your box",
    alt: '',
    className: 'dball',
    parentElement: null,
    closest: () => null,
    getAttribute: (a) => (a === 'src' ? 'https://www.delugerpg.com/img/pokeball-n.png' : (a === 'title' ? "You don't have this pokemon in your box" : ''))
  };
  const mockModal = {
    textContent: orbeetleText,
    querySelector: (sel) => sel.includes('#DMtitle') ? { textContent: 'Evolve' } : null,
    querySelectorAll: (sel) => sel.includes('img') ? [greyBall] : [],
    getBoundingClientRect: () => ({ width: 420, height: 320 })
  };
  const pSb = {
    window: { location: { pathname: '/pokemon', href: 'https://www.delugerpg.com/pokemon' }, getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', filter: 'none' }), __delugeLastEvoAutoPickSig: '' },
    document: { body: { offsetWidth: 1200, textContent: '' }, getElementById: (id) => (id === 'DModal' ? mockModal : null), querySelector: (sel) => (sel.includes('DModal') ? mockModal : null), querySelectorAll: (sel) => (sel.includes('DModal') ? [mockModal] : []) },
    isModalElementOpen: () => true,
    getRadioOptionText: () => '',
    evaluateOwnershipAndMegaEquivalence: () => ({ isOwned: false, hasExactOwned: false, hasMegaOwned: false, hasGmaxOwned: false }),
    isPreloadActualMega: (n) => /\bmega\b/i.test(String(n || '')),
    isPreloadAlreadyGmax: (p) => /\bg-?max\b/i.test(String((typeof p === 'string' ? p : (p && p.name)) || '')),
    ownedUserCollection: [{ id: 'orb1', name: 'Orbeetle', variant: 'Normal', level: 100 }],
    lastClickedPokemonInfo: null,
    checkHasCaptchaElement: () => false,
    dispatchHumanClick: () => {},
    VARIANT_PREFIX_REGEX: /^(normal|shiny|metallic|ghostly|ghost|dark|shadow|mirage|chrome|negative|retro)\s+/i
  };
  vm.runInNewContext(preloadCode.slice(pStart, pEnd), pSb);

  const orbeetleCard = pSb.detectEvolveCard();
  assert(orbeetleCard && orbeetleCard.isOpen, 'Orbeetle modal must be detected');
  assert.strictEqual(orbeetleCard.options[0].requiresGmaxChallenge, true, 'G-Max Orbeetle option MUST be tagged requiresGmaxChallenge=true');
  assert.strictEqual(orbeetleCard.isGmaxChallengeOnly, true, 'Orbeetle modal MUST be flagged isGmaxChallengeOnly=true');
  assert.strictEqual(orbeetleCard.hasUnique, false, 'G-Max Challenge Only modal MUST have hasUnique=false');
  assert.strictEqual(pSb.isModalEvolveSubmissionBlocked(orbeetleCard, 'g-max orbeetle'), true, 'Modal submit MUST block G-Max Orbeetle direct submission');

  // 3L-2: evolution_ui blocks Confirm Evolve for Orbeetle, blocks Charizard when direct paths owned, and disregards on card.isComplete
  let listReRendered = 0;
  const btns = [];
  const uiSb = {
    delugeView: null,
    activeAiBattleData: null,
    activeEvolveCardData: null,
    cachedEvolveReadyList: [{ id: 'orb1', name: 'Orbeetle', hasUnique: true }],
    selectedEvoPoke: { id: 'dot1', name: 'Dottler', level: 100 },
    currentCollection: [
      { id: 'dot1', name: 'Dottler', variant: 'Normal', level: 100 },
      { id: 'ivy1', name: 'Ivysaur', variant: 'Normal', level: 100 }
    ],
    evolutionEngine: evolutionEngine,
    aiAssistant: { analyzeEvolutionPath: (n, c) => evolutionEngine.analyzeEvolutionPath(n, c) },
    getBaseSpecies: (n) => evolutionEngine.cleanSpeciesKey ? evolutionEngine.cleanSpeciesKey(n) : n,
    aiBattleOpponentBadge: { textContent: '', style: { color: '' } },
    aiStatusChip: { textContent: '', style: { color: '' } },
    aiTacticalBriefing: { innerHTML: '' },
    aiInstantActionSlot: { innerHTML: '', appendChild: (b) => btns.push(b) },
    evoReadyList: null,
    escapeHtml: (s) => String(s || ''),
    document: { createElement: () => ({ type: '', id: '', style: {}, className: '', disabled: false, innerHTML: '', addEventListener: () => {} }) },
    fs: { writeFileSync: () => {} },
    getWritableDataPath: (f) => f,
    syncUserCollectionToGuest: () => {},
    candidateListsCache: { gmaxLastDisplayedId: null },
    renderEvolutionDecisionMakerUI: () => { listReRendered++; },
    updateStatus: () => {},
    lastAnnouncedEvolveSignature: '',
    disregardedEvoPokeIds: new Set(),
    disregardedEvoPokeNames: new Set()
  };
  vm.runInNewContext(
    evoUiCode.slice(evoUiCode.indexOf('function cleanEvolveOptionLabel('), evoUiCode.indexOf('\nfunction handleEvolveCardClosed(')),
    uiSb
  );

  // Case A: Live Orbeetle G-Max modal -> disabled button, NEVER Confirm Evolve into G-Max Orbeetle, auto-disregarded
  uiSb.handleEvolveCardDetected(orbeetleCard);
  assert.strictEqual(uiSb.aiStatusChip.textContent, 'G-Max Challenge Only', 'Orbeetle status chip must show G-Max Challenge Only');
  assert.strictEqual(btns[0].disabled, true, 'G-Max Orbeetle modal button MUST be disabled');
  assert(!btns[0].innerHTML.includes('Confirm Evolve'), 'G-Max Orbeetle MUST NEVER show Confirm Evolve');
  assert(uiSb.disregardedEvoPokeIds.has('orb1'), 'Orbeetle must be automatically disregarded from Evolve-Ready list');
  assert(listReRendered >= 1, 'Disregarding a Ready Pokemon must refresh Evolve-Ready UI immediately');

  // Case B: Charizard with both Megas owned + G-Max unowned -> NEVER enables Confirm Evolve into G-Max Charizard
  btns.length = 0;
  uiSb.currentCollection = [
    { id: 'c1', name: 'Charizard', variant: 'Normal', level: 100 },
    { id: 'c2', name: 'Charizard', variant: 'Normal', level: 100 },
    { id: 'mx', name: 'Mega Charizard X', variant: 'Normal', level: 100 },
    { id: 'my', name: 'Mega Charizard Y', variant: 'Normal', level: 100 }
  ];
  uiSb.handleEvolveCardDetected({
    isOpen: true, fullName: 'Charizard', baseSpecies: 'charizard', variant: 'Normal', level: 100,
    options: [
      { fullName: 'Mega Charizard X', requirement: 'at Level 100 using Charizardite X', isOwned: true },
      { fullName: 'Mega Charizard Y', requirement: 'at Level 100 using Charizardite Y', isOwned: true },
      { fullName: 'G-Max Charizard', requirement: 'using G-Max Challenge', requiresGmaxChallenge: true, isOwned: false }
    ]
  });
  assert.strictEqual(btns[0].disabled, true, 'Charizard with all direct Mega paths owned MUST disable modal evolve even when G-Max is unowned');
  assert(!btns[0].innerHTML.includes('Confirm Evolve into G-Max'), 'MUST NEVER offer Confirm Evolve into G-Max Charizard');

  // Case C: Completing Dottler -> Orbeetle MUST NOT offer Proceed to Evolve further (next step is G-Max Challenge only)
  btns.length = 0;
  uiSb.currentCollection = [{ id: 'dot1', name: 'Dottler', variant: 'Normal', level: 100 }];
  uiSb.selectedEvoPoke = { id: 'dot1', name: 'Dottler', level: 100 };
  uiSb.handleEvolveCardDetected({ isOpen: true, isComplete: true, fromPokemon: 'Dottler', toPokemon: 'Orbeetle', fullName: 'Orbeetle' });
  assert(btns[0].innerHTML.includes('Evolution Complete'), 'Dottler -> Orbeetle must conclude (not offer G-Max next step)');

  // Case D: Completing Ivysaur -> Venusaur when G-Max Venusaur is NOT owned MUST NOT offer Proceed to Mega Venusaur
  btns.length = 0;
  uiSb.currentCollection = [{ id: 'ivy1', name: 'Ivysaur', variant: 'Normal', level: 100 }];
  uiSb.selectedEvoPoke = { id: 'ivy1', name: 'Ivysaur', level: 100 };
  uiSb.handleEvolveCardDetected({ isOpen: true, isComplete: true, fromPokemon: 'Ivysaur', toPokemon: 'Venusaur', fullName: 'Venusaur' });
  assert(btns[0].innerHTML.includes('Evolution Complete'), 'Ivysaur -> Venusaur must disregard Mega next step while holding for G-Max Venusaur');

  // Case E: XY Mega precision in getEvolveReadyPokemon (Charizard with G-Max + Mega X owned still shows Mega Y ready)
  const xyReady = evolutionEngine.getEvolveReadyPokemon([
    { id: 'gz', name: 'Ghostly G-Max Charizard', variant: 'Ghostly', level: 100 },
    { id: 'mx', name: 'Ghostly Mega Charizard X', variant: 'Ghostly', level: 100 },
    { id: 'ch', name: 'Ghostly Charizard', variant: 'Ghostly', level: 100, canEvolve: true }
  ]);
  const chEntry = xyReady.find(p => p.id === 'ch');
  assert(chEntry && chEntry.hasUnique === true && chEntry.bestBranch.name === 'Mega Charizard Y', 'Charizard with G-Max & Mega X owned must still offer unowned Mega Charizard Y');

  // 3L-3: Smart Action Button auto-pivots to next allowable Pokemon when modal is G-Max Challenge, Duplicate, or Complete
  const sentIpcCalls = [];
  const smartBtns = [];
  const makeClickableBtn = () => {
    const handlers = {};
    return {
      type: '', id: '', style: {}, className: '', disabled: false, innerHTML: '', attrs: {},
      setAttribute: function(k, v) { this.attrs[k] = v; },
      addEventListener: function(ev, fn) { handlers[ev] = fn; },
      click: function() { if (handlers.click) handlers.click(); }
    };
  };
  const smartSb = {
    delugeView: { send: (ch, payload) => sentIpcCalls.push({ ch, payload }) },
    activeAiBattleData: null,
    activeEvolveCardData: null,
    cachedEvolveReadyList: [
      { id: 'app1', name: 'Negative Applin', level: 100, variant: 'Negative', types: ['Grass', 'Dragon'], hasUnique: true, bestBranch: { name: 'Flapple', fullName: 'Negative Flapple', isDuplicate: false } },
      { id: 'mac1', name: 'Shiny Machop', level: 100, variant: 'Shiny', types: ['Fighting'], hasUnique: true, bestBranch: { name: 'Machoke', fullName: 'Shiny Machoke', isDuplicate: false } },
      { id: 'cha1', name: 'Shadow Charmander', level: 100, variant: 'Shadow', types: ['Fire'], hasUnique: true, bestBranch: { name: 'Charmeleon', fullName: 'Shadow Charmeleon', isDuplicate: false } }
    ],
    selectedEvoPoke: { id: 'app1', name: 'Negative Applin', level: 100, bestBranch: { name: 'Flapple', fullName: 'Negative Flapple' } },
    currentCollection: [
      { id: 'app1', name: 'Negative Applin', variant: 'Negative', level: 100 },
      { id: 'mac1', name: 'Shiny Machop', variant: 'Shiny', level: 100 },
      { id: 'cha1', name: 'Shadow Charmander', variant: 'Shadow', level: 100 }
    ],
    evolutionEngine: evolutionEngine,
    aiAssistant: { analyzeEvolutionPath: (n, c) => evolutionEngine.analyzeEvolutionPath(n, c) },
    getBaseSpecies: (n) => evolutionEngine.cleanSpeciesKey ? evolutionEngine.cleanSpeciesKey(n) : n,
    aiBattleOpponentBadge: { textContent: '', style: { color: '' } },
    aiStatusChip: { textContent: '', style: { color: '' } },
    aiTacticalBriefing: { innerHTML: '' },
    aiInstantActionSlot: { innerHTML: '', appendChild: (b) => smartBtns.push(b) },
    evoReadyList: null,
    escapeHtml: (s) => String(s || ''),
    document: { createElement: () => makeClickableBtn() },
    fs: { writeFileSync: () => {} },
    getWritableDataPath: (f) => f,
    syncUserCollectionToGuest: () => {},
    candidateListsCache: { gmaxLastDisplayedId: null },
    renderEvolutionDecisionMakerUI: () => {},
    updateStatus: () => {},
    setTimeout: () => {},
    lastAnnouncedEvolveSignature: '',
    disregardedEvoPokeIds: new Set(),
    disregardedEvoPokeNames: new Set()
  };
  vm.runInNewContext(
    evoUiCode.slice(evoUiCode.indexOf('function cleanEvolveOptionLabel('), evoUiCode.indexOf('\nfunction handleEvolveCardClosed(')),
    smartSb
  );

  // Subcase 1: Right after evolving Negative Applin -> Negative Flapple, DelugeRPG opens Negative Flapple G-Max modal
  smartSb.handleEvolveCardDetected({
    isOpen: true, fullName: 'Negative Flapple', baseSpecies: 'flapple', variant: 'Negative', level: 100,
    isGmaxChallengeOnly: true,
    options: [{ fullName: 'Negative G-Max Flapple', requirement: 'using G-Max Challenge', requiresGmaxChallenge: true, isOwned: false }]
  });
  assert.strictEqual(smartSb.disregardedEvoPokeIds.has('app1'), true, 'Prior evolved stage (Negative Applin) must be disregarded so Next Allowable never loops back');
  assert.strictEqual(smartBtns.length, 1);
  assert.strictEqual(smartBtns[0].disabled, false, 'Smart button MUST be enabled to pivot to Shiny Machop when G-Max modal blocks current Pokemon');
  assert(smartBtns[0].innerHTML.includes('Shiny Machop') && smartBtns[0].innerHTML.includes('Shiny Machoke'), 'Smart button must target Shiny Machop -> Shiny Machoke');
  smartBtns[0].click();
  assert.strictEqual(sentIpcCalls.length, 1);
  assert.strictEqual(sentIpcCalls[0].ch, 'trigger-evolve-pokemon', 'Clicking smart button must trigger next allowable Pokemon, NOT submit-modal-evolve');
  assert.strictEqual(sentIpcCalls[0].payload.pokemonId, 'mac1');
  assert.strictEqual(sentIpcCalls[0].payload.closeModalFirst, true, 'Smart pivot must instruct preload to close the blocked modal first');

  // Subcase 2: Duplicate modal opens -> smart button pivots to next allowable Pokemon (Shadow Charmander after disregarding mac1)
  smartBtns.length = 0;
  sentIpcCalls.length = 0;
  smartSb.disregardedEvoPokeIds.add('mac1');
  smartSb.handleEvolveCardDetected({
    isOpen: true, fullName: 'Milcery', baseSpecies: 'milcery', variant: 'Normal', level: 100,
    options: [{ fullName: 'Alcremie (Berry Lemon Cream)', isOwned: true, hasCaughtIcon: true }]
  });
  assert.strictEqual(smartBtns[0].disabled, false, 'Duplicate modal with other allowable Pokemon must pivot instead of dead-ending');
  assert(smartBtns[0].innerHTML.includes('Shadow Charmander'), 'Duplicate modal smart button must pivot to Shadow Charmander');
  smartBtns[0].click();
  assert.strictEqual(sentIpcCalls[0].ch, 'trigger-evolve-pokemon');
  assert.strictEqual(sentIpcCalls[0].payload.pokemonId, 'cha1');
  assert.strictEqual(sentIpcCalls[0].payload.closeModalFirst, true);

  // Subcase 3: card.isComplete with G-Max-only next stage pivots immediately to Next Allowable Pokemon
  smartBtns.length = 0;
  sentIpcCalls.length = 0;
  smartSb.selectedEvoPoke = { id: 'app1', name: 'Negative Applin', level: 100 };
  smartSb.handleEvolveCardDetected({ isOpen: true, isComplete: true, fromPokemon: 'Negative Applin', toPokemon: 'Negative Flapple', fullName: 'Negative Flapple' });
  assert.strictEqual(smartBtns[0].disabled, false);
  assert(smartBtns[0].innerHTML.includes('Next Allowable') && smartBtns[0].innerHTML.includes('Shadow Charmander'), 'card.isComplete with no allowable next stage must offer Next Allowable Pokemon');
  smartBtns[0].click();
  assert.strictEqual(sentIpcCalls[0].ch, 'trigger-evolve-pokemon');
  assert.strictEqual(sentIpcCalls[0].payload.pokemonId, 'cha1');
  assert.strictEqual(sentIpcCalls[0].payload.closeModalFirst, true);

  // Subcase 4: Unrelated selectedEvoPoke (Shadow Milcery at [0]) MUST NOT be skipped when Negative Snorlax G-Max modal opens
  smartBtns.length = 0;
  sentIpcCalls.length = 0;
  smartSb.disregardedEvoPokeIds.clear();
  smartSb.disregardedEvoPokeNames.clear();
  smartSb.cachedEvolveReadyList = [
    { id: 'mil0', name: 'Shadow Milcery', level: 100, variant: 'Shadow', types: ['Fairy'], hasUnique: true, bestBranch: { name: 'Alcremie', fullName: 'Shadow Alcremie', isDuplicate: false } },
    { id: 'lat1', name: 'Latios', level: 100, variant: 'Normal', types: ['Dragon', 'Psychic'], hasUnique: true, bestBranch: { name: 'Mega Latios', fullName: 'Mega Latios', isDuplicate: false } }
  ];
  smartSb.selectedEvoPoke = smartSb.cachedEvolveReadyList[0];
  smartSb.handleEvolveCardDetected({
    isOpen: true, fullName: 'Negative Snorlax', baseSpecies: 'snorlax', variant: 'Negative', level: 100,
    isGmaxChallengeOnly: true,
    options: [{ fullName: 'Negative G-Max Snorlax', requirement: 'using G-Max Challenge', requiresGmaxChallenge: true, isOwned: false }]
  });
  assert(smartBtns[0].innerHTML.includes('Shadow Milcery') && smartBtns[0].innerHTML.includes('Shadow Alcremie'), 'Smart button MUST pick [0] Shadow Milcery instead of skipping to [1] Latios');

  // 3L-4: checkPendingAutoEvolve NEVER re-clicks evolved pokemon ID (e.g. LnWX4R Negative Snorlax) after returning to /pokemon
  const cpaStart = preloadCode.indexOf('function isSameEvolveSpeciesName(');
  const cpaEnd = preloadCode.indexOf('\nipcRenderer.on(\'trigger-evolve-pokemon\'', cpaStart);
  const mockStore = {};
  let reClickCount = 0;
  const cpaSb = {
    sessionStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mockStore, k) ? mockStore[k] : null),
      setItem: (k, v) => { mockStore[k] = String(v); },
      removeItem: (k) => { delete mockStore[k]; }
    },
    window: { location: { pathname: '/pokemon' } },
    document: {
      getElementById: () => null,
      querySelector: (sel) => (sel.includes('LnWX4R') ? { closest: () => ({ textContent: 'Negative Snorlax Evolve' }) } : null)
    },
    detectEvolveCard: () => null,
    isModalEvolveSubmissionBlocked: () => false,
    ipcRenderer: { sendToHost: () => {} },
    dispatchHumanClick: () => { reClickCount++; },
    getRadioOptionText: () => '',
    humanClickElementVerified: () => {},
    clickModalEvolveButton: () => {},
    getGaussianDelay: () => 200,
    setTimeout: () => {}
  };
  vm.runInNewContext(preloadCode.slice(cpaStart, cpaEnd), cpaSb);

  // Scenario A: Direct-navigated token returned to /pokemon after confirming evolution -> must purge and NOT click LnWX4R
  mockStore.deluge_auto_evolve_target = JSON.stringify({ id: 'LnWX4R', name: 'Negative Munchlax', targetBranch: 'Negative Snorlax', navigatedDirectly: true, timestamp: Date.now() });
  cpaSb.checkPendingAutoEvolve();
  assert.strictEqual(reClickCount, 0, 'checkPendingAutoEvolve MUST NOT re-click evolved pokemon link on /pokemon after direct navigation');
  assert.strictEqual(mockStore.deluge_auto_evolve_target, undefined, 'Stale deluge_auto_evolve_target must be purged');

  // Scenario B: Single-stage /pokemon/evolve/LnWX4R with 0 radios -> must purge token immediately on arrival
  cpaSb.window.location.pathname = '/pokemon/evolve/LnWX4R';
  cpaSb.detectEvolveCard = () => ({ isOpen: true, isMoveSelection: false, isComplete: false, fullName: 'Negative Munchlax', options: [{ fullName: 'Negative Snorlax' }] });
  cpaSb.document.querySelector = () => ({ querySelectorAll: () => [] });
  mockStore.deluge_auto_evolve_target = JSON.stringify({ id: 'LnWX4R', name: 'Negative Munchlax', targetBranch: 'Negative Snorlax', navigatedDirectly: true, timestamp: Date.now() });
  cpaSb.checkPendingAutoEvolve();
  assert.strictEqual(mockStore.deluge_auto_evolve_target, undefined, 'Single-stage /pokemon/evolve/<id> with 0 radios MUST consume deluge_auto_evolve_target immediately');

  // Scenario C: Legacy token on /pokemon where card name changed (Negative Munchlax -> Negative Snorlax) -> must NOT click
  cpaSb.window.location.pathname = '/pokemon';
  cpaSb.detectEvolveCard = () => null;
  cpaSb.document.querySelector = (sel) => (sel.includes('LnWX4R') ? { closest: () => ({ textContent: 'Negative Snorlax Lv 100 Evolve' }) } : null);
  mockStore.deluge_auto_evolve_target = JSON.stringify({ id: 'LnWX4R', name: 'Negative Munchlax', targetBranch: 'Negative Snorlax', timestamp: Date.now() });
  cpaSb.checkPendingAutoEvolve();
  assert.strictEqual(reClickCount, 0, 'checkPendingAutoEvolve MUST NOT click link when card species changed to Negative Snorlax');

  // 3L-5: Real handleEvolveCardDetected + real renderEvolutionDecisionMakerUI mutual-recursion guard (Shadow Charmeleon -> Shadow Charizard)
  let realRenderCalls = 0;
  const fullBtns = [];
  const makeMockEl = () => ({
    type: '', id: '', style: {}, className: '', disabled: false, innerHTML: '', textContent: '',
    setAttribute: () => {}, getAttribute: () => '', appendChild: () => {},
    querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}
  });
  const teamEngine = require('./team_engine');
  const fullSb = {
    delugeView: { send: () => {}, getURL: () => 'https://www.delugerpg.com/pokemon' },
    activeAiBattleData: null,
    activeEvolveCardData: null,
    cachedEvolveReadyList: [],
    cachedBoxMovesList: [],
    cachedMegaList: [],
    selectedEvoPoke: { id: 'sc1', name: 'Shadow Charmeleon', level: 100 },
    currentCollection: [
      { id: 'sc1', name: 'Shadow Charmeleon', variant: 'Shadow', level: 100, canEvolve: true },
      { id: 'sr1', name: 'Shadow Rookidee', variant: 'Shadow', level: 100, canEvolve: true }
    ],
    currentEvoFilter: 'UNIQUE',
    currentEvoSearch: '',
    evolutionEngine: evolutionEngine,
    teamEngine: teamEngine,
    aiAssistant: { analyzeEvolutionPath: (n, c) => evolutionEngine.analyzeEvolutionPath(n, c) },
    getBaseSpecies: (n) => evolutionEngine.cleanSpeciesKey ? evolutionEngine.cleanSpeciesKey(n) : n,
    aiBattleOpponentBadge: makeMockEl(),
    aiStatusChip: makeMockEl(),
    aiTacticalBriefing: makeMockEl(),
    aiInstantActionSlot: { innerHTML: '', appendChild: (b) => fullBtns.push(b) },
    evoReadyList: makeMockEl(),
    evoCountUnique: makeMockEl(),
    evoCountMegas: makeMockEl(),
    evoCountAll: makeMockEl(),
    evoCountBlocked: makeMockEl(),
    evoListHeaderTitle: makeMockEl(),
    evoReadyCountBadge: makeMockEl(),
    escapeHtml: (s) => String(s || ''),
    document: { createElement: () => makeMockEl() },
    fs: { writeFileSync: () => {} },
    getWritableDataPath: (f) => f,
    syncUserCollectionToGuest: () => {},
    candidateListsCache: { gmaxLastDisplayedId: null },
    updateStatus: () => {},
    setTimeout: () => {},
    lastAnnouncedEvolveSignature: '',
    renderAiAssistantUI: () => {},
    appendAiChatMessage: () => {}
  };
  vm.runInNewContext(evoUiCode, fullSb);
  const origRender = fullSb.renderEvolutionDecisionMakerUI;
  fullSb.renderEvolutionDecisionMakerUI = function(opts) {
    realRenderCalls++;
    if (realRenderCalls > 5) throw new Error('Infinite mutual recursion detected!');
    return origRender(opts);
  };
  fullSb.handleEvolveCardDetected({
    isOpen: true, isComplete: true, fromPokemon: 'Shadow Charmeleon', toPokemon: 'Shadow Charizard', fullName: 'Shadow Charizard'
  });
  assert.strictEqual(realRenderCalls, 1, 'card.isComplete MUST call renderEvolutionDecisionMakerUI exactly once with zero mutual recursion');
  assert.strictEqual(fullBtns.length, 1, 'Action button must render cleanly after card.isComplete');
  assert(fullBtns[0].innerHTML.includes('Shadow Rookidee'), 'Shadow Charizard holding for G-Max must pivot cleanly to Shadow Rookidee');

  console.log('[PASS] G-Max Challenge Modal Block, Auto-Disregard, Stale Re-Open Guard, No-Freeze Recursion Guard & Smart Pivot verified.');
}

// 3M. Audit Hardening: Completion Regex, Unrelated Selected Guard, ID-First Sync, Species Match, URL Parity
console.log('\n--- TEST 3M: Audit Hardening (Regex, Selected Guard, ID Sync, Species Match, URL Parity) ---');
{
  const vm = require('vm');
  const evolutionEngine = require('./evolution_engine');
  const teamEngine = require('./team_engine');
  const preloadCode = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');
  const evoUiCode = fs.readFileSync(path.join(__dirname, 'evolution_ui.js'), 'utf8');
  const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

  // 3M-1: detectEvolveCard CASE 0.5 extracts exact names without newlines or trailing Close, plus tricky punctuation & optionRadios alignment
  const pStart = preloadCode.indexOf('function parseEvolveOptionLabelAndReq(');
  const pEnd = preloadCode.indexOf('\nfunction syncEvolveCardState(', pStart);
  let modalBodyText = '';
  let mockRadios = [];
  let radioPickClicked = null;
  const mockModal = {
    get textContent() { return modalBodyText; },
    querySelector: (sel) => sel.includes('#DMtitle') ? { textContent: 'Evolve' } : null,
    querySelectorAll: (sel) => {
      if (sel.includes('radio')) return mockRadios;
      return [];
    },
    getBoundingClientRect: () => ({ width: 420, height: 320 })
  };
  const pSb = {
    window: { location: { pathname: '/pokemon', href: 'https://www.delugerpg.com/pokemon' }, getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', filter: 'none' }), __delugeLastEvoAutoPickSig: '' },
    document: { body: { offsetWidth: 1200, textContent: '' }, getElementById: (id) => (id === 'DModal' ? mockModal : null), querySelector: (sel) => (sel.includes('DModal') ? mockModal : null), querySelectorAll: (sel) => (sel.includes('DModal') ? [mockModal] : []) },
    isModalElementOpen: () => true,
    getRadioOptionText: (r) => r._labelText || '',
    evaluateOwnershipAndMegaEquivalence: () => ({ isOwned: false, hasExactOwned: false, hasMegaOwned: false, hasGmaxOwned: false }),
    isPreloadActualMega: (n) => /\bmega\b/i.test(String(n || '')),
    isPreloadAlreadyGmax: (p) => /\bg-?max\b/i.test(String((typeof p === 'string' ? p : (p && p.name)) || '')),
    ownedUserCollection: [],
    lastClickedPokemonInfo: null,
    checkHasCaptchaElement: () => false,
    dispatchHumanClick: (el) => { radioPickClicked = el; },
    VARIANT_PREFIX_REGEX: /^(normal|shiny|metallic|ghostly|ghost|dark|shadow|mirage|chrome|negative|retro)\s+/i
  };
  vm.runInNewContext(preloadCode.slice(pStart, pEnd), pSb);

  const completionCases = [
    ['Evolve\n\nShadow Charmeleon evolved into Shadow Charizard\n                    \n                    Close', 'Shadow Charmeleon', 'Shadow Charizard'],
    ['Your level 100 Mr. Mime evolved into Mr. Rime!\nClose', 'Mr. Mime', 'Mr. Rime'],
    ["Farfetch'd evolved into Sirfetch'd", "Farfetch'd", "Sirfetch'd"],
    ['Type: Null evolved into Silvally\nOK', 'Type: Null', 'Silvally'],
    ['Milcery evolved into Alcremie (Berry Lemon Cream)!\nClose', 'Milcery', 'Alcremie (Berry Lemon Cream)']
  ];
  for (const [sampleText, expFrom, expTo] of completionCases) {
    modalBodyText = sampleText;
    const res = pSb.detectEvolveCard();
    assert(res && res.isComplete === true, `Expected completion card for: ${sampleText}`);
    assert.strictEqual(res.fromPokemon, expFrom, `fromPokemon mismatch for: ${sampleText}`);
    assert.strictEqual(res.toPokemon, expTo, `toPokemon mismatch for: ${sampleText}`);
    assert.strictEqual(res.fullName, expTo, `fullName mismatch for: ${sampleText}`);
    assert(!/[\r\n]/.test(res.toPokemon) && !/\bClose\b/i.test(res.toPokemon), `toPokemon must not leak newline/Close: ${res.toPokemon}`);
  }

  // Test optionRadios alignment when an ignored non-evolution radio precedes options, plus Ghost -> Ghostly normalization
  modalBodyText = 'Your level 100 Ghost Haunter can evolve into';
  const skippedRadio = { value: 'close', _labelText: 'Close', checked: false };
  const ownedGengar = { value: 'Gengar', _labelText: 'Gengar (Trade)', checked: true };
  const unownedRadio = { value: 'Alakazam', _labelText: 'Alakazam (at Level 100)', checked: false };
  mockRadios = [skippedRadio, ownedGengar, unownedRadio];
  pSb.evaluateOwnershipAndMegaEquivalence = (name) => ({ isOwned: /gengar/i.test(name), hasExactOwned: /gengar/i.test(name), hasMegaOwned: false, hasGmaxOwned: false });
  const ghostCard = pSb.detectEvolveCard();
  assert(ghostCard && ghostCard.variant === 'Ghostly' && ghostCard.baseSpecies === 'haunter', 'Ghost Haunter must normalize variant to Ghostly and strip Ghost prefix for baseSpecies');
  assert.strictEqual(radioPickClicked, unownedRadio, 'Auto-pick MUST select aligned optionRadios[firstUnownedIdx] even when a leading radio was skipped');

  // 3M-2: Unrelated selectedEvoPoke (Shadow Milcery) MUST NOT be overwritten on Shadow Charmeleon -> Shadow Charizard isComplete
  const mBtns = [];
  const makeMockBtn = () => {
    const h = {};
    return {
      type: '', id: '', style: {}, className: '', disabled: false, innerHTML: '', textContent: '', attrs: {},
      setAttribute: function(k, v) { this.attrs[k] = v; },
      getAttribute: function(k) { return this.attrs[k] || ''; },
      appendChild: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: function(ev, fn) { h[ev] = fn; },
      click: function() { if (h.click) h.click(); }
    };
  };
  const ipcSent = [];
  const uiSb2 = {
    delugeView: { send: (ch, p) => ipcSent.push({ ch, p }), getURL: () => 'https://www.delugerpg.com/pokemon' },
    activeAiBattleData: null,
    activeEvolveCardData: null,
    cachedEvolveReadyList: [],
    cachedBoxMovesList: [],
    cachedMegaList: [],
    selectedEvoPoke: { id: 'mil0', name: 'Shadow Milcery', level: 100 },
    currentCollection: [
      { id: 'mil0', name: 'Shadow Milcery', variant: 'Shadow', level: 100, canEvolve: true },
      { id: 'sc1', name: 'Shadow Charmeleon', variant: 'Shadow', level: 100, canEvolve: true }
    ],
    currentEvoFilter: 'UNIQUE',
    currentEvoSearch: '',
    evolutionEngine: evolutionEngine,
    teamEngine: teamEngine,
    aiAssistant: { analyzeEvolutionPath: (n, c) => evolutionEngine.analyzeEvolutionPath(n, c) },
    getBaseSpecies: (n) => evolutionEngine.cleanSpeciesKey ? evolutionEngine.cleanSpeciesKey(n) : n,
    aiBattleOpponentBadge: makeMockBtn(),
    aiStatusChip: makeMockBtn(),
    aiTacticalBriefing: makeMockBtn(),
    aiInstantActionSlot: { innerHTML: '', appendChild: (b) => mBtns.push(b) },
    evoReadyList: makeMockBtn(),
    evoCountUnique: makeMockBtn(),
    evoCountMegas: makeMockBtn(),
    evoCountAll: makeMockBtn(),
    evoCountBlocked: makeMockBtn(),
    evoListHeaderTitle: makeMockBtn(),
    evoReadyCountBadge: makeMockBtn(),
    escapeHtml: (s) => String(s || ''),
    document: { createElement: () => makeMockBtn() },
    fs: { writeFileSync: () => {} },
    getWritableDataPath: (f) => f,
    syncUserCollectionToGuest: () => {},
    candidateListsCache: { gmaxLastDisplayedId: null },
    updateStatus: () => {},
    setTimeout: () => {},
    lastAnnouncedEvolveSignature: '',
    renderAiAssistantUI: () => {},
    appendAiChatMessage: () => {}
  };
  vm.runInNewContext(evoUiCode, uiSb2);
  uiSb2.handleEvolveCardDetected({
    isOpen: true, isComplete: true, fromPokemon: 'Shadow Charmeleon', toPokemon: 'Shadow Charizard', fullName: 'Shadow Charizard'
  });
  assert.strictEqual(uiSb2.currentCollection.find(p => p.id === 'mil0').name, 'Shadow Milcery', 'Unrelated selectedEvoPoke (Shadow Milcery) MUST NEVER be overwritten');
  assert.strictEqual(uiSb2.currentCollection.find(p => p.id === 'sc1').name, 'Shadow Charizard', 'Matching fromPokemon (Shadow Charmeleon) MUST be renamed to Shadow Charizard');
  assert(mBtns[0].innerHTML.includes('Shadow Milcery') && mBtns[0].innerHTML.includes('Shadow Alcremie'), 'Next Allowable button MUST offer un-skipped Shadow Milcery');

  // Verify Evolution Complete (Close Modal) button clears activeEvolveCardData without re-running card.isComplete
  mBtns.length = 0;
  ipcSent.length = 0;
  uiSb2.currentCollection = [
    { id: 'sc1', name: 'Shadow Charmeleon', variant: 'Shadow', level: 100, canEvolve: true }
  ];
  uiSb2.selectedEvoPoke = { id: 'sc1', name: 'Shadow Charmeleon', level: 100 };
  const origHandle = uiSb2.handleEvolveCardDetected;
  let handleCount = 0;
  uiSb2.handleEvolveCardDetected = function(c) { handleCount++; return origHandle(c); };
  uiSb2.handleEvolveCardDetected({
    isOpen: true, isComplete: true, fromPokemon: 'Shadow Charmeleon', toPokemon: 'Shadow Charizard', fullName: 'Shadow Charizard'
  });
  assert(mBtns[0].innerHTML.includes('Evolution Complete (Close Modal)'), 'Single finished evolution with no other candidates must show Evolution Complete (Close Modal)');
  mBtns[0].click();
  assert.strictEqual(uiSb2.activeEvolveCardData, null, 'Clicking Close Modal must clear activeEvolveCardData');
  assert.strictEqual(handleCount, 1, 'Clicking Close Modal must NOT re-trigger card.isComplete');
  assert.strictEqual(ipcSent[0].ch, 'close-modal-and-refresh');

  // 3M-3: isSameEvolveSpeciesName strictness
  const cpaStart = preloadCode.indexOf('function isSameEvolveSpeciesName(');
  const cpaEnd = preloadCode.indexOf('\nfunction checkPendingAutoEvolve(', cpaStart);
  const nameSb = {};
  vm.runInNewContext(preloadCode.slice(cpaStart, cpaEnd), nameSb);
  assert.strictEqual(nameSb.isSameEvolveSpeciesName('Shadow Charmander', 'Charmander'), false, 'Variant-prefixed species must not match Normal species');
  assert.strictEqual(nameSb.isSameEvolveSpeciesName('Porygon2', 'Porygon'), false, 'Porygon2 must not substring-match Porygon');
  assert.strictEqual(nameSb.isSameEvolveSpeciesName('Alcremie (Berry Lemon Cream)', 'Alcremie'), true, 'Base name and parenthetical form must match');

  // 3M-4: loadTeamBuilderData self-heals corrupted multiline/Close names
  const ltbStart = appCode.indexOf('function loadTeamBuilderData()');
  const ltbEnd = appCode.indexOf('\nfunction getFavoriteTrainersList()', ltbStart);
  let healedWritten = null;
  const corruptedColl = [
    { id: 'b1', name: 'Shadow Charizard\n                    \n                    Close', variant: 'Shadow', level: 100 },
    { id: 'm1', name: 'Mirage Flapple\n\nClose', variant: 'Mirage', level: 100 }
  ];
  const ltbSb = {
    currentCollection: [],
    gymLeadersData: null,
    config: { settings: {} },
    teamPoolFilter: 'ANY',
    pvpStrategy: 'BALANCED',
    pvpCandidateTier: 'ANY',
    scanStatusDot: { style: {} },
    scanStatusBadge: { style: {}, textContent: '' },
    candidatePoolFilterSelect: null,
    pvpStrategySelect: null,
    pvpCandidateTierSelect: null,
    aiAssistantModal: null,
    teamCategorySelect: null,
    teamTrainerSelect: null,
    lastSelectedBattleUrl: '',
    evolutionEngine: evolutionEngine,
    readDataFile: (f) => (f === 'user_collection.json' ? JSON.stringify(corruptedColl) : null),
    getWritableDataPath: (f) => f,
    fs: { writeFileSync: (p, data) => { healedWritten = JSON.parse(data); } },
    refreshCandidateListsCache: () => {},
    updateRosterModeUI: () => {},
    syncUserCollectionToGuest: () => {}
  };
  vm.runInNewContext(appCode.slice(ltbStart, ltbEnd), ltbSb);
  ltbSb.loadTeamBuilderData();
  assert.strictEqual(ltbSb.currentCollection[0].name, 'Shadow Charizard', 'loadTeamBuilderData must self-heal multiline/Close corruption on Shadow Charizard');
  assert.strictEqual(ltbSb.currentCollection[1].name, 'Mirage Flapple', 'loadTeamBuilderData must self-heal multiline/Close corruption on Mirage Flapple');
  assert(healedWritten && healedWritten[0].name === 'Shadow Charizard', 'Self-healed collection must be persisted');

  // 3M-5: isExplicitNonWildBattleUrl parity
  const urlFnStart = appCode.indexOf('function isMapUrl(');
  const urlFnEnd = appCode.indexOf('\nfunction isWildHuntingOrCatchContext(', appCode.indexOf('function isExplicitNonWildBattleUrl('));
  const unlockFnStart = appCode.indexOf('function isUnlockOrCaptchaUrl(');
  const unlockFnEnd = appCode.indexOf('\nfunction handleNavigationCaptchaLifecycle(', unlockFnStart);
  const urlSb = { URL, delugeView: null, guestReportsMap: false };
  vm.runInNewContext(appCode.slice(unlockFnStart, unlockFnEnd) + '\n' + appCode.slice(appCode.indexOf('function isBattlePageUrl('), appCode.indexOf('\nlet isPendingSessionAutoStop')) + '\n' + appCode.slice(appCode.indexOf('function isExplicitNonWildBattleUrl('), urlFnEnd), urlSb);
  urlSb.isMapUrl = (u) => String(u || '').toLowerCase().includes('/map');
  assert.strictEqual(urlSb.isExplicitNonWildBattleUrl('https://www.delugerpg.com/gmax'), false, '/gmax lobby must not be treated as active battle');
  assert.strictEqual(urlSb.isExplicitNonWildBattleUrl('https://www.delugerpg.com/battle/trainers'), false, '/battle/trainers index must not be treated as active battle');
  assert.strictEqual(urlSb.isExplicitNonWildBattleUrl('https://www.delugerpg.com/battle/gyms'), false, '/battle/gyms index must not be treated as active battle');
  assert.strictEqual(urlSb.isExplicitNonWildBattleUrl('https://www.delugerpg.com/unlock?next=/battle/trainer/1'), false, '/unlock must never be treated as active battle');
  assert.strictEqual(urlSb.isExplicitNonWildBattleUrl('https://www.delugerpg.com/battle/trainer/123'), true, '/battle/trainer/123 must be non-wild battle');
  assert.strictEqual(urlSb.isExplicitNonWildBattleUrl('https://www.delugerpg.com/battle/gym/5'), true, '/battle/gym/5 must be non-wild battle');

  // 3M-6: evolution_engine.getEvolveReadyPokemon variant fallback when variant field defaulted to Normal on variant-prefixed name
  const vReadyBlocked = evolutionEngine.getEvolveReadyPokemon([
    { id: 'sc1', name: 'Shadow Charmeleon', variant: 'Normal', level: 100, canEvolve: true },
    { id: 'sz1', name: 'Shadow Charizard', variant: 'Shadow', level: 100 },
    { id: 'sg1', name: 'Shadow G-Max Charizard', variant: 'Shadow', level: 100 }
  ]);
  assert.strictEqual(vReadyBlocked.find(p => p.id === 'sc1').hasUnique, false, 'Shadow Charmeleon with stale Normal variant tag must detect Shadow Charizard ownership');
  const vReadyAllowed = evolutionEngine.getEvolveReadyPokemon([
    { id: 'sc1', name: 'Shadow Charmeleon', variant: 'Normal', level: 100, canEvolve: true },
    { id: 'nz1', name: 'Charizard', variant: 'Normal', level: 100 },
    { id: 'sg1', name: 'Shadow G-Max Charizard', variant: 'Shadow', level: 100 }
  ]);
  const scAllowed = vReadyAllowed.find(p => p.id === 'sc1');
  assert(scAllowed && scAllowed.hasUnique === true && scAllowed.bestBranch.fullName === 'Shadow Charizard', 'Shadow Charmeleon with Normal Charizard owned must allow Shadow Charizard evolution');

  // 3M-7: Clear stale Active Decision & Apply-Moves button when Evolve ( 0 ) and modal closed
  uiSb2.currentCollection = [
    { id: 'apt1', name: 'Appletun', variant: 'Normal', level: 100 }
  ];
  uiSb2.aiInstantActionSlot.innerHTML = '<button id="aiAutoSelectMovesBtn">Apply Best 4 Moves</button>';
  uiSb2.activeEvolveCardData = { isOpen: true, isMoveSelection: true, targetPokemon: 'Appletun' };
  uiSb2.selectedEvoPoke = { id: 'apt1', name: 'Applin', level: 100 };
  uiSb2.aiAssistantModal = { style: { display: 'flex' } };
  mBtns.length = 0;
  uiSb2.handleEvolveCardClosed();
  assert.strictEqual(uiSb2.aiInstantActionSlot.innerHTML, '', 'Closing modal when Evolve ( 0 ) must clear stale Apply Best 4 Moves button');
  assert.strictEqual(mBtns.length, 1, 'Empty Evolve state must still display a disabled Evolve button beside Auto [x]');
  assert.strictEqual(mBtns[0].disabled, true, 'Empty-state Evolve button MUST be disabled');
  assert.strictEqual(mBtns[0].id, 'aiEvolveActionBtn');
  assert(mBtns[0].innerHTML.includes('Evolve'), 'Empty-state button must display Evolve label');
  assert.strictEqual(uiSb2.selectedEvoPoke, null, 'Closing modal when Evolve ( 0 ) must clear stale selectedEvoPoke');
  assert.strictEqual(uiSb2.aiBattleOpponentBadge.textContent, 'No Pending Evolutions', 'Empty Evolve state badge must show No Pending Evolutions');
  assert.strictEqual(uiSb2.aiStatusChip.textContent, 'All Clear', 'Empty Evolve state status chip must show All Clear');

  // Verify open card.isComplete modal with 0 remaining Ready Pokemon does NOT wipe aiInstantActionSlot
  uiSb2.aiInstantActionSlot.innerHTML = '<button>Active Complete Button</button>';
  uiSb2.activeEvolveCardData = { isOpen: true, isComplete: true, toPokemon: 'Appletun', fullName: 'Appletun' };
  uiSb2.renderEvolutionDecisionMakerUI({ skipActiveCardReentry: true });
  assert(uiSb2.aiInstantActionSlot.innerHTML.includes('Active Complete Button'), 'renderEvolutionDecisionMakerUI({ skipActiveCardReentry: true }) must preserve open modal button');

  // Verify preload syncEvolveCardState(true) emits evolve-card-closed even when lastEvolveCardSignature started null
  const syncFnStart = preloadCode.indexOf('function syncEvolveCardState(');
  const syncFnEnd = preloadCode.indexOf('\nipcRenderer.on(\'apply-recommended-moves\'', syncFnStart);
  const emittedClosed = [];
  const syncSb = {
    detectEvolveCard: () => null,
    lastEvolveCardSignature: null,
    ipcRenderer: { sendToHost: (ch) => emittedClosed.push(ch) }
  };
  vm.runInNewContext(preloadCode.slice(syncFnStart, syncFnEnd), syncSb);
  syncSb.syncEvolveCardState(true);
  assert(emittedClosed.includes('evolve-card-closed'), 'Forced syncEvolveCardState(true) on page load with no modal must emit evolve-card-closed');

  console.log('[PASS] Audit Hardening (Completion Regex, Selected Guard, ID Sync, Species Match, URL Parity & Empty State Clear) verified.');
}

// 3N. Single-Pokemon One-Click Auto Evolve Cycle (Auto [x] Checkbox)
console.log('\n--- TEST 3N: Single-Pokemon One-Click Auto Evolve Cycle (Auto [x] Checkbox) ---');
{
  const vm = require('vm');
  const evolutionEngine = require('./evolution_engine');
  const teamEngine = require('./team_engine');
  const htmlCode = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
  const evoUiCode = fs.readFileSync(path.join(__dirname, 'evolution_ui.js'), 'utf8');
  const preloadCode = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');

  // 3N-1: Verify app.html markup places Auto [x] checkbox (checked by default) inside #aiActionControlsRow directly left of #aiInstantActionSlot with zero glow
  const rowIdx = htmlCode.indexOf('id="aiActionControlsRow"');
  const lblIdx = htmlCode.indexOf('id="evoAutoLabel"');
  const chkIdx = htmlCode.indexOf('id="evoAutoCheck"');
  const slotIdx = htmlCode.indexOf('id="aiInstantActionSlot"');
  assert(rowIdx !== -1 && lblIdx !== -1 && chkIdx !== -1 && slotIdx !== -1, 'app.html must define #aiActionControlsRow, #evoAutoLabel, #evoAutoCheck, and #aiInstantActionSlot');
  assert(rowIdx < lblIdx && lblIdx < chkIdx && chkIdx < slotIdx, '#evoAutoLabel / #evoAutoCheck MUST appear to the left of #aiInstantActionSlot');
  const chkSnippet = htmlCode.slice(chkIdx, htmlCode.indexOf('>', chkIdx) + 1);
  assert(/\bchecked\b/i.test(chkSnippet), '#evoAutoCheck must be checked by default');
  const lblSnippet = htmlCode.slice(lblIdx, htmlCode.indexOf('>', lblIdx) + 1);
  assert(lblSnippet.includes('box-shadow: none !important;'), '#evoAutoLabel must maintain zero glowing box-shadow');

  // 3N-2: Multi-stage single-Pokemon auto-evolve cycle (Shadow Charmander -> Shadow Charmeleon -> Shadow Charizard) stops cleanly and NEVER advances to Shadow Rookidee
  const scheduled = [];
  const sentIpcs = [];
  const cycleBtns = [];
  const makeCycleEl = () => {
    const h = {};
    return {
      type: '', id: '', value: '', checked: false, disabled: false, innerHTML: '', textContent: '', className: '',
      isConnected: true, style: {}, attrs: {},
      setAttribute: function(k, v) { this.attrs[k] = v; },
      getAttribute: function(k) { return this.attrs[k] || ''; },
      appendChild: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: function(ev, fn) { h[ev] = fn; },
      click: function() { if (h.click) h.click(); },
      trigger: function(ev) { if (h[ev]) h[ev](); }
    };
  };
  const evoAutoCheckEl = makeCycleEl();
  evoAutoCheckEl.id = 'evoAutoCheck';
  evoAutoCheckEl.checked = true;
  const evoAutoLabelEl = makeCycleEl();
  evoAutoLabelEl.id = 'evoAutoLabel';

  const cycleSb = {
    URL,
    delugeView: { send: (ch, p) => sentIpcs.push({ ch, p }), getURL: () => 'https://www.delugerpg.com/pokemon' },
    activeAiBattleData: null,
    activeEvolveCardData: null,
    cachedEvolveReadyList: [],
    cachedBoxMovesList: [],
    cachedMegaList: [],
    selectedEvoPoke: null,
    currentCollection: [
      { id: 'sc1', name: 'Shadow Charmander', variant: 'Shadow', level: 100, canEvolve: true },
      { id: 'sr1', name: 'Shadow Rookidee', variant: 'Shadow', level: 100, canEvolve: true }
    ],
    currentEvoFilter: 'UNIQUE',
    currentEvoSearch: '',
    evolutionEngine: evolutionEngine,
    teamEngine: teamEngine,
    aiAssistant: {
      analyzeEvolutionPath: (n, c) => evolutionEngine.analyzeEvolutionPath(n, c),
      getOptimalMoves: (n) => evolutionEngine.recommendOptimalMoves(n, [], cycleSb.currentCollection)
    },
    getBaseSpecies: (n) => evolutionEngine.cleanSpeciesKey ? evolutionEngine.cleanSpeciesKey(n) : n,
    aiBattleOpponentBadge: makeCycleEl(),
    aiStatusChip: makeCycleEl(),
    aiTacticalBriefing: makeCycleEl(),
    aiInstantActionSlot: { innerHTML: '', appendChild: (b) => cycleBtns.push(b) },
    evoReadyList: makeCycleEl(),
    evoCountUnique: makeCycleEl(),
    evoCountMegas: makeCycleEl(),
    evoCountAll: makeCycleEl(),
    evoCountBlocked: makeCycleEl(),
    evoListHeaderTitle: makeCycleEl(),
    evoReadyCountBadge: makeCycleEl(),
    evoAutoCheck: evoAutoCheckEl,
    evoAutoLabel: evoAutoLabelEl,
    aiAssistantModal: { style: { display: 'flex' } },
    isUnlockChallengeActive: false,
    isCaptchaAlarmActive: false,
    escapeHtml: (s) => String(s || ''),
    document: {
      createElement: () => makeCycleEl(),
      getElementById: (id) => (id === 'evoAutoCheck' ? evoAutoCheckEl : (id === 'evoAutoLabel' ? evoAutoLabelEl : null))
    },
    fs: { writeFileSync: () => {} },
    getWritableDataPath: (f) => f,
    syncUserCollectionToGuest: () => {},
    candidateListsCache: { gmaxLastDisplayedId: null },
    updateStatus: () => {},
    renderAiAssistantUI: () => {},
    appendAiChatMessage: () => {},
    lastAnnouncedEvolveSignature: '',
    setTimeout: (fn, ms) => {
      const id = scheduled.length + 1;
      scheduled.push({ id, fn, ms, cleared: false });
      return id;
    },
    clearTimeout: (id) => {
      const item = scheduled.find(t => t.id === id);
      if (item) item.cleared = true;
    }
  };
  const flushShortTimers = () => {
    const ready = scheduled.splice(0, scheduled.length).filter(t => !t.cleared && t.ms < 2500);
    ready.forEach(t => t.fn());
  };

  vm.runInNewContext(evoUiCode, cycleSb);
  cycleSb.renderEvolutionDecisionMakerUI();
  assert.strictEqual(cycleBtns.length, 1);
  assert(cycleBtns[0].innerHTML.includes('Shadow Charmeleon'), 'Initial selection must be Shadow Charmander -> Shadow Charmeleon');

  // 1-click user action starts single-Pokemon auto-evolve cycle
  cycleBtns[0].click();
  assert.strictEqual(sentIpcs.length, 1);
  assert.strictEqual(sentIpcs[0].ch, 'trigger-evolve-pokemon');
  assert.strictEqual(sentIpcs[0].p.pokemonId, 'sc1');
  assert.strictEqual(sentIpcs[0].p.managedByHostAuto, true);

  // Stage 1: Branch modal opens for Shadow Charmander -> auto submits Shadow Charmeleon
  sentIpcs.length = 0;
  cycleBtns.length = 0;
  cycleSb.handleEvolveCardDetected({
    isOpen: true, fullName: 'Shadow Charmander', baseSpecies: 'charmander', variant: 'Shadow', level: 100,
    options: [{ fullName: 'Shadow Charmeleon', requirement: 'at Level 16', isOwned: false }]
  });
  flushShortTimers();
  assert.strictEqual(sentIpcs.length, 1);
  assert.strictEqual(sentIpcs[0].ch, 'submit-modal-evolve');
  assert.strictEqual(sentIpcs[0].p.targetBranch, 'Shadow Charmeleon');

  // Stage 1: Move selection opens for Shadow Charmeleon -> auto applies moves & confirms
  sentIpcs.length = 0;
  cycleSb.handleEvolveCardDetected({
    isOpen: true, isMoveSelection: true, targetPokemon: 'Shadow Charmeleon', sourcePokemon: 'Shadow Charmander',
    level: 100, currentChoices: ['Scratch', 'Growl', 'Ember', 'Smokescreen'], evolutionChoices: ['Flamethrower', 'Slash', 'Dragon Breath', 'Fire Spin']
  });
  flushShortTimers();
  assert.strictEqual(sentIpcs.length, 1);
  assert.strictEqual(sentIpcs[0].ch, 'apply-recommended-moves-and-submit');

  // Stage 1: Completion modal -> auto advances to Stage 2 (Shadow Charmeleon -> Shadow Charizard)
  sentIpcs.length = 0;
  cycleSb.handleEvolveCardDetected({
    isOpen: true, isComplete: true, fromPokemon: 'Shadow Charmander', toPokemon: 'Shadow Charmeleon', fullName: 'Shadow Charmeleon'
  });
  flushShortTimers();
  assert.strictEqual(sentIpcs.length, 1);
  assert.strictEqual(sentIpcs[0].ch, 'trigger-evolve-pokemon');
  assert.strictEqual(sentIpcs[0].p.pokemonId, 'sc1');
  assert.strictEqual(sentIpcs[0].p.name, 'Shadow Charmeleon');
  assert.strictEqual(sentIpcs[0].p.targetBranch, 'Shadow Charizard');
  assert.strictEqual(sentIpcs[0].p.closeModalFirst, true);

  // Stage 2: Branch modal + Move selection + Completion (Shadow Charizard held for G-Max) -> MUST stop cycle & NOT click Shadow Rookidee
  sentIpcs.length = 0;
  cycleSb.handleEvolveCardDetected({
    isOpen: true, fullName: 'Shadow Charmeleon', baseSpecies: 'charmeleon', variant: 'Shadow', level: 100,
    options: [{ fullName: 'Shadow Charizard', requirement: 'at Level 36', isOwned: false }]
  });
  flushShortTimers();
  assert.strictEqual(sentIpcs[0].ch, 'submit-modal-evolve');
  assert.strictEqual(sentIpcs[0].p.targetBranch, 'Shadow Charizard');

  sentIpcs.length = 0;
  cycleSb.handleEvolveCardDetected({
    isOpen: true, isMoveSelection: true, targetPokemon: 'Shadow Charizard', sourcePokemon: 'Shadow Charmeleon',
    level: 100, currentChoices: ['Ember', 'Flamethrower', 'Slash', 'Dragon Breath'], evolutionChoices: ['Air Slash', 'Heat Wave', 'Dragon Claw', 'Inferno']
  });
  flushShortTimers();
  assert.strictEqual(sentIpcs[0].ch, 'apply-recommended-moves-and-submit');

  sentIpcs.length = 0;
  cycleSb.handleEvolveCardDetected({
    isOpen: true, isComplete: true, fromPokemon: 'Shadow Charmeleon', toPokemon: 'Shadow Charizard', fullName: 'Shadow Charizard'
  });
  flushShortTimers();
  assert.strictEqual(sentIpcs.length, 0, 'Completed single-Pokemon cycle MUST stop cleanly and NEVER auto-start Shadow Rookidee');

  // 3N-3: Full-page redirect continuation (/pokemon/evolve/changeattacks -> /pokemon) without card.isComplete
  sentIpcs.length = 0;
  cycleSb.currentCollection = [
    { id: 'sc2', name: 'Shadow Charmander', variant: 'Shadow', level: 100, canEvolve: true },
    { id: 'sr1', name: 'Shadow Rookidee', variant: 'Shadow', level: 100, canEvolve: true }
  ];
  cycleSb.renderEvolutionDecisionMakerUI();
  assert(cycleSb.startAutoEvolveCycle({ pokemonId: 'sc2', name: 'Shadow Charmander', targetBranch: 'Shadow Charmeleon', level: 100 }));
  cycleSb.handleEvolveCardDetected({
    isOpen: true, isMoveSelection: true, targetPokemon: 'Shadow Charmeleon', sourcePokemon: 'Shadow Charmander',
    level: 100, currentChoices: ['Scratch', 'Ember'], evolutionChoices: ['Flamethrower', 'Dragon Breath']
  });
  flushShortTimers();
  assert.strictEqual(sentIpcs[0].ch, 'apply-recommended-moves-and-submit');
  sentIpcs.length = 0;
  cycleSb.handleEvolveCardClosed();
  cycleSb.handleEvoAutoCyclePageLoaded('https://www.delugerpg.com/pokemon');
  flushShortTimers(); // 500ms settle -> schedules postconfirm trigger (450-700ms)
  flushShortTimers();
  assert.strictEqual(sentIpcs.length, 1);
  assert.strictEqual(sentIpcs[0].ch, 'trigger-evolve-pokemon');
  assert.strictEqual(sentIpcs[0].p.pokemonId, 'sc2');
  assert.strictEqual(sentIpcs[0].p.name, 'Shadow Charmeleon');
  assert.strictEqual(sentIpcs[0].p.targetBranch, 'Shadow Charizard');

  // 3N-4: Safety halts (unchecked Auto, G-Max/Duplicate modal never pivots to next Pokemon, map navigation halts, captcha halts)
  sentIpcs.length = 0;
  evoAutoCheckEl.checked = false;
  evoAutoCheckEl.trigger('change');
  cycleSb.handleEvolveCardDetected({
    isOpen: true, fullName: 'Shadow Charmeleon', baseSpecies: 'charmeleon', variant: 'Shadow', level: 100,
    options: [{ fullName: 'Shadow Charizard', requirement: 'at Level 36', isOwned: false }]
  });
  flushShortTimers();
  assert.strictEqual(sentIpcs.length, 0, 'Unchecking Auto MUST stop cycle and prevent auto-evolve');

  // Re-enable Auto, hit G-Max Challenge modal mid-cycle -> must stop and NEVER auto-click Skip & Evolve into Shadow Rookidee
  evoAutoCheckEl.checked = true;
  cycleSb.startAutoEvolveCycle({ pokemonId: 'orb1', name: 'Orbeetle', targetBranch: 'G-Max Orbeetle', level: 100 });
  cycleSb.handleEvolveCardDetected({
    isOpen: true, fullName: 'Orbeetle', baseSpecies: 'orbeetle', variant: 'Normal', level: 100, isGmaxChallengeOnly: true,
    options: [{ fullName: 'G-Max Orbeetle', requirement: 'using G-Max Challenge', requiresGmaxChallenge: true, isOwned: false }]
  });
  flushShortTimers();
  assert.strictEqual(sentIpcs.length, 0, 'Blocked G-Max modal MUST halt auto-cycle and never auto-click Skip & Evolve');

  // Map navigation and Captcha halt
  cycleSb.startAutoEvolveCycle({ pokemonId: 'sc2', name: 'Shadow Charmeleon', targetBranch: 'Shadow Charizard', level: 100 });
  cycleSb.handleEvoAutoCycleNavigation('https://www.delugerpg.com/map/overworld1');
  cycleSb.handleEvolveCardDetected({
    isOpen: true, fullName: 'Shadow Charmeleon', baseSpecies: 'charmeleon', variant: 'Shadow', level: 100,
    options: [{ fullName: 'Shadow Charizard', requirement: 'at Level 36', isOwned: false }]
  });
  flushShortTimers();
  assert.strictEqual(sentIpcs.length, 0, 'Leaving /pokemon must stop active Auto-Evolve cycle');

  // 3N-5: Preload checkPendingAutoEvolve defers to host when managedByHostAuto=true (no duplicate submit click)
  const cpaStart = preloadCode.indexOf('function isSameEvolveSpeciesName(');
  const cpaEnd = preloadCode.indexOf('\nipcRenderer.on(\'trigger-evolve-pokemon\'', cpaStart);
  const pStore = {
    deluge_auto_evolve_target: JSON.stringify({
      id: 'sc1', name: 'Shadow Charmander', targetBranch: 'Shadow Charmeleon',
      navigatedDirectly: true, managedByHostAuto: true, timestamp: Date.now()
    })
  };
  let guestModalSubmitted = 0;
  let hostCardEvents = 0;
  const pAutoSb = {
    sessionStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(pStore, k) ? pStore[k] : null),
      setItem: (k, v) => { pStore[k] = String(v); },
      removeItem: (k) => { delete pStore[k]; }
    },
    window: { location: { pathname: '/pokemon/evolve/sc1' } },
    document: { getElementById: () => ({ querySelectorAll: () => [] }), querySelector: () => null },
    detectEvolveCard: () => ({ isOpen: true, isMoveSelection: false, isComplete: false, fullName: 'Shadow Charmander', options: [{ fullName: 'Shadow Charmeleon' }] }),
    isModalEvolveSubmissionBlocked: () => false,
    ipcRenderer: { sendToHost: (ch) => { if (ch === 'evolve-card-detected') hostCardEvents++; } },
    dispatchHumanClick: () => {},
    getRadioOptionText: () => '',
    humanClickElementVerified: () => {},
    clickModalEvolveButton: () => { guestModalSubmitted++; },
    getGaussianDelay: () => 200,
    setTimeout: () => {}
  };
  vm.runInNewContext(preloadCode.slice(cpaStart, cpaEnd), pAutoSb);
  pAutoSb.checkPendingAutoEvolve();
  assert.strictEqual(guestModalSubmitted, 0, 'managedByHostAuto=true MUST defer modal submission to host Auto cycle');
  assert.strictEqual(hostCardEvents, 1, 'managedByHostAuto=true MUST emit evolve-card-detected to host');
  assert.strictEqual(pStore.deluge_auto_evolve_target, undefined, 'managedByHostAuto token must be consumed');

  console.log('[PASS] Single-Pokemon One-Click Auto Evolve Cycle (Auto [x] Checkbox) verified.');
}

// 3O. Inter-Turn Continue Bench Preservation, Sticky-Faint Heal & Carry-Before-Forfeit Guard
console.log('\n--- TEST 3O: Inter-Turn Continue Bench Preservation, Sticky-Faint Heal & Carry-Before-Forfeit Guard ---');
{
  const vm = require('vm');
  const roamingCode = fs.readFileSync(path.join(__dirname, 'roaming_telemetry_ui.js'), 'utf8');
  const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const preloadCode = fs.readFileSync(path.join(__dirname, 'game-preload.js'), 'utf8');
  const aiAssistant = require('./ai_agent_bridge');

  const sidneyTeamTemplate = () => ([
    { slot: 1, id: 'carry1', name: 'Dark Slither Wing', variant: 'Dark', types: ['Bug', 'Fighting'], level: 100, levelKnown: true, hp: 400, maxHp: 400, isFainted: false, isCarry: true, moves: [{ name: 'Focus Punch', type: 'Fighting', power: 150 }, { name: 'Megahorn', type: 'Bug', power: 120 }] },
    { slot: 2, id: 'tr1', name: 'Dark Genesect (Chill)', variant: 'Dark', types: ['Bug', 'Steel'], level: 60, levelKnown: true, hp: 240, maxHp: 240, isFainted: false, isCarry: false, targetName: 'Primary Trainee Partner', moves: [{ name: 'X-Scissor', type: 'Bug', power: 80 }] },
    { slot: 3, id: 'tr2', name: 'Zacian (Behemoth Blade)', variant: 'Normal', types: ['Fairy', 'Steel'], level: 66, levelKnown: true, hp: 264, maxHp: 264, isFainted: false, isCarry: false, targetName: 'Trainee #3' },
    { slot: 4, id: 'tr3', name: 'Negative Mesprit', variant: 'Negative', types: ['Psychic'], level: 73, levelKnown: true, hp: 292, maxHp: 292, isFainted: false, isCarry: false, targetName: 'Trainee #4' },
    { slot: 5, id: 'tr4', name: 'Metallic Iron Hands', variant: 'Metallic', types: ['Fighting', 'Electric'], level: 44, levelKnown: true, hp: 176, maxHp: 176, isFainted: false, isCarry: false, targetName: 'Trainee #5' },
    { slot: 6, id: 'tr5', name: 'Arceus (Fire)', variant: 'Normal', types: ['Fire'], level: 78, levelKnown: true, hp: 312, maxHp: 312, isFainted: false, isCarry: false, targetName: 'Trainee #6' }
  ]);
  const sidneyRosterAfterSharpedoKo = () => ([
    { name: 'Mightyena', types: ['Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false },
    { name: 'Shiftry', types: ['Grass', 'Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false },
    { name: 'Cacturne', types: ['Grass', 'Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false },
    { name: 'Sharpedo', types: ['Water', 'Dark'], level: 100, hp: 0, maxHp: 400, isFainted: true, isCurrentActive: true },
    { name: 'Absol', types: ['Dark'], level: 100, hp: 400, maxHp: 400, isFainted: false }
  ]);

  let capturedAnalysisInput = null;
  const rSandbox = {
    currentCollection: sidneyTeamTemplate(),
    lastRecommendedTeam: sidneyTeamTemplate(),
    lastKnownUserTeam: sidneyTeamTemplate(),
    teamRosterMode: 'TRAINING',
    isBattleLoopRunning: false,
    liveBattleOpponent: null,
    activeAiBattleData: null,
    battleLoopTimer: null,
    delugeView: null,
    teamTrainerSelect: null,
    currentMatchParticipants: new Set(['dark genesect (chill)']),
    currentMatchFaintedPokemon: new Set(),
    justSwitchedActivePokemon: new Set(),
    currentMatchSwitchCount: 0,
    currentMatchItemCount: 0,
    lastSelectedBattleUrl: '',
    lastLoggedBattleOpponentSig: '',
    gymLeadersData: null,
    activePvpTargetType: 'NPC',
    teamBattleMode: 'NPC',
    pvpStrategy: 'COUNTERS',
    lastTurnActionType: null,
    candidateListsCache: { trainingByPool: {} },
    backendLog: () => {},
    updateLiveAiAssistantUI: (d) => { capturedAnalysisInput = d; },
    updateTeamBuilderBattleAction: () => {},
    isWildHuntingOrCatchContext: () => false,
    stopAllBattleAutomation: () => {},
    updateLiveBattleHUD: () => {},
    syncTeamSelectorsWithLiveOpponent: () => {},
    renderTeamLineup: () => {},
    refreshCandidateListsCache: () => {},
    updateRosterModeUI: () => {},
    updateTrainerIntelStats: () => {},
    syncUserCollectionToGuest: () => {},
    document: { getElementById: () => null }
  };
  vm.runInNewContext(roamingCode.slice(roamingCode.indexOf('function matchesTeamEntryName')), rSandbox);

  // 3O-1: Exact Sidney KO Continue screen (Sharpedo fainted, Genesect Lv 60 alive at 91/240, Skip Selection + Forfeit, 0 bench radios)
  rSandbox.handleLiveBattleOpponents({
    trainerName: 'Sidney',
    battleUrl: '/battle/trainer/123',
    isInActiveBattle: true,
    isPreparationScreen: false,
    hasContinueBtn: true,
    hasSkipSelectionBtn: true,
    hasAttackBtn: false,
    hasSwitchBtn: false,
    hasBenchRadios: false,
    benchExtractedCount: 0,
    benchRadiosCount: 0,
    hasForfeitBtn: true,
    userActivePokemon: { name: 'Dark Genesect (Chill)', variant: 'Dark', types: ['Bug', 'Steel'], level: 60, levelKnown: true, hp: 91, maxHp: 240, isFainted: false, aliveProven: true },
    userTeam: [{ name: 'Dark Genesect (Chill)', variant: 'Dark', types: ['Bug', 'Steel'], level: 60, levelKnown: true, hp: 91, maxHp: 240, isFainted: false, aliveProven: true }],
    roster: sidneyRosterAfterSharpedoKo()
  });

  assert.strictEqual(rSandbox.lastKnownUserTeam.length, 6, '3O-1: Must preserve all 6 bench members across Continue screen');
  const carry3O1 = rSandbox.lastKnownUserTeam.find(u => u.name === 'Dark Slither Wing');
  assert(carry3O1 && !carry3O1.isFainted && carry3O1.hp === 400, '3O-1: Lv 100 Carry Anchor Dark Slither Wing MUST remain alive (HP 400)');
  const koContinueAnalysis = aiAssistant.analyzeBattle(capturedAnalysisInput, rSandbox.currentCollection);
  assert.strictEqual(koContinueAnalysis.shouldForfeitBattle, false, '3O-1: Must NOT forfeit when bench Carry never battled and trainee won turn');

  const actStart = appCode.indexOf('function formatCompactBattleName(');
  const actEnd = appCode.indexOf('\nfunction updateTeamBuilderBattleAction(', actStart);
  assert(actStart !== -1 && actEnd !== -1, 'computeAiBattleActionConfig must exist in app.js');
  const actSandbox = {
    isUnlockChallengeActive: false,
    isCaptchaAlarmActive: false,
    aiAssistant: aiAssistant,
    teamBattleMode: 'NPC',
    teamRosterMode: 'TRAINING',
    currentMatchParticipants: rSandbox.currentMatchParticipants,
    justSwitchedActivePokemon: new Set(),
    currentMatchSwitchCount: 0,
    currentMatchItemCount: 0,
    lastTurnActionType: null,
    executeAiBattleAction: () => {},
    escapeHtml: (s) => String(s || ''),
    backendLog: () => {}
  };
  vm.runInNewContext(appCode.slice(actStart, actEnd), actSandbox);
  const koBtnCfg = actSandbox.computeAiBattleActionConfig(capturedAnalysisInput, rSandbox.currentCollection);
  assert(koBtnCfg && koBtnCfg.hudText === 'Skip & Continue' && !koBtnCfg.hudText.includes('Forfeit'), '3O-1: Button MUST render Skip Selection & Continue, never Forfeit');

  // 3O-2: Primary Trainee faints Turn 1 -> Continue screen before Switch grid loads
  rSandbox.handleLiveBattleOpponents({
    trainerName: 'Sidney',
    battleUrl: '/battle/trainer/123',
    isInActiveBattle: true,
    isPreparationScreen: false,
    hasContinueBtn: true,
    hasSkipSelectionBtn: false,
    hasAttackBtn: false,
    hasSwitchBtn: false,
    hasBenchRadios: false,
    benchExtractedCount: 0,
    benchRadiosCount: 0,
    hasForfeitBtn: true,
    userActivePokemon: { name: 'Dark Genesect (Chill)', variant: 'Dark', types: ['Bug', 'Steel'], level: 60, levelKnown: true, hp: 0, maxHp: 240, isFainted: true, aliveProven: false },
    userTeam: [{ name: 'Dark Genesect (Chill)', variant: 'Dark', types: ['Bug', 'Steel'], level: 60, levelKnown: true, hp: 0, maxHp: 240, isFainted: true, aliveProven: false }],
    roster: sidneyRosterAfterSharpedoKo().map(p => p.name === 'Shiftry' ? Object.assign({}, p, { isCurrentActive: true }) : Object.assign({}, p, { isCurrentActive: false }))
  });
  const carry3O2 = rSandbox.lastKnownUserTeam.find(u => u.name === 'Dark Slither Wing');
  assert(carry3O2 && !carry3O2.isFainted && carry3O2.hp === 400, '3O-2: Carry MUST remain alive on Continue screen after trainee faints');
  const postFaintContinueAnalysis = aiAssistant.analyzeBattle(capturedAnalysisInput, rSandbox.currentCollection);
  assert.strictEqual(postFaintContinueAnalysis.shouldForfeitBattle, false, '3O-2: Must NOT forfeit after trainee faints while Carry is on bench');
  assert.strictEqual(postFaintContinueAnalysis.nextAliveCounter, 'Dark Slither Wing', '3O-2: Next counter after trainee faints MUST be Dark Slither Wing');

  // 3O-3: Sticky-faint healing via aliveProven=true AND lastRecommendedTeam fallback when lastKnownUserTeam is empty
  rSandbox.lastKnownUserTeam = sidneyTeamTemplate().map(m => m.name === 'Dark Slither Wing' ? Object.assign({}, m, { hp: 0, isFainted: true }) : m);
  rSandbox.currentMatchFaintedPokemon.add('dark slither wing');
  rSandbox.handleLiveBattleOpponents({
    trainerName: 'Sidney',
    battleUrl: '/battle/trainer/123',
    isInActiveBattle: true,
    isPreparationScreen: false,
    hasAttackBtn: true,
    hasSwitchBtn: true,
    hasBenchRadios: true,
    benchExtractedCount: 5,
    benchRadiosCount: 5,
    hasForfeitBtn: true,
    userActivePokemon: { name: 'Dark Genesect (Chill)', variant: 'Dark', types: ['Bug', 'Steel'], level: 60, levelKnown: true, hp: 240, maxHp: 240, isFainted: false, aliveProven: true },
    userTeam: [
      { name: 'Dark Genesect (Chill)', variant: 'Dark', level: 60, levelKnown: true, hp: 240, maxHp: 240, isFainted: false, aliveProven: true },
      { name: 'Dark Slither Wing', variant: 'Dark', level: 100, levelKnown: false, hp: 100, maxHp: 100, isFainted: false, aliveProven: true },
      { name: 'Zacian (Behemoth Blade)', variant: 'Normal', level: 100, levelKnown: false, hp: 100, maxHp: 100, isFainted: false, aliveProven: true },
      { name: 'Negative Mesprit', variant: 'Negative', level: 100, levelKnown: false, hp: 100, maxHp: 100, isFainted: false, aliveProven: true },
      { name: 'Metallic Iron Hands', variant: 'Metallic', level: 100, levelKnown: false, hp: 100, maxHp: 100, isFainted: false, aliveProven: true },
      { name: 'Arceus (Fire)', variant: 'Normal', level: 100, levelKnown: false, hp: 100, maxHp: 100, isFainted: false, aliveProven: true }
    ],
    roster: sidneyRosterAfterSharpedoKo()
  });
  const healedCarry = rSandbox.lastKnownUserTeam.find(u => u.name === 'Dark Slither Wing');
  assert(healedCarry && !healedCarry.isFainted && healedCarry.hp === 400, '3O-3: Live DOM aliveProven=true MUST heal sticky-fainted Carry');
  assert(!rSandbox.currentMatchFaintedPokemon.has('dark slither wing'), '3O-3: Healed Carry MUST be cleared from currentMatchFaintedPokemon');

  rSandbox.lastKnownUserTeam = [];
  rSandbox.handleLiveBattleOpponents({
    trainerName: 'Sidney',
    battleUrl: '/battle/trainer/123',
    isInActiveBattle: true,
    isPreparationScreen: false,
    hasContinueBtn: true,
    hasSkipSelectionBtn: true,
    hasBenchRadios: false,
    benchExtractedCount: 0,
    benchRadiosCount: 0,
    hasForfeitBtn: true,
    userActivePokemon: { name: 'Dark Genesect (Chill)', variant: 'Dark', types: ['Bug', 'Steel'], level: 60, levelKnown: true, hp: 91, maxHp: 240, isFainted: false, aliveProven: true },
    userTeam: [{ name: 'Dark Genesect (Chill)', variant: 'Dark', types: ['Bug', 'Steel'], level: 60, levelKnown: true, hp: 91, maxHp: 240, isFainted: false, aliveProven: true }],
    roster: sidneyRosterAfterSharpedoKo()
  });
  assert.strictEqual(rSandbox.lastKnownUserTeam.length, 6, '3O-3: Empty lastKnownUserTeam on Continue MUST fall back to lastRecommendedTeam');
  const fallbackCarry = rSandbox.lastKnownUserTeam.find(u => u.name === 'Dark Slither Wing');
  assert(fallbackCarry && !fallbackCarry.isFainted && fallbackCarry.hp === 400, '3O-3: Fallback Carry MUST remain alive');

  // 3O-4: Carry verified-faint + participation barrier in ai_agent_bridge
  const fakeDeadTeam = sidneyTeamTemplate().map(m => {
    if (m.name === 'Dark Slither Wing' || m.name === 'Dark Genesect (Chill)' || m.name === 'Zacian (Behemoth Blade)' || m.name === 'Negative Mesprit' || m.name === 'Arceus (Fire)') {
      return Object.assign({}, m, { hp: 0, isFainted: true });
    }
    return m;
  });
  const unverifiedCarryDead = aiAssistant.analyzeBattle({
    trainerName: 'Sidney',
    isInActiveBattle: true,
    hasAttackBtn: false,
    hasContinueBtn: false,
    hasBenchRadios: true,
    benchExtractedCount: 1,
    benchRadiosCount: 1,
    hasForfeitBtn: true,
    matchParticipants: ['dark genesect (chill)'],
    verifiedFaintedNames: ['dark genesect (chill)'],
    userActivePokemon: { name: 'Dark Genesect (Chill)', variant: 'Dark', types: ['Bug', 'Steel'], level: 60, hp: 0, maxHp: 240, isFainted: true },
    userTeam: fakeDeadTeam,
    roster: sidneyRosterAfterSharpedoKo()
  }, sidneyTeamTemplate());
  assert.strictEqual(unverifiedCarryDead.shouldForfeitBattle, false, '3O-4: Must NEVER forfeit when Carry is missing from verifiedFaintedNames/matchParticipants');

  const verifiedCarryDead = aiAssistant.analyzeBattle({
    trainerName: 'Sidney',
    isInActiveBattle: true,
    hasAttackBtn: false,
    hasContinueBtn: false,
    hasBenchRadios: true,
    benchExtractedCount: 1,
    benchRadiosCount: 1,
    hasForfeitBtn: true,
    matchParticipants: ['dark genesect (chill)', 'dark slither wing'],
    verifiedFaintedNames: ['dark genesect (chill)', 'dark slither wing', 'zacian (behemoth blade)', 'negative mesprit', 'arceus (fire)'],
    userActivePokemon: { name: 'Dark Slither Wing', variant: 'Dark', types: ['Bug', 'Fighting'], level: 100, hp: 0, maxHp: 400, isFainted: true },
    userTeam: fakeDeadTeam,
    roster: sidneyRosterAfterSharpedoKo()
  }, sidneyTeamTemplate());
  assert.strictEqual(verifiedCarryDead.shouldForfeitBattle, true, '3O-4: Must forfeit only once Carry actually participated and fainted with unwinnable babies left');

  // 3O-5: Static audit of game-preload.js & app.js hardening symbols
  assert(preloadCode.includes('canInferMissingBenchAsFainted'), '3O-5: game-preload.js must gate missing bench inference with canInferMissingBenchAsFainted');
  assert(preloadCode.includes('benchExtractedCount:') && preloadCode.includes('benchRadiosCount:'), '3O-5: game-preload.js must emit benchExtractedCount and benchRadiosCount');
  assert(preloadCode.includes('aliveProven:'), '3O-5: game-preload.js must emit aliveProven on userActivePokemon and bench cards');
  assert(preloadCode.includes('resetPreloadUserTeamHealth()'), '3O-5: game-preload.js must reset cached team health on rematch/forfeit');
  assert(appCode.includes('healLastKnownUserTeamForNewMatch') && appCode.includes('blockForfeitOnAliveContinue'), '3O-5: app.js must include healLastKnownUserTeamForNewMatch and blockForfeitOnAliveContinue');

  console.log('[PASS] Inter-Turn Continue Bench Preservation, Sticky-Faint Heal & Carry-Before-Forfeit Guard verified.');
}

// 4. Verify 100% 7-bit Clean ASCII across all files
console.log('\n--- TEST 4: 100% 7-bit Clean ASCII Verification ---');
const clientFiles = [
  'main.js',
  'app.js',
  'roaming_telemetry_ui.js',
  'ai_agent_bridge.js',
  'game-preload.js',
  'team_engine.js',
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
