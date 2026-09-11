(() => {
  const DB_NAME = "sethoria-atlas-prototipo-a";
  const STORE = "entities";
  const META = "meta";

  let db;
  let entities = [];
  let currentView = {type:"home"};
  let navHistory = [];
  let paletteIndex = 0;
  let paletteItems = [];
  let linkerState = [];

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const categoryMap = new Map(window.SETHORIA_DEMO.categories);

  const categoryIcons = {
    "personajes":"♙","grupos":"◉","arcos":"⌁","eventos":"◆","timeline-a":"↠","timeline-b":"↞",
    "lugares":"⌖","rutas":"⇢","batallas":"⚔","barcos":"◒","criaturas-magicas":"✦","criaturas-reales":"◈",
    "culturas":"⌘","armas":"†","ropa":"◇","objetos":"□","relaciones":"∞","historia-real":"◷",
    "reglas":"§","informacion-general":"≡","musica":"♫","fuentes":"⌕","otros":"···","notas":"✎"
  };

  const categoryGroups = [
    {title:"Narrativa", ids:["personajes","grupos","arcos","eventos","timeline-a","timeline-b","relaciones"]},
    {title:"Mundo", ids:["lugares","rutas","barcos","criaturas-magicas","criaturas-reales","culturas"]},
    {title:"Técnica y material", ids:["batallas","armas","ropa","objetos"]},
    {title:"Contexto", ids:["historia-real","reglas","informacion-general","musica","fuentes"]},
    {title:"Archivo", ids:["otros","notas"]}
  ];

  const descriptions = {
    personajes:"Perfiles, evolución y conexiones.",
    grupos:"Grupos, subgrupos, tripulaciones y facciones.",
    arcos:"Arcos, tramas y subtramas.",
    eventos:"Acontecimientos concretos y conexiones.",
    "timeline-a":"Línea temporal del grupo principal.",
    "timeline-b":"Línea temporal del grupo secundario.",
    lugares:"Lugares, mapas y rutas ligadas al espacio.",
    rutas:"Recorridos que no encajen dentro de un lugar.",
    batallas:"Técnicas de combate y batallas específicas.",
    barcos:"Barcos, planos, tripulaciones y viajes.",
    "criaturas-magicas":"Criaturas fantásticas o sobrenaturales.",
    "criaturas-reales":"Animales reales, extintos o prehistóricos.",
    culturas:"Culturas y estructuras sociales.",
    armas:"Armas y datos técnicos.",
    ropa:"Ropa, atuendos, materiales y uso.",
    objetos:"Objetos y equipo general.",
    relaciones:"Relaciones personales y sentimentales.",
    "historia-real":"Hechos históricos tal como ocurrieron.",
    reglas:"Reglas canónicas de Sethoria.",
    "informacion-general":"Información transversal.",
    musica:"Música, referencias e inspiración.",
    fuentes:"Fuentes y archivos de investigación.",
    otros:"Colecciones auxiliares.",
    notas:"Ideas, pendientes y notas libres."
  };

  const slug = (s) => (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");

  function uid(){
    return "ent_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8);
  }
  function esc(s=""){
    return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }
  function categoryName(id){ return categoryMap.get(id) || id; }

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
  function tx(store,mode="readonly"){ return db.transaction(store,mode).objectStore(store); }
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

  function getLocalArray(key){
    try{
      const v=JSON.parse(localStorage.getItem(key)||"[]");
      return Array.isArray(v)?v:[];
    }catch{return []}
  }
  function setLocalArray(key,v){ localStorage.setItem(key,JSON.stringify(v)); }

  function getFavorites(){ return getLocalArray("sethoria-a2-favorites"); }
  function isFavorite(id){ return getFavorites().includes(id); }
  function toggleFavorite(id){
    let fav=getFavorites();
    if(fav.includes(id)) fav=fav.filter(x=>x!==id);
    else fav=[id,...fav].slice(0,80);
    setLocalArray("sethoria-a2-favorites",fav);
    return fav.includes(id);
  }
  function addRecent(id){
    let recent=getLocalArray("sethoria-a2-recent").filter(x=>x!==id);
    recent=[id,...recent].slice(0,12);
    setLocalArray("sethoria-a2-recent",recent);
  }
  function resolveIds(ids){
    return ids.map(id=>entities.find(e=>e.id===id)).filter(Boolean);
  }

  function toast(message){
    const el=$("#toast");
    el.textContent=message;
    el.classList.remove("hidden");
    clearTimeout(window.__toastTimer);
    window.__toastTimer=setTimeout(()=>el.classList.add("hidden"),1600);
  }

  function setBreadcrumb(text){ $("#breadcrumb").textContent=text; }
  function setSearchVisibility(home){
    $("#topSearchBtn").classList.toggle("home-hidden",!!home);
  }
  function setActive(key){
    $$(".nav-button,.category-button").forEach(b=>b.classList.remove("active"));
    const el=document.querySelector(`[data-nav="${CSS.escape(key)}"]`);
    if(el) el.classList.add("active");
  }
  function updateBack(){
    $("#backBtn").disabled=navHistory.length===0;
  }

  function pushHistory(){
    const last=navHistory[navHistory.length-1];
    const serialized=JSON.stringify(currentView);
    if(!last || JSON.stringify(last)!==serialized) navHistory.push({...currentView});
    if(navHistory.length>50) navHistory.shift();
    updateBack();
  }
  function goBack(){
    if(!navHistory.length){ showHome(false); return; }
    const prev=navHistory.pop();
    navigateTo(prev,false);
    updateBack();
  }
  function navigateTo(view,push=true){
    if(view.type==="home") showHome(push);
    else if(view.type==="category") showCategory(view.id,push);
    else if(view.type==="registry") showRegistry(push);
    else if(view.type==="linker") showLinker(push);
    else if(view.type==="entity") showEntity(view.id,push);
  }

  function buildNav(){
    const nav=$("#categoryNav");
    nav.innerHTML=categoryGroups.map(group=>`
      <section class="nav-group">
        <div class="sidebar-title">${esc(group.title)}</div>
        ${group.ids.map(id=>{
          const name=categoryName(id);
          return `<button class="category-button" data-nav="${id}" data-category="${id}" title="${esc(name)}">
            <span class="cat-icon">${categoryIcons[id]||"•"}</span>
            <span class="nav-label">${esc(name)}</span>
          </button>`;
        }).join("")}
      </section>
    `).join("");
    $$("[data-category]").forEach(b=>b.onclick=()=>showCategory(b.dataset.category,true));
  }

  function toggleSidebar(){
    const app=$("#app");
    const mobile=window.matchMedia("(max-width:700px)").matches;
    if(mobile){
      app.classList.toggle("mobile-sidebar-open");
      return;
    }
    const collapsed=app.classList.toggle("sidebar-collapsed");
    localStorage.setItem("sethoria-a2-sidebar-collapsed",collapsed?"1":"0");
  }
  function restoreSidebar(){
    if(window.matchMedia("(max-width:700px)").matches) return;
    if(localStorage.getItem("sethoria-a2-sidebar-collapsed")==="1"){
      $("#app").classList.add("sidebar-collapsed");
    }
  }

  function formatToday(){
    try{
      return new Intl.DateTimeFormat("es-MX",{weekday:"long",day:"numeric",month:"long"}).format(new Date());
    }catch{return ""}
  }

  function categoryCard(id){
    const name=categoryName(id);
    const count=entities.filter(e=>e.category===id).length;
    return `<button class="category-card" data-home-category="${id}">
      <div class="category-card-top">
        <span class="category-icon">${categoryIcons[id]||"•"}</span>
        <span class="count">${count}</span>
      </div>
      <strong>${esc(name)}</strong>
      <small>${esc(descriptions[id]||"")}</small>
    </button>`;
  }

  function miniEntity(e){
    return `<button class="mini-entity" data-mini-entity="${e.id}">
      <strong>${esc(e.title)}</strong>
      <small>${esc(categoryName(e.category))}</small>
    </button>`;
  }

  function showHome(push=true){
    if(push) pushHistory();
    currentView={type:"home"};
    setActive("");
    setBreadcrumb("Inicio");
    setSearchVisibility(true);

    const recent=resolveIds(getLocalArray("sethoria-a2-recent")).slice(0,5);
    const favorites=resolveIds(getFavorites()).slice(0,5);

    $("#view").innerHTML=`
      <div class="home-shell">
        <div class="home-head">
          <div class="home-title-block">
            <div class="eyebrow">Sethoria Atlas</div>
            <h1>Inicio</h1>
          </div>
          <div class="home-date">${esc(formatToday())}</div>
        </div>

        <div class="home-search">
          <span class="search-symbol">⌕</span>
          <input id="homeSearch" type="search" placeholder="Buscar en todo Sethoria Atlas…" autocomplete="off" />
          <kbd>Ctrl K</kbd>
        </div>

        <div class="dashboard-strip">
          <div class="continue-panel">
            <div class="strip-title"><strong>Continuar</strong><span>Recientes</span></div>
            <div class="recent-list">
              ${recent.length ? recent.map(miniEntity).join("") : `<span class="empty-inline">Los elementos que abras aparecerán aquí.</span>`}
            </div>
          </div>
          <div class="favorites-panel">
            <div class="strip-title"><strong>Favoritos</strong><span>Acceso rápido</span></div>
            <div class="favorite-list">
              ${favorites.length ? favorites.map(miniEntity).join("") : `<span class="empty-inline">Marca ☆ en una ficha para fijarla aquí.</span>`}
            </div>
          </div>
        </div>

        ${categoryGroups.map(group=>`
          <section class="home-section">
            <div class="section-head">
              <h2>${esc(group.title)}</h2>
              <small>${group.ids.length} categorías</small>
            </div>
            <div class="category-compact-grid">
              ${group.ids.map(categoryCard).join("")}
            </div>
          </section>
        `).join("")}

        <section class="home-section">
          <div class="section-head">
            <h2>Herramientas</h2>
            <small>Funciones auxiliares</small>
          </div>
          <div class="tools-grid">
            <button class="tool-card" id="homeRegistry">
              <strong>Registro maestro</strong>
              <small>IDs, etiquetas maestras, alias y referencias.</small>
            </button>
            <button class="tool-card" id="homeLinker">
              <strong>Hipervinculador rápido</strong>
              <small>Pega texto y resuelve vínculos internos.</small>
            </button>
            <button class="tool-card" id="homeBackup">
              <strong>Exportar respaldo</strong>
              <small>Descarga una copia del estado local.</small>
            </button>
          </div>
        </section>
      </div>
    `;

    $$("[data-home-category]").forEach(b=>b.onclick=()=>showCategory(b.dataset.homeCategory,true));
    $$("[data-mini-entity]").forEach(b=>b.onclick=()=>showEntity(b.dataset.miniEntity,true));
    $("#homeRegistry").onclick=()=>showRegistry(true);
    $("#homeLinker").onclick=()=>showLinker(true);
    $("#homeBackup").onclick=exportBackup;
    $("#homeSearch").onfocus=()=>openPalette();
    $("#homeSearch").oninput=e=>openPalette(e.target.value);
    updateBack();
  }

  function showCategory(id,push=true){
    if(push) pushHistory();
    currentView={type:"category",id};
    setActive(id);
    setBreadcrumb(categoryName(id));
    setSearchVisibility(false);

    const list=entities.filter(e=>e.category===id);
    $("#view").innerHTML=`
      <div class="page-title">
        <div>
          <h1>${esc(categoryName(id))}</h1>
          <p>${esc(descriptions[id]||"")}</p>
        </div>
      </div>
      ${list.length
        ? `<div class="grid">${list.map(entityCard).join("")}</div>`
        : `<div class="empty">Todavía no hay elementos en esta categoría. Usa “+ Nuevo” en la barra superior cuando quieras agregar uno.</div>`}
    `;
    wireEntityCards();
    updateBack();
  }

  function entityCard(e){
    const fav=isFavorite(e.id);
    return `<article class="entity-card" data-entity-card="${e.id}" tabindex="0" role="button" aria-label="Abrir ${esc(e.title)}">
      <button class="favorite-card-btn ${fav?"active":""}" data-fav-card="${e.id}" title="${fav?"Quitar de favoritos":"Agregar a favoritos"}">${fav?"★":"☆"}</button>
      <div class="meta">${esc(categoryName(e.category))}</div>
      <h3>${esc(e.title)}</h3>
      <p>${esc(e.summary || "Sin resumen.")}</p>
      <div class="badges">
        ${e.masterTag ? `<span class="badge master">${esc(e.masterTag)}</span>`:""}
        ${(e.tags||[]).slice(0,3).map(t=>`<span class="badge">#${esc(t)}</span>`).join("")}
      </div>
      <span class="open-cue">→</span>
    </article>`;
  }

  function wireEntityCards(){
    $$("[data-entity-card]").forEach(card=>{
      card.onclick=e=>{
        if(e.target.closest("[data-fav-card]")) return;
        showEntity(card.dataset.entityCard,true);
      };
      card.onkeydown=e=>{
        if((e.key==="Enter"||e.key===" ") && !e.target.closest("[data-fav-card]")){
          e.preventDefault();showEntity(card.dataset.entityCard,true);
        }
      };
    });
    $$("[data-fav-card]").forEach(btn=>btn.onclick=e=>{
      e.stopPropagation();
      const active=toggleFavorite(btn.dataset.favCard);
      btn.classList.toggle("active",active);
      btn.textContent=active?"★":"☆";
      btn.title=active?"Quitar de favoritos":"Agregar a favoritos";
      toast(active?"Agregado a favoritos":"Quitado de favoritos");
    });
  }

  function showRegistry(push=true){
    if(push) pushHistory();
    currentView={type:"registry"};
    setActive("registry");
    setBreadcrumb("Registro maestro");
    setSearchVisibility(false);

    const rows=entities.slice().sort((a,b)=>a.title.localeCompare(b.title,"es"));
    $("#view").innerHTML=`
      <div class="page-title">
        <div>
          <h1>Registro maestro</h1>
          <p>Índice técnico de entidades, etiquetas maestras, alias y referencias.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Categoría</th><th>Etiqueta maestra</th><th>Alias</th><th>Etiquetas</th><th>Copiar</th></tr></thead>
          <tbody>
          ${rows.map(e=>`<tr>
            <td><button class="text-button" data-open-registry="${e.id}">${esc(e.title)}</button><br><small>${esc(e.id)}</small></td>
            <td>${esc(categoryName(e.category))}</td>
            <td><span class="badge master">${esc(e.masterTag || "—")}</span></td>
            <td>${esc((e.aliases||[]).join(", ") || "—")}</td>
            <td>${(e.tags||[]).map(t=>`<span class="badge">#${esc(t)}</span>`).join(" ") || "—"}</td>
            <td><div class="copy-group">
              <button class="mini-button" data-copy="${esc(e.title)}">Nombre</button>
              <button class="mini-button" data-copy="${esc(e.masterTag||"")}">Etiqueta</button>
              <button class="mini-button" data-copy="[[${esc(e.masterTag||e.id)}|${esc(e.title)}]]">Referencia</button>
            </div></td>
          </tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
    $$("[data-open-registry]").forEach(b=>b.onclick=()=>showEntity(b.dataset.openRegistry,true));
    $$("[data-copy]").forEach(b=>b.onclick=()=>copyText(b.dataset.copy));
    updateBack();
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
    const matches=[], lower=text.toLocaleLowerCase("es"), map=new Map();
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
    matches.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
    const filtered=[];
    for(const m of matches){
      const overlaps=filtered.some(x=>!(m.end<=x.start || m.start>=x.end));
      if(!overlaps) filtered.push(m);
    }
    return filtered.sort((a,b)=>a.start-b.start);
  }

  function showLinker(push=true){
    if(push) pushHistory();
    currentView={type:"linker"};
    setActive("linker");
    setBreadcrumb("Hipervinculador rápido");
    setSearchVisibility(false);

    $("#view").innerHTML=`
      <div class="page-title">
        <div>
          <h1>Hipervinculador rápido</h1>
          <p>Pega texto que ya tengas, detecta posibles entidades y decide cuáles convertir en vínculos internos.</p>
        </div>
      </div>
      <div class="two-col">
        <div class="panel" style="margin-top:0">
          <div class="panel-header"><h2>Texto</h2></div>
          <textarea id="linkerText" class="big">Esteban llegó a Bagdad acompañado de Eulalia. Después se habló de la Batalla de Bagdad.</textarea>
          <div class="copy-group" style="margin-top:9px">
            <button id="detectBtn" class="primary-button">Detectar</button>
            <button id="clearLinkerBtn" class="secondary-button">Limpiar</button>
          </div>
        </div>
        <div class="panel" style="margin-top:0">
          <div class="panel-header"><h2>Coincidencias</h2></div>
          <div id="detectedList" class="detected-list"><div class="empty">Pulsa Detectar.</div></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div><h2>Vista previa</h2><div class="meta">Los enlaces abren fichas internas.</div></div>
        </div>
        <div id="linkedPreview" class="preview">Todavía no se ha procesado el texto.</div>
      </div>
    `;
    $("#detectBtn").onclick=runDetection;
    $("#clearLinkerBtn").onclick=()=>{
      $("#linkerText").value="";
      $("#detectedList").innerHTML='<div class="empty">Sin texto.</div>';
      $("#linkedPreview").textContent="";
    };
    updateBack();
  }

  function runDetection(){
    const text=$("#linkerText").value;
    linkerState=detectText(text).map((m,i)=>({...m,index:i,selected:0,enabled:true}));
    const list=$("#detectedList");

    if(!linkerState.length){
      list.innerHTML='<div class="empty">No encontré coincidencias.</div>';
      renderLinkedPreview(text);
      return;
    }

    list.innerHTML=linkerState.map((m,i)=>{
      const unique=[], seen=new Set();
      for(const c of m.candidates){
        if(!seen.has(c.entity.id)){
          seen.add(c.entity.id);
          unique.push(c);
        }
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
        ${unique.length>1
          ? `<select data-select="${i}">${unique.map((c,idx)=>`<option value="${idx}">${esc(c.entity.title)} — ${esc(categoryName(c.entity.category))}</option>`).join("")}</select>`
          : `<div class="meta" style="margin-top:7px">${esc(unique[0].entity.title)} — ${esc(categoryName(unique[0].entity.category))}</div>`}
      </div>`;
    }).join("");

    $$("[data-enable]").forEach(el=>el.onchange=()=>{
      linkerState[+el.dataset.enable].enabled=el.checked;
      renderLinkedPreview(text);
    });
    $$("[data-select]").forEach(el=>el.onchange=()=>{
      linkerState[+el.dataset.select].selected=+el.value;
      renderLinkedPreview(text);
    });
    renderLinkedPreview(text);
  }

  function renderLinkedPreview(text){
    if(!linkerState.length){
      $("#linkedPreview").textContent=text;
      return;
    }
    let out="",pos=0;
    for(const m of linkerState){
      out += esc(text.slice(pos,m.start));
      if(m.enabled && m.candidates.length){
        const c=m.candidates[m.selected] || m.candidates[0];
        out += `<a href="#entity=${encodeURIComponent(c.entity.id)}" data-entity-link="${c.entity.id}">${esc(text.slice(m.start,m.end))}</a>`;
      } else {
        out += esc(text.slice(m.start,m.end));
      }
      pos=m.end;
    }
    out += esc(text.slice(pos));
    $("#linkedPreview").innerHTML=out;
    $$("[data-entity-link]").forEach(a=>a.onclick=ev=>{
      ev.preventDefault();
      showEntity(a.dataset.entityLink,true);
    });
  }

  function showEntity(id,push=true){
    const e=entities.find(x=>x.id===id);
    if(!e) return;

    if(push) pushHistory();
    currentView={type:"entity",id};
    addRecent(id);
    $$(".nav-button,.category-button").forEach(b=>b.classList.remove("active"));
    setBreadcrumb(`${categoryName(e.category)} / ${e.title}`);
    setSearchVisibility(false);

    const fav=isFavorite(id);
    $("#view").innerHTML=`
      <div class="entity-hero">
        <div>
          <div class="meta">${esc(categoryName(e.category))}</div>
          <h1>${esc(e.title)}</h1>
          <div class="badges">
            ${e.masterTag?`<span class="badge master">${esc(e.masterTag)}</span>`:""}
            ${(e.tags||[]).map(t=>`<span class="badge">#${esc(t)}</span>`).join("")}
          </div>
          <p style="line-height:1.6;color:#7f8da0;font-size:11px;max-width:850px">${esc(e.summary||"Sin resumen.")}</p>
          <div class="entity-tabs">
            <button>Resumen</button>
            <button>Relaciones</button>
            <button>Cronología</button>
            <button>Archivos</button>
            <button>Notas</button>
          </div>
        </div>
        <div class="entity-hero-actions">
          <button id="entityFavoriteBtn" class="star-button ${fav?"active":""}" title="${fav?"Quitar de favoritos":"Agregar a favoritos"}">${fav?"★":"☆"}</button>
          <button class="secondary-button" id="copyMasterTag">Copiar etiqueta</button>
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

      <div class="notice">Esta ficha sigue siendo estructural; las vistas especializadas se añadirán por categoría en las siguientes tandas.</div>
    `;

    $("#copyMasterTag").onclick=()=>copyText(e.masterTag||e.id);
    $("#entityFavoriteBtn").onclick=()=>{
      const active=toggleFavorite(id);
      const btn=$("#entityFavoriteBtn");
      btn.classList.toggle("active",active);
      btn.textContent=active?"★":"☆";
      btn.title=active?"Quitar de favoritos":"Agregar a favoritos";
      toast(active?"Agregado a favoritos":"Quitado de favoritos");
    };

    history.replaceState(null,"",`#entity=${encodeURIComponent(id)}`);
    updateBack();
  }

  function openDialog(defaultCategory){
    const category = defaultCategory || (currentView.type==="category" ? currentView.id : "personajes");
    $("#entityCategory").innerHTML=[...categoryMap].map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join("");
    $("#entityCategory").value=category;
    $("#entityTitle").value="";
    $("#entityMasterTag").value="";
    $("#entityMasterTag").dataset.touched="";
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
      alert("La etiqueta maestra ya existe.");
      return false;
    }

    const e={
      id:uid(),
      title,
      category,
      masterTag,
      aliases:$("#entityAliases").value.split(",").map(s=>s.trim()).filter(Boolean),
      tags:$("#entityTags").value.split(",").map(s=>s.trim()).filter(Boolean),
      summary:$("#entitySummary").value.trim()
    };

    await putEntity(e);
    entities=await getAll();
    $("#entityDialog").close();
    toast("Elemento guardado");
    showCategory(category,true);
    return true;
  }

  function searchEntities(q){
    const term=q.trim().toLocaleLowerCase("es");
    if(!term){
      const recent=resolveIds(getLocalArray("sethoria-a2-recent")).slice(0,6);
      const rest=entities.filter(e=>!recent.some(r=>r.id===e.id)).slice(0,6);
      return [...recent,...rest];
    }
    return entities.filter(e=>{
      const hay=[
        e.title,
        e.masterTag,
        ...(e.aliases||[]),
        ...(e.tags||[]),
        categoryName(e.category)
      ].join(" ").toLocaleLowerCase("es");
      return hay.includes(term);
    }).slice(0,20);
  }

  function openPalette(prefill=""){
    $("#commandPalette").classList.remove("hidden");
    $("#commandPalette").setAttribute("aria-hidden","false");
    $("#paletteSearch").value=prefill || "";
    paletteIndex=0;
    renderPalette(prefill || "");
    setTimeout(()=>$("#paletteSearch").focus(),0);
  }
  function closePalette(){
    $("#commandPalette").classList.add("hidden");
    $("#commandPalette").setAttribute("aria-hidden","true");
  }
  function renderPalette(q){
    paletteItems=searchEntities(q);
    $("#paletteResults").innerHTML=paletteItems.length
      ? paletteItems.map((e,i)=>`<button class="palette-item ${i===paletteIndex?"selected":""}" data-palette-id="${e.id}" data-palette-index="${i}">
          <span>${esc(e.title)}</span><small>${esc(categoryName(e.category))}</small>
        </button>`).join("")
      : `<div class="empty">Sin resultados.</div>`;

    $$("[data-palette-id]").forEach(b=>b.onclick=()=>{
      closePalette();
      showEntity(b.dataset.paletteId,true);
    });
  }
  function paletteMove(delta){
    if(!paletteItems.length) return;
    paletteIndex=(paletteIndex+delta+paletteItems.length)%paletteItems.length;
    renderPalette($("#paletteSearch").value);
    const el=document.querySelector(`[data-palette-index="${paletteIndex}"]`);
    el?.scrollIntoView({block:"nearest"});
  }

  async function copyText(text){
    await navigator.clipboard.writeText(text);
    toast("Copiado al portapapeles");
  }

  async function exportBackup(){
    const payload={
      format:"sethoria-atlas-prototipo-a2",
      version:3,
      exportedAt:new Date().toISOString(),
      entities,
      ui:{
        favorites:getFavorites(),
        recent:getLocalArray("sethoria-a2-recent")
      }
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
    if(!payload || !Array.isArray(payload.entities)) throw new Error("Archivo no válido");

    await clearEntities();
    for(const e of payload.entities) await putEntity(e);
    entities=await getAll();

    if(payload.ui?.favorites) setLocalArray("sethoria-a2-favorites",payload.ui.favorites);
    if(payload.ui?.recent) setLocalArray("sethoria-a2-recent",payload.ui.recent);

    toast("Respaldo importado");
    showHome(true);
  }

  async function init(){
    buildNav();
    restoreSidebar();
    await openDB();
    entities=await ensureSeed();

    $("#brandHome").onclick=()=>showHome(true);
    $("#sidebarToggle").onclick=toggleSidebar;
    $("#backBtn").onclick=goBack;
    $("#registryBtn").onclick=()=>showRegistry(true);
    $("#linkerBtn").onclick=()=>showLinker(true);
    $("#newEntityBtn").onclick=()=>openDialog();
    $("#topSearchBtn").onclick=()=>openPalette();
    $("#shortcutsBtn").onclick=()=>$("#shortcutsDialog").showModal();

    $("#closeDialogBtn").onclick=()=>$("#entityDialog").close();
    $("#cancelDialogBtn").onclick=()=>$("#entityDialog").close();

    $("#entityTitle").addEventListener("input",()=>{
      if(!$("#entityMasterTag").dataset.touched){
        $("#entityMasterTag").value=`${slug($("#entityCategory").value)}_${slug($("#entityTitle").value)}`;
      }
    });
    $("#entityCategory").addEventListener("change",()=>{
      if(!$("#entityMasterTag").dataset.touched){
        $("#entityMasterTag").value=`${slug($("#entityCategory").value)}_${slug($("#entityTitle").value)}`;
      }
    });
    $("#entityMasterTag").addEventListener("input",()=>$("#entityMasterTag").dataset.touched="1");
    $("#entityForm").addEventListener("submit",async ev=>{
      ev.preventDefault();
      await saveForm();
    });

    $("#exportBtn").onclick=exportBackup;
    $("#importInput").onchange=async e=>{
      const f=e.target.files?.[0];
      if(!f) return;
      try{ await importBackup(f); }
      catch(err){ alert("No pude importar el respaldo: "+err.message); }
      e.target.value="";
    };

    $("#commandPalette").onclick=e=>{
      if(e.target===$("#commandPalette")) closePalette();
    };
    $("#paletteSearch").oninput=e=>{
      paletteIndex=0;
      renderPalette(e.target.value);
    };
    $("#paletteSearch").onkeydown=e=>{
      if(e.key==="ArrowDown"){
        e.preventDefault();paletteMove(1);
      }else if(e.key==="ArrowUp"){
        e.preventDefault();paletteMove(-1);
      }else if(e.key==="Enter" && paletteItems[paletteIndex]){
        e.preventDefault();
        const id=paletteItems[paletteIndex].id;
        closePalette();
        showEntity(id,true);
      }else if(e.key==="Escape"){
        closePalette();
      }
    };

    document.addEventListener("keydown",e=>{
      const tag=(document.activeElement?.tagName||"").toLowerCase();
      const typing=["input","textarea","select"].includes(tag);

      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="k"){
        e.preventDefault();openPalette();
      }else if(!typing && e.key==="/"){
        e.preventDefault();openPalette();
      }else if(!typing && e.key.toLowerCase()==="n"){
        e.preventDefault();openDialog();
      }else if(e.altKey && e.key==="ArrowLeft"){
        e.preventDefault();goBack();
      }else if(e.key==="Escape"){
        if(!$("#commandPalette").classList.contains("hidden")) closePalette();
        if($("#app").classList.contains("mobile-sidebar-open")) $("#app").classList.remove("mobile-sidebar-open");
      }
    });

    window.addEventListener("resize",()=>{
      if(!window.matchMedia("(max-width:700px)").matches){
        $("#app").classList.remove("mobile-sidebar-open");
      }
    });

    const hash=location.hash;
    if(hash.startsWith("#entity=")){
      showEntity(decodeURIComponent(hash.slice(8)),false);
    }else{
      showHome(false);
    }
    updateBack();
  }

  init().catch(err=>{
    console.error(err);
    $("#view").innerHTML=`<div class="panel"><h2>Error al iniciar</h2><p>${esc(err.message)}</p></div>`;
  });
})();
