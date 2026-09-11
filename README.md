# Sethoria Atlas — Prototipo A.1 (Interfaz)

Revisión visual del Prototipo A. Mantiene el mismo núcleo de datos y se concentra en hacer la interfaz más clara, compacta y agradable.

## Cambios principales

- Modo oscuro profesional como interfaz base.
- Inicio simplificado: búsqueda, categorías y herramientas.
- Las tarjetas completas son clicables; ya no requieren un botón «Abrir».
- Registro maestro e Hipervinculador movidos al bloque de herramientas, al final de la navegación.
- Botones permanentes de **Regresar** e **Inicio**.
- Logotipo/nombre de Sethoria Atlas vuelve al Inicio al hacer clic.
- Búsqueda global con paleta flotante.
- Atajos:
  - `Ctrl + K` o `/`: buscar.
  - `N`: nuevo elemento.
  - `Alt + ←`: regresar.
  - `Esc`: cerrar búsqueda.
- Zonas de clic más grandes.
- Animaciones pequeñas y rápidas.
- Barra lateral más compacta.
- Interfaz responsive para pantallas más pequeñas.
- Exportar/importar respaldo permanece disponible, pero menos invasivo.
- No se han añadido todavía mapas, cronologías avanzadas ni gráficos de relaciones.

## Uso en GitHub Pages

No requiere Node, npm ni compilación.

Sube el contenido de esta carpeta al repositorio y publica la raíz mediante GitHub Pages.

## Persistencia

Los datos creados en la interfaz siguen usando IndexedDB del navegador.  
`Exportar respaldo` crea un JSON recuperable.

## Nota de compatibilidad

Usa el mismo nombre de base IndexedDB que el Prototipo A para conservar los elementos locales creados durante las pruebas en el mismo navegador/origen, siempre que la URL/origen sea el mismo.
