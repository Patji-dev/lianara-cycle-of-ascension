/* Qi is independent of Task XP and never reads maxLevel or record multipliers. */
const CULTIVATION_LIFESPAN_FACTOR = CULTIVATION_TUNING.lifespanFactorPerMajor; // Provisional, per major realm entered.
const CULTIVATION_SKILL_XP_PERCENT = CULTIVATION_TUNING.skillXpPercentPerStage; // Additive percentage points per stage.
const CULTIVATION_JOB_GATES = Object.freeze({
    "Squire": 1, "Veteran footman": 3, "Knight": 5, "Holy Knight": 8,
    "Student": 3, "Adept Mage": 5, "Archmage": 7, "Chairman": 9,
});
function getCultivationMajorCount(stage = gameData.cultivation?.stage || 0) {
    return CULTIVATION_STAGES.slice(1, stage).filter(entry => entry.major).length;
}
function getCultivationStageLifespanFactor(stage) { return CULTIVATION_STAGES[stage]?.lifespanFactor ?? 1; }
function getCultivationLifespanMultiplier() {
    return CULTIVATION_STAGES.slice(0, gameData.cultivation?.stage || 0)
        .reduce((factor, entry) => factor * (entry.lifespanFactor ?? 1), 1);
}
function getCultivationSkillXpPercent() { return CULTIVATION_SKILL_XP_PERCENT * (gameData.cultivation?.stage || 0); }
function getCultivationSkillXpMultiplier() { return 1 + getCultivationSkillXpPercent() / 100; }
function getCultivationJobStage(name) {
    for (const category of [jobCategories.Military, jobCategories["The Arcane Association"]]) {
        const index = category.indexOf(name);
        if (index >= 0) return Math.max(0, ...category.slice(0,index+1).map(job => CULTIVATION_JOB_GATES[job] || 0));
    }
    return 0;
}
function installCultivationJobGates() {
    for (const name of [...jobCategories.Military, ...jobCategories["The Arcane Association"]]) {
        const requirement = gameData.requirements[name];
        for (const method of ["isCompleted", "isCompletedActual"]) {
            const original = requirement[method].bind(requirement);
            requirement[method] = (...args) => (gameData.cultivation?.stage || 0) >= getCultivationJobStage(name) && original(...args);
        }
    }
}
const CULTIVATION_BASE_RATE = CULTIVATION_TUNING.baseQiRate; // Qi per game day, before effective happiness.
const CULTIVATION_STAGES = createCultivationStages(CULTIVATION_CATALOGUE, CULTIVATION_TUNING);

function newCultivationState() {
    return { stage: 0, qi: 0, highestStage: 0, autoMinor: true, autoMajor: false, autoMajorThreshold: 95 };
}

function resetCultivation() {
    cultivationAttemptMessage = "";
    const previous = gameData.cultivation;
    gameData.cultivation = newCultivationState();
    if (previous) {
        gameData.cultivation.highestStage = previous.highestStage;
        gameData.cultivation.autoMinor = previous.autoMinor;
        gameData.cultivation.autoMajor = previous.autoMajor ?? false;
        gameData.cultivation.autoMajorThreshold = previous.autoMajorThreshold ?? 95;
    }
}

function getQiRate() {
    return CULTIVATION_BASE_RATE * getHappiness();
}

function advanceCultivation(state, qiGain) {
    if (!(qiGain > 0)) return;
    let remaining = qiGain;
    // Bounded by the finite realm ladder, even when late-game happiness is infinite.
    while (state.stage < CULTIVATION_STAGES.length - 1) {
        const stage = CULTIVATION_STAGES[state.stage];
        const needed = stage.cost - state.qi;
        const gained = Math.min(needed, remaining);
        state.qi += gained;
        remaining -= gained;
        if (state.qi < stage.cost) return;
        if (stage.major) {
            if (!state.autoMajor || (1 - getMajorBreakthroughFailureChance(state)) * 100 < (state.autoMajorThreshold ?? 95)) return;
            if (!attemptCultivationBreakthrough(state)) return;
            if (!(remaining > 0)) return;
            continue;
        }
        if (!state.autoMinor) return;
        state.qi = 0;
        state.stage++;
        state.highestStage = Math.max(state.highestStage, state.stage);
        if (!(remaining > 0)) return;
    }
    state.qi = 0;
}

function updateCultivation() {
    if (!canSimulate()) return;
    advanceCultivation(gameData.cultivation, applySpeed(getQiRate()));
}

let cultivationAttemptMessage = "";
function getMajorBreakthroughFailureChance(state = gameData.cultivation) {
    const energy = Math.max(0, gameData.evil);
    const pressure = Math.log10(1 + energy);
    const baseRisk = pressure === Infinity ? 0.95 : 0.95 * pressure / (pressure + 10);
    const art = gameData.taskData["Heart Demon Suppression"];
    const stability = energy >= 100 && art ? art.getEffect() : 1;
    // Count the major realm being entered: Qi Gathering is 1, Foundation is 2, etc.
    const target = CULTIVATION_STAGES[(state?.stage || 0) + 1];
    const realmRisk = energy >= 100 && target ? 0.05 * (target.realmIndex + 1) : 0;
    return Math.min(0.95, baseRisk + realmRisk) / Math.max(1, stability);
}
function getBreakthroughChance() {
    return CULTIVATION_STAGES[gameData.cultivation.stage].major ? 1 - getMajorBreakthroughFailureChance() : 1;
}
function breakthroughCultivation() {
    if (in_offline_progress || !canSimulate()) return false;
    const state = gameData.cultivation;
    const stage = CULTIVATION_STAGES[state.stage];
    if (!stage.cost || state.qi < stage.cost) return false;
    const succeeded = attemptCultivationBreakthrough(state);
    renderCultivation();
    saveGameData();
    return succeeded;
}

function attemptCultivationBreakthrough(state) {
    const stage = CULTIVATION_STAGES[state.stage];
    const failed = stage.major && Math.random() < getMajorBreakthroughFailureChance(state);
    state.qi = 0;
    if (failed) {
        cultivationAttemptMessage = "Your inner demons disrupted the breakthrough. Prepared Qi was consumed; your realm is unchanged.";
        return false;
    }
    cultivationAttemptMessage = "";
    state.stage++;
    state.highestStage = Math.max(state.highestStage, state.stage);
    return true;
}

function setCultivationAutoMajor(enabled) {
    gameData.cultivation.autoMajor = enabled;
    renderCultivation();
    saveGameData();
}

function setCultivationAutoMajorThreshold(value) {
    const threshold = Number(value);
    if (!Number.isFinite(threshold)) return;
    gameData.cultivation.autoMajorThreshold = Math.max(0, Math.min(100, Math.round(threshold)));
    renderCultivation();
    saveGameData();
}

function setCultivationAutoMinor(enabled) {
    gameData.cultivation.autoMinor = enabled;
    saveGameData();
}

function renderCultivation() {
    const state = gameData.cultivation;
    const stage = CULTIVATION_STAGES[state.stage];
    const next = CULTIVATION_STAGES[state.stage + 1];
    const ready = next && state.qi >= stage.cost;
    document.getElementById("cultivationRealm").textContent = stage.name;
    document.getElementById("cultivationQi").textContent = next
        ? format(state.qi) + " / " + format(stage.cost) + " Qi" : "Realm complete";
    const progress = document.getElementById("cultivationProgress");
    progress.max = stage.cost || 1;
    progress.value = next ? state.qi : 1;
    document.getElementById("cultivationRate").textContent = format(getQiRate())
        + " Qi / game day · Happiness ×" + format(getHappiness());
    document.getElementById("cultivationEffects").textContent = "Lifespan ×" + format(getCultivationLifespanMultiplier(), 3)
        + " · Skill XP +" + getCultivationSkillXpPercent() + "%";
    const nextStage = state.stage + 1;
    const jobs = Object.entries(CULTIVATION_JOB_GATES).filter(([,stage]) => stage === nextStage).map(([name]) => displayName(name));
    document.getElementById("cultivationNextEffects").textContent = next
        ? "Next: skill XP +" + (CULTIVATION_SKILL_XP_PERCENT * nextStage) + "% total"
          + (getCultivationStageLifespanFactor(state.stage) > 1 ? "; longer lifespan" : "; lifespan unchanged")
          + (jobs.length ? "; realm requirement met for " + jobs.join(", ") : "")
        : "All current realm bonuses acquired.";
    const button = document.getElementById("cultivationBreakthrough");
    button.disabled = !ready || !canSimulate() || in_offline_progress;
    button.textContent = next ? (stage.major ? "Break through: " : "Advance: ") + next.name : "Cultivation complete";
    document.getElementById("cultivationStatus").textContent = !next
        ? "You have reached the highest realm."
        : !canSimulate() ? "Cultivation stops while paused or when your lifespan is reached."
        : cultivationAttemptMessage && !ready ? cultivationAttemptMessage
        : ready ? (stage.major ? (getBreakthroughChance() * 100).toFixed(1) + "% breakthrough chance" : "Ready to advance.")
        : stage.major ? "Gather Qi to prepare your breakthrough." : "Gather Qi for a guaranteed minor advancement.";
    document.getElementById("cultivationRecord").textContent = "Highest realm: "
        + CULTIVATION_STAGES[state.highestStage].name;
    document.getElementById("cultivationAutoMinor").checked = state.autoMinor;
    document.getElementById("cultivationAutoMajor").checked = state.autoMajor ?? false;
    const threshold = state.autoMajorThreshold ?? 95;
    document.getElementById("cultivationAutoMajorThreshold").value = threshold;
    document.getElementById("cultivationAutoMajorValue").textContent = threshold + "%";
    document.getElementById("cultivationAutoMajorStatus").textContent = !state.autoMajor
        ? "Choose your moment. Enable automatic breakthroughs to follow this threshold."
        : "Automatically attempt with full Qi and at least " + threshold + "% success chance. Failure consumes prepared Qi.";
}
