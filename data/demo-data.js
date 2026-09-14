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
      subtitle:"Estudiante de ingeniería mexicano y miembro del grupo principal",
      category:"personajes",
      masterTag:"personaje_esteban",
      aliases:["Chogui","Estebancito"],
      tags:["grupo-principal","mexico","demo"],
      summary:"Esteban integra el grupo principal de viajeros. Al inicio puede ser extremadamente tímido con desconocidos y tiende al autosabotaje, aunque cuando adquiere confianza llega a desenvolverse con mucha soltura. Es noble, observador, prudente y analítico; combina formación técnica con un conocimiento especialmente amplio de criaturas mitológicas y legendarias.",
      featuredQuote:{text:"No distingue el dolor de la muerte como si fueran lo mismo, pero tampoco soporta quedarse inmóvil cuando cree que algo debe hacerse.",context:"Frase de muestra para el borrador del Perfil."},
      character:{
        info:{
          personal:{aka:["Chogui (todo el grupo)","Estebancito (Eulalia, Lucila, Tina, Ariadna y Emiliano)"],gender:"Masculino",nationality:"Mexicana",culture:"Mexicana",languages:["Español"],religion:"—",occupation:"Estudiante de ingeniería",birth:"—, México",death:"—",age:"21 años (primera aparición)",civilStatus:"Soltero*"},
          story:{firstAppearance:"Piratas",importantRelations:["♥ Eulalia","✦ Wiremu"]},
          appearance:{hair:"—",eyes:"—",skin:"—",build:"—"}
        },
        profile:{
          personality:"Con desconocidos, la timidez de Esteban puede ser extrema durante las primeras interacciones. Con confianza puede desenvolverse con mucha mayor soltura e incluso parecer casi extrovertido. Tiende a subestimarse y a sabotear sus propias expectativas. Es cuidadoso al tomar decisiones, evalúa la información antes de actuar y no equipara automáticamente hacer daño con matar.",
          psychology:"Su inseguridad y la falta de confianza en sí mismo son conflictos recurrentes. Durante Japón, después de momentos de fuerte tensión y cansancio, una Kitsune llega a insistirle en que necesita tener más fe en sí mismo.",
          capabilities:["Formación universitaria en ingeniería.","Conocimiento excepcional de criaturas mitológicas, animales fantásticos y leyendas; reconoce, entre otros, al Wendigo, Nue, Pouakai y el Holandés Errante.","Supervivencia básica.","Capacidad para analizar problemas y detectar información táctica incompleta.","Puede resistir entre uno y dos días sin dormir cuando la situación lo exige, aunque el cansancio termina afectándolo.","Ha comido insectos y no los considera automáticamente algo imposible de consumir."],
          weaknesses:"No es un especialista universal. Su formación y sus conocimientos tienen límites claros; el cansancio, la inseguridad y la falta de experiencia en campos específicos pueden afectarlo. Cuando un problema rebasa su formación necesita apoyarse en personas con conocimientos más especializados.",
          customs:["Muestra una afinidad especial por adultos mayores, niños y perros; con ellos suele perder la timidez más fácilmente.","Puede conversar durante horas con adultos sobre anécdotas y experiencias.","Conoce y valora tradiciones como radios locales, peregrinaciones, danzas y mayordomías."],
          tastes:["Suele sentirse atraído por mujeres que percibe como particulares o distintas; esa preferencia no elimina su tendencia a autosabotear cualquier expectativa romántica."]
        },
        appearanceTab:{general:"La apariencia desarrollada todavía no está cerrada en canon. Esta sección existe para que más adelante puedan añadirse descripciones más completas sin recargar la tabla lateral.",clothing:"Cuando un atuendo sea importante conviene describirlo aquí y no duplicar esa explicación en Galería.",equipment:"Aquí pueden resumirse objetos de uso frecuente cuando de verdad ayuden a identificar al personaje.",weapons:"—",distinctive:"Las cuatro filas de la tabla lateral sirven solo como identificación rápida. Rasgos físicos más complejos o cambios importantes deben explicarse aquí."},
        history:[{title:"Antes de Sethoria",body:"Es mexicano y estudiante de ingeniería. Antes de llegar ya posee un conocimiento poco común sobre seres mitológicos, animales fantásticos y leyendas, aprendido principalmente mediante libros y bibliotecas. También cuenta con conocimientos básicos de supervivencia y familiaridad con diversas tradiciones populares mexicanas."},{title:"Piratas",body:"Durante el arco de los Piratas conoce a Eulalia. La atracción aparece primero del lado de Esteban; por su propia inseguridad no la convierte inmediatamente en una expectativa de relación. Esta etapa también establece su convivencia inicial con varios de los viajeros que después forman parte de su círculo cercano."},{title:"Japón",body:"Su interés por Eulalia aumenta gradualmente. Durante la crisis del Wendigo participa junto con Eulalia, Wiremu e Isamu y coopera con el clan de Chiba. Su conocimiento de criaturas resulta útil para identificar amenazas y proponer cómo enfrentarlas. Tras la tensión acumulada necesita descansar; una Kitsune le insiste en que debería confiar más en sí mismo."},{title:"ebu gogo",body:"La relación entre Esteban y Eulalia deja de ser únicamente una cercanía creciente y ambos pasan a ser pareja."},{title:"Mali",body:"Para esta etapa Esteban y Eulalia ya funcionan como una pareja estable. Durante los acontecimientos ligados a los argentinos de Villa Epecuén tiene roces con Alfredo Houssay, mientras Matías Ferreyra y Verónica Bianchi consiguen su confianza con mayor rapidez."},{title:"Constantinopla",body:"La relación con Eulalia atraviesa intentos de reconciliación. En uno de ellos mantienen relaciones sexuales y Eulalia queda embarazada; la situación tiene un componente irónico porque ocurre precisamente en un momento de menor intimidad emocional que otros intentos de reconciliación."}],
        relationships:{alliances:[{targetId:"demo-eulalia",type:"Pareja",symbol:"♥",note:"Se conocen en Piratas. Esteban siente una pequeña atracción desde temprano, mientras Eulalia inicialmente apenas repara en él. Durante Japón aumenta la cercanía; en ebu gogo comienzan una relación, en Mali son una pareja estable y en Constantinopla atraviesan una etapa de reconciliación que culmina en un embarazo."},{targetId:"demo-wiremu",type:"Apoyo",symbol:"✦",note:"Wiremu sirve como apoyo directo para Esteban y es una de las personas en las que puede apoyarse cuando sus inseguridades o la situación lo superan."}],other:[{targetId:"demo-grupo",type:"Grupo central",symbol:"◈",note:"El grupo principal es su núcleo de convivencia y la red desde la cual se articula buena parte de su historia."}]},
        participation:{grupos:["demo-grupo"],batallas:["demo-batalla-bagdad"],lugares:["demo-bagdad"]},
        gallery:[{title:"Retrato principal",caption:"Espacio reservado para un retrato definitivo de Esteban."},{title:"Cuerpo completo",caption:"Puede permanecer aquí si no resulta mejor utilizarlo en Apariencia."}],
        research:{kind:"Inventado",workStatus:"En desarrollo",sources:"",pending:["Definir fecha exacta de nacimiento solo si realmente llega a ser necesaria.","Añadir descripción física canónica antes de llenar definitivamente la tabla lateral.","Sustituir la galería de muestra por imágenes reales."],notes:["*Soltero indica el estado civil legal. La relación con Eulalia puede aclararse aparte cuando sea útil evitar confusión.","No se ha forzado una apariencia física inventada solo para llenar casillas."]}
      }
    },
    {id:"demo-eulalia",title:"Eulalia",subtitle:"Chamana y miembro del grupo principal",category:"personajes",masterTag:"personaje_eulalia",aliases:[],tags:["grupo-principal","demo"],summary:"Chamana y miembro del grupo principal. Esta ficha mínima existe para que el borrador de Lazos de Esteban tenga enlaces reales.",character:{info:{personal:{aka:"—",gender:"Femenino",nationality:"—",culture:"—",languages:"—",religion:"—",occupation:"Chamana",birth:"—",death:"—",age:"28 años (inicio del Libro 1)",civilStatus:"Soltera*"},story:{firstAppearance:"Piratas",importantRelations:["♥ Esteban"]},appearance:{hair:"—",eyes:"—",skin:"—",build:"—"}},research:{kind:"Inventado",workStatus:"Nuevo",sources:[],pending:[],notes:[]}}},
    {id:"demo-wiremu",title:"Wiremu",subtitle:"Miembro del grupo principal",category:"personajes",masterTag:"personaje_wiremu",aliases:[],tags:["grupo-principal","demo"],summary:"Miembro del grupo principal y una de las principales figuras de apoyo para Esteban.",character:{info:{personal:{aka:"—",gender:"Masculino",nationality:"—",culture:"Maorí",languages:"—",religion:"—",occupation:"Viajero",birth:"—",death:"—",age:"—",civilStatus:"—"},story:{firstAppearance:"—",importantRelations:["✦ Esteban"]},appearance:{hair:"—",eyes:"—",skin:"—",build:"—"}},research:{kind:"Inventado",workStatus:"Nuevo",sources:[],pending:[],notes:[]}}},
    {id:"demo-bagdad",title:"Bagdad",category:"lugares",masterTag:"lugar_bagdad",aliases:["Baghdad"],tags:["ciudad","demo"],summary:"Lugar de demostración relacionado con Esteban.",relations:[{targetId:"demo-esteban",type:"Personaje relacionado"}]},
    {id:"demo-batalla-bagdad",title:"Batalla de Bagdad",category:"batallas",masterTag:"batalla_bagdad_demo",aliases:["Batalla de la ciudad de Bagdad"],tags:["Bagdad","demo"],summary:"Batalla de demostración que referencia a Esteban.",participants:[{targetId:"demo-esteban",role:"Participante de prueba"},{targetId:"demo-eulalia",role:"Participante de prueba"}],relations:[{targetId:"demo-bagdad",type:"Lugar"},{targetId:"demo-esteban",type:"Participante"}]},
    {id:"demo-grupo",title:"Grupo principal",category:"grupos",masterTag:"grupo_principal",aliases:["Grupo A"],tags:["demo"],summary:"Grupo de ejemplo que referencia a Esteban, Eulalia y Wiremu.",members:[{targetId:"demo-esteban",role:"Miembro"},{targetId:"demo-eulalia",role:"Miembro"},{targetId:"demo-wiremu",role:"Miembro"}],relations:[{targetId:"demo-esteban",type:"Miembro"},{targetId:"demo-eulalia",type:"Miembro"},{targetId:"demo-wiremu",type:"Miembro"}]}
  ]
};