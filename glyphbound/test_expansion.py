from pathlib import Path
from playwright.sync_api import sync_playwright
html=(Path(__file__).resolve().parent/'glyphbound.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for label,viewport,mobile in [('desktop',{'width':1250,'height':850},False),('iphone',{'width':390,'height':844},True)]:
  cx=b.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
  page=cx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.wait_for_timeout(1000)
  assert page.locator('#rpg-status').is_visible() and page.locator('#btn-attack').is_visible()
  # Crafting: actual UI transaction for new spear and rod
  page.evaluate("""() => Object.assign(GLYPHBOUND_DEBUG.state.inv,{wood:30,stone:30,fiber:20,hide:6,fish:2,berry:12,coin:10,seed:4})""")
  page.locator('#btn-craft').click()
  assert page.locator('button[data-recipe="spear"]').is_enabled()
  page.locator('button[data-recipe="spear"]').click()
  assert page.evaluate('GLYPHBOUND_DEBUG.state.rpg.equipment.spear')
  page.locator('button[data-recipe="rod"]').click()
  assert page.evaluate('GLYPHBOUND_DEBUG.state.rpg.equipment.rod')
  page.locator('#close-drawer').click()
  # Fight in real world; same combat API as onscreen key/button. Set wolf position via debug
  result=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG,s=g.state; s.x=126;s.z=117;const start=s.inv.hide;
    const a=g.rpgAttack();s.seconds+=.6;const b=g.rpgAttack();return {a,b,hides:s.inv.hide-start,kills:s.killCount,coins:s.inv.coin};}''')
  print(label,'combat',result)
  assert result['a'] and result['b'] and result['hides']>=2 and result['kills']>=1
  # Farming: build actual farmplot then plant, mature over 2 days and collect
  result=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG,s=g.state;s.x=128;s.z=132;g.chooseBuild('farmplot');g.placeBuild();const p=s.placed.find(x=>x.type==='farmplot');if(!p)return {error:'farm not built'};
    s.x=p.x;s.z=p.z;const before=s.inv.seed,a=g.rpgPlant();s.day+=2;const b=g.rpgPlant();return {a,b,seedBefore:before,seedAfter:s.inv.seed,berries:s.inv.berry,harvested:s.rpg.farms[0]?.harvested};}''')
  print(label,'farming',result)
  assert result['a'] and result['b'] and result['harvested']>=1
  # Trading with NPC proximity
  result=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG,s=g.state;s.x=118;s.z=143;let before=s.inv.coin;let ok=g.rpgTrade('buySeed');return {ok,before,after:s.inv.coin,seed:s.inv.seed,trades:s.rpg.trades};}''')
  print(label,'trade',result)
  assert result['ok'] and result['after']==result['before']-2 and result['trades']>=1
  page.locator('#close-drawer').click()
  # Fishing in water; use exact terrain look-up; live fishing action
  result=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG,s=g.state;let found=null;for(let z=120;z<170&&!found;z++)for(let x=143;x<176&&!found;x++){s.x=x;s.z=z;if(g.findFishSpot())found={x,z};}if(!found)return {error:'no shoreline'};const before=s.inv.fish;const fish=g.rpgFish();return {found,fish,delta:s.inv.fish-before};}''')
  print(label,'fishing',result)
  assert result['fish'] and result['delta']==1
  # Cooking by existing campfire; recipe requires proximity
  result=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG,s=g.state;s.x=128;s.z=132;s.placed.push({id:'testfire',type:'campfire',x:128,z:132,rotation:0});const c=g.rpgCraft('cooked');return {c,meal:s.inv.meal};}''')
  print(label,'cooking',result)
  assert result['c'] and result['meal']>=1
  # Jump and persistence: save and read all new systems back
  result=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG,s=g.state;const before=s.rpg.jumpHeight;g.closeDialog();g.rpgJump();g.rpgTick(.07);const raw=g.cleanSave();return {jump:s.rpg.jumpHeight,before,saved:!!raw.rpg,gear:raw.rpg.equipment.spear,kills:raw.killCount,harvested:raw.rpg.farms[0].harvested,fish:raw.rpg.fishCount};}''')
  print(label,'save',result)
  assert result['jump']>result['before'] and result['saved'] and result['gear'] and result['kills']>=1 and result['harvested']>=1 and result['fish']>=1
  page.locator('#btn-settings').click();assert page.locator('#audio-setting').is_visible();page.locator('#close-drawer').click()
  page.wait_for_timeout(350)
  assert not errors,errors
  page.locator('#viewport').screenshot(path=str(Path(__file__).resolve().parent/f'v2-{label}.png'))
  print(label,'PASS: combat, farming, market, fishing, cooking, jump, save',flush=True)
  cx.close()
 b.close()
print('ALL v0.2 EXPANSION TESTS PASS')