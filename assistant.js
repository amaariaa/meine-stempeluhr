// Litterum Assistent V1: eigene Bedienoberfläche und eigener lokaler Chat-Speicher.
// Der Roman-State wird weder ausgelesen noch verändert, außer bei bewusstem Kapiteltransfer.
const ASSISTANT_DB='litterum-assistent-chats';
const ASSISTANT_KEY='chats-v1';
const ASSISTANT_ACCESS_KEY='litterum-assistant-access-v1';
const MAX_CHATS=40;
let assistantChats=[];
let assistantChatId=null;
let assistantOpen=false;
let assistantListOpen=false;
let assistantBusy=false;
let assistantDraft='';
let assistantProvider='gemini';
let assistantPaidConsent=false;
let assistantToken='';
let assistantPendingChapter=null;
let assistantAbort=null;
let assistantError='';
let assistantPosition=null;
function assistantRememberAccess(token){assistantToken=String(token||'').trim();try{if(assistantToken)localStorage.setItem(ASSISTANT_ACCESS_KEY,assistantToken);else localStorage.removeItem(ASSISTANT_ACCESS_KEY);}catch{}}
function assistantForgetAccess(){assistantToken='';try{localStorage.removeItem(ASSISTANT_ACCESS_KEY);sessionStorage.removeItem('litterum-assistant-access');}catch{}assistantError='';assistantRender();}
const ea=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function assistantId(){return crypto?.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2);}
function assistantCurrent(){return assistantChats.find(x=>x.id===assistantChatId)||null;}
function assistantNewChat(){const x={id:assistantId(),title:'Neues Gespräch',provider:assistantProvider,messages:[],updated:Date.now()};assistantChats.unshift(x);assistantChats=assistantChats.slice(0,MAX_CHATS);assistantChatId=x.id;assistantDraft='';assistantPendingChapter=null;assistantError='';assistantPersist();assistantRender();}
async function assistantDb(){return new Promise((ok,no)=>{const q=indexedDB.open(ASSISTANT_DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('data'))q.result.createObjectStore('data');};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});}
async function assistantGet(){const db=await assistantDb();try{return await new Promise((ok,no)=>{const tx=db.transaction('data','readonly');const q=tx.objectStore('data').get(ASSISTANT_KEY);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});}finally{db.close();}}
let assistantSaveQueue=Promise.resolve();
function assistantPersist(){
  const snapshot=JSON.stringify(assistantChats);
  assistantSaveQueue=assistantSaveQueue.catch(()=>{}).then(async()=>{
    const db=await assistantDb();try{await new Promise((ok,no)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(JSON.parse(snapshot),ASSISTANT_KEY);tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});}finally{db.close();}
  }).catch(()=>{assistantError='Gespräche konnten nicht gespeichert werden. Prüfe den Gerätespeicher.';if(assistantOpen)assistantRender();});
}
function assistantMount(){
  if(document.getElementById('litterumAssistantRoot'))return;
  document.body.insertAdjacentHTML('beforeend','<div id="litterumAssistantRoot"></div>');
  assistantRender();
}
function assistantToggle(){assistantOpen=!assistantOpen;assistantError='';assistantRender();}
function assistantMessages(chat){return (chat?.messages||[]).map(m=>`<div class="la-message ${m.role==='user'?'la-user':'la-ai'}"><div class="la-message-who">${m.role==='user'?'Du':'Assistent'}</div><div class="la-message-content">${ea(m.content)}</div><button type="button" data-la-copy="${ea(m.id)}" aria-label="Nachricht kopieren">Kopieren</button></div>`).join('');}
function assistantRender(){
  const root=document.getElementById('litterumAssistantRoot');if(!root)return;
  const chat=assistantCurrent();const title=chat?.title||'Neues Gespräch';
  root.innerHTML=`<button type="button" class="la-launch ${assistantOpen?'la-hidden':''}" id="laLaunch" title="Litterum Assistent öffnen" aria-label="Litterum Assistent öffnen"><span class="la-launch-symbol">✧</span><span>Assistent</span></button>
    ${assistantOpen?`<section class="la-window" role="dialog" aria-label="Litterum Assistent">
      <div class="la-head" id="laHead"><div class="la-head-brand"><span class="la-star">✧</span><div><strong>Litterum Assistent</strong><small>Fragen · Schreiben · Ideen</small></div></div><div class="la-head-actions"><button type="button" id="laList" title="Gespräche" aria-label="Gespräche">☰</button><button type="button" id="laNew" title="Neues Gespräch" aria-label="Neues Gespräch">＋</button><button type="button" id="laClose" title="Schließen" aria-label="Schließen">✕</button></div></div>
      <div class="la-body">
        ${assistantListOpen?`<div class="la-chats"><div class="la-chats-title">Deine Gespräche</div>${assistantChats.map(x=>`<div class="la-chat-row ${assistantChatId===x.id?'la-selected':''}"><button type="button" data-la-chat="${ea(x.id)}">${ea(x.title)}</button><button type="button" data-la-delete="${ea(x.id)}" title="Löschen" aria-label="Gespräch löschen">✕</button></div>`).join('')}<p class="la-note">Gespräche werden lokal auf diesem Gerät gespeichert, nicht in deinen Buchdateien.</p></div>`:''}
        <div class="la-config"><label for="laProvider">KI-Anbieter</label><select id="laProvider"><option value="gemini" ${assistantProvider==='gemini'?'selected':''}>Gemini · Gratis-Kontingent</option><option value="deepseek" ${assistantProvider==='deepseek'?'selected':''}>DeepSeek · API kostenpflichtig</option><option value="openai" ${assistantProvider==='openai'?'selected':''}>OpenAI · API kostenpflichtig</option></select></div>
        <p class="la-disclosure">${assistantProvider==='gemini'?'Bei der kostenlosen Gemini-API können Eingaben von Google zur Produktverbesserung genutzt werden. Keine vertraulichen Manuskripte freigeben. Kostenlos nur innerhalb des Gratis-Kontingents.':'Diese API kann zusätzliche Kosten auslösen, unabhängig von deinem ChatGPT-Abo.'}</p>
        ${assistantProvider!=='gemini'?`<label class="la-consent"><input type="checkbox" id="laPaid" ${assistantPaidConsent?'checked':''}/> Kostenpflichtige API-Anfragen ausdrücklich aktivieren</label>`:''}
        <details class="la-access" ${!assistantToken?'open':''}><summary>Privater Zugangscode ${assistantToken?'✓ gespeichert':'(erforderlich)'}</summary><label for="laAccess">Code aus deiner Vercel-Einrichtung</label><div class="la-access-row"><input type="password" id="laAccess" autocomplete="off" placeholder="${assistantToken?'Gespeichert – nur zum Ändern neu eingeben':'Zugangscode'}"/><button type="button" id="laSaveAccess">Speichern</button>${assistantToken?'<button type="button" id="laForgetAccess">Vergessen</button>':''}</div><small>Bleibt auf diesem Gerät in diesem Browser gespeichert. Er wird nicht in deinen Büchern oder im Litterum-Sync gespeichert.</small></details>
        <div class="la-thread-title">${ea(title)}</div>
        <div class="la-thread" id="laThread" aria-live="polite">${chat?.messages.length?assistantMessages(chat):`<div class="la-welcome"><span>✧</span><h3>Was möchtest du wissen?</h3><p>Frag mich etwas zu deiner Geschichte oder zu einem ganz anderen Thema. Ohne Freigabe sehe ich keine Bücher oder Kapitel.</p></div>`}${assistantBusy?'<div class="la-typing">Der Assistent antwortet …</div>':''}</div>
        ${assistantPendingChapter?`<div class="la-context"><span>Zur nächsten Nachricht freigegeben: ${ea(assistantPendingChapter.label)}</span><button id="laRemoveChapter" type="button" aria-label="Freigabe entfernen">✕</button></div>`:''}
        ${assistantError?`<p class="la-error" role="alert">${ea(assistantError)}</p>`:''}
        <div class="la-actions"><button type="button" id="laChapter" ${!window.litterumAssistantContext?.()?'disabled':''}>Kapitel freigeben</button><span>Nur auf deinen Wunsch</span></div>
        <div class="la-compose"><textarea id="laInput" rows="2" placeholder="Stelle deine Frage …" aria-label="Deine Nachricht" maxlength="14000">${ea(assistantDraft)}</textarea>${assistantBusy?'<button type="button" id="laStop">Stopp</button>':'<button type="button" id="laSend">Senden</button>'}</div>
      </div>
    </section>`:''}`;
  const b=id=>document.getElementById(id);
  b('laLaunch')?.addEventListener('click',assistantToggle);
  b('laClose')?.addEventListener('click',assistantToggle);
  b('laNew')?.addEventListener('click',()=>{assistantListOpen=false;assistantNewChat();});
  b('laList')?.addEventListener('click',()=>{assistantListOpen=!assistantListOpen;assistantRender();});
  b('laProvider')?.addEventListener('change',e=>{assistantProvider=e.target.value;assistantPaidConsent=false;assistantError='';assistantRender();});
  b('laPaid')?.addEventListener('change',e=>{assistantPaidConsent=e.target.checked;});
  b('laSaveAccess')?.addEventListener('click',()=>{const token=b('laAccess')?.value?.trim()||'';if(token.length<12){assistantError='Der Zugangscode muss mindestens 12 Zeichen haben.';assistantRender();return;}assistantRememberAccess(token);assistantError='';assistantRender();});
  b('laForgetAccess')?.addEventListener('click',assistantForgetAccess);
  b('laInput')?.addEventListener('input',e=>{assistantDraft=e.target.value;});
  b('laInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();assistantSend();}});
  b('laSend')?.addEventListener('click',assistantSend);
  b('laStop')?.addEventListener('click',()=>assistantAbort?.abort());
  b('laChapter')?.addEventListener('click',()=>{const chapter=window.litterumAssistantContext?.();if(!chapter){assistantError='Öffne zuerst ein Buch und wähle ein Kapitel aus.';}else{assistantPendingChapter=chapter;assistantError='';}assistantRender();});
  b('laRemoveChapter')?.addEventListener('click',()=>{assistantPendingChapter=null;assistantRender();});
  root.querySelectorAll('[data-la-chat]').forEach(el=>el.addEventListener('click',()=>{assistantChatId=el.dataset.laChat;assistantListOpen=false;assistantDraft='';assistantPendingChapter=null;assistantError='';assistantRender();}));
  root.querySelectorAll('[data-la-delete]').forEach(el=>el.addEventListener('click',()=>{if(!confirm('Dieses Gespräch endgültig löschen?'))return;assistantChats=assistantChats.filter(x=>x.id!==el.dataset.laDelete);if(assistantChatId===el.dataset.laDelete)assistantChatId=assistantChats[0]?.id||null;assistantPersist();assistantRender();}));
  root.querySelectorAll('[data-la-copy]').forEach(el=>el.addEventListener('click',async()=>{const m=assistantChats.flatMap(x=>x.messages).find(x=>x.id===el.dataset.laCopy);if(!m)return;try{await navigator.clipboard.writeText(m.content);el.textContent='Kopiert';}catch{assistantError='Kopieren ist hier nicht möglich.';assistantRender();}}));
  if(assistantOpen){const thread=b('laThread');if(thread)thread.scrollTop=thread.scrollHeight;assistantInstallDrag();}
}
function assistantInstallDrag(){
  const head=document.getElementById('laHead'),win=head?.closest('.la-window');if(!head||!win)return;
  if(assistantPosition&&window.innerWidth>700){win.style.right='auto';win.style.bottom='auto';win.style.left=assistantPosition.x+'px';win.style.top=assistantPosition.y+'px';}
  head.addEventListener('pointerdown',e=>{
    if(window.innerWidth<=700||e.target.closest('button,input,select'))return;
    if(e.button!==0)return;
    const start=win.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
    try{head.setPointerCapture(e.pointerId);}catch{}
    const move=event=>{
      const x=Math.max(8,Math.min(window.innerWidth-start.width-8,start.left+event.clientX-sx));
      const y=Math.max(8,Math.min(window.innerHeight-start.height-8,start.top+event.clientY-sy));
      assistantPosition={x,y};win.style.right='auto';win.style.bottom='auto';win.style.left=x+'px';win.style.top=y+'px';
    };
    const done=()=>{head.removeEventListener('pointermove',move);head.removeEventListener('pointerup',done);head.removeEventListener('pointercancel',done);};
    head.addEventListener('pointermove',move);head.addEventListener('pointerup',done);head.addEventListener('pointercancel',done);
  });
}
async function assistantSend(){
  if(assistantBusy)return;
  const text=assistantDraft.trim();if(!text)return;
  if(!assistantToken){assistantError='Trage zuerst deinen privaten Zugangscode ein.';assistantRender();return;}
  if(assistantProvider!=='gemini'&&!assistantPaidConsent){assistantError='Aktiviere kostenpflichtige Anfragen zuerst ausdrücklich.';assistantRender();return;}
  if(!assistantCurrent())assistantNewChat();
  const chat=assistantCurrent();
  let sent=text;
  if(assistantPendingChapter){sent+=`\n\n--- AUSDRÜCKLICH FREIGEGEBENER KAPITELAUSZUG (NUR ZUR BESPRECHUNG) ---\n${assistantPendingChapter.text}\n--- ENDE KAPITELAUSZUG ---`;
    assistantPendingChapter=null;
  }
  const message={id:assistantId(),role:'user',content:text};
  chat.messages.push(message);
  chat.updated=Date.now();chat.provider=assistantProvider;
  if(chat.title==='Neues Gespräch')chat.title=text.slice(0,52)+(text.length>52?' …':'');
  const history=chat.messages.slice(-16).map(m=>({role:m.role,content:m.content}));
  if(sent!==text)history[history.length-1].content=sent;
  while(history.length>1&&history.reduce((n,m)=>n+m.content.length,0)>44000)history.shift();
  assistantDraft='';assistantError='';assistantBusy=true;assistantPersist();assistantRender();
  const controller=new AbortController();assistantAbort=controller;
  try{
    const response=await fetch('/api/assistant',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:assistantProvider,messages:history,accessToken:assistantToken}),signal:controller.signal});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){if(response.status===401)assistantForgetAccess();throw new Error(data.error||`Serverfehler ${response.status}`);}
    chat.messages.push({id:assistantId(),role:'assistant',content:String(data.text||'')});chat.updated=Date.now();assistantPersist();
  }catch(e){
    assistantError=e.name==='AbortError'?'Anfrage abgebrochen. Deine Frage bleibt erhalten.':e.message||'Der Assistent ist momentan nicht erreichbar.';
  }finally{assistantAbort=null;assistantBusy=false;assistantRender();}
}
async function assistantStart(){
  try{assistantToken=localStorage.getItem(ASSISTANT_ACCESS_KEY)||'';if(!assistantToken){const legacy=sessionStorage.getItem('litterum-assistant-access')||'';if(legacy)assistantRememberAccess(legacy);}}catch{}
  try{
    const result=await assistantGet();if(Array.isArray(result))assistantChats=result.filter(x=>x&&typeof x.id==='string'&&Array.isArray(x.messages)).slice(0,MAX_CHATS);
  }catch{assistantError='Lokaler Chat-Speicher ist momentan nicht verfügbar.';}
  assistantChatId=assistantChats[0]?.id||null;
  assistantMount();
}
assistantStart();
