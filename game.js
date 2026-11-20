(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, TILE = 48, MAP_W = 42, MAP_H = 34;
  const species = [
    {name:'Embercub',type:'Ember',icon:'🦊',color:'#f49a63',hp:30,power:8},
    {name:'Mossbit',type:'Leaf',icon:'🌱',color:'#91bd71',hp:26,power:6},
    {name:'Bubblit',type:'Tide',icon:'💧',color:'#72b8d2',hp:28,power:7},
    {name:'Voltkit',type:'Spark',icon:'⚡',color:'#edcf63',hp:24,power:9},
    {name:'Pebblit',type:'Stone',icon:'🪨',color:'#aaa18c',hp:34,power:7},
    {name:'Petalyn',type:'Bloom',icon:'🌸',color:'#eaa2b6',hp:25,power:8},
    {name:'Cloudlet',type:'Air',icon:'☁️',color:'#b8d7dc',hp:27,power:8},
    {name:'Duskit',type:'Shade',icon:'🌙',color:'#9389ba',hp:29,power:9},
    {name:'Puddlepup',type:'Tide',icon:'🐸',color:'#6db9a3',hp:32,power:7},
    {name:'Thornox',type:'Leaf',icon:'🌿',color:'#6f9d5a',hp:38,power:10},
    {name:'Sunspry',type:'Ember',icon:'☀️',color:'#edab4f',hp:30,power:11},
    {name:'Glimmeray',type:'Spark',icon:'✨',color:'#9fb7eb',hp:28,power:12}
  ];
  const challengers = [
    {id:'fern',name:'Fern',title:'Meadow Guide',x:10,y:11,icon:'🧢',team:[1,5],crest:'Meadow Crest',color:'#74a86c'},
    {id:'brook',name:'Brook',title:'Creek Keeper',x:29,y:10,icon:'🧣',team:[2,8],crest:'Ripple Crest',color:'#6ba9b2'},
    {id:'pax',name:'Pax',title:'Ridge Scout',x:13,y:26,icon:'🎒',team:[4,9],crest:'Summit Crest',color:'#b68b65'},
    {id:'nova',name:'Nova',title:'Wildbound Champion',x:34,y:25,icon:'⭐',team:[10,11],crest:'Trailblazer Crest',color:'#bd8c54'}
  ];
  const defaults = {player:{x:6.5,y:7.5},team:[{species:0,level:3,hp:30,xp:0}],seen:[0],orbs:4,crests:[],wins:0,steps:0};
  let state = load();
  let input = {x:0,y:0};
  let moveClock = 0, encounterClock = 0, toastClock = 0, frame = 0;
  let battle = null;
  let activeTeam = 0;
  let lastSave = 0;
  const $ = (id) => document.getElementById(id);
  function load(){ try { const s=JSON.parse(localStorage.getItem('wildbound-save')); return s ? {...structuredClone(defaults),...s,player:{...defaults.player,...s.player}} : structuredClone(defaults); } catch { return structuredClone(defaults); } }
  function save(){ localStorage.setItem('wildbound-save',JSON.stringify(state)); lastSave=Date.now(); toast('Progress saved to this device.'); updateUI(); }
  function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');toastClock=2.2;}
  function hash(x,y){let n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)}
  function terrain(x,y){
    if(x<0||y<0||x>=MAP_W||y>=MAP_H)return 'water';
    // winding cream trail, a small lake and a north-east woodland
    const path1=Math.abs(y-(7+Math.sin(x*.25)*2))<1.15;
    const path2=Math.abs(x-(21+Math.sin(y*.19)*4))<1.15;
    const path3=Math.abs(y-(23+Math.sin(x*.17)*2))<1.15;
    const path4=Math.abs(x-(33+Math.sin(y*.21)*2))<1.1;
    const path=path1||path2||path3||path4;
    const lake=((x-23)**2/23+(y-17)**2/11)<1 && !path;
    if(lake)return 'water';
    if(path)return 'path';
    if(y<3||x<2||y>31||x>39)return 'edge';
    if((x>16&&x<28&&y>4&&y<13)&&hash(x,y)>.2)return 'grass';
    if((y>19&&x<12)||(x>30&&y>15))return hash(x,y)>.38?'grass':'meadow';
    return hash(x,y)>.82?'grass':'meadow';
  }
  function isBlocked(x,y){const t=terrain(Math.floor(x),Math.floor(y)); if(t==='water'||t==='edge')return true;
    for(let i=0;i<MAP_W;i++)for(let j=0;j<MAP_H;j++){if(isTree(i,j)&&Math.abs(i+.5-x)<.48&&Math.abs(j+.5-y)<.48)return true;}
    return false;
  }
  function isTree(x,y){if(x<1||y<1||x>=MAP_W-1||y>=MAP_H-1)return false;const t=terrain(x,y); if(t==='path'||t==='water')return false; return hash(x*3+9,y*2+4)>.94 && !(x>4&&x<9&&y>5&&y<10);}
  function drawTile(x,y,px,py){const t=terrain(x,y), h=hash(x+71,y+29); ctx.fillStyle=t==='path'?(h>.5?'#dec995':'#e5d3a7'):t==='water'?(h>.5?'#79b9bd':'#80c2c3'):t==='grass'?(h>.5?'#91c16f':'#9bc879'):(h>.5?'#a5cf7e':'#9dc777');ctx.fillRect(px,py,TILE+1,TILE+1);
    if(t==='path'){ctx.fillStyle='#efe0bd55';ctx.beginPath();ctx.ellipse(px+9+h*25,py+12+h*20,3,2,0,0,Math.PI*2);ctx.fill();if(h>.8){ctx.fillStyle='#c2a876';ctx.fillRect(px+32,py+35,3,2)}}
    if(t==='water'){ctx.strokeStyle='#c5e8d777';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px+9,py+20+h*13);ctx.quadraticCurveTo(px+20,py+16+h*13,px+34,py+20+h*13);ctx.stroke()}
    if(t==='grass'&&h>.28){ctx.strokeStyle='#629c5b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px+13,py+38);ctx.lineTo(px+12,py+30);ctx.moveTo(px+13,py+35);ctx.lineTo(px+8,py+31);ctx.moveTo(px+33,py+39);ctx.lineTo(px+36,py+29);ctx.stroke();if(h>.76){ctx.fillStyle='#e3db8e';ctx.beginPath();ctx.arc(px+37,py+28,2.1,0,7);ctx.fill()}}
    else if(t==='meadow'&&h>.86){ctx.fillStyle='#f0da8a';ctx.beginPath();ctx.arc(px+12,py+12,1.8,0,7);ctx.fill();ctx.fillStyle='#edb3a5';ctx.beginPath();ctx.arc(px+33,py+31,1.7,0,7);ctx.fill()}
  }
  function drawTree(x,y,px,py){const h=hash(x*3+9,y*2+4);ctx.fillStyle='#526e46';ctx.fillRect(px+20,py+28,9,17);ctx.fillStyle='#6b9359';ctx.beginPath();ctx.arc(px+24,py+20,17,0,7);ctx.arc(px+13,py+25,11,0,7);ctx.arc(px+35,py+25,11,0,7);ctx.fill();ctx.fillStyle=h>.5?'#83aa64':'#789f5b';ctx.beginPath();ctx.arc(px+22,py+15,12,0,7);ctx.arc(px+33,py+19,9,0,7);ctx.fill();ctx.fillStyle='#a1c77a88';ctx.beginPath();ctx.arc(px+18,py+11,5,0,7);ctx.fill();}
  function drawAvatar(x,y,icon,color,scale=1,isPlayer=false){const px=x,py=y;ctx.save();ctx.translate(px,py);ctx.scale(scale,scale);ctx.fillStyle='#18352535';ctx.beginPath();ctx.ellipse(0,12,13,5,0,0,7);ctx.fill();ctx.fillStyle=isPlayer?'#e4b56d':color;ctx.fillRect(-8,0,16,12);ctx.fillStyle='#f0c99a';ctx.beginPath();ctx.arc(0,-7,8,0,7);ctx.fill();ctx.fillStyle=isPlayer?'#4b6854':'#426354';ctx.beginPath();ctx.arc(0,-10,8,Math.PI,0);ctx.fill();ctx.fillStyle='#243b31';ctx.fillRect(2,-7,2,2);ctx.fillStyle='#fff';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText(icon,0,-18);if(isPlayer){ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.fillText('YOU',0,24)}ctx.restore();}
  function drawSign(x,y,px,py){ctx.fillStyle='#705d3c';ctx.fillRect(px+21,py+18,6,25);ctx.fillStyle='#f2e4be';ctx.fillRect(px+10,py+12,29,17);ctx.strokeStyle='#96764c';ctx.strokeRect(px+10,py+12,29,17);ctx.fillStyle='#79925b';ctx.font='9px DM Sans';ctx.textAlign='center';ctx.fillText('ROUTE',px+24,py+23)}
  function render(){frame++;ctx.clearRect(0,0,W,H);const camX=state.player.x*TILE-W/2,camY=state.player.y*TILE-H/2;const sx=Math.floor(camX/TILE)-1,sy=Math.floor(camY/TILE)-1;
    for(let y=sy;y<sy+Math.ceil(H/TILE)+3;y++)for(let x=sx;x<sx+Math.ceil(W/TILE)+3;x++){const px=x*TILE-camX,py=y*TILE-camY;drawTile(x,y,px,py)}
    // Trees layer, then landmarks and characters
    for(let y=sy;y<sy+Math.ceil(H/TILE)+3;y++)for(let x=sx;x<sx+Math.ceil(W/TILE)+3;x++)if(isTree(x,y))drawTree(x,y,x*TILE-camX,y*TILE-camY);
    const signPos=[[6,7],[20,7],[28,22],[10,23]];signPos.forEach(([x,y])=>drawSign(x,y,x*TILE-camX,y*TILE-camY));
    challengers.forEach(c=>{const x=c.x*TILE-camX,y=c.y*TILE-camY;const done=state.crests.includes(c.id);drawAvatar(x+24,y+31,c.icon,done?'#9ca99a':c.color,1.07);if(x>-40&&x<W+40&&y>-40&&y<H+40){ctx.fillStyle='#fffffff0';ctx.beginPath();ctx.roundRect(x-9,y-2,66,15,5);ctx.fill();ctx.fillStyle=done?'#719071':'#425d4a';ctx.font='bold 8px DM Sans';ctx.textAlign='center';ctx.fillText(done?'✓ '+c.name:c.name,x+24,y+8);}}
    );
    drawAvatar(W/2,H/2,'R','#e4b56d',1.12,true);
    ctx.fillStyle='#f5fbef';ctx.font='bold 12px DM Sans';ctx.textAlign='center';ctx.fillText('⌄',W/2,H/2-35);
    // soft inset edges and vibrant light
    const g=ctx.createRadialGradient(W/2,H/2,170,W/2,H/2,630);g.addColorStop(0,'#ffffff00');g.addColorStop(1,'#294a3430');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    requestAnimationFrame(render);
  }
  function update(dt){if(toastClock>0){toastClock-=dt;if(toastClock<=0)$('toast').classList.remove('show')}
    if(battle||$('menuOverlay').classList.contains('hidden')===false)return;
    if(input.x||input.y){moveClock-=dt;if(moveClock<=0){const nx=state.player.x+input.x*.095,ny=state.player.y+input.y*.095;if(!isBlocked(nx,ny)){state.player.x=nx;state.player.y=ny;state.steps++;$('coordLabel').textContent=`N ${String(Math.max(0,Math.round(34-ny))).padStart(2,'0')}° · E ${String(Math.round(nx)).padStart(2,'0')}°`;const t=terrain(Math.floor(nx),Math.floor(ny));if(t==='grass'){encounterClock+=dt+0.12;if(Math.random()<.028)startBattle(false)}if(state.steps%5===0)updateUI();if(Date.now()-lastSave>30000&&state.steps%10===0)save()}moveClock=.13}}
  }
  function startBattle(trainer,challenger=null){if(battle)return;let enemy;
    if(trainer){const remaining=challenger.team;enemy={species:remaining[0],level:4+state.crests.length*2,hp:species[remaining[0]].hp+5*state.crests.length,max:species[remaining[0]].hp+5*state.crests.length};battle={trainer:true,challenger,index:0,enemies:remaining.map((id,i)=>({species:id,level:4+state.crests.length*2+i,hp:species[id].hp+4*state.crests.length,max:species[id].hp+4*state.crests.length})),enemy,phase:'active'};battle.enemy=battle.enemies[0];}
    else {let pool=[1,2,3,4,5,6,7,8];if(state.crests.length>0)pool=pool.concat([9,10,11]);const id=pool[Math.floor(Math.random()*pool.length)];const level=2+Math.min(7,Math.floor(state.steps/45));enemy={species:id,level,hp:species[id].hp+level*2,max:species[id].hp+level*2};battle={trainer:false,enemy,phase:'active'};}
    $('battleOverlay').classList.remove('hidden');$('battleTag').textContent=trainer?`TRAIL CHALLENGE · ${challenger.title.toUpperCase()}`:'WILD ENCOUNTER';$('battleActions').classList.remove('hidden');$('continueBattle').classList.add('hidden');renderBattle();setMessage(trainer?`${challenger.name} challenges you to a trail battle!`:`A wild ${species[enemy.species].name} appeared!`);input={x:0,y:0};
  }
  function renderBattle(){if(!battle)return;const s=species[battle.enemy.species];$('enemyName').textContent=s.name;$('enemyMeta').textContent=`${battle.trainer?'CHALLENGER':'WILD'} · LV ${battle.enemy.level}`;$('enemyPortrait').textContent=s.icon;$('enemyPortrait').style.background=s.color+'35';$('enemyHealth').style.width=Math.max(0,battle.enemy.hp/battle.enemy.max*100)+'%';$('orbCount').textContent='× '+state.orbs;document.querySelector('[data-action="capture"]').disabled=battle.trainer||state.orbs<=0;}
  function setMessage(msg){$('battleMessage').textContent=msg;}
  function playerAttack(){if(!battle||battle.phase!=='active')return;const buddy=state.team[activeTeam];if(!buddy||buddy.hp<=0){setMessage('Your buddy needs a rest! Switch to another team member.');return}const s=species[buddy.species],damage=Math.max(4,s.power+buddy.level+Math.floor(Math.random()*5)-battle.enemy.level);battle.enemy.hp=Math.max(0,battle.enemy.hp-damage);renderBattle();if(battle.enemy.hp<=0){defeatEnemy();return}setMessage(`${s.name} lands a quick strike for ${damage} damage!`);setTimeout(enemyTurn,700);}
  function enemyTurn(){if(!battle||battle.phase!=='active')return;const buddy=state.team[activeTeam],enemy=species[battle.enemy.species];const damage=Math.max(3,enemy.power+Math.floor(battle.enemy.level*.65)-Math.floor((buddy.level||1)*.35));buddy.hp=Math.max(0,buddy.hp-damage);renderTeam();if(buddy.hp<=0){const next=state.team.findIndex((b,i)=>i!==activeTeam&&b.hp>0);if(next>=0){activeTeam=next;setMessage(`${enemy.name} hit for ${damage}. ${species[state.team[next].species].name} jumps in!`)}else{buddy.hp=Math.max(1,Math.ceil(buddy.maxHp||species[buddy.species].hp)*.45);state.team.forEach(b=>b.hp=Math.max(b.hp,Math.ceil((b.maxHp||species[b.species].hp)*.45)));battle.phase='end';setMessage('Your team needs a breather. Everyone recovered a little HP.');finishButtons();return}}else setMessage(`${enemy.name} countered for ${damage} damage.`);renderBattle();}
  function defeatEnemy(){if(battle.trainer&&battle.index+1<battle.enemies.length){battle.index++;battle.enemy=battle.enemies[battle.index];setMessage(`${species[battle.enemy.species].name} joins the challenge!`);renderBattle();return}const trainer=battle.trainer, challenger=battle.challenger;awardXP(18+(battle.enemy.level*4));state.wins++;if(trainer&&!state.crests.includes(challenger.id)){state.crests.push(challenger.id);state.orbs+=2;setMessage(`Victory! You earned the ${challenger.crest} and 2 wild orbs.`)}else setMessage(`${species[battle.enemy.species].name} is ready to join you! You gained XP.`);battle.phase='end';finishButtons();updateUI();}
  function finishButtons(){ $('battleActions').classList.add('hidden');$('continueBattle').classList.remove('hidden'); }
  function awardXP(amount){const b=state.team[activeTeam];b.xp=(b.xp||0)+amount;let threshold=20+b.level*10;if(b.xp>=threshold){b.xp-=threshold;b.level++;b.hp=species[b.species].hp+b.level*2;toast(`${species[b.species].name} grew to level ${b.level}!`)} }
  function capture(){if(!battle||battle.trainer||state.orbs<1)return;state.orbs--;const enemy=battle.enemy;const chance=.27+(1-enemy.hp/enemy.max)*.58;if(Math.random()<chance){if(state.team.length<6){state.team.push({species:enemy.species,level:enemy.level,hp:Math.ceil(enemy.max*.72),maxHp:enemy.max,xp:0});toast(`${species[enemy.species].name} joined your team!`)}else toast('Team full — creature recorded in your journal.');if(!state.seen.includes(enemy.species))state.seen.push(enemy.species);state.wins++;battle.phase='end';setMessage(`${species[enemy.species].name} joined your adventure!`);finishButtons();updateUI()}else{setMessage(`${species[enemy.species].name} slipped free!`);renderBattle();setTimeout(enemyTurn,650)}updateUI();}
  function retreat(){if(battle.trainer){setMessage('This is a friendly challenge — see it through!');return}battle.phase='end';setMessage('You slipped away safely.');finishButtons()}
  function interact(){if(battle)return;const near=challengers.find(c=>Math.hypot((c.x+.5)-state.player.x,(c.y+.5)-state.player.y)<2.1);if(near){if(state.crests.includes(near.id)){toast(`${near.name}: “The trail is yours to explore!”`)}else startBattle(true,near);return}const spots=[[6,7,'Sunmeadows Trail'],[20,7,'Cloverfield Crossing'],[28,22,'Mirrorpond'],[10,23,'Pebble Ridge']];const spot=spots.find(([x,y])=>Math.hypot((x+.5)-state.player.x,(y+.5)-state.player.y)<2);if(spot)toast(`${spot[2]} — the path continues in every direction.`);else toast('Wander into the tall grass to meet a wild buddy.');}
  function updateUI(){renderTeam();$('trainerLevel').textContent=String(1+Math.floor(state.wins/3)).padStart(2,'0');$('winCount').textContent=state.wins;$('bagCount').textContent=state.orbs;$('orbCount').textContent='× '+state.orbs;$('badgeCount').textContent=`${state.crests.length}/3`;$('dexCount').textContent=`${String(state.seen.length).padStart(2,'0')} / 12`;$('dexFill').style.width=(state.seen.length/12*100)+'%';$('journalSub').textContent=state.seen.length>1?`${state.seen.length} curious species found so far.`:'Your adventure is just beginning.';const b=state.team[activeTeam]||state.team[0],threshold=20+(b?.level||1)*10;$('xpFill').style.width=((b?.xp||0)/threshold*100)+'%';$('xpText').textContent=`${b?.xp||0} / ${threshold} XP`;
    const mainDone=state.crests.length>=3;$('questTitle').textContent=mainDone?'Champion of the wilds':'A world to discover';$('questDesc').textContent=mainDone?'Three trail crests earned. Find Nova at the far eastern lookout for the final challenge.':'Find the trail challengers across Sunmeadows and earn their crests.';$('questSteps').innerHTML=challengers.slice(0,3).map(c=>`<div class="quest-step ${state.crests.includes(c.id)?'done':''}"><span class="step-mark">${state.crests.includes(c.id)?'✓':''}</span><span>${c.crest}</span></div>`).join('');
    const dx=state.player.x,dy=state.player.y;let loc=dy<12?'Cloverfield':dy<22?'Mirrorpond':'Pebble Ridge';if(dx>29)loc='Sunset Ridge';$('locationName').textContent=loc;$('regionLabel').textContent=loc.toUpperCase();}
  function renderTeam(){ $('teamList').innerHTML=state.team.slice(0,3).map((b,i)=>{const s=species[b.species],max=b.maxHp||s.hp+b.level*2;return `<div class="buddy-row" data-team="${i}"><div class="buddy-art" style="background:${s.color}32">${s.icon}</div><div class="buddy-copy"><div class="buddy-name">${s.name}</div><div class="buddy-type">${s.type.toUpperCase()} · LV ${b.level}</div></div><div class="buddy-level">${b.hp}/${max}</div><div class="mini-health"><span style="width:${b.hp/max*100}%;background:${b.hp/max<.3?'#e68c70':'#7fb47c'}"></span></div></div>`}).join('');document.querySelectorAll('.buddy-row').forEach(el=>el.onclick=()=>{activeTeam=Number(el.dataset.team);updateUI();toast(`${species[state.team[activeTeam].species].name} is ready.`)});}
  function openMenu(title,html){$('menuTitle').textContent=title;$('menuContent').innerHTML=html;$('menuOverlay').classList.remove('hidden')}
  function teamMenu(){openMenu('Your team',`<div class="menu-list">${state.team.map((b,i)=>{const s=species[b.species];return `<div class="menu-item"><div class="buddy-art" style="background:${s.color}32">${s.icon}</div><div class="menu-details"><strong>${s.name} <span style="color:#90a091;font-weight:400">· ${s.type}</span></strong><small>LEVEL ${b.level} · HP ${b.hp}/${b.maxHp||s.hp+b.level*2}</small><p>Ready to explore the wilds with you.</p></div><button data-switch="${i}">${i===activeTeam?'ACTIVE':'LEAD'}</button></div>`}).join('')}</div>`);document.querySelectorAll('[data-switch]').forEach(x=>x.onclick=()=>{activeTeam=Number(x.dataset.switch);teamMenu();updateUI()})}
  function bagMenu(){openMenu('Field bag',`<div class="inventory-grid"><div class="inventory-item"><span>◉</span><strong>Wild orbs · ${state.orbs}</strong><small>Invite a wild buddy to your team.</small></div><div class="inventory-item"><span>✿</span><strong>Trail snacks · ∞</strong><small>Rest your team between adventures.</small></div><div class="inventory-item"><span>⚑</span><strong>Trail crests · ${state.crests.length}</strong><small>Proof of your challenger victories.</small></div><div class="inventory-item"><span>📖</span><strong>Field journal · ${state.seen.length}/12</strong><small>Every new species is recorded.</small></div></div>`)}
  function mapMenu(){openMenu('World map',`<div style="position:relative;height:225px;border-radius:11px;overflow:hidden;background:linear-gradient(145deg,#a8d18a 0 34%,#87c4c0 34% 50%,#a7d27f 51% 100%);"><div style="position:absolute;left:8%;top:23%;width:82%;height:4px;background:#ead4a5;transform:rotate(-8deg);box-shadow:0 12px 0 #ead4a5,0 24px 0 #ead4a5"></div><div style="position:absolute;left:51%;top:8%;height:85%;width:4px;background:#ead4a5;transform:rotate(5deg);box-shadow:12px 0 0 #ead4a5"></div>${challengers.map(c=>`<span style="position:absolute;left:${c.x/42*92+3}%;top:${c.y/34*80+7}%;font-size:14px" title="${c.crest}">${state.crests.includes(c.id)?'✓':'⚑'}</span>`).join('')}<span style="position:absolute;left:${state.player.x/42*92+3}%;top:${state.player.y/34*80+7}%;font-size:16px">📍</span><span style="position:absolute;bottom:10px;left:12px;color:#355346;font:10px 'DM Mono'">SUNMEADOWS · MIRRORPOND · PEBBLE RIDGE</span></div><p style="color:#77867b;font-size:11px;line-height:1.55">Explore the open trails, find the flag-marked challengers, and discover all 12 wild species. The final lookout is in the northeast.</p>`)}
  function questMenu(){openMenu('Trail journal',`<div class="menu-list">${challengers.map((c,i)=>`<div class="menu-item"><div class="quest-icon">${state.crests.includes(c.id)?'✓':'⚑'}</div><div class="menu-details"><strong>${c.name} · ${c.title}</strong><small>${c.crest.toUpperCase()}</small><p>${state.crests.includes(c.id)?'Challenge complete — well explored!':i===3&&state.crests.length<3?'Earn any 3 trail crests to unlock the final challenge.':'Find them on the trail and press E to challenge.'}</p></div></div>`).join('')}</div>`)}
  function loop(now){const dt=Math.min(.05,(now-(loop.last||now))/1000);loop.last=now;update(dt);requestAnimationFrame(loop)}
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k==='w'||k==='arrowup')input={x:0,y:-1};if(k==='s'||k==='arrowdown')input={x:0,y:1};if(k==='a'||k==='arrowleft')input={x:-1,y:0};if(k==='d'||k==='arrowright')input={x:1,y:0};if(k==='e'||k==='enter'){if(battle){if(battle.phase==='end')closeBattle()}else interact()}if(k==='escape'){$('menuOverlay').classList.add('hidden');if(battle&&battle.phase==='end')closeBattle()}if(k==='1')teamMenu();if(k==='m')mapMenu();});window.addEventListener('keyup',e=>{if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))input={x:0,y:0}});
  document.querySelectorAll('[data-dir]').forEach(btn=>{const set=()=>{const d=btn.dataset.dir;input=d==='up'?{x:0,y:-1}:d==='down'?{x:0,y:1}:d==='left'?{x:-1,y:0}:{x:1,y:0}};btn.addEventListener('pointerdown',e=>{e.preventDefault();set()});btn.addEventListener('pointerup',()=>input={x:0,y:0});btn.addEventListener('pointerleave',()=>input={x:0,y:0})});$('mobileInteract').onclick=interact;
  document.querySelectorAll('.battle-action').forEach(btn=>btn.onclick=()=>{const a=btn.dataset.action;if(a==='attack')playerAttack();if(a==='capture')capture();if(a==='run')retreat();if(a==='team'){const next=state.team.findIndex((b,i)=>i!==activeTeam&&b.hp>0);if(next>=0){activeTeam=next;setMessage(`${species[state.team[next].species].name}, you're up!`);setTimeout(enemyTurn,550)}else setMessage('No other buddy is ready to switch in.')} });
  function closeBattle(){battle=null;$('battleOverlay').classList.add('hidden');if(state.crests.length>=3&&!state.crests.includes('nova'))toast('Three crests earned! Find Nova at Sunset Ridge.');updateUI()}
  $('continueBattle').onclick=closeBattle;$('teamBtn').onclick=teamMenu;$('bagBtn').onclick=bagMenu;$('mapBtn').onclick=mapMenu;$('questBtn').onclick=questMenu;$('closeMenu').onclick=()=>$('menuOverlay').classList.add('hidden');$('saveBtn').onclick=save;$('helpBtn').onclick=()=>openMenu('How to play',`<div class="menu-details"><p><strong>Explore</strong><br>Move with WASD, arrow keys or the on-screen arrows. Walk through tall grass to discover wild creatures.</p><p><strong>Interact</strong><br>Stand close to a trail challenger and press E. Win their battle to earn a crest.</p><p><strong>Battle</strong><br>Choose quick strike, switch buddies, or use a wild orb on a wild creature. Your progress saves on this device.</p></div>`);$('soundBtn').onclick=()=>toast('The meadow is peaceful and quiet.');$('menuOverlay').addEventListener('click',e=>{if(e.target===$('menuOverlay'))$('menuOverlay').classList.add('hidden')});
  $('battleOverlay').addEventListener('click',e=>{if(e.target===$('battleOverlay')&&battle?.phase==='end')closeBattle()});
  updateUI();render();requestAnimationFrame(loop);
})();