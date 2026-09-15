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

## A6.6 — Lugares y mapas interactivos
- Lugares usa ficha rápida y las pestañas: Descripción, Mapas, Historia, Participación, Galería e Investigación.
- Descripción e Historia conservan edición directa y multimedia de A6.5.
- Un Lugar admite cero, uno o varios mapas mediante subtabs con nombre libre.
- Cada mapa admite imagen/GIF base, coordenadas internas relativas, coordenadas geográficas/manuales, origen personalizado, orientación de ejes, rotación y norte.
- Calibración global: valor por píxel, dimensiones totales, dos puntos, X/Y independientes y varios pares de control.
- Unidades configurables para distancia, área, velocidad, tiempo y altitud; precisión y tolerancia configurables.
- Capas y niveles completamente configurables por mapa.
- Elementos geométricos disponibles: Punto, Línea, Zona y Ruta.
- Propiedades comunes: categoría, capas, niveles, entidad enlazada, notas, fechas, visibilidad, orden, estilo y multimedia.
- Puntos: coordenadas, geocoordenadas, altitud, símbolo, tamaño, rotación, etiqueta, radio y dirección.
- Líneas: nodos, cierre, tipo de trazo, dirección/flechas, longitud calculada, anchura real, suavizado y elevaciones.
- Zonas: vértices, huecos, partes, área/perímetro, relleno, borde, etiqueta, elevación/altura, zona contenedora y cálculos de contenido.
- Rutas: origen/destino, waypoints, nodos y niveles, sentido/circularidad, tramos, transportes, velocidades, pausas, condiciones, factores, duración y distancia manuales, fechas e incertidumbre.
- Generación de rutas como propuesta editable: waypoints, zonas a evitar, líneas/capas preferidas, suavizado, densidad y obstáculos; luego puede aceptarse o corregirse moviendo nodos.
- Cálculos derivados: longitudes, áreas, perímetros, volumen aproximado, distancia entre puntos, distancia/duración/velocidad media de rutas, zonas atravesadas, porcentaje aproximado dentro de zonas, niveles y desnivel cuando hay datos.


## A6.6.1 — revisión QA de Lugares/Mapas
Correcciones funcionales: regex de rutas internas y extensiones; cancelación de herramientas; bloqueo de dibujo sin imagen base; validación mínima de geometrías; huecos reales en zonas; intersecciones robustas; limpieza de referencias al borrar elementos/capas/niveles; aplicación del nivel predeterminado; orden visual de capas; transporte predeterminado en rutas; cálculo por tramos con intervalos de velocidad; límites de zoom normalizados.


## A6.6.2 — edición/lectura, multimedia y base limpia
- Modo normal y modo Editar global.
- Modo normal oculta controles de edición y bloquea edición directa.
- Retrato/portada editable y reutilizado en tarjetas de categoría.
- Multimedia anclada después de párrafos, con izquierda/centro/derecha, tamaños mínimos menores y movimiento entre párrafos.
- Se eliminan demos del paquete y se migran fuera de IndexedDB una sola vez.
- Categorías arrancan vacías y se prueban sobre datos reales locales.
- Mapas conservan navegación/zoom en modo normal y muestran edición avanzada solo en modo Editar.


## A6.6.4 — multimedia y recuperación
- Ctrl+Z/Ctrl+Y para cambios ya guardados en la wiki; dentro de un campo de texto se conserva el deshacer nativo del navegador.
- Multimedia lateral con ajuste de texto tipo cuadrado y movimiento por líneas que atraviesa párrafos.
- Selección múltiple: varias imágenes añadidas juntas se organizan como fila horizontal centrada.
- Nueva posición `Fila` para combinar multimedia centrada horizontalmente.
- El botón Multimedia intenta usar el último párrafo editado del apartado como punto de inserción.
- Herramienta `Archivos cargados` para localizar y quitar multimedia almacenada en entidades, mapas, galerías o portadas.


## A6.6.5 — Multimedia por arrastre asistido
- Se eliminaron las flechas de posición y desplazamiento.
- La imagen/GIF/video se mueve directamente arrastrándolo.
- El programa interpreta izquierda, derecha o bloque centrado según posición, tamaño y espacio disponible.
- Izquierda/derecha usan ajuste de texto; el bloque centrado ocupa una fila propia y admite una o varias imágenes.
- La altura de caída dentro de un párrafo se convierte en anclaje y desplazamiento por líneas para conservar control vertical.
- Se conserva el deslizador de tamaño y el botón de quitar.


## A6.6.6 — flujo lateral multimedia
- El arrastre vertical calcula la posición por el borde superior real de la multimedia, no por el punto donde se agarró.
- Las laterales se ajustan a líneas completas mediante offset en píxeles.
- El tamaño máximo lateral también considera cuánto texto queda debajo del punto de inserción, reduciendo espacios muertos excesivos.
- Si ya no cabe una lateral útil dentro de sus límites, se muestra centrada.
