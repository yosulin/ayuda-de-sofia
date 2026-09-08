# Protocolo de colaboración entre IAs

Este documento define cómo colaboran las IAs que participan en **Ayuda de Sofía**. Debe leerse antes de modificar código, datos académicos, importadores, Firebase o el esquema lingüístico.

## Roles

### Josu — propietario del producto

Define objetivos, prioridades y decisiones educativas. Aprueba cambios de alcance y decisiones que afecten al comportamiento del producto.

### ChatGPT — fuente académica, arquitectura de datos y auditoría

Responsabilidades:

- mantener y auditar la fuente lingüística de referencia;
- fusionar y normalizar fuentes externas;
- definir el modelo conceptual de vocabulario/diccionario;
- detectar duplicados, polisemia, inconsistencias y contenido huérfano;
- mantener el contrato del esquema lingüístico;
- registrar cambios estructurales en `vocabulario/schema/SCHEMA_CHANGELOG.md`;
- revisar cambios de Claude que afecten a la fuente de verdad;
- producir informes de cobertura, calidad y pendientes.

ChatGPT no debe modificar silenciosamente una estructura consumida por la aplicación.

### Claude — implementación y desarrollo

Responsabilidades:

- implementar PWA, Firebase, importadores, exportadores, editor y herramientas;
- consumir el esquema publicado, no reinventarlo dentro del código;
- mantener compatibilidad con la versión de esquema indicada;
- validar datos al importar y fallar explícitamente ante versiones incompatibles;
- informar de inconsistencias de datos o diseño en `docs/AI_HANDOFF.md`;
- no corregir silenciosamente conocimiento académico para hacer funcionar el código.

## Fuente de verdad

La fuente académica versionable se describe en:

`vocabulario/schema/LANGUAGE_DATA_CONTRACT.md`

El APKG, Firestore, catálogos de imágenes y otros formatos son representaciones construidas a partir de esta fuente o fuentes de importación, salvo decisión registrada expresamente.

## Regla principal

**El código se adapta al contrato de datos; el contrato de datos no se cambia silenciosamente para facilitar el código.**

Si Claude detecta que el esquema impide una implementación correcta, registra una propuesta en `docs/AI_HANDOFF.md`. ChatGPT la audita y Josu decide cuando afecte al producto o al alcance.

## Cambios de esquema

Todo cambio requiere:

1. motivo;
2. campos afectados;
3. compatibilidad hacia atrás;
4. estrategia de migración;
5. nueva versión de esquema si rompe compatibilidad;
6. entrada en `vocabulario/schema/SCHEMA_CHANGELOG.md`;
7. entrada en `docs/AI_HANDOFF.md` si requiere trabajo del otro agente.

Ninguna IA debe asumir que la otra recuerda conversaciones externas a GitHub.

## Incidencias detectadas por Claude

Ejemplos: acepciones mezcladas, `ConceptId` duplicado, traducción incoherente, audio inexistente, definición contradictoria, valores no contemplados por el contrato.

Claude debe:

1. no corregir el dato silenciosamente;
2. mantener un comportamiento seguro;
3. registrar el hallazgo en `docs/AI_HANDOFF.md`;
4. indicar si bloquea o no el desarrollo.

## Cambios académicos realizados por ChatGPT

Si ChatGPT cambia nombres o semántica de campos, `ConceptId`, tratamiento de acepciones, idiomas, audio, imágenes, ejemplos o disponibilidad, debe actualizar contrato y changelog y dejar un handoff a Claude.

## Versionado

El dataset declara `schemaVersion`.

- cambio compatible/aditivo: incremento menor (`1.1`);
- cambio incompatible: incremento mayor (`2.0`).

La aplicación debe conocer la versión máxima compatible y rechazar importaciones incompatibles en vez de interpretar campos a ciegas.

## Firebase

Firestore no es la fuente académica maestra. Debe poder reconstruirse/publicarse desde la fuente versionada sin destruir el progreso de usuarios.

Los datos personales y el progreso de usuarios están fuera del dataset académico.

## APKG

APKG es un formato de intercambio de primera clase y puede conservar multimedia, pero no es el mecanismo de coordinación entre IAs.

Los importadores/exportadores deben documentar transformaciones no reversibles.

## Prioridad ante conflictos

1. decisión explícita de Josu;
2. contrato/documentación versionada en GitHub;
3. dataset maestro publicado;
4. implementación actual;
5. conversaciones externas.

Si código y documentación discrepan, se informa; no se asume automáticamente que el código es correcto.

## Objetivo

Que Josu pueda trabajar simultáneamente con varias IAs sin convertirse en mensajero manual y sin crear fuentes de verdad incompatibles.
