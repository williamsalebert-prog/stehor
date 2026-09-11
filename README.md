# Sethoria Atlas — Prototipo A

Primer prototipo de arquitectura para una aplicación web personal de organización y análisis de **Sethoria**.

## Objetivo de esta versión

Validar la base antes de construir mapas, cronologías avanzadas, árboles genealógicos y gráficos de relaciones.

Incluye:

- 24 categorías acordadas.
- Registro maestro de entidades.
- ID interno + etiqueta maestra + título + alias + etiquetas secundarias.
- Búsqueda global.
- Creación de elementos desde la web.
- Persistencia local mediante IndexedDB.
- Exportación/importación de respaldo JSON.
- Hipervinculador rápido de texto.
- Resolución básica de ambigüedades.
- Navegación a fichas internas.
- Datos de demostración mínimos.

## Publicar en GitHub Pages

No necesita Node, npm, compilación ni programas externos.

1. Sube **todo el contenido de esta carpeta** a un repositorio de GitHub.
2. En el repositorio abre `Settings`.
3. Entra a `Pages`.
4. En `Build and deployment`, selecciona publicación desde la rama principal y carpeta raíz.
5. Abre la URL de GitHub Pages que GitHub indique.

## Importante

Los elementos que crees desde la interfaz se guardan en el navegador con IndexedDB.  
El botón **Exportar respaldo** genera un archivo JSON con el estado local.  
En esta fase el prototipo no escribe directamente archivos del repositorio de GitHub.

## Datos de demostración

La primera apertura crea cinco entidades de prueba:

- Esteban
- Eulalia
- Bagdad
- Batalla de Bagdad
- Grupo principal

Solo sirven para comprobar navegación e hipervínculos. Se pueden sustituir posteriormente.

## Siguiente fase prevista

Después de validar este prototipo:

- relaciones reales entre entidades;
- árbol genealógico básico;
- visualización de pertenencia a grupos;
- línea de tiempo A/B;
- primer motor de mapa-imagen con capas y marcadores.
