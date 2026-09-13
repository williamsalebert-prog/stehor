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
      subtitle:"Miembro del grupo principal",
      category:"personajes",
      masterTag:"personaje_esteban",
      aliases:["Chogui","Estebancito"],
      tags:["grupo-principal","mexico","demo"],
      summary:"Mexicano y estudiante de ingeniería al llegar a Sethoria. En sus primeras interacciones puede ser extremadamente tímido e inseguro, pero cuando adquiere confianza llega a desenvolverse con mucha soltura. Es noble, observador, prudente y analítico; combina formación técnica con un conocimiento especialmente amplio de criaturas mitológicas y legendarias.",
      fullName:"Esteban",
      ageText:"21 años (inicio del Libro 1)",
      origin:"México",
      nationality:"Mexicana",
      firstAppearance:"Piratas",
      importantRelations:["Eulalia","Wiremu"],
      status:"Vivo",

      relations:[
        {
          targetId:"demo-eulalia",
          type:"Pareja",
          symbol:"♥",
          note:"Se conocen durante Piratas. Esteban siente atracción antes de que Eulalia muestre un interés comparable; durante Japón la cercanía aumenta, en ebu gogo comienzan una relación y para Mali ya funcionan como una pareja estable."
        },
        {
          targetId:"demo-wiremu",
          type:"Amigo / apoyo",
          symbol:"✦",
          note:"Wiremu es una de las principales figuras de apoyo para Esteban."
        }
      ],

      character:{
        info:{
          personal:[
            {label:"Nombre",value:"Esteban"},
            {
              label:"También conocido como",
              value:[
                "Chogui (todo el grupo)",
                "Estebancito (Eulalia, Lucila, Tina, Ariadna y Emiliano)"
              ]
            },
            {label:"Edad",value:"21 años (inicio del Libro 1)"},
            {label:"Origen",value:"México"},
            {label:"Nacionalidad",value:"Mexicana"},
            {label:"Formación",value:"Estudiante de ingeniería"}
          ],
          narrative:[
            {label:"Primera aparición",value:"Piratas"},
            {
              label:"Relaciones importantes",
              value:[
                "Eulalia — pareja (desde ebu gogo)",
                "Wiremu — amigo y apoyo"
              ]
            },
            {label:"Estado",value:"Vivo"}
          ]
        },

        introduction:"Esteban integra el grupo principal de viajeros. Su timidez es especialmente fuerte durante las primeras interacciones —desde un día hasta varias semanas, dependiendo de la situación—, pero no define permanentemente su forma de relacionarse: cuando la conversación fluye puede parecer casi extrovertido. Tiende al autosabotaje y a dudar de sí mismo. Aun así, suele analizar antes de actuar, distingue entre hacer daño y matar y puede intervenir en decisiones difíciles cuando considera que la situación lo exige.",

        traits:[
          "Extremadamente tímido al inicio",
          "Noble",
          "Analítico",
          "Observador",
          "Prudente",
          "Inseguro / autosabotaje"
        ],

        profile:{
          personality:"Con desconocidos, la timidez de Esteban puede ser extrema durante las primeras interacciones. Con confianza puede desenvolverse con mucha mayor soltura e incluso parecer casi extrovertido. Tiende a subestimarse y a sabotear sus propias expectativas. Es cuidadoso al tomar decisiones, evalúa la información antes de actuar y no equipara automáticamente hacer daño con matar.",
          conflicts:"La inseguridad y la falta de confianza en sí mismo son conflictos recurrentes. Durante Japón, después de momentos de fuerte tensión y cansancio, una Kitsune llega a insistirle en que necesita tener más fe en sí mismo.",
          capabilities:[
            "Formación universitaria en ingeniería.",
            "Conocimiento excepcional de criaturas mitológicas, animales fantásticos y leyendas; reconoce, entre otros, al Wendigo, Nue, Pouakai y el Holandés Errante.",
            "Supervivencia básica.",
            "Capacidad para analizar problemas y detectar información táctica incompleta.",
            "Puede resistir entre uno y dos días sin dormir cuando la situación lo exige, aunque el cansancio termina afectándolo.",
            "Ha comido insectos y no los considera automáticamente algo imposible de consumir."
          ],
          limitations:"No es un especialista universal. Su formación y sus conocimientos tienen límites claros, y el cansancio, la inseguridad o la falta de experiencia en campos específicos pueden afectarlo. Cuando un problema rebasa su formación necesita apoyarse en personas con conocimientos más especializados.",
          habits:[
            "Muestra una afinidad especial por adultos mayores, niños y perros; con ellos suele perder la timidez más fácilmente.",
            "Puede conversar durante horas con adultos sobre anécdotas y experiencias.",
            "Conoce y valora tradiciones como radios locales, peregrinaciones, danzas y mayordomías.",
            "Suele sentirse atraído por mujeres que percibe como particulares o distintas; esa preferencia no elimina su tendencia a autosabotear cualquier expectativa romántica."
          ]
        },

        history:[
          {
            title:"Antes de Sethoria",
            body:"Es mexicano y estudiante de ingeniería. Antes de llegar ya posee un conocimiento poco común sobre seres mitológicos, animales fantásticos y leyendas, aprendido principalmente mediante libros y bibliotecas. También cuenta con conocimientos básicos de supervivencia y familiaridad con diversas tradiciones populares mexicanas."
          },
          {
            title:"Piratas",
            body:"Durante el arco de los Piratas conoce a Eulalia. La atracción aparece primero del lado de Esteban; por su propia inseguridad no la convierte inmediatamente en una expectativa de relación. Esta etapa también establece su convivencia inicial con varios de los viajeros que después forman parte de su círculo cercano."
          },
          {
            title:"Japón",
            body:"Su interés por Eulalia aumenta gradualmente. Durante la crisis del Wendigo participa junto con Eulalia, Wiremu e Isamu y coopera con el clan de Chiba. Su conocimiento de criaturas resulta útil para identificar amenazas y proponer cómo enfrentarlas. También interviene en decisiones delicadas posteriores, incluida la gestión de información sobre la muerte de Akira y sus posibles consecuencias políticas. Tras la tensión acumulada necesita descansar; una Kitsune le insiste en que debería confiar más en sí mismo."
          },
          {
            title:"ebu gogo",
            body:"La relación entre Esteban y Eulalia deja de ser únicamente una cercanía creciente y ambos pasan a ser pareja."
          },
          {
            title:"Mali",
            body:"Para esta etapa Esteban y Eulalia ya funcionan como una pareja estable. Durante los acontecimientos ligados a los argentinos de Villa Epecuén tiene roces con Alfredo Houssay, mientras Matías Ferreyra y Verónica Bianchi consiguen su confianza con mayor rapidez."
          },
          {
            title:"Constantinopla",
            body:"La relación con Eulalia atraviesa intentos de reconciliación. En uno de ellos mantienen relaciones sexuales y Eulalia queda embarazada; la situación tiene un componente irónico porque ocurre precisamente en un momento de menor intimidad emocional que otros intentos de reconciliación."
          }
        ],

        relationships:{
          personal:[
            {
              targetId:"demo-eulalia",
              type:"Pareja",
              symbol:"♥",
              note:"Se conocen en Piratas. Esteban siente una pequeña atracción desde temprano, mientras Eulalia inicialmente apenas repara en él. Durante Japón aumenta la cercanía; en ebu gogo comienzan una relación, en Mali son una pareja estable y en Constantinopla atraviesan una etapa de reconciliación que culmina en un embarazo."
            },
            {
              targetId:"demo-wiremu",
              type:"Amigo / apoyo",
              symbol:"✦",
              note:"Wiremu sirve como apoyo directo para Esteban y es una de las personas en las que puede apoyarse cuando sus inseguridades o la situación lo superan."
            }
          ]
        },

        participation:{
          grupos:["demo-grupo"],
          batallas:["demo-batalla-bagdad"],
          lugares:["demo-bagdad"]
        },

        gallery:[
          {
            title:"Retrato principal",
            category:"Retratos",
            caption:"Pendiente de sustituir por una imagen definitiva de Esteban."
          },
          {
            title:"Cuerpo completo",
            category:"Cuerpo completo",
            caption:"Espacio previsto para una vista general del personaje."
          },
          {
            title:"Atuendo por etapa",
            category:"Atuendos",
            caption:"Puede utilizarse cuando un cambio de ropa sea visualmente relevante; no hace falta una imagen por cada arco."
          },
          {
            title:"Equipo",
            category:"Equipo",
            caption:"Objetos o equipo visualmente relevantes."
          }
        ],

        research:{
          canon:"Canon recopilado / demo",
          pending:[
            "Completar nombre completo si se define.",
            "Definir fecha exacta de nacimiento si llega a establecerse.",
            "Añadir una descripción física canónica antes de llenar Apariencia.",
            "Sustituir los marcadores de galería por imágenes reales.",
            "Añadir firma solo si llega a existir una firma canónica o una imagen preparada."
          ],
          notes:[
            "La contextualización de cambios sigue siendo manual: la plantilla no decide por sí sola cuándo una relación, personalidad, edad o etapa necesita una aclaración.",
            "No se ha inventado una descripción física porque todavía no existe información suficientemente establecida para rellenarla."
          ]
        }
      },

      sources:[
        {
          title:"Manuscrito Sethoria Version 120",
          note:"Base de varias acciones y rasgos mostrados durante Japón y la crisis del Wendigo."
        },
        {
          title:"Chats de desarrollo de Sethoria",
          note:"Base de personalidad, relación con Eulalia, habilidades, hábitos y organización narrativa."
        }
      ]
    },

    {
      id:"demo-eulalia",
      title:"Eulalia",
      category:"personajes",
      masterTag:"personaje_eulalia",
      aliases:[],
      tags:["grupo-principal","demo"],
      summary:"Chamana y miembro del grupo principal. Esta ficha mínima existe para que el demo de relaciones de Esteban tenga un enlace real.",
      ageText:"28 años (inicio del Libro 1)",
      firstAppearance:"Piratas",
      status:"Viva",
      relations:[
        {
          targetId:"demo-esteban",
          type:"Pareja",
          symbol:"♥",
          note:"La relación comienza en ebu gogo."
        }
      ]
    },

    {
      id:"demo-wiremu",
      title:"Wiremu",
      category:"personajes",
      masterTag:"personaje_wiremu",
      aliases:[],
      tags:["grupo-principal","demo"],
      summary:"Miembro del grupo principal y una de las principales figuras de apoyo para Esteban.",
      status:"Vivo",
      relations:[
        {
          targetId:"demo-esteban",
          type:"Amigo / apoyo",
          symbol:"✦",
          note:"Apoyo directo para Esteban."
        }
      ]
    },

    {
      id:"demo-bagdad",
      title:"Bagdad",
      category:"lugares",
      masterTag:"lugar_bagdad",
      aliases:["Baghdad"],
      tags:["ciudad","demo"],
      summary:"Lugar de demostración relacionado con Esteban.",
      relations:[{targetId:"demo-esteban",type:"Personaje relacionado"}]
    },

    {
      id:"demo-batalla-bagdad",
      title:"Batalla de Bagdad",
      category:"batallas",
      masterTag:"batalla_bagdad_demo",
      aliases:["Batalla de la ciudad de Bagdad"],
      tags:["Bagdad","demo"],
      summary:"Batalla de demostración que referencia a Esteban.",
      participants:[
        {targetId:"demo-esteban",role:"Participante de prueba"},
        {targetId:"demo-eulalia",role:"Participante de prueba"}
      ],
      relations:[
        {targetId:"demo-bagdad",type:"Lugar"},
        {targetId:"demo-esteban",type:"Participante"}
      ]
    },

    {
      id:"demo-grupo",
      title:"Grupo principal",
      category:"grupos",
      masterTag:"grupo_principal",
      aliases:["Grupo A"],
      tags:["demo"],
      summary:"Grupo de ejemplo que referencia a Esteban, Eulalia y Wiremu.",
      members:[
        {targetId:"demo-esteban",role:"Miembro"},
        {targetId:"demo-eulalia",role:"Miembro"},
        {targetId:"demo-wiremu",role:"Miembro"}
      ],
      relations:[
        {targetId:"demo-esteban",type:"Miembro"},
        {targetId:"demo-eulalia",type:"Miembro"},
        {targetId:"demo-wiremu",type:"Miembro"}
      ]
    }
  ]
};
