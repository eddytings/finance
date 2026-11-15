"use strict";
/* ---------- constants ---------- */
const E_IN=['Project payment','Other income'];
const E_JOB=['Team cost','Rental cost','Extra cost'];
const E_EXP=['Salaries','Office','Home','Car & Fuel','Food (personal)','Subscriptions & AI','Family','Insurance','Dubai','Health','Equipment','Travel','Education','Miscellaneous'];
const H_IN=['Sales','Other income'];
const H_OUT=['Stock & supplier','Branding & design','Packaging','Marketing & ads','Shipping & delivery','Website & tools','Equipment & props','Other'];
const CREW=['mike','joe','samira','sayed','elissa','jimmy','jaafar','sam','adrielle','crew','freelancer','editor','dop','gaffer','assistant'];
const KW=[ // [category, keywords] checked in order; first hit wins
 ['Travel',['ticket','flight','travel','hotel','airbnb','visa','souvenir','medj','medigu']],
 ['Education',['school','course','coursera','university','tuition','english']],
 ['Office',['office','building','bldg','buildg','cleaning','clean office','internet','rent']],
 ['Dubai',['du','residency','dubai','etisalat']],
 ['Subscriptions & AI',['claude','chatgpt','gpt','higgsfield','beeble','adobe','canva','plugin','dropbox','gmail','google','domain','godaddy','insta','youtube','netflix','shahid','apple','icloud','spotify','runway','topaz','eleven','freepik','envato','epidemic','subscription','subs','ai']],
 ['Equipment',['sd card','ssd','hollyland','ipad','ring light','mouse','printer','radio','batter','light box','tripod','lens','camera','mic','monitor','laptop','charger','cable','hard drive']],
 ['Home',['moteur home','kahraba home','home','4g','alfa','mtc','electricity','kahraba','water bill']],
 ['Car & Fuel',['fuel','benzine','car','parking','valet','taxi','uber','bolt','moteur','wash','mechanic','tire']],
 ['Insurance',['assurance','insurance']],
 ['Family',['lam','lynn','mum','mom','family','dad']],
 ['Health',['dietition','dietitian','dieti','laser','pharmacy','medical','doctor','physio','derma','dentist','gym','pimple']],
 ['Food (personal)',['food','snack','snacks','dinner','lunch','breakfast','resto','restaurant','coffee','laban','water','groceries','toters','ingredients','delivery food','manoushe','shawarma','burger','pizza','sushi']],
 ['Salaries',['salary','salaries']],
];
const H_KW=[['Stock & supplier',['supplier','stock','alibaba','order','bags']],['Branding & design',['branding','logo','design']],['Packaging',['packaging','box','boxes','tissue','sticker','label']],
 ['Marketing & ads',['ads','ad ','boost','influencer','marketing','meta']],['Shipping & delivery',['shipping','shipment','delivery','aramex','courier','customs']],['Website & tools',['website','domain','shopify','workspace','number','app']],['Equipment & props',['light box','props','backdrop','stand']]];
const HOLDIIT_WORDS=['holdiit','bag','bags','supplier'];
const S_CATS=['Gold','Cash savings','Other savings'];
const SAVE_WORDS=['gold','ounce','ounces','oz','savings','saving','save','lingot'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ---------- state ---------- */
const S={months:{},projects:[],rules:{},settings:{aed:3.6725,lbp:89500},wallet:'E',view:'add',ym:null,preview:[],dirty:new Set(),loaded:false,online:false};
let db=null,dict=null,sample=null,downloads=null;
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
S.ym=today().slice(0,7);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(v,sign)=>{const n=Math.round(v||0);const s=(n<0?'−':(sign&&n>0?'+':''))+'$'+Math.abs(n).toLocaleString('en-US');return s};
const rid=()=>Math.random().toString(36).slice(2,10);
const lc=s=>String(s||'').toLowerCase();
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),2200)}

/* ---------- storage + sync (this device first, then your Supabase account) ---------- */
const SB_URL='https://lrwhopukdjmtwamuwhfg.supabase.co';
const SB_KEY='sb_publishable_6YQ6RIDRe9pWbdMYeBDu0A_wTca5qiZ'; // public key: your data is protected by your login (row level security)
let sb=null,session=null,syncing=false,syncAgain=false;
S.entries={};S.projMap={};S.out={e:{},p:{},s:false};S.lastE=null;S.lastP=null;S.pjson={};
const uuid=()=>(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)}));
function lsKey(){return 'fin-store-'+(session?session.user.id:'local')}
function cacheSave(){try{localStorage.setItem(lsKey(),JSON.stringify({entries:S.entries,projMap:S.projMap,rules:S.rules,settings:S.settings,out:S.out,lastE:S.lastE,lastP:S.lastP}))}catch(e){toast('This device is out of space – download a backup')}}
function cacheLoad(){try{const c=JSON.parse(localStorage.getItem(lsKey())||'null');S.entries={};S.projMap={};S.out={e:{},p:{},s:false};S.lastE=S.lastP=null;S.rules={};
  if(c){S.entries=c.entries||{};S.projMap=c.projMap||{};S.rules=c.rules||{};S.settings=Object.assign({aed:3.6725,lbp:89500},c.settings||{});S.out=c.out||{e:{},p:{},s:false};S.lastE=c.lastE||null;S.lastP=c.lastP||null}
  rebuild();S.loaded=true}catch(e){}}
function rebuild(){
  S.months={};const list=Object.values(S.entries).filter(e=>!e.deleted).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:((a.ca||'')<(b.ca||'')?-1:1));
  for(const e of list){const k=e.d.slice(0,7);(S.months[k]=S.months[k]||[]).push(e)}
  S.projects=Object.values(S.projMap).filter(p=>!p.deleted).sort((a,b)=>(a.date||'')<(b.date||'')?-1:1);
  S.pjson={};for(const p of S.projects)S.pjson[p.id]=JSON.stringify(p);
}
function persist(path){
  if(path==='meta/projects'){ // find what changed in the projects list
    const seen=new Set();
    for(const p of S.projects){if(!p.id)p.id=uuid();seen.add(p.id);const j=JSON.stringify(p);if(S.pjson[p.id]!==j){S.projMap[p.id]=p;S.pjson[p.id]=j;S.out.p[p.id]=1}}
    for(const id in S.projMap){if(!seen.has(id)&&!S.projMap[id].deleted){S.projMap[id].deleted=true;S.out.p[id]=1}}
  } else if(path==='meta/rules'||path==='meta/settings'){S.out.s=true}
  cacheSave();setSync();queueSync();
}
function addEntry(e){e.deleted=false;e.ca=e.ca||new Date().toISOString();S.entries[e.i]=e;S.out.e[e.i]=1;rebuild();persist('e')}
function removeEntry(id){const e=S.entries[id];if(!e)return;e.deleted=true;S.out.e[id]=1;rebuild();persist('e')}
function pending(){return Object.keys(S.out.e).length+Object.keys(S.out.p).length+(S.out.s?1:0)}
function setSync(){
  const el=$('#syncState');if(!el)return;
  if(!session){el.textContent='Not signed in';return}
  if(!navigator.onLine){el.textContent=pending()?'Offline – '+pending()+' change'+(pending()>1?'s':'')+' waiting':'Offline – saved on this device';return}
  el.textContent=syncing||pending()?'Syncing…':'Synced';
}
let syncTimer=null;function queueSync(){clearTimeout(syncTimer);syncTimer=setTimeout(sync,600)}
const toRowE=e=>({id:e.i,d:e.d,t:e.t,c:e.c,n:e.n||null,a:e.a,p:e.p||null,w:e.w||'E',q:e.q??null,deleted:!!e.deleted});
const fromRowE=r=>{const e={i:r.id,d:r.d,t:r.t,c:r.c,n:r.n||'',a:+r.a,w:r.w||'E',ca:r.created_at,deleted:r.deleted};if(r.p)e.p=r.p;if(r.q!==null&&r.q!==undefined)e.q=+r.q;return e};
const toRowP=p=>({id:p.id,name:p.name,date:p.date||null,budget:p.budget===''||p.budget===undefined?null:p.budget,due:p.due||null,w:p.w||'E',notes:p.notes||null,deleted:!!p.deleted});
const fromRowP=r=>({id:r.id,name:r.name,date:r.date,budget:r.budget===null?null:+r.budget,due:r.due,w:r.w||'E',notes:r.notes||'',deleted:r.deleted});
async function sync(){
  if(!sb||!session||!navigator.onLine)return setSync();
  if(syncing){syncAgain=true;return}
  syncing=true;setSync();
  try{
    // 1. send what changed on this device
    const eids=Object.keys(S.out.e);
    for(let i=0;i<eids.length;i+=400){const ids=eids.slice(i,i+400);const rows=ids.map(id=>S.entries[id]).filter(Boolean).map(toRowE);
      const {error}=await sb.from('entries').upsert(rows);if(error)throw error;ids.forEach(id=>delete S.out.e[id])}
    const pids=Object.keys(S.out.p);
    if(pids.length){const rows=pids.map(id=>S.projMap[id]).filter(Boolean).map(toRowP);const {error}=await sb.from('projects').upsert(rows);if(error)throw error;pids.forEach(id=>delete S.out.p[id])}
    if(S.out.s){const {error}=await sb.from('settings').upsert({user_id:session.user.id,data:{rules:S.rules,aed:S.settings.aed,lbp:S.settings.lbp,gold:S.settings.gold||null}});if(error)throw error;S.out.s=false}
    cacheSave();
    // 2. get what changed elsewhere
    let changed=false;
    for(;;){let q=sb.from('entries').select('*').order('updated_at').limit(1000);if(S.lastE)q=q.gt('updated_at',S.lastE);
      const {data,error}=await q;if(error)throw error;
      for(const r of data){if(!S.out.e[r.id]){S.entries[r.id]=fromRowE(r);changed=true}S.lastE=r.updated_at}
      if(data.length<1000)break}
    {let q=sb.from('projects').select('*').order('updated_at');if(S.lastP)q=q.gt('updated_at',S.lastP);
      const {data,error}=await q;if(error)throw error;
      for(const r of data){if(!S.out.p[r.id]){S.projMap[r.id]=fromRowP(r);changed=true}S.lastP=r.updated_at}}
    if(!S.out.s){const {data,error}=await sb.from('settings').select('data').maybeSingle();if(!error&&data&&data.data){const d=data.data;
      const before=JSON.stringify([S.rules,S.settings]);S.rules=d.rules||{};S.settings=Object.assign(S.settings,{aed:d.aed||S.settings.aed,lbp:d.lbp||S.settings.lbp,gold:d.gold??S.settings.gold});
      if(JSON.stringify([S.rules,S.settings])!==before)changed=true}}
    cacheSave();
    if(changed){rebuild();if(!S.preview.length&&!(document.activeElement&&['quick','mSearch'].includes(document.activeElement.id))&&$('#sheet').hidden)render()}
  }catch(e){console.warn('sync failed',e);if(e&&/JWT|auth/i.test(e.message||''))toast('Please sign in again')}
  finally{syncing=false;setSync();if(syncAgain){syncAgain=false;queueSync()}}
}

/* ---------- data helpers ---------- */
function allEntries(){const out=[];for(const k in S.months)for(const e of S.months[k])out.push(e);return out}
function monthEntries(ym,w){return (S.months[ym]||[]).filter(e=>(e.w||'E')===w)}
function findProject(name){const n=lc(name);return S.projects.find(p=>lc(p.name)===n)}
function projStats(p){
  let rec=0,team=0,rent=0,extra=0;const n=lc(p.name);
  for(const e of allEntries()){if(lc(e.p)!==n)continue;
    if(e.t==='in')rec+=e.a;else if(e.c==='Team cost')team+=e.a;else if(e.c==='Rental cost')rent+=e.a;else extra+=e.a}
  const cost=team+rent+extra;const hasB=p.budget!==null&&p.budget!==undefined&&p.budget!=='';
  const value=hasB?+p.budget:rec;
  return {rec,team,rent,extra,cost,value,owed:hasB?Math.max(+p.budget-rec,0):0,profit:value-cost,hasB};
}
function monthSummary(ym,w){
  const es=monthEntries(ym,w);let rec=0,job=0,exp=0;const byCat={};
  for(const e of es){if(e.t==='in'){rec+=e.a;continue}
    byCat[e.c]=(byCat[e.c]||0)+e.a;
    if(w==='E'&&E_JOB.includes(e.c))job+=e.a;else exp+=e.a}
  const jobs=S.projects.filter(p=>(p.w||'E')===w&&p.date&&p.date.slice(0,7)===ym);
  let revenue=0;for(const p of jobs)revenue+=projStats(p).value;
  const spent=job+exp;
  return {rec,job,exp,spent,cash:rec-spent,revenue,profit:(w==='E'?revenue:rec)-spent,jobs,byCat,es};
}
function totalOwed(){let t=0;for(const p of S.projects){const s=projStats(p);t+=s.owed}return t}
function ensureProject(name,date,w){if(!name)return;if(!findProject(name)){S.projects.push({name,date:date||today(),budget:null,due:null,w:w||'E'});persist('meta/projects')}}

/* ---------- the reader: turns "25 4g" into an entry ---------- */
function normKey(s){return lc(s).replace(/[✓◦•\-+$]/g,' ').replace(/\d+([.,]\d+)?/g,' ').replace(/\b(usd|aed|dhs?|lbp|ll|dollars?)\b/g,' ').replace(/\s+/g,' ').trim().slice(0,40)}
function hasWord(t,k){if(k.length<=3)return new RegExp('(^|[^a-z])'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)').test(t);return t.includes(k)}
function guessProject(t){
  let best=null,len=0;
  for(const p of S.projects){const n=lc(p.name);
    const keys=[n,...n.split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!['content','shoot','projects','project','video','with'].includes(w))];
    for(const k of keys){if(k&&hasWord(t,k)&&k.length>len){best=p.name;len=k.length}}}
  return best;
}
function parseDate(t,base){
  let d=base,m;
  if(/\byesterday\b/.test(t)){const x=new Date(base+'T12:00');x.setDate(x.getDate()-1);d=x.toISOString().slice(0,10);t=t.replace(/\byesterday\b/,'')}
  else if(/\btoday\b/.test(t)){t=t.replace(/\btoday\b/,'')}
  else if((m=t.match(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/))){
    const mi=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].slice(0,3));
    d=base.slice(0,4)+'-'+String(mi+1).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0');t=t.replace(m[0],' ')}
  else if((m=t.match(/\b(\d{1,2})\/(\d{1,2})\b(?!\s*(\$|usd|aed|lbp))/))){d=base.slice(0,4)+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0');t=t.replace(m[0],' ')}
  return {d,t};
}
function readLine(raw,base){
  let t=lc(raw).trim();if(!t)return null;
  let dir=null;
  if(/^[✓✔+]/.test(t)||/\b(received|got paid|paid me|collected|payment from|income)\b/.test(t))dir='in';
  if(/^[-◦•]/.test(t))dir=dir||'out';
  t=t.replace(/^[✓✔+\-◦•]\s*/,'');
  const pd=parseDate(t,base);t=pd.t;
  let q=null;const qm=t.match(/(\d+(?:\.\d+)?)\s*(oz|ounces?)\b/);if(qm){q=parseFloat(qm[1]);t=t.replace(qm[0],' ounce ')}
  else if(/\b(oz|ounces?)\b/.test(t))q=1;
  const re=/(\$\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k\b)?\s*(\$|usd|aed|dhs?|dirhams?|lbp|ll|l\.l\.?|lira)?/gi;let mm,cands=[];
  while((mm=re.exec(t))){cands.push({m:mm,cur:!!(mm[1]||mm[4]),glued:!mm[4]&&!mm[3]&&/[a-z]/.test(t[mm.index+(mm[1]||'').length+mm[2].length]||'')})}
  const pick=cands.find(c=>c.cur)||cands.find(c=>!c.glued)||cands[0];
  const m=pick?[pick.m[0],pick.m[2],pick.m[3],pick.m[4]]:null;if(m)m.index=pick.m.index;
  if(!m)return {raw,d:pd.d,t:dir||'out',a:0,n:raw.trim(),c:'',p:'',w:'E',flag:true,noamt:true};
  let a=parseFloat(m[1].replace(/,/g,''));if(m[2])a*=1000;
  const cur=lc(m[3]||'');let curNote='';
  if(/^(aed|dh|dhs|dirham|dirhams)$/.test(cur)){curNote=' ('+a+' AED)';a=a/(+S.settings.aed||3.6725)}
  else if(/^(lbp|ll|l\.l|l\.l\.|lira)$/.test(cur)){curNote=' ('+a.toLocaleString()+' LBP)';a=a/(+S.settings.lbp||89500)}
  a=Math.round(a*100)/100;
  let desc=(t.slice(0,m.index)+' '+t.slice(m.index+m[0].length)).replace(/\b(received|got paid|paid me|collected|payment from|income)\b/g,' ').replace(/[()]/g,' ').replace(/\s+/g,' ').trim();
  if(!dir)dir='out';
  const key=normKey(desc);
  let w=SAVE_WORDS.some(k=>hasWord(desc,k))?'S':HOLDIIT_WORDS.some(k=>hasWord(desc,k))?'H':'E';
  let c='',p='',flag=false;
  // learned rules first (longest match)
  let rule=S.rules[key];
  if(!rule){let L=0;for(const k in S.rules){if(k.length>=3&&hasWord(desc,k)&&k.length>L){rule=S.rules[k];L=k.length}}}
  if(rule&&(!rule.t||rule.t===dir)){c=rule.c||'';p=rule.p||'';if(rule.w)w=rule.w}
  if(!p&&w==='E')p=guessProject(desc)||'';
  if(!c){
    if(w==='S'){c=/\b(gold|ounces?|oz|lingot)\b/.test(desc)?'Gold':/\bcash\b/.test(desc)||/\bsav/.test(desc)?'Cash savings':'Other savings';if(/\b(sold|sell|sale)\b/.test(desc))dir='in'}
    else if(w==='H'){c=dir==='in'?'Sales':(H_KW.find(([,ks])=>ks.some(k=>hasWord(desc,k)))||['Other'])[0]}
    else if(dir==='in'){c=p?'Project payment':'Other income';if(!p)flag=true}
    else if(p){c=CREW.some(k=>hasWord(desc,k))?'Team cost':(/\brent(al)?\b/.test(desc)?'Rental cost':'Extra cost')}
    else if(CREW.some(k=>hasWord(desc,k))){c='Team cost';flag=true}
    else{const hit=KW.find(([,ks])=>ks.some(k=>hasWord(desc,k)));c=hit?hit[0]:'Miscellaneous';if(!hit)flag=true}
  }
  if(w==='S')p='';
  return {raw:raw.trim(),d:pd.d,t:dir,a,n:(desc||'no description')+curNote,c,p,w,flag,key,q:w==='S'&&c==='Gold'?q:null};
}

/* ---------- views ---------- */
function setView(v){S.view=v;document.querySelectorAll('nav.tabs a').forEach(a=>a.setAttribute('aria-current',a.dataset.v===v?'page':'false'));render()}
function render(){
  const v=S.view;const app=$('#app');
  $('#walletSeg').classList.toggle('h',S.wallet==='H');
  $('#wE').setAttribute('aria-pressed',S.wallet==='E');$('#wH').setAttribute('aria-pressed',S.wallet==='H');
  if(v==='add')app.innerHTML=viewAdd();
  else if(v==='month')app.innerHTML=viewMonth();
  else if(v==='jobs')app.innerHTML=viewJobs();
  else if(v==='year')app.innerHTML=viewYear();
  else if(v==='savings')app.innerHTML=viewSavings();
  else app.innerHTML=viewMore();
  bind();
}
function catOptions(w,t,sel){
  let g=w==='S'?[['Savings',S_CATS]]:w==='H'?(t==='in'?[['Holdiit money in',H_IN]]:[['Holdiit costs',H_OUT]]):(t==='in'?[['Money in',E_IN]]:[['Job costs (tag a project)',E_JOB],['Monthly expenses',E_EXP]]);
  let h='';for(const [lab,arr] of g){h+='<optgroup label="'+esc(lab)+'">'+arr.map(c=>'<option'+(c===sel?' selected':'')+'>'+esc(c)+'</option>').join('')+'</optgroup>'}return h;
}
function projOptions(sel,noNew){
  const ps=[...S.projects].filter(p=>(p.w||'E')==='E').sort((a,b)=>a.date<b.date?1:-1);
  return '<option value="">No project</option>'+ps.map(p=>'<option'+(lc(p.name)===lc(sel)?' selected':'')+' value="'+esc(p.name)+'">'+esc(p.name)+'</option>').join('')+(noNew?'':'<option value="__new">+ New project…</option>')+(sel&&!findProject(sel)?'<option selected value="'+esc(sel)+'">'+esc(sel)+' (new)</option>':'');
}
function entryRow(e){
  const h=(e.w||'E')==='H';
  return '<div class="it" data-edit="'+e.i+'"><div class="t">'+esc(e.n)+'</div><div class="amt'+(e.t==='in'?' in':'')+'">'+(e.t==='in'?'+':'')+money(e.a)+'</div>'+
  '<div class="m">'+(h?'<span class="pill h">Holdiit</span>':'')+(e.w==='S'?'<span class="pill s">Savings'+(e.q?' · '+e.q+' oz':'')+'</span>':'')+'<span>'+esc(e.c)+'</span>'+(e.p?'<span>· '+esc(e.p)+'</span>':'')+'</div></div>';
}
function groupedList(es){
  if(!es.length)return '<div class="empty">Nothing here yet.</div>';
  let h='',last='';
  for(const e of es){if(e.d!==last){last=e.d;const dt=new Date(e.d+'T12:00');h+='<div class="day">'+dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'</div>'}h+=entryRow(e)}
  return '<div class="list">'+h+'</div>';
}
function viewAdd(){
  const recent=allEntries().map((e,ix)=>[e,ix]).sort((a,b)=>a[0].d<b[0].d?1:a[0].d>b[0].d?-1:b[1]-a[1]).slice(0,30).map(x=>x[0]);
  const pv=S.preview;
  let pvh='';
  if(pv.length){
    pvh='<h2>Check before saving</h2><div class="stack">'+pv.map((e,i)=>'<div class="pv'+(e.flag?' flag':'')+'" data-i="'+i+'">'+
      '<div class="src">'+esc(e.raw)+(e.flag?' — <b>check this one</b>':'')+'</div>'+
      '<div class="row" style="grid-column:1/-1;gap:6px;flex-wrap:wrap">'+
        '<input type="number" step="0.01" inputmode="decimal" aria-label="Amount in dollars" class="num" data-f="a" value="'+e.a+'" style="width:110px">'+
        '<div class="toggle" role="group" aria-label="Money in or out"><button class="tout" data-f="t" data-val="out" aria-pressed="'+(e.t==='out')+'">'+(e.w==='S'?'Add':'Out')+'</button><button class="tin" data-f="t" data-val="in" aria-pressed="'+(e.t==='in')+'">'+(e.w==='S'?'Take out':'In')+'</button></div>'+
        '<div class="toggle" role="group" aria-label="Wallet"><button class="te" data-f="w" data-val="E" aria-pressed="'+(e.w==='E')+'">eddytings</button><button class="th" data-f="w" data-val="H" aria-pressed="'+(e.w==='H')+'">Holdiit</button><button class="ts" data-f="w" data-val="S" aria-pressed="'+(e.w==='S')+'">Savings</button></div>'+
        '<button class="x" data-del="'+i+'" aria-label="Remove this line" style="margin-left:auto">×</button></div>'+
      '<div class="f"><select data-f="c" aria-label="Category">'+catOptions(e.w,e.t,e.c)+'</select>'+
        (e.w==='E'?'<select data-f="p" aria-label="Project">'+projOptions(e.p)+'</select>':e.w==='S'&&e.c==='Gold'?'<input type="number" step="0.01" inputmode="decimal" data-f="q" aria-label="Ounces" placeholder="Ounces" value="'+(e.q??'')+'">':'<span></span>')+
        '<input type="text" data-f="n" aria-label="Description" value="'+esc(e.n)+'">'+
        '<input type="date" data-f="d" aria-label="Date" value="'+e.d+'"></div></div>').join('')+'</div>'+
      '<div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="btn primary" id="saveAll">Save '+pv.length+(pv.length>1?' entries':' entry')+'</button>'+
      (sample&&pv.some(e=>e.flag)?'<button class="btn" id="askClaude">Ask Claude to sort the yellow ones</button>':'')+
      '<button class="btn ghost" id="clearPv">Cancel</button></div>';
  }
  return pageHead('Add','Type what you spent or received, check it, then save.')+(!navigator.onLine&&pending()?'<div class="banner">You are offline. New entries are kept on this device and will sync when you are back online.</div>':'')+
  '<div class="cols"><div><div class="card stack"><label for="quick" class="small muted" style="font-weight:600">Type it like your notes – one line each</label>'+
  '<textarea id="quick" placeholder="25 4g&#10;✓ 8000 cerelac&#10;110 aed dinner&#10;yesterday 40 fuel&#10;300 mike cerelac"></textarea>'+
  '<div class="row between" style="flex-wrap:wrap"><div class="row"><input type="date" id="baseDate" value="'+(S.baseDate||today())+'" aria-label="Date for these lines">'+
  (dict?'<button class="btn mic" id="micBtn" aria-label="Speak instead of typing"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>':'')+
  '</div><button class="btn primary" id="readBtn">Read it</button></div>'+
  '<div class="hint"><code>✓</code> or <code>+</code> at the start = money in · add <code>aed</code> or <code>lbp</code> for other currencies · start with <code>yesterday</code> or <code>12 nov</code> for another day · a project name tags the job · "bags" or "holdiit" goes to Holdiit · "gold", "oz" or "savings" goes to Savings (e.g. <code>4000 gold 1 oz</code>).</div></div>'+
  pvh+'</div><div><h2 class="first">Latest</h2><div class="card" style="padding:4px 12px">'+groupedList(recent)+'</div></div></div>';
}
function tile(l,v,s,cls){return '<div class="tile '+(cls||'')+'"><span class="l">'+l+'</span><span class="v">'+v+'</span>'+(s?'<span class="s">'+s+'</span>':'')+'</div>'}
function bars(byCat,w){
  const arr=Object.entries(byCat).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);if(!arr.length)return '<div class="empty">No spending this month.</div>';
  const max=arr[0][1];
  return '<div class="bars">'+arr.map(([c,v])=>'<div class="b"><span>'+esc(c)+'</span><div class="track"><div class="fill'+(w==='S'?' s':w==='H'?' h':E_JOB.includes(c)?' job':'')+'" style="width:'+Math.max(2,v/max*100)+'%"></div></div><span class="amt">'+money(v)+'</span></div>').join('')+'</div>';
}
function jobCard(p){
  const s=projStats(p);const late=s.owed>0&&p.due&&p.due<today();
  return '<div class="job" data-proj="'+esc(p.name)+'"><div class="nm">'+esc(p.name)+'</div><div class="amt'+(s.profit<0?'':'')+'" style="color:'+(s.profit<0?'var(--bad)':'var(--ink)')+'">'+money(s.profit)+'</div>'+
  '<div class="meta"><span>'+new Date(p.date+'T12:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})+'</span>'+
  '<span>Budget <b>'+(s.hasB?money(p.budget):'—')+'</b></span><span>Cost <b>'+money(s.cost)+'</b></span><span>Received <b>'+money(s.rec)+'</b></span>'+
  (s.owed>0?'<span class="pill '+(late?'late':'owe')+'">'+(late?'Late · ':'Owes ')+money(s.owed)+(p.due&&!late?' by '+new Date(p.due+'T12:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'')+'</span>':'')+
  (!s.hasB?'<span class="pill owe">Add budget</span>':'')+'</div></div>';
}
function pageHead(t,lead,right){return '<div class="phead"><div><h1>'+t+'</h1><p class="lead">'+lead+'</p></div>'+(right||'')+'</div>'}
function monthBar(){const [y,m]=S.ym.split('-').map(Number);return '<p class="lead" style="margin:4px 0 0">'+(S.wallet==='H'?'Holdiit this month: sales, costs and profit.':'Your month: what you earned, what you spent, and what is left.')+'</p>'+'<div class="monthbar"><button class="arrow" id="prevM" aria-label="Previous month">‹</button><h1>'+MONTHS[m-1]+' '+y+'</h1><button class="arrow" id="nextM" aria-label="Next month">›</button></div>'}
function viewMonth(){
  const w=S.wallet,s=monthSummary(S.ym,w);
  if(w==='H'){
    return monthBar()+'<div class="hero">'+tile('Profit',money(s.cash,true),'Sales − costs','big '+(s.cash<0?'neg':s.cash>0?'pos':''))+tile('Sales',money(s.rec),'Money in','big')+'</div>'+
    '<div class="grid3" style="margin-top:10px">'+tile('Costs',money(s.spent))+tile('Entries',s.es.length)+tile('Year so far',money(yearHoldiit(),true))+'</div>'+
    '<div class="cols"><div><h2>Where the money went</h2><div class="card">'+bars(s.byCat,'H')+'</div></div><div><h2>All Holdiit entries</h2><div class="card" style="padding:4px 12px">'+groupedList([...s.es].reverse())+'</div></div></div>';
  }
  return monthBar()+
  '<div class="hero">'+tile('Net profit',money(s.profit,true),'Revenue − job costs − expenses','big '+(s.profit<0?'neg':s.profit>0?'pos':''))+
  tile('Cash flow',money(s.cash,true),'Received − spent','big '+(s.cash<0?'neg':s.cash>0?'pos':''))+'</div>'+
  '<div class="grid3" style="margin-top:10px">'+tile('Revenue',money(s.revenue),s.jobs.length+' job'+(s.jobs.length===1?'':'s'))+tile('Job costs',money(s.job),'crew, rental, extras')+tile('Monthly expenses',money(s.exp),'your living + office')+
  tile('Money received',money(s.rec))+tile('Money spent',money(s.spent))+tile('Clients owe you',money(totalOwed()),'all jobs')+'</div>'+
  savedNote(S.ym)+'<div class="cols"><div><h2>Where the money went</h2><div class="card">'+bars(s.byCat,'E')+'<div class="hint" style="margin-top:6px">Orange = job costs · blue = monthly expenses</div></div>'+
  '</div><div><h2>Jobs this month</h2><div class="card" style="padding:4px 12px">'+(s.jobs.length?s.jobs.map(jobCard).join(''):'<div class="empty">No jobs dated this month.</div>')+'</div>'+
  '</div></div><h2>All entries</h2><div class="card" style="padding:8px 12px"><input type="text" class="search" id="mSearch" placeholder="Search this month" aria-label="Search this month"><div id="mList">'+groupedList([...s.es].reverse())+'</div></div>';
}
function yearHoldiit(){let t=0;const y=S.ym.slice(0,4);for(const k in S.months)if(k.startsWith(y))for(const e of S.months[k])if(e.w==='H')t+=e.t==='in'?e.a:-e.a;return t}
function viewJobs(){
  if(S.wallet==='H')return '<div class="card empty">Jobs are for eddytings work. Switch to eddytings at the top.</div>';
  const ps=S.projects.filter(p=>(p.w||'E')==='E');
  const owed=ps.map(p=>[p,projStats(p)]).filter(([,s])=>s.owed>0).sort((a,b)=>(a[0].due||'9')<(b[0].due||'9')?-1:1);
  const noB=ps.filter(p=>!projStats(p).hasB).length;
  let h=pageHead('Jobs','Every job, what it cost, what you made, and who still owes you.','<button class="btn primary" id="newJob">+ New job</button>')+
  '<div class="hero">'+tile('Clients owe you',money(totalOwed()),owed.length+' job'+(owed.length===1?'':'s')+' not fully paid','big')+tile('Missing budget',noB,'add them so "owes you" is right','big')+'</div>';
  if(owed.length)h+='<h2>Waiting for money</h2><div class="card" style="padding:4px 12px">'+owed.map(([p])=>jobCard(p)).join('')+'</div>';
  const by={};for(const p of ps){const k=(p.date||'').slice(0,7);(by[k]=by[k]||[]).push(p)}
  for(const k of Object.keys(by).sort().reverse()){const [y,m]=k.split('-').map(Number);const list=by[k].sort((a,b)=>a.date<b.date?-1:1);
    let tot=0,prof=0;for(const p of list){const s=projStats(p);tot+=s.value;prof+=s.profit}
    h+='<h2>'+MONTHS[m-1]+' '+y+' · '+list.length+' job'+(list.length===1?'':'s')+' · '+money(tot)+' · profit '+money(prof)+'</h2><div class="card" style="padding:4px 12px">'+list.map(jobCard).join('')+'</div>'}
  return h;
}
function viewYear(){
  const y=S.ym.slice(0,4),w=S.wallet;let rows='',T={rev:0,prof:0,rec:0,sp:0,cash:0};const cash=[];
  for(let m=1;m<=12;m++){const ym=y+'-'+String(m).padStart(2,'0');const s=monthSummary(ym,w);
    cash.push(s.cash);T.rev+=s.revenue;T.prof+=s.profit;T.rec+=s.rec;T.sp+=s.spent;T.cash+=s.cash;
    const c=v=>'<td class="'+(v<0?'neg':'')+'">'+money(v)+'</td>';
    rows+='<tr data-ym="'+ym+'" style="cursor:pointer"><td>'+MONTHS[m-1].slice(0,3)+'</td>'+(w==='E'?c(s.revenue)+c(s.profit):'')+c(s.rec)+c(s.spent)+c(s.cash)+'</tr>'}
  const max=Math.max(1,...cash.map(Math.abs));const W=520,H=160,mid=H/2,bw=W/12;
  let svg='<svg class="chart" viewBox="0 0 '+W+' '+(H+20)+'" role="img" aria-label="Cash flow per month"><line x1="0" x2="'+W+'" y1="'+mid+'" y2="'+mid+'" stroke="var(--line)"/>';
  cash.forEach((v,i)=>{const h=Math.abs(v)/max*(mid-8);const x=i*bw+bw*.18;svg+='<rect x="'+x+'" width="'+bw*.64+'" y="'+(v>=0?mid-h:mid)+'" height="'+Math.max(h,1)+'" rx="3" fill="'+(v>=0?'var(--good)':'var(--bad)')+'"/><text x="'+(i*bw+bw/2)+'" y="'+(H+14)+'" text-anchor="middle" font-size="11" fill="var(--muted)">'+MONTHS[i][0]+'</text>'});
  svg+='</svg>';
  return '<div class="phead"><div><h1>'+y+(w==='H'?' · Holdiit':'')+'</h1><p class="lead">All months side by side.</p></div><div class="row"><button class="arrow" id="prevY" aria-label="Previous year">‹</button><button class="arrow" id="nextY" aria-label="Next year">›</button></div></div>'+
  '<div class="hero">'+(w==='E'?tile('Net profit',money(T.prof,true),'whole year','big '+(T.prof<0?'neg':'pos')):tile('Sales',money(T.rec),'whole year','big'))+tile('Cash flow',money(T.cash,true),'received − spent','big '+(T.cash<0?'neg':'pos'))+'</div>'+
  '<h2>Cash flow by month</h2><div class="card">'+svg+'</div>'+
  '<h2>Month by month</h2><div class="card scrollx"><table class="yr"><thead><tr><th>Month</th>'+(w==='E'?'<th>Revenue</th><th>Net profit</th>':'')+'<th>Received</th><th>Spent</th><th>Cash flow</th></tr></thead><tbody>'+rows+
  '<tr class="tot"><td>Total</td>'+(w==='E'?'<td>'+money(T.rev)+'</td><td class="'+(T.prof<0?'neg':'')+'">'+money(T.prof)+'</td>':'')+'<td>'+money(T.rec)+'</td><td>'+money(T.sp)+'</td><td class="'+(T.cash<0?'neg':'')+'">'+money(T.cash)+'</td></tr></tbody></table></div>'+
  '<div class="hint" style="margin-top:8px">Tap a month to open it.</div>';
}
function viewMore(){
  const rk=Object.keys(S.rules).sort();
  return pageHead('More','Downloads, backup, currencies and settings.')+'<div class="stack">'+
  '<div class="card stack"><h3>Download</h3><div class="hint">An Excel file with every entry, every job and the month totals. Keep one as a backup now and then.</div>'+
  (downloads?'<div class="row" style="flex-wrap:wrap"><button class="btn primary" id="xlsxBtn">Download Excel</button><button class="btn" id="jsonBtn">Download backup file</button></div>':'<div class="hint">Downloads are not available here.</div>')+
  '<label class="small muted" for="restoreFile" style="font-weight:600">Restore from a backup file</label><input type="file" id="restoreFile" accept=".json,application/json"></div>'+
  '<div class="card stack"><h3>Currencies</h3><div class="form"><label>1 USD in AED<input type="number" step="0.0001" id="rateAed" value="'+S.settings.aed+'"></label><label>1 USD in LBP<input type="number" step="1" id="rateLbp" value="'+S.settings.lbp+'"></label><label class="full">Gold price today ($ per ounce)<input type="number" step="1" id="goldPx" value="'+(S.settings.gold||'')+'"></label></div></div>'+
  '<div class="card stack"><h3>What the app has learned ('+rk.length+')</h3><div class="hint">When you fix a category or project before saving, the app remembers it for next time. Remove one if it learned something wrong.</div>'+
  (rk.length?'<div class="list">'+rk.map(k=>'<div class="it" style="cursor:default"><div class="t">'+esc(k)+'</div><button class="x" data-unrule="'+esc(k)+'" aria-label="Forget this">×</button><div class="m">'+esc(S.rules[k].c)+(S.rules[k].p?' · '+esc(S.rules[k].p):'')+(S.rules[k].w==='H'?' · Holdiit':'')+'</div></div>').join('')+'</div>':'<div class="empty">Nothing learned yet.</div>')+'</div>'+
  '<div class="card stack"><h3>Account</h3><div class="hint">Signed in as '+esc(session&&session.user.email)+'. Your data is saved in your private account and on this device, so a new phone or laptop gets everything after you sign in.</div><div class="hint">To change or add something to this app, ask Claude in any chat. Updates reach every device automatically.</div><button class="btn" id="signOutBtn" style="color:var(--bad)">Sign out</button></div></div>';
}


function savedNote(ym){const es=monthEntries(ym,'S');if(!es.length)return '';let add=0,out=0;for(const e of es){if(e.t==='in')out+=e.a;else add+=e.a}
  return '<div class="banner ok" style="margin-top:12px">'+(add?'You put <b>'+money(add)+'</b> into savings this month':'')+(add&&out?' · ':'')+(out?'took out <b>'+money(out)+'</b>':'')+'. Savings are not counted as spending.</div>'}
function viewSavings(){
  const es=allEntries().filter(e=>e.w==='S');let tot=0,oz=0,goldCost=0;const byCat={};
  for(const e of es){const sg=e.t==='in'?-1:1;tot+=sg*e.a;byCat[e.c]=(byCat[e.c]||0)+sg*e.a;if(e.c==='Gold'){if(e.q)oz+=sg*e.q;goldCost+=sg*e.a}}
  const px=+S.settings.gold||0;const val=px&&oz?oz*px:0;const avg=oz>0?goldCost/oz:0;
  const sorted=es.map((e,ix)=>[e,ix]).sort((a,b)=>a[0].d<b[0].d?1:a[0].d>b[0].d?-1:b[1]-a[1]).map(x=>x[0]);
  return pageHead('Savings','Gold and money you put aside. Not counted as spending.')+
  '<div class="hero">'+tile('Total saved',money(tot),'everything you put in − taken out','big pos')+tile('Gold you hold',(Math.round(oz*100)/100)+' oz',oz?'avg '+money(avg)+' per oz':'type e.g. 4000 gold 1 oz','big')+'</div>'+
  '<div class="grid3" style="margin-top:10px">'+tile('Spent on gold',money(goldCost))+tile('Gold worth now',val?money(val):'—',px?'at '+money(px)+'/oz':'add today\'s price')+tile('Gold gain',val?money(val-goldCost,true):'—','',val?(val-goldCost<0?'neg':'pos'):'')+'</div>'+
  '<div class="card" style="margin-top:10px"><label class="small muted" for="goldPx2" style="font-weight:600">Gold price today ($ per ounce) – update it when you check</label><input type="number" id="goldPx2" step="1" inputmode="decimal" value="'+(S.settings.gold||'')+'" style="width:100%;margin-top:6px"></div>'+
  '<h2>By type</h2><div class="card">'+bars(byCat,'S')+'</div>'+
  '<h2>All savings entries</h2><div class="card" style="padding:4px 12px">'+groupedList(sorted)+'</div>';
}

/* ---------- edit sheets ---------- */
function openSheet(html){$('#sheetPanel').innerHTML=html;$('#sheet').hidden=false;bindSheet()}
function closeSheet(){$('#sheet').hidden=true;$('#sheetPanel').innerHTML=''}
function editEntry(id){
  const e=allEntries().find(x=>x.i===id);if(!e)return;S.editing={...e};
  openSheet('<div class="row between"><h3>Edit entry</h3><button class="x" id="sx" aria-label="Close">×</button></div><div class="form" style="margin-top:12px">'+
   '<label>Amount ($)<input id="eA" type="number" step="0.01" inputmode="decimal" value="'+e.a+'"></label><label>Date<input id="eD" type="date" value="'+e.d+'"></label>'+
   '<label>In / out<select id="eT"><option value="out"'+(e.t==='out'?' selected':'')+'>Out</option><option value="in"'+(e.t==='in'?' selected':'')+'>In</option></select></label>'+
   '<label>Wallet<select id="eW"><option value="E"'+((e.w||'E')==='E'?' selected':'')+'>eddytings</option><option value="H"'+(e.w==='H'?' selected':'')+'>Holdiit</option><option value="S"'+(e.w==='S'?' selected':'')+'>Savings</option></select></label>'+
   '<label class="full">Category<select id="eC">'+catOptions(e.w||'E',e.t,e.c)+'</select></label>'+
   '<label class="full">Project<select id="eP">'+projOptions(e.p,true)+'</select></label>'+
   '<label class="full">Description<input id="eN" type="text" value="'+esc(e.n)+'"></label><label class="full">Gold ounces (savings only)<input id="eQ" type="number" step="0.01" inputmode="decimal" value="'+(e.q??'')+'"></label></div>'+
   '<div class="row between" style="margin-top:16px"><button class="btn" id="eDel" style="color:var(--bad)">Delete</button><button class="btn primary" id="eSave">Save</button></div>');
  const refresh=()=>{$('#eC').innerHTML=catOptions($('#eW').value,$('#eT').value,$('#eC').value)};
  $('#eT').onchange=refresh;$('#eW').onchange=refresh;
  $('#eDel').onclick=()=>{if($('#eDel').dataset.sure){removeEntry(id);closeSheet();render();toast('Deleted')}else{$('#eDel').dataset.sure=1;$('#eDel').textContent='Tap again to delete'}};
  $('#eSave').onclick=()=>{const n={...e,a:+$('#eA').value||0,d:$('#eD').value||e.d,t:$('#eT').value,w:$('#eW').value,c:$('#eC').value,p:$('#eW').value==='E'?$('#eP').value:'',n:$('#eN').value};const qv=$('#eQ').value;if(n.w==='S'&&qv!=='')n.q=+qv;else delete n.q;
    if(!n.p)delete n.p;removeEntry(id);addEntry(n);learn(n);closeSheet();render();toast('Saved')};
}
function newProjectSheet(after){
  openSheet('<div class="row between"><h3>New job</h3><button class="x" id="sx" aria-label="Close">×</button></div><div class="form" style="margin-top:12px">'+
  '<label class="full">Job name<input id="jN" type="text" placeholder="e.g. Cerelac TVC"></label><label>Shoot date<input id="jD" type="date" value="'+today()+'"></label><label>Budget ($)<input id="jB" type="number" inputmode="decimal"></label>'+
  '<label class="full">When is the rest of the money due?<input id="jDue" type="date"></label></div><div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" id="jSave">Add job</button></div>');
  $('#jSave').onclick=()=>{const n=$('#jN').value.trim();if(!n){$('#jN').focus();return}
    if(findProject(n)){toast('A job with that name already exists');return}
    S.projects.push({name:n,date:$('#jD').value||today(),budget:$('#jB').value===''?null:+$('#jB').value,due:$('#jDue').value||null,w:'E'});persist('meta/projects');closeSheet();if(after)after(n);else render();toast('Job added')};
}
function editProject(name){
  const p=findProject(name);if(!p)return;const s=projStats(p);
  openSheet('<div class="row between"><h3>'+esc(p.name)+'</h3><button class="x" id="sx" aria-label="Close">×</button></div>'+
  '<div class="grid3" style="margin:12px 0">'+tile('Received',money(s.rec))+tile('Costs',money(s.cost))+tile('Net profit',money(s.profit),'',s.profit<0?'neg':'pos')+'</div>'+
  '<div class="form"><label>Shoot date<input id="pD" type="date" value="'+(p.date||'')+'"></label><label>Budget ($)<input id="pB" type="number" inputmode="decimal" value="'+(p.budget??'')+'"></label>'+
  '<label class="full">When is the rest due?<input id="pDue" type="date" value="'+(p.due||'')+'"></label></div>'+
  '<h2>Money for this job</h2><div class="list">'+(allEntries().filter(e=>lc(e.p)===lc(p.name)).sort((a,b)=>a.d<b.d?-1:1).map(e=>'<div class="it" style="cursor:default"><div class="t">'+esc(e.n)+' <span class="muted small">'+e.d.slice(5)+'</span></div><div class="amt'+(e.t==='in'?' in':'')+'">'+(e.t==='in'?'+':'')+money(e.a)+'</div><div class="m">'+esc(e.c)+'</div></div>').join('')||'<div class="empty">No money tagged yet.</div>')+'</div>'+
  '<div class="row between" style="margin-top:16px"><button class="btn" id="pDel" style="color:var(--bad)">Delete job</button><button class="btn primary" id="pSave">Save</button></div>');
  $('#pSave').onclick=()=>{p.date=$('#pD').value||p.date;p.budget=$('#pB').value===''?null:+$('#pB').value;p.due=$('#pDue').value||null;persist('meta/projects');closeSheet();render();toast('Saved')};
  $('#pDel').onclick=()=>{if($('#pDel').dataset.sure){S.projects=S.projects.filter(x=>x!==p);persist('meta/projects');closeSheet();render();toast('Job deleted – its entries stay')}else{$('#pDel').dataset.sure=1;$('#pDel').textContent='Tap again to delete'}};
}
function bindSheet(){const x=$('#sx');if(x)x.onclick=closeSheet}
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#sheet').hidden)closeSheet()});

/* ---------- learning ---------- */
function learn(e,orig){
  const key=normKey(e.n.replace(/\(.*?(aed|lbp)\)/i,''));if(!key||key.length<2)return;
  if(orig&&orig.c===e.c&&orig.p===(e.p||'')&&orig.w===e.w)return;
  S.rules[key]={c:e.c,p:e.p||'',w:e.w,t:e.t};persist('meta/rules');
}

/* ---------- bind events ---------- */
function bind(){
  const v=S.view;
  if(v==='add'){
    const q=$('#quick');q.value=S.draft||'';q.oninput=()=>{S.draft=q.value;try{localStorage.setItem('em-draft',q.value)}catch(e){}};
    $('#baseDate').onchange=e=>{S.baseDate=e.target.value};
    $('#readBtn').onclick=()=>{const base=$('#baseDate').value||today();const lines=q.value.split(/\n+/).map(l=>readLine(l,base)).filter(Boolean);
      if(!lines.length){q.focus();return}S.preview=lines.map(l=>({...l,orig:{c:l.c,p:l.p,w:l.w}}));S.draft='';try{localStorage.removeItem('em-draft')}catch(e){}render()};
    const mic=$('#micBtn');if(mic)mic.onclick=()=>{
      if(mic.classList.contains('on')){dict.stop().catch(()=>{});return}
      dict.start().catch(err=>{if(err&&err.code==='not_granted')mic.remove()});
    };
    document.querySelectorAll('.pv').forEach(card=>{const i=+card.dataset.i,e=S.preview[i];
      card.querySelectorAll('[data-f]').forEach(el=>{const f=el.dataset.f;
        if(el.tagName==='BUTTON')el.onclick=()=>{e[f]=el.dataset.val;if(f==='t'||f==='w'){const cats=e.w==='S'?S_CATS:e.w==='H'?(e.t==='in'?H_IN:H_OUT):(e.t==='in'?E_IN:[...E_JOB,...E_EXP]);if(e.w!=='E')e.p='';if(!cats.includes(e.c))e.c=e.w==='S'?'Gold':e.w==='H'?(e.t==='in'?'Sales':'Other'):(e.t==='in'?(e.p?'Project payment':'Other income'):(e.p?'Extra cost':'Miscellaneous'))}e.flag=false;render()};
        else el.onchange=()=>{let val=el.value;
          if(f==='p'&&val==='__new'){newProjectSheet(n=>{e.p=n;if(e.t==='in')e.c='Project payment';else if(!E_JOB.includes(e.c))e.c='Extra cost';e.flag=false;setView('add')});return}
          e[f]=f==='a'?(+val||0):f==='q'?(val===''?null:+val):val;
          if(f==='p'){if(val&&e.t==='in')e.c='Project payment';else if(val&&!E_JOB.includes(e.c))e.c='Extra cost';else if(!val&&E_JOB.includes(e.c)&&e.c!=='Team cost')e.c='Miscellaneous';e.flag=false;render()}
          if(f==='c'){e.flag=false;card.classList.remove('flag')}}});
    });
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{S.preview.splice(+b.dataset.del,1);render()});
    const sa=$('#saveAll');if(sa)sa.onclick=()=>{for(const e of S.preview){if(!e.a)continue;
      const n={i:rid(),d:e.d,t:e.t,c:e.c,n:e.n,a:Math.round(e.a*100)/100,w:e.w};if(e.w==='S'&&e.c==='Gold'&&e.q)n.q=e.q;if(e.w==='E'&&e.p){n.p=e.p;ensureProject(e.p,e.d,'E')}
      addEntry(n);learn(n,e.orig)}
      const c=S.preview.length;S.preview=[];render();toast(c+' saved')};
    const cp=$('#clearPv');if(cp)cp.onclick=()=>{S.preview=[];render()};
    const ac=$('#askClaude');if(ac)ac.onclick=askClaude;
  }
  if(v==='month'){
    $('#prevM').onclick=()=>{S.ym=shiftYm(S.ym,-1);render()};$('#nextM').onclick=()=>{S.ym=shiftYm(S.ym,1);render()};
    const ms=$('#mSearch');if(ms)ms.oninput=()=>{const q=lc(ms.value);const es=monthEntries(S.ym,S.wallet).filter(e=>!q||lc(e.n+' '+e.c+' '+(e.p||'')).includes(q)).reverse();$('#mList').innerHTML=groupedList(es);bindRows()};
  }
  if(v==='savings'){const gp=$('#goldPx2');if(gp)gp.onchange=e=>{S.settings.gold=+e.target.value||null;persist('meta/settings');render()}}
  if(v==='jobs'){const nj=$('#newJob');if(nj)nj.onclick=()=>newProjectSheet()}
  if(v==='year'){$('#prevY').onclick=()=>{S.ym=(+S.ym.slice(0,4)-1)+S.ym.slice(4);render()};$('#nextY').onclick=()=>{S.ym=(+S.ym.slice(0,4)+1)+S.ym.slice(4);render()};
    document.querySelectorAll('tr[data-ym]').forEach(r=>r.onclick=()=>{S.ym=r.dataset.ym;location.hash='month'})}
  if(v==='more'){
    const x=$('#xlsxBtn');if(x)x.onclick=exportXlsx;const j=$('#jsonBtn');if(j)j.onclick=exportJson;
    $('#restoreFile').onchange=restoreJson;
    $('#rateAed').onchange=e=>{S.settings.aed=+e.target.value||3.6725;persist('meta/settings')};
    $('#rateLbp').onchange=e=>{S.settings.lbp=+e.target.value||89500;persist('meta/settings')};
    $('#goldPx').onchange=e=>{S.settings.gold=+e.target.value||null;persist('meta/settings')};
    const so=$('#signOutBtn');if(so)so.onclick=signOut;
    document.querySelectorAll('[data-unrule]').forEach(b=>b.onclick=()=>{delete S.rules[b.dataset.unrule];persist('meta/rules');render()});
  }
  bindRows();
}
function bindRows(){
  document.querySelectorAll('[data-edit]').forEach(r=>r.onclick=()=>editEntry(r.dataset.edit));
  document.querySelectorAll('[data-proj]').forEach(r=>r.onclick=()=>editProject(r.dataset.proj));
}
function shiftYm(ym,d){let [y,m]=ym.split('-').map(Number);m+=d;if(m<1){m=12;y--}if(m>12){m=1;y++}return y+'-'+String(m).padStart(2,'0')}

/* ---------- Claude sorting ---------- */
async function askClaude(){
  const btn=$('#askClaude');btn.disabled=true;btn.textContent='Asking Claude…';
  const idx=S.preview.map((e,i)=>e.flag?i:-1).filter(i=>i>-1);
  const items=idx.map(i=>({line:S.preview[i].raw,direction:S.preview[i].t}));
  const projects=S.projects.filter(p=>(p.w||'E')==='E').slice(-60).map(p=>p.name);
  const prompt='You sort expense/income lines for Eddy, a Lebanon-based filmmaker. Three wallets: "E" = eddytings (his film work + personal life), "H" = Holdiit (his bag e-commerce brand), "S" = savings (gold, cash savings; categories: '+S_CATS.join(', ')+').\n'+
  'E money-in categories: '+E_IN.join(', ')+'. E job costs (only when a project applies): '+E_JOB.join(', ')+'. E monthly expenses: '+E_EXP.join(', ')+'.\n'+
  'H categories in: '+H_IN.join(', ')+'; out: '+H_OUT.join(', ')+'.\nKnown projects: '+projects.join(' | ')+'\n'+
  'Lines: '+JSON.stringify(items)+'\nReturn ONLY a JSON array, same order, each {"w":"E"|"H"|"S","c":"<exact category>","p":"<exact known project or empty>"}.';
  try{
    const res=await sample.json(prompt,{modelTier:'quick'});
    const arr=Array.isArray(res)?res:(res&&res.items)||[];
    idx.forEach((i,k)=>{const r=arr[k];if(!r)return;const e=S.preview[i];
      const cats=r.w==='S'?S_CATS:r.w==='H'?[...H_IN,...H_OUT]:[...E_IN,...E_JOB,...E_EXP];
      if(r.w==='E'||r.w==='H'||r.w==='S')e.w=r.w;if(cats.includes(r.c))e.c=r.c;if(r.p&&findProject(r.p))e.p=findProject(r.p).name;else if(e.w==='H')e.p='';e.flag=false});
    render();toast('Sorted – check and save');
  }catch(err){btn.disabled=false;btn.textContent='Ask Claude to sort the yellow ones';toast(err&&err.code==='rate_limited'?'Claude is busy – try in a minute':'Could not ask Claude right now')}
}

/* ---------- export / backup ---------- */
async function exportXlsx(){
  if(!window.XLSX){toast('Excel tool still loading – try again');return}
  const log=allEntries().sort((a,b)=>a.d<b.d?-1:1).map(e=>({Date:e.d,Wallet:e.w==='S'?'Savings':(e.w||'E')==='H'?'Holdiit':'eddytings','In/Out':e.t==='in'?'In':'Out',Category:e.c,Description:e.n,Project:e.p||'',Amount:e.a,'Gold oz':e.q||''}));
  const jobs=S.projects.map(p=>{const s=projStats(p);return {Job:p.name,'Shoot date':p.date,Budget:p.budget??'','Team cost':s.team,'Rental cost':s.rent,'Extra cost':s.extra,'Total cost':s.cost,Received:s.rec,'Still to receive':s.owed,'Rest due':p.due||'','Net profit':s.profit}});
  const months=[];const ys=new Set(Object.keys(S.months).map(k=>k.slice(0,4)));
  for(const y of [...ys].sort())for(let m=1;m<=12;m++){const ym=y+'-'+String(m).padStart(2,'0');const s=monthSummary(ym,'E');const h=monthSummary(ym,'H');
    if(!s.es.length&&!h.es.length&&!s.jobs.length)continue;
    months.push({Month:MONTHS[m-1]+' '+y,Jobs:s.jobs.length,Revenue:s.revenue,'Job costs':s.job,'Monthly expenses':s.exp,'Net profit':s.profit,'Money received':s.rec,'Money spent':s.spent,'Cash flow':s.cash,'Holdiit sales':h.rec,'Holdiit costs':h.spent})}
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(months),'Months');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(jobs),'Jobs');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(log),'All entries');
  const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  try{await downloads.save({filename:'Finance '+today()+'.xlsx',data:buf});toast('Downloaded')}catch(e){if(e&&e.code!=='declined')toast('Download failed')}
}
async function exportJson(){
  const data=JSON.stringify({version:1,exported:new Date().toISOString(),months:S.months,projects:S.projects,rules:S.rules,settings:S.settings});
  try{await downloads.save({filename:'Finance backup '+today()+'.json',data});toast('Backup saved')}catch(e){if(e&&e.code!=='declined')toast('Download failed')}
}
function restoreJson(ev){
  const f=ev.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.months||!d.projects)throw 0;
    const n=Object.values(d.months).reduce((t,a)=>t+a.length,0);
    openSheet('<h3>Add this backup?</h3><p class="hint">'+n+' entries and '+d.projects.length+' jobs from '+esc((d.exported||'').slice(0,10)||'the file')+'. They are added to what is already here; entries that already exist are updated, not doubled.</p><div class="row between"><button class="btn" id="sx">Cancel</button><button class="btn primary" id="doRestore">Add backup</button></div>');
    $('#doRestore').onclick=()=>{
      const isU=s=>/^[0-9a-f-]{36}$/.test(s);
      for(const k in d.months)for(const x of d.months[k]){const e={t:'out',w:'E',...x};e.i=isU(e.i)?e.i:uuid();e.deleted=false;e.ca=e.ca||new Date().toISOString();S.entries[e.i]=e;S.out.e[e.i]=1}
      for(const x of d.projects){if(findProject(x.name))continue;const p={budget:null,due:null,w:'E',...x};p.id=isU(p.id)?p.id:uuid();S.projMap[p.id]=p;S.out.p[p.id]=1}
      if(d.rules)S.rules=Object.assign({},d.rules,S.rules);S.out.s=true;rebuild();cacheSave();queueSync();closeSheet();render();toast('Backup added')};
  }catch(e){toast('That file is not a Finance backup')}};r.readAsText(f);
}

/* ---------- device features ---------- */
(function(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
  let rec=null,fin=null,st=null;dict={onFinal(f){fin=f},onState(f){st=f},
    start(){rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.continuous=true;
      rec.onresult=ev=>{for(let i=ev.resultIndex;i<ev.results.length;i++)if(ev.results[i].isFinal&&fin)fin({text:ev.results[i][0].transcript})};
      rec.onend=()=>st&&st({state:'idle'});rec.onerror=()=>st&&st({state:'idle'});rec.start();st&&st({state:'listening'});return Promise.resolve()},
    stop(){try{rec&&rec.stop()}catch(e){}return Promise.resolve()}};
  dict.onFinal(({text})=>{const q=$('#quick');if(!q)return;q.value=(q.value&&!q.value.endsWith('\n')?q.value+'\n':q.value)+text.trim();S.draft=q.value});
  dict.onState(({state})=>{const m=$('#micBtn');if(m)m.classList.toggle('on',state==='listening')});
})();
downloads={save({filename,data}){const blob=data instanceof Blob?data:new Blob([data]);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},2000);return Promise.resolve({status:'saved'})}};

/* ---------- sign in ---------- */
function loginView(msg){
  $('#app').innerHTML='<div class="card stack" style="max-width:420px;margin:40px auto"><h1 style="margin:0;font-size:24px">Finance</h1><p class="lead">Sign in to see your money on every device.</p>'+
  (msg?'<div class="banner">'+esc(msg)+'</div>':'')+
  '<div class="form"><label class="full">Email<input id="lgE" type="email" autocomplete="email" inputmode="email"></label><label class="full">Password<input id="lgP" type="password" autocomplete="current-password"></label></div>'+
  '<div class="row" style="flex-wrap:wrap"><button class="btn primary" id="lgIn">Sign in</button><button class="btn" id="lgUp">Create my account</button></div>'+
  '<div class="hint">Your data is private to this login. Use the same email and password on your phone and laptop.</div></div>';
  document.querySelector('nav.tabs').style.display='none';$('#walletSeg').style.visibility='hidden';
  const go=async up=>{const email=$('#lgE').value.trim(),password=$('#lgP').value;if(!email||password.length<8){toast('Email and a password of 8+ characters');return}
    const {data,error}=up?await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await sb.auth.signInWithPassword({email,password});
    if(error){loginView(error.message);return}
    if(up&&!data.session){loginView('Account created. Open the confirmation email, tap the link, then come back and sign in.');return}};
  $('#lgIn').onclick=()=>go(false);$('#lgUp').onclick=()=>go(true);
}
function startApp(){
  document.querySelector('nav.tabs').style.display='';$('#walletSeg').style.visibility='';
  cacheLoad();route();setSync();sync();
}
async function signOut(){if(pending()&&!confirmTwice())return;await sb.auth.signOut();session=null;S.entries={};S.projMap={};rebuild();loginView()}
function confirmTwice(){const b=$('#signOutBtn');if(b&&!b.dataset.sure){b.dataset.sure=1;b.textContent='Changes not synced yet – tap again to sign out anyway';return false}return true}

/* ---------- wiring ---------- */
$('#wE').onclick=()=>{S.wallet='E';render()};$('#wH').onclick=()=>{S.wallet='H';render()};
function route(){if(!session)return;const h=(location.hash||'#add').slice(1);setView(['add','month','jobs','savings','year','more'].includes(h)?h:'add')}
window.addEventListener('hashchange',route);
try{S.draft=localStorage.getItem('em-draft')||''}catch(e){}
window.addEventListener('online',()=>{setSync();sync()});window.addEventListener('offline',setSync);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
setInterval(()=>{if(!document.hidden)sync()},60000);
(async()=>{
  sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data}=await sb.auth.getSession();session=data.session;
  if(session)startApp();else loginView();
  sb.auth.onAuthStateChange((ev,s)=>{const had=!!session;session=s;if(s&&!had)startApp();if(!s&&had)loginView()});
})();
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then(reg=>{reg.update();setInterval(()=>reg.update(),30*60000)}).catch(()=>{});
  let reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloaded)return;reloaded=true;if(!S.preview.length)location.reload();else toast('New version ready – it loads next time you open the app')});
}
