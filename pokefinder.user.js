// ==UserScript==
// @name         DelugeRPG: Pokefinder
// @namespace    https://greasyfork.org/users/789978-anxarden
// @version      v4.6
// @description  Elite DelugeRPG Pokefinder with auto-resume after catching, wide-area walking patterns (no 1-tile spinning), comprehensive legendary list, special variant catcher, and zero linter warnings.
// @author       Anxarden
// @match        https://*.delugerpg.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

/* eslint-env es6, browser */
/* eslint-disable no-multi-spaces */

(function() {
    'use strict';

    /* ========== USER CONFIGURATION ========== */
    // ----- LOGIN -----
    const autoLogin = false;
    const username = "PokeDen";
    const password = "sacups2026";

    // ----- WALK PATTERN SETTINGS -----
    // Choose your walking style:
    // "line_horizontal" -> Paces Left and Right across grass patches (Best for clear lanes like in your screenshot)
    // "line_vertical"   -> Paces Up and Down
    // "patrol_square"   -> Walks a wide square (e.g. 6 Left, 6 Up, 6 Right, 6 Down)
    // "diagonal"        -> Diagonal traversal: sweeps map in stair patterns, bouncing off walls
    // "wander"          -> Smart roaming: walks 1 step in one direction, then turns
    const walkMode = "wander";
    const stepsPerDirection = 1; // Number of steps to take before turning (changes direction every 1 step)
    const isDoneLoadingFreq = 1500; // ms between walk moves

    // ----- TARGET FILTERS (WHAT TO FIND) -----
    // Choose target hunting preset:
    // "all"          -> Legendaries + Mega Families + Special Variants (Default - Catches all rare Pokemon)
    // "legendaries"  -> Legendaries, Mythicals, Ultra Beasts & Paradox Pokemon only (135 Dex targets)
    // "megas"        -> Mega Evolution Lines & Rare species only (Aron, Meditite, Absol, Heracross...)
    // "variants"     -> Special Sprite Variants only (Chrome, Shiny, Retro, Metallic, Ghostly, Dark, Shadow, Mirage, Negative)
    // "legend_megas" -> Legendaries + Mega Evolution Lines (Ignores normal random variants)
    // "custom"       -> Use the individual booleans configured below
    const targetPreset = "all";
    const findLegendaries = true; // All 135 Legendaries, Mythicals, Ultra Beasts, Paradox Pokemon
    const findMegasAndGigantamax = true; // Catch Mega Evolutions, Gigantamax, Primal, Ultra forms & ALL Pokemon lines capable of Mega Evolution
    const findAnySpecialVariant = true; // Catch ANY Pokemon if Chrome, Retro, Shadow, Ghostly, Metallic, Dark, Shiny, Mirage, Negative
    const findLevels = false; // Disabled so simple random Pokemon are not caught by level
    const levelsToFind = ["1"]; // Specific levels as strings/numbers
    const findLevelsAndUp = false; // Disabled so simple random Pokemon are not caught by level
    const levelsAndUpToFind = 40; // Threshold level
    const targetPresetHotkey = "F4"; // Hotkey to cycle target presets on the fly

    // ----- AUTOMATION TOGGLES -----
    const autoWalkFind = true; // Automatically walk while hunting
    const autoCatch = true; // Automatically throw Master Ball when a target appears
    let avoidDuplicates = true; // Skip already caught Pokemon (has red Pokeball indicator)
    let hideAdsCosmetically = true; // Option B: Visually collapse ad banners while letting scripts run to keep 1-click Skip enabled
    const doBattle = false; // Auto-battle loop
    const forceBattle = false; // Redirect to battle URL from dashboard (keep false when hunting on map)
    const toggleHotkey = "F2"; // Hotkey to pause/resume finder (F2 avoids DevTools conflict)

    // ----- SCAN & BATTLE SPEEDS -----
    const scanFreq = 150; // ms between encounter scans (high responsiveness)
    const battle = "/S-Psychic"; // Battle URL path
    const attackFreq = 1000; // ms between battle clicks
    const firstPokemonPrefAtt = 1; // Preferred attack move index (1-4)

    /* ========== COMPREHENSIVE TARGET LISTS ========== */

    // 1. Complete list of all Legendaries, Mythicals, Ultra Beasts & Paradox (Gen 1 to Gen 9)
    // Verified and matched directly against DelugeRPG Dex in /VeryRarePokemons
    const LEGENDARY_BASE = [
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
    ];

    // 2. Complete Mega Evolution Families (All 46 species capable of Mega Evolution, Base to Final)
    const MEGA_CAPABLE_BASE = [
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
    ];

    // 3. High-Value Sprite Variants in DelugeRPG
    const SPECIAL_VARIANTS = [
        "shiny", "metallic", "ghostly", "dark", "shadow", "mirage", "chrome", "negative", "retro"
    ];

    // 4. Special Forms (Includes Mega, Gigantamax, G-Max, Primal, Ultra from /VeryRarePokemons)
    const SPECIAL_FORMS = [
        "mega", "gigantamax", "g-max", "gmax", "primal", "ultra"
    ];

    // Pre-lowercase target lookups for microsecond matching performance
    const LEGENDARY_BASE_LOWER = LEGENDARY_BASE.map(function(b) { return b.toLowerCase(); });
    const MEGA_CAPABLE_LOWER = MEGA_CAPABLE_BASE.map(function(m) { return m.toLowerCase(); });

    /* ========== STATE VARIABLES ========== */
    let finderActive = true;
    let walkInterval = null;
    let scanInterval = null;
    let catchStepInterval = null;
    let battleLoopInterval = null;

    // Target Preset Definitions & Dynamic Runtime State
    const TARGET_PRESET_ORDER = ['all', 'legendaries', 'megas', 'variants', 'legend_megas'];
    const TARGET_PRESET_LABELS = {
        'all': 'ALL (Leg+Mega+Var)',
        'legendaries': 'LEGENDARIES (135)',
        'megas': 'MEGAS & RARE',
        'variants': 'VARIANTS ONLY',
        'legend_megas': 'LEG + MEGA',
        'custom': 'CUSTOM'
    };

    let activeTargetPreset = (function() {
        try {
            return localStorage.getItem('pokefinder_target_preset') || targetPreset;
        } catch (_) {
            return targetPreset;
        }
    })();

    let currentFindLegendaries = findLegendaries;
    let currentFindMegas = findMegasAndGigantamax;
    let currentFindVariants = findAnySpecialVariant;

    function applyTargetPresetSettings(preset) {
        activeTargetPreset = preset;
        try {
            localStorage.setItem('pokefinder_target_preset', preset);
        } catch (_) {}

        if (preset === 'legendaries') {
            currentFindLegendaries = true;
            currentFindMegas = false;
            currentFindVariants = false;
        } else if (preset === 'megas') {
            currentFindLegendaries = false;
            currentFindMegas = true;
            currentFindVariants = false;
        } else if (preset === 'variants') {
            currentFindLegendaries = false;
            currentFindMegas = false;
            currentFindVariants = true;
        } else if (preset === 'legend_megas') {
            currentFindLegendaries = true;
            currentFindMegas = true;
            currentFindVariants = false;
        } else if (preset === 'all') {
            currentFindLegendaries = true;
            currentFindMegas = true;
            currentFindVariants = true;
        } else {
            currentFindLegendaries = findLegendaries;
            currentFindMegas = findMegasAndGigantamax;
            currentFindVariants = findAnySpecialVariant;
        }
    }

    applyTargetPresetSettings(activeTargetPreset);

    function cycleTargetPreset() {
        let idx = TARGET_PRESET_ORDER.indexOf(activeTargetPreset);
        if (idx === -1) idx = 0;
        else idx = (idx + 1) % TARGET_PRESET_ORDER.length;
        const nextPreset = TARGET_PRESET_ORDER[idx];
        applyTargetPresetSettings(nextPreset);
        console.log('[PokeFinder] Target filter switched to: ' + TARGET_PRESET_LABELS[nextPreset]);
        updateStatusUI();
    }

    // Smart walking & obstacle avoidance state
    let stepCounter = 0;
    let wanderStepsRemaining = 0;
    let currentWanderKey = 37;
    let diagonalVerticalKey = 38; // 38=Up
    let diagonalHorizontalKey = 39; // 39=Right
    let moveRetries = 0;
    let battleRetries = 0;
    let blockedWalkKeys = {};
    let consecutiveBlockedSteps = 0;
    let lastDispatchedWalkKey = null;
    let lastDexyContentSnapshot = '';
    let lastPlayerPosSnapshot = null;
    let walkStepAcknowledged = true;

    // Passive, 100% safe DOM position observer for anti-cheat compliance
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

    /* ========== AUDIO & UI HELPERS ========== */
    function playBeep() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } catch (_) {}
    }

    let lastStatusText = 'Active (' + walkMode + ')';
    let lastStatusColor = '#4caf50';

    // --- OPTION B: COSMETIC AD HIDING ---
    // Satisfies DelugeRPG script verification over network while visually collapsing banners
    const COSMETIC_AD_STYLE_ID = 'pokefinder-cosmetic-ad-hide';
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
            let styleEl = document.getElementById(COSMETIC_AD_STYLE_ID);
            if (hideAdsCosmetically) {
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

    applyCosmeticAdHiding();

    function createStatusUI() {
        if (!document.body || document.getElementById('pokefinder-hud')) return;
        const hud = document.createElement('div');
        hud.id = 'pokefinder-hud';
        hud.style.cssText = [
            'position: fixed',
            'bottom: 12px',
            'right: 12px',
            'background: rgba(18, 18, 18, 0.94)',
            'color: #ffffff',
            'padding: 8px 14px',
            'border-radius: 8px',
            'font-size: 12px',
            'font-family: Arial, sans-serif',
            'z-index: 999999',
            'box-shadow: 0 4px 12px rgba(0,0,0,0.4)',
            'border: 1px solid rgba(255,255,255,0.18)',
            'cursor: pointer',
            'user-select: none',
            'display: flex',
            'align-items: center',
            'gap: 8px'
        ].join(';');
        hud.title = 'Click or press [' + toggleHotkey + '] to Pause/Resume';
        hud.addEventListener('click', function(e) {
            if (e.target && (e.target.id === 'pokefinder-target-btn' || e.target.closest('#pokefinder-target-btn'))) {
                return;
            }
            toggleFinder();
        });
        document.body.appendChild(hud);
        updateStatusUI(lastStatusText, lastStatusColor);
    }

    function updateStatusUI(text, color) {
        const hud = document.getElementById('pokefinder-hud');
        if (!hud) return;
        if (text) lastStatusText = text;
        if (color) lastStatusColor = color;
        const dotColor = lastStatusColor || '#ffffff';
        const presetLabel = TARGET_PRESET_LABELS[activeTargetPreset] || activeTargetPreset.toUpperCase();

        hud.innerHTML = [
            '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + dotColor + ';margin-right:2px;"></span>',
            '<b>PokeFinder:</b> ' + lastStatusText,
            '<span style="opacity:0.6;font-size:10px;">[' + toggleHotkey + ']</span>',
            '<button id="pokefinder-target-btn" style="background:#1e293b;border:1px solid #3b82f6;border-radius:4px;color:#93c5fd;font-size:11px;font-weight:bold;padding:2px 8px;cursor:pointer;margin-left:4px;" title="Click or press [' + targetPresetHotkey + '] to switch Targets: ALL -> LEGENDARIES -> MEGAS -> VARIANTS -> LEG+MEGA">',
            'Target: ' + presetLabel + ' [' + targetPresetHotkey + ']',
            '</button>',
            '<button id="pokefinder-dupe-btn" style="background:' + (avoidDuplicates ? '#0284c7' : '#334155') + ';border:1px solid #38bdf8;border-radius:4px;color:#ffffff;font-size:11px;font-weight:bold;padding:2px 8px;cursor:pointer;margin-left:4px;" title="Toggle Duplication Avoidance (Skip already caught Pokemon)">',
            (avoidDuplicates ? '&#128260; Avoid Dupes: ON' : '&#128260; Avoid Dupes: OFF'),
            '</button>'
        ].join(' ');

        const targetBtn = document.getElementById('pokefinder-target-btn');
        if (targetBtn) {
            targetBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                cycleTargetPreset();
            });
        }

        const dupeBtn = document.getElementById('pokefinder-dupe-btn');
        if (dupeBtn) {
            dupeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                avoidDuplicates = !avoidDuplicates;
                updateStatusUI();
                console.log('[PokeFinder] Duplication Avoidance: ' + (avoidDuplicates ? 'ON' : 'OFF'));
            });
        }
    }

    let targetObserver = null;
    function setupTargetObserver() {
        if (!targetObserver && window.MutationObserver) {
            targetObserver = new MutationObserver(function() {
                if (finderActive) {
                    scanForTargets();
                }
            });
        }
        if (targetObserver && document.body) {
            try {
                targetObserver.disconnect();
                targetObserver.observe(document.body, { childList: true, subtree: true });
            } catch (_) {}
        }
    }

    function toggleFinder() {
        if (finderActive) {
            finderActive = false;
            if (walkInterval) clearInterval(walkInterval);
            if (scanInterval) clearInterval(scanInterval);
            if (targetObserver) targetObserver.disconnect();
            updateStatusUI('Paused', '#ff9800');
            console.log('[PokeFinder] Paused.');
        } else {
            finderActive = true;
            setupTargetObserver();
            scanInterval = setInterval(scanForTargets, scanFreq);
            startAutoWalk();
            updateStatusUI('Running (' + walkMode + ')', '#4caf50');
            console.log('[PokeFinder] Resumed.');
        }
    }

    // Helper: dispatch arrow key events to document, window, and body
    function fireKey(keyCode) {
        const keyNames = { 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown' };
        const keyName = keyNames[keyCode] || '';

        const evt = new KeyboardEvent('keydown', {
            key: keyName,
            code: keyName,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
        });

        document.dispatchEvent(evt);
        window.dispatchEvent(evt);
        if (document.body) {
            document.body.dispatchEvent(evt);
        }
    }

    /* ========== SMART WALKING & OBSTACLE AVOIDANCE ENGINE ========== */
    function getOppositeKey(k) {
        if (k === 37) return 39; // Left -> Right
        if (k === 39) return 37; // Right -> Left
        if (k === 38) return 40; // Up -> Down
        if (k === 40) return 38; // Down -> Up
        return 37;
    }

    function chooseEvadeWalkKey(blockedKey) {
        const keys = [37, 38, 39, 40]; // 37=Left, 38=Up, 39=Right, 40=Down
        const opposites = { 37: 39, 39: 37, 38: 40, 40: 38 };
        const perpendiculars = {
            37: [38, 40], // Left -> Up, Down
            39: [38, 40], // Right -> Up, Down
            38: [37, 39], // Up -> Left, Right
            40: [37, 39]  // Down -> Left, Right
        };

        const now = Date.now();
        const unblockedPerp = (perpendiculars[blockedKey] || []).filter(function(k) {
            return !blockedWalkKeys[k] || blockedWalkKeys[k] <= now;
        });

        if (unblockedPerp.length > 0) {
            return unblockedPerp[Math.floor(Math.random() * unblockedPerp.length)];
        }

        const opp = opposites[blockedKey] || 37;
        if (!blockedWalkKeys[opp] || blockedWalkKeys[opp] <= now) {
            return opp;
        }

        const anyOther = keys.filter(function(k) { return k !== blockedKey; });
        return anyOther[Math.floor(Math.random() * anyOther.length)];
    }

    function getNextWalkKey() {
        const keys = [37, 38, 39, 40]; // 37=Left, 38=Up, 39=Right, 40=Down
        const now = Date.now();

        // Expire old blocked directions
        for (const k in blockedWalkKeys) {
            if (now > blockedWalkKeys[k]) delete blockedWalkKeys[k];
        }

        if (walkMode === "diagonal") {
            if (blockedWalkKeys[diagonalVerticalKey]) {
                diagonalVerticalKey = diagonalVerticalKey === 38 ? 40 : 38;
            }
            if (blockedWalkKeys[diagonalHorizontalKey]) {
                diagonalHorizontalKey = diagonalHorizontalKey === 39 ? 37 : 39;
            }

            const chosenKey = (stepCounter % 2 === 0) ? diagonalVerticalKey : diagonalHorizontalKey;
            stepCounter++;
            if (blockedWalkKeys[chosenKey]) {
                if (chosenKey === diagonalVerticalKey) {
                    diagonalVerticalKey = diagonalVerticalKey === 38 ? 40 : 38;
                    return diagonalVerticalKey;
                } else {
                    diagonalHorizontalKey = diagonalHorizontalKey === 39 ? 37 : 39;
                    return diagonalHorizontalKey;
                }
            }
            return chosenKey;
        }

        if (walkMode === "line_horizontal") {
            if (blockedWalkKeys[37] && !blockedWalkKeys[39]) return 39;
            if (blockedWalkKeys[39] && !blockedWalkKeys[37]) return 37;
            const isLeft = Math.floor(stepCounter / stepsPerDirection) % 2 === 0;
            stepCounter++;
            return isLeft ? 37 : 39;
        }

        if (walkMode === "line_vertical") {
            if (blockedWalkKeys[38] && !blockedWalkKeys[40]) return 40;
            if (blockedWalkKeys[40] && !blockedWalkKeys[38]) return 38;
            const isUp = Math.floor(stepCounter / stepsPerDirection) % 2 === 0;
            stepCounter++;
            return isUp ? 38 : 40;
        }

        if (walkMode === "patrol_square") {
            let dirIndex = Math.floor(stepCounter / stepsPerDirection) % 4;
            let candidate = keys[dirIndex];
            if (blockedWalkKeys[candidate]) {
                stepCounter += stepsPerDirection;
                dirIndex = Math.floor(stepCounter / stepsPerDirection) % 4;
                candidate = keys[dirIndex];
            }
            stepCounter++;
            return candidate;
        }

        if (walkMode === "wander") {
            if (wanderStepsRemaining <= 0 || blockedWalkKeys[currentWanderKey]) {
                currentWanderKey = chooseEvadeWalkKey(currentWanderKey);
                wanderStepsRemaining = stepsPerDirection - 1;
            } else {
                wanderStepsRemaining--;
            }
            return currentWanderKey;
        }

        // Default fallback: horizontal pacing
        const defaultLeft = Math.floor(stepCounter++ / stepsPerDirection) % 2 === 0;
        return defaultLeft ? 37 : 39;
    }

    function findCatchActionElement() {
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

            if (text.indexOf('try to catch') !== -1 || val.indexOf('try to catch') !== -1 ||
                text.indexOf('catch it') !== -1 || val.indexOf('catch it') !== -1 ||
                text === 'catch' || val === 'catch' ||
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
        return null;
    }

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

            const pokeImg = box.querySelector('img[src*="/pokemon/"], img[src*="/sprites/"], img[src*="/dex/"], img[src*="/regular/"], img[src*="/shiny/"], img[src*="/retro/"], img[src*="/chrome/"], img[src*="/metallic/"], img[src*="/shadow/"], img[src*="/ghostly/"], img[src*="/dark/"], img[src*="/mirage/"], img[src*="/negative/"], img[src*="delugerpg"]');
            if (pokeImg) {
                return box;
            }

            const innerElements = box.querySelectorAll('a, button, input');
            for (let e = 0; e < innerElements.length; e++) {
                const inner = innerElements[e];
                const innerText = ((inner.textContent || '') + ' ' + (inner.value || '') + ' ' + (inner.getAttribute('href') || '')).toLowerCase();
                if (innerText.indexOf('catch') !== -1 || innerText.indexOf('battle') !== -1) {
                    return box;
                }
            }

            if (normText.indexOf('appeared') !== -1 ||
                normText.indexOf('wild ') !== -1 ||
                normText.indexOf('level') !== -1 ||
                normText.indexOf('lvl') !== -1 ||
                normText.indexOf('catch') !== -1) {
                return box;
            }
        }

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

    function isCatchOrEncounterPresent() {
        if (findCatchActionElement() !== null) {
            return true;
        }

        const container = getEncounterContainer();
        if (container !== null) {
            return true;
        }

        return false;
    }

    function startAutoWalk() {
        if (!autoWalkFind) return;
        if (window.location.pathname.indexOf('/unlock') !== -1) {
            finderActive = false;
            updateStatusUI('SECURITY CHECK (/unlock)!', '#f44336');
            playBeep();
            return;
        }
        if (window.location.pathname.indexOf('/map') === -1) {
            finderActive = false;
            return;
        }
        if (walkInterval) clearInterval(walkInterval);

        walkInterval = setInterval(function() {
            if (!finderActive) return;

            // 1. Scan for targets FIRST! If Aron/Meditite or any target is here, pause immediately!
            scanForTargets();
            if (!finderActive) return;

            const dexy = document.getElementById('dexy') || document.getElementById('showpoke');
            const currentDexyHtml = dexy ? (dexy.innerHTML || dexy.textContent || '').trim() : '';
            const isLoading = dexy && dexy.innerText && dexy.innerText.indexOf('Searching...') !== -1;

            if (isLoading) {
                moveRetries++;
                if (moveRetries >= 80) location.reload();
                return;
            }

            const curPos = getPlayerPosition();
            const posChanged = !!(curPos && lastPlayerPosSnapshot && (curPos.x !== lastPlayerPosSnapshot.x || curPos.y !== lastPlayerPosSnapshot.y));
            const textChanged = (currentDexyHtml !== lastDexyContentSnapshot);

            // Check if last step was acknowledged by DelugeRPG
            if (lastDispatchedWalkKey !== null) {
                if (posChanged || textChanged) {
                    // Step was successful!
                    walkStepAcknowledged = true;
                    consecutiveBlockedSteps = 0;
                    if (blockedWalkKeys[lastDispatchedWalkKey]) {
                        delete blockedWalkKeys[lastDispatchedWalkKey];
                    }
                } else if (!walkStepAcknowledged) {
                    // Only flag collision if position is actively tracked or text confirmed
                    if (curPos && lastPlayerPosSnapshot) {
                        consecutiveBlockedSteps++;
                        blockedWalkKeys[lastDispatchedWalkKey] = Date.now() + 8000;
                        wanderStepsRemaining = 0;

                        // Invert diagonal axes on collision
                        if (lastDispatchedWalkKey === 38) diagonalVerticalKey = 40;
                        else if (lastDispatchedWalkKey === 40) diagonalVerticalKey = 38;
                        else if (lastDispatchedWalkKey === 37) diagonalHorizontalKey = 39;
                        else if (lastDispatchedWalkKey === 39) diagonalHorizontalKey = 37;

                        console.log('[PokeFinder] Collision detected with key ' + lastDispatchedWalkKey + '! Consecutive: ' + consecutiveBlockedSteps);
                        updateStatusUI('Obstacle! Evading...', '#ff9800');

                        if (consecutiveBlockedSteps >= 6) {
                            console.log('[PokeFinder] Trapped in maze! Reloading map to safe spawn...');
                            consecutiveBlockedSteps = 0;
                            blockedWalkKeys = {};
                            location.reload();
                            return;
                        }
                    } else {
                        // Without position confirmation, don't falsely claim obstacle
                        walkStepAcknowledged = true;
                    }
                }
            }

            const key = getNextWalkKey();
            lastDispatchedWalkKey = key;
            walkStepAcknowledged = false;
            lastDexyContentSnapshot = currentDexyHtml;
            lastPlayerPosSnapshot = curPos;

            fireKey(key);
            moveRetries = 0;
        }, isDoneLoadingFreq);
    }

    /* ========== HUMAN-LIKE INTERACTION & DUPLICATE DETECTION ========== */
    function dispatchHumanClick(element) {
        if (!element) return;
        try {
            const rect = element.getBoundingClientRect();
            const clientX = rect.left + (rect.width * (0.35 + Math.random() * 0.3));
            const clientY = rect.top + (rect.height * (0.35 + Math.random() * 0.3));
            const opts = {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: Math.round(clientX),
                clientY: Math.round(clientY)
            };

            element.dispatchEvent(new PointerEvent('pointerover', opts));
            element.dispatchEvent(new MouseEvent('mouseover', opts));
            element.dispatchEvent(new PointerEvent('pointerenter', opts));
            element.dispatchEvent(new MouseEvent('mouseenter', opts));
            element.dispatchEvent(new PointerEvent('pointerdown', opts));
            element.dispatchEvent(new MouseEvent('mousedown', opts));

            const pressDuration = Math.floor(Math.random() * 65) + 75;
            setTimeout(() => {
                try {
                    element.dispatchEvent(new PointerEvent('pointerup', opts));
                    element.dispatchEvent(new MouseEvent('mouseup', opts));
                    element.dispatchEvent(new MouseEvent('click', opts));
                    if (typeof element.click === 'function') {
                        element.click();
                    }
                } catch (_) {}
            }, pressDuration);
        } catch (_) {
            if (typeof element.click === 'function') {
                element.click();
            }
        }
    }

    function checkEncounterIsDuplicate(container) {
        if (!container) {
            container = getEncounterContainer();
        }

        // 1. Check text content for explicit caught/uncaught status
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
            return true;
        }

        // 2. Aggregate all candidate encounter containers
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
                    return false;
                }

                if (titleStr.indexOf("you have this pokemon in your box") !== -1 ||
                    titleStr.indexOf("already in your box") !== -1 ||
                    titleStr.indexOf("already caught") !== -1 ||
                    titleStr.indexOf("already owned") !== -1 ||
                    titleStr.indexOf("you have this pokemon") !== -1 ||
                    titleStr.indexOf("in your box") !== -1) {
                    return true;
                }
            }
        }

        let indicatorImg = null;

        for (let r = 0; r < candidateBoxes.length; r++) {
            const root = candidateBoxes[r];
            const imgs = root.querySelectorAll ? root.querySelectorAll('img') : [];

            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];

                if (img.closest && img.closest('#map, #userpokeballs, .userpokeballs, #myteam, .user-avatar, .site-header, .page-header, body > header, nav, footer, .bag, #inventory')) {
                    continue;
                }

                const src = (img.src || '').toLowerCase();
                const alt = (img.alt || '').toLowerCase();
                const title = (img.title || '').toLowerCase();
                const className = (img.className || '').toLowerCase();

                if (src.indexOf('/pokemon/') !== -1 || src.indexOf('/sprites/') !== -1 || (src.indexOf('/dex/') !== -1 && (src.indexOf('front') !== -1 || src.indexOf('back') !== -1))) {
                    if (img.naturalWidth > 40 || img.naturalHeight > 40 || img.width > 40 || img.height > 40) {
                        continue;
                    }
                }

                if (src.indexOf('/types/') !== -1 || src.indexOf('/type/') !== -1 || alt.indexOf('type') !== -1 || title.indexOf('type') !== -1) {
                    continue;
                }

                const isBallOrDex = src.indexOf('dball') !== -1 || src.indexOf('pokeball') !== -1 || src.indexOf('ball') !== -1 ||
                                    src.indexOf('caught') !== -1 || src.indexOf('pokedex') !== -1 || src.indexOf('dexball') !== -1 ||
                                    alt.indexOf('caught') !== -1 || title.indexOf('caught') !== -1 ||
                                    alt.indexOf('dex') !== -1 || title.indexOf('dex') !== -1 ||
                                    alt.indexOf('ball') !== -1 || title.indexOf('ball') !== -1 ||
                                    className.indexOf('caught') !== -1 || className.indexOf('ball') !== -1 || className.indexOf('dex') !== -1;

                const isSmallIcon = (img.naturalWidth > 0 && img.naturalWidth <= 32) || (img.width > 0 && img.width <= 32);

                if (isBallOrDex || (isSmallIcon && src.indexOf('/pokemon/') === -1)) {
                    indicatorImg = img;
                    break;
                }
            }

            if (indicatorImg) break;
        }

        if (!indicatorImg) return false;

        const indSrc = (indicatorImg.src || '').toLowerCase();
        const indClass = (indicatorImg.className || '').toLowerCase();

        // Check attributes on indicator element, its parent element, and enclosing link
        const parentEl = indicatorImg.parentElement;
        const linkEl = indicatorImg.closest ? indicatorImg.closest('a, span, div') : null;
        const allIndicatorTexts = [
            indicatorImg.title || '',
            indicatorImg.getAttribute('title') || '',
            indicatorImg.alt || '',
            indicatorImg.getAttribute('alt') || '',
            indicatorImg.getAttribute('data-original-title') || '',
            indicatorImg.getAttribute('aria-label') || '',
            parentEl ? (parentEl.title || parentEl.getAttribute('title') || '') : '',
            parentEl ? (parentEl.getAttribute('data-original-title') || '') : '',
            linkEl ? (linkEl.title || linkEl.getAttribute('title') || '') : '',
            linkEl ? (linkEl.getAttribute('data-original-title') || '') : ''
        ].join(' ').toLowerCase();

        // 1. Explicit UNCAUGHT text in attributes (HIGHEST PRIORITY)
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

        // 2. Explicit UNCAUGHT filename patterns (DelugeRPG exact asset: pokeball-n.png)
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

        // 3. Explicit UNCAUGHT CSS class names
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
        try {
            const computed = window.getComputedStyle(indicatorImg);
            const filter = (computed.filter || '').toLowerCase();
            const opacity = parseFloat(computed.opacity);

            if (filter.indexOf('grayscale') !== -1 || filter.indexOf('saturate(0') !== -1 || (!isNaN(opacity) && opacity < 0.5)) {
                return false;
            }
        } catch (_) {}

        // 5. Explicit CAUGHT / DUPLICATE text in attributes
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

        // 7. Offscreen Canvas Pixel Sampling (Fallback to verify red dome color)
        try {
            if (indicatorImg.tagName === 'IMG' && indicatorImg.complete && indicatorImg.naturalWidth > 0) {
                const canvas = document.createElement('canvas');
                const cw = indicatorImg.naturalWidth || 16;
                const ch = indicatorImg.naturalHeight || 16;
                canvas.width = cw;
                canvas.height = ch;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(indicatorImg, 0, 0, cw, ch);
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
                    return true;
                }
            }
        } catch (_) {}

        // 8. Safe default: Never assume duplicate
        return false;
    }

    /* ========== CATCH SEQUENCE ========== */
    function getRandomCatchDelay(minMs = 1000, maxMs = 10000) {
        const min = (typeof minMs === 'number' && minMs >= 1000) ? minMs : 1000;
        const max = (typeof maxMs === 'number' && maxMs <= 10000 && maxMs >= min) ? maxMs : 10000;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function triggerTargetFound(targetName) {
        if (!finderActive) return;
        if (avoidDuplicates) {
            const activeBox = getEncounterContainer();
            if (checkEncounterIsDuplicate(activeBox)) {
                updateStatusUI('Skipping duplicate: ' + targetName, '#9e9e9e');
                return;
            }
        }

        finderActive = false;

        if (walkInterval) clearInterval(walkInterval);
        if (scanInterval) clearInterval(scanInterval);
        if (targetObserver) {
            try { targetObserver.disconnect(); } catch (_) {}
        }

        playBeep();
        document.title = 'FOUND: ' + targetName + '!';
        updateStatusUI('Target: ' + targetName + '!', '#00e676');
        console.log('[PokeFinder] Target found: ' + targetName);

        try {
            sessionStorage.setItem('pokefinder_target', targetName);
            sessionStorage.removeItem('pokefinder_ball_thrown');
        } catch (_) {}

        if (autoCatch) {
            const reactionDelay = getRandomCatchDelay(1000, 10000);
            setTimeout(() => {
                const catchBtn = findCatchActionElement() || document.querySelector('input[type="submit"][id="catch"], input#catch, button#catch, input[value*="Catch" i], input[value*="Try to Catch" i], a#catch, #showpoke a, a[href*="/catch/"]');
                if (catchBtn) {
                    dispatchHumanClick(catchBtn);
                }
                startCatchSequence();
            }, reactionDelay);
        } else {
            alert('Target Pokemon found: ' + targetName + '!\nFinder paused.');
        }
    }

    function resumeMapHunting() {
        if (window.location.pathname.indexOf('/map') === -1) {
            finderActive = false;
            updateStatusUI('Paused (Outside Map)', '#ff9800');
            return;
        }
        try {
            sessionStorage.setItem('pokefinder_last_map_url', window.location.href);
        } catch (_) {}
        finderActive = true;
        try {
            sessionStorage.removeItem('pokefinder_target');
            sessionStorage.removeItem('pokefinder_ball_thrown');
        } catch (_) {}

        if (walkInterval) clearInterval(walkInterval);
        if (scanInterval) clearInterval(scanInterval);

        setupTargetObserver();
        scanInterval = setInterval(scanForTargets, scanFreq);
        startAutoWalk();
        updateStatusUI('Map Scanning (' + walkMode + ')', '#4caf50');
        console.log('[PokeFinder] Hunting resumed.');
    }

    function startCatchSequence() {
        if (catchStepInterval) clearInterval(catchStepInterval);
        let attempts = 0;
        let isActing = false;

        catchStepInterval = setInterval(function() {
            attempts++;
            if (attempts > 90) {
                clearInterval(catchStepInterval);
                return;
            }
            if (isActing) return;

            let ballWasThrown = false;
            try {
                ballWasThrown = sessionStorage.getItem('pokefinder_ball_thrown') === 'true';
            } catch (_) {}

            if (ballWasThrown) {
                const bodyText = (document.body ? document.body.textContent || '' : '').toLowerCase();
                const isConfirmed = bodyText.indexOf('was caught') !== -1 ||
                                    bodyText.indexOf('captured') !== -1 ||
                                    bodyText.indexOf('sent to your box') !== -1 ||
                                    bodyText.indexOf('you threw a') !== -1;

                const allLinksAndButtons = Array.from(document.querySelectorAll('a, input[type="submit"], input[type="button"], button'));
                const returnBtn = allLinksAndButtons.find(function(el) {
                    const text = ((el.textContent || '') + ' ' + (el.value || '')).trim().toLowerCase();
                    return text === 'return to map' || text.indexOf('return to map') !== -1;
                });

                if (isConfirmed || returnBtn) {
                    isActing = true;
                    clearInterval(catchStepInterval);
                    try {
                        sessionStorage.removeItem('pokefinder_target');
                        sessionStorage.removeItem('pokefinder_ball_thrown');
                    } catch (_) {}

                    updateStatusUI('Caught! Returning...', '#00e676');
                    console.log('[PokeFinder] Catch confirmed! Returning to map...');

                    const returnDelay = getRandomCatchDelay(1000, 10000);
                    setTimeout(() => {
                        if (returnBtn) {
                            dispatchHumanClick(returnBtn);
                        } else if (window.location.pathname.indexOf('/map') === -1) {
                            window.location.href = '/map';
                        } else {
                            resumeMapHunting();
                        }
                    }, returnDelay);
                    return;
                }
            }

            const startBattleBtn = document.querySelector('input[type="submit"][value*="Start Battle" i], input[value*="Start Battle" i], button[value*="Start Battle" i]');
            if (startBattleBtn && window.getComputedStyle(startBattleBtn).display !== 'none') {
                isActing = true;
                const delay = getRandomCatchDelay(1000, 10000);
                setTimeout(() => {
                    dispatchHumanClick(startBattleBtn);
                    isActing = false;
                }, delay);
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

            let masterRadio = null;
            let masterUnavailable = false;
            let masterStock = null;
            let ultraRadio = null;
            let ultraUnavailable = false;

            for (let rIdx = 0; rIdx < radioPool.length; rIdx++) {
                const r = radioPool[rIdx];
                const desc = getRadioDescriptor(r);
                const dLower = desc.toLowerCase();
                if (dLower.indexOf('master') !== -1 || (r.value && r.value.toLowerCase().indexOf('master') !== -1)) {
                    masterRadio = r;
                    const stockMatch = desc.match(/master\s*ball[^\d(]*\((\d+)\)/i) || desc.match(/\((\d+)\)/);
                    if (stockMatch) {
                        masterStock = parseInt(stockMatch[1], 10);
                    }
                    masterUnavailable = isRadioUnavailable(r, desc) || masterStock === 0;
                } else if (dLower.indexOf('ultra') !== -1 || (r.value && r.value.toLowerCase().indexOf('ultra') !== -1)) {
                    ultraRadio = r;
                    ultraUnavailable = isRadioUnavailable(r, desc);
                }
            }

            // Determine target level
            let targetLevel = null;
            const storedTarget = sessionStorage.getItem('pokefinder_target') || '';
            const lvlMatch = storedTarget.match(/\(Lv\s*(\d+)\)/i);
            if (lvlMatch) {
                targetLevel = parseInt(lvlMatch[1], 10);
            }
            if (targetLevel === null && document.body) {
                const bodyText = document.body.innerText || '';
                const bMatch = bodyText.match(/(?:level|lvl)[^0-9\r\n]{0,8}(\d{1,3})\b/i);
                if (bMatch) targetLevel = parseInt(bMatch[1], 10);
            }

            let chosenRadio = null;
            let chosenBallName = '';

            // Auto-Catch: Master Ball alone
            if (masterRadio && !masterUnavailable) {
                chosenRadio = masterRadio;
                const stockText = (typeof masterStock === 'number') ? ' (Stock: ' + masterStock + ')' : '';
                chosenBallName = 'Master Ball' + stockText + ' (Guaranteed capture)';
            }

            if (throwBtn && radioPool.length > 0) {
                if (!chosenRadio) {
                    clearInterval(catchStepInterval);
                    isActing = true;
                    finderActive = false; // Option A: Stay paused
                    const outOfStockDelay = getRandomCatchDelay(5000, 15000);
                    const delaySec = (outOfStockDelay / 1000).toFixed(1);
                    console.warn('[PokeFinder] Master Ball out of stock! Redirecting directly to previous map in ' + outOfStockDelay + 'ms.');
                    updateStatusUI('Master Ball (0)! Returning (' + delaySec + 's)...', '#f44336');
                    playBeep();

                    setTimeout(function() {
                        let returnUrl = '/map';
                        try {
                            returnUrl = sessionStorage.getItem('pokefinder_last_map_url') || '/map';
                        } catch (_) {}

                        // In Wild Battle there is no "Return to Map" button; directly redirect
                        window.location.href = returnUrl;
                    }, outOfStockDelay);
                    return;
                }

                console.log('[PokeFinder] Selected: ' + chosenBallName);

                if (!chosenRadio.checked) {
                    isActing = true;
                    const selectDelay = getRandomCatchDelay(1000, 10000);
                    setTimeout(() => {
                        dispatchHumanClick(chosenRadio);
                        chosenRadio.checked = true;
                        chosenRadio.dispatchEvent(new Event('change', { bubbles: true }));

                        const throwDelay = getRandomCatchDelay(1000, 10000);
                        setTimeout(() => {
                            if (throwBtn && window.getComputedStyle(throwBtn).display !== 'none') {
                                console.log('[PokeFinder] Throwing ' + chosenBallName + '!');
                                dispatchHumanClick(throwBtn);
                                try {
                                    sessionStorage.setItem('pokefinder_ball_thrown', 'true');
                                } catch (_) {}
                            }
                            isActing = false;
                        }, throwDelay);
                    }, selectDelay);
                    return;
                } else {
                    isActing = true;
                    const throwDelay = getRandomCatchDelay(1000, 10000);
                    setTimeout(() => {
                        if (throwBtn && window.getComputedStyle(throwBtn).display !== 'none') {
                            console.log('[PokeFinder] Throwing ' + chosenBallName + '!');
                            dispatchHumanClick(throwBtn);
                            try {
                                sessionStorage.setItem('pokefinder_ball_thrown', 'true');
                            } catch (_) {}
                        }
                        isActing = false;
                    }, throwDelay);
                    return;
                }
            }
        }, 500);
    }

    /* ========== BROADENED ENCOUNTER SCANNER ========== */
    function extractEncounterText() {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/map') === -1 && path.indexOf('/catch') === -1) {
            return '';
        }

        let pageText = '';

        // 1. Encounter container and sprite images
        const activeContainer = getEncounterContainer();
        if (activeContainer) {
            pageText += ' ' + (activeContainer.innerText || activeContainer.textContent || '');
            const cImgs = activeContainer.querySelectorAll('img');
            for (let j = 0; j < cImgs.length; j++) {
                pageText += ' ' + (cImgs[j].alt || '') + ' ' + (cImgs[j].title || '') + ' ';
                const src = cImgs[j].src || '';
                const match = src.match(/\/([a-z0-9\-]+)\.(?:png|gif|jpe?g)/i);
                if (match) pageText += ' ' + match[1];
            }
        }

        // 2. All DelugeRPG encounter elements including #showpoke, #dexy, #catch, etc.
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

        // 3. Entire parent container of any catch button
        const catchBtns = document.querySelectorAll('input[value*="Catch" i], button[value*="Catch" i], #catch, a#catch, #showpoke a, a[href*="catch" i], a[href*="battle" i]');
        for (let b = 0; b < catchBtns.length; b++) {
            const parent = catchBtns[b].closest('form, .catch-form, #dexy, #showpoke, #showpoke-name, #show-pokemon');
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

        const catchAction = findCatchActionElement();
        if (catchAction && catchAction.parentElement) {
            pageText += ' ' + (catchAction.parentElement.innerText || catchAction.parentElement.textContent || '');
            if (catchAction.parentElement.parentElement) {
                pageText += ' ' + (catchAction.parentElement.parentElement.innerText || catchAction.parentElement.parentElement.textContent || '');
            }
        }

        if (document.body && (pageText.toLowerCase().indexOf('appeared') === -1 || pageText.trim().length < 5)) {
            pageText += ' ' + (document.body.innerText || '');
        }

        return pageText.trim().toLowerCase();
    }

    function scanForTargets() {
        if (window.location.pathname.indexOf('/unlock') !== -1) {
            finderActive = false;
            updateStatusUI('SECURITY CHECK (/unlock)!', '#f44336');
            playBeep();
            return;
        }

        if (!finderActive) return;

        const hasCatchUI = isCatchOrEncounterPresent();
        if (!hasCatchUI) return;

        const pageText = extractEncounterText();
        if (!pageText) return;

        if (pageText.indexOf("searching...") !== -1) return;

        function handleMatchedTarget(targetName) {
            if (avoidDuplicates) {
                const activeBox = getEncounterContainer();
                if (checkEncounterIsDuplicate(activeBox)) {
                    updateStatusUI('Skipping duplicate: ' + targetName, '#9e9e9e');
                    return; // Do NOT pause! Continue walking!
                }
            }
            triggerTargetFound(targetName);
        }

        function extractEncounterSpeciesName() {
            const m = pageText.match(/(?:a wild\s+)?([a-z0-9\-\'\s\(\):]+?)\s+appeared/i);
            if (m && m[1]) {
                const raw = m[1].trim();
                const lines = raw.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
                let name = lines.length > 0 ? lines[lines.length - 1] : raw;
                name = name.replace(/^a\s+wild\s+/i, '').trim();
                return name;
            }
            return '';
        }

        // 1. Check for ANY Special Sprite Variant (Chrome, Retro, Shadow, Ghostly, Metallic, Dark, Shiny, etc.)
        if (currentFindVariants) {
            for (let i = 0; i < SPECIAL_VARIANTS.length; i++) {
                const mod = SPECIAL_VARIANTS[i];
                const match = pageText.match(new RegExp('\\b' + mod + '[- ]+([a-z0-9\\-\':]+)', 'i'));
                if (match) {
                    handleMatchedTarget(mod.toUpperCase() + ' ' + match[1]);
                    return;
                }
            }
        }

        // 2. Check for Mega Evolutions, Gigantamax, Primal & Ultra forms
        if (currentFindMegas) {
            // A. Category Header Banner check: "MEGA EVOLUTION" or "MEGA POKEMON"
            const hasMegaBanner = /\bmega\s*(?:evolution|pok[e\u00e9]mon)\b/i.test(pageText);
            if (hasMegaBanner) {
                const spec = extractEncounterSpeciesName();
                handleMatchedTarget('Mega: ' + (spec ? spec.toUpperCase() : 'Pokemon'));
                return;
            }

            // B. Form prefix match (e.g., "Mega Charizard", "Gigantamax Pikachu")
            for (let j = 0; j < SPECIAL_FORMS.length; j++) {
                const form = SPECIAL_FORMS[j];
                const formMatch = pageText.match(new RegExp('\\b' + form + '[- ]+([a-z0-9\\-\':]+)', 'i'));
                if (formMatch) {
                    if (form.toLowerCase() === 'ultra' && formMatch[1].toLowerCase().startsWith('ball')) {
                        continue;
                    }
                    handleMatchedTarget(form.toUpperCase() + ' ' + formMatch[1]);
                    return;
                }
            }

            // C. Full evolutionary families capable of Mega Evolution (Base, Middle, Final)
            for (let mg = 0; mg < MEGA_CAPABLE_LOWER.length; mg++) {
                const megaTarget = MEGA_CAPABLE_LOWER[mg];
                if (pageText.indexOf(megaTarget) !== -1) {
                    handleMatchedTarget('Mega Line: ' + MEGA_CAPABLE_BASE[mg]);
                    return;
                }
            }
        }

        // 3. Check Legendaries, Ultra Beasts, Paradox & Mythicals (Gen 1 to Gen 9)
        if (currentFindLegendaries) {
            // 3A. Category Header Banner: Ultra Beasts (e.g. ULTRABEAST)
            if (pageText.indexOf('ultrabeast') !== -1 || /\bultra\s*beasts?\b/i.test(pageText)) {
                const spec = extractEncounterSpeciesName();
                handleMatchedTarget('Ultra Beast: ' + (spec ? spec.toUpperCase() : 'Pokemon'));
                return;
            }

            // 3B. Category Header Banner: Paradox Pokemon (e.g. PARADOX POKEMON / PARADOX)
            if (pageText.indexOf('paradox') !== -1 || /\bparadox\s*pok[e\u00e9]mon\b/i.test(pageText)) {
                const spec = extractEncounterSpeciesName();
                handleMatchedTarget('Paradox: ' + (spec ? spec.toUpperCase() : 'Pokemon'));
                return;
            }

            // 3C. Category Header Banner: Rare & Legendary Pokemon (e.g. LEGENDARY POKEMON / LEGENDARY)
            if (pageText.indexOf('legendary') !== -1 || /\blegendary\s*pok[e\u00e9]mon\b/i.test(pageText)) {
                const spec = extractEncounterSpeciesName();
                handleMatchedTarget('Legendary: ' + (spec ? spec.toUpperCase() : 'Pokemon'));
                return;
            }

            // 3D. Comprehensive Species List Fallback (Gen 1 to Gen 9)
            for (let k = 0; k < LEGENDARY_BASE_LOWER.length; k++) {
                const leg = LEGENDARY_BASE_LOWER[k];
                if (pageText.indexOf(leg) !== -1) {
                    handleMatchedTarget('Legendary: ' + LEGENDARY_BASE[k]);
                    return;
                }
            }
        }

        // 4. Level Filters (Disabled by default to prevent catching random simple Pokemon)
        const levelMatch = pageText.match(/(?:level|lvl)[^0-9\r\n]{0,8}(\d{1,3})\b/i);
        if (levelMatch) {
            const currentLevel = parseInt(levelMatch[1], 10);

            if (findLevels && levelsToFind.map(Number).indexOf(currentLevel) !== -1) {
                handleMatchedTarget('Level ' + currentLevel + ' Pokemon');
                return;
            }

            if (findLevelsAndUp && currentLevel >= levelsAndUpToFind) {
                handleMatchedTarget('Level ' + currentLevel + '+ Pokemon');
                return;
            }
        }
    }

    /* ========== BATTLE LOOP ========== */
    function startBattleLoop() {
        if (!doBattle) return;
        if (window.location.pathname.indexOf(battle) === -1) {
            window.location.href = battle;
            return;
        }

        if (battleLoopInterval) clearInterval(battleLoopInterval);

        battleLoopInterval = setInterval(function() {
            const loading = document.getElementById('loading');
            if (loading && window.getComputedStyle(loading).visibility !== 'hidden' && window.getComputedStyle(loading).display !== 'none') {
                battleRetries++;
                if (battleRetries > 80) location.reload();
                return;
            }
            battleRetries = 0;

            // 1. Rebattle Opponent
            const allLinksAndButtons = Array.from(document.querySelectorAll('a, input[type="submit"], input[type="button"], button'));
            const rebattleLink = allLinksAndButtons.find(function(el) {
                const text = ((el.textContent || '') + ' ' + (el.value || '')).toLowerCase();
                return text.indexOf('rebattle') !== -1;
            });
            if (rebattleLink) {
                rebattleLink.click();
                return;
            }

            // 2. Start Battle
            const startBtn = document.querySelector('input[type="submit"][value*="Start Battle"], input[value*="Start Battle"]');
            if (startBtn) {
                startBtn.click();
                return;
            }

            // 3. Choose replacement Pokemon if current one faints
            const chooseBtn = document.querySelector('input[type="submit"][value*="Choose"], input[value*="Choose"], input[value*="Continue"]');
            if (chooseBtn) {
                chooseBtn.click();
                return;
            }

            // 4. Attack preference
            if (firstPokemonPrefAtt > 0) {
                const attackDropdown = document.querySelector('select[name*="attack"], select[name*="move"]');
                if (attackDropdown && attackDropdown.options.length >= firstPokemonPrefAtt) {
                    attackDropdown.selectedIndex = firstPokemonPrefAtt - 1;
                }
                const attackRadio = document.querySelector('input[name*="attack"][value="' + firstPokemonPrefAtt + '"]');
                if (attackRadio) {
                    attackRadio.checked = true;
                }
            }

            // 5. Attack button
            const attackBtn = document.querySelector('input[type="submit"][value*="Attack"], input[value*="Attack"]');
            if (attackBtn) {
                attackBtn.click();
            }
        }, attackFreq);
    }

    /* ========== AUTO LOGIN ========== */
    function tryAutoLogin() {
        if (!autoLogin || !username || !password) return;
        if (window.location.pathname.indexOf('/login') === -1) return;

        setTimeout(function() {
            const userInput = document.querySelector('input[name*="username"], input[id*="username"]');
            const passInput = document.querySelector('input[name*="password"], input[id*="password"]');

            if (userInput && passInput) {
                userInput.value = username;
                userInput.dispatchEvent(new Event('input', { bubbles: true }));
                userInput.dispatchEvent(new Event('change', { bubbles: true }));

                passInput.value = password;
                passInput.dispatchEvent(new Event('input', { bubbles: true }));
                passInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, 600);
    }

    /* ========== DASHBOARD REDIRECT ========== */
    function redirectToBattle() {
        if (!forceBattle) return;
        if (window.location.pathname.indexOf('/dashboard') !== -1) {
            window.location.href = battle;
        }
    }

    /* ========== INITIALIZATION ========== */
    function init() {
        applyCosmeticAdHiding();
        tryAutoLogin();
        redirectToBattle();

        // Register keyboard hotkeys on all pages
        document.addEventListener('keydown', function(e) {
            if (e.key === toggleHotkey) {
                e.preventDefault();
                toggleFinder();
            } else if (e.key === targetPresetHotkey) {
                e.preventDefault();
                cycleTargetPreset();
            }
        });

        const path = window.location.pathname;

        // Skip PokeFinder completely on Trainer / Gym / User battles so it never collides with Intelligent Grind
        const isTrainerOrGymBattle = path.includes('/battle/trainer') ||
                                     path.includes('/battle/gym') ||
                                     path.includes('/battle/user') ||
                                     path.includes('/battle/challenge');
        if (isTrainerOrGymBattle) {
            return;
        }

        // 1. Catch / Wild battle screen handling
        const isBattleCatchPage = path.indexOf('/catch') !== -1 ||
                                  (path.indexOf('/battle') !== -1 && path.indexOf(battle) === -1);

        if (isBattleCatchPage) {
            createStatusUI();
            updateStatusUI('Catch Screen', '#2196f3');
            if (autoCatch) startCatchSequence();
            return;
        }

        // 2. Map hunting handling
        if (path.indexOf('/map') !== -1) {
            createStatusUI();
            // Check if in-page encounter UI is currently open on /map
            const inPageCatchUI = document.querySelector('input[value*="Start Battle"], input[type="radio"][value*="masterball" i], input[value*="Throw"]');
            if (inPageCatchUI && autoCatch) {
                updateStatusUI('Catching Encounter...', '#2196f3');
                startCatchSequence();
                return;
            }

            resumeMapHunting();
            return;
        }

        // 3. Trainer auto-battle loop
        if (doBattle && path.indexOf(battle) !== -1) {
            createStatusUI();
            updateStatusUI('In Battle', '#e91e63');
            startBattleLoop();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
