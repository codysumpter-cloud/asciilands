#!/usr/bin/env python3
from pathlib import Path
import subprocess
r=Path(__file__).resolve().parents[1]
for p in ['game.js','network.js','server/worker.mjs']:
    subprocess.run(['node','--check',p],cwd=r,check=True)
subprocess.run(['python3','scripts/build_single.py','--check'],cwd=r,check=True)
s=(r/'index.html').read_text()
for id in ['btn-coop','btn-action','btn-build','btn-attack','btn-fish','btn-spell','btn-settings','scene']:
    assert 'id="'+id+'"' in s, id
assert (r/'assets/traveler.png').is_file()
assert 'drawSpriteAt' in (r/'game.js').read_text()
assert 'data:image/png;base64,' in (r/'glyphbound.html').read_text()
assert 'https://github.com/msokalski/asciicker' in (r/'README.md').read_text()
print('PASS: source syntax, bundled HTML, DOM contracts, provenance')