(() => {
  const DB_NAME = "sethoria-atlas-prototipo-a";
  const STORE = "entities";
  const META = "meta";
  let db;
  let entities = [];
  let currentView = {type:"home"};

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const categoryMap = new Map(window.SETHORIA_DEMO.categories);
  const slug = (s) => (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");

  function uid(){
    return "ent_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8);
  }

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE,{keyPath:"id"});
        if(!d.objectStoreNames.contains(META)) d.createObjectStore(META,{keyPath:"key"});
      };
      req.onsuccess = () => { db=req.result; resolve(db); };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(store,mode="readonly"){
    return db.transaction(store,mode).objectStore(store);
  }

  function getAll(){
    return new Promise((resolve,reject)=>{
      const r=tx(STORE).getAll();
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error);
    });
  }

  function putEntity(entity){
    return new Promise((resolve,reject)=>{
      const r=tx(STORE,"readwrite").put(entity);
      r.onsuccess=()=>resolve(entity);
      r.onerror=()=>reject(r.error);
    });
  }

  function clearEntities(){
    return new Promise((resolve,reject)=>{
      const r=tx(STORE,"readwrite").clear();
      r.onsuccess=()=>resolve();
      r.onerror=()=>reject(r.error);
    });
  }

  async function ensureSeed(){
    const all=await getAll();
    if(all.length) return all;
    for(const e of window.SETHORIA_DEMO.seedEntities) await putEntity(e);
    return getAll();
  }

  function esc(s=""){
    return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }

  function categoryName(id){ return categoryMap.get(id) || id; }

  function setActive(key){
    $$(".nav-button,.category-button").forEach(b=>b.classList.remove("active"));
    const el=document.querySelector(`[data-nav="${CSS.escape(key)}"]`);
    if(el) el.classList.add("active");
  }

  function buildNav(){
    const nav=$("#categoryNav");
    nav.innerHTML="";
    for(const [id,name] of window.SETHORIA_DEMO.categories){
      const b=document.createElement("button");
      b.className="category-button";
      b.dataset.nav=id;
      b.textContent=name;
      b.onclick=()=>showCategory(id);
      nav.appendChild(b);
    }
    $("#homeBtn").dataset.nav="home";
    $("#registryBtn").dataset.nav="registry";
    $("#linkerBtn").dataset.nav="linker";
  }

  function showHome(){
    currentView={type:"home"}; setActive("home");
    const counts = [...categoryMap.keys()].map(c=>entities.filter(e=>e.category===c).length);
    const usedCats = counts.filter(Boolean).length;
    $("#view").innerHTML=`
      <div class="hero">
        <small>Arquitectura inicial</small>
        <h1>Sethoria Atlas</h1>
        <p>Prototipo A: navegación por categorías, registro maestro, búsqueda global, almacenamiento local con IndexedDB, respaldo JSON e hipervinculador rápido. Todavía no intenta resolver mapas, cronologías avanzadas ni relaciones gráficas.</p>
      </div>
      <div class="stats">
        <div class="stat-card"><strong>${entities.length}</strong><small>Elementos registrados</small></div>
        <div class="stat-card"><strong>${usedCats}</strong><small>Categorías con contenido</small></div>
        <div class="stat-card"><strong>${entities.filter(e=>e.masterTag).length}</strong><small>Etiquetas maestras</small></div>
        <div class="stat-card"><strong>Local</strong><small>Persistencia del prototipo</small></div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div><h2>Pruebas principales</h2><div class="meta">Lo que conviene validar antes de avanzar.</div></div>
        </div>
        <div class="grid">
          ${[
            ["Registro maestro","Comprueba IDs, nombres, etiquetas maestras, alias y etiquetas secundarias."],
            ["Hipervinculador","Pega un texto y revisa cómo distingue Esteban, Bagdad y Batalla de Bagdad."],
            ["Persistencia","Crea un elemento, recarga la página y comprueba que siga ahí."],
            ["Respaldo","Exporta JSON, borra o cambia datos y vuelve a importarlo."],
            ["Categorías","Revisa si el orden y los nombres de las 24 categorías se sienten naturales."],
            ["Navegación","Abre fichas desde búsqueda, categorías y vínculos."]
          ].map(([t,p])=>`<article class="entity-card"><h3>${t}</h3><p>${p}</p></article>`).join("")}
        </div>
      </div>`;
  }

  function showCategory(id){
    currentView={type:"category",id}; setActive(id);
    const list=entities.filter(e=>e.category===id);
    $("#view").innerHTML=`
      <div class="page-title">
        <div>
          <h1>${esc(categoryName(id))}</h1>
          <p>Vista preliminar de categoría. En versiones siguientes cada categoría podrá recibir su interfaz especializada.</p>
        </div>
        <button class="primary-button" onclick="window.__newEntity('${esc(id)}')">+ Nuevo</button>
      </div>
      ${list.length ? `<div class="grid">${list.map(entityCard).join("")}</div>` : `<div class="empty">Todavía no hay elementos en esta categoría.</div>`}
    `;
  }

  function entityCard(e){
    return `<article class="entity-card">
      <div class="meta">${esc(categoryName(e.category))}</div>
      <h3>${esc(e.title)}</h3>
      <p>${esc(e.summary || "Sin resumen.")}</p>
      <div class="badges">
        ${e.masterTag ? `<span class="badge master">${esc(e.masterTag)}</span>`:""}
        ${(e.tags||[]).slice(0,4).map(t=>`<span class="badge">#${esc(t)}</span>`).join("")}
      </div>
      <div class="card-actions">
        <button class="text-button" onclick="window.__openEntity('${e.id}')">Abrir</button>
        <button class="mini-button" onclick="window.__copy('${esc(e.masterTag || e.title)}')">Copiar referencia</button>
      </div>
    </article>`;
  }

  function showRegistry(){
    currentView={type:"registry"}; setActive("registry");
    const rows=entities.slice().sort((a,b)=>a.title.localeCompare(b.title,"es"));
    $("#view").innerHTML=`
      <div class="page-title">
        <div>
          <h1>Registro maestro</h1>
          <p>Índice transversal de todas las entidades. La etiqueta maestra debe ser única; títulos, alias y etiquetas secundarias pueden repetirse.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Categoría</th><th>Etiqueta maestra</th><th>Alias</th><th>Etiquetas</th><th>Acciones</th></tr></thead>
          <tbody>
          ${rows.map(e=>`<tr>
            <td><button class="text-button" onclick="window.__openEntity('${e.id}')">${esc(e.title)}</button><br><small>${esc(e.id)}</small></td>
            <td>${esc(categoryName(e.category))}</td>
            <td><span class="badge master">${esc(e.masterTag || "—")}</span></td>
            <td>${esc((e.aliases||[]).join(", ") || "—")}</td>
            <td>${(e.tags||[]).map(t=>`<span class="badge">#${esc(t)}</span>`).join(" ") || "—"}</td>
            <td><div class="copy-group">
              <button class="mini-button" onclick="window.__copy('${esc(e.title)}')">Nombre</button>
              <button class="mini-button" onclick="window.__copy('${esc(e.masterTag||"")}')">Etiqueta</button>
              <button class="mini-button" onclick="window.__copy('[[${esc(e.masterTag||e.id)}|${esc(e.title)}]]')">Referencia</button>
            </div></td>
          </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function termsForEntity(e){
    const out=[];
    if(e.masterTag) out.push({term:e.masterTag,priority:1,source:"Etiqueta maestra"});
    if(e.title) out.push({term:e.title,priority:2,source:"Título"});
    for(const a of e.aliases||[]) out.push({term:a,priority:3,source:"Alias"});
    for(const t of e.tags||[]) if(String(t).length>=4) out.push({term:t,priority:4,source:"Etiqueta secundaria"});
    return out;
  }

  function detectText(text){
    const matches=[];
    const lower=text.toLocaleLowerCase("es");
    const map=new Map();
    for(const e of entities){
      for(const info of termsForEntity(e)){
        const term=String(info.term).trim();
        if(!term) continue;
        let start=0;
        const tLower=term.toLocaleLowerCase("es");
        while((start=lower.indexOf(tLower,start))!==-1){
          const key=`${start}:${start+term.length}`;
          if(!map.has(key)) map.set(key,[]);
          map.get(key).push({entity:e,...info,start,end:start+term.length});
          start += Math.max(1,term.length);
        }
      }
    }
    for(const [key,candidates] of map){
      const [start,end]=key.split(":").map(Number);
      candidates.sort((a,b)=>a.priority-b.priority);
      matches.push({start,end,text:text.slice(start,end),candidates});
    }
    // Remove overlaps by preferring longer spans, then higher-priority candidate
    matches.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
    const filtered=[];
    for(const m of matches){
      const overlaps=filtered.some(x=>!(m.end<=x.start || m.start>=x.end));
      if(!overlaps) filtered.push(m);
    }
    return filtered.sort((a,b)=>a.start-b.start);
  }

  function showLinker(){
    currentView={type:"linker"}; setActive("linker");
    $("#view").innerHTML=`
      <div class="page-title">
        <div>
          <h1>Hipervinculador rápido</h1>
          <p>Pega información que ya tienes. El prototipo busca etiqueta maestra → título → alias → etiquetas secundarias y deja las coincidencias ambiguas para que tú decidas.</p>
        </div>
      </div>
      <div class="two-col">
        <div class="panel" style="margin-top:0">
          <div class="panel-header"><h2>1. Texto</h2></div>
          <textarea id="linkerText" class="big">Esteban llegó a Bagdad acompañado de Eulalia. Después se habló de la Batalla de Bagdad.</textarea>
          <div class="card-actions">
            <button id="detectBtn" class="primary-button">Detectar</button>
            <button id="clearLinkerBtn" class="secondary-button">Limpiar</button>
          </div>
        </div>
        <div class="panel" style="margin-top:0">
          <div class="panel-header"><h2>2. Coincidencias</h2></div>
          <div id="detectedList" class="detected-list"><div class="empty">Pulsa Detectar.</div></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div><h2>3. Vista previa</h2><div class="meta">Los enlaces son internos al prototipo.</div></div>
          <button id="copyLinkedTextBtn" class="secondary-button">Copiar texto visible</button>
        </div>
        <div id="linkedPreview" class="preview">Todavía no se ha procesado el texto.</div>
      </div>
    `;
    $("#detectBtn").onclick=runDetection;
    $("#clearLinkerBtn").onclick=()=>{ $("#linkerText").value=""; $("#detectedList").innerHTML='<div class="empty">Sin texto.</div>'; $("#linkedPreview").textContent=""; };
    $("#copyLinkedTextBtn").onclick=()=>navigator.clipboard.writeText($("#linkedPreview").innerText);
  }

  let linkerState=[];
  function runDetection(){
    const text=$("#linkerText").value;
    linkerState=detectText(text).map((m,i)=>({...m,index:i,selected:0,enabled:true}));
    const list=$("#detectedList");
    if(!linkerState.length){ list.innerHTML='<div class="empty">No encontré coincidencias.</div>'; renderLinkedPreview(text); return; }
    list.innerHTML=linkerState.map((m,i)=>{
      const unique = [];
      const seen = new Set();
      for(const c of m.candidates){
        if(!seen.has(c.entity.id)){ seen.add(c.entity.id); unique.push(c); }
      }
      m.candidates=unique;
      return `<div class="detected-item ${unique.length>1?"ambiguous":""}">
        <div class="row">
          <div>
            <strong>${esc(m.text)}</strong>
            <div class="meta">${unique.length>1 ? `${unique.length} candidatos` : unique[0].source}</div>
          </div>
          <label><input type="checkbox" data-enable="${i}" checked> Vincular</label>
        </div>
        ${unique.length>1 ? `<select data-select="${i}">${unique.map((c,idx)=>`<option value="${idx}">${esc(c.entity.title)} — ${esc(categoryName(c.entity.category))}</option>`).join("")}</select>` :
          `<div class="meta" style="margin-top:7px">${esc(unique[0].entity.title)} — ${esc(categoryName(unique[0].entity.category))}</div>`}
      </div>`;
    }).join("");
    $$("[data-enable]").forEach(el=>el.onchange=()=>{linkerState[+el.dataset.enable].enabled=el.checked; renderLinkedPreview(text);});
    $$("[data-select]").forEach(el=>el.onchange=()=>{linkerState[+el.dataset.select].selected=+el.value; renderLinkedPreview(text);});
    renderLinkedPreview(text);
  }

  function renderLinkedPreview(text){
    if(!linkerState.length){ $("#linkedPreview").textContent=text; return; }
    let out="",pos=0;
    for(const m of linkerState){
      out += esc(text.slice(pos,m.start));
      if(m.enabled && m.candidates.length){
        const c=m.candidates[m.selected] || m.candidates[0];
        out += `<a href="#entity=${encodeURIComponent(c.entity.id)}" data-entity-link="${c.entity.id}">${esc(text.slice(m.start,m.end))}</a>`;
      } else out += esc(text.slice(m.start,m.end));
      pos=m.end;
    }
    out += esc(text.slice(pos));
    $("#linkedPreview").innerHTML=out;
    $$("[data-entity-link]").forEach(a=>a.onclick=(ev)=>{ev.preventDefault();showEntity(a.dataset.entityLink);});
  }

  function showEntity(id){
    const e=entities.find(x=>x.id===id);
    if(!e) return;
    currentView={type:"entity",id};
    $$(".nav-button,.category-button").forEach(b=>b.classList.remove("active"));
    $("#view").innerHTML=`
      <div class="entity-hero">
        <div>
          <div class="meta">${esc(categoryName(e.category))}</div>
          <h1>${esc(e.title)}</h1>
          <div class="badges">
            ${e.masterTag?`<span class="badge master">${esc(e.masterTag)}</span>`:""}
            ${(e.tags||[]).map(t=>`<span class="badge">#${esc(t)}</span>`).join("")}
          </div>
          <p style="line-height:1.65;color:#4b5563">${esc(e.summary||"Sin resumen.")}</p>
          <div class="entity-tabs">
            <button>Resumen</button><button>Relaciones</button><button>Cronología</button><button>Archivos</button><button>Notas</button>
          </div>
        </div>
        <div class="copy-group">
          <button class="secondary-button" onclick="window.__copy('${esc(e.masterTag||e.id)}')">Copiar etiqueta</button>
        </div>
      </div>
      <div class="panel">
        <h3>Identificación</h3>
        <table>
          <tr><th>ID interno</th><td>${esc(e.id)}</td></tr>
          <tr><th>Etiqueta maestra</th><td>${esc(e.masterTag||"—")}</td></tr>
          <tr><th>Alias</th><td>${esc((e.aliases||[]).join(", ")||"—")}</td></tr>
          <tr><th>Etiquetas secundarias</th><td>${esc((e.tags||[]).join(", ")||"—")}</td></tr>
        </table>
      </div>
      <div class="notice">Las pestañas especializadas todavía son de arquitectura. En Prototipo B empezaremos a convertir algunas en herramientas reales.</div>
    `;
    history.replaceState(null,"",`#entity=${encodeURIComponent(id)}`);
  }

  function openDialog(defaultCategory="personajes"){
    $("#entityCategory").innerHTML=[...categoryMap].map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join("");
    $("#entityCategory").value=defaultCategory;
    $("#entityTitle").value="";
    $("#entityMasterTag").value="";
    $("#entityAliases").value="";
    $("#entityTags").value="";
    $("#entitySummary").value="";
    $("#entityDialog").showModal();
    $("#entityTitle").focus();
  }

  async function saveForm(){
    const title=$("#entityTitle").value.trim();
    const category=$("#entityCategory").value;
    let masterTag=$("#entityMasterTag").value.trim();
    if(!masterTag) masterTag=`${slug(category)}_${slug(title)}`;
    if(entities.some(e=>e.masterTag===masterTag)){
      alert("La etiqueta maestra ya existe. Cambia la etiqueta antes de guardar.");
      return false;
    }
    const e={
      id:uid(),
      title,category,masterTag,
      aliases:$("#entityAliases").value.split(",").map(s=>s.trim()).filter(Boolean),
      tags:$("#entityTags").value.split(",").map(s=>s.trim()).filter(Boolean),
      summary:$("#entitySummary").value.trim()
    };
    await putEntity(e);
    entities=await getAll();
    $("#entityDialog").close();
    if(currentView.type==="category") showCategory(currentView.id); else showRegistry();
    return true;
  }

  function doSearch(q){
    q=q.trim().toLocaleLowerCase("es");
    const box=$("#searchResults");
    if(!q){box.classList.add("hidden");return;}
    const results=entities.filter(e=>{
      const hay=[e.title,e.masterTag,...(e.aliases||[]),...(e.tags||[])].join(" ").toLocaleLowerCase("es");
      return hay.includes(q);
    }).slice(0,12);
    box.innerHTML=results.length?results.map(e=>`<div class="search-item" data-search-id="${e.id}"><span>${esc(e.title)}</span><small>${esc(categoryName(e.category))}</small></div>`).join(""):'<div class="search-item"><span>Sin resultados</span></div>';
    box.classList.remove("hidden");
    $$("[data-search-id]").forEach(el=>el.onclick=()=>{box.classList.add("hidden");$("#globalSearch").value="";showEntity(el.dataset.searchId);});
  }

  async function exportBackup(){
    const payload={
      format:"sethoria-atlas-prototipo-a",
      version:1,
      exportedAt:new Date().toISOString(),
      entities
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`sethoria-atlas-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  async function importBackup(file){
    const text=await file.text();
    const payload=JSON.parse(text);
    if(!payload || !Array.isArray(payload.entities)) throw new Error("Archivo de respaldo no válido");
    await clearEntities();
    for(const e of payload.entities) await putEntity(e);
    entities=await getAll();
    showHome();
  }

  window.__newEntity=openDialog;
  window.__openEntity=showEntity;
  window.__copy=(text)=>navigator.clipboard.writeText(text).then(()=>{$("#storageStatus").textContent="Copiado al portapapeles";setTimeout(()=>$("#storageStatus").textContent="Almacenamiento local activo",1300);});

  async function init(){
    buildNav();
    await openDB();
    entities=await ensureSeed();

    $("#homeBtn").onclick=showHome;
    $("#registryBtn").onclick=showRegistry;
    $("#linkerBtn").onclick=showLinker;
    $("#newEntityBtn").onclick=()=>openDialog();
    $("#closeDialogBtn").onclick=()=>$("#entityDialog").close();
    $("#cancelDialogBtn").onclick=()=>$("#entityDialog").close();
    $("#entityTitle").addEventListener("input",()=>{
      if(!$("#entityMasterTag").dataset.touched) $("#entityMasterTag").value=`${slug($("#entityCategory").value)}_${slug($("#entityTitle").value)}`;
    });
    $("#entityCategory").addEventListener("change",()=>{
      if(!$("#entityMasterTag").dataset.touched) $("#entityMasterTag").value=`${slug($("#entityCategory").value)}_${slug($("#entityTitle").value)}`;
    });
    $("#entityMasterTag").addEventListener("input",()=>$("#entityMasterTag").dataset.touched="1");

    $("#entityForm").addEventListener("submit",async ev=>{
      ev.preventDefault();
      await saveForm();
    });
    $("#globalSearch").addEventListener("input",e=>doSearch(e.target.value));
    document.addEventListener("click",e=>{ if(!e.target.closest(".search-wrap")) $("#searchResults").classList.add("hidden");});
    $("#exportBtn").onclick=exportBackup;
    $("#importInput").onchange=async e=>{
      const f=e.target.files?.[0];
      if(!f) return;
      try{await importBackup(f);alert("Respaldo importado.");}
      catch(err){alert("No pude importar el respaldo: "+err.message);}
      e.target.value="";
    };

    const hash=location.hash;
    if(hash.startsWith("#entity=")) showEntity(decodeURIComponent(hash.slice(8)));
    else showHome();
  }

  init().catch(err=>{
    console.error(err);
    $("#view").innerHTML=`<div class="panel"><h2>Error al iniciar</h2><p>${esc(err.message)}</p></div>`;
  });
})();
