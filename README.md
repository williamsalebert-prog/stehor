# Sethoria Atlas — Prototipo A4

Reestructuración visual y de navegación del núcleo de Sethoria Atlas.

## Filosofía
La interfaz evita convertir el proyecto en un dashboard administrativo. La portada y los menús de categorías funcionan como un atlas visual: **símbolo o imagen + título + clic**. Los datos técnicos existen, pero no compiten con la navegación.

## Cambios de A4
- Eliminada cualquier barra superior.
- **Inicio y control de tamaño del lateral forman una sola pieza**:
  - la S funciona como parte del botón Inicio;
  - el control `⇔` está justo debajo de la S, dentro del mismo bloque.
- Portada reducida a:
  - título `Sethoria Atlas`;
  - tarjetas de categorías.
- Sistema nuevo de iconos SVG de línea, consistente para todas las categorías.
- Animaciones más cuidadas:
  - entrada escalonada de tarjetas;
  - brillo en hover;
  - movimiento sutil de iconos;
  - transición del menú lateral.
- Mayor aprovechamiento del espacio:
  - cuadrícula responsive con más columnas;
  - tarjetas compactas;
  - menos márgenes muertos.
- Menús de categorías:
  - solo **imagen/símbolo + título**;
  - sin descripciones;
  - sin contadores;
  - sin etiquetas técnicas;
  - sin botones redundantes.
- Las tarjetas admiten imagen automáticamente mediante:
  - `image`
  - `imageUrl`
  - `thumbnail`
  - `cover`
- Fichas:
  - título y resumen visibles;
  - datos de ID/alias/etiquetas ocultos en `Identificación técnica`.
- Registro maestro e Hipervinculador permanecen separados como herramientas.
- Exportar/importar sigue disponible en la parte baja del lateral.
- Misma IndexedDB que las versiones anteriores para no romper los datos locales existentes.

## Referencias de diseño estudiadas
La reestructuración toma ideas generales de:
- Dark-Fall / World Anvil: portada como navegación temática por categorías.
- Star Wars Databank: selección visual de entidades con imagen y nombre.
- Tolkien Gateway / Memory Alpha: jerarquías de categorías claras para grandes cantidades de información.
- Harry Potter Lexicon: separación entre navegación general, cronologías y fichas especializadas.
- SCP Wiki: diferentes tipos de información no necesitan compartir una plantilla idéntica.
- World Anvil: categorías como unidades estructurales del proyecto.

## Publicación
No requiere Node, npm ni compilación.

Sube:
- `index.html`
- `styles.css`
- `app.js`
- carpeta `data/`

a la raíz que publica GitHub Pages.


## A4.1 — ajuste de espacio y microinteracciones
- La portada aprovecha más el ancho útil: hasta 8 tarjetas por fila en escritorio amplio.
- Eliminada la animación de entrada de tarjetas y de la vista.
- Hover reducido a una microanimación breve al acercar el cursor.
- Al retirar el cursor, la tarjeta vuelve inmediatamente sin una animación inversa.
- Eliminado el barrido/brillo móvil de las tarjetas.
- Corregido el bloque contraído de Inicio: el botón `⇔` queda centrado exactamente debajo de la S.
