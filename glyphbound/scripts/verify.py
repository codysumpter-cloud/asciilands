#!/usr/bin/env python3
from pathlib import Path
import subprocess
r=Path(__file__).resolve().parents[1]
for p in ['game.js','network.js','pixui-web.js','server/worker.mjs']:
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

import json
layout=json.loads((r/'ui/layout.pixui.json').read_text())
theme=json.loads((r/'ui/theme.pixui.json').read_text())
assert layout['schema']=='prismtek.pixui-widgets/v1' and layout['engine']=='phaser4'
assert theme['schema']=='prismtek.pixel-ui/v1' and theme['engine']=='phaser4'
assert len(layout['widgets'])<=48 and all(w['kind'] in ('progress','text','quest','hotbar','minimap') for w in layout['widgets'])
assert 'PrismtekPixUI' in (r/'pixui-web.js').read_text()
print('PASS: shared Prismtek PixUI widget and theme contracts')

import re
h=(r/'index.html').read_text()
for id,doc in [('pixui-layout',layout),('pixui-theme',theme)]:
    pattern=r'<script type="application/json" id="'+id+r'">(.*?)</script>'
    found=re.search(pattern,h,re.S)
    assert found and json.loads(found.group(1))==doc, id+' differs from shared contract source'
print('PASS: browser and Studio PixUI contract copies match')