# Las escenas

Especificación de los dibujos de las fichas. **Medida sobre los 10 SVG que ya
existen**, no inventada: las cifras y los colores de aquí salen de leerlos.

Existe porque lo que viene son cientos de imágenes. Un criterio que solo vive en
la cabeza de quien hizo las diez primeras no sobrevive a la número cuarenta.

---

## La idea, y por qué

> *«Añade color a tu vida. Aprende un idioma nuevo.»*

La escena entera va en **gris**. Solo el concepto que se está aprendiendo va en
**color**. Eso no es un capricho estético: es lo que permite enseñar *qué*
palabra se estudia **sin traducirla y sin escribirla**. Si la escena de `dog`
llevara el perro en gris y el sofá en color, la ficha estaría preguntando otra
cosa.

De ahí se siguen dos reglas que no se negocian:

1. **Una sola cosa en color por escena.** Dos cosas en color es una escena
   ambigua, y una ficha ambigua es una ficha rota.
2. **Ni una letra dentro del dibujo.** Nada de rótulos, ni en inglés ni en
   castellano ni en euskera: la palabra es la respuesta que Sofía tiene que
   escribir. Un dibujo con la palabra dentro es la solución impresa en el
   examen.

El contexto en gris sí importa: `dog` no es un perro recortado sobre blanco, es
un niño en un jardín **con** el perro en color. El contexto desambigua sin
traducir.

---

## Formato

| | |
|---|---|
| Formato | SVG, sin compilar, servido tal cual por Hosting |
| `viewBox` | `0 0 400 300` (4:3) — **los 10 lo usan, es obligatorio** |
| Sin `width`/`height` | el CSS lo escala: `width:100%`, `aspect-ratio:4/3`, `object-fit:cover` |
| Tamaño | entre 2 y 4 KB. Los 10 actuales: de 2.220 a 3.584 bytes |
| Fuentes | ninguna. Nada de `<text>` |
| Imágenes embebidas | ninguna. Nada de `<image>` ni `data:` — es dibujo vectorial |

`object-fit: cover` recorta si el contenedor no es 4:3, así que **no pongas nada
importante pegado al borde**: deja unos 20 px de margen de seguridad.

---

## La paleta gris: exactamente estos seis

Idénticos en los 10 ficheros. No se inventan grises nuevos.

```css
.g0{fill:#F4F5F7}  /* fondo */
.g1{fill:#E4E7EB}  /* formas de fondo: nubes, suelo, paredes */
.g2{fill:#CDD2D9}  /* mobiliario, vallas, objetos medios */
.g3{fill:#AAB1BB}  /* volúmenes en primer plano */
.g4{fill:#7C848F}  /* contornos y detalle */
.g5{fill:#4B525C}  /* el trazo más oscuro, con cuentagotas */
```

Y un trazo, que usan 9 de los 10:

```css
.s4{fill:none;stroke:#7C848F;stroke-width:5;stroke-linecap:round}
```

El fondo `#F4F5F7` coincide a propósito con el `background` de `.escena__img` en
`estilos.css:901`: mientras la imagen carga no hay salto de color.

---

## El color: el halo y el concepto

El concepto lleva **sus propios colores**, los que le tocan (un perro marrón, una
manzana roja). No hay paleta cerrada para eso.

Lo que sí es convención es el **halo**: una mancha suave detrás del concepto que
lo despega del gris. Un solo tono claro, elegido en la familia del concepto:

```css
.halo{fill:#FFF1DC}   /* cálido: animales, comida */
.halo{fill:#EAF4FF}   /* frío: agua, cielo, escuela */
.halo{fill:#FFECEC}   /* rojo/rosa: colores, emociones */
```

Los ocho tonos usados hoy: `#FFF1DC` `#FFF6DF` `#FFECEC` `#FFEFF5` `#E8F4FF`
`#EAF3FF` `#EAF4FF` `#E9F7F2`. Sirven como punto de partida; lo que importa es
que sea **claro, desaturado y uno solo**.

Las clases del concepto se nombran por lo que son, no por el color:
`.fur`, `.fur2`, `.collar`, `.tongue`, `.dark`. Así se entiende el fichero sin
abrirlo en un editor.

---

## Accesibilidad: el `aria-label` es obligatorio

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img"
     aria-label="Un niño en un jardín; el perro aparece en color">
```

En **castellano**, y con esta forma: *contexto en gris* `;` *qué aparece en
color*. Ejemplos reales:

```
Un salón con un sofá; el gato aparece en color
Un parque en gris; la niña jugando y el balón aparecen en color
Varios globos en gris; un globo rojo aparece en color
```

Ojo: el `alt` del `<img>` **no** sale de aquí. Lo pone la app y está traducido
(`tarjetas.alt`): «Escena en gris donde solo aparece en color: {que}». El
`aria-label` del SVG describe la escena; el `alt` describe la ficha.

---

## Dónde vive cada fichero

```
vocabulario/media/images/<tema>/<nombre>.svg
```

Y en Firestore se guarda la **ruta relativa, nunca una URL**:

```json
{ "imagePath": "images/animals/animals_dog.svg" }
```

`media.js` la resuelve según el modo: con `medios: "hosting"` antepone
`./media/`; con `"storage"` le pide la URL a Firebase Storage. Guardar rutas es
lo que permite cambiar de un modo a otro tocando una palabra.

**El nombre del fichero no tiene que coincidir con el `ConceptId`.** El
importador sabe derivar `images/<tema>/<id>.<ext>` cuando no se le dice otra
cosa, pero si la tarjeta trae `imagePath` explícito, manda ese. Los 10 actuales
se llaman `<tema>_<palabra>.svg` y seguirán llamándose así aunque el `ConceptId`
pase a ser `dog_n`.

---

## Lo que no se puede dibujar

El contrato 1.1 tiene un campo `Imageability` con cuatro valores, y existe
precisamente por esto:

| | |
|---|---|
| `high` | un objeto: `apple`, `dog`, `book` |
| `medium` | necesita contexto: `teacher`, `sister` |
| `scene` | solo se entiende como situación: `play`, `rain` |
| `low` | **no se puede dibujar**: `become`, `think`, `mean`, `about` |

Para `low` no se fuerza una metáfora: una escena que hay que explicar ya ha
fallado. Esas palabras van al diccionario, o a un módulo que no dependa del
dibujo. **Marcar `Imageability: low` es una respuesta válida y útil**, no un
hueco pendiente.

---

## Antes de dar una tanda por buena

- `viewBox="0 0 400 300"`, sin `width` ni `height`
- los seis grises exactos, sin inventar
- **una sola cosa en color**
- ningún `<text>`, ninguna letra
- `role="img"` y `aria-label` en castellano con la forma de arriba
- nada importante a menos de 20 px del borde
- entre 2 y 4 KB
