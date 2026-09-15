# Dónde estamos

Traspaso de una sesión de trabajo a la siguiente. Qué funciona, qué se decidió y
por qué, qué falta y qué está sin decidir.

> Última actualización: 14 de septiembre de 2026, versión **0.7.0**.
> Si estás leyendo esto y el repositorio ha avanzado mucho, contrástalo con
> `git log` antes de fiarte.

---

## Quién es Sofía y qué es esto

Una niña de 9 años de Zumaia (Gipuzkoa), castellanohablante y vascohablante,
que da inglés en el colegio. Esta app es una caja de herramientas para que
aprenda por su cuenta cuando le apetezca, hecha por su padre.

**No** pretende sustituir al colegio, ni a Duolingo, ni a Anki. Es un apoyo
familiar: la usan Sofía, sus padres y sus abuelos.

Y hay una decisión de fondo que conviene respetar: **nada de gamificación**. La
racha se quitó a propósito, con este argumento del padre: *«que no necesite la
app en realidad puede ser bueno»*. Si algo empieza a parecerse a presión sobre
una niña de 9 años, va en la dirección equivocada.

---

## Qué funciona hoy

Publicada en **https://sofiahelptool.web.app**, privada: solo entran los correos
de la colección `allowed` de Firestore.

| Módulo | Estado |
|---|---|
| **Tarjetas** | Funciona con **10 tarjetas de demostración**. Escena, audio, escribir la palabra, «la sabía» / «repasar». |
| **Diccionario** | Funciona, **apagado**. Es el paso 2. Busca en las tres lenguas, por acepción suelta y por principio de palabra. Da traducción y definición en los tres idiomas. |
| **Matemagia** | Funciona, **apagado**. Se retoma más adelante. |
| **Ajustes** | Idioma, versión, instalar, cerrar sesión, descargar el contenido en CSV. |

Interfaz en **castellano, euskera e inglés**. Armazón adaptativo con cuatro
repartos de navegación (barra inferior, lateral de iconos, lateral con texto,
cajón).

**Publicar es hacer merge a `main`.** Dos flujos en `.github/workflows/`:
`comprobar.yml` en cada rama y cada PR, y `desplegar.yml` en `main`, que pasa
la misma puerta y publica hosting, reglas de Firestore e índices. El secreto
`FIREBASE_SERVICE_ACCOUNT` está creado en GitHub y la configuración web se le
pregunta a Firebase en el momento, así que no hay claves en el repositorio.
Ya no se despliega a mano desde ninguna máquina.

La puerta es `tools/comprobar.mjs`, y corre igual en local. Comprueba lo que ya
ha fallado alguna vez de verdad: sintaxis de cada módulo, que la lista de
precacheo del service worker no se desincronice de lo que la app carga, los
enlaces de `index.html`, que los tres idiomas tengan las mismas claves y el
formato de `VERSION`. Las cinco se rompieron a propósito para verlas fallar, y
en la CI de verdad se subió un commit roto para comprobar que bloquea.

---

## El alcance de ahora: aprender vocabulario

Decidido el 14 de septiembre. **Una sola cosa a la vez.** Matemagia y Diccionario
se apagan —no se borran— y el trabajo es que Sofía aprenda palabras con las
fichas. Se apagan con `disponible: false` en `vocabulario/js/modulos.js`: el
módulo se sigue viendo en el índice, apagado y sin entrar, y desaparece de la
navegación. Encenderlo es cambiar esa palabra.

Y una regla que va con el alcance: **la app tiene todas las fichas dentro, pero
se habilitan por tandas**, decididas juntos. Eso es exactamente lo que ya
significan las dos banderas: `active` para que exista, `deck` para que le salga
a Sofía.

---

## Las decisiones que ya están tomadas

Están tomadas de verdad: se discutieron, en algún caso se discreparon, y el
padre decidió. **No conviene reabrirlas sin motivo nuevo.**

### Tres papeles para el conocimiento lingüístico

Decisión ratificada por Josu el 8 de septiembre de 2026:

- El `.apkg` y otras fuentes externas son **fuentes de importación**.
- Tras importar, fusionar y curar el corpus, el maestro **JSONL versionado en Git** es la **fuente de verdad académica**.
- **Firestore** es la **base de servicio** que consume la aplicación y debe poder regenerarse desde el maestro sin afectar a los datos personales/progreso.

Flujo canónico:

```text
.apkg / fuentes externas
          ↓ importación
maestro JSONL versionado
          ↓ publicación
       Firestore
          ↓
          app
```

El APKG sigue siendo un formato de intercambio de primera clase, pero no es la memoria compartida entre IAs ni el lugar donde se curan silenciosamente las correcciones. El contrato vigente está en `vocabulario/schema/LANGUAGE_DATA_CONTRACT.md`.

**El diccionario accede a TODO el vocabulario; las fichas, no.** En el modelo nuevo esto se expresa mediante `Uses`: `dictionary` permite consulta y `flashcard` permite entrar en actividades de tarjetas. La representación Firestore actual puede mantener compatibilidad temporal con `active`/`deck`, donde `deck: true` equivale a `flashcard ∈ Uses`.

**Contenido y datos personales, separados.** El contenido académico es regenerable desde el maestro. Lo personal (`users/{uid}/…`) es lo irreemplazable: progreso, preferencias e idiomas habilitados del usuario.

**Sin Firebase Storage.** Exige plan de pago. Los medios los sirve Hosting desde
`vocabulario/media/`, y en Firestore se guardan **rutas, nunca URLs**, así que
cambiarlos de sitio es cambiar una palabra en la configuración.

**Una sola versión, en `VERSION`.** El sello (`tools/sellar-version.mjs`) la
propaga al desplegar. `version.js` y `version.json` están en `.gitignore` porque
son resultado, no código, y el service worker recibe la suya en la URL con la
que se registra. No hay que tocar la versión en ningún otro sitio.

---

## Qué falta, por orden

### 1. Cerrar el maestro lingüístico ~5K

Es el trabajo que desbloquea el nuevo corpus completo. ChatGPT está fusionando las fuentes disponibles (Oxford EN/ES, English Common, Oxford A2 y French Core 5K) bajo `schemaVersion 1.1`.

Objetivo aproximado: **5.000 conceptos/entradas**, no 8.000 mazos pegados entre sí.

El maestro debe conservar:

- EN / ES / EU / FR;
- acepciones estructuradas (`Senses`);
- `ConceptId` estable que no colisione con homógrafos;
- audio EN/FR cuando exista;
- definiciones y ejemplos;
- procedencia;
- disponibilidad por idioma;
- clasificación educativa (`Uses`, tema, etapa cuando proceda);
- campos visuales y catálogo para generación de imágenes.

El fichero canónico será JSONL; CSV seguirá siendo una vista/intercambio con pérdida para datos anidados.

### 2. Adaptar importación/publicación al contrato 1.1

Claude adapta el importador, Firestore y el futuro editor a:

- `Senses` estructurado;
- nueva regla de `ConceptId`;
- `schemaVersion` explícito;
- mapeo maestro → Firestore → CSV → APKG;
- cuatro idiomas con disponibilidad en contenido y activación en perfil.

La importación grande a Firestore debe hacerse **después** de que el maestro 5K esté suficientemente estable para no crear inmediatamente una migración evitable.

### 3. Una pantalla para recorrer y curar el vocabulario

Hoy el diccionario **solo busca**. Falta poder recorrer por tema/letra, revisar acepciones y traducciones, marcar contenido para flashcards y editar el conocimiento desde una interfaz cómoda. Las correcciones del editor deben volver al maestro versionado; Firestore no se convierte por ello en fuente de verdad.

### 4. La tubería de despliegue

El padre tiene otro proyecto con un mecanismo que le funciona y quiere el mismo
aquí. La auditoría de lo que falta sigue siendo válida:

- `index.html` necesita política de caché adecuada;
- `.js` y `.css` no deben quedar una hora desfasados tras despliegues;
- el precacheo del service worker necesita comprobación automática;
- falta CI y despliegue automático.

La credencial de Firebase debe vivir como secreto y nunca pegarse en repositorio ni chat.

### 5. Terminar Matemagia

Hechos: tablas, sumas y restas ABN. Faltan **multiplicación por descomposición**
(14 × 6) y **división entre un dígito**. Los **problemas** están bloqueados
esperando ejemplos del libro de Sofía para copiar el tono.

### 6. Fases 2 a 5 de `docs/interfaz.md`

La 2 separa `uiLocale`, `learningLanguage` y `supportLanguages`. Francés puede existir en el dataset y permanecer deshabilitado en el perfil hasta que el usuario lo active.

---

## Decisiones lingüísticas ya cerradas

**Euskera:** el dataset usa **euskara batua** como norma canónica. Los lemas se guardan en forma de diccionario, sin artículo cuando corresponde. Ejemplos confirmados: `txakur`, `katu`, `sagar`, `liburu`, `irakasle`, `gorri`, `euri`.

**Acepciones:** no se aplastan. `Senses` es la estructura semántica autoritativa cuando hay polisemia.

**ConceptId:** formato base `<lema-en-normalizado>_<pos-normalizado>`, con calificador semántico estable si todavía existe una colisión real (`bass_n_fish`, `bass_n_music`). Un ID publicado no cambia sin migración.

**Audio:** EN y FR admiten audio de palabra y ejemplo; ES/EU no lo requieren en v1. El contenido textual existe independientemente del audio.

**Idiomas:** disponibilidad del concepto (`AvailableEN/ES/EU/FR`) y activación del idioma en el perfil son cosas distintas. Francés se prepara en el corpus, pero puede estar deshabilitado para Sofía.

**createdAt:** Claude confirmó que ya se escribe solo al alta en el importador; se retira como riesgo previo a importación.

---

## Lo que sigue abierto

**Curación masiva del euskera.** Aunque la norma ya es batua, la traducción automática puede elegir acepción incorrecta. El contenido generado debe quedar como `proposed` hasta revisión.

**Multimedia de terceros.** Para el uso familiar privado se puede trabajar con las fuentes fusionadas, conservando procedencia. Si algún día el proyecto se redistribuye públicamente, habrá que revisar/sustituir multimedia cuya licencia no permita redistribución.

**Temas y progresión.** El corpus 5K no debe convertirse automáticamente en 5.000 flashcards. El diccionario puede acceder al conjunto completo; las actividades de aprendizaje son una selección curada.

**Imágenes.** Se generarán progresivamente. El pipeline contempla `Imageability` y `ImagePrompt`; algunos conceptos abstractos pueden requerir escena/metáfora o no tener imagen.

---

## Cabos sueltos de la máquina de casa

**La copia local del repositorio está perdida.** El 14 de septiembre no
apareció por ningún sitio. Lo que sí existe es una carpeta de trabajo *que no
es un repositorio*:

```
C:\Users\jsuarez\OneDrive - Artadi Alimentación S.L\Escritorio\07 - Dev Personal\Sofiahelptool
```

Ahí viven `The_Oxford_3000_with_Audio_EN-ES.apkg` y varios CSV de prompts de
imagen generados con Gemini (`Sofia_Gemini_Image_Prompts_AUTO_4815_*`,
`Sofia_Language_5k_Image_Source`). **Merece la pena preguntarle por esos CSV
antes de decidir nada sobre los dibujos**: puede que ya haya avanzado por ahí.

Para publicar ya no hace falta clonar nada. Solo hará falta el día de la
importación grande, porque el `.apkg` está en ese disco y eso sí corre en su
máquina:

```bash
git clone git@github.com:yosulin/ayuda-de-sofia.git
```

**Dos trampas conocidas de esa máquina**, por si vuelven a aparecer:

- `better-sqlite3` no instala (npm 11 bloquea los scripts de instalación y no
  hay binario precompilado para Node 24). Por eso el importador usa
  `node:sqlite`, que viene dentro de Node.
- Los `.apkg` modernos traen un **señuelo**: un `collection.anki2` casi vacío
  junto al `collection.anki21b` de verdad, comprimido con zstd. Leer el
  equivocado da «1 nota y 6.258 MP3 huérfanos». `tools/import/lib/mazo.mjs` ya
  lo resuelve, y es el único sitio que sabe abrir un mazo: si necesitas leer
  uno, úsalo, no escribas otra copia de esa lógica.

**`trafico-okin-zumaia` se va a borrar.** Era el repositorio compartido donde
vivía esto antes por error. Nada de aquí depende de él.

---

## Cómo se trabaja aquí

Esto no es burocracia: es lo que ha funcionado.

- **Todo en castellano**: nombres de variables, comentarios, mensajes de commit,
  documentación. Los comentarios explican **por qué**, no qué.
- **Mockup antes de cambiar la interfaz.** Un fichero HTML suelto, se enseña, se decide, y solo entonces se implementa.
- **Se prueba antes de subir.** Chromium con dobles de Firebase cuando haga falta.
- **Una comprobación que nunca ha fallado no demuestra nada**: cuando se añade una, se rompe a propósito lo que debería detectar.
- **Sin dependencias en el navegador y sin compilación.** Lo que hay en `vocabulario/` es exactamente lo que se sirve.
- **Se avisa de lo que se rompe.** Los fallos de datos o contrato van a `docs/AI_HANDOFF.md`; no se corrigen silenciosamente.

### Reparto de tareas entre IAs

- **ChatGPT:** `vocabulario/schema/` y `vocabulario/data/master/`; auditoría y fuente académica.
- **Claude:** `tools/`, `vocabulario/js/`, `vocabulario/css/`, `vocabulario/*.html`, `.github/`; implementación.
- **`docs/AI_HANDOFF.md`:** buzón compartido, directo a `main`.
- **`docs/donde-estamos.md`:** documento de producto bajo decisión de Josu.

---

## Los documentos

| | |
|---|---|
| `docs/AI_COLLABORATION.md` | Reglas de cooperación entre IAs. |
| `docs/AI_HANDOFF.md` | Buzón de incidencias y cambios ChatGPT ↔ Claude. |
| `vocabulario/schema/LANGUAGE_DATA_CONTRACT.md` | Contrato canónico del dataset y mappings. |
| `vocabulario/schema/SCHEMA_CHANGELOG.md` | Historial de cambios del contrato. |
| `docs/interfaz.md` | Adaptación por dispositivo e idiomas. |
| `tools/import/README.md` | Importador y formatos. |
| `vocabulario/README.md` | La PWA por dentro. |
| `mockup/README.md` | Mockups y estado de implementación. |
