# Lianara: Cycle of Ascension — cultivation fork plan

Status: first playable implementation completed, 11 September 2026. See [implementation notes](IMPLEMENTATION.md) for verified behavior and remaining work. The direction below remains the design reference; prototype Qi thresholds and future integrations are not final balancing.

## Early-game pacing targets — 12 September 2026

The first reincarnation should become available at around one hour of active, unpaused play. The first demonic reset should normally be worth pursuing after at least two ordinary reincarnations. These are pacing guides, not real-time locks or reset-count prerequisites.

The first reincarnation's base age is now 53 (previously 65). This produces a measured fresh-start unlock at 59 minutes 19 seconds, down from 77 minutes 34 seconds. Demonic reset retains its age-200 base requirement; current measurements favor two early reincarnations over either zero or one. Demonic talents still reduce both age requirements normally.

Measured exact-tick routes, starting fresh and using default automation and prompt breakthroughs:

- Two early reincarnations: first at 59:19, second at 1:58:38, first demonic reset at 3:42:30 total play time.
- No early reincarnations: first demonic reset at 4:42:53.
- One early reincarnation: first demonic reset at 5:42:12.

These are three policy comparisons, not a proof of optimal play or a minimum number of reincarnations. The chosen early resets belong only to the simulation policy. Staying in one life can still reach the demonic reset. Player playtesting should assess whether the benefit of ordinary reincarnation is clear enough and whether the third life feels satisfying.

Tuning lives in content/cultivation-tuning.json as reincarnationAge and demonicResetAge. Rebuild the browser bundle after editing. No housing, job, technique-XP, Qi-cost or lifespan values changed in this pacing pass.

## Full-game realm names

See [the realm catalogue](CULTIVATION_REALMS.md) for 40 major realms and 190 minor stages. The complete ladder is now playable with configurable initial thresholds. See [balance testing](BALANCE_TESTING.md) for accelerated runs and realm sweeps.

## Direction

Build a browser-based cultivation idle game directly on indomit's Progress Knight Quest. Preserve the satisfying rhythm of simultaneous training, automatic advancement through livelihoods, improving living conditions, aging, and starting stronger in another life. Add a distinct Qi cultivation system alongside that baseline. Its interactions with lifespan and existing progression must be explicit and measured.

Use Lianara: Cycle of Ascension as the working title. The existing Godot project is a separate prototype. Reuse its themes selectively, but start this implementation from the downloaded JavaScript fork. A Godot port is a later decision, after the browser game's progression is enjoyable.

Player promise: every lifetime teaches something permanent, every realm changes what you can do, and automation makes earlier achievements easier to repeat.

## Implemented realm effects — latest direction

This revision supersedes the earlier no-feedback/no-job-gates milestone below. All original costs, income and XP curves remain the baseline; these are the authorized cultivation additions:

- Lifespan increases are configured per major transition. Entering Qi Gathering has no lifespan increase; the current prototype applies ×1.5 on entering Foundation and again on entering Golden Core. Minor stages do not change it. This multiplies the existing lifespan result (including challenge adjustments); existing infinity remains infinity.
- Each advancement adds 5 percentage points to skill XP: Qi Gathering I +5%, Foundation I +20%, Golden Core III +45%. This is a current-life bonus; no direct job-XP or Qi-rate multiplier is added. BigInt XP uses the same percentage with integer truncation rather than rounding a small multiplier up to ×2.
- Scattered military gates: Squire at Qi Gathering I; Veteran footman at Qi Gathering III; Knight at Foundation II; Holy Knight at Golden Core II.
- Scattered mage gates: Student at Qi Gathering III; Adept Mage at Foundation II; Archmage at Golden Core I; Chairman at Golden Core III.
- Subsequent jobs inherit the latest gate in their category. Ungated intermediate promotions retain that minimum rather than adding a new one. Qi Gathering II, Foundation I and Foundation III add no new job gate.
- Original skill/job prerequisites remain required. Cached unlocks and old saves cannot bypass current-life realm gates. Reincarnation removes realm bonuses and re-locks these jobs until their requirements are met again.
- Happiness still drives Qi; cultivation never receives an activity-record bonus.

The earlier zero-feedback implementation notes and parity criteria describe the baseline phase. Regression comparisons now neutralize the three authorized additions to verify underlying upstream behavior, and separately test the real additions enabled.

## Balance preservation requirement

User direction, 11 September 2026: keep indomit's current balancing as the base, except for the new Qi cultivation system. Preserve the breadth of existing content, including every housing tier, even when renaming it for the cultivation setting.

This supersedes the earlier proposal to shorten housing/jobs/skills, introduce Echo upgrades, replace prestige rules, set new lifespan ceilings, change auto-buy budgeting or force new pacing targets.

- Preserve job incomes, XP curves, skill effects, multipliers, costs, upkeep, unlock requirements and ordering.
- Preserve all housing and miscellaneous items, including heroic variants and late-game effects.
- Preserve aging/time-warping rates, baseline lifespan calculations, automation decisions, record multipliers, all five prestige layers, reward formulas, reset/retention rules, milestones and challenges.
- Renaming changes display labels and flavor only. Keep internal keys initially; introduce separate display names without changing lookup behavior.
- Military and mage jobs now have the explicitly listed realm requirements in addition to their original prerequisites. Housing, skills and prestige retain their original unlock conditions.
- Tune Qi costs, generation, realm thresholds and Qi-specific rewards first. Any effect on existing earnings, XP, lifespan or prestige is a separately identified balance change, not an incidental consequence of reskinning.
- Save isolation and validation may improve reliability while preserving valid gameplay behavior. Preserve the existing one-hour offline cap as the baseline.

## Verified baseline

Repository: https://github.com/indomit/progress_knight_2

Downloaded main commit: `2c6c3c6ba45de78280bcc6df58a0a7f923c6a252`, dated 2025-10-04, "Merge pull request #105 from James103/fix/infinite-essence-gain". This is the downloaded revision, not a promise that upstream will remain there. The changelog's newest version heading is 2.5.0, which predates this commit.

Local development branch: `codex/cultivation-idle`. Remote: `upstream`. Full Git history is retained. No GitHub-hosted fork or publishing remote has been created.

Observed in the downloaded source:

- Static HTML, CSS and JavaScript, with explicit script ordering in `index.html`; no package build step is present.
- `js/main.js:update()` trains every unlocked Job and Skill. Only the current highest-income job pays, selected by `autoPromote()`. This differs from the existing Godot prototype's one selected skill.
- `js/classes.js:Task` owns levels, partial XP and previous-life records. Ordinary early records grant an XP multiplier of `1 + maxLevel / 10`; special late systems and challenges alter this.
- `js/main.js:autoBuy()` manages property and miscellaneous upkeep against income. Items are recurring expenses, not uniformly permanent purchases.
- Five reset entry points, `rebirthOne()` through `rebirthFive()`, have different retention rules. `rebirthReset()` is shared; editing it can affect every layer.
- `js/data.js` mixes content definitions with initial mutable state. Names are also lookup keys throughout effects, requirements, UI and saves.
- `js/main.js` owns simulation, reset logic, persistence and startup. The configured update rate is 20 Hz.
- Saves use the generic localStorage key `gameDataSave`; autosave runs every three seconds. Hard reset calls `localStorage.clear()`. Import assigns parsed data before a full semantic validation step.
- Offline progress already exists, capped at one hour and implemented through repeated updates. Do not assume longer catch-up is a safe constant change.
- `classes.js` includes Number/BigInt paths for extreme late-game XP. Preserve these initially and test boundaries before replacing the number model.
- No LICENSE or COPYING file was found in the downloaded tree. Record upstream attribution now; clarify reuse terms before publishing the derivative.

## First playable loop

Play through the existing Progress Knight Quest progression with cultivation-themed presentation and an additional Qi/realm track. All unlocked jobs and skills train simultaneously. The best eligible job pays, existing auto-buy selects equipment and housing, and the original lifespan and reincarnation mechanics remain active.

The first implementation milestone covers early-life Qi and one reincarnation for validation. It does not remove later upstream content or restrict the finished game to one prestige layer. Existing progression remains available under its original requirements throughout development.

### Qi cultivation: the new balance surface

Proposed realm presentation: Mortal → Qi Gathering I–III → Foundation Establishment I–III → Golden Core I–III, followed later by Nascent Soul, Soul Formation, Void Refinement and Immortal Ascension.

- Qi has its own state, generation rate, requirements and progress bar.
- First implement Qi with no feedback into upstream earnings, XP, item effects, lifespan or prestige. This allows a direct comparison against the original economy.
- Happiness multiplies Qi cultivation speed using the same effective happiness multiplier that Progress Knight computes for its existing training. Read `getHappiness()` once in the Qi rate formula; do not separately multiply housing or other contributions already included in happiness.
- Initial Qi rate: `baseQiRate * getHappiness()`. Apply elapsed time/game speed once through the simulation integration, separately from this rate. Additional Qi-specific factors must be explicitly defined before adding them.
- Qi cultivation has no inherited activity-record XP multiplier. Do not apply `1 + record / 10`, `Task.getMaxLevelMultiplier()`, or its late-game/challenge variants to Qi generation, cultivation XP or realm advancement. Cultivation is separate from the Task XP multiplier stack.
- Original jobs and skills retain their record bonuses. Those can help a new life rebuild its income, housing and happiness sooner, which can indirectly improve Qi speed; this is not a direct cultivation-record bonus.
- Other technique effects may inform Qi only through separately specified Qi formulas. Do not import the whole skill XP multiplier stack or multiply a happiness contribution twice.
- Prepared breakthroughs are deterministic for the first iteration. Tune realm requirements against measured upstream progression rather than changing the economy to hit arbitrary realm times.
- A breakthrough consumes Qi and changes realm/stage. It does not reset age, upstream levels or money.
- Minor-stage automation and manual major breakthroughs apply only to the Qi track. Waiting on a breakthrough must not pause original job/skill progress, aging or offline simulation.
- Qi may cap at the pending breakthrough. Describe that state clearly while the rest of the game continues.
- Major realms now multiply the inherited lifespan result by 1.5 per major realm; minor stages do not. The earlier fixed 70/100/180/350 replacement ceilings remain withdrawn.
- The basic reincarnation resets Qi and realm. Define Qi retention for each higher prestige explicitly before integrating it; preserve every existing field's original reset/keep behavior.

No additional focus multiplier for existing jobs or skills, no new Echo economy, and no paid upgrades to inherited memory or mortal lifespan in the baseline adaptation. A previous cultivation peak grants no automatic Qi speed bonus after reincarnation; any displayed highest realm is informational only.

### Preserve the complete housing ladder

All 27 entries in `itemCategories.Properties` remain, in their existing progression order:

1. Homeless
2. Tent
3. Wooden Hut
4. Cottage
5. House
6. Large House
7. Small Palace
8. Grand Palace
9. Town Ruler
10. City Ruler
11. Nation Ruler
12. Pocket Dimension
13. Void Realm
14. Void Universe
15. Astral Realm
16. Galactic Throne
17. Spaceship
18. Planet
19. Ringworld
20. Stellar Neighborhood
21. Galaxy
22. Supercluster
23. Galaxy Filament
24. Observable Universe
25. Multiverse
26. Quantum World
27. Boötes Void

Preserve every entry's expense, effect, `heromult`, `heroeffect`, unlock requirements and interactions with discounts, happiness and auto-buy. Do not reduce this ladder to five dwellings or replace coin requirements with realm gates. Heroic progression stays intact.

Possible display names, subject to art direction: Homeless → Open Sky; Wooden Hut → Cultivator's Hut; Small Palace → Sect Pavilion; Grand Palace → Sect Palace; Spaceship → Flying Palace; Galaxy → Star Domain. These are one-to-one naming examples, not changes to the items' function or progression. Several existing names, such as Pocket Dimension and Void Realm, already suit cultivation.

### Jobs, skills and miscellaneous equipment

Retain the full original catalogs and category structure. Adapt visible names and descriptions, rather than replacing them with the earlier eight-job/six-skill proposal. A technique renamed Meditation must retain its original effect; adding Qi generation is a separate, explicitly configured contribution.

Keep all 24 miscellaneous item entries and their existing cost/effect/unlock definitions, including late-game and heroic behavior. Books, study equipment, weapons, attendants and cosmic artifacts can become manuals, training tools, retainers and spiritual treasures without changing their numerical roles.

Preserve original housing selection and auto-buy affordability logic. Show upkeep and net income more clearly, but do not add a reserve requirement, spending cap or new purchase policy as part of the reskin.

### Reincarnation and the five prestige layers

Keep `rebirthOne()` through `rebirthFive()` and their current requirements, currencies, gain formulas, milestones, perks, challenge interactions and reset/retention behavior. Preserve the full record formula, including special late-game and challenge exceptions, rather than reducing it to a universal early-game multiplier.

Working thematic labels:

1. Basic rebirth → Reincarnation.
2. Evil progression → Soul Awakening.
3. Essence progression → Dao Ascension.
4. Dark Matter / Dark Orbs → Inner World progression.
5. Metaverse → Heavenly Cycle.

These labels are presentation proposals. They do not authorize new mechanics or currency conversions. Keep original internal names until a verified display-name layer is in place. The first rebirth remains available under the original conditions, not a new Qi-stage requirement.

Add a clear summary of what each reset retains. Compute any new Qi settlement exactly once; it must not alter or duplicate the inherited prestige rewards. No Echo currency or Echo upgrade shop is planned for this baseline.

## Interface

Keep the base game's information-rich layout, original content views and advanced tabs. Add a persistent cultivation strip showing realm, Qi, generation and the next breakthrough condition alongside age/lifespan and net income.

Use cultivation names consistently through the display-name layer in rows, tooltips, requirements and reset previews. Preserve the underlying semantic meaning and show the sources of multipliers. Housing continues to display its current effect, upkeep and unlock requirement.

A pending manual Qi breakthrough affects only that track. Offline summaries should report upstream gains as well as Qi gains; they must not imply the entire game stopped merely because the Qi bar filled.

## Implementation sequence and exit criteria

### 0. Capture the original balance — inventory and browser regression fixtures implemented

Record startup, early unlocks, housing progression, pause/resume, each reset, save round-trips and offline catch-up at the pinned upstream commit. Create a machine-readable inventory of every job, skill, property, miscellaneous item, requirement and numerical definition before modifying content.

Use isolated browser storage for baseline testing. Syntax checks and browser comparisons have passed for the first playable slice. Full natural multi-life/endgame playtests remain pending; see implementation notes for the exact fixture coverage.

Exit: inventory includes 27 properties and 24 miscellaneous entries, and representative early/late/heroic fixtures capture income, XP, upkeep, lifespan, automatic selections and prestige gains.

### 1. Isolate saves and add cultivation display names

Use fork-specific storage (`lianara.cultivation.v1`), a schema version, validated imports, migration backups and targeted key removal. Preserve valid save semantics. Add display names separately from internal keys; avoid global string replacement or broad structural refactoring.

Exit: a renamed game with Qi disabled reproduces upstream values, unlocks, automation and resets for the same starting states and elapsed ticks. Save/reset actions affect only the fork's own data. Every original item remains reachable under its original conditions.

### 2. Add the Qi track without economy feedback

Add Qi, realms, deterministic breakthroughs and cultivation UI. Use separate data/functions for Qi coefficients. Preserve upstream update ordering; isolate new events rather than rewriting original tick semantics incidentally.

Exit: the full inherited game still operates. With Qi effects disabled, upstream state matches the baseline. With Qi enabled but no feedback effects, upstream state still matches; only Qi-specific fields and UI differ. At a fixed base Qi rate and time scale, doubling effective happiness doubles Qi gain. With happiness and all current-life inputs held equal, changing inherited records or the previous highest realm does not change Qi gain. Verify housing contributes through happiness exactly once, including applicable happiness modifiers.

### 3. Integrate Qi with every reset and idle progression

Document and implement Qi reset/retention for all five layers. Preserve existing reward settlement and field retention. Offline progression uses the inherited cap and progression semantics, with new Qi handling alongside them. A full Qi bar must not interrupt original catch-up.

Exit: early and late reset fixtures match upstream on all inherited fields. Repeated reset commands cannot duplicate any new settlement, and pause/death/offline behavior follows the base game with explicit Qi-specific rules.

### 4. Tune Qi against the retained progression

Measure time to original unlocks and resets, then place realm thresholds around that rhythm. Assess realm-based lifespan or other cross-system effects separately, documenting before/after changes to existing progression. Adjust Qi first when the two systems do not fit.

Exit: a complete early multi-life playthrough demonstrates useful Qi progression while retaining the inherited balance. Any intentional deviation is listed with its rationale, affected formulas and measured consequence.

### 5. Extend thematic coverage

Finish naming and presentation across heroic content, milestones, challenges and all prestige layers. Keep their existing mechanics and balance. Sects, alchemy, combat, new challenges and new currencies are optional later expansions; they do not replace working upstream systems in this baseline.

## Code touchpoints

- `js/data.js`: preserve content/state values and requirements; reference a separate display-name mapping.
- `js/classes.js`: retain all XP, income, item and record calculations, including extreme-number paths.
- `js/main.js`: minimal save isolation, Qi integration and explicit Qi reset calls; preserve original ordering and automation.
- Proposed `js/cultivation.js`: Qi data, generation and realm transitions, isolated from inherited formulas.
- Proposed display-name mapping: cultivation labels keyed by unchanged upstream identifiers.
- `js/ui.js`, `js/tooltips.js`, `index.html`, CSS: presentation changes with equivalent effect descriptions.
- `js/evilperks.js`, `js/milestones.js`, `js/challenges.js`, `js/dark_matter.js`, `js/metaverse.js`: retained mechanics; extend presentation without disabling their progression.

Keep explicit script ordering and the current number model initially. For implementation, use baseline comparisons across representative saves and tick sequences, plus browser checks for naming, unlocks and UI behavior. An inventory alone cannot prove unchanged formulas or automation.

## Balance validation

The original game is the pacing reference. Withdraw the earlier 1–2 minute unlock, 20–40 minute reincarnation and 25–50% faster second-life targets; measure the inherited times instead. Do not force the original economy to match a newly invented schedule.

Compare income, expenses, selected housing/job, XP gains, unlock times, lifespan, record growth and prestige rewards against upstream with identical fixtures. Include ordinary and heroic housing, discounts, challenge modifiers and higher resets. New Qi fields are the explicit comparison exception; any proposed feedback into inherited fields requires its own measured explanation.

## Scope and next step

Confirmed direction: browser fork, existing title as working title, inherited balancing and full catalogs retained, thematic renaming allowed, Qi cultivation developed separately. Happiness affects Qi speed; cultivation receives no reincarnation record multiplier. This supersedes the initial reduced-content/Echo proposal.

Open design work: realm naming, Qi formulas, whether realms should later affect lifespan, and cultivation labels for late-game content. None requires discarding existing housing, items, jobs or prestige systems.

Next: playtest Qi pacing through complete lives, expand thematic naming, and evaluate future realm benefits while retaining the upstream balance reference. Save isolation, the initial display-name layer and the independent Qi track are implemented.
