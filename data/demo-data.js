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
      subtitle:"Ejemplo de la primera plantilla de Personajes",
      category:"personajes",
      masterTag:"personaje_esteban",
      aliases:[],
      tags:["grupo-principal","demo"],
      summary:"Mexicano y estudiante de ingeniería al llegar a Sethoria. La ficha está redactada como una wiki estática: cualquier cambio de edad, grupo, relación o personalidad se explica únicamente cuando el autor considera que aporta contexto.",
      fullName:"Esteban",
      ageText:"21 años (inicio del Libro 1)",
      origin:"México",
      nationality:"Mexicana",
      firstAppearance:"Piratas",
      groupText:"Grupo principal",
      relationshipText:"Eulalia (desde ebu gogo)",
      status:"Vivo",
      relations:[
        {targetId:"demo-eulalia",type:"Pareja",note:"Se conocen en Piratas; su relación evoluciona gradualmente y se formaliza en ebu gogo."},
        {targetId:"demo-grupo",type:"Miembro"}
      ],
      character:{
        info:{
          personal:[
            {label:"Nombre completo",value:"Esteban"},
            {label:"Edad",value:"21 años (inicio del Libro 1)"},
            {label:"Origen",value:"México"},
            {label:"Nacionalidad",value:"Mexicana"}
          ],
          narrative:[
            {label:"Primera aparición",value:"Piratas"},
            {label:"Grupo",value:"Grupo principal"},
            {label:"Pareja",value:"Eulalia (desde ebu gogo)"},
            {label:"Estado",value:"Vivo"}
          ]
        },
        introduction:"Esteban forma parte del grupo central de viajeros. Su ficha usa una estructura enciclopédica tradicional, pero deja la contextualización narrativa en manos del autor: si un dato cambia, el propio texto puede aclararlo con un paréntesis, una frase o una subsección; si permanece estable, se presenta una sola vez.",
        traits:["Tímido al inicio","Noble","Inseguro","Práctico"],
        profile:{
          appearance:"La descripción física general se escribe aquí. Si existe un cambio realmente visible —por ejemplo una cicatriz, un cambio marcado de peinado o una lesión— puede explicarse en este mismo apartado sin crear una ficha distinta por arco.",
          personality:"Al comienzo puede mostrarse extremadamente tímido en sus primeras interacciones. Conforme adquiere confianza puede desenvolverse con mucha mayor soltura. Los cambios narrativos se redactan de manera natural cuando son relevantes; la aplicación no decide por sí misma cuándo existe una nueva etapa.",
          motivations:"Aquí se describen objetivos, prioridades y motivos personales sin repetir los acontecimientos completos que ya pertenecen a Historia o Eventos.",
          capabilities:[
            "Formación de ingeniería.",
            "Supervivencia básica.",
            "Conocimientos prácticos que resulten relevantes para la historia."
          ],
          limitations:"Este bloque sirve para debilidades, carencias o límites reales del personaje. No debe convertirse en una lista de estadísticas de videojuego.",
          habits:"Intereses, costumbres y hábitos que aporten caracterización pueden registrarse aquí cuando tengan utilidad narrativa."
        },
        history:[
          {
            title:"Antes de Sethoria",
            body:"Aquí se resume únicamente la información previa necesaria para entender al personaje. No es necesario reconstruir toda su vida si no aporta a la novela."
          },
          {
            title:"Piratas",
            body:"Primera etapa relevante del Libro 1. Esta subsección existe porque hay información que contar; otros arcos pueden omitirse por completo si no añaden nada nuevo."
          },
          {
            title:"Japón",
            body:"La historia del personaje puede organizarse mediante arcos cuando eso resulte natural, pero los arcos no son campos obligatorios ni unidades automáticas de evolución."
          }
        ],
        relationships:{
          personal:[
            {
              targetId:"demo-eulalia",
              type:"Pareja",
              note:"La sección describe la evolución específica del vínculo sin volver a narrar toda la Historia. Se conocen en Piratas, la cercanía aumenta después y comienzan una relación en ebu gogo."
            }
          ],
          other:[
            {targetId:"demo-grupo",type:"Grupo principal",note:"La pertenencia se referencia aquí sin duplicar la ficha completa del grupo."}
          ]
        },
        participation:{
          grupos:["demo-grupo"],
          batallas:["demo-batalla-bagdad"],
          lugares:["demo-bagdad"]
        },
        gallery:[
          {title:"Retrato principal",category:"Retratos",caption:"La imagen principal de la ficha iría aquí."},
          {title:"Cuerpo completo",category:"Cuerpo completo",caption:"Vista general del personaje."},
          {title:"Atuendo de Japón",category:"Atuendos",caption:"Ejemplo de una imagen contextual sin convertir la ficha completa en una ficha por arco."},
          {title:"Equipo",category:"Equipo",caption:"Objetos o equipo visualmente relevantes."}
        ],
        research:{
          canon:"Plantilla de demostración",
          pending:[
            "Sustituir los textos de demostración por información real.",
            "Añadir imágenes reales cuando estén disponibles."
          ],
          notes:[
            "El dinamismo narrativo lo redacta el autor. La plantilla no interpreta automáticamente cambios de personalidad, relaciones o etapas."
          ]
        }
      },
      sources:[
        {title:"Fuente de demostración",note:"Las fuentes reales del personaje se registrarían aquí."}
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
      ageText:"28 años (inicio del Libro 1)",
      origin:"—",
      nationality:"—",
      firstAppearance:"Piratas",
      groupText:"Grupo principal",
      relationshipText:"Esteban (desde ebu gogo)",
      status:"Viva",
      relations:[{targetId:"demo-esteban",type:"Pareja",note:"Relación de demostración."}]
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
      summary:"Grupo de ejemplo con Esteban y Eulalia.",
      members:[
        {targetId:"demo-esteban",role:"Miembro"},
        {targetId:"demo-eulalia",role:"Miembro"}
      ],
      relations:[
        {targetId:"demo-esteban",type:"Miembro"},
        {targetId:"demo-eulalia",type:"Miembro"}
      ]
    }
  ]
};
