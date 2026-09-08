# Ayuda de Sofía

Caja de herramientas para que Sofía, de 9 años, aprenda por su cuenta cuando le
apetezca. Una PWA privada, en tres idiomas, que se publica en
**https://sofiahelptool.web.app** y a la que solo entran las cuentas invitadas.

> *«Añade color a tu vida. Aprende un idioma nuevo.»*
> Las escenas de vocabulario están en gris con el concepto en color: se entiende
> qué palabra se estudia sin traducirla ni escribirla.

---

## Los módulos

| | Qué hace |
|---|---|
| **Tarjetas** | Escuchas la palabra, ves la escena y la escribes en inglés. Sin repetición espaciada: se marca «la sabía» o «repasar» y ya. |
| **Diccionario** | Una palabra en cualquiera de los tres idiomas y te da los otros dos, con definición y frase de ejemplo cuando existen. Busca sobre **todo** el vocabulario, no solo sobre lo que está en las tarjetas. |
| **Matemagia** | Tablas del 1 al 10, sumas y restas por el **método ABN**: no se pide el resultado, se piden los saltos, que es donde está el razonamiento. |

La interfaz está en **castellano, euskera e inglés**, y se elige en Ajustes. El
contenido que se aprende no se traduce: es el ejercicio.

---

## Cómo está montado

Sin compilación y sin dependencias en el navegador: HTML, CSS y módulos ES
nativos. Lo que hay en `vocabulario/` es exactamente lo que se publica.

```
vocabulario/          la PWA. Es la carpeta que publica Firebase Hosting
  js/                 un módulo por responsabilidad, sin framework
  css/estilos.css     tokens en :root y un armazón de rejilla
  media/              las escenas, en SVG
docs/                 decisiones de diseño (ver interfaz.md)
tools/                herramientas de administración: NO se publican
  import/             importar mazos de Anki, CSV y JSON a Firestore
mockup/               prototipos de interfaz previos a implementar
```

**Firebase** guarda dos cosas separadas a propósito:

- **Contenido** (`cards`): de solo lectura desde el navegador. Escribirlo es
  cosa de `tools/import/`, que entra con una cuenta de servicio. Lo imponen las
  reglas, no la buena voluntad.
- **Lo personal** (`users/{uid}/…`): progreso y preferencias. Es lo único
  irreemplazable del sistema, porque el contenido se puede regenerar.

Y una lista de correos invitados (`allowed`) que no se puede tocar desde la app:
sin estar en ella no se ve nada, aunque entres con Google.

---

## Trabajar en el proyecto

```bash
# la primera vez, en cada máquina: elegir el proyecto y generar la
# configuración local, que está fuera del repositorio a propósito
firebase use sofiahelptool
node tools/config-desde-firebase.mjs

# publicar
firebase deploy --only hosting
firebase deploy --only firestore:indexes   # cuando cambien las consultas
```

El orden importa: el generador le pregunta la configuración a la CLI, así que
sin proyecto activo no tiene a quién preguntar.

El despliegue sella la versión solo (`tools/sellar-version.mjs`): se lee de
`VERSION`, y de ahí salen el número que se ve en Ajustes y el nombre de las
cachés del service worker. **No hay que tocar la versión en ningún otro sitio.**

### Contenido

```bash
cd tools/import
node inspeccionar.mjs mazo.apkg          # qué trae un mazo, sin tocarlo
node importar.mjs --origen anki --fichero mazo.apkg --dry-run
node permitir.mjs permitir alguien@gmail.com
```

`tools/import/README.md` lo cuenta entero: formatos admitidos, cómo se
emparejan los campos y qué comprueba antes de escribir.

---

## Documentación

- **`docs/interfaz.md`** — cómo se comporta la app en cada dispositivo, cómo se
  separan idioma de interfaz e idioma que se aprende, y el plan por fases.
- **`tools/import/README.md`** — el importador de contenido.
- **`vocabulario/README.md`** — la PWA por dentro.
