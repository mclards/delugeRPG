/**
 * Builds the comprehensive DelugeRPG Skills & Moves Database.
 * Combines DelugeRPG Attack Guide wiki data with Pokemon Showdown Gen 1-9 baseline and Z-Moves.
 */
const fs = require('fs');
const path = require('path');

const contentMdPath = 'C:/Users/User/.gemini/antigravity/brain/36dbfced-0ecd-4f3f-ae45-178e97ebefd4/.system_generated/steps/10749/content.md';
const showdownJsonPath = 'C:/Users/User/.gemini/antigravity/brain/36dbfced-0ecd-4f3f-ae45-178e97ebefd4/scratch/showdown_moves.json';
const outPath = path.join(__dirname, 'skills_database.json');

// 1. Parse Deluge wiki moves
const rawHtml = fs.readFileSync(contentMdPath, 'utf8');
const trs = rawHtml.split('<tr>');
const delugeMoves = {};

for (let i = 1; i < trs.length; i++) {
  const tds = trs[i].split('<td>').map(s => s.split('</td>')[0].trim()).filter(Boolean);
  if (tds.length >= 3) {
    const key = tds[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    delugeMoves[key] = {
      name: tds[0],
      type: tds[1].charAt(0).toUpperCase() + tds[1].slice(1).toLowerCase(),
      power: parseInt(tds[2], 10) || 0
    };
  }
}

// 2. Parse Showdown moves
const showdown = JSON.parse(fs.readFileSync(showdownJsonPath, 'utf8'));
const database = {};

// Special mechanics registry
const specialMechanics = {
  'falseswipe': { mechanic: 'clamp_to_1hp', description: 'Leaves target with at least 1 HP. 100% safe.' },
  'holdback': { mechanic: 'clamp_to_1hp', description: 'Leaves target with at least 1 HP. 100% safe.' },
  'seismictoss': { mechanic: 'damage_equals_user_level', description: 'Deals damage exactly equal to user level.' },
  'nightshade': { mechanic: 'damage_equals_user_level', description: 'Deals damage exactly equal to user level.' },
  'dragonrage': { mechanic: 'fixed_damage', fixedAmount: 40, description: 'Always deals exactly 40 HP damage.' },
  'sonicboom': { mechanic: 'fixed_damage', fixedAmount: 20, description: 'Always deals exactly 20 HP damage.' },
  'superfang': { mechanic: 'half_current_hp', description: 'Cuts opponent current HP in half.' },
  'naturesmadness': { mechanic: 'half_current_hp', description: 'Cuts opponent current HP in half.' },
  'guillotine': { mechanic: 'ohko', description: 'One-hit knockout move. Lethal hazard.' },
  'fissure': { mechanic: 'ohko', description: 'One-hit knockout move. Lethal hazard.' },
  'horndrill': { mechanic: 'ohko', description: 'One-hit knockout move. Lethal hazard.' },
  'sheercold': { mechanic: 'ohko', description: 'One-hit knockout move. Lethal hazard.' }
};

// Process Deluge verified moves first
for (const key in delugeMoves) {
  const dm = delugeMoves[key];
  const sm = showdown[key] || {};
  const entry = {
    id: key,
    name: dm.name,
    type: dm.type,
    power: dm.power,
    category: sm.category || (dm.power === 0 ? 'Status' : 'Physical'),
    source: 'delugerpg_verified'
  };
  if (specialMechanics[key]) {
    entry.special = specialMechanics[key];
  }
  database[key] = entry;
}

// Add remaining non-Z, non-Max Showdown moves
for (const key in showdown) {
  if (!database[key]) {
    const sm = showdown[key];
    if (sm.name && !sm.isZ && !sm.isMax) {
      const entry = {
        id: key,
        name: sm.name,
        type: sm.type,
        power: sm.basePower || 0,
        category: sm.category || 'Status',
        source: 'showdown_baseline'
      };
      if (specialMechanics[key]) {
        entry.special = specialMechanics[key];
      }
      database[key] = entry;
    }
  }
}

// Add Z-Moves (DelugeRPG asterisk notation and standard keys)
let zCount = 0;
for (const key in showdown) {
  const sm = showdown[key];
  if (sm.isZ) {
    const delugeKey = '*' + key;
    const entry = {
      id: delugeKey,
      name: '*' + sm.name,
      type: sm.type,
      power: sm.basePower || 180,
      category: sm.category || 'Physical',
      source: 'showdown_z_move',
      isZMove: true,
      special: {
        mechanic: 'z_move_burst',
        description: 'Z-Move with extreme burst damage. Guaranteed 100% lethal KO hazard.'
      }
    };
    database[delugeKey] = entry;
    database[key] = Object.assign({}, entry, { id: key, name: sm.name });
    zCount++;
  }
}

const payload = {
  meta: {
    title: 'DelugeRPG Skills & Moves Database',
    extractedAt: '2026-10-09T08:44:00Z',
    accountUsed: false,
    sourceDescription: 'DelugeRPG Attack Guide merged with Showdown Gen 1-9 baseline & Z-moves',
    totalMoves: Object.keys(database).length,
    delugeVerifiedMovesCount: Object.keys(delugeMoves).length,
    zMovesCount: zCount
  },
  moves: database
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log('Successfully saved skills database to:', outPath);
console.log('Total moves indexed:', payload.meta.totalMoves);
