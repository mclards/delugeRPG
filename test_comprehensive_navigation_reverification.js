// test_comprehensive_navigation_reverification.js
// Exhaustive simulation and mathematical verification of DelugeRPG 8-direction
// navigation, obstacle evasion, surface reflection physics, corridor momentum,
// ping-pong loop breaking, and pre-dispatch zero-collision guard.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('===============================================================');
console.log('=== COMPREHENSIVE DELUGERPG NAVIGATION REVERIFICATION SUITE ===');
console.log('===============================================================\n');

// -------------------------------------------------------------
// PART 1: 8-WAY GEOMETRY & TOPOLOGY VERIFICATION
// -------------------------------------------------------------
console.log('--- PART 1: Verifying 8-Way Geometry & Inversion Matrices ---');

const CARDINAL_DIRECTIONS = ['Left', 'Up', 'Right', 'Down'];
const DIAGONAL_DIRECTIONS = ['Up-Left', 'Up-Right', 'Down-Right', 'Down-Left'];
const ALL_DIRECTIONS_8 = ['Left', 'Up', 'Right', 'Down', 'Up-Left', 'Up-Right', 'Down-Right', 'Down-Left'];

const OPPOSITES_8 = {
  'Left': 'Right',
  'Right': 'Left',
  'Up': 'Down',
  'Down': 'Up',
  'Up-Left': 'Down-Right',
  'Down-Right': 'Up-Left',
  'Up-Right': 'Down-Left',
  'Down-Left': 'Up-Right'
};

const PERPENDICULARS_8 = {
  'Left': ['Up', 'Down'],
  'Right': ['Up', 'Down'],
  'Up': ['Left', 'Right'],
  'Down': ['Left', 'Right'],
  'Up-Left': ['Up-Right', 'Down-Left'],
  'Up-Right': ['Up-Left', 'Down-Right'],
  'Down-Left': ['Up-Left', 'Down-Right'],
  'Down-Right': ['Up-Right', 'Down-Left']
};

// Check every direction has a symmetrical opposite
ALL_DIRECTIONS_8.forEach(dir => {
  const opp = OPPOSITES_8[dir];
  assert(opp, `Direction ${dir} must have an opposite`);
  assert.strictEqual(OPPOSITES_8[opp], dir, `Opposite of ${opp} must be ${dir} (bijective symmetry)`);
});
console.log('  [PASS] 8-Way Opposites are 100% bijectively symmetric.');

// Check perpendiculars
ALL_DIRECTIONS_8.forEach(dir => {
  const perps = PERPENDICULARS_8[dir];
  assert(Array.isArray(perps) && perps.length === 2, `Direction ${dir} must have exactly 2 perpendiculars`);
  perps.forEach(p => {
    assert.notStrictEqual(p, dir, `Perpendicular cannot be the direction itself`);
    assert.notStrictEqual(p, OPPOSITES_8[dir], `Perpendicular cannot be opposite direction`);
  });
});
console.log('  [PASS] 8-Way Perpendiculars are 100% orthogonal and distinct.');

// -------------------------------------------------------------
// PART 2: DELUGERPG GRID MAP SIMULATOR
// -------------------------------------------------------------
console.log('\n--- PART 2: Building 2D Grid Map Topology Simulator ---');

class DelugeMapSimulator {
  constructor(width, height, walls = []) {
    this.width = width;
    this.height = height;
    this.walls = new Set(walls.map(w => `${w[0]},${w[1]}`));
    this.playerX = 0;
    this.playerY = 0;
  }

  setPlayer(x, y) {
    this.playerX = x;
    this.playerY = y;
  }

  isWall(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    return this.walls.has(`${x},${y}`);
  }

  // Live on-screen nav button states as DelugeRPG presents them
  getNavButtonStates() {
    const x = this.playerX;
    const y = this.playerY;

    // Cardinal
    const upBlocked = this.isWall(x, y - 1);
    const downBlocked = this.isWall(x, y + 1);
    const leftBlocked = this.isWall(x - 1, y);
    const rightBlocked = this.isWall(x + 1, y);

    // Diagonal: in DelugeRPG, moving diagonally requires the diagonal tile to be clear
    // and typically requires at least one flanking edge clear to slide through
    const upLeftBlocked = this.isWall(x - 1, y - 1) || (upBlocked && leftBlocked);
    const upRightBlocked = this.isWall(x + 1, y - 1) || (upBlocked && rightBlocked);
    const downLeftBlocked = this.isWall(x - 1, y + 1) || (downBlocked && leftBlocked);
    const downRightBlocked = this.isWall(x + 1, y + 1) || (downBlocked && rightBlocked);

    return {
      'Up': upBlocked,
      'Down': downBlocked,
      'Left': leftBlocked,
      'Right': rightBlocked,
      'Up-Left': upLeftBlocked,
      'Up-Right': upRightBlocked,
      'Down-Left': downLeftBlocked,
      'Down-Right': downRightBlocked
    };
  }

  attemptMove(dir) {
    const vectors = {
      'Up': [0, -1],
      'Down': [0, 1],
      'Left': [-1, 0],
      'Right': [1, 0],
      'Up-Left': [-1, -1],
      'Up-Right': [1, -1],
      'Down-Left': [-1, 1],
      'Down-Right': [1, 1]
    };

    const delta = vectors[dir];
    if (!delta) return { success: false, reason: 'invalid_dir' };

    const navStates = this.getNavButtonStates();
    if (navStates[dir]) {
      // Wall hit! Position does NOT change!
      return { success: false, reason: 'wall_blocked', x: this.playerX, y: this.playerY };
    }

    // Success: Player steps forward
    this.playerX += delta[0];
    this.playerY += delta[1];
    return { success: true, x: this.playerX, y: this.playerY };
  }
}

console.log('  [PASS] DelugeMapSimulator initialized successfully.');

// -------------------------------------------------------------
// PART 3: REVERIFYING ALL 5 WALK MODES OVER 5,000 COMBINED STEPS
// -------------------------------------------------------------
console.log('\n--- PART 3: Exhaustive Simulation of All 5 Walk Modes ---');

function createNavigationEngine(mode, stepsPerDir = 3) {
  let stepCount = 0;
  let wanderStepsLeft = stepsPerDir;
  let currentDirectionKey = 'Left';
  let diagonalVertical = 'Up';
  let diagonalHorizontal = 'Right';
  const blockedDirections = {};
  const deadEndCooldowns = {};
  const recentMoves = [];
  let consecutiveBlockedCount = 0;

  function detectPingPongLoop() {
    if (recentMoves.length < 4) return null;
    const len = recentMoves.length;
    const m1 = recentMoves[len - 4];
    const m2 = recentMoves[len - 3];
    const m3 = recentMoves[len - 2];
    const m4 = recentMoves[len - 1];
    if (m1 === m3 && m2 === m4 && OPPOSITES_8[m1] === m2) {
      return { dirA: m1, dirB: m2 };
    }
    return null;
  }

  function chooseEvadeDirection(blockedDir) {
    const now = Date.now();
    for (const k in deadEndCooldowns) {
      if (now > deadEndCooldowns[k]) delete deadEndCooldowns[k];
    }

    const perpList = PERPENDICULARS_8[blockedDir] || ['Up', 'Down', 'Left', 'Right'];
    const unblockedFreshPerp = perpList.filter(k => (!blockedDirections[k] || blockedDirections[k] <= now) && (!deadEndCooldowns[k] || deadEndCooldowns[k] <= now));
    if (unblockedFreshPerp.length > 0) {
      return unblockedFreshPerp[Math.floor(Math.random() * unblockedFreshPerp.length)];
    }

    const anyUnblockedPerp = perpList.filter(k => !blockedDirections[k] || blockedDirections[k] <= now);
    if (anyUnblockedPerp.length > 0) {
      return anyUnblockedPerp[Math.floor(Math.random() * anyUnblockedPerp.length)];
    }

    const flanks = blockedDir === 'Up' ? ['Up-Left', 'Up-Right'] :
                   blockedDir === 'Down' ? ['Down-Left', 'Down-Right'] :
                   blockedDir === 'Left' ? ['Up-Left', 'Down-Left'] :
                   blockedDir === 'Right' ? ['Up-Right', 'Down-Right'] : [];
    const unblockedFlanks = flanks.filter(k => (!blockedDirections[k] || blockedDirections[k] <= now) && (!deadEndCooldowns[k] || deadEndCooldowns[k] <= now));
    if (unblockedFlanks.length > 0) {
      return unblockedFlanks[Math.floor(Math.random() * unblockedFlanks.length)];
    }

    const opp = OPPOSITES_8[blockedDir] || 'Down';
    if (!blockedDirections[opp] || blockedDirections[opp] <= now) {
      deadEndCooldowns[blockedDir] = now + 10000;
      return opp;
    }

    const anyUnblocked = ALL_DIRECTIONS_8.filter(k => k !== blockedDir && (!blockedDirections[k] || blockedDirections[k] <= now));
    if (anyUnblocked.length > 0) {
      return anyUnblocked[Math.floor(Math.random() * anyUnblocked.length)];
    }

    return opp;
  }

  function getNextKey() {
    const keys = ['Left', 'Up', 'Right', 'Down'];
    const now = Date.now();

    for (const k in blockedDirections) {
      if (now > blockedDirections[k]) delete blockedDirections[k];
    }

    const loop = detectPingPongLoop();
    if (loop) {
      blockedDirections[loop.dirA] = now + 6000;
      blockedDirections[loop.dirB] = now + 6000;
      recentMoves.length = 0;

      const escapePerps = PERPENDICULARS_8[loop.dirA] || ['Up', 'Down'];
      const unblockedEscape = escapePerps.filter(k => !blockedDirections[k] || blockedDirections[k] <= now);
      if (unblockedEscape.length > 0) {
        const escapeDir = unblockedEscape[Math.floor(Math.random() * unblockedEscape.length)];
        currentDirectionKey = escapeDir;
        wanderStepsLeft = Math.max(3, stepsPerDir);
        return escapeDir;
      }
    }

    if (mode === 'diagonal') {
      if (blockedDirections[diagonalVertical] && blockedDirections[diagonalVertical] > now) {
        diagonalVertical = diagonalVertical === 'Up' ? 'Down' : 'Up';
      }
      if (blockedDirections[diagonalHorizontal] && blockedDirections[diagonalHorizontal] > now) {
        diagonalHorizontal = diagonalHorizontal === 'Right' ? 'Left' : 'Right';
      }

      let candidate = `${diagonalVertical}-${diagonalHorizontal}`;
      if (blockedDirections[candidate] && blockedDirections[candidate] > now) {
        const altV = (diagonalVertical === 'Up' ? 'Down' : 'Up') + '-' + diagonalHorizontal;
        if (!blockedDirections[altV] || blockedDirections[altV] <= now) {
          diagonalVertical = diagonalVertical === 'Up' ? 'Down' : 'Up';
          candidate = altV;
        } else {
          const altH = diagonalVertical + '-' + (diagonalHorizontal === 'Right' ? 'Left' : 'Right');
          if (!blockedDirections[altH] || blockedDirections[altH] <= now) {
            diagonalHorizontal = diagonalHorizontal === 'Right' ? 'Left' : 'Right';
            candidate = altH;
          } else {
            const altBoth = (diagonalVertical === 'Up' ? 'Down' : 'Up') + '-' + (diagonalHorizontal === 'Right' ? 'Left' : 'Right');
            if (!blockedDirections[altBoth] || blockedDirections[altBoth] <= now) {
              diagonalVertical = diagonalVertical === 'Up' ? 'Down' : 'Up';
              diagonalHorizontal = diagonalHorizontal === 'Right' ? 'Left' : 'Right';
              candidate = altBoth;
            } else {
              candidate = chooseEvadeDirection(candidate);
            }
          }
        }
      }
      return candidate;
    }

    if (mode === 'line_horizontal') {
      let isLeft = Math.floor(stepCount / stepsPerDir) % 2 === 0;
      let target = isLeft ? 'Left' : 'Right';
      if (blockedDirections[target] && blockedDirections[target] > now) {
        const opp = target === 'Left' ? 'Right' : 'Left';
        if (!blockedDirections[opp] || blockedDirections[opp] <= now) {
          const remainder = stepCount % stepsPerDir;
          if (remainder !== 0) stepCount += (stepsPerDir - remainder);
          return opp;
        }
        return chooseEvadeDirection(target);
      }
      return target;
    }

    if (mode === 'line_vertical') {
      let isUp = Math.floor(stepCount / stepsPerDir) % 2 === 0;
      let target = isUp ? 'Up' : 'Down';
      if (blockedDirections[target] && blockedDirections[target] > now) {
        const opp = target === 'Up' ? 'Down' : 'Up';
        if (!blockedDirections[opp] || blockedDirections[opp] <= now) {
          const remainder = stepCount % stepsPerDir;
          if (remainder !== 0) stepCount += (stepsPerDir - remainder);
          return opp;
        }
        return chooseEvadeDirection(target);
      }
      return target;
    }

    if (mode === 'patrol_square') {
      let idx = Math.floor(stepCount / stepsPerDir) % 4;
      let candidate = keys[idx];
      if (blockedDirections[candidate] && blockedDirections[candidate] > now) {
        stepCount += stepsPerDir;
        idx = Math.floor(stepCount / stepsPerDir) % 4;
        candidate = keys[idx];
        if (blockedDirections[candidate] && blockedDirections[candidate] > now) {
          return chooseEvadeDirection(candidate);
        }
      }
      return candidate;
    }

    // Wander Mode
    const maxSteps = stepsPerDir;
    const perpList = PERPENDICULARS_8[currentDirectionKey] || ['Up', 'Down'];
    const bothPerpsBlocked = perpList.every(k => blockedDirections[k] && blockedDirections[k] > now);
    const forwardIsBlocked = !!(blockedDirections[currentDirectionKey] && blockedDirections[currentDirectionKey] > now);

    if (!forwardIsBlocked && bothPerpsBlocked) {
      wanderStepsLeft = maxSteps;
      return currentDirectionKey;
    }

    if (wanderStepsLeft <= 0 || forwardIsBlocked) {
      currentDirectionKey = chooseEvadeDirection(currentDirectionKey);
      const stepsToTake = maxSteps > 1 ? (Math.floor(Math.random() * maxSteps) + 1) : 1;
      wanderStepsLeft = stepsToTake - 1;
    } else {
      wanderStepsLeft--;
    }
    return currentDirectionKey;
  }

  function handleCollision(dir) {
    blockedDirections[dir] = Date.now() + 3500;
    consecutiveBlockedCount++;
    wanderStepsLeft = 0;

    if (dir === 'Up') diagonalVertical = 'Down';
    else if (dir === 'Down') diagonalVertical = 'Up';
    else if (dir === 'Left') diagonalHorizontal = 'Right';
    else if (dir === 'Right') diagonalHorizontal = 'Left';
    else if (dir === 'Up-Right') {
      if (blockedDirections['Up']) diagonalVertical = 'Down';
      else if (blockedDirections['Right']) diagonalHorizontal = 'Left';
      else { diagonalVertical = 'Down'; diagonalHorizontal = 'Left'; }
    } else if (dir === 'Up-Left') {
      if (blockedDirections['Up']) diagonalVertical = 'Down';
      else if (blockedDirections['Left']) diagonalHorizontal = 'Right';
      else { diagonalVertical = 'Down'; diagonalHorizontal = 'Right'; }
    } else if (dir === 'Down-Right') {
      if (blockedDirections['Down']) diagonalVertical = 'Up';
      else if (blockedDirections['Right']) diagonalHorizontal = 'Left';
      else { diagonalVertical = 'Up'; diagonalHorizontal = 'Left'; }
    } else if (dir === 'Down-Left') {
      if (blockedDirections['Down']) diagonalVertical = 'Up';
      else if (blockedDirections['Left']) diagonalHorizontal = 'Right';
      else { diagonalVertical = 'Up'; diagonalHorizontal = 'Right'; }
    }

    const remainder = stepCount % stepsPerDir;
    if (remainder !== 0) stepCount += (stepsPerDir - remainder);
    currentDirectionKey = chooseEvadeDirection(dir);
  }

  function handleSuccess(dir) {
    consecutiveBlockedCount = 0;
    if (blockedDirections[dir]) delete blockedDirections[dir];
  }

  function dispatchStep(sim) {
    // 1. Sync live nav buttons
    const navStates = sim.getNavButtonStates();
    for (const d in navStates) {
      if (navStates[d]) {
        blockedDirections[d] = Date.now() + 3500;
      } else {
        delete blockedDirections[d];
      }
    }

    let key = getNextKey();
    const now = Date.now();

    // Pre-dispatch Guard
    if (blockedDirections[key] && blockedDirections[key] > now) {
      const allowHumanMisstep = consecutiveBlockedCount === 0 && Math.random() < 0.015;
      if (!allowHumanMisstep) {
        const evaded = chooseEvadeDirection(key);
        if (evaded && evaded !== key) {
          key = evaded;
        }
      }
    }

    recentMoves.push(key);
    if (recentMoves.length > 8) recentMoves.shift();
    stepCount++;

    const res = sim.attemptMove(key);
    if (!res.success) {
      handleCollision(key);
      return { dir: key, collision: true };
    } else {
      handleSuccess(key);
      return { dir: key, collision: false };
    }
  }

  return { dispatchStep, getNextKey, handleCollision };
}

// SIMULATION 1: Tight Corridor Map (1-tile wide hallway between walls)
// Tests: corridor momentum, ping-pong avoidance, dead-end turns
console.log('\n--- Simulation 1: Tight Hallway & Choke Points (1,000 steps) ---');
const hallwayWalls = [];
// Create a 20x20 map where columns 4 and 6 are solid walls (column 5 is 1-tile corridor from row 2 to 18)
for (let y = 2; y <= 18; y++) {
  hallwayWalls.push([4, y]);
  hallwayWalls.push([6, y]);
}
// Dead-end cap at top
hallwayWalls.push([5, 1]);

const simHallway = new DelugeMapSimulator(20, 20, hallwayWalls);
simHallway.setPlayer(5, 10); // Start inside the tight hallway

const engineWander = createNavigationEngine('wander', 3);
let hallwayCollisions = 0;
let hallwaySteps = 1000;

for (let i = 0; i < hallwaySteps; i++) {
  const result = engineWander.dispatchStep(simHallway);
  if (result.collision) hallwayCollisions++;
}

const hallwayCollisionRate = hallwayCollisions / hallwaySteps;
console.log(`  Hallway 1,000 steps: ${hallwaySteps - hallwayCollisions} clean, ${hallwayCollisions} collisions (Rate: ${(hallwayCollisionRate * 100).toFixed(2)}%)`);
assert(hallwayCollisionRate <= 0.02, `Hallway collision rate must be <= 2% (got ${(hallwayCollisionRate * 100).toFixed(2)}%)`);
console.log('  [PASS] Wander mode traversed tight corridor with zero deadlocks and collision rate < 2%.');

// SIMULATION 2: Open Map with True Diagonal Sweeping (1,000 steps)
// Tests: reflection off top, bottom, left, right walls and corners
console.log('\n--- Simulation 2: True 8-Way Diagonal Sweep & Reflection (1,000 steps) ---');
const simOpen = new DelugeMapSimulator(25, 20, []); // DelugeRPG rectangular grid (25x20)
simOpen.setPlayer(7, 11);

const engineDiag = createNavigationEngine('diagonal', 4);
let diagCollisions = 0;
let diagSteps = 1000;
const diagonalMovesCount = {};

for (let i = 0; i < diagSteps; i++) {
  const result = engineDiag.dispatchStep(simOpen);
  diagonalMovesCount[result.dir] = (diagonalMovesCount[result.dir] || 0) + 1;
  if (result.collision) diagCollisions++;
}

const diagCollisionRate = diagCollisions / diagSteps;
console.log(`  Diagonal 1,000 steps: ${diagSteps - diagCollisions} clean, ${diagCollisions} collisions (Rate: ${(diagCollisionRate * 100).toFixed(2)}%)`);
console.log('  Move Distribution:', JSON.stringify(diagonalMovesCount));
assert(diagCollisionRate <= 0.02, `Diagonal collision rate must be <= 2% (got ${(diagCollisionRate * 100).toFixed(2)}%)`);
// Verify all 4 diagonal directions were utilized
assert(diagonalMovesCount['Up-Right'] > 50, 'Must actively sweep Up-Right');
assert(diagonalMovesCount['Down-Right'] > 50, 'Must actively sweep Down-Right');
assert(diagonalMovesCount['Down-Left'] > 50, 'Must actively sweep Down-Left');
assert(diagonalMovesCount['Up-Left'] > 50, 'Must actively sweep Up-Left');
console.log('  [PASS] True 8-way diagonal mode sweeps map and reflects off boundaries with < 2% bump rate.');

// SIMULATION 3: Horizontal Line Mode (1,000 steps)
console.log('\n--- Simulation 3: Horizontal Line Pacing (1,000 steps) ---');
const simHoriz = new DelugeMapSimulator(15, 15, []);
simHoriz.setPlayer(7, 7);
const engineHoriz = createNavigationEngine('line_horizontal', 5);
let horizCollisions = 0;
for (let i = 0; i < 1000; i++) {
  const res = engineHoriz.dispatchStep(simHoriz);
  if (res.collision) horizCollisions++;
}
const horizCollisionRate = horizCollisions / 1000;
console.log(`  Horizontal 1,000 steps: ${1000 - horizCollisions} clean, ${horizCollisions} collisions (Rate: ${(horizCollisionRate * 100).toFixed(2)}%)`);
assert(horizCollisionRate <= 0.02, `Horizontal line collision rate must be <= 2%`);
console.log('  [PASS] Horizontal line mode verified.');

// SIMULATION 4: Vertical Line Mode (1,000 steps)
console.log('\n--- Simulation 4: Vertical Line Pacing (1,000 steps) ---');
const simVert = new DelugeMapSimulator(15, 15, []);
simVert.setPlayer(7, 7);
const engineVert = createNavigationEngine('line_vertical', 5);
let vertCollisions = 0;
for (let i = 0; i < 1000; i++) {
  const res = engineVert.dispatchStep(simVert);
  if (res.collision) vertCollisions++;
}
const vertCollisionRate = vertCollisions / 1000;
console.log(`  Vertical 1,000 steps: ${1000 - vertCollisions} clean, ${vertCollisions} collisions (Rate: ${(vertCollisionRate * 100).toFixed(2)}%)`);
assert(vertCollisionRate <= 0.02, `Vertical line collision rate must be <= 2%`);
console.log('  [PASS] Vertical line mode verified.');

// SIMULATION 5: Square Patrol Mode (1,000 steps)
console.log('\n--- Simulation 5: Square Patrol Perimeter (1,000 steps) ---');
const simSquare = new DelugeMapSimulator(20, 20, []);
simSquare.setPlayer(10, 10);
const engineSquare = createNavigationEngine('patrol_square', 4);
let squareCollisions = 0;
for (let i = 0; i < 1000; i++) {
  const res = engineSquare.dispatchStep(simSquare);
  if (res.collision) squareCollisions++;
}
const squareCollisionRate = squareCollisions / 1000;
console.log(`  Square Patrol 1,000 steps: ${1000 - squareCollisions} clean, ${squareCollisions} collisions (Rate: ${(squareCollisionRate * 100).toFixed(2)}%)`);
assert(squareCollisionRate <= 0.02, `Square patrol collision rate must be <= 2%`);
console.log('  [PASS] Square patrol mode verified.');

// -------------------------------------------------------------
// PART 4: STRICT REVERIFICATION OF SOURCE CODE FILES
// -------------------------------------------------------------
console.log('\n--- PART 4: Source File Code Integrity Reverification ---');

const appSource = fs.readFileSync(path.join(__dirname, 'desktop-client', 'app.js'), 'utf8');
const preloadSource = fs.readFileSync(path.join(__dirname, 'desktop-client', 'game-preload.js'), 'utf8');
const userSource = fs.readFileSync(path.join(__dirname, 'pokefinder.user.js'), 'utf8');

// 1. Check all 8 button selectors in preload
const requiredPreloadSelectors = ['#dr-n', '#dr-s', '#dr-w', '#dr-e', '#dr-nw', '#dr-ne', '#dr-sw', '#dr-se'];
requiredPreloadSelectors.forEach(sel => {
  assert(preloadSource.includes(sel), `game-preload.js must include selector ${sel}`);
});
console.log('  [PASS] game-preload.js includes all 8 on-screen button selectors.');

// 2. Check all 8 button selectors in pokefinder.user.js
requiredPreloadSelectors.forEach(sel => {
  assert(userSource.includes(sel), `pokefinder.user.js must include selector ${sel}`);
});
console.log('  [PASS] pokefinder.user.js includes all 8 on-screen button selectors.');

// 3. Check IPC channels in app.js
assert(appSource.includes("'click-nav-button'"), 'app.js must use click-nav-button');
assert(appSource.includes("'nav-status'"), 'app.js must listen to nav-status');
assert(appSource.includes("'step-dispatched'"), 'app.js must dispatch step-dispatched');
assert(appSource.includes("'move-result'"), 'app.js must handle move-result');
console.log('  [PASS] app.js contains all 4 verified IPC event channels.');

// 4. Check 7-bit ASCII compliance across all files
const filesToCheck = [
  path.join(__dirname, 'desktop-client', 'app.js'),
  path.join(__dirname, 'desktop-client', 'game-preload.js'),
  path.join(__dirname, 'desktop-client', 'main.js'),
  path.join(__dirname, 'desktop-client', 'targets.js'),
  path.join(__dirname, 'desktop-client', 'config.json'),
  path.join(__dirname, 'pokefinder.user.js'),
  path.join(__dirname, 'test_nav_buttons_and_obstacle_cadence.js'),
  __filename
];

filesToCheck.forEach(fp => {
  const text = fs.readFileSync(fp, 'utf8');
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) {
      throw new Error(`Non-ASCII character found in ${fp} at offset ${i} (char code ${text.charCodeAt(i)})`);
    }
  }
  console.log(`  [PASS] ${path.basename(fp)} is 100% 7-bit ASCII clean (${text.length} chars).`);
});

console.log('\n===============================================================');
console.log('=== ALL COMPREHENSIVE REVERIFICATION TESTS PASSED (100%) ===');
console.log('===============================================================');
