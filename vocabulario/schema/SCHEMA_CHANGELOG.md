# Schema Changelog

Historial del contrato de la fuente lingüística.

## 1.1 — 2026-09-08

Cierre de las decisiones bloqueantes detectadas en `docs/AI_HANDOFF.md` antes de la fusión/publicación del corpus ~5K.

### Fuente, maestro y servicio

- Se adopta el modelo de **tres papeles**:
  - APKG/fuentes externas = fuente de importación;
  - JSONL versionado en Git = fuente de verdad curada;
  - Firestore = base de servicio para la aplicación.
- El formato canónico del maestro es JSONL, una línea por entrada lingüística.
- El CSV queda como formato de intercambio/vista con pérdida para estructuras anidadas.

### `Senses`

- `Senses` pasa a ser un array JSON explícito.
- Cada acepción tiene `SenseId`, POS, traducciones, definiciones, ejemplos y referencias de origen.
- Variantes de género/flexión y sinónimos no se convierten automáticamente en acepciones.
- En entradas polisémicas, los campos planos son proyecciones de compatibilidad; `Senses` es la autoridad semántica.

### `ConceptId`

- Formato base: `<lema-en-normalizado>_<pos-normalizado>`.
- Homógrafos que sigan colisionando usan calificador semántico estable (`bass_n_fish`, `bass_n_music`), no ordinal arbitrario.
- Los IDs publicados son estables; cambiarlos exige migración.

### Euskera

- Se fija **euskara batua** como norma canónica del dataset.
- Sustantivos/adjetivos usan forma de diccionario sin artículo cuando corresponda.
- Las formas `txakur`, `katu`, `sagar`, `liburu`, `irakasle`, `gorri`, `euri` quedan confirmadas para las siete tarjetas señaladas por Claude.

### `AvailableXX` y estados

- `AvailableXX=true` exige que exista la forma léxica principal del idioma.
- Un campo vacío implica `AvailableXX=false`.
- `ContentStatus` gobierna el ciclo de vida global (`draft`, `active`, `deprecated`).
- `EuStatus`/`FrStatus` gobiernan la revisión lingüística de ese idioma.

### `schemaVersion`

- Maestro: `vocabulario/data/master/manifest.json`.
- Firestore: `_meta/languageDataset`.
- CSV: columna `schemaVersion` repetida por fila.
- APKG propio: campo `SchemaVersion` por nota y `SensesJSON` para las acepciones.
- Fuentes APKG legacy sin versión pasan por adaptador explícito.

### Mapping

- Se incorpora al contrato una tabla maestro → Firestore → CSV → APKG.
- Los campos actuales `word`, `es`, `eu`, `example.en`, `active`, `deck` quedan definidos como aliases/proyecciones de compatibilidad de Firestore durante la migración.
- `deck: true` equivale a `flashcard ∈ Uses`.

## 1.0 — 2026-09-08

Primera versión formal compartida entre ChatGPT y Claude.

### Decisiones principales

- El dataset maestro versionable pasa a ser la fuente académica de verdad.
- APKG y Firestore son representaciones derivadas/intercambiables, no la memoria de coordinación entre IAs.
- `ConceptId` representa conocimiento reutilizable entre idiomas.
- Se contemplan EN, ES, EU y FR desde el nacimiento del esquema.
- Se diferencia disponibilidad de contenido (`AvailableXX`) de activación por perfil de usuario.
- Francés puede existir en la base aunque esté deshabilitado en el perfil de Sofía.
- Audio requerido/útil principalmente para EN y FR; ES/EU no requieren audio en v1.
- Se introduce `EntryType` para distinguir conceptos, expresiones y frases.
- Se introduce `Uses` para distinguir usos como diccionario, flashcard y spelling.
- Se preserva la polisemia; ninguna implementación debe asumir una sola acepción.
- Se introducen estados de revisión para contenido EU/FR.
- Se introducen `Image`, `ImagePrompt` e `Imageability` para el pipeline visual.

### Pendiente para versiones posteriores

- Definir manifest de multimedia y checksums.
- Refinar el modelo de procedencia por campo/acepción durante la fusión ~5K.
- Revisar si se necesitan estados de revisión equivalentes para EN/ES en futuras versiones.
