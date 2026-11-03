// Comprehensive Target Database
// Directly verified and matched against DelugeRPG Dex in /VeryRarePokemons

const TARGETS = {
    // 1. All Legendaries, Mythicals, Ultra Beasts, and Paradox (Gen 1 to Gen 9)
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

    // 2. All 46 Mega Evolution Families (Base, Middle, Final)
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

    // 3. All 10 Pseudo-Legendary Families (600 BST 3-Stage Evolutionary Lines)
    pseudoLegendaries: [
        // Gen 1
        "Dratini", "Dragonair", "Dragonite",
        // Gen 2
        "Larvitar", "Pupitar", "Tyranitar",
        // Gen 3
        "Bagon", "Shelgon", "Salamence",
        "Beldum", "Metang", "Metagross",
        // Gen 4
        "Gible", "Gabite", "Garchomp",
        // Gen 5
        "Deino", "Zweilous", "Hydreigon",
        // Gen 6
        "Goomy", "Sliggoo", "Goodra",
        // Gen 7
        "Jangmo-o", "Hakamo-o", "Kommo-o",
        // Gen 8
        "Dreepy", "Drakloak", "Dragapult",
        // Gen 9
        "Frigibax", "Arctibax", "Baxcalibur"
    ],

    // 4. Special Form Prefixes (DelugeRPG)
    specialForms: [
        "mega", "gigantamax", "g-max", "gmax", "primal", "ultra"
    ],

    // 4. Special Sprite Variants
    specialVariants: [
        "shiny", "metallic", "ghostly", "dark", "shadow", "mirage", "chrome", "negative", "retro"
    ]
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TARGETS;
}

