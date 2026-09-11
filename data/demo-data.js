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
      category:"personajes",
      masterTag:"personaje_esteban",
      aliases:[],
      tags:["grupo-principal","demo"],
      summary:"Entidad de demostración para probar navegación, búsqueda e hipervínculos."
    },
    {
      id:"demo-eulalia",
      title:"Eulalia",
      category:"personajes",
      masterTag:"personaje_eulalia",
      aliases:[],
      tags:["grupo-principal","demo"],
      summary:"Entidad de demostración para probar conexiones."
    },
    {
      id:"demo-bagdad",
      title:"Bagdad",
      category:"lugares",
      masterTag:"lugar_bagdad",
      aliases:["Baghdad"],
      tags:["ciudad","demo"],
      summary:"Ejemplo deliberado de nombre que puede coincidir con otras entidades."
    },
    {
      id:"demo-batalla-bagdad",
      title:"Batalla de Bagdad",
      category:"batallas",
      masterTag:"batalla_bagdad_demo",
      aliases:["Batalla de la ciudad de Bagdad"],
      tags:["Bagdad","demo"],
      summary:"Ejemplo para comprobar resolución de nombres ambiguos."
    },
    {
      id:"demo-grupo",
      title:"Grupo principal",
      category:"grupos",
      masterTag:"grupo_principal",
      aliases:["Grupo A"],
      tags:["demo"],
      summary:"Grupo de ejemplo."
    }
  ]
};