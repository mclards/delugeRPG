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

// --- 1. ENVIRONMENT HYGIENE & STEALTH STORAGE SHIELD ---
let _internalAuthorizedClickFlag = false;
try {
    delete window.process;
    delete window.Buffer;
    delete window.require;
    delete window.setImmediate;
    delete window.clearImmediate;
    delete window.global;

    Object.defineProperty(window, '__delugeAutoCatchAuthorizedClick', {
        get: function() { return _internalAuthorizedClickFlag; },
        set: function(val) { _internalAuthorizedClickFlag = !!val; },
        enumerable: false,
        configurable: false
    });

    const _origObjectKeys = Object.keys;
    Object.keys = function(obj) {
        const keys = _origObjectKeys.call(Object, obj);
        if (obj === window.sessionStorage || obj === window.localStorage) {
            return keys.filter(k => !String(k).startsWith('deluge_autocatch_'));
        }
        return keys;
    };
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
    targetPreset: 'legendaries',
    findLegendaries: true,
    legendaryClassic: true,
    legendaryUltraBeasts: true,
    legendaryParadox: true,
    findMegasAndGigantamax: false,
    findAnySpecialVariant: false,
    enableVariantFilter: false,
    selectedVariants: ['normal', ...VARIANTS],
    customTargetList: '',
    blacklistList: '',
    enableLevelFilter: false,
    levelFilterMode: 'min',
    levelFilterValue: 50,
    levelFilterScope: 'targets',
    hideAdsCosmetically: true
};

// --- OPTION B: SMOOTH COSMETIC ADBLOCK & ADS LISTENER ENGINE ---
// Preserves 100% network connectivity for DelugeRPG script verification
// while eliminating blank wrapper gaps, layout jumping, and intrusive ads
const COSMETIC_AD_STYLE_ID = 'stealth-cosmetic-ad-hide';
const COSMETIC_AD_CSS = [
    '/* DelugeRPG Smooth Cosmetic Adblock Simulation (Network Intact, Zero-Shift Hiding) */',
    'div[id^="div-gpt-ad"],',
    'div[id*="-gpt-ad-"],',
    'div[id^="google_ads_iframe"],',
    'div[id*="google_ads_iframe"],',
    'div[id^="aswift_"],',
    'div[id*="-aswift-"],',
    'div[id*="aswift_host"],',
    'ins.adsbygoogle,',
    'ins.adsbygoogle-noablate,',
    '.google-auto-placed,',
    'iframe[id^="google_ads_iframe"],',
    'iframe[id*="google_ads_iframe"],',
    'iframe[id^="aswift_"],',
    'iframe[name^="aswift_"],',
    'iframe[id*="ad_iframe"],',
    'iframe[src*="doubleclick.net"],',
    'iframe[src*="googlesyndication.com"],',
    'iframe[src*="googleads"],',
    'div[class*="grippy-host"],',
    'div[data-google-vignette],',
    'div[id*="google-interstitial"],',
    'div[class*="google-interstitial"],',
    'div[id*="google-rewarded-video"],',
    'div[aria-label="Advertisement"],',
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
    'div[class*="ad-unit"],',
    'div[id*="interstitial"],',
    'div[class*="interstitial"],',
    'div[class*="ad-overlay"],',
    'div[id*="ad-overlay"],',
    'div[class*="overlay-ad"],',
    'div[id*="overlay-ad"],',
    'div[id^="oa-360-"],',
    'div[id*="oa-360"],',
    'div[class*="oa-360"],',
    'div[id*="optad360"],',
    'div[class*="optad360"],',
    'a[href*="optad360"],',
    'img[src*="optad360"],',
    '[data-smooth-ad-collapsed="true"],',
    '[data-ad-parent-collapsed="true"] {',
    '    display: none !important;',
    '    visibility: hidden !important;',
    '    height: 0 !important;',
    '    min-height: 0 !important;',
    '    max-height: 0 !important;',
    '    width: 0 !important;',
    '    min-width: 0 !important;',
    '    max-width: 0 !important;',
    '    margin: 0 !important;',
    '    padding: 0 !important;',
    '    border: none !important;',
    '    outline: none !important;',
    '    opacity: 0 !important;',
    '    pointer-events: none !important;',
    '    overflow: hidden !important;',
    '    background: transparent !important;',
    '}',
    '/* Eliminate empty layout wrappers hosting only ad units */',
    'div:has(> ins.adsbygoogle:only-child),',
    'div:has(> div[id^="div-gpt-ad"]:only-child),',
    'div:has(> div[id^="oa-360-"]:only-child),',
    'div:has(> iframe[id^="aswift_"]:only-child),',
    'div:has(> iframe[src*="googleads"]:only-child) {',
    '    height: 0 !important;',
    '    min-height: 0 !important;',
    '    max-height: 0 !important;',
    '    margin: 0 !important;',
    '    padding: 0 !important;',
    '    border: none !important;',
    '    overflow: hidden !important;',
    '    background: transparent !important;',
    '}',
    '/* Restore viewport scroll/interaction if interstitial scripts attempt to lock it */',
    'html, body {',
    '    overflow: auto !important;',
    '}',
    '/* Core DelugeRPG Layout Immunity: Top header, navbar, logo, user info and game maps */',
    '#del_header {',
    '    display: block !important;',
    '    visibility: visible !important;',
    '    height: auto !important;',
    '    min-height: initial !important;',
    '    max-height: none !important;',
    '    opacity: 1 !important;',
    '    pointer-events: auto !important;',
    '    overflow: visible !important;',
    '}',
    '#navwrap {',
    '    display: block !important;',
    '    visibility: visible !important;',
    '    height: auto !important;',
    '    min-height: initial !important;',
    '    max-height: none !important;',
    '    opacity: 1 !important;',
    '    pointer-events: auto !important;',
    '    overflow: visible !important;',
    '}',
    '#del_header #navwrap,',
    '#del_header #navwrap *,',
    '#logo,',
    '#logo *,',
    '#navid,',
    '#navid *,',
    '#navinf,',
    '#navinf * {',
    '    visibility: visible !important;',
    '    opacity: 1 !important;',
    '    pointer-events: auto !important;',
    '}',
    '#menuad {',
    '    height: 0px !important;',
    '    min-height: 0px !important;',
    '    max-height: 0px !important;',
    '    margin: 0px !important;',
    '    padding: 0px !important;',
    '    overflow: hidden !important;',
    '    display: none !important;',
    '}'
].join('\n');

function vaccinateLinksAgainstVignettes() {
    if (config.hideAdsCosmetically === false) return;
    try {
        const links = document.querySelectorAll('a:not([data-google-vignette])');
        for (let i = 0; i < links.length; i++) {
            links[i].setAttribute('data-google-vignette', 'false');
        }
    } catch (_) {}
}

function dismissGoogleVignetteOverlay() {
    if (config.hideAdsCosmetically === false) return;
    try {
        // A. Clean vignette hash from URL without navigation
        if (window.location.hash && window.location.hash.indexOf('google_vignette') !== -1) {
            try {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            } catch (_) {}
        }

        // B. Auto-click native Google Vignette dismiss / close buttons
        const dismissSelectors = [
            '#dismiss-button',
            'div#dismiss-button',
            'button#dismiss-button',
            'div[aria-label="Close ad" i]',
            'button[aria-label="Close ad" i]',
            'div[aria-label="Close" i]',
            'button[aria-label="Close" i]',
            '.grippy-host',
            'div[class*="close-button" i]',
            'div[id*="close-button" i]'
        ];

        for (let s = 0; s < dismissSelectors.length; s++) {
            const btn = document.querySelector(dismissSelectors[s]);
            if (btn && btn.offsetParent !== null) {
                try {
                    btn.click();
                } catch (_) {}
            }
        }

        // C. Collapse any fixed full-screen interstitial overlays holding ad iframes
        const fixedElements = document.querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"], ins.adsbygoogle[data-vignette-loaded]');
        for (let f = 0; f < fixedElements.length; f++) {
            const el = fixedElements[f];
            if (el.id === 'del_header' || el.id === 'navwrap' || (el.closest && el.closest('#del_header, #navwrap, nav'))) {
                continue;
            }
            const hasAdChild = el.querySelector('iframe[src*="google"], iframe[src*="doubleclick"], iframe[id^="aswift"], ins.adsbygoogle, #dismiss-button');
            const isAd = el.id && (el.id.indexOf('aswift') !== -1 || el.id.indexOf('google') !== -1);
            if (hasAdChild || isAd || el.hasAttribute('data-vignette-loaded')) {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('pointer-events', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
            }
        }

        // D. Prevent ad scripts from locking document body scrolling
        if (document.body && document.body.style && document.body.style.overflow === 'hidden') {
            document.body.style.overflow = '';
        }
        if (document.documentElement && document.documentElement.style && document.documentElement.style.overflow === 'hidden') {
            document.documentElement.style.overflow = '';
        }
    } catch (_) {}
}

// --- ACTIVE ADS LISTENER & TELEMETRY REGISTRY ---
const detectedAdsRegistry = new Map();
let adsBroadcastDebounceTimer = null;
let adsObserverInstance = null;

const AD_DISCOVERY_SELECTORS = [
    'ins.adsbygoogle',
    'ins.adsbygoogle-noablate',
    'div[id^="div-gpt-ad"]',
    'div[id*="-gpt-ad-"]',
    'iframe[id^="google_ads_iframe"]',
    'iframe[id*="google_ads_iframe"]',
    'iframe[id^="aswift_"]',
    'iframe[name^="aswift_"]',
    'iframe[id*="ad_iframe"]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="googleads"]',
    'div[class*="grippy-host"]',
    'div[data-google-vignette]',
    'div[id*="google-interstitial"]',
    'div[class*="google-interstitial"]',
    'div[id*="google-rewarded-video"]',
    'div[aria-label="Advertisement"]',
    '.advertisement',
    '.ad-slot',
    '.ad-container',
    '.ad-wrapper',
    '.ad-banner',
    '.ad-leaderboard',
    '.ad_unit',
    '.ad-unit',
    'div[id="top-ad"]',
    'div[id="bottom-ad"]',
    'div[id="side-ad"]',
    'div[id="header-ad"]',
    'div[id="footer-ad"]',
    'div[id^="oa-360-"]',
    'div[id*="oa-360"]',
    'div[class*="oa-360"]',
    'div[id*="optad360"]',
    'div[class*="optad360"]',
    'a[href*="optad360"]',
    'img[src*="optad360"]'
];

function classifyAdElement(el) {
    if (!el || !el.tagName || el.id === 'del_header' || el.id === 'navwrap' || el.tagName === 'NAV') return null;
    const tag = el.tagName.toUpperCase();
    const id = el.id || '';
    const cls = typeof el.className === 'string' ? el.className : '';
    const src = el.src || '';

    let type = '';
    let slotId = '';

    if (tag === 'INS' && (cls.includes('adsbygoogle') || el.hasAttribute('data-ad-client') || el.hasAttribute('data-ad-slot'))) {
        type = 'Google AdSense';
        slotId = el.getAttribute('data-ad-slot') || el.getAttribute('data-ad-client') || '';
    } else if (id.startsWith('div-gpt-ad') || id.includes('-gpt-ad-') || (tag === 'IFRAME' && id.includes('google_ads_iframe'))) {
        type = 'Google Publisher Tag (GPT)';
        slotId = id;
    } else if (id.startsWith('oa-360-') || id.includes('oa-360') || id.includes('optad360') || cls.includes('oa-360') || cls.includes('optad360') || (tag === 'A' && el.href && el.href.includes('optad360')) || (tag === 'IMG' && src.includes('optad360'))) {
        type = 'optAd360 Network / Badge';
        slotId = id || 'optad360';
    } else if (el.hasAttribute('data-google-vignette') || id.includes('vignette') || el.hasAttribute('data-vignette-loaded') || id === 'dismiss-button') {
        type = 'Google Vignette Interstitial';
    } else if (cls.includes('grippy-host') || cls.includes('grippy') || id.includes('anchor')) {
        type = 'Sticky / Anchor Banner';
    } else if (id.includes('rewarded-video') || cls.includes('video-ad')) {
        type = 'Video / Rewarded Ad';
    } else if (tag === 'IFRAME' && (id.startsWith('aswift_') || (el.name && el.name.startsWith('aswift_')))) {
        type = 'Google AdSense';
    } else if (tag === 'IFRAME' && (src.includes('doubleclick') || src.includes('googlesyndication') || src.includes('googleads') || src.includes('amazon-adsystem') || src.includes('criteo') || src.includes('nitropay') || src.includes('playwire') || src.includes('venatus'))) {
        type = 'Third-Party Ad Network';
    } else if (id === 'top-ad' || id === 'bottom-ad' || id === 'side-ad' || id === 'header-ad' || id === 'footer-ad' || cls.includes('ad-container') || cls.includes('ad-wrapper') || cls.includes('ad-banner') || cls.includes('ad-leaderboard') || cls.includes('advertisement') || cls.includes('ad_unit') || cls.includes('ad-unit')) {
        type = 'Deluge Ad Container';
    } else if (el.textContent && /^(advertisement|sponsored|ads? by google)$/i.test(el.textContent.trim())) {
        type = 'Ad Notice Label';
    }

    if (!type) return null;

    let rect = { width: 0, height: 0, top: 0, left: 0 };
    try {
        const clientRect = el.getBoundingClientRect();
        rect = {
            width: Math.round(clientRect.width),
            height: Math.round(clientRect.height),
            top: Math.round(clientRect.top),
            left: Math.round(clientRect.left)
        };
    } catch (_) {}

    let parentInfo = 'None';
    if (el.parentElement) {
        const p = el.parentElement;
        parentInfo = p.tagName + (p.id ? '#' + p.id : (p.className && typeof p.className === 'string' ? '.' + p.className.split(' ')[0] : ''));
    }

    return {
        type: type,
        tag: tag,
        elementId: id,
        classes: cls,
        slotId: slotId,
        src: src ? src.slice(0, 100) : '',
        dimensions: rect,
        parentContainer: parentInfo,
        status: 'Smoothly Collapsed (0px)',
        pageUrl: window.location.pathname + window.location.search,
        detectedAt: new Date().toLocaleTimeString()
    };
}

function getAdElementKey(el, adType) {
    if (el.id) return `${adType}:${el.tagName}#${el.id}`;
    const slot = el.getAttribute && (el.getAttribute('data-ad-slot') || el.getAttribute('data-ad-client'));
    if (slot) return `${adType}:${el.tagName}[slot=${slot}]`;
    if (el.src) return `${adType}:${el.tagName}[src=${el.src.slice(0, 60)}]`;
    const parentTag = el.parentElement ? el.parentElement.tagName : 'ROOT';
    const cls = el.className && typeof el.className === 'string' ? el.className.split(' ').slice(0, 2).join('.') : '';
    return `${adType}:${parentTag}>${el.tagName}.${cls}`;
}

function smoothCollapseAd(el, adInfo) {
    if (config.hideAdsCosmetically === false) return;
    try {
        // 1. Smooth zero-footprint collapse on target element
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('height', '0px', 'important');
        el.style.setProperty('min-height', '0px', 'important');
        el.style.setProperty('max-height', '0px', 'important');
        el.style.setProperty('width', '0px', 'important');
        el.style.setProperty('min-width', '0px', 'important');
        el.style.setProperty('max-width', '0px', 'important');
        el.style.setProperty('margin', '0px', 'important');
        el.style.setProperty('padding', '0px', 'important');
        el.style.setProperty('border', 'none', 'important');
        el.style.setProperty('outline', 'none', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
        el.setAttribute('data-smooth-ad-collapsed', 'true');

        // 2. Parent wrapper collapse (eliminates empty white/gray boxes and space gaps)
        const PROTECTED_CORE_IDS = new Set([
            'del_header', 'navwrap', 'navid', 'navinf', 'logo', 'map',
            'catch', 'battle', 'opponent', 'player', 'viewpokes', 'pokebox',
            'userloggedin', 'content', 'main', 'userpokeballs', 'myteam'
        ]);

        let parent = el.parentElement;
        let depth = 0;
        while (parent && depth < 3 && parent !== document.body && parent !== document.documentElement) {
            const rawPid = parent.id || '';
            const pid = rawPid.toLowerCase();
            const pcls = (parent.className && typeof parent.className === 'string' ? parent.className : '').toLowerCase();

            // STRICT DELUGERPG IMMUNITY: Stop traversal immediately at navigation and core game containers
            if (
                PROTECTED_CORE_IDS.has(pid) ||
                parent.tagName === 'NAV' ||
                parent.tagName === 'HEADER' ||
                pid === 'del_header' ||
                pid === 'navwrap' ||
                (parent.querySelector && parent.querySelector('#navwrap, nav, #logo, #userloggedin, #map, #opponent, #player, #viewpokes')) ||
                (parent.closest && parent.closest('#navwrap, nav, #logo, #userloggedin'))
            ) {
                break;
            }

            // Word-boundary token check to avoid false positives (e.g. 'header', 'trade', 'badge', 'shadow', 'loading')
            const isAdParent = /(^|[-_]|menu)(ads?|adunit|advert|advertisement|adcontainer|adbanner|banner|adwrapper|adslot)([-_]|$)/i.test(pid) ||
                               /(^|[-_])(ads?|adunit|advert|advertisement|adcontainer|adbanner|banner|adwrapper|adslot|google-auto-placed)([-_]|$)/i.test(pcls) ||
                               pid.includes('gpt-ad') || pid.includes('aswift');

            let nonAdChildrenCount = 0;
            if (parent.children) {
                for (let c = 0; c < parent.children.length; c++) {
                    const child = parent.children[c];
                    if (!child.hasAttribute('data-smooth-ad-collapsed') && child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.tagName !== 'BR') {
                        const childText = (child.textContent || '').trim();
                        const hasMediaOrNav = child.querySelector && child.querySelector('img, svg, canvas, nav, a, button, input, iframe:not([src*="google"]):not([src*="doubleclick"])');
                        if ((childText.length > 0 && !/^(advertisement|sponsored|ads? by google)$/i.test(childText)) || hasMediaOrNav) {
                            nonAdChildrenCount++;
                        }
                    }
                }
            }

            if (isAdParent || nonAdChildrenCount === 0) {
                parent.style.setProperty('height', '0px', 'important');
                parent.style.setProperty('min-height', '0px', 'important');
                parent.style.setProperty('max-height', '0px', 'important');
                parent.style.setProperty('margin', '0px', 'important');
                parent.style.setProperty('padding', '0px', 'important');
                parent.style.setProperty('border', 'none', 'important');
                parent.style.setProperty('outline', 'none', 'important');
                parent.style.setProperty('overflow', 'hidden', 'important');
                parent.style.setProperty('background', 'transparent', 'important');
                parent.setAttribute('data-ad-parent-collapsed', 'true');
                if (adInfo) adInfo.status = 'Parent Wrapper Collapsed';
            }
            parent = parent.parentElement;
            depth++;
        }

        // 3. Clear Google Auto Ads body padding that causes huge top/bottom gaps
        if (adInfo && adInfo.type === 'Sticky / Anchor Banner') {
            if (document.body) {
                document.body.style.removeProperty('padding-top');
                document.body.style.removeProperty('padding-bottom');
            }
            if (document.documentElement) {
                document.documentElement.style.removeProperty('padding-top');
                document.documentElement.style.removeProperty('padding-bottom');
            }
        }
    } catch (_) {}
}

function inspectAndRegisterAd(el) {
    if (!el || el.nodeType !== 1) return null;
    const info = classifyAdElement(el);
    if (!info) return null;

    const key = getAdElementKey(el, info.type);
    const isNew = !detectedAdsRegistry.has(key);

    smoothCollapseAd(el, info);

    detectedAdsRegistry.set(key, info);

    if (isNew) {
        try {
            ipcRenderer.sendToHost('ad-detected-event', info);
        } catch (_) {}
    }
    scheduleAdsBroadcast();
    return info;
}

function healDelugeHeader() {
    try {
        const delHeader = document.getElementById('del_header');
        if (delHeader) {
            delHeader.removeAttribute('data-ad-parent-collapsed');
            delHeader.removeAttribute('data-smooth-ad-collapsed');
            delHeader.style.removeProperty('display');
            delHeader.style.removeProperty('height');
            delHeader.style.removeProperty('min-height');
            delHeader.style.removeProperty('max-height');
            delHeader.style.removeProperty('margin');
            delHeader.style.removeProperty('padding');
            delHeader.style.removeProperty('overflow');
            delHeader.style.removeProperty('visibility');
            delHeader.style.removeProperty('opacity');
            delHeader.style.removeProperty('pointer-events');
            delHeader.style.setProperty('display', 'block', 'important');
            delHeader.style.setProperty('visibility', 'visible', 'important');
            delHeader.style.setProperty('opacity', '1', 'important');
        }
        const navwrap = document.getElementById('navwrap');
        if (navwrap) {
            navwrap.removeAttribute('data-ad-parent-collapsed');
            navwrap.removeAttribute('data-smooth-ad-collapsed');
            navwrap.style.removeProperty('display');
            navwrap.style.removeProperty('height');
            navwrap.style.removeProperty('min-height');
            navwrap.style.removeProperty('max-height');
            navwrap.style.removeProperty('overflow');
            navwrap.style.removeProperty('visibility');
            navwrap.style.removeProperty('opacity');
            navwrap.style.setProperty('display', 'block', 'important');
            navwrap.style.setProperty('visibility', 'visible', 'important');
            navwrap.style.setProperty('opacity', '1', 'important');
        }
        const menuad = document.getElementById('menuad');
        if (menuad) {
            menuad.style.setProperty('display', 'none', 'important');
            menuad.style.setProperty('height', '0px', 'important');
            menuad.style.setProperty('overflow', 'hidden', 'important');
        }
    } catch (_) {}
}

function scanAllAdsInDOM() {
    try {
        for (let i = 0; i < AD_DISCOVERY_SELECTORS.length; i++) {
            const elements = document.querySelectorAll(AD_DISCOVERY_SELECTORS[i]);
            for (let j = 0; j < elements.length; j++) {
                inspectAndRegisterAd(elements[j]);
            }
        }

        // Clean notice labels (e.g. text containing "Advertisement")
        const labelCandidates = document.querySelectorAll('p, div, span, small');
        for (let l = 0; l < labelCandidates.length; l++) {
            const el = labelCandidates[l];
            if (el.closest && el.closest('#del_header, #navwrap, nav, #logo, #userloggedin')) continue;
            if (el.children.length === 0 && el.textContent) {
                const txt = el.textContent.trim();
                if (/^(advertisement|sponsored|ads? by google)$/i.test(txt)) {
                    inspectAndRegisterAd(el);
                }
            }
        }
        healDelugeHeader();
    } catch (_) {}
}

function scheduleAdsBroadcast() {
    if (adsBroadcastDebounceTimer) clearTimeout(adsBroadcastDebounceTimer);
    adsBroadcastDebounceTimer = setTimeout(() => {
        try {
            const list = Array.from(detectedAdsRegistry.values());
            const types = {};
            for (let i = 0; i < list.length; i++) {
                const t = list[i].type;
                types[t] = (types[t] || 0) + 1;
            }
            ipcRenderer.sendToHost('ads-listener-update', {
                summary: {
                    total: list.length,
                    types: types,
                    pageUrl: window.location.pathname + window.location.search
                },
                ads: list
            });
        } catch (_) {}
    }, 100);
}

function initAdsObserver() {
    if (adsObserverInstance) return;
    try {
        const root = document.documentElement || document.body;
        if (!root) return;

        adsObserverInstance = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (let m = 0; m < mutations.length; m++) {
                const mut = mutations[m];
                if (mut.addedNodes && mut.addedNodes.length > 0) {
                    for (let n = 0; n < mut.addedNodes.length; n++) {
                        const node = mut.addedNodes[n];
                        if (node.nodeType === 1) {
                            inspectAndRegisterAd(node);
                            shouldScan = true;
                        }
                    }
                }
            }
            if (shouldScan) {
                vaccinateLinksAgainstVignettes();
                dismissGoogleVignetteOverlay();
                scanAllAdsInDOM();
            }
        });

        adsObserverInstance.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id', 'style', 'src']
        });
    } catch (_) {}
}

function initAdPushesHook() {
    try {
        if (typeof window !== 'undefined') {
            if (!window.adsbygoogle) {
                window.adsbygoogle = [];
            }
            if (!window.__adsbygoogle_hooked) {
                window.__adsbygoogle_hooked = true;
                const originalPush = window.adsbygoogle.push;
                window.adsbygoogle.push = function(...args) {
                    try {
                        setTimeout(scanAllAdsInDOM, 50);
                    } catch (_) {}
                    return originalPush ? originalPush.apply(this, args) : [].push.apply(this, args);
                };
            }
        }
    } catch (_) {}
}

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
            vaccinateLinksAgainstVignettes();
            dismissGoogleVignetteOverlay();
            healDelugeHeader();
            scanAllAdsInDOM();
            initAdsObserver();
            initAdPushesHook();
        } else {
            if (styleEl && styleEl.parentNode) {
                styleEl.parentNode.removeChild(styleEl);
            }
            healDelugeHeader();
        }
    } catch (_) {}
}

// Initial application of Option B & Ads Listener
healDelugeHeader();
applyCosmeticAdHiding();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        healDelugeHeader();
        applyCosmeticAdHiding();
        scanAllAdsInDOM();
        initAdsObserver();
    });
} else {
    healDelugeHeader();
    scanAllAdsInDOM();
    initAdsObserver();
}
window.addEventListener('load', () => {
    healDelugeHeader();
    scanAllAdsInDOM();
});

// Periodic lightweight sweep (every 2.5s) to catch delayed or asynchronously injected ads
setInterval(() => {
    if (config.hideAdsCosmetically !== false) {
        vaccinateLinksAgainstVignettes();
        dismissGoogleVignetteOverlay();
        healDelugeHeader();
        scanAllAdsInDOM();
    }
}, 2500);

// Host IPC triggers for Ads Listener
ipcRenderer.on('scan-page-ads', () => {
    scanAllAdsInDOM();
    scheduleAdsBroadcast();
});

ipcRenderer.on('clear-ads-registry', () => {
    detectedAdsRegistry.clear();
    scheduleAdsBroadcast();
});

let configSynced = false;
let lastSyncedConfigStr = '';
ipcRenderer.on('update-config', (event, newSettings) => {
    if (newSettings) {
        config = Object.assign({}, config, newSettings);
        if (config.targetPreset === 'legendaries' || config.targetPreset === 'megas' || config.targetPreset === 'legend_megas') {
            config.findAnySpecialVariant = false;
            config.enableVariantFilter = false;
        }
        configSynced = true;
        lastFoundTarget = '';
        lastEvaluatedEncounterSignature = '';
        applyCosmeticAdHiding();
        const currentStr = JSON.stringify(config);
        if (currentStr !== lastSyncedConfigStr) {
            lastSyncedConfigStr = currentStr;
            console.log('[PokePreload] Target filters synchronized immediately:',
                'Legendaries=' + (config.findLegendaries !== false),
                'Megas=' + (!!config.findMegasAndGigantamax),
                'WildVariants=' + (!!config.findAnySpecialVariant),
                'Preset=' + (config.targetPreset || 'custom')
            );
        }
        if (isHuntingActive) {
            scanForTargets();
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
let pendingCatchTimeoutId = null;
let pendingLifecycleTimeoutId = null;

function clearAutoCatchSession(reason = '') {
    if (pendingCatchTimeoutId) {
        clearTimeout(pendingCatchTimeoutId);
        pendingCatchTimeoutId = null;
    }
    if (pendingLifecycleTimeoutId) {
        clearTimeout(pendingLifecycleTimeoutId);
        pendingLifecycleTimeoutId = null;
    }
    autoCatchStepInProgress = false;
    try {
        sessionStorage.removeItem('deluge_autocatch_active');
        sessionStorage.removeItem('deluge_autocatch_thrown');
        sessionStorage.removeItem('deluge_autocatch_target');
        sessionStorage.removeItem('deluge_autocatch_stock');
        sessionStorage.removeItem('deluge_autocatch_details');
        sessionStorage.removeItem('deluge_autocatch_out_of_stock');
    } catch (_) {}
    if (reason) {
        console.log('[PokePreload] Cleared auto-catch session: ' + reason);
    }
}

ipcRenderer.on('abort-autocatch', () => {
    console.log('[PokePreload] Received abort-autocatch command from host');
    clearAutoCatchSession('Host requested abort');
});

ipcRenderer.on('hunting-state-changed', (event, state) => {
    const currentPath = (window.location.pathname || '').toLowerCase();
    const onMapPage = currentPath.indexOf('/map') !== -1;
    isHuntingActive = !!(state && state.isHunting) && onMapPage;
    if (!isHuntingActive) {
        lastFoundTarget = '';
        if (state && state.userManuallyPaused) {
            clearAutoCatchSession('Hunting manually paused by user');
        }
    }
});

// --- OWNED POKEMON & MEGA EVOLUTION UNIQUENESS HARDENING ENGINE ---
let ownedUserCollection = [];
const ownedCollectionByBaseSpecies = new Map();
const ownedExactNamesSet = new Set();
const ownedMegaSpeciesSet = new Set();

function escapePreloadHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getPreloadBaseSpecies(name) {
    if (!name) return '';
    return String(name)
        .replace(/^(Dark|Shiny|Shadow|Ghostly|Metallic|Mirage|Negative|Chrome|Retro)\s+/i, '')
        .replace(/^(Mega|Primal|G-Max|Gigantamax)\s+/i, '')
        .replace(/^(Alolan|Galarian|Hisuian|Paldean)\s+/i, '')
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/-(Wash|Heat|Frost|Fan|Mow|Origin|Therian|Incarnate|Altered|Dusk-Mane|Dawn-Wings|Rapid-Strike|Single-Strike|Paldea|Hisui|Galar|Alola|Sky|Attack|Defense|Speed)$/i, '')
        .replace(/\s+[XYZ]$/i, '')
        .trim()
        .toLowerCase();
}

function isPreloadActualMega(name) {
    if (!name) return false;
    const lower = String(name).toLowerCase().trim();
    return lower.includes('mega ') || lower.includes('primal ') || lower.startsWith('mega-') || lower.endsWith(' mega') || lower.endsWith(' primal');
}

function updateUserCollectionIndex(collection) {
    if (!Array.isArray(collection)) return;
    ownedUserCollection = collection;
    ownedCollectionByBaseSpecies.clear();
    ownedExactNamesSet.clear();
    ownedMegaSpeciesSet.clear();

    for (let i = 0; i < collection.length; i++) {
        const p = collection[i];
        if (!p || !p.name) continue;
        const rawName = String(p.name).trim();
        const variant = p.variant || 'Normal';
        const cleanName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanFullName = ((variant !== 'Normal' ? variant + ' ' : '') + rawName).toLowerCase().replace(/[^a-z0-9]/g, '');
        const base = getPreloadBaseSpecies(rawName);
        const isMega = isPreloadActualMega(rawName);

        ownedExactNamesSet.add(cleanName);
        ownedExactNamesSet.add(cleanFullName);

        if (isMega) {
            ownedMegaSpeciesSet.add(base);
        }

        let list = ownedCollectionByBaseSpecies.get(base);
        if (!list) {
            list = [];
            ownedCollectionByBaseSpecies.set(base, list);
        }
        list.push({
            id: p.id,
            name: rawName,
            variant: variant,
            level: p.level || 100,
            isMega: isMega
        });
    }
}

try {
    const cachedCollRaw = sessionStorage.getItem('deluge_cached_collection');
    if (cachedCollRaw) {
        const cachedColl = JSON.parse(cachedCollRaw);
        if (Array.isArray(cachedColl) && cachedColl.length > 0) {
            updateUserCollectionIndex(cachedColl);
        }
    }
} catch (_) {}

ipcRenderer.on('sync-user-collection', (event, collection) => {
    if (Array.isArray(collection)) {
        updateUserCollectionIndex(collection);
        try {
            sessionStorage.setItem('deluge_cached_collection', JSON.stringify(collection));
        } catch (_) {}
    }
});

try {
    ipcRenderer.sendToHost('request-user-collection');
} catch (_) {}

function evaluateOwnershipAndMegaEquivalence(nameOrText) {
    if (!nameOrText || ownedUserCollection.length === 0) {
        return {
            isDuplicate: false,
            isOwned: false,
            hasMegaOwned: false,
            hasExactOwned: false,
            ownedPokemon: null,
            type: 'UNOWNED',
            alertTitle: '',
            alertMessage: '',
            reason: ''
        };
    }

    let candidate = String(nameOrText).trim();
    const appearedMatch = candidate.match(/(?:wild|caught)\s+([A-Za-z0-9\s\(\)\-']+?)\s+appeared/i);
    if (appearedMatch) {
        candidate = appearedMatch[1];
    }
    candidate = candidate.replace(/^(ULTRABEAST|PARADOX POKEMON|LEGENDARY POKEMON|MEGA EVOLUTION)\s+/i, '');
    candidate = candidate.replace(/^A wild\s+/i, '');

    const cleanCandidate = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseSpecies = getPreloadBaseSpecies(candidate);
    if (!baseSpecies) {
        return {
            isDuplicate: false,
            isOwned: false,
            hasMegaOwned: false,
            hasExactOwned: false,
            ownedPokemon: null,
            type: 'UNOWNED',
            alertTitle: '',
            alertMessage: '',
            reason: ''
        };
    }

    const matchingSpecies = ownedCollectionByBaseSpecies.get(baseSpecies) || [];
    const matchingMegas = matchingSpecies.filter(p => p.isMega);
    const exactMatch = matchingSpecies.find(p => {
        const pClean = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const pFullClean = ((p.variant !== 'Normal' ? p.variant + ' ' : '') + p.name).toLowerCase().replace(/[^a-z0-9]/g, '');
        return pClean === cleanCandidate || pFullClean === cleanCandidate;
    });

    const capitalize = (s) => s ? (s.charAt(0).toUpperCase() + s.slice(1)) : '';

    if (matchingMegas.length > 0) {
        matchingMegas.sort((a, b) => (b.level || 0) - (a.level || 0));
        const topMega = matchingMegas[0];
        const fullMegaName = (topMega.name.toLowerCase().startsWith((topMega.variant || 'Normal').toLowerCase()) || topMega.variant === 'Normal')
            ? topMega.name
            : `${topMega.variant} ${topMega.name}`;

        return {
            isDuplicate: true,
            isOwned: true,
            hasMegaOwned: true,
            hasExactOwned: Boolean(exactMatch),
            ownedPokemon: topMega,
            type: 'MEGA_ALREADY_OWNED',
            alertTitle: 'STOP: MEGA EVOLUTION ALREADY OWNED',
            alertMessage: `You already own ${fullMegaName} (Lv ${topMega.level || 100})!`,
            reason: `You already own the Mega Evolution of ${capitalize(baseSpecies)}. 100% uniqueness protection active.`
        };
    }

    if (exactMatch) {
        const fullExactName = (exactMatch.name.toLowerCase().startsWith((exactMatch.variant || 'Normal').toLowerCase()) || exactMatch.variant === 'Normal')
            ? exactMatch.name
            : `${exactMatch.variant} ${exactMatch.name}`;

        return {
            isDuplicate: true,
            isOwned: true,
            hasMegaOwned: false,
            hasExactOwned: true,
            ownedPokemon: exactMatch,
            type: 'EXACT_ALREADY_OWNED',
            alertTitle: 'STOP: POKEMON ALREADY OWNED',
            alertMessage: `You already own ${fullExactName} (Lv ${exactMatch.level || 100})!`,
            reason: `Exact Pokemon already exists in your collection. 100% uniqueness protection active.`
        };
    }

    if (matchingSpecies.length > 0) {
        matchingSpecies.sort((a, b) => (b.level || 0) - (a.level || 0));
        const topSp = matchingSpecies[0];
        const fullSpName = (topSp.name.toLowerCase().startsWith((topSp.variant || 'Normal').toLowerCase()) || topSp.variant === 'Normal')
            ? topSp.name
            : `${topSp.variant} ${topSp.name}`;

        return {
            isDuplicate: true,
            isOwned: true,
            hasMegaOwned: false,
            hasExactOwned: false,
            ownedPokemon: topSp,
            type: 'SPECIES_ALREADY_OWNED',
            alertTitle: 'STOP: SPECIES ALREADY IN COLLECTION',
            alertMessage: `You already own ${fullSpName} (Lv ${topSp.level || 100})!`,
            reason: `Species ${capitalize(baseSpecies)} already exists in your collection. 100% uniqueness protection active.`
        };
    }

    return {
        isDuplicate: false,
        isOwned: false,
        hasMegaOwned: false,
        hasExactOwned: false,
        ownedPokemon: null,
        type: 'UNOWNED',
        alertTitle: '',
        alertMessage: '',
        reason: ''
    };
}

function renderUniquenessAlertBanner(ownStatus) {
    // Stealth zero-DOM-injection: guarantees DelugeRPG page DOM remains 100% clean and pristine
    removeUniquenessAlertBanner();
}

function removeUniquenessAlertBanner() {
    const existing = document.getElementById('deluge-uniqueness-alert-banner');
    if (existing && existing.parentElement) {
        existing.parentElement.removeChild(existing);
    }
}

// --- MODULE ROOT SCOPE HELPERS ---
function getRandomCatchDelay(minMs = 1000, maxMs = 10000) {
    const min = (typeof minMs === 'number' && minMs >= 500) ? minMs : 1000;
    const max = (typeof maxMs === 'number' && maxMs >= min) ? maxMs : 10000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getGaussianDelay(meanMs = 1200, stdDevMs = 200, minFloorMs = 800) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.sin(2.0 * Math.PI * u2);
    const val = Math.round(meanMs + (z * stdDevMs));
    return Math.max(minFloorMs, val);
}

function dispatchHumanClick(el, callback) {
    if (!el) {
        if (typeof callback === 'function') callback();
        return;
    }
    try {
        const rect = el.getBoundingClientRect();
        const hasSize = rect.width > 0 && rect.height > 0;
        const relX = hasSize ? Math.floor(rect.left + rect.width * (0.2 + Math.random() * 0.6)) : 50;
        const relY = hasSize ? Math.floor(rect.top + rect.height * (0.2 + Math.random() * 0.6)) : 50;
        const scrX = (window.screenX || 0) + relX;
        const scrY = (window.screenY || 0) + relY;

        try {
            ipcRenderer.sendToHost('trusted-mouse-telemetry', { x: relX, y: relY });
        } catch (_) {}

        const moveProps = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: relX,
            clientY: relY,
            screenX: scrX,
            screenY: scrY,
            pageX: relX + (window.scrollX || 0),
            pageY: relY + (window.scrollY || 0),
            buttons: 0,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true
        };

        const downProps = Object.assign({}, moveProps, { buttons: 1, button: 0 });

        try {
            if (typeof PointerEvent === 'function') {
                el.dispatchEvent(new PointerEvent('pointerover', moveProps));
                el.dispatchEvent(new PointerEvent('pointerenter', moveProps));
                el.dispatchEvent(new PointerEvent('pointermove', moveProps));
            }
        } catch (_) {}

        el.dispatchEvent(new MouseEvent('mouseover', moveProps));
        el.dispatchEvent(new MouseEvent('mouseenter', moveProps));
        el.dispatchEvent(new MouseEvent('mousemove', moveProps));

        try {
            if (typeof PointerEvent === 'function') {
                el.dispatchEvent(new PointerEvent('pointerdown', downProps));
            }
        } catch (_) {}

        el.dispatchEvent(new MouseEvent('mousedown', downProps));

        try { if (typeof el.focus === 'function') el.focus({ preventScroll: true }); } catch (_) {}

        const finishAction = () => {
            const upProps = Object.assign({}, moveProps, { buttons: 0, button: 0 });
            try {
                if (typeof PointerEvent === 'function') {
                    el.dispatchEvent(new PointerEvent('pointerup', upProps));
                }
            } catch (_) {}

            el.dispatchEvent(new MouseEvent('mouseup', upProps));
            let isAuthorized = false;
            try {
                isAuthorized = sessionStorage.getItem('deluge_autocatch_active') === 'true';
            } catch (_) {}
            if (isAuthorized) window.__delugeAutoCatchAuthorizedClick = true;
            try { el.click(); } catch (_) {}
            window.__delugeAutoCatchAuthorizedClick = false;
            if (typeof callback === 'function') callback();
        };

        if (typeof callback === 'function') {
            const holdDelay = Math.floor(Math.random() * 60) + 65;
            setTimeout(finishAction, holdDelay);
        } else {
            finishAction();
        }
    } catch (_) {
        let isAuthorized = false;
        try {
            isAuthorized = sessionStorage.getItem('deluge_autocatch_active') === 'true';
        } catch (_) {}
        if (isAuthorized) window.__delugeAutoCatchAuthorizedClick = true;
        try { el.click(); } catch (_) {}
        window.__delugeAutoCatchAuthorizedClick = false;
        if (typeof callback === 'function') callback();
    }
}

function simulateMouseMovement(fromEl, toEl, callback) {
    if (!fromEl || !toEl) {
        if (typeof callback === 'function') callback();
        return;
    }
    try {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const startX = fromRect.left + fromRect.width / 2;
        const startY = fromRect.top + fromRect.height / 2;
        const endX = toRect.left + toRect.width * (0.3 + Math.random() * 0.4);
        const endY = toRect.top + toRect.height * (0.3 + Math.random() * 0.4);

        const steps = 4;
        let currentStep = 0;
        const moveInterval = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const jitterX = (Math.random() - 0.5) * 6;
            const jitterY = (Math.random() - 0.5) * 6;
            const curX = Math.floor(startX + (endX - startX) * progress + jitterX);
            const curY = Math.floor(startY + (endY - startY) * progress + jitterY);

            const mProps = {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: curX,
                clientY: curY,
                screenX: (window.screenX || 0) + curX,
                screenY: (window.screenY || 0) + curY,
                pageX: curX + (window.scrollX || 0),
                pageY: curY + (window.scrollY || 0),
                buttons: 0,
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true
            };

            try {
                if (typeof PointerEvent === 'function') {
                    window.dispatchEvent(new PointerEvent('pointermove', mProps));
                }
            } catch (_) {}
            window.dispatchEvent(new MouseEvent('mousemove', mProps));

            if (currentStep >= steps) {
                clearInterval(moveInterval);
                if (typeof callback === 'function') callback();
            }
        }, 30);
    } catch (_) {
        if (typeof callback === 'function') callback();
    }
}

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

        // 1A. Hardened Collection Ownership & Mega Evolution Uniqueness Awareness
        const ownStatus = evaluateOwnershipAndMegaEquivalence(checkText || rawText);
        if (ownStatus && ownStatus.isDuplicate) {
            if (shouldLog) console.log('[PokePreload] Duplicate check: OVERRIDE via collection awareness (' + ownStatus.alertTitle + ' -> ' + ownStatus.alertMessage + ')');
            return true;
        }

        // 1B. Explicit UNCAUGHT text
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
            'iframe[src*="hcaptcha" i], iframe[src*="arkose" i], .h-captcha, ' +
            '#captcha, .captcha, #recaptcha, .g-recaptcha, .cf-turnstile, [id*="captcha" i], [class*="captcha" i], img[src*="captcha" i]'
        );
        if (cEl) {
            const st = window.getComputedStyle(cEl);
            if (st.display !== 'none' && st.visibility !== 'hidden') return true;
        }
        const bodyText = (document.body ? document.body.innerText || '' : '').toLowerCase();
        if (bodyText.length > 0 && bodyText.length < 5000) {
            if (bodyText.includes('security check') ||
                bodyText.includes('verify you are human') ||
                bodyText.includes('prove you are human') ||
                bodyText.includes('enter the code below') ||
                bodyText.includes('robot verification')) {
                return true;
            }
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

        if (hasCaptcha) {
            clearAutoCatchSession();
            if (!unlockNoticeSent) {
                unlockNoticeSent = true;
                ipcRenderer.sendToHost('unlock-detected', { path: path, url: window.location.href });
            }
        }

        if (isMapPage) {
            try {
                sessionStorage.setItem('deluge_last_map_url', window.location.href);
            } catch (_) {}
            if (!hasCatchUI && !pendingCatchTimeoutId) {
                clearAutoCatchSession();
            }
        }

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

    // 2. STRICT PAGE GUARD: Only scan on map page (never on catch, team, box, or trade pages)
    const isHuntingPage = path.indexOf('/map') !== -1;
    if (!isHuntingPage) {
        return;
    }

    // Module-scoped helpers findCatchActionElement, getEncounterContainer, and isEncounterOrCatchUIPresent are used here.

    const hasCatchUI = isEncounterOrCatchUIPresent();

    if (!hasCatchUI) {
        lastFoundTarget = '';
        if (!pendingCatchTimeoutId && typeof clearAutoCatchSession === 'function') {
            clearAutoCatchSession();
        }
    } else if (typeof blurCatchButtonsOnMap === 'function') {
        blurCatchButtonsOnMap();
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

    const findAnyVariant = !!config.findAnySpecialVariant;
    const findMegas = !!config.findMegasAndGigantamax;
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

    // Helper: checks whole-species word boundary match after fast indexOf check
    function matchesSpeciesInText(text, speciesLower) {
        if (!text || !speciesLower) return false;
        if (text.indexOf(speciesLower) === -1) return false;
        const escaped = speciesLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp('(?:^|[^a-z0-9])' + escaped + '(?:$|[^a-z0-9])', 'i').test(text);
    }

    // A. Check Blacklist / Ignore list (Never halt on blacklisted species - HIGHEST PRIORITY)
    if (config.blacklistList && typeof config.blacklistList === 'string') {
        const blacklist = config.blacklistList.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        for (let b = 0; b < blacklist.length; b++) {
            if (blacklist[b] && matchesSpeciesInText(textLower, blacklist[b])) {
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
    // If not specified, allow normal and all special variants.
    const hasCustomSelectedVariants = Array.isArray(config.selectedVariants);
    const allowedVariants = hasCustomSelectedVariants
        ? config.selectedVariants.map(v => v.toLowerCase())
        : ['normal', ...VARIANTS.map(v => v.toLowerCase())];

    const hasCustomLegVariants = Array.isArray(config.legendaryVariants);
    const allowedLegVariants = hasCustomLegVariants
        ? config.legendaryVariants.map(v => v.toLowerCase())
        : allowedVariants;

    const hasCustomMegaVariants = Array.isArray(config.megaVariants);
    const allowedMegaVariants = hasCustomMegaVariants
        ? config.megaVariants.map(v => v.toLowerCase())
        : allowedVariants;

    const encounterSig = textLower.slice(0, 100);
    const isNewEncounter = (encounterSig !== lastEvaluatedEncounterSignature);
    const shortName = encounterBoxText ? encounterBoxText.trim().split('\n')[0].replace(/\s+/g, ' ') : textLower.slice(0, 50);

    if (isNewEncounter) {
        lastEvaluatedEncounterSignature = encounterSig;
        lastFoundTarget = '';
        if (typeof clearAutoCatchSession === 'function') clearAutoCatchSession();
        console.log('[TargetEngine] Encounter: "' + shortName + '" | Variant: ' + detectedVariant.toUpperCase() + (currentLevel !== null ? (' | Lv: ' + currentLevel) : ''));
    }

    const encContainer = getEncounterContainer();
    const ownStatus = (typeof evaluateOwnershipAndMegaEquivalence === 'function')
        ? evaluateOwnershipAndMegaEquivalence(encounterBoxText || pageText || shortName)
        : null;
    if (ownStatus && ownStatus.isDuplicate) {
        if (typeof renderUniquenessAlertBanner === 'function') renderUniquenessAlertBanner(ownStatus);
        if (isNewEncounter && typeof ipcRenderer !== 'undefined' && ipcRenderer && ipcRenderer.sendToHost) {
            ipcRenderer.sendToHost('duplicate-owned-alert', ownStatus);
        }
    } else {
        if (typeof removeUniquenessAlertBanner === 'function') removeUniquenessAlertBanner();
    }

    const isEncounterDuplicate = (ownStatus && ownStatus.isDuplicate) || checkEncounterIsDuplicate(encContainer, isNewEncounter);
    const avoidDupesActive = (config.avoidDuplicates !== false);

    if (avoidDupesActive && isEncounterDuplicate) {
        if (isNewEncounter) {
            console.log('[TargetEngine] DUPLICATE ENCOUNTER: "' + shortName + '" (' + (ownStatus && ownStatus.isDuplicate ? ownStatus.alertMessage : 'already owned in Dex') + '). Skipping to preserve hunting flow.');
        }
        return;
    }

    // Helper: checks whether the encounter's variant is accepted for Wild / Custom species (Tier 1 & Tier 4)
    function isVariantAcceptedForSpecies() {
        const isFilterActive = (config.enableVariantFilter !== false) && (config.findAnySpecialVariant !== false);
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
            if (targetName && matchesSpeciesInText(textLower, targetName)) {
                if (isVariantAcceptedForSpecies()) {
                    const foundName = 'Custom Target: ' + varPrefix + customTargets[c].toUpperCase() + lvlSuffix;
                    triggerTargetFound(foundName, 'Custom Target');
                    return;
                }
            }
        }
    }

    // 2. Tier 2: Legendaries, Mythicals, Ultra Beasts & Paradox
    // Priority Target: ALL wild Legendaries matching assigned tier variants MUST be halted for capture!
    if (findLegend) {
        const allowClassic = config.legendaryClassic !== false;
        const allowUB = config.legendaryUltraBeasts !== false;
        const allowParadox = config.legendaryParadox !== false;

        const boxCheckText = ((encounterBoxText || '') + ' ' + textLower).toLowerCase();

        // 2A. Category Header Banner: Ultra Beasts (e.g. ULTRABEAST)
        if (boxCheckText.indexOf('ultrabeast') !== -1 || /\bultra\s*beasts?\b/i.test(boxCheckText)) {
            if (!allowUB) {
                if (isNewEncounter) console.log('[TargetEngine] IGNORED: Ultra Beast skipped (Ultra Beasts sub-filter disabled)');
                return;
            }
            const spec = extractEncounterSpeciesName();
            if (spec) {
                if (isVariantAcceptedForLegendary()) {
                    const foundName = varPrefix + 'Ultra Beast: ' + spec.toUpperCase() + lvlSuffix;
                    triggerTargetFound(foundName, 'Ultra Beast');
                } else if (isNewEncounter) {
                    console.log('[TargetEngine] IGNORED: Ultra Beast ' + spec + ' skipped (' + detectedVariant.toUpperCase() + ' variant is not checked for Legendaries)');
                }
                return;
            }
        }

        // 2B. Category Header Banner: Paradox Pokemon (e.g. PARADOX POKEMON / PARADOX)
        if (boxCheckText.indexOf('paradox') !== -1 || /\bparadox\s*pok[e\u00e9]mon\b/i.test(boxCheckText)) {
            if (!allowParadox) {
                if (isNewEncounter) console.log('[TargetEngine] IGNORED: Paradox skipped (Paradox sub-filter disabled)');
                return;
            }
            const spec = extractEncounterSpeciesName();
            if (spec) {
                if (isVariantAcceptedForLegendary()) {
                    const foundName = varPrefix + 'Paradox: ' + spec.toUpperCase() + lvlSuffix;
                    triggerTargetFound(foundName, 'Paradox Pokemon');
                } else if (isNewEncounter) {
                    console.log('[TargetEngine] IGNORED: Paradox ' + spec + ' skipped (' + detectedVariant.toUpperCase() + ' variant is not checked for Legendaries)');
                }
                return;
            }
        }

        // 2C. Category Header Banner: Rare & Legendary Pokemon (e.g. LEGENDARY POKEMON / LEGENDARY)
        if (boxCheckText.indexOf('legendary') !== -1 || /\blegendary\s*pok[e\u00e9]mon\b/i.test(boxCheckText)) {
            if (!allowClassic) {
                if (isNewEncounter) console.log('[TargetEngine] IGNORED: Classic Legendary skipped (Classic sub-filter disabled)');
                return;
            }
            const spec = extractEncounterSpeciesName();
            if (spec) {
                if (isVariantAcceptedForLegendary()) {
                    const foundName = varPrefix + 'Legendary: ' + spec.toUpperCase() + lvlSuffix;
                    triggerTargetFound(foundName, 'Rare/Legendary');
                } else if (isNewEncounter) {
                    console.log('[TargetEngine] IGNORED: Legendary ' + spec + ' skipped (' + detectedVariant.toUpperCase() + ' variant is not checked for Legendaries)');
                }
                return;
            }
        }

        // 2D. Comprehensive Species List Fallback (137 Species across Gen 1-9)
        for (let k = 0; k < LEGENDARY_LOWER.length; k++) {
            const leg = LEGENDARY_LOWER[k];
            if (textLower.indexOf(leg) !== -1 && matchesSpeciesInText(textLower, leg)) {
                const isUB = ULTRA_BEASTS.indexOf(leg) !== -1;
                const isParadox = PARADOX.indexOf(leg) !== -1;
                if (isUB && !allowUB) {
                    if (isNewEncounter) console.log('[TargetEngine] IGNORED: Ultra Beast ' + TARGETS.legendaries[k] + ' skipped (Ultra Beasts sub-filter disabled)');
                    return;
                }
                if (isParadox && !allowParadox) {
                    if (isNewEncounter) console.log('[TargetEngine] IGNORED: Paradox ' + TARGETS.legendaries[k] + ' skipped (Paradox sub-filter disabled)');
                    return;
                }
                if (!isUB && !isParadox && !allowClassic) {
                    if (isNewEncounter) console.log('[TargetEngine] IGNORED: Classic Legendary ' + TARGETS.legendaries[k] + ' skipped (Classic sub-filter disabled)');
                    return;
                }

                if (isVariantAcceptedForLegendary()) {
                    const foundName = varPrefix + TARGETS.legendaries[k] + lvlSuffix;
                    triggerTargetFound(foundName, isParadox ? 'Paradox Pokemon' : (isUB ? 'Ultra Beast' : 'Rare/Legendary'));
                    return;
                } else if (isNewEncounter) {
                    console.log('[TargetEngine] IGNORED: ' + TARGETS.legendaries[k] + ' matched Legendary tier, but ' + detectedVariant.toUpperCase() + ' variant is not checked for Legendaries');
                }
                return;
            }
        }
    }

    // 3. Tier 3: Mega Evolutions & Rare Evolution Lines
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
        // A. Category Header Banner check: "MEGA EVOLUTION" or "MEGA POKEMON"
        if (hasMegaBanner) {
            const spec = extractEncounterSpeciesName();
            if (spec) {
                if (isVariantAcceptedForMega()) {
                    const foundName = varPrefix + 'Mega: ' + spec.toUpperCase() + lvlSuffix;
                    triggerTargetFound(foundName, 'Mega Evolution');
                } else if (isNewEncounter) {
                    console.log('[TargetEngine] IGNORED: Mega ' + spec + ' skipped (' + detectedVariant.toUpperCase() + ' variant is not checked for Mega tier)');
                }
                return;
            }
        }

        // B. Form prefix match (e.g. "Mega Charizard", "Gigantamax Pikachu", "Mega Mewtwo X")
        if (matchedExplicitForm) {
            if (isVariantAcceptedForMega()) {
                const foundName = varPrefix + matchedExplicitForm.form.toUpperCase() + ' ' + matchedExplicitForm.target + lvlSuffix;
                triggerTargetFound(foundName, 'Special Form');
            } else if (isNewEncounter) {
                console.log('[TargetEngine] IGNORED: ' + matchedExplicitForm.form.toUpperCase() + ' ' + matchedExplicitForm.target + ' skipped (' + detectedVariant.toUpperCase() + ' variant is not checked for Mega tier)');
            }
            return;
        }

        // C. Full evolutionary families capable of Mega Evolution (skip base Legendaries so Legendary tier governs them)
        for (let mg = 0; mg < MEGAS_LOWER.length; mg++) {
            const megaTarget = MEGAS_LOWER[mg];
            if (LEGENDARY_LOWER.indexOf(megaTarget) !== -1) continue;
            if (textLower.indexOf(megaTarget) !== -1 && matchesSpeciesInText(textLower, megaTarget)) {
                if (isVariantAcceptedForMega()) {
                    const foundName = varPrefix + 'Mega Line: ' + TARGETS.megas[mg] + lvlSuffix;
                    triggerTargetFound(foundName, 'Mega Evolution');
                    return;
                } else if (isNewEncounter) {
                    console.log('[TargetEngine] IGNORED: ' + TARGETS.megas[mg] + ' matched Mega tier, but ' + detectedVariant.toUpperCase() + ' variant is not checked for Mega tier');
                }
                return;
            }
        }
    } else if (hasMegaBanner || matchedExplicitForm) {
        if (isNewEncounter) {
            console.log('[TargetEngine] IGNORED: Explicit Mega/G-Max form skipped (Mega tier is disabled)');
        }
        return;
    }

    // 4. Tier 4: Special Sprite Variants (Generic Wild Pokemon)
    const isMegaFamilyOrForm = MEGAS_LOWER.some(m => textLower.indexOf(m) !== -1 && matchesSpeciesInText(textLower, m)) || !!matchedExplicitForm;
    const isLegendarySpecies = LEGENDARY_LOWER.some(l => textLower.indexOf(l) !== -1 && matchesSpeciesInText(textLower, l));

    // CRITICAL GUARD: If Megas are disabled (!findMegas), NEVER catch any Mega form or Mega line species!
    if (!findMegas) {
        const isMegaFamily = MEGAS_LOWER.some(m => textLower.indexOf(m) !== -1);
        const isMegaForm = !!matchedExplicitForm;
        if ((isMegaFamily && isMegaFamilyOrForm) || isMegaForm) {
            const isLegendary = LEGENDARY_LOWER.some(l => textLower.indexOf(l) !== -1);
            if (!isLegendary || !findLegend) {
                if (isNewEncounter) {
                    console.log('[TargetEngine] IGNORED: Mega encounter skipped (Megas hunting is disabled in target filters)');
                }
                return;
            }
        }
    } else if (isMegaFamilyOrForm && !isLegendarySpecies && !isVariantAcceptedForMega()) {
        if (isNewEncounter) {
            console.log('[TargetEngine] IGNORED: Mega encounter skipped (' + detectedVariant.toUpperCase() + ' variant is not checked for Mega tier)');
        }
        return;
    }

    // CRITICAL GUARD: If Legendaries are disabled (!findLegend), NEVER catch any Legendary in Tier 4!
    if (!findLegend) {
        const isLegendary = LEGENDARY_LOWER.some(l => textLower.indexOf(l) !== -1);
        if (isLegendary && isLegendarySpecies) {
            if (isNewEncounter) {
                console.log('[TargetEngine] IGNORED: Legendary encounter skipped (Legendaries hunting is disabled in target filters)');
            }
            return;
        }
    } else if (isLegendarySpecies && !isVariantAcceptedForLegendary()) {
        if (isNewEncounter) {
            console.log('[TargetEngine] IGNORED: Legendary encounter skipped (' + detectedVariant.toUpperCase() + ' variant is not checked for Legendary tier)');
        }
        return;
    }

    // Generic wild common Pokemon (e.g. Swablu, Rattata, Bidoof) are caught if:
    // - findAnySpecialVariant is enabled and the variant is in allowedVariants
    // - If preset is 'shinies', only Shiny encounters are allowed
    // - When Wild / Custom Species Variants is unchecked (!findAnyVariant) or a species-only preset is active, generic wild Pokemon are skipped
    const isSpeciesOnlyPreset = !findAnyVariant ||
        (config.targetPreset === 'legendaries' || config.targetPreset === 'megas' || config.targetPreset === 'legend_megas');

    let allowGenericVariants = false;
    if (findAnyVariant && !isSpeciesOnlyPreset) {
        if (config.targetPreset === 'shinies') {
            allowGenericVariants = (detectedVariant === 'shiny');
        } else {
            allowGenericVariants = true;
        }
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
    } else if (isNewEncounter && detectedVariant !== 'normal' && !allowGenericVariants) {
        console.log('[TargetEngine] IGNORED: Wild ' + detectedVariant.toUpperCase() + ' encounter skipped (' + (isSpeciesOnlyPreset ? 'Species-only preset active' : 'Special Variant hunting disabled') + ')');
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

    if (typeof pendingCatchTimeoutId !== 'undefined' && !pendingCatchTimeoutId && typeof clearAutoCatchSession === 'function') {
        clearAutoCatchSession();
    }
}

// --- 4. TARGET FOUND HANDLER ---
function triggerTargetFound(targetName, category) {
    const currentPath = (window.location.pathname || '').toLowerCase();
    if (currentPath.indexOf('/map') === -1) return;
    if (!isHuntingActive) return;
    if (targetName === lastFoundTarget) return;

    const encContainer = getEncounterContainer();
    const ownCheck = (typeof evaluateOwnershipAndMegaEquivalence === 'function')
        ? evaluateOwnershipAndMegaEquivalence(targetName)
        : null;
    const isDupe = (ownCheck && ownCheck.isDuplicate) || checkEncounterIsDuplicate(encContainer, false);
    if (config.avoidDuplicates !== false && isDupe) {
        console.log('[PokePreload] Duplicate target detected during trigger: ' + targetName + ' (' + (ownCheck && ownCheck.isDuplicate ? ownCheck.alertMessage : 'duplicate') + ') - skipping.');
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

    if (config.autoCatchMasterBall && config.hideAdsCosmetically !== false) {
        try {
            sessionStorage.setItem('deluge_autocatch_active', 'true');
            sessionStorage.setItem('deluge_autocatch_target', targetName);
            sessionStorage.removeItem('deluge_autocatch_thrown');

            let spriteUrl = '';
            const encBox = encContainer || getEncounterContainer();
            const spriteImg = (encBox ? encBox.querySelector('img[src*="/pokemon/"], img[src*="/sprites/"], img[src*="/dex/"], img[src*="/regular/"], img[src*="/shiny/"], img[src*="/retro/"], img[src*="/chrome/"], img[src*="/metallic/"], img[src*="/shadow/"], img[src*="/ghostly/"], img[src*="/dark/"], img[src*="/mirage/"], img[src*="/negative/"], img[src*="delugerpg"]') : null) ||
                document.querySelector('#showpoke img, .showpoke img, #dexy img, .dexy img, img[src*="/sprites/"], img[src*="/pokemon/"]');
            if (spriteImg && spriteImg.src) {
                spriteUrl = spriteImg.src;
            }

            let variant = 'Normal';
            const tLower = targetName.toLowerCase();
            if (tLower.indexOf('shiny') !== -1) variant = 'Shiny';
            else if (tLower.indexOf('retro') !== -1) variant = 'Retro';
            else if (tLower.indexOf('chrome') !== -1) variant = 'Chrome';
            else if (tLower.indexOf('metallic') !== -1) variant = 'Metallic';
            else if (tLower.indexOf('shadow') !== -1) variant = 'Shadow';
            else if (tLower.indexOf('ghostly') !== -1) variant = 'Ghostly';
            else if (tLower.indexOf('dark') !== -1) variant = 'Dark';
            else if (tLower.indexOf('mirage') !== -1) variant = 'Mirage';
            else if (tLower.indexOf('negative') !== -1) variant = 'Negative';

            const lvlMatch = targetName.match(/\(Lv\s*(\d+)/i) || (encBox ? (encBox.innerText || '').match(/Lv[.:\s]*(\d+)/i) : null);
            const level = lvlMatch ? lvlMatch[1] : '?';

            let cleanName = targetName.replace(/\s*\(Lv\s*\d+\+?\)\s*/i, '').replace(/^(Wild Encounter|Mega Line:|Ultra Beast:|Paradox:)\s*/i, '').trim();

            const detailsObj = {
                name: cleanName || targetName,
                fullName: targetName,
                variant: variant,
                level: level,
                sprite: spriteUrl,
                category: category || 'Wild Encounter',
                ball: 'Master Ball',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            sessionStorage.setItem('deluge_autocatch_details', JSON.stringify(detailsObj));
        } catch (_) {}

        const catchDelay = getRandomCatchDelay(1000, 10000);
        ipcRenderer.sendToHost('autocatch-status', {
            step: 'clicking-try-catch',
            target: targetName,
            delay: catchDelay
        });

        if (pendingCatchTimeoutId) {
            clearTimeout(pendingCatchTimeoutId);
            pendingCatchTimeoutId = null;
        }

        pendingCatchTimeoutId = setTimeout(() => {
            pendingCatchTimeoutId = null;
            if ((window.location.pathname || '').toLowerCase().indexOf('/map') === -1) {
                clearAutoCatchSession('No longer on map page');
                return;
            }
            let active = false;
            try {
                active = sessionStorage.getItem('deluge_autocatch_active') === 'true';
            } catch (_) {}
            if (!active) {
                console.log('[PokePreload] Auto-catch Try to Catch cancelled: deluge_autocatch_active cleared');
                return;
            }
            if (!config.autoCatchMasterBall || config.hideAdsCosmetically === false) {
                console.log('[PokePreload] Auto-catch Try to Catch cancelled: autoCatchMasterBall is disabled');
                clearAutoCatchSession('autoCatchMasterBall disabled');
                return;
            }
            const catchBtn = findCatchActionElement();
            if (catchBtn) {
                dispatchHumanClick(catchBtn);
            }
        }, catchDelay);
    }
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
// Manual Keyboard Navigation Hook: Notify host when user navigates manually to prevent step conflicts
window.addEventListener('keydown', (e) => {
    if (isGuestInputField(e.target)) return;
    const moveKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Up', 'Down', 'Left', 'Right'];
    const isMoveKey = moveKeys.includes(e.code) || moveKeys.includes(e.key);
    if (!isMoveKey) return;

    if (lastFoundTarget && isEncounterOrCatchUIPresent()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
    }

    if (isHuntingActive) {
        const moveKeyMap = {
            'ArrowUp': 'Up', 'KeyW': 'Up', 'Up': 'Up',
            'ArrowDown': 'Down', 'KeyS': 'Down', 'Down': 'Down',
            'ArrowLeft': 'Left', 'KeyA': 'Left', 'Left': 'Left',
            'ArrowRight': 'Right', 'KeyD': 'Right', 'Right': 'Right'
        };
        const dir = moveKeyMap[e.code] || moveKeyMap[e.key] || 'Manual';
        ipcRenderer.sendToHost('manual-step', { direction: dir });
    }
}, true);

// Manual D-pad Click Hook: If user physically clicks directional buttons on screen
window.addEventListener('pointerdown', (e) => {
    if (!e.isTrusted) return;
    const btn = e.target && e.target.closest ? e.target.closest('#dr-n, #dr-s, #dr-w, #dr-e, #dr-nw, #dr-ne, #dr-sw, #dr-se') : null;
    if (btn && isHuntingActive) {
        const idToDir = {
            'dr-n': 'Up', 'dr-s': 'Down', 'dr-w': 'Left', 'dr-e': 'Right',
            'dr-nw': 'Up-Left', 'dr-ne': 'Up-Right', 'dr-sw': 'Down-Left', 'dr-se': 'Down-Right'
        };
        const dir = (btn.id && idToDir[btn.id]) || 'Manual';
        ipcRenderer.sendToHost('manual-step', { direction: dir });
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
            dispatchHumanClick(btn, () => {});
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

let lastTrustedPointerOnCatchBtnTs = 0;

function isMapCatchElement(el) {
    if (!el || !el.closest) return false;
    const match = el.closest(
        'input[type="submit"]#catch, input#catch, button#catch, a#catch, ' +
        'input[name*="catch" i], button[name*="catch" i], ' +
        'input[type="submit"][value*="Catch" i], button[value*="Catch" i], ' +
        'form[action*="catch"] input[type="submit"], form[action*="catch"] button, ' +
        'form[action*="catch"] a, a[href*="/catch"]'
    );
    return !!match;
}

function blurCatchButtonsOnMap() {
    try {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/map') === -1) return;
        const activeEl = document.activeElement;
        if (activeEl && isMapCatchElement(activeEl) && !window.__delugeAutoCatchAuthorizedClick) {
            activeEl.blur();
        }
    } catch (_) {}
}

window.addEventListener('focusin', (e) => {
    try {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/map') !== -1 && isMapCatchElement(e.target) && !window.__delugeAutoCatchAuthorizedClick) {
            e.target.blur();
        }
    } catch (_) {}
}, true);

window.addEventListener('pointerdown', (e) => {
    if (e.isTrusted && isMapCatchElement(e.target)) {
        lastTrustedPointerOnCatchBtnTs = Date.now();
    }
}, true);

window.addEventListener('mousedown', (e) => {
    if (e.isTrusted && isMapCatchElement(e.target)) {
        lastTrustedPointerOnCatchBtnTs = Date.now();
    }
}, true);

window.addEventListener('click', (e) => {
    try {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/map') === -1) return;
        if (!isMapCatchElement(e.target)) return;

        let isAuthorizedAutoCatch = false;
        try {
            isAuthorizedAutoCatch = !!(window.__delugeAutoCatchAuthorizedClick && sessionStorage.getItem('deluge_autocatch_active') === 'true');
        } catch (_) {}
        const isTrustedMouseClick = !!(e.isTrusted && (e.detail > 0 || (Date.now() - lastTrustedPointerOnCatchBtnTs < 1500)));

        if (!isAuthorizedAutoCatch && !isTrustedMouseClick) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('[PokePreload] Blocked unauthorized non-mouse trigger on Try to Catch It');
        }
    } catch (_) {}
}, true);

window.addEventListener('submit', (e) => {
    try {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/map') === -1) return;
        const form = e.target;
        const action = (form && form.getAttribute ? (form.getAttribute('action') || form.action || '') : '').toLowerCase();
        if (action.indexOf('catch') === -1) return;

        let isAuthorizedAutoCatch = false;
        try {
            isAuthorizedAutoCatch = !!(window.__delugeAutoCatchAuthorizedClick && sessionStorage.getItem('deluge_autocatch_active') === 'true');
        } catch (_) {}
        const isTrustedMouseSubmit = (Date.now() - lastTrustedPointerOnCatchBtnTs < 1500);

        if (!isAuthorizedAutoCatch && !isTrustedMouseSubmit) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('[PokePreload] Blocked unauthorized form submit to /catch');
        }
    } catch (_) {}
}, true);

// Guest Context Spacebar Toggle & F8 Snapshot Handlers
window.addEventListener('keydown', (e) => {
    if (e.key === 'F8') {
        e.preventDefault();
        captureCurrentDom('manual-F8');
        return;
    }
    if (e.code === 'Space' || e.key === ' ' || e.key === 'F2') {
        const activeEl = document.activeElement;
        if (!isGuestInputField(activeEl)) {
            if (activeEl && activeEl !== document.body) {
                try { activeEl.blur(); } catch (_) {}
            }
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (!e.repeat) {
                ipcRenderer.sendToHost('toggle-hunting-hotkey');
            }
        }
    }
}, true);

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'F2') {
        const activeEl = document.activeElement;
        if (!isGuestInputField(activeEl)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }
}, true);

window.addEventListener('keypress', (e) => {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'F2') {
        const activeEl = document.activeElement;
        if (!isGuestInputField(activeEl)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }
}, true);

// --- UNIVERSAL DOM CAPTURER / RECORDER ---
let lastCapturedUrl = '';
let lastCapturedHtmlLength = 0;
let domCaptureDebounceTimer = null;

function captureCurrentDom(triggerReason) {
    try {
        if (triggerReason !== 'manual-F8') return;
        if (!document || !document.documentElement) return;
        const currentUrl = window.location.href || '';
        const currentPath = (window.location.pathname || '').toLowerCase();
        const currentSearch = window.location.search || '';
        const html = document.documentElement.outerHTML || '';

        if (!html || html.length < 50) return;

        lastCapturedUrl = currentUrl;
        lastCapturedHtmlLength = html.length;

        ipcRenderer.sendToHost('capture-dom-dump', {
            url: currentUrl,
            pathname: window.location.pathname || '/',
            search: currentSearch,
            title: document.title || '',
            html: html,
            reason: triggerReason || 'manual-F8',
            timestamp: Date.now()
        });
    } catch (err) {
        console.error('[PokePreload] Capture error:', err);
    }
}

function scheduleDomCapture(reason, delayMs) {
    const delay = (typeof delayMs === 'number') ? delayMs : 1200;
    if (domCaptureDebounceTimer) {
        clearTimeout(domCaptureDebounceTimer);
    }
    domCaptureDebounceTimer = setTimeout(() => {
        captureCurrentDom(reason);
    }, delay);
}

// Hook SPA navigation (pushState, replaceState)
try {
    const _origPushState = history.pushState;
    history.pushState = function() {
        const ret = _origPushState.apply(this, arguments);
        scheduleDomCapture('pushState', 1200);
        return ret;
    };
    const _origReplaceState = history.replaceState;
    history.replaceState = function() {
        const ret = _origReplaceState.apply(this, arguments);
        scheduleDomCapture('replaceState', 1200);
        return ret;
    };
} catch (_) {}

// Hook user interactions (clicking tabs, pagination, buttons, links, dropdowns)
document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && (t.closest('a') || t.closest('button') || t.closest('input[type="submit"]') || t.closest('.pagination') || t.closest('[data-page]') || t.closest('[onclick]'))) {
        scheduleDomCapture('click-interaction', 1500);
    }
}, true);

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    console.log('[PokePreload] DOMContentLoaded on ' + window.location.pathname);
    applyCosmeticAdHiding();
    checkAndSyncMapPresence();
    const path = (window.location.pathname || '').toLowerCase();
    scheduleDomCapture(path.indexOf('/map') !== -1 ? 'initial-map' : 'DOMContentLoaded', 1200);
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

window.addEventListener('load', () => {
    scheduleDomCapture('page-load', 1500);
});

// High-frequency polling (300ms) for instant responsiveness
setInterval(() => {
    syncNavStatusToHost();
    checkAndSyncMapPresence();
    scanForTargets();
    if (config.hideAdsCosmetically !== false) {
        vaccinateLinksAgainstVignettes();
        dismissGoogleVignetteOverlay();
    }
}, 300);

window.addEventListener('popstate', () => {
    checkAndSyncMapPresence();
    scheduleDomCapture('popstate', 1200);
});
window.addEventListener('hashchange', () => {
    checkAndSyncMapPresence();
    scheduleDomCapture('hashchange', 1200);
});

function isGuestInputField(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA' || !!el.isContentEditable) return true;
    if (tag === 'INPUT') {
        const type = (el.type || 'text').toLowerCase();
        const nonTextTypes = ['checkbox', 'radio', 'button', 'submit', 'reset', 'hidden', 'image', 'range', 'color'];
        return !nonTextTypes.includes(type);
    }
    return false;
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
    } else {
        ipcRenderer.sendToHost('guest-input-focused', false);
    }
}, true);

window.addEventListener('focusout', (e) => {
    if (isGuestInputField(e.target)) {
        ipcRenderer.sendToHost('guest-input-focused', false);
    }
}, true);

window.addEventListener('pagehide', () => {
    ipcRenderer.sendToHost('guest-input-focused', false);
}, true);

window.addEventListener('beforeunload', () => {
    ipcRenderer.sendToHost('guest-input-focused', false);
}, true);

// Notify host that preload is active and ready (and clear any stale input focus lock from previous page)
console.log('[PokePreload] Initialized successfully in guest context');
ipcRenderer.sendToHost('guest-input-focused', false);
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

ipcRenderer.on('guest-zoom-update', (event, factor) => {
    try {
        const { webFrame } = require('electron');
        if (webFrame && typeof webFrame.setZoomFactor === 'function' && typeof factor === 'number') {
            webFrame.setZoomFactor(factor);
        }
    } catch (_) {}
});

// --- LIVE BALL INVENTORY & AUTO-CATCH METRICS ---
let lastScrapedMasterBall = null;

function scrapeBallInventory() {
    const inventory = {
        masterBall: null,
        ultraBall: null,
        greatBall: null,
        pokeBall: null,
        rawSummary: ''
    };

    // 1. Check battle screen ball radio buttons and labels
    const ballRadios = Array.from(document.querySelectorAll('input[type="radio"], input[type="submit"], button, label'));
    for (let i = 0; i < ballRadios.length; i++) {
        const el = ballRadios[i];
        let text = (el.textContent || el.innerText || el.value || '').trim();
        if (!text && el.id) {
            const lbl = document.querySelector('label[for="' + el.id + '"]');
            if (lbl) text = lbl.textContent || '';
        }
        if (!text) continue;

        if (/master\s*ball/i.test(text)) {
            const m = text.match(/master\s*ball[^\d(]*\((\d+)\)/i) || text.match(/master\s*ball[^\d\n]*[:x\s]+(\d+)/i) || text.match(/\((\d+)\)/);
            if (m && inventory.masterBall === null) inventory.masterBall = parseInt(m[1], 10);
        }
        if (/ultra\s*ball/i.test(text)) {
            const m = text.match(/ultra\s*ball[^\d(]*\((\d+)\)/i) || text.match(/ultra\s*ball[^\d\n]*[:x\s]+(\d+)/i);
            if (m && inventory.ultraBall === null) inventory.ultraBall = parseInt(m[1], 10);
        }
        if (/great\s*ball/i.test(text)) {
            const m = text.match(/great\s*ball[^\d(]*\((\d+)\)/i) || text.match(/great\s*ball[^\d\n]*[:x\s]+(\d+)/i);
            if (m && inventory.greatBall === null) inventory.greatBall = parseInt(m[1], 10);
        }
        if (/poke\s*ball/i.test(text) && !/master|ultra|great/i.test(text)) {
            const m = text.match(/poke\s*ball[^\d(]*\((\d+)\)/i) || text.match(/(?:^|\W)pokeballs?[^\d\n]*[:x\s]+(\d+)/i);
            if (m && inventory.pokeBall === null) inventory.pokeBall = parseInt(m[1], 10);
        }
    }

    // 2. Check map/bag user container (e.g. #userpokeballs, .userpokeballs, .bag, #inventory)
    const container = document.getElementById('userpokeballs') ||
                      document.querySelector('.userpokeballs') ||
                      document.getElementById('inventory') ||
                      document.querySelector('.bag');
    const containerText = container ? (container.innerText || container.textContent || '') : (document.body ? document.body.innerText || '' : '');

    if (containerText) {
        if (inventory.masterBall === null) {
            const m = containerText.match(/master\s*ball[^\d\n]*[:x\s]+(\d+)/i) || containerText.match(/master\s*ball[^\d(]*\((\d+)\)/i);
            if (m) inventory.masterBall = parseInt(m[1], 10);
        }
        if (inventory.ultraBall === null) {
            const m = containerText.match(/ultra\s*ball[^\d\n]*[:x\s]+(\d+)/i) || containerText.match(/ultra\s*ball[^\d(]*\((\d+)\)/i);
            if (m) inventory.ultraBall = parseInt(m[1], 10);
        }
        if (inventory.greatBall === null) {
            const m = containerText.match(/great\s*ball[^\d\n]*[:x\s]+(\d+)/i) || containerText.match(/great\s*ball[^\d(]*\((\d+)\)/i);
            if (m) inventory.greatBall = parseInt(m[1], 10);
        }
        if (inventory.pokeBall === null) {
            const m = containerText.match(/(?:^|\W)pokeballs?[^\d\n]*[:x\s]+(\d+)/i) || containerText.match(/poke\s*ball[^\d(]*\((\d+)\)/i);
            if (m) inventory.pokeBall = parseInt(m[1], 10);
        }
    }

    const parts = [];
    if (inventory.pokeBall !== null) parts.push('Poke: ' + inventory.pokeBall);
    if (inventory.greatBall !== null) parts.push('Great: ' + inventory.greatBall);
    if (inventory.ultraBall !== null) parts.push('Ultra: ' + inventory.ultraBall);
    if (inventory.masterBall !== null) parts.push('Master: ' + inventory.masterBall);
    inventory.rawSummary = parts.join(' | ');

    return inventory;
}

function checkAndSyncBallInventory(force = false) {
    try {
        const inv = scrapeBallInventory();
        const hasData = inv.masterBall !== null || inv.ultraBall !== null || inv.greatBall !== null || inv.pokeBall !== null;
        if (hasData || force) {
            if (force || inv.masterBall !== lastScrapedMasterBall) {
                lastScrapedMasterBall = inv.masterBall;
                ipcRenderer.sendToHost('ball-inventory-update', inv);
            }
        }
    } catch (_) {}
}

// --- AUTO-CATCH (MASTER BALL) LIFECYCLE ENGINE ---
let autoCatchStepInProgress = false;

function extractWildPokemonFromCatchPage() {
    try {
        const path = window.location.pathname || '';
        const urlMatch = path.match(/\/catch\/([^\/]+)/i);
        if (urlMatch && urlMatch[1]) {
            const decoded = decodeURIComponent(urlMatch[1]).replace(/\+/g, ' ').trim();
            if (decoded && decoded.toLowerCase() !== 'catch') {
                return decoded;
            }
        }
        const oppEl = document.getElementById('opponent') || document.querySelector('.opponent');
        if (oppEl) {
            return (oppEl.innerText || oppEl.textContent || '').trim();
        }
    } catch (_) {}
    return '';
}

function runAutoCatchLifecycle() {
    let isCatchActive = false;
    try {
        isCatchActive = sessionStorage.getItem('deluge_autocatch_active') === 'true';
    } catch (_) {}

    // Uniqueness Safety Gate: If target or on-screen encounter is owned / Mega-owned, abort auto-catch!
    if (window.location.pathname.includes('/catch/')) {
        const catchTargetName = extractWildPokemonFromCatchPage();
        const ownCatchCheck = catchTargetName ? evaluateOwnershipAndMegaEquivalence(catchTargetName) : null;
        if (ownCatchCheck && ownCatchCheck.isDuplicate) {
            clearAutoCatchSession('Uniqueness protection: ' + ownCatchCheck.alertMessage);
            renderUniquenessAlertBanner(ownCatchCheck);
            ipcRenderer.sendToHost('duplicate-owned-alert', ownCatchCheck);
            return;
        }
    }

    if (!isCatchActive) return;

    // Strict safety constraint: Hide Ads must be active
    if (config.hideAdsCosmetically === false) {
        try { sessionStorage.removeItem('deluge_autocatch_active'); } catch (_) {}
        return;
    }

    if (autoCatchStepInProgress) return;

    // A. Check for Screen 4: Post-Catch Outcome ("Return to Map")
    let ballWasThrown = false;
    try {
        ballWasThrown = sessionStorage.getItem('deluge_autocatch_thrown') === 'true';
    } catch (_) {}

    const allLinksAndButtons = Array.from(document.querySelectorAll('a, input[type="submit"], input[type="button"], button'));
    const returnBtn = allLinksAndButtons.find(el => {
        const text = ((el.textContent || '') + ' ' + (el.value || '')).trim().toLowerCase();
        return text === 'return to map' || text.indexOf('return to map') !== -1;
    });

    const bodyText = (document.body ? document.body.textContent || '' : '').toLowerCase();
    const isCatchConfirmed = bodyText.indexOf('was caught') !== -1 ||
                             bodyText.indexOf('was captured') !== -1 ||
                             bodyText.indexOf('sent to your box') !== -1 ||
                             bodyText.indexOf('you threw a') !== -1;

    if (returnBtn && (ballWasThrown || isCatchConfirmed)) {
        autoCatchStepInProgress = true;
        let targetName = 'Target Pokemon';
        let remainingStock = null;
        let caughtData = null;
        try {
            targetName = sessionStorage.getItem('deluge_autocatch_target') || 'Target Pokemon';
            const rawStock = sessionStorage.getItem('deluge_autocatch_stock');
            if (rawStock !== null) {
                const s = parseInt(rawStock, 10);
                if (!isNaN(s) && s > 0) remainingStock = s - 1;
            }
            const rawDetails = sessionStorage.getItem('deluge_autocatch_details');
            if (rawDetails) {
                try {
                    caughtData = JSON.parse(rawDetails);
                } catch (_) {}
            }
        } catch (_) {}

        if (!caughtData) {
            caughtData = {
                name: targetName,
                fullName: targetName,
                variant: 'Normal',
                level: '?',
                sprite: '',
                category: 'Wild Encounter',
                ball: 'Master Ball',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
        }
        if (remainingStock !== null) {
            lastScrapedMasterBall = remainingStock;
        }

        const returnDelay = getRandomCatchDelay(1000, 10000);
        ipcRenderer.sendToHost('autocatch-status', {
            step: 'returning-to-map',
            target: targetName,
            delay: returnDelay
        });

        if (pendingLifecycleTimeoutId) {
            clearTimeout(pendingLifecycleTimeoutId);
            pendingLifecycleTimeoutId = null;
        }

        pendingLifecycleTimeoutId = setTimeout(() => {
            pendingLifecycleTimeoutId = null;
            let active = false;
            try { active = sessionStorage.getItem('deluge_autocatch_active') === 'true'; } catch (_) {}
            if (!active) {
                autoCatchStepInProgress = false;
                return;
            }
            try {
                sessionStorage.removeItem('deluge_autocatch_active');
                sessionStorage.removeItem('deluge_autocatch_thrown');
                sessionStorage.removeItem('deluge_autocatch_target');
                sessionStorage.removeItem('deluge_autocatch_stock');
                sessionStorage.removeItem('deluge_autocatch_details');
            } catch (_) {}
            ipcRenderer.sendToHost('autocatch-status', {
                step: 'completed',
                target: targetName,
                stockRemaining: remainingStock,
                pokemon: caughtData
            });
            dispatchHumanClick(returnBtn, () => {
                autoCatchStepInProgress = false;
            });
        }, returnDelay);
        return;
    }

    // B. Check for Screen 2: Battle Preparation ("Start Battle")
    let startBattleBtn = document.querySelector('input[type="submit"][value*="Start Battle" i], input[value*="Start Battle" i], button[value*="Start Battle" i]');
    if (!startBattleBtn) {
        for (let i = 0; i < allLinksAndButtons.length; i++) {
            const c = allLinksAndButtons[i];
            const cTxt = ((c.value || '') + ' ' + (c.textContent || '')).trim().toLowerCase();
            if (cTxt.indexOf('start battle') !== -1) {
                startBattleBtn = c;
                break;
            }
        }
    }

    if (startBattleBtn) {
        try {
            const st = window.getComputedStyle(startBattleBtn);
            if (st.display !== 'none' && st.visibility !== 'hidden') {
                autoCatchStepInProgress = true;
                const startDelay = getRandomCatchDelay(1000, 10000);
                ipcRenderer.sendToHost('autocatch-status', {
                    step: 'starting-battle',
                    delay: startDelay
                });
                if (pendingLifecycleTimeoutId) {
                    clearTimeout(pendingLifecycleTimeoutId);
                    pendingLifecycleTimeoutId = null;
                }
                pendingLifecycleTimeoutId = setTimeout(() => {
                    pendingLifecycleTimeoutId = null;
                    let active = false;
                    try { active = sessionStorage.getItem('deluge_autocatch_active') === 'true'; } catch (_) {}
                    if (!active) {
                        autoCatchStepInProgress = false;
                        return;
                    }
                    dispatchHumanClick(startBattleBtn, () => {
                        autoCatchStepInProgress = false;
                    });
                }, startDelay);
                return;
            }
        } catch (_) {}
    }

    // C. Check for Screen 3: Battle Screen (Master Ball Selection & Throw)
    let throwBtn = null;
    const submitButtons = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button'));
    for (let b = 0; b < submitButtons.length; b++) {
        const btn = submitButtons[b];
        const btnText = ((btn.value || '') + ' ' + (btn.textContent || '')).trim().toLowerCase();
        if (btnText.indexOf('throw') !== -1 && (btnText.indexOf('ball') !== -1 || btnText.indexOf('master') !== -1)) {
            throwBtn = btn;
            break;
        }
    }
    if (!throwBtn) {
        for (let b = 0; b < submitButtons.length; b++) {
            const btn = submitButtons[b];
            const btnText = ((btn.value || '') + ' ' + (btn.textContent || '')).trim().toLowerCase();
            if (btnText.indexOf('throw') !== -1) {
                throwBtn = btn;
                break;
            }
        }
    }

    const formScope = throwBtn ? (throwBtn.form || throwBtn.closest('form')) : null;
    const radioPool = formScope ? Array.from(formScope.querySelectorAll('input[type="radio"]')) : Array.from(document.querySelectorAll('input[type="radio"]'));

    if (throwBtn && radioPool.length > 0) {
        let masterRadio = null;
        let isMasterUnavailable = false;
        let masterStock = null;

        for (let rIdx = 0; rIdx < radioPool.length; rIdx++) {
            const r = radioPool[rIdx];
            let desc = (r.value || '') + ' ' + (r.id || '') + ' ' + (r.name || '') + ' ';
            if (r.parentElement) desc += ' ' + r.parentElement.textContent;
            if (r.labels && r.labels.length) {
                for (let l = 0; l < r.labels.length; l++) desc += ' ' + r.labels[l].textContent;
            }
            if (r.id) {
                const forLabel = document.querySelector('label[for="' + r.id + '"]');
                if (forLabel) desc += ' ' + forLabel.textContent;
            }
            const dLower = desc.toLowerCase();
            if (dLower.indexOf('master') !== -1 || (r.value && r.value.toLowerCase().indexOf('master') !== -1)) {
                masterRadio = r;
                const stockMatch = desc.match(/master\s*ball[^\d(]*\((\d+)\)/i) || desc.match(/\((\d+)\)/);
                if (stockMatch) {
                    masterStock = parseInt(stockMatch[1], 10);
                }
                if (r.disabled || dLower.indexOf('(0)') !== -1 || masterStock === 0) {
                    isMasterUnavailable = true;
                }
                const parent = r.parentElement;
                if (parent && (parent.querySelector('strike, del, s') || (parent.style && parent.style.textDecoration && parent.style.textDecoration.indexOf('line-through') !== -1))) {
                    isMasterUnavailable = true;
                }
                break;
            }
        }

        if (!masterRadio || isMasterUnavailable) {
            autoCatchStepInProgress = true;
            try {
                sessionStorage.removeItem('deluge_autocatch_active');
                sessionStorage.setItem('deluge_autocatch_out_of_stock', 'true');
            } catch (_) {}
            const outOfStockDelay = getRandomCatchDelay(5000, 15000);
            ipcRenderer.sendToHost('autocatch-status', {
                step: 'out-of-stock',
                delay: outOfStockDelay
            });
            console.warn('[AutoCatch] Master Ball out of stock or unavailable! Redirecting directly to previous map in ' + outOfStockDelay + 'ms.');

            setTimeout(() => {
                let returnUrl = '/map';
                try {
                    returnUrl = sessionStorage.getItem('deluge_last_map_url') || '/map';
                } catch (_) {}

                window.location.href = returnUrl;
                autoCatchStepInProgress = false;
            }, outOfStockDelay);
            return;
        }

        autoCatchStepInProgress = true;
        if (typeof masterStock === 'number') {
            try { sessionStorage.setItem('deluge_autocatch_stock', String(masterStock)); } catch (_) {}
            lastScrapedMasterBall = masterStock;
            checkAndSyncBallInventory(false);
        }

        if (!masterRadio.checked) {
            const selectDelay = getRandomCatchDelay(1000, 10000);
            ipcRenderer.sendToHost('autocatch-status', {
                step: 'selecting-master-ball',
                delay: selectDelay,
                stock: masterStock
            });

            if (pendingLifecycleTimeoutId) {
                clearTimeout(pendingLifecycleTimeoutId);
                pendingLifecycleTimeoutId = null;
            }

            pendingLifecycleTimeoutId = setTimeout(() => {
                pendingLifecycleTimeoutId = null;
                let active = false;
                try { active = sessionStorage.getItem('deluge_autocatch_active') === 'true'; } catch (_) {}
                if (!active) {
                    autoCatchStepInProgress = false;
                    return;
                }
                const targetEl = (masterRadio.id ? document.querySelector('label[for="' + masterRadio.id + '"]') : null) || masterRadio.closest('label') || masterRadio;
                dispatchHumanClick(targetEl, () => {
                    masterRadio.checked = true;
                    masterRadio.dispatchEvent(new Event('input', { bubbles: true }));
                    masterRadio.dispatchEvent(new Event('change', { bubbles: true }));

                    const throwDelay = getRandomCatchDelay(1000, 10000);
                    ipcRenderer.sendToHost('autocatch-status', {
                        step: 'throwing-master-ball',
                        delay: throwDelay,
                        stock: masterStock
                    });

                    if (pendingLifecycleTimeoutId) {
                        clearTimeout(pendingLifecycleTimeoutId);
                        pendingLifecycleTimeoutId = null;
                    }

                    pendingLifecycleTimeoutId = setTimeout(() => {
                        pendingLifecycleTimeoutId = null;
                        let innerActive = false;
                        try { innerActive = sessionStorage.getItem('deluge_autocatch_active') === 'true'; } catch (_) {}
                        if (!innerActive) {
                            autoCatchStepInProgress = false;
                            return;
                        }
                        const activeThrowBtn = document.querySelector('input[type="submit"][value*="Throw" i], button[value*="Throw" i], input[value*="Throw" i]') || throwBtn;
                        if (activeThrowBtn) {
                            try { sessionStorage.setItem('deluge_autocatch_thrown', 'true'); } catch (_) {}
                            simulateMouseMovement(targetEl, activeThrowBtn, () => {
                                dispatchHumanClick(activeThrowBtn, () => {
                                    autoCatchStepInProgress = false;
                                });
                            });
                        } else {
                            autoCatchStepInProgress = false;
                        }
                    }, throwDelay);
                });
            }, selectDelay);
            return;
        } else {
            const throwDelay = getRandomCatchDelay(1000, 10000);
            ipcRenderer.sendToHost('autocatch-status', {
                step: 'throwing-master-ball',
                delay: throwDelay,
                stock: masterStock
            });

            if (pendingLifecycleTimeoutId) {
                clearTimeout(pendingLifecycleTimeoutId);
                pendingLifecycleTimeoutId = null;
            }

            pendingLifecycleTimeoutId = setTimeout(() => {
                pendingLifecycleTimeoutId = null;
                let active = false;
                try { active = sessionStorage.getItem('deluge_autocatch_active') === 'true'; } catch (_) {}
                if (!active) {
                    autoCatchStepInProgress = false;
                    return;
                }
                const activeThrowBtn = document.querySelector('input[type="submit"][value*="Throw" i], button[value*="Throw" i], input[value*="Throw" i]') || throwBtn;
                if (activeThrowBtn) {
                    try { sessionStorage.setItem('deluge_autocatch_thrown', 'true'); } catch (_) {}
                    const targetEl = (masterRadio.id ? document.querySelector('label[for="' + masterRadio.id + '"]') : null) || masterRadio;
                    simulateMouseMovement(targetEl, activeThrowBtn, () => {
                        dispatchHumanClick(activeThrowBtn, () => {
                            autoCatchStepInProgress = false;
                        });
                    });
                } else {
                    autoCatchStepInProgress = false;
                }
            }, throwDelay);
            return;
        }
    }
}

function guardManualCatchButtonsOnCatchPage() {
    // Stealth zero-DOM-injection: ensure pristine DelugeRPG DOM with zero foreign elements or modal blocking
    removeUniquenessAlertBanner();
}

// Attach Auto-Catch and Ball Inventory listeners
setInterval(runAutoCatchLifecycle, 400);
setInterval(() => checkAndSyncBallInventory(false), 4000);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        runAutoCatchLifecycle();
        checkAndSyncBallInventory(false);
    });
} else {
    runAutoCatchLifecycle();
    checkAndSyncBallInventory(false);
}
window.addEventListener('load', () => {
    runAutoCatchLifecycle();
    checkAndSyncBallInventory(false);
});

ipcRenderer.on('request-ball-inventory', () => {
    checkAndSyncBallInventory(true);
});

// --- GYM BATTLE TEAM BUILDER GUEST HANDLERS ---
function parsePokemonRowsFromHtml(html) {
    const pokemons = [];
    const rowPattern = /<div class="row[^"]*"[^>]*data-pkid="([^"]+)"[^>]*>([\s\S]*?)(?=(?:<div class="row[^"]*"[^>]*data-pkid="|<\/div>\s*<\/div>\s*<div id="pagesel"|<\/div>\s*<\/div>\s*<div class="pagination|<div class="pagenum))/g;
    let match;
    while ((match = rowPattern.exec(html)) !== null) {
        const id = match[1];
        const block = match[2];

        const nameMatch = block.match(/data-name="([^"]+)"/) || block.match(/<span class="nnfield[^"]*">([^<]+)<\/span>/);
        const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

        const classMatch = block.match(/data-class="([^"]*)"/);
        let variant = classMatch ? classMatch[1].trim() : '';
        if (!variant) {
            const imgMatch = block.match(/src="[^"]*\/([a-z]+)\/[^"]+\.png"/i);
            if (imgMatch && imgMatch[1]) {
                variant = imgMatch[1].charAt(0).toUpperCase() + imgMatch[1].slice(1).toLowerCase();
            }
        }
        if (!variant || variant.toLowerCase() === 'normal') variant = 'Normal';

        const levelMatch = block.match(/<b>Level:<\/b>\s*(\d+)/i);
        const level = levelMatch ? parseInt(levelMatch[1], 10) : 1;

        const expMatch = block.match(/<b>Exp:<\/b>\s*([0-9,]+)/i);
        const exp = expMatch ? expMatch[1].trim() : '0';

        const types = [];
        const typePattern = /<i class="tbtn tbtn-([a-z]+)" title="([^"]+)"/ig;
        let tMatch;
        while ((tMatch = typePattern.exec(block)) !== null) {
            types.push(tMatch[2].trim());
        }

        const moves = [];
        const attkSectionMatch = block.match(/<div class="attk"[^>]*>([\s\S]*?)<\/div>\s*<div class="opts"/i) || block.match(/<div class="attk"[^>]*>([\s\S]*?)<\/div>/i);
        if (attkSectionMatch) {
            const moveDivPattern = /<div class="hoverclr-([a-z]+)">([^<]+)<\/div>/g;
            let mMatch;
            while ((mMatch = moveDivPattern.exec(attkSectionMatch[1])) !== null) {
                const mType = mMatch[1].charAt(0).toUpperCase() + mMatch[1].slice(1).toLowerCase();
                moves.push({
                    name: mMatch[2].trim(),
                    type: mType
                });
            }
        }

        const inTeam = block.includes('In Team') || block.includes('/team/replace');
        const spriteMatch = block.match(/<img[^>]+src="([^"]+)"/i);
        const sprite = spriteMatch ? spriteMatch[1] : '';

        pokemons.push({
            id,
            name,
            variant,
            level,
            exp,
            types,
            moves,
            inTeam,
            sprite
        });
    }
    return pokemons;
}

ipcRenderer.on('start-scan-pokemon', async () => {
    try {
        console.log('[PokePreload] Starting automated pokemon collection scan...');
        ipcRenderer.sendToHost('scan-pokemon-status', { step: 'reading-page-1' });

        const res1 = await fetch('/pokemon/page/1', { credentials: 'include' });
        const html1 = await res1.text();

        let maxPages = 1;
        const pageMatches = html1.match(/\/pokemon\/page\/(\d+)/g) || [];
        for (let i = 0; i < pageMatches.length; i++) {
            const pnum = parseInt(pageMatches[i].replace('/pokemon/page/', ''), 10);
            if (pnum > maxPages) maxPages = pnum;
        }

        const page1Pokes = parsePokemonRowsFromHtml(html1);
        const map = new Map();
        page1Pokes.forEach(p => map.set(p.id, p));

        for (let page = 2; page <= maxPages; page++) {
            ipcRenderer.sendToHost('scan-pokemon-status', { step: 'reading-page', page: page, total: maxPages });
            await new Promise(r => setTimeout(r, getGaussianDelay(920, 180, 650)));
            try {
                const res = await fetch('/pokemon/page/' + page, { credentials: 'include' });
                const html = await res.text();
                const pokes = parsePokemonRowsFromHtml(html);
                pokes.forEach(p => map.set(p.id, p));
            } catch (err) {
                console.warn('[PokePreload] Error fetching page ' + page + ':', err);
            }
        }

        const allPokes = Array.from(map.values());
        console.log('[PokePreload] Scan complete! Total pokemon found: ' + allPokes.length);
        ipcRenderer.sendToHost('pokemon-scan-complete', {
            success: true,
            pokemons: allPokes,
            pageCount: maxPages
        });
    } catch (err) {
        console.error('[PokePreload] Scan error:', err);
        ipcRenderer.sendToHost('pokemon-scan-complete', {
            success: false,
            error: err.message
        });
    }
});

function parsePokemonFromTrainerProfile(html) {
    const pokemons = [];
    if (!html) return pokemons;

    const vpPattern = /<div class="viewpoketable[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<div class="viewpoketable|<\/div>\s*<hr)/g;
    let match;
    while ((match = vpPattern.exec(html)) !== null) {
        const block = match[1];
        const h4Match = block.match(/<h4>([^<]+)<\/h4>/i);
        const name = h4Match ? h4Match[1].trim() : '';
        if (!name) continue;

        const types = [];
        const tPattern = /<i class="tbtn tbtn-([a-z]+)" title="([^"]+)"/ig;
        let tMatch;
        while ((tMatch = tPattern.exec(block)) !== null) {
            types.push(tMatch[2].trim());
        }

        const imgMatch = block.match(/src="([^"]+\.png)"/i);
        const sprite = imgMatch ? imgMatch[1] : '';

        let level = 100;
        const lvlMatch = block.match(/<b>Level:<\/b>\s*(\d+)/i);
        if (lvlMatch) level = parseInt(lvlMatch[1], 10);

        pokemons.push({
            name: name,
            types: types.length > 0 ? types : ['Normal'],
            level: level,
            sprite: sprite
        });
    }

    if (pokemons.length === 0) {
        const pokePattern = /<div class="pokemon"[^>]*>([\s\S]*?)<\/div>/g;
        let pMatch;
        while ((pMatch = pokePattern.exec(html)) !== null) {
            const block = pMatch[1];
            const spanMatch = block.match(/<span class="smallcaps">([^<]+)<\/span>/i);
            const name = spanMatch ? spanMatch[1].trim() : '';
            if (!name) continue;

            const types = [];
            const tPattern = /<i class="tbtn tbtn-([a-z]+)" title="([^"]+)"/ig;
            let tMatch;
            while ((tMatch = tPattern.exec(block)) !== null) {
                types.push(tMatch[2].trim());
            }

            const imgMatch = block.match(/src="([^"]+\.png)"/i);
            const sprite = imgMatch ? imgMatch[1] : '';

            pokemons.push({
                name: name,
                types: types.length > 0 ? types : ['Normal'],
                level: 100,
                sprite: sprite
            });
        }
    }

    return pokemons;
}

ipcRenderer.on('start-scan-trainer-rosters', async (event, data) => {
    try {
        const trainers = data && data.trainers ? data.trainers : [];
        if (trainers.length === 0) {
            ipcRenderer.sendToHost('scan-trainers-status', { step: 'probe-failed', message: 'No trainers found to scan.' });
            return;
        }

        ipcRenderer.sendToHost('scan-trainers-status', { step: 'probing', message: 'Testing trainer profile endpoint (/npc/5141)...' });

        let probeRes = await fetch('/npc/5141', { credentials: 'include' });
        let probeHtml = await probeRes.text();
        let parsedProbe = parsePokemonFromTrainerProfile(probeHtml);

        if (parsedProbe.length === 0) {
            await new Promise(r => setTimeout(r, getGaussianDelay(850, 150, 600)));
            probeRes = await fetch('/npc/5145', { credentials: 'include' });
            probeHtml = await probeRes.text();
            parsedProbe = parsePokemonFromTrainerProfile(probeHtml);
        }

        if (parsedProbe.length === 0) {
            console.log('[PokePreload] Probe check: /npc/ pages do not expose pokemon teams.');
            ipcRenderer.sendToHost('scan-trainers-status', {
                step: 'probe-failed',
                message: 'DelugeRPG /npc/ profile pages do not show team rosters. Rosters are automatically captured as you battle!'
            });
            return;
        }

        console.log('[PokePreload] Probe passed! Starting human-like harvest of ' + trainers.length + ' trainers...');
        ipcRenderer.sendToHost('scan-trainers-status', { step: 'probe-passed', total: trainers.length });

        for (let i = 0; i < trainers.length; i++) {
            const tr = trainers[i];
            const delay = Math.floor(1800 + Math.random() * 800);
            await new Promise(r => setTimeout(r, delay));

            ipcRenderer.sendToHost('scan-trainers-status', {
                step: 'harvesting',
                current: i + 1,
                total: trainers.length,
                trainerName: tr.name
            });

            try {
                const res = await fetch('/npc/' + tr.npcId, { credentials: 'include' });
                const html = await res.text();
                const pokes = parsePokemonFromTrainerProfile(html);
                if (pokes.length > 0) {
                    ipcRenderer.sendToHost('battle-opponents-detected', {
                        trainerName: tr.name,
                        npcId: tr.npcId,
                        trainerTitle: tr.name + "'s Team",
                        roster: pokes
                    });
                }
            } catch (err) {
                console.warn('[PokePreload] Error fetching trainer ' + tr.name + ':', err);
            }
        }

        ipcRenderer.sendToHost('scan-trainers-status', { step: 'completed', message: 'All trainers scanned successfully!' });
    } catch (err) {
        console.error('[PokePreload] Scan trainer error:', err);
        ipcRenderer.sendToHost('scan-trainers-status', { step: 'error', message: err.message });
    }
});

function executeSlotAssignment(ids, pokes) {
    const pokesMap = new Map();
    if (Array.isArray(pokes)) {
        pokes.forEach(p => {
            if (p && p.id) pokesMap.set(p.id, p);
        });
    }

    const startTime = Date.now();
    const waitTimer = setInterval(() => {
        const teamList = document.getElementById('teamlist');
        if (!teamList) {
            if (Date.now() - startTime > 4000) {
                clearInterval(waitTimer);
                ipcRenderer.sendToHost('team-apply-complete', { success: false, error: 'teamlist not found' });
            }
            return;
        }

        clearInterval(waitTimer);

        // Humanized initial perception delay (500ms - 750ms)
        const perceptionDelay = getGaussianDelay(650, 100, 500);
        ipcRenderer.sendToHost('team-apply-status', { step: 'assigning', message: 'Configuring team lineup slots...' });

        setTimeout(() => {
            teamList.innerHTML = '';
            for (let i = 0; i < ids.length; i++) {
                const pkId = ids[i];
                const p = pokesMap.get(pkId) || { name: 'Pokemon ' + (i + 1), level: 100, types: ['normal'], sprite: '' };
                const pType = (p.types && p.types[0] ? p.types[0] : 'normal').toLowerCase();

                const li = document.createElement('li');
                li.id = 'mem_' + pkId;
                li.className = 'indbox ui-droppable ui-sortable-handle';

                let spriteHtml = '';
                if (p.sprite) {
                    spriteHtml = '<div><img src="' + p.sprite + '" alt="' + p.name + '" class="pk72"></div>';
                }

                li.innerHTML = '<div class="row typeclr-' + pType + '" data-pktype="' + pType + '" data-pkid="' + pkId + '">' +
                    '<div class="name">' + p.name + '</div>' +
                    '<div class="info">' +
                        spriteHtml +
                        '<div>' +
                            '<div><b>Level: </b>' + (p.level || 100) + '</div>' +
                            '<div class="itype"><i class="tbtn tbtn-' + pType + ' tbtn-mini" title="' + pType + '"></i></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="remove">Remove</div>' +
                '</div>';
                teamList.appendChild(li);
            }

            try {
                if (window.$ && window.$('#teamlist').data('ui-sortable')) {
                    window.$('#teamlist').sortable('refresh');
                }
            } catch (_) {}

            ipcRenderer.sendToHost('team-apply-status', { step: 'reviewing', message: 'Reviewing team lineup...' });

            // Humanized lineup inspection delay before saving (1150ms - 1500ms)
            // Total time before SaveState() = perceptionDelay + reviewDelay >= 1700ms Safety Floor
            const reviewDelay = getGaussianDelay(1250, 120, 1100);

            setTimeout(() => {
                ipcRenderer.sendToHost('team-apply-status', { step: 'saving', message: 'Saving team to DelugeRPG...' });

                const saveBtn = document.querySelector('button[onclick*="SaveState"], #save_team, button.btn-primary');
                if (saveBtn) {
                    dispatchHumanClick(saveBtn);
                } else if (typeof window.SaveState === 'function') {
                    window.SaveState();
                }

                let checkCount = 0;
                const confirmTimer = setInterval(() => {
                    checkCount++;
                    const modalDone = document.querySelector('#DMbody .notify_done, .notify_done');
                    if (modalDone || checkCount > 20) {
                        clearInterval(confirmTimer);
                        const dismissDelay = getGaussianDelay(450, 80, 350);
                        setTimeout(() => {
                            try {
                                const closeBtn = document.querySelector('#DMbody .close, #DMbody button, #DMoverlay');
                                if (closeBtn) dispatchHumanClick(closeBtn);
                            } catch (_) {}
                            ipcRenderer.sendToHost('team-apply-complete', { success: true });
                            // Automatically reload page so DelugeRPG cleanly re-binds native jQuery UI droppable & sortable handlers
                            setTimeout(() => {
                                try {
                                    window.location.reload();
                                } catch (_) {}
                            }, 350);
                        }, dismissDelay);
                    }
                }, 150);
            }, reviewDelay);
        }, perceptionDelay);
    }, 60);
}

ipcRenderer.on('apply-team-slots', (event, data) => {
    const ids = (data && data.pokemonIds) || [];
    const pokes = (data && data.pokemons) || [];
    if (!ids || ids.length === 0) return;

    try {
        console.log('[PokePreload] Applying team slots:', ids);
        const path = (window.location.pathname || '').toLowerCase();

        if (path.indexOf('/team/edit') === -1) {
            sessionStorage.setItem('deluge_pending_team_slots', JSON.stringify({
                ids: ids,
                pokemons: pokes,
                timestamp: Date.now()
            }));
            ipcRenderer.sendToHost('team-apply-status', { step: 'navigating', message: 'Navigating to Team Editor...' });
            window.location.href = 'https://www.delugerpg.com/team/edit';
            return;
        }

        executeSlotAssignment(ids, pokes);
    } catch (err) {
        console.error('[PokePreload] Apply team error:', err);
        ipcRenderer.sendToHost('team-apply-complete', { success: false, error: err.message });
    }
});

// --- 5. MANUAL TEAM EDIT & SAVE TRANSACTION SPY ---
function injectTeamSaveSpy() {
    try {
        if (document.getElementById('deluge-team-save-spy')) return;
        const script = document.createElement('script');
        script.id = 'deluge-team-save-spy';
        script.textContent = `
(function() {
    console.log('[TEAM_SPY] Active: Listening for manual team edit and SaveState...');

    // A. Intercept XMLHttpRequest
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    var origSetHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._spyMethod = method;
        this._spyUrl = url;
        this._spyHeaders = {};
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
        if (!this._spyHeaders) this._spyHeaders = {};
        this._spyHeaders[header] = value;
        return origSetHeader.apply(this, arguments);
    };

    function isDelugeTeamRequest(u, m) {
        if (!u || typeof u !== 'string') return false;
        var lower = u.toLowerCase();
        if (lower.indexOf('google') !== -1 || lower.indexOf('rubicon') !== -1 || lower.indexOf('optad360') !== -1 || lower.indexOf('doubleclick') !== -1) {
            return false;
        }
        return (lower.indexOf('/team/edit') !== -1 || lower.indexOf('/team/save') !== -1 || (lower.indexOf('/team') !== -1 && m === 'POST'));
    }

    XMLHttpRequest.prototype.send = function(data) {
        var xhr = this;
        var method = (xhr._spyMethod || 'GET').toUpperCase();
        var url = xhr._spyUrl || '';
        var body = data;

        var isTeamReq = isDelugeTeamRequest(url, method);

        if (isTeamReq) {
            console.log('[TEAM_SPY] Intercepted XHR send to:', url, 'method:', method, 'body:', body);

            var teamListEl = document.getElementById('teamlist');
            var teamMembers = [];
            if (teamListEl) {
                var lis = teamListEl.querySelectorAll('li');
                for (var i = 0; i < lis.length; i++) {
                    var li = lis[i];
                    var row = li.querySelector('.row');
                    teamMembers.push({
                        slotIndex: i + 1,
                        liId: li.id,
                        liClass: li.className,
                        rowPkid: row ? row.getAttribute('data-pkid') : null,
                        rowClass: row ? row.className : null,
                        rowText: (row ? row.innerText : '').replace(/\\s+/g, ' ').trim()
                    });
                }
            }

            var sortableSerialize = '';
            var sortableToArray = [];
            try {
                if (window.$ && window.$('#teamlist').data('ui-sortable')) {
                    sortableSerialize = window.$('#teamlist').sortable('serialize');
                    sortableToArray = window.$('#teamlist').sortable('toArray');
                }
            } catch (_) {}

            xhr.addEventListener('load', function() {
                console.log('[TEAM_SPY] Intercepted XHR response:', xhr.status, xhr.responseText);
                window.postMessage({
                    type: 'DELUGE_TEAM_INTERCEPT',
                    method: method,
                    url: url,
                    headers: xhr._spyHeaders,
                    postBody: String(body || ''),
                    responseStatus: xhr.status,
                    responseText: xhr.responseText,
                    teamMembersDOM: teamMembers,
                    sortableSerialize: sortableSerialize,
                    sortableToArray: sortableToArray,
                    saveStateSource: window.SaveState ? window.SaveState.toString() : 'not_found'
                }, '*');
            });
        }

        return origSend.apply(this, arguments);
    };

    // B. Intercept window.fetch
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
        var url = '';
        try {
            if (typeof input === 'string') url = input;
            else if (input && typeof input.url === 'string') url = input.url;
            else if (input && input.href) url = input.href;
        } catch (_) {}
        var method = (init && init.method) ? init.method.toUpperCase() : 'GET';
        var body = (init && init.body) ? init.body : null;

        var isTeamReq = isDelugeTeamRequest(url, method);
        if (isTeamReq) {
            console.log('[TEAM_SPY] Intercepted fetch to:', url, 'method:', method, 'body:', body);
        }

        return origFetch.apply(this, arguments).then(function(res) {
            if (isTeamReq) {
                res.clone().text().then(function(text) {
                    console.log('[TEAM_SPY] Intercepted fetch response:', res.status, text);
                    window.postMessage({
                        type: 'DELUGE_TEAM_INTERCEPT',
                        method: method,
                        url: url,
                        postBody: String(body || ''),
                        responseStatus: res.status,
                        responseText: text,
                        saveStateSource: window.SaveState ? window.SaveState.toString() : 'not_found'
                    }, '*');
                }).catch(function() {});
            }
            return res;
        });
    };

    // C. Hook SaveState directly
    function hookSaveState() {
        if (window.SaveState && !window.SaveState.__spied) {
            var originalSaveState = window.SaveState;
            var spiedFn = function() {
                console.log('[TEAM_SPY] User invoked SaveState()!');
                return originalSaveState.apply(this, arguments);
            };
            spiedFn.__spied = true;
            window.SaveState = spiedFn;
            console.log('[TEAM_SPY] Wrapped window.SaveState successfully!');
        }
    }

    hookSaveState();
    setInterval(hookSaveState, 1000);
})();
`;
        (document.head || document.documentElement).appendChild(script);
    } catch (err) {
        console.warn('[PokePreload] Could not inject team save spy:', err);
    }
}

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DELUGE_TEAM_INTERCEPT') {
        console.log('[PokePreload] Captured team save transaction:', event.data);
        ipcRenderer.sendToHost('team-intercept-captured', event.data);
    }
});

// --- 6. LIVE BATTLE OPPONENT DETECTOR & ROSTER HARVESTER ---
function isProfileModalOpen(modalEl) {
    if (!modalEl) return false;
    if (modalEl.style && modalEl.style.display === 'none') return false;
    const ariaHidden = modalEl.getAttribute ? modalEl.getAttribute('aria-hidden') : null;
    const hasOpenClass = modalEl.classList ? (modalEl.classList.contains('in') || modalEl.classList.contains('show')) : false;
    const isDisplayBlock = !!(modalEl.style && modalEl.style.display === 'block');
    const bodyModalOpen = !!(document.body && document.body.classList && document.body.classList.contains('modal-open'));
    if (ariaHidden === 'true' && !hasOpenClass && !isDisplayBlock && !bodyModalOpen) {
        return false;
    }
    return true;
}

function extractProfileMetadataFromContainer(root) {
    const meta = {
        username: '',
        profileId: '',
        battleUrl: '',
        fullPageUrl: '',
        teamHidden: false
    };
    if (!root) return meta;

    const titleEl = root.querySelector ? root.querySelector('#DMtitle, .modal-title, h1') : null;
    if (titleEl && titleEl.textContent) {
        const m = titleEl.textContent.trim().match(/^(.+?)[']s\s+Profile/i);
        if (m) meta.username = m[1].trim();
    }

    if (!meta.username && root.querySelectorAll) {
        const h3s = root.querySelectorAll('.infobox h3, h3');
        for (let i = 0; i < h3s.length; i++) {
            const txt = (h3s[i].textContent || '').trim().toLowerCase();
            if (txt.indexOf('username') === 0 && h3s[i].nextElementSibling) {
                const candidate = (h3s[i].nextElementSibling.textContent || '').trim();
                if (candidate) {
                    meta.username = candidate;
                    break;
                }
            }
        }
    }

    if (root.querySelector) {
        const battleLink = root.querySelector('#userlinks a[href*="/battle/"], a[href*="/battle/user/"]');
        if (battleLink) {
            const href = battleLink.getAttribute('href') || '';
            if (href) {
                meta.battleUrl = href;
                if (!meta.username) {
                    const bm = href.match(/\/battle\/user\/username\/([^/?#]+)/i);
                    if (bm) {
                        try { meta.username = decodeURIComponent(bm[1]); } catch (_) { meta.username = bm[1]; }
                    }
                }
            }
        }

        if (!meta.username) {
            const userLink = root.querySelector('#userlinks a[href*="/pokedex/u/"], #userlinks a[href*="/trade/lookup/user/"], #userlinks a[href*="/compare/users/"]');
            if (userLink) {
                const uHref = userLink.getAttribute('href') || '';
                const um = uHref.match(/\/(?:pokedex\/u|trade\/lookup\/user|compare\/users)\/([^/?#]+)/i);
                if (um) {
                    try { meta.username = decodeURIComponent(um[1]); } catch (_) { meta.username = um[1]; }
                }
            }
        }

        const uidLink = root.querySelector('a[href*="/profile/uid/"], a[href*="/pokemon/user/"], a[href*="/allpokemon/user/"]');
        if (uidLink) {
            const uidHref = uidLink.getAttribute('href') || '';
            const idm = uidHref.match(/\/(?:profile\/uid|pokemon\/user|allpokemon\/user)\/(\d+)/i);
            if (idm) meta.profileId = idm[1];
        }

        const fullPageLink = root.querySelector('#DMfoot a[href*="/profile/"], a[href*="/profile/uid/"]');
        if (fullPageLink) {
            meta.fullPageUrl = fullPageLink.getAttribute('href') || '';
        }
    }

    const fullText = root.textContent || '';
    if (fullText.indexOf('Unable to display team') !== -1) {
        meta.teamHidden = true;
    }

    if (!meta.battleUrl && meta.username) {
        meta.battleUrl = '/battle/user/username/' + encodeURIComponent(meta.username);
    }

    return meta;
}

let lastBroadcastBattleSig = null;
let lastKnownUserTeam = [];
const knownVariants = ['Normal', 'Shiny', 'Metallic', 'Ghostly', 'Dark', 'Shadow', 'Mirage', 'Retro', 'Chrome', 'Negative'];

function detectBattleOpponents(isManualCheck) {
    try {
        const path = (window.location.pathname || '').toLowerCase();

        // Mode 0: Open In-Game Player Profile Modal (#DModal / #DMbody) - ONLY when user clicks "Check Active Screen"
        if (isManualCheck) {
            const dModal = document.getElementById('DModal');
            const dmBody = document.getElementById('DMbody');
            const modalContainer = dModal || dmBody;
            if (modalContainer && isProfileModalOpen(dModal || dmBody)) {
                const meta = extractProfileMetadataFromContainer(modalContainer);
                const hasViewUTeam = !!(modalContainer.querySelector && modalContainer.querySelector('#viewuteam, .viewuteammember'));
                if (meta.username || hasViewUTeam) {
                    const roster = extractRosterFromProfileDocument(modalContainer);
                    const targetName = meta.username || 'Stalked Player';
                    const bUrl = meta.battleUrl || ('/battle/user/username/' + encodeURIComponent(targetName));
                    if (roster.length > 0) {
                        ipcRenderer.sendToHost('battle-opponents-detected', {
                            trainerName: targetName,
                            trainerTitle: targetName + "'s Profile",
                            roster: roster,
                            battleUrl: bUrl,
                            isProfileStalk: true,
                            isManualCheck: true
                        });
                        return;
                    } else if (meta.teamHidden) {
                        ipcRenderer.sendToHost('player-scout-status', {
                            step: 'error',
                            message: targetName + "'s team is hidden on profile."
                        });
                        return;
                    } else if (meta.username) {
                        scoutPlayerByUsername(meta.username, meta.profileId, true);
                        return;
                    }
                }
            }
        }

        // Mode 1: Active Battle Screen (#opponent or on-screen combat arena) - Takes top priority during combat
        const oppEl = document.getElementById('opponent') || document.querySelector('.opponent, #opp, [id*="opponent" i], .opp');
        const activePokeEl = oppEl ? (oppEl.querySelector('.pokemon') || (oppEl.classList && oppEl.classList.contains('pokemon') ? oppEl : null) || oppEl) : null;
        if (oppEl && activePokeEl) {
            const rawFullText = (activePokeEl.innerText || activePokeEl.textContent || '').trim();
            const fullText = rawFullText.replace(/\s+/g, ' ').trim();
            let trainerName = '';
            const m = rawFullText.match(/^(.+?)['']s\s+/i) || fullText.match(/^(.+?)['']s\s+/i);
            if (m) {
                trainerName = m[1].replace(/[\r\n]+/g, ' ').trim();
            } else {
                const wildM = fullText.match(/^Wild\s+(.+)/i);
                if (wildM) trainerName = 'Wild Pokemon';
                else trainerName = 'Challenger';
            }

            const nameSpan = activePokeEl.querySelector('.smallcaps, h4, .name');
            let pokeName = nameSpan ? nameSpan.textContent.trim() : '';
            if (!pokeName && fullText) {
                let stripped = fullText.replace(/^(.+?)['']s\s+/i, '').replace(/^Wild\s+/i, '');
                stripped = stripped.replace(/HP:\s*\d+(\/\d+)?/i, '').replace(/Level:\s*\d+/i, '').replace(/Lv\s*\d+/i, '').trim();
                pokeName = stripped;
            }
            if (pokeName) {
                pokeName = pokeName.split(/(?:HP:|Level:|Lv|\d+\/\d+)/i)[0].trim();
            }
            const imgEl = activePokeEl.querySelector('img');
            const sprite = imgEl ? (imgEl.getAttribute('src') || '') : '';
            if (!pokeName && imgEl) {
                pokeName = (imgEl.getAttribute('alt') || imgEl.getAttribute('title') || '').trim();
            }
            if (!pokeName) pokeName = 'Opponent Pokemon';
            if (!trainerName) trainerName = 'Opponent';

            const types = [];
            const typeBtns = activePokeEl.querySelectorAll('i.tbtn, .tbtn, span.type');
            for (let j = 0; j < typeBtns.length; j++) {
                const t = typeBtns[j].getAttribute('title') || typeBtns[j].textContent.trim();
                if (t && types.indexOf(t) === -1) types.push(t);
            }

            let level = 100;
            let hp = 400;
            let maxHp = 400;
            const hpEl = activePokeEl.querySelector('.hp');
            const hpSource = hpEl ? hpEl.textContent : rawFullText;
            const hpM = hpSource.match(/HP:\s*(\d+)(?:\s*\/\s*(\d+))?/i) || hpSource.match(/(\d+)\s*\/\s*(\d+)/i);
            if (hpM) {
                hp = parseInt(hpM[1], 10);
                if (hpM[2]) maxHp = parseInt(hpM[2], 10);
                if (maxHp <= 100) level = Math.max(1, Math.round(maxHp / 2));
                else level = 100;
            }

            const isFainted = (hp <= 0);

            // Extract Active Player Pokemon from #player, #user, or any container with "Your <Pokemon>"
            let userActivePokemon = null;
            let playerPokeEl = null;

            const playerCandidates = [
                document.getElementById('player'),
                document.getElementById('user'),
                document.getElementById('you'),
                document.querySelector('.player, #yourpoke, #userpoke, .yourpokemon, .userpokemon')
            ];
            for (let pc = 0; pc < playerCandidates.length; pc++) {
                if (playerCandidates[pc]) {
                    playerPokeEl = playerCandidates[pc].querySelector('.pokemon') || playerCandidates[pc];
                    break;
                }
            }

            if (!playerPokeEl) {
                const allPokeEls = document.querySelectorAll('.pokemon');
                for (let p = 0; p < allPokeEls.length; p++) {
                    const el = allPokeEls[p];
                    if (oppEl && (el === oppEl || oppEl.contains(el))) continue;
                    playerPokeEl = el;
                    break;
                }
            }

            if (!playerPokeEl) {
                const candEls = document.querySelectorAll('h3, h4, .smallcaps, strong, b, div, span');
                for (let c = 0; c < candEls.length; c++) {
                    const el = candEls[c];
                    if (oppEl && oppEl.contains(el)) continue;
                    const t = (el.textContent || '').trim();
                    if (/^Your\s+[A-Za-z0-9]/i.test(t) && !t.includes('Your Opponent') && !t.includes('Your Team')) {
                        playerPokeEl = el.closest('.pokemon') || el.parentElement || el;
                        break;
                    }
                }
            }

            if (playerPokeEl) {
                const pFullText = (playerPokeEl.textContent || '').trim();
                let pName = '';
                const mP = pFullText.match(/^Your\s+([A-Za-z0-9\s\-_()]+?)(?:\s+HP:|\s+Lv|\s*$)/i);
                if (mP) {
                    pName = mP[1].trim();
                } else {
                    const pNameSpan = playerPokeEl.querySelector('.smallcaps, h4, .name');
                    if (pNameSpan) {
                        pName = pNameSpan.textContent.trim();
                    } else {
                        pName = pFullText.replace(/^Your\s+/i, '').split(/[\r\n]+/)[0].trim();
                    }
                }
                pName = pName.replace(/^Your\s+/i, '').trim();

                const pTypes = [];
                const pTypeBtns = playerPokeEl.querySelectorAll('i.tbtn, .tbtn, span.type');
                for (let j = 0; j < pTypeBtns.length; j++) {
                    const t = pTypeBtns[j].getAttribute('title') || pTypeBtns[j].textContent.trim();
                    if (t && pTypes.indexOf(t) === -1) pTypes.push(t);
                }
                if (pTypes.length === 0 && Array.isArray(lastKnownUserTeam)) {
                    const matched = lastKnownUserTeam.find(u => (u.name || '').toLowerCase() === pName.toLowerCase() || pName.toLowerCase().includes((u.name || '').toLowerCase()));
                    if (matched && Array.isArray(matched.types)) {
                        pTypes.push(...matched.types);
                    }
                }

                let pLevel = 100;
                let pHp = 400;
                let pMaxHp = 400;
                const pHpEl = playerPokeEl.querySelector('.hp');
                const pHpSource = pHpEl ? pHpEl.textContent : pFullText;
                const pHpM = pHpSource.match(/HP:\s*(\d+)(?:\s*\/\s*(\d+))?/i) || pHpSource.match(/(\d+)\s*\/\s*(\d+)/i);
                if (pHpM) {
                    pHp = parseInt(pHpM[1], 10);
                    if (pHpM[2]) pMaxHp = parseInt(pHpM[2], 10);
                    if (pMaxHp <= 100) pLevel = Math.max(1, Math.round(pMaxHp / 2));
                    else pLevel = 100;
                }

                const pImgEl = playerPokeEl.querySelector('img');
                const pSprite = pImgEl ? (pImgEl.getAttribute('src') || '') : '';

                if (pName) {
                    let uVariant = 'Normal';
                    for (let kv = 0; kv < knownVariants.length; kv++) {
                        const vName = knownVariants[kv];
                        if (new RegExp('^' + vName + '\\b', 'i').test(pName) || (pSprite && pSprite.toLowerCase().includes('/' + vName.toLowerCase() + '/'))) {
                            uVariant = vName;
                            break;
                        }
                    }
                    userActivePokemon = {
                        name: pName,
                        variant: uVariant,
                        types: pTypes.length > 0 ? pTypes : ['Normal'],
                        level: pLevel,
                        hp: pHp,
                        maxHp: pMaxHp,
                        isFainted: (pHp <= 0),
                        sprite: pSprite
                    };
                }
            }

            // Extract available attack options strictly (excluding switch/pokeselect inputs)
            const availableMoves = [];
            let atkEls = Array.from(document.querySelectorAll(
                'input[type="radio"][name="selected"], ' +
                'input[type="radio"][name*="attk" i], ' +
                'input[type="radio"][name*="attack" i], ' +
                'input[type="radio"][name*="move" i], ' +
                'input[type="radio"][name="action"], ' +
                'input[type="radio"][name="battleaction"]'
            ));
            if (atkEls.length === 0) {
                const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
                atkEls = allRadios.filter(r => {
                    if (r.name && /switch|pokeselect|spoke|team/i.test(r.name)) return false;
                    if (r.closest && (r.closest('#teamright') || r.closest('#switchpoke') || r.closest('.switchform') || r.closest('.switchpoke') || r.closest('[id*="switch" i]') || r.closest('[class*="switch" i]'))) return false;
                    return true;
                });
            }

            const allTypesRegex = /\b(Normal|Fire|Water|Electric|Grass|Ice|Fighting|Poison|Ground|Flying|Psychic|Bug|Rock|Ghost|Dragon|Dark|Steel|Fairy)\b/i;

            for (let a = 0; a < atkEls.length; a++) {
                const aEl = atkEls[a];
                const aType = (aEl.type || '').toLowerCase();
                if (aType === 'submit' || aType === 'button' || aType === 'hidden') continue;
                if (aEl.name && /switch|pokeselect|spoke|team/i.test(aEl.name)) continue;
                if (aEl.closest && (aEl.closest('#teamright') || aEl.closest('#switchpoke') || aEl.closest('.switchform') || aEl.closest('.switchpoke') || aEl.closest('[id*="switch" i]') || aEl.closest('[class*="switch" i]'))) {
                    continue;
                }

                let box = aEl.parentElement;
                while (box && box !== document.body && box.parentElement) {
                    if (box.parentElement.querySelectorAll('input[type="radio"]').length > 1) {
                        break;
                    }
                    if (box.tagName === 'LABEL' || box.tagName === 'TD') break;
                    box = box.parentElement;
                }
                if (!box) box = aEl.parentElement;

                let mType = null;
                if (box) {
                    const tEl = box.querySelector('i.tbtn, .tbtn, span.type, [class*="type" i], b, span');
                    if (tEl) {
                        const tText = tEl.getAttribute('title') || tEl.textContent || '';
                        const tM = tText.match(allTypesRegex);
                        if (tM) mType = tM[1];
                    }
                }

                let lbl = '';
                if (aEl.labels && aEl.labels.length > 0) lbl = aEl.labels[0].textContent.trim();
                else if (aEl.parentElement && aEl.parentElement.tagName.toLowerCase() === 'label') lbl = aEl.parentElement.textContent.trim();
                else if (box) {
                    lbl = box.textContent.trim();
                }
                if (!lbl && aEl.nextSibling && aEl.nextSibling.nodeType === 3) lbl = aEl.nextSibling.textContent.trim();
                if (!lbl && aEl.parentElement) lbl = aEl.parentElement.textContent.trim();
                if (!lbl) lbl = (aEl.value || '').trim();

                lbl = lbl.replace(/\s+/g, ' ').trim();
                if (!lbl) continue;

                let mName = lbl;
                const typeMatch = lbl.match(/^(.*?)\s*[\(\[]?([A-Za-z]+)[\)\]]?$/);
                if (typeMatch && allTypesRegex.test(typeMatch[2])) {
                    mName = typeMatch[1].trim();
                    if (!mType) mType = typeMatch[2].trim();
                } else if (mType) {
                    mName = lbl.replace(new RegExp('\\b' + mType + '\\b', 'gi'), '').trim();
                }
                mName = mName.replace(/[\(\)\[\]]/g, ' ').replace(/\s+/g, ' ').trim();

                const trailingType = mName.match(/^(.*?)\s+(Normal|Fire|Water|Electric|Grass|Ice|Fighting|Poison|Ground|Flying|Psychic|Bug|Rock|Ghost|Dragon|Dark|Steel|Fairy)$/i);
                if (trailingType) {
                    mName = trailingType[1].trim();
                    if (!mType) mType = trailingType[2].trim();
                }

                const exists = availableMoves.some(m => m.name.toLowerCase() === mName.toLowerCase());
                if (!exists && mName) {
                    availableMoves.push({
                        name: mName,
                        type: mType || 'Normal',
                        rawLabel: mType ? `${mName} (${mType})` : mName,
                        checked: !!aEl.checked,
                        value: aEl.value || ''
                    });
                }
            }

            // Extract bench team on screen
            const userTeam = [];
            const benchContainer = document.getElementById('teamright') || document.getElementById('switchpoke') || document.querySelector('.bench, .teamlist, #userteam');
            if (benchContainer) {
                const rItems = benchContainer.querySelectorAll('.battlelistitem, .pokemon, .row');
                for (let i = 0; i < rItems.length; i++) {
                    const rItem = rItems[i];
                    const rNameEl = rItem.querySelector('.batname span, .batname, h4, .name');
                    const rName = rNameEl ? rNameEl.textContent.trim() : '';
                    if (!rName) continue;
                    const rTypes = [];
                    const rTypeBtns = rItem.querySelectorAll('i.tbtn, .tbtn, span.type');
                    for (let j = 0; j < rTypeBtns.length; j++) {
                        const t = rTypeBtns[j].getAttribute('title') || rTypeBtns[j].textContent.trim();
                        if (t && rTypes.indexOf(t) === -1) rTypes.push(t);
                    }
                    let rLevel = 100;
                    let rHp = 100;
                    let rMaxHp = 100;
                    const rLvlEl = rItem.querySelector('.battlelistlvlhp, .hp');
                    if (rLvlEl) {
                        const rTxt = rLvlEl.textContent || '';
                        const m2 = rTxt.match(/Level:\s*(\d+)/i) || rTxt.match(/Lv\s*(\d+)/i);
                        if (m2) rLevel = parseInt(m2[1], 10);
                        const hpM2 = rTxt.match(/HP:\s*(\d+)(?:\s*\/\s*(\d+))?/i);
                        if (hpM2) {
                            rHp = parseInt(hpM2[1], 10);
                            if (hpM2[2]) rMaxHp = parseInt(hpM2[2], 10);
                        }
                    }
                    const rStyle = rItem.getAttribute('style') || '';
                    const rFainted = (rHp <= 0) || rItem.classList.contains('fainted') || rItem.classList.contains('dead') || rStyle.includes('opacity: 0.5') || rStyle.includes('opacity:0.5');
                    userTeam.push({
                        name: rName,
                        types: rTypes.length > 0 ? rTypes : ['Normal'],
                        level: rLevel,
                        hp: rHp,
                        maxHp: rMaxHp,
                        isFainted: rFainted,
                        index: i
                    });
                }
            }
            if (userActivePokemon) {
                const alreadyInTeam = userTeam.some(u => u.name.toLowerCase() === userActivePokemon.name.toLowerCase());
                if (!alreadyInTeam) {
                    userTeam.unshift(userActivePokemon);
                }
            }

            // Extract full opponent roster from #teamleft if present on side panel
            let roster = [];
            const teamLeftEl = document.getElementById('teamleft');
            let trainerTitle = trainerName + "'s Team";
            if (teamLeftEl) {
                const h2 = teamLeftEl.querySelector('h2');
                if (h2 && h2.textContent.trim()) {
                    trainerTitle = h2.textContent.trim();
                    trainerName = trainerTitle.replace(/['']s\s*Team$/i, '').trim();
                }
                const items = teamLeftEl.querySelectorAll('.battlelistitem');
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const nameEl = item.querySelector('.batname span, .batname, h4');
                    const rName = nameEl ? nameEl.textContent.trim() : '';
                    if (!rName) continue;
                    const rTypes = [];
                    const typeBtns = item.querySelectorAll('.batname i.tbtn, i.tbtn');
                    for (let j = 0; j < typeBtns.length; j++) {
                        const t = typeBtns[j].getAttribute('title');
                        if (t && rTypes.indexOf(t) === -1) rTypes.push(t);
                    }
                    let rLevel = 100;
                    let rHp = 100;
                    let rMaxHp = 100;
                    const lvlHpEl = item.querySelector('.battlelistlvlhp');
                    if (lvlHpEl) {
                        const txt = lvlHpEl.textContent || '';
                        const m = txt.match(/Level:\s*(\d+)/i);
                        if (m) rLevel = parseInt(m[1], 10);
                        const hpM = txt.match(/HP:\s*(\d+)(?:\s*\/\s*(\d+))?/i);
                        if (hpM) {
                            rHp = parseInt(hpM[1], 10);
                            if (hpM[2]) rMaxHp = parseInt(hpM[2], 10);
                        }
                    }
                    const itemStyle = item.getAttribute('style') || '';
                    const isF = (rHp <= 0) || item.classList.contains('fainted') || item.classList.contains('dead') || itemStyle.includes('opacity: 0.5') || itemStyle.includes('opacity:0.5');
                    const imgEl2 = item.querySelector('.battlelistimg img, img');
                    const spr = imgEl2 ? (imgEl2.getAttribute('src') || '') : '';
                    let rVar = 'Normal';
                    for (let kv = 0; kv < knownVariants.length; kv++) {
                        const vName = knownVariants[kv];
                        if (new RegExp('^' + vName + '\\b', 'i').test(rName) || (spr && spr.toLowerCase().includes('/' + vName.toLowerCase() + '/'))) {
                            rVar = vName;
                            break;
                        }
                    }
                    roster.push({
                        name: rName,
                        variant: rVar,
                        types: rTypes.length > 0 ? rTypes : ['Normal'],
                        level: rLevel,
                        hp: rHp,
                        maxHp: rMaxHp,
                        isFainted: isF,
                        sprite: spr
                    });
                }
            }

            let oppVariant = 'Normal';
            for (let kv = 0; kv < knownVariants.length; kv++) {
                const vName = knownVariants[kv];
                if (new RegExp('^' + vName + '\\b', 'i').test(pokeName) || (sprite && sprite.toLowerCase().includes('/' + vName.toLowerCase() + '/'))) {
                    oppVariant = vName;
                    break;
                }
            }

            if (roster.length === 0) {
                roster = [{
                    name: pokeName,
                    variant: oppVariant,
                    types: types.length > 0 ? types : ['Normal'],
                    level: level,
                    hp: hp,
                    maxHp: maxHp,
                    isFainted: isFainted,
                    sprite: sprite
                }];
            } else {
                const activeMatch = roster.find(p => p.name.toLowerCase() === pokeName.toLowerCase() || pokeName.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(pokeName.toLowerCase()));
                if (activeMatch) {
                    activeMatch.hp = hp;
                    activeMatch.maxHp = maxHp;
                    activeMatch.isFainted = isFainted;
                }
            }

            const hasAttackBtn = (availableMoves.length > 0) || Boolean(document.querySelector('input[type="submit"][value*="Attack" i], button[type="submit"][value*="Attack" i], input[value*="Attack" i]'));

            // Check if Continue or Next Turn button is currently present on screen
            let hasContinueBtn = false;
            if (!hasAttackBtn || isFainted) {
                const allActionButtons = document.querySelectorAll('input[type="submit"], input[type="button"], button, a.btn');
                for (let b = 0; b < allActionButtons.length; b++) {
                    const btn = allActionButtons[b];
                    const bTxt = ((btn.value || '') + ' ' + (btn.textContent || '')).toLowerCase();
                    if (bTxt.indexOf('switch') !== -1) continue;
                    if (bTxt.indexOf('continue') !== -1 || bTxt.indexOf('next') !== -1) {
                        hasContinueBtn = true;
                        break;
                    }
                }
            }
            const benchRadios = document.querySelectorAll('#teamright input[type="radio"], #switchpoke input[type="radio"], .switchform input[type="radio"]');
            const hasBenchRadios = benchRadios.length > 0;

            const activeBattleSig = 'ACTIVE:' + trainerName + ':' + pokeName + '_' + hp + '_' + isFainted + ':' + (userActivePokemon ? userActivePokemon.name + '_' + userActivePokemon.hp + '_' + userActivePokemon.isFainted : '') + ':cnt=' + hasContinueBtn + ':atk=' + hasAttackBtn + ':br=' + hasBenchRadios + ':' + availableMoves.map(m => m.name).join(',');
            if (!isManualCheck && activeBattleSig === lastBroadcastBattleSig) {
                return;
            }
            lastBroadcastBattleSig = activeBattleSig;

            ipcRenderer.sendToHost('battle-opponents-detected', {
                trainerName: trainerName,
                trainerTitle: trainerTitle,
                roster: roster,
                userActivePokemon: userActivePokemon,
                availableMoves: availableMoves,
                userTeam: userTeam,
                hasContinueBtn: hasContinueBtn,
                hasAttackBtn: hasAttackBtn,
                hasBenchRadios: hasBenchRadios,
                isInActiveBattle: true,
                isPreparationScreen: false,
                battleUrl: window.location.pathname + window.location.search,
                isManualCheck: !!isManualCheck
            });
            return;
        }

        // Mode 2: Live PvP / Challenge Battle Preparation Screen (#teamleft without active #opponent)
        const teamLeft = document.getElementById('teamleft');
        if (teamLeft) {
            const h2 = teamLeft.querySelector('h2');
            const trainerTitle = h2 ? h2.textContent.trim() : 'Opponent Team';
            const trainerName = trainerTitle.replace(/['']s\s*Team$/i, '').trim();
            const items = teamLeft.querySelectorAll('.battlelistitem');
            if (items && items.length > 0) {
                const roster = [];
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const nameEl = item.querySelector('.batname span');
                    const name = nameEl ? nameEl.textContent.trim() : 'Unknown';
                    const types = [];
                    const typeBtns = item.querySelectorAll('.batname i.tbtn, i.tbtn');
                    for (let j = 0; j < typeBtns.length; j++) {
                        const t = typeBtns[j].getAttribute('title');
                        if (t && types.indexOf(t) === -1) types.push(t);
                    }
                    let level = 100;
                    let hp = 100;
                    let maxHp = 100;
                    const lvlHpEl = item.querySelector('.battlelistlvlhp');
                    if (lvlHpEl) {
                        const txt = lvlHpEl.textContent || '';
                        const m = txt.match(/Level:\s*(\d+)/i);
                        if (m) level = parseInt(m[1], 10);
                        const hpM = txt.match(/HP:\s*(\d+)(?:\s*\/\s*(\d+))?/i);
                        if (hpM) {
                            hp = parseInt(hpM[1], 10);
                            if (hpM[2]) maxHp = parseInt(hpM[2], 10);
                        }
                    }
                    const itemStyle = item.getAttribute('style') || '';
                    const isFainted = (hp <= 0) || item.classList.contains('fainted') || item.classList.contains('dead') || itemStyle.includes('opacity: 0.5') || itemStyle.includes('opacity:0.5');
                    const imgEl = item.querySelector('.battlelistimg img');
                    const sprite = imgEl ? (imgEl.getAttribute('src') || '') : '';
                    roster.push({
                        name: name,
                        types: types.length > 0 ? types : ['Normal'],
                        level: level,
                        hp: hp,
                        maxHp: maxHp,
                        isFainted: isFainted,
                        sprite: sprite
                    });
                }
                if (roster.length > 0) {
                    const teamRight = document.getElementById('teamright');
                    const userTeam = [];
                    if (teamRight) {
                        const rItems = teamRight.querySelectorAll('.battlelistitem');
                        for (let i = 0; i < rItems.length; i++) {
                            const rItem = rItems[i];
                            const rNameEl = rItem.querySelector('.batname span, .batname, h4');
                            const rName = rNameEl ? rNameEl.textContent.trim() : 'Unknown';
                            const rTypes = [];
                            const rTypeBtns = rItem.querySelectorAll('i.tbtn');
                            for (let j = 0; j < rTypeBtns.length; j++) {
                                const t = rTypeBtns[j].getAttribute('title');
                                if (t && rTypes.indexOf(t) === -1) rTypes.push(t);
                            }
                            let rLevel = 100;
                            let rHp = 100;
                            let rMaxHp = 100;
                            const rLvlEl = rItem.querySelector('.battlelistlvlhp');
                            if (rLvlEl) {
                                const rTxt = rLvlEl.textContent || '';
                                const m = rTxt.match(/Level:\s*(\d+)/i);
                                if (m) rLevel = parseInt(m[1], 10);
                                const hpM = rTxt.match(/HP:\s*(\d+)(?:\s*\/\s*(\d+))?/i);
                                if (hpM) {
                                    rHp = parseInt(hpM[1], 10);
                                    if (hpM[2]) rMaxHp = parseInt(hpM[2], 10);
                                }
                            }
                            const rStyle = rItem.getAttribute('style') || '';
                            const rFainted = (rHp <= 0) || rItem.classList.contains('fainted') || rItem.classList.contains('dead') || rStyle.includes('opacity: 0.5') || rStyle.includes('opacity:0.5');
                            const rRadio = rItem.querySelector('input[type="radio"]');
                            userTeam.push({
                                name: rName,
                                types: rTypes.length > 0 ? rTypes : ['Normal'],
                                level: rLevel,
                                hp: rHp,
                                maxHp: rMaxHp,
                                isFainted: rFainted,
                                checked: rRadio ? !!rRadio.checked : false,
                                index: i
                            });
                        }
                    }
                    const battleSig = `${trainerName}:${roster.map(p => `${p.name}_${p.hp}_${p.isFainted}`).join(',')}:${userTeam.map(u => `${u.name}_${u.hp}_${u.checked}`).join(',')}`;
                    if (!isManualCheck && battleSig === lastBroadcastBattleSig) {
                        return;
                    }
                    lastBroadcastBattleSig = battleSig;
                    ipcRenderer.sendToHost('battle-opponents-detected', {
                        trainerName: trainerName,
                        trainerTitle: trainerTitle,
                        roster: roster,
                        userTeam: userTeam,
                        isPreparationScreen: true,
                        isInActiveBattle: false,
                        battleUrl: window.location.pathname + window.location.search,
                        isManualCheck: !!isManualCheck
                    });
                    return;
                }
            }
        }

        // Mode 1B: Challenge / Arena Preview Screen (e.g. G-Max Challenge / Arena)
        if (!teamLeft) {
            const pageText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
            const challengeMatch = pageText.match(/(?:Your\s+(?:First|Next|\d+(?:st|nd|rd|th))?\s+Opponent\s+is|Opponent\s+is)\s*[\r\n\s]*([A-Za-z0-9\s\-_]+?)(?:\s*[\r\n\s]*who\s+has|\s*[\r\n]|$)/i);
            if (challengeMatch && challengeMatch[1]) {
                const trainerName = challengeMatch[1].trim();
                const isGmax = /g[- ]?max/i.test(pageText) || (path.indexOf('gmax') !== -1) || /completed\s+\d+\s+of\s+\d+\s+battles/i.test(pageText);
                const trainerTitle = isGmax ? `${trainerName} (G-Max Challenge)` : `${trainerName} (Challenge Arena)`;

                const roster = [];
                const candidateCards = Array.from(document.querySelectorAll('.row, .card, .viewpoketable, .teamwrap > div, .showteam > div, div[class*="pokemon"], div[class*="poke"]'));
                let cardElements = candidateCards;
                if (cardElements.length === 0) {
                    const allTbtns = document.querySelectorAll('i.tbtn, .tbtn');
                    const parents = new Set();
                    for (let t = 0; t < allTbtns.length; t++) {
                        const p = allTbtns[t].closest('div[style*="border"], div[class*="box"], div[class*="col"], div, li');
                        if (p) parents.add(p);
                    }
                    cardElements = Array.from(parents);
                }

                const seenNames = new Set();
                for (let c = 0; c < cardElements.length; c++) {
                    const cardEl = cardElements[c];
                    const img = cardEl.querySelector('img');
                    const tBtns = cardEl.querySelectorAll('i.tbtn, .tbtn, span.type');
                    if (!img || tBtns.length === 0) continue;

                    let pName = '';
                    const nameEl = cardEl.querySelector('h4, .name, .nnfield, [data-name]');
                    if (nameEl) {
                        pName = (nameEl.getAttribute('data-name') || nameEl.textContent || '').trim();
                    }
                    if (!pName) {
                        pName = (img.getAttribute('alt') || img.getAttribute('title') || '').trim();
                    }
                    if (!pName) {
                        const lines = (cardEl.textContent || '').split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
                        if (lines.length > 0) pName = lines[0];
                    }
                    if (!pName || seenNames.has(pName.toLowerCase())) continue;
                    seenNames.add(pName.toLowerCase());

                    const types = [];
                    for (let j = 0; j < tBtns.length; j++) {
                        const t = tBtns[j].getAttribute('title') || tBtns[j].textContent.trim();
                        if (t && types.indexOf(t) === -1) types.push(t);
                    }

                    const moves = [];
                    const moveEls = cardEl.querySelectorAll('.attk > div, a[href*="/moves/"], .moves span');
                    for (let m = 0; m < moveEls.length; m++) {
                        const mv = moveEls[m].textContent.trim();
                        if (mv && moves.indexOf(mv) === -1) moves.push(mv);
                    }

                    let pVariant = 'Normal';
                    const knownVariants = ['Normal', 'Shiny', 'Metallic', 'Ghostly', 'Dark', 'Shadow', 'Mirage', 'Retro', 'Chrome', 'Negative'];
                    for (let kv = 0; kv < knownVariants.length; kv++) {
                        const vName = knownVariants[kv];
                        if (new RegExp('^' + vName + '\\b', 'i').test(pName) || (img && (img.src || '').toLowerCase().includes('/' + vName.toLowerCase() + '/'))) {
                            pVariant = vName;
                            break;
                        }
                    }

                    roster.push({
                        name: pName,
                        variant: pVariant,
                        types: types.length > 0 ? types : ['Normal'],
                        level: 100,
                        hp: 400,
                        maxHp: 400,
                        isFainted: false,
                        moves: moves,
                        sprite: img ? (img.getAttribute('src') || '') : ''
                    });
                    if (roster.length >= 6) break;
                }

                if (roster.length > 0) {
                    const previewSig = `PREVIEW:${trainerName}:${roster.map(p => p.name).join(',')}`;
                    if (!isManualCheck && previewSig === lastBroadcastBattleSig) {
                        return;
                    }
                    lastBroadcastBattleSig = previewSig;
                    ipcRenderer.sendToHost('battle-opponents-detected', {
                        trainerName: trainerName,
                        trainerTitle: trainerTitle,
                        roster: roster,
                        isPreparationScreen: true,
                        isChallengePreview: true,
                        isGmaxChallenge: isGmax,
                        isChallengeLocked: true,
                        isInActiveBattle: false,
                        battleUrl: window.location.pathname + window.location.search,
                        isManualCheck: !!isManualCheck
                    });
                    return;
                }
            }
        }

        // Mode 3: Post-Battle / Victory Screen (#viewpokes .viewpoketable)
        const viewPokes = document.getElementById('viewpokes');
        const notifyDone = document.querySelector('.notify_done');
        if (viewPokes && notifyDone) {
            const notifText = notifyDone.textContent || '';
            const tMatch = notifText.match(/defeated\s+<b>?(.+?)<\/b>?\./i) || notifText.match(/defeated\s+(.+?)\./i);
            const trainerName = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : '';

            const pTables = viewPokes.querySelectorAll('.viewpoketable');
            if (pTables && pTables.length > 0 && trainerName) {
                const roster = [];
                for (let k = 0; k < pTables.length; k++) {
                    const table = pTables[k];
                    const h4 = table.querySelector('h4');
                    const pName = h4 ? h4.textContent.trim() : '';
                    if (!pName) continue;

                    const types = [];
                    const itypes = table.querySelectorAll('.itype i.tbtn, i.tbtn');
                    for (let j = 0; j < itypes.length; j++) {
                        const t = itypes[j].getAttribute('title');
                        if (t && types.indexOf(t) === -1) types.push(t);
                    }

                    let level = 100;
                    const bEls = table.querySelectorAll('b');
                    for (let b = 0; b < bEls.length; b++) {
                        if (bEls[b].textContent.indexOf('Level:') !== -1 && bEls[b].nextSibling) {
                            const lNum = parseInt(bEls[b].nextSibling.textContent.trim(), 10);
                            if (!isNaN(lNum)) level = lNum;
                        }
                    }

                    const img = table.querySelector('.vpname img');
                    const sprite = img ? (img.getAttribute('src') || '') : '';

                    roster.push({
                        name: pName,
                        types: types.length > 0 ? types : ['Normal'],
                        level: level,
                        sprite: sprite
                    });
                }

                if (roster.length > 0) {
                    ipcRenderer.sendToHost('battle-opponents-detected', {
                        trainerName: trainerName,
                        trainerTitle: trainerName + "'s Team",
                        roster: roster,
                        isVictoryScreen: true,
                        battleUrl: window.location.pathname + window.location.search,
                        isManualCheck: !!isManualCheck
                    });
                }
            }
        }

        // Mode 4: NPC Profile Page (/npc/*)
        if (path.indexOf('/npc/') !== -1) {
            const h1 = document.querySelector('h1');
            const trainerName = h1 ? h1.textContent.replace(/^NPC:?\s*/i, '').trim() : '';
            const pItems = document.querySelectorAll('.viewpoketable, .battlelistitem, .pokemon');
            if (trainerName && pItems.length > 0) {
                const roster = [];
                for (let i = 0; i < pItems.length; i++) {
                    const el = pItems[i];
                    const nameEl = el.querySelector('h4, .smallcaps, .batname span');
                    const pName = nameEl ? nameEl.textContent.trim() : '';
                    if (!pName) continue;
                    const types = [];
                    const tBtns = el.querySelectorAll('i.tbtn');
                    for (let j = 0; j < tBtns.length; j++) {
                        const t = tBtns[j].getAttribute('title');
                        if (t && types.indexOf(t) === -1) types.push(t);
                    }
                    const img = el.querySelector('img');
                    roster.push({
                        name: pName,
                        types: types.length > 0 ? types : ['Normal'],
                        level: 100,
                        sprite: img ? (img.getAttribute('src') || '') : ''
                    });
                }
                if (roster.length > 0) {
                    const battleUrl = window.location.pathname.replace('/npc/', '/battle/trainer/');
                    ipcRenderer.sendToHost('battle-opponents-detected', {
                        trainerName: trainerName,
                        trainerTitle: trainerName,
                        roster: roster,
                        battleUrl: battleUrl,
                        isManualCheck: !!isManualCheck
                    });
                }
            }
        }

        // Mode 5: Full Player Profile Page (/profile/*, /user/*, or #viewuteam on page) - ONLY when user clicks "Check Active Screen"
        if (isManualCheck && (path.indexOf('/profile') !== -1 || path.indexOf('/user/') !== -1 || document.getElementById('viewuteam'))) {
            const meta = extractProfileMetadataFromContainer(document);
            if (!meta.username) {
                const pm = (window.location.pathname || '').match(/\/(?:profile\/u|user)\/([^/?#]+)/i);
                if (pm) {
                    try { meta.username = decodeURIComponent(pm[1]); } catch (_) { meta.username = pm[1]; }
                }
            }
            const roster = extractRosterFromProfileDocument(document);
            if (roster.length > 0) {
                const targetName = meta.username || 'Stalked Player';
                const bUrl = meta.battleUrl || ('/battle/user/username/' + encodeURIComponent(targetName));
                ipcRenderer.sendToHost('battle-opponents-detected', {
                    trainerName: targetName,
                    trainerTitle: targetName + "'s Profile",
                    roster: roster,
                    battleUrl: bUrl,
                    isProfileStalk: true,
                    isManualCheck: true
                });
            }
        }
    } catch (err) {
        console.warn('[PokePreload] Error detecting battle opponent:', err);
    }
}

ipcRenderer.on('check-battle-opponents', () => {
    detectBattleOpponents(true);
    if (typeof syncEvolveCardState === 'function') {
        syncEvolveCardState(true);
    }
});

ipcRenderer.on('apply-ai-battle-action', (event, data) => {
    if (!data || !data.action) return;
    try {
        if (data.action === 'select-lead-and-start') {
            const teamRight = document.getElementById('teamright');
            let targetRadio = null;
            const targetName = (data.pokemonName || '').toLowerCase().trim();
            const targetClean = targetName.replace(/[^a-z0-9]/g, '');
            if (teamRight) {
                const rItems = teamRight.querySelectorAll('.battlelistitem');
                for (let i = 0; i < rItems.length; i++) {
                    const item = rItems[i];
                    const itemTxt = (item.textContent || '').toLowerCase();
                    const itemClean = itemTxt.replace(/[^a-z0-9]/g, '');
                    if (targetClean && (itemTxt.indexOf(targetName) !== -1 || itemClean.indexOf(targetClean) !== -1 || targetClean.indexOf(itemClean) !== -1)) {
                        targetRadio = item.querySelector('input[type="radio"]');
                        break;
                    }
                }
            }
            if (!targetRadio) {
                const allRadios = document.querySelectorAll('input[type="radio"]');
                for (let i = 0; i < allRadios.length; i++) {
                    const r = allRadios[i];
                    const p = r.parentElement ? (r.parentElement.textContent || '').toLowerCase() : '';
                    const pClean = p.replace(/[^a-z0-9]/g, '');
                    if (targetClean && (p.indexOf(targetName) !== -1 || pClean.indexOf(targetClean) !== -1 || targetClean.indexOf(pClean) !== -1)) {
                        targetRadio = r;
                        break;
                    }
                }
            }
            if (targetRadio) {
                targetRadio.checked = true;
                targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
                targetRadio.dispatchEvent(new Event('input', { bubbles: true }));
                dispatchHumanClick(targetRadio);
            }

            const autoStart = data.autoStart !== false;
            if (autoStart) {
                const submitDelay = data.delay || 250;
                setTimeout(() => {
                    let startBtn = document.querySelector('input[type="submit"][value*="Start Battle" i], input[value*="Start Battle" i], button[type="submit"]');
                    if (!startBtn) {
                        const allButtons = document.querySelectorAll('input[type="submit"], input[type="button"], button');
                        for (let b = 0; b < allButtons.length; b++) {
                            const bTxt = ((allButtons[b].value || '') + ' ' + (allButtons[b].textContent || '')).toLowerCase();
                            if (bTxt.indexOf('switch') !== -1) continue;
                            if (bTxt.indexOf('start battle') !== -1 || bTxt.indexOf('battle!') !== -1 || bTxt.indexOf('continue') !== -1) {
                                startBtn = allButtons[b];
                                break;
                            }
                        }
                    }
                    if (startBtn) {
                        dispatchHumanClick(startBtn, () => {
                            ipcRenderer.sendToHost('ai-battle-action-status', {
                                success: true,
                                action: 'select-lead-and-start',
                                pokemon: data.pokemonName,
                                message: 'Deployed ' + (data.pokemonName || 'Lead') + ' and started battle.'
                            });
                        });
                    }
                }, submitDelay);
            } else {
                ipcRenderer.sendToHost('ai-battle-action-status', {
                    success: true,
                    action: 'select-lead',
                    pokemon: data.pokemonName,
                    message: 'Selected lead ' + (data.pokemonName || 'Lead')
                });
            }
        } else if (data.action === 'click-battle-button') {
            const allButtons = document.querySelectorAll('input[type="submit"], input[type="button"], button, a.btn');
            let battleBtn = null;
            for (let b = 0; b < allButtons.length; b++) {
                const bTxt = ((allButtons[b].value || '') + ' ' + (allButtons[b].textContent || '')).toLowerCase();
                if (bTxt.indexOf('switch') !== -1) continue;
                if (bTxt.indexOf('continue') !== -1 || bTxt.indexOf('next') !== -1 || bTxt.indexOf('battle!') !== -1 || bTxt.indexOf('start battle') !== -1) {
                    battleBtn = allButtons[b];
                    break;
                }
            }
            if (battleBtn) {
                dispatchHumanClick(battleBtn, () => {
                    ipcRenderer.sendToHost('ai-battle-action-status', {
                        success: true,
                        action: 'click-battle-button',
                        message: 'Clicked ' + (battleBtn.value || battleBtn.textContent || 'Continue')
                    });
                });
            }
        } else if (data.action === 'execute-battle-move') {
            const rawTargetMove = (data.moveName || '').toLowerCase().trim();
            const cleanTargetMove = rawTargetMove.replace(/\s*\([a-z0-9]+\)/i, '').replace(/\s*\[[0-9]+\s*pwr\]/i, '').trim();
            let attackInputs = Array.from(document.querySelectorAll(
                'input[type="radio"][name="selected"], ' +
                'input[type="radio"][name*="attk" i], ' +
                'input[type="radio"][name*="attack" i], ' +
                'input[type="radio"][name*="move" i], ' +
                'input[type="radio"][name="action"], ' +
                'input[type="radio"][name="battleaction"]'
            ));
            if (attackInputs.length === 0) {
                const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
                attackInputs = allRadios.filter(r => {
                    if (r.name && /switch|pokeselect|spoke|team/i.test(r.name)) return false;
                    if (r.closest && (r.closest('#teamright') || r.closest('#switchpoke') || r.closest('.switchform') || r.closest('.switchpoke') || r.closest('[id*="switch" i]') || r.closest('[class*="switch" i]'))) return false;
                    return true;
                });
            }
            let matchedInput = null;
            for (let i = 0; i < attackInputs.length; i++) {
                const inp = attackInputs[i];
                if (inp.name && /switch|pokeselect|spoke|team/i.test(inp.name)) continue;
                if (inp.closest && (inp.closest('#teamright') || inp.closest('#switchpoke') || inp.closest('.switchform') || inp.closest('.switchpoke') || inp.closest('[id*="switch" i]') || inp.closest('[class*="switch" i]'))) {
                    continue;
                }
                const box = inp.closest ? (inp.closest('div[style*="background"], div[style*="border"], td, label, div') || inp.parentElement) : inp.parentElement;
                let labelText = '';
                if (inp.labels && inp.labels.length > 0) labelText = inp.labels[0].textContent;
                else if (inp.parentElement && inp.parentElement.tagName.toLowerCase() === 'label') labelText = inp.parentElement.textContent;
                else if (box) labelText = box.textContent || '';
                else if (inp.nextSibling && inp.nextSibling.nodeType === 3) labelText = inp.nextSibling.textContent;
                else if (inp.parentElement) labelText = inp.parentElement.textContent;
                else labelText = inp.value || '';

                labelText = labelText.toLowerCase().trim();
                const cleanLabel = labelText.replace(/\s*\([a-z0-9]+\)/i, '').replace(/\s*\[[0-9]+\s*pwr\]/i, '').replace(/\s+/g, ' ').trim();

                if (cleanTargetMove && (labelText.indexOf(cleanTargetMove) !== -1 || cleanLabel.indexOf(cleanTargetMove) !== -1 || cleanTargetMove.indexOf(cleanLabel) !== -1 || (inp.value && inp.value.toLowerCase() === cleanTargetMove))) {
                    matchedInput = inp;
                    break;
                }
            }
            if (!matchedInput && attackInputs.length > 0) {
                for (let i = 0; i < attackInputs.length; i++) {
                    const inp = attackInputs[i];
                    if (inp.name && /switch|pokeselect|spoke|team/i.test(inp.name)) continue;
                    if (!inp.closest || (!inp.closest('#teamright') && !inp.closest('#switchpoke') && !inp.closest('.switchform') && !inp.closest('.switchpoke') && !inp.closest('[id*="switch" i]') && !inp.closest('[class*="switch" i]'))) {
                        matchedInput = inp;
                        break;
                    }
                }
            }

            if (matchedInput) {
                if (matchedInput.type === 'radio') {
                    matchedInput.checked = true;
                    matchedInput.dispatchEvent(new Event('input', { bubbles: true }));
                    matchedInput.dispatchEvent(new Event('change', { bubbles: true }));
                    try { matchedInput.click(); } catch (_) {}
                }

                // Locate the visible, clickable DelugeRPG Attack submit button
                let atkSubmit = null;
                const candidates = [];
                const searchScopes = (matchedInput && matchedInput.form) ? [matchedInput.form, document] : [document];
                for (let sc = 0; sc < searchScopes.length; sc++) {
                    const scope = searchScopes[sc];
                    const found = Array.from(scope.querySelectorAll(
                        'input[type="submit"], button[type="submit"], input[type="button"], button, a.btn, input.btn, [role="button"]'
                    )).filter(el => {
                        if (!el) return false;
                        const t = (el.type || '').toLowerCase();
                        if (t === 'hidden' || t === 'radio' || t === 'checkbox') return false;
                        const combined = ((el.value || '') + ' ' + (el.textContent || '') + ' ' + (el.name || '') + ' ' + (el.id || '')).toLowerCase();
                        if (combined.includes('switch') || combined.includes('item') || combined.includes('potion')) return false;
                        return true;
                    });
                    found.forEach(f => {
                        if (!candidates.includes(f)) candidates.push(f);
                    });

                    // 1. Explicit Attack button by value, text, name, or id
                    atkSubmit = found.find(el => {
                        const v = (el.value || '').trim().toLowerCase();
                        const txt = (el.textContent || '').trim().toLowerCase();
                        const nm = (el.name || '').trim().toLowerCase();
                        const id = (el.id || '').trim().toLowerCase();
                        return v === 'attack' || v.includes('attack') || txt === 'attack' || txt.includes('attack') || nm === 'attk' || nm.includes('attack') || id.includes('attack');
                    });
                    if (atkSubmit) break;

                    // 2. If inside the form, take the first non-switch submit button
                    if (scope === matchedInput.form && found.length > 0) {
                        atkSubmit = found.find(el => (el.type || '').toLowerCase() === 'submit' || el.tagName.toLowerCase() === 'button');
                        if (atkSubmit) break;
                    }
                }

                const targetForm = atkSubmit ? (atkSubmit.form || (matchedInput ? matchedInput.form : null)) : (matchedInput ? matchedInput.form : null);

                // Forward bot action execution telemetry to terminal
                ipcRenderer.sendToHost('battle-action-tracked', {
                    event: 'bot-action-detail',
                    action: 'execute-battle-move',
                    targetMove: data.moveName,
                    matchedRadio: matchedInput ? `<input type="${matchedInput.type}" name="${matchedInput.name}" value="${matchedInput.value}">` : 'NONE',
                    submitBtn: atkSubmit ? `<${atkSubmit.tagName} name="${atkSubmit.name || ''}" type="${atkSubmit.type || ''}" value="${atkSubmit.value || atkSubmit.textContent || ''}" id="${atkSubmit.id || ''}">` : 'NONE',
                    targetForm: targetForm ? `id="${targetForm.id || ''}" action="${targetForm.getAttribute('action') || ''}"` : 'NONE',
                    candidates: candidates.map(c => `<${c.tagName} name="${c.name || ''}" type="${c.type || ''}" val="${c.value || c.textContent || ''}">`)
                });

                if (atkSubmit) {
                    dispatchHumanClick(atkSubmit, () => {
                        // Fallback: If form submission did not fire from click, requestSubmit directly
                        if (targetForm && typeof targetForm.requestSubmit === 'function') {
                            try { targetForm.requestSubmit(atkSubmit); } catch (_) {}
                        }
                        ipcRenderer.sendToHost('ai-battle-action-status', {
                            success: true,
                            action: 'execute-battle-move',
                            move: data.moveName,
                            message: 'Cast optimal move ' + (data.moveName || 'Attack')
                        });
                    });
                } else if (targetForm) {
                    try {
                        if (typeof targetForm.requestSubmit === 'function') {
                            targetForm.requestSubmit();
                        } else {
                            targetForm.submit();
                        }
                        ipcRenderer.sendToHost('ai-battle-action-status', {
                            success: true,
                            action: 'execute-battle-move',
                            move: data.moveName,
                            message: 'Submitted attack form for ' + (data.moveName || 'Attack')
                        });
                    } catch (_) {
                        ipcRenderer.sendToHost('ai-battle-action-status', {
                            success: false,
                            action: 'execute-battle-move',
                            message: 'Could not find Attack button on screen'
                        });
                    }
                } else {
                    ipcRenderer.sendToHost('ai-battle-action-status', {
                        success: false,
                        action: 'execute-battle-move',
                        message: 'Could not find Attack button on screen'
                    });
                }
            } else {
                // Turn transition fallback: If no attack inputs, click Continue / Next (NEVER switch)
                const allButtons = document.querySelectorAll('input[type="submit"], input[type="button"], button, a.btn');
                let fallbackBtn = null;
                for (let b = 0; b < allButtons.length; b++) {
                    const bTxt = ((allButtons[b].value || '') + ' ' + (allButtons[b].textContent || '')).toLowerCase();
                    if (bTxt.indexOf('switch') !== -1) continue;
                    if (bTxt.indexOf('continue') !== -1 || bTxt.indexOf('next') !== -1) {
                        fallbackBtn = allButtons[b];
                        break;
                    }
                }
                if (fallbackBtn) {
                    dispatchHumanClick(fallbackBtn, () => {
                        ipcRenderer.sendToHost('ai-battle-action-status', {
                            success: true,
                            action: 'execute-battle-move',
                            move: 'Continue',
                            message: 'Turn transition: Clicked ' + (fallbackBtn.value || fallbackBtn.textContent || 'Continue')
                        });
                    });
                }
            }
        }
    } catch (err) {
        console.warn('[AI Action Error]:', err);
    }
});

// --- 7. LIVE PLAYER SCOUT ENGINE ---
function extractRosterFromProfileJson(data) {
    if (!data || !data.team || data.team === 'nodisplay' || data.status === 'noteam') return [];
    const roster = [];
    const teamArr = Array.isArray(data.team) ? data.team : Object.values(data.team);
    for (let i = 0; i < teamArr.length; i++) {
        const m = teamArr[i];
        if (!m || !m.name) continue;
        const types = [];
        if (m.type1 && m.type1 !== 0 && m.type1 !== '0') {
            const t1 = String(m.type1).trim();
            if (t1) types.push(t1.charAt(0).toUpperCase() + t1.slice(1).toLowerCase());
        }
        if (m.type2 && m.type2 !== 0 && m.type2 !== '0') {
            const t2 = String(m.type2).trim();
            if (t2) {
                const normT2 = t2.charAt(0).toUpperCase() + t2.slice(1).toLowerCase();
                if (types.indexOf(normT2) === -1) types.push(normT2);
            }
        }
        const level = parseInt(String(m.level || '100').replace(/,/g, ''), 10) || 100;
        const moves = [m.attack1, m.attack2, m.attack3, m.attack4]
            .map(a => (a ? String(a).trim() : ''))
            .filter(Boolean);
        roster.push({
            name: String(m.name).trim(),
            types: types.length > 0 ? types : ['Normal'],
            level: level,
            sprite: m.img_loc || '',
            moves: moves
        });
    }
    return roster;
}

function extractRosterFromProfileDocument(doc) {
    if (!doc || !doc.querySelectorAll) return [];
    const roster = [];

    // 1. DelugeRPG Player Profile Team (#viewuteam li.viewuteammember inside #DModal or /profile/*)
    const uTeamItems = doc.querySelectorAll('#viewuteam li, .viewuteammember');
    if (uTeamItems && uTeamItems.length > 0) {
        for (let i = 0; i < uTeamItems.length; i++) {
            const li = uTeamItems[i];
            const h4 = li.querySelector('.name h4, h4');
            const img = li.querySelector('.name img, img');
            const name = (h4 ? h4.textContent.trim() : '') || (img ? (img.getAttribute('alt') || img.getAttribute('title') || '').trim() : '');
            if (!name) continue;

            const types = [];
            const tBtns = li.querySelectorAll('i.tbtn');
            for (let j = 0; j < tBtns.length; j++) {
                let t = tBtns[j].getAttribute('title');
                if (!t) {
                    const cls = tBtns[j].className || '';
                    const cm = cls.match(/tbtn-([a-z]+)/i);
                    if (cm && cm[1].toLowerCase() !== 'mini') t = cm[1];
                }
                if (t) {
                    const normT = t.trim().charAt(0).toUpperCase() + t.trim().slice(1).toLowerCase();
                    if (types.indexOf(normT) === -1) types.push(normT);
                }
            }
            if (types.length === 0 && li.className) {
                const clm = li.className.match(/typeclr-([a-z]+)/i);
                if (clm) {
                    types.push(clm[1].charAt(0).toUpperCase() + clm[1].slice(1).toLowerCase());
                }
            }

            let level = 100;
            const txt = li.textContent || '';
            const lm = txt.match(/Level:\s*([0-9,]+)/i);
            if (lm) {
                const parsedLvl = parseInt(lm[1].replace(/,/g, ''), 10);
                if (!isNaN(parsedLvl)) level = parsedLvl;
            }

            const sprite = img ? (img.getAttribute('src') || '') : '';
            const moves = [];
            const moveDivs = li.querySelectorAll('.attk div');
            for (let m = 0; m < moveDivs.length; m++) {
                const mv = (moveDivs[m].textContent || '').trim();
                if (mv) moves.push(mv);
            }

            roster.push({
                name: name,
                types: types.length > 0 ? types : ['Normal'],
                level: level,
                sprite: sprite,
                moves: moves
            });
        }
        if (roster.length > 0) return roster;
    }

    // 2. Post-Battle / Profile Tables (.viewpoketable)
    const tables = doc.querySelectorAll('.viewpoketable');
    if (tables && tables.length > 0) {
        for (let i = 0; i < tables.length; i++) {
            const tbl = tables[i];
            const h4 = tbl.querySelector('h4');
            const name = h4 ? h4.textContent.trim() : '';
            if (!name) continue;

            const types = [];
            const typeBtns = tbl.querySelectorAll('.itype i.tbtn, i.tbtn');
            for (let j = 0; j < typeBtns.length; j++) {
                const t = typeBtns[j].getAttribute('title');
                if (t && types.indexOf(t) === -1) types.push(t);
            }

            let level = 100;
            const bEls = tbl.querySelectorAll('b');
            for (let b = 0; b < bEls.length; b++) {
                if (bEls[b].textContent.indexOf('Level:') !== -1 && bEls[b].nextSibling) {
                    const lNum = parseInt(bEls[b].nextSibling.textContent.trim().replace(/,/g, ''), 10);
                    if (!isNaN(lNum)) level = lNum;
                }
            }

            const img = tbl.querySelector('.vpname img, img');
            const sprite = img ? (img.getAttribute('src') || '') : '';

            const moves = [];
            const moveDivs = tbl.querySelectorAll('.attk div');
            for (let m = 0; m < moveDivs.length; m++) {
                const mv = (moveDivs[m].textContent || '').trim();
                if (mv) moves.push(mv);
            }

            roster.push({
                name: name,
                types: types.length > 0 ? types : ['Normal'],
                level: level,
                sprite: sprite,
                moves: moves
            });
        }
        if (roster.length > 0) return roster;
    }

    // 3. Team Editor / Indbox Cards (#teamlist li, .indbox)
    const items = doc.querySelectorAll('#teamlist li, .indbox');
    if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const nameEl = item.querySelector('.name, h4, .smallcaps');
            const name = nameEl ? nameEl.textContent.trim() : '';
            if (!name) continue;

            const types = [];
            const row = item.querySelector('.row');
            if (row && row.getAttribute('data-pktype')) {
                types.push(row.getAttribute('data-pktype'));
            }
            const tBtns = item.querySelectorAll('i.tbtn');
            for (let j = 0; j < tBtns.length; j++) {
                const t = tBtns[j].getAttribute('title');
                if (t && types.indexOf(t) === -1) types.push(t);
            }

            let level = 100;
            const text = item.textContent || '';
            const m = text.match(/Level:\s*([0-9,]+)/i);
            if (m) level = parseInt(m[1].replace(/,/g, ''), 10);

            const img = item.querySelector('img');
            const sprite = img ? (img.getAttribute('src') || '') : '';

            roster.push({
                name: name,
                types: types.length > 0 ? types : ['Normal'],
                level: level,
                sprite: sprite
            });
        }
        if (roster.length > 0) return roster;
    }

    // 4. Battle List Items (.battlelistitem, .pokemon)
    const pokes = doc.querySelectorAll('.battlelistitem, .pokemon');
    if (pokes && pokes.length > 0) {
        for (let i = 0; i < pokes.length; i++) {
            const el = pokes[i];
            const nameEl = el.querySelector('.batname span, .smallcaps, h4');
            const name = nameEl ? nameEl.textContent.trim() : '';
            if (!name) continue;

            const types = [];
            const tBtns = el.querySelectorAll('i.tbtn');
            for (let j = 0; j < tBtns.length; j++) {
                const t = tBtns[j].getAttribute('title');
                if (t && types.indexOf(t) === -1) types.push(t);
            }

            const img = el.querySelector('img');
            const sprite = img ? (img.getAttribute('src') || '') : '';

            roster.push({
                name: name,
                types: types.length > 0 ? types : ['Normal'],
                level: 100,
                sprite: sprite
            });
        }
    }

    return roster;
}

async function scoutPlayerByUsername(rawUser, profileId, isFromScreenCheck) {
    const cleanUser = (rawUser || '').trim();
    if (!cleanUser) return;
    try {
        console.log('[PokePreload] Scouting player roster for:', cleanUser);
        if (!isFromScreenCheck) {
            ipcRenderer.sendToHost('player-scout-status', { step: 'fetching', message: `Scouting ${cleanUser}...` });
        }

        // 1. Check if the currently open #DModal already has this player's team in DOM
        const dModal = document.getElementById('DModal') || document.getElementById('DMbody');
        if (dModal && isProfileModalOpen(dModal)) {
            const meta = extractProfileMetadataFromContainer(dModal);
            if (meta.username && meta.username.toLowerCase() === cleanUser.toLowerCase()) {
                const domRoster = extractRosterFromProfileDocument(dModal);
                if (domRoster.length > 0) {
                    const bUrl = meta.battleUrl || ('/battle/user/username/' + encodeURIComponent(meta.username));
                    if (isFromScreenCheck) {
                        ipcRenderer.sendToHost('battle-opponents-detected', {
                            trainerName: meta.username,
                            trainerTitle: meta.username + "'s Profile",
                            roster: domRoster,
                            battleUrl: bUrl,
                            isProfileStalk: true,
                            isManualCheck: true
                        });
                    } else {
                        ipcRenderer.sendToHost('player-scouted-roster', {
                            username: meta.username,
                            roster: domRoster,
                            battleUrl: bUrl
                        });
                    }
                    return;
                }
            }
        }

        // 2. Try DelugeRPG AJAX Profile JSON endpoint (/ajax/profile/u/<username>)
        const endpoints = [];
        if (profileId) endpoints.push(`/ajax/profile/uid/${encodeURIComponent(profileId)}`);
        endpoints.push(`/ajax/profile/u/${encodeURIComponent(cleanUser)}`);
        endpoints.push(`/profile/u/${encodeURIComponent(cleanUser)}`);
        endpoints.push(`/user/${encodeURIComponent(cleanUser)}`);

        let lastStatus = 0;
        for (let i = 0; i < endpoints.length; i++) {
            const url = endpoints[i];
            try {
                const res = await fetch(url, {
                    credentials: 'include',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                if (!res || !res.ok) {
                    if (res) lastStatus = res.status;
                    continue;
                }
                const text = await res.text();
                if (!text) continue;

                // Attempt JSON parse first (for /ajax/profile/*)
                if (text.trim().charAt(0) === '{') {
                    try {
                        const json = JSON.parse(text);
                        if (json.status === 'nouser' || json.status === 'invalid') {
                            ipcRenderer.sendToHost('player-scout-status', { step: 'error', message: `Player "${cleanUser}" not found.` });
                            return;
                        }
                        if (json.team === 'nodisplay' || json.status === 'noteam') {
                            ipcRenderer.sendToHost('player-scout-status', { step: 'error', message: `No active team displayed on ${cleanUser}'s profile.` });
                            return;
                        }
                        const jsonRoster = extractRosterFromProfileJson(json);
                        if (jsonRoster.length > 0) {
                            const resolvedName = json.username || cleanUser;
                            const bUrl = '/battle/user/username/' + encodeURIComponent(resolvedName);
                            if (isFromScreenCheck) {
                                ipcRenderer.sendToHost('battle-opponents-detected', {
                                    trainerName: resolvedName,
                                    trainerTitle: resolvedName + "'s Profile",
                                    roster: jsonRoster,
                                    battleUrl: bUrl,
                                    isProfileStalk: true,
                                    isManualCheck: true
                                });
                            } else {
                                ipcRenderer.sendToHost('player-scouted-roster', {
                                    username: resolvedName,
                                    roster: jsonRoster,
                                    battleUrl: bUrl
                                });
                            }
                            return;
                        }
                    } catch (_) {}
                }

                // Attempt HTML DOM parse (for /profile/u/*, /user/*, or mocked HTML responses)
                const doc = new DOMParser().parseFromString(text, 'text/html');
                const roster = extractRosterFromProfileDocument(doc);
                if (roster.length > 0) {
                    const meta = extractProfileMetadataFromContainer(doc);
                    const resolvedName = meta.username || cleanUser;
                    const bUrl = meta.battleUrl || ('/battle/user/username/' + encodeURIComponent(resolvedName));
                    if (isFromScreenCheck) {
                        ipcRenderer.sendToHost('battle-opponents-detected', {
                            trainerName: resolvedName,
                            trainerTitle: resolvedName + "'s Profile",
                            roster: roster,
                            battleUrl: bUrl,
                            isProfileStalk: true,
                            isManualCheck: true
                        });
                    } else {
                        ipcRenderer.sendToHost('player-scouted-roster', {
                            username: resolvedName,
                            roster: roster,
                            battleUrl: bUrl
                        });
                    }
                    return;
                }
            } catch (_) {}
        }

        if (lastStatus === 404) {
            ipcRenderer.sendToHost('player-scout-status', { step: 'error', message: `Player "${cleanUser}" not found (${lastStatus}).` });
        } else {
            ipcRenderer.sendToHost('player-scout-status', { step: 'error', message: `No active team displayed on ${cleanUser}'s profile.` });
        }
    } catch (err) {
        console.error('[PokePreload] Scout player error:', err);
        ipcRenderer.sendToHost('player-scout-status', { step: 'error', message: `Scout error: ${err.message}` });
    }
}

ipcRenderer.on('scout-player-roster', async (event, data) => {
    const rawUser = (data && data.username || '').trim();
    if (!rawUser) return;
    await scoutPlayerByUsername(rawUser, null, false);
});

window.addEventListener('DOMContentLoaded', () => {
    const path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('/team/edit') !== -1) {
        injectTeamSaveSpy();
        try {
            const pending = sessionStorage.getItem('deluge_pending_team_slots');
            if (pending) {
                sessionStorage.removeItem('deluge_pending_team_slots');
                const parsed = JSON.parse(pending);
                const ids = parsed.ids || (Array.isArray(parsed) ? parsed : []);
                const pokes = parsed.pokemons || [];
                const isFresh = !parsed.timestamp || (Date.now() - parsed.timestamp < 60000);
                if (isFresh && Array.isArray(ids) && ids.length > 0) {
                    executeSlotAssignment(ids, pokes);
                }
            }
        } catch (_) {}
    }

    const isBattleOrChallenge = path.indexOf('/battle') !== -1 ||
                                path.indexOf('/challenge') !== -1 ||
                                path.indexOf('/arena') !== -1 ||
                                path.indexOf('/npc') !== -1 ||
                                path.indexOf('/gym') !== -1;
    if (isBattleOrChallenge) {
        detectBattleOpponents(false);
        setTimeout(() => detectBattleOpponents(false), 300);
        setTimeout(() => detectBattleOpponents(false), 800);
        setTimeout(() => detectBattleOpponents(false), 1500);
    }
});

// Real-Time Continuous Battle Telemetry Sensor (400ms interval + click responsive)
function runRealtimeBattleSensors() {
    try {
        const path = (window.location.pathname || '').toLowerCase();
        const isBattlePath = path.indexOf('/battle') !== -1 ||
                             path.indexOf('/challenge') !== -1 ||
                             path.indexOf('/arena') !== -1 ||
                             path.indexOf('/npc') !== -1 ||
                             path.indexOf('/gym') !== -1;
        const hasBattleDom = !!(document.getElementById('teamleft') ||
                                document.getElementById('opponent') ||
                                document.querySelector('form[action*="battle"]') ||
                                document.querySelector('input[value*="CONTINUE" i], input[value*="Continue" i]') ||
                                (document.body && (document.body.innerText || '').indexOf('Opponent is') !== -1));
        if (isBattlePath || hasBattleDom) {
            detectBattleOpponents(false);
        }
    } catch (_) {}
}

setInterval(runRealtimeBattleSensors, 400);

window.addEventListener('click', () => {
    setTimeout(runRealtimeBattleSensors, 150);
    setTimeout(runRealtimeBattleSensors, 450);
    setTimeout(runRealtimeBattleSensors, 900);
}, { passive: true });

// --- 7. LIVE EVOLVE CARD DETECTOR ---
let lastEvolveCardSignature = null;

function detectEvolveCard() {
    try {
        const dModal = document.getElementById('DModal');
        const dmBody = document.getElementById('DMbody');
        const modalContainer = dModal || dmBody || document.querySelector('.modal, div[id*="modal" i]');
        
        if (!modalContainer) return null;
        if (modalContainer.style && modalContainer.style.display === 'none') return null;
        const ariaHidden = modalContainer.getAttribute ? modalContainer.getAttribute('aria-hidden') : null;
        if (ariaHidden === 'true' && !(modalContainer.classList && (modalContainer.classList.contains('in') || modalContainer.classList.contains('show')))) {
            return null;
        }

        const titleEl = modalContainer.querySelector('#DMtitle, .modal-title, h1, h2, h3, h4');
        const titleText = titleEl ? (titleEl.textContent || '').trim() : '';
        const bodyText = modalContainer.textContent || '';

        const isEvolveTitle = /evolve/i.test(titleText);
        const hasEvolvePrompt = /can evolve into/i.test(bodyText);
        if (!isEvolveTitle && !hasEvolvePrompt) return null;

        const match = bodyText.match(/Your\s+(?:level\s+(\d+)\s+)?([A-Za-z0-9\s\(\)\-]+?)\s+can evolve into/i);
        if (!match) return null;

        const level = match[1] ? parseInt(match[1], 10) : 50;
        const rawFullName = match[2].trim();

        let variant = 'Normal';
        const knownVariants = ['Normal', 'Shiny', 'Metallic', 'Ghostly', 'Dark', 'Shadow', 'Mirage', 'Retro', 'Chrome', 'Negative'];
        for (let i = 0; i < knownVariants.length; i++) {
            const v = knownVariants[i];
            if (rawFullName.toLowerCase().indexOf(v.toLowerCase() + ' ') === 0) {
                variant = v;
                break;
            }
        }

        let baseSpecies = rawFullName;
        if (variant !== 'Normal' && baseSpecies.toLowerCase().indexOf(variant.toLowerCase() + ' ') === 0) {
            baseSpecies = baseSpecies.substring(variant.length + 1).trim();
        }
        baseSpecies = baseSpecies.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();

        const options = [];
        const radios = modalContainer.querySelectorAll('input[type="radio"]');
        if (radios && radios.length > 0) {
            for (let i = 0; i < radios.length; i++) {
                const radio = radios[i];
                let labelText = '';
                if (radio.id) {
                    const lbl = modalContainer.querySelector(`label[for="${radio.id}"]`);
                    if (lbl) labelText = (lbl.textContent || '').trim();
                }
                if (!labelText && radio.parentElement) {
                    labelText = (radio.parentElement.textContent || '').trim();
                }
                if (!labelText && radio.nextSibling) {
                    labelText = (radio.nextSibling.textContent || '').trim();
                }
                if (labelText) {
                    const optMatch = labelText.match(/^([A-Za-z0-9\s\(\)\-]+?)(?:\s*\((.+?)\))?$/);
                    const optName = optMatch ? optMatch[1].trim() : labelText;
                    const optReq = optMatch && optMatch[2] ? optMatch[2].trim() : '';

                    const optOwnStatus = evaluateOwnershipAndMegaEquivalence(optName);

                    options.push({
                        fullName: optName,
                        requirement: optReq,
                        radioValue: radio.value,
                        isOwned: optOwnStatus ? optOwnStatus.isOwned : false,
                        hasMegaOwned: optOwnStatus ? optOwnStatus.hasMegaOwned : false,
                        ownedPokemon: optOwnStatus ? optOwnStatus.ownedPokemon : null,
                        alertMessage: optOwnStatus ? optOwnStatus.alertMessage : ''
                    });
                }
            }
        }

        if (options.length === 0) {
            const lines = bodyText.split(/[\r\n]+/);
            let afterPrompt = false;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                if (/can evolve into/i.test(line)) {
                    afterPrompt = true;
                    continue;
                }
                if (afterPrompt) {
                    if (/^(?:evolve|close|cancel)$/i.test(line)) break;
                    const m = line.match(/^([A-Za-z0-9\s\(\)\-]+?)(?:\s*\((.+?)\))?$/);
                    if (m) {
                        options.push({
                            fullName: m[1].trim(),
                            requirement: m[2] ? m[2].trim() : ''
                        });
                    }
                }
            }
        }

        let types = [];
        let moves = [];
        const pageRows = document.querySelectorAll('.row, tr, div[data-pkid]');
        for (let i = 0; i < pageRows.length; i++) {
            const row = pageRows[i];
            const rowText = row.textContent || '';
            if (rowText.indexOf(rawFullName) !== -1 || (row.getAttribute && row.getAttribute('data-name') && row.getAttribute('data-name').toLowerCase() === baseSpecies)) {
                const tBtns = row.querySelectorAll('i.tbtn, .tbtn, span.type');
                for (let j = 0; j < tBtns.length; j++) {
                    const t = tBtns[j].getAttribute('title') || tBtns[j].textContent.trim();
                    if (t && types.indexOf(t) === -1) types.push(t);
                }
                const moveLinks = row.querySelectorAll('a[href*="/moves/"], .moves span, .move');
                for (let j = 0; j < moveLinks.length; j++) {
                    const mName = moveLinks[j].textContent.trim();
                    if (mName && mName !== 'CHANGE MOVES' && moves.indexOf(mName) === -1) {
                        moves.push({ name: mName });
                    }
                }
                break;
            }
        }

        const existingEvolveBanner = modalContainer.querySelector('#deluge-evolve-uniqueness-banner');
        if (existingEvolveBanner && existingEvolveBanner.parentElement) {
            existingEvolveBanner.parentElement.removeChild(existingEvolveBanner);
        }

        return {
            isOpen: true,
            fullName: rawFullName,
            baseSpecies: baseSpecies,
            variant: variant,
            level: level,
            types: types,
            moves: moves,
            options: options
        };
    } catch (err) {
        return null;
    }
}

function syncEvolveCardState(force) {
    const card = detectEvolveCard();
    if (card) {
        const sig = `${card.fullName}:${card.level}:${card.options.map(o => o.fullName).join(',')}`;
        if (force || sig !== lastEvolveCardSignature) {
            lastEvolveCardSignature = sig;
            ipcRenderer.sendToHost('evolve-card-detected', card);
        }
    } else {
        if (lastEvolveCardSignature !== null) {
            lastEvolveCardSignature = null;
            ipcRenderer.sendToHost('evolve-card-closed');
        }
    }
}

ipcRenderer.on('check-evolve-card', () => {
    syncEvolveCardState(true);
});

setInterval(() => {
    syncEvolveCardState(false);
}, 500);

window.addEventListener('click', () => {
    setTimeout(() => syncEvolveCardState(true), 150);
    setTimeout(() => syncEvolveCardState(true), 450);
});

// --- 8. TEMPORARY HTML ACTION TRACKER FOR ACTIVE BATTLES ---
function initTemporaryBattleTracker() {
    if (window.__delugeBattleActionTrackerActive) return;
    window.__delugeBattleActionTrackerActive = true;

    function isBattleContext(el) {
        try {
            const path = (window.location.pathname || '').toLowerCase();
            if (path.indexOf('battle') !== -1) return true;
            if (document.getElementById('battle') || document.getElementById('battleform') || document.getElementById('opponent') || document.getElementById('teamleft')) return true;
            if (el && el.closest && el.closest('#battle, #battleform, #teamleft, #teamright, form[action*="battle" i]')) return true;
            if (el && el.getAttribute) {
                const n = (el.getAttribute('name') || '').toLowerCase();
                const v = (el.getAttribute('value') || '').toLowerCase();
                if (n.indexOf('attk') !== -1 || v.indexOf('attack') !== -1 || n.indexOf('switch') !== -1 || v.indexOf('switch') !== -1) return true;
            }
        } catch (_) {}
        return false;
    }

    function summarizeInputs(formEl) {
        if (!formEl || !formEl.elements) return [];
        const result = [];
        for (let i = 0; i < formEl.elements.length; i++) {
            const el = formEl.elements[i];
            if (!el || !el.name || el.type === 'password') continue;
            result.push({
                name: el.name,
                type: el.type || '',
                value: (el.value !== undefined ? String(el.value) : '').substring(0, 40),
                checked: Boolean(el.checked)
            });
            if (result.length >= 15) break;
        }
        return result;
    }

    // 1. Capture Click Events
    window.addEventListener('click', (e) => {
        try {
            const target = e.target;
            if (!target || !isBattleContext(target)) return;

            const form = target.form || (target.closest ? target.closest('form') : null);
            const tag = (target.tagName || '').toUpperCase();
            const inpType = target.type || '';
            const id = target.id || '';
            const name = target.name || '';
            const val = (target.value !== undefined ? String(target.value) : '').trim().substring(0, 50);
            const text = (target.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 60);

            ipcRenderer.sendToHost('battle-action-tracked', {
                event: 'click',
                isTrusted: Boolean(e.isTrusted),
                tag: tag,
                type: inpType,
                id: id,
                name: name,
                value: val,
                text: text,
                formId: form ? (form.id || '') : '',
                formName: form ? (form.name || '') : '',
                formAction: form ? (form.getAttribute('action') || '') : '',
                inputs: form ? summarizeInputs(form) : []
            });
        } catch (_) {}
    }, true);

    // 2. Capture Form Submissions
    window.addEventListener('submit', (e) => {
        try {
            const target = e.target;
            if (!target || !isBattleContext(target)) return;

            const form = target;
            const submitter = e.submitter;
            const subData = submitter ? {
                tag: (submitter.tagName || '').toUpperCase(),
                type: submitter.type || '',
                id: submitter.id || '',
                name: submitter.name || '',
                value: (submitter.value !== undefined ? String(submitter.value) : '').substring(0, 40)
            } : null;

            ipcRenderer.sendToHost('battle-action-tracked', {
                event: 'submit',
                isTrusted: Boolean(e.isTrusted),
                tag: (form.tagName || 'FORM').toUpperCase(),
                formId: form.id || '',
                formName: form.name || '',
                formAction: form.getAttribute('action') || '',
                formMethod: (form.getAttribute('method') || 'POST').toUpperCase(),
                submitter: subData,
                inputs: summarizeInputs(form)
            });
        } catch (_) {}
    }, true);

    // 3. Capture Radio/Checkbox/Select Changes
    window.addEventListener('change', (e) => {
        try {
            const target = e.target;
            if (!target || !isBattleContext(target)) return;

            const tag = (target.tagName || '').toUpperCase();
            const inpType = target.type || '';
            const name = target.name || '';
            const val = (target.value !== undefined ? String(target.value) : '').trim().substring(0, 50);
            const checked = Boolean(target.checked);

            ipcRenderer.sendToHost('battle-action-tracked', {
                event: 'change',
                isTrusted: Boolean(e.isTrusted),
                tag: tag,
                type: inpType,
                name: name,
                value: val,
                checked: checked
            });
        } catch (_) {}
    }, true);
}

initTemporaryBattleTracker();
