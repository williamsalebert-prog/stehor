# Personajes — Tanda 0

Primera plantilla específica de Personajes para Sethoria Atlas.

## Regla principal

La ficha **se comporta visualmente como una wiki estática**.

La aplicación NO decide cuándo un personaje cambia de personalidad, entra en una nueva etapa, cambia de relación o necesita una aclaración temporal.

El autor decide cuándo escribir:

- `21 años (inicio del Libro 1)`
- `Eulalia (desde ebu gogo)`
- `Primera aparición: Mali`
- `Grupo X; posteriormente Grupo Y`
- o una explicación narrativa completa.

Si un dato permanece estable, se escribe una sola vez.

## Estructura visible

### Columna lateral / ficha rápida
Se agrupa en:

- Información personal
- Información narrativa
- Aspecto básico, solo si hace falta

Los campos vacíos no aparecen.

### Pestañas
1. Resumen
2. Perfil
3. Historia
4. Relaciones
5. Participación
6. Galería
7. Investigación

### Resumen
- Quién es
- Rasgos principales
- Frase destacada, opcional
- Conexiones principales

### Perfil
Bloques opcionales:
- Apariencia
- Personalidad
- Motivaciones
- Conflictos personales
- Capacidades y conocimientos
- Limitaciones
- Costumbres e intereses

Solo aparecen los que tienen información.

### Historia
Las subsecciones son libres.

Pueden ser:
- Antes de Sethoria
- Piratas
- Japón
- un evento concreto
- una etapa vital
- cualquier división que tenga sentido

No se generan automáticamente todos los arcos.

### Relaciones
Permite:
- Familia
- Relaciones personales
- Otras relaciones

Cada relación puede tener una nota que explique su evolución sin duplicar toda la Historia.

### Participación
Esta sección sí puede beneficiarse de automatización objetiva.

Agrupa referencias en:
- Arcos
- Eventos
- Grupos
- Batallas
- Lugares
- Rutas
- Barcos

Puede usar referencias explícitas o detectar entidades que mencionen al personaje.

### Galería
Admite categorías libres, por ejemplo:
- Retratos
- Cuerpo completo
- Atuendos
- Equipo
- Escenas

La galería usa filtros compactos.

### Investigación
Puede contener:
- Estado de canon
- Fuentes
- Pendientes
- Inspiraciones
- Notas de autor

### Identificación técnica
Permanece plegada:
- ID
- etiqueta maestra
- alias
- etiquetas secundarias
- copiar referencia

## Ejemplo de datos

```js
{
  category: "personajes",
  title: "Esteban",

  character: {
    info: {
      personal: [
        { label: "Edad", value: "21 años (inicio del Libro 1)" }
      ],
      narrative: [
        { label: "Pareja", value: "Eulalia (desde ebu gogo)" }
      ]
    },

    profile: {
      appearance: "...",
      personality: "...",
      motivations: "...",
      capabilities: ["...", "..."],
      limitations: "..."
    },

    history: [
      { title: "Antes de Sethoria", body: "..." },
      { title: "Japón", body: "..." }
    ],

    relationships: {
      personal: [
        {
          targetId: "personaje_eulalia",
          type: "Pareja",
          note: "..."
        }
      ]
    },

    participation: {
      grupos: ["grupo_principal"],
      eventos: ["evento_x"]
    },

    gallery: [
      {
        url: "images/esteban-retrato.jpg",
        title: "Retrato",
        category: "Retratos",
        caption: "..."
      }
    ],

    research: {
      canon: "Confirmado",
      pending: ["..."],
      inspirations: ["..."],
      notes: ["..."]
    }
  }
}
```

## Qué NO hace esta tanda

- No crea automáticamente etapas narrativas.
- No interpreta evolución psicológica.
- No obliga a registrar todos los arcos.
- No crea campos vacíos para que la página parezca “completa”.
- No convierte la ficha en una enorme tabla.
- No añade edición web todavía.

La siguiente tanda podrá modificar esta plantilla después de probarla visualmente con personajes reales.
