import { t } from "./i18n.js";

/**
 * ============================================================
 *  MÓDULOS — el registro de herramientas
 * ============================================================
 *  El índice de la app se dibuja desde esta lista, así que añadir una
 *  herramienta nueva es añadir una entrada aquí y su pantalla: no hay
 *  que tocar el HTML del índice ni la navegación.
 *
 *  Cada módulo tiene:
 * *    nombre    lo que se lee en la tarjeta y en la cabecera
 *    icono     un emoji, que es lo que reconoce de un vistazo
 *    color     su color, que viaja a la cabecera y a sus botones
 *    que       una frase de qué hace, en su idioma, no en el nuestro
 *    pantalla  a qué pantalla lleva (null = todavía no existe)
 *    pantallas todas las pantallas que son "suyas", para que la
 *              navegación sepa marcarlo aunque estés tres pasos dentro
 *    roles     quién lo ve. Hoy solo existe "alumno", pero el campo
 *              está desde el principio: así añadir el perfil de tutor
 *              no obliga a rehacer la navegación
 *    estado    la etiqueta de la tarjeta; puede ser una función que
 *              recibe el contexto (por ejemplo, cuántas palabras hay)
 *    disponible  si está en el alcance de ahora mismo. En false el
 *              módulo se sigue viendo en el índice, apagado y sin
 *              entrar, y desaparece de la navegación: no se borra
 *              nada, así que volver a encenderlo es cambiar
 *              esta palabra.
 *
 *  Lo que viene: las tarjetas acabarán siendo asignaturas, y dentro de
 *  cada una sus temas y sus herramientas. Cuando toque, un módulo podrá
 *  declarar sus propios submódulos y el índice se dibujará igual, un
 *  nivel más abajo.
 * ============================================================ */

/* El alcance de hoy es APRENDER VOCABULARIO CON LAS FICHAS. Matemagia
   y Diccionario están hechos y funcionan, pero apagados a propósito:
   uno se retoma más adelante, el otro es el paso 2. Se apagan aquí y
   en un solo sitio, no comentando código ni borrando pantallas. */
const CATALOGO = [
  {
    id: "tarjetas",
    icono: "🃏",
    color: "var(--coral)",
    pantalla: "inicio",
    pantallas: ["inicio", "tarjeta", "final"],
    roles: ["alumno", "tutor"],
    estado: (contexto) => (contexto.tarjetas === 1
      ? t("modulo.tarjetas.estadoUna")
      : t("modulo.tarjetas.estado", { n: contexto.tarjetas }))
  },
  {
    id: "diccionario",
    icono: "📖",
    color: "var(--cielo)",
    pantalla: "diccionario",
    pantallas: ["diccionario"],
    roles: ["alumno", "tutor"],
    disponible: false,
    estado: () => t("modulo.diccionario.estado")
  },
  {
    id: "matemagia",
    icono: "✨",
    color: "var(--menta)",
    pantalla: "matemagia",
    pantallas: ["matemagia", "matesReto", "matesFinal"],
    roles: ["alumno", "tutor"],
    disponible: false,
    estado: () => t("modulo.matemagia.estado")
  },
  {
    id: "libre",
    icono: "➕",
    color: "var(--sol)",
    pantalla: null,
    pantallas: [],
    roles: ["alumno", "tutor"],
    estado: () => t("modulo.libre.estado")
  }
];

/* Un módulo apagado se comporta exactamente igual que uno que todavía
   no existe: sin pantalla a la que ir. Así no hay que enseñarle a
   nadie más —ni al índice, ni a la navegación, ni al enrutado— qué es
   estar apagado; ya saben qué hacer con pantalla: null. */
export const MODULOS = CATALOGO.map((modulo) => (modulo.disponible === false
  ? Object.assign({}, modulo, {
    pantalla: null,
    pantallas: [],
    estado: () => t("modulo.pronto")
  })
  : modulo));

/**
 * Pinta el índice. Devuelve los botones que llevan a algún sitio, para
 * que quien llama los conecte con su pantalla.
 *
 * @param {HTMLElement} lista     el <ul> del índice
 * @param {object} contexto       datos para las etiquetas de estado
 * @returns {Array<{modulo: object, boton: HTMLElement}>}
 */
export function pintarModulos(lista, contexto = {}) {
  lista.innerHTML = "";
  const activos = [];

  MODULOS.forEach((modulo) => {
    const fila = document.createElement("li");
    const boton = document.createElement("button");

    boton.type = "button";
    boton.className = "modulo" + (modulo.pantalla ? "" : " modulo--pronto");
    boton.style.setProperty("--color-modulo", modulo.color);
    if (!modulo.pantalla) boton.disabled = true;

    boton.innerHTML = `
      <span class="modulo__icono" aria-hidden="true"></span>
      <span class="modulo__nombre"></span>
      <span class="modulo__que"></span>
      <span class="modulo__estado"></span>`;

    boton.querySelector(".modulo__icono").textContent = modulo.icono;
    boton.querySelector(".modulo__nombre").textContent = t("modulo." + modulo.id + ".nombre");
    boton.querySelector(".modulo__que").textContent = t("modulo." + modulo.id + ".que");
    boton.querySelector(".modulo__estado").textContent = modulo.estado(contexto);

    fila.appendChild(boton);
    lista.appendChild(fila);

    if (modulo.pantalla) activos.push({ modulo, boton });
  });

  return activos;
}
