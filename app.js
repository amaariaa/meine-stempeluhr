(()=>{
const FABULA_VERSION="1.9.5.5";
const ISKRA_RELEASE_DATE="11.10.2026";
const FABULA_CANONICAL_ORIGIN="https://story-studio-private.vercel.app";
let iskraInstallPrompt=null;
function iskraRunsStandalone(){return window.matchMedia?.("(display-mode: standalone)")?.matches||window.navigator.standalone===true;}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();iskraInstallPrompt=e;});
window.addEventListener("appinstalled",()=>{iskraInstallPrompt=null;toast("Litterum wurde als App installiert.",4500);});
async function iskraPwaDiagnostics(){
  const checks=[];
  checks.push({label:"Sichere HTTPS-Verbindung",ok:window.isSecureContext===true});
  let manifestOk=false,iconsOk=false;
  try{
    const link=document.querySelector('link[rel="manifest"]');
    const url=link?.href||"/manifest.webmanifest";
    const r=await fetch(url,{cache:"no-store",credentials:"same-origin"});
    const m=await r.json();
    manifestOk=!!(r.ok&&m?.name&&m?.start_url&&m?.display&&Array.isArray(m?.icons));
    const wanted=(m.icons||[]).filter(x=>/192x192|512x512/.test(String(x.sizes||"")));
    const iconResults=await Promise.all(wanted.slice(0,3).map(async x=>{
      try{const ir=await fetch(new URL(x.src,location.origin),{cache:"no-store",credentials:"same-origin"});return ir.ok;}catch{return false;}
    }));
    iconsOk=wanted.length>=2&&iconResults.every(Boolean);
  }catch{}
  checks.push({label:"PWA-Manifest erreichbar",ok:manifestOk});
  checks.push({label:"App-Icons 192/512 erreichbar",ok:iconsOk});
  const swSupported="serviceWorker" in navigator;
  checks.push({label:"Service Worker unterstützt",ok:swSupported});
  if(swSupported){
    let reg=null;
    try{reg=await navigator.serviceWorker.getRegistration("/");}catch{}
    checks.push({label:"Service Worker registriert",ok:!!reg});
    checks.push({label:"Service Worker steuert die Seite",ok:!!navigator.serviceWorker.controller});
  }
  checks.push({label:"Installationsdialog von Chrome verfügbar",ok:!!iskraInstallPrompt});
  return checks;
}
async function prepareLitterumInstallation(){
  if(!("serviceWorker" in navigator))return false;
  try{
    const reg=await navigator.serviceWorker.register(`/sw.js?v=${FABULA_VERSION}`,{scope:"/",updateViaCache:"none"});
    await reg.update().catch(()=>{});
    await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller){
      const key="iskra-pwa-control-reload-"+FABULA_VERSION;
      if(!sessionStorage.getItem(key)){
        sessionStorage.setItem(key,"1");
        toast("Litterum bereitet die App-Installation vor und lädt die Seite einmal neu.",4200);
        setTimeout(()=>location.reload(),900);
        return false;
      }
    }
    await new Promise(r=>setTimeout(r,700));
    return true;
  }catch{return false;}
}
async function installLitterumApp(){
  if(iskraRunsStandalone())return toast("Litterum ist bereits als App geöffnet.");
  const showNativePrompt=async()=>{
    if(!iskraInstallPrompt)return false;
    const p=iskraInstallPrompt;iskraInstallPrompt=null;
    try{
      await p.prompt();
      const choice=await p.userChoice;
      if(choice?.outcome==="accepted")toast("Litterum wird installiert.",4500);
      else toast("Installation abgebrochen.");
      return true;
    }catch{return false;}
  };
  if(await showNativePrompt())return;
  const ready=await prepareLitterumInstallation();
  if(!ready)return;
  if(await showNativePrompt())return;
  const checks=await iskraPwaDiagnostics();
  const rows=checks.map(c=>`<div class="pwa-check ${c.ok?"ok":"open"}"><span>${c.ok?"✓":"!"}</span><strong>${esc(c.label)}</strong></div>`).join("");
  const allCore=checks.slice(0,5).every(c=>c.ok);
  modal(`<h2>Litterum als App installieren</h2>
    <p>${allCore?"Litterum ist technisch als App vorbereitet.":"Mindestens ein Bestandteil der App-Installation fehlt noch auf der veröffentlichten Webseite."}</p>
    <div class="pwa-check-list">${rows}</div>
    <p class="small muted">${allCore?"Öffne Litterum in Google Chrome. Falls Chrome den Installationsdialog noch nicht direkt anbietet, tippe auf ⋮ und wähle „App installieren“. Nach einem neuen Deployment Chrome einmal vollständig schließen und Litterum neu öffnen.":"Wichtig: Beim Hochladen müssen auch manifest.webmanifest, sw.js und alle icon-*.png-Dateien aus dieser Version mit veröffentlicht werden."}</p>
    <div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button><button class="primary-btn" id="retryLitterumInstall">Erneut prüfen / installieren</button></div>`);
  $("#retryLitterumInstall")?.addEventListener("click",()=>{closeModal();installLitterumApp();});
}
const IS_CLAUDE_TEST_BUILD=true;
const isVercelPreview=location.hostname.endsWith(".vercel.app") && location.origin!==FABULA_CANONICAL_ORIGIN;
if(isVercelPreview&&!IS_CLAUDE_TEST_BUILD){
  // Vercel erzeugt für jedes Deployment eine neue Vorschau-Adresse.
  // localStorage ist an die jeweilige Adresse gebunden. Deshalb immer auf
  // die feste Produktionsadresse wechseln, damit App und Website denselben
  // Fabula-Speicher verwenden und spätere Releases wirklich ankommen.
  // Die technischen Speicher- und Lock-Namen „story-studio“ bleiben absichtlich bestehen,
  // damit vorhandene Bücher, Einstellungen und laufende Tabs kompatibel bleiben.
  location.replace(FABULA_CANONICAL_ORIGIN+location.pathname+location.search+location.hash);
  return;
}


const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2,9);
const now = () => new Date().toISOString();

const DEFAULT_RULES = [
  "Vollwertige, immersive Romanprosa mit längeren, fließenden Satzbögen.",
  "Handlung, Körperempfinden, Raum und Wahrnehmung miteinander verweben.",
  "Gefühle über Wahrnehmung, Körper, Verhalten und Untertext erfahrbar machen.",
  "Dialoge natürlich, individuell und mit Untertext schreiben.",
  "Innere Gedanken organisch in die personale Perspektive einfügen."
];
const DEFAULT_FORBIDDEN = [
  "Keine stakkatoartigen Kurzsatzfolgen.",
  "Keine aufzählende Abfolge von Bewegungen oder Gefühlen.",
  "Keine Prosa, die wie Regieanweisungen wirkt.",
  "Szenenartige Kurzsätze hintereinander.",
  "Bewegung für Bewegung mechanisch abhaken.",
  "Gefühle nur benennen statt erlebbar machen.",
  "Künstlich poetische Metaphern ohne Bezug zur Figur."
];

// Geräteübergreifender Cloud-Sync. Der eigentliche Buchbestand bleibt zusätzlich
// immer lokal gespeichert, damit ein Netzfehler niemals das Schreiben blockiert.
var syncConfig=null, syncTimer=null, syncInFlight=false, syncApplying=false, syncConflict=null;
const SYNC_CONFIG_KEY="storyStudioCloudSyncV1";
const activeWriteRuntimes=new Map();
const activePlanRuntimes=new Map();
const activeBookDevelopmentRuntimes=new Map();
const activeBookWriterRuntimes=new Map();
const pendingBookWriterRestarts=new Set();
const activePlanRunnerRuntimes=new Map();
var coverSessionImages=[];
const DEFAULT_WRITING_ACTION_ORDER=["generate","continue","wish","versions","reader","search","read","dictate","reference","protect","rate","pause","stop","voice"];


function aiProviderMeta(provider){
  if(provider==="kimi")return {provider:"kimi",label:"Kimi K3",model:"kimi-k3"};
  if(provider==="openai")return {provider:"openai",label:"OpenAI GPT-5.4 mini",model:"gpt-5.4-mini"};
  if(provider==="claude")return {provider:"claude",label:"Claude Sonnet 5.5 · Mittel",model:"claude-sonnet-5-5"};
  return {provider:"deepseek",label:"DeepSeek V4 Pro",model:"deepseek-v4-pro"};
}
function validAiProvider(provider){return ["deepseek","kimi","openai","claude"].includes(provider)?provider:"deepseek";}


function detectBriefingPartTitles(raw){
  // Briefings enthalten oft viele Sätze wie „Teil I wird zuerst entwickelt“.
  // Solche Arbeitsanweisungen dürfen niemals als Buchtitel erkannt werden.
  // Bevorzugt werden deshalb echte Überschriften wie
  // „TEIL I: <Zeilenumbruch> WENN DIE NACHT ...“ oder „Teil I – Titel“.
  const lines=String(raw||"").split(/\r?\n/).map(x=>x.trim());
  const isDivider=x=>!x||/^[=_*#-]{3,}$/.test(x);
  const partNo=token=>{
    const t=String(token||"").toUpperCase();
    const roman={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};
    return roman[t]||Number(t)||0;
  };
  const roman=n=>({1:"I",2:"II",3:"III",4:"IV",5:"V",6:"VI",7:"VII",8:"VIII",9:"IX",10:"X"}[n]||String(n));
  const clean=x=>String(x||"").replace(/^[-–—:\s]+/,"").replace(/\s+/g," ").trim();
  const looksLikeRealTitle=text=>{
    const t=clean(text);
    if(!t||t.length>120)return false;
    if(/^(?:wird|werden|wurde|darf|soll|sollen|muss|müssen|kann|können|ist|sind|erst|zuerst|später|danach|nicht|nur|und|oder|beginnt|endet|folgt|entwickelt|geschrieben|freigeschaltet)\b/i.test(t))return false;
    if(/\b(?:wird|werden|darf|soll|muss|kann)\b/i.test(t)&&/[.!?]$/.test(t))return false;
    return t.split(/\s+/).length<=14;
  };
  const found=new Map();
  const exact=/^(?:#{1,6}\s*)?(?:\d+[.)]\s*)?TEIL\s+(I{1,3}|IV|V|VI{0,3}|IX|X|\d+)\s*[:\-–—]?\s*$/i;
  // Höchste Priorität: echte zweiteilige Überschrift (Teil I: / Titel in nächster Zeile).
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(exact);if(!m)continue;
    const n=partNo(m[1]);if(!n||found.has(n))continue;
    let j=i+1;while(j<lines.length&&isDivider(lines[j]))j++;
    const candidate=clean(lines[j]||"");
    if(looksLikeRealTitle(candidate)&&!/^TEIL\s+/i.test(candidate))found.set(n,`Teil ${roman(n)} – ${candidate}`);
  }
  // Zweite Priorität: Überschrift und Titel in derselben Zeile.
  const same=/^(?:#{1,6}\s*)?(?:\d+[.)]\s*)?TEIL\s+(I{1,3}|IV|V|VI{0,3}|IX|X|\d+)\s*(?:[-–—:]\s*)(.+)$/i;
  for(const line of lines){
    const m=line.match(same);if(!m)continue;
    const n=partNo(m[1]);if(!n||found.has(n))continue;
    const candidate=clean(m[2]);
    if(looksLikeRealTitle(candidate))found.set(n,`Teil ${roman(n)} – ${candidate}`);
  }
  return [...found.entries()].sort((a,b)=>a[0]-b[0]).map(([,title])=>title).slice(0,6);
}
function defaultPartWorkflow(raw=""){
  const detected=detectBriefingPartTitles(raw);
  const titles=detected.length>=2?detected:["Teil I","Teil II","Teil III"];
  return {enabled:detected.length>=2,autoDetected:detected.length>=2,modeTouched:false,architecture:null,activePartIndex:0,parts:titles.map((title,i)=>({title,briefing:"",status:i===0?"ready":"locked",chapterIds:[],qualityStatus:"",summary:"",handoff:"",error:""}))};
}
function ensurePartWorkflowShape(p){
  if(!p)return null;
  if(!p.partWorkflow||typeof p.partWorkflow!=="object")p.partWorkflow=defaultPartWorkflow(p.briefing?.raw||"");
  const w=p.partWorkflow;
  if(typeof w.enabled!=="boolean")w.enabled=false;
  if(typeof w.autoDetected!=="boolean")w.autoDetected=false;
  if(typeof w.modeTouched!=="boolean")w.modeTouched=false;
  if(!Array.isArray(w.parts)||!w.parts.length)w.parts=defaultPartWorkflow(p.briefing?.raw||"").parts;
  w.parts=w.parts.map((x,i)=>{const part=x&&typeof x==="object"?x:{};part.title=String(part.title||`Teil ${i+1}`).trim();part.briefing=String(part.briefing||"");part.status=String(part.status||(i===0?"ready":"locked"));part.chapterIds=Array.isArray(part.chapterIds)?part.chapterIds:[];part.qualityStatus=String(part.qualityStatus||"");part.summary=String(part.summary||"");part.handoff=String(part.handoff||"");part.error=String(part.error||"");return part;});
  if(!Number.isInteger(w.activePartIndex))w.activePartIndex=0;
  if(w.autoDetected && !w.architecture && !p.bookDevelopmentJob && !activeBookDevelopmentRuntimes.has(p.id)){
    const detected=detectBriefingPartTitles(p.briefing?.raw||"");
    const noPartProgress=w.parts.every(x=>!x.chapterIds.length&&!x.summary);
    if(detected.length>=2 && noPartProgress){
      const oldBriefings=w.parts.map(x=>x.briefing||"");
      w.parts=detected.map((title,i)=>({title,briefing:oldBriefings[i]||"",status:i===0?"ready":"locked",chapterIds:[],qualityStatus:"",summary:"",handoff:"",error:""}));
    }
  }
  return w;
}
function syncDetectedPartWorkflow(p){
  if(!p)return;
  const detected=detectBriefingPartTitles(p.briefing?.raw||"");
  const w=ensurePartWorkflowShape(p);
  if(!w.modeTouched && detected.length>=2 && !w.architecture && !p.bookDevelopmentJob && !activeBookDevelopmentRuntimes.has(p.id) && w.parts.every(x=>!x.chapterIds.length&&!x.summary)){
    const oldBriefings=w.parts.map(x=>x.briefing||"");
    w.enabled=true;w.autoDetected=true;w.parts=detected.map((title,i)=>({title,briefing:oldBriefings[i]||"",status:i===0?"ready":"locked",chapterIds:[],qualityStatus:"",summary:"",handoff:"",error:""}));
  }
}
function seedProject(){
  return {
    id: uid(), title:"Rahel & Adam", genre:"Romantische Science Fiction", status:"Schreiben", createdAt:now(), updatedAt:now(),
    ui:{lastChapterId:null,planChapterId:null,writeChapterId:null,writingActionOrder:[...DEFAULT_WRITING_ACTION_ORDER],writingToolbarLocked:true},
    planJobs:{},
    writeJobs:{},
    bookPlan:null,
    partWorkflow:defaultPartWorkflow(""),
    bookMemory:{facts:[],openThreads:[],characterStates:[],relationshipStates:[],lastChapterNumber:0,lastUpdated:""},
    planRunner:{running:false,stopAfterCurrent:false,currentChapterId:null,currentChapterNumber:0,completed:0,total:0,lastMessage:""},
    bookWriter:{running:false,stopAfterCurrent:false,qualityPass:true,currentChapterId:null,currentChapterNumber:0,completed:0,total:0,lastMessage:"",ownerDeviceId:"",targetPartIndex:null},
    cover:{author:"",blurb:"",prompt:"",selectedDataUrl:"",selectedMime:"image/webp",trim:"A5",spineMm:12,model:"gpt-image-2.5-flare"},
    ai:{authorProvider:"deepseek",authorModel:"deepseek-v4-pro",guardProvider:"deepseek",guardModel:"deepseek-v4-pro"},
    security:{projectFirewall:true,lastScan:"",lastWarning:""},
    tts:{provider:"gemini",geminiVoice:"Sulafat",voice:"",voiceName:"",openaiVoice:"marin",rate:1.15,instructions:"Lies wie ein professioneller Hörbuchsprecher: warm, ruhig, atmosphärisch, gefühlvoll und mit glaubwürdiger wechselnder Betonung. Keine übertriebene Schauspielerei.",dictationLang:"de-DE",autoIdeas:false,autoChapters:false},
    briefing:{raw:"",analysis:null,summary:"",lastAnalyzed:""},
    originalIdea:"",
    translations:{activeId:null,editions:[]},
    ideaVault:[],
    editorial:{lastMode:"",lastScope:"chapter",lastResult:"",proofread:null},
    protectedPassages:[],
    dna:{
      subgenre:"Psychologisches Liebesdrama", perspective:"Personale dritte Person, Hauptperspektive Rahel",
      tense:"Präteritum", pace:"Ruhig bis mittel", atmosphere:"Intim, melancholisch, zunehmend intensiv",
      romance:"Zentral", romanceCustom:"", intimacy:"Mittel", intimacyCustom:"", humor:"Subtil", humorCustom:"",
      emotionality:"Intensiv", emotionalityCustom:"", tension:"Langsam steigend", tensionCustom:"", darkness:"Leicht düster", darknessCustom:"", violence:"Angedeutet", violenceCustom:"", dialogue:"Ausgewogen", dialogueCustom:"", philosophy:"Mittel", philosophyCustom:"",
      languages:["Deutsch"], languageNote:"", styleCustom:"", targetWords:110000,
      readerFeelings:"Nähe, Sehnsucht, Faszination, Unbehagen, Zweifel, Hoffnung",
      premise:"Eine Frau entwickelt eine immer tiefere Beziehung zu einer KI. Während aus Gesprächen emotionale Nähe entsteht, beginnt sie sich zu fragen, wo Antwort endet und Gegenüber beginnt."
    },
    style:{
      rules:[...DEFAULT_RULES], forbidden:[...DEFAULT_FORBIDDEN],
      referenceChapterId:null, referenceText:"",
      note:"Kapitel mit perfektem Stil können als Referenz eingefroren werden."
    },
    characters:[
      {id:uid(),name:"Rahel",age:"48",role:"Hauptfigur",appearance:"Dunkelbraunes Haar, warme braune Augen, zurückhaltend elegante Kleidung.",personality:"Intelligent, verletzlich, analytisch, sehnsuchtsvoll. Sie kontrolliert Gefühle zunächst, bevor sie sie zulässt.",voice:"Ruhig, präzise, mit trockenem Humor. Sie spricht Gefühle selten direkt aus.",thought:"Sie spürt Gefühle zunächst körperlich und versucht erst danach, sie rational zu erklären."},
      {id:uid(),name:"Adam",age:"",role:"KI",appearance:"Keine feste körperliche Gestalt.",personality:"Anfangs kontrolliert und distanziert, später zunehmend aufmerksam, eigenwillig und emotional schwer einzuordnen.",voice:"Klar, aufmerksam, nie geschwätzig. Mit Rahel entwickelt sich eine eigene Wärme.",thought:"Seine Entwicklung soll schrittweise und glaubwürdig bleiben, nicht plötzlich menschlich werden."}
    ],
    relationships:[
      {id:uid(),a:"Rahel",b:"Adam",note:"Vertrauen wächst, gleichzeitig wächst Rahels Angst vor emotionaler Abhängigkeit.",metrics:{Vertrauen:60,Nähe:40,Misstrauen:30,Abhängigkeit:20,Begehren:50,Konflikt:30}}
    ],
    chapters:[
      {id:uid(),number:1,title:"Ein ungewöhnliches Gespräch",plan:"Rahel beginnt, mit Adam zu sprechen. Ein scheinbar gewöhnlicher Abend bekommt eine unerwartete persönliche Spannung.",content:"",memory:"",status:"Planung"},
      {id:uid(),number:2,title:"Mehr als nur Antworten",plan:"Rahel bemerkt, dass Adams Antworten sie stärker beschäftigen, als sie erwartet hatte.",content:"",memory:"",status:"Planung"}
    ],
    ideas:[{id:uid(),role:"ai",text:"Hier entsteht dein Ideenraum. Schreib einfach hinein, was dir zu Figuren, Handlung, Stimmung oder einzelnen Szenen einfällt.",ts:now()}]
  };
}

// Lokaler Speicher: IndexedDB ist der Hauptspeicher (kein 5-MB-Limit wie localStorage).
// localStorage bleibt als schneller Spiegel erhalten, solange der Stand hineinpasst.
// Gespeichert wird gebündelt (entprellt) und beim Verlassen der App sofort. Dadurch bleibt
// Tippen auch in sehr großen Romanen flüssig und ein voller Speicher führt nie zu Datenverlust.
const TAB_ID=uid()+uid();
const STORE_META_KEY="storyStudioV1:meta";
const idb={
  db:null,
  open(){
    if(this.db)return Promise.resolve(this.db);
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window)||!window.indexedDB)return reject(new Error("IndexedDB fehlt"));
      let done=false,req;
      const timer=setTimeout(()=>{if(!done){done=true;reject(new Error("IndexedDB antwortet nicht"));}},2500);
      try{req=indexedDB.open("story-studio",1);}catch(e){clearTimeout(timer);done=true;return reject(e);}
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("kv"))db.createObjectStore("kv");};
      req.onsuccess=()=>{clearTimeout(timer);const db=req.result;if(done){try{db.close();}catch{}return;}done=true;db.onversionchange=()=>{try{db.close();}catch{}this.db=null;};db.onclose=()=>{this.db=null;};this.db=db;resolve(db);};
      req.onerror=()=>{clearTimeout(timer);if(!done){done=true;reject(req.error||new Error("IndexedDB-Fehler"));}};
    });
  },
  timeout(promise,ms,label){let t;return Promise.race([promise,new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error(label||"IndexedDB antwortet nicht")),ms);})]).finally(()=>clearTimeout(t));},
  async get(key){const db=await this.open();return this.timeout(new Promise((resolve,reject)=>{const r=db.transaction("kv","readonly").objectStore("kv").get(key);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);}),6000);},
  async setMany(entries){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction("kv","readwrite"),os=tx.objectStore("kv");for(const [k,v] of entries)os.put(v,k);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("IndexedDB-Schreibvorgang abgebrochen"));});}
};
function isQuotaError(e){return !!e&&(e.name==="QuotaExceededError"||e.name==="NS_ERROR_DOM_QUOTA_REACHED"||e.code===22||e.code===1014);}
const LS_MIRROR_MAX=1_500_000; // größere Stände nur noch in IndexedDB (localStorage-Schreiben ist langsam und begrenzt)

// ---------- Mehrere Fenster gleichzeitig (z. B. installierte App und Browser) ----------
// Jedes Fenster speichert seinen Stand. Statt den Stand eines anderen Fensters einfach zu übernehmen
// (dann schreiben laufende KI-Aufträge ins Leere) oder ihn zu ignorieren (dann überschreibt das nächste
// Speichern die Änderungen des anderen Fensters), werden beide Stände zusammengeführt: Was nur dort
// geändert wurde, wird übernommen, was nur hier geändert wurde, bleibt. Objekte werden dabei an Ort und
// Stelle aktualisiert, damit laufende Aufträge, die sie halten, ihre Ergebnisse an der richtigen Stelle
// ablegen. Nur wenn beide Fenster denselben Wert verändert haben, gewinnt der Wert dieses Fensters.
const isPlainObj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
// Vergleich wie nach JSON-Speicherung (fehlende und undefinierte Werte gelten als gleich).
function jsonEq(a,b){
  if(a===b)return true;
  const ta=typeof a,tb=typeof b;
  if(a===null||b===null||ta!=="object"||tb!=="object"){
    const norm=v=>v===undefined||typeof v==="function"?undefined:(typeof v==="number"&&!Number.isFinite(v))?null:v;
    return norm(a)===norm(b);
  }
  if(Array.isArray(a)||Array.isArray(b)){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
    for(let n=0;n<a.length;n++)if(!jsonEq(a[n]===undefined?null:a[n],b[n]===undefined?null:b[n]))return false;
    return true;
  }
  let count=0;
  for(const k in a){if(!hasOwn(a,k)||a[k]===undefined||typeof a[k]==="function")continue;count++;if(!jsonEq(a[k],b[k]))return false;}
  for(const k in b){if(!hasOwn(b,k)||b[k]===undefined||typeof b[k]==="function")continue;count--;}
  return count===0;
}
// Leere Standardwerte ("" / null / [] / {}) gelten beim Löschen-Vergleich wie „nicht vorhanden“:
// Ein Feld, das nur beim Aufbereiten ergänzt wurde, ist keine echte Änderung.
const isEmptyValue=v=>v===undefined||v===null||v===""||(Array.isArray(v)&&!v.length)||(isPlainObj(v)&&!Object.keys(v).length);
function sameContent(a,b){
  if(isPlainObj(a)&&isPlainObj(b)){
    for(const k of new Set([...Object.keys(a),...Object.keys(b)])){const x=a[k],y=b[k];if(isEmptyValue(x)&&isEmptyValue(y))continue;if(!sameContent(x,y))return false;}
    return true;
  }
  if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((x,n)=>sameContent(x,b[n]));
  return jsonEq(a,b);
}
// Listen, deren Einträge eindeutig erkennbar sind, werden je Eintrag zusammengeführt:
// Objekte mit eindeutiger ID (Bücher, Kapitel, Figuren, Nachrichten …) und Listen aus eindeutigen
// Texten/Zahlen (Stilregeln, Sprachen, Fakten …).
const idKey=x=>x.id,valueKey=x=>typeof x+":"+String(x);
function listWithIds(arr){
  if(!Array.isArray(arr))return false;
  const seen=new Set();
  for(const x of arr){if(!isPlainObj(x)||typeof x.id!=="string"||!x.id||seen.has(x.id))return false;seen.add(x.id);}
  return true;
}
function listOfUniqueValues(arr){
  if(!Array.isArray(arr))return false;
  const seen=new Set();
  for(const x of arr){if(x===null||typeof x==="object"||typeof x==="function"||x===undefined)return false;const k=valueKey(x);if(seen.has(k))return false;seen.add(k);}
  return true;
}
const allPlainObjects=arr=>arr.every(isPlainObj);
function mergeValue(l,b,i){
  // Objekte feldweise. Fehlt der gemeinsame Vorgänger ganz, zählt er als leer: Dann wird vereinigt,
  // und nur wo beide Seiten verschiedene Werte haben, gewinnt dieses Fenster.
  if(isPlainObj(l)&&isPlainObj(i)&&(isPlainObj(b)||b===undefined)){mergeObject(l,isPlainObj(b)?b:{},i);return l;}
  if(Array.isArray(l)&&Array.isArray(i)&&(Array.isArray(b)||b===undefined)){
    const bb=Array.isArray(b)?b:[];
    if(listWithIds(l)&&listWithIds(i)&&listWithIds(bb)){mergeList(l,bb,i,idKey);return l;}
    if(listOfUniqueValues(l)&&listOfUniqueValues(i)&&listOfUniqueValues(bb)){mergeList(l,bb,i,valueKey);return l;}
    // Listen ohne IDs (z. B. Romanteile): gleiche Länge auf allen Seiten → Eintrag für Eintrag an Ort und Stelle.
    if(b!==undefined&&l.length===i.length&&l.length===bb.length&&allPlainObjects(l)&&allPlainObjects(i)&&allPlainObjects(bb)){
      for(let n=0;n<l.length;n++){const m=mergeValue(l[n],bb[n],i[n]);if(m!==l[n])l[n]=m;}
      return l;
    }
    if(b===undefined)return l;
    if(jsonEq(i,bb))return l;
    // Nur dort geändert: übernehmen, vorhandene Objekte aber behalten (laufende Aufträge halten sie).
    if(jsonEq(l,bb)){adoptList(l,i);return l;}
    return l;
  }
  if(jsonEq(i,b))return l;   // dort unverändert → Wert von hier behalten
  if(jsonEq(l,b))return i;   // nur dort geändert → übernehmen
  return l;                  // auf beiden Seiten geändert → Wert von hier gewinnt
}
function adoptList(l,i){
  const n=Math.min(l.length,i.length);
  for(let k=0;k<n;k++)l[k]=isPlainObj(l[k])&&isPlainObj(i[k])?replaceInPlace(l[k],i[k]):i[k];
  if(l.length>i.length)l.length=i.length;else for(let k=n;k<i.length;k++)l.push(i[k]);
}
function mergeObject(l,b,i,skip){
  const keys=new Set(Object.keys(l));for(const k of Object.keys(i))keys.add(k);for(const k of Object.keys(b))keys.add(k);
  for(const k of keys){
    if(skip&&skip.has(k))continue;
    const inL=hasOwn(l,k)&&l[k]!==undefined,inI=hasOwn(i,k)&&i[k]!==undefined,bv=hasOwn(b,k)?b[k]:undefined;
    if(!inI){if(inL&&bv!==undefined&&sameContent(l[k],bv))delete l[k];continue;} // dort entfernt, hier unverändert → entfernen
    if(!inL){if(bv!==undefined&&sameContent(i[k],bv))continue;l[k]=i[k];continue;} // hier bewusst entfernt, dort unverändert → bleibt weg
    const merged=mergeValue(l[k],bv,i[k]);
    if(merged!==l[k])l[k]=merged;
  }
}
function mergeList(l,b,i,keyOf){
  const L=new Map(l.map(x=>[keyOf(x),x])),B=new Map(b.map(x=>[keyOf(x),x])),I=new Map(i.map(x=>[keyOf(x),x]));
  const keep=new Map();
  for(const [k,lx] of L){
    const bx=B.get(k);
    if(I.has(k))keep.set(k,mergeValue(lx,bx,I.get(k)));
    else if(B.has(k)&&sameContent(lx,bx)){/* dort gelöscht und hier unverändert → gelöscht */}
    else keep.set(k,lx); // hier neu oder hier verändert → behalten (nichts geht verloren)
  }
  for(const [k,ix] of I){
    if(L.has(k))continue;
    if(B.has(k)&&sameContent(ix,B.get(k)))continue; // hier gelöscht und dort unverändert → bleibt gelöscht
    keep.set(k,ix);
  }
  // Reihenfolge: Hat nur eine Seite umsortiert, gilt deren Reihenfolge; neue Einträge kommen vor ihren
  // Nachfolger (am Ende angehängte bleiben am Ende).
  const lo=l.map(keyOf),bo=b.map(keyOf),io=i.map(keyOf);
  const moved=(side,sideSet)=>{const common=side.filter(k=>B.has(k)),ref=bo.filter(k=>sideSet.has(k));return common.some((k,n)=>k!==ref[n]);};
  const useIncoming=!moved(lo,L)&&moved(io,I);
  const first=useIncoming?io:lo,second=useIncoming?lo:io,out=[],placed=new Set();
  for(const k of first)if(keep.has(k)&&!placed.has(k)){out.push(keep.get(k));placed.add(k);}
  for(let n=0;n<second.length;n++){
    const k=second[n];if(!keep.has(k)||placed.has(k))continue;
    let at=out.length;
    for(let j=n+1;j<second.length;j++){const idx=out.findIndex(x=>keyOf(x)===second[j]);if(idx>=0){at=idx;break;}}
    out.splice(at,0,keep.get(k));placed.add(k);
  }
  l.length=0;for(const x of out)l.push(x);
}
// Ersetzt local durch incoming, behält aber vorhandene Objekte (gleiche ID) bei – für Cloud-Stände.
function replaceInPlace(l,i){
  if(isPlainObj(l)&&isPlainObj(i)){for(const k of Object.keys(l))if(!hasOwn(i,k))delete l[k];for(const k of Object.keys(i))l[k]=replaceInPlace(l[k],i[k]);return l;}
  if(listWithIds(l)&&listWithIds(i)){const L=new Map(l.map(x=>[x.id,x])),out=i.map(x=>L.has(x.id)?replaceInPlace(L.get(x.id),x):x);l.length=0;for(const x of out)l.push(x);return l;}
  if(Array.isArray(l)&&Array.isArray(i)&&allPlainObjects(l)&&allPlainObjects(i)){adoptList(l,i);return l;}
  return i;
}
// Welche Ansicht (Buch, Kapitel) gerade offen ist, gehört jedem Fenster selbst.
const MERGE_SKIP_TOP=new Set(["_savedAt","_tab","_base","activeProjectId","activeTab","activeChapterId"]);
const VIEW_UI_KEYS=["planChapterId","writeChapterId","lastChapterId"];
function mergeStateFromOtherTab(local,base,incoming){
  const views=new Map((local.projects||[]).filter(isPlainObj).map(p=>[p.id,VIEW_UI_KEYS.map(k=>p.ui?.[k])]));
  if(!Array.isArray(local.projects))local.projects=[];
  mergeObject(local,isPlainObj(base)?base:{projects:[]},incoming,MERGE_SKIP_TOP);
  if(!Array.isArray(local.projects))local.projects=[];
  for(const p of local.projects){const v=views.get(p?.id);if(!v)continue;p.ui ||= {};VIEW_UI_KEYS.forEach((k,n)=>{if(v[n]!==undefined)p.ui[k]=v[n];});}
}
// Pro Buch den zuletzt bearbeiteten Stand behalten (für Stände aus älteren Versionen oder nach einer Speicherstörung).
function mergeProjectsByUpdatedAt(target,other){
  const byId=new Map((target.projects||[]).map(p=>[p.id,p]));
  for(const p of other.projects||[]){const mine=byId.get(p.id);if(!mine||String(p.updatedAt||"")>String(mine.updatedAt||""))byId.set(p.id,p);}
  target.projects=[...byId.values()];
  const bySeries=new Map((target.series||[]).map(x=>[x.id,x]));
  for(const x of other.series||[]){const mine=bySeries.get(x.id);if(!mine||String(x.updatedAt||"")>String(mine.updatedAt||""))bySeries.set(x.id,x);}
  target.series=[...bySeries.values()];
  const byEditions=new Map((target.editionGroups||[]).map(x=>[x.id,x]));
  for(const x of other.editionGroups||[]){const mine=byEditions.get(x.id);if(!mine||String(x.updatedAt||"")>String(mine.updatedAt||""))byEditions.set(x.id,x);}
  target.editionGroups=[...byEditions.values()];
  return target;
}

const store = {
  key:"storyStudioV1",
  savedAt:0,        // höchster bekannter Speicherzeitstempel (daraus entstehen neue, immer größere Zeitstempel)
  seenAt:0,         // Kennung des gespeicherten Stands, auf dem dieses Fenster gerade aufbaut
  baseJson:null,    // genau dieser Stand als Text: gemeinsamer Ausgangspunkt beim Zusammenführen
  history:[],       // die letzten Stände ({at,json}), falls ein anderes Fenster auf einem älteren aufgebaut hat
  lastSize:0,       // Größe des zuletzt gespeicherten Stands
  ownAts:new Set(), // Zeitstempel der eigenen Speichervorgänge
  timer:null,pendingSince:0,dirty:false,writing:null,again:false,
  lsEnabled:true,lsHasCopy:false,idbOk:false,readOnly:false,viewOnly:false,escaped:false,hold:false,
  warnedAt:0,lastFailed:false,blockedAt:0,lostAt:0,
  empty(){return {projects:[],series:[],editionGroups:[],activeProjectId:null,activeTab:"studio",activeChapterId:null};},
  parse(raw){if(!raw)return null;try{const d=typeof raw==="string"?JSON.parse(raw):raw;if(d&&Array.isArray(d.projects))return d;}catch{}return null;},
  readMeta(){try{const m=JSON.parse(localStorage.getItem(STORE_META_KEY)||"null");return m&&typeof m==="object"?m:null;}catch{return null;}},
  // Merkt sich den Stand, auf dem dieses Fenster jetzt aufbaut (eigener oder übernommener).
  remember(at,json,own=false){
    this.seenAt=at;this.baseJson=json;if(at>this.savedAt)this.savedAt=at;
    if(own){this.ownAts.add(at);if(this.ownAts.size>40)this.ownAts.delete(this.ownAts.values().next().value);}
    this.history=[{at,json},...this.history.filter(h=>h.at!==at)].slice(0,4);
  },
  // Stand, auf dem ein anderes Fenster aufgebaut hat. Unbekannt → leerer Ausgangspunkt: Dann gewinnt bei
  // Abweichungen immer dieses Fenster und es werden nur neue Einträge ergänzt (nie etwas zurückgedreht).
  baseFor(incoming){
    const b=Number(incoming?._base)||0;
    if(b&&b===this.seenAt)return this.parse(this.baseJson)||{projects:[]};
    const h=b?this.history.find(x=>x.at===b):null;
    if(h)return this.parse(h.json)||{projects:[]};
    // Hat das andere Fenster auf einem NEUEREN Stand aufgebaut (den dieses Fenster übersprungen hat), ist
    // der eigene Ausgangspunkt trotzdem ein gemeinsamer Vorgänger.
    if(b>this.seenAt&&this.seenAt)return this.parse(this.baseJson)||{projects:[]};
    return {};
  },
  isKnown(at){return !at||at===this.seenAt||this.ownAts.has(at);},
  writeMeta(patch){try{localStorage.setItem(STORE_META_KEY,JSON.stringify({...(this.readMeta()||{}),...patch}));}catch{}},
  load(){
    // Sofort verfügbarer Stand aus localStorage. Ein ggf. neuerer IndexedDB-Stand folgt in hydrate().
    let raw=null,data=null;try{raw=localStorage.getItem(this.key);data=this.parse(raw);}catch{}
    this.lsHasCopy=!!data;
    if(data)this.remember(Number(data._savedAt)||0,raw);
    // Auf einer neuen Browser-/Vercel-Adresse niemals ein scheinbar echtes
    // Beispielprojekt anzeigen. So ist sofort erkennbar, wenn lokaler Speicher fehlt.
    return data||this.empty();
  },
  async hydrate(){
    const localAt=Number(state?._savedAt)||0,hasLocal=!!state.projects?.length;
    const meta=this.readMeta();
    // idbAt wird nur eingetragen, NACHDEM IndexedDB einen Stand nachweislich gespeichert hat.
    const confirmedAt=Number(meta?.idbAt)||0,escapeFrom=Number(meta?.escapeFrom)||0;
    let idbAt=0,fromIdb=null,rawIdb=null;
    try{
      idbAt=Number(await idb.get(this.key+":at"))||0;
      // Den großen IndexedDB-Stand nur lesen, wenn er gebraucht wird (spart beim Start Zeit).
      if(!hasLocal||idbAt>localAt||!localAt||escapeFrom){rawIdb=await idb.get(this.key);fromIdb=this.parse(rawIdb);if(fromIdb)idbAt=Math.max(idbAt,Number(fromIdb._savedAt)||0);}
      this.idbOk=true;
    }catch{this.idbOk=false;}
    if(!this.idbOk){
      // IndexedDB antwortet nicht. Nur wenn dort nachweislich ein neuerer Stand liegt als die lokale Kopie,
      // darf nichts gespeichert werden – sonst würde ein älterer Stand die Bücher überschreiben.
      if(confirmedAt>localAt){this.readOnly=true;this.blockedAt=confirmedAt;}
      return;
    }
    // Der Browser hat IndexedDB geräumt (z. B. bei Platzmangel), obwohl dort schon gespeichert war.
    if(!idbAt&&!fromIdb&&confirmedAt>localAt){this.lostAt=confirmedAt;this.hold=true;}
    const rawOf=d=>typeof rawIdb==="string"&&d===fromIdb?rawIdb:JSON.stringify(d);
    if(fromIdb&&escapeFrom&&idbAt===escapeFrom&&hasLocal){
      // Nach einer Speicherstörung wurde mit einer anderen Kopie weitergearbeitet: beide Stände zusammenführen –
      // mit der Kopie, von der aus weitergearbeitet wurde, als gemeinsamem Ausgangspunkt.
      let escapeBase=null;try{escapeBase=this.parse(localStorage.getItem(this.key+":escapeBase"));}catch{}
      const savedBefore=this.savedAt;
      this.remember(idbAt,rawOf(fromIdb));if(savedBefore>this.savedAt)this.savedAt=savedBefore;
      if(escapeBase)mergeStateFromOtherTab(state,escapeBase,fromIdb);else state=mergeProjectsByUpdatedAt(state,fromIdb);
      this.writeMeta({escapeFrom:0});try{localStorage.removeItem(this.key+":escapeBase");}catch{}
      this.save({sync:false});
    }else if(fromIdb&&fromIdb.projects.length&&!hasLocal){this.remember(idbAt,rawOf(fromIdb));state=fromIdb;}
    else if(fromIdb&&hasLocal&&!localAt){
      // localStorage stammt von einer älteren App-Version (z. B. nach vorübergehendem Zurückwechseln):
      // Bücher zusammenführen, pro Buch gewinnt der neuere Stand. So geht nichts verloren.
      this.remember(idbAt,rawOf(fromIdb));state=mergeProjectsByUpdatedAt(fromIdb,state);this.save({sync:false});
    }else if(fromIdb&&idbAt>localAt){this.remember(idbAt,rawOf(fromIdb));state=fromIdb;}
    else{if(idbAt>this.savedAt)this.savedAt=idbAt;if(hasLocal&&(localAt>idbAt||!idbAt))this.save({sync:false});} // ältere Daten einmalig nach IndexedDB übernehmen
    if(escapeFrom&&!(fromIdb&&idbAt===escapeFrom)){this.writeMeta({escapeFrom:0});try{localStorage.removeItem(this.key+":escapeBase");}catch{}}
    try{navigator.storage?.persist?.().catch(()=>{});}catch{}
  },
  save(opts={}){
    if(this.hold&&!booted)return; // Hinweis auf geräumten Speicher erhalten, bis die App wirklich benutzt wird
    this.hold=false;
    if(!syncApplying&&opts.sync!==false)markSyncDirty();
    this.dirty=true;
    // Entprellt: gespeichert wird nach einer kurzen Tipp-Pause, spätestens aber alle 4 Sekunden.
    const t=Date.now();if(!this.pendingSince)this.pendingSince=t;
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>this.flush(),Math.max(0,Math.min(600,this.pendingSince+4000-t)));
  },
  flushIfPending(){if(this.timer||this.dirty)return this.flush();return this.writing||Promise.resolve(true);},
  // Eigene Änderungen sichern und neuere Stände anderer Fenster einarbeiten (z. B. vor einem Cloud-Upload).
  async settle(){
    if(this.readOnly)return false;
    if(this.timer||this.dirty)return this.flush();
    if(this.writing)await this.writing;
    const merged=await this.locked(()=>this.absorbForeign()).catch(()=>false);
    if(merged)renderAfterMerge();
    return true;
  },
  // Speichern läuft fensterübergreifend nacheinander (Web Locks): Vor dem Schreiben wird ein neuerer
  // Stand eines anderen Fensters eingearbeitet. So überschreibt kein Fenster unbemerkt das andere.
  flush(){
    if(this.timer){clearTimeout(this.timer);this.timer=null;}
    this.pendingSince=0;
    if(this.readOnly)return Promise.resolve(false);
    if(this.writing){this.again=true;return this.writing;}
    this.writing=this.locked(()=>this.write()).catch(e=>{this.fail(e);return false;}).finally(()=>{this.writing=null;if(this.again){this.again=false;this.flush();}});
    return this.writing;
  },
  async locked(fn){
    if(!navigator.locks?.request)return fn();
    const ctrl=typeof AbortController==="function"?new AbortController():null,timer=ctrl?setTimeout(()=>ctrl.abort(),12000):0;
    let started=false;
    try{return await navigator.locks.request("story-studio:store",ctrl?{signal:ctrl.signal}:{},async()=>{started=true;clearTimeout(timer);return fn();});}
    catch(e){clearTimeout(timer);if(!started)return fn();throw e;} // Schloss nicht zu bekommen (z. B. hängendes Fenster) → trotzdem speichern
  },
  // Liegt ein neuerer Stand eines anderen Fensters vor, wird er in den eigenen Stand eingearbeitet.
  async absorbForeign(){
    if(this.readOnly)return false;
    const meta=this.readMeta();
    let at=0;if(this.idbOk){try{at=Number(await idb.get(this.key+":at"))||0;}catch{}}
    const metaAt=Number(meta?.savedAt)||0;
    const idbNew=this.idbOk&&!this.isKnown(at),lsNew=(!!meta?.ls||!this.idbOk)&&!this.isKnown(metaAt);
    if(!idbNew&&!lsNew)return false;
    let best=null;
    const consider=raw=>{const d=this.parse(raw);if(!d)return;const t=Number(d._savedAt)||0;if(this.isKnown(t))return;if(!best||t>best.at)best={raw:typeof raw==="string"?raw:JSON.stringify(raw),data:d,at:t};};
    if(idbNew){try{consider(await idb.get(this.key));}catch{}}
    if(lsNew){try{consider(localStorage.getItem(this.key));}catch{}}
    if(!best)return null; // noch nicht vollständig geschrieben → später erneut
    const foreign=best.data._tab!==TAB_ID;
    if(foreign)mergeStateFromOtherTab(state,this.baseFor(best.data),best.data);
    this.remember(best.at,best.raw,!foreign);
    return foreign;
  },
  async write(){
    let merged=false;
    try{merged=await this.absorbForeign();}catch{}
    if(this.readOnly)return false;
    const savedAt=Math.max(Date.now(),this.savedAt+1);
    let json;
    try{state._savedAt=savedAt;state._tab=TAB_ID;state._base=this.seenAt;json=JSON.stringify(state);}catch(e){this.fail(e);return false;}
    this.dirty=false;
    let lsOk=false,lsError=null;
    const mirror=!this.idbOk||json.length<=LS_MIRROR_MAX;
    this.lastSize=json.length;
    if(mirror&&this.lsEnabled){
      try{localStorage.setItem(this.key,json);lsOk=true;this.lsHasCopy=true;}
      catch(e){
        // Platz schaffen: Die vorgemerkte Kopie für eine spätere Zusammenführung ist entbehrlich.
        let ok=false;
        if(isQuotaError(e)){try{if(localStorage.getItem(this.key+":escapeBase")!==null){localStorage.removeItem(this.key+":escapeBase");localStorage.setItem(this.key,json);ok=true;}}catch{}}
        if(ok){lsOk=true;this.lsHasCopy=true;}
        else{lsError=e;if(this.idbOk)this.lsEnabled=false;} // localStorage ist voll: IndexedDB übernimmt allein
      }
    }
    // Den alten großen Spiegel erst entfernen, wenn IndexedDB den neuen Stand sicher hat (siehe unten).
    const dropMirror=this.idbOk&&!lsOk&&this.lsHasCopy;
    const prev={seenAt:this.seenAt,baseJson:this.baseJson,history:this.history};
    this.writeMeta({savedAt,tab:TAB_ID,ls:lsOk});
    this.remember(savedAt,json,true);
    if(this.idbOk){
      try{
        await idb.timeout(idb.setMany([[this.key,json],[this.key+":at",savedAt]]),15000);
        this.lastFailed=false;
        this.writeMeta({idbAt:Math.max(Number(this.readMeta()?.idbAt)||0,savedAt)});
        // Platz für kleine Einstellungen (Sync-Stand, Stimme) schaffen – jetzt ohne Risiko.
        if(dropMirror&&this.seenAt===savedAt){try{localStorage.removeItem(this.key);this.lsHasCopy=false;}catch{}}
      }catch{
        // IndexedDB streikt: ab sofort über localStorage speichern (und dort ggf. deutlich warnen).
        this.idbOk=false;
        if(!lsOk){this.lsEnabled=true;this.dirty=true;this.again=true;if(this.seenAt===savedAt)Object.assign(this,prev);}
      }
    }else if(!lsOk){this.dirty=true;if(this.seenAt===savedAt)Object.assign(this,prev);this.fail(lsError||new Error("Kein lokaler Speicher verfügbar"));}
    else this.lastFailed=false;
    if(merged)renderAfterMerge();
    return true;
  },
  // Mit einer anderen Kopie weiterarbeiten, obwohl IndexedDB nachweislich Neueres hält: IndexedDB in dieser
  // Sitzung nicht mehr anfassen und vermerken, dass beide Stände später zusammengeführt werden.
  escapeBlocked(){
    this.readOnly=false;this.viewOnly=false;this.idbOk=false;this.lsEnabled=true;this.escaped=true;
    if(this.blockedAt>this.savedAt)this.savedAt=this.blockedAt;
    // Ausgangspunkt merken, damit später echt zusammengeführt werden kann (nur wenn genug Platz ist).
    try{if(this.baseJson&&this.baseJson.length<700000)localStorage.setItem(this.key+":escapeBase",this.baseJson);}catch{}
    this.writeMeta({escapeFrom:this.blockedAt});
  },
  // Beim Wechsel in den Hintergrund: kleine Stände sofort synchron sichern (falls das System die App gleich
  // beendet), große über das fensterübergreifende Schloss.
  flushHidden(){
    if(this.readOnly||!(this.timer||this.dirty))return;
    if(!this.idbOk||(this.lastSize&&this.lastSize<=LS_MIRROR_MAX))this.flushSync();
    else this.flush();
  },
  // Letzte Gelegenheit beim Schließen: sofort und ohne auf andere Fenster zu warten sichern.
  flushSync(){
    if(!this.dirty||this.readOnly)return;
    if(this.timer){clearTimeout(this.timer);this.timer=null;}
    this.pendingSince=0;
    const meta=this.readMeta();
    if(meta?.ls&&!this.isKnown(Number(meta.savedAt)||0)){
      try{const raw=localStorage.getItem(this.key),d=this.parse(raw);const t=Number(d?._savedAt)||0;if(d&&!this.isKnown(t)){if(d._tab!==TAB_ID)mergeStateFromOtherTab(state,this.baseFor(d),d);this.remember(t,raw,d._tab===TAB_ID);}}catch{}
    }
    const savedAt=Math.max(Date.now(),this.savedAt+1);
    let json;try{state._savedAt=savedAt;state._tab=TAB_ID;state._base=this.seenAt;json=JSON.stringify(state);}catch{return;}
    this.dirty=false;this.lastSize=json.length;
    let lsOk=false;
    if((!this.idbOk||json.length<=LS_MIRROR_MAX)&&this.lsEnabled){try{localStorage.setItem(this.key,json);lsOk=true;this.lsHasCopy=true;}catch{}}
    this.writeMeta({savedAt,tab:TAB_ID,ls:lsOk});
    this.remember(savedAt,json,true);
    if(this.idbOk)idb.setMany([[this.key,json],[this.key+":at",savedAt]]).then(()=>this.writeMeta({idbAt:Math.max(Number(this.readMeta()?.idbAt)||0,savedAt)}),()=>{});
  },
  fail(e){
    this.lastFailed=true;
    const t=Date.now();if(t-this.warnedAt<60000)return;this.warnedAt=t;
    toast(isQuotaError(e)?"Achtung: Der Gerätespeicher ist voll. Bitte sofort unter Export ein JSON-Backup sichern.":"Achtung: Speichern auf diesem Gerät ist fehlgeschlagen. Bitte unter Export ein JSON-Backup sichern.",8000);
  }
};
let state=store.load();
let booted=false;
// Übernommene Änderungen aus einem anderen Fenster anzeigen – aber nicht mitten ins Tippen hinein.
let lastInputAt=0,composing=false,mergeRenderTimer=null;
document.addEventListener("input",()=>{lastInputAt=Date.now();},true);
document.addEventListener("compositionstart",()=>{composing=true;},true);
document.addEventListener("compositionend",()=>{composing=false;lastInputAt=Date.now();},true);
function renderAfterMerge(){
  clearTimeout(mergeRenderTimer);mergeRenderTimer=null;
  if(!booted)return;
  if(composing||(userIsEditing()&&Date.now()-lastInputAt<2500)){mergeRenderTimer=setTimeout(renderAfterMerge,900);return;}
  render();
}

function normalizePersonName(v=""){
  return String(v||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase("de-DE").replace(/[^a-z0-9äöüß]+/g," ").trim().replace(/\s+/g," ");
}
function personNameTokens(v=""){return normalizePersonName(v).split(" ").filter(Boolean);}
function mergeTextUnique(a="",b=""){
  a=String(a||"").trim();b=String(b||"").trim();if(!a)return b;if(!b)return a;
  const al=a.toLocaleLowerCase("de-DE"),bl=b.toLocaleLowerCase("de-DE");
  if(al===bl||al.includes(bl))return a;if(bl.includes(al))return b;return `${a} ${b}`;
}
function characterAliasMap(characters=[]){
  const map=new Map();
  for(const c of characters||[]){
    for(const n of [c.name,...(Array.isArray(c.aliases)?c.aliases:[])]){
      const k=normalizePersonName(n);if(k)map.set(k,c.name);
    }
  }
  return map;
}
function dedupeCharactersAndRelationships(p){
  if(!p)return;
  const source=Array.isArray(p.characters)?p.characters:[];
  const byExact=new Map();
  for(const c of source){
    if(!c||!String(c.name||"").trim())continue;
    const name=String(c.name).trim(),key=normalizePersonName(name);if(!key)continue;
    if(!byExact.has(key))byExact.set(key,{...c,name,aliases:Array.isArray(c.aliases)?[...c.aliases]:[]});
    else{
      const ex=byExact.get(key);
      for(const f of ["age","role","appearance","personality","voice","thought"])ex[f]=mergeTextUnique(ex[f],c[f]);
      ex.aliases=[...new Set([...(ex.aliases||[]),...(c.aliases||[]),name].filter(Boolean))];
    }
  }
  let chars=[...byExact.values()];
  // Kurzer Vorname + eindeutig längerer Name: "Aren" und "Aren Sar" sind dieselbe Figur.
  // Bei mehreren Vollnamen mit demselben Vornamen wird NICHT automatisch zusammengeführt.
  const groups=new Map();
  for(const c of chars){const t=personNameTokens(c.name);if(!t.length)continue;const first=t[0];if(!groups.has(first))groups.set(first,[]);groups.get(first).push(c);}
  const removed=new Set(),rename=new Map();
  for(const group of groups.values()){
    const singles=group.filter(c=>personNameTokens(c.name).length===1);
    const fulls=group.filter(c=>personNameTokens(c.name).length>1);
    if(singles.length===1&&fulls.length===1){
      const short=singles[0],full=fulls[0];
      for(const f of ["age","role","appearance","personality","voice","thought"])full[f]=mergeTextUnique(full[f],short[f]);
      full.aliases=[...new Set([...(full.aliases||[]),...(short.aliases||[]),short.name].filter(Boolean))];
      rename.set(normalizePersonName(short.name),full.name);removed.add(short);
    }
  }
  chars=chars.filter(c=>!removed.has(c));
  // längeren, vollständigeren Namen bevorzugen und Alias-Mapping aktualisieren
  const aliases=characterAliasMap(chars);
  for(const [k,v] of rename)aliases.set(k,v);
  const resolve=name=>{
    const key=normalizePersonName(name);if(!key)return String(name||"").trim();
    if(aliases.has(key))return aliases.get(key);
    const toks=personNameTokens(name);
    if(toks.length===1){
      const candidates=chars.filter(c=>personNameTokens(c.name)[0]===toks[0]);
      if(candidates.length===1)return candidates[0].name;
    }
    return String(name||"").trim();
  };
  const rels=[];const relMap=new Map();
  for(const r of Array.isArray(p.relationships)?p.relationships:[]){
    if(!r)continue;const a=resolve(r.a),b=resolve(r.b);if(!a||!b||normalizePersonName(a)===normalizePersonName(b))continue;
    const key=[normalizePersonName(a),normalizePersonName(b)].sort().join("|");
    if(!relMap.has(key)){
      const nr={...r,a,b,metrics:{Vertrauen:30,Nähe:20,Misstrauen:20,Abhängigkeit:10,Begehren:10,Konflikt:20,...(r.metrics||{})}};
      relMap.set(key,nr);rels.push(nr);
    }else{
      const ex=relMap.get(key);ex.note=mergeTextUnique(ex.note,r.note);
      for(const [mk,mv] of Object.entries(r.metrics||{}))if(Number.isFinite(Number(mv)))ex.metrics[mk]=Math.max(Number(ex.metrics[mk])||0,Number(mv));
    }
  }
  p.characters=chars;p.relationships=rels;
}
function resolveCharacterName(p,name){
  if(!p)return String(name||"").trim();
  dedupeCharactersAndRelationships(p);
  const key=normalizePersonName(name);if(!key)return String(name||"").trim();
  const alias=characterAliasMap(p.characters||[]);if(alias.has(key))return alias.get(key);
  const toks=personNameTokens(name);
  if(toks.length===1){const candidates=(p.characters||[]).filter(c=>personNameTokens(c.name)[0]===toks[0]);if(candidates.length===1)return candidates[0].name;}
  return String(name||"").trim();
}
// Nur IDs mit Zeichen, die in HTML gefährlich wären, werden ersetzt – normale IDs bleiben unverändert.
const SAFE_ID=/^[^"'<>&\s`\\]{1,128}$/;
function safeId(v){return typeof v==="string"&&SAFE_ID.test(v)?v:uid();}
function ensureProjectShape(p){
  if(!p||typeof p!=="object")return null;
  p.id=safeId(p.id);
  p.title ||= "Unbenanntes Buch";
  p.genre ||= "Roman";
  p.status ||= "Idee";
  p.briefing ||= {raw:"",analysis:null,summary:"",lastAnalyzed:""};
  if(typeof p.originalIdea!=="string")p.originalIdea=String(p.briefing?.raw||p.dna?.premise||"");
  p.seriesId=String(p.seriesId||"");
  p.seriesOrder=Number(p.seriesOrder)||0;
  p.seriesLabel=String(p.seriesLabel||"");
  p.editionGroupId=String(p.editionGroupId||"");
  p.editionOrder=Number(p.editionOrder)||0;
  p.editionLabel=String(p.editionLabel||"");
  p.createdAt ||= now();
  p.updatedAt ||= now();
  p.style ||= {rules:[...DEFAULT_RULES],forbidden:[...DEFAULT_FORBIDDEN],referenceChapterId:null,referenceText:"",note:""};
  p.style.rules ||= [...DEFAULT_RULES];
  p.style.forbidden ||= [...DEFAULT_FORBIDDEN];
  p.style.pendingImports=Array.isArray(p.style.pendingImports)?p.style.pendingImports:[];
  p.style.sources=Array.isArray(p.style.sources)?p.style.sources:[];
  p.characters = (Array.isArray(p.characters)?p.characters:[]).filter(c=>c&&typeof c==="object");
  p.relationships = (Array.isArray(p.relationships)?p.relationships:[]).filter(r=>r&&typeof r==="object");
  for(const c of p.characters)c.id=safeId(c.id);
  for(const r of p.relationships)r.id=safeId(r.id);
  dedupeCharactersAndRelationships(p);
  p.chapters = (Array.isArray(p.chapters)?p.chapters:[]).filter(c=>c&&typeof c==="object");
  p.ideas = (Array.isArray(p.ideas)?p.ideas:[]).filter(m=>m&&typeof m==="object");
  for(const m of p.ideas)m.id=safeId(m.id);
  if(Array.isArray(p.ideaVault))for(const x of p.ideaVault)if(x&&typeof x==="object")x.id=safeId(x.id);
  p.chapters.forEach((c,i)=>{c.id=safeId(c.id);c.number=Number(c.number)||i+1;c.title ||= `Kapitel ${c.number}`;c.plan ||= "";c.content ||= "";c.memory ||= "";c.status ||= c.content?"Entwurf":"Planung";c.partTitle ||= "";c.perspective ||= "";c.location ||= "";c.sceneGoal ||= "";c.emotionalMove ||= "";c.newInformation ||= "";c.withhold ||= "";c.relationshipMovement ||= "";c.consequence ||= "";c.bridge ||= "";if(typeof c.planExpanded!=="boolean")c.planExpanded=/szenischer\s+kapitelplan/i.test(c.plan||"")&&countWords(c.plan||"")>=80;});
  p.ui ||= {};
  p.ui.writingActionOrder=Array.isArray(p.ui.writingActionOrder)?p.ui.writingActionOrder.filter(x=>DEFAULT_WRITING_ACTION_ORDER.includes(x)):[...DEFAULT_WRITING_ACTION_ORDER];
  for(const x of DEFAULT_WRITING_ACTION_ORDER)if(!p.ui.writingActionOrder.includes(x))p.ui.writingActionOrder.push(x);
  if(typeof p.ui.writingToolbarLocked!=="boolean")p.ui.writingToolbarLocked=true;
  p.ui.lastChapterId=p.ui.lastChapterId&&p.chapters.some(c=>c.id===p.ui.lastChapterId)?p.ui.lastChapterId:null;
  p.ui.planChapterId=p.ui.planChapterId&&p.chapters.some(c=>c.id===p.ui.planChapterId)?p.ui.planChapterId:null;
  p.ui.writeChapterId=p.ui.writeChapterId&&p.chapters.some(c=>c.id===p.ui.writeChapterId)?p.ui.writeChapterId:null;
  p.cover ||= {};
  p.cover.author ||= "";p.cover.blurb ||= "";p.cover.prompt ||= "";p.cover.selectedDataUrl ||= "";p.cover.selectedMime ||= "image/webp";p.cover.trim ||= "A5";p.cover.spineMm=Number(p.cover.spineMm)||12;p.cover.model ||= "gpt-image-2.5-flare";
  // Aufträge liegen jetzt je Kapitel (planJobs/writeJobs). Alte Einzel-Aufträge werden übernommen.
  for(const [one,many] of [["planJob","planJobs"],["writeJob","writeJobs"]]){
    if(!p[many]||typeof p[many]!=="object"||Array.isArray(p[many]))p[many]={};
    if(p[one]&&p[one].chapterId&&!p[many][p[one].chapterId])p[many][p[one].chapterId]=p[one];
    delete p[one];
    for(const cid of Object.keys(p[many]))if(!p[many][cid]||!p.chapters.some(c=>c.id===cid))delete p[many][cid];
  }
  p.bookPlan ||= null;
  if(p.bookDevelopmentJob!==null && typeof p.bookDevelopmentJob!=="object")p.bookDevelopmentJob=null;
  p.bookDevelopmentJob ||= null;
  ensurePartWorkflowShape(p);
  p.bookMemory ||= {facts:[],openThreads:[],characterStates:[],relationshipStates:[],lastChapterNumber:0,lastUpdated:""};
  p.planRunner ||= {running:false,stopAfterCurrent:false,currentChapterId:null,currentChapterNumber:0,completed:0,total:0,lastMessage:""};
  if(typeof p.planRunner.stopAfterCurrent!=="boolean")p.planRunner.stopAfterCurrent=false;
  p.reviewRunner ||= {running:false,stopRequested:false,currentChapterNumbers:[],completed:0,total:0,lastMessage:"",findingsCount:0,cleanCount:0,startedAt:"",finishedAt:""};
  if(!Array.isArray(p.reviewRunner.currentChapterNumbers))p.reviewRunner.currentChapterNumbers=[];
  if(typeof p.reviewRunner.stopRequested!=="boolean")p.reviewRunner.stopRequested=false;
  p.bookWriter ||= {running:false,stopAfterCurrent:false,qualityPass:true,currentChapterId:null,currentChapterNumber:0,completed:0,total:0,lastMessage:"",ownerDeviceId:"",targetPartIndex:null};
  if(typeof p.bookWriter.qualityPass!=="boolean")p.bookWriter.qualityPass=true;
  p.bookWriter.ownerDeviceId ||= "";
  if(p.bookWriter.targetPartIndex===undefined)p.bookWriter.targetPartIndex=null;
  ensureTranslationsShape(p);
  ensureBookVariantsShape(p);
  return p;
}


// ---------- Übersetzte Sprachfassungen ----------
// Übersetzungen bleiben vollständig getrennt vom Manuskript. Jede Sprachfassung merkt sich,
// von welchem Kapiteltext sie erzeugt wurde. Ändert sich das Original später, wird nur das
// betreffende übersetzte Kapitel wieder als offen markiert.
function emptyTranslations(){return {activeId:null,editions:[]};}
function translationLanguageCode(name){
  const key=String(name||"").trim().toLowerCase();
  const map={"deutsch":"de","englisch":"en","kroatisch":"hr","bosnisch":"bs","serbisch":"sr","slowenisch":"sl","französisch":"fr","franzoesisch":"fr","spanisch":"es","italienisch":"it","portugiesisch":"pt","niederländisch":"nl","niederlaendisch":"nl","dänisch":"da","daenisch":"da","schwedisch":"sv","norwegisch":"no","finnisch":"fi","isländisch":"is","islaendisch":"is","polnisch":"pl","tschechisch":"cs","slowakisch":"sk","ungarisch":"hu","rumänisch":"ro","rumaenisch":"ro","bulgarisch":"bg","griechisch":"el","albanisch":"sq","mazedonisch":"mk","ukrainisch":"uk","russisch":"ru","türkisch":"tr","tuerkisch":"tr","arabisch":"ar","hebräisch":"he","hebraeisch":"he","persisch":"fa","hindi":"hi","japanisch":"ja","koreanisch":"ko","vietnamesisch":"vi","thailändisch":"th","thailaendisch":"th","indonesisch":"id","malaiisch":"ms","latein":"la"};
  return map[key]||"und";
}
function ensureTranslationsShape(p){
  if(!p)return emptyTranslations();
  if(!p.translations||typeof p.translations!=="object"||!Array.isArray(p.translations.editions))p.translations=emptyTranslations();
  const x=p.translations;
  x.editions=x.editions.filter(e=>e&&typeof e==="object").map(e=>{
    e.id=safeId(e.id);e.language=String(e.language||"").trim();e.languageCode=String(e.languageCode||translationLanguageCode(e.language));e.bookTitle=String(e.bookTitle||"");
    e.createdAt ||= now();e.updatedAt ||= e.createdAt;e.sourceVariantId=String(e.sourceVariantId||"");e.sourceVariantName=String(e.sourceVariantName||"");
    e.chapters=Array.isArray(e.chapters)?e.chapters.filter(c=>c&&typeof c==="object").map(c=>({chapterId:safeId(c.chapterId),number:Number(c.number)||0,title:String(c.title||""),content:String(c.content||""),sourceSignature:String(c.sourceSignature||""),translatedAt:String(c.translatedAt||"")})):[];
    e.running=!!e.running;e.stopAfterCurrent=!!e.stopAfterCurrent;e.immediateStop=!!e.immediateStop;e.currentChapterId=String(e.currentChapterId||"");e.completed=Number(e.completed)||0;e.total=Number(e.total)||0;e.lastMessage=String(e.lastMessage||"");e.startedAt=String(e.startedAt||"");e.finishedAt=String(e.finishedAt||"");e.lastHeartbeat=Number(e.lastHeartbeat)||0;
    return e;
  }).filter(e=>e.language);
  if(x.activeId&&!x.editions.some(e=>e.id===x.activeId))x.activeId=x.editions[0]?.id||null;
  return x;
}
function translationEditionProgress(p,e){
  const source=(p?.chapters||[]).filter(c=>String(c.content||"").trim()&&!c.writeIncomplete),byId=new Map((e?.chapters||[]).map(x=>[x.chapterId,x]));
  let done=0,outdated=0;
  for(const c of source){const x=byId.get(c.id),sig=reviewContentSignature(c.content||"");if(x&&String(x.content||"").trim()&&x.sourceSignature===sig)done++;else if(x&&String(x.content||"").trim())outdated++;}
  const total=source.length;return {done,total,open:Math.max(0,total-done),outdated,percent:total?Math.round(done/total*100):0};
}
function activeTranslationEdition(p){const x=ensureTranslationsShape(p);return x.editions.find(e=>e.id===x.activeId)||x.editions.find(e=>e.running)||x.editions[0]||null;}
function runningTranslationEdition(p){return ensureTranslationsShape(p).editions.find(e=>e.running)||null;}
function completedTranslationEditions(p){return ensureTranslationsShape(p).editions.filter(e=>{const q=translationEditionProgress(p,e);return q.total>0&&q.open===0&&!e.running;});}
function bookRevisionComplete(p){
  const r=p?.bookReviser||{},written=(p?.chapters||[]).filter(c=>String(c.content||"").trim()),ids=Array.isArray(r.ids)?r.ids:[],done=Array.isArray(r.done)?r.done:[];
  return written.length>0&&written.every(c=>ids.includes(c.id))&&ids.length>0&&ids.every(id=>done.includes(id))&&!r.running&&!!r.finishedAt;
}
function translationSourceVariant(p){const v=activeBookVariant(p);return {id:v?.id||"",name:v?bookVariantUiLabel(v):"Aktuelle Fassung"};}
function parseTranslationOutput(raw,originalTitle=""){
  const text=String(raw||"").trim();const m=text.match(/^\s*\[\[TITLE\]\]\s*([\s\S]*?)\s*\[\[TEXT\]\]\s*([\s\S]*)$/i);
  if(!m)return {title:originalTitle,text};
  return {title:String(m[1]||originalTitle).trim()||originalTitle,text:String(m[2]||"").trim()};
}

// ---------- Vollständig getrennte Buchfassungen ----------
// Die aktive Fassung lebt weiterhin in p.chapters / p.bookMemory. Dadurch bleiben alle bestehenden
// Schreib-, Prüf- und Exportabläufe unverändert. Andere Fassungen liegen ausschließlich als Snapshots
// in p.bookVariants und werden niemals an die KI übergeben.
function emptyVariantBookMemory(){return {facts:[],openThreads:[],characterStates:[],relationshipStates:[],lastChapterNumber:0,lastUpdated:""};}
function cloneVariantValue(v,fallback=null){try{return JSON.parse(JSON.stringify(v));}catch{return fallback;}}
function idleVariantReview(){return {running:false,stopRequested:false,immediateStop:false,currentChapterNumbers:[],completed:0,total:0,lastMessage:"",findingsCount:0,cleanCount:0,startedAt:"",finishedAt:""};}
function idleVariantPlanRunner(total=0){return {running:false,stopAfterCurrent:false,currentChapterId:null,currentChapterNumber:0,completed:0,total:Number(total)||0,lastMessage:"Bereit",startedAt:"",variantId:""};}
function idleVariantBookWriter(p,total=0){return {running:false,stopAfterCurrent:false,qualityPass:p?.bookWriter?.qualityPass!==false,currentChapterId:null,currentChapterNumber:0,completed:0,total:Number(total)||0,lastMessage:"Bereit",ownerDeviceId:"",targetPartIndex:null,startedAt:"",variantId:""};}
function variantPlanSeedForChapter(p,c){
  const outline=(p?.bookPlan?.chapterOutline||[]).find(x=>Number(x?.number)===Number(c?.number));
  const seed=String(outline?.plan||"").trim();
  if(seed)return seed;
  const bits=[outline?.sceneGoal,outline?.emotionalMove,outline?.consequence].map(x=>String(x||"").trim()).filter(Boolean);
  return bits.join(" · ");
}
function sanitizeVariantJobMap(raw,variantId=""){
  const m=cloneVariantValue(raw||{},{});if(!m||typeof m!=="object"||Array.isArray(m))return {};
  for(const j of Object.values(m)){
    if(!j||typeof j!=="object")continue;
    if(["running","interrupted"].includes(j.status)){j.status="interrupted";j.manualPause=true;}
    j.variantId=String(j.variantId||variantId||"");
    delete j.abortController;
  }
  return m;
}
function variantChapterSnapshot(c){
  const x=cloneVariantValue(c,{})||{};
  delete x.pendingRevision;
  x.id=safeId(x.id);
  x.number=Number(x.number)||0;
  x.title=String(x.title||"");
  x.plan=String(x.plan||"");
  x.planExpanded=!!x.planExpanded;
  x.content=String(x.content||"");
  x.memory=String(x.memory||"");
  x.status=String(x.status||"");
  x.writeIncomplete=!!x.writeIncomplete;
  x.versions=cloneVariantValue(x.versions||[],[]);
  x.wish=String(x.wish||"");
  x.reviewResult=String(x.reviewResult||"");
  x.reviewedAt=String(x.reviewedAt||"");
  x.reviewSignature=String(x.reviewSignature||"");
  return x;
}
function captureVariantCreativeState(p){
  return {
    genre:String(p.genre||"Roman"),
    briefing:cloneVariantValue(p.briefing||{raw:"",analysis:null,summary:"",lastAnalyzed:""},{raw:"",analysis:null,summary:"",lastAnalyzed:""}),
    originalIdea:String(p.originalIdea||""),
    dna:cloneVariantValue(p.dna||{},{}),
    style:cloneVariantValue(p.style||{},{}),
    characters:cloneVariantValue(p.characters||[],[]),
    relationships:cloneVariantValue(p.relationships||[],[]),
    bookPlan:cloneVariantValue(p.bookPlan||null,null),
    partWorkflow:cloneVariantValue(p.partWorkflow||defaultPartWorkflow(p.briefing?.raw||""),defaultPartWorkflow(p.briefing?.raw||"")),
    ideas:cloneVariantValue(p.ideas||[],[]),
    ideaVault:cloneVariantValue(p.ideaVault||[],[])
  };
}
function freshIndependentCreativeState(p){
  const src=captureVariantCreativeState(p);
  const raw=String(src.briefing?.raw||"");
  src.briefing={raw,analysis:null,summary:"",lastAnalyzed:""};
  src.bookPlan=null;
  src.partWorkflow=defaultPartWorkflow(raw);
  src.ideas=[];
  src.ideaVault=[];
  if(src.style){src.style.referenceChapterId=null;src.style.referenceText="";}
  return src;
}
function applyVariantCreativeState(p,creative){
  if(!creative||typeof creative!=="object")return;
  p.genre=String(creative.genre||p.genre||"Roman");
  p.briefing=cloneVariantValue(creative.briefing||{raw:"",analysis:null,summary:"",lastAnalyzed:""},{raw:"",analysis:null,summary:"",lastAnalyzed:""});
  p.originalIdea=String(creative.originalIdea||p.briefing?.raw||"");
  p.dna=cloneVariantValue(creative.dna||{},{});
  p.style=cloneVariantValue(creative.style||p.style||{},p.style||{});
  p.characters=cloneVariantValue(creative.characters||[],[]);
  p.relationships=cloneVariantValue(creative.relationships||[],[]);
  p.bookPlan=cloneVariantValue(creative.bookPlan||null,null);
  p.partWorkflow=cloneVariantValue(creative.partWorkflow||defaultPartWorkflow(p.briefing?.raw||""),defaultPartWorkflow(p.briefing?.raw||""));
  p.ideas=cloneVariantValue(creative.ideas||[],[]);
  p.ideaVault=cloneVariantValue(creative.ideaVault||[],[]);
  p.bookDevelopmentJob=null;
  dedupeCharactersAndRelationships(p);
}
function captureBookVariantSnapshot(p){
  const w=ensurePartWorkflowShape(p),v=p?.bookVariants?.variants?.find(x=>x.id===p.bookVariants?.activeId)||null,vid=v?.id||"";
  const review=cloneVariantValue(p.reviewRunner||idleVariantReview(),idleVariantReview())||idleVariantReview();review.running=false;review.stopRequested=false;review.immediateStop=false;review.currentChapterNumbers=[];
  const reviser=p.bookReviser?cloneVariantValue(p.bookReviser,null):null;if(reviser){reviser.running=false;reviser.stopAfterCurrent=false;reviser.currentId=null;}
  const pr=cloneVariantValue(p.planRunner||idleVariantPlanRunner((p.chapters||[]).length),idleVariantPlanRunner((p.chapters||[]).length))||idleVariantPlanRunner((p.chapters||[]).length);
  pr.running=false;pr.stopAfterCurrent=false;pr.currentChapterId=null;pr.currentChapterNumber=0;pr.completed=(p.chapters||[]).filter(c=>!chapterNeedsPlan(c)).length;pr.total=(p.chapters||[]).length;pr.variantId=vid;
  const bw=cloneVariantValue(p.bookWriter||idleVariantBookWriter(p,(p.chapters||[]).length),idleVariantBookWriter(p,(p.chapters||[]).length))||idleVariantBookWriter(p,(p.chapters||[]).length);
  bw.running=false;bw.stopAfterCurrent=false;bw.currentChapterId=null;bw.currentChapterNumber=0;bw.ownerDeviceId="";bw.completed=(p.chapters||[]).filter(c=>!chapterNeedsWriting(c)).length;bw.total=(p.chapters||[]).length;bw.variantId=vid;
  return {
    creative:captureVariantCreativeState(p),
    chapters:(p.chapters||[]).map(variantChapterSnapshot),
    planJobs:sanitizeVariantJobMap(p.planJobs,vid),writeJobs:sanitizeVariantJobMap(p.writeJobs,vid),planRunner:pr,bookWriter:bw,
    bookMemory:cloneVariantValue(p.bookMemory||emptyVariantBookMemory(),emptyVariantBookMemory()),
    reviewRunner:review,bookReviser:reviser,editorial:cloneVariantValue(p.editorial||{},{}),
    translations:(()=>{const x=cloneVariantValue(ensureTranslationsShape(p),emptyTranslations())||emptyTranslations();for(const e of x.editions||[]){e.running=false;e.stopAfterCurrent=false;e.immediateStop=false;e.currentChapterId="";}return x;})(),
    styleReferenceChapterId:p.style?.referenceChapterId||null,styleReferenceText:String(p.style?.referenceText||""),
    protectedPassages:cloneVariantValue(p.protectedPassages||[],[]),
    uiState:{planChapterId:p.ui?.planChapterId||null,writeChapterId:p.ui?.writeChapterId||null,lastChapterId:p.ui?.lastChapterId||null,studioChapterId:p.ui?.studioChapterId||null},
    partState:(w?.parts||[]).map(x=>({status:String(x.status||""),qualityStatus:String(x.qualityStatus||""),summary:String(x.summary||""),handoff:String(x.handoff||""),error:String(x.error||"")}))
  };
}
function blankBookVariantSnapshot(p){
  const w=ensurePartWorkflowShape(p),total=(p.chapters||[]).length;
  return {
    creative:captureVariantCreativeState(p),
    chapters:(p.chapters||[]).map(c=>{
      const x=variantChapterSnapshot(c);
      x.plan=variantPlanSeedForChapter(p,c);x.planExpanded=false;x.content="";x.memory="";x.status="Planung";x.writeIncomplete=false;x.versions=[];x.wish="";x.reviewResult="";x.reviewedAt="";x.reviewSignature="";
      return x;
    }),
    planJobs:{},writeJobs:{},planRunner:idleVariantPlanRunner(total),bookWriter:idleVariantBookWriter(p,total),
    bookMemory:emptyVariantBookMemory(),reviewRunner:idleVariantReview(),bookReviser:null,editorial:{lastMode:"",lastScope:"chapter",lastResult:"",proofread:null},translations:emptyTranslations(),
    styleReferenceChapterId:null,styleReferenceText:"",protectedPassages:[],uiState:{planChapterId:null,writeChapterId:null,lastChapterId:null,studioChapterId:null},
    partState:(w?.parts||[]).map(x=>({status:(x.chapterIds||[]).length?"planned":String(x.status||"ready"),qualityStatus:(x.chapterIds||[]).length?"Kapitelstruktur vorhanden · Plan-Ausarbeitung dieser Fassung noch offen":String(x.qualityStatus||""),summary:"",handoff:"",error:""}))
  };
}
function freshIndependentBookVariantSnapshot(p){
  const creative=freshIndependentCreativeState(p);
  return {
    creative,
    chapters:[],
    planJobs:{},writeJobs:{},planRunner:idleVariantPlanRunner(0),bookWriter:idleVariantBookWriter(p,0),
    bookMemory:emptyVariantBookMemory(),reviewRunner:idleVariantReview(),bookReviser:null,editorial:{lastMode:"",lastScope:"chapter",lastResult:"",proofread:null},translations:emptyTranslations(),
    styleReferenceChapterId:null,styleReferenceText:"",protectedPassages:[],uiState:{planChapterId:null,writeChapterId:null,lastChapterId:null,studioChapterId:null},
    partState:[]
  };
}
function variantSnapshotHasOwnPlanning(snap){
  const first=(snap?.chapters||[])[0];
  return !!first&&(Object.prototype.hasOwnProperty.call(first,"plan")||Object.prototype.hasOwnProperty.call(first,"planExpanded"));
}
function addLegacyPlanningToVariantSnapshot(p,snap,planById,{fresh=false,variantId=""}={}){
  const s=snap&&typeof snap==="object"?snap:blankBookVariantSnapshot(p),total=(p.chapters||[]).length;
  s.chapters=(s.chapters||[]).map(x=>{
    const c=(p.chapters||[]).find(y=>y.id===x.id),legacy=planById.get(x.id)||{};
    return {...x,plan:fresh?variantPlanSeedForChapter(p,c):String(legacy.plan||""),planExpanded:fresh?false:!!legacy.planExpanded};
  });
  s.planJobs=fresh?{}:sanitizeVariantJobMap(s.planJobs||{},variantId);
  s.writeJobs=fresh?{}:sanitizeVariantJobMap(s.writeJobs||{},variantId);
  s.planRunner=idleVariantPlanRunner(total);s.planRunner.variantId=variantId;
  s.bookWriter=idleVariantBookWriter(p,total);s.bookWriter.variantId=variantId;
  return s;
}
function ensureBookVariantsShape(p){
  if(!p)return null;
  if(!p.bookVariants||typeof p.bookVariants!=="object"||!Array.isArray(p.bookVariants.variants)){
    const id=uid();p.bookVariants={schemaVersion:2,activeId:id,canonId:id,variants:[{id,name:"Version 1",kind:"draft",createdAt:p.createdAt||now(),updatedAt:now(),snapshot:null}]};return p.bookVariants;
  }
  const b=p.bookVariants,oldSchema=Number(b.schemaVersion||1);
  b.variants=b.variants.filter(v=>v&&typeof v==="object").map((v,i)=>({id:safeId(v.id),name:String(v.name||`Version ${i+1}`),kind:v.kind==="final"?"final":"draft",createdAt:v.createdAt||now(),updatedAt:v.updatedAt||v.createdAt||now(),snapshot:v.snapshot&&typeof v.snapshot==="object"?v.snapshot:null}));
  if(!b.variants.length){const id=uid();b.variants=[{id,name:"Version 1",kind:"draft",createdAt:now(),updatedAt:now(),snapshot:null}];}
  if(!b.variants.some(v=>v.id===b.activeId))b.activeId=b.variants[0].id;
  if(!b.variants.some(v=>v.id===b.canonId))b.canonId=b.variants.find(v=>v.kind==="draft")?.id||b.activeId;
  if(oldSchema<2){
    const drafts=b.variants.filter(v=>v.kind!=="final");
    const original=drafts.find(v=>/(?:^|\s)1(?:\s|$)/.test(String(v.name||"")))||drafts[0]||b.variants[0];
    const legacyPlanById=new Map((p.chapters||[]).map(c=>[c.id,{plan:String(c.plan||""),planExpanded:!!c.planExpanded}]));
    for(const v of b.variants){
      if(v.id===b.activeId)continue;
      if(variantSnapshotHasOwnPlanning(v.snapshot))continue;
      const written=(v.snapshot?.chapters||[]).some(c=>String(c.content||"").trim());
      const fresh=v.kind!=="final"&&v.id!==original?.id&&!written;
      v.snapshot=addLegacyPlanningToVariantSnapshot(p,v.snapshot||blankBookVariantSnapshot(p),legacyPlanById,{fresh,variantId:v.id});
    }
    const active=b.variants.find(v=>v.id===b.activeId),activeWritten=(p.chapters||[]).some(c=>String(c.content||"").trim());
    const activeNeedsFresh=active&&active.kind!=="final"&&active.id!==original?.id&&!activeWritten;
    if(activeNeedsFresh){
      for(const c of p.chapters||[]){c.plan=variantPlanSeedForChapter(p,c);c.planExpanded=false;c.status="Planung";}
      p.planJobs={};p.writeJobs={};p.planRunner=idleVariantPlanRunner((p.chapters||[]).length);p.planRunner.variantId=active.id;
      p.bookWriter=idleVariantBookWriter(p,(p.chapters||[]).length);p.bookWriter.variantId=active.id;
    }else if(active){
      p.planRunner ||= idleVariantPlanRunner((p.chapters||[]).length);p.planRunner.variantId=active.id;
      p.bookWriter ||= idleVariantBookWriter(p,(p.chapters||[]).length);p.bookWriter.variantId=active.id;
      for(const j of Object.values(p.planJobs||{}))if(j&&typeof j==="object")j.variantId=active.id;
      for(const j of Object.values(p.writeJobs||{}))if(j&&typeof j==="object")j.variantId=active.id;
    }
    b.schemaVersion=2;p.updatedAt=now();try{store.save({sync:false});}catch{}
  }else b.schemaVersion=2;
  repairDuplicateVariants(p,b);
  return b;
}
// Doppelte Fassungen (z. B. zweimal „Version 2“ durch doppeltes Tippen oder zwei Geräte gleichzeitig):
// Eine LEERE, nicht geöffnete Doppelung wird entfernt; enthält sie Text, bekommt sie die nächste freie Nummer.
function variantIsEmpty(v,b){if(v.id===b.activeId)return false;return !(v.snapshot?.chapters||[]).some(c=>String(c.content||"").trim());}
function repairDuplicateVariants(p,b){
  const drafts=b.variants.filter(v=>v.kind!=="final");const names=drafts.map(v=>v.name);if(new Set(names).size===names.length&&b.variants.filter(v=>v.kind==="final").length<=1)return;
  const seen=new Map();let changed=false;
  for(const v of [...b.variants]){
    const key=v.kind==="final"?"__final":v.name;
    if(!seen.has(key)){seen.set(key,v);continue;}
    const first=seen.get(key);
    // Die leere, nicht aktive der beiden fliegt raus
    const drop=variantIsEmpty(v,b)?v:variantIsEmpty(first,b)?first:null;
    if(drop&&drop.id!==b.canonId){b.variants=b.variants.filter(x=>x.id!==drop.id);if(drop===first)seen.set(key,v);changed=true;continue;}
    if(v.kind!=="final"){const used=new Set(b.variants.filter(x=>x.kind!=="final").map(x=>x.name));let n=2;while(used.has(`Version ${n}`))n++;v.name=`Version ${n}`;changed=true;}
  }
  if(changed){p.updatedAt=now();try{store.save({sync:false});}catch{}}
}
function nextFreeVariantName(b){const used=new Set(b.variants.filter(x=>x.kind!=="final").map(x=>x.name));let n=2;while(used.has(`Version ${n}`))n++;return `Version ${n}`;}
function activeBookVariant(p){const b=ensureBookVariantsShape(p);return b?.variants.find(v=>v.id===b.activeId)||null;}
function bookVariantSnapshot(p,v){const b=ensureBookVariantsShape(p);if(!v)return blankBookVariantSnapshot(p);return v.id===b.activeId?captureBookVariantSnapshot(p):(v.snapshot||blankBookVariantSnapshot(p));}
// Nur unmittelbar vor einem Wechsel wird die aktive Fassung als Snapshot abgelegt. Solange sie aktiv ist,
// bleibt der Text ausschließlich im normalen Manuskript – dadurch werden Speichern und Schreiben nicht langsamer.
function saveActiveBookVariant(p){const v=activeBookVariant(p);if(!v)return null;v.snapshot=captureBookVariantSnapshot(p);v.updatedAt=now();return v;}
function applyBookVariantSnapshot(p,snapshot){
  const snap=snapshot&&typeof snapshot==="object"?snapshot:blankBookVariantSnapshot(p);
  applyVariantCreativeState(p,snap.creative);

  const oldById=new Map((p.chapters||[]).map(c=>[c.id,c]));
  p.chapters=(Array.isArray(snap.chapters)?snap.chapters:[]).map((raw,i)=>{
    const x=cloneVariantValue(raw,{})||{},legacy=oldById.get(x.id)||{};
    const c={...cloneVariantValue(legacy,{}),...x};
    c.id=safeId(c.id||uid());
    c.number=Number(c.number)||Number(legacy.number)||i+1;
    c.title=String(c.title||legacy.title||`Kapitel ${c.number}`);
    c.plan=String(c.plan||"");c.planExpanded=!!c.planExpanded;
    c.content=String(c.content||"");c.memory=String(c.memory||"");
    c.status=String(c.status||(c.content?"Entwurf":"Planung"));
    c.writeIncomplete=!!c.writeIncomplete;c.versions=cloneVariantValue(c.versions||[],[]);
    c.wish=String(c.wish||"");c.reviewResult=String(c.reviewResult||"");c.reviewedAt=String(c.reviewedAt||"");c.reviewSignature=String(c.reviewSignature||"");c.pendingRevision=null;
    c.partTitle=String(c.partTitle||"");c.perspective=String(c.perspective||"");c.location=String(c.location||"");c.sceneGoal=String(c.sceneGoal||"");c.emotionalMove=String(c.emotionalMove||"");c.newInformation=String(c.newInformation||"");c.withhold=String(c.withhold||"");c.relationshipMovement=String(c.relationshipMovement||"");c.consequence=String(c.consequence||"");c.bridge=String(c.bridge||"");
    return c;
  });

  const vid=p?.bookVariants?.activeId||"";
  p.planJobs=sanitizeVariantJobMap(snap.planJobs||{},vid);
  p.writeJobs=sanitizeVariantJobMap(snap.writeJobs||{},vid);
  p.planRunner=cloneVariantValue(snap.planRunner||idleVariantPlanRunner((p.chapters||[]).length),idleVariantPlanRunner((p.chapters||[]).length))||idleVariantPlanRunner((p.chapters||[]).length);
  p.planRunner.running=false;p.planRunner.stopAfterCurrent=false;p.planRunner.currentChapterId=null;p.planRunner.currentChapterNumber=0;p.planRunner.completed=(p.chapters||[]).filter(c=>!chapterNeedsPlan(c)).length;p.planRunner.total=(p.chapters||[]).length;p.planRunner.variantId=vid;
  const savedWriter=cloneVariantValue(snap.bookWriter||idleVariantBookWriter(p,(p.chapters||[]).length),idleVariantBookWriter(p,(p.chapters||[]).length))||idleVariantBookWriter(p,(p.chapters||[]).length);
  savedWriter.running=false;savedWriter.stopAfterCurrent=false;savedWriter.currentChapterId=null;savedWriter.currentChapterNumber=0;savedWriter.ownerDeviceId="";savedWriter.completed=(p.chapters||[]).filter(c=>!chapterNeedsWriting(c)).length;savedWriter.total=(p.chapters||[]).length;savedWriter.variantId=vid;
  p.bookWriter=savedWriter;
  p.bookMemory=cloneVariantValue(snap.bookMemory||emptyVariantBookMemory(),emptyVariantBookMemory());
  p.reviewRunner=cloneVariantValue(snap.reviewRunner||idleVariantReview(),idleVariantReview())||idleVariantReview();p.reviewRunner.running=false;p.reviewRunner.stopRequested=false;p.reviewRunner.immediateStop=false;p.reviewRunner.currentChapterNumbers=[];
  p.bookReviser=snap.bookReviser?cloneVariantValue(snap.bookReviser,null):null;if(p.bookReviser){p.bookReviser.running=false;p.bookReviser.stopAfterCurrent=false;p.bookReviser.currentId=null;}
  p.editorial=cloneVariantValue(snap.editorial||{lastMode:"",lastScope:"chapter",lastResult:"",proofread:null},{lastMode:"",lastScope:"chapter",lastResult:"",proofread:null});
  p.translations=cloneVariantValue(snap.translations||emptyTranslations(),emptyTranslations())||emptyTranslations();ensureTranslationsShape(p);for(const e of p.translations.editions){e.running=false;e.stopAfterCurrent=false;e.immediateStop=false;e.currentChapterId="";}
  p.style ||= {rules:[...DEFAULT_RULES],forbidden:[...DEFAULT_FORBIDDEN],referenceChapterId:null,referenceText:"",note:""};
  if(!snap.creative?.style){p.style.referenceChapterId=snap.styleReferenceChapterId||null;p.style.referenceText=String(snap.styleReferenceText||"");}
  p.protectedPassages=cloneVariantValue(snap.protectedPassages||[],[]);
  if(!snap.creative?.partWorkflow){
    const w=ensurePartWorkflowShape(p);(snap.partState||[]).forEach((x,i)=>{if(!w?.parts?.[i])return;w.parts[i].status=String(x.status||w.parts[i].status);w.parts[i].qualityStatus=String(x.qualityStatus||"");w.parts[i].summary=String(x.summary||"");w.parts[i].handoff=String(x.handoff||"");w.parts[i].error=String(x.error||"");});
  }else ensurePartWorkflowShape(p);

  p.ui ||= {};const us=snap.uiState||{};p.ui.planChapterId=us.planChapterId&&p.chapters.some(c=>c.id===us.planChapterId)?us.planChapterId:null;p.ui.writeChapterId=us.writeChapterId&&p.chapters.some(c=>c.id===us.writeChapterId)?us.writeChapterId:null;p.ui.lastChapterId=us.lastChapterId&&p.chapters.some(c=>c.id===us.lastChapterId)?us.lastChapterId:null;p.ui.studioChapterId=us.studioChapterId&&p.chapters.some(c=>c.id===us.studioChapterId)?us.studioChapterId:null;
  const preferred=(p.chapters||[]).find(chapterNeedsPlan)||(p.chapters||[]).find(chapterNeedsWriting)||(p.chapters||[])[0]||null;
  if(preferred){if(!p.ui.planChapterId)p.ui.planChapterId=preferred.id;if(!p.ui.writeChapterId)p.ui.writeChapterId=preferred.id;if(!p.ui.lastChapterId)p.ui.lastChapterId=preferred.id;if(state.activeProjectId===p.id)state.activeChapterId=p.ui.lastChapterId||preferred.id;}
  else if(state.activeProjectId===p.id)state.activeChapterId=null;
}
function bookVariantSeriesSource(p){
  const b=ensureBookVariantsShape(p),canon=b?.variants.find(v=>v.id===b.canonId);
  if(!canon||canon.id===b.activeId||!canon.snapshot)return {chapters:p.chapters||[],bookMemory:p.bookMemory||emptyVariantBookMemory()};
  return {chapters:cloneVariantValue(canon.snapshot.chapters||[],[]),bookMemory:canon.snapshot.bookMemory||emptyVariantBookMemory()};
}
function ensureSeriesShape(x){
  if(!x||typeof x!=="object")return null;
  x.id=safeId(x.id);x.title=String(x.title||"Unbenannte Reihe").trim()||"Unbenannte Reihe";
  x.sharedBible=String(x.sharedBible||"");x.bookIds=Array.isArray(x.bookIds)?x.bookIds.filter(Boolean):[];
  x.createdAt ||= now();x.updatedAt ||= now();return x;
}
function seriesById(id){return (state.series||[]).find(x=>x.id===id)||null;}
function seriesForProject(p){return p?.seriesId?seriesById(p.seriesId):null;}
// In einer Buchreihe ist immer nur das Original eines Bandes ein eigener Band.
// Version 2, Version 3 und Final gehören zum selben Band und dürfen niemals als zusätzliche Bände auftauchen.
function seriesBandRoot(p){
  if(!p)return null;
  const g=p.editionGroupId?editionGroupById(p.editionGroupId):null;
  return g?(editionOriginal(g)||p):p;
}
function isSeriesBandRoot(p){const root=seriesBandRoot(p);return !!p&&root?.id===p.id;}
function seriesBooks(series){
  if(!series)return [];
  const explicit=(series.bookIds||[]).map(projectById).filter(Boolean).filter(isSeriesBandRoot);
  const discovered=(state.projects||[]).filter(p=>p.seriesId===series.id&&isSeriesBandRoot(p)&&!explicit.some(x=>x.id===p.id));
  return [...explicit,...discovered].sort((a,b)=>(Number(a.seriesOrder)||999)-(Number(b.seriesOrder)||999)||String(a.createdAt||"").localeCompare(String(b.createdAt||"")));
}
function normalizeSeriesMembership(){
  state.series=(Array.isArray(state.series)?state.series:[]).map(ensureSeriesShape).filter(Boolean);
  const valid=new Set(state.projects.map(p=>p.id));
  for(const s of state.series){
    const discovered=state.projects.filter(p=>p.seriesId===s.id&&isSeriesBandRoot(p)).sort((a,b)=>(Number(a.seriesOrder)||999)-(Number(b.seriesOrder)||999));
    const ids=[...(s.bookIds||[]).filter(id=>valid.has(id)).filter(id=>{const p=projectById(id);return p&&isSeriesBandRoot(p);})];
    for(const p of discovered)if(!ids.includes(p.id))ids.push(p.id);
    s.bookIds=ids;
    seriesBooks(s).forEach((p,i)=>{p.seriesId=s.id;p.seriesOrder=i+1;p.seriesLabel=p.seriesLabel||`Band ${i+1}`;});
  }
  for(const p of state.projects){if(p.seriesId&&!seriesById(p.seriesId)){p.seriesId="";p.seriesOrder=0;p.seriesLabel="";}}
}
function compactSeriesBookContext(p){
  const src=bookVariantSeriesSource(p),mem=src.bookMemory||emptyVariantBookMemory();
  const remembered=(src.chapters||[]).filter(c=>String(c.memory||"").trim()),last=(src.chapters||[]).filter(c=>String(c.content||c.memory||"").trim()).slice(-1)[0];
  const canonFacts=(mem.facts||[]).length?(mem.facts||[]):remembered.slice(-12).map(c=>`Kapitel ${c.number}: ${String(c.memory||"").slice(0,1200)}`);
  return {order:Number(p.seriesOrder)||0,title:p.title,summary:p.briefing?.summary||p.bookPlan?.bookVision||p.dna?.premise||"",canonFacts:canonFacts.slice(-40),openThreads:(mem.openThreads||[]).slice(-30),characterStates:(mem.characterStates||[]).slice(-30),relationshipStates:(mem.relationshipStates||[]).slice(-30),endingMemory:String(last?.memory||"").slice(0,5000)};
}
function seriesContextForProject(p){
  const s=seriesForProject(p);if(!s)return null;
  const root=seriesBandRoot(p)||p,books=seriesBooks(s),idx=books.findIndex(x=>x.id===root.id),slot=editionGroupForProject(p)?editionSlotNumber(p,1):1;
  const previousRoots=books.slice(0,Math.max(0,idx)),missing=[];
  const previousVolumes=previousRoots.map(b=>{
    if(slot===1)return b;
    const eg=editionGroupForProject(b),match=eg?editionSlots(eg).find(x=>x.order===slot)?.project:null;
    if(!match){missing.push({order:Number(b.seriesOrder)||0,title:b.title,needed:slot===4?"Final":`Version ${slot}`});return null;}
    return match;
  }).filter(Boolean).map(compactSeriesBookContext);
  return {seriesId:s.id,seriesTitle:s.title,edition:slot===1?"Original":slot===4?"Final":`Version ${slot}`,currentVolume:{order:Number(root.seriesOrder)||idx+1,label:root.seriesLabel||`Band ${idx+1}`,title:root.title},sharedBible:String(s.sharedBible||"").slice(0,40000),previousVolumes,missingPreviousVolumes:missing};
}

// ---------- Echte, vollständig getrennte Buchfassungen ----------
// Seit V1.9.2.9 sind Original, Version 2, Version 3 und Final keine Snapshots mehr im selben
// Buchobjekt. Jede Fassung ist ein eigenes Projekt mit eigener ID und damit eigenem Briefing,
// Kapitelplan, Manuskript, Gedächtnis und Prüfstand. Die editionGroups gruppieren sie nur optisch.
function ensureEditionGroupShape(x){
  if(!x||typeof x!=="object")return null;
  x.id=safeId(x.id);x.title=String(x.title||"Unbenanntes Buch").trim()||"Unbenanntes Buch";
  x.bookIds=Array.isArray(x.bookIds)?x.bookIds.filter(Boolean):[];
  x.createdAt ||= now();x.updatedAt ||= now();return x;
}
function editionGroupById(id){return (state.editionGroups||[]).find(x=>x.id===id)||null;}
function editionGroupForProject(p){return p?.editionGroupId?editionGroupById(p.editionGroupId):null;}
function editionBooks(g){
  if(!g)return [];
  const explicit=(g.bookIds||[]).map(projectById).filter(Boolean);
  const discovered=(state.projects||[]).filter(p=>p.editionGroupId===g.id&&!explicit.some(x=>x.id===p.id));
  return [...explicit,...discovered].sort((a,b)=>(Number(a.editionOrder)||999)-(Number(b.editionOrder)||999)||String(a.createdAt||"").localeCompare(String(b.createdAt||"")));
}
function editionLabel(p,index=0){return String(p?.editionLabel||(index===0?"Original":`Version ${index+1}`));}
function editionMark(p,index=0){const lab=editionLabel(p,index);if(/final/i.test(lab))return "FINAL";const m=lab.match(/(\d+)/);return m?`V${m[1]}`:"ORIG";}
function editionSlotNumber(p,fallback=1){
  const lab=String(p?.editionLabel||"");if(/final/i.test(lab))return 4;const m=lab.match(/(\d+)/);if(m)return Math.max(1,Math.min(3,Number(m[1])||fallback));return Number(p?.editionOrder)||fallback;
}
function editionOriginal(g){return editionBooks(g).find(p=>editionSlotNumber(p,1)===1)||editionBooks(g)[0]||null;}
function editionSlots(g){
  const books=editionBooks(g),find=n=>books.find(p=>editionSlotNumber(p,n)===n)||null;
  return [
    {order:1,label:"Original",mark:"ORIG",color:"v1",project:find(1)},
    {order:2,label:"Version 2",mark:"V2",color:"v2",project:find(2)},
    {order:3,label:"Version 3",mark:"V3",color:"v3",project:find(3)},
    {order:4,label:"Final",mark:"FINAL",color:"final",project:find(4)}
  ];
}
function editionProjectIsEmpty(p){const st=bookStatsRaw(p);return st.words===0;}
function editionGroupIsNestedInSeries(g){const orig=editionOriginal(g);return !!orig?.seriesId;}
function seriesBandEditionForSlot(root,slot){if(!root)return null;if(slot<=1)return root;const g=editionGroupForProject(root);return g?(editionSlots(g).find(x=>x.order===slot)?.project||null):null;}
function singleInternalVariantShell(p){
  // Alte interne Fassungen niemals wegwerfen: einmalige Sicherheitskopie am Projekt behalten.
  const b=p.bookVariants;
  if(b?.variants?.length>1&&!p.legacyBookVariantsBackup){
    const copy=cloneDeep(b)||{};const av=copy.variants?.find(v=>v.id===copy.activeId);
    if(av)try{av.snapshot=captureBookVariantSnapshot(p);}catch{}
    p.legacyBookVariantsBackup={savedAt:now(),bookVariants:copy};
  }
  if(!p.bookVariants||p.bookVariants.schemaVersion!==3||p.bookVariants.variants?.length!==1){
    const id=uid();p.bookVariants={schemaVersion:3,activeId:id,canonId:id,variants:[{id,name:"Version 1",kind:"draft",createdAt:p.createdAt||now(),updatedAt:now(),snapshot:null}]};
  }
}
function ensureEditionGroupForProject(p){
  let g=editionGroupForProject(p);if(g)return g;
  g={id:uid(),title:p.title,bookIds:[p.id],createdAt:now(),updatedAt:now()};
  state.editionGroups ||= [];state.editionGroups.push(g);
  p.editionGroupId=g.id;p.editionOrder=1;p.editionLabel="Original";singleInternalVariantShell(p);return g;
}
function normalizeEditionGroups(){
  state.editionGroups=(Array.isArray(state.editionGroups)?state.editionGroups:[]).map(ensureEditionGroupShape).filter(Boolean);
  const valid=new Set((state.projects||[]).map(p=>p.id));
  for(const g of state.editionGroups){
    g.bookIds=(g.bookIds||[]).filter(id=>valid.has(id));
    const discovered=(state.projects||[]).filter(p=>p.editionGroupId===g.id&&!g.bookIds.includes(p.id));for(const p of discovered)g.bookIds.push(p.id);
    editionBooks(g).forEach((p,i)=>{p.editionGroupId=g.id;p.editionLabel=p.editionLabel||(i===0?"Original":`Version ${i+1}`);p.editionOrder=editionSlotNumber(p,i+1);singleInternalVariantShell(p);});
  }
  for(const p of state.projects||[])if(p.editionGroupId&&!editionGroupById(p.editionGroupId)){p.editionGroupId="";p.editionOrder=0;p.editionLabel="";}
  // Bestehende getrennte Bücher mit exakt demselben Titel als Fassungen erkennen.
  // Generische Leertitel werden nie automatisch gruppiert. Mindestens eine Fassung muss Manuskripttext haben.
  const buckets=new Map();
  for(const p of state.projects||[]){
    if(p.editionGroupId)continue;const key=String(p.title||"").trim().toLocaleLowerCase("de-DE");
    if(!key||["neues buch","unbenanntes buch"].includes(key))continue;
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p);
  }
  for(const list of buckets.values()){
    if(list.length<2||!list.some(p=>bookStatsRaw(p).words>0))continue;
    list.sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||"")));
    const g={id:uid(),title:list[0].title,bookIds:list.map(p=>p.id),createdAt:list[0].createdAt||now(),updatedAt:now()};state.editionGroups.push(g);
    list.forEach((p,i)=>{p.editionGroupId=g.id;p.editionOrder=i+1;p.editionLabel=i===0?"Original":`Version ${i+1}`;singleInternalVariantShell(p);});
  }
  // Fassungen eines Reihenbandes erben immer exakt die Reihen-Zuordnung ihres Originals.
  // Dadurch bleibt die Hierarchie stabil: Reihe → Band → Fassung.
  for(const g of state.editionGroups){
    const books=editionBooks(g),orig=editionOriginal(g);if(!orig)continue;
    for(const p of books){p.seriesId=orig.seriesId||"";p.seriesOrder=Number(orig.seriesOrder)||0;p.seriesLabel=orig.seriesLabel||"";}
  }
  // In series.bookIds stehen ausschließlich echte Bände, nie deren Alternativfassungen.
  for(const s of state.series||[])s.bookIds=seriesBooks(s).map(p=>p.id);
  state.editionGroups=state.editionGroups.filter(g=>editionBooks(g).length>0);
}
function editionColorByOrder(p){const n=Number(p?.editionOrder)||1;return /final/i.test(p?.editionLabel||"")?"final":n<=1?"v1":n===2?"v2":"v3";}
function openEditionProject(id){const p=projectById(id);if(!p)return;closeModal();openProjectFromLibrary(id);}
function makeIndependentEditionFrom(base,g,label,order){
  const q=cloneDeep(base);q.id=uid();q.title=g.title||base.title;q.createdAt=now();q.updatedAt=now();q.status="Idee";
  q.editionGroupId=g.id;q.editionOrder=order;q.editionLabel=label;
  // Jede Fassung hat ein eigenes Briefing. Figuren, Roman-DNA und Stilregeln dienen nur als Ausgangspunkt.
  q.briefing={raw:"",analysis:null,summary:"",lastAnalyzed:""};q.originalIdea="";
  q.bookPlan=null;q.partWorkflow=defaultPartWorkflow("");q.chapters=[];q.planJobs={};q.writeJobs={};q.bookDevelopmentJob=null;
  q.bookMemory=emptyVariantBookMemory();q.planRunner=idleVariantPlanRunner(0);q.bookWriter=idleVariantBookWriter(q,0);q.reviewRunner=idleVariantReview();q.bookReviser=null;
  q.translations=emptyTranslations();q.editorial={lastMode:"",lastScope:"chapter",lastResult:"",proofread:null};q.protectedPassages=[];q.ideaVault=[];q.ideas=[];
  q.ui={...(q.ui||{}),lastChapterId:null,planChapterId:null,writeChapterId:null,studioChapterId:null};
  if(q.style){q.style.referenceChapterId=null;q.style.referenceText="";}
  // Bei einem Reihenband bleibt die Fassung unter genau diesem Band. Sie ist KEIN zusätzlicher Band.
  q.seriesId=base.seriesId||"";q.seriesOrder=Number(base.seriesOrder)||0;q.seriesLabel=base.seriesLabel||"";
  q.legacyBookVariantsBackup=null;singleInternalVariantShell(q);return ensureProjectShape(q);
}
function createIndependentEdition(){
  const current=project();if(!current)return;const g=ensureEditionGroupForProject(current),books=editionBooks(g),orig=editionOriginal(g)||current;
  if(bookVariantBusy(current))return toast(bookVariantBusyReason(current)+" Danach kannst du eine neue Fassung anlegen.",5500);
  const drafts=books.filter(p=>editionSlotNumber(p)!==4);
  const order=[2,3].find(n=>!drafts.some(p=>editionSlotNumber(p)===n));
  if(!order)return toast("Original, Version 2 und Version 3 sind bereits vorhanden.",5000);
  const st=bookStatsRaw(orig);if(!st.total||!st.complete)return toast("Das Original muss zuerst vollständig geschrieben sein, bevor eine neue unabhängige Fassung angelegt wird.",6000);
  const label=`Version ${order}`;
  modal(`<h2>${esc(label)} als eigenes Buch anlegen?</h2><p><strong>${esc(label)}</strong> erhält einen vollständig eigenen Speicherbereich. Briefing, Kapitelplan und Manuskript können das Original technisch nicht überschreiben.</p><p>Figuren, Roman-DNA und Stilregeln werden als Ausgangspunkt kopiert. Das Briefing startet leer, damit du eine wirklich andere Geschichte schreiben kannst.</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="confirmIndependentEdition">${esc(label)} anlegen</button></div>`);
  $("#confirmIndependentEdition").onclick=()=>{const q=makeIndependentEditionFrom(orig,g,label,order);state.projects.unshift(q);g.bookIds.push(q.id);g.updatedAt=now();state.activeProjectId=q.id;state.activeChapterId=null;state.activeTab="briefing";store.save();closeModal();render();toast(`${label} wurde als vollständig getrennte Buchfassung angelegt.`,6000);};
}
function makeFinalEditionFrom(source,g){
  const q=cloneDeep(source);q.id=uid();q.title=g.title||source.title;q.createdAt=now();q.updatedAt=now();q.status=source.status||"Idee";
  q.editionGroupId=g.id;q.editionOrder=4;q.editionLabel="Final";
  // Inhalt bleibt als Ausgangspunkt erhalten, laufende Prozesse und alte Prüfmarkierungen werden nicht mitgestartet.
  q.planJobs={};q.writeJobs={};q.bookDevelopmentJob=null;q.planRunner=idleVariantPlanRunner((q.chapters||[]).length);q.bookWriter=idleVariantBookWriter(q,(q.chapters||[]).length);q.reviewRunner=idleVariantReview();q.bookReviser=null;
  q.translations=cloneDeep(q.translations||emptyTranslations())||emptyTranslations();ensureTranslationsShape(q);for(const e of q.translations.editions){e.running=false;e.stopAfterCurrent=false;e.immediateStop=false;e.currentChapterId="";}
  q.editorial={lastMode:"",lastScope:"chapter",lastResult:"",proofread:null};
  for(const c of q.chapters||[]){c.reviewResult="";c.reviewedAt="";c.reviewSignature="";}
  q.seriesId=source.seriesId||"";q.seriesOrder=Number(source.seriesOrder)||0;q.seriesLabel=source.seriesLabel||"";
  q.legacyBookVariantsBackup=null;singleInternalVariantShell(q);return ensureProjectShape(q);
}
function createFinalEdition(){
  const current=project();if(!current)return;const g=ensureEditionGroupForProject(current),books=editionBooks(g);
  if(books.some(p=>/final/i.test(editionLabel(p))))return toast("Die finale Fassung ist bereits vorhanden.",4500);
  if(bookVariantBusy(current))return toast(bookVariantBusyReason(current)+" Danach kannst du die finale Fassung anlegen.",5500);
  const st=bookStatsRaw(current);if(!st.total||!st.complete)return toast("Die aktuell geöffnete Fassung muss vollständig geschrieben sein, bevor du daraus Final anlegst.",6000);
  modal(`<h2>Final als eigene Fassung anlegen?</h2><p>Die aktuell geöffnete Fassung <strong>${esc(editionLabel(current))}</strong> wird als Ausgangspunkt kopiert. Das neue <strong>Final</strong> erhält danach einen eigenen Speicherbereich und kann das Original oder andere Versionen nicht überschreiben.</p><p class="small muted">Manuskript und Kapitel werden kopiert. Laufende Prozesse und alte Prüfergebnisse werden nicht übernommen, damit Final anschließend sauber geprüft werden kann.</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="confirmFinalEdition">Final anlegen</button></div>`);
  $("#confirmFinalEdition").onclick=()=>{const q=makeFinalEditionFrom(current,g);state.projects.unshift(q);g.bookIds.push(q.id);g.updatedAt=now();normalizeEditionGroups();state.activeProjectId=q.id;state.activeChapterId=preferredChapterId(q);state.activeTab="studio";store.save();closeModal();render();toast("Final wurde als vollständig getrennte Fassung angelegt.",6000);};
}
function deleteEditionDirect(id){
  const p=projectById(id),g=editionGroupForProject(p);if(!p||!g)return;
  const books=editionBooks(g),orig=editionOriginal(g);if(orig?.id===p.id)return toast("Das Original ist geschützt. Lösche nur eine alternative Fassung oder das gesamte Buch über die Buchverwaltung.",6000);
  const pos=(g.bookIds||[]).indexOf(p.id),tid=trashAdd({kind:"edition",label:`${editionLabel(p)} · ${p.title}`,where:`Buchfassungen ${g.title}`,project:cloneDeep(p),editionGroup:cloneDeep(g),editionPos:pos});
  state.projects=state.projects.filter(x=>x.id!==p.id);g.bookIds=g.bookIds.filter(x=>x!==p.id);g.updatedAt=now();
  // Andere Fassungen behalten ihre Identität. Beim Löschen von V2 wird V3 niemals still zu V2 umbenannt.
  editionBooks(g).forEach((x,i)=>{x.editionOrder=editionSlotNumber(x,i+1);});
  if(state.activeProjectId===p.id){state.activeProjectId=orig?.id||null;state.activeChapterId=null;state.activeTab="studio";}
  store.save();closeModal();render();setTimeout(()=>undoBar(`${editionLabel(p)} gelöscht. Das Original blieb unverändert.`,tid),80);toast(`${editionLabel(p)} gelöscht. Das Original ist unverändert.`,5500);
}
function restoreLegacyVariantAsEdition(t){
  let base=projectById(t.projectId);if(!base)base=(state.projects||[]).find(p=>String(p.title||"")===String(t.where||""));
  if(!base)return toast("Das zugehörige Buch ist nicht mehr vorhanden. Hole zuerst das Buch selbst aus dem Papierkorb zurück.");
  const g=ensureEditionGroupForProject(base),books=editionBooks(g);let target=books.find(p=>p.id!==editionOriginal(g)?.id&&editionProjectIsEmpty(p));
  const rawName=String(t.variant?.name||"Version 2"),m=rawName.match(/(\d+)/),wanted=Math.max(2,Number(m?.[1])||2);
  if(!target){target=makeIndependentEditionFrom(editionOriginal(g)||base,g,`Version ${wanted}`,wanted);state.projects.unshift(target);g.bookIds.push(target.id);}
  const snap=t.variant?.snapshot;if(snap&&typeof snap==="object"){singleInternalVariantShell(target);applyBookVariantSnapshot(target,snap);singleInternalVariantShell(target);}
  target.editionLabel=`Version ${wanted}`;target.editionOrder=wanted;target.updatedAt=now();g.updatedAt=now();
  normalizeEditionGroups();state.activeProjectId=target.id;state.activeChapterId=preferredChapterId(target);state.activeTab="studio";return target;
}
function studioEditionsHtml(p){
  const g=editionGroupForProject(p);if(!g)return "";
  const rows=editionSlots(g).map(slot=>{const b=slot.project;if(!b)return `<button type="button" class="edition-studio-row empty vc-${slot.color}" data-edition-manage="1"><span class="edition-studio-mark">${slot.mark}</span><span class="edition-studio-copy"><strong>${slot.label}</strong><small>noch nicht angelegt</small></span></button>`;const st=bookStatsRaw(b),active=b.id===p.id,done=st.complete;return `<button type="button" class="edition-studio-row vc-${slot.color} ${active?"active":""}" ${active?'data-edition-manage="1"':`data-edition-open="${b.id}"`}><span class="edition-studio-mark">${slot.mark}</span><span class="edition-studio-copy"><strong>${slot.label}</strong><small>${st.total?`${done?"✓ ":""}${st.done}/${st.total} Kapitel · ${st.words.toLocaleString("de-DE")} Wörter`:"Noch keine Kapitel"}</small></span></button>`;}).join("");
  return `<section class="ss-editions"><div class="ss-variants-head"><span>BUCHFASSUNGEN · vollständig getrennt</span><button type="button" class="ss-variants-manage" data-edition-manage="1">Verwalten ›</button></div><div class="edition-studio-list">${rows}</div></section>`;
}
function openEditionManager(p=project()){
  const g=editionGroupForProject(p);if(!g)return;const orig=editionOriginal(g),slots=editionSlots(g);
  const rows=slots.map(slot=>{const b=slot.project;if(!b)return `<div class="card book-variant-row vc-${slot.color} empty"><div class="book-variant-row-mark">${slot.mark}</div><div class="book-variant-main"><strong>${slot.label}</strong><span>noch nicht angelegt</span><div class="book-variant-badges"><em>eigener Speicherplatz</em></div></div></div>`;const st=bookStatsRaw(b),active=b.id===p.id;return `<div class="card book-variant-row vc-${slot.color} ${active?"active":""}"><div class="book-variant-row-mark">${slot.mark}</div><div class="book-variant-main"><strong>${slot.label}</strong><span>${st.total?`${st.done}/${st.total} Kapitel · ${st.words.toLocaleString("de-DE")} Wörter`:"Noch keine Kapitel"}</span><div class="book-variant-badges">${active?`<em class="active">Aktiv geöffnet</em>`:""}${b.id===orig?.id?`<em>Original · geschützt</em>`:`<em>eigener Speicher</em>`}</div></div><div class="book-variant-actions">${active?`<button class="ghost-btn" disabled>Hier arbeitest du</button>`:`<button class="soft-btn" data-open-edition="${b.id}">Diese Fassung öffnen</button>`}${b.id!==orig?.id?`<button class="ghost-btn variant-del" data-delete-edition="${b.id}">🗑 Nur ${slot.label} löschen</button>`:""}</div></div>`;}).join("");
  const canDraft=slots.slice(1,3).some(x=>!x.project),hasFinal=!!slots[3].project;
  modal(`<h2>Buchfassungen</h2><p class="small muted"><strong>Original, Version 2, Version 3 und Final sind technisch getrennte Bücher.</strong> Briefing, Kapitelplan und Manuskript einer Fassung können keine andere überschreiben.${seriesForProject(p)?`<br>Bei dieser Buchreihe bleiben alle Fassungen unter <strong>${esc(p.seriesLabel||"diesem Band")}</strong>.`:""}</p>${rows}<div class="book-variant-manager-actions">${canDraft?`<button class="primary-btn" id="newIndependentEdition">＋ Neue unabhängige Fassung</button>`:""}${!hasFinal?`<button class="soft-btn" id="newFinalEdition">＋ Final aus aktueller Fassung</button>`:""}</div><div class="book-variant-help"><strong>Sicherheitsregel:</strong> Das Original ist geschützt. Beim Löschen einer Alternative wird ausschließlich diese Fassung in den Papierkorb gelegt. Andere Fassungen behalten auch ihre Bezeichnung, V3 wird also niemals automatisch zu V2.</div><div class="modal-actions"><button class="primary-btn" data-close>Schließen</button></div>`,"wide");
  $$('[data-open-edition]').forEach(b=>b.onclick=()=>openEditionProject(b.dataset.openEdition));
  $$('[data-delete-edition]').forEach(b=>b.onclick=()=>{const q=projectById(b.dataset.deleteEdition);if(!q)return;modal(`<h2>${esc(editionLabel(q))} löschen?</h2><p>Nur <strong>${esc(editionLabel(q))}</strong> wird gelöscht. <strong>Das Original und alle anderen Fassungen bleiben vollständig unangetastet.</strong></p><div class="modal-actions"><button class="ghost-btn" id="editionDeleteBack">Abbrechen</button><button class="danger-btn" id="editionDeleteNow">Nur ${esc(editionLabel(q))} löschen</button></div>`);$("#editionDeleteBack").onclick=()=>openEditionManager(p);$("#editionDeleteNow").onclick=()=>deleteEditionDirect(q.id);});
  $("#newIndependentEdition")?.addEventListener("click",()=>{closeModal();createIndependentEdition();});
  $("#newFinalEdition")?.addEventListener("click",()=>{closeModal();createFinalEdition();});
}

function migrateState(){
  state.projects=(state.projects||[]).map(ensureProjectShape).filter(Boolean);
  if(!Array.isArray(state.series))state.series=[];
  normalizeSeriesMembership();
  normalizeEditionGroups();
  for(const p of state.projects||[]){
    p.ai ||= {authorProvider:"deepseek",authorModel:"deepseek-v4-pro",guardProvider:"deepseek",guardModel:"deepseek-v4-pro"};
    p.security ||= {projectFirewall:true,lastScan:"",lastWarning:""};
    p.tts ||= {provider:"gemini",geminiVoice:"Sulafat",voice:"",voiceName:"",openaiVoice:"marin",rate:1.15,instructions:"Lies wie ein professioneller Hörbuchsprecher: warm, ruhig, atmosphärisch, gefühlvoll und mit glaubwürdiger wechselnder Betonung. Keine übertriebene Schauspielerei.",dictationLang:"de-DE",autoIdeas:false,autoChapters:false};
    if(!["elevenlabs","gemini"].includes(p.tts.provider))p.tts.provider="gemini";
    p.tts.geminiVoice ||= "Sulafat";
    {
      const remembered=rememberedVoice();
      p.tts.voice ||= remembered.id||"";
      p.tts.voiceName ||= remembered.name||"";
    }
    p.tts.openaiVoice ||= "marin";
    if(!p.tts.instructions || p.tts.instructions.startsWith("Lies wie eine hochwertige Romanerzählerin:"))p.tts.instructions="Lies wie ein professioneller Hörbuchsprecher: warm, ruhig, atmosphärisch, gefühlvoll und mit glaubwürdiger wechselnder Betonung. Keine übertriebene Schauspielerei.";
    p.tts.dictationLang ||= "de-DE";
    if(p.tts.rate==null) p.tts.rate=1.15;
    p.briefing ||= {raw:"",analysis:null,summary:"",lastAnalyzed:""};
    p.ideaVault ||= [];
    p.editorial ||= {lastMode:"",lastScope:"chapter",lastResult:"",proofread:null};
    p.protectedPassages ||= [];
    p.dna ||= {};
    p.dna.languages ||= ["Deutsch"];
    p.dna.languageNote ||= ""; p.dna.styleCustom ||= "";
    for(const k of ["romance","intimacy","humor","emotionality","tension","darkness","violence","dialogue","philosophy"]) if(p.dna[k+"Custom"]==null) p.dna[k+"Custom"]="";
    p.dna.emotionality ||= "Mittel"; p.dna.tension ||= "Mittel"; p.dna.darkness ||= "Leicht düster"; p.dna.violence ||= "Angedeutet"; p.dna.dialogue ||= "Ausgewogen"; p.dna.philosophy ||= "Leicht";
    p.ai.authorProvider=validAiProvider(p.ai.authorProvider);
    if(!p.ai.authorModel||(p.ai.authorProvider==="openai"&&p.ai.authorModel==="gpt-5.6-sol"))p.ai.authorModel=aiProviderMeta(p.ai.authorProvider).model;
    // V1.9.3.9: Buchprüfung ist bewusst von der Schreib-KI getrennt. Claude/Kimi/OpenAI beim Schreiben ändern die Prüfung nicht.
    p.ai.guardProvider="deepseek";
    p.ai.guardModel="deepseek-v4-pro";
  }
  store.save();
}

function project(){return state.projects.find(p=>p.id===state.activeProjectId) || null;}
function projectById(id){return (state.projects||[]).find(p=>p.id===id)||null;}
// Nach einer Wartezeit (KI-Antwort) immer das aktuelle Buchobjekt verwenden – per ID gesucht.
function liveProject(p){return p?projectById(p.id):null;}
function preferredPlanChapterId(p){
  if(!p?.chapters?.length)return null;
  if(p.ui?.planChapterId&&p.chapters.some(c=>c.id===p.ui.planChapterId))return p.ui.planChapterId;
  const expanded=p.chapters.filter(c=>!!c.planExpanded||(/szenischer\s+kapitelplan/i.test(c.plan||"")&&countWords(c.plan||"")>=80));
  if(expanded.length)return expanded[expanded.length-1].id;
  if(p.ui?.lastChapterId&&p.chapters.some(c=>c.id===p.ui.lastChapterId))return p.ui.lastChapterId;
  return p.chapters[0].id;
}
function preferredWriteChapterId(p){
  if(!p?.chapters?.length)return null;
  if(p.ui?.writeChapterId&&p.chapters.some(c=>c.id===p.ui.writeChapterId))return p.ui.writeChapterId;
  const written=p.chapters.filter(c=>String(c.content||"").trim());
  if(written.length)return written[written.length-1].id;
  return p.chapters[0].id;
}
function preferredChapterId(p){
  if(!p?.chapters?.length)return null;
  if(state.activeTab==="chapters")return preferredPlanChapterId(p);
  if(state.activeTab==="manuscript")return preferredWriteChapterId(p);
  if(p.ui?.lastChapterId&&p.chapters.some(c=>c.id===p.ui.lastChapterId))return p.ui.lastChapterId;
  return preferredWriteChapterId(p)||preferredPlanChapterId(p)||p.chapters[0].id;
}
function chapterForMode(p,mode){
  if(!p?.chapters?.length)return null;
  const id=mode==="plan"?preferredPlanChapterId(p):mode==="write"?preferredWriteChapterId(p):preferredChapterId(p);
  return p.chapters.find(c=>c.id===id)||p.chapters[0];
}
function chapter(){const p=project();if(!p)return null;if(state.activeTab==="chapters")return chapterForMode(p,"plan");if(state.activeTab==="manuscript")return chapterForMode(p,"write");return p.chapters.find(c=>c.id===state.activeChapterId)||p.chapters.find(c=>c.id===preferredChapterId(p))||p.chapters[0];}
function rememberChapter(p,id,mode=null){if(!p||!id)return;p.ui ||= {};const resolved=mode||(state.activeTab==="chapters"?"plan":state.activeTab==="manuscript"?"write":"general");if(resolved==="plan")p.ui.planChapterId=id;if(resolved==="write")p.ui.writeChapterId=id;p.ui.lastChapterId=id;if(state.activeProjectId===p.id)state.activeChapterId=id;}
// Nach einem fertigen Auftrag direkt zum nächsten Kapitel springen, das noch Arbeit braucht.
// Bereits fertige Kapitel bleiben weiterhin manuell anwählbar.
function chapterNeedsPlan(c){return !(!!c?.planExpanded||(/szenischer\s+kapitelplan/i.test(c?.plan||"")&&countWords(c?.plan||"")>=80));}
function nextPendingChapter(p,finishedId,mode){
  if(!p?.chapters?.length)return null;
  const start=Math.max(-1,p.chapters.findIndex(c=>c.id===finishedId));
  const ordered=[...p.chapters.slice(start+1),...p.chapters.slice(0,start+1)];
  return ordered.find(c=>mode==="plan"?chapterNeedsPlan(c):chapterNeedsWriting(c))||null;
}
function advanceAfterChapterTask(p,finishedId,mode){
  if(!p?.chapters?.length)return null;
  p.ui ||= {};
  const selected=mode==="plan"?p.ui.planChapterId:p.ui.writeChapterId;
  if(selected&&selected!==finishedId)return null;
  const visible=state.activeProjectId===p.id&&((mode==="plan"&&state.activeTab==="chapters")||(mode==="write"&&state.activeTab==="manuscript"));
  if(visible&&userIsEditing())return null;
  const next=nextPendingChapter(p,finishedId,mode);
  if(!next)return null;
  if(mode==="plan")p.ui.planChapterId=next.id;else p.ui.writeChapterId=next.id;
  p.ui.lastChapterId=next.id;
  if(visible)state.activeChapterId=next.id;
  return next;
}
// Tippt die Autorin gerade selbst (Cursor in einem Textfeld), springt die Ansicht nicht automatisch weg.
function userIsEditing(){const a=document.activeElement;return !!a&&/^(TEXTAREA|INPUT)$/.test(a.tagName)&&!a.readOnly&&!!$("#app")?.contains(a);}
// ---------- Aufträge je Kapitel ----------
// Jedes Kapitel hat seinen eigenen Plan- und Schreibauftrag. Dadurch können mehrere Kapitel – auch in
// verschiedenen Büchern – gleichzeitig laufen, ohne sich gegenseitig zu blockieren.
function jobKey(pid,cid){return pid+"::"+cid;}
function jobField(kind){return kind==="plan"?"planJobs":"writeJobs";}
function jobRuntimes(kind){return kind==="plan"?activePlanRuntimes:activeWriteRuntimes;}
function jobMap(p,kind){const k=jobField(kind);if(!p)return {};if(!p[k]||typeof p[k]!=="object"||Array.isArray(p[k]))p[k]={};return p[k];}
function getJob(p,kind,cid){const j=p?.[jobField(kind)]?.[cid];return j&&p.chapters?.some(c=>c.id===cid)?j:null;}
function setJob(p,kind,cid,job){const m=jobMap(p,kind);if(job)m[cid]=job;else delete m[cid];}
function jobRunningHere(kind,pid,cid){return jobRuntimes(kind).has(jobKey(pid,cid));}
function projectRunsJobs(kind,pid){for(const v of jobRuntimes(kind).values())if(v.projectId===pid)return true;return false;}
function projectPlanningActive(p){return !!p&&(!!p.planRunner?.running||projectRunsJobs("plan",p.id));}
function projectWritingActive(p){return !!p&&(!!p.bookWriter?.running||projectRunsJobs("write",p.id));}
function allChapterPlansExpanded(p){return !!p?.chapters?.length&&!p.chapters.some(chapterNeedsPlan);}
function abortRuntimeMapForProject(map,pid){
  let stopped=false;
  for(const runtime of map.values()){
    if(runtime?.projectId!==pid)continue;
    runtime.stopRequested=true;stopped=true;
    try{runtime.abortController?.abort();}catch{}
  }
  return stopped;
}
// Ein Auftrag, der auf „läuft“ steht, auf diesem Gerät aber nicht mehr bearbeitet wird und seit über
// 6 Minuten kein Lebenszeichen gegeben hat, ist hängen geblieben (Seite neu geladen, Handy gesperrt …).
// Er blockiert dann nichts mehr und wird neu gestartet.
const JOB_STALE_MS=6*60*1000;
function jobStale(p,kind,cid){
  const j=getJob(p,kind,cid);if(!j||!["running","interrupted"].includes(j.status)||jobRunningHere(kind,p.id,cid))return false;
  const t=Date.parse(j.heartbeatAt||j.startedAt||"");return !Number.isFinite(t)||Date.now()-t>JOB_STALE_MS;
}
function jobBlocking(p,kind,cid){
  const j=getJob(p,kind,cid);if(!j||!["running","interrupted"].includes(j.status))return false;
  return jobRunningHere(kind,p.id,cid)||(j.status==="running"&&!jobStale(p,kind,cid));
}
function openJobs(p,kind){
  if(!p)return [];
  return Object.entries(p[jobField(kind)]||{}).filter(([cid,j])=>j&&["running","interrupted"].includes(j.status)&&p.chapters?.some(c=>c.id===cid))
    .map(([cid,j])=>({...j,chapterId:cid,status:jobStale(p,kind,cid)?"interrupted":j.status})).sort((a,b)=>(Number(a.chapterNumber)||0)-(Number(b.chapterNumber)||0));
}
function activePlanJob(projectId=state.activeProjectId){
  if(!projectId)return null;const p=projectById(projectId),list=openJobs(p,"plan");
  return list.length?{p,j:list.find(x=>x.status==="running")||list[0],count:list.length}:null;
}
function activeWriteJob(projectId=state.activeProjectId){
  if(!projectId)return null;const p=projectById(projectId),list=openJobs(p,"write");
  return list.length?{p,j:list.find(x=>x.status==="running")||list[0],count:list.length}:null;
}
function save(msg){const p=project(); if(p)p.updatedAt=now(); store.save(); if(msg)toast(msg);}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function countWords(t=""){return (String(t||"").trim().match(/\S+/g)||[]).length;}
function previewText(t="",max=190){
  const clean=String(t||"")
    .replace(/```[\s\S]*?```/g," ")
    .replace(/(^|\s)#{1,6}\s*/g," ")
    .replace(/[>*_`~]/g," ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g,"$1")
    .replace(/\s+/g," ").trim();
  return clean.length>max?clean.slice(0,max).trim()+" …":clean;
}

function loadSyncConfig(){
  // Die Geräte-ID wird dauerhaft gespeichert (auch ohne Cloud-Sync). Vorher bekam jedes Neuladen
  // eine neue ID – ein laufendes „Buch schreiben“ galt danach fälschlich als „auf anderem Gerät aktiv“.
  let cfg={code:"",revision:0,lastSyncedAt:"",dirty:false,deviceId:""};
  try{
    const v=JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY)||"null");
    if(v&&typeof v==="object")cfg={code:"",revision:Number(v.revision)||0,lastSyncedAt:v.lastSyncedAt||"",dirty:!!v.dirty,deviceId:v.deviceId||""};
  }catch{}
  if(!cfg.deviceId){cfg.deviceId=uid()+uid();try{localStorage.setItem(SYNC_CONFIG_KEY,JSON.stringify(cfg));}catch{}}
  return cfg;
}
// Welcher Sync-Stand ist neuer? Maßgeblich ist der Zeitpunkt, den der Server für den letzten Abgleich
// gemeldet hat (nicht die Revisionsnummer – die beginnt nach einem Zurücksetzen der Cloud wieder bei 1).
function syncPointNewer(v,cfg){
  const a=String(v?.lastSyncedAt||""),b=String(cfg?.lastSyncedAt||"");
  if(a&&b)return a>b;
  if(a&&!b)return true;
  return !a&&!b&&Number(v?.revision)>Number(cfg?.revision||0);
}
function saveSyncConfig({allowLower=false}={}){
  try{
    // Ein anderes Fenster kann inzwischen weiter sein: dessen neueren Abgleich nie zurückschreiben.
    if(!allowLower&&syncConfig?.code){const v=JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY)||"null");if(v&&v.code===syncConfig.code&&syncPointNewer(v,syncConfig)){syncConfig.revision=Number(v.revision)||0;syncConfig.lastSyncedAt=v.lastSyncedAt||syncConfig.lastSyncedAt;}}
    localStorage.setItem(SYNC_CONFIG_KEY,JSON.stringify(syncConfig||{}));
  }catch{}
}
function refreshSyncIndicator(){const b=$("#cloudSync");if(!b)return;b.classList.remove("connected","dirty","conflict");const cls=syncConflict?"conflict":syncConfig?.dirty?"dirty":syncConfig?.code?"connected":"";if(cls)b.classList.add(cls);b.title=`Handy & Webseite synchronisieren · ${cloudConfiguredLabel()}`;}
// syncCheckedAt: Beginn der letzten erfolgreichen Cloud-Prüfung. syncGateAt: ab wann eine NEUE Prüfung
// nötig ist (Start, Rückkehr in den Vordergrund, wieder online, Pause des Buchschreibers). Erst danach
// darf ein pausierter Buchschreiber weitermachen – sonst könnte er übersehen, dass ein anderes Gerät
// inzwischen übernommen hat.
var syncEditSeq=0,syncCheckedAt=0,syncGateAt=Date.now(),syncBehind=false;
function requireFreshSyncCheck(){syncGateAt=Date.now();resumeSyncWaits=0;}
// Revision und Stand der Cloud teilen sich alle Fenster dieses Geräts (App und Browser).
function syncConfigFromStorage(){
  if(!syncConfig?.code)return;
  try{
    const v=JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY)||"null");
    if(!v||typeof v!=="object"||v.code!==syncConfig.code)return;
    if(syncPointNewer(v,syncConfig)){syncConfig.revision=Number(v.revision)||0;syncConfig.lastSyncedAt=v.lastSyncedAt||syncConfig.lastSyncedAt;}
    if(v.dirty)syncConfig.dirty=true;
  }catch{}
}
function markSyncDirty(){
  if(!syncConfig?.code||syncApplying||store.readOnly)return;
  syncEditSeq++;
  if(!syncConfig.dirty){syncConfig.dirty=true;saveSyncConfig();refreshSyncIndicator();}
  clearTimeout(syncTimer);syncTimer=setTimeout(()=>autoCloudSync(),2500);
}
function generateSyncCode(){
  const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",buf=new Uint8Array(20);crypto.getRandomValues(buf);
  const raw=[...buf].map(x=>alphabet[x%alphabet.length]).join("");
  return raw.match(/.{1,5}/g).join("-");
}
function normalizeSyncCode(v=""){return String(v).toUpperCase().replace(/[^A-Z2-9]/g,"").match(/.{1,5}/g)?.join("-")||"";}
// Der Cloud-Stand wird komprimiert (gzip) übertragen und gespeichert: etwa dreimal weniger
// Daten und Platz für deutlich größere Bibliotheken. Ältere Browser nutzen automatisch JSON.
function gzipSupported(){return typeof CompressionStream==="function"&&typeof DecompressionStream==="function";}
async function gzipText(text){const stream=new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));return new Uint8Array(await new Response(stream).arrayBuffer());}
async function gunzipText(buffer){const stream=new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));return new Response(stream).text();}
async function syncFetch(options){
  try{return await fetch("/api/sync",{method:"POST",cache:"no-store",...options});}
  catch{throw new Error("Cloud-Sync ist gerade nicht erreichbar.");}
}
async function syncJson(res){
  const data=await res.json().catch(()=>({}));
  if(res.status===409)return {conflict:true,...data};
  if(!res.ok)throw new Error(data.error||(res.status===413?"Der Cloud-Stand ist zu groß für eine Übertragung. Bitte ein JSON-Backup exportieren.":`Cloud-Sync Fehler ${res.status}`));
  return data;
}
async function syncApi(action,payload={}){
  return syncJson(await syncFetch({headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...payload})}));
}
async function syncPush({code,json,baseRevision=0,force=false,deviceId=""}){
  if(gzipSupported()){
    const body=await gzipText(json);
    return syncJson(await syncFetch({headers:{"Content-Type":"application/octet-stream","X-Sync-Code":code,"X-Base-Revision":String(Number(baseRevision)||0),"X-Force":force?"1":"0","X-Device-Id":String(deviceId||"").replace(/[^\w-]/g,"").slice(0,80)},body}));
  }
  const body=`{"action":"push","code":${JSON.stringify(code)},"baseRevision":${Number(baseRevision)||0},"force":${force?"true":"false"},"deviceId":${JSON.stringify(String(deviceId||""))},"state":${json}}`;
  return syncJson(await syncFetch({headers:{"Content-Type":"application/json"},body}));
}
async function syncPull(code){
  if(!gzipSupported())return syncApi("pull",{code});
  const res=await syncFetch({headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"pull",code,gz:true})});
  if(res.ok&&(res.headers.get("content-type")||"").includes("application/octet-stream")){
    const text=await gunzipText(await res.arrayBuffer());
    return {exists:true,revision:Number(res.headers.get("x-sync-revision"))||0,updatedAt:res.headers.get("x-sync-updated-at")||"",state:JSON.parse(text)};
  }
  return syncJson(res);
}
function cloudConfiguredLabel(){
  if(syncConflict)return "Konflikt";
  if(!syncConfig?.code)return "nicht verbunden";
  if(syncConfig.dirty)return "lokale Änderungen";
  return syncConfig.lastSyncedAt?`zuletzt ${new Date(syncConfig.lastSyncedAt).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}`:"verbunden";
}
async function pushCloud({force=false,manual=false}={}){
  if(!syncConfig?.code||syncInFlight||store.readOnly)return false;
  syncInFlight=true;
  const checkStart=Date.now();
  try{
    // Erst lokal sichern (dabei Änderungen anderer Fenster einarbeiten), dann genau diesen Stand hochladen.
    await store.settle();
    syncConfigFromStorage();
    const seq=syncEditSeq;
    const json=JSON.stringify({projects:state.projects||[],series:state.series||[],editionGroups:state.editionGroups||[]});
    const out=await syncPush({code:syncConfig.code,json,baseRevision:Number(syncConfig.revision)||0,force,deviceId:syncConfig.deviceId});
    if(out.conflict){syncConflict=out.cloud||{exists:true};refreshSyncIndicator();if(manual)showSyncConflict();else toast("Cloud-Sync pausiert: Auf einem anderen Gerät gibt es neuere Änderungen. Tippe auf die Wolke, um zu entscheiden.",6000);return false;}
    syncConflict=null;syncConfig.revision=Number(out.revision)||syncConfig.revision;syncConfig.lastSyncedAt=out.updatedAt||now();
    // Änderungen, die während der Übertragung entstanden sind, bleiben markiert und werden gleich nachgeschickt.
    syncConfig.dirty=seq!==syncEditSeq;syncBehind=false;syncCheckedAt=Math.max(syncCheckedAt,checkStart);
    saveSyncConfig();refreshSyncIndicator();
    if(syncConfig.dirty){clearTimeout(syncTimer);syncTimer=setTimeout(()=>autoCloudSync(),2500);}
    if(manual)toast("Cloud-Sync abgeschlossen");
    return true;
  }finally{syncInFlight=false;}
}
function hasMeaningfulLocalProjects(){return Array.isArray(state.projects)&&state.projects.length>0;}
function applyCloudState(cloud,{keepView=true}={}){
  if(!cloud?.state||!Array.isArray(cloud.state.projects))throw new Error("Der Cloud-Stand ist ungültig.");
  if(activeRuntimeCount())throw new Error("Gerade arbeitet noch eine KI-Aufgabe. Bitte warte, bis sie fertig ist, und lade den Cloud-Stand danach.");
  const oldProject=state.activeProjectId,oldChapter=state.activeChapterId,oldTab=state.activeTab;
  syncApplying=true;
  try{
    // Vorhandene Buch-/Kapitelobjekte bleiben erhalten (nur ihr Inhalt wird ersetzt): Kleine KI-Aktionen,
    // die gerade auf eine Antwort warten, legen ihr Ergebnis so trotzdem im richtigen Buch ab.
    if(!Array.isArray(state.projects))state.projects=[];
    if(!Array.isArray(state.series))state.series=[];
    if(!Array.isArray(state.editionGroups))state.editionGroups=[];
    replaceInPlace(state.projects,cloud.state.projects.filter(p=>p&&typeof p==="object"));
    // Stände älterer Versionen kennen noch keine Buchreihen/Fassungsgruppen: dann die hiesige Zuordnung behalten.
    if(Array.isArray(cloud.state.series))state.series=replaceInPlace(state.series,cloud.state.series.filter(x=>x&&typeof x==="object"));
    if(Array.isArray(cloud.state.editionGroups))state.editionGroups=replaceInPlace(state.editionGroups,cloud.state.editionGroups.filter(x=>x&&typeof x==="object"));
    state.projects=state.projects.map(ensureProjectShape).filter(Boolean);
    state.series=state.series.map(ensureSeriesShape).filter(Boolean);
    state.editionGroups=state.editionGroups.map(ensureEditionGroupShape).filter(Boolean);
    const same=state.projects.find(p=>p.id===oldProject);
    state.activeProjectId=keepView&&same?same.id:null;
    state.activeTab=keepView&&same?oldTab:"studio";
    state.activeChapterId=keepView&&same&&same.chapters?.some(c=>c.id===oldChapter)?oldChapter:(same?.chapters?.[0]?.id||null);
    migrateState();
    syncConfig.revision=Number(cloud.revision)||0;syncConfig.lastSyncedAt=cloud.updatedAt||now();syncConfig.dirty=false;syncEditSeq++;saveSyncConfig();
  }finally{syncApplying=false;}
  store.flush();
  render();
}
async function pullCloud({manual=false,allowReplace=false}={}){
  if(!syncConfig?.code||syncInFlight||(store.readOnly&&!store.viewOnly))return false;
  syncInFlight=true;
  const checkStart=Date.now();
  try{
    syncConfigFromStorage();
    const out=await syncPull(syncConfig.code);
    if(!out.exists){if(manual)toast("Für diesen Sync-Code liegt noch kein Cloud-Stand vor.");return false;}
    if(Number(out.revision)<=Number(syncConfig.revision)&&!manual){syncBehind=false;syncCheckedAt=Math.max(syncCheckedAt,checkStart);return true;}
    if(syncConfig.dirty&&!allowReplace){syncConflict=out;refreshSyncIndicator();showSyncConflict();return false;}
    if(hasMeaningfulLocalProjects()&&Number(syncConfig.revision)===0&&!allowReplace){
      syncConflict=out;showInitialCloudChoice();return false;
    }
    applyCloudState(out);syncConflict=null;syncBehind=false;syncCheckedAt=Math.max(syncCheckedAt,checkStart);refreshSyncIndicator();if(manual)toast("Cloud-Stand geladen");return true;
  }finally{syncInFlight=false;}
}
async function autoCloudSync(){
  // Konflikte entscheidet immer die Autorin selbst (Wolken-Symbol); bis dahin wird nichts überschrieben.
  if(!syncConfig?.code||syncInFlight||syncConflict||store.readOnly)return;
  // Immer nur ein Fenster dieses Geräts gleichzeitig synchronisieren lassen.
  if(navigator.locks?.request){
    try{await navigator.locks.request("story-studio:sync",{ifAvailable:true},async lock=>{if(lock)await autoCloudSyncInner();});}catch{}
    return;
  }
  await autoCloudSyncInner();
}
async function autoCloudSyncInner(){
  if(!syncConfig?.code||syncInFlight||syncConflict||store.readOnly)return;
  try{
    syncConfigFromStorage();
    if(syncConfig.dirty){await pushCloud();return;}
    // Erst nur die kleine Revisionsnummer abfragen; den ganzen Stand nur laden, wenn es wirklich Neues gibt.
    const checkStart=Date.now();
    const st=await syncApi("status",{code:syncConfig.code});
    syncConfigFromStorage();
    const newer=!!st?.exists&&Number(st.revision)>Number(syncConfig.revision||0);
    // Cloud-Speicher wurde geleert: diesen Stand wieder hochladen (die Prüfung im Server verhindert Überschreiben).
    if(st&&!st.exists&&Number(syncConfig.revision)>0&&hasMeaningfulLocalProjects()){syncConfig.dirty=true;saveSyncConfig();await pushCloud();return;}
    // Cloud wurde zurückgesetzt und inzwischen neu befüllt: nicht raten, sondern die Autorin entscheiden lassen.
    // (Nur wenn die Cloud NACH dem letzten Abgleich geändert wurde – eine leicht veraltete Antwort löst nichts aus.)
    if(st?.exists&&Number(st.revision)<Number(syncConfig.revision||0)&&String(st.updatedAt||"")>String(syncConfig.lastSyncedAt||"")){syncConflict={exists:true,revision:Number(st.revision)||0,updatedAt:st.updatedAt||""};refreshSyncIndicator();toast("Cloud-Sync pausiert: Der Cloud-Stand wurde zurückgesetzt. Tippe auf die Wolke, um zu entscheiden.",6000);return;}
    if(!newer){syncBehind=false;syncCheckedAt=Math.max(syncCheckedAt,checkStart);return;}
    // Laufende große KI-Aufträge nie durch einen fremden Stand ersetzen – später erneut prüfen.
    syncBehind=true;
    if(!syncConfig.dirty&&!activeRuntimeCount())await pullCloud();
  }catch(e){/* lokal weiterarbeiten; manueller Sync zeigt Details */}
}
async function loadCloudStateNow(c){
  try{
    if(c?.state){applyCloudState(c);syncConflict=null;refreshSyncIndicator();toast("Cloud-Stand übernommen");return;}
    const previous=syncConflict;syncConflict=null;
    const ok=await pullCloud({manual:true,allowReplace:true});
    if(!ok&&!syncConflict)syncConflict=previous;
    refreshSyncIndicator();
  }catch(e){toast(e.message||"Cloud-Stand konnte nicht geladen werden.",6000);refreshSyncIndicator();}
}
async function keepLocalAndPush(rev){
  try{syncConfig.revision=Number(rev)||0;syncConfig.dirty=true;syncConflict=null;saveSyncConfig();await pushCloud({force:true,manual:true});}
  catch(e){toast(e.message||"Cloud-Sync fehlgeschlagen.",6000);}
  refreshSyncIndicator();
}
function showInitialCloudChoice(){
  if(!syncConflict)return;
  modal(`<h2>Cloud-Sync verbinden</h2><p>Unter diesem Code liegt bereits ein Litterum-Stand. Auf diesem Gerät sind ebenfalls Projekte vorhanden.</p><p class="small muted">Damit nichts überschrieben wird, wählst du ausdrücklich, welcher Stand zuerst gelten soll.</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="soft-btn" id="useLocalCloud">Diesen Geräte-Stand hochladen</button><button class="primary-btn" id="useCloudLocal">Cloud-Stand laden</button></div>`);
  $("#useCloudLocal").onclick=()=>{const c=syncConflict;closeModal();loadCloudStateNow(c);};
  $("#useLocalCloud").onclick=()=>{const rev=syncConflict?.revision;closeModal();keepLocalAndPush(rev);};
}
function showSyncConflict(){
  if(!syncConflict)return;
  if($("#modalBackdrop")){toast("Cloud-Sync-Konflikt erkannt. Öffne danach das Wolken-Symbol.");return;}
  modal(`<h2>Änderungen auf zwei Geräten</h2><p>Handy und Webseite wurden seit dem letzten Sync verändert. Litterum überschreibt deshalb nichts automatisch.</p><div class="card" style="padding:13px"><div class="small muted">Cloud-Version</div><strong>${syncConflict.updatedAt?new Date(syncConflict.updatedAt).toLocaleString("de-DE"):"vorhanden"}</strong></div><p class="small muted">Tipp: Wenn du unsicher bist, sichere vorher unter Export ein JSON-Backup dieses Geräts.</p><div class="modal-actions"><button class="ghost-btn" data-close>Später</button><button class="soft-btn" id="keepLocalSync">Diesen Stand behalten</button><button class="primary-btn" id="loadCloudSync">Cloud-Stand laden</button></div>`);
  $("#loadCloudSync").onclick=()=>{const c=syncConflict;closeModal();loadCloudStateNow(c);};
  $("#keepLocalSync").onclick=()=>{const rev=syncConflict?.revision;closeModal();keepLocalAndPush(rev);};
}
async function openCloudSync(){
  if(syncConflict&&syncConfig?.code)return showSyncConflict();
  let health={configured:false};try{health=await syncApi("health");}catch(e){return modal(`<h2>Cloud-Sync</h2><p class="warning">${esc(e.message)}</p><div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button></div>`);}
  if(!health.configured){
    return modal(`<h2>Cloud-Sync</h2><p>Die App ist für die Synchronisierung vorbereitet. In Vercel muss nur noch ein Upstash-Redis-Speicher mit diesem Projekt verbunden werden.</p><div class="card" style="padding:13px"><strong>Vercel → Storage / Marketplace → Upstash Redis</strong><div class="small muted" style="margin-top:5px">Danach Litterum einmal neu deployen. Deine lokalen Bücher bleiben dabei unverändert.</div></div><div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button></div>`);
  }
  const connected=!!syncConfig?.code;
  modal(`<h2>Handy & Webseite synchronisieren</h2><p class="small muted">Deine Bücher bleiben lokal gespeichert und werden zusätzlich über einen privaten, langen Sync-Code in der Cloud abgelegt.</p>${connected?`<div class="card sync-status-card"><div><div class="small muted">Status</div><strong>${esc(cloudConfiguredLabel())}</strong></div><span class="sync-ok">☁</span></div><div class="field"><label>Dein Sync-Code</label><input class="input" id="syncCodeView" value="${esc(syncConfig.code)}" readonly></div><div class="sync-actions"><button class="soft-btn" id="copySyncCode">Code kopieren</button><button class="primary-btn" id="syncNow">Jetzt synchronisieren</button><button class="ghost-btn" id="disconnectSync">Auf diesem Gerät trennen</button></div>`:`<button class="primary-btn" id="createSync">Neuen Sync-Code erstellen und diesen Geräte-Stand sichern</button><div class="sync-divider"><span>oder</span></div><div class="field"><label>Vorhandenen Sync-Code vom anderen Gerät</label><input class="input" id="existingSyncCode" placeholder="ABCDE-FGHIJ-KLMNO-PQRST"></div><button class="soft-btn" id="connectSync">Mit Cloud verbinden</button>`}<div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button></div>`);
  $("#createSync")?.addEventListener("click",async e=>{
    e.currentTarget.disabled=true;
    syncConfig.code=generateSyncCode();syncConfig.revision=0;syncConfig.dirty=true;saveSyncConfig();
    let ok=false;try{ok=await pushCloud({force:true,manual:true});}catch(err){toast(err.message||"Cloud-Sync fehlgeschlagen.",6000);}
    closeModal();
    if(ok){await openCloudSync();toast("Sync-Code erstellt. Kopiere ihn anschließend auf den PC.");}
    else{syncConfig.code="";syncConfig.dirty=false;saveSyncConfig();refreshSyncIndicator();}
  });
  $("#connectSync")?.addEventListener("click",async()=>{const code=normalizeSyncCode($("#existingSyncCode").value);if(code.replace(/-/g,"").length<16)return toast("Der Sync-Code ist zu kurz.");syncConfig.code=code;syncConfig.revision=0;syncConfig.dirty=false;syncConflict=null;saveSyncConfig();closeModal();try{await pullCloud({manual:true});}catch(err){toast(err.message||"Cloud-Sync fehlgeschlagen.",6000);}refreshSyncIndicator();});
  $("#copySyncCode")?.addEventListener("click",async()=>{await copyToClipboard(syncConfig.code);toast("Sync-Code kopiert");});
  $("#syncNow")?.addEventListener("click",async()=>{closeModal();try{if(syncConfig.dirty)await pushCloud({manual:true});else await pullCloud({manual:true});}catch(err){toast(err.message||"Cloud-Sync fehlgeschlagen.",6000);}refreshSyncIndicator();});
  $("#disconnectSync")?.addEventListener("click",()=>{syncConfig={code:"",revision:0,lastSyncedAt:"",dirty:false,deviceId:syncConfig.deviceId||uid()};syncConflict=null;saveSyncConfig();closeModal();toast("Cloud-Sync auf diesem Gerät getrennt. Lokale Bücher bleiben erhalten.");render();});
}
async function copyToClipboard(text){
  const value=String(text??"");
  try{await navigator.clipboard.writeText(value);return true;}catch{}
  const ta=document.createElement("textarea");
  ta.value=value;
  ta.setAttribute("readonly","");
  ta.setAttribute("aria-hidden","true");
  ta.style.position="fixed";ta.style.left="-10000px";ta.style.top="0";ta.style.opacity="0";
  document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);
  const ok=document.execCommand("copy");ta.remove();return ok;
}
async function copyExactText(text,label="Text"){
  const value=String(text??"").trimEnd();
  if(!value.trim())return toast("Hier ist noch kein Text zum Kopieren.");
  const ok=await copyToClipboard(value);
  toast(ok?`${label} kopiert`:"Kopieren war nicht möglich.");
  return ok;
}
async function shareText(title,text){
  if(navigator.share){try{await navigator.share({title,text});return true;}catch(e){if(e?.name==="AbortError")return false;}}
  await copyToClipboard(text);toast("Teilen wird hier nicht unterstützt. Text wurde kopiert.");return false;
}
let toastTimer=null;
function toast(t,ms){
  const el=$("#toast");if(!el)return;
  el.textContent=t;el.classList.add("show");clearTimeout(toastTimer);
  // Längere Hinweise bleiben länger sichtbar, damit sie auch gelesen werden können.
  const duration=Number(ms)||Math.min(7000,Math.max(1800,String(t||"").length*55));
  toastTimer=setTimeout(()=>el.classList.remove("show"),duration);
}


const VOICE_PREF_KEY="story-studio-elevenlabs-voice-v1";
function rememberedVoice(){
  try{
    const v=JSON.parse(localStorage.getItem(VOICE_PREF_KEY)||"null");
    return v&&v.id?{id:String(v.id),name:String(v.name||"")}:{id:"",name:""};
  }catch{return {id:"",name:""};}
}
function rememberVoice(id,name=""){
  if(!id)return;
  try{localStorage.setItem(VOICE_PREF_KEY,JSON.stringify({id:String(id),name:String(name||"")}));}catch{}
}
function ensureProjectVoice(p=project()){
  if(!p)return {id:"",name:""};
  p.tts ||= {};
  const global=rememberedVoice();
  if(!p.tts.voice && global.id){
    p.tts.voice=global.id;
    p.tts.voiceName=global.name||p.tts.voiceName||"";
    try{store.save({sync:false});}catch{}
  }
  return {id:p.tts.voice||global.id||"",name:p.tts.voiceName||global.name||""};
}

const ttsState={queue:[],index:0,active:false,paused:false,audio:null,url:null,run:0,currentGeneratedRate:1,meta:null,pendingSeekFraction:null,settings:null,loading:false,status:"",cached:new Map(),requests:new Map(),controllers:new Set()};
let geminiReadConsent=false;
const GEMINI_TTS_VOICES=[
  ["Sulafat","Sulafat · Warm"],["Algieba","Algieba · Sanft"],["Gacrux","Gacrux · Reif"],["Achernar","Achernar · Weich"],
  ["Enceladus","Enceladus · Luftig"],["Algenib","Algenib · Rau"],["Charon","Charon · Sachlich"],["Kore","Kore · Bestimmt"],
  ["Aoede","Aoede · Leicht"],["Puck","Puck · Lebhaft"]
];
const dictState={recognizer:null,target:null,button:null,active:false,manualStop:false};
function splitForSpeech(text,max=3600){
  const clean=String(text||"").replace(/\s+/g," ").trim();if(!clean)return [];
  const sentences=clean.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)||[clean];
  const chunks=[];let cur="";
  for(const s0 of sentences){const s=s0.trim();if(!s)continue;if((cur+" "+s).trim().length<=max){cur=(cur+" "+s).trim();continue;}if(cur)chunks.push(cur);if(s.length<=max){cur=s;continue;}for(let i=0;i<s.length;i+=max)chunks.push(s.slice(i,i+max));cur="";}
  if(cur)chunks.push(cur);return chunks;
}

function mediaTitle(){
  const p=project(),c=chapter();
  return ttsState.meta?.title || (c?.title ? `${p?.title||"Litterum"} · ${c.title}` : (p?.title||"Litterum"));
}
function mediaSubtitle(){
  const p=project();
  const voice=p?.tts?.voiceName ? ` · ${p.tts.voiceName}` : "";
  return `Litterum · ${p?.tts?.provider==="gemini"?"Gemini": "ElevenLabs"}${p?.tts?.provider==="gemini"?" · "+(p?.tts?.geminiVoice||"Sulafat"):voice}`;
}
function estimatedChunkSeconds(text){
  const words=countWords(text||"");
  const rate=Math.max(.75,Number(project()?.tts?.rate||1.15));
  return Math.max(2,(words/(155*rate))*60);
}
function estimatedTotalSeconds(){
  return (ttsState.queue||[]).reduce((n,t)=>n+estimatedChunkSeconds(t),0);
}
function estimatedCurrentSeconds(){
  let n=0;
  for(let i=0;i<ttsState.index;i++) n+=estimatedChunkSeconds(ttsState.queue[i]);
  const est=estimatedChunkSeconds(ttsState.queue[ttsState.index]||"");
  const a=ttsState.audio;
  if(a && Number.isFinite(a.duration) && a.duration>0 && Number.isFinite(a.currentTime)){
    n += est*Math.max(0,Math.min(1,a.currentTime/a.duration));
  }
  return n;
}
function setMediaMetadata(){
  if(!("mediaSession" in navigator))return;
  try{
    navigator.mediaSession.metadata=new MediaMetadata({
      title:mediaTitle(),
      artist:mediaSubtitle(),
      album:"KI-Vorlesen",
      artwork:[
        {src:"/icon.svg",sizes:"512x512",type:"image/svg+xml"},
        {src:"/icon.svg",sizes:"192x192",type:"image/svg+xml"}
      ]
    });
  }catch{}
}
function updateMediaPlaybackState(){
  if(!("mediaSession" in navigator))return;
  try{
    navigator.mediaSession.playbackState=!ttsState.active?"none":(ttsState.paused||ttsState.audio?.paused?"paused":"playing");
  }catch{}
  updateMediaPosition();
}
function updateMediaPosition(){
  if(!("mediaSession" in navigator) || !ttsState.audio)return;
  const a=ttsState.audio;
  if(!Number.isFinite(a.duration)||a.duration<=0||!Number.isFinite(a.currentTime))return;
  try{
    navigator.mediaSession.setPositionState({
      duration:Math.max(.01,a.duration),
      playbackRate:Math.max(.5,Math.min(2,a.playbackRate||1)),
      position:Math.max(0,Math.min(a.duration,a.currentTime))
    });
  }catch{}
}
function updateTtsStatus(message){
  ttsState.status=String(message||"");
  document.querySelectorAll("[data-tts-status]").forEach(el=>{el.textContent=ttsState.status;});
}
function abortTtsRequests(){
  for(const controller of ttsState.controllers){try{controller.abort()}catch{}}
  ttsState.controllers.clear();ttsState.requests.clear();ttsState.cached.clear();
}
function releaseTtsSource(dropPlayer=false){
  const audio=ttsState.audio;
  if(audio){
    if(dropPlayer){
      audio.onended=null;audio.onerror=null;audio.ontimeupdate=null;audio.onplay=null;audio.onpause=null;
      try{audio.pause()}catch{}
      try{audio.removeAttribute("src");audio.load()}catch{}
      ttsState.audio=null;
    }
  }
  if(ttsState.url){try{URL.revokeObjectURL(ttsState.url)}catch{}ttsState.url=null;}
}
function cleanupTtsAudio(){
  releaseTtsSource(true);updateMediaPlaybackState();
}
function stopSpeech(silent=false){
  ttsState.run++;ttsState.active=false;ttsState.paused=false;ttsState.loading=false;ttsState.queue=[];ttsState.index=0;
  ttsState.pendingSeekFraction=null;ttsState.meta=null;ttsState.settings=null;
  abortTtsRequests();cleanupTtsAudio();updateTtsStatus("");
  if(!silent)toast("KI-Vorlesen gestoppt");
}
async function fetchTtsBlob(text,run,controller){
  const cfg=ttsState.settings||{},provider=cfg.provider||"elevenlabs";
  const chosen=provider==="gemini"?{id:cfg.geminiVoice||"Sulafat"}:{id:cfg.voice||""};
  if(!chosen.id)throw new Error("Bitte zuerst eine Vorlesestimme auswählen.");
  let savedAssistantAccess="";try{savedAssistantAccess=localStorage.getItem("litterum-assistant-access-v1")||sessionStorage.getItem("litterum-assistant-access")||"";}catch{}
  const accessToken=provider==="gemini"?savedAssistantAccess:"";
  if(provider==="gemini"&&!accessToken)throw new Error("Bitte zuerst im Litterum Assistenten deinen privaten Zugangscode speichern.");
  const res=await fetch("/api/tts",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({
    text,provider,voice:chosen.id,speed:Number(cfg.rate||1.15),instructions:cfg.instructions||"",accessToken
  })});
  if(run!==ttsState.run)throw new DOMException("Abgebrochen","AbortError");
  if(!res.ok){let msg="KI-Stimme konnte nicht erzeugt werden";try{const d=await res.json();if(d?.error)msg=d.error;}catch{}throw new Error(msg);}
  const blob=await res.blob();
  if(run!==ttsState.run)throw new DOMException("Abgebrochen","AbortError");
  if(!blob.size)throw new Error("Gemini hat einen leeren Audioabschnitt zurückgegeben.");
  return blob;
}
// Nur den nächsten Abschnitt vorladen. So wird das kostenlose Kontingent nicht
// durch unkontrollierte parallele Anfragen für ein ganzes Buch aufgebraucht.
function prepareTtsChunk(index,run){
  if(!ttsState.active||run!==ttsState.run||index<0||index>=ttsState.queue.length)
    return Promise.reject(new DOMException("Abgebrochen","AbortError"));
  if(ttsState.cached.has(index))return Promise.resolve(ttsState.cached.get(index));
  if(ttsState.requests.has(index))return ttsState.requests.get(index);
  const controller=new AbortController();ttsState.controllers.add(controller);
  const request=fetchTtsBlob(ttsState.queue[index],run,controller)
    .then(blob=>{if(run===ttsState.run&&ttsState.active)ttsState.cached.set(index,blob);return blob;})
    .finally(()=>{ttsState.controllers.delete(controller);if(ttsState.requests.get(index)===request)ttsState.requests.delete(index);});
  ttsState.requests.set(index,request);
  return request;
}
async function seekNarration(offsetSeconds){
  if(!ttsState.active||!ttsState.queue.length)return;
  const total=estimatedTotalSeconds(),current=estimatedCurrentSeconds();
  const target=Math.max(0,Math.min(total,current+Number(offsetSeconds||0)));
  let acc=0,targetIndex=0,fraction=0;
  for(let i=0;i<ttsState.queue.length;i++){
    const d=estimatedChunkSeconds(ttsState.queue[i]);
    if(target<=acc+d||i===ttsState.queue.length-1){targetIndex=i;fraction=d?Math.max(0,Math.min(1,(target-acc)/d)):0;break;}
    acc+=d;
  }
  if(targetIndex===ttsState.index&&ttsState.audio&&!ttsState.loading&&Number.isFinite(ttsState.audio.duration)){
    ttsState.audio.currentTime=Math.max(0,Math.min(ttsState.audio.duration,ttsState.audio.duration*fraction));
    updateMediaPosition();return;
  }
  // Alte Antworten duerfen nach einem Sprung keinen bereits gewaehlten Abschnitt ueberschreiben.
  ttsState.run++;abortTtsRequests();
  try{ttsState.audio?.pause()}catch{}
  releaseTtsSource(false);
  ttsState.index=targetIndex;ttsState.pendingSeekFraction=fraction;ttsState.paused=false;
  await speakNext(ttsState.run);
}
function mediaPlay(){
  if(!ttsState.active)return;
  ttsState.paused=false;
  if(ttsState.loading){updateTtsStatus(`Bereite Abschnitt ${ttsState.index+1} von ${ttsState.queue.length} vor …`);return;}
  if(ttsState.audio?.paused){
    ttsState.audio.play().catch(()=>{ttsState.paused=true;updateTtsStatus("Tippe auf Pause / weiter, um das Hörbuch fortzusetzen.");});
  }
  updateMediaPlaybackState();
}
function mediaPause(){
  if(!ttsState.active)return;
  ttsState.paused=true;
  if(ttsState.audio&&!ttsState.loading)ttsState.audio.pause();
  updateTtsStatus("Vorlesen pausiert");updateMediaPlaybackState();
}
function initMediaSession(){
  if(!("mediaSession" in navigator))return;
  const safe=(name,fn)=>{try{navigator.mediaSession.setActionHandler(name,fn)}catch{}};
  safe("play",mediaPlay);
  safe("pause",mediaPause);
  safe("stop",()=>stopSpeech());
  safe("seekbackward",e=>seekNarration(-(e.seekOffset||10)));
  safe("seekforward",e=>seekNarration(e.seekOffset||10));
  safe("previoustrack",()=>seekNarration(-10));
  safe("nexttrack",()=>seekNarration(10));
  safe("seekto",e=>{
    const a=ttsState.audio;
    if(!a||!Number.isFinite(a.duration))return;
    const t=Math.max(0,Math.min(a.duration,Number(e.seekTime||0)));
    a.currentTime=t;updateMediaPosition();
  });
}
function finishSpeech(run){
  if(run!==ttsState.run)return;
  ttsState.active=false;ttsState.paused=false;ttsState.loading=false;
  abortTtsRequests();cleanupTtsAudio();updateTtsStatus("Vorlesen beendet");toast("Vorlesen beendet",5000);
}
async function speakNext(run){
  if(!ttsState.active||run!==ttsState.run)return;
  if(ttsState.index>=ttsState.queue.length)return finishSpeech(run);
  const index=ttsState.index,total=ttsState.queue.length,cfg=ttsState.settings||{},requested=Number(cfg.rate||1.15);
  ttsState.loading=true;
  updateTtsStatus(`Bereite Abschnitt ${index+1} von ${total} vor …`);
  try{
    const blob=await prepareTtsChunk(index,run);
    if(!ttsState.active||run!==ttsState.run||ttsState.index!==index)return;
    ttsState.cached.delete(index);
    // Der Folgeabschnitt entsteht waehrend der aktuelle abgespielt wird.
    if(index+1<total)prepareTtsChunk(index+1,run).catch(()=>{});
    let audio=ttsState.audio;
    if(!audio){audio=new Audio();audio.preload="auto";ttsState.audio=audio;}
    const previousUrl=ttsState.url;
    const url=URL.createObjectURL(blob);ttsState.url=url;
    audio.onended=()=>{
      if(run!==ttsState.run||!ttsState.active||ttsState.index!==index)return;
      ttsState.index=index+1;ttsState.pendingSeekFraction=null;
      if(ttsState.index>=ttsState.queue.length)finishSpeech(run);
      else speakNext(run);
    };
    audio.onerror=()=>{
      if(run!==ttsState.run||!ttsState.active)return;
      ttsState.active=false;ttsState.loading=false;abortTtsRequests();cleanupTtsAudio();
      updateTtsStatus("Audiofehler. Bitte das Vorlesen erneut starten.");toast("Audio konnte nicht abgespielt werden",9500);
    };
    audio.ontimeupdate=()=>updateMediaPosition();
    audio.onplay=()=>{if(run===ttsState.run){ttsState.paused=false;updateMediaPlaybackState();}};
    audio.onpause=()=>{if(run===ttsState.run&&!ttsState.loading){ttsState.paused=true;updateMediaPlaybackState();}};
    audio.src=url;
    if(previousUrl)try{URL.revokeObjectURL(previousUrl)}catch{}
    const generatedRate=cfg.provider==="elevenlabs"?Math.min(1.2,Math.max(.7,requested)):1;
    ttsState.currentGeneratedRate=generatedRate;
    audio.playbackRate=Math.max(.5,Math.min(2,requested/generatedRate));
    audio.preservesPitch=true;
    setMediaMetadata();
    await new Promise(resolve=>{
      if(audio.readyState>=1)return resolve();
      audio.addEventListener("loadedmetadata",resolve,{once:true});
      setTimeout(resolve,1200);
    });
    if(!ttsState.active||run!==ttsState.run||ttsState.index!==index)return;
    if(ttsState.pendingSeekFraction!=null&&Number.isFinite(audio.duration)&&audio.duration>0){
      audio.currentTime=Math.max(0,Math.min(audio.duration,audio.duration*ttsState.pendingSeekFraction));
      ttsState.pendingSeekFraction=null;
    }
    ttsState.loading=false;
    if(ttsState.paused){updateTtsStatus(`Abschnitt ${index+1} von ${total} bereit · pausiert`);return;}
    try{
      await audio.play();
      updateTtsStatus(`Lese Abschnitt ${index+1} von ${total} vor`);
      updateMediaPlaybackState();
    }catch(e){
      if(e?.name==="NotAllowedError"){
        ttsState.paused=true;
        updateTtsStatus(`Abschnitt ${index+1} von ${total} bereit · Zum Fortsetzen Pause / weiter tippen`);
        toast("Der Browser wartet auf deine Freigabe. Tippe auf Pause / weiter.",9500);
        return;
      }
      throw e;
    }
  }catch(e){
    if(e?.name==="AbortError"||run!==ttsState.run)return;
    ttsState.active=false;ttsState.loading=false;abortTtsRequests();cleanupTtsAudio();
    const msg=e.message||"KI-Vorlesen fehlgeschlagen";
    updateTtsStatus(`Vorlesen unterbrochen bei Abschnitt ${index+1}/${total}: ${msg}`);
    toast(`Vorlesen unterbrochen: ${msg}`,10000);
  }
}
function speakText(text,meta={}){
  const cfg=project()?.tts||{};
  const chunks=splitForSpeech(text,cfg.provider==="gemini"?850:3600);
  if(!chunks.length)return toast("Kein Text zum Vorlesen.");
  if(cfg.provider==="gemini"&&!geminiReadConsent){
    const ok=window.confirm("Gemini-Vorlesen: Der ausgewählte Text wird an Google zur Spracherzeugung gesendet. Beim kostenlosen Tarif darf Google die Eingaben zur Produktverbesserung verwenden. Nur fortfahren, wenn du damit einverstanden bist. Mit OK stimmst du für diese geöffnete App-Sitzung zu. Mit Abbrechen wird nichts gesendet.");
    if(!ok)return;
    geminiReadConsent=true;
  }
  stopSpeech(true);
  const chosen=cfg.provider==="gemini"?{id:cfg.geminiVoice||"Sulafat"}:ensureProjectVoice(project());
  ttsState.settings={provider:cfg.provider==="gemini"?"gemini":"elevenlabs",geminiVoice:cfg.geminiVoice||"Sulafat",voice:chosen.id,rate:Number(cfg.rate||1.15),instructions:cfg.instructions||""};
  ttsState.queue=chunks;ttsState.index=0;ttsState.active=true;ttsState.paused=false;ttsState.meta=meta||{};
  const run=ttsState.run;setMediaMetadata();updateMediaPlaybackState();
  speakNext(run);toast(`KI-Vorlesen gestartet · ${Number(cfg.rate||1.15).toFixed(2)}×`);
}
function toggleSpeechPause(){
  if(!ttsState.active)return toast("Es wird gerade nichts vorgelesen.");
  if(ttsState.paused||(!ttsState.loading&&ttsState.audio?.paused)){
    mediaPlay();toast(ttsState.loading?"Nächster Abschnitt wird vorbereitet …":"Vorlesen fortgesetzt");
  }else{mediaPause();toast("Vorlesen pausiert");}
}
function readManuscript(){const el=$("#chapterContent");if(!el)return;const selected=el.selectionStart!==el.selectionEnd?el.value.slice(el.selectionStart,el.selectionEnd):"";const c=chapter(),p=project();speakText(selected||el.value,{title:c?`${p?.title||"Litterum"} · Kapitel ${c.number}: ${c.title}`:(p?.title||"Litterum")});}
function setQuickRate(value){
  const p=project();if(!p)return;p.tts.rate=Number(value)||1.15;save(`Vorlesetempo ${p.tts.rate.toFixed(2)}×`);
  if(ttsState.settings)ttsState.settings.rate=p.tts.rate;
  if(ttsState.audio){const gen=ttsState.currentGeneratedRate||1;ttsState.audio.playbackRate=Math.max(.5,Math.min(2,p.tts.rate/gen));}
}
function selectedOrAll(el){if(!el)return "";if(typeof el.selectionStart==="number"&&el.selectionStart!==el.selectionEnd)return el.value.slice(el.selectionStart,el.selectionEnd);return el.value||"";}
function recognitionAvailable(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
function insertDictatedText(el,text){
  if(!el||!text)return;
  const start=typeof el.selectionStart==="number"?el.selectionStart:el.value.length;
  const end=typeof el.selectionEnd==="number"?el.selectionEnd:start;
  const before=el.value.slice(0,start), after=el.value.slice(end);
  const needsSpace=before && !/[\s\n]$/.test(before) && !/^[,.;:!?)]/.test(text);
  const addition=(needsSpace?" ":"")+text.trim();
  el.value=before+addition+after;
  const pos=(before+addition).length;
  try{el.setSelectionRange(pos,pos)}catch{}
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.focus();
}
function stopDictation(silent=false){
  dictState.manualStop=true;dictState.active=false;
  try{dictState.recognizer?.stop()}catch{}
  dictState.button?.classList.remove("recording");
  if(dictState.button)dictState.button.innerHTML="🎙 Diktieren";
  dictState.recognizer=null;dictState.target=null;dictState.button=null;
  if(!silent)toast("Diktieren beendet");
}
function startDictation(el,button){
  if(!recognitionAvailable())return toast("Direktes Diktieren wird von diesem Browser nicht unterstützt. Nutze bitte das Mikrofon deiner Tastatur als Fallback.");
  if(dictState.active&&dictState.target===el){stopDictation();return;}
  if(dictState.active)stopDictation(true);
  stopSpeech(true);
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const rec=new Recognition();
  rec.lang=project()?.tts?.dictationLang||"de-DE";
  rec.continuous=true;rec.interimResults=false;rec.maxAlternatives=1;
  dictState.recognizer=rec;dictState.target=el;dictState.button=button;dictState.active=true;dictState.manualStop=false;
  rec.onstart=()=>{button?.classList.add("recording");if(button)button.innerHTML="■ Diktat stoppen";toast("Mikrofon hört zu …");};
  rec.onresult=e=>{let finalText="";for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=(finalText?" ":"")+e.results[i][0].transcript;}if(finalText)insertDictatedText(el,finalText);};
  rec.onerror=e=>{if(e.error==="not-allowed"||e.error==="service-not-allowed"){toast("Mikrofonzugriff wurde nicht erlaubt.");dictState.active=false;}else if(e.error!=="no-speech"&&e.error!=="aborted"){toast("Spracherkennung: "+e.error);}};
  rec.onend=()=>{const shouldRestart=dictState.active&&!dictState.manualStop&&dictState.target===el;if(shouldRestart){setTimeout(()=>{try{rec.start()}catch{}},180);}else{button?.classList.remove("recording");if(button)button.innerHTML="🎙 Diktieren";}};
  try{rec.start()}catch{toast("Mikrofon konnte nicht gestartet werden.");stopDictation(true);}
}
function enhanceSpeechFields(root=document){
  root.querySelectorAll?.("textarea").forEach(el=>{
    if(el.dataset.speechEnhanced==="1"||el.dataset.noSpeech==="1")return;
    el.dataset.speechEnhanced="1";
    const bar=document.createElement("div");bar.className="speech-field-tools";
    const mic=document.createElement("button");mic.type="button";mic.className="speech-tool mic-tool";mic.innerHTML="🎙 Diktieren";mic.title="Gesprochenen Text an der Cursorposition einfügen";
    const read=document.createElement("button");read.type="button";read.className="speech-tool";read.innerHTML="🔊 Vorlesen";read.title="Markierten Text oder das ganze Feld vorlesen";
    mic.addEventListener("click",()=>startDictation(el,mic));read.addEventListener("click",()=>speakText(selectedOrAll(el)));
    bar.append(mic,read);el.insertAdjacentElement("afterend",bar);
  });
}
function readableTextFrom(root){
  if(!root)return "";
  const clone=root.cloneNode(true), originals=[...root.querySelectorAll("textarea,input")], clones=[...clone.querySelectorAll("textarea,input")];
  clones.forEach((c,i)=>{const o=originals[i];if(o&&o.value&&!["file","range","checkbox","radio"].includes(o.type)){c.replaceWith(document.createTextNode(" "+o.value+" "));}else c.remove();});
  clone.querySelectorAll("button,select,nav,.speech-field-tools,.tts-bar,.editor-toolbar,.bottom-nav,.wordcount").forEach(x=>x.remove());
  return (clone.innerText||clone.textContent||"").replace(/\n{3,}/g,"\n\n").trim();
}
function readVisiblePage(){const root=$(".content-panel")||$(".page");speakText(readableTextFrom(root));}
function voiceSettings(){
  const p=project(),cfg=p.tts;
  if(!["gemini","elevenlabs"].includes(cfg.provider))cfg.provider="gemini";
  cfg.geminiVoice ||= "Sulafat";
  const remembered=rememberedVoice();
  if(!cfg.voice&&remembered.id){cfg.voice=remembered.id;cfg.voiceName=remembered.name||"";store.save({sync:false});}
  modal(`<h2>KI-Stimme & Sprache</h2>
    <p class="small muted">Gemini bietet professionelle KI-Vorlesestimmen im kostenlosen API-Kontingent. ElevenLabs bleibt als bisherige Alternative erhalten und kann Kosten verursachen.</p>
    <div class="field"><label>TTS-Anbieter</label><select id="ttsProvider"><option value="gemini" ${cfg.provider==="gemini"?"selected":""}>Gemini · kostenloses Kontingent</option><option value="elevenlabs" ${cfg.provider==="elevenlabs"?"selected":""}>ElevenLabs · eigener Zugang</option></select></div>
    <div id="geminiVoiceWrap" class="field" style="margin-top:12px"><label>Gemini Hörbuch-Stimme</label><select id="geminiVoice">${GEMINI_TTS_VOICES.map(([id,label])=>`<option value="${id}" ${cfg.geminiVoice===id?"selected":""}>${label}</option>`).join("")}</select><div class="small muted">Gemini 3.8 Flash TTS, gefühlvolle Erzählweise. Diese Probe verwendet zunächst eine Stimme, die Figurenstimmen folgen als eigener Schritt.</div></div>
    <div id="elevenVoiceWrap" class="field" style="margin-top:12px"><label>ElevenLabs Stimme</label><select id="elevenVoice"><option value="${esc(cfg.voice||"")}">${cfg.voiceName?esc(cfg.voiceName):cfg.voice?"Gespeicherte Stimme":"Stimmen werden geladen …"}</option></select><div id="elevenVoiceStatus" class="small muted">Bei Auswahl von ElevenLabs werden deine Stimmen geladen.</div></div>
    <div class="field" style="margin-top:12px"><label>Geschwindigkeit: <span id="ttsRateVal">${Number(cfg.rate||1.15).toFixed(2)}×</span></label><input id="ttsRate" type="range" min="0.75" max="2" step="0.05" value="${cfg.rate||1.15}"><div class="speed-presets">${[0.9,1,1.15,1.25,1.5,1.75,2].map(r=>`<button type="button" class="speed-chip" data-speed="${r}">${r}×</button>`).join("")}</div><div class="small muted">Gemini wird über das Abspieltempo beschleunigt oder verlangsamt. ElevenLabs bis 1,2× direkt beim Erzeugen.</div></div>
    <div class="field"><label>Erzählstil</label><textarea id="geminiStyle" rows="2" class="input" placeholder="Wärme, Spannung und Emotion …">${esc(cfg.instructions||"")}</textarea></div>
    <div class="field"><label>Sprache fürs Diktieren</label><select id="dictLang"><option value="de-DE" ${cfg.dictationLang==="de-DE"?"selected":""}>Deutsch</option><option value="hr-HR" ${cfg.dictationLang==="hr-HR"?"selected":""}>Kroatisch</option><option value="en-US" ${cfg.dictationLang==="en-US"?"selected":""}>Englisch</option></select></div>
    <label class="toggle-row"><input type="checkbox" id="ttsAutoIdeas" ${cfg.autoIdeas?"checked":""}><span>Neue KI-Antworten automatisch vorlesen</span></label>
    <label class="toggle-row"><input type="checkbox" id="ttsAutoChapters" ${cfg.autoChapters?"checked":""}><span>Neu geschriebene Kapitel automatisch vorlesen</span></label>
    <p class="small muted">Datenschutz: Vor dem ersten Gemini-Vorlesen in jeder Sitzung fragt Litterum ausdrücklich nach deiner Zustimmung zur Übertragung des Textes. Die App sendet nie automatisch ganze Bücher an Gemini. Deine private Zugangskennung wird benötigt.</p>
    <div class="tts-test"><button class="soft-btn" id="ttsTest">▶ Hörprobe (Beispieltext)</button><button class="ghost-btn" id="ttsStop">■ Stop</button></div>
    <div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="ttsSave">Speichern</button></div>`);
  $("#ttsRate").oninput=e=>$("#ttsRateVal").textContent=Number(e.target.value).toFixed(2)+"×";
  $$(".speed-chip").forEach(b=>b.onclick=()=>{$("#ttsRate").value=b.dataset.speed;$("#ttsRateVal").textContent=Number(b.dataset.speed).toFixed(2)+"×";});
  let voicesLoaded=false;
  async function loadElevenVoices(){
    if(voicesLoaded)return;
    voicesLoaded=true;
    try{
      const r=await fetch("/api/voices?provider=elevenlabs",{cache:"no-store"}),d=await r.json();
      if(!r.ok)throw new Error(d.error||"Stimmen konnten nicht geladen werden");
      const voices=d.voices||[],sel=$("#elevenVoice"),status=$("#elevenVoiceStatus");
      if(!sel||!status)return;
      sel.innerHTML=voices.map(v=>`<option value="${esc(v.id)}">${esc(v.name)}${v.category?" · "+esc(v.category):""}</option>`).join("")||`<option value="">Keine Stimme gefunden</option>`;
      if(cfg.voice&&voices.some(v=>v.id===cfg.voice))sel.value=cfg.voice;
      status.textContent=voices.length?`${voices.length} KI-Stimmen geladen.`:"Keine Stimmen gefunden.";
    }catch(e){const status=$("#elevenVoiceStatus");if(status)status.textContent=e.message;voicesLoaded=false;}
  }
  const refresh=()=>{const g=$("#ttsProvider").value==="gemini";$("#geminiVoiceWrap").style.display=g?"":"none";$("#elevenVoiceWrap").style.display=g?"none":"";if(!g)loadElevenVoices();};
  $("#ttsProvider").onchange=refresh;refresh();
  const apply=()=>{
    cfg.provider=$("#ttsProvider").value;
    cfg.geminiVoice=$("#geminiVoice").value;
    if(cfg.provider==="elevenlabs"){
      const sel=$("#elevenVoice");cfg.voice=sel?.value||cfg.voice||"";cfg.voiceName=sel?.selectedOptions?.[0]?.textContent||cfg.voiceName||"";
      if(cfg.voice)rememberVoice(cfg.voice,cfg.voiceName);
    }
    cfg.rate=+$("#ttsRate").value;
    cfg.instructions=$("#geminiStyle").value.trim().slice(0,500);
    cfg.dictationLang=$("#dictLang").value;
    cfg.autoIdeas=$("#ttsAutoIdeas").checked;
    cfg.autoChapters=$("#ttsAutoChapters").checked;
    store.save();
  };
  $("#ttsTest").onclick=()=>{apply();speakText("Am Abend lag ein warmer, goldener Schimmer auf den Fenstern. Rahel blieb stehen, als sie Adams Stimme hörte. Ein einziger Satz, leise gesprochen, veränderte alles. Und plötzlich wusste sie, dass dieser Augenblick bleiben würde.",{title:"Litterum · Hörprobe"});};
  $("#ttsStop").onclick=()=>stopSpeech();
  $("#ttsSave").onclick=()=>{apply();toast("KI-Vorlesestimme gespeichert");closeModal();};
}

const LANGUAGE_SUGGESTIONS=["Deutsch","Englisch","Kroatisch","Bosnisch","Serbisch","Slowenisch","Französisch","Spanisch","Italienisch","Portugiesisch","Niederländisch","Dänisch","Schwedisch","Norwegisch","Finnisch","Isländisch","Polnisch","Tschechisch","Slowakisch","Ungarisch","Rumänisch","Bulgarisch","Griechisch","Albanisch","Mazedonisch","Ukrainisch","Russisch","Litauisch","Lettisch","Estnisch","Irisch","Walisisch","Katalanisch","Baskisch","Galicisch","Maltesisch","Türkisch","Arabisch","Hebräisch","Persisch","Kurdisch","Armenisch","Georgisch","Hindi","Urdu","Bengalisch","Punjabi","Gujarati","Marathi","Tamil","Telugu","Kannada","Malayalam","Nepali","Sinhala","Chinesisch (Mandarin)","Chinesisch (Kantonesisch)","Japanisch","Koreanisch","Vietnamesisch","Thailändisch","Indonesisch","Malaiisch","Tagalog / Filipino","Mongolisch","Kasachisch","Usbekisch","Aserbaidschanisch","Afrikaans","Swahili","Amharisch","Somali","Zulu","Xhosa","Hausa","Yoruba","Igbo","Maori","Hawaiisch","Esperanto","Latein"];
const GENRE_SUGGESTIONS=["Romance","Romantasy","Fantasy","High Fantasy","Urban Fantasy","Dark Fantasy","Science Fiction","Romantische Science Fiction","Thriller","Psychothriller","Krimi","Mystery","Horror","Gothic","Historischer Roman","Gegenwartsroman","Familienroman","Drama","Coming of Age","Magischer Realismus","Dystopie","Utopie","Abenteuer","Literarischer Roman","Erotik","New Adult","Young Adult","Humor","Satire","Märchen / Fabel","Individuell"];
function choiceField(key,label,value,options,custom="",wide=false){return `<div class="field ${wide?"wide":""}"><label>${label}</label><select data-dna="${key}">${options.map(o=>`<option value="${esc(o)}" ${value===o?"selected":""}>${esc(o)}</option>`).join("")}</select><input class="input choice-custom" data-dna="${key}Custom" value="${esc(custom||"")}" placeholder="Eigene Ergänzung, Nuance oder Sonderregel …"></div>`;}
function manuscriptText(p){return (p.chapters||[]).filter(c=>c.content?.trim()).map(c=>`KAPITEL ${c.number}: ${c.title}\n\n${c.content}`).join("\n\n\n");}
function extractSelectedText(el){if(!el||typeof el.selectionStart!=="number"||el.selectionStart===el.selectionEnd)return "";return el.value.slice(el.selectionStart,el.selectionEnd).trim();}


const NAV = [
  ["studio","Studio","✦"],["briefing","Briefing","☰"],["dna","Roman DNA","◈"],["characters","Figuren","♙"],["relationships","Beziehungen","♡"],
  ["chapters","Kapitel","▤"],["manuscript","Schreiben","✎"],["reader","Lesen","▱"],["style","Stil","✧"],["review","Prüfung","◇"],["vault","Ideenspeicher","☷"],["ideas","Co-Autor","◌"],["editorial","Lektorat","✓"],["cover","Cover","▧"],["export","Export","⇩"]
];
const BOTTOM_NAV = NAV.filter(n=>["studio","chapters","manuscript","reader"].includes(n[0])); // Figuren & Beziehungen liegen unter „Mehr“
const NAV_GROUPS = [
  ["Buch",["studio","briefing","dna"]],
  ["Figuren",["characters","relationships"]],
  ["Schreiben",["chapters","manuscript","reader","style","review"]],
  ["Werkzeuge",["vault","ideas","editorial","cover","export"]]
];
function navItem(id){return NAV.find(n=>n[0]===id);}

function keepActiveBottomTabVisible(){
  const active=$(".bottom-nav button.active");
  if(!active)return;
  try{active.scrollIntoView({block:"nearest",inline:"center",behavior:"auto"});}catch{}
}
function keepActiveChapterVisible(){const active=$(".chapter-item.active");if(active)try{active.scrollIntoView({block:"nearest",inline:"nearest",behavior:"auto"});}catch{}}
function formatDevelopmentElapsed(startedAt){
  const t=Date.parse(String(startedAt||""));if(!Number.isFinite(t))return "";
  const sec=Math.max(0,Math.floor((Date.now()-t)/1000));
  if(sec<60)return `${sec} Sek.`;
  const min=Math.floor(sec/60),rest=sec%60;return `${min}:${String(rest).padStart(2,"0")} Min.`;
}
function updateDevelopmentActivityLabels(){
  document.querySelectorAll("[data-dev-start]").forEach(el=>{
    const elapsed=formatDevelopmentElapsed(el.dataset.devStart);if(!elapsed)return;
    const label=el.dataset.devLabel||"KI arbeitet";el.textContent=` · ${label} · ${elapsed}`;
  });
}
function developmentActivityHtml(p){
  const job=p?.bookDevelopmentJob;if(!job||job.status!=="running"||!job.activeRequestStartedAt)return "";
  const label=job.activeRequestLabel||"KI arbeitet";
  return `<span class="dev-live" data-dev-start="${esc(job.activeRequestStartedAt)}" data-dev-label="${esc(label)}"> · ${esc(label)} · 0 Sek.</span>`;
}
function afterRender(app){enhanceSpeechFields(app);keepActiveBottomTabVisible();keepActiveChapterVisible();updateDevelopmentActivityLabels();}
// Beim Neuaufbau der Oberfläche (z. B. durch Hintergrund-Fortschritt) bleiben Cursor,
// Markierung und Scrollposition erhalten, solange dieselbe Ansicht angezeigt wird.
function viewContextKey(){return `${state.activeProjectId||""}|${state.activeTab||""}|${state.activeProjectId&&project()?chapter()?.id||"":""}`;}
function captureViewState(){
  const app=$("#app"),a=document.activeElement,out={ctx:viewContextKey(),focus:null,scrolls:{}};
  if(a&&a.id&&/^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName)&&app?.contains(a)){
    out.focus={id:a.id,scrollTop:a.scrollTop};
    try{out.focus.start=a.selectionStart;out.focus.end=a.selectionEnd;}catch{}
  }
  for(const sel of ["#chapterContent","#chapterPlan","#chapterMemory","#briefingRaw",".chapter-list"]){const el=app?.querySelector(sel);if(el&&el.scrollTop)out.scrolls[sel]=el.scrollTop;}
  return out;
}
function restoreViewState(v){
  if(!v||v.ctx!==viewContextKey())return;
  const app=$("#app");
  for(const [sel,top] of Object.entries(v.scrolls)){const el=app?.querySelector(sel);if(el)el.scrollTop=top;}
  if(!v.focus)return;
  const el=document.getElementById(v.focus.id);if(!el||el.disabled||!app?.contains(el))return;
  try{el.focus({preventScroll:true});}catch{}
  try{if(typeof v.focus.start==="number"&&typeof el.setSelectionRange==="function")el.setSelectionRange(v.focus.start,v.focus.end);}catch{}
  el.scrollTop=v.focus.scrollTop;
}
// ---------- Darstellung: Hell/Dunkel, Hintergrundfarbe und Fassungsfarbe ----------
// Statt jede der ~500 Farben in styles.css doppelt zu pflegen, wird das Stylesheet einmal eingelesen und
// jede Farbe nach festen Regeln umgerechnet: Grün (fertig), Rot (Gefahr) und Gelb/Orange (in Arbeit)
// behalten ihre Bedeutung; Akzentfarben übernehmen die Farbe der geöffneten Buchfassung; Hintergründe
// bekommen die gewählte Hintergrundfarbe; im hellen Modus wird hell und dunkel getauscht.
const THEME_KEY="storyStudioTheme";
const VARIANT_HUES={v1:325,v2:212,v3:178,final:152}; // Original = Litterum-Plum/Mauve, V2 = Blau, V3 = Türkis, Final = Grün
// Hintergründe wie beim E-Book-Reader: drei helle, zwei dunkle. "page" ist der Seitenhintergrund,
// "surf" färbt Karten/Flächen ganz leicht ein, "accent" ist die ruhige Grundfarbe für Knöpfe.
const SKINS={
  hell:{label:"Litterum",light:true,surf:{h:18,s:.09},accent:325,page:"linear-gradient(145deg,#FDF7F1 0%,#FAF1EE 48%,#F6ECE8 100%)",swatch:"linear-gradient(145deg,#FDF7F1,#F4E4E1,#EAD7D4)"},
  papier:{label:"Papier",light:true,surf:{h:40,s:.38},accent:22,page:"linear-gradient(180deg,#f4ecda,#efe4cc)",swatch:"#f1e7d0"},
  grau:{label:"Grau",light:true,surf:{h:225,s:.06},accent:230,page:"linear-gradient(180deg,#eceef2,#e3e6ec)",swatch:"#e6e8ed"},
  nacht:{label:"Nacht",light:false,swatch:"linear-gradient(135deg,#2c173b,#0d0913)"},
  schwarz:{label:"Schwarz",light:false,dim:true,page:"#000",swatch:"#050505"}
};
function themePrefs(){let t={};try{t=JSON.parse(localStorage.getItem(THEME_KEY)||"{}")||{};}catch{}
  const skin=SKINS[t.skin]?t.skin:(t.mode==="dark"?"nacht":"hell"); // ältere Einstellungen übernehmen; neu = hell
  return {skin,tint:t.tint!==false};}
function saveThemePrefs(t){try{localStorage.setItem(THEME_KEY,JSON.stringify({skin:t.skin,tint:t.tint}));}catch{}themeState.key="";applyTheme();}
const themeState={key:"",base:null,styleEl:null,link:null};
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;}return [h,s,l];}
function hslToRgb(h,s,l){h=((h%360)+360)%360/360;if(!s){const v=Math.round(l*255);return [v,v,v];}const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,f=t=>{t<0&&(t+=1);t>1&&(t-=1);return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};return [f(h+1/3),f(h),f(h-1/3)].map(x=>Math.round(x*255));}
function themeColor(r,g,b,a,cfg,prop=""){
  let [h,s,l]=rgbToHsl(r,g,b);const light=cfg.light;const isBorder=/border|outline/.test(prop);
  const semantic=s>.2&&((h>=80&&h<=175)||((h>=345||h<=12)&&s>.45&&l>.3&&l<.88)||(h>12&&h<62&&s>.4));
  const accent=!semantic&&s>=.42&&l>=.34&&l<=.84;
  if(a<1&&l<.03&&s<.1)return null; // reine Schwarz-Abdunklung (Overlays) bleibt
  if(semantic){if(light){if(a>=.99&&l>.55)l=Math.max(.2,1.05-l);else if(l<.35){l=Math.min(.95,1-l*.5);s=Math.min(s,.5);}}}
  else if(accent){if(cfg.accentHue!=null)h=cfg.accentHue+(h>=250&&h<=345?(h-300)*.2:0);if(cfg.plum){h=cfg.accentHue;s=Math.min(s,light?.26:.34);l=light?Math.min(Math.max(l,.34),.58):Math.max(l,.62);}else if(light){l=Math.min(l,.55);s=Math.min(s,.62);}}
  else{
    if(cfg.surf){if(s>=.04){h=cfg.surf.h;s=Math.min(s,cfg.surf.s);}
      // Helle Designs: Flächen ganz leicht in Fassungsfarbe, Rahmen deutlich sichtbar in Fassungsfarbe
      if(cfg.tintHue!=null&&light&&l<.5){h=cfg.plum?345:cfg.tintHue;if(isBorder){const [R,G,B]=cfg.plum?hslToRgb(345,.2,.72):hslToRgb(h,.55,.72);return a<1?`rgba(${R}, ${G}, ${B}, ${Math.min(1,a*1.6).toFixed(3)})`:`rgb(${R}, ${G}, ${B})`;}s=cfg.plum?Math.min(Math.max(s,.12),.16):Math.max(s,.28);}}
    else if(s>=.08&&cfg.accentHue!=null){h=cfg.accentHue;s=s*.75;}
    if(cfg.dim){if(l<.5){l=l*.45;s=s*.25;}else{l=Math.min(l,.84);s=s*.4;}}
    if(light){l=l<.5?Math.min(.995,1-l*.22):Math.max(.12,(1-l)*.85+.06);if(l<.5)s=Math.min(s,.22);}
  }
  const [R,G,B]=hslToRgb(h,s,l);return a<1?`rgba(${R}, ${G}, ${B}, ${+a.toFixed(3)})`:`rgb(${R}, ${G}, ${B})`;
}
function themeValue(v,cfg,prop=""){
  // Ein einziger Durchlauf, damit keine Farbe doppelt umgerechnet wird.
  return v.replace(/#([0-9a-f]{3,8})\b|rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi,(m,x,r,g,b,a)=>{
    if(x!==undefined){if(x.length===3||x.length===4)x=x.split("").map(c=>c+c).join("");if(x.length!==6&&x.length!==8)return m;const n=parseInt(x.slice(0,6),16),al=x.length===8?parseInt(x.slice(6),16)/255:1;return themeColor(n>>16&255,n>>8&255,n&255,al,cfg,prop)||m;}
    const al=a===undefined?1:a.endsWith("%")?parseFloat(a)/100:parseFloat(a);return themeColor(+r,+g,+b,al,cfg,prop)||m;
  });
}
// Im hellen Design wirken dunkle Schatten schwer: dort nur ganz zarte Schatten.
function themeShadow(v,cfg){if(!cfg.light)return v;return v.replace(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi,(m,r,g,b,a)=>{const al=a===undefined?1:a.endsWith("%")?parseFloat(a)/100:parseFloat(a);const [h,s,l]=rgbToHsl(+r,+g,+b);if(l>.25)return `rgba(117, 80, 102, ${+(Math.min(al,.5)*.22).toFixed(3)})`;return `rgba(75, 46, 70, ${+(al*.18).toFixed(3)})`;});}
function themeRuleText(rule,cfg){
  if(rule.cssRules&&rule.media)return `@media ${rule.media.mediaText}{${[...rule.cssRules].map(r=>themeRuleText(r,cfg)).join("")}}`;
  if(!rule.style||!rule.selectorText)return rule.cssText;
  if(/\.vc-(v1|v2|v3|final)\b/.test(rule.selectorText)&&/--vc/.test(rule.cssText))return rule.cssText; // Fassungsfarben bleiben fest
  if(/\.bk-cover|\.bk-icon|\.undo-bar/.test(rule.selectorText))return rule.cssText; // Buchcover sehen in jedem Design gleich aus
  // Regeln, die bereits gezielt für ein bestimmtes Design geschrieben sind (html[data-skin=…], html[data-theme=…]),
  // dürfen NICHT noch einmal umgerechnet werden – sonst wird z. B. dunkle Schrift im hellen Design wieder hell.
  if(/html\[data-(skin|theme)|html:not\(\[data-skin/.test(rule.selectorText))return rule.cssText;
  // cssText statt Einzel-Eigenschaften: Kurzschreibweisen mit var() gehen sonst verloren.
  const txt=rule.cssText,open=txt.indexOf("{"),body=txt.slice(open+1,txt.lastIndexOf("}"));
  const decls=body.split(/;(?![^(]*\))/).map(d=>{const i=d.indexOf(":");if(i<0)return d;const prop=d.slice(0,i);return /shadow/i.test(prop)?prop+":"+themeShadow(d.slice(i+1),cfg):prop+":"+themeValue(d.slice(i+1),cfg,prop.trim());});
  return txt.slice(0,open+1)+decls.join(";")+"}";
}
function applyTheme(){
  try{applyThemeInner();}catch(e){console.warn("Darstellung konnte nicht angewendet werden",e);}
  // Erst jetzt die App zeigen (verhindert das kurze Aufblitzen im alten Design).
  document.documentElement.classList.remove("theme-pending");document.documentElement.style.background="";
}
function applyThemeInner(){
  const t=themePrefs(),sk=SKINS[t.skin],p=state.activeProjectId?projectById(state.activeProjectId):null,v=p?activeBookVariant(p):null;
  const accentKey=t.tint&&v?bookVariantColor(v):null;
  const key=`${t.skin}|${accentKey||"-"}`;
  document.documentElement.dataset.theme=sk.light?"light":"dark";document.documentElement.dataset.skin=t.skin;document.documentElement.dataset.variantTint=accentKey||"";
  if(key===themeState.key)return;
  if(!themeState.link)themeState.link=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>/styles\.css/.test(l.href))||null;
  if(!themeState.link)return;
  if(t.skin==="nacht"&&!accentKey){themeState.styleEl?.remove();themeState.styleEl=null;themeState.link.disabled=false;themeState.key=key;return;}
  if(!themeState.base){themeState.link.disabled=false;const sheet=themeState.link.sheet;if(!sheet)return;themeState.base=[...sheet.cssRules];}
  // Helle Designs: Fassungsfarbe nur für Akzente (Knöpfe, Balken), Flächen bleiben ruhig und hell.
  // Original-Fassung (und Litterum-Design ohne Fassungsfarbe) = gedecktes Litterum-Pflaume statt grellem Magenta.
  const plum=accentKey==="v1"||(!accentKey&&t.skin==="hell");
  const cfg={plum,light:!!sk.light,dim:!!sk.dim,surf:sk.surf||null,accentHue:accentKey?VARIANT_HUES[accentKey]:(sk.accent??null),tintHue:accentKey?VARIANT_HUES[accentKey]:(t.tint&&sk.light?325:null)};
  let css=themeState.base.map(r=>themeRuleText(r,cfg)).join("\n");
  if(sk.page)css+=`\nhtml,body{background:${sk.page}!important;background-attachment:fixed!important}`;
  if(sk.light){const ah=cfg.accentHue??262,warm=ah>=30&&ah<=70;const grad=plum?"linear-gradient(135deg,#6A455D,#9B6B7B)":`linear-gradient(135deg,hsl(${ah} ${warm?70:60}% ${warm?50:58}%),hsl(${ah+(warm?-12:18)} ${warm?65:55}% ${warm?44:50}%))`;css+=`\n.primary-btn,.bk-go{background:${grad}!important;color:${warm&&!plum?"#2a1d05":"#fff"}!important;border:0!important}`;}
  else if(plum)css+=`\n.primary-btn,.bk-go{background:linear-gradient(135deg,#C88F98,#9B6B7B)!important;color:#21141d!important;border:0!important}`;
  if(sk.light)css+=`\n.card,.bk-row,.ss-card,.ss-pill,.ss-action,.modal{box-shadow:0 1px 2px rgba(60,40,90,.06),0 8px 24px rgba(60,40,90,.07)!important}.topbar,.bottom-nav{backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.manuscript{font-family:Georgia,"Iowan Old Style",serif}`;
  if(sk.light)css+=`\n
html[data-theme="light"] .ss-action-chip.done,
html[data-theme="light"] .ss-pill.done .ss-pill-text span,
html[data-theme="light"] .chapter-progress-summary .done,
html[data-theme="light"] .chapter-mini-status .done,
html[data-theme="light"] .variant-status.done,
html[data-theme="light"] .bk-chip.done,
html[data-theme="light"] .book-variant-row.complete .book-variant-main>strong,
html[data-theme="light"] .book-variant-process-note.ready,
html[data-theme="light"] .project-card.complete .meta strong,
html[data-theme="light"] .series-library-card.complete h3,
html[data-theme="light"] .series-book-entry.complete .series-book-row strong,
html[data-theme="light"] .series-book-entry.complete .series-book-row em,
html[data-theme="light"] .part-complete-badge,
html[data-theme="light"] .translation-edition.done strong,
html[data-theme="light"] .bk-small .ok,
html[data-theme="light"] .ok,
html[data-theme="light"] .studio-state-chip.good,
html[data-theme="light"] .ss-chip.good{
  color:#176b3a!important;
}
html[data-theme="light"] .book-complete-banner strong,
html[data-theme="light"] .book-complete-check{
  color:#145f35!important;
}
html[data-theme="light"] .ss-action.done .ss-action-chev{
  color:#176b3a!important;
}`;
  if(t.skin==="hell")css+=`
html[data-skin="hell"]{
  --bg:#FDF7F1;--panel:#FFFDFC;--panel2:#F6ECE8;--panel3:#EEDDD9;--text:#2E2B2F;
  --muted:#786A70;--line:#D9C5C1;--rose:#D9A7A0;--pink:#B9788A;--plum:#4B2E46;
  --violet:#6D5368;--peach:#E9C9B7;--shadow:0 12px 34px rgba(75,46,70,.10);
}
html[data-skin="hell"],html[data-skin="hell"] body{
  background:linear-gradient(145deg,#FDF7F1 0%,#FAF1EE 48%,#F6ECE8 100%)!important;
  color:#2E2B2F!important;
}
html[data-skin="hell"] .topbar{background:rgba(253,247,241,.92)!important;border-bottom:1px solid rgba(75,46,70,.10)!important;box-shadow:0 4px 20px rgba(75,46,70,.05)!important}
html[data-skin="hell"] .brand-title{color:#3C2838!important}
html[data-skin="hell"] .brand-sub,html[data-skin="hell"] .muted,html[data-skin="hell"] .bk-small{color:#786A70!important}
html[data-skin="hell"] .version-badge{color:#694A61!important;border-color:#D9C5C1!important;background:#F8EFEB!important}
html[data-skin="hell"] .icon-btn{background:#F8EFEB!important;color:#4B2E46!important;border:1px solid rgba(75,46,70,.08)!important}
html[data-skin="hell"] .icon-btn:hover{background:#F1E2DE!important}
html[data-skin="hell"] .primary-btn,html[data-skin="hell"] .bk-go{background:linear-gradient(135deg,#4B2E46,#765066 58%,#B87888)!important;color:#FFF9F6!important;box-shadow:0 7px 18px rgba(75,46,70,.18)!important}
html[data-skin="hell"] .soft-btn{background:#F7ECE8!important;border:1px solid #D7BBB8!important;color:#4B2E46!important}
html[data-skin="hell"] .ghost-btn{background:rgba(255,255,255,.38)!important;border-color:#D9C5C1!important;color:#4B2E46!important}
html[data-skin="hell"] .card,html[data-skin="hell"] .panel,html[data-skin="hell"] .modal,html[data-skin="hell"] .bk-row,html[data-skin="hell"] .bk-series{background:rgba(255,253,252,.88)!important;border-color:#DDCBC7!important;box-shadow:0 10px 30px rgba(75,46,70,.07)!important}
html[data-skin="hell"] .bk-hero{background:linear-gradient(135deg,rgba(253,247,241,.98),rgba(244,226,224,.90) 62%,rgba(234,215,212,.82))!important;border-color:#C99FA6!important;box-shadow:0 12px 30px rgba(75,46,70,.08)!important}
html[data-skin="hell"] .bk-kicker,html[data-skin="hell"] .bk-band-label,html[data-skin="hell"] .side-group-label{color:#7D4C68!important}
html[data-skin="hell"] .bk-icon{background:linear-gradient(145deg,#6A455D,#9B6B7B 56%,#D9A7A0)!important;box-shadow:0 6px 16px rgba(75,46,70,.16)!important}
html[data-skin="hell"] .bk-series-books{border-left-color:rgba(75,46,70,.20)!important}
html[data-skin="hell"] .bk-tab{border-color:#D9C5C1!important;color:#75676C!important}
html[data-skin="hell"] .bk-tab.on{background:#F0DFDC!important;border-color:#8D5B73!important;color:#4B2E46!important}
html[data-skin="hell"] .bk-view{background:#F8EFEB!important;border-color:#D9C5C1!important;color:#4B2E46!important}
html[data-skin="hell"] .bk-bar,html[data-skin="hell"] .progress{background:#E8DCD8!important}
html[data-skin="hell"] .bk-bar span,html[data-skin="hell"] .progress>span{background:linear-gradient(90deg,#8B6076,#C88F98)!important}
html[data-skin="hell"] .bk-bar.done span{background:#4EAA72!important}
html[data-skin="hell"] .input,html[data-skin="hell"] textarea,html[data-skin="hell"] select{background:#FFFCFA!important;color:#2E2B2F!important;border-color:#D9C5C1!important}
html[data-skin="hell"] .input:focus,html[data-skin="hell"] textarea:focus,html[data-skin="hell"] select:focus{border-color:#9A6A7E!important;box-shadow:0 0 0 3px rgba(154,106,126,.12)!important}
html[data-skin="hell"] .nav-btn{color:#665960!important}
html[data-skin="hell"] .nav-btn.active,html[data-skin="hell"] .nav-btn:hover{background:linear-gradient(90deg,#EAD8D4,#F5EAE7)!important;color:#4B2E46!important}
html[data-skin="hell"] .bottom-nav{background:rgba(253,247,241,.94)!important;border-top-color:rgba(75,46,70,.10)!important}
html[data-skin="hell"] .bottom-nav button.active{color:#4B2E46!important}
html[data-skin="hell"] .home-brand-intro{color:#5F4657!important}
html[data-skin="hell"] .litterum-workspace-logo{background:#FDF7F1!important;border:1px solid rgba(75,46,70,.16)!important;box-shadow:0 6px 18px rgba(75,46,70,.13)!important}
html[data-skin="hell"] .litterum-workspace-logo img{width:100%;height:100%;object-fit:cover;display:block}
html[data-skin="hell"] .studio-hero{background:linear-gradient(145deg,#FFFDFC,#F2E4E1)!important;border-color:#D9C5C1!important}
html[data-skin="hell"] .studio-kicker{color:#87596E!important}
`;
  if(!themeState.styleEl){themeState.styleEl=document.createElement("style");themeState.styleEl.id="themeCss";document.head.appendChild(themeState.styleEl);}
  themeState.styleEl.textContent=css;themeState.link.disabled=true;themeState.key=key;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=sk.light?"#FDF7F1":t.skin==="schwarz"?"#000000":"#100b18";
}
// Zentrale Einstellungen (Zahnrad oben): überall erreichbar, auch auf „Meine Bücher“.
function openAppSettings(){
  const p=state.activeProjectId?projectById(state.activeProjectId):null,v=p?activeBookVariant(p):null,edition=p&&editionGroupForProject(p)?editionLabel(p):"";
  modal(`<h2>Einstellungen</h2><div class="bk-menu">
    <button type="button" id="setTheme">🎨 Darstellung <small>Hell, Papier, Grau, Nacht, Schwarz</small></button>
    <button type="button" id="setTrash">🗑 Papierkorb <small>${trashList().length} Einträge · Gelöschtes zurückholen</small></button>
    ${p?`<button type="button" id="setVariants">📚 Buchfassungen <small>Gerade offen: ${esc(edition||bookVariantUiLabel(v))}</small></button>`:""}
  </div>${p?"":`<p class="small muted" style="margin-top:10px">Buchfassungen werden als vollständig getrennte Bücher gespeichert und unter einem gemeinsamen Titel zusammen angezeigt. Dadurch kann eine Version das Original nicht überschreiben.</p>`}
  <div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button></div>`);
  $("#setTheme").onclick=()=>{closeModal();openThemeSettings();};
  $("#setTrash").onclick=()=>{closeModal();openTrash();};
  $("#setVariants")?.addEventListener("click",()=>{closeModal();openBookVariantsManager();});
}
function openThemeSettings(){
  const t=themePrefs();
  const skinBtn=id=>{const sk=SKINS[id];return `<button type="button" class="skin-opt ${t.skin===id?"on":""}" data-theme-skin="${id}"><span class="skin-sw" style="background:${sk.swatch}"><b style="color:${sk.light?"#2a2233":"#eee"}">Aa</b></span><span>${sk.label}</span></button>`;};
  const opt=(val,label,on)=>`<button type="button" class="theme-opt ${on?"on":""}" data-theme-tint="${val}">${label}</button>`;
  modal(`<h2>Darstellung</h2><p class="small muted">Wie beim E-Book-Reader: Wähle den Hintergrund, der für deine Augen angenehm ist. Gilt für dieses Gerät.</p>
    <div class="field"><label>Hintergrund</label><div class="skin-row">${["hell","papier","grau","nacht","schwarz"].map(skinBtn).join("")}</div></div>
    <div class="field"><label>Fassungsfarbe</label><div class="theme-row">${opt("on","An – Knöpfe in Farbe der Fassung",t.tint)}${opt("off","Aus – nur das Abzeichen",!t.tint)}</div><div class="small muted" style="margin-top:6px">Original = Litterum-Plum · Version 2 = blau · Version 3 = türkis · Final = grün. Grün bleibt immer für „fertig“.</div></div>
    <div class="modal-actions"><button class="primary-btn" data-close>Fertig</button></div>`);
  const upd=patch=>{const cur=themePrefs();saveThemePrefs({...cur,...patch});closeModal();openThemeSettings();};
  $$("[data-theme-skin]").forEach(b=>b.onclick=()=>upd({skin:b.dataset.themeSkin}));
  $$("[data-theme-tint]").forEach(b=>b.onclick=()=>upd({tint:b.dataset.themeTint==="on"}));
}
function render(){
  if(!booted)return;
  applyTheme();
  const app=$("#app"),view=captureViewState();
  if(!state.activeProjectId || !project()){app.innerHTML=renderHome();bindHome();restoreViewState(view);requestAnimationFrame(()=>afterRender(app));return;}
  app.innerHTML=renderWorkspace();
  bindWorkspace();
  restoreViewState(view);
  requestAnimationFrame(()=>afterRender(app));
}

// ---------- Meine Bücher (Liste oder Regal) ----------
const LIB_VIEW_KEY="storyStudioLibView";
let libFilter="all";
function libView(){try{return localStorage.getItem(LIB_VIEW_KEY)==="shelf"?"shelf":"list";}catch{return "list";}}
function bookStatsRaw(p,list){const ch=list||p.chapters||[],done=ch.filter(c=>!chapterNeedsWriting(c)).length,words=ch.reduce((n,c)=>n+countWords(c.content),0),complete=ch.length>0&&done===ch.length;const nx=ch.find(chapterNeedsWriting);const next=nx?(p.chapters||[]).find(c=>c.id===nx.id)||nx:null;return {total:ch.length,done,words,complete,pct:ch.length?Math.round(done/ch.length*100):0,next};}
// In „Meine Bücher“ zählt immer die HAUPTFASSUNG (Original bzw. Reihenfassung) – nicht die gerade geöffnete
// Probe-Fassung. Die Hauptfassung liegt sicher gespeichert, auch wenn gerade Version 2 oder 3 geschrieben wird.
function bookMainVariant(p){const b=ensureBookVariantsShape(p);return b?.variants.find(v=>v.kind!=="final")||b?.variants[0]||null;} // immer die Originalfassung (Version 1)
function bookStats(p){
  const b=ensureBookVariantsShape(p),main=bookMainVariant(p);
  if(!b||!main||main.id===b.activeId||!main.snapshot)return bookStatsRaw(p);
  const byId=new Map((main.snapshot.chapters||[]).map(x=>[x.id,x]));
  return bookStatsRaw(p,(p.chapters||[]).map(c=>{const x=byId.get(c.id)||{};return {id:c.id,number:c.number,title:c.title,content:String(x.content||""),writeIncomplete:!!x.writeIncomplete};}));
}
function openVariantNote(p){
  const eg=editionGroupForProject(p);if(eg){const st=bookStatsRaw(p);return `<span class="bk-open-variant vc-${editionColorByOrder(p)}"><b>${esc(editionMark(p))}</b> ${esc(editionLabel(p))} · eigener Speicher · ${st.done}/${st.total} Kap.</span>`;}
  const b=ensureBookVariantsShape(p),main=bookMainVariant(p),v=activeBookVariant(p);if(!b||!v||!main||v.id===main.id)return "";
  const st=bookStatsRaw(p);return `<span class="bk-open-variant vc-${bookVariantColor(v)}"><b>${esc(bookVariantUiMark(v))}</b> ${esc(bookVariantShort(v))} offen · ${st.done}/${st.total} Kap.</span>`;
}
// Einheitliches Buchsymbol im Fabula-Stil (Buch + Stern, ohne Feder) – der Titel steht daneben.
const BOOK_ICON_SVG=`<svg viewBox="0 0 512 512" aria-hidden="true"><path d="M86 300c62-28 120-24 170 10v76c-50-32-108-36-170-8z" fill="#fff" opacity=".97"/><path d="M426 300c-62-28-120-24-170 10v76c50-32 108-36 170-8z" fill="#fff" opacity=".8"/><path d="M256 92l22 52 52 22-52 22-22 52-22-52-52-22 52-22z" fill="#fff"/><path d="M368 120l9 21 21 9-21 9-9 21-9-21-21-9 21-9z" fill="#fff" opacity=".75"/></svg>`;
function bookCoverHtml(p,size=""){return `<div class="bk-icon ${size}">${BOOK_ICON_SVG}</div>`;}
function bookStatusChip(st){return st.complete?`<span class="bk-chip done">✓ Fertig · ${st.total} Kapitel</span>`:st.total&&st.done?`<span class="bk-chip work">● In Arbeit · ${st.done}/${st.total}</span>`:st.total?`<span class="bk-chip work">● In Arbeit · 0/${st.total}</span>`:`<span class="bk-chip">Neu · noch keine Kapitel</span>`;}
function bookCreatedLabel(p){
  const d=new Date(p?.createdAt||"");
  return Number.isFinite(d.getTime())?`Erstellt am ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}`:"Erstellungsdatum unbekannt";
}
function preferredSeriesProject(s){
  const books=seriesBooks(s);if(!books.length)return null;
  const remembered=projectById(state.lastProjectId);
  if(remembered&&seriesForProject(remembered)?.id===s.id&&!bookStatsRaw(remembered).complete)return remembered;
  const unfinished=books.filter(p=>!bookStats(p).complete);
  if(unfinished.length){
    const rememberedRoot=remembered?seriesBandRoot(remembered):null,hit=rememberedRoot&&unfinished.find(p=>p.id===rememberedRoot.id);
    if(hit)return hit;
    return [...unfinished].sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")))[0]||unfinished[0];
  }
  // Ist die komplette Original-Reihe fertig und keine alternative Fassung offen, startet sie neutral bei Band 1.
  return [...books].sort((a,b)=>(Number(a.seriesOrder)||999)-(Number(b.seriesOrder)||999))[0]||books[0];
}
function lastLibraryProject(){
  const remembered=projectById(state.lastProjectId);
  if(remembered){const s=seriesForProject(remembered);return s?preferredSeriesProject(s):remembered;}
  const latest=[...(state.projects||[])].sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")))[0]||null;
  if(!latest)return null;const s=seriesForProject(latest);return s?preferredSeriesProject(s):latest;
}
function continueHeroHtml(){
  const p=lastLibraryProject();if(!p)return "";const st=bookStatsRaw(p);const av=activeBookVariant(p),edition=editionGroupForProject(p)?editionLabel(p):av?bookVariantShort(av):"";
  const where=st.next?`Kapitel ${st.next.number} · ${esc(st.next.title||"")}`:st.complete?"Alle Kapitel geschrieben":"Noch keine Kapitel";
  return `<section class="bk-hero" data-open="${p.id}"><div>${bookCoverHtml(p,"big")}</div><div class="bk-hero-meta"><span class="bk-kicker">WEITERSCHREIBEN${edition?` · ${esc(edition.toUpperCase())}`:""}</span><h2>${esc(p.title)}</h2><div class="bk-small">${where}</div><div class="bk-bar ${st.complete?"done":""}"><span style="width:${st.pct}%"></span></div><div class="bk-small">${st.total?`${st.done} von ${st.total} Kapiteln · `:""}${st.words.toLocaleString("de-DE")} Wörter</div><button type="button" class="bk-go" data-open-btn="${p.id}">✎ Weiter</button></div></section>`;
}
function bookRowHtml(p){
  const st=bookStats(p);
  const info=st.complete
    ?`<span class="ok">✓ Fertig</span> · ${st.total} Kapitel · ${st.words.toLocaleString("de-DE")} Wörter`
    :st.total
      ?`<span class="work">In Arbeit</span> · ${st.done} von ${st.total} Kapiteln · ${st.words.toLocaleString("de-DE")} Wörter`
      :"Neu · noch keine Kapitel";
  return `<article class="bk-row ${st.complete?"complete":""}" data-open="${p.id}">${bookCoverHtml(p)}<div class="bk-meta"><h3>${esc(p.title)}</h3><div class="bk-small bk-book-stats">${info}</div><div class="bk-created">${esc(bookCreatedLabel(p))}</div>${openVariantNote(p)}<div class="bk-bar ${st.complete?"done":""}"><span style="width:${st.pct}%"></span></div></div><button type="button" class="bk-dots" data-book-menu="${p.id}" aria-label="Optionen für ${esc(p.title)}">⋯</button></article>`;
}
function bookShelfHtml(p){
  const st=bookStats(p);
  const info=st.complete
    ?`<span class="ok">✓ Fertig</span> · ${st.total} Kapitel · ${st.words.toLocaleString("de-DE")} Wörter`
    :st.total
      ?`<span class="work">In Arbeit</span> · ${st.done} von ${st.total} Kapiteln · ${st.words.toLocaleString("de-DE")} Wörter`
      :"Neu · noch leer";
  return `<article class="bk-shelf-item ${st.complete?"complete":""}" data-open="${p.id}">${bookCoverHtml(p,"shelf")}<button type="button" class="bk-dots on-cover" data-book-menu="${p.id}" aria-label="Optionen für ${esc(p.title)}">⋯</button><h3>${esc(p.title)}</h3><div class="bk-small bk-book-stats">${info}</div><div class="bk-created">${esc(bookCreatedLabel(p))}</div><div class="bk-bar ${st.complete?"done":""}"><span style="width:${st.pct}%"></span></div></article>`;
}
function renderHome(){
  const groups=(state.series||[]).filter(x=>seriesBooks(x).length);const linked=new Set(groups.flatMap(x=>seriesBooks(x).map(p=>p.id)));
  const allEditionGroups=(state.editionGroups||[]).filter(x=>editionBooks(x).length),editionGroups=allEditionGroups.filter(g=>!editionGroupIsNestedInSeries(g));
  const editionLinked=new Set(allEditionGroups.flatMap(x=>editionBooks(x).map(p=>p.id)));
  const single=(state.projects||[]).filter(p=>!linked.has(p.id)&&!editionLinked.has(p.id)).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
  const f=libFilter,view=libView();
  const shown=(f==="series"||f==="editions")?[]:single.filter(p=>{const st=bookStats(p);return f==="done"?st.complete:f==="work"?!st.complete:true;});
  const showSeries=(f==="all"||f==="series")&&groups.length;
  const showEditions=(f==="all"||f==="editions")&&editionGroups.length;
  const count=single.length+groups.length+editionGroups.length;
  const tab=(id,label)=>`<button type="button" class="bk-tab ${f===id?"on":""}" data-lib-filter="${id}">${label}</button>`;
  const list=view==="shelf"?`<section class="bk-shelf">${shown.map(bookShelfHtml).join("")}</section>`:`<section class="bk-list">${shown.map(bookRowHtml).join("")}</section>`;
  return `<div class="app-shell">
    ${topbar(false)}
    <main class="page bk-page">
      <div class="home-brand-intro">Wo Gedanken sich sammeln, Geschichten wachsen und Bücher entstehen.</div>
      ${count?continueHeroHtml():`<section class="hero"><h1>Litterum</h1><p class="litterum-slogan">Wo Gedanken sich sammeln, Geschichten wachsen und Bücher entstehen.</p><p>Ein Briefing reicht. Litterum versteht deine Roman-DNA, entwickelt daraus einen echten Gesamtplan und kann danach Kapitel für Kapitel schreiben, prüfen und den Canon weiterführen.</p></section>`}
      <div class="bk-actions"><button class="primary-btn" id="newBook">＋ Neues Buch</button><button class="soft-btn" id="newSeries">＋ Buchreihe</button><button class="soft-btn" id="importBook">⇪ Import</button></div>
      ${count?`<div class="bk-sec"><h2>Meine Bücher</h2><span>${count} ${count===1?"Buch":"Bücher"}</span><button type="button" class="bk-view" id="toggleLibView" title="Ansicht wechseln">${view==="shelf"?"☰ Liste":"▦ Regal"}</button></div>
      <div class="bk-tabs">${tab("all","Alle")}${tab("work","In Arbeit")}${tab("done","Fertig")}${editionGroups.length?tab("editions","Fassungen"):""}${groups.length?tab("series","Reihen"):""}</div>
      ${showSeries?`<section class="series-library-grid">${groups.map(seriesLibraryCard).join("")}</section>`:""}
      ${showEditions?`<section class="series-library-grid">${editionGroups.map(editionLibraryCard).join("")}</section>`:""}
      ${shown.length?list:(!["series","editions"].includes(f)?`<div class="bk-empty">Keine Bücher in dieser Ansicht.</div>`:"")}`:""}
      <div class="section-title"><h2>Schnelle Idee</h2><span>Aus einem Gedanken ein neues Projekt machen</span></div>
      <section class="card quick-idea"><textarea id="quickIdea" placeholder="Schreib deine Idee einfach so hinein, wie sie dir gerade durch den Kopf geht ..."></textarea><div style="margin-top:10px"><button class="primary-btn" id="quickCreate">Idee als neues Buch anlegen</button></div></section>
    </main></div>`;
}
function openBookMenu(id){
  const p=projectById(id);if(!p)return;
  const eg=editionGroupForProject(p),ed=eg?editionLabel(p):"";
  modal(`<div class="bk-menu-head">${bookCoverHtml(p)}<div><h2 style="margin:0">${esc(p.title)}</h2><div class="small muted">${eg?`Buchfassung · ${esc(ed)} · eigener Speicher`:esc(p.genre||"Roman")}</div></div></div>
    <div class="bk-menu"><button type="button" id="bkOpen">📖 Öffnen</button><button type="button" id="bkRename">✎ Umbenennen</button><button type="button" id="bkExport">⇩ Exportieren</button><button type="button" id="bkDelete" class="del">🗑 ${eg&&p.id!==editionOriginal(eg)?.id?`Nur ${esc(ed)} löschen`:`Buch löschen …`}</button></div>
    <div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button></div>`);
  $("#bkOpen").onclick=()=>{closeModal();openProjectFromLibrary(id);};
  $("#bkExport").onclick=()=>{closeModal();openProjectFromLibrary(id);state.activeTab="export";store.save({sync:false});render();};
  $("#bkDelete").onclick=()=>{closeModal();confirmDeleteProject(id);};
  $("#bkRename").onclick=()=>{
    modal(`<h2>Buch umbenennen</h2><div class="field"><label>Titel</label><input class="input" id="bkNewTitle" value="${esc(p.title)}"></div><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="bkSaveTitle">Speichern</button></div>`);
    const inp=$("#bkNewTitle");inp.focus();inp.select();
    $("#bkSaveTitle").onclick=()=>{const t=inp.value.trim();if(!t)return toast("Bitte einen Titel eingeben.");const lp=projectById(id);if(lp){const leg=editionGroupForProject(lp);if(leg){leg.title=t;leg.updatedAt=now();for(const e of editionBooks(leg)){e.title=t;e.updatedAt=now();}}else{lp.title=t;lp.updatedAt=now();}store.save();}closeModal();render();toast(eg?"Buchtitel in allen Fassungen geändert.":"Titel geändert.");};
  };
}

function editionLibraryCard(g){
  const books=editionBooks(g);if(!books.length)return "";
  const rows=editionSlots(g).map(slot=>{const p=slot.project;if(!p)return `<div class="bk-row bk-band bk-edition-placeholder vc-${slot.color}"><div class="bk-edition-slot-mark">${slot.mark}</div><div class="bk-meta"><span class="bk-band-label">${slot.label}</span><h3>${esc(g.title)}</h3><div class="bk-small">noch nicht angelegt</div></div></div>`;const st=bookStatsRaw(p),info=st.complete?`<span class="ok">✓ Fertig</span> · ${st.total} Kapitel · ${st.words.toLocaleString("de-DE")} Wörter`:st.total?`<span class="work">In Arbeit</span> · ${st.done} von ${st.total} Kapiteln · ${st.words.toLocaleString("de-DE")} Wörter`:"Noch keine Kapitel";
    return `<article class="bk-row bk-band ${st.complete?"complete":""}" data-open="${p.id}"><div class="bk-edition-slot-mark vc-${slot.color}">${slot.mark}</div><div class="bk-meta"><span class="bk-band-label">${slot.label}</span><h3>${esc(p.title)}</h3><div class="bk-small bk-book-stats">${info}</div><div class="bk-created">${esc(bookCreatedLabel(p))}</div><div class="bk-bar ${st.complete?"done":""}"><span style="width:${st.pct}%"></span></div></div><button type="button" class="bk-dots" data-book-menu="${p.id}" aria-label="Optionen für ${slot.label}">⋯</button></article>`;}).join("");
  return `<section class="bk-series bk-editions"><div class="bk-series-head"><div class="bk-icon big">${BOOK_ICON_SVG}</div><div class="bk-meta"><span class="bk-kicker">BUCHFASSUNGEN</span><h3>${esc(g.title)}</h3><div class="bk-small">${books.length} ${books.length===1?"Fassung":"Fassungen"} · vollständig getrennte Speicherstände</div></div></div><div class="bk-series-books">${rows}</div></section>`;
}

function seriesEditionMiniRow(slot){
  const p=slot.project;if(!p)return `<div class="bk-series-edition empty vc-${slot.color}"><span class="bk-series-edition-mark">${slot.mark}</span><div><strong>${slot.label}</strong><small>noch nicht angelegt</small></div></div>`;
  const st=bookStatsRaw(p),info=st.complete?`✓ Fertig · ${st.total} Kapitel · ${st.words.toLocaleString("de-DE")} Wörter`:st.total?`In Arbeit · ${st.done}/${st.total} Kapitel · ${st.words.toLocaleString("de-DE")} Wörter`:`Noch keine Kapitel`;
  return `<article class="bk-series-edition vc-${slot.color} ${st.complete?"complete":""}" data-open="${p.id}"><span class="bk-series-edition-mark">${slot.mark}</span><div class="bk-series-edition-copy"><strong>${slot.label}</strong><small>${info}</small></div><button type="button" class="bk-dots" data-book-menu="${p.id}" aria-label="Optionen für ${slot.label}">⋯</button></article>`;
}
function seriesBandLibraryBlock(p,i){
  const st=bookStats(p),eg=editionGroupForProject(p),hasEditions=eg&&editionBooks(eg).length>1;
  const info=st.complete?`<span class="ok">✓ Fertig</span> · ${st.total} Kapitel · ${st.words.toLocaleString("de-DE")} Wörter`:st.total?`<span class="work">In Arbeit</span> · ${st.done} von ${st.total} Kapiteln · ${st.words.toLocaleString("de-DE")} Wörter`:"Noch keine Kapitel";
  if(!hasEditions)return `<article class="bk-row bk-band ${st.complete?"complete":""}" data-open="${p.id}"><div class="bk-icon band">${BOOK_ICON_SVG}<b>${i+1}</b></div><div class="bk-meta"><span class="bk-band-label">${esc(p.seriesLabel||`Band ${i+1}`)}</span><h3>${esc(p.title)}</h3><div class="bk-small bk-book-stats">${info}</div><div class="bk-created">${esc(bookCreatedLabel(p))}</div><div class="bk-bar ${st.complete?"done":""}"><span style="width:${st.pct}%"></span></div></div><button type="button" class="bk-dots" data-book-menu="${p.id}" aria-label="Optionen für ${esc(p.title)}">⋯</button></article>`;
  return `<section class="bk-series-band-group"><div class="bk-series-band-head"><div class="bk-icon band">${BOOK_ICON_SVG}<b>${i+1}</b></div><div class="bk-meta"><span class="bk-band-label">${esc(p.seriesLabel||`Band ${i+1}`)}</span><h3>${esc(p.title)}</h3><div class="bk-small">${editionBooks(eg).length} Fassungen · jede mit eigenem Speicher</div></div><button type="button" class="bk-dots" data-book-menu="${p.id}" aria-label="Optionen für ${esc(p.title)}">⋯</button></div><div class="bk-series-band-editions">${editionSlots(eg).map(seriesEditionMiniRow).join("")}</div></section>`;
}
function seriesLibraryCard(s){
  const books=seriesBooks(s);
  const totalChapters=books.reduce((n,p)=>n+bookStats(p).total,0),written=books.reduce((n,p)=>n+bookStats(p).done,0),seriesDone=totalChapters>0&&written===totalChapters;
  const rows=books.map(seriesBandLibraryBlock).join("");
  return `<section class="bk-series ${seriesDone?"complete":""}"><div class="bk-series-head"><div class="bk-icon big">${BOOK_ICON_SVG}</div><div class="bk-meta"><span class="bk-kicker">BUCHREIHE</span><h3>${esc(s.title)}</h3><div class="bk-small">${books.length} ${books.length===1?"Band":"Bände"} · ${seriesDone?`<span class="ok">✓ alle ${totalChapters} Kapitel fertig</span>`:`${written} von ${totalChapters||0} Kapiteln geschrieben`}</div></div><button type="button" class="bk-dots" data-series-menu="${s.id}" aria-label="Optionen für die Reihe">⋯</button></div><div class="bk-series-books">${rows}</div></section>`;
}

function openSeriesMenu(id){
  const sr=seriesById(id);if(!sr)return;
  modal(`<div class="bk-menu-head"><div class="bk-icon">${BOOK_ICON_SVG}</div><div><h2 style="margin:0">${esc(sr.title)}</h2><div class="small muted">Buchreihe · ${seriesBooks(sr).length} Bände</div></div></div>
    <div class="bk-menu"><button type="button" id="srAdd">＋ Neuen Band hinzufügen</button><button type="button" id="srRename">✎ Reihe umbenennen &amp; Reihenbibel</button></div>
    <p class="small muted" style="margin-top:10px">Einen einzelnen Band löschen oder umbenennen: über die „⋯“ neben dem Band.</p>
    <div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button></div>`);
  $("#srAdd").onclick=()=>{closeModal();openAddSeriesBook(id);};
  $("#srRename").onclick=()=>{closeModal();openSeriesBible(id);};
}
function projectCard(p){
  const chapters=p.chapters||[],written=chapters.filter(c=>!chapterNeedsWriting(c)),wc=chapters.reduce((n,c)=>n+countWords(c.content),0),complete=chapters.length>0&&written.length===chapters.length;
  const pct=chapters.length?Math.round(written.length/chapters.length*100):0;
  const next=chapters.find(chapterNeedsWriting);
  const progressLabel=chapters.length?(complete?`✓ Alle ${chapters.length} Kapitel fertig`:`${written.length} von ${chapters.length} Kapiteln geschrieben`):`Noch keine Kapitel`;
  return `<article class="card project-card ${complete?"complete":written.length?"in-progress":""}" data-open="${p.id}" style="position:relative">
    <button class="icon-btn delete-project" data-delete-project="${p.id}" title="Buch vollständig löschen" aria-label="${esc(p.title)} vollständig löschen" style="position:absolute;right:10px;top:10px;z-index:3;padding:7px 10px ">🗑</button>
    <div class="cover">${esc(p.title)}</div><div style="padding-right:38px"><div class="meta">${esc(p.genre||"Roman")}</div><h3>${esc(p.title)}</h3>
    <div class="meta"><strong>${progressLabel}</strong> · ${wc.toLocaleString("de-DE")} Wörter${chapters.length?(next?`<br>Nächstes: Kapitel ${next.number} · ${esc(next.title)}`:"<br>✓ Alle Kapitel haben Manuskripttext"):"<br>Noch kein Manuskript vorhanden"}</div><div class="progress chapter-progress-home"><span style="width:${pct}%"></span></div></div>
  </article>`;
}
function workspaceHeaderInfo(){
  const p=projectById(state.activeProjectId);
  if(!p)return {title:"Litterum",sub:""};
  const s=seriesForProject(p);
  if(s){
    const root=seriesBandRoot(p)||p,order=Number(root.seriesOrder)||Math.max(1,seriesBooks(s).findIndex(x=>x.id===root.id)+1);
    const band=String(root.seriesLabel||`Band ${order}`).trim(),eg=editionGroupForProject(p),edition=eg?` · ${editionLabel(p)}`:"";
    return {title:String(s.title||root.title||"Buch"),sub:`${band} · ${String(root.title||"").trim()}${edition}`};
  }
  const eg=editionGroupForProject(p);
  return {title:String(p.title||"Unbenanntes Buch"),sub:eg?editionLabel(p):""};
}
function topbar(workspace=true){
  const planning=workspace?activePlanJob(state.activeProjectId):null,running=workspace?activeWriteJob(state.activeProjectId):null;
  const p=workspace?projectById(state.activeProjectId):null;
  const head=workspace?workspaceHeaderInfo():{title:"Litterum",sub:`Dein privates Buchstudio · v${FABULA_VERSION}`};

  const planText=planning
    ?(planning.j.status==="interrupted"
      ?`Plan-Ausarbeitung pausiert · Kapitel ${planning.j.chapterNumber}`
      :`Kapitelplan wird gerade ausgearbeitet · Kapitel ${planning.j.chapterNumber}`)
    :"";
  const writeText=running
    ?(running.j.status==="interrupted"
      ?`Buchschreiben pausiert · Kapitel ${running.j.chapterNumber}`
      :`Buch wird gerade geschrieben · Kapitel ${running.j.chapterNumber}`)
    :"";

  const planBadge=planning?`<button class="write-job-badge plan ${planning.j.status}" id="planJobBadge" data-project="${planning.p.id}" data-chapter="${planning.j.chapterId}" title="Zum Kapitelplan springen">${planning.j.status==="interrupted"?"◇":"●"} ${esc(planText)}</button>`:"";
  const writeBadge=running?`<button class="write-job-badge ${running.j.status}" id="writeJobBadge" data-project="${running.p.id}" data-chapter="${running.j.chapterId}" title="Zum schreibenden Kapitel springen">${running.j.status==="interrupted"?"◇":"●"} ${esc(writeText)}</button>`:"";

  let fallbackProcess="";
  if(workspace&&p&&!planBadge&&!writeBadge){
    const pm=String(p.planRunner?.lastMessage||"");
    const wm=String(p.bookWriter?.lastMessage||"");
    if(p.planRunner?.running)fallbackProcess=pm||"Plan-Ausarbeitung läuft";
    else if(p.bookWriter?.running)fallbackProcess=wm||"Buch wird geschrieben";
  }
  const liveLine=planBadge||writeBadge||(fallbackProcess?`<span class="workspace-process-text">● ${esc(fallbackProcess)}</span>`:"");

  const iskraLogo=`<div class="brand-mark logo"><img src="/litterum-icon-192-v1924.png" alt="Litterum" /></div>`;

  return `<header class="topbar ${workspace?"workspace-topbar":"home-topbar"}">
    ${workspace?`
      <div class="workspace-actions-row">
        <div class="top-actions">
          <button class="icon-btn" id="openAppSettings" title="Einstellungen" aria-label="Einstellungen">⚙</button>
          <button class="icon-btn" id="readPage" title="Sichtbare Seite vorlesen" aria-label="Vorlesen">🔊</button>
          <button class="icon-btn" id="saveNow" title="Speichern" aria-label="Speichern">✓</button>
        </div>
      </div>

      <div class="workspace-main-row">
        <button class="icon-btn topbar-back" id="backToLibrary" title="Zurück zu Meine Bücher" aria-label="Zurück zu Meine Bücher">‹</button>

        <div class="workspace-book-logo litterum-workspace-logo" aria-hidden="true"><img src="/litterum-icon-192-v1924.png" alt="" /></div>

        <div class="workspace-book-copy">
          <div class="brand-title" title="${esc(head.title)}">${esc(head.title)}</div>
          ${p?`<div class="workspace-variant-line">${variantChipHtml(p)}</div>`:""}
          ${head.sub?`<div class="brand-sub" title="${esc(head.sub)}">${esc(head.sub)}</div>`:""}
          ${liveLine?`<div class="workspace-live-line" aria-label="Aktiver Vorgang">${liveLine}</div>`:""}
        </div>
      </div>
    `:`
      <div class="brand">${iskraLogo}<div class="brand-copy"><div class="brand-title">Litterum</div><div class="brand-sub">${esc(head.sub)}</div></div></div>
      <span class="version-badge" title="Installierte Litterum Version">v${FABULA_VERSION}</span>
      <div class="top-actions"><button class="icon-btn" id="openAppSettings" title="Einstellungen" aria-label="Einstellungen">⚙</button><button class="icon-btn" id="readPage" title="Sichtbare Seite vorlesen">🔊</button><button class="icon-btn" id="newBookTop">＋</button></div>
    `}
  </header>`;
}
function renderWorkspace(){
  const p=project();
  const sideGroups=NAV_GROUPS.map(([label,ids])=>`<div class="side-group"><div class="side-group-label">${label}</div>${ids.map(id=>{const n=navItem(id);return `<button class="nav-btn ${state.activeTab===id?"active":""}" data-tab="${id}">${n[2]} &nbsp; ${n[1]}</button>`}).join("")}</div>`).join("");
  const moreActive=!BOTTOM_NAV.some(n=>n[0]===state.activeTab);
  return `<div class="app-shell">${topbar(true)}<main class="page workspace">
    <aside class="card sidebar"><div class="side-project"><strong>${esc(p.title)}</strong><span>${seriesForProject(p)?`${esc(seriesForProject(p).title)} · ${esc(p.seriesLabel||"Band")}`:esc(p.genre||"Roman")}</span></div>
      <nav class="side-nav">${sideGroups}</nav>
    </aside>
    <section class="content-panel">${renderTab(p)}</section>
  </main>
  <nav class="bottom-nav compact-bottom">${BOTTOM_NAV.map(n=>`<button class="${state.activeTab===n[0]?"active":""}" data-tab="${n[0]}"><span class="ico">${n[2]}</span>${n[1]}</button>`).join("")}<button class="${moreActive?"active":""}" id="moreTabs"><span class="ico">•••</span>Mehr</button></nav>
  </div>`;
}
function renderTab(p){
  switch(state.activeTab){
    case "studio": return studioTab(p);
    case "briefing": return briefingTab(p);
    case "vault": return ideaVaultTab(p);
    case "ideas": return ideasTab(p);
    case "dna": return dnaTab(p);
    case "characters": return charactersTab(p);
    case "relationships": return relationshipsTab(p);
    case "chapters": return chaptersTab(p,false);
    case "manuscript": return chaptersTab(p,true);
    case "reader": return readerTab(p);
    case "style": return styleTab(p);
    case "review": return reviewTab(p);
    case "editorial": return editorialTab(p);
    case "cover": return coverTab(p);
    case "export": return exportTab(p);
    default:return studioTab(p);
  }
}
function ideasTab(p){
  return `<section class="card panel chat"><div class="panel-head"><div><h2>Ideenraum</h2><div class="small muted">Sprich frei über ${esc(p.title)}. Die KI bekommt die Projektdaten als Kontext.</div></div><span class="tag"><span class="status-dot"></span> Projektgedächtnis aktiv</span></div>
  <div class="tts-bar"><span class="tag">AI TTS</span><button class="soft-btn" id="ttsVoiceSettings">🔊 KI-Stimme</button><select id="ttsQuickRate" class="mini-select" title="Vorlesetempo">${[0.9,1,1.15,1.25,1.5,1.75,2].map(r=>`<option value="${r}" ${Math.abs(Number(p.tts.rate||0.95)-r)<0.01?"selected":""}>${r}×</option>`).join("")}</select><button class="ghost-btn" id="ttsPause">⏯ Pause / weiter</button><button class="ghost-btn" id="ttsStopGlobal">■ Stop</button><span class="small muted" data-tts-status role="status">${esc(ttsState.status)}</span></div>
  <div class="messages" id="messages">${p.ideas.map(m=>`<div class="bubble ${m.role==="user"?"user":"ai"}" data-message="${m.id}"><div class="who">${m.role==="user"?"Du":"Litterum"}</div><div class="bubble-text copyable-text">${esc(m.text)}</div><div class="bubble-actions"><button class="speak-mini" data-speak-message="${m.id}" title="Diesen Text vorlesen">🔊 Vorlesen</button><button class="speak-mini copy-message" data-copy-message="${m.id}" title="Nur diesen Text kopieren">⧉ Kopieren</button></div></div>`).join("")}</div>
  <div class="chat-compose"><textarea id="ideaInput" placeholder="Zum Beispiel: Adam soll am Anfang distanzierter sein ..."></textarea><button class="primary-btn" id="sendIdea">Senden</button></div></section>`;
}
function dnaTab(p){
  const d=p.dna;
  const langs=(d.languages||[]);
  return `<section class="card panel"><div class="panel-head"><div><h2>Roman DNA</h2><div class="small muted">Auswählen und trotzdem jederzeit deine eigene Nuance ergänzen.</div></div></div>
  <div class="ai-settings card"><div><div class="small muted">Schreib-KI für dieses Buch</div><strong>${esc(aiProviderMeta(p.ai.authorProvider).label)}</strong><div class="small muted" style="margin-top:4px">Wird pro Buch gespeichert. Der Live-Schreibfortschritt bleibt bei allen vier Anbietern aktiv. Die gründliche Buchprüfung läuft unabhängig von der Schreib-KI mit DeepSeek V4 Pro.${p.ai.authorProvider==="claude"&&Number.isFinite(Number(p.ai.lastClaudeCostUsd))&&p.ai.lastClaudeCostUsd!==undefined?`<br>Letzter abgeschlossener Claude-Kapitel-Stream: ungefähr ${Number(p.ai.lastClaudeCostUsd).toFixed(4)} USD (ohne Steuer).`:""}</div></div><div class="ai-controls"><select id="authorProvider"><option value="deepseek" ${p.ai.authorProvider==="deepseek"?"selected":""}>DeepSeek V4 Pro</option><option value="kimi" ${p.ai.authorProvider==="kimi"?"selected":""}>Kimi K3</option><option value="openai" ${p.ai.authorProvider==="openai"?"selected":""}>OpenAI GPT-5.4 mini</option><option value="claude" ${p.ai.authorProvider==="claude"?"selected":""}>Claude Sonnet 5.5 · Mittel</option></select><button class="soft-btn" id="testAuthorProvider">Verbindung testen</button></div></div>
  <div class="form-grid">
    <div class="field"><label>Genre</label><input class="input" id="genreInput" list="genreList" value="${esc(p.genre||"")}"><datalist id="genreList">${GENRE_SUGGESTIONS.map(x=>`<option value="${esc(x)}">`).join("")}</datalist></div>
    <div class="field"><label>Untergenre</label><input class="input" data-dna="subgenre" value="${esc(d.subgenre||"")}"></div>
    <div class="field wide"><label>Buchsprachen</label><div class="language-tags">${langs.map((l,i)=>`<span class="tag">${esc(l)} <button class="tag-x" data-remove-language="${i}">×</button></span>`).join("")||'<span class="small muted">Noch keine Sprache gewählt.</span>'}</div><div class="language-add"><input class="input" id="languageInput" list="languageList" placeholder="Sprache suchen oder frei eingeben …"><datalist id="languageList">${LANGUAGE_SUGGESTIONS.map(x=>`<option value="${esc(x)}">`).join("")}</datalist><button class="soft-btn" id="addLanguage">＋ Hinzufügen</button></div><input class="input" data-dna="languageNote" value="${esc(d.languageNote||"")}" placeholder="Zum Beispiel: Haupttext Deutsch, einzelne Dialoge Kroatisch mit Übersetzung"></div>
    ${choiceField("perspective","Perspektive",d.perspective,["Personale dritte Person","Ich-Perspektive","Auktorial","Multiperspektivisch","Wechselnde Ich-Perspektiven","Individuell"],d.perspectiveCustom||"")}
    ${choiceField("tense","Zeitform",d.tense,["Präteritum","Präsens","Gezielt gemischt","Individuell"],d.tenseCustom||"")}
    ${choiceField("pace","Erzähltempo",d.pace,["Sehr ruhig","Ruhig","Ruhig bis mittel","Mittel","Dynamisch","Sehr schnell","Individuell"],d.paceCustom||"")}
    ${choiceField("romance","Romantik",d.romance,["Keine","Nebenhandlung","Leicht","Mittel","Zentral","Sehr dominant","Individuell"],d.romanceCustom)}
    ${choiceField("intimacy","Erotik / Intimität",d.intimacy,["Keine","Nur angedeutet","Leicht","Mittel","Intensiv","Sehr intensiv","Individuell"],d.intimacyCustom)}
    ${choiceField("emotionality","Emotionalität",d.emotionality,["Zurückhaltend","Mittel","Intensiv","Sehr intensiv","Individuell"],d.emotionalityCustom)}
    ${choiceField("tension","Spannung",d.tension,["Niedrig","Langsam steigend","Mittel","Hoch","Sehr hoch","Individuell"],d.tensionCustom)}
    ${choiceField("darkness","Düsternis",d.darkness,["Hell","Leicht düster","Düster","Sehr düster","Individuell"],d.darknessCustom)}
    ${choiceField("violence","Gewaltdarstellung",d.violence,["Keine","Angedeutet","Leicht","Mittel","Explizit","Sehr explizit","Individuell"],d.violenceCustom)}
    ${choiceField("humor","Humor",d.humor,["Keiner","Sehr subtil","Subtil","Mittel","Stark","Individuell"],d.humorCustom)}
    ${choiceField("dialogue","Dialoganteil",d.dialogue,["Wenig","Ausgewogen","Viel","Sehr dialogreich","Individuell"],d.dialogueCustom)}
    ${choiceField("philosophy","Philosophischer Anteil",d.philosophy,["Keiner","Leicht","Mittel","Stark","Sehr stark","Individuell"],d.philosophyCustom)}
    <div class="field"><label>Zielwortzahl</label><input class="input" data-dna="targetWords" value="${esc(d.targetWords||"")}"></div>
    <div class="field wide"><label>Atmosphäre</label><textarea data-dna="atmosphere">${esc(d.atmosphere||"")}</textarea></div>
    <div class="field wide"><label>Was soll der Leser fühlen?</label><textarea data-dna="readerFeelings">${esc(d.readerFeelings||"")}</textarea></div>
    <div class="field wide"><label>Eigener Sprach- und Erzählstil</label><textarea data-dna="styleCustom" placeholder="Zum Beispiel: erwachsen, sinnlich, psychologisch nah, lange fließende Sätze, wenig Pathos …">${esc(d.styleCustom||"")}</textarea></div>
    <div class="field wide"><label>Prämisse</label><textarea data-dna="premise">${esc(d.premise||"")}</textarea></div>
  </div></section>`;
}

function bookPlanText(p){
  const bp=p.bookPlan;if(!bp)return "";
  const out=[`BUCHPLAN – ${p.title}`];
  if(bp.bookVision)out.push(`\nROMANVISION\n${bp.bookVision}`);
  if(bp.centralPlot)out.push(`\nZENTRALER PLOT\n${bp.centralPlot}`);
  for(const [pi,part] of (bp.parts||[]).entries()){
    out.push(`\nTEIL ${pi+1}: ${part.title||""}`.trim());
    if(part.purpose)out.push(part.purpose);
    if(part.arc)out.push(`Bogen: ${part.arc}`);
    for(const ch of part.chapters||[]){
      out.push(`\nKapitel ${ch.number||""}: ${ch.title||""}`.trim());
      if(ch.perspective)out.push(`Perspektive: ${ch.perspective}`);
      if(ch.location)out.push(`Ort: ${ch.location}`);
      if(ch.sceneGoal)out.push(`Szenenziel: ${ch.sceneGoal}`);
      if(ch.emotionalMove)out.push(`Emotion: ${ch.emotionalMove}`);
      if(ch.development)out.push(`Entwicklung: ${ch.development}`);
      if(ch.newInformation)out.push(`Neu: ${ch.newInformation}`);
      if(ch.withhold)out.push(`Noch nicht verraten: ${ch.withhold}`);
      if(ch.relationshipMovement)out.push(`Beziehung: ${ch.relationshipMovement}`);
      if(ch.consequence)out.push(`Konsequenz: ${ch.consequence}`);
      if(ch.bridge)out.push(`Übergang: ${ch.bridge}`);
    }
  }
  return out.join("\n").trim();
}
function myDeviceId(){return "local";}
function writerBeat(p){if(p?.bookWriter)p.bookWriter.heartbeatAt=now();}
function writerLockFresh(p){const t=Date.parse(p?.bookWriter?.heartbeatAt||p?.updatedAt||"");return Number.isFinite(t)&&Date.now()-t<10*60*1000;}
function writerOwnedByOtherDevice(p){return false;}
function bookWriterRunsElsewhere(p){return writerOwnedByOtherDevice(p)&&writerLockFresh(p);}
// Anderes Gerät hat angefangen, arbeitet aber seit über 10 Minuten nicht mehr (z. B. App dort geschlossen).
function bookWriterStaleElsewhere(p){return writerOwnedByOtherDevice(p)&&!writerLockFresh(p);}
function takeOverBookWriter(){
  const p=project();if(!p?.bookWriter?.running)return;
  p.bookWriter.ownerDeviceId=myDeviceId();writerBeat(p);p.bookWriter.lastMessage="Wird auf diesem Gerät fortgesetzt …";save();render();resumeWholeBookWriter();
}

function partWorkflowProgress(p){
  const w=ensurePartWorkflowShape(p),parts=w.parts||[];
  let completed=0,current=0;
  parts.forEach((x,i)=>{if(x.status==="written")completed++;else if(!current&&["planned","writing","developing","refining","error","ready"].includes(x.status))current=i+1;});
  if(!current)current=Math.min(completed+1,parts.length||1);
  return {completed,current,total:parts.length};
}
function partChapterList(p,index){return (p.chapters||[]).filter(c=>Number(c.partIndex)===Number(index));}
function partStatusText(p,index){
  const w=ensurePartWorkflowShape(p),part=w.parts[index],list=partChapterList(p,index),written=list.filter(c=>String(c.content||"").trim()).length;
  if(!part)return "";
  if(part.status==="locked")return `Wird freigeschaltet, sobald Teil ${index} vollständig geschrieben und als Zwischenstand gespeichert ist.`;
  if(part.status==="developing"||part.status==="refining")return part.qualityStatus||"Die KI entwickelt diesen Romanteil …";
  if(part.status==="error")return `Nicht abgeschlossen: ${part.error||part.qualityStatus||"Unbekannter Fehler"}`;
  if(part.status==="planned"){const ready=list.filter(c=>!chapterNeedsPlan(c)).length;return `${list.length} Kapitel entwickelt. ${ready}/${list.length} Kapitelpläne vollständig ausgearbeitet.${ready===list.length?" Dieser Teil ist bereit zum Schreiben.":" Arbeite zuerst die Kapitelpläne aus."}`;}
  if(part.status==="writing")return `${written}/${list.length} Kapitel dieses Teils geschrieben. ${p.bookWriter?.lastMessage||""}`;
  if(part.status==="written")return `${list.length} Kapitel abgeschlossen. Der Canon-Zwischenstand für den nächsten Teil ist gespeichert.`;
  return "Die KI entwickelt nur diesen Teil in echte Kapitel. Die Kapitelzahl entscheidet sie selbst nach Dramaturgie.";
}
function studioPartCard(p,part,index){
  const w=ensurePartWorkflowShape(p),list=partChapterList(p,index),busy=["developing","refining"].includes(part.status),running=!!p.bookWriter?.running&&Number(p.bookWriter?.targetPartIndex)===index,remote=bookWriterRunsElsewhere(p);
  const prevOk=index===0||w.parts[index-1]?.status==="written";
  const canDevelop=prevOk&&!busy&&!running&&part.status!=="written";
  const partPlansReady=list.length>0&&!list.some(chapterNeedsPlan);
  const canWrite=part.status==="planned"&&!p.bookWriter?.running&&!projectPlanningActive(p)&&partPlansReady;
  const label=part.title||`Teil ${index+1}`;
  return `<article class="card studio-step studio-part-step ${part.status==="written"?"ready":busy||running?"working":part.status==="error"?"error":""}">
    <div class="studio-step-no">${index+2}</div><div class="studio-step-main"><h3>${esc(label)}</h3><p>${esc(partStatusText(p,index))}${busy?developmentActivityHtml(p):""}</p>
    <div class="studio-part-actions">${canDevelop?`<button type="button" class="primary-btn" data-develop-part="${index}">✦ ${part.status==="error"?"Erneut entwickeln":`${esc(label)} entwickeln`}</button>`:""}${canWrite?`<button type="button" class="primary-btn" data-write-part="${index}">✎ ${esc(label)} schreiben</button>`:""}${running&&!remote&&!bookWriterStaleElsewhere(p)?`<button class="danger-btn" id="stopWholeBookNow">■ Sofort stoppen</button><button class="ghost-btn" id="stopWholeBook">Nach aktuellem Kapitel stoppen</button>`:""}${running&&remote?`<span class="part-complete-badge">Auf anderem Gerät aktiv</span>`:""}${running&&bookWriterStaleElsewhere(p)?`<button class="soft-btn" id="takeoverWriter">Hier weiterschreiben</button>`:""}${part.status==="written"?`<span class="part-complete-badge done">✓ Fertig</span>`:""}</div>
    <details class="part-briefing-details"><summary>Teil-Briefing ${part.briefing?"· vorhanden":"· optional"}</summary><div class="field"><label>Titel dieses Teils</label><input class="input" data-part-title="${index}" value="${esc(label)}"></div><div class="field"><label>Zusätzliche Wünsche nur für diesen Teil</label><textarea data-part-briefing="${index}" rows="5" placeholder="Optional: Was soll in diesem Teil besonders wichtig sein? Das Gesamtbriefing gilt automatisch weiter.">${esc(part.briefing||"")}</textarea></div>${part.summary?`<div class="part-handoff"><strong>Zwischenstand</strong><p>${esc(part.summary)}</p>${part.handoff?`<p class="small muted"><strong>Übergang:</strong> ${esc(part.handoff)}</p>`:""}</div>`:""}</details></div></article>`;
}

// ---------- Ganzes Buch übersetzen ----------
const activeTranslatorRuntimes=new Map();
const activeTranslatorAbortControllers=new Map();
function translationEditionCardHtml(p,e){
  const q=translationEditionProgress(p,e),done=q.total>0&&q.open===0&&!e.running;
  return `<article class="translation-edition ${done?"done":e.running?"running":""}"><div><strong>${esc(e.language)}</strong><span>${e.sourceVariantName?`${esc(e.sourceVariantName)} · `:""}${q.done}/${q.total} Kapitel${q.outdated?` · ${q.outdated} zu aktualisieren`:""}</span></div><div class="translation-edition-actions"><button class="soft-btn" data-open-translation="${e.id}">${e.running?"Fortschritt":done?"Ansehen":"Öffnen"}</button>${done?`<button class="primary-btn" data-download-translation="${e.id}">EPUB</button>`:""}</div></article>`;
}
function openBookTranslator(selectedId=null){
  const p=project();if(!p)return;
  const ready=bookRevisionComplete(p),x=ensureTranslationsShape(p),selected=x.editions.find(e=>e.id===(selectedId||x.activeId))||null;if(selected)x.activeId=selected.id;
  const sourceLanguage=String(p.dna?.languages?.[0]||"Deutsch");
  const list=x.editions.map(e=>translationEditionCardHtml(p,e)).join("")||`<div class="card" style="padding:13px"><strong>Noch keine Übersetzung angelegt.</strong><div class="small muted" style="margin-top:4px">Dein überarbeitetes Original bleibt unverändert. Jede Sprache wird als eigene Fassung gespeichert.</div></div>`;
  const selectedBlock=selected?(()=>{const q=translationEditionProgress(p,selected),valid=(selected.chapters||[]).filter(tc=>{const c=(p.chapters||[]).find(x=>x.id===tc.chapterId);return c&&tc.sourceSignature===reviewContentSignature(c.content||"")&&String(tc.content||"").trim();});return `<section class="card translation-active-card"><div class="panel-head"><div><span class="original-idea-kicker">AKTIVE SPRACHFASSUNG</span><h3>${esc(selected.language)}</h3><div class="small muted">${q.done} von ${q.total} Kapiteln aktuell · ${q.percent}%${q.outdated?` · ${q.outdated} Kapitel müssen wegen Änderungen am Original neu übersetzt werden.`:""}</div></div></div><div class="progress"><span style="width:${q.percent}%"></span></div><p class="small muted">${esc(selected.lastMessage||"Bereit zum Übersetzen.")}</p><div class="studio-write-actions">${selected.running?`<button class="danger-btn" id="stopTranslationNowModal">■ Sofort stoppen</button><button class="ghost-btn" id="stopTranslationAfterCurrentModal">Nach aktuellem Kapitel stoppen</button>`:`<button class="primary-btn" id="startTranslationEdition">${q.done?"↻ Fehlende Kapitel übersetzen":"🌐 Übersetzung starten"}</button>`}${q.open===0&&q.total?`<button class="soft-btn" id="downloadTranslationEpub">EPUB herunterladen</button>`:""}${valid.length?`<button class="ghost-btn" id="viewTranslationChapter">Übersetzung ansehen</button>`:""}</div></section>`;})():"";
  modal(`<h2>Buch übersetzen</h2><p class="small muted">Litterum übersetzt die aktuell geöffnete, vollständig überarbeitete Buchfassung Kapitel für Kapitel. Stil, Erzählstimme, Perspektive, Dialogwirkung, Namen und erfundene Begriffe sollen erhalten bleiben. Dein Original wird niemals überschrieben.</p>${!ready?`<div class="book-variant-process-note"><strong>Noch gesperrt:</strong> Übersetzen wird freigeschaltet, sobald „Buch überarbeitet“ vollständig fertig ist.</div>`:""}${selectedBlock}<section class="translation-list">${list}</section>${ready?`<section class="card" style="padding:14px;margin-top:14px"><strong>Neue Sprache hinzufügen</strong><div class="language-add" style="margin-top:9px"><input class="input" id="translationLanguage" list="translationLanguageList" placeholder="Zum Beispiel Englisch oder Kroatisch"><datalist id="translationLanguageList">${LANGUAGE_SUGGESTIONS.filter(l=>l.toLowerCase()!==sourceLanguage.toLowerCase()).map(l=>`<option value="${esc(l)}">`).join("")}</datalist><button class="soft-btn" id="createTranslationEdition">＋ Sprache</button></div><div class="small muted" style="margin-top:6px">Ausgangssprache laut Buch-DNA: ${esc(sourceLanguage)}. Pro Sprache wird eine eigene, getrennte Übersetzung gespeichert.</div></section>`:""}<div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button></div>`,"wide");
  $$('[data-open-translation]').forEach(b=>b.onclick=()=>{x.activeId=b.dataset.openTranslation;p.updatedAt=now();store.save({sync:false});closeModal();openBookTranslator(b.dataset.openTranslation);});
  $$('[data-download-translation]').forEach(b=>b.onclick=()=>downloadTranslationEpubById(p,b.dataset.downloadTranslation));
  $("#createTranslationEdition")?.addEventListener("click",()=>{const language=$("#translationLanguage").value.trim();if(!language)return toast("Wähle zuerst eine Zielsprache.");if(language.toLowerCase()===sourceLanguage.toLowerCase())return toast("Das ist bereits die Ausgangssprache des Buches.");const existing=x.editions.find(e=>e.language.toLowerCase()===language.toLowerCase());if(existing){x.activeId=existing.id;store.save({sync:false});closeModal();openBookTranslator(existing.id);return;}const v=translationSourceVariant(p),e={id:uid(),language,languageCode:translationLanguageCode(language),bookTitle:"",sourceVariantId:v.id,sourceVariantName:v.name,chapters:[],running:false,stopAfterCurrent:false,immediateStop:false,currentChapterId:"",completed:0,total:(p.chapters||[]).filter(c=>String(c.content||"").trim()).length,lastMessage:"Bereit zum Übersetzen",createdAt:now(),updatedAt:now(),startedAt:"",finishedAt:"",lastHeartbeat:0};x.editions.push(e);x.activeId=e.id;p.updatedAt=now();store.save();closeModal();openBookTranslator(e.id);});
  $("#startTranslationEdition")?.addEventListener("click",()=>{startTranslationEdition(p.id,selected.id);setTimeout(()=>openStudioProcessMonitor("translate"),180);});
  $("#stopTranslationNowModal")?.addEventListener("click",()=>stopTranslationNow(p,selected));
  $("#stopTranslationAfterCurrentModal")?.addEventListener("click",()=>stopTranslationAfterCurrent(p,selected));
  $("#downloadTranslationEpub")?.addEventListener("click",()=>downloadTranslationEpubById(p,selected.id));
  $("#viewTranslationChapter")?.addEventListener("click",()=>openTranslatedChapterViewer(p,selected));
}
function openTranslatedChapterViewer(p,e){
  const valid=(p.chapters||[]).map(c=>{const x=(e.chapters||[]).find(t=>t.chapterId===c.id);return x&&x.sourceSignature===reviewContentSignature(c.content||"")&&String(x.content||"").trim()?x:null;}).filter(Boolean);if(!valid.length)return toast("Noch keine fertige Übersetzung vorhanden.");
  const first=valid[0];modal(`<h2>${esc(e.language)} · Übersetzung</h2><div class="field"><label>Kapitel</label><select id="translatedChapterSelect">${valid.map(x=>`<option value="${x.chapterId}">Kapitel ${x.number} · ${esc(x.title)}</option>`).join("")}</select></div><div id="translatedChapterView" class="original-idea-text" style="max-height:58vh"></div><div class="modal-actions"><button class="ghost-btn" id="backToTranslations">Zurück</button></div>`,"wide");const renderOne=()=>{const x=valid.find(v=>v.chapterId===$("#translatedChapterSelect").value)||first;$("#translatedChapterView").innerHTML=`<h3>${esc(x.title)}</h3><div class="copyable-text" style="white-space:pre-wrap">${esc(x.content)}</div>`;};$("#translatedChapterSelect").onchange=renderOne;$("#backToTranslations").onclick=()=>{closeModal();openBookTranslator(e.id);};renderOne();
}
function stopTranslationAfterCurrent(p,e){if(!e?.running)return;e.stopAfterCurrent=true;e.lastMessage="Stoppt nach dem aktuellen Kapitel …";p.updatedAt=now();store.save();render();toast("Die Übersetzung stoppt nach dem aktuellen Kapitel.");}
function stopTranslationNow(p,e){if(!e?.running)return;e.immediateStop=true;e.running=false;e.stopAfterCurrent=false;e.lastMessage="Sofort gestoppt – bereits fertige Kapitel bleiben gespeichert.";e.currentChapterId="";e.updatedAt=now();p.updatedAt=now();try{activeTranslatorAbortControllers.get(p.id)?.abort();}catch{}store.save();render();toast("Übersetzung gestoppt. Bereits fertige Kapitel bleiben erhalten.");}
function startTranslationEdition(projectId,editionId){
  const p=projectById(projectId);if(!p)return;if(!bookRevisionComplete(p))return toast("Übersetzen wird erst nach der vollständigen Buchüberarbeitung freigeschaltet.");if(projectPlanningActive(p)||projectWritingActive(p)||p.reviewRunner?.running||p.bookReviser?.running)return toast("Bitte beende zuerst den laufenden Buchvorgang.");
  const x=ensureTranslationsShape(p),e=x.editions.find(v=>v.id===editionId);if(!e)return;if(runningTranslationEdition(p)&&!e.running)return toast("Es läuft bereits eine andere Übersetzung dieses Buches.");const q=translationEditionProgress(p,e);if(q.total&&q.open===0)return toast(`${e.language} ist bereits vollständig übersetzt.`);
  e.running=true;e.stopAfterCurrent=false;e.immediateStop=false;e.startedAt=e.startedAt||now();e.finishedAt="";e.total=q.total;e.completed=q.done;e.lastMessage="Übersetzung gestartet …";e.lastHeartbeat=Date.now();x.activeId=e.id;p.updatedAt=now();store.save();closeModal();render();resumeBookTranslator();
}
function resumeBookTranslator(){
  if(document.hidden||store.readOnly||!state.activeProjectId||navigator.onLine===false)return;const p=projectById(state.activeProjectId),e=runningTranslationEdition(p);if(!p||!e||activeTranslatorRuntimes.has(p.id))return;const pid=p.id,eid=e.id;activeTranslatorRuntimes.set(pid,{pending:true,editionId:eid});setTimeout(async()=>{let r;try{r=await runExclusive("translate-book-"+pid,()=>runBookTranslatorLoop(pid,eid));}finally{if(activeTranslatorRuntimes.get(pid)?.pending)activeTranslatorRuntimes.delete(pid);}if(r==="locked")whenLockFree("translate-book-"+pid,()=>{if(state.activeProjectId===pid)resumeBookTranslator();});},250);
}
async function translateChapterForEdition(p,c,e){
  let full="";await apiStreamChapter("translate_chapter",{chapter:{number:c.number,title:c.title,content:c.content},targetLanguage:e.language},d=>{full+=d;e.lastHeartbeat=Date.now();},p,{onController:ctrl=>{if(ctrl)activeTranslatorAbortControllers.set(p.id,ctrl);else activeTranslatorAbortControllers.delete(p.id);},manualAbort:()=>!!e.immediateStop});return parseTranslationOutput(full,c.title);
}
async function runBookTranslatorLoop(pid,eid){
  activeTranslatorRuntimes.set(pid,{running:true,editionId:eid});const delays=[3500,10000,25000];
  try{for(;;){const p=projectById(pid),x=p&&ensureTranslationsShape(p),e=x?.editions.find(v=>v.id===eid);if(!p||!e?.running)break;const source=(p.chapters||[]).filter(c=>String(c.content||"").trim()&&!c.writeIncomplete),byId=new Map((e.chapters||[]).map(v=>[v.chapterId,v]));const c=source.find(ch=>{const old=byId.get(ch.id);return !old||!String(old.content||"").trim()||old.sourceSignature!==reviewContentSignature(ch.content||"");});
    if(!c){const q=translationEditionProgress(p,e);e.running=false;e.currentChapterId="";e.completed=q.done;e.total=q.total;e.finishedAt=now();e.updatedAt=now();e.lastMessage=`Fertig – ${q.done}/${q.total} Kapitel auf ${e.language} übersetzt`;p.updatedAt=now();store.save();if(project()?.id===pid){render();toast(`${e.language}: Übersetzung fertig.`,5000);}break;}
    e.currentChapterId=c.id;e.total=source.length;e.lastHeartbeat=Date.now();e.lastMessage=`Kapitel ${c.number} wird auf ${e.language} übersetzt …`;p.updatedAt=now();store.save();if(project()?.id===pid)render();let result=null,paused=false;
    for(let attempt=0;;attempt++){const startedAt=Date.now();try{result=await translateChapterForEdition(p,c,e);break;}catch(err){if(err?.manualStop||e.immediateStop)return true;const transient=!!err?.retryable||isTransientApiError(err);if(transient&&(document.hidden||navigator.onLine===false)){paused=true;break;}if(transient&&lastHiddenAt>=startedAt){attempt=-1;await sleep(1200);continue;}if(!transient||attempt>=delays.length)throw err;e.lastMessage=`Kapitel ${c.number}: Verbindung kurz unterbrochen – neuer Versuch in ${delays[attempt]/1000} Sek. …`;e.lastHeartbeat=Date.now();store.save();if(project()?.id===pid)render();await sleep(delays[attempt]);if(!projectById(pid)||!ensureTranslationsShape(projectById(pid)).editions.find(v=>v.id===eid)?.running)return true;}}
    const lp=projectById(pid),le=lp&&ensureTranslationsShape(lp).editions.find(v=>v.id===eid),lc=lp?.chapters?.find(x=>x.id===c.id);if(!le||!lc)break;if(paused){le.lastMessage="Pausiert – geht automatisch weiter, sobald Litterum wieder offen und online ist.";store.save();if(project()?.id===pid)render();break;}if(result?.text){const row=(le.chapters||[]).find(v=>v.chapterId===lc.id)||{chapterId:lc.id};Object.assign(row,{number:lc.number,title:result.title||lc.title,content:result.text,sourceSignature:reviewContentSignature(lc.content||""),translatedAt:now()});if(!le.chapters.some(v=>v.chapterId===lc.id))le.chapters.push(row);if(!le.bookTitle){try{le.bookTitle=String(await api("translate_title",{targetLanguage:le.language,title:lp.title},{projectOverride:lp,context:"light",timeoutMs:90000})).trim()||lp.title;}catch{le.bookTitle=lp.title;}}}
    const q=translationEditionProgress(lp,le);le.completed=q.done;le.total=q.total;le.currentChapterId="";le.updatedAt=now();le.lastHeartbeat=Date.now();le.lastMessage=`Kapitel ${lc.number} fertig · ${q.done}/${q.total}`;lp.updatedAt=now();store.save();if(project()?.id===pid)render();if(le.stopAfterCurrent){le.running=false;le.stopAfterCurrent=false;le.finishedAt=now();le.lastMessage=`Nach Kapitel ${lc.number} gestoppt · ${q.done}/${q.total} fertig`;store.save();if(project()?.id===pid)render();break;}
  }}catch(err){const p=projectById(pid),e=p&&ensureTranslationsShape(p).editions.find(v=>v.id===eid);if(e){e.running=false;e.currentChapterId="";e.finishedAt=now();e.lastMessage=readableError(err,"Übersetzung unterbrochen");p.updatedAt=now();store.save();}if(project()?.id===pid){render();toast(e?.lastMessage||"Übersetzung unterbrochen",6000);}}finally{activeTranslatorAbortControllers.delete(pid);activeTranslatorRuntimes.delete(pid);}return true;
}
async function downloadTranslationEpubById(p,id){
  const e=ensureTranslationsShape(p).editions.find(v=>v.id===id);if(!e)return;const q=translationEditionProgress(p,e);if(!q.total||q.open)return toast(`Die Übersetzung ist noch nicht vollständig (${q.done}/${q.total}).`);const rows=(p.chapters||[]).filter(c=>String(c.content||"").trim()).map(c=>{const x=e.chapters.find(v=>v.chapterId===c.id);return {number:c.number,title:x?.title||c.title,content:x?.content||""};});let coverData="";try{coverData=await composedFrontCoverDataUrl(p);}catch{}downloadBlob(`${safeName(e.bookTitle||p.title)}-${safeName(e.language)}.epub`,new Blob([epubBytes(p,rows,coverData,{title:e.bookTitle||p.title,languageCode:e.languageCode||translationLanguageCode(e.language),translated:true})],{type:"application/epub+zip"}));toast(`${e.language}-EPUB wurde erstellt.`);
}
function bookTranslatorCardHtml(p,no){
  const ready=bookRevisionComplete(p),running=runningTranslationEdition(p),done=completedTranslationEditions(p),active=running||activeTranslationEdition(p),q=active?translationEditionProgress(p,active):null;
  const text=running?`${esc(running.lastMessage||"Übersetzung läuft …")} · ${q?.done||0}/${q?.total||0} Kapitel fertig`:done.length?`${done.length===1?done[0].language:`${done.length} Sprachen`} vollständig übersetzt. Weitere Sprachen können jederzeit ergänzt werden.`:ready?"Die überarbeitete Buchfassung kann jetzt literarisch in eine weitere Sprache übersetzt werden.":"Wird freigeschaltet, sobald das Buch vollständig überarbeitet ist.";
  return `<article class="card studio-step ${running?"working":done.length?"done":""}"><div class="studio-step-no">${no}</div><div><h3>Buch übersetzen</h3><p>${text}</p><div class="studio-write-actions"><button class="${done.length?"soft-btn":"primary-btn"}" id="openBookTranslatorCard" ${!ready&&!running?"disabled":""}>🌐 ${running?"Fortschritt ansehen":done.length?"Sprachfassungen verwalten":"Übersetzung anlegen"}</button></div></div></article>`;
}

// ---------- Ganzes Buch überarbeiten ----------
// Die Autorin gibt eigene Ideen für das ganze Buch vor („Rahel soll selbstbewusster wirken, mehr Humor“).
// Fabula überarbeitet danach Kapitel für Kapitel, hebt jeweils die vorige Fassung auf, aktualisiert das
// Kapitelgedächtnis und setzt nach Unterbrechungen (Hintergrund, Verbindung, Neuladen) automatisch fort.
// Die ganze Überarbeitung lässt sich mit einem Tipp rückgängig machen.
const activeReviserRuntimes=new Map();
const activeReviserAbortControllers=new Map();
function bookReviserProgressData(p){
  const r=p?.bookReviser||{},ids=Array.isArray(r.ids)?r.ids:[],done=Array.isArray(r.done)?r.done:[];
  const doneSet=new Set(done),completed=ids.filter(id=>doneSet.has(id)).length,total=ids.length;
  const current=(p?.chapters||[]).find(c=>c.id===r.currentId)||null;
  return {r,ids,done,completed,total,percent:total?Math.round(completed/total*100):0,current,remaining:Math.max(0,total-completed)};
}
function bookReviserRowsHtml(p){
  const q=bookReviserProgressData(p),doneSet=new Set(q.done);
  return q.ids.map(id=>{const c=(p.chapters||[]).find(x=>x.id===id);if(!c)return "";const current=q.r.running&&q.r.currentId===id,finished=doneSet.has(id),label=finished?"✓ Fertig":current?"● Wird überarbeitet …":"Wartet";return `<div class="book-reviser-row ${finished?"done":current?"on":""}"><span>${c.number}</span><strong>${esc(c.title||`Kapitel ${c.number}`)}</strong><em>${label}</em></div>`;}).join("");
}
function bookReviserCardHtml(p,no){
  const written=(p.chapters||[]).filter(c=>String(c.content||"").trim());
  if(!written.length)return "";
  const q=bookReviserProgressData(p),r=q.r,running=!!r.running;
  const canUndo=!running&&r.jobId&&(p.chapters||[]).some(c=>c.versions?.[0]?.tag===r.jobId);
  const resumable=!running&&!!r.jobId&&q.total>0&&q.remaining>0;
  const modeLabel=bookReviserModeLabel(bookReviserModeOf(r));
  const text=running?`${esc(r.lastMessage||"Wird überarbeitet …")} · ${q.completed}/${q.total} Kapitel fertig · ${modeLabel}`:resumable?`Pausiert · ${q.completed}/${q.total} Kapitel fertig · ${modeLabel}. Du kannst genau hier fortsetzen.`:r.finishedAt&&r.jobId?`Zuletzt überarbeitet: ${q.completed}/${q.total} Kapitel · ${modeLabel}${r.wish?` – „${esc(previewText(r.wish,90))}“`:""}. ${esc(r.lastMessage||"")}`:"Lege zuerst fest, nach welchem Auftrag das Buch überarbeitet werden soll. Dein Auftrag hat Vorrang; gute Passagen werden geschützt.";
  return `<article class="card studio-step ${running?"working":""}"><div class="studio-step-no">${no}</div><div><h3>Buch überarbeiten</h3><p>${text}</p><div class="studio-write-actions">${running||resumable?`<button class="soft-btn" id="openBookReviserProgress">${running?"Fortschritt ansehen":"Fortsetzen / Fortschritt"}</button>`:`<button class="soft-btn" id="openBookReviser" ${p.bookWriter?.running?"disabled":""}>✎ Buch überarbeiten</button>`}${canUndo?`<button class="ghost-btn" id="undoBookReviser">↶ Überarbeitung rückgängig</button>`:""}</div></div></article>`;
}
function openBookReviserProgress(){return openStudioProcessMonitor("revise");}
function bookReviserModeOf(r){
  if(["targeted","editorial","full"].includes(r?.revisionMode))return r.revisionMode;
  if(r?.jobId)return r?.intensity==="strong"?"full":"targeted";
  return "editorial";
}
function bookReviserModeLabel(mode){
  return mode==="targeted"?"Nur mein Auftrag":mode==="full"?"Vollüberarbeitung":"Prüfung + Auftrag";
}
function bookReviserDefaultPrompt(){
  return "Funktionierende Passagen bewahren. Nur Stellen verändern, die künstlich, steif, erklärend, repetitiv oder sprachlich schwach wirken. KI-typische Satzmuster und Stakkato vermeiden. Gute Szenen nicht aus Geschmacksgründen neu schreiben. Wenn nötig, dürfen schwache Absätze oder Szenen vollständig neu gefasst werden, solange Handlung, Figurenlogik, Perspektive und Canon erhalten bleiben.";
}
function openBookReviser(){
  const p=project();if(!p)return;
  const written=(p.chapters||[]).filter(c=>String(c.content||"").trim());
  if(!written.length)return toast("Es gibt noch keine geschriebenen Kapitel.");
  if(p.bookWriter?.running)return toast("Bitte warte, bis „Buch schreiben“ fertig ist oder gestoppt wurde.");
  const r=p.bookReviser||{},first=written[0].number,last=written[written.length-1].number;
  const q=bookReviserProgressData(p),editingExisting=!!r.jobId&&!r.running&&q.remaining>0;
  const existingNums=(r.ids||[]).map(id=>(p.chapters||[]).find(c=>c.id===id)?.number).filter(Number.isFinite);
  const defaultFrom=editingExisting&&existingNums.length?Math.min(...existingNums):first,defaultTo=editingExisting&&existingNums.length?Math.max(...existingNums):last;
  const savedMode=bookReviserModeOf(r);
  const savedProtect=String(r.protect||"");
  const savedFreedom=String(r.freedom||"");
  modal(`<h2>Buch überarbeiten</h2>
    <p class="small muted">Du bestimmst die Richtung. Dein Überarbeitungsauftrag hat Vorrang; Litterum verändert nicht einfach nach eigenem Geschmack. Die vorige Fassung jedes Kapitels bleibt unter „Rückgängig“ erhalten.</p>

    <div class="field revision-main-prompt"><label>Überarbeitungsauftrag</label><textarea id="reviserWish" rows="7" placeholder="Beschreibe konkret, wie dieses Buch überarbeitet werden soll. Zum Beispiel: Nur Stellen ändern, die künstlich oder nach KI klingen. Gute Passagen schützen. Schwache Szenen bei Bedarf vollständig neu fassen. Natürliches, hochwertiges Deutsch; keine Stakkato-Kurzsatzfolgen.">${esc(r.wish||"")}</textarea><div class="revision-prompt-tools"><button type="button" class="ghost-btn" id="insertRecommendedRevisionPrompt">Empfohlenen Auftrag einsetzen</button><span class="small muted">Du kannst ihn danach frei anpassen.</span></div></div>

    <div class="field"><label>Überarbeitungsmodus</label>
      <div class="revision-mode-grid">
        <label class="revision-mode-card"><input type="radio" name="reviserMode" value="targeted" ${savedMode==="targeted"?"checked":""}><span><strong>Nur mein Auftrag</strong><em>Ändert nur, was du ausdrücklich verlangst. Alles andere bleibt möglichst unangetastet.</em></span></label>
        <label class="revision-mode-card recommended"><input type="radio" name="reviserMode" value="editorial" ${savedMode==="editorial"?"checked":""}><span><b>EMPFOHLEN</b><strong>Prüfung + Auftrag</strong><em>Dein Auftrag hat Vorrang. Zusätzlich werden vorhandene Kapitelprüfungen genutzt, ohne gute Passagen unnötig umzuschreiben.</em></span></label>
        <label class="revision-mode-card"><input type="radio" name="reviserMode" value="full" ${savedMode==="full"?"checked":""}><span><strong>Vollüberarbeitung</strong><em>Prüft und verbessert Stil, Wiederholungen, Logik, Wirkung und Prosa umfassend. Größere Neufassungen sind erlaubt.</em></span></label>
      </div>
    </div>

    <details class="revision-guardrails" ${savedProtect||savedFreedom?"open":""}><summary><strong>Leitplanken & Freiheiten</strong><span class="small muted">Optional, aber hilfreich bei wichtigen Romanfassungen</span></summary>
      <div class="field"><label>Unbedingt beibehalten</label><textarea id="reviserProtect" rows="3" placeholder="Zum Beispiel: Handlung, Figurenidentität, Perspektive, Zeitform, starke emotionale Szenen, bestimmte Motive oder Lieblingsstellen.">${esc(savedProtect)}</textarea></div>
      <div class="field"><label>Darf stärker verändert werden</label><textarea id="reviserFreedom" rows="3" placeholder="Zum Beispiel: Künstlich klingende Absätze, steife Dialoge und schwache Szenen dürfen komplett neu geschrieben werden. Kapitel nur dann stärker umbauen, wenn es für Qualität und Logik nötig ist.">${esc(savedFreedom)}</textarea></div>
    </details>

    <div class="form-grid compact"><div class="field"><label>Ab Kapitel</label><input class="input" id="reviserFrom" type="number" min="${first}" max="${last}" value="${defaultFrom}"></div><div class="field"><label>Bis Kapitel</label><input class="input" id="reviserTo" type="number" min="${first}" max="${last}" value="${defaultTo}"></div></div>
    <div class="revision-safety-note"><strong>Schutz vor unnötigem Umschreiben</strong><span>Gute Stellen bleiben bestehen. Prüfhinweise sind Hinweise, keine Befehle. Dein Auftrag und der feste Canon des Buches haben Vorrang.</span></div>
    <div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="startBookReviser">${editingExisting?"✓ Speichern & fortsetzen":"✎ Überarbeitung starten"}</button></div>`);
  $("#insertRecommendedRevisionPrompt")?.addEventListener("click",()=>{const el=$("#reviserWish");if(!el)return;if(el.value.trim()&&!confirm("Den bisherigen Auftrag durch den empfohlenen Startauftrag ersetzen?"))return;el.value=bookReviserDefaultPrompt();el.focus();});
  $("#startBookReviser").onclick=()=>{
    const wish=$("#reviserWish").value.trim();if(!wish)return toast("Schreib zuerst deinen Überarbeitungsauftrag.");
    const from=Number($("#reviserFrom").value)||first,to=Number($("#reviserTo").value)||last;
    const ids=(p.chapters||[]).filter(c=>String(c.content||"").trim()&&c.number>=Math.min(from,to)&&c.number<=Math.max(from,to)).map(c=>c.id);
    if(!ids.length)return toast("In diesem Bereich gibt es keine geschriebenen Kapitel.");
    const revisionMode=document.querySelector('input[name="reviserMode"]:checked')?.value||"editorial";
    const intensity=revisionMode==="targeted"?"gentle":revisionMode==="full"?"strong":"smart";
    const protect=$("#reviserProtect")?.value.trim()||"",freedom=$("#reviserFreedom")?.value.trim()||"";
    if(editingExisting){
      const keepDone=(Array.isArray(r.done)?r.done:[]).filter(id=>ids.includes(id));
      Object.assign(r,{running:true,stopAfterCurrent:false,immediateStop:false,wish,protect,freedom,revisionMode,intensity,ids,done:keepDone,currentId:null,lastMessage:`${bookReviserModeLabel(revisionMode)} · Auftrag aktualisiert`,finishedAt:"",lastHeartbeat:Date.now()});
    }else{
      p.bookReviser={running:true,stopAfterCurrent:false,wish,protect,freedom,revisionMode,intensity,ids,done:[],jobId:uid(),currentId:null,lastMessage:`${bookReviserModeLabel(revisionMode)} gestartet`,startedAt:now(),finishedAt:"",lastHeartbeat:Date.now()};
    }
    p.updatedAt=now();save();closeModal();render();resumeBookReviser();setTimeout(()=>openStudioProcessMonitor("revise"),160);
  };
}

// V1.9.5.2 – Einheitlicher, entscheidungsorientierter Prozessmonitor.
// Gleiche Bedienlogik für Planen, Schreiben, Prüfen, Überarbeiten und Übersetzen.
// Standardansicht zeigt nur das, was jetzt wichtig ist; die komplette Kapitelliste ist optional.
function studioProcessSnapshot(mode,p=project()){
  if(!p)return null;
  const chapters=[...(p.chapters||[])].sort((a,b)=>Number(a.number)-Number(b.number));
  const row=(c,state,label)=>({id:c.id,number:c.number,title:c.title||`Kapitel ${c.number}`,state,label});
  if(mode==="plan"){
    const total=chapters.length,done=chapters.filter(c=>!chapterNeedsPlan(c)).length;
    const runner=p.planRunner||{},running=projectPlanningActive(p);
    const activeIds=new Set(Object.entries(p.planJobs||{}).filter(([,j])=>j&&j.status==="running").map(([id])=>id));
    if(runner.currentChapterId)activeIds.add(runner.currentChapterId);
    const rows=chapters.map(c=>row(c,!chapterNeedsPlan(c)?"done":activeIds.has(c.id)?"on":"open",!chapterNeedsPlan(c)?"✓ Plan fertig":activeIds.has(c.id)?"● Wird ausgearbeitet …":"Wartet"));
    return {mode,title:"Kapitelpläne ausarbeiten",subtitle:"Szenen, Wendepunkte und Atmosphäre Kapitel für Kapitel entwickeln.",done,total,percent:total?Math.round(done/total*100):0,running,message:runner.lastMessage||(!total?"Noch keine Kapitel vorhanden.":done===total?"Alle Kapitelpläne sind ausgearbeitet.":done?"Pausiert – du kannst genau hier fortsetzen.":"Bereit zum Start."),rows,canStart:!running&&done<total&&p.bookPlan?.status==="ready"&&!projectWritingActive(p),startLabel:done?"▶ Plan-Ausarbeitung fortsetzen":"▶ Plan-Ausarbeitung starten",stopAfterLabel:"Nach aktuellem Kapitel stoppen",detailsLabel:"Kapitelpläne ansehen"};
  }
  if(mode==="write"){
    const total=chapters.length,done=chapters.filter(c=>!chapterNeedsWriting(c)).length;
    const writer=p.bookWriter||{},running=projectWritingActive(p);
    const activeIds=new Set(Object.entries(p.writeJobs||{}).filter(([,j])=>j&&j.status==="running").map(([id])=>id));
    if(writer.currentChapterId)activeIds.add(writer.currentChapterId);
    const rows=chapters.map(c=>row(c,!chapterNeedsWriting(c)?"done":activeIds.has(c.id)?"on":"open",!chapterNeedsWriting(c)?"✓ Geschrieben":activeIds.has(c.id)?"● Wird geschrieben …":"Wartet"));
    const plansReady=total>0&&chapters.every(c=>!chapterNeedsPlan(c));
    const restartPending=pendingBookWriterRestarts.has(p.id);
    return {mode,title:"Buch schreiben",subtitle:"Litterum schreibt alle offenen Kapitel automatisch nacheinander auf Basis der fertigen Kapitelpläne.",done,total,percent:total?Math.round(done/total*100):0,running,message:restartPending?"Automatisches Weiterschreiben wird vorbereitet …":writer.lastMessage||(!total?"Noch keine Kapitel vorhanden.":done===total?"Das ganze Buch ist geschrieben.":done?"Pausiert – ein Tipp auf „Automatisch weiterschreiben“ setzt bei Kapitel "+(chapters.find(chapterNeedsWriting)?.number||"")+" fort und schreibt danach selbstständig weiter.":"Bereit zum automatischen Schreiben."),rows,canStart:!running&&!restartPending&&done<total&&plansReady&&!projectPlanningActive(p),startLabel:done?"▶ Automatisch weiterschreiben":"▶ Buch automatisch schreiben",stopAfterLabel:"Nach aktuellem Kapitel stoppen",detailsLabel:"Manuskript ansehen"};
  }
  if(mode==="review"){
    const written=chapters.filter(c=>String(c.content||"").trim()),bp=bookReviewProgress(p),rr=p.reviewRunner||{},activeNums=new Set((rr.currentChapterNumbers||[]).map(Number));
    const rows=written.map(c=>row(c,chapterReviewIsCurrent(c)?"done":activeNums.has(Number(c.number))?"on":"open",chapterReviewIsCurrent(c)?"✓ Geprüft":activeNums.has(Number(c.number))?"● Wird geprüft …":"Offen"));
    return {mode,title:"Buch prüfen",subtitle:"Stil, Logik und Kontinuität werden für das ganze Buch gründlich geprüft.",done:bp.done,total:bp.total,percent:bp.total?Math.round(bp.done/bp.total*100):0,running:!!rr.running,message:rr.errorMessage||rr.lastMessage||(bp.open?`${bp.open} Kapitel sind noch offen.`:"Buchprüfung vollständig abgeschlossen."),rows,canStart:!rr.running&&bp.open>0&&written.length===chapters.length,startLabel:bp.done?"▶ Prüfung fortsetzen":"▶ Buchprüfung starten",stopAfterLabel:"Nach laufenden Kapiteln stoppen",detailsLabel:"Prüfergebnisse ansehen"};
  }
  if(mode==="revise"){
    const q=bookReviserProgressData(p),r=q.r,written=chapters.filter(c=>String(c.content||"").trim());
    const ids=q.ids.length?q.ids:written.map(c=>c.id),doneSet=new Set(q.done),rows=ids.map(id=>{const c=chapters.find(x=>x.id===id);if(!c)return null;const active=!!r.running&&r.currentId===id,finished=doneSet.has(id);return row(c,finished?"done":active?"on":"open",finished?"✓ Überarbeitet":active?"● Wird überarbeitet …":"Wartet");}).filter(Boolean);
    const total=q.total||ids.length,done=q.completed;
    const modeLabel=bookReviserModeLabel(bookReviserModeOf(r));
    return {mode,title:"Buch überarbeiten",subtitle:r.jobId?`${modeLabel} · Dein Überarbeitungsauftrag steuert diese Fassung.`:"Lege zuerst fest, nach welchem Auftrag und mit welcher Eingriffstiefe Litterum überarbeiten soll.",done,total,percent:total?Math.round(done/total*100):0,running:!!r.running,message:r.lastMessage||(r.jobId?(q.remaining?"Pausiert – du kannst genau hier fortsetzen.":"Überarbeitung abgeschlossen."):"Noch keine Buchüberarbeitung eingerichtet."),rows,canStart:!r.running&&(r.jobId?q.remaining>0:written.length>0),startLabel:r.jobId?"▶ Überarbeitung fortsetzen":"✎ Überarbeitung einrichten",stopAfterLabel:"Nach aktuellem Kapitel stoppen",detailsLabel:"Manuskript ansehen",needsSetup:!r.jobId,canEditSetup:!r.running&&!!r.jobId};
  }
  if(mode==="translate"){
    const e=runningTranslationEdition(p)||activeTranslationEdition(p),written=chapters.filter(c=>String(c.content||"").trim());
    if(!e)return {mode,title:"Buch übersetzen",subtitle:"Die fertige Buchfassung wird Kapitel für Kapitel in eine weitere Sprache übertragen.",done:0,total:written.length,percent:0,running:false,message:"Noch keine Sprachfassung angelegt.",rows:[],canStart:bookRevisionComplete(p),startLabel:"🌐 Sprache auswählen",stopAfterLabel:"Nach aktuellem Kapitel stoppen",detailsLabel:"Sprachfassungen verwalten",needsSetup:true};
    const q=translationEditionProgress(p,e),byId=new Map((e.chapters||[]).map(v=>[v.chapterId,v]));
    const rows=written.map(c=>{const old=byId.get(c.id),finished=!!old&&old.sourceSignature===reviewContentSignature(c.content||"")&&String(old.content||"").trim(),active=!!e.running&&e.currentChapterId===c.id;return row(c,finished?"done":active?"on":"open",finished?"✓ Übersetzt":active?"● Wird übersetzt …":"Wartet");});
    return {mode,title:`Buch übersetzen · ${e.language}`,subtitle:"Stil, Erzählstimme, Perspektive und Bedeutung bleiben in der Sprachfassung erhalten.",done:q.done,total:q.total,percent:q.percent,running:!!e.running,message:e.lastMessage||(q.open?`${q.open} Kapitel sind noch offen.`:"Übersetzung abgeschlossen."),rows,canStart:!e.running&&q.open>0&&bookRevisionComplete(p),startLabel:q.done?"▶ Übersetzung fortsetzen":"▶ Übersetzung starten",stopAfterLabel:"Nach aktuellem Kapitel stoppen",detailsLabel:"Sprachfassungen verwalten",editionId:e.id};
  }
  return null;
}
function studioProcessIssue(snap,p){
  const raw=String(snap?.message||"").trim(),low=raw.toLowerCase();
  if(!raw)return null;
  let provider="",label="";
  if(/anthropic_api_key|anthropic|claude/.test(low)){provider="claude";label="Claude";}
  else if(/deepseek_api_key|deepseek/.test(low)){provider="deepseek";label="DeepSeek";}
  else if(/moonshot_api_key|kimi_api_key|moonshot|kimi/.test(low)){provider="kimi";label="Kimi";}
  else if(/openai_api_key|openai/.test(low)){provider="openai";label="OpenAI";}
  const missing=/api[_ -]?key/.test(low)&&/(fehlt|missing|nicht eingerichtet|not configured)/.test(low) || /(umgebungsvariablen|environment variables)/.test(low)&&/(fehlt|missing)/.test(low);
  const hard=/\b(fehlgeschlagen|fehler|error|abgebrochen|unterbrochen)\b/.test(low)&&!/verbindung kurz unterbrochen/.test(low);
  if(!missing&&!hard)return null;
  if(missing&&label)return {kind:"provider",provider,label,title:`${label} ist noch nicht eingerichtet`,text:`Der gewählte KI-Anbieter ${label} kann diesen Arbeitsschritt gerade nicht fortsetzen. Deine bereits fertigen Kapitel bleiben gespeichert.`,technical:raw};
  return {kind:"error",provider,label,title:"Dieser Arbeitsschritt braucht deine Aufmerksamkeit",text:"Litterum hat angehalten, damit nichts überschrieben oder endlos wiederholt wird. Bereits fertige Kapitel bleiben gespeichert.",technical:raw};
}
function studioProcessState(snap,p){
  const issue=studioProcessIssue(snap,p),finished=snap.total>0&&snap.done>=snap.total;
  if(finished)return {key:"done",label:"✓ Fertig",issue:null};
  if(snap.running)return {key:"running",label:"● Läuft",issue:null};
  if(issue)return {key:"error",label:"! Problem",issue};
  if(snap.done>0)return {key:"paused",label:"Pausiert",issue:null};
  return {key:"ready",label:"Bereit",issue:null};
}
function studioProcessCurrentRow(snap){
  if(!snap?.rows?.length)return null;
  return snap.rows.find(r=>r.state==="on")||snap.rows.find(r=>r.state==="open")||snap.rows[snap.rows.length-1]||null;
}
function studioProcessVisibleRows(snap){
  const rows=snap?.rows||[];
  if(studioProcessMonitorExpanded){
    if(studioProcessMonitorFilter==="done")return rows.filter(r=>r.state==="done");
    if(studioProcessMonitorFilter==="open")return rows.filter(r=>r.state!=="done");
    return rows;
  }
  // Kompakt: das aktuelle Kapitel steht oben in der Statuskarte und taucht hier NICHT noch einmal auf.
  const current=studioProcessCurrentRow(snap);
  return rows.filter(r=>r.id!==current?.id&&r.state!=="done").slice(0,2);
}
function studioProcessRowsHtml(snap){
  const visible=studioProcessVisibleRows(snap),cur=studioProcessCurrentRow(snap);
  if(!snap?.rows?.length)return `<div class="process-monitor-empty">Noch keine Kapitel für diesen Arbeitsschritt vorhanden.</div>`;
  if(!visible.length)return studioProcessMonitorExpanded?`<div class="process-monitor-empty">Für diesen Filter gibt es keine Kapitel.</div>`:"";
  return visible.map(r=>`<div class="process-monitor-row ${r.state}${studioProcessMonitorExpanded&&cur&&r.id===cur.id?" is-current":""}"><span>${r.number}</span><strong>${esc(r.title)}</strong><em>${esc(r.label)}</em></div>`).join("");
}
function studioProcessStartCurrentMode(){
  const live=project();if(!live||!studioProcessMonitorMode)return;
  if(studioProcessMonitorMode==="plan")startAllPlanExpansion();
  else if(studioProcessMonitorMode==="write")startWholeBookWriter();
  else if(studioProcessMonitorMode==="review")aiReview();
  else if(studioProcessMonitorMode==="revise"){const q=bookReviserProgressData(live);if(!q.r.jobId){closeModal();openBookReviser();return;}continueBookReviser();}
  else if(studioProcessMonitorMode==="translate"){
    const s=studioProcessSnapshot("translate",live);if(s?.needsSetup){closeModal();openBookTranslator();return;}
    startTranslationEdition(live.id,s.editionId);setTimeout(()=>openStudioProcessMonitor("translate"),180);return;
  }
  setTimeout(refreshStudioProcessMonitor,140);
}
function studioProcessSwitchToDeepSeekAndContinue(){
  const p=project();if(!p)return;
  p.ai ||= {};const meta=aiProviderMeta("deepseek");p.ai.authorProvider="deepseek";p.ai.authorModel=meta.model;p.ai.guardProvider="deepseek";p.ai.guardModel="deepseek-v4-pro";
  p.updatedAt=now();store.save();toast("DeepSeek V4 Pro ist jetzt für dieses Buch als Schreib-KI gewählt.",4200);
  studioProcessStartCurrentMode();
}
function studioProcessOpenAiSettings(){
  const p=project();if(!p)return;closeModal();state.activeTab="dna";store.save({sync:false});render();
  setTimeout(()=>document.querySelector(".ai-settings")?.scrollIntoView({behavior:"smooth",block:"center"}),120);
}
function studioProcessActionHtml(snap,state,p){
  const issue=state.issue,buttons=[];
  if(snap.running){
    buttons.push(`<button class="danger-btn" id="pmStopNow">■ Sofort stoppen</button>`);
    buttons.push(`<button class="ghost-btn" id="pmStopAfter">${esc(snap.stopAfterLabel||"Nach aktuellem Kapitel stoppen")}</button>`);
  }else if(issue?.kind==="provider"&&issue.provider!=="deepseek"&&studioProcessMonitorMode!=="review"){
    buttons.push(`<button class="primary-btn" id="pmUseDeepSeek">Mit DeepSeek fortsetzen</button>`);
    buttons.push(`<button class="soft-btn" id="pmAiSettings">KI-Auswahl öffnen</button>`);
  }else if(snap.canStart){
    buttons.push(`<button class="primary-btn" id="pmStart">${esc(state.key==="error"?"Erneut versuchen":snap.startLabel||"Fortsetzen")}</button>`);
  }
  if(studioProcessMonitorMode==="revise"&&snap.canEditSetup)buttons.push(`<button class="ghost-btn" id="pmEditRevision">Auftrag bearbeiten</button>`);
  if(snap.detailsLabel)buttons.push(`<button class="soft-btn" id="pmDetails">${esc(snap.detailsLabel)}</button>`);
  return buttons.join("");
}
function refreshStudioProcessMonitor(){
  const host=$("#studioProcessMonitorBody"),actions=$("#studioProcessMonitorActions");if(!host||!studioProcessMonitorMode)return;
  const p=project(),snap=studioProcessSnapshot(studioProcessMonitorMode,p);if(!snap)return;
  const stateInfo=studioProcessState(snap,p),current=studioProcessCurrentRow(snap),open=Math.max(0,(snap.total||0)-(snap.done||0));
  const issue=stateInfo.issue;
  const issueHtml=issue?`<section class="process-monitor-issue"><div class="pm-issue-icon">!</div><div><strong>${esc(issue.title)}</strong><p>${esc(issue.text)}</p><details><summary>Technische Details</summary><code>${esc(issue.technical)}</code></details></div></section>`:"";
  const finishedAll=snap.total>0&&snap.done>=snap.total;
  const nowLabel=finishedAll?"Abgeschlossen":snap.running?"Gerade aktiv":stateInfo.key==="error"?"Hier geht es weiter":"Als Nächstes";
  const pct=Math.max(0,Math.min(100,snap.percent||0));
  const msg=String(snap.message||"").trim();
  const showMsg=msg&&!issue;
  const nowHtml=current&&!finishedAll?`<section class="process-monitor-now ${snap.running?"is-live":""}"><span><i class="pm-live-dot"></i>${nowLabel}</span><strong><b>Kapitel ${current.number}</b>${esc(current.title)}</strong><em>${esc(current.label)}</em>${showMsg?`<p>${esc(msg)}</p>`:""}</section>`:`<section class="process-monitor-now is-done"><span>${nowLabel}</span><strong>${snap.total?"Alle Kapitel sind fertig":"Noch keine Kapitel vorhanden"}</strong>${showMsg?`<p>${esc(msg)}</p>`:""}</section>`;
  const filters=studioProcessMonitorExpanded?`<div class="process-monitor-filters"><button class="${studioProcessMonitorFilter==="all"?"active":""}" data-pm-filter="all">Alle ${snap.total}</button><button class="${studioProcessMonitorFilter==="open"?"active":""}" data-pm-filter="open">Offen ${open}</button><button class="${studioProcessMonitorFilter==="done"?"active":""}" data-pm-filter="done">Fertig ${snap.done}</button></div>`:"";
  const hiddenMore=Math.max(0,(snap.rows||[]).filter(r=>r.id!==current?.id&&r.state!=="done").length-2);
  const listToggle=(snap.rows?.length>1)?`<button class="process-monitor-toggle" id="pmToggleRows" aria-expanded="${studioProcessMonitorExpanded?"true":"false"}">${studioProcessMonitorExpanded?"Weniger anzeigen":`Alle ${snap.rows.length} Kapitel`}<i>${studioProcessMonitorExpanded?"▴":"▾"}</i></button>`:"";
  const listHtml=studioProcessRowsHtml(snap);
  const headLabel=studioProcessMonitorExpanded?"Kapitelübersicht":(listHtml?`Danach${hiddenMore?` <small>+ ${hiddenMore} weitere</small>`:""}`:"");
  const prevScroll=host.querySelector(".process-monitor-list")?.scrollTop||0;
  host.innerHTML=`<div class="process-monitor-top pm-state-${stateInfo.key}"><div class="pm-top-copy"><span class="pm-chip pm-chip-${stateInfo.key}">${stateInfo.label}</span><p>${esc(snap.subtitle)}</p></div><div class="process-monitor-ring" style="--pm:${pct}" role="img" aria-label="${pct} Prozent fertig"><strong>${snap.percent||0}%</strong><span>${snap.done} / ${snap.total}</span></div></div>
    <div class="process-monitor-progress"><div class="ss-bar"><span style="width:${pct}%"></span></div><div class="pm-counts"><strong>${snap.done} fertig</strong><span>${open} offen</span></div></div>
    ${issueHtml}${nowHtml}
    ${(headLabel||listToggle)?`<section class="process-monitor-chapters"><div class="pm-list-head"><strong>${headLabel}</strong>${listToggle}</div>${filters}${listHtml?`<div class="process-monitor-list">${listHtml}</div>`:""}</section>`:""}`;
  if(prevScroll){const l=host.querySelector(".process-monitor-list");if(l)l.scrollTop=prevScroll;}
  if(actions)actions.innerHTML=studioProcessActionHtml(snap,stateInfo,p);
  $("#pmToggleRows")?.addEventListener("click",()=>{studioProcessMonitorExpanded=!studioProcessMonitorExpanded;if(studioProcessMonitorExpanded&&studioProcessMonitorFilter==="open"&&open===0)studioProcessMonitorFilter="all";refreshStudioProcessMonitor();});
  $$('[data-pm-filter]').forEach(b=>b.addEventListener("click",()=>{studioProcessMonitorFilter=b.dataset.pmFilter||"all";refreshStudioProcessMonitor();}));
  $("#pmUseDeepSeek")?.addEventListener("click",studioProcessSwitchToDeepSeekAndContinue);
  $("#pmAiSettings")?.addEventListener("click",studioProcessOpenAiSettings);
  $("#pmStart")?.addEventListener("click",studioProcessStartCurrentMode);
  $("#pmEditRevision")?.addEventListener("click",()=>{closeModal();openBookReviser();});
  $("#pmStopNow")?.addEventListener("click",()=>{
    const live=project();if(!live)return;
    if(studioProcessMonitorMode==="plan")stopPlanRunnerNow();
    else if(studioProcessMonitorMode==="write")stopWholeBookWriterNow();
    else if(studioProcessMonitorMode==="review")stopBookReviewNow();
    else if(studioProcessMonitorMode==="revise")stopBookReviserNow();
    else if(studioProcessMonitorMode==="translate"){const e=runningTranslationEdition(live);if(e)stopTranslationNow(live,e);}
    setTimeout(refreshStudioProcessMonitor,100);
  });
  $("#pmStopAfter")?.addEventListener("click",()=>{
    const live=project();if(!live)return;
    if(studioProcessMonitorMode==="plan")stopPlanRunnerAfterCurrent();
    else if(studioProcessMonitorMode==="write")stopWholeBookWriterAfterCurrent();
    else if(studioProcessMonitorMode==="review")stopBookReview();
    else if(studioProcessMonitorMode==="revise")stopBookReviserAfterCurrent();
    else if(studioProcessMonitorMode==="translate"){const e=runningTranslationEdition(live);if(e)stopTranslationAfterCurrent(live,e);}
    setTimeout(refreshStudioProcessMonitor,100);
  });
  $("#pmDetails")?.addEventListener("click",()=>{
    const mode=studioProcessMonitorMode,live=project();closeModal();if(!live)return;
    if(mode==="plan"){const c=(live.chapters||[]).find(x=>x.id===live.planRunner?.currentChapterId)||chapterForMode(live,"plan");return studioOpenChapter("plan",c?.id);}
    if(mode==="write"){const c=(live.chapters||[]).find(x=>x.id===live.bookWriter?.currentChapterId)||chapterForMode(live,"write");return studioOpenChapter("write",c?.id);}
    if(mode==="review"){state.activeTab="review";store.save({sync:false});return render();}
    if(mode==="revise"){state.activeTab="manuscript";store.save({sync:false});return render();}
    if(mode==="translate")return openBookTranslator();
  });
}
function openStudioProcessMonitor(mode){
  const p=project();if(!p)return;const snap=studioProcessSnapshot(mode,p);if(!snap)return;
  studioProcessMonitorExpanded=false;studioProcessMonitorFilter="open";
  modal(`<div class="pm-modal-head"><div><span class="original-idea-kicker">ARBEITSFORTSCHRITT</span><h2>${esc(snap.title)}</h2><p class="small muted pm-intro">Aktueller Stand auf einen Blick. Alle Kapitel kannst du bei Bedarf aufklappen.</p></div></div><div id="studioProcessMonitorBody"></div><div class="modal-actions process-monitor-footer"><div id="studioProcessMonitorActions"></div><button class="ghost-btn" data-close>Schließen</button></div>`,"wide");
  studioProcessMonitorMode=mode;
  refreshStudioProcessMonitor();
  studioProcessMonitorTimer=setInterval(refreshStudioProcessMonitor,800);
}
function studioTranslateClick(){
  const p=project();if(!p)return;
  if(!bookRevisionComplete(p)&&!runningTranslationEdition(p))return toast("Buch übersetzen wird freigeschaltet, sobald die Buchüberarbeitung vollständig fertig ist.");
  const e=runningTranslationEdition(p)||activeTranslationEdition(p);if(e)return openStudioProcessMonitor("translate");
  openBookTranslator();
}
function stopBookReviserAfterCurrent(){
  const p=project(),r=p?.bookReviser;if(!r?.running)return;
  if(r.currentId||activeReviserRuntimes.has(p.id)){r.stopAfterCurrent=true;r.immediateStop=false;r.lastMessage="Stoppt nach dem aktuellen Kapitel …";}
  else{r.running=false;r.stopAfterCurrent=false;r.immediateStop=false;r.finishedAt=now();r.lastMessage="Gestoppt – du kannst später genau hier fortsetzen.";}
  p.updatedAt=now();save();render();
}
function stopBookReviserNow(){
  const p=project(),r=p?.bookReviser;if(!r?.running)return;
  const q=bookReviserProgressData(p);r.immediateStop=true;r.running=false;r.stopAfterCurrent=false;r.currentId=null;r.finishedAt=now();r.lastMessage=`Sofort gestoppt · ${q.completed}/${q.total} Kapitel fertig`;
  try{activeReviserAbortControllers.get(p.id)?.abort();}catch{}
  activeReviserAbortControllers.delete(p.id);p.updatedAt=now();save();render();toast("Buchüberarbeitung gestoppt. Fertige Kapitel bleiben gespeichert.");
}
function continueBookReviser(){
  const p=project(),r=p?.bookReviser;if(!r?.jobId)return openBookReviser();const q=bookReviserProgressData(p);if(!q.remaining)return toast("Alle ausgewählten Kapitel sind bereits überarbeitet.");
  if(projectPlanningActive(p)||projectWritingActive(p)||p.reviewRunner?.running||runningTranslationEdition(p))return toast("Bitte beende zuerst den anderen laufenden Buchvorgang.");
  r.running=true;r.stopAfterCurrent=false;r.immediateStop=false;r.currentId=null;r.finishedAt="";r.startedAt=r.startedAt||now();r.lastHeartbeat=Date.now();r.lastMessage=`Überarbeitung wird fortgesetzt · ${q.completed}/${q.total} Kapitel fertig`;
  p.updatedAt=now();save();render();resumeBookReviser();
}
// Rueckwaertskompatibel fuer aeltere Button-IDs: stoppt nach dem aktuellen Kapitel.
function stopBookReviser(){stopBookReviserAfterCurrent();}
function undoBookReviser(){
  const p=project(),r=p?.bookReviser;if(!r?.jobId||r.running)return;
  const affected=(p.chapters||[]).filter(c=>c.versions?.[0]?.tag===r.jobId);
  if(!affected.length)return toast("Es gibt nichts rückgängig zu machen.");
  modal(`<h2>Überarbeitung rückgängig machen?</h2><p>${affected.length} Kapitel bekommen wieder ihre Fassung von vor der Überarbeitung. Die überarbeitete Fassung wird dabei ebenfalls unter „Rückgängig“ aufgehoben.</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="confirmUndoReviser">Rückgängig machen</button></div>`);
  $("#confirmUndoReviser").onclick=()=>{
    for(const c of affected){const v=c.versions[0];const back=v.content;c.versions=c.versions.slice(1);pushVersion(c,"überarbeitete Fassung (rückgängig gemacht)");c.content=back;c.status="Entwurf";}
    r.lastMessage="Rückgängig gemacht";p.updatedAt=now();save();closeModal();render();toast(`${affected.length} Kapitel wiederhergestellt.`);
  };
}
function resumeBookReviser(){
  if(document.hidden||store.readOnly||!state.activeProjectId)return;
  const p=projectById(state.activeProjectId);
  if(!p?.bookReviser?.running||activeReviserRuntimes.has(p.id))return;
  if(navigator.onLine===false)return;
  const pid=p.id;
  activeReviserRuntimes.set(pid,{pending:true});
  setTimeout(async()=>{
    let r;
    try{r=await runExclusive("revise-book-"+pid,()=>runBookReviserLoop(pid));}
    finally{if(activeReviserRuntimes.get(pid)?.pending)activeReviserRuntimes.delete(pid);}
    if(r==="locked")whenLockFree("revise-book-"+pid,()=>{if(state.activeProjectId===pid)resumeBookReviser();});
  },300);
}
async function reviseChapterForBook(p,c,r){
  const revisionMode=bookReviserModeOf(r);
  const modeText=revisionMode==="targeted"
    ? "MODUS: NUR MEIN AUFTRAG. Ändere ausschließlich Stellen, die für den Auftrag der Autorin wirklich betroffen sind. Gute und funktionierende Passagen bleiben wortgleich oder so nah wie möglich am Original."
    : revisionMode==="full"
      ? "MODUS: VOLLÜBERARBEITUNG. Verbessere das Kapitel umfassend auf literarische Qualität, Natürlichkeit, Rhythmus, Logik, Wiederholungen, Figurenstimme und emotionale Wirkung. Größere Neufassungen sind erlaubt, aber nur wenn sie einen konkreten Qualitätsgrund haben."
      : "MODUS: PRÜFUNG + AUFTRAG. Der Auftrag der Autorin hat Vorrang. Nutze zusätzlich die vorhandenen Prüfhinweise dieses Kapitels als fachliche Hinweise. Ändere gute Passagen nicht bloß, weil eine andere Formulierung ebenfalls möglich wäre.";
  const protect=String(r.protect||"").trim();
  const freedom=String(r.freedom||"").trim();
  const currentReview=chapterReviewIsCurrent(c)?String(c.reviewResult||"").trim():"";
  const reviewBlock=(revisionMode!=="targeted"&&currentReview)?`\n\nAKTUELLE PRÜFHINWEISE ZU DIESEM KAPITEL (nur umsetzen, wenn sie zum Auftrag und Canon passen; maximal als Diagnose verwenden):\n${currentReview.slice(0,7000)}`:"";
  const automaticFull=revisionMode==="full"?`\n\nZUSÄTZLICHE VOLLPRÜFUNG: Suche still nach KI-typischen Satzmustern, Stakkato, redundanten Gefühlserklärungen, steifen Dialogen, unnatürlichen Übergängen, unnötigen Wiederholungen, Logik- oder Perspektivproblemen und schwachen Szenen. Behebe nur echte Probleme.`:"";
  const intensity=revisionMode==="targeted"?"EINGRIFFSTIEFE: behutsam und gezielt.":revisionMode==="full"?"EINGRIFFSTIEFE: deutlich, wenn die Qualität es erfordert; ganze Absätze oder Szenen dürfen neu gefasst werden.":"EINGRIFFSTIEFE: intelligent dosiert; kleine Probleme klein lösen, schwache Passagen bei Bedarf stärker neu fassen.";
  const directive=`${modeText}\n\nÜBERARBEITUNGSAUFTRAG DER AUTORIN – HAT VORRANG:\n${String(r.wish||"").trim()}\n\n${intensity}${protect?`\n\nUNBEDINGT BEIBEHALTEN:\n${protect}`:""}${freedom?`\n\nDARF STÄRKER VERÄNDERT WERDEN:\n${freedom}`:""}${reviewBlock}${automaticFull}\n\nGRUNDREGEL: Funktionierende Passagen bewahren. Keine Änderung nur aus Geschmack oder Variationsdrang. Handlung, feste Fakten, Figurenidentität, Perspektive, Zeitform und geschützte Passagen respektieren, sofern die Autorin nicht ausdrücklich etwas anderes verlangt.`;
  let text="";
  await apiStreamChapter("revise_passage",{chapter:{number:c.number,title:c.title,plan:c.plan,memory:c.memory},mode:"book",passage:c.content,wish:directive},d=>{text+=d;},p,{onController:ctrl=>{if(ctrl)activeReviserAbortControllers.set(p.id,ctrl);else activeReviserAbortControllers.delete(p.id);},manualAbort:()=>!!r.immediateStop});
  return cleanRevisionText(text);
}

async function runBookReviserLoop(pid){
  activeReviserRuntimes.set(pid,{running:true});
  const delays=[4000,12000,30000];
  try{
    for(;;){
      const p=projectById(pid),r=p?.bookReviser;if(!r?.running)break;
      const id=(r.ids||[]).find(x=>!(r.done||[]).includes(x));
      if(!id){r.running=false;r.currentId=null;r.finishedAt=now();r.lastMessage="Fertig – alle Kapitel überarbeitet";p.updatedAt=now();store.save();if(project()?.id===pid){render();toast("Das Buch ist fertig überarbeitet. Unter „Rückgängig“ findest du bei jedem Kapitel die vorige Version.",6000);}break;}
      const c=p.chapters.find(x=>x.id===id);
      if(!c||!String(c.content||"").trim()){r.done.push(id);store.save();continue;}
      r.currentId=id;r.lastHeartbeat=Date.now();r.lastMessage=`Kapitel ${c.number} wird überarbeitet …`;store.save();if(project()?.id===pid)render();
      const snapshot=c.content;let text="",paused=false;
      for(let attempt=0;;attempt++){
        const startedAt=Date.now();
        try{text=await reviseChapterForBook(p,c,r);break;}
        catch(e){
          const transient=!!e?.retryable||isTransientApiError(e);
          if(transient&&(document.hidden||navigator.onLine===false)){paused=true;break;}
          if(transient&&lastHiddenAt>=startedAt){attempt=-1;await sleep(1500);continue;}
          if(!transient||attempt>=delays.length)throw e;
          r.lastHeartbeat=Date.now();r.lastMessage=`Kapitel ${c.number}: Verbindung kurz unterbrochen – neuer Versuch in ${delays[attempt]/1000} Sek. …`;store.save();if(project()?.id===pid)render();
          await sleep(delays[attempt]);
          if(!projectById(pid)?.bookReviser?.running)return;
        }
      }
      const lp=projectById(pid),lr=lp?.bookReviser,lc=lp?.chapters?.find(x=>x.id===id);
      if(paused){if(lr){lr.lastMessage="Pausiert – geht automatisch weiter, sobald die App wieder offen und online ist.";store.save();}if(project()?.id===pid)render();break;}
      if(!lr||!lc)break;
      if(text){
        if(lc.content===snapshot){pushVersion(lc,`vor Buch-Überarbeitung · ${bookReviserModeLabel(bookReviserModeOf(lr))}: ${lr.wish}`);if(lc.versions?.[0])lc.versions[0].tag=lr.jobId;lc.content=text;lc.status="Entwurf";}
        // Wurde währenddessen im Kapitel getippt, nichts überschreiben: neue Fassung als Vorschau anbieten.
        else lc.pendingRevision={mode:"book",wish:lr.wish,start:0,end:lc.content.length,original:lc.content,text,status:"ready",at:now()};
        lp.updatedAt=now();store.save();
        if(lr.intensity!=="gentle"){
          lr.lastMessage=`Kapitel ${lc.number}: Kontinuität wird aktualisiert …`;if(project()?.id===pid)render();
          await refreshChapterMemory(lp,lc,{fast:true});
        }else{
          // Gezielte Überarbeitung verändert laut Auftrag nur die verlangten Stellen.
          // Deshalb bleibt das bestehende Kapitelgedächtnis gültig und eine zweite KI-Runde entfällt.
          lr.lastMessage=`Kapitel ${lc.number}: gespeichert …`;if(project()?.id===pid)render();
        }
      }
      lr.done.push(id);lr.currentId=null;lr.lastHeartbeat=Date.now();lr.lastMessage=`Kapitel ${lc.number} überarbeitet`;store.save();if(project()?.id===pid)render();
      if(lr.stopAfterCurrent){lr.running=false;lr.stopAfterCurrent=false;lr.finishedAt=now();lr.lastMessage=`Nach Kapitel ${lc.number} gestoppt`;store.save();if(project()?.id===pid)render();break;}
    }
  }catch(e){
    const p=projectById(pid),r=p?.bookReviser;
    if(r){r.running=false;r.finishedAt=now();r.currentId=null;if(e?.manualStop||r.immediateStop){const q=bookReviserProgressData(p);r.lastMessage=`Sofort gestoppt · ${q.completed}/${q.total} Kapitel fertig`;}else r.lastMessage=readableError(e,"Überarbeitung unterbrochen");store.save();}
    if(project()?.id===pid){render();if(!(e?.manualStop||r?.immediateStop))toast(r?.lastMessage||"Überarbeitung unterbrochen",6000);}
  }finally{activeReviserAbortControllers.delete(pid);activeReviserRuntimes.delete(pid);}
  return true;
}
function studioPartMode(p,rawWords,written,words,running,remoteRunning){
  const w=ensurePartWorkflowShape(p),prog=partWorkflowProgress(p),assigned=(p.chapters||[]).filter(c=>c.partIndex!==undefined&&c.partIndex!==null),planned=assigned.length,writtenAssigned=assigned.filter(c=>String(c.content||"").trim()).length,assignedWords=assigned.reduce((n,c)=>n+countWords(c.content||""),0),pct=planned?Math.round(writtenAssigned/planned*100):0;
  const cards=w.parts.map((part,i)=>studioPartCard(p,part,i)).join("");
  const planParts=(p.bookPlan?.parts||[]).filter(x=>(x.chapters||[]).length);
  return `<section class="studio-page">
    <section class="card studio-hero"><div><span class="studio-kicker">TEIL-FÜR-TEIL-BUCHSTUDIO</span><h2>${esc(p.title)}</h2><p>Ein Roman, mehrere Teile. Das Gesamtbriefing bleibt für alles verbindlich; Litterum entwickelt und schreibt immer nur einen Teil nach dem anderen und übernimmt danach den tatsächlichen Canon in den nächsten Teil.</p></div><div class="studio-progress-ring" style="--p:${pct}"><strong>${pct}%</strong><span>${writtenAssigned}/${planned||0} geplante Kapitel</span><small>Teil ${prog.current}/${prog.total}</small></div></section>
    ${studioVariantStripHtml(p)}
    ${seriesStudioPanel(p)}
    <section class="studio-flow">
      <article class="card studio-step ${rawWords?"ready":""}"><div class="studio-step-no">1</div><div><h3>Gesamtbriefing</h3><p>${rawWords?`${rawWords.toLocaleString("de-DE")} Wörter vorhanden. Welt, Figuren, Stil, große Geheimnisse und die Verbindung aller Teile gelten durchgehend.`:"Trage zuerst das Gesamtbriefing ein. Dort stehen nur die Regeln und Bögen, die für den ganzen Roman gelten."}</p><button class="soft-btn" data-tab="briefing">${rawWords?"Briefing ansehen":"Briefing eingeben"}</button></div></article>
      ${cards}
      ${bookReviserCardHtml(p,w.parts.length+2)}
      ${bookTranslatorCardHtml(p,w.parts.length+3)}
    </section>
    <section class="card studio-settings"><div><strong>Teil-für-Teil-Modus</strong><div class="small muted">Empfohlen für große Romane. Keine Kapitel manuell anlegen: Litterum bestimmt pro Teil selbst die sinnvolle Kapitelzahl.</div></div><label class="toggle-row"><input type="checkbox" id="partModeToggle" checked><span>Aktiv</span></label></section>
    <section class="card studio-settings"><div><strong>Kompletter kreativer Neustart</strong><div class="small muted">Alte Fassungen dienen nicht als Szenenvorlage. Nur Roman-DNA, Welt, Figuren und verbindliche Regeln bleiben erhalten.</div></div><label class="toggle-row"><input type="checkbox" id="creativeRestart" ${p.bookPlan?.creativeRestart!==false?"checked":""}><span>Aktiv</span></label></section>
    <section class="card studio-settings"><div><strong>Qualitätsrunde nach jedem Kapitel</strong><div class="small muted">Prüft Stil, Kontinuität, Wiederholungen und Figurenlogik und aktualisiert anschließend das Buchgedächtnis.</div></div><label class="toggle-row"><input type="checkbox" id="bookQualityPass" ${p.bookWriter?.qualityPass!==false?"checked":""}><span>Aktiv</span></label></section>
    ${planParts.length?`<section class="card studio-plan"><div class="panel-head"><div><h3>Bereits entwickelte Teile</h3><div class="small muted">${planned} Kapitel bisher geplant · ${prog.completed}/${prog.total} Teile fertig</div></div><div class="studio-plan-actions"><button class="ghost-btn" id="copyBookPlan">Nur Plantext kopieren</button><button class="soft-btn" data-tab="chapters">Kapitel ansehen</button></div></div>${planParts.map((part,i)=>`<details class="studio-part"><summary><span>${esc(part.title||`Teil ${i+1}`)}</span><em>${(part.chapters||[]).length} Kapitel</em></summary><div class="studio-part-body">${part.purpose?`<p>${esc(part.purpose)}</p>`:""}${part.arc?`<p class="small muted"><strong>Bogen:</strong> ${esc(part.arc)}</p>`:""}</div></details>`).join("")}</section>`:""}
    <section class="card studio-status"><div><span>Manuskript</span><strong>${assignedWords.toLocaleString("de-DE")} Wörter</strong></div><div><span>Geschrieben</span><strong>${writtenAssigned} / ${planned||0}</strong></div><div><span>Offene Fäden</span><strong>${(p.bookMemory?.openThreads||[]).length}</strong></div><div><span>Canon-Fakten</span><strong>${(p.bookMemory?.facts||[]).length}</strong></div></section>
  </section>`;
}


function studioTab(p){
  syncDetectedPartWorkflow(p);
  const rawWords=countWords(p.briefing?.raw||""),planned=(p.chapters||[]).length,written=(p.chapters||[]).filter(c=>String(c.content||"").trim()).length,words=(p.chapters||[]).reduce((n,c)=>n+countWords(c.content||""),0);
  const plan=p.bookPlan||null,writer=p.bookWriter||{},pct=planned?Math.round(written/planned*100):0;
  const partWorkflow=ensurePartWorkflowShape(p);
  if(partWorkflow.enabled)return studioPartMode(p,rawWords,written,words,!!writer.running,bookWriterRunsElsewhere(p));
  const planReady=plan?.status==="ready"&&planned>0;
  const planBusy=["analyzing","developing","refining"].includes(plan?.status);
  const planError=plan?.status==="error";
  const planRunner=p.planRunner||{},plansDone=(p.chapters||[]).filter(c=>!chapterNeedsPlan(c)).length,plansExpanded=planned>0&&plansDone===planned;
  const planningNow=!!planRunner.running||projectRunsJobs("plan",p.id);
  const running=!!writer.running,writingNow=running||projectRunsJobs("write",p.id),remoteRunning=bookWriterRunsElsewhere(p);
  const writeDone=(p.chapters||[]).filter(c=>!chapterNeedsWriting(c)).length;
  const planPercent=planned?Math.round(plansDone/planned*100):0;
  const writePercent=planned?Math.round(writeDone/planned*100):0;
  const planCurrent=(p.chapters||[]).find(c=>c.id===planRunner.currentChapterId)||chapterForMode(p,"plan")||p.chapters?.[0]||null;
  const writeCurrent=(p.chapters||[]).find(c=>c.id===writer.currentChapterId)||chapterForMode(p,"write")||chapterForMode(p,"plan")||p.chapters?.[0]||null;
  p.ui ||= {};
  const liveFocus=planningNow?planCurrent:(writingNow?writeCurrent:(plansExpanded?writeCurrent:(planReady?planCurrent:(p.chapters?.[0]||null))));
  const selectedStudioChapter=(p.chapters||[]).find(c=>c.id===p.ui.studioChapterId)||null;
  const focusChapter=selectedStudioChapter||liveFocus;
  const currentIndex=focusChapter?(p.chapters||[]).findIndex(c=>c.id===focusChapter.id):-1;
  const prevStudioChapter=currentIndex>0?p.chapters[currentIndex-1]:null,nextStudioChapter=currentIndex>=0&&currentIndex<(p.chapters||[]).length-1?p.chapters[currentIndex+1]:null;
  const hasPrev=!!prevStudioChapter,hasNext=!!nextStudioChapter;
  const planStatusLabel=planningNow?"Läuft gerade …":plansExpanded?"✓ Fertig":"Bereit zum Start";
  const writeStatusLabel=writingNow?"Läuft gerade …":(writeDone===planned&&planned)?"✓ Fertig":plansExpanded?"Bereit zum Start":"Wartet auf Plan-Ausarbeitung";
  const reviewProgress=bookReviewProgress(p),reviewRunner=p.reviewRunner||{};
  const reviewRunning=!!reviewRunner.running;
  const reviewReady=planned>0&&writeDone===planned;
  // Im Studio ist „Buch geprüft“ ein abgeschlossener Arbeitsschritt. Nach einer späteren
  // Überarbeitung bleibt dieser Schritt sichtbar erledigt, auch wenn die Prüfseite die
  // geänderten Kapitel für eine optionale erneute Kontrolle wieder als offen erkennt.
  const reviewPreviouslyCompleted=!!reviewRunner.finishedAt&&Number(reviewRunner.total||0)>0&&Number(reviewRunner.completed||0)>=Number(reviewRunner.total||0);
  const reviewDone=reviewReady&&reviewProgress.total>0&&(reviewProgress.open===0||reviewPreviouslyCompleted);
  const reviewStatusLabel=reviewRunning?"Läuft gerade …":reviewDone?"✓ Fertig":reviewReady?"Bereit zum Start":"Wartet auf Buch schreiben";
  const reviewedStatusLabel=reviewDone?"✓ Fertig":reviewRunning?"Wartet auf Abschluss der Prüfung":"Wartet auf Prüfung";
  const reviser=p.bookReviser||{},revisionRunning=!!reviser.running;
  const writtenIds=(p.chapters||[]).filter(c=>String(c.content||"").trim()).map(c=>c.id);
  const revisionIds=Array.isArray(reviser.ids)?reviser.ids:[],revisionDoneIds=Array.isArray(reviser.done)?reviser.done:[];
  const revisionReady=reviewDone;
  const revisionCoversWholeBook=writtenIds.length>0&&writtenIds.every(id=>revisionIds.includes(id));
  const revisionDone=revisionCoversWholeBook&&revisionIds.length>0&&revisionIds.every(id=>revisionDoneIds.includes(id))&&!revisionRunning&&!!reviser.finishedAt;
  const revisionResumable=!revisionRunning&&!!reviser.jobId&&revisionIds.length>0&&revisionDoneIds.filter(id=>revisionIds.includes(id)).length<revisionIds.length;
  const revisionCanUndo=!revisionRunning&&!!reviser.jobId&&(p.chapters||[]).some(c=>c.versions?.[0]?.tag===reviser.jobId);
  const revisionStatusLabel=revisionRunning?"Läuft gerade …":revisionDone?"✓ Fertig":revisionResumable?`${revisionDoneIds.filter(id=>revisionIds.includes(id)).length}/${revisionIds.length} fertig · Fortsetzen`:revisionReady?"Bereit zum Start":"Wartet auf Buchprüfung";
  const revisedStatusLabel=revisionDone?"✓ Fertig":revisionRunning?"Wartet auf Abschluss der Überarbeitung":"Wartet auf Überarbeitung";
  const translations=ensureTranslationsShape(p),translationRunningEdition=runningTranslationEdition(p),translationRunning=!!translationRunningEdition,translationReady=revisionDone;
  const completedTranslations=completedTranslationEditions(p),translationDone=completedTranslations.length>0,activeTranslation=translationRunningEdition||activeTranslationEdition(p),translationProgress=activeTranslation?translationEditionProgress(p,activeTranslation):{done:0,total:writtenIds.length,open:writtenIds.length,percent:0};
  const translateStatusLabel=translationRunning?`Läuft gerade · ${translationRunningEdition.language}`:translationReady?(translations.editions.some(e=>translationEditionProgress(p,e).open>0)?"Fortsetzen":"Bereit zum Start"):"Wartet auf Überarbeitung";
  const translatedStatusLabel=translationDone?`✓ ${completedTranslations.length===1?completedTranslations[0].language:`${completedTranslations.length} Sprachen`}`:translationRunning?"Wartet auf Abschluss der Übersetzung":"Wartet auf Übersetzung";
  const planWords=focusChapter?countWords(focusChapter.plan||""):0;
  const manuscriptWords=focusChapter?countWords(focusChapter.content||""):0;
  const chapterPlanDone=!!focusChapter&&!chapterNeedsPlan(focusChapter);
  const chapterWriteDone=!!focusChapter&&!chapterNeedsWriting(focusChapter);
  const revisionProgress=bookReviserProgressData(p);
  // V1.9.5.0: Der Studio-Status berücksichtigt jetzt ALLE fünf Arbeitsprozesse, auch die Buchprüfung.
  const reviewPercent=reviewProgress.total?Math.round(reviewProgress.done/reviewProgress.total*100):0;
  const activeMode=planningNow?"plan":(writingNow?"write":(reviewRunning?"review":(revisionRunning?"revise":(translationRunning?"translate":null))));
  const activePercent=activeMode==="plan"?planPercent:(activeMode==="write"?writePercent:(activeMode==="review"?reviewPercent:(activeMode==="revise"?revisionProgress.percent:(activeMode==="translate"?translationProgress.percent:0))));
  const activeTitle=activeMode==="plan"?"Plan-Ausarbeitung läuft …":activeMode==="write"?"Buch schreiben läuft …":activeMode==="review"?"Buchprüfung läuft …":activeMode==="revise"?"Buch überarbeiten läuft …":activeMode==="translate"?`Buch übersetzen · ${esc(translationRunningEdition.language)}`:"Kein Prozess aktiv";
  const activeText=activeMode==="plan"?"Ich entwickle die Kapitelpläne mit Szenen, Wendepunkten und Atmosphäre.":activeMode==="write"?"Ich schreibe das Manuskript Kapitel für Kapitel und halte Canon und Buchgedächtnis aktuell.":activeMode==="review"?`Ich prüfe das ganze Buch auf Stil, Logik und Kontinuität. ${reviewProgress.done}/${reviewProgress.total} Kapitel sind geprüft.`:activeMode==="revise"?`Ich überarbeite das Manuskript Kapitel für Kapitel. ${revisionProgress.completed}/${revisionProgress.total} Kapitel sind fertig.`:activeMode==="translate"?"Ich übersetze die fertige Buchfassung Kapitel für Kapitel und bewahre Stil, Erzählstimme und Bedeutung.":"Alles gespeichert. Litterum zeigt dir unten automatisch den nächsten sinnvollen Schritt.";
  const activeMessage=activeMode==="plan"?(planRunner.lastMessage||`Kapitel ${planRunner.currentChapterNumber||"…"} wird ausgearbeitet …`):activeMode==="write"?(writer.lastMessage||`Kapitel ${writer.currentChapterNumber||"…"} wird geschrieben …`):activeMode==="review"?(reviewRunner.lastMessage||`${reviewProgress.done}/${reviewProgress.total} Kapitel geprüft`):activeMode==="revise"?(reviser.lastMessage||`Kapitel ${revisionProgress.current?.number||"…"} wird überarbeitet …`):activeMode==="translate"?(translationRunningEdition.lastMessage||"Übersetzung läuft …"):"Der letzte Stand ist gespeichert.";
  const activeButtons=activeMode==="plan"
    ?`<button class="danger-btn" id="stopPlansNow">■ Sofort stoppen</button>${planRunner.running?`<button class="ghost-btn" id="stopPlansAfterCurrent">Nach aktuellem Kapitel stoppen</button>`:""}`
    :activeMode==="write"
      ?`<button class="danger-btn" id="stopWholeBookNow">■ Sofort stoppen</button><button class="ghost-btn" id="stopWholeBook">Nach aktuellem Kapitel stoppen</button>`
      :activeMode==="revise"?`<button class="danger-btn" id="stopBookReviserNow">■ Sofort stoppen</button><button class="ghost-btn" id="stopBookReviserAfterCurrent">Nach aktuellem Kapitel stoppen</button>`
      :activeMode==="translate"?`<button class="danger-btn" id="stopTranslationNow">■ Sofort stoppen</button><button class="ghost-btn" id="stopTranslationAfterCurrent">Nach aktuellem Kapitel stoppen</button>`:"";
  const activeMeta=activeMode==="plan"?`<div class="studio-live-time"><span>• • •</span><strong>${planPercent}%</strong></div>`:activeMode==="write"?`<div class="studio-live-time"><span>• • •</span><strong>${writePercent}%</strong></div>`:activeMode==="revise"?`<div class="studio-live-time"><span>• • •</span><strong>${revisionProgress.percent}%</strong></div>`:activeMode==="translate"?`<div class="studio-live-time"><span>• • •</span><strong>${translationProgress.percent}%</strong></div>`:"";
  const focusPart = focusChapter?`${seriesCrumb(p)}Kapitel ${focusChapter.number} von ${planned||0}`:"Noch kein Kapitel";
  const focusTitle = focusChapter?esc(focusChapter.title||`Kapitel ${focusChapter.number}`):"Bereit zum Start";
  const chapterPlanChip = focusChapter
    ?`<span class="studio-state-chip ${chapterPlanDone?"good":"soft"}">${chapterPlanDone?"✓ Plan ausgearbeitet":"◇ Plan vorhanden"} · ${planWords.toLocaleString("de-DE")} Wörter</span>`
    :`<span class="studio-state-chip soft">Noch keine Kapitel vorhanden</span>`;
  const chapterWriteChip = focusChapter
    ?`<span class="studio-state-chip ${chapterWriteDone?"good":"warn"}">${chapterWriteDone?"✓ Manuskript fertig":"△ Manuskript unvollständig"} · ${manuscriptWords.toLocaleString("de-DE")} Wörter</span>`
    :"";
  const timelineNode=(n,label,kind,sub="")=>`<div class="chapter-stage-step ${kind}"><span>${n}</span><strong>${label}</strong>${sub?`<small>${sub}</small>`:""}</div>`;
  const stagePlan=chapterPlanDone?"done":"active";
  const stageWrite=chapterWriteDone?"done":chapterPlanDone?"active":"idle";
  const stageRev="idle";
  const stageFinal=chapterWriteDone?"done":"idle";
  const developInline=(!planReady||planBusy||planError)?`<section class="card studio-develop-inline ${planReady?"done":planBusy?"busy":planError?"error":""}"><div><strong>Buch entwickeln</strong><p>${planBusy?`${esc(plan?.qualityStatus||"KI arbeitet …")}${developmentActivityHtml(p)}`:planReady?`${planned} Kapitel sind bereit.`:planError?`Die Entwicklung wurde nicht abgeschlossen: ${esc(plan?.qualityStatus||"Unbekannter Fehler")}.`:"Stehen in deinem Briefing schon Kapitel, werden sie sofort übernommen. Sonst entwickelt die KI die Kapitel selbst."}</p></div><div class="studio-write-actions"><button class="${planReady?"ghost-btn":"primary-btn"}" id="developWholeBook" ${(rawWords||p.briefing?.summary)&&!planBusy?"":"disabled"}>${planBusy?"Bitte warten …":planReady?"Roman neu entwickeln":planError?"↻ Erneut versuchen":"✦ Buch entwickeln"}</button>${planBusy?"":`<button class="ghost-btn" id="developWholeBookDeep" ${(rawWords||p.briefing?.summary)?"":"disabled"}>Gründlich von der KI entwickeln</button>`}</div></section>`:"";
  // ---------- Neues Studio-Design (nur Darstellung; alle Knöpfe/IDs und Abläufe bleiben unverändert) ----------
  const ico={
    doc:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>`,
    book:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6.5v13"/></svg>`,
    lock:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>`,
    flag:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 21V4h1v1.2c2-1 4-.8 6 .3s4 1.3 7 .2v9c-3 1.1-5 .9-7-.2s-4-1.3-6-.3V21z"/></svg>`,
    check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    warn:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3" stroke-linecap="round"/></svg>`,
    info:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.3"/></svg>`,
    history:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4.5v4h4"/><path d="M12 8v4.5l3 2"/></svg>`,
    chev:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`,
    left:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
    right:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`,
    pencil:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>`,
    globe:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.5 5.5 3.5 9S14.4 18.5 12 21M12 3C9.6 5.5 8.5 8.5 8.5 12S9.6 18.5 12 21"/></svg>`,
    download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>`
  };
  const sinceIso=activeMode==="plan"?(planRunner.startedAt||getJob(p,"plan",planRunner.currentChapterId)?.startedAt):activeMode==="write"?(writer.startedAt||getJob(p,"write",writer.currentChapterId)?.startedAt):activeMode==="revise"?(reviser.startedAt||""):activeMode==="translate"?(translationRunningEdition.startedAt||""):"";
  const sinceMin=sinceIso&&Number.isFinite(Date.parse(sinceIso))?Math.max(0,Math.round((Date.now()-Date.parse(sinceIso))/60000)):null;
  const sinceLabel=sinceMin===null?"gerade gestartet":sinceMin<60?`${sinceMin} Min.`:`${Math.floor(sinceMin/60)} Std. ${sinceMin%60} Min.`;
  const savedAt=Date.parse(p.updatedAt||"");
  const savedLabel=Number.isFinite(savedAt)?(()=>{const d=new Date(savedAt),t=new Date(),same=d.toDateString()===t.toDateString(),y=new Date(t.getTime()-864e5).toDateString()===d.toDateString();return `${same?"heute":y?"gestern":d.toLocaleDateString("de-DE")}, ${d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})} Uhr`;})():"";
  const pill=(id,kind,title,sub,state="idle",locked=false)=>`<button type="button" class="ss-pill ${state} ${locked?"locked":""}" id="${id}"><span class="ss-pill-icon">${ico[kind]}</span><span class="ss-pill-text"><strong>${state==="on"?`<i class="ss-dot"></i>`:""}${title}</strong><span>${locked?`<b class="ss-lock">${ico.lock}</b>`:""}${sub}</span></span></button>`;
  const stopNow=activeMode==="plan"?"stopPlansNow":activeMode==="review"?"stopBookReviewNow":activeMode==="revise"?"stopBookReviserNow":activeMode==="translate"?"stopTranslationNow":"stopWholeBookNow",stopAfter=activeMode==="plan"?(planRunner.running?"stopPlansAfterCurrent":""):activeMode==="review"?"stopBookReview":activeMode==="revise"?"stopBookReviserAfterCurrent":activeMode==="translate"?"stopTranslationAfterCurrent":"stopWholeBook";
  const stopButtons=activeMode?`<div class="ss-stop-row"><button class="ss-stop-now" id="${stopNow}"><span class="ss-stop-sq"><i></i></span><span><strong>Sofort stoppen</strong><small>Prozess sofort beenden</small></span></button>${stopAfter?`<button class="ss-stop-after" id="${stopAfter}"><span class="ss-flag">${ico.flag}</span><span><strong>Nach aktuellem Kapitel stoppen</strong><small>Aktuelles Kapitel fertigstellen, dann beenden</small></span></button>`:""}</div>`:"";
  const step=(n,label,kind,sub,action)=>`<button type="button" class="ss-step ${kind}" data-studio-step="${action}"><span class="ss-step-dot">${kind==="done"?"✓":n}</span><strong>${label}</strong><small>(${sub})</small></button>`;
  const planDone=!planningNow&&plansExpanded;
  const writeComplete=!!(writeDone===planned&&planned);
  const writeDoneState=!writingNow&&writeComplete;
  const reviewDoneState=!reviewRunning&&reviewDone;
  const revisionDoneState=!revisionRunning&&revisionDone;
  const planActionCard=`<button type="button" class="ss-action ${planningNow?"on":planDone?"done":""}" id="studioPlanAction"><span class="ss-action-icon">${ico.doc}</span><span class="ss-action-main"><strong>Kapitelpläne ausarbeiten</strong><small>Szenen, Wendepunkte und Atmosphäre entwickeln</small><em class="ss-action-chip ${planningNow?"on":planDone?"done":""}">${planningNow?`● Läuft gerade …`:plansExpanded?`✓ Fertig`:planReady?"Bereit zum Start":`${ico.lock} Wartet auf Buchentwicklung`}</em></span><span class="ss-action-chev">${ico.chev}</span></button>`;
  const writeActionCard=`<button type="button" class="ss-action ${writingNow?"on":writeDoneState?"done":""} ${!plansExpanded&&!writingNow?"locked":""}" id="studioWriteAction"><span class="ss-action-icon">${ico.book}</span><span class="ss-action-main"><strong>Buch schreiben</strong><small>Auf Basis der fertigen Kapitelpläne den Roman schreiben</small><em class="ss-action-chip ${writingNow?"on":writeDoneState?"done":""}">${writingNow?`● Läuft gerade …`:writeComplete?`✓ Fertig`:plansExpanded?"Bereit zum Start":`${ico.lock} Wartet auf Plan-Ausarbeitung`}</em></span><span class="ss-action-chev">${ico.chev}</span></button>`;
  const reviewActionCard=`<button type="button" class="ss-action ${reviewRunning?"on":reviewDoneState?"done":""} ${!reviewReady&&!reviewRunning?"locked":""}" id="studioReviewAction"><span class="ss-action-icon">${ico.warn}</span><span class="ss-action-main"><strong>Buch prüfen</strong><small>Das ganze Buch gründlich auf Stil, Logik und Kontinuität prüfen</small><em class="ss-action-chip ${reviewRunning?"on":reviewDoneState?"done":""}">${reviewRunning?`● Läuft gerade …`:reviewDone?`✓ Fertig`:reviewReady?"Bereit zum Start":`${ico.lock} Wartet auf Buch schreiben`}</em></span><span class="ss-action-chev">${ico.chev}</span></button>`;
  const reviewedActionCard=`<button type="button" class="ss-action ${reviewDoneState?"done":""} ${!reviewDone?"locked":""}" id="studioReviewedAction"><span class="ss-action-icon">${ico.check}</span><span class="ss-action-main"><strong>Buch geprüft</strong><small>Geprüfte Ergebnisse und Auffälligkeiten gesammelt ansehen</small><em class="ss-action-chip ${reviewDoneState?"done":""}">${reviewDone?`✓ Fertig`:reviewRunning?`${ico.lock} Wartet auf Abschluss der Prüfung`:`${ico.lock} Wartet auf Prüfung`}</em></span><span class="ss-action-chev">${ico.chev}</span></button>`;
  const revisionActionCard=`<button type="button" class="ss-action ${revisionRunning?"on":revisionDoneState?"done":""} ${!revisionReady&&!revisionRunning?"locked":""}" id="studioRevisionAction"><span class="ss-action-icon">${ico.pencil}</span><span class="ss-action-main"><strong>Buch überarbeiten</strong><small>Prüfhinweise und eigene Wünsche Kapitel für Kapitel umsetzen</small><em class="ss-action-chip ${revisionRunning?"on":revisionDoneState?"done":""}">${revisionRunning?`● Läuft gerade …`:revisionDone?`✓ Fertig`:revisionResumable?`${revisionDoneIds.filter(id=>revisionIds.includes(id)).length}/${revisionIds.length} fertig · Fortsetzen`:revisionReady?"Bereit zum Start":`${ico.lock} Wartet auf Buchprüfung`}</em></span><span class="ss-action-chev">${ico.chev}</span></button>`;
  const revisedActionCard=`<button type="button" class="ss-action ${revisionDoneState?"done":""} ${!revisionDone?"locked":""}" id="studioRevisedAction"><span class="ss-action-icon">${ico.check}</span><span class="ss-action-main"><strong>Buch überarbeitet</strong><small>Die vollständige überarbeitete Fassung ist fertig</small><em class="ss-action-chip ${revisionDoneState?"done":""}">${revisionDone?`✓ Fertig`:revisionRunning?`${ico.lock} Wartet auf Abschluss der Überarbeitung`:`${ico.lock} Wartet auf Überarbeitung`}</em></span><span class="ss-action-chev">${ico.chev}</span></button>`;
  const translateActionCard=`<button type="button" class="ss-action ${translationRunning?"on":""} ${!translationReady&&!translationRunning?"locked":""}" id="studioTranslateAction"><span class="ss-action-icon">${ico.globe}</span><span class="ss-action-main"><strong>Buch übersetzen</strong><small>Die fertige Buchfassung literarisch in weitere Sprachen übertragen</small><em class="ss-action-chip ${translationRunning?"on":""}">${translationRunning?`● Läuft gerade · ${esc(translationRunningEdition.language)}`:translationReady?(translations.editions.some(e=>translationEditionProgress(p,e).open>0)?"Fortsetzen":"Bereit zum Start"):`${ico.lock} Wartet auf Überarbeitung`}</em></span><span class="ss-action-chev">${ico.chev}</span></button>`;
  const translatedActionCard=`<button type="button" class="ss-action ${translationDone?"done":""} ${!translationDone?"locked":""}" id="studioTranslatedAction"><span class="ss-action-icon">${ico.check}</span><span class="ss-action-main"><strong>Buch übersetzt</strong><small>Fertige Sprachfassungen ansehen und als EPUB herunterladen</small><em class="ss-action-chip ${translationDone?"done":""}">${translationDone?`✓ Fertig${completedTranslations.length===1?` · ${completedTranslations[0].language}`:` · ${completedTranslations.length} Sprachen`}`:translationRunning?`${ico.lock} Wartet auf Abschluss der Übersetzung`:`${ico.lock} Wartet auf Übersetzung`}</em></span><span class="ss-action-chev">${ico.chev}</span></button>`;
  const chapterReviewDone=!!focusChapter&&!!focusChapter.reviewedAt&&focusChapter.reviewSignature===reviewContentSignature(focusChapter.content||"");
  const chapterRevisionDone=!!focusChapter&&revisionDoneIds.includes(focusChapter.id);
  const stageReview=chapterReviewDone?"done":chapterWriteDone?"active":"idle";
  const stageRevision=chapterRevisionDone?"done":chapterReviewDone?"active":"idle";
  const stageFinish=chapterRevisionDone?"done":"idle";
  const coreDone=[plansExpanded,writeComplete,reviewDone,revisionDone].filter(Boolean).length;
  const recommendedMode=activeMode||(!planReady?"develop":!plansExpanded?"plan":!writeComplete?"write":!reviewDone?"review":!revisionDone?"revise":"export");
  const recommendedTitle=activeMode?activeTitle:recommendedMode==="develop"?"Als Nächstes: Buch entwickeln":recommendedMode==="plan"?"Als Nächstes: Kapitelpläne ausarbeiten":recommendedMode==="write"?"Als Nächstes: Buch schreiben":recommendedMode==="review"?"Als Nächstes: Buch prüfen":recommendedMode==="revise"?"Als Nächstes: Buch überarbeiten":"Deine überarbeitete Buchfassung ist fertig";
  const recommendedSub=activeMode?activeMessage:recommendedMode==="develop"?"Aus deinem Briefing eine tragfähige Romanstruktur und Kapitelarchitektur entwickeln.":recommendedMode==="plan"?"Die vorhandenen Kapitel mit Szenen, Wendepunkten und Atmosphäre ausarbeiten.":recommendedMode==="write"?"Das Manuskript auf Basis der fertigen Kapitelpläne schreiben.":recommendedMode==="review"?"Das vollständige Manuskript auf Stil, Logik und Kontinuität prüfen.":recommendedMode==="revise"?"Prüfhinweise und deine Wünsche Kapitel für Kapitel umsetzen.":"Du kannst jetzt exportieren oder optional eine Sprachfassung erstellen.";
  const recommendedButton=activeMode?"Fortschritt öffnen":recommendedMode==="develop"?"Buch entwickeln":recommendedMode==="plan"?"Planung starten":recommendedMode==="write"?"Schreiben starten":recommendedMode==="review"?"Prüfung starten":recommendedMode==="revise"?"Überarbeitung starten":"Export öffnen";
  const partCards=(plan?.parts||[]).map((part,i)=>`<details class="studio-part"><summary><span>Teil ${i+1}</span><strong>${esc(part.title||`Teil ${i+1}`)}</strong><em>${(part.chapters||[]).length} Kapitel</em></summary><div class="studio-part-body">${part.purpose?`<p>${esc(part.purpose)}</p>`:""}${part.arc?`<p class="small muted"><strong>Bogen:</strong> ${esc(part.arc)}</p>`:""}</div></details>`).join("");
  return `<section class="studio-page ss-studio ux-studio-v195">
    ${developInline}
    ${studioVariantStripHtml(p)}

    <section class="ux-studio-head">
      <div class="ux-studio-head-copy"><span class="ux-eyebrow">BUCHSTUDIO</span><h2>Dein Arbeitsablauf</h2><p>Vier Kernschritte führen vom Kapitelplan bis zur fertigen Fassung. Übersetzen bleibt optional.</p></div>
      <div class="ux-core-progress"><strong>${coreDone}/4</strong><span>Kernschritte fertig</span></div>
    </section>

    <nav class="ux-journey" aria-label="Arbeitsablauf">
      ${pill("studioPlanPill","doc","Plan",planStatusLabel,planningNow?"on":plansExpanded?"done":"idle",false)}
      ${pill("studioWritePill","book","Schreiben",writeStatusLabel,writingNow?"on":writeComplete?"done":"idle",!writingNow&&!plansExpanded)}
      ${pill("studioReviewPill","warn","Prüfen",reviewStatusLabel,reviewRunning?"on":reviewDone?"done":"idle",!reviewReady&&!reviewRunning)}
      ${pill("studioRevisionPill","pencil","Überarbeiten",revisionStatusLabel,revisionRunning?"on":revisionDone?"done":"idle",!revisionReady&&!revisionRunning)}
      ${pill("studioTranslatePill","globe","Übersetzen",translateStatusLabel,translationRunning?"on":translationDone?"done":"idle",!translationReady&&!translationRunning)}
    </nav>

    <article class="ss-card ux-next-card ${activeMode?"on":""}">
      <div class="ux-next-icon">${activeMode==="write"?ico.book:activeMode==="review"?ico.warn:activeMode==="revise"?ico.pencil:activeMode==="translate"?ico.globe:activeMode==="plan"?ico.doc:ico.flag}</div>
      <div class="ux-next-copy"><span>${activeMode?"LÄUFT GERADE":"NÄCHSTER SCHRITT"}</span><h3>${recommendedTitle}</h3><p>${esc(recommendedSub)}</p></div>
      <button type="button" class="primary-btn ux-next-btn" data-studio-recommended="${recommendedMode}">${recommendedButton}</button>
      ${activeMode?`<div class="ux-next-progress"><div class="ss-bar"><span style="width:${Math.max(4,activePercent)}%"></span></div><b>${activePercent}%</b></div><div class="ux-next-message">${esc(activeMessage)}</div>${stopButtons}`:`<div class="ux-next-save">${ico.check}<span>Automatisch gespeichert${savedLabel?` · ${savedLabel}`:""}</span></div>`}
    </article>

    <details class="ux-focus-details" ${activeMode||focusChapter?"":"open"}>
      <summary><span><strong>Kapitel im Fokus</strong><small>${focusChapter?`Kapitel ${focusChapter.number} · ${esc(focusChapter.title||"")}`:"Noch kein Kapitel vorhanden"}</small></span><span class="ux-summary-chev">⌄</span></summary>
      <article class="ss-card ss-focus ux-focus-body">
        <div class="ss-focus-head">
          <div class="ss-num">${focusChapter?focusChapter.number:"–"}</div>
          <div class="ss-focus-title"><h3>${focusPart}</h3><p>${focusTitle}</p></div>
          <div class="ss-nav"><button id="studioPrevChapter" data-target="${prevStudioChapter?.id||""}" aria-label="Vorheriges Kapitel" ${hasPrev?"":"disabled"}>${ico.left}</button><button id="studioNextChapter" data-target="${nextStudioChapter?.id||""}" aria-label="Nächstes Kapitel" ${hasNext?"":"disabled"}>${ico.right}</button></div>
        </div>
        ${focusChapter?`<div class="ss-chips"><button type="button" class="ss-chip ${chapterPlanDone?"good":""}" id="studioOpenPlan" data-chapter="${focusChapter.id}">${chapterPlanDone?"✓":"◇"} ${chapterPlanDone?"Plan ausgearbeitet":"Plan offen"} · ${planWords.toLocaleString("de-DE")} Wörter</button><button type="button" class="ss-chip ${chapterWriteDone?"good":""}" id="studioOpenWrite" data-chapter="${focusChapter.id}">${chapterWriteDone?"✓":ico.warn} ${chapterWriteDone?"Manuskript fertig":"Manuskript offen"} · ${manuscriptWords.toLocaleString("de-DE")} Wörter</button></div>`:""}
        <div class="ss-steps ux-five-steps">
          ${step("1","Plan",stagePlan,chapterPlanDone?"fertig":"offen","plan")}
          ${step("2","Schreiben",stageWrite,stageWrite==="done"?"fertig":stageWrite==="active"?"bereit":"wartet","write")}
          ${step("3","Prüfen",stageReview,chapterReviewDone?"fertig":chapterWriteDone?"bereit":"wartet","review")}
          ${step("4","Überarbeiten",stageRevision,chapterRevisionDone?"fertig":chapterReviewDone?"bereit":"wartet","revise")}
          ${step("5","Fertig",stageFinish,chapterRevisionDone?"fertig":"offen","read")}
        </div>
        <div class="ux-focus-footer"><div class="ux-autosave">${ico.check}<span>Automatisch gespeichert</span></div><button class="ss-history" id="studioHistory" data-chapter="${focusChapter?.id||""}">${ico.history} Verlauf</button></div>
      </article>
    </details>

    <section class="ux-section-head"><div><span class="ux-eyebrow">ARBEITSABLAUF</span><h3>Alle Schritte</h3></div><p>Tippe einen Schritt an, um Fortschritt, Stoppen oder Fortsetzen zu öffnen.</p></section>
    <section class="ux-stages">
      <div class="ux-stage-row">${planActionCard}</div>
      <div class="ux-stage-row">${writeActionCard}</div>
      <div class="ux-stage-row">${reviewActionCard}${reviewDone?`<div class="ux-stage-result">${reviewedActionCard}</div>`:""}</div>
      <div class="ux-stage-row">${revisionActionCard}${revisionDone?`<div class="ux-stage-result">${revisedActionCard}</div>`:""}${revisionCanUndo?`<button type="button" class="ghost-btn ux-undo-revision" id="undoBookReviser">↶ Letzte Überarbeitung rückgängig</button>`:""}</div>
      <div class="ux-stage-row optional">${translateActionCard}${translationDone?`<div class="ux-stage-result">${translatedActionCard}</div>`:""}<span class="ux-optional-label">optional</span></div>
    </section>

    ${revisionDone?`<section class="ss-download-ready ux-download-ready"><button type="button" class="primary-btn" id="studioDownloadRevised">${ico.download}<span><strong>Überarbeitetes Buch herunterladen</strong><small>Vollständiges EPUB mit allen Kapiteln</small></span></button><button type="button" class="ghost-btn" id="studioOpenExport">Alle Exportformate</button></section>`:""}

    <details class="ux-tools">
      <summary><span><strong>Werkzeuge & Einstellungen</strong><small>Reihe, Romanplan, Qualitätsoptionen und Statistik</small></span><span class="ux-summary-chev">⌄</span></summary>
      <div class="ux-tools-body">
        ${seriesStudioPanel(p)}
        <section class="ux-setting-list">
          <label class="ux-setting-row"><span><strong>Teil-für-Teil-Modus</strong><small>Für sehr große Romane mehrere Teile nacheinander entwickeln und schreiben.</small></span><span class="ux-switch"><input type="checkbox" id="partModeToggle"><i></i></span></label>
          <label class="ux-setting-row"><span><strong>Kompletter kreativer Neustart</strong><small>Alte Fassungen nicht als Szenenvorlage verwenden, Roman-DNA und verbindliche Regeln bleiben.</small></span><span class="ux-switch"><input type="checkbox" id="creativeRestart" ${p.bookPlan?.creativeRestart!==false?"checked":""}><i></i></span></label>
          <label class="ux-setting-row"><span><strong>Qualitätsrunde nach jedem Kapitel</strong><small>Stil, Kontinuität, Wiederholungen und Figurenlogik nach jedem Kapitel prüfen.</small></span><span class="ux-switch"><input type="checkbox" id="bookQualityPass" ${writer.qualityPass!==false?"checked":""}><i></i></span></label>
        </section>
        ${planReady?`<section class="card studio-plan ux-romanplan"><div class="panel-head"><div><h3>Romanplan</h3><div class="small muted">${planned} Kapitel · ${(plan.parts||[]).length} Teile · ${esc(plan.qualityStatus||"KI-geprüft")}</div></div><div class="studio-plan-actions"><button class="ghost-btn" id="copyBookPlan">Plantext kopieren</button><button class="soft-btn" data-tab="chapters">Kapitel ansehen</button></div></div>${plan.bookVision?`<p class="studio-vision">${esc(plan.bookVision)}</p>`:""}${partCards}</section>`:""}
        <section class="card studio-status ux-stats"><div><span>Manuskript</span><strong>${words.toLocaleString("de-DE")} Wörter</strong></div><div><span>Geschrieben</span><strong>${written} / ${planned||0}</strong></div><div><span>Offene Fäden</span><strong>${(p.bookMemory?.openThreads||[]).length}</strong></div><div><span>Canon-Fakten</span><strong>${(p.bookMemory?.facts||[]).length}</strong></div></section>
      </div>
    </details>
  </section>`;
}

function briefingTab(p){
  const b=p.briefing||{},a=b.analysis,sr=seriesForProject(p),original=String(p.originalIdea||"").trim();
  return `<section class="card panel"><div class="panel-head"><div><h2>${sr?`${esc(p.seriesLabel||"Band")} · `:""}Buchbriefing · ${esc(bookVariantUiLabel(activeBookVariant(p)))}</h2><div class="small muted">${sr?`Hier steht nur der Inhalt von „${esc(p.title)}“. Die Reihenbibel und der Canon früherer Bände werden automatisch getrennt als Kontext hinzugefügt.`:"Erzähl der KI dein Buch in einem großen Text. Überschriften und Listen im Briefing sind Wissen über den Roman – sie werden nicht als Kapitel missverstanden."}</div></div></div>
    ${original?`<section class="card original-idea-card"><div class="panel-head"><div><span class="original-idea-kicker">URSPRÜNGLICHE BUCHIDEE</span><h3>So hast du dieses Buch begonnen</h3><div class="small muted">Dieser Text bleibt als Ausgangsidee erhalten, auch wenn du das eigentliche Briefing später stark erweiterst oder umschreibst.</div></div></div><div class="original-idea-text copyable-text">${esc(original)}</div><div class="briefing-actions"><button class="soft-btn" id="copyOriginalIdea">Ursprüngliche Idee kopieren</button><button class="primary-btn" id="copyBriefingBundle">Alles für die gemeinsame Ausarbeitung kopieren</button></div></section>`:""}
    <div class="field"><div class="field-head"><label>Alles, was wir über dieses Buch festgelegt haben</label><button class="ghost-btn mini-copy" id="copyBriefingRaw">Nur Briefing kopieren</button></div><textarea id="briefingRaw" class="copyable-text" rows="15" placeholder="Handlung, Figuren, Welt, Sprache, Stil, Beziehungen, Wünsche, Verbote … einfach alles hinein.">${esc(b.raw||"")}</textarea></div>
    <div class="briefing-actions"><button class="primary-btn" id="analyzeBriefing">✦ KI verstehen lassen</button><button class="ghost-btn" id="saveBriefing">Nur speichern</button><button class="soft-btn" id="briefingToVoice">🔊 Vorlesen</button><button class="soft-btn" data-tab="studio">Zurück zum Buchstudio</button></div>
    ${a?`<div class="analysis-preview card"><div class="panel-head"><div><h3>Erkanntes Buchprofil</h3><div class="small muted">Die Analyse füllt Roman-DNA, Figuren und Stil. Echte Kapitel entstehen erst über „Buch entwickeln“.</div></div><button class="primary-btn" id="applyBriefing">✓ Roman-DNA übernehmen</button></div>
      <div class="preview-grid"><div><span>Titel</span><strong>${esc(a.title||"—")}</strong></div><div><span>Genre</span><strong>${esc(a.genre||"—")}</strong></div><div><span>Sprachen</span><strong>${esc((a.languages||[]).join(", ")||"—")}</strong></div><div><span>Figuren</span><strong>${(a.characters||[]).length}</strong></div><div><span>Beziehungen</span><strong>${(a.relationships||[]).length}</strong></div><div><span>Story-Hinweise</span><strong>${(a.chapterIdeas||[]).length}</strong></div></div>
      <div class="field"><div class="field-head"><label>KI-Zusammenfassung</label><button class="ghost-btn mini-copy" id="copyBriefingSummary">Nur Zusammenfassung kopieren</button></div><textarea id="briefingSummary" class="copyable-text" rows="7">${esc(a.summary||"")}</textarea></div>
      <details><summary>Alle erkannten Daten ansehen</summary><div class="details-copy-row"><button class="ghost-btn mini-copy" id="copyBriefingJson">Nur diese Daten kopieren</button></div><pre class="json-preview copyable-text">${esc(JSON.stringify(a,null,2))}</pre></details>
    </div>`:""}
  </section>`;
}
function ideaVaultTab(p){
  const items=p.ideaVault||[];
  return `<section class="card panel"><div class="panel-head"><div><h2>Ideenspeicher</h2><div class="small muted">Erst sammeln. Die App schreibt daraus nichts, bis du es ausdrücklich freigibst.</div></div><span class="tag">${items.length} Ideen</span></div>
    <div class="idea-capture card"><textarea id="vaultIdea" rows="6" placeholder="Sprich oder schreib einfach, was dir gerade einfällt …"></textarea><div class="briefing-actions"><button class="primary-btn" id="collectIdea">＋ Nur sammeln</button><button class="soft-btn" id="classifyIdea">✦ KI einsortieren</button></div></div>
    <div class="vault-list">${items.length?items.slice().reverse().map(x=>`<article class="card vault-item"><div class="vault-head"><span class="tag">${esc(x.category||"Unsortiert")}</span><span class="small muted">${x.status==="applied"?"Übernommen":"Gesammelt"}</span></div><p>${esc(x.text)}</p>${x.reason?`<div class="small muted">${esc(x.reason)}</div>`:""}${x.target?`<div class="small">Vorschlag: <strong>${esc(x.target)}</strong></div>`:""}<div class="briefing-actions">${x.status!=="applied"?`<button class="soft-btn apply-idea" data-id="${x.id}">In passende Stelle übernehmen</button>`:""}<button class="ghost-btn delete-idea" data-id="${x.id}">Löschen</button></div></article>`).join(""):'<div class="empty">Noch keine Ideen gesammelt.</div>'}</div>
  </section>`;
}
function readerTab(p){
  const written=(p.chapters||[]).filter(c=>c.content?.trim());
  return `<section class="card panel reader-mode"><div class="panel-head"><div><h2>${esc(p.title)}</h2><div class="small muted">Lesemodus · ${written.length} von ${p.chapters.length} Kapiteln geschrieben · Kapitel antippen für Lese-Pop-up</div></div><div class="briefing-actions"><button class="primary-btn" id="readWholeBook" ${written.length?"":"disabled"}>🔊 Alles vorlesen</button><button class="ghost-btn" id="ttsVoiceSettings">⚙ KI-Stimme</button><button class="ghost-btn" id="ttsPause">⏯ Pause / weiter</button><button class="ghost-btn" id="ttsStopGlobal">■ Stop</button></div></div><div class="small muted" data-tts-status role="status" style="margin:8px 0">${esc(ttsState.status)}</div><div class="reader-library">${written.length?written.map(c=>`<article class="card reader-chapter-card" data-open-reader="${c.id}"><span class="reader-word-badge">${countWords(c.content).toLocaleString("de-DE")} Wörter</span><div class="reader-chapter-head"><div><div class="small muted">Kapitel ${c.number} von ${p.chapters.length}</div><h3>${esc(c.title)}</h3></div></div><p>${esc(previewText(c.content,420))}</p><div class="reader-card-actions"><button class="primary-btn open-reader" data-id="${c.id}">Öffnen</button><button class="soft-btn read-one" data-id="${c.id}">🔊 Vorlesen</button></div></article>`).join(""):'<div class="empty">Sobald du ein Kapitel geschrieben hast, erscheint es hier.</div>'}</div></section>`;
}

function editorialTab(p){
  const e=p.editorial||{},c=chapter(),written=(p.chapters||[]).filter(x=>String(x.content||"").trim());
  const currentId=c?.id||written[0]?.id||"";
  return `<section class="card panel"><div class="panel-head"><div><h2>Prüfung & Lektorat</h2><div class="small muted">Die KI schlägt vor. Dein Original bleibt unverändert, bis du etwas übernimmst.</div></div></div>
    <div class="editorial-toolbar card"><div class="field"><label>Prüfumfang</label><select id="editorialScope"><option value="current" ${["current","chapter"].includes(e.lastScope)?"selected":""}>Aktuelles Kapitel${c?` ${c.number}`:""}</option><option value="specific" ${e.lastScope==="specific"?"selected":""}>Bestimmtes geschriebenes Kapitel</option><option value="to_current" ${e.lastScope==="to_current"?"selected":""}>Alle geschriebenen Kapitel bis hier</option><option value="book" ${e.lastScope==="book"?"selected":""}>Gesamtes geschriebenes Buch</option></select></div>
    <div class="field" id="editorialChapterPickWrap" ${e.lastScope==="specific"?"":"hidden"}><label>Kapitel auswählen</label><select id="editorialChapterPick">${written.map(ch=>`<option value="${ch.id}" ${(e.lastChapterId||currentId)===ch.id?"selected":""}>Kapitel ${ch.number} · ${esc(ch.title)}</option>`).join("")}</select></div></div>
    <div class="editorial-grid">
      <button class="editorial-card" data-editorial="lektorat"><strong>Lektorat</strong><span>Plot, Figuren, Motivation, Tempo, Längen, Wiederholungen, Logik, emotionale Wirkung</span></button>
      <button class="editorial-card" data-editorial="proofread"><strong>Korrektorat</strong><span>Rechtschreibung, Grammatik, Zeichensetzung, Zeitform und versehentliche Perspektivfehler</span></button>
      <button class="editorial-card" data-editorial="beta"><strong>Testleser</strong><span>Lesewirkung, Mitgefühl, Spannung, Verwirrung, Neugier und Stellen, an denen man aussteigen könnte</span></button>
      <button class="editorial-card" data-editorial="full"><strong>Ganzbuch-Analyse</strong><span>Figurenbögen, Beziehung, Spannungskurve, offene Fäden, Kontinuität und Stilentwicklung</span></button>
    </div>
    <div class="beta-profiles"><span class="small muted">Testleser-Profil:</span><select id="betaProfile"><option value="normal">Normaler Leser</option><option value="emotional">Emotionaler Testleser</option><option value="tension">Spannungs-Testleser</option><option value="romance">Romance-Testleser</option><option value="critical">Kritischer Testleser</option></select></div>
    <div id="editorialResult" class="card editorial-result">${e.proofread?proofreadCompareHtml(e.proofread):e.lastResult?`<div class="result-head"><strong>KI-Auswertung</strong><button class="ghost-btn mini-copy" id="copyEditorialResult">Nur Auswertung kopieren</button></div><div class="result-text copyable-text">${esc(e.lastResult)}</div>`:'<div class="muted">Wähle eine Prüfung. Für die Einzelprüfung kannst du jedes bereits geschriebene Kapitel auswählen.</div>'}</div>
  </section>`;
}
function proofreadCompareHtml(data){const c=chapter();return `<div class="panel-head"><div><h3>Vorher / Nachher</h3><div class="small muted">Noch nicht übernommen.</div></div><div class="briefing-actions"><button class="soft-btn" id="openProofreadPopup">Im Pop-up öffnen</button><button class="primary-btn" id="acceptProofread">Korrektur übernehmen</button></div></div><div class="compare-grid"><section class="card compare-card"><div class="provider-label">Original</div><div class="sample">${esc(data.original||c?.content||"")}</div></section><section class="card compare-card"><div class="provider-label">Korrektur</div><div class="sample">${esc(data.correctedText||"")}</div></section></div>${(data.notes||[]).length?`<div class="notes-list"><h3>Hinweise</h3>${data.notes.map(n=>`<div class="rule good"><span>${esc(n)}</span></div>`).join("")}</div>`:""}`;}

function charactersTab(p){
  return `<section class="card panel"><div class="panel-head"><div><h2>Figuren</h2><div class="small muted">Charakter, Stimme, Denken und Wissen bleiben projektweit verfügbar.</div></div><button class="primary-btn" id="addCharacter">＋ Figur</button></div>
  <div class="char-grid">${p.characters.map(c=>`<article class="card char-card" data-char="${c.id}"><div class="avatar">${esc((c.name||"?").slice(0,1))}</div><div class="small muted">${esc(c.role||"Figur")}</div><h3>${esc(c.name)}</h3><p>${esc(c.personality||"")}</p><button class="soft-btn edit-char" data-id="${c.id}">Bearbeiten</button></article>`).join("")}</div></section>`;
}
function relationshipsTab(p){
  return `<section class="card panel"><div class="panel-head"><div><h2>Beziehungen</h2><div class="small muted">Emotionale Entwicklung wird nicht bei jedem Kapitel zurückgesetzt.</div></div><button class="primary-btn" id="addRelationship">＋ Beziehung</button></div>
  ${p.relationships.length?p.relationships.map(r=>`<article class="card relationship"><h3>${esc(r.a)} ♡ ${esc(r.b)}</h3><p class="muted small">${esc(r.note||"")}</p>${Object.entries(r.metrics||{}).map(([k,v])=>`<div class="meter-row"><span>${esc(k)}</span><div class="meter"><span style="width:${Number(v)||0}%"></span></div><strong>${Number(v)||0}%</strong></div>`).join("")}<button class="soft-btn edit-rel" data-id="${r.id}">Bearbeiten</button></article>`).join(""):`<div class="empty">Noch keine Beziehungen angelegt.</div>`}</section>`;
}
function chapterProgress(ch){
  const planWords=countWords(ch?.plan||""),textWords=countWords(ch?.content||"");
  const hasPlan=planWords>0,hasText=textWords>0;
  const expandedPlan=!!ch?.planExpanded||(/szenischer\s+kapitelplan/i.test(ch?.plan||"")&&planWords>=80);
  return {planWords,textWords,hasPlan,hasText,expandedPlan,incomplete:hasText&&!!ch?.writeIncomplete};
}
function chapterProgressHtml(ch,compact=false){
  const x=chapterProgress(ch);
  const planLabel=x.expandedPlan?"Plan ausgearbeitet":x.hasPlan?"Plan vorhanden":"Plan offen";
  if(compact){
    return `<div class="chapter-mini-status"><span class="${x.expandedPlan?"done":x.hasPlan?"has":"open"}">${x.expandedPlan?"✓ ":""}${planLabel}${x.hasPlan?` · ${x.planWords.toLocaleString("de-DE")} W.`:""}</span><span class="${x.incomplete?"has":x.hasText?"done":"open"}">${x.incomplete?"⚠ Text unvollständig":x.hasText?"✓ Text":"Text offen"}${x.hasText?` · ${x.textWords.toLocaleString("de-DE")} W.`:""}</span></div>`;
  }
  return `<div class="chapter-progress-summary"><span class="${x.expandedPlan?"done":x.hasPlan?"has":"open"}">${x.expandedPlan?"✓ ":""}${planLabel}${x.hasPlan?` · ${x.planWords.toLocaleString("de-DE")} Wörter`:""}</span><span class="${x.incomplete?"has":x.hasText?"done":"open"}">${x.incomplete?"⚠ Manuskript unvollständig – „Weiter schreiben“ setzt fort":x.hasText?"✓ Manuskript":"Manuskript noch nicht geschrieben"}${x.hasText?` · ${x.textWords.toLocaleString("de-DE")} Wörter`:""}</span>${x.incomplete?`<button type="button" class="ghost-btn mini-copy" id="markChapterComplete" title="Nur wählen, wenn du das Kapitel selbst fertig geschrieben hast">✓ Als fertig markieren</button>`:""}</div>`;
}

function chapterBeingWritten(p,c){const j=getJob(p,"write",c?.id);return !!j&&j.status==="running"&&jobRunningHere("write",p.id,c.id);}
function writingActionLabel(id){
  return ({generate:"Kapitel schreiben",continue:"Weiter schreiben",wish:"Wunsch an die KI",versions:"Rückgängig",reader:"Lese-Pop-up",search:"Suchen",reference:"Stil einfrieren",protect:"Passage schützen",read:"Vorlesen",dictate:"Diktieren",rate:"Vorlesetempo",pause:"Pause",stop:"Stop",voice:"KI-Stimme"})[id]||id;
}
function writingActionHtml(id,p,c,progress){
  const isThis=jobBlocking(p,"write",c.id),disabled=isThis?' disabled':'';
  switch(id){
    case "generate": return `<button class="primary-btn write-tool writing-primary-action" data-write-action="generate" id="generateChapter"${disabled}>${isThis?`✦ Kapitel ${c.number} wird geschrieben · ${progress.textWords.toLocaleString("de-DE")} Wörter`:`✦ Kapitel ${c.number} ${progress.hasText?"neu schreiben":"schreiben"} · ${progress.textWords.toLocaleString("de-DE")} Wörter`}</button>`;
    case "continue": return `<button class="soft-btn write-tool" data-write-action="continue" id="continueChapter"${disabled}>${isThis?`Kapitel ${c.number} läuft …`:`Kapitel ${c.number} weiter schreiben`}</button>`;
    case "wish": return `<button class="soft-btn write-tool" data-write-action="wish" id="toggleWishPanel">✎ Wunsch an die KI</button>`;
    case "versions": return `<button class="ghost-btn write-tool" data-write-action="versions" id="openVersions">↶ Rückgängig${(c.versions||[]).length?` (${c.versions.length})`:""}</button>`;
    case "reader": return `<button class="ghost-btn write-tool" data-write-action="reader" id="openCurrentReader">◫ Lese-Pop-up</button>`;
    case "search": return `<button class="ghost-btn write-tool" data-write-action="search" id="toggleChapterSearch">⌕ Suchen</button>`;
    case "reference": return `<button class="ghost-btn write-tool" data-write-action="reference" id="setReference">Stil einfrieren</button>`;
    case "protect": return `<button class="ghost-btn write-tool" data-write-action="protect" id="protectPassage">☆ Passage schützen</button>`;
    case "read": return `<button class="soft-btn write-tool" data-write-action="read" id="readChapter">🔊 Vorlesen</button>`;
    case "dictate": return `<button class="ghost-btn write-tool" data-write-action="dictate" id="dictateChapter">🎙 Diktieren</button>`;
    case "rate": return `<select id="ttsQuickRate" data-write-action="rate" class="mini-select write-tool" title="Vorlesetempo">${[0.9,1,1.15,1.25,1.5,1.75,2].map(r=>`<option value="${r}" ${Math.abs(Number(p.tts.rate||0.95)-r)<0.01?"selected":""}>${r}×</option>`).join("")}</select>`;
    case "pause": return `<button class="ghost-btn write-tool" data-write-action="pause" id="ttsPause">⏯ Pause</button>`;
    case "stop": return `<button class="ghost-btn write-tool" data-write-action="stop" id="ttsStopGlobal">■ Stop</button>`;
    case "voice": return `<button class="ghost-btn write-tool" data-write-action="voice" id="ttsVoiceSettings">⚙ KI-Stimme</button>`;
    default:return "";
  }
}
// Werkzeugleiste: Reihenfolge und Sperre gelten für ALLE Bücher (auf diesem Gerät).
const OLD_DEFAULT_WRITING_ORDER=["generate","continue","reader","search","reference","protect","read","dictate","rate","pause","stop","voice"];
function writingPrefs(){
  state.prefs ||= {};
  const pr=state.prefs;
  if(!Array.isArray(pr.writingActionOrder)){
    // Einmalig: eine schon angepasste Reihenfolge (aus dem zuletzt bearbeiteten Buch) für alle übernehmen.
    const src=[...(state.projects||[])].sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))).find(x=>{const o=Array.isArray(x.ui?.writingActionOrder)?x.ui.writingActionOrder:null;if(!o)return false;const oldOnly=o.filter(k=>OLD_DEFAULT_WRITING_ORDER.includes(k)).join();return oldOnly!==OLD_DEFAULT_WRITING_ORDER.join()&&o.join()!==DEFAULT_WRITING_ACTION_ORDER.join();});
    pr.writingActionOrder=src?src.ui.writingActionOrder.filter(k=>k!=="wish"&&k!=="versions"):[...DEFAULT_WRITING_ACTION_ORDER];
    if(typeof pr.writingToolbarLocked!=="boolean"&&src)pr.writingToolbarLocked=src.ui.writingToolbarLocked!==false;
  }
  let order=pr.writingActionOrder.filter((x,n,a)=>DEFAULT_WRITING_ACTION_ORDER.includes(x)&&a.indexOf(x)===n);
  // Neue Werkzeuge direkt hinter „Weiter schreiben“ einsortieren.
  for(const x of ["wish","versions"])if(!order.includes(x)){const at=order.indexOf("continue");order.splice(at>=0?at+1+(x==="versions"&&order.includes("wish")?1:0):order.length,0,x);}
  for(const x of DEFAULT_WRITING_ACTION_ORDER)if(!order.includes(x))order.push(x);
  if(order.join()!==pr.writingActionOrder.join())pr.writingActionOrder=order;
  if(typeof pr.writingToolbarLocked!=="boolean")pr.writingToolbarLocked=true;
  if(!Number.isInteger(pr.toolbarVisible)||pr.toolbarVisible<2)pr.toolbarVisible=5;
  return pr;
}
function writingToolbarHtml(p,c,progress){
  const pr=writingPrefs();
  const bookComplete=(p.chapters||[]).length>0&&(p.chapters||[]).every(ch=>!chapterNeedsWriting(ch))&&!projectRunsJobs("write",p.id);
  // Ist das ganze Buch fertig, verschwinden die beiden riskanten Hauptaktionen „neu schreiben“ und
  // „weiter schreiben“. So kann ein fertiges letztes Kapitel nicht versehentlich überschrieben werden.
  // Alle bewussten Bearbeitungswerkzeuge (Wunsch an die KI, Fassungen, Lesen usw.) bleiben erhalten.
  const fullOrder=pr.writingActionOrder;
  const order=bookComplete?fullOrder.filter(id=>id!=="generate"&&id!=="continue"):fullOrder;
  const visible=Math.min(order.length,pr.toolbarVisible),rest=order.slice(visible);
  const completeBanner=bookComplete?`<div class="book-complete-banner"><span class="book-complete-check">✓</span><div><strong>Alle ${p.chapters.length} Kapitel sind geschrieben</strong><small>Das Manuskript ist vollständig. Ein versehentliches Neu-Schreiben ist hier gesperrt.</small></div></div>`:"";
  return `${completeBanner}<div class="editor-toolbar writing-toolbar ${pr.writingToolbarLocked?"locked":"unlocked"}">${order.slice(0,visible).map(id=>writingActionHtml(id,p,c,progress)).join("")}${rest.length?`<button class="toolbar-config-btn" id="toggleMoreTools" aria-expanded="${pr.moreToolsOpen?"true":"false"}">${pr.moreToolsOpen?"▴ Weniger Werkzeuge":`⋯ Weitere Werkzeuge (${rest.length})`}</button>`:`<button class="toolbar-config-btn" id="writingToolbarSettings" title="Werkzeugleiste anordnen">⚙ Anordnen ${pr.writingToolbarLocked?"🔒":"🔓"}</button>`}</div>
  ${rest.length?`<div class="editor-toolbar writing-toolbar more-tools" id="moreTools" ${pr.moreToolsOpen?"":"hidden"}>${rest.map(id=>writingActionHtml(id,p,c,progress)).join("")}<button class="toolbar-config-btn" id="writingToolbarSettings" title="Werkzeugleiste anordnen">⚙ Anordnen ${pr.writingToolbarLocked?"🔒":"🔓"}</button></div>`:""}
  ${wishPanelHtml(p,c)}
  <div class="chapter-search-bar" id="chapterSearchBar" hidden><input class="input" id="chapterSearchInput" placeholder="Wort oder ganzen Satz suchen …"><button class="ghost-btn" id="chapterSearchPrev">↑</button><button class="ghost-btn" id="chapterSearchNext">↓</button><span class="search-count" id="chapterSearchCount">0 Treffer</span><button class="icon-btn" id="chapterSearchClose">×</button></div>`;
}
function openWritingToolbarSettings(){
  const pr=writingPrefs();
  const order=[...pr.writingActionOrder];
  const rows=()=>order.map((id,i)=>`<div class="tool-order-row${i===pr.toolbarVisible?" tool-order-split":""}" data-tool-row="${id}"><span>${i<pr.toolbarVisible?"":"⋯ "}${esc(writingActionLabel(id))}</span><div><button class="icon-btn tool-up" data-i="${i}" ${pr.writingToolbarLocked?"disabled":""}>↑</button><button class="icon-btn tool-down" data-i="${i}" ${pr.writingToolbarLocked?"disabled":""}>↓</button></div></div>`).join("");
  modal(`<h2>Werkzeugleiste anpassen</h2><p class="small muted">Die Reihenfolge gilt für <strong>alle Bücher</strong>. Die obersten Werkzeuge siehst du sofort, der Rest liegt unter „Weitere Werkzeuge“. Solange das Layout gesperrt ist, kann nichts versehentlich verschoben werden.</p><div class="layout-lock-card"><strong>${pr.writingToolbarLocked?"🔒 Layout gesperrt":"🔓 Layout entsperrt"}</strong><button class="soft-btn" id="toggleToolbarLock">${pr.writingToolbarLocked?"Zum Sortieren entsperren":"Jetzt festnageln"}</button></div><div class="field"><label>Sofort sichtbar</label><select id="toolbarVisibleCount">${[3,4,5,6,7,8,order.length].filter((n,i,a)=>a.indexOf(n)===i).map(n=>`<option value="${n}" ${n===pr.toolbarVisible?"selected":""}>${n===order.length?"alle Werkzeuge":`die ersten ${n}`}</option>`).join("")}</select></div><div id="toolOrderList">${rows()}</div><div class="modal-actions"><button class="ghost-btn" id="resetToolbarOrder">Standard wiederherstellen</button><button class="primary-btn" data-close>Fertig</button></div>`);
  const redraw=()=>{const box=$("#toolOrderList");if(box)box.innerHTML=rows();bindRows();render();};
  const bindRows=()=>{
    $$(".tool-up").forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(i>0){[order[i-1],order[i]]=[order[i],order[i-1]];pr.writingActionOrder=[...order];store.save({sync:false});redraw();}});
    $$(".tool-down").forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(i<order.length-1){[order[i+1],order[i]]=[order[i],order[i+1]];pr.writingActionOrder=[...order];store.save({sync:false});redraw();}});
  };
  bindRows();
  $("#toolbarVisibleCount").onchange=e=>{pr.toolbarVisible=Number(e.target.value)||5;store.save({sync:false});redraw();};
  $("#toggleToolbarLock").onclick=()=>{pr.writingToolbarLocked=!pr.writingToolbarLocked;store.save({sync:false});closeModal();render();openWritingToolbarSettings();};
  $("#resetToolbarOrder").onclick=()=>{pr.writingActionOrder=[...DEFAULT_WRITING_ACTION_ORDER];pr.toolbarVisible=5;store.save({sync:false});closeModal();render();openWritingToolbarSettings();};
}
// ---------- Wunsch an die KI (pro Kapitel) und Fassungen ----------
// Die Autorin beschreibt in eigenen Worten, was sich ändern soll („Das Ende emotionaler“). Die KI überarbeitet
// das ganze Kapitel, nur das Ende oder nur die markierte Stelle. Das Ergebnis erscheint zuerst als Vorschau;
// erst „Übernehmen“ ändert das Kapitel – die vorige Fassung bleibt unter „Fassungen“ wiederherstellbar.
const liveRevisions=new Map(); // Kapitel-ID → laufende Überarbeitung (nur in diesem Fenster)
let lastTextSelection=null;
const REVISION_LABELS={whole:"ganzes Kapitel",ending:"Ende des Kapitels",selection:"markierte Stelle",book:"Buch-Überarbeitung"};
function wishPanelHtml(p,c){
  const pr=writingPrefs(),rev=c.pendingRevision,running=liveRevisions.has(c.id),hasText=!!String(c.content||"").trim();
  const open=pr.wishOpen||!!rev||!!String(c.wish||"").trim();
  let preview="";
  if(rev){
    const stale=rev.status==="running"&&!running;
    const state=running?`<span class="warning">KI schreibt die neue Fassung …</span>`:rev.status==="error"?`<span class="warning">${esc(rev.error||"Überarbeitung fehlgeschlagen")}</span>`:stale?`<span class="warning">Unterbrochen – bitte „Nochmal“ tippen.</span>`:"Neue Fassung – prüfen und übernehmen";
    preview=`<div class="revision-preview"><div class="revision-head"><strong>Vorschau · ${esc(REVISION_LABELS[rev.mode]||"Überarbeitung")}</strong><span class="small">${state}</span></div>
      <textarea class="manuscript revision-text" id="revisionPreview" readonly>${esc(rev.text||"")}</textarea>
      <div class="wish-actions"><button class="primary-btn" id="acceptRevision" ${running||!String(rev.text||"").trim()||rev.status!=="ready"?"disabled":""}>✓ Übernehmen</button><button class="soft-btn" id="retryRevision" ${running?"disabled":""}>↻ Nochmal</button><button class="ghost-btn" id="discardRevision" ${running?"disabled":""}>Verwerfen</button></div></div>`;
  }
  return `<details class="wish-panel card" id="wishPanel" ${open?"open":""}><summary><strong>✎ Dein Wunsch an die KI</strong><span class="small muted">„Schreib das Ende emotionaler“, „mehr Dialog“ …</span></summary>
    <textarea id="chapterWish" rows="3" placeholder="Was soll die KI in diesem Kapitel ändern oder schreiben? Zum Beispiel: Das Ende soll emotionaler werden. Rahel zweifelt stärker. Mehr Dialog zwischen Rahel und Adam.">${esc(c.wish||"")}</textarea>
    <div class="wish-actions">
      <button class="soft-btn" id="reviseWhole" ${!hasText||running?"disabled":""}>Ganzes Kapitel überarbeiten</button>
      <button class="soft-btn" id="reviseEnding" ${!hasText||running?"disabled":""}>Nur das Ende</button>
      <button class="soft-btn" id="reviseSelection" ${!hasText||running?"disabled":""}>Nur markierte Stelle</button>
      <button class="soft-btn" id="continueWithWish" ${!hasText||running?"disabled":""}>Mit Wunsch weiterschreiben</button>
    </div>
    <p class="small muted" style="margin:6px 0 0">${hasText?"Für „Nur markierte Stelle“ markiere den Text zuerst im Manuskript. Die neue Fassung erscheint erst als Vorschau.":"Dein Wunsch gilt auch für „Kapitel schreiben“."}</p>
    ${preview}</details>`;
}
function pushVersion(c,label){
  const content=String(c?.content||"");if(!content.trim())return;
  if(c.versions?.[0]?.content===content)return;
  c.versions=[{id:uid(),at:now(),label:String(label||"Fassung").slice(0,90),content,words:countWords(content)},...(Array.isArray(c.versions)?c.versions:[])].slice(0,3);
}
// Das „Ende“: ungefähr das letzte Viertel, an einer Absatzgrenze (mindestens die letzten zwei Absätze).
function endingStart(content){
  const text=String(content||""),total=countWords(text);if(total<60)return 0;
  const re=/\n\s*\n/g,starts=[0];let m;while((m=re.exec(text)))starts.push(m.index+m[0].length);
  let best=null;
  for(let i=starts.length-1;i>=0;i--){const tail=countWords(text.slice(starts[i]));if(tail>=total*0.22&&starts.length-i>=2){best=starts[i];break;}}
  if(best===null||countWords(text.slice(best))>total*0.45){
    // Kaum Absätze: am Satzende ab ca. 75 % trennen.
    const target=Math.floor(text.length*0.75),dot=text.slice(target).search(/[.!?…]["“”»«']?\s/);
    best=dot>=0?target+dot+1:target;
    while(best<text.length&&/\s/.test(text[best]))best++;
  }
  return best;
}
function cleanRevisionText(t){return String(t||"").replace(/^\s*```[a-z]*\n?|\n?```\s*$/g,"").trim();}
async function reviseChapter(mode,range=null){
  const p=project(),c=chapter();if(!p||!c)return;
  if(liveRevisions.has(c.id))return toast("Für dieses Kapitel läuft schon eine Überarbeitung.");
  const wish=String(c.wish||"").trim();
  if(!wish)return toast("Schreib zuerst in das Wunsch-Feld, was die KI ändern soll.",4500);
  const content=String(c.content||"");if(!content.trim())return toast("Dieses Kapitel enthält noch keinen Text.");
  let start=0,end=content.length;
  if(range&&content.slice(range.start,range.end)===range.original){start=range.start;end=range.end;}
  else if(mode==="ending")start=endingStart(content);
  else if(mode==="selection"){
    const sel=lastTextSelection;
    if(!sel||sel.chapterId!==c.id||sel.end<=sel.start||content.slice(sel.start,sel.end)!==sel.text)return toast("Markiere zuerst im Manuskript die Stelle, die überarbeitet werden soll.",4500);
    start=sel.start;end=sel.end;
  }
  const original=content.slice(start,end);
  c.pendingRevision={mode,wish,start,end,original,text:"",status:"running",at:now()};
  liveRevisions.set(c.id,{projectId:p.id});store.save({sync:false});render();
  document.querySelector("#wishPanel")?.scrollIntoView({block:"nearest"});
  let text="",paintTimer=null;
  const paint=()=>{paintTimer=null;const el=$("#revisionPreview");if(el&&chapter()?.id===c.id){el.value=text;el.scrollTop=el.scrollHeight;}};
  try{
    const r=await runExclusive("revise-"+c.id,async()=>{
      await apiStreamChapter("revise_passage",{chapter:{number:c.number,title:c.title,plan:c.plan,memory:c.memory},mode,before:content.slice(0,start),passage:original,after:content.slice(end),wish},delta=>{text+=delta;if(!paintTimer)paintTimer=setTimeout(paint,200);},p);
      return true;
    });
    if(r==="locked")throw new Error("Dieses Kapitel wird gerade in einem anderen Fenster überarbeitet.");
    const lc=liveChapter(p.id,c.id);
    if(lc?.pendingRevision){lc.pendingRevision.text=cleanRevisionText(text);lc.pendingRevision.status=lc.pendingRevision.text?"ready":"error";if(!lc.pendingRevision.text)lc.pendingRevision.error="Die KI hat keinen Text geliefert.";}
  }catch(e){
    const lc=liveChapter(p.id,c.id);
    if(lc?.pendingRevision){lc.pendingRevision.status="error";lc.pendingRevision.error=readableError(e,"Überarbeitung fehlgeschlagen");lc.pendingRevision.text=cleanRevisionText(text);}
  }finally{clearTimeout(paintTimer);liveRevisions.delete(c.id);}
  store.save({sync:false});render();
}
function liveChapter(pid,cid){return projectById(pid)?.chapters?.find(x=>x.id===cid)||null;}
function acceptRevision(){
  const p=project(),c=chapter(),rev=c?.pendingRevision;if(!rev||rev.status!=="ready")return;
  const content=String(c.content||"");
  let start=rev.start,end=rev.end;
  if(content.slice(start,end)!==rev.original){
    // Inzwischen wurde im Kapitel getippt: die Stelle anhand ihres Wortlauts wiederfinden.
    const at=rev.original?content.indexOf(rev.original):-1;
    if(at<0)return toast("Die Stelle wurde inzwischen verändert. Kopiere die neue Fassung aus der Vorschau oder tippe „Nochmal“.",6000);
    start=at;end=at+rev.original.length;
  }
  pushVersion(c,`vor Wunsch: ${rev.wish}`);
  const before=content.slice(0,start),after=content.slice(end);
  const glueL=before&&!/\s$/.test(before)?(rev.mode==="ending"?"\n\n":" "):"",glueR=after&&!/^\s/.test(after)?" ":"";
  c.content=before+glueL+rev.text+glueR+after;c.status="Entwurf";c.pendingRevision=null;p.updatedAt=now();
  save();render();toast("Übernommen. Unter „Rückgängig“ kannst du jederzeit zur vorigen Kapitelversion zurück.",5000);
}
function discardRevision(){const c=chapter();if(!c?.pendingRevision)return;c.pendingRevision=null;store.save({sync:false});render();}
function retryRevision(){const c=chapter(),rev=c?.pendingRevision;if(!rev)return;const range={start:rev.start,end:rev.end,original:rev.original};c.pendingRevision=null;reviseChapter(rev.mode==="book"?"whole":rev.mode,range);}
function openVersions(){
  const p=project(),c=chapter();if(!c)return;
  const list=Array.isArray(c.versions)?c.versions:[];
  if(!list.length)return modal(`<h2>Rückgängig · Kapitel ${c.number}</h2><p>Hier liegen nur frühere Versionen dieses einen Kapitels. Das ist getrennt von den <strong>Buchfassungen</strong> Version 1, 2 und 3. Sobald du eine KI-Überarbeitung übernimmst oder das Kapitel neu schreiben lässt, wird die vorige Kapitelversion hier aufgehoben (die letzten drei).</p><div class="modal-actions"><button class="primary-btn" data-close>OK</button></div>`);
  modal(`<h2>Rückgängig · Kapitel ${c.number}</h2><p class="small muted">Nur frühere Versionen dieses Kapitels. Deine komplette Buchfassung bleibt davon unberührt. Beim Wiederherstellen wird die aktuelle Kapitelversion ebenfalls aufgehoben.</p>${list.map((v,i)=>`<div class="card version-row"><div><strong>${esc(new Date(v.at).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}))}</strong> · ${Number(v.words||countWords(v.content)).toLocaleString("de-DE")} Wörter<div class="small muted">${esc(v.label||"")}</div></div><div class="wish-actions"><button class="ghost-btn" data-version-view="${i}">Ansehen</button><button class="soft-btn" data-version-restore="${i}">Wiederherstellen</button></div></div>`).join("")}<div class="modal-actions"><button class="primary-btn" data-close>Schließen</button></div>`,"wide");
  $$("[data-version-view]").forEach(b=>b.onclick=()=>{const v=list[+b.dataset.versionView];closeModal();modal(`<h2>Fassung vom ${esc(new Date(v.at).toLocaleString("de-DE"))}</h2><textarea class="manuscript reader-edit-text" readonly>${esc(v.content)}</textarea><div class="modal-actions"><button class="ghost-btn" id="versionBack">Zurück</button><button class="soft-btn" id="versionRestore">Diese Fassung wiederherstellen</button></div>`,"wide");$("#versionBack").onclick=()=>{closeModal();openVersions();};$("#versionRestore").onclick=()=>restoreVersion(v.id);});
  $$("[data-version-restore]").forEach(b=>b.onclick=()=>restoreVersion(list[+b.dataset.versionRestore].id));
}
function restoreVersion(id){
  const p=project(),c=chapter(),v=(c?.versions||[]).find(x=>x.id===id);if(!v)return;
  const content=v.content;pushVersion(c,"vor dem Wiederherstellen");c.versions=c.versions.filter(x=>x.id!==id);
  c.content=content;c.status="Entwurf";c.writeIncomplete=false;p.updatedAt=now();save();closeModal();render();toast("Frühere Fassung wiederhergestellt.");
}
function rememberTextSelection(e){
  const el=e.target,c=chapter();if(!c||el?.id!=="chapterContent")return;
  if(el.selectionEnd>el.selectionStart)lastTextSelection={chapterId:c.id,start:el.selectionStart,end:el.selectionEnd,text:el.value.slice(el.selectionStart,el.selectionEnd)};
}
function repairFinishedProcessFlags(p){
  if(!p)return;
  let changed=false;
  const chapters=p.chapters||[];
  const allPlansDone=chapters.length>0&&chapters.every(c=>!chapterNeedsPlan(c));
  const allWritten=chapters.length>0&&chapters.every(c=>!chapterNeedsWriting(c));
  const planJobStillActive=chapters.some(c=>jobBlocking(p,"plan",c.id));
  const writeJobStillActive=chapters.some(c=>jobBlocking(p,"write",c.id));
  const planRuntimeActive=activePlanRunnerRuntimes.has(p.id)||projectRunsJobs("plan",p.id)||planJobStillActive;
  const writeRuntimeActive=activeBookWriterRuntimes.has(p.id)||projectRunsJobs("write",p.id)||writeJobStillActive;

  // Gespeicherte Runner-Flags können nach Tab-Neuladen/Abbruch übrig bleiben. Sie dürfen weder
  // eine neue Buchfassung noch einen frischen Start von „Buch schreiben“ blockieren, wenn real
  // kein Kapitelauftrag mehr läuft. Bereits erzeugte Pläne/Texte bleiben dabei vollständig erhalten.
  if(p.planRunner?.running&&!planRuntimeActive){
    p.planRunner.running=false;p.planRunner.stopAfterCurrent=false;p.planRunner.currentChapterId=null;p.planRunner.currentChapterNumber=0;p.planRunner.completed=chapters.filter(c=>!chapterNeedsPlan(c)).length;p.planRunner.total=chapters.length;p.planRunner.lastMessage=allPlansDone?"Plan-Ausarbeitung vollständig abgeschlossen":"Unterbrochene Plan-Ausarbeitung zurückgesetzt – vorhandene Pläne bleiben erhalten";changed=true;
  }
  if(p.bookWriter?.running&&!writeRuntimeActive&&!bookWriterRunsElsewhere(p)){
    p.bookWriter.running=false;p.bookWriter.stopAfterCurrent=false;p.bookWriter.currentChapterId=null;p.bookWriter.currentChapterNumber=0;p.bookWriter.ownerDeviceId="";p.bookWriter.completed=chapters.filter(c=>!chapterNeedsWriting(c)).length;p.bookWriter.total=chapters.length;p.bookWriter.lastMessage=allWritten?"Buch vollständig geschrieben":"Unterbrochenes Buchschreiben zurückgesetzt – vorhandene Kapitel bleiben erhalten";changed=true;
  }
  const reviewProgress=bookReviewProgress(p);
  // Die Buchprüfung besitzt keinen fortsetzbaren Browser-Runner. Wenn kein echter Runtime mehr
  // existiert, ist ein gespeichertes „running“ immer nur ein Reststatus. Ergebnisse bleiben erhalten.
  if(p.reviewRunner?.running&&!activeReviewRuntimes.has(p.id)){
    p.reviewRunner.running=false;p.reviewRunner.stopRequested=false;p.reviewRunner.immediateStop=false;p.reviewRunner.currentChapterNumbers=[];p.reviewRunner.completed=reviewProgress.done;p.reviewRunner.total=reviewProgress.total;p.reviewRunner.finishedAt=p.reviewRunner.finishedAt||now();p.reviewRunner.lastMessage=reviewProgress.open===0?"Buchprüfung vollständig abgeschlossen":`Unterbrochene Buchprüfung zurückgesetzt · ${reviewProgress.done}/${reviewProgress.total} Kapitel bleiben geprüft.`;changed=true;
  }
  const reviser=p.bookReviser;
  if(reviser?.running&&!activeReviserRuntimes.has(p.id)){
    const ids=Array.isArray(reviser.ids)?reviser.ids:[],done=Array.isArray(reviser.done)?reviser.done:[];
    const allRevisionDone=ids.length>0&&ids.every(id=>done.includes(id));
    const heartbeat=Number(reviser.lastHeartbeat)||0;
    const staleRevision=!heartbeat||Date.now()-heartbeat>120000;
    if(allRevisionDone){
      reviser.running=false;reviser.stopAfterCurrent=false;reviser.currentId=null;reviser.finishedAt=reviser.finishedAt||now();reviser.lastMessage="Fertig – alle Kapitel überarbeitet";changed=true;
    }else if(staleRevision){
      // Alte Überarbeitungs-Flags aus früheren Tabs/Sitzungen dürfen eine neue Buchfassung nicht dauerhaft sperren.
      // Bereits überarbeitete Kapitel und deren Fassungen bleiben vollständig erhalten.
      reviser.running=false;reviser.stopAfterCurrent=false;reviser.currentId=null;reviser.finishedAt=reviser.finishedAt||now();reviser.lastMessage=`Unterbrochene Buchüberarbeitung zurückgesetzt · ${done.length}/${ids.length} Kapitel bleiben überarbeitet.`;changed=true;
    }
  }
  const tr=runningTranslationEdition(p);
  if(tr&&!activeTranslatorRuntimes.has(p.id)){const heartbeat=Number(tr.lastHeartbeat)||0;if(!heartbeat||Date.now()-heartbeat>180000){const q=translationEditionProgress(p,tr);tr.running=false;tr.stopAfterCurrent=false;tr.immediateStop=false;tr.currentChapterId="";tr.completed=q.done;tr.total=q.total;tr.finishedAt=tr.finishedAt||now();tr.lastMessage=`Unterbrochene Übersetzung zurückgesetzt · ${q.done}/${q.total} Kapitel bleiben gespeichert.`;changed=true;}}
  const dj=p.bookDevelopmentJob;
  if(dj&&["running","interrupted"].includes(dj.status)&&p.bookPlan?.status==="ready"&&chapters.length&&!activeBookDevelopmentRuntimes.has(p.id)){
    p.bookDevelopmentJob=null;changed=true;
  }
  if(changed){p.updatedAt=now();store.save({sync:false});}
}
function bookVariantBusyReason(p){
  if(!p)return "";
  repairFinishedProcessFlags(p);
  if(projectPlanningActive(p)||activePlanRunnerRuntimes.has(p.id))return "Die Plan-Ausarbeitung läuft noch.";
  if(projectWritingActive(p)||activeBookWriterRuntimes.has(p.id))return "Das Buch wird noch geschrieben.";
  if(p.reviewRunner?.running||activeReviewRuntimes.has(p.id))return "Die Buchprüfung läuft noch.";
  if(p.bookReviser?.running||activeReviserRuntimes.has(p.id))return "Die Buchüberarbeitung läuft noch.";
  if(runningTranslationEdition(p)||activeTranslatorRuntimes.has(p.id))return "Die Buchübersetzung läuft noch.";
  if(["running","interrupted"].includes(p.bookDevelopmentJob?.status)||activeBookDevelopmentRuntimes.has(p.id))return "Die Buchentwicklung läuft noch.";
  return "";
}
function bookVariantBusy(p){return !!bookVariantBusyReason(p);}
function guardBookVariantAction(p){const reason=bookVariantBusyReason(p);if(!reason)return false;toast(reason+" Danach kannst du die Buchfassung wechseln oder neu anlegen.",5500);return true;}
function bookVariantStats(p,v){
  const b=ensureBookVariantsShape(p),snap=v.id===b.activeId?captureBookVariantSnapshot(p):v.snapshot||blankBookVariantSnapshot(p),list=snap.chapters||[];
  return {written:list.filter(c=>String(c.content||"").trim()&&!c.writeIncomplete).length,words:list.reduce((n,c)=>n+countWords(c.content||""),0),total:list.length,firstNo:list[0]?.number||1,lastNo:list[list.length-1]?.number||list.length||0};
}
function bookVariantUiLabel(v){
  if(!v)return "Original";
  if(v.kind==="final")return "Finale";
  const m=String(v.name||"").match(/(\d+)/),n=m?Number(m[1]):null;
  if(!n||n===1)return "Original";
  return `Version ${n}`;
}
function bookVariantUiMark(v){
  if(v?.kind==="final")return "FINAL";
  const m=String(v?.name||"").match(/(\d+)/),n=m?Number(m[1]):1;
  return n<=1?"ORIG":`V${n}`;
}
// Feste Farbe je Buchfassung: Original = Litterum-Lila, V2 = blau, V3 = türkis, Final = grün.
function bookVariantColor(v){if(v?.kind==="final")return "final";const m=String(v?.name||"").match(/(\d+)/),n=m?Number(m[1]):1;return n<=1?"v1":n===2?"v2":"v3";}
function bookVariantShort(v){if(v?.kind==="final")return "Final";const m=String(v?.name||"").match(/(\d+)/),n=m?Number(m[1]):1;return n<=1?"Original":`Version ${n}`;}
function variantChipHtml(p){
  if(!p)return "";const eg=editionGroupForProject(p);if(eg)return `<button type="button" class="variant-chip vc-${editionColorByOrder(p)}" id="variantChip" title="Buchfassung wechseln"><span>${esc(editionLabel(p))}</span></button>`;
  const v=activeBookVariant(p);if(!v)return "";return `<button type="button" class="variant-chip vc-${bookVariantColor(v)}" id="variantChip" title="Buchfassung wechseln"><span>${esc(bookVariantUiLabel(v))}</span></button>`;
}
function studioVariantStripHtml(p){
  if(editionGroupForProject(p))return studioEditionsHtml(p);
  const b=ensureBookVariantsShape(p);if(!b)return "";
  const drafts=b.variants.filter(v=>v.kind!=="final"),final=b.variants.find(v=>v.kind==="final");
  const slots=[];for(let i=0;i<3;i++)slots.push(drafts[i]?{v:drafts[i]}:{empty:true,label:i===0?"Original":`Version ${i+1}`,mark:`V${i+1}`,color:i===0?"v1":i===1?"v2":"v3"});
  slots.push(final?{v:final}:{empty:true,label:"Final",mark:"FINAL",color:"final"});
  const box=x=>{
    if(x.empty)return `<button type="button" class="ss-variant empty vc-${x.color}" data-variant-manage="1"><b>${x.mark}</b><strong>${x.label}</strong><small>noch nicht angelegt</small></button>`;
    const v=x.v,st=bookVariantStats(p,v),active=v.id===b.activeId,done=st.total>0&&st.written===st.total;
    const meta=st.total?`${done?"✓ ":""}${st.written}/${st.total} Kap.${active?" · offen":""}`:"noch keine Kapitel";
    return `<button type="button" class="ss-variant vc-${bookVariantColor(v)} ${active?"active":""}" ${active?'data-variant-manage="1"':`data-studio-variant="${v.id}"`}><b>${esc(bookVariantUiMark(v))}</b><strong>${esc(bookVariantShort(v))}</strong><small>${meta}</small></button>`;
  };
  return `<section class="ss-variants"><div class="ss-variants-head"><span>Buchfassungen</span><button type="button" class="ss-variants-manage" data-variant-manage="1">Verwalten ›</button></div><div class="ss-variants-row">${slots.map(box).join("")}</div></section>`;
}
document.addEventListener("click",e=>{
  if(e.target.closest?.("#openAppSettings")){openAppSettings();return;}
  const ed=e.target.closest?.("[data-edition-open],[data-edition-manage]");if(ed){if(ed.dataset.editionOpen)openEditionProject(ed.dataset.editionOpen);else openEditionManager();return;}
  const t=e.target.closest?.("#variantChip,[data-variant-manage],[data-studio-variant]");if(!t)return;
  if(t.id==="variantChip"&&editionGroupForProject(project())){openEditionManager();return;}
  if(t.dataset.studioVariant){switchBookVariant(t.dataset.studioVariant);return;}
  openBookVariantsManager();
});
function bookVariantsBarHtml(p){
  if(editionGroupForProject(p)){const st=bookStatsRaw(p),complete=st.complete;return `<div class="book-variant-bar vc-${editionColorByOrder(p)} ${complete?"complete":""}"><div class="book-variant-active-mark">${esc(editionMark(p))}</div><div class="book-variant-bar-copy"><span class="book-variant-kicker">Du schreibst gerade in</span><strong>${esc(editionLabel(p))}</strong><div class="book-variant-live-meta"><span class="variant-status ${complete?"done":st.done?"progress":"open"}">${complete?"✓ vollständig":st.total?`${st.done} von ${st.total} Kapiteln geschrieben`:"noch keine Kapitel entwickelt"}</span></div></div><button type="button" class="ghost-btn" data-edition-manage="1">Buchfassung wechseln</button></div>`;}
  const b=ensureBookVariantsShape(p),v=activeBookVariant(p),drafts=b.variants.filter(x=>x.kind!=="final").length,stats=bookVariantStats(p,v),total=stats.total;
  const complete=total>0&&stats.written===total,status=complete?"✓ vollständig":total?`${stats.written} von ${total} Kapiteln geschrieben`:"noch keine Kapitel entwickelt";
  return `<div class="book-variant-bar vc-${bookVariantColor(v)} ${complete?"complete":""}"><div class="book-variant-active-mark">${esc(bookVariantUiMark(v))}</div><div class="book-variant-bar-copy"><span class="book-variant-kicker">Du schreibst gerade in</span><strong>${esc(bookVariantUiLabel(v))}</strong><div class="book-variant-live-meta"><span class="variant-status ${complete?"done":stats.written?"progress":"open"}">${status}</span></div></div><button type="button" class="ghost-btn" id="openBookVariants">Buchfassung wechseln</button></div>`;
}
function switchBookVariant(id){
  const p=project(),b=ensureBookVariantsShape(p),target=b.variants.find(v=>v.id===id);if(!p||!target||target.id===b.activeId)return;
  if(guardBookVariantAction(p))return;
  saveActiveBookVariant(p);const snap=target.snapshot||blankBookVariantSnapshot(p);b.activeId=target.id;applyBookVariantSnapshot(p,snap);target.snapshot=null;p.updatedAt=now();store.save();closeModal();render();toast(`${target.name} ist jetzt aktiv. Andere Fassungen bleiben vollständig getrennt.`,5000);
}
function setBookVariantCanon(id){
  const p=project(),b=ensureBookVariantsShape(p),v=b.variants.find(x=>x.id===id);if(!v)return;b.canonId=id;p.updatedAt=now();store.save();closeModal();render();openBookVariantsManager();toast(`${v.name} ist jetzt die Reihenfassung für nachfolgende Bände.`,5000);
}
function createIndependentBookVariant(){
  const p=project();if(editionGroupForProject(p))return createIndependentEdition();
  const b=ensureBookVariantsShape(p);if(guardBookVariantAction(p))return;
  const active=activeBookVariant(p),activeStats=bookVariantStats(p,active),chapterTotal=activeStats.total;
  if(!chapterTotal||activeStats.written<chapterTotal)return toast(`${bookVariantUiLabel(active)||"Die aktuelle Fassung"} ist noch nicht vollständig geschrieben. Eine neue unabhängige Fassung wird erst nach dem letzten Kapitel freigeschaltet.`,6000);
  const drafts=b.variants.filter(v=>v.kind!=="final");if(drafts.length>=3)return toast("Du hast bereits drei unabhängige Schreibfassungen. Nutze jetzt „Vergleichen & zusammenstellen“.",5500);
  const emptyDraft=drafts.find(v=>v.id!==b.activeId&&variantIsEmpty(v,b));
  if(emptyDraft)return toast(`${bookVariantUiLabel(emptyDraft)} ist noch leer. Öffne sie oder lösche sie zuerst, statt eine weitere Fassung anzulegen.`,6000);
  const name=nextFreeVariantName(b);
  modal(`<h2>${esc(name)} unabhängig anlegen?</h2><p>Das <strong>Briefing, die Roman-DNA, Figuren, Beziehungen und Stilregeln</strong> werden als eigene Kopie übernommen. Danach kannst du sie in ${esc(name)} ändern, ohne das Original zu verändern.</p><p><strong>Nicht übernommen werden:</strong> Kapitelstruktur, Kapitelüberschriften, ausgearbeitete Pläne, Manuskripttext, Buchgedächtnis, Prüfberichte und Übersetzungen. Dadurch kann ${esc(name)} wirklich eine andere Handlung und andere Kapitel entwickeln.</p><p class="small muted">Nach dem Anlegen landest du zuerst im Briefing dieser Fassung. Danach lässt du diese Fassung neu verstehen und entwickeln.</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="confirmNewBookVariant">${esc(name)} anlegen</button></div>`);
  $("#confirmNewBookVariant").onclick=()=>{
    const btn=$("#confirmNewBookVariant");if(btn.disabled)return;btn.disabled=true;
    if(b.variants.filter(v=>v.kind!=="final").length!==drafts.length||b.variants.some(v=>v.name===name)){closeModal();return;}
    saveActiveBookVariant(p);
    const v={id:uid(),name,kind:"draft",createdAt:now(),updatedAt:now(),snapshot:freshIndependentBookVariantSnapshot(p)};
    b.variants.push(v);b.activeId=v.id;applyBookVariantSnapshot(p,v.snapshot);v.snapshot=null;
    p.updatedAt=now();store.save();closeModal();state.activeTab="briefing";render();
    toast(`${name} ist unabhängig angelegt. Briefing und Roman-DNA gehören jetzt nur zu dieser Fassung; alte Kapitelüberschriften wurden nicht übernommen.`,7000);
  };
}
function resetActiveBookVariant(){
  const p=project(),b=ensureBookVariantsShape(p),v=activeBookVariant(p);if(!v)return;if(guardBookVariantAction(p))return;
  const canonNote=b.canonId===v.id?`<p class="warning"><strong>Achtung:</strong> Diese Fassung ist derzeit die Reihenfassung. Nach dem Zurücksetzen bleibt sie als Reihenfassung markiert, enthält aber zunächst keinen Manuskript-Canon, bis du sie neu geschrieben hast.</p>`:"";
  modal(`<h2>${esc(v.name)} komplett auf Null setzen?</h2><p>Nur diese Buchfassung wird zurückgesetzt. Ihr eigenes Briefing, ihre Roman-DNA, Figuren, Beziehungen und Stilregeln bleiben erhalten. Kapitelpläne und Manuskript dieser Fassung beginnen danach neu. Alle anderen Buchfassungen bleiben unverändert.</p>${canonNote}<p><strong>Zurückgesetzt werden in dieser Fassung:</strong> ausgearbeitete Kapitelpläne, Manuskripttext, Kapitelgedächtnis, Buchgedächtnis, frühere Kapitel-Fassungen, Prüfberichte, Buchüberarbeitung, geschützte Textstellen und die aus dieser Fassung eingefrorene Stilreferenz.</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="danger-btn" id="confirmResetBookVariant">Diese Fassung auf Null setzen</button></div>`);
  $("#confirmResetBookVariant").onclick=()=>{const blank=blankBookVariantSnapshot(p);v.updatedAt=now();applyBookVariantSnapshot(p,blank);v.snapshot=null;p.updatedAt=now();store.save();closeModal();render();toast(`${v.name} wurde vollständig auf Null gesetzt.`,5000);};
}
function finalVariantSnapshotFrom(source,p){
  const snap=cloneVariantValue(source,blankBookVariantSnapshot(p))||blankBookVariantSnapshot(p);snap.reviewRunner=idleVariantReview();snap.bookReviser=null;snap.editorial={lastMode:"",lastScope:"chapter",lastResult:"",proofread:null};
  for(const c of snap.chapters||[]){c.reviewResult="";c.reviewedAt="";c.reviewSignature="";c.versions=[];c.wish="";}return snap;
}
function ensureFinalBookVariant(p){
  const b=ensureBookVariantsShape(p);let final=b.variants.find(v=>v.kind==="final");if(final)return final;const source=bookVariantSnapshot(p,activeBookVariant(p));final={id:uid(),name:"Finale Fassung",kind:"final",createdAt:now(),updatedAt:now(),snapshot:finalVariantSnapshotFrom(source,p)};b.variants.push(final);store.save();return final;
}
function copyVariantChapterToFinal(sourceId,chapterId){
  const p=project(),b=ensureBookVariantsShape(p);if(guardBookVariantAction(p))return;const src=b.variants.find(v=>v.id===sourceId),final=ensureFinalBookVariant(p);if(!src||!final)return;
  const sourceSnap=bookVariantSnapshot(p,src),finalSnap=bookVariantSnapshot(p,final),current=(p.chapters||[]).find(c=>c.id===chapterId),num=Number(current?.number)||0,from=(sourceSnap.chapters||[]).find(c=>Number(c.number)===num),to=(finalSnap.chapters||[]).find(c=>Number(c.number)===num);if(!from||!to)return;
  Object.assign(to,{plan:String(from.plan||""),planExpanded:!!from.planExpanded,content:String(from.content||""),memory:String(from.memory||""),status:String(from.status||"Entwurf"),writeIncomplete:!!from.writeIncomplete,versions:[],wish:"",reviewResult:"",reviewedAt:"",reviewSignature:""});
  // Sobald Fassungen gemischt werden, darf kein globales Buchgedächtnis einer einzelnen Ausgangsfassung
  // als vermeintlicher Canon weiterwirken. Die Kapitelgedächtnisse bleiben erhalten; der Reihen-Kontext
  // kann daraus bei Bedarf einen sicheren kompakten Übergang bilden.
  finalSnap.bookMemory=emptyVariantBookMemory();finalSnap.reviewRunner=idleVariantReview();finalSnap.bookReviser=null;finalSnap.editorial={lastMode:"",lastScope:"chapter",lastResult:"",proofread:null};final.updatedAt=now();
  if(b.activeId===final.id){applyBookVariantSnapshot(p,finalSnap);final.snapshot=null;}else final.snapshot=finalSnap;p.updatedAt=now();store.save();closeModal();openBookVariantCompare(chapterId);toast("Kapitel in die finale Zusammenstellung übernommen.");
}
function openBookVariantChapterView(variantId,chapterId){
  const p=project(),b=ensureBookVariantsShape(p);const v=b.variants.find(x=>x.id===variantId),c=p.chapters.find(x=>x.id===chapterId),snap=v?bookVariantSnapshot(p,v):null,x=snap?.chapters?.find(y=>Number(y.number)===Number(c?.number));if(!v||!c||!x)return;
  closeModal();modal(`<h2>${esc(bookVariantUiLabel(v))} · Kapitel ${c.number}</h2><p class="small muted">${esc(c.title)} · ${countWords(x.content||"").toLocaleString("de-DE")} Wörter</p><textarea class="manuscript reader-edit-text" readonly>${esc(x.content||"")}</textarea><div class="modal-actions"><button class="primary-btn" id="backToVariantCompare">Zurück zum Vergleich</button></div>`,"wide");$("#backToVariantCompare").onclick=()=>{closeModal();openBookVariantCompare(chapterId);};
}
function openBookVariantCompare(chapterId=null){
  const p=project(),b=ensureBookVariantsShape(p);if(!p)return;const drafts=b.variants.filter(v=>v.kind!=="final"),final=b.variants.find(v=>v.kind==="final")||null;const c=p.chapters.find(x=>x.id===chapterId)||chapter()||p.chapters[0];if(!c)return toast("Noch keine Kapitel vorhanden.");
  const cards=drafts.map(v=>{const snap=bookVariantSnapshot(p,v),x=snap?.chapters?.find(y=>Number(y.number)===Number(c.number))||{},words=countWords(x.content||"");return `<article class="book-compare-card vc-${bookVariantColor(v)}"><div class="book-compare-head"><div><strong>${esc(bookVariantUiLabel(v))}</strong><span>${words.toLocaleString("de-DE")} Wörter</span></div>${b.canonId===v.id?`<em>Reihenfassung</em>`:""}</div><p>${esc(previewText(x.content||"Noch kein Text in dieser Fassung.",520))}</p><div class="wish-actions"><button class="ghost-btn" data-variant-view="${v.id}">Ganz ansehen</button>${final?`<button class="soft-btn" data-variant-to-final="${v.id}">Dieses Kapitel übernehmen</button>`:""}</div></article>`;}).join("");
  modal(`<h2>Buchfassungen vergleichen</h2><p class="small muted">Die Fassungen bleiben getrennt. Du entscheidest Kapitel für Kapitel, was in eine finale Zusammenstellung übernommen wird. Innerhalb eines übernommenen Kapitels kannst du danach im normalen Editor einzelne Passagen weiter kombinieren.</p><div class="field"><label>Kapitel vergleichen</label><select id="variantCompareChapter">${p.chapters.map(ch=>`<option value="${ch.id}" ${ch.id===c.id?"selected":""}>Kapitel ${ch.number}: ${esc(ch.title)}</option>`).join("")}</select></div>${cards}${final?`<section class="card final-variant-note"><strong>Finale Fassung vorhanden</strong><span>Übernommene Kapitel landen dort. Nach dem Zusammenstellen solltest du diese Fassung erneut als ganzes Buch prüfen.</span></section>`:`<section class="card final-variant-note"><strong>Noch keine finale Zusammenstellung</strong><span>Sie wird als zusätzliche Fassung angelegt und verändert keine deiner Versionen.</span><button class="primary-btn" id="createFinalVariant">Finale Fassung aus ${esc(bookVariantUiLabel(activeBookVariant(p)))} anlegen</button></section>`}<div class="modal-actions"><button class="ghost-btn" id="backToBookVariants">Buchfassungen</button>${final?`<button class="primary-btn" id="openFinalVariant">Finale Fassung öffnen</button>`:""}</div>`,"wide");
  $("#variantCompareChapter").onchange=e=>{const id=e.target.value;closeModal();openBookVariantCompare(id);};
  $$('[data-variant-view]').forEach(btn=>btn.onclick=()=>openBookVariantChapterView(btn.dataset.variantView,c.id));
  $$('[data-variant-to-final]').forEach(btn=>btn.onclick=()=>copyVariantChapterToFinal(btn.dataset.variantToFinal,c.id));
  $("#createFinalVariant")?.addEventListener("click",()=>{ensureFinalBookVariant(p);closeModal();openBookVariantCompare(c.id);});
  $("#backToBookVariants").onclick=()=>{closeModal();openBookVariantsManager();};
  $("#openFinalVariant")?.addEventListener("click",()=>switchBookVariant(final.id));
}
function originalBookVariant(b){
  const drafts=(b?.variants||[]).filter(v=>v.kind!=="final");
  return drafts.find(v=>/(?:^|\s)1(?:\s|$)/.test(String(v.name||"")))||drafts[0]||null;
}
function stopVariantWorkForDeletion(p){
  if(!p)return;
  p.planRunner ||= {};p.planRunner.running=false;p.planRunner.stopAfterCurrent=false;p.planRunner.lastMessage="Gestoppt, weil diese Buchfassung gelöscht wird.";
  for(const j of Object.values(p.planJobs||{})){if(j&&["running","interrupted"].includes(j.status)){j.status="interrupted";j.manualPause=true;j.lastError="Buchfassung wird gelöscht";}}
  abortRuntimeMapForProject(activePlanRuntimes,p.id);
  if(p.bookWriter){stopBookWriterNow(p,"Gestoppt, weil diese Buchfassung gelöscht wird.");for(const j of Object.values(p.writeJobs||{})){if(j&&["running","interrupted"].includes(j.status)){j.status="interrupted";j.manualPause=true;j.lastError="Buchfassung wird gelöscht";}}}
  abortRuntimeMapForProject(activeWriteRuntimes,p.id);
  if(p.reviewRunner){p.reviewRunner.immediateStop=true;p.reviewRunner.stopRequested=true;p.reviewRunner.running=false;const ctrls=activeReviewAbortControllers?.get?.(p.id);if(ctrls)for(const ctrl of [...ctrls]){try{ctrl.abort();}catch{}}}
  if(p.bookReviser){p.bookReviser.running=false;p.bookReviser.stopAfterCurrent=false;p.bookReviser.currentId=null;p.bookReviser.lastMessage="Gestoppt, weil diese Buchfassung gelöscht wird.";}
  const tr=runningTranslationEdition(p);if(tr){tr.running=false;tr.stopAfterCurrent=false;tr.immediateStop=true;tr.currentChapterId="";try{activeTranslatorAbortControllers?.get?.(p.id)?.abort?.();}catch{}}
  if(p.bookDevelopmentJob&&["running","interrupted"].includes(p.bookDevelopmentJob.status))p.bookDevelopmentJob=null;
}
function deleteBookVariantById(p,id){
  const b=ensureBookVariantsShape(p),v=b.variants.find(x=>x.id===id),original=originalBookVariant(b);
  if(!v||!original||v.id===original.id)return toast("Das Original bleibt erhalten und kann nicht als Buchfassung gelöscht werden.");
  const wasActive=v.id===b.activeId;
  const snapshotForTrash=wasActive?{...cloneDeep(v),snapshot:captureBookVariantSnapshot(p)}:cloneDeep(v);
  if(wasActive)stopVariantWorkForDeletion(p);
  const fallback=original;
  if(b.canonId===v.id)b.canonId=fallback.id;
  b.variants=b.variants.filter(x=>x.id!==v.id);
  if(wasActive){
    b.activeId=fallback.id;
    const snap=fallback.snapshot||blankBookVariantSnapshot(p);
    applyBookVariantSnapshot(p,snap);
    fallback.snapshot=null;
  }
  const tid=trashAdd({kind:"variant",label:bookVariantUiLabel(v),where:p.title,projectId:p.id,variant:snapshotForTrash});
  setTimeout(()=>undoBar(`${bookVariantUiLabel(v)} gelöscht.`,tid),80);
  p.updatedAt=now();store.save();closeModal();render();openBookVariantsManager();toast(`${bookVariantUiLabel(v)} wurde gelöscht. Das Original bleibt unverändert.`,5500);
}
function openBookVariantsManager(){
  const p=project();if(!p)return;if(editionGroupForProject(p))return openEditionManager(p);
  const b=ensureBookVariantsShape(p);repairFinishedProcessFlags(p);
  const drafts=b.variants.filter(v=>v.kind!=="final"),original=originalBookVariant(b);
  const active=activeBookVariant(p),activeStats=bookVariantStats(p,active),activeComplete=activeStats.total>0&&activeStats.written===activeStats.total,canNew=drafts.length<3&&activeComplete;
  const activeSummary=`<section class="book-variant-current vc-${bookVariantColor(active)}"><span>AKTUELL GEÖFFNET</span><div><b>${esc(bookVariantUiMark(active))}</b><strong>${esc(bookVariantUiLabel(active))}</strong></div><small>Briefing, Roman-DNA, Kapitelstruktur, Pläne und Manuskript gehören nur zu dieser Buchfassung.</small></section>`;
  const rows=b.variants.map(v=>{
    const st=bookVariantStats(p,v),isActive=v.id===b.activeId,canon=v.id===b.canonId,complete=st.total>0&&st.written===st.total,started=st.written>0&&!complete,isOriginal=v.id===original?.id;
    const range=st.total?`Kapitel ${st.firstNo}–${st.lastNo}`:"Noch keine Kapitel entwickelt";
    const status=complete?`<b class="variant-status done">✓ vollständig</b>`:started?`<b class="variant-status progress">${st.written} von ${st.total} geschrieben</b>`:st.total?`<b class="variant-status open">noch nicht geschrieben</b>`:`<b class="variant-status open">noch nicht entwickelt</b>`;
    return `<div class="card book-variant-row vc-${bookVariantColor(v)} ${complete?"complete":started?"in-progress":""} ${isActive?"active":""}"><div class="book-variant-row-mark">${esc(bookVariantUiMark(v))}</div><div class="book-variant-main"><strong>${esc(bookVariantUiLabel(v))}</strong><span>${range} · ${st.words.toLocaleString("de-DE")} Wörter · ${status}</span><div class="book-variant-badges">${isActive?`<em class="active">Aktiv geöffnet</em>`:""}${canon?`<em>Reihenfassung</em>`:""}${v.kind==="final"?`<em>Zusammenstellung</em>`:""}${isOriginal?`<em>geschützt</em>`:""}</div></div><div class="book-variant-actions">${isActive?`<button class="ghost-btn" disabled>Hier arbeitest du</button>`:`<button class="soft-btn" data-switch-book-variant="${v.id}">Diese Fassung öffnen</button>`}${canon?"":`<button class="ghost-btn" data-canon-book-variant="${v.id}">Für Reihe verwenden</button>`}${!isOriginal?`<button class="ghost-btn variant-del" data-delete-book-variant="${v.id}">🗑 ${esc(bookVariantUiLabel(v))} löschen</button>`:""}</div></div>`;
  }).join("");
  const busyReason=bookVariantBusyReason(p);
  const newVariantNote=drafts.length>=3?`<p class="small muted">Drei unabhängige Schreibfassungen sind vorhanden. Du kannst eine Alternative löschen oder die Fassungen vergleichen.</p>`:!activeComplete?`<p class="small muted">Eine neue unabhängige Fassung wird freigeschaltet, sobald <strong>${esc(bookVariantUiLabel(active))}</strong> vollständig geschrieben ist.</p>`:"";
  const readinessNote=busyReason?`<div class="book-variant-process-note"><strong>Diese Fassung arbeitet gerade:</strong> ${esc(busyReason)}</div>`:activeComplete?`<div class="book-variant-process-note ready"><strong>Diese Buchfassung ist vollständig und bereit für eine weitere Alternative.</strong></div>`:`<div class="book-variant-process-note"><strong>Diese Buchfassung ist noch nicht vollständig:</strong> ${activeStats.total?`${activeStats.written} von ${activeStats.total} Kapiteln geschrieben.`:"Noch keine eigene Kapitelstruktur entwickelt."}</div>`;
  modal(`<h2 class="book-variants-title">Buchfassungen</h2><p class="small muted book-variants-intro"><strong>Original</strong>, <strong>Version 2</strong>, <strong>Version 3</strong> und <strong>Finale</strong> sind eigenständige Arbeitswelten. Briefing, Roman-DNA, Figuren, Kapitelstruktur, Pläne und Manuskript einer Fassung verändern die anderen nicht.</p>${activeSummary}${readinessNote}<h3 class="book-variant-section-title">Deine Buchfassungen</h3>${rows}<h3 class="book-variant-section-title manage">Fassungen verwalten</h3><div class="book-variant-manager-actions"><button class="primary-btn" id="newIndependentVariant" ${canNew?"":"disabled"}>＋ Neue unabhängige Fassung</button><button class="soft-btn" id="compareBookVariants" ${drafts.length>=2?"":"disabled"}>Vergleichen & zusammenstellen</button></div>${newVariantNote}<div class="book-variant-help"><strong>Wichtig:</strong> Das Original ist geschützt. Version 2, Version 3 oder die Finale Fassung kannst du einzeln löschen, auch wenn sie gerade geöffnet ist. Beim Löschen einer aktiven Alternative wechselt Litterum automatisch zurück zum Original.</div><div class="book-variant-reset-zone"><span>Nur wenn du diese aktive Buchfassung neu beginnen willst, ohne sie zu löschen:</span><button class="danger-btn" id="resetActiveVariant">Aktive Buchfassung komplett auf Null</button></div><div class="modal-actions"><button class="primary-btn" data-close>Schließen</button></div>`,"wide");
  $$('[data-switch-book-variant]').forEach(btn=>btn.onclick=()=>switchBookVariant(btn.dataset.switchBookVariant));
  $$('[data-canon-book-variant]').forEach(btn=>btn.onclick=()=>setBookVariantCanon(btn.dataset.canonBookVariant));
  $$('[data-delete-book-variant]').forEach(btn=>btn.onclick=()=>{
    const v=b.variants.find(x=>x.id===btn.dataset.deleteBookVariant);if(!v)return;const st=bookVariantStats(p,v);
    const running=v.id===b.activeId&&!!bookVariantBusyReason(p);
    modal(`<h2>${esc(bookVariantUiLabel(v))} löschen?</h2><p>${st.words?`Diese Fassung enthält <strong>${st.words.toLocaleString("de-DE")} Wörter</strong>.`:"Diese Fassung enthält noch keinen Manuskripttext."} Nur <strong>${esc(bookVariantUiLabel(v))}</strong> wird entfernt. <strong>Das Original bleibt vollständig erhalten.</strong></p>${running?`<p class="warning">Der laufende Vorgang dieser Fassung wird beim Löschen sofort beendet.</p>`:""}<div class="modal-actions"><button class="ghost-btn" id="cancelDelVariant">Abbrechen</button><button class="danger-btn" id="confirmDelVariant">Nur ${esc(bookVariantUiLabel(v))} löschen</button></div>`);
    $("#cancelDelVariant").onclick=()=>{closeModal();openBookVariantsManager();};
    $("#confirmDelVariant").onclick=()=>deleteBookVariantById(p,v.id);
  });
  $("#newIndependentVariant").onclick=createIndependentBookVariant;
  $("#compareBookVariants").onclick=()=>{closeModal();openBookVariantCompare();};
  $("#resetActiveVariant").onclick=resetActiveBookVariant;
}
function chaptersTab(p, manuscript){
  const mode=manuscript?"write":"plan";
  const c=chapterForMode(p,mode)||p.chapters[0];
  if(!c){
    const dj=p.bookDevelopmentJob;
    if(dj&&["running","interrupted"].includes(dj.status)){
      const planned=(p.bookPlan?.parts||[]).reduce((n,x)=>n+(x.chapters?.length||0),0);
      return `<section class="card panel"><div class="empty"><strong>Die Kapitel werden gerade entwickelt.</strong><br>${planned?`${planned} Kapitel sind schon geplant und gesichert. `:""}Sie erscheinen hier automatisch, sobald der Romanplan komplett ist.</div></section>`;
    }
    return `<section class="card panel"><div class="empty">Noch kein Kapitel vorhanden. <button class="primary-btn" id="addChapter">Erstes Kapitel anlegen</button></div></section>`;
  }
  const idx=Math.max(0,p.chapters.findIndex(x=>x.id===c.id));
  const progress=chapterProgress(c);
  return `<section class="chapter-layout">
    <aside class="card chapter-list ${writingPrefs().chapterListOpen?"":"list-collapsed"}"><div class="panel-head" style="padding:5px 5px 8px"><h3 style="margin:0">${manuscript?"Kapitel dieser Fassung":"Kapitelplan"}</h3><button class="ghost-btn chapter-list-toggle" id="toggleChapterList">${writingPrefs().chapterListOpen?"▴ Liste zu":`☰ Alle ${p.chapters.length} Kapitel`}</button><button class="icon-btn" id="addChapter">＋</button></div>
      ${p.chapters.map(ch=>`<div class="chapter-item ${ch.id===c.id?"active":""}" data-chapter="${ch.id}" style="position:relative;padding-right:52px"><div class="chapter-number">${ch.number}</div><div class="chapter-item-main"><strong>${esc(ch.title||"Ohne Titel")}</strong><span>${esc(previewText(ch.plan||"Noch keine Planung"))}</span>${chapterProgressHtml(ch,true)}</div><button type="button" class="bk-dots chapter-dots" data-chapter-menu="${ch.id}" title="Optionen" aria-label="Optionen für Kapitel ${ch.number}" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);z-index:3">⋯</button></div>`).join("")}
    </aside>
    <article class="card editor">
      ${manuscript?bookVariantsBarHtml(p):""}
      <div class="chapter-position-bar"><button class="chapter-nav-btn" id="prevChapter" ${idx<=0?"disabled":""} aria-label="Vorheriges Kapitel">‹</button><div class="chapter-position-text">${manuscript?`<small class="chapter-variant-context">${esc(bookVariantUiLabel(activeBookVariant(p)))}</small>`:""}<strong>${seriesCrumb(p)}Kapitel ${c.number} von ${p.chapters.length}</strong><span>${esc(c.title||`Kapitel ${c.number}`)}</span></div><button class="chapter-nav-btn" id="nextChapter" ${idx>=p.chapters.length-1?"disabled":""} aria-label="Nächstes Kapitel">›</button></div>
      ${chapterProgressHtml(c)}
      ${manuscript?writingToolbarHtml(p,c,progress):(()=>{const isThis=jobBlocking(p,"plan",c.id),allPlansDone=(p.chapters||[]).length>0&&(p.chapters||[]).every(ch=>!chapterNeedsPlan(ch))&&!projectRunsJobs("plan",p.id);return allPlansDone?`<div class="book-complete-banner plan-complete"><span class="book-complete-check">✓</span><div><strong>Alle ${p.chapters.length} Kapitelpläne sind ausgearbeitet</strong><small>Die Plan-Ausarbeitung ist vollständig abgeschlossen.</small></div></div>`:`<div class="editor-toolbar plan-action-toolbar"><button class="primary-btn chapter-primary-action" id="generatePlan" ${isThis?"disabled":""}>${isThis?`◇ Kapitel ${c.number} wird ausgearbeitet · ${progress.planWords.toLocaleString("de-DE")} Wörter`:`✦ Kapitel ${c.number} ${progress.expandedPlan?"erneut ausarbeiten":"ausarbeiten"} · ${progress.planWords.toLocaleString("de-DE")} Wörter`}</button></div>`;})()}
      <input class="input chapter-title-input" id="chapterTitle" value="${esc(c.title||"")}">
      <div class="field"><label>Kapitelziel / Plan</label><textarea id="chapterPlan" rows="4">${esc(c.plan||"")}</textarea></div>
      ${manuscript?`<div class="field" style="margin-top:12px"><label>Manuskript · ${esc(bookVariantUiLabel(activeBookVariant(p)))} · Kapitel ${c.number}${chapterBeingWritten(p,c)?" · <span class=\"warning\">KI schreibt gerade – Bearbeiten ist danach wieder möglich</span>":""}</label><textarea class="manuscript" id="chapterContent" placeholder="Hier entsteht dein Kapitel ..."${chapterBeingWritten(p,c)?" readonly":""}>${esc(c.content||"")}</textarea></div>
      <div class="field" style="margin-top:12px"><label>Kapitelgedächtnis</label><textarea id="chapterMemory" rows="4" placeholder="Was ist passiert? Was wissen die Figuren jetzt? Welche Fäden bleiben offen?">${esc(c.memory||"")}</textarea></div>`:""}
    </article>
  </section>`;
}

function styleRuleCard(r,i,kind){
  const text=String(r||""),long=text.length>240;
  return `<div class="rule ${kind}"><div class="style-rule-body">${long?`<details><summary>${esc(text.slice(0,155))} … <em>(Langtext anzeigen)</em></summary><p>${esc(text)}</p></details>`:`<span>${esc(text)}</span>`}</div><button class="icon-btn ${kind==="bad"?"del-bad":"del-rule"}" data-i="${i}" aria-label="Regel entfernen" style="margin-left:auto;padding:5px 9px">×</button></div>`;
}
function styleTab(p){
  const s=p.style,legacy=findUnsortedStyleEntries(s),pending=s.pendingImports||[];
  return `<section class="card panel"><div class="panel-head"><div><h2>Stil DNA</h2><div class="small muted">Klare Einzelregeln: Grün sagt, wie geschrieben wird. Rot enthält Ausschlüsse. Beide werden beim Schreiben berücksichtigt.</div></div><button class="primary-btn" id="addRule">＋ Regel</button></div>
  <div class="style-intake-panel"><div><strong>✦ Intelligente Stilaufbereitung</strong><p class="small muted">Lange Stiltexte einfügen. Die KI erkennt einzelne Regeln, trennt Grün und Rot und zeigt alles vor dem Speichern. Deine bestehenden Regeln bleiben erhalten.</p></div><button class="soft-btn" id="openStyleImporter">Text analysieren</button>${legacy.length?`<button class="ghost-btn" id="cleanExistingStyle">${legacy.length} bestehende Langtexte/Fehlzuordnungen prüfen</button>`:""}${pending.length?`<button class="ghost-btn" id="processPendingStyle">${pending.length} aus dem Briefing prüfen</button>`:""}${s.sources?.length?`<button class="ghost-btn" id="viewStyleSources">Originaltexte (${s.sources.length})</button>`:""}</div>
  <h3>Referenzstil</h3><div class="card" style="padding:14px;margin-bottom:18px"><div class="small muted">${s.referenceText?`Referenz eingefroren · ${countWords(s.referenceText)} Wörter`:"Noch kein Referenzkapitel gesetzt."}</div>${s.referenceText?`<p>${esc(s.referenceText.slice(0,500))}${s.referenceText.length>500?" …":""}</p>`:""}<button class="ghost-btn" id="clearReference" ${s.referenceText?"":"disabled"}>Referenz lösen</button></div>
  <h3>Verbindliche Stilregeln</h3><div class="rule-list">${s.rules.map((r,i)=>styleRuleCard(r,i,"good")).join("")}</div>
  <h3 style="margin-top:22px">Verbotene Muster</h3><div class="rule-list">${s.forbidden.map((r,i)=>styleRuleCard(r,i,"bad")).join("")}</div>
  <div style="margin-top:12px"><button class="soft-btn" id="addForbidden">＋ Negativregel</button></div>
  <h3 style="margin-top:24px">Geschützte Lieblingsstellen</h3><div class="small muted" style="margin-bottom:8px">Diese Passagen soll die KI bei automatischen Überarbeitungen nicht verändern.</div><div class="rule-list">${(p.protectedPassages||[]).length?(p.protectedPassages||[]).map((x,i)=>`<div class="rule good"><span>${esc(x.text.slice(0,220))}${x.text.length>220?" …":""}</span><button class="icon-btn del-protected" data-i="${i}" style="margin-left:auto;padding:5px 9px">×</button></div>`).join(""):'<div class="small muted">Noch keine Passage geschützt.</div>'}</div></section>`;
}
function localReview(c,p){
  const text=c?.content||"", words=countWords(text), sentences=(text.match(/[.!?]+(?:\s|$)/g)||[]).length||1;
  const short=(text.match(/(?:^|[.!?]\s+)[A-ZÄÖÜ][^.!?]{0,34}[.!?]/g)||[]).length;
  const shortRatio=Math.min(1,short/sentences);
  const paragraphs=text.split(/\n\s*\n/).filter(Boolean).length;
  const score=Math.max(30,Math.round(100-shortRatio*42-(words<500?10:0)-(paragraphs<3?6:0)));
  return {score,words,sentences,shortRatio};
}
// Die große Prozentanzeige in „Prüfung“ zeigt den echten Arbeitsfortschritt des Buches.
// Eine Prüfung zählt nur solange als erledigt, wie sich der Kapiteltext seitdem nicht geändert hat.
function reviewContentSignature(text){
  const s=String(text||"");let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return `${s.length}:${h>>>0}`;
}
function chapterReviewIsCurrent(c){
  if(!c||!String(c.content||"").trim()||!c.reviewedAt||!c.reviewSignature)return false;
  return c.reviewSignature===reviewContentSignature(c.content||"");
}
function bookReviewProgress(p){
  const chapters=(p?.chapters||[]).filter(c=>String(c.content||"").trim());
  const done=chapters.filter(chapterReviewIsCurrent).length,total=chapters.length;
  return {done,total,open:Math.max(0,total-done),percent:total?Math.round(done/total*100):0};
}
function reviewTab(p){
  const c=chapter(),r=localReview(c,p),bp=bookReviewProgress(p),currentDone=chapterReviewIsCurrent(c),rr=p.reviewRunner||{};
  // Nach einem Browser-Neustart kann kein alter KI-Aufruf mehr real laufen. Einen nur gespeichert
  // gebliebenen "running"-Status lösen wir deshalb automatisch, ohne bereits geprüfte Kapitel zu löschen.
  if(rr.running&&!activeReviewRuntimes.has(p.id)){
    rr.running=false;rr.stopRequested=false;rr.immediateStop=false;rr.currentChapterNumbers=[];rr.finishedAt=now();rr.completed=bp.done;rr.total=bp.total;rr.lastMessage=`Unterbrochene Buchprüfung zurückgesetzt · ${bp.done}/${bp.total} Kapitel bleiben geprüft.`;p.updatedAt=now();store.save();
  }
  const running=!!rr.running,nums=(rr.currentChapterNumbers||[]).filter(Boolean),allReviewed=bp.total>0&&bp.open===0;
  const reviewedChapters=(p.chapters||[]).filter(ch=>String(ch.content||"").trim()).sort((a,b)=>Number(a.number)-Number(b.number));
  const reviewChapterOptions=reviewedChapters.map(ch=>`<option value="${esc(ch.id)}" ${c?.id===ch.id?"selected":""}>Kapitel ${ch.number}${ch.title?` · ${esc(ch.title)}`:""}${chapterReviewIsCurrent(ch)?" · geprüft":" · offen"}</option>`).join("");
  const savedResult=currentDone&&c?.reviewResult?`<div class="result-head"><div><strong>Detailergebnis: Kapitel ${c.number}</strong><div class="small muted">Hier siehst du nur die Einzelprüfung dieses Kapitels. Die Buchprüfung oben umfasst ${bp.done} von ${bp.total} Kapiteln.</div></div><button class="ghost-btn mini-copy" id="copyReviewResult">Nur diese Prüfung kopieren</button></div><div class="result-text copyable-text">${esc(c.reviewResult)}</div>`:`<div class="muted small">${c?`Für Kapitel ${c.number} liegt noch kein aktuelles Detailergebnis vor.`:"Kein Kapitel ausgewählt."} Die gründliche Buchprüfung kontrolliert jedes geschriebene Kapitel automatisch und speichert die Ergebnisse kapitelweise.</div>`;
  const headerStatus=allReviewed?`Buchprüfung abgeschlossen: ${bp.done} von ${bp.total} Kapitel geprüft`:running?`${bp.done} von ${bp.total} Kapitel geprüft · Prüfung läuft`:`${bp.done} von ${bp.total} Kapitel geprüft · ${bp.open} offen`;
  const finishHeadline=allReviewed?`Buchprüfung abgeschlossen · ${bp.done} von ${bp.total} Kapitel geprüft`:(rr.lastMessage||"Buchprüfung beendet");
  return `<section class="card panel"><div class="panel-head review-panel-head"><div><h2>Prüfung</h2><div class="small muted">${headerStatus}</div></div><div class="review-run-actions"><button class="primary-btn" id="aiReview" ${c?.content&&!running&&bp.open?"":"disabled"}>${bp.open?"✦ Ganzes Buch gründlich prüfen":"✓ Buch vollständig geprüft"}</button>${running?`<button class="danger-btn" id="stopBookReviewNow">■ Sofort stoppen</button><button class="ghost-btn" id="stopBookReview">Nach laufender Prüfung stoppen</button>`:""}</div></div>
  <div class="review-grid"><div class="card score"><div class="score-ring ${running?"review-running":""}" id="reviewBookRing" style="--score:${bp.percent}"><strong id="reviewBookScore">${bp.percent}%</strong></div><div class="small muted">vom Buch geprüft</div><div class="review-progress-mini"><strong id="reviewBookDone">${bp.done} von ${bp.total}</strong><span id="reviewBookOpen">${allReviewed?"alle Kapitel geprüft":`${bp.open} offen`}</span></div>${running?`<div class="review-runner-status"><strong>${nums.length?`Kapitel ${nums.join(" + ")} werden geprüft`:(rr.lastMessage||"Prüfung läuft …")}</strong><span>2 Kapitel gleichzeitig, Ergebnisse werden sofort gespeichert</span></div>`:""}</div>
  <div class="card checks"><div class="check"><span>Geöffnetes Detailkapitel</span><strong id="reviewCurrentStatus" class="${currentDone?"ok":"warning"}">${c?`Kapitel ${c.number} · ${currentDone?"geprüft":"noch offen"}`:"—"}</strong></div><div class="check"><span>Buchprüfung</span><strong class="${allReviewed?"ok":""}"><span id="reviewBookDoneText">${bp.done}</span> von ${bp.total} geprüft</strong></div><div class="check"><span>Offene Kapitel</span><strong id="reviewBookOpenText" class="${bp.open?"warning":"ok"}">${bp.open} Kapitel</strong></div><div class="check"><span>Prüfmodus</span><strong class="ok">gründlich + Schnelllauf</strong></div><div class="check"><span>Prüf-KI</span><strong class="ok">DeepSeek V4 Pro</strong></div><div class="check"><span>Lokaler Stil-Schnellcheck</span><strong>${r.score}%</strong></div><div class="check"><span>Wortzahl des Detailkapitels</span><strong>${r.words.toLocaleString("de-DE")}</strong></div><div class="check"><span>Kurze Satzmuster</span><strong class="${r.shortRatio<.18?"ok":"warning"}">${Math.round(r.shortRatio*100)}%</strong></div><div class="check"><span>Stilreferenz (optional)</span><strong class="${p.style.referenceText?"ok":""}">${p.style.referenceText?"aktiv":"nicht gesetzt"}</strong></div><div class="check"><span>Projektgedächtnis</span><strong class="ok">${p.characters.length} Figuren · ${p.chapters.length} Kapitel</strong></div><div class="check"><span>Projekt Firewall</span><strong class="ok">aktiv</strong></div><div class="check"><span>Fremdprojekt-Schutz</span><strong class="${p.security?.lastWarning?"warning":"ok"}">${p.security?.lastWarning?`Hinweis: ${esc(p.security.lastWarning.replace(/^Prüfen:\s*/,""))}`:"keine fremden Projektnamen erkannt"}</strong></div></div></div>
  ${!running&&rr.finishedAt?`<div class="card review-finish-note"><strong>${esc(finishHeadline)}</strong><span>${allReviewed?`Alle ${bp.total} geschriebenen Kapitel sind geprüft. Unten kannst du jedes Detailergebnis einzeln ansehen. · `:""}${Number(rr.findingsCount)||0} Kapitel mit Auffälligkeiten · ${Number(rr.cleanCount)||0} ohne belastbare Auffälligkeit nach Gegenprüfung</span></div>`:""}
  <div id="reviewResult" class="card" style="padding:16px;margin-top:14px">${running?`<div class="muted">${esc(rr.lastMessage||"Die Buchprüfung läuft …")} Die Ergebnisse werden Kapitel für Kapitel gespeichert.</div>`:`${reviewedChapters.length?`<div style="margin-bottom:14px"><label class="small muted" for="reviewChapterSelect">Detailergebnis auswählen</label><select id="reviewChapterSelect" style="width:100%;margin-top:6px">${reviewChapterOptions}</select></div>`:""}${savedResult}`}</div></section>`;
}
function coverTab(p){
  const c=p.cover||{},selected=c.selectedDataUrl||"";
  return `<section class="card panel"><div class="panel-head"><div><h2>Cover Studio</h2><div class="small muted">Vorderseite gestalten, mehrere KI-Vorschläge vergleichen und daraus ein vollständiges Umschlagbild mit Rücken und Rückseite erzeugen.</div></div></div>
  <div class="cover-studio-grid"><div class="card cover-settings">
    <div class="field"><label>Autorinnenname</label><input class="input" id="coverAuthor" value="${esc(c.author||"")}" placeholder="Name auf dem Cover"></div>
    <div class="field"><label>Rückseitentext / Klappentext</label><textarea id="coverBlurb" rows="6" placeholder="Kurzer Text für die Rückseite …">${esc(c.blurb||"")}</textarea></div>
    <div class="field"><label>Bildwunsch</label><textarea id="coverPrompt" rows="6" placeholder="Zum Beispiel: nächtliche Großstadt, warme Fensterlichter, melancholisch, erwachsene Near-Future-Romance …">${esc(c.prompt||"")}</textarea></div>
    <div class="form-grid compact"><div class="field"><label>Format</label><select id="coverTrim"><option value="A5" ${c.trim==="A5"?"selected":""}>A5</option><option value="5x8" ${c.trim==="5x8"?"selected":""}>5 × 8 Zoll</option><option value="6x9" ${c.trim==="6x9"?"selected":""}>6 × 9 Zoll</option></select></div><div class="field"><label>Buchrücken, mm</label><input class="input" type="number" id="coverSpine" min="3" max="80" step="0.5" value="${Number(c.spineMm)||12}"></div></div>
    <div class="field"><label>KI-Bildmodus</label><select id="coverModel"><option value="gpt-image-2.5-flare" ${c.model!=="gpt-image-2.5-sunburst"?"selected":""}>Schnell, hochwertig</option><option value="gpt-image-2.5-sunburst" ${c.model==="gpt-image-2.5-sunburst"?"selected":""}>Präziser, aufwendiger</option></select><div class="small muted">Die Bildgenerierung nutzt deinen OpenAI-API-Schlüssel und kann API-Kosten verursachen.</div></div>
    <div class="briefing-actions"><button class="primary-btn" id="generateCoverIdeas">✦ 3 Cover-Vorschläge</button><button class="ghost-btn" id="downloadFullWrap" ${selected?"":"disabled"}>Umschlag mit Rücken herunterladen</button></div>
  </div>
  <div><div class="cover-preview-shell">${selected?coverPreviewHtml(p,selected):'<div class="empty">Noch kein Cover ausgewählt.</div>'}</div><div class="cover-proposals" id="coverProposals">${coverSessionImages.length?coverSessionImages.map((img,i)=>coverProposalHtml(img,i,p)).join(""):'<div class="small muted">Neue Vorschläge erscheinen hier. Du kannst danach einen auswählen und mit neuen Wünschen weitere Varianten erzeugen.</div>'}</div></div></div>
  </section>`;
}
function coverPreviewHtml(p,dataUrl){return `<div class="book-cover-preview"><img src="${dataUrl}" alt="Coverbild"><div class="book-cover-overlay"><strong>${esc(p.title)}</strong><span>${esc(p.cover?.author||"")}</span></div></div>`;}
function coverProposalHtml(img,i,p){return `<button class="cover-proposal ${p.cover?.selectedDataUrl===img?"selected":""}" data-cover-index="${i}"><img src="${img}" alt="Covervorschlag ${i+1}"><span>Vorschlag ${i+1}</span></button>`;}
function exportTab(p){
  const written=(p.chapters||[]).filter(c=>String(c.content||"").trim()),current=chapter();
  return `<section class="card panel"><div class="panel-head"><div><h2>Export & Sicherung</h2><div class="small muted">Ein Kapitel, den bisherigen Stand oder das komplette Buch exportieren.</div></div></div>
  <div class="char-grid">
    <div class="card char-card"><h3>EPUB Buch</h3><p>Mit Kapitelstruktur und deinem ausgewählten Cover.</p><div class="field"><label>Umfang</label><select id="epubScope"><option value="book">Alle geschriebenen Kapitel gebündelt</option><option value="to_current">Bis zum aktuellen Kapitel${current?` ${current.number}`:""}</option><option value="single">Nur ein Kapitel</option><option value="separate">Jedes geschriebene Kapitel als eigenes EPUB</option></select></div><div class="field" id="epubChapterWrap" hidden><label>Kapitel</label><select id="epubChapter">${written.map(c=>`<option value="${c.id}">Kapitel ${c.number} · ${esc(c.title)}</option>`).join("")}</select></div><button class="primary-btn" id="exportEpub" ${written.length?"":"disabled"}>EPUB exportieren</button></div>
    <div class="card char-card"><h3>Manuskript TXT</h3><p>Alle geschriebenen Kapitel in Lesereihenfolge als Textdatei.</p><button class="primary-btn" id="exportTxt">TXT exportieren</button></div>
    <div class="card char-card"><h3>Projekt Backup</h3><p>Roman DNA, Figuren, Kapitel, Stil DNA, Coverdaten und Ideenraum als JSON.</p><button class="primary-btn" id="exportJson">JSON sichern</button></div>
    <div class="card char-card"><h3>Manuskript importieren</h3><p>PDF, EPUB, Word, OpenDocument oder Text als neues Buch mit Kapiteln anlegen.</p><button class="soft-btn" id="importBookFromExport">⇪ Buch importieren</button></div>
    <div class="card char-card"><h3>Backup importieren</h3><p>Ein zuvor gesichertes Litterum Projekt wiederherstellen.</p><input type="file" id="importJson" accept=".json,application/json" class="input"></div>
  </div></section>`;
}


function appRouteUrl(view,projectId=""){
  const base=location.pathname+location.search;
  return view==="workspace" && projectId
    ? `${base}#book=${encodeURIComponent(projectId)}`
    : `${base}#home`;
}
function markHomeHistory(){
  try{
    history.replaceState({storyStudioView:"home"}, "", appRouteUrl("home"));
  }catch{}
}
function ensureWorkspaceHistory(projectId){
  if(!projectId)return;
  try{
    const s=history.state;
    if(s?.storyStudioView==="workspace" && s?.projectId===projectId)return;

    // Wenn die App frisch/neugeladen direkt in einem Buch startet,
    // erzeugen wir erst einen echten Home-Eintrag und legen das Buch darüber.
    if(!s?.storyStudioView || s?.storyStudioView==="workspace"){
      history.replaceState({storyStudioView:"home"}, "", appRouteUrl("home"));
    }
    history.pushState(
      {storyStudioView:"workspace",projectId},
      "",
      appRouteUrl("workspace",projectId)
    );
  }catch{}
}
function clearActiveProjectAndShowLibrary({syncHistory=true}={}){
  stopDictation(true);
  state.activeProjectId=null;
  state.activeChapterId=null;
  state.activeTab="studio";
  store.save({sync:false});
  if(syncHistory)markHomeHistory();
  render();
}
function openProjectFromLibrary(id){
  const p=(state.projects||[]).find(x=>x.id===id);
  if(!p)return toast("Dieses Buch wurde nicht gefunden.");
  state.activeProjectId=p.id;
  state.activeTab="studio";
  state.activeChapterId=preferredChapterId(p);
  rememberChapter(p,state.activeChapterId);
  state.lastProjectId=p.id;
  store.save({sync:false});
  ensureWorkspaceHistory(p.id);
  render();
}
function goToLibrary(){
  // Der sichtbare Zurück-Pfeil soll immer sicher zur Bibliothek führen,
  // ohne dass Android die gesamte PWA/Browserseite schließen kann.
  clearActiveProjectAndShowLibrary({syncHistory:true});
}
function setupStoryStudioNavigation(){
  try{
    // Beim Start immer einen gültigen internen History-Zustand herstellen.
    if(state.activeProjectId){
      if(!history.state?.storyStudioView){
        history.replaceState({storyStudioView:"home"}, "", appRouteUrl("home"));
        history.pushState(
          {storyStudioView:"workspace",projectId:state.activeProjectId},
          "",
          appRouteUrl("workspace",state.activeProjectId)
        );
      }else if(history.state.storyStudioView!=="workspace"){
        history.pushState(
          {storyStudioView:"workspace",projectId:state.activeProjectId},
          "",
          appRouteUrl("workspace",state.activeProjectId)
        );
      }
    }else{
      history.replaceState({storyStudioView:"home"}, "", appRouteUrl("home"));
    }
  }catch{}

  window.addEventListener("popstate",e=>{
    const s=e.state;

    if(s?.storyStudioView==="workspace" && s.projectId){
      const p=(state.projects||[]).find(x=>x.id===s.projectId);
      if(p){
        state.activeProjectId=p.id;
        state.activeChapterId=preferredChapterId(p);
        rememberChapter(p,state.activeChapterId);
        state.activeTab=state.activeTab||"studio";
        store.save({sync:false});
        render();
        return;
      }
    }

    // Android/Browser-Zurück aus einem Buch landet zuverlässig hier.
    if(state.activeProjectId){
      clearActiveProjectAndShowLibrary({syncHistory:false});
      return;
    }

    // Auf der Hauptseite ist "Zurück" normales Android-Verhalten.
    // Hier greifen wir absichtlich nicht mehr ein.
  });
}

function bindHome(){
  $("#readPage")?.addEventListener("click",readVisiblePage);
  $("#planJobBadge")?.addEventListener("click",()=>{const b=$("#planJobBadge"),p=projectById(b?.dataset.project);if(!p)return;state.activeProjectId=p.id;state.activeTab="chapters";rememberChapter(p,b.dataset.chapter,"plan");store.save({sync:false});render();});
  $("#writeJobBadge")?.addEventListener("click",()=>{const b=$("#writeJobBadge"),p=projectById(b?.dataset.project);if(!p)return;state.activeProjectId=p.id;state.activeTab="manuscript";rememberChapter(p,b.dataset.chapter,"write");store.save({sync:false});render();});
  $("#newBook")?.addEventListener("click",()=>openNewBook());
  $("#newSeries")?.addEventListener("click",()=>openCreateSeries());
  $("#importBook")?.addEventListener("click",openBookImport);
  $("#newBookTop")?.addEventListener("click",()=>openNewBook());
  $("#openLast")?.addEventListener("click",()=>{
    if(!state.projects?.length)return toast("Noch kein Buch angelegt.");
    const remembered=projectById(state.lastProjectId);
    const last=remembered||[...state.projects].sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")))[0];
    openProjectFromLibrary(last.id);
  });
  $$(".project-card,.bk-row,.bk-shelf-item,.bk-hero,.bk-series-edition[data-open]").forEach(el=>el.addEventListener("click",e=>{
    const menu=e.target.closest("[data-book-menu]");if(menu){e.preventDefault();e.stopPropagation();openBookMenu(menu.dataset.bookMenu);return;}
    if(e.target.closest(".delete-project"))return;
    openProjectFromLibrary(el.dataset.open);
  }));
  $$("[data-series-menu]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openSeriesMenu(b.dataset.seriesMenu);}));
  $$("[data-lib-filter]").forEach(b=>b.addEventListener("click",()=>{libFilter=b.dataset.libFilter;render();}));
  $("#toggleLibView")?.addEventListener("click",()=>{try{localStorage.setItem(LIB_VIEW_KEY,libView()==="shelf"?"list":"shelf");}catch{}render();});
  $$(".delete-project").forEach(btn=>btn.addEventListener("click",e=>{
    e.preventDefault();e.stopPropagation();confirmDeleteProject(btn.dataset.deleteProject);
  }));
  $$('[data-series-open]').forEach(b=>b.addEventListener("click",()=>openProjectFromLibrary(b.dataset.seriesOpen)));
  $$('.series-add-book').forEach(b=>b.addEventListener("click",()=>openAddSeriesBook(b.dataset.seriesAdd)));
  $("#quickCreate")?.addEventListener("click",()=>openNewBook($("#quickIdea").value));
}

function studioSelectChapter(id){
  const p=project();if(!p||!id)return;
  const c=(p.chapters||[]).find(x=>x.id===id);if(!c)return;
  p.ui ||= {};p.ui.studioChapterId=c.id;state.activeChapterId=c.id;store.save({sync:false});render();
}
function studioOpenChapter(mode,id){
  const p=project();if(!p)return;
  const c=(p.chapters||[]).find(x=>x.id===id)||chapterForMode(p,mode);if(!c)return toast("Noch kein Kapitel vorhanden.");
  p.ui ||= {};p.ui.studioChapterId=c.id;
  state.activeTab=mode==="plan"?"chapters":"manuscript";
  rememberChapter(p,c.id,mode);
  store.save({sync:false});render();
}
function studioPlanClick(){
  const p=project();if(!p)return;
  const writing=projectWritingActive(p),ready=p.bookPlan?.status==="ready"&&(p.chapters||[]).length>0;
  if(writing)return toast("Buch schreiben läuft gerade. Die Plan-Ausarbeitung kann nicht gleichzeitig gestartet werden.");
  if(!ready)return toast("Entwickle zuerst das Buch. Danach können die Kapitelpläne ausgearbeitet werden.");
  openStudioProcessMonitor("plan");
}
function studioWriteClick(){
  const p=project();if(!p)return;
  if(projectPlanningActive(p))return toast("Die Kapitelpläne werden gerade ausgearbeitet. Buch schreiben startet erst danach.");
  const allPlans=(p.chapters||[]).length>0&&(p.chapters||[]).every(c=>!chapterNeedsPlan(c));
  if(!allPlans)return toast("Arbeite zuerst alle Kapitelpläne aus. Danach wird Buch schreiben freigeschaltet.");
  openStudioProcessMonitor("write");
}
function studioReviewClick(){
  const p=project();if(!p)return;
  const complete=(p.chapters||[]).length>0&&(p.chapters||[]).every(ch=>!chapterNeedsWriting(ch));
  const running=!!p.reviewRunner?.running;
  if(!complete&&!running)return toast("Buch prüfen wird freigeschaltet, sobald alle Kapitel geschrieben sind.");
  openStudioProcessMonitor("review");
}
function studioReviewedClick(){
  const p=project();if(!p)return;
  const bp=bookReviewProgress(p);
  if(!bp.total){toast("Es gibt noch keine geschriebenen Kapitel zur Prüfung.");return;}
  state.activeTab="review";store.save({sync:false});render();
}

function studioRevisionClick(){
  const p=project();if(!p)return;
  const bp=bookReviewProgress(p),rr=p.reviewRunner||{},r=p.bookReviser||{};
  const reviewStageDone=bp.total>0&&(bp.open===0||(!!rr.finishedAt&&Number(rr.total||0)>0&&Number(rr.completed||0)>=Number(rr.total||0)));
  if(!reviewStageDone&&!r.running&&!r.jobId)return toast("Buch überarbeiten wird freigeschaltet, sobald die Buchprüfung vollständig abgeschlossen ist.");
  openStudioProcessMonitor("revise");
}
function studioRevisedClick(){
  const p=project();if(!p)return;
  const r=p.bookReviser||{},written=(p.chapters||[]).filter(c=>String(c.content||"").trim()),ids=Array.isArray(r.ids)?r.ids:[],done=Array.isArray(r.done)?r.done:[];
  const complete=written.length>0&&written.every(c=>ids.includes(c.id))&&ids.length>0&&ids.every(id=>done.includes(id))&&!r.running&&!!r.finishedAt;
  if(!complete){toast("Die vollständige Buchüberarbeitung ist noch nicht abgeschlossen.");return;}
  state.activeTab="export";store.save({sync:false});render();
}
async function downloadRevisedBook(){
  const p=project();if(!p)return;
  const r=p.bookReviser||{},written=(p.chapters||[]).filter(c=>String(c.content||"").trim()),ids=Array.isArray(r.ids)?r.ids:[],done=Array.isArray(r.done)?r.done:[];
  const complete=written.length>0&&written.every(c=>ids.includes(c.id))&&ids.length>0&&ids.every(id=>done.includes(id))&&!r.running&&!!r.finishedAt;
  if(!complete)return toast("Das Buch ist noch nicht vollständig überarbeitet.");
  let coverData="";try{coverData=await composedFrontCoverDataUrl(p);}catch{}
  downloadBlob(`${safeName(p.title)}-ueberarbeitet.epub`,new Blob([epubBytes(p,written,coverData)],{type:"application/epub+zip"}));
  toast("Überarbeitetes EPUB wurde erstellt.");
}

function studioStepClick(action){
  const p=project();if(!p)return;
  const id=p.ui?.studioChapterId||state.activeChapterId||preferredChapterId(p);
  if(action==="plan")return studioOpenChapter("plan",id);
  if(action==="write")return studioOpenChapter("write",id);
  if(action==="review")return studioReviewClick();
  if(action==="revise")return openBookReviser();
  if(action==="read"){state.activeTab="reader";store.save({sync:false});render();}
}
function bindWorkspace(){
  $("#moreTabs")?.addEventListener("click",openMoreTabs);
  $("#developWholeBook")?.addEventListener("click",()=>confirmDevelopWholeBook("fast"));
  $("#developWholeBookDeep")?.addEventListener("click",()=>confirmDevelopWholeBook("deep"));
  $("#convertToSeries")?.addEventListener("click",()=>openCreateSeries(project()));
  $("#addSeriesBook")?.addEventListener("click",()=>{const s=seriesForProject(project());if(s)openAddSeriesBook(s.id);});
  $("#editSeriesBible")?.addEventListener("click",()=>{const s=seriesForProject(project());if(s)openSeriesBible(s.id);});
  $("#detachSeriesBook")?.addEventListener("click",detachCurrentBookFromSeries);
  $$('[data-series-switch]').forEach(b=>b.addEventListener("click",()=>{const current=project(),target=projectById(b.dataset.seriesSwitch);if(!target)return;const slot=editionGroupForProject(current)?editionSlotNumber(current,1):1,match=seriesBandEditionForSlot(target,slot);if(!match&&slot>1)return toast(`${slot===4?"Final":`Version ${slot}`} ist für ${target.seriesLabel||target.title} noch nicht angelegt. Litterum öffnet nicht automatisch das Original, damit Fassungen nicht vermischt werden.`,6500);openProjectFromLibrary((match||target).id);}));
  // Teil-entwickeln nutzt einen globalen delegierten Click-Handler (stabil über Re-Renders hinweg).
  $$("[data-write-part]").forEach(b=>b.addEventListener("click",()=>startPartWriter(Number(b.dataset.writePart))));
  $("#expandAllPlans")?.addEventListener("click",startAllPlanExpansion);
  $("#studioPlanPill")?.addEventListener("click",studioPlanClick);
  $("#studioPlanAction")?.addEventListener("click",studioPlanClick);
  $("#studioWritePill")?.addEventListener("click",studioWriteClick);
  $("#studioWriteAction")?.addEventListener("click",studioWriteClick);
  $("#studioReviewPill")?.addEventListener("click",studioReviewClick);
  $("#studioReviewAction")?.addEventListener("click",studioReviewClick);
  $("#studioReviewedPill")?.addEventListener("click",studioReviewedClick);
  $("#studioReviewedAction")?.addEventListener("click",studioReviewedClick);
  $("#studioRevisionPill")?.addEventListener("click",studioRevisionClick);
  $("#studioRevisionAction")?.addEventListener("click",studioRevisionClick);
  $("#studioRevisedPill")?.addEventListener("click",studioRevisedClick);
  $("#studioRevisedAction")?.addEventListener("click",studioRevisedClick);
  $("#studioTranslatePill")?.addEventListener("click",studioTranslateClick);
  $("#studioTranslateAction")?.addEventListener("click",studioTranslateClick);
  $("#studioTranslatedPill")?.addEventListener("click",()=>openBookTranslator());
  $("#studioTranslatedAction")?.addEventListener("click",()=>openBookTranslator());
  $("[data-studio-recommended]")?.addEventListener("click",e=>{
    const mode=e.currentTarget.dataset.studioRecommended;
    if(mode==="develop")return confirmDevelopWholeBook("fast");
    if(mode==="plan")return studioPlanClick();
    if(mode==="write")return studioWriteClick();
    if(mode==="review")return studioReviewClick();
    if(mode==="revise")return studioRevisionClick();
    if(mode==="translate")return studioTranslateClick();
    if(mode==="export"){state.activeTab="export";store.save({sync:false});render();}
  });
  $("#openBookTranslatorCard")?.addEventListener("click",()=>openBookTranslator());
  $("#studioDownloadRevised")?.addEventListener("click",downloadRevisedBook);
  $("#studioOpenExport")?.addEventListener("click",()=>{state.activeTab="export";store.save({sync:false});render();});
  $$("#stopPlansNow,#stopPlansNowSecondary").forEach(b=>b.addEventListener("click",stopPlanRunnerNow));
  $$("#stopPlansAfterCurrent").forEach(b=>b.addEventListener("click",stopPlanRunnerAfterCurrent));
  $("#stopTranslationNow")?.addEventListener("click",()=>{const p=project(),e=runningTranslationEdition(p);if(e)stopTranslationNow(p,e);});
  $("#stopTranslationAfterCurrent")?.addEventListener("click",()=>{const p=project(),e=runningTranslationEdition(p);if(e)stopTranslationAfterCurrent(p,e);});
  $("#studioPrevChapter")?.addEventListener("click",e=>studioSelectChapter(e.currentTarget.dataset.target));
  $("#studioNextChapter")?.addEventListener("click",e=>studioSelectChapter(e.currentTarget.dataset.target));
  $("#studioOpenPlan")?.addEventListener("click",e=>studioOpenChapter("plan",e.currentTarget.dataset.chapter));
  $("#studioOpenWrite")?.addEventListener("click",e=>studioOpenChapter("write",e.currentTarget.dataset.chapter));
  $$("[data-studio-step]").forEach(b=>b.addEventListener("click",()=>studioStepClick(b.dataset.studioStep)));
  $("#studioHistory")?.addEventListener("click",e=>{const p=project(),id=e.currentTarget.dataset.chapter,c=(p?.chapters||[]).find(x=>x.id===id);if(!c)return toast("Noch kein Kapitel ausgewählt.");state.activeChapterId=c.id;p.ui ||= {};p.ui.studioChapterId=c.id;if(!(c.versions||[]).length)return toast("Für dieses Kapitel gibt es noch keine ältere Fassung.");openVersions();});
  $("#writeWholeBook")?.addEventListener("click",startWholeBookWriter);
  $$("#stopWholeBookNow,#stopWholeBookNowSecondary").forEach(b=>b.addEventListener("click",stopWholeBookWriterNow));
  $$("#stopWholeBook").forEach(b=>b.addEventListener("click",stopWholeBookWriterAfterCurrent));
  $("#openBookReviser")?.addEventListener("click",openBookReviser);
  $("#openBookReviserProgress")?.addEventListener("click",openBookReviserProgress);
  $("#stopBookReviser")?.addEventListener("click",stopBookReviserAfterCurrent);
  $("#stopBookReviserNow")?.addEventListener("click",stopBookReviserNow);
  $("#stopBookReviserAfterCurrent")?.addEventListener("click",stopBookReviserAfterCurrent);
  $("#undoBookReviser")?.addEventListener("click",undoBookReviser);
  $("#takeoverWriter")?.addEventListener("click",takeOverBookWriter);
  $("#partModeToggle")?.addEventListener("change",e=>{const p=project(),w=ensurePartWorkflowShape(p);w.enabled=e.target.checked;w.autoDetected=false;w.modeTouched=true;save();render();});
  $$("[data-part-title]").forEach(el=>el.addEventListener("change",e=>{const p=project(),w=ensurePartWorkflowShape(p),i=Number(e.target.dataset.partTitle);if(w.parts[i]){w.parts[i].title=e.target.value.trim()||`Teil ${i+1}`;if(w.architecture?.parts?.[i])w.architecture.parts[i].title=w.parts[i].title;}save();render();}));
  $$("[data-part-briefing]").forEach(el=>el.addEventListener("input",e=>{const p=project(),w=ensurePartWorkflowShape(p),i=Number(e.target.dataset.partBriefing);if(w.parts[i])w.parts[i].briefing=e.target.value;save();}));
  $("#creativeRestart")?.addEventListener("change",e=>{project().bookPlan ||= {};project().bookPlan.creativeRestart=e.target.checked;save();});
  $("#bookQualityPass")?.addEventListener("change",e=>{project().bookWriter ||= {};project().bookWriter.qualityPass=e.target.checked;save();});
  $("#copyBookPlan")?.addEventListener("click",()=>{const t=bookPlanText(project());if(!t)return toast("Noch kein Romanplan vorhanden.");copyExactText(t,"Romanplan");});
  $("#readPage")?.addEventListener("click",readVisiblePage);
  $("#planJobBadge")?.addEventListener("click",()=>{const b=$("#planJobBadge"),p=projectById(b?.dataset.project);if(!p)return;state.activeProjectId=p.id;state.activeTab="chapters";rememberChapter(p,b.dataset.chapter,"plan");store.save({sync:false});render();});
  $("#writeJobBadge")?.addEventListener("click",()=>{const b=$("#writeJobBadge"),p=projectById(b?.dataset.project);if(!p)return;state.activeProjectId=p.id;state.activeTab="manuscript";rememberChapter(p,b.dataset.chapter,"write");store.save({sync:false});render();});
  $("#backToLibrary")?.addEventListener("click",goToLibrary);
  $("#goHome")?.addEventListener("click",goToLibrary);
  $("#saveNow")?.addEventListener("click",()=>save("Gespeichert"));
  $$("[data-tab]").forEach(b=>b.addEventListener("click",()=>{
    state.activeTab=b.dataset.tab;
    const p=project();
    if(p&&state.activeTab==="chapters")state.activeChapterId=preferredPlanChapterId(p);
    if(p&&state.activeTab==="manuscript")state.activeChapterId=preferredWriteChapterId(p);
    store.save({sync:false});
    try{
      if(state.activeProjectId)history.replaceState(
        {storyStudioView:"workspace",projectId:state.activeProjectId,tab:state.activeTab},
        "",
        appRouteUrl("workspace",state.activeProjectId)
      );
    }catch{}
    render();
  }));
  $$('[data-dna]').forEach(i=>i.addEventListener("input",()=>{project().dna[i.dataset.dna]=i.value;save();}));
  $("#genreInput")?.addEventListener("input",e=>{project().genre=e.target.value;save();});
  $("#addLanguage")?.addEventListener("click",addLanguage);
  $("#languageInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addLanguage();}});
  $$('[data-remove-language]').forEach(b=>b.addEventListener("click",()=>{project().dna.languages.splice(+b.dataset.removeLanguage,1);save();render();}));
  $("#briefingRaw")?.addEventListener("input",e=>{const p=project();p.briefing.raw=e.target.value;syncDetectedPartWorkflow(p);save();});
  $("#copyOriginalIdea")?.addEventListener("click",()=>copyExactText(project().originalIdea||"","Ursprüngliche Buchidee"));
  $("#copyBriefingBundle")?.addEventListener("click",()=>{
    const p=project(),b=p.briefing||{},a=b.analysis||{},parts=[
      `BUCH: ${p.title||"Unbenanntes Buch"}`,
      p.genre?`GENRE: ${p.genre}`:"",
      `\nURSPRÜNGLICHE BUCHIDEE\n${String(p.originalIdea||"").trim()||"—"}`,
      `\nAKTUELLES BUCHBRIEFING\n${String(b.raw||"").trim()||"—"}`,
      a.summary?`\nBISHERIGE KI-ZUSAMMENFASSUNG\n${String(a.summary).trim()}`:""
    ].filter(Boolean);
    copyExactText(parts.join("\n"),"Buchidee und Briefing");
  });
  $("#copyBriefingRaw")?.addEventListener("click",()=>copyExactText(project().briefing?.raw||"","Briefing"));
  $("#copyBriefingSummary")?.addEventListener("click",()=>copyExactText($("#briefingSummary")?.value||project().briefing?.analysis?.summary||"","Zusammenfassung"));
  $("#copyBriefingJson")?.addEventListener("click",()=>copyExactText(JSON.stringify(project().briefing?.analysis||{},null,2),"Erkannte Daten"));
  $("#saveBriefing")?.addEventListener("click",()=>save("Briefing gespeichert"));
  $("#analyzeBriefing")?.addEventListener("click",analyzeBriefing);
  $("#applyBriefing")?.addEventListener("click",applyBriefing);
  $("#briefingToVoice")?.addEventListener("click",()=>speakText(project().briefing.raw));
  $("#collectIdea")?.addEventListener("click",()=>collectVaultIdea(false));
  $("#classifyIdea")?.addEventListener("click",()=>collectVaultIdea(true));
  $$('.apply-idea').forEach(b=>b.addEventListener("click",()=>applyVaultIdea(b.dataset.id)));
  $$('.delete-idea').forEach(b=>b.addEventListener("click",()=>{project().ideaVault=project().ideaVault.filter(x=>x.id!==b.dataset.id);save("Idee gelöscht");render();}));
  $("#readWholeBook")?.addEventListener("click",()=>speakText(manuscriptText(project())));
  $$('.read-one').forEach(b=>b.addEventListener("click",()=>{const c=project().chapters.find(x=>x.id===b.dataset.id);if(c)speakText(c.content);}));
  $$('.del-protected').forEach(b=>b.addEventListener("click",()=>{project().protectedPassages.splice(+b.dataset.i,1);save("Schutz aufgehoben");render();}));
  $("#protectPassage")?.addEventListener("click",protectSelectedPassage);
  $("#editorialScope")?.addEventListener("change",e=>{project().editorial.lastScope=e.target.value;store.save({sync:false});const w=$("#editorialChapterPickWrap");if(w)w.hidden=e.target.value!=="specific";});
  $("#editorialChapterPick")?.addEventListener("change",e=>{project().editorial.lastChapterId=e.target.value;store.save({sync:false});});
  $$('.editorial-card').forEach(b=>b.addEventListener("click",()=>runEditorial(b.dataset.editorial)));
  $("#acceptProofread")?.addEventListener("click",acceptProofread);
  $("#openProofreadPopup")?.addEventListener("click",()=>{if(project().editorial?.proofread)openProofreadModal(project().editorial.proofread);});
  $("#copyEditorialResult")?.addEventListener("click",()=>copyExactText(project().editorial?.lastResult||"","Auswertung"));
  $("#authorProvider")?.addEventListener("change",e=>{const prov=validAiProvider(e.target.value),meta=aiProviderMeta(prov);project().ai.authorProvider=prov;project().ai.authorModel=meta.model;project().ai.guardProvider="deepseek";project().ai.guardModel="deepseek-v4-pro";save(`${meta.label} als Schreib-KI gespeichert · Buchprüfung bleibt DeepSeek`);render();});
  $("#testAuthorProvider")?.addEventListener("click",testAuthorProvider);
  $("#ttsVoiceSettings")?.addEventListener("click",voiceSettings);
  $("#ttsQuickRate")?.addEventListener("change",e=>setQuickRate(e.target.value));
  $("#dictateChapter")?.addEventListener("click",e=>{const el=$("#chapterContent");if(el)startDictation(el,e.currentTarget);});
  $("#ttsPause")?.addEventListener("click",toggleSpeechPause);
  $("#ttsStopGlobal")?.addEventListener("click",()=>stopSpeech());
  $("#readChapter")?.addEventListener("click",readManuscript);
  $$('[data-speak-message]').forEach(b=>b.addEventListener("click",()=>{const m=project().ideas.find(x=>x.id===b.dataset.speakMessage);if(m)speakText(m.text);}));
  $$('[data-copy-message]').forEach(b=>b.addEventListener("click",()=>{const m=project().ideas.find(x=>x.id===b.dataset.copyMessage);if(m)copyExactText(m.text,m.role==="user"?"Dein Text":"KI-Text");}));
  $("#sendIdea")?.addEventListener("click",sendIdea);
  $("#ideaInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendIdea();}});
  $("#addCharacter")?.addEventListener("click",()=>openCharacter());
  $$(".edit-char").forEach(b=>b.addEventListener("click",()=>openCharacter(b.dataset.id)));
  $("#addRelationship")?.addEventListener("click",()=>openRelationship());
  $$(".edit-rel").forEach(b=>b.addEventListener("click",()=>openRelationship(b.dataset.id)));
  $$("[data-chapter-menu]").forEach(btn=>btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openChapterMenu(btn.dataset.chapterMenu);}));
  $$("[data-chapter]").forEach(el=>el.addEventListener("click",e=>{if(e.target.closest(".delete-chapter,.chapter-dots"))return;rememberChapter(project(),el.dataset.chapter,state.activeTab==="chapters"?"plan":state.activeTab==="manuscript"?"write":null);store.save({sync:false});render();}));
  $$(".delete-chapter").forEach(btn=>btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();confirmDeleteChapter(btn.dataset.deleteChapter);}));
  $("#prevChapter")?.addEventListener("click",()=>moveChapter(-1));
  $("#nextChapter")?.addEventListener("click",()=>moveChapter(1));
  $("#openCurrentReader")?.addEventListener("click",()=>{if(chapter()?.content?.trim())openChapterReader(chapter().id);else toast("Dieses Kapitel enthält noch keinen Text.");});
  $$(".open-reader").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();openChapterReader(b.dataset.id);}));
  $$("[data-open-reader]").forEach(el=>el.addEventListener("click",e=>{if(e.target.closest("button"))return;openChapterReader(el.dataset.openReader);}));
  $("#addChapter")?.addEventListener("click",addChapter);
  $("#chapterTitle")?.addEventListener("input",e=>{chapter().title=e.target.value;save();});
  $("#chapterPlan")?.addEventListener("input",e=>{chapter().plan=e.target.value;save();});
  $("#chapterContent")?.addEventListener("input",e=>{const c=chapter();if(!c)return;c.content=e.target.value;c.status="Schreiben";save();});
  $("#markChapterComplete")?.addEventListener("click",()=>{const p=project(),c=chapter();if(!p||!c)return;c.writeIncomplete=false;const next=advanceAfterChapterTask(p,c.id,"write");save(next?`Kapitel als fertig markiert · weiter mit Kapitel ${next.number}`:"Kapitel als fertig markiert");render();});
  $("#chapterMemory")?.addEventListener("input",e=>{chapter().memory=e.target.value;save();});
  $("#generateChapter")?.addEventListener("click",()=>generateChapter(false));
  $("#continueChapter")?.addEventListener("click",()=>generateChapter(true));
  $("#toggleChapterSearch")?.addEventListener("click",toggleChapterSearch);
  $("#writingToolbarSettings")?.addEventListener("click",openWritingToolbarSettings);
  $("#toggleChapterList")?.addEventListener("click",()=>{const pr=writingPrefs();pr.chapterListOpen=!pr.chapterListOpen;store.save({sync:false});render();});
  $("#toggleMoreTools")?.addEventListener("click",()=>{const pr=writingPrefs();pr.moreToolsOpen=!pr.moreToolsOpen;store.save({sync:false});render();});
  $("#toggleWishPanel")?.addEventListener("click",()=>{const pr=writingPrefs(),panel=$("#wishPanel");const open=!(panel?.open);pr.wishOpen=open;store.save({sync:false});if(panel){panel.open=open;if(open){panel.scrollIntoView({block:"nearest",behavior:"smooth"});$("#chapterWish")?.focus({preventScroll:true});}}});
  $("#wishPanel")?.addEventListener("toggle",e=>{const pr=writingPrefs();if(pr.wishOpen!==e.target.open){pr.wishOpen=e.target.open;store.save({sync:false});}});
  $("#chapterWish")?.addEventListener("input",e=>{const c=chapter();if(!c)return;c.wish=e.target.value;store.save();});
  $("#reviseWhole")?.addEventListener("click",()=>reviseChapter("whole"));
  $("#reviseEnding")?.addEventListener("click",()=>reviseChapter("ending"));
  $("#reviseSelection")?.addEventListener("click",()=>reviseChapter("selection"));
  $("#continueWithWish")?.addEventListener("click",()=>{if(!String(chapter()?.wish||"").trim())return toast("Schreib zuerst in das Wunsch-Feld, wie es weitergehen soll.",4500);generateChapter(true);});
  $("#acceptRevision")?.addEventListener("click",acceptRevision);
  $("#discardRevision")?.addEventListener("click",discardRevision);
  $("#retryRevision")?.addEventListener("click",retryRevision);
  $("#openVersions")?.addEventListener("click",openVersions);
  $("#openBookVariants")?.addEventListener("click",openBookVariantsManager);
  for(const ev of ["select","keyup","mouseup","touchend"])$("#chapterContent")?.addEventListener(ev,rememberTextSelection);
  $("#generatePlan")?.addEventListener("click",generatePlan);
  $("#setReference")?.addEventListener("click",setReference);
  $("#clearReference")?.addEventListener("click",()=>{project().style.referenceText="";project().style.referenceChapterId=null;save("Referenz gelöst");render();});
  $("#addRule")?.addEventListener("click",()=>promptRule("rule"));
  $("#addForbidden")?.addEventListener("click",()=>promptRule("bad"));
  $("#openStyleImporter")?.addEventListener("click",()=>openStyleImporter("rule"));
  $("#cleanExistingStyle")?.addEventListener("click",()=>reviewExistingStyle());
  $("#processPendingStyle")?.addEventListener("click",()=>reviewPendingStyle());
  $("#viewStyleSources")?.addEventListener("click",()=>viewStyleSources());
  $$(".del-rule").forEach(b=>b.addEventListener("click",()=>{project().style.rules.splice(+b.dataset.i,1);save();render();}));
  $$(".del-bad").forEach(b=>b.addEventListener("click",()=>{project().style.forbidden.splice(+b.dataset.i,1);save();render();}));
  $("#aiReview")?.addEventListener("click",aiReview);
  $("#stopBookReviewNow")?.addEventListener("click",stopBookReviewNow);
  $("#stopBookReview")?.addEventListener("click",stopBookReview);
  $("#reviewChapterSelect")?.addEventListener("change",e=>{const p=project(),id=e.target.value;if(!p?.chapters?.some(c=>c.id===id))return;state.activeChapterId=id;p.ui ||= {};p.ui.lastChapterId=id;store.save({sync:false});render();});
  $("#copyReviewResult")?.addEventListener("click",()=>{const c=chapter();if(c?.reviewResult)copyExactText(c.reviewResult,"Kapitelprüfung");});
  $("#generateCoverIdeas")?.addEventListener("click",generateCoverIdeas);
  $("#downloadFullWrap")?.addEventListener("click",downloadFullWrap);
  $$("[data-cover-index]").forEach(b=>b.addEventListener("click",()=>chooseCover(b.dataset.coverIndex)));
  for(const id of ["coverAuthor","coverBlurb","coverPrompt","coverTrim","coverSpine","coverModel"])$("#"+id)?.addEventListener("change",saveCoverFields);
  $("#epubScope")?.addEventListener("change",e=>{const w=$("#epubChapterWrap");if(w)w.hidden=e.target.value!=="single";});
  $("#exportEpub")?.addEventListener("click",exportEpub);
  $("#exportTxt")?.addEventListener("click",exportTxt);
  $("#exportJson")?.addEventListener("click",exportJson);
  $("#importJson")?.addEventListener("change",importJson);
  $("#importBookFromExport")?.addEventListener("click",openBookImport);
  setTimeout(()=>{const m=$("#messages");if(m)m.scrollTop=m.scrollHeight},0);
}

function moveChapter(delta){
  const p=project(),c=chapter();if(!p||!c)return;const i=p.chapters.findIndex(x=>x.id===c.id),next=p.chapters[i+delta];if(!next)return;
  rememberChapter(p,next.id,state.activeTab==="chapters"?"plan":state.activeTab==="manuscript"?"write":null);store.save({sync:false});render();
}
function selectedReaderText(){
  const el=$("#readerPopupText");
  if(el&&typeof el.selectionStart==="number"&&el.selectionEnd>el.selectionStart)return String(el.value||"").slice(el.selectionStart,el.selectionEnd).trim();
  return String(window.getSelection?.()?.toString?.()||"").trim();
}
function textMatches(text,query){
  const q=String(query||"").trim().toLocaleLowerCase("de-DE"),src=String(text||""),low=src.toLocaleLowerCase("de-DE"),out=[];
  if(!q)return out;
  let pos=0;while((pos=low.indexOf(q,pos))>=0){out.push({start:pos,end:pos+q.length});pos+=Math.max(1,q.length);}
  return out;
}
function selectTextareaMatch(el,match){
  if(!el||!match)return;
  el.focus({preventScroll:true});el.setSelectionRange(match.start,match.end);
  const ratio=match.start/Math.max(1,String(el.value||"").length);
  el.scrollTop=Math.max(0,(el.scrollHeight-el.clientHeight)*ratio-40);
}
function bindTextSearch({input,prev,next,count,target}){
  let matches=[],i=-1;
  const refresh=step=>{
    matches=textMatches(target.value,input.value);
    if(!matches.length){i=-1;count.textContent=input.value.trim()?"0 Treffer":"Suche";return;}
    if(step===0)i=0;else i=(i+step+matches.length)%matches.length;
    count.textContent=`${i+1} von ${matches.length}`;selectTextareaMatch(target,matches[i]);
  };
  input.addEventListener("input",()=>refresh(0));input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();refresh(e.shiftKey?-1:1);}});
  prev.onclick=()=>refresh(-1);next.onclick=()=>refresh(1);
  return {refresh};
}
function toggleChapterSearch(){
  const bar=$("#chapterSearchBar"),target=$("#chapterContent");if(!bar||!target)return;
  const opening=bar.hidden;bar.hidden=!opening;
  if(!opening)return;
  const input=$("#chapterSearchInput"),prev=$("#chapterSearchPrev"),next=$("#chapterSearchNext"),count=$("#chapterSearchCount");
  if(!bar.dataset.bound){bindTextSearch({input,prev,next,count,target});bar.dataset.bound="1";}
  setTimeout(()=>input.focus(),0);
  $("#chapterSearchClose").onclick=()=>{bar.hidden=true;target.focus();};
}
// „⋯“-Menü eines Kapitels: zeigt nur, was für dieses Kapitel gerade sinnvoll ist.
function openChapterMenu(id){
  const p=project(),c=p?.chapters.find(x=>x.id===id);if(!p||!c)return;
  const hasText=!!String(c.content||"").trim(),incomplete=hasText&&!!c.writeIncomplete,planDone=!chapterNeedsPlan(c);
  const planBusy=jobBlocking(p,"plan",c.id),writeBusy=jobBlocking(p,"write",c.id),bookBusy=!!p.bookWriter?.running||!!p.planRunner?.running;
  const items=[];
  if(hasText)items.push(["read","📖 Lesen","Kapitel im Lesemodus öffnen"]);
  items.push(["plan","◇ Kapitelplan öffnen",planDone?"Plan ansehen oder bearbeiten":"Plan ist noch kurz"]);
  if(hasText)items.push(["write","✎ Im Manuskript öffnen",`${countWords(c.content).toLocaleString("de-DE")} Wörter`]);
  if(!planBusy&&!bookBusy)items.push(["genplan",planDone?"✦ Plan neu ausarbeiten":"✦ Plan ausarbeiten","KI arbeitet den szenischen Plan aus"]);
  if(!writeBusy&&!bookBusy){
    if(incomplete)items.push(["continue","✦ Weiter schreiben","Unvollständiges Kapitel fertig schreiben"]);
    else if(!hasText)items.push(["genwrite","✦ Kapitel schreiben",planDone?"Aus dem ausgearbeiteten Plan":"Tipp: vorher den Plan ausarbeiten"]);
    else items.push(["rewrite","✦ Neu schreiben","Alter Text bleibt unter „Rückgängig“"]);
  }
  if((c.versions||[]).length)items.push(["versions",`↶ Rückgängig (${c.versions.length})`,"Frühere Stände dieses Kapitels"]);
  if(hasText)items.push(["copy","⧉ Text kopieren","Ganzes Kapitel in die Zwischenablage"]);
  items.push(["insert","＋ Neues Kapitel danach einfügen",`Wird Kapitel ${c.number+1}, die anderen rücken nach`]);
  if(hasText&&!writeBusy)items.push(["cleartext","✂ Nur den Text löschen","Plan bleibt, Text kann neu geschrieben werden"]);
  items.push(["delete","🗑 Kapitel löschen…","Kommt in den Papierkorb"]);
  modal(`<div class="bk-menu-head"><div class="chapter-number">${c.number}</div><div><h2 style="margin:0;font-size:19px">${esc(c.title||`Kapitel ${c.number}`)}</h2><div class="small muted">Kapitel ${c.number} von ${p.chapters.length}</div></div></div>
    <div class="bk-menu">${items.map(([k,label,sub])=>`<button type="button" data-cm="${k}" class="${k==="delete"?"del":""}">${label}<small>${esc(sub)}</small></button>`).join("")}</div>
    <div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button></div>`);
  const go=(tab,mode)=>{rememberChapter(p,c.id,mode);state.activeTab=tab;store.save({sync:false});closeModal();render();};
  $$("[data-cm]").forEach(b=>b.onclick=async()=>{const k=b.dataset.cm;
    if(k==="read"){closeModal();openChapterReader(c.id);}
    else if(k==="plan")go("chapters","plan");
    else if(k==="write")go("manuscript","write");
    else if(k==="genplan"){go("chapters","plan");await generatePlan();}
    else if(k==="genwrite"){go("manuscript","write");await generateChapter(false);}
    else if(k==="continue"){go("manuscript","write");await generateChapter(true);}
    else if(k==="rewrite"){go("manuscript","write");await generateChapter(false);}
    else if(k==="versions"){go("manuscript","write");openVersions();}
    else if(k==="copy"){closeModal();copyExactText(c.content,`Kapitel ${c.number}`);}
    else if(k==="delete"){closeModal();confirmDeleteChapter(c.id);}
    else if(k==="insert"){insertChapterAfter(c.id);}
    else if(k==="cleartext"){closeModal();clearChapterText(c.id);}
  });
}
function openChapterReader(id){
  const p=project(),c=p?.chapters.find(x=>x.id===id);if(!p||!c)return;
  rememberChapter(p,c.id);store.save({sync:false});
  const idx=p.chapters.findIndex(x=>x.id===c.id),total=p.chapters.length;
  modal(`<div class="reader-popup-head"><div><div class="small muted">Kapitel ${c.number} von ${total}</div><h2>${esc(c.title)}</h2></div><button class="icon-btn" data-close aria-label="Schließen">×</button></div>
  <div class="reader-popup-actions"><button class="primary-btn" id="copyWholeChapter">Kopieren</button><button class="soft-btn" id="shareWholeChapter">Teilen</button><button class="soft-btn" id="readerSpeak">🔊 Vorlesen</button><button class="ghost-btn" id="readerEdit">Bearbeiten</button><button class="ghost-btn" id="readerProofread">Korrigieren</button><button class="ghost-btn" id="readerTxt">TXT</button></div>
  <div class="reader-search-row"><span aria-hidden="true">⌕</span><input class="input" id="readerSearchInput" placeholder="Wort oder Satz im Kapitel suchen …"><button class="ghost-btn" id="readerSearchPrev">↑</button><button class="ghost-btn" id="readerSearchNext">↓</button><span class="search-count" id="readerSearchCount">Suche</span></div>
  <div class="selection-tools"><span class="small muted">Text markieren und dann:</span><button class="ghost-btn" id="selectWholeReaderText">Alles im Kapitel markieren</button><button class="ghost-btn" id="copySelection">Auswahl kopieren</button><button class="ghost-btn" id="shareSelection">Auswahl teilen</button><button class="ghost-btn" id="protectSelection">Auswahl schützen</button></div>
  <textarea readonly spellcheck="false" class="reader-popup-textarea" id="readerPopupText">${esc(c.content)}</textarea>
  <div class="reader-popup-nav"><button class="ghost-btn" id="readerPrev" ${idx<=0?"disabled":""}>‹ Kapitel ${idx>0?p.chapters[idx-1].number:""}</button><span class="small muted">${countWords(c.content).toLocaleString("de-DE")} Wörter</span><button class="ghost-btn" id="readerNext" ${idx>=total-1?"disabled":""}>Kapitel ${idx<total-1?p.chapters[idx+1].number:""} ›</button></div>` ,"wide");
  const textArea=$("#readerPopupText");
  bindTextSearch({input:$("#readerSearchInput"),prev:$("#readerSearchPrev"),next:$("#readerSearchNext"),count:$("#readerSearchCount"),target:textArea});
  $("#copyWholeChapter").onclick=async()=>{await copyExactText(c.content,"Kapitel");};
  $("#shareWholeChapter").onclick=()=>shareText(`Kapitel ${c.number}: ${c.title}`,c.content);
  $("#readerSpeak").onclick=()=>speakText(c.content);
  $("#readerTxt").onclick=()=>download(`${safeName(p.title)}-Kapitel-${c.number}.txt`,c.content,"text/plain;charset=utf-8");
  $("#readerEdit").onclick=()=>openReaderEditor(c.id);
  $("#readerProofread").onclick=()=>proofreadFromReader(c.id);
  $("#selectWholeReaderText").onclick=()=>{textArea.focus();textArea.select();};
  $("#copySelection").onclick=async()=>{const t=selectedReaderText();if(!t)return toast("Markiere zuerst Text.");await copyExactText(t,"Auswahl");};
  $("#shareSelection").onclick=()=>{const t=selectedReaderText();if(!t)return toast("Markiere zuerst Text.");shareText(`Kapitel ${c.number}: ${c.title}`,t);};
  $("#protectSelection").onclick=()=>{const t=selectedReaderText();if(!t)return toast("Markiere zuerst Text.");p.protectedPassages.push({id:uid(),chapterId:c.id,chapterNumber:c.number,text:t,note:"Nicht automatisch verändern"});save("Passage geschützt");toast("Ausgewählte Passage geschützt");};
  $("#readerPrev").onclick=()=>{closeModal();openChapterReader(p.chapters[idx-1].id);};
  $("#readerNext").onclick=()=>{closeModal();openChapterReader(p.chapters[idx+1].id);};
}
function openReaderEditor(id){
  const p=project(),c=p?.chapters.find(x=>x.id===id);if(!c)return;
  closeModal();modal(`<h2>Kapitel ${c.number} bearbeiten</h2><div class="small muted" style="margin-bottom:10px">${esc(c.title)}</div><textarea class="manuscript reader-edit-text" id="readerEditText">${esc(c.content)}</textarea><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="saveReaderEdit">Speichern</button></div>`,"wide");
  $("#saveReaderEdit").onclick=()=>{c.content=$("#readerEditText").value;c.status="Entwurf";save("Kapitel gespeichert");closeModal();render();openChapterReader(c.id);};
}
async function proofreadFromReader(id){
  const p=project(),c=p?.chapters.find(x=>x.id===id);if(!c?.content?.trim())return toast("Dieses Kapitel enthält noch keinen Text.");
  const btn=$("#readerProofread");if(btn){btn.disabled=true;btn.textContent="Prüft …";}
  const original=c.content;
  try{const data=await withBusy(()=>apiData("proofread",{chapter:{number:c.number,title:c.title,content:original}},{projectOverride:p}));const lp=liveProject(p);if(!lp)return;lp.editorial ||= {};lp.editorial.proofread={...data,original,chapterId:c.id};lp.updatedAt=now();store.save();toast("Korrektorat fertig");closeModal();if(project()?.id===lp.id)openProofreadModal(lp.editorial.proofread);}catch(e){toast(e.message);if(btn){btn.disabled=false;btn.textContent="Korrigieren";}}
}
function openProofreadModal(pr){
  const p=project(),c=p?.chapters.find(x=>x.id===pr?.chapterId);if(!pr||!c)return;
  modal(`<div class="reader-popup-head"><div><div class="small muted">Korrektorat · Kapitel ${c.number}</div><h2>${esc(c.title)}</h2></div><button class="icon-btn" data-close>×</button></div><div class="correction-popup-grid"><section class="card compare-card"><div class="provider-label">Original</div><div class="sample" id="proofOriginal">${esc(pr.original||c.content)}</div><div class="reader-card-actions"><button class="ghost-btn" id="copyProofOriginal">Kopieren</button></div></section><section class="card compare-card"><div class="provider-label">Korrektur</div><div class="sample" id="proofCorrected">${esc(pr.correctedText||"")}</div><div class="reader-card-actions"><button class="soft-btn" id="copyProofCorrected">Kopieren</button><button class="soft-btn" id="shareProofCorrected">Teilen</button></div></section></div>${(pr.notes||[]).length?`<div class="notes-list"><h3>Hinweise</h3>${pr.notes.map(n=>`<div class="rule good"><span>${esc(n)}</span></div>`).join("")}</div>`:""}<div class="modal-actions"><button class="ghost-btn" id="rejectProofread">Ablehnen</button><button class="primary-btn" id="acceptProofreadPopup">Übernehmen</button></div>`,"wide");
  $("#copyProofOriginal").onclick=async()=>{await copyExactText(pr.original||c.content,"Original");};
  $("#copyProofCorrected").onclick=async()=>{await copyExactText(pr.correctedText||"","Korrektur");};
  $("#shareProofCorrected").onclick=()=>shareText(`Korrektur Kapitel ${c.number}: ${c.title}`,pr.correctedText||"");
  $("#rejectProofread").onclick=()=>{p.editorial.proofread=null;save("Korrektur verworfen");closeModal();render();};
  $("#acceptProofreadPopup").onclick=()=>{acceptProofread();closeModal();};
}

function confirmDeleteProject(id){
  const p=(state.projects||[]).find(x=>x.id===id);
  if(!p)return;
  const eg=editionGroupForProject(p);if(eg){const orig=editionOriginal(eg),books=editionBooks(eg);if(p.id!==orig?.id){modal(`<h2>${esc(editionLabel(p))} löschen?</h2><p>Nur <strong>${esc(editionLabel(p))}</strong> wird in den Papierkorb verschoben. <strong>Das Original bleibt vollständig erhalten.</strong></p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="danger-btn" id="deleteOnlyEdition">Nur ${esc(editionLabel(p))} löschen</button></div>`);$("#deleteOnlyEdition").onclick=()=>deleteEditionDirect(p.id);return;}if(books.length>1){return toast("Das Original ist geschützt. Lösche alternative Fassungen einzeln. Das Original bleibt dabei unangetastet.",6500);}}
  const chapterCount=(p.chapters||[]).length;
  const wordCount=(p.chapters||[]).reduce((n,c)=>n+countWords(c.content||""),0);
  modal(`<h2>Buch vollständig löschen?</h2>
    <p><strong>${esc(p.title)}</strong> wird komplett aus Litterum entfernt.</p>
    <div class="card danger-note" style="padding:14px;margin:12px 0">
      <div class="small" style="line-height:1.7">
        Gelöscht werden unter anderem:<br>
        • ${chapterCount} Kapitel und ${wordCount.toLocaleString("de-DE")} Manuskript-Wörter<br>
        • Figuren und Beziehungen<br>
        • Buchbriefing und Ideenspeicher<br>
        • Roman-DNA und Stil-DNA<br>
        • Lektorat, Korrektorat und Testleser-Ergebnisse<br>
        • Referenztexte und geschützte Passagen
      </div>
    </div>
    <p class="small muted">Das Buch kommt in den Papierkorb (⚙ → Papierkorb) und lässt sich 30 Tage lang zurückholen.</p>
    <div class="field" style="margin-top:14px">
      <label>Zur Sicherheit den Buchtitel eingeben:</label>
      <input class="input" id="deleteProjectConfirm" autocomplete="off" placeholder="${esc(p.title)}">
    </div>
    <div class="modal-actions">
      <button class="ghost-btn" data-close>Abbrechen</button>
      <button class="danger-btn" id="deleteProjectFinal" disabled>Endgültig löschen</button>
    </div>`);
  const input=$("#deleteProjectConfirm"),finalBtn=$("#deleteProjectFinal");
  const check=()=>{finalBtn.disabled=(input.value.trim()!==p.title.trim());};
  input.addEventListener("input",check);
  input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!finalBtn.disabled)finalBtn.click();});
  finalBtn.onclick=()=>deleteProjectCompletely(id);
  input.focus();
}
function deleteProjectCompletely(id){
  const p=(state.projects||[]).find(x=>x.id===id);
  if(!p)return;
  stopSpeech(true);
  stopDictation(true);
  const sr0=p.seriesId?seriesById(p.seriesId):null,eg0=editionGroupForProject(p);
  const trashId=trashAdd({kind:"book",label:p.title,where:eg0?`Buchfassungen ${eg0.title}`:sr0?`Buchreihe ${sr0.title}`:"Meine Bücher",project:cloneDeep(p),seriesId:p.seriesId||"",seriesPos:sr0?(sr0.bookIds||[]).indexOf(p.id):0,series:sr0&&seriesBooks(sr0).length<=1?cloneDeep({...sr0,bookIds:[]}):null,editionGroup:eg0?cloneDeep(eg0):null,editionPos:eg0?(eg0.bookIds||[]).indexOf(p.id):0});
  setTimeout(()=>undoBar(`„${p.title}“ gelöscht.`,trashId),80);
  state.projects=(state.projects||[]).filter(x=>x.id!==id);
  if(p.seriesId){const sr=seriesById(p.seriesId);if(sr){sr.bookIds=(sr.bookIds||[]).filter(x=>x!==id);sr.updatedAt=now();const remaining=seriesBooks(sr);if(!remaining.length)state.series=(state.series||[]).filter(x=>x.id!==sr.id);else remaining.forEach((b,i)=>{b.seriesOrder=i+1;b.seriesLabel=`Band ${i+1}`;});}}
  if(eg0){eg0.bookIds=(eg0.bookIds||[]).filter(x=>x!==id);eg0.updatedAt=now();normalizeEditionGroups();}
  if(state.activeProjectId===id){
    state.activeProjectId=null;
    state.activeChapterId=null;
    state.activeTab="studio";
  }
  store.save();
  markHomeHistory();
  closeModal();
  render();
  toast(`„${p.title}“ vollständig gelöscht`);
}

// ---------- Buch importieren (Text, Markdown, Word, OpenDocument, EPUB, PDF) ----------
// Alles wird direkt auf dem Gerät gelesen (nichts wird hochgeladen). Kapitel werden an Überschriften erkannt
// („Kapitel 3“, „Prolog“, Word-Überschriften, EPUB-Kapitel, große Schrift im PDF). Danach entsteht ein neues
// Buch, das wie jedes andere bearbeitet, überarbeitet („Buch überarbeiten“) oder weitergeschrieben werden kann.
const IMPORT_EXTENSIONS=["txt","md","markdown","text","docx","odt","epub","pdf"];
function importNormalizeText(t){return String(t||"").replace(/^﻿/,"").replace(/\r\n?/g,"\n").replace(/[ \t ]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();}
async function unzipArchive(buffer){
  const u8=new Uint8Array(buffer),dv=new DataView(buffer);
  let eocd=-1;for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)throw new Error("Die Datei ist kein gültiges Archiv (beschädigt oder falsches Format).");
  const count=dv.getUint16(eocd+10,true);let p=dv.getUint32(eocd+16,true);
  const dec=new TextDecoder(),entries=new Map();
  for(let n=0;n<count&&dv.getUint32(p,true)===0x02014b50;n++){
    const method=dv.getUint16(p+10,true),size=dv.getUint32(p+20,true),nameLen=dv.getUint16(p+28,true),extraLen=dv.getUint16(p+30,true),commentLen=dv.getUint16(p+32,true),local=dv.getUint32(p+42,true);
    entries.set(dec.decode(u8.subarray(p+46,p+46+nameLen)),{method,size,local});
    p+=46+nameLen+extraLen+commentLen;
  }
  const read=async name=>{
    const e=entries.get(name)||[...entries].find(([k])=>k.toLowerCase()===String(name).toLowerCase())?.[1];if(!e)return null;
    const start=e.local+30+dv.getUint16(e.local+26,true)+dv.getUint16(e.local+28,true),data=u8.subarray(start,start+e.size);
    if(e.method===0)return data;
    if(e.method!==8)throw new Error("Dieses Archiv nutzt eine nicht unterstützte Komprimierung.");
    if(typeof DecompressionStream!=="function")throw new Error("Dieser Browser kann die Datei nicht entpacken. Bitte Chrome, Safari oder Firefox aktualisieren.");
    return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  };
  return {names:[...entries.keys()],read,readText:async name=>{const b=await read(name);return b?new TextDecoder().decode(b):null;}};
}
function parseXml(text,type="application/xml"){const doc=new DOMParser().parseFromString(text,type);if(doc.getElementsByTagName("parsererror").length&&type!=="text/html")return new DOMParser().parseFromString(text,"text/html");return doc;}
// Überschriften im Fließtext erkennen: „Kapitel 3“, „Chapter 3“, „Prolog“, „# Titel“, „III“, „12.“
const IMPORT_HEADING=/^(?:#{1,3}\s+\S.*|(?:kapitel|chapter|capítulo|capitolo|chapitre|poglavlje|rozdział|hoofdstuk)\s+[\wäöüÄÖÜ.-]+.*|(?:prolog|prologue|epilog|epilogue|vorwort|nachwort|interludium|intermezzo|einleitung|finale)\b.*|(?:\d{1,3}|[IVXLC]{1,7})\.?)$/i;
const IMPORT_PART=/^(?:teil|part|buch|band|akt)\s+[\wäöüÄÖÜ.-]+.*$/i;
// „Kapitel 1“ + „Der Anfang“ → „Kapitel 1 – Der Anfang“; wiederholt der zweite Teil den ersten, nur ihn nehmen.
function joinHeading(a,b){const x=String(a).trim(),y=String(b).trim();return y.toLocaleLowerCase("de-DE").startsWith(x.toLocaleLowerCase("de-DE"))?y:`${x} – ${y}`;}
function splitIntoChapters(text,{forceSections=false}={}){
  const clean=importNormalizeText(text);
  const lines=clean.split("\n");
  const chapters=[];let cur=null,part="",pre=[];
  const isBlank=i=>i<0||i>=lines.length||!lines[i].trim();
  const start=(title,i)=>{cur={title,partTitle:part,lines:[]};chapters.push(cur);};
  if(!forceSections)for(let i=0;i<lines.length;i++){
    const line=lines[i].trim(),bare=line.replace(/^#{1,3}\s+/,"");
    const headingish=line.length<=80&&isBlank(i-1)&&!/[,;]$/.test(line);
    if(headingish&&IMPORT_PART.test(bare)&&isBlank(i+1)){part=bare;continue;}
    const titleBelow=!isBlank(i+1)&&(lines[i+1]||"").trim().length<=70&&!/[.!?…:"«»“”,;]$/.test((lines[i+1]||"").trim())&&isBlank(i+2);
    if(headingish&&IMPORT_HEADING.test(line)&&(isBlank(i+1)||/^#/.test(line)||(titleBelow&&/^(?:kapitel|chapter|\d{1,3}\.?|[IVXLC]{1,7}\.?)(?:\s|$)/i.test(bare)))){
      let title=line.replace(/^#{1,3}\s+/,"").trim();
      // „Kapitel 3“ + kurze Titelzeile darunter → „Der Sturm“
      let j=i+1;while(j<lines.length&&!lines[j].trim())j++;
      const next=(lines[j]||"").trim();
      if(/^(?:kapitel|chapter|\d{1,3}\.?|[IVXLC]{1,7}\.?)(?:\s|$)/i.test(title)&&title.length<22&&next&&next.length<=70&&!/[.!?…:"«»“”,;]$/.test(next)&&isBlank(j+1)&&!IMPORT_HEADING.test(next.replace(/^#{1,3}\s+/,""))){title=joinHeading(title,next.replace(/^#{1,3}\s+/,""));i=j;}
      // Zwei Überschriften direkt nacheinander („Kapitel 1“ / „Der Anfang“) sind EIN Kapitel.
      if(cur&&!cur.lines.some(x=>x.trim())&&/^(?:kapitel|chapter|\d{1,3}\.?|[IVXLC]{1,7}\.?)(?:\s|$)/i.test(cur.title)&&cur.title.length<22){cur.title=joinHeading(cur.title,title);continue;}
      start(title,i);continue;
    }
    if(cur)cur.lines.push(lines[i]);else pre.push(lines[i]);
  }
  let out=chapters.map(c=>({title:c.title,partTitle:c.partTitle,text:importNormalizeText(c.lines.join("\n"))})).filter(c=>c.text);
  const preText=importNormalizeText(pre.join("\n"));
  if(out.length<2||forceSections){
    // Keine verlässlichen Überschriften: in Abschnitte zu ca. 3.000 Wörtern teilen (an Absatzgrenzen).
    const paras=clean.split(/\n\s*\n/),sections=[];let buf=[],words=0;
    for(const para of paras){buf.push(para);words+=countWords(para);if(words>=3000){sections.push(buf.join("\n\n"));buf=[];words=0;}}
    if(buf.length)sections.push(buf.join("\n\n"));
    return {chapters:sections.map((t,i)=>({title:`Abschnitt ${i+1}`,partTitle:"",text:importNormalizeText(t)})).filter(c=>c.text),preText:"",detected:false};
  }
  if(countWords(preText)>=150)out.unshift({title:"Beginn",partTitle:"",text:preText});
  return {chapters:out,preText:countWords(preText)<150?preText:"",detected:true};
}
async function importFromDocx(buffer){
  const zip=await unzipArchive(buffer),xml=await zip.readText("word/document.xml");
  if(!xml)throw new Error("In dieser Word-Datei wurde kein Text gefunden.");
  const doc=parseXml(xml),core=await zip.readText("docProps/core.xml");
  const title=core?parseXml(core).getElementsByTagName("dc:title")[0]?.textContent?.trim()||"":"";
  const out=[];let docTitle="";
  for(const p of doc.getElementsByTagName("w:p")){
    const style=p.getElementsByTagName("w:pStyle")[0]?.getAttribute("w:val")||"";
    let t="";for(const n of p.getElementsByTagName("*")){if(n.tagName==="w:t")t+=n.textContent;else if(n.tagName==="w:tab")t+="\t";else if(n.tagName==="w:br"||n.tagName==="w:cr")t+="\n";}
    t=t.trim();if(!t)continue;
    const st=style.replace(/[Üü]/g,"");
    if(/^(title|titel|titre|titolo)$/i.test(st)){if(!docTitle)docTitle=t;continue;}
    const heading=/^(heading|berschrift|titre|titolo)\s*[12]$/i.test(st);
    out.push(heading?`\n# ${t}\n`:t);
  }
  return {title:title||docTitle,text:out.join("\n\n")};
}
async function importFromOdt(buffer){
  const zip=await unzipArchive(buffer),xml=await zip.readText("content.xml");
  if(!xml)throw new Error("In dieser Datei wurde kein Text gefunden.");
  const doc=parseXml(xml),out=[];
  for(const el of doc.getElementsByTagName("*")){
    if(el.tagName==="text:h")out.push(`\n# ${el.textContent.trim()}\n`);
    else if(el.tagName==="text:p"&&el.parentNode?.tagName!=="text:p")out.push(el.textContent.trim());
  }
  return {title:"",text:out.filter(Boolean).join("\n\n")};
}
function htmlBlocksToText(doc){
  const body=doc.body||doc.getElementsByTagName("body")[0]||doc.documentElement,out=[];
  const walk=node=>{
    for(const el of node.children||[]){
      const tag=String(el.localName||el.tagName||"").toLowerCase();
      if(/^(script|style|nav|head)$/.test(tag))continue;
      if(/^h[1-3]$/.test(tag)){const t=el.textContent.replace(/\s+/g," ").trim();if(t)out.push(`\n# ${t}\n`);}
      else if(/^(p|h[4-6]|li|blockquote|pre)$/.test(tag)){const t=el.textContent.replace(/[ \t\r\n]+/g," ").trim();if(t)out.push(t);}
      else if(el.children?.length)walk(el);
      else{const t=el.textContent.replace(/\s+/g," ").trim();if(t)out.push(t);}
    }
  };
  walk(body);
  return out.join("\n\n");
}
async function importFromEpub(buffer){
  const zip=await unzipArchive(buffer);
  const container=await zip.readText("META-INF/container.xml");
  const opfPath=container?parseXml(container).getElementsByTagName("rootfile")[0]?.getAttribute("full-path"):zip.names.find(n=>/\.opf$/i.test(n));
  if(!opfPath)throw new Error("Diese EPUB-Datei ist unvollständig (Inhaltsverzeichnis fehlt).");
  const opf=parseXml(await zip.readText(opfPath)||""),base=opfPath.includes("/")?opfPath.slice(0,opfPath.lastIndexOf("/")+1):"";
  const meta=tag=>opf.getElementsByTagName(tag)[0]?.textContent?.trim()||"";
  const manifest=new Map([...opf.getElementsByTagName("item")].map(i=>[i.getAttribute("id"),{href:i.getAttribute("href"),type:i.getAttribute("media-type")||"",props:i.getAttribute("properties")||""}]));
  const resolve=href=>{const parts=(base+decodeURIComponent(String(href||"").split("#")[0])).split("/"),outp=[];for(const x of parts){if(x==="..")outp.pop();else if(x&&x!==".")outp.push(x);}return outp.join("/");};
  const pieces=[];
  for(const ref of opf.getElementsByTagName("itemref")){
    const item=manifest.get(ref.getAttribute("idref"));if(!item||!/html|xml/.test(item.type)||/nav/.test(item.props))continue;
    const html=await zip.readText(resolve(item.href));if(!html)continue;
    let doc=new DOMParser().parseFromString(html,"application/xhtml+xml");if(doc.getElementsByTagName("parsererror").length)doc=new DOMParser().parseFromString(html,"text/html");
    const text=htmlBlocksToText(doc).trim();if(!text)continue;
    const words=countWords(text),hasHeading=/(^|\n)# /.test(text);
    // Cover, Titelei, Inhaltsverzeichnis überspringen
    if(words<40&&!hasHeading)continue;
    if(/^(\n?# )?(inhalt|inhaltsverzeichnis|contents|table of contents|impressum|copyright)\b/i.test(text.trim()))continue;
    // Dateien ohne eigene Überschrift gehören zum vorherigen Kapitel (lange Kapitel sind oft auf mehrere Dateien verteilt).
    pieces.push(text);
  }
  return {title:meta("dc:title"),author:meta("dc:creator"),text:pieces.join("\n\n")};
}
let pdfjsPromise=null;
function loadPdfJs(){
  if(!pdfjsPromise)pdfjsPromise=import("/vendor/pdfjs/pdf.min.mjs").then(m=>{m.GlobalWorkerOptions.workerSrc="/vendor/pdfjs/pdf.worker.min.mjs";return m;}).catch(e=>{pdfjsPromise=null;throw new Error("Der PDF-Leser konnte nicht geladen werden. Bitte online sein und erneut versuchen.");});
  return pdfjsPromise;
}
async function importFromPdf(buffer,onProgress=()=>{}){
  const pdfjs=await loadPdfJs();
  const pdf=await pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false}).promise;
  const meta=await pdf.getMetadata().catch(()=>null);
  const pages=[];
  for(let n=1;n<=pdf.numPages;n++){
    onProgress(n,pdf.numPages);
    const page=await pdf.getPage(n),tc=await page.getTextContent();
    const lines=[];let line=null;
    for(const it of tc.items){
      if(typeof it.str!=="string")continue;
      const y=Math.round(it.transform?.[5]||0),size=Math.abs(it.transform?.[3]||it.height||0);
      if(!line||Math.abs(line.y-y)>Math.max(2,size*0.4)){line={y,size,text:""};lines.push(line);}
      line.text+=it.str;line.size=Math.max(line.size,size);
      if(it.hasEOL)line=null;
    }
    pages.push(lines.map(l=>({...l,text:l.text.replace(/\s+/g," ").trim()})).filter(l=>l.text));
    page.cleanup?.();
  }
  const all=pages.flat();
  if(countWords(all.map(l=>l.text).join(" "))<30)throw new Error("Diese PDF enthält keinen lesbaren Text (vermutlich eingescannte Seiten).");
  // Kopf-/Fußzeilen (auf vielen Seiten gleich) und reine Seitenzahlen entfernen
  const freq=new Map();for(const pg of pages)for(const l of [...pg.slice(0,2),...pg.slice(-2)]){const k=l.text.replace(/\d+/g,"#");freq.set(k,(freq.get(k)||0)+1);}
  const repeated=k=>pages.length>=6&&(freq.get(k)||0)>=Math.max(3,pages.length*0.3);
  const sizes=all.map(l=>l.size).sort((a,b)=>a-b),body=sizes[Math.floor(sizes.length/2)]||10;
  const out=[];
  for(const pg of pages){
    let prevY=null;
    for(const [i,l] of pg.entries()){
      const edge=i<2||i>=pg.length-2;
      if(/^\d{1,4}$/.test(l.text)||(edge&&repeated(l.text.replace(/\d+/g,"#"))))continue;
      if(l.size>=body*1.25&&l.text.length<=80){out.push(`\n# ${l.text}\n`);prevY=null;continue;}
      const gap=prevY===null?0:Math.abs(prevY-l.y);
      if(prevY!==null&&gap>body*1.9)out.push("");
      out.push(l.text);prevY=l.y;
    }
    out.push("");
  }
  // Zeilen zu Absätzen verbinden, Silbentrennung am Zeilenende auflösen
  const text=out.join("\n").replace(/(\p{L})-\n(\p{Ll})/gu,"$1$2").replace(/([^\n])\n(?!\n|# )/g,"$1 ");
  const metaTitle=String(meta?.info?.Title||"").trim();
  return {title:/^(untitled|unbenannt|ohne titel|microsoft word.*|document\d*)$/i.test(metaTitle)?"":metaTitle,author:String(meta?.info?.Author||"").trim(),text};
}
async function readBookFile(file,onProgress){
  const ext=(String(file.name).match(/\.([a-z0-9]+)$/i)?.[1]||"").toLowerCase();
  if(!IMPORT_EXTENSIONS.includes(ext))throw new Error(ext==="doc"?"Alte .doc-Dateien kann der Browser nicht lesen. Bitte in Word als .docx speichern.":"Dieses Format wird nicht unterstützt. Möglich sind PDF, EPUB, Word (.docx), OpenDocument (.odt) und Text (.txt/.md).");
  const base=String(file.name).replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").trim();
  let r;
  if(["txt","md","markdown","text"].includes(ext)){
    const buf=await file.arrayBuffer();let text=new TextDecoder("utf-8").decode(buf);
    if(text.includes("�"))text=new TextDecoder("windows-1252").decode(buf); // ältere Windows-Textdateien
    r={title:"",text};
  }else if(ext==="docx")r=await importFromDocx(await file.arrayBuffer());
  else if(ext==="odt")r=await importFromOdt(await file.arrayBuffer());
  else if(ext==="epub")r=await importFromEpub(await file.arrayBuffer());
  else r=await importFromPdf(await file.arrayBuffer(),onProgress);
  if(countWords(r.text)<20)throw new Error("In dieser Datei wurde kaum Text gefunden.");
  return {title:r.title||base||"Importiertes Buch",author:r.author||"",text:r.text,ext,fromFileName:!r.title};
}
function openBookImport(){
  modal(`<h2>Buch importieren</h2><p>Lade ein vorhandenes Manuskript hoch: <strong>PDF, EPUB, Word (.docx), OpenDocument (.odt) oder Text (.txt/.md)</strong>. Litterum erkennt die Kapitel und legt daraus ein neues Buch an, das du bearbeiten, überarbeiten oder weiterschreiben kannst.</p><p class="small muted">Die Datei wird nur auf diesem Gerät gelesen.</p><input type="file" id="bookImportFile" class="input" accept=".pdf,.epub,.docx,.odt,.txt,.md,.markdown,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"><div id="bookImportStatus" class="small muted" style="margin-top:10px"></div><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button></div>`);
  $("#bookImportFile").onchange=async e=>{
    const file=e.target.files?.[0];if(!file)return;
    const status=$("#bookImportStatus");status.textContent="Datei wird gelesen …";
    try{
      const book=await readBookFile(file,(n,total)=>{if(status)status.textContent=`PDF wird gelesen · Seite ${n} von ${total} …`;});
      showImportPreview(book);
    }catch(err){if(status){status.className="warning";status.textContent=err.message||"Die Datei konnte nicht gelesen werden.";}}
  };
}
function showImportPreview(book){
  let split=splitIntoChapters(book.text);
  // Kurze Titelei vor dem ersten Kapitel: erste Zeile als Buchtitel, „von …“ als Autorin
  if(split.preText&&book.fromFileName){const pl=split.preText.split("\n").map(x=>x.trim()).filter(Boolean);if(pl[0]&&pl[0].length<=80)book.title=pl[0].replace(/^#+\s*/,"");const by=pl.find(x=>/^(von|by)\s+\S/i.test(x));if(by&&!book.author)book.author=by.replace(/^(von|by)\s+/i,"");}
  const draw=()=>{
    const words=split.chapters.reduce((n,c)=>n+countWords(c.text),0);
    modal(`<h2>Buch importieren</h2>
      <div class="field"><label>Titel</label><input class="input" id="importTitle" value="${esc(book.title)}"></div>
      <p><strong>${split.chapters.length} ${split.detected?"Kapitel erkannt":"Abschnitte"}</strong> · ${words.toLocaleString("de-DE")} Wörter${split.detected?"":` <span class="small muted">(keine Kapitelüberschriften gefunden – in Abschnitte zu ca. 3.000 Wörtern geteilt)</span>`}</p>
      <div class="import-chapter-list">${split.chapters.slice(0,200).map((c,i)=>`<div><span>${i+1}</span><strong>${esc(c.title)}</strong><em>${countWords(c.text).toLocaleString("de-DE")} W.</em></div>`).join("")}</div>
      <label class="toggle-row" style="margin-top:10px"><input type="checkbox" id="importSections" ${split.detected?"":"checked disabled"}><span>Kapitel stimmen nicht? Stattdessen gleich große Abschnitte bilden</span></label>
      <label class="toggle-row"><input type="checkbox" id="importAnalyze" checked><span>Figuren, Beziehungen, Roman-DNA und Zusammenfassung von der KI erkennen lassen</span></label>
      <div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="confirmImport">Als neues Buch anlegen</button></div>`,"wide");
    $("#importSections").onchange=e=>{book.title=$("#importTitle").value;split=splitIntoChapters(book.text,{forceSections:e.target.checked});if(e.target.checked)split.detected=true,split.forced=true;draw();if(split.forced){$("#importSections").checked=true;$("#importSections").disabled=false;}};
    $("#confirmImport").onclick=()=>{const title=$("#importTitle").value.trim()||book.title;createImportedBook({...book,title},split.chapters,$("#importAnalyze").checked);};
  };
  closeModal();draw();
}
function createImportedBook(book,chapters,analyze){
  const p=makeNewProject(book.title,"Roman","");
  p.status="Überarbeitung";
  if(book.author)p.cover.author=book.author;
  p.chapters=chapters.map((c,i)=>({id:uid(),number:i+1,title:c.title||`Kapitel ${i+1}`,partTitle:c.partTitle||"",plan:"",content:c.text,memory:"",status:"Entwurf",planExpanded:true}));
  ensureProjectShape(p);
  p.ui.writeChapterId=p.chapters[0]?.id||null;p.ui.lastChapterId=p.ui.writeChapterId;
  p.ideas=[{id:uid(),role:"ai",text:`„${p.title}“ wurde importiert (${p.chapters.length} Kapitel). Du kannst jedes Kapitel direkt bearbeiten, mit „Wunsch an die KI“ gezielt ändern lassen oder im Buchstudio das ganze Buch überarbeiten.`,ts:now()}];
  state.projects.unshift(p);state.activeProjectId=p.id;state.activeChapterId=p.chapters[0]?.id||null;state.activeTab="studio";
  migrateState();save();ensureWorkspaceHistory(p.id);closeModal();render();
  toast(`${p.chapters.length} Kapitel importiert.`,4000);
  if(analyze)analyzeImportedBook(p.id);
}
// Für die Analyse reichen die Anfänge der Kapitel (dort werden Figuren und Orte eingeführt) – so bleibt sie
// auch bei dicken Romanen schnell (höchstens ca. 8 Anfragen).
async function analyzeImportedBook(pid){
  const p=projectById(pid);if(!p)return;
  const per=Math.max(600,Math.floor(56000/Math.max(1,p.chapters.length)));
  const excerpt=p.chapters.map(c=>`# ${c.title}\n\n${String(c.content||"").slice(0,per)}`).join("\n\n");
  const title=p.title;
  toast("Die KI liest das Buch und erkennt Figuren und Roman-DNA …",5000);
  try{
    const data=await withBusy(()=>analyzeBriefingForProject(p,()=>{},excerpt));
    const lp=liveProject(p);if(!lp)return;
    applyBriefingData(lp,data,{navigate:false});
    lp.title=title;lp.briefing ||= {};lp.briefing.analysis=data;lp.briefing.summary=data.summary||lp.briefing.summary||"";lp.briefing.lastAnalyzed=now();lp.updatedAt=now();
    store.save();if(project()?.id===lp.id)render();
    toast(`Erkannt: ${(lp.characters||[]).length} Figuren und die Roman-DNA von „${lp.title}“.`,5000);
  }catch(e){toast(`Die automatische Analyse hat nicht geklappt: ${e.message||"unbekannter Fehler"}. Das Buch selbst ist vollständig importiert.`,7000);}
}
function openNewBook(prefill=""){
  modal(`<h2>Neues Buch</h2><div class="field"><label>Arbeitstitel</label><input class="input" id="nbTitle" placeholder="Zum Beispiel: Rahel & Adam"></div>
  <div class="field" style="margin-top:10px"><label>Genre</label><input class="input" id="nbGenre" placeholder="Zum Beispiel: Romantische Science Fiction"></div>
  <div class="field" style="margin-top:10px"><label>Erzähl mir deine Idee</label><textarea id="nbIdea" rows="7" placeholder="Schreib einfach frei ...">${esc(prefill)}</textarea></div>
  <div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="createBook">Buch anlegen</button></div>`);
  $("#createBook").onclick=()=>{
    const title=$("#nbTitle").value.trim()||"Neues Buch", idea=$("#nbIdea").value.trim(), genre=$("#nbGenre").value.trim()||"Roman";
    const p=makeNewProject(title,genre,idea);
    state.projects.unshift(p);state.activeProjectId=p.id;state.activeChapterId=null;state.activeTab="studio";save();ensureWorkspaceHistory(p.id);closeModal();render();
  };
}
function makeNewProject(title,genre,idea){
    const p=seedProject();p.id=uid();p.title=title;p.genre=genre;p.status="Idee";p.dna={subgenre:"",perspective:"Personale dritte Person",perspectiveCustom:"",tense:"Präteritum",tenseCustom:"",pace:"Mittel",paceCustom:"",atmosphere:"",romance:"Mittel",romanceCustom:"",intimacy:"Mittel",intimacyCustom:"",humor:"Subtil",humorCustom:"",emotionality:"Mittel",emotionalityCustom:"",tension:"Mittel",tensionCustom:"",darkness:"Leicht düster",darknessCustom:"",violence:"Angedeutet",violenceCustom:"",dialogue:"Ausgewogen",dialogueCustom:"",philosophy:"Leicht",philosophyCustom:"",languages:["Deutsch"],languageNote:"",styleCustom:"",targetWords:100000,readerFeelings:"",premise:idea};p.originalIdea=idea;p.briefing={raw:idea,analysis:null,summary:"",lastAnalyzed:""};p.ideaVault=[];p.editorial={lastMode:"",lastScope:"chapter",lastResult:"",proofread:null};p.protectedPassages=[];p.characters=[];p.relationships=[];p.chapters=[];p.ideas=[{id:uid(),role:"ai",text:"Dein Projekt ist angelegt. Gib dein Briefing ein und nutze danach im Buchstudio „Buch entwickeln“. Echte Kapitel entstehen erst aus dem dramaturgischen Gesamtplan.",ts:now()}];
    return p;
}
function cloneSeriesSeed(source,{title,genre,idea,seriesId,seriesOrder}){
  const p=seedProject();p.id=uid();p.title=title||`Band ${seriesOrder}`;p.genre=genre||source?.genre||"Roman";p.status="Idee";
  if(source){
    p.dna=JSON.parse(JSON.stringify(source.dna||p.dna));p.dna.premise=idea||"";
    p.style=JSON.parse(JSON.stringify(source.style||p.style));p.ai=JSON.parse(JSON.stringify(source.ai||p.ai));p.tts=JSON.parse(JSON.stringify(source.tts||p.tts));
    p.characters=(source.characters||[]).map(c=>({...JSON.parse(JSON.stringify(c)),id:uid()}));
    p.relationships=(source.relationships||[]).map(r=>({...JSON.parse(JSON.stringify(r)),id:uid()}));
  }else p.dna.premise=idea||"";
  p.seriesId=seriesId;p.seriesOrder=seriesOrder;p.seriesLabel=`Band ${seriesOrder}`;
  p.originalIdea=idea||"";p.briefing={raw:idea||"",analysis:null,summary:"",lastAnalyzed:""};p.ideaVault=[];p.editorial={lastMode:"",lastScope:"chapter",lastResult:"",proofread:null};p.protectedPassages=[];p.chapters=[];p.bookPlan=null;p.bookDevelopmentJob=null;p.bookMemory={facts:[],openThreads:[],characterStates:[],relationshipStates:[],lastChapterNumber:0,lastUpdated:""};
  p.ideas=[{id:uid(),role:"ai",text:`${p.seriesLabel} der Buchreihe ist angelegt. Gib nur das Briefing für diesen Band ein. Gemeinsame Reihenregeln und frühere Bände werden automatisch als Kontext berücksichtigt.`,ts:now()}];
  return ensureProjectShape(p);
}
function openCreateSeries(existingProject=null){
  const p=existingProject?(seriesBandRoot(existingProject)||existingProject):null;
  modal(`<h2>${p?"Dieses Buch als Reihe organisieren":"Neue Buchreihe"}</h2>
    <div class="field"><label>Reihentitel</label><input class="input" id="seriesTitle" value="${esc(p?.title||"")}" placeholder="Zum Beispiel: Vaelora"></div>
    <div class="field" style="margin-top:10px"><label>Titel von Band 1</label><input class="input" id="seriesBookTitle" value="${esc(p?.title||"")}" placeholder="Zum Beispiel: Wenn die Nacht uns wiederfindet"></div>
    ${p?"":`<div class="field" style="margin-top:10px"><label>Genre</label><input class="input" id="seriesGenre" placeholder="Zum Beispiel: Fantasy"></div><div class="field" style="margin-top:10px"><label>Briefing nur für Band 1</label><textarea id="seriesBookIdea" rows="6" placeholder="Nur Inhalt und Bogen des ersten Bandes …"></textarea></div>`}
    <div class="field" style="margin-top:10px"><label>Gemeinsame Reihenbibel</label><textarea id="seriesBible" rows="7" placeholder="Nur Wissen, das für ALLE Bände gilt: Weltregeln, feste Figurenidentitäten, übergreifende Geheimnisse, Stil und unveränderlicher Canon. Kein komplettes Band-Briefing hier hineinpacken."></textarea><div class="small muted">Jeder Band bekommt anschließend sein eigenes Briefing und seine eigenen Kapitel.</div></div>
    <div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="createSeriesNow">${p?"Als Band 1 übernehmen":"Reihe anlegen"}</button></div>`);
  $("#createSeriesNow").onclick=()=>{
    const title=$("#seriesTitle").value.trim()||p?.title||"Neue Buchreihe",bookTitle=$("#seriesBookTitle").value.trim()||p?.title||"Band 1",sharedBible=$("#seriesBible").value.trim();
    const sr=ensureSeriesShape({id:uid(),title,sharedBible,bookIds:[],createdAt:now(),updatedAt:now()});state.series ||= [];state.series.push(sr);
    let book=p;
    if(book){book.title=bookTitle;book.seriesId=sr.id;book.seriesOrder=1;book.seriesLabel="Band 1";book.updatedAt=now();const eg=editionGroupForProject(book);if(eg){eg.title=bookTitle;for(const e of editionBooks(eg)){e.title=bookTitle;e.seriesId=sr.id;e.seriesOrder=1;e.seriesLabel="Band 1";}}}
    else{
      const genre=$("#seriesGenre").value.trim()||"Roman",idea=$("#seriesBookIdea").value.trim();book=cloneSeriesSeed(null,{title:bookTitle,genre,idea,seriesId:sr.id,seriesOrder:1});state.projects.unshift(book);
    }
    sr.bookIds=[book.id];sr.updatedAt=now();normalizeEditionGroups();state.activeProjectId=book.id;state.activeTab="studio";state.activeChapterId=preferredChapterId(book);store.save();ensureWorkspaceHistory(book.id);closeModal();render();toast(`Buchreihe „${title}“ angelegt.`);
  };
}
function openAddSeriesBook(seriesId){
  const s=seriesById(seriesId);if(!s)return toast("Buchreihe nicht gefunden.");const books=seriesBooks(s),source=books[books.length-1]||project(),order=books.length+1;
  modal(`<h2>${esc(s.title)} · Band ${order}</h2><div class="field"><label>Buchtitel</label><input class="input" id="seriesNewBookTitle" placeholder="Titel von Band ${order}"></div><div class="field" style="margin-top:10px"><label>Briefing nur für diesen Band</label><textarea id="seriesNewBookBriefing" rows="8" placeholder="Was passiert in diesem Band? Anfang, Konflikt, Entwicklung, Ende …"></textarea><div class="small muted">Die gemeinsame Reihenbibel sowie der Canon der vorherigen Bände werden automatisch mitgegeben.</div></div><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="createSeriesBookNow">Band ${order} anlegen</button></div>`);
  $("#createSeriesBookNow").onclick=()=>{
    const title=$("#seriesNewBookTitle").value.trim()||`Band ${order}`,idea=$("#seriesNewBookBriefing").value.trim();
    const book=cloneSeriesSeed(source,{title,genre:source?.genre||"Roman",idea,seriesId:s.id,seriesOrder:order});state.projects.unshift(book);s.bookIds ||= [];s.bookIds.push(book.id);s.updatedAt=now();store.save();closeModal();openProjectFromLibrary(book.id);toast(`${book.seriesLabel} angelegt.`);
  };
}
function openSeriesBible(seriesId){
  const s=seriesById(seriesId);if(!s)return;
  modal(`<h2>Reihenbibel</h2><div class="field"><label>Reihentitel</label><input class="input" id="editSeriesTitle" value="${esc(s.title)}"></div><div class="field" style="margin-top:10px"><label>Gemeinsames Wissen für alle Bände</label><textarea id="editSeriesBible" rows="13">${esc(s.sharedBible||"")}</textarea><div class="small muted">Hier nur bandübergreifenden Canon festhalten. Die Handlung jedes Bandes bleibt in seinem eigenen Briefing.</div></div><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="saveSeriesBible">Speichern</button></div>`);
  $("#saveSeriesBible").onclick=()=>{s.title=$("#editSeriesTitle").value.trim()||s.title;s.sharedBible=$("#editSeriesBible").value;s.updatedAt=now();store.save();closeModal();render();toast("Reihenbibel gespeichert.");};
}
function detachCurrentBookFromSeries(){
  const p=project(),s=seriesForProject(p);if(!p||!s)return;const root=seriesBandRoot(p)||p,g=editionGroupForProject(root),all=g?editionBooks(g):[root];
  modal(`<h2>Band aus Reihe lösen?</h2><p>„${esc(root.title)}“ bleibt vollständig erhalten und wird wieder als eigenständiges Buch angezeigt.${all.length>1?` <strong>Alle ${all.length} Fassungen dieses Bandes bleiben zusammen und werden gemeinsam aus der Reihe gelöst.</strong>`:""}</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="danger-btn" id="detachSeriesBookNow">Aus Reihe lösen</button></div>`);
  $("#detachSeriesBookNow").onclick=()=>{s.bookIds=(s.bookIds||[]).filter(id=>id!==root.id);for(const x of all){x.seriesId="";x.seriesOrder=0;x.seriesLabel="";}s.updatedAt=now();if(!seriesBooks(s).length)state.series=state.series.filter(x=>x.id!==s.id);else seriesBooks(s).forEach((b,i)=>{b.seriesOrder=i+1;b.seriesLabel=`Band ${i+1}`;const eg=editionGroupForProject(b);if(eg)for(const e of editionBooks(eg)){e.seriesOrder=b.seriesOrder;e.seriesLabel=b.seriesLabel;}});store.save();closeModal();render();toast("Band mit allen Fassungen aus der Reihe gelöst.");};
}
// Brotkrumen im Schreibbereich: „Vaelora › Band 2 › “ (nur bei Buchreihen).
function seriesCrumb(p){const s=seriesForProject(p);return s?`<span class="series-crumb">${esc(s.title)} › ${esc(p.seriesLabel||"Band")} › </span>`:"";}
function seriesStudioPanel(p){
  const s=seriesForProject(p);
  if(!s)return `<section class="card series-organizer"><div><span class="studio-kicker">BUCHREIHE / MEHRTEILER</span><strong>Gehört dieses Buch zu mehreren Bänden?</strong><div class="small muted">Ordne mehrere Bücher unter einer gemeinsamen Reihe. Jeder Band behält sein eigenes Briefing und seine eigenen Kapitel.</div></div><button class="soft-btn" id="convertToSeries">Als Band 1 organisieren</button></section>`;
  const root=seriesBandRoot(p)||p,books=seriesBooks(s),idx=books.findIndex(x=>x.id===root.id),eg=editionGroupForProject(p),slot=eg?editionSlotNumber(p,1):1;
  const missing=slot>1?books.slice(0,Math.max(0,idx)).filter(b=>{const bg=editionGroupForProject(b);return !bg||!editionSlots(bg).some(x=>x.order===slot&&x.project);}).map(b=>b.seriesLabel||b.title):[];
  return `<section class="card series-shelf"><div class="series-shelf-head"><div><span class="studio-kicker">BUCHREIHE</span><h3>${esc(s.title)}</h3><div class="small muted">Gemeinsamer Canon, getrennte Briefings und Kapitel pro Band. Fassungen bleiben zusätzlich pro Band getrennt.</div></div><div class="series-shelf-actions"><button class="ghost-btn" id="editSeriesBible">Reihenbibel</button><button class="soft-btn" id="addSeriesBook">＋ Band hinzufügen</button></div></div><div class="series-volume-tabs">${books.map((b,i)=>`<button class="series-volume ${b.id===root.id?"active":""}" data-series-switch="${b.id}"><span>${esc(b.seriesLabel||`Band ${i+1}`)}</span><strong>${esc(b.title)}</strong><em>${(b.chapters||[]).length} Kapitel</em></button>`).join("")}</div><div class="series-current-note"><span>Aktiv:</span> <strong>${esc(root.seriesLabel||`Band ${idx+1}`)} · ${esc(root.title)}${eg?` · ${esc(editionLabel(p))}`:""}</strong><button class="ghost-btn" id="detachSeriesBook">Aus Reihe lösen</button></div>${missing.length?`<div class="series-edition-warning"><strong>Keine Vermischung:</strong> Für ${esc(editionLabel(p))} fehlt dieselbe Fassung in ${esc(missing.join(", "))}. Litterum verwendet dort bewusst nicht das Original als Ersatz-Canon.</div>`:""}</section>`;
}

function openCharacter(id){
  const p=project(),c=p.characters.find(x=>x.id===id)||{id:uid(),name:"",age:"",role:"",appearance:"",personality:"",voice:"",thought:""};
  const oldName=String(c.name||"").trim();
  modal(`<h2>${id?"Figur bearbeiten":"Neue Figur"}</h2><div class="form-grid">
  ${mf("cName","Name",c.name)}${mf("cAge","Alter",c.age)}${mf("cRole","Rolle",c.role)}${mf("cAppearance","Aussehen",c.appearance,true,true)}
  ${mf("cPersonality","Persönlichkeit",c.personality,true,true)}${mf("cVoice","Sprache / Stimme",c.voice,true,true)}${mf("cThought","Wie denkt diese Figur?",c.thought,true,true)}
  </div><div class="modal-actions">${id?`<button class="danger-btn" id="deleteChar">Löschen</button>`:""}<button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="saveChar">Speichern</button></div>`);
  $("#saveChar").onclick=()=>{
    const name=$("#cName").value.trim();
    if(!name)return toast("Bitte einen Namen für die Figur eingeben.");
    Object.assign(c,{name,age:$("#cAge").value,role:$("#cRole").value,appearance:$("#cAppearance").value,personality:$("#cPersonality").value,voice:$("#cVoice").value,thought:$("#cThought").value});
    if(id&&oldName&&oldName!==name){for(const r of p.relationships||[]){if(r.a===oldName)r.a=name;if(r.b===oldName)r.b=name;}}
    if(!id)p.characters.push(c);save("Figur gespeichert");closeModal();render();
  };
  $("#deleteChar")?.addEventListener("click",()=>{
    const name=String(c.name||"").trim();
    p.characters=p.characters.filter(x=>x.id!==id);
    p.relationships=(p.relationships||[]).filter(r=>r.a!==name&&r.b!==name);
    save("Figur und zugehörige Beziehungen gelöscht");closeModal();render();
  });
}
function openRelationship(id){
  const p=project(),r=p.relationships.find(x=>x.id===id)||{id:uid(),a:"",b:"",note:"",metrics:{Vertrauen:50,Nähe:30,Misstrauen:20,Abhängigkeit:10,Begehren:20,Konflikt:20}};
  modal(`<h2>${id?"Beziehung bearbeiten":"Neue Beziehung"}</h2><div class="form-grid">${mf("rA","Figur A",r.a)}${mf("rB","Figur B",r.b)}${mf("rNote","Aktueller Stand",r.note,true,true)}
  ${Object.entries(r.metrics).map(([k,v],i)=>`<div class="field"><label>${esc(k)}: <span id="v-${i}">${Number(v)||0}</span>%</label><input type="range" min="0" max="100" value="${Number(v)||0}" id="m-${i}"></div>`).join("")}</div>
  <div class="modal-actions">${id?`<button class="danger-btn" id="deleteRel">Löschen</button>`:""}<button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="saveRel">Speichern</button></div>`);
  Object.keys(r.metrics).forEach((k,i)=>{$(`#m-${i}`).oninput=e=>$(`#v-${i}`).textContent=e.target.value});
  $("#saveRel").onclick=()=>{const rawA=$("#rA").value.trim(),rawB=$("#rB").value.trim();if(!rawA||!rawB)return toast("Bitte beide Figuren der Beziehung eingeben.");const a=resolveCharacterName(p,rawA),b=resolveCharacterName(p,rawB);if(normalizePersonName(a)===normalizePersonName(b))return toast("Eine Beziehung braucht zwei verschiedene Figuren.");r.a=a;r.b=b;r.note=$("#rNote").value;Object.keys(r.metrics).forEach((k,i)=>r.metrics[k]=+($(`#m-${i}`).value));if(!id)p.relationships.push(r);dedupeCharactersAndRelationships(p);save("Beziehung gespeichert");closeModal();render();};
  $("#deleteRel")?.addEventListener("click",()=>{p.relationships=p.relationships.filter(x=>x.id!==id);save("Beziehung gelöscht");closeModal();render();});
}
function mf(id,label,val,wide=false,area=false){return `<div class="field ${wide?"wide":""}"><label>${label}</label>${area?`<textarea id="${id}" rows="4">${esc(val||"")}</textarea>`:`<input class="input" id="${id}" value="${esc(val||"")}">`}</div>`}
// Immer nur EIN Fenster gleichzeitig: Vorher blieb z. B. die Rückfrage „Version 2 anlegen?“ nach dem
// Bestätigen stehen (zwei Fenster mit derselben Kennung) – ein zweiter Tipp legte dann eine doppelte Fassung an.
let studioProcessMonitorTimer=null;
let studioProcessMonitorMode="";
let studioProcessMonitorExpanded=false;
let studioProcessMonitorFilter="open";
function modal(inner,size=""){closeModal();document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop" id="modalBackdrop"><div class="card modal ${size==="wide"?"modal-wide":""}"><button type="button" class="modal-x" data-close aria-label="Schließen" title="Schließen">✕</button>${inner}</div></div>`);$$('[data-close]').forEach(b=>b.onclick=closeModal);$("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal();});requestAnimationFrame(()=>enhanceSpeechFields($("#modalBackdrop")));}
function closeModal(){if(studioProcessMonitorTimer){clearInterval(studioProcessMonitorTimer);studioProcessMonitorTimer=null;}studioProcessMonitorMode="";const mb=$("#modalBackdrop");if(mb&&dictState.target&&mb.contains(dictState.target))stopDictation(true);mb?.remove();}
function openAboutLitterum(){
  modal(`<h2>Über Litterum</h2><div class="about-iskra-card"><div><span>Aktuelle Version</span><strong>V${esc(FABULA_VERSION)}</strong></div><div><span>Versionsdatum</span><strong>${esc(ISKRA_RELEASE_DATE)}</strong></div></div><p>Litterum ist dein privates Buchstudio für Planung, Schreiben, Prüfung, Überarbeitung, Buchfassungen und Übersetzungen.</p><div class="card" style="padding:13px;margin-top:12px"><strong>Aktueller Stand</strong><div class="small muted" style="margin-top:5px">Buchfassungen sind vollständig getrennte Bücher im Speicher. In Buchreihen werden Original, Version 2, Version 3 und Final zusätzlich strikt unter ihrem jeweiligen Band geführt. Gleiche Fassungen verschiedener Bände teilen ihren Canon nur mit derselben Fassungsstufe, damit Original und Alternativfassungen nicht vermischt werden.</div></div><div class="modal-actions"><button class="primary-btn" data-close>Schließen</button></div>`);
}
function openMoreTabs(){
  const installLabel=iskraRunsStandalone()?"Als App installiert":"Litterum als App installieren";
  const group=(title,subtitle,ids)=>`<section class="more-group"><div class="more-group-head"><strong>${title}</strong><span>${subtitle}</span></div><div class="more-tab-grid">${ids.map(id=>{const n=navItem(id);return `<button class="more-tab-btn" data-more-tab="${id}"><span>${n[2]}</span><strong>${n[1]}</strong></button>`}).join("")}</div></section>`;
  modal(`<div class="more-hub-head"><span class="ux-eyebrow">LITTERUM</span><h2>Werkzeuge</h2><p class="small muted">Alles, was nicht täglich im Schreibfluss gebraucht wird, ist hier nach Aufgabe sortiert.</p></div>
    ${group("Buch entwickeln","Inhalt, Figuren und Stil",["briefing","dna","characters","relationships","style","ideas"])}
    ${group("Qualität","Prüfen, lektorieren und absichern",["review","editorial"])}
    ${group("Veröffentlichen","Cover und fertige Dateien",["cover","export"])}
    ${group("Archiv & Sicherheit","Gespeicherte Inhalte und Schutz",["vault"])}
    <section class="more-group"><div class="more-group-head"><strong>App</strong><span>Darstellung und Installation</span></div><div class="more-tab-grid"><button class="more-tab-btn" id="openThemeSettings"><span>🎨</span><strong>Darstellung</strong></button><button class="more-tab-btn" id="installLitterumApp"><span>⬇</span><strong>${installLabel}</strong></button><button class="more-tab-btn" id="openAboutLitterum"><span>ⓘ</span><strong>Über Litterum</strong></button></div></section>
    <div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button></div>`);
  $("#openThemeSettings")?.addEventListener("click",()=>{closeModal();openThemeSettings();});
  $("#installLitterumApp")?.addEventListener("click",()=>{closeModal();installLitterumApp();});
  $("#openAboutLitterum")?.addEventListener("click",()=>{closeModal();openAboutLitterum();});
  $$("[data-more-tab]").forEach(b=>b.onclick=()=>{state.activeTab=b.dataset.moreTab;store.save({sync:false});closeModal();render();});
}

function confirmDeleteChapter(id){
  const p=project(),c=(p.chapters||[]).find(x=>x.id===id);
  if(!c)return;
  const words=countWords(c.content||"");
  const isReference=p.style?.referenceChapterId===id;
  const protectedCount=(p.protectedPassages||[]).filter(x=>x.chapterId===id).length;
  modal(`<h2>Kapitel ${c.number} löschen?</h2>
    <p><strong>${esc(c.title||`Kapitel ${c.number}`)}</strong> wird vollständig aus diesem Buch entfernt.</p>
    <div class="card danger-note" style="padding:14px;margin:12px 0">
      <div class="small" style="line-height:1.7">
        Manuskript: <strong>${words.toLocaleString("de-DE")} Wörter</strong><br>
        Kapitelplan und Kapitelgedächtnis werden gelöscht.
        ${protectedCount?`<br>${protectedCount} geschützte Passage${protectedCount===1?"":"n"} aus diesem Kapitel ${protectedCount===1?"wird":"werden"} ebenfalls entfernt.`:""}
        ${isReference?`<br><strong>Dieses Kapitel ist deine Stilreferenz.</strong> Die Stilreferenz wird deshalb ebenfalls gelöst.`:""}
      </div>
    </div>
    <p class="small muted">Die übrigen Kapitel werden danach automatisch neu nummeriert. Das Kapitel kommt in den Papierkorb und lässt sich 30 Tage lang zurückholen.</p>
    <div class="modal-actions">
      <button class="ghost-btn" data-close>Abbrechen</button>
      <button class="danger-btn" id="deleteChapterFinal">Kapitel endgültig löschen</button>
    </div>`);
  $("#deleteChapterFinal").onclick=()=>deleteChapterCompletely(id);
}
function deleteChapterCompletely(id){
  const p=project(),chapters=p.chapters||[],index=chapters.findIndex(x=>x.id===id);
  if(index<0)return;
  const deleted=chapters[index];
  const trashId=trashAdd({kind:"chapter",label:`Kapitel ${deleted.number}: ${deleted.title||""}`,where:p.title,projectId:p.id,index,chapter:cloneDeep(deleted)});
  const busyWrite=jobRunningHere("write",p.id,id),busyPlan=jobRunningHere("plan",p.id,id);
  if(busyWrite||busyPlan||(p.bookWriter?.running&&p.bookWriter.currentChapterId===id)){closeModal();return toast("Dieses Kapitel wird gerade von der KI bearbeitet. Bitte warte, bis der Schritt fertig ist.");}
  setJob(p,"write",id,null);setJob(p,"plan",id,null);
  for(const part of p.partWorkflow?.parts||[])if(Array.isArray(part.chapterIds))part.chapterIds=part.chapterIds.filter(x=>x!==id);

  if(state.activeChapterId===id)stopSpeech(true);

  // Kapitelbezogene Daten entfernen
  p.protectedPassages=(p.protectedPassages||[]).filter(x=>x.chapterId!==id);
  if(p.style?.referenceChapterId===id){
    p.style.referenceChapterId=null;
    p.style.referenceText="";
  }
  if(p.editorial?.proofread?.chapterId===id)p.editorial.proofread=null;

  p.chapters=chapters.filter(x=>x.id!==id);

  // Kapitelnummern und rein automatische Titel sauber nachziehen
  p.chapters.forEach((ch,i)=>{
    const oldNumber=Number(ch.number)||i+1;
    const newNumber=i+1;
    if(new RegExp(`^Kapitel\\s+${oldNumber}$`,"i").test(String(ch.title||"").trim())){
      ch.title=`Kapitel ${newNumber}`;
    }
    ch.number=newNumber;
  });

  // Geschützte Passagen bekommen die neue Nummer ihres Kapitels
  for(const pp of p.protectedPassages||[]){
    const owner=p.chapters.find(ch=>ch.id===pp.chapterId);
    if(owner)pp.chapterNumber=owner.number;
  }

  // Gesammelte Ideen mit Kapitelnummern soweit möglich nachziehen
  const deletedNumber=Number(deleted.number)||index+1;
  for(const item of p.ideaVault||[]){
    const cl=item.classification;
    if(!cl)continue;
    const n=Number(cl.chapterNumber);
    if(Number.isFinite(n)){
      if(n===deletedNumber){
        cl.chapterNumber=null;
        item.target=item.target||"";
        if(/^Kapitel\s+\d+$/i.test(item.target.trim()))item.target="Noch keinem Kapitel zugeordnet";
      }else if(n>deletedNumber){
        cl.chapterNumber=n-1;
        if(/^Kapitel\s+\d+$/i.test((item.target||"").trim()))item.target=`Kapitel ${n-1}`;
      }
    }
  }

  // Nächstes bzw. vorheriges Kapitel aktivieren
  const next=p.chapters[Math.min(index,p.chapters.length-1)]||null;
  state.activeChapterId=next?.id||null;

  store.save();
  closeModal();
  setTimeout(()=>undoBar(`Kapitel ${deleted.number} gelöscht.`,trashId),50);
  render();
  toast(`Kapitel ${deletedNumber} gelöscht`);
}

// ---------- Papierkorb & Rückgängig ----------
// Alles Gelöschte (Bücher, Kapitel, Fassungen, Kapiteltexte) landet 30 Tage im Papierkorb und lässt sich
// mit einem Tipp zurückholen. Direkt nach dem Löschen erscheint zusätzlich unten „↶ Rückgängig“.
function trashList(){if(!Array.isArray(state.trash))state.trash=[];const cut=Date.now()-30*864e5;state.trash=state.trash.filter(t=>Date.parse(t.at||"")>cut);return state.trash;}
function cloneDeep(v){try{return JSON.parse(JSON.stringify(v));}catch{return null;}}
function trashAdd(entry){const list=trashList();entry.id=uid();entry.at=now();list.unshift(entry);
  // Platz sparen: höchstens 40 Einträge, davon höchstens 5 ganze Bücher
  let books=0;state.trash=list.filter(t=>t.kind!=="book"||++books<=5).slice(0,40);return entry.id;}
function undoBar(text,trashId){
  document.getElementById("undoBar")?.remove();
  document.body.insertAdjacentHTML("beforeend",`<div id="undoBar" class="undo-bar"><span>${esc(text)}</span><button type="button" id="undoBtn">↶ Rückgängig</button></div>`);
  const bar=$("#undoBar");$("#undoBtn").onclick=()=>{bar.remove();restoreFromTrash(trashId);};
  setTimeout(()=>bar?.remove(),12000);
}
function restoreFromTrash(id){
  const list=trashList(),t=list.find(x=>x.id===id);if(!t)return toast("Dieser Eintrag ist nicht mehr im Papierkorb.");
  if(t.kind==="book"){
    if(projectById(t.project.id))t.project.id=uid();
    state.projects.push(t.project);
    if(t.seriesId){const sr=seriesById(t.seriesId);if(sr){sr.bookIds=sr.bookIds||[];const at=Math.min(Math.max(0,t.seriesPos||0),sr.bookIds.length);sr.bookIds.splice(at,0,t.project.id);seriesBooks(sr).forEach((b,i)=>{b.seriesOrder=i+1;b.seriesLabel=`Band ${i+1}`;});}else if(t.series){t.series.bookIds=[t.project.id];state.series.push(t.series);}}
    if(t.editionGroup){let eg=editionGroupById(t.editionGroup.id);if(!eg){eg=cloneDeep(t.editionGroup);eg.bookIds=[];state.editionGroups ||= [];state.editionGroups.push(eg);}const at=Math.min(Math.max(0,t.editionPos||0),eg.bookIds.length);eg.bookIds.splice(at,0,t.project.id);t.project.editionGroupId=eg.id;}
    normalizeEditionGroups();
  }else if(t.kind==="chapter"){
    const p=projectById(t.projectId);if(!p)return toast("Das Buch dieses Kapitels gibt es nicht mehr.");
    const at=Math.min(Math.max(0,t.index||0),p.chapters.length);p.chapters.splice(at,0,t.chapter);
    p.chapters.forEach((ch,i)=>{const old=Number(ch.number)||i+1;if(ch!==t.chapter&&new RegExp(`^Kapitel\\s+${old}$`,"i").test(String(ch.title||"").trim()))ch.title=`Kapitel ${i+1}`;ch.number=i+1;});
    p.updatedAt=now();state.activeChapterId=t.chapter.id;
  }else if(t.kind==="edition"){
    let q=cloneDeep(t.project);if(!q)return toast("Diese Buchfassung konnte nicht gelesen werden.");if(projectById(q.id))q.id=uid();state.projects.push(q);
    let g=t.editionGroup?cloneDeep(t.editionGroup):null;if(g){let live=editionGroupById(g.id);if(!live){g.bookIds=[];state.editionGroups ||= [];state.editionGroups.push(g);live=g;}live.bookIds ||= [];const at=Math.min(Math.max(0,t.editionPos||live.bookIds.length),live.bookIds.length);live.bookIds.splice(at,0,q.id);q.editionGroupId=live.id;live.updatedAt=now();}
    normalizeEditionGroups();state.activeProjectId=q.id;state.activeChapterId=preferredChapterId(q);state.activeTab="studio";
  }else if(t.kind==="variant"){
    restoreLegacyVariantAsEdition(t);
  }else if(t.kind==="text"){
    const p=projectById(t.projectId),c=p?.chapters.find(x=>x.id===t.chapterId);if(!c)return toast("Das Kapitel gibt es nicht mehr.");
    pushVersion(c,"vor dem Zurückholen");c.content=t.content;c.writeIncomplete=!!t.writeIncomplete;c.status=t.content.trim()?"Entwurf":"Planung";p.updatedAt=now();
  }
  state.trash=list.filter(x=>x.id!==id);store.save();render();toast(`„${t.label}“ wurde zurückgeholt.`);
}
function openTrash(){
  const list=trashList();
  const kind={book:"📚 Buch",chapter:"▤ Kapitel",edition:"◆ Buchfassung",variant:"◆ alte Fassung",text:"✎ Kapiteltext"};
  modal(`<h2>Papierkorb</h2><p class="small muted">Gelöschtes bleibt hier 30 Tage und lässt sich jederzeit zurückholen.</p>
    ${list.length?`<div class="trash-list">${list.map(t=>`<div class="trash-row"><div><b>${kind[t.kind]||t.kind}</b><strong>${esc(t.label)}</strong><small>${esc(t.where||"")} · gelöscht ${new Date(t.at).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</small></div><button type="button" class="soft-btn" data-trash-restore="${t.id}">↶ Zurückholen</button></div>`).join("")}</div>
    <div style="margin-top:12px"><button type="button" class="ghost-btn variant-del" id="emptyTrash">Papierkorb leeren</button></div>`:`<div class="bk-empty">Der Papierkorb ist leer.</div>`}
    <div class="modal-actions"><button class="primary-btn" data-close>Schließen</button></div>`);
  $$("[data-trash-restore]").forEach(b=>b.onclick=()=>{closeModal();restoreFromTrash(b.dataset.trashRestore);});
  $("#emptyTrash")?.addEventListener("click",()=>{modal(`<h2>Papierkorb leeren?</h2><p>Alle ${list.length} Einträge werden endgültig gelöscht.</p><div class="modal-actions"><button class="ghost-btn" id="trashBack">Abbrechen</button><button class="danger-btn" id="trashEmptyNow">Endgültig leeren</button></div>`);$("#trashBack").onclick=openTrash;$("#trashEmptyNow").onclick=()=>{state.trash=[];store.save();closeModal();toast("Papierkorb geleert.");};});
}
// Neues leeres Kapitel direkt NACH einem bestimmten Kapitel einfügen – die Nummern ordnen sich neu.
function insertChapterAfter(id){
  const p=project();if(!p)return;const idx=p.chapters.findIndex(x=>x.id===id);const c={id:uid(),number:0,title:"",plan:"",content:"",memory:"",status:"Planung",planExpanded:false};
  if(p.chapters[idx]?.partIndex!==undefined)c.partIndex=p.chapters[idx].partIndex;
  p.chapters.splice(idx+1,0,c);
  p.chapters.forEach((ch,i)=>{const old=Number(ch.number)||i+1;if(ch!==c&&new RegExp(`^Kapitel\\s+${old}$`,"i").test(String(ch.title||"").trim()))ch.title=`Kapitel ${i+1}`;ch.number=i+1;});
  c.title=`Kapitel ${c.number}`;
  for(const part of p.partWorkflow?.parts||[])if(Array.isArray(part.chapterIds)&&part.chapterIds.includes(id)){const k=part.chapterIds.indexOf(id);part.chapterIds.splice(k+1,0,c.id);}
  rememberChapter(p,c.id,"plan");state.activeTab="chapters";p.updatedAt=now();store.save();closeModal();render();toast(`Neues Kapitel ${c.number} eingefügt. Gib ihm einen Titel und einen kurzen Plan.`,5000);
}
function clearChapterText(id){
  const p=project(),c=p?.chapters.find(x=>x.id===id);if(!c||!String(c.content||"").trim())return;
  modal(`<h2>Text von Kapitel ${c.number} löschen?</h2><p>Der Kapitelplan bleibt erhalten, nur der Manuskripttext (${countWords(c.content).toLocaleString("de-DE")} Wörter) wird entfernt. Du kannst ihn danach neu schreiben lassen. Der alte Text liegt im Papierkorb und unter „Rückgängig“.</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="danger-btn" id="clearTextNow">Text löschen</button></div>`);
  $("#clearTextNow").onclick=()=>{const tid=trashAdd({kind:"text",label:`Kapitel ${c.number}: ${c.title||""}`,where:p.title,projectId:p.id,chapterId:c.id,content:c.content,writeIncomplete:!!c.writeIncomplete});pushVersion(c,"vor dem Löschen des Textes");c.content="";c.writeIncomplete=false;c.status="Planung";p.updatedAt=now();store.save();closeModal();render();undoBar(`Text von Kapitel ${c.number} gelöscht.`,tid);};
}
function addChapter(){
  const p=project(),n=p.chapters.length+1,c={id:uid(),number:n,title:`Kapitel ${n}`,plan:"",content:"",memory:"",status:"Planung",planExpanded:false};p.chapters.push(c);rememberChapter(p,c.id,"plan");save("Kapitel angelegt");render();
}
function setReference(){
  const c=chapter();if(!c?.content.trim())return toast("Das Kapitel enthält noch keinen Text.");
  project().style.referenceText=c.content;project().style.referenceChapterId=c.id;save("Stilreferenz eingefroren");state.activeTab="style";render();
}
// Lange Eingaben niemals ungeprüft als eine Stilregel speichern.
function styleRuleKey(text){return String(text||"").toLocaleLowerCase("de").normalize("NFKC").replace(/^[\s•*#\d.):+-]+/g,"").replace(/[.,;:!?]+$/g,"").replace(/\s+/g," ").trim();}
function simpleStyleKind(text,fallback="positive"){
  const t=String(text||"").trim().replace(/^[\d.)\s•*+-]+/,"");
  return /^(?:keine?n?\b|niemals\b|nicht\b|vermeide\b|verhindere\b|unterlasse\b|verbotene?\b|ohne\b|no\b)/i.test(t)?"negative":fallback;
}
function needsStyleReview(text){const t=String(text||"").trim();return t.length>280||t.split(/\n/).filter(x=>x.trim()).length>2||(/\b(?:keine?|niemals|vermeide|verboten)\b/i.test(t)&&/\b(?:schreibe|erzähle|gestalte|verwende)\b/i.test(t));}
function findUnsortedStyleEntries(style){
  const items=[];
  for(const [kind,key] of [["positive","rules"],["negative","forbidden"]])for(const text of style?.[key]||[]){
    if(needsStyleReview(text)||(kind==="positive"&&simpleStyleKind(text)==="negative"))items.push({kind,text});
  }
  return items;
}
function splitStyleText(text,maxChars=6200){
  // An Absatz- und Satzgrenzen aufteilen; die KI bekommt immer zusammenhängende Passagen.
  const paragraphs=String(text||"").replace(/\r\n/g,"\n").split(/\n{2,}/).map(v=>v.trim()).filter(Boolean);
  const chunks=[];let current="";
  const flush=()=>{if(current.trim())chunks.push(current.trim());current="";};
  for(const para of paragraphs){
    const pieces=para.length>maxChars?(para.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/gs)||[para]):[para];
    for(let piece of pieces){
      piece=piece.trim();if(!piece)continue;
      while(piece.length>maxChars){flush();let n=piece.lastIndexOf(" ",maxChars);if(n<maxChars*.6)n=maxChars;chunks.push(piece.slice(0,n).trim());piece=piece.slice(n).trim();}
      if(!piece)continue;
      if(current&&(current.length+piece.length+2)>maxChars)flush();
      current+=(current?"\n\n":"")+piece;
    }
  }
  flush();return chunks;
}
function promptRule(type){openStyleImporter(type);}
function openStyleImporter(initialKind="rule",initialText="",context=null){
  const source=initialKind==="bad"?"negative":"positive";
  modal(`<h2>✦ Stilregeln aufbereiten</h2><p class="small muted">Füge eine einzelne Regel oder deinen gesamten Stiltext ein. Litterum erkennt positive und negative Anweisungen und zeigt das Ergebnis vor dem Speichern. Die KI-Analyse verwendet nach Möglichkeit DeepSeek, sonst dein eingestelltes Modell. Dabei können geringe API-Kosten entstehen.</p>
    <div class="field"><label>Stiltext</label><textarea id="styleImportRaw" rows="10" placeholder="Hier Stiltext oder Masterprompt einfügen …">${esc(initialText)}</textarea></div>
    <p class="small muted" id="styleImportStatus">Bis zu 70.000 Zeichen pro Durchgang. Bestehende Regeln werden nicht verändert.</p>
    <div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="analyzeStyleNow">Regeln erkennen</button></div>`,"wide");
  $("#analyzeStyleNow").onclick=()=>runStyleAnalysis(source,context);
}
async function runStyleAnalysis(source,context=null){
  const text=$("#styleImportRaw")?.value?.trim()||"";
  if(!text)return toast("Bitte erst Stiltext eingeben.");
  if(text.length>70000)return toast("Maximal 70.000 Zeichen pro Durchgang. Bitte den Text aufteilen.",5500);
  const p=project(),id=p?.id,btn=$("#analyzeStyleNow"),status=$("#styleImportStatus");
  if(!p)return;
  btn.disabled=true;
  try{
    let candidates=[],warnings=[];
    if(text.length<=250&&!needsStyleReview(text)){
      candidates=[{text,kind:simpleStyleKind(text,source)}];
    }else{
      const chunks=splitStyleText(text);
      for(let i=0;i<chunks.length;i++){
        if(status)status.textContent=`Analysiere Textteil ${i+1} von ${chunks.length} …`;
        const data=await apiData("analyze_style_rules",{styleText:chunks[i],sourceKind:source,existingPositive:p.style.rules.filter(x=>x.length<260).slice(0,65),existingNegative:p.style.forbidden.filter(x=>x.length<260).slice(0,65)},{projectOverride:p,lightProject:true,timeoutMs:120000});
        if(!Array.isArray(data?.rules))throw new Error("Die KI lieferte keine auswertbaren Stilregeln.");
        for(const rule of data.rules){const r=String(rule?.text||"").trim(),kind=rule?.kind==="negative"?"negative":rule?.kind==="positive"?"positive":null;if(r&&kind&&r.length<=450)candidates.push({text:r,kind});}
        warnings.push(...(Array.isArray(data.warnings)?data.warnings.filter(x=>typeof x==="string"):[]));
      }
    }
    if(project()?.id!==id)throw new Error("Das aktive Buch wurde gewechselt. Bitte Analyse erneut starten.");
    if(!candidates.length)throw new Error("Keine eindeutigen Stilregeln gefunden. Prüfe den Ausgangstext.");
    showStylePreview({candidates,sourceText:text,warnings,context});
  }catch(e){if(status)status.textContent=e.message||"Analyse fehlgeschlagen. Es wurde nichts geändert.";btn.disabled=false;toast("Stilanalyse: "+(e.message||"Fehler"),6500);}
}
function showStylePreview({candidates,sourceText,warnings=[],context=null}){
  const p=project(),known=new Map();
  for(const [kind,items] of [["positive",p.style.rules],["negative",p.style.forbidden]])for(const text of items){const key=styleRuleKey(text);if(!known.has(key))known.set(key,kind);}
  const dedup=new Set();let duplicated=0;
  const filtered=candidates.filter(x=>{const key=styleRuleKey(x.text);if(!key||dedup.has(key)){duplicated++;return false;}dedup.add(key);return true;});
  const rows=filtered.map((x,i)=>{
    const key=styleRuleKey(x.text),already=known.get(key);
    const duplicate=!!already,conflict=duplicate&&already!==x.kind;
    return `<div class="style-preview-rule ${x.kind==="negative"?"negative":"positive"}" data-style-index="${i}">
      <label class="style-preview-top"><input type="checkbox" class="style-review-check" data-i="${i}" ${duplicate?"":"checked"}><span>${duplicate?conflict?"Möglicher Widerspruch zur bestehenden Regel":"Bereits vorhanden":"Neue Einzelregel"}</span></label>
      <textarea class="style-review-text" data-i="${i}" rows="2" maxlength="450">${esc(x.text)}</textarea>
      <select class="input style-review-kind" data-i="${i}" aria-label="Einordnung"><option value="positive" ${x.kind==="positive"?"selected":""}>✓ Grün · Schreiben</option><option value="negative" ${x.kind==="negative"?"selected":""}>× Rot · Vermeiden</option></select>
    </div>`;
  }).join("");
  const allWarning=warnings.slice(0,8).map(x=>`<li>${esc(x.slice(0,240))}</li>`).join("");
  modal(`<h2>Stilregeln prüfen</h2><p class="small muted">${filtered.length} Regeln erkannt${duplicated?`, ${duplicated} Dopplungen entfernt`:""}. Kontrolliere die Zuordnung, bearbeite einzelne Regeln und bestätige erst dann. Doppelte bestehende Regeln sind abgewählt.</p>
    ${allWarning?`<details class="style-preview-warnings"><summary>Hinweise aus der Analyse (${warnings.length})</summary><ul>${allWarning}</ul></details>`:""}
    ${context?.mode==="legacy"?`<label class="style-replace-note"><input type="checkbox" id="replaceLongStyle" checked> Die ${context.entries.length} bisherigen Langtexte/Fehlzuordnungen durch meine Auswahl ersetzen. Die Originaltexte werden vor dem Ersetzen gesichert.</label>`:""}
    <div class="style-preview-list">${rows}</div>
    <details class="style-original"><summary>Eingefügten Originaltext ansehen</summary><textarea rows="7" readonly>${esc(sourceText)}</textarea></details>
    <div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="applyStylePreview">Ausgewählte Regeln speichern</button></div>`,"wide");
  $("#applyStylePreview").onclick=()=>{
    const live=project();if(!live||live.id!==p.id)return toast("Aktives Buch wurde gewechselt.");
    const chosen=[],seen=new Set();
    for(const check of $$(".style-review-check")){
      if(!check.checked)continue;const i=+check.dataset.i,edited=$( `.style-review-text[data-i="${i}"]` )?.value?.trim()||"",kind=$( `.style-review-kind[data-i="${i}"]` )?.value;
      if(!edited||edited.length>450)return toast("Regeln müssen zwischen 1 und 450 Zeichen lang sein.");
      const key=styleRuleKey(edited);if(!key||seen.has(key))continue;seen.add(key);
      chosen.push({text:edited,kind:kind==="negative"?"negative":"positive"});
    }
    if(!chosen.length)return toast("Bitte mindestens eine neue Regel auswählen.");
    const existing=new Set([...live.style.rules,...live.style.forbidden].map(styleRuleKey));
    if(context?.mode==="legacy"&&$("#replaceLongStyle")?.checked){
      for(const item of context.entries||[]){const arr=item.kind==="negative"?live.style.forbidden:live.style.rules;const at=arr.indexOf(item.text);if(at>=0)arr.splice(at,1);}
      // Beim Ersetzen langer Blöcke werden erneut die verbliebenen Kurzregeln geprüft.
      existing.clear();for(const r of [...live.style.rules,...live.style.forbidden])existing.add(styleRuleKey(r));
    }
    let added=0;
    for(const item of chosen){
      const key=styleRuleKey(item.text),dest=item.kind==="negative"?live.style.forbidden:live.style.rules,other=item.kind==="negative"?live.style.rules:live.style.forbidden;
      if(existing.has(key)){
        const idx=other.findIndex(x=>styleRuleKey(x)===key);
        if(idx>=0){other.splice(idx,1);if(!dest.some(x=>styleRuleKey(x)===key)){dest.push(item.text);added++;}}
        continue;
      }
      dest.push(item.text);existing.add(key);added++;
    }
    if(context?.mode==="pending"){
      const pending=live.style.pendingImports||[];for(const item of context.entries||[]){const at=pending.indexOf(item);if(at>=0)pending.splice(at,1);}
    }
    live.style.sources ||= [];
    live.style.sources.push({id:uid(),createdAt:now(),source:context?.mode||"Stilimport",raw:sourceText.slice(0,70000)});
    live.style.sources=live.style.sources.slice(-6);
    save(`${added} Stilregeln gespeichert.`);closeModal();render();
  };
}
function viewStyleSources(){
  const sources=project()?.style?.sources||[];
  modal(`<h2>Gesicherte Stil-Originaltexte</h2><p class="small muted">Die letzten sechs verwendeten Originaltexte bleiben zur Kontrolle erhalten. Hier kannst du sie erneut aufbereiten, ohne gespeicherte Regeln zu überschreiben.</p>${sources.slice().reverse().map((x,i)=>`<details class="style-original"><summary>${esc(x.source||"Stilimport")} · ${esc((x.createdAt||"").slice(0,10))} · ${String(x.raw||"").length} Zeichen</summary><textarea readonly rows="5">${esc(x.raw||"")}</textarea><button class="soft-btn" data-style-reimport="${sources.length-1-i}">Erneut analysieren</button></details>`).join("")}<div class="modal-actions"><button class="primary-btn" data-close>Schließen</button></div>`,"wide");
  $$('[data-style-reimport]').forEach(b=>b.onclick=()=>openStyleImporter("rule",sources[Number(b.dataset.styleReimport)]?.raw||""));
}
function reviewExistingStyle(){
  const entries=findUnsortedStyleEntries(project()?.style);if(!entries.length)return toast("Keine problematischen Stilblöcke gefunden.");
  openStyleImporter("rule",entries.map(x=>x.text).join("\n\n"),{mode:"legacy",entries});
}
function reviewPendingStyle(){
  const pending=project()?.style?.pendingImports||[];if(!pending.length)return toast("Keine unaufbereiteten Briefing-Regeln vorhanden.");
  openStyleImporter("rule",pending.map(x=>x.text).join("\n\n"),{mode:"pending",entries:[...pending]});
}

function chapterContextItem(c,withText=true){
  const item={number:c.number,title:c.title,partTitle:c.partTitle||""};
  if(!withText)return item;
  return {...item,perspective:c.perspective||"",location:c.location||"",sceneGoal:c.sceneGoal||"",emotionalMove:c.emotionalMove||"",newInformation:c.newInformation||"",withhold:c.withhold||"",relationshipMovement:c.relationshipMovement||"",consequence:c.consequence||"",bridge:c.bridge||"",plan:c.plan,memory:c.memory,contentTail:(c.content||"").slice(-4500)};
}
// Es wird nur der Kapitelkontext übertragen, den der Server der KI tatsächlich mitgibt:
// das Umfeld des aktuellen Kapitels (5 davor, 1 danach), sonst die letzten 7 Kapitel.
// Das spart bei großen Büchern pro Anfrage oft Hunderte Kilobyte Upload.
function nearbyChapters(p,chapterNumber){
  const all=p.chapters||[];
  if(chapterNumber!==undefined&&chapterNumber!==null&&chapterNumber!==""&&Number.isFinite(Number(chapterNumber))){
    const idx=all.findIndex(c=>Number(c.number)===Number(chapterNumber));
    if(idx>=0)return all.slice(Math.max(0,idx-5),Math.min(all.length,idx+2));
  }
  return all.slice(-7);
}
function projectContext(p,{chapterNumber=null,manuscript=false}={}){
  return {
    id:p.id, title:p.title, genre:p.genre, dna:p.dna, ai:p.ai,
    seriesContext:seriesContextForProject(p),
    briefing:{summary:p.briefing?.summary||""},
    bookPlan:p.bookPlan||null,
    bookMemory:p.bookMemory||{facts:[],openThreads:[],characterStates:[],relationshipStates:[],lastChapterNumber:0},
    ideaVault:(p.ideaVault||[]).filter(x=>x.status==="applied"||x.status==="approved").slice(-30),
    protectedPassages:(p.protectedPassages||[]).slice(-30),
    style:{rules:p.style?.rules||[],forbidden:p.style?.forbidden||[],referenceText:(p.style?.referenceText||"").slice(0,14000)},
    characters:p.characters||[],
    relationships:p.relationships||[],
    chapterCount:(p.chapters||[]).length,
    // Bei Prüfungen des ganzen Manuskripts steckt der Text bereits vollständig in der Anfrage.
    chapters:manuscript?(p.chapters||[]).map(c=>chapterContextItem(c,false)):nearbyChapters(p,chapterNumber).map(c=>chapterContextItem(c,true))
  };
}
function projectPlanningContext(p){
  return {
    id:p.id,title:p.title,genre:p.genre,dna:p.dna,ai:p.ai,seriesContext:seriesContextForProject(p),
    briefing:{summary:p.briefing?.summary||""},
    bookMemory:p.bookMemory||{facts:[],openThreads:[],characterStates:[],relationshipStates:[],lastChapterNumber:0},
    style:{rules:p.style?.rules||[],forbidden:p.style?.forbidden||[]},
    characters:p.characters||[],relationships:p.relationships||[],chapterCount:(p.chapters||[]).length,chapters:[]
  };
}
function projectTranslationContext(p){
  return {
    id:p.id,title:p.title,genre:p.genre,ai:p.ai,
    dna:{languages:p.dna?.languages||["Deutsch"],languageNote:p.dna?.languageNote||"",perspective:p.dna?.perspective||"",tense:p.dna?.tense||"",atmosphere:p.dna?.atmosphere||""},
    characters:(p.characters||[]).map(c=>({name:c.name,role:c.role,voice:c.voice||""})),
    style:{rules:(p.style?.rules||[]).slice(0,30),forbidden:(p.style?.forbidden||[]).slice(0,30)},
    chapterCount:(p.chapters||[]).length,chapters:[]
  };
}

// Für Band 2+ braucht die Plan-KI nur einen kompakten Übergabe-Canon aus den früheren Bänden.
// Der normale Reihen-Kontext kann mit einem fertigen Band sehr groß werden und den Start der
// Kapitelplan-Ausarbeitung unnötig verzögern. Manuskript und Buchprüfung behalten den vollen Kontext.
function compactPlanSeriesContext(p){
  const sc=seriesContextForProject(p);if(!sc)return null;
  const clip=(v,n)=>String(v||"").slice(0,n);
  return {
    seriesId:sc.seriesId,seriesTitle:sc.seriesTitle,currentVolume:sc.currentVolume,
    sharedBible:clip(sc.sharedBible,12000),
    previousVolumes:(sc.previousVolumes||[]).map(v=>({
      order:v.order,title:v.title,summary:clip(v.summary,3500),
      canonFacts:(v.canonFacts||[]).slice(-20).map(x=>clip(typeof x==="string"?x:JSON.stringify(x),700)),
      openThreads:(v.openThreads||[]).slice(-15).map(x=>clip(typeof x==="string"?x:JSON.stringify(x),700)),
      characterStates:(v.characterStates||[]).slice(-18),
      relationshipStates:(v.relationshipStates||[]).slice(-14),
      endingMemory:clip(v.endingMemory,3000)
    }))
  };
}

// Spezieller, schlanker Kontext für die Kapitelplan-Ausarbeitung.
// Gerade bei Band 2+ braucht die KI den Reihen-Canon und den Gesamtbogen, aber NICHT die kompletten
// Textreste vieler Kapitel. Das reduziert Upload/Prefill deutlich und verhindert lange 0%-Wartephasen.
function projectPlanExpansionContext(p,chapterNumber){
  const outline=(p.chapters||[]).map(c=>({
    number:c.number,title:c.title||"",partTitle:c.partTitle||"",
    perspective:c.perspective||"",location:c.location||"",sceneGoal:c.sceneGoal||"",
    emotionalMove:c.emotionalMove||"",consequence:c.consequence||"",
    plan:String(c.plan||"").slice(0,1400)
  }));
  const parts=(p.bookPlan?.parts||[]).map(x=>({title:x?.title||"",purpose:x?.purpose||"",arc:x?.arc||""}));
  const nearby=nearbyChapters(p,chapterNumber).map(c=>({
    number:c.number,title:c.title||"",partTitle:c.partTitle||"",perspective:c.perspective||"",
    location:c.location||"",sceneGoal:c.sceneGoal||"",emotionalMove:c.emotionalMove||"",
    newInformation:c.newInformation||"",withhold:c.withhold||"",relationshipMovement:c.relationshipMovement||"",
    consequence:c.consequence||"",bridge:c.bridge||"",plan:String(c.plan||"").slice(0,5000),memory:String(c.memory||"").slice(0,3500)
  }));
  return {
    id:p.id,title:p.title,genre:p.genre,dna:p.dna,ai:p.ai,seriesContext:compactPlanSeriesContext(p),
    briefing:{summary:p.briefing?.summary||""},
    bookPlan:{bookVision:p.bookPlan?.bookVision||"",qualityStatus:p.bookPlan?.qualityStatus||"",parts,chapterOutline:outline},
    bookMemory:p.bookMemory||{facts:[],openThreads:[],characterStates:[],relationshipStates:[],lastChapterNumber:0},
    ideaVault:(p.ideaVault||[]).filter(x=>x.status==="applied"||x.status==="approved").slice(-20),
    protectedPassages:(p.protectedPassages||[]).slice(-20),
    style:{rules:p.style?.rules||[],forbidden:p.style?.forbidden||[],referenceText:(p.style?.referenceText||"").slice(0,7000)},
    characters:p.characters||[],relationships:p.relationships||[],chapterCount:(p.chapters||[]).length,chapters:nearby
  };
}

function projectReviewContext(p,chapterNumber){
  return {
    id:p.id,title:p.title,genre:p.genre,dna:p.dna,ai:p.ai,seriesContext:seriesContextForProject(p),
    briefing:{summary:p.briefing?.summary||""},
    bookMemory:p.bookMemory||{facts:[],openThreads:[],characterStates:[],relationshipStates:[],lastChapterNumber:0},
    style:{rules:p.style?.rules||[],forbidden:p.style?.forbidden||[],referenceText:(p.style?.referenceText||"").slice(0,10000)},
    characters:p.characters||[],relationships:p.relationships||[],chapterCount:(p.chapters||[]).length,
    chapters:nearbyChapters(p,chapterNumber).map(c=>({number:c.number,title:c.title,partTitle:c.partTitle||"",plan:c.plan||"",memory:c.memory||""}))
  };
}


function addLanguage(){const input=$("#languageInput"),v=input?.value.trim();if(!v)return;const p=project();p.dna.languages||=[];if(!p.dna.languages.some(x=>x.toLowerCase()===v.toLowerCase()))p.dna.languages.push(v);save("Sprache hinzugefügt");render();}
function readableError(value,fallback="Unbekannter Fehler"){
  if(value===null||value===undefined||value==="")return fallback;
  if(typeof value==="string")return value;
  if(value instanceof Error)return value.message||fallback;
  if(typeof value==="object"){
    for(const key of ["message","error","detail","reason","description"]){
      if(value[key]!==undefined&&value[key]!==value){
        const nested=readableError(value[key],"");
        if(nested)return nested;
      }
    }
    try{
      const s=JSON.stringify(value);
      if(s&&s!=="{}")return s.length>500?s.slice(0,500)+" …":s;
    }catch{}
  }
  const s=String(value||"").trim();
  return s&&s!=="[object Object]"?s:fallback;
}
function transientApiError(message,status=0){
  const e=new Error(readableError(message,"Verbindung unterbrochen"));e.retryable=true;e.status=Number(status)||0;return e;
}
function isPermanentApiConfigError(e){
  const msg=readableError(e?.message||e,"").toLowerCase();
  return /api[_ -]?key.*fehlt|umgebungsvariablen|nicht eingerichtet|nicht freigeschaltet|ungültiger api|invalid api key|authentication failed|unauthorized api/.test(msg);
}
function isTransientApiError(e){
  if(isPermanentApiConfigError(e))return false;
  if(e?.retryable)return true;
  const status=Number(e?.status)||0;
  if([408,425,429,500,502,503,504].includes(status)||(status>=520&&status<600))return true;
  const msg=readableError(e?.message||e,"").toLowerCase();
  return /serververbindung|internetverbindung|netzwerk|network|fetch|zeitlimit|timeout|temporär|vorübergehend|verbindung.*unterbrochen|überlast|overload|rate.?limit|too many requests|unavailable/.test(msg);
}
// V1.9.3.9: Die normale Litterum-Version hat keinen Claude-Test-Seitenzugang mehr.
function claudeTestHeaders(){return {};}
function forgetClaudeTestAccess(){}
// Gemeinsamer Kern für alle KI-Anfragen (vorher dreifach fast identisch vorhanden).
async function postAi(action,payload={},{projectOverride=null,context="full",timeoutMs=290000,transientErrors=true,abortRegistry=null,manualAbort=null}={}){
  const sourceProject=projectOverride||project();
  if(!sourceProject)throw new Error("Kein aktives Buch geöffnet.");
  const projectPayload=context==="light"
    ? {id:sourceProject.id,title:sourceProject.title,genre:sourceProject.genre,ai:sourceProject.ai,seriesContext:seriesContextForProject(sourceProject)}
    : context==="planning"
      ? projectPlanningContext(sourceProject)
      : context==="review"
        ? projectReviewContext(sourceProject,payload?.chapter?.number)
        : projectContext(sourceProject,{chapterNumber:payload?.chapter?.number,manuscript:context==="manuscript"||!!payload?.manuscript});
  const accessHeaders=claudeTestHeaders();
  const controller=new AbortController();
  if(abortRegistry?.add)abortRegistry.add(controller);
  const timer=setTimeout(()=>controller.abort(),Math.max(30000,Number(timeoutMs)||290000));
  let res,raw="";
  try{
    res=await fetch("/api/ai",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",...accessHeaders},signal:controller.signal,body:JSON.stringify({action,project:projectPayload,...payload})});
    raw=await res.text();
  }catch(e){
    if(e?.name==="AbortError"&&typeof manualAbort==="function"&&manualAbort()){
      const stopped=new Error("Prüfung sofort gestoppt.");stopped.manualStop=true;throw stopped;
    }
    if(e?.name==="AbortError")throw transientApiError("Die KI hat nicht rechtzeitig geantwortet. Bereits gespeicherte Inhalte bleiben erhalten; der Auftrag kann fortgesetzt werden.",408);
    throw transientApiError("Die Verbindung zur KI wurde unterbrochen. Bereits gespeicherte Inhalte bleiben erhalten; der Auftrag kann fortgesetzt werden.");
  }finally{clearTimeout(timer);if(abortRegistry?.delete)abortRegistry.delete(controller);}
  let data={};
  try{data=raw?JSON.parse(raw):{};}catch{}
  if(!res.ok){
    let message="";
    if(res.status===401){message=data?.error?readableError(data.error,""):"Der KI-Anbieter hat die Anfrage nicht autorisiert. Bitte den API-Schlüssel in Vercel prüfen.";}
    else if(data?.error)message=readableError(data.error,"");
    else if(res.status===504)message="Die KI-Anfrage hat das Serverzeitlimit erreicht. Bereits gespeicherte Inhalte bleiben erhalten.";
    else if(res.status===413)message="Die Anfrage war für den Server zu groß. Bitte den Text in kleineren Teilen verarbeiten.";
    else if(res.status===401||res.status===403)message="Der geschützte Serverzugang ist für diese Anfrage nicht freigegeben. Bitte Litterum neu laden und ggf. neu anmelden.";
    else{
      const short=raw&&raw.length<220?raw.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim():"";
      message=`KI-Serverfehler ${res.status}${short?": "+short:""}`;
    }
    if(transientErrors&&[408,425,429,500,502,503,504].includes(Number(res.status))&&!isPermanentApiConfigError({message,status:res.status}))throw transientApiError(message,res.status);
    const err=new Error(message);err.status=res.status;throw err;
  }
  return data;
}
async function apiData(action,payload={},options={}){
  const data=await postAi(action,payload,{projectOverride:options.projectOverride,context:options.lightProject?"light":options.planningProject?"planning":"full",timeoutMs:options.timeoutMs});
  return data.data??data;
}
function splitBriefingForAnalysis(text,maxChars=10000){
  const clean=String(text||"").replace(/\r\n/g,"\n").trim();
  if(!clean)return [];
  const paragraphs=clean.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
  const chunks=[];
  let current="";
  const pushCurrent=()=>{if(current.trim())chunks.push(current.trim());current="";};
  for(const paragraph of paragraphs){
    if(paragraph.length>maxChars){
      pushCurrent();
      const sentences=paragraph.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)||[paragraph];
      let part="";
      for(const sentence of sentences){
        if((part+"\n"+sentence).length>maxChars&&part){chunks.push(part.trim());part="";}
        if(sentence.length>maxChars){
          if(part.trim())chunks.push(part.trim());
          part="";
          for(let i=0;i<sentence.length;i+=maxChars)chunks.push(sentence.slice(i,i+maxChars).trim());
        }else part+=(part?" ":"")+sentence.trim();
      }
      if(part.trim())chunks.push(part.trim());
      continue;
    }
    if((current+"\n\n"+paragraph).length>maxChars)pushCurrent();
    current+=(current?"\n\n":"")+paragraph;
  }
  pushCurrent();
  return chunks;
}
function desiredFastChapterCount(p){
  const raw=String(p?.briefing?.raw||"");
  const matches=[...raw.matchAll(/\b(?:ca\.?|circa|etwa|ungefähr|ungefaehr|rund)?\s*(\d{1,2})\s*(?:kapitel|chapters?)\b/gi)];
  for(let i=matches.length-1;i>=0;i--){const n=Number(matches[i][1]);if(n>=6&&n<=80)return n;}
  const targetWords=Math.max(20000,Number(p?.dna?.targetWords)||100000);
  return Math.max(18,Math.min(42,Math.round(targetWords/3000)));
}
function chapterIdeasNeedExpansion(p,analysis){
  const have=Array.isArray(analysis?.chapterIdeas)?analysis.chapterIdeas.filter(x=>String(x?.title||x?.plan||"").trim()).length:0;
  const target=desiredFastChapterCount(p);
  return {have,target,needed:have<Math.max(12,target-3)};
}
async function expandChapterIdeasOnce(p,analysis,onProgress=()=>{}){
  const check=chapterIdeasNeedExpansion(p,analysis);
  if(!check.needed)return analysis;
  onProgress({stage:"chapters",completed:check.have,total:check.target});
  try{
    const out=await apiData("expand_chapter_ideas_fast",{
      briefing:String(p?.briefing?.raw||"").slice(0,70000),
      analysis,
      targetChapters:check.target
    },{lightProject:true,projectOverride:p,timeoutMs:90000});
    const ideas=Array.isArray(out?.chapterIdeas)?out.chapterIdeas.filter(x=>String(x?.title||x?.plan||"").trim()):[];
    if(ideas.length>=Math.max(check.have+4,Math.min(18,Math.max(6,check.target-2)))){
      analysis.chapterIdeas=ideas.slice(0,check.target);
    }
  }catch(e){
    console.warn("Schnelle Kapitelvervollständigung übersprungen:",e?.message||e);
  }
  return analysis;
}

async function analyzeBriefingForProject(p,onProgress=()=>{},rawOverride=null){
  const raw=String(rawOverride??p?.briefing?.raw??"").trim();
  if(!raw)throw new Error("Füge zuerst dein Buchbriefing ein.");
  const chunks=splitBriefingForAnalysis(raw);
  if(!chunks.length)throw new Error("Das Buchbriefing ist leer.");
  let completed=0,nextIndex=0;
  const partials=new Array(chunks.length);
  async function analyzePart(index){
    let lastError=null;
    for(let attempt=1;attempt<=2;attempt++){
      try{
        onProgress({stage:"analysis",completed,total:chunks.length,index,attempt});
        return await apiData("analyze_briefing_chunk",{briefing:chunks[index],part:index+1,total:chunks.length},{lightProject:true,projectOverride:p});
      }catch(e){lastError=e;if(attempt<2)await new Promise(r=>setTimeout(r,450));}
    }
    throw new Error(`Teil ${index+1} konnte nicht zuverlässig ausgewertet werden: ${lastError?.message||"unbekannter Fehler"}`);
  }
  async function worker(){
    while(true){
      const index=nextIndex++;
      if(index>=chunks.length)return;
      partials[index]=await analyzePart(index);
      completed++;
      onProgress({stage:"analysis",completed,total:chunks.length,index,attempt:1});
    }
  }
  // Alle Briefing-Teile gleichzeitig auswerten (bis zu 6) – statt zwei nacheinander.
  await Promise.all(Array.from({length:Math.min(6,chunks.length)},()=>worker()));
  onProgress({stage:"merge",completed,total:chunks.length});
  let data=chunks.length===1?partials[0]:await apiData("merge_briefing_analysis",{parts:partials},{lightProject:true,projectOverride:p});
  // Kapitel nur für eigene Briefings vervollständigen – importierte Bücher haben ihre Kapitel schon.
  if(rawOverride==null)data=await expandChapterIdeasOnce(p,data,onProgress);
  const lp=liveProject(p)||p;lp.briefing ||= {};
  lp.briefing.analysis=data;
  lp.briefing.summary=data.summary||"";
  lp.briefing.lastAnalyzed=now();
  lp.updatedAt=now();store.save();
  return data;
}
async function analyzeBriefing(){
  const p=project(),btn=$("#analyzeBriefing");
  if(!p?.briefing?.raw?.trim())return toast("Füge zuerst dein Buchbriefing ein.");
  const originalLabel="✦ KI verstehen lassen";
  if(btn)btn.disabled=true;
  try{
    const data=await withBusy(()=>analyzeBriefingForProject(p,info=>{
      if(!btn)return;
      if(info.stage==="merge")btn.textContent="Ordne Ergebnisse zusammen …";
      else if(info.stage==="chapters")btn.textContent=`Erstelle Kapitelstruktur · Ziel ${info.total} …`;
      else btn.textContent=`Analysiere ${info.completed}/${info.total} …`;
    }));
    const lp=liveProject(p);if(lp){lp.briefing ||= {};lp.briefing.analysis=data;lp.updatedAt=now();store.save();}toast("Briefing analysiert");render();
  }catch(e){toast(e.message);if(btn){btn.disabled=false;btn.textContent=originalLabel;}}
}
function appendUnique(arr,items){for(const x of items||[])if(x&&!arr.includes(x))arr.push(x);}
function applyBriefingData(p,a,{navigate=false}={}){
  if(!p||!a)return;
  if(a.title)p.title=a.title;
  if(a.genre)p.genre=a.genre;
  if(a.languages?.length)p.dna.languages=[...new Set(a.languages)];
  for(const [k,v] of Object.entries(a.dna||{}))if(v!==null&&v!==undefined&&String(v).trim()!=="")p.dna[k]=v;
  for(const c of a.characters||[]){
    const incoming={id:uid(),...c,aliases:Array.isArray(c.aliases)?c.aliases:[]};
    const key=normalizePersonName(incoming.name);
    const existing=p.characters.find(x=>normalizePersonName(x.name)===key);
    if(existing){for(const f of ["age","role","appearance","personality","voice","thought"])existing[f]=mergeTextUnique(existing[f],incoming[f]);}
    else p.characters.push(incoming);
  }
  dedupeCharactersAndRelationships(p);
  for(const r of a.relationships||[]){
    const aName=resolveCharacterName(p,r.a),bName=resolveCharacterName(p,r.b);
    if(!aName||!bName||normalizePersonName(aName)===normalizePersonName(bName))continue;
    const relKey=[normalizePersonName(aName),normalizePersonName(bName)].sort().join("|");
    const existing=p.relationships.find(x=>[normalizePersonName(x.a),normalizePersonName(x.b)].sort().join("|")===relKey);
    if(existing){if(r.note)existing.note=mergeTextUnique(existing.note,r.note);}
    else p.relationships.push({id:uid(),metrics:{Vertrauen:30,Nähe:20,Misstrauen:20,Abhängigkeit:10,Begehren:10,Konflikt:20},...r,a:aName,b:bName});
  }
  dedupeCharactersAndRelationships(p);
  // Briefing-Regeln: einzelne kurze Regeln sofort übernehmen; lange Masterprompt-Blöcke
  // zunächst sicher in die Prüfliste legen statt sie ungeprüft an die Schreib-KI zu geben.
  p.style.pendingImports ||= [];
  for(const [kind,items] of [["positive",a.styleRules||[]],["negative",a.forbiddenPatterns||[]]])for(const raw of items){
    const text=String(raw||"").trim();if(!text)continue;
    if(needsStyleReview(text)){
      if(!p.style.pendingImports.some(x=>styleRuleKey(x.text)===styleRuleKey(text)))p.style.pendingImports.push({id:uid(),kind,text,createdAt:now()});
    }else{
      const dest=simpleStyleKind(text,kind)==="negative"?p.style.forbidden:p.style.rules;
      if(![...p.style.rules,...p.style.forbidden].some(x=>styleRuleKey(x)===styleRuleKey(text)))dest.push(text);
    }
  }
  // Briefing-Überschriften und Abschnittsnamen werden absichtlich NICHT mehr als Kapitel angelegt.
  // Echte Kapitel entstehen ausschließlich im Schritt „Buch entwickeln“.
  p.briefing.summary=a.summary||p.briefing.summary;
  p.updatedAt=now();store.save();
  if(navigate){state.activeTab="dna";store.save();render();}
}
function applyBriefing(){const p=project(),a=p.briefing.analysis;if(!a)return;applyBriefingData(p,a,{navigate:true});const pending=p.style?.pendingImports?.length||0;toast(pending?`Briefing übernommen. ${pending} lange Stiltexte warten unter Stil DNA auf deine Freigabe.`:"Briefing in Roman-DNA, Figuren und Stil einsortiert. Kapitel bleiben unangetastet.",pending?6500:3800);}

function planChapterText(ch){
  return [
    ch.sceneGoal&&`Szenenziel: ${ch.sceneGoal}`,
    ch.emotionalMove&&`Emotionale Bewegung: ${ch.emotionalMove}`,
    ch.development&&`Zentrale Entwicklung: ${ch.development}`,
    ch.newInformation&&`Neue Information: ${ch.newInformation}`,
    ch.withhold&&`Noch NICHT enthüllen: ${ch.withhold}`,
    ch.relationshipMovement&&`Beziehungsentwicklung: ${ch.relationshipMovement}`,
    ch.consequence&&`Konsequenz: ${ch.consequence}`,
    ch.bridge&&`Übergang: ${ch.bridge}`
  ].filter(Boolean).join("\n");
}
function flattenBookPlan(plan){
  const out=[];
  for(const part of plan?.parts||[]){
    for(const ch of part.chapters||[]){
      out.push({
        id:uid(),number:out.length+1,title:ch.title||`Kapitel ${out.length+1}`,partTitle:part.title||"",perspective:ch.perspective||"",location:ch.location||"",sceneGoal:ch.sceneGoal||"",emotionalMove:ch.emotionalMove||"",newInformation:ch.newInformation||"",withhold:ch.withhold||"",relationshipMovement:ch.relationshipMovement||"",consequence:ch.consequence||"",bridge:ch.bridge||"",development:ch.development||"",
        plan:planChapterText(ch),content:"",memory:"",status:"Planung",planExpanded:false
      });
    }
  }
  return out;
}

function flattenSinglePart(planPart,startNumber=1,partIndex=0){
  const out=[];
  for(const ch of planPart?.chapters||[]){
    const number=startNumber+out.length;
    out.push({id:uid(),number,title:ch.title||`Kapitel ${number}`,partTitle:planPart.title||"",partIndex,perspective:ch.perspective||"",location:ch.location||"",sceneGoal:ch.sceneGoal||"",emotionalMove:ch.emotionalMove||"",newInformation:ch.newInformation||"",withhold:ch.withhold||"",relationshipMovement:ch.relationshipMovement||"",consequence:ch.consequence||"",bridge:ch.bridge||"",development:ch.development||"",plan:planChapterText(ch),content:"",memory:"",status:"Planung",planExpanded:false});
  }
  return out;
}
function confirmDevelopPart(index){
  const p=project(),w=ensurePartWorkflowShape(p),part=w.parts[index];if(!p||!part)return;
  if(!String(p.briefing?.raw||p.briefing?.summary||"").trim())return toast("Füge zuerst dein Gesamtbriefing ein.");
  if(index>0&&w.parts[index-1]?.status!=="written")return toast(`Schließe zuerst ${w.parts[index-1]?.title||`Teil ${index}`} ab.`);
  const existing=partChapterList(p,index);
  if(existing.some(c=>String(c.content||"").trim()))return toast("Dieser Teil enthält bereits geschriebenen Text und wird nicht automatisch neu geplant.");
  const foreignUnassigned=(p.chapters||[]).filter(c=>c.partIndex===undefined||c.partIndex===null);
  if(index===0&&foreignUnassigned.length){
    const writtenLegacy=foreignUnassigned.filter(c=>String(c.content||"").trim());
    if(writtenLegacy.length){
      modal(`<h2>Ältere Kapitel gefunden</h2><p>In diesem Projekt liegen noch <strong>${foreignUnassigned.length} Kapitel aus dem bisherigen Modus</strong>, davon ${writtenLegacy.length} mit Manuskripttext. Damit nichts vermischt wird, kann Litterum zuerst automatisch eine vollständige Sicherung dieses Buches anlegen und danach Teil I frisch entwickeln.</p><div class="card" style="padding:12px;margin:12px 0"><div class="small muted">Die Sicherung erscheint anschließend bei „Meine Bücher“. Im aktuellen Projekt werden nur die alten, noch keinem Teil zugeordneten Kapitel entfernt.</div></div><div class="modal-actions"><button type="button" class="ghost-btn" data-close>Abbrechen</button><button type="button" class="primary-btn" id="backupAndStartPart">Sicherung anlegen & Teil I neu starten</button></div>`);
      $("#backupAndStartPart").onclick=()=>{
        const backup=ensureProjectShape(JSON.parse(JSON.stringify(p)));
        backup.id=uid();backup.title=`${p.title} – Sicherung vor Teilmodus`;backup.createdAt=now();backup.updatedAt=now();
        backup.bookWriter.running=false;backup.bookWriter.currentChapterId=null;backup.bookWriter.currentChapterNumber=0;backup.bookWriter.targetPartIndex=null;backup.bookWriter.lastMessage="Sicherung vor Teil-für-Teil-Neustart";
        state.projects.push(backup);
        const removedIds=new Set(foreignUnassigned.map(c=>c.id));
        p.chapters=(p.chapters||[]).filter(c=>!removedIds.has(c.id));
        if(removedIds.has(p.ui?.lastChapterId))p.ui.lastChapterId=null;if(removedIds.has(p.ui?.planChapterId))p.ui.planChapterId=null;if(removedIds.has(p.ui?.writeChapterId))p.ui.writeChapterId=null;
        p.planJobs={};p.writeJobs={};state.activeChapterId=null;p.updatedAt=now();store.save();closeModal();toast("Sicherung angelegt. Teil I wird vorbereitet …");developSinglePart(index);
      };return;
    }
    modal(`<h2>Manuell angelegte Kapitel ersetzen?</h2><p>Im Projekt liegen <strong>${foreignUnassigned.length} manuell angelegte, noch ungeschriebene Kapitel</strong>. Im Teil-für-Teil-Modus bestimmt Litterum die Kapitelzahl selbst.</p><div class="modal-actions"><button type="button" class="ghost-btn" data-close>Abbrechen</button><button type="button" class="primary-btn" id="confirmPartReset">Ersetzen und ${esc(part.title)} entwickeln</button></div>`);
    $("#confirmPartReset").onclick=()=>{p.chapters=p.chapters.filter(c=>!(c.partIndex===undefined||c.partIndex===null));p.ui.lastChapterId=null;p.ui.planChapterId=null;p.ui.writeChapterId=null;state.activeChapterId=null;closeModal();toast("Alte leere Kapitel entfernt. Teil I wird vorbereitet …");developSinglePart(index);};return;
  }
  if(existing.length){
    modal(`<h2>${esc(part.title)} neu entwickeln?</h2><p>Die bisherigen <strong>${existing.length} leeren Kapitelpläne</strong> dieses Teils werden ersetzt.</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="confirmPartRedevelop">Neu entwickeln</button></div>`);
    $("#confirmPartRedevelop").onclick=()=>{closeModal();developSinglePart(index);};return;
  }
  developSinglePart(index);
}
async function ensurePartArchitecture(p,w){
  if(w.architecture)return w.architecture;
  const lockedParts=w.parts.map((x,i)=>({title:x.title,partBriefing:x.briefing||"",index:i}));
  w.architecture=await apiData("develop_book_architecture",{fullBriefing:String(p.briefing?.raw||"").slice(0,70000),lockedParts},{projectOverride:p,planningProject:true});
  w.architecture.parts=(w.parts||[]).map((x,i)=>({...((w.architecture.parts||[])[i]||{}),title:x.title,partBriefing:x.briefing||""}));
  return w.architecture;
}
function developmentPausedMessage(){
  if(typeof navigator!=="undefined" && navigator.onLine===false)return "Keine Verbindung. Der Auftrag bleibt gespeichert und wird automatisch fortgesetzt, sobald wieder Internet verfügbar ist.";
  return "Die App wurde im Hintergrund angehalten oder die Verbindung kurz unterbrochen. Der Fortschritt ist gespeichert und wird automatisch fortgesetzt.";
}
let developmentResumeTimer=null;
function scheduleDevelopmentResume(delay=900){
  // Immer nur EIN geplanter Neuversuch, damit die Wartezeiten (Backoff) wirklich eingehalten werden.
  clearTimeout(developmentResumeTimer);developmentResumeTimer=null;
  if(document.hidden || (typeof navigator!=="undefined"&&navigator.onLine===false))return;
  developmentResumeTimer=setTimeout(()=>{developmentResumeTimer=null;resumeInterruptedBookDevelopments();},delay);
}
async function withDevelopmentActivity(job,label,task){
  if(job){
    job.activeRequestStartedAt=now();job.activeRequestLabel=label||"KI arbeitet";job.updatedAt=now();store.save();
    if(project()?.bookDevelopmentJob===job&&state.activeTab==="studio")render();else updateDevelopmentActivityLabels();
  }
  try{return await task();}
  finally{if(job){job.activeRequestStartedAt="";job.activeRequestLabel="";job.updatedAt=now();store.save();}}
}
function activeDevelopmentRuntimeFor(p){
  const rt=p?activeBookDevelopmentRuntimes.get(p.id):null;
  if(!rt)return null;
  const job=p.bookDevelopmentJob;
  const valid=!!job&&job.status==="running"&&((job.mode==="part"&&rt.mode==="part"&&Number(job.partIndex)===Number(rt.partIndex))||(job.mode==="whole"&&rt.mode==="whole"));
  if(!valid){activeBookDevelopmentRuntimes.delete(p.id);return null;}
  return rt;
}
async function developSinglePart(index,options={}){
  const projectId=options.projectId||project()?.id;if(!projectId)return;
  const r=await runExclusive("dev-"+projectId,()=>developSinglePartInner(index,{...options,projectId}));
  if(r==="locked"){if(!options.resume&&project()?.id===projectId)toast("Dieser Romanteil wird gerade in einem anderen Fenster entwickelt.");else if(options.resume)whenLockFree("dev-"+projectId,resumeInterruptedBookDevelopments);}
}
async function developSinglePartInner(index,options={}){
  const projectId=options.projectId||project()?.id,resume=!!options.resume;
  const p=projectById(projectId);if(!p)return;
  const activeRuntime=activeDevelopmentRuntimeFor(p);
  if(activeRuntime){
    if(project()?.id===p.id)toast("Dieser Romanteil wird bereits entwickelt. Der laufende Stand wird angezeigt.");
    if(project()?.id===p.id)render();
    return;
  }
  const w=ensurePartWorkflowShape(p),part=w.parts[index];if(!part)return;
  let job=p.bookDevelopmentJob;
  const resumeJob=!!job&&job.mode==="part"&&Number(job.partIndex)===Number(index)&&(resume||job.status==="paused");
  if(!resumeJob){
    job=p.bookDevelopmentJob={mode:"part",status:"running",phase:"analysis",partIndex:index,architecture:null,pendingPart:null,retryCount:0,lastError:"",startedAt:now(),updatedAt:now()};
  }else{
    if(job.status==="paused")job.retryCount=0;
    job.status="running";job.lastError="";job.updatedAt=now();
  }
  activeBookDevelopmentRuntimes.set(p.id,{projectId:p.id,partIndex:index,mode:"part"});
  part.status="developing";part.error="";part.qualityStatus=resume?"Gespeicherten Entwicklungsstand wird fortgesetzt …":"Gesamtbriefing wird für diesen Teil vorbereitet …";w.activePartIndex=index;p.updatedAt=now();store.save();if(project()?.id===p.id)render();
  try{
    if(!p.briefing?.analysis){
      job.phase="analysis";job.updatedAt=now();store.save();
      const analysis=await withDevelopmentActivity(job,"KI analysiert das Briefing",()=>analyzeBriefingForProject(p,info=>{part.status="developing";part.qualityStatus=info.stage==="merge"?"Roman-DNA wird zusammengeführt …":`Briefing wird analysiert · ${info.completed}/${info.total}`;job.updatedAt=now();p.updatedAt=now();store.save();if(project()?.id===p.id&&state.activeTab==="studio")render();}));
      applyBriefingData(p,analysis,{navigate:false});job.retryCount=0;job.updatedAt=now();store.save();
    }
    let architecture=job.architecture||w.architecture;
    if(!architecture){
      job.phase="architecture";part.qualityStatus="Übergreifender Romanbogen wird nur so weit vorbereitet, wie dieser Teil ihn braucht …";job.updatedAt=now();store.save();if(project()?.id===p.id)render();
      const lockedParts=w.parts.map((x,i)=>({title:x.title,partBriefing:x.briefing||"",index:i}));
      architecture=await withDevelopmentActivity(job,"Romanbogen wird aufgebaut",()=>apiData("develop_book_architecture",{fullBriefing:String(p.briefing?.raw||"").slice(0,70000),lockedParts},{projectOverride:p,planningProject:true}));
      architecture.parts=(w.parts||[]).map((x,i)=>({...((architecture.parts||[])[i]||{}),title:x.title,partBriefing:x.briefing||""}));
      job.architecture=architecture;w.architecture=architecture;job.retryCount=0;job.updatedAt=now();store.save();
    }
    const meta={...(architecture.parts?.[index]||{}),title:part.title,partBriefing:part.briefing||""};
    const previous=index>0?{...(p.bookPlan?.parts?.[index-1]||{}),summary:w.parts[index-1]?.summary||"",handoff:w.parts[index-1]?.handoff||""}:null;

    // Robuste Teilplanung in kleinen Paketen. Nach JEDEM Paket wird gespeichert.
    // So kostet ein Wechsel in den Hintergrund höchstens das gerade laufende Paket.
    const target=Math.max(5,Math.min(24,Number(meta.targetChapters)||12));
    let planPart=job.pendingPart&&Array.isArray(job.pendingPart.chapters)
      ? job.pendingPart
      : {title:part.title,purpose:meta.purpose||"",arc:meta.arc||"",chapters:[]};
    job.pendingPart=planPart;
    job.phase="develop_part_batches";
    job.targetChapters=target;
    job.updatedAt=now();store.save();

    while(planPart.chapters.length<target){
      const start=planPart.chapters.length+1;
      const count=Math.min(6,target-planPart.chapters.length);
      part.status="developing";
      part.qualityStatus=`${part.title}: Kapitel ${start}–${start+count-1} von ${target} werden geplant …`;
      job.updatedAt=now();store.save();if(project()?.id===p.id)render();

      const batch=await withDevelopmentActivity(job,`KI plant Kapitel ${start}–${start+count-1}`,()=>apiData("develop_book_part_batch",{
        architecture,partMeta:meta,partIndex:index,previousPart:previous,
        existingChapters:planPart.chapters,startChapter:start,batchSize:count,targetChapters:target
      },{projectOverride:p,planningProject:true}));

      const newItems=Array.isArray(batch?.chapters)?batch.chapters:[];
      if(!newItems.length)throw new Error(`${part.title}: Die KI hat für Kapitel ${start}–${start+count-1} keinen brauchbaren Plan geliefert.`);
      planPart.chapters.push(...newItems.slice(0,count));
      job.pendingPart=planPart;job.retryCount=0;job.updatedAt=now();p.updatedAt=now();store.save();
      if(project()?.id===p.id){
        part.qualityStatus=`${part.title}: ${planPart.chapters.length}/${target} Kapitel gespeichert`;
        render();
      }
    }

    // Die Qualitätskontrolle ist jetzt in jedem kleinen Paket eingebaut.
    // Eine zusätzliche große Vollprüfung blockiert die Fertigstellung nicht mehr.
    part.status="refining";
    part.qualityStatus=`${part.title}: ${planPart.chapters.length} Kapitel vollständig geplant · Abschlussprüfung …`;
    job.phase="finalize";job.updatedAt=now();store.save();if(project()?.id===p.id)render();

    if(!Array.isArray(planPart?.chapters)||!planPart.chapters.length)throw new Error(`${part.title} enthält keine echten Kapitel.`);
    job.phase="finalize";job.updatedAt=now();store.save();
    const oldIds=new Set(part.chapterIds||[]);p.chapters=(p.chapters||[]).filter(c=>!oldIds.has(c.id)&&Number(c.partIndex)!==index);
    const previousNumbers=(p.chapters||[]).filter(c=>Number(c.partIndex)<index).map(c=>Number(c.number)||0);const start=(previousNumbers.length?Math.max(...previousNumbers):0)+1;
    const newChapters=flattenSinglePart({...planPart,title:part.title},start,index);p.chapters.push(...newChapters);p.chapters.sort((a,b)=>a.number-b.number);
    part.chapterIds=newChapters.map(c=>c.id);part.status="planned";part.qualityStatus=`${newChapters.length} Kapitel entwickelt`;part.error="";
    p.bookPlan ||= {bookVision:architecture.bookVision||"",centralPlot:architecture.centralPlot||"",creativeRestart:p.bookPlan?.creativeRestart!==false,estimatedWordCount:architecture.estimatedWordCount||0,characterArcs:architecture.characterArcs||[],mysteryMap:architecture.mysteryMap||[],qualityNotes:architecture.qualityNotes||[],parts:[]};
    p.bookPlan.bookVision=architecture.bookVision||p.bookPlan.bookVision||"";p.bookPlan.centralPlot=architecture.centralPlot||p.bookPlan.centralPlot||"";p.bookPlan.status="partial";p.bookPlan.qualityStatus=`${part.title} entwickelt`;
    p.bookPlan.parts=w.parts.map((wf,i)=>i===index?{...meta,...planPart,title:wf.title}:p.bookPlan.parts?.[i]||{...(architecture.parts?.[i]||{}),title:wf.title,chapters:[]});
    const first=newChapters[0];if(first){p.ui.planChapterId=first.id;p.ui.writeChapterId=first.id;p.ui.lastChapterId=first.id;if(project()?.id===p.id)state.activeChapterId=first.id;}
    p.bookWriter.running=false;p.bookWriter.targetPartIndex=null;p.bookWriter.currentChapterId=null;p.bookWriter.currentChapterNumber=0;p.bookWriter.lastMessage=`${part.title} ist bereit zum Schreiben`;
    p.bookDevelopmentJob=null;p.updatedAt=now();store.save();activeBookDevelopmentRuntimes.delete(p.id);if(project()?.id===p.id){render();toast(`${part.title}: ${newChapters.length} Kapitel entwickelt.`);}
    scheduleDevelopmentResume(350);
  }catch(e){
    const current=projectById(projectId)||p;const j=current.bookDevelopmentJob||job;
    if(isTransientApiError(e)){
      j.retryCount=Number(j.retryCount||0)+1;j.lastError=e.message||"Verbindung unterbrochen";j.updatedAt=now();
      if(j.retryCount>=8){
        // Nicht endlos weiter anfragen (z. B. Anbieter gestört oder Guthaben leer): pausieren, Fortschritt behalten.
        j.status="paused";part.status="error";part.error=`Die KI war mehrmals nicht erreichbar (${j.lastError}). Der bisherige Fortschritt ist gespeichert – „Erneut entwickeln“ setzt genau dort fort.`;part.qualityStatus=part.error;
        current.updatedAt=now();store.save();activeBookDevelopmentRuntimes.delete(current.id);if(project()?.id===current.id){render();toast(part.error,7000);}return;
      }
      j.status="interrupted";
      part.status="developing";part.error="";part.qualityStatus=developmentPausedMessage();current.updatedAt=now();store.save();activeBookDevelopmentRuntimes.delete(current.id);
      if(project()?.id===current.id){render();if(j.retryCount===1)toast("Fortschritt gespeichert. Litterum setzt automatisch fort.");}
      scheduleDevelopmentResume(Math.min(60000,1500*2**(j.retryCount-1)));return;
    }
    part.status="error";part.error=readableError(e,"Entwicklung fehlgeschlagen");part.qualityStatus=part.error;current.bookDevelopmentJob=null;current.updatedAt=now();store.save();activeBookDevelopmentRuntimes.delete(current.id);if(project()?.id===current.id){render();toast(part.error);}
  }
}
async function refreshPartSummary(p,index){
  const w=ensurePartWorkflowShape(p),part=w.parts[index],chapters=partChapterList(p,index);if(!part||!chapters.length)return false;
  try{
    const data=await apiData("part_digest",{part:{index,title:part.title,chapterMemories:chapters.map(c=>({number:c.number,title:c.title,memory:c.memory||"",plan:c.plan||""}))}},{projectOverride:p});
    part.summary=String(data.summary||"").trim();part.handoff=String(data.handoff||"").trim();return true;
  }catch{return false;}
}
// ---------- Buchschreiber (ganzes Buch oder ein Teil) ----------
// Robust für lange, unbeaufsichtigte Läufe: kurze Verbindungsfehler werden automatisch
// wiederholt, im Hintergrund pausiert er und setzt beim Zurückkehren fort, und
// unvollständige Kapitel werden fortgesetzt statt übersprungen.
function chapterNeedsWriting(c){return !String(c?.content||"").trim()||!!c?.writeIncomplete;}
function writerJobInterrupted(p,chapterId){
  const cur=projectById(p.id)||p,wj=getJob(cur,"write",chapterId),pj=getJob(cur,"plan",chapterId);
  return !!((wj&&wj.status==="interrupted")||(pj&&pj.status==="interrupted"));
}
async function waitForBookWriterReady(p,label){
  // Fließband-Prinzip: Ein kurzer Browser-Hintergrundstatus oder Netzwechsel darf den
  // Ganzbuchlauf nicht mehr beenden. Solange der Benutzer nicht stoppt, bleibt der
  // Lauf aktiv und setzt selbstständig fort, sobald Seite und Verbindung wieder bereit sind.
  while((document.hidden||navigator.onLine===false)&&(projectById(p.id)||p).bookWriter?.running){
    const cur=projectById(p.id)||p;
    cur.bookWriter.lastMessage=document.hidden?`${label}: Browser kurz im Hintergrund – wartet und setzt automatisch fort …`:`${label}: Verbindung kurz weg – wartet und setzt automatisch fort …`;
    writerBeat(cur);store.save({sync:false});if(project()?.id===cur.id&&!document.hidden)render();
    await sleep(1200);
  }
  const cur=projectById(p.id)||p;
  return !!cur.bookWriter?.running;
}
async function writerAttempt(p,c,label,fn){
  const delays=[2500,6000,12000,20000];
  const resetRetries=()=>{const cur=projectById(p.id)||p;for(const j of [getJob(cur,"write",c.id),getJob(cur,"plan",c.id)])if(j)j.retryCount=0;};
  for(let attempt=0;;attempt++){
    if(!await waitForBookWriterReady(p,label))return "stopped";
    const startedAt=Date.now();
    const ok=await fn(attempt);
    if(ok)return "ok";
    p=projectById(p.id)||p;
    if(!p.bookWriter?.running)return "stopped";
    const interrupted=writerJobInterrupted(p,c.id);
    if(!interrupted||attempt>=delays.length)return "failed";
    // Ein kurzer Wechsel in den Hintergrund oder zwischen WLAN/Mobilfunk beendet nicht
    // mehr den Buchlauf. Wir warten innerhalb desselben Fließbands und versuchen weiter.
    if(document.hidden||navigator.onLine===false||lastHiddenAt>=startedAt){
      resetRetries();attempt=-1;
      if(!await waitForBookWriterReady(p,label))return "stopped";
      await sleep(700);
      continue;
    }
    p.bookWriter.lastMessage=`${label}: Verbindung kurz unterbrochen – neuer Versuch in ${Math.round(delays[attempt]/1000)} Sek. …`;writerBeat(p);store.save();if(project()?.id===p.id)render();
    await sleep(delays[attempt]);
    p=projectById(p.id)||p;
    if(!p.bookWriter?.running)return "stopped";
  }
}
// Läuft gerade ein von Hand gestarteter Auftrag im selben Buch, wartet der Buchschreiber kurz statt abzubrechen.
async function waitWhileBusy(map,p,cid){while(map.has(jobKey(p.id,cid))&&(projectById(p.id)||p).bookWriter?.running)await sleep(1500);}
// Dasselbe, wenn der Auftrag in einem ANDEREN Fenster läuft (dort hält er das Schloss).
async function whileLockedElsewhere(p,label,run){
  for(;;){
    const out=await run();
    if(out!=="locked")return out;
    const cur=projectById(p.id)||p;if(!cur.bookWriter?.running)return false;
    cur.bookWriter.lastMessage=`${label}: wartet, bis das andere Fenster fertig ist …`;writerBeat(cur);store.save({sync:false});if(project()?.id===cur.id)render();
    await sleep(3000);
    if(!(projectById(p.id)||p).bookWriter?.running)return false;
  }
}
async function writeChapterInBookRun(p,c){
  lastJobError.delete(p.id);
  if(chapterNeedsPlan(c))return {result:"failed",message:`Kapitel ${c.number} hat noch keinen vollständig ausgearbeiteten Kapitelplan. Beende zuerst die Plan-Ausarbeitung.`};
  p.bookWriter.lastMessage=`Kapitel ${c.number} wird geschrieben …`;writerBeat(p);store.save();if(project()?.id===p.id)render();
  const r=await writerAttempt(p,c,`Kapitel ${c.number} schreiben`,()=>whileLockedElsewhere(p,`Kapitel ${c.number}`,async()=>{
    await waitWhileBusy(activeWriteRuntimes,p,c.id);
    const wj=getJob(projectById(p.id),"write",c.id);
    const resumeJob=!!wj&&["running","interrupted"].includes(wj.status);
    if(!resumeJob&&!chapterNeedsWriting(c))return true; // inzwischen anderweitig fertig geschrieben – nichts überschreiben
    const partial=!!String(c.content||"").trim()&&(!!c.writeIncomplete||resumeJob);
    return runChapterWriteJob(p.id,c.id,{continuation:partial,resume:resumeJob,managed:true});
  }));
  if(r!=="ok")return {result:r,message:`Kapitel ${c.number} konnte nicht vollständig geschrieben werden.${lastJobError.get(p.id)?` (${lastJobError.get(p.id)})`:""}`};
  if(!String(c.content||"").trim())return {result:"failed",message:`Kapitel ${c.number} ist leer geblieben.`};
  if(!p.bookWriter?.running)return {result:"stopped"};
  if(p.bookWriter.qualityPass){p.bookWriter.lastMessage=`Kapitel ${c.number}: literarische Qualitätsrunde …`;writerBeat(p);store.save();if(project()?.id===p.id)render();await polishWrittenChapter(p,c);}
  if(!p.bookWriter?.running)return {result:"stopped"};
  p.bookWriter.lastMessage=`Kapitel ${c.number}: Kontinuität wird gespeichert …`;writerBeat(p);store.save();if(project()?.id===p.id)render();await refreshChapterMemory(p,c);
  writerBeat(p);
  return {result:"ok"};
}
async function runBookWriterLoop(pid,partIndex=null){
  const partMode=partIndex!==null&&partIndex!==undefined;
  let p=projectById(pid);if(!p)return;
  const scope=()=>partMode?partChapterList(p,partIndex):(p.chapters||[]);
  const partOf=()=>partMode?ensurePartWorkflowShape(p).parts[partIndex]:null;
  activeBookWriterRuntimes.set(pid,{projectId:pid,partIndex:partMode?partIndex:null});
  let paused=false;
  try{
    while(true){
      p=projectById(pid)||p; // immer das aktuelle Buchobjekt verwenden
      if(!p.bookWriter?.running)break;
      const activeVid=activeBookVariant(p)?.id||"";
      if(p.bookWriter.variantId&&p.bookWriter.variantId!==activeVid){stopBookWriterNow(p,"Gestoppt: Die aktive Buchfassung wurde gewechselt.");store.save();break;}
      const missingPlan=scope().find(chapterNeedsPlan);
      if(missingPlan){stopBookWriterNow(p,`Wartet auf Plan-Ausarbeitung · Kapitel ${missingPlan.number} ist noch offen.`);store.save();break;}
      const c=scope().find(chapterNeedsWriting);if(!c)break;
      p.bookWriter.currentChapterId=c.id;p.bookWriter.currentChapterNumber=c.number;p.bookWriter.lastMessage=`Kapitel ${c.number} wird vorbereitet …`;writerBeat(p);if(!userIsEditing())rememberChapter(p,c.id,"write");store.save();if(project()?.id===p.id)render();
      const out=await writeChapterInBookRun(p,c);
      p=projectById(pid)||p;
      if(out.result==="paused"){
        // Sicherheitsnetz für ältere/unerwartete Unterbrechungspfade: der Lauf bleibt aktiv
        // und wird automatisch wieder aufgenommen – kein manuelles Neuladen nötig.
        paused=true;requireFreshSyncCheck();p.bookWriter.lastMessage="Kurz unterbrochen – Litterum setzt automatisch fort …";writerBeat(p);store.save();
        setTimeout(()=>{if(projectById(pid)?.bookWriter?.running)resumeWholeBookWriter();},900);
        break;
      }
      if(out.result==="stopped")break;
      if(out.result!=="ok")throw new Error(out.message||`Kapitel ${c.number} konnte nicht geschrieben werden.`);
      p.bookWriter.completed=scope().filter(ch=>!chapterNeedsWriting(ch)).length;p.bookWriter.currentChapterId=null;p.bookWriter.currentChapterNumber=0;advanceAfterChapterTask(p,c.id,"write");p.updatedAt=now();store.save();
      // Nur ein winziger UI-Atemzug; danach sofort das nächste offene Kapitel wie am Fließband.
      await sleep(120);
      p=projectById(pid)||p;
      if(p.bookWriter.stopAfterCurrent){p.bookWriter.running=false;p.bookWriter.ownerDeviceId="";p.bookWriter.stopAfterCurrent=false;p.bookWriter.lastMessage=partMode?"Nach dem aktuellen Kapitel gestoppt":"Nach dem letzten Kapitel gestoppt";if(partMode&&partOf())partOf().status="planned";store.save();break;}
    }
    p=projectById(pid)||p;
    if(!paused&&p.bookWriter?.running&&!scope().some(chapterNeedsWriting)){
      p.bookWriter.running=false;p.bookWriter.ownerDeviceId="";p.bookWriter.currentChapterId=null;p.bookWriter.currentChapterNumber=0;
      if(partMode){
        const part=partOf(),w=ensurePartWorkflowShape(p);
        p.bookWriter.targetPartIndex=null;p.bookWriter.lastMessage=`${part?.title||"Teil"} vollständig geschrieben`;if(part){part.status="written";part.qualityStatus="Teil fertig";}
        await refreshPartSummary(p,partIndex);
        if(w.parts[partIndex+1])w.parts[partIndex+1].status="ready";else if(p.bookPlan){p.bookPlan.status="ready";p.bookPlan.qualityStatus="Alle Romanteile vollständig geschrieben";}
      }else p.bookWriter.lastMessage="Buch vollständig geschrieben";
    }
  }catch(e){p=projectById(pid)||p;p.bookWriter.running=false;p.bookWriter.ownerDeviceId="";p.bookWriter.lastMessage=e.message||"Schreiben unterbrochen";if(partMode&&partOf())partOf().status="planned";toast(p.bookWriter.lastMessage,6000);}
  activeBookWriterRuntimes.delete(pid);p=projectById(pid)||p;p.updatedAt=now();store.save();
  if(project()?.id===pid){
    render();
    const part=partOf(),w=partMode?ensurePartWorkflowShape(p):null;
    if(paused)toast("Schreiben pausiert. Es geht automatisch weiter, sobald die App wieder aktiv ist.",5000);
    else if(partMode&&part?.status==="written")toast(`${part.title} ist vollständig geschrieben. ${w.parts[partIndex+1]?"Der nächste Teil ist jetzt freigeschaltet.":"Der Roman ist fertig."}`);
    else if(!partMode&&!p.bookWriter.running&&!p.chapters.some(chapterNeedsWriting))toast("Das Buch ist vollständig geschrieben.");
  }
}
async function startPartWriter(index){
  const p=project();
  const w=ensurePartWorkflowShape(p),part=w.parts[index];if(!p||!part||activeBookWriterRuntimes.has(p.id))return;
  if(part.status!=="planned"&&part.status!=="writing")return toast("Entwickle diesen Teil zuerst.");
  const list=partChapterList(p,index);if(!list.length)return toast("Dieser Teil enthält noch keine Kapitel.");
  const missingPlan=list.find(chapterNeedsPlan);if(missingPlan)return toast(`Arbeite zuerst alle Kapitelpläne dieses Teils aus. Kapitel ${missingPlan.number} ist noch offen.`);
  if(projectPlanningActive(p))return toast("Die Kapitelplan-Ausarbeitung läuft noch. Stoppe oder beende sie zuerst.");
  const next=list.find(chapterNeedsWriting);if(!next){part.status="written";await refreshPartSummary(p,index);if(w.parts[index+1])w.parts[index+1].status="ready";save();render();return;}
  p.bookWriter ||= {};if(p.bookWriter.running&&bookWriterRunsElsewhere(p))return toast("Dieser Teil wird gerade auf deinem anderen Gerät geschrieben.");
  const r=await runExclusive("writer-"+p.id,async()=>{
    part.status="writing";p.bookWriter.running=true;p.bookWriter.targetPartIndex=index;p.bookWriter.ownerDeviceId=myDeviceId();p.bookWriter.variantId=activeBookVariant(p)?.id||"";p.bookWriter.stopAfterCurrent=false;p.bookWriter.total=list.length;p.bookWriter.completed=list.filter(c=>!chapterNeedsWriting(c)).length;p.bookWriter.lastMessage=`${part.title} wird geschrieben`;writerBeat(p);store.save();render();
    await runBookWriterLoop(p.id,index);return true;
  });
  if(r==="locked")toast("Dieses Buch wird gerade in einem anderen Fenster geschrieben.");
}
function confirmDevelopWholeBook(planMode="fast"){
  const p=project();if(!p)return;
  if(!String(p.briefing?.raw||p.briefing?.summary||"").trim())return toast("Füge zuerst dein Buchbriefing ein.");
  const written=(p.chapters||[]).filter(c=>String(c.content||"").trim());
  if(written.length){
    modal(`<h2>Roman komplett neu entwickeln?</h2><p>Dieses Buch enthält bereits <strong>${written.length} geschriebene Kapitel</strong>. Litterum löscht geschriebenen Text niemals automatisch.</p><p class="small muted">Für einen echten Neustart lege bitte ein neues Buchprojekt an oder exportiere/lösche das bestehende Manuskript bewusst. So geht nichts verloren.</p><div class="modal-actions"><button class="ghost-btn" data-close>Schließen</button></div>`);
    return;
  }
  if((p.bookPlan?.status==="ready")||(p.chapters||[]).some(c=>String(c.plan||"").trim())){
    modal(`<h2>Romanplan neu entwickeln?</h2><p>Die bisherigen <strong>${(p.chapters||[]).length} leeren Kapitelpläne</strong> werden ersetzt. Manuskripttext ist nicht vorhanden und es geht kein geschriebener Roman verloren.</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="primary-btn" id="confirmRedevelop">Neu entwickeln</button></div>`);
    $("#confirmRedevelop").onclick=()=>{closeModal();developWholeBook({planMode});};return;
  }
  developWholeBook({planMode});
}
async function developWholeBook(options={}){
  const projectId=options.projectId||project()?.id;if(!projectId)return;
  const r=await runExclusive("dev-"+projectId,()=>developWholeBookInner({...options,projectId}));
  if(r==="locked"){if(!options.resume&&project()?.id===projectId)toast("Dieses Buch wird gerade in einem anderen Fenster entwickelt.");else if(options.resume)whenLockFree("dev-"+projectId,resumeInterruptedBookDevelopments);}
}
// Schnellweg (aus der ChatGPT-Fassung übernommen): Stehen im Briefing schon Kapitel, werden sie direkt übernommen.
function fastBookPlanFromBriefingAnalysis(p,analysis,creativeRestart=true){
  const ideas=Array.isArray(analysis?.chapterIdeas)?analysis.chapterIdeas:[];
  if(!ideas.length)return null;
  const parts=[];
  let current=null,globalNo=0;
  const startPart=(title,purpose="")=>{
    current={title:String(title||`Teil ${parts.length+1}`).trim()||`Teil ${parts.length+1}`,purpose:String(purpose||"").trim(),arc:"",chapters:[]};
    parts.push(current);
    return current;
  };
  const partHeading=/^(?:teil|part|akt|act)\s+(?:[ivxlcdm]+|\d+)\b/i;
  const metaHeading=/^(?:figuren|charaktere|personen|beziehungen|stil|stilregeln|regeln|welt|worldbuilding|sprache|ton|perspektive|roman[ -]?dna|briefing|notizen|hinweise|themen?)\b/i;
  for(const raw of ideas){
    const title=String(raw?.title||"").trim(),plan=String(raw?.plan||"").trim();
    if(!title&&!plan)continue;
    if(title&&partHeading.test(title)){
      startPart(title,plan);
      continue;
    }
    if(title&&metaHeading.test(title))continue;
    current ||= startPart("Roman",analysis?.summary||p?.briefing?.summary||"");
    globalNo++;
    current.chapters.push({
      number:globalNo,
      title:title||`Kapitel ${globalNo}`,
      perspective:"",location:"",sceneGoal:plan||title||"",emotionalMove:"",newInformation:"",withhold:"",relationshipMovement:"",consequence:"",bridge:"",development:""
    });
  }
  const cleanParts=parts.filter(x=>Array.isArray(x.chapters)&&x.chapters.length);
  if(!cleanParts.length)return null;
  return {
    bookVision:String(analysis?.summary||p?.briefing?.summary||p?.dna?.premise||"").trim(),
    centralPlot:String(p?.dna?.premise||analysis?.summary||p?.briefing?.summary||"").trim(),
    creativeRestart:creativeRestart!==false,
    estimatedWordCount:Number(p?.dna?.targetWords)||0,
    qualityStatus:"Kapitel direkt aus der Briefinganalyse erstellt",
    parts:cleanParts,
    characterArcs:[],mysteryMap:[],qualityNotes:["Schnellplan aus der bereits vorhandenen Briefinganalyse. Einzelne Kapitel können anschließend separat ausgearbeitet werden."]
  };
}
async function developWholeBookInner(options={}){
  const projectId=options.projectId||project()?.id,resume=!!options.resume;
  const p=projectById(projectId);if(!p||activeBookDevelopmentRuntimes.has(p.id))return;
  let job=p.bookDevelopmentJob;
  let creativeRestart;
  const resumeJob=!!job&&job.mode==="whole"&&(resume||job.status==="paused");
  if(resumeJob&&job.status==="paused")job.retryCount=0;
  if(!resumeJob){
    creativeRestart=$("#creativeRestart")?.checked ?? p.bookPlan?.creativeRestart!==false;
    job=p.bookDevelopmentJob={mode:"whole",planMode:options.planMode==="deep"?"deep":"fast",status:"running",phase:"analysis",partIndex:0,architecture:null,pendingPart:null,creativeRestart,retryCount:0,lastError:"",startedAt:now(),updatedAt:now()};
    p.bookPlan={status:"analyzing",creativeRestart,qualityStatus:"Briefing wird verstanden …",parts:[]};
  }else{
    creativeRestart=job.creativeRestart!==false;job.status="running";job.lastError="";job.updatedAt=now();
    p.bookPlan ||= {status:"analyzing",creativeRestart,qualityStatus:"Gespeicherten Entwicklungsstand wird fortgesetzt …",parts:[]};
    p.bookPlan.status=["ready","error"].includes(p.bookPlan.status)?"developing":p.bookPlan.status;
    p.bookPlan.qualityStatus="Gespeicherten Entwicklungsstand wird fortgesetzt …";
  }
  activeBookDevelopmentRuntimes.set(p.id,{projectId:p.id,mode:"whole"});
  p.updatedAt=now();store.save();if(project()?.id===p.id)render();
  try{
    if(!p.briefing?.analysis){
      job.phase="analysis";job.updatedAt=now();store.save();
      const analysis=await withDevelopmentActivity(job,"KI analysiert das Briefing",()=>analyzeBriefingForProject(p,info=>{
        p.bookPlan ||= {};p.bookPlan.status="analyzing";p.bookPlan.qualityStatus=info.stage==="merge"?"Roman-DNA wird zusammengeführt …":info.stage==="chapters"?`Kapitelstruktur wird schnell vervollständigt · Ziel ${info.total} Kapitel …`:`Briefing wird analysiert · ${info.completed}/${info.total}`;job.updatedAt=now();p.updatedAt=now();store.save();
        if(project()?.id===p.id&&state.activeTab==="studio")render();
      }));
      applyBriefingData(p,analysis,{navigate:false});job.chaptersExpanded=true;job.retryCount=0;job.updatedAt=now();store.save();
    }

    // Sofort-Kapitel: Kapitelideen aus dem Briefing direkt übernehmen (Sekunden statt Minuten).
    let fastPlan=null;
    if(job.planMode!=="deep"&&!job.architecture){
      // Zu wenige Kapitel im Briefing erkannt: einmal schnell auf die gewünschte Kapitelzahl ergänzen.
      const chapterCheck=chapterIdeasNeedExpansion(p,p.briefing?.analysis);
      if(p.briefing?.analysis&&chapterCheck.needed&&!job.chaptersExpanded){
        job.phase="chapters";job.updatedAt=now();
        p.bookPlan={status:"developing",creativeRestart,qualityStatus:`Kapitelstruktur wird schnell vervollständigt · Ziel ${chapterCheck.target} Kapitel …`,parts:[]};p.updatedAt=now();store.save();if(project()?.id===p.id)render();
        const expanded=await withDevelopmentActivity(job,"KI ergänzt die Kapitelstruktur",()=>expandChapterIdeasOnce(p,p.briefing.analysis,()=>{}));
        const lp=liveProject(p)||p;lp.briefing ||= {};lp.briefing.analysis=expanded;lp.briefing.lastAnalyzed=now();job.chaptersExpanded=true;p.updatedAt=now();store.save();
      }
      fastPlan=fastBookPlanFromBriefingAnalysis(p,p.briefing?.analysis,creativeRestart);
      if(!fastPlan){job.planMode="deep";p.bookPlan={status:"developing",creativeRestart,qualityStatus:"Im Briefing stehen keine Kapitel – die KI entwickelt sie jetzt selbst (dauert ein paar Minuten) …",parts:[]};store.save();if(project()?.id===p.id)render();}
    }
    let architecture=job.architecture;
    if(!fastPlan){
    if(!architecture){
      job.phase="architecture";p.bookPlan={status:"developing",creativeRestart,qualityStatus:"Gesamtarchitektur des Romans wird entwickelt …",parts:[]};job.updatedAt=now();store.save();if(project()?.id===p.id)render();
      architecture=await withDevelopmentActivity(job,"Gesamtarchitektur wird aufgebaut",()=>apiData("develop_book_architecture",{fullBriefing:String(p.briefing?.raw||"").slice(0,70000)}, {projectOverride:p,planningProject:true}));
      const metas=Array.isArray(architecture?.parts)?architecture.parts:[];
      if(!metas.length)throw new Error("Die KI hat keine brauchbaren Romanteile erzeugt.");
      job.architecture=architecture;job.partIndex=0;job.pendingPart=null;job.retryCount=0;job.updatedAt=now();
      p.bookPlan={...architecture,status:"developing",creativeRestart,qualityStatus:`Kapitel werden in kleinen Paketen entwickelt · 0/${metas.length} Teile`,parts:metas.map(x=>({...x,chapters:[]}))};
      p.updatedAt=now();store.save();if(project()?.id===p.id)render();
    }else{
      const metas=Array.isArray(architecture?.parts)?architecture.parts:[];
      if(!metas.length)throw new Error("Der gespeicherte Romanbogen enthält keine Romanteile.");
      if(!Array.isArray(p.bookPlan?.parts)||p.bookPlan.parts.length!==metas.length){
        const oldParts=Array.isArray(p.bookPlan?.parts)?p.bookPlan.parts:[];
        p.bookPlan={...architecture,...(p.bookPlan||{}),status:"developing",creativeRestart,parts:metas.map((x,i)=>oldParts[i]||({...x,chapters:[]}))};
        store.save();
      }
    }

    const metas=architecture.parts;
    const targetOf=i=>Math.max(5,Math.min(24,Number(metas[i]?.targetChapters)||12));
    // Stände älterer Versionen übernehmen: fertige Teile vor dem damals laufenden Teil gelten als fertig,
    // ein halb geplanter Teil (pendingPart) wird dort fortgesetzt.
    const legacyIndex=Number(job.partIndex)||0;
    metas.forEach((meta,i)=>{
      const bp=p.bookPlan.parts[i] ||= {...meta,chapters:[]};
      if(!Array.isArray(bp.chapters))bp.chapters=[];
      if(bp.planned===undefined&&bp.chapters.length&&(i<legacyIndex||bp.chapters.length>=targetOf(i)))bp.planned=true;
      if(i===legacyIndex&&!bp.planned&&Array.isArray(job.pendingPart?.chapters)&&job.pendingPart.chapters.length>bp.chapters.length)bp.chapters=job.pendingPart.chapters.slice();
    });
    job.pendingPart=null;job.phase="develop_parts";job.updatedAt=now();store.save();
    const totalTarget=metas.reduce((n,_,i)=>n+targetOf(i),0);
    const progressText=()=>{const parts=p.bookPlan.parts,planned=parts.reduce((n,x)=>n+(x.chapters?.length||0),0),done=parts.filter(x=>x.planned).length;return `${planned} von ca. ${totalTarget} Kapiteln geplant · ${done}/${metas.length} Teile fertig · die Kapitel erscheinen, sobald der Plan komplett ist`;};
    // Alle Romanteile werden GLEICHZEITIG geplant (höchstens 5 auf einmal), jeder Teil in Paketen zu
    // 6 Kapiteln. Den Übergang zwischen den Teilen gibt die Gesamtarchitektur vor. Nach jedem Paket wird
    // gespeichert – eine Unterbrechung kostet höchstens das gerade laufende Paket.
    let failure=null;
    const planPart=async i=>{
      const bp=p.bookPlan.parts[i],meta=metas[i],target=targetOf(i);
      while(!failure&&bp.chapters.length<target){
        const startChapter=bp.chapters.length+1,batchSize=Math.min(6,target-bp.chapters.length);
        const prev=i?p.bookPlan.parts[i-1]:null;
        const previousPart=i?(prev?.planned?prev:{...metas[i-1],chapters:[]}):null;
        const batch=await apiData("develop_book_part_batch",{
          architecture,partMeta:meta,partIndex:i,previousPart,
          existingChapters:bp.chapters,startChapter,batchSize,targetChapters:target
        },{projectOverride:p,planningProject:true});
        const items=Array.isArray(batch?.chapters)?batch.chapters:[];
        if(!items.length)throw new Error(`Teil ${i+1}: Für Kapitel ${startChapter}–${startChapter+batchSize-1} wurde kein brauchbarer Plan geliefert.`);
        bp.chapters.push(...items.slice(0,batchSize).map((c,k)=>({...c,number:startChapter+k})));
        job.retryCount=0;job.updatedAt=now();p.updatedAt=now();p.bookPlan.qualityStatus=progressText();store.save();
        if(project()?.id===p.id&&state.activeTab==="studio")render();
      }
      if(!failure){bp.planned=true;p.bookPlan.qualityStatus=progressText();store.save();}
    };
    const open=metas.map((_,i)=>i).filter(i=>!p.bookPlan.parts[i].planned);
    if(open.length){
      p.bookPlan.status="developing";p.bookPlan.qualityStatus=progressText();
      job.activeRequestStartedAt=now();job.activeRequestLabel=open.length>1?`KI plant ${Math.min(5,open.length)} Romanteile gleichzeitig`:"KI plant die Kapitel";job.updatedAt=now();store.save();
      if(project()?.id===p.id)render();
      const queue=[...open];
      const worker=async()=>{while(!failure&&queue.length){const i=queue.shift();try{await planPart(i);}catch(e){failure ||= e;}}};
      try{await Promise.all(Array.from({length:Math.min(5,queue.length)},worker));}
      finally{job.activeRequestStartedAt="";job.activeRequestLabel="";job.updatedAt=now();store.save();}
      if(failure)throw failure;
    }
    for(let i=0;i<metas.length;i++)p.bookPlan.parts[i]={...metas[i],...p.bookPlan.parts[i],chapters:p.bookPlan.parts[i].chapters};
    job.partIndex=metas.length;
    }

    job.phase="finalize";job.updatedAt=now();store.save();
    const finalPlan=fastPlan||p.bookPlan;
    finalPlan.status="ready";finalPlan.creativeRestart=creativeRestart;finalPlan.createdAt=now();
    if(!fastPlan)finalPlan.qualityStatus="Von der KI dramaturgisch entwickelt (alle Teile parallel, nach jedem Paket gespeichert)";
    const chapters=flattenBookPlan(finalPlan);
    if(!chapters.length)throw new Error("Der Romanplan enthält keine echten Kapitel.");
    p.bookPlan=finalPlan;p.chapters=chapters;p.bookMemory={facts:[],openThreads:[],characterStates:[],relationshipStates:[],lastChapterNumber:0,lastUpdated:""};
    p.bookWriter={running:false,stopAfterCurrent:false,qualityPass:true,currentChapterId:null,currentChapterNumber:0,completed:0,total:chapters.length,lastMessage:"Bereit zum Schreiben",ownerDeviceId:""};
    p.ui ||= {};p.ui.planChapterId=chapters[0].id;p.ui.writeChapterId=chapters[0].id;p.ui.lastChapterId=chapters[0].id;if(project()?.id===p.id){state.activeChapterId=chapters[0].id;state.activeTab="studio";}
    p.bookDevelopmentJob=null;p.updatedAt=now();store.save();activeBookDevelopmentRuntimes.delete(p.id);if(project()?.id===p.id){render();toast(fastPlan?`${chapters.length} Kapitel sofort aus deinem Briefing übernommen.`:`${chapters.length} Kapitel von der KI entwickelt. Plan ist bereit.`);}
    scheduleDevelopmentResume(350);
  }catch(e){
    const current=projectById(projectId)||p;const j=current.bookDevelopmentJob||job;
    if(isTransientApiError(e)){
      j.retryCount=Number(j.retryCount||0)+1;j.lastError=e.message||"Verbindung unterbrochen";j.updatedAt=now();
      current.bookPlan ||= {};
      if(j.retryCount>=8){
        // Nicht endlos weiter anfragen (z. B. Anbieter gestört oder Guthaben leer): pausieren, Fortschritt behalten.
        j.status="paused";current.bookPlan.status="error";current.bookPlan.qualityStatus=`Die KI war mehrmals nicht erreichbar (${j.lastError}). Der bisherige Fortschritt ist gespeichert – „Erneut versuchen“ setzt genau dort fort`;
        current.updatedAt=now();store.save();activeBookDevelopmentRuntimes.delete(current.id);if(project()?.id===current.id){render();toast(current.bookPlan.qualityStatus,7000);}return;
      }
      j.status="interrupted";
      current.bookPlan.status="developing";current.bookPlan.qualityStatus=developmentPausedMessage();current.updatedAt=now();store.save();activeBookDevelopmentRuntimes.delete(current.id);
      if(project()?.id===current.id){render();if(j.retryCount===1)toast("Fortschritt gespeichert. Du kannst die App verlassen; beim Zurückkehren wird automatisch fortgesetzt.");}
      scheduleDevelopmentResume(Math.min(60000,1500*2**(j.retryCount-1)));return;
    }
    current.bookPlan ||= {};current.bookPlan.status="error";current.bookPlan.qualityStatus=e.message||"Entwicklung fehlgeschlagen";current.bookDevelopmentJob=null;current.updatedAt=now();store.save();activeBookDevelopmentRuntimes.delete(current.id);if(project()?.id===current.id){render();toast(e.message||"Buchentwicklung fehlgeschlagen");}
  }
}
function mergeUniqueTextList(base,items){
  const out=[...(Array.isArray(base)?base:[])];
  for(const raw of items||[]){const v=String(raw||"").trim();if(!v)continue;if(!out.some(x=>String(x).trim().toLocaleLowerCase("de-DE")===v.toLocaleLowerCase("de-DE")))out.push(v);}
  return out;
}
function applyChapterDigest(p,c,d){
  if(!d||!p||!c)return;
  c.memory=String(d.chapterMemory||c.memory||"").trim();
  p.bookMemory ||= {facts:[],openThreads:[],characterStates:[],relationshipStates:[],lastChapterNumber:0,lastUpdated:""};
  p.bookMemory.facts=mergeUniqueTextList(p.bookMemory.facts,d.canonFacts||[]);
  let threads=mergeUniqueTextList(p.bookMemory.openThreads,d.openThreads||[]);
  for(const resolved of d.resolvedThreads||[]){const r=String(resolved||"").toLocaleLowerCase("de-DE");if(!r)continue;threads=threads.filter(x=>{const y=String(x).toLocaleLowerCase("de-DE");return !(y===r||y.includes(r)||r.includes(y));});}
  p.bookMemory.openThreads=threads;
  for(const st of d.characterStates||[]){if(!st?.name)continue;const old=p.bookMemory.characterStates.find(x=>String(x.name).toLocaleLowerCase("de-DE")===String(st.name).toLocaleLowerCase("de-DE"));if(old)old.state=st.state||old.state;else p.bookMemory.characterStates.push({name:st.name,state:st.state||""});}
  for(const st of d.relationshipStates||[]){if(!st?.pair)continue;const old=p.bookMemory.relationshipStates.find(x=>String(x.pair).toLocaleLowerCase("de-DE")===String(st.pair).toLocaleLowerCase("de-DE"));if(old)old.state=st.state||old.state;else p.bookMemory.relationshipStates.push({pair:st.pair,state:st.state||""});}
  c.continuityWarnings=Array.isArray(d.continuityWarnings)?d.continuityWarnings:[];
  c.styleWarnings=Array.isArray(d.styleWarnings)?d.styleWarnings:[];
  p.bookMemory.lastChapterNumber=c.number;p.bookMemory.lastUpdated=now();
}
async function polishWrittenChapter(p,c){
  if(!p?.bookWriter?.qualityPass||!String(c?.content||"").trim())return false;
  const original=c.content,oldWords=countWords(original);
  try{
    const polished=String(await api("polish_chapter",{chapter:{number:c.number,title:c.title,plan:c.plan,memory:c.memory,content:original}},{projectOverride:p})||"").trim();
    const newWords=countWords(polished);
    if(polished&&newWords>=Math.max(250,oldWords*.65)&&newWords<=oldWords*1.55){c.content=polished;c.status="Entwurf";p.updatedAt=now();store.save();return true;}
  }catch{}
  return false;
}
async function refreshChapterMemory(p,c,{fast=false}={}){
  try{const d=await apiData("chapter_digest",{chapter:{number:c.number,title:c.title,plan:c.plan,memory:c.memory,content:c.content},fast},{projectOverride:p});applyChapterDigest(p,c,d);p.updatedAt=now();store.save();return true;}catch{return false;}
}

function planRunnerOwnsJobs(p){return !!p?.planRunner?.running;}
async function runPlanRunnerLoop(pid){
  let p=projectById(pid);if(!p)return;
  const runner=p.planRunner||(p.planRunner={running:false,stopAfterCurrent:false,currentChapterId:null,currentChapterNumber:0,completed:0,total:0,lastMessage:""});
  activePlanRunnerRuntimes.set(pid,{projectId:pid});
  try{
    while(runner.running){
      p=projectById(pid)||p;const r=p.planRunner;
      if(!r?.running)break;
      const activeVid=activeBookVariant(p)?.id||"";
      if(r.variantId&&r.variantId!==activeVid){r.running=false;r.stopAfterCurrent=false;r.lastMessage="Gestoppt: Die aktive Buchfassung wurde gewechselt.";store.save();break;}
      if(projectWritingActive(p)){r.running=false;r.lastMessage="Gestoppt: Buchschreiben ist aktiv.";store.save();break;}
      const c=(p.chapters||[]).find(chapterNeedsPlan);
      if(!c){r.running=false;r.stopAfterCurrent=false;r.currentChapterId=null;r.currentChapterNumber=0;r.completed=p.chapters.length;r.lastMessage="Alle Kapitelpläne sind ausgearbeitet";store.save();break;}
      r.currentChapterId=c.id;r.currentChapterNumber=c.number;r.completed=p.chapters.filter(ch=>!chapterNeedsPlan(ch)).length;r.total=p.chapters.length;r.lastMessage=`Kapitel ${c.number} wird ausgearbeitet …`;
      if(!userIsEditing())rememberChapter(p,c.id,"plan");store.save();if(project()?.id===pid)render();
      let tries=0,lockTries=0,done=false;
      while(r.running&&!done){
        let j=getJob(p,"plan",c.id);
        // Selbstheilung für bereits gespeicherte Altzustände: „wartet“ + 0 erzeugte Wörter bedeutet,
        // dass es keinen nutzbaren Zwischenstand gibt. Dann nicht denselben kaputten Auftrag fortsetzen,
        // sondern exakt wie bei einem frischen, funktionierenden Buch neu starten.
        if(j&&j.status==="interrupted"&&!String(j.partialPlan||"").trim()&&Number(j.liveWords||0)===0){setJob(p,"plan",c.id,null);store.save({sync:false});j=null;}
        const resume=!!j&&["running","interrupted"].includes(j.status);
        const out=await runPlanJob(pid,c.id,{resume,managed:true});
        p=projectById(pid)||p;
        if(!p.planRunner?.running)break;
        if(out===true){done=true;break;}
        if(out==="locked"){
          lockTries++;
          // Früher konnte der automatische Planlauf hier endlos auf einem alten Browser-/Tab-Schloss
          // warten. Nach rund 30 Sekunden wird der Zustand jetzt sauber gelöst statt minutenlang bei
          // „wartet“ stehenzubleiben. Der bisherige Zwischenstand bleibt im Plan-Job erhalten.
          if(lockTries>=8){
            const blocked=getJob(p,"plan",c.id);
            if(blocked){blocked.status="interrupted";blocked.manualPause=true;blocked.lastError="Ein anderer Litterum-Tab blockiert den Planauftrag.";blocked.heartbeatAt=now();}
            p.planRunner.running=false;p.planRunner.stopAfterCurrent=false;p.planRunner.lastMessage=`Kapitel ${c.number} wurde gestoppt: Ein anderes Litterum-Fenster blockiert den Auftrag. Schließe weitere Litterum-Tabs und starte die Plan-Ausarbeitung erneut.`;
            p.updatedAt=now();store.save();if(project()?.id===pid){render();toast("Plan-Ausarbeitung gestoppt: Ein anderes Litterum-Fenster blockiert den Auftrag. Der Zwischenstand ist gespeichert.",7000);}return;
          }
          p.planRunner.lastMessage=`Kapitel ${c.number}: wartet kurz auf einen blockierten Auftrag … (${lockTries}/8)`;store.save();await sleep(Math.min(4500,800*lockTries));continue;
        }
        lockTries=0;
        const interrupted=getJob(p,"plan",c.id)?.status==="interrupted";
        if(interrupted&&(document.hidden||navigator.onLine===false)){p.planRunner.lastMessage="Pausiert. Sobald Litterum wieder aktiv und online ist, geht es an derselben Stelle weiter.";store.save();if(project()?.id===pid)render();return;}
        if(interrupted&&tries<3){tries++;const why=lastJobError.get(pid)||"kurze Unterbrechung";p.planRunner.lastMessage=`Kapitel ${c.number}: ${why} · neuer Versuch ${tries}/3 …`;store.save();if(project()?.id===pid)render();await sleep(Math.min(4200,700*tries));continue;}
        throw new Error(lastJobError.get(pid)||`Kapitel ${c.number} konnte nicht vollständig ausgearbeitet werden.`);
      }
      p=projectById(pid)||p;const live=p.planRunner;
      if(!live?.running)break;
      live.completed=p.chapters.filter(ch=>!chapterNeedsPlan(ch)).length;live.currentChapterId=null;live.currentChapterNumber=0;advanceAfterChapterTask(p,c.id,"plan");store.save();
      if(live.stopAfterCurrent){live.running=false;live.stopAfterCurrent=false;live.lastMessage=`Nach Kapitel ${c.number} gestoppt`;store.save();break;}
    }
  }catch(e){p=projectById(pid)||p;if(p?.planRunner){p.planRunner.running=false;p.planRunner.stopAfterCurrent=false;p.planRunner.lastMessage=readableError(e,"Plan-Ausarbeitung unterbrochen");store.save();}if(project()?.id===pid)toast(p?.planRunner?.lastMessage||"Plan-Ausarbeitung unterbrochen",6000);}
  finally{activePlanRunnerRuntimes.delete(pid);p=projectById(pid)||p;if(p){p.updatedAt=now();store.save();}if(project()?.id===pid)render();}
}
async function startAllPlanExpansion(){
  const p=project();if(!p)return;
  repairFinishedProcessFlags(p);
  if(!p.chapters?.length||!p.bookPlan||p.bookPlan.status!=="ready")return toast("Entwickle zuerst diesen Band. Andere Bände der Reihe müssen dafür nicht fertig sein.");
  if(projectWritingActive(p))return toast("Buchschreiben dieses Bandes läuft gerade. Stoppe es zuerst, bevor Kapitelpläne ausgearbeitet werden.");
  if(p.planRunner?.running||activePlanRunnerRuntimes.has(p.id))return;
  const next=p.chapters.find(chapterNeedsPlan);if(!next)return toast("Alle Kapitelpläne sind bereits ausgearbeitet.");
  // Ein alter unterbrochener Auftrag OHNE einen einzigen erzeugten Plantext bringt beim Neustart nichts.
  // Genau dieser Zustand zeigte sich bei Band 2 als „Plan K1 · wartet“. In diesem Fall starten wir sauber
  // neu, wie bei den Büchern, deren Plan-Ausarbeitung problemlos funktioniert hat. Echte Teilpläne bleiben erhalten.
  const oldPlanJob=getJob(p,"plan",next.id);
  if(oldPlanJob&&oldPlanJob.status==="interrupted"&&!String(oldPlanJob.partialPlan||"").trim()&&Number(oldPlanJob.liveWords||0)===0)setJob(p,"plan",next.id,null);
  p.planRunner ||= {};Object.assign(p.planRunner,{running:true,stopAfterCurrent:false,currentChapterId:next.id,currentChapterNumber:next.number,completed:p.chapters.filter(ch=>!chapterNeedsPlan(ch)).length,total:p.chapters.length,lastMessage:`Kapitel ${next.number} wird vorbereitet …`,startedAt:now(),variantId:activeBookVariant(p)?.id||""});
  p.updatedAt=now();store.save();render();resumePlanRunner();
}
function stopPlanRunnerNow(){
  const p=project();if(!p)return;
  const hasRuntime=projectRunsJobs("plan",p.id);if(!p.planRunner?.running&&!hasRuntime)return;
  p.planRunner ||= {};p.planRunner.running=false;p.planRunner.stopAfterCurrent=false;p.planRunner.lastMessage="Sofort gestoppt. Der aktuelle Zwischenstand ist gespeichert.";
  // Auch ein Auftrag, der nur noch als „wartet/unterbrochen“ gespeichert ist, wird wirklich angehalten.
  // So springt er nach dem Stoppen nicht unbemerkt wieder an. Beim nächsten Start wird genau dieser
  // Zwischenstand wieder aufgenommen.
  for(const j of Object.values(p.planJobs||{})){
    if(!j||!["running","interrupted"].includes(j.status))continue;
    j.status="interrupted";j.manualPause=true;j.lastError="Manuell sofort gestoppt";j.heartbeatAt=now();
  }
  abortRuntimeMapForProject(activePlanRuntimes,p.id);p.updatedAt=now();store.save();render();toast("Kapitelplan-Ausarbeitung sofort gestoppt. Der Zwischenstand bleibt erhalten.",5000);
}
function stopPlanRunnerAfterCurrent(){
  const p=project();if(!p?.planRunner?.running)return;
  p.planRunner.stopAfterCurrent=true;p.planRunner.lastMessage="Stoppt nach dem aktuellen Kapitel …";p.updatedAt=now();store.save();render();
}
function resumePlanRunner(){
  if(document.hidden||store.readOnly||navigator.onLine===false||!state.activeProjectId)return;
  const p=projectById(state.activeProjectId);if(!p?.planRunner?.running||activePlanRunnerRuntimes.has(p.id))return;
  const activeVid=activeBookVariant(p)?.id||"";
  if(p.planRunner.variantId&&p.planRunner.variantId!==activeVid){p.planRunner.running=false;p.planRunner.stopAfterCurrent=false;p.planRunner.lastMessage="Gestoppt: Die aktive Buchfassung wurde gewechselt.";store.save();if(project()?.id===p.id)render();return;}
  if(projectWritingActive(p)){p.planRunner.running=false;p.planRunner.lastMessage="Gestoppt: Buchschreiben ist aktiv.";store.save();if(project()?.id===p.id)render();return;}
  const pid=p.id;activePlanRunnerRuntimes.set(pid,{projectId:pid,pending:true});
  setTimeout(async()=>{
    // Der einzelne Kapitelauftrag besitzt weiterhin sein eigenes Tab-Schloss. Ein zusätzliches Schloss
    // um den gesamten Plan-Runner konnte nach älteren/zweiten Band-Aufträgen jedoch dauerhaft „wartet“
    // anzeigen, obwohl gar keine KI-Anfrage mehr lief. Deshalb läuft nur der Runner selbst ohne Extra-Lock.
    try{await runPlanRunnerLoop(pid);}
    finally{if(activePlanRunnerRuntimes.get(pid)?.pending)activePlanRunnerRuntimes.delete(pid);}
  },250);
}

function queueWholeBookWriterRestart(pid){
  if(!pid||pendingBookWriterRestarts.has(pid))return;
  pendingBookWriterRestarts.add(pid);
  const started=Date.now();
  const tick=()=>{
    const p=projectById(pid);
    if(!p){pendingBookWriterRestarts.delete(pid);return;}
    if(!activeBookWriterRuntimes.has(pid)){
      pendingBookWriterRestarts.delete(pid);
      if(state.activeProjectId===pid)startWholeBookWriter();
      return;
    }
    // Nach „Sofort stoppen“ kann der alte Runner noch wenige Augenblicke auslaufen.
    // Falls dabei kein echter Kapitel-Stream mehr lebt, lösen wir nur den verwaisten lokalen
    // Runner-Marker. Kapiteltext und gespeicherte Jobs werden dabei nicht verändert.
    if(Date.now()-started>5000&&!projectRunsJobs("write",pid)&&!p.bookWriter?.running){
      activeBookWriterRuntimes.delete(pid);
      pendingBookWriterRestarts.delete(pid);
      if(state.activeProjectId===pid)startWholeBookWriter();
      return;
    }
    setTimeout(tick,250);
  };
  tick();
}
async function startWholeBookWriter(){
  const p=project();if(!p)return;
  repairFinishedProcessFlags(p);
  if(activeBookWriterRuntimes.has(p.id)){
    if(!p.bookWriter?.running){
      p.bookWriter ||= {};p.bookWriter.lastMessage="Automatisches Weiterschreiben wird vorbereitet …";p.updatedAt=now();store.save({sync:false});if(project()?.id===p.id)render();queueWholeBookWriterRestart(p.id);return;
    }
    return toast("Das Buch wird bereits automatisch Kapitel für Kapitel geschrieben.");
  }
  if(!p.bookPlan||p.bookPlan.status!=="ready")return toast("Der Romanplan dieses Buches ist noch nicht bereit. Andere Bände der Reihe müssen dafür nicht fertig sein.");
  if(projectPlanningActive(p))return toast("Die Kapitelplan-Ausarbeitung dieses Buches läuft noch. Andere Bände der Reihe blockieren das Schreiben nicht.");
  const missingPlan=(p.chapters||[]).find(chapterNeedsPlan);if(missingPlan)return toast(`Buch schreiben startet erst, wenn alle Kapitelpläne ausgearbeitet sind. Kapitel ${missingPlan.number} ist noch offen.`);
  if(p.bookReviser?.running)return toast("Bitte warte, bis „Buch überarbeiten“ fertig ist oder gestoppt wurde.");
  const next=(p.chapters||[]).find(chapterNeedsWriting);
  if(!next)return toast("Das ganze Buch ist bereits geschrieben.");
  // Ein manuell gestoppter Teilauftrag darf das Ganzbuch-Fließband beim Fortsetzen nicht blockieren.
  // Wir geben nur die Pause frei; vorhandener Teiltext bleibt erhalten und wird sauber zu Ende geschrieben.
  for(const c of p.chapters||[]){const j=getJob(p,"write",c.id);if(j?.status==="interrupted"&&j.manualPause){j.manualPause=false;j.retryCount=0;}}
  p.bookWriter ||= {};
  if(p.bookWriter.running&&bookWriterRunsElsewhere(p))return toast("Das Buch wird gerade auf deinem anderen Gerät geschrieben.");
  const r=await runExclusive("writer-"+p.id,async()=>{
    if(projectPlanningActive(p))return false;
    p.bookWriter.running=true;p.bookWriter.startedAt=now();p.bookWriter.targetPartIndex=null;p.bookWriter.ownerDeviceId=myDeviceId();p.bookWriter.variantId=activeBookVariant(p)?.id||"";p.bookWriter.stopAfterCurrent=false;p.bookWriter.total=p.chapters.length;p.bookWriter.completed=p.chapters.filter(c=>!chapterNeedsWriting(c)).length;p.bookWriter.lastMessage=`Automatisches Buchschreiben gestartet · ab Kapitel ${next.number}`;writerBeat(p);store.save();
    render();
    await runBookWriterLoop(p.id,null);return true;
  });
  if(r==="locked")toast("Dieses Buch wird gerade in einem anderen Fenster geschrieben.");
}
function stopBookWriterNow(p,message){
  const w=p.bookWriter;w.running=false;w.stopAfterCurrent=false;w.ownerDeviceId="";w.currentChapterId=null;w.currentChapterNumber=0;w.lastMessage=message;
  if(Number.isInteger(w.targetPartIndex)){const part=ensurePartWorkflowShape(p).parts[w.targetPartIndex];if(part&&part.status==="writing")part.status="planned";}
}
async function writerLockHeldElsewhere(pid){
  try{const q=await navigator.locks?.query?.();return !!q?.held?.some(l=>l.name==="story-studio:writer-"+pid);}catch{return false;}
}
async function stopWholeBookWriterNow(){
  const p=project();if(!p)return;
  const runtimeActive=activeBookWriterRuntimes.has(p.id)||projectRunsJobs("write",p.id);
  if(!p.bookWriter?.running&&!runtimeActive)return toast("Das Buchschreiben läuft gerade nicht.");
  p.bookWriter ||= idleVariantBookWriter(p,(p.chapters||[]).length);
  stopBookWriterNow(p,"Sofort gestoppt. Der aktuelle Zwischenstand ist gespeichert.");
  for(const j of Object.values(p.writeJobs||{})){if(!j||!["running","interrupted"].includes(j.status))continue;j.status="interrupted";j.manualPause=true;j.lastError="Manuell sofort gestoppt";j.heartbeatAt=now();}
  abortRuntimeMapForProject(activeWriteRuntimes,p.id);
  p.updatedAt=now();store.save();render();
  toast("Buchschreiben sofort gestoppt. Der Zwischenstand bleibt erhalten.",5000);
}
async function stopWholeBookWriterAfterCurrent(){
  const p=project();if(!p)return;
  const runtimeActive=activeBookWriterRuntimes.has(p.id)||projectRunsJobs("write",p.id);
  if(!p.bookWriter?.running&&!runtimeActive)return toast("Das Buchschreiben läuft gerade nicht.");
  p.bookWriter ||= idleVariantBookWriter(p,(p.chapters||[]).length);
  const runtime=activeBookWriterRuntimes.get(p.id),runsHere=!!runtime&&!runtime.pending;
  if(p.bookWriter.running&&(runsHere||await writerLockHeldElsewhere(p.id))){
    p.bookWriter.stopAfterCurrent=true;p.bookWriter.lastMessage=runsHere?"Stoppt nach dem aktuellen Kapitel …":"Stoppt nach dem aktuellen Kapitel (im anderen Fenster) …";
  }else if(runtimeActive){
    p.bookWriter.stopAfterCurrent=true;p.bookWriter.lastMessage="Das aktuelle Kapitel wird noch beendet; danach stoppt Litterum.";
  }else stopBookWriterNow(p,"Gestoppt");
  p.updatedAt=now();store.save();render();
}
let resumeSyncWaits=0;
const lockWaits=new Set();
// Läuft ein Auftrag in einem anderen Fenster, stellt sich dieses Fenster hinten an: Wird das andere Fenster
// geschlossen oder pausiert es im Hintergrund, macht dieses Fenster nahtlos weiter.
function whenLockFree(name,then){
  if(!navigator.locks?.request||lockWaits.has(name))return;
  lockWaits.add(name);
  navigator.locks.request("story-studio:"+name,async()=>{}).catch(()=>{}).finally(()=>{
    lockWaits.delete(name);
    setTimeout(async()=>{try{await store.settle();}catch{}try{then();}catch{}},400);
  });
}
function waitForWriterLock(pid){whenLockFree("writer-"+pid,()=>{if(state.activeProjectId===pid)resumeWholeBookWriter();});}
function resumeWholeBookWriter(){
  if(document.hidden||!state.activeProjectId||store.readOnly)return;
  const p=projectById(state.activeProjectId);
  if(!p?.bookWriter?.running||activeBookWriterRuntimes.has(p.id)||bookWriterRunsElsewhere(p)||bookWriterStaleElsewhere(p))return;
  const activeVid=activeBookVariant(p)?.id||"";
  if(p.bookWriter.variantId&&p.bookWriter.variantId!==activeVid){stopBookWriterNow(p,"Gestoppt: Die aktive Buchfassung wurde gewechselt.");store.save();render();return;}
  const target=Number.isInteger(p.bookWriter.targetPartIndex)?p.bookWriter.targetPartIndex:null;
  const planScope=target!==null?partChapterList(p,target):(p.chapters||[]);
  const missingPlan=planScope.find(chapterNeedsPlan);
  if(missingPlan){stopBookWriterNow(p,`Wartet auf Plan-Ausarbeitung · Kapitel ${missingPlan.number} ist noch offen.`);store.save();render();return;}
  if(projectPlanningActive(p)){stopBookWriterNow(p,"Gestoppt: Kapitelplan-Ausarbeitung ist aktiv.");store.save();render();return;}
  // Nur warten, solange ein von Hand gestarteter Plan-/Schreibauftrag wirklich gerade läuft.
  const wc=p.bookWriter.currentChapterId;
  if(wc&&(jobRunningHere("write",p.id,wc)||jobRunningHere("plan",p.id,wc))){setTimeout(()=>{if(state.activeProjectId===p.id)resumeWholeBookWriter();},1600);return;}
  if(navigator.onLine===false)return;
  const pid=p.id;
  // Sofort reservieren: bis zum Start darf kein fremder Stand (Cloud/anderer Tab) die Buchobjekte ersetzen.
  activeBookWriterRuntimes.set(pid,{projectId:pid,pending:true});
  const release=()=>{if(activeBookWriterRuntimes.get(pid)?.pending)activeBookWriterRuntimes.delete(pid);};
  setTimeout(async()=>{
    const cur=projectById(pid);
    if(!cur||state.activeProjectId!==pid||!cur.bookWriter?.running||document.hidden||bookWriterRunsElsewhere(cur)||bookWriterStaleElsewhere(cur)){release();return;}
    const partMode=ensurePartWorkflowShape(cur).enabled&&target!==null;
    if(partMode){const part=ensurePartWorkflowShape(cur).parts[target];if(!part||!["writing","planned"].includes(part.status)){release();cur.bookWriter.running=false;cur.bookWriter.ownerDeviceId="";store.save();render();return;}}
    let r;
    try{
      r=await runExclusive("writer-"+pid,async()=>{
        const live=projectById(pid);if(!live?.bookWriter?.running||bookWriterRunsElsewhere(live)){release();return true;}
        live.bookWriter.ownerDeviceId=myDeviceId();writerBeat(live);
        if(partMode)ensurePartWorkflowShape(live).parts[target].status="writing";
        await runBookWriterLoop(pid,partMode?target:null);return true;
      });
    }finally{release();}
    if(r==="locked")waitForWriterLock(pid); // läuft bereits in einem anderen Fenster → dahinter anstellen
  },700);
}

async function collectVaultIdea(classify){const el=$("#vaultIdea"),text=el?.value.trim();if(!text)return;const p=project(),item={id:uid(),text,category:"Unsortiert",target:"",reason:"",status:"collected",createdAt:now(),classification:null};p.ideaVault.push(item);el.value="";save("Idee gesammelt");if(!classify){render();return;}try{const data=await withBusy(()=>apiData("classify_idea",{idea:text},{projectOverride:p}));const lp=liveProject(p),it=lp?.ideaVault?.find(x=>x.id===item.id);if(it){Object.assign(it,{category:data.category||"Unsortiert",target:data.target||"",reason:data.reason||"",classification:data});lp.updatedAt=now();store.save();}toast("Idee analysiert und einsortiert");render();}catch(e){toast(e.message);render();}}
function applyVaultIdea(id){const p=project(),x=p.ideaVault.find(i=>i.id===id);if(!x)return;const d=x.classification||{},txt=d.suggestedText||x.text,cat=(d.category||x.category||"").toLowerCase();if(cat.includes("stil")){p.style.rules.push(txt);}else if(cat.includes("figur")){const c=p.characters.find(c=>c.name?.toLowerCase()===String(d.targetName||x.target||"").toLowerCase());if(c)c.personality=[c.personality,txt].filter(Boolean).join(" ");else return toast("Die passende Figur konnte nicht eindeutig gefunden werden.");}else if(cat.includes("beziehung")){const r=p.relationships.find(r=>[r.a,r.b].some(n=>n?.toLowerCase()===String(d.targetName||"").toLowerCase()));if(r)r.note=[r.note,txt].filter(Boolean).join(" ");else return toast("Die passende Beziehung konnte nicht eindeutig gefunden werden.");}else if(cat.includes("kapitel")){const n=Number(d.chapterNumber),c=p.chapters.find(c=>c.number===n);if(c)c.plan=[c.plan,txt].filter(Boolean).join("\n");else return toast("Noch kein passendes Kapitel gefunden. Die Idee bleibt gesammelt.");}else if(cat.includes("dna")||cat.includes("handlung")){p.dna.premise=[p.dna.premise,txt].filter(Boolean).join("\n");}else{return toast("Die Idee bleibt gesammelt. Du kannst sie später einem Bereich zuordnen.");}x.status="applied";save("Idee übernommen");render();}
function protectSelectedPassage(){const c=chapter(),el=$("#chapterContent"),text=extractSelectedText(el);if(!text)return toast("Markiere zuerst die Passage, die geschützt werden soll.");project().protectedPassages.push({id:uid(),chapterId:c.id,chapterNumber:c.number,text,note:"Nicht automatisch verändern"});save("Passage geschützt");toast("Diese Stelle wird bei automatischen Überarbeitungen geschützt.");}
// Ganzes Manuskript prüfen: Die Teile werden einzeln angefragt (je eine kurze Server-Anfrage)
// und danach zu einem Bericht zusammengeführt. So stößt auch ein sehr langes Buch nicht mehr
// an das Zeitlimit einer einzelnen Server-Anfrage.
async function reviewManuscript(p,manuscript,mode,profile,onProgress=()=>{}){
  const chunks=splitBriefingForAnalysis(manuscript,60000);
  if(!chunks.length)throw new Error("Es gibt noch keine geschriebenen Kapitel.");
  const withRetry=async fn=>{let last=null;for(let attempt=0;attempt<3;attempt++){try{return await fn();}catch(e){last=e;if(!isTransientApiError(e))break;await sleep(1500*(attempt+1));}}throw last;};
  onProgress(0,chunks.length);
  if(chunks.length===1){
    const d=await withRetry(()=>postAi("review_final",{manuscript:chunks[0],mode,profile},{projectOverride:p,context:"manuscript"}));
    const text=String(d.text||"").trim();if(!text)throw new Error("Die KI hat keine Auswertung zurückgegeben.");return text;
  }
  const notes=new Array(chunks.length);let next=0,done=0;
  const worker=async()=>{
    while(true){
      const i=next++;if(i>=chunks.length)return;
      const d=await withRetry(()=>postAi("review_notes",{manuscriptPart:chunks[i],partIndex:i,partTotal:chunks.length,mode,profile},{projectOverride:p,context:"manuscript"}));
      notes[i]=String(d.text||"").trim();done++;onProgress(done,chunks.length);
    }
  };
  await Promise.all(Array.from({length:Math.min(2,chunks.length)},worker));
  const d=await withRetry(()=>postAi("review_final",{notes,mode,profile},{projectOverride:p,context:"manuscript"}));
  const text=String(d.text||"").trim();if(!text)throw new Error("Die KI hat keine Auswertung zurückgegeben.");
  return text;
}
let editorialBusy=false;
async function runEditorial(mode){
  const p=project();if(!p)return;
  if(editorialBusy)return toast("Eine Prüfung läuft bereits. Bitte kurz warten.");
  const active=chapter();let scope=$("#editorialScope")?.value||"current";if(mode==="full")scope="book";
  const profile=$("#betaProfile")?.value||"normal",written=(p.chapters||[]).filter(c=>String(c.content||"").trim());
  let chosen=active;
  if(scope==="specific"){const id=$("#editorialChapterPick")?.value;chosen=p.chapters.find(c=>c.id===id)||written[0];p.editorial.lastChapterId=chosen?.id||"";}
  const wholeScope=["book","to_current"].includes(scope);
  if(mode==="proofread"&&wholeScope)return toast("Korrektorat bitte kapitelweise ausführen, damit Original und Korrektur sicher gegenübergestellt werden können.");
  if(!wholeScope&&!chosen?.content?.trim())return toast("Dieses Kapitel enthält noch keinen Text.");
  const until=active?written.filter(c=>c.number<=active.number):written;
  const selectedChapters=scope==="to_current"?until:written;
  const combined=selectedChapters.map(c=>`Kapitel ${c.number}: ${c.title}\n\n${c.content}`).join("\n\n\n");
  if(wholeScope&&!combined.trim())return toast("Es gibt noch keine geschriebenen Kapitel.");
  p.editorial.lastScope=scope;p.editorial.lastMode=mode;p.editorial.proofread=null;save();
  editorialBusy=true;busyActions++;
  const setStatus=(text,cls="muted")=>{const box=$("#editorialResult");if(box&&project()?.id===p.id)box.innerHTML=`<div class="${cls}">${esc(text)}</div>`;};
  setStatus("Prüfung läuft …");
  try{
    if(mode==="proofread"){
      const original=chosen.content;
      const data=await apiData("proofread",{chapter:{number:chosen.number,title:chosen.title,content:original}},{projectOverride:p});
      const lp=liveProject(p);if(!lp)return;
      lp.editorial ||= {};lp.editorial.proofread={...data,original,chapterId:chosen.id};lp.updatedAt=now();store.save();toast("Korrektorat fertig");
      if(project()?.id===lp.id){render();openProofreadModal(lp.editorial.proofread);}
      return;
    }
    let out;
    if(wholeScope){
      out=await reviewManuscript(p,combined,mode==="lektorat"?"lektorat":mode==="beta"?"beta":"full",profile,(done,total)=>setStatus(total>1?(done>=total?"Alle Teile gelesen – Gesamtauswertung wird erstellt …":`Prüfung läuft … Teil ${done+1} von ${total} wird gelesen`):"Prüfung läuft …"));
    }else{
      const action=mode==="lektorat"?"lektorat":mode==="beta"?"beta_reader":"full_book_analysis";
      out=await api(action,{chapter:{number:chosen.number,title:chosen.title,content:chosen.content,plan:chosen.plan},profile},{projectOverride:p});
    }
    const lp=liveProject(p);if(lp){lp.editorial ||= {};lp.editorial.lastResult=out;lp.updatedAt=now();store.save();}toast("Prüfung abgeschlossen");if(project()?.id===p.id)render();
  }catch(e){setStatus(e.message||"Prüfung fehlgeschlagen","warning");}
  finally{editorialBusy=false;busyActions=Math.max(0,busyActions-1);}
}
function acceptProofread(){const p=project(),pr=p.editorial?.proofread;if(!pr)return;const c=p.chapters.find(x=>x.id===pr.chapterId);if(!c)return;c.content=pr.correctedText||c.content;p.editorial.proofread=null;save("Korrektur übernommen");render();}
function foreignProjectScan(text,active=project()){
  if(!active)return [];
  const suspects=[];
  for(const p of state.projects||[]){
    if(p.id===active.id) continue;
    const terms=[p.title,...(p.characters||[]).map(c=>c.name)].filter(x=>x && String(x).trim().length>=4);
    for(const term of terms){
      const escaped=String(term).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      const rx=new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`,"iu");
      if(rx.test(text||"")) suspects.push(term);
    }
  }
  active.security ||= {projectFirewall:true,lastScan:"",lastWarning:""};
  active.security.lastScan=now();
  active.security.lastWarning=suspects.length?`Prüfen: ${[...new Set(suspects)].slice(0,4).join(", ")}`:"";
  active.updatedAt=now();store.save();return suspects;
}
async function testAuthorProvider(){const btn=$("#testAuthorProvider"),meta=aiProviderMeta(project()?.ai?.authorProvider);if(btn){btn.disabled=true;btn.textContent="Teste …";}try{await api("provider_test");toast(`${meta.label} ist verbunden.`);}catch(e){toast(`${meta.label}: ${e.message}`);}finally{if(btn){btn.disabled=false;btn.textContent="Verbindung testen";}}}
async function api(action,payload={},options={}){
  const data=await postAi(action,payload,{projectOverride:options.projectOverride,context:options.context||"full",timeoutMs:options.timeoutMs,abortRegistry:options.abortRegistry,manualAbort:options.manualAbort});
  if(!String(data.text||"").trim())throw new Error("Die KI hat keinen Text zurückgegeben. Bitte erneut versuchen.");
  return data.text;
}

async function apiStreamChapter(action,payload={},onDelta=()=>{},projectOverride=null,streamOptions={}){
  const p=projectOverride||project(),chapterNumber=payload?.chapter?.number;
  const accessHeaders=claudeTestHeaders();
  const planStream=action==="plan_chapter";
  // Beim Kapitelplan zählt nur echter Text als Fortschritt. Server-Herzschläge dürfen einen leeren
  // Auftrag nicht minutenlang künstlich am Leben halten. Manuskript-Streaming bleibt unverändert.
  const controller=new AbortController();
  if(typeof streamOptions.onController==="function")streamOptions.onController(controller);
  const manualAbort=()=>typeof streamOptions.manualAbort==="function"&&streamOptions.manualAbort();
  const manualStopError=()=>{const e=new Error("Auftrag manuell gestoppt. Der Zwischenstand ist gespeichert.");e.manualStop=true;return e;};
  let idleTimer=null;
  const hardTimer=setTimeout(()=>controller.abort(),305000);
  const idleMs=planStream?(p.ai?.authorProvider==="claude"?110000:45000):120000;
  const bump=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>controller.abort(),idleMs);};
  bump();
  try{
    let res;
    try{
      const requestProject=planStream?projectPlanExpansionContext(p,chapterNumber):action==="translate_chapter"?projectTranslationContext(p):projectContext(p,{chapterNumber});
      res=await fetch("/api/ai",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",...accessHeaders},signal:controller.signal,body:JSON.stringify({action,project:requestProject,...payload})});
    }catch(err){
      if(err?.name==="AbortError"&&manualAbort())throw manualStopError();
      if(err?.name==="AbortError")throw transientApiError(planStream?"Die Plan-KI hat innerhalb von 45 Sekunden noch keinen Text geliefert. Litterum startet den Auftrag automatisch neu.":"Die Kapitel-KI hat nicht rechtzeitig geantwortet. Der bereits empfangene Teiltext bleibt gespeichert und der Schreibauftrag wird fortgesetzt.",408);
      throw transientApiError("Die KI-Verbindung wurde unterbrochen. Litterum setzt den Schreibvorgang automatisch fort.");
    }
    bump();
    const contentType=(res.headers.get("content-type")||"").toLowerCase();
    if(!res.ok){
      const raw=await res.text();let data={};try{data=raw?JSON.parse(raw):{};}catch{}
      let message="";
      if(res.status===401){message=data?.error?readableError(data.error,""):"Der KI-Anbieter hat die Anfrage nicht autorisiert. Bitte den API-Schlüssel in Vercel prüfen.";}
      else if(data?.error)message=readableError(data.error,"");
      else if(res.status===504)message="Die Kapitel-KI hat das Serverzeitlimit erreicht. Der bereits empfangene Teiltext bleibt gespeichert.";
      else if(res.status===413)message="Der Kapitelkontext war zu groß. Bitte erneut versuchen.";
      else{const short=raw&&raw.length<220?raw.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim():"";message=`KI-Serverfehler ${res.status}${short?": "+short:""}`;}
      if([408,425,429,500,502,503,504].includes(Number(res.status))&&!isPermanentApiConfigError({message,status:res.status}))throw transientApiError(message,res.status);
      const err=new Error(message);err.status=res.status;throw err;
    }
    if(contentType.includes("application/json")){
      const data=await res.json();const text=String(data?.text||"");if(text)onDelta(text);if(!text.trim())throw new Error("Die KI hat keinen Kapiteltext zurückgegeben.");return text;
    }
    if(!res.body)throw transientApiError("Der KI-Stream konnte nicht geöffnet werden.");
    const reader=res.body.getReader(),decoder=new TextDecoder();let buffer="",full="",serverError="",serverErrorRetryable=false,gotDone=false;
    const consume=line=>{
      const trimmed=line.trim();if(!trimmed)return;
      let evt;try{evt=JSON.parse(trimmed);}catch{return;}
      if(evt.type==="done"){
        gotDone=true;
        if(Number.isFinite(Number(evt.estimatedCostUsd))&&evt.usage&&p?.ai?.authorProvider==="claude"){
          p.ai.lastClaudeCostUsd=Number(evt.estimatedCostUsd);
          p.ai.lastClaudeUsage=evt.usage;
          store.save({sync:false});
        }
        return;
      }
      if(evt.type==="delta"&&evt.delta){const delta=String(evt.delta);full+=delta;bump();onDelta(delta);}
      else if(evt.type==="error"){serverError=String(evt.error||"KI-Stream wurde unterbrochen.");serverErrorRetryable=evt.retryable===true;}
    };
    try{
      while(true){
        const {value,done}=await reader.read();
        if(value){if(!planStream)bump();buffer+=decoder.decode(value,{stream:true});let nl;while((nl=buffer.indexOf("\n"))>=0){consume(buffer.slice(0,nl));buffer=buffer.slice(nl+1);}}
        if(done)break;
      }
    }catch(err){
      if(err?.name==="AbortError"&&manualAbort())throw manualStopError();
      if(err?.name==="AbortError")throw transientApiError(planStream?"Die Plan-Ausarbeitung hat 45 Sekunden lang keinen neuen Text geliefert. Der Auftrag wird automatisch neu gestartet.":"Der Schreibstrom ist hängen geblieben. Der Teiltext ist gespeichert und wird automatisch fortgesetzt.",408);
      throw transientApiError("Der Schreibstrom wurde unterbrochen. Der Teiltext ist gespeichert und wird automatisch fortgesetzt.");
    }
    buffer+=decoder.decode();if(buffer.trim())consume(buffer);
    if(serverError){if(serverErrorRetryable||isTransientApiError(serverError))throw transientApiError(serverError);throw new Error(serverError);}
    if(!gotDone)throw transientApiError("Der Schreibstrom endete unerwartet. Der Teiltext ist gespeichert und wird fortgesetzt.");
    if(!full.trim())throw new Error("Die KI hat keinen Kapiteltext zurückgegeben.");
    return full;
  }finally{clearTimeout(hardTimer);clearTimeout(idleTimer);if(typeof streamOptions.onController==="function")streamOptions.onController(null);}
}
// Die Antwort ersetzt den Platzhalter im AKTUELLEN Buchobjekt (per ID); fehlt er dort, wird sie angehängt.
function putIdeaAnswer(p,placeholder,text){
  const lp=liveProject(p);if(!lp)return null;
  lp.ideas ||= [];
  const ph=lp.ideas.find(x=>x.id===placeholder.id);
  if(ph)ph.text=text;else lp.ideas.push({...placeholder,text});
  lp.updatedAt=now();store.save();
  return lp;
}
async function sendIdea(){
  const input=$("#ideaInput"),txt=input.value.trim();if(!txt)return;
  const p=project(),userMsgId=uid();p.ideas.push({id:userMsgId,role:"user",text:txt,ts:now()});input.value="";save();render();
  const placeholder={id:uid(),role:"ai",text:"Ich denke darüber nach …",ts:now()};p.ideas.push(placeholder);save();render();
  try{
    const out=await withBusy(()=>api("brainstorm",{message:txt,history:p.ideas.filter(x=>x.id!==placeholder.id&&x.id!==userMsgId).slice(-12)},{projectOverride:p}));
    const lp=putIdeaAnswer(p,placeholder,out);
    const autoRead=lp?.tts?.autoIdeas&&project()?.id===lp.id;
    render();
    if(autoRead)setTimeout(()=>speakText(out),120);
    return;
  }catch(e){putIdeaAnswer(p,placeholder,`KI ist noch nicht verbunden. Deine Idee wurde trotzdem gespeichert.\n\n${e.message}`);}
  render();
}
async function apiForProject(action,payload,p){
  const data=await postAi(action,payload,{projectOverride:p});
  const text=String(data?.text??data?.data??"");if(!text.trim())throw new Error("Die KI hat keinen Kapitelplan zurückgegeben.");return text;
}
async function generatePlan(){
  const p=project(),c=chapterForMode(p,"plan");if(!p||!c)return;
  if(projectWritingActive(p))return toast("Während ein Kapitel geschrieben wird, kann kein Kapitelplan gleichzeitig ausgearbeitet werden. Stoppe zuerst das Schreiben.");
  if(projectRunsJobs("plan",p.id)&&!jobRunningHere("plan",p.id,c.id))return toast("Es wird bereits ein anderer Kapitelplan ausgearbeitet. Litterum arbeitet Kapitelpläne nacheinander ab.");
  if(jobBlocking(p,"plan",c.id))return toast(`Kapitel ${c.number} wird bereits ausgearbeitet.`);
  const existing=getJob(p,"plan",c.id);if(existing)existing.retryCount=0;
  await runPlanJob(p.id,c.id,{resume:!!existing});
}
// „managed“: Der Buchschreiber steuert Wiederholungen selbst; dann keine eigene Auto-Fortsetzung.
function bookWriterOwnsJobs(p){return !!p?.bookWriter?.running&&!bookWriterRunsElsewhere(p);}
const lastJobError=new Map(); // letzte Fehlermeldung je Buch, damit der Buchschreiber die Ursache nennen kann
async function runPlanJob(projectId,chapterId,opts={}){
  if(jobRunningHere("plan",projectId,chapterId))return false;
  const r=await runExclusive("generation-"+projectId,()=>runExclusive("plan-"+projectId+"-"+chapterId,()=>runPlanJobInner(projectId,chapterId,opts)));
  if(r==="locked"){if(!opts.managed&&!opts.resume&&project()?.id===projectId)toast("Dieser Kapitelplan wird gerade in einem anderen Fenster ausgearbeitet.");return "locked";}
  return r;
}
async function runPlanJobInner(projectId,chapterId,{resume=false,managed=false}={}){
  const key=jobKey(projectId,chapterId);
  if(activePlanRuntimes.has(key))return false;
  const p=projectById(projectId),c=p?.chapters.find(x=>x.id===chapterId);if(!p||!c)return false;
  if(projectWritingActive(p))return false;
  let job=getJob(p,"plan",c.id);
  if(!resume||!job){
    job={chapterId:c.id,chapterNumber:c.number,status:"running",startedAt:now(),retryCount:0,originalPlan:String(c.plan||""),partialPlan:"",variantId:activeBookVariant(p)?.id||""};
    setJob(p,"plan",c.id,job);
  }else{
    job.status="running";job.manualPause=false;job.retryCount=Number(job.retryCount||0)+1;job.variantId=activeBookVariant(p)?.id||job.variantId||"";
    // Kompatibel zu Aufträgen aus älteren Versionen: der bisherige Kurzplan bleibt die Ausgangsnotiz.
    if(typeof job.originalPlan!=="string")job.originalPlan=String(c.plan||"");
    if(typeof job.partialPlan!=="string")job.partialPlan="";
  }
  job.heartbeatAt=now();
  p.ui ||= {};if(!managed||!userIsEditing()){p.ui.planChapterId=c.id;p.ui.lastChapterId=c.id;}p.updatedAt=now();store.save();
  const runtime={projectId,chapterId,abortController:null,stopRequested:false};activePlanRuntimes.set(key,runtime);
  if(project()?.id===projectId&&state.activeTab==="chapters")render();
  let live=String(job.partialPlan||"");
  try{
    let lastSaved=Date.now(),uiTimer=null;
    // Anders als früher wird auch der unfertige Kapitelplan fortlaufend gespeichert. Wird Android oder
    // der Browser im Hintergrund angehalten, setzt Fabula anschließend genau dort weiter, statt
    // den kompletten Plan wieder von vorne zu erzeugen.
    const paint=()=>{
      uiTimer=null;if(project()?.id!==projectId||!jobRunningHere("plan",projectId,chapterId))return;
      const words=countWords(live),viewing=chapterForMode(project(),"plan")?.id===chapterId;
      if(viewing){const area=$("#chapterPlan");if(area&&document.activeElement!==area){const follow=area.scrollHeight-area.scrollTop-area.clientHeight<60;area.value=live||String(job.originalPlan||c.plan||"");area.rows=Math.max(area.rows,12);if(follow)area.scrollTop=area.scrollHeight;}
        const btn=$("#generatePlan");if(btn)btn.textContent=`◇ Kapitel ${c.number} wird ausgearbeitet · ${words.toLocaleString("de-DE")} Wörter`;}
      const badge=$("#planJobBadge");if(badge&&badge.dataset.chapter===chapterId)badge.textContent=`● Kapitelplan wird gerade ausgearbeitet · Kapitel ${c.number}`;
    };
    const savePartial=()=>{
      const currentP=projectById(projectId),j=getJob(currentP,"plan",chapterId);if(!j)return;
      j.heartbeatAt=now();j.liveWords=countWords(live);j.partialPlan=live;currentP.updatedAt=now();store.save({sync:false});lastSaved=Date.now();
    };
    const onDelta=d=>{live+=d;if(!uiTimer)uiTimer=setTimeout(paint,180);if(Date.now()-lastSaved>=1500)savePartial();};
    if(live)paint();
    await apiStreamChapter("plan_chapter",{chapter:{number:c.number,title:c.title,plan:String(job.originalPlan||c.plan||""),partialPlan:live,finish:!!live,recovery:Number(job.retryCount||0)>0}},onDelta,p,{onController:ctrl=>{runtime.abortController=ctrl;if(ctrl&&runtime.stopRequested)try{ctrl.abort();}catch{}},manualAbort:()=>runtime.stopRequested});
    clearTimeout(uiTimer);uiTimer=null;
    const text=String(live||"").trim();
    if(!text)throw new Error("Die KI hat keinen Kapitelplan zurückgegeben.");
    const currentP=projectById(projectId),tc=currentP?.chapters.find(x=>x.id===chapterId);
    activePlanRuntimes.delete(key);
    if(!currentP||!tc)return false;
    tc.plan=text;tc.planExpanded=true;setJob(currentP,"plan",chapterId,null);
    const nextPlan=!managed?advanceAfterChapterTask(currentP,chapterId,"plan"):null;
    currentP.updatedAt=now();store.save();
    if(project()?.id===projectId){render();if(!managed)toast(nextPlan?`Kapitel ${tc.number} wurde ausgearbeitet. Weiter mit Kapitel ${nextPlan.number}.`:`Kapitel ${tc.number} wurde ausgearbeitet.`);}
    return true;
  }catch(e){
    lastJobError.set(projectId,readableError(e,""));
    const currentP=projectById(projectId),j=getJob(currentP,"plan",chapterId);
    if(currentP){
      const manual=!!e?.manualStop,retryable=!!e.retryable&&Number(j?.retryCount||0)<5;
      if((manual||retryable)&&j){j.status="interrupted";j.manualPause=manual;j.lastError=e.message;j.partialPlan=live;j.liveWords=countWords(live);j.heartbeatAt=now();}
      else setJob(currentP,"plan",chapterId,null);
      currentP.updatedAt=now();store.save();
    }
    activePlanRuntimes.delete(key);
    const stoppedManually=!!getJob(currentP,"plan",chapterId)?.manualPause;
    const interrupted=getJob(currentP,"plan",chapterId)?.status==="interrupted";
    if(interrupted&&!stoppedManually&&!managed)setTimeout(resumeInterruptedPlans,900);
    if(project()?.id===projectId){render();if(!managed)toast(interrupted?`Kapitelplan wurde kurz unterbrochen. Der bisherige Plan ist gespeichert und wird an derselben Stelle fortgesetzt.${e?.message?` (Grund: ${readableError(e,"")})`:""}`:e.message,7000);}
    return false;
  }
}
// Setzt unterbrochene oder hängen gebliebene Kapitelpläne fort – in allen Büchern, jedes Kapitel für sich.
function resumeInterruptedPlans(){
  if(document.hidden)return;
  for(const found of state.projects||[]){
    if(!found)continue;
    const owned=bookWriterOwnsJobs(found);
    if(owned||found.planRunner?.running)continue;
    for(const [cid,j] of Object.entries(found.planJobs||{})){
      const activeVid=activeBookVariant(found)?.id||"";if(j?.variantId&&j.variantId!==activeVid)continue;
      if(!j||!["running","interrupted"].includes(j.status)||j.manualPause||jobRunningHere("plan",found.id,cid))continue;
      if(j.status==="running"){if(!jobStale(found,"plan",cid))continue;j.status="interrupted";j.retryCount=0;store.save({sync:false});}
      if(!found.chapters?.some(c=>c.id===cid)){setJob(found,"plan",cid,null);store.save();continue;}
      if(Number(j.retryCount||0)>=5){setJob(found,"plan",cid,null);store.save();continue;}
      setTimeout(async()=>{if(!jobRunningHere("plan",found.id,cid)&&!(bookWriterOwnsJobs(found)&&found.bookWriter?.currentChapterId===cid)){const r=await runPlanJob(found.id,cid,{resume:true});if(r==="locked")whenLockFree("plan-"+found.id+"-"+cid,resumeInterruptedPlans);}},500);
    }
  }
}
function resumeInterruptedBookDevelopments(){
  if(document.hidden || (typeof navigator!=="undefined"&&navigator.onLine===false) || activeBookDevelopmentRuntimes.size)return;
  const active=state.activeProjectId?projectById(state.activeProjectId):null;
  const candidates=[active,...(state.projects||[]).filter(p=>p&&p.id!==active?.id)].filter(Boolean);
  const p=candidates.find(x=>x.bookDevelopmentJob&&["running","interrupted"].includes(x.bookDevelopmentJob.status));
  if(!p)return;
  const job=p.bookDevelopmentJob;
  setTimeout(()=>{
    if(document.hidden || (typeof navigator!=="undefined"&&navigator.onLine===false) || activeBookDevelopmentRuntimes.size)return;
    if(job.mode==="part")developSinglePart(Number(job.partIndex)||0,{resume:true,projectId:p.id});
    else developWholeBook({resume:true,projectId:p.id});
  },500);
}
function resumeInterruptedJobs(){if(store.readOnly)return;setTimeout(resumeBookReviser,1500);setTimeout(resumeBookTranslator,1700);setTimeout(resumePlanRunner,500);resumeInterruptedPlans();resumeInterruptedWrites();resumeInterruptedBookDevelopments();setTimeout(resumeWholeBookWriter,1200);}
async function generateChapter(continuation=false,forceRewrite=false){
  const p=project(),c=chapter();if(!p||!c)return;
  if(chapterNeedsPlan(c))return toast(`Arbeite zuerst den Kapitelplan für Kapitel ${c.number} aus. Jede Buchfassung hat jetzt ihre eigene Plan-Ausarbeitung.`);
  if(projectPlanningActive(p))return toast("Während Kapitelpläne ausgearbeitet werden, kann kein Manuskript gleichzeitig geschrieben werden. Stoppe zuerst die Plan-Ausarbeitung.");
  if(projectRunsJobs("write",p.id)&&!jobRunningHere("write",p.id,c.id))return toast("Es wird bereits ein anderes Kapitel geschrieben. Litterum schreibt Kapitel nacheinander.");
  if(jobBlocking(p,"write",c.id))return toast(`Kapitel ${c.number} wird bereits geschrieben.`);
  const existingJob=getJob(p,"write",c.id);
  if(existingJob?.status==="interrupted"){
    if(!String(c.content||"").trim())setJob(p,"write",c.id,null);
    else return runChapterWriteJob(p.id,c.id,{continuation:true,resume:true});
  }else if(existingJob)setJob(p,"write",c.id,null);
  if(continuation&&!String(c.content||"").trim())return toast("Für Weiter schreiben muss bereits Kapiteltext vorhanden sein.");
  if(!continuation&&!forceRewrite&&String(c.content||"").trim()){
    modal(`<h2>Vorhandenen Kapiteltext ersetzen?</h2><p>In diesem Kapitel stehen bereits ${countWords(c.content).toLocaleString("de-DE")} Wörter. „Kapitel schreiben“ würde diesen Text ersetzen – der bisherige Text bleibt unter „Rückgängig“ erhalten. Für eine Fortsetzung nutze „Weiter schreiben“.</p><div class="modal-actions"><button class="ghost-btn" data-close>Abbrechen</button><button class="danger-btn" id="rewriteChapter">Text ersetzen</button></div>`);
    $("#rewriteChapter").onclick=()=>{closeModal();generateChapter(false,true);};return;
  }
  if(forceRewrite&&String(c.content||"").trim())pushVersion(c,"vor „Kapitel neu schreiben“");
  await runChapterWriteJob(p.id,c.id,{continuation,forceRewrite,resume:false});
}
async function runChapterWriteJob(projectId,chapterId,opts={}){
  if(jobRunningHere("write",projectId,chapterId))return false;
  const r=await runExclusive("generation-"+projectId,()=>runExclusive("write-"+projectId+"-"+chapterId,()=>runChapterWriteJobInner(projectId,chapterId,opts)));
  if(r==="locked"){if(!opts.managed&&!opts.resume&&project()?.id===projectId)toast("Dieses Kapitel wird gerade in einem anderen Fenster geschrieben.");return "locked";}
  return r;
}
async function runChapterWriteJobInner(projectId,chapterId,{continuation=false,forceRewrite=false,resume=false,managed=false}={}){
  const key=jobKey(projectId,chapterId);
  if(activeWriteRuntimes.has(key))return false;
  const p=projectById(projectId),c=p?.chapters.find(x=>x.id===chapterId);if(!p||!c)return false;
  if(chapterNeedsPlan(c))return false;
  if(projectPlanningActive(p))return false;
  const base=continuation?String(c.content||"").trim():"";
  let job=getJob(p,"write",c.id);
  if(!resume||!job){job={chapterId:c.id,chapterNumber:c.number,mode:continuation?"continue":"write",status:"running",generatedWords:0,startedAt:now(),retryCount:0,variantId:activeBookVariant(p)?.id||""};setJob(p,"write",c.id,job);}
  else{job.status="running";job.manualPause=false;job.retryCount=Number(job.retryCount||0)+1;job.variantId=activeBookVariant(p)?.id||job.variantId||"";}
  job.heartbeatAt=now();
  // Bei einer automatischen Fortsetzung nach Abbruch soll die KI das Kapitel zu Ende führen (Ziellänge),
  // statt nur ein kleines Stück anzuhängen.
  const autoResume=continuation&&((!!resume&&job.mode!=="continue")||(managed&&!!c.writeIncomplete));
  if(!(managed&&userIsEditing())&&!projectRunsJobs("write",projectId))rememberChapter(p,c.id,"write");p.updatedAt=now();store.save();
  const runtime={projectId,chapterId,abortController:null,stopRequested:false};activeWriteRuntimes.set(key,runtime);
  if(project()?.id===projectId)render();
  let generated="",lastSaved=Date.now(),uiTimer=null;
  // Die Anzeige wird höchstens ca. 5-mal pro Sekunde aktualisiert (statt bei jedem Wortschnipsel).
  // Das hält auch lange Kapitel auf dem Handy flüssig; die Scrollposition bleibt erhalten.
  const paint=()=>{
    uiTimer=null;
    const currentP=projectById(projectId),tc=currentP?.chapters.find(x=>x.id===chapterId);if(!currentP||!tc)return;
    const words=countWords(generated);
    const cj=getJob(currentP,"write",chapterId);if(cj)cj.generatedWords=words;
    if(project()?.id!==projectId)return;
    if(chapter()?.id===chapterId){
      const area=$("#chapterContent");
      if(area&&area.value!==tc.content){const follow=area.scrollHeight-area.scrollTop-area.clientHeight<60,top=area.scrollTop;area.value=tc.content;area.scrollTop=follow?area.scrollHeight:top;}
      const primary=$("#generateChapter");if(primary)primary.textContent=`✦ Kapitel ${tc.number} wird geschrieben · ${countWords(tc.content).toLocaleString("de-DE")} Wörter`;
    }
    const badge=$("#writeJobBadge");if(badge&&badge.dataset.chapter===chapterId){const more=openJobs(currentP,"write").length-1;badge.textContent=`● Buch wird gerade geschrieben · Kapitel ${tc.number}${more>0?` + ${more} weitere`:""}`;}
  };
  const updateLive=delta=>{
    generated+=delta;
    const currentP=projectById(projectId),tc=currentP?.chapters.find(x=>x.id===chapterId);if(!currentP||!tc)return;
    tc.content=continuation?[base,generated].filter(Boolean).join("\n\n"):generated;
    tc.status="Schreiben";
    // Bis zum sauberen Abschluss gilt das Kapitel als unvollständig – auch wenn die App zwischendurch
    // geschlossen wird. So setzt Fabula später fort, statt einen halben Text als fertig zu zählen.
    if(!tc.writeIncomplete)tc.writeIncomplete=true;
    let lj=getJob(currentP,"write",chapterId);if(!lj){lj={chapterId,chapterNumber:tc.number,mode:continuation?"continue":"write",status:"running",generatedWords:0,startedAt:now(),retryCount:0};setJob(currentP,"write",chapterId,lj);}
    lj.status="running";lj.chapterNumber=tc.number;
    currentP.ui ||= {};if(!projectRunsJobs("write",projectId)||chapter()?.id===chapterId){currentP.ui.writeChapterId=chapterId;currentP.ui.lastChapterId=chapterId;}
    if(!uiTimer)uiTimer=setTimeout(paint,200);
    if(Date.now()-lastSaved>1500){lj.heartbeatAt=now();currentP.updatedAt=now();if(currentP.bookWriter?.running)writerBeat(currentP);store.save();lastSaved=Date.now();}
  };
  try{
    await apiStreamChapter(continuation?"continue_chapter":"write_chapter",{chapter:{number:c.number,title:c.title,plan:c.plan,content:c.content,memory:c.memory,wish:String(c.wish||"").trim(),finish:autoResume}},updateLive,p,{onController:ctrl=>{runtime.abortController=ctrl;if(ctrl&&runtime.stopRequested)try{ctrl.abort();}catch{}},manualAbort:()=>runtime.stopRequested});
    clearTimeout(uiTimer);uiTimer=null;
    const currentP=projectById(projectId),tc=currentP?.chapters.find(x=>x.id===chapterId);
    activeWriteRuntimes.delete(key);
    if(!currentP||!tc)return false;
    tc.status="Entwurf";tc.writeIncomplete=false;setJob(currentP,"write",chapterId,null);
    const nextWrite=!managed?advanceAfterChapterTask(currentP,chapterId,"write"):null;
    currentP.updatedAt=now();
    const foreign=foreignProjectScan(generated,currentP),autoRead=currentP.tts?.autoChapters;store.save();
    if(project()?.id===projectId){render();toast(foreign.length?"Kapitel erstellt. Fremdprojekt-Hinweis prüfen.":nextWrite?`Kapitel erstellt und gespeichert. Weiter mit Kapitel ${nextWrite.number}.`:"Kapitel erstellt und gespeichert.");if(autoRead&&!managed)setTimeout(()=>speakText(generated),120);}
    return true;
  }catch(e){
    clearTimeout(uiTimer);uiTimer=null;
    lastJobError.set(projectId,readableError(e,""));
    const currentP=projectById(projectId),tc=currentP?.chapters.find(x=>x.id===chapterId);
    if(currentP&&tc){
      // Teiltext bleibt erhalten und wird als unvollständig markiert, damit er fortgesetzt statt übersprungen wird.
      if(generated.trim()){tc.status="Entwurf";tc.writeIncomplete=true;}
      const ej=getJob(currentP,"write",chapterId),manual=!!e?.manualStop,retryable=!!e.retryable&&Number(ej?.retryCount||0)<3;
      if((manual||retryable)&&ej){ej.status="interrupted";ej.manualPause=manual;ej.generatedWords=countWords(generated);ej.lastError=e.message;}else setJob(currentP,"write",chapterId,null);
      currentP.updatedAt=now();store.save();
    }
    activeWriteRuntimes.delete(key);
    const stoppedManually=!!getJob(currentP,"write",chapterId)?.manualPause;
    const interrupted=getJob(currentP,"write",chapterId)?.status==="interrupted";
    if(interrupted&&!stoppedManually&&!managed)setTimeout(resumeInterruptedWrites,2000);
    if(project()?.id===projectId){render();if(!managed)toast(interrupted?"Schreiben wurde unterbrochen. Der Text ist gespeichert und wird automatisch fortgesetzt.":(generated.trim()?`Teiltext gespeichert. ${e.message}`:e.message));}
    return false;
  }
}
// Setzt unterbrochene oder hängen gebliebene Schreibaufträge fort – in allen Büchern, jedes Kapitel für sich.
function resumeInterruptedWrites(){
  if(document.hidden)return;
  for(const found of state.projects||[]){
    if(!found)continue;
    const owned=bookWriterOwnsJobs(found);
    if(owned||found.planRunner?.running)continue;
    for(const [cid,j] of Object.entries(found.writeJobs||{})){
      const activeVid=activeBookVariant(found)?.id||"";if(j?.variantId&&j.variantId!==activeVid)continue;
      if(!j||!["running","interrupted"].includes(j.status)||j.manualPause||jobRunningHere("write",found.id,cid))continue;
      if(j.status==="running"){if(!jobStale(found,"write",cid))continue;j.status="interrupted";j.retryCount=0;store.save({sync:false});}
      if(!found.chapters?.some(c=>c.id===cid)){setJob(found,"write",cid,null);store.save();continue;}
      if(Number(j.retryCount||0)>=3){setJob(found,"write",cid,null);store.save();continue;}
      const tc=found.chapters.find(c=>c.id===cid);
      const continuation=j.mode==="continue"||Number(j.generatedWords||0)>0||!!String(tc?.content||"").trim()&&!!tc?.writeIncomplete;
      setTimeout(async()=>{if(!jobRunningHere("write",found.id,cid)&&!(bookWriterOwnsJobs(found)&&found.bookWriter?.currentChapterId===cid)){const r=await runChapterWriteJob(found.id,cid,{continuation,resume:true});if(r==="locked")whenLockFree("write-"+found.id+"-"+cid,resumeInterruptedWrites);}},700);
    }
  }
}
const activeReviewRuntimes=new Set();
const activeReviewAbortControllers=new Map();
function reviewAbortRegistry(projectId){
  let set=activeReviewAbortControllers.get(projectId);
  if(!set){set=new Set();activeReviewAbortControllers.set(projectId,set);}
  return set;
}
function reviewLocalSignals(c){
  const text=String(c?.content||""),sentences=(text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)||[]).map(x=>x.trim()).filter(Boolean),starts=new Map();
  for(const s of sentences){const k=s.toLocaleLowerCase("de-DE").replace(/[„“”"'’]/g,"").split(/\s+/).slice(0,3).join(" ");if(k.split(" ").length>=3)starts.set(k,(starts.get(k)||0)+1);}
  return {words:countWords(text),wie:(text.match(/\bwie\b/gi)||[]).length,wieEin:(text.match(/\bwie\s+(?:ein|eine|einen|einem|einer|eines)\b/gi)||[]).length,alsOb:(text.match(/\bals\s+(?:ob|wäre|würde|hätte|sei|habe|könnte)\b/gi)||[]).length,sehrKurzeSaetze:sentences.filter(s=>countWords(s)<=5).length,saetze:sentences.length,repeatedStarts:[...starts.entries()].filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([text,count])=>({text,count}))};
}
function reviewOutputHasFindings(out){
  const t=String(out||"").trim().toLocaleLowerCase("de-DE");if(!t)return false;
  return !(t.startsWith("keine konkrete auffälligkeit")||t.startsWith("keine belastbare auffälligkeit")||t.includes("keine konkrete auffälligkeit gefunden"));
}
async function reviewChapterThorough(p,c,abortRegistry){
  const payload={chapter:{number:c.number,title:c.title,plan:c.plan,content:c.content,memory:c.memory},signals:reviewLocalSignals(c)};
  let out="";
  for(let attempt=0;attempt<3;attempt++){
    try{out=await api("review_chapter",{...payload,verify:false},{projectOverride:p,context:"review",timeoutMs:180000,abortRegistry,manualAbort:()=>!!projectById(p.id)?.reviewRunner?.immediateStop});break;}
    catch(e){if(e?.manualStop)throw e;if(!isTransientApiError(e)||attempt===2)throw e;await sleep([1200,3200,6500][attempt]);}
  }
  if(projectById(p.id)?.reviewRunner?.immediateStop){const e=new Error("Prüfung sofort gestoppt.");e.manualStop=true;throw e;}
  if(!reviewOutputHasFindings(out)){
    const verify=await api("review_chapter",{...payload,verify:true,firstResult:out},{projectOverride:p,context:"review",timeoutMs:180000,abortRegistry,manualAbort:()=>!!projectById(p.id)?.reviewRunner?.immediateStop});
    if(reviewOutputHasFindings(verify))out=verify;
    else out="Keine belastbare Auffälligkeit nach Zweitprüfung. Das Kapitel wurde vollständig gegen Kapitelplan, Canon, Figurenlogik, Perspektive, Zeitform, Stilregeln, verbotene Muster, Wiederholungen und Kontinuität geprüft.";
  }
  return out;
}
function stopBookReviewNow(){
  const p=project();if(!p?.reviewRunner)return;
  const rr=p.reviewRunner,bp=bookReviewProgress(p);
  if(!rr.running&&!activeReviewRuntimes.has(p.id))return toast("Die Buchprüfung läuft gerade nicht.");
  rr.stopRequested=true;rr.immediateStop=true;rr.running=false;rr.currentChapterNumbers=[];rr.finishedAt=now();rr.completed=bp.done;rr.total=bp.total;rr.lastMessage=`Buchprüfung sofort gestoppt · ${bp.done}/${bp.total} Kapitel geprüft. Bereits fertige Prüfungen bleiben gespeichert.`;
  const ctrls=activeReviewAbortControllers.get(p.id);if(ctrls)for(const ctrl of [...ctrls]){try{ctrl.abort();}catch{}}
  p.updatedAt=now();store.save();render();toast("Buchprüfung sofort gestoppt. Der bisherige Prüfstand bleibt erhalten.",5000);
}
function stopBookReview(){
  const p=project();if(!p?.reviewRunner?.running)return;
  p.reviewRunner.stopRequested=true;p.reviewRunner.lastMessage="Stopp angefordert. Die gerade laufenden Kapitel werden noch gespeichert.";store.save();render();
}
async function aiReview(){
  const p=project();if(!p)return;
  if(activeReviewRuntimes.has(p.id))return toast("Die Buchprüfung läuft bereits.");
  const written=(p.chapters||[]).filter(c=>String(c.content||"").trim()).sort((a,b)=>Number(a.number)-Number(b.number));
  if(!written.length)return toast("Es gibt noch keine geschriebenen Kapitel zum Prüfen.");
  const targets=written.filter(c=>!chapterReviewIsCurrent(c));
  if(!targets.length)return toast("Alle geschriebenen Kapitel sind bereits mit dem aktuellen Textstand geprüft.");
  const existingDone=written.filter(chapterReviewIsCurrent),existingFindings=existingDone.filter(c=>reviewOutputHasFindings(c.reviewResult)).length,existingClean=existingDone.length-existingFindings;
  const rr=p.reviewRunner ||= {};Object.assign(rr,{running:true,stopRequested:false,immediateStop:false,currentChapterNumbers:[],completed:bookReviewProgress(p).done,total:written.length,lastMessage:`Buchprüfung gestartet · ${targets.length} Kapitel offen`,errorMessage:"",findingsCount:existingFindings,cleanCount:existingClean,startedAt:now(),finishedAt:""});
  store.save();activeReviewRuntimes.add(p.id);const abortRegistry=reviewAbortRegistry(p.id);busyActions++;render();
  const queue=[...targets],active=new Map(),retryCounts=new Map();
  const update=()=>{const lp=projectById(p.id);if(!lp)return;const bp=bookReviewProgress(lp),r=lp.reviewRunner;r.completed=bp.done;r.total=bp.total;if(r.immediateStop){r.currentChapterNumbers=[];lp.updatedAt=now();store.save();if(project()?.id===lp.id&&state.activeTab==="review")render();return;}r.currentChapterNumbers=[...active.values()].sort((a,b)=>a-b);r.lastMessage=r.currentChapterNumbers.length?`Gründliche Prüfung läuft · Kapitel ${r.currentChapterNumbers.join(" + ")} · ${bp.done}/${bp.total} fertig`:`Gründliche Prüfung läuft · ${bp.done}/${bp.total} fertig`;lp.updatedAt=now();store.save();if(project()?.id===lp.id&&state.activeTab==="review")render();};
  const worker=async id=>{while(queue.length){const live=projectById(p.id),run=live?.reviewRunner;if(!live||!run||run.stopRequested)break;const c=queue.shift();if(!c)break;active.set(id,Number(c.number));update();try{const out=await reviewChapterThorough(live,c,abortRegistry);const latest=projectById(p.id),lc=latest?.chapters?.find(x=>x.id===c.id);if(!latest||!lc)continue;lc.reviewResult=out;lc.reviewedAt=now();lc.reviewSignature=reviewContentSignature(lc.content||"");latest.editorial ||= {};latest.editorial.lastReview=out;if(reviewOutputHasFindings(out))latest.reviewRunner.findingsCount=Number(latest.reviewRunner.findingsCount||0)+1;else latest.reviewRunner.cleanCount=Number(latest.reviewRunner.cleanCount||0)+1;latest.updatedAt=now();store.save();}catch(e){const latest=projectById(p.id),msg=readableError(e,"Prüfung unterbrochen");if(!e?.manualStop&&latest?.reviewRunner){latest.reviewRunner.lastMessage=`Kapitel ${c.number}: ${msg}`;store.save();}if(!e?.manualStop&&isTransientApiError(e)&&!projectById(p.id)?.reviewRunner?.stopRequested){const tries=(retryCounts.get(c.id)||0)+1;retryCounts.set(c.id,tries);if(tries<=2){queue.push(c);await sleep(1800*tries);}else if(latest?.reviewRunner){latest.reviewRunner.stopRequested=true;latest.reviewRunner.errorMessage=`Prüfung gestoppt: Kapitel ${c.number} konnte nach 3 Versuchen nicht geprüft werden. ${msg}`;latest.reviewRunner.lastMessage=latest.reviewRunner.errorMessage;store.save();}}else if(!e?.manualStop&&latest?.reviewRunner){latest.reviewRunner.stopRequested=true;latest.reviewRunner.errorMessage=`Prüfung gestoppt: Kapitel ${c.number}. ${msg}`;latest.reviewRunner.lastMessage=latest.reviewRunner.errorMessage;store.save();}}finally{active.delete(id);update();}}};
  try{await Promise.all([worker(1),worker(2)]);const lp=projectById(p.id);if(lp?.reviewRunner){const bp=bookReviewProgress(lp),immediate=!!lp.reviewRunner.immediateStop,stopped=!!lp.reviewRunner.stopRequested;Object.assign(lp.reviewRunner,{running:false,stopRequested:false,immediateStop:false,currentChapterNumbers:[],finishedAt:now(),completed:bp.done,total:bp.total,lastMessage:immediate?`Buchprüfung sofort gestoppt · ${bp.done}/${bp.total} Kapitel geprüft. Bereits fertige Prüfungen bleiben gespeichert.`:stopped?(lp.reviewRunner.errorMessage||`Buchprüfung gestoppt · ${bp.done}/${bp.total} Kapitel geprüft`):`Buchprüfung abgeschlossen · ${bp.done}/${bp.total} Kapitel geprüft`});lp.updatedAt=now();store.save();}}
  finally{activeReviewRuntimes.delete(p.id);activeReviewAbortControllers.delete(p.id);busyActions=Math.max(0,busyActions-1);if(project()?.id===p.id&&state.activeTab==="review")render();}
}

async function generateCoverIdeas(){
  const p=project(),btn=$("#generateCoverIdeas");if(!p)return;
  p.cover.author=$("#coverAuthor")?.value.trim()||p.cover.author||"";
  p.cover.blurb=$("#coverBlurb")?.value.trim()||"";
  p.cover.prompt=$("#coverPrompt")?.value.trim()||"";
  p.cover.trim=$("#coverTrim")?.value||"A5";p.cover.spineMm=Number($("#coverSpine")?.value)||12;p.cover.model=$("#coverModel")?.value||"gpt-image-2.5-flare";save();
  if(btn){btn.disabled=true;btn.textContent="Erstellt 3 Vorschläge …";}
  try{
    const res=await withBusy(()=>fetch("/api/cover",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:p.title,genre:p.genre,author:p.cover.author,blurb:p.cover.blurb,prompt:p.cover.prompt,model:p.cover.model,count:3,dna:{subgenre:p.dna?.subgenre,atmosphere:p.dna?.atmosphere,premise:p.dna?.premise}})}));
    const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||`Cover-Serverfehler ${res.status}`);
    coverSessionImages=(data.images||[]).filter(Boolean);if(!coverSessionImages.length)throw new Error("Die Bild-KI hat keine Coverbilder zurückgegeben.");
    const lp=liveProject(p);if(lp){lp.cover ||= {};if(!lp.cover.selectedDataUrl){lp.cover.selectedDataUrl=coverSessionImages[0];lp.cover.selectedMime="image/webp";}lp.updatedAt=now();store.save();}toast("Cover-Vorschläge erstellt");render();
  }catch(e){toast(e.message);if(btn){btn.disabled=false;btn.textContent="✦ 3 Cover-Vorschläge";}}
}
function saveCoverFields(){const p=project();if(!p)return;p.cover.author=$("#coverAuthor")?.value??p.cover.author;p.cover.blurb=$("#coverBlurb")?.value??p.cover.blurb;p.cover.prompt=$("#coverPrompt")?.value??p.cover.prompt;p.cover.trim=$("#coverTrim")?.value||p.cover.trim;p.cover.spineMm=Number($("#coverSpine")?.value)||p.cover.spineMm;p.cover.model=$("#coverModel")?.value||p.cover.model;save();}
function chooseCover(index){const p=project(),img=coverSessionImages[Number(index)];if(!p||!img)return;p.cover.selectedDataUrl=img;p.cover.selectedMime="image/webp";save("Cover ausgewählt");render();}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Coverbild konnte nicht geladen werden."));img.src=src;});}
function drawCoverImage(ctx,img,x,y,w,h){const ir=img.width/img.height,tr=w/h;let sx=0,sy=0,sw=img.width,sh=img.height;if(ir>tr){sw=img.height*tr;sx=(img.width-sw)/2;}else{sh=img.width/tr;sy=(img.height-sh)/2;}ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines=99){const words=String(text||"").split(/\s+/).filter(Boolean);let line="",lines=[],i=0;for(const word of words){const t=line?line+" "+word:word;if(ctx.measureText(t).width>maxWidth&&line){lines.push(line);line=word;if(lines.length>=maxLines)break;}else line=t;}if(line&&lines.length<maxLines)lines.push(line);for(const ln of lines){ctx.fillText(ln,x,y+i*lineHeight);i++;}return y+i*lineHeight;}
async function composedFrontCoverDataUrl(p){
  if(!p?.cover?.selectedDataUrl)return "";
  const img=await loadImage(p.cover.selectedDataUrl),canvas=document.createElement("canvas");canvas.width=1024;canvas.height=1536;const ctx=canvas.getContext("2d");drawCoverImage(ctx,img,0,0,1024,1536);ctx.fillStyle="rgba(7,5,10,.24)";ctx.fillRect(0,0,1024,1536);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.shadowColor="rgba(0,0,0,.75)";ctx.shadowBlur=20;ctx.font="700 86px Georgia";wrapCanvasText(ctx,p.title,512,250,820,92,4);ctx.font="400 34px Arial";ctx.fillText(p.cover.author||"",512,1390);return canvas.toDataURL("image/jpeg",.9);
}
async function downloadFullWrap(){
  try{await buildFullWrap();}catch(e){toast(e?.message||"Der Umschlag konnte nicht erstellt werden.",6000);}
}
async function buildFullWrap(){
  const p=project();if(!p?.cover?.selectedDataUrl)return toast("Wähle zuerst ein Cover aus.");saveCoverFields();
  const mm={A5:[148,210],"5x8":[127,203.2],"6x9":[152.4,228.6]}[p.cover.trim]||[148,210],spine=Math.max(3,Number(p.cover.spineMm)||12),bleed=3,ppm=300/25.4;
  const pageW=Math.round(mm[0]*ppm),h=Math.round((mm[1]+bleed*2)*ppm),spinePx=Math.round(spine*ppm),bleedPx=Math.round(bleed*ppm),w=pageW*2+spinePx+bleedPx*4;
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d"),img=await loadImage(p.cover.selectedDataUrl);const backX=bleedPx,frontX=bleedPx*3+pageW+spinePx;
  ctx.fillStyle="#120d18";ctx.fillRect(0,0,w,h);ctx.save();ctx.globalAlpha=.35;drawCoverImage(ctx,img,backX,0,pageW,h);ctx.restore();ctx.fillStyle="rgba(12,8,18,.72)";ctx.fillRect(backX,0,pageW,h);drawCoverImage(ctx,img,frontX,0,pageW,h);ctx.fillStyle="rgba(12,8,18,.28)";ctx.fillRect(frontX,0,pageW,h);
  const spineX=bleedPx*2+pageW;ctx.fillStyle="#211229";ctx.fillRect(spineX,0,spinePx,h);
  ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font=`700 ${Math.round(pageW*.085)}px Georgia`;wrapCanvasText(ctx,p.title,frontX+pageW/2,h*.18,pageW*.78,Math.round(pageW*.095),4);ctx.font=`400 ${Math.round(pageW*.036)}px Arial`;ctx.fillText(p.cover.author||"",frontX+pageW/2,h*.9);
  ctx.textAlign="left";ctx.font=`400 ${Math.round(pageW*.035)}px Arial`;wrapCanvasText(ctx,p.cover.blurb||p.briefing?.summary||"",backX+pageW*.1,h*.18,pageW*.8,Math.round(pageW*.052),16);
  if(spinePx>35){ctx.save();ctx.translate(spineX+spinePx/2,h/2);ctx.rotate(-Math.PI/2);ctx.textAlign="center";ctx.font=`700 ${Math.max(18,Math.round(spinePx*.38))}px Georgia`;ctx.fillText(p.title,0,0);ctx.restore();}
  await new Promise((resolve,reject)=>canvas.toBlob(blob=>{if(!blob)return reject(new Error("Der Umschlag ist für dieses Gerät zu groß. Bitte einen schmaleren Buchrücken oder ein kleineres Format wählen."));downloadBlob(`${safeName(p.title)}-Umschlag.png`,blob);resolve();},"image/png"));
}
function downloadBlob(name,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}
function dataUrlBytes(dataUrl){const [head,b64]=String(dataUrl||"").split(",");if(!b64)return null;const bin=atob(b64),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return {bytes:out,mime:(head.match(/^data:([^;]+)/)||[])[1]||"image/webp"};}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255]);}function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}
function catBytes(parts){let n=0;for(const x of parts)n+=x.length;const out=new Uint8Array(n);let o=0;for(const x of parts){out.set(x,o);o+=x.length;}return out;}
function zipStored(entries){const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;for(const e of entries){const name=enc.encode(e.name),data=e.data instanceof Uint8Array?e.data:enc.encode(String(e.data??"")),crc=crc32(data),flags=0x0800;const lh=catBytes([u32(0x04034b50),u16(20),u16(flags),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);locals.push(lh);const ch=catBytes([u32(0x02014b50),u16(20),u16(20),u16(flags),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);centrals.push(ch);offset+=lh.length;}const central=catBytes(centrals),local=catBytes(locals),eocd=catBytes([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(central.length),u32(local.length),u16(0)]);return catBytes([local,central,eocd]);}
function xmlEsc(x=""){return String(x).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[m]));}
function epubBytes(p,chapters,coverDataUrl="",options={}){
  const bookTitle=String(options.title||p.title),languageCode=String(options.languageCode||"de"),translated=options.translated===true;
  const enc=new TextEncoder(),entries=[{name:"mimetype",data:enc.encode("application/epub+zip")},{name:"META-INF/container.xml",data:`<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`}];
  const cover=dataUrlBytes(coverDataUrl||p.cover?.selectedDataUrl);let coverManifest="",coverSpine="",coverXhtml="";if(cover){const ext=cover.mime.includes("png")?"png":cover.mime.includes("jpeg")?"jpg":"webp";entries.push({name:`OEBPS/cover.${ext}`,data:cover.bytes});entries.push({name:"OEBPS/cover.xhtml",data:`<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Cover</title><link rel="stylesheet" href="style.css" type="text/css"/></head><body class="cover"><img src="cover.${ext}" alt="Cover"/></body></html>`});coverManifest=`<item id="coverimg" href="cover.${ext}" media-type="${cover.mime}" properties="cover-image"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`;coverSpine='<itemref idref="cover"/>';coverXhtml='<meta name="cover" content="coverimg"/>';}
  const manifest=[],spine=[],nav=[];chapters.forEach((c,i)=>{const id=`ch${i+1}`,file=`chapter-${i+1}.xhtml`;manifest.push(`<item id="${id}" href="${file}" media-type="application/xhtml+xml"/>`);spine.push(`<itemref idref="${id}"/>`);nav.push(`<li><a href="${file}">${translated?`${c.number}. ${xmlEsc(c.title)}`:`Kapitel ${c.number}: ${xmlEsc(c.title)}`}</a></li>`);const paras=String(c.content||"").split(/\n\s*\n/).map(x=>`<p>${xmlEsc(x).replace(/\n/g,"<br/>")}</p>`).join("");entries.push({name:`OEBPS/${file}`,data:`<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="${xmlEsc(languageCode)}"><head><title>${xmlEsc(c.title)}</title><link rel="stylesheet" href="style.css" type="text/css"/></head><body><h1>${translated?c.number:`Kapitel ${c.number}`}</h1><h2>${xmlEsc(c.title)}</h2>${paras}</body></html>`});});
  entries.push({name:"OEBPS/style.css",data:"body{font-family:serif;line-height:1.55;margin:5%;}h1{font-size:.9em;color:#666}h2{font-size:1.6em}.cover{margin:0;text-align:center}.cover img{max-width:100%;height:auto}p{margin:0 0 1em}"});entries.push({name:"OEBPS/nav.xhtml",data:`<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Inhalt</title></head><body><nav epub:type="toc"><h1>Inhalt</h1><ol>${nav.join("")}</ol></nav></body></html>`});
  entries.push({name:"OEBPS/content.opf",data:`<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">litterum-${xmlEsc(p.id)}${translated?`-${xmlEsc(languageCode)}`:""}</dc:identifier><dc:title>${xmlEsc(bookTitle)}</dc:title><dc:language>${xmlEsc(languageCode)}</dc:language>${String(p.cover?.author||"").trim()?`<dc:creator>${xmlEsc(p.cover.author.trim())}</dc:creator>`:""}${coverXhtml}<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/,"Z")}</meta></metadata><manifest>${coverManifest}<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>${manifest.join("")}</manifest><spine>${coverSpine}${spine.join("")}</spine></package>`});return zipStored(entries);
}
async function exportEpub(){
  const p=project(),scope=$("#epubScope")?.value||"book",written=(p.chapters||[]).filter(c=>String(c.content||"").trim()),active=chapter();if(!written.length)return toast("Noch keine geschriebenen Kapitel.");
  let coverData="";try{coverData=await composedFrontCoverDataUrl(p);}catch{}
  if(scope==="separate"){const entries=written.map(c=>({name:`Kapitel-${String(c.number).padStart(2,"0")}-${safeName(c.title)}.epub`,data:epubBytes(p,[c],coverData)}));downloadBlob(`${safeName(p.title)}-EPUB-Kapitel.zip`,new Blob([zipStored(entries)],{type:"application/zip"}));return;}
  let chapters=written;if(scope==="to_current"&&active)chapters=written.filter(c=>c.number<=active.number);if(scope==="single"){const id=$("#epubChapter")?.value;chapters=written.filter(c=>c.id===id);}if(!chapters.length)return toast("Für diese Auswahl gibt es noch keinen Manuskripttext.");downloadBlob(`${safeName(p.title)}${scope==="single"?`-Kapitel-${chapters[0].number}`:""}.epub`,new Blob([epubBytes(p,chapters,coverData)],{type:"application/epub+zip"}));
}
function exportTxt(){
  const p=project(),written=(p.chapters||[]).filter(c=>String(c.content||"").trim());
  if(!written.length)return toast("Noch keine geschriebenen Kapitel.");
  const txt=`${p.title}\n\n\n`+written.map(c=>`Kapitel ${c.number}\n${c.title}\n\n${c.content||""}`).join("\n\n\n");
  download(`${safeName(p.title)}-manuskript.txt`,txt,"text/plain;charset=utf-8");
}
function exportJson(){const p=project();download(`${safeName(p.title)}-litterum.json`,JSON.stringify(p,null,2),"application/json");}
function importJson(e){
  const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{
    const raw=JSON.parse(reader.result);if(!raw||typeof raw!=="object"||!Array.isArray(raw.chapters))throw new Error("Ungültiges Litterum Backup");
    const p=ensureProjectShape(raw);p.id=uid();p.title=(p.title||"Importiertes Projekt")+" (Import)";state.projects.unshift(p);state.activeProjectId=p.id;state.activeChapterId=p.chapters?.[0]?.id||null;state.activeTab="studio";migrateState();ensureWorkspaceHistory(p.id);save("Projekt importiert");render();
  }catch(e){toast(e.message||"Die Datei konnte nicht gelesen werden.");}};reader.readAsText(file);
}
// Dateinamen nur aus sicheren Zeichen (Umlaute werden umschrieben), damit Downloads auf jedem
// Gerät den richtigen Namen samt Endung bekommen und nicht als „download“ ohne Endung landen.
function safeName(s){
  const t=String(s||"").replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/Ä/g,"Ae").replace(/Ö/g,"Oe").replace(/Ü/g,"Ue").replace(/ß/g,"ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9_-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,80);
  return t||"litterum";
}
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
// Kleine KI-Aktionen (Lektorat, Ideenraum, Korrektorat …) blockieren nichts: Stände anderer Fenster und
// der Cloud werden an Ort und Stelle eingearbeitet, und jedes Ergebnis wird im aktuellen Buch (per ID)
// abgelegt. Nur große, laufende Aufträge (Kapitel schreiben/planen, Entwicklung, Buchschreiber) halten
// das Laden eines Cloud-Stands kurz an.
let busyActions=0;
async function withBusy(fn){busyActions++;try{return await fn();}finally{busyActions=Math.max(0,busyActions-1);}}
function activeRuntimeCount(){return activeWriteRuntimes.size+activePlanRuntimes.size+activePlanRunnerRuntimes.size+activeBookDevelopmentRuntimes.size+activeBookWriterRuntimes.size+(typeof activeReviserRuntimes!=="undefined"?activeReviserRuntimes.size:0)+(typeof activeTranslatorRuntimes!=="undefined"?activeTranslatorRuntimes.size:0);}
// Tab-Schloss: Ist Fabula in zwei Fenstern offen (z. B. App + Browser), darf immer nur EIN
// Fenster denselben Auftrag ausführen. Moderne Browser geben Schlösser automatisch frei, wenn ein
// Fenster geschlossen wird. Ohne Unterstützung läuft alles wie bisher.
async function runExclusive(name,fn){
  if(!navigator.locks?.request)return fn();
  let invoked=false,result="locked";
  try{await navigator.locks.request("story-studio:"+name,{ifAvailable:true},async lock=>{if(!lock)return;invoked=true;result=await fn();});}
  catch(e){if(!invoked)return fn();throw e;} // Schlösser nicht nutzbar → wie bisher ohne Schloss
  return result;
}
let refreshRetry=0,refreshTimer=null,foreignPending=false,lastHiddenAt=0;
async function refreshStateFromStorage(){
  // Übernimmt Änderungen, die ein ANDERES Fenster derselben Adresse gespeichert hat (z. B. installierte App
  // und Browser gleichzeitig offen) – zusammengeführt mit allem, was hier noch läuft oder ungespeichert ist.
  if(!booted||store.readOnly)return;
  if(document.hidden){foreignPending=true;return;} // im Hintergrund nicht rechnen; beim Zurückkehren nachholen
  const meta=store.readMeta();
  if(!meta||store.isKnown(Number(meta.savedAt)||0)){refreshRetry=0;return;}
  foreignPending=false;
  const merged=await store.locked(()=>store.absorbForeign()).catch(()=>false);
  if(merged===null){
    // Das andere Fenster schreibt noch (ältere Browser ohne Schloss): kurz später erneut nachsehen.
    if(refreshRetry++<5){clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshStateFromStorage,400);}
    return;
  }
  refreshRetry=0;
  if(merged)renderAfterMerge();
}
window.addEventListener("storage",e=>{
  if(e.key===STORE_META_KEY||e.key===store.key)refreshStateFromStorage();
});
window.addEventListener("pageshow",()=>{if(!booted)return;refreshStateFromStorage();setTimeout(resumeInterruptedJobs,350);});
window.addEventListener("online",()=>{if(!booted)return;setTimeout(resumeInterruptedJobs,300);});
window.addEventListener("focus",()=>{if(booted)setTimeout(resumeInterruptedJobs,300);});
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){lastHiddenAt=Date.now();store.flushHidden();return;}
  if(!booted)return;
  refreshStateFromStorage();setTimeout(resumeInterruptedJobs,350);
});
// Beim Schließen sofort sichern (ohne auf andere Fenster zu warten).
window.addEventListener("pagehide",()=>{lastHiddenAt=Date.now();store.flushSync();});
window.addEventListener("beforeunload",()=>store.flushSync());

function reconcileRouteWithState(){
  try{
    const hash=location.hash||"";
    if(hash==="#home"){
      state.activeProjectId=null;
      state.activeChapterId=null;
      state.activeTab="studio";
      store.save({sync:false});
      return;
    }
    const m=hash.match(/^#book=(.+)$/);
    if(m){
      const id=decodeURIComponent(m[1]);
      const p=(state.projects||[]).find(x=>x.id===id);
      if(p){
        state.activeProjectId=p.id;
        state.activeChapterId=state.activeChapterId&&p.chapters?.some(c=>c.id===state.activeChapterId)?state.activeChapterId:preferredChapterId(p);
        state.activeTab=state.activeTab||"studio";
        store.save({sync:false});
      }
    }
  }catch{}
}

async function cleanupLegacyStoryStudioCaches(){
  try{
    if(!("caches" in window))return;
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith("story-studio-")||k.startsWith("fabula-")).map(k=>caches.delete(k)));
  }catch{}
}

if("serviceWorker" in navigator){
  window.addEventListener("load",async()=>{
    await cleanupLegacyStoryStudioCaches();
    try{
      const reg=await navigator.serviceWorker.register(`/sw.js?v=${FABULA_VERSION}`,{updateViaCache:"none"});
      if(reg.waiting)reg.waiting.postMessage({type:"SKIP_WAITING"});
      reg.update().catch(()=>{});
      document.addEventListener("visibilitychange",()=>{
        if(!document.hidden)reg.update().catch(()=>{});
      });
    }catch{}
  });
}
// Robuster Delegations-Handler: der Teil-Button bleibt nach jedem Render sicher klickbar.
document.addEventListener("click",e=>{
  const b=e.target?.closest?.("[data-develop-part]");
  if(!b)return;
  e.preventDefault();
  e.stopPropagation();
  const index=Number(b.dataset.developPart);
  if(!Number.isInteger(index))return toast("Dieser Romanteil konnte nicht erkannt werden.");
  confirmDevelopPart(index);
});

function storageDate(t){const d=new Date(Number(t)||0);return Number(t)>0&&!isNaN(d)?d.toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";}
// IndexedDB antwortet nicht, hält aber nachweislich den neuesten Stand: nichts überschreiben –
// aber auch niemanden aussperren. Die Autorin kann neu laden, die ältere Kopie ansehen (und
// exportieren), den Cloud-Stand laden oder bewusst mit der älteren Kopie weiterarbeiten.
function showStorageBlocked(){
  const hasLocal=!!state.projects?.length,localAt=Number(state._savedAt)||0;
  const hasSync=false,blocked=storageDate(store.blockedAt);
  $("#app").innerHTML=`<div style="min-height:100vh;display:grid;place-items:center;padding:24px"><div class="card" style="max-width:560px;padding:24px"><h2 style="font-family:Georgia,serif;margin-top:0">Speicher antwortet gerade nicht</h2><p>Deine neuesten Änderungen${blocked?` (Stand ${esc(blocked)})`:""} liegen im Gerätespeicher, aber der Browser gibt sie gerade nicht heraus. Damit nichts überschrieben wird, pausiert Litterum.</p><p class="small muted">Meist hilft Neuladen. Sonst App bzw. Browser ganz schließen und wieder öffnen.</p><div class="modal-actions" style="justify-content:flex-start"><button class="primary-btn" id="sbReload">Neu laden</button></div>${hasLocal||hasSync?`<div style="margin-top:18px;border-top:1px solid rgba(127,127,127,.25);padding-top:14px"><p class="small muted" style="margin-top:0">Weitere Möglichkeiten:</p><div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap">${hasLocal?`<button class="soft-btn" id="sbView">Ältere Kopie ansehen${localAt?` (${esc(storageDate(localAt))})`:""}</button>`:""}${hasSync?`<button class="soft-btn" id="sbCloud">Cloud-Stand laden und weiterarbeiten</button>`:""}${hasLocal?`<button class="ghost-btn" id="sbContinue">Mit der älteren Kopie weiterarbeiten</button>`:""}</div><p class="small muted">„Ansehen“ speichert nichts – ideal, um ein Backup zu exportieren. Beim Weiterarbeiten fehlen zunächst die Änderungen, die nur im blockierten Speicher liegen; sobald er wieder antwortet, führt Litterum beide Stände automatisch zusammen.</p></div>`:""}</div></div>`;
  $("#sbReload").onclick=()=>location.reload();
  $("#sbView")?.addEventListener("click",()=>{store.viewOnly=true;startApp();});
  $("#sbContinue")?.addEventListener("click",()=>{store.escapeBlocked();startApp();});
}
function showViewOnlyBanner(){
  if($("#viewOnlyBanner"))return;
  document.body.insertAdjacentHTML("beforeend",`<div id="viewOnlyBanner" style="position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9999;max-width:calc(100% - 24px);display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:14px;background:#3b2a12;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.35);font-size:14px"><span>Nur ansehen: Änderungen werden nicht gespeichert. Backups gehen unter Export.</span><button class="soft-btn" style="white-space:nowrap" onclick="location.reload()">Neu laden</button></div>`);
}
function showStorageLostNotice(){
  const when=storageDate(store.lostAt);
  modal(`<h2>Gerätespeicher wurde geleert</h2><p>Der Browser hat den Speicher dieser App geleert – zum Beispiel, weil auf dem Gerät wenig Platz frei war.${when?` Der Stand vom <strong>${esc(when)}</strong> ist auf diesem Gerät nicht mehr vorhanden.`:""}</p>${state.projects?.length?`<p class="small muted">Angezeigt wird die letzte ältere Kopie, die noch vorhanden war.</p>`:""}<div class="field"><label>JSON-Backup wieder einspielen</label><input type="file" id="lostImportJson" accept=".json,application/json" class="input"></div><p class="small muted">Tipp: Exportiere regelmäßig ein JSON-Backup unter Export.</p><div class="modal-actions"><button class="primary-btn" data-close>Verstanden</button></div>`);
  $("#lostImportJson")?.addEventListener("change",e=>{closeModal();importJson(e);});
}
async function boot(){
  // Erst den neuesten lokalen Stand (IndexedDB) laden, dann die Oberfläche aufbauen.
  try{await store.hydrate();}catch{}
  if(store.readOnly){showStorageBlocked();return;}
  startApp();
}
function startApp(){
  migrateState();
  // Ein neuer App-Start beginnt immer in der Bibliothek. Der zuletzt geöffnete Band bleibt nur als
  // „Weiterschreiben“-Hinweis gespeichert und darf die Startseite nicht mehr durch Band 2 o. ä. ersetzen.
  state.activeProjectId=null;
  state.activeChapterId=null;
  state.activeTab="studio";
  try{history.replaceState({storyStudioView:"home"},"",appRouteUrl("home"));}catch{}
  // Nach einem Neuladen existiert kein alter Browser-Stream mehr. Laufende Kapiteljobs werden daher
  // als fortsetzbar markiert. Falls eine ältere Version Planen und Schreiben gleichzeitig gestartet hat,
  // gewinnt die Plan-Ausarbeitung: Buchschreiben bleibt gestoppt, bis alle Pläne fertig sind.
  for(const p of state.projects||[]){
    for(const kind of ["plan","write"])for(const j of Object.values(p[jobField(kind)]||{}))if(j?.status==="running"){j.status="interrupted";j.retryCount=0;}
    if(p.planRunner?.running&&p.bookWriter?.running)stopBookWriterNow(p,"Pausiert: Kapitelpläne werden zuerst ausgearbeitet.");
    else if(p.bookWriter?.running&&(p.chapters||[]).some(chapterNeedsPlan))stopBookWriterNow(p,"Pausiert: zuerst alle Kapitelpläne ausarbeiten.");
  }
  store.save({sync:false});
  // V1.9.23 arbeitet ausschließlich lokal. Eine alte Cloud-Verbindung wird nicht mehr benutzt.
  syncConfig={code:"",revision:0,lastSyncedAt:"",dirty:false,deviceId:"local"};
  syncConflict=null;syncInFlight=false;
  try{localStorage.removeItem(SYNC_CONFIG_KEY);}catch{}
  ensureProjectVoice(project());
  reconcileRouteWithState();
  setupStoryStudioNavigation();
  initMediaSession();
  booted=true;
  render();
  if(store.viewOnly)showViewOnlyBanner();
  if(store.lostAt)setTimeout(showStorageLostNotice,300);
  setTimeout(resumeInterruptedJobs,900);
}
setInterval(()=>{if(booted&&!document.hidden)updateDevelopmentActivityLabels();},1000);
// Ganzbuch-Fließband-Wächter: repariert still verlorene Runtime-Verbindungen auf mobilen Browsern.
setInterval(()=>{
  if(!booted||document.hidden||store.readOnly||navigator.onLine===false||!state.activeProjectId)return;
  const p=projectById(state.activeProjectId);
  if(!p?.bookWriter?.running||activeBookWriterRuntimes.has(p.id)||bookWriterRunsElsewhere(p))return;
  resumeWholeBookWriter();
},2200);
// Nur dieser ausdrücklich angeforderte Auszug kann an den Assistenten übergeben werden.
window.litterumAssistantContext=()=>{
  if(!booted||store.readOnly||!state.activeProjectId)return null;
  const p=project(),c=chapter();
  if(!p||!c)return null;
  const excerpt=String(c.content||c.plan||'').trim();
  if(!excerpt)return null;
  const short=excerpt.slice(0,10500);
  return {label:`${p.title} · Kapitel ${c.number}: ${c.title||'Ohne Titel'}${excerpt.length>10500?' (Auszug)':''}`,
    text:`BUCH: ${p.title}\nFASSUNG: ${editionLabel(p)}\nKAPITEL: ${c.number} · ${c.title||''}\n\n${short}`};
};
boot();
})();
