
```markdown
# Implementación de Validaciones con Zod

**Proyecto:** Sistema de Gestión de Tareas — SENA  
**Milestone:** Implementación de Validaciones con Zod  
**Fecha:** abril 2026  

---

## ¿Por qué se implementó esta capa de validaciones?

Antes de esta implementación, el servidor aceptaba cualquier dato que enviara
el cliente sin verificar su formato ni su contenido. Esto podía provocar:

- Registros con correos inválidos (sin @) guardados en la base de datos.
- Tareas creadas con estados inventados que no existen en el sistema.
- Documentos de usuario con letras, espacios o valores vacíos.
- Asignaciones de tareas con arrays vacíos o sin números.

La solución fue agregar una capa de validación **antes** de que los datos
lleguen al controlador, usando la librería **Zod**.

---

## Arquitectura implementada

```
Cliente (Postman / Frontend)
        ↓
    Ruta (routes/)
        ↓
validateSchema(esquema)   ← intercepta aquí si los datos son incorrectos
        ↓ (solo si los datos son válidos)
   Controlador (controller/)
        ↓
     Modelo (models/)
        ↓
  Base de datos (MySQL)
```

---

## Archivos nuevos creados

### `schemas/task.schema.js`
Define los moldes de validación para tareas:
- `createTaskSchema` — valida title, description, status, assignedUsers y comment al crear.
- `updateTaskSchema` — igual pero todos los campos opcionales (para PUT).
- `updateTaskStatusSchema` — solo valida el campo status con los 3 valores permitidos.
- `assignUsersSchema` — valida que userIds sea un arreglo con al menos un número.

### `schemas/user.schema.js`
Define los moldes de validación para usuarios:
- `createUserSchema` — valida documento (solo números), name y email (formato correo).
- `updateUserSchema` — igual pero todos los campos opcionales (para PUT).

### `src/middlewares/validator.middleware.js`
Middleware genérico y reutilizable:
- Recibe cualquier esquema Zod como parámetro.
- Ejecuta `schema.safeParse(req.body)` sin lanzar excepciones.
- Si falla: responde `400 Bad Request` con la lista de campos y mensajes en español.
- Si pasa: reemplaza `req.body` con los datos limpios de Zod y llama `next()`.

---

## Archivos modificados

### `src/routes/users.routes.js`
- POST `/api/users` → ahora pasa por `validateSchema(createUserSchema)`.
- PUT `/api/users/:id` → ahora pasa por `validateSchema(updateUserSchema)`.

### `src/routes/tasks.routes.js`
- POST `/api/tasks` → ahora pasa por `validateSchema(createTaskSchema)`.
- PUT `/api/tasks/:id` → ahora pasa por `validateSchema(updateTaskSchema)`.
- PATCH `/api/tasks/:id/status` → ahora pasa por `validateSchema(updateTaskStatusSchema)`.
- POST `/api/tasks/:taskId/assign` → ahora pasa por `validateSchema(assignUsersSchema)`.

### `src/controller/users.controller.js`
- Se eliminó la validación manual de campos en `createUser` (ahora la hace Zod).

### `src/controller/tasks.controller.js`
- Se eliminó la validación manual en `createTask`, `updateTaskStatus` y `assignUsersToTask`.

---

## Reglas de validación implementadas

| Campo | Regla |
|---|---|
| `documento` | Solo números, mínimo 5, máximo 20 caracteres |
| `name` | Texto, mínimo 3, máximo 100 caracteres |
| `email` | Formato válido de correo, máximo 100 caracteres |
| `title` | Texto, mínimo 3, máximo 200 caracteres |
| `description` | Texto opcional, máximo 500 caracteres |
| `status` | Solo: `pendiente`, `en_progreso` o `completada` |
| `assignedUsers` | Arreglo opcional de números enteros positivos |
| `userIds` | Arreglo con al menos 1 número entero positivo |
| `comment` | Texto opcional, máximo 500 caracteres |

---

## Dependencia instalada

```bash
npm install zod
```

Versión usada: ver `package.json` → `dependencies.zod`.
```