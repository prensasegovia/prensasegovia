# Activar Redes → X (una sola vez, unos 10 minutos)

Cómo funciona: al abrir **Redes → X** en la web, el Apps Script lanza en GitHub la pasada «Redes · X», que lee con la
cuenta de lectura los últimos tuits de los perfiles de la lista y los deja en el Apps Script (privado). En 1–2 minutos
aparecen en la web. No hace falta ningún ordenador encendido.

## 1. La sesión de la cuenta de lectura → secretos de GitHub

Mejor una **cuenta de X secundaria**: GitHub lee desde servidores de EE. UU. y X podría pedirle verificación.

1. Abre una **ventana de incógnito** en Chrome y entra en x.com con esa cuenta.
2. **F12** → pestaña **Aplicación** → **Cookies** → **https://x.com**. Copia el valor de `auth_token` y el de `ct0`.
3. Cierra la ventana de incógnito **sin pulsar «Cerrar sesión»** (si cierras sesión, las cookies dejan de valer).
4. Entra en https://github.com/prensasegovia/prensasegovia/settings/secrets/actions → **New repository secret**:
   - Name `X_AUTH_TOKEN` → Secret: el valor de `auth_token` → **Add secret**
   - Name `X_CT0` → Secret: el valor de `ct0` → **Add secret**

Cuando la sesión caduque, la web lo dirá en Redes → X («hay que renovar los secretos»): repite estos pasos.

## 2. Apps Script

En https://script.google.com abre el proyecto donde están `avisos` y `despertador`.

1. **Archivos (+)** → **Script** → nombre `redesx` → borra lo que trae y pega todo `herramientas/redesx.gs`.
2. Abre `avisos` y añade estas dos líneas (no cambies nada más, sobre todo tu línea `const TOKEN = '...'`):
   - Justo debajo de `function doGet(e) {`:
     ```js
     const rx = redesXGet_(e); if (rx) return rx;   // Redes → X (redesx.gs)
     ```
   - Justo debajo de `const d = JSON.parse(e.postData.contents || '{}');` (dentro de `doPost`):
     ```js
     const rx = redesX_(d); if (rx) return rx;   // Redes → X (redesx.gs)
     ```
3. **Guardar** (icono del disquete).
4. **Implementar → Gestionar implementaciones** → lápiz de la implementación que ya tienes → **Versión: Nueva versión** →
   **Implementar**. Así la dirección no cambia y la web la sigue encontrando.
5. Si pide permisos nuevos, acéptalos (es para llamar a GitHub, igual que el despertador).

## 3. Probar

1. Abre la web → **Redes** → **X**. Arriba de las columnas debe poner «Leyendo en X… (1–2 minutos)».
2. Espera 1–2 minutos sin cerrar la página: las columnas se rellenan solas con los tuits.
3. Si no llegan: en GitHub → pestaña **Actions** → «Redes · X» → la última pasada dice qué ha fallado
   (solo da recuentos; nunca escribe qué cuentas se siguen).
