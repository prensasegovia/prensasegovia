# Activar Redes → X (una sola vez, unos 10 minutos)

Cómo funciona: al abrir **Redes → X** en la web, el Apps Script lanza en GitHub la pasada «Redes · X», que lee con la
cuenta de lectura los últimos tuits de los perfiles de la lista y los deja en el Apps Script (privado). En 1–2 minutos
aparecen en la web. No hace falta ningún ordenador encendido.

## 0. Crear el workflow «Redes · X» en GitHub

El acceso de git de este Mac no puede crear workflows, así que este archivo se crea desde la web de GitHub:
abre [este enlace](https://github.com/prensasegovia/prensasegovia/new/main?filename=.github/workflows/redes-x.yml&value=name%3A%20Redes%20%C2%B7%20X%0A%0A%23%20Lo%20lanza%20el%20Apps%20Script%20cuando%20alguien%20abre%20Redes%20%E2%86%92%20X%20en%20la%20web%20%28no%20tiene%20horario%20propio%29.%0A%23%20Lee%20los%20%C3%BAltimos%20tuits%20de%20los%20perfiles%20de%20la%20lista%20con%20la%20cuenta%20de%20lectura%20y%20los%20deja%20en%20el%20Apps%20Script.%0A%23%20Necesita%20los%20secretos%20X_AUTH_TOKEN%20y%20X_CT0%20%28sesi%C3%B3n%20de%20la%20cuenta%20de%20lectura%29%20y%20AVISOS%20%28el%20que%20ya%20existe%29.%0Aon%3A%0A%20%20workflow_dispatch%3A%20%7B%7D%0A%0Apermissions%3A%0A%20%20contents%3A%20read%0A%0Aconcurrency%3A%0A%20%20group%3A%20redes-x%0A%20%20cancel-in-progress%3A%20false%0A%0Ajobs%3A%0A%20%20leer%3A%0A%20%20%20%20runs-on%3A%20ubuntu-latest%0A%20%20%20%20timeout-minutes%3A%2015%0A%20%20%20%20steps%3A%0A%20%20%20%20%20%20-%20uses%3A%20actions/checkout%40v4%0A%20%20%20%20%20%20%20%20with%3A%0A%20%20%20%20%20%20%20%20%20%20sparse-checkout%3A%20%7C%0A%20%20%20%20%20%20%20%20%20%20%20%20usuarios%0A%20%20%20%20%20%20%20%20%20%20%20%20public/avisos.json%0A%20%20%20%20%20%20%20%20%20%20sparse-checkout-cone-mode%3A%20false%0A%0A%20%20%20%20%20%20-%20uses%3A%20actions/setup-node%40v4%0A%20%20%20%20%20%20%20%20with%3A%0A%20%20%20%20%20%20%20%20%20%20node-version%3A%2022%0A%20%20%20%20%20%20%20%20%20%20cache%3A%20npm%0A%20%20%20%20%20%20%20%20%20%20cache-dependency-path%3A%20usuarios/package-lock.json%0A%0A%20%20%20%20%20%20-%20run%3A%20npm%20ci%20--prefix%20usuarios%20--no-audit%20--no-fund%0A%0A%20%20%20%20%20%20%23%20Chrome%20ya%20viene%20instalado%20en%20las%20m%C3%A1quinas%20de%20GitHub%0A%20%20%20%20%20%20-%20name%3A%20Leer%20X%0A%20%20%20%20%20%20%20%20run%3A%20node%20--disable-warning%3DExperimentalWarning%20usuarios/redes-x.mjs%0A%20%20%20%20%20%20%20%20env%3A%0A%20%20%20%20%20%20%20%20%20%20X_AUTH_TOKEN%3A%20%24%7B%7B%20secrets.X_AUTH_TOKEN%20%7D%7D%0A%20%20%20%20%20%20%20%20%20%20X_CT0%3A%20%24%7B%7B%20secrets.X_CT0%20%7D%7D%0A%20%20%20%20%20%20%20%20%20%20AVISOS%3A%20%24%7B%7B%20secrets.AVISOS%20%7D%7D%0A) (ya trae el nombre `.github/workflows/redes-x.yml` y el contenido) → **Commit changes…** → **Commit changes**.
Si el enlace no rellena el contenido, crea ese archivo a mano y pega el bloque de abajo.

<details><summary>Contenido de .github/workflows/redes-x.yml</summary>

```yaml
name: Redes · X

# Lo lanza el Apps Script cuando alguien abre Redes → X en la web (no tiene horario propio).
# Lee los últimos tuits de los perfiles de la lista con la cuenta de lectura y los deja en el Apps Script.
# Necesita los secretos X_AUTH_TOKEN y X_CT0 (sesión de la cuenta de lectura) y AVISOS (el que ya existe).
on:
  workflow_dispatch: {}

permissions:
  contents: read

concurrency:
  group: redes-x
  cancel-in-progress: false

jobs:
  leer:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          sparse-checkout: |
            usuarios
            public/avisos.json
          sparse-checkout-cone-mode: false

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: usuarios/package-lock.json

      - run: npm ci --prefix usuarios --no-audit --no-fund

      # Chrome ya viene instalado en las máquinas de GitHub
      - name: Leer X
        run: node --disable-warning=ExperimentalWarning usuarios/redes-x.mjs
        env:
          X_AUTH_TOKEN: ${{ secrets.X_AUTH_TOKEN }}
          X_CT0: ${{ secrets.X_CT0 }}
          AVISOS: ${{ secrets.AVISOS }}
```
</details>

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
