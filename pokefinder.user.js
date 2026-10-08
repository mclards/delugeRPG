// ==UserScript==
// @name         DelugeRPG: Pokefinder
// @namespace    https://greasyfork.org/users/789978-anxarden
// @version      v4.5
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
    const autoCatch = false; // Automatically throw Master Ball when a target appears
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
            '</button>'
        ].join(' ');

        const targetBtn = document.getElementById('pokefinder-target-btn');
        if (targetBtn) {
            targetBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                cycleTargetPreset();
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

    function isCatchOrEncounterPresent() {
        const catchBtn = document.querySelector(
            'input[type="submit"]#catch, input#catch, button#catch, ' +
            'input[type="submit"][value*="Catch" i], button[value*="Catch" i], .catch-form input[type="submit"], ' +
            'button[value*="Try to Catch" i], form[action*="catch"] input[type="submit"], form[action*="catch"] button'
        );
        if (catchBtn && window.getComputedStyle(catchBtn).display !== 'none') return true;

        const catchLinks = document.querySelectorAll('#showpoke a, #dexy a, .catch-form a, a[href*="/catch/"]');
        for (let l = 0; l < catchLinks.length; l++) {
            const clk = catchLinks[l];
            const cHref = (clk.getAttribute('href') || '').toLowerCase();
            const cText = (clk.textContent || clk.innerText || '').toLowerCase();
            if ((cHref.indexOf('/catch/') !== -1 || cText.indexOf('catch') !== -1) &&
                window.getComputedStyle(clk).display !== 'none') {
                return true;
            }
        }

        const candidateContainers = [
            document.getElementById('showpoke'),
            document.querySelector('.showpoke'),
            document.getElementById('showpoke-name'),
            document.querySelector('.catch-form'),
            document.getElementById('show-pokemon'),
            document.getElementById('dexy'),
            document.querySelector('.dexy')
        ];

        for (let c = 0; c < candidateContainers.length; c++) {
            const box = candidateContainers[c];
            if (!box) continue;

            try {
                const style = window.getComputedStyle(box);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
            } catch (_) {}

            const pokeImg = box.querySelector('img[src*="/pokemon/"], img[src*="/sprites/"], img[src*="/dex/"]');
            if (pokeImg) {
                return true;
            }

            const innerElements = box.querySelectorAll('a, button, input');
            for (let e = 0; e < innerElements.length; e++) {
                const inner = innerElements[e];
                const innerText = ((inner.textContent || '') + ' ' + (inner.value || '') + ' ' + (inner.getAttribute('href') || '')).toLowerCase();
                if (innerText.indexOf('catch') !== -1) {
                    return true;
                }
            }

            const rawText = (box.innerText || box.textContent || '').trim().toLowerCase();
            const normText = rawText.replace(/[\u2018\u2019]/g, "'");

            if (normText.indexOf("couldn't find") !== -1 ||
                normText.indexOf("could not find") !== -1 ||
                normText.indexOf('try moving to another spot') !== -1 ||
                normText.indexOf('searching...') !== -1) {
                continue;
            }

            if (normText.indexOf('appeared') !== -1 ||
                normText.indexOf('wild ') !== -1 ||
                normText.indexOf('level') !== -1 ||
                normText.indexOf('lvl') !== -1 ||
                normText.indexOf('catch') !== -1) {
                return true;
            }
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

    /* ========== CATCH SEQUENCE ========== */
    function triggerTargetFound(targetName) {
        if (!finderActive) return;
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
            const catchBtn = document.querySelector('input[type="submit"][id="catch"], input#catch, button#catch, input[value*="Catch"], input[value*="Try to Catch"], a#catch, #showpoke a, a[href*="/catch/"]');
            if (catchBtn) {
                catchBtn.click();
            }
            startCatchSequence();
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

        catchStepInterval = setInterval(function() {
            attempts++;
            if (attempts > 80) { // Stop after 40 seconds
                clearInterval(catchStepInterval);
                return;
            }

            const ballWasThrown = sessionStorage.getItem('pokefinder_ball_thrown') === 'true';

            // STEP 1: ONLY check for Return to Map AFTER a ball was actually thrown!
            // (Prevents prematurely clicking navbar map links before the battle starts)
            if (ballWasThrown) {
                const bodyText = (document.body ? document.body.textContent || '' : '').toLowerCase();
                const isConfirmed = bodyText.indexOf('was caught') !== -1 ||
                                    bodyText.indexOf('captured') !== -1 ||
                                    bodyText.indexOf('you threw a') !== -1;

                // STRICT MATCH: Only match elements whose visible text is explicitly "Return to Map"
                // NEVER match general navigation links like <a href="/map">Maps</a>!
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

                    updateStatusUI('Caught! Returning...', '#00e676');
                    console.log('[PokeFinder] Catch confirmed! Returning to map...');

                    if (returnBtn) {
                        returnBtn.click();
                    } else if (window.location.pathname.indexOf('/map') === -1) {
                        window.location.href = '/map';
                    } else {
                        resumeMapHunting();
                    }
                    return;
                }
            }

            // STEP 2: Click "Start Battle" if present
            const startBattleBtn = document.querySelector('input[type="submit"][value*="Start Battle"], input[value*="Start Battle"], button[value*="Start Battle"]');
            if (startBattleBtn && window.getComputedStyle(startBattleBtn).display !== 'none') {
                startBattleBtn.click();
                return;
            }

            // STEP 3: Smart Pokeball Selection (Fallback & User Manual Choice Preservation)
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

            // Scope radio search to throw form or pokeballs container
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

            // Filter relevant pokeball radios
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
            let selectedBallDesc = '';

            // 1. Check if user already has a valid ball checked (DO NOT UNCLICK!)
            for (let i = 0; i < ballRadios.length; i++) {
                const item = ballRadios[i];
                if (item.radio.checked && !isRadioUnavailable(item.radio, item.desc)) {
                    selectedBall = item.radio;
                    selectedBallDesc = item.desc;
                    break;
                }
            }

            // 2. Fallback in priority order: Master -> Ultra -> Great -> Poke
            if (!selectedBall) {
                const priorities = ['master', 'ultra', 'great', 'poke'];
                for (let p = 0; p < priorities.length; p++) {
                    const priorityName = priorities[p];
                    for (let i = 0; i < ballRadios.length; i++) {
                        const item = ballRadios[i];
                        if (isRadioUnavailable(item.radio, item.desc)) continue;
                        if (item.dLower.indexOf(priorityName) !== -1) {
                            selectedBall = item.radio;
                            selectedBallDesc = item.desc;
                            selectedBall.click();
                            selectedBall.checked = true;
                            selectedBall.dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                    if (selectedBall) break;
                }
            }

            // 3. Fallback: pick any ball with count > 0
            if (!selectedBall) {
                for (let i = 0; i < ballRadios.length; i++) {
                    const item = ballRadios[i];
                    if (!isRadioUnavailable(item.radio, item.desc)) {
                        selectedBall = item.radio;
                        selectedBallDesc = item.desc;
                        selectedBall.click();
                        selectedBall.checked = true;
                        selectedBall.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
            }

            // STEP 4: Throw Pokeball
            if (selectedBall && throwBtn && window.getComputedStyle(throwBtn).display !== 'none') {
                throwBtn.click();
                try {
                    sessionStorage.setItem('pokefinder_ball_thrown', 'true');
                } catch (_) {}
                let name = 'Target';
                try {
                    name = sessionStorage.getItem('pokefinder_target') || 'Target';
                } catch (_) {}
                updateStatusUI('Throwing ball at ' + name + '...', '#2196f3');
                console.log('[PokeFinder] Threw ball at ' + name + '!');
                return;
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

        // 1. All DelugeRPG encounter elements including #showpoke, #dexy, #catch, etc.
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

        // 2. Entire parent container of any catch button
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

        // 1. Check for ANY Special Sprite Variant (Chrome, Retro, Shadow, Ghostly, Metallic, Dark, Shiny, etc.)
        if (currentFindVariants) {
            for (let i = 0; i < SPECIAL_VARIANTS.length; i++) {
                const mod = SPECIAL_VARIANTS[i];
                const match = pageText.match(new RegExp('\\b' + mod + '[- ]+([a-z0-9\\-\':]+)', 'i'));
                if (match) {
                    triggerTargetFound(mod.toUpperCase() + ' ' + match[1]);
                    return;
                }
            }
        }

        // 2. Check for Mega Evolutions, Gigantamax, Primal & Ultra forms
        if (currentFindMegas) {
            // A. Form prefix match (e.g., "Mega Charizard", "Gigantamax Pikachu")
            for (let j = 0; j < SPECIAL_FORMS.length; j++) {
                const form = SPECIAL_FORMS[j];
                const formMatch = pageText.match(new RegExp('\\b' + form + '[- ]+([a-z0-9\\-\':]+)', 'i'));
                if (formMatch) {
                    if (form.toLowerCase() === 'ultra' && formMatch[1].toLowerCase().startsWith('ball')) {
                        continue;
                    }
                    triggerTargetFound(form.toUpperCase() + ' ' + formMatch[1]);
                    return;
                }
            }

            // B. Full evolutionary families capable of Mega Evolution (Base, Middle, Final)
            for (let mg = 0; mg < MEGA_CAPABLE_LOWER.length; mg++) {
                const megaTarget = MEGA_CAPABLE_LOWER[mg];
                if (pageText.indexOf(megaTarget) !== -1) {
                    triggerTargetFound('Mega Line: ' + MEGA_CAPABLE_BASE[mg]);
                    return;
                }
            }
        }

        // 3. Check Legendaries & Mythicals (Gen 1 to Gen 9)
        if (currentFindLegendaries) {
            for (let k = 0; k < LEGENDARY_BASE_LOWER.length; k++) {
                const leg = LEGENDARY_BASE_LOWER[k];
                if (pageText.indexOf(leg) !== -1) {
                    triggerTargetFound('Legendary: ' + LEGENDARY_BASE[k]);
                    return;
                }
            }
        }

        // 4. Level Filters (Disabled by default to prevent catching random simple Pokemon)
        const levelMatch = pageText.match(/(?:level|lvl)[^0-9\r\n]{0,8}(\d{1,3})\b/i);
        if (levelMatch) {
            const currentLevel = parseInt(levelMatch[1], 10);

            if (findLevels && levelsToFind.map(Number).indexOf(currentLevel) !== -1) {
                triggerTargetFound('Level ' + currentLevel + ' Pokemon');
                return;
            }

            if (findLevelsAndUp && currentLevel >= levelsAndUpToFind) {
                triggerTargetFound('Level ' + currentLevel + '+ Pokemon');
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
