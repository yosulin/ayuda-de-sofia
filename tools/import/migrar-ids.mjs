/**
 * ============================================================
 *  Renombrar ConceptId sin perder el progreso de Sofía
 * ============================================================
 *      node migrar-ids.mjs                # en seco: no toca nada
 *      node migrar-ids.mjs --confirmar    # lo hace
 *
 *  El contrato 1.1 cambia el identificador de <tema>_<palabra> a
 *  <lema>_<pos>. El problema no son las tarjetas —el contenido se
 *  regenera— sino que el progreso vive en users/{uid}/progress/{cardId},
 *  indexado por ese mismo id. Renombrar sin más deja huérfano lo único
 *  irremplazable del sistema.
 *
 *  Por eso esto hace las dos cosas a la vez, y en este orden:
 *
 *    1. copia cada tarjeta al id nuevo
 *    2. copia el progreso de CADA usuario al id nuevo
 *    3. y solo entonces borra los documentos viejos
 *
 *  Si algo falla por el camino, lo viejo sigue ahí: se puede repetir.
 *
 *  La tabla de equivalencia está versionada en
 *  contenido/migraciones/ids-1.1.json, no se calcula aquí. Así queda
 *  registrado qué se renombró y cuándo, y se puede deshacer.
 * ============================================================
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { conectar } from "./lib/firebase.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const argumentos = process.argv.slice(2);
const deVerdad = argumentos.includes("--confirmar");
const conservarViejas = argumentos.includes("--sin-borrar");

const i = argumentos.indexOf("--tabla");
const rutaTabla = resolve(raiz, i !== -1 && argumentos[i + 1]
  ? argumentos[i + 1] : "contenido/migraciones/ids-1.1.json");

if (!existsSync(rutaTabla)) {
  console.error("\nNo encuentro la tabla de equivalencia en " + rutaTabla + "\n");
  process.exit(1);
}

const tabla = JSON.parse(readFileSync(rutaTabla, "utf8"));
const equivalencias = tabla.equivalencias;

export async function migrar({ almacen: inyectado = null, equivalencias: eq = equivalencias,
                               deVerdad: hazlo = deVerdad, conservarViejas: conservar = conservarViejas,
                               silencioso = false } = {}) {
  const almacen = inyectado || (await conectar()).almacen;
  const registro = { tarjetas: 0, progresos: 0, borradas: 0, borrados: 0 };
  const decir = (texto) => { if (!silencioso) decir(texto); };

  decir("\nTabla:   " + rutaTabla);
  decir("Motivo:  " + tabla.motivo);
  decir("Cambios: " + Object.keys(eq).length + " identificadores\n");

  /* ---------- qué hay de verdad ---------- */

  const tarjetas = new Map();
  for (const [viejo, nuevo] of Object.entries(eq)) {
    const documento = await almacen.collection("cards").doc(viejo).get();
    const yaEsta = (await almacen.collection("cards").doc(nuevo).get()).exists;
    tarjetas.set(viejo, { nuevo, existe: documento.exists, datos: documento.data(), yaEsta });
  }

  const porRenombrar = [...tarjetas.values()].filter((t) => t.existe);
  const ausentes = [...tarjetas.entries()].filter(([, t]) => !t.existe).map(([v]) => v);
  const chocan = [...tarjetas.values()].filter((t) => t.existe && t.yaEsta);

  decir("Tarjetas encontradas con el id viejo: " + porRenombrar.length);
  if (ausentes.length > 0) {
    decir("No están (quizá ya migradas): " + ausentes.join(", "));
  }
  if (chocan.length > 0) {
    decir("\nEl id nuevo YA existe para: " + chocan.map((t) => t.nuevo).join(", "));
    decir("Se sobrescribiría. Revísalo antes de confirmar.");
  }

  /* ---------- el progreso, que es lo que no se puede perder ---------- */

  const usuarios = await almacen.collection("users").listDocuments();
  const trabajos = [];

  for (const usuario of usuarios) {
    for (const [viejo, { nuevo }] of Object.entries(eq).map(([v, n]) => [v, { nuevo: n }])) {
      const origen = usuario.collection("progress").doc(viejo);
      const documento = await origen.get();
      if (documento.exists) trabajos.push({ uid: usuario.id, viejo, nuevo, datos: documento.data() });
    }
  }

  decir("\nUsuarios: " + usuarios.length);
  decir("Documentos de progreso a remapear: " + trabajos.length);
  if (trabajos.length > 0) {
    const porUsuario = trabajos.reduce((cuenta, t) => {
      cuenta[t.uid] = (cuenta[t.uid] || 0) + 1;
      return cuenta;
    }, {});
    Object.entries(porUsuario).forEach(([uid, cuantos]) =>
      decir("  " + uid.slice(0, 8) + "…  " + cuantos + " tarjetas con progreso"));
  }

  if (!hazlo) {
    decir("\nEn seco: no se ha escrito nada.");
    decir("Para hacerlo:  node migrar-ids.mjs --confirmar\n");
    return registro;
  }

  /* ---------- hacerlo: copiar primero, borrar al final ---------- */

  decir("\nCopiando…");

  let lote = almacen.batch();
  let pendientes = 0;
  const confirmar = async (forzar = false) => {
    if (pendientes >= 400 || (forzar && pendientes > 0)) {
      await lote.commit();
      lote = almacen.batch();
      pendientes = 0;
    }
  };

  for (const tarjeta of porRenombrar) {
    const { id, ...datos } = tarjeta.datos;
    lote.set(almacen.collection("cards").doc(tarjeta.nuevo), Object.assign({}, datos, { id: tarjeta.nuevo }));
    pendientes++;
    await confirmar();
  }
  for (const trabajo of trabajos) {
    lote.set(almacen.collection("users").doc(trabajo.uid).collection("progress").doc(trabajo.nuevo), trabajo.datos);
    pendientes++;
    await confirmar();
  }
  await confirmar(true);
  registro.tarjetas = porRenombrar.length;
  registro.progresos = trabajos.length;
  decir("  " + porRenombrar.length + " tarjetas y " + trabajos.length + " progresos copiados al id nuevo.");

  if (conservar) {
    decir("\n--sin-borrar: lo viejo se queda. Bórralo cuando hayas comprobado la app.\n");
    return registro;
  }

  decir("Borrando lo viejo…");
  lote = almacen.batch(); pendientes = 0;
  for (const [viejo, tarjeta] of tarjetas) {
    if (!tarjeta.existe) continue;
    lote.delete(almacen.collection("cards").doc(viejo));
    registro.borradas++;
    pendientes++;
    await confirmar();
  }
  for (const trabajo of trabajos) {
    lote.delete(almacen.collection("users").doc(trabajo.uid).collection("progress").doc(trabajo.viejo));
    registro.borrados++;
    pendientes++;
    await confirmar();
  }
  await confirmar(true);

  decir("\nMigrado. Abre la app y comprueba que el progreso de Sofía sigue ahí.\n");
  return registro;
}

/* Solo se ejecuta al llamarlo directamente, para poder probarlo. */
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  migrar().catch((error) => {
    console.error("\n" + error.message + "\n");
    process.exit(1);
  });
}
