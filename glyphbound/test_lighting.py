#!/usr/bin/env python3
"""Rendering and persistence regression across day/night, soft/strong edges, point lights, mobile.
This is a Chromium simulation of the canvas renderer, not an assertion of PBR.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
html=(root/'glyphbound.html').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,width,height,mobile in [('desktop',1200,780,False),('mobile',390,844,True)]:
  c=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2 if mobile else 1,is_mobile=mobile,has_touch=mobile)
  page=c.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content(html);page.wait_for_function('window.GLYPHBOUND_DEBUG && GLYPHBOUND_DEBUG.renderStats() && document.getElementById("viewport").classList.contains("ready")');page.wait_for_timeout(500)
  base=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG;const r=g.render();return {s:g.renderStats(),ret:r,visual:g.state.visualMode,avatar:g.state.avatarMode}}''')
  assert base['ret']['count']>500 and base['ret']['glyphCount']>300,base
  assert base['s']['edges']>50,base
  assert base['visual']=='readable' and base['avatar']=='sprite'
  page.locator('#viewport').screenshot(path=str(root/(name+'-lighting-day.png')))
  result=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG;
   g.state.placed.push({id:'lighting-qa',type:'campfire',x:g.state.x+2.8,z:g.state.z-2.8,rotation:0});
   const withLight=g.render(),withStats=g.renderStats();
   g.setTime(18/24);g.render();const sunset=g.renderStats().sun;
   g.setTime(1/24);g.render();const night=g.renderStats().sun;
   g.state.outlineMode='off';g.render();const off=g.renderStats().edges;
   g.state.outlineMode='strong';g.state.lightingMode='flat';g.render();const flat=g.renderStats();
   g.state.outlineMode='soft';g.state.lightingMode='dynamic';g.render();
   return {withLight,withStats,sunset,night,off,flat,now:g.cleanSave()};}''')
  assert result['withStats']['lights']>=1,result
  assert result['withStats']['sun']['elevation']>0,result
  assert result['sunset']['elevation']<.001 and result['night']['elevation']<0,result
  assert result['off']==0,result
  assert result['flat']['lights']==0,result
  assert result['now']['outlineMode']=='soft' and result['now']['lightingMode']=='dynamic',result
  page.locator('#viewport').screenshot(path=str(root/(name+'-lighting-night.png')))
  page.locator('#btn-settings').click()
  assert page.locator('#outline-setting').input_value()=='soft'
  assert page.locator('#lighting-setting').input_value()=='dynamic'
  page.locator('#outline-setting').select_option('strong');page.locator('#lighting-setting').select_option('flat')
  saved=page.evaluate("() => {const g=GLYPHBOUND_DEBUG;return {outline:g.cleanSave().outlineMode,light:g.cleanSave().lightingMode}}")
  assert saved=={'outline':'strong','light':'flat'},saved
  page.locator('#close-drawer').click();page.wait_for_timeout(300)
  assert not errors,errors
  print(name, {'day':base['s'],'lights':result['withStats']['lights'],'sunsetY':round(result['sunset']['elevation'],2),'nightY':round(result['night']['elevation'],2),'offEdges':result['off'],'saved':saved,'stats':page.locator('#render-stats').inner_text()},flush=True)
  c.close()
 browser.close()
print('PASS: directional sun, projected shadow buffer, point lights, outlines, player avatar, saves')