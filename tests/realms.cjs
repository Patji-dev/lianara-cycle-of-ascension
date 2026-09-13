const assert=require('node:assert/strict');const fs=require('node:fs');const {createCultivationStages}=require('../js/realm-engine.js');
const read=file=>JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../content/',file),'utf8').replace(/^\uFEFF/,''));
const catalogue=read('cultivation-realms.json'),tuning=read('cultivation-tuning.json');const stages=createCultivationStages(catalogue,tuning);
assert.equal(stages.length,191);assert.equal(stages[0].lifespanFactor,1);assert.equal(stages.at(-1).cost,0);assert.equal(stages.at(-1).major,false);
assert.deepEqual(stages.slice(0,9).map(s=>s.cost),tuning.initialCosts);
for(let i=0;i<stages.length-1;i++){assert.ok(Number.isFinite(stages[i].cost)&&stages[i].cost>0);assert.equal(stages[i].major,stages[i].realmIndex!==stages[i+1].realmIndex);if(!stages[i].major)assert.equal(stages[i].lifespanFactor,1);}
assert.equal(stages.filter(s=>s.major).length,40);assert.equal(stages[9].major,true);assert.equal(stages[10].name,catalogue.realms[3].minorRealms[0].name);
const custom=structuredClone(tuning);custom.overrides[stages[9].id]={qiCost:777,lifespanFactor:1.2};assert.equal(createCultivationStages(catalogue,custom)[9].cost,777);
custom.overrides.mortal={lifespanFactor:1.5};assert.throws(()=>createCultivationStages(catalogue,custom));
console.log('PASS all 190 realm transitions, early save ordering, finite costs and per-stage tuning');
