window.SETHORIA_DEMO = {
  categories: [
    ["personajes","Personajes"],
    ["grupos","Grupos"],
    ["arcos","Arcos"],
    ["eventos","Eventos"],
    ["timeline-a","Línea de tiempo A"],
    ["timeline-b","Línea de tiempo B"],
    ["lugares","Lugares"],
    ["rutas","Rutas"],
    ["batallas","Batallas"],
    ["barcos","Barcos"],
    ["criaturas-magicas","Criaturas mágicas"],
    ["criaturas-reales","Criaturas reales"],
    ["culturas","Culturas y sociedades"],
    ["armas","Armas"],
    ["ropa","Ropa"],
    ["objetos","Objetos"],
    ["relaciones","Relaciones"],
    ["historia-real","Historia real"],
    ["reglas","Reglas de Sethoria"],
    ["informacion-general","Información general"],
    ["musica","Música"],
    ["fuentes","Fuentes de investigación"],
    ["otros","Otros datos"],
    ["notas","Notas"]
  ],

  seedEntities: [
    {
      id:"demo-esteban",
      title:"Esteban",
      subtitle:"Ficha de demostración de Plantilla 0",
      category:"personajes",
      masterTag:"personaje_esteban",
      aliases:[],
      tags:["grupo-principal","demo"],
      summary:"Entidad de demostración para probar la nueva ficha modular. Eulalia y el Grupo principal aparecen como vínculos internos.",
      facts:[
        {label:"Tipo",value:"Personaje"},
        {label:"Uso",value:"Demostración"},
        {label:"Plantilla",value:"Personajes"}
      ],
      relations:[
        {targetId:"demo-eulalia",type:"Relación de ejemplo"},
        {targetId:"demo-grupo",type:"Pertenece a"}
      ],
      timeline:[
        {date:"Entrada 1",title:"Ejemplo cronológico",description:"Una entrada breve vinculada con Eulalia."},
        {date:"Entrada 2",title:"Segundo punto",description:"Sirve para comprobar jerarquía y lectura."}
      ],
      appearances:["demo-batalla-bagdad"],
      sections:[
        {title:"Uso de esta ficha",body:"La Plantilla 0 conserva una estructura común, pero las pestañas se adaptan a la categoría."}
      ],
      sources:[
        {title:"Fuente de demostración",note:"Ejemplo de cómo se separan las fuentes del contenido principal."}
      ]
    },
    {
      id:"demo-eulalia",
      title:"Eulalia",
      category:"personajes",
      masterTag:"personaje_eulalia",
      aliases:[],
      tags:["grupo-principal","demo"],
      summary:"Entidad de demostración conectada con Esteban.",
      facts:{Tipo:"Personaje",Uso:"Demostración"},
      relations:[{targetId:"demo-esteban",type:"Relación de ejemplo"}]
    },
    {
      id:"demo-bagdad",
      title:"Bagdad",
      category:"lugares",
      masterTag:"lugar_bagdad",
      aliases:["Baghdad"],
      tags:["ciudad","demo"],
      summary:"Ejemplo deliberado de lugar relacionado con la Batalla de Bagdad.",
      facts:[
        {label:"Tipo",value:"Lugar"},
        {label:"Uso",value:"Prueba de mapa y conexiones"}
      ],
      relations:[{targetId:"demo-batalla-bagdad",type:"Evento relacionado"}],
      timeline:[
        {date:"Ejemplo",title:"Historia del lugar",description:"Entrada de prueba para la pestaña Historia."}
      ]
    },
    {
      id:"demo-batalla-bagdad",
      title:"Batalla de Bagdad",
      category:"batallas",
      masterTag:"batalla_bagdad_demo",
      aliases:["Batalla de la ciudad de Bagdad"],
      tags:["Bagdad","demo"],
      summary:"Ejemplo para comprobar fuerzas, desarrollo, mapa, fuentes y vínculos con Bagdad.",
      participants:[
        {targetId:"demo-esteban",role:"Participante de prueba"},
        {targetId:"demo-eulalia",role:"Participante de prueba"}
      ],
      relations:[{targetId:"demo-bagdad",type:"Lugar"}],
      timeline:[
        {date:"Fase 1",title:"Inicio",description:"Entrada de demostración."},
        {date:"Fase 2",title:"Desarrollo",description:"Segunda entrada de demostración."}
      ],
      facts:{Tipo:"Batalla",Estado:"Demostración"}
    },
    {
      id:"demo-grupo",
      title:"Grupo principal",
      category:"grupos",
      masterTag:"grupo_principal",
      aliases:["Grupo A"],
      tags:["demo"],
      summary:"Grupo de ejemplo con Esteban y Eulalia.",
      members:[
        {targetId:"demo-esteban",role:"Miembro"},
        {targetId:"demo-eulalia",role:"Miembro"}
      ],
      facts:{Tipo:"Grupo",Uso:"Demostración"}
    }
  ]
};
