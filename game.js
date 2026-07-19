const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
const overlay = document.querySelector('#message'), start = document.querySelector('#start-button');
const newCave = document.querySelector('#new-cave'), soundToggle = document.querySelector('#sound-toggle'), crystalCount = document.querySelector('#crystal-count');
const crystalTotal = document.querySelector('#crystal-total'), depth = document.querySelector('#depth'), healthDisplay = document.querySelector('#health');
const COLS = 45, ROWS = 30, TILE = 20;
let map, player, crystals, monsters, exit, health, running = false, won = false, pulse = 0, burst = 0;
let audio, master, muted = false, ambienceStarted = false;
let heldDirection = null, moveTimer = 0;

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
function sound(kind) { if (muted || !audio) return; if(kind==='step') tone(100,.045,'triangle',.035,.8); if(kind==='crystal'){tone(740,.2,'sine',.1,1.5);setTimeout(()=>tone(1110,.25,'sine',.07,1.2),60)} if(kind==='burst'){tone(180,.35,'sawtooth',.12,4);noise(.18,.08)} if(kind==='hurt'){noise(.25,.16);tone(90,.3,'sawtooth',.12,.45)} if(kind==='win'){[440,554,659,880].forEach((f,i)=>setTimeout(()=>tone(f,.35,'sine',.1,1.02),i*110));} if(kind==='lose'){tone(210,.8,'sawtooth',.13,.25);} }
function startAmbience() { ambienceStarted=true; const now=audio.currentTime; [55,82.4].forEach((frequency,index)=>{const osc=audio.createOscillator(), gain=audio.createGain(), filter=audio.createBiquadFilter();osc.type='sine';osc.frequency.value=frequency;gain.gain.value=index?.018:.035;filter.type='lowpass';filter.frequency.value=230;osc.connect(filter).connect(gain).connect(master);osc.start(now);}); const chime=()=>{if(!muted&&running){tone([220,277,330,415][Math.floor(Math.random()*4)],1.8,'sine',.012,.99)} setTimeout(chime,5000+Math.random()*6000)};chime(); }

function makeCave() {
  map = Array.from({length: ROWS}, (_, y) => Array.from({length: COLS}, (_, x) => x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 || Math.random() < .43 ? 1 : 0));
  for (let pass = 0; pass < 5; pass++) map = map.map((row, y) => row.map((cell, x) => {
    if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return 1;
    let n = 0; for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) if (map[y + yy]?.[x + xx]) n++;
    return n >= 5 ? 1 : 0;
  }));
  let x = 2, y = 2; map[y][x] = 0;
  while (x < COLS - 3 || y < ROWS - 3) { if ((Math.random() < .58 && x < COLS - 3) || y >= ROWS - 3) x++; else y++; map[y][x] = 0; if (Math.random() < .35) map[Math.max(1, y - 1)][x] = 0; }
  player = {x: 2, y: 2, bob: 0}; exit = {x: COLS - 3, y: ROWS - 3}; crystals = [];
  const reachable = [], seen = new Set(['2,2']), queue = [{x: 2, y: 2}];
  while (queue.length) { const p = queue.shift(); reachable.push(p); for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const q={x:p.x+dx,y:p.y+dy}, id=`${q.x},${q.y}`; if (!seen.has(id) && !map[q.y]?.[q.x]) { seen.add(id); queue.push(q); } } }
  for (let i = 0; i < 11; i++) { let p; do p = reachable[Math.floor(Math.random() * reachable.length)]; while (crystals.some(c=>c.x===p.x&&c.y===p.y) || Math.abs(p.x-player.x)+Math.abs(p.y-player.y)<5 || (p.x===exit.x&&p.y===exit.y)); crystals.push(p); }
  monsters = [];
  for (let i = 0; i < 4; i++) { let p; do p = reachable[Math.floor(Math.random() * reachable.length)]; while (Math.abs(p.x-player.x)+Math.abs(p.y-player.y)<12 || (p.x===exit.x&&p.y===exit.y) || crystals.some(c=>c.x===p.x&&c.y===p.y) || monsters.some(m=>m.x===p.x&&m.y===p.y)); monsters.push({...p, cool: 0}); }
  health = 3; healthDisplay.textContent = '♥'.repeat(health) + '♡'.repeat(3-health); crystalTotal.textContent = crystals.length; crystalCount.textContent = 0; depth.textContent = 300 + Math.floor(Math.random() * 500); won = false; burst = 0;
}
function move(dx, dy) { if (!running || won) return; const nx = player.x + dx, ny = player.y + dy; if (!map[ny]?.[nx]) { sound('step'); player.x = nx; player.y = ny; player.bob = .35; const found = crystals.findIndex(c => c.x === nx && c.y === ny); if (found >= 0) { crystals.splice(found, 1); crystalCount.textContent = +crystalCount.textContent + 1; sound('crystal'); } if (nx === exit.x && ny === exit.y && !crystals.length) victory(); monsterTurn(); } }
function monsterTurn() {
  for (const m of monsters) { if (m.cool) { m.cool--; continue; } const dx=player.x-m.x, dy=player.y-m.y, choices=Math.abs(dx)+Math.abs(dy)<10 ? [[Math.sign(dx),0],[0,Math.sign(dy)]] : [[0,1],[1,0],[0,-1],[-1,0]].sort(()=>Math.random()-.5); for (const [mx,my] of choices) { const nx=m.x+mx, ny=m.y+my; if (!map[ny]?.[nx] && !(nx===player.x&&ny===player.y) && !monsters.some(o=>o!==m&&o.x===nx&&o.y===ny)) { m.x=nx;m.y=ny;break; } } }
  if (monsters.some(m=>Math.abs(m.x-player.x)+Math.abs(m.y-player.y)<=1)) hurt();
}
function hurt() { health--; sound('hurt'); healthDisplay.textContent = '♥'.repeat(Math.max(0,health)) + '♡'.repeat(Math.max(0,3-health)); if (health <= 0) gameOver(); }
function lanternBurst() { if (!running || won) return; burst = 1; sound('burst'); const before=monsters.length; monsters = monsters.filter(m => Math.abs(m.x-player.x)+Math.abs(m.y-player.y)>4); if (before === monsters.length) monsterTurn(); }
function victory() { won = true; sound('win'); overlay.innerHTML = '<p class="eyebrow">SIGNAL FOUND</p><h2>You made it out.</h2><p>The cave gives up its last echo as daylight spills through the gate.</p><button id="again">Explore another cave</button>'; overlay.classList.remove('hidden'); document.querySelector('#again').onclick = begin; }
function gameOver() { won = true; sound('lose'); overlay.innerHTML = '<p class="eyebrow">LANTERN EXTINGUISHED</p><h2>The dark takes you.</h2><p>Something unseen carries on through the tunnels.</p><button id="again">Try another descent</button>'; overlay.classList.remove('hidden'); document.querySelector('#again').onclick = begin; }
function draw() {
  pulse += .04; ctx.fillStyle = '#080d0e'; ctx.fillRect(0, 0, 900, 600);
  for (let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) { const px=x*TILE, py=y*TILE; if (map[y][x]) { const seed=(x*17+y*31)%3; ctx.fillStyle=['#182327','#1d2b2d','#132024'][seed]; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='#26363a'; ctx.fillRect(px+3,py+3,4,3); } else { ctx.fillStyle='#0e1719'; ctx.fillRect(px,py,TILE,TILE); ctx.strokeStyle='#142124'; ctx.strokeRect(px+.5,py+.5,TILE-1,TILE-1); } }
  const lit = !crystals.length; ctx.save(); ctx.translate(exit.x*TILE+10, exit.y*TILE+10); ctx.strokeStyle=lit?'#e8d795':'#4f5147'; ctx.lineWidth=3; ctx.strokeRect(-7,-9,14,18); ctx.fillStyle=lit?'#b88e4b':'#232926'; ctx.fillRect(-4,-5,8,12); ctx.restore();
  crystals.forEach(c=>{ ctx.save(); ctx.shadowBlur=11+Math.sin(pulse+c.x)*2; ctx.shadowColor='#42d9e5'; ctx.fillStyle='#74f0ee'; ctx.beginPath();ctx.moveTo(c.x*TILE+10,c.y*TILE+2);ctx.lineTo(c.x*TILE+15,c.y*TILE+10);ctx.lineTo(c.x*TILE+10,c.y*TILE+18);ctx.lineTo(c.x*TILE+5,c.y*TILE+10);ctx.fill();ctx.restore(); });
  monsters.forEach(m=>{ const mx=m.x*TILE+10,my=m.y*TILE+10;ctx.save();ctx.translate(mx,my);ctx.shadowBlur=7;ctx.shadowColor='#d84c5c';ctx.fillStyle='#442034';ctx.beginPath();ctx.arc(0,2,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f06a68';ctx.fillRect(-4,-1,3,3);ctx.fillRect(2,-1,3,3);ctx.restore(); });
  ctx.save();ctx.translate(player.x*TILE+10,player.y*TILE+11+Math.sin(pulse*4)*player.bob*3);ctx.shadowBlur=12;ctx.shadowColor='#ffcc72';ctx.fillStyle='#f0b65a';ctx.beginPath();ctx.arc(0,-3,5,0,7);ctx.fill();ctx.fillStyle='#295e62';ctx.fillRect(-5,1,10,8);ctx.restore();
  const gx=player.x*TILE+10, gy=player.y*TILE+10, g=ctx.createRadialGradient(gx,gy,35,gx,gy,burst?220:145); g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,'rgba(0,0,0,.08)');g.addColorStop(1,'rgba(0,0,0,.92)');ctx.fillStyle=g;ctx.fillRect(0,0,900,600); if(burst) burst=Math.max(0,burst-.05); requestAnimationFrame(draw);
}
function begin() { ensureAudio(); makeCave(); overlay.classList.add('hidden'); running = true; }
const directions = {arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
window.addEventListener('keydown', e => { const k=e.key.toLowerCase(); if (directions[k]) { e.preventDefault(); if (!e.repeat) { heldDirection=directions[k]; move(...heldDirection); clearInterval(moveTimer); moveTimer=setInterval(()=>move(...heldDirection),95); } } if (k === ' ') { e.preventDefault(); if (!e.repeat) lanternBurst(); } });
window.addEventListener('keyup', e => { if (directions[e.key.toLowerCase()]) { heldDirection=null; clearInterval(moveTimer); } });
start.onclick = begin; newCave.onclick = begin; soundToggle.onclick = () => { ensureAudio(); muted=!muted; master.gain.setTargetAtTime(muted?.0001:.22,audio.currentTime,.03); soundToggle.textContent=muted?'Sound off':'Sound on'; soundToggle.setAttribute('aria-pressed',String(!muted)); }; makeCave(); draw();
