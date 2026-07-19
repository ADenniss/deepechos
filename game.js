const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
const overlay = document.querySelector('#message'), start = document.querySelector('#start-button');
const newCave = document.querySelector('#new-cave'), soundToggle = document.querySelector('#sound-toggle'), crystalCount = document.querySelector('#crystal-count');
const crystalTotal = document.querySelector('#crystal-total'), depth = document.querySelector('#depth'), healthDisplay = document.querySelector('#health'), hungerDisplay = document.querySelector('#hunger'), shardsDisplay = document.querySelector('#shards'), foodDisplay = document.querySelector('#food-count'), caveName = document.querySelector('#cave-name'), levelDisplay = document.querySelector('#level');
const COLS = 45, ROWS = 30, TILE = 20;
const FOV = Math.PI / 3, RAY_WIDTH = 2, HORIZON = 306;
const FOCAL_LENGTH = canvas.width / (2 * Math.tan(FOV / 2)), TAU = Math.PI * 2;
const THEMES = [{name:'BASALT',walls:['#182327','#1d2b2d','#132024'],floor:'#0e1719',line:'#142124',mark:'#26363a',crystal:'#74f0ee',glow:'#42d9e5'},{name:'FROST',walls:['#23343d','#2a3e48','#1c2d36'],floor:'#101c25',line:'#19303c',mark:'#638397',crystal:'#c8f5ff',glow:'#7fd9ff'},{name:'EMBER',walls:['#3a2521','#462a23','#2f1e1c'],floor:'#211311',line:'#38201d',mark:'#70402d',crystal:'#ffbf70',glow:'#ef653e'},{name:'VERDANT',walls:['#1d3024','#263d2a','#17291e'],floor:'#0e1d15',line:'#183022',mark:'#3b6744',crystal:'#b5ef8d',glow:'#71d26e'}];
let map, player, crystals, foods, monsters, exit, health, maxHealth, hunger, shards, weapons, inventory, theme, level = 1, shopOpen = false, inventoryOpen = false, running = false, won = false, pulse = 0, burst = 0;
let audio, master, muted = false, ambienceStarted = false;
let heldDirection = null, moveTimer = 0;
let mouseDragging = false, lastPointerX = 0;

function ensureAudio() {
  if (!audio) { audio = new AudioContext(); master = audio.createGain(); master.gain.value = muted ? .0001 : .22; master.connect(audio.destination); }
  if (audio.state === 'suspended') audio.resume();
  if (!ambienceStarted) startAmbience();
}
function tone(freq, duration=.12, type='sine', volume=.12, slide=1) {
  if (!audio || muted) return; const t=audio.currentTime, osc=audio.createOscillator(), gain=audio.createGain(); osc.type=type; osc.frequency.setValueAtTime(freq,t); osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),t+duration); gain.gain.setValueAtTime(volume,t); gain.gain.exponentialRampToValueAtTime(.001,t+duration); osc.connect(gain).connect(master); osc.start(t); osc.stop(t+duration+.02);
}
function noise(duration=.12, volume=.08) {
  if (!audio || muted) return; const buffer=audio.createBuffer(1, audio.sampleRate*duration, audio.sampleRate), data=buffer.getChannelData(0); for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length); const source=audio.createBufferSource(), gain=audio.createGain(); source.buffer=buffer; gain.gain.value=volume; source.connect(gain).connect(master); source.start();
}
function sound(kind) { if (muted || !audio) return; if(kind==='step') tone(100,.045,'triangle',.035,.8); if(kind==='crystal'){tone(740,.2,'sine',.1,1.5);setTimeout(()=>tone(1110,.25,'sine',.07,1.2),60)} if(kind==='food'){tone(280,.13,'triangle',.08,1.5);setTimeout(()=>tone(420,.18,'sine',.06,1.2),60)} if(kind==='buy'){tone(392,.12,'triangle',.09,1.3);setTimeout(()=>tone(523,.25,'sine',.08,1.1),70)} if(kind==='blade'){tone(340,.12,'sawtooth',.1,2.4)} if(kind==='burst'){tone(180,.35,'sawtooth',.12,4);noise(.18,.08)} if(kind==='hurt'){noise(.25,.16);tone(90,.3,'sawtooth',.12,.45)} if(kind==='win'){[440,554,659,880].forEach((f,i)=>setTimeout(()=>tone(f,.35,'sine',.1,1.02),i*110));} if(kind==='lose'){tone(210,.8,'sawtooth',.13,.25);} }
function startAmbience() { ambienceStarted=true; const now=audio.currentTime; [55,82.4].forEach((frequency,index)=>{const osc=audio.createOscillator(), gain=audio.createGain(), filter=audio.createBiquadFilter();osc.type='sine';osc.frequency.value=frequency;gain.gain.value=index?.018:.035;filter.type='lowpass';filter.frequency.value=230;osc.connect(filter).connect(gain).connect(master);osc.start(now);}); const chime=()=>{if(!muted&&running){tone([220,277,330,415][Math.floor(Math.random()*4)],1.8,'sine',.012,.99)} setTimeout(chime,5000+Math.random()*6000)};chime(); }

function makeCave(newExpedition = true) {
  if (newExpedition) { level = 1; shards = 0; maxHealth = 3; weapons = {lance: false, blade: false}; inventory = {food: 0}; }
  levelDisplay.textContent = level;
  theme = THEMES[Math.floor(Math.random()*THEMES.length)]; caveName.textContent = theme.name;
  map = Array.from({length: ROWS}, (_, y) => Array.from({length: COLS}, (_, x) => x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 || Math.random() < .43 ? 1 : 0));
  for (let pass = 0; pass < 5; pass++) map = map.map((row, y) => row.map((cell, x) => {
    if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return 1;
    let n = 0; for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) if (map[y + yy]?.[x + xx]) n++;
    return n >= 5 ? 1 : 0;
  }));
  let x = 2, y = 2; map[y][x] = 0;
  while (x < COLS - 3 || y < ROWS - 3) { if ((Math.random() < .58 && x < COLS - 3) || y >= ROWS - 3) x++; else y++; map[y][x] = 0; if (Math.random() < .35) map[Math.max(1, y - 1)][x] = 0; }
  const startingDirection = [[1,0],[0,1],[-1,0],[0,-1]].find(([dx,dy]) => !map[2 + dy]?.[2 + dx]) || [1,0];
  player = {x: 2, y: 2, angle: Math.atan2(startingDirection[1], startingDirection[0]), bob: 0}; exit = {x: COLS - 3, y: ROWS - 3}; crystals = [];
  const reachable = [], seen = new Set(['2,2']), queue = [{x: 2, y: 2}];
  while (queue.length) { const p = queue.shift(); reachable.push(p); for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const q={x:p.x+dx,y:p.y+dy}, id=`${q.x},${q.y}`; if (!seen.has(id) && !map[q.y]?.[q.x]) { seen.add(id); queue.push(q); } } }
  for (let i = 0; i < 10 + level; i++) { let p; do p = reachable[Math.floor(Math.random() * reachable.length)]; while (crystals.some(c=>c.x===p.x&&c.y===p.y) || Math.abs(p.x-player.x)+Math.abs(p.y-player.y)<5 || (p.x===exit.x&&p.y===exit.y)); crystals.push(p); }
  foods = [];
  for (let i = 0; i < 7 + Math.floor(level / 3); i++) { let p; do p = reachable[Math.floor(Math.random() * reachable.length)]; while (foods.some(f=>f.x===p.x&&f.y===p.y) || crystals.some(c=>c.x===p.x&&c.y===p.y) || Math.abs(p.x-player.x)+Math.abs(p.y-player.y)<4 || (p.x===exit.x&&p.y===exit.y)); foods.push(p); }
  monsters = [];
  const monsterTypes = Array.from({length: Math.min(16, 7 + level)}, (_, i) => ['crawler', 'crawler', 'crawler', 'stalker', 'stalker', 'wisp', 'wisp', 'wisp'][i % 8]);
  for (const type of monsterTypes) { let p; do p = reachable[Math.floor(Math.random() * reachable.length)]; while (Math.abs(p.x-player.x)+Math.abs(p.y-player.y)<12 || (p.x===exit.x&&p.y===exit.y) || crystals.some(c=>c.x===p.x&&c.y===p.y) || foods.some(f=>f.x===p.x&&f.y===p.y) || monsters.some(m=>m.x===p.x&&m.y===p.y)); monsters.push({...p, type, cool: 0}); }
  health = maxHealth; hunger = 100; shopOpen = false; inventoryOpen = false; updateHunger(); shardsDisplay.textContent=shards; foodDisplay.textContent=inventory.food; healthDisplay.textContent = '♥'.repeat(health) + '♡'.repeat(maxHealth-health); crystalTotal.textContent = crystals.length; crystalCount.textContent = 0; depth.textContent = 300 + level * 180 + Math.floor(Math.random() * 120); won = false; burst = 0;
}
function updateHunger() { hungerDisplay.textContent = '█'.repeat(Math.ceil(hunger / 20)) + '░'.repeat(5-Math.ceil(hunger / 20)); }
function starve() { won = true; sound('lose'); overlay.innerHTML = '<p class="eyebrow">SUPPLIES EXHAUSTED</p><h2>You run out of strength.</h2><p>Food is scarce in the lower caves. Search for the red supply packs.</p><button id="again">Try another descent</button>'; overlay.classList.remove('hidden'); document.querySelector('#again').onclick = begin; }
function move(dx, dy) { if (!running || won || shopOpen || inventoryOpen) return; const nx = player.x + dx, ny = player.y + dy; if (!map[ny]?.[nx]) { sound('step'); player.x = nx; player.y = ny; player.bob = .35; hunger=Math.max(0,hunger-1); updateHunger(); autoEatFood(); const found = crystals.findIndex(c => c.x === nx && c.y === ny); if (found >= 0) { crystals.splice(found, 1); crystalCount.textContent = +crystalCount.textContent + 1; shards++; shardsDisplay.textContent=shards; sound('crystal'); } const meal=foods.findIndex(f=>f.x===nx&&f.y===ny); if(meal>=0){foods.splice(meal,1);inventory.food++;foodDisplay.textContent=inventory.food;sound('food');} if(!hunger) starve(); if (!won && nx === exit.x && ny === exit.y && !crystals.length) victory(); if(!won) monsterTurn(); } }
function monsterTurn() {
  for (const m of monsters) { if (m.cool) { m.cool--; continue; } const dx=player.x-m.x, dy=player.y-m.y, sight=m.type==='stalker'?14:m.type==='crawler'?7:10, choices=Math.abs(dx)+Math.abs(dy)<sight ? [[Math.sign(dx),0],[0,Math.sign(dy)]] : [[0,1],[1,0],[0,-1],[-1,0]].sort(()=>Math.random()-.5); for (const [mx,my] of choices) { const nx=m.x+mx, ny=m.y+my; if (!map[ny]?.[nx] && !(nx===player.x&&ny===player.y) && !monsters.some(o=>o!==m&&o.x===nx&&o.y===ny)) { m.x=nx;m.y=ny;break; } } }
  if (monsters.some(m=>Math.abs(m.x-player.x)+Math.abs(m.y-player.y)<=1)) hurt();
}
function hurt() { health--; sound('hurt'); healthDisplay.textContent = '♥'.repeat(Math.max(0,health)) + '♡'.repeat(Math.max(0,maxHealth-health)); if (health <= 0) gameOver(); }
function lanternBurst() { if (!running || won || shopOpen || inventoryOpen) return; burst = 1; sound('burst'); const range=weapons.lance?7:4, wispRange=weapons.lance?5:2, before=monsters.length; monsters = monsters.filter(m => { const distance=Math.abs(m.x-player.x)+Math.abs(m.y-player.y); return distance>range || (m.type==='wisp' && distance>wispRange); }); if (before === monsters.length) monsterTurn(); }
function bladeStrike() { if (!running || won || shopOpen || inventoryOpen || !weapons.blade) return; sound('blade'); const before=monsters.length; monsters=monsters.filter(m=>Math.abs(m.x-player.x)+Math.abs(m.y-player.y)>1); if(before===monsters.length) monsterTurn(); }
function releaseMouseLook() { mouseDragging = false; if (document.pointerLockElement === canvas) document.exitPointerLock?.(); }
function openShop() { if(!running || won) return; releaseMouseLook(); shopOpen=true; overlay.innerHTML=`<p class="eyebrow">FIELD FORGE · ${shards} SHARDS</p><h2>Arm yourself.</h2><p><b>1 — Pulse Lance · 5 shards</b><br>Expands lantern burst to 7 tiles and reaches wisps at 5 tiles.</p><p><b>2 — Crystal Blade · 8 shards</b><br>Press F to defeat a monster beside you.</p><p><b>3 — Heart Vessel · 6 shards</b><br>Adds one permanent heart and fully restores your lantern.</p><button id="buy-lance" ${weapons.lance||shards<5?'disabled':''}>${weapons.lance?'Pulse Lance installed':'Buy Pulse Lance'}</button><button id="buy-blade" ${weapons.blade||shards<8?'disabled':''}>${weapons.blade?'Crystal Blade installed':'Buy Crystal Blade'}</button><button id="buy-heart" ${maxHealth>=6||shards<6?'disabled':''}>${maxHealth>=6?'Heart capacity maxed':'Buy Heart Vessel'}</button><small>Press B or Escape to return to the cave</small>`;overlay.classList.remove('hidden');document.querySelector('#buy-lance').onclick=()=>buyWeapon('lance',5);document.querySelector('#buy-blade').onclick=()=>buyWeapon('blade',8);document.querySelector('#buy-heart').onclick=buyHeart; }
function buyWeapon(name,cost){if(!weapons[name]&&shards>=cost){shards-=cost;shardsDisplay.textContent=shards;weapons[name]=true;sound('buy');openShop();}}
function buyHeart(){if(shards>=6&&maxHealth<6){shards-=6;maxHealth++;health=maxHealth;shardsDisplay.textContent=shards;healthDisplay.textContent='♥'.repeat(health);sound('buy');openShop();}}
function closeShop(){shopOpen=false;releaseMouseLook();overlay.classList.add('hidden');}
function openInventory(){if(!running||won)return;releaseMouseLook();inventoryOpen=true;overlay.innerHTML=`<p class="eyebrow">EXPEDITION INVENTORY</p><h2>What you carry.</h2><p><b>Food supplies · ${inventory.food}</b><br>Restores 30 hunger when consumed.</p><p><b>Crystal shards · ${shards}</b><br>${weapons.lance?'Pulse Lance installed.':'No Pulse Lance.'}<br>${weapons.blade?'Crystal Blade installed.':'No Crystal Blade.'}</p><button id="eat-food" ${!inventory.food||hunger>=100?'disabled':''}>Eat food supply</button><small>Press I or Escape to return to the cave</small>`;overlay.classList.remove('hidden');document.querySelector('#eat-food').onclick=useFood;}
function consumeFood(){if(!inventory.food||hunger>=100)return false;inventory.food--;foodDisplay.textContent=inventory.food;hunger=Math.min(100,hunger+30);updateHunger();sound('food');return true;}
function autoEatFood(){if(hunger<=80)consumeFood();}
function useFood(){if(consumeFood())openInventory();}
function closeInventory(){inventoryOpen=false;releaseMouseLook();overlay.classList.add('hidden');}
function victory() { won = true; sound('win'); overlay.innerHTML = `<p class="eyebrow">LEVEL ${level} CLEARED</p><h2>You found the next descent.</h2><p>Your shards and forged weapons carry into the deeper cave.</p><button id="again">Descend to level ${level + 1}</button>`; overlay.classList.remove('hidden'); document.querySelector('#again').onclick = nextLevel; }
function gameOver() { won = true; sound('lose'); overlay.innerHTML = '<p class="eyebrow">LANTERN EXTINGUISHED</p><h2>The dark takes you.</h2><p>Something unseen carries on through the tunnels.</p><button id="again">Try another descent</button>'; overlay.classList.remove('hidden'); document.querySelector('#again').onclick = begin; }
function draw() {
  pulse += .04; ctx.fillStyle = '#080d0e'; ctx.fillRect(0, 0, 900, 600);
  for (let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) { const px=x*TILE, py=y*TILE, seed=(x*17+y*31)%3; if (map[y][x]) { ctx.fillStyle=theme.walls[seed]; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle=theme.mark; ctx.fillRect(px+3,py+3,4,3); if((x*13+y*7)%11===0)ctx.fillRect(px+13,py+13,2,2); } else { ctx.fillStyle=theme.floor; ctx.fillRect(px,py,TILE,TILE); ctx.strokeStyle=theme.line; ctx.strokeRect(px+.5,py+.5,TILE-1,TILE-1); if((x*5+y*9)%19===0){ctx.fillStyle=theme.mark;ctx.globalAlpha=.32;ctx.fillRect(px+9,py+10,2,2);ctx.globalAlpha=1;} } }
  const lit = !crystals.length; ctx.save(); ctx.translate(exit.x*TILE+10, exit.y*TILE+10); ctx.strokeStyle=lit?'#e8d795':'#4f5147'; ctx.lineWidth=3; ctx.strokeRect(-7,-9,14,18); ctx.fillStyle=lit?'#b88e4b':'#232926'; ctx.fillRect(-4,-5,8,12); ctx.restore();
  crystals.forEach(c=>{ ctx.save(); ctx.shadowBlur=11+Math.sin(pulse+c.x)*2; ctx.shadowColor=theme.glow; ctx.fillStyle=theme.crystal; ctx.beginPath();ctx.moveTo(c.x*TILE+10,c.y*TILE+2);ctx.lineTo(c.x*TILE+15,c.y*TILE+10);ctx.lineTo(c.x*TILE+10,c.y*TILE+18);ctx.lineTo(c.x*TILE+5,c.y*TILE+10);ctx.fill();ctx.restore(); });
  foods.forEach(f=>{const fx=f.x*TILE+10,fy=f.y*TILE+10;ctx.save();ctx.shadowBlur=6;ctx.shadowColor='#d86b4d';ctx.fillStyle='#d85645';ctx.beginPath();ctx.arc(fx,fy-2,6,Math.PI,0);ctx.fill();ctx.fillStyle='#e9c8a1';ctx.fillRect(fx-2,fy-1,4,8);ctx.fillStyle='#f4e9ce';ctx.fillRect(fx-3,fy-4,2,2);ctx.fillRect(fx+2,fy-5,2,2);ctx.restore();});
  monsters.forEach(m=>{ const mx=m.x*TILE+10,my=m.y*TILE+10;ctx.save();ctx.translate(mx,my);if(m.type==='wisp'){ctx.globalAlpha=.75;ctx.shadowBlur=12;ctx.shadowColor='#9a76ea';ctx.fillStyle='#7c68bf';ctx.beginPath();ctx.arc(0,0,6+Math.sin(pulse+m.x)*2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e5d7ff';ctx.beginPath();ctx.arc(-2,-2,2,0,Math.PI*2);ctx.fill();}else if(m.type==='stalker'){ctx.shadowBlur=8;ctx.shadowColor='#e9af55';ctx.fillStyle='#3c3020';ctx.beginPath();ctx.moveTo(-8,8);ctx.lineTo(-6,-7);ctx.lineTo(0,-10);ctx.lineTo(6,-7);ctx.lineTo(8,8);ctx.fill();ctx.fillStyle='#ffd36a';ctx.fillRect(-4,-3,3,3);ctx.fillRect(2,-3,3,3);}else{ctx.shadowBlur=7;ctx.shadowColor='#d84c5c';ctx.fillStyle='#442034';ctx.beginPath();ctx.arc(0,2,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f06a68';ctx.fillRect(-4,-1,3,3);ctx.fillRect(2,-1,3,3);}ctx.restore(); });
  ctx.save();ctx.translate(player.x*TILE+10,player.y*TILE+11+Math.sin(pulse*4)*player.bob*3);ctx.shadowBlur=12;ctx.shadowColor='#ffcc72';ctx.fillStyle='#f0b65a';ctx.beginPath();ctx.arc(0,-3,5,0,7);ctx.fill();ctx.fillStyle='#295e62';ctx.fillRect(-5,1,10,8);ctx.restore();
  const gx=player.x*TILE+10, gy=player.y*TILE+10, g=ctx.createRadialGradient(gx,gy,35,gx,gy,burst?220:145); g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,'rgba(0,0,0,.08)');g.addColorStop(1,'rgba(0,0,0,.92)');ctx.fillStyle=g;ctx.fillRect(0,0,900,600); if(burst) burst=Math.max(0,burst-.05); requestAnimationFrame(draw);
}
function wrapAngle(angle) { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
function worldDistance(item) { return Math.hypot(item.x + .5 - (player.x + .5), item.y + .5 - (player.y + .5)); }
function rockNoise(x, y = 0) { const value = Math.sin(x * 127.1 + y * 311.7 + 74.7) * 43758.5453123; return value - Math.floor(value); }

function castRay(angle) {
  const px = player.x + .5, py = player.y + .5, dirX = Math.cos(angle), dirY = Math.sin(angle);
  let cellX = Math.floor(px), cellY = Math.floor(py);
  const deltaX = Math.abs(1 / dirX), deltaY = Math.abs(1 / dirY);
  const stepX = dirX < 0 ? -1 : 1, stepY = dirY < 0 ? -1 : 1;
  let sideX = dirX < 0 ? (px - cellX) * deltaX : (cellX + 1 - px) * deltaX;
  let sideY = dirY < 0 ? (py - cellY) * deltaY : (cellY + 1 - py) * deltaY;
  let side = 0;
  while (!map[cellY]?.[cellX]) {
    if (sideX < sideY) { sideX += deltaX; cellX += stepX; side = 0; }
    else { sideY += deltaY; cellY += stepY; side = 1; }
  }
  const distance = Math.max(.001, side === 0 ? (cellX - px + (1 - stepX) / 2) / dirX : (cellY - py + (1 - stepY) / 2) / dirY);
  const hitX = px + distance * dirX, hitY = py + distance * dirY;
  return {distance, side, cellX, cellY, wallU: side === 0 ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX)};
}

function drawCaveBackground() {
  const ceiling = ctx.createLinearGradient(0, 0, 0, HORIZON);
  ceiling.addColorStop(0, '#010202'); ceiling.addColorStop(.5, '#080c0d'); ceiling.addColorStop(1, theme.floor);
  ctx.fillStyle = ceiling; ctx.fillRect(0, 0, canvas.width, HORIZON);
  const floor = ctx.createLinearGradient(0, HORIZON, 0, canvas.height);
  floor.addColorStop(0, '#090d0e'); floor.addColorStop(.2, theme.floor); floor.addColorStop(1, '#010202');
  ctx.fillStyle = floor; ctx.fillRect(0, HORIZON, canvas.width, canvas.height - HORIZON);
  for (let i = 1; i < 15; i++) {
    const fraction = i / 15, y = HORIZON + Math.pow(fraction, 2.35) * (canvas.height - HORIZON);
    ctx.globalAlpha = .16 * fraction; ctx.strokeStyle = theme.mark; ctx.lineWidth = 1 + fraction * 2;
    ctx.beginPath(); ctx.moveTo(0, y + Math.sin(i * 3.7 + player.x) * 3); ctx.bezierCurveTo(canvas.width * .28, y - 8, canvas.width * .68, y + 7, canvas.width, y + Math.cos(i * 4.2 + player.y) * 3); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawRaycastWalls() {
  const depths = [];
  for (let x = 0; x < canvas.width; x += RAY_WIDTH) {
    const offset = (x / canvas.width - .5) * FOV;
    const ray = castRay(player.angle + offset);
    const distance = ray.distance * Math.cos(offset);
    const height = Math.min(canvas.height * 3, FOCAL_LENGTH / distance);
    const textureBand = Math.floor(ray.wallU * 18);
    const roughness = (rockNoise(ray.cellX * 23 + textureBand, ray.cellY * 17) - .5) * Math.min(42, height * .07);
    const top = HORIZON - height / 2 + roughness;
    const bottom = HORIZON + height / 2 - roughness * .58;
    const torchFlicker = .9 + Math.sin(pulse * 2.7) * .045 + Math.sin(pulse * 7.1) * .025;
    const shade = Math.max(.11, 1 - distance / 19) * (ray.side ? .74 : 1) * torchFlicker;
    const material = theme.walls[(ray.cellX * 17 + ray.cellY * 31) % theme.walls.length];
    depths[x / RAY_WIDTH] = distance;
    ctx.fillStyle = material; ctx.globalAlpha = shade;
    ctx.fillRect(x, top, RAY_WIDTH + .5, bottom - top);
    const strata = rockNoise(ray.cellX * 7 + textureBand, ray.cellY * 19);
    if (strata > .4) {
      ctx.fillStyle = theme.mark; ctx.globalAlpha = shade * (.13 + strata * .18);
      ctx.fillRect(x, top + (bottom - top) * (.17 + rockNoise(textureBand, ray.cellX) * .55), RAY_WIDTH + .5, Math.max(1, height * .012));
    }
    if (rockNoise(ray.cellY * 13 + textureBand, ray.cellX * 5) > .74) {
      ctx.fillStyle = '#050708'; ctx.globalAlpha = shade * .36;
      ctx.fillRect(x, top + (bottom - top) * rockNoise(ray.cellX, textureBand), RAY_WIDTH + .5, Math.max(1, height * .018));
    }
  }
  ctx.globalAlpha = 1;
  return depths;
}

function drawGroundDetails(depths) {
  const minX = Math.max(1, player.x - 11), maxX = Math.min(COLS - 2, player.x + 11), minY = Math.max(1, player.y - 11), maxY = Math.min(ROWS - 2, player.y + 11);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    if (map[y][x] || rockNoise(x, y) < .58) continue;
    const dx = x + .5 - (player.x + .5), dy = y + .5 - (player.y + .5), distance = Math.hypot(dx, dy), offset = wrapAngle(Math.atan2(dy, dx) - player.angle), forward = distance * Math.cos(offset);
    if (forward < 1 || Math.abs(offset) > FOV / 2 + .1) continue;
    const screenX = canvas.width / 2 + Math.tan(offset) * FOCAL_LENGTH;
    const depth = depths[Math.max(0, Math.min(depths.length - 1, Math.floor(screenX / RAY_WIDTH)))];
    if (forward > depth || screenX < -35 || screenX > canvas.width + 35) continue;
    const groundY = HORIZON + FOCAL_LENGTH * .48 / forward, size = Math.min(34, FOCAL_LENGTH * (.055 + rockNoise(y, x) * .08) / forward);
    if (groundY > canvas.height + size) continue;
    ctx.save(); ctx.translate(screenX, groundY); ctx.globalAlpha = Math.max(.12, .62 - forward / 28);
    if (rockNoise(x * 3, y * 7) > .83) {
      ctx.fillStyle = theme.mark; ctx.beginPath(); ctx.ellipse(0, 0, size * 1.7, Math.max(1, size * .32), 0, 0, TAU); ctx.fill();
      ctx.globalAlpha *= .38; ctx.fillStyle = '#020405'; ctx.beginPath(); ctx.ellipse(size * .25, -1, size, Math.max(1, size * .16), 0, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = '#06090a'; ctx.beginPath(); ctx.ellipse(0, 0, size * 1.35, Math.max(1, size * .36), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = theme.mark; ctx.globalAlpha *= .52; ctx.beginPath(); ctx.ellipse(-size * .18, -size * .18, size * .65, Math.max(1, size * .28), -.35, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

function drawCaveFormations() {
  const shift = Math.round(player.x * 3 + player.y * 5 + player.angle * 9);
  ctx.save(); ctx.fillStyle = 'rgba(1,3,3,.88)';
  ctx.beginPath(); ctx.moveTo(0, 0);
  for (let x = 0; x <= canvas.width; x += 42) {
    const depth = 18 + rockNoise(Math.floor(x / 42), shift) * 38;
    ctx.lineTo(x, depth);
  }
  ctx.lineTo(canvas.width, 0); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 12; i++) {
    const x = i * 86 + 18 + rockNoise(i, shift) * 28, width = 10 + rockNoise(i * 4, shift) * 17, length = 18 + rockNoise(i * 7, shift) * 68;
    ctx.fillStyle = i % 2 ? theme.walls[1] : theme.walls[2]; ctx.globalAlpha = .6;
    ctx.beginPath(); ctx.moveTo(x - width, 0); ctx.lineTo(x + width, 0); ctx.lineTo(x + width * .25, length); ctx.lineTo(x - width * .22, length * .72); ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 8; i++) {
    const x = i * 128 + rockNoise(i, shift + 4) * 45, width = 13 + rockNoise(i * 6, shift) * 18, length = 8 + rockNoise(i * 9, shift) * 25;
    ctx.fillStyle = '#020405'; ctx.globalAlpha = .78; ctx.beginPath(); ctx.moveTo(x - width, canvas.height); ctx.lineTo(x + width, canvas.height); ctx.lineTo(x, canvas.height - length); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.restore();
}

function drawAtmosphere() {
  const haze = ctx.createRadialGradient(canvas.width / 2, HORIZON - 12, 8, canvas.width / 2, HORIZON - 12, canvas.width * .58);
  haze.addColorStop(0, 'rgba(182,214,198,.075)'); haze.addColorStop(.48, 'rgba(76,108,98,.025)'); haze.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haze; ctx.fillRect(0, HORIZON - 115, canvas.width, 230);
  ctx.save();
  for (let i = 0; i < 42; i++) {
    const depth = .18 + rockNoise(i, 9) * .82;
    const x = (rockNoise(i, 12) * (canvas.width + 80) - 40 + Math.sin(pulse * (.22 + rockNoise(i, 15)) + i) * (8 + depth * 20));
    const y = 68 + rockNoise(i, 18) * 430 + Math.sin(pulse * (.35 + depth) + i * 3) * 9;
    const size = .5 + depth * 1.7;
    ctx.globalAlpha = .025 + depth * .08;
    ctx.fillStyle = i % 5 === 0 ? theme.crystal : '#d7ddd0';
    ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawLanternModel() {
  const flicker = Math.sin(pulse * 5.3) * 2 + Math.sin(pulse * 11.7) * 1.2;
  const swing = Math.sin(pulse * 2.1) * .045;
  ctx.save(); ctx.translate(canvas.width - 132, canvas.height - 28); ctx.rotate(swing);
  const glow = ctx.createRadialGradient(0, -76, 4, 0, -76, 96 + flicker * 2);
  glow.addColorStop(0, 'rgba(255,235,165,.27)'); glow.addColorStop(.22, 'rgba(255,182,78,.11)'); glow.addColorStop(1, 'rgba(255,151,48,0)');
  ctx.fillStyle = glow; ctx.fillRect(-115, -185, 230, 185);
  ctx.shadowBlur = 18; ctx.shadowColor = '#070909'; ctx.fillStyle = '#151c1d';
  ctx.beginPath(); ctx.moveTo(-30, -13); ctx.lineTo(31, -13); ctx.lineTo(24, -101); ctx.lineTo(-23, -101); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = '#78918d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-24, -101); ctx.quadraticCurveTo(0, -145, 25, -101); ctx.stroke();
  ctx.fillStyle = '#253b3a'; ctx.fillRect(-30, -20, 61, 12); ctx.fillRect(-23, -107, 47, 10);
  ctx.strokeStyle = '#91b7ac'; ctx.lineWidth = 3; ctx.strokeRect(-22, -92, 44, 66);
  ctx.fillStyle = '#e59a42'; ctx.shadowBlur = 20; ctx.shadowColor = '#f7a94b';
  ctx.beginPath(); ctx.moveTo(0, -35); ctx.bezierCurveTo(-16, -52, -6, -78, 0, -91 + flicker); ctx.bezierCurveTo(12, -72, 18, -53, 0, -35); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.moveTo(0, -44); ctx.bezierCurveTo(-5, -55, 0, -67, 2, -74 + flicker); ctx.bezierCurveTo(9, -60, 8, -50, 0, -44); ctx.fill();
  ctx.restore();
}

function drawBillboard(item, x, baseY, size) {
  const unit = size / 100;
  ctx.save(); ctx.translate(x, baseY);
  if (item.kind === 'crystal') {
    ctx.shadowBlur = 13 * unit + 6; ctx.shadowColor = theme.glow; ctx.fillStyle = theme.crystal;
    ctx.beginPath(); ctx.moveTo(0, -94 * unit); ctx.lineTo(31 * unit, -43 * unit); ctx.lineTo(4 * unit, 3 * unit); ctx.lineTo(-31 * unit, -43 * unit); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .58; ctx.fillStyle = '#f3fffb'; ctx.beginPath(); ctx.moveTo(-3 * unit, -83 * unit); ctx.lineTo(9 * unit, -42 * unit); ctx.lineTo(-5 * unit, -33 * unit); ctx.closePath(); ctx.fill();
  } else if (item.kind === 'food') {
    ctx.shadowBlur = 7 * unit + 4; ctx.shadowColor = '#df704f'; ctx.fillStyle = '#d85645';
    ctx.beginPath(); ctx.arc(0, -34 * unit, 28 * unit, Math.PI, 0); ctx.lineTo(25 * unit, 5 * unit); ctx.lineTo(-25 * unit, 5 * unit); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e9c8a1'; ctx.fillRect(-10 * unit, -26 * unit, 20 * unit, 34 * unit);
    ctx.fillStyle = '#f8eed3'; ctx.fillRect(-15 * unit, -46 * unit, 8 * unit, 8 * unit); ctx.fillRect(9 * unit, -47 * unit, 8 * unit, 8 * unit);
  } else if (item.kind === 'wisp') {
    ctx.translate(0, Math.sin(pulse * 2 + item.x) * 11 * unit - 42 * unit); ctx.globalAlpha = .82;
    ctx.shadowBlur = 28 * unit + 9; ctx.shadowColor = '#9a76ea'; ctx.fillStyle = '#7c68bf'; ctx.beginPath(); ctx.arc(0, 0, 31 * unit, 0, TAU); ctx.fill();
    ctx.fillStyle = '#eee4ff'; ctx.beginPath(); ctx.arc(-9 * unit, -8 * unit, 8 * unit, 0, TAU); ctx.arc(11 * unit, -5 * unit, 6 * unit, 0, TAU); ctx.fill();
  } else if (item.kind === 'stalker') {
    ctx.shadowBlur = 13 * unit + 5; ctx.shadowColor = '#e9af55'; ctx.fillStyle = '#392e22';
    ctx.beginPath(); ctx.moveTo(-38 * unit, 5 * unit); ctx.lineTo(-29 * unit, -72 * unit); ctx.lineTo(-12 * unit, -94 * unit); ctx.lineTo(12 * unit, -94 * unit); ctx.lineTo(29 * unit, -72 * unit); ctx.lineTo(38 * unit, 5 * unit); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd36a'; ctx.fillRect(-21 * unit, -62 * unit, 14 * unit, 12 * unit); ctx.fillRect(8 * unit, -62 * unit, 14 * unit, 12 * unit);
  } else if (item.kind === 'crawler') {
    ctx.shadowBlur = 11 * unit + 4; ctx.shadowColor = '#d84c5c'; ctx.fillStyle = '#442034'; ctx.beginPath(); ctx.ellipse(0, -25 * unit, 44 * unit, 30 * unit, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#754052'; ctx.lineWidth = 6 * unit;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 22 * unit, -21 * unit); ctx.lineTo(side * 48 * unit, -2 * unit); ctx.stroke(); }
    ctx.fillStyle = '#f06a68'; ctx.fillRect(-22 * unit, -34 * unit, 13 * unit, 12 * unit); ctx.fillRect(10 * unit, -34 * unit, 13 * unit, 12 * unit);
  } else if (item.kind === 'exit') {
    const active = !crystals.length; ctx.shadowBlur = active ? 17 * unit + 8 : 0; ctx.shadowColor = '#e8d795'; ctx.strokeStyle = active ? '#e8d795' : '#4f5147'; ctx.lineWidth = 10 * unit;
    ctx.strokeRect(-35 * unit, -94 * unit, 70 * unit, 99 * unit); ctx.fillStyle = active ? '#b88e4b' : '#232926'; ctx.fillRect(-24 * unit, -65 * unit, 48 * unit, 70 * unit);
    ctx.globalAlpha = active ? .35 : .2; ctx.fillStyle = '#fff1aa'; ctx.fillRect(-13 * unit, -57 * unit, 12 * unit, 48 * unit);
  }
  ctx.restore();
}

function draw3DSprites(depths) {
  const things = [
    ...crystals.map(item => ({...item, kind: 'crystal', scale: .48})),
    ...foods.map(item => ({...item, kind: 'food', scale: .48})),
    ...monsters.map(item => ({...item, kind: item.type, scale: item.type === 'stalker' ? .92 : item.type === 'wisp' ? .68 : .72})),
    {...exit, kind: 'exit', scale: .95}
  ].map(item => {
    const dx = item.x + .5 - (player.x + .5), dy = item.y + .5 - (player.y + .5);
    const distance = Math.hypot(dx, dy), offset = wrapAngle(Math.atan2(dy, dx) - player.angle);
    return {...item, distance, offset, forward: distance * Math.cos(offset)};
  }).filter(item => item.forward > .1 && Math.abs(item.offset) < FOV / 2 + .24).sort((a, b) => b.forward - a.forward);
  for (const item of things) {
    const x = canvas.width / 2 + Math.tan(item.offset) * FOCAL_LENGTH;
    const depth = depths[Math.max(0, Math.min(depths.length - 1, Math.floor(x / RAY_WIDTH)))];
    if (item.forward > depth + .1 || x < -260 || x > canvas.width + 260) continue;
    const size = Math.min(canvas.height * 1.5, FOCAL_LENGTH * item.scale / item.forward);
    drawBillboard(item, x, HORIZON + size * .49, size);
  }
}

function drawEchoScope() {
  const left = 17, top = 17, size = 105, cell = 6, radius = 8, centerX = left + size / 2, centerY = top + size / 2 + 7;
  ctx.save(); ctx.fillStyle = 'rgba(2,7,8,.7)'; ctx.strokeStyle = 'rgba(129,205,199,.35)'; ctx.fillRect(left, top, size, size); ctx.strokeRect(left + .5, top + .5, size - 1, size - 1);
  ctx.font = '10px "DM Mono", monospace'; ctx.fillStyle = '#93c8c2'; ctx.fillText('ECHO SCOPE', left + 8, top + 14);
  for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) if (map[player.y + y]?.[player.x + x]) { ctx.globalAlpha = .58; ctx.fillStyle = theme.mark; ctx.fillRect(centerX + x * cell - 2, centerY + y * cell - 2, 4, 4); }
  const ping = (item, color) => { const dx = item.x + .5 - (player.x + .5), dy = item.y + .5 - (player.y + .5); if (Math.hypot(dx, dy) < radius) { ctx.globalAlpha = .9; ctx.fillStyle = color; ctx.fillRect(centerX + dx * cell - 1.5, centerY + dy * cell - 1.5, 3, 3); } };
  crystals.forEach(item => ping(item, theme.crystal)); foods.forEach(item => ping(item, '#e36b51')); monsters.forEach(item => ping(item, item.type === 'wisp' ? '#b09bff' : '#ef7070')); ping(exit, !crystals.length ? '#f1dd87' : '#65706a');
  ctx.globalAlpha = 1; ctx.fillStyle = '#fff4cc'; ctx.beginPath(); ctx.arc(centerX, centerY, 3, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff4cc'; ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(centerX + Math.cos(player.angle) * 11, centerY + Math.sin(player.angle) * 11); ctx.stroke(); ctx.restore();
}

function drawLanternOverlay() {
  const radius = burst ? 690 : 470, glow = ctx.createRadialGradient(canvas.width / 2, HORIZON + 42, 40, canvas.width / 2, HORIZON + 42, radius);
  glow.addColorStop(0, 'rgba(255,202,113,.085)'); glow.addColorStop(.38, 'rgba(137,108,61,.028)'); glow.addColorStop(.62, 'rgba(0,0,0,.06)'); glow.addColorStop(1, 'rgba(0,0,0,.86)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(canvas.width / 2, HORIZON + 7); ctx.strokeStyle = 'rgba(224,247,229,.58)'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-2, 0); ctx.moveTo(2, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, -2); ctx.moveTo(0, 2); ctx.lineTo(0, 8); ctx.stroke(); ctx.restore();
  const compass = ['N', 'E', 'S', 'W'][Math.round(wrapAngle(player.angle) / (Math.PI / 2) + 4) % 4];
  ctx.font = '11px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#c2ded5'; ctx.globalAlpha = .8; ctx.fillText(compass, canvas.width / 2, 25); ctx.font = '9px "DM Mono", monospace'; ctx.fillStyle = '#7c928c'; ctx.fillText(`LANTERN RANGE ${weapons.lance ? 'VII' : 'IV'}`, canvas.width / 2, canvas.height - 20); ctx.globalAlpha = 1; ctx.textAlign = 'start';
}

function draw3D() {
  pulse += .035; burst = Math.max(0, burst - .045);
  drawCaveBackground(); const depths = drawRaycastWalls(); drawGroundDetails(depths); draw3DSprites(depths); drawCaveFormations(); drawAtmosphere(); drawLanternOverlay(); drawLanternModel(); drawEchoScope();
  requestAnimationFrame(draw3D);
}

function begin() { ensureAudio(); makeCave(true); overlay.classList.add('hidden'); running = true; }
function nextLevel() { level++; makeCave(false); overlay.classList.add('hidden'); running = true; }
const directions = {arrowup:[1,0],w:[1,0],arrowdown:[-1,0],s:[-1,0],arrowleft:[0,-1],a:[0,-1],arrowright:[0,1],d:[0,1]};
function moveRelative(forward, strafe) {
  const rawX = Math.cos(player.angle) * forward - Math.sin(player.angle) * strafe;
  const rawY = Math.sin(player.angle) * forward + Math.cos(player.angle) * strafe;
  let dx = Math.abs(rawX) < .3 ? 0 : Math.sign(rawX);
  let dy = Math.abs(rawY) < .3 ? 0 : Math.sign(rawY);
  if (dx && dy && (map[player.y]?.[player.x + dx] || map[player.y + dy]?.[player.x])) {
    if (Math.abs(rawX) >= Math.abs(rawY)) dy = 0; else dx = 0;
  }
  if (dx || dy) move(dx, dy);
}
window.addEventListener('keydown', e => { const k=e.key.toLowerCase(); if (directions[k]) { e.preventDefault(); if (!e.repeat) { heldDirection=directions[k]; moveRelative(...heldDirection); clearInterval(moveTimer); moveTimer=setInterval(()=>moveRelative(...heldDirection),95); } } if (k === ' ') { e.preventDefault(); if (!e.repeat) lanternBurst(); } if(k==='f'&&!e.repeat) bladeStrike(); if(k==='b'&&!e.repeat&&!inventoryOpen) shopOpen?closeShop():openShop(); if(k==='i'&&!e.repeat&&!shopOpen) inventoryOpen?closeInventory():openInventory(); if(k==='escape'&&shopOpen) closeShop(); if(k==='escape'&&inventoryOpen) closeInventory(); if(shopOpen&&k==='1') buyWeapon('lance',5); if(shopOpen&&k==='2') buyWeapon('blade',8); if(shopOpen&&k==='3') buyHeart(); });
window.addEventListener('keyup', e => { if (directions[e.key.toLowerCase()]) { heldDirection=null; clearInterval(moveTimer); } });
function turnWithMouse(deltaX) {
  if (!running || won || shopOpen || inventoryOpen || !deltaX) return;
  player.angle = wrapAngle(player.angle + deltaX * .0032);
}
canvas.addEventListener('click', () => {
  if (running && !won && !shopOpen && !inventoryOpen) canvas.requestPointerLock?.();
});
canvas.addEventListener('mousedown', event => { mouseDragging = true; lastPointerX = event.clientX; });
window.addEventListener('mouseup', () => { mouseDragging = false; });
document.addEventListener('mousemove', event => {
  if (document.pointerLockElement === canvas) turnWithMouse(event.movementX);
  else if (mouseDragging) { turnWithMouse(event.clientX - lastPointerX); lastPointerX = event.clientX; }
});
start.onclick = begin; newCave.onclick = begin; soundToggle.onclick = () => { ensureAudio(); muted=!muted; master.gain.setTargetAtTime(muted?.0001:.22,audio.currentTime,.03); soundToggle.textContent=muted?'Sound off':'Sound on'; soundToggle.setAttribute('aria-pressed',String(!muted)); }; makeCave(); draw3D();
