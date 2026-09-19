# Sethoria Writer — Arquitectura modular

Esta versión prepara Sethoria Writer para crecer por módulos y para que futuras
IA puedan trabajar por partes sin cargar todo el proyecto.

## Plantilla común obligatoria

Todas las fichas de cualquier categoría tienen estas cinco pestañas:

1. **Descripción**
2. **Real**
3. **Participación**
4. **Galería**
5. **Investigación**

La pestaña **Real** es solo un nombre de plantilla. Su contenido cambia según
la categoría. Por ejemplo, puede contener genealogía en Personajes, estructura
temporal en Línea temporal, componentes en Armas o biología en Criaturas.

Descripción, Participación, Galería e Investigación comparten el mismo panel,
dimensiones, espaciado y comportamiento de edición. Editar/Listo y el gestor
de etiquetas también son elementos comunes.

## Separación para IA

Una IA que trabaje en Personajes debe poder limitarse a:

- `docs/ARQUITECTURA_MODULAR.txt`
- `modules/_comun/PLANTILLA_COMUN.txt`
- `modules/personajes/README.md`
- `modules/personajes/config.js`
- archivos concretos que necesite modificar

No necesita cargar Lugares, Armas, Timeline, etc. salvo que exista una
dependencia real.

## Migración

La aplicación A7 existente se conserva en `core/app-legacy.js`. El archivo raíz
`app.js` es ahora un bootstrap pequeño. Esto permite migrar cada módulo de forma
progresiva sin destruir las funciones que ya existen.

La plantilla común está en:

- `modules/_comun/PLANTILLA_COMUN.txt`
- `modules/_comun/template-contract.js`
- `docs/PLANTILLA_VISUAL.txt`

Las instrucciones para pedir trabajo por módulo están en:

- `docs/PROMPT_MODULO.txt`
- `docs/GENERAR_MODULO.txt`

## Regla de oro

**Lo común se implementa una sola vez. Lo específico vive dentro de su módulo.**

Si un cambio requiere tocar algo común, primero se identifica el contrato
compartido y después se hace el cambio común de forma explícita.
