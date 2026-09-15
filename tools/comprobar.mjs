/**
 * ============================================================
 *  COMPROBAR — la puerta antes de publicar
 * ============================================================
 *      node tools/comprobar.mjs
 *
 *  No toca Firebase ni necesita credenciales: mira el repositorio y
 *  responde una sola pregunta, ¿esto se puede publicar?
 *
 *  Cada comprobación existe por algo que ya pasó de verdad:
 *
 *   1. SINTAXIS        un módulo con un error no rompe el despliegue,
 *                      rompe la app en el móvil de Sofía.
 *   2. PRECACHEO       la lista del service worker se mantiene a mano.
 *                      Ya se quedó fuera navegacion.js, y el síntoma
 *                      fue una app que funcionaba con red y no sin ella.
 *   3. ENLACES         que index.html no apunte a ficheros que no están.
 *   4. IDIOMAS         los tres juegos de claves tienen que ser el
 *                      mismo. Una clave que falta se ve como "menu.algo"
 *                      en pantalla, y solo en un idioma.
 *   5. VERSIÓN         VERSION manda sobre todo lo demás: si no tiene
 *                      forma de versión, el sello miente.
 *
 *  Si añades una comprobación, rómpela a propósito y comprueba que
 *  falla. Una comprobación que nunca ha fallado no demuestra nada.
 * ============================================================
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = resolve(raiz, "vocabulario");

/* Se generan al desplegar o en cada máquina, así que no están en el
   repositorio y no se pueden comprobar aquí. */
const GENERADOS = new Set(["js/version.js", "js/firebase-config.js"]);

/* No los carga la app: son plantilla para quien monta el proyecto. */
const NO_SON_DE_LA_APP = (relativa) => relativa.endsWith(".example.js");

const problemas = [];
const falla = (comprobacion, detalle) => problemas.push(comprobacion + ": " + detalle);

const leer = (relativa) => readFileSync(resolve(app, relativa), "utf8");

/* ---------- 1. sintaxis ---------- */

function modulosJs() {
  return readdirSync(resolve(app, "js"))
    .filter((nombre) => nombre.endsWith(".js"))
    .map((nombre) => "js/" + nombre)
    .filter((relativa) => !NO_SON_DE_LA_APP(relativa));
}

function comprobarSintaxis() {
  /* node --check trata los .js como CommonJS, y ahí "import" es un
     error de sintaxis. Copiándolos a .mjs se analizan como lo que son. */
  const carpeta = mkdtempSync(join(tmpdir(), "comprobar-"));

  const ficheros = modulosJs()
    .filter((relativa) => !GENERADOS.has(relativa))
    .concat(["service-worker.js"]);

  ficheros.forEach((relativa) => {
    const destino = join(carpeta, relativa.replace(/\//g, "_").replace(/\.js$/, ".mjs"));
    copyFileSync(resolve(app, relativa), destino);
    try {
      execFileSync(process.execPath, ["--check", destino], { stdio: ["ignore", "ignore", "pipe"] });
    } catch (error) {
      falla("sintaxis", relativa + "\n" + String(error.stderr || "").trim());
    }
  });
}

/* ---------- 2. lista de precacheo ---------- */

function listaDelServiceWorker() {
  const texto = leer("service-worker.js");
  const bloque = texto.match(/const FICHEROS_SHELL = \[([\s\S]*?)\];/);
  if (!bloque) {
    falla("precacheo", "no encuentro FICHEROS_SHELL en service-worker.js");
    return null;
  }
  return [...bloque[1].matchAll(/"\.\/([^"]*)"/g)].map((coincidencia) => coincidencia[1]);
}

function comprobarPrecacheo() {
  const lista = listaDelServiceWorker();
  if (!lista) return;

  /* a) lo que promete cachear, ¿existe? */
  lista.forEach((relativa) => {
    if (!relativa || GENERADOS.has(relativa)) return;
    if (!existsSync(resolve(app, relativa))) {
      falla("precacheo", "promete cachear un fichero que no existe: " + relativa);
    }
  });

  /* b) lo que la app carga, ¿está prometido? Este es el fallo real:
        el módulo nuevo funciona con red y desaparece sin ella. */
  const enLista = new Set(lista);
  modulosJs().forEach((relativa) => {
    if (!enLista.has(relativa)) {
      falla("precacheo", "módulo sin precachear: " + relativa +
        " (añádelo a FICHEROS_SHELL en service-worker.js)");
    }
  });
}

/* ---------- 3. enlaces de index.html ---------- */

function comprobarEnlaces() {
  const html = leer("index.html");
  const enlaces = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((c) => c[1]);

  enlaces.forEach((enlace) => {
    if (/^(https?:|data:|mailto:|#|\/\/)/.test(enlace)) return;
    const limpio = enlace.split(/[?#]/)[0];
    if (!limpio || GENERADOS.has(limpio)) return;
    if (!existsSync(resolve(app, limpio))) {
      falla("enlaces", "index.html apunta a un fichero que no existe: " + enlace);
    }
  });
}

/* ---------- 4. los tres idiomas ---------- */

function comprobarIdiomas() {
  const texto = leer("js/i18n.js");
  const idiomas = [...texto.matchAll(/^  (es|eu|en):\s*\{$/gm)];

  if (idiomas.length !== 3) {
    falla("idiomas", "esperaba tres idiomas en i18n.js y encuentro " + idiomas.length);
    return;
  }

  const juegos = idiomas.map((inicio, posicion) => {
    const desde = inicio.index;
    const hasta = posicion + 1 < idiomas.length ? idiomas[posicion + 1].index : texto.length;
    const trozo = texto.slice(desde, hasta);
    return {
      idioma: inicio[1],
      claves: new Set([...trozo.matchAll(/^\s*"([^"]+)":/gm)].map((c) => c[1]))
    };
  });

  const referencia = juegos[0];
  juegos.slice(1).forEach((juego) => {
    [...referencia.claves].forEach((clave) => {
      if (!juego.claves.has(clave)) falla("idiomas", "falta \"" + clave + "\" en " + juego.idioma);
    });
    [...juego.claves].forEach((clave) => {
      if (!referencia.claves.has(clave)) falla("idiomas", "sobra \"" + clave + "\" en " + juego.idioma + " (no está en " + referencia.idioma + ")");
    });
  });
}

/* ---------- 5. la versión ---------- */

function comprobarVersion() {
  const version = readFileSync(resolve(raiz, "VERSION"), "utf8").trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    falla("versión", "VERSION debe ser x.y.z y pone \"" + version + "\"");
  }
}

/* ---------- ---------- */

comprobarSintaxis();
comprobarPrecacheo();
comprobarEnlaces();
comprobarIdiomas();
comprobarVersion();

if (problemas.length === 0) {
  console.log("✓ Todo en orden. Se puede publicar.");
  process.exit(0);
}

console.error("\n" + problemas.length + (problemas.length === 1 ? " problema:\n" : " problemas:\n"));
problemas.forEach((problema) => console.error("  ✗ " + problema));
console.error("");
process.exit(1);
