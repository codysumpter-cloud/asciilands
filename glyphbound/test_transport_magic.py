from pathlib import Path
from playwright.sync_api import sync_playwright
html=(Path(__file__).resolve().parent/'glyphbound.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for w,mobile in [(1200,False),(390,True)]:
  page=b.new_page(viewport={'width':w,'height':844},is_mobile=mobile,has_touch=mobile)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html);page.wait_for_timeout(500)
  out=page.evaluate('''() => {let g=GLYPHBOUND_DEBUG,s=g.state;Object.assign(s.inv,{wood:30,stone:30,crystal:9,fiber:18});
 const raftCraft=g.rpgCraft('raft'),magicCraft=g.rpgCraft('staff');g.closeDialog();s.x=126;s.z=117;
 let spells=g.rpgSpell(),mana=s.rpg.mana;s.x=145;s.z=120;let near=g.findFishSpot();let launched=g.rpgSail();const boat={launched,sailing:s.rpg.sailing,x:s.x,z:s.z,water:!!near};let off=g.rpgSail();return {raftCraft,magicCraft,spells,mana,boat,off};}''')
  print(w,out,errors,flush=True)
  assert out['raftCraft'] and out['magicCraft'] and out['spells'] and out['mana']<100
  assert out['boat']['launched'] and out['boat']['sailing'] and out['off']
  assert not errors
  page.close()
 b.close()
print('PASS raft and magic')