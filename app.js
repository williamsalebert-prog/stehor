(() => {
  const DB_NAME = "sethoria-atlas-prototipo-a";
  const APP_BUILD = "A6.5-personajes-edicion-directa";
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
  async function ensureSeed(){
    const all=await getAll();
    if(!all.length){
      for(const e of window.SETHORIA_DEMO.seedEntities) await putEntity(e);
      localStorage.setItem("sethoria-demo-build","a65");
      return getAll();
    }

    // La demo se migra una sola vez a la estructura A6.5. Después, incluso
    // los registros demo-* quedan editables y no se vuelven a sobrescribir.
    if(localStorage.getItem("sethoria-demo-build")!=="a65"){
      for(const seed of (window.SETHORIA_DEMO.seedEntities||[])){
        if(String(seed.id||"").startsWith("demo-")) await putEntity(seed);
      }
      localStorage.setItem("sethoria-demo-build","a65");
    }
    return getAll();
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
      </div>
      ${list.length ? `<div class="cards-grid">${list.map(itemCard).join("")}</div>` : `<div class="empty">Sin elementos todavía.</div>`}
    `;

    $("#pageBack").onclick=showHome;
    $$("[data-item]").forEach(btn=>btn.onclick=()=>showEntity(btn.dataset.item));
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
  // Wiki personal: edición directa, sin modo de edición.
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
    return String(path||"").split(".").filter(Boolean).reduce((cur,key)=>cur?.[/^\\d+$/.test(key)?Number(key):key],obj);
  }

  function setPath(obj,path,value){
    const parts=String(path||"").split(".").filter(Boolean);
    let cur=obj;
    parts.forEach((part,i)=>{
      const key=/^\\d+$/.test(part)?Number(part):part;
      if(i===parts.length-1){cur[key]=value;return}
      const next=parts[i+1];
      if(cur[key]==null || typeof cur[key]!=="object") cur[key]=/^\\d+$/.test(next)?[]:{};
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
    return `<div class="direct-edit ${cls}" contenteditable="true" spellcheck="true"
      data-edit-path="${esc(path)}" data-edit-type="${lines?"lines":"text"}"
      data-edit-empty="${esc(placeholder)}">${linkifyText(shown,e.id)}</div>`;
  }

  function wireDirectEditors(e){
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

  function renderCharacterInfobox(e){
    normalizeInfo(e);
    const image=getImage(e);
    return `<aside class="character-infobox">
      <div class="character-portrait-shell">
        <div class="character-portrait">
          ${image?`<img src="${esc(image)}" alt="">`:`<div class="character-portrait-placeholder">${icon("personajes")}</div>`}
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
    if(type.startsWith("image/") || /\\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(name)) return "image";
    if(type.startsWith("video/") || /\\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(name)) return "video";
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
      position:"center",size:kind==="video"?65:50,caption:""
    };
  }

  function mediaRange(item,position){
    const w=Number(item.width)||1,h=Number(item.height)||1,aspect=w/h;
    if(position==="center"){
      if(aspect<.65) return [25,42];
      if(aspect<.85) return [28,48];
      if(aspect<=1.25) return [34,62];
      if(aspect<=2.2) return [44,78];
      return [55,90];
    }
    if(aspect>2.2) return null;
    if(aspect<.65) return [20,30];
    if(aspect<.85) return [22,34];
    if(aspect<=1.25) return [25,42];
    return [30,45];
  }

  function renderMediaElement(item){
    if(!item?.src) return `<div class="gallery-placeholder">${icon("personajes")}</div>`;
    if(item.kind==="video") return `<video src="${esc(item.src)}" controls preload="metadata"></video>`;
    return `<img src="${esc(item.src)}" alt="">`;
  }

  function renderEmbeddedMedia(media,path,e){
    return toArray(media).map((item,i)=>{
      const pos=item.position||"center";
      const size=Number(item.size)||50;
      return `<figure class="embedded-media media-${esc(pos)}" data-media-block data-media-path="${esc(path)}" data-media-index="${i}" data-position="${esc(pos)}" data-width="${Number(item.width)||0}" data-height="${Number(item.height)||0}" style="--media-size:${size}%">
        <div class="embedded-media-frame">${renderMediaElement(item)}</div>
        <div class="media-controls">
          <button class="media-pos ${pos==="left"?"active":""}" data-media-position="left" title="Izquierda">←</button>
          <button class="media-pos ${pos==="center"?"active":""}" data-media-position="center" title="Centro">•</button>
          <button class="media-pos ${pos==="right"?"active":""}" data-media-position="right" title="Derecha">→</button>
          <input class="media-size" type="range" value="${size}" aria-label="Tamaño">
          <button class="media-remove" data-media-remove title="Quitar">×</button>
        </div>
        ${renderEditable(item.caption||"",`${path}.${i}.caption`,e,{cls:"media-caption",placeholder:"Pie opcional"})}
      </figure>`;
    }).join("");
  }

  function richSection(e,{title,path,mediaPath,titlePath="",removeAction="",addMedia=true}){
    const value=getPath(e,path)||"";
    const media=getPath(e,mediaPath)||[];
    return `<section class="character-section media-aware-block">
      <div class="section-title-row">
        ${titlePath?`<h2 class="editable-heading">${renderEditable(title,titlePath,e,{cls:"heading-editor",placeholder:"Título"})}</h2>`:`<h2>${esc(title)}</h2>`}
        ${removeAction?`<button class="section-remove" ${removeAction}>×</button>`:""}
      </div>
      <div class="rich-content-flow">
        ${renderEmbeddedMedia(media,mediaPath,e)}
        ${renderEditable(value,path,e,{cls:"character-prose editable-long-text",placeholder:"—"})}
      </div>
      ${addMedia?`<button class="inline-add-media" data-add-media="${esc(mediaPath)}">＋ Multimedia</button>`:""}
    </section>`;
  }

  function renderCharacterProfile(e){
    const c=normalizeInfo(e);
    c.introMedia ||= [];
    return `<div class="character-content-stack">
      <section class="character-intro-card media-aware-block">
        <div class="rich-content-flow">
          ${renderEmbeddedMedia(c.introMedia,"character.introMedia",e)}
          ${renderEditable(e.summary||"","summary",e,{cls:"character-prose editable-long-text",placeholder:"—"})}
        </div>
        <button class="inline-add-media" data-add-media="character.introMedia">＋ Multimedia</button>
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
      <button class="section-add" data-add-history>＋ Apartado</button>
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
        <div class="section-title-row"><h2>${label}</h2><button class="bond-add" data-add-bond="${key}">＋ Lazo</button></div>
        <div class="bond-detail-stack">
          ${c.relationships[key].map((item,i)=>{
            const target=relationTarget(item);
            return `<article class="bond-detail-card">
              <div class="bond-detail-head">
                <div class="bond-detail-title">
                  ${target?`<button class="text-button bond-name-link" data-open-related="${target.id}">${esc(target.title)}</button>`:`<strong>Entidad no encontrada</strong>`}
                  ${renderEditable(item.type||"",`character.relationships.${key}.${i}.type`,e,{cls:"bond-type-edit",placeholder:"Aclaración opcional"})}
                </div>
                <button class="bond-remove" data-remove-bond="${key}" data-bond-index="${i}">×</button>
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
      <div class="section-title-row"><h2>Galería</h2><button class="gallery-add" data-add-gallery>＋ Multimedia</button></div>
      <div class="character-gallery-grid">
        ${c.gallery.map((item,i)=>`<article class="character-gallery-card">
          ${renderMediaElement(item)}
          ${renderEditable(item.caption||"",`character.gallery.${i}.caption`,e,{cls:"gallery-caption direct-gallery-caption",placeholder:"Pie opcional"})}
          <button class="gallery-remove" data-remove-gallery="${i}">×</button>
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
      <section class="character-section research-choices"><div><h2>Personaje</h2><select data-select-path="character.research.kind"><option ${r.kind==="Inventado"?"selected":""}>Inventado</option><option ${r.kind==="Real"?"selected":""}>Real</option></select></div><div><h2>Estado de desarrollo</h2><select data-select-path="character.research.workStatus"><option ${r.workStatus==="Nuevo"?"selected":""}>Nuevo</option><option ${r.workStatus==="En desarrollo"?"selected":""}>En desarrollo</option><option ${r.workStatus==="Final"?"selected":""}>Final</option></select></div></section>
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

  async function addMediaAtPath(e,path){
    const item=await chooseMedia();if(!item) return;
    let arr=getPath(e,path);if(!Array.isArray(arr)){arr=[];setPath(e,path,arr)}
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
      const frame=block.querySelector('.embedded-media-frame');
      const range=block.querySelector('.media-size');
      const parent=block.closest('.media-aware-block');
      const text=parent?.querySelector('.editable-long-text');
      if(!frame||!range||!parent) return;
      const idx=Number(block.dataset.mediaIndex),path=block.dataset.mediaPath;
      const e=entities.find(x=>x.id===currentView.id);if(!e)return;
      const item=getPath(e,`${path}.${idx}`);if(!item)return;
      const width=parent.clientWidth||700;
      let effective=item.position||"center";
      let limits=mediaRange(item,effective);
      const tooLittleText=(text?.innerText||"").trim().length<180;
      if(effective!=="center" && (width<720 || tooLittleText || !limits)) effective="center";
      limits=mediaRange(item,effective)||[35,70];
      if(effective!=="center"){
        const minText=Math.max(300,width*.38);
        const sideMax=Math.max(0,((width-minText-24)/width)*100);
        limits[1]=Math.min(limits[1],sideMax);
        if(limits[1]<limits[0]){effective="center";limits=mediaRange(item,"center")||[35,70]}
      }
      if(item.width){
        const intrinsicMax=(item.width/width)*100;
        limits[1]=Math.min(limits[1],Math.max(limits[0],intrinsicMax));
      }
      if(item.width&&item.height){
        const aspect=item.width/item.height;
        const heightMax=(window.innerHeight*.70*aspect/width)*100;
        limits[1]=Math.min(limits[1],Math.max(limits[0],heightMax));
      }
      const val=Math.max(limits[0],Math.min(Number(item.size)||50,limits[1]));
      range.min=Math.round(limits[0]);range.max=Math.max(Math.round(limits[0]),Math.round(limits[1]));range.value=Math.round(val);
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

  function refreshCharacterTab(e){
    const active=$('.character-tab.active')?.dataset.characterTab || 'profile';
    $('#characterTabPanel').innerHTML=renderCharacterTab(e,active);
    wireCharacterTab(e);
  }

  function wireCharacterTab(e){
    wireEntityLinks();
    wireDirectEditors(e);

    $$('[data-add-media]').forEach(btn=>btn.onclick=()=>addMediaAtPath(e,btn.dataset.addMedia));
    $$('[data-media-position]').forEach(btn=>btn.onclick=async()=>{
      const block=btn.closest('[data-media-block]');
      const item=getPath(e,`${block.dataset.mediaPath}.${block.dataset.mediaIndex}`);if(!item)return;
      item.position=btn.dataset.mediaPosition;await saveEntityDirect(e);refreshCharacterTab(e);
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
    $$('[data-character-tab]').forEach(btn=>btn.onclick=()=>{active=btn.dataset.characterTab;$$('.character-tab').forEach(b=>b.classList.toggle('active',b===btn));$('#characterTabPanel').innerHTML=renderCharacterTab(e,active);wireCharacterTab(e)});
    $("#copyMasterTag").onclick=()=>copyText(e.masterTag||e.id);$("#copyInternalLink").onclick=()=>copyText(`[[${e.masterTag||e.id}|${e.title}]]`);
    wireDirectEditors(e);wireCharacterTab(e);history.replaceState(null,"",`#entity=${encodeURIComponent(e.id)}`);
  }

  function showEntity(id,tab="overview"){
    const e=entities.find(x=>x.id===id);
    if(!e) return;

    if(e.category==="personajes"){
      showCharacterEntity(e,tab==="overview" ? "profile" : tab);
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
    restoreSidebar();
    window.addEventListener("resize",()=>{
      if(currentView.type==="entity" && document.querySelector(".character-page")) applyMediaRules();
    });

    await openDB();
    entities=await ensureSeed();

    $("#brandHome").onclick=showHome;
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
