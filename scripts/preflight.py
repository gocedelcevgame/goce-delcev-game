#!/usr/bin/env python3
"""WPA educational game static preflight; stdlib-only, safe to run in GitHub Actions."""
from pathlib import Path
from html.parser import HTMLParser
import json,re,subprocess,sys,os,hashlib
ROOT=Path(__file__).resolve().parents[1]
errors=[]; checks=0

def ck(condition,label):
 global checks
 checks+=1
 if not condition: errors.append(label); print('FAIL',label)
 else:print('PASS',label)

class Links(HTMLParser):
 def __init__(self): super().__init__();self.refs=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in {'script','img','audio','source'} and a.get('src'):self.refs.append(a['src'])
  if tag=='link' and a.get('href') and a.get('rel') in {'stylesheet','manifest','icon','apple-touch-icon'}:self.refs.append(a['href'])

ck((ROOT/'index.html').is_file(),'root index.html')
for html in ROOT.rglob('*.html'):
 s=html.read_text('utf-8');p=Links();p.feed(s)
 for ref in p.refs:
  if ref.startswith(('https://','http://','data:','mailto:','//','#')):continue
  target=(html.parent/ref.split('?',1)[0].split('#',1)[0]).resolve()
  ck(target.is_file() and ROOT in target.parents, f'HTML asset {html.relative_to(ROOT)} -> {ref}')
for js in ROOT.rglob('*.js'):
 if 'vendor' in js.parts:continue
 if subprocess.run(['node','--check',str(js)],capture_output=True).returncode:
  ck(False,'JS syntax '+str(js.relative_to(ROOT)))
 else:ck(True,'JS syntax '+str(js.relative_to(ROOT)))
for j in ROOT.rglob('*.json'):
 try:json.loads(j.read_text('utf-8'));ck(True,'JSON '+str(j.relative_to(ROOT)))
 except Exception:ck(False,'JSON '+str(j.relative_to(ROOT)))
manifest=json.loads((ROOT/'manifest.json').read_text('utf-8'))
ck(manifest.get('display')=='standalone','PWA standalone')
ck(all((ROOT/o['src'].split('?')[0]).is_file() for o in manifest['icons']),'PWA icons available')
ck((ROOT/'sw.js').exists(),'Service worker present')
sw=(ROOT/'sw.js').read_text('utf-8')
match=re.search(r'const ASSETS\s*=\s*\[(.*?)\]\s*;',sw,re.S)
ck(bool(match),'Service worker precache manifest')
if match:
 paths=re.findall(r'"\.\/([^"\n]+)"',match.group(1))
 for p in paths:ck((ROOT/p).is_file(),'SW cache asset '+p)
edition=(ROOT/'edition.js').read_text('utf-8')
ck('"shop": false' in edition and '"ads": false' in edition,'No payment/ads in public playtest')
ck('"fullUnlock": true' in edition,'37 levels free during playtest')
ck((ROOT/'_headers').exists(),'Cloudflare Pages hardening file')
audio=list(ROOT.rglob('*.m4a'))
ck(len(audio)==1,'one owner-supplied soundtrack present')
if audio:
 ck(audio[0].stat().st_size>100_000,'song nonempty '+str(audio[0].relative_to(ROOT)))
 print('AUDIO_SHA256',hashlib.sha256(audio[0].read_bytes()).hexdigest())
if (ROOT/'data/levels.json').exists():
 levels=json.loads((ROOT/'data/levels.json').read_text('utf8'))
 en=json.loads((ROOT/'data/levels.en.json').read_text('utf8'))
 ck(len(levels)==len(en)==37,'37 levels MK and EN')
 ck(all(k.get('targetScrolls',0)>0 and k.get('targetStars',0)>0 for k in levels),'37 goals well-defined')
print('TOTAL',checks,'FAILED',len(errors))
if errors:print('ERRORS',*errors,sep='\n');sys.exit(1)
