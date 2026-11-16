#!/usr/bin/env python3
"""Generate Cloudflare Worker code with the bundled web game, ready for wrangler deploy.

No dependencies. The generated artifact must not be hand-edited; the repository source
remains server/worker.mjs plus the deterministic glyphbound.html build.
"""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
source=(root/'server/worker.mjs').read_text(encoding='utf-8')
html=(root/'glyphbound.html').read_text(encoding='utf-8')
marker='__GLYPHBOUND_HTML__'
if source.count(marker)!=2: raise SystemExit('Expected placeholder once in source and once in comment')
source=source.replace('const HTML = '+marker+';', 'const HTML = '+json.dumps(html,ensure_ascii=False)+';')
(root/'server/worker-built.mjs').write_text(source,encoding='utf-8')
print('Built server/worker-built.mjs')