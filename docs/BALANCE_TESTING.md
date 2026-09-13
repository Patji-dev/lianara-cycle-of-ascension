# Balance testing

The live game now uses all 40 major realms and 190 named minor stages, plus Mortal. Minor-stage counts and names are fixed in the catalogue, not randomized for each player. The original first nine thresholds and save indices remain intact. Later Qi costs are provisional extensions, not a claim that the entire progression is balanced.

Run these commands from the repository root with Node.js installed. The exact runner uses Playwright and Microsoft Edge headlessly; install project dependencies with `npm install` if Playwright is unavailable. On this workstation it can also use the bundled Playwright runtime. `--browser chrome` and `--browser chromium` select alternatives (the selected browser must be installed).

## Exact gameplay simulation

```powershell
npm run balance -- run --hours 1000 --max-seconds 60
npm run balance -- run --save test-results/my-run/checkpoint.json --hours 1000 --max-seconds 60 --out test-results/continued
npm run balance -- run --preset late --hours 1 --max-seconds 60
npm run balance -- run --preset endgame --hours 1 --policy none --max-seconds 60
```

The runner calls the real game update at its normal 20 ticks per simulated second, as quickly as the CPU allows. Rendering, scheduled timers and autosaving are disabled in an isolated browser context. Your open game's save is untouched. It retains the real task, income, housing, Qi, aging, unlock and reincarnation calculations. It does not skip ahead by multiplying a tick's duration.

`--hours` is additional simulated play time, not in-world age. `--max-seconds` is the simulation's wall-clock budget, excluding browser startup. A budget expiry writes a checkpoint and reports `wall-time-limit`; it does not pretend to have completed the requested duration. Resume with `--save` using either a generated checkpoint or an exported game save. Offline time is suppressed on import.

The default `growth` policy attempts breakthroughs, buys eligible prestige upgrades in a fixed order, and chooses the highest eligible reincarnation tier. While alive it waits at least 300 simulated seconds in the current life and requires a prestige reward at least half the current currency. Tier-one reincarnation normally waits until death. `early` also permits living tier-one reincarnations. Change these heuristics with `--min-life-seconds` and `--gain-ratio`. `none` leaves purchase and reincarnation decisions alone, but still attempts breakthroughs. Existing game automation remains active according to the starting save.

These policies are reproducible baselines, not optimal players. They do not automatically optimize challenges or skill-tree choices. A death without an eligible policy action stops the run and is reported as blocked.

`fresh` is the default normal start. `late` and `endgame` grant synthetic resources, records and progression to stress-test expensive late-game calculations and the final realms. They demonstrate behavior and numerical stability, not that a player can earn those states. Imported saves have unknown provenance.

Each run writes an ignored `test-results/balance-run-...` directory (or `--out DIR`):

- `report.html`: searchable timeline, readable in a browser.
- `summary.json`: completion status, achieved duration, speed, highest realm, currencies, checkpoint validity and errors.
- `timeline.csv` and `events.json`: snapshots and realm/reincarnation events. Events are capped at 20,000; dropped events are counted.
- `checkpoint.json`: resumable game state.
- `configuration.json`: tuning and policy used for the run.

The stall counter measures time since a new highest realm within this run; it restarts when resuming. Infinity is serialized explicitly in reports and saves where supported by the inherited game. NaN resources or non-finite age stop the runner. Check `checkpointValid` before using a checkpoint.

## Instant full-ladder projection

```powershell
npm run balance:sweep -- --hours 1000
npm run balance:sweep -- --harmony 1,1e6,1e12,1e30,1e60 --speed 4 --hours 1000
```

This runs directly in Node and evaluates every threshold for each fixed Inner Harmony value. It writes `realms.csv`, `realms.json` and a searchable `report.html`, showing required Qi, stage and cumulative time, lifespan multipliers and Technique XP bonuses. `--speed` is game days per play second.

This is a cultivation-cost projection: it assumes immediate breakthroughs and ignores deaths, reincarnation, income and changes in Harmony. Use it to spot extreme cost jumps throughout the entire ladder, then test relevant checkpoints with the exact runner.

## Change tuning

Edit `content/cultivation-tuning.json`, then run:

```powershell
npm run realms:build
```

The generated `js/realm-catalogue.js` ships both names and tuning to the game. `js/realm-engine.js` builds the same transition data for the browser and CLI. A transition's cost is paid to leave that stage; its lifespan effect applies on entering the next stage. Per-stage `overrides` keyed by catalogue stage ID can set `qiCost` and `lifespanFactor`. First entry into cultivation and all minor transitions must retain a lifespan factor of one. The final stage has no further cost.

For isolated experiments, copy the tuning JSON and pass `--tuning path/to/candidate.json` to either tool. This does not change the live game's tuning. Preserve existing stage IDs and ordering when modifying the catalogue, since saves currently store numeric stage indices.

Qi continues to scale with Harmony and receives no reincarnation record multiplier. Technique XP bonuses and later major-realm lifespan factors remain configurable. The new content does not retune original jobs, housing or prestige systems.

## Verification and observed speed

Run `powershell -File tools/test.ps1` for catalogue, browser, save, simulation parity and existing regression checks. The suite compares a short headless run with ordinary game updates and round-trips all 191 realm states through saving.

On this workstation, a fresh one-hour simulation completed in about 3.6 seconds (roughly 1,000x). Large late-game BigInt calculations were slower, around 20–50x in short synthetic runs. A requested 1,000-hour continuation reached its wall limit after about five additional play hours; it was not a completed 1,000-hour playthrough. Use checkpoints and the instant projection together for long-horizon testing.

## Demonic breakthrough risk

Exact runs use the game's major-breakthrough failure rolls and record failed attempts in events.json. A fixed seeded random sequence (seed 1) makes each run reproducible from its starting state; a resumed run restarts that sequence, so split runs need not match a single uninterrupted run. The threshold sweep still assumes successful immediate breakthroughs and excludes retry costs or training Heart Demon Suppression.

## Compare first-demonic-reset routes

Run from a fresh state:

```powershell
npm run balance -- run --hours 12 --max-seconds 60 --normal-resets 2 --until-demonic true
```

Repeat with --normal-resets 0 and 1 to compare waiting versus early reincarnation. This option makes the growth policy choose up to that many ordinary resets before waiting for demonic progress; it does not alter game unlocks. Deaths can still require further ordinary resets, and a higher reset may be chosen earlier if it becomes eligible. The early policy already reincarnates whenever eligible; none ignores automatic reset choices.

--until-demonic true ends at the first tier-two reset in this run and reports milestone-reached. Summary fields firstReincarnationSeconds and firstDemonicSeconds give event times relative to this run (null if not reached). Rebirth events record the current normalReincarnations count. Existing saves may already have resets; --normal-resets compares their total ordinary reset count with the supplied target.

Current fresh-start measurements: ordinary reincarnation unlock 59m 19s; two early reincarnations reach the first demonic reset in 3h 42m 30s total, compared with 4h 42m 53s for no early resets and 5h 42m 12s for one. These are tested routes, not enforced timing or an optimal-strategy claim.
