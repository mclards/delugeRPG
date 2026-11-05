/**
 * maps_catalog.js - Official DelugeRPG Map Catalog
 * Contains all 49 official DelugeRPG maps across all 8 zones.
 * Strictly 100% 7-bit clean ASCII integrity (char codes <= 127).
 */

const DELUGE_ZONES = [
  { id: 'overworld', name: 'Overworld', count: 25, title: 'The Deluge Realm' },
  { id: 'snowcave', name: 'Shivering Cave', count: 4, title: 'Shivering Cave' },
  { id: 'volcano', name: 'Magma Lagoon', count: 4, title: 'Magma Lagoon' },
  { id: 'rockcave', name: 'Sea Cave', count: 4, title: 'Sea Cave' },
  { id: 'pkmnmansion', name: 'Mystery Villa', count: 4, title: 'Mystery Villa' },
  { id: 'pkmntower', name: 'Tower of Lost Souls', count: 3, title: 'Tower of Lost Souls' },
  { id: 'powerplant', name: 'Charged Chateau', count: 3, title: 'Charged Chateau' },
  { id: 'unownruins', name: 'Lost Inscriptions', count: 2, title: 'Lost Inscriptions' }
];

const DELUGE_MAPS = [
  // 1. The Deluge Realm / Overworld (25 Maps)
  { id: 'overworld1', zone: 'overworld', name: 'Overworld #1', title: 'The Deluge Realm #1', url: '/map/overworld1' },
  { id: 'overworld2', zone: 'overworld', name: 'Overworld #2', title: 'The Deluge Realm #2', url: '/map/overworld2' },
  { id: 'overworld3', zone: 'overworld', name: 'Overworld #3', title: 'The Deluge Realm #3', url: '/map/overworld3' },
  { id: 'overworld4', zone: 'overworld', name: 'Overworld #4', title: 'The Deluge Realm #4', url: '/map/overworld4' },
  { id: 'overworld5', zone: 'overworld', name: 'Overworld #5', title: 'The Deluge Realm #5', url: '/map/overworld5' },
  { id: 'overworld6', zone: 'overworld', name: 'Overworld #6', title: 'The Deluge Realm #6', url: '/map/overworld6' },
  { id: 'overworld7', zone: 'overworld', name: 'Overworld #7', title: 'The Deluge Realm #7', url: '/map/overworld7' },
  { id: 'overworld8', zone: 'overworld', name: 'Overworld #8', title: 'The Deluge Realm #8', url: '/map/overworld8' },
  { id: 'overworld9', zone: 'overworld', name: 'Overworld #9', title: 'The Deluge Realm #9', url: '/map/overworld9' },
  { id: 'overworld10', zone: 'overworld', name: 'Overworld #10', title: 'The Deluge Realm #10', url: '/map/overworld10' },
  { id: 'overworld11', zone: 'overworld', name: 'Overworld #11', title: 'The Deluge Realm #11', url: '/map/overworld11' },
  { id: 'overworld12', zone: 'overworld', name: 'Overworld #12', title: 'The Deluge Realm #12', url: '/map/overworld12' },
  { id: 'overworld13', zone: 'overworld', name: 'Overworld #13', title: 'The Deluge Realm #13', url: '/map/overworld13' },
  { id: 'overworld14', zone: 'overworld', name: 'Overworld #14', title: 'The Deluge Realm #14', url: '/map/overworld14' },
  { id: 'overworld15', zone: 'overworld', name: 'Overworld #15', title: 'The Deluge Realm #15', url: '/map/overworld15' },
  { id: 'overworld16', zone: 'overworld', name: 'Overworld #16', title: 'The Deluge Realm #16', url: '/map/overworld16' },
  { id: 'overworld17', zone: 'overworld', name: 'Overworld #17', title: 'The Deluge Realm #17', url: '/map/overworld17' },
  { id: 'overworld18', zone: 'overworld', name: 'Overworld #18', title: 'The Deluge Realm #18', url: '/map/overworld18' },
  { id: 'overworld19', zone: 'overworld', name: 'Overworld #19', title: 'The Deluge Realm #19', url: '/map/overworld19' },
  { id: 'overworld20', zone: 'overworld', name: 'Overworld #20', title: 'The Deluge Realm #20', url: '/map/overworld20' },
  { id: 'overworld21', zone: 'overworld', name: 'Overworld #21', title: 'The Deluge Realm #21', url: '/map/overworld21' },
  { id: 'overworld22', zone: 'overworld', name: 'Overworld #22', title: 'The Deluge Realm #22', url: '/map/overworld22' },
  { id: 'overworld23', zone: 'overworld', name: 'Overworld #23', title: 'The Deluge Realm #23', url: '/map/overworld23' },
  { id: 'overworld24', zone: 'overworld', name: 'Overworld #24', title: 'The Deluge Realm #24', url: '/map/overworld24' },
  { id: 'overworld25', zone: 'overworld', name: 'Overworld #25', title: 'The Deluge Realm #25', url: '/map/overworld25' },

  // 2. Shivering Cave (4 Maps)
  { id: 'snowcave1', zone: 'snowcave', name: 'Snow cave #1', title: 'Shivering Cave #1', url: '/map/snowcave1' },
  { id: 'snowcave2', zone: 'snowcave', name: 'Snow cave #2', title: 'Shivering Cave #2', url: '/map/snowcave2' },
  { id: 'snowcave3', zone: 'snowcave', name: 'Snow cave #3', title: 'Shivering Cave #3', url: '/map/snowcave3' },
  { id: 'snowcave4', zone: 'snowcave', name: 'Snow cave #4', title: 'Shivering Cave #4', url: '/map/snowcave4' },

  // 3. Magma Lagoon (4 Maps)
  { id: 'volcano1', zone: 'volcano', name: 'Volcano #1', title: 'Magma Lagoon #1', url: '/map/volcano1' },
  { id: 'volcano2', zone: 'volcano', name: 'Volcano #2', title: 'Magma Lagoon #2', url: '/map/volcano2' },
  { id: 'volcano3', zone: 'volcano', name: 'Volcano #3', title: 'Magma Lagoon #3', url: '/map/volcano3' },
  { id: 'volcano4', zone: 'volcano', name: 'Volcano #4', title: 'Magma Lagoon #4', url: '/map/volcano4' },

  // 4. Lost Inscriptions (2 Maps)
  { id: 'unownruins1', zone: 'unownruins', name: 'Unown Ruins #1', title: 'Lost Inscriptions #1', url: '/map/unownruins1' },
  { id: 'unownruins2', zone: 'unownruins', name: 'Unown Ruins #2', title: 'Lost Inscriptions #2', url: '/map/unownruins2' },

  // 5. Tower of Lost Souls (3 Maps)
  { id: 'pkmntower1', zone: 'pkmntower', name: 'Pokemon Tower #1', title: 'Tower of Lost Souls #1', url: '/map/pkmntower1' },
  { id: 'pkmntower2', zone: 'pkmntower', name: 'Pokemon Tower #2', title: 'Tower of Lost Souls #2', url: '/map/pkmntower2' },
  { id: 'pkmntower3', zone: 'pkmntower', name: 'Pokemon Tower #3', title: 'Tower of Lost Souls #3', url: '/map/pkmntower3' },

  // 6. Charged Chateau (3 Maps)
  { id: 'powerplant1', zone: 'powerplant', name: 'Power Plant #1', title: 'Charged Chateau #1', url: '/map/powerplant1' },
  { id: 'powerplant2', zone: 'powerplant', name: 'Power Plant #2', title: 'Charged Chateau #2', url: '/map/powerplant2' },
  { id: 'powerplant3', zone: 'powerplant', name: 'Power Plant #3', title: 'Charged Chateau #3', url: '/map/powerplant3' },

  // 7. Mystery Villa (4 Maps)
  { id: 'pkmnmansion1', zone: 'pkmnmansion', name: 'Pokemon Mansion #1', title: 'Mystery Villa #1', url: '/map/pkmnmansion1' },
  { id: 'pkmnmansion2', zone: 'pkmnmansion', name: 'Pokemon Mansion #2', title: 'Mystery Villa #2', url: '/map/pkmnmansion2' },
  { id: 'pkmnmansion3', zone: 'pkmnmansion', name: 'Pokemon Mansion #3', title: 'Mystery Villa #3', url: '/map/pkmnmansion3' },
  { id: 'pkmnmansion4', zone: 'pkmnmansion', name: 'Pokemon Mansion #4', title: 'Mystery Villa #4', url: '/map/pkmnmansion4' },

  // 8. Sea Cave (4 Maps)
  { id: 'rockcave1', zone: 'rockcave', name: 'Rock Cave #1', title: 'Sea Cave #1', url: '/map/rockcave1' },
  { id: 'rockcave2', zone: 'rockcave', name: 'Rock Cave #2', title: 'Sea Cave #2', url: '/map/rockcave2' },
  { id: 'rockcave3', zone: 'rockcave', name: 'Rock Cave #3', title: 'Sea Cave #3', url: '/map/rockcave3' },
  { id: 'rockcave4', zone: 'rockcave', name: 'Rock Cave #4', title: 'Sea Cave #4', url: '/map/rockcave4' }
];

function normalizeMapId(rawUrlOrId) {
  if (!rawUrlOrId || typeof rawUrlOrId !== 'string') return '';
  let cleaned = rawUrlOrId.trim().toLowerCase();
  try {
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      const u = new URL(cleaned);
      cleaned = u.pathname.toLowerCase();
    }
  } catch (_) {}
  cleaned = cleaned.replace(/^\/+/, '');
  if (cleaned.startsWith('map/')) {
    cleaned = cleaned.substring(4);
  }
  return cleaned.replace(/\/+$/, '');
}

function getDelugeMapById(mapId) {
  const norm = normalizeMapId(mapId);
  if (!norm) return null;
  return DELUGE_MAPS.find(m => m.id.toLowerCase() === norm) || null;
}

function getDelugeMapByUrl(rawUrl) {
  return getDelugeMapById(rawUrl);
}

function isValidDelugeMap(rawUrlOrId) {
  return !!getDelugeMapById(rawUrlOrId);
}

function getDelugeMapsByZone(zoneId) {
  if (!zoneId || typeof zoneId !== 'string') return [];
  const norm = zoneId.trim().toLowerCase();
  return DELUGE_MAPS.filter(m => m.zone && m.zone.toLowerCase() === norm);
}

function getRandomDelugeMap(excludeUrlOrId = null, allowedZones = null) {
  const excludeNorm = normalizeMapId(excludeUrlOrId);
  let pool = DELUGE_MAPS;
  if (Array.isArray(allowedZones) && allowedZones.length > 0) {
    const normAllowed = allowedZones.map(z => String(z).toLowerCase());
    const filtered = DELUGE_MAPS.filter(m => m.zone && normAllowed.includes(m.zone.toLowerCase()));
    if (filtered.length > 0) {
      pool = filtered;
    }
  }
  const candidates = excludeNorm
    ? pool.filter(m => m.id.toLowerCase() !== excludeNorm)
    : pool;
  const finalPool = candidates.length > 0 ? candidates : pool;
  const idx = Math.floor(Math.random() * finalPool.length);
  return finalPool[idx];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DELUGE_ZONES,
    DELUGE_MAPS,
    normalizeMapId,
    getDelugeMapById,
    getDelugeMapByUrl,
    isValidDelugeMap,
    getDelugeMapsByZone,
    getRandomDelugeMap
  };
}

if (typeof window !== 'undefined') {
  window.DELUGE_ZONES = DELUGE_ZONES;
  window.DELUGE_MAPS = DELUGE_MAPS;
  window.normalizeMapId = normalizeMapId;
  window.getDelugeMapById = getDelugeMapById;
  window.getDelugeMapByUrl = getDelugeMapByUrl;
  window.isValidDelugeMap = isValidDelugeMap;
  window.getDelugeMapsByZone = getDelugeMapsByZone;
  window.getRandomDelugeMap = getRandomDelugeMap;
}
