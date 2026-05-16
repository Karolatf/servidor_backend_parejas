# Glosario de Términos — Backend (servidor_backend_parejas)

> Referencia rápida de todos los conceptos técnicos usados en el backend.
> Organizados por categoría para encontrarlos fácilmente.

---

## Arquitectura y estructura

| Término | Definición |
|---|---|
| **Express** | Framework de Node.js que crea el servidor HTTP. Registra rutas, aplica middlewares y escucha peticiones en un puerto. |
| **Router** | Objeto de Express que agrupa rutas relacionadas en un módulo separado. Cada módulo de rutas (`tasks.routes.js`, `users.routes.js`, etc.) exporta un Router que se monta en `app.js`. |
| **Middleware** | Función con acceso a `req`, `res` y `next`. Se ejecuta entre la petición y el controlador. Ejemplos: `verifyToken`, `validateSchema`, `errorMiddleware`. |
| **Controlador (controller)** | Función que recibe `req` y `res`, extrae los datos que necesita y delega la lógica al servicio. No accede a la BD directamente. |
| **Servicio (service)** | Capa con la lógica de negocio. No conoce `req` ni `res`. Recibe datos simples y retorna resultados. Ejemplo: `loginService({ email, password })`. |
| **Modelo (model)** | Capa que interactúa con MySQL. Solo ejecuta queries SQL. No conoce Express ni la lógica de negocio. Ejemplo: `getUserByEmail(email)`. |
| **Pool de conexiones** | Conjunto de conexiones reutilizables a MySQL. En lugar de abrir una conexión nueva por cada query (costoso), el pool las mantiene abiertas y las reutiliza. Configurado con máximo 10 conexiones. |
| **Capas del backend** | El orden es: `routes` → `middlewares` → `controllers` → `services` → `models` → `MySQL`. Cada capa solo habla con la siguiente. |

---

## Autenticación y seguridad

| Término | Definición |
|---|---|
| **JWT (JSON Web Token)** | Estándar para crear tokens firmados digitalmente. Contiene un `payload` (id, rol, expiración) y una firma que el servidor puede verificar. No se puede alterar sin conocer el secreto. |
| **accessToken** | Token JWT de corta duración (1 hora). Se envía en el header `Authorization: Bearer [token]` en cada petición protegida. |
| **refreshToken** | Token JWT de larga duración (7 días). Se usa para obtener un nuevo accessToken cuando el anterior expira, sin hacer login de nuevo. |
| **Bearer** | Prefijo del header de autenticación: `Authorization: Bearer eyJhbGci...`. El servidor extrae el token cortando por el espacio con `split(' ')[1]`. |
| **JWT_SECRET** | Clave secreta del `.env` usada para firmar y verificar accessTokens con `jwt.sign()` y `jwt.verify()`. Si alguien la conoce, puede fabricar tokens. |
| **JWT_REFRESH_SECRET** | Clave secreta del `.env` para firmar y verificar refreshTokens. Es distinta de `JWT_SECRET` para que un token no sirva para el otro. |
| **bcrypt** | Algoritmo para hashear contraseñas. Es unidireccional (no se puede revertir). Usa `SALT_ROUNDS = 10` para hacer el hash más lento y resistente a ataques de fuerza bruta. |
| **SALT_ROUNDS** | Número de iteraciones del algoritmo bcrypt (10 en este proyecto). A mayor número, más seguro pero más lento. 10 es el estándar recomendado. |
| **hash** | Resultado de pasar una contraseña por bcrypt. Ejemplo: `$2b$10$...`. Se guarda en la BD en lugar de la contraseña real. `bcrypt.compare()` compara la contraseña ingresada con el hash. |
| **jwt.sign()** | Genera un token JWT firmado. Recibe el payload, el secreto y opciones (como `expiresIn`). |
| **jwt.verify()** | Verifica la firma y la expiración de un token. Lanza `TokenExpiredError` si expiró o `JsonWebTokenError` si la firma es inválida. |
| **TokenExpiredError** | Error específico de jsonwebtoken cuando el campo `exp` del token ya venció. El cliente debe hacer login de nuevo o usar el refreshToken. |
| **payload (JWT)** | Datos dentro del token: `{ id, documento, role, iat, exp }`. Accesibles en los controladores como `req.usuario` después de que `verifyToken` lo decodifica. |

---

## Control de acceso (RBAC)

| Término | Definición |
|---|---|
| **RBAC** | Role-Based Access Control — sistema de permisos basado en roles. En vez de dar permisos a cada usuario individualmente, se definen roles con permisos y se asignan roles a usuarios. |
| **role** | Campo en la tabla `users`: `'admin'`, `'instructor'` o `'user'`. Se incluye en el payload del JWT para que `verifyToken` lo exponga en `req.usuario.role`. |
| **user_roles** | Tabla de unión que vincula un `user_id` con un `role_id`. Es la tabla del sistema RBAC que determina qué rol tiene cada usuario en la BD. |
| **roles** | Tabla con los roles disponibles del sistema: `admin`, `instructor`, `user`. Cada fila tiene `id` y `name`. |
| **permissions** | Tabla con los códigos de permiso del sistema: `tasks.create`, `tasks.delete`, `users.delete`, `calendar.manage`, etc. |
| **role_permissions** | Tabla de unión entre `roles` y `permissions`. Define qué permisos tiene cada rol. |
| **requireAdmin** | Middleware que verifica que `req.usuario.role === 'admin'`. Si no es admin, responde 403. Siempre se usa después de `verifyToken`. |
| **requireAdminOrInstructor** | Middleware que verifica que el rol sea `'admin'` o `'instructor'`. Si es `'user'`, responde 403. |
| **checkPermission** | Closure en `authorization.middleware.js` que retorna un middleware específico. Ejemplo: `checkPermission('tasks.create')` crea un middleware que verifica ese permiso puntual. |
| **getUserRolesAndPermissions** | Función de `user.model.js` que hace JOIN de las 4 tablas RBAC y retorna `[{ name: 'admin', permissions: ['tasks.create', ...] }]`. |

---

## Validación con Zod

| Término | Definición |
|---|---|
| **Zod** | Librería de validación de schemas. Permite definir la forma y las reglas que deben cumplir los datos antes de que lleguen al controlador. |
| **schema (Zod)** | Molde que define los campos esperados, sus tipos y sus restricciones. Ejemplo: `loginSchema` exige `email` (string con formato válido) y `password` (mínimo 6 caracteres). |
| **validateSchema** | Middleware genérico en `validator.middleware.js`. Recibe un schema y retorna un middleware que valida `req.body` contra ese schema. Si falla, responde 400 con los errores. |
| **z.object()** | Crea un schema para un objeto con propiedades definidas. Base de todos los schemas del proyecto. |
| **z.string()** | Define un campo como string. Permite encadenar `.min()`, `.max()`, `.email()`, `.regex()`. |
| **z.number()** | Define un campo como número. Permite encadenar `.min()`, `.max()`, `.int()`, `.positive()`. |
| **z.enum()** | Define un campo que solo acepta valores de una lista fija. Ejemplo: `z.enum(['pendiente', 'en_progreso', ...])`. |
| **.partial()** | Método de Zod que convierte todos los campos de un schema en opcionales. Se usa en `updateTaskSchema` y `updateUserSchema` para que el PUT no exija todos los campos. |
| **required_error** | Mensaje de error de Zod cuando un campo obligatorio no viene en el body. |
| **invalid_type_error** | Mensaje de error de Zod cuando el valor viene pero es de un tipo incorrecto (ej. número donde se espera string). |

---

## Base de datos

| Término | Definición |
|---|---|
| **mysql2/promise** | Cliente MySQL para Node.js con soporte `async/await`. Permite usar `await pool.query()` en los modelos sin callbacks. |
| **pool.query()** | Ejecuta una query SQL. Retorna `[rows, fields]`. Siempre se desestructura como `const [rows] = await pool.query(...)`. |
| **[rows]** | Primera posición del resultado de `pool.query()` — contiene las filas de la BD. `fields` (segunda posición) son los metadatos de las columnas y casi nunca se necesitan. |
| **? (placeholder)** | Marcador de posición en las queries SQL. `mysql2` lo reemplaza de forma segura con los valores del arreglo que se pasa como segundo argumento. Previene inyección SQL. |
| **SQL injection** | Ataque donde un usuario malicioso inyecta código SQL en un campo de texto. Los placeholders `?` lo previenen porque mysql2 escapa los valores automáticamente. |
| **assigned_users** | Columna de tipo `JSON` en la tabla `tasks`. Guarda los IDs de los usuarios asignados como arreglo: `[1, 2, 3]`. Permite asignar una tarea a varios usuarios sin una tabla de unión. |
| **JSON_CONTAINS()** | Función de MySQL que busca si un valor existe dentro de una columna JSON. Se usa en consultas como "¿qué tareas tienen asignado al usuario con id 3?". |
| **CAST(? AS JSON)** | Convierte un valor PHP/Node.js a tipo JSON para que MySQL lo compare correctamente con una columna JSON. Sin CAST, la comparación fallaría. |
| **AUTO_INCREMENT** | Propiedad de MySQL que genera IDs únicos automáticamente al hacer INSERT. Después de un `DELETE`, se recalcula con `ALTER TABLE` para evitar reutilizar IDs. |
| **COALESCE()** | Función MySQL que retorna el primer valor no NULL de una lista. Se usa para calcular el `MAX(id)` actual cuando el último usuario fue eliminado. |
| **INSERT INTO ... VALUES** | Query para crear una fila nueva. Los `?` corresponden a los valores en el mismo orden. |
| **camelCase / snake_case** | Los modelos reciben filas de MySQL en `snake_case` (`assigned_users`, `grade_reason`, `created_at`) y las convierten a `camelCase` (`assignedUsers`, `gradeReason`, `createdAt`) antes de enviarlas al frontend. |

---

## Patrones y utilidades del proyecto

| Término | Definición |
|---|---|
| **catchAsync** | Wrapper en `utils/catchAsync.js`. Envuelve los controladores para eliminar el `try/catch` repetitivo. Si el controlador lanza un error, lo pasa automáticamente a `next(error)`. |
| **next()** | Función de Express que pasa al siguiente middleware o al controlador en la cadena. Sin llamar a `next()`, la petición queda bloqueada. |
| **next(error)** | Variante de `next()` que pasa un error al `errorMiddleware`. Express lo detecta porque `errorMiddleware` tiene exactamente 4 parámetros. |
| **errorMiddleware** | Middleware global en `error.middleware.js`. Tiene exactamente 4 parámetros `(error, req, res, next)` — así Express lo identifica como manejador de errores. Se registra después de todas las rutas en `app.js`. |
| **successResponse** | Función de `response.util.js`. Responde con `{ success: true, message, data }`. Todos los controladores la usan para respuestas exitosas. |
| **errorResponse** | Función de `response.util.js`. Responde con `{ success: false, message, data: null }`. Se usa para errores que el controlador puede anticipar (ej: credenciales incorrectas). |
| **setImmediate** | Función de Node.js que ejecuta un callback después de que el event loop termina la iteración actual. Se usa en `forceDeleteUser` para hacer trabajo en background después de enviar la respuesta HTTP. |
| **codigosReset (Map)** | Estructura `Map` en memoria en `utils/resetCodes.js`. Almacena temporalmente los códigos de recuperación de contraseña. Clave: email. Valor: `{ code, expiresAt, verified }`. TTL de 15 minutos. |
| **Map** | Estructura de datos de JavaScript (como un diccionario). Permite asociar una clave con un valor. Más eficiente que un objeto para agregar y eliminar entradas frecuentemente. |

---

## Comunicación y protocolos

| Término | Definición |
|---|---|
| **CORS** | Cross-Origin Resource Sharing. Política del navegador que bloquea peticiones entre dominios diferentes. El backend la habilita con `app.use(cors())` para que el frontend en `localhost:5173` pueda hablar con el backend en `localhost:3000`. |
| **REST** | Representational State Transfer. Estilo de arquitectura para APIs HTTP. Cada recurso tiene una URL y se usan los métodos HTTP para indicar la operación. |
| **HTTP Methods** | `GET` (leer), `POST` (crear), `PUT` (actualizar completo), `PATCH` (actualizar parcial), `DELETE` (eliminar). |
| **HTTP Status Codes** | `200` OK, `201` Creado, `400` Datos inválidos, `401` Sin autenticar, `403` Sin permisos, `404` No encontrado, `409` Conflicto, `500` Error interno. |
| **req.body** | Datos enviados en el cuerpo de la petición (POST, PUT, PATCH). Disponible gracias a `app.use(express.json())`. |
| **req.params** | Parámetros dinámicos de la URL. Ejemplo: en `/api/tasks/:id`, `req.params.id` tiene el valor del id. |
| **req.query** | Parámetros en el query string de la URL. Ejemplo: en `/api/tasks/filter?status=pendiente`, `req.query.status` es `'pendiente'`. |
| **req.usuario** | Objeto que `verifyToken` adjunta al request después de decodificar el JWT. Contiene `{ id, documento, role, iat, exp }`. Disponible en todos los controladores de rutas protegidas. |

---

## Email (Mailtrap + Nodemailer)

| Término | Definición |
|---|---|
| **Nodemailer** | Librería de Node.js para enviar emails desde el servidor. Se configura con un `transporter` que define el servidor SMTP a usar. |
| **Mailtrap** | Servicio de email testing. Intercepta todos los emails enviados y los muestra en un buzón de prueba en línea. En producción se reemplazaría por un servicio real (SendGrid, SES, etc.). |
| **transporter** | Objeto de Nodemailer creado con `nodemailer.createTransport()`. Contiene la configuración SMTP (host, puerto, usuario, contraseña) para saber a qué servidor conectarse. |
| **SMTP** | Simple Mail Transfer Protocol. Protocolo para enviar emails entre servidores. Mailtrap usa el host `sandbox.smtp.mailtrap.io` en el puerto `2525`. |
| **mailOptions** | Objeto que define el email a enviar: `from` (remitente), `to` (destinatario), `subject` (asunto), `html` (cuerpo en HTML). Se pasa a `transporter.sendMail()`. |

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DB_HOST` | Dirección del servidor MySQL (`localhost`) |
| `DB_PORT` | Puerto de MySQL (`3306`) |
| `DB_USER` | Usuario de MySQL (`app_user`) |
| `DB_PASSWORD` | Contraseña del usuario MySQL (`TORRES_2007`) |
| `DB_NAME` | Nombre de la base de datos (`gestion_tareas_sena`) |
| `JWT_SECRET` | Clave para firmar accessTokens |
| `JWT_REFRESH_SECRET` | Clave para firmar refreshTokens |
| `JWT_EXPIRES_IN` | Duración del accessToken (`1h`) |
| `JWT_REFRESH_EXPIRES_IN` | Duración del refreshToken (`7d`) |
| `MAILTRAP_HOST` | Servidor SMTP de Mailtrap |
| `MAILTRAP_PORT` | Puerto SMTP de Mailtrap (`2525`) |
| `MAILTRAP_USER` | Usuario SMTP de Mailtrap |
| `MAILTRAP_PASS` | Contraseña SMTP de Mailtrap |
| `MAILTRAP_FROM` | Dirección remitente de los emails |
