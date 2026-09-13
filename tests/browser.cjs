const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const baseline = '2c6c3c6ba45de78280bcc6df58a0a7f923c6a252';
const cache = new Map();
const mime = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain'};
async function main() {
    const server = http.createServer((req,res) => {
        try {
            const url = new URL(req.url,'http://localhost');
            const parts = decodeURIComponent(url.pathname).split('/').filter(Boolean);
            const mode = parts.shift();
            const file = parts.join('/') || 'index.html';
            if (!['baseline','fork'].includes(mode) || file.includes('..')) throw Error('Bad path');
            let body;
            if (mode === 'baseline') {
                if (!cache.has(file)) cache.set(file,execFileSync('git',['show',baseline+':'+file],{cwd:root,maxBuffer:16e6,stdio:['ignore','pipe','ignore']}));
                body = cache.get(file);
            } else body = fs.readFileSync(path.join(root,file));
            res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(body);
        } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browserChannel=process.env.PLAYWRIGHT_BROWSER || 'msedge';
    const browser = await chromium.launch({headless:true,...(browserChannel==='chromium'?{}:{channel:browserChannel})});
    const errors=[];
    async function pageFor(mode, storage, neutralCultivation = false) {
        const context=await browser.newContext({viewport:{width:1440,height:1000}});
        const page=await context.newPage();
        page.on('pageerror',e=>errors.push(mode+': '+e.message));
        page.on('dialog',d=>d.dismiss());
        await page.route('**/js/HackTimer.js',route=>route.fulfill({body:'/* Tests drive the original update loop explicitly. */',contentType:'text/javascript'}));
        await page.addInitScript(({storage})=>{
            window.setInterval=()=>1;
            const RealDate=Date;
            window.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[1789128000000]));} static now(){return 1789128000000;}};
            if(storage) for(const [key,value] of Object.entries(storage)) localStorage.setItem(key,value);
        },{storage});
        await page.goto(`http://127.0.0.1:${server.address().port}/${mode}/`);
        await page.waitForFunction(()=>typeof gameData!=='undefined' && gameData.currentJob && typeof gameloop!=='undefined');
        if (neutralCultivation) await page.evaluate(()=>{
            setTheme(1); // Neutralize the authorized default theme in upstream comparisons.
            getCultivationLifespanMultiplier=()=>1; getCultivationSkillXpPercent=()=>0; getCultivationJobStage=()=>0;
            getEyeRequirement=()=>Math.max(15,65-gameData.evil_perks.reduce_eye_requirement*5);
            getEvilRequirement=()=>Math.max(getEyeRequirement(),25,200-gameData.evil_perks.reduce_evil_requirement*12.5);
            applyEvilPerks();
        });
        return page;
    }
    try {
        const original=await pageFor('baseline');
        const fork=await pageFor('fork',undefined,true);
        assert.deepEqual(errors,[],'Startup script errors');
        console.log('PASS baseline and fork browser startup');
        const inventory=await original.evaluate(()=>JSON.stringify({commit:'2c6c3c6ba45de78280bcc6df58a0a7f923c6a252',jobs:jobBaseData,skills:skillBaseData,items:itemBaseData,jobCategories,skillCategories,itemCategories,requirements:requirementsBaseData,milestones:milestoneBaseData,updateSpeed,baseLifespan,baseGameSpeed,heroIncomeMult},(key,value)=>['elements','elementsCache'].includes(key)?undefined:typeof value==='number'&&!Number.isFinite(value)?String(value):value,2));
        fs.mkdirSync(path.join(root,'tests/fixtures'),{recursive:true});
        const inventoryPath=path.join(root,'tests/fixtures/upstream-balance.json');
        if(process.argv.includes('--capture')||!fs.existsSync(inventoryPath)) fs.writeFileSync(inventoryPath,inventory+'\n');
        else assert.equal(fs.readFileSync(inventoryPath,'utf8'),inventory+'\n');
        const forkInventory=await fork.evaluate(()=>JSON.stringify({commit:'2c6c3c6ba45de78280bcc6df58a0a7f923c6a252',jobs:jobBaseData,skills:skillBaseData,items:itemBaseData,jobCategories,skillCategories,itemCategories,requirements:requirementsBaseData,milestones:milestoneBaseData,updateSpeed,baseLifespan,baseGameSpeed,heroIncomeMult},(key,value)=>['elements','elementsCache'].includes(key)?undefined:typeof value==='number'&&!Number.isFinite(value)?String(value):value,2));
        const inventoryWithoutArt=JSON.parse(forkInventory);
        delete inventoryWithoutArt.skills['Heart Demon Suppression'];
        delete inventoryWithoutArt.requirements['Heart Demon Suppression'];
        inventoryWithoutArt.skillCategories['Dark Magic']=inventoryWithoutArt.skillCategories['Dark Magic'].filter(n=>n!=='Heart Demon Suppression');
        assert.deepEqual(inventoryWithoutArt,JSON.parse(inventory),'Original balance unchanged apart from the new art');
        const counts=await fork.evaluate(()=>[itemCategories.Properties.length,itemCategories.Misc.length]);
        assert.deepEqual(counts,[27,24]);
        const snap=()=>JSON.stringify({coins:gameData.coins,days:gameData.days,job:gameData.currentJob.name,property:gameData.currentProperty.name,misc:gameData.currentMisc.map(x=>x.name),tasks:Object.fromEntries(Object.entries(gameData.taskData).filter(([k])=>k!=="Heart Demon Suppression").map(([k,t])=>[k,{level:t.level,maxLevel:t.maxLevel,xp:t.xp,xpBigInt:String(t.xpBigInt),isHero:t.isHero,unlocked:t.unlocked}])),evil:gameData.evil,essence:gameData.essence,dark_matter:gameData.dark_matter,happiness:getHappiness(),income:getIncome(),lifespan:getLifespan(),requirements:Object.fromEntries(Object.entries(gameData.requirements).filter(([k])=>k!=="Heart Demon Suppression").map(([k,v])=>[k,v.completed]))},(_,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v);
        assert.equal(await fork.evaluate(snap),await original.evaluate(snap),'Fresh state');
        for(const page of [original,fork]) await page.evaluate(()=>{for(let i=0;i<12000;i++)update(false);});
        assert.equal(await fork.evaluate(snap),await original.evaluate(snap),'10-minute progression');
        console.log('PASS upstream equality with authorized cultivation effects neutralized; 27 housing and 24 misc retained');
        // The UI is rendered using the same real game objects as progression tests.
        await fork.evaluate(()=>updateUI());
        fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
        await fork.screenshot({path:path.join(root,'test-results/cultivation-desktop.png'),fullPage:true});

        assert.deepEqual(errors,[]);
        console.log('PASS rendered cultivation interface');
        const qiResults=await fork.evaluate(()=>{
            const baseHappiness=getHappiness;
            const baseCanSimulate=canSimulate;
            const baseSpeed=getGameSpeed;
            const savedState=forkClone(gameData.cultivation);
            try {
                getGameSpeed=()=>4;
                canSimulate=()=>true;
                getHappiness=()=>1;
                resetCultivation(); updateCultivation(); const one=gameData.cultivation.qi;
                resetCultivation(); getHappiness=()=>2; updateCultivation(); const two=gameData.cultivation.qi;
                const oldRecord=gameData.taskData.Meditation.maxLevel;
                gameData.taskData.Meditation.maxLevel=100000;
                resetCultivation(); gameData.cultivation.highestStage=9; updateCultivation(); const record=gameData.cultivation.qi;
                gameData.taskData.Meditation.maxLevel=oldRecord;
                canSimulate=()=>false; updateCultivation(); const paused=gameData.cultivation.qi;
                const capped=newCultivationState(); advanceCultivation(capped,Infinity);
                const minor={stage:1,qi:0,highestStage:1,autoMinor:true}; advanceCultivation(minor,Infinity);
                const manual={stage:1,qi:0,highestStage:1,autoMinor:false}; advanceCultivation(manual,Infinity);
                return {one,two,record,paused,capped,minor,manual};
            } finally { getHappiness=baseHappiness; canSimulate=baseCanSimulate; getGameSpeed=baseSpeed; gameData.cultivation=savedState; }
        });
        assert.equal(qiResults.two,qiResults.one*2);
        assert.equal(qiResults.record,qiResults.two);
        assert.equal(qiResults.paused,qiResults.two);
        assert.equal(qiResults.capped.stage,0); assert.equal(qiResults.capped.qi,1200);
        assert.equal(qiResults.minor.stage,3); assert.equal(qiResults.minor.qi,12000);
        assert.equal(qiResults.manual.stage,1); assert.equal(qiResults.manual.qi,2400);
        console.log('PASS Qi happiness scaling, record independence, pause and bounded automation');
        const action=await pageFor('fork');
        const happiness=await action.evaluate(()=>{
            const values=[];
            for(const name of ['Homeless','Tent','Wooden Hut']) {
                gameData.currentProperty=gameData.itemData[name];
                values.push({happiness:getHappiness(),qi:getQiRate(),effect:gameData.currentProperty.getEffect()});
            }
            gameData.active_challenge='legends_never_die';
            values.push({happiness:getHappiness(),qi:getQiRate(),effect:1});
            gameData.active_challenge='';
            gameData.cultivation.qi=1200;renderCultivation();
            return values;
        });
        for(const value of happiness)assert.equal(value.qi,value.happiness);
        assert.equal(happiness[1].qi/happiness[0].qi,1.4);
        assert.equal(happiness[2].qi/happiness[0].qi,happiness[2].effect);
        assert.equal(happiness[3].qi,1);
        const preBreak=await action.evaluate(()=>[gameData.days,gameData.coins,getLifespan()]);
        await action.locator('#cultivationBreakthrough').click();
        assert.equal(await action.evaluate(()=>gameData.cultivation.stage),0);
        await action.locator('#inkConfirmBreakthrough').click();
        assert.equal(await action.evaluate(()=>gameData.cultivation.stage),1);
        assert.deepEqual(await action.evaluate(()=>[gameData.days,gameData.coins,getLifespan()]),[preBreak[0],preBreak[1],preBreak[2]]);
        await action.evaluate(()=>{if(breakthroughCultivation())throw Error('Unprepared breakthrough succeeded');});
        await action.evaluate(()=>{gameData.cultivation.stage=3;gameData.cultivation.highestStage=3;gameData.cultivation.qi=12000;renderCultivation();renderInkUI();});
        const beforeFoundation=await action.evaluate(()=>getLifespan());
        await action.locator('#cultivationBreakthrough').click();
        assert.match(await action.locator('#inkBreakthroughSummary').textContent(),/Lifespan:/);
        await action.locator('#inkConfirmBreakthrough').click();
        assert.equal(await action.evaluate(()=>gameData.cultivation.stage),4);
        assert.equal(await action.evaluate(()=>getLifespan()),beforeFoundation*1.5);
        console.log('PASS Qi Gathering preserves lifespan; Foundation breakthrough increases it');
        const realmPage=await pageFor('fork');
        const realmResults=await realmPage.evaluate(()=>{
            const result=[]; const skill=gameData.taskData.Concentration;const job=gameData.taskData.Beggar;
            const baseSkill=skill.getXpGain();const baseJob=job.getXpGain();const baseBig=skill.getXpGainBigInt();
            const baseLife=getLifespan();const baseQi=getQiRate();
            for(let stage=0;stage<10;stage++){
                gameData.cultivation.stage=stage;gameData.cultivation.highestStage=stage;
                result.push({stage,life:getLifespan()/baseLife,skill:skill.getXpGain()/baseSkill,job:job.getXpGain()/baseJob,
                    big:String(skill.getXpGainBigInt()),expectedBig:String(baseBig*BigInt(100+stage*5)/100n),qi:getQiRate()/baseQi});
            }
            return result;
        });
        for(const row of realmResults){
            assert.equal(row.life,1.5**(row.stage===0?0:Math.floor((row.stage-1)/3)));
            assert.ok(Math.abs(row.skill-(1+row.stage*.05))<1e-12);
            assert.equal(row.job,1);assert.equal(row.qi,1);assert.equal(row.big,row.expectedBig);
        }
        const gates=await realmPage.evaluate(()=>{
            gameData.cultivation.stage=0;
            for(const task of Object.values(gameData.taskData))task.level=10000;
            const result=[];
            for(const [name,required] of Object.entries(CULTIVATION_JOB_GATES)){
                const req=gameData.requirements[name];req.completed=true;
                gameData.cultivation.stage=required-1;gameData.cultivation.qi=0;
                const locked=!req.isCompleted()&&!req.isCompletedActual(true);
                const xp=gameData.taskData[name].xp;update(false);
                const notTraining=gameData.taskData[name].xp===xp;
                gameData.cultivation.stage=required;
                result.push({name,locked,notTraining,open:req.isCompleted()});
            }
            gameData.cultivation.stage=0;gameData.cultivation.qi=0;gameData.requirements.Squire.completed=true;
            updateUI(); const requirementText=document.querySelector('#Military.requiredRow').textContent;
            const saved=encodeForkSave();applyForkState(decodeForkSave(saved));
            const stillLocked=!gameData.requirements.Squire.isCompleted();
            return {result,requirementText,stillLocked};
        });
        for(const row of gates.result){assert.equal(row.locked,true,row.name);assert.equal(row.notTraining,true,row.name);assert.equal(row.open,true,row.name);}
        assert.ok(gates.requirementText.includes('Qi Gathering I'));assert.equal(gates.stillLocked,true);
        const originals=await pageFor('fork');
        assert.equal(await originals.evaluate(()=>{gameData.cultivation.stage=1;return gameData.requirements.Squire.isCompleted();}),false);
        await originals.evaluate(()=>{gameData.taskData.Strength.level=5;update(false);updateUI();});
        assert.equal(await originals.evaluate(()=>gameData.requirements.Squire.isCompleted()),true);
        await originals.evaluate(()=>{gameData.cultivation.stage=5;gameData.cultivation.highestStage=5;rebirthReset();});
        assert.equal(await originals.evaluate(()=>getCultivationLifespanMultiplier()),1);
        assert.equal(await originals.evaluate(()=>getCultivationSkillXpPercent()),0);
        assert.equal(await originals.evaluate(()=>gameData.requirements.Squire.isCompleted()),false);
        await realmPage.screenshot({path:path.join(root,'test-results/realm-effects-desktop.png'),fullPage:true});
        console.log('PASS all realm bonuses, fractional BigInt skill XP, job gates/caches/save reload, original requirements and reset');

        // All inherited fields, including currencies, perk trees and reset records.
        const fullState=()=>JSON.stringify(gameData,(key,value)=>['Heart Demon Suppression','cultivation','save_date_time','elementsCache','elements'].includes(key)?undefined:value);
        for (const scenario of ['heroic','challenge']) {
            const pages=[await pageFor('baseline'),await pageFor('fork',undefined,true)];
            for(const page of pages) await page.evaluate(scenario=>{
                gameData.coins=1e100; gameData.evil=1e20; gameData.essence=1e30;
                gameData.dark_matter=1e12;
                for(const task of Object.values(gameData.taskData)) {task.level=20;task.maxLevel=100;task.isHero=scenario==='heroic';}
                for(const item of Object.values(gameData.itemData)) item.isHero=scenario==='heroic';
                if(scenario==='challenge') gameData.active_challenge='an_unhappy_life';
                for(let i=0;i<200;i++)update(false);
            },scenario);
            const actual=JSON.parse(await pages[1].evaluate(fullState)),expected=JSON.parse(await pages[0].evaluate(fullState));
            const differences=[];
            function compare(a,b,p=''){if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],p+'.'+k);}else if(a!==b)differences.push({path:p,actual:a,expected:b});}
            compare(actual,expected);assert.deepEqual(differences,[],scenario+' balance');
            for(const page of pages)await page.context().close();
        }
        console.log('PASS heroic and challenge progression equality');
        for(let layer=1;layer<=5;layer++) {
            const pages=[await pageFor('baseline'),await pageFor('fork',undefined,true)];
            for(const page of pages)await page.evaluate(layer=>{
                gameData.coins=1e10;gameData.evil=1e8;gameData.essence=1e65;
                gameData.dark_matter=1e10;gameData.dark_orbs=100;
                for(const task of Object.values(gameData.taskData)) {task.level=20;task.maxLevel=50;}
                if(gameData.cultivation)gameData.cultivation={stage:4,qi:123,highestStage:6,autoMinor:false};
                gameData.requirements['Rebirth button '+layer].completed=true;
                window[['','rebirthOne','rebirthTwo','rebirthThree','rebirthFour','rebirthFive'][layer]]();
            },layer);
            assert.equal(await pages[1].evaluate(fullState),await pages[0].evaluate(fullState),'reset layer '+layer);
            assert.deepEqual(await pages[1].evaluate(()=>gameData.cultivation),{stage:0,qi:0,highestStage:6,autoMinor:false});
            for(const page of pages)await page.context().close();
        }
        console.log('PASS all five reset layers retain upstream state and reset Qi without a record boost');

        const pacing=await pageFor('fork');
        const pacingResult=await pacing.evaluate(()=>{
            const rows=[];
            for(let points=0;points<=10;points++){
                gameData.evil_perks.reduce_eye_requirement=points;
                rows.push({eye:getEyeRequirement(),first:getAge0Requirement(),second:getAge1Requirement()});
            }
            gameData.evil_perks.reduce_eye_requirement=0;applyEvilPerks();
            gameData.days=53*365;updateRequirements();const first=gameData.requirements['Rebirth button 1'].isCompleted();
            gameData.days=200*365;updateRequirements();const demonic=gameData.requirements['Rebirth button 2'].isCompleted();
            return {rows,first,demonic,count:gameData.rebirthOneCount};
        });
        assert.equal(pacingResult.rows[0].eye,53);assert.equal(pacingResult.rows.at(-1).eye,15);
        assert.ok(pacingResult.rows.every(r=>Number.isFinite(r.first)&&Number.isFinite(r.second)&&r.first<r.eye&&r.second<r.eye));
        assert.equal(pacingResult.first,true);assert.equal(pacingResult.demonic,true);assert.equal(pacingResult.count,0,'No hard reset-count gate');
        await pacing.context().close();
        console.log('PASS pacing thresholds, narrative hints, perk reductions and no reset-count gate');

        const demonic=await pageFor('fork');
        const risk=await demonic.evaluate(()=>{
            const art=gameData.taskData['Heart Demon Suppression'];
            gameData.evil=0;const zero=getMajorBreakthroughFailureChance();
            gameData.evil=99;updateRequirements();const locked=gameData.requirements['Heart Demon Suppression'].isCompleted();
            gameData.evil=100;updateRequirements();const unlocked=gameData.requirements['Heart Demon Suppression'].isCompleted();
            const base=getMajorBreakthroughFailureChance();art.level=100;const trained=getMajorBreakthroughFailureChance();
            gameData.evil=Infinity;art.level=0;const infinity=getMajorBreakthroughFailureChance();
            gameData.evil=100;gameData.paused=false;
            const random=Math.random;Math.random=()=>0;
            gameData.cultivation={stage:3,qi:CULTIVATION_STAGES[3].cost,highestStage:3,autoMinor:true};
            const failed=breakthroughCultivation();const failureState={...gameData.cultivation};
            const message=document.getElementById('cultivationStatus').textContent;
            gameData.cultivation.qi=CULTIVATION_STAGES[3].cost;Math.random=()=>0.999;
            const success=breakthroughCultivation();
            gameData.cultivation={stage:1,qi:CULTIVATION_STAGES[1].cost,highestStage:4,autoMinor:false};Math.random=()=>0;
            const minor=breakthroughCultivation();Math.random=random;
            const legacy=forkParse(encodeForkSave());delete legacy.state.taskData['Heart Demon Suppression'];delete legacy.state.requirements['Heart Demon Suppression'];
            const migrated=decodeForkSave(forkStringify(legacy));
            art.level=20;rebirthReset();
            return {zero,locked,unlocked,base,trained,infinity,failed,failureState,message,success,minor,migrated:migrated.taskData['Heart Demon Suppression'].level,reset:art.level};
        });
        const realmRisk=await demonic.evaluate(()=>{
            const art=gameData.taskData['Heart Demon Suppression'];art.level=0;art.isHero=false;
            const chance=(energy,stage)=>{gameData.evil=energy;gameData.cultivation.stage=stage;return getMajorBreakthroughFailureChance();};
            const belowFirst=chance(99,0),belowSecond=chance(99,3);
            const first=chance(100,0),second=chance(100,3),third=chance(100,6);
            const minorA=chance(100,1),minorB=chance(100,2);
            const capped=chance(100,CULTIVATION_STAGES.findIndex(s=>s.major&&s.realmIndex===30));
            art.level=100;const mitigated=getMajorBreakthroughFailureChance();
            gameData.cultivation.stage=1;const minorSuccess=getBreakthroughChance();
            return {belowFirst,belowSecond,first,second,third,minorA,minorB,capped,mitigated,minorSuccess};
        });
        assert.equal(realmRisk.belowFirst,realmRisk.belowSecond);
        assert.ok(Math.abs(realmRisk.first-(.95*Math.log10(101)/(10+Math.log10(101))+.05))<1e-12);
        assert.ok(Math.abs(realmRisk.second-realmRisk.first-.05)<1e-12);
        assert.ok(Math.abs(realmRisk.third-realmRisk.second-.05)<1e-12);
        assert.equal(realmRisk.minorA,realmRisk.minorB);assert.equal(realmRisk.capped,.95);
        assert.equal(realmRisk.mitigated,.475);assert.equal(realmRisk.minorSuccess,1);
        assert.equal(risk.zero,0);assert.equal(risk.locked,false);assert.equal(risk.unlocked,true);
        assert.ok(risk.base>0 && risk.base<.95);assert.equal(risk.trained,risk.base/2);assert.equal(risk.infinity,.95);
        assert.equal(risk.failed,false);assert.equal(risk.failureState.stage,3);assert.equal(risk.failureState.highestStage,3);assert.equal(risk.failureState.qi,0);
        assert.match(risk.message,/disrupted/);assert.equal(risk.success,true);assert.equal(risk.minor,true);assert.equal(risk.migrated,0);assert.equal(risk.reset,0);
        await demonic.evaluate(()=>{setTab('jobs');updateUI();});
        assert.equal(await demonic.locator('.ink-realm-metrics').count(),0);
        assert.equal(await demonic.locator('#cultivationPanel #inkSkillXp').count(),0);
        assert.equal(await demonic.locator('.ink-realm-copy #cultivationBreakthrough').count(),1);
        assert.ok((await demonic.locator('#inkResidenceBlurb').textContent()).length>20);
        assert.equal(await demonic.locator('#jobTable .requiredRow .effect:visible').count(),0);
        console.log('PASS demonic risk, unlock/training, failure/success, legacy save migration, reset and simplified scroll');
        await demonic.context().close();

        const saved=await pageFor('fork');
        await saved.evaluate(()=>{
            for(let i=0;i<1000;i++)update(false);
            gameData.currentMisc=[gameData.itemData.Book];
            gameData.itemData.Book.unlocked=true;
            gameData.taskData.Beggar.xpBigInt=10n**350n;
            gameData.cultivation={stage:2,qi:111,highestStage:5,autoMinor:false};
            gameData.paused=true; update(false);
            localStorage.setItem('gameDataSave','original-progress-knight-save');
            localStorage.setItem('unrelated','keep-me');
            saveGameData();
        });
        const before=await saved.evaluate(()=>encodeForkSave());
        await saved.reload();
        await saved.waitForFunction(()=>typeof gameloop!=='undefined');
        assert.equal(await saved.evaluate(()=>encodeForkSave()),before,'Save reload round-trip');
        assert.equal(await saved.evaluate(()=>forkSaveBlocked),false);
        assert.equal(await saved.evaluate(()=>localStorage.getItem('gameDataSave')),'original-progress-knight-save');
        const invalid=await saved.evaluate(()=>{
            const original=encodeForkSave();
            const candidate=forkParse(original); candidate.state.cultivation.qi=-1;
            document.getElementById('importExportBox').value=btoa(forkStringify(candidate));
            importGameData();
            return {sameState:encodeForkSave()===original,sameSave:localStorage.getItem(FORK_SAVE_KEY)===original};
        });
        assert.deepEqual(invalid,{sameState:true,sameSave:true});
        // Validate wrong-game, future schema and incomplete payloads before mutation.
        assert.deepEqual(await saved.evaluate(()=>[
            JSON.stringify({taskData:{}}),
            forkStringify({...forkParse(encodeForkSave()),version:99}),
            forkStringify({format:FORK_SAVE_FORMAT,version:1,state:{}})
        ].map(text=>{try{decodeForkSave(text);return false;}catch{return true;}})),[true,true,true]);
        await saved.evaluate(()=>exportGameData());
        const exported=await saved.locator('#importExportBox').inputValue();
        await saved.evaluate(()=>{gameData.cultivation.qi=222;saveGameData();});
        const previous=await saved.evaluate(()=>localStorage.getItem(FORK_SAVE_KEY));
        await saved.locator('#settingsTabButton').click();
        await saved.locator('#importExportBox').fill(exported);
        await Promise.all([saved.waitForEvent('load'),saved.evaluate(()=>importGameData())]);
        assert.equal(await saved.evaluate(()=>gameData.cultivation.qi),111);
        assert.equal(await saved.evaluate(()=>localStorage.getItem(FORK_BACKUP_KEY)),previous);
        console.log('PASS versioned save/export/import, large BigInt, equipment retention and invalid-import atomicity');
        // Confirmed hard reset removes only this fork's main/backup keys.
        saved.removeAllListeners('dialog');saved.on('dialog',d=>d.accept());
        await Promise.all([saved.waitForEvent('load'),saved.evaluate(()=>resetGameData())]);
        assert.equal(await saved.evaluate(()=>localStorage.getItem('gameDataSave')),'original-progress-knight-save');
        assert.equal(await saved.evaluate(()=>localStorage.getItem('unrelated')),'keep-me');
        assert.equal(await saved.evaluate(()=>localStorage.getItem(FORK_BACKUP_KEY)),null);
        const broken=await pageFor('fork',{'lianara.cultivation.v1':'broken-save'});
        await broken.evaluate(()=>saveGameData());
        assert.equal(await broken.evaluate(()=>localStorage.getItem(FORK_SAVE_KEY)),'broken-save');
        assert.equal(await broken.evaluate(()=>forkSaveBlocked),true);
        assert.equal(await broken.locator('#forkSaveStatus').isVisible(),true);
        console.log('PASS isolated reset and preservation of unreadable saves');

        const online=await pageFor('fork'); const offline=await pageFor('fork');
        await online.evaluate(()=>{for(let i=0;i<2000;i++)update(false);});
        await offline.evaluate(()=>{in_offline_progress=true;totalTimes=2000;update_times(2000);stopOffline();});
        assert.equal(await online.evaluate(fullState),await offline.evaluate(fullState),'offline inherited state');
        assert.deepEqual(await online.evaluate(()=>gameData.cultivation),await offline.evaluate(()=>gameData.cultivation));
        await online.evaluate(()=>{gameData.days=getLifespan();const old=gameData.cultivation.qi;updateCultivation();if(gameData.cultivation.qi!==old)throw Error('Qi advanced after death');});
        console.log('PASS offline tick equivalence and no Qi after death');
        const mobile=await pageFor('fork');await mobile.setViewportSize({width:390,height:844});
        await mobile.evaluate(()=>{onResize(390);updateUI();});
        await mobile.screenshot({path:path.join(root,'test-results/cultivation-mobile.png'),fullPage:true});
        assert.equal(await mobile.locator('#cultivationPanel').evaluate(el=>el.getBoundingClientRect().right<=window.innerWidth),true);
        assert.deepEqual(errors,[]);
        console.log('PASS mobile cultivation panel and no browser script errors');
        const themed=await pageFor('fork');
        const mapping=await themed.evaluate(()=>{
            const catalogs=[jobBaseData,skillBaseData,itemBaseData,milestoneBaseData,jobCategories,skillCategories,itemCategories];
            return {missing:catalogs.flatMap(c=>Object.keys(c)).filter(k=>!Object.hasOwn(CULTIVATION_DISPLAY_NAMES,k)),
                idempotent:[...Object.keys(CULTIVATION_DISPLAY_NAMES),...Object.values(CULTIVATION_DISPLAY_NAMES),...Object.keys(CULTIVATION_TERMS)].filter(t=>cultivationText(cultivationText(t))!==cultivationText(t))};
        });
        assert.deepEqual(mapping.missing,[],'All catalog names mapped');
        assert.deepEqual(mapping.idempotent,[],'Theme text remains stable across renders');
        assert.equal(await themed.locator('#skillsTabButton').textContent(),'Scripture Hall');
        assert.equal(await themed.locator('#evilperksTabButton').textContent(),'Demonic Talents');
        assert.equal(await themed.locator('#darkMatterTabButton').textContent(),'World Essence');
        assert.equal(await themed.locator('#metaverseTabButton').textContent(),'Heavenly Cycle');
        assert.equal(await themed.evaluate(()=>CULTIVATION_SKILL_XP_PERCENT),5);
        // Render all advanced panels, including tooltips and dynamic perk labels.
        for(const tab of ['jobs','skills','shop','rebirth','evilperks','milestones','challenges','darkMatter','metaverse','settings']) {
            await themed.evaluate(tab=>{setTab(tab);updateUI();},tab);
        }
        const residual=await themed.evaluate(()=>{
            const out=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
            while(walker.nextNode()) {
                const node=walker.currentNode;
                if(node.parentElement?.closest('script,style,pre,code,textarea,input,[data-upstream-attribution]'))continue;
                if(/\b(Squire|Footman|Knight|Mage|Wizard|Evil|Dark Matter|Dark Orbs|Hypercubes|Metaverse|T\.A\.A|eyeball)\b/i.test(node.nodeValue))out.push(node.nodeValue.trim());
            }
            return out;
        });
        fs.writeFileSync(path.join(root,'test-results/theme-residuals.json'),JSON.stringify(residual,null,2));
        assert.deepEqual(residual,[],'No old fantasy/resource names in active UI text');
        await themed.evaluate(()=>{gameData.cultivation.stage=9;gameData.cultivation.highestStage=9;setTab('jobs');updateUI();});
        assert.match(await themed.locator('#cultivationEffects').textContent(),/45%/);
        await themed.screenshot({path:path.join(root,'test-results/cultivation-themed.png'),fullPage:true});
        console.log('PASS complete catalog naming, idempotent text, advanced panels and +45% final-stage bonus');

        const presentation=await pageFor('fork');
        await presentation.evaluate(()=>{
            for(const task of Object.values(gameData.taskData))task.level=300;
            gameData.cultivation={stage:3,qi:8640,highestStage:3,autoMinor:true};
            gameData.currentProperty=gameData.itemData['Wooden Hut'];
            gameData.coins=1e7;gameData.days=48*365;gameData.paused=true;
            setTab('skills');updateUI();
        });
        await presentation.waitForFunction(()=>Array.from(document.images).filter(img=>img.loading!=='lazy').every(img=>img.complete&&img.naturalWidth>0));
        const detail=presentation.locator('#rowConcentration .ink-training-toggle button');
        assert.equal(await presentation.locator('#rowConcentration .ink-training-description').isVisible(),false);
        await detail.click();
        assert.equal(await presentation.locator('#rowConcentration .ink-training-description').isVisible(),true);
        assert.equal(await detail.getAttribute('aria-expanded'),'true');
        await detail.focus();
        await presentation.keyboard.press('Space');
        assert.equal(await detail.getAttribute('aria-expanded'),'false');
        assert.equal(await presentation.evaluate(()=>gameData.paused),true,'Space on details must not toggle pause');
        await presentation.screenshot({path:path.join(root,'test-results/ink-live-desktop.png'),fullPage:true});
        for(const [theme,label] of [[0,'Parchment'],[1,'Dark Jade'],[2,'Color Blind Friendly']]){
            await presentation.evaluate(()=>{setTab('settings');window.themeReloadMarker=123;});
            await presentation.getByRole('button',{name:label,exact:true}).click();
            assert.equal(await presentation.evaluate(()=>window.themeReloadMarker),123,'Theme changes without reload');
            assert.equal(await presentation.evaluate(()=>gameData.settings.theme),theme);
            await presentation.reload();
            await presentation.waitForFunction(()=>typeof gameloop!=='undefined');
            assert.equal(await presentation.evaluate(()=>gameData.settings.theme),theme,'Theme persists');
            assert.equal(await presentation.getByRole('button',{name:label,exact:true}).evaluate(el=>el.classList.contains('selected')),true);
            if(theme===0){
                await presentation.screenshot({path:path.join(root,'test-results/ink-settings-parchment.png'),fullPage:true});
                await presentation.evaluate(()=>setTab('skills'));
                await presentation.screenshot({path:path.join(root,'test-results/ink-live-parchment.png'),fullPage:true});
            }
        }
        await presentation.evaluate(()=>{setTheme(1);setTab('skills');});
        for(const width of [390,320,768]){
            await presentation.setViewportSize({width,height:844});
            for(const tab of ['jobs','skills','shop','settings','info','rebirth','challenges','milestones','evilperks','darkMatter','metaverse']){
                await presentation.evaluate(({width,tab})=>{onResize(width);setTab(tab);}, {width,tab});
                assert.equal(await presentation.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No page overflow: '+tab+' at '+width);
            }
            await presentation.evaluate(()=>setTab('skills'));
            if(width===390)await presentation.screenshot({path:path.join(root,'test-results/ink-live-mobile.png'),fullPage:true});
        }
        await presentation.evaluate(()=>{setLayout(0);setTab('jobs');updateUI();});
        assert.equal(await presentation.locator('#skillPage').isVisible(),true);
        assert.equal(await presentation.locator('#itemPage').isVisible(),true);
        assert.equal(await presentation.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Wide layout responds on mobile');
        await presentation.evaluate(()=>{setLayout(1);setFontSize(7);setTab('skills');});
        assert.equal(await presentation.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'200 percent text fits');
        assert.deepEqual(errors,[]);
        console.log('PASS live design assets, expandable details, saved themes, all mobile screens, both layouts and enlarged text');

        await presentation.setViewportSize({width:2560,height:1200});
        await presentation.evaluate(()=>{setFontSize(0);setLayout(0);setTheme(0);onResize(2560);setTab('jobs');updateUI();});
        assert.equal(await presentation.locator('body > .w3-margin').evaluate(el=>el.getBoundingClientRect().width),2560,'Wide uses the full display');
        assert.equal(await presentation.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        const residences=await presentation.evaluate(()=>itemCategories.Properties.map(name=>({name,src:RESIDENCE_ART[name]})));
        assert.equal(residences.length,27);assert.equal(new Set(residences.map(x=>x.src)).size,27);
        for(const item of residences)assert.ok(fs.statSync(path.join(root,item.src)).size>0);
        await presentation.evaluate(async residences=>{
            await Promise.all(residences.map(({src})=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(Error(src));img.src=src;})));
            for(const {name,src} of residences){gameData.currentProperty=gameData.itemData[name];renderInkUI();if(!document.getElementById('inkResidenceArt').src.endsWith(src))throw Error('Wrong residence art: '+name);}
            gameData.currentProperty=gameData.itemData['Wooden Hut'];renderInkUI();
        },residences);
        await presentation.screenshot({path:path.join(root,'test-results/residences-wide.jpg'),quality:75});
        console.log('PASS full-screen Wide layout and all 27 distinct residence paintings');

        const exactReference=await pageFor('fork');const exactRunner=await pageFor('fork');
        await exactRunner.addScriptTag({path:path.join(root,'tools/balance-browser.js')});
        await exactRunner.evaluate(()=>installBalanceSimulation({preset:'fresh',policy:'none',minLifeSeconds:300,gainRatio:.5}));
        await exactReference.evaluate(()=>{for(let i=0;i<100;i++)update(false);});
        let simulated=0;while(simulated<100){simulated=(await exactRunner.evaluate(n=>balanceSimulation.runChunk(n),100-simulated)).ticks;}
        assert.equal(await exactRunner.evaluate(()=>encodeForkSave()),await exactReference.evaluate(()=>encodeForkSave()),'No-render simulation matches the real update loop');
        await exactRunner.evaluate(()=>{
            for(let i=0;i<CULTIVATION_STAGES.length;i++){
                gameData.cultivation={stage:i,qi:0,highestStage:i,autoMinor:true};
                applyForkState(decodeForkSave(encodeForkSave()));
                if(gameData.cultivation.stage!==i)throw Error('Late-realm save failed');
            }
        });
        await exactReference.context().close();await exactRunner.context().close();
        const caps=await presentation.evaluate(()=>{
            gameData.paused=false;
            const big=Object.create(Task.prototype);Object.assign(big,{isFinished:true,xpBigInt:0n,level:0,unlocked:false});big.getMaxBigIntXp=()=>100n;big.getXpGainBigInt=()=>1000000000000n;big.increaseXp();
            const normal=Object.create(Task.prototype);Object.assign(normal,{isFinished:false,xp:0,level:0,unlocked:false});normal.getMaxXp=()=>100;normal.getXpGain=()=>1e12;normal.increaseXp();
            return {bigXp:String(big.xpBigInt),bigLevel:big.level,xp:normal.xp,level:normal.level};
        });
        assert.equal(caps.bigXp,'0');assert.equal(caps.xp,0);assert.equal(caps.bigLevel,301);assert.equal(caps.level,2501);
        console.log('PASS no-render parity, all 191 save states, and nonnegative XP at inherited level-up caps');

        // Actual worker timers and wall clock: no test overrides in this context.
        const liveContext=await browser.newContext({viewport:{width:1440,height:1000}});
        const live=await liveContext.newPage();
        live.on('pageerror',e=>errors.push('live: '+e.message));
        await live.goto('http://127.0.0.1:'+server.address().port+'/fork/');
        await live.waitForFunction(()=>typeof gameData!=='undefined' && gameData.cultivation && gameData.cultivation.qi>1);
        await live.waitForFunction(()=>localStorage.getItem('lianara.cultivation.v1')!==null);
        assert.equal(await live.evaluate(()=>forkSaveBlocked),false);
        await live.locator('#pauseButton').click();
        const liveQi=await live.evaluate(()=>gameData.cultivation.qi);
        await live.waitForTimeout(250);
        assert.equal(await live.evaluate(()=>gameData.cultivation.qi),liveQi);
        assert.deepEqual(errors,[]);
        console.log('PASS real worker timers, autosave and pause');

    } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
