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
    autoCatch: false,
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
    levelFilterScope: 'targets'
};

let configSynced = false;
ipcRenderer.on('update-config', (event, newSettings) => {
    if (newSettings) {
        config = Object.assign({}, config, newSettings);
        configSynced = true;
        console.log('[PokePreload] Synced config:', JSON.stringify(config));
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
let isHuntingActive = false;
let catchStepInterval = null;
let activeStep = null;
let collisionCheckTimer = null;

ipcRenderer.on('hunting-state-changed', (event, state) => {
    isHuntingActive = !!(state && state.isHunting);
    if (!isHuntingActive) {
        lastFoundTarget = '';
    }
});

// --- 3. TARGET SCANNING ENGINE ---
function scanForTargets() {
    // A. Check for /unlock Honeypot / Captcha FIRST across entire domain
    const path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('/unlock') !== -1) {
        ipcRenderer.sendToHost('unlock-detected');
        return;
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

    // Helper to find the active catch or battle action element (Anchor, Button, or Submit Input)
    function findCatchActionElement() {
        // 1. Direct submit inputs, buttons, or links with catch id
        const directBtn = document.querySelector(
            'input[type="submit"]#catch, input#catch, button#catch, a#catch, ' +
            'input[type="submit"][value*="Catch" i], button[value*="Catch" i], ' +
            'form[action*="catch"] input[type="submit"], form[action*="catch"] button'
        );
        if (directBtn) {
            try {
                const st = window.getComputedStyle(directBtn);
                if (st.display !== 'none' && st.visibility !== 'hidden') return directBtn;
            } catch (_) { return directBtn; }
        }

        // 2. Scan all candidate interactive elements (anchors, buttons, submit inputs)
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

            // Match "Try to Catch It", "Try to Catch", "Catch It", "Start Battle", exact "Catch"
            if (text.indexOf('try to catch') !== -1 || val.indexOf('try to catch') !== -1 ||
                text.indexOf('catch it') !== -1 || val.indexOf('catch it') !== -1 ||
                text === 'catch' || val === 'catch' ||
                text.indexOf('start battle') !== -1 || val.indexOf('start battle') !== -1 ||
                text.indexOf('throw pokeball') !== -1 || val.indexOf('throw pokeball') !== -1) {
                return el;
            }

            // Match href containing /catch, catch.php, catch?
            if (href && (href.indexOf('/catch') !== -1 || href.indexOf('catch.php') !== -1 || href.indexOf('catch?') !== -1)) {
                return el;
            }

            // Match ID
            if (id === 'catch' || id === 'catch-btn' || id === 'btn-catch') {
                return el;
            }
        }
        return null;
    }

    // Helper to locate enclosing wild encounter container
    function getEncounterContainer() {
        const catchBtn = findCatchActionElement();
        if (catchBtn) {
            const parent = catchBtn.closest('#showpoke, .showpoke, #showpoke-name, #dexy, .dexy, .catch-form, form, [class*="encounter" i], [id*="encounter" i], .card, .panel, .box, div') || catchBtn.parentElement;
            if (parent) return parent;
        }

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

            // Check for wild Pokemon sprite across all DelugeRPG image CDNs
            const pokeImg = box.querySelector('img[src*="/pokemon/"], img[src*="/sprites/"], img[src*="/dex/"], img[src*="/regular/"], img[src*="/shiny/"], img[src*="/retro/"], img[src*="/chrome/"], img[src*="/metallic/"], img[src*="/shadow/"], img[src*="/ghostly/"], img[src*="/dark/"], img[src*="/mirage/"], img[src*="/negative/"], img[src*="delugerpg"]');
            if (pokeImg) {
                return box;
            }

            // Check for inner catch/battle buttons or links
            const innerElements = box.querySelectorAll('a, button, input');
            for (let e = 0; e < innerElements.length; e++) {
                const inner = innerElements[e];
                const innerText = ((inner.textContent || '') + ' ' + (inner.value || '') + ' ' + (inner.getAttribute('href') || '')).toLowerCase();
                if (innerText.indexOf('catch') !== -1 || innerText.indexOf('battle') !== -1) {
                    return box;
                }
            }

            // If the box contains any known Legendary or Mega, confirm encounter immediately!
            if (findLegend) {
                for (let k = 0; k < LEGENDARY_LOWER.length; k++) {
                    if (normText.indexOf(LEGENDARY_LOWER[k]) !== -1) {
                        return box;
                    }
                }
            }
            if (findMegas) {
                for (let m = 0; m < MEGAS_LOWER.length; m++) {
                    if (normText.indexOf(MEGAS_LOWER[m]) !== -1) {
                        return box;
                    }
                }
            }

            // Confirm encounter keywords
            if (normText.indexOf('appeared') !== -1 ||
                normText.indexOf('wild') !== -1 ||
                normText.indexOf('level') !== -1 ||
                normText.indexOf('lvl') !== -1 ||
                normText.indexOf('catch') !== -1 ||
                normText.indexOf('battle') !== -1 ||
                normText.indexOf('hp:') !== -1) {
                return box;
            }
        }

        // Generic search for any element containing "appeared!" (e.g. "Yveltal Appeared!")
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

        return null;
    }

    // B. Check if wild encounter or catch UI is present
    function isEncounterOrCatchUIPresent() {
        if (findCatchActionElement() !== null) {
            return true;
        }

        const container = getEncounterContainer();
        if (container !== null) {
            return true;
        }

        return false;
    }

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

    // Helper: checks whether the encounter's variant is accepted for target species (Tier 1-3)
    // Priority Target Invariant: Wild Legendaries, Megas, and custom targets are always accepted regardless of variant filter
    function isVariantAcceptedForSpecies() {
        return true;
    }

    const varPrefix = (detectedVariant !== 'normal') ? (detectedVariant.toUpperCase() + ' ') : '';

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
                }
            }
        }
    }

    // 4. Tier 4: Special Sprite Variants (Generic Wild Pokemon)
    // Only active when generic variants hunting is enabled (presets: 'all', 'variants', 'shinies', or custom with variants).
    // In species-restricted presets ('legendaries', 'megas', 'legend_megas'), generic wild Pokemon (e.g. Ghostly Indeedee, Chrome Rattata) are strictly IGNORED!
    const isSpeciesRestricted = config.targetPreset === 'legendaries' || config.targetPreset === 'megas' || config.targetPreset === 'legend_megas';
    const allowGenericVariants = findAnyVariant && !isSpeciesRestricted;

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
    lastFoundTarget = targetName;
    isHuntingActive = false;

    console.log('[PokePreload] TARGET DETECTED:', targetName, '(' + category + ')');

    const isAutoCatch = !!config.autoCatch;

    ipcRenderer.sendToHost('target-found', {
        name: targetName,
        category: category,
        autoCatch: isAutoCatch
    });

    try {
        sessionStorage.setItem('pokefinder_target', targetName);
        sessionStorage.removeItem('pokefinder_ball_thrown');
    } catch (_) {}

    if (isAutoCatch) {
        const catchBtn = findCatchActionElement() || document.querySelector('input[type="submit"][id="catch"], input#catch, button#catch, input[value*="Catch"], input[value*="Try to Catch"], a#catch, #showpoke a, a[href*="/catch/"]');
        if (catchBtn) {
            catchBtn.click();
        }
        startCatchSequence();
    }
}

// --- 5. SMART CATCH SEQUENCE ---
function startCatchSequence() {
    if (catchStepInterval) clearInterval(catchStepInterval);
    let attempts = 0;

    catchStepInterval = setInterval(function() {
        attempts++;
        if (attempts > 80) {
            clearInterval(catchStepInterval);
            return;
        }

        let ballWasThrown = false;
        try {
            ballWasThrown = sessionStorage.getItem('pokefinder_ball_thrown') === 'true';
        } catch (_) {}

        if (ballWasThrown) {
            const bodyText = (document.body ? document.body.textContent || '' : '').toLowerCase();
            const isConfirmed = bodyText.indexOf('was caught') !== -1 ||
                                bodyText.indexOf('captured') !== -1 ||
                                bodyText.indexOf('you threw a') !== -1;

            const allLinksAndButtons = Array.from(document.querySelectorAll('a, input[type="submit"], input[type="button"], button'));
            const returnBtn = allLinksAndButtons.find(function(el) {
                const text = ((el.textContent || '') + ' ' + (el.value || '')).trim().toLowerCase();
                return text === 'return to map' || text.indexOf('return to map') !== -1;
            });

            if (isConfirmed || returnBtn) {
                clearInterval(catchStepInterval);
                try {
                    sessionStorage.removeItem('pokefinder_target');
                    sessionStorage.removeItem('pokefinder_ball_thrown');
                } catch (_) {}

                if (returnBtn) {
                    returnBtn.click();
                } else if (window.location.pathname.indexOf('/map') === -1) {
                    window.location.href = '/map';
                }

                setTimeout(() => {
                    ipcRenderer.sendToHost('resume-hunting');
                }, 1200);
                return;
            }
        }

        const startBattleBtn = document.querySelector('input[type="submit"][value*="Start Battle"], input[value*="Start Battle"], button[value*="Start Battle"]');
        if (startBattleBtn && window.getComputedStyle(startBattleBtn).display !== 'none') {
            startBattleBtn.click();
            return;
        }

        let throwBtn = null;
        const submitButtons = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button'));
        for (let b = 0; b < submitButtons.length; b++) {
            const btn = submitButtons[b];
            const btnText = ((btn.value || '') + ' ' + (btn.textContent || '')).trim().toLowerCase();
            if (btnText.indexOf('throw') !== -1 && btnText.indexOf('ball') !== -1) {
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

        function getRadioDescriptor(radio) {
            let desc = (radio.value || '') + ' ' + (radio.id || '') + ' ' + (radio.name || '') + ' ';
            if (radio.labels && radio.labels.length) {
                for (let l = 0; l < radio.labels.length; l++) {
                    desc += ' ' + radio.labels[l].textContent;
                }
            }
            if (radio.id) {
                const forLabel = document.querySelector('label[for="' + radio.id + '"]');
                if (forLabel) desc += ' ' + forLabel.textContent;
            }
            const cell = radio.closest ? radio.closest('td, th, label, li') : null;
            if (cell && cell.querySelectorAll('input[type="radio"]').length === 1) {
                desc += ' ' + cell.textContent;
            } else if (radio.parentElement) {
                desc += ' ' + radio.parentElement.textContent;
            }
            return desc.trim();
        }

        function isRadioUnavailable(radio, desc) {
            if (radio.disabled) return true;
            if (desc.indexOf('(0)') !== -1) return true;
            const parent = radio.parentElement;
            if (parent && (parent.querySelector('strike, del, s') || (parent.style && parent.style.textDecoration && parent.style.textDecoration.indexOf('line-through') !== -1))) {
                return true;
            }
            return false;
        }

        const ballRadios = [];
        for (let rIdx = 0; rIdx < radioPool.length; rIdx++) {
            const r = radioPool[rIdx];
            const desc = getRadioDescriptor(r);
            const dLower = desc.toLowerCase();
            if (formScope || dLower.indexOf('ball') !== -1 || dLower.indexOf('master') !== -1 || dLower.indexOf('ultra') !== -1 || dLower.indexOf('great') !== -1 || dLower.indexOf('poke') !== -1) {
                ballRadios.push({ radio: r, desc: desc, dLower: dLower });
            }
        }

        let selectedBall = null;

        for (let i = 0; i < ballRadios.length; i++) {
            const item = ballRadios[i];
            if (item.radio.checked && !isRadioUnavailable(item.radio, item.desc)) {
                selectedBall = item.radio;
                break;
            }
        }

        if (!selectedBall) {
            const priorities = ['master', 'ultra', 'great', 'poke'];
            for (let p = 0; p < priorities.length; p++) {
                const priorityName = priorities[p];
                for (let i = 0; i < ballRadios.length; i++) {
                    const item = ballRadios[i];
                    if (isRadioUnavailable(item.radio, item.desc)) continue;
                    if (item.dLower.indexOf(priorityName) !== -1) {
                        selectedBall = item.radio;
                        selectedBall.click();
                        selectedBall.checked = true;
                        selectedBall.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
                if (selectedBall) break;
            }
        }

        if (!selectedBall) {
            for (let i = 0; i < ballRadios.length; i++) {
                const item = ballRadios[i];
                if (!isRadioUnavailable(item.radio, item.desc)) {
                    selectedBall = item.radio;
                    selectedBall.click();
                    selectedBall.checked = true;
                    selectedBall.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }

        if (selectedBall && throwBtn && window.getComputedStyle(throwBtn).display !== 'none') {
            throwBtn.click();
            try {
                sessionStorage.setItem('pokefinder_ball_thrown', 'true');
            } catch (_) {}
            return;
        }
    }, 500);
}

// --- 6. DOM OBSERVERS & EVENT HOOKS ---
function getPlayerPosition() {
    try {
        const player = document.getElementById('user') ||
                       document.getElementById('player') ||
                       document.querySelector('.trainer') ||
                       document.querySelector('.player') ||
                       document.querySelector('#map img[src*="trainer"]') ||
                       document.querySelector('#map img.player');
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
        if (r > 60 && g > 60 && b > 60 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
            return true;
        }
    }
    return false;
}

function isNavButtonBlocked(dir) {
    const dirMap = {
        'Up': ['#dr-n', '.dr-n', '[data-dir="n"]', '[data-direction="n"]', '[data-direction="up"]', '[title*="North" i]', '[title*="Up" i]', '[aria-label*="North" i]', '[aria-label*="Up" i]'],
        'Down': ['#dr-s', '.dr-s', '[data-dir="s"]', '[data-direction="s"]', '[data-direction="down"]', '[title*="South" i]', '[title*="Down" i]', '[aria-label*="South" i]', '[aria-label*="Down" i]'],
        'Left': ['#dr-w', '.dr-w', '[data-dir="w"]', '[data-direction="w"]', '[data-direction="left"]', '[title*="West" i]', '[title*="Left" i]', '[aria-label*="West" i]', '[aria-label*="Left" i]'],
        'Right': ['#dr-e', '.dr-e', '[data-dir="e"]', '[data-direction="e"]', '[data-direction="right"]', '[title*="East" i]', '[title*="Right" i]', '[aria-label*="East" i]', '[aria-label*="Right" i]'],
        'Up-Left': ['#dr-nw', '.dr-nw', '[data-dir="nw"]'],
        'Up-Right': ['#dr-ne', '.dr-ne', '[data-dir="ne"]'],
        'Down-Left': ['#dr-sw', '.dr-sw', '[data-dir="sw"]'],
        'Down-Right': ['#dr-se', '.dr-se', '[data-dir="se"]']
    };

    const selectors = dirMap[dir] || [];
    for (let i = 0; i < selectors.length; i++) {
        const el = document.querySelector(selectors[i]);
        if (!el) continue;

        if (el.disabled || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
            return true;
        }

        const cls = (el.className || '').toString().toLowerCase();
        if (cls.indexOf('disabled') !== -1 || cls.indexOf('inactive') !== -1 ||
            cls.indexOf('blocked') !== -1 || cls.indexOf('off') !== -1 ||
            cls.indexOf('grey') !== -1 || cls.indexOf('gray') !== -1 ||
            cls.indexOf('dr-dis') !== -1) {
            return true;
        }

        try {
            const st = window.getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden') return true;
            if (st.pointerEvents === 'none') return true;
            if (st.cursor === 'not-allowed') return true;

            const op = parseFloat(st.opacity);
            if (!isNaN(op) && op < 0.75) return true;
            if (isGreyColor(st.color) || isGreyColor(st.backgroundColor)) return true;
        } catch (_) {}

        const img = el.querySelector('img');
        if (img) {
            const src = (img.getAttribute('src') || '').toLowerCase();
            if (src.indexOf('disab') !== -1 || src.indexOf('grey') !== -1 || src.indexOf('gray') !== -1 || src.indexOf('off') !== -1) {
                return true;
            }
            try {
                const imgSt = window.getComputedStyle(img);
                const imgOp = parseFloat(imgSt.opacity);
                if (!isNaN(imgOp) && imgOp < 0.75) return true;
                if (imgSt.filter && imgSt.filter.indexOf('grayscale') !== -1) return true;
            } catch (_) {}
        }

        const svg = el.querySelector('svg, path, polygon');
        if (svg) {
            try {
                const svgSt = window.getComputedStyle(svg);
                const svgOp = parseFloat(svgSt.opacity);
                if (!isNaN(svgOp) && svgOp < 0.75) return true;
                const fill = svg.getAttribute('fill') || svgSt.fill;
                if (isGreyColor(fill)) return true;
            } catch (_) {}
        }
    }
    return false;
}

function getBlockedNavDirections() {
    return {
        Up: isNavButtonBlocked('Up'),
        Down: isNavButtonBlocked('Down'),
        Left: isNavButtonBlocked('Left'),
        Right: isNavButtonBlocked('Right')
    };
}

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
    const blocked = getBlockedNavDirections();
    const str = JSON.stringify(blocked);
    if (str !== lastBroadcastBlockedStr) {
        lastBroadcastBlockedStr = str;
        ipcRenderer.sendToHost('nav-status', { blocked: blocked });
    }
}

const observer = new MutationObserver(() => {
    syncNavStatusToHost();
    if (activeStep && !activeStep.resolved) {
        const curPos = getPlayerPosition();
        const curDexy = getDexyText();
        const posMoved = !!(activeStep.initialPos && curPos && (activeStep.initialPos.x !== curPos.x || activeStep.initialPos.y !== curPos.y));
        const textChanged = !!(curDexy && curDexy !== activeStep.initialText);

        if (posMoved || textChanged) {
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
        }
    }
    scanForTargets();
});

ipcRenderer.on('step-dispatched', (event, data) => {
    const dir = (data && data.direction) || 'Left';

    if (collisionCheckTimer) {
        clearTimeout(collisionCheckTimer);
        collisionCheckTimer = null;
    }

    const allBlocked = getBlockedNavDirections();
    // Fast path: if the nav arrow on DelugeRPG is ALREADY disabled, report obstacle immediately
    if (isNavButtonBlocked(dir)) {
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
        resolved: false
    };

    // Fast-reacting obstacle evaluation timer (600ms)
    collisionCheckTimer = setTimeout(() => {
        if (activeStep && !activeStep.resolved) {
            activeStep.resolved = true;
            const currentPos = getPlayerPosition();
            const currentDexy = getDexyText();
            const posMoved = !!(initialPos && currentPos && (initialPos.x !== currentPos.x || initialPos.y !== currentPos.y));
            const textChanged = !!(currentDexy && currentDexy !== initialDexy);
            const navBlockedNow = isNavButtonBlocked(dir);

            if (posMoved || textChanged) {
                unconfirmedBlockedCount = 0;
                lastUnconfirmedDir = null;
                ipcRenderer.sendToHost('move-result', {
                    direction: dir,
                    success: true,
                    allBlocked: getBlockedNavDirections()
                });
            } else if (navBlockedNow) {
                unconfirmedBlockedCount = 0;
                lastUnconfirmedDir = null;
                ipcRenderer.sendToHost('move-result', {
                    direction: dir,
                    blocked: true,
                    navBlocked: true,
                    allBlocked: getBlockedNavDirections()
                });
            } else {
                if (initialPos && currentPos) {
                    unconfirmedBlockedCount = 0;
                    lastUnconfirmedDir = null;
                    ipcRenderer.sendToHost('move-result', {
                        direction: dir,
                        blocked: true,
                        allBlocked: getBlockedNavDirections()
                    });
                    return;
                }

                ipcRenderer.sendToHost('move-result', {
                    direction: dir,
                    success: true,
                    allBlocked: getBlockedNavDirections()
                });
            }
        }
    }, 600);
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
    scanForTargets();
    const mapEl = document.getElementById('map');
    const dexyEl = document.getElementById('dexy') || document.querySelector('.dexy') || document.getElementById('showpoke');
    if (mapEl) {
        observer.observe(mapEl, { childList: true, subtree: true, attributes: true });
    }
    if (dexyEl) {
        observer.observe(dexyEl, { childList: true, subtree: true, characterData: true });
    }
    if (!mapEl && !dexyEl && document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    let hasTarget = false;
    try {
        hasTarget = !!sessionStorage.getItem('pokefinder_target');
    } catch (_) {}
    if (hasTarget && config.autoCatch) {
        startCatchSequence();
    }
});

// High-frequency polling (300ms) for instant responsiveness
setInterval(() => {
    syncNavStatusToHost();
    const path = (window.location.pathname || '').toLowerCase();
    const isHuntingPage = path.indexOf('/map') !== -1 || path.indexOf('/catch') !== -1;
    if (!isHuntingPage && isHuntingActive) {
        isHuntingActive = false;
        ipcRenderer.sendToHost('hunting-auto-pause', { reason: 'outside-map', path: path });
    }
    scanForTargets();
}, 300);

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

// Auto-fill login helper
ipcRenderer.on('fill-login', (event, credentials) => {
    if (window.location.pathname.indexOf('/login') === -1) return;
    if (!credentials || !credentials.username || !credentials.password) return;

    const userInput = document.querySelector('input[name*="username"], input[id*="username"]');
    const passInput = document.querySelector('input[name*="password"], input[id*="password"]');

    if (userInput && passInput) {
        userInput.value = credentials.username;
        userInput.dispatchEvent(new Event('input', { bubbles: true }));
        userInput.dispatchEvent(new Event('change', { bubbles: true }));

        passInput.value = credentials.password;
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
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

