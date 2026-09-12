# Sethoria Atlas — Plantilla 0

Esta tanda construye la **ficha base modular** sobre la que después se especializará cada categoría.

No pretende que Personajes, Lugares, Barcos o Batallas terminen siendo iguales. Lo que comparte es la lógica de navegación, jerarquía visual y formato de datos; cada categoría ya dispone de un conjunto propio de pestañas.

## Jerarquía general

`Inicio → Categoría → Elemento → Ficha`

La ficha se divide en:

1. **Identidad**
   - categoría
   - título
   - subtítulo opcional
   - resumen
   - imagen opcional
   - hasta cuatro datos clave

2. **Pestañas contextuales**
   - Personajes: Resumen / Relaciones / Cronología / Apariciones / Fuentes
   - Grupos: Resumen / Miembros / Relaciones / Cronología / Fuentes
   - Lugares: Resumen / Mapa / Presencias / Historia / Fuentes
   - Batallas: Resumen / Fuerzas / Desarrollo / Mapa / Fuentes
   - Barcos: Resumen / Diseño / Tripulación / Viajes / Fuentes
   - etc.

3. **Identificación técnica**
   - ID
   - etiqueta maestra
   - alias
   - etiquetas secundarias
   - copiar etiqueta / referencia

La identificación técnica permanece plegada por defecto.

## Campos comunes admitidos

```js
{
  id: "personaje_esteban",
  title: "Esteban",
  subtitle: "...",
  category: "personajes",
  masterTag: "personaje_esteban",
  aliases: [],
  tags: [],
  summary: "...",

  // Imagen principal:
  image: "...",
  imageUrl: "...",
  thumbnail: "...",
  cover: "...",

  // Datos breves:
  facts: [
    { label: "Origen", value: "..." }
  ],

  // Secciones del resumen:
  sections: [
    { title: "Personalidad", body: "..." }
  ],

  // Vínculos explícitos:
  relations: [
    { targetId: "otra_entidad", type: "Relación", note: "..." }
  ],

  // Cronología:
  timeline: [
    { date: "...", title: "...", description: "..." }
  ],

  // Material:
  media: [
    { type: "image", url: "...", title: "...", caption: "..." }
  ],

  // Fuentes:
  sources: [
    { title: "...", url: "...", note: "..." }
  ],

  notes: ["..."]
}
```

## Mapas

La Plantilla 0 ya entiende mapas basados en imagen:

```js
map: {
  image: "mapa-paris-1789.jpg",
  caption: "París, 1789",
  points: [
    { x: 43, y: 31, label: "Punto A", targetId: "lugar_x" },
    { x: 61, y: 52, label: "Punto B" }
  ]
}
```

`x` e `y` son porcentajes sobre la imagen. Si un punto contiene `targetId`, el pin puede abrir otra ficha.

## Relaciones automáticas

Además de `relations`, la ficha intenta detectar conexiones mediante:

- título de otra entidad mencionado en el resumen;
- alias;
- etiqueta maestra;
- referencias inversas de otras fichas.

Esto sirve como ayuda, no como autoridad canónica. Los vínculos explícitos siguen siendo los de mayor control.

## Campos específicos ya previstos

La plantilla acepta, según categoría:

- `members`, `crew`
- `participants`, `forces`
- `events`, `appearances`
- `specs`, `details`, `attributes`
- `society`
- `scope`
- `examples`
- `stages`
- `adaptation` / `sethoriaUse`
- `map`, `mapImage`, `mapPoints`
- `links`
- `media`, `gallery`
- `sources`, `references`

Las tandas siguientes pueden convertir estos módulos genéricos en vistas especializadas sin cambiar el esquema central.
