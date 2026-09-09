/**
 * ============================================================
 *  Todo lo que hay que comprobar antes de publicar
 * ============================================================
 *      node tools/comprobar.mjs
 *
 *  Lo mismo que corre la CI, en un solo comando, para poder verlo en
 *  verde ANTES de desplegar y no después. No instala nada ni necesita
 *  credenciales: no toca Firebase.
 * ============================================================
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CONFIGURACIONES = [
  "firebase.json",
  "firestore.indexes.json",
  "vocabulario/manifest.webmanifest",
  "tools/import/package.json",
  "tools/import/datos/tarjetas-demo.json"
];

let fallos = 0;

function paso(nombre, tarea) {
  try {
    tarea();
    console.log("  OK    " + nombre);
  } catch (error) {
    fallos++;
    console.log("  FALLA " + nombre);
    const detalle = (error.stdout || "") + (error.stderr || "") || error.message;
    String(detalle).trim().split("\n").forEach((linea) => console.log("        " + linea));
  }
}

function ejecutar(script) {
  execFileSync(process.execPath, [resolve(raiz, script)], {
    cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
  });
}

console.log("\nComprobando " + raiz + "\n");

paso("El service worker precachea lo que la app carga", () => ejecutar("tools/comprobar-precacheo.mjs"));
paso("Las tres lenguas están completas", () => ejecutar("tools/comprobar-traducciones.mjs"));

paso("El volcado del maestro produce diffs legibles", () => ejecutar("tools/import/comprobar-exportar.mjs"));

paso("Renombrar identificadores conserva el progreso", () => ejecutar("tools/import/comprobar-migrar.mjs"));

paso("Los ficheros de configuración son JSON válido", () => {
  CONFIGURACIONES.forEach((fichero) => {
    try {
      JSON.parse(readFileSync(resolve(raiz, fichero), "utf8"));
    } catch (error) {
      throw new Error(fichero + ": " + error.message);
    }
  });
});

/* Recorrido a mano en vez de fs.globSync: esa API sigue siendo
   experimental y esto tiene que correr igual en Windows y en la CI. */
function ficherosDe(carpeta, extensiones) {
  const encontrados = [];
  for (const entrada of readdirSync(resolve(raiz, carpeta), { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === "node_modules" || entrada.name.startsWith(".")) continue;
      encontrados.push(...ficherosDe(ruta, extensiones));
    } else if (extensiones.includes(extname(entrada.name))) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

paso("Los módulos compilan", () => {
  const ficheros = [
    ...ficherosDe("vocabulario/js", [".js"]),
    "vocabulario/service-worker.js",
    ...ficherosDe("tools", [".mjs"])
  ];
  const rotos = [];
  ficheros.forEach((fichero) => {
    try {
      execFileSync(process.execPath, ["--check", resolve(raiz, fichero)], { stdio: "pipe" });
    } catch (error) {
      rotos.push(fichero);
    }
  });
  if (rotos.length > 0) throw new Error("No compilan: " + rotos.join(", "));
});

console.log("");
if (fallos === 0) {
  console.log("Todo en su sitio. Se puede desplegar.\n");
  process.exit(0);
}
console.log(fallos + (fallos === 1 ? " comprobación falla" : " comprobaciones fallan") + ". No despliegues todavía.\n");
process.exit(1);
