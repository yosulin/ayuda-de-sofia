# Language Data Contract

`schemaVersion: 1.0`

Este documento define la estructura conceptual de la fuente lingüística de **Ayuda de Sofía**. El dataset maestro es la fuente versionable; APKG, Firestore y otros formatos son representaciones derivadas.

## Principios

- La unidad base es un **concepto lingüístico**, no una tarjeta.
- Un mismo concepto puede expresarse en varios idiomas.
- La disponibilidad de contenido por idioma se guarda en el concepto.
- La activación de idiomas pertenece al perfil del usuario.
- Las actividades/mazos definen idioma objetivo y lenguas de apoyo.
- Las acepciones no deben aplastarse para simplificar importaciones.
- Los campos pueden estar vacíos si el contenido aún no existe.
- El sistema debe distinguir contenido generado/propuesto de contenido revisado.

## Identidad

- `schemaVersion`
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

## Clasificación lingüística

- `PartOfSpeech`
- `SenseStatus`
- `Senses`
- `IrregularForms`
- `CEFR`

`Senses` debe poder evolucionar a una estructura explícita por acepción sin perder información. En schema 1.0 puede conservarse como dato estructurado serializable; ninguna implementación debe asumir que una palabra tiene una sola acepción.

## Clasificación educativa

- `Theme`
- `Tags`
- `Stage`
- `Uses`

### `Uses`

Colección extensible de usos permitidos, por ejemplo:

- `dictionary`
- `flashcard`
- `spelling`

No confundir `Uses` con asignaciones a alumnos.

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

No se requiere audio ES en v1, aunque una futura versión puede añadirlo de forma compatible.

## Euskera

- `AvailableEU`
- `Basque`
- `DefinitionEU`
- `ExampleEU`
- `EuStatus`

No se requiere audio EU en v1.

Valores recomendados de `EuStatus`:

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

Valores recomendados de `FrStatus`:

- `empty`
- `imported`
- `proposed`
- `reviewed`

## Visual

- `Image`
- `ImagePrompt`
- `Imageability`

Valores iniciales de `Imageability`:

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
  - animal_dog
  - animal_cat
```

El mismo `ConceptId` puede reutilizarse en actividades EN o FR sin duplicar conocimiento.

## Audio

- EN y FR requieren soporte de audio de palabra y ejemplo cuando esté disponible.
- ES y EU no requieren audio en v1.
- El contenido textual debe existir independientemente del audio para permitir regeneración posterior.
- Los consumidores deben tolerar audio ausente.

## Fuente y procedencia

La procedencia debe conservarse cuando sea posible. No debe asumirse que todo contenido externo puede redistribuirse públicamente.

El repositorio público no debe incorporar multimedia o datasets de terceros sin revisar licencia y permisos de redistribución.

## Compatibilidad

Los consumidores deben:

- aceptar campos desconocidos en versiones menores cuando sea seguro;
- no asumir que campos opcionales están completos;
- rechazar versiones mayores incompatibles;
- no usar Firestore como fuente para reconstruir el conocimiento maestro.
