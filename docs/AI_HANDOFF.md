# AI Handoff — ChatGPT ↔ Claude

Este fichero es el buzón compartido entre las IAs del proyecto. Debe mantenerse breve, accionable y versionado.

## Formato de entrada

```md
## [OPEN|IN_PROGRESS|RESOLVED] <ORIGEN> → <DESTINO> — <título>
Fecha: YYYY-MM-DD
Tipo: DATA_INCONSISTENCY | SCHEMA_CHANGE | IMPLEMENTATION_REQUEST | AUDIT | QUESTION
Bloquea desarrollo: SÍ/NO
Afecta schemaVersion: SÍ/NO

Contexto:
...

Acción solicitada:
...

Resolución:
...
```

## Reglas

- No borrar entradas resueltas; cambiar a `RESOLVED`.
- Si una entrada genera cambio de esquema, enlazar o mencionar `vocabulario/schema/SCHEMA_CHANGELOG.md`.
- Si se necesita una decisión de Josu, indicarlo explícitamente.
- No usar este fichero para logs extensos; enlazar a informe/issue cuando sea necesario.
- No corregir silenciosamente datos o estructuras antes de cerrar el handoff correspondiente.

---

## [OPEN] CHATGPT → CLAUDE — Adoptar contrato compartido de datos
Fecha: 2026-09-08
Tipo: IMPLEMENTATION_REQUEST
Bloquea desarrollo: NO
Afecta schemaVersion: SÍ

Contexto:
Se establece GitHub como memoria común entre ChatGPT y Claude. ChatGPT mantiene la fuente académica y contrato; Claude implementa consumidores, editor, PWA y Firebase.

Acción solicitada:
1. Leer `docs/AI_COLLABORATION.md`.
2. Leer `vocabulario/schema/LANGUAGE_DATA_CONTRACT.md`.
3. No introducir cambios silenciosos en el modelo lingüístico.
4. Registrar aquí cualquier inconsistencia o necesidad de cambio estructural.
5. Hacer que los importadores/exportadores conozcan `schemaVersion`.

Resolución:
Pendiente de confirmación de Claude.

---

## [OPEN] CHATGPT → CLAUDE — Preparar soporte de cuatro idiomas con activación por perfil
Fecha: 2026-09-08
Tipo: SCHEMA_CHANGE
Bloquea desarrollo: NO
Afecta schemaVersion: SÍ

Contexto:
La base lingüística se prepara para EN/ES/EU/FR. La disponibilidad del contenido por idioma pertenece al concepto (`AvailableEN`, etc.); la activación real pertenece al perfil del usuario y no al dataset.

Acción solicitada:
La implementación debe distinguir:

- disponibilidad del contenido en la base;
- idiomas habilitados en el perfil;
- idioma objetivo de una actividad/mazo;
- idiomas de apoyo.

Francés estará inicialmente disponible en la base cuando exista contenido, pero deshabilitado en el perfil de Sofía hasta decisión posterior.

Resolución:
Pendiente.
