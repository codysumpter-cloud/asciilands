from pathlib import Path
from playwright.sync_api import sync_playwright
html=(Path(__file__).resolve().parent/'glyphbound.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,dim,mobile in [('desktop',{'width':1200,'height':780},False),('phone',{'width':390,'height':844},True)]:
  cx=b.new_context(viewport=dim,is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
  page=cx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.wait_for_timeout(500)
  init=page.evaluate('''() => {const g=window.GLYPHBOUND_DEBUG;return {state:!!g,objects:g?.objectsNear(128,132,15).length,ground:g?.heightAt(128,132),biome:g?.biomeAt(128,132)}}''')
  print(name,'init',init,flush=True)
  # Walk through real harvesting mechanics: teleport camera for deterministic test, but use the real action method.
  r=page.evaluate('''() => { const g=window.GLYPHBOUND_DEBUG,s=g.state;let obj=g.objectsNear(128,132,18).find(o=>o.type==='birch');s.x=obj.x+.3;s.z=obj.z+.3;for(let i=0;i<3;i++)g.gather();return {type:obj.type,wood:s.inv.wood,removed:!!s.removed[obj.id],quest:s.quest.wood};}''')
  assert r['wood']>=3 and r['removed'] and r['quest'],('wood gathering',r);print('  wood gathering',r)
  r=page.evaluate('''() => {const g=window.GLYPHBOUND_DEBUG,s=g.state;let obj=g.objectsNear(128,132,18).find(o=>o.type==='rock');s.x=obj.x+.2;s.z=obj.z+.1;g.gather();g.gather();return {stone:s.inv.stone,removed:!!s.removed[obj.id],quest:s.quest.stone};}''')
  assert r['stone']>=3 and r['removed'],('stone gathering',r);print('  stone gathering',r)
  page.locator('#btn-craft').click();page.locator('button[data-recipe="axe"]').click()
  result=page.evaluate('''() => {const s=window.GLYPHBOUND_DEBUG.state;return {axe:s.craft.axe,quest:s.quest.axe,wood:s.inv.wood,stone:s.inv.stone}}''')
  assert result['axe'] and result['quest'];print('  axe crafting',result)
  # Give enough resources via gathering multiple nearby actual trees and rock nodes
  r=page.evaluate('''() => {const g=window.GLYPHBOUND_DEBUG,s=g.state;for(const obj of g.objectsNear(128,132,26)){if(s.inv.wood>=4&&s.inv.stone>=3)break;if(obj.type==='pine'||obj.type==='oak'||obj.type==='birch'||obj.type==='rock'){s.x=obj.x+.1;s.z=obj.z+.1;for(let i=0;i<(obj.type==='rock'?2:1);i++)g.gather();}}s.x=128;s.z=132;return {wood:s.inv.wood,stone:s.inv.stone}}''');print('  resources for camp',r)
  page.locator('#btn-build').click();assert page.locator('button[data-recipe="campfire"]').is_enabled();page.locator('button[data-recipe="campfire"]').click()
  page.locator('#btn-action').click();r=page.evaluate('''() => {const s=window.GLYPHBOUND_DEBUG.state;return {built:s.placed.map(x=>x.type),camp:s.quest.camp,location:s.fireplace}}''');print('  build placement',r)
  assert r['camp'] and 'campfire' in r['built']
  # Working movement on both keyboard and touch
  before=page.evaluate('''() => ({x:GLYPHBOUND_DEBUG.state.x,z:GLYPHBOUND_DEBUG.state.z})''')
  if mobile:
   page.locator('button[data-dir="up"]').dispatch_event('pointerdown',{'pointerId':11});page.wait_for_timeout(450);page.locator('button[data-dir="up"]').dispatch_event('pointerup',{'pointerId':11})
  else:
   page.keyboard.down('w');page.wait_for_timeout(450);page.keyboard.up('w')
  after=page.evaluate('''() => ({x:GLYPHBOUND_DEBUG.state.x,z:GLYPHBOUND_DEBUG.state.z})''')
  print('  movement',before,after)
  assert before!=after
  # Settings adjust quality and rain
  page.locator('#btn-settings').click();page.locator('#detail-setting').select_option('4.5');page.locator('#weather-setting').select_option('rain');page.locator('#close-drawer').click()
  page.wait_for_timeout(500);s=page.evaluate('''() => ({quality:GLYPHBOUND_DEBUG.state.quality,weather:GLYPHBOUND_DEBUG.state.weatherOverride,stats:document.querySelector('#render-stats').textContent})''')
  assert s['quality']==4.5 and s['weather']=='rain';print('  settings',s)
  assert not errors,('js errors',errors)
  page.locator('#viewport').screenshot(path=f'{Path(__file__).resolve().parent}/{name}-integration-rain.png')
  cx.close()
 b.close()
print('PASS ALL INTEGRATION TESTS')