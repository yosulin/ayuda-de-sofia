/**
 * ============================================================
 *  Volcar Firestore al maestro versionado
 * ============================================================
 *      node exportar.mjs [--salida <ruta>] [--stdout]
 *
 *  Escribe todo el contenido (cards y themes) en JSONL dentro de
 *  contenido/maestro/, que se versiona en git. Eso es lo que convierte
 *  una copia de seguridad en una fuente de verdad: se puede LEER qué
 *  cambió entre el jueves y el viernes, y una tanda de traducciones se
 *  puede revisar como un diff antes de aceptarla.
 *
 *  Fuera de vocabulario/ a propósito: esa carpeta la publica Firebase
 *  Hosting, y Hosting no tiene autenticación, así que el corpus entero
 *  quedaría descargable por cualquiera.
 *
 *  DOS COSAS DECIDEN SI EL DIFF SE PUEDE LEER:
 *
 *   1. Orden estable. Firestore devuelve los documentos en el orden que
 *      le parece; sin ordenar por id, cada volcado cambiaría las 3.140
 *      líneas y el diff no diría nada.
 *
 *   2. Fuera updatedAt. Se reescribe en CADA pasada del importador, así
 *      que si entrara aquí, importar marcaría las 3.140 como cambiadas.
 *      createdAt sí se queda: solo se escribe en el alta, y es la fecha
 *      que de verdad dice cuándo entró una palabra.
 *
 *  Solo lee. No modifica Firestore.
 * ============================================================
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { conectar } from "./lib/firebase.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/* Se reescribe en cada importación, así que no dice nada sobre el
   contenido y ensuciaría todos los diffs. */
const VOLATILES = ["updatedAt"];

/* ---------- línea de comandos ---------- */

const argumentos = process.argv.slice(2);
function opcion(nombre, pordefecto) {
  const i = argumentos.indexOf("--" + nombre);
  if (i === -1) return pordefecto;
  const siguiente = argumentos[i + 1];
  return siguiente && !siguiente.startsWith("--") ? siguiente : true;
}

const aStdout = opcion("stdout", false) === true;
const carpetaSalida = resolve(raiz, String(opcion("salida", "contenido/maestro")));

/* ---------- serializar ---------- */

/**
 * JSON con las claves ordenadas. Firestore no garantiza el orden de las
 * propiedades, y sin esto una misma tarjeta sin cambios podría escribirse
 * de dos maneras distintas y aparecer como modificada.
 */
export function estable(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(estable);

  /* Las marcas de tiempo del Admin SDK se guardan en ISO: legible en el
     diff y reimportable, que es lo que se pide de un maestro. */
  if (typeof valor.toDate === "function") return valor.toDate().toISOString();

  const ordenado = {};
  Object.keys(valor).sort().forEach((clave) => { ordenado[clave] = estable(valor[clave]); });
  return ordenado;
}

export function aLinea(id, datos) {
  const limpio = Object.assign({}, datos);
  VOLATILES.forEach((campo) => delete limpio[campo]);
  return JSON.stringify(Object.assign({ id }, estable(limpio)));
}

/** Una colección entera, ordenada por id, como texto JSONL. */
async function volcar(almacen, coleccion) {
  const respuesta = await almacen.collection(coleccion).get();

  const lineas = respuesta.docs
    .map((documento) => ({ id: documento.id, datos: documento.data() }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(({ id, datos }) => aLinea(id, datos));

  return { texto: lineas.length > 0 ? lineas.join("\n") + "\n" : "", cuantas: lineas.length };
}

/* ---------- hacerlo ---------- */

export async function exportarMaestro({ carpeta = carpetaSalida, silencioso = false, almacen: inyectado = null } = {}) {
  /* El almacén se puede inyectar para poder probar la serialización sin
     credenciales ni red, que es donde de verdad puede haber errores. */
  const almacen = inyectado || (await conectar()).almacen;

  const tarjetas = await volcar(almacen, "cards");
  const temas = await volcar(almacen, "themes");

  const manifiesto = {
    schemaVersion: "1.1",
    exportadoDe: "firestore",
    fecha: new Date().toISOString(),
    tarjetas: tarjetas.cuantas,
    temas: temas.cuantas
  };

  if (aStdout && !silencioso) {
    process.stdout.write(tarjetas.texto);
    return manifiesto;
  }

  mkdirSync(carpeta, { recursive: true });
  writeFileSync(resolve(carpeta, "tarjetas.jsonl"), tarjetas.texto, "utf8");
  writeFileSync(resolve(carpeta, "temas.jsonl"), temas.texto, "utf8");
  writeFileSync(
    resolve(carpeta, "manifest.json"),
    JSON.stringify(manifiesto, null, 2) + "\n",
    "utf8"
  );

  if (!silencioso) {
    console.log(
      "Maestro volcado en " + carpeta + "\n" +
      "  tarjetas.jsonl  " + tarjetas.cuantas + "\n" +
      "  temas.jsonl     " + temas.cuantas + "\n\n" +
      "Revisa el diff antes de dar nada por bueno:  git diff contenido/maestro\n"
    );
  }

  return manifiesto;
}

/* Solo se ejecuta si se llama directamente, para poder importarlo
   desde importar.mjs sin que se dispare al cargarlo. */
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  exportarMaestro().catch((error) => {
    console.error("\n" + error.message + "\n");
    process.exit(1);
  });
}
