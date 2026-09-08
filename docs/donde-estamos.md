# Dónde estamos

Traspaso de una sesión de trabajo a la siguiente. Qué funciona, qué se decidió y
por qué, qué falta y qué está sin decidir.

> Última actualización: 8 de septiembre de 2026, versión **0.6.2**.
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
| **Diccionario** | Funciona. Busca en las tres lenguas, por acepción suelta y por principio de palabra. Da traducción y definición en los tres idiomas. |
| **Matemagia** | Tablas del 1 al 10, sumas y restas ABN. Progreso por tabla. |
| **Ajustes** | Idioma, versión, instalar, cerrar sesión, descargar el contenido en CSV. |

Interfaz en **castellano, euskera e inglés**. Armazón adaptativo con cuatro
repartos de navegación (barra inferior, lateral de iconos, lateral con texto,
cajón).

---

## Las decisiones que ya están tomadas

Están tomadas de verdad: se discutieron, en algún caso se discreparon, y el
padre decidió. **No conviene reabrirlas sin motivo nuevo.**

**El `.apkg` de Anki es la fuente del conocimiento.** Se puede diseñar el mazo
como se quiera y se irá completando, pero de ahí sale el contenido. Se propuso
la alternativa —maestro en CSV dentro del repositorio, con el `.apkg` como
salida generada— y **se rechazó**. El informe con esa propuesta y sus motivos
sigue siendo útil como referencia técnica, pero la decisión está tomada.

**El diccionario accede a TODO el vocabulario; las fichas, no.** Por eso existen
dos banderas distintas en cada tarjeta:

- `active` — visible en la app.
- `deck` — entra en el juego de tarjetas de Sofía.

Las importaciones grandes van con `--sin-mazo` (`deck: false`): 3.000 palabras
del Oxford en el diccionario, sí; saliéndole a Sofía en una tarjeta con un
dibujo que no existe, no.

**Contenido y datos personales, separados.** El contenido (`cards`) es de solo
lectura desde el navegador y se escribe con `tools/import/`, que entra con una
cuenta de servicio. Lo personal (`users/{uid}/…`) es lo único irreemplazable:
el contenido se puede regenerar, el progreso de Sofía no.

**Sin Firebase Storage.** Exige plan de pago. Los medios los sirve Hosting desde
`vocabulario/media/`, y en Firestore se guardan **rutas, nunca URLs**, así que
cambiarlos de sitio es cambiar una palabra en la configuración.

**Una sola versión, en `VERSION`.** El sello (`tools/sellar-version.mjs`) la
propaga al desplegar. `version.js` y `version.json` están en `.gitignore` porque
son resultado, no código, y el service worker recibe la suya en la URL con la
que se registra. No hay que tocar la versión en ningún otro sitio.

---

## Qué falta, por orden

### 1. Importar las 3.140 palabras

**Es lo que desbloquea todo lo demás.** La prueba en seco salió bien: 3.140
notas, 21 de 33 campos reconocidos, sin identificadores repetidos.

```bash
cd tools/import
set GOOGLE_APPLICATION_CREDENTIALS=C:\claves\...json
node importar.mjs --origen anki --fichero "...\Sofia_Language_Knowledge_v1.apkg" \
  --sin-medios --sin-mazo --fuente anki --dry-run
```

Sin `--dry-run` para la de verdad. Qué esperar después:

- El diccionario encontrará «planta» y las otras 3.139.
- **Sin definiciones**: el mazo las trae vacías. El Oxford 3000 traía glosas y
  traducciones, no definiciones de diccionario.
- **Sin euskera**: los 3.140 tienen `Basque` vacío y `EuStatus=empty`.
- **Sin tema**: `Theme` viene sin asignar en todas.
- Las tarjetas de Sofía seguirán siendo las 10 de demostración.

### 2. Una pantalla para recorrer el vocabulario

Hoy el diccionario **solo busca**: no hay forma de ver qué hay dentro. Con 3.140
palabras eso se nota. Falta poder recorrerlo por tema o por letra, y desde ahí
marcar qué palabras entran en las fichas de Sofía —que es el trabajo de
curación, y hacerlo desde el sofá en vez de desde un CSV cambia mucho.

### 3. La tubería de despliegue

El padre tiene otro proyecto con un mecanismo que le funciona y quiere el mismo
aquí. Está descrito en un prompt suyo; la auditoría de lo que falta se hizo y
sigue siendo válida:

- **`index.html` no lleva `no-cache`** y cae en el valor por defecto de Firebase
  Hosting. **Es la causa de que viera la versión antigua tras desplegar.**
- **`.js` y `.css` con `max-age=3600`**: el service worker precachea con
  `cache.add`, que pasa por la caché HTTP, así que tras un despliegue puede
  quedarse con los módulos viejos hasta una hora.
- **La lista de precacheo del service worker se mantiene a mano** y puede
  desincronizarse de lo que carga la app. Ya pasó con `navegacion.js`. Merece un
  script que lo compruebe y que **falle** la CI.
- **No hay CI ni despliegue automático.** Ahora que el repositorio es propio,
  `main` significa lo que tiene que significar.

Se le propuso **no** poner `?v=` en cada import y usar `no-cache` en su lugar:
mismo efecto, sin reescribir imports ni vigilar que no se olvide ninguno.

Falta que él cree el secreto `FIREBASE_SERVICE_ACCOUNT_...` en GitHub. **Esa
credencial no debe pegarse en ningún fichero ni en el chat.**

### 4. Terminar Matemagia

Hechos: tablas, sumas y restas ABN. Faltan **multiplicación por descomposición**
(14 × 6) y **división entre un dígito**. Los **problemas** están bloqueados
esperando a que el padre pase dos o tres del libro de Sofía, literales, para
copiar el tono.

### 5. Fases 2 a 5 de `docs/interfaz.md`

La 2 es la que más se nota: separar `uiLocale`, `learningLanguage` y
`supportLanguages`. Hoy `audio.js` tiene `en-GB` clavado en el código y las
etiquetas «Castellano» y «Euskara» de la tarjeta están escritas a mano en el
HTML, así que con la interfaz en inglés siguen diciendo «Castellano».

---

## Lo que está sin decidir

**El euskera de 3.140 palabras.** Es el mayor riesgo de calidad del proyecto, y
es silencioso: la traducción automática devuelve algo plausible. Tres trampas
concretas:

- **El determinante.** La forma de diccionario es `txakur`, no `txakurra`:
  `txakurra` ya lleva el artículo pegado. Un traductor automático devuelve la
  forma con artículo casi siempre. *Ese error ya está en la tarjeta de
  demostración del repositorio.*
- **Batua o variante local.** Hay que decidirlo y escribirlo. En Zumaia se oye
  una cosa y en el colegio se escribe batua.
- **Sin contexto se traduce la acepción equivocada.**

Recomendación dada: tandas de 40 por tema, nunca en bloque; traducir siempre con
inglés + castellano + tipo + frase de ejemplo; marcar `EuStatus = propuesto`; y
revisión humana antes de `revisado`. **El revisor vive en casa**, que es una
ventaja que casi ningún proyecto tiene.

**El audio y los ejemplos del mazo.** Los 6.258 MP3 y las frases de ejemplo
vienen del Oxford 3000. Sirven para casa; **no para redistribuir el mazo**, que
era uno de los objetivos. La salida es sustituirlos poco a poco por frases sobre
el mundo de Sofía y audio propio de TTS: legalmente limpio y pedagógicamente
mejor. Sin decidir cuándo.

**El `ConceptId` es la palabra a secas** (`"id": "a"`). Funciona, pero los
homógrafos colisionan. El importador ya avisa y se para antes de perder nada.

**Los temas.** Las 3.140 vienen sin `Theme`, y sin temas no hay mapa de
vocabulario ni sesiones por tema.

**El panel de avance del índice.** Diseñado y aparcado por el padre:
«más adelante vemos de qué manera añadirlo». El mockup está en
`mockup/panel-inicio.html`. Necesitaría dos cosas que hoy no existen: un
`createdAt` en las tarjetas —hay que añadirlo **antes** de la importación
grande o esa información no existirá nunca— y un registro diario para poder
dibujar actividad por días.

---

## Cómo se trabaja aquí

Esto no es burocracia: es lo que ha funcionado.

- **Todo en castellano**: nombres de variables, comentarios, mensajes de commit,
  documentación. Los comentarios explican **por qué**, no qué.
- **Mockup antes de cambiar la interfaz.** Un fichero HTML suelto, se enseña, se
  decide, y solo entonces se implementa. Está en `mockup/`.
- **Se prueba antes de subir.** Chromium con dobles de Firebase (el CDN de
  gstatic está bloqueado en el entorno de Claude), y se mide, no se mira: si la
  pestaña de Ajustes debe solapar 2 px, se comprueba que solapa 2 px.
- **Una comprobación que nunca ha fallado no demuestra nada**: cuando se añade
  una, se rompe a propósito lo que debería detectar.
- **Sin dependencias en el navegador y sin compilación.** Lo que hay en
  `vocabulario/` es exactamente lo que se sirve.
- **Se avisa de lo que se rompe.** Varios de los mejores hallazgos han salido de
  probar y encontrar que algo ya estaba mal: el margen del notch aplicado al
  revés, los índices de Firestore que no se desplegaban, el señuelo del `.apkg`.

### El reparto de tareas

**Claude no despliega.** Corre en un contenedor aislado sin acceso a Google, así
que no puede hacer `firebase deploy`, ni entrar en la consola de Firebase, ni
leer ficheros del disco del padre. Todo eso lo ejecuta él, y hay que darle los
comandos exactos.

Lo que sí puede: escribir código, probarlo en Chromium, leer el repositorio y
subir a GitHub.

---

## Los documentos

| | |
|---|---|
| `docs/interfaz.md` | Adaptación por dispositivo e idiomas. Auditoría, sistema de layout, puntos de ruptura, y el plan por fases (0 y 1 hechas). |
| `tools/import/README.md` | El importador: formatos, cómo se emparejan los campos, qué comprueba. |
| `vocabulario/README.md` | La PWA por dentro. |
| `mockup/README.md` | Qué propone cada mockup y cuáles están implementados. |
