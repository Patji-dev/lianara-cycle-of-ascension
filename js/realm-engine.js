/* Shared by the playable game and balance tools. A stage cost pays for leaving that stage. */
function createCultivationStages(catalogue, tuning) {
    const positive = (value, label) => {
        if (!Number.isFinite(value) || value <= 0) throw Error('Invalid '+label);
        return value;
    };
    if (tuning.reincarnationAge !== undefined) positive(tuning.reincarnationAge, 'reincarnation age');
    if (tuning.demonicResetAge !== undefined) positive(tuning.demonicResetAge, 'demonic reset age');
    positive(tuning.baseQiRate, 'base Qi rate');
    positive(tuning.extensionBaseCost, 'extension cost');
    positive(tuning.extensionGrowth, 'extension growth');
    positive(tuning.lifespanFactorPerMajor, 'lifespan factor');
    if (!Number.isFinite(tuning.skillXpPercentPerStage) || tuning.skillXpPercentPerStage < 0) throw Error('Invalid skill bonus');
    const stages = [{id:'mortal',name:'Mortal',realmIndex:-1}];
    for (const [realmIndex,realm] of catalogue.realms.entries()) {
        if (realm.minorRealms.length < 3 || realm.minorRealms.length > 7) throw Error('Invalid minor stage count');
        for (const minor of realm.minorRealms) stages.push({id:minor.id,name:minor.name,realmIndex});
    }
    if (new Set(stages.map(s=>s.id)).size !== stages.length) throw Error('Duplicate stage IDs');
    for (const id of Object.keys(tuning.overrides || {})) if (!stages.some(s=>s.id===id)) throw Error('Unknown tuning stage: '+id);
    return Object.freeze(stages.map((stage,index)=>{
        const next = stages[index+1];
        const override = tuning.overrides?.[stage.id] || {};
        const major = !!next && next.realmIndex !== stage.realmIndex;
        const cost = !next ? 0 : positive(override.qiCost ?? tuning.initialCosts[index]
            ?? tuning.extensionBaseCost * tuning.extensionGrowth ** (index-tuning.initialCosts.length), 'Qi cost for '+stage.id);
        const lifespanFactor = positive(override.lifespanFactor ?? (major && index>0 ? tuning.lifespanFactorPerMajor : 1), 'lifespan for '+stage.id);
        if ((!major || index===0) && lifespanFactor!==1) throw Error('Only major realms after Qi Gathering may extend lifespan');
        return Object.freeze({...stage,cost,major,lifespanFactor});
    }));
}
if (typeof module !== 'undefined') module.exports = {createCultivationStages};
