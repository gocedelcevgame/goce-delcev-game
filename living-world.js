/* WPA Historical Adventures — Living Historical Worlds 1.0.
   Original procedural artwork + original algorithmic ambience; no analytics,
   tracking, location services, microphone, autoplay or third-party sound assets.
   This optional scenic layer NEVER registers physics bodies or covers controls. */
(function(global){
 'use strict';
 const PROJECT=(document.documentElement.dataset.game==='goce')?'goce':'alex';
 const STORE='wpa_living_worlds_'+PROJECT+'_';
 const MEDIA=['songbirds','brook','breeze','dusk-insects'];
 const SOURCES={songbirds:'assets/ambience/songbirds.mp3',brook:'assets/ambience/brook.mp3',breeze:'assets/ambience/breeze.mp3','dusk-insects':'assets/ambience/dusk-insects.mp3'};
 const saved=(key,otherwise)=>{try{const v=localStorage.getItem(STORE+key);return v===null?otherwise:v;}catch(e){return otherwise;}};
 const save=(key,value)=>{try{localStorage.setItem(STORE+key,String(value));}catch(e){}};
 let soundOn=saved('sound','0')==='1';
 let motionOn=saved('motion','1')!=='0';
 let volume=Math.max(0,Math.min(100,Number(saved('volume','38'))||0));
 let gameActive=false;
 let level=1;
 let musicPlaying=false;
 let sounds={};
 let audioBlocked=false;
 let installed=false;
 const reduceMotion=()=>!!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const motionEnabled=()=>motionOn&&!reduceMotion();
 const english=()=>!!(global.I18N&&typeof global.I18N.lang==='function'&&global.I18N.lang()==='en');
 const tr=(mk,en)=>english()?en:mk;
 // Site-appropriate evocative scenery, not a claim of archaeological reconstruction.
 function theme(n){
   n=Math.min(37,Math.max(1,parseInt(n,10)||1));
   if(PROJECT==='goce'){
     if([3,4,5,8,16,17,19,20,27,35,36].includes(n))return {kind:'town',birds:.35,brook:.18,breeze:.12,night:0,mk:'Историски град',en:'Historic town'};
     if([11,12,15,21,32,33].includes(n))return {kind:'mountain',birds:.55,brook:.32,breeze:.55,night:0,mk:'Планинска патека',en:'Mountain trail'};
     if([22,23].includes(n))return {kind:'night',birds:.05,brook:.12,breeze:.18,night:.58,mk:'Ноќна патека',en:'Night route'};
     if([1,2,6,7,9,13,18,29].includes(n))return {kind:'village',birds:.78,brook:.50,breeze:.17,night:0,mk:'Градина и селски двор',en:'Village garden'};
     if([28,31,34,37].includes(n))return {kind:'spring',birds:.70,brook:.43,breeze:.14,night:0,mk:'Светла градина',en:'Garden of hope'};
     return {kind:'meadow',birds:.63,brook:.40,breeze:.32,night:0,mk:'Ливади и потоци',en:'Meadows and streams'};
   }
   if([1,2,3,6,26,27,34,35,36,37].includes(n))return{kind:'royal',birds:.78,brook:.53,breeze:.12,night:0,mk:'Кралски градини',en:'Royal gardens'};
   if([4,5].includes(n))return{kind:'academy',birds:.88,brook:.59,breeze:.16,night:0,mk:'Градина на учењето',en:'Garden of learning'};
   if([8,9,21,22,23,24].includes(n))return{kind:'river',birds:.50,brook:.77,breeze:.19,night:0,mk:'Река и брегови',en:'Riverside'};
   if([11,12,13].includes(n))return{kind:'oasis',birds:.30,brook:.41,breeze:.33,night:0,mk:'Оаза и палмови сенки',en:'Oasis and shade'};
   if([18,19,20].includes(n))return{kind:'mountain',birds:.23,brook:.22,breeze:.62,night:0,mk:'Високи премини',en:'Mountain pass'};
   if([25].includes(n))return{kind:'desert',birds:0,brook:0,breeze:.82,night:0,mk:'Пустинска патека',en:'Desert route'};
   if([10,28,29,30,31,32].includes(n))return{kind:'coast',birds:.24,brook:.45,breeze:.38,night:0,mk:'Крајбрежен пат',en:'Coastal route'};
   if([14,15,16,17,33].includes(n))return{kind:'palace',birds:.35,brook:.35,breeze:.22,night:0,mk:'Антички дворови',en:'Ancient courtyards'};
   return{kind:'road',birds:.43,brook:.24,breeze:.32,night:0,mk:'Историски пат',en:'Historical road'};
 }
 function getAudio(key){
   if(!sounds[key]){
     const a=new Audio(SOURCES[key]);a.loop=true;a.preload='none';a.volume=0;
     a.addEventListener('error',()=>{audioBlocked=true;syncUI();});
     sounds[key]=a;
   }
   return sounds[key];
 }
 function shouldPlay(){return soundOn&&gameActive&&!document.hidden&&volume>0;}
 function refreshAudioMix(){
   const p=theme(level);const coef={songbirds:p.birds,brook:p.brook,breeze:p.breeze,'dusk-insects':p.night};
   // Keep nature under effects/dialogue; duck further when the owner's song plays.
   const duck=musicPlaying||(PROJECT==='alex'&&global.AQSong&&typeof global.AQSong.isPlaying==='function'&&global.AQSong.isPlaying());
   const factor=(volume/100)*(duck?.20:1)*.40;
   for(const key of MEDIA){
     const a=sounds[key];if(!a)continue;
     a.volume=Math.max(0,Math.min(1,(coef[key]||0)*factor));
     if(!shouldPlay()||coef[key]<=0.01){if(!a.paused)a.pause();}
   }
 }
 function syncAudio(){
   if(!shouldPlay()){
     for(const a of Object.values(sounds))if(!a.paused)a.pause();
     refreshAudioMix();syncUI();return;
   }
   const p=theme(level);const coef={songbirds:p.birds,brook:p.brook,breeze:p.breeze,'dusk-insects':p.night};
   for(const key of MEDIA){
     if(coef[key]<=0.01){if(sounds[key]&&!sounds[key].paused)sounds[key].pause();continue;}
     const a=getAudio(key);
     // Play originates from the nature button / Start mission click. Safari and
     // Chrome may reject it otherwise: never retry in a timer or bypass policy.
     if(a.paused){const attempt=a.play();if(attempt&&attempt.catch)attempt.catch(()=>{audioBlocked=true;syncUI();});}
   }
   refreshAudioMix();syncUI();
 }
 function syncUI(){
   for(const b of document.querySelectorAll('[data-nature-toggle]')){
     b.setAttribute('aria-pressed',String(soundOn));
     b.textContent=soundOn?tr('🔊 Природа: ВКЛ','🔊 Nature: ON'):tr('🔇 Природа: ИСКЛ','🔇 Nature: OFF');
   }
   for(const b of document.querySelectorAll('[data-motion-toggle]')){
     b.setAttribute('aria-pressed',String(motionEnabled()));
     b.textContent=motionEnabled()?tr('🍃 Анимации: ВКЛ','🍃 Animations: ON'):tr('🍃 Анимации: ИСКЛ','🍃 Animations: OFF');
   }
   for(const i of document.querySelectorAll('[data-nature-volume]'))i.value=String(volume);
   const p=theme(level);
   for(const e of document.querySelectorAll('[data-nature-caption]')){
     e.textContent=(english()?p.en:p.mk)+' · '+(audioBlocked?tr('Звукот бара повторен допир на копчето','Tap sound once more to enable'):
       !soundOn?tr('Звуците се исклучени','Nature sounds off'):
       gameActive?tr('Природен амбиент','Nature ambience'):tr('Звуците се слушаат кога играш','Sounds start during play'));
   }
   const st=document.getElementById('stage');if(st)st.classList.toggle('wl-static',!motionEnabled());
 }
 function toggleNature(){soundOn=!soundOn;audioBlocked=false;save('sound',soundOn?'1':'0');syncAudio();return soundOn;}
 function setVolume(v){volume=Math.max(0,Math.min(100,Number(v)||0));save('volume',volume);syncAudio();}
 function toggleMotion(){motionOn=!motionOn;save('motion',motionOn?'1':'0');if(PROJECT==='goce')decorateGoce(level);syncUI();return motionEnabled();}
 function setMusicPlaying(on){musicPlaying=Boolean(on);refreshAudioMix();}
 function setGameActive(active){gameActive=Boolean(active);syncAudio();}
 function setLevel(n){level=Math.min(37,Math.max(1,parseInt(n,10)||1));if(PROJECT==='goce')decorateGoce(level);syncAudio();}
 const span=(cl,style)=>`<span class="${cl}" style="${style}" aria-hidden="true"></span>`;
 function decorateGoce(n){
   const stage=document.getElementById('stage');if(!stage)return;
   let world=stage.querySelector('.wl-world');if(!world){world=document.createElement('div');world.className='wl-world';world.setAttribute('aria-hidden','true');const ground=stage.querySelector('.ground');stage.insertBefore(world,ground||null);}
   const p=theme(n);stage.dataset.livingTheme=p.kind;
   let html='';
   // Deliberately limited DOM count and no random time-sensitive decisions.
   const treeCount=p.kind==='town'?2:p.kind==='night'?3:5;
   for(let i=0;i<treeCount;i++){
     const left=[7,27,49,70,90][i];
     html+=span('wl-tree',`left:${left}%;--delay:-${i*1.1}s;--size:${.7+(i%3)*.13};`);
     if(i%2===1)html+=span('wl-flower',`left:${left+7}%;--delay:-${i}s;`);
   }
   if(['village','spring','meadow','town'].includes(p.kind)){
     html+=span('wl-fence','left:15%;width:29%;');
     html+=span('wl-fence','left:67%;width:22%;');
   }
   if(p.brook>.20){html+=span('wl-stream','left:30%;width:33%;');html+=span('wl-reeds','left:62%;');}
   if(p.kind==='night'){for(let i=0;i<6;i++)html+=span('wl-firefly',`left:${13+i*14}%;bottom:${132+(i%3)*30}px;--delay:-${i*.7}s;`);}
   if(p.birds>.08){html+=span('wl-bird','left:17%;top:22%;--delay:-2s;');html+=span('wl-bird','left:67%;top:31%;--delay:-5s;');}
   if(['village','meadow','spring'].includes(p.kind)){
     for(let i=0;i<4;i++)html+=span('wl-butterfly',`left:${20+i*19}%;bottom:${142+(i%2)*25}px;--delay:-${i*.8}s;`);
   }
   if(p.kind==='town')html+=span('wl-fountain','left:54%;');
   world.innerHTML=html;
   stage.classList.toggle('wl-static',!motionEnabled());
   syncUI();
 }
 function decoratePhaser(scene,n){
   if(PROJECT!=='alex'||!scene||!scene.add)return;
   const p=theme(n);const W=3000, moving=motionEnabled();
   const xscroll=moving?.78:0;
   const g=scene.add.graphics().setDepth(-9).setScrollFactor(xscroll);
   const isDry=p.kind==='desert';const isGreen=!['desert','coast','palace'].includes(p.kind);
   const leaf=isDry?0xB8A66F:p.kind==='oasis'?0x568A60:0x476F4B;
   // Trees and vines that form real garden routes but never overlap colliders.
   for(let x=160;x< W;x+=200){
     const offset=((x*37+n*19)%27)-13;const tx=x+offset;const base=437;
     if(isGreen){
       g.fillStyle(0x634B37,.68);g.fillRect(tx-4,base-76,9,73);
       g.fillStyle(leaf,.72);
       g.fillCircle(tx,base-91,25);g.fillCircle(tx-20,base-78,17);g.fillCircle(tx+21,base-84,20);
       if(p.kind==='royal'||p.kind==='academy'){
         g.fillStyle(0xC68B92,.82);g.fillCircle(tx-11,base-88,3);g.fillCircle(tx+12,base-98,3);
         g.fillStyle(0xE3B658,.65);g.fillRect(tx+41,base-38,4,34);
       }
     }else if(p.kind==='palace'||p.kind==='coast'){
       g.fillStyle(0xBBA67D,.35);g.fillRect(tx,base-98,24,94);g.fillRect(tx-6,base-103,36,8);
     }else{
       g.fillStyle(0xBFA16A,.32);g.fillTriangle(tx-15,base,tx+7,base-28,tx+28,base);
     }
     g.fillStyle(p.kind==='oasis'?0xDFAF65:0xD9B38B,.68);
     for(let j=0;j<3;j++)g.fillCircle(tx-42+j*24,base-14-((j+x)%8),2.5);
     if(['royal','academy','palace'].includes(p.kind)){
       g.fillStyle(0xB8A17E,.48);g.fillRect(tx+42,base-28,4,26);g.fillRect(tx+62,base-28,4,26);
       g.fillRect(tx+39,base-28,30,4);
     }
   }
   if(p.brook>.28){
     const w=scene.add.graphics().setDepth(-8).setScrollFactor(xscroll);
     for(let x=250;x<W;x+=670){
       w.fillStyle(0x387C8D,.60);w.fillRoundedRect(x,424,190,19,9);
       w.fillStyle(0xB3E6DC,.64);
       for(let i=0;i<5;i++)w.fillRect(x+8+i*38,430+(i%2)*4,19,2);
       if(['royal','academy','palace'].includes(p.kind)){
         w.fillStyle(0xC2B18C,.68);w.fillRoundedRect(x+63,411,60,10,4);
         w.fillStyle(0x75C6D4,.72);w.fillRect(x+87,394,3,22);
         w.fillStyle(0xB8E9E1,.85);w.fillCircle(x+88,391,4);
       }
     }
   }
   // Animated background silhouettes: subtle, low count and low alpha.
   if(p.birds>.16){
     for(let i=0;i<4;i++){
       const b=scene.add.graphics({x:230+i*690,y:135+(i%3)*37}).setDepth(-15).setAlpha(.42);
       b.lineStyle(2,0xE8E4CA,.85);b.lineBetween(-11,1,0,-4);b.lineBetween(0,-4,11,1);
       if(moving)scene.tweens.add({targets:b,x:b.x+230,y:b.y-16,duration:5200+i*700,yoyo:true,repeat:-1,ease:'Sine.InOut'});
     }
   }
   if(p.birds>.37&&['royal','academy','river','oasis','road'].includes(p.kind)){
     for(let i=0;i<5;i++){
       const wing=scene.add.ellipse(360+i*485,351+(i%2)*33,9,7,i%2?0xEDC98D:0xF1D5B1,.72).setDepth(-7);
       if(moving)scene.tweens.add({targets:wing,y:wing.y-11,scaleX:.45,duration:900+i*110,yoyo:true,repeat:-1,ease:'Sine.InOut'});
     }
   }
   if(p.kind==='desert'){
     const d=scene.add.graphics().setDepth(-8).setScrollFactor(xscroll);
     d.fillStyle(0xCFB277,.33);
     for(let x=80;x<W;x+=370)d.fillEllipse(x+110,444,180,13);
   }
 }
 function init(){if(installed)return;installed=true;syncUI();if(PROJECT==='goce')decorateGoce(level);document.addEventListener('visibilitychange',syncAudio);}
 document.addEventListener('DOMContentLoaded',init);
 if(document.readyState!=='loading')init();
 global.WPALiving={theme,setLevel,setGameActive,setMusicPlaying,toggleNature,toggleMotion,setVolume,motionEnabled,refreshAudioMix,decoratePhaser,decorateGoce,
   getStatus(){return{project:PROJECT,level,soundOn,motionOn,motionEnabled:motionEnabled(),volume,gameActive,audioBlocked,scene:theme(level).kind,playingChannels:Object.keys(sounds).filter(k=>!sounds[k].paused)};}};
})(window);
