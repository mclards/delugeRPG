// roaming_telemetry_ui.js - Roaming Step & Live Battle Telemetry Handlers (Extracted from app.js)

function getNextKey() {
  const mode = walkModeSelect.value;
  const keys = ['Left', 'Up', 'Right', 'Down'];
  const stepsPerDir = config.settings.stepsPerDirection || 1;
  const now = Date.now();

  // Expire old blocked directions
  for (const k in blockedDirections) {
    if (now > blockedDirections[k]) delete blockedDirections[k];
  }

  // Active Ping-Pong Loop Breaker (Prevents 2-tile / 3-tile trap oscillations in tight corridors)
  const loop = detectPingPongLoop();
  if (loop) {
    console.log(`[Loop Breaker] Detected ping-pong oscillation between ${loop.dirA} and ${loop.dirB}! Forcing escape...`);
    blockedDirections[loop.dirA] = now + 6000;
    blockedDirections[loop.dirB] = now + 6000;
    recentMoves.length = 0;

    const escapePerps = PERPENDICULARS_8[loop.dirA] || ['Up', 'Down'];
    const unblockedEscape = escapePerps.filter(k => !isDirectionPhysicallyBlocked(k, now));
    if (unblockedEscape.length > 0) {
      const escapeDir = unblockedEscape[Math.floor(Math.random() * unblockedEscape.length)];
      currentDirectionKey = escapeDir;
      wanderStepsLeft = stepsPerDir - 1;
      updateStatus(`Escaping choke point (${escapeDir})...`, '#38bdf8');
      return escapeDir;
    }
    const anyEscape = ALL_DIRECTIONS_8.filter(k => k !== loop.dirA && k !== loop.dirB && !isDirectionPhysicallyBlocked(k, now));
    if (anyEscape.length > 0) {
      const escapeDir = anyEscape[Math.floor(Math.random() * anyEscape.length)];
      currentDirectionKey = escapeDir;
      wanderStepsLeft = stepsPerDir - 1;
      updateStatus(`Escaping choke point (${escapeDir})...`, '#38bdf8');
      return escapeDir;
    }
  }

  // MODE: DIAGONAL (True 8-Way Diagonal Sweeping & Surface Reflection)
  if (mode === 'diagonal') {
    if (isDirectionPhysicallyBlocked(diagonalVertical, now)) {
      diagonalVertical = diagonalVertical === 'Up' ? 'Down' : 'Up';
    }
    if (isDirectionPhysicallyBlocked(diagonalHorizontal, now)) {
      diagonalHorizontal = diagonalHorizontal === 'Right' ? 'Left' : 'Right';
    }

    let candidate = `${diagonalVertical}-${diagonalHorizontal}`;
    if (isDirectionPhysicallyBlocked(candidate, now)) {
      const altV = (diagonalVertical === 'Up' ? 'Down' : 'Up') + '-' + diagonalHorizontal;
      if (!isDirectionPhysicallyBlocked(altV, now)) {
        diagonalVertical = diagonalVertical === 'Up' ? 'Down' : 'Up';
        candidate = altV;
      } else {
        const altH = diagonalVertical + '-' + (diagonalHorizontal === 'Right' ? 'Left' : 'Right');
        if (!isDirectionPhysicallyBlocked(altH, now)) {
          diagonalHorizontal = diagonalHorizontal === 'Right' ? 'Left' : 'Right';
          candidate = altH;
        } else {
          const altBoth = (diagonalVertical === 'Up' ? 'Down' : 'Up') + '-' + (diagonalHorizontal === 'Right' ? 'Left' : 'Right');
          if (!isDirectionPhysicallyBlocked(altBoth, now)) {
            diagonalVertical = diagonalVertical === 'Up' ? 'Down' : 'Up';
            diagonalHorizontal = diagonalHorizontal === 'Right' ? 'Left' : 'Right';
            candidate = altBoth;
          } else {
            return chooseEvadeDirection(candidate);
          }
        }
      }
    }
    return candidate;
  }

  if (mode === 'line_horizontal') {
    let isLeft = Math.floor(patternStepCount / stepsPerDir) % 2 === 0;
    let target = isLeft ? 'Left' : 'Right';
    if (isDirectionPhysicallyBlocked(target, now)) {
      const opp = target === 'Left' ? 'Right' : 'Left';
      if (!isDirectionPhysicallyBlocked(opp, now)) {
        const remainder = patternStepCount % stepsPerDir;
        if (remainder !== 0) patternStepCount += (stepsPerDir - remainder);
        return opp;
      }
      return chooseEvadeDirection(target);
    }
    return target;
  }

  if (mode === 'line_vertical') {
    let isUp = Math.floor(patternStepCount / stepsPerDir) % 2 === 0;
    let target = isUp ? 'Up' : 'Down';
    if (isDirectionPhysicallyBlocked(target, now)) {
      const opp = target === 'Up' ? 'Down' : 'Up';
      if (!isDirectionPhysicallyBlocked(opp, now)) {
        const remainder = patternStepCount % stepsPerDir;
        if (remainder !== 0) patternStepCount += (stepsPerDir - remainder);
        return opp;
      }
      return chooseEvadeDirection(target);
    }
    return target;
  }

  if (mode === 'patrol_square') {
    let idx = Math.floor(patternStepCount / stepsPerDir) % 4;
    let candidate = keys[idx];
    if (isDirectionPhysicallyBlocked(candidate, now)) {
      patternStepCount += stepsPerDir;
      idx = Math.floor(patternStepCount / stepsPerDir) % 4;
      candidate = keys[idx];
      if (isDirectionPhysicallyBlocked(candidate, now)) {
        return chooseEvadeDirection(candidate);
      }

    }
    return candidate;
  }

  // Mode: Wander with 8-Way Roaming, Corridor Momentum, and Anti-Looping
  const compulsorySteps = config.settings.stepsPerDirection || 1;
  const forwardIsBlocked = isDirectionPhysicallyBlocked(currentDirectionKey, now);

  // If forward is blocked: trigger immediate zero-latency evasion!
  // Momentum MUST stop immediately when an obstacle is directly in the path:
  // reset remaining steps counter and immediately switch to a different unobstructed direction.
  if (forwardIsBlocked) {
    const prev = currentDirectionKey;
    currentDirectionKey = chooseEvadeDirection(currentDirectionKey);
    wanderStepsLeft = compulsorySteps - 1;
    backendLog('Wander', `Forward ${prev} is blocked! Evaded to ${currentDirectionKey}`);
    return currentDirectionKey;
  }

  // Normal turn condition: compulsory steps completed on clear path
  if (wanderStepsLeft <= 0) {
    const prev = currentDirectionKey;
    currentDirectionKey = chooseWanderDirection(currentDirectionKey);
    wanderStepsLeft = compulsorySteps - 1;
    backendLog('Wander', `Completed cycle. Turned from ${prev} to ${currentDirectionKey}`);
  } else {
    wanderStepsLeft--;
    backendLog('Wander', `Continuing ${currentDirectionKey}, stepsLeft=${wanderStepsLeft}`);
  }

  return currentDirectionKey;
}

// Native Hardware Input Dispatch (isTrusted: true) & Direct Nav Button Click
function sendKeyStep(keyName) {
  if (!isRunning || isStepPending) {
    return;
  }

  // Pre-dispatch Safety Guard: verify webview is still on a map page
  try {
    const curUrl = delugeView ? delugeView.getURL() : '';
    if (curUrl && !isMapUrl(curUrl)) {
      autoPauseOutsideMap(curUrl);
      return;
    }
  } catch (_) {}

  // Guard against stealing cursor/focus when typing in guest inputs
  if (isGuestInputFocused) {
    return;
  }

  const now = Date.now();
  // Pre-dispatch Zero-Collision Guard: Never hit a direction that is currently known to be blocked
  if (isDirectionPhysicallyBlocked(keyName, now)) {
    const evaded = chooseEvadeDirection(keyName);
    if (evaded && evaded !== keyName) {
      backendLog('PreDispatchGuard', `Direction ${keyName} blocked before dispatch! Evading to ${evaded}`);
      keyName = evaded;
      currentDirectionKey = evaded;
      wanderStepsLeft = (config.settings.stepsPerDirection || 1) - 1;
    }
  }

  try {
    lastDispatchedDirection = keyName;
    recentMoves.push(keyName);
    if (recentMoves.length > 8) recentMoves.shift();
    isStepPending = true;

    backendLog('StepDispatch', `Sending key: ${keyName} (patternStepCount=${patternStepCount}, isPending=${isStepPending})`);

    // Atomic movement dispatch: exactly ONE action per step (prevents double-dispatch and encounter skipping)
    delugeView.send('click-nav-button', { direction: keyName });

    // Notify guest webview preload of dispatched step
    delugeView.send('step-dispatched', { direction: keyName, time: Date.now() });

    // Fallback collision timer: Safety net if preload doesn't resolve within 2600ms
    if (fallbackCollisionTimer) clearTimeout(fallbackCollisionTimer);
    fallbackCollisionTimer = setTimeout(() => {
      const isBlocked = isDirectionPhysicallyBlocked(keyName);
      backendLog('FallbackTimer', `Safety timer expired (2600ms) for direction: ${keyName}, physicallyBlocked=${isBlocked}`);
      if (isBlocked) {
        handleMoveBlocked(keyName);
      } else {
        handleMoveSuccess(keyName);
      }
    }, 2600);

    patternStepCount++;
  } catch (err) {
    backendLog('SendKeyStepError', err.message);
    console.error('sendInputEvent error:', err);
  }
}

// Hardened Walking Engine
function scheduleNextStep(customDelay = null) {
  if (!isRunning) return;
  if (walkTimeout) clearTimeout(walkTimeout);

  // Pre-schedule Safety Guard: verify webview is still on a map page
  try {
    const curUrl = delugeView ? delugeView.getURL() : '';
    if (curUrl && !isMapUrl(curUrl)) {
      autoPauseOutsideMap(curUrl);
      return;
    }
  } catch (_) {}

  if (isGuestInputFocused) {
    scheduleNextStep(1000);
    return;
  }

  const delay = customDelay !== null ? customDelay : getHardenedHumanDelay();

  walkTimeout = setTimeout(() => {
    if (!isRunning) return;

    if (isStepPending) {
      stepPendingTicks++;
      if (stepPendingTicks >= 8) {
        // Safety recovery: if a guest move-result was dropped or delayed >2s, reset and continue
        backendLog('StepPendingRecovery', 'isStepPending timeout (2000ms); recovering pending step.');
        isStepPending = false;
        stepPendingTicks = 0;
      } else {
        // Step in flight: wait 250ms and re-check before dispatching next step
        scheduleNextStep(250);
        return;
      }
    } else {
      stepPendingTicks = 0;
    }

    try {
      const stepUrl = delugeView ? delugeView.getURL() : '';
      if (stepUrl && !isMapUrl(stepUrl)) {
        autoPauseOutsideMap(stepUrl);
        return;
      }
    } catch (_) {}

    if (isGuestInputFocused) {
      scheduleNextStep(1000);
      return;
    }

    // Check if map is searching
    if (mapIsSearching) {
      searchWaitTicks++;
      if (searchWaitTicks >= 4) {
        // Safety reset if Deluge network search lagged
        mapIsSearching = false;
        searchWaitTicks = 0;
      } else {
        updateStatus('Searching...', '#38bdf8');
        scheduleNextStep(600);
        return;
      }
    } else {
      searchWaitTicks = 0;
    }

    if (isRestBreakActive) {
      isRestBreakActive = false;
      if (breakCountdownTimer) {
        clearInterval(breakCountdownTimer);
        breakCountdownTimer = null;
      }
    }

    // Map Rotation Guard: if map rotation interval expired, execute rotation safely!
    if (isMapRotationActive() && (isMapRotationDue || (nextMapRotationTime && Date.now() >= nextMapRotationTime))) {
      if (canExecuteMapTransition()) {
        executeMapRotation('hunting_interval');
        return;
      }
    }

    // 0. Check if resuming from a micro-pause or idle pause
    // After the pause, change to another direction and start fresh compulsory steps!
    if (isResumingFromMicroPause || isResumingFromIdlePause) {
      const wasMicro = isResumingFromMicroPause;
      isResumingFromMicroPause = false;
      isResumingFromIdlePause = false;

      const prev = currentDirectionKey;
      currentDirectionKey = chooseWanderDirection(currentDirectionKey);
      const compulsorySteps = Math.max(1, config.settings.stepsPerDirection || 1);
      wanderStepsLeft = compulsorySteps - 1;

      backendLog(wasMicro ? 'MicroBreak' : 'IdlePause', `Resumed after ${wasMicro ? 'micro-pause' : 'idle pause'}: Changed direction from ${prev} to ${currentDirectionKey}, starting fresh ${compulsorySteps} steps`);
      sendKeyStep(currentDirectionKey);
      updateStatus(`Hunting (${currentDirectionKey})`, '#10b981');
      return;
    }

    // 1. Long Idle Pause (Simulate alt-tabbing or resting)
    // ONLY allowed when wanderStepsLeft <= 0 (strictly at turn boundary, NEVER mid-stride during compulsory steps!)
    if (config.settings.enableIdlePauses && wanderStepsLeft <= 0) {
      stepsSinceLastIdlePause++;
      if (stepsSinceLastIdlePause >= nextIdlePauseThreshold) {
        stepsSinceLastIdlePause = 0;
        nextIdlePauseThreshold = Math.floor(Math.random() * 40) + 110;
        wanderStepsLeft = 0;
        isResumingFromIdlePause = true;
        const pauseSec = ((12000 + Math.random() * 6000) / 1000).toFixed(1);
        updateStatus(`Resting (${pauseSec}s)...`, '#e879f9');
        backendLog('IdlePause', `Resting for ${pauseSec}s: Step counter reset, will change direction upon resume`);
        scheduleNextStep(parseFloat(pauseSec) * 1000);
        return;
      }
    }

    // 2. Micro-Breaks (Simulate brief glance/distraction)
    // ONLY allowed when wanderStepsLeft <= 0 (strictly at turn boundary, NEVER mid-stride during compulsory steps!)
    if (config.settings.enableMicroBreaks && wanderStepsLeft <= 0) {
      stepsSinceLastMicroBreak++;
      if (stepsSinceLastMicroBreak >= nextMicroBreakThreshold) {
        stepsSinceLastMicroBreak = 0;
        nextMicroBreakThreshold = Math.floor(Math.random() * 15) + 30;
        wanderStepsLeft = 0;
        isResumingFromMicroPause = true;
        const restSec = ((1400 + Math.random() * 800) / 1000).toFixed(1);
        updateStatus(`Micro-pause (${restSec}s)...`, '#a855f7');
        backendLog('MicroBreak', `Micro-pause for ${restSec}s: Step counter reset, will change direction upon resume`);
        scheduleNextStep(parseFloat(restSec) * 1000);
        return;
      }
    }

    // 3. Dispatch Step (Pacing is driven by move-result confirmation in handleMoveSuccess)
    const key = getNextKey();
    sendKeyStep(key);
    updateStatus(`Hunting (${key})`, '#10b981');
  }, delay);
}

function triggerDelayedAutoStart(sourceReason = 'Map opened') {
  cancelPendingAutoStart();

  const shouldAutoStart = config.settings && config.settings.autoStartOnMap !== false;
  if (!shouldAutoStart) return;
  if (isRunning) return;
  if (userManuallyPaused) return;
  if (isEncounterOnScreen) return;
  if (isUnlockChallengeActive) {
    backendLog('AutoStart', 'Skipping auto-start: captcha challenge active.');
    return;
  }

  if (!isCurrentPageMap()) return;

  if (config.settings && config.settings.autoCatchMasterBall === true) {
    if (dailyCatchData && dailyCatchData.masterBallStock === 0) {
      outOfStockPaused = true;
      updateStatus('Paused (0 Master Balls - Restock)', '#ef4444');
      return;
    }
    if (!isBallInventorySynced && delugeView && typeof delugeView.send === 'function') {
      try { delugeView.send('request-ball-inventory'); } catch (_) {}
    }
  }

  ensureTodaySafetyState();
  if (config.safety && config.safety.enableDailyCeilings !== false) {
    if (dailySafetyState.todaySteps >= dailySafetyState.dailyStepCeiling) {
      updateStatus(`Paused (Daily Steps: ${dailySafetyState.todaySteps}/${dailySafetyState.dailyStepCeiling})`, '#ef4444');
      return;
    }
    const curCatches = Math.max(dailySafetyState.todayCatches || 0, (dailyCatchData && dailyCatchData.caught) ? dailyCatchData.caught.length : 0);
    if (curCatches >= dailySafetyState.dailyCatchCeiling) {
      updateStatus(`Paused (Daily Catches: ${curCatches}/${dailySafetyState.dailyCatchCeiling})`, '#ef4444');
      return;
    }
  }

  const delaySec = Math.max(2, parseInt((config.settings && config.settings.autoStartDelay) || 3, 10));
  autoStartRemainingSeconds = delaySec;

  backendLog('AutoStart', `${sourceReason}. Pending auto-start scheduled in ${delaySec}s to allow map scripts and security checks to settle.`);
  updateStatus(`Auto-Start in ${autoStartRemainingSeconds}s...`, '#f59e0b');
  if (btnText && !isRunning) btnText.textContent = `Auto (${autoStartRemainingSeconds}s)`;

  autoStartCountdownTimer = setInterval(() => {
    autoStartRemainingSeconds--;
    if (autoStartRemainingSeconds > 0) {
      if (!isCurrentPageMap() || isUnlockChallengeActive || isEncounterOnScreen || isRunning || userManuallyPaused) {
        cancelPendingAutoStart('Conditions changed during countdown');
        updateToggleButton();
        return;
      }
      updateStatus(`Auto-Start in ${autoStartRemainingSeconds}s...`, '#f59e0b');
      if (btnText && !isRunning) btnText.textContent = `Auto (${autoStartRemainingSeconds}s)`;
    }
  }, 1000);

  autoStartTimer = setTimeout(() => {
    cancelPendingAutoStart();

    if (!isCurrentPageMap()) {
      backendLog('AutoStart', 'Aborted auto-start: no longer on map URL.');
      return;
    }
    if (isUnlockChallengeActive) {
      backendLog('AutoStart', 'Aborted auto-start: captcha challenge active.');
      return;
    }
    if (isEncounterOnScreen) {
      backendLog('AutoStart', 'Aborted auto-start: encounter currently on screen.');
      return;
    }
    if (isRunning) return;
    if (userManuallyPaused) {
      backendLog('AutoStart', 'Aborted auto-start: user manually paused.');
      return;
    }

    ensureTodaySafetyState();
    if (config.safety && config.safety.enableDailyCeilings !== false) {
      if (dailySafetyState.todaySteps >= dailySafetyState.dailyStepCeiling) {
        updateStatus(`Paused (Daily Steps: ${dailySafetyState.todaySteps}/${dailySafetyState.dailyStepCeiling})`, '#ef4444');
        return;
      }
      const curCatches = Math.max(dailySafetyState.todayCatches || 0, (dailyCatchData && dailyCatchData.caught) ? dailyCatchData.caught.length : 0);
      if (curCatches >= dailySafetyState.dailyCatchCeiling) {
        updateStatus(`Paused (Daily Catches: ${curCatches}/${dailySafetyState.dailyCatchCeiling})`, '#ef4444');
        return;
      }
    }

    backendLog('AutoStart', `Security delay (${delaySec}s) elapsed without captcha. Auto-starting hunting session.`);
    stopAllBattleAutomation('Map auto-start engaged');
    isRunning = true;
    userManuallyPaused = false;
    isGuestInputFocused = false;
    isStepPending = false;
    stepPendingTicks = 0;
    wanderStepsLeft = (config.settings && config.settings.stepsPerDirection) || 5;

    if (config.safety && config.safety.enableDeadManSwitch !== false) {
      if (!sessionAutoStopTimer || !sessionAutoStopTime) {
        const stopMins = getRandomInRange(config.safety.autoStopMinMinutes || 5, config.safety.autoStopMaxMinutes || 30);
        sessionAutoStopTime = Date.now() + stopMins * 60 * 1000;
        sessionAutoStopTargetMins = stopMins;
        if (sessionAutoStopTimer) clearTimeout(sessionAutoStopTimer);
        sessionAutoStopTimer = setTimeout(() => {
          triggerSessionAutoStop(`Session auto-stop triggered after ${sessionAutoStopTargetMins}m`, `Paused (Auto-Stop: ${sessionAutoStopTargetMins}m)`);
        }, stopMins * 60 * 1000);
        backendLog('SafetyAutoStop', `Session auto-stop timer scheduled for ${stopMins} minutes`);
      }
    }
    if (config.safety && config.safety.enableForcedBreaks !== false) {
      if (!nextBreakStepTarget) {
        rollNextBreakTargets();
      }
    }
    if (isMapRotationActive()) {
      if (!mapRotationTimer || !nextMapRotationTime) {
        scheduleNextMapRotation();
      }
    }
    updateSafetyTelemetryUI();

    updateToggleButton();
    syncHuntingState();
    updateStatus('Hunting Active (Auto-Started)', '#22c55e');
    ensureMemorySyncedBeforeHunting(() => {
      if (isRunning) scheduleNextStep(1000);
    });
  }, delaySec * 1000);
}

function matchesTeamEntryName(uEntryOrName, member) {
  if (!uEntryOrName || !member || !member.name) return false;
  const isObj = (typeof uEntryOrName === 'object');
  const rawName = isObj ? uEntryOrName.name : uEntryOrName;
  if (!rawName) return false;
  const uLower = String(rawName).toLowerCase().trim();
  const mLower = String(member.name).toLowerCase().trim();
  const uHasExplicitVar = Boolean(
    isObj &&
    uEntryOrName.variant !== undefined &&
    uEntryOrName.variant !== null &&
    String(uEntryOrName.variant).trim() !== ''
  );
  const uVar = (uHasExplicitVar && String(uEntryOrName.variant).trim().toLowerCase() !== 'normal')
    ? (String(uEntryOrName.variant).trim().toLowerCase() + ' ')
    : '';
  const mVar = (member.variant && String(member.variant).trim().toLowerCase() !== 'normal')
    ? (String(member.variant).trim().toLowerCase() + ' ')
    : '';

  if (uHasExplicitVar && uVar !== mVar) {
    const uHasMVarPrefix = Boolean(mVar && uLower.startsWith(mVar));
    const mHasUVarPrefix = Boolean(uVar && mLower.startsWith(uVar));
    if (!uHasMVarPrefix && !mHasUVarPrefix) return false;
  }

  if (uLower === mLower) return true;
  if (mVar && uLower === mVar + mLower) return true;
  if (uVar && mLower === uVar + uLower) return true;
  if (mVar && mLower.startsWith(mVar) && uLower === mLower.slice(mVar.length)) {
    return !uHasExplicitVar || uVar === mVar;
  }
  return false;
}

function syncCollectionLevelsFromTelemetry(entries, recommendedTeam) {
  if (!Array.isArray(entries) || entries.length === 0 || !Array.isArray(currentCollection) || currentCollection.length === 0) {
    return { collUpdated: false, leveledEntries: [] };
  }
  const recList = Array.isArray(recommendedTeam) ? recommendedTeam : (Array.isArray(lastRecommendedTeam) ? lastRecommendedTeam : []);
  let collUpdated = false;
  const leveledEntries = [];

  entries.forEach(u => {
    if (!u || !u.name || u.levelKnown === false) return;
    const rawLevel = (u.level !== undefined && u.level !== null) ? parseInt(u.level, 10) : NaN;
    const rawExp = (u.exp !== undefined && u.exp !== null) ? parseInt(String(u.exp).replace(/,/g, ''), 10) : NaN;
    if ((isNaN(rawLevel) || rawLevel <= 0) && (isNaN(rawExp) || rawExp <= 0)) return;

    let match = null;
    if (u.id) {
      match = currentCollection.find(c => c && c.id && String(c.id) === String(u.id));
    }
    if (!match && recList.length > 0) {
      const rec = recList.find(r => r && r.id && matchesTeamEntryName(u, r));
      if (rec) {
        match = currentCollection.find(c => c && c.id && String(c.id) === String(rec.id));
      }
    }
    if (!match) {
      const uLower = String(u.name).toLowerCase().trim();
      match = currentCollection.find(c => c && c.name && c.name.toLowerCase().trim() === uLower && matchesTeamEntryName(u, c)) ||
              currentCollection.find(c => c && matchesTeamEntryName(u, c));
    }
    if (!match) return;

    const prevLvl = typeof match.level === 'number' ? match.level : (parseInt(match.level, 10) || 0);
    const nextLvl = !isNaN(rawLevel) && rawLevel > 0 ? Math.min(100, rawLevel) : 0;
    let entryChanged = false;
    if (nextLvl > prevLvl) {
      match.level = nextLvl;
      entryChanged = true;
      collUpdated = true;
    }

    const prevExp = typeof match.exp === 'number' ? match.exp : (parseInt(String(match.exp || '0').replace(/,/g, ''), 10) || 0);
    const computedExp = !isNaN(rawExp) && rawExp > 0 ? rawExp : (nextLvl > prevLvl ? (nextLvl * 1000) : 0);
    if (computedExp > prevExp) {
      match.exp = computedExp;
      collUpdated = true;
    }

    if (entryChanged) {
      leveledEntries.push({ id: match.id, name: match.name, fromLevel: prevLvl, toLevel: nextLvl });
    }
  });

  if (collUpdated) {
    if (typeof refreshCandidateListsCache === 'function') {
      refreshCandidateListsCache({ resetCursors: false });
    }
    if (typeof updateRosterModeUI === 'function') {
      updateRosterModeUI();
    }
    if (typeof updateTrainerIntelStats === 'function') {
      updateTrainerIntelStats();
    }
    if (typeof syncUserCollectionToGuest === 'function') {
      syncUserCollectionToGuest();
    }
    if (typeof fs !== 'undefined' && typeof getWritableDataPath === 'function') {
      try {
        fs.writeFileSync(getWritableDataPath('user_collection.json'), JSON.stringify(currentCollection, null, 2), 'utf8');
      } catch (_) {}
    }
  }

  return { collUpdated, leveledEntries };
}

function handleLiveBattleOpponents(data) {
  if (!data) return;
  if (!data.isProfileStalk && isWildHuntingOrCatchContext(data.battleUrl || '')) {
    stopAllBattleAutomation('Ignoring battle telemetry during Wild Catch / Map hunting');
    return;
  }
  const isPostBattle = Boolean(data.isPostBattleScreen || data.isVictoryScreen || data.isDefeatScreen);
  if (!isPostBattle && (!Array.isArray(data.roster) || data.roster.length === 0)) return;
  if (!Array.isArray(data.roster)) data.roster = [];

  // Mid-Battle Roster & Team Preservation
  if (data.isInActiveBattle && data.roster.length === 1) {
    const liveOpp = data.roster[0];
    const liveOppName = (liveOpp.name || '').toLowerCase().trim();

    const knownVariants = ['normal', 'shiny', 'metallic', 'ghostly', 'dark', 'shadow', 'mirage', 'retro', 'chrome', 'negative'];
    const stripVar = (s) => {
      let clean = (s || '').toLowerCase().trim();
      for (let i = 0; i < knownVariants.length; i++) {
        const v = knownVariants[i];
        if (clean.indexOf(v + ' ') === 0) {
          clean = clean.substring(v.length + 1).trim();
          break;
        }
      }
      return clean.replace(/[^a-z0-9]/g, '');
    };
    const cleanLiveBase = stripVar(liveOppName);

    // 1. Check if previous activeAiBattleData had full roster for this trainer
    if (activeAiBattleData && activeAiBattleData.trainerName &&
        activeAiBattleData.trainerName.toLowerCase() === (data.trainerName || '').toLowerCase() &&
        Array.isArray(activeAiBattleData.roster) && activeAiBattleData.roster.length > 1) {
      const prevRoster = activeAiBattleData.roster;
      const matchIdx = prevRoster.findIndex(p => {
        const pClean = (p.name || '').toLowerCase().trim();
        return pClean === liveOppName || stripVar(pClean) === cleanLiveBase;
      });
      if (matchIdx !== -1) {
        const prevActiveIdx = prevRoster.findIndex(p => p.isCurrentActive);
        if (prevActiveIdx !== -1 && prevActiveIdx !== matchIdx) {
          prevRoster[prevActiveIdx].isFainted = true;
          prevRoster[prevActiveIdx].hp = 0;
        }
        prevRoster.forEach(p => { p.isCurrentActive = false; });
        prevRoster[matchIdx].isCurrentActive = true;
        prevRoster[matchIdx].hp = liveOpp.hp;
        prevRoster[matchIdx].maxHp = liveOpp.maxHp;
        prevRoster[matchIdx].level = liveOpp.level;
        prevRoster[matchIdx].types = liveOpp.types;
        prevRoster[matchIdx].isFainted = (liveOpp.hp !== undefined && liveOpp.hp <= 0);
        if (liveOpp.sprite) prevRoster[matchIdx].sprite = liveOpp.sprite;
        data.roster = prevRoster;
      } else {
        prevRoster.push(liveOpp);
        data.roster = prevRoster;
      }
    } else if (gymLeadersData && data.trainerName) {
      // 2. Check gymLeadersData for known roster of this trainer
      const cleanName = data.trainerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      let knownLeader = null;
      const allGroups = [
        gymLeadersData.ULTIMATE_TRAINERS,
        gymLeadersData.STRONG_TRAINERS,
        gymLeadersData.VIP_TRAINERS,
        gymLeadersData.STANDARD_TRAINERS
      ];
      for (const group of allGroups) {
        if (!group) continue;
        knownLeader = group.find(t => t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName);
        if (knownLeader) break;
      }
      if (!knownLeader && gymLeadersData.GYM_LEAGUES) {
        for (const reg in gymLeadersData.GYM_LEAGUES) {
          knownLeader = gymLeadersData.GYM_LEAGUES[reg].find(t => t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName);
          if (knownLeader) break;
        }
      }
      if (knownLeader && Array.isArray(knownLeader.roster) && knownLeader.roster.length > 1) {
        const fullRoster = knownLeader.roster.map(p => ({
          name: p.name,
          types: p.types || ['Normal'],
          level: p.level || 100,
          hp: 400,
          maxHp: 400,
          isFainted: false,
          moves: p.moves || []
        }));
        const mIdx = fullRoster.findIndex(p => {
          const pClean = (p.name || '').toLowerCase().trim();
          return pClean === liveOppName || stripVar(pClean) === cleanLiveBase;
        });
        if (mIdx !== -1) {
          fullRoster.forEach(p => { p.isCurrentActive = false; });
          fullRoster[mIdx].isCurrentActive = true;
          fullRoster[mIdx].hp = liveOpp.hp;
          fullRoster[mIdx].maxHp = liveOpp.maxHp;
          fullRoster[mIdx].level = liveOpp.level;
          fullRoster[mIdx].types = liveOpp.types;
          fullRoster[mIdx].isFainted = (liveOpp.hp !== undefined && liveOpp.hp <= 0);
        }
        data.roster = fullRoster;
      }
    }

    // Preserve userTeam if current turn data has empty userTeam but previous had it
    if ((!data.userTeam || data.userTeam.length === 0) && activeAiBattleData && Array.isArray(activeAiBattleData.userTeam) && activeAiBattleData.userTeam.length > 0) {
      data.userTeam = activeAiBattleData.userTeam;
    }
  }

  // Enrich #switchpoke entries lacking DOM level numbers from known team/collection
  if (Array.isArray(data.userTeam) && data.userTeam.length > 0) {
    data.userTeam.forEach(u => {
      if (!u || !u.name) return;
      if (u.levelKnown === false) {
        const knownMem = (Array.isArray(lastKnownUserTeam) && lastKnownUserTeam.find(m => m && m.levelKnown !== false && matchesTeamEntryName(u, m))) ||
                         (Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.find(m => m && matchesTeamEntryName(u, m))) ||
                         (Array.isArray(currentCollection) && currentCollection.find(c => c && matchesTeamEntryName(u, c)));
        if (knownMem && typeof knownMem.level === 'number') {
          u.level = knownMem.level;
          u.levelKnown = true;
          u._placeholderHp = true;
          if (!u.isFainted && (typeof u.maxHp !== 'number' || u.maxHp <= 100) && typeof knownMem.maxHp === 'number' && knownMem.maxHp > 0) {
            u.maxHp = knownMem.maxHp;
            u.hp = (typeof knownMem.hp === 'number' && knownMem.hp > 0) ? knownMem.hp : knownMem.maxHp;
          }
        }
      }
    });
  }

  // Track and retain userTeam across preparation, challenge preview, and active battle screens
  const matchFaintedSet = (typeof currentMatchFaintedPokemon !== 'undefined' && currentMatchFaintedPokemon) ? currentMatchFaintedPokemon : null;
  const prevWasPostBattle = Boolean(
    typeof activeAiBattleData !== 'undefined' &&
    activeAiBattleData &&
    (activeAiBattleData.isPostBattleScreen || activeAiBattleData.isVictoryScreen || activeAiBattleData.isDefeatScreen)
  );
  if (prevWasPostBattle && !isPostBattle && (data.isPreparationScreen || data.isInActiveBattle)) {
    if (typeof currentMatchParticipants !== 'undefined') currentMatchParticipants.clear();
    if (matchFaintedSet) matchFaintedSet.clear();
    if (typeof currentMatchCarryDefeated !== 'undefined') currentMatchCarryDefeated = false;
    if (typeof currentMatchPostCarryDeployed !== 'undefined' && currentMatchPostCarryDeployed) currentMatchPostCarryDeployed.clear();
    if (typeof currentMatchPostCarryFainted !== 'undefined' && currentMatchPostCarryFainted) currentMatchPostCarryFainted.clear();
    if (typeof justSwitchedActivePokemon !== 'undefined') justSwitchedActivePokemon.clear();
    if (Array.isArray(lastKnownUserTeam)) {
      lastKnownUserTeam = lastKnownUserTeam.map(mem => {
        if (!mem) return mem;
        const lvl = (typeof mem.level === 'number' && mem.level > 0) ? mem.level : 100;
        const maxHp = (typeof mem.maxHp === 'number' && mem.maxHp > 0) ? mem.maxHp : (lvl * 4);
        return Object.assign({}, mem, { hp: maxHp, maxHp: maxHp, isFainted: false });
      });
    }
  }
  let skipStalePostSwapSync = false;
  if (typeof teamSwappedAwaitingNewBattle !== 'undefined' && teamSwappedAwaitingNewBattle) {
    if (!isPostBattle && (data.isPreparationScreen || data.isInActiveBattle)) {
      teamSwappedAwaitingNewBattle = false;
    } else if (isPostBattle && Array.isArray(lastKnownUserTeam) && lastKnownUserTeam.length > 0) {
      data.userTeam = lastKnownUserTeam.map(m => Object.assign({}, m));
      data.participatingPokemon = [];
      skipStalePostSwapSync = true;
    }
  }
  if (Array.isArray(data.userTeam) && data.userTeam.length > 0) {
    const rawLiveUserCount = data.userTeam.length;
    const liveBenchCount = (typeof data.benchExtractedCount === 'number')
      ? data.benchExtractedCount
      : Math.max(0, rawLiveUserCount - (data.userActivePokemon ? 1 : 0));
    const liveBenchRadiosCount = (typeof data.benchRadiosCount === 'number')
      ? data.benchRadiosCount
      : (data.hasBenchRadios ? Math.max(1, liveBenchCount) : 0);
    const canInferMissingBenchAsFainted = Boolean(
      data.isInActiveBattle &&
      !data.isPreparationScreen &&
      liveBenchCount > 0 &&
      (liveBenchRadiosCount === 0 || liveBenchCount >= liveBenchRadiosCount) &&
      (data.hasBenchRadios || data.hasSwitchBtn || (!data.hasContinueBtn && !data.hasSkipSelectionBtn && data.hasAttackBtn))
    );
    let baseParty = null;
    if (Array.isArray(lastKnownUserTeam) && lastKnownUserTeam.length >= rawLiveUserCount) {
      baseParty = lastKnownUserTeam;
    } else if ((data.isInActiveBattle || isPostBattle) && Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.length >= rawLiveUserCount) {
      baseParty = lastRecommendedTeam.map((rec, idx) => {
        const lvl = (typeof rec.level === 'number' && rec.level > 0) ? rec.level : 100;
        const fullRecName = (rec.variant && rec.variant !== 'Normal' && !String(rec.name || '').toLowerCase().startsWith(String(rec.variant).toLowerCase() + ' '))
          ? (rec.variant + ' ' + rec.name)
          : rec.name;
        return {
          name: fullRecName,
          variant: rec.variant || 'Normal',
          types: Array.isArray(rec.types) && rec.types.length > 0 ? rec.types : ['Normal'],
          level: lvl,
          levelKnown: true,
          hp: lvl * 4,
          maxHp: lvl * 4,
          isFainted: false,
          isCarry: Boolean(rec.isCarry),
          index: idx
        };
      });
    }
    if ((data.isInActiveBattle || isPostBattle) && baseParty && baseParty.length >= rawLiveUserCount) {
      const isSameParty = data.userTeam.every(u => baseParty.some(m => matchesTeamEntryName(u, m)));
      if (isSameParty) {
        data.userTeam = baseParty.map((mem, idx) => {
          const liveMatch = data.userTeam.find(u => matchesTeamEntryName(u, mem));
          if (liveMatch) {
            const merged = Object.assign({}, mem, liveMatch, { index: idx });
            if (liveMatch.levelKnown === false && mem.levelKnown !== false && typeof mem.level === 'number') {
              merged.level = mem.level;
              merged.levelKnown = true;
            }
            const liveIsExplicitlyFainted = Boolean(liveMatch.isFainted || (typeof liveMatch.hp === 'number' && liveMatch.hp <= 0));
            const liveIsAlive = Boolean(!liveIsExplicitlyFainted && (liveMatch.aliveProven || data.isPreparationScreen || (typeof liveMatch.hp === 'number' && liveMatch.hp > 0)));
            if (liveIsAlive) {
              merged.isFainted = false;
              if (liveMatch.levelKnown === false || liveMatch._placeholderHp) {
                if (typeof mem.maxHp === 'number' && mem.maxHp > 0) merged.maxHp = mem.maxHp;
                else if (typeof merged.level === 'number' && merged.level > 0) merged.maxHp = merged.level * 4;
                if (typeof mem.hp === 'number' && mem.hp > 0) {
                  merged.hp = mem.hp;
                } else if (typeof merged.maxHp === 'number' && merged.maxHp > 0) {
                  merged.hp = merged.maxHp;
                }
              }
              delete merged._placeholderHp;
              if (matchFaintedSet && merged.name) {
                matchFaintedSet.delete(merged.name.toLowerCase());
              }
            } else if (liveIsExplicitlyFainted) {
              merged.isFainted = true;
              merged.hp = 0;
              if (matchFaintedSet && merged.name) {
                matchFaintedSet.add(merged.name.toLowerCase());
              }
            } else if (!data.isPreparationScreen && (mem.isFainted || (typeof mem.hp === 'number' && mem.hp <= 0))) {
              merged.isFainted = true;
              merged.hp = 0;
            }
            return merged;
          }
          if (data.userActivePokemon && matchesTeamEntryName(data.userActivePokemon, mem)) {
            const activeMerged = Object.assign({}, mem, data.userActivePokemon, { index: idx });
            if (data.userActivePokemon.levelKnown === false && mem.levelKnown !== false && typeof mem.level === 'number') {
              activeMerged.level = mem.level;
              activeMerged.levelKnown = true;
            }
            if (activeMerged.isFainted || (typeof activeMerged.hp === 'number' && activeMerged.hp <= 0)) {
              activeMerged.isFainted = true;
              activeMerged.hp = 0;
              if (matchFaintedSet && activeMerged.name) matchFaintedSet.add(activeMerged.name.toLowerCase());
            } else if (matchFaintedSet && activeMerged.name && typeof activeMerged.hp === 'number' && activeMerged.hp > 0) {
              matchFaintedSet.delete(activeMerged.name.toLowerCase());
            }
            return activeMerged;
          }
          const memKey = (mem && mem.name) ? mem.name.toLowerCase() : '';
          const memHasParticipated = Boolean(
            typeof currentMatchParticipants === 'undefined' ||
            currentMatchParticipants.size === 0 ||
            (memKey && currentMatchParticipants.has(memKey)) ||
            mem.isFainted ||
            (matchFaintedSet && memKey && matchFaintedSet.has(memKey))
          );
          if (canInferMissingBenchAsFainted && memHasParticipated) {
            if (matchFaintedSet && memKey) matchFaintedSet.add(memKey);
            return Object.assign({}, mem, { hp: 0, isFainted: true, index: idx });
          }
          return Object.assign({}, mem, { index: idx });
        });
      }
    }
    if (Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.length > 0) {
      data.userTeam = data.userTeam.map(u => {
        if (!u) return u;
        const recMatch = lastRecommendedTeam.find(r => matchesTeamEntryName(u, r));
        return (recMatch && recMatch.isCarry) ? Object.assign({}, u, { isCarry: true }) : u;
      });
    }
    lastKnownUserTeam = data.userTeam;
    if (!isPostBattle && (data.isPreparationScreen || data.isInActiveBattle) && battleLoopTimer) {
      clearTimeout(battleLoopTimer);
      battleLoopTimer = null;
    }
    const isFreshMatchPrep = Boolean(
      data.isPreparationScreen &&
      (!Array.isArray(data.roster) || !data.roster.some(p => p.isFainted || (typeof p.hp === 'number' && typeof p.maxHp === 'number' && p.maxHp > 0 && p.hp < p.maxHp))) &&
      (!Array.isArray(data.userTeam) || !data.userTeam.some(u => u.isFainted || (typeof u.hp === 'number' && typeof u.maxHp === 'number' && u.maxHp > 0 && u.hp < u.maxHp)))
    );
    if (isFreshMatchPrep) {
      currentMatchParticipants.clear();
      if (matchFaintedSet) matchFaintedSet.clear();
      if (typeof currentMatchCarryDefeated !== 'undefined') currentMatchCarryDefeated = false;
      if (typeof currentMatchPostCarryDeployed !== 'undefined' && currentMatchPostCarryDeployed) currentMatchPostCarryDeployed.clear();
      if (typeof currentMatchPostCarryFainted !== 'undefined' && currentMatchPostCarryFainted) currentMatchPostCarryFainted.clear();
      justSwitchedActivePokemon.clear();
      currentMatchSwitchCount = 0;
      currentMatchItemCount = 0;
      lastTurnActionType = null;
      data.userTeam = data.userTeam.map(u => {
        if (!u || !u.isFainted) return u;
        const lvl = (typeof u.level === 'number' && u.level > 0) ? u.level : 100;
        const maxHp = (typeof u.maxHp === 'number' && u.maxHp > 0) ? u.maxHp : (lvl * 4);
        return Object.assign({}, u, { hp: maxHp, maxHp: maxHp, isFainted: false });
      });
      lastKnownUserTeam = data.userTeam;
    }
    if (data.userActivePokemon && data.userActivePokemon.name) {
      const actKey = data.userActivePokemon.name.toLowerCase();
      currentMatchParticipants.add(actKey);
      if (matchFaintedSet) {
        if (data.userActivePokemon.isFainted || (typeof data.userActivePokemon.hp === 'number' && data.userActivePokemon.hp <= 0)) {
          matchFaintedSet.add(actKey);
        } else if (typeof data.userActivePokemon.hp === 'number' && data.userActivePokemon.hp > 0) {
          matchFaintedSet.delete(actKey);
        }
      }
    }
    if (!isFreshMatchPrep) {
      data.userTeam.forEach(u => {
        if (!u || !u.name) return;
        const uKey = u.name.toLowerCase();
        if (u.isFainted || (typeof u.hp === 'number' && typeof u.maxHp === 'number' && u.maxHp > 0 && u.hp < u.maxHp)) {
          currentMatchParticipants.add(uKey);
          if (matchFaintedSet && (u.isFainted || (typeof u.hp === 'number' && u.hp <= 0))) {
            matchFaintedSet.add(uKey);
          }
        } else if (matchFaintedSet && !u.isFainted && (u.aliveProven || (typeof u.hp === 'number' && u.hp > 0))) {
          matchFaintedSet.delete(uKey);
        }
      });
      if (typeof currentMatchCarryDefeated !== 'undefined' && Array.isArray(data.userTeam) && data.userTeam.length > 0) {
        const hasExplicitCarries = data.userTeam.some(m => m && m.isCarry);
        const hasTraineesInParty = data.userTeam.some(m => m && !m.isCarry && (m.level || 100) < 100);
        const carryMembers = hasExplicitCarries
          ? data.userTeam.filter(m => m && m.isCarry)
          : (hasTraineesInParty ? data.userTeam.filter(m => m && (m.level || 0) >= 100) : []);
        if (carryMembers.length > 0) {
          const anyCarryAlive = carryMembers.some(c => !c.isFainted && (c.hp === undefined || c.hp > 0));
          if (anyCarryAlive) {
            currentMatchCarryDefeated = false;
            if (typeof currentMatchPostCarryDeployed !== 'undefined' && currentMatchPostCarryDeployed) currentMatchPostCarryDeployed.clear();
            if (typeof currentMatchPostCarryFainted !== 'undefined' && currentMatchPostCarryFainted) currentMatchPostCarryFainted.clear();
          } else {
            const carryVerifiedDefeated = carryMembers.some(c => {
              const cKey = (c.name || '').toLowerCase();
              const isActDeadCarry = Boolean(
                data.userActivePokemon &&
                matchesTeamEntryName(data.userActivePokemon, c) &&
                (data.userActivePokemon.isFainted || (typeof data.userActivePokemon.hp === 'number' && data.userActivePokemon.hp <= 0))
              );
              const inFainted = Boolean(matchFaintedSet && Array.from(matchFaintedSet).some(k => k === cKey || matchesTeamEntryName({ name: k }, c)));
              const inPart = Boolean(typeof currentMatchParticipants !== 'undefined' && Array.from(currentMatchParticipants).some(k => k === cKey || matchesTeamEntryName({ name: k }, c)));
              return isActDeadCarry || (inFainted && inPart);
            });
            if (carryVerifiedDefeated) {
              currentMatchCarryDefeated = true;
            }
          }
        }
        if (currentMatchCarryDefeated) {
          const isPostCarryDeployedEntry = (u) => {
            if (!u || !u.name || typeof currentMatchPostCarryDeployed === 'undefined' || !currentMatchPostCarryDeployed) return false;
            const uKey = u.name.toLowerCase();
            if (currentMatchPostCarryDeployed.has(uKey)) return true;
            return Array.from(currentMatchPostCarryDeployed).some(k => matchesTeamEntryName({ name: k }, u));
          };
          if (data.userActivePokemon && data.userActivePokemon.name && !carryMembers.some(c => matchesTeamEntryName(data.userActivePokemon, c))) {
            const matchedMember = data.userTeam.find(u => matchesTeamEntryName(data.userActivePokemon, u));
            const canonKey = (matchedMember && matchedMember.name ? matchedMember.name : data.userActivePokemon.name).toLowerCase();
            if (typeof currentMatchPostCarryDeployed !== 'undefined' && currentMatchPostCarryDeployed) {
              currentMatchPostCarryDeployed.add(canonKey);
            }
            if (typeof currentMatchPostCarryFainted !== 'undefined' && currentMatchPostCarryFainted) {
              if (data.userActivePokemon.isFainted || (typeof data.userActivePokemon.hp === 'number' && data.userActivePokemon.hp <= 0)) {
                currentMatchPostCarryFainted.add(canonKey);
              } else if (typeof data.userActivePokemon.hp === 'number' && data.userActivePokemon.hp > 0) {
                currentMatchPostCarryFainted.delete(canonKey);
              }
            }
          }
          data.userTeam.forEach(u => {
            if (!u || !u.name || carryMembers.some(c => matchesTeamEntryName(c, u))) return;
            if (!isPostCarryDeployedEntry(u)) return;
            const uKey = u.name.toLowerCase();
            if (typeof currentMatchPostCarryFainted === 'undefined' || !currentMatchPostCarryFainted) return;
            const faintedInSet = Boolean(matchFaintedSet && Array.from(matchFaintedSet).some(k => k === uKey || matchesTeamEntryName({ name: k }, u)));
            if (u.isFainted || (typeof u.hp === 'number' && u.hp <= 0) || faintedInSet) {
              currentMatchPostCarryFainted.add(uKey);
            } else if (!u.isFainted && (u.aliveProven || (typeof u.hp === 'number' && u.hp > 0))) {
              currentMatchPostCarryFainted.delete(uKey);
            }
          });
        }
      }
    }
    if (Array.isArray(data.participatingPokemon)) {
      data.participatingPokemon.forEach(u => {
        if (u && u.name) currentMatchParticipants.add(u.name.toLowerCase());
      });
    }
    if (!skipStalePostSwapSync) {
      const preMaxedOnFreshPrep = [];
      if (Array.isArray(lastRecommendedTeam) && lastRecommendedTeam.length > 0) {
        let teamUpdated = false;
        const isFreshPreBattlePrep = Boolean(
          data.isPreparationScreen &&
          !data.isInActiveBattle &&
          !isPostBattle &&
          typeof teamRosterMode !== 'undefined' &&
          teamRosterMode === 'TRAINING'
        );
        lastRecommendedTeam.forEach(member => {
          const found = data.userTeam.find(u => u && u.levelKnown !== false && matchesTeamEntryName(u, member));
          if (found && found.level && found.level !== member.level) {
            const prevLevel = typeof member.level === 'number' ? member.level : 0;
            if (isFreshPreBattlePrep && !member.isCarry && prevLevel < 85 && found.level >= 100) {
              preMaxedOnFreshPrep.push(member.name);
            }
            member.level = found.level;
            teamUpdated = true;
          }
        });
        if (teamUpdated) {
          let hasAssignedPrimary = false;
          lastRecommendedTeam.forEach(member => {
            if (member.isCarry) return;
            if ((member.level || 0) >= 100) {
              member.targetName = 'Maxed Graduate';
              member.role = 'Graduated Lv 100';
            } else if (!hasAssignedPrimary) {
              member.targetName = 'Primary Trainee Partner';
              member.role = 'Primary Trainee Duo (Lv ' + member.level + ')';
              hasAssignedPrimary = true;
            } else {
              member.targetName = 'Trainee #' + member.slot;
              member.role = 'Trainee EXP Receiver (Lv ' + member.level + ')';
            }
          });
        }
        if (teamUpdated && teamResultContainer && teamResultContainer.style.display !== 'none') {
          renderTeamLineup(liveBattleOpponent || { name: 'Active Opponent' }, lastRecommendedTeam);
        }
      }
      syncCollectionLevelsFromTelemetry(data.userTeam, lastRecommendedTeam);
      if (
        preMaxedOnFreshPrep.length > 0 &&
        typeof isBattleLoopRunning !== 'undefined' &&
        !isBattleLoopRunning &&
        typeof executeTeamBuild === 'function' &&
        teamResultContainer &&
        teamResultContainer.style.display !== 'none'
      ) {
        const selInfo = (typeof getSelectedTrainerInfo === 'function') ? getSelectedTrainerInfo() : null;
        const rebuildTarget = (selInfo && !selInfo.isLive && selInfo.leader)
          ? selInfo.leader
          : (liveBattleOpponent ? {
              name: liveBattleOpponent.trainerName || 'Active Opponent',
              roster: liveBattleOpponent.roster || [],
              types: [],
              avgLevel: 100
            } : null);
        const hasRemainingTrainees = Array.isArray(currentCollection) && currentCollection.some(p => (typeof p.level === 'number' ? p.level : 100) < 100);
        if (rebuildTarget && hasRemainingTrainees) {
          executeTeamBuild(rebuildTarget, { advanceCandidate: false });
          if (teamActionStatus) {
            teamActionStatus.textContent = '! Synced already-maxed ' + preMaxedOnFreshPrep.join(', ') + ' (Lv 100) - click Change Team';
            teamActionStatus.style.color = '#f59e0b';
            teamActionStatus.style.display = 'block';
          }
        }
      }
    }
  } else if ((!data.userTeam || data.userTeam.length === 0) && Array.isArray(lastKnownUserTeam) && lastKnownUserTeam.length > 0) {
    data.userTeam = lastKnownUserTeam;
  }

  // Strictly separate Trainer/Gym Training Battles from G-Max / Arena Challenge locks
  const rawBattleUrl = String(data.battleUrl || (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '').toLowerCase();
  const isExplicitTrainerBattle = (
    rawBattleUrl.includes('/battle/trainer') ||
    rawBattleUrl.includes('/battle/gym') ||
    rawBattleUrl.includes('/npc/')
  ) && !rawBattleUrl.includes('/challenge') && !rawBattleUrl.includes('gmax');

  if (isExplicitTrainerBattle) {
    data.isChallengePreview = false;
    data.isGmaxChallenge = false;
    data.isChallengeLocked = false;
    data.isGmaxChallengeComplete = false;
  } else {
    const prevWasActiveChallenge = Boolean(
      !data.isProfileStalk &&
      typeof activeAiBattleData !== 'undefined' &&
      activeAiBattleData &&
      activeAiBattleData.isChallengeLocked &&
      (!data.trainerName || !activeAiBattleData.trainerName || activeAiBattleData.trainerName.toLowerCase() === data.trainerName.toLowerCase())
    );
    const isChallenge = Boolean(
      data.isChallengePreview ||
      data.isGmaxChallenge ||
      data.isChallengeLocked ||
      prevWasActiveChallenge ||
      rawBattleUrl.includes('/challenge') ||
      rawBattleUrl.includes('gmax') ||
      (data.trainerTitle && data.trainerTitle.indexOf('Challenge') !== -1)
    );
    if (isChallenge) {
      data.isChallengeLocked = true;
      if (prevWasActiveChallenge && !data.isGmaxChallenge && activeAiBattleData.isGmaxChallenge) {
        data.isGmaxChallenge = true;
      }
    }
  }

  if (typeof currentMatchParticipants !== 'undefined' && currentMatchParticipants) {
    data.matchParticipants = Array.from(currentMatchParticipants);
  }
  if (matchFaintedSet) {
    data.verifiedFaintedNames = Array.from(matchFaintedSet);
  }
  if (typeof currentMatchCarryDefeated !== 'undefined') {
    data.carryDefeatedInMatch = Boolean(currentMatchCarryDefeated);
  }
  if (typeof currentMatchPostCarryDeployed !== 'undefined' && currentMatchPostCarryDeployed) {
    data.postCarryDeployedNames = Array.from(currentMatchPostCarryDeployed);
  }
  if (typeof currentMatchPostCarryFainted !== 'undefined' && currentMatchPostCarryFainted) {
    data.postCarryFaintedNames = Array.from(currentMatchPostCarryFainted);
  }
  activeAiBattleData = data;
  if (typeof updateLiveAiAssistantUI === 'function') {
    updateLiveAiAssistantUI(data);
  }
  const prevLive = (typeof liveBattleOpponent !== 'undefined') ? liveBattleOpponent : null;
  const incomingHasSpecificUrl = /\/(?:battle\/(?:trainer|gym)|npc)\/\d+/i.test(String(data.battleUrl || ''));
  const cleanIncomingTrainer = String(data.trainerName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanPrevTrainer = prevLive ? String(prevLive.trainerName || prevLive.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const sameLiveTrainer = Boolean(prevLive && cleanIncomingTrainer && cleanPrevTrainer && cleanIncomingTrainer === cleanPrevTrainer);
  const resolvedNpcId = data.npcId || (sameLiveTrainer && !incomingHasSpecificUrl ? prevLive.npcId : null);
  const prevHasSpecificUrl = Boolean(prevLive && /\/(?:battle\/(?:trainer|gym)|npc)\/\d+/i.test(String(prevLive.battleUrl || '')));
  const resolvedBattleUrl = incomingHasSpecificUrl
    ? data.battleUrl
    : (sameLiveTrainer && prevHasSpecificUrl ? prevLive.battleUrl : (data.battleUrl || '/battle/live'));
  const incomingRoster = Array.isArray(data.roster) ? data.roster : [];
  const isPostOrOutcome = Boolean(data.isVictoryScreen || data.isPostBattleScreen || data.isDefeatScreen);
  const resolvedRoster = incomingRoster.length > 0
    ? incomingRoster
    : (sameLiveTrainer && isPostOrOutcome && Array.isArray(prevLive.roster) && prevLive.roster.length > 0
      ? prevLive.roster
      : incomingRoster);
  liveBattleOpponent = {
    name: data.trainerName || 'Challenger',
    trainerName: data.trainerName || 'Challenger',
    trainerTitle: data.trainerTitle || data.trainerName || 'Challenger',
    roster: resolvedRoster,
    battleUrl: resolvedBattleUrl,
    npcId: resolvedNpcId,
    isProfileStalk: !!data.isProfileStalk,
    isManualCheck: !!data.isManualCheck
  };
  if (resolvedBattleUrl && resolvedBattleUrl !== '/battle/live' && !lastSelectedBattleUrl) {
    lastSelectedBattleUrl = resolvedBattleUrl;
  }
  const oppSig = `${data.trainerName}:${resolvedBattleUrl || ''}:${resolvedRoster.map(p => p.name).join(',')}`;
  const isNewOpponent = (lastLoggedBattleOpponentSig !== oppSig);
  if (isNewOpponent) {
    lastLoggedBattleOpponentSig = oppSig;
    currentMatchItemCount = 0;
    lastTurnActionType = null;
    backendLog('BATTLE_DETECTOR', `Opponent detected: ${data.trainerName} (${resolvedRoster.length} Pokemon)`);
  }
  if (data.hasFullRestore || (typeof data.fullRestoreCount === 'number' && data.fullRestoreCount > 0)) {
    backendLog('BATTLE_ITEM', `Full Restore sensor: count=${data.fullRestoreCount}, usable=${data.hasFullRestore}, hasUseBtn=${data.hasUseItemBtn}`);
  }

  // Empirical Battle EXP Telemetry Ingestion
  if (data.isVictoryScreen && data.gainedExpPerPoke > 0) {
    handleBattleExpCalibrated(data);
  }

  // Auto-learn into gymLeadersData and persist to gym_leaders.json
  const curBattleUrl = ((resolvedBattleUrl && resolvedBattleUrl !== '/battle/live') ? resolvedBattleUrl : (data.battleUrl || (delugeView && typeof delugeView.getURL === 'function' ? delugeView.getURL() : '') || '')).toLowerCase();
  const isNpcBattle = /\/battle\/(?:trainer|gym)(?:\/|\?|$)|\/npc\//i.test(curBattleUrl);

  if (gymLeadersData && data.trainerName && !data.isProfileStalk && isNpcBattle) {
    const matchedTrainers = [];
    const cleanSearchName = data.trainerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let dataNpcId = resolvedNpcId ? String(resolvedNpcId) : null;
    if (!dataNpcId && curBattleUrl) {
      const mId = curBattleUrl.match(/\/(?:battle\/(?:trainer|gym)|npc)\/(\d+)/i);
      if (mId) dataNpcId = mId[1];
    }

    // Priority 1: Match by npcId or battleUrl across all groups and regions
    for (const key of Object.keys(gymLeadersData)) {
      const group = gymLeadersData[key];
      if (!Array.isArray(group)) continue;
      const found = group.filter(t => {
        return (dataNpcId && (String(t.npcId) === dataNpcId || (t.battleUrl && t.battleUrl.endsWith('/' + dataNpcId)))) ||
               (t.battleUrl && curBattleUrl && curBattleUrl.includes(t.battleUrl.toLowerCase()));
      });
      if (found.length > 0) matchedTrainers.push(...found);
    }

    // Priority 2: Fallback to matching by trainer name across all groups and regions
    if (matchedTrainers.length === 0) {
      for (const key of Object.keys(gymLeadersData)) {
        const group = gymLeadersData[key];
        if (!Array.isArray(group)) continue;
        const found = group.filter(t => {
          const cName = (t.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return cName === cleanSearchName;
        });
        if (found.length > 0) matchedTrainers.push(...found);
      }
    }

    if (matchedTrainers.length > 0 && liveBattleOpponent) {
      const bestMatch = matchedTrainers[0];
      const hasSpecificLiveUrl = /\/(?:battle\/(?:trainer|gym)|npc)\/\d+/i.test(String(liveBattleOpponent.battleUrl || ''));
      if (!liveBattleOpponent.npcId && bestMatch.npcId) {
        liveBattleOpponent.npcId = bestMatch.npcId;
      }
      if (!hasSpecificLiveUrl) {
        if (bestMatch.battleUrl && /\/(?:battle\/(?:trainer|gym)|npc)\/\d+/i.test(bestMatch.battleUrl)) {
          liveBattleOpponent.battleUrl = bestMatch.battleUrl;
        } else if (bestMatch.npcId) {
          liveBattleOpponent.battleUrl = `/battle/trainer/${bestMatch.npcId}`;
        }
      }
    }

    if (matchedTrainers.length > 0 && !data.isVictoryScreen) {
      let anyUpdated = false;

      const formatIncomingMoves = (mList) => {
        if (!Array.isArray(mList) || mList.length === 0) return [];
        const out = [];
        for (const m of mList) {
          const rawName = typeof m === 'string' ? m : (m && m.name ? m.name : '');
          if (!rawName) continue;
          let cleanName = rawName.replace(/\s+(?:and\s+dealt|and\s+it\s+was|and\s+missed|but\s+it\s+missed|and\s+restored|and\s+fainted|and\s+critical|and\s+it\s+had).*$/i, '').trim();
          cleanName = cleanName.replace(/\s+on\s+[A-Za-z0-9\s'-]+$/i, '').trim();
          if (!cleanName || cleanName.toLowerCase().startsWith('max potion')) continue;
          const resolved = (teamEngine && typeof teamEngine.resolveMove === 'function')
            ? teamEngine.resolveMove(cleanName)
            : null;
          const mType = (resolved && resolved.type) || (typeof m === 'object' && m.type ? m.type : 'Normal');
          out.push({
            name: (resolved && resolved.name) || cleanName,
            type: mType,
            power: (resolved && resolved.power) || 40,
            category: (resolved && resolved.category) || 'Physical'
          });
        }
        return out;
      };

      for (const targetTrainer of matchedTrainers) {
        if (!Array.isArray(targetTrainer.roster)) targetTrainer.roster = [];
        let updated = false;

        if (Array.isArray(data.roster) && data.roster.length > 0) {
          if (data.isPreparationScreen) {
            // Authoritative server roster synchronization on pre-battle screen
            const syncedRoster = [];
            for (let i = 0; i < data.roster.length; i++) {
              const incPoke = data.roster[i];
              if (!incPoke || !incPoke.name) continue;
              const incMoves = formatIncomingMoves(incPoke.moves);
              const incTypes = incPoke.types && incPoke.types.length > 0 ? incPoke.types : null;
              let existing = targetTrainer.roster.find(p => p.name.toLowerCase() === incPoke.name.toLowerCase());

              if (existing) {
                if (incMoves.length > 0) {
                  existing.moves = existing.moves || [];
                  const existingMoveNames = existing.moves.map(m => (m && m.name ? m.name : m).toLowerCase());
                  for (const nm of incMoves) {
                    if (!existingMoveNames.includes(nm.name.toLowerCase())) {
                      existing.moves.push(nm);
                      existingMoveNames.push(nm.name.toLowerCase());
                      updated = true;
                    }
                  }
                  existing.knownMoveTypes = Array.from(new Set(existing.moves.map(m => m.type).filter(Boolean)));
                }
                if (incPoke.level && existing.level !== incPoke.level) {
                  existing.level = incPoke.level;
                  updated = true;
                }
                if (incTypes && (!existing.types || existing.types.length === 0 || (existing.types.length === 1 && existing.types[0] === 'Normal' && incTypes[0] !== 'Normal'))) {
                  existing.types = incTypes;
                  updated = true;
                }
                if (incPoke.sprite && existing.sprite !== incPoke.sprite) {
                  existing.sprite = incPoke.sprite;
                  updated = true;
                }
                syncedRoster.push(existing);
              } else {
                syncedRoster.push({
                  name: incPoke.name,
                  types: incTypes || ['Normal'],
                  level: incPoke.level || targetTrainer.avgLevel || 50,
                  hp: incPoke.hp || 100,
                  maxHp: incPoke.maxHp || 100,
                  isFainted: false,
                  sprite: incPoke.sprite || '',
                  moves: incMoves,
                  knownMoveTypes: Array.from(new Set(incMoves.map(m => m.type).filter(Boolean)))
                });
                updated = true;
              }
            }
            if (syncedRoster.length > 0 && (syncedRoster.length !== targetTrainer.roster.length || updated)) {
              targetTrainer.roster = syncedRoster;
              updated = true;
            }
          } else {
            // Mid-battle turn: only update existing species in targetTrainer.roster
            for (let i = 0; i < data.roster.length; i++) {
              const incPoke = data.roster[i];
              if (!incPoke || !incPoke.name) continue;
              let existing = targetTrainer.roster.find(p => p.name.toLowerCase() === incPoke.name.toLowerCase());
              if (existing) {
                const incMoves = formatIncomingMoves(incPoke.moves);
                if (incMoves.length > 0) {
                  existing.moves = existing.moves || [];
                  const existingMoveNames = existing.moves.map(m => (m && m.name ? m.name : m).toLowerCase());
                  let moveAdded = false;
                  for (const nm of incMoves) {
                    if (!existingMoveNames.includes(nm.name.toLowerCase())) {
                      existing.moves.push(nm);
                      existingMoveNames.push(nm.name.toLowerCase());
                      moveAdded = true;
                    }
                  }
                  if (moveAdded) {
                    existing.knownMoveTypes = Array.from(new Set(existing.moves.map(m => m.type).filter(Boolean)));
                    updated = true;
                  }
                }
                if (incPoke.sprite && !existing.sprite) {
                  existing.sprite = incPoke.sprite;
                  updated = true;
                }
              }
            }
          }
        }
        if (updated) anyUpdated = true;
      }

      if (anyUpdated) {
        try {
          const gymPath = getWritableDataPath('gym_leaders.json');
          fs.writeFileSync(gymPath, JSON.stringify(gymLeadersData, null, 2), 'utf8');
          const devGymPath = path.join(__dirname, 'gym_leaders.json');
          if (devGymPath !== gymPath && fs.existsSync(devGymPath)) {
            fs.writeFileSync(devGymPath, JSON.stringify(gymLeadersData, null, 2), 'utf8');
          }
          const primaryTrainer = matchedTrainers[0];
          backendLog('ROSTER_HARVESTER', `Updated ${primaryTrainer.name} roster attacks & data (${primaryTrainer.roster.length}/6 known)`);
          populateGymTrainerSelect();
          if (teamTrainerSelect && teamTrainerSelect.value && primaryTrainer) {
            const curVal = teamTrainerSelect.value;
            if (curVal.includes(cleanSearchName) || (primaryTrainer.npcId && curVal.includes(String(primaryTrainer.npcId)))) {
              if (typeof buildAndRenderTeam === 'function') {
                buildAndRenderTeam();
              }
            }
          }
        } catch (e) {
          backendLog('ROSTER_HARVESTER', `Failed saving roster: ${e.message}`);
        }
      }
    }
  }

  if (!teamTrainerSelect) return;

  if (!data.isProfileStalk) {
    const prevSelectedVal = teamTrainerSelect.value;
    let liveGroup = document.getElementById('optgroup-live-battle');
    if (!liveGroup) {
      liveGroup = document.createElement('optgroup');
      liveGroup.id = 'optgroup-live-battle';
      liveGroup.label = 'CURRENT BATTLE (LIVE DETECTED)';
      teamTrainerSelect.insertBefore(liveGroup, teamTrainerSelect.firstChild);
    }
    let opt = (typeof liveGroup.querySelector === 'function')
      ? liveGroup.querySelector('option[value="LIVE__BATTLE"]')
      : (Array.isArray(liveGroup.children) ? liveGroup.children.find(c => c && c.value === 'LIVE__BATTLE') : null);
    if (!opt) {
      opt = document.createElement('option');
      opt.value = 'LIVE__BATTLE';
      liveGroup.appendChild(opt);
    }
    opt.textContent = `${data.trainerTitle || data.trainerName} (${resolvedRoster.length} Pokemon)`;

    const hasSelectOption = (val) => {
      if (!val) return false;
      if (typeof teamTrainerSelect.querySelector === 'function') {
        return Boolean(teamTrainerSelect.querySelector(`option[value="${val}"]`));
      }
      if (teamTrainerSelect.options && typeof teamTrainerSelect.options.length === 'number') {
        for (let i = 0; i < teamTrainerSelect.options.length; i++) {
          if (teamTrainerSelect.options[i] && teamTrainerSelect.options[i].value === val) return true;
        }
        return false;
      }
      return true;
    };

    // Respect the user's selected opponent; never hijack a chosen trainer to LIVE__BATTLE
    if (prevSelectedVal && hasSelectOption(prevSelectedVal)) {
      if (teamTrainerSelect.value !== prevSelectedVal) {
        teamTrainerSelect.value = prevSelectedVal;
      }
    } else {
      const savedTrainerVal = (typeof config !== 'undefined' && config && config.settings && config.settings.lastSelectedTrainer)
        ? config.settings.lastSelectedTrainer
        : '';
      if (savedTrainerVal && hasSelectOption(savedTrainerVal)) {
        teamTrainerSelect.value = savedTrainerVal;
      } else {
        teamTrainerSelect.value = 'LIVE__BATTLE';
      }
    }
  }

  // Only populate the PvP LIVE OPPONENT card when user explicitly clicked "Check Active Screen"
  if (data.isManualCheck) {
    activePvpTargetType = 'LIVE';
    if (typeof updateLiveChallengerUI === 'function') {
      updateLiveChallengerUI(liveBattleOpponent);
    }
    if (teamBattleMode === 'PVP') {
      if (pvpStrategy !== 'COUNTERS') {
        pvpStrategy = 'COUNTERS';
        if (pvpStrategySelect) pvpStrategySelect.value = 'COUNTERS';
        updatePvpBuildButtonLabel();
      }
      resetTeamPrompt();
    }
  }
}
