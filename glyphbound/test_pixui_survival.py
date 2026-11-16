#!/usr/bin/env python3
"""v0.7 PixUI contract controls and gameplay acceptance on real Chromium desktop/mobile."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
layout=json.loads((root/'ui/layout.pixui.json').read_text())
theme=json.loads((root/'ui/theme.pixui.json').read_text())
assert layout['schema']=='prismtek.pixui-widgets/v1' and len(layout['widgets'])==5
assert theme['schema']=='prismtek.pixel-ui/v1'
assert all(len(w.get('choices',[]))<=8 for w in layout['widgets'])
html=(root/'glyphbound.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for label,w,h,mobile in [('desktop',1300,850,False),('mobile',390,844,True)]:
  cx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if mobile else 1,is_mobile=mobile,has_touch=mobile)
  page=cx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.wait_for_function("window.GLYPHBOUND_DEBUG && window.PrismtekPixUI && document.body.dataset.pixui")
  page.wait_for_timeout(600)
  assert page.locator('#pixui-hotbar button').count()==8
  assert page.locator('#pixui-playstatus').is_visible()
  assert page.evaluate("PrismtekPixUI.layout.schema")=="prismtek.pixui-widgets/v1"
  # Simulate an actual accessible quickbar press to open craft dialog
  page.locator('.pixui-slot[data-action="craft"]').click()
  assert page.locator('#drawer.open').count()==1
  page.locator('#close-drawer').click()
  # Test rest at camp + local persistence, without bypassing the action itself
  setup=page.evaluate('''()=>{const g=GLYPHBOUND_DEBUG,s=g.state;s.x=128;s.z=132;s.inv.wood=3;s.time=.75;s.day=2;s.yearDay=1;s.health=35;s.hunger=50;s.rpg.stamina=17;s.rpg.mana=22;s.placed.push({id:'v07-testfire',type:'campfire',x:128,z:132,rotation:0});return {before:s.day}}''')
  page.locator('.pixui-slot[data-action="rest"]').click()
  result=page.evaluate('''()=>{const s=GLYPHBOUND_DEBUG.state,save=GLYPHBOUND_DEBUG.cleanSave();return {health:s.health,hunger:s.hunger,stamina:s.rpg.stamina,mana:s.rpg.mana,wood:s.inv.wood,day:s.day,time:s.time,rests:s.rpg.restCount,saved:save.rpg.restCount,stats:PrismtekPixUI.stats}}''')
  assert abs(result['health']-77)<1 and abs(result['hunger']-68)<1 and result['stamina']==100 and result['mana']==100,result
  assert result['wood']==2 and result['rests']==1 and result['saved']==1 and result['day']==3 and abs(result['time']-.26)<.02,result
  assert abs(result['stats']['health']-77)<1,result
  # Scout via the actual PixUI quickbar; it must draw markers and cost mana
  page.locator('.pixui-slot[data-action="scout"]').click()
  result2=page.evaluate('''()=>{const g=GLYPHBOUND_DEBUG,s=g.state;g.render();return {scoutUntil:s.rpg.scoutUntil,seconds:s.seconds,mana:s.rpg.mana,active:s.rpg.scoutUntil>s.seconds,layout:document.body.dataset.pixui,buttons:document.querySelectorAll('.pixui-slot').length,target:document.querySelector('#pixui-target').textContent}}''')
  assert abs(result2['mana']-82)<1 and result2['active'] and result2['buttons']==8 and not errors,(result2,errors)
  page.screenshot(path=str(root/f'pixui-v07-{label}-page.png'),full_page=True)
  page.locator('#viewport').screenshot(path=str(root/f'pixui-v07-{label}-viewport.png'))
  print(label,'PASS',json.dumps({'rest':result,'scout':result2},ensure_ascii=False),flush=True)
  cx.close()
 b.close()
print('PASS v0.7 PixUI schema, rendered HUD, hotbar dispatch, camp rest, scouting, saves and desktop/mobile')