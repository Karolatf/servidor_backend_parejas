# Preguntas Frecuentes del Instructor — Backend

> Respuestas preparadas para las preguntas más probables sobre el backend.
> Cada respuesta integra el código real y el proceso exacto del sistema.
> Léelas con el archivo de código abierto en VSCode para poder señalar las líneas.

---

## AUTENTICACIÓN

---

### ¿Cómo funciona el login? ¿Qué pasa cuando un usuario ingresa su correo y contraseña?

**Respuesta:**

> "El login pasa por 5 capas del backend. Primero, la petición `POST /api/auth/login` llega a `app.js`, que la redirige a `authRouter` sin pasar por `verifyToken` — el login es pública, no requiere token. Antes de llegar al controlador, el middleware `validateSchema(loginSchema)` de Zod verifica que el email tenga formato válido y que la contraseña tenga al menos 6 caracteres.
>
> Si Zod pasa, el controlador `login()` en `auth.controller.js` llama a `loginService({ email, password })`. El servicio primero busca el usuario en MySQL con `getUserByEmail(email)` — si el email no existe, retorna null y el controlador responde 401. Si existe, verifica que `is_active === 1` — si el usuario está desactivado, lanza un error con `code: 'ACCOUNT_DISABLED'` que el `errorMiddleware` convierte en un 403.
>
> Si el usuario existe y está activo, `bcrypt.compare(password, usuario.password)` compara la contraseña ingresada con el hash guardado en la BD. Si no coinciden, retorna null y el controlador responde 401. Si coinciden, genera dos tokens con `jwt.sign()`: el accessToken que dura 1 hora y el refreshToken que dura 7 días. Los retorna al cliente junto con los datos básicos del usuario."

**Mostrar:** `src/controller/auth.controller.js` función `login`, y `src/services/auth.service.js` función `loginService`.

---

### ¿Cómo funciona el JWT? ¿Qué contiene el token?

**Respuesta:**

> "JWT es un JSON Web Token — es un string en tres partes separadas por puntos: `header.payload.signature`. El header dice qué algoritmo de firma se usa (HS256). El payload contiene los datos del usuario: `{ id, documento, role, iat, exp }` donde `iat` es cuándo se creó y `exp` es cuándo expira. La signature es el hash de header+payload firmado con nuestra clave secreta `JWT_SECRET`.
>
> El cliente guarda el token en `localStorage` y lo envía en cada petición en el header `Authorization: Bearer [token]`. El servidor lo verifica con `jwt.verify(token, process.env.JWT_SECRET)` — esta función hace dos cosas: verifica que la firma sea correcta (que nadie lo alteró) y que no haya expirado. Si ambas pasan, decodifica el payload y lo pone en `req.usuario`, disponible para todos los controladores."

**Mostrar:** `src/middlewares/auth.middleware.js` función `verifyToken`, líneas del `jwt.verify`.

---

### ¿Qué pasa si el token expira? ¿Se cierra la sesión?

**Respuesta:**

> "Cuando el accessToken expira (después de 1 hora), el servidor responde con 401. El frontend detecta ese 401 y automáticamente usa el refreshToken para solicitar un nuevo accessToken en `POST /api/auth/refresh`. En el backend, el controlador `refreshToken` en `auth.refresh.controller.js` verifica el refreshToken con `jwt.verify(refreshToken, JWT_REFRESH_SECRET)` — si es válido, genera un nuevo accessToken y lo devuelve. El frontend lo guarda en localStorage y repite la petición original sin que el usuario se dé cuenta. Esto se llama Silent Refresh.
>
> Solo si el refreshToken también expira (después de 7 días) o fue invalidado, el sistema cierra la sesión."

**Mostrar:** `src/controller/auth.refresh.controller.js`.

---

### ¿Por qué usan dos tokens (accessToken y refreshToken)?

**Respuesta:**

> "El accessToken es de corta duración (1 hora) por seguridad — si alguien lo intercepta, solo tiene acceso por 1 hora. Pero si el único token durara 1 hora, el usuario tendría que hacer login cada hora, lo que es incómodo. El refreshToken soluciona esto: dura 7 días y solo sirve para obtener nuevos accessTokens, no para acceder a los recursos directamente. Así se balancea seguridad (tokens cortos) con comodidad (no hacer login cada hora)."

---

### ¿Cómo se hashea la contraseña? ¿Se puede recuperar?

**Respuesta:**

> "Se usa `bcrypt.hash(password, SALT_ROUNDS)` con `SALT_ROUNDS = 10`. Bcrypt es unidireccional — no se puede revertir el hash para obtener la contraseña original. Cuando el usuario hace login, `bcrypt.compare(passwordIngresada, hashGuardado)` aplica el mismo proceso al password ingresado y compara el resultado con el hash almacenado. Si coinciden, las contraseñas son iguales. Nunca se almacena la contraseña en texto plano en la BD."

**Mostrar:** `src/services/auth.service.js` función `hashearPassword` y la llamada a `bcrypt.compare` en `loginService`.

---

### ¿Cómo funciona la recuperación de contraseña?

**Respuesta:**

> "Tiene tres pasos. En el paso 1, el usuario envía su email y el backend verifica que existe en la BD. Si existe, llama a `guardarCodigo(email)` de `utils/resetCodes.js` — genera un número aleatorio de 6 dígitos con `Math.floor(100000 + Math.random() * 900000)` y lo guarda en un `Map` en memoria con un TTL de 15 minutos. Luego envía el código por email con Mailtrap.
>
> En el paso 2, el usuario envía el código. `verificarCodigo(email, code)` busca la entrada en el Map, verifica que no expiró (`Date.now() > expiresAt`) y que el código coincide. Si todo es correcto, marca `verified: true` en el Map.
>
> En el paso 3, el usuario envía la nueva contraseña. `codigoEsVerificado(email)` verifica que pasó el paso 2. Si es así, hashea la nueva contraseña con bcrypt, actualiza la BD y borra la entrada del Map para que el código no pueda usarse de nuevo."

**Mostrar:** `src/utils/resetCodes.js` funciones `guardarCodigo`, `verificarCodigo` y `codigoEsVerificado`.

---

## CONTROL DE ACCESO

---

### ¿Cómo se controla quién puede hacer qué? ¿Cómo sabe el servidor que soy admin?

**Respuesta:**

> "El sistema tiene dos niveles de control. El primero es el campo `role` en la tabla `users` — puede ser `'admin'`, `'instructor'` o `'user'`. Este campo se incluye en el payload del JWT cuando se hace login, así que `req.usuario.role` siempre está disponible.
>
> En las rutas protegidas, antes del controlador se aplican middlewares de rol. Por ejemplo, en `DELETE /api/users/:id`, la ruta tiene `requireAdmin` — este middleware verifica que `req.usuario.role === 'admin'`. Si no es admin, responde 403 sin llegar al controlador.
>
> El segundo nivel es el sistema RBAC con las tablas `user_roles`, `roles`, `permissions` y `role_permissions`. Permite verificar permisos específicos como `tasks.create` o `users.delete` con el middleware `checkPermission` en `authorization.middleware.js`."

**Mostrar:** `src/middlewares/auth.middleware.js` funciones `requireAdmin` y `requireAdminOrInstructor`.

---

### ¿Qué es el RBAC y cómo está implementado?

**Respuesta:**

> "RBAC es Role-Based Access Control — control de acceso basado en roles. En la BD tenemos 4 tablas: `roles` (admin, instructor, user), `permissions` (tasks.create, users.delete, etc.), `role_permissions` (qué permisos tiene cada rol) y `user_roles` (qué rol tiene cada usuario).
>
> La función `getUserRolesAndPermissions(userId)` en `user.model.js` hace un JOIN de esas 4 tablas y retorna un arreglo como `[{ name: 'admin', permissions: ['tasks.create', 'users.delete', ...] }]`. El middleware `checkPermission('tasks.create')` verifica si el usuario autenticado tiene ese permiso antes de continuar."

**Mostrar:** `src/models/user.model.js` función `getUserRolesAndPermissions`, y el JOIN SQL.

---

## TAREAS

---

### ¿Cómo funciona el filtro de tareas?

**Respuesta:**

> "El endpoint `GET /api/tasks/filter` acepta dos parámetros de query: `?status=pendiente` y `?userId=3`. En el controlador `filterTasks()` se extraen con `req.query`. Luego llama a `filterTasksModel({ status, userId })` en el modelo.
>
> El modelo primero llama a `getAllTasks()` que obtiene TODAS las tareas de MySQL y resuelve los IDs de `assigned_users` a nombres legibles. Luego aplica los filtros secuencialmente: si llegó `status`, conserva solo las tareas con ese estado exacto. Si llegó `userId`, filtra usando `tarea.assignedUsers.includes(Number(userId))` — verifica si ese ID está en el arreglo. El resultado puede combinar ambos filtros."

**Mostrar:** `src/models/task.model.js` función `filterTasks` y `getAllTasks`.

---

### ¿Cómo se asignan tareas a varios usuarios a la vez?

**Respuesta:**

> "La columna `assigned_users` en la tabla `tasks` es de tipo `JSON` — guarda un arreglo de IDs como `[1, 2, 5]`. Esto permite asignar una tarea a N usuarios sin necesitar una tabla de unión separada.
>
> Cuando se asignan usuarios con `POST /api/tasks/:taskId/assign`, el modelo `assignUsersToTask(taskId, userIds)` obtiene los usuarios actuales de la tarea, los combina con los nuevos usando `[...new Set([...actuales, ...nuevos.map(Number)])]` — el `Set` elimina duplicados automáticamente — y actualiza la columna con el arreglo combinado serializado como JSON. Para filtrar tareas de un usuario, el modelo usa `JSON_CONTAINS(assigned_users, CAST(userId AS JSON), '$')` en MySQL."

**Mostrar:** `src/models/task.model.js` funciones `assignUsersToTask` y `createTask` (la parte de `serializarUsuarios`).

---

### ¿Cómo funciona la calificación de tareas? ¿Por qué el estado cambia automáticamente?

**Respuesta:**

> "Cuando el instructor envía `{ grade: 85 }` en `PUT /api/tasks/:id`, el modelo `updateTask()` detecta que llegó el campo `grade`. Automáticamente calcula el nuevo estado: si `grade >= 70`, el estado pasa a `'completada'`; si `grade < 70`, pasa a `'reprobada'`. Esto se hace en el modelo, no en el controlador, para garantizar que la BD nunca quede en un estado inconsistente — por ejemplo, una nota de 100 con estado `'reprobada'`.
>
> Al leer las tareas, `formatearTarea()` también recalcula el estado basándose en la nota guardada en la BD, así si alguien modificó el estado directamente en la BD, la lectura siempre devuelve el estado correcto."

**Mostrar:** `src/models/task.model.js` función `updateTask`, las líneas del `grade` y el recálculo de `status`.

---

### ¿Qué pasa con las tareas cuando se elimina un usuario?

**Respuesta:**

> "El backend preserva el historial. Cuando se elimina un usuario, antes de borrarlo se llama a `registrarNombreUsuarioEliminado(userId, userName)` que busca todas las tareas que tienen ese userId en `assigned_users` y guarda el nombre en la columna `deleted_user_names` (un mapa JSON `{ '7': 'Ana López' }`). Así, cuando el frontend muestra las tareas, puede mostrar `'Ana López (eliminada)'` en lugar de un ID sin nombre.
>
> Después de enviar la respuesta al cliente, `setImmediate()` ejecuta en background la actualización de `assigned_users` para remover el ID del usuario eliminado. Usamos `setImmediate` para no hacer esperar al cliente — la respuesta ya fue enviada y la limpieza ocurre en el fondo."

**Mostrar:** `src/models/task.model.js` función `registrarNombreUsuarioEliminado`, y `src/controller/users.controller.js` el bloque de `setImmediate`.

---

## ARQUITECTURA

---

### ¿Cómo está organizado el backend? ¿Qué hace cada carpeta?

**Respuesta:**

> "El backend sigue una arquitectura en 5 capas. `routes/` define las URLs y los middlewares que aplican — no tiene lógica. `middlewares/` tiene las funciones de verificación (token, rol, Zod). `controller/` extrae datos de `req` y llama al servicio o modelo. `services/` tiene la lógica de negocio compleja (solo para auth). `models/` interactúa con MySQL usando `pool.query()`. Ninguna capa salta a otra — el controlador no habla directamente con MySQL, y el modelo no conoce `req` ni `res`."

**Mostrar:** El árbol de carpetas en VSCode Explorer.

---

### ¿Qué es un middleware? ¿Cómo funciona `next()`?

**Respuesta:**

> "Un middleware es una función con tres parámetros: `req`, `res` y `next`. Se ejecuta en la cadena de petición antes de que llegue al controlador final. Si todo es correcto, llama a `next()` para pasar al siguiente middleware o al controlador. Si hay un error, puede llamar a `next(error)` para saltar al `errorMiddleware`, o responder directamente con `res.status().json()`.
>
> En `app.js` registramos middlewares globales como `express.json()` y `verifyToken`. En las rutas locales los aplicamos por endpoint, como `requireAdmin` o `validateSchema(createTaskSchema)`. Express los ejecuta en el orden en que están registrados."

**Mostrar:** `src/middlewares/auth.middleware.js` función `verifyToken`, señalar el `next()` al final.

---

### ¿Qué es `catchAsync` y por qué lo usan?

**Respuesta:**

> "Sin `catchAsync`, cada controlador async necesitaría su propio `try/catch` para capturar errores — eso es código repetitivo en cada función. `catchAsync` es un wrapper que recibe una función async y la envuelve en un `try/catch`. Si el código lanza un error, lo pasa automáticamente a `next(error)`, que lo manda al `errorMiddleware`. Así los controladores quedan limpios — solo tienen la lógica de negocio sin el manejo de errores repetitivo."

**Mostrar:** `src/utils/catchAsync.js` — es muy corto y claro.

---

### ¿Cómo manejan los errores? ¿Qué es el `errorMiddleware`?

**Respuesta:**

> "Cuando un controlador lanza un error (por ejemplo con `throw` o porque una promesa falló), `catchAsync` lo pasa a `next(error)`. Express detecta que el middleware tiene exactamente 4 parámetros `(error, req, res, next)` y lo redirige al `errorMiddleware` en `error.middleware.js`. Este middleware lee el `error.status` y el `error.message`, y responde con el formato estándar `{ success: false, message, data: null }`. Si el error tiene `code: 'ACCOUNT_DISABLED'`, responde con 403 específicamente. Si no hay `error.status`, usa 500 como defecto."

**Mostrar:** `src/middlewares/error.middleware.js` completo.

---

### ¿Qué es el pool de conexiones? ¿Por qué no abren una conexión nueva por cada query?

**Respuesta:**

> "Abrir una conexión TCP a MySQL toma tiempo — varios milisegundos de handshake, autenticación, etc. Si cada query abriera una conexión nueva y la cerrara, con muchos usuarios simultáneos el servidor sería muy lento. El pool mantiene un máximo de 10 conexiones abiertas y las reutiliza — cuando un modelo necesita hacer una query, toma una conexión libre del pool, la usa y la devuelve. Configurado en `database/db.connection.js` con `waitForConnections: true` para que las peticiones esperen si el pool está lleno en lugar de fallar."

**Mostrar:** `src/database/db.connection.js`, señalar `connectionLimit: 10` y `waitForConnections: true`.

---

## BASE DE DATOS

---

### ¿Por qué guardan los usuarios asignados como JSON en la tabla tasks y no con una tabla aparte?

**Respuesta:**

> "Con una tabla de unión `task_users` (patrón tradicional Many-to-Many), cada asignación sería una fila: `{ task_id: 1, user_id: 2 }`, `{ task_id: 1, user_id: 5 }`, etc. Para este proyecto, usar una columna `assigned_users` de tipo JSON con un arreglo de IDs simplifica las queries y el código. MySQL soporta el tipo JSON nativamente y tiene funciones como `JSON_CONTAINS()` para buscar dentro del arreglo. La desventaja es que no hay foreign key constraint — el backend tiene que verificar en código que los IDs existan."

---

### ¿Cómo se previene la inyección SQL en este proyecto?

**Respuesta:**

> "Usando placeholders `?` en todas las queries de `mysql2`. En lugar de concatenar strings como `'SELECT * FROM users WHERE email = ' + email`, usamos `pool.query('SELECT * FROM users WHERE email = ?', [email])`. mysql2 se encarga de escapar el valor — si alguien envía `email = "'; DROP TABLE users;--"`, mysql2 lo escapa y lo convierte en un string literal inofensivo. Ninguna query en el proyecto construye SQL por concatenación."

**Mostrar:** Cualquier función de `src/models/user.model.js` — señalar los `?` y el arreglo de valores.

---

### ¿Para qué sirven las tablas `roles`, `permissions`, `user_roles` y `role_permissions`?

**Respuesta:**

> "Son las tablas del sistema RBAC. `roles` tiene los tres roles del sistema (admin, instructor, user). `permissions` tiene los códigos de permiso como `tasks.create`, `users.delete`, `calendar.manage`. `role_permissions` es la tabla de unión que dice qué permisos tiene cada rol — por ejemplo, el instructor tiene `tasks.create` pero no `users.delete`. `user_roles` vincula cada usuario con su rol en el sistema RBAC.
>
> Se puede mostrar todo esto con la consulta SQL del archivo `consultas-sql.md` — la que hace JOIN de las 4 tablas con `GROUP_CONCAT`."

---

### ¿Por qué recalculan el `AUTO_INCREMENT` después de eliminar un usuario?

**Respuesta:**

> "MySQL por defecto reutiliza los IDs de las filas eliminadas cuando el contador de AUTO_INCREMENT llega al fin. Si el usuario con id 7 fue eliminado y luego se crea un usuario nuevo, MySQL le asigna el id 8 (siguiente al máximo actual). Pero si se eliminan usuarios del final (ej. el usuario 10 es el último y se elimina), MySQL podría reutilizar el id 10. En este sistema, un usuario eliminado puede tener su nombre guardado en `deleted_user_names` de las tareas. Si se reutilizara el ID, el nuevo usuario heredaría esa asociación histórica falsamente. Por eso recalculamos `AUTO_INCREMENT = MAX(id) + 1` después de cada eliminación."

---

## VALIDACIONES

---

### ¿Cómo funciona la validación con Zod? ¿Qué pasa si llegan datos incorrectos?

**Respuesta:**

> "Zod define schemas — moldes que describen qué campos se esperan, qué tipo deben ser y qué restricciones tienen. Por ejemplo, `createUserSchema` exige que `documento` sea string con solo dígitos y mínimo 5 caracteres. El middleware `validateSchema(createUserSchema)` llama a `schema.safeParse(req.body)` — si la validación falla, retorna un objeto `{ success: false, error }` con los errores de cada campo. El middleware extrae esos errores y responde con 400 antes de que la petición llegue al controlador. Si pasa, llama a `next()` y la petición continúa."

**Mostrar:** `src/middlewares/validator.middleware.js` y `schemas/user.schema.js`.

---

### ¿Por qué las validaciones están en archivos separados (`schemas/`) y no en los controladores?

**Respuesta:**

> "Separar los schemas de validación en `schemas/` es el principio de responsabilidad única. El controlador solo debería preocuparse por extraer datos y llamar servicios — no por validar. Si las validaciones estuvieran en el controlador, el archivo crecería con código mezclado. Con schemas separados, si cambian las reglas de validación (por ejemplo, el documento pasa de mínimo 5 a mínimo 8 dígitos), solo se cambia `user.schema.js` sin tocar el controlador. Además, el mismo schema puede reutilizarse en diferentes rutas."

---

## EMAIL Y MAILTRAP

---

### ¿Cómo funciona el envío de emails en el proyecto?

**Respuesta:**

> "El servicio de email está en `services/email.service.js`. Se usa `nodemailer` — una librería de Node.js para enviar emails. Primero se crea un `transporter` con la configuración SMTP de Mailtrap (host, puerto, usuario y contraseña del `.env`). Luego se define el `mailOptions` con el `from` (remitente), el `to` (destinatario), el `subject` (asunto) y el `html` (cuerpo del email). Finalmente `transporter.sendMail(mailOptions)` envía el email.
>
> Mailtrap es un servicio de testing — intercepta todos los emails y los muestra en un buzón online en lugar de enviarlos realmente. Así podemos probar el flujo sin necesitar un servidor de correo real."

**Mostrar:** `src/services/email.service.js` completo — es corto y claro.

---

## PREGUNTAS SOBRE EL PROCESO DE DESARROLLO

---

### ¿En qué orden construyeron el backend?

**Respuesta:**

> "Primero la configuración base: `app.js`, `db.connection.js` con el pool de MySQL y la estructura de carpetas. Luego la base de datos: `schema.sql` para las tablas y `rbac.sql` para los roles y permisos.
>
> Después el sistema de autenticación: models y services de auth (login, register, hash de passwords, JWT). Luego los middlewares: `verifyToken`, `requireAdmin`, `validateSchema`.
>
> Después los módulos de negocio en este orden: usuarios (CRUD), tareas (CRUD + filtros + asignación), calendario y notas. Cada módulo siguió el mismo patrón: schema Zod → model → service si aplica → controller → routes."

---

### ¿Qué es REST y cómo lo aplican en este proyecto?

**Respuesta:**

> "REST es un estilo de arquitectura para APIs HTTP donde cada recurso tiene una URL y se usan los métodos HTTP para indicar la operación. En este proyecto: `GET /api/tasks` lee, `POST /api/tasks` crea, `PUT /api/tasks/:id` actualiza todo, `PATCH /api/tasks/:id/status` actualiza parcialmente y `DELETE /api/tasks/:id` elimina. Las URLs representan recursos (tareas, usuarios, eventos) y los métodos HTTP representan las acciones sobre esos recursos."

---

### ¿Qué es CORS y por qué lo configuraron?

**Respuesta:**

> "CORS es Cross-Origin Resource Sharing — una política de seguridad del navegador. Por defecto, el navegador bloquea las peticiones JavaScript de un dominio a otro (por ejemplo, de `localhost:5173` a `localhost:3000`). Sin `app.use(cors())` en el backend, el frontend no podría hacer ninguna petición al servidor y recibiría un error de 'cross-origin' en la consola del navegador. `cors()` agrega los headers HTTP necesarios para que el navegador permita esas peticiones."

**Mostrar:** `src/app.js` — la línea `app.use(cors())`.
