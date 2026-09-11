# Sethoria Atlas — Prototipo A.2

Segunda pasada de interfaz. Esta versión conserva el núcleo del Prototipo A/A.1 y se concentra en navegación, densidad visual y comodidad de uso.

## Cambios de A.2

- Se eliminó **Inicio** de la barra lateral: hacer clic en el logotipo vuelve al inicio.
- Barra lateral **ocultable/colapsable** desde `☰`.
- El estado colapsado se recuerda en el navegador.
- Solo existe **un botón principal `+ Nuevo`**, en la barra superior.
- Se eliminó el segundo `+ Nuevo` de las categorías.
- La búsqueda grande vive en **Inicio**.
- Fuera de Inicio queda un botón compacto de búsqueda global.
- `Ctrl + K` y `/` abren la búsqueda desde cualquier lugar.
- Pantalla de Inicio rehecha:
  - buscador,
  - recientes,
  - favoritos,
  - categorías agrupadas y compactas,
  - herramientas al final.
- Tarjetas de categorías mucho más compactas.
- Tarjetas de entidades completamente clicables.
- Favoritos con `☆ / ★`.
- Se añadió “Continuar” con elementos recientes.
- Barra superior más compacta.
- Botón de regresar con historial interno.
- Herramientas técnicas al final de la navegación.
- Interfaz oscura refinada con textura muy sutil, iluminación ambiental y bordes menos bruscos.
- Microanimaciones más pequeñas y uniformes.
- Zonas de clic más grandes.
- Diseño responsive mejorado.
- Exportar/importar respaldo conserva también favoritos y recientes.

## Datos y compatibilidad

A.2 sigue usando la misma base IndexedDB del prototipo anterior:

`sethoria-atlas-prototipo-a`

Por eso, si publicas A.2 en el mismo origen/URL de GitHub Pages, los elementos locales anteriores deberían seguir disponibles en ese navegador.

## Publicación

No requiere Node, npm ni compilación.

Sube los archivos de esta carpeta a la raíz del repositorio que publica GitHub Pages.

## Lo que todavía NO incluye

A propósito todavía no entran:

- mapas interactivos,
- líneas de tiempo reales,
- árbol genealógico,
- redes de grupos,
- relaciones visuales,
- vistas especializadas de criaturas,
- módulo técnico de barcos/batallas.

La idea es validar primero que la interfaz base ya sea cómoda antes de cargar esos módulos encima.
