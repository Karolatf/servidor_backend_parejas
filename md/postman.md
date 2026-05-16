# Guía de Postman — Sistema de Gestión de Tareas
**Para exposición** · Mayo 2026

---

## ¿Qué es Postman y para qué lo usamos?

Postman es una herramienta que permite hacer peticiones HTTP a un servidor de forma visual, sin necesidad de tener el frontend listo. En este proyecto lo usamos para:

- **Probar los endpoints** del backend directamente
- **Registrar a Karol y Sebastián** como administradores (no se puede hacer desde el frontend)
- **Demostrar el flujo completo** de autenticación, tareas, usuarios, etc.

---

## Paso 1 — Importar la colección y el entorno

Los dos archivos están en la carpeta `postman/` del proyecto:

```
postman/
├── SISTEMA GESTIÓN DE TAREAS — v2.postman_collection.json
└── SISTEMA GESTIÓN DE TAREAS — LOCAL.postman_environment.json
```

**En Postman:**

1. Clic en **Import** (esquina superior izquierda)
2. Arrastrar o seleccionar `...collection.json` → **Import**
3. Repetir con `...environment.json`
4. En la esquina superior derecha, seleccionar el entorno **"SISTEMA GESTIÓN DE TAREAS — LOCAL"**

> Si el entorno no está seleccionado, todas las variables `{{URL_API}}`, `{{ACCESS_TOKEN}}` etc. quedan en blanco y las peticiones fallan.

---

## Paso 2 — Levantar el servidor

Antes de cualquier petición el servidor debe estar corriendo:

```bash
cd servidor_backend_parejas
npm run dev
```

Confirmar que en la terminal aparece:
```
Servidor corriendo en http://localhost:3000
Conectado a MySQL — gestion_tareas_sena
```

---

## Paso 3 — Variables de entorno

El entorno tiene 3 variables:

| Variable | Valor inicial | ¿Quién la llena? |
|---|---|---|
| `URL_API` | `http://localhost:3000/api` | Ya viene configurada |
| `ACCESS_TOKEN` | vacío | Se llena automático al hacer LOGIN |
| `REFRESH_TOKEN` | vacío | Se llena automático al hacer LOGIN |

> El request **LOGIN** tiene un script de test que guarda los tokens automáticamente. No hay que copiar ni pegar nada a mano.

---

## Flujo de exposición — Orden recomendado

```
1. AUTENTICACIÓN    → LOGIN (guarda tokens automáticamente)
2. USUARIOS         → listar, crear, cambiar rol, desactivar, reactivar
3. TAREAS           → crear, listar, actualizar estado, calificar
4. RECUPERACIÓN     → solicitar código → verificar → nueva contraseña
5. CALENDARIO       → crear evento, listar, eliminar
6. NOTAS            → crear, listar, eliminar
```

---

## Grupos de la colección

### AUTENTICACIÓN

| Request | Método | Endpoint | Para qué |
|---|---|---|---|
| LOGIN | POST | `/auth/login` | Inicia sesión — guarda tokens automáticamente |
| REGISTER | POST | `/auth/register` | Registra un nuevo usuario |
| RENOVAR TOKEN | POST | `/auth/refresh` | Renueva el accessToken cuando expira (1 hora) |

> **En expo:** Hacer LOGIN primero siempre. Sin token, los demás endpoints devuelven 401.

---

### RECUPERACIÓN DE CONTRASEÑA

Flujo de 3 pasos. Ejecutar en orden:

| Paso | Request | Endpoint | Qué hace |
|---|---|---|---|
| 1 | SOLICITAR CÓDIGO | POST `/auth/forgot-password` | Envía código de 6 dígitos al correo vía Mailtrap |
| 2 | VERIFICAR CÓDIGO | POST `/auth/verify-reset-code` | Valida el código recibido en Mailtrap |
| 3 | RESTABLECER CONTRASEÑA | POST `/auth/reset-password` | Cambia la contraseña con el código verificado |

> Abrir Mailtrap Sandbox para copiar el código de 6 dígitos y pegarlo en el Paso 2.

---

### USUARIOS

| Request | Método | Endpoint | Para qué |
|---|---|---|---|
| LISTAR TODOS | GET | `/users` | Ver todos los usuarios del sistema |
| LISTAR POR ID | GET | `/users/2` | Ver un usuario específico |
| LISTAR POR DOCUMENTO | GET | `/users/by-document/1097497002` | Buscar por número de documento |
| CREAR USUARIO | POST | `/users` | Crear usuario desde el admin |
| ACTUALIZAR USUARIO | PUT | `/users/6` | Editar nombre, email u otros datos |
| ELIMINAR USUARIO | DELETE | `/users/6` | Elimina si no tiene tareas activas |
| ELIMINAR FORZOSO | DELETE | `/users/5/force` | Elimina sin importar el estado (requiere motivo) |
| LISTAR TAREAS DE UN USUARIO | GET | `/users/2/tasks` | Ver las tareas asignadas a un usuario |
| CAMBIO DE ROL | PATCH | `/users/2/role` | Cambiar rol: `admin`, `user`, `instructor` |
| CAMBIAR CONTRASEÑA | PATCH | `/users/1/password` | El usuario cambia su propia contraseña |
| DESACTIVAR USUARIO | PATCH | `/users/5/deactivate` | Desactiva sin eliminar (requiere motivo) |
| REACTIVAR USUARIO | PATCH | `/users/5/reactivate` | Vuelve a activar un usuario desactivado |

---

### TAREAS

| Request | Método | Endpoint | Para qué |
|---|---|---|---|
| LISTAR TODAS | GET | `/tasks` | Ver todas las tareas |
| LISTAR POR ID | GET | `/tasks/1` | Ver una tarea específica |
| FILTRAR POR USUARIO | GET | `/tasks/filter?userId=3` | Ver tareas de un usuario específico |
| DASHBOARD | GET | `/tasks/dashboard` | Conteos globales por estado |
| CREAR TAREA | POST | `/tasks` | Crea tarea y la asigna a usuarios |
| CREAR TAREA (sin comment) | POST | `/tasks` | Mismo endpoint — prueba con comment vacío |
| ACTUALIZAR TAREA | PUT | `/tasks/1` | Edita título, descripción, estado |
| ACTUALIZAR CON CALIFICACIÓN | PUT | `/tasks/1` | Instructor pone nota + motivo |
| ACTUALIZAR SOLO ESTADO | PUT | `/tasks/1` | Usuario entrega la tarea |
| ACTUALIZAR — REPROBADA | PUT | `/tasks/1` | Nota < 70 → estado reprobada |
| ACTUALIZAR ESTADO | PATCH | `/tasks/4/status` | Cambia solo el estado |
| ELIMINAR TAREA | DELETE | `/tasks/6` | Elimina permanentemente |
| ASIGNAR USUARIOS | POST | `/tasks/1/assign` | Asigna usuarios a una tarea existente |
| VER USUARIOS ASIGNADOS | GET | `/tasks/1/users` | Lista quién tiene asignada esa tarea |
| QUITAR USUARIO | DELETE | `/tasks/1/users/2` | Elimina a un usuario de la tarea |

**Estados válidos de una tarea:**

| Estado | Quién lo asigna |
|---|---|
| `pendiente` | Estado inicial al crear |
| `en_progreso` | El usuario cuando empieza |
| `pendiente_aprobacion` | El usuario cuando entrega |
| `completada` | El instructor al calificar ≥ 70 |
| `reprobada` | El instructor al calificar < 70 |

---

### RBAC — ROLES Y PERMISOS

| Request | Para qué |
|---|---|
| LOGIN Y VER ROLES EN RESPUESTA | Igual que LOGIN pero imprime en consola los permisos RBAC del usuario |
| CAMBIO DE ROL → instructor | Cambia rol a instructor |
| CAMBIO DE ROL → user | Cambia rol a user |
| CAMBIO DE ROL → admin | Cambia rol a admin |

> En la consola de Postman (View → Show Postman Console) se puede ver el arreglo `roles` completo con los permisos después del login.

---

### CALENDARIO

| Request | Método | Endpoint | Para qué |
|---|---|---|---|
| EVENTOS DEL INSTRUCTOR | GET | `/calendar/instructor` | Ver todos los eventos creados por el instructor |
| EVENTOS DEL USUARIO | GET | `/calendar/usuario` | Ver eventos asignados al estudiante + sus propios |
| CREAR EVENTO PROPIO | POST | `/calendar` | Recordatorio personal (sin estudiante) |
| CREAR EVENTO PARA ESTUDIANTE | POST | `/calendar` | Evento visible en el calendario del estudiante |
| CREAR EVENTO CON TAREA | POST | `/calendar` | Evento vinculado a una tarea específica |
| ELIMINAR EVENTO | DELETE | `/calendar/1` | Solo puede eliminarlo quien lo creó |

**Tipos de evento:**

| tipo | color sugerido | Quién lo ve |
|---|---|---|
| `propio` | `#6366f1` índigo | Solo quien lo creó |
| `estudiante` | `#0ea5e9` celeste | Instructor + el estudiante asignado |

---

### NOTAS PERSONALES

| Request | Método | Endpoint | Para qué |
|---|---|---|---|
| OBTENER NOTAS | GET | `/notes` | Lista las notas del usuario autenticado |
| CREAR NOTA | POST | `/notes` | Crea nota con texto y color pastel |
| CREAR NOTA SIN COLOR | POST | `/notes` | Usa color por defecto (#fef3c7 amarillo) |
| ELIMINAR NOTA | DELETE | `/notes/1` | Solo puede eliminarla el dueño |

**Colores disponibles para notas:**

| Color | Hex |
|---|---|
| Amarillo | `#fef3c7` |
| Rosa | `#fce7f3` |
| Verde | `#d1fae5` |
| Celeste | `#dbeafe` |

---

## Registrar a Karol y Sebastián como admin

Este es el único procedimiento que **no se puede hacer desde el frontend**. Se hace una sola vez al configurar el sistema.

**Paso 1 — Servidor corriendo:** `npm run dev`

**Paso 2 — En Postman, usar el request REGISTER (dos veces):**

```json
// Sebastián
{
  "name": "Sebastian Patiño",
  "documento": "1005331001",
  "email": "sebastian@sena.edu.co",
  "password": "tu_contraseña"
}

// Karol
{
  "name": "Karol Torres",
  "documento": "1097497001",
  "email": "karol@sena.edu.co",
  "password": "tu_contraseña"
}
```

**Paso 3 — En MySQL Workbench**, conectado con `app_user`, ejecutar el bloque final de `database/rbac.sql` (el bloque de `UPDATE users SET role = 'admin'` y el `INSERT INTO user_roles`).

**Paso 4 — Verificar:** hacer LOGIN con las credenciales de Karol o Sebastián y confirmar que la respuesta incluye `"role": "admin"`.

---

## Errores comunes en expo

| Error | Causa más probable | Solución |
|---|---|---|
| `401 Unauthorized` | Token expirado o no hay token | Hacer LOGIN de nuevo |
| `403 Forbidden` | El usuario no tiene permiso para esa acción | Usar cuenta admin |
| `404 Not Found` | El ID en la URL no existe en la BD | Cambiar el ID por uno real |
| `400 Bad Request` | Faltan campos o el formato es incorrecto | Revisar el body del request |
| `Cannot connect` | El servidor no está corriendo | `npm run dev` en la terminal |
| Variables en blanco | Entorno no seleccionado | Seleccionar entorno en Postman |
