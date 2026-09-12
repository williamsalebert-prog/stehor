# Sethoria Atlas — Prototipo A.3

Tercera pasada del prototipo, centrada en **estilo temático** y en corregir problemas concretos de interacción.

## Cambios principales de A.3

### Estilo
- La interfaz abandona el tono azul genérico y pasa a una paleta más **cálida / café / vino / dorado**, más acorde con un worldbuilding de aventuras, historia y mitología.
- Inicio rehecho con un aire más temático.
- Tarjetas de categorías y elementos ahora tienen un lenguaje visual más decorativo y más cercano a una “enciclopedia de aventuras”.

### Búsqueda
- Se eliminó la búsqueda modal.
- La búsqueda del **Inicio** busca en **todo Sethoria Atlas**.
- La búsqueda de cada **categoría** busca **solo dentro de esa categoría**.
- La barra superior mantiene una búsqueda inline para páginas internas.

### Modales
- Clic fuera del modal lo cierra.
- El scroll largo se queda dentro del modal (`overflow` contenido + `overscroll-behavior: contain`).

### Inicio
- Hero principal más trabajado.
- Paneles de recientes, favoritos y un espacio futuro de apoyo/donaciones.
- Accesos rápidos más claros.

### Otras notas
- Se conserva la base de datos IndexedDB del prototipo anterior.
- Siguen pendientes, a propósito:
  - mapas reales,
  - cronologías visuales,
  - árbol genealógico,
  - relaciones gráficas,
  - vistas especializadas complejas.

## Publicación
No requiere Node ni compilación.  
Sube los archivos de esta carpeta al repositorio de GitHub Pages.
