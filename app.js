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

  const categoryIcons = {
    "personajes":"♙","grupos":"◉","arcos":"⌁","eventos":"◆","timeline-a":"↠","timeline-b":"↞",
    "lugares":"⌖","rutas":"⇢","batallas":"⚔","barcos":"◒","criaturas-magicas":"✦","criaturas-reales":"◈",
    "culturas":"⌘","armas":"†","ropa":"◇","objetos":"□","relaciones":"∞","historia-real":"◷",
    "reglas":"§","informacion-general":"≡","musica":"♫","fuentes":"⌕","otros":"···","notas":"✎"
  };

  const categoryGroups = [
    {title:"Narrativa", ids:["personajes","grupos","arcos","eventos","timeline-a","timeline-b","relaciones"]},
    {title:"Mundo", ids:["lugares","rutas","barcos","criaturas-magicas","criaturas-reales","culturas"]},
    {title:"Técnica", ids:["batallas","armas","ropa","objetos"]},
    {title:"Contexto", ids:["historia-real","reglas","informacion-general","musica","fuentes"]},
    {title:"Archivo", ids:["otros","notas"]}
  ];

  function esc(s=""){
    return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }
  function categoryName(id){ return categoryMap.get(id) || id; }

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
  function tx(mode="readonly"){ return db.transaction(STORE,mode).objectStore(STORE); }
  function getAll(){
    return new Promise((resolve,reject)=>{
      const r=tx().getAll();
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error);
    });
  }
  function putEntity(entity){
    return new Promise((resolve,reject)=>{
      const r=tx("readwrite").put(entity);
      r.onsuccess=()=>resolve(entity);
      r.onerror=()=>reject(r.error);
    });
  }
  function clearEntities(){
    return new Promise((resolve,reject)=>{
      const r=tx("readwrite").clear();
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
    clearTimeout(window.__toast);
    window.__toast=setTimeout(()=>el.classList.add("hidden"),1400);
  }

  function buildNav(){
    $("#categoryNav").innerHTML=categoryGroups.map(group=>`
      <section class="nav-group">
        <div class="sidebar-title">${esc(group.title)}</div>
        ${group.ids.map(id=>`
          <button class="category-button" data-nav="${id}" data-category="${id}" title="${esc(categoryName(id))}">
            <span class="cat-icon">${categoryIcons[id]||"•"}</span>
            <span class="nav-label">${esc(categoryName(id))}</span>
          </button>
        `).join("")}
      </section>
    `).join("");
    $$("[data-category]").forEach(b=>b.onclick=()=>showCategory(b.dataset.category));
  }

  function setActive(key){
    $$(".category-button,.nav-button").forEach(b=>b.classList.remove("active"));
    const active=document.querySelector(`[data-nav="${CSS.escape(key)}"]`);
    if(active) active.classList.add("active");
  }

  function toggleSidebar(){
    const app=$("#app");
    const mobile=window.matchMedia("(max-width:680px)").matches;
    if(mobile){
      app.classList.toggle("mobile-sidebar-open");
      return;
    }
    const collapsed=app.classList.toggle("sidebar-collapsed");
    localStorage.setItem("sethoria-a33-sidebar",collapsed?"1":"0");
  }
  function restoreSidebar(){
    if(!window.matchMedia("(max-width:680px)").matches &&
       localStorage.getItem("sethoria-a33-sidebar")==="1"){
      $("#app").classList.add("sidebar-collapsed");
    }
  }

  function homeCard(id){
    return `<button class="menu-card" data-home-category="${id}" title="${esc(categoryName(id))}">
      <span class="menu-icon">${categoryIcons[id]||"•"}</span>
      <span class="menu-title">${esc(categoryName(id))}</span>
    </button>`;
  }

  function getImage(e){
    return e.image || e.imageUrl || e.thumbnail || e.cover || "";
  }

  function itemCard(e){
    const image=getImage(e);
    return `<button class="item-card" data-item="${e.id}" title="${esc(e.title)}">
      <span class="item-visual">
        ${image
          ? `<img src="${esc(image)}" alt="">`
          : `<span class="item-placeholder">${categoryIcons[e.category]||"•"}</span>`}
      </span>
      <span class="item-title">${esc(e.title)}</span>
    </button>`;
  }

  function backButton(){
    return `<button class="back-button" id="pageBack" title="Regresar" aria-label="Regresar">←</button>`;
  }

  function showHome(){
    currentView={type:"home"};
    setActive("");
    const all=categoryGroups.flatMap(g=>g.ids);
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
    $$("[data-home-category]").forEach(b=>b.onclick=()=>showCategory(b.dataset.homeCategory));
  }

  function showCategory(id){
    currentView={type:"category",id};
    setActive(id);
    const list=entities.filter(e=>e.category===id).sort((a,b)=>a.title.localeCompare(b.title,"es"));
    $("#view").innerHTML=`
      <div class="page-row">
        ${backButton()}
        <h1>${esc(categoryName(id))}</h1>
      </div>
      ${list.length
        ? `<div class="cards-grid">${list.map(itemCard).join("")}</div>`
        : `<div class="empty">Sin elementos todavía.</div>`}
    `;
    $("#pageBack").onclick=showHome;
    $$("[data-item]").forEach(b=>b.onclick=()=>showEntity(b.dataset.item));
  }

  function showEntity(id){
    const e=entities.find(x=>x.id===id);
    if(!e) return;
    currentView={type:"entity",id};
    setActive("");
    const image=getImage(e);

    $("#view").innerHTML=`
      <div class="entity-wrap">
        <div class="page-row">
          ${backButton()}
          <h1>${esc(categoryName(e.category))}</h1>
        </div>

        <section class="entity-hero">
          ${image ? `<img class="entity-image" src="${esc(image)}" alt="">` : ""}
          <div class="entity-meta">${esc(categoryName(e.category))}</div>
          <h1>${esc(e.title)}</h1>
          <p>${esc(e.summary || "Sin resumen.")}</p>
          <div style="clear:both"></div>
        </section>

        <details class="details-box">
          <summary>Identificación</summary>
          <div class="details-content">
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
        <div class="page-row">
          ${backButton()}
          <h1>Registro maestro</h1>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Categoría</th><th>Etiqueta maestra</th><th>Alias</th><th>Copiar</th></tr></thead>
            <tbody>
              ${rows.map(e=>`<tr>
                <td><button class="text-button" data-open="${e.id}">${esc(e.title)}</button></td>
                <td>${esc(categoryName(e.category))}</td>
                <td><span class="badge master">${esc(e.masterTag||"—")}</span></td>
                <td>${esc((e.aliases||[]).join(", ")||"—")}</td>
                <td><div class="copy-group">
                  <button class="mini-button" data-copy="${esc(e.masterTag||e.id)}">Etiqueta</button>
                  <button class="mini-button" data-copy="[[${esc(e.masterTag||e.id)}|${esc(e.title)}]]">Referencia</button>
                </div></td>
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
        <div class="page-row">
          ${backButton()}
          <h1>Hipervinculador</h1>
        </div>
        <div class="two-col">
          <div class="panel">
            <h2>Texto</h2>
            <textarea id="linkerText" class="big">Esteban llegó a Bagdad acompañado de Eulalia. Después se habló de la Batalla de Bagdad.</textarea>
            <div class="copy-group" style="margin-top:8px">
              <button id="detectBtn" class="mini-button">Detectar</button>
              <button id="clearBtn" class="mini-button">Limpiar</button>
            </div>
          </div>
          <div class="panel">
            <h2>Coincidencias</h2>
            <div id="detectedList" class="detected-list"><div class="empty">Pulsa Detectar.</div></div>
          </div>
        </div>
        <div class="panel" style="margin-top:11px">
          <h2>Vista previa</h2>
          <div id="linkedPreview" class="preview">Todavía no se ha procesado el texto.</div>
        </div>
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
      renderLinkedPreview(text);return;
    }
    list.innerHTML=linkerState.map((m,i)=>{
      const unique=[], seen=new Set();
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
        out+=`<a href="#entity=${encodeURIComponent(c.entity.id)}" data-link="${c.entity.id}">${esc(text.slice(m.start,m.end))}</a>`;
      }else out+=esc(text.slice(m.start,m.end));
      pos=m.end;
    }
    out+=esc(text.slice(pos));
    $("#linkedPreview").innerHTML=out;
    $$("[data-link]").forEach(a=>a.onclick=e=>{
      e.preventDefault();showEntity(a.dataset.link)
    });
  }

  async function copyText(text){
    await navigator.clipboard.writeText(text);
    toast("Copiado");
  }

  async function exportBackup(){
    const payload={
      format:"sethoria-atlas-prototipo-a33",
      version:7,
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
      const f=e.target.files?.[0];
      if(!f) return;
      try{await importBackup(f)}
      catch(err){alert("No pude importar el respaldo: "+err.message)}
      e.target.value="";
    };

    document.addEventListener("click",e=>{
      if(window.matchMedia("(max-width:680px)").matches &&
         !e.target.closest(".sidebar") &&
         !e.target.closest("#sidebarResizeBtn")){
        $("#app").classList.remove("mobile-sidebar-open");
      }
    });

    const hash=location.hash;
    if(hash.startsWith("#entity=")) showEntity(decodeURIComponent(hash.slice(8)));
    else showHome();
  }

  init().catch(err=>{
    console.error(err);
    $("#view").innerHTML=`<div class="empty">Error al iniciar: ${esc(err.message)}</div>`;
  });
})();
