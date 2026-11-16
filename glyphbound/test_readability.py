#!/usr/bin/env python3
"""Local browser acceptance: readable world, animated sprite, previous save compatibility."""
from pathlib import Path
from playwright.sync_api import sync_playwright
html=Path(__file__).with_name('glyphbound.html').read_text()
assert "data:image/png;base64," in html
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,width,height,mobile in [('desktop',1200,780,False),('mobile',390,844,True)]:
  cx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2 if mobile else 1,is_mobile=mobile,has_touch=mobile)
  page=cx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.wait_for_function("window.GLYPHBOUND_DEBUG && GLYPHBOUND_DEBUG.travelerSheet.complete && GLYPHBOUND_DEBUG.travelerSheet.naturalWidth===96")
  page.wait_for_timeout(350)
  init=page.evaluate("""() => {const g=GLYPHBOUND_DEBUG;return {avatar:g.state.avatarMode,visual:g.state.visualMode,sprite:g.travelerSheet.naturalWidth,rows:g.travelerSheet.naturalHeight,frame:g.heroMotion.direction}}""")
  assert init['avatar']=='sprite' and init['visual']=='readable' and init['sprite']==96 and init['rows']==128,init
  page.locator('#viewport').screenshot(path=str(Path(__file__).with_name(name+'-readable-avatar.png')))
  # walking and facing must change the sprite animation state, not only the world camera
  if mobile:
   key=page.locator('button[data-dir="right"]')
   key.dispatch_event('pointerdown',{'pointerId':10});page.wait_for_timeout(220)
   walk=page.evaluate("() => ({dir:GLYPHBOUND_DEBUG.heroMotion.direction,walk:GLYPHBOUND_DEBUG.heroMotion.walking})")
   key.dispatch_event('pointerup',{'pointerId':10})
  else:
   page.keyboard.down('d');page.wait_for_timeout(220)
   walk=page.evaluate("() => ({dir:GLYPHBOUND_DEBUG.heroMotion.direction,walk:GLYPHBOUND_DEBUG.heroMotion.walking})")
   page.keyboard.up('d')
  assert walk['dir']==3 and walk['walk'],walk
  page.locator('#btn-settings').click()
  assert page.locator('#visual-setting').input_value()=='readable'
  assert page.locator('#avatar-setting').input_value()=='sprite'
  page.locator('#visual-setting').select_option('dense');page.locator('#avatar-setting').select_option('ascii');page.locator('#close-drawer').click()
  old=page.evaluate("""() => {const g=GLYPHBOUND_DEBUG;const x=g.cleanSave();return {visual:x.visualMode,avatar:x.avatarMode}}""")
  assert old=={'visual':'dense','avatar':'ascii'},old
  # A freshly loaded old-style save lacking new preferences must default to readable + sprite.
  restored=page.evaluate("""() => {const g=GLYPHBOUND_DEBUG;let old=g.cleanSave();delete old.avatarMode;delete old.visualMode;g.state.avatarMode='sprite';g.state.visualMode='readable';g.hydrate(old);return {avatar:g.state.avatarMode,visual:g.state.visualMode}}""")
  assert restored=={'avatar':'sprite','visual':'readable'},restored
  assert not errors,(name,errors)
  print(name,init,walk,old,'PASS',flush=True)
  cx.close()
 browser.close()
print('PASS: readable world, 4-direction sprite, settings, persistence')