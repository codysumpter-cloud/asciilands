#!/usr/bin/env python3
"""Build deterministic offline GLYPHBOUND HTML from the split web sources."""
from pathlib import Path
import base64
import argparse

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8').rstrip('\n')
for old,replacement in [
 ('<link rel="stylesheet" href="style.css">','<style>\n'+(root/'style.css').read_text(encoding='utf-8').rstrip('\n')+'\n</style>'),
 ('<script src="network.js"></script>','<script>\n'+(root/'network.js').read_text(encoding='utf-8').rstrip('\n')+'\n</script>'),
 ('<script src="game.js"></script>','<script>\n'+(root/'game.js').read_text(encoding='utf-8').rstrip('\n')+'\n</script>')]:
 if html.count(old)!=1: raise RuntimeError('Missing or duplicate source tag: '+old)
 html=html.replace(old,replacement)
# Embed the original 4-direction character spritesheet so the offline bundle is truly standalone.
sheet=base64.b64encode((root/'assets/traveler.png').read_bytes()).decode('ascii')
html=html.replace("travelerSheet.src='assets/traveler.png';","travelerSheet.src='data:image/png;base64,"+sheet+"';")
p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
dest=root/'glyphbound.html'
if args.check:
 if dest.read_text(encoding='utf-8')!=html: raise SystemExit('glyphbound.html is stale; run scripts/build_single.py')
 print('OK: standalone HTML matches split sources')
else:
 dest.write_text(html,encoding='utf-8');print('Built',dest, f'({len(html)} chars)')