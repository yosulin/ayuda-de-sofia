# Schema Changelog

Historial del contrato de la fuente lingüística.

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

- Definir representación estructural definitiva de `Senses`.
- Definir formato canónico exacto del dataset (JSONL/JSON como fuente primaria y CSV como vista/intercambio).
- Definir IDs estables tras la fusión final del corpus ~5K.
- Definir manifest de multimedia y checksums.
