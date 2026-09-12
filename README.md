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
