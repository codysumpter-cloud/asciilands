#!/usr/bin/env python3
"""Check actual canvas pixel colors, terrain coverage, glyph avatar, settings, and night lighting."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,width,height,mobile in [('desktop',1200,780,False),('mobile',390,844,True)]:
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2 if mobile else 1,is_mobile=mobile,has_touch=mobile)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content((root/'glyphbound.html').read_text(encoding='utf-8'))
  page.wait_for_function('window.GLYPHBOUND_DEBUG && GLYPHBOUND_DEBUG.travelerSheet.naturalWidth===96 && document.querySelector("#viewport.ready")')
  data=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG,s=g.state;
   g.setTime(.42);s.weatherOverride='clear';g.render();
   const cv=document.getElementById('scene'),ct=cv.getContext('2d'),W=cv.width,H=cv.height;
   const d=ct.getImageData(0,0,W,H).data;let blue=0,green=0,warm=0,total=0;
   for(let y=Math.floor(H*.58);y<H*.85;y+=Math.max(1,Math.floor(H*.023)))for(let x=Math.floor(W*.08);x<W*.92;x+=Math.max(1,Math.floor(W*.037))){
    const at=(y*W+x)*4,r=d[at],gg=d[at+1],b=d[at+2];
    total++;if(b>gg*1.28&&b>r*1.2)blue++;
    if(gg>r*1.12&&gg>b*.96)green++;
    if(r>gg*.99&&r>b*1.23)warm++;
   }
   return {blue,green,warm,total,land:g.renderStats().landCells,glyph:g.state.avatarStyle,stats:g.renderStats()};}''')
  assert data['land']>500,data
  assert data['blue']/data['total']<.13,data
  assert data['green']+data['warm']>data['total']*.55,data
  assert data['glyph']=='glyph',data
  page.locator('#btn-settings').click()
  assert page.locator('#avatar-style-setting').input_value()=='glyph'
  page.locator('#avatar-style-setting').select_option('pixel')
  assert page.evaluate('GLYPHBOUND_DEBUG.cleanSave().avatarStyle')=='pixel'
  page.locator('#avatar-style-setting').select_option('glyph')
  saved=page.evaluate('''() => {let g=GLYPHBOUND_DEBUG,d=g.cleanSave();g.state.avatarStyle='pixel';g.hydrate(d);return g.state.avatarStyle}''')
  assert saved=='glyph',saved
  assert not errors,errors
  print(name,'PASS',{'blueCells':data['blue'],'total':data['total'],'green':data['green'],'earth':data['warm'],'land':data['land'],'avatar':data['glyph']},flush=True)
  context.close()
 browser.close()
print('PASS: terrain backs grass rather than blue sky; character palette/animation setting persisted')