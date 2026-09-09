/**
 * ============================================================
 *  ¿Precachea el service worker lo que la app carga de verdad?
 * ============================================================
 *      node tools/comprobar-precacheo.mjs
 *
 *  La lista FICHEROS_SHELL de service-worker.js se mantiene a mano, y
 *  una lista a mano se desincroniza. Ya pasó con navegacion.js: el
 *  módulo entró en la app y no en la lista, así que sin conexión la
 *  aplicación abría y se quedaba a medias, que es peor que no abrir.
 *
 *  Aquí se recorre el grafo de imports desde app.js —que es lo que el
 *  navegador carga de verdad— y se compara con la lista. Si no cuadra,
 *  SALE CON CÓDIGO 1, para que la CI lo pare antes de publicar.
 *
 *  Solo mira los módulos propios: las URLs de gstatic (SDK de Firebase)
 *  no se precachean a propósito, van a la caché "vendor" según se piden.
 * ============================================================
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative, posix } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = resolve(raiz, "vocabulario");

/* Estos dos SÍ se publican, pero no están en el repositorio: los genera
   cada máquina (firebase-config.js) o el sello del despliegue
   (version.js). Que falten aquí es lo normal, no un fallo. */
const GENERADOS = ["./js/version.js", "./js/firebase-config.js"];

/** Los import de un módulo, quedándose solo con las rutas relativas. */
function importsDe(fichero) {
  const codigo = readFileSync(fichero, "utf8");
  const rutas = [];

  /* import ... from "./x.js"  ·  import("./x.js")  ·  export ... from "./x.js" */
  const patron = /(?:\bfrom\s*|\bimport\s*\(\s*)["'](\.[^"']+)["']/g;
  let encontrado;
  while ((encontrado = patron.exec(codigo)) !== null) rutas.push(encontrado[1]);

  return rutas.map((ruta) => resolve(dirname(fichero), ruta));
}

/** Todo lo que cuelga de app.js, siguiendo los import en cadena. */
function moduladosDesde(entrada) {
  const vistos = new Set();
  const cola = [entrada];

  while (cola.length > 0) {
    const fichero = cola.pop();
    if (vistos.has(fichero)) continue;
    vistos.add(fichero);

    /* version.js lo genera el sello al desplegar: en el repositorio no
       existe, y no poder leerlo no es un fallo. */
    if (!existsSync(fichero)) continue;
    importsDe(fichero).forEach((ruta) => cola.push(ruta));
  }

  return vistos;
}

/** La lista declarada en el service worker, tal cual está escrita. */
function listaDelServiceWorker() {
  const codigo = readFileSync(resolve(app, "service-worker.js"), "utf8");
  const bloque = codigo.match(/const FICHEROS_SHELL = \[([\s\S]*?)\];/);
  if (!bloque) {
    console.error("No se encuentra FICHEROS_SHELL en service-worker.js.");
    process.exit(1);
  }
  return new Set(
    [...bloque[1].matchAll(/["'](.+?)["']/g)].map((linea) => linea[1])
  );
}

/* ---------- comparar ---------- */

/** De ruta absoluta a la forma "./js/x.js" que usa el service worker. */
function comoLaEscribeElServiceWorker(absoluta) {
  return "./" + posix.join(...relative(app, absoluta).split(/[\\/]/));
}

const cargados = [...moduladosDesde(resolve(app, "js/app.js"))]
  .map(comoLaEscribeElServiceWorker)
  .sort();

const precacheados = listaDelServiceWorker();

const faltan = cargados.filter((ruta) => !precacheados.has(ruta));

/* Al revés: algo precacheado que ya nadie carga. No rompe nada, pero
   engorda la instalación y suele señalar un módulo muerto. */
const sobran = [...precacheados].filter(
  (ruta) => ruta.endsWith(".js") && !cargados.includes(ruta)
);

/* Y lo que se promete y no está: cache.add() de un fichero inexistente
   falla en silencio, porque la instalación los añade uno a uno. */
const inexistentes = [...precacheados].filter((ruta) => {
  if (ruta === "./" || GENERADOS.includes(ruta)) return false;
  return !existsSync(resolve(app, ruta.replace(/^\.\//, "")));
});

const problemas = [];
if (faltan.length > 0) problemas.push(["La app carga estos módulos y el service worker NO los precachea", faltan]);
if (sobran.length > 0) problemas.push(["El service worker precachea módulos que ya nadie carga", sobran]);
if (inexistentes.length > 0) problemas.push(["El service worker precachea ficheros que no existen", inexistentes]);

if (problemas.length === 0) {
  console.log("Precacheo correcto: " + cargados.length + " módulos, todos en la lista.");
  process.exit(0);
}

problemas.forEach(([titulo, rutas]) => {
  console.error("\n" + titulo + ":");
  rutas.forEach((ruta) => console.error("  " + ruta));
});
console.error("\nArregla FICHEROS_SHELL en vocabulario/service-worker.js.\n");
process.exit(1);
