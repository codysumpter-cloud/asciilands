# Glyphbound — Living ASCII Wilderness (v0.4)

**Play:** `glyphbound.html` is a dependency-free offline browser game. `index.html` + `style.css` + `network.js` + `game.js` are the editable sources.

> **Repository layout:** This game lives under `glyphbound/` to preserve the pre-existing `asciilands` PHP action RPG at the repository root. The older root game is GPL-3.0; this independently written subproject is MIT licensed. Do not assume one project's licensing covers the other's assets.

## Playable now

- Deterministic 264×264 world with mountain, forest, meadow, marsh, beach, river, lake, and snow biomes.
- Software heightfield and object projection into a colored 3D ASCII grid (4.5 / 6 / 8 / 11 px presets).
- Mouse/touch orbit and zoom; keyboard and touch movement; sprint and jump; minimap and world map.
- Wood, stone, crystal, berries, seeds, fiber, meat, fish, hide, and coin resource economy.
- Gathering, crafting, tools, equipment, combat/loot/XP, farming, fishing, cooking, merchant trades, and a craftable raft.
- Placeable campfires, benches, flooring, timber walls, roofs, gardens, docks, and lanterns.
- Weather, day/night, NPC merchants, deer/rabbits/foxes and wolves, hunger/health/stamina/mana.
- Local browser autosave, save JSON export/import, accessibility labels, and mobile controls.
- Optional **guest co-op** via Cloudflare Durable Objects: other travelers' positions, chat, and shared placed structures in URL-based rooms.

Guest co-op is a **prototype**. Each client's inventory/combat is local and can be modified locally. The server has no login, abuse moderation, authoritative combat, or economy enforcement. Anyone holding a room link can enter. Keep valuable private data out of public chat.

## Run

Standalone: open `glyphbound.html` in a modern browser. If your phone's attachment preview blocks JavaScript, open the hosted URL directly in Safari instead.

Local development: from this folder run `python3 -m http.server 8080`, then open `http://localhost:8080`.

Rebuild the portable file after modifying the split sources:

```sh
python3 scripts/build_single.py
python3 scripts/build_single.py --check
node --check game.js
node --check network.js
node --check server/worker.mjs
```

The standalone version works offline. Multiplayer requires a separately deployed Cloudflare Worker with the `ROOMS` SQLite-backed Durable Object binding. To deploy from this directory:

```sh
python3 scripts/build_worker.py
npx wrangler deploy
```

`wrangler.toml` names a standalone `glyphbound-coop` service, **not** the main Prismtek website or existing Asciilands PHP app. If using a different Worker, edit `name` in `wrangler.toml` before deploy.

## Test

Automated Chromium tests require Python and Playwright plus Chromium. These are local validation scripts, not a promise that the application implements all of Asciicker or Asciilands:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 test_expansion.py
python3 test_transport_magic.py
python3 integration_test.py
```

Tests inject resources into an isolated test page to exercise the crafting and combat workflows. Browser actions and saves are verified; no multiplayer load test or cross-browser Safari proof is claimed.

## Provenance and feature parity

- The **original Asciicker** by gumix/msokalski is MIT licensed: https://github.com/msokalski/asciicker
- This folder **does not yet embed, compile, or link the original Asciicker C++ renderer and engine**. Its Javascript terrain renderer and gameplay were independently developed.
- The **Asciilands** video shows a more extensive 3D ASCII multiplayer survival sandbox; this prototype does not contain its proprietary source/assets or all of its systems.
- **Not yet complete:** Original Asciicker C++/Wasm port and asset pipeline, server-authoritative multiplayer, persistent global ecosystem, boats/physics parity, player accounts, MMO scale, and complex quests.

See `ASCIICKER_PARITY_AUDIT.md` for the detailed earlier inventory. Further ports should include original MIT attribution and separate validated benchmarks. Do not claim engine parity until it is measured.

License for files under this directory: [MIT](LICENSE). No Asciicker code has been copied into this subproject at this stage.

## v0.4 visual readability pass

The renderer now defaults to **Readable** terrain (gentler distant glyph contrast, retained 6 px glyph detail) and an original animated four-direction traveler sprite with a high-contrast outline. The player and connected guests have proper pixel-art avatars rather than single-character markers. In Settings, switch to **Dense** to preserve the old full-density ASCII aesthetic or choose **Classic ASCII glyph** for the original player marker. The sprite asset at `assets/traveler.png` is built from the repository-owned editable `scripts/generate_traveler.py`. Offline HTML includes the sprite as embedded PNG data. Original saved games remain compatible.