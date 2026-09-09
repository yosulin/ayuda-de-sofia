/**
 * ============================================================
 *  Devolver el maestro a Firestore
 * ============================================================
 *      node restaurar.mjs                 # enseña qué haría, no toca nada
 *      node restaurar.mjs --confirmar     # lo hace de verdad
 *
 *  Un volcado que nunca se ha restaurado no es una copia de seguridad,
 *  es una esperanza. Esto es la otra mitad de exportar.mjs, y hay que
 *  probarlo a propósito al menos una vez.
 *
 *  Escribe con set() SIN merge: restaurar significa dejar el documento
 *  como estaba, también en los campos que se hayan añadido después. Por
 *  eso pide --confirmar y por eso empieza siempre en seco.
 *
 *  createdAt se conserva tal y como está en el fichero: es la fecha en
 *  que la palabra entró, y restaurar no la cambia. updatedAt se pone a
 *  la hora de la restauración, que es la verdad de cuándo se escribió.
 *
 *  Lo que NO toca: users/{uid}/… El progreso de Sofía no está aquí ni
 *  debe estar. Es lo único irremplazable y no se restaura desde este
 *  fichero.
 * ============================================================
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { conectar } from "./lib/firebase.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const argumentos = process.argv.slice(2);
const deVerdad = argumentos.includes("--confirmar");
const soloTarjetas = argumentos.includes("--solo-tarjetas");

const i = argumentos.indexOf("--desde");
const carpeta = resolve(raiz, i !== -1 && argumentos[i + 1] ? argumentos[i + 1] : "contenido/maestro");

/** Lee un .jsonl y devuelve [{id, ...datos}], avisando de la línea rota. */
function leer(nombre) {
  const ruta = resolve(carpeta, nombre);
  if (!existsSync(ruta)) return [];

  return readFileSync(ruta, "utf8")
    .split("\n")
    .filter((linea) => linea.trim() !== "")
    .map((linea, numero) => {
      try {
        return JSON.parse(linea);
      } catch (error) {
        throw new Error(nombre + ", línea " + (numero + 1) + ": no es JSON válido.\n  " + error.message);
      }
    });
}

async function restaurarColeccion(almacen, coleccion, registros, FieldValue) {
  const TAMANO_LOTE = 400;
  let escritos = 0;

  for (let i = 0; i < registros.length; i += TAMANO_LOTE) {
    const lote = almacen.batch();
    registros.slice(i, i + TAMANO_LOTE).forEach((registro) => {
      const { id, ...datos } = registro;
      /* Las fechas volvieron a texto al volcar; se dejan tal cual salvo
         updatedAt, que dice cuándo se escribió esto de verdad. */
      lote.set(almacen.collection(coleccion).doc(id),
        Object.assign({}, datos, { updatedAt: FieldValue.serverTimestamp() }));
    });
    await lote.commit();
    escritos += Math.min(TAMANO_LOTE, registros.length - i);
    process.stdout.write("\r  " + coleccion + ": " + escritos + "/" + registros.length + "   ");
  }
  if (registros.length > 0) process.stdout.write("\n");
  return escritos;
}

async function principal() {
  if (!existsSync(carpeta)) {
    throw new Error("No hay maestro en " + carpeta + ".\n  Vuélcalo primero:  node exportar.mjs");
  }

  const tarjetas = leer("tarjetas.jsonl");
  const temas = soloTarjetas ? [] : leer("temas.jsonl");

  const manifiesto = existsSync(resolve(carpeta, "manifest.json"))
    ? JSON.parse(readFileSync(resolve(carpeta, "manifest.json"), "utf8"))
    : null;

  console.log("\nMaestro:  " + carpeta);
  if (manifiesto) console.log("Volcado:  " + manifiesto.fecha + "  (esquema " + manifiesto.schemaVersion + ")");
  console.log("  tarjetas.jsonl  " + tarjetas.length);
  console.log("  temas.jsonl     " + temas.length);

  if (tarjetas.length === 0 && temas.length === 0) {
    throw new Error("El maestro está vacío. No se restaura nada: eso borraría en vez de restaurar.");
  }

  const { almacen } = await conectar();

  /* Cuánto hay ahora, para que se vea qué se va a machacar. */
  const ahora = (await almacen.collection("cards").get()).size;
  console.log("\nEn Firestore hay ahora " + ahora + " tarjetas.");
  if (ahora > tarjetas.length) {
    console.log("AVISO: hay " + (ahora - tarjetas.length) + " más de las que trae el maestro.");
    console.log("       Restaurar NO las borra, pero tampoco las devuelve a un estado anterior.");
  }

  if (!deVerdad) {
    console.log("\nEn seco: no se ha escrito nada.");
    console.log("Primera tarjeta tal y como quedaría:\n");
    console.log(JSON.stringify(tarjetas[0], null, 2));
    console.log("\nPara hacerlo de verdad:  node restaurar.mjs --confirmar\n");
    return;
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  console.log("");
  await restaurarColeccion(almacen, "cards", tarjetas, FieldValue);
  if (temas.length > 0) await restaurarColeccion(almacen, "themes", temas, FieldValue);

  console.log("\nRestaurado. El progreso de Sofía (users/…) no se ha tocado.\n");
}

principal().catch((error) => {
  console.error("\n" + error.message + "\n");
  process.exit(1);
});
