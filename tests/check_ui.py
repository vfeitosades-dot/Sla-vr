from playwright.sync_api import sync_playwright
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1280,'height':720});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((ROOT / 'src/index.html').read_text());page.wait_for_timeout(400)
 page.screenshot(path=str(ROOT / 'preview.png'))
 def click(id):
  r=page.evaluate('(id)=>hits.find(h=>h.id===id)',id);assert r,id;page.mouse.click(r['x']+r['w']/2,r['y']+r['h']/2);page.wait_for_timeout(80)
 for i,expected in enumerate(['gallery','cinema','environments','orbit','breathe','browser','settings','camera']):
  page.evaluate("navigate('apps'); filter='Todos'");page.wait_for_timeout(40);click('app'+str(i));assert page.evaluate('page')==expected
 page.evaluate("navigate('help')");page.wait_for_timeout(40);assert page.evaluate('page')=='help'
 page.evaluate("navigate('environments')");page.wait_for_timeout(40);click('env2');assert page.evaluate('environment')==2
 page.evaluate("navigate('orbit')");page.wait_for_timeout(40);click('start');click('orb0');assert page.evaluate('score')==1
 page.evaluate("navigate('apps');environment=0");page.click('#mode');page.wait_for_timeout(100);assert page.evaluate('vr')
 assert page.evaluate("hits.filter(h=>h.id==='app0').length")==2
 page.screenshot(path=str(ROOT / 'preview-vr.png'))
 page.set_viewport_size({'width':854,'height':393});page.wait_for_timeout(80)
 assert page.evaluate("hits.filter(h=>h.id==='dock2').every(h=>h.y+h.h<=H)")
 assert not errors,errors
 print('PASS: 8 apps, environments, game scoring, stereo targets and phone layout; no JavaScript errors')
 b.close()

