/**
 * ============================================================
 *  ¿Están las tres lenguas completas?
 * ============================================================
 *      node tools/comprobar-traducciones.mjs
 *
 *  i18n.js cae al castellano cuando falta una clave, que es lo correcto
 *  en producción —mejor castellano que enseñar "ajustes.borrarSeguro"—
 *  pero también hace que una traducción olvidada no se note nunca. Aquí
 *  se nota, y para la CI.
 *
 *  Comprueba tres cosas:
 *
 *   1. Las tres lenguas tienen exactamente las mismas claves.
 *   2. Toda clave que el HTML o el JavaScript usan existe.
 *   3. Los sustitutos ({n}, {nombre}...) coinciden entre lenguas: una
 *      traducción que se deja un {n} fuera enseña el hueco a Sofía.
 * ============================================================
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = resolve(raiz, "vocabulario");

const fuente = readFileSync(resolve(app, "js/i18n.js"), "utf8");

/* ---------- leer los bloques por lengua ---------- */

const bloques = [...fuente.matchAll(/^ {2}(es|eu|en): \{$/gm)];
if (bloques.length !== 3) {
  console.error("Esperaba tres bloques de lengua en i18n.js y encuentro " + bloques.length + ".");
  process.exit(1);
}

const lenguas = {};
bloques.forEach((bloque, i) => {
  const desde = bloque.index;
  const hasta = i + 1 < bloques.length ? bloques[i + 1].index : fuente.length;
  const trozo = fuente.slice(desde, hasta);

  const claves = new Map();
  for (const linea of trozo.matchAll(/^ {4}"([^"]+)": ("(?:[^"\\]|\\.)*")/gm)) {
    claves.set(linea[1], linea[2]);
  }
  lenguas[bloque[1]] = claves;
});

/* El castellano es la referencia porque es a lo que cae i18n.js. */
const referencia = lenguas.es;
const problemas = [];

/* ---------- 1. mismas claves ---------- */

for (const lengua of ["eu", "en"]) {
  const faltan = [...referencia.keys()].filter((c) => !lenguas[lengua].has(c));
  const sobran = [...lenguas[lengua].keys()].filter((c) => !referencia.has(c));
  if (faltan.length > 0) problemas.push(["Sin traducir al " + lengua, faltan]);
  if (sobran.length > 0) problemas.push(["Solo en " + lengua + ", sin equivalente en castellano", sobran]);
}

/* ---------- 2. claves usadas que no existen ---------- */

const usadas = new Set();

/* t("clave") en el JavaScript. */
for (const fichero of ["app", "i18n", "modulos", "navegacion", "matemagia"]) {
  const codigo = readFileSync(resolve(app, "js/" + fichero + ".js"), "utf8");
  for (const uso of codigo.matchAll(/\bt\(\s*"([^"]+)"/g)) usadas.add(uso[1]);
}

/* data-i18n="clave" y data-i18n-attr="atributo:clave;otro:clave" en el HTML. */
const html = readFileSync(resolve(app, "index.html"), "utf8");
for (const uso of html.matchAll(/data-i18n="([^"]+)"/g)) usadas.add(uso[1]);
for (const uso of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
  uso[1].split(";").forEach((par) => {
    const clave = par.split(":")[1];
    if (clave) usadas.add(clave.trim());
  });
}

/* Las claves que se arman al vuelo ("modulo." + id) no se pueden
   comprobar de esta manera y se dejan fuera a propósito. */
const sinDefinir = [...usadas].filter((c) => !referencia.has(c) && !c.endsWith("."));
if (sinDefinir.length > 0) problemas.push(["Se usan y no están definidas en castellano", sinDefinir]);

/* ---------- 3. los sustitutos coinciden ---------- */

function sustitutos(texto) {
  return [...texto.matchAll(/\{(\w+)\}/g)].map((s) => s[1]).sort().join(",");
}

for (const lengua of ["eu", "en"]) {
  const descuadradas = [];
  for (const [clave, valor] of referencia) {
    const otra = lenguas[lengua].get(clave);
    if (otra === undefined) continue;
    if (sustitutos(valor) !== sustitutos(otra)) {
      descuadradas.push(clave + "  (es: {" + sustitutos(valor) + "}  " + lengua + ": {" + sustitutos(otra) + "})");
    }
  }
  if (descuadradas.length > 0) problemas.push(["Sustitutos que no coinciden en " + lengua, descuadradas]);
}

/* ---------- resultado ---------- */

if (problemas.length === 0) {
  console.log("Traducciones completas: " + referencia.size + " claves × 3 lenguas.");
  process.exit(0);
}

problemas.forEach(([titulo, claves]) => {
  console.error("\n" + titulo + ":");
  claves.forEach((clave) => console.error("  " + clave));
});
console.error("");
process.exit(1);
