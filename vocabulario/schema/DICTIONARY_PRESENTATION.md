# Presentación del diccionario por acepciones

Decisión de producto ratificada por Josu el 15/09/2026.

## Principio

Una palabra o entrada léxica puede tener varios sentidos. La polisemia no se aplasta ni se resuelve eligiendo una única traducción.

La entrada agrupa sentidos. **Cada sentido es la unidad semántica que posee sus traducciones, definición y ejemplo.**

Por tanto, `book` puede contener al menos:

```text
book

├── noun · written work
│   EN book
│   ES libro
│   EU liburu
│   FR livre
│
│   Definition
│   EN A set of written or printed pages...
│   ES Conjunto de páginas escritas o impresas...
│   EU ...
│   FR Ensemble de pages écrites ou imprimées...
│
│   Example
│   EN I'm reading a book.
│   ES Estoy leyendo un libro.
│   EU ...
│   FR Je lis un livre.
│
└── verb · reserve
    EN book
    ES reservar
    EU erreserbatu
    FR réserver

    Definition
    EN To arrange in advance to have a seat, room, ticket...
    ES Reservar con antelación una plaza, habitación, billete...
    EU ...
    FR Réserver à l'avance une place, une chambre...

    Example
    EN We booked a hotel for Saturday.
    ES Reservamos un hotel para el sábado.
    EU ...
    FR Nous avons réservé un hôtel pour samedi.
```

## Una única base de conocimiento

**Diccionario, tarjetas, spelling, ejercicios y futuros módulos NO mantienen copias independientes del contenido.** Todos consumen la misma entrada y los mismos `Senses[]`.

La base de conocimiento contiene el máximo contexto disponible:

- lemas y equivalencias EN/ES/EU/FR;
- acepciones;
- definiciones;
- ejemplos;
- audio EN/FR;
- imagen y metadatos visuales cuando existan;
- clasificación educativa y lingüística.

Cada módulo decide qué **proyección** necesita mostrar. No crea ni reescribe su propia versión del dato.

### Ejemplo: aprendizaje de inglés

Una tarjeta EN puede reutilizar el mismo sentido `book / written_work` y mostrar solo:

```text
imagen → book 🔊
ES libro
EU liburu
Example EN I'm reading a book. 🔊
```

Puede ocultar francés aunque `FR=livre` exista en la base. Puede ocultar la definición si la dinámica de esa tarjeta no la necesita. El dato sigue existiendo y permanece compartido.

### Ejemplo: aprendizaje de francés

El mismo sentido, sin duplicarlo, puede proyectarse como:

```text
imagen → livre 🔊
ES libro
EU liburu
Example FR Je lis un livre. 🔊
```

### Ejemplo: diccionario

El diccionario prioriza riqueza semántica y puede mostrar todas las acepciones, equivalencias, definiciones y ejemplos permitidos por el perfil/idiomas habilitados.

## Imágenes

La imagen pertenece al conocimiento reutilizable, no al módulo de tarjetas.

Por tanto, **el modelo debe permitir usar una imagen también en el diccionario**, aunque la decisión de UI sea contextual:

- tarjetas: la imagen puede ser protagonista y actuar como pista/estímulo;
- diccionario: la imagen puede mostrarse como apoyo visual opcional y discreto;
- conceptos abstractos o de baja `Imageability`: puede no mostrarse ninguna imagen;
- la UI nunca debe depender de que exista imagen.

No se fija todavía que el diccionario muestre siempre imágenes. Se fija únicamente que **no deben duplicarse ni descartarse por pertenecer a otro módulo**.

## Reglas de datos

1. `ConceptId` identifica la entrada léxica estable.
2. `Senses[]` contiene uno o varios sentidos.
3. Cada objeto de `Senses[]` contiene como autoridad semántica:
   - `SenseId`
   - `PartOfSpeech`
   - `Translations` EN/ES/EU/FR
   - `Definitions` EN/ES/EU/FR
   - `Examples` EN/ES/EU/FR
   - `SourceRefs`
4. Una misma forma puede aparecer en varios sentidos con traducciones diferentes. Ejemplo: `bank → banque` y `bank → rive` son simultáneamente correctos si corresponden a sentidos distintos.
5. Los campos planos (`Spanish`, `French`, `DefinitionEN`, etc.) son únicamente proyecciones de compatibilidad/búsqueda o del sentido principal. Nunca deben sustituir a `Senses` en el diccionario.
6. Definición y ejemplo pertenecen al sentido concreto, no a la entrada global.
7. La UI del diccionario debe mostrar cada sentido como bloque independiente, siguiendo el orden: categoría + glosa corta → equivalencias → Definition → Example.
8. No se deben mostrar necesariamente los cuatro idiomas en todos los perfiles; la disponibilidad del dataset y los idiomas habilitados del usuario siguen siendo conceptos separados.
9. Los ejemplos de `Senses[]` son los mismos que reutilizan las tarjetas y ejercicios. No existen `examplesDictionary` y `examplesFlashcard` separados salvo que en el futuro haya una razón pedagógica explícita y documentada.
10. Los módulos son vistas/proyecciones del conocimiento. Una edición revisada de traducción, definición o ejemplo se hace una vez en el maestro y se propaga a todas las vistas consumidoras.

## Consecuencia para la fusión 5K

Los conflictos de matching EN↔FR no se resuelven descartando candidatos cuando representan sentidos diferentes. La reconciliación debe identificar y conservar todos los sentidos válidos.

Ejemplo:

```text
bank
├── financial institution → ES banco · FR banque
└── side of a river       → ES orilla · FR rive
```

Esto convierte el trabajo de fusión en una reconciliación por acepciones, no en una correspondencia 1:1 entre palabras.

## Estado

Decisión cerrada y vigente. Compatible con `schemaVersion 1.1`; no requiere cambio estructural, sino una interpretación más estricta y una presentación obligatoria del modelo `Senses`.
