/* Cuaderno de Foco · Motor de Reels de estudio
   Todo corre en tu dispositivo, sin internet ni inteligencia artificial:
   1. Lee tu material (PDF con texto, TXT, Markdown, CSV).
   2. Arma tarjetas con reglas del español: preguntas que ya escribiste en tus apuntes,
      glosarios ("Término: definición"), definiciones ("X es un…", "se denomina…"),
      listas y clasificaciones, y fórmulas.
   3. Arma tarjetas para completar con las frases más importantes del texto (algoritmo RAKE
      de palabras clave), con opciones de respuesta sacadas del mismo material.
   4. Convierte las fórmulas que encuentra en problemas numéricos que cambian de datos en cada repaso,
      y acepta tus propias plantillas de problemas con variables.
   5. Programa los repasos con repetición espaciada (SM-2, el método de Anki).
   6. Ordena el feed: primero lo que estás por olvidar, mezcla materias, mete tarjetas nuevas
      poco a poco y le da prioridad a tu materia a concentrar. */
const ReelsEngine=(()=>{
'use strict';
const DAY=864e5;
const strip=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'');
const low=s=>strip(s).toLowerCase();
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const cap=s=>{s=String(s||'').trim();return /^[a-záéíóúñü]/.test(s)?s.charAt(0).toUpperCase()+s.slice(1):s};
const STOP=new Set(`a aca ahi al algo algun alguna algunas alguno algunos alla alli ambos ante antes aquel aquella aquellas aquellos aqui asi aun aunque bajo bien cada casi como con contra cual cuales cualquier cuando cuanto cuanta cuantos cuantas cuya cuyo cuyas cuyos de del desde donde dos durante e el ella ellas ello ellos en entre era eran eres es esa esas ese eso esos esta estaba estaban estado estamos estan estar este esto estos fue fueron fuera ha habia hace hacen hacer hacia han has hasta hay la las le les lo los mas me mi mis mientras muy mismo misma mismos mismas mucho mucha muchos muchas nada ni no nos nosotros o os otra otras otro otros para pero poco poca pocos por porque pues que quien quienes se sea sean segun ser si sido siempre sin sino sobre solo son su sus tal tales tambien tan tanto tanta te tiene tienen tener todo toda todos todas tras tu tus u un una uno unos unas usted y ya yo dicho dicha puede pueden debe deben mediante etc ademas luego entonces tipo forma caso parte vez veces ejemplo cada uno decir esta estas estos estas cual lo la el the of and to in is are for with on by an be this that it as or from at`.split(/\s+/));
/* verbos frecuentes: cortan las frases clave para que no terminen en "…impide" o "…suele" */
`esta estan tiene tienen puede pueden debe deben suele suelen impide impiden permite permiten depende dependen actua actuan produce producen genera generan indica indican representa representan existe existen ocurre ocurren aumenta aumentan disminuye disminuyen cambia cambian comienza comienzan comience mueve mueven mueva deslice deslicen desliza deslizan realiza realizan mide miden establece establecen define definen determina determinan describe describen relaciona relacionan mantiene mantienen mantener sirve sirven hace hacen da dan va van llega llegan aplica aplican actue sea sean haya tenga tengan pueda puedan implica implican contiene contienen presenta presentan utiliza utilizan usa usan calcula calculan obtiene obtienen expresa expresan llama llaman denomina denominan conoce conocen considera consideran encuentra encuentran queda quedan resulta resultan necesita necesitan requiere requieren provoca provocan causa causan ejerce ejercen opone oponen actuando siendo teniendo haciendo pasa pasan sigue siguen corresponde corresponden equivale equivalen significa significan incluye incluyen afecta afectan logra logran busca buscan muestra muestran explica explican estudia estudian analiza analizan`.split(/\s+/).forEach(w=>STOP.add(w));
const fixEs=s=>String(s).replace(/\bde el\b/g,'del').replace(/\ba el\b/g,'al');

/* ---------- lectura de archivos ---------- */
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
function loadScript(src){return new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>ko(new Error('No pude cargar el lector de PDF. Abre la app una vez con internet para guardarlo.'));document.head.appendChild(s)})}
async function pdfLib(){
  if(!window.pdfjsLib){await loadScript(PDFJS+'pdf.worker.min.js');await loadScript(PDFJS+'pdf.min.js');window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'}
  return window.pdfjsLib;
}
/* páginas con los textos y su posición (sirve para reconstruir tablas, como un horario) */
async function pdfPages(file,status,maxPages=80){
  const lib=await pdfLib();
  const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const pages=[];const n=Math.min(pdf.numPages,maxPages);
  for(let i=1;i<=n;i++){
    if(status)status(`Leyendo ${file.name}: página ${i} de ${n}`);
    const pg=await pdf.getPage(i);const tc=await pg.getTextContent();
    pages.push(tc.items.filter(t=>t.str!=null).map(t=>({str:t.str,x:t.transform[4],y:t.transform[5],w:t.width||0,h:Math.abs(t.transform[3])||t.height||8,eol:!!t.hasEOL})));
  }
  return pages;
}
async function extractText(file,status){
  const name=file.name||'';
  if(/\.pdf$/i.test(name)||file.type==='application/pdf'){
    const pages=await pdfPages(file,status);
    return pages.map(items=>items.map(t=>t.str+(t.eol?'\n':' ')).join('')).join('\n\n');
  }
  if(/\.(html?)$/i.test(name)||file.type==='text/html'){const d=new DOMParser().parseFromString(await file.text(),'text/html');return d.body?d.body.innerText||d.body.textContent:''}
  if(/^text\//.test(file.type)||/\.(txt|md|markdown|csv|tsv)$/i.test(name))return await file.text();
  if(/^image\//.test(file.type))throw new Error('Las fotos no se pueden leer sin conexión. Pega el texto o sube el PDF.');
  throw new Error(`No sé leer "${name}". Usa PDF, TXT o Markdown.`);
}

/* ---------- expresiones matemáticas (sin eval) ---------- */
const Expr=(()=>{
  const rad=d=>d*Math.PI/180;
  const FN={sqrt:Math.sqrt,raiz:Math.sqrt,sin:d=>Math.sin(rad(d)),sen:d=>Math.sin(rad(d)),cos:d=>Math.cos(rad(d)),tan:d=>Math.tan(rad(d)),tg:d=>Math.tan(rad(d)),ln:Math.log,log:Math.log10,exp:Math.exp,abs:Math.abs};
  const SUB='₀₁₂₃₄₅₆₇₈₉';
  function normalize(s){
    return String(s).replace(/[·×∙⋅•]/g,'*').replace(/÷/g,'/').replace(/[−–—]/g,'-')
      .replace(/²/g,'^2').replace(/³/g,'^3').replace(/½/g,'(1/2)').replace(/¼/g,'(1/4)').replace(/¾/g,'(3/4)')
      .replace(/π/g,' pi ').replace(/√/g,' sqrt ').replace(/(\d),(\d)/g,'$1.$2')
      .replace(/[₀-₉]+/g,m=>'_'+[...m].map(c=>SUB.indexOf(c)).join(''));
  }
  const LET='A-Za-zα-ωΑ-ΩΔ';
  function tokenize(src,known){
    const s=normalize(src);const t=[];let i=0;
    const pushIdent=m=>{
      const l=m.toLowerCase();
      if(l==='pi'){t.push({k:'n',v:Math.PI});return}
      if(FN[l]){t.push({k:'f',v:l});return}
      if(known&&known.has(m)){t.push({k:'v',v:m});return}
      if(m.includes('_')||/^[A-Za-zα-ωΑ-ΩΔ]\d+$/.test(m)||m.length===1){t.push({k:'v',v:m});return}
      let j=0;
      while(j<m.length){
        let hit=null;
        for(let L=m.length-j;L>=2;L--){const p=m.slice(j,j+L);if((known&&known.has(p))||FN[p.toLowerCase()]||p.toLowerCase()==='pi'){hit=p;break}}
        if(hit){pushIdent(hit);j+=hit.length;continue}
        let one=m.slice(j).match(/^[A-Za-zα-ωΑ-ΩΔ]\d*/)[0];
        if(one==='Δ'&&j+1<m.length)one=m.slice(j,j+2);
        t.push({k:'v',v:one});j+=one.length;
      }
    };
    while(i<s.length){
      const c=s[i];
      if(/\s/.test(c)){i++;continue}
      if(/[0-9.]/.test(c)){const m=s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i);if(!m)throw new Error('número');t.push({k:'n',v:parseFloat(m[0])});i+=m[0].length;continue}
      if(new RegExp('['+LET+']').test(c)){const m=s.slice(i).match(new RegExp('^['+LET+'][A-Za-z0-9_α-ωΑ-Ω]*'))[0];i+=m.length;pushIdent(m);continue}
      if('+-*/^()'.includes(c)){t.push({k:c});i++;continue}
      throw new Error('Carácter no válido: '+c);
    }
    const out=[];
    for(const tk of t){const prev=out[out.length-1];
      if(prev&&(prev.k==='n'||prev.k==='v'||prev.k===')')&&(tk.k==='n'||tk.k==='v'||tk.k==='f'||tk.k==='('))out.push({k:'*'});
      out.push(tk)}
    return out;
  }
  function parse(src,known){
    const tk=tokenize(src,known);let p=0;
    const peek=()=>tk[p],eat=k=>{if(tk[p]&&tk[p].k===k){p++;return true}return false};
    function expr(){let n=term();while(peek()&&(peek().k==='+'||peek().k==='-')){const op=tk[p++].k;n={op,a:n,b:term()}}return n}
    function term(){let n=unary();while(peek()&&(peek().k==='*'||peek().k==='/')){const op=tk[p++].k;n={op,a:n,b:unary()}}return n}
    function unary(){if(eat('-'))return {op:'neg',a:unary()};if(eat('+'))return unary();return power()}
    function power(){const b=primary();if(eat('^'))return {op:'^',a:b,b:unary()};return b}
    function primary(){
      const t=tk[p++];if(!t)throw new Error('La expresión está incompleta');
      if(t.k==='n')return {n:t.v};
      if(t.k==='v')return {v:t.v};
      if(t.k==='f'){if(peek()&&peek().k==='('){p++;const a=expr();if(!eat(')'))throw new Error('Falta cerrar un paréntesis');return {f:t.v,a}}return {f:t.v,a:power()}}
      if(t.k==='('){const a=expr();if(!eat(')'))throw new Error('Falta cerrar un paréntesis');return a}
      throw new Error('La expresión tiene un símbolo de más');
    }
    if(!tk.length)throw new Error('Expresión vacía');
    const ast=expr();if(p!==tk.length)throw new Error('La expresión tiene algo de más al final');
    return ast;
  }
  function evaluate(n,vals){
    if(n.n!==undefined)return n.n;
    if(n.v!==undefined){if(!(n.v in vals))throw new Error('Falta el valor de '+n.v);return vals[n.v]}
    if(n.f)return FN[n.f](evaluate(n.a,vals));
    const a=evaluate(n.a,vals);
    if(n.op==='neg')return -a;
    const b=evaluate(n.b,vals);
    return n.op==='+'?a+b:n.op==='-'?a-b:n.op==='*'?a*b:n.op==='/'?a/b:Math.pow(a,b);
  }
  function vars(n,acc=new Set()){if(n.v!==undefined)acc.add(n.v);if(n.a)vars(n.a,acc);if(n.b)vars(n.b,acc);return [...acc]}
  return {parse,evaluate,vars,normalize};
})();

/* ---------- números ---------- */
function fmtNum(x){
  if(!isFinite(x))return '—';const a=Math.abs(x);
  if(a!==0&&(a>=1e6||a<1e-3))return x.toExponential(2).replace('.',',').replace(/e\+?(-?)(\d+)/,' × 10^$1$2');
  return String(+x.toPrecision(4)).replace('.',',');
}
function parseNumber(s){
  if(s==null)return NaN;let t=String(s).trim();
  if(!t)return NaN;
  if(t.includes(',')&&!t.includes('.'))t=t.replace(/,/g,'.');
  t=t.replace(/×\s*10\^/g,'e').replace(/\s*[xX]\s*10\^/g,'e');
  const m=t.match(/^[\s\d.eE+\-*/^()πsqrt]+/);if(!m)return NaN;
  try{const v=Expr.evaluate(Expr.parse(m[0].trim()),{});return isFinite(v)?v:NaN}catch(e){const f=parseFloat(m[0]);return isFinite(f)?f:NaN}
}
function checkNumber(input,expected,tol=0.02){const v=parseNumber(input);if(!isFinite(v)||!isFinite(expected))return null;return Math.abs(v-expected)<=Math.max(Math.abs(expected)*tol,1e-9)}
function levenshtein(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let prev=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const cur=[i];for(let j=1;j<=n;j++)cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur}return prev[n]}
function similarity(a,b){a=low(a).replace(/[^a-z0-9ñ ]/g,'').replace(/\s+/g,' ').trim();b=low(b).replace(/[^a-z0-9ñ ]/g,'').replace(/\s+/g,' ').trim();if(!a||!b)return 0;return 1-levenshtein(a,b)/Math.max(a.length,b.length)}

/* ---------- análisis del texto ---------- */
function splitSentences(par){
  let t=par.replace(/\b(Sr|Sra|Dr|Dra|Ing|Lic|fig|Fig|ej|aprox|etc|pág|cap|vol|núm|art|ec|Ec|p\. ej)\./g,m=>m.replace(/\./g,'§'));
  t=t.replace(/(\d)\.(\d)/g,'$1§$2');
  t=t.replace(/([.!?])\s+(?=[¿¡"“(]?[A-ZÁÉÍÓÚÑ0-9])/g,'$1\u0001');
  return t.split('\u0001').map(s=>s.replace(/§/g,'.').trim()).filter(s=>s.length>2);
}
function isHeading(l,next,first){
  if(/^#{1,6}\s/.test(l))return true;
  if(first&&l.length<=60&&l.split(' ').length<=6&&!/[.,;:=!?]$/.test(l)&&/^[A-ZÁÉÍÓÚÑ¿0-9]/.test(l))return true;
  if(l.length>80||/[.,;=]$/.test(l)||/=/.test(l))return false;
  if(/:$/.test(l))return false;
  const w=l.split(' ').length;
  if(/^(\d+\.)+\d*\s+\S/.test(l)&&w<=10)return true;
  if(w<=8&&l===l.toUpperCase()&&/[A-ZÁÉÍÓÚÑ]{3}/.test(l))return true;
  if(w<=7&&/^[A-ZÁÉÍÓÚÑ¿]/.test(l)&&!/[.!?]$/.test(l)&&(next===undefined||next===''))return true;
  return false;
}
function analyze(raw){
  const text=String(raw||'').replace(/\r/g,'').replace(/[ \t ]+/g,' ').replace(/([a-záéíóúñ])-\n([a-záéíóúñ])/gi,'$1$2');
  const lines=text.split('\n').map(s=>s.trim());
  const secs=[{title:'',paras:[],lists:[],lines:[]}];
  let para=[],list=null,prev='';
  const sec=()=>secs[secs.length-1];
  const flush=()=>{if(para.length){sec().paras.push(para.join(' '));para=[]}};
  for(let i=0;i<lines.length;i++){
    const l=lines[i].replace(/\*\*/g,'').replace(/__/g,'');
    if(!l){flush();list=null;prev='';continue}
    if(isHeading(l,lines[i+1],!secs[0].lines.length&&secs.length===1&&!para.length)){flush();list=null;secs.push({title:l.replace(/^#+\s*/,'').replace(/^(\d+\.)*\d*[.)]?\s+/,'').trim(),paras:[],lists:[],lines:[]});prev=l;continue}
    sec().lines.push(l);
    const b=l.match(/^(?:[-•*·▪●◦–✓]|\d{1,2}[.)]|[a-hA-H][.)])\s+(.+)/);
    if(b){flush();if(!list){list={intro:/:$/.test(prev)?prev.replace(/:$/,'').trim():sec().title,items:[]};sec().lists.push(list)}list.items.push(b[1].replace(/[.;]$/,'').trim());prev=l;continue}
    list=null;para.push(l);prev=l;
  }
  flush();
  const sents=[];let pos=0;
  secs.forEach((s,si)=>{for(const p of s.paras)for(const t of splitSentences(p))sents.push({text:t,sec:si,pos:pos++})});
  return {secs,sents,phrases:rake(sents,secs)};
}
/* RAKE: corta las frases en las palabras vacías y la puntuación; las palabras que aparecen
   en frases largas y repetidas suben de puntaje. */
function rake(sents,secs){
  const occ=[];
  for(const s of sents){
    const toks=s.text.split(/([,.;:!?¿¡()"“”«»\[\]{}]|\s+)/).filter(x=>x&&!/^\s+$/.test(x));
    let cur=[];
    const end=()=>{if(cur.length&&cur.length<=4)occ.push({words:cur,sent:s});cur=[]};
    for(const t of toks){
      if(/^[,.;:!?¿¡()"“”«»\[\]{}]$/.test(t)){end();continue}
      const w=low(t);
      if(STOP.has(w)||(w.length<3&&!/\d/.test(w))||/^\d+$/.test(w)&&w.length<2){end();continue}
      cur.push(t);
    }
    end();
  }
  const freq={},deg={};
  for(const o of occ){const n=o.words.length;for(const w of o.words){const k=low(w);freq[k]=(freq[k]||0)+1;deg[k]=(deg[k]||0)+n}}
  const titleText=low(secs.map(s=>s.title).join(' '));
  const map=new Map();
  for(const o of occ){
    const key=o.words.map(low).join(' ');
    if(key.length<4)continue;
    if(o.words.length===1&&key.length<5&&!/\d|[α-ω]/i.test(key)&&o.words[0]!==o.words[0].toUpperCase())continue;
    if(/^[\d.,\s]+$/.test(key))continue;
    let e=map.get(key);
    if(!e){e={key,text:o.words.join(' '),words:o.words.length,score:o.words.reduce((a,w)=>a+deg[low(w)]/freq[low(w)],0),count:0,sents:[],numeric:/\d/.test(key)};map.set(key,e)}
    e.count++;e.sents.push(o.sent);
  }
  const arr=[...map.values()];
  for(const e of arr){e.score*=1+0.35*Math.log(e.count);if(titleText.includes(e.key))e.score*=1.6}
  return arr.sort((a,b)=>b.score-a.score);
}

/* ---------- generadores de tarjetas ---------- */
const ART='(?:el|la|los|las|un|una|lo)';
const BADSTART=/^(esto|esta|este|estas|estos|eso|esa|ese|ello|lo que|que|cual|donde|aqui|aquí|tambien|también|entonces|asi|así|por eso|sin embargo|ademas|además|no|si|cuando|it|this)\b/i;
function goodTerm(t){const w=t.trim().split(/\s+/);return w.length>=1&&w.length<=7&&!BADSTART.test(t.trim())&&!/[=?¿:]/.test(t)&&t.trim().length>=2}
function mk(type,o){return Object.assign({id:uid(),type},o)}
function keyOf(q){return low(q).replace(/[^a-z0-9ñ ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))}
function jacc(a,b){if(!a.length||!b.length)return 0;const A=new Set(a),B=new Set(b);let i=0;for(const x of A)if(B.has(x))i++;return i/(A.size+B.size-i)}

function qaCards(doc){
  const out=[];
  doc.secs.forEach((s,si)=>{
    const L=s.lines;
    for(let i=0;i<L.length;i++){
      let m=L[i].match(/^(?:P|Pregunta|Q)\s*[:.)-]\s*(.+)$/i);
      if(m){const n=L[i+1]&&L[i+1].match(/^(?:R|Respuesta|A)\s*[:.)-]\s*(.+)$/i);if(n){out.push(mk('card',{q:m[1].trim(),a:n[1].trim(),how:'qa',score:1,sec:si,pos:i}));i++;continue}}
      if(/\?$/.test(L[i])&&L[i].length<=200&&L[i+1]&&!/\?$/.test(L[i+1])&&!/^(?:P|Pregunta)\s*[:.)]/i.test(L[i+1])){
        const ans=[L[i+1]];if(L[i+2]&&!/\?$/.test(L[i+2])&&!/:$/.test(L[i+2])&&!/[.!?:]$/.test(ans[0])&&L[i+2].length<160&&ans[0].length<160)ans.push(L[i+2]);
        const a=ans.join(' ').replace(/^(?:R|Respuesta)\s*[:.)-]\s*/i,'');
        if(a.length>=2&&a.length<=320){out.push(mk('card',{q:L[i].replace(/^[-•*\d.)\s]+/,''),a,how:'qa',score:0.95,sec:si,pos:i}));i++}
      }
    }
  });
  return out;
}
function glossaryCards(doc){
  const out=[];
  doc.secs.forEach((s,si)=>s.lines.forEach((l,i)=>{
    const m=l.replace(/^[-•*·▪●◦–]\s+/,'').match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ][^:–—=]{1,60}?)\s*(?::|\s[–—-]\s)\s*(.{8,320})$/);
    if(!m)return;const term=m[1].trim(),def=m[2].trim();
    if(!goodTerm(term)||term.split(' ').length>6||/^(nota|ejemplo|ej|fuente|tema|unidad|capitulo|capítulo|figura|tabla|paso)\b/i.test(term))return;
    if(/\s(son|es|está|están|incluyen|tiene|tienen|pueden|puede|se\s\w+)$/i.test(term)||/\b(tipos|clases|partes|pasos|elementos|características)\b/i.test(term))return;
    if(def.split(' ').length<3)return;
    const tl=/^[A-ZÁÉÍÓÚÑ]{2,}/.test(term)||/\s[A-ZÁÉÍÓÚÑ]/.test(term)?term:term.charAt(0).toLowerCase()+term.slice(1);
    out.push(mk('card',{q:`¿Qué es ${tl}?`,a:cap(def),how:'glosario',score:0.9,sec:si,pos:i,src:l}));
  }));
  return out;
}
function defCards(doc){
  const out=[];
  const P1=new RegExp(`^(${ART}\\s+)?(.{2,60}?)\\s+(se define como|se entiende como|se denomina|se conoce como|se refiere a|consiste en|corresponde a|se llama)\\s+(.{8,})$`,'i');
  const P2=new RegExp(`^se\\s+(?:denomina|llama|conoce como|define como|le llama)\\s+(.{2,60}?)\\s+(a|al)\\s+(.{8,})$`,'i');
  const P3=new RegExp(`^(${ART}\\s+)?([^,;:]{2,50}?)\\s+(es|son)\\s+((?:un|una|el|la|los|las|aquel|aquella|aquellos|aquellas)\\s.{8,})$`,'i');
  for(const s of doc.sents){
    const t=s.text.replace(/\s+/g,' ').trim();if(t.length>320||/\?$/.test(t))continue;
    let m;
    const formulaDef=d=>/^\S{1,4}\s*=/.test(d.trim());
    if((m=t.match(P2))){
      const term=m[1].trim(),def=((m[2].toLowerCase()==='al'?'el ':'')+m[3]).replace(/[.;]$/,'').trim();if(!goodTerm(term))continue;
      out.push(mk('card',{q:`¿Cómo se llama ${def.charAt(0).toLowerCase()+def.slice(1)}?`,a:cap(term),how:'definición',score:0.85,sec:s.sec,pos:s.pos,src:t}));
      out.push(mk('card',{q:`¿Qué es ${term.charAt(0).toLowerCase()+term.slice(1)}?`,a:cap(def)+'.',how:'definición',score:0.82,sec:s.sec,pos:s.pos+0.1,src:t}));
      continue;
    }
    if((m=t.match(P1))){
      const art=(m[1]||'').trim(),term=m[2].trim(),verb=m[3].toLowerCase(),def=m[4].replace(/[.;]$/,'').trim();
      if(!goodTerm(term)||formulaDef(def))continue;
      const subj=((art?art+' ':'')+term).trim();const sl=subj.charAt(0).toLowerCase()+subj.slice(1);
      const q=/consiste en/.test(verb)?`¿En qué consiste ${sl}?`:/se refiere a/.test(verb)?`¿A qué se refiere ${sl}?`:`¿Qué es ${sl}?`;
      out.push(mk('card',{q,a:cap(def)+'.',how:'definición',score:0.85,sec:s.sec,pos:s.pos,src:t}));
      continue;
    }
    if((m=t.match(P3))){
      const art=(m[1]||'').trim(),term=m[2].trim(),verb=m[3].toLowerCase(),def=m[4].replace(/[.;]$/,'').trim();
      if(!goodTerm(term)||term.split(' ').length>5)continue;
      const subj=((art?art+' ':'')+term).trim();const sl=subj.charAt(0).toLowerCase()+subj.slice(1);
      out.push(mk('card',{q:`¿Qué ${verb} ${sl}?`,a:cap(def)+'.',how:'definición',score:0.8,sec:s.sec,pos:s.pos,src:t}));
    }
  }
  return out;
}
function enumCards(doc){
  const out=[];
  doc.secs.forEach((s,si)=>s.lists.forEach((li,k)=>{
    if(li.items.length<2||li.items.length>8||!li.intro)return;
    if(li.items.some(x=>x.length>140))return;
    const intro=li.intro.replace(/:$/,'').trim();
    out.push(mk('card',{q:`Menciona: ${intro.charAt(0).toLowerCase()+intro.slice(1)}`,a:li.items.map(x=>'• '+cap(x)).join('\n'),how:'lista',score:0.78,sec:si,pos:1000*si+k}));
  }));
  const P=/^(.{4,80}?)\s+(son|incluyen|se clasifican en|se dividen en|pueden ser|se componen de|está[n]? formad[oa]s? por)\s*:?\s+(.+)$/i;
  for(const s of doc.sents){
    const m=s.text.replace(/[.;]$/,'').match(P);if(!m)continue;
    const items=m[3].split(/\s*,\s*|\s+(?:y|e|o|u)\s+/).map(x=>x.trim()).filter(Boolean);
    if(items.length<3||items.length>8||items.some(x=>x.split(' ').length>8))continue;
    const subj=m[1].trim();if(!goodTerm(subj))continue;const sl=subj.charAt(0).toLowerCase()+subj.slice(1);const v=m[2].toLowerCase();
    const q=/clasifican/.test(v)?`¿En qué se clasifican ${sl}?`:/dividen/.test(v)?`¿En qué se dividen ${sl}?`:/componen|formad/.test(v)?`¿De qué se compone${/s$/.test(sl)?'n':''} ${sl}?`:`¿Cuáles son ${sl}?`;
    out.push(mk('card',{q,a:items.map(x=>'• '+cap(x)).join('\n'),how:'lista',score:0.76,sec:s.sec,pos:s.pos,src:s.text}));
  }
  return out;
}
/* fórmulas: "F = m·a", "Ec = ½ m v²", "σ = P/A" */
const FUNCWORDS=new Set(['sqrt','raiz','sin','sen','cos','tan','tg','ln','log','exp','abs','pi']);
const MATHCH=/[A-Za-zα-ωΑ-ΩΔ0-9_₀-₉ +\-−–*/·×÷^²³√().,½¼¾π]/;
function findFormulas(text){
  const out=[];const re=/([A-Za-zα-ωΑ-ΩΔ][A-Za-z0-9_₀-₉α-ωΑ-Ω]{0,4})\s*=\s*/g;let m;
  while((m=re.exec(text))){
    const before=text[m.index-1];if(before&&/[A-Za-záéíóúñα-ω]/i.test(before))continue;
    const lhs=m[1];const start=m.index+m[0].length;
    let rhs='';for(let i=start;i<text.length&&i<start+80;i++){const ch=text[i];if(!MATHCH.test(ch))break;rhs+=ch}
    const words=rhs.match(/[A-Za-zÁÉÍÓÚáéíóúñ]{3,}/g)||[];
    for(const w of words)if(!FUNCWORDS.has(w.toLowerCase())){rhs=rhs.slice(0,rhs.indexOf(w));break}
    rhs=rhs.replace(/[\s.,+\-−*/·×÷^(]+$/,'').trim();
    if(!rhs||/^[\d\s.,]+$/.test(rhs))continue;
    if((rhs.match(/\(/g)||[]).length!==(rhs.match(/\)/g)||[]).length)continue;
    let ast,vars;try{ast=Expr.parse(rhs);vars=Expr.vars(ast)}catch(e){continue}
    if(!vars.length||vars.length>5||vars.includes(lhs))continue;
    let ok=false;for(let k=0;k<5&&!ok;k++){const vals={};vars.forEach(v=>vals[v]=pick(v,Math.random));try{const y=Expr.evaluate(ast,vals);ok=isFinite(y)}catch(e){}}
    if(!ok)continue;
    out.push({lhs,rhs,vars,index:m.index,prefix:text.slice(Math.max(0,m.index-90),m.index)});
  }
  return out;
}
function formulaContext(prefix,title){
  const p=prefix.replace(/\s+/g,' ');
  let m=p.match(/(?:^|[.;:]\s*|\b)((?:la|el|los|las)\s+[\wáéíóúñ ]{3,60}?)\s+(?:se calcula(?: como| con)?|está dad[ao] por|se define como|es igual a|se expresa como|viene dad[ao] por|se obtiene con|es)\s*:?\s*$/i);
  if(m)return m[1].split(/\s+(?:depende|dependen|que|cuando|donde|y\s+se|se|es|son|está|tiene|puede|varía)\b/i)[0].trim();
  m=p.match(/(?:^|[.;]\s*)([A-ZÁÉÍÓÚÑ][\wáéíóúñ ]{3,50}?)\s*:\s*$/);
  if(m&&m[1].split(' ').length<=7)return m[1].trim();
  if(title&&title.split(' ').length<=7)return title;
  return '';
}
function formulaCards(doc){
  const out=[];const seen=new Set();
  const scan=(text,si,pos)=>{for(const f of findFormulas(text)){
    const k=f.lhs+'='+Expr.normalize(f.rhs).replace(/\s+/g,'');if(seen.has(k))continue;seen.add(k);
    const ctx=formulaContext(f.prefix,doc.secs[si]&&doc.secs[si].title);
    f.ctx=ctx;f.sec=si;f.pos=pos;doc.formulas.push(f);
    out.push(mk('card',{q:ctx?`¿Cuál es la ecuación de ${ctx.charAt(0).toLowerCase()+ctx.slice(1)}?`:`Completa la ecuación: ${f.lhs} = ?`,a:`${f.lhs} = ${f.rhs}`,how:'fórmula',score:0.8,sec:si,pos}));
  }};
  doc.formulas=[];
  doc.secs.forEach((s,si)=>s.lines.forEach((l,i)=>{if(l.includes('='))scan(l,si,i)}));
  return out;
}
function clozeCards(doc,limit){
  const bySent=new Map();
  for(const p of doc.phrases.slice(0,400))for(const s of p.sents){if(!bySent.has(s))bySent.set(s,[]);bySent.get(s).push(p)}
  const cands=[];
  for(const [s,ps] of bySent){
    const words=s.text.split(/\s+/).length;
    if(words<7||words>42||/[?:]$/.test(s.text)||/=/.test(s.text))continue;
    ps.sort((a,b)=>b.score-a.score);
    const target=ps.find(p=>p.words<=Math.max(1,Math.floor(words*0.45)));if(!target)continue;
    cands.push({s,target,score:target.score+0.15*ps.length});
  }
  const max=Math.max(1,...cands.map(c=>c.score));
  cands.sort((a,b)=>b.score-a.score);
  const used=new Map();const out=[];
  for(const c of cands){
    if(out.length>=limit)break;
    if((used.get(c.target.key)||0)>=2)continue;
    const re=new RegExp(c.target.text.split(/\s+/).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+'),'i');
    const mm=c.s.text.match(re);if(!mm)continue;
    const q=c.s.text.replace(re,'_____');
    used.set(c.target.key,(used.get(c.target.key)||0)+1);
    out.push(mk('cloze',{q,a:mm[0],full:c.s.text,options:distractors(doc,c.target,c.s,mm[0]),how:'completar',score:0.35+0.35*(c.score/max),sec:c.s.sec,pos:c.s.pos}));
  }
  return out;
}
function distractors(doc,target,sent,answer){
  const al=low(answer);const aw=keyOf(answer);
  const pool=doc.phrases.filter(p=>p.key!==target.key&&!low(sent.text).includes(p.key)&&Math.abs(p.words-target.words)<=1&&p.numeric===target.numeric&&p.text.length>=answer.length*0.5&&p.text.length<=answer.length*2&&jacc(keyOf(p.text),aw)<0.34&&!p.key.includes(al)&&!al.includes(p.key));
  pool.sort((a,b)=>((b.sents[0].sec===sent.sec)-(a.sents[0].sec===sent.sec))||Math.abs(a.score-target.score)-Math.abs(b.score-target.score));
  const picks=[];for(const p of pool){if(picks.length>=3)break;if(picks.some(x=>{const lx=low(x);return lx===p.key||lx.includes(p.key)||p.key.includes(lx)}))continue;picks.push(matchCase(p.text,answer))}
  if(picks.length<2)return [];
  const opts=picks.concat(answer);
  for(let i=opts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]]}
  return opts;
}
function matchCase(t,model){return /^[A-ZÁÉÍÓÚÑ]/.test(model)&&!/^[A-ZÁÉÍÓÚÑ]{2}/.test(t)?cap(t):(/^[a-záéíóúñ]/.test(model)&&!/^[A-ZÁÉÍÓÚÑ]{2}/.test(t)?t.charAt(0).toLowerCase()+t.slice(1):t)}

/* ---------- problemas desde fórmulas ---------- */
const VINFO={F:['fuerza','N',5,500,5],m:['masa','kg',1,80,1],a:['aceleración','m/s²',1,20,1],g:['gravedad','m/s²',9.8,9.8,0],v:['velocidad','m/s',2,40,1],t:['tiempo','s',1,30,1],d:['distancia','m',2,200,1],x:['posición','m',1,100,1],h:['altura','m',1,50,1],r:['radio','m',1,10,1],L:['longitud','m',1,10,1],l:['longitud','m',1,10,1],k:['constante','N/m',10,500,10],E:['E','',10,500,10],Ec:['energía cinética','J',10,5000,10],Ep:['energía potencial','J',10,5000,10],Ek:['energía cinética','J',10,5000,10],Em:['energía mecánica','J',10,5000,10],W:['W','',10,500,10],P:['P','',10,500,10],p:['p','',1,50,1],V:['V','',1,100,1],I:['corriente','A',1,10,1],ρ:['densidad','kg/m³',500,8000,100],A:['área','m²',1,20,1],θ:['ángulo','°',10,80,5],α:['ángulo','°',10,80,5],β:['ángulo','°',10,80,5],ω:['velocidad angular','rad/s',1,20,1],f:['frecuencia','Hz',1,100,1],σ:['σ','',10,400,10],τ:['τ','',5,200,5],M:['M','',10,500,10],q:['q','',1,20,1],n:['n','',1,10,1],T:['T','',1,100,1],R:['R','',1,100,1],c:['c','',1,10,1],b:['b','',1,10,1],y:['y','',1,20,1],z:['z','',1,20,1],s:['s','',1,50,1],w:['w','',1,20,1],e:['e','',1,10,1]};
function vinfo(name){const n=String(name);return VINFO[n]||VINFO[n.split('_')[0]]||VINFO[n.replace(/^Δ/,'')]||(n.length<=3&&/^[A-Za-zα-ωΑ-Ω][a-z0-9]{1,2}$/.test(n)?VINFO[n[0]]:null)||[n,'',1,20,1]}
function pick(name,rnd){const [,,mn,mx,st]=vinfo(name);if(mn===mx)return mn;const step=st||1;const k=Math.floor(rnd()*(Math.floor((mx-mn)/step)+1));return +(mn+k*step).toFixed(6)}
const unitOf=n=>{const u=vinfo(n)[1];return u?(u==='°'?'°':' '+u):''};
const joinList=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' y '+a[a.length-1];
function instantiateFormula(gen,rnd=Math.random){
  const ast=Expr.parse(gen.rhs);const vars=gen.vars||Expr.vars(ast);
  for(let tries=0;tries<25;tries++){
    const vals={};vars.forEach(v=>vals[v]=pick(v,rnd));
    let y;try{y=Expr.evaluate(ast,vals)}catch(e){return null}
    if(!isFinite(y)||Math.abs(y)>1e9||Math.abs(y)<1e-6)continue;
    const ctxTxt=gen.ctx?`Según ${gen.ctx.charAt(0).toLowerCase()+gen.ctx.slice(1)}, si `:`Con la ecuación ${gen.lhs} = ${gen.rhs}: si `;
    if(!gen.target||gen.target===gen.lhs||!vars.includes(gen.target)){
      const given=vars.map(v=>`${v} = ${fmtNum(vals[v])}${unitOf(v)}`);
      return {q:`${ctxTxt}${joinList(given)}, ¿cuánto vale ${gen.lhs}?`,
        hint:gen.ctx?`Usa ${gen.lhs} = ${gen.rhs} y reemplaza los datos.`:'Reemplaza los datos en la ecuación.',
        solution:`1) ${gen.lhs} = ${gen.rhs}\n2) Reemplaza ${joinList(given)}\n3) ${gen.lhs} = ${fmtNum(y)}${unitOf(gen.lhs)}`,
        answer:fmtNum(y)+unitOf(gen.lhs),num:y,tol:0.02};
    }
    const u=gen.target;const others=vars.filter(v=>v!==u);
    const given=[`${gen.lhs} = ${fmtNum(y)}${unitOf(gen.lhs)}`].concat(others.map(v=>`${v} = ${fmtNum(vals[v])}${unitOf(v)}`));
    return {q:`${ctxTxt}${joinList(given)}, ¿cuánto vale ${u}?`,
      hint:`Parte de ${gen.lhs} = ${gen.rhs} y despeja ${u}.`,
      solution:`1) ${gen.lhs} = ${gen.rhs}\n2) Reemplaza los datos conocidos: ${joinList(given)}\n3) Despeja ${u}: ${u} = ${fmtNum(vals[u])}${unitOf(u)}`,
      answer:fmtNum(vals[u])+unitOf(u),num:vals[u],tol:0.02};
  }
  return null;
}
function problemCards(doc,n){
  const out=[];
  const fs=doc.formulas||[];
  for(let round=0;out.length<n&&round<3;round++){
    for(const f of fs){
      if(out.length>=n)break;
      let target=null;
      if(round===1){const known=f.vars.filter(v=>VINFO[v]&&vinfo(v)[2]!==vinfo(v)[3]);target=known[0]||f.vars[0]}
      if(round===2){const known=f.vars.filter(v=>vinfo(v)[2]!==vinfo(v)[3]);target=known[known.length-1]||null;if(!target)continue}
      const gen={kind:'formula',lhs:f.lhs,rhs:f.rhs,vars:f.vars,ctx:f.ctx,target:round===0?null:target};
      if(!instantiateFormula(gen))continue;
      if(out.some(p=>p.gen.lhs===gen.lhs&&p.gen.rhs===gen.rhs&&p.gen.target===gen.target))continue;
      out.push(mk('problem',{gen,how:'fórmula',sec:f.sec,pos:f.pos+0.5}));
    }
  }
  return out;
}

/* ---------- plantillas de problemas con variables ---------- */
function parseSpec(spec){
  const s=spec.trim().replace(/\s+/g,'');
  if(/^-?[\d.,]+(?:,-?[\d.,]+)+$/.test(s)&&!/\.\./.test(s)&&s.split(',').length>2){const list=s.split(',').map(Number).filter(isFinite);if(list.length)return {list}}
  const m=s.match(/^(-?[\d.]+)(?:-|\.\.|a)(-?[\d.]+)(?::([\d.]+))?$/);
  if(!m){const one=s.replace(',','.');if(isFinite(+one))return {list:[+one]};const L=s.split(/[;|]/).map(x=>+x.replace(',','.')).filter(isFinite);if(L.length)return {list:L};return null}
  const min=+m[1],max=+m[2];const step=m[3]?+m[3]:(Number.isInteger(min)&&Number.isInteger(max)?1:0.1);
  if(!(max>=min)||!(step>0))return null;return {min,max,step};
}
function parseTemplate(src){
  const lines=String(src||'').replace(/\r/g,'').split('\n');const stmt=[];let ans=null,unit='',hint='',sol='',tol=1;
  for(const l of lines){const t=l.trim();let m;
    if((m=t.match(/^=\s*(.+)$/)))ans=m[1];
    else if((m=t.match(/^respuesta\s*[:=]\s*(.+)$/i)))ans=m[1];
    else if((m=t.match(/^unidad(?:es)?\s*:\s*(.*)$/i)))unit=m[1].trim();
    else if((m=t.match(/^pista\s*:\s*(.*)$/i)))hint=m[1].trim();
    else if((m=t.match(/^soluci[oó]n\s*:\s*(.*)$/i)))sol=m[1].trim();
    else if((m=t.match(/^tolerancia\s*:\s*([\d.,]+)\s*%?$/i)))tol=parseFloat(m[1].replace(',','.'))||1;
    else stmt.push(l);
  }
  const statement=stmt.join('\n').trim();
  if(!statement)return {ok:false,error:'Escribe el enunciado del problema.'};
  if(!ans)return {ok:false,error:'Falta la línea de la respuesta: empieza con "=" y la fórmula, por ejemplo "= P*L/4".'};
  const vars={};const re=/\{([A-Za-zα-ωΑ-ΩΔ_][A-Za-z0-9_α-ωΑ-Ω]*)\s*:\s*([^}]+)\}/g;let m;
  for(const txt of [statement,hint,sol])while((m=re.exec(txt))){const sp=parseSpec(m[2]);if(!sp)return {ok:false,error:`No entiendo el rango de {${m[1]}: ${m[2]}}. Usa por ejemplo {${m[1]}:4-8} o {${m[1]}:2-10:0.5}.`};vars[m[1]]=sp}
  if(!Object.keys(vars).length)return {ok:false,error:'Pon al menos una variable entre llaves, por ejemplo {L:4-8}.'};
  const known=new Set(Object.keys(vars));
  let ast;try{ast=Expr.parse(ans,known)}catch(e){return {ok:false,error:'La fórmula de la respuesta no es válida: '+e.message+'.'}}
  const miss=Expr.vars(ast).filter(v=>!known.has(v));
  if(miss.length)return {ok:false,error:`La respuesta usa ${miss.join(', ')}, que no está definida en el enunciado.`};
  const tpl={statement,ans,unit,hint,sol,tol,vars};
  for(let i=0;i<5;i++){const x=instantiate(tpl);if(!x||!isFinite(x.num))return {ok:false,error:'Con algunos valores la respuesta no da un número (¿división por cero?). Ajusta los rangos.'}}
  return {ok:true,tpl};
}
function instantiate(tpl,rnd=Math.random){
  const vals={};
  for(const [k,sp] of Object.entries(tpl.vars)){
    if(sp.list)vals[k]=sp.list[Math.floor(rnd()*sp.list.length)];
    else{const n=Math.floor((sp.max-sp.min)/sp.step+1e-9)+1;vals[k]=+(sp.min+sp.step*Math.floor(rnd()*n)).toFixed(6)}
  }
  const known=new Set(Object.keys(vals));
  const render=t=>String(t||'').replace(/\{=([^}]+)\}/g,(_,e)=>{try{return fmtNum(Expr.evaluate(Expr.parse(e,known),vals))}catch(err){return '¿?'}})
    .replace(/\{([A-Za-zα-ωΑ-ΩΔ_][A-Za-z0-9_α-ωΑ-Ω]*)(?:\s*:[^}]*)?\}/g,(_,k)=>k in vals?fmtNum(vals[k]):'{'+k+'}');
  let num;try{num=Expr.evaluate(Expr.parse(tpl.ans,known),vals)}catch(e){return null}
  const u=tpl.unit?' '+tpl.unit:'';
  return {q:render(tpl.statement),hint:render(tpl.hint),
    solution:tpl.sol?render(tpl.sol)+`\n\nRespuesta: ${fmtNum(num)}${u}`:`1) Fórmula: ${tpl.ans}\n2) Con ${Object.keys(vals).map(k=>`${k} = ${fmtNum(vals[k])}`).join(', ')}\n3) Resultado: ${fmtNum(num)}${u}`,
    answer:fmtNum(num)+u,num,tol:(tpl.tol||1)/100};
}

/* ---------- selección final ---------- */
function select(cands,n){
  cands.forEach(c=>{c.key=keyOf(c.q+' '+(c.a||''))});
  cands.sort((a,b)=>b.score-a.score);
  const kept=[];
  for(const c of cands){if(kept.some(k=>jacc(k.key,c.key)>0.55||(c.src&&k.src===c.src&&k.type===c.type&&k.how===c.how)))continue;kept.push(c)}
  const strong=kept.filter(c=>c.score>=0.76).slice(0,n);
  const rest=kept.filter(c=>!strong.includes(c));
  const bySec=new Map();rest.forEach(c=>{if(!bySec.has(c.sec))bySec.set(c.sec,[]);bySec.get(c.sec).push(c)});
  const secs=[...bySec.keys()].sort((a,b)=>a-b);const out=strong.slice();
  while(out.length<n&&secs.some(s=>bySec.get(s).length))for(const s of secs){const arr=bySec.get(s);if(arr.length&&out.length<n)out.push(arr.shift())}
  return out.sort((a,b)=>(a.sec-b.sec)||(a.pos-b.pos));
}
function generate(text,{nCards=12,nProblems=4,title=''}={}){
  const doc=analyze(text);
  if(!doc.sents.length&&!doc.secs.some(s=>s.lines.length))return {title,items:[],summary:{}};
  const explicit=[...qaCards(doc),...glossaryCards(doc),...defCards(doc),...enumCards(doc),...formulaCards(doc)];
  const cloze=clozeCards(doc,Math.max(nCards*2,10));
  const cards=select(explicit.concat(cloze),nCards);
  const probs=problemCards(doc,nProblems);
  const items=cards.concat(probs).map(c=>{const o=Object.assign({},c);delete o.score;delete o.key;delete o.sec;delete o.pos;if(o.q)o.q=fixEs(o.q);return o});
  const summary={};for(const c of items){const g=c.type==='problem'?'problemas':c.how;summary[g]=(summary[g]||0)+1}
  let t=title||(doc.secs.find(s=>s.title)||{}).title||'';
  if(t===t.toUpperCase()&&/[A-ZÁÉÍÓÚÑ]{3}/.test(t))t=cap(t.toLowerCase());
  return {title:t.slice(0,60),items,summary,formulas:(doc.formulas||[]).length};
}

/* ---------- repetición espaciada (SM-2) ---------- */
const startOfDay=t=>{const d=new Date(t);d.setHours(4,0,0,0);if(d.getTime()>t)d.setDate(d.getDate()-1);return d.getTime()};
function nextInterval(st,g){
  if(g===0)return 0;
  const reps=st?st.reps:0,iv=st?st.interval:0,ef=st?st.ef:2.5;
  let n;
  if(reps===0)n=g===1?1:g===2?1:3;
  else if(reps===1)n=g===1?3:g===2?4:6;
  else n=g===1?Math.max(iv+1,Math.round(iv*1.2)):g===2?Math.round(iv*ef):Math.round(iv*ef*1.3);
  return Math.max(1,Math.min(365,n));
}
function rate(st,g,now=Date.now()){
  const s=Object.assign({ef:2.5,reps:0,interval:0,due:0,lapses:0},st||{});
  const q=[1,3,4,5][g];
  if(g===0){s.reps=0;s.lapses=(s.lapses||0)+1;s.interval=0;s.due=now+10*60e3}
  else{let n=nextInterval(s,g);if(n>2)n=Math.round(n*(0.95+Math.random()*0.1));s.reps++;s.interval=n;s.due=startOfDay(now)+n*DAY}
  s.ef=Math.max(1.3,+(s.ef+(0.1-(5-q)*(0.08+(5-q)*0.02))).toFixed(3));
  s.last=now;return s;
}
function preview(st){return [0,1,2,3].map(g=>{const n=nextInterval(st,g);return g===0?'10 min':n===1?'1 día':n<30?n+' días':n<365?Math.round(n/30)+' mes'+(Math.round(n/30)>1?'es':''):'1 año'})}
function retention(st,now=Date.now()){if(!st||!st.last)return 0;const t=(now-st.last)/DAY;return Math.exp(Math.log(0.9)*t/Math.max(0.5,st.interval||0.5))}
const LEITNER=[0,1,2,4,8,16];
function migrate(it){
  if(it.srs)return it;
  if(!it.due){delete it.box;delete it.due;return it}
  const box=it.box||0;
  it.srs=box>0?{ef:2.5,reps:box,interval:LEITNER[box],due:it.due||Date.now(),lapses:0,last:(it.due||Date.now())-LEITNER[box]*DAY}:{ef:2.3,reps:0,interval:0,due:it.due||Date.now(),lapses:1,last:Date.now()};
  delete it.box;delete it.due;return it;
}

/* ---------- el algoritmo del feed ---------- */
function buildFeed(decks,{focus=new Set(),newLimit=20,now=Date.now(),extraLimit=40}={}){
  const due=[],fresh=[],later=[];
  decks.forEach((d,di)=>d.items.forEach((it,ii)=>{
    migrate(it);
    const e={deck:d,item:it,subj:d.subjectId,isProb:it.type==='problem'};
    const st=it.srs;
    if(!st)fresh.push(Object.assign(e,{ord:(focus.has(d.subjectId)?0:1e6)+(d.createdAt||0)/1e6+di*1000+ii}));
    else if(st.due<=now){
      const over=(now-st.due)/DAY;
      let p=(st.interval===0?3:1)+over/Math.max(1,st.interval)+0.15*(st.lapses||0);
      if(focus.has(d.subjectId))p*=1.5;
      due.push(Object.assign(e,{p}));
    }else later.push(Object.assign(e,{r:retention(st,now)}));
  }));
  due.sort((a,b)=>b.p-a.p);
  fresh.sort((a,b)=>a.ord-b.ord);
  /* nuevas: las de tu materia a concentrar primero, luego una de cada mazo por turno */
  const freshByDeck=new Map();fresh.forEach(e=>{const k=e.deck.id;if(!freshByDeck.has(k))freshByDeck.set(k,[]);freshByDeck.get(k).push(e)});
  const freshRR=[];const qs=[...freshByDeck.values()];
  while(freshRR.length<newLimit&&qs.some(q=>q.length))for(const q of qs){if(q.length&&freshRR.length<newLimit)freshRR.push(q.shift())}
  /* intercala: 3 repasos y 1 nueva */
  const seq=[];let i=0,j=0;
  while(i<due.length||j<freshRR.length){
    for(let k=0;k<3&&i<due.length;k++)seq.push(due[i++]);
    if(j<freshRR.length)seq.push(freshRR[j++]);
  }
  /* no más de dos seguidas de la misma materia ni dos problemas seguidos */
  for(let k=1;k<seq.length;k++){
    const clump=k>=2&&seq[k].subj===seq[k-1].subj&&seq[k-1].subj===seq[k-2].subj;
    const probs=seq[k].isProb&&seq[k-1].isProb;
    if(clump||probs){const m=seq.findIndex((x,ix)=>ix>k&&(clump?x.subj!==seq[k].subj:!x.isProb));if(m>0)[seq[k],seq[m]]=[seq[m],seq[k]]}
  }
  later.sort((a,b)=>a.r-b.r);
  const extra=later.slice(0,extraLimit);
  return {list:seq.map(e=>({deck:e.deck,item:e.item,extra:false})).concat(extra.map(e=>({deck:e.deck,item:e.item,extra:true}))),dueCount:due.length,freshCount:freshRR.length,freshTotal:fresh.length};
}

return {extractText,pdfPages,generate,parseTemplate,instantiate,instantiateFormula,
  srs:{rate,preview,retention,migrate},buildFeed,checkNumber,parseNumber,fmtNum,similarity,Expr,uid};
})();
