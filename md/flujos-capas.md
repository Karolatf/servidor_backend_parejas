# Flujos por Capas — Cómo funciona cada operación

> Para cada operación importante del sistema se documenta el recorrido completo:
> desde la petición HTTP hasta la respuesta, archivo por archivo y capa por capa.
> Úsalo para responder preguntas del instructor sobre cómo funciona cada proceso.

---

## Orden de capas (recordatorio)

```
Petición HTTP
    ↓
app.js          ← aplica middlewares globales (cors, json, verifyToken)
    ↓
routes/*.js     ← decide qué controlador maneja la petición y aplica middlewares locales
    ↓
middlewares/    ← verifican token, rol, permisos o validan el body con Zod
    ↓
controller/     ← extrae datos de req, llama al servicio, responde con successResponse
    ↓
services/       ← lógica de negocio (solo para auth — el resto va directo al modelo)
    ↓
models/         ← ejecuta las queries SQL con pool.query()
    ↓
MySQL           ← devuelve los datos
```

---

## FLUJO 1 — Login de usuario

**Petición:** `POST /api/auth/login` con body `{ email, password }`

### Paso a paso

```
1. app.js
   → app.use(express.json())         — parsea el body JSON → req.body disponible
   → app.use('/api/auth', authRouter) — redirige a authRouter (sin verifyToken, es pública)

2. routes/auth.routes.js
   → validateSchema(loginSchema)     — Zod valida email y password antes de continuar
   → router.post('/login', login)    — si Zod pasa, llama al controlador login

3. middlewares/validator.middleware.js
   → loginSchema.safeParse(req.body) — si falla: res.status(400).json({ errors })
   → si pasa: next()

4. controller/auth.controller.js  →  login()
   → const { email, password } = req.body
   → const resultado = await loginService({ email, password })
   → if (!resultado) → errorResponse(res, 'Credenciales incorrectas', 401)
   → successResponse(res, 'Inicio de sesión exitoso', resultado)

5. services/auth.service.js  →  loginService({ email, password })
   → await getUserByEmail(email)      — busca el usuario en MySQL
   → if (!usuario) → return null      — email no existe
   → if (usuario.is_active === 0)     — lanza error ACCOUNT_DISABLED → errorMiddleware → 403
   → await bcrypt.compare(password, usuario.password)
   → if (!coincide) → return null     — contraseña incorrecta
   → jwt.sign({ id, documento, role }, JWT_SECRET, { expiresIn: '1h' })  — accessToken
   → jwt.sign({ id }, JWT_REFRESH_SECRET, { expiresIn: '7d' })           — refreshToken
   → return { accessToken, refreshToken, user: { id, name, email, role } }

6. models/user.model.js  →  getUserByEmail(email)
   → pool.query('SELECT * FROM users WHERE email = ?', [email])
   → return rows[0]   — objeto con password incluido (bcrypt lo necesita)

7. Respuesta al cliente:
   { success: true, message: 'Inicio de sesión exitoso',
     data: { accessToken, refreshToken, user: { id, name, email, role } } }
```

**Si el token ya expiró (Silent Refresh):**
- El controlador `/api/auth/refresh` recibe el refreshToken
- `jwt.verify(refreshToken, JWT_REFRESH_SECRET)` verifica la firma
- Si es válido: genera un nuevo accessToken y lo devuelve
- El frontend lo guarda en localStorage y repite la petición original

---

## FLUJO 2 — Filtrar tareas como usuario

**Petición:** `GET /api/tasks/filter?status=en_progreso&userId=3`

### Paso a paso

```
1. app.js
   → verifyToken (middleware global en /api/tasks)
   → jwt.verify(token, JWT_SECRET) — decodifica el token
   → req.usuario = { id, documento, role, iat, exp }

2. routes/tasks.routes.js
   → router.get('/filter', filterTasks)   — sin requireAdmin: todos los roles pueden filtrar

3. controller/tasks.controller.js  →  filterTasks()
   → const { status, userId } = req.query   — extrae los parámetros del query string
   → const tareas = await filterTasksModel({ status, userId })
   → successResponse(res, 'Tareas filtradas correctamente', tareas)

4. models/task.model.js  →  filterTasks({ status, userId })
   → await getAllTasks()           — obtiene TODAS las tareas de MySQL + nombres de usuarios
       → pool.query('SELECT * FROM tasks')
       → pool.query('SELECT id, name, documento, is_active FROM users')
       → para cada tarea: resuelve assignedUsers (IDs → nombres)
       → agrega assignedUsersDisplay ('Juan, María') y assignedDocumentos
   → if (status) resultado.filter(t => t.status === status)
   → if (userId) resultado.filter(t => t.assignedUsers.includes(Number(userId)))
   → return arreglo filtrado

5. Respuesta al cliente:
   { success: true, message: 'Tareas filtradas correctamente',
     data: [ { id, title, status, assignedUsersDisplay, ... } ] }
```

---

## FLUJO 3 — Admin desactiva un usuario

**Petición:** `PATCH /api/users/:id/deactivate` con body `{ reason: "No cumplió el reglamento" }`

### Paso a paso

```
1. app.js
   → verifyToken — verifica JWT → req.usuario = { id, role }

2. routes/users.routes.js
   → router.patch('/:id/deactivate', requireAdmin, deactivateUser)

3. middlewares/auth.middleware.js  →  requireAdmin()
   → if (req.usuario.role !== 'admin') → res.status(403)
   → si es admin: next()

4. controller/users.controller.js  →  deactivateUser()
   → const id = Number(req.params.id)
   → const { reason } = req.body
   → const usuario = await getUserById(id)          — verifica que existe
   → if (!usuario) → errorResponse(res, 'Usuario no encontrado', 404)
   → if (id === req.usuario.id) → 400 (admin no puede desactivarse a sí mismo)
   → const tareasActivas = await countUserActiveTasks(id)
   → if (tareasActivas > 0) → 400 (tiene tareas pendientes/en_progreso)
   → const actualizado = await deactivateUserModel(id, reason)
   → successResponse(res, 'Usuario desactivado', actualizado)

5. models/user.model.js  →  countUserActiveTasks(userId)
   → pool.query(`SELECT COUNT(*) AS total FROM tasks
                 WHERE (status = 'pendiente' OR status = 'en_progreso')
                   AND JSON_CONTAINS(assigned_users, CAST(? AS JSON), '$')`, [userId])
   → return rows[0].total

6. models/user.model.js  →  deactivateUser(id, reason)
   → await getUserById(id)   — verifica existencia
   → pool.query('UPDATE users SET is_active = 0, deactivation_reason = ?, deactivation_date = NOW() WHERE id = ?',
                [reason || null, id])
   → return getUserById(id)  — retorna el usuario actualizado

7. Respuesta:
   { success: true, message: 'Usuario desactivado exitosamente',
     data: { id, name, is_active: 0, deactivation_reason, deactivation_date } }
```

---

## FLUJO 4 — Admin elimina un usuario forzosamente

**Petición:** `DELETE /api/users/:id/force` con body `{ reason: "Egresado del programa" }`

### Paso a paso

```
1. app.js → verifyToken → req.usuario

2. routes/users.routes.js
   → router.delete('/:id/force', requireAdmin, forceDeleteUser)

3. controller/users.controller.js  →  forceDeleteUser()
   → const id = Number(req.params.id)
   → const { reason } = req.body
   → if (!reason || reason.length < 10) → 400 (auditoría obligatoria)
   → const usuario = await getUserById(id)
   → if (!usuario) → 404
   → await registrarNombreUsuarioEliminado(id, usuario.name)
       — guarda el nombre en deleted_user_names de TODAS sus tareas asignadas
       — para que el historial de tareas no quede con IDs sin nombre
   → const eliminado = await deleteUserModel(id)
   → setImmediate(async () => {
       — DESPUÉS de enviar la respuesta, en background:
       — actualiza las tareas para remover el userId de assigned_users
     })
   → successResponse(res, 'Usuario eliminado permanentemente', eliminado)

4. models/task.model.js  →  registrarNombreUsuarioEliminado(userId, userName)
   → pool.query(`SELECT id, deleted_user_names FROM tasks
                 WHERE JSON_CONTAINS(assigned_users, CAST(? AS JSON), '$')`, [userId])
   → para cada tarea encontrada:
       → lee el mapa deleted_user_names existente
       → agrega { "userId": "nombre" }
       → UPDATE tasks SET deleted_user_names = ? WHERE id = ?

5. models/user.model.js  →  deleteUser(id)
   → await getUserById(id)
   → pool.query('DELETE FROM users WHERE id = ?', [id])
   → calcula MAX(id) actual
   → ALTER TABLE users AUTO_INCREMENT = maxId + 1  (evita reutilizar el ID eliminado)
   → return usuario (el objeto antes de eliminarse)

6. Respuesta:
   { success: true, message: 'Usuario eliminado permanentemente',
     data: { id, name, email, ... } }
```

---

## FLUJO 5 — Usuario cambia el estado de su tarea

**Petición:** `PATCH /api/tasks/:id/status` con body `{ status: "en_progreso" }`

### Paso a paso

```
1. app.js → verifyToken → req.usuario

2. routes/tasks.routes.js
   → router.patch('/:id/status', validateSchema(updateTaskStatusSchema), updateTaskStatus)
   → Sin requireAdmin: todos los roles pueden cambiar estado

3. middlewares/validator.middleware.js
   → updateTaskStatusSchema.safeParse(req.body)
   → z.enum(['pendiente','en_progreso','pendiente_aprobacion','completada','reprobada'])
   → si el status no es válido: res.status(400).json({ errors })

4. controller/tasks.controller.js  →  updateTaskStatus()
   → const { id } = req.params
   → const { status } = req.body
   → const tarea = await updateTaskStatusModel(id, status)
   → if (!tarea) → errorResponse(res, 'Tarea no encontrada', 404)
   → successResponse(res, 'Estado actualizado correctamente', tarea)

5. models/task.model.js  →  updateTaskStatus(id, status)
   → return updateTask(id, { status })   — delega en updateTask reutilizando su lógica

6. models/task.model.js  →  updateTask(id, campos)
   → await getTaskById(id)   — verifica que existe
   → camposDb = { status: campos.status }
   → UPDATE tasks SET status = ? WHERE id = ?
   → return getTaskById(id)  — retorna la tarea actualizada desde MySQL

7. Respuesta:
   { success: true, message: 'Estado actualizado correctamente',
     data: { id, title, status: 'en_progreso', ... } }
```

---

## FLUJO 6 — Instructor califica una tarea

**Petición:** `PUT /api/tasks/:id` con body `{ grade: 85, gradeReason: "Buen trabajo, falló la documentación" }`

### Paso a paso

```
1. app.js → verifyToken

2. routes/tasks.routes.js
   → requireAdminOrInstructor   — solo admin e instructor pueden calificar
   → validateSchema(updateTaskSchema)   — Zod valida grade (0-100) y gradeReason
   → updateTask (controlador)

3. controller/tasks.controller.js  →  updateTask()
   → const { id } = req.params
   → const campos = req.body   — { grade: 85, gradeReason: '...' }
   → const tarea = await updateTaskModel(id, campos)
   → if (!tarea) → 404
   → successResponse(res, 'Tarea actualizada correctamente', tarea)

4. models/task.model.js  →  updateTask(id, campos)
   → verifica que la tarea existe
   → camposDb.grade = Number(85)
   → camposDb.grade_reason = 'Buen trabajo...'
   → camposDb.status = 85 >= 70 ? 'completada' : 'reprobada'   — recalcula automático
   → UPDATE tasks SET grade = ?, grade_reason = ?, status = ? WHERE id = ?
   → return getTaskById(id)

5. Respuesta:
   { success: true, message: 'Tarea actualizada correctamente',
     data: { id, title, grade: 85, gradeReason: '...', status: 'completada' } }
```

> Si la nota es menor a 70: `status` se convierte automáticamente a `'reprobada'`.
> Este recálculo lo hace el modelo, no el controlador — así la BD nunca queda inconsistente.

---

## FLUJO 7 — Recuperación de contraseña (3 pasos)

### Paso 1: Solicitar código

**Petición:** `POST /api/auth/forgot-password` con body `{ email }`

```
→ authRouter → forgotPassword (controlador)
→ getUserByEmail(email)              — verifica que el email existe
→ if (!usuario) → 404
→ guardarCodigo(email)               — utils/resetCodes.js
    → genera número aleatorio de 6 dígitos (100000-999999)
    → codigosReset.set(email, { code, expiresAt: Date.now() + 15min, verified: false })
    → retorna el código generado
→ enviarCodigoRecuperacion(email, codigo)  — services/email.service.js
    → transporter.sendMail(mailOptions)    — Mailtrap recibe el email con el código
→ successResponse(res, 'Código enviado al correo', null)
```

### Paso 2: Verificar código

**Petición:** `POST /api/auth/verify-code` con body `{ email, code }`

```
→ authRouter → verifyCode (controlador)
→ verificarCodigo(email, code)   — utils/resetCodes.js
    → busca el email en el Map
    → if (!entrada) → { valido: false, razon: 'No se encontró código' }
    → if (Date.now() > entrada.expiresAt) → { valido: false, razon: 'Código expirado' }
    → if (entrada.code !== code) → { valido: false, razon: 'Código incorrecto' }
    → codigosReset.set(email, { ...entrada, verified: true })
    → return { valido: true }
→ if (!resultado.valido) → errorResponse(res, resultado.razon, 400)
→ successResponse(res, 'Código verificado correctamente', null)
```

### Paso 3: Cambiar contraseña

**Petición:** `POST /api/auth/reset-password` con body `{ email, newPassword }`

```
→ authRouter → resetPassword (controlador)
→ codigoEsVerificado(email)      — verifica que pasó el paso 2 (verified: true)
→ if (!verificado) → 400 (debe verificar el código primero)
→ getUserByEmail(email)           — obtiene el usuario de la BD
→ hashearPassword(newPassword)    — bcrypt.hash(newPassword, 10)
→ updateUserPassword(id, hash)    — UPDATE users SET password = ?
→ eliminarCodigo(email)           — codigosReset.delete(email) — limpia el Map
→ successResponse(res, 'Contraseña actualizada correctamente', null)
```

---

## FLUJO 8 — Admin crea un usuario y le asigna rol

### Crear usuario

**Petición:** `POST /api/users` con body `{ documento: "1234567890", name: "Ana López", email: "ana@mail.com" }`

```
1. verifyToken → requireAdmin → validateSchema(createUserSchema) → createUser

2. Zod valida:
   → documento: solo dígitos, mínimo 5 caracteres
   → name: solo letras y espacios, mínimo 3 caracteres
   → email: formato válido, máximo 100 caracteres

3. controller/users.controller.js  →  createUser()
   → getUserByDocumento(documento)   — verifica que no existe
   → if (existe) → 409 Conflict ('El documento ya está registrado')
   → getUserByEmail(email)           — verifica que no existe
   → if (existe) → 409 Conflict ('El correo ya está registrado')
   → const usuario = await createUserModel({ documento, name, email })
   → successResponse(res, 'Usuario creado', usuario, 201)

4. models/user.model.js  →  createUser({ documento, name, email })
   → INSERT INTO users (documento, name, email) VALUES (?, ?, ?)
   — password y role quedan con sus valores DEFAULT de MySQL (NULL y 'user')
   → return getUserById(result.insertId)
```

### Cambiar rol

**Petición:** `PATCH /api/users/:id/role` con body `{ role: "instructor" }`

```
→ requireAdmin → validateSchema(changeRoleSchema) → changeUserRole

→ changeRoleSchema valida: role debe ser 'admin', 'user' o 'instructor'

→ controller: changeUserRole()
   → const usuario = await getUserById(id)
   → if (!usuario) → 404
   → const actualizado = await updateUserRole(id, role)
   → successResponse(res, 'Rol actualizado', actualizado)

→ model: updateUserRole(id, role)
   → UPDATE users SET role = ? WHERE id = ?
   → return getUserById(id)
```

---

## FLUJO 9 — Instructor crea una tarea y asigna usuarios

### Crear tarea

**Petición:** `POST /api/tasks` con body `{ title: "Entrega módulo 3", status: "pendiente", assignedUsers: [2, 5] }`

```
→ verifyToken → requireAdminOrInstructor → validateSchema(createTaskSchema) → createTask

→ Zod valida:
   → title: mínimo 3 caracteres
   → status: uno de los 5 valores válidos
   → assignedUsers: arreglo de números enteros positivos

→ controller: createTask()
   → const { title, description, status, assignedUsers, comment } = req.body
   → const tarea = await createTaskModel({ title, description, status, assignedUsers, comment })
   → successResponse(res, 'Tarea creada', tarea, 201)

→ model: createTask({ ... })
   → verifica que ningún usuario asignado esté inactivo (is_active = 0)
   → if (inactivos.length > 0) → lanza error 400
   → INSERT INTO tasks (title, description, status, assigned_users, comment, grade, grade_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)
   → assigned_users se guarda como JSON: '[2,5]'
   → return getTaskById(result.insertId)
```

### Asignar usuarios adicionales

**Petición:** `POST /api/tasks/:taskId/assign` con body `{ userIds: [7] }`

```
→ validateSchema(assignUsersSchema) → assignUsersToTask

→ model: assignUsersToTask(taskId, userIds)
   → getTaskById(taskId)   — tarea existente con assignedUsers: [2, 5]
   → [...new Set([...tarea.assignedUsers, ...userIds.map(Number)])]
   → resultado: [2, 5, 7]   — Set elimina duplicados automáticamente
   → updateTask(taskId, { assignedUsers: [2, 5, 7] })
```

---

## FLUJO 10 — Verificación de token en cada petición protegida

> Este flujo ocurre automáticamente ANTES de cada controlador en rutas protegidas.

```
middlewares/auth.middleware.js  →  verifyToken()

→ const authHeader = req.headers['authorization']
→ if (!authHeader || !authHeader.startsWith('Bearer '))
   → res.status(401).json({ error: 'Acceso denegado: Token requerido' })

→ const token = authHeader.split(' ')[1]   — extrae 'eyJhbGci...' del 'Bearer eyJhbGci...'

→ try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      req.usuario = payload   — { id, documento, role, iat, exp }
      next()                  — continúa al controlador
   } catch (error) {
      if (error.name === 'TokenExpiredError')
         → res.status(401).json({ error: 'Token expirado, inicie sesión nuevamente' })
      else
         → res.status(401).json({ error: 'Token inválido' })
   }
```
