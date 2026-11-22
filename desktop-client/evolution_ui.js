// evolution_ui.js - Evolution, Moves & Monte Carlo Decision Maker UI (Extracted from app.js)

function renderEvolutionChoicesGrid() {
  return '';
}

function handleEvolveMoveSelection(card) {
  let pName = (card.targetPokemon || card.fullName || '').trim();
  const isInvalidModalName = !pName || /^(pokemon|evolving\s*pokemon|close\s*evolve|evolve|close|cancel|submit)$/i.test(pName);
  if (isInvalidModalName && selectedEvoPoke) {
    pName = (selectedEvoPoke.bestBranch && (selectedEvoPoke.bestBranch.fullName || selectedEvoPoke.bestBranch.name)) || selectedEvoPoke.name || '';
  } else if (!card.isChangeAttackPage && selectedEvoPoke && selectedEvoPoke.name && pName.toLowerCase() === selectedEvoPoke.name.toLowerCase() && selectedEvoPoke.bestBranch) {
    pName = selectedEvoPoke.bestBranch.fullName || selectedEvoPoke.bestBranch.name || pName;
  }
  if (!pName || /^(close\s*evolve|evolve|close|cancel|submit)$/i.test(pName)) {
    pName = (card.sourcePokemon && !/^(close\s*evolve|evolve|close|cancel|submit)$/i.test(card.sourcePokemon.trim()))
      ? card.sourcePokemon.trim()
      : 'Pokemon';
  }
  if ((!card.level || card.level === 50) && selectedEvoPoke && selectedEvoPoke.level) {
    card.level = selectedEvoPoke.level;
  }
  const availableMoves = Array.isArray(card.availableMoves) ? card.availableMoves : [];

  const evalResult = (evolutionEngine && evolutionEngine.evaluateEvolutionMoveSelection)
    ? evolutionEngine.evaluateEvolutionMoveSelection(pName, {
        currentMoves: card.currentChoices || [],
        evolutionMoves: card.evolutionChoices || []
      }, currentCollection)
    : { recommendedMoves: [], dropMoves: [], slotOrder: [], types: [] };

  card.recommendedMoves = evalResult.recommendedMoves;
  card.dropMoves = evalResult.dropMoves;
  card.slotOrder = evalResult.slotOrder;
  if (evalResult.types && evalResult.types.length > 0) card.types = evalResult.types;

  if (selectedEvoPoke && selectedEvoPoke.bestBranch) {
    selectedEvoPoke.bestBranch.moveAnalysis = evalResult;
  }

  // 1. Update AI Assistant Header Badges
  if (aiBattleOpponentBadge) {
    aiBattleOpponentBadge.textContent = card.isChangeAttackPage ? `Change Moves: ${pName}` : `Evolve Moves: ${pName}`;
    aiBattleOpponentBadge.style.color = '#388bfd';
  }
  if (aiStatusChip) {
    aiStatusChip.textContent = card.isChangeAttackPage ? 'Optimal Relearner Moves' : 'Move Advisor Active';
    aiStatusChip.style.color = '#10b981';
  }

  // 2. Render Tactical Briefing Card
  if (aiTacticalBriefing) {
    const renderMoveItem = (mName) => {
      const isDup = (evalResult.duplicateChoices || []).some(d => d.toLowerCase() === mName.toLowerCase());
      const isRecommended = (evalResult.recommendedMoves || []).some(m => m.name.toLowerCase() === mName.toLowerCase());
      const dupBadge = isDup ? ' <span style="color: #d29922; font-weight: 700; font-size: 7.5px;">[DUP]</span>' : '';
      const checkIcon = isRecommended ? ' <span style="color: #10b981; font-weight: 700; font-size: 8px;">&#10003;</span>' : '';
      return `<div style="font-size: 9px; color: ${isRecommended ? '#e0ecfa' : '#8eaad0'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 1.5px 0;">&bull; ${escapeHtml(mName)}${checkIcon}${dupBadge}</div>`;
    };

    let choicesGridHtml = '';
    const curList = evalResult.currentChoices || card.currentChoices || [];
    const evoList = evalResult.evolutionChoices || card.evolutionChoices || [];
    if (curList.length > 0 || evoList.length > 0) {
      choicesGridHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 4px 0; background: #070e1a; border: 1px solid #1a283e; border-radius: 4px; padding: 4px 6px;">
          <div>
            <div style="font-size: 8px; font-weight: 700; color: #8eaad0; text-transform: uppercase; margin-bottom: 2px;">CURRENT (${curList.length})</div>
            ${curList.map(renderMoveItem).join('')}
          </div>
          <div>
            <div style="font-size: 8px; font-weight: 700; color: #388bfd; text-transform: uppercase; margin-bottom: 2px;">EVOLUTION (${evoList.length})</div>
            ${evoList.map(renderMoveItem).join('')}
          </div>
        </div>
        ${(evalResult.duplicateChoices && evalResult.duplicateChoices.length > 0) ? `<div style="font-size: 8.5px; color: #d29922; margin-bottom: 4px; font-weight: 600;">&#9888; Duplicate: ${escapeHtml(evalResult.duplicateChoices.join(', '))} (tick 1 checkbox in form)</div>` : ''}
      `;
    }

    let recListHtml = '';
    evalResult.recommendedMoves.forEach((m, idx) => {
      recListHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-top: 1px solid #1a283e;">
          <div style="font-size: 10px; font-weight: 600; color: #e0ecfa;">
            <span style="color: #388bfd; font-weight: 700; margin-right: 4px;">[Slot ${idx + 1}]</span>
            ${escapeHtml(m.name)}
            <span style="font-size: 9px; color: #8eaad0; margin-left: 3px;">(${escapeHtml(m.type)}) [${m.power} Pwr]</span>
          </div>
          <div>
            ${m.isStab ? '<span style="font-size: 8px; font-weight: 700; color: #10b981; padding: 1px 3px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 2px;">STAB</span>' : ''}
          </div>
        </div>
      `;
    });

    let dropListHtml = '';
    if (evalResult.dropMoves && evalResult.dropMoves.length > 0) {
      dropListHtml = `
        <div style="font-size: 8.5px; font-weight: 700; color: #f87171; text-transform: uppercase; margin-top: 5px; margin-bottom: 2px;">ATTACKS TO DROP / UNCHECK</div>
        ${evalResult.dropMoves.map(d => `
          <div style="font-size: 9px; color: #f87171; padding: 1px 0;">
            <span style="font-weight: 700;">&times; Uncheck: ${escapeHtml(d.name)}</span>
            <span style="color: #8eaad0; font-size: 8px; margin-left: 4px;">(${escapeHtml(d.reason || 'weaker move')})</span>
          </div>
        `).join('')}
      `;
    }

    const typeStr = (card.types && card.types.length > 0) ? card.types.join('/') : 'Normal';

    aiTacticalBriefing.innerHTML = `
      <div style="background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px; padding: 6px 8px; box-shadow: none !important;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 700; color: #e0ecfa;">${escapeHtml(pName)}</span>
          <span style="font-size: 9.5px; color: #8eaad0;">Lv ${card.level || 50} &bull; <span style="color: #388bfd; font-weight: 600;">${escapeHtml(typeStr)}</span></span>
        </div>
        ${choicesGridHtml}
        <div style="font-size: 8.5px; font-weight: 700; color: #566e96; text-transform: uppercase; margin-top: 4px; margin-bottom: 2px;">RECOMMENDED 4 ATTACKS (SLOTS 1-4)</div>
        ${recListHtml}
        ${dropListHtml}
      </div>
    `;
  }

  // 3. Render Instant Action Buttons
  if (typeof syncEvoAutoToggleUI === 'function') {
    syncEvoAutoToggleUI();
  }
  if (aiInstantActionSlot) {
    aiInstantActionSlot.innerHTML = '';

    const autoPickBtn = document.createElement('button');
    autoPickBtn.type = 'button';
    autoPickBtn.id = 'aiAutoSelectMovesBtn';
    autoPickBtn.className = 'btn btn-accent';
    autoPickBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';

    if (card.isChangeAttackPage) {
      autoPickBtn.innerHTML = '&#9876; Auto-Select Best 4 Moves in Game';
      autoPickBtn.addEventListener('click', () => {
        if (delugeView && typeof delugeView.send === 'function') {
          delugeView.send('apply-recommended-moves', {
            recommendedMoves: evalResult.recommendedMoves.map(m => m.name),
            dropMoves: evalResult.dropMoves.map(m => m.name),
            slot1: evalResult.slotOrder[0],
            isChangeAttackPage: true
          });
          updateStatus('Optimal moves applied to DelugeRPG form!', '#238636');
        }
      });
      aiInstantActionSlot.appendChild(autoPickBtn);
    } else {
      const defaultBtnHtml = '&#9876; Apply Best 4 Moves & Confirm Evolve';
      const recNames = (evalResult.recommendedMoves || []).map(m => m.name);
      const dropNamesPayload = (evalResult.dropMoves || []).map(m => m.name);
      const slot1Name = evalResult.slotOrder ? evalResult.slotOrder[0] : null;
      autoPickBtn.innerHTML = defaultBtnHtml;
      autoPickBtn.addEventListener('click', () => {
        if (delugeView && typeof delugeView.send === 'function') {
          if (typeof startAutoEvolveCycle === 'function' && (!activeAutoEvolveCycle || !activeAutoEvolveCycle.active)) {
            startAutoEvolveCycle({
              pokemonId: (selectedEvoPoke && selectedEvoPoke.id) || null,
              name: pName,
              targetBranch: pName,
              level: card.level || 100
            });
          }
          if (typeof activeAutoEvolveCycle !== 'undefined' && activeAutoEvolveCycle && activeAutoEvolveCycle.active) {
            activeAutoEvolveCycle.awaitingPostConfirm = true;
            activeAutoEvolveCycle.expectedEvolvedName = pName;
            activeAutoEvolveCycle.targetBranch = pName;
          }
          autoPickBtn.innerHTML = '&#9203; Applying Moves & Evolving...';
          autoPickBtn.disabled = true;
          delugeView.send('apply-recommended-moves-and-submit', {
            recommendedMoves: recNames,
            dropMoves: dropNamesPayload,
            slot1: slot1Name
          });
          updateStatus('Optimal moves applied & confirming evolve!', '#10b981');
          if (typeof setTimeout === 'function') {
            setTimeout(() => {
              if (autoPickBtn && autoPickBtn.isConnected && autoPickBtn.disabled) {
                autoPickBtn.disabled = false;
                autoPickBtn.innerHTML = defaultBtnHtml;
              }
            }, 3800);
          }
        }
      });
      aiInstantActionSlot.appendChild(autoPickBtn);

      if (typeof activeAutoEvolveCycle !== 'undefined' && activeAutoEvolveCycle && activeAutoEvolveCycle.active) {
        const autoMatches = (typeof matchesAutoEvolveCyclePokemon === 'function') &&
          (matchesAutoEvolveCyclePokemon(pName, selectedEvoPoke && selectedEvoPoke.id) || matchesAutoEvolveCyclePokemon(card.sourcePokemon, null));
        if (typeof isEvoAutoEnabled === 'function' && !isEvoAutoEnabled()) {
          if (typeof stopAutoEvolveCycle === 'function') stopAutoEvolveCycle('Auto disabled');
        } else if (!autoMatches) {
          if (typeof stopAutoEvolveCycle === 'function') stopAutoEvolveCycle('Different Pokemon move modal');
        } else if (typeof scheduleAutoEvolveStep === 'function') {
          activeAutoEvolveCycle.expectedEvolvedName = pName;
          activeAutoEvolveCycle.targetBranch = pName;
          const stepSig = `moves:${pName}:${recNames.join(',')}`;
          const delayMs = 600 + Math.floor(Math.random() * 350);
          scheduleAutoEvolveStep(stepSig, delayMs, () => {
            if (!delugeView || typeof delugeView.send !== 'function') return;
            activeAutoEvolveCycle.awaitingPostConfirm = true;
            autoPickBtn.innerHTML = '&#9203; Auto-Applying Moves &amp; Evolving...';
            autoPickBtn.disabled = true;
            delugeView.send('apply-recommended-moves-and-submit', {
              recommendedMoves: recNames,
              dropMoves: dropNamesPayload,
              slot1: slot1Name
            });
            if (typeof updateStatus === 'function') {
              updateStatus(`Auto-Evolve: Applying optimal moves for ${pName}...`, '#10b981');
            }
            if (typeof setTimeout === 'function') {
              setTimeout(() => {
                if (autoPickBtn && autoPickBtn.isConnected && autoPickBtn.disabled) {
                  autoPickBtn.disabled = false;
                  autoPickBtn.innerHTML = defaultBtnHtml;
                }
              }, 4200);
            }
          });
        }
      }
    }
  }

  // 4. Post to AI Chat Stream only ONCE per unique evolve modal signature
  const evolveSig = `${pName}:${(evalResult.recommendedMoves || []).map(m => m.name).join(',')}:${(evalResult.dropMoves || []).map(m => m.name).join(',')}`;
  if (lastAnnouncedEvolveSignature !== evolveSig) {
    lastAnnouncedEvolveSignature = evolveSig;
    const topNames = evalResult.recommendedMoves.map(m => m.name).join(', ');
    const dropNames = evalResult.dropMoves.map(m => m.name).join(', ');
    const dropReason = evalResult.dropMoves.length > 0 ? ` (drop ${evalResult.dropMoves.map(m => `${m.name}: ${m.reason}`).join('; ')})` : '';
    const msg = `Move Recommendation for ${pName}: Keep [${topNames}], and uncheck [${dropNames}]${dropReason}. Put ${evalResult.slotOrder[0] || 'primary attack'} in Slot 1.`;
    appendAiChatMessage('AI', msg);
  }
}

const disregardedEvoPokeIds = new Set();
const disregardedEvoPokeNames = new Set();

let activeAutoEvolveCycle = null;
let autoEvolveStepTimer = null;
let autoEvolvePostConfirmTimer = null;

function getEvoAutoCheckEl() {
  if (typeof evoAutoCheck !== 'undefined' && evoAutoCheck) return evoAutoCheck;
  if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
    return document.getElementById('evoAutoCheck');
  }
  return null;
}

function getEvoAutoLabelEl() {
  if (typeof evoAutoLabel !== 'undefined' && evoAutoLabel) return evoAutoLabel;
  if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
    return document.getElementById('evoAutoLabel');
  }
  return null;
}

function isEvoAutoEnabled() {
  if (typeof isUnlockChallengeActive !== 'undefined' && isUnlockChallengeActive) return false;
  if (typeof isCaptchaAlarmActive !== 'undefined' && isCaptchaAlarmActive) return false;
  const chk = getEvoAutoCheckEl();
  return Boolean(chk && chk.checked);
}

function syncEvoAutoToggleUI() {
  const lbl = getEvoAutoLabelEl();
  const chk = getEvoAutoCheckEl();
  const isModalActive = Boolean(typeof activeEvolveCardData !== 'undefined' && activeEvolveCardData && activeEvolveCardData.isOpen && !activeEvolveCardData.isChangeAttackPage);
  const filterMode = (typeof currentEvoFilter === 'string') ? currentEvoFilter : 'UNIQUE';
  const showAuto = Boolean(isModalActive || filterMode === 'UNIQUE');
  if (lbl && lbl.style) {
    lbl.style.display = showAuto ? 'flex' : 'none';
    const checked = Boolean(chk && chk.checked);
    lbl.style.borderColor = checked ? '#388bfd' : '#1a283e';
    lbl.style.color = checked ? '#58a6ff' : '#8eaad0';
  }
}

function normalizeEvoCycleName(name) {
  return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function stopAutoEvolveCycle(reason) {
  if (autoEvolveStepTimer) {
    if (typeof clearTimeout === 'function') clearTimeout(autoEvolveStepTimer);
    autoEvolveStepTimer = null;
  }
  if (autoEvolvePostConfirmTimer) {
    if (typeof clearTimeout === 'function') clearTimeout(autoEvolvePostConfirmTimer);
    autoEvolvePostConfirmTimer = null;
  }
  activeAutoEvolveCycle = null;
}

function startAutoEvolveCycle(info) {
  if (!isEvoAutoEnabled()) {
    stopAutoEvolveCycle('Auto disabled');
    return false;
  }
  stopAutoEvolveCycle();
  activeAutoEvolveCycle = {
    active: true,
    pokemonId: info && info.pokemonId ? String(info.pokemonId) : null,
    currentName: String((info && info.name) || '').trim(),
    targetBranch: String((info && info.targetBranch) || '').trim(),
    level: (info && typeof info.level === 'number') ? info.level : 100,
    startedAt: Date.now(),
    stepCount: 0,
    maxSteps: 12,
    lastStepSig: '',
    awaitingPostConfirm: false,
    expectedEvolvedName: ''
  };
  return true;
}

function matchesAutoEvolveCyclePokemon(candidateName, candidateId) {
  if (!activeAutoEvolveCycle || !activeAutoEvolveCycle.active) return false;
  if (Date.now() - (activeAutoEvolveCycle.startedAt || 0) > 90000 || (activeAutoEvolveCycle.stepCount || 0) >= (activeAutoEvolveCycle.maxSteps || 12)) {
    stopAutoEvolveCycle('Cycle safety limit reached');
    return false;
  }
  if (activeAutoEvolveCycle.pokemonId && candidateId && String(activeAutoEvolveCycle.pokemonId) === String(candidateId)) {
    return true;
  }
  const cand = normalizeEvoCycleName(candidateName);
  if (!cand) return false;
  const candNoParen = cand.replace(/\s*\([^)]*\)/g, '').trim();
  const targets = [
    activeAutoEvolveCycle.currentName,
    activeAutoEvolveCycle.targetBranch,
    activeAutoEvolveCycle.expectedEvolvedName
  ];
  for (let i = 0; i < targets.length; i++) {
    const t = normalizeEvoCycleName(targets[i]);
    if (!t) continue;
    if (cand === t) return true;
    const tNoParen = t.replace(/\s*\([^)]*\)/g, '').trim();
    if ((cand.includes('(') !== t.includes('(')) && candNoParen && candNoParen === tNoParen) {
      return true;
    }
  }
  return false;
}

function scheduleAutoEvolveStep(stepSig, delayMs, fn) {
  if (!activeAutoEvolveCycle || !activeAutoEvolveCycle.active || !isEvoAutoEnabled()) return false;
  if (stepSig && activeAutoEvolveCycle.lastStepSig === stepSig) return false;
  if ((activeAutoEvolveCycle.stepCount || 0) >= (activeAutoEvolveCycle.maxSteps || 12)) {
    stopAutoEvolveCycle('Max steps reached');
    return false;
  }
  if (autoEvolveStepTimer) {
    if (typeof clearTimeout === 'function') clearTimeout(autoEvolveStepTimer);
    autoEvolveStepTimer = null;
  }
  activeAutoEvolveCycle.stepCount = (activeAutoEvolveCycle.stepCount || 0) + 1;
  activeAutoEvolveCycle.lastStepSig = stepSig || '';
  if (typeof setTimeout === 'function') {
    autoEvolveStepTimer = setTimeout(() => {
      autoEvolveStepTimer = null;
      if (!activeAutoEvolveCycle || !activeAutoEvolveCycle.active || !isEvoAutoEnabled()) return;
      fn();
    }, delayMs);
    return true;
  }
  return false;
}

function continueAutoEvolveAfterFullPageConfirm() {
  if (!activeAutoEvolveCycle || !activeAutoEvolveCycle.active || !activeAutoEvolveCycle.awaitingPostConfirm) return;
  if (!isEvoAutoEnabled()) {
    stopAutoEvolveCycle('Auto disabled');
    return;
  }
  if (typeof activeEvolveCardData !== 'undefined' && activeEvolveCardData && activeEvolveCardData.isOpen) return;

  activeAutoEvolveCycle.awaitingPostConfirm = false;
  const cycleId = activeAutoEvolveCycle.pokemonId;
  const fallbackName = String(activeAutoEvolveCycle.expectedEvolvedName || activeAutoEvolveCycle.targetBranch || '').trim();
  const prevNameLower = normalizeEvoCycleName(activeAutoEvolveCycle.currentName);
  let evolvedEntry = null;
  if (Array.isArray(currentCollection)) {
    if (cycleId) {
      evolvedEntry = currentCollection.find(p => p && p.id && String(p.id) === String(cycleId)) || null;
    }
    if (evolvedEntry && fallbackName && normalizeEvoCycleName(evolvedEntry.name) === prevNameLower && normalizeEvoCycleName(fallbackName) !== prevNameLower) {
      evolvedEntry.name = fallbackName;
      if (evolutionEngine && typeof evolutionEngine.resolvePokemonTypes === 'function') {
        evolvedEntry.types = evolutionEngine.resolvePokemonTypes(fallbackName, currentCollection);
      }
      evolvedEntry.canEvolve = undefined;
      try {
        fs.writeFileSync(getWritableDataPath('user_collection.json'), JSON.stringify(currentCollection, null, 2), 'utf8');
      } catch (_) {}
      if (typeof syncUserCollectionToGuest === 'function') syncUserCollectionToGuest();
      if (typeof refreshCandidateListsCache === 'function') refreshCandidateListsCache({ resetCursors: false });
      if (typeof updateRosterModeUI === 'function') updateRosterModeUI();
    }
  }
  const evolvedName = (evolvedEntry && evolvedEntry.name) ? evolvedEntry.name : fallbackName;
  const evolvedLevel = (evolvedEntry && typeof evolvedEntry.level === 'number') ? evolvedEntry.level : (activeAutoEvolveCycle.level || 100);
  if (typeof renderEvolutionDecisionMakerUI === 'function') {
    renderEvolutionDecisionMakerUI({ skipActiveCardReentry: true });
  }
  const evolvedNameLower = evolvedName.toLowerCase().trim();
  const refreshedMatch = (cycleId && Array.isArray(cachedEvolveReadyList))
    ? cachedEvolveReadyList.find(p => p && String(p.id) === String(cycleId) && String(p.name || '').toLowerCase().trim() === evolvedNameLower)
    : null;

  const allowableNextBranch = (typeof findAllowableNextEvolutionBranch === 'function')
    ? findAllowableNextEvolutionBranch(evolvedEntry && evolvedEntry.id, evolvedName, evolvedLevel, refreshedMatch, false)
    : null;

  if (!allowableNextBranch) {
    stopAutoEvolveCycle('Cycle complete');
    if (typeof updateStatus === 'function' && evolvedName) {
      updateStatus(`Auto-Evolve complete: ${evolvedName}`, '#10b981');
    }
    return;
  }

  const nextTarget = allowableNextBranch.fullName || allowableNextBranch.name;
  activeAutoEvolveCycle.currentName = evolvedName;
  activeAutoEvolveCycle.targetBranch = nextTarget;
  activeAutoEvolveCycle.expectedEvolvedName = '';
  activeAutoEvolveCycle.level = evolvedLevel;
  const stepSig = `postconfirm:${cycleId || evolvedName}:${nextTarget}`;
  scheduleAutoEvolveStep(stepSig, 450 + Math.floor(Math.random() * 250), () => {
    if (typeof delugeView !== 'undefined' && delugeView && typeof delugeView.send === 'function') {
      delugeView.send('trigger-evolve-pokemon', {
        pokemonId: cycleId || (evolvedEntry && evolvedEntry.id) || null,
        name: evolvedName,
        level: evolvedLevel,
        types: evolvedEntry && evolvedEntry.types,
        variant: evolvedEntry && evolvedEntry.variant,
        targetBranch: nextTarget,
        closeModalFirst: false,
        managedByHostAuto: true
      });
      if (typeof updateStatus === 'function') {
        updateStatus(`Auto-Evolve: Continuing ${evolvedName} -> ${nextTarget}...`, '#388bfd');
      }
    }
  });
}

function handleEvoAutoCycleNavigation(url) {
  if (!activeAutoEvolveCycle || !activeAutoEvolveCycle.active) return;
  try {
    const u = String(url || '');
    const p = u.startsWith('/') ? u.toLowerCase() : new URL(u, 'https://www.delugerpg.com').pathname.toLowerCase();
    if (!p.startsWith('/pokemon')) {
      stopAutoEvolveCycle('Left Pokemon page');
    }
  } catch (_) {
    stopAutoEvolveCycle('Left Pokemon page');
  }
}

function handleEvoAutoCyclePageLoaded(url) {
  if (!activeAutoEvolveCycle || !activeAutoEvolveCycle.active || !activeAutoEvolveCycle.awaitingPostConfirm) return;
  if (!isEvoAutoEnabled()) {
    stopAutoEvolveCycle('Auto disabled');
    return;
  }
  try {
    const u = String(url || '');
    const p = u.startsWith('/') ? u.toLowerCase() : new URL(u, 'https://www.delugerpg.com').pathname.toLowerCase();
    if (p.startsWith('/pokemon') && p.indexOf('/evolve') === -1) {
      if (autoEvolvePostConfirmTimer) {
        if (typeof clearTimeout === 'function') clearTimeout(autoEvolvePostConfirmTimer);
        autoEvolvePostConfirmTimer = null;
      }
      if (typeof setTimeout === 'function') {
        autoEvolvePostConfirmTimer = setTimeout(() => {
          autoEvolvePostConfirmTimer = null;
          continueAutoEvolveAfterFullPageConfirm();
        }, 500);
      }
    }
  } catch (_) {}
}

function handleEvoAutoCyclePageSynced(livePokemons) {
  if (!activeAutoEvolveCycle || !activeAutoEvolveCycle.active || !activeAutoEvolveCycle.awaitingPostConfirm) return;
  if (!Array.isArray(livePokemons) || livePokemons.length === 0) return;
  const cid = activeAutoEvolveCycle.pokemonId;
  const matched = cid ? livePokemons.find(p => p && p.id && String(p.id) === String(cid)) : null;
  if (!matched) return;
  const prevLower = normalizeEvoCycleName(activeAutoEvolveCycle.currentName);
  const liveLower = normalizeEvoCycleName(matched.name);
  if (liveLower && liveLower !== prevLower) {
    activeAutoEvolveCycle.expectedEvolvedName = matched.name;
    if (typeof matched.level === 'number') activeAutoEvolveCycle.level = matched.level;
    if (autoEvolvePostConfirmTimer) {
      if (typeof clearTimeout === 'function') clearTimeout(autoEvolvePostConfirmTimer);
      autoEvolvePostConfirmTimer = null;
    }
    if (typeof setTimeout === 'function') {
      autoEvolvePostConfirmTimer = setTimeout(() => {
        autoEvolvePostConfirmTimer = null;
        continueAutoEvolveAfterFullPageConfirm();
      }, 350);
    }
  }
}

function cleanEvolveOptionLabel(rawText) {
  return String(rawText || '')
    .replace(/\s*\((?:at\s+level\s+\d+|using\b|trade\b|holding\b|with\b|during\b|when\b|if\s+|level\s*up\b|happiness\b|friendship\b|daytime\b|nighttime\b|rain\b|high\b|low\b|(?:male|female)\s+only\b)[^)]*(?:\)|$)\s*/ig, ' ')
    .replace(/\b(?:at\s+level\s+\d+|using\s+[\w\s\-]+|trade\s+[\w\s\-]+|holding\s+[\w\s\-]+|during\s+[\w\s\-]+|when\s+[\w\s\-]+).*$/i, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function evaluateModalOptionOwnership(opt, normCardVariant) {
  const optRaw = (opt && (opt.fullName || opt.name)) || '';
  const cleanOptName = cleanEvolveOptionLabel(optRaw);
  const fullTargetName = (normCardVariant !== 'Normal' && !cleanOptName.toLowerCase().startsWith(normCardVariant.toLowerCase() + ' '))
    ? `${normCardVariant} ${cleanOptName}`
    : cleanOptName;
  const own = evolutionEngine ? evolutionEngine.checkEvolutionOwnership(fullTargetName, currentCollection, normCardVariant) : { isOwned: false };
  const isMegaOpt = /\bMega\s+/i.test(cleanOptName);
  const isGmaxOpt = /\bG-Max\b/i.test(cleanOptName);
  const requiresGmaxChallenge = Boolean((opt && opt.requiresGmaxChallenge) || isGmaxOpt || /g[- ]?max\s*challenge/i.test(String((opt && opt.requirement) || '')));
  const isBranchMega = isMegaOpt && /\b[XY]\b/i.test(cleanOptName);
  const isTargetOwnedByBox = isBranchMega ? Boolean(own.hasExactOwned) : (isMegaOpt ? Boolean(own.hasMegaOwned || own.hasExactOwned) : (isGmaxOpt ? Boolean(own.hasGmaxOwned || own.hasExactOwned) : Boolean(own.hasExactOwned)));
  const isTargetOwned = Boolean((opt && (opt.hasCaughtIcon || opt.isOwned)) || isTargetOwnedByBox);
  return { cleanOptName, fullTargetName, own, isMegaOpt, isGmaxOpt, requiresGmaxChallenge, isTargetOwned };
}

function getNextAllowableEvolvePokemon(excludeInfo) {
  if (!Array.isArray(cachedEvolveReadyList) || cachedEvolveReadyList.length === 0) return null;
  const exId = excludeInfo && excludeInfo.id ? String(excludeInfo.id) : '';
  const exName = excludeInfo && excludeInfo.name ? String(excludeInfo.name).toLowerCase().trim() : '';

  const isAllowableItem = (p) => {
    if (!p || !p.hasUnique || p.isBlockedForGmax || p.status === 'DISREGARDED') return false;
    const pId = p.id ? String(p.id) : '';
    const pName = (p.name || '').toLowerCase().trim();
    if (exId && pId && pId === exId) return false;
    if (exName && pName && pName === exName) return false;
    if (pId && typeof disregardedEvoPokeIds !== 'undefined' && disregardedEvoPokeIds.has(pId)) return false;
    if (pName && typeof disregardedEvoPokeNames !== 'undefined' && disregardedEvoPokeNames.has(pName)) return false;
    const targetBranch = p.bestBranch || (Array.isArray(p.branches) ? p.branches.find(b => b && !b.isDuplicate && !/\bg-?max\b/i.test(b.fullName || b.name || '')) : null);
    if (!targetBranch || targetBranch.isDuplicate) return false;
    const targetLabel = targetBranch.fullName || targetBranch.name || '';
    if (!targetLabel || /\bg-?max\b/i.test(targetLabel)) return false;
    return true;
  };

  const candidates = cachedEvolveReadyList.filter(isAllowableItem);
  if (candidates.length === 0) return null;

  const searchQ = (typeof currentEvoSearch === 'string' && currentEvoSearch.trim()) ? currentEvoSearch.trim().toLowerCase() : '';
  if (searchQ) {
    const matchedSearch = candidates.find(p => {
      const pName = (p.name || '').toLowerCase();
      const bName = ((p.bestBranch && (p.bestBranch.fullName || p.bestBranch.name)) || '').toLowerCase();
      return pName.includes(searchQ) || bName.includes(searchQ);
    });
    if (matchedSearch) return matchedSearch;
  }
  return candidates[0];
}

function findAllowableNextEvolutionBranch(evolvedPokeId, evolvedName, evolvedLevel, refreshedReadyMatch, isGmaxComplete) {
  if (isGmaxComplete || !evolvedName) return null;
  if (refreshedReadyMatch) {
    if (!refreshedReadyMatch.hasUnique || refreshedReadyMatch.isBlockedForGmax) return null;
    const readyBranches = Array.isArray(refreshedReadyMatch.branches)
      ? refreshedReadyMatch.branches
      : (refreshedReadyMatch.bestBranch ? [refreshedReadyMatch.bestBranch] : []);
    return readyBranches.find(b => b && !b.isDuplicate && !/\bg-?max\b/i.test(b.fullName || b.name || '')) || null;
  }
  const nextAnalysis = (typeof aiAssistant !== 'undefined' && aiAssistant && typeof aiAssistant.analyzeEvolutionPath === 'function')
    ? aiAssistant.analyzeEvolutionPath(evolvedName, currentCollection)
    : null;
  if (!nextAnalysis || nextAnalysis.isBlockedForGmax || nextAnalysis.requiresGmaxChallenge || !Array.isArray(nextAnalysis.branches)) {
    return null;
  }
  return nextAnalysis.branches.find(b => {
    if (!b || b.isDuplicate) return false;
    const bLabel = String(b.fullName || b.name || '');
    if (/\bg-?max\b/i.test(bLabel)) return false;
    const isActualMega = /\b(?:Mega|Primal)\s+/i.test(bLabel);
    const reqLvl = isActualMega ? 100 : (b.minLevel || 1);
    return (evolvedLevel || 100) >= reqLvl;
  }) || null;
}

function wireNextAllowableEvolveButton(actionBtn, nextPoke, opts) {
  const options = opts || {};
  const nextBranch = nextPoke.bestBranch || (Array.isArray(nextPoke.branches) ? nextPoke.branches.find(b => b && !b.isDuplicate && !b.gmax) : null);
  const nextTargetName = (nextBranch && (nextBranch.fullName || nextBranch.name)) || '';
  const prefix = options.prefix || 'Skip &amp; Evolve';
  const defaultHtml = nextTargetName
    ? `&#10140; ${prefix}: ${escapeHtml(nextPoke.name)} &#8594; ${escapeHtml(nextTargetName)}`
    : `&#10140; ${prefix}: ${escapeHtml(nextPoke.name)}`;

  actionBtn.className = 'btn btn-accent';
  actionBtn.disabled = false;
  actionBtn.style.borderColor = '';
  actionBtn.style.color = '';
  actionBtn.style.background = '';
  actionBtn.innerHTML = defaultHtml;
  if (typeof actionBtn.setAttribute === 'function') {
    actionBtn.setAttribute('data-next-evo-id', String(nextPoke.id || ''));
    actionBtn.setAttribute('data-next-evo-name', String(nextPoke.name || ''));
  }

  actionBtn.addEventListener('click', () => {
    selectedEvoPoke = nextPoke;
    if (evoReadyList) {
      const cards = evoReadyList.querySelectorAll('.evo-item-card');
      cards.forEach(c => {
        const isMatch = c.getAttribute('data-poke-id') === String(nextPoke.id);
        c.style.borderColor = isMatch ? '#388bfd' : '#1a283e';
        c.style.background = isMatch ? '#0c182c' : '#070e1a';
      });
    }
    if (delugeView && typeof delugeView.send === 'function') {
      const autoStarted = (typeof startAutoEvolveCycle === 'function') && startAutoEvolveCycle({
        pokemonId: nextPoke.id,
        name: nextPoke.name,
        targetBranch: nextTargetName,
        level: nextPoke.level
      });
      actionBtn.disabled = true;
      actionBtn.innerHTML = `&#9203; Opening ${escapeHtml(nextPoke.name)}...`;
      delugeView.send('trigger-evolve-pokemon', {
        pokemonId: nextPoke.id,
        name: nextPoke.name,
        level: nextPoke.level,
        types: nextPoke.types,
        variant: nextPoke.variant,
        targetBranch: nextTargetName,
        closeModalFirst: Boolean(options.closeModalFirst),
        managedByHostAuto: Boolean(autoStarted)
      });
      if (typeof updateStatus === 'function') {
        updateStatus(`Proceeding to next allowable evolution: ${nextPoke.name}...`, '#388bfd');
      }
      setTimeout(() => {
        if (actionBtn && actionBtn.isConnected && actionBtn.disabled) {
          actionBtn.disabled = false;
          actionBtn.innerHTML = defaultHtml;
        }
      }, 4500);
    }
  });
}

function handleEvolveCardDetected(card) {
  if (!card) return;
  if (handleEvolveCardDetected._active) return;
  handleEvolveCardDetected._active = true;
  try {
    return handleEvolveCardDetectedImpl(card);
  } finally {
    handleEvolveCardDetected._active = false;
  }
}

function handleEvolveCardDetectedImpl(card) {
  // If active battle is taking place on a battle screen, battle intel has precedence
  const curUrl = (delugeView && delugeView.getURL && delugeView.getURL()) ? delugeView.getURL().toLowerCase() : '';
  const isActuallyInBattle = (curUrl.indexOf('/battle') !== -1 || curUrl.indexOf('/challenge') !== -1) &&
                             activeAiBattleData && activeAiBattleData.isInActiveBattle &&
                             !activeAiBattleData.isVictoryScreen && !activeAiBattleData.isDefeatScreen && !activeAiBattleData.isPostBattleScreen;
  if (isActuallyInBattle) {
    return;
  }
  activeAiBattleData = null;
  activeEvolveCardData = card;

  // CASE 0: Evolution Complete (Success Screen)
  if (card.isComplete) {
    const sanitizeEvoName = (s) => String(s || '')
      .split(/[\r\n]+/)[0]
      .replace(/^(?:evolve|close)\s+/i, '')
      .replace(/\s+(?:close|ok|continue)$/i, '')
      .replace(/[!.\s]+$/, '')
      .trim();
    const fromNameClean = sanitizeEvoName(card.fromPokemon || '');
    const evolvedName = sanitizeEvoName(card.toPokemon || card.fullName || '');
    const fromLower = (fromNameClean || (selectedEvoPoke && selectedEvoPoke.name) || '').toLowerCase().trim();

    if (aiBattleOpponentBadge) {
      aiBattleOpponentBadge.textContent = 'Evolution Complete';
      aiBattleOpponentBadge.style.color = '#10b981';
    }
    if (aiStatusChip) {
      aiStatusChip.textContent = 'Success';
      aiStatusChip.style.color = '#10b981';
    }
    if (aiTacticalBriefing) {
      aiTacticalBriefing.innerHTML = `
        <div style="background: #0e1b30; border: 1px solid #10b981; border-radius: 4px; padding: 8px; text-align: center; box-shadow: none !important;">
          <div style="font-size: 12px; font-weight: 700; color: #10b981; margin-bottom: 3px;">
            &#10003; ${escapeHtml(card.message || 'Evolution Complete!')}
          </div>
          <div style="font-size: 9.5px; color: #8eaad0;">
            ${escapeHtml(fromNameClean || '')} &#8594; <strong style="color: #e0ecfa;">${escapeHtml(evolvedName)}</strong>
          </div>
        </div>
      `;
    }

    const selMatchesFrom = Boolean(
      selectedEvoPoke && selectedEvoPoke.id &&
      (!fromLower || String(selectedEvoPoke.name || '').toLowerCase().trim() === fromLower)
    );
    let pIdx = -1;
    if (Array.isArray(currentCollection)) {
      if (selMatchesFrom) {
        pIdx = currentCollection.findIndex(p => p && p.id && String(p.id) === String(selectedEvoPoke.id));
      }
      if (pIdx === -1 && fromLower) {
        pIdx = currentCollection.findIndex(p => p && (p.name || '').toLowerCase().trim() === fromLower);
      }
    }
    let evolvedLevel = (pIdx !== -1 && typeof currentCollection[pIdx].level === 'number')
      ? currentCollection[pIdx].level
      : ((selMatchesFrom && selectedEvoPoke.level) || card.level || 100);
    const evolvedPokeId = (pIdx !== -1 && currentCollection[pIdx] && currentCollection[pIdx].id)
      ? currentCollection[pIdx].id
      : (selMatchesFrom ? selectedEvoPoke.id : null);

    if (pIdx !== -1 && evolvedName) {
      currentCollection[pIdx].name = evolvedName;
      if (evolutionEngine && typeof evolutionEngine.resolvePokemonTypes === 'function') {
        currentCollection[pIdx].types = evolutionEngine.resolvePokemonTypes(evolvedName, currentCollection);
      }
      currentCollection[pIdx].canEvolve = undefined;
      try {
        fs.writeFileSync(getWritableDataPath('user_collection.json'), JSON.stringify(currentCollection, null, 2), 'utf8');
      } catch (_) {}
      if (typeof syncUserCollectionToGuest === 'function') syncUserCollectionToGuest();
      if (typeof refreshCandidateListsCache === 'function') {
        refreshCandidateListsCache({ resetCursors: false });
      }
      candidateListsCache.gmaxLastDisplayedId = null;
      if (typeof updateRosterModeUI === 'function') {
        updateRosterModeUI();
      }
    }
    if (typeof renderEvolutionDecisionMakerUI === 'function') {
      renderEvolutionDecisionMakerUI({ skipActiveCardReentry: true });
    }
    const evolvedNameLower = evolvedName.toLowerCase().trim();
    const refreshedReadyMatch = (evolvedPokeId && Array.isArray(cachedEvolveReadyList))
      ? cachedEvolveReadyList.find(p => p && String(p.id) === String(evolvedPokeId) && String(p.name || '').toLowerCase().trim() === evolvedNameLower)
      : null;
    if (refreshedReadyMatch) {
      selectedEvoPoke = refreshedReadyMatch;
    } else if (selMatchesFrom && pIdx !== -1 && currentCollection[pIdx]) {
      selectedEvoPoke = currentCollection[pIdx];
    }

    const allowableNextBranch = findAllowableNextEvolutionBranch(evolvedPokeId, evolvedName, evolvedLevel, refreshedReadyMatch, card.isGmax);
    const canEvolveFurther = Boolean(allowableNextBranch);

    if (aiInstantActionSlot) {
      aiInstantActionSlot.innerHTML = '';
      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'btn btn-accent';
      actionBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';

      if (card.isGmax) {
        actionBtn.innerHTML = '&#128506; Return to Map';
        actionBtn.addEventListener('click', () => {
          activeEvolveCardData = null;
          if (delugeView && typeof delugeView.loadURL === 'function') {
            delugeView.loadURL('https://www.delugerpg.com/map').catch(() => {});
          }
          renderEvolutionDecisionMakerUI();
        });
      } else if (canEvolveFurther) {
        actionBtn.innerHTML = `&#129516; Proceed to Evolve into ${escapeHtml(allowableNextBranch.fullName || allowableNextBranch.name)}`;
        actionBtn.addEventListener('click', () => {
          if (delugeView) {
            const nextTarget = allowableNextBranch.fullName || allowableNextBranch.name;
            const autoStarted = (typeof startAutoEvolveCycle === 'function') && startAutoEvolveCycle({
              pokemonId: evolvedPokeId || null,
              name: evolvedName,
              targetBranch: nextTarget,
              level: evolvedLevel
            });
            actionBtn.disabled = true;
            delugeView.send('trigger-evolve-pokemon', {
              pokemonId: evolvedPokeId || null,
              name: evolvedName,
              level: evolvedLevel,
              targetBranch: nextTarget,
              closeModalFirst: true,
              managedByHostAuto: Boolean(autoStarted)
            });
          }
          renderEvolutionDecisionMakerUI({ skipActiveCardReentry: true });
        });
      } else {
        const nextAllowable = getNextAllowableEvolvePokemon({
          id: evolvedPokeId,
          name: evolvedName
        });
        if (nextAllowable) {
          wireNextAllowableEvolveButton(actionBtn, nextAllowable, { prefix: 'Next Allowable', closeModalFirst: true });
        } else {
          actionBtn.innerHTML = '&#10003; Evolution Complete (Close Modal)';
          actionBtn.addEventListener('click', () => {
            activeEvolveCardData = null;
            if (delugeView) {
              delugeView.send('close-modal-and-refresh');
            }
            renderEvolutionDecisionMakerUI();
          });
        }
      }
      aiInstantActionSlot.appendChild(actionBtn);

      if (typeof syncEvoAutoToggleUI === 'function') syncEvoAutoToggleUI();
      if (typeof activeAutoEvolveCycle !== 'undefined' && activeAutoEvolveCycle && activeAutoEvolveCycle.active) {
        if (typeof autoEvolvePostConfirmTimer !== 'undefined' && autoEvolvePostConfirmTimer) {
          if (typeof clearTimeout === 'function') clearTimeout(autoEvolvePostConfirmTimer);
          autoEvolvePostConfirmTimer = null;
        }
        activeAutoEvolveCycle.awaitingPostConfirm = false;
        const matchesCycle = (typeof matchesAutoEvolveCyclePokemon === 'function') &&
          (matchesAutoEvolveCyclePokemon(evolvedName, evolvedPokeId) || matchesAutoEvolveCyclePokemon(fromNameClean, evolvedPokeId));
        if (card.isGmax || (typeof isEvoAutoEnabled === 'function' && !isEvoAutoEnabled()) || !canEvolveFurther) {
          if (typeof stopAutoEvolveCycle === 'function') stopAutoEvolveCycle('Single-Pokemon cycle complete');
          if (typeof updateStatus === 'function' && evolvedName) {
            updateStatus(`Auto-Evolve complete: ${evolvedName}`, '#10b981');
          }
        } else if (!matchesCycle) {
          if (typeof stopAutoEvolveCycle === 'function') stopAutoEvolveCycle('Unrelated completion modal');
        } else if (typeof scheduleAutoEvolveStep === 'function') {
          const nextTarget = allowableNextBranch.fullName || allowableNextBranch.name;
          if (evolvedPokeId && !activeAutoEvolveCycle.pokemonId) {
            activeAutoEvolveCycle.pokemonId = String(evolvedPokeId);
          }
          activeAutoEvolveCycle.currentName = evolvedName;
          activeAutoEvolveCycle.targetBranch = nextTarget;
          activeAutoEvolveCycle.expectedEvolvedName = '';
          activeAutoEvolveCycle.level = evolvedLevel;
          const stepSig = `complete-next:${evolvedName}->${nextTarget}`;
          const delayMs = 650 + Math.floor(Math.random() * 350);
          scheduleAutoEvolveStep(stepSig, delayMs, () => {
            if (!delugeView || typeof delugeView.send !== 'function') return;
            actionBtn.disabled = true;
            actionBtn.innerHTML = `&#9203; Auto-Advancing to ${escapeHtml(nextTarget)}...`;
            delugeView.send('trigger-evolve-pokemon', {
              pokemonId: evolvedPokeId || null,
              name: evolvedName,
              level: evolvedLevel,
              targetBranch: nextTarget,
              closeModalFirst: true,
              managedByHostAuto: true
            });
            if (typeof updateStatus === 'function') {
              updateStatus(`Auto-Evolve: Continuing ${evolvedName} -> ${nextTarget}...`, '#388bfd');
            }
          });
        }
      }
    }
    return;
  }

  if (card.isMoveSelection) {
    if (!selectedEvoPoke && Array.isArray(cachedEvolveReadyList) && cachedEvolveReadyList.length > 0) {
      const cTarget = (card.targetPokemon || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedPoke = cachedEvolveReadyList.find(p => {
        const pClean = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return pClean === cTarget || cTarget.includes(pClean) || pClean.includes(cTarget);
      });
      if (matchedPoke) selectedEvoPoke = matchedPoke;
    }
    handleEvolveMoveSelection(card);
    return;
  }

  const rawName = card.fullName || '';
  const species = card.baseSpecies || (getBaseSpecies ? getBaseSpecies(rawName) : rawName);
  const resolvedTypes = (card.types && card.types.length > 0)
    ? card.types
    : (evolutionEngine && evolutionEngine.resolvePokemonTypes ? evolutionEngine.resolvePokemonTypes(card.fullName || species, currentCollection) : ['Normal']);
  card.types = resolvedTypes;

  const rawCardVariant = String(card.variant || (rawName && (rawName.match(/^(Normal|Shiny|Metallic|Ghostly|Ghost|Dark|Shadow|Mirage|Retro|Chrome|Negative)\s+/i) || ['', 'Normal'])[1]) || 'Normal').trim();
  const normCardVariant = (rawCardVariant.toLowerCase() === 'ghost') ? 'Ghostly' : (rawCardVariant.charAt(0).toUpperCase() + rawCardVariant.slice(1).toLowerCase());

  // If DelugeRPG jumped straight from move confirmation of selectedEvoPoke (e.g. Negative Applin -> Negative Flapple)
  // into the evolved form's modal, update/disregard the prior stage so Next Allowable never loops back to it.
  if (rawName && selectedEvoPoke && selectedEvoPoke.name) {
    const prevNameLower = String(selectedEvoPoke.name).toLowerCase().trim();
    const curNameLower = rawName.toLowerCase().trim();
    const prevBranchName = (selectedEvoPoke.bestBranch && (selectedEvoPoke.bestBranch.fullName || selectedEvoPoke.bestBranch.name) || '').toLowerCase().trim();
    if (prevNameLower && curNameLower !== prevNameLower && prevBranchName && (curNameLower === prevBranchName || curNameLower.endsWith(' ' + prevBranchName) || prevBranchName.endsWith(' ' + curNameLower))) {
      if (selectedEvoPoke.id) disregardedEvoPokeIds.add(String(selectedEvoPoke.id));
      disregardedEvoPokeNames.add(prevNameLower);
      if (Array.isArray(currentCollection)) {
        const prevIdx = currentCollection.findIndex(p => (selectedEvoPoke.id && String(p.id) === String(selectedEvoPoke.id)) || (p.name || '').toLowerCase().trim() === prevNameLower);
        if (prevIdx !== -1) {
          currentCollection[prevIdx].name = rawName;
          if (evolutionEngine && typeof evolutionEngine.resolvePokemonTypes === 'function') {
            currentCollection[prevIdx].types = evolutionEngine.resolvePokemonTypes(rawName, currentCollection);
          }
          currentCollection[prevIdx].canEvolve = undefined;
          try {
            fs.writeFileSync(getWritableDataPath('user_collection.json'), JSON.stringify(currentCollection, null, 2), 'utf8');
          } catch (_) {}
          if (typeof syncUserCollectionToGuest === 'function') syncUserCollectionToGuest();
        }
      }
      if (typeof renderEvolutionDecisionMakerUI === 'function') {
        renderEvolutionDecisionMakerUI({ skipActiveCardReentry: true });
      }
    }
  }

  let matchedReadyId = null;
  if (Array.isArray(cachedEvolveReadyList) && cachedEvolveReadyList.length > 0 && rawName) {
    const cLower = rawName.toLowerCase().trim();
    const matchedReady = cachedEvolveReadyList.find(p => (p.name || '').toLowerCase().trim() === cLower);
    if (matchedReady) {
      matchedReadyId = matchedReady.id ? String(matchedReady.id) : null;
      selectedEvoPoke = matchedReady;
      if (evoReadyList) {
        const itemCards = evoReadyList.querySelectorAll('.evo-item-card');
        itemCards.forEach(el => {
          const isMatch = el.getAttribute('data-poke-id') === String(matchedReady.id);
          el.style.background = isMatch ? '#0c182c' : '#070e1a';
          el.style.borderColor = isMatch ? '#388bfd' : '#1a283e';
        });
      }
    }
  }

  const evoAnalysis = aiAssistant ? aiAssistant.analyzeEvolutionPath(card.fullName || species, currentCollection) : null;
  let bestBranch = evoAnalysis ? evoAnalysis.bestBranch : null;
  if (Array.isArray(card.options) && card.options.length > 0 && evoAnalysis && Array.isArray(evoAnalysis.branches)) {
    const modalMatchedBranches = evoAnalysis.branches.filter(b => card.options.some(opt => {
      const oRaw = (opt.fullName || opt.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const bFull = (b.fullName || b.name || '').toLowerCase();
      return oRaw === bFull || oRaw === bName || oRaw.endsWith(' ' + bName);
    }));
    if (modalMatchedBranches.length > 0) {
      bestBranch = modalMatchedBranches[0];
    }
  }
  const bestBranchName = bestBranch ? (bestBranch.fullName || bestBranch.name) : '';

  const gmaxPrereq = (evolutionEngine && typeof evolutionEngine.checkGmaxPrerequisite === 'function')
    ? evolutionEngine.checkGmaxPrerequisite(card.fullName || species, currentCollection, normCardVariant)
    : { isBlockedForGmax: false };

  const evaluatedOpts = (Array.isArray(card.options) ? card.options : []).map(opt => Object.assign({ opt }, evaluateModalOptionOwnership(opt, normCardVariant)));
  const isModalOptionOwned = (opt) => Boolean(opt && evaluateModalOptionOwnership(opt, normCardVariant).isTargetOwned);
  const directOpts = evaluatedOpts.filter(e => !e.requiresGmaxChallenge);
  const gmaxOpts = evaluatedOpts.filter(e => e.requiresGmaxChallenge);
  const hasGmaxModalOption = gmaxOpts.length > 0;
  const hasUnownedGmaxOpt = gmaxOpts.some(e => !e.isTargetOwned);
  const isGmaxChallengeOnly = Boolean(card.isGmaxChallengeOnly || (evaluatedOpts.length > 0 && directOpts.length === 0));
  const isBlockedForGmax = Boolean(card.isBlockedForGmax || gmaxPrereq.isBlockedForGmax || (evoAnalysis && evoAnalysis.isBlockedForGmax));
  const gmaxTarget = card.gmaxTarget || (gmaxOpts[0] && gmaxOpts[0].fullTargetName) || gmaxPrereq.gmaxTarget || (evoAnalysis && evoAnalysis.gmaxTarget) || 'G-Max Form';
  const allModalDuplicates = !card.isLevelLocked && evaluatedOpts.length > 0 && evaluatedOpts.every(e => e.isTargetOwned);
  const allDirectDuplicates = !card.isLevelLocked && directOpts.length > 0 && directOpts.every(e => e.isTargetOwned);
  const hasAllowableDirectEvolution = !card.isLevelLocked && !isBlockedForGmax && !isGmaxChallengeOnly && !allModalDuplicates && !allDirectDuplicates && directOpts.some(e => !e.isTargetOwned);

  // Automatically disregard Pokemon from Evolve-Ready box list when the modal confirms no allowable direct evolution
  if (!hasAllowableDirectEvolution && rawName) {
    const cLower = rawName.toLowerCase().trim();
    const matchedInList = Array.isArray(cachedEvolveReadyList)
      ? cachedEvolveReadyList.find(p => (p.name || '').toLowerCase().trim() === cLower)
      : null;
    let listChanged = false;
    if (matchedInList && matchedInList.id && !disregardedEvoPokeIds.has(String(matchedInList.id))) {
      disregardedEvoPokeIds.add(String(matchedInList.id));
      listChanged = Boolean(matchedInList.hasUnique);
    } else if (!matchedInList && !disregardedEvoPokeNames.has(cLower)) {
      disregardedEvoPokeNames.add(cLower);
    }
    if (listChanged && typeof renderEvolutionDecisionMakerUI === 'function') {
      renderEvolutionDecisionMakerUI({ skipActiveCardReentry: true });
    }
  }

  // 1. Update AI Assistant Panel Header Badges
  if (aiBattleOpponentBadge) {
    if (card.isLevelLocked) {
      aiBattleOpponentBadge.textContent = `Level Locked: ${card.fullName}`;
      aiBattleOpponentBadge.style.color = '#f87171';
    } else if (allModalDuplicates) {
      aiBattleOpponentBadge.textContent = `Already Owned: ${card.fullName}`;
      aiBattleOpponentBadge.style.color = '#f87171';
    } else if (isGmaxChallengeOnly) {
      aiBattleOpponentBadge.textContent = `G-Max Challenge: ${card.fullName}`;
      aiBattleOpponentBadge.style.color = '#fbbf24';
    } else if (isBlockedForGmax) {
      aiBattleOpponentBadge.textContent = `Hold for G-Max: ${card.fullName}`;
      aiBattleOpponentBadge.style.color = '#fbbf24';
    } else if (allDirectDuplicates) {
      aiBattleOpponentBadge.textContent = hasUnownedGmaxOpt ? `G-Max Challenge: ${card.fullName}` : `Already Owned: ${card.fullName}`;
      aiBattleOpponentBadge.style.color = hasUnownedGmaxOpt ? '#fbbf24' : '#f87171';
    } else {
      aiBattleOpponentBadge.textContent = `Evolve: ${card.fullName}`;
      aiBattleOpponentBadge.style.color = '#388bfd';
    }
  }
  if (aiStatusChip) {
    if (card.isLevelLocked) {
      aiStatusChip.textContent = 'Level Locked';
      aiStatusChip.style.color = '#f87171';
    } else if (allModalDuplicates) {
      aiStatusChip.textContent = 'Duplicate Blocked';
      aiStatusChip.style.color = '#f87171';
    } else if (isGmaxChallengeOnly) {
      aiStatusChip.textContent = 'G-Max Challenge Only';
      aiStatusChip.style.color = '#fbbf24';
    } else if (isBlockedForGmax) {
      aiStatusChip.textContent = 'Hold for G-Max';
      aiStatusChip.style.color = '#fbbf24';
    } else if (allDirectDuplicates) {
      aiStatusChip.textContent = hasUnownedGmaxOpt ? 'G-Max Challenge Only' : 'Duplicate Blocked';
      aiStatusChip.style.color = hasUnownedGmaxOpt ? '#fbbf24' : '#f87171';
    } else {
      aiStatusChip.textContent = 'Evolve Intel Active';
      aiStatusChip.style.color = '#10b981';
    }
  }

  // 2. Render Tactical Briefing Card
  if (aiTacticalBriefing) {
    const borderCol = (card.isLevelLocked || allModalDuplicates) ? '#f87171' : ((isGmaxChallengeOnly || isBlockedForGmax) ? '#fbbf24' : '#1a283e');
    let html = `
      <div style="background: #0e1b30; border: 1px solid ${borderCol}; border-radius: 4px; padding: 6px 8px; box-shadow: none !important;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 700; color: #e0ecfa;">${escapeHtml(card.fullName)}</span>
          <span style="font-size: 9.5px; color: #8eaad0;">Lv ${card.level || 50} &bull; <span style="color: #388bfd; font-weight: 600;">${escapeHtml(resolvedTypes.join('/'))}</span></span>
        </div>
    `;

    if (card.isLevelLocked) {
      html += `
        <div style="font-size: 9.5px; font-weight: 700; color: #f87171; padding: 4px 6px; background: rgba(248, 81, 73, 0.12); border: 1px solid rgba(248, 81, 73, 0.3); border-radius: 3px; margin-bottom: 6px;">
          &#9888; LEVEL LOCKED: ${escapeHtml(card.levelLockReason || `This Pokemon must reach level ${card.requiredLevel || 'higher'} to evolve.`)}
        </div>
      `;
    } else if (isGmaxChallengeOnly && !allModalDuplicates) {
      html += `
        <div style="font-size: 9.5px; font-weight: 700; color: #fbbf24; padding: 4px 6px; background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 3px; margin-bottom: 6px;">
          &#9888; G-MAX CHALLENGE REQUIRED: Cannot evolve directly here. Complete G-Max Challenge for ${escapeHtml(gmaxTarget)}.
        </div>
      `;
    } else if (isBlockedForGmax && !allModalDuplicates) {
      html += `
        <div style="font-size: 9.5px; font-weight: 700; color: #fbbf24; padding: 4px 6px; background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 3px; margin-bottom: 6px;">
          &#9888; HOLD FOR G-MAX: Evolving now consumes your base Pokemon before obtaining ${escapeHtml(gmaxTarget)}.
        </div>
      `;
    }

    html += `<div style="font-size: 8.5px; font-weight: 700; color: #566e96; text-transform: uppercase; margin-bottom: 4px;">TARGET EVOLUTIONS</div>`;

    if (isBlockedForGmax && gmaxTarget && !hasGmaxModalOption) {
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-top: 1px solid #1a283e; margin-top: 2px;">
          <div style="font-size: 10px; font-weight: 600; color: #fbbf24;">
            ${escapeHtml(gmaxTarget)}
            <span style="font-size: 9px; color: #8eaad0; margin-left: 3px;">(using G-Max Challenge)</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="font-size: 8.5px; font-weight: 700; color: #fbbf24; padding: 1px 4px; background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 3px;">G-MAX CHALLENGE REQUIRED</span>
          </div>
        </div>
      `;
    }

    if (evaluatedOpts.length > 0) {
      evaluatedOpts.forEach(({ opt, cleanOptName, fullTargetName, own, isMegaOpt, requiresGmaxChallenge, isTargetOwned }) => {
        const optBase = getBaseSpecies ? getBaseSpecies(fullTargetName) : fullTargetName;
        const isBest = !isBlockedForGmax && !requiresGmaxChallenge && !isTargetOwned && Boolean(bestBranchName && (optBase.toLowerCase() === bestBranchName.toLowerCase() || fullTargetName.toLowerCase().includes(bestBranchName.toLowerCase()) || cleanOptName.toLowerCase().includes(bestBranchName.toLowerCase())));

        let badgeHtml = '';
        if (card.isLevelLocked) {
          badgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #f87171; padding: 1px 4px; background: rgba(248, 81, 73, 0.15); border: 1px solid rgba(248, 81, 73, 0.3); border-radius: 3px;">LEVEL LOCKED (Lv ${card.requiredLevel || '?'})</span>`;
        } else if (isTargetOwned) {
          if (isMegaOpt && own.hasMegaOwned) {
            badgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #ff7b72; padding: 1px 4px; background: rgba(248, 81, 73, 0.15); border: 1px solid rgba(248, 81, 73, 0.4); border-radius: 3px;">&#9888; STOP: MEGA OWNED (Lv ${own.bestLevel})</span>`;
          } else if (own && own.bestPoke && own.hasExactOwned) {
            badgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #ff7b72; padding: 1px 4px; background: rgba(248, 81, 73, 0.15); border: 1px solid rgba(248, 81, 73, 0.4); border-radius: 3px;">OWNED (Lv ${own.bestLevel})</span>`;
          } else {
            badgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #ff7b72; padding: 1px 4px; background: rgba(248, 81, 73, 0.15); border: 1px solid rgba(248, 81, 73, 0.4); border-radius: 3px;">ALREADY OWNED</span>`;
          }
        } else if (requiresGmaxChallenge) {
          badgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #fbbf24; padding: 1px 4px; background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 3px;">G-MAX CHALLENGE REQUIRED</span>`;
        } else if (isBlockedForGmax) {
          badgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #8eaad0; padding: 1px 4px; background: rgba(142, 170, 208, 0.1); border: 1px solid rgba(142, 170, 208, 0.25); border-radius: 3px;">BLOCKED (HOLD FOR G-MAX)</span>`;
        } else {
          badgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #10b981; padding: 1px 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 3px;">100% UNIQUE</span>`;
        }

        let metaHtml = '';
        if (isBest) {
          metaHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #388bfd; padding: 1px 4px; background: rgba(56, 139, 253, 0.15); border: 1px solid rgba(56, 139, 253, 0.3); border-radius: 3px; margin-left: 4px;">TOP META PATH</span>`;
        }

        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-top: 1px solid #1a283e; margin-top: 2px;">
            <div style="font-size: 10px; font-weight: 600; color: #e0ecfa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1; margin-right: 6px;">
              ${escapeHtml(cleanOptName)}
              ${opt.requirement ? `<span style="font-size: 8.5px; color: #8eaad0; margin-left: 3px;">(${escapeHtml(opt.requirement)})</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; flex-shrink: 0;">
              ${badgeHtml}
              ${metaHtml}
            </div>
          </div>
        `;
      });
    } else if (!isBlockedForGmax && !card.isLevelLocked) {
      html += `<div style="font-size: 9.5px; color: #8eaad0; padding: 4px 0;">No evolution targets detected</div>`;
    }

    if (card.isLevelLocked) {
      html += `
        <div style="margin-top: 5px; padding: 3px 6px; background: #2a1215; border: 1px solid #f87171; border-radius: 3px; font-size: 9.5px; color: #f87171; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700;">STATUS:</span>
          <span style="font-weight: 700;">Requires Level ${card.requiredLevel || 'Higher'} before Evolving</span>
        </div>
      `;
    } else if ((isGmaxChallengeOnly || isBlockedForGmax) && !allModalDuplicates) {
      html += `
        <div style="margin-top: 5px; padding: 3px 6px; background: #18190c; border: 1px solid #fbbf24; border-radius: 3px; font-size: 9.5px; color: #fbbf24; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700;">RECOMMENDED:</span>
          <span style="font-weight: 700;">Complete G-Max Challenge for ${escapeHtml(gmaxTarget)}</span>
        </div>
      `;
    } else if (bestBranchName && !allModalDuplicates && !allDirectDuplicates) {
      html += `
        <div style="margin-top: 5px; padding: 3px 6px; background: #0b1526; border: 1px solid #1a283e; border-radius: 3px; font-size: 9.5px; color: #8eaad0; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #566e96; font-weight: 700;">RECOMMENDED:</span>
          <span style="color: #388bfd; font-weight: 700;">${escapeHtml(bestBranchName)} (${bestBranch ? bestBranch.types.join('/') : ''})</span>
        </div>
      `;
    }

    html += `</div>`;
    aiTacticalBriefing.innerHTML = html;
  }

  // 3. Render Instant Action Buttons
  if (typeof syncEvoAutoToggleUI === 'function') syncEvoAutoToggleUI();
  if (aiInstantActionSlot) {
    aiInstantActionSlot.innerHTML = '';

    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.id = 'aiEvolveActionBtn';
    actionBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';

    const currentExcludeId = matchedReadyId || (selectedEvoPoke && rawName && String(selectedEvoPoke.name || '').toLowerCase().trim() === rawName.toLowerCase().trim() ? selectedEvoPoke.id : null);
    const nextAllowable = !hasAllowableDirectEvolution
      ? getNextAllowableEvolvePokemon({ id: currentExcludeId, name: rawName })
      : null;

    let activeDirectTargetChoice = null;

    if (!hasAllowableDirectEvolution && nextAllowable) {
      wireNextAllowableEvolveButton(actionBtn, nextAllowable, { prefix: 'Skip &amp; Evolve', closeModalFirst: true });
    } else if (card.isLevelLocked) {
      actionBtn.className = 'btn';
      actionBtn.disabled = true;
      actionBtn.style.borderColor = '#f87171';
      actionBtn.style.color = '#f87171';
      actionBtn.style.background = '#2a1215';
      actionBtn.innerHTML = `&#9888; Level Locked (Requires Lv ${card.requiredLevel || 'Higher'})`;
    } else if (allModalDuplicates) {
      actionBtn.className = 'btn';
      actionBtn.disabled = true;
      actionBtn.style.borderColor = '#f87171';
      actionBtn.style.color = '#f87171';
      actionBtn.style.background = '#2a1215';
      actionBtn.innerHTML = '&#9888; All Evolution Paths Owned (Cannot Proceed)';
    } else if (isGmaxChallengeOnly) {
      actionBtn.className = 'btn';
      actionBtn.disabled = true;
      actionBtn.style.borderColor = '#fbbf24';
      actionBtn.style.color = '#fbbf24';
      actionBtn.style.background = '#2a2012';
      actionBtn.innerHTML = `&#9888; Requires G-Max Challenge (Not Direct Evolve)`;
    } else if (isBlockedForGmax) {
      actionBtn.className = 'btn';
      actionBtn.disabled = true;
      actionBtn.style.borderColor = '#fbbf24';
      actionBtn.style.color = '#fbbf24';
      actionBtn.style.background = '#2a2012';
      actionBtn.innerHTML = `&#9888; Hold for G-Max (${escapeHtml(gmaxTarget)} Not Owned)`;
    } else if (allDirectDuplicates) {
      actionBtn.className = 'btn';
      actionBtn.disabled = true;
      actionBtn.style.borderColor = hasUnownedGmaxOpt ? '#fbbf24' : '#f87171';
      actionBtn.style.color = hasUnownedGmaxOpt ? '#fbbf24' : '#f87171';
      actionBtn.style.background = hasUnownedGmaxOpt ? '#2a2012' : '#2a1215';
      actionBtn.innerHTML = hasUnownedGmaxOpt
        ? '&#9888; Requires G-Max Challenge (Direct Paths Owned)'
        : '&#9888; All Evolution Paths Owned (Cannot Proceed)';
    } else {
      // Multi-branch ranking: Pick strictly from directly evolvable unowned non-G-Max options
      let targetChoice = null;
      const unownedDirect = directOpts.filter(e => !e.isTargetOwned);
      if (unownedDirect.length > 0) {
        if (bestBranchName) {
          const matchedBest = unownedDirect.find(e => {
            const optRaw = (e.fullTargetName || e.cleanOptName || '').toLowerCase();
            const bName = bestBranchName.toLowerCase();
            return optRaw.includes(bName) || bName.includes(optRaw);
          });
          targetChoice = matchedBest ? matchedBest.cleanOptName : unownedDirect[0].cleanOptName;
        } else {
          targetChoice = unownedDirect[0].cleanOptName;
        }
      }
      if (!targetChoice && bestBranchName && !/\bg-?max\b/i.test(bestBranchName)) {
        targetChoice = cleanEvolveOptionLabel(bestBranchName);
      }

      if (!targetChoice || /\bg-?max\b/i.test(targetChoice)) {
        const fallbackNext = getNextAllowableEvolvePokemon({ id: currentExcludeId, name: rawName });
        if (fallbackNext) {
          wireNextAllowableEvolveButton(actionBtn, fallbackNext, { prefix: 'Skip &amp; Evolve', closeModalFirst: true });
        } else {
          actionBtn.className = 'btn';
          actionBtn.disabled = true;
          actionBtn.style.borderColor = '#fbbf24';
          actionBtn.style.color = '#fbbf24';
          actionBtn.style.background = '#2a2012';
          actionBtn.innerHTML = '&#9888; Requires G-Max Challenge (Not Direct Evolve)';
        }
      } else {
        activeDirectTargetChoice = targetChoice;
        const defaultEvolveBtnHtml = `&#129516; Confirm Evolve into ${escapeHtml(targetChoice)}`;
        actionBtn.className = 'btn btn-accent';
        actionBtn.innerHTML = defaultEvolveBtnHtml;
        actionBtn.addEventListener('click', () => {
          if (delugeView) {
            if (typeof startAutoEvolveCycle === 'function') {
              startAutoEvolveCycle({
                pokemonId: currentExcludeId || (selectedEvoPoke && selectedEvoPoke.id) || null,
                name: rawName,
                targetBranch: targetChoice,
                level: card.level || 100
              });
            }
            actionBtn.innerHTML = '&#9203; Submitting Evolution...';
            actionBtn.disabled = true;
            delugeView.send('submit-modal-evolve', { targetBranch: targetChoice });
            updateStatus(`Submitting evolution into ${targetChoice}...`, '#388bfd');
            if (typeof setTimeout === 'function') {
              setTimeout(() => {
                if (actionBtn && actionBtn.isConnected && actionBtn.disabled) {
                  actionBtn.disabled = false;
                  actionBtn.innerHTML = defaultEvolveBtnHtml;
                }
              }, 3200);
            }
          }
        });
      }
    }
    aiInstantActionSlot.appendChild(actionBtn);

    if (typeof activeAutoEvolveCycle !== 'undefined' && activeAutoEvolveCycle && activeAutoEvolveCycle.active) {
      activeAutoEvolveCycle.awaitingPostConfirm = false;
      const branchValid = Boolean(hasAllowableDirectEvolution && activeDirectTargetChoice && !/\bg-?max\b/i.test(activeDirectTargetChoice));
      const matchesCycle = (typeof matchesAutoEvolveCyclePokemon === 'function') && matchesAutoEvolveCyclePokemon(rawName, matchedReadyId);
      if ((typeof isEvoAutoEnabled === 'function' && !isEvoAutoEnabled()) || !branchValid) {
        if (typeof stopAutoEvolveCycle === 'function') stopAutoEvolveCycle('No allowable direct evolution');
      } else if (!matchesCycle) {
        if (typeof stopAutoEvolveCycle === 'function') stopAutoEvolveCycle('Different Pokemon opened');
      } else if (typeof scheduleAutoEvolveStep === 'function') {
        if (matchedReadyId && !activeAutoEvolveCycle.pokemonId) {
          activeAutoEvolveCycle.pokemonId = String(matchedReadyId);
        }
        activeAutoEvolveCycle.currentName = rawName;
        activeAutoEvolveCycle.targetBranch = activeDirectTargetChoice;
        activeAutoEvolveCycle.expectedEvolvedName = '';
        activeAutoEvolveCycle.level = card.level || activeAutoEvolveCycle.level || 100;
        const chosenBranch = activeDirectTargetChoice;
        const stepSig = `branch:${rawName}->${chosenBranch}`;
        const delayMs = 550 + Math.floor(Math.random() * 300);
        scheduleAutoEvolveStep(stepSig, delayMs, () => {
          if (!delugeView || typeof delugeView.send !== 'function') return;
          actionBtn.innerHTML = `&#9203; Auto-Evolving into ${escapeHtml(chosenBranch)}...`;
          actionBtn.disabled = true;
          delugeView.send('submit-modal-evolve', { targetBranch: chosenBranch });
          if (typeof updateStatus === 'function') {
            updateStatus(`Auto-Evolve: Confirming evolution into ${chosenBranch}...`, '#388bfd');
          }
          if (typeof setTimeout === 'function') {
            setTimeout(() => {
              if (actionBtn && actionBtn.isConnected && actionBtn.disabled) {
                actionBtn.disabled = false;
                actionBtn.innerHTML = `&#129516; Confirm Evolve into ${escapeHtml(chosenBranch)}`;
              }
            }, 4200);
          }
        });
      }
    }
  }
}

function clearActiveEvoDecisionPanel(badgeText, chipText, emptyText) {
  if (typeof syncEvoAutoToggleUI === 'function') syncEvoAutoToggleUI();
  if (aiBattleOpponentBadge) {
    aiBattleOpponentBadge.textContent = badgeText || 'No Pending Evolutions';
    aiBattleOpponentBadge.style.color = '#8eaad0';
  }
  if (aiStatusChip) {
    aiStatusChip.textContent = chipText || 'All Clear';
    aiStatusChip.style.color = '#10b981';
  }
  if (aiTacticalBriefing) {
    aiTacticalBriefing.innerHTML = `<div style="color: #8eaad0; text-align: center; padding: 8px 6px; font-size: 10px; font-weight: 600; background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px; box-shadow: none !important;">${escapeHtml(emptyText || 'No evolve-ready Pokemon')}</div>`;
  }
  if (aiInstantActionSlot) {
    aiInstantActionSlot.innerHTML = '';
    if ((typeof currentEvoFilter !== 'string') || currentEvoFilter === 'UNIQUE') {
      const emptyEvoBtn = document.createElement('button');
      emptyEvoBtn.type = 'button';
      emptyEvoBtn.id = 'aiEvolveActionBtn';
      emptyEvoBtn.className = 'btn';
      emptyEvoBtn.disabled = true;
      emptyEvoBtn.title = 'Disabled: No evolve-ready Pokemon available';
      emptyEvoBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';
      emptyEvoBtn.innerHTML = '&#129516; Evolve';
      aiInstantActionSlot.appendChild(emptyEvoBtn);
    }
  }
}

function handleEvolveCardClosed() {
  activeEvolveCardData = null;
  lastAnnouncedEvolveSignature = null;
  if (typeof syncEvoAutoToggleUI === 'function') syncEvoAutoToggleUI();
  if (selectedEvoPoke && (!Array.isArray(cachedEvolveReadyList) || !cachedEvolveReadyList.some(p => p && p.hasUnique && p.id === selectedEvoPoke.id && p.name === selectedEvoPoke.name))) {
    selectedEvoPoke = null;
  }
  const isAiPanelOpen = Boolean(typeof aiAssistantModal !== 'undefined' && aiAssistantModal && aiAssistantModal.style.display === 'flex');
  if (isAiPanelOpen) {
    renderEvolutionDecisionMakerUI();
    if (typeof renderAiAssistantUI === 'function') {
      renderAiAssistantUI();
    }
  }
}

// =============================================================================
// EVOLUTION & ATTACK MOVES DECISION MAKER CONTROLLERS
// =============================================================================

function setEvoFilter(filterType) {
  currentEvoFilter = filterType;
  if (evoFilterUniqueBtn) {
    evoFilterUniqueBtn.className = filterType === 'UNIQUE' ? 'btn btn-accent' : 'btn';
    evoFilterUniqueBtn.style.fontWeight = filterType === 'UNIQUE' ? '700' : '600';
  }
  if (evoFilterMegasBtn) {
    evoFilterMegasBtn.className = filterType === 'MEGAS' ? 'btn btn-accent' : 'btn';
    evoFilterMegasBtn.style.fontWeight = filterType === 'MEGAS' ? '700' : '600';
  }
  if (evoFilterAllBtn) {
    evoFilterAllBtn.className = filterType === 'ALL' ? 'btn btn-accent' : 'btn';
    evoFilterAllBtn.style.fontWeight = filterType === 'ALL' ? '700' : '600';
  }
  if (evoFilterBlockedBtn) {
    evoFilterBlockedBtn.className = filterType === 'BLOCKED' ? 'btn btn-accent' : 'btn';
    evoFilterBlockedBtn.style.fontWeight = filterType === 'BLOCKED' ? '700' : '600';
  }
  if (typeof syncEvoAutoToggleUI === 'function') syncEvoAutoToggleUI();
  renderEvolutionDecisionMakerUI();
}

function refreshEvolveBoxList() {
  disregardedEvoPokeIds.clear();
  disregardedEvoPokeNames.clear();
  loadTeamBuilderData();
  if (delugeView) {
    try {
      delugeView.send('sync-current-pokemon-page');
      delugeView.send('check-evolve-card');
    } catch (_) {}
    if (scanStatusDot) scanStatusDot.style.background = '#388bfd';
    if (scanStatusBadge) {
      scanStatusBadge.style.color = '#388bfd';
      scanStatusBadge.textContent = 'Scanning live box...';
    }
    if (refreshEvoBoxBtn) {
      refreshEvoBoxBtn.disabled = true;
      refreshEvoBoxBtn.innerHTML = '&#9203; Scanning...';
    }
    updateStatus('Scanning and analyzing live DelugeRPG box for evolutions & moves...', '#388bfd');
    delugeView.send('start-scan-pokemon');
    return;
  }
  renderEvolutionDecisionMakerUI();
  updateStatus('Evolve-ready Pokemon box refreshed', '#10b981');
}

function selectEvolvePokemon(poke, branch) {
  if (!poke) return;
  selectedEvoPoke = poke;

  const targetBranch = branch || poke.bestBranch || (poke.branches && poke.branches[0]);
  if (!targetBranch) return;

  const targetName = targetBranch.fullName || targetBranch.name;
  const isDuplicate = Boolean(targetBranch.isDuplicate);

  const openSource = ((activeEvolveCardData && (activeEvolveCardData.sourcePokemon || activeEvolveCardData.fullName)) || '').toLowerCase().trim();
  const openTarget = ((activeEvolveCardData && (activeEvolveCardData.targetPokemon || activeEvolveCardData.fullName)) || '').toLowerCase().trim();
  const pNameLower = (poke.name || '').toLowerCase().trim();
  const branchLower = (targetName || '').toLowerCase().trim();
  const matchesActiveModal = Boolean(activeEvolveCardData && activeEvolveCardData.isOpen && (
    (openSource && (openSource === pNameLower || openSource === branchLower)) ||
    (openTarget && (openTarget === pNameLower || openTarget === branchLower))
  ));

  if (!matchesActiveModal && activeEvolveCardData) {
    activeEvolveCardData = null;
  }

  if (matchesActiveModal && activeEvolveCardData && activeEvolveCardData.isMoveSelection) {
    handleEvolveMoveSelection(activeEvolveCardData);
    return;
  }

  if (matchesActiveModal && activeEvolveCardData && activeEvolveCardData.isOpen && !activeEvolveCardData.isComplete) {
    handleEvolveCardDetected(activeEvolveCardData);
    return;
  }

  if (aiBattleOpponentBadge) {
    if (poke.isBlockedForGmax) {
      aiBattleOpponentBadge.innerHTML = `Hold for G-Max: ${escapeHtml(poke.name)}`;
      aiBattleOpponentBadge.style.color = '#fbbf24';
    } else {
      aiBattleOpponentBadge.innerHTML = escapeHtml(poke.name);
      aiBattleOpponentBadge.style.color = isDuplicate ? '#f87171' : '#10b981';
    }
  }

  if (aiStatusChip) {
    if (poke.isBlockedForGmax) {
      aiStatusChip.textContent = 'Hold for G-Max';
      aiStatusChip.style.color = '#fbbf24';
    } else {
      aiStatusChip.textContent = isDuplicate ? 'Duplicate Blocked' : '100% Unique';
      aiStatusChip.style.color = isDuplicate ? '#f87171' : '#10b981';
    }
  }

  if (aiTacticalBriefing) {
    const liveChoices = (activeEvolveCardData && activeEvolveCardData.isMoveSelection) ? {
        currentMoves: activeEvolveCardData.currentChoices || [],
        evolutionMoves: activeEvolveCardData.evolutionChoices || []
      } : {
        currentMoves: (poke.moves || []).map(m => (typeof m === 'string' ? m : (m && m.name ? m.name : ''))).filter(Boolean),
        evolutionMoves: targetBranch.keyMoves || []
      };

    const moveAnalysis = (activeEvolveCardData && activeEvolveCardData.isMoveSelection)
      ? ((evolutionEngine && typeof evolutionEngine.evaluateEvolutionMoveSelection === 'function')
          ? evolutionEngine.evaluateEvolutionMoveSelection(targetName, liveChoices, currentCollection)
          : { recommendedMoves: [], dropMoves: [], slotOrder: [] })
      : (targetBranch.moveAnalysis || ((evolutionEngine && typeof evolutionEngine.evaluateEvolutionMoveSelection === 'function')
          ? evolutionEngine.evaluateEvolutionMoveSelection(targetName, liveChoices, currentCollection)
          : { recommendedMoves: [], dropMoves: [], slotOrder: [] }));
    targetBranch.moveAnalysis = moveAnalysis;

    let recListHtml = '';
    (moveAnalysis.recommendedMoves || []).forEach((m, idx) => {
      recListHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-top: 1px solid #1a283e;">
          <div style="font-size: 10px; font-weight: 600; color: #e0ecfa;">
            <span style="color: #8eaad0; margin-right: 4px;">${idx + 1}.</span>
            ${escapeHtml(m.name)}
            <span style="font-size: 9px; color: #8eaad0; margin-left: 3px;">(${m.power} Pwr)</span>
          </div>
          <div>
            ${m.isStab ? '<span style="font-size: 8px; font-weight: 700; color: #10b981; padding: 1px 3px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 2px;">STAB</span>' : ''}
          </div>
        </div>
      `;
    });

    const typeStr = (targetBranch.types && targetBranch.types.length > 0) ? targetBranch.types.join('/') : 'Normal';

    let gmaxWarningHtml = '';
    if (poke.isBlockedForGmax) {
      gmaxWarningHtml = `
        <div style="font-size: 9.5px; font-weight: 700; color: #fbbf24; padding: 4px 6px; background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 3px; margin-bottom: 6px;">
          &#9888; HOLD FOR G-MAX: Evolving now consumes your base Pokemon before obtaining ${escapeHtml(poke.gmaxTarget || 'G-Max Form')}.
        </div>
      `;
    }

    aiTacticalBriefing.innerHTML = `
      <div style="background: #0e1b30; border: 1px solid ${poke.isBlockedForGmax ? '#fbbf24' : '#1a283e'}; border-radius: 4px; padding: 6px 8px; box-shadow: none !important;">
        ${gmaxWarningHtml}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          <span style="font-size: 11px; font-weight: 700; color: #e0ecfa;">${escapeHtml(targetName)}</span>
          <span style="font-size: 9.5px; color: #8eaad0;">${targetBranch.bst ? (targetBranch.bst + ' BST &bull; ') : ''}<span style="color: #388bfd; font-weight: 600;">${escapeHtml(typeStr)}</span></span>
        </div>
        ${recListHtml}
      </div>
    `;
  }

  if (aiInstantActionSlot) {
    aiInstantActionSlot.innerHTML = '';

    if (activeEvolveCardData && activeEvolveCardData.isMoveSelection) {
      const applyBtn = document.createElement('button');
      applyBtn.type = 'button';
      applyBtn.className = 'btn btn-accent';
      applyBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';
      applyBtn.innerHTML = '&#9876; Auto-Select Best 4 Moves in Game';
      applyBtn.addEventListener('click', () => {
        const moveAnalysis = targetBranch.moveAnalysis;
        if (delugeView && moveAnalysis) {
          delugeView.send('apply-recommended-moves', {
            recommendedMoves: (moveAnalysis.recommendedMoves || []).map(m => m.name),
            dropMoves: (moveAnalysis.dropMoves || []).map(m => m.name),
            slot1: moveAnalysis.slotOrder ? moveAnalysis.slotOrder[0] : null
          });
          updateStatus('Applied recommended 4 moves to game form!', '#10b981');
        }
      });
      aiInstantActionSlot.appendChild(applyBtn);
    } else {
      const triggerBtn = document.createElement('button');
      triggerBtn.type = 'button';
      triggerBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';

      const isSelectedBlocked = Boolean(poke.isBlockedForGmax || /\bg-?max\b/i.test(targetName) || isDuplicate || !poke.hasUnique);
      const nextAllowableFromSelect = isSelectedBlocked
        ? getNextAllowableEvolvePokemon({ id: poke.id, name: poke.name })
        : null;

      if (isSelectedBlocked && nextAllowableFromSelect) {
        wireNextAllowableEvolveButton(triggerBtn, nextAllowableFromSelect, {
          prefix: 'Next Allowable',
          closeModalFirst: Boolean(activeEvolveCardData && activeEvolveCardData.isOpen)
        });
      } else if (poke.isBlockedForGmax) {
        triggerBtn.className = 'btn';
        triggerBtn.disabled = true;
        triggerBtn.style.borderColor = '#fbbf24';
        triggerBtn.style.color = '#fbbf24';
        triggerBtn.style.background = '#2a2012';
        triggerBtn.innerHTML = `&#9888; Hold for G-Max (${escapeHtml(poke.gmaxTarget || 'G-Max')} Not Owned)`;
      } else if (/\bg-?max\b/i.test(targetName)) {
        triggerBtn.className = 'btn';
        triggerBtn.disabled = true;
        triggerBtn.style.borderColor = '#fbbf24';
        triggerBtn.style.color = '#fbbf24';
        triggerBtn.style.background = '#2a2012';
        triggerBtn.innerHTML = '&#9888; Requires G-Max Challenge (Not Direct Evolve)';
      } else if (isDuplicate || !poke.hasUnique) {
        triggerBtn.className = 'btn';
        triggerBtn.disabled = true;
        triggerBtn.style.borderColor = '#f87171';
        triggerBtn.style.color = '#f87171';
        triggerBtn.style.background = '#2a1215';
        triggerBtn.innerHTML = '&#9888; Evolution Already Owned (Duplicate)';
      } else {
        triggerBtn.className = 'btn btn-accent';
        triggerBtn.innerHTML = `&#129516; Evolve into ${escapeHtml(targetName)}`;
        triggerBtn.addEventListener('click', () => {
          if (delugeView) {
            const autoStarted = (typeof startAutoEvolveCycle === 'function') && startAutoEvolveCycle({
              pokemonId: poke.id,
              name: poke.name,
              targetBranch: targetName,
              level: poke.level
            });
            triggerBtn.disabled = true;
            triggerBtn.innerHTML = '&#9203; Opening Evolve Modal...';
            delugeView.send('trigger-evolve-pokemon', {
              pokemonId: poke.id,
              name: poke.name,
              level: poke.level,
              types: poke.types,
              variant: poke.variant,
              targetBranch: targetName,
              closeModalFirst: Boolean(
                activeEvolveCardData && activeEvolveCardData.isOpen &&
                (activeEvolveCardData.isComplete || (activeEvolveCardData.fullName || '').toLowerCase().trim() !== (poke.name || '').toLowerCase().trim())
              ),
              managedByHostAuto: Boolean(autoStarted)
            });
            updateStatus(`Opening evolve modal for ${poke.name}...`, '#388bfd');
            setTimeout(() => {
              if (triggerBtn && triggerBtn.disabled) {
                triggerBtn.disabled = false;
                triggerBtn.innerHTML = `&#129516; Evolve into ${escapeHtml(targetName)}`;
              }
            }, 6000);
          }
        });
      }
      aiInstantActionSlot.appendChild(triggerBtn);
    }
  }

  // Highlight active item card in list
  if (evoReadyList) {
    const cards = evoReadyList.querySelectorAll('.evo-item-card');
    cards.forEach(c => {
      if (c.getAttribute('data-poke-id') === poke.id) {
        c.style.borderColor = '#388bfd';
        c.style.background = '#0c182c';
      } else {
        c.style.borderColor = '#1a283e';
        c.style.background = '#070e1a';
      }
    });
  }
}

function selectPokemonForMoves(poke) {
  if (!poke) return;
  selectedMegaPoke = poke;
  selectedMovesPoke = poke;

  const isLookup = Boolean(poke.isLookup);
  const flawsCount = poke.moveCritique ? poke.moveCritique.length : 0;
  const isFlawed = poke.moveStatus === 'NEEDS_OPTIMIZATION' || flawsCount > 0;
  const isCanImprove = poke.moveStatus === 'CAN_IMPROVE';

  if (aiBattleOpponentBadge) {
    if (isLookup) {
      aiBattleOpponentBadge.innerHTML = `${escapeHtml(poke.name)} [Strategy Lookup]`;
      aiBattleOpponentBadge.style.color = '#388bfd';
    } else {
      aiBattleOpponentBadge.innerHTML = `${escapeHtml(poke.name)} [Lv ${poke.level || 100}]`;
      aiBattleOpponentBadge.style.color = isFlawed ? '#f87171' : (isCanImprove ? '#d29922' : '#10b981');
    }
  }

  if (aiStatusChip) {
    if (isLookup) {
      aiStatusChip.textContent = 'Species Lookup';
      aiStatusChip.style.color = '#388bfd';
    } else if (isFlawed) {
      aiStatusChip.textContent = 'Flawed Moves';
      aiStatusChip.style.color = '#f87171';
    } else if (isCanImprove) {
      aiStatusChip.textContent = 'Can Improve';
      aiStatusChip.style.color = '#d29922';
    } else {
      aiStatusChip.textContent = 'Optimal Moves';
      aiStatusChip.style.color = '#10b981';
    }
  }

  if (aiTacticalBriefing) {
    let equippedHtml = '';
    if (Array.isArray(poke.currentMoves) && poke.currentMoves.length > 0) {
      poke.currentMoves.forEach((mName, idx) => {
        const flawObj = (poke.moveCritique || []).find(c => c.move.toLowerCase() === mName.toLowerCase());
        const res = teamEngine.resolveMove(mName);
        const isStab = (poke.types || []).some(t => t.toLowerCase() === (res.type || '').toLowerCase());
        const pwr = res.power || 0;
        const flawTag = flawObj
          ? `<span style="font-size: 8px; font-weight: 700; color: #f87171; padding: 1px 3px; background: rgba(248,81,73,0.15); border: 1px solid rgba(248,81,73,0.3); border-radius: 2px;">FLAW</span>`
          : (isStab ? `<span style="font-size: 8px; font-weight: 700; color: #10b981; padding: 1px 3px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); border-radius: 2px;">STAB</span>` : '');

        equippedHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-top: 1px solid #1a283e; font-size: 9.5px;">
            <div style="color: ${flawObj ? '#ff7b72' : '#e0ecfa'}; font-weight: 600;">
              <span style="color: #8eaad0; margin-right: 3px;">[Slot ${idx + 1}]</span>
              ${escapeHtml(mName)}
              <span style="font-size: 8.5px; color: #8eaad0; margin-left: 2px;">(${escapeHtml(res.type || 'Normal')} ${pwr} Pwr)</span>
            </div>
            <div>${flawTag}</div>
          </div>
        `;
      });
    }

    let recListHtml = '';
    (poke.optimalMoves || []).forEach((m, idx) => {
      const isStab = (poke.types || []).some(t => t.toLowerCase() === (m.type || '').toLowerCase());
      recListHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-top: 1px solid #1a283e;">
          <div style="font-size: 10px; font-weight: 600; color: #e0ecfa;">
            <span style="color: #388bfd; font-weight: 700; margin-right: 4px;">[Slot ${idx + 1}]</span>
            ${escapeHtml(m.name)}
            <span style="font-size: 9px; color: #8eaad0; margin-left: 3px;">(${escapeHtml(m.type)}) [${m.power} Pwr]</span>
          </div>
          <div>
            ${isStab ? '<span style="font-size: 8px; font-weight: 700; color: #10b981; padding: 1px 3px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 2px;">STAB</span>' : ''}
          </div>
        </div>
      `;
    });

    const typeStr = (poke.types && poke.types.length > 0) ? poke.types.join('/') : 'Normal';
    const headerSub = isLookup
      ? `<span style="color: #388bfd; font-weight: 600;">${escapeHtml(typeStr)}</span>`
      : `Lv ${poke.level || 100} &bull; <span style="color: #388bfd; font-weight: 600;">${escapeHtml(typeStr)}</span>`;

    const equippedSection = equippedHtml
      ? `<div style="font-size: 8.5px; font-weight: 700; color: #566e96; text-transform: uppercase; margin-bottom: 2px;">CURRENT EQUIPPED MOVES</div>${equippedHtml}`
      : '';

    aiTacticalBriefing.innerHTML = `
      <div style="background: #0e1b30; border: 1px solid #1a283e; border-radius: 4px; padding: 6px 8px; box-shadow: none !important;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 700; color: #e0ecfa;">${escapeHtml(poke.name)}</span>
          <span style="font-size: 9.5px; color: #8eaad0;">${headerSub}</span>
        </div>
        ${equippedSection}
        <div style="font-size: 8.5px; font-weight: 700; color: #566e96; text-transform: uppercase; margin-top: ${equippedHtml ? '5px' : '2px'}; margin-bottom: 2px;">RECOMMENDED 4 ATTACKS</div>
        ${recListHtml}
      </div>
    `;
  }

  if (aiInstantActionSlot) {
    aiInstantActionSlot.innerHTML = '';

    if (activeEvolveCardData && activeEvolveCardData.isMoveSelection) {
      const applyBtn = document.createElement('button');
      applyBtn.type = 'button';
      applyBtn.className = 'btn btn-accent';
      applyBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';
      applyBtn.innerHTML = '&#9876; Auto-Select Best 4 Moves in Game';
      applyBtn.addEventListener('click', () => {
        if (delugeView && poke.optimalMoves) {
          const top4Names = poke.optimalMoves.map(m => m.name);
          const dropNames = (poke.currentMoves || []).filter(m => !top4Names.map(x => x.toLowerCase()).includes(m.toLowerCase()));
          delugeView.send('apply-recommended-moves', {
            recommendedMoves: top4Names,
            dropMoves: dropNames,
            slot1: top4Names[0] || null,
            isChangeAttackPage: !!(activeEvolveCardData && activeEvolveCardData.isChangeAttackPage)
          });
          updateStatus('Applied recommended 4 moves to game form!', '#10b981');
        }
      });
      aiInstantActionSlot.appendChild(applyBtn);
    } else if (poke.id) {
      const changeBtn = document.createElement('button');
      changeBtn.type = 'button';
      changeBtn.className = 'btn btn-accent';
      changeBtn.style.cssText = 'width: 100%; height: 26px; font-size: 10.5px; font-weight: 700; justify-content: center; gap: 6px; box-shadow: none !important;';
      changeBtn.innerHTML = `&#9876; Change Moves in Game (${escapeHtml(poke.name)})`;
      changeBtn.addEventListener('click', () => {
        if (delugeView) {
          delugeView.send('trigger-change-attack', { pokemonId: poke.id, name: poke.name });
          updateStatus(`Opening Change Moves for ${poke.name}...`, '#388bfd');
        }
      });
      aiInstantActionSlot.appendChild(changeBtn);
    }
  }

  if (evoReadyList) {
    const cards = evoReadyList.querySelectorAll('.evo-item-card');
    cards.forEach(c => {
      if (c.getAttribute('data-poke-id') === poke.id) {
        c.style.borderColor = '#388bfd';
        c.style.background = '#0c182c';
      } else {
        c.style.borderColor = '#1a283e';
        c.style.background = '#070e1a';
      }
    });
  }
}

const selectMegaPokemon = selectPokemonForMoves;

function renderMoveItemCard(item) {
  const isSelected = Boolean(selectedMovesPoke && selectedMovesPoke.id === item.id);
  const card = document.createElement('div');
  card.className = 'evo-item-card';
  card.setAttribute('data-poke-id', item.id);
  card.style.cssText = `
    background: ${isSelected ? '#0c182c' : '#070e1a'};
    border: 1px solid ${isSelected ? '#388bfd' : '#1a283e'};
    border-radius: 4px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
    box-shadow: none !important;
    transition: border-color 0.12s ease;
  `;

  let statusBadgeHtml = '';
  if (item.moveStatus === 'NEEDS_OPTIMIZATION') {
    const fCount = item.flawsCount || (item.moveCritique ? item.moveCritique.length : 1);
    statusBadgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #f87171; padding: 1px 4px; background: rgba(248, 81, 73, 0.15); border: 1px solid rgba(248, 81, 73, 0.3); border-radius: 3px;">&#9888; ${fCount} FLAWS</span>`;
  } else if (item.moveStatus === 'CAN_IMPROVE') {
    statusBadgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #d29922; padding: 1px 4px; background: rgba(210, 153, 34, 0.15); border: 1px solid rgba(210, 153, 34, 0.3); border-radius: 3px;">CAN IMPROVE</span>`;
  } else {
    statusBadgeHtml = `<span style="font-size: 8.5px; font-weight: 700; color: #10b981; padding: 1px 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 3px;">OPTIMAL</span>`;
  }

  const spriteHtml = item.sprite
    ? `<img src="${escapeHtml(item.sprite)}" style="width: 24px; height: 24px; image-rendering: pixelated; object-fit: contain; flex-shrink: 0;" onerror="this.style.display='none';">`
    : '';

  const movesPreview = (item.currentMoves || []).slice(0, 3).join(', ');

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
      <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
        ${spriteHtml}
        <div style="min-width: 0;">
          <div style="font-size: 10.5px; font-weight: 700; color: #e0ecfa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(item.name)}
          </div>
          <div style="font-size: 9px; color: #8eaad0;">
            Lv ${item.level || 100} &bull; <span style="color: #388bfd;">${escapeHtml((item.types || []).join('/'))}</span>
          </div>
        </div>
      </div>
      <div style="flex-shrink: 0; text-align: right;">
        ${statusBadgeHtml}
      </div>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 3px; border-top: 1px solid #142033; font-size: 9px;">
      <div style="color: #8eaad0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 58%; font-size: 8.5px;" title="${escapeHtml((item.currentMoves || []).join(', '))}">
        ${escapeHtml(movesPreview)}${(item.currentMoves || []).length > 3 ? '...' : ''}
      </div>
      <div style="display: flex; gap: 3px;">
        <button type="button" class="btn btn-inspect-moves" style="height: 20px; font-size: 9px; font-weight: 600; padding: 0 6px; box-shadow: none !important;">Moves</button>
        <button type="button" class="btn btn-accent btn-action-change-moves" style="height: 20px; font-size: 9px; font-weight: 700; padding: 0 6px; box-shadow: none !important;">Change</button>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('btn-action-change-moves')) {
      e.stopPropagation();
      selectPokemonForMoves(item);
      if (delugeView && item.id) {
        delugeView.send('trigger-change-attack', { pokemonId: item.id, name: item.name });
        updateStatus(`Opening Change Moves for ${item.name}...`, '#388bfd');
      }
      return;
    }
    selectPokemonForMoves(item);
  });

  const movesBtn = card.querySelector('.btn-inspect-moves');
  if (movesBtn) {
    movesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectPokemonForMoves(item);
    });
  }

  return card;
}

function renderEvolutionDecisionMakerUI(opts) {
  if (!evolutionEngine || typeof evolutionEngine.getEvolveReadyPokemon !== 'function') return;
  if (typeof syncEvoAutoToggleUI === 'function') syncEvoAutoToggleUI();

  const rawReadyList = evolutionEngine.getEvolveReadyPokemon(currentCollection);
  const readyList = rawReadyList.map(item => {
    const idKey = item && item.id ? String(item.id) : '';
    const nameKey = item && item.name ? String(item.name).toLowerCase().trim() : '';
    if ((idKey && disregardedEvoPokeIds.has(idKey)) || (nameKey && disregardedEvoPokeNames.has(nameKey))) {
      return Object.assign({}, item, { hasUnique: false, status: 'DISREGARDED' });
    }
    return item;
  });
  cachedEvolveReadyList = readyList;

  const boxMovesList = (typeof evolutionEngine.getBoxPokemonMovesCollection === 'function')
    ? evolutionEngine.getBoxPokemonMovesCollection(currentCollection)
    : [];
  cachedBoxMovesList = boxMovesList;

  const megaList = boxMovesList.filter(p => teamEngine.isActualMegaEvolution(p.name) || teamEngine.isAlreadyGmax(p));
  cachedMegaList = megaList;

  const flawedList = boxMovesList.filter(p => p.moveStatus === 'NEEDS_OPTIMIZATION');

  const uniqueCount = readyList.filter(p => p.hasUnique).length;
  const megaCount = megaList.length;
  const allCount = boxMovesList.length;
  const flawedCount = flawedList.length;

  if (evoCountUnique) evoCountUnique.textContent = String(uniqueCount);
  if (evoCountMegas) evoCountMegas.textContent = String(megaCount);
  if (evoCountAll) evoCountAll.textContent = String(allCount);
  if (evoCountBlocked) evoCountBlocked.textContent = String(flawedCount);

  // If in MOVES modes (MEGAS, ALL, BLOCKED)
  if (currentEvoFilter === 'MEGAS' || currentEvoFilter === 'ALL' || currentEvoFilter === 'BLOCKED') {
    let displayedMoves = boxMovesList;
    let sectionTitle = 'Box Pokemon Movesets';
    let badgeSuffix = 'Box Moves';

    if (currentEvoFilter === 'MEGAS') {
      displayedMoves = megaList;
      sectionTitle = 'Mega Pokemon & Movesets';
      badgeSuffix = 'Megas';
    } else if (currentEvoFilter === 'BLOCKED') {
      displayedMoves = flawedList;
      sectionTitle = 'Flawed Box Movesets';
      badgeSuffix = 'Flawed';
    }

    if (evoListHeaderTitle) evoListHeaderTitle.textContent = sectionTitle;

    if (currentEvoSearch) {
      const q = currentEvoSearch.toLowerCase();
      displayedMoves = displayedMoves.filter(p => {
        const pName = (p.name || '').toLowerCase();
        const pVariant = (p.variant || '').toLowerCase();
        const pTypes = (p.types || []).join(' ').toLowerCase();
        const pMoves = (p.currentMoves || []).join(' ').toLowerCase();
        return pName.includes(q) || pVariant.includes(q) || pTypes.includes(q) || pMoves.includes(q);
      });
    }

    if (evoReadyCountBadge) {
      evoReadyCountBadge.textContent = `${displayedMoves.length} ${badgeSuffix}`;
      evoReadyCountBadge.style.color = currentEvoFilter === 'BLOCKED' ? '#f87171' : '#388bfd';
    }

    if (!evoReadyList) return;
    evoReadyList.innerHTML = '';

    displayedMoves.forEach(item => {
      evoReadyList.appendChild(renderMoveItemCard(item));
    });

    // On-demand species lookup card when searching
    if (currentEvoSearch && currentEvoSearch.trim().length >= 2) {
      const query = currentEvoSearch.trim();
      const exactInDisplayed = displayedMoves.some(p => p.name.toLowerCase() === query.toLowerCase());
      if (!exactInDisplayed) {
        const rec = evolutionEngine.recommendOptimalMoves(query, [], currentCollection);
        if (rec && rec.optimalMoves && rec.optimalMoves.length > 0) {
          const lookupCard = document.createElement('div');
          lookupCard.className = 'evo-item-card lookup-item-card';
          lookupCard.style.cssText = `
            background: #071526;
            border: 1px dashed #388bfd;
            border-radius: 4px;
            padding: 6px 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            cursor: pointer;
            box-shadow: none !important;
            margin-top: 4px;
          `;
          const lookupTypes = rec.types || ['Normal'];
          const pwrPreview = rec.optimalMoves.slice(0, 3).map(m => m.name).join(', ');
          lookupCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
              <div style="min-width: 0;">
                <div style="font-size: 10.5px; font-weight: 700; color: #58a6ff;">
                  &#128269; ${escapeHtml(query.toUpperCase())}
                </div>
                <div style="font-size: 9px; color: #8eaad0;">
                  Species Strategy &bull; <span style="color: #388bfd;">${escapeHtml(lookupTypes.join('/'))}</span>
                </div>
              </div>
              <div style="flex-shrink: 0;">
                <span style="font-size: 8.5px; font-weight: 700; color: #58a6ff; padding: 1px 4px; background: rgba(56, 139, 253, 0.15); border: 1px solid rgba(56, 139, 253, 0.3); border-radius: 3px;">SPECIES LOOKUP</span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 3px; border-top: 1px solid #142033; font-size: 8.5px; color: #8eaad0;">
              <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 75%;">
                ${escapeHtml(pwrPreview)}...
              </div>
              <button type="button" class="btn btn-accent" style="height: 20px; font-size: 9px; font-weight: 700; padding: 0 6px; box-shadow: none !important;">Analyze</button>
            </div>
          `;
          const lookupPoke = {
            name: query.charAt(0).toUpperCase() + query.slice(1),
            types: lookupTypes,
            currentMoves: [],
            optimalMoves: rec.optimalMoves,
            moveCritique: [],
            moveStatus: 'OPTIMAL',
            isLookup: true
          };
          lookupCard.addEventListener('click', () => {
            selectPokemonForMoves(lookupPoke);
          });
          evoReadyList.appendChild(lookupCard);
          if (displayedMoves.length === 0) {
            selectPokemonForMoves(lookupPoke);
            return;
          }
        }
      }
    }

    if (displayedMoves.length === 0) {
      const emptyNotice = document.createElement('div');
      emptyNotice.style.cssText = 'color: #566e96; text-align: center; padding: 16px 8px; font-size: 10px; font-weight: 600;';
      emptyNotice.textContent = currentEvoFilter === 'BLOCKED'
        ? 'No flawed movesets found'
        : 'No Pokemon found';
      evoReadyList.appendChild(emptyNotice);
      if (!activeEvolveCardData || !activeEvolveCardData.isOpen) {
        selectedMovesPoke = null;
        clearActiveEvoDecisionPanel(
          currentEvoFilter === 'BLOCKED' ? 'No Flawed Movesets' : 'No Matches',
          'All Clear',
          currentEvoFilter === 'BLOCKED' ? 'No flawed movesets found' : 'No Pokemon found'
        );
      }
      return;
    }

    if (!selectedMovesPoke && displayedMoves.length > 0) {
      selectPokemonForMoves(displayedMoves[0]);
    }
    return;
  }

  // Otherwise: UNIQUE EVOLVE MODE
  if (evoListHeaderTitle) evoListHeaderTitle.textContent = 'Evolve-Ready Box Pokemon';
  let displayed = currentEvoSearch ? readyList.slice() : readyList.filter(p => p.hasUnique);

  if (currentEvoSearch) {
    const q = currentEvoSearch.toLowerCase();
    displayed = displayed.filter(p => {
      const pName = (p.name || '').toLowerCase();
      const pVariant = (p.variant || '').toLowerCase();
      const pTypes = (p.types || []).join(' ').toLowerCase();
      const branchNames = (p.branches || []).map(b => (b.fullName || b.name || '').toLowerCase()).join(' ');
      return pName.includes(q) || pVariant.includes(q) || pTypes.includes(q) || branchNames.includes(q);
    });
  }

  if (evoReadyCountBadge) {
    evoReadyCountBadge.textContent = `${displayed.length} Available`;
    evoReadyCountBadge.style.color = '#10b981';
  }

  if (!evoReadyList) return;
  evoReadyList.innerHTML = '';

  displayed.forEach(item => {
    const isSelected = Boolean(selectedEvoPoke && selectedEvoPoke.id === item.id);
    const card = document.createElement('div');
    card.className = 'evo-item-card';
    card.setAttribute('data-poke-id', item.id);
    card.style.cssText = `
      background: ${isSelected ? '#0c182c' : '#070e1a'};
      border: 1px solid ${isSelected ? '#388bfd' : '#1a283e'};
      border-radius: 4px;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      cursor: pointer;
      box-shadow: none !important;
      transition: border-color 0.12s ease;
    `;

    const branch = item.bestBranch || (item.branches && item.branches[0]);
    const branchName = branch ? (branch.fullName || branch.name) : 'Unknown';
    const isBranchDup = branch ? branch.isDuplicate : !item.hasUnique;

    const spriteHtml = item.sprite
      ? `<img src="${escapeHtml(item.sprite)}" style="width: 24px; height: 24px; image-rendering: pixelated; object-fit: contain; flex-shrink: 0;" onerror="this.style.display='none';">`
      : '';

    const isBlockedForGmax = Boolean(item.isBlockedForGmax);

    let statusPillHtml = '';
    if (isBlockedForGmax) {
      statusPillHtml = '<span style="font-size: 8.5px; font-weight: 700; color: #fbbf24; padding: 1px 5px; background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 3px;">Hold for G-Max</span>';
    } else if (isBranchDup) {
      statusPillHtml = '<span style="font-size: 8.5px; font-weight: 700; color: #f87171; padding: 1px 5px; background: rgba(248, 81, 73, 0.15); border: 1px solid rgba(248, 81, 73, 0.3); border-radius: 3px;">Owned</span>';
    } else {
      statusPillHtml = '<span style="font-size: 8.5px; font-weight: 700; color: #10b981; padding: 1px 5px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 3px;">Ready</span>';
    }

    const branchSubtitleHtml = isBlockedForGmax
      ? `<span style="color: #fbbf24;">&#8594; Hold for ${escapeHtml(item.gmaxTarget || 'G-Max')}</span>`
      : `<span style="color: ${isBranchDup ? '#f87171' : '#388bfd'};">&#8594; ${escapeHtml(branchName)}</span>`;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
          ${spriteHtml}
          <div style="min-width: 0;">
            <div style="font-size: 10.5px; font-weight: 700; color: #e0ecfa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(item.name)}
            </div>
            <div style="font-size: 9px; color: #8eaad0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              Lv ${item.level} &bull; ${branchSubtitleHtml}
            </div>
          </div>
        </div>
        <div style="flex-shrink: 0; display: flex; align-items: center; gap: 6px;">
          ${statusPillHtml}
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      selectEvolvePokemon(item, item.bestBranch);
    });

    const movesBtn = card.querySelector('.btn-inspect-evo');
    if (movesBtn) {
      movesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectEvolvePokemon(item, item.bestBranch);
      });
    }

    evoReadyList.appendChild(card);
  });

  // On-demand species lookup card when searching in Unique mode
  if (currentEvoSearch && currentEvoSearch.trim().length >= 2) {
    const query = currentEvoSearch.trim();
    const exactInDisplayed = displayed.some(p => p.name.toLowerCase() === query.toLowerCase());
    if (!exactInDisplayed) {
      const rec = evolutionEngine.recommendOptimalMoves(query, [], currentCollection);
      if (rec && rec.optimalMoves && rec.optimalMoves.length > 0) {
        const lookupCard = document.createElement('div');
        lookupCard.className = 'evo-item-card lookup-item-card';
        lookupCard.style.cssText = `
          background: #071526;
          border: 1px dashed #388bfd;
          border-radius: 4px;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
          box-shadow: none !important;
          margin-top: 4px;
        `;
        const lookupTypes = rec.types || ['Normal'];
        const pwrPreview = rec.optimalMoves.slice(0, 3).map(m => m.name).join(', ');
        lookupCard.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
            <div style="min-width: 0;">
              <div style="font-size: 10.5px; font-weight: 700; color: #58a6ff;">
                &#128269; ${escapeHtml(query.toUpperCase())}
              </div>
              <div style="font-size: 9px; color: #8eaad0;">
                Species Strategy &bull; <span style="color: #388bfd;">${escapeHtml(lookupTypes.join('/'))}</span>
              </div>
            </div>
            <div style="flex-shrink: 0;">
              <span style="font-size: 8.5px; font-weight: 700; color: #58a6ff; padding: 1px 4px; background: rgba(56, 139, 253, 0.15); border: 1px solid rgba(56, 139, 253, 0.3); border-radius: 3px;">SPECIES LOOKUP</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 3px; border-top: 1px solid #142033; font-size: 8.5px; color: #8eaad0;">
            <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 75%;">
              ${escapeHtml(pwrPreview)}...
            </div>
            <button type="button" class="btn btn-accent" style="height: 20px; font-size: 9px; font-weight: 700; padding: 0 6px; box-shadow: none !important;">Analyze</button>
          </div>
        `;
        const lookupPoke = {
          name: query.charAt(0).toUpperCase() + query.slice(1),
          types: lookupTypes,
          currentMoves: [],
          optimalMoves: rec.optimalMoves,
          moveCritique: [],
          moveStatus: 'OPTIMAL',
          isLookup: true
        };
        lookupCard.addEventListener('click', () => {
          selectPokemonForMoves(lookupPoke);
        });
        evoReadyList.appendChild(lookupCard);
        if (displayed.length === 0) {
          selectPokemonForMoves(lookupPoke);
          return;
        }
      }
    }
  }

  if (displayed.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.style.cssText = 'color: #566e96; text-align: center; padding: 16px 8px; font-size: 10px; font-weight: 600;';
    emptyNotice.textContent = 'No evolve-ready Pokemon found';
    evoReadyList.appendChild(emptyNotice);
    if (activeEvolveCardData && activeEvolveCardData.isOpen) {
      if (!handleEvolveCardDetected._active && !(opts && opts.skipActiveCardReentry)) {
        handleEvolveCardDetected(activeEvolveCardData);
      }
      return;
    }
    selectedEvoPoke = null;
    clearActiveEvoDecisionPanel('No Pending Evolutions', 'All Clear', 'No evolve-ready Pokemon');
    return;
  }

  if (activeEvolveCardData && activeEvolveCardData.isOpen) {
    if (!handleEvolveCardDetected._active && !(opts && opts.skipActiveCardReentry)) {
      handleEvolveCardDetected(activeEvolveCardData);
    }
    return;
  }

  if (selectedEvoPoke && !displayed.some(p => p.id === selectedEvoPoke.id && p.name === selectedEvoPoke.name)) {
    selectedEvoPoke = null;
  }
  if (!selectedEvoPoke && displayed.length > 0) {
    selectedEvoPoke = displayed[0];
  }
  if (selectedEvoPoke) {
    selectEvolvePokemon(selectedEvoPoke, selectedEvoPoke.bestBranch);
  }
}

function handleRunMonteCarloSimulation() {
  appendAiChatMessage('USER', 'Simulate (1,000x Rollouts)');
  if (aiStatusChip) {
    aiStatusChip.textContent = 'Simulating...';
    aiStatusChip.style.color = '#388bfd';
  }
  const trainerQuery = (activeAiBattleData && activeAiBattleData.trainerName) || (targetLeader && targetLeader.name) || 'Surge';
  if (!aiAssistant) return;

  aiAssistant.runMonteCarloSimulation(trainerQuery).then(res => {
    if (aiStatusChip) {
      aiStatusChip.textContent = 'Observing Battle';
      aiStatusChip.style.color = '#10b981';
    }
    if (aiSimResultStrip && res && res.win_rate !== undefined) {
      aiSimResultStrip.style.display = 'block';
      if (aiSimWinRateBadge) {
        aiSimWinRateBadge.textContent = `${res.win_rate}% Win`;
        aiSimWinRateBadge.style.color = res.win_rate >= 80 ? '#238636' : '#d29922';
      }
      if (aiSimHpVal) aiSimHpVal.textContent = `${res.avg_hp_pct}%`;
      if (aiSimScoreVal) aiSimScoreVal.textContent = String(res.ml_score || '--');
    }
    const topCarry = res.top_carry || 'Selected Counter';
    const msg = `Monte Carlo simulation complete across 1,000 rollouts for ${res.trainer || trainerQuery}: Predicted Win Rate is ${res.win_rate}%, Average Surviving HP is ${res.avg_hp_pct}%. Optimal policy carry: ${topCarry}.`;
    appendAiChatMessage('AI', msg);
  }).catch(err => {
    if (aiStatusChip) {
      aiStatusChip.textContent = 'Ready';
      aiStatusChip.style.color = '#10b981';
    }
    appendAiChatMessage('AI', `Simulation error: ${err.message || err}`);
  });
}

if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
  const _evoAutoChkEl = document.getElementById('evoAutoCheck');
  if (_evoAutoChkEl && typeof _evoAutoChkEl.addEventListener === 'function') {
    _evoAutoChkEl.addEventListener('change', () => {
      syncEvoAutoToggleUI();
      if (!_evoAutoChkEl.checked) {
        stopAutoEvolveCycle('Auto disabled by user');
      }
    });
  }
}
