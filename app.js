(() => {
  const DB_NAME = "sethoria-atlas-prototipo-a";
  const APP_BUILD = "A6.8.0-point-icons-sliders-scroll";
  let editMode = localStorage.getItem("sethoria-edit-mode")==="1";

  function editModeToggleMarkup(){
    return `<button class="inline-edit-mode-toggle" type="button" data-edit-mode-toggle aria-pressed="${editMode?"true":"false"}">${editMode?"Listo":"Editar"}</button>`;
  }

  function syncEditModeUI(){
    document.body.classList.toggle("edit-mode",editMode);
    $$('[data-edit-mode-toggle]').forEach(btn=>{
      btn.textContent=editMode?"Listo":"Editar";
      btn.setAttribute("aria-pressed",editMode?"true":"false");
      btn.title=editMode?"Volver a modo normal":"Editar esta wiki";
    });
  }

  function wireEditModeToggles(){
    $$('[data-edit-mode-toggle]').forEach(btn=>btn.onclick=toggleEditMode);
    syncEditModeUI();
  }

  function rerenderCurrentView(){
    if(currentView.type==="entity"){
      const activeCharacter=document.querySelector('[data-character-tab].active')?.dataset.characterTab;
      const activePlace=document.querySelector('[data-place-tab].active')?.dataset.placeTab;
      showEntity(currentView.id,activeCharacter||activePlace||"overview");
    }
    else if(currentView.type==="category") showCategory(currentView.id);
    else if(currentView.type==="home") showHome();
    else if(currentView.type==="registry") showRegistry();
    else if(currentView.type==="linker") showLinker();
    else if(currentView.type==="assets") showAssets();
  }

  function toggleEditMode(){
    editMode=!editMode;
    activeMapInfoElementId="";
    localStorage.setItem("sethoria-edit-mode",editMode?"1":"0");
    syncEditModeUI();
    if(!editMode && currentView.type==="assets") showHome(); else rerenderCurrentView();
  }
  const STORE = "entities";

  let db;
  let entities = [];
  let currentView = {type:"home"};
  let activeEntityTab = "overview";
  let linkerState = [];
  let lastRichFocus = null;
  let undoStack = [];
  let redoStack = [];
  let historyBusy = false;
  let assetManagerRefs = [];
  const HISTORY_LIMIT = 24;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const categoryMap = new Map(window.SETHORIA_DEMO.categories);

  const groups = [
    {title:"Narrativa", ids:["personajes","grupos","arcos","eventos","timeline-a","timeline-b","relaciones"]},
    {title:"Mundo", ids:["lugares","rutas","barcos","criaturas-magicas","criaturas-reales","culturas"]},
    {title:"Técnica", ids:["batallas","armas","ropa","objetos"]},
    {title:"Contexto", ids:["historia-real","reglas","informacion-general","musica","fuentes"]},
    {title:"Archivo", ids:["otros","notas"]}
  ];

  // Plantilla 0: una arquitectura común y pestañas relevantes por tipo.
  // Después cada categoría puede modificar campos, orden o módulos sin romper el núcleo.
  const BLUEPRINTS = {
    personajes:{
      tabs:["summary","profile","history","character-relations","participation","gallery","research"],
      labels:{
        summary:"Resumen",
        profile:"Perfil",
        history:"Historia",
        "character-relations":"Relaciones",
        participation:"Participación",
        gallery:"Galería",
        research:"Investigación"
      }
    },
    grupos:{
      tabs:["overview","members","relations","timeline","sources"],
      labels:{members:"Miembros",relations:"Relaciones",timeline:"Cronología"}
    },
    arcos:{
      tabs:["overview","events","relations","timeline","sources"],
      labels:{events:"Eventos",relations:"Entidades",timeline:"Cronología"}
    },
    eventos:{
      tabs:["overview","participants","relations","timeline","sources"],
      labels:{participants:"Participantes",relations:"Contexto",timeline:"Secuencia"}
    },
    "timeline-a":{tabs:["overview","timeline","relations","sources"],labels:{timeline:"Cronología",relations:"Entidades"}},
    "timeline-b":{tabs:["overview","timeline","relations","sources"],labels:{timeline:"Cronología",relations:"Entidades"}},
    lugares:{
      tabs:["overview","map","relations","timeline","sources"],
      labels:{map:"Mapa",relations:"Presencias",timeline:"Historia"}
    },
    rutas:{
      tabs:["overview","map","stages","relations","sources"],
      labels:{map:"Mapa",stages:"Tramos",relations:"Viajeros"}
    },
    batallas:{
      tabs:["overview","participants","timeline","map","sources"],
      labels:{participants:"Fuerzas",timeline:"Desarrollo",map:"Mapa"}
    },
    barcos:{
      tabs:["overview","specs","members","timeline","sources"],
      labels:{specs:"Diseño",members:"Tripulación",timeline:"Viajes"}
    },
    "criaturas-magicas":{
      tabs:["overview","specs","relations","map","sources"],
      labels:{specs:"Rasgos",relations:"Encuentros",map:"Distribución"}
    },
    "criaturas-reales":{
      tabs:["overview","specs","relations","map","sources"],
      labels:{specs:"Biología",relations:"Encuentros",map:"Distribución"}
    },
    culturas:{
      tabs:["overview","society","relations","timeline","sources"],
      labels:{society:"Sociedad",relations:"Vínculos",timeline:"Historia"}
    },
    armas:{
      tabs:["overview","specs","relations","media","sources"],
      labels:{specs:"Especificaciones",relations:"Uso",media:"Material"}
    },
    ropa:{
      tabs:["overview","specs","relations","media","sources"],
      labels:{specs:"Diseño",relations:"Uso",media:"Material"}
    },
    objetos:{
      tabs:["overview","specs","relations","timeline","sources"],
      labels:{specs:"Función",relations:"Portadores",timeline:"Historia"}
    },
    relaciones:{
      tabs:["overview","relations","timeline","events","sources"],
      labels:{relations:"Personas / grupos",timeline:"Evolución",events:"Eventos"}
    },
    "historia-real":{
      tabs:["overview","adaptation","timeline","relations","sources"],
      labels:{adaptation:"Uso en Sethoria",timeline:"Cronología",relations:"Personas / lugares"}
    },
    reglas:{
      tabs:["overview","scope","examples","relations","sources"],
      labels:{scope:"Alcance",examples:"Casos",relations:"Reglas relacionadas"}
    },
    "informacion-general":{
      tabs:["overview","specs","relations","sources"],
      labels:{specs:"Datos",relations:"Vínculos"}
    },
    musica:{
      tabs:["overview","appearances","relations","media","sources"],
      labels:{appearances:"Usos",relations:"Referencias",media:"Material"}
    },
    fuentes:{
      tabs:["overview","relations","notes"],
      labels:{relations:"Entidades vinculadas",notes:"Notas"}
    },
    otros:{
      tabs:["overview","relations","media","notes"],
      labels:{relations:"Vínculos",media:"Archivos",notes:"Notas"}
    },
    notas:{
      tabs:["overview","relations","notes"],
      labels:{relations:"Vínculos",notes:"Estado / notas"}
    }
  };

  const TAB_LABELS = {
    overview:"Resumen",relations:"Conexiones",timeline:"Cronología",media:"Material",
    sources:"Fuentes",notes:"Notas",members:"Miembros",events:"Eventos",
    participants:"Participantes",map:"Mapa",stages:"Tramos",specs:"Datos",
    society:"Sociedad",adaptation:"Adaptación",scope:"Alcance",examples:"Casos",
    appearances:"Apariciones"
  };

  const TAB_ICONS = {
    overview:"info",relations:"link",timeline:"timeline-a",media:"objetos",sources:"fuentes",
    notes:"notas",members:"grupos",events:"eventos",participants:"personajes",map:"lugares",
    stages:"rutas",specs:"informacion-general",society:"culturas",adaptation:"historia-real",
    scope:"reglas",examples:"eventos",appearances:"arcos"
  };

  const iconPaths = {
    personajes:'<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.5-4.1 2.7-6.2 6.5-6.2s6 2.1 6.5 6.2"/>',
    grupos:'<circle cx="9" cy="8" r="2.6"/><circle cx="16.5" cy="9" r="2.2"/><path d="M3.8 19c.4-3.6 2.2-5.5 5.2-5.5s4.8 1.9 5.2 5.5"/><path d="M14.2 14.6c3.7-.8 5.7 1.1 6 4.4"/>',
    arcos:'<path d="M4 18c4-8 7-11 16-12"/><path d="m15 4 5 2-3 4"/><circle cx="6" cy="17" r="1.7"/>',
    eventos:'<path d="M7 3v3M17 3v3M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="m9 14 2 2 4-5"/>',
    'timeline-a':'<path d="M5 5v14"/><circle cx="5" cy="8" r="1.5"/><circle cx="5" cy="15.5" r="1.5"/><path d="M8 8h10M8 15.5h7"/>',
    'timeline-b':'<path d="M19 5v14"/><circle cx="19" cy="8" r="1.5"/><circle cx="19" cy="15.5" r="1.5"/><path d="M6 8h10M9 15.5h7"/>',
    lugares:'<path d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/>',
    rutas:'<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 17c4-1 4-6 8-7 1.5-.4 2.5-.8 3-2"/>',
    batallas:'<path d="m5 4 14 16M19 4 5 20"/><path d="m7 3-3 1 1 3M17 3l3 1-1 3M7 21l-3-1 1-3M17 21l3-1-1-3"/>',
    barcos:'<path d="M5 10h14l-2 7H7l-2-7Z"/><path d="M12 3v7M12 4l5 3h-5"/><path d="M3 20c2 1 4 1 6 0 2 1 4 1 6 0 2 1 4 1 6 0"/>',
    'criaturas-magicas':'<path d="M12 3 9.8 8.8 4 11l5.8 2.2L12 19l2.2-5.8L20 11l-5.8-2.2L12 3Z"/><path d="M5 4v3M3.5 5.5h3M19 17v3M17.5 18.5h3"/>',
    'criaturas-reales':'<path d="M9 12c-2-2-5-1.2-5 1.4 0 2 1.8 3.2 4.2 2.4C8.3 18.4 9.6 20 12 20s3.7-1.6 3.8-4.2c2.4.8 4.2-.4 4.2-2.4 0-2.6-3-3.4-5-1.4-1.2-2.7-4.8-2.7-6 0Z"/><circle cx="7" cy="7" r="1.7"/><circle cx="12" cy="5.5" r="1.7"/><circle cx="17" cy="7" r="1.7"/>',
    culturas:'<path d="M4 20h16M6 20v-8h12v8M8 12V8h8v4M10 8V5h4v3"/><path d="M9 16h6"/>',
    armas:'<path d="m5 19 10-10"/><path d="m13 5 6-2-2 6"/><path d="M4 16l4 4M3 21l3-3"/>',
    ropa:'<path d="M8 5 4 8l2.5 4L9 10v10h6V10l2.5 2L20 8l-4-3c-1 1.5-2.2 2-4 2S9 6.5 8 5Z"/>',
    objetos:'<path d="M5 8h14v11H5z"/><path d="M8 8V5h8v3"/><path d="M5 12h14"/>',
    relaciones:'<path d="M12 20S4 15.4 4 9.4C4 6.8 5.8 5 8.1 5c1.7 0 3 1 3.9 2.3C12.9 6 14.2 5 15.9 5 18.2 5 20 6.8 20 9.4 20 15.4 12 20 12 20Z"/>',
    'historia-real':'<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/><path d="M9 4v-1h6v1"/>',
    reglas:'<path d="M12 3 5 6v5c0 4.7 2.6 7.6 7 10 4.4-2.4 7-5.3 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/>',
    'informacion-general':'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>',
    musica:'<path d="M9 18V6l9-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/>',
    fuentes:'<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8 12h8M8 16h6"/>',
    otros:'<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
    notas:'<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    registry:'<path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    link:'<path d="M9.5 14.5 14.5 9.5"/><path d="M7 16.8 5.2 18.6a3.5 3.5 0 0 1-5-5L5 8.8a3.5 3.5 0 0 1 5 0"/><path d="m17 7.2 1.8-1.8a3.5 3.5 0 1 1 5 5L19 15.2a3.5 3.5 0 0 1-5 0" transform="translate(-4 0)"/>',
    download:'<path d="M12 4v11"/><path d="m8 11 4 4 4-4"/><path d="M5 20h14"/>',
    upload:'<path d="M12 20V9"/><path d="m8 13 4-4 4 4"/><path d="M5 4h14"/>',
    back:'<path d="m15 5-7 7 7 7"/><path d="M8 12h11"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>'
  };

  function icon(name, cls=""){
    const paths=iconPaths[name]||iconPaths.otros;
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  function esc(s=""){
    return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }
  function categoryName(id){ return categoryMap.get(id)||id; }
  function toArray(v){ return Array.isArray(v)?v:(v==null||v===""?[]:[v]); }

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const d=req.result;
        if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE,{keyPath:"id"});
      };
      req.onsuccess=()=>{db=req.result;resolve(db)};
      req.onerror=()=>reject(req.error);
    });
  }
  function store(mode="readonly"){ return db.transaction(STORE,mode).objectStore(STORE); }
  function getAll(){
    return new Promise((resolve,reject)=>{
      const r=store().getAll();
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error);
    });
  }
  function getEntityById(id){
    return new Promise((resolve,reject)=>{
      const r=store().get(id);
      r.onsuccess=()=>resolve(r.result||null);
      r.onerror=()=>reject(r.error);
    });
  }
  function putEntity(entity){
    return new Promise((resolve,reject)=>{
      const r=store("readwrite").put(entity);
      r.onsuccess=()=>resolve(entity);
      r.onerror=()=>reject(r.error);
    });
  }
  function clearEntities(){
    return new Promise((resolve,reject)=>{
      const r=store("readwrite").clear();
      r.onsuccess=()=>resolve();
      r.onerror=()=>reject(r.error);
    });
  }
  function deleteEntityById(id){
    return new Promise((resolve,reject)=>{
      const r=store("readwrite").delete(id);
      r.onsuccess=()=>resolve();
      r.onerror=()=>reject(r.error);
    });
  }
  async function ensureSeed(){
    let all=await getAll();
    if(localStorage.getItem("sethoria-no-demo-migration")!=="1"){
      const demos=all.filter(e=>String(e.id||"").startsWith("demo-"));
      for(const e of demos) await deleteEntityById(e.id);
      localStorage.setItem("sethoria-no-demo-migration","1");
      all=await getAll();
    }
    return all;
  }

  function toast(message){
    const el=$("#toast");
    el.textContent=message;
    el.classList.remove("hidden");
    clearTimeout(window.__toastTimer);
    window.__toastTimer=setTimeout(()=>el.classList.add("hidden"),1400);
  }

  function hydrateStaticIcons(){
    $$("[data-icon]").forEach(el=>el.innerHTML=icon(el.dataset.icon));
  }

  function buildNav(){
    $("#categoryNav").innerHTML=groups.map(group=>`
      <section class="nav-section">
        <div class="sidebar-label">${esc(group.title)}</div>
        ${group.ids.map(id=>`
          <button class="nav-item" data-nav="${id}" data-category="${id}" title="${esc(categoryName(id))}">
            <span class="nav-svg">${icon(id)}</span>
            <span class="nav-text">${esc(categoryName(id))}</span>
          </button>
        `).join("")}
      </section>
    `).join("");

    $$("[data-category]").forEach(btn=>btn.onclick=()=>showCategory(btn.dataset.category));
  }

  function setActive(key){
    $$(".nav-item").forEach(b=>b.classList.remove("active"));
    const active=document.querySelector(`[data-nav="${CSS.escape(key)}"]`);
    if(active) active.classList.add("active");
  }

  function toggleSidebar(){
    if(window.matchMedia("(max-width:650px)").matches) return;
    const collapsed=$("#app").classList.toggle("sidebar-collapsed");
    localStorage.setItem("sethoria-a5-sidebar",collapsed?"1":"0");
  }
  function restoreSidebar(){
    if(!window.matchMedia("(max-width:650px)").matches &&
       localStorage.getItem("sethoria-a5-sidebar")==="1"){
      $("#app").classList.add("sidebar-collapsed");
    }
  }

  function getImage(e){
    return e.image || e.imageUrl || e.thumbnail || e.cover || "";
  }

  function homeCard(id){
    return `<button class="menu-card" data-home-category="${id}" title="${esc(categoryName(id))}">
      <span class="menu-icon">${icon(id)}</span>
      <span class="menu-title">${esc(categoryName(id))}</span>
    </button>`;
  }

  function itemCard(e){
    const image=getImage(e);
    return `<button class="item-card" data-item="${e.id}" title="${esc(e.title)}">
      <span class="item-visual">
        ${image ? `<img class="item-image" src="${esc(image)}" alt="">` : `<span class="item-placeholder">${icon(e.category)}</span>`}
      </span>
      <span class="item-title">${esc(e.title)}</span>
    </button>`;
  }

  function backButton(){
    return `<button id="pageBack" class="back-button" aria-label="Regresar" title="Regresar">${icon("back")}</button>`;
  }

  function showHome(){
    currentView={type:"home"};
    setActive("");
    const all=groups.flatMap(g=>g.ids);

    $("#view").innerHTML=`
      <div class="home-shell">
        <div class="home-title-wrap">
          <section class="home-title-card"><h1>Sethoria Atlas</h1></section>
        </div>
        <div class="home-grid">${all.map(homeCard).join("")}</div>
      </div>
    `;

    $$("[data-home-category]").forEach(btn=>btn.onclick=()=>showCategory(btn.dataset.homeCategory));
  }

  function showCategory(id){
    currentView={type:"category",id};
    setActive(id);

    const list=entities
      .filter(e=>e.category===id)
      .sort((a,b)=>a.title.localeCompare(b.title,"es"));

    $("#view").innerHTML=`
      <div class="page-head">
        ${backButton()}
        <h1 class="page-title">${esc(categoryName(id))}</h1>
        <span class="page-head-spacer"></span>
        ${editModeToggleMarkup()}
        ${editMode?`<button class="category-add edit-only" data-add-entity>＋ Agregar</button>`:""}
      </div>
      ${list.length ? `<div class="cards-grid">${list.map(e=>`<div class="item-card-wrap">${itemCard(e)}${editMode?`<button class="entity-remove edit-only" data-remove-entity="${e.id}" title="Quitar">×</button>`:""}</div>`).join("")}</div>` : `<div class="empty">Sin elementos todavía.</div>`}
    `;

    $("#pageBack").onclick=showHome;
    wireEditModeToggles();
    $$("[data-item]").forEach(btn=>btn.onclick=()=>showEntity(btn.dataset.item));
    $('[data-add-entity]')?.addEventListener('click',async()=>{
      const title=prompt('Nombre:');if(!title||!title.trim())return;
      const slug=title.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
      const e={id:`${id}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,title:title.trim(),category:id,masterTag:`${id}_${slug}`,aliases:[],tags:[],summary:''};
      if(id==='personajes')e.character={};
      if(id==='lugares')e.place={};
      await putEntity(e);entities=await getAll();showCategory(id);
    });
    $$('[data-remove-entity]').forEach(btn=>btn.onclick=async ev=>{
      ev.stopPropagation();const e=entities.find(x=>x.id===btn.dataset.removeEntity);if(!e)return;
      if(!confirm(`¿Quitar ${e.title}?`))return;
      await deleteEntityById(e.id);entities=await getAll();showCategory(id);
    });
  }

  // ---------------------------
  // Enlaces automáticos internos
  // ---------------------------
  function entityTerms(e){
    return [e.title,...toArray(e.aliases),e.masterTag].filter(Boolean).map(String);
  }

  function mentionsInText(text,currentId){
    const lower=String(text||"").toLocaleLowerCase("es");
    const found=[];
    for(const e of entities){
      if(e.id===currentId) continue;
      const terms=entityTerms(e).sort((a,b)=>b.length-a.length);
      if(terms.some(t=>t.length>=3 && lower.includes(t.toLocaleLowerCase("es")))) found.push(e);
    }
    return found;
  }

  function linkifyText(text,currentId){
    let out=esc(text||"");
    const candidates=entities
      .filter(e=>e.id!==currentId)
      .flatMap(e=>entityTerms(e).map(term=>({e,term})))
      .filter(x=>x.term && x.term.length>=3)
      .sort((a,b)=>b.term.length-a.term.length);

    const used=new Set();
    for(const {e,term} of candidates){
      const key=term.toLocaleLowerCase("es");
      if(used.has(key)) continue;
      used.add(key);
      const safe=term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      const rx=new RegExp(`(^|[^\\wáéíóúüñ])(${safe})(?=$|[^\\wáéíóúüñ])`,"i");
      out=out.replace(rx,(m,p1,p2)=>`${p1}<a href="#entity=${encodeURIComponent(e.id)}" data-entity-link="${e.id}">${p2}</a>`);
    }
    return out;
  }

  function reverseReferences(target){
    const needles=entityTerms(target).map(t=>t.toLocaleLowerCase("es")).filter(t=>t.length>=3);
    return entities.filter(e=>{
      if(e.id===target.id) return false;
      const hay=[e.summary,e.subtitle,e.notes,...toArray(e.tags),...toArray(e.aliases)].filter(Boolean).join(" ").toLocaleLowerCase("es");
      return needles.some(n=>hay.includes(n));
    });
  }

  function explicitRelations(e){
    return toArray(e.relations || e.relationships || e.related).map(r=>{
      if(typeof r==="string") return {targetId:r};
      return r||{};
    });
  }

  function relationCandidates(e){
    const results=[];
    const seen=new Set();
    const add=(target,meta={})=>{
      if(!target || target.id===e.id || seen.has(target.id)) return;
      seen.add(target.id);
      results.push({target,...meta});
    };

    for(const r of explicitRelations(e)){
      const target=entities.find(x=>x.id===r.targetId || x.masterTag===r.targetId || x.title===r.targetId);
      add(target,{type:r.type||r.label||"",note:r.note||""});
    }
    for(const target of mentionsInText([e.summary,e.subtitle,...toArray(e.notes)].join(" "),e.id)) add(target,{type:"Mencionado"});
    for(const target of reverseReferences(e)) add(target,{type:"Referencia inversa"});
    return results;
  }

  function wireEntityLinks(){
    $$("[data-entity-link]").forEach(a=>a.onclick=ev=>{
      ev.preventDefault();
      showEntity(a.dataset.entityLink);
    });
    $$("[data-open-related]").forEach(b=>b.onclick=()=>showEntity(b.dataset.openRelated));
  }

  // ---------------------------
  // Datos genéricos de Plantilla 0
  // ---------------------------
  function factsFor(e){
    const raw=e.facts || e.keyFacts || e.data || [];
    if(Array.isArray(raw)){
      return raw.map(x=>{
        if(typeof x==="string") return {label:"Dato",value:x};
        return {label:x.label||x.name||"Dato",value:x.value??x.text??""};
      }).filter(x=>x.value!=="" && x.value!=null);
    }
    if(raw && typeof raw==="object"){
      return Object.entries(raw).map(([label,value])=>({label,value}));
    }

    const derived=[];
    if(e.period) derived.push({label:"Periodo",value:e.period});
    if(e.date) derived.push({label:"Fecha",value:e.date});
    if(e.location) derived.push({label:"Lugar",value:e.location});
    if(e.status) derived.push({label:"Estado",value:e.status});
    return derived;
  }

  function sectionsFor(e){
    return toArray(e.sections).map(s=>{
      if(typeof s==="string") return {title:"Información",body:s};
      return {title:s.title||s.label||"Información",body:s.body||s.text||s.content||""};
    }).filter(s=>s.body);
  }

  function timelineFor(e){
    return toArray(e.timeline || e.chronology || e.dates).map((t,i)=>{
      if(typeof t==="string") return {date:"",title:t,description:""};
      return {
        date:t.date||t.period||t.year||"",
        title:t.title||t.label||`Entrada ${i+1}`,
        description:t.description||t.text||t.note||"",
        targetId:t.targetId||""
      };
    });
  }

  function sourcesFor(e){
    return toArray(e.sources || e.references).map(s=>{
      if(typeof s==="string") return {title:s,url:"",note:""};
      return {title:s.title||s.name||s.url||"Fuente",url:s.url||s.href||"",note:s.note||s.description||""};
    });
  }

  function mediaFor(e){
    const items=[...toArray(e.media),...toArray(e.gallery)];
    const image=getImage(e);
    if(image && !items.some(x=>(typeof x==="object" ? x.url||x.src : x)===image)){
      items.unshift({type:"image",url:image,title:e.title});
    }
    return items.map(m=>{
      if(typeof m==="string") return {type:"image",url:m,title:""};
      return {
        type:m.type||"image",
        url:m.url||m.src||m.href||"",
        title:m.title||m.name||"",
        caption:m.caption||m.note||m.description||""
      };
    }).filter(m=>m.url);
  }

  function mapFor(e){
    const m=e.map || e.mapData || null;
    if(typeof m==="string") return {image:m,caption:"",points:[]};
    if(m && typeof m==="object"){
      return {
        image:m.image||m.url||m.src||e.mapImage||e.mapUrl||"",
        caption:m.caption||m.note||"",
        points:toArray(m.points||m.markers)
      };
    }
    const image=e.mapImage||e.mapUrl||"";
    return image ? {image,caption:"",points:toArray(e.mapPoints)} : null;
  }

  function listFrom(e,...keys){
    for(const k of keys){
      const v=e[k];
      if(v!=null && toArray(v).length) return toArray(v);
    }
    return [];
  }

  // ---------------------------
  // Render de módulos
  // ---------------------------
  function renderFacts(e){
    const facts=factsFor(e);
    if(!facts.length) return "";
    return `<div class="quick-facts">${facts.slice(0,8).map(f=>`
      <div class="fact-chip"><small>${esc(f.label)}</small><strong>${esc(f.value)}</strong></div>
    `).join("")}</div>`;
  }

  function renderOverview(e){
    const sections=sectionsFor(e);
    const relations=relationCandidates(e).slice(0,5);
    const facts=factsFor(e);

    return `<div class="module-grid">
      <div class="module-stack">
        <section class="module-card">
          <h2>Resumen</h2>
          <div class="rich-text">${e.summary ? `<p>${linkifyText(e.summary,e.id)}</p>` : `<p>Sin resumen todavía.</p>`}</div>
        </section>

        ${sections.map(s=>`<section class="module-card">
          <h2>${esc(s.title)}</h2>
          <div class="rich-text"><p>${linkifyText(s.body,e.id)}</p></div>
        </section>`).join("")}
      </div>

      <div class="module-stack">
        ${facts.length ? `<section class="module-card"><h2>Datos clave</h2>
          <table class="key-table">${facts.map(f=>`<tr><th>${esc(f.label)}</th><td>${esc(f.value)}</td></tr>`).join("")}</table>
        </section>` : ""}

        ${relations.length ? `<section class="module-card"><h2>Relacionado</h2>${renderRelationList(relations)}</section>` : ""}
      </div>
    </div>`;
  }

  function renderRelationList(relations){
    if(!relations.length) return `<div class="empty">Sin conexiones registradas todavía.</div>`;
    return `<div class="relation-list">${relations.map(r=>`
      <button class="relation-item" data-open-related="${r.target.id}">
        <span class="relation-glyph">${icon(r.target.category)}</span>
        <span class="relation-copy">
          <strong>${esc(r.target.title)}</strong>
          <small>${esc(r.type || categoryName(r.target.category))}</small>
          ${r.note ? `<span class="relation-note">${esc(r.note)}</span>` : ""}
        </span>
        <span class="relation-arrow">›</span>
      </button>
    `).join("")}</div>`;
  }

  function renderRelations(e,mode="relations"){
    const explicit=relationCandidates(e);
    let extra=[];

    if(mode==="members"){
      extra=listFrom(e,"members","memberIds","crew").map(x=>{
        const id=typeof x==="string"?x:(x.targetId||x.id||x.entityId);
        const target=entities.find(t=>t.id===id||t.masterTag===id||t.title===id);
        return target ? {target,type:(typeof x==="object"&&x.role)||"Miembro"} : null;
      }).filter(Boolean);
    }else if(mode==="participants"){
      extra=listFrom(e,"participants","participantIds","forces").map(x=>{
        const id=typeof x==="string"?x:(x.targetId||x.id||x.entityId);
        const target=entities.find(t=>t.id===id||t.masterTag===id||t.title===id);
        return target ? {target,type:(typeof x==="object"&&x.role)||"Participante"} : null;
      }).filter(Boolean);
    }else if(mode==="events" || mode==="appearances"){
      extra=listFrom(e,"events","appearances","eventIds").map(x=>{
        const id=typeof x==="string"?x:(x.targetId||x.id||x.entityId);
        const target=entities.find(t=>t.id===id||t.masterTag===id||t.title===id);
        return target ? {target,type:mode==="events"?"Evento":"Aparición"} : null;
      }).filter(Boolean);
    }

    const seen=new Set();
    const all=[...extra,...explicit].filter(r=>{
      if(!r?.target || seen.has(r.target.id)) return false;
      seen.add(r.target.id);return true;
    });

    return `<section class="module-card">
      <h2>${esc((BLUEPRINTS[e.category]?.labels||{})[mode] || TAB_LABELS[mode] || "Conexiones")}</h2>
      ${renderRelationList(all)}
    </section>`;
  }

  function renderTimeline(e){
    const entries=timelineFor(e);
    if(!entries.length) return `<section class="module-card"><h2>Cronología</h2><div class="empty">Sin entradas cronológicas todavía.</div></section>`;

    return `<section class="module-card">
      <h2>${esc((BLUEPRINTS[e.category]?.labels||{}).timeline || "Cronología")}</h2>
      <div class="timeline">${entries.map(t=>`
        <div class="timeline-entry">
          ${t.date ? `<div class="timeline-date">${esc(t.date)}</div>` : ""}
          <div class="timeline-title">${esc(t.title)}</div>
          ${t.description ? `<div class="timeline-desc">${linkifyText(t.description,e.id)}</div>` : ""}
        </div>
      `).join("")}</div>
    </section>`;
  }

  function renderSpecs(e,tabId="specs"){
    let data=e[tabId] || e.specs || e.details || e.attributes || {};
    if(Array.isArray(data)){
      data=Object.fromEntries(data.map((x,i)=>[
        x.label||x.name||`Dato ${i+1}`,
        x.value??x.text??""
      ]));
    }
    const rows=data && typeof data==="object" ? Object.entries(data).filter(([,v])=>v!==""&&v!=null) : [];

    if(!rows.length){
      const facts=factsFor(e);
      if(facts.length) rows.push(...facts.map(f=>[f.label,f.value]));
    }

    return `<section class="module-card">
      <h2>${esc((BLUEPRINTS[e.category]?.labels||{})[tabId] || TAB_LABELS[tabId] || "Datos")}</h2>
      ${rows.length
        ? `<table class="key-table">${rows.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>`
        : `<div class="empty">Sin datos específicos todavía.</div>`}
    </section>`;
  }

  function renderMedia(e){
    const media=mediaFor(e);
    const links=toArray(e.links).map(l=>typeof l==="string"?{url:l,label:l}:l);

    return `<div class="module-stack">
      <section class="module-card">
        <h2>${esc((BLUEPRINTS[e.category]?.labels||{}).media || "Material")}</h2>
        ${media.length ? `<div class="media-grid">${media.map(m=>`
          <div class="media-card">
            ${m.type==="image" ? `<img src="${esc(m.url)}" alt="">` : ""}
            <div class="media-copy">
              ${m.title ? `<strong>${esc(m.title)}</strong>` : ""}
              ${m.caption ? `<small>${esc(m.caption)}</small>` : ""}
              ${m.type!=="image" ? `<a class="external-link" href="${esc(m.url)}" target="_blank" rel="noopener">Abrir archivo <span>↗</span></a>` : ""}
            </div>
          </div>
        `).join("")}</div>` : `<div class="empty">Sin material asociado todavía.</div>`}
      </section>

      ${links.length ? `<section class="module-card"><h2>Enlaces</h2>
        <div class="source-list">${links.map(l=>`
          <a class="external-link" href="${esc(l.url||l.href||"#")}" target="_blank" rel="noopener">
            <span>${esc(l.label||l.title||l.url||"Enlace")}</span><span>↗</span>
          </a>`).join("")}
        </div>
      </section>` : ""}
    </div>`;
  }

  function renderMap(e){
    const map=mapFor(e);
    if(!map || !map.image){
      return `<section class="module-card"><h2>${esc((BLUEPRINTS[e.category]?.labels||{}).map || "Mapa")}</h2><div class="empty">Sin mapa asociado todavía.</div></section>`;
    }

    return `<section class="module-card">
      <h2>${esc((BLUEPRINTS[e.category]?.labels||{}).map || "Mapa")}</h2>
      <div class="map-shell">
        <div class="map-stage">
          <img src="${esc(map.image)}" alt="">
          ${map.points.map((p,i)=>{
            const x=Number(p.x??p.left??50), y=Number(p.y??p.top??50);
            const target=p.targetId ? entities.find(t=>t.id===p.targetId||t.masterTag===p.targetId) : null;
            return `<button class="map-pin" style="left:${x}%;top:${y}%" ${target?`data-open-related="${target.id}"`:""} title="${esc(p.label||p.title||`Punto ${i+1}`)}"><span>${i+1}</span></button>`;
          }).join("")}
        </div>
        ${map.caption ? `<div class="map-caption">${esc(map.caption)}</div>` : ""}
      </div>
    </section>`;
  }

  function renderSources(e){
    const sources=sourcesFor(e);
    return `<section class="module-card">
      <h2>Fuentes</h2>
      ${sources.length ? `<div class="source-list">${sources.map(s=>`
        <div class="source-item">
          <strong>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}</strong>
          ${s.note ? `<p>${esc(s.note)}</p>` : ""}
        </div>
      `).join("")}</div>` : `<div class="empty">Sin fuentes registradas todavía.</div>`}
    </section>`;
  }

  function renderNotes(e){
    const notes=toArray(e.notes).map(n=>typeof n==="string"?n:(n.text||n.note||n.body||"")).filter(Boolean);
    return `<section class="module-card"><h2>${esc((BLUEPRINTS[e.category]?.labels||{}).notes || "Notas")}</h2>
      ${notes.length ? `<div class="rich-text">${notes.map(n=>`<p>${linkifyText(n,e.id)}</p>`).join("")}</div>` : `<div class="empty">Sin notas todavía.</div>`}
    </section>`;
  }

  function renderAdaptation(e){
    const value=e.adaptation || e.sethoriaUse || e.useInSethoria || "";
    return `<section class="module-card"><h2>Uso en Sethoria</h2>
      ${value ? `<div class="rich-text"><p>${linkifyText(value,e.id)}</p></div>` : `<div class="empty">Sin adaptación registrada todavía.</div>`}
    </section>`;
  }

  function renderTab(e,tabId){
    if(tabId==="overview") return renderOverview(e);
    if(["relations","members","participants","events","appearances"].includes(tabId)) return renderRelations(e,tabId);
    if(tabId==="timeline") return renderTimeline(e);
    if(tabId==="map") return renderMap(e);
    if(tabId==="media") return renderMedia(e);
    if(tabId==="sources") return renderSources(e);
    if(tabId==="notes") return renderNotes(e);
    if(tabId==="adaptation") return renderAdaptation(e);
    if(["specs","society","scope","examples","stages"].includes(tabId)) return renderSpecs(e,tabId);
    return `<section class="module-card"><div class="empty">Módulo todavía vacío.</div></section>`;
  }

  function blueprintFor(e){
    return BLUEPRINTS[e.category] || {tabs:["overview","relations","timeline","media","sources"],labels:{}};
  }

  function renderTechnical(e){
    return `<details class="technical-box">
      <summary>Identificación técnica</summary>
      <div class="technical-inner">
        <table class="key-table">
          <tr><th>ID</th><td>${esc(e.id)}</td></tr>
          <tr><th>Etiqueta maestra</th><td>${esc(e.masterTag||"—")}</td></tr>
          <tr><th>Alias</th><td>${esc(toArray(e.aliases).join(", ")||"—")}</td></tr>
          <tr><th>Etiquetas</th><td>${esc(toArray(e.tags).join(", ")||"—")}</td></tr>
        </table>
        <div class="tech-actions">
          <button class="mini-button" id="copyMasterTag">Copiar etiqueta</button>
          <button class="mini-button" id="copyInternalLink">Copiar referencia</button>
        </div>
      </div>
    </details>`;
  }


  // ============================================================
  // PERSONAJES — A6.5
  // Wiki personal: lectura limpia + modo de edición discreto.
  // ============================================================

  const CHARACTER_TABS = [
    ["profile","Perfil","personajes"],
    ["appearance","Apariencia","ropa"],
    ["history","Historia","historia-real"],
    ["bonds","Lazos","relaciones"],
    ["gallery","Galería","objetos"],
    ["participation","Participación","arcos"],
    ["research","Investigación","fuentes"]
  ];

  const PROFILE_FIELDS = [
    ["personality","Personalidad"],
    ["psychology","Psicología"],
    ["capabilities","Habilidades y conocimientos"],
    ["weaknesses","Debilidades y limitaciones"],
    ["motivations","Motivaciones"],
    ["customs","Costumbres y hábitos"],
    ["tastes","Gustos e intereses"]
  ];

  const APPEARANCE_FIELDS = [
    ["general","Aspecto general"],
    ["clothing","Ropa"],
    ["equipment","Equipo"],
    ["weapons","Armas"],
    ["distinctive","Rasgos distintivos"]
  ];

  const BOND_GROUPS = [
    ["alliances","Alianzas"],
    ["family","Familia"],
    ["enemies","Enemigos"],
    ["other","Otros"]
  ];

  function characterData(e){
    if(!e.character) e.character={};
    return e.character;
  }

  function getPath(obj,path){
    return String(path||"").split(".").filter(Boolean).reduce((cur,key)=>cur?.[/^\d+$/.test(key)?Number(key):key],obj);
  }

  function setPath(obj,path,value){
    const parts=String(path||"").split(".").filter(Boolean);
    let cur=obj;
    parts.forEach((part,i)=>{
      const key=/^\d+$/.test(part)?Number(part):part;
      if(i===parts.length-1){cur[key]=value;return}
      const next=parts[i+1];
      if(cur[key]==null || typeof cur[key]!=="object") cur[key]=/^\d+$/.test(next)?[]:{};
      cur=cur[key];
    });
  }

  function deepCopy(value){
    if(value==null) return value;
    try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value))}
  }

  function sameSnapshot(a,b){
    try{return JSON.stringify(a)===JSON.stringify(b)}catch{return false}
  }

  function pushHistory(entry){
    undoStack.push(entry);
    if(undoStack.length>HISTORY_LIMIT) undoStack.shift();
    redoStack=[];
  }

  async function saveEntityDirect(e){
    const before=historyBusy?null:await getEntityById(e.id);
    const after=deepCopy(e);
    if(!historyBusy && !sameSnapshot(before,after)) pushHistory({id:e.id,before:deepCopy(before),after:deepCopy(after)});
    await putEntity(after);
    const idx=entities.findIndex(x=>x.id===e.id);
    if(idx>=0) entities[idx]=after; else entities.push(after);
    return after;
  }

  async function applyHistorySnapshot(entry,useBefore){
    if(!entry)return;
    historyBusy=true;
    try{
      const snap=deepCopy(useBefore?entry.before:entry.after);
      if(snap) await putEntity(snap); else await deleteEntityById(entry.id);
      entities=await getAll();
      if(currentView.type==="entity" && !entities.some(x=>x.id===currentView.id)) showCategory("personajes");
      else rerenderCurrentView();
    }finally{historyBusy=false}
  }

  async function appUndo(){
    const entry=undoStack.pop();if(!entry)return;
    redoStack.push(entry);
    await applyHistorySnapshot(entry,true);
    toast("Deshecho");
  }

  async function appRedo(){
    const entry=redoStack.pop();if(!entry)return;
    undoStack.push(entry);
    await applyHistorySnapshot(entry,false);
    toast("Rehecho");
  }


  function wireMapDrawHotkeys(){
    document.addEventListener("keydown",ev=>{
      if(ev.key!=="Enter"||!editMode||!placeMapTool)return;
      const active=document.activeElement;
      if(active?.isContentEditable||["INPUT","TEXTAREA","SELECT","BUTTON"].includes(active?.tagName))return;
      if(!["draw-zone","draw-route","draw-line","append-nodes","zone-part","zone-hole"].includes(placeMapTool.mode))return;
      if(currentView.type!=="entity")return;
      const e=entities.find(x=>x.id===currentView.id);
      if(!e||e.category!=="lugares")return;
      const m=activePlaceMap(e);
      if(!m||m.id!==placeMapTool.mapId)return;
      ev.preventDefault();
      finishMapTool(e,m);
    });
  }

  function wireUndoKeys(){
    document.addEventListener("keydown",e=>{
      if(!editMode || !(e.ctrlKey||e.metaKey))return;
      const key=e.key.toLowerCase();
      const active=document.activeElement;
      const inputType=String(active?.type||"").toLowerCase();
      const nativeEditor=active?.isContentEditable || active?.tagName==="TEXTAREA" || (active?.tagName==="INPUT" && ["text","number","search","url","email","date","time","datetime-local"].includes(inputType));
      if(key==="z" && !e.shiftKey){
        // Mientras se escribe, dejamos al navegador deshacer caracteres normalmente.
        if(nativeEditor)return;
        e.preventDefault();appUndo();
      }else if((key==="z"&&e.shiftKey)||key==="y"){
        if(nativeEditor)return;
        e.preventDefault();appRedo();
      }
    });
  }

  function editableRaw(value,type="text"){
    if(Array.isArray(value)) return value.join("\n");
    if(value==null || value==="—") return "";
    return String(value);
  }

  function renderEditable(value,path,e,{lines=false,cls="",placeholder="—"}={}){
    const raw=editableRaw(value,lines?"lines":"text");
    const shown=raw || placeholder;
    if(!editMode) return `<div class="direct-edit readonly ${cls}">${linkifyText(shown,e.id)}</div>`;
    return `<div class="direct-edit ${cls}" contenteditable="true" spellcheck="true"
      data-edit-path="${esc(path)}" data-edit-type="${lines?"lines":"text"}"
      data-edit-empty="${esc(placeholder)}">${linkifyText(shown,e.id)}</div>`;
  }

  function renderEditableName(value,path,e,{cls="",placeholder="Sin nombre"}={}){
    const raw=editableRaw(value);
    const shown=raw || placeholder;
    if(!editMode) return `<span class="direct-edit readonly entity-name-direct ${cls}">${esc(shown)}</span>`;
    return `<span class="direct-edit entity-name-direct ${cls}" contenteditable="true" spellcheck="false"
      data-edit-path="${esc(path)}" data-edit-type="text" data-edit-empty="${esc(placeholder)}">${esc(shown)}</span>`;
  }

  function wireDirectEditors(e){
    if(!editMode) return;
    $$('[data-edit-path]').forEach(el=>{
      el.onfocus=()=>{
        if(el.dataset.editing==="1") return;
        el.dataset.editing="1";
        const value=getPath(e,el.dataset.editPath);
        el.textContent=editableRaw(value,el.dataset.editType);
        if(!el.textContent) el.textContent="";
      };
      el.onblur=async()=>{
        const path=el.dataset.editPath;
        const raw=el.innerText.replace(/\u00a0/g," ").trim();
        const value=el.dataset.editType==="lines"
          ? raw.split(/\n+/).map(x=>x.trim()).filter(Boolean)
          : raw;
        setPath(e,path,value);
        await saveEntityDirect(e);
        el.dataset.editing="0";
        el.innerHTML=linkifyText(raw || el.dataset.editEmpty || "—",e.id);
        wireEntityLinks();
      };
    });
  }

  function normalizeInfo(e){
    const c=characterData(e);
    c.info ||= {};
    c.info.personal ||= {};
    c.info.story ||= {};
    c.info.appearance ||= {};
    c.profile ||= {};
    c.profileMedia ||= {};
    c.appearanceTab ||= {};
    c.appearanceMedia ||= {};
    c.history ||= [];
    c.relationships ||= {};
    for(const [key] of BOND_GROUPS) c.relationships[key] ||= [];
    c.gallery ||= [];
    c.research ||= {};
    return c;
  }

  function infoRows(e){
    normalizeInfo(e);
    return [
      {title:"Información personal",rows:[
        ["También conocido como","character.info.personal.aka",true],
        ["Género","character.info.personal.gender",false],
        ["Nacionalidad","character.info.personal.nationality",false],
        ["Cultura","character.info.personal.culture",false],
        ["Idiomas","character.info.personal.languages",true],
        ["Religión","character.info.personal.religion",false],
        ["Ocupación","character.info.personal.occupation",false],
        ["Nacimiento","character.info.personal.birth",false],
        ["Fallecimiento","character.info.personal.death",false],
        ["Edad","character.info.personal.age",false],
        ["Estado civil","character.info.personal.civilStatus",false]
      ]},
      {title:"En la historia",rows:[
        ["Primera aparición","character.info.story.firstAppearance",false],
        ["Relaciones importantes","character.info.story.importantRelations",true]
      ]},
      {title:"Descripción física",rows:[
        ["Cabello","character.info.appearance.hair",false],
        ["Ojos","character.info.appearance.eyes",false],
        ["Piel","character.info.appearance.skin",false],
        ["Complexión","character.info.appearance.build",false]
      ]}
    ];
  }

  async function choosePortrait(e,refresh){
    const file=await new Promise(resolve=>{const input=document.createElement("input");input.type="file";input.accept="image/*,.gif";input.onchange=()=>resolve(input.files?.[0]||null);input.click()});
    if(!file)return;const kind=mediaKind(file);if(kind!=="image"){alert("El retrato debe ser una imagen o GIF.");return}
    e.image=await readFileDataURL(file);await saveEntityDirect(e);refresh();
  }

  function portraitControls(kind){
    if(!editMode)return "";
    return `<div class="portrait-controls edit-only"><button data-change-cover="${kind}">Cambiar</button><button data-remove-cover="${kind}" title="Quitar">×</button></div>`;
  }

  function renderCharacterInfobox(e){
    normalizeInfo(e);
    const image=getImage(e);
    return `<aside class="character-infobox">
      <div class="character-portrait-shell">
        <div class="character-portrait">
          ${image?`<img src="${esc(image)}" alt="">`:`<div class="character-portrait-placeholder">${icon("personajes")}</div>`}
          ${portraitControls("character")}
        </div>
        <div class="portrait-ornament"></div>
      </div>
      ${infoRows(e).map(group=>`<section class="infobox-section">
        <h3>${esc(group.title)}</h3><dl>
          ${group.rows.map(([label,path,lines])=>`<div class="infobox-row"><dt>${esc(label)}</dt><dd>${renderEditable(getPath(e,path),path,e,{lines,cls:"infobox-direct-edit"})}</dd></div>`).join("")}
        </dl>
      </section>`).join("")}
    </aside>`;
  }

  function mediaKind(file){
    const name=(file?.name||"").toLowerCase();
    const type=(file?.type||"").toLowerCase();
    if(type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(name)) return "image";
    if(type.startsWith("video/") || /\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(name)) return "video";
    return "";
  }

  function readFileDataURL(file){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);
    });
  }

  function readMediaDimensions(src,kind){
    return new Promise(resolve=>{
      if(kind==="image"){
        const img=new Image();
        img.onload=()=>resolve({width:img.naturalWidth||0,height:img.naturalHeight||0});
        img.onerror=()=>resolve({width:0,height:0});img.src=src;
      }else{
        const v=document.createElement("video");
        v.preload="metadata";
        v.onloadedmetadata=()=>resolve({width:v.videoWidth||0,height:v.videoHeight||0});
        v.onerror=()=>resolve({width:0,height:0});v.src=src;
      }
    });
  }

  async function chooseMediaFiles(multiple=false){
    const files=await new Promise(resolve=>{
      const input=document.createElement("input");
      input.type="file";
      input.multiple=multiple;
      input.accept="image/*,video/mp4,video/webm,video/ogg,.gif,.mov,.m4v";
      input.onchange=()=>resolve([...(input.files||[])]);
      input.click();
    });
    if(!files.length)return [];
    const out=[];
    for(const file of files){
      const kind=mediaKind(file);
      if(!kind){alert(`No pude cargar ${file.name}: no es una imagen, GIF o video compatible.`);continue}
      const src=await readFileDataURL(file);
      const dims=await readMediaDimensions(src,kind);
      out.push({
        id:`media-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        kind,src,name:file.name,width:dims.width,height:dims.height,
        position:"center",size:kind==="video"?48:34,anchor:0,charOffset:0,offsetLines:0,offsetPx:0,caption:""
      });
    }
    return out;
  }

  async function chooseMedia(){
    return (await chooseMediaFiles(false))[0]||null;
  }

  async function chooseMediaMany(){
    return await chooseMediaFiles(true);
  }


  function mediaRange(item,position){
    const w=Number(item.width)||1,h=Number(item.height)||1,aspect=w/h;
    if(position==="center"){
      if(aspect<.60) return [18,44];
      if(aspect<.85) return [18,54];
      if(aspect<=1.25) return [20,68];
      if(aspect<=2.2) return [22,82];
      return [24,92];
    }
    // Panorámicas extremas no funcionan bien como flotantes laterales.
    if(aspect>3.2) return null;
    if(aspect<.60) return [18,28];
    if(aspect<.85) return [18,34];
    if(aspect<=1.25) return [20,42];
    return [22,46];
  }

  function renderMediaElement(item){
    if(!item?.src) return `<div class="gallery-placeholder">${icon("personajes")}</div>`;
    if(item.kind==="video") return `<video src="${esc(item.src)}" controls preload="metadata"></video>`;
    return `<img src="${esc(item.src)}" alt="">`;
  }

  function splitRichParagraphs(value){
    const raw=editableRaw(value);
    const parts=raw.split(/\n\s*\n/).map(x=>x.trim());
    return parts.length?parts:[""];
  }

  function renderSingleEmbeddedMedia(item,path,i,e){
    if(item.position==="row") item.position="center";
    const pos=["left","right","center"].includes(item.position)?item.position:"center";
    const size=Math.max(2,Math.min(96,Number(item.size)||34));
    const limits=mediaRange(item,pos)||[2,96];
    const min=Math.max(2,Math.round(Math.min(limits[0],size)));
    const max=Math.min(96,Math.max(Math.round(limits[1]),Math.ceil(size)));
    const ratio=(Number(item.width)>0&&Number(item.height)>0)?`${Number(item.width)}/${Number(item.height)}`:"auto";
    const offsetLines=Math.max(0,Number(item.offsetLines)||0);
    const offsetPx=Number.isFinite(Number(item.offsetPx))?Math.max(0,Number(item.offsetPx)):offsetLines*26;
    return `<figure class="embedded-media media-${esc(pos)} effective-${esc(pos)}" data-media-block data-media-path="${esc(path)}" data-media-index="${i}" data-position="${esc(pos)}" data-width="${Number(item.width)||0}" data-height="${Number(item.height)||0}" style="--media-size:${size}%;--media-offset-lines:${offsetLines};--media-offset-px:${offsetPx}px">
      <div class="embedded-media-frame" style="aspect-ratio:${ratio}">
        ${renderMediaElement(item)}
        ${editMode?`<div class="media-drag-surface" title="Arrastra para colocar la imagen"></div>
        <div class="media-controls edit-only">
          <button class="media-shift" data-media-shift="-1" title="Subir una línea">↑</button>
          <button class="media-shift" data-media-shift="1" title="Bajar una línea">↓</button>
          <input class="media-size" type="range" min="${min}" max="${max}" step="2" value="${size}" aria-label="Tamaño">
          <button class="media-remove" data-media-remove title="Quitar">×</button>
        </div>`:""}
      </div>
      ${renderEditable(item.caption||"",`${path}.${i}.caption`,e,{cls:"media-caption",placeholder:editMode?"Pie opcional":""})}
    </figure>`;
  }

  function renderRichFlow(value,path,media,mediaPath,e){
    const paragraphs=splitRichParagraphs(value);
    const items=toArray(media);
    const buckets=new Map();
    items.forEach((item,i)=>{
      if(item.position==="row") item.position="center";
      if(!["left","right","center"].includes(item.position)) item.position="center";
      let anchor=Number.isFinite(Number(item.anchor))?Number(item.anchor):0;
      anchor=Math.max(0,Math.min(anchor,Math.max(0,paragraphs.length-1)));
      item.anchor=anchor;
      if(!buckets.has(anchor))buckets.set(anchor,[]);
      buckets.get(anchor).push([item,i]);
    });
    let html='<div class="rich-content-flow" data-rich-flow data-rich-path="'+esc(path)+'">';
    paragraphs.forEach((p,pi)=>{
      const group=buckets.get(pi)||[];
      const side=group.filter(([item])=>["left","right"].includes(item.position));
      const centered=group.filter(([item])=>item.position==="center");

      // Las laterales nacen dentro del párrafo elegido para que el texto las envuelva.
      if(side.length){
        html+=`<div class="media-anchor-group media-anchor-side" data-anchor="${pi}">${side.map(([item,i])=>renderSingleEmbeddedMedia(item,mediaPath,i,e)).join("")}</div>`;
      }

      if(editMode){
        html+=`<p class="rich-paragraph character-prose" contenteditable="true" spellcheck="true" data-rich-paragraph="${pi}" data-rich-path="${esc(path)}">${esc(p||"")}</p>`;
      }else{
        html+=`<p class="rich-paragraph character-prose">${linkifyText(p||"",e.id)}</p>`;
      }

      // Un bloque centrado es un espacio propio. Una o varias imágenes del mismo
      // anclaje forman automáticamente una fila horizontal centrada.
      if(centered.length){
        html+=`<div class="media-anchor-group media-anchor-center" data-anchor="${pi}"><div class="media-horizontal-row">${centered.map(([item,i])=>renderSingleEmbeddedMedia(item,mediaPath,i,e)).join("")}</div></div>`;
      }
    });
    html+='<div class="rich-clear"></div></div>';
    return html;
  }


  function richSection(e,{title,path,mediaPath,titlePath="",removeAction="",addMedia=true}){
    const value=getPath(e,path)||"";
    const media=getPath(e,mediaPath)||[];
    return `<section class="character-section media-aware-block">
      <div class="section-title-row">
        ${titlePath?`<h2 class="editable-heading">${renderEditable(title,titlePath,e,{cls:"heading-editor",placeholder:"Título"})}</h2>`:`<h2>${esc(title)}</h2>`}
        ${editMode&&removeAction?`<button class="section-remove edit-only" ${removeAction}>×</button>`:""}
      </div>
      ${renderRichFlow(value,path,media,mediaPath,e)}
      ${editMode&&addMedia?`<button class="inline-add-media edit-only" data-add-media="${esc(mediaPath)}" data-media-text-path="${esc(path)}">＋ Multimedia</button>`:""}
    </section>`;
  }

  function renderCharacterProfile(e){
    const c=normalizeInfo(e);
    c.introMedia ||= [];
    return `<div class="character-content-stack">
      <section class="character-intro-card media-aware-block">
        ${renderRichFlow(e.summary||"","summary",c.introMedia,"character.introMedia",e)}
        ${editMode?`<button class="inline-add-media edit-only" data-add-media="character.introMedia" data-media-text-path="summary">＋ Multimedia</button>`:""}
      </section>
      ${PROFILE_FIELDS.map(([key,label])=>{
        c.profileMedia[key] ||= [];
        return richSection(e,{title:label,path:`character.profile.${key}`,mediaPath:`character.profileMedia.${key}`});
      }).join("")}
    </div>`;
  }

  function renderCharacterAppearance(e){
    const c=normalizeInfo(e);
    return `<div class="character-content-stack">
      ${APPEARANCE_FIELDS.map(([key,label])=>{
        c.appearanceMedia[key] ||= [];
        return richSection(e,{title:label,path:`character.appearanceTab.${key}`,mediaPath:`character.appearanceMedia.${key}`});
      }).join("")}
    </div>`;
  }

  function renderCharacterHistory(e){
    const c=normalizeInfo(e);
    return `<div class="character-content-stack">
      ${c.history.map((s,i)=>{
        if(typeof s==="string") c.history[i]={title:`Apartado ${i+1}`,body:s,media:[]};
        c.history[i].media ||= [];
        return richSection(e,{title:c.history[i].title||`Apartado ${i+1}`,titlePath:`character.history.${i}.title`,path:`character.history.${i}.body`,mediaPath:`character.history.${i}.media`,removeAction:`data-remove-history="${i}"`});
      }).join("")}
      ${editMode?`<button class="section-add edit-only" data-add-history>＋ Apartado</button>`:""}
    </div>`;
  }

  function relationTarget(item){
    const id=item?.targetId||item?.id||item?.target;
    return entities.find(x=>x.id===id||x.masterTag===id||x.title===id) || null;
  }

  function renderCharacterBonds(e){
    const c=normalizeInfo(e);
    return `<div class="character-content-stack">
      ${BOND_GROUPS.map(([key,label])=>`<section class="character-section">
        <div class="section-title-row"><h2>${label}</h2>${editMode?`<button class="bond-add edit-only" data-add-bond="${key}">＋ Lazo</button>`:""}</div>
        <div class="bond-detail-stack">
          ${c.relationships[key].map((item,i)=>{
            const target=relationTarget(item);
            return `<article class="bond-detail-card">
              <div class="bond-detail-head">
                <div class="bond-detail-title">
                  ${target?`<button class="text-button bond-name-link" data-open-related="${target.id}">${esc(target.title)}</button>`:`<strong>Entidad no encontrada</strong>`}
                  ${renderEditable(item.type||"",`character.relationships.${key}.${i}.type`,e,{cls:"bond-type-edit",placeholder:"Aclaración opcional"})}
                </div>
                ${editMode?`<button class="bond-remove edit-only" data-remove-bond="${key}" data-bond-index="${i}">×</button>`:""}
              </div>
              ${renderEditable(item.note||"",`character.relationships.${key}.${i}.note`,e,{cls:"character-prose bond-note-edit",placeholder:"Texto opcional"})}
            </article>`;
          }).join("") || `<div class="empty">—</div>`}
        </div>
      </section>`).join("")}
    </div>`;
  }

  function renderCharacterGallery(e){
    const c=normalizeInfo(e);
    return `<section class="character-section gallery-section">
      <div class="section-title-row"><h2>Galería</h2>${editMode?`<button class="gallery-add edit-only" data-add-gallery>＋ Multimedia</button>`:""}</div>
      <div class="character-gallery-grid">
        ${c.gallery.map((item,i)=>`<article class="character-gallery-card">
          ${renderMediaElement(item)}
          ${renderEditable(item.caption||"",`character.gallery.${i}.caption`,e,{cls:"gallery-caption direct-gallery-caption",placeholder:"Pie opcional"})}
          ${editMode?`<button class="gallery-remove edit-only" data-remove-gallery="${i}">×</button>`:""}
        </article>`).join("") || `<div class="empty">—</div>`}
      </div>
    </section>`;
  }

  function participationCategories(){
    return [["arcos","Arcos"],["eventos","Eventos"],["grupos","Grupos"],["batallas","Batallas"],["lugares","Lugares"],["rutas","Rutas"],["barcos","Barcos"]];
  }

  function collectCharacterText(e){
    const clone=JSON.parse(JSON.stringify(e));
    function walk(v,out=[]){
      if(typeof v==="string") out.push(v);
      else if(Array.isArray(v)) v.forEach(x=>walk(x,out));
      else if(v && typeof v==="object") Object.entries(v).forEach(([k,x])=>{if(k!=="src" && k!=="dataUrl") walk(x,out)});
      return out;
    }
    return walk(clone,[]).join(" ").toLocaleLowerCase("es");
  }

  function findCharacterParticipation(e){
    const hay=collectCharacterText(e);
    return participationCategories().map(([category,label])=>{
      const items=entities.filter(target=>{
        if(target.id===e.id || target.category!==category) return false;
        return entityTerms(target).some(term=>String(term).length>=3 && hay.includes(String(term).toLocaleLowerCase("es")));
      });
      return {category,label,items};
    }).filter(g=>g.items.length);
  }

  function renderCharacterParticipation(e){
    const groups=findCharacterParticipation(e);
    if(!groups.length) return `<section class="character-section"><h2>Participación</h2><div class="empty">—</div></section>`;
    return `<div class="character-content-stack">${groups.map(group=>`<section class="character-section"><h2>${esc(group.label)}</h2><div class="participation-grid">${group.items.map(target=>`<button class="participation-card" data-open-related="${target.id}"><span class="participation-icon">${icon(target.category)}</span><span><strong>${esc(target.title)}</strong></span></button>`).join("")}</div></section>`).join("")}</div>`;
  }

  function renderCharacterResearch(e){
    const c=normalizeInfo(e),r=c.research;
    r.kind ||= "Inventado";r.workStatus ||= "Nuevo";r.sources ??= "";r.pending ??= "";r.notes ??= "";
    if(Array.isArray(r.sources)) r.sources=r.sources.map(x=>typeof x==="string"?x:(x.url||x.title||"")).join("\n");
    if(Array.isArray(r.pending)) r.pending=r.pending.map(x=>typeof x==="string"?x:(x.text||"")).join("\n");
    if(Array.isArray(r.notes)) r.notes=r.notes.map(x=>typeof x==="string"?x:(x.text||x.note||"")).join("\n");
    return `<div class="character-content-stack">
      <section class="character-section research-choices"><div><h2>Personaje</h2>${editMode?`<select data-select-path="character.research.kind"><option ${r.kind==="Inventado"?"selected":""}>Inventado</option><option ${r.kind==="Real"?"selected":""}>Real</option></select>`:`<div class="research-value">${esc(r.kind)}</div>`}</div><div><h2>Estado de desarrollo</h2>${editMode?`<select data-select-path="character.research.workStatus"><option ${r.workStatus==="Nuevo"?"selected":""}>Nuevo</option><option ${r.workStatus==="En desarrollo"?"selected":""}>En desarrollo</option><option ${r.workStatus==="Final"?"selected":""}>Final</option></select>`:`<div class="research-value">${esc(r.workStatus)}</div>`}</div></section>
      <section class="character-section"><h2>Fuentes</h2>${renderEditable(r.sources,"character.research.sources",e,{cls:"character-prose editable-long-text",placeholder:"—"})}</section>
      <section class="character-section"><h2>Pendientes</h2>${renderEditable(r.pending,"character.research.pending",e,{cls:"character-prose editable-long-text",placeholder:"—"})}</section>
      <section class="character-section"><h2>Notas</h2>${renderEditable(r.notes,"character.research.notes",e,{cls:"character-prose editable-long-text",placeholder:"—"})}</section>
    </div>`;
  }

  function renderCharacterTab(e,tab){
    if(tab==="profile") return renderCharacterProfile(e);
    if(tab==="appearance") return renderCharacterAppearance(e);
    if(tab==="history") return renderCharacterHistory(e);
    if(tab==="bonds") return renderCharacterBonds(e);
    if(tab==="gallery") return renderCharacterGallery(e);
    if(tab==="participation") return renderCharacterParticipation(e);
    if(tab==="research") return renderCharacterResearch(e);
    return renderCharacterProfile(e);
  }

  function preferredMediaAnchor(e,textPath){
    const paragraphs=splitRichParagraphs(textPath?getPath(e,textPath):"");
    if(lastRichFocus && lastRichFocus.entityId===e.id && lastRichFocus.path===textPath){
      return Math.max(0,Math.min(Number(lastRichFocus.index)||0,paragraphs.length-1));
    }
    return Math.max(0,paragraphs.length-1);
  }

  async function addMediaAtPath(e,path,textPath=""){
    const items=await chooseMediaMany();if(!items.length)return;
    let arr=getPath(e,path);if(!Array.isArray(arr)){arr=[];setPath(e,path,arr)}
    const anchor=preferredMediaAnchor(e,textPath);
    const asGroup=items.length>1;
    for(const item of items){
      item.anchor=anchor;item.charOffset=0;delete item.offsetLines;delete item.offsetPx;item.position="center";
      if(asGroup) item.size=Math.min(30,item.size||30);
      arr.push(item);
    }
    await saveEntityDirect(e);refreshCharacterTab(e);
  }

  function rerenderMediaBlock(block,item){
    block.classList.remove("media-left","media-center","media-right");
    block.classList.add(`media-${item.position||"center"}`);
    block.dataset.position=item.position||"center";
    block.style.setProperty("--media-size",`${item.size||50}%`);
  }

  function applyMediaRules(){
    $$('[data-media-block]').forEach(block=>{
      const range=block.querySelector('.media-size');
      const parent=block.closest('.media-aware-block');
      if(!parent)return;
      const idx=Number(block.dataset.mediaIndex),path=block.dataset.mediaPath;
      const e=entities.find(x=>x.id===currentView.id);if(!e)return;
      const item=getPath(e,`${path}.${idx}`);if(!item)return;
      if(item.position==="row") item.position="center";

      const flowEl=block.closest('[data-rich-flow]');
      const width=(flowEl?.clientWidth)||parent.clientWidth||700;
      let stored=Math.max(2,Math.min(96,Number(item.size)||34));
      let effective=["left","right","center"].includes(item.position)?item.position:"center";

      // La posición elegida por el usuario es estable. En escritorio, una imagen
      // guardada como izquierda/derecha NO se convierte silenciosamente a centro.
      // La adaptación para pantallas estrechas queda exclusivamente en CSS.

      block.style.setProperty("--media-size",`${stored}%`);
      block.classList.remove("effective-left","effective-center","effective-right","effective-row");
      block.classList.add(`effective-${effective}`);

      const anchorP=block.closest('[data-rich-flow]')?.querySelector(`[data-rich-paragraph="${Math.max(0,Number(item.anchor)||0)}"]`);
      const fallbackLh=anchorP?(parseFloat(getComputedStyle(anchorP).lineHeight)||18):18;
      const offsetPx=Number.isFinite(Number(item.offsetPx))?Math.max(0,Number(item.offsetPx)):(Math.max(0,Number(item.offsetLines)||0)*fallbackLh);
      block.style.setProperty("--media-offset-px",`${effective==="center"?0:offsetPx}px`);
      block.style.setProperty("--media-offset-lines",String(Math.max(0,Number(item.offsetLines)||0)));

      if(range){
        let suggested=mediaRange(item,effective)||mediaRange(item,"center")||[18,96];
        if(['left','right'].includes(effective) && !flowEl?.closest('.map-element-description-copy')){
          const dyn=sideMediaSizeLimits(flowEl,item,{mode:effective,anchor:Number(item.anchor)||0,offsetLines:Number(item.offsetLines)||0,offsetPx:Number(item.offsetPx)||0});
          suggested=[dyn.min,dyn.max];
        }
        const minV=Math.max(14,Math.floor(suggested[0]));
        const maxV=Math.max(minV,Math.min(96,Math.ceil(suggested[1])));
        if(stored<minV) stored=minV;
        if(stored>maxV) stored=maxV;
        if(!flowEl?.closest('.map-element-description-copy')) item.size=stored;
        block.style.setProperty("--media-size",`${stored}%`);
        range.min=minV;
        range.max=maxV;
        range.step=2;
        range.value=stored;
      }
    });
  }

  function resolveEntityInput(input,currentId){
    const q=String(input||"").trim().toLocaleLowerCase("es");if(!q)return null;
    const matches=entities.filter(x=>x.id!==currentId && [x.title,x.masterTag,...toArray(x.aliases)].some(v=>String(v||"").toLocaleLowerCase("es")===q));
    if(matches.length<=1) return matches[0]||null;
    const answer=prompt(`Coincidencias:\n${matches.map((x,i)=>`${i+1}. ${x.title} [${categoryName(x.category)}]`).join("\n")}\n\nNúmero:`);
    const n=Number(answer);return matches[n-1]||null;
  }

  function paragraphLineCount(flow,index){
    const p=flow?.querySelector(`[data-rich-paragraph="${index}"]`);if(!p)return 1;
    const cs=getComputedStyle(p),lh=parseFloat(cs.lineHeight)||18;
    return Math.max(1,Math.round(p.getBoundingClientRect().height/lh));
  }

  function nearestParagraphForY(flow,clientY){
    const paragraphs=[...flow.querySelectorAll('.rich-paragraph')];
    if(!paragraphs.length)return {index:0,el:null};
    let best={index:0,el:paragraphs[0],distance:Infinity};
    paragraphs.forEach((el,index)=>{
      const r=el.getBoundingClientRect();
      const d=clientY<r.top?r.top-clientY:clientY>r.bottom?clientY-r.bottom:0;
      if(d<best.distance)best={index,el,distance:d};
    });
    return best;
  }

  function createRichMeasureHost(flow){
    const width=Math.max(1,flow.getBoundingClientRect().width||flow.clientWidth||700);
    const host=document.createElement('div');
    host.style.cssText=`position:fixed;left:-20000px;top:0;width:${width}px;visibility:hidden;pointer-events:none;z-index:-1;contain:layout style paint;`;
    const measure=document.createElement('div');
    measure.className='rich-content-flow media-measure-flow';
    measure.style.width='100%';
    const originals=[...flow.querySelectorAll('.rich-paragraph')];
    const paragraphs=originals.map(src=>{
      const p=document.createElement('p');
      p.className='rich-paragraph character-prose';
      p.textContent=src.innerText||src.textContent||'';
      return p;
    });
    paragraphs.forEach(p=>measure.appendChild(p));
    host.appendChild(measure);document.body.appendChild(host);
    return {host,measure,paragraphs,width};
  }

  function naturalMediaLineCandidates(flow){
    const m=createRichMeasureHost(flow);
    const out=[];
    m.paragraphs.forEach((p,anchor)=>{
      const r=p.getBoundingClientRect();
      const lh=parseFloat(getComputedStyle(p).lineHeight)||18;
      const lines=Math.max(1,Math.round(r.height/lh));
      for(let line=0;line<lines;line++) out.push({anchor,offsetLines:line,offsetPx:line*lh});
    });
    m.host.remove();
    return out.length?out:[{anchor:0,offsetLines:0,offsetPx:0}];
  }

  function mediaPixelHeightFor(flow,item,sizePct){
    const width=Math.max(1,flow?.getBoundingClientRect().width||flow?.clientWidth||700);
    const w=Math.max(1,Number(item.width)||1),h=Math.max(1,Number(item.height)||1);
    const mediaWidth=(width*(Math.max(2,Number(sizePct)||34)/100));
    return Math.max(24,mediaWidth*(h/w));
  }

  function sideMediaSizeLimits(flow,item,intent){
    const base=mediaRange(item,intent?.mode||item.position||'left') || [18,46];
    if(!flow || !intent || !['left','right'].includes(intent.mode||'')) return {min:base[0],max:base[1]};
    let min=Number(base[0])||18,max=Number(base[1])||46;
    min=Math.max(14,Math.min(min,max));
    let best=min;
    for(let pct=min;pct<=max;pct+=2){
      const trial={...item,size:pct};
      const h=mediaPixelHeightFor(flow,trial,pct);
      const fitted=fitSidePlacementToText(flow,trial,{mode:intent.mode,anchor:Number(intent.anchor)||0,offsetLines:Number(intent.offsetLines)||0,offsetPx:Number(intent.offsetPx)||0},h);
      const res=sideCandidateHasEnoughText(flow,trial,fitted,h);
      if(res.ok || res.gap<=8) best=pct;
      else break;
    }
    best=Math.max(min,best);
    return {min,max:best};
  }

  function shiftSideMediaByLines(flow,item,delta){
    if(!flow || !item || !delta || !['left','right'].includes(item.position)) return false;
    const candidates=naturalMediaLineCandidates(flow);
    if(!candidates.length) return false;
    let idx=candidates.findIndex(c=>c.anchor===Math.max(0,Number(item.anchor)||0) && c.offsetLines===Math.max(0,Number(item.offsetLines)||0));
    if(idx<0){
      let bestDist=Infinity;
      candidates.forEach((c,i)=>{
        const d=Math.abs(c.anchor-(Number(item.anchor)||0))*100 + Math.abs(c.offsetLines-(Number(item.offsetLines)||0));
        if(d<bestDist){bestDist=d;idx=i;}
      });
    }
    const next=Math.max(0,Math.min(candidates.length-1,idx+Number(delta)));
    const c=candidates[next];
    item.anchor=c.anchor;item.offsetLines=c.offsetLines;item.offsetPx=c.offsetPx;
    return true;
  }

  function sideCandidateHasEnoughText(flow,item,intent,mediaHeight){
    const m=createRichMeasureHost(flow);
    const anchor=Math.max(0,Math.min(Number(intent.anchor)||0,m.paragraphs.length-1));
    const fake=document.createElement('div');
    const stored=Math.max(2,Math.min(96,Number(item.size)||34));
    const mediaWidth=m.width*(stored/100);
    fake.style.cssText=[
      `float:${intent.mode}`,
      `width:${mediaWidth}px`,
      `height:${Math.max(24,Number(mediaHeight)||24)}px`,
      `margin-top:${4+Math.max(0,Number(intent.offsetPx)||0)}px`,
      intent.mode==='left'?'margin-right:15px':'margin-left:15px',
      'margin-bottom:10px',
      'box-sizing:border-box'
    ].join(';');
    m.measure.insertBefore(fake,m.paragraphs[anchor]||null);
    const clear=document.createElement('div');clear.style.cssText='clear:both;height:0';m.measure.appendChild(clear);
    const fr=fake.getBoundingClientRect();
    let lastTextBottom=-Infinity;
    m.paragraphs.forEach(p=>{
      if((p.textContent||'').trim()) lastTextBottom=Math.max(lastTextBottom,p.getBoundingClientRect().bottom);
    });
    const gap=Number.isFinite(lastTextBottom)?Math.max(0,fr.bottom-lastTextBottom):Infinity;
    const ok=gap<=2;
    m.host.remove();
    return {ok,gap};
  }

  function fitSidePlacementToText(flow,item,intent,mediaHeight){
    if(!flow || !intent || !["left","right"].includes(intent.mode)) return intent;
    const candidates=naturalMediaLineCandidates(flow);
    let wanted=candidates.findIndex(c=>c.anchor===Math.max(0,Number(intent.anchor)||0) && c.offsetLines===Math.max(0,Number(intent.offsetLines)||0));
    if(wanted<0){
      wanted=candidates.reduce((best,c,i)=>{
        if(c.anchor>Number(intent.anchor||0)) return best;
        if(c.anchor===Number(intent.anchor||0) && c.offsetLines>Number(intent.offsetLines||0)) return best;
        return i;
      },0);
    }

    // Regla determinista: conserva SIEMPRE izquierda/derecha y el tamaño.
    // Solo puede subir la imagen para reducir hueco muerto; nunca la centra,
    // nunca la encoge y nunca vuelve a recolocarla después de guardarla.
    let best={...intent};
    let bestGap=Infinity;
    for(let i=wanted;i>=0;i--){
      const c=candidates[i];
      const test={...intent,anchor:c.anchor,offsetLines:c.offsetLines,offsetPx:c.offsetPx};
      const result=sideCandidateHasEnoughText(flow,item,test,mediaHeight);
      if(result.gap<bestGap){bestGap=result.gap;best=test}
      if(result.ok) return test;
    }
    return best;
  }

  function mediaDropIntent(flow,item,centerX,dropTopY,mediaHeight=0){
    const fr=flow.getBoundingClientRect();
    const width=Math.max(1,fr.width);
    const relativeX=(centerX-fr.left)/width;
    const sizePct=Math.max(4,Number(item.size)||34);
    const sideShapeAllowed=!!mediaRange(item,'left');

    // La intención horizontal depende de dónde la suelta el usuario, no de una
    // comprobación posterior que pueda anular su elección. Dejamos una franja
    // central estrecha para el bloque independiente.
    let mode='center';
    const minSideFlowWidth=flow.closest('.map-element-description-copy')?250:420;
    if(width>=minSideFlowWidth && sideShapeAllowed){
      if(relativeX<=.44) mode='left';
      else if(relativeX>=.56) mode='right';
    }

    // Para una lateral usamos el BORDE SUPERIOR real de la imagen, no la
    // posición del puntero. Eso hace que soltarla a la altura de la 2.ª, 3.ª,
    // etc. línea deje completas las líneas anteriores.
    if(mode!=='center'){
      const nearest=nearestParagraphForY(flow,dropTopY);
      let anchor=nearest.index,offsetLines=0,offsetPx=0;
      if(nearest.el){
        const r=nearest.el.getBoundingClientRect();
        const lh=parseFloat(getComputedStyle(nearest.el).lineHeight)||18;
        const lines=paragraphLineCount(flow,anchor);
        offsetLines=Math.max(0,Math.min(lines-1,Math.round((dropTopY-r.top)/lh)));
        offsetPx=offsetLines*lh;
      }
      return {mode,anchor,offsetLines,offsetPx};
    }

    // El bloque centrado vive entre párrafos. Aquí interesa el centro visual de
    // la imagen para decidir arriba/debajo, no dónde la agarró el usuario.
    const centerY=dropTopY+Math.max(0,mediaHeight)*.5;
    const nearest=nearestParagraphForY(flow,centerY);
    let anchor=nearest.index;
    if(nearest.el){
      const r=nearest.el.getBoundingClientRect();
      if(centerY<r.top+r.height*.5 && anchor>0) anchor-=1;
    }
    return {mode:'center',anchor,offsetLines:0,offsetPx:0};
  }

  function clearMediaDragPreview(block){
    block.classList.remove('is-dragging','drag-intent-left','drag-intent-right','drag-intent-center');
    block.style.removeProperty('transform');
    block.style.removeProperty('--drag-x');
    block.style.removeProperty('--drag-y');
  }

  function wireMediaDragging(e,refreshFn){
    if(!editMode)return;
    $$('[data-media-block]').forEach(block=>{
      const surface=block.querySelector('.media-drag-surface');
      if(!surface)return;
      surface.onpointerdown=ev=>{
        if(ev.button!==undefined && ev.button!==0)return;
        ev.preventDefault();ev.stopPropagation();
        const flow=block.closest('[data-rich-flow]');if(!flow)return;
        const item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;
        const startRect=block.getBoundingClientRect();
        const grabX=ev.clientX-startRect.left,grabY=ev.clientY-startRect.top;
        const state={pointerId:ev.pointerId,startX:ev.clientX,startY:ev.clientY,startRect,grabX,grabY};
        block.classList.add('is-dragging');
        try{surface.setPointerCapture(ev.pointerId)}catch{}

        const preview=moveEv=>{
          if(moveEv.pointerId!==state.pointerId)return;
          const dx=moveEv.clientX-state.startX,dy=moveEv.clientY-state.startY;
          block.style.transform=`translate3d(${dx}px,${dy}px,0)`;
          const centerX=moveEv.clientX+(state.startRect.width*.5-state.grabX);
          const dropTopY=moveEv.clientY-state.grabY;
          const intent=mediaDropIntent(flow,item,centerX,dropTopY,state.startRect.height);
          block.classList.remove('drag-intent-left','drag-intent-right','drag-intent-center');
          block.classList.add(`drag-intent-${intent.mode}`);
          state.intent=intent;
        };
        const finish=async upEv=>{
          if(upEv.pointerId!==state.pointerId)return;
          surface.onpointermove=null;surface.onpointerup=null;surface.onpointercancel=null;
          try{if(surface.hasPointerCapture(upEv.pointerId))surface.releasePointerCapture(upEv.pointerId)}catch{}
          const dx=upEv.clientX-state.startX;
          const centerX=upEv.clientX+(state.startRect.width*.5-state.grabX);
          const dropTopY=upEv.clientY-state.grabY;
          let intent=state.intent||mediaDropIntent(flow,item,centerX,dropTopY,state.startRect.height);
          intent=fitSidePlacementToText(flow,item,intent,state.startRect.height);
          item.position=intent.mode;
          item.anchor=intent.anchor;
          item.offsetLines=intent.offsetLines;
          item.offsetPx=intent.offsetPx||0;
          clearMediaDragPreview(block);
          await saveEntityDirect(e);
          refreshFn(e);
        };
        surface.onpointermove=preview;
        surface.onpointerup=finish;
        surface.onpointercancel=cancelEv=>{
          surface.onpointermove=null;surface.onpointerup=null;surface.onpointercancel=null;
          try{if(surface.hasPointerCapture(cancelEv.pointerId))surface.releasePointerCapture(cancelEv.pointerId)}catch{}
          clearMediaDragPreview(block);
        };
      };
    });
  }

  function wireRichParagraphEditors(e){
    if(!editMode)return;
    $$('[data-rich-paragraph]').forEach(el=>{
      const remember=()=>{const flow=el.closest('[data-rich-flow]');if(flow)lastRichFocus={entityId:e.id,path:flow.dataset.richPath,index:Number(el.dataset.richParagraph)||0}};
      el.onfocus=remember;el.onclick=remember;el.onkeyup=remember;
      el.onblur=async()=>{
        const flow=el.closest('[data-rich-flow]');if(!flow)return;
        const path=flow.dataset.richPath;
        const parts=[...flow.querySelectorAll('[data-rich-paragraph]')].map(p=>p.innerText.replace(/\u00a0/g,' ').trim()).filter((x,i,a)=>x||a.length===1);
        setPath(e,path,parts.join('\n\n'));
        await saveEntityDirect(e);
      };
    });
  }



  let mediaRepairBusy=false;
  async function repairRenderedSideMedia(e,refreshFn){
    if(mediaRepairBusy)return;
    let changed=false;
    for(const block of $$('[data-media-block]')){
      const item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);
      if(!item || !['left','right'].includes(item.position))continue;
      const flow=block.closest('[data-rich-flow]');if(!flow)continue;
      const h=block.getBoundingClientRect().height;
      const fixed=fitSidePlacementToText(flow,item,{mode:item.position,anchor:Number(item.anchor)||0,offsetLines:Number(item.offsetLines)||0,offsetPx:Number(item.offsetPx)||0},h);
      if(fixed.mode!==item.position || fixed.anchor!==Number(item.anchor||0) || Math.abs((fixed.offsetPx||0)-Number(item.offsetPx||0))>1){
        item.position=fixed.mode;item.anchor=fixed.anchor;item.offsetLines=fixed.offsetLines;item.offsetPx=fixed.offsetPx||0;changed=true;
      }
    }
    if(!changed)return;
    mediaRepairBusy=true;
    const prev=historyBusy;historyBusy=true;
    try{await saveEntityDirect(e);}finally{historyBusy=prev;mediaRepairBusy=false}
    refreshFn(e);
  }


  // ============================================================
  // A6.7.1 — FLUJO UNIFICADO TEXTO + MULTIMEDIA
  // La multimedia lateral vive físicamente dentro del párrafo, en una
  // posición de caracteres real. Ya no se simula altura con margin-top.
  // ============================================================

  function unifiedMediaLimits(item,position){
    const w=Number(item?.width)||1,h=Number(item?.height)||1,aspect=w/h;
    if(position==="center"){
      if(aspect<.60) return [18,44];
      if(aspect<.85) return [18,54];
      if(aspect<=1.25) return [20,68];
      if(aspect<=2.2) return [22,82];
      return [24,92];
    }
    if(aspect>3.2) return null;
    if(aspect<.60) return [18,28];
    if(aspect<.85) return [18,34];
    if(aspect<=1.25) return [20,42];
    return [22,46];
  }

  function unifiedClampCharOffset(text,item){
    const current=Number(item?.charOffset);
    if(Number.isFinite(current)) return Math.max(0,Math.min(Math.round(current),text.length));
    // Compatibilidad con datos viejos: convertir la antigua línea aproximada
    // solo como punto de partida. Tras mover/editar se guarda posición real.
    const oldLines=Math.max(0,Number(item?.offsetLines)||0);
    if(!oldLines)return 0;
    const approxLines=Math.max(1,Math.ceil(text.length/72));
    return Math.max(0,Math.min(text.length,Math.round(text.length*(oldLines/approxLines))));
  }

  function unifiedSnapToWord(text,offset){
    offset=Math.max(0,Math.min(Math.round(Number(offset)||0),text.length));
    if(offset===0||offset===text.length)return offset;
    if(/\s/.test(text[offset]||"")||/\s/.test(text[offset-1]||""))return offset;
    let best=offset,bestDist=Infinity;
    for(let i=Math.max(0,offset-18);i<=Math.min(text.length,offset+18);i++){
      if(i===0||i===text.length||/\s/.test(text[i]||"")||/\s/.test(text[i-1]||"")){
        const d=Math.abs(i-offset);if(d<bestDist){best=i;bestDist=d}
      }
    }
    return best;
  }

  function unifiedMediaCaption(item,path,i,e){
    const raw=editableRaw(item?.caption||"");
    if(!editMode) return raw?`<span class="direct-edit readonly media-caption">${linkifyText(raw,e.id)}</span>`:"";
    return `<span class="direct-edit media-caption" contenteditable="true" spellcheck="true" data-edit-path="${esc(path)}.${i}.caption" data-edit-type="text" data-edit-empty="Pie opcional">${esc(raw||"Pie opcional")}</span>`;
  }

  function renderSingleEmbeddedMedia(item,path,i,e){
    if(item.position==="row")item.position="center";
    const pos=["left","right","center"].includes(item.position)?item.position:"center";
    const limits=unifiedMediaLimits(item,pos)||unifiedMediaLimits(item,"center")||[18,92];
    const min=Math.max(12,Math.round(limits[0]));
    const max=Math.max(min,Math.min(96,Math.round(limits[1])));
    const size=Math.max(min,Math.min(max,Number(item.size)||34));
    const ratio=(Number(item.width)>0&&Number(item.height)>0)?`${Number(item.width)}/${Number(item.height)}`:"auto";
    return `<span class="embedded-media media-${esc(pos)} effective-${esc(pos)}" contenteditable="false" data-media-block data-media-path="${esc(path)}" data-media-index="${i}" data-position="${esc(pos)}" data-width="${Number(item.width)||0}" data-height="${Number(item.height)||0}" style="--media-size:${size}%">
      <span class="embedded-media-frame" style="aspect-ratio:${ratio}">
        ${renderMediaElement(item)}
        ${editMode?`<span class="media-drag-surface" title="Arrastra para colocar"></span><span class="media-controls edit-only"><button class="media-shift" data-media-shift="-1" title="Subir una línea">↑</button><button class="media-shift" data-media-shift="1" title="Bajar una línea">↓</button><input class="media-size" type="range" min="${min}" max="${max}" step="2" value="${size}" aria-label="Tamaño"><button class="media-remove" data-media-remove title="Quitar">×</button></span>`:""}
      </span>
      ${unifiedMediaCaption(item,path,i,e)}
    </span>`;
  }

  function unifiedTextSegment(text,e){return editMode?esc(text):linkifyText(text,e.id)}

  function unifiedRenderParagraph(text,side,mediaPath,e){
    const ordered=side.map(([item,i],order)=>({item,i,order,offset:unifiedClampCharOffset(text,item)})).sort((a,b)=>a.offset-b.offset||a.order-b.order);
    let html="",cursor=0;
    for(const entry of ordered){
      const at=Math.max(cursor,Math.min(entry.offset,text.length));
      html+=unifiedTextSegment(text.slice(cursor,at),e);
      html+=renderSingleEmbeddedMedia(entry.item,mediaPath,entry.i,e);
      cursor=at;
    }
    html+=unifiedTextSegment(text.slice(cursor),e);
    return html;
  }

  function renderRichFlow(value,path,media,mediaPath,e){
    const paragraphs=splitRichParagraphs(value),items=toArray(media),buckets=new Map();
    items.forEach((item,i)=>{
      if(item.position==="row")item.position="center";
      if(!["left","right","center"].includes(item.position))item.position="center";
      let anchor=Number.isFinite(Number(item.anchor))?Number(item.anchor):0;
      anchor=Math.max(0,Math.min(anchor,Math.max(0,paragraphs.length-1)));item.anchor=anchor;
      if(!buckets.has(anchor))buckets.set(anchor,[]);buckets.get(anchor).push([item,i]);
    });
    let html=`<div class="rich-content-flow" data-rich-flow data-rich-path="${esc(path)}">`;
    paragraphs.forEach((text,pi)=>{
      const group=buckets.get(pi)||[];
      const side=group.filter(([item])=>item.position==="left"||item.position==="right");
      const centered=group.filter(([item])=>item.position==="center");
      const body=unifiedRenderParagraph(text,side,mediaPath,e);
      html+=editMode?`<p class="rich-paragraph character-prose" contenteditable="true" spellcheck="true" data-rich-paragraph="${pi}" data-rich-path="${esc(path)}">${body}</p>`:`<p class="rich-paragraph character-prose" data-rich-paragraph="${pi}">${body}</p>`;
      if(centered.length)html+=`<div class="media-anchor-group media-anchor-center" data-anchor="${pi}"><div class="media-horizontal-row">${centered.map(([item,i])=>renderSingleEmbeddedMedia(item,mediaPath,i,e)).join("")}</div></div>`;
    });
    return html+'<div class="rich-clear"></div></div>';
  }

  function unifiedExtractParagraph(p,e,writeAnchors=true){
    let text="";const found=[];
    const walk=node=>{
      if(node.nodeType===Node.TEXT_NODE){text+=node.nodeValue||"";return}
      if(node.nodeType!==Node.ELEMENT_NODE)return;
      const el=node;
      if(el.matches?.('[data-media-block]')){found.push({path:el.dataset.mediaPath,index:Number(el.dataset.mediaIndex),offset:text.length});return}
      if(el.tagName==='BR'){text+='\n';return}
      const blockish=el.tagName==='DIV';
      if(blockish&&text&&!text.endsWith('\n'))text+='\n';
      [...el.childNodes].forEach(walk);
      if(blockish&&text&&!text.endsWith('\n'))text+='\n';
    };
    [...p.childNodes].forEach(walk);
    text=text.replace(/\u00a0/g,' ').replace(/\n{3,}/g,'\n\n').trim();
    if(writeAnchors&&e&&e.id!=="__measure__"){
      for(const m of found){const item=getPath(e,`${m.path}.${m.index}`);if(item){item.anchor=Number(p.dataset.richParagraph)||0;item.charOffset=Math.max(0,Math.min(m.offset,text.length));delete item.offsetLines;delete item.offsetPx;}}
    }
    return text;
  }

  function unifiedTextOffsetBeforePoint(p,node,nodeOffset){
    let count=0,done=false;
    const walk=n=>{
      if(done)return;
      if(n===node){
        if(n.nodeType===Node.TEXT_NODE)count+=Math.max(0,Math.min(nodeOffset,n.nodeValue?.length||0));
        else{const kids=[...n.childNodes];for(let i=0;i<Math.min(nodeOffset,kids.length);i++)walk(kids[i])}
        done=true;return;
      }
      if(n.nodeType===Node.TEXT_NODE){count+=n.nodeValue?.length||0;return}
      if(n.nodeType!==Node.ELEMENT_NODE)return;
      if(n.matches?.('[data-media-block]'))return;
      if(n.tagName==='BR'){count++;return}
      for(const c of n.childNodes){walk(c);if(done)break}
    };
    for(const c of p.childNodes){walk(c);if(done)break}
    return count;
  }

  function unifiedCaretOffset(p,clientY,side){
    const r=p.getBoundingClientRect();
    const x=side==='left'?Math.max(r.left+24,r.right-90):Math.min(r.right-24,r.left+90);
    let node=null,offset=0;
    if(document.caretPositionFromPoint){const pos=document.caretPositionFromPoint(x,clientY);node=pos?.offsetNode||null;offset=pos?.offset||0}
    else if(document.caretRangeFromPoint){const range=document.caretRangeFromPoint(x,clientY);node=range?.startContainer||null;offset=range?.startOffset||0}
    if(node&&p.contains(node))return unifiedTextOffsetBeforePoint(p,node,offset);
    const raw=unifiedExtractParagraph(p,{id:"__measure__"},false),lh=parseFloat(getComputedStyle(p).lineHeight)||18;
    const line=Math.max(0,Math.floor((clientY-r.top)/lh)),lines=Math.max(1,Math.ceil(r.height/lh));
    return Math.round(raw.length*Math.min(1,(line+.5)/lines));
  }

  function unifiedNearestBoundary(flow,y){
    const ps=[...flow.querySelectorAll('.rich-paragraph')];if(!ps.length)return 0;
    let best=0,d=Infinity;ps.forEach((p,i)=>{const r=p.getBoundingClientRect(),nd=Math.min(Math.abs(y-r.top),Math.abs(y-r.bottom));if(nd<d){d=nd;best=i}});
    const r=ps[best].getBoundingClientRect();return y<r.top+r.height*.5&&best>0?best-1:best;
  }

  function mediaDropIntent(flow,item,clientX,clientY,block=null){
    const fr=flow.getBoundingClientRect(),rel=(clientX-fr.left)/Math.max(1,fr.width),sideAllowed=!!unifiedMediaLimits(item,'left');
    let mode='center';if(fr.width>=420&&sideAllowed){if(rel<=.42)mode='left';else if(rel>=.58)mode='right'}
    if(mode==='center')return {mode,anchor:unifiedNearestBoundary(flow,clientY),charOffset:0};
    const nearest=nearestParagraphForY(flow,clientY),p=nearest.el;if(!p)return {mode,anchor:0,charOffset:0};
    const old=block?.style.display||'';if(block)block.style.display='none';
    const raw=unifiedExtractParagraph(p,{id:"__measure__"},false);let offset=unifiedCaretOffset(p,clientY,mode);
    if(block)block.style.display=old;
    return {mode,anchor:nearest.index,charOffset:unifiedSnapToWord(raw,offset)};
  }

  function unifiedShiftOneLine(block,item,delta){
    const flow=block.closest('[data-rich-flow]');if(!flow)return false;
    if(item.position==='center'){const n=flow.querySelectorAll('.rich-paragraph').length;item.anchor=Math.max(0,Math.min(Math.max(0,n-1),(Number(item.anchor)||0)+Number(delta)));item.charOffset=0;return true}
    const p=flow.querySelector(`[data-rich-paragraph="${Math.max(0,Number(item.anchor)||0)}"]`),lh=p?(parseFloat(getComputedStyle(p).lineHeight)||18):18;
    const r=block.getBoundingClientRect(),fr=flow.getBoundingClientRect(),x=item.position==='left'?fr.left+20:fr.right-20;
    const intent=mediaDropIntent(flow,item,x,r.top+(Number(delta)||0)*lh,block);intent.mode=item.position;
    item.anchor=intent.anchor;item.charOffset=intent.charOffset||0;delete item.offsetLines;delete item.offsetPx;return true;
  }

  function wireMediaDragging(e,refreshFn){
    if(!editMode)return;
    $$('[data-media-block]').forEach(block=>{
      const surface=block.querySelector('.media-drag-surface');if(!surface)return;
      surface.onpointerdown=ev=>{
        if(ev.button!==undefined&&ev.button!==0)return;ev.preventDefault();ev.stopPropagation();
        const flow=block.closest('[data-rich-flow]');if(!flow)return;const item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;
        const startRect=block.getBoundingClientRect(),grabX=ev.clientX-startRect.left,grabY=ev.clientY-startRect.top,state={pointerId:ev.pointerId,startX:ev.clientX,startY:ev.clientY,startRect,grabX,grabY};
        block.classList.add('is-dragging');try{surface.setPointerCapture(ev.pointerId)}catch{}
        surface.onpointermove=mv=>{if(mv.pointerId!==state.pointerId)return;const dx=mv.clientX-state.startX,dy=mv.clientY-state.startY;block.style.transform=`translate3d(${dx}px,${dy}px,0)`;const x=mv.clientX+(startRect.width*.5-grabX),y=mv.clientY-grabY,intent=mediaDropIntent(flow,item,x,y,block);block.classList.remove('drag-intent-left','drag-intent-right','drag-intent-center');block.classList.add(`drag-intent-${intent.mode}`);state.intent=intent};
        surface.onpointerup=async up=>{if(up.pointerId!==state.pointerId)return;surface.onpointermove=null;surface.onpointerup=null;surface.onpointercancel=null;try{if(surface.hasPointerCapture(up.pointerId))surface.releasePointerCapture(up.pointerId)}catch{}const x=up.clientX+(startRect.width*.5-grabX),y=up.clientY-grabY,intent=state.intent||mediaDropIntent(flow,item,x,y,block);item.position=intent.mode;item.anchor=intent.anchor;item.charOffset=Math.max(0,Number(intent.charOffset)||0);delete item.offsetLines;delete item.offsetPx;clearMediaDragPreview(block);await saveEntityDirect(e);refreshFn(e)};
        surface.onpointercancel=cn=>{surface.onpointermove=null;surface.onpointerup=null;surface.onpointercancel=null;try{if(surface.hasPointerCapture(cn.pointerId))surface.releasePointerCapture(cn.pointerId)}catch{}clearMediaDragPreview(block)};
      };
    });
  }

  function wireRichParagraphEditors(e){
    if(!editMode)return;
    $$('[data-rich-paragraph]').forEach(el=>{
      const remember=()=>{const flow=el.closest('[data-rich-flow]');if(flow)lastRichFocus={entityId:e.id,path:flow.dataset.richPath,index:Number(el.dataset.richParagraph)||0}};
      el.onfocus=remember;el.onclick=remember;el.onkeyup=remember;
      el.onblur=async()=>{const flow=el.closest('[data-rich-flow]');if(!flow)return;const path=flow.dataset.richPath,parts=[...flow.querySelectorAll('[data-rich-paragraph]')].map(p=>unifiedExtractParagraph(p,e,true));setPath(e,path,parts.join('\n\n'));await saveEntityDirect(e)};
    });
  }

  function applyMediaRules(){
    $$('[data-media-block]').forEach(block=>{
      const e=entities.find(x=>x.id===currentView.id);if(!e)return;const item=getPath(e,`${block.dataset.mediaPath}.${Number(block.dataset.mediaIndex)}`);if(!item)return;
      if(item.position==='row')item.position='center';const pos=['left','right','center'].includes(item.position)?item.position:'center',limits=unifiedMediaLimits(item,pos)||unifiedMediaLimits(item,'center')||[18,92],min=Math.max(12,Math.floor(limits[0])),max=Math.max(min,Math.min(96,Math.ceil(limits[1]))),visual=Math.max(min,Math.min(max,Number(item.size)||34));
      block.style.setProperty('--media-size',`${visual}%`);block.classList.remove('effective-left','effective-right','effective-center','media-left','media-right','media-center');block.classList.add(`effective-${pos}`,`media-${pos}`);const range=block.querySelector('.media-size');if(range){range.min=min;range.max=max;range.step=2;range.value=visual}
    });
  }

  async function repairRenderedSideMedia(){return}

  function refreshCharacterTab(e){
    const active=$('.character-tab.active')?.dataset.characterTab || 'profile';
    $('#characterTabPanel').innerHTML=renderCharacterTab(e,active);
    wireCharacterTab(e);
  }

  function wireCharacterTab(e){
    wireEntityLinks();
    wireDirectEditors(e);
    wireRichParagraphEditors(e);

    $$('[data-add-media]').forEach(btn=>btn.onclick=()=>addMediaAtPath(e,btn.dataset.addMedia,btn.dataset.mediaTextPath||""));
    $$('[data-media-remove]').forEach(btn=>btn.onclick=async()=>{
      const block=btn.closest('[data-media-block]');const arr=getPath(e,block.dataset.mediaPath)||[];
      arr.splice(Number(block.dataset.mediaIndex),1);await saveEntityDirect(e);refreshCharacterTab(e);
    });
    $$('.media-size').forEach(range=>{
      range.oninput=()=>{const block=range.closest('[data-media-block]');block.style.setProperty('--media-size',`${Number(range.value)||0}%`)};
      range.onchange=async()=>{const block=range.closest('[data-media-block]'),item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;item.size=Number(range.value)||Number(item.size)||34;await saveEntityDirect(e);refreshCharacterTab(e)};
    });
    $$('[data-media-shift]').forEach(btn=>btn.onclick=async()=>{const block=btn.closest('[data-media-block]'),item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;if(!unifiedShiftOneLine(block,item,Number(btn.dataset.mediaShift)||0))return;await saveEntityDirect(e);refreshCharacterTab(e)});
    wireMediaDragging(e,refreshCharacterTab);

    $('[data-add-history]')?.addEventListener('click',async()=>{normalizeInfo(e).history.push({title:'Nuevo apartado',body:'',media:[]});await saveEntityDirect(e);refreshCharacterTab(e)});
    $$('[data-remove-history]').forEach(btn=>btn.onclick=async()=>{normalizeInfo(e).history.splice(Number(btn.dataset.removeHistory),1);await saveEntityDirect(e);refreshCharacterTab(e)});

    $$('[data-add-bond]').forEach(btn=>btn.onclick=async()=>{
      const name=prompt('Nombre, alias o etiqueta maestra del personaje/entidad:');if(!name)return;
      const target=resolveEntityInput(name,e.id);if(!target){alert('No encontré esa entidad.');return}
      normalizeInfo(e).relationships[btn.dataset.addBond].push({targetId:target.id,type:'',note:''});await saveEntityDirect(e);refreshCharacterTab(e);
    });
    $$('[data-remove-bond]').forEach(btn=>btn.onclick=async()=>{normalizeInfo(e).relationships[btn.dataset.removeBond].splice(Number(btn.dataset.bondIndex),1);await saveEntityDirect(e);refreshCharacterTab(e)});

    $('[data-add-gallery]')?.addEventListener('click',async()=>{const items=await chooseMediaMany();if(!items.length)return;normalizeInfo(e).gallery.push(...items);await saveEntityDirect(e);refreshCharacterTab(e)});
    $$('[data-remove-gallery]').forEach(btn=>btn.onclick=async()=>{normalizeInfo(e).gallery.splice(Number(btn.dataset.removeGallery),1);await saveEntityDirect(e);refreshCharacterTab(e)});

    $$('[data-select-path]').forEach(sel=>sel.onchange=async()=>{setPath(e,sel.dataset.selectPath,sel.value);await saveEntityDirect(e)});

    applyMediaRules();
    // A6.6.9: no reparación automática posterior; la colocación solo cambia por acción del usuario.
  }

  function showCharacterEntity(e,tab="profile"){
    currentView={type:"entity",id:e.id};setActive("");normalizeInfo(e);
    const validTabs=CHARACTER_TABS.map(x=>x[0]);let active=validTabs.includes(tab)?tab:"profile";
    $("#view").innerHTML=`<div class="character-page">
      <div class="page-head">${backButton()}<h1 class="page-title">Personajes</h1></div>
      <header class="character-titlebar"><div class="character-title-copy"><h1>${renderEditableName(e.title,"title",e,{cls:"main-entity-name"})}</h1>${e.subtitle?`<div class="character-subtitle">${esc(e.subtitle)}</div>`:""}</div>${editModeToggleMarkup()}</header>
      <div class="character-wiki-layout">${renderCharacterInfobox(e)}<main class="character-article">
        <nav class="character-tabs" aria-label="Secciones del personaje">${CHARACTER_TABS.map(([id,label,iconName])=>`<button class="character-tab ${id===active?"active":""}" data-character-tab="${id}"><span>${icon(iconName)}</span>${esc(label)}</button>`).join("")}</nav>
        <section id="characterTabPanel" class="character-tab-panel">${renderCharacterTab(e,active)}</section>
      </main></div>${renderTechnical(e)}</div>`;
    $("#pageBack").onclick=()=>showCategory("personajes");
    wireEditModeToggles();
    $('[data-change-cover="character"]')?.addEventListener('click',()=>choosePortrait(e,()=>showCharacterEntity(e,active)));
    $('[data-remove-cover="character"]')?.addEventListener('click',async()=>{e.image="";await saveEntityDirect(e);showCharacterEntity(e,active)});
    $$('[data-character-tab]').forEach(btn=>btn.onclick=()=>{active=btn.dataset.characterTab;$$('.character-tab').forEach(b=>b.classList.toggle('active',b===btn));$('#characterTabPanel').innerHTML=renderCharacterTab(e,active);wireCharacterTab(e)});
    $("#copyMasterTag").onclick=()=>copyText(e.masterTag||e.id);$("#copyInternalLink").onclick=()=>copyText(`[[${e.masterTag||e.id}|${e.title}]]`);
    wireDirectEditors(e);wireCharacterTab(e);history.replaceState(null,"",`#entity=${encodeURIComponent(e.id)}`);
  }

  // ============================================================
  // LUGARES — A6.6
  // Una sola arquitectura para cualquier escala. La clasificación
  // no cambia la plantilla: solo servirá más adelante para habilitar
  // o limitar funciones cuando corresponda.
  // ============================================================

  const PLACE_TABS = [
    ["description","Descripción","info"],
    ["maps","Mapas","lugares"],
    ["history","Historia","historia-real"],
    ["participation","Participación","arcos"],
    ["gallery","Galería","objetos"],
    ["research","Investigación","fuentes"]
  ];

  let activePlaceMapId="";
  let selectedPlaceMapElementId="";
  let activeMapInfoElementId="";
  let placeMapTool=null;
  const placeMapViews=new Map();

  function placeData(e){
    e.place ||= {};
    const p=e.place;
    p.info ||= {};
    p.description ||= {};
    p.description.media ||= [];
    p.maps ||= [];
    p.history ||= [];
    p.gallery ||= [];
    p.research ||= {};
    p.parentPlaceId ||= "";
    return p;
  }

  function placeInfoRows(e){
    placeData(e);
    return [
      {title:"Información",rows:[
        ["También conocido como","place.info.aliases",true],
        ["Tipo","place.info.type",false],
        ["Ubicación","place.info.location",false],
        ["Época / procedencia","place.info.originPeriod",false],
        ["Estado","place.info.state",false]
      ]},
      {title:"Datos espaciales",rows:[
        ["Dimensiones","place.info.dimensions",false],
        ["Área","place.info.area",false],
        ["Altitud","place.info.altitude",false],
        ["Coordenadas","place.info.coordinates",false]
      ]}
    ];
  }


  function placeParentEntity(e){
    const id=placeData(e).parentPlaceId;
    return id?entities.find(x=>x.id===id&&x.category==="lugares")||null:null;
  }

  function placeChildren(e){
    return entities.filter(x=>x.id!==e.id&&x.category==="lugares"&&placeData(x).parentPlaceId===e.id);
  }

  function renderPlaceHierarchyRows(e){
    const p=placeData(e);
    const parent=placeParentEntity(e);
    const children=placeChildren(e);
    const options=entities
      .filter(x=>x.category==="lugares"&&x.id!==e.id)
      .sort((a,b)=>String(a.title||"").localeCompare(String(b.title||""),"es"))
      .map(x=>`<option value="${x.id}" ${p.parentPlaceId===x.id?"selected":""}>${esc(x.title||"Lugar")}</option>`)
      .join("");

    const parentRow=editMode
      ? `<div class="infobox-row place-hierarchy-row">
          <dt>Lugar contenedor</dt>
          <dd>
            <label class="place-parent-toggle"><input type="checkbox" data-place-parent-enabled ${p.parentPlaceId?"checked":""}> Vincular</label>
            <select class="infobox-entity-select" data-place-parent-select ${p.parentPlaceId?"":"disabled"}>
              <option value="">— Seleccionar lugar —</option>${options}
            </select>
          </dd>
        </div>`
      : `<div class="infobox-row place-hierarchy-row">
          <dt>Lugar contenedor</dt>
          <dd>${parent?`<button class="infobox-link-button" data-open-related="${parent.id}">${esc(parent.title)}</button>`:"—"}</dd>
        </div>`;

    const childrenRow=children.length
      ? `<div class="infobox-row place-hierarchy-row">
          <dt>Contiene</dt>
          <dd class="place-children-links">${children.map(x=>`<button class="infobox-link-button" data-open-related="${x.id}">${esc(x.title)}</button>`).join("")}</dd>
        </div>`
      : "";

    return parentRow+childrenRow;
  }

  function renderPlaceInfobox(e){
    const image=getImage(e);
    return `<aside class="character-infobox place-infobox">
      <div class="character-portrait-shell">
        <div class="character-portrait place-cover">
          ${image?`<img src="${esc(image)}" alt="">`:`<div class="character-portrait-placeholder">${icon("lugares")}</div>`}
          ${portraitControls("place")}
        </div>
        <div class="portrait-ornament"></div>
      </div>
      ${placeInfoRows(e).map((group,gi)=>`<section class="infobox-section">
        <h3>${esc(group.title)}</h3><dl>
          ${group.rows.map(([label,path,lines])=>`<div class="infobox-row"><dt>${esc(label)}</dt><dd>${renderEditable(getPath(e,path),path,e,{lines,cls:"infobox-direct-edit"})}</dd></div>`).join("")}
          ${gi===0?renderPlaceHierarchyRows(e):""}
        </dl>
      </section>`).join("")}
    </aside>`;
  }

  function mapUid(prefix="map"){
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  }

  function defaultMapSettings(){
    return {
      rotation:0,
      mirrorX:false,
      baseScale:1,
      northAngle:0,
      baseOpacity:1,
      coordinates:{
        mode:"relative",
        geographic:false,
        originX:0,
        originY:0,
        xDirection:"right",
        yDirection:"down"
      },
      calibration:{
        method:"pixel",
        unit:"m",
        pixelValue:"",
        totalWidth:"",
        totalHeight:"",
        pointA:null,
        pointB:null,
        pointDistance:"",
        scaleX:"",
        scaleY:"",
        controlPairs:[]
      },
      units:{distance:"m",area:"m²",speed:"km/h",time:"h",altitude:"m"},
      precision:{mode:"Aproximada",tolerance:"",toleranceType:"%"},
      time:{enabled:false,reference:""},
      visual:{
        markerSize:12,
        labelSize:12,
        hideLabelsZoom:0.7,
        cluster:false,
        lineWidth:2,
        zoneOpacity:0.22,
        zoomMin:0.5,
        zoomMax:4
      },
      routeDefaults:{
        method:"direct",
        smoothness:0,
        pointDensity:8,
        tolerance:0,
        respectObstacles:false,
        restrictedLayerIds:[],
        preferredLayerIds:[],
        defaultSpeed:"",
        defaultTransport:""
      }
    };
  }

  function newPlaceMap(title="Nuevo mapa"){
    return {
      id:mapUid("map"),
      title,
      image:null,
      settings:defaultMapSettings(),
      levels:[],
      layers:[],
      elements:[],
      generator:{originPointId:"",destinationPointId:"",waypointIds:[],avoidZoneIds:[],preferredLineIds:[],criterion:"distancia"}
    };
  }

  function normalizePlaceMap(m){
    m.settings ||= defaultMapSettings();
    const d=defaultMapSettings();
    m.settings.coordinates={...d.coordinates,...(m.settings.coordinates||{})};
    m.settings.calibration={...d.calibration,...(m.settings.calibration||{})};
    m.settings.calibration.controlPairs ||= [];
    if(!["none","pixel","total","twoPoints"].includes(m.settings.calibration.method))m.settings.calibration.method="none";
    m.settings.units={...d.units,...(m.settings.units||{})};
    m.settings.precision={...d.precision,...(m.settings.precision||{})};
    m.settings.time={...d.time,...(m.settings.time||{})};
    m.settings.visual={...d.visual,...(m.settings.visual||{})};
    m.settings.routeDefaults={...d.routeDefaults,...(m.settings.routeDefaults||{})};
    m.settings.routeDefaults.restrictedLayerIds ||= [];
    m.settings.routeDefaults.preferredLayerIds ||= [];
    m.levels ||= [];
    m.layers ||= [];
    m.elements ||= [];
    m.generator ||= {originPointId:"",destinationPointId:"",waypointIds:[],avoidZoneIds:[],preferredLineIds:[],criterion:"distancia"};
    m.generator.waypointIds ||= [];
    m.generator.avoidZoneIds ||= [];
    m.generator.preferredLineIds ||= [];

    // A6.7.5: Línea deja de ser un cuarto tipo visible. Los datos antiguos se
    // migran de forma compatible a Ruta > modo Línea, sin perder nodos ni estilo.
    for(const el of m.elements){
      if(el.kind==="line"){
        el.kind="route";
        el.routeMode="line";
        el.category ||= "rutas";
      }else if(el.kind==="route"){
        el.routeMode ||= "route";
      }
      if(el.kind==="point"){
        el.symbol ||= "";
        el.iconImage ||= "";
      }
      if(el.kind==="route"){
        el.nodes ||= [];
        el.routeMode ||= "route";
        el.strokeType ||= "solid";
        if(el.arrows===undefined)el.arrows=false;
        el.smoothing=Number(el.smoothing)||0;
        el.direction ||= el.routeMode==="line"?"none":"forward";
        el.originPointId ||= "";
        el.destinationPointId ||= "";
        el.waypointPointIds ||= [];
        el.segments ||= [];
        el.media ||= [];
      }
      // Información del elemento: bloques simples para el panel izquierdo.
      // Los campos antiguos se conservan y solo se presentan mediante esta capa.
      if(!Array.isArray(el.infoBlocks)){
        el.infoBlocks=[];
        if(String(el.note||"").trim())el.infoBlocks.push({type:"paragraph",text:String(el.note)});
        for(const item of toArray(el.media))el.infoBlocks.push({type:"media",item});
      }
    }
    return m;
  }


  async function chooseMapImage(){
    const file=await new Promise(resolve=>{
      const input=document.createElement("input");
      input.type="file";
      input.accept="image/*,.gif";
      input.onchange=()=>resolve(input.files?.[0]||null);
      input.click();
    });
    if(!file) return null;
    const kind=mediaKind(file);
    if(kind!=="image"){alert("La base del mapa debe ser una imagen o GIF.");return null}
    const src=await readFileDataURL(file);
    const dims=await readMediaDimensions(src,"image");
    return {src,name:file.name,width:dims.width||0,height:dims.height||0};
  }

  function activePlaceMap(e){
    const p=placeData(e);
    if(!p.maps.length) return null;
    let m=p.maps.find(x=>x.id===activePlaceMapId);
    if(!m){m=p.maps[0];activePlaceMapId=m.id}
    return normalizePlaceMap(m);
  }

  function placeMapElement(m,id=selectedPlaceMapElementId){
    return m?.elements?.find(x=>x.id===id)||null;
  }

  function newMapElement(kind,nodes=[]){
    const common={
      id:mapUid(kind),
      name:kind==="point"?"Nuevo punto":kind==="zone"?"Nueva zona":"Nueva ruta",
      kind,
      category:kind==="route"?"rutas":"",
      layerIds:[],
      levelIds:[],
      targetId:"",
      note:"",
      dateFrom:"",
      dateTo:"",
      visible:true,
      label:false,
      order:0,
      style:{color:"",opacity:"",lineWidth:"",dash:""},
      media:[],
      infoBlocks:[]
    };
    if(kind==="point") return {...common,x:nodes[0]?.x??50,y:nodes[0]?.y??50,lat:"",lon:"",altitude:"",symbol:"",iconImage:"",size:"",rotation:0,labelPosition:"top",labelOffsetX:0,labelOffsetY:0,radius:"",direction:""};
    if(kind==="zone") return {...common,nodes,holes:[],parts:[],fillOpacity:"",borderWidth:"",labelPoint:null,elevation:"",height:"",containerId:""};
    return {...common,routeMode:"route",nodes,nodeLevels:nodes.map(()=>""),strokeType:"solid",arrows:false,smoothing:0,originPointId:"",destinationPointId:"",waypointPointIds:[],circular:false,direction:"forward",transport:"",segments:[],speedMode:"fixed",fixedSpeed:"",speedMin:"",speedMax:"",speedApprox:false,durationManual:"",departure:"",arrival:"",uncertainty:"",manualDistance:"",proposal:false,generation:{originPointId:"",destinationPointId:"",waypointIds:[],avoidZoneIds:[],preferredLineIds:[],criterion:"distancia"}};
  }


  const DIST_TO_M={mm:.001,cm:.01,m:1,km:1000,mi:1609.344,ft:.3048,nmi:1852};
  const SPEED_TO_MS={"m/s":1,"km/h":1000/3600,mph:1609.344/3600,kn:1852/3600,nudos:1852/3600};
  const TIME_TO_S={s:1,min:60,h:3600,d:86400,días:86400};

  function distToM(value,unit){return (Number(value)||0)*(DIST_TO_M[unit]||1)}
  function mToDist(value,unit){return value/(DIST_TO_M[unit]||1)}
  function speedToMs(value,unit){return (Number(value)||0)*(SPEED_TO_MS[unit]||1)}
  function secondsToTime(value,unit){return value/(TIME_TO_S[unit]||3600)}
  function timeToSeconds(value,unit){return (Number(value)||0)*(TIME_TO_S[unit]||3600)}

  function mapScaleXY(m){
    const s=m.settings.calibration||{};
    const imgW=Math.max(1,Number(m.image?.width)||1000);
    const imgH=Math.max(1,Number(m.image?.height)||1000);
    const unit=s.unit||m.settings.units.distance||"m";
    let sx=0,sy=0;
    if(s.method==="pixel"){
      sx=sy=distToM(s.pixelValue,unit);
    }else if(s.method==="total"){
      if(Number(s.totalWidth)>0) sx=distToM(s.totalWidth,unit)/imgW;
      if(Number(s.totalHeight)>0) sy=distToM(s.totalHeight,unit)/imgH;
      if(!sx&&sy) sx=sy;if(!sy&&sx) sy=sx;
    }else if(s.method==="twoPoints"){
      const a=s.pointA,b=s.pointB;
      if(a&&b&&Number(s.pointDistance)>0){
        const dx=(b.x-a.x)/100*imgW,dy=(b.y-a.y)/100*imgH;
        const px=Math.hypot(dx,dy);
        if(px>0) sx=sy=distToM(s.pointDistance,unit)/px;
      }
    }else if(s.method==="axis"){
      sx=distToM(s.scaleX,unit);sy=distToM(s.scaleY,unit);
      if(!sx&&sy)sx=sy;if(!sy&&sx)sy=sx;
    }else if(s.method==="multi"){
      const values=[];
      for(const pair of toArray(s.controlPairs)){
        if(!Number(pair.distance)) continue;
        const dx=(Number(pair.x2)-Number(pair.x1))/100*imgW;
        const dy=(Number(pair.y2)-Number(pair.y1))/100*imgH;
        const px=Math.hypot(dx,dy);
        if(px>0) values.push(distToM(pair.distance,unit)/px);
      }
      if(values.length) sx=sy=values.reduce((a,b)=>a+b,0)/values.length;
    }
    return {sx:sx||0,sy:sy||sx||0};
  }

  function segmentMeters(m,a,b){
    const {sx,sy}=mapScaleXY(m);if(!sx||!sy)return 0;
    const w=Math.max(1,Number(m.image?.width)||1000),h=Math.max(1,Number(m.image?.height)||1000);
    const dx=(Number(b.x)-Number(a.x))/100*w*sx;
    const dy=(Number(b.y)-Number(a.y))/100*h*sy;
    return Math.hypot(dx,dy);
  }

  function polylineMeters(m,nodes){
    let total=0;for(let i=1;i<toArray(nodes).length;i++) total+=segmentMeters(m,nodes[i-1],nodes[i]);return total;
  }

  function polygonAreaMeters2(m,nodes){
    const pts=toArray(nodes);if(pts.length<3)return 0;
    const {sx,sy}=mapScaleXY(m);if(!sx||!sy)return 0;
    const w=Math.max(1,Number(m.image?.width)||1000),h=Math.max(1,Number(m.image?.height)||1000);
    let sum=0;
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length];
      const ax=Number(a.x)/100*w*sx,ay=Number(a.y)/100*h*sy;
      const bx=Number(b.x)/100*w*sx,by=Number(b.y)/100*h*sy;
      sum+=ax*by-bx*ay;
    }
    return Math.abs(sum)/2;
  }

  function zoneAreaMeters2(m,z){
    let area=polygonAreaMeters2(m,z.nodes);
    for(const h of toArray(z.holes)) area-=polygonAreaMeters2(m,h);
    for(const part of toArray(z.parts)) area+=polygonAreaMeters2(m,part);
    return Math.max(0,area);
  }

  function zonePerimeterMeters(m,z){
    const ring=n=>n?.length>1?polylineMeters(m,[...n,n[0]]):0;
    return ring(z.nodes)+toArray(z.holes).reduce((a,h)=>a+ring(h),0)+toArray(z.parts).reduce((a,p)=>a+ring(p),0);
  }

  function pointInPolygon(point,poly){
    const p=toArray(poly);if(p.length<3)return false;
    let inside=false;
    for(let i=0,j=p.length-1;i<p.length;j=i++){
      const xi=Number(p[i].x),yi=Number(p[i].y),xj=Number(p[j].x),yj=Number(p[j].y);
      const intersect=((yi>point.y)!==(yj>point.y)) && (point.x<(xj-xi)*(point.y-yi)/((yj-yi)||1e-9)+xi);
      if(intersect) inside=!inside;
    }
    return inside;
  }

  function pointInZone(point,z){
    const inMain=pointInPolygon(point,z.nodes)||toArray(z.parts).some(p=>pointInPolygon(point,p));
    if(!inMain)return false;
    return !toArray(z.holes).some(h=>pointInPolygon(point,h));
  }

  function segmentsIntersect(a,b,c,d){
    const cross=(p,q,r)=>(Number(q.x)-Number(p.x))*(Number(r.y)-Number(p.y))-(Number(q.y)-Number(p.y))*(Number(r.x)-Number(p.x));
    const eps=1e-9;
    const onSegment=(p,q,r)=>Math.min(Number(p.x),Number(r.x))-eps<=Number(q.x)&&Number(q.x)<=Math.max(Number(p.x),Number(r.x))+eps&&Math.min(Number(p.y),Number(r.y))-eps<=Number(q.y)&&Number(q.y)<=Math.max(Number(p.y),Number(r.y))+eps;
    const v1=cross(a,b,c),v2=cross(a,b,d),v3=cross(c,d,a),v4=cross(c,d,b);
    if(((v1>eps&&v2<-eps)||(v1<-eps&&v2>eps))&&((v3>eps&&v4<-eps)||(v3<-eps&&v4>eps)))return true;
    if(Math.abs(v1)<=eps&&onSegment(a,c,b))return true;
    if(Math.abs(v2)<=eps&&onSegment(a,d,b))return true;
    if(Math.abs(v3)<=eps&&onSegment(c,a,d))return true;
    if(Math.abs(v4)<=eps&&onSegment(c,b,d))return true;
    return false;
  }

  function polylineCrossesZone(nodes,z){
    const rings=[z.nodes,...toArray(z.parts),...toArray(z.holes)];
    if(toArray(nodes).some(p=>pointInZone(p,z))) return true;
    for(let i=1;i<toArray(nodes).length;i++){
      for(const ring of rings){
        for(let j=0;j<toArray(ring).length;j++){
          const a=ring[j],b=ring[(j+1)%ring.length];
          if(segmentsIntersect(nodes[i-1],nodes[i],a,b)) return true;
        }
      }
    }
    return false;
  }

  function approxMetersInsideZone(m,nodes,z){
    let inside=0,total=0;
    for(let i=1;i<toArray(nodes).length;i++){
      const a=nodes[i-1],b=nodes[i],seg=segmentMeters(m,a,b);if(!seg)continue;
      total+=seg;
      const samples=24;let hit=0;
      for(let s=0;s<samples;s++){
        const t=(s+.5)/samples;
        const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
        if(pointInZone(p,z))hit++;
      }
      inside+=seg*(hit/samples);
    }
    return {inside,total,ratio:total?inside/total:0};
  }

  function fmtNumber(n,d=2){return Number.isFinite(n)?Number(n).toLocaleString("es-MX",{maximumFractionDigits:d}):"—"}
  function formatDistance(meters,m){
    if(!meters)return "—";const unit=m.settings.units.distance||"m";return `${fmtNumber(mToDist(meters,unit))} ${unit}`;
  }
  function formatArea(m2,m){
    if(!m2)return "—";const unit=m.settings.units.area||"m²";
    const divisor=unit==="km²"?1e6:unit==="ha"?10000:unit==="ft²"?0.092903:1;
    return `${fmtNumber(m2/divisor)} ${unit}`;
  }

  function routeCalculatedSeconds(m,r){
    const timeUnit=m.settings.units.time||"h",speedUnit=m.settings.units.speed||"km/h";
    const nodes=toArray(r.nodes);if(nodes.length<2)return 0;
    if(r.speedMode==="knownTime"&&Number(r.durationManual)>0)return timeToSeconds(r.durationManual,timeUnit);
    if(r.speedMode==="interval"&&Number(r.speedMin)>0&&Number(r.speedMax)>0&&!toArray(r.segments).length){
      const avgSpeed=(Number(r.speedMin)+Number(r.speedMax))/2,ms=speedToMs(avgSpeed,speedUnit);
      return ms>0?polylineMeters(m,nodes)/ms:0;
    }
    if(toArray(r.segments).length){
      let total=0;
      for(const seg of r.segments){
        if(Number(seg.durationManual)>0){total+=timeToSeconds(seg.durationManual,timeUnit);continue}
        const from=Math.max(0,Math.min(nodes.length-2,Number(seg.fromIndex)||0));
        const to=Math.max(from+1,Math.min(nodes.length-1,Number(seg.toIndex)||nodes.length-1));
        const dist=polylineMeters(m,nodes.slice(from,to+1));
        const speed=Number(seg.speed)||Number(r.fixedSpeed)||0;
        const ms=speedToMs(speed,speedUnit);
        if(ms>0)total+=dist/ms;
        total+=timeToSeconds(seg.pauses,timeUnit);
      }
      return total;
    }
    const speed=Number(r.fixedSpeed)||0,ms=speedToMs(speed,speedUnit);
    return ms>0?polylineMeters(m,nodes)/ms:0;
  }

  function routeStats(m,r){
    const calcNodes=routeNodesForCalc(r);
    const meters=polylineMeters(m,calcNodes);
    const seconds=routeCalculatedSeconds(m,{...r,nodes:calcNodes});
    const avg=seconds?meters/seconds:0;
    const speedUnit=m.settings.units.speed||"km/h";
    const avgUnit=avg/(SPEED_TO_MS[speedUnit]||1);
    let secondsMin=0,secondsMax=0;
    if(r.speedMode==="interval"&&Number(r.speedMin)>0&&Number(r.speedMax)>0){
      const slow=speedToMs(Math.min(Number(r.speedMin),Number(r.speedMax)),speedUnit),fast=speedToMs(Math.max(Number(r.speedMin),Number(r.speedMax)),speedUnit);
      if(fast>0)secondsMin=meters/fast;if(slow>0)secondsMax=meters/slow;
    }
    let calculatedArrival="";
    const dep=Date.parse(r.departure||"");
    if(Number.isFinite(dep)&&seconds>0)calculatedArrival=new Date(dep+seconds*1000).toISOString();
    const zones=m.elements.filter(x=>x.kind==="zone"&&polylineCrossesZone(calcNodes,x)).map(z=>{
      const part=approxMetersInsideZone(m,calcNodes,z);
      return {name:z.name||"Zona",meters:part.inside,ratio:part.ratio};
    });
    return {meters,seconds,secondsMin,secondsMax,avgUnit,zones,calculatedArrival};
  }

  function mapElementVisible(m,el){
    if(el.visible===false)return false;
    if(el.layerIds?.length){
      const visibleLayers=new Set(m.layers.filter(l=>l.visible!==false).map(l=>l.id));
      if(!el.layerIds.some(id=>visibleLayers.has(id)))return false;
    }
    return true;
  }

  function layerStyleFor(m,el){
    const layer=toArray(el.layerIds).map(id=>m.layers.find(x=>x.id===id)).find(Boolean);
    return layer?{color:layer.style?.color||""}:{};
  }

  function mapElementStyle(m,el){
    const layer=layerStyleFor(m,el),own=el.style||{};
    const opacity=own.opacity!==""&&own.opacity!=null&&Number.isFinite(Number(own.opacity))?Math.max(0,Math.min(1,Number(own.opacity))):1;
    return {color:own.color||layer.color||"#d4b27a",opacity,width:Number(own.lineWidth)||2,dash:own.dash||"",symbol:""};
  }

  function svgPoints(nodes){return toArray(nodes).map(p=>`${Number(p.x)||0},${Number(p.y)||0}`).join(" ")}

  function renderMapLabels(m,el,selected){
    if(el.label===false)return "";
    if(currentMapView(m).zoom<.45)return "";
    const name=el.name||"";if(!name)return "";
    let x=50,y=50;
    if(el.kind==="point"){x=Number(el.x)||0;y=(Number(el.y)||0)-2.1}
    else if(el.kind==="zone"&&el.nodes?.length){x=el.nodes.reduce((a,p)=>a+Number(p.x),0)/el.nodes.length;y=el.nodes.reduce((a,p)=>a+Number(p.y),0)/el.nodes.length}
    else if(el.nodes?.length){x=el.nodes.reduce((a,p)=>a+Number(p.x),0)/el.nodes.length;y=el.nodes.reduce((a,p)=>a+Number(p.y),0)/el.nodes.length}
    return `<text class="map-element-label ${selected?"selected":""}" style="font-size:1.8px" x="${x}" y="${y}" data-map-element="${esc(el.id)}">${esc(name)}</text>`;
  }

  function realRadiusPercent(m,value){
    const meters=distToM(value,m.settings.units.distance||"m");
    const {sx}=mapScaleXY(m),w=Math.max(1,Number(m.image?.width)||1000);
    return sx>0?meters/(w*sx)*100:0;
  }

  function routeNodesForCalc(r){
    return toArray(r.nodes).map(p=>({...p}));
  }

  function renderMapElementSvg(m,el){
    if(!mapElementVisible(m,el))return "";
    const s=mapElementStyle(m,el);
    const selectedId=editMode?selectedPlaceMapElementId:activeMapInfoElementId;
    const selected=el.id===selectedId;
    let dash=s.dash||"";
    if(el.kind==="route"&&(el.routeMode||"route")==="line"&&!dash){if(el.strokeType==="dashed")dash="2 1.3";else if(el.strokeType==="dotted")dash=".35 1"}
    const dashAttr=dash?`stroke-dasharray="${esc(dash)}"`:"";
    const common=`data-map-element="${esc(el.id)}" opacity="${s.opacity}"`;
    let shape="";
    if(el.kind==="point"){
      const size=Number(el.size)||12;
      const r=Math.max(.45,Math.min(3.2,size*.075));
      const x=Number(el.x)||0,y=Number(el.y)||0;
      const icon=el.iconImage
        ? `<image class="map-point-image" href="${esc(el.iconImage)}" x="${x-r*.68}" y="${y-r*.68}" width="${r*1.36}" height="${r*1.36}" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>`
        : `<text class="map-point-symbol" style="font-size:${Math.max(.9,Math.min(2.8,r*1.2))}px" x="${x}" y="${y+.15}">${esc(el.symbol||s.symbol||"•")}</text>`;
      shape=`<g ${common} class="map-shape point-shape ${selected?"selected":""}"><circle cx="${x}" cy="${y}" r="${r}" fill="${esc(s.color)}" stroke="rgba(0,0,0,.55)" stroke-width=".3"/>${icon}</g>`;
    }else if(el.kind==="zone"){
      const rings=[toArray(el.nodes),...toArray(el.parts),...toArray(el.holes)].filter(r=>r.length>2);
      const pathD=rings.map(r=>`M ${r.map(p=>`${Number(p.x)||0} ${Number(p.y)||0}`).join(" L ")} Z`).join(" ");
      if(pathD)shape=`<path ${common} class="map-shape zone-shape ${selected?"selected":""}" d="${pathD}" fill="${esc(s.color)}" fill-rule="evenodd" clip-rule="evenodd" fill-opacity="${el.fillOpacity!==""&&el.fillOpacity!=null?Number(el.fillOpacity):0.14}" stroke="${esc(s.color)}" stroke-width="${Math.max(.16,(Number(el.borderWidth)||s.width)*.16)}" ${dashAttr}/>`;
    }else if(el.kind==="route"){
      const lineMode=(el.routeMode||"route")==="line";
      let nodes=lineMode?toArray(el.nodes):routeNodesForCalc(el);
      if(lineMode&&Number(el.smoothing)>0)nodes=smoothPolyline(nodes,Number(el.smoothing));
      if(nodes.length>1){
        let markers="";
        if(lineMode){
          const arrows=el.arrows||el.direction!=="none";
          if(arrows){if(el.direction==="backward"||el.direction==="both")markers+=' marker-start="url(#mapArrow)"';if(el.direction==="forward"||el.direction==="both")markers+=' marker-end="url(#mapArrow)"'}
        }else{
          markers=el.direction==="backward"?' marker-start="url(#mapArrow)"':el.direction==="both"?' marker-start="url(#mapArrow)" marker-end="url(#mapArrow)"':' marker-end="url(#mapArrow)"';
        }
        const visualWidth=Math.max(.18,s.width*.19);
        const hitWidth=Math.max(2.4,visualWidth*5.5);
        const pts=svgPoints(nodes);
        shape=`<polyline data-map-element="${esc(el.id)}" class="map-route-hit" points="${pts}" fill="none" stroke="transparent" stroke-width="${hitWidth}" pointer-events="stroke"/><polyline ${common} class="map-shape ${lineMode?"line-shape":"route-shape"} ${selected?"selected":""} ${!lineMode&&el.proposal?"proposal":""}" points="${pts}" fill="none" stroke="${esc(s.color)}" stroke-opacity=".88" stroke-width="${visualWidth}" ${!lineMode&&el.proposal?'stroke-dasharray="1.2 1"':dashAttr}${markers}/>`;
      }
    }
    const handles=editMode&&selected?renderMapHandles(m,el,s.color):"";
    return `${shape}${renderMapLabels(m,el,selected)}${handles}`;
  }




  function renderMapHandles(m,el,color="#d4b27a"){
    if(el.kind==="point")return "";
    const c=esc(color||"#d4b27a");
    const node=(p,i,part,pi="")=>`<g class="map-node-control" data-node-control>
      <circle class="map-node-handle" cx="${Number(p.x)||0}" cy="${Number(p.y)||0}" r=".72" fill="transparent" stroke="transparent" stroke-width=".55" pointer-events="all"
        data-node-index="${i}" data-node-part="${part}" ${pi!==""?`data-part-index="${pi}"`:""}/>
      <circle class="map-node-dot" cx="${Number(p.x)||0}" cy="${Number(p.y)||0}" r=".30" fill="${c}" stroke="rgba(18,16,18,.72)" stroke-width=".12" pointer-events="none"/>
    </g>`;
    const handles=toArray(el.nodes).map((p,i)=>node(p,i,"nodes")).join("");
    if(el.kind!=="zone")return handles;
    return handles
      +toArray(el.parts).map((part,pi)=>toArray(part).map((p,i)=>node(p,i,"parts",pi)).join("")).join("")
      +toArray(el.holes).map((part,pi)=>toArray(part).map((p,i)=>node(p,i,"holes",pi)).join("")).join("");
  }

  function currentMapView(m){
    if(!placeMapViews.has(m.id)) placeMapViews.set(m.id,{
      zoom:1,panX:0,panY:0,displayMode:"normal",justPanned:false,
      panelCollapsed:false,panelTab:"elements",newRouteAsLine:false,
      routeGeneratorOpen:false
    });
    const v=placeMapViews.get(m.id);
    if(!v.displayMode)v.displayMode="normal";
    if(v.panelCollapsed===undefined)v.panelCollapsed=false;
    if(!["elements","selected","layers","global"].includes(v.panelTab))v.panelTab="elements";
    if(v.newRouteAsLine===undefined)v.newRouteAsLine=false;
    if(v.routeGeneratorOpen===undefined)v.routeGeneratorOpen=false;
    return v;
  }

  function renderMapElementsSvg(m){
    const layerOrder=el=>{
      const vals=toArray(el.layerIds).map(id=>m.layers.find(l=>l.id===id)).filter(Boolean).map(l=>Number(l.order)||0);
      return vals.length?Math.max(...vals):0;
    };
    return m.elements.slice().sort((a,b)=>layerOrder(a)-layerOrder(b)).map(el=>renderMapElementSvg(m,el)).join("");
  }



  function elementInfoDoc(el){
    el.infoDoc ||= {intro:{body:"",media:[]},sections:[]};
    el.infoDoc.intro ||= {body:"",media:[]};
    el.infoDoc.intro.media ||= [];
    el.infoDoc.sections ||= [];

    // Migración conservadora del editor anterior, sin perder texto/imágenes.
    if(!el.infoDocMigrated){
      const old=Array.isArray(el.infoBlocks)?el.infoBlocks:[];
      if(old.length){
        let target=el.infoDoc.intro;
        for(const block of old){
          if(block?.type==="title"||block?.type==="subtitle"){
            const section={level:block.type,title:block.text||"",body:"",media:[]};
            el.infoDoc.sections.push(section);
            target=section;
          }else if(block?.type==="media"&&block.item?.src){
            block.item.position=["left","right","center"].includes(block.item.position)?block.item.position:"center";
            block.item.size=Number(block.item.size)||34;
            target.media.push(block.item);
          }else if(block?.text){
            target.body+=(target.body?"\n\n":"")+block.text;
          }
        }
      }
      if(Array.isArray(el.media)&&el.media.length && !el.infoDoc.intro.media.length){
        el.infoDoc.intro.media.push(...el.media);
      }
      el.infoDocMigrated=true;
    }
    return el.infoDoc;
  }

  function elementInfoBasePath(e,m,el){
    const mi=placeData(e).maps.indexOf(m);
    const ei=m.elements.indexOf(el);
    return `place.maps.${mi}.elements.${ei}.infoDoc`;
  }


  function renderElementInfoRead(el,e){
    const m=activePlaceMap(e);
    if(!m)return "";
    const doc=elementInfoDoc(el);
    const base=elementInfoBasePath(e,m,el);

    return `<div class="character-content-stack map-element-description-copy readonly-copy">
      <section class="character-intro-card media-aware-block">
        ${renderRichFlow(doc.intro.body||"",`${base}.intro.body`,doc.intro.media,`${base}.intro.media`,e)}
      </section>
      ${doc.sections.map((s,i)=>{
        s.media ||= [];
        return `<section class="character-section media-aware-block">
          ${s.title?`<div class="section-title-row"><h2>${esc(s.title)}</h2></div>`:""}
          ${renderRichFlow(s.body||"",`${base}.sections.${i}.body`,s.media,`${base}.sections.${i}.media`,e)}
        </section>`;
      }).join("")}
    </div>`;
  }

  function renderElementInfoEditor(e,m,el){
    const doc=elementInfoDoc(el);
    const base=elementInfoBasePath(e,m,el);

    return `<div class="character-content-stack map-element-description-copy">
      <section class="character-intro-card media-aware-block">
        ${renderRichFlow(doc.intro.body||"",`${base}.intro.body`,doc.intro.media,`${base}.intro.media`,e)}
        ${editMode?`<button class="inline-add-media edit-only" data-add-media="${base}.intro.media" data-media-text-path="${base}.intro.body">＋ Multimedia</button>`:""}
      </section>

      ${doc.sections.map((s,i)=>{
        s.media ||= [];
        return richSection(e,{
          title:s.title||"",
          titlePath:`${base}.sections.${i}.title`,
          path:`${base}.sections.${i}.body`,
          mediaPath:`${base}.sections.${i}.media`,
          removeAction:`data-remove-element-info-section="${i}" data-info-owner="${el.id}"`
        });
      }).join("")}

      ${editMode?`<div class="element-info-section-actions">
        <button class="section-add edit-only" data-add-element-info-section="title" data-info-owner="${el.id}">＋ Título</button>
        <button class="section-add edit-only" data-add-element-info-section="subtitle" data-info-owner="${el.id}">＋ Subtítulo</button>
      </div>`:""}
    </div>`;
  }

  function mapElementHasInfo(m,el){
    if(!el)return false;
    const doc=elementInfoDoc(el);
    const hasIntro=!!String(doc.intro?.body||"").trim()||toArray(doc.intro?.media).some(x=>x?.src);
    const hasSections=toArray(doc.sections).some(s=>!!String(s?.title||"").trim()||!!String(s?.body||"").trim()||toArray(s?.media).some(x=>x?.src));
    const meaningfulName=!!String(el.name||"").trim()&&!/^Nuev[oa] (punto|zona|ruta|línea)$/i.test(String(el.name||""));
    const hasArticle=!!mapLinkedEntity(el);
    if(el.kind==="route"&&(el.routeMode||"route")==="route"){
      const travel=!!(el.transport||el.fixedSpeed||el.durationManual||el.originPointId||el.destinationPointId);
      return hasIntro||hasSections||meaningfulName||travel||hasArticle;
    }
    return hasIntro||hasSections||meaningfulName||hasArticle;
  }

  function renderMapInfoPanel(e,m){
    if(editMode)return "";
    const el=placeMapElement(m,activeMapInfoElementId);
    if(!el||!mapElementHasInfo(m,el))return "";
    const type=el.kind==="point"?"Punto":el.kind==="zone"?"Zona":((el.routeMode||"route")==="line"?"Línea":"Ruta");
    let derived="";
    if(el.kind==="zone")derived=`<div class="map-info-facts"><span>Área <strong>${formatArea(zoneAreaMeters2(m,el),m)}</strong></span><span>Perímetro <strong>${formatDistance(zonePerimeterMeters(m,el),m)}</strong></span></div>`;
    else if(el.kind==="route"&&(el.routeMode||"route")==="line")derived=`<div class="map-info-facts"><span>Longitud <strong>${formatDistance(polylineMeters(m,el.nodes),m)}</strong></span></div>`;
    else if(el.kind==="route"){
      const stats=routeStats(m,el),timeUnit=m.settings.units.time||"h";
      derived=`<div class="map-info-facts"><span>Distancia <strong>${formatDistance(stats.meters,m)}</strong></span>${stats.seconds?`<span>Duración <strong>${fmtNumber(secondsToTime(stats.seconds,timeUnit))} ${timeUnit}</strong></span>`:""}${el.transport?`<span>Transporte <strong>${esc(el.transport)}</strong></span>`:""}</div>`;
    }
    return `<aside class="map-side-panel map-info-panel" data-map-info-panel>
      <div class="map-side-panel-head"><div><small>${esc(type)}</small><strong>${esc(el.name||type)}</strong></div><button class="map-panel-close" data-close-map-info>×</button></div>
      <div class="map-side-panel-scroll">
        ${renderElementInfoRead(el,e)}
        ${derived}
        ${mapLinkedEntity(el)?`<button class="map-open-article" data-open-map-article="${mapLinkedEntity(el).id}">Abrir artículo →</button>`:""}
      </div>
    </aside>`;
  }

  function renderMapEditSidebar(e,m){
    if(!editMode)return "";
    const view=currentMapView(m);
    const tab=view.panelTab||"elements";
    const body=tab==="elements" ? renderMapElementList(m)
      : tab==="selected" ? renderSelectedElementInspector(e,m)
      : tab==="layers" ? renderMapLayers(m)
      : renderMapGlobalSettings(m);

    return `<aside class="map-side-panel map-edit-panel ${view.panelCollapsed?"collapsed":""}" data-map-side-panel>
      <div class="map-panel-tabs" role="tablist" aria-label="Herramientas del mapa">
        <button class="map-panel-tab ${tab==="elements"?"active":""}" data-map-panel-tab="elements" title="Elementos" aria-label="Elementos">◇</button>
        <button class="map-panel-tab ${tab==="selected"?"active":""}" data-map-panel-tab="selected" title="Elemento seleccionado" aria-label="Elemento seleccionado">◎</button>
        <button class="map-panel-tab ${tab==="layers"?"active":""}" data-map-panel-tab="layers" title="Capas" aria-label="Capas">▱</button>
        <button class="map-panel-tab ${tab==="global"?"active":""}" data-map-panel-tab="global" title="Configuración global" aria-label="Configuración global">⚙</button>
      </div>
      <div class="map-side-panel-scroll">${body}</div>
    </aside>`;
  }


  function renderPlaceMapTabs(e,m){
    const p=placeData(e);
    return `<div class="place-map-subtabs map-tabs-overlay">
      ${p.maps.map(x=>{
        const active=x.id===m.id;
        return `<div class="place-map-tab-wrap ${active?"active":""}">
          ${active&&editMode
            ? `<span class="place-map-subtab active map-title-direct" contenteditable="true" spellcheck="false" data-map-title-edit>${esc(x.title||"Mapa")}</span>`
            : `<button class="place-map-subtab ${active?"active":""}" data-place-map-tab="${x.id}">${esc(x.title||"Mapa")}</button>`}
          ${active&&editMode?`<button class="place-map-tab-remove edit-only" data-remove-place-map="${x.id}" title="Quitar mapa">×</button>`:""}
        </div>`;
      }).join("")}
      ${editMode?`<button class="place-map-subtab add edit-only" data-add-place-map title="Nuevo mapa">＋</button>`:""}
    </div>`;
  }

  function renderMapStage(e,m){
    const img=m.image;
    const view=currentMapView(m);
    const tabClass=view.displayMode==="tab"?" map-tab-mode":"";
    const side=editMode?renderMapEditSidebar(e,m):renderMapInfoPanel(e,m);
    const collapsedClass=editMode&&view.panelCollapsed?" panel-collapsed":"";
    const panelToggle=editMode?`<button class="map-panel-toggle-overlay" data-map-panel-collapse title="${view.panelCollapsed?"Abrir panel":"Reducir panel"}" aria-label="${view.panelCollapsed?"Abrir panel":"Reducir panel"}">${view.panelCollapsed?"›":"‹"}</button>`:"";
    if(!img?.src){
      return `<div class="place-map-viewport${tabClass}" data-map-viewport><div class="place-map-workspace ${side?"has-side-panel":""}${collapsedClass}">${side}${panelToggle}<div class="place-map-main">${renderPlaceMapTabs(e,m)}<div class="place-map-empty"><div>${icon("lugares")}</div><p>Sin imagen base.</p>${editMode?`<button class="map-action" data-map-load-image>＋ Cargar imagen base</button>`:""}</div>${renderMapBottomControls(m)}</div></div></div>`;
    }
    const ratio=(Number(img.width)>0&&Number(img.height)>0)?`${img.width}/${img.height}`:"16/9";
    const els=renderMapElementsSvg(m);
    return `<div class="place-map-viewport${tabClass}" data-map-viewport>
      <div class="place-map-workspace ${side?"has-side-panel":""}${collapsedClass}">
        ${side}
        ${panelToggle}
        <div class="place-map-main">
          ${renderPlaceMapTabs(e,m)}
          <div class="place-map-canvas" data-map-canvas style="aspect-ratio:${ratio};transform:translate(${view.panX}px,${view.panY}px) scale(${view.zoom})">
            <svg class="place-map-svg" data-map-stage viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs><marker id="mapArrow" markerWidth="4" markerHeight="4" refX="3.2" refY="2" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L4,2 L0,4 z" fill="context-stroke"/></marker></defs>
              <g class="map-content-transform">
                <image href="${esc(img.src)}" x="0" y="0" width="100" height="100" preserveAspectRatio="none" opacity="1"/>
                <g class="map-elements-layer">${els}</g>
                ${placeMapTool?.mapId===m.id&&toArray(placeMapTool.nodes).length?renderToolPreview(m):""}
              </g>
              <g class="map-north" transform="translate(93 8) rotate(${Number(m.settings.northAngle)||0})"><path d="M0 4 L0 -4"/><path d="M0 -4 L-1.2 -1.5 L1.2 -1.5 Z"/><text x="0" y="-5">N</text></g>
            </svg>
          </div>
          ${renderMapBottomControls(m)}
        </div>
      </div>
    </div>`;
  }


  function renderToolPreview(m){
    const t=placeMapTool,nodes=toArray(t?.nodes);if(!nodes.length)return "";
    const circles=nodes.map((p,i)=>`<circle class="map-tool-node ${i===0?"first":""}" cx="${Number(p.x)||0}" cy="${Number(p.y)||0}" r="${i===0?.85:.62}"/>`).join("");

    if(t.mode==="draw-zone"){
      const body=nodes.length>=3
        ? `<polygon class="map-tool-preview map-tool-zone-preview" points="${svgPoints(nodes)}"/>`
        : nodes.length>=2
          ? `<polyline class="map-tool-preview" points="${svgPoints(nodes)}" fill="none"/>`
          : "";
      return `${body}${circles}`;
    }

    if(["draw-line","draw-route","append-nodes","zone-part","zone-hole"].includes(t.mode)){
      const body=nodes.length>=2?`<polyline class="map-tool-preview" points="${svgPoints(nodes)}" fill="none"/>`:"";
      return `${body}${circles}`;
    }
    return circles;
  }

  function inverseRotatedPoint(x,y,deg,m=null){
    return {x,y};
  }

  function eventMapPoint(svg,ev,m){
    const r=svg.getBoundingClientRect();
    let x=(ev.clientX-r.left)/r.width*100,y=(ev.clientY-r.top)/r.height*100;
    const p=inverseRotatedPoint(x,y,Number(m.settings.rotation)||0,m);
    return {x:Math.max(0,Math.min(100,p.x)),y:Math.max(0,Math.min(100,p.y))};
  }


  function renderPlaceDescription(e){
    const p=placeData(e);
    return `<div class="place-description-layout">
      ${renderPlaceInfobox(e)}
      <div class="character-content-stack">
        <section class="character-section media-aware-block place-description-free">
          ${renderRichFlow(e.summary||"","summary",p.description.media,"place.description.media",e)}
          ${editMode?`<button class="inline-add-media edit-only" data-place-add-media="place.description.media" data-media-text-path="summary">＋ Multimedia</button>`:""}
        </section>
      </div>
    </div>`;
  }

  function renderPlaceHistory(e){
    const p=placeData(e);
    return `<div class="character-content-stack">
      ${p.history.map((s,i)=>richSection(e,{title:s.title||"",titlePath:`place.history.${i}.title`,path:`place.history.${i}.body`,mediaPath:`place.history.${i}.media`,removeAction:`data-place-remove-history="${i}"`})).join("")}
      ${editMode?`<button class="section-add edit-only" data-place-add-history>＋ Apartado</button>`:""}
    </div>`;
  }

  function placeParticipationCategories(){
    return [["personajes","Personajes"],["eventos","Eventos"],["grupos","Grupos"],["batallas","Batallas"],["rutas","Rutas"],["barcos","Barcos"],["arcos","Arcos"]];
  }

  function findPlaceParticipation(e){
    const needles=entityTerms(e).map(x=>x.toLocaleLowerCase("es")).filter(x=>x.length>=3);
    return placeParticipationCategories().map(([category,label])=>{
      const items=entities.filter(other=>{
        if(other.id===e.id||other.category!==category)return false;
        const raw=JSON.stringify(other).toLocaleLowerCase("es");
        return raw.includes(e.id.toLocaleLowerCase("es"))||(e.masterTag&&raw.includes(String(e.masterTag).toLocaleLowerCase("es")))||needles.some(n=>raw.includes(n));
      });
      return {category,label,items};
    }).filter(g=>g.items.length);
  }

  function renderPlaceParticipation(e){
    const groups=findPlaceParticipation(e);
    if(!groups.length)return `<section class="character-section"><div class="empty">Todavía no hay referencias suficientes.</div></section>`;
    return `<div class="character-content-stack">${groups.map(g=>`<section class="character-section"><h2>${esc(g.label)}</h2><div class="participation-grid">${g.items.map(target=>`<button class="participation-card" data-open-related="${target.id}"><span class="participation-icon">${icon(target.category)}</span><span><strong>${esc(target.title)}</strong></span></button>`).join("")}</div></section>`).join("")}</div>`;
  }

  function renderPlaceGallery(e){
    const p=placeData(e);
    return `<section class="character-section gallery-section"><div class="section-title-row"><h2>Galería</h2>${editMode?`<button class="section-add compact edit-only" data-place-add-gallery>＋ Multimedia</button>`:""}</div>
      ${p.gallery.length?`<div class="character-gallery-grid">${p.gallery.map((item,i)=>`<article class="character-gallery-card">${renderMediaElement(item)}${renderEditable(item.caption||"",`place.gallery.${i}.caption`,e,{cls:"gallery-caption direct-gallery-caption",placeholder:"Pie opcional"})}${editMode?`<button class="gallery-remove edit-only" data-place-remove-gallery="${i}">×</button>`:""}</article>`).join("")}</div>`:`<div class="empty">Sin multimedia.</div>`}
    </section>`;
  }

  function renderPlaceResearch(e){
    const r=placeData(e).research;
    r.kind ||= "Inventado";r.workStatus ||= "Nuevo";
    if(Array.isArray(r.sources))r.sources=r.sources.join("\n");if(Array.isArray(r.pending))r.pending=r.pending.join("\n");if(Array.isArray(r.notes))r.notes=r.notes.join("\n");
    return `<div class="character-content-stack">
      <section class="character-section research-choices"><div><h2>Lugar</h2>${editMode?`<select data-place-select-path="place.research.kind"><option ${r.kind==="Real"?"selected":""}>Real</option><option ${r.kind==="Inventado"?"selected":""}>Inventado</option><option ${r.kind==="Adaptado"?"selected":""}>Adaptado</option></select>`:`<div class="research-value">${esc(r.kind)}</div>`}</div><div><h2>Estado de desarrollo</h2>${editMode?`<select data-place-select-path="place.research.workStatus"><option ${r.workStatus==="Nuevo"?"selected":""}>Nuevo</option><option ${r.workStatus==="En desarrollo"?"selected":""}>En desarrollo</option><option ${r.workStatus==="Final"?"selected":""}>Final</option></select>`:`<div class="research-value">${esc(r.workStatus)}</div>`}</div></section>
      <section class="character-section"><h2>Fuentes</h2>${renderEditable(r.sources||"","place.research.sources",e,{cls:"character-prose editable-long-text",placeholder:"—"})}</section>
      <section class="character-section"><h2>Pendientes</h2>${renderEditable(r.pending||"","place.research.pending",e,{cls:"character-prose editable-long-text",placeholder:"—"})}</section>
      <section class="character-section"><h2>Notas</h2>${renderEditable(r.notes||"","place.research.notes",e,{cls:"character-prose editable-long-text",placeholder:"—"})}</section>
    </div>`;
  }

  function mapInput(path,value,{type="text",min="",max="",step="",cls="",placeholder=""}={}){
    return `<input class="map-field ${cls}" type="${type}" data-map-path="${esc(path)}" value="${esc(value??"")}" ${min!==""?`min="${min}"`:""} ${max!==""?`max="${max}"`:""} ${step!==""?`step="${step}"`:""} placeholder="${esc(placeholder)}">`;
  }
  function mapCheckbox(path,value,label=""){
    return `<label class="map-check"><input type="checkbox" data-map-path="${esc(path)}" data-map-type="bool" ${value!==false&&value?"checked":""}><span>${esc(label)}</span></label>`;
  }
  function mapSelect(path,value,options){
    return `<select class="map-field" data-map-path="${esc(path)}">${options.map(o=>{const v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return `<option value="${esc(v)}" ${String(value)===String(v)?"selected":""}>${esc(l)}</option>`}).join("")}</select>`;
  }
  function settingRow(label,control,wide=false){return `<label class="map-setting-row ${wide?"wide":""}"><span>${esc(label)}</span>${control}</label>`}

  function renderCalibrationSettings(m){
    const c=m.settings.calibration;
    const method=c.method||"pixel";
    return `<div class="map-settings-grid">
      ${settingRow("Método",mapSelect("settings.calibration.method",method,[["none","Sin calibrar"],["pixel","Valor por píxel"],["total","Dimensión conocida"],["twoPoints","Dos puntos"]]))}
      ${method!=="none"?settingRow("Unidad",mapSelect("settings.calibration.unit",c.unit,["mm","cm","m","km","mi","ft","nmi"])):""}
      ${method==="pixel"?settingRow("Valor por píxel",mapInput("settings.calibration.pixelValue",c.pixelValue,{type:"number",step:"any"})):""}
      ${method==="total"?settingRow("Ancho real",mapInput("settings.calibration.totalWidth",c.totalWidth,{type:"number",step:"any"})):""}
      ${method==="total"?settingRow("Alto real",mapInput("settings.calibration.totalHeight",c.totalHeight,{type:"number",step:"any"})):""}
      ${method==="twoPoints"?settingRow("Punto A",`<div class="inline-map-fields"><span class="read-value">${c.pointA?`X ${fmtNumber(c.pointA.x,2)} · Y ${fmtNumber(c.pointA.y,2)}`:"—"}</span><button class="tiny-map-btn" data-pick-calibration="A">Elegir</button></div>`,true):""}
      ${method==="twoPoints"?settingRow("Punto B",`<div class="inline-map-fields"><span class="read-value">${c.pointB?`X ${fmtNumber(c.pointB.x,2)} · Y ${fmtNumber(c.pointB.y,2)}`:"—"}</span><button class="tiny-map-btn" data-pick-calibration="B">Elegir</button></div>`,true):""}
      ${method==="twoPoints"?settingRow("Distancia A–B",mapInput("settings.calibration.pointDistance",c.pointDistance,{type:"number",step:"any"})):""}
    </div>`;
  }


  function renderMapGlobalSettings(m){
    const s=m.settings,{sx,sy}=mapScaleXY(m);
    const distUnit=s.units.distance||"m";
    return `<section class="map-panel-pane" data-map-pane="global">
      <div class="map-pane-head"><strong>Configuración global</strong></div>
      <div class="map-config-body compact-map-config">
        <h4>Mapa</h4>
        <div class="map-settings-grid">
          ${settingRow("Imagen base",`<div class="inline-map-fields"><button class="tiny-map-btn" data-map-load-image>${m.image?.src?"Cambiar":"Cargar"}</button><button class="tiny-map-btn danger" data-map-remove-image ${m.image?.src?"":"disabled"}>Quitar</button></div>`,true)}
          ${settingRow("Dimensiones",`<span class="read-value">${m.image?.width||0} × ${m.image?.height||0} px</span>`)}
          ${settingRow("Norte",mapInput("settings.northAngle",s.northAngle,{type:"number",min:-360,max:360,step:1}))}
        </div>
        <h4>Escala</h4>
        ${renderCalibrationSettings(m)}
        <div class="map-scale-result">${sx?`Escala: ${fmtNumber(mToDist(sx,distUnit),5)} ${distUnit}/px${sy&&Math.abs(sy-sx)>1e-12?` · Y ${fmtNumber(mToDist(sy,distUnit),5)} ${distUnit}/px`:""}`:"Sin calibrar"}</div>
        <h4>Unidades</h4>
        <div class="map-settings-grid">
          ${settingRow("Distancia",mapSelect("settings.units.distance",s.units.distance,["mm","cm","m","km","mi","ft","nmi"]))}
          ${settingRow("Área",mapSelect("settings.units.area",s.units.area,["m²","km²","ha","ft²"]))}
          ${settingRow("Velocidad",mapSelect("settings.units.speed",s.units.speed,["m/s","km/h","mph","kn"]))}
          ${settingRow("Tiempo",mapSelect("settings.units.time",s.units.time,["s","min","h","d"]))}
        </div>
        <h4>Precisión</h4>
        <div class="map-settings-grid">
          ${settingRow("Nivel",mapSelect("settings.precision.mode",s.precision.mode,["Exacta","Buena","Aproximada","Muy aproximada"]))}
          ${settingRow("Tolerancia",mapInput("settings.precision.tolerance",s.precision.tolerance,{type:"number",step:"any"}))}
          ${settingRow("Tipo",mapSelect("settings.precision.toleranceType",s.precision.toleranceType,["%",distUnit]))}
        </div>
      </div>
    </section>`;
  }

  function renderLayerPreferenceChecks(m){
    const d=m.settings.routeDefaults;
    if(!m.layers.length)return `<div class="empty small">No hay capas para preferencias/restricciones.</div>`;
    return `<div class="map-two-columns"><div><strong>Capas restringidas</strong><div class="map-check-list">${m.layers.map(l=>`<label><input type="checkbox" data-route-layer-pref="restricted" value="${l.id}" ${d.restrictedLayerIds.includes(l.id)?"checked":""}> ${esc(l.name||"Capa")}</label>`).join("")}</div></div><div><strong>Capas preferidas</strong><div class="map-check-list">${m.layers.map(l=>`<label><input type="checkbox" data-route-layer-pref="preferred" value="${l.id}" ${d.preferredLayerIds.includes(l.id)?"checked":""}> ${esc(l.name||"Capa")}</label>`).join("")}</div></div></div>`;
  }



  function renderMapLayers(m){
    return `<section class="map-panel-pane" data-map-pane="layers">
      <div class="map-pane-head"><strong>Capas</strong><button class="tiny-map-btn" data-add-layer>＋ Capa</button></div>
      <div class="map-config-body compact-map-config">
        ${m.layers.length?`<div class="map-table-list">${m.layers.map((l,i)=>`<div class="map-table-row layer-row compact-layer-row">
          ${mapInput(`layers.${i}.name`,l.name||"Capa")}
          ${mapInput(`layers.${i}.order`,l.order??i,{type:"number",step:1,placeholder:"Orden"})}
          <input class="map-color" type="color" data-map-path="layers.${i}.style.color" value="${esc(l.style?.color||"#d4b27a")}">
          <label class="mini-check"><input type="checkbox" data-map-path="layers.${i}.visible" data-map-type="bool" ${l.visible!==false?"checked":""}> Visible</label>
          <button class="tiny-map-btn danger" data-remove-layer="${i}">×</button>
        </div>`).join("")}</div>`:`<div class="empty small">Sin capas.</div>`}
      </div>
    </section>`;
  }


  function renderMapElementList(m){
    const labelFor=el=>el.kind==="point"?"Punto":el.kind==="zone"?"Zona":(el.routeMode||"route")==="line"?"Línea":"Ruta";
    const activeTool=placeMapTool?.mapId===m.id;
    const needsFinish=activeTool&&["draw-line","draw-zone","draw-route","append-nodes","zone-part","zone-hole"].includes(placeMapTool.mode);
    const canDraw=!!m.image?.src&&!activeTool;

    return `<section class="map-panel-pane" data-map-pane="elements">
      <div class="map-pane-head"><strong>Elementos</strong></div>
      <div class="map-config-body compact-map-config">
        <div class="map-element-create-row">
          <button class="tiny-map-btn" data-draw-tool="point" ${canDraw?"":"disabled"}>＋ Punto</button>
          <button class="tiny-map-btn" data-draw-tool="zone" ${canDraw?"":"disabled"}>＋ Zona</button>
          <button class="tiny-map-btn" data-draw-tool="route" ${canDraw?"":"disabled"}>＋ Ruta</button>
        </div>

        ${activeTool?`<div class="map-active-tool">
          <span>Herramienta activa</span>
          ${needsFinish?`<button class="tiny-map-btn finish" data-finish-map-tool>Terminar</button>`:""}
          <button class="tiny-map-btn danger" data-cancel-map-tool>Cancelar</button>
        </div>`:""}

        ${m.elements.length?`<div class="map-element-list">${m.elements.map(el=>`<div class="map-element-list-row ${el.id===selectedPlaceMapElementId?"active":""}">
          <button class="map-element-open" data-select-map-element="${el.id}"><span>${esc(labelFor(el))}</span><strong>${esc(el.name||"Sin nombre")}</strong></button>
          <label class="mini-check" title="Visible"><input type="checkbox" data-element-visible="${el.id}" ${el.visible!==false?"checked":""}></label>
          <button class="tiny-map-btn danger" data-delete-map-element="${el.id}">×</button>
        </div>`).join("")}</div>`:`<div class="empty small">Sin elementos.</div>`}
      </div>
    </section>`;
  }


  const POINT_ICON_PRESETS=[
    "•","●","○","◆","◇","★","✦","✚","⚑","⚔️","🛡️","⚓","⌂","♜","♞","♟️",
    "📍","🚩","🧭","🏠","🏰","⛺","🌲","🌋","🏔️","🌊","🔥","💀","👤","👥","🐾","❗",
    "❓","✨","☀️","🌙","🚶","🐎","🚢","⛵","🚗","✈️","🗡️","🏹","🔔","📜","🪙","💎"
  ];

  function mapRange(path,value,{min=0,max=100,step=1,suffix=""}={}){
    const v=value===""||value==null?min:value;
    return `<div class="map-range-control"><input class="map-field map-range" type="range" data-map-path="${esc(path)}" value="${esc(v)}" min="${min}" max="${max}" step="${step}"><output data-map-range-output>${esc(v)}${esc(suffix)}</output></div>`;
  }

  function renderPointIconSelector(m,el){
    const i=m.elements.indexOf(el);
    const current=el.iconImage?`<img src="${esc(el.iconImage)}" alt="">`:`<span>${esc(el.symbol||"•")}</span>`;
    return `<details class="point-icon-picker">
      <summary><span>Icono</span><span class="point-icon-current">${current}</span></summary>
      <div class="point-icon-picker-body">
        <div class="point-icon-grid">${POINT_ICON_PRESETS.map(icon=>`<button type="button" data-point-icon-preset="${esc(icon)}" title="${esc(icon)}">${esc(icon)}</button>`).join("")}</div>
        <label class="point-unicode-row"><span>Unicode / emoji</span><input class="map-field" data-point-unicode="${esc(el.id)}" value="${esc(el.iconImage?"":(el.symbol||""))}" maxlength="16" placeholder="📍"></label>
        <div class="point-icon-file-row"><button class="tiny-map-btn" type="button" data-point-icon-png="${esc(el.id)}">PNG</button>${el.iconImage?`<button class="tiny-map-btn danger" type="button" data-point-icon-clear="${esc(el.id)}">Quitar imagen</button>`:""}</div>
      </div>
    </details>`;
  }

  async function choosePointPng(){
    const file=await new Promise(resolve=>{
      const input=document.createElement("input");
      input.type="file";input.accept="image/png,.png";
      input.onchange=()=>resolve(input.files?.[0]||null);
      input.click();
    });
    if(!file)return null;
    const isPng=file.type==="image/png"||/\.png$/i.test(file.name||"");
    if(!isPng){alert("El icono del marcador debe ser un archivo PNG.");return null}
    return await readFileDataURL(file);
  }

  function updatePointMarkerVisual(m,el){
    if(!el||el.kind!=="point")return;
    const svg=$('[data-map-stage]');if(!svg)return;
    const group=svg.querySelector(`.point-shape[data-map-element="${CSS.escape(el.id)}"]`);if(!group)return;
    const circle=group.querySelector('circle');if(!circle)return;
    const size=Number(el.size)||12;
    const r=Math.max(.45,Math.min(3.2,size*.075));
    const x=Number(el.x)||0,y=Number(el.y)||0;
    circle.setAttribute('r',r);
    group.querySelector('.map-point-symbol')?.remove();
    group.querySelector('.map-point-image')?.remove();
    if(el.iconImage){
      const img=document.createElementNS('http://www.w3.org/2000/svg','image');
      img.setAttribute('class','map-point-image');img.setAttribute('href',el.iconImage);
      img.setAttribute('x',x-r*.68);img.setAttribute('y',y-r*.68);
      img.setAttribute('width',r*1.36);img.setAttribute('height',r*1.36);
      img.setAttribute('preserveAspectRatio','xMidYMid meet');img.setAttribute('pointer-events','none');
      group.appendChild(img);
    }else{
      const text=document.createElementNS('http://www.w3.org/2000/svg','text');
      text.setAttribute('class','map-point-symbol');text.setAttribute('x',x);text.setAttribute('y',y+.15);
      text.style.fontSize=`${Math.max(.9,Math.min(2.8,r*1.2))}px`;
      text.textContent=el.symbol||'•';group.appendChild(text);
    }
  }


  function mapLinkedEntity(el){
    return el?.targetId?entities.find(x=>x.id===el.targetId)||null:null;
  }

  function renderMapElementArticleLink(el){
    const linked=mapLinkedEntity(el);
    const grouped=[...new Set(entities.map(x=>x.category))].map(cat=>{
      const list=entities
        .filter(x=>x.category===cat)
        .sort((a,b)=>String(a.title||"").localeCompare(String(b.title||""),"es"));
      if(!list.length)return "";
      return `<optgroup label="${esc(categoryName(cat))}">${list.map(x=>`<option value="${x.id}" ${el.targetId===x.id?"selected":""}>${esc(x.title||x.id)}</option>`).join("")}</optgroup>`;
    }).join("");

    return `<div class="map-element-article-link">
      <label class="map-link-toggle"><input type="checkbox" data-element-article-enabled="${el.id}" ${el.targetId?"checked":""}> Vincular a artículo</label>
      <select class="map-field" data-element-article-select="${el.id}" ${el.targetId?"":"disabled"}>
        <option value="">— Seleccionar artículo —</option>
        ${grouped}
      </select>
      ${linked?`<small>Representa: ${esc(linked.title)} · ${esc(categoryName(linked.category))}</small>`:""}
    </div>`;
  }

  function renderCommonElementFields(e,m,el){
    const i=m.elements.indexOf(el);
    const assigned=toArray(el.layerIds).map(id=>m.layers.find(l=>l.id===id)).filter(Boolean);
    const available=m.layers.filter(l=>!el.layerIds?.includes(l.id));
    const layerPicker=m.layers.length?`<div class="element-layer-picker">
      <div class="element-layer-chips">${assigned.map(l=>`<span>${esc(l.name||"Capa")}<button data-remove-element-layer="${el.id}" data-layer-id="${l.id}" title="Quitar de esta capa">×</button></span>`).join("")}</div>
      <select class="map-field" data-add-element-layer-select="${el.id}" ${available.length?"":"disabled"}>
        <option value="">${available.length?"＋ Añadir capa":"Todas las capas asignadas"}</option>
        ${available.map(l=>`<option value="${l.id}">${esc(l.name||"Capa")}</option>`).join("")}
      </select>
    </div>`:"";
    return `<div class="map-settings-grid">
      ${settingRow("Nombre",mapInput(`elements.${i}.name`,el.name))}
      ${settingRow("Visible",mapCheckbox(`elements.${i}.visible`,el.visible!==false,"Mostrar"))}
      ${settingRow("Nombre",mapCheckbox(`elements.${i}.label`,el.label!==false,"Mostrar nombre"))}
      ${settingRow("Color",`<input class="map-color" type="color" data-map-path="elements.${i}.style.color" value="${esc(el.style?.color||layerStyleFor(m,el).color||"#d4b27a")}">`)}
    </div>
    ${layerPicker}
    ${renderMapElementArticleLink(el)}
    ${renderElementInfoEditor(e,m,el)}`;
  }


  function renderNodeEditor(m,el){
    if(!["zone","route"].includes(el.kind))return "";
    return `<div class="map-node-editor compact-node-help"><strong>Nodos · ${toArray(el.nodes).length}</strong><span>Doble clic en el borde: añadir · doble clic en un nodo: quitar</span></div>`;
  }

  function renderPointSpecific(m,el){
    const i=m.elements.indexOf(el),otherPoints=m.elements.filter(x=>x.kind==="point"&&x.id!==el.id);
    return `<h4>Punto</h4>
      <div class="derived-strip multi">${mapScaleXY(m).sx?`<span>Distancia a otro punto <select class="map-inline-select" data-point-distance-target="${el.id}"><option value="">—</option>${otherPoints.map(p=>`<option value="${p.id}">${esc(p.name||"Punto")}</option>`).join("")}</select> <strong data-point-distance-result>—</strong></span>`:""}</div>
      ${renderPointIconSelector(m,el)}
      <div class="map-settings-grid">
        ${settingRow("Tamaño",mapRange(`elements.${i}.size`,el.size||12,{min:6,max:40,step:1}))}
      </div>`;
  }

  function renderLineSpecific(m,el){
    const i=m.elements.indexOf(el),meters=polylineMeters(m,el.nodes);
    return `<h4>Línea</h4>
      <div class="derived-strip multi"><span>Longitud <strong>${formatDistance(meters,m)}</strong></span></div>
      <div class="map-settings-grid">
        ${settingRow("Trazo",mapSelect(`elements.${i}.strokeType`,el.strokeType||"solid",[["solid","Continuo"],["dashed","Discontinuo"],["dotted","Punteado"]]))}
        ${settingRow("Grosor",mapRange(`elements.${i}.style.lineWidth`,el.style?.lineWidth||2,{min:.75,max:16,step:.25}))}
        ${settingRow("Sentido",mapSelect(`elements.${i}.direction`,el.direction||"none",[["none","Sin dirección"],["forward","A → B"],["backward","B → A"],["both","Ambos"]]))}
        ${settingRow("Flechas",mapCheckbox(`elements.${i}.arrows`,el.arrows,"Mostrar"))}
      </div>
      ${renderNodeEditor(m,el)}`;
  }


  function renderZoneSpecific(m,el){
    const i=m.elements.indexOf(el),area=zoneAreaMeters2(m,el),per=zonePerimeterMeters(m,el);
    return `<h4>Zona</h4>
      <div class="derived-strip multi"><span>Área <strong>${formatArea(area,m)}</strong></span><span>Perímetro <strong>${formatDistance(per,m)}</strong></span></div>
      <div class="map-settings-grid">
        ${settingRow("Opacidad",mapRange(`elements.${i}.fillOpacity`,el.fillOpacity===""||el.fillOpacity==null?.14:el.fillOpacity,{min:0,max:.65,step:.05}))}
        ${settingRow("Borde",mapRange(`elements.${i}.borderWidth`,el.borderWidth||2,{min:.5,max:12,step:.25}))}
      </div>
      ${renderNodeEditor(m,el)}`;
  }

  function renderRouteSegments(m,r){
    const idx=m.elements.indexOf(r),timeUnit=m.settings.units.time||"h",speedUnit=m.settings.units.speed||"km/h";
    return `<div class="route-segments"><div class="map-mini-head"><strong>Tramos</strong><button class="tiny-map-btn" data-add-route-segment="${r.id}">＋ Tramo</button></div>
      ${r.segments.length?r.segments.map((seg,i)=>`<div class="route-segment-card">
        <div class="route-segment-title"><strong>Tramo ${i+1}</strong><button class="tiny-map-btn danger" data-remove-route-segment="${i}" data-route-owner="${r.id}">×</button></div>
        <div class="map-settings-grid">
          ${settingRow("Nodo inicial",mapInput(`elements.${idx}.segments.${i}.fromIndex`,seg.fromIndex??0,{type:"number",min:0,step:1}))}
          ${settingRow("Nodo final",mapInput(`elements.${idx}.segments.${i}.toIndex`,seg.toIndex??Math.max(1,r.nodes.length-1),{type:"number",min:1,step:1}))}
          ${settingRow("Transporte",mapInput(`elements.${idx}.segments.${i}.transport`,seg.transport||""))}
          ${settingRow(`Velocidad (${speedUnit})`,mapInput(`elements.${idx}.segments.${i}.speed`,seg.speed||"",{type:"number",step:"any"}))}
          ${settingRow(`Pausas (${timeUnit})`,mapInput(`elements.${idx}.segments.${i}.pauses`,seg.pauses||"",{type:"number",step:"any"}))}
          ${settingRow("Condición",mapInput(`elements.${idx}.segments.${i}.condition`,seg.condition||""))}
          ${settingRow(`Duración manual (${timeUnit})`,mapInput(`elements.${idx}.segments.${i}.durationManual`,seg.durationManual||"",{type:"number",step:"any"}))}
        </div>
      </div>`).join(""):`<div class="empty small">Sin tramos específicos.</div>`}
    </div>`;
  }



  function renderRouteSpecific(m,r){
    const i=m.elements.indexOf(r);
    const mode=r.routeMode||"route";
    if(mode==="line") return renderLineSpecific(m,r);

    const stats=routeStats(m,r),timeUnit=m.settings.units.time||"h",speedUnit=m.settings.units.speed||"km/h";
    return `<h4>Ruta</h4>
      <div class="derived-strip multi"><span>Distancia <strong>${formatDistance(stats.meters,m)}</strong></span><span>Duración calculada <strong>${stats.seconds?`${fmtNumber(secondsToTime(stats.seconds,timeUnit))} ${timeUnit}`:"—"}</strong></span>${stats.avgUnit?`<span>Velocidad media <strong>${fmtNumber(stats.avgUnit)} ${speedUnit}</strong></span>`:""}</div>
      ${stats.zones.length?`<div class="route-zones"><strong>Zonas atravesadas</strong>${stats.zones.map(z=>`<span>${esc(z.name)} · ≈${fmtNumber(z.ratio*100,1)}%</span>`).join("")}</div>`:""}
      ${r.proposal?`<button class="map-action accept-route" data-accept-route="${r.id}">Aceptar propuesta</button>`:""}
      <div class="map-settings-grid">
        ${settingRow("Origen",`<select class="map-field" data-map-path="elements.${i}.originPointId"><option value="">—</option>${m.elements.filter(x=>x.kind==="point").map(p=>`<option value="${p.id}" ${r.originPointId===p.id?"selected":""} ${r.destinationPointId===p.id?"disabled":""}>${esc(p.name||"Punto")}</option>`).join("")}</select>`)}
        ${settingRow("Destino",`<select class="map-field" data-map-path="elements.${i}.destinationPointId"><option value="">—</option>${m.elements.filter(x=>x.kind==="point").map(p=>`<option value="${p.id}" ${r.destinationPointId===p.id?"selected":""} ${r.originPointId===p.id?"disabled":""}>${esc(p.name||"Punto")}</option>`).join("")}</select>`)}
        ${settingRow("Ancho",mapRange(`elements.${i}.style.lineWidth`,r.style?.lineWidth||2,{min:.75,max:16,step:.25}))}
        ${settingRow("Sentido",mapSelect(`elements.${i}.direction`,r.direction||"forward",[["forward","A → B"],["backward","B → A"],["both","Ambos"]]))}
        ${settingRow("Transporte",mapInput(`elements.${i}.transport`,r.transport||""))}
        ${settingRow("Velocidad",mapSelect(`elements.${i}.speedMode`,r.speedMode||"fixed",[["fixed","Fija"],["interval","Intervalo"],["segments","Por tramo"],["knownTime","Tiempo conocido"]]))}
        ${(r.speedMode||"fixed")==="fixed"?settingRow(`Velocidad (${speedUnit})`,mapInput(`elements.${i}.fixedSpeed`,r.fixedSpeed,{type:"number",step:"any"})):""}
        ${r.speedMode==="interval"?settingRow("Velocidad mínima",mapInput(`elements.${i}.speedMin`,r.speedMin,{type:"number",step:"any"})):""}
        ${r.speedMode==="interval"?settingRow("Velocidad máxima",mapInput(`elements.${i}.speedMax`,r.speedMax,{type:"number",step:"any"})):""}
        ${settingRow(`Duración manual (${timeUnit})`,mapInput(`elements.${i}.durationManual`,r.durationManual,{type:"number",step:"any"}))}
      </div>
      <div class="map-check-list route-waypoints"><strong>Waypoints</strong>${m.elements.filter(x=>x.kind==="point"&&x.id!==r.originPointId&&x.id!==r.destinationPointId).map(p=>`<label><input type="checkbox" data-route-waypoint="${r.id}" value="${p.id}" ${r.waypointPointIds?.includes(p.id)?"checked":""}> ${esc(p.name||"Punto")}</label>`).join("")||"—"}</div>
      <details class="map-route-segments-details"><summary>Tramos</summary>${renderRouteSegments(m,r)}</details>
      ${renderNodeEditor(m,r)}`;
  }

  function renderElementMedia(m,el){
    const i=m.elements.indexOf(el);
    return `<div class="element-media"><div class="map-mini-head"><strong>Multimedia vinculada</strong><button class="tiny-map-btn" data-add-element-media="${el.id}">＋ Multimedia</button></div>${el.media?.length?`<div class="element-media-grid">${el.media.map((item,mi)=>`<div class="element-media-card">${renderMediaElement(item)}${renderEditable(item.caption||"",`place.maps.${placeData(entities.find(x=>x.id===currentView.id)).maps.indexOf(m)}.elements.${i}.media.${mi}.caption`,entities.find(x=>x.id===currentView.id),{cls:"media-caption",placeholder:"Pie opcional"})}<button class="gallery-remove" data-remove-element-media="${mi}" data-media-owner="${el.id}">×</button></div>`).join("")}</div>`:`<div class="empty small">Sin multimedia.</div>`}</div>`;
  }


  function renderSelectedElementInspector(e,m){
    const el=placeMapElement(m);
    if(!el)return `<section class="map-panel-pane" data-map-pane="selected">
      <div class="map-pane-head"><strong>Elemento seleccionado</strong></div>
      <div class="map-config-body"><div class="empty small">Selecciona un punto, una zona o una ruta.</div></div>
    </section>`;
    return `<section class="map-panel-pane" data-map-pane="selected">
      <div class="map-pane-head"><strong>${esc(el.name||"Elemento")}</strong></div>
      <div class="map-config-body">
        ${renderCommonElementFields(e,m,el)}
        ${el.kind==="point"?renderPointSpecific(m,el):el.kind==="zone"?renderZoneSpecific(m,el):renderRouteSpecific(m,el)}
      </div>
    </section>`;
  }


  function renderRouteGenerator(m){
    const g=m.generator,points=m.elements.filter(x=>x.kind==="point"),zones=m.elements.filter(x=>x.kind==="zone"),lines=m.elements.filter(x=>x.kind==="route"&&(x.routeMode||"route")==="line");
    const validOrigin=points.some(p=>p.id===g.originPointId),validDestination=points.some(p=>p.id===g.destinationPointId);
    const samePoint=validOrigin&&validDestination&&g.originPointId===g.destinationPointId;
    const toolBusy=placeMapTool?.mapId===m.id;
    const canGenerate=!!m.image?.src&&!toolBusy&&points.length>=2&&validOrigin&&validDestination&&!samePoint;

    return `<div class="map-route-generator-inline">
      <div class="map-pane-subhead"><strong>Generar ruta</strong></div>
      <div class="map-route-generator-body">
        <div class="map-settings-grid">
          ${settingRow("Origen",`<select class="map-field" data-generator-field="originPointId"><option value="">—</option>${points.map(p=>`<option value="${p.id}" ${g.originPointId===p.id?"selected":""} ${g.destinationPointId===p.id?"disabled":""}>${esc(p.name||"Punto")}</option>`).join("")}</select>`)}
          ${settingRow("Destino",`<select class="map-field" data-generator-field="destinationPointId"><option value="">—</option>${points.map(p=>`<option value="${p.id}" ${g.destinationPointId===p.id?"selected":""} ${g.originPointId===p.id?"disabled":""}>${esc(p.name||"Punto")}</option>`).join("")}</select>`)}
        </div>
        ${points.length<2?`<div class="map-condition-note">Necesitas al menos dos puntos.</div>`:""}
        <div class="map-check-list"><strong>Waypoints</strong>${points.map(p=>{const blocked=p.id===g.originPointId||p.id===g.destinationPointId;return `<label class="${blocked?"disabled-option":""}"><input type="checkbox" data-generator-list="waypointIds" value="${p.id}" ${g.waypointIds.includes(p.id)?"checked":""} ${blocked?"disabled":""}> ${esc(p.name||"Punto")}</label>`}).join("")||"—"}</div>
        ${lines.length?`<div class="map-check-list"><strong>Líneas preferidas</strong>${lines.map(l=>`<label><input type="checkbox" data-generator-list="preferredLineIds" value="${l.id}" ${g.preferredLineIds.includes(l.id)?"checked":""}> ${esc(l.name||"Línea")}</label>`).join("")}</div>`:""}
        ${zones.length?`<div class="map-check-list"><strong>Zonas a evitar</strong>${zones.map(z=>`<label><input type="checkbox" data-generator-list="avoidZoneIds" value="${z.id}" ${g.avoidZoneIds.includes(z.id)?"checked":""}> ${esc(z.name||"Zona")}</label>`).join("")}</div>`:""}
        <button class="map-action" data-generate-route ${canGenerate?"":"disabled"}>Generar propuesta</button>
      </div>
    </div>`;
  }

  function renderMapToolbar(m){
    return "";
  }



  function renderMapBottomControls(m){
    if(!m.image?.src)return "";
    const view=currentMapView(m);
    const mode=view.displayMode||"normal";
    return `<div class="map-bottom-controls view-only" data-map-bottom-controls>
      <div class="map-bottom-right">
        <button class="map-compact-btn" data-map-zoom="reset" title="Zoom 100%" aria-label="Zoom 100%">100%</button>
        <button class="map-compact-btn map-view-icon" data-map-view="tab" title="Vista de pestaña" aria-label="Vista de pestaña" ${mode==="tab"?"disabled":""}>▣</button>
        <button class="map-compact-btn map-view-icon" data-map-view="fullscreen" title="Pantalla completa" aria-label="Pantalla completa" ${mode==="fullscreen"?"disabled":""}>⛶</button>
        <button class="map-compact-btn map-view-icon" data-map-view="normal" title="Vista normal" aria-label="Vista normal" ${mode==="normal"?"disabled":""}>▭</button>
      </div>
    </div>`;
  }


  function renderPlaceMaps(e){
    const p=placeData(e);
    if(!p.maps.length){
      return `<section class="character-section place-no-maps"><div class="empty">Sin mapas.</div>${editMode?`<button class="section-add edit-only" data-add-place-map>＋ Mapa</button>`:""}</section>`;
    }
    const m=activePlaceMap(e);
    return `<div class="place-maps-shell">${renderMapStage(e,m)}</div>`;
  }

  function renderPlaceTab(e,tab){
    if(tab==="description")return renderPlaceDescription(e);
    if(tab==="maps")return renderPlaceMaps(e);
    if(tab==="history")return renderPlaceHistory(e);
    if(tab==="participation")return renderPlaceParticipation(e);
    if(tab==="gallery")return renderPlaceGallery(e);
    if(tab==="research")return renderPlaceResearch(e);
    return renderPlaceDescription(e);
  }

  function refreshPlaceTab(e){
    const active=$('.character-tab.active')?.dataset.placeTab||'description';
    let map=null,view=null;
    if(active==='maps'){
      map=activePlaceMap(e);
      if(map){
        view=currentMapView(map);
        view.panelScrollByTab ||= {};
        const currentTab=$('.map-panel-tab.active')?.dataset.mapPanelTab||view.panelTab||'elements';
        const scroll=$('.map-side-panel-scroll');
        if(scroll)view.panelScrollByTab[currentTab]=scroll.scrollTop;
      }
    }
    $('#characterTabPanel').innerHTML=renderPlaceTab(e,active);
    wirePlaceTab(e);
    if(map&&view){
      requestAnimationFrame(()=>{
        const scroll=$('.map-side-panel-scroll');
        if(scroll)scroll.scrollTop=Number(view.panelScrollByTab?.[view.panelTab]||0);
      });
    }
  }

  async function addPlaceMediaAtPath(e,path,textPath=""){
    const items=await chooseMediaMany();if(!items.length)return;
    let arr=getPath(e,path);if(!Array.isArray(arr)){arr=[];setPath(e,path,arr)}
    const anchor=preferredMediaAnchor(e,textPath),asGroup=items.length>1;
    for(const item of items){
      item.anchor=anchor;item.charOffset=0;delete item.offsetLines;delete item.offsetPx;item.position="center";
      if(asGroup) item.size=Math.min(30,item.size||30);
      arr.push(item);
    }
    await saveEntityDirect(e);refreshPlaceTab(e);
  }

  function getMapPath(m,path){return getPath(m,path)}
  function setMapPath(m,path,value){setPath(m,path,value)}

  function parseMapInputValue(input){
    if(input.dataset.mapType==="bool")return input.checked;
    if(input.type==="number"||input.type==="range") return input.value===""?"":Number(input.value);
    return input.value;
  }

  async function saveMapAndRefresh(e,refresh=true){
    await saveEntityDirect(e);if(refresh)refreshPlaceTab(e);
  }

  function updateListFromChecks(selector,checked,value){
    const arr=selector;if(checked){if(!arr.includes(value))arr.push(value)}else{const i=arr.indexOf(value);if(i>=0)arr.splice(i,1)}
  }


  function applyDefaultLevel(m,el){
    return el;
  }

  function cleanupMapReferences(m,removed){
    const id=removed?.id;if(!id)return;
    m.settings.routeDefaults.restrictedLayerIds=(m.settings.routeDefaults.restrictedLayerIds||[]).filter(x=>x!==id);
    m.settings.routeDefaults.preferredLayerIds=(m.settings.routeDefaults.preferredLayerIds||[]).filter(x=>x!==id);
    m.generator.waypointIds=(m.generator.waypointIds||[]).filter(x=>x!==id);
    m.generator.avoidZoneIds=(m.generator.avoidZoneIds||[]).filter(x=>x!==id);
    m.generator.preferredLineIds=(m.generator.preferredLineIds||[]).filter(x=>x!==id);
    if(m.generator.originPointId===id)m.generator.originPointId="";
    if(m.generator.destinationPointId===id)m.generator.destinationPointId="";
    for(const el of m.elements){
      el.layerIds=(el.layerIds||[]).filter(x=>x!==id);
      el.levelIds=(el.levelIds||[]).filter(x=>x!==id);
      if(el.targetId===id)el.targetId="";
      if(el.containerId===id)el.containerId="";
      if(el.originPointId===id)el.originPointId="";
      if(el.destinationPointId===id)el.destinationPointId="";
      if(el.waypointPointIds)el.waypointPointIds=el.waypointPointIds.filter(x=>x!==id);
      if(el.nodeLevels)el.nodeLevels=el.nodeLevels.map(x=>x===id?"":x);
    }
  }

  function finishMapTool(e,m){
    const t=placeMapTool;if(!t||t.mapId!==m.id)return;
    const minNodes=t.mode==="draw-zone"||t.mode==="zone-part"||t.mode==="zone-hole"?3:2;
    if(["draw-line","draw-zone","draw-route","zone-part","zone-hole"].includes(t.mode)&&t.nodes.length<minNodes){alert(`Faltan puntos: se necesitan al menos ${minNodes}.`);return}
    if(t.mode==="append-nodes"&&!t.nodes.length){placeMapTool=null;refreshPlaceTab(e);return}
    if(t.mode==="draw-line"&&t.nodes.length>=2){const el=applyDefaultLevel(m,newMapElement("route",t.nodes));el.routeMode="line";el.name="Nueva línea";el.direction="none";m.elements.push(el);selectedPlaceMapElementId=el.id;currentMapView(m).panelTab="selected"}
    else if(t.mode==="draw-zone"&&t.nodes.length>=3){const el=applyDefaultLevel(m,newMapElement("zone",t.nodes));m.elements.push(el);selectedPlaceMapElementId=el.id;currentMapView(m).panelTab="selected"}
    else if(t.mode==="draw-route"&&t.nodes.length>=2){const el=applyDefaultLevel(m,newMapElement("route",t.nodes));el.routeMode="route";m.elements.push(el);selectedPlaceMapElementId=el.id;currentMapView(m).panelTab="selected"}
    else if(t.mode==="append-nodes"&&t.targetId){const el=placeMapElement(m,t.targetId);if(el){el.nodes.push(...t.nodes);}}
    else if(t.mode==="zone-part"&&t.targetId&&t.nodes.length>=3){placeMapElement(m,t.targetId)?.parts.push(t.nodes)}
    else if(t.mode==="zone-hole"&&t.targetId&&t.nodes.length>=3){placeMapElement(m,t.targetId)?.holes.push(t.nodes)}
    placeMapTool=null;saveMapAndRefresh(e);
  }

  function densifyPolyline(nodes,count){
    const pts=toArray(nodes);if(pts.length<2||count<=pts.length)return pts.map(p=>({...p}));
    const segLens=[];let total=0;
    for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);segLens.push(d);total+=d}
    if(!total)return pts.map(p=>({...p}));
    const out=[];
    for(let k=0;k<count;k++){
      const target=total*k/(count-1);let acc=0;
      for(let i=0;i<segLens.length;i++){
        if(acc+segLens[i]>=target||i===segLens.length-1){const t=segLens[i]?Math.max(0,Math.min(1,(target-acc)/segLens[i])):0;out.push({x:pts[i].x+(pts[i+1].x-pts[i].x)*t,y:pts[i].y+(pts[i+1].y-pts[i].y)*t});break}acc+=segLens[i];
      }
    }
    return out;
  }

  function smoothPolyline(nodes,iterations){
    let pts=toArray(nodes).map(p=>({...p}));
    for(let it=0;it<Math.max(0,Number(iterations)||0);it++){
      if(pts.length<3)break;const next=[pts[0]];
      for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];next.push({x:.75*a.x+.25*b.x,y:.75*a.y+.25*b.y},{x:.25*a.x+.75*b.x,y:.25*a.y+.75*b.y})}
      next.push(pts[pts.length-1]);pts=next;
    }
    return pts;
  }

  function zoneBounds(z){
    const pts=[...toArray(z.nodes),...toArray(z.parts).flat()].filter(p=>Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y)));
    if(!pts.length)return null;
    return {minX:Math.min(...pts.map(p=>Number(p.x))),maxX:Math.max(...pts.map(p=>Number(p.x))),minY:Math.min(...pts.map(p=>Number(p.y))),maxY:Math.max(...pts.map(p=>Number(p.y)))};
  }

  function detourAroundZones(nodes,zones,pad=2){
    let pts=nodes.map(p=>({...p}));
    for(const z of zones){
      const next=[pts[0]];
      for(let i=1;i<pts.length;i++){
        const a=next[next.length-1],b=pts[i];
        if(polylineCrossesZone([a,b],z)){
          const box=zoneBounds(z);if(!box){next.push(b);continue}
          const candidates=[{x:box.minX-pad,y:box.minY-pad},{x:box.maxX+pad,y:box.minY-pad},{x:box.maxX+pad,y:box.maxY+pad},{x:box.minX-pad,y:box.maxY+pad}].map(p=>({x:Math.max(0,Math.min(100,p.x)),y:Math.max(0,Math.min(100,p.y))}));
          candidates.sort((p,q)=>(Math.hypot(p.x-a.x,p.y-a.y)+Math.hypot(b.x-p.x,b.y-p.y))-(Math.hypot(q.x-a.x,q.y-a.y)+Math.hypot(b.x-q.x,b.y-q.y)));
          next.push(candidates[0]);
        }
        next.push(b);
      }
      pts=next;
    }
    return pts;
  }

  function generateRouteProposal(e,m){
    const g=m.generator;
    const origin=placeMapElement(m,g.originPointId),dest=placeMapElement(m,g.destinationPointId);
    if(!m.image?.src){alert("Carga primero una imagen base.");return}
    if(!origin||origin.kind!=="point"||!dest||dest.kind!=="point"){alert("Elige un punto de origen y uno de destino.");return}
    if(origin.id===dest.id){alert("Origen y destino deben ser puntos distintos.");return}
    g.waypointIds=(g.waypointIds||[]).filter(id=>id!==origin.id&&id!==dest.id);
    let nodes=[{x:origin.x,y:origin.y}];
    for(const id of g.waypointIds){const pt=placeMapElement(m,id);if(pt?.kind==="point")nodes.push({x:pt.x,y:pt.y})}
    for(const id of g.preferredLineIds||[]){const line=placeMapElement(m,id);if(line?.kind==="route"&&(line.routeMode||"route")==="line")nodes.push(...toArray(line.nodes).map(p=>({...p})))}
    nodes.push({x:dest.x,y:dest.y});
    const avoid=(g.avoidZoneIds||[]).map(id=>placeMapElement(m,id)).filter(x=>x?.kind==="zone");
    if(avoid.length)nodes=detourAroundZones(nodes,avoid,2);
    const r=newMapElement("route",nodes);
    r.routeMode="route";r.name="Ruta propuesta";r.proposal=true;r.originPointId=origin.id;r.destinationPointId=dest.id;r.waypointPointIds=[...g.waypointIds];r.generation=JSON.parse(JSON.stringify(g));
    m.elements.push(r);selectedPlaceMapElementId=r.id;currentMapView(m).panelTab="selected";saveMapAndRefresh(e);
  }



  function pointSegmentDistance(p,a,b){
    const ax=Number(a.x)||0,ay=Number(a.y)||0,bx=Number(b.x)||0,by=Number(b.y)||0,px=Number(p.x)||0,py=Number(p.y)||0;
    const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy;
    if(!len2)return Math.hypot(px-ax,py-ay);
    const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2));
    return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
  }

  function nearestSegmentInsertIndex(nodes,p,closed=false){
    const pts=toArray(nodes);if(pts.length<2)return pts.length;
    let best=1,bestD=Infinity;
    const count=closed?pts.length:pts.length-1;
    for(let i=0;i<count;i++){
      const a=pts[i],b=pts[(i+1)%pts.length],d=pointSegmentDistance(p,a,b);
      if(d<bestD){bestD=d;best=i+1}
    }
    return Math.min(best,pts.length);
  }

  function updateSvgSelectedGeometry(m,el){
    const svg=$('[data-map-stage]');if(!svg)return;
    const shape=svg.querySelector(`[data-map-element="${CSS.escape(el.id)}"].map-shape`);
    const label=svg.querySelector(`.map-element-label[data-map-element="${CSS.escape(el.id)}"]`);

    if(el.kind==="point"){
      const circle=shape?.querySelector('circle');
      const symbol=shape?.querySelector('.map-point-symbol');
      const image=shape?.querySelector('.map-point-image');
      const size=Number(el.size)||12,r=Math.max(.45,Math.min(3.2,size*.075));
      if(circle){circle.setAttribute('cx',el.x);circle.setAttribute('cy',el.y);circle.setAttribute('r',r)}
      if(symbol){symbol.setAttribute('x',el.x);symbol.setAttribute('y',(Number(el.y)||0)+.15)}
      if(image){image.setAttribute('x',(Number(el.x)||0)-r*.68);image.setAttribute('y',(Number(el.y)||0)-r*.68);image.setAttribute('width',r*1.36);image.setAttribute('height',r*1.36)}
      if(label){label.setAttribute('x',el.x);label.setAttribute('y',(Number(el.y)||0)-2.1)}
    }else if(el.kind==="zone"){
      if(shape){
        const rings=[toArray(el.nodes),...toArray(el.parts),...toArray(el.holes)].filter(r=>r.length>2);
        const pathD=rings.map(r=>`M ${r.map(p=>`${Number(p.x)||0} ${Number(p.y)||0}`).join(" L ")} Z`).join(" ");
        shape.setAttribute('d',pathD);
      }
      if(label&&el.nodes?.length){
        const x=el.nodes.reduce((a,p)=>a+Number(p.x),0)/el.nodes.length;
        const y=el.nodes.reduce((a,p)=>a+Number(p.y),0)/el.nodes.length;
        label.setAttribute('x',x);label.setAttribute('y',y);
      }
    }else if(el.kind==="route"){
      {
        const lineMode=(el.routeMode||"route")==="line";
        let nodes=lineMode?toArray(el.nodes):routeNodesForCalc(el);
        if(lineMode&&Number(el.smoothing)>0)nodes=smoothPolyline(nodes,Number(el.smoothing));
        const pts=svgPoints(nodes);
        if(shape)shape.setAttribute('points',pts);
        svg.querySelector(`.map-route-hit[data-map-element="${CSS.escape(el.id)}"]`)?.setAttribute('points',pts);
      }
      if(label&&el.nodes?.length){
        const x=el.nodes.reduce((a,p)=>a+Number(p.x),0)/el.nodes.length;
        const y=el.nodes.reduce((a,p)=>a+Number(p.y),0)/el.nodes.length;
        label.setAttribute('x',x);label.setAttribute('y',y);
      }
    }

    svg.querySelectorAll('.map-node-handle').forEach(h=>{
      const part=h.dataset.nodePart,idx=Number(h.dataset.nodeIndex),pi=Number(h.dataset.partIndex||0);let p;
      if(part==="point")p={x:el.x,y:el.y};
      else if(part==="nodes")p=el.nodes[idx];
      else p=el[part]?.[pi]?.[idx];
      if(p){
        h.setAttribute('cx',p.x);h.setAttribute('cy',p.y);
        const dot=h.parentElement?.querySelector('.map-node-dot');
        if(dot){dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y)}
      }
    });
  }


  function updateMapEditingControlScale(m){
    const canvas=$('[data-map-canvas]'),svg=$('[data-map-stage]');if(!canvas||!svg)return;
    const zoom=Math.max(.1,currentMapView(m).zoom||1);
    const pxPerUnit=Math.max(.1,(canvas.offsetWidth/100)*zoom);
    const visibleR=Math.max(.10,4.5/pxPerUnit);
    const hitR=Math.max(visibleR+.08,10/pxPerUnit);
    const hitStroke=Math.max(.08,(hitR-visibleR)*2);

    svg.querySelectorAll('.map-node-handle').forEach(h=>{
      h.setAttribute('r',visibleR);
      h.setAttribute('stroke-width',hitStroke);
    });
    svg.querySelectorAll('.map-node-dot').forEach(dot=>{
      dot.setAttribute('r',visibleR);
      dot.setAttribute('stroke-width',Math.max(.04,1/pxPerUnit));
    });
    svg.querySelectorAll('.map-tool-node').forEach((n,i)=>{
      n.setAttribute('r',(n.classList.contains('first')?1.15:1)*visibleR);
    });
  }

  function applyMapCanvasView(m){
    const canvas=$('[data-map-canvas]');if(!canvas)return;
    const v=currentMapView(m);
    canvas.style.transform=`translate(${v.panX}px,${v.panY}px) scale(${v.zoom})`;
    updateMapEditingControlScale(m);
  }


  function setMapDisplayMode(m,mode){
    const viewport=$('[data-map-viewport]');if(!viewport)return;
    const v=currentMapView(m);
    const fullscreenHost=document.getElementById("characterTabPanel")||viewport;

    if(mode==="normal"){
      v.displayMode="normal";
      viewport.classList.remove("map-tab-mode");
      if(document.fullscreenElement)document.exitFullscreen?.();
      syncMapViewButtons(m);
      return;
    }

    if(mode==="tab"){
      v.displayMode="tab";
      viewport.classList.add("map-tab-mode");
      if(document.fullscreenElement)document.exitFullscreen?.();
      syncMapViewButtons(m);
      return;
    }

    if(mode==="fullscreen"){
      v.displayMode="fullscreen";
      viewport.classList.remove("map-tab-mode");
      const request=fullscreenHost.requestFullscreen?.();
      if(request?.catch){
        request.catch(()=>{
          v.displayMode="normal";
          syncMapViewButtons(m);
        });
      }
      syncMapViewButtons(m);
    }
  }

  function syncMapViewButtons(m){
    const mode=currentMapView(m).displayMode||"normal";
    $$('[data-map-view]').forEach(btn=>btn.disabled=btn.dataset.mapView===mode);
  }

  function wireMapViewportNavigation(m){
    const viewport=$('[data-map-viewport]');
    const canvas=viewport?.querySelector('[data-map-canvas]');
    if(!viewport||!canvas)return;

    viewport.onwheel=ev=>{
      if(ev.target.closest('[data-map-side-panel]'))return;
      if(!m.image?.src)return;
      ev.preventDefault();
      const v=currentMapView(m);
      const min=.25,max=8;
      const old=v.zoom;
      const factor=ev.deltaY<0?1.12:(1/1.12);
      const next=Math.max(min,Math.min(max,old*factor));
      if(Math.abs(next-old)<1e-6)return;

      const main=viewport.querySelector('.place-map-main');
      const mr=(main||viewport).getBoundingClientRect();
      const localX=ev.clientX-mr.left;
      const localY=ev.clientY-mr.top;
      v.panX=localX-(localX-v.panX)*(next/old);
      v.panY=localY-(localY-v.panY)*(next/old);
      v.zoom=next;
      applyMapCanvasView(m);
    };

    let pan=null;
    viewport.onpointerdown=ev=>{
      if(ev.button!==0)return;
      if(ev.target.closest('[data-map-bottom-controls],[data-map-side-panel],[data-map-panel-collapse],.map-tabs-overlay,.map-node-handle,[data-map-element]'))return;
      if(editMode&&placeMapTool?.mapId===m.id)return;
      const v=currentMapView(m);
      pan={id:ev.pointerId,startX:ev.clientX,startY:ev.clientY,panX:v.panX,panY:v.panY,moved:false};
      try{viewport.setPointerCapture(ev.pointerId)}catch{}
    };
    viewport.onpointermove=ev=>{
      if(!pan||pan.id!==ev.pointerId)return;
      const dx=ev.clientX-pan.startX,dy=ev.clientY-pan.startY;
      if(!pan.moved&&Math.hypot(dx,dy)<4)return;
      pan.moved=true;
      ev.preventDefault();
      const v=currentMapView(m);
      v.panX=pan.panX+dx;
      v.panY=pan.panY+dy;
      viewport.classList.add('is-panning');
      applyMapCanvasView(m);
    };
    const finish=ev=>{
      if(!pan||pan.id!==ev.pointerId)return;
      const v=currentMapView(m);
      if(pan.moved)v.justPanned=true;
      pan=null;
      viewport.classList.remove('is-panning');
      try{viewport.releasePointerCapture(ev.pointerId)}catch{}
    };
    viewport.onpointerup=finish;
    viewport.onpointercancel=finish;

    $$('[data-map-view]').forEach(btn=>btn.onclick=()=>setMapDisplayMode(m,btn.dataset.mapView));
    document.onfullscreenchange=()=>{
      const v=currentMapView(m);
      if(!document.fullscreenElement&&v.displayMode==="fullscreen"){
        v.displayMode="normal";
        syncMapViewButtons(m);
      }
    };
    syncMapViewButtons(m);
  }

  function wireMapStage(e,m){
    const svg=$('[data-map-stage]');if(!svg)return;
    svg.onclick=async ev=>{
      const view=currentMapView(m);
      if(view.justPanned){view.justPanned=false;return}
      const p=eventMapPoint(svg,ev,m);
      const t=editMode?placeMapTool:null;
      if(t&&t.mapId===m.id){
        if(t.mode==="pick-calibration-A"||t.mode==="pick-calibration-B"){
          const key=t.mode.endsWith("A")?"pointA":"pointB";m.settings.calibration[key]=p;placeMapTool=null;await saveMapAndRefresh(e);return;
        }
        if(t.mode==="draw-point"){
          const el=applyDefaultLevel(m,newMapElement("point",[p]));m.elements.push(el);selectedPlaceMapElementId=el.id;currentMapView(m).panelTab="selected";placeMapTool=null;await saveMapAndRefresh(e);return;
        }
        const tolerance=Math.max(.65,1.55/Math.max(.5,currentMapView(m).zoom||1));
        if(t.mode==="draw-zone"&&t.nodes.length>=3){
          const first=t.nodes[0];
          if(Math.hypot(p.x-first.x,p.y-first.y)<=tolerance){finishMapTool(e,m);return}
        }
        if(t.mode==="draw-route"&&t.nodes.length>=2){
          const last=t.nodes[t.nodes.length-1];
          if(Math.hypot(p.x-last.x,p.y-last.y)<=tolerance){finishMapTool(e,m);return}
        }
        t.nodes.push(p);refreshPlaceTab(e);return;
      }
      const shape=ev.target.closest?.('[data-map-element]');
      if(shape&&!ev.target.classList.contains('map-node-handle')){
        if(editMode){
          selectedPlaceMapElementId=shape.dataset.mapElement;
          currentMapView(m).panelTab="selected";
          activeMapInfoElementId="";
          refreshPlaceTab(e);return;
        }
        const el=placeMapElement(m,shape.dataset.mapElement);
        activeMapInfoElementId=el&&mapElementHasInfo(m,el)?el.id:"";
        refreshPlaceTab(e);return;
      }
      if(!editMode&&activeMapInfoElementId){activeMapInfoElementId="";refreshPlaceTab(e);return}
    };

    if(editMode){
      svg.ondblclick=async ev=>{
        ev.preventDefault();ev.stopPropagation();
        const el=placeMapElement(m);if(!el||!["zone","route"].includes(el.kind))return;
        const handle=ev.target.closest?.('.map-node-handle');
        if(handle){
          const part=handle.dataset.nodePart,index=Number(handle.dataset.nodeIndex),pi=Number(handle.dataset.partIndex||0);
          if(part==="nodes"){
            const minimum=el.kind==="zone"?3:2;
            if(el.nodes.length<=minimum)return;
            el.nodes.splice(index,1);
          }else if(el[part]?.[pi]&&el[part][pi].length>3){
            el[part][pi].splice(index,1);
          }else return;
          updateSvgSelectedGeometry(m,el);
          await saveEntityDirect(e);refreshPlaceTab(e);return;
        }
        const target=ev.target.closest?.('[data-map-element]');
        if(!target||target.dataset.mapElement!==el.id)return;
        const p=eventMapPoint(svg,ev,m);
        const idx=nearestSegmentInsertIndex(el.nodes,p,el.kind==="zone");
        el.nodes.splice(idx,0,p);
        updateSvgSelectedGeometry(m,el);
        await saveEntityDirect(e);refreshPlaceTab(e);
      };
    }

    let drag=null;
    if(!editMode)return;

    // Punto seleccionado: se mueve arrastrando el propio marcador, sin círculo auxiliar.
    const selectedPoint=placeMapElement(m);
    const pointShape=selectedPoint?.kind==="point"?svg.querySelector(`.point-shape[data-map-element="${CSS.escape(selectedPoint.id)}"]`):null;
    if(pointShape){
      let pointDrag=null;
      pointShape.onpointerdown=ev=>{
        if(ev.button!==0)return;ev.preventDefault();ev.stopPropagation();
        pointDrag={id:ev.pointerId,startX:ev.clientX,startY:ev.clientY,moved:false};
        try{pointShape.setPointerCapture(ev.pointerId)}catch{}
      };
      pointShape.onpointermove=ev=>{
        if(!pointDrag||pointDrag.id!==ev.pointerId)return;
        if(Math.hypot(ev.clientX-pointDrag.startX,ev.clientY-pointDrag.startY)>2)pointDrag.moved=true;
        const p=eventMapPoint(svg,ev,m);selectedPoint.x=p.x;selectedPoint.y=p.y;updateSvgSelectedGeometry(m,selectedPoint);
      };
      pointShape.onpointerup=async ev=>{
        if(!pointDrag||pointDrag.id!==ev.pointerId)return;
        if(pointDrag.moved)currentMapView(m).justPanned=true;
        try{pointShape.releasePointerCapture(ev.pointerId)}catch{}
        pointDrag=null;await saveEntityDirect(e);
      };
      pointShape.onpointercancel=()=>{pointDrag=null};
    }
    updateMapEditingControlScale(m);
    svg.querySelectorAll('.map-node-handle').forEach(handle=>{      handle.onpointerdown=ev=>{ev.preventDefault();ev.stopPropagation();handle.setPointerCapture(ev.pointerId);drag={handle,pointerId:ev.pointerId,part:handle.dataset.nodePart,index:Number(handle.dataset.nodeIndex),partIndex:Number(handle.dataset.partIndex||0)}};
      handle.onpointermove=ev=>{
        if(!drag||drag.pointerId!==ev.pointerId)return;const p=eventMapPoint(svg,ev,m);const el=placeMapElement(m);if(!el)return;
        if(drag.part==="point"){el.x=p.x;el.y=p.y}else if(drag.part==="nodes")el.nodes[drag.index]=p;else if(el[drag.part]?.[drag.partIndex])el[drag.part][drag.partIndex][drag.index]=p;
        updateSvgSelectedGeometry(m,el);
      };
      handle.onpointerup=async ev=>{
        if(!drag)return;
        try{handle.releasePointerCapture(ev.pointerId)}catch{}
        drag=null;
        await saveEntityDirect(e);
        // No rerender here: the geometry is already updated live in SVG.
        // This keeps Pestaña/Pantalla locked in the current view mode.
      };
    });
  }

  function wirePlaceMap(e,m){
    $$('[data-place-map-tab]').forEach(btn=>btn.onclick=()=>{activePlaceMapId=btn.dataset.placeMapTab;selectedPlaceMapElementId="";activeMapInfoElementId="";placeMapTool=null;refreshPlaceTab(e)});
    $$('[data-map-zoom="reset"]').forEach(btn=>btn.onclick=()=>{const v=currentMapView(m);v.zoom=1;v.panX=0;v.panY=0;applyMapCanvasView(m)});
    wireMapViewportNavigation(m);
    wireMapStage(e,m);
    const panelToggle=$('[data-map-panel-collapse]');
    panelToggle?.addEventListener('pointerdown',ev=>{
      ev.stopPropagation();
    });
    panelToggle?.addEventListener('click',ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      const v=currentMapView(m);v.panelCollapsed=!v.panelCollapsed;
      const panel=$('[data-map-side-panel]'),workspace=$('.place-map-workspace');
      panel?.classList.toggle('collapsed',v.panelCollapsed);
      workspace?.classList.toggle('panel-collapsed',v.panelCollapsed);
      ev.currentTarget.textContent=v.panelCollapsed?'›':'‹';
      ev.currentTarget.title=v.panelCollapsed?'Abrir panel':'Reducir panel';
      ev.currentTarget.setAttribute('aria-label',v.panelCollapsed?'Abrir panel':'Reducir panel');
    });
    $('[data-close-map-info]')?.addEventListener('click',ev=>{ev.stopPropagation();activeMapInfoElementId="";refreshPlaceTab(e)});
    $$('[data-open-map-article]').forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.openMapArticle;
      if(document.fullscreenElement)document.exitFullscreen?.();
      showEntity(id);
    });
    if(!editMode)return;

    $$('[data-map-panel-tab]').forEach(btn=>btn.onclick=()=>{
      const v=currentMapView(m);
      v.panelTab=btn.dataset.mapPanelTab;
      refreshPlaceTab(e);
    });

    $('[data-map-title-edit]')?.addEventListener('blur',async ev=>{
      const value=ev.currentTarget.innerText.replace(/\u00a0/g,' ').trim();
      m.title=value||'Mapa';
      await saveMapAndRefresh(e);
    });
    $('[data-map-title-edit]')?.addEventListener('keydown',ev=>{
      if(ev.key==='Enter'){ev.preventDefault();ev.currentTarget.blur()}
    });
    $$('[data-remove-place-map]').forEach(btn=>btn.onclick=async()=>{const p=placeData(e),idx=p.maps.findIndex(x=>x.id===btn.dataset.removePlaceMap);if(idx<0)return;if(!confirm('¿Quitar este mapa?'))return;p.maps.splice(idx,1);activePlaceMapId=p.maps[0]?.id||"";selectedPlaceMapElementId="";placeMapTool=null;await saveMapAndRefresh(e)});
    $$('[data-map-load-image]').forEach(btn=>btn.onclick=async()=>{const img=await chooseMapImage();if(!img)return;m.image=img;await saveMapAndRefresh(e)});
    $$('[data-map-remove-image]').forEach(btn=>btn.onclick=async()=>{
      if(!m.image?.src)return;
      if(!confirm('¿Quitar la imagen base de este mapa?'))return;
      m.image=null;
      await saveMapAndRefresh(e);
    });


    const panelScroll=$('.map-side-panel-scroll');
    if(panelScroll){
      panelScroll.onscroll=()=>{
        const v=currentMapView(m);v.panelScrollByTab||={};v.panelScrollByTab[v.panelTab||'elements']=panelScroll.scrollTop;
      };
    }

    $$('[data-point-icon-preset]').forEach(btn=>btn.onclick=async()=>{
      const el=placeMapElement(m);if(!el||el.kind!=="point")return;
      el.symbol=btn.dataset.pointIconPreset||"•";el.iconImage="";
      updatePointMarkerVisual(m,el);await saveEntityDirect(e);
      const current=$('.point-icon-current');if(current)current.innerHTML=`<span>${esc(el.symbol)}</span>`;
      const unicode=$(`[data-point-unicode="${CSS.escape(el.id)}"]`);if(unicode)unicode.value=el.symbol;
    });
    $$('[data-point-unicode]').forEach(input=>{
      input.oninput=()=>{
        const el=placeMapElement(m,input.dataset.pointUnicode);if(!el||el.kind!=="point")return;
        el.symbol=input.value||"•";el.iconImage="";updatePointMarkerVisual(m,el);
        const current=$('.point-icon-current');if(current)current.innerHTML=`<span>${esc(el.symbol)}</span>`;
      };
      input.onchange=async()=>{const el=placeMapElement(m,input.dataset.pointUnicode);if(el)await saveEntityDirect(e)};
    });
    $$('[data-point-icon-png]').forEach(btn=>btn.onclick=async()=>{
      const el=placeMapElement(m,btn.dataset.pointIconPng);if(!el||el.kind!=="point")return;
      const src=await choosePointPng();if(!src)return;
      el.iconImage=src;updatePointMarkerVisual(m,el);await saveEntityDirect(e);
      const current=$('.point-icon-current');if(current)current.innerHTML=`<img src="${src}" alt="">`;
    });
    $$('[data-point-icon-clear]').forEach(btn=>btn.onclick=async()=>{
      const el=placeMapElement(m,btn.dataset.pointIconClear);if(!el||el.kind!=="point")return;
      el.iconImage="";if(!el.symbol)el.symbol="•";updatePointMarkerVisual(m,el);await saveEntityDirect(e);refreshPlaceTab(e);
    });

    $$('.map-range[data-map-path]').forEach(input=>{
      const output=input.parentElement?.querySelector('[data-map-range-output]');
      input.oninput=()=>{
        const path=input.dataset.mapPath;const value=parseMapInputValue(input);setMapPath(m,path,value);
        if(output)output.textContent=String(value);
        const idx=path.startsWith('elements.')?Number(path.split('.')[1]):-1,el=idx>=0?m.elements[idx]:null;
        const svg=$('[data-map-stage]');
        if(el&&svg){
          if(el.kind==='point'&&path.endsWith('.size'))updatePointMarkerVisual(m,el);
          if(el.kind==='zone'&&path.endsWith('.fillOpacity'))svg.querySelector(`.zone-shape[data-map-element="${CSS.escape(el.id)}"]`)?.setAttribute('fill-opacity',value);
          if(el.kind==='zone'&&path.endsWith('.borderWidth'))svg.querySelector(`.zone-shape[data-map-element="${CSS.escape(el.id)}"]`)?.setAttribute('stroke-width',Math.max(.16,Number(value)*.16));
          if(el.kind==='route'&&path.endsWith('.style.lineWidth')){
            const st=mapElementStyle(m,el),visual=Math.max(.18,st.width*.19);
            svg.querySelector(`.map-shape[data-map-element="${CSS.escape(el.id)}"]`)?.setAttribute('stroke-width',visual);
            svg.querySelector(`.map-route-hit[data-map-element="${CSS.escape(el.id)}"]`)?.setAttribute('stroke-width',Math.max(2.4,visual*5.5));
          }
        }
      };
      input.onchange=async()=>{await saveEntityDirect(e)};
    });

    $$('.map-color[data-map-path]').forEach(input=>{
      input.oninput=()=>{
        const path=input.dataset.mapPath;
        const color=input.value;
        setMapPath(m,path,color);

        const paintElement=(el)=>{
          const svg=$('[data-map-stage]');if(!svg||!el)return;
          const shape=svg.querySelector(`.map-shape[data-map-element="${CSS.escape(el.id)}"]`);
          if(shape){
            if(el.kind==="point"){
              shape.querySelector('circle')?.setAttribute('fill',color);
            }else if(el.kind==="zone"){
              shape.setAttribute('fill',color);
              shape.setAttribute('stroke',color);
              shape.setAttribute('fill-opacity',String(el.fillOpacity!==""&&el.fillOpacity!=null?Number(el.fillOpacity):0.14));
            }else{
              shape.setAttribute('stroke',color);
            }
          }
          if(el.id===selectedPlaceMapElementId){
            svg.querySelectorAll('.map-node-dot').forEach(dot=>{
              dot.style.fill=color;
              dot.style.stroke='rgba(18,16,18,.82)';
            });
          }
        };

        if(path.startsWith('elements.')){
          const idx=Number(path.split('.')[1]);
          paintElement(m.elements[idx]);
        }else if(path.startsWith('layers.')){
          const layerIndex=Number(path.split('.')[1]);
          const layer=m.layers[layerIndex];
          if(layer){
            for(const el of m.elements.filter(x=>x.layerIds?.includes(layer.id)&&!(x.style?.color))){
              paintElement(el);
            }
          }
        }
      };
    });

    $$('[data-add-element-info-section]').forEach(btn=>btn.onclick=async()=>{
      const el=placeMapElement(m,btn.dataset.infoOwner);if(!el)return;
      const doc=elementInfoDoc(el);
      const isSubtitle=btn.dataset.addElementInfoSection==="subtitle";
      doc.sections.push({level:isSubtitle?"subtitle":"title",title:isSubtitle?"Nuevo subtítulo":"Nuevo título",body:"",media:[]});
      await saveEntityDirect(e);refreshPlaceTab(e);
    });
    $$('[data-remove-element-info-section]').forEach(btn=>btn.onclick=async()=>{
      const el=placeMapElement(m,btn.dataset.infoOwner);if(!el)return;
      const doc=elementInfoDoc(el);
      doc.sections.splice(Number(btn.dataset.removeElementInfoSection),1);
      await saveEntityDirect(e);refreshPlaceTab(e);
    });

    $$('[data-element-article-enabled]').forEach(input=>input.onchange=async()=>{
      const el=placeMapElement(m,input.dataset.elementArticleEnabled);if(!el)return;
      const select=$(`[data-element-article-select="${CSS.escape(el.id)}"]`);
      if(input.checked){
        select?.removeAttribute('disabled');
        if(select?.value)el.targetId=select.value;
      }else{
        el.targetId="";
        if(select){select.value="";select.setAttribute('disabled',"")}
      }
      await saveEntityDirect(e);
      refreshPlaceTab(e);
    });
    $$('[data-element-article-select]').forEach(sel=>sel.onchange=async()=>{
      const el=placeMapElement(m,sel.dataset.elementArticleSelect);if(!el)return;
      el.targetId=sel.value||"";
      await saveEntityDirect(e);
      refreshPlaceTab(e);
    });

    $$('[data-add-element-layer-select]').forEach(sel=>sel.onchange=async()=>{
      const el=placeMapElement(m,sel.dataset.addElementLayerSelect);if(!el||!sel.value)return;
      el.layerIds||=[];if(!el.layerIds.includes(sel.value))el.layerIds.push(sel.value);
      await saveMapAndRefresh(e);
    });
    $$('[data-remove-element-layer]').forEach(btn=>btn.onclick=async()=>{
      const el=placeMapElement(m,btn.dataset.removeElementLayer);if(!el)return;
      el.layerIds=toArray(el.layerIds).filter(id=>id!==btn.dataset.layerId);
      await saveMapAndRefresh(e);
    });


    $$('[data-map-path]').forEach(input=>{
      if(input.classList.contains('map-range'))return;
      const handler=async()=>{
        const path=input.dataset.mapPath;if(path.startsWith('__'))return;
        let value=parseMapInputValue(input);
        if(path.endsWith('nodeElevations')&&typeof value==='string')value=value.split(',').map(x=>Number(x.trim())).filter(Number.isFinite);
        setMapPath(m,path,value);
        if(path.endsWith('.routeMode')){
          const idx=Number(path.split('.')[1]),route=m.elements[idx];
          if(route){
            if(value==='line'&&(route.direction==='forward'||!route.direction))route.direction='none';
            if(value==='route'&&route.direction==='none')route.direction='forward';
          }
        }
        if(path.endsWith('.originPointId')||path.endsWith('.destinationPointId')){
          const idx=Number(path.split('.')[1]),route=m.elements[idx];
          if(route){
            if(route.originPointId&&route.originPointId===route.destinationPointId){
              if(path.endsWith('.originPointId'))route.destinationPointId='';else route.originPointId='';
            }
            route.waypointPointIds=(route.waypointPointIds||[]).filter(id=>id!==route.originPointId&&id!==route.destinationPointId);
          }
        }
        await saveMapAndRefresh(e);
      };
      input.onchange=handler;
    });

    $$('[data-pick-calibration]').forEach(btn=>btn.onclick=()=>{if(!m.image?.src){alert('Carga primero una imagen base.');return}placeMapTool={mode:`pick-calibration-${btn.dataset.pickCalibration}`,mapId:m.id,nodes:[]};toast(`Haz clic en el mapa para elegir el punto ${btn.dataset.pickCalibration}.`);refreshPlaceTab(e)});
    $('[data-add-control-pair]')?.addEventListener('click',async()=>{m.settings.calibration.controlPairs.push({x1:"",y1:"",x2:"",y2:"",distance:""});await saveMapAndRefresh(e)});
    $$('[data-remove-control-pair]').forEach(btn=>btn.onclick=async()=>{m.settings.calibration.controlPairs.splice(Number(btn.dataset.removeControlPair),1);await saveMapAndRefresh(e)});

    $('[data-add-layer]')?.addEventListener('click',async()=>{m.layers.push({id:mapUid('layer'),name:'Nueva capa',order:m.layers.length,visible:true,opacity:1,style:{color:'#d4b27a'}});await saveMapAndRefresh(e)});
    $$('[data-remove-layer]').forEach(btn=>btn.onclick=async()=>{const item=m.layers[Number(btn.dataset.removeLayer)];if(!item)return;m.layers.splice(Number(btn.dataset.removeLayer),1);cleanupMapReferences(m,item);await saveMapAndRefresh(e)});

    $$('[data-route-layer-pref]').forEach(c=>c.onchange=async()=>{const key=c.dataset.routeLayerPref==='restricted'?'restrictedLayerIds':'preferredLayerIds';updateListFromChecks(m.settings.routeDefaults[key],c.checked,c.value);await saveMapAndRefresh(e)});

    $$('[data-draw-tool]').forEach(btn=>btn.onclick=()=>{
      if(!m.image?.src){alert('Carga primero una imagen base.');return}
      const mode=btn.dataset.drawTool;
      const drawMode=mode==='point'?'draw-point':mode==='zone'?'draw-zone':'draw-route';
      placeMapTool={mode:drawMode,mapId:m.id,nodes:[]};
      refreshPlaceTab(e);
    });
    $('[data-finish-map-tool]')?.addEventListener('click',()=>finishMapTool(e,m));
    $('[data-cancel-map-tool]')?.addEventListener('click',()=>{placeMapTool=null;refreshPlaceTab(e)});

    $$('[data-select-map-element]').forEach(btn=>btn.onclick=()=>{
      selectedPlaceMapElementId=btn.dataset.selectMapElement;
      currentMapView(m).panelTab="selected";
      placeMapTool=null;
      refreshPlaceTab(e);
    });
    $$('[data-delete-map-element]').forEach(btn=>btn.onclick=async()=>{const idx=m.elements.findIndex(x=>x.id===btn.dataset.deleteMapElement);if(idx<0)return;const removed=m.elements[idx];m.elements.splice(idx,1);cleanupMapReferences(m,removed);if(selectedPlaceMapElementId===btn.dataset.deleteMapElement)selectedPlaceMapElementId="";await saveMapAndRefresh(e)});
    $$('[data-element-visible]').forEach(c=>c.onchange=async()=>{const el=placeMapElement(m,c.dataset.elementVisible);if(el){el.visible=c.checked;await saveMapAndRefresh(e)}});

    $$('[data-route-waypoint]').forEach(c=>c.onchange=async()=>{const r=placeMapElement(m,c.dataset.routeWaypoint);if(!r)return;r.waypointPointIds||=[];updateListFromChecks(r.waypointPointIds,c.checked,c.value);await saveMapAndRefresh(e)});
    $$('[data-point-distance-target]').forEach(sel=>sel.onchange=()=>{const a=placeMapElement(m,sel.dataset.pointDistanceTarget),b=placeMapElement(m,sel.value),out=sel.parentElement.querySelector('[data-point-distance-result]');if(!a||!b||!out){if(out)out.textContent='—';return}out.textContent=formatDistance(segmentMeters(m,{x:a.x,y:a.y},{x:b.x,y:b.y}),m)});

    $$('[data-append-node]').forEach(btn=>btn.onclick=()=>{placeMapTool={mode:'append-nodes',mapId:m.id,targetId:btn.dataset.appendNode,nodes:[]};refreshPlaceTab(e)});
    $$('[data-remove-node]').forEach(btn=>btn.onclick=async()=>{const el=placeMapElement(m,btn.dataset.nodeOwner),idx=Number(btn.dataset.removeNode);if(!el)return;el.nodes.splice(idx,1);await saveMapAndRefresh(e)});
    $$('[data-draw-zone-part]').forEach(btn=>btn.onclick=()=>{placeMapTool={mode:'zone-part',mapId:m.id,targetId:btn.dataset.drawZonePart,nodes:[]};refreshPlaceTab(e)});
    $$('[data-draw-zone-hole]').forEach(btn=>btn.onclick=()=>{placeMapTool={mode:'zone-hole',mapId:m.id,targetId:btn.dataset.drawZoneHole,nodes:[]};refreshPlaceTab(e)});

    $$('[data-add-route-segment]').forEach(btn=>btn.onclick=async()=>{const r=placeMapElement(m,btn.dataset.addRouteSegment);if(!r)return;r.segments.push({fromIndex:0,toIndex:Math.max(1,r.nodes.length-1),transport:'',speed:'',speedMin:'',speedMax:'',speedApprox:false,terrain:'',slope:'',pauses:'',condition:'',factor:1,durationManual:''});await saveMapAndRefresh(e)});
    $$('[data-remove-route-segment]').forEach(btn=>btn.onclick=async()=>{const r=placeMapElement(m,btn.dataset.routeOwner);if(!r)return;r.segments.splice(Number(btn.dataset.removeRouteSegment),1);await saveMapAndRefresh(e)});
    $$('[data-accept-route]').forEach(btn=>btn.onclick=async()=>{const r=placeMapElement(m,btn.dataset.acceptRoute);if(!r)return;r.proposal=false;if(r.name==='Ruta propuesta')r.name='Ruta';await saveMapAndRefresh(e)});
    $$('[data-regenerate-route-section]').forEach(btn=>btn.onclick=async()=>{const r=placeMapElement(m,btn.dataset.regenerateRouteSection);if(!r)return;const wrap=btn.closest('.route-regenerate'),inputs=wrap.querySelectorAll('[data-map-path^="__regen"]');const from=Math.max(0,Number(inputs[0]?.value)||0),to=Math.min(r.nodes.length-1,Number(inputs[1]?.value)||r.nodes.length-1);if(to<=from)return;let repl=densifyPolyline([r.nodes[from],r.nodes[to]],Math.max(2,Number(m.settings.routeDefaults.pointDensity)||2));repl=smoothPolyline(repl,Number(m.settings.routeDefaults.smoothness)||0);r.nodes.splice(from,to-from+1,...repl);await saveMapAndRefresh(e)});


    $$('[data-generator-field]').forEach(input=>input.onchange=async()=>{
      const key=input.dataset.generatorField;
      m.generator[key]=input.value;
      if(key==="originPointId"&&m.generator.destinationPointId===input.value)m.generator.destinationPointId="";
      if(key==="destinationPointId"&&m.generator.originPointId===input.value)m.generator.originPointId="";
      m.generator.waypointIds=(m.generator.waypointIds||[]).filter(id=>id!==m.generator.originPointId&&id!==m.generator.destinationPointId);
      await saveEntityDirect(e);
      refreshPlaceTab(e);
    });
    $$('[data-generator-list]').forEach(c=>c.onchange=async()=>{const arr=m.generator[c.dataset.generatorList];updateListFromChecks(arr,c.checked,c.value);await saveEntityDirect(e)});
    $('[data-generate-route]')?.addEventListener('click',()=>generateRouteProposal(e,m));

  }

  function wirePlaceMedia(e){
    $$('[data-place-add-media]').forEach(btn=>btn.onclick=()=>addPlaceMediaAtPath(e,btn.dataset.placeAddMedia,btn.dataset.mediaTextPath||""));
    $$('[data-media-remove]').forEach(btn=>btn.onclick=async()=>{const block=btn.closest('[data-media-block]'),arr=getPath(e,block.dataset.mediaPath)||[];arr.splice(Number(block.dataset.mediaIndex),1);await saveEntityDirect(e);refreshPlaceTab(e)});
    $$('.media-size').forEach(range=>{
      range.oninput=()=>{const block=range.closest('[data-media-block]');block.style.setProperty('--media-size',`${Number(range.value)||0}%`)};
      range.onchange=async()=>{const block=range.closest('[data-media-block]'),item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;item.size=Number(range.value)||Number(item.size)||34;await saveEntityDirect(e);refreshPlaceTab(e)};
    });
    $$('[data-media-shift]').forEach(btn=>btn.onclick=async()=>{const block=btn.closest('[data-media-block]'),item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;if(!unifiedShiftOneLine(block,item,Number(btn.dataset.mediaShift)||0))return;await saveEntityDirect(e);refreshPlaceTab(e)});
    wireMediaDragging(e,refreshPlaceTab);
  }

  function wirePlaceTab(e){
    wireEntityLinks();wireDirectEditors(e);wireRichParagraphEditors(e);wirePlaceMedia(e);
    $$('[data-add-media]').forEach(btn=>btn.onclick=()=>addPlaceMediaAtPath(e,btn.dataset.addMedia,btn.dataset.mediaTextPath||""));
    $('[data-add-place-map]')?.addEventListener('click',async()=>{
      const title=prompt('Nombre del mapa:','Nuevo mapa');if(title===null)return;
      const nm=newPlaceMap(title||'Nuevo mapa');placeData(e).maps.push(nm);activePlaceMapId=nm.id;selectedPlaceMapElementId="";await saveMapAndRefresh(e);
    });
    $('[data-place-add-history]')?.addEventListener('click',async()=>{placeData(e).history.push({title:'Nuevo apartado',body:'',media:[]});await saveEntityDirect(e);refreshPlaceTab(e)});
    $$('[data-place-remove-history]').forEach(btn=>btn.onclick=async()=>{placeData(e).history.splice(Number(btn.dataset.placeRemoveHistory),1);await saveEntityDirect(e);refreshPlaceTab(e)});
    $('[data-place-add-gallery]')?.addEventListener('click',async()=>{const items=await chooseMediaMany();if(!items.length)return;placeData(e).gallery.push(...items);await saveEntityDirect(e);refreshPlaceTab(e)});
    $$('[data-place-remove-gallery]').forEach(btn=>btn.onclick=async()=>{placeData(e).gallery.splice(Number(btn.dataset.placeRemoveGallery),1);await saveEntityDirect(e);refreshPlaceTab(e)});
    $$('[data-place-select-path]').forEach(sel=>sel.onchange=async()=>{setPath(e,sel.dataset.placeSelectPath,sel.value);await saveEntityDirect(e)});
    $('[data-place-parent-enabled]')?.addEventListener('change',async ev=>{
      const p=placeData(e);
      const select=$('[data-place-parent-select]');
      if(ev.currentTarget.checked){
        select?.removeAttribute('disabled');
        if(select?.value)p.parentPlaceId=select.value;
      }else{
        p.parentPlaceId="";
        if(select){select.value="";select.setAttribute('disabled',"")}
      }
      await saveEntityDirect(e);
      refreshPlaceTab(e);
    });
    $('[data-place-parent-select]')?.addEventListener('change',async ev=>{
      placeData(e).parentPlaceId=ev.currentTarget.value||"";
      await saveEntityDirect(e);
      refreshPlaceTab(e);
    });
    const active=$('.character-tab.active')?.dataset.placeTab;if(active==='maps'){const m=activePlaceMap(e);if(m)wirePlaceMap(e,m)}
    applyMediaRules();
    // A6.6.9: no reparación automática posterior; la colocación solo cambia por acción del usuario.
  }

  function showPlaceEntity(e,tab="description"){
    currentView={type:"entity",id:e.id};setActive("");placeData(e);
    const valid=PLACE_TABS.map(x=>x[0]);let active=valid.includes(tab)?tab:"description";
    if(active==='maps'){const m=activePlaceMap(e);if(m)activePlaceMapId=m.id}
    $("#view").innerHTML=`<div class="character-page place-page">
      <div class="page-head">${backButton()}<h1 class="page-title">Lugares</h1></div>
      <header class="character-titlebar"><div class="character-title-copy"><h1>${renderEditableName(e.title,"title",e,{cls:"main-entity-name"})}</h1>${e.subtitle?`<div class="character-subtitle">${esc(e.subtitle)}</div>`:""}</div>${editModeToggleMarkup()}</header>
      <main class="character-article place-article-full">
        <nav class="character-tabs" aria-label="Secciones del lugar">${PLACE_TABS.map(([id,label,iconName])=>`<button class="character-tab ${id===active?"active":""}" data-place-tab="${id}"><span>${icon(iconName)}</span>${esc(label)}</button>`).join("")}</nav>
        <section id="characterTabPanel" class="character-tab-panel">${renderPlaceTab(e,active)}</section>
      </main>${renderTechnical(e)}</div>`;
    $("#pageBack").onclick=()=>showCategory("lugares");
    wireEditModeToggles();
    $('[data-change-cover="place"]')?.addEventListener('click',()=>choosePortrait(e,()=>showPlaceEntity(e,active)));
    $('[data-remove-cover="place"]')?.addEventListener('click',async()=>{e.image="";await saveEntityDirect(e);showPlaceEntity(e,active)});
    $$('[data-place-tab]').forEach(btn=>btn.onclick=()=>{active=btn.dataset.placeTab;activeMapInfoElementId='';$$('.character-tab').forEach(b=>b.classList.toggle('active',b===btn));$('#characterTabPanel').innerHTML=renderPlaceTab(e,active);wirePlaceTab(e)});
    $("#copyMasterTag").onclick=()=>copyText(e.masterTag||e.id);$("#copyInternalLink").onclick=()=>copyText(`[[${e.masterTag||e.id}|${e.title}]]`);
    wirePlaceTab(e);history.replaceState(null,"",`#entity=${encodeURIComponent(e.id)}`);
  }

  function showEntity(id,tab="overview"){
    const e=entities.find(x=>x.id===id);
    if(!e) return;

    if(e.category==="personajes"){
      showCharacterEntity(e,tab==="overview" ? "profile" : tab);
      return;
    }

    if(e.category==="lugares"){
      showPlaceEntity(e,tab==="overview" ? "description" : tab);
      return;
    }

    currentView={type:"entity",id};
    setActive("");
    activeEntityTab=tab;

    const blueprint=blueprintFor(e);
    const tabs=blueprint.tabs;
    if(!tabs.includes(activeEntityTab)) activeEntityTab=tabs[0]||"overview";

    const image=getImage(e);
    const facts=factsFor(e).slice(0,4);

    $("#view").innerHTML=`
      <div class="entity-page">
        <div class="page-head">
          ${backButton()}
          <h1 class="page-title">${esc(categoryName(e.category))}</h1>
          <span class="page-head-spacer"></span>
          ${editModeToggleMarkup()}
        </div>

        <section class="entity-identity">
          <div class="identity-main">
            <div class="entity-kind">${esc(categoryName(e.category))}</div>
            <h1 class="entity-title">${esc(e.title)}</h1>
            ${e.subtitle ? `<div class="entity-subtitle">${esc(e.subtitle)}</div>` : ""}
            <div class="entity-summary">${e.summary ? linkifyText(e.summary,e.id) : "Sin resumen todavía."}</div>
            ${facts.length ? `<div class="quick-facts">${facts.map(f=>`
              <div class="fact-chip"><small>${esc(f.label)}</small><strong>${esc(f.value)}</strong></div>
            `).join("")}</div>` : ""}
          </div>
          ${image
            ? `<img class="entity-cover" src="${esc(image)}" alt="">`
            : `<div class="entity-cover-placeholder">${icon(e.category)}</div>`}
        </section>

        <div class="entity-tabs-shell">
          <nav class="entity-tabs" aria-label="Secciones de la ficha">
            ${tabs.map(t=>`
              <button class="entity-tab ${t===activeEntityTab?"active":""}" data-entity-tab="${t}">
                <span class="tab-icon">${icon(TAB_ICONS[t]||"info")}</span>
                <span>${esc(blueprint.labels?.[t] || TAB_LABELS[t] || t)}</span>
              </button>
            `).join("")}
          </nav>
        </div>

        <section id="entityTabPanel" class="entity-tab-panel">
          ${renderTab(e,activeEntityTab)}
        </section>

        ${renderTechnical(e)}
      </div>
    `;

    $("#pageBack").onclick=()=>showCategory(e.category);
    wireEditModeToggles();
    $$("[data-entity-tab]").forEach(btn=>{
      btn.onclick=()=>{
        activeEntityTab=btn.dataset.entityTab;
        $$(".entity-tab").forEach(b=>b.classList.toggle("active",b===btn));
        $("#entityTabPanel").innerHTML=renderTab(e,activeEntityTab);
        wireEntityLinks();
      };
    });

    $("#copyMasterTag").onclick=()=>copyText(e.masterTag||e.id);
    $("#copyInternalLink").onclick=()=>copyText(`[[${e.masterTag||e.id}|${e.title}]]`);
    wireEntityLinks();
    history.replaceState(null,"",`#entity=${encodeURIComponent(id)}`);
  }

  // ---------------------------
  // Herramientas existentes
  // ---------------------------

  function mediaKindFromSrc(src,declared=""){
    if(declared)return declared;
    return String(src||"").startsWith("data:video/")?"video":"image";
  }

  function collectLoadedFiles(){
    const refs=[];
    const push=(e,{path,parentPath="",key=null,value=null,name="",kind="",caption="",broken=false})=>{
      const src=typeof value==="string"?value:(value?.src||"");
      refs.push({entityId:e.id,entityTitle:e.title||e.id,category:e.category,path,parentPath,key,src,name:name||(value?.name||"Archivo"),kind:mediaKindFromSrc(src,kind||value?.kind||""),caption:caption||value?.caption||"",broken:broken||!src});
    };
    const walk=(e,value,path,parent,parentPath,key)=>{
      if(!value || typeof value!=="object")return;
      if(Array.isArray(value)){
        value.forEach((v,i)=>walk(e,v,`${path}.${i}`,value,path,i));return;
      }
      const looksMedia=("src" in value)&&(("kind" in value)||("name" in value)||("width" in value)||("height" in value)||/media|gallery|\.image$/i.test(path));
      const brokenMedia=((String(value.id||"").startsWith("media-")||/media|gallery/i.test(path)) && ("kind" in value) && !("src" in value));
      if(looksMedia||brokenMedia){
        push(e,{path,parentPath,key,value,name:value.name||(/\.image$/i.test(path)?"Imagen base del mapa":"Archivo"),broken:brokenMedia||!value.src});
        return;
      }
      for(const [k,v] of Object.entries(value)) walk(e,v,path?`${path}.${k}`:k,value,path,k);
    };
    for(const e of entities){
      const coverKeys=["image","imageUrl","thumbnail","cover"];
      for(const k of coverKeys){if(typeof e[k]==="string"&&e[k]){push(e,{path:k,parentPath:"",key:k,value:e[k],name:"Imagen principal"});break}}
      for(const [k,v] of Object.entries(e)){
        if(coverKeys.includes(k))continue;
        walk(e,v,k,e,"",k);
      }
    }
    return refs;
  }

  async function removeManagedFile(ref){
    const e=entities.find(x=>x.id===ref.entityId);if(!e)return;
    if(ref.parentPath){
      const parent=getPath(e,ref.parentPath);
      if(Array.isArray(parent) && Number.isInteger(Number(ref.key))) parent.splice(Number(ref.key),1);
      else if(parent && typeof parent==="object") parent[ref.key]=null;
    }else if(ref.path){
      setPath(e,ref.path,"");
    }
    await saveEntityDirect(e);
  }

  function showAssets(){
    if(!editMode){showHome();return}
    currentView={type:"assets"};setActive("assets");
    assetManagerRefs=collectLoadedFiles();
    $("#view").innerHTML=`<div class="tool-page asset-manager-page">
      <div class="page-head">${backButton()}<h1 class="page-title">Archivos cargados</h1></div>
      <div class="asset-manager-summary">${assetManagerRefs.length} archivo${assetManagerRefs.length===1?"":"s"} encontrado${assetManagerRefs.length===1?"":"s"}. Aquí puedes localizar multimedia que haya quedado en una sección inesperada y quitarla.</div>
      ${assetManagerRefs.length?`<div class="asset-manager-grid">${assetManagerRefs.map((r,i)=>`<article class="asset-manager-card ${r.broken?"broken":""}">
        <div class="asset-manager-preview">${r.broken?`<div class="asset-broken">Archivo sin datos</div>`:(r.kind==="video"?`<video src="${esc(r.src)}" controls preload="metadata"></video>`:`<img src="${esc(r.src)}" alt="">`)}</div>
        <div class="asset-manager-copy">
          <strong>${esc(r.name||"Archivo")}</strong>
          <span>${esc(r.entityTitle)} · ${esc(categoryName(r.category))}</span>
          <small>${esc(r.path)}</small>
          ${r.caption?`<p>${esc(r.caption)}</p>`:""}
        </div>
        <div class="asset-manager-actions">
          <button data-asset-open="${i}">Abrir</button>
          <button class="danger" data-asset-remove="${i}">Quitar</button>
        </div>
      </article>`).join("")}</div>`:`<div class="empty">No hay archivos multimedia cargados.</div>`}
    </div>`;
    $("#pageBack").onclick=showHome;
    $$('[data-asset-open]').forEach(btn=>btn.onclick=()=>{const r=assetManagerRefs[Number(btn.dataset.assetOpen)];if(r)showEntity(r.entityId)});
    $$('[data-asset-remove]').forEach(btn=>btn.onclick=async()=>{const r=assetManagerRefs[Number(btn.dataset.assetRemove)];if(!r)return;if(!confirm(`Quitar ${r.name||"este archivo"} de ${r.entityTitle}?`))return;await removeManagedFile(r);showAssets()});
  }

  function showRegistry(){
    currentView={type:"registry"};
    setActive("registry");
    const rows=entities.slice().sort((a,b)=>a.title.localeCompare(b.title,"es"));

    $("#view").innerHTML=`
      <div class="tool-page">
        <div class="page-head">${backButton()}<h1 class="page-title">Registro maestro</h1></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Categoría</th><th>Etiqueta maestra</th><th>Alias</th><th>Copiar</th></tr></thead>
            <tbody>${rows.map(e=>`<tr>
              <td><button class="text-button" data-open="${e.id}">${esc(e.title)}</button></td>
              <td>${esc(categoryName(e.category))}</td>
              <td><span class="badge">${esc(e.masterTag||"—")}</span></td>
              <td>${esc(toArray(e.aliases).join(", ")||"—")}</td>
              <td><div class="copy-row">
                <button class="mini-button" data-copy="${esc(e.masterTag||e.id)}">Etiqueta</button>
                <button class="mini-button" data-copy="[[${esc(e.masterTag||e.id)}|${esc(e.title)}]]">Referencia</button>
              </div></td>
            </tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    `;

    $("#pageBack").onclick=showHome;
    $$("[data-open]").forEach(b=>b.onclick=()=>showEntity(b.dataset.open));
    $$("[data-copy]").forEach(b=>b.onclick=()=>copyText(b.dataset.copy));
  }

  function termsForEntity(e){
    const out=[];
    if(e.masterTag) out.push({term:e.masterTag,priority:1,source:"Etiqueta maestra"});
    if(e.title) out.push({term:e.title,priority:2,source:"Título"});
    for(const a of toArray(e.aliases)) out.push({term:a,priority:3,source:"Alias"});
    for(const t of toArray(e.tags)) if(String(t).length>=4) out.push({term:t,priority:4,source:"Etiqueta"});
    return out;
  }

  function detectText(text){
    const lower=text.toLocaleLowerCase("es"), map=new Map(), matches=[];
    for(const e of entities){
      for(const info of termsForEntity(e)){
        const term=String(info.term).trim();
        if(!term) continue;
        let start=0, t=term.toLocaleLowerCase("es");
        while((start=lower.indexOf(t,start))!==-1){
          const key=`${start}:${start+term.length}`;
          if(!map.has(key)) map.set(key,[]);
          map.get(key).push({entity:e,...info,start,end:start+term.length});
          start+=Math.max(1,term.length);
        }
      }
    }
    for(const [key,candidates] of map){
      const [start,end]=key.split(":").map(Number);
      candidates.sort((a,b)=>a.priority-b.priority);
      matches.push({start,end,text:text.slice(start,end),candidates});
    }
    matches.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
    const filtered=[];
    for(const m of matches){
      if(!filtered.some(x=>!(m.end<=x.start || m.start>=x.end))) filtered.push(m);
    }
    return filtered.sort((a,b)=>a.start-b.start);
  }

  function showLinker(){
    currentView={type:"linker"};
    setActive("linker");

    $("#view").innerHTML=`
      <div class="tool-page">
        <div class="page-head">${backButton()}<h1 class="page-title">Hipervinculador</h1></div>
        <div class="two-col">
          <section class="panel">
            <h2>Texto</h2>
            <textarea id="linkerText" class="big">Esteban llegó a Bagdad acompañado de Eulalia. Después se habló de la Batalla de Bagdad.</textarea>
            <div class="copy-row" style="margin-top:8px">
              <button id="detectBtn" class="mini-button">Detectar</button>
              <button id="clearBtn" class="mini-button">Limpiar</button>
            </div>
          </section>
          <section class="panel">
            <h2>Coincidencias</h2>
            <div id="detectedList" class="detected-list"><div class="empty">Pulsa Detectar.</div></div>
          </section>
        </div>
        <section class="panel" style="margin-top:11px">
          <h2>Vista previa</h2>
          <div id="linkedPreview" class="preview">Todavía no se ha procesado el texto.</div>
        </section>
      </div>
    `;

    $("#pageBack").onclick=showHome;
    $("#detectBtn").onclick=runDetection;
    $("#clearBtn").onclick=()=>{
      $("#linkerText").value="";
      $("#detectedList").innerHTML='<div class="empty">Sin texto.</div>';
      $("#linkedPreview").textContent="";
    };
  }

  function runDetection(){
    const text=$("#linkerText").value;
    linkerState=detectText(text).map((m,i)=>({...m,index:i,selected:0,enabled:true}));
    const list=$("#detectedList");

    if(!linkerState.length){
      list.innerHTML='<div class="empty">Sin coincidencias.</div>';
      renderLinkedPreview(text);
      return;
    }

    list.innerHTML=linkerState.map((m,i)=>{
      const unique=[],seen=new Set();
      for(const c of m.candidates){
        if(!seen.has(c.entity.id)){seen.add(c.entity.id);unique.push(c)}
      }
      m.candidates=unique;

      return `<div class="detected-item ${unique.length>1?"ambiguous":""}">
        <div class="row">
          <strong>${esc(m.text)}</strong>
          <label><input type="checkbox" data-enable="${i}" checked> Vincular</label>
        </div>
        ${unique.length>1
          ? `<select data-select="${i}">${unique.map((c,n)=>`<option value="${n}">${esc(c.entity.title)} — ${esc(categoryName(c.entity.category))}</option>`).join("")}</select>`
          : `<div style="font-size:9px;color:#9e8464;margin-top:5px">${esc(unique[0].entity.title)}</div>`}
      </div>`;
    }).join("");

    $$("[data-enable]").forEach(el=>el.onchange=()=>{
      linkerState[+el.dataset.enable].enabled=el.checked;renderLinkedPreview(text)
    });
    $$("[data-select]").forEach(el=>el.onchange=()=>{
      linkerState[+el.dataset.select].selected=+el.value;renderLinkedPreview(text)
    });
    renderLinkedPreview(text);
  }

  function renderLinkedPreview(text){
    if(!linkerState.length){$("#linkedPreview").textContent=text;return}
    let out="",pos=0;
    for(const m of linkerState){
      out+=esc(text.slice(pos,m.start));
      if(m.enabled&&m.candidates.length){
        const c=m.candidates[m.selected]||m.candidates[0];
        out+=`<a href="#entity=${encodeURIComponent(c.entity.id)}" data-entity-link="${c.entity.id}">${esc(text.slice(m.start,m.end))}</a>`;
      }else out+=esc(text.slice(m.start,m.end));
      pos=m.end;
    }
    out+=esc(text.slice(pos));
    $("#linkedPreview").innerHTML=out;
    wireEntityLinks();
  }

  async function copyText(text){
    await navigator.clipboard.writeText(text);
    toast("Copiado");
  }

  async function exportBackup(){
    const payload={
      format:"sethoria-atlas-plantilla0",
      version:9,
      exportedAt:new Date().toISOString(),
      entities
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`sethoria-atlas-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast("Respaldo exportado");
  }

  async function importBackup(file){
    const payload=JSON.parse(await file.text());
    if(!payload||!Array.isArray(payload.entities)) throw new Error("Archivo no válido");
    await clearEntities();
    for(const e of payload.entities) await putEntity(e);
    entities=await getAll();
    toast("Respaldo importado");
    showHome();
  }

  async function init(){
    console.info("Sethoria Atlas", APP_BUILD);
    buildNav();
    hydrateStaticIcons();
    syncEditModeUI();
    $("#app").classList.add("sidebar-collapsed");
    wireUndoKeys();
    wireMapDrawHotkeys();
    window.addEventListener("resize",()=>{
      if(currentView.type==="entity" && document.querySelector(".character-page")) applyMediaRules();
    });

    await openDB();
    entities=await ensureSeed();

    $("#brandHome").onclick=showHome;
    $("#registryBtn").onclick=showRegistry;
    $("#linkerBtn").onclick=showLinker;
    $("#assetsBtn").onclick=showAssets;
    $("#exportBtn").onclick=exportBackup;

    $("#importInput").onchange=async e=>{
      const file=e.target.files?.[0];
      if(!file) return;
      try{await importBackup(file)}
      catch(err){alert("No pude importar el respaldo: "+err.message)}
      e.target.value="";
    };

    const hash=location.hash;
    if(hash.startsWith("#entity=")) showEntity(decodeURIComponent(hash.slice(8)));
    else showHome();
  }

  init().catch(err=>{
    console.error(err);
    $("#view").innerHTML=`<div class="empty">Error al iniciar: ${esc(err.message)}</div>`;
  });
})();
