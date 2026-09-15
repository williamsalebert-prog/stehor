(() => {
  const DB_NAME = "sethoria-atlas-prototipo-a";
  const APP_BUILD = "A6.6.2-edicion-media-cache";
  let editMode = localStorage.getItem("sethoria-edit-mode")==="1";

  function syncEditModeUI(){
    document.body.classList.toggle("edit-mode",editMode);
    const btn=document.getElementById("editModeBtn");
    if(btn){btn.textContent=editMode?"Listo":"Editar";btn.setAttribute("aria-pressed",editMode?"true":"false");btn.title=editMode?"Volver a modo normal":"Editar esta wiki"}
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
  }

  function toggleEditMode(){
    editMode=!editMode;
    localStorage.setItem("sethoria-edit-mode",editMode?"1":"0");
    syncEditModeUI();
    rerenderCurrentView();
  }
  const STORE = "entities";

  let db;
  let entities = [];
  let currentView = {type:"home"};
  let activeEntityTab = "overview";
  let linkerState = [];

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
        ${editMode?`<button class="category-add edit-only" data-add-entity>＋ Agregar</button>`:""}
      </div>
      ${list.length ? `<div class="cards-grid">${list.map(e=>`<div class="item-card-wrap">${itemCard(e)}${editMode?`<button class="entity-remove edit-only" data-remove-entity="${e.id}" title="Quitar">×</button>`:""}</div>`).join("")}</div>` : `<div class="empty">Sin elementos todavía.</div>`}
    `;

    $("#pageBack").onclick=showHome;
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

  async function saveEntityDirect(e){
    await putEntity(e);
    const idx=entities.findIndex(x=>x.id===e.id);
    if(idx>=0) entities[idx]=e;
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

  async function chooseMedia(){
    const file=await new Promise(resolve=>{
      const input=document.createElement("input");
      input.type="file";
      input.accept="image/*,video/mp4,video/webm,video/ogg,.gif,.mov,.m4v";
      input.onchange=()=>resolve(input.files?.[0]||null);
      input.click();
    });
    if(!file) return null;
    const kind=mediaKind(file);
    if(!kind){alert("Ese archivo no es una imagen, GIF o video compatible.");return null}
    const src=await readFileDataURL(file);
    const dims=await readMediaDimensions(src,kind);
    return {
      id:`media-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      kind,src,name:file.name,width:dims.width,height:dims.height,
      position:"center",size:kind==="video"?48:34,anchor:0,caption:""
    };
  }

  function mediaRange(item,position){
    const w=Number(item.width)||1,h=Number(item.height)||1,aspect=w/h;
    if(position==="center"){
      if(aspect<.65) return [12,42];
      if(aspect<.85) return [12,50];
      if(aspect<=1.25) return [14,64];
      if(aspect<=2.2) return [18,78];
      return [22,90];
    }
    if(aspect>2.6) return null;
    if(aspect<.65) return [10,30];
    if(aspect<.85) return [10,35];
    if(aspect<=1.25) return [12,42];
    return [14,46];
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
    const pos=item.position||"center";
    const size=Number(item.size)||34;
    const limits=mediaRange(item,pos)||[12,70];
    const min=Math.round(limits[0]),max=Math.round(limits[1]);
    const ratio=(Number(item.width)>0&&Number(item.height)>0)?`${Number(item.width)}/${Number(item.height)}`:"auto";
    return `<figure class="embedded-media media-${esc(pos)} effective-${esc(pos)}" data-media-block data-media-path="${esc(path)}" data-media-index="${i}" data-position="${esc(pos)}" data-width="${Number(item.width)||0}" data-height="${Number(item.height)||0}" style="--media-size:${size}%">
      <div class="embedded-media-frame" style="aspect-ratio:${ratio}">${renderMediaElement(item)}</div>
      ${editMode?`<div class="media-controls edit-only">
        <button class="media-shift" data-media-shift="-1" title="Mover antes">↑</button>
        <button class="media-shift" data-media-shift="1" title="Mover después">↓</button>
        <button class="media-pos ${pos==="left"?"active":""}" data-media-position="left" title="Izquierda">←</button>
        <button class="media-pos ${pos==="center"?"active":""}" data-media-position="center" title="Centro">•</button>
        <button class="media-pos ${pos==="right"?"active":""}" data-media-position="right" title="Derecha">→</button>
        <input class="media-size" type="range" min="${min}" max="${max}" value="${Math.max(min,Math.min(size,max))}" aria-label="Tamaño">
        <button class="media-remove" data-media-remove title="Quitar">×</button>
      </div>`:""}
      ${renderEditable(item.caption||"",`${path}.${i}.caption`,e,{cls:"media-caption",placeholder:editMode?"Pie opcional":""})}
    </figure>`;
  }

  function renderRichFlow(value,path,media,mediaPath,e){
    const paragraphs=splitRichParagraphs(value);
    const items=toArray(media);
    const buckets=new Map();
    items.forEach((item,i)=>{
      let anchor=Number.isFinite(Number(item.anchor))?Number(item.anchor):0;
      anchor=Math.max(0,Math.min(anchor,Math.max(0,paragraphs.length-1)));
      item.anchor=anchor;
      if(!buckets.has(anchor))buckets.set(anchor,[]);
      buckets.get(anchor).push([item,i]);
    });
    let html='<div class="rich-content-flow" data-rich-flow data-rich-path="'+esc(path)+'">';
    paragraphs.forEach((p,pi)=>{
      if(editMode){
        html+=`<p class="rich-paragraph character-prose" contenteditable="true" spellcheck="true" data-rich-paragraph="${pi}" data-rich-path="${esc(path)}">${esc(p||"")}</p>`;
      }else{
        html+=`<p class="rich-paragraph character-prose">${linkifyText(p||"",e.id)}</p>`;
      }
      const group=buckets.get(pi)||[];
      if(group.length){
        html+=`<div class="media-anchor-group" data-anchor="${pi}">${group.map(([item,i])=>renderSingleEmbeddedMedia(item,mediaPath,i,e)).join("")}</div>`;
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

  async function addMediaAtPath(e,path,textPath=""){
    const item=await chooseMedia();if(!item) return;
    let arr=getPath(e,path);if(!Array.isArray(arr)){arr=[];setPath(e,path,arr)}
    const paragraphs=splitRichParagraphs(textPath?getPath(e,textPath):"");
    item.anchor=Math.max(0,paragraphs.length-1);
    arr.push(item);await saveEntityDirect(e);refreshCharacterTab(e);
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
      if(!range||!parent)return;
      const idx=Number(block.dataset.mediaIndex),path=block.dataset.mediaPath;
      const e=entities.find(x=>x.id===currentView.id);if(!e)return;
      const item=getPath(e,`${path}.${idx}`);if(!item)return;
      const width=parent.clientWidth||700;
      let effective=item.position||"center";
      let limits=mediaRange(item,effective);
      if(effective!=="center" && (width<620 || !limits)) effective="center";
      limits=mediaRange(item,effective)||[12,70];
      if(effective!=="center"){
        const minText=Math.max(220,width*.30);
        const sideMax=Math.max(0,((width-minText-18)/width)*100);
        limits[1]=Math.min(limits[1],sideMax);
        if(limits[1]<limits[0]){effective="center";limits=mediaRange(item,"center")||[12,70]}
      }
      if(item.width){
        const intrinsicMax=(item.width/width)*100;
        limits[1]=Math.min(limits[1],Math.max(limits[0],intrinsicMax));
      }
      if(item.width&&item.height){
        const aspect=item.width/item.height;
        const heightMax=(window.innerHeight*.72*aspect/width)*100;
        limits[1]=Math.min(limits[1],Math.max(limits[0],heightMax));
      }
      const val=Math.max(limits[0],Math.min(Number(item.size)||34,limits[1]));
      range.min=Math.floor(limits[0]);range.max=Math.max(Math.ceil(limits[0]),Math.ceil(limits[1]));range.value=Math.round(val);
      block.style.setProperty("--media-size",`${val}%`);
      block.classList.remove("effective-left","effective-center","effective-right");
      block.classList.add(`effective-${effective}`);
    });
  }

  function resolveEntityInput(input,currentId){
    const q=String(input||"").trim().toLocaleLowerCase("es");if(!q)return null;
    const matches=entities.filter(x=>x.id!==currentId && [x.title,x.masterTag,...toArray(x.aliases)].some(v=>String(v||"").toLocaleLowerCase("es")===q));
    if(matches.length<=1) return matches[0]||null;
    const answer=prompt(`Coincidencias:\n${matches.map((x,i)=>`${i+1}. ${x.title} [${categoryName(x.category)}]`).join("\n")}\n\nNúmero:`);
    const n=Number(answer);return matches[n-1]||null;
  }

  function wireRichParagraphEditors(e){
    if(!editMode)return;
    $$('[data-rich-paragraph]').forEach(el=>{
      el.onblur=async()=>{
        const flow=el.closest('[data-rich-flow]');if(!flow)return;
        const path=flow.dataset.richPath;
        const parts=[...flow.querySelectorAll('[data-rich-paragraph]')].map(p=>p.innerText.replace(/\u00a0/g,' ').trim()).filter((x,i,a)=>x||a.length===1);
        setPath(e,path,parts.join('\n\n'));
        await saveEntityDirect(e);
      };
    });
  }

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
    $$('[data-media-position]').forEach(btn=>btn.onclick=async()=>{
      const block=btn.closest('[data-media-block]');
      const item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;
      item.position=btn.dataset.mediaPosition;await saveEntityDirect(e);refreshCharacterTab(e);
    });
    $$('[data-media-shift]').forEach(btn=>btn.onclick=async()=>{
      const block=btn.closest('[data-media-block]');const item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;
      const flow=block.closest('[data-rich-flow]');const max=Math.max(0,(flow?.querySelectorAll('[data-rich-paragraph]').length||1)-1);
      item.anchor=Math.max(0,Math.min(max,(Number(item.anchor)||0)+Number(btn.dataset.mediaShift)));
      await saveEntityDirect(e);refreshCharacterTab(e);
    });
    $$('[data-media-remove]').forEach(btn=>btn.onclick=async()=>{
      const block=btn.closest('[data-media-block]');const arr=getPath(e,block.dataset.mediaPath)||[];
      arr.splice(Number(block.dataset.mediaIndex),1);await saveEntityDirect(e);refreshCharacterTab(e);
    });
    $$('.media-size').forEach(range=>{
      range.oninput=()=>{const block=range.closest('[data-media-block]');block.style.setProperty('--media-size',`${range.value}%`)};
      range.onchange=async()=>{const block=range.closest('[data-media-block]');const item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;item.size=Number(range.value);await saveEntityDirect(e);applyMediaRules()};
    });

    $('[data-add-history]')?.addEventListener('click',async()=>{normalizeInfo(e).history.push({title:'Nuevo apartado',body:'',media:[]});await saveEntityDirect(e);refreshCharacterTab(e)});
    $$('[data-remove-history]').forEach(btn=>btn.onclick=async()=>{normalizeInfo(e).history.splice(Number(btn.dataset.removeHistory),1);await saveEntityDirect(e);refreshCharacterTab(e)});

    $$('[data-add-bond]').forEach(btn=>btn.onclick=async()=>{
      const name=prompt('Nombre, alias o etiqueta maestra del personaje/entidad:');if(!name)return;
      const target=resolveEntityInput(name,e.id);if(!target){alert('No encontré esa entidad.');return}
      normalizeInfo(e).relationships[btn.dataset.addBond].push({targetId:target.id,type:'',note:''});await saveEntityDirect(e);refreshCharacterTab(e);
    });
    $$('[data-remove-bond]').forEach(btn=>btn.onclick=async()=>{normalizeInfo(e).relationships[btn.dataset.removeBond].splice(Number(btn.dataset.bondIndex),1);await saveEntityDirect(e);refreshCharacterTab(e)});

    $('[data-add-gallery]')?.addEventListener('click',async()=>{const item=await chooseMedia();if(!item)return;normalizeInfo(e).gallery.push(item);await saveEntityDirect(e);refreshCharacterTab(e)});
    $$('[data-remove-gallery]').forEach(btn=>btn.onclick=async()=>{normalizeInfo(e).gallery.splice(Number(btn.dataset.removeGallery),1);await saveEntityDirect(e);refreshCharacterTab(e)});

    $$('[data-select-path]').forEach(sel=>sel.onchange=async()=>{setPath(e,sel.dataset.selectPath,sel.value);await saveEntityDirect(e)});

    requestAnimationFrame(()=>requestAnimationFrame(applyMediaRules));
  }

  function showCharacterEntity(e,tab="profile"){
    currentView={type:"entity",id:e.id};setActive("");normalizeInfo(e);
    const validTabs=CHARACTER_TABS.map(x=>x[0]);let active=validTabs.includes(tab)?tab:"profile";
    $("#view").innerHTML=`<div class="character-page">
      <div class="page-head">${backButton()}<h1 class="page-title">Personajes</h1></div>
      <header class="character-titlebar"><div class="character-title-copy"><h1>${esc(e.title)}</h1>${e.subtitle?`<div class="character-subtitle">${esc(e.subtitle)}</div>`:""}</div></header>
      <div class="character-wiki-layout">${renderCharacterInfobox(e)}<main class="character-article">
        <nav class="character-tabs" aria-label="Secciones del personaje">${CHARACTER_TABS.map(([id,label,iconName])=>`<button class="character-tab ${id===active?"active":""}" data-character-tab="${id}"><span>${icon(iconName)}</span>${esc(label)}</button>`).join("")}</nav>
        <section id="characterTabPanel" class="character-tab-panel">${renderCharacterTab(e,active)}</section>
      </main></div>${renderTechnical(e)}</div>`;
    $("#pageBack").onclick=()=>showCategory("personajes");
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
    return p;
  }

  function placeInfoRows(e){
    placeData(e);
    return [
      {title:"Información",rows:[
        ["También conocido como","place.info.aliases",true],
        ["Tipo","place.info.type",false],
        ["Lugar superior","place.info.parent",false],
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
      ${placeInfoRows(e).map(group=>`<section class="infobox-section">
        <h3>${esc(group.title)}</h3><dl>
          ${group.rows.map(([label,path,lines])=>`<div class="infobox-row"><dt>${esc(label)}</dt><dd>${renderEditable(getPath(e,path),path,e,{lines,cls:"infobox-direct-edit"})}</dd></div>`).join("")}
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
      name:kind==="point"?"Nuevo punto":kind==="line"?"Nueva línea":kind==="zone"?"Nueva zona":"Nueva ruta",
      kind,
      category:kind==="route"?"rutas":"",
      layerIds:[],
      levelIds:[],
      targetId:"",
      note:"",
      dateFrom:"",
      dateTo:"",
      visible:true,
      order:0,
      style:{color:"",opacity:"",lineWidth:"",dash:""},
      media:[]
    };
    if(kind==="point") return {...common,x:nodes[0]?.x??50,y:nodes[0]?.y??50,lat:"",lon:"",altitude:"",symbol:"",size:"",rotation:0,label:true,labelPosition:"top",labelOffsetX:0,labelOffsetY:0,radius:"",direction:""};
    if(kind==="line") return {...common,nodes,closed:false,strokeType:"solid",direction:"none",arrows:false,realWidth:"",smoothing:0,nodeElevations:[]};
    if(kind==="zone") return {...common,nodes,holes:[],parts:[],fillOpacity:"",borderWidth:"",labelPoint:null,elevation:"",height:"",containerId:""};
    return {...common,nodes,nodeLevels:nodes.map(()=>""),originPointId:"",destinationPointId:"",waypointPointIds:[],circular:false,direction:"forward",transport:"",segments:[],speedMode:"fixed",fixedSpeed:"",speedMin:"",speedMax:"",speedApprox:false,durationManual:"",departure:"",arrival:"",uncertainty:"",manualDistance:"",proposal:false,generation:{originPointId:"",destinationPointId:"",waypointIds:[],avoidZoneIds:[],preferredLineIds:[],criterion:"distancia"}};
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
        let speed=Number(seg.speed)||0;
        if(!speed&&Number(seg.speedMin)>0&&Number(seg.speedMax)>0) speed=(Number(seg.speedMin)+Number(seg.speedMax))/2;
        if(!speed) speed=Number(r.fixedSpeed)||Number(m.settings.routeDefaults.defaultSpeed)||0;
        const factor=Number(seg.factor)||1;
        const ms=speedToMs(speed*factor,speedUnit);
        if(ms>0) total+=dist/ms;
        total+=timeToSeconds(seg.pauses,timeUnit);
      }
      return total;
    }
    const speed=Number(r.fixedSpeed)||Number(m.settings.routeDefaults.defaultSpeed)||0;
    const ms=speedToMs(speed,speedUnit);return ms>0?polylineMeters(m,nodes)/ms:0;
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
    if(el.levelIds?.length){
      const visibleLevels=new Set(m.levels.filter(l=>l.visible!==false).map(l=>l.id));
      if(!el.levelIds.some(id=>visibleLevels.has(id)))return false;
    }
    const time=m.settings.time||{};
    if(time.enabled&&time.reference){
      const ref=Date.parse(time.reference);
      if(Number.isFinite(ref)){
        const from=Date.parse(el.dateFrom||"");const to=Date.parse(el.dateTo||"");
        if(Number.isFinite(from)&&ref<from)return false;
        if(Number.isFinite(to)&&ref>to)return false;
      }
    }
    return true;
  }

  function layerStyleFor(m,el){
    const layer=toArray(el.layerIds).map(id=>m.layers.find(x=>x.id===id)).find(Boolean);
    return layer?{...(layer.style||{}),opacity:layer.opacity}:{};
  }

  function mapElementStyle(m,el){
    const layer=layerStyleFor(m,el),own=el.style||{};
    return {
      color:own.color||layer.color||"#d4b27a",
      opacity:own.opacity===""||own.opacity==null?(layer.opacity??1):Number(own.opacity),
      width:Number(own.lineWidth)||Number(layer.lineWidth)||Number(m.settings.visual.lineWidth)||2,
      dash:own.dash||layer.dash||"",
      symbol:layer.symbol||""
    };
  }

  function svgPoints(nodes){return toArray(nodes).map(p=>`${Number(p.x)||0},${Number(p.y)||0}`).join(" ")}

  function renderMapLabels(m,el,selected){
    if(el.kind==="point"&&el.label===false)return "";
    const view=currentMapView(m);
    if(view.zoom<Number(m.settings.visual.hideLabelsZoom||0))return "";
    const name=el.name||"";if(!name)return "";
    let x=50,y=50;
    if(el.kind==="point"){x=Number(el.x)||0;y=Number(el.y)||0}
    else if(el.kind==="zone"&&el.labelPoint){x=Number(el.labelPoint.x)||50;y=Number(el.labelPoint.y)||50}
    else if(el.nodes?.length){x=el.nodes.reduce((a,p)=>a+Number(p.x),0)/el.nodes.length;y=el.nodes.reduce((a,p)=>a+Number(p.y),0)/el.nodes.length}
    let px=Number(el.labelOffsetX)||0,py=Number(el.labelOffsetY)||0;
    if(el.kind==="point"){
      const pos=el.labelPosition||"top";
      if(pos==="top")py-=2.1;else if(pos==="bottom")py+=3.1;else if(pos==="left")px-=3;else if(pos==="right")px+=3;
    }
    const fs=Math.max(1.2,(Number(m.settings.visual.labelSize)||12)*.15);
    return `<text class="map-element-label ${selected?"selected":""}" style="font-size:${fs}px" x="${x+px}" y="${y+py}" data-map-element="${esc(el.id)}">${esc(name)}</text>`;
  }

  function realRadiusPercent(m,value){
    const meters=distToM(value,m.settings.units.distance||"m");
    const {sx}=mapScaleXY(m),w=Math.max(1,Number(m.image?.width)||1000);
    return sx>0?meters/(w*sx)*100:0;
  }

  function routeNodesForCalc(r){
    const nodes=toArray(r.nodes).map(p=>({...p}));
    if(r.circular&&nodes.length>1)nodes.push({...nodes[0]});
    return nodes;
  }

  function renderMapElementSvg(m,el){
    if(!mapElementVisible(m,el))return "";
    const s=mapElementStyle(m,el),selected=el.id===selectedPlaceMapElementId;
    let dash=s.dash||"";
    if(el.kind==="line"&&!dash){if(el.strokeType==="dashed")dash="2 1.3";else if(el.strokeType==="dotted")dash=".35 1"}
    const dashAttr=dash?`stroke-dasharray="${esc(dash)}"`:"";
    const common=`data-map-element="${esc(el.id)}" opacity="${s.opacity}"`;
    let shape="";
    if(el.kind==="point"){
      const size=Number(el.size)||Number(m.settings.visual.markerSize)||12;
      const r=Math.max(.45,Math.min(3.2,size*.075));
      const radius=Number(el.radius)>0?realRadiusPercent(m,el.radius):0;
      const dir=Number(el.direction);
      const directionLine=Number.isFinite(dir)&&el.direction!==""?(()=>{const a=(dir-90)*Math.PI/180,len=r*3.4;return `<line x1="${el.x}" y1="${el.y}" x2="${Number(el.x)+Math.cos(a)*len}" y2="${Number(el.y)+Math.sin(a)*len}" stroke="${esc(s.color)}" stroke-width=".22" marker-end="url(#mapArrow)"/>`})():"";
      const radiusShape=radius>0?`<circle cx="${el.x}" cy="${el.y}" r="${radius}" fill="${esc(s.color)}" fill-opacity=".08" stroke="${esc(s.color)}" stroke-width=".12" stroke-dasharray=".6 .5"/>`:"";
      shape=`<g ${common} class="map-shape point-shape ${selected?"selected":""}" transform="rotate(${Number(el.rotation)||0} ${Number(el.x)||0} ${Number(el.y)||0})">${radiusShape}${directionLine}<circle cx="${Number(el.x)||0}" cy="${Number(el.y)||0}" r="${r}" fill="${esc(s.color)}" stroke="rgba(0,0,0,.55)" stroke-width=".3"/><text class="map-point-symbol" x="${Number(el.x)||0}" y="${(Number(el.y)||0)+.15}">${esc(el.symbol||s.symbol||"•")}</text></g>`;
    }else if(el.kind==="line"){
      let nodes=toArray(el.nodes);if(Number(el.smoothing)>0)nodes=smoothPolyline(nodes,Number(el.smoothing));
      if(el.closed&&nodes.length>2)nodes=[...nodes,nodes[0]];
      const arrows=el.arrows||el.direction!=="none";
      let markers="";if(arrows){if(el.direction==="backward"||el.direction==="both")markers+=' marker-start="url(#mapArrow)"';if(el.direction==="forward"||el.direction==="both")markers+=' marker-end="url(#mapArrow)"'}
      if(nodes.length>1)shape=`<polyline ${common} class="map-shape ${selected?"selected":""}" points="${svgPoints(nodes)}" fill="${el.closed?`${esc(s.color)}22`:"none"}" stroke="${esc(s.color)}" stroke-width="${Math.max(.18,s.width*.18)}" ${dashAttr}${markers}/>`;
    }else if(el.kind==="zone"){
      const rings=[toArray(el.nodes),...toArray(el.parts),...toArray(el.holes)].filter(r=>r.length>2);
      const pathD=rings.map(r=>`M ${r.map(p=>`${Number(p.x)||0} ${Number(p.y)||0}`).join(" L ")} Z`).join(" ");
      if(pathD)shape=`<path ${common} class="map-shape zone-shape ${selected?"selected":""}" d="${pathD}" fill="${esc(s.color)}" fill-rule="evenodd" clip-rule="evenodd" fill-opacity="${el.fillOpacity!==""&&el.fillOpacity!=null?Number(el.fillOpacity):Number(m.settings.visual.zoneOpacity)||.22}" stroke="${esc(s.color)}" stroke-width="${Math.max(.16,(Number(el.borderWidth)||s.width)*.16)}" ${dashAttr}/>`;
    }else if(el.kind==="route"){
      let nodes=routeNodesForCalc(el);if(nodes.length>1){const markers=el.direction==="backward"?' marker-start="url(#mapArrow)"':el.direction==="both"?' marker-start="url(#mapArrow)" marker-end="url(#mapArrow)"':' marker-end="url(#mapArrow)"';shape=`<polyline ${common} class="map-shape route-shape ${selected?"selected":""} ${el.proposal?"proposal":""}" points="${svgPoints(nodes)}" fill="none" stroke="${esc(s.color)}" stroke-width="${Math.max(.22,s.width*.2)}" ${el.proposal?'stroke-dasharray="1.2 1"':dashAttr}${markers}/>`}
    }
    const handles=selected?renderMapHandles(el):"";
    return `${shape}${renderMapLabels(m,el,selected)}${handles}`;
  }

  function renderMapHandles(el){
    if(el.kind==="point") return `<circle class="map-node-handle" cx="${Number(el.x)||0}" cy="${Number(el.y)||0}" r=".75" data-node-index="0" data-node-part="point"/>`;
    const handles=toArray(el.nodes).map((p,i)=>`<circle class="map-node-handle" cx="${Number(p.x)||0}" cy="${Number(p.y)||0}" r=".68" data-node-index="${i}" data-node-part="nodes"/>`).join("");
    if(el.kind!=="zone")return handles;
    return handles+toArray(el.parts).map((part,pi)=>toArray(part).map((p,i)=>`<circle class="map-node-handle part-handle" cx="${p.x}" cy="${p.y}" r=".6" data-node-index="${i}" data-node-part="parts" data-part-index="${pi}"/>`).join("")).join("")+toArray(el.holes).map((part,pi)=>toArray(part).map((p,i)=>`<circle class="map-node-handle hole-handle" cx="${p.x}" cy="${p.y}" r=".6" data-node-index="${i}" data-node-part="holes" data-part-index="${pi}"/>`).join("")).join("");
  }

  function currentMapView(m){
    if(!placeMapViews.has(m.id))placeMapViews.set(m.id,{zoom:1,panX:0,panY:0});
    return placeMapViews.get(m.id);
  }

  function renderMapElementsSvg(m){
    const layerOrder=el=>{
      const vals=toArray(el.layerIds).map(id=>m.layers.find(l=>l.id===id)).filter(Boolean).map(l=>Number(l.order)||0);
      return vals.length?Math.max(...vals):0;
    };
    const ordered=m.elements.slice().sort((a,b)=>layerOrder(a)-layerOrder(b)||(Number(a.order)||0)-(Number(b.order)||0));
    const view=currentMapView(m);
    if(!m.settings.visual.cluster||view.zoom>=1)return ordered.map(el=>renderMapElementSvg(m,el)).join("");
    const points=ordered.filter(el=>el.kind==="point"&&mapElementVisible(m,el)&&el.id!==selectedPlaceMapElementId);
    const others=ordered.filter(el=>el.kind!=="point"||el.id===selectedPlaceMapElementId);
    const groups=[];
    for(const p of points){let g=groups.find(g=>Math.hypot(g.x-p.x,g.y-p.y)<4.5);if(!g){g={x:Number(p.x),y:Number(p.y),items:[]};groups.push(g)}g.items.push(p);g.x=g.items.reduce((a,x)=>a+Number(x.x),0)/g.items.length;g.y=g.items.reduce((a,x)=>a+Number(x.y),0)/g.items.length}
    const clusters=groups.map(g=>g.items.length===1?renderMapElementSvg(m,g.items[0]):`<g class="map-cluster"><circle cx="${g.x}" cy="${g.y}" r="2.2"/><text x="${g.x}" y="${g.y+.25}">${g.items.length}</text></g>`).join("");
    return others.map(el=>renderMapElementSvg(m,el)).join("")+clusters;
  }

  function renderMapStage(m){
    const img=m.image;
    if(!img?.src){
      return `<div class="place-map-empty"><div>${icon("lugares")}</div><p>Sin imagen base.</p><button class="map-action" data-map-load-image>＋ Cargar imagen base</button></div>`;
    }
    const ratio=(Number(img.width)>0&&Number(img.height)>0)?`${img.width}/${img.height}`:"16/9";
    const rot=Number(m.settings.rotation)||0;
    const els=renderMapElementsSvg(m);
    const view=currentMapView(m);
    return `<div class="place-map-viewport" data-map-viewport>
      <div class="place-map-canvas" style="aspect-ratio:${ratio};transform:translate(${view.panX}px,${view.panY}px) scale(${view.zoom})">
        <svg class="place-map-svg" data-map-stage viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs><marker id="mapArrow" markerWidth="4" markerHeight="4" refX="3.2" refY="2" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L4,2 L0,4 z" fill="context-stroke"/></marker></defs>
          <g transform="rotate(${rot} 50 50)">
            <image href="${esc(img.src)}" x="0" y="0" width="100" height="100" preserveAspectRatio="none" opacity="${Number(m.settings.baseOpacity)??1}"/>
            <g class="map-elements-layer">${els}</g>
            ${placeMapTool?.mapId===m.id&&toArray(placeMapTool.nodes).length?renderToolPreview(m):""}
          </g>
          <g class="map-north" transform="translate(93 8) rotate(${Number(m.settings.northAngle)||0})"><path d="M0 4 L0 -4"/><path d="M0 -4 L-1.2 -1.5 L1.2 -1.5 Z"/><text x="0" y="-5">N</text></g>
        </svg>
      </div>
    </div>`;
  }

  function renderToolPreview(m){
    const t=placeMapTool,nodes=toArray(t.nodes);if(!nodes.length)return "";
    if(t.mode==="draw-line"||t.mode==="draw-route"||t.mode==="append-nodes"||t.mode==="zone-part"||t.mode==="zone-hole") return `<polyline class="map-tool-preview" points="${svgPoints(nodes)}" fill="none"/>`;
    if(t.mode==="draw-zone") return `<polygon class="map-tool-preview" points="${svgPoints(nodes)}"/>`;
    return "";
  }

  function inverseRotatedPoint(x,y,deg){
    const a=-deg*Math.PI/180,cx=50,cy=50,dx=x-cx,dy=y-cy;
    return {x:cx+dx*Math.cos(a)-dy*Math.sin(a),y:cy+dx*Math.sin(a)+dy*Math.cos(a)};
  }

  function eventMapPoint(svg,ev,m){
    const r=svg.getBoundingClientRect();
    let x=(ev.clientX-r.left)/r.width*100,y=(ev.clientY-r.top)/r.height*100;
    const p=inverseRotatedPoint(x,y,Number(m.settings.rotation)||0);
    return {x:Math.max(0,Math.min(100,p.x)),y:Math.max(0,Math.min(100,p.y))};
  }

  function renderPlaceDescription(e){
    const p=placeData(e);
    return `<div class="character-content-stack">
      <section class="character-section media-aware-block place-description-free">
        ${renderRichFlow(e.summary||"","summary",p.description.media,"place.description.media",e)}
        ${editMode?`<button class="inline-add-media edit-only" data-place-add-media="place.description.media" data-media-text-path="summary">＋ Multimedia</button>`:""}
      </section>
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
    return `<div class="map-settings-grid">
      ${settingRow("Método",mapSelect("settings.calibration.method",c.method,[["pixel","Valor por píxel"],["total","Dimensión total"],["twoPoints","Dos puntos"],["axis","X/Y independientes"],["multi","Varios controles"]]))}
      ${settingRow("Unidad de calibración",mapSelect("settings.calibration.unit",c.unit,["mm","cm","m","km","mi","ft","nmi"]))}
      ${settingRow("Valor por píxel",mapInput("settings.calibration.pixelValue",c.pixelValue,{type:"number",step:"any"}))}
      ${settingRow("Ancho total",mapInput("settings.calibration.totalWidth",c.totalWidth,{type:"number",step:"any"}))}
      ${settingRow("Alto total",mapInput("settings.calibration.totalHeight",c.totalHeight,{type:"number",step:"any"}))}
      ${settingRow("Escala X / px",mapInput("settings.calibration.scaleX",c.scaleX,{type:"number",step:"any"}))}
      ${settingRow("Escala Y / px",mapInput("settings.calibration.scaleY",c.scaleY,{type:"number",step:"any"}))}
      ${settingRow("Punto A",`<div class="inline-map-fields">${mapInput("settings.calibration.pointA.x",c.pointA?.x??"",{type:"number",step:"any",placeholder:"X %"})}${mapInput("settings.calibration.pointA.y",c.pointA?.y??"",{type:"number",step:"any",placeholder:"Y %"})}<button class="tiny-map-btn" data-pick-calibration="A">Elegir</button></div>`,true)}
      ${settingRow("Punto B",`<div class="inline-map-fields">${mapInput("settings.calibration.pointB.x",c.pointB?.x??"",{type:"number",step:"any",placeholder:"X %"})}${mapInput("settings.calibration.pointB.y",c.pointB?.y??"",{type:"number",step:"any",placeholder:"Y %"})}<button class="tiny-map-btn" data-pick-calibration="B">Elegir</button></div>`,true)}
      ${settingRow("Distancia A–B",mapInput("settings.calibration.pointDistance",c.pointDistance,{type:"number",step:"any"}))}
    </div>
    <div class="map-control-pairs">
      <div class="map-mini-head"><strong>Controles múltiples</strong><button class="tiny-map-btn" data-add-control-pair>＋ Par</button></div>
      ${c.controlPairs.length?c.controlPairs.map((p,i)=>`<div class="control-pair-row">
        ${mapInput(`settings.calibration.controlPairs.${i}.x1`,p.x1,{type:"number",step:"any",placeholder:"X1"})}
        ${mapInput(`settings.calibration.controlPairs.${i}.y1`,p.y1,{type:"number",step:"any",placeholder:"Y1"})}
        ${mapInput(`settings.calibration.controlPairs.${i}.x2`,p.x2,{type:"number",step:"any",placeholder:"X2"})}
        ${mapInput(`settings.calibration.controlPairs.${i}.y2`,p.y2,{type:"number",step:"any",placeholder:"Y2"})}
        ${mapInput(`settings.calibration.controlPairs.${i}.distance`,p.distance,{type:"number",step:"any",placeholder:"Distancia"})}
        <button class="tiny-map-btn danger" data-remove-control-pair="${i}">×</button>
      </div>`).join(""):`<div class="empty small">Sin pares.</div>`}
    </div>`;
  }

  function renderMapGlobalSettings(m){
    const s=m.settings,{sx,sy}=mapScaleXY(m);
    const distUnit=s.units.distance||"m";
    return `<details class="map-config-panel"><summary>Configuración global</summary>
      <div class="map-config-body">
        <h4>Base</h4>
        <div class="map-settings-grid">
          ${settingRow("Nombre",mapInput("title",m.title))}
          ${settingRow("Archivo base",`<div class="inline-map-fields"><span class="map-file-name">${esc(m.image?.name||"—")}</span><button class="tiny-map-btn" data-map-load-image>Cambiar</button></div>`,true)}
          ${settingRow("Dimensiones",`<span class="read-value">${m.image?.width||0} × ${m.image?.height||0} px</span>`)}
          ${settingRow("Rotación",mapInput("settings.rotation",s.rotation,{type:"number",min:-360,max:360,step:1}))}
          ${settingRow("Norte",mapInput("settings.northAngle",s.northAngle,{type:"number",min:-360,max:360,step:1}))}
          ${settingRow("Opacidad base",mapInput("settings.baseOpacity",s.baseOpacity,{type:"range",min:0.1,max:1,step:0.05}))}
        </div>

        <h4>Coordenadas</h4>
        <div class="map-settings-grid">
          ${settingRow("Sistema",mapSelect("settings.coordinates.mode",s.coordinates.mode,[["relative","Internas relativas"],["geographic","Geográficas"],["custom","Personalizadas"]]))}
          ${settingRow("Geográficas",mapCheckbox("settings.coordinates.geographic",s.coordinates.geographic,"Habilitadas"))}
          ${settingRow("Origen X",mapInput("settings.coordinates.originX",s.coordinates.originX,{type:"number",step:"any"}))}
          ${settingRow("Origen Y",mapInput("settings.coordinates.originY",s.coordinates.originY,{type:"number",step:"any"}))}
          ${settingRow("Dirección X",mapSelect("settings.coordinates.xDirection",s.coordinates.xDirection,[["right","Derecha"],["left","Izquierda"]]))}
          ${settingRow("Dirección Y",mapSelect("settings.coordinates.yDirection",s.coordinates.yDirection,[["down","Abajo"],["up","Arriba"]]))}
        </div>

        <h4>Calibración y escala</h4>
        ${renderCalibrationSettings(m)}
        <div class="map-scale-result">Escala efectiva: ${sx?`${fmtNumber(mToDist(sx,distUnit),5)} ${distUnit}/px`:"sin calibrar"}${sy&&Math.abs(sy-sx)>1e-12?` · Y ${fmtNumber(mToDist(sy,distUnit),5)} ${distUnit}/px`:""}</div>

        <h4>Unidades</h4>
        <div class="map-settings-grid">
          ${settingRow("Distancia",mapSelect("settings.units.distance",s.units.distance,["mm","cm","m","km","mi","ft","nmi"]))}
          ${settingRow("Área",mapSelect("settings.units.area",s.units.area,["m²","km²","ha","ft²"]))}
          ${settingRow("Velocidad",mapSelect("settings.units.speed",s.units.speed,["m/s","km/h","mph","kn"]))}
          ${settingRow("Tiempo",mapSelect("settings.units.time",s.units.time,["s","min","h","d"]))}
          ${settingRow("Altitud",mapSelect("settings.units.altitude",s.units.altitude,["m","ft"]))}
        </div>

        <h4>Precisión</h4>
        <div class="map-settings-grid">
          ${settingRow("Nivel",mapSelect("settings.precision.mode",s.precision.mode,["Exacta","Buena","Aproximada","Muy aproximada"]))}
          ${settingRow("Tolerancia",mapInput("settings.precision.tolerance",s.precision.tolerance,{type:"number",step:"any"}))}
          ${settingRow("Tipo",mapSelect("settings.precision.toleranceType",s.precision.toleranceType,["%",distUnit]))}
        </div>

        <h4>Tiempo</h4>
        <div class="map-settings-grid">
          ${settingRow("Filtro temporal",mapCheckbox("settings.time.enabled",s.time.enabled,"Activo"))}
          ${settingRow("Referencia",mapInput("settings.time.reference",s.time.reference,{placeholder:"Fecha / periodo"}))}
        </div>

        <h4>Visualización</h4>
        <div class="map-settings-grid">
          ${settingRow("Marcador base",mapInput("settings.visual.markerSize",s.visual.markerSize,{type:"number",min:4,max:40,step:1}))}
          ${settingRow("Etiqueta base",mapInput("settings.visual.labelSize",s.visual.labelSize,{type:"number",min:6,max:30,step:1}))}
          ${settingRow("Ocultar etiquetas bajo zoom",mapInput("settings.visual.hideLabelsZoom",s.visual.hideLabelsZoom,{type:"number",min:.1,max:4,step:.1}))}
          ${settingRow("Agrupar puntos",mapCheckbox("settings.visual.cluster",s.visual.cluster,"Activo"))}
          ${settingRow("Grosor base",mapInput("settings.visual.lineWidth",s.visual.lineWidth,{type:"number",min:.5,max:12,step:.5}))}
          ${settingRow("Opacidad de zonas",mapInput("settings.visual.zoneOpacity",s.visual.zoneOpacity,{type:"range",min:0,max:1,step:.05}))}
          ${settingRow("Zoom mínimo",mapInput("settings.visual.zoomMin",s.visual.zoomMin,{type:"number",min:.1,max:10,step:.1}))}
          ${settingRow("Zoom máximo",mapInput("settings.visual.zoomMax",s.visual.zoomMax,{type:"number",min:.2,max:20,step:.1}))}
        </div>

        <h4>Generación de rutas</h4>
        <div class="map-settings-grid">
          ${settingRow("Método",mapSelect("settings.routeDefaults.method",s.routeDefaults.method,[["direct","Directo"],["smooth","Suavizado"],["corridor","Preferir corredores"]]))}
          ${settingRow("Suavizado",mapInput("settings.routeDefaults.smoothness",s.routeDefaults.smoothness,{type:"number",min:0,max:5,step:1}))}
          ${settingRow("Densidad de puntos",mapInput("settings.routeDefaults.pointDensity",s.routeDefaults.pointDensity,{type:"number",min:2,max:100,step:1}))}
          ${settingRow("Tolerancia",mapInput("settings.routeDefaults.tolerance",s.routeDefaults.tolerance,{type:"number",min:0,step:"any"}))}
          ${settingRow("Obstáculos",mapCheckbox("settings.routeDefaults.respectObstacles",s.routeDefaults.respectObstacles,"Respetar"))}
          ${settingRow("Velocidad predeterminada",mapInput("settings.routeDefaults.defaultSpeed",s.routeDefaults.defaultSpeed,{type:"number",step:"any"}))}
          ${settingRow("Transporte predeterminado",mapInput("settings.routeDefaults.defaultTransport",s.routeDefaults.defaultTransport))}
        </div>
        ${renderLayerPreferenceChecks(m)}
      </div>
    </details>`;
  }

  function renderLayerPreferenceChecks(m){
    const d=m.settings.routeDefaults;
    if(!m.layers.length)return `<div class="empty small">No hay capas para preferencias/restricciones.</div>`;
    return `<div class="map-two-columns"><div><strong>Capas restringidas</strong><div class="map-check-list">${m.layers.map(l=>`<label><input type="checkbox" data-route-layer-pref="restricted" value="${l.id}" ${d.restrictedLayerIds.includes(l.id)?"checked":""}> ${esc(l.name||"Capa")}</label>`).join("")}</div></div><div><strong>Capas preferidas</strong><div class="map-check-list">${m.layers.map(l=>`<label><input type="checkbox" data-route-layer-pref="preferred" value="${l.id}" ${d.preferredLayerIds.includes(l.id)?"checked":""}> ${esc(l.name||"Capa")}</label>`).join("")}</div></div></div>`;
  }

  function renderMapLevels(m){
    return `<details class="map-config-panel"><summary>Niveles</summary><div class="map-config-body">
      <div class="map-mini-head"><span></span><button class="tiny-map-btn" data-add-level>＋ Nivel</button></div>
      ${m.levels.length?`<div class="map-table-list">${m.levels.map((l,i)=>`<div class="map-table-row level-row">
        ${mapInput(`levels.${i}.name`,l.name||"Nivel")}
        ${mapInput(`levels.${i}.order`,l.order??i,{type:"number",step:1,placeholder:"Orden"})}
        ${mapInput(`levels.${i}.elevation`,l.elevation??"",{type:"number",step:"any",placeholder:"Elevación"})}
        <label class="mini-check"><input type="checkbox" data-map-path="levels.${i}.visible" data-map-type="bool" ${l.visible!==false?"checked":""}> Visible</label>
        <label class="mini-check"><input type="radio" name="default-level-${m.id}" data-default-level="${i}" ${l.default?"checked":""}> Pred.</label>
        <button class="tiny-map-btn danger" data-remove-level="${i}">×</button>
      </div>`).join("")}</div>`:`<div class="empty small">Sin niveles.</div>`}
    </div></details>`;
  }

  function renderMapLayers(m){
    return `<details class="map-config-panel"><summary>Capas</summary><div class="map-config-body">
      <div class="map-mini-head"><span></span><button class="tiny-map-btn" data-add-layer>＋ Capa</button></div>
      ${m.layers.length?`<div class="map-table-list">${m.layers.map((l,i)=>`<div class="map-table-row layer-row">
        ${mapInput(`layers.${i}.name`,l.name||"Capa")}
        ${mapInput(`layers.${i}.order`,l.order??i,{type:"number",step:1,placeholder:"Orden"})}
        ${mapInput(`layers.${i}.opacity`,l.opacity??1,{type:"number",min:0,max:1,step:.05,placeholder:"Opacidad"})}
        <input class="map-color" type="color" data-map-path="layers.${i}.style.color" value="${esc(l.style?.color||"#d4b27a")}">
        ${mapInput(`layers.${i}.style.lineWidth`,l.style?.lineWidth??"",{type:"number",step:.1,placeholder:"Grosor"})}
        ${mapInput(`layers.${i}.style.dash`,l.style?.dash??"",{placeholder:"Trazo"})}
        ${mapInput(`layers.${i}.style.symbol`,l.style?.symbol??"",{placeholder:"Símbolo"})}
        <label class="mini-check"><input type="checkbox" data-map-path="layers.${i}.visible" data-map-type="bool" ${l.visible!==false?"checked":""}> Visible</label>
        <button class="tiny-map-btn danger" data-remove-layer="${i}">×</button>
      </div>`).join("")}</div>`:`<div class="empty small">Sin capas.</div>`}
    </div></details>`;
  }

  function renderMapElementList(m){
    const labels={point:"Punto",line:"Línea",zone:"Zona",route:"Ruta"};
    return `<details class="map-config-panel" open><summary>Elementos</summary><div class="map-config-body">
      ${m.elements.length?`<div class="map-element-list">${m.elements.map(el=>`<div class="map-element-list-row ${el.id===selectedPlaceMapElementId?"active":""}">
        <button class="map-element-open" data-select-map-element="${el.id}"><span>${esc(labels[el.kind]||el.kind)}</span><strong>${esc(el.name||"Sin nombre")}</strong></button>
        <label class="mini-check"><input type="checkbox" data-element-visible="${el.id}" ${el.visible!==false?"checked":""}>◉</label>
        <button class="tiny-map-btn danger" data-delete-map-element="${el.id}">×</button>
      </div>`).join("")}</div>`:`<div class="empty small">Sin elementos.</div>`}
    </div></details>`;
  }

  function renderCommonElementFields(m,el){
    return `<div class="map-settings-grid">
      ${settingRow("Nombre",mapInput(`elements.${m.elements.indexOf(el)}.name`,el.name))}
      ${settingRow("Geometría",`<span class="read-value">${esc(el.kind)}</span>`)}
      ${settingRow("Categoría",`<input class="map-field" list="map-category-list" data-map-path="elements.${m.elements.indexOf(el)}.category" value="${esc(el.category||"")}"><datalist id="map-category-list">${[...categoryMap.entries()].map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join("")}</datalist>`)}
      ${settingRow("Entidad vinculada",mapSelect(`elements.${m.elements.indexOf(el)}.targetId`,el.targetId||"",[["","—"],...entities.filter(x=>x.id!==currentView.id).map(x=>[x.id,`${x.title} [${categoryName(x.category)}]`])]))}
      ${settingRow("Desde",mapInput(`elements.${m.elements.indexOf(el)}.dateFrom`,el.dateFrom||"",{placeholder:"Fecha / periodo"}))}
      ${settingRow("Hasta",mapInput(`elements.${m.elements.indexOf(el)}.dateTo`,el.dateTo||"",{placeholder:"Fecha / periodo"}))}
      ${settingRow("Orden",mapInput(`elements.${m.elements.indexOf(el)}.order`,el.order??0,{type:"number",step:1}))}
      ${settingRow("Visible",mapCheckbox(`elements.${m.elements.indexOf(el)}.visible`,el.visible!==false,"Mostrar"))}
      ${settingRow("Color",`<input class="map-color" type="color" data-map-path="elements.${m.elements.indexOf(el)}.style.color" value="${esc(el.style?.color||layerStyleFor(m,el).color||"#d4b27a")}">`)}
      ${settingRow("Opacidad",mapInput(`elements.${m.elements.indexOf(el)}.style.opacity`,el.style?.opacity??"",{type:"number",min:0,max:1,step:.05,placeholder:"Capa/global"}))}
      ${settingRow("Grosor",mapInput(`elements.${m.elements.indexOf(el)}.style.lineWidth`,el.style?.lineWidth??"",{type:"number",min:.1,max:30,step:.1}))}
      ${settingRow("Trazo",mapInput(`elements.${m.elements.indexOf(el)}.style.dash`,el.style?.dash||"",{placeholder:"Ej. 3 2"}))}
    </div>
    <div class="map-two-columns">
      <div><strong>Capas</strong><div class="map-check-list">${m.layers.length?m.layers.map(l=>`<label><input type="checkbox" data-element-layer="${el.id}" value="${l.id}" ${el.layerIds?.includes(l.id)?"checked":""}> ${esc(l.name||"Capa")}</label>`).join(""):`<span>—</span>`}</div></div>
      <div><strong>Niveles</strong><div class="map-check-list">${m.levels.length?m.levels.map(l=>`<label><input type="checkbox" data-element-level="${el.id}" value="${l.id}" ${el.levelIds?.includes(l.id)?"checked":""}> ${esc(l.name||"Nivel")}</label>`).join(""):`<span>—</span>`}</div></div>
    </div>
    <label class="map-textarea-label"><span>Nota</span><textarea class="map-textarea" data-map-path="elements.${m.elements.indexOf(el)}.note">${esc(el.note||"")}</textarea></label>`;
  }

  function renderNodeEditor(m,el){
    if(!["line","zone","route"].includes(el.kind))return "";
    const idx=m.elements.indexOf(el);
    return `<div class="map-node-editor"><div class="map-mini-head"><strong>Nodos</strong><button class="tiny-map-btn" data-append-node="${el.id}">＋ Nodo</button></div>
      ${toArray(el.nodes).map((n,i)=>`<div class="node-row">
        ${mapInput(`elements.${idx}.nodes.${i}.x`,n.x,{type:"number",min:0,max:100,step:.01,placeholder:"X %"})}
        ${mapInput(`elements.${idx}.nodes.${i}.y`,n.y,{type:"number",min:0,max:100,step:.01,placeholder:"Y %"})}
        ${el.kind==="route"?mapSelect(`elements.${idx}.nodeLevels.${i}`,el.nodeLevels?.[i]||"",[["","Nivel —"],...m.levels.map(l=>[l.id,l.name||"Nivel"]) ]):""}
        <button class="tiny-map-btn danger" data-remove-node="${i}" data-node-owner="${el.id}">×</button>
      </div>`).join("")}
    </div>`;
  }

  function renderPointSpecific(m,el){
    const i=m.elements.indexOf(el),c=m.settings.coordinates||{};
    const customX=(Number(c.originX)||0)+(c.xDirection==="left"?-1:1)*(Number(el.x)||0);
    const customY=(Number(c.originY)||0)+(c.yDirection==="up"?-1:1)*(Number(el.y)||0);
    const otherPoints=m.elements.filter(x=>x.kind==="point"&&x.id!==el.id);
    return `<h4>Punto</h4><div class="derived-strip multi"><span>Internas <strong>X ${fmtNumber(el.x,2)}% · Y ${fmtNumber(el.y,2)}%</strong></span>${c.mode==="custom"?`<span>Personalizadas <strong>X ${fmtNumber(customX,2)} · Y ${fmtNumber(customY,2)}</strong></span>`:""}<span>Distancia a otro punto <select class="map-inline-select" data-point-distance-target="${el.id}"><option value="">—</option>${otherPoints.map(p=>`<option value="${p.id}">${esc(p.name||"Punto")}</option>`).join("")}</select> <strong data-point-distance-result>—</strong></span></div><div class="map-settings-grid">
      ${settingRow("X %",mapInput(`elements.${i}.x`,el.x,{type:"number",min:0,max:100,step:.01}))}
      ${settingRow("Y %",mapInput(`elements.${i}.y`,el.y,{type:"number",min:0,max:100,step:.01}))}
      ${settingRow("Latitud",mapInput(`elements.${i}.lat`,el.lat,{type:"number",step:"any"}))}
      ${settingRow("Longitud",mapInput(`elements.${i}.lon`,el.lon,{type:"number",step:"any"}))}
      ${settingRow("Altitud",mapInput(`elements.${i}.altitude`,el.altitude,{type:"number",step:"any"}))}
      ${settingRow("Símbolo",mapInput(`elements.${i}.symbol`,el.symbol||"",{placeholder:"Capa o •"}))}
      ${settingRow("Tamaño",mapInput(`elements.${i}.size`,el.size,{type:"number",min:1,max:80,step:1}))}
      ${settingRow("Rotación",mapInput(`elements.${i}.rotation`,el.rotation,{type:"number",min:-360,max:360,step:1}))}
      ${settingRow("Etiqueta",mapCheckbox(`elements.${i}.label`,el.label!==false,"Mostrar"))}
      ${settingRow("Posición etiqueta",mapSelect(`elements.${i}.labelPosition`,el.labelPosition,["top","bottom","left","right","auto"]))}
      ${settingRow("Desplazamiento X",mapInput(`elements.${i}.labelOffsetX`,el.labelOffsetX,{type:"number",step:.1}))}
      ${settingRow("Desplazamiento Y",mapInput(`elements.${i}.labelOffsetY`,el.labelOffsetY,{type:"number",step:.1}))}
      ${settingRow("Radio visual",mapInput(`elements.${i}.radius`,el.radius,{type:"number",step:"any"}))}
      ${settingRow("Dirección",mapInput(`elements.${i}.direction`,el.direction,{type:"number",min:0,max:360,step:1}))}
    </div>`;
  }

  function renderLineSpecific(m,el){
    const i=m.elements.indexOf(el),lineNodes=el.closed&&el.nodes?.length>2?[...el.nodes,el.nodes[0]]:el.nodes,meters=polylineMeters(m,lineNodes);
    const elev=toArray(el.nodeElevations).map(Number).filter(Number.isFinite);const delta=elev.length>1?elev[elev.length-1]-elev[0]:null;
    return `<h4>Línea</h4><div class="derived-strip multi"><span>Longitud <strong>${formatDistance(meters,m)}</strong></span>${delta!==null?`<span>Desnivel <strong>${fmtNumber(delta)} ${esc(m.settings.units.altitude||"m")}</strong></span>`:""}</div><div class="map-settings-grid">
      ${settingRow("Cerrada",mapCheckbox(`elements.${i}.closed`,el.closed,"Sí"))}
      ${settingRow("Tipo de trazo",mapSelect(`elements.${i}.strokeType`,el.strokeType,["solid","dashed","dotted"]))}
      ${settingRow("Dirección",mapSelect(`elements.${i}.direction`,el.direction,[["none","Sin dirección"],["forward","A → B"],["backward","B → A"],["both","Ambos"]]))}
      ${settingRow("Flechas",mapCheckbox(`elements.${i}.arrows`,el.arrows,"Mostrar"))}
      ${settingRow("Anchura real",mapInput(`elements.${i}.realWidth`,el.realWidth,{type:"number",step:"any"}))}
      ${settingRow("Suavizado",mapInput(`elements.${i}.smoothing`,el.smoothing,{type:"number",min:0,max:5,step:1}))}
      ${settingRow("Elevaciones por nodo",mapInput(`elements.${i}.nodeElevations`,toArray(el.nodeElevations).join(", "),{placeholder:"0, 2, 5…"}))}
    </div>${renderNodeEditor(m,el)}`;
  }

  function renderZoneSpecific(m,el){
    const i=m.elements.indexOf(el),area=zoneAreaMeters2(m,el),per=zonePerimeterMeters(m,el);
    const inside=m.elements.filter(x=>{if(x.id===el.id)return false;if(x.kind==="point")return pointInZone({x:Number(x.x),y:Number(x.y)},el);if(x.kind==="line"||x.kind==="route")return polylineCrossesZone(x.nodes,el);if(x.kind==="zone")return toArray(x.nodes).some(p=>pointInZone(p,el));return false});
    const contained=m.elements.filter(x=>x.kind==="zone"&&x.containerId===el.id);
    const heightM=Number(el.height)>0?distToM(el.height,m.settings.units.altitude||"m"):0;
    const volume=heightM?area*heightM:0;
    return `<h4>Zona</h4><div class="derived-strip multi"><span>Área <strong>${formatArea(area,m)}</strong></span><span>Perímetro <strong>${formatDistance(per,m)}</strong></span><span>Elementos dentro <strong>${inside.length}</strong></span><span>Zonas contenidas <strong>${contained.length}</strong></span>${volume?`<span>Volumen aprox. <strong>${fmtNumber(volume)} m³</strong></span>`:""}</div>
      <div class="map-settings-grid">
        ${settingRow("Opacidad relleno",mapInput(`elements.${i}.fillOpacity`,el.fillOpacity,{type:"number",min:0,max:1,step:.05}))}
        ${settingRow("Borde",mapInput(`elements.${i}.borderWidth`,el.borderWidth,{type:"number",min:.1,max:30,step:.1}))}
        ${settingRow("Etiqueta X",mapInput(`elements.${i}.labelPoint.x`,el.labelPoint?.x??"",{type:"number",min:0,max:100,step:.01}))}
        ${settingRow("Etiqueta Y",mapInput(`elements.${i}.labelPoint.y`,el.labelPoint?.y??"",{type:"number",min:0,max:100,step:.01}))}
        ${settingRow("Elevación",mapInput(`elements.${i}.elevation`,el.elevation,{type:"number",step:"any"}))}
        ${settingRow("Altura",mapInput(`elements.${i}.height`,el.height,{type:"number",step:"any"}))}
        ${settingRow("Zona contenedora",mapSelect(`elements.${i}.containerId`,el.containerId||"",[["","—"],...m.elements.filter(x=>x.kind==="zone"&&x.id!==el.id).map(z=>[z.id,z.name||"Zona"]) ]))}
      </div>
      <div class="zone-part-actions"><button class="tiny-map-btn" data-draw-zone-part="${el.id}">＋ Parte</button><button class="tiny-map-btn" data-draw-zone-hole="${el.id}">＋ Hueco</button><span>${toArray(el.parts).length} partes · ${toArray(el.holes).length} huecos</span></div>
      ${renderNodeEditor(m,el)}`;
  }

  function renderRouteSegments(m,r){
    const idx=m.elements.indexOf(r),timeUnit=m.settings.units.time||"h",speedUnit=m.settings.units.speed||"km/h";
    return `<div class="route-segments"><div class="map-mini-head"><strong>Tramos</strong><button class="tiny-map-btn" data-add-route-segment="${r.id}">＋ Tramo</button></div>
      ${r.segments.length?r.segments.map((s,i)=>`<div class="route-segment-card">
        <div class="route-segment-title"><strong>Tramo ${i+1}</strong><button class="tiny-map-btn danger" data-remove-route-segment="${i}" data-route-owner="${r.id}">×</button></div>
        <div class="map-settings-grid">
          ${settingRow("Nodo inicial",mapInput(`elements.${idx}.segments.${i}.fromIndex`,s.fromIndex??0,{type:"number",min:0,step:1}))}
          ${settingRow("Nodo final",mapInput(`elements.${idx}.segments.${i}.toIndex`,s.toIndex??Math.max(1,r.nodes.length-1),{type:"number",min:1,step:1}))}
          ${settingRow("Transporte",mapInput(`elements.${idx}.segments.${i}.transport`,s.transport||""))}
          ${settingRow(`Velocidad (${speedUnit})`,mapInput(`elements.${idx}.segments.${i}.speed`,s.speed||"",{type:"number",step:"any"}))}
          ${settingRow("Velocidad mínima",mapInput(`elements.${idx}.segments.${i}.speedMin`,s.speedMin||"",{type:"number",step:"any"}))}
          ${settingRow("Velocidad máxima",mapInput(`elements.${idx}.segments.${i}.speedMax`,s.speedMax||"",{type:"number",step:"any"}))}
          ${settingRow("Aproximada",mapCheckbox(`elements.${idx}.segments.${i}.speedApprox`,s.speedApprox,"≈"))}
          ${settingRow("Terreno",mapInput(`elements.${idx}.segments.${i}.terrain`,s.terrain||""))}
          ${settingRow("Pendiente",mapInput(`elements.${idx}.segments.${i}.slope`,s.slope||""))}
          ${settingRow(`Pausas (${timeUnit})`,mapInput(`elements.${idx}.segments.${i}.pauses`,s.pauses||"",{type:"number",step:"any"}))}
          ${settingRow("Condición",mapInput(`elements.${idx}.segments.${i}.condition`,s.condition||""))}
          ${settingRow("Factor",mapInput(`elements.${idx}.segments.${i}.factor`,s.factor??1,{type:"number",step:.05}))}
          ${settingRow(`Duración manual (${timeUnit})`,mapInput(`elements.${idx}.segments.${i}.durationManual`,s.durationManual||"",{type:"number",step:"any"}))}
        </div>
      </div>`).join(""):`<div class="empty small">Sin tramos específicos.</div>`}
    </div>`;
  }

  function renderRouteSpecific(m,r){
    const i=m.elements.indexOf(r),stats=routeStats(m,r),timeUnit=m.settings.units.time||"h",speedUnit=m.settings.units.speed||"km/h";
    const startLevel=m.levels.find(l=>l.id===r.nodeLevels?.[0]),endLevel=m.levels.find(l=>l.id===r.nodeLevels?.[r.nodeLevels.length-1]);
    const levelDelta=startLevel&&endLevel&&Number.isFinite(Number(startLevel.elevation))&&Number.isFinite(Number(endLevel.elevation))?Number(endLevel.elevation)-Number(startLevel.elevation):null;
    const manualDist=Number(r.manualDistance)>0?`${fmtNumber(r.manualDistance)} ${m.settings.units.distance}`:"";
    return `<h4>Ruta</h4>
      <div class="derived-strip multi"><span>Distancia calculada <strong>${formatDistance(stats.meters,m)}</strong></span>${manualDist?`<span>Distancia manual <strong>${manualDist}</strong></span>`:""}<span>Duración calculada <strong>${stats.seconds?`${fmtNumber(secondsToTime(stats.seconds,timeUnit))} ${timeUnit}`:"—"}</strong></span>${stats.secondsMin&&stats.secondsMax?`<span>Rango por velocidad <strong>${fmtNumber(secondsToTime(stats.secondsMin,timeUnit))}–${fmtNumber(secondsToTime(stats.secondsMax,timeUnit))} ${timeUnit}</strong></span>`:""}${Number(r.durationManual)>0?`<span>Duración manual <strong>${fmtNumber(r.durationManual)} ${timeUnit}</strong></span>`:""}<span>Velocidad media <strong>${stats.avgUnit?`${fmtNumber(stats.avgUnit)} ${speedUnit}`:"—"}</strong></span>${stats.calculatedArrival?`<span>Llegada calculada <strong>${esc(stats.calculatedArrival)}</strong></span>`:""}${startLevel||endLevel?`<span>Niveles <strong>${esc(startLevel?.name||"—")} → ${esc(endLevel?.name||"—")}</strong></span>`:""}${levelDelta!==null?`<span>Desnivel <strong>${fmtNumber(levelDelta)} ${esc(m.settings.units.altitude||"m")}</strong></span>`:""}</div>
      ${stats.zones.length?`<div class="route-zones"><strong>Zonas atravesadas</strong>${stats.zones.map(z=>`<span>${esc(z.name)} · ≈${fmtNumber(z.ratio*100,1)}% · ${formatDistance(z.meters,m)}</span>`).join("")}</div>`:""}
      ${r.proposal?`<button class="map-action accept-route" data-accept-route="${r.id}">Aceptar propuesta</button>`:""}
      <div class="map-settings-grid">
        ${settingRow("Origen",mapSelect(`elements.${i}.originPointId`,r.originPointId||"",[["","—"],...m.elements.filter(x=>x.kind==="point").map(p=>[p.id,p.name||"Punto"]) ]))}
        ${settingRow("Destino",mapSelect(`elements.${i}.destinationPointId`,r.destinationPointId||"",[["","—"],...m.elements.filter(x=>x.kind==="point").map(p=>[p.id,p.name||"Punto"]) ]))}
        ${settingRow("Circular",mapCheckbox(`elements.${i}.circular`,r.circular,"Sí"))}
        ${settingRow("Sentido",mapSelect(`elements.${i}.direction`,r.direction,[["forward","A → B"],["backward","B → A"],["both","Ambos"]]))}
        ${settingRow("Transporte",mapInput(`elements.${i}.transport`,r.transport||m.settings.routeDefaults.defaultTransport||""))}
        ${settingRow("Modo de velocidad",mapSelect(`elements.${i}.speedMode`,r.speedMode,[["fixed","Fija"],["interval","Intervalo"],["segments","Por tramo"],["knownTime","Tiempo conocido"]]))}
        ${settingRow(`Velocidad fija (${speedUnit})`,mapInput(`elements.${i}.fixedSpeed`,r.fixedSpeed,{type:"number",step:"any"}))}
        ${settingRow("Velocidad mínima",mapInput(`elements.${i}.speedMin`,r.speedMin,{type:"number",step:"any"}))}
        ${settingRow("Velocidad máxima",mapInput(`elements.${i}.speedMax`,r.speedMax,{type:"number",step:"any"}))}
        ${settingRow("Aproximada",mapCheckbox(`elements.${i}.speedApprox`,r.speedApprox,"≈"))}
        ${settingRow(`Duración manual (${timeUnit})`,mapInput(`elements.${i}.durationManual`,r.durationManual,{type:"number",step:"any"}))}
        ${settingRow("Salida",mapInput(`elements.${i}.departure`,r.departure))}
        ${settingRow("Llegada",mapInput(`elements.${i}.arrival`,r.arrival))}
        ${settingRow("Incertidumbre",mapInput(`elements.${i}.uncertainty`,r.uncertainty))}
        ${settingRow(`Distancia manual (${m.settings.units.distance})`,mapInput(`elements.${i}.manualDistance`,r.manualDistance,{type:"number",step:"any"}))}
      </div>
      <div class="map-check-list route-waypoints"><strong>Waypoints vinculados</strong>${m.elements.filter(x=>x.kind==="point").map(p=>`<label><input type="checkbox" data-route-waypoint="${r.id}" value="${p.id}" ${r.waypointPointIds?.includes(p.id)?"checked":""}> ${esc(p.name||"Punto")}</label>`).join("")||"—"}</div>
      <div class="route-regenerate"><strong>Regenerar sección</strong>${mapInput("__regenFrom",0,{type:"number",min:0,step:1,placeholder:"Desde nodo"})}${mapInput("__regenTo",Math.max(1,r.nodes.length-1),{type:"number",min:1,step:1,placeholder:"Hasta nodo"})}<button class="tiny-map-btn" data-regenerate-route-section="${r.id}">Regenerar</button></div>
      ${renderRouteSegments(m,r)}
      ${renderNodeEditor(m,r)}`;
  }

  function renderElementMedia(m,el){
    const i=m.elements.indexOf(el);
    return `<div class="element-media"><div class="map-mini-head"><strong>Multimedia vinculada</strong><button class="tiny-map-btn" data-add-element-media="${el.id}">＋ Multimedia</button></div>${el.media?.length?`<div class="element-media-grid">${el.media.map((item,mi)=>`<div class="element-media-card">${renderMediaElement(item)}${renderEditable(item.caption||"",`place.maps.${placeData(entities.find(x=>x.id===currentView.id)).maps.indexOf(m)}.elements.${i}.media.${mi}.caption`,entities.find(x=>x.id===currentView.id),{cls:"media-caption",placeholder:"Pie opcional"})}<button class="gallery-remove" data-remove-element-media="${mi}" data-media-owner="${el.id}">×</button></div>`).join("")}</div>`:`<div class="empty small">Sin multimedia.</div>`}</div>`;
  }

  function renderSelectedElementInspector(e,m){
    const el=placeMapElement(m);if(!el)return `<details class="map-config-panel" open><summary>Elemento seleccionado</summary><div class="map-config-body"><div class="empty small">Selecciona un punto, línea, zona o ruta.</div></div></details>`;
    return `<details class="map-config-panel" open><summary>Elemento seleccionado · ${esc(el.name||el.kind)}</summary><div class="map-config-body">
      ${renderCommonElementFields(m,el)}
      ${el.kind==="point"?renderPointSpecific(m,el):el.kind==="line"?renderLineSpecific(m,el):el.kind==="zone"?renderZoneSpecific(m,el):renderRouteSpecific(m,el)}
      ${renderElementMedia(m,el)}
    </div></details>`;
  }

  function renderRouteGenerator(m){
    const g=m.generator,points=m.elements.filter(x=>x.kind==="point"),zones=m.elements.filter(x=>x.kind==="zone"),lines=m.elements.filter(x=>x.kind==="line");
    return `<details class="map-config-panel"><summary>Generar ruta</summary><div class="map-config-body">
      <div class="map-settings-grid">
        ${settingRow("Origen",`<select class="map-field" data-generator-field="originPointId"><option value="">—</option>${points.map(p=>`<option value="${p.id}" ${g.originPointId===p.id?"selected":""}>${esc(p.name||"Punto")}</option>`).join("")}</select>`)}
        ${settingRow("Destino",`<select class="map-field" data-generator-field="destinationPointId"><option value="">—</option>${points.map(p=>`<option value="${p.id}" ${g.destinationPointId===p.id?"selected":""}>${esc(p.name||"Punto")}</option>`).join("")}</select>`)}
        ${settingRow("Criterio",`<select class="map-field" data-generator-field="criterion"><option ${g.criterion==="distancia"?"selected":""}>distancia</option><option ${g.criterion==="tiempo"?"selected":""}>tiempo</option></select>`)}
      </div>
      <div class="map-three-columns">
        <div><strong>Waypoints</strong><div class="map-check-list">${points.map(p=>`<label><input type="checkbox" data-generator-list="waypointIds" value="${p.id}" ${g.waypointIds.includes(p.id)?"checked":""}> ${esc(p.name||"Punto")}</label>`).join("")||"—"}</div></div>
        <div><strong>Zonas a evitar</strong><div class="map-check-list">${zones.map(z=>`<label><input type="checkbox" data-generator-list="avoidZoneIds" value="${z.id}" ${g.avoidZoneIds.includes(z.id)?"checked":""}> ${esc(z.name||"Zona")}</label>`).join("")||"—"}</div></div>
        <div><strong>Líneas preferidas</strong><div class="map-check-list">${lines.map(l=>`<label><input type="checkbox" data-generator-list="preferredLineIds" value="${l.id}" ${g.preferredLineIds.includes(l.id)?"checked":""}> ${esc(l.name||"Línea")}</label>`).join("")||"—"}</div></div>
      </div>
      <button class="map-action" data-generate-route>Generar propuesta</button>
    </div></details>`;
  }

  function renderMapToolbar(m){
    const activeTool=placeMapTool?.mapId===m.id;
    const drawing=activeTool&&["draw-line","draw-zone","draw-route","append-nodes","zone-part","zone-hole"].includes(placeMapTool.mode);
    return `<div class="map-toolbar">
      ${editMode?`<button class="map-tool edit-only" data-draw-tool="point" ${!m.image?.src?"disabled":""}>＋ Punto</button>
      <button class="map-tool edit-only" data-draw-tool="line" ${!m.image?.src?"disabled":""}>＋ Línea</button>
      <button class="map-tool edit-only" data-draw-tool="zone" ${!m.image?.src?"disabled":""}>＋ Zona</button>
      <button class="map-tool edit-only" data-draw-tool="route" ${!m.image?.src?"disabled":""}>＋ Ruta manual</button>
      ${drawing?`<button class="map-tool finish edit-only" data-finish-map-tool>Terminar</button>`:""}${activeTool?`<button class="map-tool cancel edit-only" data-cancel-map-tool>Cancelar</button>`:""}`:""}
      <span class="map-toolbar-spacer"></span>
      <button class="map-tool" data-map-zoom="out">−</button>
      <button class="map-tool" data-map-zoom="reset">100%</button>
      <button class="map-tool" data-map-zoom="in">＋</button>
    </div>`;
  }

  function renderPlaceMaps(e){
    const p=placeData(e);
    if(!p.maps.length){
      return `<section class="character-section place-no-maps"><div class="empty">Sin mapas.</div>${editMode?`<button class="section-add edit-only" data-add-place-map>＋ Mapa</button>`:""}</section>`;
    }
    const m=activePlaceMap(e);
    return `<div class="place-maps-shell">
      <div class="place-map-subtabs">${p.maps.map(x=>`<button class="place-map-subtab ${x.id===m.id?"active":""}" data-place-map-tab="${x.id}">${esc(x.title||"Mapa")}</button>`).join("")}${editMode?`<button class="place-map-subtab add edit-only" data-add-place-map>＋</button>`:""}</div>
      <div class="place-map-head"><div><strong>${esc(m.title||"Mapa")}</strong><small>${esc(m.image?.name||"Sin imagen base")}</small></div>${editMode?`<button class="tiny-map-btn danger edit-only" data-remove-place-map="${m.id}">Quitar mapa</button>`:""}</div>
      ${renderMapToolbar(m)}
      ${renderMapStage(m)}
      ${editMode?`<div class="map-panels-grid edit-only">
        <div>${renderMapElementList(m)}${renderSelectedElementInspector(e,m)}</div>
        <div>${renderMapLayers(m)}${renderMapLevels(m)}${renderRouteGenerator(m)}${renderMapGlobalSettings(m)}</div>
      </div>`:""}
    </div>`;
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
    $('#characterTabPanel').innerHTML=renderPlaceTab(e,active);
    wirePlaceTab(e);
  }

  async function addPlaceMediaAtPath(e,path,textPath=""){
    const item=await chooseMedia();if(!item)return;
    let arr=getPath(e,path);if(!Array.isArray(arr)){arr=[];setPath(e,path,arr)}
    const paragraphs=splitRichParagraphs(textPath?getPath(e,textPath):"");item.anchor=Math.max(0,paragraphs.length-1);
    arr.push(item);await saveEntityDirect(e);refreshPlaceTab(e);
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
    const level=m.levels.find(l=>l.default)||null;
    if(level&&!el.levelIds?.length)el.levelIds=[level.id];
    if(level&&el.kind==="route"&&Array.isArray(el.nodeLevels))el.nodeLevels=el.nodeLevels.map(x=>x||level.id);
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
    if(t.mode==="draw-line"&&t.nodes.length>=2){const el=applyDefaultLevel(m,newMapElement("line",t.nodes));m.elements.push(el);selectedPlaceMapElementId=el.id}
    else if(t.mode==="draw-zone"&&t.nodes.length>=3){const el=applyDefaultLevel(m,newMapElement("zone",t.nodes));m.elements.push(el);selectedPlaceMapElementId=el.id}
    else if(t.mode==="draw-route"&&t.nodes.length>=2){const el=applyDefaultLevel(m,newMapElement("route",t.nodes));el.transport=m.settings.routeDefaults.defaultTransport||"";el.fixedSpeed=m.settings.routeDefaults.defaultSpeed||"";m.elements.push(el);selectedPlaceMapElementId=el.id}
    else if(t.mode==="append-nodes"&&t.targetId){const el=placeMapElement(m,t.targetId);if(el){el.nodes.push(...t.nodes);if(el.kind==="route")el.nodeLevels.push(...t.nodes.map(()=>""))}}
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
    const g=m.generator,d=m.settings.routeDefaults;
    const origin=placeMapElement(m,g.originPointId),dest=placeMapElement(m,g.destinationPointId);
    if(!origin||origin.kind!=="point"||!dest||dest.kind!=="point"){alert("Elige un punto de origen y uno de destino.");return}
    let nodes=[{x:origin.x,y:origin.y}];
    for(const id of g.waypointIds){const p=placeMapElement(m,id);if(p?.kind==="point")nodes.push({x:p.x,y:p.y})}
    const preferredLayerSet=new Set(d.preferredLayerIds||[]);
    const preferred=[...g.preferredLineIds.map(id=>placeMapElement(m,id)).filter(x=>x?.kind==="line")];
    for(const line of m.elements.filter(x=>x.kind==="line"&&x.layerIds?.some(id=>preferredLayerSet.has(id))))if(!preferred.includes(line))preferred.push(line);
    if((d.method==="corridor"||preferred.length)&&preferred.length){for(const line of preferred)nodes.push(...toArray(line.nodes).map(p=>({...p})))}
    nodes.push({x:dest.x,y:dest.y});
    const avoid=[...g.avoidZoneIds.map(id=>placeMapElement(m,id)).filter(x=>x?.kind==="zone")];
    if(d.respectObstacles){
      const restricted=new Set(d.restrictedLayerIds||[]);
      for(const z of m.elements.filter(x=>x.kind==="zone"&&x.layerIds?.some(id=>restricted.has(id))))if(!avoid.includes(z))avoid.push(z);
    }
    if(avoid.length)nodes=detourAroundZones(nodes,avoid,Math.max(1,Number(d.tolerance)||2));
    nodes=densifyPolyline(nodes,Math.max(nodes.length,Number(d.pointDensity)||nodes.length));
    nodes=smoothPolyline(nodes,Number(d.smoothness)||0);
    const r=applyDefaultLevel(m,newMapElement("route",nodes));r.name="Ruta propuesta";r.transport=d.defaultTransport||"";r.proposal=true;r.originPointId=origin.id;r.destinationPointId=dest.id;r.waypointPointIds=[...g.waypointIds];r.fixedSpeed=d.defaultSpeed;r.generation=JSON.parse(JSON.stringify(g));
    m.elements.push(r);selectedPlaceMapElementId=r.id;saveMapAndRefresh(e);
  }

  function updateSvgSelectedGeometry(m,el){
    const svg=$('[data-map-stage]');if(!svg)return;
    const shape=svg.querySelector(`[data-map-element="${CSS.escape(el.id)}"].map-shape`);
    if(el.kind==="point"){
      const circle=shape?.querySelector('circle');if(circle){circle.setAttribute('cx',el.x);circle.setAttribute('cy',el.y)}
    }else if(shape){shape.setAttribute('points',svgPoints(el.nodes))}
    svg.querySelectorAll('.map-node-handle').forEach(h=>{
      const part=h.dataset.nodePart,idx=Number(h.dataset.nodeIndex),pi=Number(h.dataset.partIndex||0);let p;
      if(part==="point")p={x:el.x,y:el.y};else if(part==="nodes")p=el.nodes[idx];else p=el[part]?.[pi]?.[idx];
      if(p){h.setAttribute('cx',p.x);h.setAttribute('cy',p.y)}
    });
  }

  function wireMapStage(e,m){
    const svg=$('[data-map-stage]');if(!svg)return;
    svg.onclick=async ev=>{
      const p=eventMapPoint(svg,ev,m);
      const t=editMode?placeMapTool:null;
      if(t&&t.mapId===m.id){
        if(t.mode==="pick-calibration-A"||t.mode==="pick-calibration-B"){
          const key=t.mode.endsWith("A")?"pointA":"pointB";m.settings.calibration[key]=p;placeMapTool=null;await saveMapAndRefresh(e);return;
        }
        if(t.mode==="draw-point"){
          const el=applyDefaultLevel(m,newMapElement("point",[p]));m.elements.push(el);selectedPlaceMapElementId=el.id;placeMapTool=null;await saveMapAndRefresh(e);return;
        }
        t.nodes.push(p);refreshPlaceTab(e);return;
      }
      const shape=ev.target.closest?.('[data-map-element]');
      if(editMode&&shape&&!ev.target.classList.contains('map-node-handle')){
        selectedPlaceMapElementId=shape.dataset.mapElement;refreshPlaceTab(e);return;
      }
    };

    let drag=null;
    if(!editMode)return;
    svg.querySelectorAll('.map-node-handle').forEach(handle=>{
      handle.onpointerdown=ev=>{ev.preventDefault();ev.stopPropagation();handle.setPointerCapture(ev.pointerId);drag={handle,pointerId:ev.pointerId,part:handle.dataset.nodePart,index:Number(handle.dataset.nodeIndex),partIndex:Number(handle.dataset.partIndex||0)}};
      handle.onpointermove=ev=>{
        if(!drag||drag.pointerId!==ev.pointerId)return;const p=eventMapPoint(svg,ev,m);const el=placeMapElement(m);if(!el)return;
        if(drag.part==="point"){el.x=p.x;el.y=p.y}else if(drag.part==="nodes")el.nodes[drag.index]=p;else if(el[drag.part]?.[drag.partIndex])el[drag.part][drag.partIndex][drag.index]=p;
        updateSvgSelectedGeometry(m,el);
      };
      handle.onpointerup=async ev=>{if(!drag)return;try{handle.releasePointerCapture(ev.pointerId)}catch{}drag=null;await saveEntityDirect(e);refreshPlaceTab(e)};
    });
  }

  function wirePlaceMap(e,m){
    $$('[data-place-map-tab]').forEach(btn=>btn.onclick=()=>{activePlaceMapId=btn.dataset.placeMapTab;selectedPlaceMapElementId="";placeMapTool=null;refreshPlaceTab(e)});
    $$('[data-map-zoom]').forEach(btn=>btn.onclick=()=>{const v=currentMapView(m),a=Number(m.settings.visual.zoomMin)||.5,b=Number(m.settings.visual.zoomMax)||4,min=Math.min(a,b),max=Math.max(a,b);if(btn.dataset.mapZoom==='reset'){v.zoom=1;v.panX=0;v.panY=0}else if(btn.dataset.mapZoom==='in')v.zoom=Math.min(max,v.zoom*1.2);else v.zoom=Math.max(min,v.zoom/1.2);refreshPlaceTab(e)});
    wireMapStage(e,m);
    if(!editMode)return;
    $$('[data-remove-place-map]').forEach(btn=>btn.onclick=async()=>{const p=placeData(e),idx=p.maps.findIndex(x=>x.id===btn.dataset.removePlaceMap);if(idx<0)return;if(!confirm('¿Quitar este mapa?'))return;p.maps.splice(idx,1);activePlaceMapId=p.maps[0]?.id||"";selectedPlaceMapElementId="";placeMapTool=null;await saveMapAndRefresh(e)});
    $$('[data-map-load-image]').forEach(btn=>btn.onclick=async()=>{const img=await chooseMapImage();if(!img)return;m.image=img;await saveMapAndRefresh(e)});

    $$('[data-map-path]').forEach(input=>{
      const handler=async()=>{
        const path=input.dataset.mapPath;if(path.startsWith('__'))return;
        let value=parseMapInputValue(input);
        if(path.endsWith('nodeElevations')&&typeof value==='string')value=value.split(',').map(x=>Number(x.trim())).filter(Number.isFinite);
        setMapPath(m,path,value);await saveMapAndRefresh(e);
      };
      input.onchange=handler;
    });

    $$('[data-pick-calibration]').forEach(btn=>btn.onclick=()=>{if(!m.image?.src){alert('Carga primero una imagen base.');return}placeMapTool={mode:`pick-calibration-${btn.dataset.pickCalibration}`,mapId:m.id,nodes:[]};toast(`Haz clic en el mapa para elegir el punto ${btn.dataset.pickCalibration}.`);refreshPlaceTab(e)});
    $('[data-add-control-pair]')?.addEventListener('click',async()=>{m.settings.calibration.controlPairs.push({x1:"",y1:"",x2:"",y2:"",distance:""});await saveMapAndRefresh(e)});
    $$('[data-remove-control-pair]').forEach(btn=>btn.onclick=async()=>{m.settings.calibration.controlPairs.splice(Number(btn.dataset.removeControlPair),1);await saveMapAndRefresh(e)});

    $('[data-add-layer]')?.addEventListener('click',async()=>{m.layers.push({id:mapUid('layer'),name:'Nueva capa',order:m.layers.length,visible:true,opacity:1,style:{color:'#d4b27a'}});await saveMapAndRefresh(e)});
    $$('[data-remove-layer]').forEach(btn=>btn.onclick=async()=>{const item=m.layers[Number(btn.dataset.removeLayer)];if(!item)return;m.layers.splice(Number(btn.dataset.removeLayer),1);cleanupMapReferences(m,item);await saveMapAndRefresh(e)});
    $('[data-add-level]')?.addEventListener('click',async()=>{m.levels.push({id:mapUid('level'),name:'Nuevo nivel',order:m.levels.length,elevation:'',visible:true,default:!m.levels.length});await saveMapAndRefresh(e)});
    $$('[data-remove-level]').forEach(btn=>btn.onclick=async()=>{const item=m.levels[Number(btn.dataset.removeLevel)];if(!item)return;m.levels.splice(Number(btn.dataset.removeLevel),1);cleanupMapReferences(m,item);if(m.levels.length&&!m.levels.some(l=>l.default))m.levels[0].default=true;await saveMapAndRefresh(e)});
    $$('[data-default-level]').forEach(r=>r.onchange=async()=>{m.levels.forEach((l,i)=>l.default=i===Number(r.dataset.defaultLevel));await saveMapAndRefresh(e)});

    $$('[data-route-layer-pref]').forEach(c=>c.onchange=async()=>{const key=c.dataset.routeLayerPref==='restricted'?'restrictedLayerIds':'preferredLayerIds';updateListFromChecks(m.settings.routeDefaults[key],c.checked,c.value);await saveMapAndRefresh(e)});

    $$('[data-draw-tool]').forEach(btn=>btn.onclick=()=>{if(!m.image?.src){alert('Carga primero una imagen base.');return}const mode=btn.dataset.drawTool;placeMapTool={mode:mode==='point'?'draw-point':mode==='line'?'draw-line':mode==='zone'?'draw-zone':'draw-route',mapId:m.id,nodes:[]};refreshPlaceTab(e)});
    $('[data-finish-map-tool]')?.addEventListener('click',()=>finishMapTool(e,m));
    $('[data-cancel-map-tool]')?.addEventListener('click',()=>{placeMapTool=null;refreshPlaceTab(e)});

    $$('[data-select-map-element]').forEach(btn=>btn.onclick=()=>{selectedPlaceMapElementId=btn.dataset.selectMapElement;placeMapTool=null;refreshPlaceTab(e)});
    $$('[data-delete-map-element]').forEach(btn=>btn.onclick=async()=>{const idx=m.elements.findIndex(x=>x.id===btn.dataset.deleteMapElement);if(idx<0)return;const removed=m.elements[idx];m.elements.splice(idx,1);cleanupMapReferences(m,removed);if(selectedPlaceMapElementId===btn.dataset.deleteMapElement)selectedPlaceMapElementId="";await saveMapAndRefresh(e)});
    $$('[data-element-visible]').forEach(c=>c.onchange=async()=>{const el=placeMapElement(m,c.dataset.elementVisible);if(el){el.visible=c.checked;await saveMapAndRefresh(e)}});
    $$('[data-element-layer]').forEach(c=>c.onchange=async()=>{const el=placeMapElement(m,c.dataset.elementLayer);if(el){el.layerIds||=[];updateListFromChecks(el.layerIds,c.checked,c.value);await saveMapAndRefresh(e)}});
    $$('[data-element-level]').forEach(c=>c.onchange=async()=>{const el=placeMapElement(m,c.dataset.elementLevel);if(el){el.levelIds||=[];updateListFromChecks(el.levelIds,c.checked,c.value);await saveMapAndRefresh(e)}});

    $$('[data-route-waypoint]').forEach(c=>c.onchange=async()=>{const r=placeMapElement(m,c.dataset.routeWaypoint);if(!r)return;r.waypointPointIds||=[];updateListFromChecks(r.waypointPointIds,c.checked,c.value);await saveMapAndRefresh(e)});
    $$('[data-point-distance-target]').forEach(sel=>sel.onchange=()=>{const a=placeMapElement(m,sel.dataset.pointDistanceTarget),b=placeMapElement(m,sel.value),out=sel.parentElement.querySelector('[data-point-distance-result]');if(!a||!b||!out){if(out)out.textContent='—';return}out.textContent=formatDistance(segmentMeters(m,{x:a.x,y:a.y},{x:b.x,y:b.y}),m)});

    $$('[data-append-node]').forEach(btn=>btn.onclick=()=>{placeMapTool={mode:'append-nodes',mapId:m.id,targetId:btn.dataset.appendNode,nodes:[]};refreshPlaceTab(e)});
    $$('[data-remove-node]').forEach(btn=>btn.onclick=async()=>{const el=placeMapElement(m,btn.dataset.nodeOwner),idx=Number(btn.dataset.removeNode);if(!el)return;el.nodes.splice(idx,1);if(el.nodeLevels)el.nodeLevels.splice(idx,1);await saveMapAndRefresh(e)});
    $$('[data-draw-zone-part]').forEach(btn=>btn.onclick=()=>{placeMapTool={mode:'zone-part',mapId:m.id,targetId:btn.dataset.drawZonePart,nodes:[]};refreshPlaceTab(e)});
    $$('[data-draw-zone-hole]').forEach(btn=>btn.onclick=()=>{placeMapTool={mode:'zone-hole',mapId:m.id,targetId:btn.dataset.drawZoneHole,nodes:[]};refreshPlaceTab(e)});

    $$('[data-add-route-segment]').forEach(btn=>btn.onclick=async()=>{const r=placeMapElement(m,btn.dataset.addRouteSegment);if(!r)return;r.segments.push({fromIndex:0,toIndex:Math.max(1,r.nodes.length-1),transport:m.settings.routeDefaults.defaultTransport||'',speed:m.settings.routeDefaults.defaultSpeed||'',speedMin:'',speedMax:'',speedApprox:false,terrain:'',slope:'',pauses:'',condition:'',factor:1,durationManual:''});await saveMapAndRefresh(e)});
    $$('[data-remove-route-segment]').forEach(btn=>btn.onclick=async()=>{const r=placeMapElement(m,btn.dataset.routeOwner);if(!r)return;r.segments.splice(Number(btn.dataset.removeRouteSegment),1);await saveMapAndRefresh(e)});
    $$('[data-accept-route]').forEach(btn=>btn.onclick=async()=>{const r=placeMapElement(m,btn.dataset.acceptRoute);if(!r)return;r.proposal=false;if(r.name==='Ruta propuesta')r.name='Ruta';await saveMapAndRefresh(e)});
    $$('[data-regenerate-route-section]').forEach(btn=>btn.onclick=async()=>{const r=placeMapElement(m,btn.dataset.regenerateRouteSection);if(!r)return;const wrap=btn.closest('.route-regenerate'),inputs=wrap.querySelectorAll('[data-map-path^="__regen"]');const from=Math.max(0,Number(inputs[0]?.value)||0),to=Math.min(r.nodes.length-1,Number(inputs[1]?.value)||r.nodes.length-1);if(to<=from)return;let repl=densifyPolyline([r.nodes[from],r.nodes[to]],Math.max(2,Number(m.settings.routeDefaults.pointDensity)||2));repl=smoothPolyline(repl,Number(m.settings.routeDefaults.smoothness)||0);r.nodes.splice(from,to-from+1,...repl);r.nodeLevels=r.nodes.map((_,i)=>r.nodeLevels?.[i]||'');await saveMapAndRefresh(e)});

    $$('[data-add-element-media]').forEach(btn=>btn.onclick=async()=>{const el=placeMapElement(m,btn.dataset.addElementMedia);if(!el)return;const item=await chooseMedia();if(!item)return;el.media||=[];el.media.push(item);await saveMapAndRefresh(e)});
    $$('[data-remove-element-media]').forEach(btn=>btn.onclick=async()=>{const el=placeMapElement(m,btn.dataset.mediaOwner);if(!el)return;el.media.splice(Number(btn.dataset.removeElementMedia),1);await saveMapAndRefresh(e)});

    $$('[data-generator-field]').forEach(input=>input.onchange=async()=>{m.generator[input.dataset.generatorField]=input.value;await saveEntityDirect(e)});
    $$('[data-generator-list]').forEach(c=>c.onchange=async()=>{const arr=m.generator[c.dataset.generatorList];updateListFromChecks(arr,c.checked,c.value);await saveEntityDirect(e)});
    $('[data-generate-route]')?.addEventListener('click',()=>generateRouteProposal(e,m));

  }

  function wirePlaceMedia(e){
    $$('[data-place-add-media]').forEach(btn=>btn.onclick=()=>addPlaceMediaAtPath(e,btn.dataset.placeAddMedia,btn.dataset.mediaTextPath||""));
    $$('[data-media-position]').forEach(btn=>btn.onclick=async()=>{const block=btn.closest('[data-media-block]');const item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;item.position=btn.dataset.mediaPosition;await saveEntityDirect(e);refreshPlaceTab(e)});
    $$('[data-media-shift]').forEach(btn=>btn.onclick=async()=>{const block=btn.closest('[data-media-block]'),item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;const flow=block.closest('[data-rich-flow]');const max=Math.max(0,(flow?.querySelectorAll('[data-rich-paragraph]').length||1)-1);item.anchor=Math.max(0,Math.min(max,(Number(item.anchor)||0)+Number(btn.dataset.mediaShift)));await saveEntityDirect(e);refreshPlaceTab(e)});
    $$('[data-media-remove]').forEach(btn=>btn.onclick=async()=>{const block=btn.closest('[data-media-block]'),arr=getPath(e,block.dataset.mediaPath)||[];arr.splice(Number(block.dataset.mediaIndex),1);await saveEntityDirect(e);refreshPlaceTab(e)});
    $$('.media-size').forEach(range=>{range.oninput=()=>{const block=range.closest('[data-media-block]');block.style.setProperty('--media-size',`${range.value}%`)};range.onchange=async()=>{const block=range.closest('[data-media-block]'),item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;item.size=Number(range.value);await saveEntityDirect(e);applyMediaRules()}});
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
    $('[data-place-add-gallery]')?.addEventListener('click',async()=>{const item=await chooseMedia();if(!item)return;placeData(e).gallery.push(item);await saveEntityDirect(e);refreshPlaceTab(e)});
    $$('[data-place-remove-gallery]').forEach(btn=>btn.onclick=async()=>{placeData(e).gallery.splice(Number(btn.dataset.placeRemoveGallery),1);await saveEntityDirect(e);refreshPlaceTab(e)});
    $$('[data-place-select-path]').forEach(sel=>sel.onchange=async()=>{setPath(e,sel.dataset.placeSelectPath,sel.value);await saveEntityDirect(e)});
    const active=$('.character-tab.active')?.dataset.placeTab;if(active==='maps'){const m=activePlaceMap(e);if(m)wirePlaceMap(e,m)}
    requestAnimationFrame(()=>requestAnimationFrame(applyMediaRules));
  }

  function showPlaceEntity(e,tab="description"){
    currentView={type:"entity",id:e.id};setActive("");placeData(e);
    const valid=PLACE_TABS.map(x=>x[0]);let active=valid.includes(tab)?tab:"description";
    if(active==='maps'){const m=activePlaceMap(e);if(m)activePlaceMapId=m.id}
    $("#view").innerHTML=`<div class="character-page place-page">
      <div class="page-head">${backButton()}<h1 class="page-title">Lugares</h1></div>
      <header class="character-titlebar"><div class="character-title-copy"><h1>${esc(e.title)}</h1>${e.subtitle?`<div class="character-subtitle">${esc(e.subtitle)}</div>`:""}</div></header>
      <div class="character-wiki-layout">${renderPlaceInfobox(e)}<main class="character-article">
        <nav class="character-tabs" aria-label="Secciones del lugar">${PLACE_TABS.map(([id,label,iconName])=>`<button class="character-tab ${id===active?"active":""}" data-place-tab="${id}"><span>${icon(iconName)}</span>${esc(label)}</button>`).join("")}</nav>
        <section id="characterTabPanel" class="character-tab-panel">${renderPlaceTab(e,active)}</section>
      </main></div>${renderTechnical(e)}</div>`;
    $("#pageBack").onclick=()=>showCategory("lugares");
    $('[data-change-cover="place"]')?.addEventListener('click',()=>choosePortrait(e,()=>showPlaceEntity(e,active)));
    $('[data-remove-cover="place"]')?.addEventListener('click',async()=>{e.image="";await saveEntityDirect(e);showPlaceEntity(e,active)});
    $$('[data-place-tab]').forEach(btn=>btn.onclick=()=>{active=btn.dataset.placeTab;$$('.character-tab').forEach(b=>b.classList.toggle('active',b===btn));$('#characterTabPanel').innerHTML=renderPlaceTab(e,active);wirePlaceTab(e)});
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
    restoreSidebar();
    window.addEventListener("resize",()=>{
      if(currentView.type==="entity" && document.querySelector(".character-page")) applyMediaRules();
    });

    await openDB();
    entities=await ensureSeed();

    $("#brandHome").onclick=showHome;
    $("#editModeBtn").onclick=toggleEditMode;
    $("#sidebarResizeBtn").onclick=e=>{e.stopPropagation();toggleSidebar()};
    $("#registryBtn").onclick=showRegistry;
    $("#linkerBtn").onclick=showLinker;
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
