# Guía de Exposición — Backend (servidor_backend_parejas)

> Guía paso a paso para la exposición del backend ante los instructores del SENA.
> Muestra qué decir y qué abrir en VSCode en cada momento.
> Complementa la guía de exposición del frontend.
>
> **Antes de empezar:** estudiar `md/consultas-sql.md` completo y tener claro el modelo 3FN.

---

## ANTES DE EMPEZAR — Preparación

1. Abrir VSCode con la carpeta `servidor_backend_parejas`.
2. Ejecutar `npm run dev` en la terminal.
3. Verificar en consola:
   - `Servidor escuchando en http://localhost:3000`
   - `Conexión con MySQL establecida correctamente`
4. Tener Postman abierto con la colección y el environment importados.
5. Tener MySQL Workbench (o DBeaver) con las tablas visibles.

**Para la exposición con IP (red local):**
> El backend ya tiene `app.listen(PORT, '0.0.0.0', ...)` — acepta conexiones desde cualquier IP de la red sin cambios adicionales.

---

## PASO 1 — Presentación del backend (2 minutos)

**Decir:**

> "El backend es el servidor que recibe las peticiones del frontend, las procesa y devuelve los datos. Está construido con Node.js y el framework Express. Se conecta a una base de datos MySQL y usa JWT para autenticación segura.
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
  routes/             ← define las URLs y qué middlewares aplica cada una
    auth.routes.js
    users.routes.js
    tasks.routes.js
    calendar.routes.js
    notes.routes.js
    comunicador.routes.js   ← nuevo: módulo comunicador
  middlewares/        ← verifican token, rol, permisos y validan datos
    auth.middleware.js
    authorization.middleware.js
    error.middleware.js
    validator.middleware.js
  controller/         ← extrae datos de req y llama al modelo o servicio
    auth.controller.js
    auth.refresh.controller.js
    users.controller.js
    tasks.controller.js
    calendar.controller.js
    notes.controller.js
    comunicador.controller.js  ← nuevo
    comments.controller.js     ← nuevo: comentarios en tareas
  models/             ← ejecuta queries SQL con pool.query()
    user.model.js
    task.model.js
    calendar.model.js
    notes.model.js
    comunicador.model.js  ← nuevo
    comment.model.js      ← nuevo
  services/           ← lógica de negocio compleja (solo auth)
    auth.service.js
  utils/              ← funciones auxiliares reutilizables

schemas/              ← moldes de validación Zod (fuera de src/)
database/             ← scripts SQL del sistema
  connection.sql      ← crear usuario app_user en MySQL
  schema.sql          ← crear todas las tablas (3FN completa)
  seed.sql            ← insertar roles, permisos y relaciones iniciales
```

**Decir:**

> "El backend sigue una arquitectura en capas. Cada archivo tiene una responsabilidad única: el controlador extrae datos del request, el modelo ejecuta el SQL, el servicio coordina la lógica de negocio compleja. Ningún archivo salta capas."

---

### 2.2 — Mostrar `app.js`

**Hacer:** Abrir `src/app.js`.

**Decir:**

> "Este es el punto de entrada del servidor. Configura los middlewares globales (CORS, parseo de JSON), registra las rutas de cada módulo bajo su prefijo, y aplica el middleware `verifyToken` a todas las rutas protegidas. Las rutas públicas como `/api/auth` no tienen verifyToken — el login y registro no necesitan token. Todas las demás sí lo tienen.
>
> Noten que el servidor escucha en `0.0.0.0` — esto es importante para la exposición: significa que acepta conexiones desde cualquier IP de la red, no solo desde localhost. Así los compañeros pueden conectarse desde sus celulares."

---

### 2.3 — Mostrar `db.connection.js`

**Hacer:** Abrir `src/database/db.connection.js`.

**Decir:**

> "Este archivo configura el pool de conexiones a MySQL. Un pool mantiene varias conexiones abiertas y las reutiliza — abrir una conexión nueva por cada query sería muy costoso. El pool tiene máximo 10 conexiones simultáneas. Al arrancar el servidor, intenta obtener una conexión inmediatamente — si las credenciales del .env son incorrectas, el error aparece en consola de inmediato."

---

### 2.4 — Mostrar `auth.controller.js`

**Hacer:** Abrir `src/controller/auth.controller.js`. Navegar a la función `login`.

**Decir:**

> "Un controlador recibe `req` y `res`, extrae los datos que necesita y llama al servicio o modelo. Este es el controlador de login: saca el email y la contraseña de `req.body`, llama a `loginService`, y si el resultado es null responde 401. Si tiene resultado, responde con `successResponse`.
>
> Noten que el controlador está envuelto en `catchAsync` — eso elimina el try/catch repetitivo. Si cualquier función interna lanza un error, catchAsync lo captura y lo pasa al errorMiddleware."

---

### 2.5 — Explicar cómo se construye el JWT

**Hacer:** Mostrar `src/services/auth.service.js` y `src/models/user.model.js` en paralelo.

**Decir:**

> "Al hacer login, el servicio hace dos consultas: primero obtiene los permisos nativos del rol primario del usuario desde `role_permissions`. Después obtiene los permisos extra que el admin le asignó en `user_extra_permissions`. Combina los dos arrays y los incluye en el payload del JWT.
>
> Esto es clave: el frontend recibe en el token TODOS los permisos del usuario — tanto los de su rol principal como los de sus roles adicionales. El frontend los usa para mostrar o esconder secciones en el sidebar sin tener que consultar la BD en cada clic."

---

### 2.6 — Mostrar `authorization.middleware.js`

**Hacer:** Abrir `src/middlewares/authorization.middleware.js`.

**Decir:**

> "Este middleware verifica que el usuario tenga el permiso necesario para acceder a un endpoint. Por ejemplo, el endpoint `POST /api/tasks` requiere el permiso `tasks.create`. El middleware lee el array de permisos del JWT y verifica que `tasks.create` esté incluido. Si no está, responde 403 Forbidden — la petición no llega al controlador."

---

### 2.7 — Mostrar un modelo — `task.model.js`

**Hacer:** Abrir `src/models/task.model.js`. Señalar alguna función de asignación.

**Decir:**

> "Un modelo ejecuta queries SQL con `pool.query()`. Nunca conoce `req` ni `res`. La tabla pivote `task_users` reemplaza la columna JSON que teníamos antes. Para asignar una tarea, el modelo hace INSERT en `task_users` con una fila por cada estudiante. Guarda también el `user_name_snapshot` — el nombre del estudiante en ese momento — para preservar el historial aunque la cuenta sea eliminada después."

---

## PASO 3 — Demo con Postman (8 minutos)

> *Cambiar a Postman. Environment seleccionado.*

### 3.1 — Login

**Hacer:** Ejecutar `POST /api/auth/login` con `{ "email": "admin@mail.com", "password": "Admin123!" }`

**Decir:**

> "La respuesta tiene `success: true`, un mensaje descriptivo y los datos. Los datos incluyen el accessToken (dura 1 hora), el refreshToken (dura 7 días), y los datos básicos del usuario con su rol y sus permisos. El environment de Postman guarda el accessToken automáticamente."

**Hacer:** Mostrar el token decodificado — copiar el accessToken y pegarlo en jwt.io.

**Decir:**

> "El payload del token tiene: `userId`, `role` (rol primario), y `permisos` (array con TODOS los permisos: nativos del rol + extras de roles adicionales). El servidor firma este token con su clave secreta — si alguien lo modifica, la firma no coincide y el servidor lo rechaza."

---

### 3.2 — Petición protegida — listar usuarios

**Hacer:** Ejecutar `GET /api/users` con el token.

**Decir:**

> "Esta ruta requiere el permiso `users.view`. Postman envía el token en el header `Authorization: Bearer [token]`. El middleware `verifyToken` lo decodifica y el middleware de autorización verifica que el usuario tiene `users.view` en su array de permisos."

---

### 3.3 — Validación con Zod

**Hacer:** Intentar crear una tarea con `POST /api/tasks` con body vacío `{}`.

**Decir:**

> "Cuando el body no cumple el schema Zod, el servidor responde 400 con el detalle de cada campo inválido. El controlador `createTask` nunca se ejecutó — el middleware `validateSchema` cortó la petición antes."

---

### 3.4 — Error de autenticación

**Hacer:** Cambiar el token por `Bearer token_invalido`. Ejecutar `GET /api/tasks`.

**Decir:**

> "Con un token inválido, `jwt.verify()` lanza un error. El middleware `verifyToken` lo captura y responde 401 'Token inválido'. La petición no llega al controlador."

---

### 3.5 — Endpoint de permisos del usuario

**Hacer:** Ejecutar `GET /api/users/me/permisos` o similar.

**Decir:**

> "Este endpoint devuelve los permisos actuales del usuario autenticado — combinando los nativos del rol y los extras. Es lo que el frontend recibe al hacer login para adaptar la interfaz."

---

## PASO 4 — Base de datos en Workbench (5 minutos)

> *Cambiar a MySQL Workbench o DBeaver.*

**Hacer:** Ejecutar cada consulta una por una. Ver `md/consultas-sql.md` para las consultas completas.

### Consulta 1 — Ver los permisos de cada rol (demostrar que está en BD, no hardcodeado)
```sql
SELECT r.name AS rol, GROUP_CONCAT(p.code ORDER BY p.code SEPARATOR ', ') AS permisos
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p        ON p.id       = rp.permission_id
GROUP BY r.name
ORDER BY r.name;
```

**Decir:**

> "Esta consulta demuestra que los permisos están en la base de datos, no hardcodeados en el código. Si queremos agregar un nuevo permiso o cambiar los permisos de un rol, lo hacemos con un INSERT o DELETE en la BD — sin tocar JavaScript."

### Consulta 2 — Ver tareas con estudiantes asignados (tabla pivote)
```sql
SELECT t.id, t.title, t.status, t.grade,
       GROUP_CONCAT(tu.user_name_snapshot SEPARATOR ', ') AS estudiantes
FROM tasks t
LEFT JOIN task_users tu ON tu.task_id = t.id
GROUP BY t.id
ORDER BY t.created_at DESC;
```

**Decir:**

> "Aquí vemos la diferencia con el sábado pasado. Antes teníamos una columna `assigned_users` con un arreglo JSON — eso violaba la 1FN. Ahora tenemos la tabla pivote `task_users` con una fila por cada combinación tarea-estudiante. Podemos hacer JOINs reales y el SQL es eficiente."

### Consulta 3 — Ver usuarios con todos sus roles
```sql
SELECT u.id, u.name, u.role AS rol_primario,
       GROUP_CONCAT(r.name SEPARATOR ', ') AS todos_los_roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r       ON r.id       = ur.role_id
WHERE u.deleted_at IS NULL
GROUP BY u.id;
```

**Decir:**

> "Un usuario puede tener múltiples roles — su rol primario determina qué vista SPA ve, y los roles adicionales en `user_roles` determinan qué permisos extras tiene. La tabla pivote `user_roles` permite esto con una fila por cada combinación usuario-rol."

---

## PASO 5 — Flujo de código de una función compleja (3 minutos)

> *Elegir uno según lo que el instructor pregunte.*

### Opción A — Flujo del login (4 archivos encadenados)

**Hacer:** Abrir en pestañas: `auth.routes.js`, `auth.controller.js`, `auth.service.js`, `user.model.js`.

**Decir:**

> "Cuando llega `POST /api/auth/login`: la ruta lo pasa al controlador. El controlador extrae email y password del body y llama al loginService. El servicio llama al modelo para buscar el usuario por email. Si existe y está activo, bcrypt.compare() verifica la contraseña. Si coincide, el servicio obtiene los permisos nativos del rol y los permisos extra del usuario, construye el JWT con todos esos datos y lo retorna. El controlador responde con successResponse."

### Opción B — Flujo de desactivación de usuario

**Hacer:** Abrir `users.controller.js` función `deactivateUser`.

**Decir:**

> "Al desactivar un usuario: el middleware verifica que tiene el permiso `users.deactivate`. El controlador verifica que el usuario existe y que no es él mismo. El modelo hace `UPDATE users SET is_active = 0, deactivation_reason = ?, deactivation_date = NOW()`. El usuario queda en la BD pero bloqueado — el loginService detecta `is_active = 0` y lanza el error ACCOUNT_DISABLED."

### Opción C — Flujo del soft delete vs force delete

**Hacer:** Abrir `users.controller.js` comparando `deleteUser` vs `forceDeleteUser`.

**Decir:**

> "Hay dos tipos de eliminación. El soft delete hace `UPDATE users SET deleted_at = NOW()` — el usuario desaparece de las vistas pero existe en BD. El frontend de administración tiene una sección 'Usuarios eliminados' donde puede recuperarlo dentro de 30 días. El force delete hace `DELETE FROM users` — las FK con CASCADE eliminan todo lo relacionado. Las FK con SET NULL en task_users y task_comments dejan NULL el user_id pero preservan el snapshot del nombre — el historial de tareas y comentarios no se pierde."

---

## PASO 6 — Conclusiones del backend (2 minutos)

**Decir:**

> "El backend del Sistema de Gestión de Tareas implementa:
>
> - **RBAC completo**: roles y permisos en base de datos, JWTs con permisos incluidos, middleware de autorización por permiso específico
> - **3FN real**: tablas pivote para todas las relaciones N:M — role_permissions, user_roles, user_extra_permissions, task_users
> - **Autenticación segura**: JWT con accessToken de 1 hora y refreshToken de 7 días, bcrypt para contraseñas
> - **Soft delete recuperable**: usuarios eliminados preservados 30 días con posibilidad de recuperación
> - **Historial preservado**: user_name_snapshot en task_users y task_comments mantiene el historial aunque la cuenta sea eliminada
> - **Manejo de errores**: catchAsync + errorMiddleware con formato de respuesta estándar en toda la API
> - **Validación**: Zod schemas separados de la lógica — si el body no cumple el schema, el controlador nunca se ejecuta
>
> Cada decisión de diseño tiene una razón. Estamos listos para responder cualquier pregunta."

---

## Checklist final antes de la exposición del backend

- [ ] `npm run dev` corriendo — ver mensaje de conexión en consola
- [ ] MySQL Workbench conectado como `app_user` con datos de prueba
- [ ] Postman con colección y environment cargados, token de admin guardado
- [ ] VSCode con pestañas listas: `app.js`, `auth.controller.js`, `auth.service.js`, `authorization.middleware.js`, `task.model.js`
- [ ] `md/consultas-sql.md` a mano para las consultas de demostración
- [ ] El backend escucha en `0.0.0.0` — verificar en `app.js`
