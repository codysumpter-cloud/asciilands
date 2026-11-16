# Glyphbound / Asciicker / Asciilands parity audit

Date: 2026-11-16
Status: **No source port completed**. Glyphbound v0.1 is an independently implemented JavaScript prototype.

## Provenance and licensing

- Open-source engine: `msokalski/asciicker`, MIT license, https://github.com/msokalski/asciicker
- Reference game: https://asciilands.io/ (Asciilands, made by Qaz, based on Asciicker's renderer). The available MIT grant applies to the Asciicker repository, **not automatically to Asciilands gameplay code, artwork, or assets**.
- Glyphbound source: `game.js`, `style.css`, `index.html`, `glyphbound.html` in this folder. `README.md` explicitly states no Asciicker code or Asciilands assets were incorporated.

## Verified feature inventory

| System | Glyphbound | Original Asciicker repository | Asciilands reference | Parity |
| --- | --- | --- | --- | --- |
| Colored ASCII 3D | Custom JS heightfield raycast + glyph buffers (`traceTerrain`, `placeGlyph`) | Native renderer (`render.cpp`, `screen.cpp`, fonts) | Dense ASCII world | **Independent implementation; not ported** |
| Terrain / exploration | 264x264 deterministic terrain with fixed seed (`generateTerrain`, `heightAt`) | 3D gameplay demo | Shared connected continents, sailing | **Partial** |
| Movement / physics | Basic 3rd-person movement and terrain grounding | `physics.cpp`, `input.cpp`, `gamepad.cpp` | Survival game movement | **Partial; Asciicker physics not ported** |
| Inventory | 4 resource counters (`state.inv`) | `inventory.cpp` | Item stack inventory + equipment | **Partial; Asciicker inventory not ported** |
| Crafting | 1 equipment recipe (axe), 5 structure recipes (`RECIPES`) | Gameplay code in repository | Many stations, smelting, forging, gear, food | **Prototype only** |
| Building | Campfire, bench, floor, wall, roof (`placeBuild`) | Gameplay demo | Towns, nations, piers, ships, plots, permissions | **Prototype only** |
| Animals / combat | Ambient deer, foxes, rabbits; harvesting | `enemygen.cpp`, gameplay components | Combat, enemies, spells, companions | **Most missing** |
| Weather / time | Rain/clouds, daylight (`weather`, `skyLight`) | Native engine rendering and game code | Dynamic world events | **Basic prototype** |
| Audio | None in Glyphbound | `audio.cpp` | Music / sound | **Missing** |
| Multiplayer | No network protocol or backend | `network.cpp`, `game_svr.cpp`, `multiplayer.txt` | Persistent server worlds, friends, parties, towns | **Missing** |
| Persistence | Browser-local `localStorage`, JSON import/export | Server/game infrastructure in repository | Server-side shared world + account continuity | **Not equivalent** |
| UI / controls | Keyboard and touch controls, crafting drawer, map | Native and web UI / gamepad code | Broader game menus, market, social interface | **Partial** |
| Fishing, farming, magic, ships, trade | Not implemented | Not asserted as Asciicker features | Present in Asciilands as of 2026-11-16 | **Missing** |

## What `build it` should mean next

1. Bring the unchanged Asciicker MIT source into a separate third-party/source-reference directory, with original LICENSE and source attribution. Record exact commit and preserve provenance. Do **not** overwrite Glyphbound or 3d-pixel-demo.
2. Verify Asciicker's browser build (`build-web.sh`, C++/Emscripten) and smoke-test a real 3D ASCII scene. Compare its visual output and performance with Glyphbound at matching character density.
3. Decide between retaining Asciicker as a WebAssembly renderer or implementing a licensed port of its renderer primitives; keep gameplay and renderer separate behind a stable interface.
4. Implement full inventory, item stacks, gear, physics/collision, world streaming, deeper building, stations, farming, fishing, combat, then network synchronization and server authority as independent tested milestones.
5. Build Asciilands-*inspired* shared-world mechanics without copying unlicensed code or assets. Run parity tests and update this matrix with verified results after each milestone.

## Important: completed vs proposed

- **Completed:** Original, playable single-player JavaScript prototype, basic resources, crafting and building, local save, weather and day/night, mobile UI.
- **Not completed:** Asciicker source import / build, compiled renderer, original physics/inventory/network/audio port, Asciilands feature parity, server-side multiplayer.

Sources inspected 2026-11-16:
- https://github.com/msokalski/asciicker
- https://asciilands.io/
- https://asciilands.itch.io/asciilands