
const $ = (id) => document.getElementById(id);

let levels = [];
let quiz = [];
let state = {
  playerName: localStorage.getItem("gd_player") || "Гостин",
  level: Number(localStorage.getItem("gd_level") || 1),
  wisdom: Number(localStorage.getItem("gd_wisdom") || 0),
  coins: Number(localStorage.getItem("gd_coins") || 0),
  stars: Number(localStorage.getItem("gd_stars") || 0),
  scrolls: 0,
  levelStars: 0,
  energy: 3,
  playing: false,
  paused: false,
  premiumUnlocked: localStorage.getItem("gd_premium") === "1"
};

let player = { x: 80, y: 78, vy: 0, w: 40, h: 56, onGround: true, doubleReady: true };
let keys = {};
let objects = [];
let lastSpawn = 0;
let lastTime = 0;
let power = { shield: 0, slow: 0, magnet: 0 };
let audio = { ctx: null, on: false, timer: null };

async function init(){
  try { levels = await (await fetch("data/levels.json")).json(); } catch(e) { levels = []; }
  try { quiz = await (await fetch("data/quiz.json")).json(); } catch(e) { quiz = []; }
  $("nameInput").value = state.playerName === "Гостин" ? "" : state.playerName;
  renderLevels();
  renderUI();
  resetLevel();
  requestAnimationFrame(loop);
}

function save(){
  localStorage.setItem("gd_player", state.playerName);
  localStorage.setItem("gd_level", state.level);
  localStorage.setItem("gd_wisdom", state.wisdom);
  localStorage.setItem("gd_coins", state.coins);
  localStorage.setItem("gd_stars", state.stars);
  localStorage.setItem("gd_premium", state.premiumUnlocked ? "1" : "0");
}

function setName(){
  const v = $("nameInput").value.trim();
  if(v){ state.playerName = v; save(); renderUI(); toast("Името е зачувано."); }
}

function levelData(){ return levels.find(l => l.id === state.level) || levels[0] || {id:1,title:"Ниво",objective:"Собери мудрост.",historicalFact:"Учиме преку игра.",targetScrolls:3,targetStars:3,speed:1.5,obstacleRate:.02,reward:{wisdom:15,coins:8,stars:1},free:true}; }

function renderUI(){
  const l = levelData();
  $("playerName").textContent = state.playerName;
  $("levelStat").textContent = state.level;
  $("wisdomStat").textContent = state.wisdom;
  $("coinStat").textContent = state.coins;
  $("starStat").textContent = state.stars;
  $("energyStat").textContent = state.energy;
  $("levelTitle").textContent = `${l.id}. ${l.title}`;
  $("objective").textContent = l.objective;
  $("fact").textContent = l.historicalFact;
  $("targetInfo").textContent = `Цел: ${state.scrolls}/${l.targetScrolls} свитоци · ${state.levelStars}/${l.targetStars} ѕвезди`;
  $("freePill").textContent = l.free || state.premiumUnlocked ? (l.free ? "Бесплатно ниво" : "Премиум отклучено") : "Премиум ниво · демо режим";
  const pct = Math.min(100, ((state.scrolls/l.targetScrolls)+(state.levelStars/l.targetStars))/2*100);
  $("progressBar").style.width = pct + "%";
  document.querySelectorAll(".level").forEach(el => el.classList.toggle("active", Number(el.dataset.id) === state.level));
}

function renderLevels(){
  $("levels").innerHTML = levels.map(l => `
    <div class="level ${l.id===state.level?'active':''}" data-id="${l.id}" onclick="selectLevel(${l.id})">
      <div class="num">${l.id}</div>
      <div><strong>${l.title}</strong><div class="small">${l.difficulty} · ${l.free ? "бесплатно" : "премиум"}</div></div>
    </div>
  `).join("");
}

function selectLevel(id){
  if(id > 8 && !state.premiumUnlocked){
    toast("Ова е премиум ниво. Во демо можеш да го разгледаш, но напредокот е ограничен.");
  }
  state.level = id;
  resetLevel();
  save(); renderUI(); renderLevels();
}

function resetLevel(){
  state.scrolls = 0; state.levelStars = 0; state.energy = 3; state.playing = false; state.paused = false;
  player.x = 80; player.y = 78; player.vy = 0; player.onGround = true; player.doubleReady = true;
  objects = []; lastSpawn = 0;
  power = { shield: 0, slow: 0, magnet: 0 };
  clearObjects();
  updatePlayerEl();
  renderUI();
}

function startGame(){
  state.playing = true; state.paused = false;
  toast("Мисијата започна. Движи се, скокај и собирај мудрост!");
}

function finishIfComplete(){
  const l = levelData();
  if(state.scrolls >= l.targetScrolls && state.levelStars >= l.targetStars){
    state.wisdom += l.reward.wisdom;
    state.coins += l.reward.coins;
    state.stars += l.reward.stars;
    toast(`Нивото е завршено! +${l.reward.wisdom} мудрост, +${l.reward.coins} монети, +${l.reward.stars} ѕвезди`);
    if(state.level < 37) state.level++;
    resetLevel();
    save(); renderLevels(); renderUI();
  }
}

function clearObjects(){
  document.querySelectorAll(".obj").forEach(e => e.remove());
}

function spawn(type){
  const stage = $("stage");
  const el = document.createElement("div");
  el.className = `obj ${type}`;
  el.dataset.type = type;
  const ground = 78;
  let y = ground;
  if(type === "star") y = ground + 92 + Math.random()*70;
  if(type === "scroll") y = ground + 45 + Math.random()*45;
  if(type === "meteor") y = ground + 165 + Math.random()*95;
  if(type === "hole") y = ground - 8;
  el.style.left = "100%";
  el.style.bottom = y + "px";
  stage.appendChild(el);
  objects.push({el,type,x:stage.clientWidth+20,y,w:type==="hole"?72:type==="scroll"?28:type==="star"?26:type==="meteor"?24:34,h:type==="hole"?22:type==="scroll"?36:type==="star"?26:type==="meteor"?24:52});
}

function updatePlayerEl(){
  const el = $("heroPlayer");
  el.style.left = player.x + "px";
  el.style.bottom = player.y + "px";
  el.classList.toggle("shield", power.shield > 0);
}

function jump(){
  if(player.onGround){
    player.vy = 9.5; player.onGround = false; player.doubleReady = true;
  } else if(player.doubleReady){
    player.vy = 8.5; player.doubleReady = false;
  }
}

function moveLeft(){ keys.ArrowLeft = true; setTimeout(()=>keys.ArrowLeft=false, 180); }
function moveRight(){ keys.ArrowRight = true; setTimeout(()=>keys.ArrowRight=false, 180); }

function rects(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function objectRect(o){
  const stageH = $("stage").clientHeight;
  return {x:o.x, y:o.y, w:o.w, h:o.h};
}
function playerRect(){ return {x:player.x, y:player.y, w:player.w, h:player.h+22}; }

function collect(o){
  if(o.type === "star"){ state.levelStars++; state.coins += 1; toast("+1 ѕвезда"); }
  if(o.type === "scroll"){ state.scrolls++; state.wisdom += 2; toast("+1 свиток на знаење"); }
  o.el.remove(); o.dead = true;
  renderUI(); finishIfComplete();
}

function hit(o){
  if(power.shield > 0){
    power.shield = 0; toast("Штитот на Даме те заштити!");
    o.el.remove(); o.dead = true; return;
  }
  state.energy--;
  toast("Внимавај! Изгуби енергија.");
  o.el.remove(); o.dead = true;
  if(state.energy <= 0){
    toast("Мисијата се рестартира. Обиди се повторно!");
    resetLevel();
  }
  renderUI();
}

function loop(ts){
  const dt = Math.min(32, ts - (lastTime || ts)) / 16.67;
  lastTime = ts;
  if(state.playing && !state.paused){
    updateGame(dt, ts);
  }
  requestAnimationFrame(loop);
}

function updateGame(dt, ts){
  const l = levelData();
  const speedFactor = power.slow > 0 ? 0.55 : 1;
  const speed = l.speed * speedFactor * dt;

  if(keys.ArrowLeft || keys.a) player.x -= 4.5*dt;
  if(keys.ArrowRight || keys.d) player.x += 4.5*dt;
  player.x = Math.max(18, Math.min(220, player.x));

  player.vy -= 0.55*dt;
  player.y += player.vy*dt*6;
  if(player.y <= 78){
    player.y = 78; player.vy = 0; player.onGround = true;
  }

  power.shield = Math.max(0, power.shield - dt/60);
  power.slow = Math.max(0, power.slow - dt/60);
  power.magnet = Math.max(0, power.magnet - dt/60);

  if(ts - lastSpawn > 650){
    lastSpawn = ts;
    if(Math.random() < 0.72) spawn(["star","scroll","obstacle","hole","meteor"][Math.floor(Math.random()*5)]);
  }

  const pr = playerRect();
  for(const o of objects){
    o.x -= speed * (o.type==="meteor" ? 5.8 : 3.5);
    if(power.magnet > 0 && (o.type==="star" || o.type==="scroll")){
      const dx = player.x - o.x;
      const dy = (player.y+80) - o.y;
      o.x += Math.sign(dx) * Math.min(Math.abs(dx), 3.2*dt);
      o.y += Math.sign(dy) * Math.min(Math.abs(dy), 2.2*dt);
    }
    o.el.style.left = o.x + "px";
    o.el.style.bottom = o.y + "px";
    if(o.x < -100){ o.el.remove(); o.dead = true; }
    if(!o.dead && rects(pr, objectRect(o))){
      if(o.type === "star" || o.type === "scroll") collect(o);
      else hit(o);
    }
  }
  objects = objects.filter(o => !o.dead);
  updatePlayerEl();
}

function useCompanion(id){
  if(id === "dame"){ power.shield = 8; toast("Даме активира штит на доверба."); }
  if(id === "jane"){ player.doubleReady = true; player.vy = 11; player.onGround = false; toast("Јане активира планински супер скок."); }
  if(id === "gjorce"){ power.slow = 7; toast("Ѓорче ја забави сцената за мудра одлука."); }
  if(id === "pere"){ power.magnet = 8; toast("Пере активира трпение: ѕвездите се приближуваат."); }
}

function openWisdom(){
  const l = levelData();
  $("modalBody").innerHTML = `<h2>📜 Свиток на мудроста</h2><p>${l.historicalFact}</p><p><strong>Мисија:</strong> ${l.objective}</p>`;
  $("modal").classList.add("show");
}
function openQuiz(){
  const q = quiz[Math.floor(Math.random()*quiz.length)] || {q:"Што учиме?",a:["Знаење","Омраза","Страв"],correct:0};
  $("modalBody").innerHTML = `<h2>❓ Прашање на мудроста</h2><p>${q.q}</p>${q.a.map((a,i)=>`<button class="btn alt quiz-option" onclick="answerQuiz(${i},${q.correct})">${a}</button>`).join("")}`;
  $("modal").classList.add("show");
}
function answerQuiz(i, correct){
  if(i === correct){ state.wisdom += 15; state.levelStars += 1; toast("Точно! +15 мудрост и +1 ѕвезда за нивото."); }
  else { toast("Не е точно, но учиме понатаму."); }
  closeModal(); renderUI(); save(); finishIfComplete();
}
function closeModal(){ $("modal").classList.remove("show"); }
function toast(msg){ $("toast").textContent = msg; $("toast").classList.add("show"); setTimeout(()=>$("toast").classList.remove("show"), 2200); }

function toggleMusic(){
  audio.on = !audio.on;
  $("musicBtn").textContent = audio.on ? "🔊 7/8 ритам вклучен" : "🔇 Музика исклучена";
  if(audio.on) startPulse(); else stopPulse();
}
function startPulse(){
  try{
    if(!audio.ctx) audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const pattern = [1,0,1,0,1,0,1,1];
    let step = 0;
    stopPulse();
    audio.timer = setInterval(()=>{
      if(!audio.on) return;
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = step % 4 === 0 ? "triangle" : "sine";
      osc.frequency.value = pattern[step%pattern.length] ? 220 : 146;
      gain.gain.value = pattern[step%pattern.length] ? 0.04 : 0.018;
      osc.connect(gain).connect(audio.ctx.destination);
      osc.start(); osc.stop(audio.ctx.currentTime + 0.08);
      step++;
    }, 145);
  }catch(e){ toast("Browser-от не дозволи звук додека не кликнеш."); }
}
function stopPulse(){ if(audio.timer) clearInterval(audio.timer); audio.timer = null; }

function unlockPremiumDemo(){
  state.premiumUnlocked = true; save(); renderUI(); toast("Премиум демо е отклучено за тестирање.");
}

document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if(e.code === "Space" || e.key === "ArrowUp" || e.key === "w"){ e.preventDefault(); jump(); }
});
document.addEventListener("keyup", e => keys[e.key] = false);

$("stage")?.addEventListener("pointerdown", () => jump());

window.addEventListener("load", init);
