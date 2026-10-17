const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
const overlay = document.querySelector('#message'), start = document.querySelector('#start-button');
const newCave = document.querySelector('#new-cave'), soundToggle = document.querySelector('#sound-toggle'), crystalCount = document.querySelector('#crystal-count');
const crystalTotal = document.querySelector('#crystal-total'), depth = document.querySelector('#depth'), healthDisplay = document.querySelector('#health'), armorDisplay = document.querySelector('#armor'), hungerDisplay = document.querySelector('#hunger'), shardsDisplay = document.querySelector('#shards'), woodDisplay = document.querySelector('#wood-count'), foodDisplay = document.querySelector('#food-count'), caveName = document.querySelector('#cave-name'), caveRuleDisplay = document.querySelector('#cave-rule'), levelDisplay = document.querySelector('#level'), renownDisplay = document.querySelector('#renown'), missionsDisplay = document.querySelector('#missions');
const COLS = 84, ROWS = 56, TILE = 20;
const WALK_DELAY = 165, SPRINT_DELAY = 82, HUNGER_EFFORT_LIMIT = 26, BROODMOTHER_DELAY = 1050;
const HOME_BOUNDS = {left:3,right:66,top:4,bottom:50};
class CaveEngine {
  constructor(view,tile,cols,rows){this.width=view.width||900;this.height=view.height||600;this.tile=tile;this.worldWidth=cols*tile;this.worldHeight=rows*tile;this.camera={x:0,y:0};}
  cameraTarget(target){return{x:Math.max(0,Math.min(this.worldWidth-this.width,target.x*this.tile+this.tile/2-this.width/2)),y:Math.max(0,Math.min(this.worldHeight-this.height,target.y*this.tile+this.tile/2-this.height/2))};}
  snap(target){const next=this.cameraTarget(target);this.camera.x=next.x;this.camera.y=next.y;}
  follow(target){const next=this.cameraTarget(target);this.camera.x+=(next.x-this.camera.x)*.14;this.camera.y+=(next.y-this.camera.y)*.14;}
  begin(context){context.save();context.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));}
  end(context){context.restore();}
  visibleTiles(){return{left:Math.max(0,Math.floor(this.camera.x/this.tile)-1),right:Math.min(COLS-1,Math.ceil((this.camera.x+this.width)/this.tile)+1),top:Math.max(0,Math.floor(this.camera.y/this.tile)-1),bottom:Math.min(ROWS-1,Math.ceil((this.camera.y+this.height)/this.tile)+1)};}
  screen(x,y){return{x:x*this.tile+this.tile/2-this.camera.x,y:y*this.tile+this.tile/2-this.camera.y};}
}
const engine=new CaveEngine(canvas,TILE,COLS,ROWS);
const CAVES = [
  {id:'basalt',name:'BASALT',rule:'A stable cave with no special hazard.',walls:['#182327','#1d2b2d','#132024'],floor:'#0e1719',line:'#142124',mark:'#26363a',crystal:'#74f0ee',glow:'#42d9e5'},
  {id:'frost',name:'FROST',rule:'Cold stone, clear paths, and pale crystals.',walls:['#23343d','#2a3e48','#1c2d36'],floor:'#101c25',line:'#19303c',mark:'#638397',crystal:'#c8f5ff',glow:'#7fd9ff'},
  {id:'ember',name:'EMBER',rule:'A hot but stable cave lit by ember crystals.',walls:['#3a2521','#462a23','#2f1e1c'],floor:'#211311',line:'#38201d',mark:'#70402d',crystal:'#ffbf70',glow:'#ef653e'},
  {id:'verdant',name:'VERDANT',rule:'Dense growth hides monsters in green shadows.',walls:['#1d3024','#263d2a','#17291e'],floor:'#0e1d15',line:'#183022',mark:'#3b6744',crystal:'#b5ef8d',glow:'#71d26e'},
  {id:'flooded',name:'FLOODED GROTTO',rule:'Water tiles slow movement, even while sprinting.',walls:['#12303b','#173d49','#0d2732'],floor:'#081b24',line:'#123541',mark:'#357284',crystal:'#78e7ff',glow:'#28bfe3'},
  {id:'cathedral',name:'CRYSTAL CATHEDRAL',rule:'Prism energy extends every lantern burst by 3 tiles.',walls:['#30234a','#3d2c5c','#241a39'],floor:'#171025',line:'#2b1f43',mark:'#765ba1',crystal:'#efc9ff',glow:'#c778ff'},
  {id:'fungal',name:'FUNGAL HOLLOW',rule:'Mushrooms may provide food or release draining spores.',walls:['#23351f','#304328','#192918'],floor:'#111d12',line:'#203420',mark:'#6e8050',crystal:'#d5ff88',glow:'#8ddf61'},
  {id:'magma',name:'MAGMA VEINS',rule:'Lava tiles damage the lantern once, then cool.',walls:['#462018','#57271c','#321612'],floor:'#21100d',line:'#3f1c16',mark:'#a34b26',crystal:'#ffd06a',glow:'#ff6238'},
  {id:'frozen',name:'FROZEN DEPTHS',rule:'Ice carries you forward until rock or clear ground stops you.',walls:['#274251','#315565','#1d3442'],floor:'#122630',line:'#22414f',mark:'#7eaaba',crystal:'#e0fbff',glow:'#8eeaff'},
  {id:'echo',name:'ECHO LABYRINTH',rule:'Lantern light is smaller, and sprinting alerts monsters farther away.',walls:['#20252a','#292f35','#171b20'],floor:'#0d1115',line:'#1c232a',mark:'#4b5761',crystal:'#bdd6dc',glow:'#8eb5c2'},
  {id:'mine',name:'ANCIENT MINE',rule:'Rails speed movement; supply crates hold food and shards.',walls:['#3b3027','#493a2d','#2a231d'],floor:'#1d1814',line:'#33291f',mark:'#796047',crystal:'#f1c77d',glow:'#d89445'},
  {id:'living',name:'LIVING CAVERN',rule:'The cave grows a new wall every 18 successful steps.',walls:['#38232b','#472b35','#291a21'],floor:'#1c1117',line:'#321d26',mark:'#7d3f51',crystal:'#ff9eb5',glow:'#dc5578'},
  {id:'void',name:'VOID RIFT',rule:'Twin rifts teleport you across the cave.',walls:['#201936','#2a2047','#151126'],floor:'#0c0915',line:'#201832',mark:'#614f91',crystal:'#d5baff',glow:'#8b65ef'},
  {id:'nest',name:'THE NEST',rule:'Crush glowing eggs before they hatch. Hide in blue moss when broodmothers approach.',walls:['#3b302b','#493930','#2b211e'],floor:'#1d1513',line:'#342520',mark:'#80564a',crystal:'#ffcb9c',glow:'#e97f65'},
  {id:'geode',name:'GEODE GARDEN',rule:'Break glittering geodes to harvest bonus crystal shards.',walls:['#312747','#3d3158','#231c36'],floor:'#151020',line:'#2a2040',mark:'#8068a0',crystal:'#f4bdff',glow:'#d56dff'},
  {id:'vault',name:'SUNKEN VAULT',rule:'Mine ore blocks and search old supply caches along the rails.',walls:['#30372f','#3a4339','#232923'],floor:'#151b16',line:'#283329',mark:'#75806c',crystal:'#f3d77c',glow:'#c5a43e'},
  {id:'reef',name:'GLOWSTONE REEF',rule:'Luminous pools expand your lantern light while you stand in them.',walls:['#17343b','#1d4147','#10272d'],floor:'#091b20',line:'#123039',mark:'#3d7c7c',crystal:'#8fffe0',glow:'#38e6c0'},
  {id:'ossuary',name:'BONE OSSUARY',rule:'Fossil blocks hide relic shards and occasional preserved food.',walls:['#3d3930','#494438','#2c2923'],floor:'#1d1a16',line:'#343027',mark:'#8e846b',crystal:'#f2e6ba',glow:'#d4bc72'},
  {id:'storm',name:'STORM CAVERN',rule:'Unstable sparks strike once, then discharge into the stone.',walls:['#242b3e','#2d3650','#191f30'],floor:'#0e1320',line:'#202b43',mark:'#596b9a',crystal:'#bde2ff',glow:'#6eafff'},
  {id:'rootbound',name:'ROOTBOUND BURROW',rule:'Ancient root blocks yield extra wood for home building.',walls:['#2d3222','#373d28','#202519'],floor:'#15180f',line:'#262d1b',mark:'#647544',crystal:'#d6ee85',glow:'#9ad44f'}
];
const HOME_THEME={id:'home',name:'HOME CAVE',rule:'Walk around your home and press E beside furniture to use it.',walls:['#303638','#394143','#252c2e'],floor:'#171e1f',line:'#263233',mark:'#64716e',crystal:'#ffd792',glow:'#f2a95f'};
const NPCS = [
  {id:'mira',name:'Mira',role:'Cartographer',color:'#68c8d0',mission:'steps',hello:'Every turn of the tunnel tells a story. Help me fill the blank places on this map.'},
  {id:'bram',name:'Bram',role:'Stonewright',color:'#d49b5b',mission:'blocks',hello:'Good walls need good stone, and good tools need someone willing to swing a pick.'},
  {id:'ilyra',name:'Ilyra',role:'Cave Gardener',color:'#8fc66b',mission:'food',hello:'The cave feeds anyone patient enough to learn which little lights are alive.'},
  {id:'kato',name:'Kato',role:'Lantern Guard',color:'#d66d72',mission:'monsters',hello:'Keep the paths safe and the whole camp sleeps easier. I can make it worth the risk.'},
  {id:'orrin',name:'Orrin',role:'Echo Scholar',color:'#b08be2',mission:'crystals',hello:'Crystals remember the stone around them. Bring me echoes and I will share what they reveal.'}
];
const MISSION_DEFS = {
  steps:{title:'Map the Dark',metric:'steps',target:tier=>90+tier*35,goal:n=>`Explore ${n} cave tiles`,reward:'5 shards + glow flask'},
  blocks:{title:'Stone and Timber',metric:'blocks',target:tier=>8+tier*3,goal:n=>`Break ${n} resource blocks`,reward:'10 wood + mining charge'},
  food:{title:'Living Harvest',metric:'food',target:tier=>6+tier*2,goal:n=>`Gather ${n} food`,reward:'5 food + healing tonic'},
  monsters:{title:'Safer Passages',metric:'monsters',target:tier=>6+tier*2,goal:n=>`Defeat ${n} monsters`,reward:'6 shards + sonic charge'},
  crystals:{title:'Echo Collection',metric:'crystals',target:tier=>8+tier*3,goal:n=>`Collect ${n} crystals`,reward:'7 shards + 2 burst cells'}
};
let map, player, crystals, foods, monsters, specialTiles, exit, health, maxHealth, armor, maxArmor, armorLevel, hunger, shards, wood, weapons, inventory, storage, homeFurniture, stats, missions, renown, theme, lastCaveId = '', caveTurn = 0, growthCount = 0, hurtCooldown = 0, smokeTurns = 0, glowTurns = 0, level = 1, shopOpen = false, inventoryOpen = false, craftingOpen = false, storageOpen = false, journalOpen = false, dialogOpen = false, homeOpen = false, forgeFromHome = false, atHome = false, running = false, won = false, pulse = 0, burst = 0, iceSliding = false;
let audio, master, muted = false, ambienceStarted = false;
let heldDirection = null, lastDirection = [1,0], moveTimer = 0, sprinting = false, hungerEffort = 0;

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

function resetProgress() {
  level=1;shards=0;wood=0;renown=0;maxHealth=6;armorLevel=0;maxArmor=0;armor=0;
  weapons={lance:false,blade:false,boots:false,lens:false,pack:false,pick:false,compass:false,charm:false};
  inventory={food:5,armorPlate:0,repairKit:0,burstCell:0,smokeBomb:0,glowFlask:0,beacon:0,stew:0,tonic:0,sonicCharge:0,campKit:0,recallRope:0,miningCharge:0};
  storage={wood:0,food:0};homeFurniture={chest:1,lamp:2,table:0,chair:0,rug:0,shelf:0,garden:0,mapTable:0,trophy:0};
  stats={steps:0,blocks:0,food:0,monsters:0,crystals:0,caves:0};
  missions=Object.fromEntries(Object.keys(MISSION_DEFS).map(id=>[id,{accepted:false,start:0,completed:0}]));
  updateMissionHUD();
}
function carveTunnel(from,to) {
  let x=from.x,y=from.y;map[y][x]=0;
  while(x!==to.x||y!==to.y){if(x!==to.x&&(y===to.y||Math.random()<.55))x+=Math.sign(to.x-x);else y+=Math.sign(to.y-y);map[y][x]=0;if(Math.random()<.5){map[Math.max(1,y-1)][x]=0;map[Math.min(ROWS-2,y+1)][x]=0;}}
}
function carveChamber(center,width,height) {
  for(let y=Math.max(1,center.y-height);y<=Math.min(ROWS-2,center.y+height);y++)for(let x=Math.max(1,center.x-width);x<=Math.min(COLS-2,center.x+width);x++)if(((x-center.x)/width)**2+((y-center.y)/height)**2<=1.15)map[y][x]=0;
}

function makeCave(newExpedition = true, forcedCaveId = null) {
  if (newExpedition) resetProgress();
  atHome=false;storageOpen=false;journalOpen=false;dialogOpen=false;
  levelDisplay.textContent = level;
  const availableCaves = CAVES.filter(cave => cave.id !== lastCaveId);
  theme = CAVES.find(cave => cave.id === forcedCaveId) || availableCaves[Math.floor(Math.random()*availableCaves.length)];
  lastCaveId = theme.id; caveName.textContent = theme.name; caveRuleDisplay.textContent = theme.rule;
  map = Array.from({length: ROWS}, (_, y) => Array.from({length: COLS}, (_, x) => x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 || Math.random() < .41 ? 1 : 0));
  for (let pass = 0; pass < 5; pass++) map = map.map((row, y) => row.map((cell, x) => {
    if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return 1;
    let n = 0; for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) if (map[y + yy]?.[x + xx]) n++;
    return n >= 5 ? 1 : 0;
  }));
  const route=[{x:2,y:2}];
  for(let i=0;i<10;i++)route.push({x:7+Math.floor(Math.random()*(COLS-14)),y:7+Math.floor(Math.random()*(ROWS-14))});
  route.sort((a,b)=>(a.x+a.y)-(b.x+b.y));route.push({x:COLS-3,y:ROWS-3});
  route.forEach((point,index)=>{carveChamber(point,3+Math.floor(Math.random()*4),2+Math.floor(Math.random()*3));if(index)carveTunnel(route[index-1],point);});
  player = {x: 2, y: 2, bob: 0}; exit = {x: COLS - 3, y: ROWS - 3}; crystals = [];
  const reachable = [], seen = new Set(['2,2']), queue = [{x: 2, y: 2}];
  while (queue.length) { const p = queue.shift(); reachable.push(p); for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const q={x:p.x+dx,y:p.y+dy}, id=`${q.x},${q.y}`; if (!seen.has(id) && !map[q.y]?.[q.x]) { seen.add(id); queue.push(q); } } }
  for (let i = 0; i < 10 + Math.ceil(level/2); i++) { let p; do p = reachable[Math.floor(Math.random() * reachable.length)]; while (crystals.some(c=>c.x===p.x&&c.y===p.y) || Math.abs(p.x-player.x)+Math.abs(p.y-player.y)<5 || (p.x===exit.x&&p.y===exit.y)); crystals.push(p); }
  foods = [];
  for (let i = 0; i < 28 + Math.floor(level / 2); i++) { let p; do p = reachable[Math.floor(Math.random() * reachable.length)]; while (foods.some(f=>f.x===p.x&&f.y===p.y) || crystals.some(c=>c.x===p.x&&c.y===p.y) || Math.abs(p.x-player.x)+Math.abs(p.y-player.y)<4 || (p.x===exit.x&&p.y===exit.y)); foods.push(p); }
  monsters = [];
  const monsterMix = ['crawler','crawler','stalker','wisp','beetle','moth'];
  const monsterTypes = Array.from({length: Math.min(14, 6 + Math.ceil(level/2))}, (_, i) => monsterMix[i % monsterMix.length]);
  if(theme.id==='nest') monsterTypes.push('mother','mother');
  for (const type of monsterTypes) { let p; do p = reachable[Math.floor(Math.random() * reachable.length)]; while (Math.abs(p.x-player.x)+Math.abs(p.y-player.y)<12 || (p.x===exit.x&&p.y===exit.y) || crystals.some(c=>c.x===p.x&&c.y===p.y) || foods.some(f=>f.x===p.x&&f.y===p.y) || monsters.some(m=>m.x===p.x&&m.y===p.y)); monsters.push({...p, type, cool:type==='mother'?1:0}); }
  specialTiles = []; caveTurn = 0; growthCount = 0; hurtCooldown = 0; smokeTurns = 0; glowTurns = 0; iceSliding = false;
  const occupied = p => (p.x===player.x&&p.y===player.y) || (p.x===exit.x&&p.y===exit.y) || crystals.some(c=>c.x===p.x&&c.y===p.y) || foods.some(f=>f.x===p.x&&f.y===p.y) || monsters.some(m=>m.x===p.x&&m.y===p.y);
  const addSpecials = (type, count, makeExtra = () => ({}), allowOccupied = false) => {
    const choices = reachable.filter(p => (allowOccupied || !occupied(p)) && Math.abs(p.x-player.x)+Math.abs(p.y-player.y)>3).sort(()=>Math.random()-.5);
    for (const p of choices) { if (specialTiles.filter(tile=>tile.type===type).length >= count) break; if (!specialTiles.some(tile=>tile.x===p.x&&tile.y===p.y)) specialTiles.push({...p,type,...makeExtra()}); }
  };
  if(theme.id==='flooded') addSpecials('water',155,()=>({}),true);
  if(theme.id==='cathedral') addSpecials('prism',28);
  if(theme.id==='fungal') addSpecials('mushroom',30);
  if(theme.id==='magma') addSpecials('lava',24);
  if(theme.id==='frozen') addSpecials('ice',140,()=>({}),true);
  if(theme.id==='mine'){addSpecials('rail',110,()=>({}),true);addSpecials('cache',12);}
  if(theme.id==='vault'){addSpecials('rail',120,()=>({}),true);addSpecials('cache',14);}
  if(theme.id==='void') addSpecials('portal',2);
  if(theme.id==='nest') addSpecials('egg',10,()=>({timer:26+Math.floor(Math.random()*15)}));
  if(theme.id==='reef') addSpecials('glowpool',42,()=>({}),true);
  if(theme.id==='ossuary') addSpecials('relic',14);
  if(theme.id==='storm') addSpecials('spark',30);
  addSpecials('hide',theme.id==='nest'?18:9);
  addSpecials('wood',['verdant','fungal','living','nest','mine','rootbound'].includes(theme.id)?18:10);
  addSpecials('spring',4);
  addSpecials('treasure',5);
  addSpecials('shrine',3);
  const placeBreakables=(type,count)=>{
    let placed=0;
    const choices=reachable.filter(p=>!map[p.y][p.x]&&!occupied(p)&&!specialTiles.some(tile=>tile.x===p.x&&tile.y===p.y)&&Math.abs(p.x-player.x)+Math.abs(p.y-player.y)>5).sort(()=>Math.random()-.5);
    for(const p of choices){if(placed>=count)break;map[p.y][p.x]=type;if(objectivesReachable())placed++;else map[p.y][p.x]=0;}
  };
  placeBreakables(2,Math.min(30,18+Math.floor(level/2)));
  if(['mine','vault'].includes(theme.id))placeBreakables(3,20);
  if(['verdant','living','rootbound'].includes(theme.id))placeBreakables(4,22);
  if(['cathedral','geode','reef'].includes(theme.id))placeBreakables(5,20);
  if(theme.id==='ossuary')placeBreakables(6,22);
  if(['basalt','ember','magma','storm'].includes(theme.id))placeBreakables(7,15);
  if(['verdant','fungal','rootbound','living'].includes(theme.id))placeBreakables(8,15);
  if(['mine','vault','ossuary'].includes(theme.id))placeBreakables(9,15);
  if(['frost','frozen','cathedral','geode'].includes(theme.id))placeBreakables(10,15);
  placeBreakables(7+Math.floor(Math.random()*4),8);
  health = maxHealth; armor = maxArmor; hunger = 100; hungerEffort = 0; shopOpen = false; inventoryOpen = false; craftingOpen = false; journalOpen=false;dialogOpen=false;homeOpen = false; updateHunger(); updateArmor(); shardsDisplay.textContent=shards; woodDisplay.textContent=wood; foodDisplay.textContent=inventory.food; healthDisplay.textContent = '♥'.repeat(health) + '♡'.repeat(maxHealth-health); crystalTotal.textContent = crystals.length; crystalCount.textContent = 0; depth.textContent = 300 + level * 180 + Math.floor(Math.random() * 120); won = false; burst = 0; updateMissionHUD();updateCaveStatus();
  engine.snap(player);
}
function homeObject(type,x,y,solid=true,extra={}){specialTiles.push({type,x,y,solid,home:true,...extra});}
function makeHomeCave(){
  theme=HOME_THEME;atHome=true;running=true;won=false;homeOpen=true;shopOpen=false;inventoryOpen=false;craftingOpen=false;storageOpen=false;journalOpen=false;dialogOpen=false;forgeFromHome=false;smokeTurns=0;glowTurns=0;iceSliding=false;
  heldDirection=null;sprinting=false;clearTimeout(moveTimer);
  map=Array.from({length:ROWS},(_,y)=>Array.from({length:COLS},(_,x)=>x===0||y===0||x===COLS-1||y===ROWS-1?1:0));
  for(let y=HOME_BOUNDS.top;y<=HOME_BOUNDS.bottom;y++){map[y][HOME_BOUNDS.left]=1;map[y][HOME_BOUNDS.right]=1;}for(let x=HOME_BOUNDS.left;x<=HOME_BOUNDS.right;x++){map[HOME_BOUNDS.top][x]=1;map[HOME_BOUNDS.bottom][x]=1;}map[27][HOME_BOUNDS.right]=0;map[28][HOME_BOUNDS.right]=0;
  carveTunnel({x:HOME_BOUNDS.right,y:27},{x:76,y:27});
  player={x:32,y:27,bob:0};lastDirection=[0,-1];exit={x:76,y:27};crystals=[];foods=[];monsters=[];specialTiles=[];
  homeObject('bed',8,9);homeObject('workbench',22,9);homeObject('forge',30,9);homeObject('gate',76,27);
  [[14,9],[14,12],[14,15]].slice(0,homeFurniture.chest).forEach(([x,y])=>homeObject('chest',x,y));
  [[5,6],[64,6],[5,48],[64,48]].slice(0,homeFurniture.lamp).forEach(([x,y])=>homeObject('lamp',x,y));
  if(homeFurniture.table)homeObject('table',33,27);
  [[32,26],[34,26],[32,28],[34,28]].slice(0,homeFurniture.chair).forEach(([x,y])=>homeObject('chair',x,y));
  if(homeFurniture.rug)homeObject('rug',33,31,false);
  [[59,10],[59,13]].slice(0,homeFurniture.shelf).forEach(([x,y])=>homeObject('shelf',x,y));
  if(homeFurniture.garden)homeObject('garden',10,43,false);
  if(homeFurniture.mapTable)homeObject('mapTable',51,10);
  if(homeFurniture.trophy)homeObject('trophy',59,42);
  const npcSpots=[[39,18],[25,19],[21,34],[43,34],[33,39]];
  NPCS.forEach((npc,index)=>homeObject('npc',npcSpots[index][0],npcSpots[index][1],true,{npcId:npc.id}));
  health=maxHealth;armor=maxArmor;hunger=100;hungerEffort=0;hurtCooldown=0;burst=0;
  healthDisplay.textContent='♥'.repeat(health);updateArmor();updateHunger();shardsDisplay.textContent=shards;woodDisplay.textContent=wood;foodDisplay.textContent=inventory.food;crystalTotal.textContent=0;crystalCount.textContent=0;depth.textContent=0;levelDisplay.textContent=level;caveName.textContent='HOME CAVE';updateMissionHUD();
  overlay.classList.remove('menu');overlay.classList.add('hidden');updateHomePrompt();engine.snap(player);
}
function homeObjectAt(x,y){return specialTiles.find(tile=>tile.home&&tile.x===x&&tile.y===y);}
function homeTarget(){const [dx,dy]=lastDirection;return homeObjectAt(player.x+dx,player.y+dy)||homeObjectAt(player.x,player.y);}
function updateHomePrompt(){
  if(!atHome)return;
  const target=homeTarget(),npc=target?.npcId&&NPCS.find(person=>person.id===target.npcId),actions={bed:'E · REST IN BED',chest:'E · OPEN STORAGE',workbench:'E · CRAFT SUPPLIES & FURNITURE',forge:'E · USE FORGE',gate:'E · OPEN MAIN CAVE GATE',lamp:'A crafted crystal lamp',table:'A sturdy cavewood table',chair:'A cavewood chair',rug:'A woven echo rug',shelf:'A shelf for expedition keepsakes',garden:'A glowing indoor mushroom garden',mapTable:'A map table covered in expedition notes',trophy:'A monument to completed descents'};
  caveRuleDisplay.textContent=npc?`E · TALK TO ${npc.name.toUpperCase()} · ${npc.role}`:target?actions[target.type]:'HOME CAVE · Talk to five settlers for missions. Press J for your journal.';
}
function interactHome(){
  const target=homeTarget();if(!target)return;
  if(target.type==='bed'){health=maxHealth;armor=maxArmor;hunger=100;healthDisplay.textContent='♥'.repeat(health);updateArmor();updateHunger();caveRuleDisplay.textContent='RESTED · Health, hunger, and armor restored.';sound('food');}
  if(target.type==='chest')openStorage();
  if(target.type==='workbench')openCrafting();
  if(target.type==='forge')openShop(true);
  if(target.type==='gate')showCaveHub();
  if(target.type==='npc')talkToNPC(target.npcId);
}
function missionInfo(id){
  const def=MISSION_DEFS[id],state=missions[id],target=def.target(state.completed),progress=state.accepted?Math.max(0,stats[def.metric]-state.start):0;
  return{def,state,target,progress:Math.min(target,progress),ready:state.accepted&&progress>=target};
}
function updateMissionHUD(){
  if(!missions||!stats)return;
  const all=Object.keys(MISSION_DEFS).map(missionInfo),active=all.filter(item=>item.state.accepted).length,ready=all.filter(item=>item.ready).length;
  if(renownDisplay)renownDisplay.textContent=renown;
  if(missionsDisplay)missionsDisplay.textContent=ready?`${ready} READY`:active||'--';
}
function recordStat(metric,amount=1){if(!stats)return;stats[metric]+=amount;updateMissionHUD();}
function acceptMission(id){const {def,state}=missionInfo(id);state.accepted=true;state.start=stats[def.metric];sound('buy');updateMissionHUD();talkToNPC(NPCS.find(npc=>npc.mission===id).id);}
function grantMissionReward(id){
  if(id==='steps'){shards+=5;inventory.glowFlask++;}
  if(id==='blocks'){wood+=10;inventory.miningCharge++;}
  if(id==='food'){inventory.food+=5;inventory.tonic++;}
  if(id==='monsters'){shards+=6;inventory.sonicCharge++;}
  if(id==='crystals'){shards+=7;inventory.burstCell+=2;}
  shardsDisplay.textContent=shards;woodDisplay.textContent=wood;foodDisplay.textContent=inventory.food;sound('win');
}
function claimMission(id){const info=missionInfo(id);if(!info.ready)return;grantMissionReward(id);info.state.accepted=false;info.state.completed++;renown++;updateMissionHUD();talkToNPC(NPCS.find(npc=>npc.mission===id).id);}
function talkToNPC(npcId){
  const npc=NPCS.find(person=>person.id===npcId);if(!npc||!atHome)return;
  dialogOpen=true;homeOpen=false;const {def,state,target,progress,ready}=missionInfo(npc.mission),tier=state.completed+1;
  const status=!state.accepted?`I have work if you want it: <b>${def.goal(target)}</b>.`:ready?'You did it. The whole camp felt the difference. Your reward is ready.':`Keep at it. You have completed <b>${progress}/${target}</b>.`;
  const action=!state.accepted?`<button id="mission-action">Accept mission</button>`:ready?`<button id="mission-action">Claim reward</button>`:'';
  overlay.classList.add('menu');overlay.innerHTML=`<div class="menu-panel dialogue-panel"><p class="eyebrow">${npc.role.toUpperCase()} · MISSION TIER ${tier}</p><h2>${npc.name}</h2><p class="dialogue-quote">“${npc.hello}”</p><div class="mission-card ${ready?'ready':''}"><b>${def.title}</b><span>${status}</span><small>Reward: ${def.reward} · +1 renown</small></div>${action}<button id="dialogue-back">Keep exploring home</button></div>`;overlay.classList.remove('hidden');
  const actionButton=document.querySelector('#mission-action');if(actionButton)actionButton.onclick=()=>state.accepted?claimMission(npc.mission):acceptMission(npc.mission);document.querySelector('#dialogue-back').onclick=closeDialogue;
}
function closeDialogue(){dialogOpen=false;homeOpen=true;overlay.classList.remove('menu');overlay.classList.add('hidden');updateHomePrompt();}
function openJournal(){
  if(!running||won||shopOpen||inventoryOpen||craftingOpen||storageOpen||dialogOpen)return;
  journalOpen=true;if(atHome)homeOpen=false;const cards=NPCS.map(npc=>{const {def,state,target,progress,ready}=missionInfo(npc.mission);const status=state.accepted?`${progress}/${target}`:'Not accepted';return`<div class="mission-card ${ready?'ready':''}"><b>${def.title}</b><span>${npc.name} · ${status}${ready?' · RETURN FOR REWARD':''}</span><small>${def.goal(target)} · ${def.reward}</small></div>`;}).join('');
  overlay.classList.add('menu');overlay.innerHTML=`<div class="menu-panel"><p class="eyebrow">MISSION JOURNAL · ${renown} RENOWN</p><h2>Help the settlement grow.</h2><p>Talk to each settler in the Home Cave to accept or turn in repeatable missions.</p><div class="mission-list">${cards}</div><p class="resources">Lifetime: <b>${stats.steps}</b> tiles · <b>${stats.blocks}</b> blocks · <b>${stats.food}</b> food · <b>${stats.monsters}</b> monsters · <b>${stats.crystals}</b> crystals · <b>${stats.caves}</b> caves</p><button id="journal-back">Return to ${atHome?'home':'cave'}</button></div>`;overlay.classList.remove('hidden');document.querySelector('#journal-back').onclick=closeJournal;
}
function closeJournal(){journalOpen=false;overlay.classList.remove('menu');overlay.classList.add('hidden');if(atHome){homeOpen=true;updateHomePrompt();}}
function updateHunger() { hungerDisplay.textContent = '█'.repeat(Math.ceil(hunger / 20)) + '░'.repeat(5-Math.ceil(hunger / 20)); }
function updateArmor() { armorDisplay.textContent = maxArmor ? '◆'.repeat(armor) + '◇'.repeat(maxArmor-armor) : '--'; }
function starve() { won = true; running = false; sound('lose'); overlay.classList.remove('menu'); overlay.innerHTML = '<p class="eyebrow">SUPPLIES EXHAUSTED</p><h2>You run out of strength.</h2><p>You keep everything you gathered. Recover at camp before choosing another cave.</p><button id="again">Wake at home</button>'; overlay.classList.remove('hidden'); document.querySelector('#again').onclick = showHome; }
function specialAt(x, y, type = null) { return specialTiles.find(tile => tile.x === x && tile.y === y && (!type || tile.type === type)); }
function removeSpecial(tile) { specialTiles.splice(specialTiles.indexOf(tile), 1); }
function playerIsHidden() { return smokeTurns>0 || Boolean(specialAt(player.x,player.y,'hide')); }
function updateCaveStatus() {
  if(!theme)return;
  const hidden=playerIsHidden(),buffs=[smokeTurns&&`SMOKE ${smokeTurns}`,glowTurns&&`GLOW ${glowTurns}`].filter(Boolean).join(' · ');
  if(theme.id==='nest'){
    const eggs=specialTiles.filter(tile=>tile.type==='egg').length,mothers=monsters.filter(monster=>monster.type==='mother').length;
    caveRuleDisplay.textContent=`${buffs?`${buffs} · `:''}${hidden?'HIDDEN · Broodmothers cannot see you. ':''}${eggs} egg${eggs===1?'':'s'} remain · ${mothers} broodmother${mothers===1?'':'s'} hunting. Crush eggs by stepping on them or pressing E beside them.`;
  } else caveRuleDisplay.textContent=buffs?`${buffs} · ${hidden?'Monsters cannot track you.':theme.rule}`:hidden?'HIDDEN · Monsters have trouble tracking you here.':theme.rule;
}
function collectWood(amount = 1) { wood += amount; woodDisplay.textContent = wood; sound('buy'); }
function collectFood(amount = 1) { const gathered=weapons.pack?amount*2:amount;inventory.food+=gathered;recordStat('food',gathered);foodDisplay.textContent = inventory.food; sound('food'); autoEatFood(); }
function crushEgg(tile) { if(!tile)return false; removeSpecial(tile); shards++; shardsDisplay.textContent=shards; sound('crystal'); updateCaveStatus(); return true; }
function resolveSpecialTile(tile) {
  if (!tile) return;
  if (tile.type === 'mushroom') {
    removeSpecial(tile);
    if (Math.random() < .72) collectFood();
    else { hunger = Math.max(0, hunger - 5); updateHunger(); sound('hurt'); autoEatFood(); }
  }
  if (tile.type === 'lava') { removeSpecial(tile); hurt(); }
  if (tile.type === 'cache') { removeSpecial(tile); collectFood(2); shards++; shardsDisplay.textContent = shards; sound('crystal'); }
  if (tile.type === 'wood') { removeSpecial(tile); collectWood(2); }
  if (tile.type === 'relic') { removeSpecial(tile); shards+=2; shardsDisplay.textContent=shards; sound('crystal'); }
  if (tile.type === 'spark') { removeSpecial(tile); hurt(); }
  if (tile.type === 'spring') { removeSpecial(tile); health=Math.min(maxHealth,health+2);hunger=Math.min(100,hunger+20);healthDisplay.textContent='♥'.repeat(health)+'♡'.repeat(maxHealth-health);updateHunger();sound('food'); }
  if (tile.type === 'treasure') { removeSpecial(tile);const find=1+Math.floor(Math.random()*3);shards+=find;collectWood(find+1);collectFood(1);shardsDisplay.textContent=shards;sound('win'); }
  if (tile.type === 'shrine') { removeSpecial(tile);glowTurns=Math.max(glowTurns,40);smokeTurns=Math.max(smokeTurns,8);armor=Math.min(maxArmor,armor+1);updateArmor();sound('burst'); }
  if (tile.type === 'portal') { const destination = specialTiles.find(other => other.type === 'portal' && other !== tile); if (destination) { player.x = destination.x; player.y = destination.y; engine.snap(player); sound('burst'); } }
  if (tile.type === 'egg') crushEgg(tile);
}
function objectivesReachable() {
  const seen = new Set([`${player.x},${player.y}`]), queue = [{x:player.x,y:player.y}];
  while(queue.length){const p=queue.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,id=`${x},${y}`;if(!seen.has(id)&&!map[y]?.[x]){seen.add(id);queue.push({x,y});}}}
  return [exit,...crystals].every(item => seen.has(`${item.x},${item.y}`));
}
function growLivingWall() {
  if (growthCount >= 8) return;
  const candidates = [];
  for(let y=2;y<ROWS-2;y++)for(let x=2;x<COLS-2;x++){
    if(map[y][x] || Math.abs(x-player.x)+Math.abs(y-player.y)<5 || (x===exit.x&&y===exit.y) || crystals.some(c=>c.x===x&&c.y===y) || foods.some(f=>f.x===x&&f.y===y) || monsters.some(m=>m.x===x&&m.y===y)) continue;
    const exits=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>!map[y+dy]?.[x+dx]).length;
    if(exits>=3)candidates.push({x,y});
  }
  candidates.sort(()=>Math.random()-.5);
  for(const tile of candidates){map[tile.y][tile.x]=1;if(objectivesReachable()){growthCount++;return;}map[tile.y][tile.x]=0;}
}
function spawnHatchling(egg) {
  const offsets=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[-2,0],[0,2],[0,-2]];
  const open=p=>p.x>0&&p.y>0&&p.x<COLS-1&&p.y<ROWS-1&&!map[p.y][p.x]&&!(p.x===player.x&&p.y===player.y)&&!monsters.some(m=>m.x===p.x&&m.y===p.y);
  const nearby=offsets.map(([dx,dy])=>({x:egg.x+dx,y:egg.y+dy}));
  const fallback=[];for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(open({x,y}))fallback.push({x,y});
  const spot=nearby.find(open)||fallback.sort((a,b)=>Math.abs(a.x-egg.x)+Math.abs(a.y-egg.y)-Math.abs(b.x-egg.x)-Math.abs(b.y-egg.y))[0];
  if(!spot)return false;
  const hatchlingTypes=['crawler','beetle','moth'];
  monsters.push({...spot,type:hatchlingTypes[Math.floor(Math.random()*hatchlingTypes.length)],cool:1});
  sound('hurt');
  return true;
}
function advanceCaveTurn() {
  caveTurn++;
  if(hurtCooldown>0)hurtCooldown--;
  if(smokeTurns>0)smokeTurns--;
  if(glowTurns>0)glowTurns--;
  if(theme.id==='living' && caveTurn%18===0) growLivingWall();
  if(theme.id==='nest') {
    let hatched=false;
    for(const egg of [...specialTiles.filter(tile=>tile.type==='egg')]){
      egg.timer--;
      if(egg.timer<=0){removeSpecial(egg);spawnHatchling(egg);hatched=true;}
    }
    if(hatched)updateCaveStatus();
  }
}
function spendHungerForStep(isSprinting) {
  hungerEffort += isSprinting ? 2 : 1;
  if (hungerEffort < HUNGER_EFFORT_LIMIT) return;
  hungerEffort -= HUNGER_EFFORT_LIMIT;
  hunger = Math.max(0, hunger - 1);
  updateHunger();
  autoEatFood();
}
function move(dx, dy, isSprinting = false, isSlide = false) {
  if (!running || won || shopOpen || inventoryOpen || craftingOpen || storageOpen || journalOpen || dialogOpen || (iceSliding && !isSlide)) return;
  lastDirection = [dx,dy];
  const nx = player.x + dx, ny = player.y + dy;
  if (map[ny]?.[nx] || (atHome&&homeObjectAt(nx,ny)?.solid)) { if(atHome)updateHomePrompt();if(isSlide) iceSliding=false; return; }
  sound('step'); player.x = nx; player.y = ny; player.bob = .35;
  if(atHome){updateHomePrompt();return;}
  recordStat('steps');
  const found = crystals.findIndex(c => c.x === nx && c.y === ny);
  if (found >= 0) { crystals.splice(found, 1); crystalCount.textContent = +crystalCount.textContent + 1; shards++;recordStat('crystals'); shardsDisplay.textContent=shards; sound('crystal'); }
  const meal=foods.findIndex(f=>f.x===nx&&f.y===ny);
  if(meal>=0){foods.splice(meal,1);collectFood();}
  resolveSpecialTile(specialAt(nx,ny));
  spendHungerForStep(isSprinting);
  advanceCaveTurn();
  updateCaveStatus();
  if(!hunger) starve();
  if (!won && player.x === exit.x && player.y === exit.y && !crystals.length) victory();
  if(!won) monsterTurn(isSprinting);
  const landedTile = specialAt(player.x,player.y);
  if(!won && theme.id==='frozen' && landedTile?.type==='ice') { iceSliding=true; setTimeout(()=>move(dx,dy,isSprinting,true),55); }
  else iceSliding=false;
}
function breakBlock() {
  if(!running||won||shopOpen||inventoryOpen||craftingOpen||storageOpen||journalOpen||dialogOpen||iceSliding)return;
  if(atHome){interactHome();return;}
  const [dx,dy]=lastDirection,x=player.x+dx,y=player.y+dy;
  const egg=specialAt(x,y,'egg');
  if(egg){crushEgg(egg);monsterTurn(false);return;}
  const block=map[y]?.[x];
  if(block<2||block>10)return;
  map[y][x]=0;
  rewardBlock(block);
  sound('blade');monsterTurn(false);
}
function rewardBlock(block){
  recordStat('blocks');const miningBonus=(weapons.pick?2:1)+(weapons.charm&&Math.random()<.35?1:0);
  if(block===2)collectWood((Math.random()<.3?2:1)*miningBonus);
  if(block===3){shards+=2*miningBonus;shardsDisplay.textContent=shards;sound('crystal');}
  if(block===4)collectWood(3*miningBonus);
  if(block===5){shards+=3*miningBonus;shardsDisplay.textContent=shards;sound('crystal');}
  if(block===6){shards+=miningBonus;shardsDisplay.textContent=shards;if(Math.random()<(weapons.pick?.75:.5))collectFood();else sound('crystal');}
  if(block===7){shards+=2*miningBonus;inventory.burstCell+=Math.random()<.28?1:0;shardsDisplay.textContent=shards;sound('crystal');}
  if(block===8){collectFood(miningBonus);collectWood(miningBonus);}
  if(block===9){shards+=miningBonus;collectWood(2*miningBonus);shardsDisplay.textContent=shards;sound('buy');}
  if(block===10){shards+=miningBonus;collectFood(miningBonus);shardsDisplay.textContent=shards;sound('food');}
}
function monsterTurn(playerSprinted = false) {
  const hidden=playerIsHidden(),sightByType={crawler:4,stalker:8,wisp:6,beetle:4,moth:6,mother:10};
  for (const m of monsters) {
    if(m.type==='mother')continue;
    if (m.cool) { m.cool--; continue; }
    const dx=player.x-m.x,dy=player.y-m.y,distance=Math.abs(dx)+Math.abs(dy),noiseBonus=theme.id==='echo'&&playerSprinted?5:0;
    const detected=!hidden&&distance<(sightByType[m.type]||7)+noiseBonus;
    const choices=detected?[[Math.sign(dx),0],[0,Math.sign(dy)]].sort(()=>Math.random()-.5):[[0,1],[1,0],[0,-1],[-1,0]].sort(()=>Math.random()-.5);
    for(const [mx,my] of choices){const nx=m.x+mx,ny=m.y+my;if(!map[ny]?.[nx]&&!(nx===player.x&&ny===player.y)&&!monsters.some(o=>o!==m&&o.x===nx&&o.y===ny)){m.x=nx;m.y=ny;break;}}
    if(m.type!=='stalker')m.cool=1;
  }
  if (monsters.some(m=>m.type!=='mother'&&Math.abs(m.x-player.x)+Math.abs(m.y-player.y)<=1)) hurt();
}
function broodmotherTick() {
  if(!running||won||shopOpen||inventoryOpen||craftingOpen||storageOpen||journalOpen||dialogOpen||theme.id!=='nest')return;
  if(hurtCooldown>0)hurtCooldown--;
  const hidden=playerIsHidden();
  for(const mother of monsters.filter(monster=>monster.type==='mother')){
    const dx=player.x-mother.x,dy=player.y-mother.y,distance=Math.abs(dx)+Math.abs(dy),detected=!hidden&&distance<12;
    const choices=detected?[[Math.sign(dx),0],[0,Math.sign(dy)]].sort(()=>Math.random()-.5):[[0,1],[1,0],[0,-1],[-1,0]].sort(()=>Math.random()-.5);
    for(const [mx,my] of choices){const nx=mother.x+mx,ny=mother.y+my;if(!map[ny]?.[nx]&&!(nx===player.x&&ny===player.y)&&!monsters.some(other=>other!==mother&&other.x===nx&&other.y===ny)){mother.x=nx;mother.y=ny;break;}}
  }
  if(!hidden&&monsters.some(m=>m.type==='mother'&&Math.abs(m.x-player.x)+Math.abs(m.y-player.y)<=1))hurt();
}
function hurt() { if(hurtCooldown>0)return;hurtCooldown=4;sound('hurt');if(armor>0){armor--;updateArmor();return;}health--;if(health<=0&&inventory.beacon){inventory.beacon--;health=Math.min(3,maxHealth);smokeTurns=Math.max(smokeTurns,10);sound('burst');caveRuleDisplay.textContent='RESCUE BEACON · Back on your feet with emergency smoke cover.';}healthDisplay.textContent = '♥'.repeat(Math.max(0,health)) + '♡'.repeat(Math.max(0,maxHealth-health));if(health<=0)gameOver(); }
function recordMonsterKills(before){const defeated=Math.max(0,before-monsters.length);if(defeated)recordStat('monsters',defeated);return defeated;}
function lanternBurst() { if (!running || won || atHome || shopOpen || inventoryOpen || craftingOpen || storageOpen || journalOpen || dialogOpen) return; burst = 1; sound('burst'); const cellBonus=inventory.burstCell?3:0, prismBonus=theme.id==='cathedral'?3:0, range=(weapons.lance?7:4)+prismBonus+cellBonus, wispRange=(weapons.lance?5:2)+prismBonus+cellBonus, before=monsters.length; if(inventory.burstCell){inventory.burstCell--;sound('buy');} monsters = monsters.filter(m => { if(m.type==='mother')return true;const distance=Math.abs(m.x-player.x)+Math.abs(m.y-player.y); return distance>range || (m.type==='wisp' && distance>wispRange); }); recordMonsterKills(before);if (before === monsters.length) monsterTurn();updateCaveStatus(); }
function bladeStrike() { if (!running || won || atHome || shopOpen || inventoryOpen || craftingOpen || storageOpen || journalOpen || dialogOpen || !weapons.blade) return; sound('blade'); const before=monsters.length; monsters=monsters.filter(m=>m.type==='mother'||Math.abs(m.x-player.x)+Math.abs(m.y-player.y)>1); recordMonsterKills(before);if(before===monsters.length) monsterTurn();updateCaveStatus(); }
function equipmentSummary() {
  const equipped = [weapons.lance&&'Pulse Lance', weapons.blade&&'Crystal Blade', weapons.boots&&'Swift Boots', weapons.lens&&'Lantern Lens', weapons.pack&&'Reinforced Pack', weapons.pick&&'Reinforced Pick', weapons.compass&&'Echo Compass', weapons.charm&&'Prospector Charm'].filter(Boolean);
  return equipped.length ? equipped.join(' · ') : 'No forge gear installed';
}
function openShop(fromHome = false) {
  if ((!running && !fromHome) || (won && !fromHome)) return;
  forgeFromHome = fromHome || forgeFromHome;
  shopOpen = true; inventoryOpen = false; craftingOpen = false; storageOpen = false; homeOpen = false;
  const plateCost = armorLevel + 1, armorShardCost = 3 + armorLevel * 2, armorMaxed = armorLevel >= 3;
  overlay.classList.add('menu');
  overlay.innerHTML=`<div class="menu-panel"><p class="eyebrow">CAMP FORGE</p><h2>Build for the dark.</h2><p class="resources"><b>${shards}</b> shards · <b>${wood}</b> wood · <b>${inventory.armorPlate}</b> armor plates · armor tier <b>${armorLevel}/3</b></p><div class="forge-grid">
    <button id="buy-lance" ${weapons.lance||shards<5?'disabled':''}><b>Pulse Lance</b><br>5 shards<br><small>Longer lantern burst; reaches distant wisps.</small></button>
    <button id="buy-blade" ${weapons.blade||shards<8?'disabled':''}><b>Crystal Blade</b><br>8 shards<br><small>Press F to strike an adjacent monster.</small></button>
    <button id="buy-heart" ${maxHealth>=7||shards<6?'disabled':''}><b>Heart Vessel</b><br>6 shards<br><small>Add one permanent lantern heart.</small></button>
    <button id="buy-boots" ${weapons.boots||wood<6||shards<4?'disabled':''}><b>Swift Boots</b><br>6 wood + 4 shards<br><small>Walk and sprint faster.</small></button>
    <button id="buy-lens" ${weapons.lens||wood<7||shards<6?'disabled':''}><b>Lantern Lens</b><br>7 wood + 6 shards<br><small>See farther through every cave.</small></button>
    <button id="buy-pack" ${weapons.pack||wood<8||shards<5?'disabled':''}><b>Reinforced Pack</b><br>8 wood + 5 shards<br><small>Every food pickup supplies two meals.</small></button>
    <button id="buy-armor" ${armorMaxed||inventory.armorPlate<plateCost||shards<armorShardCost?'disabled':''}><b>${armorMaxed?'Armor fully upgraded':`Armor tier ${armorLevel+1}`}</b><br>${armorMaxed?'Maximum tier':`${plateCost} plate${plateCost===1?'':'s'} + ${armorShardCost} shards`}<br><small>Add a rechargeable armor point.</small></button>
  </div><button id="forge-back">${forgeFromHome?'Back to home':'Return to cave'}</button></div>`;
  overlay.classList.remove('hidden');
  document.querySelector('#buy-lance').onclick=()=>buyWeapon('lance',5);
  document.querySelector('#buy-blade').onclick=()=>buyWeapon('blade',8);
  document.querySelector('#buy-heart').onclick=buyHeart;
  document.querySelector('#buy-boots').onclick=()=>buyGear('boots',6,4);
  document.querySelector('#buy-lens').onclick=()=>buyGear('lens',7,6);
  document.querySelector('#buy-pack').onclick=()=>buyGear('pack',8,5);
  document.querySelector('#buy-armor').onclick=upgradeArmor;
  document.querySelector('#forge-back').onclick=closeShop;
}
function buyWeapon(name,cost){if(!weapons[name]&&shards>=cost){shards-=cost;shardsDisplay.textContent=shards;weapons[name]=true;sound('buy');openShop(forgeFromHome);}}
function buyGear(name,woodCost,shardCost){if(!weapons[name]&&wood>=woodCost&&shards>=shardCost){wood-=woodCost;shards-=shardCost;woodDisplay.textContent=wood;shardsDisplay.textContent=shards;weapons[name]=true;sound('buy');openShop(forgeFromHome);}}
function buyHeart(){if(shards>=6&&maxHealth<7){shards-=6;maxHealth++;health=maxHealth;shardsDisplay.textContent=shards;healthDisplay.textContent='♥'.repeat(health);sound('buy');openShop(forgeFromHome);}}
function upgradeArmor(){const plateCost=armorLevel+1,shardCost=3+armorLevel*2;if(armorLevel<3&&inventory.armorPlate>=plateCost&&shards>=shardCost){inventory.armorPlate-=plateCost;shards-=shardCost;armorLevel++;maxArmor=armorLevel;armor=maxArmor;shardsDisplay.textContent=shards;updateArmor();sound('buy');openShop(forgeFromHome);}}
function closeShop(){const returnHome=forgeFromHome;shopOpen=false;forgeFromHome=false;if(returnHome)showHome();else{overlay.classList.remove('menu');overlay.classList.add('hidden');}}
function openInventory(){
  if(!running||won||shopOpen||craftingOpen||storageOpen||journalOpen||dialogOpen)return;
  inventoryOpen=true;overlay.classList.add('menu');
  const nearbyBlocks=!atHome&&map.some((row,y)=>row.some((cell,x)=>cell>=2&&cell<=10&&Math.abs(x-player.x)+Math.abs(y-player.y)<=2));
  const nearbyMonsters=!atHome&&monsters.some(monster=>monster.type!=='mother'&&Math.abs(monster.x-player.x)+Math.abs(monster.y-player.y)<=7);
  overlay.innerHTML=`<div class="menu-panel"><p class="eyebrow">EXPEDITION INVENTORY</p><h2>Choose a tool.</h2><p class="resources"><b>${inventory.food}</b> food · <b>${wood}</b> wood · <b>${shards}</b> shards · armor <b>${armor}/${maxArmor}</b></p><p><b>Crafted supplies</b><br>${inventory.armorPlate} plates · ${inventory.repairKit} repair kits · ${inventory.burstCell} burst cells · ${inventory.smokeBomb} smoke bombs · ${inventory.glowFlask} glow flasks · ${inventory.beacon} beacons · ${inventory.stew} stews · ${inventory.tonic} tonics · ${inventory.sonicCharge} sonic charges · ${inventory.campKit} camp kits · ${inventory.recallRope} recall ropes · ${inventory.miningCharge} mining charges</p><p><b>Installed gear</b><br>${equipmentSummary()}</p><div class="menu-actions"><button id="eat-food" ${!inventory.food||hunger>=100?'disabled':''}><b>Eat food</b><br><small>Restore 30 hunger.</small></button><button id="eat-stew" ${!inventory.stew||(hunger>=100&&health>=maxHealth)?'disabled':''}><b>Mushroom stew</b><br><small>Restore 50 hunger and one heart.</small></button><button id="use-tonic" ${!inventory.tonic||health>=maxHealth?'disabled':''}><b>Healing tonic</b><br><small>Restore two hearts.</small></button><button id="use-repair" ${!inventory.repairKit||!maxArmor||armor>=maxArmor?'disabled':''}><b>Repair kit</b><br><small>Restore all armor.</small></button><button id="use-smoke" ${atHome||!inventory.smokeBomb||smokeTurns?'disabled':''}><b>Smoke bomb</b><br><small>Hide from monsters for 15 steps.</small></button><button id="use-glow" ${atHome||!inventory.glowFlask||glowTurns?'disabled':''}><b>Glow flask</b><br><small>Greatly expand light for 35 steps.</small></button><button id="use-sonic" ${!inventory.sonicCharge||!nearbyMonsters?'disabled':''}><b>Sonic charge</b><br><small>Defeat nearby ordinary monsters.</small></button><button id="use-camp" ${atHome||!inventory.campKit||(hunger>=100&&health>=maxHealth&&armor>=maxArmor)?'disabled':''}><b>Field camp</b><br><small>Restore hunger, one heart, and armor.</small></button><button id="use-mining" ${!inventory.miningCharge||!nearbyBlocks?'disabled':''}><b>Mining charge</b><br><small>Harvest all resource blocks within two tiles.</small></button><button id="use-recall" ${atHome||!inventory.recallRope?'disabled':''}><b>Recall rope</b><br><small>Return home safely with everything gathered.</small></button><button disabled><b>Rescue beacon · ${inventory.beacon}</b><br><small>Activates automatically at zero hearts.</small></button></div><button id="inventory-back">Return to ${atHome?'home cave':'cave'}</button></div>`;
  overlay.classList.remove('hidden');document.querySelector('#eat-food').onclick=useFood;document.querySelector('#eat-stew').onclick=useStew;document.querySelector('#use-tonic').onclick=useTonic;document.querySelector('#use-repair').onclick=useRepairKit;document.querySelector('#use-smoke').onclick=useSmokeBomb;document.querySelector('#use-glow').onclick=useGlowFlask;document.querySelector('#use-sonic').onclick=useSonicCharge;document.querySelector('#use-camp').onclick=useCampKit;document.querySelector('#use-mining').onclick=useMiningCharge;document.querySelector('#use-recall').onclick=useRecallRope;document.querySelector('#inventory-back').onclick=closeInventory;
}
function consumeFood(){if(!inventory.food||hunger>=100)return false;inventory.food--;foodDisplay.textContent=inventory.food;hunger=Math.min(100,hunger+30);updateHunger();sound('food');return true;}
function autoEatFood(){if(hunger<=80)consumeFood();}
function useFood(){if(consumeFood())openInventory();}
function useRepairKit(){if(inventory.repairKit&&maxArmor&&armor<maxArmor){inventory.repairKit--;armor=maxArmor;updateArmor();sound('buy');openInventory();}}
function useStew(){if(inventory.stew&&(hunger<100||health<maxHealth)){inventory.stew--;hunger=Math.min(100,hunger+50);health=Math.min(maxHealth,health+1);updateHunger();healthDisplay.textContent='♥'.repeat(health)+'♡'.repeat(maxHealth-health);sound('food');openInventory();}}
function useTonic(){if(inventory.tonic&&health<maxHealth){inventory.tonic--;health=Math.min(maxHealth,health+2);healthDisplay.textContent='♥'.repeat(health)+'♡'.repeat(maxHealth-health);sound('food');openInventory();}}
function useSmokeBomb(){if(!atHome&&inventory.smokeBomb&&!smokeTurns){inventory.smokeBomb--;smokeTurns=15;sound('burst');closeInventory();updateCaveStatus();}}
function useGlowFlask(){if(!atHome&&inventory.glowFlask&&!glowTurns){inventory.glowFlask--;glowTurns=35;sound('crystal');closeInventory();updateCaveStatus();}}
function useSonicCharge(){if(!atHome&&inventory.sonicCharge){const before=monsters.length;monsters=monsters.filter(monster=>monster.type==='mother'||Math.abs(monster.x-player.x)+Math.abs(monster.y-player.y)>7);if(before!==monsters.length){inventory.sonicCharge--;recordMonsterKills(before);sound('burst');closeInventory();updateCaveStatus();}}}
function useCampKit(){if(!atHome&&inventory.campKit){inventory.campKit--;hunger=100;health=Math.min(maxHealth,health+1);armor=maxArmor;updateHunger();updateArmor();healthDisplay.textContent='♥'.repeat(health)+'♡'.repeat(maxHealth-health);sound('food');closeInventory();}}
function useMiningCharge(){if(!atHome&&inventory.miningCharge){let mined=0;for(let y=Math.max(1,player.y-2);y<=Math.min(ROWS-2,player.y+2);y++)for(let x=Math.max(1,player.x-2);x<=Math.min(COLS-2,player.x+2);x++){const block=map[y][x];if(block>=2&&block<=10&&Math.abs(x-player.x)+Math.abs(y-player.y)<=2){map[y][x]=0;rewardBlock(block);mined++;}}if(mined){inventory.miningCharge--;sound('burst');openInventory();}}}
function useRecallRope(){if(!atHome&&inventory.recallRope){inventory.recallRope--;inventoryOpen=false;sound('burst');showHome();}}
function closeInventory(){inventoryOpen=false;overlay.classList.remove('menu');overlay.classList.add('hidden');if(atHome){homeOpen=true;updateHomePrompt();}}
function craftItem(name,woodCost,shardCost){if(wood>=woodCost&&shards>=shardCost){wood-=woodCost;shards-=shardCost;inventory[name]++;woodDisplay.textContent=wood;shardsDisplay.textContent=shards;sound('buy');openCrafting();}}
function craftGear(name,woodCost,shardCost){if(!weapons[name]&&wood>=woodCost&&shards>=shardCost){wood-=woodCost;shards-=shardCost;weapons[name]=true;woodDisplay.textContent=wood;shardsDisplay.textContent=shards;sound('buy');openCrafting();}}
function craftStew(){if(inventory.food>=2&&wood>=1){inventory.food-=2;wood--;inventory.stew++;foodDisplay.textContent=inventory.food;woodDisplay.textContent=wood;sound('food');openCrafting();}}
function craftMixed(name,woodCost,shardCost,foodCost=0){if(wood>=woodCost&&shards>=shardCost&&inventory.food>=foodCost){wood-=woodCost;shards-=shardCost;inventory.food-=foodCost;inventory[name]++;woodDisplay.textContent=wood;shardsDisplay.textContent=shards;foodDisplay.textContent=inventory.food;sound('buy');openCrafting();}}
function craftFurniture(name,woodCost,shardCost,limit){if(homeFurniture[name]<limit&&wood>=woodCost&&shards>=shardCost){wood-=woodCost;shards-=shardCost;homeFurniture[name]++;woodDisplay.textContent=wood;shardsDisplay.textContent=shards;sound('buy');openCrafting();}}
function openCrafting(){
  if((running&&!atHome)||won)return;craftingOpen=true;shopOpen=false;inventoryOpen=false;storageOpen=false;homeOpen=false;overlay.classList.add('menu');
  const furnitureButton=(id,name,cost,shardCost,limit,description)=>`<button id="craft-${id}" ${homeFurniture[id]>=limit||wood<cost||shards<shardCost?'disabled':''}><b>${name} · ${homeFurniture[id]}/${limit}</b><br>${cost} wood${shardCost?` + ${shardCost} shard${shardCost===1?'':'s'}`:''}<br><small>${description}</small></button>`;
  overlay.innerHTML=`<div class="menu-panel"><p class="eyebrow">HOME CRAFTING BENCH</p><h2>Build supplies and clever tools.</h2><p class="resources"><b>${wood}</b> wood · <b>${shards}</b> shards · <b>${inventory.food}</b> food</p><p><b>Expedition supplies</b></p><div class="forge-grid"><button id="craft-plate" ${wood<4||shards<2?'disabled':''}><b>Armor Plate</b><br>4 wood + 2 shards<br><small>Used at the forge to upgrade armor.</small></button><button id="craft-repair" ${wood<3||shards<1?'disabled':''}><b>Repair Kit</b><br>3 wood + 1 shard<br><small>Restores all armor during a cave run.</small></button><button id="craft-cell" ${wood<3||shards<2?'disabled':''}><b>Burst Cell</b><br>3 wood + 2 shards<br><small>The next lantern burst gains 3 range.</small></button><button id="craft-smoke" ${wood<3||shards<1?'disabled':''}><b>Smoke Bomb</b><br>3 wood + 1 shard<br><small>Hide safely from every monster for 15 steps.</small></button><button id="craft-glow" ${wood<2||shards<2?'disabled':''}><b>Glow Flask</b><br>2 wood + 2 shards<br><small>Greatly expand lantern light for 35 steps.</small></button><button id="craft-beacon" ${wood<5||shards<4?'disabled':''}><b>Rescue Beacon</b><br>5 wood + 4 shards<br><small>Automatically revives you with three hearts.</small></button><button id="craft-stew" ${wood<1||inventory.food<2?'disabled':''}><b>Mushroom Stew</b><br>1 wood + 2 food<br><small>Restores 50 hunger and one heart.</small></button><button id="craft-tonic" ${shards<2||inventory.food<2?'disabled':''}><b>Healing Tonic</b><br>2 shards + 2 food<br><small>Restores two hearts instantly.</small></button><button id="craft-sonic" ${wood<4||shards<3?'disabled':''}><b>Sonic Charge</b><br>4 wood + 3 shards<br><small>Clears ordinary monsters within seven tiles.</small></button><button id="craft-camp" ${wood<4||inventory.food<2?'disabled':''}><b>Field Camp</b><br>4 wood + 2 food<br><small>Restore hunger, armor, and one heart underground.</small></button><button id="craft-recall" ${wood<6||shards<1?'disabled':''}><b>Recall Rope</b><br>6 wood + 1 shard<br><small>Return home without abandoning your haul.</small></button><button id="craft-mining" ${wood<3||shards<2?'disabled':''}><b>Mining Charge</b><br>3 wood + 2 shards<br><small>Harvest nearby resource blocks all at once.</small></button><button id="craft-pick" ${weapons.pick||wood<8||shards<4?'disabled':''}><b>${weapons.pick?'Reinforced Pick installed':'Reinforced Pick'}</b><br>8 wood + 4 shards<br><small>Double every breakable block reward.</small></button><button id="craft-compass" ${weapons.compass||wood<5||shards<3?'disabled':''}><b>${weapons.compass?'Echo Compass installed':'Echo Compass'}</b><br>5 wood + 3 shards<br><small>Point toward the nearest crystal or exit.</small></button><button id="craft-charm" ${weapons.charm||wood<7||shards<6?'disabled':''}><b>${weapons.charm?'Prospector Charm installed':'Prospector Charm'}</b><br>7 wood + 6 shards<br><small>Sometimes adds another reward when mining.</small></button></div><p><b>Home furniture</b> · Finished pieces appear in open camp slots.</p><div class="forge-grid">${furnitureButton('lamp','Crystal Lamp',3,1,4,'Adds a warm pool of light.')} ${furnitureButton('chest','Storage Chest',6,2,3,'Adds 20 storage spaces.')} ${furnitureButton('table','Cavewood Table',5,0,1,'A centerpiece for the living area.')} ${furnitureButton('chair','Cavewood Chair',2,0,4,'Adds seating around the table.')} ${furnitureButton('rug','Echo Rug',4,2,1,'Softens the stone sleeping area.')} ${furnitureButton('shelf','Display Shelf',4,0,2,'Shows off expedition keepsakes.')} ${furnitureButton('garden','Glow Garden',8,3,1,'A living patch of cave mushrooms.')} ${furnitureButton('mapTable','Map Table',7,4,1,'A planning table for Mira’s charts.')} ${furnitureButton('trophy','Echo Monument',10,7,1,'A centerpiece celebrating the settlement.')}</div><p>Ready: ${inventory.smokeBomb} smoke · ${inventory.glowFlask} glow · ${inventory.beacon} beacons · ${inventory.stew} stew · ${inventory.tonic} tonics · ${inventory.sonicCharge} sonic · ${inventory.campKit} camps · ${inventory.recallRope} ropes · ${inventory.miningCharge} charges</p><button id="craft-back">Return to home cave</button></div>`;
  overlay.classList.remove('hidden');document.querySelector('#craft-plate').onclick=()=>craftItem('armorPlate',4,2);document.querySelector('#craft-repair').onclick=()=>craftItem('repairKit',3,1);document.querySelector('#craft-cell').onclick=()=>craftItem('burstCell',3,2);document.querySelector('#craft-smoke').onclick=()=>craftItem('smokeBomb',3,1);document.querySelector('#craft-glow').onclick=()=>craftItem('glowFlask',2,2);document.querySelector('#craft-beacon').onclick=()=>craftItem('beacon',5,4);document.querySelector('#craft-stew').onclick=craftStew;document.querySelector('#craft-tonic').onclick=()=>craftMixed('tonic',0,2,2);document.querySelector('#craft-sonic').onclick=()=>craftMixed('sonicCharge',4,3);document.querySelector('#craft-camp').onclick=()=>craftMixed('campKit',4,0,2);document.querySelector('#craft-recall').onclick=()=>craftMixed('recallRope',6,1);document.querySelector('#craft-mining').onclick=()=>craftMixed('miningCharge',3,2);document.querySelector('#craft-pick').onclick=()=>craftGear('pick',8,4);document.querySelector('#craft-compass').onclick=()=>craftGear('compass',5,3);document.querySelector('#craft-charm').onclick=()=>craftGear('charm',7,6);
  document.querySelector('#craft-lamp').onclick=()=>craftFurniture('lamp',3,1,4);document.querySelector('#craft-chest').onclick=()=>craftFurniture('chest',6,2,3);document.querySelector('#craft-table').onclick=()=>craftFurniture('table',5,0,1);document.querySelector('#craft-chair').onclick=()=>craftFurniture('chair',2,0,4);document.querySelector('#craft-rug').onclick=()=>craftFurniture('rug',4,2,1);document.querySelector('#craft-shelf').onclick=()=>craftFurniture('shelf',4,0,2);document.querySelector('#craft-garden').onclick=()=>craftFurniture('garden',8,3,1);document.querySelector('#craft-mapTable').onclick=()=>craftFurniture('mapTable',7,4,1);document.querySelector('#craft-trophy').onclick=()=>craftFurniture('trophy',10,7,1);document.querySelector('#craft-back').onclick=closeCrafting;
}
function closeCrafting(){craftingOpen=false;showHome();}
function storageCapacity(){return homeFurniture.chest*20;}
function storageUsed(){return storage.wood+storage.food;}
function transferStorage(resource,direction){
  const room=storageCapacity()-storageUsed();
  if(resource==='wood'&&direction==='store'){const amount=Math.min(5,wood,room);wood-=amount;storage.wood+=amount;}
  if(resource==='wood'&&direction==='take'){const amount=Math.min(5,storage.wood);storage.wood-=amount;wood+=amount;}
  if(resource==='food'&&direction==='store'){const amount=Math.min(5,inventory.food,room);inventory.food-=amount;storage.food+=amount;}
  if(resource==='food'&&direction==='take'){const amount=Math.min(5,storage.food);storage.food-=amount;inventory.food+=amount;}
  woodDisplay.textContent=wood;foodDisplay.textContent=inventory.food;sound('buy');openStorage();
}
function openStorage(){
  if(!atHome)return;storageOpen=true;shopOpen=false;inventoryOpen=false;craftingOpen=false;homeOpen=false;const full=storageUsed()>=storageCapacity();overlay.classList.add('menu');
  overlay.innerHTML=`<div class="menu-panel"><p class="eyebrow">CAVE CHEST STORAGE</p><h2>Store your blocks.</h2><p class="resources">Chest space <b>${storageUsed()}/${storageCapacity()}</b> · carried <b>${wood}</b> wood and <b>${inventory.food}</b> food</p><p>Inside: <b>${storage.wood}</b> wood blocks · <b>${storage.food}</b> food supplies</p><div class="menu-actions"><button id="store-wood" ${!wood||full?'disabled':''}>Store up to 5 wood</button><button id="take-wood" ${!storage.wood?'disabled':''}>Take up to 5 wood</button><button id="store-food" ${!inventory.food||full?'disabled':''}>Store up to 5 food</button><button id="take-food" ${!storage.food?'disabled':''}>Take up to 5 food</button></div><small>Craft more chests to increase storage by 20 spaces each.</small><button id="storage-back">Return to home cave</button></div>`;overlay.classList.remove('hidden');
  document.querySelector('#store-wood').onclick=()=>transferStorage('wood','store');document.querySelector('#take-wood').onclick=()=>transferStorage('wood','take');document.querySelector('#store-food').onclick=()=>transferStorage('food','store');document.querySelector('#take-food').onclick=()=>transferStorage('food','take');document.querySelector('#storage-back').onclick=closeStorage;
}
function closeStorage(){storageOpen=false;showHome();}
function victory() { won = true; running = false; recordStat('caves');wood+=3;shards+=2;inventory.food+=2;woodDisplay.textContent=wood;shardsDisplay.textContent=shards;foodDisplay.textContent=inventory.food;sound('win'); overlay.classList.remove('menu'); overlay.innerHTML = `<p class="eyebrow">LEVEL ${level} CLEARED</p><h2>The cave yields.</h2><p>Your haul returns home with a completion bonus: 3 wood, 2 shards, and 2 food.<br>Check your journal—one of the settlers may have a reward ready.</p><button id="again">Return home · level ${level + 1}</button>`; overlay.classList.remove('hidden'); document.querySelector('#again').onclick = () => { level++; showHome(); }; }
function gameOver() { won = true; running = false; sound('lose'); overlay.classList.remove('menu'); overlay.innerHTML = '<p class="eyebrow">LANTERN EXTINGUISHED</p><h2>The dark takes you.</h2><p>Your recovered materials have already been carried back to camp.</p><button id="again">Wake at home</button>'; overlay.classList.remove('hidden'); document.querySelector('#again').onclick = showHome; }
function drawSpecialTiles() {
  for(const tile of specialTiles){
    const x=tile.x*TILE,y=tile.y*TILE,cx=x+10,cy=y+10;
    ctx.save();
    if(tile.type==='water'){ctx.fillStyle='rgba(35,139,174,.38)';ctx.fillRect(x+1,y+1,18,18);ctx.strokeStyle='rgba(129,226,246,.45)';ctx.beginPath();ctx.moveTo(x+3,cy+Math.sin(pulse+tile.x)*2);ctx.lineTo(x+17,cy+Math.sin(pulse+tile.x)*2);ctx.stroke();}
    if(tile.type==='prism'){ctx.shadowBlur=9;ctx.shadowColor=theme.glow;ctx.fillStyle='#ddb7ff';ctx.beginPath();ctx.moveTo(cx,cy-6);ctx.lineTo(cx+5,cy);ctx.lineTo(cx,cy+6);ctx.lineTo(cx-5,cy);ctx.fill();}
    if(tile.type==='mushroom'){ctx.fillStyle='#bd6fce';ctx.beginPath();ctx.arc(cx,cy-2,6,Math.PI,0);ctx.fill();ctx.fillStyle='#e9d8c5';ctx.fillRect(cx-2,cy-2,4,8);}
    if(tile.type==='lava'){ctx.shadowBlur=8;ctx.shadowColor='#ff5b28';ctx.fillStyle='#6c2418';ctx.fillRect(x+1,y+1,18,18);ctx.strokeStyle='#ff943d';ctx.beginPath();ctx.moveTo(x+2,cy);ctx.lineTo(x+7,cy-4);ctx.lineTo(x+12,cy+3);ctx.lineTo(x+18,cy-2);ctx.stroke();}
    if(tile.type==='ice'){ctx.fillStyle='rgba(145,224,245,.28)';ctx.fillRect(x+1,y+1,18,18);ctx.strokeStyle='rgba(218,252,255,.52)';ctx.beginPath();ctx.moveTo(x+3,y+16);ctx.lineTo(x+9,y+4);ctx.lineTo(x+16,y+8);ctx.stroke();}
    if(tile.type==='rail'){ctx.strokeStyle='#8a7054';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+3,y+2);ctx.lineTo(x+3,y+18);ctx.moveTo(x+17,y+2);ctx.lineTo(x+17,y+18);ctx.stroke();ctx.lineWidth=1;for(let yy=y+4;yy<y+19;yy+=5){ctx.beginPath();ctx.moveTo(x+2,yy);ctx.lineTo(x+18,yy);ctx.stroke();}}
    if(tile.type==='cache'){ctx.fillStyle='#8f6842';ctx.fillRect(x+3,y+5,14,12);ctx.strokeStyle='#d3b078';ctx.strokeRect(x+3.5,y+5.5,13,11);ctx.fillStyle='#e5c98e';ctx.fillRect(cx-1,y+5,2,12);}
    if(tile.type==='wood'){ctx.fillStyle='#9b6b3f';ctx.fillRect(x+3,y+5,14,4);ctx.fillRect(x+5,y+11,12,4);ctx.fillStyle='#d0a16c';ctx.fillRect(x+5,y+6,3,2);ctx.fillRect(x+12,y+12,3,2);}
    if(tile.type==='portal'){ctx.strokeStyle='#b793ff';ctx.lineWidth=2;ctx.shadowBlur=12;ctx.shadowColor='#7950e8';ctx.beginPath();ctx.arc(cx,cy,6+Math.sin(pulse*2)*2,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,2,0,Math.PI*2);ctx.stroke();}
    if(tile.type==='hide'){ctx.fillStyle='rgba(50,136,153,.5)';ctx.fillRect(x+2,y+12,16,6);ctx.strokeStyle='#7dd6d2';ctx.beginPath();for(let i=3;i<18;i+=4){ctx.moveTo(x+i,y+17);ctx.lineTo(x+i-2,y+8+(i%3));ctx.lineTo(x+i+1,y+13);}ctx.stroke();}
    if(tile.type==='egg'){ctx.shadowBlur=tile.timer<=7?14:8;ctx.shadowColor=tile.timer<=7?'#ff554d':'#e8a078';ctx.fillStyle=tile.timer<=7?'#ff8b72':'#e7c5ad';ctx.strokeStyle='#8c4f47';ctx.beginPath();ctx.ellipse(cx,cy,6,8,0,0,Math.PI*2);ctx.fill();ctx.stroke();if(tile.timer<=7){ctx.beginPath();ctx.moveTo(cx-2,cy-6);ctx.lineTo(cx+2,cy-1);ctx.lineTo(cx-1,cy+4);ctx.stroke();}ctx.shadowBlur=0;ctx.fillStyle='#341d1b';ctx.font='7px "DM Mono"';ctx.textAlign='center';ctx.fillText(tile.timer,cx,cy+2);}
    if(tile.type==='glowpool'){ctx.shadowBlur=12;ctx.shadowColor='#39f1c6';ctx.fillStyle='rgba(47,205,176,.42)';ctx.beginPath();ctx.ellipse(cx,cy,8,6,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#9affe9';ctx.beginPath();ctx.arc(cx-3,cy-1,2,0,Math.PI*2);ctx.stroke();}
    if(tile.type==='relic'){ctx.shadowBlur=7;ctx.shadowColor='#f1deb0';ctx.strokeStyle='#e8d8ad';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+5,y+14);ctx.lineTo(x+15,y+6);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+4,y+15,3,0,Math.PI*2);ctx.arc(x+16,y+5,3,0,Math.PI*2);ctx.stroke();}
    if(tile.type==='spark'){ctx.shadowBlur=14;ctx.shadowColor='#73b9ff';ctx.fillStyle='#c8e7ff';ctx.beginPath();ctx.moveTo(x+12,y+2);ctx.lineTo(x+6,y+11);ctx.lineTo(x+11,y+11);ctx.lineTo(x+7,y+19);ctx.lineTo(x+16,y+8);ctx.lineTo(x+11,y+8);ctx.closePath();ctx.fill();}
    if(tile.type==='spring'){ctx.shadowBlur=12;ctx.shadowColor='#65d8ff';ctx.fillStyle='rgba(71,174,205,.55)';ctx.beginPath();ctx.ellipse(cx,cy+3,8,5,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b7f1ff';ctx.beginPath();ctx.moveTo(cx,cy+1);ctx.quadraticCurveTo(cx-5,cy-3,cx,cy-8);ctx.quadraticCurveTo(cx+5,cy-3,cx,cy+1);ctx.stroke();}
    if(tile.type==='treasure'){ctx.shadowBlur=9;ctx.shadowColor='#ffd36d';ctx.fillStyle='#8d6238';ctx.fillRect(x+2,y+6,16,12);ctx.strokeStyle='#e5bd68';ctx.strokeRect(x+2.5,y+6.5,15,11);ctx.fillStyle='#ffe08a';ctx.fillRect(x+8,y+9,4,5);}
    if(tile.type==='shrine'){ctx.shadowBlur=14;ctx.shadowColor='#9f8cff';ctx.fillStyle='#5b4d80';ctx.beginPath();ctx.moveTo(cx,y+2);ctx.lineTo(x+17,y+18);ctx.lineTo(x+3,y+18);ctx.closePath();ctx.fill();ctx.strokeStyle='#d6caff';ctx.beginPath();ctx.arc(cx,y+11,3+Math.sin(pulse)*1.2,0,Math.PI*2);ctx.stroke();}
    if(tile.type==='bed'){ctx.fillStyle='#704a34';ctx.fillRect(x+1,y+2,18,16);ctx.fillStyle='#b5d4ca';ctx.fillRect(x+3,y+4,14,5);ctx.fillStyle='#537b78';ctx.fillRect(x+3,y+9,14,7);ctx.strokeStyle='#d0a16c';ctx.strokeRect(x+1.5,y+2.5,17,15);}
    if(tile.type==='chest'){ctx.fillStyle='#765137';ctx.fillRect(x+2,y+5,16,13);ctx.strokeStyle='#d2a36b';ctx.strokeRect(x+2.5,y+5.5,15,12);ctx.fillStyle='#d9b56e';ctx.fillRect(x+9,y+9,3,5);}
    if(tile.type==='workbench'){ctx.fillStyle='#79563b';ctx.fillRect(x+1,y+7,18,7);ctx.fillRect(x+3,y+14,3,5);ctx.fillRect(x+14,y+14,3,5);ctx.fillStyle='#c19560';ctx.fillRect(x+4,y+4,5,3);ctx.fillRect(x+12,y+2,2,6);}
    if(tile.type==='forge'){ctx.shadowBlur=10;ctx.shadowColor='#ff6b35';ctx.fillStyle='#5a4b43';ctx.fillRect(x+1,y+4,18,15);ctx.fillStyle='#ff843f';ctx.beginPath();ctx.arc(cx,y+12,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#292b2b';ctx.fillRect(x+4,y+2,12,4);}
    if(tile.type==='gate'){ctx.shadowBlur=12;ctx.shadowColor='#76cfd0';ctx.strokeStyle='#8ad7d5';ctx.lineWidth=3;ctx.strokeRect(x+2,y+1,16,18);ctx.fillStyle='#183d40';ctx.fillRect(x+5,y+4,10,15);ctx.fillStyle='#d9f4e9';ctx.fillRect(x+9,y+9,2,2);}
    if(tile.type==='lamp'){ctx.shadowBlur=20;ctx.shadowColor='#ffd27d';ctx.fillStyle='#ffe09b';ctx.beginPath();ctx.moveTo(cx,y+3);ctx.lineTo(x+16,y+12);ctx.lineTo(x+4,y+12);ctx.fill();ctx.fillStyle='#806044';ctx.fillRect(x+9,y+12,2,7);}
    if(tile.type==='table'){ctx.fillStyle='#8b6241';ctx.beginPath();ctx.ellipse(cx,cy,9,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5e412e';ctx.fillRect(x+8,y+11,4,8);}
    if(tile.type==='chair'){ctx.fillStyle='#8a6041';ctx.fillRect(x+4,y+4,12,5);ctx.fillRect(x+6,y+9,8,7);ctx.fillRect(x+5,y+15,3,4);ctx.fillRect(x+12,y+15,3,4);}
    if(tile.type==='rug'){ctx.fillStyle='#315f64';ctx.fillRect(x+1,y+3,18,14);ctx.strokeStyle='#82c1ba';ctx.strokeRect(x+2.5,y+4.5,15,11);ctx.beginPath();ctx.moveTo(x+4,cy);ctx.lineTo(cx,y+6);ctx.lineTo(x+16,cy);ctx.lineTo(cx,y+14);ctx.closePath();ctx.stroke();}
    if(tile.type==='shelf'){ctx.fillStyle='#694a35';ctx.fillRect(x+2,y+3,16,3);ctx.fillRect(x+2,y+10,16,3);ctx.fillRect(x+2,y+17,16,2);ctx.fillStyle='#7fd1d0';ctx.fillRect(x+5,y+6,3,4);ctx.fillStyle='#d39a62';ctx.fillRect(x+12,y+13,3,4);}
    if(tile.type==='garden'){ctx.fillStyle='#315239';ctx.fillRect(x+1,y+13,18,6);for(let i=4;i<18;i+=5){ctx.fillStyle=i%2?'#80d279':'#bd7bd2';ctx.beginPath();ctx.arc(x+i,y+10-(i%3),4,Math.PI,0);ctx.fill();ctx.fillStyle='#d8d5b5';ctx.fillRect(x+i-1,y+10,2,5);}}
    if(tile.type==='mapTable'){ctx.fillStyle='#805a3c';ctx.fillRect(x+1,y+6,18,9);ctx.fillStyle='#d8c995';ctx.fillRect(x+4,y+3,12,9);ctx.strokeStyle='#668d8c';ctx.beginPath();ctx.moveTo(x+6,y+5);ctx.lineTo(x+10,y+8);ctx.lineTo(x+14,y+5);ctx.stroke();}
    if(tile.type==='trophy'){ctx.shadowBlur=10;ctx.shadowColor='#ffd470';ctx.fillStyle='#8a653f';ctx.fillRect(x+7,y+12,6,7);ctx.fillStyle='#efd078';ctx.beginPath();ctx.moveTo(cx,y+2);ctx.lineTo(x+16,y+7);ctx.lineTo(x+13,y+14);ctx.lineTo(x+7,y+14);ctx.lineTo(x+4,y+7);ctx.closePath();ctx.fill();}
    if(tile.type==='npc'){const npc=NPCS.find(person=>person.id===tile.npcId);ctx.shadowBlur=10;ctx.shadowColor=npc.color;ctx.fillStyle='#f0c79b';ctx.beginPath();ctx.arc(cx,cy-5,5,0,Math.PI*2);ctx.fill();ctx.fillStyle=npc.color;ctx.fillRect(x+4,y+10,12,9);ctx.fillStyle='#061012cc';ctx.fillRect(x-3,y-9,26,8);ctx.fillStyle='#f2f3dc';ctx.font='6px "DM Mono"';ctx.textAlign='center';ctx.fillText(npc.name.toUpperCase(),cx,y-3);}
    ctx.restore();
  }
}
function drawResourceBlock(type,px,py){
  const styles={2:['#5a4432','#b48757'],3:['#343b3d','#e3b755'],4:['#39452a','#9e7446'],5:['#49355d','#e6a7ff'],6:['#514c40','#e6d7ad'],7:['#48231f','#ff7448'],8:['#28402e','#8ee987'],9:['#34434a','#92c9db'],10:['#5a4223','#ffc85b']},[base,accent]=styles[type];
  ctx.fillStyle=base;ctx.fillRect(px+1,py+1,TILE-2,TILE-2);ctx.strokeStyle=accent;ctx.lineWidth=1.5;
  if(type===2){ctx.beginPath();ctx.moveTo(px+3,py+4);ctx.lineTo(px+10,py+10);ctx.lineTo(px+6,py+17);ctx.moveTo(px+10,py+10);ctx.lineTo(px+17,py+6);ctx.stroke();}
  if(type===3){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(px+6,py+7,2,0,7);ctx.arc(px+14,py+12,3,0,7);ctx.fill();}
  if(type===4){ctx.beginPath();ctx.moveTo(px+2,py+4);ctx.bezierCurveTo(px+12,py+5,px+5,py+15,px+18,py+17);ctx.moveTo(px+14,py+2);ctx.bezierCurveTo(px+6,py+10,px+13,py+12,px+4,py+18);ctx.stroke();}
  if(type===5){ctx.shadowBlur=8;ctx.shadowColor=accent;ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(px+10,py+3);ctx.lineTo(px+16,py+10);ctx.lineTo(px+11,py+17);ctx.lineTo(px+5,py+12);ctx.closePath();ctx.fill();ctx.shadowBlur=0;}
  if(type===6){ctx.beginPath();ctx.arc(px+10,py+10,6,0,Math.PI*1.65);ctx.stroke();ctx.beginPath();ctx.arc(px+10,py+10,2,0,Math.PI*2);ctx.stroke();}
  if(type===7){ctx.shadowBlur=7;ctx.shadowColor=accent;ctx.beginPath();ctx.moveTo(px+3,py+16);ctx.lineTo(px+7,py+5);ctx.lineTo(px+11,py+13);ctx.lineTo(px+16,py+3);ctx.stroke();ctx.shadowBlur=0;}
  if(type===8){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(px+6,py+8,4,Math.PI,0);ctx.arc(px+14,py+13,4,Math.PI,0);ctx.fill();ctx.strokeStyle='#d9edd2';ctx.beginPath();ctx.moveTo(px+6,py+8);ctx.lineTo(px+6,py+16);ctx.moveTo(px+14,py+13);ctx.lineTo(px+14,py+18);ctx.stroke();}
  if(type===9){ctx.fillStyle=accent;ctx.fillRect(px+4,py+5,5,4);ctx.fillRect(px+11,py+11,6,5);ctx.strokeStyle='#d5edf2';ctx.strokeRect(px+3.5,py+4.5,5,4);ctx.strokeRect(px+10.5,py+10.5,6,5);}
  if(type===10){ctx.shadowBlur=9;ctx.shadowColor=accent;ctx.fillStyle=accent;ctx.beginPath();ctx.arc(px+10,py+10,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0b1';ctx.fillRect(px+8,py+5,3,4);ctx.shadowBlur=0;}
}
function drawMinimap(){
  const scale=2,width=COLS*scale,height=ROWS*scale,left=canvas.width-width-14,top=canvas.height-height-14;
  ctx.save();ctx.fillStyle='rgba(5,10,12,.88)';ctx.fillRect(left-7,top-19,width+14,height+26);ctx.strokeStyle='rgba(151,220,213,.48)';ctx.strokeRect(left-6.5,top-18.5,width+13,height+25);ctx.fillStyle='#a8cbc6';ctx.font='9px "DM Mono"';ctx.textAlign='left';ctx.fillText('CAVE MAP',left,top-6);
  ctx.fillStyle='#10191b';ctx.fillRect(left,top,width,height);
  const blockColors=['','#526064','#936a43','#d0aa4d','#6c8244','#bd79db','#c8b98f','#f06d45','#72c66c','#75aabb','#e5ad42'];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const cell=map[y][x];if(!cell)continue;ctx.fillStyle=blockColors[cell]||'#526064';ctx.fillRect(left+x*scale,top+y*scale,scale,scale);}
  if(!atHome){ctx.fillStyle='#72ece7';for(const crystal of crystals)ctx.fillRect(left+crystal.x*scale,top+crystal.y*scale,scale,scale);ctx.fillStyle='#f0c15a';ctx.fillRect(left+exit.x*scale,top+exit.y*scale,scale+1,scale+1);}
  ctx.fillStyle='#ff7c72';for(const monster of monsters)ctx.fillRect(left+monster.x*scale,top+monster.y*scale,scale,scale);
  ctx.fillStyle='#fff3c4';ctx.fillRect(left+player.x*scale-1,top+player.y*scale-1,scale+2,scale+2);
  ctx.strokeStyle='rgba(255,255,255,.38)';ctx.strokeRect(left+engine.camera.x/TILE*scale,top+engine.camera.y/TILE*scale,engine.width/TILE*scale,engine.height/TILE*scale);ctx.restore();
}
function drawCompass(){
  if(atHome||!weapons.compass)return;
  const target=crystals.length?crystals.reduce((closest,item)=>Math.abs(item.x-player.x)+Math.abs(item.y-player.y)<Math.abs(closest.x-player.x)+Math.abs(closest.y-player.y)?item:closest):exit;
  const distance=Math.abs(target.x-player.x)+Math.abs(target.y-player.y),angle=Math.atan2(target.y-player.y,target.x-player.x);
  ctx.save();ctx.translate(40,42);ctx.fillStyle='rgba(5,10,12,.88)';ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#77cbc6';ctx.lineWidth=2;ctx.stroke();ctx.rotate(angle);ctx.fillStyle=crystals.length?'#7ef1e8':'#f0c15a';ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-8,-6);ctx.lineTo(-3,0);ctx.lineTo(-8,6);ctx.closePath();ctx.fill();ctx.rotate(-angle);ctx.fillStyle='#d9efea';ctx.font='8px "DM Mono"';ctx.textAlign='center';ctx.fillText(`${crystals.length?'CRYSTAL':'EXIT'} ${distance}`,0,36);ctx.restore();
}
function draw() {
  pulse += .04;engine.follow(player);const view=engine.visibleTiles();ctx.fillStyle='#080d0e';ctx.fillRect(0,0,canvas.width,canvas.height);engine.begin(ctx);
  for(let y=view.top;y<=view.bottom;y++)for(let x=view.left;x<=view.right;x++){const px=x*TILE,py=y*TILE,seed=(x*17+y*31)%3,cell=map[y][x];if(cell>=2&&cell<=10)drawResourceBlock(cell,px,py);else if(cell){ctx.fillStyle=theme.walls[seed];ctx.fillRect(px,py,TILE,TILE);ctx.fillStyle=theme.mark;ctx.fillRect(px+3,py+3,4,3);if((x*13+y*7)%11===0)ctx.fillRect(px+13,py+13,2,2);}else if(atHome&&x>HOME_BOUNDS.left&&x<HOME_BOUNDS.right&&y>HOME_BOUNDS.top&&y<HOME_BOUNDS.bottom){ctx.fillStyle=(y%2?'#59432f':'#624a34');ctx.fillRect(px,py,TILE,TILE);ctx.strokeStyle='#7e6042';ctx.beginPath();ctx.moveTo(px,py+(y%2?6:14));ctx.lineTo(px+TILE,py+(y%2?6:14));ctx.moveTo(px+(x%3)*7,py);ctx.lineTo(px+(x%3)*7,py+TILE);ctx.stroke();}else{ctx.fillStyle=theme.floor;ctx.fillRect(px,py,TILE,TILE);ctx.strokeStyle=theme.line;ctx.strokeRect(px+.5,py+.5,TILE-1,TILE-1);if((x*5+y*9)%19===0){ctx.fillStyle=theme.mark;ctx.globalAlpha=.32;ctx.fillRect(px+9,py+10,2,2);ctx.globalAlpha=1;}}}
  drawSpecialTiles();
  if(!atHome){const lit = !crystals.length; ctx.save(); ctx.translate(exit.x*TILE+10, exit.y*TILE+10); ctx.strokeStyle=lit?'#e8d795':'#4f5147'; ctx.lineWidth=3; ctx.strokeRect(-7,-9,14,18); ctx.fillStyle=lit?'#b88e4b':'#232926'; ctx.fillRect(-4,-5,8,12); ctx.restore();}
  crystals.forEach(c=>{ ctx.save(); ctx.shadowBlur=11+Math.sin(pulse+c.x)*2; ctx.shadowColor=theme.glow; ctx.fillStyle=theme.crystal; ctx.beginPath();ctx.moveTo(c.x*TILE+10,c.y*TILE+2);ctx.lineTo(c.x*TILE+15,c.y*TILE+10);ctx.lineTo(c.x*TILE+10,c.y*TILE+18);ctx.lineTo(c.x*TILE+5,c.y*TILE+10);ctx.fill();ctx.restore(); });
  foods.forEach(f=>{const fx=f.x*TILE+10,fy=f.y*TILE+10;ctx.save();ctx.shadowBlur=6;ctx.shadowColor='#d86b4d';ctx.fillStyle='#d85645';ctx.beginPath();ctx.arc(fx,fy-2,6,Math.PI,0);ctx.fill();ctx.fillStyle='#e9c8a1';ctx.fillRect(fx-2,fy-1,4,8);ctx.fillStyle='#f4e9ce';ctx.fillRect(fx-3,fy-4,2,2);ctx.fillRect(fx+2,fy-5,2,2);ctx.restore();});
  monsters.forEach(m=>{
    const mx=m.x*TILE+10,my=m.y*TILE+10;ctx.save();ctx.translate(mx,my);
    if(m.type==='wisp'){ctx.globalAlpha=.75;ctx.shadowBlur=12;ctx.shadowColor='#9a76ea';ctx.fillStyle='#7c68bf';ctx.beginPath();ctx.arc(0,0,6+Math.sin(pulse+m.x)*2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e5d7ff';ctx.beginPath();ctx.arc(-2,-2,2,0,Math.PI*2);ctx.fill();}
    else if(m.type==='mother'){ctx.shadowBlur=16;ctx.shadowColor='#e33f62';ctx.fillStyle='#611f39';ctx.beginPath();ctx.ellipse(0,1,11,9,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b94f67';ctx.lineWidth=2;for(const side of [-1,1])for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(side*6,i*4);ctx.lineTo(side*13,i*6);ctx.stroke();}ctx.fillStyle='#ffcf68';ctx.fillRect(-5,-4,3,3);ctx.fillRect(2,-4,3,3);}
    else if(m.type==='stalker'){ctx.shadowBlur=8;ctx.shadowColor='#e9af55';ctx.fillStyle='#3c3020';ctx.beginPath();ctx.moveTo(-8,8);ctx.lineTo(-6,-7);ctx.lineTo(0,-10);ctx.lineTo(6,-7);ctx.lineTo(8,8);ctx.fill();ctx.fillStyle='#ffd36a';ctx.fillRect(-4,-3,3,3);ctx.fillRect(2,-3,3,3);}
    else if(m.type==='beetle'){ctx.shadowBlur=8;ctx.shadowColor='#58b9b5';ctx.fillStyle='#275c61';ctx.beginPath();ctx.ellipse(0,1,8,7,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8bddce';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,8);ctx.moveTo(-7,-1);ctx.lineTo(-11,-5);ctx.moveTo(7,-1);ctx.lineTo(11,-5);ctx.stroke();}
    else if(m.type==='moth'){ctx.shadowBlur=11;ctx.shadowColor='#d2b8ff';ctx.fillStyle='#9a7fc2';ctx.beginPath();ctx.ellipse(-5,0,6,8,-.5,0,Math.PI*2);ctx.ellipse(5,0,6,8,.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eee0ff';ctx.fillRect(-1,-6,2,12);}
    else{ctx.shadowBlur=7;ctx.shadowColor='#d84c5c';ctx.fillStyle='#442034';ctx.beginPath();ctx.arc(0,2,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f06a68';ctx.fillRect(-4,-1,3,3);ctx.fillRect(2,-1,3,3);}
    ctx.restore();
  });
  ctx.save();ctx.translate(player.x*TILE+10,player.y*TILE+11+Math.sin(pulse*4)*player.bob*3);ctx.globalAlpha=playerIsHidden()?.62:1;ctx.shadowBlur=playerIsHidden()?18:12;ctx.shadowColor=playerIsHidden()?'#75d8dc':'#ffcc72';ctx.fillStyle='#f0b65a';ctx.beginPath();ctx.arc(0,-3,5,0,7);ctx.fill();ctx.fillStyle='#295e62';ctx.fillRect(-5,1,10,8);ctx.restore();engine.end(ctx);
  const playerScreen=engine.screen(player.x,player.y),gx=playerScreen.x,gy=playerScreen.y,lensBonus=weapons.lens?35:0,glowBonus=(specialAt(player.x,player.y,'glowpool')?85:0)+(glowTurns?90:0),lightRadius=atHome?420:burst?260+lensBonus+glowBonus:(theme.id==='echo'?125:180)+lensBonus+glowBonus,g=ctx.createRadialGradient(gx,gy,35,gx,gy,lightRadius);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,atHome?'rgba(0,0,0,.02)':'rgba(0,0,0,.08)');g.addColorStop(1,atHome?'rgba(0,0,0,.58)':'rgba(0,0,0,.92)');ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
  if(atHome){ctx.save();ctx.globalCompositeOperation='destination-out';for(const lamp of specialTiles.filter(tile=>tile.type==='lamp')){const position=engine.screen(lamp.x,lamp.y),lx=position.x,ly=position.y,glow=ctx.createRadialGradient(lx,ly,4,lx,ly,95);glow.addColorStop(0,'rgba(0,0,0,.8)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(lx-95,ly-95,190,190);}ctx.restore();}
  drawMinimap();drawCompass();
  if(burst) burst=Math.max(0,burst-.05); requestAnimationFrame(draw);
}
function showHome(){makeHomeCave();}
function showCaveHub() {
  running=false;homeOpen=true;shopOpen=false;craftingOpen=false;storageOpen=false;
  overlay.classList.add('menu');
  overlay.innerHTML=`<div class="menu-panel"><p class="eyebrow">MAIN CAVE · LEVEL ${level}</p><h2>Choose a passage.</h2><p>Each gate leads to a different cave rule. Collect every crystal, then reach the open exit.</p><div class="cave-grid">${CAVES.map(cave=>`<button data-cave-id="${cave.id}"><b>${cave.name}</b><br><small>${cave.rule}</small></button>`).join('')}</div><button id="gate-back">Back to home</button></div>`;
  overlay.classList.remove('hidden');
  document.querySelectorAll('[data-cave-id]').forEach(button=>button.onclick=()=>enterChosenCave(button.dataset.caveId));
  document.querySelector('#gate-back').onclick=showHome;
}
function enterChosenCave(caveId) { ensureAudio(); makeCave(false,caveId); atHome=false;homeOpen=false; overlay.classList.remove('menu'); overlay.classList.add('hidden'); running=true; }
function enterCave() { showCaveHub(); }
function begin() { makeCave(true); showHome(); }
function nextLevel() { level++; showHome(); }
const directions = {arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
function movementDelay() {
  let delay = sprinting ? (weapons.boots?75:SPRINT_DELAY) : (weapons.boots?150:WALK_DELAY);
  if(specialAt(player.x,player.y,'water')) delay *= 1.7;
  if(specialAt(player.x,player.y,'rail')) delay *= .62;
  return Math.round(delay);
}
function restartMoveTimer() {
  clearTimeout(moveTimer);
  if (heldDirection) moveTimer = setTimeout(function repeatMove(){if(heldDirection&&!iceSliding)move(...heldDirection,sprinting);if(heldDirection)moveTimer=setTimeout(repeatMove,movementDelay());},movementDelay());
}
window.addEventListener('keydown', e => {
  const k=e.key.toLowerCase();
  if(k==='shift'&&!e.repeat){sprinting=true;restartMoveTimer();}
  if(directions[k]){e.preventDefault();if(!e.repeat){heldDirection=directions[k];move(...heldDirection,sprinting);restartMoveTimer();}}
  if(k==='e'&&!e.repeat)breakBlock();
  if(k===' '){e.preventDefault();if(!e.repeat)lanternBurst();}
  if(k==='f'&&!e.repeat)bladeStrike();
  if(k==='j'&&!e.repeat&&!shopOpen&&!inventoryOpen&&!craftingOpen&&!storageOpen&&!dialogOpen){if(journalOpen)closeJournal();else openJournal();}
  if(k==='b'&&!e.repeat&&!inventoryOpen&&!craftingOpen&&!storageOpen&&!journalOpen&&!dialogOpen){if(shopOpen)closeShop();else openShop(homeOpen);}
  if(k==='c'&&!e.repeat&&homeOpen&&!shopOpen&&!storageOpen&&!journalOpen&&!dialogOpen)openCrafting();
  if(k==='i'&&!e.repeat&&!shopOpen&&!craftingOpen&&!storageOpen&&!journalOpen&&!dialogOpen)inventoryOpen?closeInventory():openInventory();
  if(k==='escape'){if(shopOpen)closeShop();else if(inventoryOpen)closeInventory();else if(craftingOpen)closeCrafting();else if(storageOpen)closeStorage();else if(dialogOpen)closeDialogue();else if(journalOpen)closeJournal();}
  if(shopOpen&&k==='1')buyWeapon('lance',5);if(shopOpen&&k==='2')buyWeapon('blade',8);if(shopOpen&&k==='3')buyHeart();
});
window.addEventListener('keyup', e => { const k=e.key.toLowerCase(); if (directions[k]) { heldDirection=null; clearTimeout(moveTimer); } if(k==='shift'){sprinting=false;restartMoveTimer();} });
window.addEventListener('blur', () => { heldDirection=null; sprinting=false; clearTimeout(moveTimer); });
start.onclick = showHome; newCave.onclick = showHome; soundToggle.onclick = () => { ensureAudio(); muted=!muted; master.gain.setTargetAtTime(muted?.0001:.22,audio.currentTime,.03); soundToggle.textContent=muted?'Sound off':'Sound on'; soundToggle.setAttribute('aria-pressed',String(!muted)); }; makeCave(); showHome(); setInterval(broodmotherTick,BROODMOTHER_DELAY); draw();
