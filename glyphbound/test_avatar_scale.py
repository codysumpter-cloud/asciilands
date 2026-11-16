#!/usr/bin/env python3
"""Browser regression: proportional character sprites and backwards-compatible preferences."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
html=(root/'glyphbound.html').read_text()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for name,width,height,mobile in [('desktop',1200,780,False),('mobile',390,844,True)]:
        c=browser.new_context(viewport={'width':width,'height':height}, device_scale_factor=2 if mobile else 1,is_mobile=mobile,has_touch=mobile)
        page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html)
        page.wait_for_function('window.GLYPHBOUND_DEBUG && GLYPHBOUND_DEBUG.travelerSheet.complete && GLYPHBOUND_DEBUG.travelerSheet.naturalWidth===96')
        page.wait_for_timeout(360)
        measurements=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG;const h=g.spriteScreenHeight(),peer=g.spriteScreenHeight(true);return {h,peer,size:g.state.avatarSize,zoom:g.state.zoom,grid:document.querySelector('#render-stats').textContent}}''')
        assert measurements['size']=='world' and 15<=measurements['h']<=47, measurements
        assert measurements['h']<=34 and measurements['peer']<measurements['h'],measurements
        page.locator('#viewport').screenshot(path=str(root/(f'v051-{name}-world.png')))
        page.locator('#btn-settings').click()
        assert page.locator('#avatar-size-setting').input_value()=='world'
        dims={}
        for mode in ['tiny','world','large']:
            page.locator('#avatar-size-setting').select_option(mode)
            dims[mode]=page.evaluate('() => GLYPHBOUND_DEBUG.spriteScreenHeight()')
        assert dims['tiny']<dims['world']<dims['large'],dims
        page.locator('#avatar-size-setting').select_option('world')
        page.locator('#close-drawer').click()
        data=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG;g.state.avatarSize='tiny';return JSON.parse(JSON.stringify(g.cleanSave()))}''')
        assert data['avatarSize']=='tiny'
        page.evaluate('''(saved) => {const g=GLYPHBOUND_DEBUG;g.state.avatarSize='large';g.hydrate(saved)}''',data)
        assert page.evaluate('GLYPHBOUND_DEBUG.state.avatarSize')=='tiny'
        restore=page.evaluate('''() => {const g=GLYPHBOUND_DEBUG;const old=g.cleanSave();delete old.avatarSize;g.state.avatarSize='world';g.hydrate(old);return g.state.avatarSize}''')
        assert restore=='world',restore
        page.evaluate('GLYPHBOUND_DEBUG.state.avatarSize="world"')
        page.locator('#viewport').screenshot(path=str(root/(f'v051-{name}-final.png')))
        assert not errors,errors
        print(name,measurements,dims,'PASS',flush=True)
        c.close()
    browser.close()
print('PASS: proportional avatar scaling, accessible options, save serialization and old-save migration')