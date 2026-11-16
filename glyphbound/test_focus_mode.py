from pathlib import Path
from playwright.sync_api import sync_playwright
html=Path(__file__).with_name('glyphbound.html').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for label,viewport,mobile in [('desktop',{'width':1280,'height':860},False),('mobile',{'width':390,'height':844},True)]:
  cx=browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
  page=cx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.wait_for_function('window.GLYPHBOUND_DEBUG')
  page.evaluate("()=>{GLYPHBOUND_DEBUG.setTime(.45);document.getElementById('toast').classList.remove('show')}")
  page.wait_for_timeout(500)
  page.screenshot(path=str(Path(__file__).with_name('v07-'+label+'-day.png')))
  initial=page.locator('#viewport').bounding_box()['height']
  page.locator('#btn-focus').click()
  assert page.locator('.app.is-immersive').count()==1
  focus=page.locator('#viewport').bounding_box()['height']
  assert focus>initial,(label,initial,focus)
  assert page.evaluate('GLYPHBOUND_DEBUG.cleanSave().focusMode')
  page.screenshot(path=str(Path(__file__).with_name('v07-'+label+'-focus.png')))
  page.locator('#btn-focus').click()
  assert page.locator('.app.is-immersive').count()==0
  assert not errors,errors
  print(label,'PASS focus',round(initial),round(focus),flush=True)
  cx.close()
 browser.close()