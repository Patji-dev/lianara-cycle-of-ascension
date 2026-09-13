# Implementation — 11 September 2026

## Latest revision: 5% technique XP and complete cultivation terminology

The per-stage technique-XP bonus is now 5 percentage points, additive: +5% at Qi Gathering I, +20% at Foundation I and +45% at Golden Core III. Lifespan and job-gate tuning remain unchanged.

All jobs, techniques, dwellings, treasures, milestones and category names have explicit display mappings. The visible interface uses Inner Harmony (original happiness), Demonic Energy (evil), Dao Essence (essence), World Essence (dark matter), World Pearls (dark orbs), World Seals (hypercubes) and Heavenly Cycle (metaverse). Martial Hall and Spirit Arts Hall replace the military/mage categories. Reincarnation, demonic awakening, Dao ascension and inner-world actions retain their mechanics.

The rebirth story now centers on a soul jade and ancestral inheritance. The knight branding is replaced by a cultivation seal. Upstream attribution and the historical changelog remain intact.

The presentation layer translates only rendered text and accessibility labels. It never changes DOM IDs, handlers, formulas, catalog keys or save values. It handles dynamically refreshed labels/tooltips and protects already-translated phrases from repeated replacement. Imports/exports are excluded from translation. All existing version-1 saves remain compatible.

Browser checks cover every catalog entry, repeated-render stability, advanced panels, old-term leakage, the +45% final-stage value, BigInt XP, save round-trips and live timers. Desktop/mobile screenshots were inspected.

## Realm benefits and job gates

Implemented provisional ×1.5 lifespan per major realm and +5 percentage points of skill XP per stage. Neither directly multiplies Qi speed or job XP. Military and mage jobs have scattered additional realm gates; original prerequisites still apply. See the plan's latest-direction section for the full mapping.

Bonuses derive from current realm, so they reset automatically with each life and load correctly from existing version-1 saves. A cached completed requirement cannot bypass a realm gate. BigInt skill XP applies the percentage exactly before integer truncation.

The browser suite passes with checks across every stage, major/minor lifespan differences, ordinary and BigInt skill XP, unchanged direct Qi/job XP rates, job prerequisites, stale caches, save reload and reincarnation. Baseline comparisons now explicitly neutralize the authorized additions; separate tests exercise them enabled. Real timer, offline and save tests also pass.

The following records the earlier baseline slice; statements about no realm feedback describe that initial phase.

## Initial slice

## Playable slice

The browser fork now has an independent cultivation track through Golden Core III. The realm ladder and initial thresholds are defined in `js/cultivation.js`; they are prototype values, not final tuning. The base rate is 1 Qi per game day multiplied once by `getHappiness()`. The original time-warping/game-speed integration applies once. At baseline speed 4, 1× happiness produces 4 Qi per real second.

Major breakthroughs are manual and subject to Demonic Energy failure risk. Minor advancements remain guaranteed and can be automatic. Qi caps while waiting for a manual action and never halts jobs, skills, aging or offline catch-up. The full realm catalogue is active.

Every existing life reset clears Qi and realm. This includes all five prestige layers and challenge entry/exit. Highest realm and the minor-automation preference survive; the record has no mechanical effect. Qi receives no activity XP or record multipliers, including their challenge variants. Original jobs and skills retain all their bonuses.

Realms do not yet grant lifespan, income, training or prestige bonuses. Those are future integration decisions. Housing and other effects enter Qi only through effective happiness, so their contribution is not duplicated.

## Preserved baseline

`js/data.js`, `js/classes.js`, the original effect formulas and advanced prestige modules remain unchanged. All 27 properties and 24 miscellaneous items are retained, with their original requirements, expenses, effects and heroic values. A normalized upstream inventory is checked in at `tests/fixtures/upstream-balance.json` and compared against the fork at test time.

Display names are separate from the original identifiers. All catalog names now have a cultivation mapping. Rebirth lore, dwelling flavor, advanced treasury titles, resource labels and tooltips have been themed as well. The original job/skill tabs and compact layout remain.

## Persistence

`js/fork-save.js` stores a version-1 envelope under `lianara.cultivation.v1`. It does not read, overwrite or clear Progress Knight's `gameDataSave` key. Export/import includes UTF-8 names and preserves BigInt XP and Infinity values. Saves contain mutable state and original content identifiers rather than serialized DOM objects or executable callbacks.

Imports are validated before replacing stored data. The prior save is retained under `lianara.cultivation.v1.backup`. Invalid imports leave live/stored state intact. An unreadable stored save disables autosave and displays a recovery message rather than overwriting it. Hard reset removes only the fork's main and backup keys.

There is no upstream-save converter or old fork-schema migration yet. Unknown schemas are rejected without overwriting them; a migration must be added explicitly if the schema changes.

## Verification completed

The headless Edge regression suite passed:

- Original and fork browser startup; complete content/balance inventory comparison.
- Exact selected state comparison after 12,000 original simulation ticks (10 minutes).
- Full inherited-state comparison in heroic and challenge fixtures.
- Full inherited-state comparison for all five prestige resets, plus Qi reset/retention assertions.
- Happiness scaling, housing included once, challenge-modified happiness, no record bonus, paused/dead behavior, capped Qi and bounded automatic stages.
- The major-breakthrough dialog confirms the real realm advancement, preserving age and money and applying the configured major-realm lifespan multiplier.
- Versioned save reload/export/import, large BigInt XP, active equipment retention, wrong-game/future/incomplete/invalid imports and backup creation.
- Isolated hard reset and protection of unreadable stored saves.
- Identical online/offline update sequences and cultivation-panel layout at 1440px and 390px; screenshots inspected.
- Real worker timers, automatic saving and pause, without clock/timer stubs.

Most comparisons deliberately drive the original update function with controlled time. Prestige checks use prepared state fixtures rather than full natural playthroughs of every layer. This proves regression coverage for those cases, not full endgame balance or all offline wall-clock edge cases.

## Next work

Playtest and tune only the Qi thresholds against the retained progression; measure complete multi-life runs. Finish thematic names/tooltips and decide what higher cultivation realms should do before adding any feedback into lifespan or the economy. Keep original balance fixtures as the regression reference.

## Ink & Jade interface

The approved design study is now applied to the playable game through `css/ink-and-jade.css` and `js/ink-ui.js`.

- Settings theme 0 is Parchment; theme 1 is Dark Ink. Existing saved numeric preferences remain valid. Theme changes save and apply immediately without reloading. The Color Blind Friendly option retains its own palette.
- The Qi seal, age/lifespan, Harmony, technique XP, sanctuary effects and upkeep use the real game objects. The dwelling card uses the actual selected property; all 27 housing entries and 24 supplies remain in the original catalogue.
- Duties and techniques retain their original rendering and training behavior, with slim progress bars and expandable XP, record and description details. Standard and wide layouts remain supported.
- Major breakthroughs now show their real cost and effects in a confirmation dialog. Confirmation calls the same guarded game action. Minor automation is unchanged.
- The mountain and hut artwork is reused from the approved design study. Other dwellings currently share the mountain scene.
- Font-size settings now range from 16px to 32px. Keyboard navigation, visible focus, reduced motion and mobile layouts are supported. Focused controls own their keys so Space does not accidentally pause during a button action.
- Regression checks cover theme persistence across reloads, artwork loading, expandable details and keyboard interaction, every primary view at 320/390/768px, both layouts and enlarged text, alongside the existing balance/save/reset/offline checks.

### Mountain-scroll refinement

Parchment now uses an original generated shanshui painting (`img/parchment-mountains.png`), warm rice-paper colors, charcoal accents and muted red seals. Reference images guided the style only and are not shipped. The painting decorates the realm panel and sanctuary without adding text or obscuring live values.

Progress fills retain their original percentage widths and use `img/ink-brush-stroke.svg` as a dry-brush alpha mask. The Qi arc has a subtle displacement texture; its actual progress remains unchanged. Dark Ink and the accessible palette retain their colors with the new brush geometry. Verified empty, 25% and full widths, image loading, theme switching and mobile overflow.

### Residence catalogue and realm lifespan update

Wide now removes the Standard layout's page-width cap and fills the viewport. All 27 residences have distinct original ink-wash paintings, exported as local WebP assets. The selected home's painting appears in the sanctuary card in every theme; lazy-loaded thumbnails appear in the housing catalogue.

Player help contains only actionable rules, without fixed tuning numbers or implementation notes. Live stats and breakthrough previews continue to show the actual current effects.

Entering Qi Gathering no longer increases lifespan. Lifespan gains start on entering Foundation Establishment and occur on later configured major breakthroughs. Transition records now specify lifespan effects independently of whether a breakthrough is major, allowing future realm-specific tuning. Minor transitions and the first major transition have no lifespan effect. Existing save structure is unchanged.

Verified the first two major breakthroughs, every realm multiplier, all 27 image mappings and asset loads, responsive views, and full viewport use at 2560px, alongside the existing progression and save regression suite.

### Full realm ladder and balance lab

Activated the 40-major-realm, 190-minor-stage catalogue through a shared transition builder and generated browser bundle. Early thresholds and stage indices remain compatible; later costs are provisional and can be tuned globally or per transition. The terminal realm now displays a generic completion state.

Added an isolated headless exact-tick runner, resumable checkpoints, fixed-policy automation, synthetic late/endgame presets, machine-readable timelines and searchable HTML reports. A separate instant sweep projects all realm costs at selected Harmony values. See BALANCE_TESTING.md for commands and interpretation limits.

Synthetic late-game testing exposed an inherited XP loop-cap edge case that left remaining XP at -1 and prevented save validation. Both number and BigInt paths now clamp remaining XP to zero while preserving the inherited per-update level caps. Added regression coverage for that case, shared realm data, all-stage save round-trips and exact-tick parity.

### Demonic breakthrough layer

The demonic resource, arts, talents, awakening, covenants, and related descriptions now use Demonic terminology. Existing internal identifiers remain unchanged for save compatibility; independent soul/void imagery is retained.

Major breakthrough failure risk is 0.95 * log10(1 + Demonic Energy) / (10 + log10(1 + Demonic Energy)), with the infinite-energy limit explicitly handled as 95%. Heart Demon Suppression unlocks at 100 Energy and divides that risk by its Breakthrough Stability effect (1 + 0.01 per ordinary level, with normal inherited heroic skill scaling). It uses ordinary Demonic Arts training and reset rules. Below 100 Energy its mitigation is inactive. The extra art does not contribute to the inherited hero-count Essence multiplier.

A failed attempt consumes prepared Qi, retains the current/highest realm, saves that outcome, and displays feedback. Minor advancements remain guaranteed. The confirmation shows the current success chance and failure cost. Old v1 saves receive only the missing art/requirement defaults before strict validation.

The scroll places its breakthrough action into the mountain picture and removes the duplicate age, Harmony and Technique XP strip. Technique XP from cultivation appears beneath sidebar Harmony; the pause control remains in that sidebar. Sanctuary flavour text sits below its painting. Next-effect hints remain for techniques and treasures, but are hidden for duties and dwellings.

Verified forced success/failure, zero and infinite Energy, the unlock boundary and trained mitigation, old-save migration, all reset layers, original-balance comparisons, responsive layouts, and headless parity.

At 100 or more current Demonic Energy, major breakthroughs add 5 percentage points of risk per destination major realm: Qi Gathering adds 5 points, Foundation Establishment 10, and so on. Minor stages do not add increments and remain guaranteed. The combined logarithmic and realm risk is capped at 95% before Heart Demon Suppression divides it. Below 100 Energy only the original logarithmic risk applies.

### First-cycle pacing

Moved the base ordinary-reincarnation age from 65 to 53, producing a fresh-start unlock near one hour. Kept the demonic reset at age 200 after route measurements showed two early reincarnations reach it faster than zero or one. Both base ages are configurable in cultivation-tuning.json. Narrative reveal ages now support non-five-year tuning values and stay below the corresponding unlock; existing talent reductions remain effective. No count prerequisite or real-time timer is added.

The balance runner can compare early-reset counts and stop exactly at the first demonic reset, with reset timestamps in summaries and ordinary reset counts in events. Browser regressions cover unlocks, all talent reductions, and availability of demonic reset at zero ordinary reincarnations when its age requirement is met.
