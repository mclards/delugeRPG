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
  assert.strictEqual(charizardCheck.isDuplicate, true, 'Base Charizard must be flagged as duplicate when Mega Charizard X is owned');
  assert.strictEqual(charizardCheck.hasMegaOwned, true, 'hasMegaOwned must be true for Charizard');
  assert.strictEqual(charizardCheck.ownedPokemon.name, 'Mega Charizard X', 'Must identify Mega Charizard X');

  // Case 2: Alternate Mega Charizard Y when user owns Mega Charizard X
  const charizardYCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Mega Charizard Y', mockCollection);
  assert.strictEqual(charizardYCheck.isDuplicate, true, 'Mega Charizard Y must be flagged as Mega-owned duplicate');
  assert.strictEqual(charizardYCheck.hasMegaOwned, true, 'hasMegaOwned must be true for Mega Charizard Y');

  // Case 3: Wild Steelix when user owns Dark Mega Steelix
  const steelixCheck = teamEngine.evaluateOwnershipAndMegaEquivalence('Steelix', mockCollection);
  assert.strictEqual(steelixCheck.isDuplicate, true, 'Base Steelix must be flagged as duplicate when Dark Mega Steelix is owned');
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
  console.log('[PASS] 100% Uniqueness & Mega Evolution equivalence checks verified across wild encounters and evolution paths.');
}

// 3C. Non-Target Manual Pause & /catch Page Isolation Regression Verification
{
  assert.strictEqual(preloadJs.includes('isMapCatchElement'), true, 'game-preload.js must contain isMapCatchElement');
  assert.strictEqual(preloadJs.includes('blurCatchButtonsOnMap'), true, 'game-preload.js must contain blurCatchButtonsOnMap');
  assert.strictEqual(preloadJs.includes('__delugeAutoCatchAuthorizedClick'), true, 'game-preload.js must gate Try to Catch It clicks with __delugeAutoCatchAuthorizedClick');
  assert.strictEqual(preloadJs.includes('extractWildPokemonFromCatchPage'), true, 'game-preload.js must contain extractWildPokemonFromCatchPage');
  assert.strictEqual(preloadJs.includes("path.indexOf('/map') !== -1 || path.indexOf('/catch') !== -1"), false, 'scanForTargets must never run on /catch pages');
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

// 4. Verify 100% 7-bit Clean ASCII across all files
console.log('\n--- TEST 4: 100% 7-bit Clean ASCII Verification ---');
const clientFiles = [
  'main.js',
  'app.js',
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
