# Guía: Ejecutar el proyecto en red local (exposición)

Esta guía explica cómo hacer que el frontend y el backend sean accesibles desde otros dispositivos en la misma red WiFi, útil para demostraciones y exposiciones.

---

## Paso 1 — Obtener la IP del PC anfitrión

El PC que ejecuta el proyecto debe conocer su dirección IP local.

1. Abrir **CMD** (buscar "cmd" en el menú inicio)
2. Ejecutar:
   ```
   ipconfig
   ```
3. Buscar la sección **"Adaptador de LAN inalámbrica Wi-Fi"** y anotar el valor de **Dirección IPv4**
   - Ejemplo: `123.234.9.20`

> Todos los dispositivos deben estar conectados al **mismo WiFi**.

---

## Paso 2 — Configurar el Backend

Archivo: `src/app.js` (en el repositorio del backend)

Buscar la línea `app.listen` al final del archivo y cambiarla así:

**Antes:**
```js
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
```

**Después:**
```js
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor escuchando en http://0.0.0.0:${PORT}`);
});
```

> El `'0.0.0.0'` hace que el servidor acepte conexiones desde cualquier dispositivo de la red, no solo desde el mismo PC.

---

## Paso 3 — Configurar el Frontend

Archivo: `src/utils/config.js` (en el repositorio del frontend)

Cambiar la `API_BASE_URL` reemplazando `localhost` por la IP del PC anfitrión:

**Antes:**
```js
export const API_BASE_URL = 'http://localhost:3000';
```

**Después:**
```js
export const API_BASE_URL = 'http://123.234.9.20:3000';
```

> Reemplazar `123.234.9.20` con la IP obtenida en el Paso 1.

---

## Paso 4 — Abrir los puertos en el Firewall de Windows

El firewall de Windows bloquea por defecto las conexiones entrantes. Hay que abrir los puertos **3000** (backend) y **5173** (frontend) para que otros dispositivos puedan conectarse.

Repetir estos pasos **dos veces**: una para el puerto `3000` y otra para el `5173`.

1. Presionar `Windows + R`, escribir `wf.msc` y dar Enter
2. En el panel izquierdo: **Reglas de entrada**
3. En el panel derecho: **Nueva regla...**
4. Tipo de regla: **Puerto** → Siguiente
5. Protocolo: **TCP** — Puerto específico: escribir `3000` (o `5173` en la segunda vez) → Siguiente
6. Acción: **Permitir la conexión** → Siguiente
7. Perfil: dejar las **3 opciones marcadas** (Dominio, Privado, Público) → Siguiente
8. Nombre: `Backend 3000` (o `Vite 5173`) → **Finalizar**

---

## Paso 5 — Iniciar los servidores

### Backend
En la terminal del repositorio del backend:
```bash
npm start / npm run dev
```
o
```bash
node src/app.js
```

### Frontend
En la terminal del repositorio del frontend, usar el flag `--host` para que Vite también escuche en red:
```bash
npx vite --host
```

Vite mostrará dos URLs:
```
Local:    http://localhost:5173/
Network:  http://123.234.9.20:5173/   ← esta es la que comparten
```

---

## Paso 6 — Acceder desde otro dispositivo

Desde cualquier celular o PC conectado al mismo WiFi, abrir el navegador y entrar a:

```
http://123.234.9.20:5173
```

> Reemplazar con la IP del Paso 1.

---

## Resumen rápido

| Qué cambiar | Dónde | Cambio |
|---|---|---|
| IP del backend | `frontend/src/utils/config.js` | `localhost` → IP del PC |
| Escuchar en red | `backend/src/app.js` | Agregar `'0.0.0.0'` en `app.listen` |
| Firewall puerto 3000 | Windows Firewall | Nueva regla TCP entrada |
| Firewall puerto 5173 | Windows Firewall | Nueva regla TCP entrada |
| Iniciar frontend | Terminal | `npx vite --host` |

---

## Al terminar la exposición

Revertir los cambios para no dejar la IP local hardcodeada en el código:

- `config.js`: volver a `http://localhost:3000`
- `app.js`: quitar el `'0.0.0.0'` del `app.listen`
