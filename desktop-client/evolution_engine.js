// evolution_engine.js - DelugeRPG Pokemon Evolution & Moveset Advisor Engine
// Analyzes optimal evolution paths, evaluates collection ownership, and recommends movesets
// Strictly 100% 7-bit clean ASCII

const teamEngine = require('./team_engine.js');
let skillsMap = null;
try {
  skillsMap = require('./skills_database.json').moves || {};
} catch (e) {
  skillsMap = {};
}

// -----------------------------------------------------------------------------
// 1. EVOLUTION FAMILIES DATABASE (Branching and Popular Evolution Lines)
// -----------------------------------------------------------------------------
const EVOLUTION_FAMILIES = {
  // Branching Lines
  eevee: {
    base: 'Eevee',
    stages: ['Eevee'],
    branches: [
      { name: 'Vaporeon', types: ['Water'], bst: 525, gmax: false, mega: false, role: 'Bulky Water Tank', keyMoves: ['Hydro Pump', 'Surf', 'Ice Beam', 'Earthquake'] },
      { name: 'Jolteon', types: ['Electric'], bst: 525, gmax: false, mega: false, role: 'High-Speed Electric Sweeper', keyMoves: ['Thunderbolt', 'Thunder', 'Shadow Ball', 'Signal Beam'] },
      { name: 'Flareon', types: ['Fire'], bst: 525, gmax: false, mega: false, role: 'High Attack Fire Striker', keyMoves: ['Flare Blitz', 'Fire Blast', 'Superpower', 'Iron Tail'] },
      { name: 'Espeon', types: ['Psychic'], bst: 525, gmax: false, mega: false, role: 'Fast Special Sweeper', keyMoves: ['Psychic', 'Psyshock', 'Shadow Ball', 'Dazzling Gleam'] },
      { name: 'Umbreon', types: ['Dark'], bst: 525, gmax: false, mega: false, role: 'High Defensive Stall', keyMoves: ['Dark Pulse', 'Foul Play', 'Psychic', 'Iron Tail'] },
      { name: 'Leafeon', types: ['Grass'], bst: 525, gmax: false, mega: false, role: 'Physical Grass Sweeper', keyMoves: ['Leaf Blade', 'Solar Blade', 'X-Scissor', 'Iron Tail'] },
      { name: 'Glaceon', types: ['Ice'], bst: 525, gmax: false, mega: false, role: 'Special Ice Attacker', keyMoves: ['Ice Beam', 'Blizzard', 'Shadow Ball', 'Water Pulse'] },
      { name: 'Sylveon', types: ['Fairy'], bst: 525, gmax: false, mega: false, role: 'Anti-Dragon Fairy Sweeper', keyMoves: ['Moonblast', 'Hyper Voice', 'Mystical Fire', 'Psyshock'] }
    ]
  },
  applin: {
    base: 'Applin',
    stages: ['Applin'],
    branches: [
      { name: 'Flapple', types: ['Grass', 'Dragon'], bst: 485, gmax: true, mega: false, role: 'G-Max Physical Striker', keyMoves: ['Grav Apple', 'Outrage', 'Dragon Rush', 'Acrobatics'] },
      { name: 'Appletun', types: ['Grass', 'Dragon'], bst: 485, gmax: true, mega: false, role: 'G-Max Bulky Tank', keyMoves: ['Apple Acid', 'Dragon Pulse', 'Energy Ball', 'Recover'] },
      { name: 'Dipplin', types: ['Grass', 'Dragon'], bst: 485, gmax: false, mega: false, role: 'Eviscerating Support', keyMoves: ['Syrup Bomb', 'Dragon Pulse', 'Energy Ball', 'Giga Drain'] },
      { name: 'Hydrapple', types: ['Grass', 'Dragon'], bst: 540, gmax: false, mega: false, role: 'Top BST Multi-Head Sweeper', keyMoves: ['Fickle Beam', 'Energy Ball', 'Dragon Pulse', 'Earth Power'] }
    ]
  },
  tyrogue: {
    base: 'Tyrogue',
    stages: ['Tyrogue'],
    branches: [
      { name: 'Hitmonlee', types: ['Fighting'], bst: 455, gmax: false, mega: false, role: 'High Attack Kick Specialist', keyMoves: ['High Jump Kick', 'Close Combat', 'Stone Edge', 'Knock Off'] },
      { name: 'Hitmonchan', types: ['Fighting'], bst: 455, gmax: false, mega: false, role: 'Elemental Punch Coverage', keyMoves: ['Drain Punch', 'Fire Punch', 'Ice Punch', 'Thunder Punch'] },
      { name: 'Hitmontop', types: ['Fighting'], bst: 455, gmax: false, mega: false, role: 'Technician Rapid Spinner', keyMoves: ['Triple Axel', 'Close Combat', 'Sucker Punch', 'Stone Edge'] }
    ]
  },
  slowpoke: {
    base: 'Slowpoke',
    stages: ['Slowpoke'],
    branches: [
      { name: 'Slowbro', types: ['Water', 'Psychic'], bst: 490, gmax: false, mega: true, role: 'Mega Capable Physical Wall', keyMoves: ['Scald', 'Psychic', 'Ice Beam', 'Flamethrower'] },
      { name: 'Slowking', types: ['Water', 'Psychic'], bst: 490, gmax: false, mega: false, role: 'Special Defense Wall', keyMoves: ['Surf', 'Psychic', 'Ice Beam', 'Fire Blast'] }
    ]
  },
  scyther: {
    base: 'Scyther',
    stages: ['Scyther'],
    branches: [
      { name: 'Scizor', types: ['Bug', 'Steel'], bst: 500, gmax: false, mega: true, role: 'Mega Capable Steel Sweeper', keyMoves: ['Bullet Punch', 'X-Scissor', 'Close Combat', 'Acrobatics'] },
      { name: 'Kleavor', types: ['Bug', 'Rock'], bst: 500, gmax: false, mega: false, role: 'Stone Axe Hazard Sweeper', keyMoves: ['Stone Axe', 'X-Scissor', 'Close Combat', 'Night Slash'] }
    ]
  },
  poliwag: {
    base: 'Poliwag',
    stages: ['Poliwag', 'Poliwhirl'],
    branches: [
      { name: 'Poliwrath', types: ['Water', 'Fighting'], bst: 510, gmax: false, mega: false, role: 'Dynamic Punch Striker', keyMoves: ['Dynamic Punch', 'Waterfall', 'Ice Punch', 'Earthquake'] },
      { name: 'Politoed', types: ['Water'], bst: 500, gmax: false, mega: false, role: 'Drizzle Water Supporter', keyMoves: ['Hydro Pump', 'Surf', 'Ice Beam', 'Psychic'] }
    ]
  },
  ralts: {
    base: 'Ralts',
    stages: ['Ralts', 'Kirlia'],
    branches: [
      { name: 'Gardevoir', types: ['Psychic', 'Fairy'], bst: 518, gmax: false, mega: true, role: 'Mega Pixilate Special Sweeper', keyMoves: ['Moonblast', 'Psychic', 'Shadow Ball', 'Thunderbolt'] },
      { name: 'Gallade', types: ['Psychic', 'Fighting'], bst: 518, gmax: false, mega: true, role: 'Mega Sharpness Blade Sweeper', keyMoves: ['Sacred Sword', 'Psycho Cut', 'Leaf Blade', 'Night Slash'] }
    ]
  },
  charcadet: {
    base: 'Charcadet',
    stages: ['Charcadet'],
    branches: [
      { name: 'Ceruledge', types: ['Fire', 'Ghost'], bst: 525, gmax: false, mega: false, role: 'Bitter Blade Self-Healing Sweeper', keyMoves: ['Bitter Blade', 'Poltergeist', 'Shadow Sneak', 'Close Combat'] },
      { name: 'Armarouge', types: ['Fire', 'Psychic'], bst: 525, gmax: false, mega: false, role: 'Armor Cannon Artillery', keyMoves: ['Armor Cannon', 'Psychic', 'Energy Ball', 'Aura Sphere'] }
    ]
  },
  kubfu: {
    base: 'Kubfu',
    stages: ['Kubfu'],
    branches: [
      { name: 'Urshifu (Single Strike)', types: ['Fighting', 'Dark'], bst: 550, gmax: true, mega: false, role: 'G-Max Wicked Blow Guard-Breaker', keyMoves: ['Wicked Blow', 'Close Combat', 'Poison Jab', 'Iron Head'] },
      { name: 'Urshifu (Rapid Strike)', types: ['Fighting', 'Water'], bst: 550, gmax: true, mega: false, role: 'G-Max Surging Strikes Multi-Hit', keyMoves: ['Surging Strikes', 'Close Combat', 'Aqua Jet', 'Ice Punch'] }
    ]
  },
  snorunt: {
    base: 'Snorunt',
    stages: ['Snorunt'],
    branches: [
      { name: 'Glalie', types: ['Ice'], bst: 480, gmax: false, mega: true, role: 'Mega Refrigerate Explosion Sweeper', keyMoves: ['Ice Beam', 'Blizzard', 'Earthquake', 'Shadow Ball'] },
      { name: 'Froslass', types: ['Ice', 'Ghost'], bst: 480, gmax: false, mega: false, role: 'High Speed Ghost Striker', keyMoves: ['Ice Beam', 'Shadow Ball', 'Thunderbolt', 'Psychic'] }
    ]
  },
  oddish: {
    base: 'Oddish',
    stages: ['Oddish', 'Gloom'],
    branches: [
      { name: 'Vileplume', types: ['Grass', 'Poison'], bst: 490, gmax: false, mega: false, role: 'Sludge Bomb Special Striker', keyMoves: ['Sludge Bomb', 'Energy Ball', 'Giga Drain', 'Moonblast'] },
      { name: 'Bellossom', types: ['Grass'], bst: 490, gmax: false, mega: false, role: 'Quiver Dance Grass Sweeper', keyMoves: ['Energy Ball', 'Moonblast', 'Sludge Bomb', 'Dazzling Gleam'] }
    ]
  },
  wurmple: {
    base: 'Wurmple',
    stages: ['Wurmple', 'Silcoon', 'Cascoon'],
    branches: [
      { name: 'Beautifly', types: ['Bug', 'Flying'], bst: 395, gmax: false, mega: false, role: 'Quiver Dance Attacker', keyMoves: ['Bug Buzz', 'Air Cutter', 'Energy Ball', 'Psychic'] },
      { name: 'Dustox', types: ['Bug', 'Poison'], bst: 385, gmax: false, mega: false, role: 'Shield Dust Defensive Wall', keyMoves: ['Bug Buzz', 'Sludge Bomb', 'Shadow Ball', 'Psychic'] }
    ]
  },
  cosmog: {
    base: 'Cosmog',
    stages: ['Cosmog', 'Cosmoem'],
    branches: [
      { name: 'Solgaleo', types: ['Psychic', 'Steel'], bst: 680, gmax: false, mega: false, role: 'Sunsteel Strike Legendary Wallbreaker', keyMoves: ['Sunsteel Strike', 'Zen Headbutt', 'Earthquake', 'Flare Blitz'] },
      { name: 'Lunala', types: ['Psychic', 'Ghost'], bst: 680, gmax: false, mega: false, role: 'Moongeist Beam Legendary Sweeper', keyMoves: ['Moongeist Beam', 'Psychic', 'Ice Beam', 'Thunderbolt'] }
    ]
  },
  rockruff: {
    base: 'Rockruff',
    stages: ['Rockruff'],
    branches: [
      { name: 'Lycanroc (Midday)', types: ['Rock'], bst: 487, gmax: false, mega: false, role: 'Accelerock Priority Striker', keyMoves: ['Accelerock', 'Stone Edge', 'Close Combat', 'Crunch'] },
      { name: 'Lycanroc (Dusk)', types: ['Rock'], bst: 487, gmax: false, mega: false, role: 'Tough Claws Physical Sweeper', keyMoves: ['Stone Edge', 'Close Combat', 'Crunch', 'Iron Head'] },
      { name: 'Lycanroc (Midnight)', types: ['Rock'], bst: 487, gmax: false, mega: false, role: 'No Guard Stone Edge Attacker', keyMoves: ['Stone Edge', 'Iron Head', 'Play Rough', 'Close Combat'] }
    ]
  },
  clamperl: {
    base: 'Clamperl',
    stages: ['Clamperl'],
    branches: [
      { name: 'Huntail', types: ['Water'], bst: 485, gmax: false, mega: false, role: 'Deep Sea Tooth Physical Sweeper', keyMoves: ['Waterfall', 'Crunch', 'Ice Fang', 'Aqua Tail'] },
      { name: 'Gorebyss', types: ['Water'], bst: 485, gmax: false, mega: false, role: 'Deep Sea Scale Special Sweeper', keyMoves: ['Hydro Pump', 'Ice Beam', 'Psychic', 'Shadow Ball'] }
    ]
  },
  toxel: {
    base: 'Toxel',
    stages: ['Toxel'],
    branches: [
      { name: 'Toxtricity (Amped)', types: ['Electric', 'Poison'], bst: 502, gmax: true, mega: false, role: 'G-Max Punk Rock Sound Sweeper', keyMoves: ['Boomburst', 'Overdrive', 'Sludge Bomb', 'Volt Switch'] },
      { name: 'Toxtricity (Low Key)', types: ['Electric', 'Poison'], bst: 502, gmax: true, mega: false, role: 'G-Max Punk Rock Sound Sweeper', keyMoves: ['Boomburst', 'Overdrive', 'Sludge Wave', 'Hex'] }
    ]
  },
  sneasel: {
    base: 'Sneasel',
    stages: ['Sneasel'],
    branches: [
      { name: 'Weavile', types: ['Dark', 'Ice'], bst: 510, gmax: false, mega: false, role: 'High Speed Physical Assassin', keyMoves: ['Triple Axel', 'Knock Off', 'Ice Shard', 'Poison Jab'] },
      { name: 'Sneasler', types: ['Poison', 'Fighting'], bst: 510, gmax: false, mega: false, role: 'Dire Claw Unburden Sweeper', keyMoves: ['Dire Claw', 'Close Combat', 'Acrobatics', 'Night Slash'] }
    ]
  },
  wooper: {
    base: 'Wooper',
    stages: ['Wooper'],
    branches: [
      { name: 'Quagsire', types: ['Water', 'Ground'], bst: 430, gmax: false, mega: false, role: 'Unaware Defensive Tank', keyMoves: ['Earthquake', 'Scald', 'Waterfall', 'Ice Beam'] },
      { name: 'Clodsire', types: ['Poison', 'Ground'], bst: 430, gmax: false, mega: false, role: 'Water Absorb Special Sponge', keyMoves: ['Earthquake', 'Poison Jab', 'Megahorn', 'Stone Edge'] }
    ]
  },
  meowth: {
    base: 'Meowth',
    stages: ['Meowth'],
    branches: [
      { name: 'Persian', types: ['Normal'], bst: 440, gmax: false, mega: false, role: 'Technician Speedster', keyMoves: ['Fake Out', 'Slash', 'Play Rough', 'Bite'] },
      { name: 'Alolan Persian', types: ['Dark'], bst: 440, gmax: false, mega: false, role: 'Fur Coat Dark Tank', keyMoves: ['Dark Pulse', 'Thunderbolt', 'Power Gem', 'Shadow Ball'] },
      { name: 'Perrserker', types: ['Steel'], bst: 440, gmax: false, mega: false, role: 'Steely Spirit Steel Booster', keyMoves: ['Iron Head', 'Close Combat', 'Seed Bomb', 'Shadow Claw'] }
    ]
  },

  // Popular Linear Lines (Starters, Pseudos & High BST)
  charmander: {
    base: 'Charmander',
    stages: ['Charmander', 'Charmeleon'],
    branches: [
      { name: 'Charizard', types: ['Fire', 'Flying'], bst: 534, gmax: true, mega: true, role: 'Mega & G-Max Fire Sweeper', keyMoves: ['Flamethrower', 'Fire Blast', 'Hurricane', 'Solar Beam'] }
    ]
  },
  bulbasaur: {
    base: 'Bulbasaur',
    stages: ['Bulbasaur', 'Ivysaur'],
    branches: [
      { name: 'Venusaur', types: ['Grass', 'Poison'], bst: 525, gmax: true, mega: true, role: 'Mega & G-Max Sun Tank', keyMoves: ['Energy Ball', 'Sludge Bomb', 'Earth Power', 'Giga Drain'] }
    ]
  },
  squirtle: {
    base: 'Squirtle',
    stages: ['Squirtle', 'Wartortle'],
    branches: [
      { name: 'Blastoise', types: ['Water'], bst: 530, gmax: true, mega: true, role: 'Mega Launcher & G-Max Sweeper', keyMoves: ['Hydro Pump', 'Surf', 'Ice Beam', 'Aura Sphere'] }
    ]
  },
  cyndaquil: {
    base: 'Cyndaquil',
    stages: ['Cyndaquil', 'Quilava'],
    branches: [
      { name: 'Typhlosion', types: ['Fire'], bst: 534, gmax: false, mega: false, role: 'Eruption Fire Sweeper', keyMoves: ['Eruption', 'Flamethrower', 'Focus Blast', 'Extrasensory'] }
    ]
  },
  totodile: {
    base: 'Totodile',
    stages: ['Totodile', 'Croconaw'],
    branches: [
      { name: 'Feraligatr', types: ['Water'], bst: 530, gmax: false, mega: false, role: 'Sheer Force Physical Sweeper', keyMoves: ['Waterfall', 'Ice Punch', 'Crunch', 'Earthquake'] }
    ]
  },
  treecko: {
    base: 'Treecko',
    stages: ['Treecko', 'Grovyle'],
    branches: [
      { name: 'Sceptile', types: ['Grass'], bst: 530, gmax: false, mega: true, role: 'Mega Dragon/Grass Speed Sweeper', keyMoves: ['Leaf Storm', 'Dragon Pulse', 'Energy Ball', 'Focus Blast'] }
    ]
  },
  torchic: {
    base: 'Torchic',
    stages: ['Torchic', 'Combusken'],
    branches: [
      { name: 'Blaziken', types: ['Fire', 'Fighting'], bst: 530, gmax: false, mega: true, role: 'Mega Speed Boost Sweeper', keyMoves: ['Flare Blitz', 'Close Combat', 'High Jump Kick', 'Stone Edge'] }
    ]
  },
  mudkip: {
    base: 'Mudkip',
    stages: ['Mudkip', 'Marshtomp'],
    branches: [
      { name: 'Swampert', types: ['Water', 'Ground'], bst: 535, gmax: false, mega: true, role: 'Mega Swift Swim Bulky Sweeper', keyMoves: ['Earthquake', 'Waterfall', 'Ice Punch', 'Superpower'] }
    ]
  },
  turtwig: {
    base: 'Turtwig',
    stages: ['Turtwig', 'Grotle'],
    branches: [
      { name: 'Torterra', types: ['Grass', 'Ground'], bst: 525, gmax: false, mega: false, role: 'Wood Hammer Ground Tank', keyMoves: ['Wood Hammer', 'Earthquake', 'Stone Edge', 'Crunch'] }
    ]
  },
  chimchar: {
    base: 'Chimchar',
    stages: ['Chimchar', 'Monferno'],
    branches: [
      { name: 'Infernape', types: ['Fire', 'Fighting'], bst: 534, gmax: false, mega: false, role: 'Iron Fist Mixed Sweeper', keyMoves: ['Flare Blitz', 'Close Combat', 'Mach Punch', 'Grass Knot'] }
    ]
  },
  piplup: {
    base: 'Piplup',
    stages: ['Piplup', 'Prinplup'],
    branches: [
      { name: 'Empoleon', types: ['Water', 'Steel'], bst: 530, gmax: false, mega: false, role: 'Competitive Steel/Water Tank', keyMoves: ['Hydro Pump', 'Flash Cannon', 'Ice Beam', 'Grass Knot'] }
    ]
  },
  snivy: {
    base: 'Snivy',
    stages: ['Snivy', 'Servine'],
    branches: [
      { name: 'Serperior', types: ['Grass'], bst: 528, gmax: false, mega: false, role: 'Contrary Leaf Storm Sweeper', keyMoves: ['Leaf Storm', 'Dragon Pulse', 'Giga Drain', 'Hidden Power Fire'] }
    ]
  },
  chespin: {
    base: 'Chespin',
    stages: ['Chespin', 'Quilladin'],
    branches: [
      { name: 'Chesnaught', types: ['Grass', 'Fighting'], bst: 530, gmax: false, mega: false, role: 'Bulletproof Physical Tank', keyMoves: ['Wood Hammer', 'Close Combat', 'Hammer Arm', 'Spiky Shield'] }
    ]
  },
  froakie: {
    base: 'Froakie',
    stages: ['Froakie', 'Frogadier'],
    branches: [
      { name: 'Greninja', types: ['Water', 'Dark'], bst: 530, gmax: false, mega: false, role: 'Protean / Battle Bond Sweeper', keyMoves: ['Hydro Pump', 'Dark Pulse', 'Ice Beam', 'Gunk Shot'] }
    ]
  },
  grookey: {
    base: 'Grookey',
    stages: ['Grookey', 'Thwackey'],
    branches: [
      { name: 'Rillaboom', types: ['Grass'], bst: 530, gmax: true, mega: false, role: 'G-Max Grassy Surge Sweeper', keyMoves: ['Grassy Glide', 'Wood Hammer', 'Earthquake', 'Knock Off'] }
    ]
  },
  scorbunny: {
    base: 'Scorbunny',
    stages: ['Scorbunny', 'Raboot'],
    branches: [
      { name: 'Cinderace', types: ['Fire'], bst: 530, gmax: true, mega: false, role: 'G-Max Libero Sweeper', keyMoves: ['Pyro Ball', 'High Jump Kick', 'Gunk Shot', 'Iron Head'] }
    ]
  },
  sobble: {
    base: 'Sobble',
    stages: ['Sobble', 'Drizzile'],
    branches: [
      { name: 'Inteleon', types: ['Water'], bst: 530, gmax: true, mega: false, role: 'G-Max Sniper Attacker', keyMoves: ['Snipe Shot', 'Hydro Pump', 'Ice Beam', 'Air Slash'] }
    ]
  },
  sprigatito: {
    base: 'Sprigatito',
    stages: ['Sprigatito', 'Floragato'],
    branches: [
      { name: 'Meowscarada', types: ['Grass', 'Dark'], bst: 530, gmax: false, mega: false, role: 'Flower Trick Protean Sweeper', keyMoves: ['Flower Trick', 'Knock Off', 'Play Rough', 'U-turn'] }
    ]
  },
  fuecoco: {
    base: 'Fuecoco',
    stages: ['Fuecoco', 'Crocalor'],
    branches: [
      { name: 'Skeledirge', types: ['Fire', 'Ghost'], bst: 530, gmax: false, mega: false, role: 'Torch Song Unaware Tank', keyMoves: ['Torch Song', 'Shadow Ball', 'Earth Power', 'Solar Beam'] }
    ]
  },
  quaxly: {
    base: 'Quaxly',
    stages: ['Quaxly', 'Quaxwell'],
    branches: [
      { name: 'Quaquaval', types: ['Water', 'Fighting'], bst: 530, gmax: false, mega: false, role: 'Aqua Step Moxie Sweeper', keyMoves: ['Aqua Step', 'Close Combat', 'Brave Bird', 'Ice Spinner'] }
    ]
  },
  dratini: {
    base: 'Dratini',
    stages: ['Dratini', 'Dragonair'],
    branches: [
      { name: 'Dragonite', types: ['Dragon', 'Flying'], bst: 600, gmax: false, mega: false, role: 'Multiscale Pseudo-Legendary', keyMoves: ['Outrage', 'Dragon Claw', 'Hurricane', 'Extreme Speed'] }
    ]
  },
  larvitar: {
    base: 'Larvitar',
    stages: ['Larvitar', 'Pupitar'],
    branches: [
      { name: 'Tyranitar', types: ['Rock', 'Dark'], bst: 600, gmax: false, mega: true, role: 'Mega Sand Stream Juggernaut', keyMoves: ['Stone Edge', 'Crunch', 'Earthquake', 'Fire Punch'] }
    ]
  },
  bagon: {
    base: 'Bagon',
    stages: ['Bagon', 'Shelgon'],
    branches: [
      { name: 'Salamence', types: ['Dragon', 'Flying'], bst: 600, gmax: false, mega: true, role: 'Mega Aerilate Dragon Sweeper', keyMoves: ['Dragon Pulse', 'Hurricane', 'Fire Blast', 'Hydro Pump'] }
    ]
  },
  beldum: {
    base: 'Beldum',
    stages: ['Beldum', 'Metang'],
    branches: [
      { name: 'Metagross', types: ['Steel', 'Psychic'], bst: 600, gmax: false, mega: true, role: 'Mega Tough Claws Behemoth', keyMoves: ['Meteor Mash', 'Zen Headbutt', 'Earthquake', 'Bullet Punch'] }
    ]
  },
  gible: {
    base: 'Gible',
    stages: ['Gible', 'Gabite'],
    branches: [
      { name: 'Garchomp', types: ['Dragon', 'Ground'], bst: 600, gmax: false, mega: true, role: 'Mega Ground Dragon Sweeper', keyMoves: ['Earthquake', 'Dragon Claw', 'Stone Edge', 'Fire Blast'] }
    ]
  },
  dreepy: {
    base: 'Dreepy',
    stages: ['Dreepy', 'Drakloak'],
    branches: [
      { name: 'Dragapult', types: ['Dragon', 'Ghost'], bst: 600, gmax: false, mega: false, role: 'High Speed Infiltrator', keyMoves: ['Dragon Darts', 'Shadow Ball', 'Flamethrower', 'Thunderbolt'] }
    ]
  },
  frigibax: {
    base: 'Frigibax',
    stages: ['Frigibax', 'Arctibax'],
    branches: [
      { name: 'Baxcalibur', types: ['Dragon', 'Ice'], bst: 600, gmax: false, mega: false, role: 'Thermal Exchange Glaive Rush', keyMoves: ['Glaive Rush', 'Icicle Crash', 'Earthquake', 'Dragon Dance'] }
    ]
  },
  gastly: {
    base: 'Gastly',
    stages: ['Gastly', 'Haunter'],
    branches: [
      { name: 'Gengar', types: ['Ghost', 'Poison'], bst: 500, gmax: true, mega: true, role: 'Mega & G-Max Shadow Sweeper', keyMoves: ['Shadow Ball', 'Sludge Bomb', 'Thunderbolt', 'Focus Blast'] }
    ]
  },
  magikarp: {
    base: 'Magikarp',
    stages: ['Magikarp'],
    branches: [
      { name: 'Gyarados', types: ['Water', 'Flying'], bst: 540, gmax: false, mega: true, role: 'Mega Mold Breaker Water Sweeper', keyMoves: ['Waterfall', 'Crunch', 'Earthquake', 'Ice Fang'] }
    ]
  },
  abra: {
    base: 'Abra',
    stages: ['Abra', 'Kadabra'],
    branches: [
      { name: 'Alakazam', types: ['Psychic'], bst: 500, gmax: false, mega: true, role: 'Mega Magic Guard Special Cannon', keyMoves: ['Psychic', 'Psyshock', 'Shadow Ball', 'Focus Blast'] }
    ]
  },
  machop: {
    base: 'Machop',
    stages: ['Machop', 'Machoke'],
    branches: [
      { name: 'Machamp', types: ['Fighting'], bst: 505, gmax: true, mega: false, role: 'G-Max No Guard Dynamic Punch', keyMoves: ['Dynamic Punch', 'Stone Edge', 'Knock Off', 'Poison Jab'] }
    ]
  },
  onix: {
    base: 'Onix',
    stages: ['Onix'],
    branches: [
      { name: 'Steelix', types: ['Steel', 'Ground'], bst: 510, gmax: false, mega: true, role: 'Mega Sand Force Steel Wall', keyMoves: ['Earthquake', 'Heavy Slam', 'Stone Edge', 'Fire Fang'] }
    ]
  },
  rhyhorn: {
    base: 'Rhyhorn',
    stages: ['Rhyhorn', 'Rhydon'],
    branches: [
      { name: 'Rhyperior', types: ['Ground', 'Rock'], bst: 535, gmax: false, mega: false, role: 'Solid Rock Physical Fortress', keyMoves: ['Earthquake', 'Stone Edge', 'Megahorn', 'Ice Punch'] }
    ]
  },
  mankey: {
    base: 'Mankey',
    stages: ['Mankey', 'Primeape'],
    branches: [
      { name: 'Annihilape', types: ['Fighting', 'Ghost'], bst: 535, gmax: false, mega: false, role: 'Rage Fist Ghost Sweeper', keyMoves: ['Rage Fist', 'Close Combat', 'Drain Punch', 'Gunk Shot'] }
    ]
  },
  pawniard: {
    base: 'Pawniard',
    stages: ['Pawniard', 'Bisharp'],
    branches: [
      { name: 'Kingambit', types: ['Dark', 'Steel'], bst: 550, gmax: false, mega: false, role: 'Supreme Overlord Kowtow Cleave', keyMoves: ['Kowtow Cleave', 'Iron Head', 'Sucker Punch', 'Low Kick'] }
    ]
  },
  duraludon: {
    base: 'Duraludon',
    stages: ['Duraludon'],
    branches: [
      { name: 'Archaludon', types: ['Steel', 'Dragon'], bst: 600, gmax: false, mega: false, role: 'Stamina Electro Shot Juggernaut', keyMoves: ['Electro Shot', 'Flash Cannon', 'Draco Meteor', 'Body Press'] }
    ]
  },
  tinkatink: {
    base: 'Tinkatink',
    stages: ['Tinkatink', 'Tinkatuff'],
    branches: [
      { name: 'Tinkaton', types: ['Fairy', 'Steel'], bst: 506, gmax: false, mega: false, role: 'Gigaton Hammer Dragon Slayer', keyMoves: ['Gigaton Hammer', 'Play Rough', 'Knock Off', 'Stone Edge'] }
    ]
  },
  rookidee: {
    base: 'Rookidee',
    stages: ['Rookidee', 'Corvisquire'],
    branches: [
      { name: 'Corviknight', types: ['Flying', 'Steel'], bst: 495, gmax: true, mega: false, role: 'G-Max Mirror Armor Wall', keyMoves: ['Brave Bird', 'Iron Head', 'Body Press', 'U-turn'] }
    ]
  },
  impidimp: {
    base: 'Impidimp',
    stages: ['Impidimp', 'Morgrem'],
    branches: [
      { name: 'Grimmsnarl', types: ['Dark', 'Fairy'], bst: 510, gmax: true, mega: false, role: 'G-Max Prankster Screen Sweeper', keyMoves: ['Spirit Break', 'Darkest Lariat', 'Play Rough', 'Hammer Arm'] }
    ]
  },
  hatenna: {
    base: 'Hatenna',
    stages: ['Hatenna', 'Hattrem'],
    branches: [
      { name: 'Hatterene', types: ['Psychic', 'Fairy'], bst: 510, gmax: true, mega: false, role: 'G-Max Magic Bounce Sweeper', keyMoves: ['Dazzling Gleam', 'Psychic', 'Mystical Fire', 'Shadow Ball'] }
    ]
  }
};

// -----------------------------------------------------------------------------
// 2. DELUGE BEST ATTACKS PER TYPE
// -----------------------------------------------------------------------------
const TOP_STAB_MOVES = {
  Normal: ['Body Slam', 'Double-Edge', 'Hyper Voice', 'Return'],
  Fire: ['Flamethrower', 'Fire Blast', 'Flare Blitz', 'Heat Wave'],
  Water: ['Hydro Pump', 'Surf', 'Waterfall', 'Scald'],
  Grass: ['Energy Ball', 'Leaf Blade', 'Wood Hammer', 'Power Whip'],
  Electric: ['Thunderbolt', 'Thunder', 'Wild Charge', 'Discharge'],
  Ice: ['Ice Beam', 'Blizzard', 'Icicle Crash', 'Triple Axel'],
  Fighting: ['Close Combat', 'Aura Sphere', 'Superpower', 'Drain Punch'],
  Poison: ['Sludge Bomb', 'Sludge Wave', 'Gunk Shot', 'Poison Jab'],
  Ground: ['Earthquake', 'Earth Power', 'High Horsepower', 'Bonemerang'],
  Flying: ['Brave Bird', 'Hurricane', 'Air Slash', 'Acrobatics'],
  Psychic: ['Psychic', 'Psystrike', 'Psyshock', 'Extrasensory'],
  Bug: ['Bug Buzz', 'Megahorn', 'X-Scissor', 'Attack Order'],
  Rock: ['Stone Edge', 'Rock Slide', 'Power Gem', 'Head Smash'],
  Ghost: ['Shadow Ball', 'Poltergeist', 'Shadow Claw', 'Hex'],
  Dragon: ['Dragon Pulse', 'Draco Meteor', 'Dragon Claw', 'Outrage'],
  Steel: ['Flash Cannon', 'Iron Head', 'Meteor Mash', 'Gigaton Hammer'],
  Dark: ['Dark Pulse', 'Crunch', 'Foul Play', 'Knock Off'],
  Fairy: ['Moonblast', 'Dazzling Gleam', 'Play Rough', 'Spirit Break']
};

// Counters to cover weaknesses
const WEAKNESS_COVERAGE_MAP = {
  Normal: 'Fighting',
  Fire: 'Water',
  Water: 'Electric',
  Grass: 'Fire',
  Electric: 'Ground',
  Ice: 'Fire',
  Fighting: 'Flying',
  Poison: 'Ground',
  Ground: 'Water',
  Flying: 'Electric',
  Psychic: 'Dark',
  Bug: 'Fire',
  Rock: 'Water',
  Ghost: 'Dark',
  Dragon: 'Ice',
  Steel: 'Fire',
  Dark: 'Fighting',
  Fairy: 'Steel'
};

// -----------------------------------------------------------------------------
// 3. EVOLUTION ENGINE HELPER FUNCTIONS
// -----------------------------------------------------------------------------

const SPECIES_DEFAULT_TYPES = {
  latios: ['Dragon', 'Psychic'],
  latias: ['Dragon', 'Psychic'],
  mewtwo: ['Psychic'],
  mew: ['Psychic'],
  articuno: ['Ice', 'Flying'],
  zapdos: ['Electric', 'Flying'],
  moltres: ['Fire', 'Flying'],
  raikou: ['Electric'],
  entei: ['Fire'],
  suicune: ['Water'],
  lugia: ['Psychic', 'Flying'],
  'ho-oh': ['Fire', 'Flying'],
  celebi: ['Psychic', 'Grass'],
  regirock: ['Rock'],
  regice: ['Ice'],
  registeel: ['Steel'],
  kyogre: ['Water'],
  groudon: ['Ground'],
  rayquaza: ['Dragon', 'Flying'],
  jirachi: ['Steel', 'Psychic'],
  deoxys: ['Psychic'],
  dialga: ['Steel', 'Dragon'],
  palkia: ['Water', 'Dragon'],
  heatran: ['Fire', 'Steel'],
  regigigas: ['Normal'],
  giratina: ['Ghost', 'Dragon'],
  cresselia: ['Psychic'],
  phione: ['Water'],
  manaphy: ['Water'],
  darkrai: ['Dark'],
  shaymin: ['Grass'],
  arceus: ['Normal'],
  victini: ['Psychic', 'Fire'],
  cobalion: ['Steel', 'Fighting'],
  terrakion: ['Rock', 'Fighting'],
  virizion: ['Grass', 'Fighting'],
  tornadus: ['Flying'],
  thundurus: ['Electric', 'Flying'],
  reshiram: ['Dragon', 'Fire'],
  zekrom: ['Dragon', 'Electric'],
  landorus: ['Ground', 'Flying'],
  kyurem: ['Dragon', 'Ice'],
  keldeo: ['Water', 'Fighting'],
  meloetta: ['Normal', 'Psychic'],
  genesect: ['Bug', 'Steel'],
  xerneas: ['Fairy'],
  yveltal: ['Dark', 'Flying'],
  zygarde: ['Dragon', 'Ground'],
  diancie: ['Rock', 'Fairy'],
  hoopa: ['Psychic', 'Ghost'],
  volcanion: ['Fire', 'Water'],
  silvally: ['Normal'],
  'type: null': ['Normal'],
  'tapu koko': ['Electric', 'Fairy'],
  'tapu lele': ['Psychic', 'Fairy'],
  'tapu bulu': ['Grass', 'Fairy'],
  'tapu fini': ['Water', 'Fairy'],
  solgaleo: ['Psychic', 'Steel'],
  lunala: ['Psychic', 'Ghost'],
  nihilego: ['Rock', 'Poison'],
  buzzwole: ['Bug', 'Fighting'],
  pheromosa: ['Bug', 'Fighting'],
  xurkitree: ['Electric'],
  celesteela: ['Steel', 'Flying'],
  kartana: ['Grass', 'Steel'],
  guzzlord: ['Dark', 'Dragon'],
  necrozma: ['Psychic'],
  magearna: ['Steel', 'Fairy'],
  marshadow: ['Fighting', 'Ghost'],
  poipole: ['Poison'],
  naganadel: ['Poison', 'Dragon'],
  stakataka: ['Rock', 'Steel'],
  blacephalon: ['Fire', 'Ghost'],
  zeraora: ['Electric'],
  meltan: ['Steel'],
  melmetal: ['Steel'],
  zacian: ['Fairy', 'Steel'],
  zamazenta: ['Fighting', 'Steel'],
  eternatus: ['Poison', 'Dragon'],
  kubfu: ['Fighting'],
  urshifu: ['Fighting', 'Dark'],
  zarude: ['Dark', 'Grass'],
  regieleki: ['Electric'],
  regidrago: ['Dragon'],
  glastrier: ['Ice'],
  spectrier: ['Ghost'],
  calyrex: ['Psychic', 'Grass'],
  enamorus: ['Fairy', 'Flying'],
  'wo-chien': ['Dark', 'Grass'],
  'chien-pao': ['Dark', 'Ice'],
  'ting-lu': ['Dark', 'Ground'],
  'chi-yu': ['Dark', 'Fire'],
  koraidon: ['Fighting', 'Dragon'],
  miraidon: ['Electric', 'Dragon'],
  okidogi: ['Poison', 'Fighting'],
  munkidori: ['Poison', 'Psychic'],
  fezandipiti: ['Poison', 'Fairy'],
  ogerpon: ['Grass', 'Water'],
  terapagos: ['Normal'],
  pecharunt: ['Poison', 'Ghost'],
  'great tusk': ['Ground', 'Fighting'],
  'scream tail': ['Fairy', 'Psychic'],
  'brute bonnet': ['Grass', 'Dark'],
  'flutter mane': ['Ghost', 'Fairy'],
  'slither wing': ['Bug', 'Fighting'],
  'sandy shocks': ['Electric', 'Ground'],
  'iron treads': ['Ground', 'Steel'],
  'iron bundle': ['Ice', 'Water'],
  'iron hands': ['Fighting', 'Electric'],
  'iron jugulis': ['Dark', 'Flying'],
  'iron moth': ['Fire', 'Poison'],
  'iron thorns': ['Rock', 'Electric'],
  'roaring moon': ['Dragon', 'Dark'],
  'iron valiant': ['Fairy', 'Fighting'],
  'walking wake': ['Water', 'Dragon'],
  'iron leaves': ['Grass', 'Psychic'],
  'gouging fire': ['Fire', 'Dragon'],
  'raging bolt': ['Electric', 'Dragon'],
  'iron boulder': ['Rock', 'Psychic'],
  'iron crown': ['Steel', 'Psychic']
};

function resolvePokemonTypes(pokemonOrName, collection = []) {
  if (pokemonOrName && typeof pokemonOrName === 'object' && Array.isArray(pokemonOrName.types) && pokemonOrName.types.length > 0 && pokemonOrName.types[0] !== 'Normal') {
    return pokemonOrName.types;
  }
  const rawName = typeof pokemonOrName === 'string' ? pokemonOrName : (pokemonOrName ? pokemonOrName.name : '');
  const base = getBaseSpecies(rawName).toLowerCase();
  const cleanBase = base.replace(/^mega\s+/i, '').replace(/\s+mega$/i, '').trim();

  // 1. Check SPECIES_DEFAULT_TYPES
  if (SPECIES_DEFAULT_TYPES[base]) return SPECIES_DEFAULT_TYPES[base];
  if (SPECIES_DEFAULT_TYPES[cleanBase]) return SPECIES_DEFAULT_TYPES[cleanBase];

  // 2. Check EVOLUTION_FAMILIES
  const fam = findFamily(base) || findFamily(cleanBase);
  if (fam) {
    const matchBranch = fam.branches.find(b => b.name.toLowerCase() === base || b.name.toLowerCase() === cleanBase);
    if (matchBranch && matchBranch.types) return matchBranch.types;
    if (fam.base.toLowerCase() === base || fam.base.toLowerCase() === cleanBase) {
      if (fam.branches && fam.branches.length > 0 && fam.branches[0].types) return fam.branches[0].types;
    }
    if (Array.isArray(fam.stages) && fam.stages.some(s => s.toLowerCase() === base || s.toLowerCase() === cleanBase)) {
      if (fam.branches && fam.branches.length > 0 && fam.branches[0].types) return fam.branches[0].types;
    }
  }

  // 3. Check collection
  if (Array.isArray(collection) && collection.length > 0) {
    const cClean = cleanName(rawName);
    const matched = collection.find(p => {
      const pClean = cleanName(p.name || '');
      return pClean === cClean || pClean.includes(cClean) || cClean.includes(pClean);
    });
    if (matched && Array.isArray(matched.types) && matched.types.length > 0) {
      return matched.types;
    }
  }

  // 4. Return existing object types if any
  if (pokemonOrName && typeof pokemonOrName === 'object' && Array.isArray(pokemonOrName.types) && pokemonOrName.types.length > 0) {
    return pokemonOrName.types;
  }

  return ['Normal'];
}

function cleanName(n) {
  if (!n) return '';
  return String(n).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getBaseSpecies(name) {
  return teamEngine.getBaseSpecies(name);
}

// Find matching evolution family for any stage or species
function findFamily(speciesOrName) {
  if (!speciesOrName) return null;
  const raw = typeof speciesOrName === 'object' ? (speciesOrName.name || '') : String(speciesOrName);
  const base = getBaseSpecies(raw).toLowerCase();
  const cName = cleanName(raw);

  // Direct key check
  if (EVOLUTION_FAMILIES[base]) return EVOLUTION_FAMILIES[base];

  // Scan all families for matching base, stage, or branch
  for (const key of Object.keys(EVOLUTION_FAMILIES)) {
    const fam = EVOLUTION_FAMILIES[key];
    if (fam.base.toLowerCase() === base || cleanName(fam.base) === cName) {
      return fam;
    }
    if (Array.isArray(fam.stages) && fam.stages.some(s => s.toLowerCase() === base || cleanName(s) === cName)) {
      return fam;
    }
    if (Array.isArray(fam.branches) && fam.branches.some(b => b.name.toLowerCase() === base || cleanName(b.name) === cName)) {
      return fam;
    }
  }

  // Not found in static catalog, construct dynamic single-branch entry
  return null;
}

// Check collection ownership for a specific evolved form
function checkEvolutionOwnership(evolutionName, userCollection) {
  if (!Array.isArray(userCollection) || userCollection.length === 0 || !evolutionName) {
    return {
      isOwned: false,
      count: 0,
      bestLevel: 0,
      highestVariant: 'None',
      summaryLabel: '[NOT OWNED]',
      bestPoke: null,
      hasMegaOwned: false,
      ownedMega: null
    };
  }

  const eq = teamEngine.evaluateOwnershipAndMegaEquivalence(evolutionName, userCollection);
  if (!eq.isOwned) {
    return {
      isOwned: false,
      count: 0,
      bestLevel: 0,
      highestVariant: 'None',
      summaryLabel: '[NOT OWNED]',
      bestPoke: null,
      hasMegaOwned: false,
      ownedMega: null
    };
  }

  const best = eq.ownedPokemon;
  const variant = best.variant || 'Normal';
  const level = best.level || 100;
  const formattedFullName = (best.name.toLowerCase().startsWith(variant.toLowerCase() + ' ') || variant === 'Normal')
    ? best.name
    : `${variant} ${best.name}`;

  return {
    isOwned: true,
    count: 1,
    bestLevel: level,
    highestVariant: variant,
    summaryLabel: eq.hasMegaOwned
      ? `[OWNED - Lv ${level} ${formattedFullName} (MEGA)]`
      : `[OWNED - Lv ${level} ${formattedFullName}]`,
    bestPoke: best,
    hasMegaOwned: eq.hasMegaOwned,
    ownedMega: eq.hasMegaOwned ? eq.ownedPokemon : null,
    warningType: eq.type,
    alertTitle: eq.alertTitle,
    alertMessage: eq.alertMessage
  };
}

// -----------------------------------------------------------------------------
// 4. EVOLUTION PATH ANALYSIS (Deluge Viability + Ownership Smart Boost)
// -----------------------------------------------------------------------------
function analyzeEvolutionPath(pokemonName, userCollection) {
  const family = findFamily(pokemonName);
  const baseName = pokemonName ? getBaseSpecies(pokemonName) : 'Unknown';

  if (!family) {
    // Pokemon has no known evolutions or is a standalone
    const ownership = checkEvolutionOwnership(baseName, userCollection);
    return {
      status: 'SINGLE_STAGE',
      pokemon: baseName,
      family: null,
      branches: [],
      bestBranch: null,
      ownedBranchesCount: ownership.isOwned ? 1 : 0,
      totalBranchesCount: 1,
      recommendationReason: `${baseName} does not have further branching evolutionary paths in standard DelugeRPG.`
    };
  }

  const branches = family.branches.map(branch => {
    const ownership = checkEvolutionOwnership(branch.name, userCollection);
    const defProfile = teamEngine.getDefensiveProfile(branch.types);

    // Deluge Combat Viability Scoring:
    // Base Stat Total
    let combatScore = branch.bst || 500;
    // G-Max capability bonus
    if (branch.gmax) combatScore += 80;
    // Mega capability bonus
    if (branch.mega) combatScore += 100;
    // Defense rating (penalize quad weaknesses, reward resistances)
    combatScore -= (defProfile.quadWeaknesses.length * 50);
    combatScore += (defProfile.resists.length * 10);
    combatScore += (defProfile.immunities.length * 20);

    // Ownership Prioritization & Hardening:
    // Give unowned branches a huge +500 boost so user expands their Pokedex!
    // Penalize heavily if the user already owns the Mega Evolution or species
    let priorityScore = combatScore;
    if (!ownership.isOwned) {
      priorityScore += 500;
    } else if (ownership.hasMegaOwned) {
      priorityScore -= 2000; // Never recommend duplicating a species whose Mega is owned
    } else {
      priorityScore -= 1000; // Avoid duplicate species
    }

    return {
      name: branch.name,
      types: branch.types,
      bst: branch.bst,
      gmax: branch.gmax,
      mega: branch.mega,
      role: branch.role,
      keyMoves: branch.keyMoves || [],
      ownership,
      combatScore,
      priorityScore
    };
  });

  // Sort by priorityScore descending
  branches.sort((a, b) => b.priorityScore - a.priorityScore);

  const bestBranch = branches[0];
  const ownedBranchesCount = branches.filter(b => b.ownership.isOwned).length;
  const totalBranchesCount = branches.length;

  let recommendationReason = '';
  if (ownedBranchesCount === 0) {
    recommendationReason = `None owned yet. ${bestBranch.name} is the highest-value combat choice (${bestBranch.types.join('/')}, BST ${bestBranch.bst}${bestBranch.gmax ? ', G-Max Capable' : ''}${bestBranch.mega ? ', Mega Capable' : ''}).`;
  } else if (ownedBranchesCount === totalBranchesCount) {
    const megaBranch = branches.find(b => b.ownership && b.ownership.hasMegaOwned);
    if (megaBranch) {
      recommendationReason = `STOP: You already own all evolution forms (including ${megaBranch.ownership.ownedMega.name} Lv ${megaBranch.ownership.ownedMega.level})! Evolving will create a duplicate.`;
    } else {
      recommendationReason = `You already own all ${totalBranchesCount} evolution branches! For maximum combat output, prioritize ${bestBranch.name} (BST ${bestBranch.bst}).`;
    }
  } else if (!bestBranch.ownership.isOwned) {
    const ownedNames = branches.filter(b => b.ownership.isOwned).map(b => b.name).join(', ');
    recommendationReason = `You already own ${ownedNames}. Evolve into ${bestBranch.name} to fill your Pokedex with top-tier ${bestBranch.types.join('/')} STAB!`;
  } else {
    recommendationReason = `Recommended: ${bestBranch.name} based on Deluge combat viability.`;
  }

  return {
    status: 'BRANCHING_FOUND',
    pokemon: baseName,
    family: family.base,
    branches,
    bestBranch,
    ownedBranchesCount,
    totalBranchesCount,
    recommendationReason
  };
}

// -----------------------------------------------------------------------------
// 5. ATTACK MOVES ADVISOR (STAB, Coverage, Wallbreaker, Critique)
// -----------------------------------------------------------------------------
function recommendOptimalMoves(pokemonOrName, currentMoves = [], collection = []) {
  let name = '';
  let existingMoves = [];

  if (typeof pokemonOrName === 'string') {
    name = pokemonOrName;
    existingMoves = currentMoves || [];
  } else if (pokemonOrName && typeof pokemonOrName === 'object') {
    name = pokemonOrName.name || 'Pokemon';
    existingMoves = pokemonOrName.moves || currentMoves || [];
  }

  const types = resolvePokemonTypes(pokemonOrName, collection);
  const defProfile = teamEngine.getDefensiveProfile(types);
  const primaryType = types[0] || 'Normal';
  const secondaryType = types[1] || null;

  // 1. Primary STAB Attack
  const primaryStabList = TOP_STAB_MOVES[primaryType] || ['Body Slam', 'Double-Edge'];
  const move1 = primaryStabList[0];

  // 2. Secondary STAB Attack (or High-Power Neutral Coverage if mono-type)
  let move2 = null;
  if (secondaryType && TOP_STAB_MOVES[secondaryType]) {
    move2 = TOP_STAB_MOVES[secondaryType][0];
  } else {
    // Mono-type secondary high-power move
    move2 = primaryStabList[1] || 'Earthquake';
  }

  // 3. Anti-Weakness Coverage Attack
  // Find move type that hits the Pokemon's primary weaknesses super-effectively
  let move3 = 'Earthquake';
  const topWeakness = defProfile.quadWeaknesses[0] || defProfile.weaknesses[0];
  if (topWeakness && WEAKNESS_COVERAGE_MAP[topWeakness]) {
    const counterType = WEAKNESS_COVERAGE_MAP[topWeakness];
    const candidateMoves = TOP_STAB_MOVES[counterType];
    if (candidateMoves && candidateMoves.length > 0) {
      move3 = candidateMoves[0];
    }
  } else if (primaryType === 'Water') {
    move3 = 'Ice Beam'; // Counters Grass
  } else if (primaryType === 'Fire') {
    move3 = 'Solar Beam'; // Counters Water, Ground, Rock
  } else if (primaryType === 'Grass') {
    move3 = 'Rock Slide'; // Counters Fire, Ice, Flying, Bug
  } else {
    move3 = 'Earthquake';
  }

  // 4. Wallbreaker / High-Impact Coverage
  let move4 = 'Earthquake';
  const pool4 = ['Close Combat', 'Aura Sphere', 'Psychic', 'Shadow Ball', 'Thunderbolt', 'Ice Beam', 'Stone Edge'];
  for (const cand of pool4) {
    if (cand !== move1 && cand !== move2 && cand !== move3) {
      move4 = cand;
      break;
    }
  }

  const optimalMoves = [
    { name: move1, type: primaryType, role: 'Primary STAB' },
    { name: move2, type: secondaryType || primaryType, role: secondaryType ? 'Secondary STAB' : 'High-Power STAB' },
    { name: move3, type: getMoveType(move3), role: 'Anti-Weakness Coverage' },
    { name: move4, type: getMoveType(move4), role: 'Wallbreaker Coverage' }
  ].map(m => {
    const resolved = teamEngine.resolveMove(m.name);
    return {
      name: m.name,
      type: resolved.type || m.type,
      power: resolved.power || 90,
      category: resolved.category || 'Special',
      role: m.role
    };
  });

  // Critique current moves
  const moveCritique = [];
  if (Array.isArray(existingMoves) && existingMoves.length > 0) {
    existingMoves.forEach((m, idx) => {
      const rm = teamEngine.resolveMove(m);
      if (rm.isStatus || rm.power === 0) {
        moveCritique.push({
          slot: idx + 1,
          move: rm.name,
          flaw: 'Status Move (Deals 0 damage in Deluge RPG)',
          recommendation: `Replace with ${optimalMoves[idx % optimalMoves.length].name}`
        });
      } else if (rm.isOhko) {
        moveCritique.push({
          slot: idx + 1,
          move: rm.name,
          flaw: '30% Accuracy OHKO (70% miss penalty & level check fail)',
          recommendation: `Replace with reliable ${optimalMoves[idx % optimalMoves.length].name}`
        });
      } else if (rm.isRecharge) {
        moveCritique.push({
          slot: idx + 1,
          move: rm.name,
          flaw: 'Turn-Skip Recharge penalty (halves effective DPS)',
          recommendation: `Replace with consistent ${optimalMoves[idx % optimalMoves.length].name}`
        });
      } else if (rm.isLocking) {
        moveCritique.push({
          slot: idx + 1,
          move: rm.name,
          flaw: 'Self-locking move (forces lock and confusion trap)',
          recommendation: `Replace with ${optimalMoves[idx % optimalMoves.length].name}`
        });
      }
    });
  }

  return {
    pokemon: name,
    types,
    optimalMoves,
    moveCritique,
    summary: `Optimal Deluge RPG moveset configured with 100% accuracy STAB and anti-weakness coverage.`
  };
}

function getMoveType(moveName) {
  const rm = teamEngine.resolveMove(moveName);
  return rm.type || 'Normal';
}

// -----------------------------------------------------------------------------
// 6. CLEAN ASCII HTML CARD RENDERERS (Strict Zero-Glow & Zero Clutter)
// -----------------------------------------------------------------------------

function formatEvolutionCard(analysis) {
  if (!analysis || analysis.status === 'SINGLE_STAGE') {
    return `<div style="padding: 6px 8px; background: #070e1a; border: 1px solid #1a283e; border-radius: 4px; font-size: 10px; color: #8eaad0; box-shadow: none !important;">
      <div style="font-weight: 700; color: #e0ecfa; margin-bottom: 2px;">${analysis ? analysis.pokemon : 'Species'} Evolution</div>
      <div>${analysis ? analysis.recommendationReason : 'No branching evolutions found.'}</div>
    </div>`;
  }

  const branchesHtml = analysis.branches.map(b => {
    const isOwned = b.ownership.isOwned;
    const badgeColor = isOwned ? '#8eaad0' : '#10b981';
    const badgeBorder = isOwned ? '#243856' : '#059669';
    const tag = isOwned ? b.ownership.summaryLabel : '[NOT OWNED - RECOMMENDED]';

    return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px; margin-top: 3px; box-shadow: none !important;">
      <div style="display: flex; flex-direction: column;">
        <div style="font-weight: 700; color: #e0ecfa; font-size: 10.5px;">${b.name} <span style="font-size: 9px; color: #8eaad0;">(${b.types.join('/')})</span></div>
        <div style="font-size: 9px; color: #8eaad0;">BST ${b.bst} | ${b.role}${b.gmax ? ' | G-Max' : ''}${b.mega ? ' | Mega' : ''}</div>
      </div>
      <span style="font-size: 9px; font-weight: 700; color: ${badgeColor}; border: 1px solid ${badgeBorder}; border-radius: 3px; padding: 1px 4px; white-space: nowrap;">${tag}</span>
    </div>`;
  }).join('');

  return `<div style="padding: 6px 8px; background: #070e1a; border: 1px solid #1a283e; border-radius: 4px; font-size: 10px; box-shadow: none !important;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
      <span style="font-weight: 700; color: #388bfd; text-transform: uppercase; font-size: 9.5px;">Evolution Advisor: ${analysis.pokemon}</span>
      <span style="font-size: 9px; color: #8eaad0; font-weight: 600;">Owned: ${analysis.ownedBranchesCount}/${analysis.totalBranchesCount}</span>
    </div>
    <div style="color: #e0ecfa; font-size: 10px; margin-bottom: 4px; line-height: 1.3;">${analysis.recommendationReason}</div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      ${branchesHtml}
    </div>
  </div>`;
}

function formatMovesetCard(analysis) {
  if (!analysis) return '';

  const movesHtml = analysis.optimalMoves.map((m, idx) => {
    return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 6px; background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px; margin-top: 2px; box-shadow: none !important;">
      <div>
        <span style="font-weight: 700; color: #e0ecfa; font-size: 10px;">${idx + 1}. ${m.name}</span>
        <span style="font-size: 9px; color: #8eaad0;"> (${m.type}) [${m.power} Pwr]</span>
      </div>
      <span style="font-size: 8.5px; font-weight: 600; color: #388bfd; border: 1px solid #1a283e; border-radius: 3px; padding: 1px 4px;">${m.role}</span>
    </div>`;
  }).join('');

  let critiqueHtml = '';
  if (analysis.moveCritique && analysis.moveCritique.length > 0) {
    const list = analysis.moveCritique.map(c => {
      return `<div style="font-size: 9px; color: #ef4444; margin-top: 2px;">&#9888; Slot ${c.slot} (${c.move}): ${c.flaw} &rarr; ${c.recommendation}</div>`;
    }).join('');
    critiqueHtml = `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #1a283e;">
      <div style="font-size: 9px; font-weight: 700; color: #ef4444; text-transform: uppercase;">Move Flaws Detected:</div>
      ${list}
    </div>`;
  }

  return `<div style="padding: 6px 8px; background: #070e1a; border: 1px solid #1a283e; border-radius: 4px; font-size: 10px; box-shadow: none !important;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
      <span style="font-weight: 700; color: #10b981; text-transform: uppercase; font-size: 9.5px;">Recommended Moveset: ${analysis.pokemon}</span>
      <span style="font-size: 9px; color: #8eaad0; font-weight: 600;">${analysis.types.join('/')}</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      ${movesHtml}
    </div>
    ${critiqueHtml}
  </div>`;
}

function evaluateEvolutionMoveSelection(pokemonOrName, availableMoves = [], collection = []) {
  const pName = typeof pokemonOrName === 'string' ? pokemonOrName : (pokemonOrName ? (pokemonOrName.name || pokemonOrName.fullName) : 'Pokemon');
  const types = resolvePokemonTypes(pokemonOrName || pName, collection);

  const moveList = [];
  const seen = new Set();
  availableMoves.forEach(m => {
    const rawName = typeof m === 'string' ? m : (m ? m.name : '');
    const clean = (rawName || '').trim();
    if (!clean || seen.has(clean.toLowerCase())) return;
    seen.add(clean.toLowerCase());

    const normId = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
    const skill = skillsMap ? skillsMap[normId] : null;
    let power = skill ? (skill.power || 0) : 0;
    let type = skill ? (skill.type || 'Normal') : 'Normal';

    if (!skill) {
      if (/thrash/i.test(clean)) { power = 120; type = 'Normal'; }
      else if (/dark pulse/i.test(clean)) { power = 80; type = 'Dark'; }
      else if (/rock slide/i.test(clean)) { power = 75; type = 'Rock'; }
      else if (/bite/i.test(clean)) { power = 60; type = 'Dark'; }
      else if (/payback/i.test(clean)) { power = 50; type = 'Dark'; }
      else if (/solar beam/i.test(clean)) { power = 120; type = 'Grass'; }
      else if (/petal blizzard/i.test(clean)) { power = 90; type = 'Grass'; }
      else if (/giga drain/i.test(clean)) { power = 75; type = 'Grass'; }
      else if (/razor leaf/i.test(clean)) { power = 55; type = 'Grass'; }
      else if (/bullet seed/i.test(clean)) { power = 75; type = 'Grass'; }
      else if (/tackle|scratch|pound/i.test(clean)) { power = 40; type = 'Normal'; }
      else if (/sleep powder|stun spore|poison powder|protect|leer|growl/i.test(clean)) { power = 0; type = 'Grass'; }
    }

    const isStab = types.some(t => t.toLowerCase() === type.toLowerCase());

    let effectiveScore = power;
    if (power === 0) {
      effectiveScore = -100;
    } else if (isStab) {
      effectiveScore = power * 1.5;
    } else if (power <= 40) {
      effectiveScore = power * 0.7;
    }

    moveList.push({
      name: clean,
      power: power,
      type: type,
      isStab: isStab,
      effectiveScore: effectiveScore
    });
  });

  moveList.sort((a, b) => b.effectiveScore - a.effectiveScore);

  const top4 = moveList.slice(0, 4);
  const dropped = moveList.slice(4).map(m => {
    let reason = 'Lower base power';
    if (m.power === 0) {
      reason = 'Status move (Deals 0 damage in DelugeRPG)';
    } else if (!m.isStab && m.power <= 50) {
      reason = 'Weak non-STAB attack';
    } else if (top4.length > 0) {
      const diff = top4[top4.length - 1].power - m.power;
      reason = `${m.power} Pwr (${diff > 0 ? diff + ' Pwr weaker than ' + top4[top4.length - 1].name : 'lower priority'})`;
    }
    return {
      name: m.name,
      power: m.power,
      type: m.type,
      reason: reason
    };
  });

  const slotOrder = top4.map(m => m.name);

  return {
    targetPokemon: pName,
    types: types,
    recommendedMoves: top4,
    dropMoves: dropped,
    slotOrder: slotOrder
  };
}

module.exports = {
  EVOLUTION_FAMILIES,
  TOP_STAB_MOVES,
  SPECIES_DEFAULT_TYPES,
  resolvePokemonTypes,
  findFamily,
  checkEvolutionOwnership,
  analyzeEvolutionPath,
  recommendOptimalMoves,
  evaluateEvolutionMoveSelection,
  formatEvolutionCard,
  formatMovesetCard,
  evaluateOwnershipAndMegaEquivalence: teamEngine.evaluateOwnershipAndMegaEquivalence
};
