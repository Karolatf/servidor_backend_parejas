# Guía de Exposición — Backend (servidor_backend_parejas)

> Guía paso a paso para la exposición del backend ante los instructores del SENA.
> Muestra qué decir y qué abrir en VSCode en cada momento.
> Complementa la guía de exposición del frontend.

---

## ANTES DE EMPEZAR — Preparación

**Verificar que esté corriendo:**
1. Abrir VSCode con la carpeta `servidor_backend_parejas`.
2. Abrir la terminal y ejecutar: `npm run dev`
3. Verificar que en consola aparezca:
   - `Servidor escuchando en http://localhost:3000`
   - `Conexión con MySQL establecida correctamente`
4. Tener Postman abierto con la colección y el environment importados.
5. Tener MySQL Workbench (o DBeaver) listo para mostrar las tablas.

---

## PASO 1 — Presentación del backend (2 minutos)

> *Tener VSCode con el explorador de archivos visible a la izquierda.*

**Decir:**

> "El backend es el servidor que recibe las peticiones del frontend, las procesa y devuelve los datos. Está construido con **Node.js** y el framework **Express**. Se conecta a una base de datos **MySQL** y usa **JWT** para autenticación segura.
>
> Las tecnologías principales son: Express para el servidor HTTP, mysql2 para conectarse a MySQL, jsonwebtoken para los tokens de sesión, bcryptjs para hashear contraseñas, Zod para validar los datos de entrada, y nodemailer con Mailtrap para el envío de emails de recuperación de contraseña."

---

## PASO 2 — Arquitectura en capas (5 minutos)

### 2.1 — Mostrar la estructura de carpetas

**Hacer:** Señalar el árbol de archivos en VSCode Explorer.

```
src/
  app.js              ← punto de entrada — configura Express y registra las rutas
  database/
    db.connection.js  ← pool de conexiones reutilizables a MySQL
  routes/             ← define las URLs y sus middlewares
  middlewares/        ← verifican token, rol, permisos y validan datos
  controller/         ← extrae datos de req y llama al modelo o servicio
  services/           ← lógica de negocio (solo para auth)
  models/             ← ejecuta queries SQL con pool.query()
  utils/              ← funciones auxiliares reutilizables

schemas/              ← moldes de validación Zod (fuera de src/)
```

**Decir:**

> "El backend sigue una arquitectura en capas. Cada archivo tiene una responsabilidad única y no puede saltar capas — el controlador nunca accede directamente a MySQL, y el modelo nunca conoce `req` ni `res`. Esto hace el código fácil de mantener y de probar."

---

### 2.2 — Mostrar `app.js`

**Hacer:** Abrir `src/app.js`.

**Decir:**

> "Este es el punto de entrada del servidor. Hace cuatro cosas principales: configura los middlewares globales (CORS, parseo de JSON), registra las rutas de cada módulo bajo su prefijo, aplica el middleware `verifyToken` a todas las rutas protegidas y registra el `errorMiddleware` al final para capturar cualquier error.
>
> Las rutas públicas como `/api/auth` no tienen `verifyToken` — el login y el registro no necesitan token. Todas las demás rutas como `/api/tasks`, `/api/users` y `/api/calendar` sí lo tienen."

---

### 2.3 — Mostrar `db.connection.js`

**Hacer:** Abrir `src/database/db.connection.js`.

**Decir:**

> "Este archivo configura el pool de conexiones a MySQL. Un pool mantiene varias conexiones abiertas y las reutiliza en lugar de abrir una nueva conexión por cada query — eso sería muy costoso en tiempo. El pool tiene máximo 10 conexiones simultáneas. Al arrancar el servidor, intenta obtener una conexión inmediatamente — si las credenciales del `.env` son incorrectas, el error aparece en consola de inmediato."

---

### 2.4 — Mostrar un controlador — `auth.controller.js`

**Hacer:** Abrir `src/controller/auth.controller.js`. Navegar a la función `login`.

**Decir:**

> "Un controlador recibe `req` y `res`, extrae los datos que necesita del body o los parámetros, y llama al servicio o modelo correspondiente. Este es el controlador de login: saca el email y la contraseña de `req.body`, llama a `loginService`, y si el resultado es null responde 401. Si tiene resultado, responde con `successResponse` que siempre tiene el mismo formato: `{ success: true, message, data }`.
>
> Noten que el controlador está envuelto en `catchAsync` — eso elimina el `try/catch` repetitivo. Si cualquier función interna lanza un error, `catchAsync` lo captura y lo pasa al `errorMiddleware` automáticamente."

---

### 2.5 — Mostrar un modelo — `user.model.js`

**Hacer:** Abrir `src/models/user.model.js`. Navegar a `getUserByEmail`.

**Decir:**

> "Un modelo ejecuta queries SQL con `pool.query()`. Nunca conoce `req` ni `res`. La función `getUserByEmail` hace un `SELECT` con un placeholder `?` — ese `?` es la forma segura de insertar valores en SQL que previene inyección SQL. `pool.query` retorna `[rows, fields]` y solo tomamos `rows` con desestructuración."

---

### 2.6 — Mostrar la validación con Zod — `user.schema.js`

**Hacer:** Abrir `schemas/user.schema.js`.

**Decir:**

> "Los schemas de Zod definen las reglas que deben cumplir los datos antes de llegar al controlador. `createUserSchema` exige que el documento sea string con solo dígitos, que el nombre tenga letras y espacios, y que el correo tenga formato válido. Si alguna regla falla, el middleware `validateSchema` responde con 400 y el listado de errores — el controlador nunca se ejecuta."

---

## PASO 3 — Demo con Postman (10 minutos)

> *Cambiar a Postman. Tener el environment seleccionado.*

### 3.1 — Login

**Hacer:** Ejecutar `POST /api/auth/login` con `{ "email": "admin@mail.com", "password": "123456" }`

**Decir:**

> "La respuesta tiene `success: true`, un mensaje descriptivo y los datos. Los datos incluyen el `accessToken` que dura 1 hora, el `refreshToken` que dura 7 días, y los datos básicos del usuario con su rol. El environment de Postman guarda el accessToken automáticamente para las peticiones siguientes."

**Hacer:** Mostrar la respuesta JSON. Mostrar el token en el campo `data.accessToken`.

---

### 3.2 — Petición protegida — listar usuarios

**Hacer:** Ejecutar `GET /api/users` (con el token guardado en el environment).

**Decir:**

> "Esta ruta requiere que el usuario sea admin o instructor — si no tiene ese rol, el servidor responde 403. Postman envía el token automáticamente en el header `Authorization: Bearer [token]`. El servidor lo verifica con `jwt.verify()` y, si es válido, permite el acceso."

---

### 3.3 — Validación en acción

**Hacer:** Intentar crear una tarea con `POST /api/tasks` con body vacío `{}`.

**Decir:**

> "Cuando el body no cumple el schema Zod, el servidor responde 400 con el detalle de cada campo inválido — en este caso, el título es obligatorio. El controlador `createTask` nunca se ejecutó — el middleware `validateSchema` cortó la petición antes."

---

### 3.4 — Error de autenticación

**Hacer:** En los headers, cambiar el token por `Bearer token_invalido`. Ejecutar `GET /api/tasks`.

**Decir:**

> "Con un token inválido, `jwt.verify()` lanza un `JsonWebTokenError`. El middleware `verifyToken` lo captura y responde 401 con el mensaje 'Acceso denegado: Token inválido'. La petición no llega al controlador."

---

### 3.5 — Filtrar tareas

**Hacer:** Ejecutar `GET /api/tasks/filter?status=pendiente&userId=3` (con token válido de admin).

**Decir:**

> "El servidor retorna solo las tareas que están en estado 'pendiente' Y tienen al usuario 3 en su lista de asignados. Los dos filtros se aplican en memoria después de obtener todas las tareas de MySQL. Los IDs de `assigned_users` se resuelven a nombres legibles — `assignedUsersDisplay` muestra 'Juan, María' en lugar de '[2, 5]'."

---

## PASO 4 — Mostrar el código de una función clave (5 minutos)

> *Volver a VSCode. Elegir uno de estos según lo que el instructor pregunte.*

### Opción A — Mostrar el flujo completo del login en código

**Hacer:** Abrir los tres archivos en pestañas: `auth.controller.js`, `auth.service.js`, `user.model.js`.

**Decir:**

> "Cuando llega `POST /api/auth/login`: el controlador extrae email y password de `req.body` y llama a `loginService`. El servicio llama a `getUserByEmail` del modelo — ese es el único que toca MySQL. Si el usuario existe y está activo, bcrypt compara la contraseña con el hash guardado. Si coinciden, `jwt.sign()` genera los dos tokens y los retorna. El controlador responde con `successResponse`. Todo el manejo de errores lo hace `catchAsync` + `errorMiddleware`."

---

### Opción B — Mostrar el flujo de desactivación de usuario

**Hacer:** Abrir `controller/users.controller.js` función `deactivateUser` y `models/user.model.js` función `deactivateUser`.

**Decir:**

> "Al desactivar un usuario: primero `requireAdmin` verifica el rol. El controlador verifica que el usuario existe, que no es el mismo admin que hace la petición, y que no tiene tareas activas (pendientes o en progreso) con `countUserActiveTasks`. Si todas las condiciones pasan, el modelo hace `UPDATE users SET is_active = 0, deactivation_reason = ?, deactivation_date = NOW()`. El usuario queda en la BD pero bloqueado — el `loginService` detecta `is_active = 0` y lanza el error `ACCOUNT_DISABLED`."

---

## PASO 5 — Base de datos (3 minutos)

> *Cambiar a MySQL Workbench o DBeaver.*

**Hacer:** Ejecutar las siguientes consultas una por una.

**Consulta 1 — Ver todos los usuarios:**
```sql
SELECT id, name, email, role, is_active
FROM users
ORDER BY role, name;
```

**Consulta 2 — Ver roles y permisos:**
```sql
SELECT r.name AS rol, GROUP_CONCAT(p.code SEPARATOR ', ') AS permisos
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
GROUP BY r.name;
```

**Consulta 3 — Ver tareas con estado y nota:**
```sql
SELECT id, title, status, grade, assigned_users
FROM tasks
ORDER BY created_at DESC;
```

**Decir:**

> "La columna `assigned_users` guarda un arreglo JSON de IDs. El backend la convierte a nombres legibles en memoria cuando responde al frontend. `grade` puede ser null si la tarea aún no fue calificada. El `status` se recalcula automáticamente según la nota."

---

## PASO 6 — Conclusiones del backend (2 minutos)

**Decir:**

> "El backend del Sistema de Gestión de Tareas implementa una arquitectura en capas limpia con Express y MySQL. Los puntos clave son:
>
> - **Autenticación segura**: JWT con accessToken de 1 hora y refreshToken de 7 días, contraseñas hasheadas con bcrypt.
> - **Control de acceso**: RBAC con roles y permisos, middlewares `requireAdmin` y `requireAdminOrInstructor`.
> - **Validación centralizada**: Zod schemas en `schemas/` separados de la lógica, middleware genérico `validateSchema`.
> - **Manejo de errores**: `catchAsync` + `errorMiddleware` con formato de respuesta estándar en toda la API.
> - **Historial de datos**: nombres de usuarios eliminados preservados en `deleted_user_names` para no perder el historial de tareas.
>
> Cada decisión de diseño tiene una razón — estamos listos para responder cualquier pregunta sobre el código."

---

## Checklist final antes de la exposición del backend

- [ ] `npm run dev` corriendo — ver mensaje de conexión a MySQL en consola
- [ ] MySQL Workbench conectado como `app_user` con datos de prueba
- [ ] Postman con la colección y el environment cargados
- [ ] Token de admin guardado en el environment de Postman
- [ ] VSCode con el explorador visible a la izquierda
- [ ] Pestañas listas: `app.js`, `auth.controller.js`, `auth.service.js`, `user.model.js`
- [ ] Archivos de documentación abiertos: `flujos-capas.md` y `preguntas-frecuentes.md`
