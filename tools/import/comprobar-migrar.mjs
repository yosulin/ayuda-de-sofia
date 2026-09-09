/**
 * ============================================================
 *  ¿Renombrar ids conserva el progreso de Sofía?
 * ============================================================
 *      node comprobar-migrar.mjs
 *
 *  migrar-ids.mjs borra documentos. Es el script más peligroso del
 *  repositorio, así que se prueba con un Firestore de mentira antes de
 *  dejarlo acercarse al de verdad.
 *
 *  Lo que se comprueba es lo que no puede fallar: que nada se borra sin
 *  haberse copiado antes, y que el progreso viaja con la tarjeta.
 * ============================================================
 */

import { migrar } from "./migrar-ids.mjs";

let fallos = 0;
function compruebo(nombre, condicion, detalle = "") {
  if (condicion) { console.log("  OK    " + nombre); return; }
  fallos++;
  console.log("  FALLA " + nombre + (detalle ? "\n        " + detalle : ""));
}

/**
 * Firestore de mentira: guarda todo en un Map con la ruta como clave y
 * registra el ORDEN de las operaciones, que es lo que permite demostrar
 * que no se borró nada antes de copiarlo.
 */
function firestoreFalso(inicial) {
  const datos = new Map(Object.entries(inicial));
  const diario = [];

  const referencia = (ruta) => ({
    id: ruta.split("/").pop(),
    get: async () => ({ exists: datos.has(ruta), data: () => datos.get(ruta) }),
    collection: (sub) => coleccion(ruta + "/" + sub),
    _ruta: ruta
  });

  const coleccion = (base) => ({
    doc: (id) => referencia(base + "/" + id),
    listDocuments: async () => [...new Set(
      [...datos.keys()]
        .filter((ruta) => ruta.startsWith(base + "/"))
        .map((ruta) => base + "/" + ruta.slice(base.length + 1).split("/")[0])
    )].map(referencia),
    get: async () => ({
      size: [...datos.keys()].filter((r) => r.startsWith(base + "/") && r.slice(base.length + 1).indexOf("/") === -1).length
    })
  });

  return {
    _datos: datos,
    _diario: diario,
    collection: coleccion,
    batch: () => {
      const cola = [];
      return {
        set: (ref, valor) => cola.push(["set", ref._ruta, valor]),
        delete: (ref) => cola.push(["delete", ref._ruta]),
        commit: async () => cola.forEach(([que, ruta, valor]) => {
          diario.push([que, ruta]);
          if (que === "set") datos.set(ruta, valor); else datos.delete(ruta);
        })
      };
    }
  };
}

const EQ = { animals_dog: "dog_n", colors_red: "red_adj" };

function mundo() {
  return {
    "cards/animals_dog": { id: "animals_dog", word: "dog", eu: "txakurra" },
    "cards/colors_red":  { id: "colors_red",  word: "red",  eu: "gorria" },
    "users/sofia/progress/animals_dog": { status: "known", seenCount: 7 },
    "users/sofia/progress/colors_red":  { status: "review", seenCount: 2 },
    "users/ama/progress/animals_dog":   { status: "learning", seenCount: 1 }
  };
}

console.log("\nComprobando el renombrado de identificadores\n");

/* ---------- en seco no toca nada ---------- */

const seco = firestoreFalso(mundo());
await migrar({ almacen: seco, equivalencias: EQ, deVerdad: false, silencioso: true });
compruebo("En seco no escribe ni borra nada", seco._diario.length === 0 && seco._datos.size === 5);

/* ---------- de verdad ---------- */

const real = firestoreFalso(mundo());
const registro = await migrar({ almacen: real, equivalencias: EQ, deVerdad: true, silencioso: true });

compruebo("La tarjeta aparece con el id nuevo", real._datos.has("cards/dog_n"));
compruebo("Y el campo id interno también se actualiza",
  real._datos.get("cards/dog_n").id === "dog_n",
  JSON.stringify(real._datos.get("cards/dog_n")));
compruebo("La tarjeta vieja ya no está", !real._datos.has("cards/animals_dog"));

compruebo("El progreso de Sofía viaja con la tarjeta",
  real._datos.get("users/sofia/progress/dog_n")?.seenCount === 7,
  JSON.stringify(real._datos.get("users/sofia/progress/dog_n")));
compruebo("Y el de las dos tarjetas, no solo la primera",
  real._datos.get("users/sofia/progress/red_adj")?.status === "review");
compruebo("El progreso de OTROS usuarios también se remapea",
  real._datos.get("users/ama/progress/dog_n")?.status === "learning");
compruebo("No queda progreso colgando del id viejo",
  !real._datos.has("users/sofia/progress/animals_dog") && !real._datos.has("users/ama/progress/animals_dog"));

compruebo("No se pierde ningún documento por el camino", real._datos.size === 5,
  "quedan " + real._datos.size + " de 5");
compruebo("El recuento cuadra", registro.tarjetas === 2 && registro.progresos === 3);

/* La propiedad que de verdad importa: nada se borra antes de copiarse. */
const primerBorrado = real._diario.findIndex(([que]) => que === "delete");
const ultimaCopia = real._diario.map(([que]) => que).lastIndexOf("set");
compruebo("Nada se borra antes de haberse copiado", primerBorrado > ultimaCopia,
  "primer borrado en " + primerBorrado + ", última copia en " + ultimaCopia);

/* ---------- la salida de emergencia ---------- */

const conservando = firestoreFalso(mundo());
await migrar({ almacen: conservando, equivalencias: EQ, deVerdad: true, conservarViejas: true, silencioso: true });
compruebo("--sin-borrar deja lo viejo en su sitio",
  conservando._datos.has("cards/animals_dog") && conservando._datos.has("cards/dog_n"));
compruebo("…y el progreso viejo también, por si hay que volver",
  conservando._datos.has("users/sofia/progress/animals_dog"));

/* ---------- repetirlo no rompe nada ---------- */

const otraVez = await migrar({ almacen: real, equivalencias: EQ, deVerdad: true, silencioso: true });
compruebo("Repetir la migración ya hecha no hace nada",
  otraVez.tarjetas === 0 && otraVez.progresos === 0 && real._datos.size === 5);

console.log("");
if (fallos > 0) { console.log(fallos + " comprobación(es) fallan.\n"); process.exit(1); }
console.log("Renombrar conserva el progreso.\n");
