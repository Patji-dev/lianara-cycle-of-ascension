/* Loaded only by the isolated balance runner, never by index.html. */
function installBalanceSimulation(options) {
    // Repeatable breakthrough rolls for policy comparisons; a resumed run starts a new seeded sequence.
    let randomState = options.seed ?? 1;
    Math.random = () => { randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0; return randomState / 4294967296; };
    // Presentation and persistence are disabled; update(false) and real game actions are retained.
    updateUI = () => {};
    renderCultivation = () => {};
    renderInkUI = () => {};
    saveGameData = () => {};
    setTab = tab => { gameData.settings.selectedTab = tab; };
    if (options.save) applyForkState(decodeForkSave(options.save));
    gameData.paused = false;
    in_offline_progress = false;
    if (!options.save && options.preset !== 'fresh') {
        const endgame = options.preset === 'endgame';
        gameData.evil = endgame ? 1e180 : 1e20;
        gameData.essence = endgame ? 1e220 : 1e40;
        gameData.dark_matter = endgame ? 1e60 : 1e6;
        gameData.dark_orbs = endgame ? 1e30 : 1e4;
        gameData.hypercubes = endgame ? 1e6 : 0;
        gameData.rebirthOneCount = 10; gameData.rebirthTwoCount = 5;
        gameData.rebirthThreeCount = 3; gameData.rebirthFourCount = 1;
        gameData.rebirthFiveCount = endgame ? 1 : 0;
        gameData.stats.maxEssenceReached = gameData.essence;
        for (const task of Object.values(gameData.taskData)) {
            task.level = endgame ? 10000 : 300;
            task.maxLevel = endgame ? 1000000 : 10000;
        }
        const stage = endgame ? CULTIVATION_STAGES.findIndex(s=>s.realmIndex===35) : 0;
        gameData.cultivation = {stage,qi:0,highestStage:stage,autoMinor:true};
    }
    updateRequirements();
    const startedGameDays=gameData.totalDays;
    let firstReincarnationSeconds=null,firstDemonicSeconds=null;
    const events=[];let droppedEvents=0,ticks=0,reason=null,maxStage=gameData.cultivation.highestStage,lastRealmTick=0;
    const record=(type,detail)=>{if(events.length<20000)events.push({seconds:ticks/updateSpeed,type,...detail});else droppedEvents++;};
    const legalRebirths=[
        [5,()=>getMetaversePerkPointsGain(),()=>gameData.perks_points,rebirthFive],
        [4,getDarkMatterGain,()=>gameData.dark_matter,rebirthFour],
        [3,getEssenceGain,()=>gameData.essence,rebirthThree],
        [2,getEvilGain,()=>gameData.evil,rebirthTwo],
        [1,()=>1,()=>0,rebirthOne]
    ];
    function decisions() {
        if (canSimulate()) {
            const oldStage=gameData.cultivation.stage;
            const preparedQi=gameData.cultivation.qi;
            breakthroughCultivation();
            if(preparedQi>0 && gameData.cultivation.qi===0 && gameData.cultivation.stage===oldStage)record('breakthrough-failure',{stage:oldStage});
            if(gameData.cultivation.stage!==oldStage)record('breakthrough',{stage:gameData.cultivation.stage,realm:CULTIVATION_STAGES[gameData.cultivation.stage].name});
        }
        if(options.policy==='none')return;
        // Bounded purchases in a documented fixed priority, using the real guards/actions.
        if(gameData.evil>0)for(let i=1;i<=4;i++)if(Number.isFinite(getEvilPerkCost(i)))buyEvilPerk(i);
        const purchases=[
            [canBuyDarkOrbGenerator,buyDarkOrbGenerator],[canBuyAMiracle,buyAMiracle],
            [canBuyADealWithTheChairman,buyADealWithTheChairman],[canBuyAGiftFromGod,buyAGiftFromGod],
            [canBuyLifeCoach,buyLifeCoach],[canBuyGottaBeFast,buyGottaBeFast]
        ];
        if(gameData.dark_matter>0)for(const [can,buy] of purchases)if(can())buy();
        if(gameData.rebirthFiveCount>0){
            for(const [can,buy] of [[canBuyHypercubeGain,buyHypercubeGain],[canBuyReduceBoostCooldown,buyReduceBoostCooldown],[canBuyBoostDuration,buyBoostDuration],[canBuyEvilTran,buyEvilTran],[canBuyEssenceMult,buyEssenceMult],[canBuyChallengeAltar,buyChallengeAltar],[canBuyDarkMatterMult,buyDarkMaterMult]])if(can())buy();
            for(const key of Object.keys(gameData.perks))if(gameData.perks[key]===0&&canBuyPerk(key))buyPerk(key);
        }
        const dead=!isAlive();
        for(const [tier,gain,current,rebirth] of legalRebirths){
            if(!gameData.requirements['Rebirth button '+tier].isCompleted())continue;
            if(!dead&&gameData.realtime<options.minLifeSeconds)continue;
            if(tier===1&&!dead&&options.policy!=='early' && !(gameData.rebirthTwoCount===0 && gameData.rebirthOneCount<(options.normalResets || 0)))continue;
            const reward=gain();
            if(tier>1&&(!(reward>0)||(!dead&&reward<Math.max(1,current())*options.gainRatio)))continue;
            const count=gameData['rebirth'+['','One','Two','Three','Four','Five'][tier]+'Count'];
            rebirth();
            if(gameData['rebirth'+['','One','Two','Three','Four','Five'][tier]+'Count']>count){
                if(tier===1 && firstReincarnationSeconds===null)firstReincarnationSeconds=ticks/updateSpeed;
                if(tier===2 && firstDemonicSeconds===null)firstDemonicSeconds=ticks/updateSpeed;
                record('rebirth',{tier,reward,normalReincarnations:gameData.rebirthOneCount});break;
            }
        }
    }
    function snapshot() {
        const stage=gameData.cultivation.stage;
        return {firstReincarnationSeconds,firstDemonicSeconds,simulatedSeconds:ticks/updateSpeed,ticks,elapsedGameDays:gameData.totalDays-startedGameDays,
            realm:CULTIVATION_STAGES[stage].name,stage,maxStage,highestRealm:CULTIVATION_STAGES[maxStage].name,
            hoursSinceBestRealm:(ticks-lastRealmTick)/updateSpeed/3600,
            qiDaysAtCurrentRate:Math.max(0,CULTIVATION_STAGES[stage].cost-gameData.cultivation.qi)/getQiRate(),
            remainingLifeDays:Math.max(0,getLifespan()-gameData.days),
            qi:gameData.cultivation.qi,nextQiCost:CULTIVATION_STAGES[stage].cost,qiPerGameDay:getQiRate(),
            ageYears:daysToYears(gameData.days),lifespanYears:daysToYears(getLifespan()),
            harmony:getHappiness(),coins:gameData.coins,income:getIncome(),housing:displayName(gameData.currentProperty.name),
            evil:gameData.evil,essence:gameData.essence,worldEssence:gameData.dark_matter,hypercubes:gameData.hypercubes,
            rebirths:[gameData.rebirthOneCount,gameData.rebirthTwoCount,gameData.rebirthThreeCount,gameData.rebirthFourCount,gameData.rebirthFiveCount],
            dead:!isAlive(),stopReason:reason,droppedEvents};
    }
    window.balanceSimulation={
        runChunk(count) {
            const started=performance.now();let ran=0;
            while(ran<count && performance.now()-started<500 && !reason){
                if(ticks%updateSpeed===0||!isAlive())decisions();
                if(options.untilDemonic && firstDemonicSeconds!==null)break;
                if(!isAlive()){reason='lifespan reached; policy found no eligible reincarnation';break;}
                const beforeStage=gameData.cultivation.stage;
                update(false);ticks++;ran++;
                for(let stage=beforeStage+1;stage<=gameData.cultivation.stage;stage++)record('minor-advancement',{stage,realm:CULTIVATION_STAGES[stage].name});
                if(gameData.cultivation.stage>maxStage){maxStage=gameData.cultivation.stage;lastRealmTick=ticks;}
                if(ticks%updateSpeed===0){
                    const invalid=['coins','days','totalDays','evil','essence','dark_matter','hypercubes'].find(key=>Number.isNaN(gameData[key]));
                    if(invalid)reason='non-finite arithmetic produced NaN in '+invalid;
                    if(!Number.isFinite(gameData.days))reason='game age exceeded finite-number range';
                }
            }
            return snapshot();
        },snapshot,
        finish(){gameData.save_date_time=0;const save=encodeForkSave();let checkpointError=null;try{decodeForkSave(save);}catch(error){checkpointError=error.message;}return {snapshot:snapshot(),events,save,checkpointError};}
    };
}
