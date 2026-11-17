'use strict';
/* ---------- utilidades ---------- */
const APP_URL=location.protocol.startsWith('http')?location.href.split('#')[0]:'';
const DAYS=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DAYS_LONG=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const INITIALS=['L','M','M','J','V','S','D'];
const COLORS=['#2F9E44','#3C7BE8','#E8743C','#D6336C','#E0A00B','#7A6A80','#8E44D6','#14A38B'];
const LEITNER=[0,1,2,4,8,16];
const DAY_MS=864e5;
const DIF={1:1,2:1.1,3:1.25};
const MODES=[['carro','Carro'],['moto','Moto'],['bus','Bus / transporte público'],['bici','Bicicleta'],['pie','Caminando']];
const MODE_SHORT={carro:'carro',moto:'moto',bus:'bus',bici:'bici',pie:'a pie'};
function defaultCommute(){return {on:false,mode:'carro',min:40,pyp:[],altMode:'bus',altMin:60,margin:15,days:{}}}
const EX_PRESETS={
  gym:{label:'Gym',name:'Gym',dur:60,days:[0,2,4],mode:'auto',when:'noche',start:'18:00',travel:10},
  deporte:{label:'Deporte',name:'Fútbol',dur:90,days:[5],mode:'fixed',when:'manana',start:'09:00',travel:20},
  musica:{label:'Música',name:'Guitarra',dur:45,days:[1,3],mode:'auto',when:'noche',start:'19:00',travel:0},
  otro:{label:'Otro hobby',name:'Hobby',dur:60,days:[5],mode:'auto',when:'tarde',start:'15:00',travel:0}};
const MILESTONES=[[3,'Chispa'],[7,'Fogata'],[14,'Hoguera'],[30,'Volcán'],[60,'Estrella'],[100,'Supernova'],[200,'Galaxia'],[365,'Leyenda']];
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const clone=o=>JSON.parse(JSON.stringify(o));
const pad2=n=>String(n).padStart(2,'0');
const toMin=t=>{const [h,m]=String(t||'0:0').split(':').map(Number);return (h||0)*60+(m||0)};
const fmt=m=>{m=((Math.round(m)%1440)+1440)%1440;return pad2(Math.floor(m/60))+':'+pad2(m%60)};
const todayIdx=()=>(new Date().getDay()+6)%7;
const dateKey=(d=new Date())=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const keyAdd=(k,n)=>{const [y,m,d]=k.split('-').map(Number);return dateKey(new Date(y,m-1,d+n))};
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const hrs=m=>(Math.round(m/60*10)/10).toString().replace('.',',')+' h';
const hnum=h=>(Math.round(h*10)/10).toString().replace('.',',');
const mmss=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return pad2(Math.floor(s/60))+':'+pad2(s%60)};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
function lsGet(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function defaultUntil(){const d=new Date();d.setDate(d.getDate()+70);return dateKey(d)}

/* ---------- datos de ejemplo (tu horario de la captura) ---------- */
function examplePlan(){
  const names=['Física II','Ecuaciones Diferenciales','Ética Ciudadana','Materiales I','Estática','Ingeniería Económica','Diseño Gráfico'];
  const subjects=names.map((n,i)=>({id:'s'+i,name:n,credits:3,classHours:0,difficulty:2,color:COLORS[i],override:null}));
  const f=(day,a,b,i,room)=>({id:uid(),day,start:toMin(a),end:toMin(b),subjectId:'s'+i,label:'',room:room||'',nocount:isLab(room)});
  return {example:true,creditHours:48,weeks:16,wake:'05:00',wakeWeekend:'07:00',bed:'22:00',leisure:1.5,freeDay:6,prefer:'tarde',maxPerDay:6,block:60,
    remind:{mode:'day',streakOn:true,streakAt:'20:30',until:defaultUntil()},
    subjects,fixed:[
      f(1,'06:00','08:00',0,'LL 409'),f(1,'08:00','10:00',0,''),f(2,'09:00','12:00',0,''),
      f(1,'10:00','12:00',1,''),f(3,'10:00','12:00',1,''),
      f(3,'07:00','10:00',2,'CH 213'),
      f(0,'14:00','15:00',3,'IM 120'),f(3,'14:00','16:00',3,'IM 317'),
      f(2,'14:00','16:00',4,'IM 317'),f(4,'14:00','16:00',4,'IM 201'),
      f(0,'16:00','18:00',5,''),f(2,'16:00','18:00',5,''),
      f(0,'18:00','20:00',6,''),f(2,'18:00','20:00',6,'')]};
}
function migratePlan(p){
  if(!p||!Array.isArray(p.subjects))p=examplePlan();
  if(p.creditHours==null){p.creditHours=48;p.weeks=16;delete p.hoursPerCredit}
  if(!p.weeks)p.weeks=16;
  if(!p.wakeWeekend)p.wakeWeekend=p.wake||'07:00';
  if(!p.remind)p.remind={mode:'day',streakOn:true,streakAt:'20:30',until:defaultUntil()};
  if(!p.commute)p.commute=defaultCommute();
  if(!p.extra)p.extra={on:false,items:[]};
  p.subjects.forEach(s=>{if(s.override===undefined)s.override=null});
  (p.fixed=p.fixed||[]).forEach(f=>{if(f.room==null)f.room='';if(f.nocount===undefined)f.nocount=isLab(f.room,f.label)});
  return p;
}
/* Laboratorios (salón "LL …", "Lab", "Laboratorio"): ocupan tu tiempo, pero no se suman
   a las horas de acompañamiento directo de la materia. */
function isLab(room,label){return /^\s*LL\b/i.test(room||'')||/laborator|\blab\b/i.test((room||'')+' '+(label||''))}
function migrateStats(s){
  s=s||{};return Object.assign({days:{},xp:0,parking:[],goal:30,freezes:0,frozen:[],best:0,checked:null,lastAward:null},s);
}
function exampleDeck(){
  const c=(q,a)=>({id:uid(),type:'card',q,a,box:0,due:0});
  const p=(q,hint,solution,answer)=>({id:uid(),type:'problem',q,hint,solution,answer,box:0,due:0});
  return {id:'ejemplo',example:true,name:'Ejemplo · Estática',subjectId:'s4',source:'Mazo de muestra',createdAt:Date.now(),items:[
    c('¿Cuáles son las condiciones de equilibrio de un cuerpo rígido en 2D?','ΣFx = 0, ΣFy = 0 y ΣM = 0 respecto a cualquier punto.'),
    p('Una viga simplemente apoyada de 6 m tiene una carga puntual de 12 kN a 2 m del apoyo A. Calcula las reacciones en A y B.','Toma momentos respecto a A para despejar B primero.','1) ΣMA = 0: B·6 − 12·2 = 0 → B = 4 kN\n2) ΣFy = 0: A + B − 12 = 0\n3) A = 12 − 4 = 8 kN','A = 8 kN, B = 4 kN'),
    c('¿Qué es un elemento de dos fuerzas?','Un elemento con fuerzas aplicadas solo en dos puntos y sin momentos: las dos fuerzas son iguales, opuestas y colineales con la línea que une esos puntos.'),
    c('Momento de una fuerza respecto a un punto','M = r × F. En 2D: M = F·d, con d la distancia perpendicular desde el punto a la línea de acción.'),
    p('Una fuerza de 50 N actúa a 30° sobre la horizontal en el extremo de una barra horizontal de 2 m. ¿Qué momento produce respecto al otro extremo?','Solo la componente perpendicular a la barra produce momento.','1) Componente vertical: 50·sen 30° = 25 N\n2) M = 25 N · 2 m = 50 N·m\n3) La componente horizontal pasa por el eje de la barra: no genera momento','50 N·m'),
    c('Método de nodos en armaduras: ¿por dónde empiezas?','Por un nodo con máximo dos incógnitas, normalmente un apoyo, después de hallar las reacciones con el equilibrio de toda la armadura.'),
    {id:uid(),type:'cloze',q:'En un apoyo de _____ la reacción es perpendicular a la superficie de apoyo.',a:'rodillo',full:'En un apoyo de rodillo la reacción es perpendicular a la superficie de apoyo.',options:['empotramiento','rodillo','pasador','articulación']},
    {id:uid(),type:'problem',tpl:ReelsEngine.parseTemplate('Una viga simplemente apoyada de {L:4-8} m tiene una carga puntual de {P:5-20} kN en el centro. ¿Cuál es el momento flector máximo?\n= P*L/4\nunidad: kN·m\npista: En el centro de la viga, M = P·L/4.').tpl}]};
}

/* ---------- estado ---------- */
const S={
  plan:migratePlan(lsGet('cf.plan',null)),
  stats:migrateStats(lsGet('cf.stats',null)),
  decks:lsGet('cf.decks',{}),
  tab:lsGet('cf.tab','hoy'),
  filter:'all',sched:null,draft:null
};
let F=lsGet('cf.session',null)||{phase:'setup'};
let isReady=false;

/* ---------- guardado local ----------
   Todo vive en este dispositivo (almacenamiento del navegador). No hay cuenta ni servidor:
   para pasar tus datos a otro dispositivo, exporta una copia desde el panel de datos. */
function save(n){
  const ok=n==='plan'?lsSet('cf.plan',S.plan):n==='stats'?lsSet('cf.stats',S.stats):lsSet('cf.decks',S.decks);
  setSync(ok?'ok':'error');
}
function setSync(s){const el=$('#sync');if(!el)return;el.dataset.s=s;el.firstChild.textContent=s==='error'?'Sin espacio para guardar':'Guardado en este dispositivo'}
function ready(){if(isReady)return;isReady=true;reconcile();render()}
/* otra ventana de la app guardó cambios: los traemos */
window.addEventListener('storage',e=>{
  if(!e.key||!e.key.startsWith('cf.'))return;
  if(e.key==='cf.plan')S.plan=migratePlan(lsGet('cf.plan',null));
  else if(e.key==='cf.stats')S.stats=migrateStats(lsGet('cf.stats',null));
  else if(e.key==='cf.decks')S.decks=lsGet('cf.decks',{});
  else return;
  onDataChanged();
});
function onDataChanged(){
  S.sched=buildSchedule(S.plan);
  const ae=document.activeElement;
  const typing=ae&&/INPUT|SELECT|TEXTAREA/.test(ae.tagName);
  renderChrome();
  if(S.tab==='horario'){if(typing&&ae.closest('#v-horario'))renderWeek();else renderHorario()}
  else if(S.tab==='reels'){renderReelsSide();maybeRebuildFeed()}
  else if(S.tab==='hoy'){if(!(typing&&ae.closest('#v-hoy')))renderHoy()}
  else render();
}

/* ---------- horas por crédito y horario ---------- */
function subj(id){return S.plan.subjects.find(s=>s.id===id)}
function subjName(id){const s=subj(id);return s?s.name:'Materia'}
function subjColor(id){const s=subj(id);return s?s.color:'#9A7C8C'}
function classMin(p,sid){return p.fixed.filter(f=>f.subjectId===sid&&!f.nocount).reduce((a,f)=>a+Math.max(0,f.end-f.start),0)}
function classH(p,s){const m=classMin(p,s.id);return m?m/60:(+s.classHours||0)}
function weekTotal(p,s){return (+s.credits||0)*(p.creditHours||48)/(p.weeks||16)}
function minIndep(p,s){return Math.max(0,weekTotal(p,s)-classH(p,s))}
function autoStudy(p,s){return Math.round(minIndep(p,s)*(DIF[s.difficulty]||1)*2)/2}
function studyH(p,s){return s.override!=null?s.override:autoStudy(p,s)}
/* Materia a concentrar: horas extra encima del plan, hasta la fecha que pongas (por ejemplo, el parcial) */
function activeConc(p){const t=dateKey();return (p.concentrate||[]).filter(c=>p.subjects.some(s=>s.id===c.subjectId)&&(!c.until||c.until>=t))}
function extraH(p,s){const c=activeConc(p).find(x=>x.subjectId===s.id);return c?(+c.extra||0):0}
function planH(p,s){return studyH(p,s)+extraH(p,s)}

function buildSchedule(p){
  const wakeOf=d=>toMin(d>=5?p.wakeWeekend:p.wake);
  const minWake=Math.min(toMin(p.wake),toMin(p.wakeWeekend));
  let bed=toMin(p.bed);if(bed<=minWake)bed+=1440;
  const blocks=[];const busy=[[],[],[],[],[],[],[]];
  const put=(d,s,e,kind,x,lo)=>{s=Math.max(s,lo==null?wakeOf(d):lo);e=Math.min(e,bed);if(e-s<15)return null;const b=Object.assign({day:d,start:s,end:e,kind},x||{});blocks.push(b);busy[d].push(b);return b};
  const freeParts=(d,s,e)=>{let parts=[[s,e]];for(const b of busy[d]){const nx=[];for(const [a,z] of parts){if(b.end<=a||b.start>=z){nx.push([a,z]);continue}if(b.start>a)nx.push([a,b.start]);if(b.end<z)nx.push([b.end,z])}parts=nx}return parts};
  const putFree=(d,s,e,kind,x,lo)=>{for(const [a,z] of freeParts(d,s,e))put(d,a,z,kind,x,lo)};
  for(const f of p.fixed)put(f.day,f.start,f.end,'fixed',{subjectId:f.subjectId||null,label:f.label||'',room:f.room||'',nocount:!!f.nocount},0);
  /* Transporte (opcional): ida antes de la primera clase del día y regreso después de la última.
     Los días de pico y placa (si vas en carro o moto) usa el otro medio y su tiempo. */
  const commuteInfo=[];const cm=p.commute;
  if(cm&&cm.on){
    for(let d=0;d<7;d++){
      const cls=p.fixed.filter(f=>f.day===d&&f.subjectId);if(!cls.length)continue;
      const first=Math.min(...cls.map(f=>f.start)),last=Math.max(...cls.map(f=>f.end));
      const pyp=(cm.pyp||[]).includes(d)&&(cm.mode==='carro'||cm.mode==='moto');
      const mode=pyp?cm.altMode:cm.mode,min=Math.max(5,+(pyp?cm.altMin:cm.min)||0);
      const ov=(cm.days||{})[d]||{};
      const leave=ov.leave?toMin(ov.leave):first-(+cm.margin||0)-min;
      const back=ov.back?toMin(ov.back):last;
      put(d,leave,leave+min,'commute',{label:'Ida a la U · '+MODE_SHORT[mode],mode,pyp},0);
      put(d,back,back+min,'commute',{label:'Regreso a casa · '+MODE_SHORT[mode],mode,pyp},0);
      commuteInfo.push({d,mode,min,leave,back,arrive:leave+min,home:back+min,first,last,pyp,ovLeave:!!ov.leave,ovBack:!!ov.back});
    }
  }
  /* Actividades extracurriculares (opcional): gym, deporte, hobbies. A una hora fija, o el plan
     les busca un hueco en la franja preferida. El camino de ida y vuelta se suma al bloque. */
  const actInfo=[];const ex=p.extra;
  const freeSlot=(d,len,lo,hi)=>{for(let t=Math.ceil(lo/15)*15;t+len<=hi;t+=15){const e=t+len;if(busy[d].every(b=>{const pad=(b.kind==='fixed'||b.kind==='commute'||b.kind==='activity')?15:0;return e+pad<=b.start||t>=b.end+pad}))return t}return null};
  if(ex&&ex.on){
    for(const a of ex.items||[]){
      const dur=Math.max(15,+a.dur||60),tr=Math.max(0,+a.travel||0),len=dur+2*tr;
      for(const d of (a.days||[]).slice().sort()){
        let s;
        if(a.mode!=='auto')s=toMin(a.start||'18:00')-tr;
        else{const w={manana:[wakeOf(d)+30,12*60],tarde:[13*60+30,19*60],noche:[19*60,bed-45]}[a.when]||[13*60+30,19*60];
          s=freeSlot(d,len,w[0],w[1]);
          if(s==null){/* no cupo en la franja: el hueco libre más cercano a ella */
            const c=(w[0]+w[1])/2;let best=null;
            for(let t=Math.ceil((wakeOf(d)+30)/15)*15;t+len<=bed-45;t+=15){if(freeSlot(d,len,t,t+len)===t&&(best==null||Math.abs(t+len/2-c)<Math.abs(best+len/2-c)))best=t}
            s=best}}
        if(s==null){actInfo.push({id:a.id,d,miss:true});continue}
        const clash=busy[d].find(b=>(b.kind==='fixed'||b.kind==='commute')&&b.start<s+len&&b.end>s);
        put(d,s,s+len,'activity',{label:a.name||'Actividad',actId:a.id,travel:tr},0);
        actInfo.push({id:a.id,d,start:s+tr,end:s+tr+dur,clash:clash?blockName(clash):null});
      }
    }
  }
  /* comidas: si la franja normal está ocupada (clase o transporte), busca 30 min libres en una franja más amplia */
  const meal=(d,s,e,label,lo2,hi2)=>{const parts=freeParts(d,s,e);if(parts.some(([a,z])=>z-a>=30)){for(const [a,z] of parts)put(d,a,z,'meal',{label});return}
    const alt=freeParts(d,lo2,hi2).find(([a,z])=>z-a>=30);if(alt)put(d,alt[0],alt[0]+30,'meal',{label});else for(const [a,z] of parts)put(d,a,z,'meal',{label})};
  const L=Math.round((p.leisure||0)*60);
  for(let d=0;d<7;d++){
    if(wakeOf(d)>minWake)putFree(d,minWake,wakeOf(d),'sleep',{label:'Dormir'},minWake);
    putFree(d,bed-30,bed,'wind',{label:'Desconexión sin pantallas'});
    meal(d,12*60+30,13*60+30,'Almuerzo',11*60+30,15*60);
    meal(d,19*60+30,20*60+15,'Cena',20*60+15,bed-30);
    if(L>0)putFree(d,bed-30-L,bed-30,'leisure',{label:'Ocio'});
    if(d===p.freeDay)putFree(d,14*60,bed-30-L,'leisure',{label:'Tarde libre'});
  }
  /* Estudio independiente.
     Modo enfocado: cada día se centra en 1–2 materias, en sesiones de hasta 3 h seguidas
     (bloques con 15 min de pausa), y cada materia prefiere los días en que NO tienes esa clase,
     repartidos en la semana para repasar entre clases. Modo variado: bloques sueltos mezclados. */
  const B=p.block||60;
  const focus=p.style!=='mix';
  const maxCh=focus?Math.max(1,Math.floor(180/B)):1;
  const classDays={};for(const f of p.fixed)if(f.subjectId)(classDays[f.subjectId]||(classDays[f.subjectId]=new Set())).add(f.day);
  const queues=p.subjects.map(s=>{const need=Math.round(planH(p,s)*60);const conc=extraH(p,s)>0;const chunks=[];let left=need;while(left>=B){chunks.push(B);left-=B}if(left>=30)chunks.push(left);else if(left>0&&chunks.length)chunks[chunks.length-1]+=left;
    const k=Math.ceil(chunks.length/maxCh);const runs=Array.from({length:k},()=>[]);chunks.forEach((c,i)=>runs[i%k].push(c));
    return {s,need,runs,placed:0,conc}}).sort((a,b)=>(b.conc-a.conc)||b.need-a.need);
  const order=[];let more=true;
  for(let i=0;more;i++){more=false;for(const q of queues){if(q.runs[i]){order.push([q,q.runs[i]]);more=true}}}
  const byDay=[0,0,0,0,0,0,0];const onDay=[0,1,2,3,4,5,6].map(()=>new Set());
  const cap=(p.maxPerDay||5)*60;
  const slot=(d,len)=>{
    const lo=wakeOf(d)+30,hi=bed-30-len;if(hi<lo)return null;
    const pref={manana:lo,tarde:14*60,noche:18*60}[p.prefer]||14*60;
    const st=Math.max(lo,Math.min(pref,hi));const starts=[];
    for(let t=st;t<=hi;t+=15)starts.push(t);for(let t=st-15;t>=lo;t-=15)starts.push(t);
    for(const t of starts){const e=t+len;if(busy[d].every(b=>{const pad=(b.kind==='study'||b.kind==='fixed'||b.kind==='commute'||b.kind==='activity')?15:0;return e+pad<=b.start||t>=b.end+pad}))return t}
    return null};
  const score=(q,d)=>{
    const id=q.s.id;const others=[...onDay[d]].filter(x=>x!==id).length;
    let sc=byDay[d]*0.4+(d===6?60:0)+(d===p.freeDay?150:0)+d*0.1;
    if(focus){
      if(classDays[id]&&classDays[id].has(d))sc+=400;
      if(onDay[d].has(id))sc+=300;
      sc+=[0,40,260][others]??800;
      if(onDay[(d+6)%7].has(id)||onDay[(d+1)%7].has(id))sc+=40;
    }else if(onDay[d].has(id))sc+=240;
    return sc};
  const placeRun=(q,d,run)=>{
    const total=run.reduce((a,b)=>a+b,0);if(byDay[d]+total>cap)return false;
    const t=slot(d,total+15*(run.length-1));if(t==null)return false;
    let x=t;for(const len of run){put(d,x,x+len,'study',{subjectId:q.s.id});x+=len+15}
    byDay[d]+=total;onDay[d].add(q.s.id);q.placed+=total;return true};
  const bestDays=q=>[0,1,2,3,4,5,6].sort((a,b)=>score(q,a)-score(q,b));
  let unplaced=0;
  for(const [q,run] of order){
    if(bestDays(q).some(d=>placeRun(q,d,run)))continue;
    for(const len of run)if(!bestDays(q).some(d=>placeRun(q,d,[len])))unplaced+=len;
  }
  for(const b of busy)b.sort((a,c)=>a.start-c.start);
  const earlyClass=p.fixed.filter(f=>f.start<wakeOf(f.day)).sort((a,b)=>a.start-b.start)[0]||null;
  const g0=Math.max(0,Math.min(minWake,...blocks.filter(b=>b.kind!=='sleep').map(b=>b.start)));
  /* sueño de cada noche: desde la hora de dormir del día d hasta despertar al día siguiente */
  const sleepNight=[0,1,2,3,4,5,6].map(d=>(wakeOf((d+1)%7)+1440-bed)/60);
  return {blocks,busy,g0,bed,byDay,queues,unplaced,onDay:onDay.map(s=>[...s]),earlyClass,sleepNight,wakeOf,commuteInfo,actInfo,sleepWeek:(1440-(bed-toMin(p.wake)))/60,sleepWkd:(1440-(bed-toMin(p.wakeWeekend)))/60};
}
function dayBlocks(d){return (S.sched.busy[d]||[]).filter(b=>b.kind!=='sleep')}
function blockName(b){
  if(b.kind==='study')return 'Estudio · '+subjName(b.subjectId);
  if(b.kind==='fixed')return b.subjectId?(b.nocount?'Laboratorio · ':'Clase · ')+subjName(b.subjectId)+(b.room?' · '+b.room:''):(b.label||'Compromiso');
  return b.label;
}
function blockColor(b){if(b.subjectId)return subjColor(b.subjectId);if(b.kind==='leisure')return 'var(--hl)';if(b.kind==='commute')return 'var(--ice)';if(b.kind==='activity')return 'var(--good)';return 'var(--ink-3)'}

/* ---------- estadísticas y racha ---------- */
function dayStat(k){return S.stats.days[k]||(S.stats.days[k]={min:0,sessions:0,urges:0,leaves:0,cards:0})}
function peekDay(k){return S.stats.days[k]||{min:0,sessions:0,urges:0,leaves:0,cards:0}}
function pruneStats(){const keys=Object.keys(S.stats.days).sort();while(keys.length>150)delete S.stats.days[keys.shift()]}
function goal(){return S.stats.goal||30}
function dayProg(k){const d=peekDay(k);return d.min+Math.floor((d.cards||0)/2)}
function isMet(k){const d=S.stats.days[k];return !!(d&&(d.met||dayProg(k)>=goal()))}
function isFrozen(k){return (S.stats.frozen||[]).includes(k)}
function streakFrom(k){let n=0,g=0;while((isMet(k)||isFrozen(k))&&g++<2000){if(isMet(k))n++;k=keyAdd(k,-1)}return n}
function streakNow(){const t=dateKey();return isMet(t)?streakFrom(t):streakFrom(keyAdd(t,-1))}
function reconcile(){
  const st=S.stats;const y=keyAdd(dateKey(),-1);
  if(st.checked===y)return;
  let k=st.checked?keyAdd(st.checked,1):y;if(k<keyAdd(y,-60))k=keyAdd(y,-60);
  let used=0,g=0;
  while(k<=y&&g++<80){
    if(!isMet(k)&&!isFrozen(k)&&streakFrom(keyAdd(k,-1))>0&&(st.freezes||0)>0){st.freezes--;st.frozen.push(k);used++}
    k=keyAdd(k,1);
  }
  st.frozen=(st.frozen||[]).slice(-60);st.checked=y;save('stats');
  if(used)setTimeout(()=>toast(used===1?'Un protector salvó tu racha: ayer no estudiaste.':`Tus protectores salvaron tu racha (${used} días sin estudiar).`),600);
}
function markProgress(){
  const k=dateKey();const d=dayStat(k);
  if(d.met||dayProg(k)<goal())return;
  d.met=true;const st=S.stats;const n=streakFrom(k);
  st.best=Math.max(st.best||0,n);addXp(15);
  let extra='';
  if(n%7===0&&st.lastAward!==k&&(st.freezes||0)<2){st.freezes=(st.freezes||0)+1;st.lastAward=k;extra='Ganaste un protector de racha por cumplir 7 días seguidos.'}
  setTimeout(()=>celebrate(n,extra),400);
}
function weekKeys(){const d=new Date();d.setDate(d.getDate()-todayIdx());const out=[];for(let i=0;i<7;i++){out.push(dateKey(d));d.setDate(d.getDate()+1)}return out}
function level(){const xp=S.stats.xp||0;const lv=Math.floor(Math.sqrt(xp/60))+1;const cur=60*(lv-1)**2,nxt=60*lv**2;return {lv,xp,pct:(xp-cur)/(nxt-cur)}}
function addXp(n){S.stats.xp=(S.stats.xp||0)+n}
function flameSvg(n,lit){const t=lit?(n>=100?4:n>=30?3:n>=7?2:1):0;
  return `<svg class="flame ${lit?'lit':''}" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3C36 14 50 20 50 38A18 18 0 0 1 14 38C14 28 19 22 23 17C24 23 27 27 30 28C28 19 29 10 32 3Z" fill="url(#fl${t})"/><path d="M32 30C35 35 41 38 41 45A9 9 0 0 1 23 45C23 40 27 37 29 34C30 37 31 38 32 38C31 35 31 33 32 30Z" fill="${lit?'#FFE7A3':'rgba(255,255,255,.6)'}"/></svg>`}
const SHIELD=(on)=>`<svg class="shield ${on?'':'off'}" viewBox="0 0 24 26" aria-hidden="true"><path d="M12 1l10 4v7c0 6.5-4.3 11.2-10 13C6.3 23.2 2 18.5 2 12V5z" fill="currentColor"/></svg>`;
const CHECK='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const X='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

/* ---------- toast y celebración ---------- */
let toastT=null;
function toast(msg,action){
  const t=$('#toast');t.hidden=false;
  t.innerHTML=`<span>${esc(msg)}</span>${action?`<button class="btn sm hl" id="toast-act">${esc(action.label)}</button>`:''}<button class="iconbtn" id="toast-x" aria-label="Cerrar" style="color:inherit">${X}</button>`;
  $('#toast-x').onclick=()=>{t.hidden=true};
  if(action)$('#toast-act').onclick=()=>{t.hidden=true;action.fn()};
  clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true},action?15000:6000);
}
function celebrate(n,extra){
  const m=MILESTONES.find(x=>x[0]===n);
  const o=$('#overlay');o.hidden=false;o.className='overlay';
  o.innerHTML=`<div class="overlay-in celebrate">${flameSvg(n,true)}<div class="big-n">${n}</div>
    <h2>${n===1?'¡Empezaste una racha!':`¡${n} días seguidos estudiando!`}</h2>
    <p class="muted">${m?`Desbloqueaste <b>${m[1]}</b>. `:''}Cumpliste tu meta de ${goal()} min de hoy.${extra?' '+esc(extra):''}</p>
    <button class="btn primary big" id="cel-ok">Seguir así</button></div>`;
  $('#cel-ok').onclick=()=>{o.hidden=true;o.innerHTML=''};
  beep(660,.08);setTimeout(()=>beep(880,.08),120);setTimeout(()=>beep(1175,.16),240);
  confetti();renderChrome();
}
function confetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const c=document.createElement('canvas');c.id='confetti';document.body.appendChild(c);
  const dpr=Math.min(2,window.devicePixelRatio||1);c.width=innerWidth*dpr;c.height=innerHeight*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);
  const cols=['#FF8A3D','#E23D6A','#FFC23D','#8E2A86','#FF5C9A','#42CF97'];
  const ps=Array.from({length:140},()=>({x:innerWidth/2,y:innerHeight*.42,vx:(Math.random()-.5)*13,vy:-Math.random()*13-4,s:Math.random()*7+4,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[Math.floor(Math.random()*cols.length)]}));
  const t0=performance.now();
  (function f(t){const k=(t-t0)/2200;x.clearRect(0,0,innerWidth,innerHeight);
    for(const p of ps){p.vy+=.35;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.globalAlpha=Math.max(0,1-k);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore()}
    if(k<1)requestAnimationFrame(f);else c.remove()})(t0);
}

/* ---------- navegación ---------- */
function renderChrome(){const n=streakNow();const lit=isMet(dateKey());$('#schip').innerHTML=flameSvg(n,lit)+`<span class="num">${n}</span>`;$('#schip').title=`Racha de ${n} días`}
function setTab(t){
  S.tab=t;lsSet('cf.tab',t);
  $$('.tab').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));
  $$('[data-view]').forEach(v=>v.hidden=v.dataset.view!==t);
  render();window.scrollTo(0,0);
}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(b)setTab(b.dataset.tab)});
$('#schip').addEventListener('click',()=>setTab('hoy'));
function render(){renderChrome();({hoy:renderHoy,horario:renderHorario,enfoque:renderEnfoque,reels:renderReels})[S.tab]()}
function goReminders(){goSection('recordatorios')}

/* ---------- HOY ---------- */
function streakCard(){
  const n=streakNow();const k=dateKey();const lit=isMet(k);const prog=dayProg(k);const g=goal();
  const wk=weekKeys();const ti=todayIdx();
  const next=MILESTONES.find(m=>m[0]>n);
  const dots=wk.map((key,i)=>{let cls='',inner=INITIALS[i];
    if(isMet(key)){cls='met';inner=CHECK}else if(isFrozen(key)){cls='frozen';inner=SHIELD(true)}else if(i<ti)cls='missed';
    if(i===ti)cls+=' today';return `<div class="wdot ${cls}"><i>${inner}</i>${DAYS[i]}</div>`}).join('');
  const fr=S.stats.freezes||0;
  return `<div class="card streak">
    <div class="streak-top">${flameSvg(n,lit)}<div><div class="streak-n num">${n}</div><div class="small muted">${n===1?'día':'días'} de racha · récord ${Math.max(S.stats.best||0,n)}</div></div></div>
    <div><div class="row between small"><b>${lit?'Meta de hoy cumplida':`Te faltan ${Math.max(0,g-prog)} min para mantener la racha`}</b><span class="num muted">${Math.min(prog,g)}/${g}</span></div><div class="bar" style="margin-top:6px"><i style="width:${Math.min(100,Math.round(prog/g*100))}%"></i></div></div>
    <div class="wdots">${dots}</div>
    <div class="row between"><span class="row small" style="gap:6px" title="Si un día no estudias, un protector salva tu racha. Ganas uno cada 7 días seguidos (máximo 2).">Protectores <span class="shields">${SHIELD(fr>0)}${SHIELD(fr>1)}</span></span>
      <label class="row small" style="gap:6px">Meta diaria <select id="goal-sel" style="width:auto;padding:4px 8px">${[15,30,45,60,90,120].map(m=>`<option value="${m}" ${g===m?'selected':''}>${m} min</option>`).join('')}</select></label></div>
    <div class="miles">${MILESTONES.slice(0,6).map(m=>`<span class="mile ${Math.max(S.stats.best||0,n)>=m[0]?'got':''}">${m[1]} · ${m[0]}</span>`).join('')}</div>
    <p class="small muted">${next?`Faltan ${next[0]-n} días para <b>${next[1]}</b>.`:'Eres leyenda.'} Estudiar con temporizador o repasar reels cuenta. <a href="#" data-go-rem>Recibe avisos en tu celular</a>.</p>
  </div>`;
}
function concStrip(){
  const conc=activeConc(S.plan);if(!conc.length)return '';
  const info=conc.map(c=>{const bits=['+'+hnum(c.extra)+' h a la semana'];
    if(c.until){const d=daysUntil(c.until);bits.push(d===0?'el parcial es hoy':d===1?'parcial mañana':'parcial en '+d+' días')}
    if(c.note)bits.push(esc(c.note));return (conc.length>1?esc(subjName(c.subjectId))+': ':'')+bits.join(' · ')}).join(' — ');
  return `<button class="rescue" data-go-conc>${flameSvg(30,true)}<span><b>Materia a concentrar: ${conc.map(c=>esc(subjName(c.subjectId))).join(' y ')}</b><span class="small muted" style="display:block">${info}</span></span></button>`;
}
function renderHoy(){
  const v=$('#v-hoy');const d=todayIdx();const blocks=dayBlocks(d);const n=nowMin();
  const cur=blocks.find(b=>b.start<=n&&n<b.end);const next=blocks.find(b=>b.start>n);
  const st=peekDay(dateKey());const planned=blocks.filter(b=>b.kind==='study').reduce((a,b)=>a+b.end-b.start,0);
  const wk=weekKeys();const wkUrges=wk.reduce((a,k)=>a+peekDay(k).urges,0);const lv=level();
  const date=new Date().toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'});
  let nowHtml;
  if(F.phase==='run'||F.phase==='pause'){
    nowHtml=`<span class="label">Sesión en curso</span><h2>${esc(F.subjectId?subjName(F.subjectId):'Sesión libre')}: <span class="mark">${esc(F.task)}</span></h2><div class="row"><button class="btn hl big" data-go="enfoque">Volver al temporizador</button></div>`;
  }else if(cur&&cur.kind==='study'){
    const left=cur.end-n;const full=Math.min(90,Math.max(25,left));
    nowHtml=`<span class="label">Ahora mismo · hasta las ${fmt(cur.end)}</span><h2>Te toca <span class="mark">${esc(subjName(cur.subjectId))}</span>. Quedan ${left} min de este bloque.</h2>
    <p>Si no tienes ganas, empieza solo 2 minutos. Lo difícil es arrancar.</p>
    <div class="row"><button class="btn hl big" data-start="2" data-subj="${cur.subjectId}">Empezar 2 minutos</button><button class="btn ghost big" data-start="${full}" data-subj="${cur.subjectId}">Bloque completo (${full} min)</button></div>`;
  }else if(cur&&cur.kind==='commute'){
    const bus=cur.mode==='bus';
    nowHtml=`<span class="label">En camino · hasta las ${fmt(cur.end)}</span><h2>${esc(cur.label)}</h2>
    <p>${bus?'Vas en bus: buen momento para repasar tarjetas en Reels en vez de ver videos.':cur.mode==='pie'?'Vas caminando: repasa de memoria lo último que viste en clase.':'Vas manejando: ojos en la vía. Repasas cuando llegues.'}</p>
    ${bus?'<div class="row"><button class="btn hl big" data-go="reels">Abrir Reels de estudio</button></div>':''}`;
  }else if(cur&&cur.kind==='activity'){
    nowHtml=`<span class="label">Ahora mismo · hasta las ${fmt(cur.end)}</span><h2>Hora de <span class="mark">${esc(cur.label)}</span>.</h2><p>Este tiempo también es tuyo: moverte o hacer lo que te gusta te ayuda a concentrarte mejor después.</p>`;
  }else if(cur&&cur.kind==='leisure'){
    nowHtml=`<span class="label">Ahora mismo · hasta las ${fmt(cur.end)}</span><h2>${esc(cur.label)}. Disfrútalo sin culpa, te lo ganaste.</h2><p>Cuando termine, cierra la app de videos y vuelve aquí.</p>`;
  }else if(cur){
    nowHtml=`<span class="label">Ahora mismo · hasta las ${fmt(cur.end)}</span><h2>${esc(blockName(cur))}</h2>${next?`<p>Después: ${esc(blockName(next))} a las ${fmt(next.start)}</p>`:''}`;
  }else{
    nowHtml=`<span class="label">${next?'Siguiente a las '+fmt(next.start):'Día terminado'}</span><h2>${next?esc(blockName(next)):'No quedan bloques hoy. Descansa bien.'}</h2><div class="row"><button class="btn hl" data-go="enfoque">Sesión libre de enfoque</button></div>`;
  }
  const pct=planned?Math.min(100,Math.round(st.min/planned*100)):0;
  v.innerHTML=`
  <div><span class="label" style="text-transform:capitalize">${esc(date)}</span><h1>¿Qué vas a <span class="mark">lograr</span> hoy?</h1></div>
  ${S.plan.example?`<div class="note">Estás viendo un horario de ejemplo, con 3 créditos por materia. Ve a <b>Horario</b> para importar el tuyo o poner tus materias y créditos reales.</div>`:''}
  <div class="hero"><div class="now">${nowHtml}</div>${streakCard()}</div>
  ${concStrip()}
  <div class="metrics">
    <div class="card metric"><span class="label">Estudiado hoy</span><b>${st.min}<small class="muted" style="font-size:.9rem"> / ${planned} min</small></b><div class="bar"><i style="width:${pct}%"></i></div></div>
    <div class="card metric"><span class="label">Tarjetas repasadas</span><b>${st.cards||0}</b><span class="small muted">Hoy, en Reels</span></div>
    <div class="card metric"><span class="label">Tentaciones vencidas</span><b>${wkUrges}</b><span class="small muted">Esta semana</span></div>
    <div class="card metric"><span class="label">Nivel ${lv.lv}</span><b>${lv.xp} XP</b><div class="bar"><i style="width:${Math.round(lv.pct*100)}%;background:var(--hl)"></i></div></div>
  </div>
  <div class="two">
    <div class="card"><div class="row between"><h2>Agenda de hoy</h2><span class="small muted">${S.sched.onDay[d].length?'Hoy estudias: <b>'+S.sched.onDay[d].map(id=>esc(subjName(id))).join(' y ')+'</b>':DAYS_LONG[d]}</span></div>
      <div class="agenda">${blocks.map(b=>`<div class="ag ${b===cur?'cur':''} ${b.end<=n?'past':''}"><span class="t">${fmt(b.start)}–${fmt(b.end)}</span><span class="n"><i class="dot" style="background:${blockColor(b)}"></i>${esc(blockName(b))}</span>${b.kind==='study'&&b.end>n?`<button class="btn sm" data-start="${Math.min(90,b.end-b.start)}" data-subj="${b.subjectId}">Empezar</button>`:'<span></span>'}</div>`).join('')||'<p class="muted">Sin bloques. Configura tu horario.</p>'}
        <div class="ag"><span class="t">${fmt(S.sched.bed)}–${fmt(S.sched.wakeOf((d+1)%7))}</span><span class="n"><i class="dot" style="background:var(--ice)"></i>Dormir · ${hnum(S.sched.sleepNight[d])} h</span><span></span></div></div>
    </div>
    <div class="view" style="gap:18px">
      <div class="card"><h2>Tu semana</h2><p class="small muted">Barra llena: minutos de foco. Contorno: lo planeado.</p>${weekChart()}</div>
      <div class="card parking"><h2>Pendientes de tu mente</h2><p class="small muted">Lo que anotaste para no distraerte durante una sesión.</p>
        <ul>${(S.stats.parking||[]).map((p,i)=>`<li><span>${esc(p.text)}</span><button class="iconbtn" data-unpark="${i}" aria-label="Quitar">${X}</button></li>`).join('')||'<li class="muted">Vacío. Bien.</li>'}</ul></div>
    </div>
  </div>`;
}
function weekChart(){
  const keys=weekKeys();const done=keys.map(k=>peekDay(k).min);const plan=S.sched.byDay;const t=todayIdx();
  const max=Math.max(60,...done,...plan);const W=700,H=190,top=16,bot=34,bw=54,gap=(W-40-7*bw)/6;
  const y=v=>top+(H-top-bot)*(1-v/max);
  let s='';
  for(const g of [0.5,1]){const yy=y(max*g);s+=`<line x1="30" x2="${W}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="0" y="${yy+4}" font-size="11" fill="var(--ink-3)" font-family="JetBrains Mono,monospace">${hnum(max*g/60)}h</text>`}
  keys.forEach((k,i)=>{const x=40+i*(bw+gap);
    s+=`<rect x="${x}" y="${y(plan[i])}" width="${bw}" height="${H-bot-y(plan[i])}" rx="7" fill="none" stroke="var(--ink-3)" stroke-dasharray="4 3"/>`;
    s+=`<rect x="${x+6}" y="${y(done[i])}" width="${bw-12}" height="${Math.max(0,H-bot-y(done[i]))}" rx="5" fill="${i===t?'url(#gSun)':'color-mix(in srgb,var(--accent) 50%,var(--surface))'}"/>`;
    s+=`<text x="${x+bw/2}" y="${H-12}" text-anchor="middle" font-size="12" font-weight="${i===t?800:500}" fill="${i===t?'var(--accent)':'var(--ink-2)'}">${DAYS[i]}</text>`});
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Minutos de estudio por día">${s}</svg>`;
}
$('#v-hoy').addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(g)return setTab(g.dataset.go);
  if(e.target.closest('[data-go-rem]')){e.preventDefault();return goReminders()}
  if(e.target.closest('[data-go-conc]'))return goSection('concentrar');
  const s=e.target.closest('[data-start]');if(s){startPreset(s.dataset.subj,+s.dataset.start);return}
  const u=e.target.closest('[data-unpark]');if(u){S.stats.parking.splice(+u.dataset.unpark,1);save('stats');renderHoy()}
});
$('#v-hoy').addEventListener('change',e=>{if(e.target.id==='goal-sel'){S.stats.goal=+e.target.value;markProgress();save('stats');renderHoy();renderChrome()}});
function startPreset(subjectId,dur){F={phase:'setup',subjectId,dur,task:'',checks:{}};persistF();setTab('enfoque');setTimeout(()=>{const i=$('#f-task');if(i)i.focus()},50)}

/* ---------- HORARIO ---------- */
let importFiles=[];
function renderHorario(){
  const p=S.plan;const v=$('#v-horario');
  const subjOpts=sel=>p.subjects.map(s=>`<option value="sub:${s.id}" ${sel==='sub:'+s.id?'selected':''}>${esc(s.name)}</option>`).join('')+['Trabajo','Transporte','Deporte','Otro'].map(l=>`<option value="lbl:${l}" ${sel==='lbl:'+l?'selected':''}>${l}</option>`).join('');
  const totalCr=p.subjects.reduce((a,s)=>a+(+s.credits||0),0);
  v.innerHTML=`
  <div class="row between" style="align-items:end"><div><span class="label">Semestre</span><h1>Tu plan <span class="mark">semanal</span></h1></div>
  <div class="row"><button class="btn" id="clear-ex">Empezar desde cero</button><button class="btn ghost" id="reset-ex">Cargar ejemplo</button></div></div>
  <div class="card import" id="import-card"></div>
  <div class="plan-grid">
    <div class="card">
      <div class="row between"><h2>Materias</h2><span class="small muted num">${totalCr} créditos</span></div>
      <div class="list">
        <div class="subj-row subj-head"><span></span><span>Nombre</span><span>Créd.</span><span>Directo h/sem</span><span class="dif">Dificultad</span><span></span></div>
        ${p.subjects.map(s=>{const cm=classMin(p,s.id);return `<div class="subj-row" data-sid="${s.id}"><i class="dot" style="background:${s.color}"></i>
          <input type="text" id="sn-${s.id}" data-f="name" value="${esc(s.name)}" aria-label="Nombre">
          <input type="number" id="sc-${s.id}" data-f="credits" min="0" max="12" value="${s.credits}" inputmode="numeric" aria-label="Créditos">
          ${cm?`<span class="calc" title="Calculado con tus clases del horario">${hnum(cm/60)} h</span>`:`<input type="number" id="sh-${s.id}" data-f="classHours" min="0" max="30" step="0.5" value="${s.classHours||0}" inputmode="decimal" aria-label="Horas de acompañamiento directo por semana">`}
          <select class="dif" id="sd-${s.id}" data-f="difficulty" aria-label="Dificultad"><option value="1" ${s.difficulty==1?'selected':''}>Fácil</option><option value="2" ${s.difficulty==2?'selected':''}>Media</option><option value="3" ${s.difficulty==3?'selected':''}>Difícil</option></select>
          <button class="iconbtn" data-del-subj="${s.id}" aria-label="Eliminar materia">${X}</button></div>`}).join('')}
      </div>
      <div class="row" style="margin-top:10px"><button class="btn" id="add-subj">+ Materia</button></div>
      <p class="small muted" style="margin-top:10px">Las horas de acompañamiento directo se calculan con las clases de tu horario. La dificultad suma tiempo al mínimo: media +10 %, difícil +25 %.</p>
    </div>
    <div class="card">
      <h2>Tu ritmo</h2>
      <div class="opts">
        <label class="field"><span>Me despierto (L–V)</span><input type="time" id="o-wake" data-o="wake" value="${p.wake}"></label>
        <label class="field"><span>Me despierto (fin de semana)</span><input type="time" id="o-wakew" data-o="wakeWeekend" value="${p.wakeWeekend}"></label>
        <label class="field"><span>Me duermo</span><input type="time" id="o-bed" data-o="bed" value="${p.bed}"></label>
        <label class="field"><span>Ocio al día (h)</span><input type="number" id="o-leisure" data-o="leisure" min="0" max="6" step="0.5" value="${p.leisure}"></label>
        <label class="field"><span>Tarde libre</span><select id="o-free" data-o="freeDay"><option value="-1">Ninguna</option>${[5,6].map(d=>`<option value="${d}" ${p.freeDay===d?'selected':''}>${DAYS_LONG[d]}</option>`).join('')}</select></label>
        <label class="field"><span>Prefiero estudiar</span><select id="o-prefer" data-o="prefer">${[['manana','En la mañana'],['tarde','En la tarde'],['noche','En la noche']].map(([k,l])=>`<option value="${k}" ${p.prefer===k?'selected':''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Máx. estudio al día (h)</span><input type="number" id="o-max" data-o="maxPerDay" min="1" max="12" step="0.5" value="${p.maxPerDay}"></label>
        <label class="field"><span>Bloque de estudio</span><select id="o-block" data-o="block">${[45,60,90].map(m=>`<option value="${m}" ${p.block===m?'selected':''}>${m} min</option>`).join('')}</select></label>
        <label class="field"><span>Estilo de estudio</span><select id="o-style" data-o="style"><option value="focus" ${p.style!=='mix'?'selected':''}>Enfocado: 1–2 materias por día</option><option value="mix" ${p.style==='mix'?'selected':''}>Variado: mezcla materias</option></select></label>
        <label class="field"><span>Horas por crédito (semestre)</span><input type="number" id="o-ch" data-o="creditHours" min="16" max="96" step="1" value="${p.creditHours}"></label>
        <label class="field"><span>Semanas del semestre</span><input type="number" id="o-weeks" data-o="weeks" min="8" max="24" step="1" value="${p.weeks}"></label>
      </div>
      <p class="small muted" style="margin-top:10px">Tu universidad: 1 crédito = ${p.creditHours} h en el semestre, sumando <b>acompañamiento directo</b> (clases y tutorías) y <b>trabajo independiente</b> (repasar, tareas, preparar exámenes). En ${p.weeks} semanas son ${hnum(p.creditHours/p.weeks)} h por crédito a la semana.</p>
      <div id="sleep-warn" style="margin-top:12px"></div>
    </div>
  </div>
  <div class="card">
    <div class="row between"><h2>Clases y compromisos fijos</h2><span class="small muted">${p.fixed.length} bloques</span></div>
    <div class="list">
      ${p.fixed.slice().sort((a,b)=>a.day-b.day||a.start-b.start).map(f=>`<div class="fx-row ${f.nocount?'off':''}" data-fid="${f.id}">
        <select id="fd-${f.id}" data-g="day" aria-label="Día">${DAYS.map((d,i)=>`<option value="${i}" ${f.day===i?'selected':''}>${d}</option>`).join('')}</select>
        <input type="time" id="fs-${f.id}" data-g="start" value="${fmt(f.start)}" aria-label="Inicio">
        <input type="time" id="fe-${f.id}" data-g="end" value="${fmt(f.end)}" aria-label="Fin">
        <select class="what" id="fw-${f.id}" data-g="what" aria-label="Qué es">${subjOpts(f.subjectId?'sub:'+f.subjectId:'lbl:'+(f.label||'Otro'))}</select>
        <input type="text" class="room" id="fr-${f.id}" data-g="room" value="${esc(f.room||'')}" placeholder="Salón" aria-label="Salón">
        <label class="cnt" title="Desmárcalo para laboratorios u horas que no se suman a los créditos. El bloque sigue ocupando ese tiempo."><input type="checkbox" id="fc-${f.id}" data-g="count" ${f.nocount?'':'checked'}>Cuenta</label>
        <button class="iconbtn" data-del-fx="${f.id}" aria-label="Eliminar bloque">${X}</button></div>`).join('')||'<p class="muted small">Importa tu horario arriba o añade tus clases a mano.</p>'}
    </div>
    <p class="small muted" style="margin-top:8px">Los bloques sin marcar en <b>Cuenta</b> (por ejemplo, laboratorios LL) siguen apartando ese tiempo en tu semana, pero no se suman a tus horas de acompañamiento directo.</p>
    <div class="row" style="margin-top:10px"><button class="btn" id="add-fx">+ Bloque fijo</button></div>
  </div>
  <div class="card" id="transporte"></div>
  <div class="card" id="extras"></div>
  <div id="week-area" class="view"></div>
  <div class="card conc" id="concentrar"></div>
  <div class="card" id="recordatorios"></div>`;
  renderImport();renderWeek();renderConc();renderCommute();renderExtras();
}

/* actividades extracurriculares */
function placedText(a){
  const info=S.sched.actInfo.filter(x=>x.id===a.id);
  if(!info.length)return 'Elige al menos un día.';
  return info.map(x=>x.miss?`${DAYS[x.d]}: no cupo`:`${DAYS[x.d]} ${fmt(x.start)}–${fmt(x.end)}${x.clash?' (choca con '+esc(x.clash)+')':''}`).join(' · ');
}
function renderExtras(){
  const el=$('#extras');if(!el)return;const p=S.plan;const ex=p.extra||(p.extra={on:false,items:[]});
  const weekMin=(ex.items||[]).reduce((a,x)=>a+(+x.dur||0)*(x.days||[]).length,0);
  el.innerHTML=`
    <div class="row between" style="flex-wrap:nowrap;align-items:start;gap:16px">
      <div><span class="label">Opcional</span><h2>Actividades extracurriculares</h2>
        <p class="small muted" style="margin-top:4px;max-width:70ch">Gym, deporte, música o cualquier hobby. Aparta su tiempo en tu semana para que el estudio no lo pise, y el estudio se acomoda alrededor. Si lo dejas apagado, tu horario queda igual.</p></div>
      <label class="switch" title="Incluir actividades extracurriculares"><input type="checkbox" id="ex-on" data-ex="on" ${ex.on?'checked':''}><span></span><b class="sr">Incluir actividades extracurriculares</b></label>
    </div>
    ${ex.on?`
    <div class="ex-list">${(ex.items||[]).map(a=>`<div class="ex-item" data-eid="${a.id}">
      <div class="ex-top"><input type="text" id="ex-n-${a.id}" data-ef="name" value="${esc(a.name)}" placeholder="Gym, fútbol, guitarra…" aria-label="Nombre de la actividad" maxlength="40"><button class="iconbtn" data-edel aria-label="Quitar ${esc(a.name)}">${X}</button></div>
      <div class="durs">${DAYS.map((d,i)=>`<button class="chip" data-eday="${i}" aria-pressed="${(a.days||[]).includes(i)}">${d}</button>`).join('')}</div>
      <div class="opts" style="margin-top:0">
        <label class="field"><span>¿Cuándo?</span><select id="ex-m-${a.id}" data-ef="mode"><option value="fixed" ${a.mode!=='auto'?'selected':''}>A una hora fija</option><option value="auto" ${a.mode==='auto'?'selected':''}>Que el plan le busque hueco</option></select></label>
        ${a.mode==='auto'
          ?`<label class="field"><span>Mejor en la</span><select id="ex-w-${a.id}" data-ef="when">${[['manana','Mañana'],['tarde','Tarde'],['noche','Noche']].map(([k,l])=>`<option value="${k}" ${a.when===k?'selected':''}>${l}</option>`).join('')}</select></label>`
          :`<label class="field"><span>Hora de inicio</span><input type="time" id="ex-s-${a.id}" data-ef="start" value="${esc(a.start||'18:00')}"></label>`}
        <label class="field"><span>Duración (min)</span><input type="number" id="ex-d-${a.id}" data-ef="dur" min="15" max="300" step="15" value="${a.dur}" inputmode="numeric"></label>
        <label class="field"><span>Camino (min, ida)</span><input type="number" id="ex-t-${a.id}" data-ef="travel" min="0" max="120" step="5" value="${a.travel||0}" inputmode="numeric"></label>
      </div>
      <p class="small muted" data-eplaced>${placedText(a)}</p>
    </div>`).join('')||'<p class="small muted" style="margin-top:12px">Agrega tu primera actividad.</p>'}</div>
    <div class="conc-add"><span class="small muted">Agregar:</span>${Object.entries(EX_PRESETS).map(([k,v])=>`<button class="chip" data-exadd="${k}">+ ${v.label}</button>`).join('')}</div>
    ${weekMin?`<p class="small muted" style="margin-top:10px">En total: <b>${hrs(weekMin)}</b> a la semana en actividades, sin contar el camino.</p>`:''}`:''}`;
}
function refreshPlaced(){$$('#extras [data-eid]').forEach(r=>{const a=(S.plan.extra.items||[]).find(x=>x.id===r.dataset.eid);const t=r.querySelector('[data-eplaced]');if(a&&t)t.innerHTML=placedText(a)})}

/* transporte a la universidad */
function renderCommute(){
  const el=$('#transporte');if(!el)return;const p=S.plan;const cm=p.commute||(p.commute=defaultCommute());
  const modeOpts=(sel,skip)=>MODES.filter(([k])=>!skip||!skip.includes(k)).map(([k,l])=>`<option value="${k}" ${sel===k?'selected':''}>${l}</option>`).join('');
  const drives=cm.mode==='carro'||cm.mode==='moto';
  el.innerHTML=`
    <div class="row between" style="flex-wrap:nowrap;align-items:start;gap:16px">
      <div><span class="label">Opcional</span><h2>Transporte a la universidad</h2>
        <p class="small muted" style="margin-top:4px;max-width:70ch">Para los que viven lejos: aparta en tu semana el tiempo de ida y regreso, según tu primera y tu última clase de cada día. Si lo dejas apagado, tu horario queda igual.</p></div>
      <label class="switch" title="Incluir tiempo de transporte"><input type="checkbox" id="cm-on" data-cm="on" ${cm.on?'checked':''}><span></span><b class="sr">Incluir tiempo de transporte</b></label>
    </div>
    ${cm.on?`
    <div class="opts">
      <label class="field"><span>¿Cómo vas normalmente?</span><select id="cm-mode" data-cm="mode">${modeOpts(cm.mode)}</select></label>
      <label class="field"><span>Tiempo aproximado (min)</span><input type="number" id="cm-min" data-cm="min" min="5" max="240" step="5" value="${cm.min}" inputmode="numeric"></label>
      <label class="field"><span>Llegar antes de clase</span><select id="cm-margin" data-cm="margin">${[0,10,15,20,30].map(m=>`<option value="${m}" ${+cm.margin===m?'selected':''}>${m?m+' min antes':'Justo a tiempo'}</option>`).join('')}</select></label>
    </div>
    ${drives?`<div class="pyp">
      <div class="field"><span>Días con pico y placa</span><div class="durs">${[0,1,2,3,4,5].map(d=>`<button class="chip" data-pyp="${d}" aria-pressed="${(cm.pyp||[]).includes(d)}">${DAYS[d]}</button>`).join('')}</div></div>
      <div class="opts">
        <label class="field"><span>Esos días voy en</span><select id="cm-alt" data-cm="altMode">${modeOpts(cm.altMode,[cm.mode])}</select></label>
        <label class="field"><span>Tiempo aproximado (min)</span><input type="number" id="cm-altmin" data-cm="altMin" min="5" max="240" step="5" value="${cm.altMin}" inputmode="numeric"></label>
      </div></div>`:'<p class="small muted" style="margin-top:10px">El pico y placa solo aplica si vas en carro o moto.</p>'}
    <div id="cm-days"></div>`:''}`;
  renderCommuteDays();
}
function renderCommuteDays(){
  const el=$('#cm-days');if(!el)return;const info=S.sched.commuteInfo;
  el.innerHTML=info.length?`<div class="cm-table">
    <div class="cm-row cm-head"><span>Día</span><span>Medio</span><span>Sales de casa</span><span>Sales de la U</span><span>Llegas a casa</span></div>
    ${info.map(c=>`<div class="cm-row" data-cmd="${c.d}">
      <b>${DAYS_LONG[c.d]}</b>
      <span class="small">${esc(MODE_SHORT[c.mode])} · ${c.min} min${c.pyp?' <span class="mile got">pico y placa</span>':''}</span>
      <span class="cm-t cm-l"><input type="time" id="cm-l-${c.d}" data-cmf="leave" value="${fmt(c.leave)}" aria-label="Hora de salida de casa el ${DAYS_LONG[c.d]}"><button class="btn sm ghost" data-cmauto="leave" ${c.ovLeave?'':'hidden'} title="Volver a la hora calculada">Auto</button></span>
      <span class="cm-t cm-b"><input type="time" id="cm-b-${c.d}" data-cmf="back" value="${fmt(c.back)}" aria-label="Hora de salida de la universidad el ${DAYS_LONG[c.d]}"><button class="btn sm ghost" data-cmauto="back" ${c.ovBack?'':'hidden'} title="Volver a la hora calculada">Auto</button></span>
      <span class="num" data-home>${fmt(c.home)}</span></div>`).join('')}
  </div>
  <p class="small muted" style="margin-top:8px">Las horas se calculan solas con tu primera y tu última clase de cada día. Si sales a otra hora, cámbiala aquí; <b>Auto</b> vuelve al cálculo.</p>`
  :'<p class="small muted" style="margin-top:10px">Agrega tus clases para calcular la ida y el regreso.</p>';
}

/* materia a concentrar */
function daysUntil(k){return Math.round((new Date(k+'T00:00')-new Date(dateKey()+'T00:00'))/DAY_MS)}
function renderConc(){
  const el=$('#concentrar');if(!el)return;const p=S.plan;const list=p.concentrate||[];const t=dateKey();
  const avail=p.subjects.filter(s=>!list.some(c=>c.subjectId===s.id));
  el.innerHTML=`
    <div class="row between" style="align-items:start;flex-wrap:nowrap"><div><span class="label">Prioridad</span><h2>Materia a concentrar</h2><p class="conc-sub">porque estoy jodido</p></div>${flameSvg(30,true).replace('class="flame','style="width:40px;height:40px;flex:none" class="flame')}</div>
    <p class="small muted" style="margin-top:8px;max-width:72ch">Elige la materia que necesita más atención que de costumbre. Le sumo horas de estudio a la semana, le doy los mejores horarios, aparece primero en Hoy y sus tarjetas salen primero en Reels. Si pones la fecha del parcial, se desactiva sola después de ese día.</p>
    <div class="conc-list">${list.map((c,i)=>{const s=p.subjects.find(x=>x.id===c.subjectId);if(!s)return '';const over=c.until&&c.until<t;
      return `<div class="conc-row ${over?'over':''}" data-ci="${i}">
        <div class="row" style="gap:8px;flex-wrap:nowrap;min-width:0"><i class="dot" style="background:${s.color}"></i><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</b>${over?'<span class="mile">Terminó</span>':c.until?`<span class="mile got">${daysUntil(c.until)===0?'Hoy':daysUntil(c.until)+' d'}</span>`:''}</div>
        <div class="stepper" title="Horas extra de estudio a la semana"><button data-cstep="-1" aria-label="Menos horas extra">−</button><b class="custom">+${hnum(c.extra)} h</b><button data-cstep="1" aria-label="Más horas extra">+</button></div>
        <label class="field cc-until"><span>Hasta (parcial)</span><input type="date" id="cc-u-${i}" data-cf="until" value="${esc(c.until||'')}"></label>
        <label class="field cc-note"><span>Por qué</span><input type="text" id="cc-n-${i}" data-cf="note" value="${esc(c.note||'')}" placeholder="Ej.: parcial de dinámica, voy perdiendo el corte" maxlength="80"></label>
        <button class="iconbtn" data-cdel="${i}" aria-label="Quitar ${esc(s.name)}">${X}</button></div>`}).join('')||'<p class="small muted">Ninguna por ahora. Ojalá siga así.</p>'}</div>
    ${avail.length?`<div class="conc-add"><span class="small muted">Agregar:</span>${avail.map(s=>`<button class="chip" data-cadd="${s.id}"><i class="dot" style="background:${s.color}"></i>${esc(s.name)}</button>`).join('')}</div>`:''}`;
}
function goSection(id){setTab('horario');setTimeout(()=>{const r=$('#'+id);if(r)r.scrollIntoView({behavior:'smooth',block:'start'})},60)}

/* importar horario, sin internet: la tabla copiada del portal, un PDF, un CSV o un TXT */
let importPasteHtml='';
function renderImport(){
  const el=$('#import-card');if(!el)return;
  if(S.draft){el.innerHTML=reviewHtml();return}
  el.innerHTML=`
    <div style="display:grid;gap:8px;align-content:start"><span class="label">Automático</span><h2>Importa tu horario</h2>
      <p class="muted">Abre tu horario en el portal de la universidad, selecciona toda la tabla (desde "Hora" hasta la última clase), cópiala con Ctrl+C y pégala aquí. También sirve un PDF del horario (en el portal: Imprimir → Guardar como PDF), un CSV o un TXT.</p>
      <p class="small muted">Todo se lee en tu dispositivo. Las capturas de pantalla no se pueden leer sin internet: usa la tabla copiada o el PDF.</p></div>
    <div style="display:grid;gap:10px">
      <label class="field"><span>Pega aquí la tabla del horario</span><textarea id="i-text" rows="5" placeholder="Hora	Lunes	Martes	Miércoles…&#10;6:00-7:00		FISICA II 22953 B5A LL 409"></textarea></label>
      <div class="drop" data-for="i" role="button" tabindex="0"><b>O elige un archivo</b><span class="small muted">PDF, CSV, TXT o HTML</span><input type="file" id="i-file" accept=".pdf,.csv,.tsv,.txt,.html,.htm" hidden></div>
      <div class="files" id="i-files">${importFiles.map(f=>`<span>${esc(f.name)}</span>`).join('')}</div>
      <div class="row"><button class="btn primary" id="i-go">Leer horario</button></div>
      <p class="status" id="i-status" aria-live="polite"></p>
    </div>`;
}
document.addEventListener('paste',e=>{
  if(!e.target||e.target.id!=='i-text')return;
  const html=e.clipboardData&&e.clipboardData.getData('text/html');
  importPasteHtml=html&&/<table/i.test(html)?html:'';
  const s=$('#i-status');if(s)s.textContent=importPasteHtml?'Tabla pegada. Pulsa "Leer horario".':'';
});
/* convierte una tabla HTML en una matriz, respetando celdas combinadas (rowspan/colspan) */
function htmlToMatrix(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const tables=[...doc.querySelectorAll('table')];if(!tables.length)return null;
  const t=tables.sort((a,b)=>b.rows.length-a.rows.length)[0];
  const M=[];
  [...t.rows].forEach((tr,ri)=>{
    M[ri]=M[ri]||[];let ci=0;
    for(const cell of tr.cells){
      while(M[ri][ci]!==undefined)ci++;
      cell.querySelectorAll('br').forEach(b=>b.replaceWith('\n'));
      cell.querySelectorAll('p,div,li').forEach(b=>b.append('\n'));
      const text=cell.textContent.replace(/[ \t ]+/g,' ').replace(/\s*\n\s*/g,'\n').trim();
      const rs=Math.max(1,cell.rowSpan||1),cs=Math.max(1,cell.colSpan||1);
      for(let r=0;r<rs;r++){M[ri+r]=M[ri+r]||[];for(let c=0;c<cs;c++)M[ri+r][ci+c]=text}
      ci+=cs;
    }
  });
  return M.map(r=>Array.from(r,x=>x||''));
}
function csvSplit(line,sep){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(q){if(c==='"'){if(line[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}else if(c==='"')q=true;else if(c===sep){out.push(cur);cur=''}else cur+=c}out.push(cur);return out.map(s=>s.trim())}
function textToMatrix(t){
  const lines=t.replace(/\r/g,'').split('\n').filter(l=>l.trim());
  const share=ch=>lines.filter(l=>l.includes(ch)).length/Math.max(1,lines.length);
  const sep=share('\t')>0.3?'\t':share(';')>0.5?';':share(',')>0.5?',':null;
  if(!sep)return lines.map(l=>l.split(/\s{2,}|\s*\|\s*/).map(s=>s.trim()));
  return lines.map(l=>csvSplit(l,sep));
}
/* PDF de un horario: ubica los encabezados de los días y las horas, y asigna cada texto a su celda por posición */
function pdfToMatrix(pages){
  const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
  for(const all of pages){
    const its=all.filter(t=>t.str.trim());
    const heads=its.filter(t=>t.str.trim().length>=3&&dayIdx(t.str.trim())!=null);
    if(heads.length<3)continue;
    const hy=med(heads.map(h=>h.y));
    const cols=heads.filter(h=>Math.abs(h.y-hy)<8).map(h=>({d:dayIdx(h.str.trim()),x:h.x+h.w/2})).sort((a,b)=>a.x-b.x);
    if(cols.length<3)continue;
    const colW=(cols[cols.length-1].x-cols[0].x)/Math.max(1,cols.length-1);
    const leftLimit=cols[0].x-colW/2;
    const lines=[];
    for(const t of its.filter(t=>t.x+t.w<leftLimit+2&&t.y<hy-2).sort((a,b)=>b.y-a.y||a.x-b.x)){
      const l=lines.find(l=>Math.abs(l.y-t.y)<3);if(l){l.parts.push(t)}else lines.push({y:t.y,parts:[t]});
    }
    const trows=lines.map(l=>({y:l.y,text:l.parts.sort((a,b)=>a.x-b.x).map(p=>p.str).join(' ').replace(/\s+/g,' ').trim()})).filter(l=>/\d{1,2}\s*[:.]\s*\d{2}/.test(l.text)).sort((a,b)=>b.y-a.y);
    if(!trows.length)continue;
    const bands=trows.map((r,i)=>{
      const top=i===0?hy:(trows[i-1].y+r.y)/2;
      const gap=i<trows.length-1?(r.y-trows[i+1].y)/2:(i>0?(trows[i-1].y-r.y)/2:20);
      return {top,bottom:r.y-gap,text:r.text};
    });
    const grid=bands.map(b=>[b.text].concat(cols.map(()=>[])));
    for(const t of its){
      if(t.y>=hy-2)continue;const cx=t.x+t.w/2;if(cx<leftLimit)continue;
      let ci=0,bd=1e9;cols.forEach((c,i)=>{const dd=Math.abs(c.x-cx);if(dd<bd){bd=dd;ci=i}});if(bd>colW*0.75)continue;
      const ri=bands.findIndex(b=>t.y<=b.top+1&&t.y>b.bottom-1);if(ri<0)continue;
      grid[ri][ci+1].push(t);
    }
    return [['Hora'].concat(cols.map(c=>DAYS_LONG[c.d]))].concat(grid.map(row=>[row[0]].concat(row.slice(1).map(arr=>arr.sort((a,b)=>b.y-a.y||a.x-b.x).map(t=>t.str).join(' ').replace(/\s+/g,' ').trim()))));
  }
  return null;
}
/* "FISICA II 22953 B5A LL 409" → materia "Física II", salón "LL 409" */
const ACC={fisica:'Física',etica:'Ética',estatica:'Estática',dinamica:'Dinámica',calculo:'Cálculo',quimica:'Química',economica:'Económica',economico:'Económico',grafico:'Gráfico',grafica:'Gráfica',matematicas:'Matemáticas',matematica:'Matemática',algebra:'Álgebra',logica:'Lógica',electronica:'Electrónica',mecanica:'Mecánica',termodinamica:'Termodinámica',tecnica:'Técnica',tecnico:'Técnico',metodos:'Métodos',numericos:'Numéricos',numerico:'Numérico',analisis:'Análisis',biologia:'Biología',geometria:'Geometría',estadistica:'Estadística',programacion:'Programación',introduccion:'Introducción',comunicacion:'Comunicación',administracion:'Administración',ingenieria:'Ingeniería',diseno:'Diseño',electrica:'Eléctrica',informatica:'Informática',economia:'Economía',teoria:'Teoría',practica:'Práctica',basica:'Básica',basico:'Básico',tecnologia:'Tecnología',ecologia:'Ecología',psicologia:'Psicología',filosofia:'Filosofía',sociologia:'Sociología',optica:'Óptica',automatizacion:'Automatización',investigacion:'Investigación',catedra:'Cátedra',ingles:'Inglés',frances:'Francés',aleman:'Alemán',aplicacion:'Aplicación',computacion:'Computación',maquinas:'Máquinas',termica:'Térmica',hidraulica:'Hidráulica',topografia:'Topografía',geologia:'Geología',mineria:'Minería',electrotecnia:'Electrotecnia',etica_:'Ética',cientifica:'Científica',quimicos:'Químicos',organica:'Orgánica',inorganica:'Inorgánica',fisico:'Físico',fisicos:'Físicos',numerica:'Numérica',linea:'Línea',dibujo:'Dibujo'};
const SMALL=new Set(['de','del','la','las','el','los','y','e','en','a','para','con','por','al','o','u']);
function prettySubject(s){
  const w=String(s).trim().split(/\s+/);
  return w.map((x,i)=>{
    if(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(x))return x.toUpperCase();
    const k=norm(x);if(ACC[k])return ACC[k];
    if(i>0&&SMALL.has(k))return k;
    if(/^[A-Z]{2,4}$/.test(x)&&!/[AEIOU]/.test(x))return x;
    return x.charAt(0).toUpperCase()+x.slice(1).toLowerCase();
  }).join(' ');
}
function parseCellText(t){
  let txt=String(t).split(/\n+/).map(s=>s.trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  let room='';
  const m=txt.match(/\b([A-Z]{1,4}\s?-?\d{2,4}[A-Z]?)\s*$/i);
  if(m&&/[A-Za-z]/.test(m[1])&&m.index>0){room=m[1].toUpperCase().replace(/\s+/,' ');txt=txt.slice(0,m.index).trim()}
  const cut=txt.search(/\b\d{4,}\b/);
  let subject=(cut>0?txt.slice(0,cut):txt).trim().replace(/\s+[A-Z]\d+[A-Z]?$/,'').trim();
  return {subject:subject?prettySubject(subject):'',room};
}
function matrixToGrid(M){
  if(!M||!M.length)return null;
  const hdr=M.findIndex(r=>r.filter(c=>dayIdx(c)!=null).length>=3);if(hdr<0)return null;
  const head=M[hdr];
  const timeRe=/\d{1,2}\s*[:.h]\s*\d{2}|\d{1,2}\s*(?:am|pm|a\.\s?m|p\.\s?m)/i;
  let tc=-1,best=0;
  for(let c=0;c<head.length;c++){if(dayIdx(head[c])!=null)continue;const n=M.slice(hdr+1).filter(r=>timeRe.test(r[c]||'')).length;if(n>best){best=n;tc=c}}
  if(tc<0)return null;
  const dayCols=head.map((h,c)=>({c,d:dayIdx(h)})).filter(x=>x.d!=null);
  const rows=[];
  for(const r of M.slice(hdr+1)){
    if(!timeRe.test(r[tc]||''))continue;
    rows.push({time:r[tc],cells:dayCols.map(({c})=>{const t=(r[c]||'').trim();if(!t)return null;const pc=parseCellText(t);return pc.subject?pc:null})});
  }
  return rows.length?{columns:dayCols.map(x=>DAYS_LONG[x.d]),rows}:null;
}
function reviewHtml(){
  const dr=S.draft;const on=dr.classes.filter(c=>c.on);
  const counted=on.filter(c=>!c.nocount).reduce((a,c)=>a+c.end-c.start,0);
  const subjMin=k=>on.filter(c=>c.key===k&&!c.nocount).reduce((a,c)=>a+c.end-c.start,0);
  const colorOf=k=>(dr.subjects.find(s=>s.key===k)||{}).color||'#9A7C8C';
  /* vista previa con la misma forma que la tabla de la universidad: filas de una hora × días */
  const days=[0,1,2,3,4,5].concat(dr.classes.some(c=>c.day===6)?[6]:[]);
  const h0=Math.floor(Math.min(...dr.classes.map(c=>c.start))/60)*60,h1=Math.ceil(Math.max(...dr.classes.map(c=>c.end))/60)*60;
  let grid=`<div class="mh"></div>`+days.map(d=>`<div class="mh">${DAYS_LONG[d]}</div>`).join('');
  for(let h=h0;h<h1;h+=60){
    grid+=`<div class="mt">${fmt(h)}–${fmt(h+60)}</div>`;
    for(const d of days){const i=dr.classes.findIndex(c=>c.day===d&&c.start<h+60&&c.end>h);const c=dr.classes[i];
      grid+=c?`<div class="mc ${c.on?'':'off'} ${c.nocount?'lab':''}" style="--c:${colorOf(c.key)}" data-bi="${i}" title="Toca para ${c.on?'quitar':'volver a incluir'} este bloque">${esc(c.subject)}${c.room?`<small>${esc(c.room)}${c.nocount?' · no cuenta':''}</small>`:''}</div>`:'<div></div>'}
  }
  return `<div class="review" style="grid-column:1/-1">
    <div><span class="label">Revisa antes de guardar</span><h2>Encontré ${dr.subjects.length} materias y ${on.length} bloques de clase (${hrs(counted)} de clase a la semana)</h2>
    <p class="muted small" style="margin-top:4px;max-width:75ch">Compara esta tabla con tu captura. Si ves un bloque que no está en tu horario, tócalo para quitarlo. Los laboratorios (salón LL…) quedan en tu semana pero no cuentan como horas de clase.</p></div>
    <div class="mini-wrap"><div class="mini" style="grid-template-columns:92px repeat(${days.length},minmax(0,1fr))">${grid}</div></div>
    <details open><summary>Bloques detectados (${dr.classes.length})</summary><div class="bl-list">${dr.classes.map((c,i)=>({c,i})).sort((a,b)=>a.c.day-b.c.day||a.c.start-b.c.start).map(({c,i})=>`<div class="bl-row ${c.on?'':'off'}" data-bi-row="${i}">
      <input type="checkbox" id="bl-on-${i}" data-bf="on" ${c.on?'checked':''} aria-label="Incluir este bloque"><b>${DAYS[c.day]}</b><span class="num">${fmt(c.start)}–${fmt(c.end)}</span>
      <span class="bn"><i class="dot" style="background:${colorOf(c.key)}"></i> ${esc(c.subject)}${c.room?' · '+esc(c.room):''}</span>
      <label class="cnt"><input type="checkbox" id="bl-c-${i}" data-bf="count" ${c.nocount?'':'checked'}>Cuenta</label></div>`).join('')}</div></details>
    <div><p class="muted small">El horario no dice cuántos créditos tiene cada materia. Ponlos aquí: con eso calculo tus horas de trabajo independiente.</p></div>
    <div class="rv-row rv-head"><span>Materia</span><span>Clase h/sem</span><span>Créditos</span><span class="dif">Dificultad</span></div>
    ${dr.subjects.map((s,i)=>`<div class="rv-row" data-dr="${i}"><input type="text" id="dr-n-${i}" data-df="name" value="${esc(s.name)}" aria-label="Materia"><span class="calc">${hnum(subjMin(s.key)/60)} h</span><input type="number" id="dr-c-${i}" data-df="credits" min="0" max="12" value="${s.credits}" aria-label="Créditos"><select class="dif" id="dr-d-${i}" data-df="difficulty" aria-label="Dificultad"><option value="1" ${s.difficulty==1?'selected':''}>Fácil</option><option value="2" ${s.difficulty==2?'selected':''}>Media</option><option value="3" ${s.difficulty==3?'selected':''}>Difícil</option></select></div>`).join('')}
    <div class="row"><button class="btn primary big" id="i-apply">Usar este horario</button><button class="btn ghost" id="i-cancel">Descartar</button></div>
    <p class="small muted">Se reemplazan tus materias y clases actuales. Tus otros compromisos (trabajo, transporte) se conservan.</p>
  </div>`;
}
/* Lectura del horario: la tabla se lee celda por celda (fila × columna, con celdas vacías)
   y las celdas se convierten en bloques. Así cada clase queda amarrada a su columna y su fila. */
const DAY_KEYS=['lun','mar','mie','jue','vie','sab','dom'],DAY_EN=['mon','tue','wed','thu','fri','sat','sun'];
function dayIdx(s){const k=norm(s).replace(/[^a-z]/g,'').slice(0,3);const i=DAY_KEYS.indexOf(k);return i>=0?i:(DAY_EN.indexOf(k)>=0?DAY_EN.indexOf(k):null)}
function rowRange(row,prevStart){
  const hm=/^\d{1,2}:\d{2}$/;
  let s=null,e=null,ampm=false;
  if(hm.test(String(row.start||''))&&hm.test(String(row.end||''))){s=toMin(row.start);e=toMin(row.end);ampm=true}
  else{const re=/(\d{1,2})(?:[:.](\d{2}))?\s*(?:([ap])\.?\s*m\b\.?)?/gi;const ts=[];let m;
    while((m=re.exec(String(row.time||'')))&&ts.length<2){let h=+m[1];if(m[3]){ampm=true;h=h%12+(m[3].toLowerCase()==='p'?12:0)}ts.push(h*60+(+(m[2]||0)))}
    if(ts.length<2)return null;[s,e]=ts}
  if(!ampm&&prevStart!=null&&s<prevStart&&s+720<1440){s+=720;e+=720}
  if(e<=s)e+=720;
  if(e<=s||e>1440||e-s>240)return null;
  return [s,e];
}
function cleanSubject(t){return String(t||'').replace(/\b\d{4,}\b.*$/,'').replace(/\s+/g,' ').trim().slice(0,60)}
function parseGrid(r){
  const out=[];
  if(r&&Array.isArray(r.rows)){
    const cols=(Array.isArray(r.columns)?r.columns:[]).map(dayIdx);
    let prev=null;
    for(const row of r.rows){
      if(!row)continue;const rg=rowRange(row,prev);if(!rg)continue;prev=rg[0];
      (Array.isArray(row.cells)?row.cells:[]).forEach((cell,j)=>{
        if(!cell)return;const subject=cleanSubject(typeof cell==='string'?cell:cell.subject);if(!subject)return;
        const day=cols[j]!=null?cols[j]:(cols.length?null:j);if(day==null||day>6)return;
        out.push({subject,room:String((cell&&cell.room)||'').trim().slice(0,20),day,start:rg[0],end:rg[1]});
      });
    }
  }else{
    const raw=Array.isArray(r)?r:(r&&Array.isArray(r.classes)?r.classes:[]);
    for(const c of raw){if(!c||!c.subject)continue;const day=Number(c.day);const st=toMin(c.start),en=toMin(c.end);
      if(!(day>=0&&day<=6)||!/^\d{1,2}:\d{2}$/.test(String(c.start))||en<=st)continue;
      out.push({subject:cleanSubject(c.subject),day,start:st,end:en,room:String(c.room||'').trim().slice(0,20)})}
  }
  /* une filas seguidas de la misma materia, salvo que cambie el salón (p. ej. laboratorio LL y luego aula) */
  out.sort((a,b)=>a.day-b.day||norm(a.subject).localeCompare(norm(b.subject))||a.start-b.start);
  const merged=[];
  for(const c of out){
    const l=merged[merged.length-1];
    const sameRoom=norm(l&&l.room)===norm(c.room)||((!l||!l.room||!c.room)&&!isLab(l&&l.room)&&!isLab(c.room));
    if(l&&norm(l.subject)===norm(c.subject)&&l.day===c.day&&c.start<=l.end&&sameRoom){l.end=Math.max(l.end,c.end);if(!l.room)l.room=c.room}
    else merged.push(Object.assign({},c));
  }
  return merged;
}
function buildDraft(classes){
  const keys=[];const byKey={};
  for(const c of classes){const k=norm(c.subject);c.key=k;c.on=true;c.nocount=isLab(c.room);if(!byKey[k]){byKey[k]={key:k,name:c.subject};keys.push(k)}}
  const subjects=keys.map((k,i)=>{const s=byKey[k];const m=S.plan.example?null:S.plan.subjects.find(x=>norm(x.name)===k);return Object.assign(s,{credits:m?m.credits:3,difficulty:m?m.difficulty:2,color:m?m.color:COLORS[i%COLORS.length]})});
  return {classes,subjects};
}
async function importSchedule(){
  const set=t=>{const s=$('#i-status');if(s)s.textContent=t};
  let M=null;
  try{
    if(importFiles.length){
      const f=importFiles[0];
      if(/\.pdf$/i.test(f.name)||f.type==='application/pdf'){set('Leyendo el PDF…');M=pdfToMatrix(await ReelsEngine.pdfPages(f,set,3))}
      else if(/\.html?$/i.test(f.name))M=htmlToMatrix(await f.text());
      else M=textToMatrix(await f.text());
    }else if(importPasteHtml)M=htmlToMatrix(importPasteHtml);
    else{const t=($('#i-text')||{}).value||'';if(!t.trim()){set('Pega la tabla del horario o elige un archivo.');return}M=textToMatrix(t)}
  }catch(err){set(err&&err.message?err.message:'No pude leer el archivo.');return}
  const grid=matrixToGrid(M);
  if(!grid){set('No encontré una fila con los días (Lunes, Martes…) y otra con las horas. Copia la tabla completa, con sus encabezados.');return}
  const classes=parseGrid(grid);
  if(!classes.length){set('Encontré la tabla, pero ninguna clase. Revisa que copiaste las filas con las horas.');return}
  S.draft=buildDraft(classes);importFiles=[];importPasteHtml='';renderImport();
  const ic=$('#import-card');if(ic)ic.scrollIntoView({behavior:'smooth',block:'start'});
}
function applyImport(){
  const dr=S.draft;const p=S.plan;const old=p.example?[]:p.subjects;const subjects=[];const idByKey={};
  const classes=dr.classes.filter(c=>c.on);
  if(!classes.length){toast('No quedó ningún bloque marcado. Marca al menos una clase.');return}
  dr.subjects.filter(ds=>classes.some(c=>c.key===ds.key)).forEach((ds,i)=>{
    const m=old.find(s=>norm(s.name)===ds.key||norm(s.name)===norm(ds.name));
    const used=new Set(subjects.map(s=>s.color));
    const color=ds.color&&!used.has(ds.color)?ds.color:(COLORS.find(c=>!used.has(c))||COLORS[i%COLORS.length]);
    const s={id:m?m.id:uid(),name:String(ds.name).trim()||'Materia',credits:+ds.credits||0,classHours:0,difficulty:+ds.difficulty||2,color,override:m?m.override:null};
    subjects.push(s);idByKey[ds.key]=s.id;
  });
  const other=p.example?[]:p.fixed.filter(f=>!f.subjectId);
  const fixed=classes.map(c=>({id:uid(),day:c.day,start:c.start,end:c.end,subjectId:idByKey[c.key],label:'',room:c.room||'',nocount:!!c.nocount})).concat(other);
  p.subjects=subjects;p.fixed=fixed;p.example=false;
  const msgs=[];
  const wkStart=Math.min(...fixed.filter(f=>f.day<5).map(f=>f.start));
  if(isFinite(wkStart)&&wkStart-60<toMin(p.wake)){p.wake=fmt(wkStart-60);msgs.push(`Ajusté tu hora de despertar entre semana a las ${p.wake}, porque tu primera clase es a las ${fmt(wkStart)}.`)}
  const weStart=Math.min(...fixed.filter(f=>f.day>=5).map(f=>f.start));
  if(isFinite(weStart)&&weStart-60<toMin(p.wakeWeekend)){p.wakeWeekend=fmt(weStart-60)}
  S.draft=null;save('plan');renderHorario();
  toast(`Horario importado: ${subjects.length} materias.${msgs.length?' '+msgs[0]:''}`);
}

/* semana */
function sleepLine(sc){
  const p=S.plan;const wk=[6,0,1,2,3].map(d=>sc.sleepNight[d]);const we=[4,5].map(d=>sc.sleepNight[d]);
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;const total=sc.sleepNight.reduce((x,y)=>x+y,0);
  return `<div class="sleep-line"><span>Entre semana duermes <b>${hnum(avg(wk))} h</b> por noche (${fmt(sc.bed)}–${p.wake})</span><span>Viernes y sábado: <b>${hnum(avg(we))} h</b> (hasta las ${p.wakeWeekend})</span><span>En total: <b>${hnum(total)} h</b> a la semana</span></div>`;
}
function renderWeek(){
  const sc=S.sched=buildSchedule(S.plan);const p=S.plan;const area=$('#week-area');if(!area)return;
  const oldWW=$('#week-wrap');const prevLeft=oldWW?oldWW.scrollLeft:null;
  const g0=Math.floor(sc.g0/60)*60,g1=Math.ceil(sc.bed/60)*60;const ppm=0.9;const H=(g1-g0)*ppm;
  let times='',lines='';for(let m=g0;m<=g1;m+=60){times+=`<span style="top:${(m-g0)*ppm}px">${fmt(m)}</span>`;lines+=`<div class="hourline" style="top:${(m-g0)*ppm}px"></div>`}
  const t=todayIdx();const n=nowMin();
  const label=b=>b.kind==='study'?subjName(b.subjectId):b.kind==='fixed'&&b.subjectId?subjName(b.subjectId):b.label;
  const cols=DAYS.map((d,i)=>`<div class="wk-col" style="height:${H}px">${lines}${sc.busy[i].map(b=>`<div class="blk ${b.kind}${b.nocount?' nocount':''}" style="--c:${b.subjectId?subjColor(b.subjectId):'#9A7C8C'};top:${(b.start-g0)*ppm}px;height:${(b.end-b.start)*ppm-2}px" title="${esc(blockName(b))} ${fmt(b.start)}–${fmt(b.end)}${b.nocount?' · no cuenta como horas de clase':''}">${b.nocount?'<span class="nc">Lab · no cuenta</span>':''}<b>${esc(label(b))}</b>${b.end-b.start>=45&&b.kind!=='sleep'?`<span class="num">${fmt(b.start)}–${fmt(b.end)}</span>`:''}${b.room&&b.end-b.start>=75?`<br><span>${esc(b.room)}</span>`:''}</div>`).join('')}${i===t&&n>=g0&&n<=g1?`<div class="nowline" style="top:${(n-g0)*ppm}px"></div>`:''}</div>`).join('');
  const credits=p.subjects.reduce((a,s)=>a+(+s.credits||0),0);
  const semH=credits*p.creditHours;const perWeek=semH/p.weeks;
  const direct=p.subjects.reduce((a,s)=>a+classH(p,s),0);
  const indepMin=p.subjects.reduce((a,s)=>a+minIndep(p,s),0);
  const indepPlan=p.subjects.reduce((a,s)=>a+planH(p,s),0);
  const warn=$('#sleep-warn');
  if(warn){const w=[];
    if(sc.sleepWeek<7)w.push(`Entre semana duermes ${hnum(sc.sleepWeek)} h. Por debajo de 7 h se aprende y se recuerda peor: vale más dormir que trasnochar.`);
    if(sc.earlyClass)w.push(`Tienes clase a las ${fmt(sc.earlyClass.start)} el ${DAYS_LONG[sc.earlyClass.day].toLowerCase()} y te despiertas después. Ajusta tu hora de despertar.`);
    const early=sc.commuteInfo.find(c=>c.leave<sc.wakeOf(c.d)+20);
    if(early)w.push(`El ${DAYS_LONG[early.d].toLowerCase()} tienes que salir de casa a las ${fmt(early.leave)} para llegar a tu clase de las ${fmt(early.first)}, y te despiertas a las ${fmt(sc.wakeOf(early.d))}. Despiértate más temprano o ajusta la hora de salida.`);
    const miss=sc.actInfo.filter(x=>x.miss);
    if(miss.length){const a=(p.extra.items||[]).find(x=>x.id===miss[0].id);w.push(`No encontré hueco para ${esc(a?a.name:'una actividad')} el ${DAYS_LONG[miss[0].d].toLowerCase()}${miss.length>1?` (y ${miss.length-1} más)`:''}. Ponle una hora fija o cambia el día.`)}
    const late=sc.commuteInfo.find(c=>c.home>sc.bed-30);
    if(late)w.push(`El ${DAYS_LONG[late.d].toLowerCase()} llegas a casa a las ${fmt(late.home)}, muy cerca de tu hora de dormir.`);
    warn.innerHTML=sleepLine(sc)+w.map(x=>`<div class="warnbox" style="margin-top:10px">${x}</div>`).join('')}
  const totW=Math.max(1,direct+indepPlan);
  area.innerHTML=`
  <div class="card">
    <div class="row between"><h2>Tus horas según créditos</h2><span class="small muted">Ajusta con − y + las horas de estudio de cada materia</span></div>
    <div class="sem">
      <div><span class="label">Créditos</span><b>${credits}</b><span class="small muted">× ${p.creditHours} h = ${Math.round(semH)} h en el semestre</span></div>
      <div><span class="label">Por semana</span><b>${hnum(perWeek)} h</b><span class="small muted">${Math.round(semH)} h ÷ ${p.weeks} semanas</span></div>
      <div><span class="label">Acompañamiento directo</span><b>${hnum(direct)} h</b><span class="small muted">clases y tutorías</span></div>
      <div><span class="label">Trabajo independiente</span><b>${hnum(indepPlan)} h</b><span class="small muted">mínimo ${hnum(indepMin)} h</span></div>
    </div>
    <div class="stack" title="Directo frente a independiente"><i style="width:${direct/totW*100}%;background:repeating-linear-gradient(135deg,var(--ink-3) 0 4px,var(--ink-2) 4px 8px)"></i><i style="width:${indepPlan/totW*100}%;background:var(--sunset)"></i></div>
    ${sc.unplaced?`<div class="warnbox" style="margin-top:12px">No cupieron ${hrs(sc.unplaced)} de estudio. Sube el máximo diario, reduce el ocio o quita la tarde libre.</div>`:''}
    ${indepPlan<indepMin-0.01?`<div class="warnbox" style="margin-top:12px">Tu plan tiene menos trabajo independiente que el mínimo que piden tus créditos (${hnum(indepMin)} h).</div>`:''}
    <div class="need">${p.subjects.map(s=>{const q=sc.queues.find(x=>x.s.id===s.id);const h=studyH(p,s);const custom=s.override!=null;
      return `<div class="need-row" data-sid="${s.id}"><div class="nm"><i class="dot" style="background:${s.color}"></i><div style="min-width:0;display:grid"><span>${esc(s.name)}</span><small class="muted">${hnum(weekTotal(p,s))} h/sem = ${hnum(classH(p,s))} directo + ${hnum(Math.max(0,weekTotal(p,s)-classH(p,s)))} indep.</small></div></div>
      <div class="bar" title="Horas que sí cupieron en tu semana"><i style="width:${q&&q.need?Math.round(q.placed/q.need*100):100}%"></i></div>
      <div class="row" style="gap:6px;flex-wrap:nowrap">${extraH(p,s)?`<span class="mile got" title="Horas extra por ser materia a concentrar">+${hnum(extraH(p,s))} h</span>`:''}<div class="stepper"><button data-step="-0.5" aria-label="Menos estudio">−</button><b class="${custom?'custom':''}">${hnum(h)} h</b><button data-step="0.5" aria-label="Más estudio">+</button></div>${custom?`<button class="btn sm ghost" data-auto title="Volver al cálculo automático (${hnum(autoStudy(p,s))} h)">Auto</button>`:''}</div></div>`}).join('')}</div>
  </div>
  ${p.style!=='mix'?`<div class="card"><div class="row between"><h2>Enfoque de cada día</h2><span class="small muted">Cada materia se estudia en días en que no tienes esa clase</span></div>
    <div class="focus-days">${DAYS.map((d,i)=>`<div class="fd ${i===t?'today':''}"><span class="label">${DAYS_LONG[i]}</span>${sc.onDay[i].length?sc.onDay[i].map(id=>`<span class="fd-s"><i class="dot" style="background:${subjColor(id)}"></i>${esc(subjName(id))}</span>`).join(''):'<span class="small muted">Sin estudio</span>'}</div>`).join('')}</div></div>`:''}
  <div class="legend"><span><i style="background:color-mix(in srgb,var(--accent) 32%,var(--surface))"></i>Estudio independiente</span><span><i style="background:repeating-linear-gradient(135deg,var(--surface-2) 0 3px,var(--line) 3px 6px)"></i>Clase (acompañamiento directo)</span><span><i style="background:color-mix(in srgb,var(--hl) 35%,var(--surface))"></i>Ocio</span>${p.commute&&p.commute.on?'<span><i style="background:color-mix(in srgb,var(--ice) 25%,var(--surface));border:1px dashed var(--ice)"></i>Transporte</span>':''}${p.extra&&p.extra.on&&p.extra.items.length?'<span><i style="background:color-mix(in srgb,var(--good) 30%,var(--surface))"></i>Actividades</span>':''}<span><i style="background:var(--surface-2)"></i>Comidas, sueño y desconexión</span></div>
  ${sleepLine(sc)}
  <p class="swipe-hint">Desliza la semana hacia los lados para ver los demás días.</p>
  <div class="week-wrap" id="week-wrap"><div class="week">
    <div class="wk-h"></div>${DAYS.map((d,i)=>`<div class="wk-h ${i===t?'today':''}" data-col="${i}">${d}<div class="wk-focus" title="${esc(sc.onDay[i].map(subjName).join(', '))}">${sc.onDay[i].map(id=>`<i class="dot" style="background:${subjColor(id)}"></i>`).join('')}</div></div>`).join('')}
    <div class="wk-times" style="height:${H}px">${times}</div>${cols}
    <div class="wk-foot first">Sueño</div>${DAYS.map((d,i)=>`<div class="wk-foot" title="Noche del ${DAYS_LONG[i].toLowerCase()}: ${fmt(sc.bed)} a ${fmt(sc.wakeOf((i+1)%7))}"><b>${hnum(sc.sleepNight[i])} h</b>${fmt(sc.bed)}–${fmt(sc.wakeOf((i+1)%7))}</div>`).join('')}
  </div></div>`;
  /* En celular, abre la semana mostrando el día de hoy */
  const ww=$('#week-wrap');
  if(ww&&ww.scrollWidth>ww.clientWidth+4){if(prevLeft!=null)ww.scrollLeft=prevLeft;else{const h=$(`[data-col="${t}"]`,ww);if(h)ww.scrollLeft=Math.max(0,h.offsetLeft-48)}}
  renderReminders();refreshPlaced();
}

/* recordatorios en Google Calendar */
function stamp(dt,min){min=Math.min(min,1439);return dt.getFullYear()+pad2(dt.getMonth()+1)+pad2(dt.getDate())+'T'+pad2(Math.floor(min/60))+pad2(min%60)+'00'}
function nextDate(day){const t=new Date();t.setDate(t.getDate()+((day-todayIdx()+7)%7));return t}
function reminderEvents(){
  const p=S.plan,r=p.remind;const evs=[];
  const until=String(r.until||defaultUntil()).replace(/-/g,'')+'T235959';
  let tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
  for(let d=0;d<7;d++){
    const st=S.sched.busy[d].filter(b=>b.kind==='study');if(!st.length)continue;
    if(r.mode==='day'){
      const names=[...new Set(st.map(b=>subjName(b.subjectId)))];
      evs.push({key:'d'+d,day:d,start:st[0].start,end:st[0].start+15,title:'Hoy estudias: '+names.join(', '),details:'Tus bloques de hoy:\n'+st.map(b=>fmt(b.start)+'–'+fmt(b.end)+'  '+subjName(b.subjectId)).join('\n')});
    }else for(const b of st)evs.push({key:'b'+d+'-'+b.start,day:d,start:b.start,end:b.end,title:'Estudiar '+subjName(b.subjectId),details:'Bloque de trabajo independiente. Empieza con 2 minutos si te cuesta arrancar.'});
  }
  if(p.commute&&p.commute.on)for(const c of S.sched.commuteInfo)evs.push({key:'c'+c.d,day:c.d,start:c.leave,end:c.leave+c.min,title:'Salir para la U · '+MODE_SHORT[c.mode]+(c.pyp?' (pico y placa)':''),details:`Tu primera clase es a las ${fmt(c.first)}. Si sales a esta hora llegas a las ${fmt(c.arrive)}.`});
  if(p.extra&&p.extra.on)for(const x of S.sched.actInfo){if(x.miss)continue;const a=(p.extra.items||[]).find(i=>i.id===x.id);if(!a)continue;
    evs.push({key:'a'+x.id+'-'+x.d,day:x.d,start:x.start,end:x.end,title:a.name||'Actividad',details:(+a.travel?`Sal ${a.travel} min antes para llegar a tiempo. `:'')+'Tiempo apartado en tu plan de Cuaderno de Foco.'})}
  evs.sort((a,b)=>a.day-b.day||a.start-b.start);
  if(r.streakOn&&r.streakAt)evs.push({key:'streak',daily:true,start:toMin(r.streakAt),end:toMin(r.streakAt)+10,title:'¿Ya cuidaste tu racha de estudio?',details:`Tu meta diaria es ${goal()} min. Si aún no la cumples, haz una sesión corta o repasa tarjetas.`});
  return evs.map(e=>{
    const dt=e.daily?new Date():nextDate(e.day);
    const q=new URLSearchParams({action:'TEMPLATE',text:e.title,dates:stamp(dt,e.start)+'/'+stamp(dt,e.end),details:e.details+(APP_URL?'\n\nAbre Cuaderno de Foco: '+APP_URL:''),recur:'RRULE:FREQ='+(e.daily?'DAILY':'WEEKLY')+';UNTIL='+until});
    if(tz)q.set('ctz',tz);
    e.url='https://calendar.google.com/calendar/render?'+q.toString();
    e.sig=e.key+'|'+e.title+'|'+e.start+'|'+until;return e});
}
function renderReminders(){
  const el=$('#recordatorios');if(!el)return;const r=S.plan.remind;const added=lsGet('cf.added',{});
  const evs=reminderEvents();const done=evs.filter(e=>added[e.sig]).length;
  el.innerHTML=`
    <div class="row between"><div><span class="label">Notificaciones</span><h2>Recordatorios en tu celular</h2></div><span class="small muted num">${done}/${evs.length} agregados</span></div>
    <p class="muted" style="margin-top:6px;max-width:70ch">Esta página no puede enviar notificaciones sola. Por eso tu plan se pasa a Google Calendar, que sí suena en tu celular. Cada evento se repite cada semana hasta el fin del semestre.</p>
    <ol class="steps">
      <li>Instala <b>Google Calendar</b> en tu celular con tu cuenta de Google. Funciona en Android y en iPhone.</li>
      <li>Pulsa <b>Agregar</b> en cada aviso de abajo. Se abre Google Calendar con el evento listo: revisa que tenga una notificación (por ejemplo 10 min antes) y pulsa <b>Guardar</b>.</li>
      <li>Es más cómodo hacerlo desde el computador. Los avisos llegan igual a tu celular.</li>
    </ol>
    <div class="opts">
      <label class="field"><span>Tipo de aviso</span><select id="r-mode" data-r="mode"><option value="day" ${r.mode==='day'?'selected':''}>Uno por día (resumen)</option><option value="block" ${r.mode==='block'?'selected':''}>Uno por bloque de estudio</option></select></label>
      <label class="field"><span>Fin del semestre</span><input type="date" id="r-until" data-r="until" value="${esc(r.until||defaultUntil())}"></label>
      <label class="field"><span>Aviso diario de racha</span><select id="r-streak" data-r="streakOn"><option value="1" ${r.streakOn?'selected':''}>Sí</option><option value="0" ${r.streakOn?'':'selected'}>No</option></select></label>
      <label class="field"><span>Hora del aviso de racha</span><input type="time" id="r-at" data-r="streakAt" value="${esc(r.streakAt||'20:30')}"></label>
    </div>
    <div class="rem-list">${evs.map(e=>`<div class="rem ${added[e.sig]?'done':''}"><span class="t">${e.daily?'Todos los días':DAYS_LONG[e.day]} · ${fmt(e.start)}</span><span class="ttl" title="${esc(e.title)}">${esc(e.title)}</span><a class="btn sm ${added[e.sig]?'':'primary'}" href="${esc(e.url)}" target="_blank" rel="noopener" data-add="${esc(e.sig)}">${added[e.sig]?'Agregado':'Agregar'}</a></div>`).join('')||'<p class="small muted">Aún no hay bloques de estudio en tu horario.</p>'}</div>
    <p class="small muted" style="margin-top:10px">Si cambias tu horario, borra en Google Calendar los eventos anteriores ("Todos los eventos" de la serie) y agrega los nuevos.</p>`;
}

const vh=$('#v-horario');
vh.addEventListener('input',e=>{
  const el=e.target;const p=S.plan;
  const br=el.closest('[data-bi-row]');
  if(br&&el.dataset.bf&&S.draft){const c=S.draft.classes[+br.dataset.biRow];if(el.dataset.bf==='on')c.on=el.checked;else c.nocount=!el.checked;renderImport();return}
  const dr=el.closest('[data-dr]');
  if(dr&&el.dataset.df){const s=S.draft.subjects[+dr.dataset.dr];const f=el.dataset.df;s[f]=f==='name'?el.value:(+el.value||0);return}
  const row=el.closest('.subj-row[data-sid]');
  if(row&&el.dataset.f){const s=subj(row.dataset.sid);const f=el.dataset.f;s[f]=f==='name'?el.value:(+el.value||0);editPlan();return}
  const fr=el.closest('[data-fid]');
  if(fr&&el.dataset.g){const fx=p.fixed.find(x=>x.id===fr.dataset.fid);const g=el.dataset.g;
    if(g==='day')fx.day=+el.value;else if(g==='start'){if(el.value)fx.start=toMin(el.value)}else if(g==='end'){if(el.value)fx.end=toMin(el.value)}
    else if(g==='count'){fx.nocount=!el.checked;S.plan.example=false;save('plan');renderHorario();return}
    else if(g==='room'){fx.room=el.value;if(isLab(fx.room,fx.label)&&!fx.nocount){fx.nocount=true;const c=$('#fc-'+fx.id);if(c)c.checked=false;fr.classList.add('off')}}
    else if(g==='what'){const [k,val]=el.value.split(':');if(k==='sub'){fx.subjectId=val;fx.label=''}else{fx.subjectId=null;fx.label=val}}
    if(fx.end<=fx.start)return;editPlan();return}
  if(el.dataset.ex==='on'){p.extra.on=el.checked;p.example=false;save('plan');renderWeek();renderExtras();return}
  if(el.dataset.ef){const row=el.closest('[data-eid]');const a=(p.extra.items||[]).find(x=>x.id===row.dataset.eid);if(!a)return;const f=el.dataset.ef;
    if(f==='dur'||f==='travel'){const v=+el.value;if(!(v>=0)||(f==='dur'&&v<15))return;a[f]=v}
    else if(f==='start'){if(!el.value)return;a.start=el.value}
    else a[f]=el.value;
    save('plan');renderWeek();if(f==='mode')renderExtras();return}
  if(el.dataset.cm){const cm=p.commute;const k=el.dataset.cm;
    if(k==='on'){cm.on=el.checked;p.example=false;save('plan');renderWeek();renderCommute();return}
    if(k==='mode'||k==='altMode'||k==='margin'){cm[k]=k==='margin'?+el.value:el.value;save('plan');renderWeek();renderCommute();return}
    if(k==='min'||k==='altMin'){const v=+el.value;if(!(v>=5))return;cm[k]=v;save('plan');renderWeek();renderCommuteDays();return}
  }
  if(el.dataset.cmf){const row=el.closest('[data-cmd]');const d=+row.dataset.cmd;if(!el.value)return;const cm=p.commute;cm.days=cm.days||{};const o=cm.days[d]||(cm.days[d]={});o[el.dataset.cmf]=el.value;save('plan');renderWeek();
    const info=S.sched.commuteInfo.find(c=>c.d===d);if(info){row.querySelector('[data-home]').textContent=fmt(info.home);const a=row.querySelector(`[data-cmauto="${el.dataset.cmf}"]`);if(a)a.hidden=false}return}
  if(el.dataset.cf){const c=(p.concentrate||[])[+el.closest('[data-ci]').dataset.ci];if(!c)return;c[el.dataset.cf]=el.value;save('plan');if(el.dataset.cf==='until')renderWeek();return}
  if(el.dataset.o){const o=el.dataset.o;let val=el.value;if(['leisure','maxPerDay','creditHours','weeks','block','freeDay'].includes(o))val=+val;if(/wake|bed/.test(o)&&!val)return;if((o==='creditHours'||o==='weeks')&&!(val>0))return;p[o]=val;editPlan();return}
  if(el.dataset.r){const k=el.dataset.r;let val=el.value;if(k==='streakOn')val=val==='1';if(k!=='streakOn'&&!val)return;p.remind[k]=val;save('plan');renderReminders()}
});
function editPlan(){S.plan.example=false;save('plan');renderWeek()}
vh.addEventListener('click',e=>{
  const p=S.plan;
  const add=e.target.closest('[data-add]');if(add){const a=lsGet('cf.added',{});a[add.dataset.add]=Date.now();lsSet('cf.added',a);setTimeout(renderReminders,300);return}
  const exa=e.target.closest('[data-exadd]');if(exa){const pr=EX_PRESETS[exa.dataset.exadd];const it={id:uid(),name:pr.name,dur:pr.dur,days:pr.days.slice(),mode:pr.mode,when:pr.when,start:pr.start,travel:pr.travel};p.extra.items=(p.extra.items||[]).concat(it);p.example=false;save('plan');renderWeek();renderExtras();const i=$('#ex-n-'+it.id);if(i){i.focus();i.select()}return}
  const exd=e.target.closest('[data-eday]');if(exd){const a=(p.extra.items||[]).find(x=>x.id===exd.closest('[data-eid]').dataset.eid);if(!a)return;const d=+exd.dataset.eday;a.days=(a.days||[]).includes(d)?a.days.filter(x=>x!==d):(a.days||[]).concat(d);save('plan');renderWeek();renderExtras();return}
  const exdel=e.target.closest('[data-edel]');if(exdel){const id=exdel.closest('[data-eid]').dataset.eid;p.extra.items=(p.extra.items||[]).filter(x=>x.id!==id);save('plan');renderWeek();renderExtras();return}
  const py=e.target.closest('[data-pyp]');if(py){const cm=p.commute;const d=+py.dataset.pyp;cm.pyp=(cm.pyp||[]).includes(d)?cm.pyp.filter(x=>x!==d):(cm.pyp||[]).concat(d);save('plan');renderWeek();renderCommute();return}
  const cma=e.target.closest('[data-cmauto]');if(cma){const d=+cma.closest('[data-cmd]').dataset.cmd;const o=(p.commute.days||{})[d];if(o)delete o[cma.dataset.cmauto];save('plan');renderWeek();renderCommuteDays();return}
  const ca=e.target.closest('[data-cadd]');if(ca){(p.concentrate=p.concentrate||[]).push({subjectId:ca.dataset.cadd,extra:3,until:'',note:''});p.example=false;save('plan');renderConc();renderWeek();return}
  const cs=e.target.closest('[data-cstep]');if(cs){const c=p.concentrate[+cs.closest('[data-ci]').dataset.ci];c.extra=Math.max(1,Math.min(10,(+c.extra||0)+(+cs.dataset.cstep)));save('plan');renderConc();renderWeek();return}
  const cdl=e.target.closest('[data-cdel]');if(cdl){p.concentrate.splice(+cdl.dataset.cdel,1);save('plan');renderConc();renderWeek();return}
  if(e.target.closest('#i-go'))return importSchedule();
  const mc=e.target.closest('[data-bi]');if(mc&&S.draft){const c=S.draft.classes[+mc.dataset.bi];c.on=!c.on;renderImport();return}
  if(e.target.closest('#i-apply'))return applyImport();
  if(e.target.closest('#i-cancel')){S.draft=null;renderImport();return}
  const stp=e.target.closest('[data-step]');if(stp){const s=subj(stp.closest('[data-sid]').dataset.sid);s.override=Math.max(0,Math.min(40,studyH(p,s)+(+stp.dataset.step)));editPlan();return}
  const au=e.target.closest('[data-auto]');if(au){const s=subj(au.closest('[data-sid]').dataset.sid);s.override=null;editPlan();return}
  if(e.target.closest('#add-subj')){const used=new Set(p.subjects.map(s=>s.color));const color=COLORS.find(c=>!used.has(c))||COLORS[p.subjects.length%COLORS.length];const s={id:uid(),name:'Nueva materia',credits:3,classHours:0,difficulty:2,color,override:null};p.subjects.push(s);p.example=false;save('plan');renderHorario();const i=$('#sn-'+s.id);if(i){i.focus();i.select()}return}
  const ds=e.target.closest('[data-del-subj]');if(ds){const id=ds.dataset.delSubj;p.subjects=p.subjects.filter(s=>s.id!==id);p.fixed=p.fixed.filter(f=>f.subjectId!==id);p.example=false;save('plan');renderHorario();return}
  if(e.target.closest('#add-fx')){p.fixed.push({id:uid(),day:0,start:8*60,end:10*60,subjectId:p.subjects[0]?p.subjects[0].id:null,label:p.subjects[0]?'':'Otro',room:''});p.example=false;save('plan');renderHorario();return}
  const df=e.target.closest('[data-del-fx]');if(df){p.fixed=p.fixed.filter(f=>f.id!==df.dataset.delFx);p.example=false;save('plan');renderHorario();return}
  if(e.target.closest('#clear-ex')){const ex=examplePlan();S.plan=Object.assign(ex,{example:false,subjects:[],fixed:[]});save('plan');renderHorario();return}
  if(e.target.closest('#reset-ex')){S.plan=examplePlan();save('plan');renderHorario();return}
});

/* ---------- ENFOQUE ---------- */
function persistF(){lsSet('cf.session',F)}
let tick=null,wakeLock=null,urgeTimer=null;
const CIRC=2*Math.PI*108;
function renderEnfoque(){
  const v=$('#v-enfoque');
  if(F.phase==='run'||F.phase==='pause')return renderRunning(v);
  if(F.phase==='break')return renderBreak(v);
  if(F.phase==='done')return renderDone(v);
  const p=S.plan;const firstConc=activeConc(p)[0];
  const sid=F.subjectId&&subj(F.subjectId)?F.subjectId:(firstConc?firstConc.subjectId:(p.subjects[0]&&p.subjects[0].id));
  const dur=F.dur||25;const ch=F.checks||{};
  const checks=[['phone','Celular lejos o boca abajo, en silencio'],['tabs','Cerré pestañas y apps que no necesito'],['water','Tengo agua y lo que voy a usar a la mano'],['goal','Sé exactamente qué voy a hacer']];
  const prog=dayProg(dateKey()),g=goal();
  v.innerHTML=`
  <div><span class="label">Enfoque</span><h1>Una sesión <span class="mark">a la vez</span></h1></div>
  <div class="focus">
    <div class="card stage" style="justify-items:stretch;text-align:left">
      <label class="field"><span>Materia</span><select id="f-subj">${p.subjects.map(s=>`<option value="${s.id}" ${s.id===sid?'selected':''}>${esc(s.name)}</option>`).join('')}<option value="" ${!sid?'selected':''}>Otra cosa</option></select></label>
      <label class="field"><span>¿Qué vas a hacer exactamente?</span><input type="text" id="f-task" value="${esc(F.task||'')}" placeholder="Ej.: resolver los ejercicios 3.1 a 3.6 del taller" maxlength="140"></label>
      <div class="field"><span>Duración</span><div class="durs">${[[2,'2 min · solo arrancar'],[25,'25 min'],[50,'50 min'],[90,'90 min']].map(([m,l])=>`<button class="chip" aria-pressed="${dur===m}" data-dur="${m}">${l}</button>`).join('')}</div></div>
      <div class="field"><span>Antes de empezar</span><div class="checks">${checks.map(([k,l])=>`<label><input type="checkbox" id="ck-${k}" data-ck="${k}" ${ch[k]?'checked':''}>${l}</label>`).join('')}</div></div>
      <button class="btn primary big" id="f-start">Empezar ${dur} min</button>
      <p class="small muted" id="f-msg"></p>
    </div>
    <div class="view" style="gap:18px">
      <div class="card"><div class="row" style="gap:12px;flex-wrap:nowrap">${flameSvg(streakNow(),isMet(dateKey())).replace('class="flame','style="width:44px;height:44px;flex:none" class="flame')}<div><b>${isMet(dateKey())?'Racha asegurada hoy':`${Math.max(0,g-prog)} min para cuidar tu racha`}</b><div class="bar" style="margin-top:6px;width:180px;max-width:100%"><i style="width:${Math.min(100,Math.round(prog/g*100))}%"></i></div></div></div></div>
      <div class="card"><h3>Cómo funciona</h3><ul class="small muted" style="padding-left:18px;margin:8px 0 0;display:grid;gap:6px">
        <li>Escribe una tarea concreta. "Estudiar física" es vago; "hacer 4 problemas de dinámica" se puede empezar ya.</li>
        <li>Si te da pereza, usa <b>2 minutos</b>. Al terminar te propongo seguir; casi siempre sigues.</li>
        <li>Si te dan ganas de abrir reels, pulsa <b>Me quiero distraer</b>: te acompaño a dejar pasar la ola.</li>
        <li>Si sales de esta pestaña, lo cuento. Sin castigo, solo para que lo notes.</li></ul></div>
    </div>
  </div>`;
}
const ve=$('#v-enfoque');
ve.addEventListener('click',e=>{
  const d=e.target.closest('[data-dur]');if(d){readSetup();F.dur=+d.dataset.dur;persistF();renderEnfoque();return}
  if(e.target.closest('#f-start'))return startSession();
  if(e.target.closest('#f-pause'))return togglePause();
  if(e.target.closest('#f-stop'))return finishSession(true);
  if(e.target.closest('#f-urge'))return openUrge();
  if(e.target.closest('#f-park'))return park();
  if(e.target.closest('#f-back'))return hideAway();
  if(e.target.closest('#f-continue'))return extendTo(25);
  if(e.target.closest('#f-break'))return startBreak();
  if(e.target.closest('#f-again')){F={phase:'setup',subjectId:F.subjectId,dur:F.dur>2?Math.min(F.dur,90):25,task:'',checks:F.checks||{}};persistF();return renderEnfoque()}
  if(e.target.closest('#f-home')){F={phase:'setup'};persistF();return setTab('hoy')}
  if(e.target.closest('#f-reels'))return setTab('reels');
});
ve.addEventListener('change',e=>{if(e.target.dataset.ck){F.checks=F.checks||{};F.checks[e.target.dataset.ck]=e.target.checked;persistF()}});
ve.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='f-park-in'){e.preventDefault();park()}if(e.key==='Enter'&&e.target.id==='f-task'){e.preventDefault();startSession()}});
function readSetup(){const s=$('#f-subj'),t=$('#f-task');if(s)F.subjectId=s.value||null;if(t)F.task=t.value.trim()}
function startSession(){
  readSetup();
  if(!F.task){$('#f-msg').textContent='Escribe qué vas a hacer. Una tarea concreta es más fácil de empezar.';$('#f-task').focus();return}
  const dur=F.dur||25;
  Object.assign(F,{phase:'run',dur,endAt:Date.now()+dur*60000,startedAt:Date.now(),leaves:0,awaySec:0,urges:0,twoMin:dur===2,extended:false});
  persistF();requestWake();beep(660,.08);renderEnfoque();
}
function remaining(){return F.phase==='pause'?F.remainMs:F.endAt-Date.now()}
function renderRunning(v){
  const total=F.dur*60000;const rem=remaining();
  v.innerHTML=`
  <div class="focus">
    <div class="card stage">
      <span class="label">${esc(F.subjectId?subjName(F.subjectId):'Sesión libre')}${F.twoMin?' · arranque de 2 min':''}</span>
      <p class="task-line">${esc(F.task)}</p>
      <div id="f-away" style="width:100%"></div>
      <div class="ring"><svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="108" fill="none" stroke="var(--surface-2)" stroke-width="15"/><circle id="f-arc" cx="120" cy="120" r="108" fill="none" stroke="url(#gSun)" stroke-width="15" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC*(1-rem/total)}"/></svg>
        <div class="time"><b id="f-time">${mmss(rem)}</b><span class="small muted">${F.phase==='pause'?'En pausa':'Concéntrate en una sola cosa'}</span></div></div>
      <div class="row" style="justify-content:center"><button class="btn hl big" id="f-urge">Me quiero distraer</button><button class="btn big" id="f-pause">${F.phase==='pause'?'Reanudar':'Pausa'}</button><button class="btn ghost big" id="f-stop">Terminar</button></div>
    </div>
    <div class="view" style="gap:18px">
      <div class="card"><h3>¿Se te cruzó otra idea?</h3><p class="small muted">Anótala aquí y vuelve a la tarea. La verás después en Hoy.</p>
        <div class="row" style="margin-top:8px;flex-wrap:nowrap"><input type="text" id="f-park-in" placeholder="Ej.: responder el grupo del proyecto" maxlength="120"><button class="btn" id="f-park">Anotar</button></div></div>
      <div class="card"><span class="label">Esta sesión</span><div class="row" style="margin-top:8px;gap:18px">
        <span><b class="num">${F.leaves||0}</b> <span class="small muted">salidas de la app</span></span><span><b class="num">${F.urges||0}</b> <span class="small muted">tentaciones vencidas</span></span></div></div>
    </div>
  </div>`;
  startTick();
}
function startTick(){clearInterval(tick);tick=setInterval(()=>{
  if(F.phase==='run'){const rem=remaining();if(rem<=0){clearInterval(tick);return onTimeUp()}const t=$('#f-time'),a=$('#f-arc');if(t)t.textContent=mmss(rem);if(a)a.setAttribute('stroke-dashoffset',CIRC*(1-rem/(F.dur*60000)));document.title=mmss(rem)+' · Cuaderno de Foco'}
  else if(F.phase==='break'){const rem=F.breakEnd-Date.now();const t=$('#f-time');if(t)t.textContent=mmss(rem);if(rem<=0){clearInterval(tick);beep(880,.15);notify('Se acabó el descanso','¿Arrancas otra sesión?');document.title='Cuaderno de Foco';const m=$('#b-msg');if(m)m.textContent='Se acabó el descanso. ¿Otra sesión?'}}
  else{clearInterval(tick);document.title='Cuaderno de Foco'}
},250)}
function togglePause(){if(F.phase==='run'){F.remainMs=remaining();F.phase='pause'}else{F.endAt=Date.now()+F.remainMs;F.phase='run'}persistF();renderEnfoque()}
function onTimeUp(){
  beep(880,.12);setTimeout(()=>beep(1100,.14),180);
  notify(F.twoMin&&!F.extended?'Ya arrancaste':'Sesión terminada',F.twoMin&&!F.extended?'¿Sigues 25 minutos más?':`${F.dur} min de foco en ${F.subjectId?subjName(F.subjectId):'tu tarea'}. Toma un descanso.`);
  if(F.twoMin&&!F.extended){F.remainMs=0;F.phase='pause';persistF();renderEnfoque();
    $('#f-away').innerHTML=`<div class="banner">Ya arrancaste, que era lo difícil. ¿Sigues 25 minutos más?<span class="row"><button class="btn" id="f-continue">Sí, sigo</button><button class="btn ghost" id="f-stop">Por ahora no</button></span></div>`;return}
  finishSession(false);
}
function extendTo(m){F.dur=F.dur+m;F.twoMin=false;F.extended=true;F.endAt=Date.now()+m*60000;F.phase='run';persistF();renderEnfoque()}
function finishSession(early){
  const total=F.dur*60000;const rem=Math.max(0,F.phase==='pause'?F.remainMs:F.endAt-Date.now());
  const min=Math.round((total-rem)/60000);
  const st=dayStat(dateKey());
  if(min>=1){st.min+=min;st.sessions+=1;addXp(min+(early?0:10))}
  st.leaves+=F.leaves||0;pruneStats();markProgress();save('stats');
  F.phase='done';F.doneMin=min;F.early=early;persistF();releaseWake();document.title='Cuaderno de Foco';renderChrome();renderEnfoque();
}
function renderDone(v){
  const n=peekDay(dateKey()).sessions||0;const g=goal(),prog=dayProg(dateKey());
  v.innerHTML=`<div class="card stage">
    <span class="label">${F.early?'Sesión terminada':'Sesión completa'}</span>
    <h1>${F.doneMin} minutos de foco${F.doneMin>=25?'. Bien hecho.':'.'}</h1>
    <p class="muted">${esc(F.task||'')}</p>
    <div class="row" style="justify-content:center;gap:24px"><span><b class="num">+${F.doneMin+(F.early?0:10)}</b> <span class="small muted">XP</span></span><span><b class="num">${F.urges||0}</b> <span class="small muted">tentaciones vencidas</span></span><span><b class="num">${F.leaves||0}</b> <span class="small muted">salidas</span></span></div>
    <p class="small ${isMet(dateKey())?'':'muted'}">${isMet(dateKey())?`Racha de ${streakNow()} días asegurada hoy.`:`Te faltan ${Math.max(0,g-prog)} min para mantener tu racha.`}</p>
    <div class="row" style="justify-content:center"><button class="btn primary big" id="f-break">Descanso de ${n%4===0&&n>0?15:5} min</button><button class="btn big" id="f-again">Otra sesión</button><button class="btn ghost big" id="f-home">Volver a Hoy</button></div>
  </div>`;
}
function startBreak(){const n=peekDay(dateKey()).sessions;const m=n%4===0&&n>0?15:5;F.phase='break';F.breakEnd=Date.now()+m*60000;persistF();renderEnfoque()}
function renderBreak(v){
  v.innerHTML=`<div class="card stage"><span class="label">Descanso</span><div class="ring" style="width:min(200px,60vw)"><svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="108" fill="none" stroke="color-mix(in srgb,var(--hl) 65%,var(--surface))" stroke-width="15"/></svg><div class="time"><b id="f-time">${mmss(F.breakEnd-Date.now())}</b></div></div>
  <p class="muted" id="b-msg" style="max-width:44ch">Levántate, estira el cuello, toma agua, mira por la ventana. Si abres Instagram o TikTok ahora, el descanso se come la siguiente sesión.</p>
  <div class="row" style="justify-content:center"><button class="btn big" id="f-reels">Repasar con Reels de estudio</button><button class="btn primary big" id="f-again">Otra sesión</button><button class="btn ghost big" id="f-home">Terminar por hoy</button></div></div>`;
  startTick();
}
function park(){const i=$('#f-park-in');if(!i||!i.value.trim())return;S.stats.parking=S.stats.parking||[];S.stats.parking.unshift({text:i.value.trim().slice(0,120),t:Date.now()});S.stats.parking=S.stats.parking.slice(0,30);save('stats');i.value='';i.placeholder='Anotado. De vuelta a la tarea.'}
function openUrge(){
  const o=$('#overlay');o.hidden=false;o.className='overlay';
  o.innerHTML=`<div class="overlay-in"><span class="label">Las ganas son una ola</span><h2>Suben, llegan al pico y bajan solas. Respira conmigo unos segundos.</h2>
  <div class="breath" id="u-b">Inhala</div><p class="small muted" id="u-c">Ciclo 1 de 4</p>
  <div class="row" style="justify-content:center" id="u-acts"><button class="btn ghost" id="u-skip" disabled>Ya pasó</button></div></div>`;
  let step=0,cycle=0;const b=$('#u-b'),c=$('#u-c');
  const seq=[['Inhala',4000,1.35],['Sostén',4000,1.35],['Exhala',6000,1]];
  const run=()=>{if(o.hidden)return;const [t,ms,sc]=seq[step];b.textContent=t;b.style.transitionDuration=(ms/1000)+'s';b.style.transform='scale('+sc+')';
    urgeTimer=setTimeout(()=>{step=(step+1)%3;if(step===0){cycle++;c.textContent='Ciclo '+Math.min(4,cycle+1)+' de 4';if(cycle>=4)return urgeChoices()}run()},ms)};
  run();setTimeout(()=>{const s=$('#u-skip');if(s)s.disabled=false},12000);
  o.onclick=e=>{
    if(e.target.closest('#u-skip'))urgeChoices();
    else if(e.target.closest('#u-stay'))closeUrge(true);
    else if(e.target.closest('#u-reels')){closeUrge(true);if(F.phase==='run')togglePause();setTab('reels')}
    else if(e.target.closest('#u-pause')){closeUrge(false);if(F.phase==='run')togglePause()}
  };
}
function urgeChoices(){clearTimeout(urgeTimer);const a=$('#u-acts'),b=$('#u-b');if(b){b.textContent='Bien';b.style.transform='scale(1)'}
  $('#u-c').textContent='¿Cómo sigues?';
  a.innerHTML=`<button class="btn primary big" id="u-stay">Vuelvo a mi tarea</button><button class="btn big" id="u-reels">5 min de Reels de estudio</button><button class="btn ghost big" id="u-pause">Necesito una pausa</button>`}
function closeUrge(won){clearTimeout(urgeTimer);const o=$('#overlay');o.hidden=true;o.innerHTML='';o.onclick=null;
  if(won){F.urges=(F.urges||0)+1;dayStat(dateKey()).urges+=1;addXp(5);save('stats');persistF()}
  if(S.tab==='enfoque')renderEnfoque()}
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(F.phase==='run')hiddenAt=Date.now();return}
  if(F.phase==='run'&&hiddenAt){const sec=Math.round((Date.now()-hiddenAt)/1000);hiddenAt=0;if(sec>=3){F.leaves=(F.leaves||0)+1;F.awaySec=(F.awaySec||0)+sec;persistF();if(S.tab==='enfoque'){renderEnfoque();showAway(sec)}}}
  if(F.phase==='run')requestWake();
});
function showAway(sec){const a=$('#f-away');if(a)a.innerHTML=`<div class="banner">Estuviste fuera ${sec<60?sec+' s':Math.round(sec/60)+' min'}. Aquí sigue tu tarea.<button class="btn" id="f-back">Volver</button></div>`}
function hideAway(){const a=$('#f-away');if(a)a.innerHTML=''}
async function requestWake(){try{if(navigator.wakeLock&&!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null})}}catch(e){}}
function releaseWake(){try{wakeLock&&wakeLock.release()}catch(e){}wakeLock=null}
let actx=null;
function beep(f,d){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=f;o.connect(g);g.connect(actx.destination);g.gain.setValueAtTime(.001,actx.currentTime);g.gain.exponentialRampToValueAtTime(.2,actx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+d+.2);o.start();o.stop(actx.currentTime+d+.25)}catch(e){}}

/* ---------- REELS ----------
   La lógica de tarjetas, repasos y orden del feed vive en js/reels-engine.js. */
let feedKey='',feedList=[],feedMap={},feedSeq=0,pickedFiles=[],genDraft=null,genBusy=false,tplLast=null;
const newPerDay=()=>S.stats.newPerDay||20;
function allDecks(){const ds=Object.values(S.decks);return ds.length?ds:[exampleDeck.cached||(exampleDeck.cached=exampleDeck())]}
function deckKey(){return S.filter+'|'+allDecks().map(d=>d.id+':'+d.items.length).join(',')}
function renderReels(){
  const v=$('#v-reels');
  v.innerHTML=`
  <div class="row between" style="align-items:end"><div><span class="label">Reels de estudio</span><h1>Desliza, pero <span class="mark">aprendiendo</span></h1></div><span class="small muted" id="r-count"></span></div>
  <div class="reels">
    <div class="view" style="gap:12px">
      <div class="row" id="r-filter"></div>
      <div class="feed" id="feed" tabindex="0" aria-label="Tarjetas de estudio"></div>
      <p class="small muted">Desliza hacia arriba para la siguiente. En el computador: flechas ↑ ↓, espacio para voltear y teclas 1 a 4 para calificar. Cada 2 tarjetas repasadas suman 1 min a tu racha.</p>
    </div>
    <div class="view" style="gap:18px" id="r-side"></div>
  </div>`;
  renderReelsSide();feedKey='';maybeRebuildFeed(true);
}
function renderFilter(){
  const ds=allDecks();const subs=[...new Set(ds.map(d=>d.subjectId))];const el=$('#r-filter');if(!el)return;
  el.innerHTML=`<button class="chip" data-filter="all" aria-pressed="${S.filter==='all'}">Todo</button>`+subs.map(id=>`<button class="chip" data-filter="${esc(id)}" aria-pressed="${S.filter===id}"><i class="dot" style="background:${subjColor(id)}"></i>${esc(subj(id)?subjName(id):'Otra')}</button>`).join('');
}
function maybeRebuildFeed(force){
  const key=deckKey();renderFilter();
  if(!force&&key===feedKey)return;feedKey=key;
  const use=allDecks().filter(d=>S.filter==='all'||d.subjectId===S.filter);
  const focus=new Set(activeConc(S.plan).map(c=>c.subjectId));
  const r=ReelsEngine.buildFeed(use,{focus,newLimit:Math.max(0,newPerDay()-(peekDay(dateKey()).newCards||0))});
  feedList=[];feedMap={};
  const feed=$('#feed');if(!feed)return;
  feed.innerHTML=r.list.map(x=>reelHtml(addEntry(x))).join('')+`<section class="reel"><div class="feed-empty"><h2>${r.list.length?'Llegaste al final':'Nada por repasar ahora'}</h2><p style="opacity:.8;max-width:40ch">${r.freshTotal>r.freshCount?`Quedan ${r.freshTotal-r.freshCount} tarjetas nuevas para los próximos días. `:''}Sube más material o crea un problema con variables para seguir practicando.</p><div><button class="btn hl" data-top>Volver arriba</button></div></div></section>`;
  feed.scrollTop=0;
  const c=$('#r-count');if(c)c.textContent=`${r.dueCount} por repasar · ${r.freshCount} nuevas hoy`;
}
function addEntry(x){const e={k:'r'+(++feedSeq),d:x.deck,it:x.item,extra:x.extra};feedMap[e.k]=e;feedList.push(e);return e}
function instanceOf(it){
  try{
    if(it.tpl)return ReelsEngine.instantiate(it.tpl);
    if(it.gen&&typeof it.gen==='object')return ReelsEngine.instantiateFormula(it.gen);
  }catch(err){return null}
  return {q:it.q,hint:it.hint,solution:it.solution,answer:it.answer,num:ReelsEngine.parseNumber(it.answer),tol:0.02};
}
const KIND={card:'Flashcard',cloze:'Completa',problem:'Problema'};
function reelHtml(e){
  const it=e.it;const isP=it.type==='problem',isC=it.type==='cloze';const mc=isC&&it.options&&it.options.length>1;
  let body;
  if(isP){
    const x=e.inst=instanceOf(it)||{q:'No pude generar los datos de este problema.',num:NaN};
    body=`<div class="reel-q">${esc(x.q)}</div>
      <div class="reel-hint" data-hint hidden><b>Pista.</b> ${esc(x.hint||'Sin pista.')}</div>
      <div class="reel-a" data-sol hidden><b>Solución</b>\n${esc(x.solution||'')}${x.answer&&!/Respuesta:/.test(x.solution||'')?`\n\nRespuesta: ${esc(x.answer)}`:''}</div>
      ${isFinite(x.num)?`<div class="row" style="flex-wrap:nowrap"><input type="text" inputmode="decimal" id="ans-${e.k}" data-ans-in placeholder="Tu resultado (solo el número)" autocomplete="off"><button class="btn" data-check>Comprobar</button></div><div class="fb" data-fb hidden></div>`:''}`;
  }else if(isC){
    body=`<div class="reel-q">${esc(it.q).replace('_____','<span class="blank">_____</span>')}</div>
      ${mc?`<div class="opts-mc">${it.options.map((o,j)=>`<button class="btn opt" data-opt="${j}">${esc(o)}</button>`).join('')}</div>`:`<span class="tap" data-taphint>Toca la tarjeta para ver la respuesta</span>`}
      <div class="reel-a" data-ans hidden><b>${esc(it.a)}</b>${it.full?`\n${esc(it.full)}`:''}</div>`;
  }else{
    body=`<div class="reel-q">${esc(it.q)}</div><div class="reel-a" data-ans hidden>${esc(it.a)}</div><span class="tap" data-taphint>Toca la tarjeta para ver la respuesta</span>`;
  }
  const pv=ReelsEngine.srs.preview(it.srs);
  return `<section class="reel" data-k="${e.k}"><div class="reel-card">
    <div class="reel-top"><span class="row" style="gap:8px;min-width:0;flex-wrap:nowrap"><i class="dot" style="background:${subjColor(e.d.subjectId)}"></i><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.d.name)}</span></span>
      <span class="row" style="gap:6px;flex-wrap:nowrap">${!it.srs?'<span class="kind new">Nueva</span>':''}${e.extra?'<span class="kind">Repaso extra</span>':''}${e.again?'<span class="kind">Otra vez</span>':''}<span class="kind ${isP?'p':''}">${KIND[it.type]||'Tarjeta'}</span></span></div>
    <div class="reel-body" ${!isP&&!mc?'data-flip':''}>${body}</div>
    <div class="reel-actions">${isP?`<button class="btn" data-show-hint>Pista</button><button class="btn" data-show-sol>Ver solución</button>`:''}</div>
    <div class="rates" data-rates hidden>${['Otra vez','Difícil','Bien','Fácil'].map((l,g)=>`<button class="btn rate r${g}" data-rate="${g}"><b>${l}</b><small>${pv[g]}</small></button>`).join('')}</div>
  </div></section>`;
}
function reveal(sec,suggest){const r=$('[data-rates]',sec);if(!r)return;r.hidden=false;$$('[data-rate]',r).forEach(b=>b.classList.toggle('sug',+b.dataset.rate===suggest))}
function flip(sec){const a=$('[data-ans]',sec);if(!a||!a.hidden)return;a.hidden=false;const t=$('[data-taphint]',sec);if(t)t.hidden=true;reveal(sec,-1)}
function chooseOpt(sec,e,j){
  if(e.chosen!=null)return;e.chosen=j;const it=e.it;const ok=it.options[j]===it.a;
  $$('[data-opt]',sec).forEach(b=>{const v=it.options[+b.dataset.opt];if(v===it.a)b.classList.add('ok');else if(+b.dataset.opt===j)b.classList.add('bad');b.disabled=true});
  const a=$('[data-ans]',sec);if(a)a.hidden=false;reveal(sec,ok?2:0);
}
function checkProblem(sec,e){
  const inp=$('[data-ans-in]',sec),fb=$('[data-fb]',sec);if(!inp||!fb||!e.inst)return;
  const ok=ReelsEngine.checkNumber(inp.value,e.inst.num,e.inst.tol);
  fb.hidden=false;
  if(ok===null){fb.className='fb bad';fb.textContent='Escribe un número, por ejemplo 12,5.';return}
  fb.className='fb '+(ok?'ok':'bad');
  fb.textContent=ok?`Correcto: ${e.inst.answer}`:`No coincide. La respuesta es ${e.inst.answer}`;
  $('[data-sol]',sec).hidden=false;reveal(sec,ok?2:0);
}
function rateEntry(k,g){
  const e=feedMap[k];if(!e||e.rated)return;e.rated=true;
  const it=e.it;const wasNew=!it.srs;
  if(!e.extra||g===0)it.srs=ReelsEngine.srs.rate(it.srs,g,Date.now());
  const ds=dayStat(dateKey());ds.cards=(ds.cards||0)+1;if(wasNew)ds.newCards=(ds.newCards||0)+1;
  addXp(g===0?1:2);markProgress();save('stats');renderChrome();
  if(!e.d.example){feedKey=deckKey();save('deck_'+e.d.id)}
  const sec=$(`.reel[data-k="${k}"]`);
  if(sec)$$('[data-rate]',sec).forEach(b=>{b.disabled=true;b.classList.toggle('chosen',+b.dataset.rate===g)});
  /* lo que fallas vuelve a salir cuatro tarjetas más adelante */
  if(g===0&&!e.again&&sec){
    const copy=addEntry({deck:e.d,item:it,extra:false});copy.again=true;
    let ref=sec;for(let n=0;n<4&&ref.nextElementSibling&&ref.nextElementSibling.dataset.k;n++)ref=ref.nextElementSibling;
    ref.insertAdjacentHTML('afterend',reelHtml(copy));
  }
  const feed=$('#feed');if(feed)setTimeout(()=>feed.scrollBy({top:feed.clientHeight,behavior:'smooth'}),g===0?450:180);
}
function currentReel(){const feed=$('#feed');if(!feed)return null;const i=Math.round(feed.scrollTop/Math.max(1,feed.clientHeight));return feed.children[i]||null}

/* panel lateral */
function renderReelsSide(){
  const side=$('#r-side');if(!side)return;const p=S.plan;
  const subjOpts=sel=>p.subjects.map(s=>`<option value="${s.id}" ${s.id===sel?'selected':''}>${esc(s.name)}</option>`).join('')||'<option value="">Sin materias</option>';
  const decks=Object.values(S.decks).sort((a,b)=>b.createdAt-a.createdAt);const now=Date.now();
  const firstConc=activeConc(p)[0];const defSubj=firstConc?firstConc.subjectId:(p.subjects[0]&&p.subjects[0].id);
  const upload=genDraft?draftHtml():`
  <div class="card" style="display:grid;gap:12px">
    <div><h2>Sube tu material</h2><p class="small muted" style="margin-top:2px">Se procesa en tu dispositivo, sin internet.</p></div>
    <label class="field"><span>Materia</span><select id="g-subj">${subjOpts(defSubj)}</select></label>
    <div class="drop" data-for="g" role="button" tabindex="0"><b>Elige archivos o arrástralos aquí</b><span class="small muted">PDF con texto, TXT o Markdown</span><input type="file" id="g-file" multiple accept=".pdf,.txt,.md,.markdown,.csv,.html,.htm,text/plain" hidden></div>
    <div class="files" id="g-files">${pickedFiles.map(f=>`<span>${esc(f.name)}</span>`).join('')}</div>
    <label class="field"><span>O pega el texto</span><textarea id="g-text" rows="4" placeholder="Apuntes, un capítulo, definiciones, fórmulas…"></textarea></label>
    <div class="opts" style="margin:0;grid-template-columns:1fr 1fr">
      <label class="field"><span>Tarjetas</span><input type="number" id="g-nc" min="0" max="40" value="15"></label>
      <label class="field"><span>Problemas</span><input type="number" id="g-np" min="0" max="15" value="4"></label>
    </div>
    <div class="row"><button class="btn primary" id="g-go">Generar tarjetas</button></div>
    <p class="status" id="g-status" aria-live="polite"></p>
  </div>`;
  const tpl=`
  <div class="card" style="display:grid;gap:12px">
    <div><h2>Problema con variables</h2><p class="small muted" style="margin-top:2px">Escribe un problema una vez y la app te lo pone con datos distintos en cada repaso.</p></div>
    <label class="field"><span>Materia</span><select id="t-subj">${subjOpts(defSubj)}</select></label>
    <label class="field"><span>Plantilla</span><textarea id="t-src" rows="6" placeholder="Una viga simplemente apoyada de {L:4-8} m tiene una carga de {P:5-20} kN en el centro. ¿Cuál es el momento máximo?&#10;= P*L/4&#10;unidad: kN·m&#10;pista: En el centro, M = P·L/4."></textarea></label>
    <div class="row"><button class="btn" id="t-test">Probar</button><button class="btn primary" id="t-save">Guardar en mis mazos</button></div>
    <div id="t-out"></div>
    <details class="howto"><summary>Cómo escribir la plantilla</summary>
      <ul>
        <li><code>{L:4-8}</code> pone un número entero entre 4 y 8. <code>{m:2-10:0.5}</code> usa pasos de 0,5. <code>{n:2,5,10}</code> elige de esa lista.</li>
        <li>La línea que empieza con <code>=</code> es la fórmula de la respuesta. Usa <code>* / + - ^</code>, <code>sqrt()</code>, <code>sin()</code>, <code>cos()</code> (en grados), <code>pi</code>.</li>
        <li>Opcional: <code>unidad:</code>, <code>pista:</code>, <code>solución:</code> y <code>tolerancia: 2%</code>. En la pista o la solución, <code>{=P/2}</code> muestra un cálculo.</li>
      </ul></details>
  </div>`;
  const list=`
  <div class="card"><h2>Mis mazos</h2>
    <div class="decks">${decks.map(d=>{const due=d.items.filter(i=>i.srs&&i.srs.due<=now).length,nw=d.items.filter(i=>!i.srs).length;
      return `<div class="deck"><i class="dot" style="background:${subjColor(d.subjectId)}"></i><div style="min-width:0"><b>${esc(d.name)}</b><small class="muted">${d.items.length} tarjetas · ${due} por repasar · ${nw} nuevas</small></div><button class="btn sm danger" data-deldeck="${esc(d.id)}">Borrar</button></div>`}).join('')||'<p class="small muted">Aún no tienes mazos. El feed muestra un ejemplo de Estática.</p>'}</div>
    ${decks.length?`<details class="howto" style="margin-top:12px"><summary>Agregar una tarjeta a mano</summary>
      <div style="display:grid;gap:8px;margin-top:8px"><select id="n-deck">${decks.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select>
      <input type="text" id="n-q" placeholder="Pregunta" maxlength="300"><textarea id="n-a" rows="2" placeholder="Respuesta"></textarea><div class="row"><button class="btn" id="n-add">Agregar</button><span class="small muted" id="n-msg"></span></div></div></details>`:''}
    <label class="row small" style="margin-top:12px;gap:8px">Tarjetas nuevas por día <input type="number" id="n-perday" min="0" max="200" value="${newPerDay()}" style="width:80px"></label>
  </div>`;
  const how=`
  <div class="card howto"><h3>Cómo funciona el algoritmo</h3><ol>
    <li><b>Lee tu material</b> y busca preguntas que ya escribiste, glosarios ("Término: definición"), definiciones ("se denomina…", "X es un…"), listas, clasificaciones y fórmulas.</li>
    <li><b>Elige las frases más importantes</b> con palabras clave (algoritmo RAKE) y las convierte en tarjetas para completar, con opciones sacadas del mismo texto.</li>
    <li><b>Convierte cada fórmula en problemas</b> con números nuevos en cada repaso, y también despeja otras variables.</li>
    <li><b>Programa el repaso</b> con repetición espaciada (SM-2, el método de Anki): si dices "Bien", la tarjeta vuelve en días; si dices "Otra vez", vuelve en 10 minutos y a las 4 tarjetas en esta sesión.</li>
    <li><b>Ordena el feed</b>: primero lo que estás por olvidar, 3 repasos por cada tarjeta nueva, sin más de 2 seguidas de la misma materia, y con prioridad para tu materia a concentrar.</li>
  </ol></div>`;
  side.innerHTML=upload+tpl+list+how;
}
function draftHtml(){
  const d=genDraft;const sum=Object.entries(d.summary||{}).map(([k,v])=>`<span class="mile got">${v} ${esc(k)}</span>`).join('');
  return `<div class="card" style="display:grid;gap:10px">
    <div><span class="label">Revisa antes de guardar</span><h2>${d.items.length} tarjetas para ${esc(subjName(d.subjectId))}</h2></div>
    <label class="field"><span>Nombre del mazo</span><input type="text" id="g-title" value="${esc(d.title)}" maxlength="60"></label>
    <div class="chips">${sum}</div>
    ${d.formulas?'':'<p class="small muted">No encontré fórmulas en el material, así que no hay problemas automáticos. Puedes crear uno con variables abajo.</p>'}
    <div class="draft-list">${d.items.map((it,i)=>{
      const q=it.type==='problem'?(ReelsEngine.instantiateFormula(it.gen)||{q:it.gen.lhs+' = '+it.gen.rhs}).q:it.q;
      const a=it.type==='problem'?`Fórmula: ${it.gen.lhs} = ${it.gen.rhs} (cambia los datos en cada repaso)`:it.type==='cloze'?`${it.a}${it.options&&it.options.length?' · con opciones':''}`:it.a;
      return `<div class="draft-item"><div><b>${esc(KIND[it.type])} · ${esc(q)}</b><span>${esc(a)}</span></div><button class="iconbtn" data-gdel="${i}" aria-label="Quitar esta tarjeta">${X}</button></div>`}).join('')}</div>
    <details class="howto"><summary>Agregar una tarjeta a mano</summary><div style="display:grid;gap:8px;margin-top:8px"><input type="text" id="g-mq" placeholder="Pregunta" maxlength="300"><textarea id="g-ma" rows="2" placeholder="Respuesta"></textarea><div><button class="btn" id="g-madd">Agregar al borrador</button></div></div></details>
    <div class="row"><button class="btn primary big" id="g-save" ${d.items.length?'':'disabled'}>Guardar mazo</button><button class="btn ghost" id="g-discard">Descartar</button></div>
  </div>`;
}
async function generateDeck(){
  if(genBusy)return;
  const set=t=>{const s=$('#g-status');if(s)s.textContent=t};
  const subjectId=$('#g-subj').value;
  const nc=Math.max(0,Math.min(40,+$('#g-nc').value||0)),np=Math.max(0,Math.min(15,+$('#g-np').value||0));
  if(!nc&&!np){set('Pide al menos una tarjeta o un problema.');return}
  let text=$('#g-text').value.trim();const names=[];
  genBusy=true;const go=$('#g-go');if(go)go.disabled=true;
  try{
    for(const f of pickedFiles){names.push(f.name);text+='\n\n'+await ReelsEngine.extractText(f,set)}
    if(!text.trim()){set('Sube un archivo o pega texto primero.');return}
    set('Buscando definiciones, fórmulas y frases clave…');
    await new Promise(r=>setTimeout(r,30));
    const r=ReelsEngine.generate(text,{nCards:nc,nProblems:np});
    if(!r.items.length){set('No encontré suficiente texto para armar tarjetas. Si el PDF es escaneado (son fotos), copia el texto y pégalo.');return}
    const title=r.title||(names[0]?names[0].replace(/\.[^.]+$/,'').replace(/[_-]+/g,' '):subjName(subjectId));
    genDraft={subjectId,title,items:r.items,summary:r.summary,formulas:r.formulas,source:names.join(', ')||'Texto pegado'};
    pickedFiles=[];renderReelsSide();
  }catch(err){set(err&&err.message?err.message:'No pude leer el material.')}
  finally{genBusy=false;const g=$('#g-go');if(g)g.disabled=false}
}
function saveDraft(){
  const d=genDraft;if(!d||!d.items.length)return;
  const t=$('#g-title');const id=uid();
  S.decks[id]={id,name:((t&&t.value.trim())||d.title).slice(0,60),subjectId:d.subjectId,source:d.source,createdAt:Date.now(),items:d.items};
  save('deck_'+id);genDraft=null;S.filter=d.subjectId;
  renderReelsSide();maybeRebuildFeed(true);toast(`Mazo guardado: ${d.items.length} tarjetas.`);
}
function templateDeck(subjectId){
  let d=Object.values(S.decks).find(x=>x.tplDeck&&x.subjectId===subjectId);
  if(!d){const id=uid();d=S.decks[id]={id,tplDeck:true,name:'Problemas con variables · '+subjName(subjectId),subjectId,source:'Plantillas',createdAt:Date.now(),items:[]}}
  return d;
}
function testTemplate(saveIt){
  const out=$('#t-out');const src=($('#t-src')||{}).value||'';
  const r=ReelsEngine.parseTemplate(src);
  if(!r.ok){out.innerHTML=`<p class="tpl-err">${esc(r.error)}</p>`;return}
  const x=ReelsEngine.instantiate(r.tpl);
  if(!saveIt){out.innerHTML=`<div class="tpl-out"><b>Ejemplo:</b> ${esc(x.q)}\n\n<b>Respuesta:</b> ${esc(x.answer)}</div><p class="small muted" style="margin-top:6px">Pulsa "Probar" otra vez para ver otros datos.</p>`;return}
  const subjectId=$('#t-subj').value;const d=templateDeck(subjectId);
  d.items.push({id:uid(),type:'problem',tpl:r.tpl,q:r.tpl.statement});
  save('deck_'+d.id);$('#t-src').value='';out.innerHTML=`<p class="small" style="color:var(--good);font-weight:700">Guardado en "${esc(d.name)}".</p>`;
  feedKey='';maybeRebuildFeed(true);
  const side=$('#r-side');if(side){const keep=out.innerHTML;renderReelsSide();const o=$('#t-out');if(o)o.innerHTML=keep}
}

document.addEventListener('click',e=>{
  const dz=e.target.closest('.drop[data-for]');if(dz&&e.target.tagName!=='INPUT'){const inp=$('#'+dz.dataset.for+'-file');if(inp)inp.click();return}
  if(S.tab!=='reels')return;
  const f=e.target.closest('[data-filter]');if(f){S.filter=f.dataset.filter;maybeRebuildFeed(true);return}
  if(e.target.closest('[data-top]')){$('#feed').scrollTo({top:0,behavior:'smooth'});return}
  if(e.target.closest('#g-go'))return generateDeck();
  if(e.target.closest('#g-save'))return saveDraft();
  if(e.target.closest('#g-discard')){genDraft=null;renderReelsSide();return}
  const gd=e.target.closest('[data-gdel]');if(gd&&genDraft){genDraft.items.splice(+gd.dataset.gdel,1);const sc=$('.draft-list');const top=sc?sc.scrollTop:0;renderReelsSide();const s2=$('.draft-list');if(s2)s2.scrollTop=top;return}
  if(e.target.closest('#g-madd')&&genDraft){const q=$('#g-mq').value.trim(),a=$('#g-ma').value.trim();if(!q||!a)return;genDraft.items.push({id:uid(),type:'card',q,a,how:'a mano'});renderReelsSide();return}
  if(e.target.closest('#t-test'))return testTemplate(false);
  if(e.target.closest('#t-save'))return testTemplate(true);
  if(e.target.closest('#n-add')){const d=S.decks[$('#n-deck').value];const q=$('#n-q').value.trim(),a=$('#n-a').value.trim();const m=$('#n-msg');if(!d||!q||!a){if(m)m.textContent='Escribe la pregunta y la respuesta.';return}d.items.push({id:uid(),type:'card',q,a,how:'a mano'});save('deck_'+d.id);$('#n-q').value='';$('#n-a').value='';if(m)m.textContent='Agregada.';feedKey='';maybeRebuildFeed(true);return}
  const dd=e.target.closest('[data-deldeck]');
  if(dd){if(dd.dataset.confirm){const id=dd.dataset.deldeck;delete S.decks[id];save('decks');renderReelsSide();maybeRebuildFeed(true)}else{dd.dataset.confirm='1';dd.textContent='¿Seguro? Borrar'}return}
  const sec=e.target.closest('.reel[data-k]');if(!sec)return;const en=feedMap[sec.dataset.k];if(!en)return;
  const r=e.target.closest('[data-rate]');if(r)return rateEntry(sec.dataset.k,+r.dataset.rate);
  if(e.target.closest('[data-show-hint]')){$('[data-hint]',sec).hidden=false;return}
  if(e.target.closest('[data-show-sol]')){$('[data-sol]',sec).hidden=false;reveal(sec,-1);return}
  if(e.target.closest('[data-check]'))return checkProblem(sec,en);
  const op=e.target.closest('[data-opt]');if(op)return chooseOpt(sec,en,+op.dataset.opt);
  if(e.target.closest('[data-flip]')&&!e.target.closest('input,textarea,button'))flip(sec);
});
document.addEventListener('keydown',e=>{
  const dz=e.target.closest&&e.target.closest('.drop[data-for]');if(dz&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const inp=$('#'+dz.dataset.for+'-file');if(inp)inp.click();return}
  if(S.tab!=='reels')return;
  if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-ans-in]')){e.preventDefault();const sec=e.target.closest('.reel[data-k]');if(sec)checkProblem(sec,feedMap[sec.dataset.k]);return}
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;
  const feed=$('#feed');if(!feed)return;
  if(e.key==='ArrowDown'||e.key==='j'){e.preventDefault();feed.scrollBy({top:feed.clientHeight,behavior:'smooth'})}
  else if(e.key==='ArrowUp'||e.key==='k'){e.preventDefault();feed.scrollBy({top:-feed.clientHeight,behavior:'smooth'})}
  else if(e.key===' '){e.preventDefault();const sec=currentReel();if(sec&&sec.dataset.k)flip(sec)}
  else if(/^[1-4]$/.test(e.key)){const sec=currentReel();if(sec&&sec.dataset.k){const r=$('[data-rates]',sec);if(r&&!r.hidden)rateEntry(sec.dataset.k,+e.key-1)}}
});
document.addEventListener('input',e=>{if(e.target.id==='n-perday'){const v=Math.max(0,Math.min(200,+e.target.value||0));S.stats.newPerDay=v;save('stats')}});
document.addEventListener('change',e=>{
  if(e.target.id==='n-perday'&&S.tab==='reels'){feedKey='';maybeRebuildFeed(true)}
  if(e.target.id==='g-file'){pickedFiles=[...e.target.files];showFiles('g')}
  if(e.target.id==='i-file'){importFiles=[...e.target.files];showFiles('i');const s=$('#i-status');if(s)s.textContent='Listo. Pulsa "Leer horario".'}
});
function showFiles(w){const el=$('#'+w+'-files');const arr=w==='g'?pickedFiles:importFiles;if(el)el.innerHTML=arr.map(f=>`<span>${esc(f.name)}</span>`).join('')}
['dragover','dragleave','drop'].forEach(t=>document.addEventListener(t,e=>{const d=e.target.closest&&e.target.closest('.drop[data-for]');if(!d)return;e.preventDefault();if(t==='dragover')d.classList.add('over');else d.classList.remove('over');if(t==='drop'){const arr=[...e.dataTransfer.files];if(d.dataset.for==='g')pickedFiles=arr;else importFiles=arr;showFiles(d.dataset.for)}}));

/* ---------- arranque ---------- */
S.sched=buildSchedule(S.plan);
if(F.phase==='run'&&F.endAt<=Date.now()){F.remainMs=0;F.phase='pause'}
if(F.phase==='break'&&F.breakEnd<=Date.now())F={phase:'setup'};
const hash=location.hash.slice(1);
const sectionHash=['recordatorios','concentrar'].includes(hash);
setTab(['hoy','horario','enfoque','reels'].includes(hash)?hash:(sectionHash?'horario':S.tab));
if(sectionHash)goSection(hash);
let lastAlert='';
setInterval(()=>{
  const n=nowMin();const k=dateKey()+'-'+n;
  const b=dayBlocks(todayIdx()).find(x=>x.kind==='study'&&x.start===n);
  if(b&&lastAlert!==k&&F.phase!=='run'){lastAlert=k;beep(740,.12);notify(`Te toca ${subjName(b.subjectId)}`,`Bloque de estudio hasta las ${fmt(b.end)}. Empieza con 2 minutos.`);toast(`Te toca ${subjName(b.subjectId)} hasta las ${fmt(b.end)}.`,{label:'Empezar',fn:()=>startPreset(b.subjectId,Math.min(90,b.end-b.start))})}
  const ae=document.activeElement;
  if(S.tab==='hoy'&&!document.hidden&&!(ae&&ae.closest&&ae.closest('#v-hoy')&&ae.tagName==='SELECT'))renderHoy();
  renderChrome();
},30000);
/* ---------- app instalable (PWA) ---------- */
const APP_VERSION='1.0.0';
let installEvt=null,swReg=null;
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;const b=$('#install-btn');if(b)b.hidden=false});
window.addEventListener('appinstalled',()=>{installEvt=null;const b=$('#install-btn');if(b)b.hidden=true;toast('App instalada. Ábrela desde tu escritorio o tu pantalla de inicio.')});
$('#install-btn').addEventListener('click',async()=>{
  if(!installEvt){openData();return}
  installEvt.prompt();try{await installEvt.userChoice}catch(e){}
  installEvt=null;$('#install-btn').hidden=true;
});
if(isIOS()&&!isStandalone()){const b=$('#install-btn');b.hidden=false}
if('serviceWorker' in navigator&&location.protocol!=='file:'){
  navigator.serviceWorker.register('./sw.js').then(reg=>{
    swReg=reg;
    const offer=w=>toast('Hay una versión nueva de la app.',{label:'Actualizar',fn:()=>w.postMessage('skipWaiting')});
    if(reg.waiting&&navigator.serviceWorker.controller)offer(reg.waiting);
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)offer(w)})});
  }).catch(()=>{});
  /* recarga solo al aplicar una actualización, no la primera vez que se instala */
  const hadController=!!navigator.serviceWorker.controller;let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!hadController||reloading)return;reloading=true;location.reload()});
}
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});

/* avisos del sistema: solo cuando la app está abierta o minimizada (sin servidor no hay avisos con la app cerrada) */
function notify(title,body){
  try{
    if(!('Notification' in window)||Notification.permission!=='granted'||!document.hidden)return;
    const o={body,icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:'cuaderno-de-foco',renotify:true};
    if(swReg&&swReg.showNotification)swReg.showNotification(title,o);else new Notification(title,o);
  }catch(e){}
}

/* ---------- panel de datos ---------- */
$('#sync').addEventListener('click',()=>openData());
async function openData(){
  const o=$('#overlay');o.hidden=false;o.className='overlay';
  let used='';try{if(navigator.storage&&navigator.storage.estimate){const est=await navigator.storage.estimate();used=`Ocupas ${(est.usage/1048576).toFixed(1).replace('.',',')} MB en este dispositivo.`}}catch(e){}
  const perm='Notification' in window?Notification.permission:'unsupported';
  const install=isStandalone()?'<p class="small muted">Ya estás usando la app instalada.</p>'
    :installEvt?'<button class="btn primary" id="d-install">Instalar la app</button>'
    :isIOS()?'<p class="small">En iPhone o iPad: abre esta página en Safari, toca el botón <b>Compartir</b> y elige <b>Agregar a inicio</b>.</p>'
    :'<p class="small">Abre el menú del navegador (⋮) y elige <b>Instalar app</b> o <b>Agregar a la pantalla de inicio</b>. En Chrome o Edge del computador también aparece un ícono de instalar en la barra de direcciones.</p>';
  o.innerHTML=`<div class="panel" role="dialog" aria-modal="true" aria-labelledby="d-title">
    <div class="row between" style="flex-wrap:nowrap"><h2 id="d-title">Tus datos</h2><button class="iconbtn" id="d-close" aria-label="Cerrar">${X}</button></div>
    <p class="small muted">Todo se guarda solo en este dispositivo: no hay cuenta ni servidor, y funciona sin internet. Para pasar tu plan, tu racha y tus mazos a otro dispositivo, exporta una copia aquí e impórtala allá. ${used}</p>
    <div class="row"><button class="btn primary" id="d-export">Exportar copia (.json)</button><button class="btn" id="d-import">Importar copia</button><input type="file" id="d-file" accept=".json,application/json" hidden></div>
    <div id="d-confirm"></div>
    <p class="small" id="d-msg" aria-live="polite"></p>
    <hr class="sep">
    <h3>Instalar en este dispositivo</h3>${install}
    <hr class="sep">
    <h3>Avisos</h3>
    <p class="small muted">Te avisa cuando termina una sesión de enfoque o empieza un bloque de estudio, mientras la app esté abierta o minimizada. Para avisos con la app cerrada, usa los recordatorios de Google Calendar en Horario.</p>
    ${perm==='granted'?'<p class="small" style="color:var(--good);font-weight:700">Avisos activados.</p>':perm==='denied'?'<p class="small">Los avisos están bloqueados. Actívalos en los permisos del sitio en tu navegador.</p>':perm==='unsupported'?'<p class="small">Este navegador no permite avisos.</p>':'<div><button class="btn" id="d-notif">Activar avisos</button></div>'}
    <hr class="sep">
    <div class="row between"><span class="small muted">Versión ${APP_VERSION}</span><button class="btn sm danger" id="d-wipe">Borrar todos mis datos</button></div>
  </div>`;
  o.onclick=async e=>{
    if(e.target===o||e.target.closest('#d-close')){o.hidden=true;o.innerHTML='';o.onclick=null;return}
    if(e.target.closest('#d-export')){exportData();$('#d-msg').textContent='Copia descargada. Guárdala en un lugar seguro (Drive, correo, USB).';return}
    if(e.target.closest('#d-import')){$('#d-confirm').innerHTML='<div class="warnbox">Importar reemplaza el plan, la racha y los mazos de este dispositivo por los de la copia. <div class="row" style="margin-top:8px"><button class="btn sm primary" id="d-import-ok">Elegir archivo</button><button class="btn sm ghost" id="d-import-no">Cancelar</button></div></div>';return}
    if(e.target.closest('#d-import-no')){$('#d-confirm').innerHTML='';return}
    if(e.target.closest('#d-import-ok')){$('#d-file').click();return}
    if(e.target.closest('#d-install')&&installEvt){installEvt.prompt();try{await installEvt.userChoice}catch(err){}installEvt=null;$('#install-btn').hidden=true;openData();return}
    if(e.target.closest('#d-notif')){try{await Notification.requestPermission()}catch(err){}openData();return}
    const w=e.target.closest('#d-wipe');
    if(w){if(!w.dataset.confirm){w.dataset.confirm='1';w.textContent='¿Seguro? Se borra todo';return}
      ['cf.plan','cf.stats','cf.decks','cf.session','cf.tab','cf.added'].forEach(k=>{try{localStorage.removeItem(k)}catch(err){}});
      location.reload()}
  };
  $('#d-file').onchange=async ev=>{const f=ev.target.files[0];if(!f)return;$('#d-msg').textContent=await importData(f);$('#d-confirm').innerHTML=''};
}
function exportData(){
  const data={app:'cuaderno-de-foco',version:1,exportedAt:new Date().toISOString(),plan:S.plan,stats:S.stats,decks:S.decks};
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`cuaderno-de-foco-${dateKey()}.json`;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
}
async function importData(file){
  let d;try{d=JSON.parse(await file.text())}catch(e){return 'Ese archivo no es una copia válida.'}
  if(!d||d.app!=='cuaderno-de-foco'||!d.plan||!Array.isArray(d.plan.subjects))return 'Ese archivo no es una copia de Cuaderno de Foco.';
  S.plan=migratePlan(d.plan);S.stats=migrateStats(d.stats);S.decks=d.decks&&typeof d.decks==='object'?d.decks:{};
  Object.values(S.decks).forEach(dk=>(dk.items||[]).forEach(ReelsEngine.srs.migrate));
  save('plan');save('stats');save('decks');
  S.sched=buildSchedule(S.plan);feedKey='';render();
  const n=Object.values(S.decks).reduce((a,dk)=>a+(dk.items||[]).length,0);
  return `Listo: ${S.plan.subjects.length} materias y ${n} tarjetas importadas.`;
}
ready();

