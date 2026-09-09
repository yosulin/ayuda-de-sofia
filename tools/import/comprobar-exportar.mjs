/**
 * ============================================================
 *  ¿El volcado del maestro produce diffs que se puedan leer?
 * ============================================================
 *      node comprobar-exportar.mjs
 *
 *  Un volcado que reordena o que mete campos volátiles es peor que no
 *  tenerlo: da una falsa sensación de red y un diff que nadie lee. Aquí
 *  se comprueba lo que decide eso, con un almacén de mentira, sin
 *  credenciales y sin tocar Firebase.
 *
 *  Sale con código 1 si algo no cuadra.
 * ============================================================
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aLinea, estable, exportarMaestro } from "./exportar.mjs";

let fallos = 0;

function compruebo(nombre, condicion, detalle = "") {
  if (condicion) { console.log("  OK    " + nombre); return; }
  fallos++;
  console.log("  FALLA " + nombre + (detalle ? "\n        " + detalle : ""));
}

/* Un Firestore de mentira: devuelve los documentos DESORDENADOS a
   propósito, que es justo lo que hace el de verdad. */
function almacenFalso(colecciones) {
  return {
    collection: (nombre) => ({
      get: async () => ({
        docs: (colecciones[nombre] || []).map(([id, datos]) => ({ id, data: () => datos }))
      })
    })
  };
}

const marca = (iso) => ({ toDate: () => new Date(iso) });

const TARJETAS = [
  ["weather_rain", { word: "rain", es: "lluvia", createdAt: marca("2026-01-02T10:00:00.000Z"), updatedAt: marca("2026-09-08T18:00:00.000Z") }],
  ["animals_dog",  { es: "perro", word: "dog", createdAt: marca("2026-01-01T10:00:00.000Z"), updatedAt: marca("2026-09-08T18:00:00.000Z"), tags: ["pet", "animal"] }],
  ["food_apple",   { word: "apple", es: "manzana", createdAt: marca("2026-01-03T10:00:00.000Z"), updatedAt: marca("2026-09-08T18:00:00.000Z") }]
];

console.log("\nComprobando el volcado del maestro\n");

/* ---------- las piezas ---------- */

compruebo(
  "Las claves salen ordenadas, venga como venga el objeto",
  aLinea("x", { b: 2, a: 1 }) === aLinea("x", { a: 1, b: 2 }),
  aLinea("x", { b: 2, a: 1 })
);

compruebo(
  "updatedAt no entra (se reescribe en cada importación)",
  !aLinea("x", { word: "dog", updatedAt: marca("2026-09-08T18:00:00.000Z") }).includes("updatedAt")
);

compruebo(
  "createdAt sí entra, y legible",
  aLinea("x", { createdAt: marca("2026-01-01T10:00:00.000Z") }).includes("2026-01-01T10:00:00.000Z")
);

compruebo(
  "Los objetos anidados también se ordenan",
  JSON.stringify(estable({ z: { b: 1, a: 2 } })) === '{"z":{"a":2,"b":1}}'
);

compruebo(
  "El orden de un array se respeta (es dato, no desorden)",
  JSON.stringify(estable({ tags: ["pet", "animal"] })) === '{"tags":["pet","animal"]}'
);

/* ---------- el volcado entero ---------- */

const carpeta = mkdtempSync(join(tmpdir(), "maestro-"));

const primera = await exportarMaestro({ carpeta, silencioso: true, almacen: almacenFalso({ cards: TARJETAS, themes: [] }) });
const texto1 = readFileSync(join(carpeta, "tarjetas.jsonl"), "utf8");

const ids = texto1.trim().split("\n").map((linea) => JSON.parse(linea).id);
compruebo(
  "Las tarjetas salen ordenadas por id, no como las devuelve Firestore",
  JSON.stringify(ids) === JSON.stringify(["animals_dog", "food_apple", "weather_rain"]),
  "salieron: " + ids.join(", ")
);

/* El mismo contenido, entregado en otro orden y con las claves al revés:
   el fichero tiene que salir byte a byte idéntico o el diff mentirá. */
const revueltas = [...TARJETAS].reverse().map(([id, datos]) => [
  id, Object.fromEntries(Object.entries(datos).reverse())
]);
const segunda = await exportarMaestro({ carpeta, silencioso: true, almacen: almacenFalso({ cards: revueltas, themes: [] }) });
const texto2 = readFileSync(join(carpeta, "tarjetas.jsonl"), "utf8");

compruebo(
  "Mismo contenido en otro orden produce un fichero idéntico",
  texto1 === texto2,
  "el diff marcaría cambios que no existen"
);

compruebo("El manifiesto cuenta lo que hay", primera.tarjetas === 3 && segunda.tarjetas === 3);
compruebo("El manifiesto declara la versión del esquema", primera.schemaVersion === "1.1");

/* Y que un cambio de verdad SÍ se vea: si no, no sirve de nada. */
const cambiadas = TARJETAS.map(([id, datos]) =>
  id === "animals_dog" ? [id, Object.assign({}, datos, { eu: "txakur" })] : [id, datos]
);
await exportarMaestro({ carpeta, silencioso: true, almacen: almacenFalso({ cards: cambiadas, themes: [] }) });
const texto3 = readFileSync(join(carpeta, "tarjetas.jsonl"), "utf8");

compruebo(
  "Una corrección de verdad sí aparece en el fichero",
  texto3 !== texto1 && texto3.includes('"eu":"txakur"')
);

const lineasCambiadas = texto3.split("\n").filter((l, i) => l !== texto1.split("\n")[i]).length;
compruebo(
  "Y solo cambia esa línea, no las tres",
  lineasCambiadas === 1,
  "líneas distintas: " + lineasCambiadas
);

rmSync(carpeta, { recursive: true, force: true });

console.log("");
if (fallos > 0) { console.log(fallos + " comprobación(es) fallan.\n"); process.exit(1); }
console.log("El volcado produce diffs legibles.\n");
