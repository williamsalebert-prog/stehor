# Sethoria Atlas — A5 / Plantilla 0

Primera ficha modular general del proyecto.

## Objetivo
Crear un esqueleto que pueda manejar Personajes, Grupos, Arcos, Eventos, Lugares/Mapas, Rutas, Batallas, Barcos, Criaturas, Culturas, Armas, Ropa, Objetos, Relaciones, Historia real, Reglas, Música, Fuentes, Notas y otros datos.

## Qué cambia
- La portada y los menús de categorías siguen siendo visuales y compactos.
- Al abrir un elemento ya no aparece una ficha plana.
- Cada categoría tiene un **blueprint** propio de pestañas.
- La ficha comparte una jerarquía visual común:
  - identidad,
  - resumen,
  - pestañas,
  - módulos,
  - identificación técnica plegada.
- Se incorporan:
  - relaciones explícitas,
  - detección automática de menciones,
  - referencias inversas,
  - cronologías,
  - datos clave,
  - galerías/material,
  - fuentes,
  - notas,
  - mapas de imagen con pines manuales.
- No se añade edición desde la web.
- Se conserva la misma IndexedDB para seguir siendo compatible con los datos locales del prototipo.

Consulta `PLANTILLA_0.md` para el esquema de datos.

## Publicación
No requiere compilación. Puede subirse directamente a GitHub Pages.


## A6 — Personajes, Tanda 0

Primera plantilla específica de Personajes.

La ficha adopta una estructura tipo wiki:
- infobox compacta a la izquierda;
- artículo principal a la derecha;
- siete pestañas;
- campos opcionales;
- Historia con subtítulos libres;
- relaciones con notas propias;
- participación cruzada automática/semi-automática;
- galería filtrable;
- investigación separada;
- identificación técnica plegada.

La aplicación no interpreta el dinamismo narrativo. Toda contextualización de cambios se redacta manualmente por el autor.

Consulta `PERSONAJES_TANDA0.md`.


## A6.1 — equilibrio + demo ampliado de Esteban
- Campos múltiples simples pueden ser listas, sin subformularios innecesarios.
- La ficha rápida usa `Relaciones importantes` en vez de obligar a separar Grupo/Pareja.
- Relaciones admite símbolos opcionales elegidos por el autor.
- El demo de Esteban fue ampliado con información ya establecida en conversaciones y manuscrito.
- No se inventaron fecha exacta de nacimiento ni apariencia física.


## A6.2 — corrección de actualización visible
- La IndexedDB anterior conservaba los registros `demo-*`, así que el nuevo Esteban podía no cargarse.
- Ahora se refrescan únicamente las entidades `demo-*` al iniciar.
- Los datos reales del usuario no se sobrescriben.
- Se agregaron `?v=a62` a CSS, JavaScript y demo-data para evitar caché vieja en GitHub Pages/navegador.


## A6.3 — Personajes / borrador 2
- Tabla lateral fija con nacionalidad, cultura, idiomas, religión y ocupación.
- Resumen integrado en Perfil como recuadro introductorio.
- Pestañas: Perfil, Apariencia, Historia, Lazos, Galería, Participación, Investigación.
- Revisión visual menos monocromática y con mezcla de vino, petróleo y dorado.


## A6.5 — edición directa
- No existe modo de edición: los textos se editan directamente en la propia ficha.
- Historia: añadir/quitar apartados.
- Lazos: Alianzas, Familia, Enemigos y Otros; añadir/quitar lazos; texto opcional.
- Galería: añadir/quitar imagen, GIF o video sencillo.
- Perfil, Apariencia e Historia aceptan multimedia integrada con posición izquierda/centro/derecha y tamaño ajustable.
- El tamaño permitido se limita automáticamente según proporción, resolución, ancho de página, espacio restante para texto y altura visible.
- En pantallas estrechas o cuando no queda texto suficiente, los medios laterales se centran automáticamente sin perder la intención guardada.
- Participación es de solo lectura y se deriva de referencias/hipervínculos presentes en los datos del personaje.
- Investigación: Personaje Real/Inventado; Estado Nuevo/En desarrollo/Final; Fuentes, Pendientes y Notas editables.
- Los archivos multimedia seleccionados se guardan como datos dentro de IndexedDB/backup JSON para que no haya que volver a cargarlos localmente.
