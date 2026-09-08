# Mockups de interfaz

Probar cómo se ve algo **antes** de implementarlo. Cada uno es un fichero
suelto, sin Firebase y con datos de pega: se abre con doble clic.

| | |
|---|---|
| `index.html` | El índice de módulos y las pantallas principales. **Implementado.** |
| `pestana-ajustes.html` | Ajustes colgando del engranaje como una pestaña. **Implementado.** |
| `armazon.html` | Los cuatro repartos de navegación por dispositivo. **Implementado.** Dentro del marco usa container queries para poder comparar formatos sin abrir seis ventanas; en producción son media queries con los mismos números. |
| `panel-inicio.html` | Panel de avance en el índice: cada palabra un punto gris que se vuelve de color al aprenderla. **Sin implementar**, aparcado a propósito. |

---

## index.html

`index.html` es un **mockup navegable**: un solo fichero, sin Firebase y con
datos de pega. Sirve para discutir la interfaz sin tocar la app que ya funciona.

Se abre con doble clic (no necesita servidor) o publicado en:
https://claude.ai/code/artifact/d2d47445-3174-4811-b3e0-cbc5471b705a

Las pestañas de arriba saltan entre pantallas; son solo para revisar, no forman
parte de la app.

## Lo que propone

- **Un color por módulo** (coral las tarjetas, azul el diccionario, verde
  matemagia), que viaja a la cabecera y a los botones de dentro.
- **El índice como casa**, con la vuelta siempre en el mismo sitio.
- **Cada módulo enseña su estado** en su tarjeta del índice.
- Una casilla **vacía a propósito**: el índice tiene que verse bien con dos
  módulos y con ocho.

Usa los mismos tokens que la app real (`vocabulario/css/estilos.css`): mismos
colores, mismas tipografías. Lo que se apruebe aquí se traslada allí.
