const DOC_TITLE_MK='Патот на Слободата';
const TEXTS={
 "Патот на Слободата": "Path of Freedom",
 "Мисија на Александар": "Mission of Alexander",
 "Почеток": "Start",
 "Нивоа": "Levels",
 "Помош": "Help",
 "Звук": "Sound",
 "Квиз": "Quiz",
 "Продолжи": "Continue",
 "❓ Прашање за +15 мудрост": "❓ Question for +15 wisdom",
 "Следно ниво": "Next level",
 "Избери ниво": "Choose a level",
 "Затвори": "Close",
 "Пушти": "Play",
 "Пауза": "Pause"
};

(function(){
  const LANG_KEY='wpa_lang';
  function lang(){ return localStorage.getItem(LANG_KEY)||'mk'; }
  function t(mk){ return lang()==='en' ? (TEXTS[mk]||mk) : mk; }
  // swap map application via MutationObserver (covers dynamically rendered UI)
  function swapNode(node){
    if(!node.nodeValue) return;
    const v=node.nodeValue.trim();
    if(TEXTS[v]!==undefined){ node.nodeValue = node.nodeValue.replace(v, TEXTS[v]); }
  }
  function sweep(root){ const w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null); let n; while(n=w.nextNode()){ if(n.parentElement&&['SCRIPT','STYLE'].includes(n.parentElement.tagName)) continue; swapNode(n); } }
  const mo=new MutationObserver(ms=>{ ms.forEach(m=>m.addedNodes.forEach(nd=>{ if(nd.nodeType===3) swapNode(nd); else if(nd.nodeType===1) sweep(nd); })); });
  // toggle button
  function makeBtn(){
    const b=document.createElement('button');
    b.textContent = lang()==='en' ? '🌐 MK' : '🌐 EN';
    b.style.cssText='position:fixed;bottom:14px;right:14px;z-index:9999;background:#1a1a2e;color:#FFD700;border:2px solid #D4AF37;border-radius:10px;padding:8px 14px;font-size:15px;cursor:pointer;font-family:inherit';
    b.onclick=()=>{ localStorage.setItem(LANG_KEY, lang()==='en'?'mk':'en'); location.reload(); };
    document.body.appendChild(b);
  }
  // The optional Time Bridge challenge stores only a local mini-game souvenir.
  // It does not verify another GitHub origin or award an official national flag.
  function flagBadge(){
    if(localStorage.getItem('wpa_time_bridge_challenge') === '1'){
      const d=document.createElement('div');
      d.textContent=lang()==='en' ? 'Time Bridge mini-game completed (this device)' : 'Time Bridge: лична мини-игра завршена на овој уред';
      d.style.cssText='position:fixed;top:9px;left:50%;transform:translateX(-50%);z-index:999;background:#d4af37;color:#162032;border-radius:9px;padding:5px 12px;font:12px system-ui,sans-serif;font-weight:700;pointer-events:none';
      document.body.appendChild(d);
    }
  }

  function translateChrome(){
    if(lang()!=='en')return;
    const text={
      '.brand .sub':'Goce Delcev | Educational adventure | 37 levels',
      '.hero h2':'Goce Delcev',
      '.hero > p':'Run and jump through 37 levels. Collect stars and knowledge scrolls to learn about Goce Delcev and his historical context.',
      '.hero .quote':'"I understand the world only as a field of cultural competition among nations." - Goce Delcev',
      '.side-grid .card:first-child h3':'How to play',
      '.side-grid .card:first-child p':'Collect all the scrolls and stars required by the level, avoid hazards, and reach the finish gate. Companions recharge after 15 seconds.',
      '.side-grid .card:nth-child(2) h3':'Companions',
      '.side-grid .card:nth-child(3) h3':'Choose a level',
      '.hud .pill:nth-child(2)':'Controls: Left/Right, Space to jump (twice for double jump), P to pause',
      '.hud .pill:nth-child(3)':'Family-safe playtest',
      '#nameInput':'',
      '#songBtn':'Play song',
      '#musicBtn':'Music off'
    };
    Object.entries(text).forEach(([selector,value])=>{const e=document.querySelector(selector);if(!e)return;if(selector==='#nameInput')e.placeholder='Nickname (not full name)';else e.textContent=value;});
    const stats=['Level','Wisdom','Coins','Stars','Energy'];
    document.querySelectorAll('.stat span').forEach((e,i)=>{if(i<stats.length)e.textContent=stats[i]});
    const info=['Mission:','Fact:'];
    document.querySelectorAll('.info p strong').forEach((e,i)=>{if(i<info.length)e.textContent=info[i]});
    const b=document.querySelector('.player button');if(b)b.textContent='Save';
    const buttons=[...document.querySelectorAll('.hero .controls button')];
    if(buttons[1])buttons[1].textContent='Knowledge scroll';
    if(buttons[2])buttons[2].textContent='Quiz';
    if(buttons[3])buttons[3].textContent='Play song';
    if(buttons[4])buttons[4].textContent='Music off';
    const footer=document.querySelector('.footer');
    if(footer)footer.setAttribute('aria-label','Educational public playtest. Progress is local only.');
  }
  document.addEventListener('DOMContentLoaded',()=>{ document.documentElement.lang=lang(); if(lang()==='en'){sweep(document.body); translateChrome(); mo.observe(document.body,{childList:true,subtree:true});} makeBtn(); flagBadge(); document.title=t(DOC_TITLE_MK); });
  window.I18N={lang:lang,t:t,fact:typeof FACT_EN!=='undefined'?(i)=>{ if(lang()==='en'&&FACT_EN[i]) return {title:FACT_EN[i][0],text:FACT_EN[i][1]}; return null; }:null};
})();
