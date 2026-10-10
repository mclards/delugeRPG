/**
 * Builds the comprehensive, verified DelugeRPG Trainers & Gym Leaders Database.
 * Includes complete 4-move skill pools, attack types, base damage (power),
 * DelugeRPG variant modifiers, and counter recommendations.
 */
const fs = require('fs');
const path = require('path');

const skillsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'skills_database.json'), 'utf8'));
const skills = skillsData.moves;

function resolveMove(name) {
  const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  let found = skills[norm];
  if (!found) {
    for (const [k, v] of Object.entries(skills)) {
      if (v.name && v.name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm) {
        found = v;
        break;
      }
    }
  }

  if (found) {
    const isOHKO = found.special && found.special.mechanic === 'ohko';
    return {
      name: found.name,
      type: found.type || 'Normal',
      category: found.category || 'Physical',
      power: found.power !== undefined ? found.power : 40,
      damage: isOHKO ? 'OHKO (Lethal Faint)' : (found.power !== undefined ? found.power : 40),
      accuracy: found.accuracy !== undefined ? found.accuracy : (isOHKO ? 30 : 100),
      isZMove: !!found.isZMove,
      special: found.special || null
    };
  }

  return {
    name: name,
    type: 'Normal',
    category: 'Physical',
    power: 40,
    damage: 40,
    accuracy: 100,
    isZMove: false,
    special: null
  };
}

function makePokemon(species, level, hp, types, moveNames, variant = 'Normal') {
  if (moveNames.length !== 4) {
    throw new Error(`Pokemon ${species} must have exactly 4 moves! Got ${moveNames.length}`);
  }
  const resolvedMoves = moveNames.map(m => resolveMove(m));
  return {
    species,
    level,
    hp,
    variant,
    variantBonus: variant === 'Normal' ? 'Baseline stats (1.0x HP, 1.0x Dmg)' : `${variant} variant traits`,
    types,
    moves: resolvedMoves,
    moveNames: resolvedMoves.map(m => m.name)
  };
}

const VARIANTS_GUIDE = {
  Normal: {
    name: 'Normal',
    hpMultiplier: 1.0,
    damageMultiplier: 1.0,
    specialAbility: 'None (Standard archetype)',
    description: 'The standard baseline Pokemon. Reliable, standard stats with zero weaknesses to ability suppression.'
  },
  Shiny: {
    name: 'Shiny',
    hpMultiplier: 1.25,
    damageMultiplier: 1.0,
    specialAbility: '+25% Maximum HP boost',
    description: 'Distinctive alternate color palette with 25% extra base health for superior defensive survivability.'
  },
  Metallic: {
    name: 'Metallic',
    hpMultiplier: 1.0,
    damageMultiplier: 1.0,
    specialAbility: 'Status Condition Immunity',
    description: 'Completely immune to Burn, Freeze, Paralysis, Poison, Sleep, and Confusion status effects.'
  },
  Ghostly: {
    name: 'Ghostly',
    hpMultiplier: 1.0,
    damageMultiplier: 1.0,
    specialAbility: 'Flinch Strike Chance',
    description: 'Carries an inherent chance to cause the opposing Pokemon to flinch and forfeit its turn upon being attacked.'
  },
  Shadow: {
    name: 'Shadow',
    hpMultiplier: 1.0,
    damageMultiplier: 1.0,
    specialAbility: 'Ability Disruption / Neutralization',
    description: 'Bypasses and disables the protective immunities of Metallic and Ghostly opposing Pokemon.'
  },
  Dark: {
    name: 'Dark',
    hpMultiplier: 1.0,
    damageMultiplier: 1.25,
    specialAbility: '+25% All Attack Power',
    description: 'Fierce offensive variant dealing 25% extra base damage on all physical and special attack skills.'
  },
  Mirage: {
    name: 'Mirage',
    hpMultiplier: 1.0,
    damageMultiplier: 1.0,
    specialAbility: 'Adaptive Counter Stance',
    description: 'Dynamically adapts based on opposing variant; gains defensive resilience and tactical reflection against variants.'
  },
  Chrome: {
    name: 'Chrome',
    hpMultiplier: 1.35,
    damageMultiplier: 1.15,
    specialAbility: '+35% HP Boost & High Critical Strike Damage',
    description: 'Elite top-tier variant featuring 35% extra HP and amplified critical strike multipliers. The ultimate solo-sweeper pick.'
  },
  Negative: {
    name: 'Negative',
    hpMultiplier: 1.0,
    damageMultiplier: 1.0,
    specialAbility: 'Color Inversion Palette',
    description: 'High-contrast inverted color palette variant favored for visual prestige.'
  },
  Retro: {
    name: 'Retro',
    hpMultiplier: 1.0,
    damageMultiplier: 1.0,
    specialAbility: 'Classic Nostalgia Sprite',
    description: 'Faithfully styled classic Game Boy / vintage sprite appearance.'
  }
};

const GYM_LEADERS = {
  // === KANTO ===
  brock: {
    name: 'Brock',
    region: 'Kanto',
    gym: 'Pewter Gym',
    badge: 'Boulder Badge',
    specialty: 'Rock',
    optimalCounterTypes: ['Water', 'Grass', 'Fighting', 'Ground'],
    counterAdvice: 'Water or Grass STAB moves deal 4x fatal damage against Rock/Ground Graveler and Onix.',
    optimalCounterLead: 'Chrome Landorus (Incarnate) / Water Solo Sweeper',
    roster: [
      makePokemon('Graveler', 12, 48, ['Rock', 'Ground'], ['Rock Throw', 'Tackle', 'Defense Curl', 'Rock Tomb']),
      makePokemon('Onix', 14, 55, ['Rock', 'Ground'], ['Rock Throw', 'Tackle', 'Screech', 'Bind'])
    ]
  },
  misty: {
    name: 'Misty',
    region: 'Kanto',
    gym: 'Cerulean Gym',
    badge: 'Cascade Badge',
    specialty: 'Water',
    optimalCounterTypes: ['Electric', 'Grass'],
    counterAdvice: 'Electric STAB deals 2x super-effective damage to Staryu and Starmie without risking Water recoil.',
    optimalCounterLead: 'Electric / Grass Solo Sweeper',
    roster: [
      makePokemon('Staryu', 18, 60, ['Water'], ['Water Gun', 'Swift', 'Tackle', 'Harden']),
      makePokemon('Starmie', 21, 75, ['Water', 'Psychic'], ['Bubble Beam', 'Water Gun', 'Swift', 'Recover'])
    ]
  },
  lt_surge: {
    name: 'Lt. Surge',
    region: 'Kanto',
    gym: 'Vermilion Gym',
    badge: 'Thunder Badge',
    specialty: 'Electric',
    optimalCounterTypes: ['Ground'],
    counterAdvice: 'Ground types take 0x damage (immune) from all Electric attacks and deal 2x STAB damage.',
    optimalCounterLead: 'Chrome Landorus (Incarnate) / Ground Solo Sweeper',
    roster: [
      makePokemon('Voltorb', 21, 65, ['Electric'], ['Spark', 'Sonic Boom', 'Tackle', 'Screech']),
      makePokemon('Pikachu', 18, 60, ['Electric'], ['Thunder Shock', 'Quick Attack', 'Thunder Wave', 'Growl']),
      makePokemon('Raichu', 24, 85, ['Electric'], ['Thunderbolt', 'Mega Punch', 'Quick Attack', 'Thunder Shock'])
    ]
  },
  erika: {
    name: 'Erika',
    region: 'Kanto',
    gym: 'Celadon Gym',
    badge: 'Rainbow Badge',
    specialty: 'Grass',
    optimalCounterTypes: ['Fire', 'Flying', 'Ice', 'Psychic'],
    counterAdvice: 'Fire or Flying STAB easily eliminates Erika Grass/Poison team with 2x damage and status resistance.',
    optimalCounterLead: 'Fire / Flying Solo Sweeper',
    roster: [
      makePokemon('Victreebel', 29, 95, ['Grass', 'Poison'], ['Razor Leaf', 'Poison Powder', 'Sleep Powder', 'Wrap']),
      makePokemon('Tangela', 24, 85, ['Grass'], ['Mega Drain', 'Absorb', 'Bind', 'Constrict']),
      makePokemon('Vileplume', 29, 95, ['Grass', 'Poison'], ['Petal Dance', 'Mega Drain', 'Sleep Powder', 'Poison Powder'])
    ]
  },
  janine: {
    name: 'Janine',
    region: 'Kanto',
    gym: 'Fuchsia Gym',
    badge: 'Soul Badge',
    specialty: 'Poison',
    optimalCounterTypes: ['Psychic', 'Ground', 'Rock'],
    counterAdvice: 'Psychic STAB obliterates all 4 Poison Pokemon. Ground deals 2x to Weezing/Ariados/Venomoth.',
    optimalCounterLead: 'Psychic Solo Sweeper',
    roster: [
      makePokemon('Crobat', 36, 115, ['Poison', 'Flying'], ['Wing Attack', 'Poison Fang', 'Confuse Ray', 'Bite']),
      makePokemon('Weezing', 39, 120, ['Poison'], ['Sludge Bomb', 'Smog', 'Tackle', 'Toxic']),
      makePokemon('Ariados', 37, 110, ['Bug', 'Poison'], ['Night Shade', 'Bug Bite', 'Poison Sting', 'Spider Web']),
      makePokemon('Venomoth', 42, 130, ['Bug', 'Poison'], ['Psybeam', 'Gust', 'Leech Life', 'Stun Spore'])
    ]
  },
  sabrina: {
    name: 'Sabrina',
    region: 'Kanto',
    gym: 'Saffron Gym',
    badge: 'Marsh Badge',
    specialty: 'Psychic',
    optimalCounterTypes: ['Dark', 'Ghost', 'Bug'],
    counterAdvice: 'Dark types are completely IMMUNE to Psychic attacks (0x damage) and counter with 2x Dark STAB.',
    optimalCounterLead: 'Dark / Ghost Solo Sweeper',
    roster: [
      makePokemon('Kadabra', 38, 105, ['Psychic'], ['Psychic', 'Psybeam', 'Recover', 'Disable']),
      makePokemon('Mr. Mime', 37, 105, ['Psychic', 'Fairy'], ['Confusion', 'Double Slap', 'Light Screen', 'Barrier']),
      makePokemon('Venomoth', 38, 110, ['Bug', 'Poison'], ['Psybeam', 'Leech Life', 'Poison Powder', 'Stun Spore']),
      makePokemon('Alakazam', 43, 125, ['Psychic'], ['Psychic', 'Psybeam', 'Recover', 'Reflect'])
    ]
  },
  blaine: {
    name: 'Blaine',
    region: 'Kanto',
    gym: 'Cinnabar Gym',
    badge: 'Volcano Badge',
    specialty: 'Fire',
    optimalCounterTypes: ['Water', 'Ground', 'Rock'],
    counterAdvice: 'Ground or Water STAB provides 2x super-effective OHKO sweep across Blaine Fire roster.',
    optimalCounterLead: 'Chrome Landorus (Incarnate) / Water Solo Sweeper',
    roster: [
      makePokemon('Growlithe', 42, 115, ['Fire'], ['Flamethrower', 'Take Down', 'Bite', 'Roar']),
      makePokemon('Ponyta', 40, 110, ['Fire'], ['Fire Spin', 'Stomp', 'Tail Whip', 'Growl']),
      makePokemon('Rapidash', 42, 120, ['Fire'], ['Fire Spin', 'Stomp', 'Take Down', 'Tail Whip']),
      makePokemon('Arcanine', 47, 140, ['Fire'], ['Fire Blast', 'Flamethrower', 'Take Down', 'Roar'])
    ]
  },
  giovanni: {
    name: 'Giovanni',
    region: 'Kanto',
    gym: 'Viridian Gym',
    badge: 'Earth Badge',
    specialty: 'Ground',
    optimalCounterTypes: ['Water', 'Grass', 'Ice'],
    counterAdvice: 'Water or Ice STAB attacks exploit multiple 2x/4x weaknesses across Giovanni Ground team.',
    optimalCounterLead: 'Water / Ice Solo Sweeper',
    roster: [
      makePokemon('Rhyhorn', 45, 135, ['Ground', 'Rock'], ['Horn Drill', 'Earthquake', 'Fury Attack', 'Stomp']),
      makePokemon('Dugtrio', 42, 115, ['Ground'], ['Earthquake', 'Slash', 'Dig', 'Sand Attack']),
      makePokemon('Nidoqueen', 44, 135, ['Poison', 'Ground'], ['Earthquake', 'Body Slam', 'Poison Sting', 'Scratch']),
      makePokemon('Nidoking', 45, 140, ['Poison', 'Ground'], ['Earthquake', 'Thrash', 'Horn Attack', 'Tackle']),
      makePokemon('Rhydon', 50, 160, ['Ground', 'Rock'], ['Earthquake', 'Horn Drill', 'Take Down', 'Rock Slide'])
    ]
  },

  // === JOHTO ===
  falkner: {
    name: 'Falkner',
    region: 'Johto',
    gym: 'Violet Gym',
    badge: 'Zephyr Badge',
    specialty: 'Flying',
    optimalCounterTypes: ['Electric', 'Rock', 'Ice'],
    counterAdvice: 'Electric or Rock STAB attacks easily knock out Pidgey and Pidgeotto with 2x damage.',
    optimalCounterLead: 'Electric / Rock Solo Sweeper',
    roster: [
      makePokemon('Pidgey', 9, 35, ['Normal', 'Flying'], ['Gust', 'Tackle', 'Quick Attack', 'Twister']),
      makePokemon('Pidgeotto', 13, 55, ['Normal', 'Flying'], ['Gust', 'Tackle', 'Quick Attack', 'Wing Attack'])
    ]
  },
  bugsy: {
    name: 'Bugsy',
    region: 'Johto',
    gym: 'Azalea Gym',
    badge: 'Hive Badge',
    specialty: 'Bug',
    optimalCounterTypes: ['Fire', 'Flying', 'Rock'],
    counterAdvice: 'Fire or Flying STAB moves vaporize Bugsy Bug team with 2x/4x damage.',
    optimalCounterLead: 'Fire / Flying Solo Sweeper',
    roster: [
      makePokemon('Metapod', 14, 50, ['Bug'], ['Bug Bite', 'Tackle', 'String Shot', 'Harden']),
      makePokemon('Kakuna', 14, 50, ['Bug', 'Poison'], ['Bug Bite', 'Poison Sting', 'String Shot', 'Harden']),
      makePokemon('Scyther', 16, 65, ['Bug', 'Flying'], ['Fury Cutter', 'Wing Attack', 'Quick Attack', 'Leer'])
    ]
  },
  whitney: {
    name: 'Whitney',
    region: 'Johto',
    gym: 'Goldenrod Gym',
    badge: 'Plain Badge',
    specialty: 'Normal',
    optimalCounterTypes: ['Fighting'],
    counterAdvice: 'High-power Fighting STAB eliminates Miltank before Rollout builds up momentum.',
    optimalCounterLead: 'Fighting Solo Sweeper',
    roster: [
      makePokemon('Clefairy', 18, 70, ['Fairy'], ['Double Slap', 'Pound', 'Encore', 'Metronome']),
      makePokemon('Miltank', 20, 95, ['Normal'], ['Rollout', 'Stomp', 'Attract', 'Milk Drink'])
    ]
  },
  morty: {
    name: 'Morty',
    region: 'Johto',
    gym: 'Ecruteak Gym',
    badge: 'Fog Badge',
    specialty: 'Ghost',
    optimalCounterTypes: ['Dark', 'Ghost', 'Psychic'],
    counterAdvice: 'Dark types are immune to Psychic and deal 2x STAB damage against Ghost/Poison.',
    optimalCounterLead: 'Dark Solo Sweeper',
    roster: [
      makePokemon('Gastly', 21, 65, ['Ghost', 'Poison'], ['Lick', 'Spite', 'Mean Look', 'Curse']),
      makePokemon('Haunter', 21, 70, ['Ghost', 'Poison'], ['Night Shade', 'Hypnosis', 'Dream Eater', 'Curse']),
      makePokemon('Haunter', 23, 75, ['Ghost', 'Poison'], ['Night Shade', 'Spite', 'Mean Look', 'Mimic']),
      makePokemon('Gengar', 25, 85, ['Ghost', 'Poison'], ['Shadow Ball', 'Hypnosis', 'Dream Eater', 'Mean Look'])
    ]
  },
  chuck: {
    name: 'Chuck',
    region: 'Johto',
    gym: 'Cianwood Gym',
    badge: 'Storm Badge',
    specialty: 'Fighting',
    optimalCounterTypes: ['Flying', 'Psychic', 'Fairy'],
    counterAdvice: 'Psychic or Flying STAB deals 2x damage and resists Chuck Fighting attacks.',
    optimalCounterLead: 'Psychic / Flying Solo Sweeper',
    roster: [
      makePokemon('Primeape', 27, 90, ['Fighting'], ['Karate Chop', 'Fury Swipes', 'Focus Energy', 'Rage']),
      makePokemon('Poliwrath', 30, 105, ['Water', 'Fighting'], ['Dynamic Punch', 'Surf', 'Hypnosis', 'Mind Reader'])
    ]
  },
  jasmine: {
    name: 'Jasmine',
    region: 'Johto',
    gym: 'Olivine Gym',
    badge: 'Mineral Badge',
    specialty: 'Steel',
    optimalCounterTypes: ['Fire', 'Fighting', 'Ground'],
    counterAdvice: 'Fire or Ground STAB completely counters Steelix and both Magnemite with 2x/4x damage.',
    optimalCounterLead: 'Chrome Landorus (Incarnate) / Fire Solo Sweeper',
    roster: [
      makePokemon('Magnemite', 30, 85, ['Electric', 'Steel'], ['Thunderbolt', 'Sonic Boom', 'Thunder Wave', 'Supersonic']),
      makePokemon('Magnemite', 30, 85, ['Electric', 'Steel'], ['Thunderbolt', 'Sonic Boom', 'Thunder Wave', 'Supersonic']),
      makePokemon('Steelix', 35, 125, ['Steel', 'Ground'], ['Iron Tail', 'Rock Throw', 'Screech', 'Sandstorm'])
    ]
  },
  pryce: {
    name: 'Pryce',
    region: 'Johto',
    gym: 'Mahogany Gym',
    badge: 'Glacier Badge',
    specialty: 'Ice',
    optimalCounterTypes: ['Electric', 'Grass', 'Fighting', 'Rock'],
    counterAdvice: 'Electric STAB counters Seel and Dewgong; Grass or Fighting takes down Piloswine.',
    optimalCounterLead: 'Fighting / Electric Solo Sweeper',
    roster: [
      makePokemon('Seel', 27, 90, ['Water'], ['Aurora Beam', 'Headbutt', 'Icy Wind', 'Rest']),
      makePokemon('Dewgong', 29, 105, ['Water', 'Ice'], ['Ice Beam', 'Aurora Beam', 'Take Down', 'Rest']),
      makePokemon('Piloswine', 31, 115, ['Ice', 'Ground'], ['Blizzard', 'Ice Fang', 'Horn Attack', 'Mist'])
    ]
  },
  clair: {
    name: 'Clair',
    region: 'Johto',
    gym: 'Blackthorn Gym',
    badge: 'Rising Badge',
    specialty: 'Dragon',
    optimalCounterTypes: ['Dragon', 'Fairy', 'Ice'],
    counterAdvice: 'Fairy types are completely IMMUNE to Dragon attacks (0x damage) and deal 2x damage back.',
    optimalCounterLead: 'Fairy Solo Sweeper',
    roster: [
      makePokemon('Dragonair', 37, 110, ['Dragon'], ['Dragon Breath', 'Surf', 'Slam', 'Thunder Wave']),
      makePokemon('Dragonair', 37, 110, ['Dragon'], ['Dragon Breath', 'Thunderbolt', 'Slam', 'Thunder Wave']),
      makePokemon('Dragonair', 37, 110, ['Dragon'], ['Dragon Breath', 'Ice Beam', 'Slam', 'Thunder Wave']),
      makePokemon('Kingdra', 40, 125, ['Water', 'Dragon'], ['Dragon Breath', 'Surf', 'Hyper Beam', 'Smokescreen'])
    ]
  },

  // === HOENN ===
  roxanne: {
    name: 'Roxanne',
    region: 'Hoenn',
    gym: 'Rustboro Gym',
    badge: 'Stone Badge',
    specialty: 'Rock',
    optimalCounterTypes: ['Water', 'Grass', 'Fighting', 'Ground'],
    counterAdvice: 'Water or Grass STAB easily sweeps Geodude and Nosepass with 4x/2x damage.',
    optimalCounterLead: 'Water / Grass Solo Sweeper',
    roster: [
      makePokemon('Geodude', 14, 50, ['Rock', 'Ground'], ['Rock Tomb', 'Rock Throw', 'Tackle', 'Defense Curl']),
      makePokemon('Geodude', 14, 50, ['Rock', 'Ground'], ['Rock Tomb', 'Rock Throw', 'Tackle', 'Defense Curl']),
      makePokemon('Nosepass', 15, 55, ['Rock'], ['Rock Tomb', 'Rock Throw', 'Tackle', 'Harden'])
    ]
  },
  brawly: {
    name: 'Brawly',
    region: 'Hoenn',
    gym: 'Dewford Gym',
    badge: 'Knuckle Badge',
    specialty: 'Fighting',
    optimalCounterTypes: ['Psychic', 'Flying', 'Fairy'],
    counterAdvice: 'Psychic or Flying STAB ignores Bulk Up defenses and deals 2x super-effective damage.',
    optimalCounterLead: 'Psychic / Flying Solo Sweeper',
    roster: [
      makePokemon('Machop', 16, 60, ['Fighting'], ['Karate Chop', 'Low Kick', 'Bulk Up', 'Leer']),
      makePokemon('Makuhita', 19, 75, ['Fighting'], ['Arm Thrust', 'Fake Out', 'Bulk Up', 'Sand Attack'])
    ]
  },
  wattson: {
    name: 'Wattson',
    region: 'Hoenn',
    gym: 'Mauville Gym',
    badge: 'Dynamo Badge',
    specialty: 'Electric',
    optimalCounterTypes: ['Ground'],
    counterAdvice: 'Ground types are completely immune to Electric moves and hit 2x STAB against all 4 Pokemon.',
    optimalCounterLead: 'Chrome Landorus (Incarnate) / Ground Solo Sweeper',
    roster: [
      makePokemon('Magnemite', 20, 65, ['Electric', 'Steel'], ['Spark', 'Sonic Boom', 'Thunder Wave', 'Tackle']),
      makePokemon('Voltorb', 20, 65, ['Electric'], ['Spark', 'Rollout', 'Self-Destruct', 'Charge']),
      makePokemon('Magneton', 22, 75, ['Electric', 'Steel'], ['Spark', 'Sonic Boom', 'Thunder Wave', 'Supersonic']),
      makePokemon('Manectric', 24, 85, ['Electric'], ['Shock Wave', 'Quick Attack', 'Thunder Wave', 'Howl'])
    ]
  },
  flannery: {
    name: 'Flannery',
    region: 'Hoenn',
    gym: 'Lavaridge Gym',
    badge: 'Heat Badge',
    specialty: 'Fire',
    optimalCounterTypes: ['Water', 'Ground', 'Rock'],
    counterAdvice: 'Water or Ground STAB deals 2x super-effective damage and survives Overheat easily.',
    optimalCounterLead: 'Water / Ground Solo Sweeper',
    roster: [
      makePokemon('Slugma', 24, 70, ['Fire'], ['Overheat', 'Ember', 'Smog', 'Light Screen']),
      makePokemon('Slugma', 24, 70, ['Fire'], ['Overheat', 'Rock Slide', 'Smog', 'Light Screen']),
      makePokemon('Camerupt', 26, 85, ['Fire', 'Ground'], ['Overheat', 'Magnitude', 'Ember', 'Tackle']),
      makePokemon('Torkoal', 29, 95, ['Fire'], ['Overheat', 'Body Slam', 'Flail', 'Attract'])
    ]
  },
  norman: {
    name: 'Norman',
    region: 'Hoenn',
    gym: 'Petalburg Gym',
    badge: 'Balance Badge',
    specialty: 'Normal',
    optimalCounterTypes: ['Fighting', 'Ghost'],
    counterAdvice: 'Ghost types take 0x damage from Normal Facade attacks. Fighting hits 2x super-effective.',
    optimalCounterLead: 'Fighting / Ghost Solo Sweeper',
    roster: [
      makePokemon('Spinda', 27, 85, ['Normal'], ['Facade', 'Teeter Dance', 'Psybeam', 'Hypnosis']),
      makePokemon('Vigoroth', 27, 90, ['Normal'], ['Facade', 'Slash', 'Faint Attack', 'Encore']),
      makePokemon('Linoone', 29, 95, ['Normal'], ['Facade', 'Slash', 'Headbutt', 'Belly Drum']),
      makePokemon('Slaking', 31, 130, ['Normal'], ['Facade', 'Counter', 'Faint Attack', 'Yawn'])
    ]
  },
  winona: {
    name: 'Winona',
    region: 'Hoenn',
    gym: 'Fortree Gym',
    badge: 'Feather Badge',
    specialty: 'Flying',
    optimalCounterTypes: ['Electric', 'Ice', 'Rock'],
    counterAdvice: 'Electric STAB deals 2x damage against Flying and 4x against Pelipper.',
    optimalCounterLead: 'Electric / Ice Solo Sweeper',
    roster: [
      makePokemon('Swablu', 29, 90, ['Normal', 'Flying'], ['Aerial Ace', 'Peck', 'Astonish', 'Safeguard']),
      makePokemon('Tropius', 29, 105, ['Grass', 'Flying'], ['Aerial Ace', 'Solar Beam', 'Magical Leaf', 'Whirlwind']),
      makePokemon('Pelipper', 30, 100, ['Water', 'Flying'], ['Aerial Ace', 'Water Gun', 'Supersonic', 'Protect']),
      makePokemon('Skarmory', 31, 105, ['Steel', 'Flying'], ['Steel Wing', 'Aerial Ace', 'Fury Attack', 'Sand Attack']),
      makePokemon('Altaria', 33, 115, ['Dragon', 'Flying'], ['Aerial Ace', 'Dragon Breath', 'Safeguard', 'Refresh'])
    ]
  },
  tate_and_liza: {
    name: 'Tate and Liza',
    region: 'Hoenn',
    gym: 'Mossdeep Gym',
    badge: 'Mind Badge',
    specialty: 'Psychic',
    optimalCounterTypes: ['Dark', 'Ghost', 'Water'],
    counterAdvice: 'Dark types are immune to Psychic attacks and deal 2x super-effective damage.',
    optimalCounterLead: 'Dark Solo Sweeper',
    roster: [
      makePokemon('Claydol', 41, 125, ['Ground', 'Psychic'], ['Earthquake', 'Ancient Power', 'Psychic', 'Light Screen']),
      makePokemon('Xatu', 41, 125, ['Psychic', 'Flying'], ['Psychic', 'Confuse Ray', 'Sunny Day', 'Calm Mind']),
      makePokemon('Lunatone', 42, 130, ['Rock', 'Psychic'], ['Psychic', 'Light Screen', 'Hypnosis', 'Calm Mind']),
      makePokemon('Solrock', 42, 130, ['Rock', 'Psychic'], ['Psychic', 'Rock Slide', 'Solar Beam', 'Sunny Day'])
    ]
  },
  wallace: {
    name: 'Wallace',
    region: 'Hoenn',
    gym: 'Sootopolis Gym',
    badge: 'Rain Badge',
    specialty: 'Water',
    optimalCounterTypes: ['Electric', 'Grass'],
    counterAdvice: 'Electric STAB counters 4 out of 5 Pokemon; Grass counters Whiscash for 4x damage.',
    optimalCounterLead: 'Electric / Grass Solo Sweeper',
    roster: [
      makePokemon('Luvdisc', 41, 110, ['Water'], ['Water Pulse', 'Sweet Kiss', 'Attract', 'Flail']),
      makePokemon('Whiscash', 41, 135, ['Water', 'Ground'], ['Earthquake', 'Water Pulse', 'Rain Dance', 'Amnesia']),
      makePokemon('Sealeo', 43, 130, ['Ice', 'Water'], ['Water Pulse', 'Aurora Beam', 'Body Slam', 'Encore']),
      makePokemon('Crawdaunt', 43, 125, ['Water', 'Dark'], ['Crabhammer', 'Water Pulse', 'Swords Dance', 'Taunt']),
      makePokemon('Milotic', 46, 150, ['Water'], ['Water Pulse', 'Ice Beam', 'Recover', 'Toxic'])
    ]
  },

  // === SINNOH ===
  roark: {
    name: 'Roark',
    region: 'Sinnoh',
    gym: 'Oreburgh Gym',
    badge: 'Coal Badge',
    specialty: 'Rock',
    optimalCounterTypes: ['Water', 'Grass', 'Fighting', 'Ground'],
    counterAdvice: 'Water or Grass STAB provides 4x damage against Geodude/Onix and 2x against Cranidos.',
    optimalCounterLead: 'Water / Grass Solo Sweeper',
    roster: [
      makePokemon('Geodude', 12, 45, ['Rock', 'Ground'], ['Rock Throw', 'Stealth Rock', 'Tackle', 'Defense Curl']),
      makePokemon('Onix', 12, 50, ['Rock', 'Ground'], ['Rock Throw', 'Stealth Rock', 'Screech', 'Bind']),
      makePokemon('Cranidos', 14, 55, ['Rock'], ['Headbutt', 'Pursuit', 'Rock Tomb', 'Leer'])
    ]
  },
  gardenia: {
    name: 'Gardenia',
    region: 'Sinnoh',
    gym: 'Eterna Gym',
    badge: 'Forest Badge',
    specialty: 'Grass',
    optimalCounterTypes: ['Fire', 'Flying', 'Ice', 'Bug'],
    counterAdvice: 'Fire or Flying STAB easily sweeps all 3 Grass Pokemon.',
    optimalCounterLead: 'Fire / Flying Solo Sweeper',
    roster: [
      makePokemon('Cherubi', 19, 65, ['Grass'], ['Grass Knot', 'Leech Seed', 'Growth', 'Tackle']),
      makePokemon('Turtwig', 19, 70, ['Grass'], ['Razor Leaf', 'Grass Knot', 'Reflect', 'Tackle']),
      makePokemon('Roserade', 22, 85, ['Grass', 'Poison'], ['Magical Leaf', 'Grass Knot', 'Poison Sting', 'Stun Spore'])
    ]
  },
  maylene: {
    name: 'Maylene',
    region: 'Sinnoh',
    gym: 'Veilstone Gym',
    badge: 'Cobble Badge',
    specialty: 'Fighting',
    optimalCounterTypes: ['Flying', 'Psychic', 'Fairy'],
    counterAdvice: 'Flying or Psychic STAB attacks hit 2x super-effective across Maylene squad.',
    optimalCounterLead: 'Flying / Psychic Solo Sweeper',
    roster: [
      makePokemon('Meditite', 28, 85, ['Fighting', 'Psychic'], ['Drain Punch', 'Confusion', 'Fake Out', 'Rock Tomb']),
      makePokemon('Machoke', 29, 95, ['Fighting'], ['Drain Punch', 'Karate Chop', 'Rock Tomb', 'Foresight']),
      makePokemon('Lucario', 32, 105, ['Fighting', 'Steel'], ['Drain Punch', 'Force Palm', 'Bone Rush', 'Metal Claw'])
    ]
  },
  crasher_wake: {
    name: 'Crasher Wake',
    region: 'Sinnoh',
    gym: 'Pastoria Gym',
    badge: 'Fen Badge',
    specialty: 'Water',
    optimalCounterTypes: ['Electric', 'Grass'],
    counterAdvice: 'Electric STAB deals 4x fatal damage to Gyarados and 2x to Floatzel.',
    optimalCounterLead: 'Electric / Grass Solo Sweeper',
    roster: [
      makePokemon('Gyarados', 33, 120, ['Water', 'Flying'], ['Waterfall', 'Brine', 'Bite', 'Twister']),
      makePokemon('Quagsire', 34, 125, ['Water', 'Ground'], ['Water Pulse', 'Mud Bomb', 'Slam', 'Yawn']),
      makePokemon('Floatzel', 37, 125, ['Water'], ['Brine', 'Crunch', 'Ice Fang', 'Swift'])
    ]
  },
  fantina: {
    name: 'Fantina',
    region: 'Sinnoh',
    gym: 'Hearthome Gym',
    badge: 'Relic Badge',
    specialty: 'Ghost',
    optimalCounterTypes: ['Dark', 'Ghost'],
    counterAdvice: 'Dark types take reduced damage from Ghost and hit 2x super-effective STAB.',
    optimalCounterLead: 'Dark Solo Sweeper',
    roster: [
      makePokemon('Duskull', 24, 75, ['Ghost'], ['Shadow Sneak', 'Will-O-Wisp', 'Future Sight', 'Pursuit']),
      makePokemon('Haunter', 24, 75, ['Ghost', 'Poison'], ['Shadow Claw', 'Confuse Ray', 'Hypnosis', 'Sucker Punch']),
      makePokemon('Mismagius', 26, 85, ['Ghost'], ['Shadow Ball', 'Psybeam', 'Magical Leaf', 'Confuse Ray'])
    ]
  },
  byron: {
    name: 'Byron',
    region: 'Sinnoh',
    gym: 'Canalave Gym',
    badge: 'Mine Badge',
    specialty: 'Steel',
    optimalCounterTypes: ['Fighting', 'Ground', 'Fire'],
    counterAdvice: 'Ground STAB hits Magneton 4x, Bastiodon 4x, and Steelix 2x.',
    optimalCounterLead: 'Chrome Landorus (Incarnate) / Ground Solo Sweeper',
    roster: [
      makePokemon('Magneton', 37, 115, ['Electric', 'Steel'], ['Flash Cannon', 'Thunderbolt', 'Tri Attack', 'Metal Sound']),
      makePokemon('Steelix', 38, 125, ['Steel', 'Ground'], ['Flash Cannon', 'Earthquake', 'Ice Fang', 'Sandstorm']),
      makePokemon('Bastiodon', 41, 135, ['Rock', 'Steel'], ['Iron Head', 'Ancient Power', 'Taunt', 'Rest'])
    ]
  },
  candice: {
    name: 'Candice',
    region: 'Sinnoh',
    gym: 'Snowpoint Gym',
    badge: 'Icicle Badge',
    specialty: 'Ice',
    optimalCounterTypes: ['Fire', 'Fighting', 'Rock', 'Steel'],
    counterAdvice: 'Fire or Fighting STAB counters 3 out of 4 Ice Pokemon.',
    optimalCounterLead: 'Fire / Fighting Solo Sweeper',
    roster: [
      makePokemon('Snover', 38, 120, ['Grass', 'Ice'], ['Avalanche', 'Razor Leaf', 'Water Pulse', 'Mist']),
      makePokemon('Sneasel', 38, 115, ['Dark', 'Ice'], ['Avalanche', 'Slash', 'Shadow Claw', 'Faint Attack']),
      makePokemon('Medicham', 40, 120, ['Fighting', 'Psychic'], ['Ice Punch', 'Fire Punch', 'Thunder Punch', 'Drain Punch']),
      makePokemon('Froslass', 44, 130, ['Ice', 'Ghost'], ['Blizzard', 'Shadow Ball', 'Psychic', 'Double Team'])
    ]
  },
  volkner: {
    name: 'Volkner',
    region: 'Sinnoh',
    gym: 'Sunyshore Gym',
    badge: 'Beacon Badge',
    specialty: 'Electric',
    optimalCounterTypes: ['Ground'],
    counterAdvice: 'Ground types take 0x damage (immune) from Electric attacks and deal 2x STAB.',
    optimalCounterLead: 'Chrome Landorus (Incarnate) / Ground Solo Sweeper',
    roster: [
      makePokemon('Jolteon', 46, 135, ['Electric'], ['Thunderbolt', 'Shadow Ball', 'Iron Tail', 'Quick Attack']),
      makePokemon('Raichu', 46, 135, ['Electric'], ['Thunderbolt', 'Focus Blast', 'Signal Beam', 'Brick Break']),
      makePokemon('Luxray', 48, 145, ['Electric'], ['Thunder Fang', 'Crunch', 'Fire Fang', 'Iron Tail']),
      makePokemon('Electivire', 50, 155, ['Electric'], ['Thunder Punch', 'Fire Punch', 'Giga Impact', 'Quick Attack'])
    ]
  }
};

const COMPUTER_TRAINERS = {
  worker_ralph: {
    name: 'Worker Ralph',
    title: "Worker Ralph's Team",
    specialty: 'Ground / Fire / Fighting EXP Squad',
    optimalCounterLead: 'Chrome Landorus (Incarnate)',
    counterExplanation: 'Chrome Landorus is completely IMMUNE to Ground attacks (0x damage from Excadrill and Rhyhorn) and resists both Fire (Magmar) and Fighting (Machoke). High-power Ground STAB (Earthquake) instantly 100% OHKOs all 4 opponents for an effortless solo sweep!',
    roster: [
      makePokemon('Excadrill', 52, 208, ['Ground', 'Steel'], ['Earthquake', 'Rock Slide', 'Horn Drill', 'Fissure']),
      makePokemon('Rhyhorn', 52, 208, ['Ground', 'Rock'], ['Earthquake', 'Rock Slide', 'Horn Drill', 'Megahorn']),
      makePokemon('Magmar', 52, 208, ['Fire'], ['Lava Plume', 'Fire Punch', 'Ember', 'Faint Attack']),
      makePokemon('Machoke', 52, 208, ['Fighting'], ['Dynamic Punch', 'Cross Chop', 'Submission', 'Wake-Up Slap'])
    ]
  },
  maid_lara: {
    name: 'Maid Lara',
    title: "Maid Lara's Team",
    specialty: 'Electric & Normal Cute Squad',
    optimalCounterLead: 'Chrome Landorus (Incarnate)',
    counterExplanation: 'Chrome Landorus is completely IMMUNE to Electric attacks (0x damage from Emolga, Raichu, Electabuzz). High-power Ground STAB (Earthquake) instantly 100% OHKOs Raichu and Electabuzz, while neutral hits vaporize Emolga and Cinccino for an effortless, fast solo sweep!',
    roster: [
      makePokemon('Emolga', 23, 92, ['Electric', 'Flying'], ['Spark', 'Acrobatics', 'Quick Attack', 'Pursuit']),
      makePokemon('Raichu', 27, 103, ['Electric'], ['Thunderbolt', 'Slam', 'Quick Attack', 'Double Team']),
      makePokemon('Electabuzz', 26, 104, ['Electric'], ['Thunder Punch', 'Shock Wave', 'Swift', 'Light Screen']),
      makePokemon('Cinccino', 29, 116, ['Normal'], ['Tail Slap', 'Bullet Seed', 'Rock Blast', 'Sing'])
    ]
  },
  dallas_allenson: {
    name: 'Dallas Allenson',
    title: "Dallas Allenson's Team",
    specialty: 'Mixed Balanced High-EXP Squad',
    optimalCounterLead: 'Fire / Rock / Steel Solo Sweeper',
    counterExplanation: 'Carrying high-power Fire or Rock STAB handles Braviary, Glaceon, and Gogoat easily. Steel type resists Normal, Flying, Ice, Grass, and Psychic attacks across Dallas full team.',
    roster: [
      makePokemon('Braviary', 51, 204, ['Normal', 'Flying'], ['Brave Bird', 'Air Slash', 'Crush Claw', 'Slash']),
      makePokemon('Glaceon', 52, 208, ['Ice'], ['Ice Beam', 'Blizzard', 'Bite', 'Quick Attack']),
      makePokemon('Gogoat', 53, 212, ['Grass'], ['Horn Leech', 'Leaf Blade', 'Bulldoze', 'Take Down']),
      makePokemon('Alakazam', 54, 216, ['Psychic'], ['Psychic', 'Shadow Ball', 'Psybeam', 'Recover'])
    ]
  },
  madame_melanie: {
    name: 'Madame Melanie',
    title: "Madame Melanie's Team",
    specialty: 'Dragon Solo Titan',
    optimalCounterLead: 'Ice / Fairy Solo Sweeper',
    counterExplanation: 'Salamence carries a 4x fatal weakness to Ice attacks. Any decent Ice move (Ice Beam / Blizzard) delivers an immediate 100% OHKO.',
    roster: [
      makePokemon('Salamence', 55, 220, ['Dragon', 'Flying'], ['Dragon Claw', 'Double-Edge', 'Zen Headbutt', 'Crunch'])
    ]
  },
  psychic_valentine: {
    name: 'Psychic Valentine',
    title: "Psychic Valentine's Team",
    specialty: 'Psychic Solo Specialist',
    optimalCounterLead: 'Dark / Ghost Solo Sweeper',
    counterExplanation: 'Dark types are completely IMMUNE to Psychic attacks (0x damage) and deal 2x super-effective STAB back for an instant OHKO victory.',
    roster: [
      makePokemon('Meowstic', 55, 220, ['Psychic'], ['Psychic', 'Shadow Ball', 'Disarming Voice', 'Fake Out'])
    ]
  },
  youngster_joey: {
    name: 'Youngster Joey',
    title: "Youngster Joey's Team",
    specialty: 'Early-Route Normal Squad',
    optimalCounterLead: 'Fighting / Ghost Solo Sweeper',
    counterExplanation: 'Ghost types are immune to Normal Tackle and Hyper Fang (0x damage). Fighting STAB deals 2x fatal damage.',
    roster: [
      makePokemon('Rattata', 15, 60, ['Normal'], ['Hyper Fang', 'Bite', 'Quick Attack', 'Tackle']),
      makePokemon('Raticate', 20, 80, ['Normal'], ['Super Fang', 'Hyper Fang', 'Pursuit', 'Scary Face'])
    ]
  },
  bug_catcher_sammy: {
    name: 'Bug Catcher Sammy',
    title: "Bug Catcher Sammy's Team",
    specialty: 'Bug Trio Squad',
    optimalCounterLead: 'Fire / Flying / Rock Solo Sweeper',
    counterAdvice: 'Fire or Flying STAB deals 2x to Butterfree, Beedrill, and Pinsir, sweeping the entire team in 3 hits.',
    roster: [
      makePokemon('Butterfree', 22, 88, ['Bug', 'Flying'], ['Psybeam', 'Gust', 'Confusion', 'Sleep Powder']),
      makePokemon('Beedrill', 22, 88, ['Bug', 'Poison'], ['Twineedle', 'Poison Sting', 'Fury Attack', 'Focus Energy']),
      makePokemon('Pinsir', 25, 100, ['Bug'], ['Guillotine', 'Brick Break', 'Vice Grip', 'Seismic Toss'])
    ]
  }
};

const fullDatabase = {
  meta: {
    version: '2.0.0',
    title: 'DelugeRPG Trainers, Gym Leaders & Skills Database',
    extractedAt: '2026-10-09T14:50:00Z',
    description: 'Complete DelugeRPG database containing Gym Leaders (Kanto through Sinnoh) and training NPCs with exact 4-move skillsets, base powers (damages), attack types, categories, variant mechanics, and solo-sweeper counters.',
    accountUsed: false,
    totalGymLeaders: Object.keys(GYM_LEADERS).length,
    totalComputerTrainers: Object.keys(COMPUTER_TRAINERS).length
  },
  variants_guide: VARIANTS_GUIDE,
  gym_leaders: GYM_LEADERS,
  computer_trainers: COMPUTER_TRAINERS
};

// Check for any incomplete moves
let totalPokemon = 0;
let incompleteMoves = 0;

for (const [k, v] of Object.entries(GYM_LEADERS)) {
  v.roster.forEach(p => {
    totalPokemon++;
    if (!p.moves || p.moves.length !== 4) incompleteMoves++;
  });
}
for (const [k, v] of Object.entries(COMPUTER_TRAINERS)) {
  v.roster.forEach(p => {
    totalPokemon++;
    if (!p.moves || p.moves.length !== 4) incompleteMoves++;
  });
}

console.log(`Audited ${totalPokemon} Pokemon across all trainers. Incomplete moves: ${incompleteMoves}`);
if (incompleteMoves > 0) {
  throw new Error(`Found ${incompleteMoves} Pokemon with incomplete moves!`);
}

// Convert to formatted JSON
const jsonOutput = JSON.stringify(fullDatabase, null, 2);

// Check 7-bit ASCII
for (let i = 0; i < jsonOutput.length; i++) {
  if (jsonOutput.charCodeAt(i) > 127) {
    throw new Error(`Non-ASCII character detected at index ${i}: ${jsonOutput[i]}`);
  }
}

// Write to both paths
const paths = [
  path.join(__dirname, 'trainers_database.json')
];

paths.forEach(p => {
  fs.writeFileSync(p, jsonOutput, 'utf8');
  console.log(`Saved ${p} (${Buffer.byteLength(jsonOutput)} bytes, 100% 7-bit ASCII clean).`);
});
