# Language Data Contract

`schemaVersion: 1.1`

Este documento define la estructura conceptual de la fuente lingüística de **Ayuda de Sofía**.

## Tres papeles distintos

El proyecto distingue tres papeles que no compiten entre sí:

1. **Fuente de importación**: uno o varios `.apkg` u otras fuentes externas. Los `.apkg` siguen siendo la entrada principal para incorporar corpus y multimedia.
2. **Fuente de verdad curada**: el maestro versionado en Git, en formato **JSONL**, una línea por entrada lingüística. Aquí viven las correcciones, traducciones, definiciones, acepciones, estados de revisión y clasificación que sobreviven a cualquier publicación.
3. **Base de servicio**: Firestore y Storage/Hosting, optimizados para que la aplicación consulte el contenido. Se pueden regenerar a partir del maestro sin perder el progreso de usuarios.

El APKG no se convierte por ello en una salida obligatoria. Puede seguir siendo formato de importación e intercambio. Firestore no sustituye al maestro como historial auditable.

Flujo de referencia:

```text
.apkg / fuentes externas
        ↓ importación
maestro JSONL versionado
        ↓ publicación
Firestore + multimedia
        ↓
app / editor
        ↓ cambios revisados
maestro JSONL
```

## Principios

- La unidad base es una **entrada lingüística reutilizable**, no una tarjeta.
- Un mismo registro puede expresarse en varios idiomas.
- La disponibilidad de contenido por idioma se guarda en la entrada.
- La activación de idiomas pertenece al perfil del usuario.
- Las actividades/mazos definen idioma objetivo y lenguas de apoyo.
- Las acepciones no deben aplastarse para simplificar importaciones.
- Los campos pueden estar vacíos si el contenido aún no existe.
- El sistema debe distinguir contenido generado/propuesto de contenido revisado.
- El maestro JSONL es el único formato que debe permitir un round-trip completo sin pérdida del modelo v1.1.

## Identidad

- `ConceptId`
- `EntryType`
- `Active`
- `Source`
- `ContentStatus`
- `Notes`
- `OriginalGuid`

### `EntryType`

Valores iniciales:

- `concept`
- `expression`
- `sentence`

### Regla definitiva de `ConceptId`

`ConceptId` identifica una entrada léxica estable y nunca se muestra como contenido educativo.

Regla v1.1:

```text
<lema-en-normalizado>_<pos-normalizado>
```

Ejemplos:

- `dog_n`
- `about_adv`
- `about_prep`
- `can_modal`
- `can_n`

Normalización:

- minúsculas;
- ASCII para el identificador técnico;
- espacios y signos → `_`;
- POS canónico corto (`n`, `v`, `adj`, `adv`, `prep`, `conj`, `pron`, `det`, `modal`, etc.).

Cuando **lema + POS** siga colisionando porque existan homógrafos que no deban formar una sola entrada, se añade un calificador semántico estable, no un ordinal arbitrario:

- `bass_n_fish`
- `bass_n_music`

Solo durante importaciones provisionales se permite un sufijo numérico. Antes de publicar al maestro debe sustituirse por un identificador estable o congelarse explícitamente como excepción documentada.

Cambiar un `ConceptId` publicado requiere migración y nunca debe hacerse silenciosamente.

## Clasificación lingüística

- `PartOfSpeech`
- `SenseStatus`
- `Senses`
- `IrregularForms`
- `CEFR`

## Forma definitiva de `Senses`

`Senses` es un array JSON. Una entrada puede tener una o varias acepciones.

Estructura canónica mínima:

```json
[
  {
    "SenseId": "financial_institution",
    "PartOfSpeech": "noun",
    "Translations": {
      "en": ["bank"],
      "es": ["banco"],
      "eu": ["banku"],
      "fr": ["banque"]
    },
    "Definitions": {
      "en": "A financial institution that keeps and manages money.",
      "es": "Entidad financiera que guarda y gestiona dinero.",
      "eu": "Dirua gorde eta kudeatzen duen finantza-erakundea.",
      "fr": "Établissement financier qui conserve et gère de l'argent."
    },
    "Examples": {
      "en": "My parents went to the bank.",
      "es": "Mis padres fueron al banco.",
      "eu": "Nire gurasoak bankura joan ziren.",
      "fr": "Mes parents sont allés à la banque."
    },
    "SourceRefs": []
  }
]
```

Reglas:

- `SenseId` es único dentro del `ConceptId` y estable una vez publicado.
- Preferir un slug semántico legible (`river_edge`, `financial_institution`) frente a `01`, `02` cuando pueda determinarse con seguridad.
- Variantes de género, ortografía o flexión **no son acepciones nuevas**. Se representan dentro de `Translations` o campos de formas.
- Sinónimos tampoco crean automáticamente una nueva acepción.
- Si `Senses` contiene más de una acepción, los campos planos `DefinitionXX`, `ExampleXX`, `Spanish`, `Basque`, `French` son una **proyección de compatibilidad/búsqueda**, no la autoridad semántica. En caso de discrepancia, manda `Senses`.
- Las actividades pueden apuntar a `ConceptId` completo o, cuando necesiten una acepción concreta, a `ConceptId + SenseId`.

`SenseStatus` indica si la separación de acepciones está `single`, `multi`, `provisional` o `reviewed`.

## Clasificación educativa

- `Theme`
- `Tags`
- `Stage`
- `Uses`

### `Uses`

Colección extensible de usos permitidos:

- `dictionary`
- `flashcard`
- `spelling`

Reglas:

- `Active` controla si la entrada está publicada/usable globalmente.
- `dictionary ∈ Uses` controla aparición en diccionario.
- `flashcard ∈ Uses` equivale funcionalmente al antiguo `deck: true`.
- `spelling ∈ Uses` habilita ejercicios de escritura cuando el módulo los soporte.
- `Uses` no representa asignaciones a alumnos.

## Inglés

- `AvailableEN`
- `English`
- `DefinitionEN`
- `ExampleEN`
- `WordAudioEN`
- `ExampleAudioEN`

## Castellano

- `AvailableES`
- `Spanish`
- `DefinitionES`
- `ExampleES`

No se requiere audio ES en v1.

## Euskera

- `AvailableEU`
- `Basque`
- `DefinitionEU`
- `ExampleEU`
- `EuStatus`

No se requiere audio EU en v1.

### Norma lingüística de euskera

La forma de diccionario del dataset es **euskara batua**.

- Sustantivos: lema sin artículo (`txakur`, no `txakurra`; `katu`, no `katua`).
- Adjetivos: forma léxica base (`gorri`, no `gorria`).
- Los ejemplos sí usan artículo, caso y flexión cuando la frase lo requiera.
- Variantes dialectales/locales pueden conservarse como variantes o tags, pero no sustituyen el lema batua canónico.

Valores de `EuStatus`:

- `empty`
- `proposed`
- `reviewed`

## Francés

- `AvailableFR`
- `French`
- `DefinitionFR`
- `ExampleFR`
- `WordAudioFR`
- `ExampleAudioFR`
- `FrStatus`

Valores de `FrStatus`:

- `empty`
- `imported`
- `proposed`
- `reviewed`

## Invariante `AvailableXX`

`AvailableXX` significa **hay una forma léxica utilizable en ese idioma**.

Por tanto:

- `AvailableEU: true` con `Basque: ""` es inválido.
- si falta la traducción, se usa `AvailableEU: false` + `EuStatus: empty`;
- un idioma puede estar disponible aunque todavía no tenga audio o ejemplo;
- la revisión se expresa mediante `EuStatus`/`FrStatus`, no falseando `AvailableXX`.

## Estados

`ContentStatus` gobierna el ciclo de vida global de la entrada:

- `draft`
- `active`
- `deprecated`

`EuStatus` y `FrStatus` gobiernan la calidad/revisión de ese idioma. No compiten con `ContentStatus`.

Regla de precedencia: una entrada `deprecated` no debe publicarse aunque un idioma esté `reviewed`.

## Visual

- `Image`
- `ImagePrompt`
- `Imageability`

Valores iniciales:

- `high`
- `medium`
- `scene`
- `low`

La ausencia de imagen no invalida un concepto.

## Perfil de usuario — fuera del dataset académico

Ejemplo conceptual:

```yaml
languages:
  es:
    enabled: true
    role: native
  eu:
    enabled: true
    role: native
  en:
    enabled: true
    role: learning
  fr:
    enabled: false
    role: learning
```

`enabled` del perfil no debe guardarse en el concepto.

## Actividad/mazo — fuera del concepto

Ejemplo:

```yaml
TargetLanguage: en
SupportLanguages:
  - es
  - eu
Concepts:
  - dog_n
  - cat_n
```

El mismo `ConceptId` puede reutilizarse en actividades EN o FR sin duplicar conocimiento.

## Audio

- EN y FR soportan audio de palabra y ejemplo cuando esté disponible.
- ES y EU no requieren audio en v1.
- El contenido textual existe independientemente del audio para permitir regeneración posterior.
- Los consumidores deben tolerar audio ausente.

## `schemaVersion`: ubicación por formato

### Maestro JSONL

La versión vive de forma autoritativa en:

`vocabulario/data/master/manifest.json`

Ejemplo:

```json
{
  "schemaVersion": "1.1",
  "dataVersion": "0.9",
  "recordCount": 5000
}
```

Las líneas JSONL no necesitan repetir `schemaVersion`.

### Firestore

Documento único:

`_meta/languageDataset`

Campos mínimos:

- `schemaVersion`
- `dataVersion`
- `recordCount`
- `publishedAt`
- `sourceChecksum` cuando exista

Los documentos de conceptos no repiten la versión.

### CSV exportado por la app

Como CSV no tiene cabecera de metadatos estándar, cada fila debe incluir `schemaVersion`. El CSV es una vista/intercambio **con pérdida** cuando existen estructuras anidadas como `Senses`; no es fuente canónica.

### APKG propio de Ayuda de Sofía

Cada nota incluye el campo `SchemaVersion`. Para estructuras anidadas se usa un campo JSON serializado (`SensesJSON`). Un APKG externo sin `SchemaVersion` se trata como fuente legacy y pasa por un adaptador explícito.

## Correspondencia canónica maestro → Firestore → CSV → APKG

| Maestro JSONL | Firestore objetivo | CSV app/intercambio | APKG Sofia |
|---|---|---|---|
| `ConceptId` | doc id + `id` | `id` | `ConceptId` |
| `EntryType` | `tipoEntrada` | `tipoEntrada` | `EntryType` |
| `Active` | `active` | `active` | `Active` |
| `Source` | `fuentes` | `source` | `Source` |
| `ContentStatus` | `estadoContenido` | `contentStatus` | `ContentStatus` |
| `Notes` | `notas` | `notes` | `Notes` |
| `OriginalGuid` | `originalGuid` | `originalGuid` | `OriginalGuid` |
| `PartOfSpeech` | `categoriaGramatical` | `partOfSpeech` | `PartOfSpeech` |
| `SenseStatus` | `estadoAcepciones` | `senseStatus` | `SenseStatus` |
| `Senses` | `acepciones[]` | `sensesJson` | `SensesJSON` |
| `IrregularForms` | `formasIrregulares` | `irregularForms` | `IrregularForms` |
| `CEFR` | `cefr` | `cefr` | `CEFR` |
| `Theme` | `tema` | `theme` | `Theme` |
| `Tags` | `etiquetas[]` | `tags` | `Tags` |
| `Stage` | `capa` | `stage` | `Stage` |
| `Uses` | `usos[]` | `uses` | `Uses` |
| `AvailableEN` | `idiomas.en.disponible` | `availableEN` | `AvailableEN` |
| `English` | `word` + `idiomas.en.lema` | `word` | `English` |
| `DefinitionEN` | `idiomas.en.definicion` | `definitionEN` | `DefinitionEN` |
| `ExampleEN` | `example.en` + `idiomas.en.ejemplo` | `exampleEN` | `ExampleEN` |
| `WordAudioEN` | `idiomas.en.audioPalabra` | `wordAudioEN` | `WordAudioEN` |
| `ExampleAudioEN` | `idiomas.en.audioEjemplo` | `exampleAudioEN` | `ExampleAudioEN` |
| `AvailableES` | `idiomas.es.disponible` | `availableES` | `AvailableES` |
| `Spanish` | `es` + `idiomas.es.lema` | `es` | `Spanish` |
| `DefinitionES` | `idiomas.es.definicion` | `definitionES` | `DefinitionES` |
| `ExampleES` | `example.es` + `idiomas.es.ejemplo` | `exampleES` | `ExampleES` |
| `AvailableEU` | `idiomas.eu.disponible` | `availableEU` | `AvailableEU` |
| `Basque` | `eu` + `idiomas.eu.lema` | `eu` | `Basque` |
| `DefinitionEU` | `idiomas.eu.definicion` | `definitionEU` | `DefinitionEU` |
| `ExampleEU` | `example.eu` + `idiomas.eu.ejemplo` | `exampleEU` | `ExampleEU` |
| `EuStatus` | `idiomas.eu.estado` | `euStatus` | `EuStatus` |
| `AvailableFR` | `idiomas.fr.disponible` | `availableFR` | `AvailableFR` |
| `French` | `idiomas.fr.lema` | `fr` | `French` |
| `DefinitionFR` | `idiomas.fr.definicion` | `definitionFR` | `DefinitionFR` |
| `ExampleFR` | `idiomas.fr.ejemplo` | `exampleFR` | `ExampleFR` |
| `WordAudioFR` | `idiomas.fr.audioPalabra` | `wordAudioFR` | `WordAudioFR` |
| `ExampleAudioFR` | `idiomas.fr.audioEjemplo` | `exampleAudioFR` | `ExampleAudioFR` |
| `FrStatus` | `idiomas.fr.estado` | `frStatus` | `FrStatus` |
| `Image` | `imagen` | `image` | `Image` |
| `ImagePrompt` | `imagePrompt` | `imagePrompt` | `ImagePrompt` |
| `Imageability` | `imageability` | `imageability` | `Imageability` |

### Compatibilidad con campos actuales de Firestore

Durante la migración se mantienen aliases compatibles:

- `word` ← `English`
- `es` ← `Spanish`
- `eu` ← `Basque`
- `example.en` ← `ExampleEN`
- `active` ← `Active`
- `deck: true` ← `flashcard ∈ Uses`

Estos aliases son una proyección de servicio; no son la autoridad del maestro.

## Fuente y procedencia

La procedencia debe conservarse cuando sea posible. No debe asumirse que todo contenido externo puede redistribuirse públicamente.

Los APKG/ficheros externos se consideran fuentes de importación. La política de publicación de multimedia se decide separadamente de la fusión lingüística y debe mantener trazabilidad de origen.

## Compatibilidad

Los consumidores deben:

- aceptar campos desconocidos en versiones menores cuando sea seguro;
- no asumir que campos opcionales están completos;
- rechazar versiones mayores incompatibles;
- validar invariantes (`AvailableXX`, IDs, `Senses`) antes de publicar;
- no usar Firestore como única fuente para reconstruir el conocimiento maestro.
