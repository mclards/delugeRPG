// game-preload.js
// Isolated observer for DelugeRPG webview.
// Mirrors 100% of the hunting and catching mechanics from pokefinder.user.js.
// Self-contained: ZERO external file or node module dependencies to ensure 100% sandboxed execution.

// CRITICAL: Preload must ONLY run in the top-level DelugeRPG window!
if (window !== window.top) {
    return;
}
if (window.location.hostname && !window.location.hostname.includes('delugerpg.com')) {
    return;
}

const { ipcRenderer } = require('electron');

// --- 1. ENVIRONMENT HYGIENE ---
try {
    delete window.process;
    delete window.Buffer;
    delete window.require;
    delete window.setImmediate;
    delete window.clearImmediate;
    delete window.global;
} catch (_) {}

// --- 2. SELF-CONTAINED TARGET DATABASE ---
const TARGETS = {
    legendaries: [
        // --- Gen 1 (legendaries.png, Mythical.png) ---
        "Articuno", "Zapdos", "Moltres", "Mewtwo", "Mega Mewtwo X", "Mega Mewtwo Y", "Mew",

        // --- Gen 2 (legendaries.png, Mythical.png) ---
        "Raikou", "Entei", "Suicune", "Lugia", "Ho-Oh", "Ho-oh", "Celebi",

        // --- Gen 3 (legendaries.png, Mythical.png) ---
        "Regirock", "Regice", "Registeel", "Latias", "Mega Latias", "Latios", "Mega Latios",
        "Kyogre", "Primal Kyogre", "Groudon", "Primal Groudon", "Rayquaza", "Mega Rayquaza",
        "Jirachi", "Deoxys",

        // --- Gen 4 (legendaries-2.png, Mythical.png) ---
        "Uxie", "Mesprit", "Azelf", "Dialga", "Palkia", "Heatran", "Regigigas", "Giratina", "Cresselia",
        "Phione", "Manaphy", "Darkrai", "Shaymin", "Arceus",

        // --- Gen 5 (legendaries-2.png, Mythical.png) ---
        "Victini", "Cobalion", "Terrakion", "Virizion", "Tornadus", "Thundurus", "Reshiram", "Zekrom",
        "Landorus", "Kyurem", "Keldeo", "Meloetta", "Genesect",

        // --- Gen 6 (legendaries-2.png, Mythical.png) ---
        "Xerneas", "Yveltal", "Zygarde", "Diancie", "Mega Diancie", "Hoopa", "Volcanion",

        // --- Gen 7 Legendaries & Mythicals (legendaries-2.png, legendaries-3.png, Mythical.png) ---
        "Type: Null", "Type Null", "Silvally", "Tapu Koko", "Tapu Lele", "Tapu Bulu", "Tapu Fini",
        "Cosmog", "Cosmoem", "Solgaleo", "Lunala", "Necrozma", "Magearna", "Marshadow", "Zeraora",
        "Meltan", "Melmetal", "G-Max Melmetal",

        // --- Gen 7 Ultra Beasts (UltraBeasts.png) ---
        "Nihilego", "Buzzwole", "Pheromosa", "Xurkitree", "Celesteela", "Kartana", "Guzzlord",
        "Poipole", "Naganadel", "Stakataka", "Blacephalon",

        // --- Gen 8 (legendaries-3.png, Mythical.png) ---
        "Zacian", "Zamazenta", "Eternatus", "Kubfu", "Urshifu", "G-Max Urshifu", "Zarude",
        "Regieleki", "Regidrago", "Glastrier", "Spectrier", "Calyrex", "Enamorus",

        // --- Gen 9 (legendaries-3.png, legendaries-4.png, Mythical.png) ---
        "Wo-Chien", "Chien-Pao", "Ting-Lu", "Chi-Yu", "Koraidon", "Miraidon",
        "Okidogi", "Munkidori", "Fezandipiti", "Ogerpon", "Terapagos", "Pecharunt",

        // --- Gen 9 Paradox Pokemon (Paradox.png) ---
        "Great Tusk", "Scream Tail", "Brute Bonnet", "Flutter Mane", "Slither Wing", "Sandy Shocks",
        "Iron Treads", "Iron Bundle", "Iron Hands", "Iron Jugulis", "Iron Moth", "Iron Thorns",
        "Roaring Moon", "Iron Valiant", "Walking Wake", "Iron Leaves",
        "Gouging Fire", "Raging Bolt", "Iron Boulder", "Iron Crown"
    ],
    megas: [
        // Gen 1 Megas
        "Bulbasaur", "Ivysaur", "Venusaur",
        "Charmander", "Charmeleon", "Charizard",
        "Squirtle", "Wartortle", "Blastoise",
        "Weedle", "Kakuna", "Beedrill",
        "Pidgey", "Pidgeotto", "Pidgeot",
        "Abra", "Kadabra", "Alakazam",
        "Slowpoke", "Slowbro",
        "Gastly", "Haunter", "Gengar",
        "Kangaskhan",
        "Pinsir",
        "Magikarp", "Gyarados",
        "Aerodactyl",
        "Mewtwo",
        // Gen 2 Megas
        "Mareep", "Flaaffy", "Ampharos",
        "Onix", "Steelix",
        "Scyther", "Scizor",
        "Heracross",
        "Houndour", "Houndoom",
        "Larvitar", "Pupitar", "Tyranitar",
        // Gen 3 Megas
        "Treecko", "Grovyle", "Sceptile",
        "Torchic", "Combusken", "Blaziken",
        "Mudkip", "Marshtomp", "Swampert",
        "Ralts", "Kirlia", "Gardevoir", "Gallade",
        "Sableye",
        "Mawile",
        "Aron", "Lairon", "Aggron",
        "Meditite", "Medicham",
        "Electrike", "Manectric",
        "Carvanha", "Sharpedo",
        "Numel", "Camerupt",
        "Swablu", "Altaria",
        "Shuppet", "Banette",
        "Absol",
        "Snorunt", "Glalie",
        "Bagon", "Shelgon", "Salamence",
        "Beldum", "Metang", "Metagross",
        "Latias", "Latios", "Rayquaza",
        // Gen 4 Megas
        "Buneary", "Lopunny",
        "Gible", "Gabite", "Garchomp",
        "Riolu", "Lucario",
        "Snover", "Abomasnow",
        // Gen 1-4 Mega Branches
        "Slowking",
        "Kleavor",
        "Froslass",
        // Gen 5 & 6 Megas & Future Legends Z-A Megas
        "Audino",
        "Diancie",
        "Chespin", "Quilladin", "Chesnaught",
        "Fennekin", "Braixen", "Delphox",
        "Froakie", "Frogadier", "Greninja"
    ],
    specialForms: [
        "mega", "gigantamax", "g-max", "gmax", "primal", "ultra"
    ],
    specialVariants: [
        "shiny", "metallic", "ghostly", "dark", "shadow", "mirage", "chrome", "negative", "retro"
    ]
};

const LEGENDARY_LOWER = TARGETS.legendaries.map(l => l.toLowerCase());
const MEGAS_LOWER = TARGETS.megas.map(m => m.toLowerCase());
const FORMS = TARGETS.specialForms;
const VARIANTS = TARGETS.specialVariants;
const ULTRA_BEASTS = [
    "nihilego", "buzzwole", "pheromosa", "xurkitree", "celesteela", "kartana", "guzzlord",
    "poipole", "naganadel", "stakataka", "blacephalon"
];
const PARADOX = [
    "great tusk", "scream tail", "brute bonnet", "flutter mane", "slither wing", "sandy shocks",
    "iron treads", "iron bundle", "iron hands", "iron jugulis", "iron moth", "iron thorns",
    "roaring moon", "iron valiant", "walking wake", "iron leaves",
    "gouging fire", "raging bolt", "iron boulder", "iron crown"
];

// Runtime Configuration synced with host
let config = {
    findLegendaries: true,
    legendaryClassic: true,
    legendaryUltraBeasts: true,
    legendaryParadox: true,
    findMegasAndGigantamax: true,
    findAnySpecialVariant: true,
    selectedVariants: ['normal', ...VARIANTS],
    customTargetList: '',
    blacklistList: '',
    enableLevelFilter: false,
    levelFilterMode: 'min',
    levelFilterValue: 50,
    levelFilterScope: 'targets',
    hideAdsCosmetically: true
};

// --- OPTION B: COSMETIC AD HIDING ---
// Satisfies DelugeRPG script verification over network while visually collapsing banners
const COSMETIC_AD_STYLE_ID = 'stealth-cosmetic-ad-hide';
const COSMETIC_AD_CSS = [
    '/* DelugeRPG Option B: Cosmetic Ad Hiding (Preserves 1-click Skip button while collapsing banners) */',
    'div[id^="div-gpt-ad"],',
    'div[id*="-gpt-ad-"],',
    'div[id^="google_ads_iframe"],',
    'div[id*="google_ads_iframe"],',
    'ins.adsbygoogle,',
    'iframe[id^="google_ads_iframe"],',
    'iframe[id*="google_ads_iframe"],',
    'iframe[src*="doubleclick.net"],',
    'iframe[src*="googlesyndication.com"],',
    'iframe[src*="googleads"],',
    '.advertisement,',
    '.ad-slot,',
    '.ad-container,',
    '.ad-wrapper,',
    '.ad-banner,',
    '.ad-leaderboard,',
    '.ad_unit,',
    '.ad-unit,',
    'div[id="top-ad"],',
    'div[id="bottom-ad"],',
    'div[id="side-ad"],',
    'div[id="header-ad"],',
    'div[id="footer-ad"],',
    'div[class*="ad-leaderboard"],',
    'div[class*="ad-banner"],',
    'div[class*="ad-container"],',
    'div[class*="ad-wrapper"],',
    'div[class*="ad_unit"],',
    'div[class*="ad-unit"] {',
    '    display: none !important;',
    '    visibility: hidden !important;',
    '    height: 0 !important;',
    '    min-height: 0 !important;',
    '    max-height: 0 !important;',
    '    margin: 0 !important;',
    '    padding: 0 !important;',
    '    opacity: 0 !important;',
    '    pointer-events: none !important;',
    '    overflow: hidden !important;',
    '}'
].join('\n');

function applyCosmeticAdHiding() {
    try {
        const shouldHide = config.hideAdsCosmetically !== false;
        let styleEl = document.getElementById(COSMETIC_AD_STYLE_ID);
        if (shouldHide) {
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = COSMETIC_AD_STYLE_ID;
                styleEl.type = 'text/css';
                styleEl.textContent = COSMETIC_AD_CSS;
                const parent = document.head || document.documentElement || document.body;
                if (parent) {
                    parent.appendChild(styleEl);
                }
            }
        } else {
            if (styleEl && styleEl.parentNode) {
                styleEl.parentNode.removeChild(styleEl);
            }
        }
    } catch (_) {}
}

// Initial application of Option B
applyCosmeticAdHiding();

let configSynced = false;
let lastSyncedConfigStr = '';
ipcRenderer.on('update-config', (event, newSettings) => {
    if (newSettings) {
        config = Object.assign({}, config, newSettings);
        configSynced = true;
        applyCosmeticAdHiding();
        const currentStr = JSON.stringify(config);
        if (currentStr !== lastSyncedConfigStr) {
            lastSyncedConfigStr = currentStr;
            console.log('[PokePreload] Configuration synchronized successfully');
        }
    }
});

// Proactively pull configuration from host
ipcRenderer.sendToHost('request-config');
const configSyncInterval = setInterval(() => {
    if (!configSynced) {
        ipcRenderer.sendToHost('request-config');
    } else {
        clearInterval(configSyncInterval);
    }
}, 500);

let lastFoundTarget = '';
let lastEvaluatedEncounterSignature = '';
let unlockNoticeSent = false;
let isHuntingActive = false;
let activeStep = null;
let collisionCheckTimer = null;

ipcRenderer.on('hunting-state-changed', (event, state) => {
    isHuntingActive = !!(state && state.isHunting);
    if (!isHuntingActive) {
        lastFoundTarget = '';
    }
});


// --- MODULE ROOT SCOPE HELPERS ---
function findCatchActionElement() {
    try {
        // 1. Direct submit inputs, buttons, or links with catch id, name, or action
        const directBtn = document.querySelector(
            'input[type="submit"]#catch, input#catch, button#catch, a#catch, ' +
            'input[name="catch"], button[name="catch"], ' +
            'input[type="submit"][value*="Catch" i], button[value*="Catch" i], ' +
            'form[action*="catch"] input[type="submit"], form[action*="catch"] button, ' +
            'form[action*="catch"] a, a[href*="/catch"]'
        );
        if (directBtn) {
            try {
                const st = window.getComputedStyle(directBtn);
                if (st.display !== 'none' && st.visibility !== 'hidden') return directBtn;
            } catch (_) { return directBtn; }
        }

        // 2. Scan all candidate interactive elements
        const candidates = document.querySelectorAll('a, button, input[type="button"], input[type="submit"], [role="button"], .btn');
        for (let i = 0; i < candidates.length; i++) {
            const el = candidates[i];
            try {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
            } catch (_) {}

            const text = (el.innerText || el.textContent || '').trim().toLowerCase();
            const val = (el.value || '').trim().toLowerCase();
            const href = (el.getAttribute('href') || '').toLowerCase();
            const id = (el.id || '').toLowerCase();
            const name = (el.name || '').toLowerCase();

            if (text.indexOf('try to catch') !== -1 || val.indexOf('try to catch') !== -1 ||
                text.indexOf('catch it') !== -1 || val.indexOf('catch it') !== -1 ||
                text === 'catch' || val === 'catch' ||
                name === 'catch' || id === 'catch' ||
                text.indexOf('start battle') !== -1 || val.indexOf('start battle') !== -1 ||
                text.indexOf('throw pokeball') !== -1 || val.indexOf('throw pokeball') !== -1) {
                return el;
            }

            if (href && (href.indexOf('/catch') !== -1 || href.indexOf('catch.php') !== -1 || href.indexOf('catch?') !== -1)) {
                return el;
            }

            if (id === 'catch' || id === 'catch-btn' || id === 'btn-catch') {
                return el;
            }
        }
    } catch (_) {}
    return null;
}

function getEncounterContainer() {
    try {
        // A. If catch button exists, walk up to find the enclosing encounter card
        const catchBtn = findCatchActionElement();
        if (catchBtn) {
            let curr = catchBtn.parentElement;
            let candidateBox = null;
            while (curr && curr !== document.body) {
                const cText = (curr.innerText || curr.textContent || '').toLowerCase();
                const hasAppeared = cText.indexOf('appeared') !== -1 || cText.indexOf('wild') !== -1;
                const hasSprite = curr.querySelector && curr.querySelector('img[src*="/pokemon/"], img[src*="/sprites/"], img[src*="/dex/"], img[src*="/regular/"], img[src*="/shiny/"], img[src*="/retro/"], img[src*="/chrome/"], img[src*="/metallic/"], img[src*="/shadow/"], img[src*="/ghostly/"], img[src*="/dark/"], img[src*="/mirage/"], img[src*="/negative/"], img[src*="delugerpg"]');
                if (hasAppeared && hasSprite) {
                    return curr;
                }
                if (hasSprite && !candidateBox) {
                    candidateBox = curr;
                }
                const cId = (curr.id || '').toLowerCase();
                const cCls = (curr.className || '').toLowerCase();
                if (cId.indexOf('showpoke') !== -1 || cCls.indexOf('showpoke') !== -1 ||
                    cId.indexOf('dexy') !== -1 || cCls.indexOf('dexy') !== -1 ||
                    cId.indexOf('encounter') !== -1 || cCls.indexOf('encounter') !== -1) {
                    return curr;
                }
                curr = curr.parentElement;
            }
            if (candidateBox) return candidateBox;
        }

        // B. Check direct candidate container IDs and classes
        const candidateContainers = [
            document.getElementById('showpoke'),
            document.querySelector('.showpoke'),
            document.getElementById('showpoke-name'),
            document.querySelector('.catch-form'),
            document.getElementById('show-pokemon'),
            document.getElementById('dexy'),
            document.querySelector('.dexy'),
            document.getElementById('catch'),
            document.querySelector('form[action*="catch"]'),
            document.querySelector('form[action*="battle"]')
        ];

        for (let c = 0; c < candidateContainers.length; c++) {
            const box = candidateContainers[c];
            if (!box) continue;
            try {
                const style = window.getComputedStyle(box);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
            } catch (_) {}

            const rawText = (box.innerText || box.textContent || '').trim().toLowerCase();
            const normText = rawText.replace(/[\u2018\u2019]/g, "'");

            if (normText.indexOf("couldn't find") !== -1 ||
                normText.indexOf("could not find") !== -1 ||
                normText.indexOf('try moving to another spot') !== -1 ||
                normText.indexOf('searching...') !== -1) {
                continue;
            }

            const pokeImg = box.querySelector('img[src*="/pokemon/"], img[src*="/sprites/"], img[src*="/dex/"], img[src*="/regular/"], img[src*="/shiny/"], img[src*="/retro/"], img[src*="/chrome/"], img[src*="/metallic/"], img[src*="/shadow/"], img[src*="/ghostly/"], img[src*="/dark/"], img[src*="/mirage/"], img[src*="/negative/"], img[src*="delugerpg"]');
            if (pokeImg) {
                return box;
            }

            if (normText.indexOf('appeared') !== -1 ||
                normText.indexOf('wild') !== -1 ||
                normText.indexOf('hp:') !== -1) {
                return box;
            }
        }

        // C. Generic search for any element containing "appeared!"
        const allCandidates = document.querySelectorAll('div, section, article, p, h2, h3, h4, h5, span');
        for (let i = 0; i < allCandidates.length; i++) {
            const el = allCandidates[i];
            const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
            if ((txt.indexOf('appeared!') !== -1 || txt.indexOf('appeared') !== -1) &&
                txt.indexOf("couldn't find") === -1 &&
                txt.indexOf("could not find") === -1 &&
                txt.indexOf("searching...") === -1 &&
                txt.indexOf("try moving") === -1) {
                return el.closest('div, section, form') || el;
            }
        }
    } catch (_) {}
    return null;
}

function isEncounterOrCatchUIPresent() {
    try {
        if (findCatchActionElement() !== null) {
            return true;
        }
        if (getEncounterContainer() !== null) {
            return true;
        }
    } catch (_) {}
    return false;
}

function extractWildLevel(container) {
    try {
        const text = container ? (container.innerText || container.textContent || '') : (document.body ? document.body.textContent || '' : '');
        const m = text.match(/(?:level|lv|lvl)[\s.:]*(\d+)/i);
        if (m && m[1]) {
            const lvl = parseInt(m[1], 10);
            if (!isNaN(lvl)) return lvl;
        }
    } catch (_) {}
    return null;
}

function checkEncounterIsDuplicate(container, shouldLog = false) {
    try {
        if (!container) {
            container = getEncounterContainer();
        }

        // 1. Text checks for explicit caught/uncaught status
        const checkText = container ? (container.innerText || container.textContent || '') : '';
        const rawText = checkText.toLowerCase();

        // 1A. Explicit UNCAUGHT text
        if (rawText.indexOf("don't have this pokemon") !== -1 ||
            rawText.indexOf("dont have this pokemon") !== -1 ||
            rawText.indexOf("do not have this pokemon") !== -1 ||
            rawText.indexOf("not in your box") !== -1 ||
            rawText.indexOf('not caught') !== -1 ||
            rawText.indexOf('uncaught') !== -1 ||
            rawText.indexOf('not in pokedex') !== -1 ||
            rawText.indexOf('new pokemon') !== -1) {
            if (shouldLog) console.log('[PokePreload] Duplicate check: matched explicit uncaught text in container');
            return false;
        }

        // 1B. Explicit CAUGHT / DUPLICATE text
        if (rawText.indexOf('you have this pokemon in your box') !== -1 ||
            rawText.indexOf('already in your box') !== -1 ||
            rawText.indexOf('already caught') !== -1 ||
            rawText.indexOf('already in pokedex') !== -1 ||
            rawText.indexOf('already owned') !== -1 ||
            rawText.indexOf('pokedex: caught') !== -1 ||
            rawText.indexOf('dex: caught') !== -1) {
            if (shouldLog) console.log('[PokePreload] Duplicate check: matched explicit duplicate text in container');
            return true;
        }

        // 2. Scan candidate encounter boxes for PokeBall / Pokedex indicator element
        const candidateBoxes = [];
        if (container) candidateBoxes.push(container);
        const domBoxes = [
            document.getElementById('showpoke'),
            document.querySelector('.showpoke'),
            document.getElementById('showpoke-name'),
            document.querySelector('.showpoke-name'),
            document.querySelector('.catch-form'),
            document.getElementById('show-pokemon'),
            document.querySelector('.show-pokemon'),
            document.getElementById('dexy'),
            document.querySelector('.dexy'),
            document.querySelector('[class*="encounter" i]'),
            document.querySelector('[id*="encounter" i]'),
            document.querySelector('form[action*="catch"]'),
            document.querySelector('form[action*="battle"]')
        ];
        for (let b = 0; b < domBoxes.length; b++) {
            if (domBoxes[b] && candidateBoxes.indexOf(domBoxes[b]) === -1) {
                candidateBoxes.push(domBoxes[b]);
            }
        }

        // 3. Scan candidate containers for any explicit tooltip/attribute text on links or elements
        for (let r = 0; r < candidateBoxes.length; r++) {
            const root = candidateBoxes[r];
            if (!root) continue;
            const elementsWithTitle = root.querySelectorAll ? root.querySelectorAll('[title], [alt], [data-original-title], [aria-label]') : [];
            for (let t = 0; t < elementsWithTitle.length; t++) {
                const el = elementsWithTitle[t];
                if (el.closest && el.closest('#map, #userpokeballs, .userpokeballs, #myteam, .user-avatar, .bag, #inventory')) {
                    continue;
                }
                const titleStr = [
                    el.getAttribute('title') || '',
                    el.getAttribute('alt') || '',
                    el.getAttribute('data-original-title') || '',
                    el.getAttribute('aria-label') || ''
                ].join(' ').toLowerCase();

                if (titleStr.indexOf("don't have") !== -1 || titleStr.indexOf("dont have") !== -1 ||
                    titleStr.indexOf("do not have") !== -1 || titleStr.indexOf("not in your box") !== -1 ||
                    titleStr.indexOf("not in pokedex") !== -1 || titleStr.indexOf("not caught") !== -1 ||
                    titleStr.indexOf("uncaught") !== -1) {
                    if (shouldLog) console.log('[PokePreload] Duplicate check: matched explicit uncaught attribute text: "' + titleStr + '"');
                    return false;
                }

                if (titleStr.indexOf("you have this pokemon in your box") !== -1 ||
                    titleStr.indexOf("already in your box") !== -1 ||
                    titleStr.indexOf("already caught") !== -1 ||
                    titleStr.indexOf("already owned") !== -1 ||
                    titleStr.indexOf("you have this pokemon") !== -1 ||
                    titleStr.indexOf("in your box") !== -1) {
                    if (shouldLog) console.log('[PokePreload] Duplicate check: matched explicit duplicate attribute text: "' + titleStr + '"');
                    return true;
                }
            }
        }

        let indicatorElement = null;

        for (let r = 0; r < candidateBoxes.length; r++) {
            const root = candidateBoxes[r];
            const imgs = root.querySelectorAll ? root.querySelectorAll('img') : [];

            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];

                // Exclude elements inside map, inventory pokeballs, my team, or page header/footer
                // NOTE: NEVER use bare 'header' selector as encounter cards may use <header> tags!
                if (img.closest && img.closest('#map, #userpokeballs, .userpokeballs, #myteam, .user-avatar, .site-header, .page-header, body > header, nav, footer, .bag, #inventory')) {
                    continue;
                }

                const src = (img.src || img.getAttribute('src') || '').toLowerCase();
                const alt = (img.alt || img.getAttribute('alt') || '').toLowerCase();
                const title = (img.title || img.getAttribute('title') || '').toLowerCase();
                const className = (img.className || '').toLowerCase();

                // Exclude the Pokemon encounter sprite itself
                const isWildSprite = src.indexOf('/pokemon/') !== -1 || src.indexOf('/sprites/') !== -1 ||
                                     src.indexOf('/regular/') !== -1 || src.indexOf('/shiny/') !== -1 ||
                                     src.indexOf('/retro/') !== -1 || src.indexOf('/chrome/') !== -1 ||
                                     src.indexOf('/metallic/') !== -1 || src.indexOf('/shadow/') !== -1 ||
                                     src.indexOf('/ghostly/') !== -1 || src.indexOf('/dark/') !== -1 ||
                                     src.indexOf('/mirage/') !== -1 || src.indexOf('/negative/') !== -1;
                if (isWildSprite) {
                    if ((img.naturalWidth && img.naturalWidth > 40) || (img.width && img.width > 40)) {
                        continue;
                    }
                    if (className.indexOf('sprite') !== -1 || className.indexOf('poke') !== -1) {
                        continue;
                    }
                }

                // Exclude type badges (e.g. psychic.png, /types/psychic.png, alt="Psychic")
                const isTypeBadge = src.indexOf('/types/') !== -1 || src.indexOf('/type/') !== -1 ||
                                    src.indexOf('type_') !== -1 || src.indexOf('type-') !== -1 ||
                                    alt.indexOf('type') !== -1 || title.indexOf('type') !== -1 ||
                                    className.indexOf('type') !== -1 ||
                                    src.match(/\/(?:normal|fire|water|grass|electric|ice|fighting|poison|ground|flying|psychic|bug|rock|ghost|dragon|steel|dark|fairy)\.(?:png|gif|jpe?g)/i);
                if (isTypeBadge) {
                    continue;
                }

                // Exclude favorite / star icons
                if (src.indexOf('star') !== -1 || alt.indexOf('star') !== -1 || title.indexOf('star') !== -1 ||
                    src.indexOf('fav') !== -1 || className.indexOf('star') !== -1) {
                    continue;
                }

                // Exclude navigation arrows and icons
                if (src.indexOf('arrow') !== -1 || alt.indexOf('arrow') !== -1 || title.indexOf('arrow') !== -1) {
                    continue;
                }

                // Exclude weather / form symbols in top right
                if (src.indexOf('weather') !== -1 || alt.indexOf('weather') !== -1 || title.indexOf('weather') !== -1) {
                    continue;
                }

                // Check for ball / dex indicator
                const isBallOrDex = src.indexOf('pokeball') !== -1 || src.indexOf('dball') !== -1 ||
                                    src.indexOf('poke-ball') !== -1 || src.indexOf('poke_ball') !== -1 ||
                                    src.indexOf('dexball') !== -1 || src.indexOf('ball') !== -1 ||
                                    src.indexOf('caught') !== -1 || src.indexOf('pokedex') !== -1 ||
                                    src.indexOf('dex') !== -1 ||
                                    alt.indexOf('caught') !== -1 || title.indexOf('caught') !== -1 ||
                                    alt.indexOf('pokedex') !== -1 || title.indexOf('pokedex') !== -1 ||
                                    alt.indexOf('dex') !== -1 || title.indexOf('dex') !== -1 ||
                                    alt.indexOf('ball') !== -1 || title.indexOf('ball') !== -1 ||
                                    alt.indexOf('box') !== -1 || title.indexOf('box') !== -1 ||
                                    className.indexOf('caught') !== -1 || className.indexOf('dball') !== -1 ||
                                    className.indexOf('pokedex') !== -1 || className.indexOf('dex') !== -1 ||
                                    className.indexOf('ball') !== -1;

                // Small icon located between sprite and name
                const isSmallCardIcon = container && container.contains(img) &&
                                        ((img.naturalWidth && img.naturalWidth <= 32) || (img.width && img.width <= 32)) &&
                                        !isWildSprite && !isTypeBadge;

                if (isBallOrDex || isSmallCardIcon) {
                    indicatorElement = img;
                    break;
                }
            }

            if (indicatorElement) break;
        }

        // 4. If no image found, check for SVG or styled indicator elements
        if (!indicatorElement && container) {
            const svgOrDiv = container.querySelector('svg, .caught, .dball, .pokedex-ball, .dex-indicator, [data-caught]');
            if (svgOrDiv) {
                indicatorElement = svgOrDiv;
            }
        }

        if (!indicatorElement) {
            // No PokeBall indicator found anywhere in encounter card -> NOT DUPLICATE (Safe)
            if (shouldLog) console.log('[PokePreload] No indicator element found in encounter card - defaulting to NOT duplicate.');
            return false;
        }

        // 5. Analyze indicator element for GREYED OUT (NOT CAUGHT) vs COLORED (ALREADY CAUGHT)
        const indSrc = (indicatorElement.src || indicatorElement.getAttribute('src') || '').toLowerCase();
        const indClass = (indicatorElement.className || '').toLowerCase();

        // Check attributes on indicator element, its parent element, and enclosing link
        const parentEl = indicatorElement.parentElement;
        const linkEl = indicatorElement.closest ? indicatorElement.closest('a, span, div') : null;
        const allIndicatorTexts = [
            indicatorElement.title || '',
            indicatorElement.getAttribute('title') || '',
            indicatorElement.alt || '',
            indicatorElement.getAttribute('alt') || '',
            indicatorElement.getAttribute('data-original-title') || '',
            indicatorElement.getAttribute('aria-label') || '',
            parentEl ? (parentEl.title || parentEl.getAttribute('title') || '') : '',
            parentEl ? (parentEl.getAttribute('data-original-title') || '') : '',
            linkEl ? (linkEl.title || linkEl.getAttribute('title') || '') : '',
            linkEl ? (linkEl.getAttribute('data-original-title') || '') : ''
        ].join(' ').toLowerCase();

        // A. Explicit UNCAUGHT text in attributes (HIGHEST PRIORITY)
        // DelugeRPG exact text: "you don't have this pokemon in your box."
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
            if (shouldLog) console.log('[PokePreload] Indicator UNCAUGHT confirmed via title/alt: "' + allIndicatorTexts + '"');
            return false;
        }

        // B. Explicit UNCAUGHT filename patterns (DelugeRPG exact uncaught asset: pokeball-n.png)
        // NOTE: Avoid bare 'off' to prevent false matches with 'official', 'offset', etc.
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
            if (shouldLog) console.log('[PokePreload] Indicator UNCAUGHT confirmed via filename pattern: ' + indSrc);
            return false;
        }

        // C. Explicit UNCAUGHT CSS class names
        const isUncaughtByClass =
            indClass.indexOf('grey') !== -1 || indClass.indexOf('gray') !== -1 ||
            indClass.indexOf('uncaught') !== -1 || indClass.indexOf('not-caught') !== -1 ||
            indClass.indexOf('dont-have') !== -1 || indClass.indexOf('unowned') !== -1 ||
            indClass.indexOf('bw') !== -1 || indClass.indexOf('disabled') !== -1 ||
            indClass.indexOf('desaturated') !== -1 ||
            (indClass.indexOf('off') !== -1 && indClass.indexOf('official') === -1);

        if (isUncaughtByClass) {
            if (shouldLog) console.log('[PokePreload] Indicator UNCAUGHT confirmed via CSS class: ' + indClass);
            return false;
        }

        // D. Computed / Inline CSS Filter & Opacity
        let filterVal = '';
        let opacityVal = 1.0;
        try {
            if (window.getComputedStyle) {
                const computed = window.getComputedStyle(indicatorElement);
                if (computed) {
                    filterVal = (computed.filter || '').toLowerCase();
                    const op = parseFloat(computed.opacity);
                    if (!isNaN(op)) opacityVal = op;
                }
            }
        } catch (_) {}

        if (!filterVal && indicatorElement.style && indicatorElement.style.filter) {
            filterVal = indicatorElement.style.filter.toLowerCase();
        }
        if (indicatorElement.style && indicatorElement.style.opacity) {
            const op = parseFloat(indicatorElement.style.opacity);
            if (!isNaN(op)) opacityVal = op;
        }

        if (filterVal.indexOf('grayscale') !== -1 || filterVal.indexOf('saturate(0') !== -1 || opacityVal < 0.5) {
            if (shouldLog) console.log('[PokePreload] Indicator UNCAUGHT confirmed via CSS filter/opacity (filter: ' + filterVal + ', opacity: ' + opacityVal + ')');
            return false;
        }

        // E. Explicit CAUGHT / DUPLICATE text in title or alt
        // DelugeRPG exact text: "you have this pokemon in your box."
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
            if (shouldLog) console.log('[PokePreload] Indicator DUPLICATE CONFIRMED via title/alt: "' + allIndicatorTexts + '"');
            return true;
        }

        // F. Explicit CAUGHT / COLORED ball filename without -n or uncaught markers
        const isStandardCaughtBall =
            (indSrc.indexOf('pokeball') !== -1 ||
             indSrc.indexOf('dball') !== -1 ||
             indSrc.indexOf('ball') !== -1 ||
             indSrc.indexOf('caught') !== -1 ||
             indSrc.indexOf('pokedex') !== -1) &&
            !isUncaughtBySrc;

        if (isStandardCaughtBall) {
            if (shouldLog) console.log('[PokePreload] Indicator DUPLICATE CONFIRMED via colored PokeBall icon: src=' + indSrc);
            return true;
        }

        // G. Offscreen Canvas Pixel Sampling (Fallback to verify red dome color)
        try {
            if (indicatorElement.tagName === 'IMG' && indicatorElement.complete && indicatorElement.naturalWidth > 0) {
                const canvas = document.createElement('canvas');
                const cw = indicatorElement.naturalWidth || 16;
                const ch = indicatorElement.naturalHeight || 16;
                canvas.width = cw;
                canvas.height = ch;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(indicatorElement, 0, 0, cw, ch);
                const imgData = ctx.getImageData(0, 0, cw, Math.max(1, Math.floor(ch * 0.6))).data;
                let redPixels = 0;
                for (let p = 0; p < imgData.length; p += 4) {
                    const r = imgData[p];
                    const g = imgData[p + 1];
                    const b = imgData[p + 2];
                    const a = imgData[p + 3];
                    if (a > 120 && r > 140 && (r - g) > 40 && (r - b) > 40) {
                        redPixels++;
                    }
                }
                if (redPixels >= 3) {
                    if (shouldLog) console.log('[PokePreload] Indicator DUPLICATE CONFIRMED via canvas red pixel sampling (' + redPixels + ' red pixels)');
                    return true;
                }
            }
        } catch (_) {}

        // H. CRITICAL FAIL-SAFE: If status cannot be definitively confirmed as a duplicate,
        // NEVER assume duplicate! Default to false so targets are NEVER accidentally skipped!
        if (shouldLog) console.log('[PokePreload] Indicator status inconclusive (src=' + indSrc + ', text=' + allIndicatorTexts + ') - defaulting to NOT duplicate for safety.');
        return false;
    } catch (err) {
        if (shouldLog) console.warn('[PokePreload] Error in checkEncounterIsDuplicate:', err);
        return false;
    }
}

function checkHasCaptchaElement() {
    try {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/login') !== -1) return false;
        if (path.indexOf('/unlock') !== -1) return true;
        const cEl = document.querySelector(
            'iframe[src*="captcha" i], iframe[src*="turnstile" i], iframe[src*="recaptcha" i], iframe[src*="challenges.cloudflare.com" i], ' +
            '#captcha, .captcha, #recaptcha, .g-recaptcha, .cf-turnstile, [id*="captcha" i], [class*="captcha" i]'
        );
        if (cEl) {
            const st = window.getComputedStyle(cEl);
            if (st.display !== 'none' && st.visibility !== 'hidden') return true;
        }
    } catch (_) {}
    return false;
}

function checkAndSyncMapPresence() {
    try {
        const path = (window.location.pathname || '').toLowerCase();
        const hasMapElement = !!(document.getElementById('map') || document.getElementById('mapcanvas') || document.querySelector('.trainer') || document.getElementById('user'));
        const hasDpad = !!document.getElementById('dpad');
        const isMapPage = (path.indexOf('/map') !== -1) || (hasMapElement && hasDpad);
        const hasCatchUI = !!findCatchActionElement();
        const hasCaptcha = checkHasCaptchaElement();

        ipcRenderer.sendToHost('map-presence', {
            isMap: isMapPage,
            hasMapEl: hasMapElement,
            hasEncounter: hasCatchUI,
            hasCaptcha: hasCaptcha,
            pathname: path,
            url: window.location.href
        });

        if (!isMapPage && isHuntingActive) {
            isHuntingActive = false;
            ipcRenderer.sendToHost('hunting-auto-pause', { reason: 'outside-map', path: path });
        }
    } catch (_) {}
}

// --- 3. TARGET SCANNING ENGINE ---
function scanForTargets() {
    // A. Check for /unlock Honeypot / Captcha FIRST across game pages (excluding normal login pages)
    const path = (window.location.pathname || '').toLowerCase();
    const isLoginPath = path.indexOf('/login') !== -1;
    const isUnlockPath = path.indexOf('/unlock') !== -1;
    const hasCaptchaElement = checkHasCaptchaElement();

    if (!isLoginPath && (isUnlockPath || hasCaptchaElement)) {
        if (!unlockNoticeSent) {
            unlockNoticeSent = true;
            ipcRenderer.sendToHost('unlock-detected');
        }
        return;
    } else {
        unlockNoticeSent = false;
    }

    // 1. STRICT ACTIVE HUNTING GUARD: Only react to screen during an active hunting session!
    if (!isHuntingActive) {
        return;
    }

    // 2. STRICT PAGE GUARD: Only scan on map or catch page (never on team, box, or trade pages)
    const isHuntingPage = path.indexOf('/map') !== -1 || path.indexOf('/catch') !== -1;
    if (!isHuntingPage) {
        return;
    }

    // Module-scoped helpers findCatchActionElement, getEncounterContainer, and isEncounterOrCatchUIPresent are used here.

    const hasCatchUI = isEncounterOrCatchUIPresent();

    if (!hasCatchUI) {
        lastFoundTarget = '';
    }

    // Aggregate encounter container text across all candidate containers
    let encounterBoxText = '';
    const activeContainer = getEncounterContainer();
    if (activeContainer) {
        encounterBoxText += ' ' + (activeContainer.innerText || activeContainer.textContent || '');
        const cImgs = activeContainer.querySelectorAll('img');
        for (let j = 0; j < cImgs.length; j++) {
            encounterBoxText += ' ' + (cImgs[j].alt || '') + ' ' + (cImgs[j].title || '') + ' ';
            const src = cImgs[j].src || '';
            const match = src.match(/\/([a-z0-9\-]+)\.(?:png|gif|jpe?g)/i);
            if (match) encounterBoxText += ' ' + match[1];
        }
    }

    const encounterContainers = [
        document.getElementById('showpoke'),
        document.querySelector('.showpoke'),
        document.getElementById('showpoke-name'),
        document.querySelector('.catch-form'),
        document.getElementById('show-pokemon'),
        document.getElementById('dexy'),
        document.querySelector('.dexy')
    ];
    for (let ec = 0; ec < encounterContainers.length; ec++) {
        const cEl = encounterContainers[ec];
        if (cEl) {
            encounterBoxText += ' ' + (cEl.innerText || cEl.textContent || '');
        }
    }

    const catchAction = findCatchActionElement();
    if (catchAction && catchAction.parentElement) {
        encounterBoxText += ' ' + (catchAction.parentElement.innerText || catchAction.parentElement.textContent || '');
        if (catchAction.parentElement.parentElement) {
            encounterBoxText += ' ' + (catchAction.parentElement.parentElement.innerText || catchAction.parentElement.parentElement.textContent || '');
        }
    }

    // Fallback safety net: if hasCatchUI is true, ensure text contains appeared or body text
    if (document.body && (encounterBoxText.toLowerCase().indexOf('appeared') === -1 || encounterBoxText.trim().length < 5)) {
        encounterBoxText += ' ' + (document.body.innerText || '');
    }

    encounterBoxText = encounterBoxText.trim();

    const dexyEl = document.getElementById('dexy') || document.querySelector('.dexy');
    const dexyText = dexyEl ? (dexyEl.innerText || dexyEl.textContent || '').toLowerCase() : '';
    const isSearching = dexyText.indexOf('searching...') !== -1 && !hasCatchUI;

    ipcRenderer.sendToHost('map-status', { isSearching: isSearching });
    ipcRenderer.sendToHost('encounter-status', { hasEncounter: hasCatchUI });

    // CRITICAL PAUSE ACCURACY: If map is searching or NO wild encounter is on screen, NEVER evaluate target matching!
    if (isSearching || !hasCatchUI) {
        lastEvaluatedEncounterSignature = '';
        return;
    }

    // Robust Wild Level Parser
    function extractWildLevel(text) {
        if (!text) return null;
        const m = text.match(/(?:level|lvl)[^0-9\r\n]{0,8}(\d{1,3})\b/i);
        if (m) {
            const lvl = parseInt(m[1], 10);
            if (!isNaN(lvl) && lvl >= 1 && lvl <= 100) return lvl;
        }
        return null;
    }

    // C. Scan map encounter area & catch form (strictly within encounter containers, never arbitrary page/ad images)
    let pageText = encounterBoxText;

    const selectors = [
        '#showpoke',
        '#showpoke-name',
        '#dexy',
        '.dexy',
        '#catch',
        '#show-pokemon',
        '.catch-form',
        'form[action*="catch"]',
        'form[action*="battle"]',
        '[id*="catch" i]',
        '[class*="catch" i]',
        '[id*="encounter" i]',
        '[class*="encounter" i]'
    ];
    const elements = document.querySelectorAll(selectors.join(', '));
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        pageText += ' ' + (el.innerText || el.textContent || '') + ' ' + (el.value || '');
        const imgs = el.querySelectorAll('img');
        for (let j = 0; j < imgs.length; j++) {
            pageText += ' ' + (imgs[j].alt || '') + ' ' + (imgs[j].title || '') + ' ';
            const src = imgs[j].src || '';
            const match = src.match(/\/([a-z0-9\-]+)\.(?:png|gif|jpe?g)/i);
            if (match) pageText += ' ' + match[1];
        }
        const inputs = el.querySelectorAll('input, button, a');
        for (let k = 0; k < inputs.length; k++) {
            pageText += ' ' + (inputs[k].value || '') + ' ' + (inputs[k].textContent || '');
        }
    }

    // Check parent containers of any catch button
    const catchBtns = document.querySelectorAll('input[value*="Catch" i], button[value*="Catch" i], #catch, a#catch, #showpoke a, a[href*="/catch/"]');
    for (let b = 0; b < catchBtns.length; b++) {
        const parent = catchBtns[b].closest('form, .catch-form, #dexy, #showpoke');
        if (parent) {
            pageText += ' ' + (parent.innerText || parent.textContent || '');
            const pImgs = parent.querySelectorAll('img');
            for (let j = 0; j < pImgs.length; j++) {
                pageText += ' ' + (pImgs[j].alt || '') + ' ' + (pImgs[j].title || '') + ' ';
                const match = (pImgs[j].src || '').match(/\/([a-z0-9\-]+)\.(?:png|gif|jpe?g)/i);
                if (match) pageText += ' ' + match[1];
            }
        }
    }

    const textLower = pageText.trim().toLowerCase();
    if (!textLower) return;

    const findAnyVariant = config.findAnySpecialVariant !== false;
    const findMegas = config.findMegasAndGigantamax !== false;
    const findLegend = config.findLegendaries !== false;

    // Parse wild encounter level directly from encounter container, then fallback to page
    let currentLevel = extractWildLevel(encounterBoxText);
    if (currentLevel === null) {
        currentLevel = extractWildLevel(pageText);
    }
    if (currentLevel === null && document.body) {
        currentLevel = extractWildLevel(document.body.innerText || '');
    }

    let passesLevel = true;
    if (config.enableLevelFilter) {
        const mode = config.levelFilterMode || 'min';
        const targetVal = typeof config.levelFilterValue === 'number' ? config.levelFilterValue : 50;
        if (currentLevel !== null) {
            if (mode === 'min') passesLevel = currentLevel >= targetVal;
            else if (mode === 'exact') passesLevel = currentLevel === targetVal;
            else if (mode === 'max') passesLevel = currentLevel <= targetVal;
        } else {
            passesLevel = false;
        }

        // CRITICAL GATE: If level filter is enabled and encounter fails level, ignore it completely!
        if (!passesLevel) {
            return;
        }
    }

    const lvlSuffix = currentLevel !== null ? ' (Lv ' + currentLevel + ')' : '';

    // A. Check Blacklist / Ignore list (Never halt on blacklisted species - HIGHEST PRIORITY)
    if (config.blacklistList && typeof config.blacklistList === 'string') {
        const blacklist = config.blacklistList.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        for (let b = 0; b < blacklist.length; b++) {
            if (blacklist[b] && textLower.indexOf(blacklist[b]) !== -1) {
                return;
            }
        }
    }

    // B. Detect Variant on current encounter (e.g. "Shiny", "Chrome", ..., or "Normal")
    let detectedVariant = 'normal';
    for (let v = 0; v < VARIANTS.length; v++) {
        const mod = VARIANTS[v];
        const match = textLower.match(new RegExp('\\b' + mod + '[- ]+([a-z0-9\\-\':]+)', 'i'));
        if (match) {
            detectedVariant = mod.toLowerCase();
            break;
        }
    }

    // C. Check allowed variants: if selectedVariants is populated, normalize to lowercase.
    // If not specified or empty, allow normal and all special variants.
    const allowedVariants = (Array.isArray(config.selectedVariants) && config.selectedVariants.length > 0)
        ? config.selectedVariants.map(v => v.toLowerCase())
        : ['normal', ...VARIANTS.map(v => v.toLowerCase())];

    const encounterSig = textLower.slice(0, 100);
    const isNewEncounter = (encounterSig !== lastEvaluatedEncounterSignature);
    const shortName = encounterBoxText ? encounterBoxText.trim().split('\n')[0].replace(/\s+/g, ' ') : textLower.slice(0, 50);

    if (isNewEncounter) {
        lastEvaluatedEncounterSignature = encounterSig;
        console.log('[TargetEngine] Encounter: "' + shortName + '" | Variant: ' + detectedVariant.toUpperCase() + (currentLevel !== null ? (' | Lv: ' + currentLevel) : ''));
    }

    const encContainer = getEncounterContainer();
    const isEncounterDuplicate = checkEncounterIsDuplicate(encContainer, isNewEncounter);
    const avoidDupesActive = (config.avoidDuplicates !== false);

    if (avoidDupesActive && isEncounterDuplicate) {
        if (isNewEncounter) {
            console.log('[TargetEngine] DUPLICATE ENCOUNTER: "' + shortName + '" (already owned in Dex). Skipping to preserve hunting flow.');
        }
        return;
    }

    // Helper: checks whether the encounter's variant is accepted for target species (Tier 1-3)
    // When variant filtering is active (enableVariantFilter / findAnySpecialVariant):
    // - If the user unchecks 'Normal' in Tab 2, normal encounters (even Legendaries) MUST be ignored!
    // - Only checked variant forms (e.g. Shiny, Shadow, Chrome, etc.) will trigger capture.
    function isVariantAcceptedForSpecies() {
        const isFilterActive = (config.enableVariantFilter !== false) && (config.findAnySpecialVariant !== false);
        if (isFilterActive && allowedVariants.length > 0) {
            return allowedVariants.includes(detectedVariant);
        }
        return true;
    }

    const varPrefix = (detectedVariant !== 'normal') ? (detectedVariant.toUpperCase() + ' ') : '';

    // Helper: extracts clean Pokemon species name from encounter text
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

    // D. Match against Tab 1 Target Tiers:
    // 1. Tier 1: Custom Target Whitelist
    if (config.customTargetList && typeof config.customTargetList === 'string') {
        const customTargets = config.customTargetList.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        for (let c = 0; c < customTargets.length; c++) {
            const targetName = customTargets[c];
            if (targetName && textLower.indexOf(targetName) !== -1) {
                if (isVariantAcceptedForSpecies()) {
                    const foundName = 'Custom Target: ' + varPrefix + customTargets[c].toUpperCase() + lvlSuffix;
                    triggerTargetFound(foundName, 'Custom Target');
                    return;
                }
            }
        }
    }

    // 2. Tier 2: Mega Evolutions & Rare Evolution Lines
    if (findMegas) {
        // A. Category Header Banner check: "MEGA EVOLUTION" or "MEGA POKEMON"
        const hasMegaBanner = /\bmega\s*(?:evolution|pok[e\u00e9]mon)\b/i.test(encounterBoxText || textLower);
        if (hasMegaBanner) {
            const spec = extractEncounterSpeciesName();
            if (spec && isVariantAcceptedForSpecies()) {
                const foundName = varPrefix + 'Mega: ' + spec.toUpperCase() + lvlSuffix;
                triggerTargetFound(foundName, 'Mega Evolution');
                return;
            }
        }

        // B. Form prefix match (e.g. "Mega Charizard", "Gigantamax Pikachu")
        for (let j = 0; j < FORMS.length; j++) {
            const form = FORMS[j];
            const formMatch = textLower.match(new RegExp('\\b' + form + '[- ]+([a-z0-9\\-\':]+)', 'i'));
            if (formMatch) {
                if (form.toLowerCase() === 'ultra' && formMatch[1].toLowerCase().startsWith('ball')) {
                    continue;
                }
                if (isVariantAcceptedForSpecies()) {
                    const foundName = varPrefix + form.toUpperCase() + ' ' + formMatch[1] + lvlSuffix;
                    triggerTargetFound(foundName, 'Special Form');
                    return;
                }
            }
        }

        // C. Full evolutionary families capable of Mega Evolution
        for (let mg = 0; mg < MEGAS_LOWER.length; mg++) {
            const megaTarget = MEGAS_LOWER[mg];
            if (textLower.indexOf(megaTarget) !== -1) {
                if (isVariantAcceptedForSpecies()) {
                    const foundName = varPrefix + 'Mega Line: ' + TARGETS.megas[mg] + lvlSuffix;
                    triggerTargetFound(foundName, 'Mega Evolution');
                    return;
                }
            }
        }
    }

    // 3. Tier 3: Legendaries, Mythicals, Ultra Beasts & Paradox
    // Priority Target: ALL wild Legendaries (normal and special variants alike) MUST be halted for capture!
    if (findLegend) {
        const allowClassic = config.legendaryClassic !== false;
        const allowUB = config.legendaryUltraBeasts !== false;
        const allowParadox = config.legendaryParadox !== false;

        const boxCheckText = ((encounterBoxText || '') + ' ' + textLower).toLowerCase();

        // 3A. Category Header Banner: Ultra Beasts (e.g. ULTRABEAST)
        if (allowUB && (boxCheckText.indexOf('ultrabeast') !== -1 || /\bultra\s*beasts?\b/i.test(boxCheckText))) {
            const spec = extractEncounterSpeciesName();
            if (spec && isVariantAcceptedForSpecies()) {
                const foundName = varPrefix + 'Ultra Beast: ' + spec.toUpperCase() + lvlSuffix;
                triggerTargetFound(foundName, 'Ultra Beast');
                return;
            }
        }

        // 3B. Category Header Banner: Paradox Pokemon (e.g. PARADOX POKEMON / PARADOX)
        if (allowParadox && (boxCheckText.indexOf('paradox') !== -1 || /\bparadox\s*pok[e\u00e9]mon\b/i.test(boxCheckText))) {
            const spec = extractEncounterSpeciesName();
            if (spec && isVariantAcceptedForSpecies()) {
                const foundName = varPrefix + 'Paradox: ' + spec.toUpperCase() + lvlSuffix;
                triggerTargetFound(foundName, 'Paradox Pokemon');
                return;
            }
        }

        // 3C. Category Header Banner: Rare & Legendary Pokemon (e.g. LEGENDARY POKEMON / LEGENDARY)
        if (allowClassic && (boxCheckText.indexOf('legendary') !== -1 || /\blegendary\s*pok[e\u00e9]mon\b/i.test(boxCheckText))) {
            const spec = extractEncounterSpeciesName();
            if (spec && isVariantAcceptedForSpecies()) {
                const foundName = varPrefix + 'Legendary: ' + spec.toUpperCase() + lvlSuffix;
                triggerTargetFound(foundName, 'Rare/Legendary');
                return;
            }
        }

        // 3D. Comprehensive Species List Fallback (137 Species across Gen 1-9)
        for (let k = 0; k < LEGENDARY_LOWER.length; k++) {
            const leg = LEGENDARY_LOWER[k];
            if (textLower.indexOf(leg) !== -1) {
                const isUB = ULTRA_BEASTS.indexOf(leg) !== -1;
                const isParadox = PARADOX.indexOf(leg) !== -1;
                if (isUB && !allowUB) continue;
                if (isParadox && !allowParadox) continue;
                if (!isUB && !isParadox && !allowClassic) continue;

                if (isVariantAcceptedForSpecies()) {
                    const foundName = varPrefix + TARGETS.legendaries[k] + lvlSuffix;
                    triggerTargetFound(foundName, isParadox ? 'Paradox Pokemon' : (isUB ? 'Ultra Beast' : 'Rare/Legendary'));
                    return;
                } else if (isNewEncounter) {
                    console.log('[TargetEngine] IGNORED: ' + TARGETS.legendaries[k] + ' matched species tier, but ' + detectedVariant.toUpperCase() + ' variant is not checked in Tab 2');
                }
            }
        }
    }

    // 4. Tier 4: Special Sprite Variants (Generic Wild Pokemon)
    // Generic wild common Pokemon (e.g. Swablu, Rattata, Bidoof) are ONLY caught if:
    // - Preset is 'all' (catch all targets + all variants)
    // - Preset is 'variants' (catch any wild variant)
    // - Preset is 'shinies' and the encounter is specifically Shiny
    // - Or custom mode with NO species tiers selected (pure variant hunting)
    // When species tiers (Legendaries, Megas, or Custom Whitelist) are active, common wild Pokemon are NEVER halted!
    const hasActiveSpeciesTiers = findLegend || findMegas || (config.customTargetList && config.customTargetList.trim().length > 0);
    const isSpeciesRestricted = hasActiveSpeciesTiers || config.targetPreset === 'legendaries' || config.targetPreset === 'megas' || config.targetPreset === 'legend_megas';

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
            let specName = '';
            const match = textLower.match(new RegExp('\\b' + detectedVariant + '[- ]+([a-z0-9\\-\':]+)', 'i'));
            if (match && match[1]) {
                specName = ' ' + match[1].charAt(0).toUpperCase() + match[1].slice(1);
            }
            const foundName = detectedVariant.toUpperCase() + specName + lvlSuffix;
            triggerTargetFound(foundName, 'Special Variant');
            return;
        }
    } else if (isNewEncounter && detectedVariant !== 'normal' && hasActiveSpeciesTiers) {
        console.log('[TargetEngine] IGNORED: Wild ' + detectedVariant.toUpperCase() + ' encounter skipped (Species-restricted hunting active)');
    }

    // 5. Tier 5: Fallback Level Filter (If user explicitly selected Scope: All Wild Encounters, or no categories selected)
    const anyTierActive = findMegas || findLegend || (config.customTargetList && config.customTargetList.trim().length > 0);
    const isLevelAllScope = config.enableLevelFilter && (config.levelFilterScope === 'all' || !anyTierActive);

    if (isLevelAllScope && passesLevel && currentLevel !== null) {
        const symbol = (config.levelFilterMode === 'min') ? '+' : ((config.levelFilterMode === 'max') ? '<=' : '');
        const foundName = varPrefix + 'Wild Encounter (Lv ' + currentLevel + symbol + ')';
        triggerTargetFound(foundName, 'Level Match');
        return;
    }
}

// --- 4. TARGET FOUND HANDLER ---
function triggerTargetFound(targetName, category) {
    if (!isHuntingActive) return;
    if (targetName === lastFoundTarget) return;

    const encContainer = getEncounterContainer();
    const isDupe = checkEncounterIsDuplicate(encContainer, false);
    if (config.avoidDuplicates !== false && isDupe) {
        console.log('[PokePreload] Duplicate target detected during trigger: ' + targetName + ' - skipping.');
        return;
    }

    lastFoundTarget = targetName;
    isHuntingActive = false;

    console.log('[PokePreload] TARGET DETECTED:', targetName, '(' + category + ')' + (isDupe ? ' [DUPLICATE]' : ''));

    ipcRenderer.sendToHost('target-found', {
        name: targetName,
        category: category,
        isDuplicate: isDupe
    });
}

// --- 5. DOM OBSERVERS & EVENT HOOKS ---
function getPlayerPosition() {
    try {
        const player = document.querySelector('#map #user, #map #player, #map .trainer, #map .player, #map img[src*="trainer"], #map img.player') ||
                       document.getElementById('user') ||
                       document.getElementById('player') ||
                       document.querySelector('.trainer') ||
                       document.querySelector('.player');
        if (player) {
            const rect = player.getBoundingClientRect();
            return {
                x: Math.round(rect.left),
                y: Math.round(rect.top)
            };
        }
    } catch (_) {}
    return null;
}

function isGreyColor(c) {
    if (!c) return false;
    const s = (c + '').toLowerCase().trim();
    if (s === '#808080' || s === '#888' || s === '#999' || s === '#aaa' || s === '#bbb' || s === '#ccc') return true;
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
        const r = parseInt(m[1], 10);
        const g = parseInt(m[2], 10);
        const b = parseInt(m[3], 10);
        // True grey has balanced medium luminance (between 80 and 190). White (255) and black (0) are not grey!
        if (r >= 80 && r <= 190 && g >= 80 && g <= 190 && b >= 80 && b <= 190 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
            return true;
        }
    }
    return false;
}

function checkElementBlocked(el) {
    if (!el) return false;

    if (el.disabled || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.getAttribute('aria-hidden') === 'true') {
        return true;
    }

    const cls = (el.className || '').toString().toLowerCase();
    if (cls.indexOf('disable') !== -1 || cls.indexOf('m-dis') !== -1 ||
        cls.indexOf('inactive') !== -1 || cls.indexOf('blocked') !== -1 ||
        cls.indexOf('off') !== -1 || cls.indexOf('grey') !== -1 ||
        cls.indexOf('gray') !== -1 || cls.indexOf('dr-dis') !== -1) {
        return true;
    }

    try {
        const st = window.getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden') return true;
        if (st.pointerEvents === 'none') return true;
        if (st.cursor === 'not-allowed') return true;

        const op = parseFloat(st.opacity);
        if (!isNaN(op) && op <= 0.75) return true;
        if (isGreyColor(st.color) || isGreyColor(st.fill) || isGreyColor(st.backgroundColor)) return true;
        if (st.filter && (st.filter.indexOf('grayscale') !== -1 || st.filter.indexOf('opacity') !== -1)) return true;
    } catch (_) {}

    const img = (el.tagName === 'IMG') ? el : el.querySelector('img');
    if (img) {
        const src = (img.getAttribute('src') || '').toLowerCase();
        if (src.indexOf('disab') !== -1 || src.indexOf('grey') !== -1 || src.indexOf('gray') !== -1 || src.indexOf('off') !== -1) {
            return true;
        }
        try {
            const imgSt = window.getComputedStyle(img);
            const imgOp = parseFloat(imgSt.opacity);
            if (!isNaN(imgOp) && imgOp <= 0.75) return true;
            if (imgSt.filter && imgSt.filter.indexOf('grayscale') !== -1) return true;
        } catch (_) {}
    }

    const svg = (el.tagName === 'SVG' || el.tagName === 'PATH' || el.tagName === 'POLYGON') ? el : el.querySelector('svg, path, polygon');
    if (svg) {
        try {
            const svgSt = window.getComputedStyle(svg);
            const svgOp = parseFloat(svgSt.opacity);
            if (!isNaN(svgOp) && svgOp <= 0.75) return true;
            const fill = svg.getAttribute('fill') || svgSt.fill;
            if (isGreyColor(fill)) return true;
        } catch (_) {}
    }

    return false;
}

function isNavButtonBlocked(dir) {
    const dirMap = {
        'Up': ['#dr-n', '.dr-n', '[data-dir="n"]', '[data-direction="n"]', '[data-direction="up"]'],
        'Down': ['#dr-s', '.dr-s', '[data-dir="s"]', '[data-direction="s"]', '[data-direction="down"]'],
        'Left': ['#dr-w', '.dr-w', '[data-dir="w"]', '[data-direction="w"]', '[data-direction="left"]'],
        'Right': ['#dr-e', '.dr-e', '[data-dir="e"]', '[data-direction="e"]', '[data-direction="right"]'],
        'Up-Left': ['#dr-nw', '.dr-nw', '[data-dir="nw"]'],
        'Up-Right': ['#dr-ne', '.dr-ne', '[data-dir="ne"]'],
        'Down-Left': ['#dr-sw', '.dr-sw', '[data-dir="sw"]'],
        'Down-Right': ['#dr-se', '.dr-se', '[data-dir="se"]']
    };

    const selectors = dirMap[dir] || [];
    for (let i = 0; i < selectors.length; i++) {
        const el = document.querySelector(selectors[i]);
        if (el) {
            return checkElementBlocked(el);
        }
    }
    return false;
}

function getBlockedNavDirections() {
    return {
        'Up': isNavButtonBlocked('Up'),
        'Down': isNavButtonBlocked('Down'),
        'Left': isNavButtonBlocked('Left'),
        'Right': isNavButtonBlocked('Right'),
        'Up-Left': isNavButtonBlocked('Up-Left'),
        'Up-Right': isNavButtonBlocked('Up-Right'),
        'Down-Left': isNavButtonBlocked('Down-Left'),
        'Down-Right': isNavButtonBlocked('Down-Right')
    };
}

// Target Encounter Movement Guard: Prevent accidentally walking away ONLY when an active target encounter is on screen!
window.addEventListener('keydown', (e) => {
    if (isGuestInputField(e.target)) return;
    if (lastFoundTarget && isEncounterOrCatchUIPresent()) {
        const moveKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Up', 'Down', 'Left', 'Right'];
        if (moveKeys.includes(e.code) || moveKeys.includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }
}, true);

ipcRenderer.on('click-nav-button', (event, data) => {
    // If hunting is paused (e.g. target was found or user paused), drop all movement commands immediately!
    if (!isHuntingActive) {
        return;
    }

    const dir = data && data.direction;
    const dirMap = {
        'Up': '#dr-n',
        'Down': '#dr-s',
        'Left': '#dr-w',
        'Right': '#dr-e',
        'Up-Left': '#dr-nw',
        'Up-Right': '#dr-ne',
        'Down-Left': '#dr-sw',
        'Down-Right': '#dr-se'
    };
    const selector = dirMap[dir];
    if (selector) {
        const btn = document.querySelector(selector);
        if (btn && !isNavButtonBlocked(dir)) {
            try {
                btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                btn.click();
                btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            } catch (_) {
                try { btn.click(); } catch (_) {}
            }
        }
    }
});

function getDexyText() {
    try {
        const dexyEl = document.getElementById('dexy') || document.querySelector('.dexy') || document.getElementById('showpoke');
        return dexyEl ? (dexyEl.innerText || dexyEl.textContent || '').trim() : '';
    } catch (_) {
        return '';
    }
}

let unconfirmedBlockedCount = 0;
let lastUnconfirmedDir = null;

let lastBroadcastBlockedStr = '';
function syncNavStatusToHost() {
    // Strictly guard: never broadcast nav button status while a step is in flight or page is searching!
    if (activeStep && !activeStep.resolved) {
        return;
    }
    const dexyEl = document.getElementById('dexy') || document.querySelector('.dexy');
    const isLoading = dexyEl && (dexyEl.innerText || dexyEl.textContent || '').indexOf('Searching...') !== -1;
    if (isLoading) {
        return;
    }

    const blocked = getBlockedNavDirections();
    
    // If all 4 cardinal directions are blocked, it's a transient AJAX loading state, not a real physical wall.
    // Do NOT broadcast this to the host, otherwise it will hallucinate 4 walls and turn randomly.
    if (blocked['Up'] && blocked['Down'] && blocked['Left'] && blocked['Right']) {
        return;
    }

    const str = JSON.stringify(blocked);
    if (str !== lastBroadcastBlockedStr) {
        lastBroadcastBlockedStr = str;
        ipcRenderer.sendToHost('nav-status', { blocked: blocked });
    }
}

const observer = new MutationObserver(() => {
    if (activeStep && !activeStep.resolved) {
        const curPos = getPlayerPosition();
        const curDexy = getDexyText();
        const posMoved = !!(activeStep.initialPos && curPos && (activeStep.initialPos.x !== curPos.x || activeStep.initialPos.y !== curPos.y));
        const isLoading = curDexy && curDexy.indexOf('Searching...') !== -1;

        if (isLoading) {
            activeStep.sawSearching = true;
        }

        // True step success on DelugeRPG:
        // 1. Position moved, OR
        // 2. Searching appeared and finished, OR
        // 3. Dexy text changed from initial snapshot and is not searching
        const moveSucceeded = posMoved || (activeStep.sawSearching && !isLoading) || (!isLoading && curDexy && curDexy !== activeStep.initialText);

        if (moveSucceeded) {
            activeStep.resolved = true;
            unconfirmedBlockedCount = 0;
            lastUnconfirmedDir = null;
            if (collisionCheckTimer) {
                clearTimeout(collisionCheckTimer);
                collisionCheckTimer = null;
            }
            ipcRenderer.sendToHost('move-result', {
                direction: activeStep.direction,
                success: true,
                allBlocked: getBlockedNavDirections()
            });
            syncNavStatusToHost();
        }
    } else {
        syncNavStatusToHost();
    }
    scanForTargets();
});

function inspectNavigationDom() {
    try {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/map') === -1) return null;

        const report = {
            url: window.location.href,
            playerPos: getPlayerPosition(),
            dexyText: getDexyText(),
            blockedSummary: getBlockedNavDirections(),
            matchedElements: [],
            dpadSnippet: ''
        };

        const selectors = [
            '#dr-n', '#dr-s', '#dr-w', '#dr-e', '#dr-nw', '#dr-ne', '#dr-sw', '#dr-se',
            '.dr-n', '.dr-s', '.dr-w', '.dr-e', '.dr-nw', '.dr-ne', '.dr-sw', '.dr-se'
        ];
        selectors.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) {
                const st = window.getComputedStyle(el);
                report.matchedElements.push({
                    selector: sel,
                    id: el.id,
                    className: el.className,
                    disabled: el.disabled || el.getAttribute('disabled') || el.getAttribute('aria-disabled'),
                    opacity: st.opacity,
                    color: st.color,
                    fill: (el.querySelector('svg, path') && window.getComputedStyle(el.querySelector('svg, path')).fill) || '',
                    display: st.display
                });
            }
        });

        // Search for D-pad container (near checkbox "Keyboard Navigation" or "#map")
        const allLabels = Array.from(document.querySelectorAll('label, div, span, form, td'));
        const targetLabel = allLabels.find(l => (l.innerText || l.textContent || '').indexOf('Keyboard Navigation') !== -1);
        if (targetLabel) {
            const container = targetLabel.closest('div') || targetLabel.parentElement;
            if (container && container.parentElement) {
                report.dpadSnippet = (container.parentElement.innerHTML || '').substring(0, 1500);
            }
        }

        ipcRenderer.sendToHost('debug-dom-dump', report);
        return report;
    } catch (err) {
        return { error: err.message };
    }
}

ipcRenderer.on('request-dom-dump', () => {
    inspectNavigationDom();
});

ipcRenderer.on('step-dispatched', (event, data) => {
    const dir = (data && data.direction) || 'Left';

    if (collisionCheckTimer) {
        clearTimeout(collisionCheckTimer);
        collisionCheckTimer = null;
    }

    const allBlocked = getBlockedNavDirections();
    const isGameLoading = (allBlocked['Up'] && allBlocked['Down'] && allBlocked['Left'] && allBlocked['Right']) || (getDexyText().indexOf('Searching...') !== -1);

    // Fast path: if the nav arrow on DelugeRPG is ALREADY disabled (and the game is not just loading), report obstacle immediately
    if (isNavButtonBlocked(dir) && !isGameLoading) {
        ipcRenderer.sendToHost('move-result', {
            direction: dir,
            blocked: true,
            navBlocked: true,
            allBlocked: allBlocked
        });
        return;
    }

    const initialPos = getPlayerPosition();
    const initialDexy = getDexyText();
    activeStep = {
        direction: dir,
        initialPos: initialPos,
        initialText: initialDexy,
        sawSearching: false,
        resolved: false
    };

    // Preload collision evaluation timer (850ms)
    collisionCheckTimer = setTimeout(() => {
        if (activeStep && !activeStep.resolved) {
            const curPos = getPlayerPosition();
            const curDexy = getDexyText();
            const posMoved = !!(initialPos && curPos && (initialPos.x !== curPos.x || initialPos.y !== curPos.y));
            const isLoadingNow = curDexy && curDexy.indexOf('Searching...') !== -1;
            const navBlockedNow = isNavButtonBlocked(dir);

            if (posMoved) {
                activeStep.resolved = true;
                ipcRenderer.sendToHost('move-result', {
                    direction: dir,
                    success: true,
                    allBlocked: getBlockedNavDirections()
                });
            } else if (!isLoadingNow) {
                // Preload collision evaluation: check on-screen nav arrow
                activeStep.resolved = true;
                if (navBlockedNow) {
                    ipcRenderer.sendToHost('move-result', {
                        direction: dir,
                        blocked: true,
                        navBlocked: true,
                        allBlocked: getBlockedNavDirections()
                    });
                } else {
                    ipcRenderer.sendToHost('move-result', {
                        direction: dir,
                        success: true,
                        allBlocked: getBlockedNavDirections()
                    });
                }
            }
        }
    }, 850);
});

// Guest Context Spacebar Toggle Handler
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
        const activeEl = document.activeElement;
        const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable);
        if (!isInput) {
            e.preventDefault();
            e.stopPropagation();
            ipcRenderer.sendToHost('toggle-hunting-hotkey');
        }
    }
}, true);

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    console.log('[PokePreload] DOMContentLoaded on ' + window.location.pathname);
    applyCosmeticAdHiding();
    checkAndSyncMapPresence();
    const path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('/login') !== -1) {
        const creds = config && config.dummyAccount;
        if (creds && creds.username && creds.password) {
            performLoginAutoFill(creds);
        }
    }
    scanForTargets();
    const mapEl = document.getElementById('map');
    const dexyEl = document.getElementById('dexy') || document.querySelector('.dexy') || document.getElementById('showpoke');
    if (mapEl) {
        observer.observe(mapEl, { childList: true, subtree: true, attributes: true });
    }
    if (dexyEl) {
        observer.observe(dexyEl, { childList: true, subtree: true, characterData: true });
    }
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'disabled', 'aria-disabled', 'aria-hidden']
        });
    }
});

// High-frequency polling (300ms) for instant responsiveness
setInterval(() => {
    syncNavStatusToHost();
    checkAndSyncMapPresence();
    scanForTargets();
}, 300);

window.addEventListener('popstate', checkAndSyncMapPresence);
window.addEventListener('hashchange', checkAndSyncMapPresence);

function isGuestInputField(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el.isContentEditable;
}

// Forward guest input focus states to host to ensure physical keyboard focus and prevent roaming interference
window.addEventListener('focusin', (e) => {
    if (isGuestInputField(e.target)) {
        ipcRenderer.sendToHost('guest-input-focused', true);
    }
}, true);

window.addEventListener('pointerdown', (e) => {
    if (isGuestInputField(e.target)) {
        ipcRenderer.sendToHost('guest-input-focused', true);
    }
}, true);

window.addEventListener('focusout', (e) => {
    if (isGuestInputField(e.target)) {
        ipcRenderer.sendToHost('guest-input-focused', false);
    }
}, true);

// Notify host that preload is active and ready
console.log('[PokePreload] Initialized successfully in guest context');
ipcRenderer.sendToHost('preload-ready');

// Robust Auto-fill login helper
function performLoginAutoFill(credentials) {
    if (!credentials || !credentials.username || !credentials.password) return false;

    // Search for password field
    const passInput = document.querySelector('input[type="password"], input[name*="password"], input[id*="password"], input[autocomplete="current-password"]');
    if (!passInput) return false;

    // Search for username / login field
    let userInput = null;
    const form = passInput.form || passInput.closest('form');
    if (form) {
        userInput = form.querySelector('input[name*="user"], input[id*="user"], input[name*="login"], input[id*="login"], input[type="text"], input[type="email"]');
    }
    if (!userInput) {
        userInput = document.querySelector('input[name*="username"], input[id*="username"], input[name*="user"], input[id*="user"], input[autocomplete="username"], input[name="login"]');
    }

    if (userInput && passInput) {
        function setNativeValue(el, val) {
            try {
                el.focus();
                const proto = window.HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                if (setter) {
                    setter.call(el, val);
                } else {
                    el.value = val;
                }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (_) {
                el.value = val;
            }
        }

        setNativeValue(userInput, credentials.username);
        setNativeValue(passInput, credentials.password);
        console.log('[PokePreload] Login credentials auto-filled successfully');
        return true;
    }
    return false;
}

ipcRenderer.on('fill-login', (event, credentials) => {
    performLoginAutoFill(credentials);
});

// --- ZOOM SHORTCUT FORWARDERS (Guest Context) ---
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd' || e.code === 'Equal') {
            e.preventDefault();
            ipcRenderer.sendToHost('zoom-in');
        } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract' || e.code === 'Minus') {
            e.preventDefault();
            ipcRenderer.sendToHost('zoom-out');
        } else if (e.key === '0' || e.code === 'Numpad0' || e.code === 'Digit0') {
            e.preventDefault();
            ipcRenderer.sendToHost('zoom-reset');
        }
    }
}, { capture: true, passive: false });

window.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
            ipcRenderer.sendToHost('zoom-in');
        } else if (e.deltaY > 0) {
            ipcRenderer.sendToHost('zoom-out');
        }
    }
}, { capture: true, passive: false });

