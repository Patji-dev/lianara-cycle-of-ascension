/* Versioned fork saves. No original Progress Knight storage is read or removed. */
const FORK_SAVE_KEY = "lianara.cultivation.v1";
const FORK_BACKUP_KEY = FORK_SAVE_KEY + ".backup";
const FORK_SAVE_FORMAT = "lianara-cultivation";
let forkSaveTemplate;
let forkSaveBlocked = false;
const forkSpecialFields = new Set(["taskData", "itemData", "requirements", "currentJob", "currentProperty", "currentMisc"]);

function forkStringify(value) {
    return JSON.stringify(value, (_, item) => typeof item === "number" && !Number.isFinite(item)
        ? { $number: String(item) } : item);
}
function forkParse(text) {
    return JSON.parse(text, (key, value) => {
        if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Invalid save key.");
        if (value && typeof value === "object" && Object.hasOwn(value, "$number")) {
            if (Object.keys(value).length !== 1 || !["Infinity", "-Infinity"].includes(value.$number))
                throw new Error("Invalid numeric value.");
            return Number(value.$number);
        }
        return value;
    });
}
function forkClone(value) { return forkParse(forkStringify(value)); }

function snapshotForkState() {
    const state = {};
    for (const key of Object.keys(gameData)) {
        if (!forkSpecialFields.has(key)) state[key] = gameData[key];
    }
    state.taskData = {};
    for (const [key, task] of Object.entries(gameData.taskData)) {
        state.taskData[key] = { level: task.level, maxLevel: task.maxLevel, xp: task.xp,
            xpBigInt: task.xpBigInt.toString(), isHero: task.isHero,
            isFinished: task.isFinished, unlocked: task.unlocked };
    }
    state.itemData = {};
    for (const [key, item] of Object.entries(gameData.itemData))
        state.itemData[key] = { isHero: item.isHero, unlocked: item.unlocked };
    state.requirements = {};
    for (const [key, requirement] of Object.entries(gameData.requirements))
        state.requirements[key] = requirement.completed;
    state.currentJob = gameData.currentJob.name;
    state.currentProperty = gameData.currentProperty.name;
    state.currentMisc = gameData.currentMisc.map(item => item.name);
    return forkClone(state);
}

function initializeForkSave() {
    gameData.cultivation = newCultivationState();
    forkSaveTemplate = snapshotForkState();
}

function validateForkShape(value, template, path = "state") {
    if (template === null) {
        if (value !== null && (typeof value !== "number" || value < 0 || Number.isNaN(value)))
            throw new Error("Invalid " + path);
        return;
    }
    if (Array.isArray(template)) {
        if (!Array.isArray(value)) throw new Error("Invalid " + path);
        return;
    }
    if (typeof template === "object") {
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid " + path);
        if (Object.keys(value).length !== Object.keys(template).length) throw new Error("Incomplete " + path);
        for (const key of Object.keys(template)) {
            if (!Object.hasOwn(value, key)) throw new Error("Missing " + path + "." + key);
            validateForkShape(value[key], template[key], path + "." + key);
        }
    } else if (typeof value !== typeof template || (typeof value === "number" && Number.isNaN(value))) {
        throw new Error("Invalid " + path);
    }
}

function decodeForkSave(text) {
    if (text.length > 8 * 1024 * 1024) throw new Error("Save is too large.");
    const envelope = forkParse(text);
    if (!envelope || envelope.format !== FORK_SAVE_FORMAT)
        throw new Error("Use a Lianara save. Progress Knight saves are not imported automatically.");
    if (envelope.version !== 1) throw new Error("Unsupported save version; original data has been preserved.");
    const state = envelope.state;
    // Older v1 saves predate this technique. Migrate only the known missing entries.
    if (state?.taskData && !Object.hasOwn(state.taskData, "Heart Demon Suppression"))
        state.taskData["Heart Demon Suppression"] = forkClone(forkSaveTemplate.taskData["Heart Demon Suppression"]);
    if (state?.requirements && !Object.hasOwn(state.requirements, "Heart Demon Suppression"))
        state.requirements["Heart Demon Suppression"] = false;
    validateForkShape(state, forkSaveTemplate);
    if (!Object.hasOwn(jobBaseData, state.currentJob) || !itemCategories.Properties.includes(state.currentProperty)
        || state.currentMisc.some(name => !itemCategories.Misc.includes(name))
        || new Set(state.currentMisc).size !== state.currentMisc.length) throw new Error("Invalid active equipment or job.");
    for (const task of Object.values(state.taskData)) {
        for (const key of ["level", "maxLevel"])
            if (!Number.isSafeInteger(task[key]) || task[key] < 0) throw new Error("Invalid activity level.");
        if (task.xp < 0 || !/^\d{1,20000}$/.test(task.xpBigInt)) throw new Error("Invalid activity XP.");
    }
    const c = state.cultivation;
    if (!Number.isInteger(c.stage) || c.stage < 0 || c.stage >= CULTIVATION_STAGES.length
        || !Number.isInteger(c.highestStage) || c.highestStage < c.stage || c.highestStage >= CULTIVATION_STAGES.length
        || !Number.isFinite(c.qi) || c.qi < 0 || c.qi > CULTIVATION_STAGES[c.stage].cost)
        throw new Error("Invalid cultivation state.");
    if (!Number.isFinite(state.days) || state.days < 0 || !Number.isFinite(state.save_date_time) || state.save_date_time < 0)
        throw new Error("Invalid game clock.");
    for (const key of ["coins", "evil", "essence", "dark_matter", "dark_orbs", "hypercubes", "perks_points"])
        if (state[key] < 0) throw new Error("Invalid resource.");
    if (state.active_challenge !== "" && !Object.hasOwn(state.challenges, state.active_challenge))
        throw new Error("Invalid challenge.");
    for (const [key, choices] of Object.entries({theme:[0,1,2], layout:[0,1], numberNotation:[0,1,2], currencyNotation:[0,1,2,3]}))
        if (!choices.includes(state.settings[key])) throw new Error("Invalid setting: " + key);
    if (!Object.values(Tab).includes(state.settings.selectedTab)) throw new Error("Invalid selected tab.");
    return state;
}

function applyForkState(state) {
    // All validation and BigInt parsing happen before touching live state.
    const tasks = {};
    for (const [key, task] of Object.entries(state.taskData)) tasks[key] = { ...task, xpBigInt: BigInt(task.xpBigInt) };
    for (const [key, value] of Object.entries(state)) if (!forkSpecialFields.has(key)) gameData[key] = value;
    for (const [key, task] of Object.entries(tasks)) Object.assign(gameData.taskData[key], task);
    for (const [key, item] of Object.entries(state.itemData)) Object.assign(gameData.itemData[key], item);
    for (const [key, completed] of Object.entries(state.requirements)) gameData.requirements[key].completed = completed;
    gameData.currentJob = gameData.taskData[state.currentJob];
    gameData.currentProperty = gameData.itemData[state.currentProperty];
    gameData.currentMisc = state.currentMisc.map(name => gameData.itemData[name]);
}

function encodeForkSave(state = snapshotForkState()) {
    return forkStringify({ format: FORK_SAVE_FORMAT, version: 1, state });
}
function showForkSaveStatus(message) {
    const element = document.getElementById("forkSaveStatus");
    element.textContent = message;
    element.hidden = !message;
}
function saveGameData() {
    if (forkSaveBlocked) return;
    try {
        gameData.save_date_time = Date.now();
        localStorage.setItem(FORK_SAVE_KEY, encodeForkSave());
        showForkSaveStatus("");
    } catch (error) { showForkSaveStatus("Save failed. Export a backup: " + error.message); }
}
function peekSettingFromSave(setting) { return gameData.settings[setting]; }
function loadGameData() {
    try {
        const text = localStorage.getItem(FORK_SAVE_KEY);
        if (text !== null) applyForkState(decodeForkSave(text));
    } catch (error) {
        forkSaveBlocked = true;
        showForkSaveStatus("Saved data could not load; autosave is disabled to preserve it. Import a valid Lianara save or reset this game. " + error.message);
    }
}
function resetGameData() {
    if (!confirm("Reset Lianara and its backup? All Lianara progress will be lost.")) return;
    try {
        localStorage.removeItem(FORK_SAVE_KEY);
        localStorage.removeItem(FORK_BACKUP_KEY);
        clearInterval(gameloop);
        clearInterval(saveloop);
        location.reload();
    } catch (error) { showForkSaveStatus("Reset failed: " + error.message); }
}
function importGameData() {
    try {
        const encoded = document.getElementById("importExportBox").value.trim();
        if (!encoded) throw new Error("Paste an exported Lianara save first.");
        if (encoded.length > 12 * 1024 * 1024) throw new Error("Save is too large.");
        const text = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0)));
        const candidate = decodeForkSave(text);
        const previous = localStorage.getItem(FORK_SAVE_KEY);
        if (previous !== null) localStorage.setItem(FORK_BACKUP_KEY, previous);
        // Persist before reloading; invalid imports never alter the current game or saved data.
        localStorage.setItem(FORK_SAVE_KEY, encodeForkSave(candidate));
        clearInterval(gameloop);
        clearInterval(saveloop);
        location.reload();
    } catch (error) { alert("Save not imported: " + error.message); }
}
function exportGameData() {
    const bytes = new TextEncoder().encode(encodeForkSave());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const encoded = btoa(binary);
    document.getElementById("importExportBox").value = encoded;
    copyTextToClipboard(encoded);
}
