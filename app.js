(() => {
  const DB_NAME = "sethoria-atlas-prototipo-a";
  const STORE = "entities";

  let db;
  let entities = [];
  let currentView = {type:"home"};
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

  const iconPaths = {
    home:'<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V20h11v-9.5"/><path d="M9.5 20v-6h5v6"/>',
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
    back:'<path d="m15 5-7 7 7 7"/><path d="M8 12h11"/>'
  };

  function icon(name, cls=""){
    const paths=iconPaths[name]||iconPaths.otros;
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  function esc(s=""){
    return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }
  function categoryName(id){ return categoryMap.get(id)||id; }

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
    if(all.length) return all;
    for(const e of window.SETHORIA_DEMO.seedEntities) await putEntity(e);
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
    $$("[data-icon]").forEach(el=>{
      el.innerHTML=icon(el.dataset.icon);
    });
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

    $$("[data-category]").forEach(btn=>{
      btn.onclick=()=>showCategory(btn.dataset.category);
    });
  }

  function setActive(key){
    $$(".nav-item").forEach(b=>b.classList.remove("active"));
    const active=document.querySelector(`[data-nav="${CSS.escape(key)}"]`);
    if(active) active.classList.add("active");
  }

  function toggleSidebar(){
    const app=$("#app");
    if(window.matchMedia("(max-width:650px)").matches) return;
    const collapsed=app.classList.toggle("sidebar-collapsed");
    localStorage.setItem("sethoria-a4-sidebar",collapsed?"1":"0");
  }
  function restoreSidebar(){
    if(!window.matchMedia("(max-width:650px)").matches &&
       localStorage.getItem("sethoria-a4-sidebar")==="1"){
      $("#app").classList.add("sidebar-collapsed");
    }
  }

  function getImage(entity){
    return entity.image || entity.imageUrl || entity.thumbnail || entity.cover || "";
  }

  function homeCard(id,index){
    return `<button class="menu-card" data-home-category="${id}" style="--delay:${Math.min(index,18)*24}ms" title="${esc(categoryName(id))}">
      <span class="card-shine"></span>
      <span class="menu-icon">${icon(id)}</span>
      <span class="menu-title">${esc(categoryName(id))}</span>
    </button>`;
  }

  function itemCard(entity,index){
    const image=getImage(entity);
    return `<button class="item-card" data-item="${entity.id}" style="--delay:${Math.min(index,20)*22}ms" title="${esc(entity.title)}">
      <span class="item-visual">
        ${image
          ? `<img class="item-image" src="${esc(image)}" alt="">`
          : `<span class="item-placeholder">${icon(entity.category)}</span>`}
      </span>
      <span class="item-title">${esc(entity.title)}</span>
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
          <section class="home-title-card">
            <h1>Sethoria Atlas</h1>
          </section>
        </div>
        <div class="home-grid">
          ${all.map(homeCard).join("")}
        </div>
      </div>
    `;

    $$("[data-home-category]").forEach(btn=>{
      btn.onclick=()=>showCategory(btn.dataset.homeCategory);
    });
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
      ${list.length
        ? `<div class="cards-grid">${list.map(itemCard).join("")}</div>`
        : `<div class="empty">Sin elementos todavía.</div>`}
    `;

    $("#pageBack").onclick=showHome;
    $$("[data-item]").forEach(btn=>{
      btn.onclick=()=>showEntity(btn.dataset.item);
    });
  }

  function showEntity(id){
    const e=entities.find(x=>x.id===id);
    if(!e) return;

    currentView={type:"entity",id};
    setActive("");
    const image=getImage(e);

    $("#view").innerHTML=`
      <div class="entity-wrap">
        <div class="page-head">
          ${backButton()}
          <h1 class="page-title">${esc(categoryName(e.category))}</h1>
        </div>

        <div class="entity-layout">
          <section class="entity-hero">
            <div class="entity-kind">${esc(categoryName(e.category))}</div>
            <h1>${esc(e.title)}</h1>
            <p>${esc(e.summary||"Sin resumen.")}</p>
          </section>
          ${image ? `<img class="entity-image" src="${esc(image)}" alt="">` : ""}
        </div>

        <details class="details-box">
          <summary>Identificación técnica</summary>
          <div class="details-inner">
            <table class="details-table">
              <tr><th>ID</th><td>${esc(e.id)}</td></tr>
              <tr><th>Etiqueta maestra</th><td>${esc(e.masterTag||"—")}</td></tr>
              <tr><th>Alias</th><td>${esc((e.aliases||[]).join(", ")||"—")}</td></tr>
              <tr><th>Etiquetas</th><td>${esc((e.tags||[]).join(", ")||"—")}</td></tr>
            </table>
          </div>
        </details>
      </div>
    `;

    $("#pageBack").onclick=()=>showCategory(e.category);
    history.replaceState(null,"",`#entity=${encodeURIComponent(id)}`);
  }

  function showRegistry(){
    currentView={type:"registry"};
    setActive("registry");

    const rows=entities.slice().sort((a,b)=>a.title.localeCompare(b.title,"es"));

    $("#view").innerHTML=`
      <div class="tool-page">
        <div class="page-head">
          ${backButton()}
          <h1 class="page-title">Registro maestro</h1>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Etiqueta maestra</th>
                <th>Alias</th>
                <th>Copiar</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(e=>`<tr>
                <td><button class="text-button" data-open="${e.id}">${esc(e.title)}</button></td>
                <td>${esc(categoryName(e.category))}</td>
                <td><span class="badge master">${esc(e.masterTag||"—")}</span></td>
                <td>${esc((e.aliases||[]).join(", ")||"—")}</td>
                <td>
                  <div class="copy-row">
                    <button class="mini-button" data-copy="${esc(e.masterTag||e.id)}">Etiqueta</button>
                    <button class="mini-button" data-copy="[[${esc(e.masterTag||e.id)}|${esc(e.title)}]]">Referencia</button>
                  </div>
                </td>
              </tr>`).join("")}
            </tbody>
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
    for(const a of e.aliases||[]) out.push({term:a,priority:3,source:"Alias"});
    for(const t of e.tags||[]) if(String(t).length>=4) out.push({term:t,priority:4,source:"Etiqueta"});
    return out;
  }

  function detectText(text){
    const lower=text.toLocaleLowerCase("es");
    const map=new Map();
    const matches=[];

    for(const e of entities){
      for(const info of termsForEntity(e)){
        const term=String(info.term).trim();
        if(!term) continue;
        const t=term.toLocaleLowerCase("es");
        let start=0;

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
        <div class="page-head">
          ${backButton()}
          <h1 class="page-title">Hipervinculador</h1>
        </div>

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
            <div id="detectedList" class="detected-list">
              <div class="empty">Pulsa Detectar.</div>
            </div>
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
      const unique=[];
      const seen=new Set();

      for(const c of m.candidates){
        if(!seen.has(c.entity.id)){
          seen.add(c.entity.id);
          unique.push(c);
        }
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

    $$("[data-enable]").forEach(el=>{
      el.onchange=()=>{
        linkerState[+el.dataset.enable].enabled=el.checked;
        renderLinkedPreview(text);
      };
    });
    $$("[data-select]").forEach(el=>{
      el.onchange=()=>{
        linkerState[+el.dataset.select].selected=+el.value;
        renderLinkedPreview(text);
      };
    });

    renderLinkedPreview(text);
  }

  function renderLinkedPreview(text){
    if(!linkerState.length){
      $("#linkedPreview").textContent=text;
      return;
    }

    let out="";
    let pos=0;

    for(const m of linkerState){
      out+=esc(text.slice(pos,m.start));

      if(m.enabled&&m.candidates.length){
        const c=m.candidates[m.selected]||m.candidates[0];
        out+=`<a href="#entity=${encodeURIComponent(c.entity.id)}" data-link="${c.entity.id}">${esc(text.slice(m.start,m.end))}</a>`;
      }else{
        out+=esc(text.slice(m.start,m.end));
      }
      pos=m.end;
    }
    out+=esc(text.slice(pos));

    $("#linkedPreview").innerHTML=out;
    $$("[data-link]").forEach(a=>{
      a.onclick=e=>{
        e.preventDefault();
        showEntity(a.dataset.link);
      };
    });
  }

  async function copyText(text){
    await navigator.clipboard.writeText(text);
    toast("Copiado");
  }

  async function exportBackup(){
    const payload={
      format:"sethoria-atlas-prototipo-a4",
      version:8,
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
    buildNav();
    hydrateStaticIcons();
    restoreSidebar();

    await openDB();
    entities=await ensureSeed();

    $("#brandHome").onclick=showHome;
    $("#sidebarResizeBtn").onclick=e=>{
      e.stopPropagation();
      toggleSidebar();
    };
    $("#registryBtn").onclick=showRegistry;
    $("#linkerBtn").onclick=showLinker;
    $("#exportBtn").onclick=exportBackup;

    $("#importInput").onchange=async e=>{
      const file=e.target.files?.[0];
      if(!file) return;
      try{
        await importBackup(file);
      }catch(err){
        alert("No pude importar el respaldo: "+err.message);
      }
      e.target.value="";
    };

    const hash=location.hash;
    if(hash.startsWith("#entity=")){
      showEntity(decodeURIComponent(hash.slice(8)));
    }else{
      showHome();
    }
  }

  init().catch(err=>{
    console.error(err);
    $("#view").innerHTML=`<div class="empty">Error al iniciar: ${esc(err.message)}</div>`;
  });
})();
