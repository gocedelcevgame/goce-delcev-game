// ============================================================
// ПАТОТ НА СЛОБОДАТА — ГОЦЕ ДЕЛЧЕВ · v2.1
// Образовна, семејно безбедна игра. Сите податоци се чуваат локално.
// ============================================================
const $ = (id) => document.getElementById(id);
const VERSION = '2.5.2';

let levels = [];
let quiz = [];

function readNum(key, fallback){ const raw = localStorage.getItem(key); const v = Number(raw); return raw !== null && Number.isFinite(v) ? v : fallback; }
function readJSON(key, fallback){ try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch(e){ return fallback; } }

let state = {
  playerName: localStorage.getItem("gd_player") || "Гостин",
  level: readNum("gd_level", 1),
  maxCompleted: readNum("gd_completed", 0),
  wisdom: readNum("gd_wisdom", 0),
  coins: readNum("gd_coins", 0),
  stars: readNum("gd_stars", 0),
  quizDone: readJSON("gd_quiz", {}),
  scrolls: 0,
  levelStars: 0,
  energy: 3,
  playing: false,
  paused: false,
  premiumUnlocked: localStorage.getItem("gd_premium") === "1"
};

// ---------- Премиум (чесен тек: родител → плаќање → код) ----------
// ЗА СОПСТВЕНИКОТ: види docs/PREMIUM_SETUP.md
// SECURITY NOTICE: Client-side hashes and localStorage are NOT payment verification.
// Do not offer paid unlocks until a trusted checkout and server verification exist.
const PREMIUM_CONFIG = {
  freeLevels: (window.GAME_EDITION && window.GAME_EDITION.fullUnlock) ? 37 : 8, // web: 1-8 бесплатни + код; itch/GameMonetize: целосно отклучено
  price: '$0.99',
  paymentUrl: '',
  contactEmail: 'gocedelcevgame@gmail.com',
  codeHashes: []
};

const GROUND = 78;
const PLAYER_W = 40, PLAYER_H = 56;
let player = { x: 80, y: GROUND, vy: 0, w: PLAYER_W, h: PLAYER_H, onGround: true, doubleReady: true };
let keys = {};
let objects = [];
let lastSpawnX = 0;          // поминат пат од последниот објект (пиксели)
let lastHazardGap = 999;
let lastTime = 0;
let invulnUntil = 0;
let power = { shield: 0, slow: 0, magnet: 0 };
const COMPANION_COOLDOWN = 15000;
let companionReadyAt = { dame: 0, jane: 0, gjorce: 0, pere: 0 };
let audio = { ctx: null, on: false, timer: null };

// ---------- Почеток ----------
async function init(){
  try {
    const base = await fetch('data/levels.json');
    if (!base.ok) throw new Error('Missing level data');
    levels = await base.json();
    if (!Array.isArray(levels) || levels.length !== 37) throw new Error('Expected 37 levels');
  } catch(e) {
    console.error('[GOCE] Failed to load the 37 level definitions', e);
    levels = [];
  }
  try {
    const response = await fetch('data/quiz.json');
    quiz = response.ok ? await response.json() : [];
  } catch(e) { console.warn('[GOCE] quiz MK unavailable', e); quiz = []; }
  if (window.I18N && I18N.lang() === 'en') {
    try {
      const response = await fetch('data/levels.en.json');
      if (!response.ok) throw new Error('English translations unavailable');
      const translations = await response.json();
      const byId = new Map(translations.map(item => [Number(item.id), item]));
      // The engine must always retain its objectives, targets, rewards and speed.
      levels = levels.map(baseLevel => {
        const translated = byId.get(baseLevel.id);
        return translated ? {
          ...baseLevel,
          title: translated.title || baseLevel.title,
          historicalFact: translated.fact || baseLevel.historicalFact,
          objective: translated.objective || baseLevel.objective,
          place: translated.place || baseLevel.place,
          difficulty: translated.difficulty || baseLevel.difficulty
        } : baseLevel;
      });
    } catch(e) { console.warn('[GOCE] Using original level text', e); }
    try {
      const response = await fetch('data/quiz.en.json');
      if (response.ok) {
        const englishQuizzes = await response.json();
        if (Array.isArray(englishQuizzes) && englishQuizzes.length === 37) quiz = englishQuizzes;
      }
    } catch(e) { console.warn('[GOCE] English quizzes unavailable', e); }
  }
  if (levels.length !== 37) {
    const notice = $('objective');
    if (notice) notice.textContent = 'Game data did not load. Refresh while online / Податоците не се вчитаа. Освежи со интернет.';
    if ($('startBtn')) $('startBtn').disabled = true;
    return;
  }
  if (state.level > state.maxCompleted + 1) state.level = Math.max(1, state.maxCompleted + 1);
  $("nameInput").value = state.playerName === "Гостин" ? "" : state.playerName;
  document.querySelectorAll('[data-premium-price]').forEach(el => el.textContent = PREMIUM_CONFIG.price);
  bindHoldButtons();
  renderLevels();
  resetLevel();
  requestAnimationFrame(loop);
  setInterval(renderCompanions, 500);
}

function save(){
  try {
    localStorage.setItem("gd_player", state.playerName);
    localStorage.setItem("gd_level", state.level);
    localStorage.setItem("gd_completed", state.maxCompleted);
    localStorage.setItem("gd_wisdom", state.wisdom);
    localStorage.setItem("gd_coins", state.coins);
    localStorage.setItem("gd_stars", state.stars);
    localStorage.setItem("gd_quiz", JSON.stringify(state.quizDone));
    localStorage.setItem("gd_premium", state.premiumUnlocked ? "1" : "0");
  } catch(e) {}
}

function setName(){
  const v = $("nameInput").value.trim().slice(0, 24);
  if(v){ state.playerName = v; save(); renderUI(); toast("Името е зачувано."); }
}

function escapeHTML(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function isEnglish(){ return !!(window.I18N && I18N.lang() === 'en'); }
function levelData(){ return levels.find(l => l.id === state.level) || levels[0] || {id:1,title:"Ниво",objective:"Собери мудрост.",historicalFact:"Учиме преку игра.",targetScrolls:3,targetStars:3,speed:1.5,obstacleRate:.02,reward:{wisdom:15,coins:8,stars:1},free:true,difficulty:"лесно"}; }
function isPremiumLevel(id){ return id > PREMIUM_CONFIG.freeLevels; }
function isUnlocked(id){ return id <= state.maxCompleted + 1; }
function canPlay(id){ return isUnlocked(id) && (!isPremiumLevel(id) || state.premiumUnlocked || (window.GAME_EDITION && window.GAME_EDITION.fullUnlock)); }

// ---------- Приказ ----------
function renderUI(){
  const l = levelData();
  if ($("stage")) $("stage").dataset.level = String(l.id);
  $("playerName").textContent = state.playerName;
  $("levelStat").textContent = state.level;
  $("wisdomStat").textContent = state.wisdom;
  $("coinStat").textContent = state.coins;
  $("starStat").textContent = state.stars;
  $("energyStat").textContent = state.energy > 0 ? "❤".repeat(state.energy) : "0";
  $("levelTitle").textContent = `${l.id}. ${l.title}`;
  $("objective").textContent = l.objective;
  $("fact").textContent = l.historicalFact;
  $("targetInfo").textContent = isEnglish()
    ? `Goal: ${state.scrolls}/${l.targetScrolls} scrolls · ${state.levelStars}/${l.targetStars} stars`
    : `Цел: ${state.scrolls}/${l.targetScrolls} свитоци · ${state.levelStars}/${l.targetStars} ѕвезди`;
  $("freePill").textContent = PREMIUM_CONFIG.freeLevels === 37 ? (isEnglish() ? 'Free educational playtest' : 'Бесплатно образовно тест-издание') : (isPremiumLevel(l.id) ? 'Премиум ниво' : 'Бесплатно ниво');
  const pct = Math.min(100, (Math.min(1, state.scrolls/l.targetScrolls) + Math.min(1, state.levelStars/l.targetStars))/2*100);
  $("progressBar").style.width = pct + "%";
  $("startBtn").textContent = isEnglish()
    ? (state.playing ? (state.paused ? '▶ Resume' : '⏸ Pause') : '▶ Start mission')
    : (state.playing ? (state.paused ? '▶ Продолжи' : '⏸ Пауза') : '▶ Започни мисија');
  document.querySelectorAll(".level").forEach(el => el.classList.toggle("active", Number(el.dataset.id) === state.level));
}

function renderLevels(){
  $("levels").innerHTML = levels.map(l => {
    const unlocked = isUnlocked(l.id);
    const done = l.id <= state.maxCompleted;
    const prem = isPremiumLevel(l.id) && !state.premiumUnlocked && !(window.GAME_EDITION && GAME_EDITION.fullUnlock);
    const badge = isEnglish()
      ? (done ? '✅ completed' : !unlocked ? '🔒 locked' : prem ? '👑 premium' : '▶ available')
      : (done ? '✅ завршено' : !unlocked ? '🔒 заклучено' : prem ? '👑 премиум' : '▶ достапно');
    return `
    <button class="level ${l.id===state.level?'active':''} ${!unlocked?'locked':''}" data-id="${l.id}" onclick="selectLevel(${l.id})">
      <span class="num">${l.id}</span>
      <span class="level-text"><strong>${escapeHTML(l.title)}</strong><span class="small">${escapeHTML(l.difficulty)} · ${badge}</span></span>
    </button>`;
  }).join("");
}

function selectLevel(id){
  if(!isUnlocked(id)){ toast("Прво заврши го ниво " + (state.maxCompleted + 1) + "."); return; }
  if(isPremiumLevel(id) && !state.premiumUnlocked && !(window.GAME_EDITION && GAME_EDITION.fullUnlock)){ openPremium(id); return; }
  state.level = id;
  resetLevel();
  save(); renderUI(); renderLevels();
  scrollToStage();
}

function scrollToStage(){
  const st = $("stage");
  if (st && st.getBoundingClientRect().top > window.innerHeight * 0.45) st.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- Ниво ----------
function resetLevel(){
  state.arriving = false;
  goalX = null;
  $("heroPlayer")?.classList.remove('arrived');
  placeGoal(0);
  state.scrolls = 0; state.levelStars = 0; state.energy = 3; state.playing = false; state.paused = false;
  player.x = 80; player.y = GROUND; player.vy = 0; player.onGround = true; player.doubleReady = true;
  objects = []; lastSpawnX = 0; lastHazardGap = 999; invulnUntil = 0;
  power = { shield: 0, slow: 0, magnet: 0 };
  clearObjects();
  updatePlayerEl();
  renderUI();
}

function startGame(){
  if (state.playing) { togglePause(); return; }
  if (!canPlay(state.level)) { selectLevel(state.level); return; }
  state.playing = true; state.paused = false;
  renderUI();
  scrollToStage();
  showIntroCard();
  const helpers = window.WPA_COMPANIONS ? Object.values(window.WPA_COMPANIONS) : [];
  const hint = helpers.length ? helpers[(state.level-1) % helpers.length] : null;
  toast(hint ? `${hint.name}: ${hint.hint}` : "Мисијата започна. Движи се, скокај и собирај мудрост!");
}

// ---------- v2.2: цел, воведна картичка, мали анимации ----------
let goalX = null;
function placeGoal(pct){
  const g = $("goalGate"); const stage = $("stage"); if(!g || !stage) return;
  const l = levelData();
  g.querySelector('.goal-name').textContent = l.place || 'Цел';
  const x = goalX ?? (stage.clientWidth - 78);
  g.style.left = x + "px";
  g.style.transform = `scale(${state.arriving ? 1 : 0.55 + 0.35*pct})`;
  g.style.opacity = state.arriving ? 1 : (0.5 + 0.5*pct);
}
function updateGoal(scroll){
  const l = levelData();
  const pct = (Math.min(1, state.scrolls/l.targetScrolls) + Math.min(1, state.levelStars/l.targetStars))/2;
  if(state.arriving){
    const stage = $("stage");
    if(goalX === null) goalX = stage.clientWidth - 78;
    goalX -= Math.max(4, scroll * 1.8);
    if(goalX <= player.x + 10){ placeGoal(1); completeLevel(); return; }
  }
  placeGoal(pct);
}
function showIntroCard(){
  const c = $("introCard"); if(!c) return;
  const l = levelData();
  c.innerHTML = isEnglish()
    ? `<strong>Level ${l.id} | ${escapeHTML(l.place || l.title)}</strong><span>Collect ${l.targetScrolls} scrolls and ${l.targetStars} stars, then reach the finish gate.</span>`
    : `<strong>Ниво ${l.id} · ${escapeHTML(l.place || l.title)}</strong><span>Собери ${l.targetScrolls} 📜 и ${l.targetStars} ⭐ — потоа стигни до 🏁</span>`;
  c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
}
function floatText(x, y, txt){
  const stage = $("stage"); if(!stage) return;
  const t = document.createElement('div'); t.className = 'float-text'; t.textContent = txt;
  t.style.left = x + 'px'; t.style.bottom = y + 'px';
  stage.appendChild(t); setTimeout(() => t.remove(), 750);
}
function landingDust(){
  const stage = $("stage"); if(!stage) return;
  for(let i = 0; i < 5; i++){
    const d = document.createElement('div'); d.className = 'dust';
    d.style.left = (player.x + 12 + Math.random()*16) + 'px'; d.style.bottom = (GROUND - 2) + 'px';
    d.style.setProperty('--dx', ((Math.random()-0.5)*44) + 'px');
    stage.appendChild(d); setTimeout(() => d.remove(), 450);
  }
}

function togglePause(){
  if(!state.playing) return;
  state.paused = !state.paused;
  renderUI();
  toast(state.paused ? "⏸ Пауза" : "▶ Продолжуваме!");
}

function finishIfComplete(){
  const l = levelData();
  if(!state.playing) return;
  if(state.scrolls >= l.targetScrolls && state.levelStars >= l.targetStars && !state.arriving){
    // v2.2: целта (портата) доаѓа кон играчот; нивото завршува кога ќе поминеш низ неа
    state.arriving = true;
    objects.forEach(o => { if (o.type !== 'star' && o.type !== 'scroll') { o.el.classList.add('picked'); o.dead = true; setTimeout(() => o.el.remove(), 200); } });
    toast(`🏁 Стигнуваш: ${l.place || 'целта'}!`);
  }
}

function completeLevel(){
  const l = levelData();
  if(!state.playing) return;
  {
    state.playing = false;
    state.arriving = false;
    $("heroPlayer").classList.add('arrived');
    state.wisdom += l.reward.wisdom;
    state.coins += l.reward.coins;
    state.stars += l.reward.stars;
    state.maxCompleted = Math.max(state.maxCompleted, l.id);
    clearObjects(); objects = [];
    save(); renderLevels(); renderUI();
    playTune([523, 659, 784, 1047]);
    celebrate();
    setTimeout(() => showLevelComplete(l), 750);
  }
}

function showLevelComplete(l){
  if(isEnglish()){
    const last=l.id>=37;
    const next=levels.find(x=>x.id===l.id+1);
    const needPremium=!!(next&&isPremiumLevel(next.id)&&!state.premiumUnlocked&&!(window.GAME_EDITION&&GAME_EDITION.fullUnlock));
    const quizBtn=state.quizDone[l.id]?'':'<button class="btn alt" onclick="openQuiz()">Quiz: earn wisdom</button>';
    $('modalBody').innerHTML=last?`<h2>Congratulations! You finished all 37 levels.</h2><p>Well done, ${escapeHTML(state.playerName)}. This is a personal local educational achievement.</p><p>Wisdom: ${state.wisdom} | Stars: ${state.stars}</p>${quizBtn}`
      :`<h2>Level ${l.id} completed!</h2><p>+${l.reward.wisdom} wisdom | +${l.reward.coins} coins | +${l.reward.stars} stars</p><div class="fact-box">${escapeHTML(l.historicalFact)}</div><div class="modal-actions">${quizBtn}${needPremium?`<button class="btn" onclick="openPremium(${next.id})">More levels currently unavailable</button>`:'<button class="btn" onclick="goNext()">Next level</button>'}</div>`;
    $('modal').classList.add('show');
    
    return;
  }
  const last = l.id >= 37;
  const next = levels.find(x => x.id === l.id + 1);
  const needPremium = next && isPremiumLevel(next.id) && !state.premiumUnlocked && !(window.GAME_EDITION && GAME_EDITION.fullUnlock);
  const quizBtn = state.quizDone[l.id] ? '' : `<button class="btn alt" onclick="openQuiz()">❓ Прашање за +15 мудрост</button>`;
  $("modalBody").innerHTML = last ? `
    <div class="finale">🏆</div>
    <h2>Го помина целиот Пат на Слободата!</h2>
    <p>Браво, <strong>${escapeHTML(state.playerName)}</strong>! Ги заврши сите 37 нивоа и научи 37 факти за Гоце Делчев и неговото време.</p>
    <p class="small">Мудрост: ${state.wisdom} · Ѕвезди: ${state.stars} · Монети: ${state.coins}</p>
    <div class="modal-actions">${quizBtn}</div>` : `
    <h2>✅ Ниво ${l.id} е завршено!</h2>
    <p>+${l.reward.wisdom} мудрост · +${l.reward.coins} ${l.reward.coins===1?'монета':'монети'} · +${l.reward.stars} ${l.reward.stars===1?'ѕвезда':'ѕвезди'}</p>
    <div class="fact-box"><strong>📜 Што научи:</strong> ${escapeHTML(l.historicalFact)}</div>
    <div class="modal-actions">
      ${quizBtn}
      ${needPremium ? `<button class="btn" onclick="openPremium(${next.id})">👑 Ниво ${next.id} е Премиум</button>` : `<button class="btn" onclick="goNext()">▶ Следно ниво</button>`}
    </div>`;
  $("modal").classList.add("show");
  
}

function goNext(){ closeModal(); if (state.level < 37) { const nxt=()=>selectLevel(state.level + 1); if(window.EditionAds&&window.GAME_EDITION&&GAME_EDITION.ads){EditionAds.between(nxt);}else{nxt();} } }

function loseEnergy(msg){
  if (performance.now() < invulnUntil) return;
  if(power.shield > 0){
    power.shield = 0; invulnUntil = performance.now() + 900;
    toast("🛡 Штитот на Даме те заштити!");
    return;
  }
  state.energy--;
  invulnUntil = performance.now() + 1400;
  playTone(140, 0.25, 'sawtooth', 0.05);
  toast(msg || "Внимавај! Изгуби енергија.");
  if(state.energy <= 0){
    state.playing = false;
    renderUI();
    $("modalBody").innerHTML = `<h2>💪 Обиди се повторно!</h2><p>Ја потроши енергијата. Секој пад е лекција — следниот пат ќе успееш.</p>
      <div class="modal-actions"><button class="btn" onclick="closeModal(); resetLevel(); startGame();">↻ Почни го нивото пак</button></div>`;
    $("modal").classList.add("show");
    return;
  }
  renderUI();
}

function clearObjects(){
  document.querySelectorAll(".obj").forEach(e => e.remove());
}

// ---------- Објекти ----------
const SIZES = { hole:[78,22], scroll:[28,36], star:[26,26], meteor:[28,28], obstacle:[38,44] };

function pickType(l){
  const id = l.id;
  const hazardBias = Math.min(0.42, 0.24 + id * 0.005);
  if (Math.random() < hazardBias) {
    const opts = ["obstacle"]; if (id >= 2) opts.push("hole"); if (id >= 3) opts.push("meteor");
    return opts[Math.floor(Math.random() * opts.length)];
  }
  // собирливо: повеќе од она што уште недостасува
  const needScroll = state.scrolls < l.targetScrolls, needStar = state.levelStars < l.targetStars;
  if (needScroll && !needStar) return Math.random() < 0.7 ? "scroll" : "star";
  if (needStar && !needScroll) return Math.random() < 0.7 ? "star" : "scroll";
  return Math.random() < 0.5 ? "star" : "scroll";
}

function spawn(type){
  const stage = $("stage");
  const el = document.createElement("div");
  el.className = `obj ${type}`;
  let y = GROUND;
  if(type === "star") y = GROUND + 92 + Math.random()*70;
  if(type === "scroll") y = GROUND + 45 + Math.random()*45;
  if(type === "meteor") y = GROUND + 190 + Math.random()*90;
  if(type === "hole") y = GROUND - 22;
  const [w,h] = SIZES[type];
  const x = stage.clientWidth + 20;
  el.style.left = x + "px";
  el.style.bottom = y + "px";
  stage.appendChild(el);
  objects.push({el,type,x,y,w,h,vy: type==="meteor" ? -(1.2 + Math.random()*0.8) : 0});
}

function updatePlayerEl(){
  const el = $("heroPlayer");
  el.style.left = player.x + "px";
  el.style.bottom = player.y + "px";
  el.classList.toggle("shield", power.shield > 0);
  el.classList.toggle("hurt", performance.now() < invulnUntil);
  el.classList.toggle("air", !player.onGround);
  el.classList.toggle("run", state.playing && !state.paused && player.onGround);
}

function jump(){
  if(!state.playing || state.paused) return;
  if(player.onGround){
    player.vy = 9.5; player.onGround = false; player.doubleReady = true;
    playTone(330, 0.08, 'sine', 0.03);
  } else if(player.doubleReady){
    player.vy = 8.5; player.doubleReady = false;
    playTone(440, 0.08, 'sine', 0.03);
  }
}

// Копчињата на екранот: држи за движење
function bindHoldButtons(){
  document.querySelectorAll('[data-hold]').forEach(btn => {
    const key = btn.dataset.hold;
    const down = e => { e.preventDefault(); keys[key] = true; btn.classList.add('pressed'); };
    const up = () => { keys[key] = false; btn.classList.remove('pressed'); };
    btn.addEventListener('pointerdown', down);
    ['pointerup','pointerleave','pointercancel'].forEach(ev => btn.addEventListener(ev, up));
  });
}

function rects(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}
function playerRect(){ return {x:player.x+6, y:player.y, w:player.w-12, h:player.h}; }

function collect(o){
  if(o.type === "star"){ state.levelStars++; state.coins += 1; playTone(880, 0.1, 'sine', 0.04); }
  if(o.type === "scroll"){ state.scrolls++; state.wisdom += 2; playTone(660, 0.12, 'triangle', 0.04); }
  o.el.classList.add('picked');
  setTimeout(() => o.el.remove(), 200);
  floatText(o.x, o.y + 30, o.type === "star" ? "+1 ⭐" : "+1 📜");
  o.dead = true;
  renderUI(); finishIfComplete();
}

function hit(o){
  if(o.type === "hole"){
    // се паѓа само ако си на земја над средината на дупката
    const cx = player.x + player.w/2;
    if(!(player.onGround && cx > o.x + 12 && cx < o.x + o.w - 12)) return;
    loseEnergy("Упс, дупка! Скокни преку неа.");
    player.vy = 10; player.onGround = false;
    return;
  }
  if (performance.now() < invulnUntil) return;
  o.el.remove(); o.dead = true;
  loseEnergy(o.type === "meteor" ? "Пази на камењата што паѓаат!" : "Внимавај на карпите!");
}

// ---------- Главна јамка ----------
function loop(ts){
  const dt = Math.min(32, ts - (lastTime || ts)) / 16.67;
  lastTime = ts;
  if(state.playing && !state.paused) updateGame(dt);
  else updatePlayerEl();
  requestAnimationFrame(loop);
}

function updateGame(dt){
  const l = levelData();
  const stage = $("stage");
  const speedFactor = power.slow > 0 ? 0.55 : 1;
  // v2.1: брзина во пиксели/секунда (ниво 1 ≈ 140, ниво 37 ≈ 320) — порано до 620 px/s
  const pxPerSec = 140 + (l.speed - 1.34) * 110;
  const scroll = pxPerSec / 60 * speedFactor * dt;

  if(keys.ArrowLeft || keys.a || keys.A) player.x -= 4.5*dt;
  if(keys.ArrowRight || keys.d || keys.D) player.x += 4.5*dt;
  player.x = Math.max(18, Math.min(Math.min(260, stage.clientWidth * 0.45), player.x));

  // v2.1: скокот е ~180px (порано ~490px — ликот излегуваше надвор од сцената)
  player.vy -= 0.6*dt;
  player.y += player.vy*dt*2.4;
  player.y = Math.min(player.y, stage.clientHeight - player.h - 8);
  if(player.y <= GROUND){
    if(!player.onGround && player.vy < -4) landingDust();
    player.y = GROUND; player.vy = 0; player.onGround = true;
  }

  const sec = dt / 60;
  power.shield = Math.max(0, power.shield - sec);
  power.slow = Math.max(0, power.slow - sec);
  power.magnet = Math.max(0, power.magnet - sec);

  // создавање по поминат пат, не по време → праведно растојание на секоја брзина
  lastSpawnX += scroll;
  lastHazardGap += scroll;
  updateGoal(scroll);
  if(!state.arriving && lastSpawnX > pxPerSec * (1.0 + Math.random()*0.6)){
    lastSpawnX = 0;
    let type = pickType(l);
    const hazard = t => t === "obstacle" || t === "hole" || t === "meteor";
    if (hazard(type) && lastHazardGap < Math.max(260, pxPerSec * 1.3)) type = Math.random() < 0.5 ? "star" : "scroll";
    if (hazard(type)) lastHazardGap = 0;
    spawn(type);
  }

  const pr = playerRect();
  for(const o of objects){
    if (o.dead) continue;
    o.x -= scroll * (o.type === "meteor" ? 1.5 : 1);
    if(o.type === "meteor"){
      o.y += o.vy*dt*3;
      if(o.y <= GROUND){ o.y = GROUND; o.el.classList.add('landed'); o.type = "obstacle"; o.w = 30; o.h = 26; }
    }
    if(power.magnet > 0 && (o.type==="star" || o.type==="scroll")){
      const dx = player.x - o.x;
      const dy = (player.y+30) - o.y;
      o.x += Math.sign(dx) * Math.min(Math.abs(dx), 3.2*dt);
      o.y += Math.sign(dy) * Math.min(Math.abs(dy), 2.2*dt);
    }
    o.el.style.left = o.x + "px";
    o.el.style.bottom = o.y + "px";
    if(o.x < -120){ o.el.remove(); o.dead = true; continue; }
    if(rects(pr, o)){
      if(o.type === "star" || o.type === "scroll") collect(o);
      else hit(o);
    }
  }
  objects = objects.filter(o => !o.dead);
  updatePlayerEl();
}

// ---------- Помошници (со пауза меѓу употребите) ----------
function useCompanion(id){
  const now = performance.now();
  if(!state.playing || state.paused){ toast("Прво започни ја мисијата."); return; }
  if(now < companionReadyAt[id]){ toast(`Помошникот се одмора уште ${Math.ceil((companionReadyAt[id]-now)/1000)} с.`); return; }
  companionReadyAt[id] = now + COMPANION_COOLDOWN;
  if(id === "dame"){ power.shield = 6; toast("🛡 Даме активира штит на доверба."); }
  if(id === "jane"){ player.doubleReady = true; player.vy = 11; player.onGround = false; toast("⛰ Јане активира планински супер скок."); }
  if(id === "gjorce"){ power.slow = 6; toast("🧠 Ѓорче ја забави сцената за мудра одлука."); }
  if(id === "pere"){ power.magnet = 8; toast("🧲 Пере активира трпение: ѕвездите се приближуваат."); }
  playTone(523, 0.15, 'triangle', 0.04);
  renderCompanions();
}

function renderCompanions(){
  const now = performance.now();
  document.querySelectorAll('[data-companion]').forEach(btn => {
    const id = btn.dataset.companion;
    const left = Math.ceil((companionReadyAt[id] - now)/1000);
    if(!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.disabled = left > 0;
    btn.textContent = left > 0 ? `⏳ ${left}с` : btn.dataset.label;
  });
}

// ---------- Свиток и квиз ----------
function pauseForModal(){ if (state.playing && !state.paused) { state.paused = true; renderUI(); } }

function openWisdom(){
  const l = levelData();
  $("modalBody").innerHTML = `<h2>📜 Свиток на мудроста</h2><p>${escapeHTML(l.historicalFact)}</p><p><strong>Мисија:</strong> ${escapeHTML(l.objective)}</p>`;
  pauseForModal();
  $("modal").classList.add("show");
}
function openQuiz(){
  const l = levelData();
  const q = quiz.find(x => x.level === l.id) || quiz[(l.id-1) % Math.max(1, quiz.length)] || {q:"Што учиме?",a:["Знаење","Омраза","Страв"],correct:0,why:""};
  const order = q.a.map((_, i) => i).sort(() => Math.random() - 0.5);
  const letters = ['А','Б','В','Г'];
  window.__quizWhy = q.why || "";
  $("modalBody").innerHTML = `<h2>❓ Прашање за ниво ${l.id}</h2><p>${escapeHTML(q.q)}</p>` +
    order.map((i, pos) => `<button class="btn alt quiz-option" onclick="answerQuiz(${i},${q.correct},${l.id})">${letters[pos]}) ${escapeHTML(q.a[i])}</button>`).join("") +
    `<p id="quizWhy" class="small"></p>`;
  pauseForModal();
  $("modal").classList.add("show");
}
function answerQuiz(i, correct, levelId){
  const already = !!state.quizDone[levelId];
  document.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
  if(i === correct){
    if(!already){ state.wisdom += 15; state.quizDone[levelId] = true; if (state.playing) state.levelStars += 1; }
    $("quizWhy").innerHTML = `<strong>✅ Точно!</strong> ${already ? '' : '+15 мудрост. '}${escapeHTML(window.__quizWhy)}`;
    playTone(784, 0.15, 'sine', 0.05);
  } else {
    $("quizWhy").innerHTML = `<strong>Не е точно.</strong> ${escapeHTML(window.__quizWhy)}`;
  }
  save(); renderUI(); renderLevels();
}
function closeModal(){
  $("modal").classList.remove("show");
  if (state.playing && state.paused) { state.paused = false; renderUI(); finishIfComplete(); }
}
let toastTimer = null;
function toast(msg){ $("toast").textContent = msg; $("toast").classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(()=>$("toast").classList.remove("show"), 2400); }

// ---------- Звук ----------
function ensureAudio(){
  try { if(!audio.ctx) audio.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (audio.ctx.state === 'suspended') audio.ctx.resume(); } catch(e) {}
  return audio.ctx;
}
function playTone(freq, dur, type, vol){
  const ctx = ensureAudio(); if(!ctx) return;
  try {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type || 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + dur + 0.02);
  } catch(e) {}
}
function playTune(notes){ notes.forEach((n, i) => setTimeout(() => playTone(n, 0.25, 'sine', 0.05), i * 140)); }

// ---------- v2.3: песната на играта ----------
// WPA soundtrack 2.5.2 - manually started, never autoplays.
let song=null;
let songVolumeValue=0.65;
try {const raw=localStorage.getItem('gd_song_volume');if(raw!==null){const v=Number(raw);if(Number.isFinite(v)&&v>=0&&v<=100)songVolumeValue=v/100;}}catch(e){}
function songT(mk,en){return window.I18N&&I18N.lang&&I18N.lang()==='en'?en:mk;}
function songStamp(n){if(!Number.isFinite(n))return '0:00';return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');}
function songStatus(message){const e=$('songStatus');if(e)e.textContent=message;}
function setSongVolume(value){
  const n=Math.max(0,Math.min(100,Number(value)||0));songVolumeValue=n/100;
  const input=$('songVolume');if(input)input.value=String(n);
  if(song)song.volume=songVolumeValue;
  try{localStorage.setItem('gd_song_volume',String(n));}catch(e){}
}
function songEl(){
  if(!song){
    song=new Audio('assets/audio/pesna-patot-na-slobodata.m4a');
    song.preload='metadata'; song.volume=songVolumeValue;
    ['play','pause','ended','loadedmetadata','timeupdate','durationchange'].forEach(ev=>song.addEventListener(ev,syncSongBtn));
    song.addEventListener('error',()=>songStatus(songT('Песната не може да се вчита. Провери ја врската.','Audio unavailable. Check the connection.')));
  }
  return song;
}
function syncSongBtn(){
  const playing=!!song&&!song.paused&&!song.ended;
  const b=$('songBtn');
  if(b){b.textContent=playing?songT('\u23f8 \u041f\u0430\u0443\u0437\u0438\u0440\u0430\u0458','\u23f8 Pause song'):songT('\u25b6 \u041f\u0443\u0448\u0442\u0438 \u0458\u0430 \u043f\u0435\u0441\u043d\u0430\u0442\u0430','\u25b6 Play song');b.classList.toggle('playing',playing);b.setAttribute('aria-pressed',String(playing));}
  if(song&&song.error){return;}
  if(song){
    const progress=$('songProgress');const duration=Number.isFinite(song.duration)?song.duration:192;
    if(progress){progress.max=duration;progress.value=Math.min(song.currentTime||0,duration);progress.setAttribute('aria-valuetext',songStamp(song.currentTime)+' / '+songStamp(duration));}
    const label=playing?songT('\u0421\u0432\u0438\u0440\u0438','Playing'):(song.ended?songT('\u0417\u0430\u0432\u0440\u0448\u0435\u043d\u043e','Finished'):songT('\u041f\u0430\u0443\u0437\u0430','Paused'));
    songStatus(label+' \u00b7 '+songStamp(song.currentTime)+' / '+songStamp(duration));
  }
}
function playSong(fromStart){
  if(window.GAME_EDITION&&GAME_EDITION.songs===false)return;
  if(audio.on)toggleMusic();
  const a=songEl();if(fromStart){try{a.currentTime=0;}catch(e){}}
  const result=a.play();
  if(result&&typeof result.catch==='function')result.catch(()=>songStatus(songT('\u0417\u0430 \u0437\u0432\u0443\u043a \u043a\u043b\u0438\u043a\u043d\u0438 \u043d\u0430 \u043a\u043e\u043f\u0447\u0435\u0442\u043e \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u043e.','Click Play again to enable audio.')));
  return result;
}
function toggleSong(){if(window.GAME_EDITION&&GAME_EDITION.songs===false)return;if(song&&!song.paused)song.pause();else playSong(false);}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&song&&!song.paused)song.pause();});
document.addEventListener('DOMContentLoaded',()=>{setSongVolume(Math.round(songVolumeValue*100));syncSongBtn();});

function toggleMusic(){
  audio.on = !audio.on;
  if (audio.on && song && !song.paused) song.pause();
  $("musicBtn").textContent = audio.on ? "🔊 7/8 ритам вклучен" : "🔇 Музика исклучена";
  if(audio.on) startPulse(); else stopPulse();
}
function startPulse(){
  try{
    ensureAudio();
    // 7/8 = 3+2+2: акцент на првиот удар од секоја група
    const pattern = [1,0,0,1,0,1,0];
    const melody = [294, 330, 349, 392, 349, 330, 294];
    let step = 0;
    stopPulse();
    audio.timer = setInterval(()=>{
      if(!audio.on) return;
      const accent = pattern[step % 7];
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = accent ? "triangle" : "sine";
      osc.frequency.value = accent ? 110 : melody[step % 7];
      gain.gain.setValueAtTime(accent ? 0.06 : 0.02, audio.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.ctx.currentTime + 0.12);
      osc.connect(gain).connect(audio.ctx.destination);
      osc.start(); osc.stop(audio.ctx.currentTime + 0.13);
      step++;
    }, 150);
  }catch(e){ toast("Прелистувачот не дозволи звук додека не кликнеш."); }
}
function stopPulse(){ if(audio.timer) clearInterval(audio.timer); audio.timer = null; }

// ---------- Премиум ----------
let gateAnswer = null, pendingLevel = null;
function openPremium(levelId){
  pendingLevel = levelId || null;
  if (PREMIUM_CONFIG.freeLevels === 37) { toast("🎮 Тест-издание: сите 37 нивоа се бесплатни. Завршувај ги по ред."); return; }
  if (state.premiumUnlocked) { toast("👑 Премиум пристапот е веќе активен."); return; }
  const a = 6 + Math.floor(Math.random()*7), b = 3 + Math.floor(Math.random()*7);
  gateAnswer = a*b;
  $("modalBody").innerHTML = `
    <h2>👑 Премиум — нивоа 9–37</h2>
    <p>Нивоата 1–8 се бесплатни. Останатите се отклучуваат со еднократна поддршка од <strong>${PREMIUM_CONFIG.price}</strong>.</p>
    <div class="gate">
      <p><strong>👨‍👩‍👧 За родители:</strong> колку е ${a} × ${b}?</p>
      <label class="small" style="display:block;margin:12px 0"><input type="checkbox" id="adultConfirm"> Потврдувам дека сум возрасно лице и ја разбирам цената. Детето треба да побара дозвола од родител/старател.</label>
      <input id="gateInput" type="number" inputmode="numeric" placeholder="Одговор" onkeydown="if(event.key==='Enter')checkGate()">
      <button class="btn" onclick="checkGate()">Продолжи</button>
      <p id="gateMsg" class="small"></p>
    </div>`;
  pauseForModal();
  $("modal").classList.add("show");
  setTimeout(()=>$("gateInput")?.focus(), 50);
}
function checkGate(){
  if (!$("adultConfirm")?.checked) { $("gateMsg").textContent = "Потребна е потврда од возрасен. Ова прашање не ја проверува вистинската возраст."; return; }
  if (Number($("gateInput").value) !== gateAnswer) { $("gateMsg").textContent = "Не е точно. Обидете се повторно."; return; }
  const pay = PREMIUM_CONFIG.paymentUrl
    ? `<p><button class="btn" onclick="window.open(PREMIUM_CONFIG.paymentUrl,'_blank','noopener')">1. Плати (нов прозорец)</button></p>`
    : `<p class="small">Онлајн плаќањето наскоро ќе биде достапно. Дотогаш пишете ни на <a href="mailto:${PREMIUM_CONFIG.contactEmail}">${PREMIUM_CONFIG.contactEmail}</a>.</p>`;
  $("modalBody").innerHTML = `
    <h2>👑 Премиум</h2>
    ${pay}
    <p>2. Внесете го кодот за пристап што го добивте по плаќањето:</p>
    <p class="small">Напомена: ова е привремен локален механизам за пристап, а не автоматска проверка на плаќање. Не внесувајте податоци од платежни картички во играта.</p>
    <div class="code-row"><input id="codeInput" autocomplete="off" spellcheck="false" placeholder="КОД" onkeydown="if(event.key==='Enter')redeemCode()"><button class="btn" onclick="redeemCode()">Отклучи</button></div>
    <p id="codeMsg" class="small"></p>
    <p class="small">Играта не собира лични податоци. <a href="privacy.html" target="_blank" rel="noopener">Приватност и услови</a></p>`;
}
async function redeemCode(){
  const code = ($("codeInput").value || "").trim().toUpperCase().replace(/\s+/g, "");
  if(!code) return;
  if(!Array.isArray(PREMIUM_CONFIG.codeHashes) || !PREMIUM_CONFIG.codeHashes.length){ $("codeMsg").textContent = "Кодовите сè уште не се активирани. Контактирајте нè."; return; }
  if(!window.crypto || !crypto.subtle){ $("codeMsg").textContent = "Кодот може да се провери само на безбедна (https) страница."; return; }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  if (PREMIUM_CONFIG.codeHashes.includes(hex)) {
    state.premiumUnlocked = true; save(); renderLevels(); renderUI();
    $("codeMsg").innerHTML = "<strong>🎉 Премиум е отклучен!</strong> Нивоата 9–37 се достапни.";
    celebrate();
    setTimeout(() => { closeModal(); if (pendingLevel) selectLevel(pendingLevel); }, 1500);
  } else {
    $("codeMsg").textContent = "Кодот не е валиден. Проверете го и обидете се повторно.";
  }
}

function celebrate(){
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random()*100 + '%';
    s.style.animationDelay = (Math.random()*0.6) + 's';
    s.style.background = ['#d4af37','#f6dd7a','#64b5ff','#42d392','#ff5d68'][i%5];
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2600);
}

// ---------- Тастатура и фокус ----------
document.addEventListener("keydown", e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.key] = true;
  if(e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W"){ e.preventDefault(); jump(); }
  if(e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();
  if(e.key === "Enter" && !state.playing && !$("modal").classList.contains("show")) startGame();
  if(e.key === "p" || e.key === "P" || e.key === "Escape") { if ($("modal").classList.contains("show")) closeModal(); else togglePause(); }
});
document.addEventListener("keyup", e => keys[e.key] = false);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && song && !song.paused) song.pause();
  if (document.hidden && state.playing && !state.paused) { state.paused = true; renderUI(); }
});
window.addEventListener("blur", () => { keys = {}; });

$("stage")?.addEventListener("pointerdown", () => { if (!state.playing) startGame(); else jump(); });

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

window.addEventListener("load", init);
