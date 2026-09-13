# Lianara: Cycle of Ascension

A cultivation idle game for the browser. Train techniques, take on sect duties, improve your sanctuary, and progress through forty major realms across successive lives.

[Play on GitHub Pages](https://patji-dev.github.io/lianara-cycle-of-ascension/)

## Run locally

With Node.js 22 or newer installed, run `npm start` and open http://127.0.0.1:8765. Set `PORT=8766` to use the previous local playtest address.

Saves belong to the browser and site address. Export your local save in Settings and import it on GitHub Pages to continue there.

## Develop and test

Run `npm ci`, then `npm test`. Tests use installed Microsoft Edge by default. For bundled Chromium, run `npx playwright install chromium` and set `PLAYWRIGHT_BROWSER=chromium`. Use a full Git clone: regression tests compare against an upstream commit retained in the web game's history.

Edit `content/cultivation-tuning.json`, then run `npm run realms:build`. See [balance testing](docs/BALANCE_TESTING.md) for simulations and pacing comparisons.

## GitHub Pages

Pushes to `main` run regression tests, build the playable files into `_site`, and deploy through GitHub Actions. Under Settings → Pages, select GitHub Actions as the source. Run `npm run build` to build locally. Tests, development tools, mockups and source documentation are excluded from the deployed site.

## Credits and permissions

- [Progress Knight](https://github.com/ihtasham42/progress-knight) — Ihtasham42.
- [Progress Knight 2.0](https://github.com/Symb1/progress_knight_2) — Symb1.
- [Progress Knight Quest](https://github.com/indomit/progress_knight_2) — indomit and contributors.

The project owner has obtained written permission from both fork authors. Those permissions do not establish a blanket open-source license for the combined project. The original Progress Knight uses the Unlicense. See [third-party notices](THIRD_PARTY_NOTICES.md); in-game attribution is under Settings → Credits.

## License

Rights to Patji-dev's original additions are reserved. You may play the authorized published game; no general modification, redistribution or rehosting license is granted for those additions. See [LICENSE](LICENSE). Upstream and third-party material retains its existing terms, as detailed in [third-party notices](THIRD_PARTY_NOTICES.md).
