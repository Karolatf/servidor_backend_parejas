// MÓDULO: routes/tasks.routes.js
// CAPA: Rutas (conecta URLs con controladores)
//
// Responsabilidad única: definir qué función del controlador
// maneja cada combinación de método HTTP + ruta de tareas.
//
// REGLA CRÍTICA DE ORDEN:
//   Express evalúa las rutas en el orden en que están definidas.
//   Las rutas /filter y /dashboard deben ir ANTES de /:id.
//   Si /:id estuviera primero, Express capturaría "filter" y "dashboard"
//   como valores del parámetro id y nunca llegaría a esas rutas específicas.
//
// MONTAJE EN app.js:
//   app.use('/api/tasks', verifyToken, tasksRouter)
//   verifyToken ya protege todas las rutas — req.usuario.id y req.usuario.role
//   están disponibles en los controladores sin verificación adicional.

// Importamos Router de express para crear un enrutador modular
// Router permite separar las rutas de tareas del servidor principal en app.js
import { Router } from 'express';

// Importamos todos los controladores que manejan las operaciones sobre tareas
// getTasks           — lista todas las tareas con nombres de usuarios resueltos
// getTaskById        — obtiene una tarea específica por su id numérico
// createTask         — inserta una tarea nueva en la BD
// updateTask         — actualiza los campos de una tarea existente
// deleteTask         — elimina una tarea permanentemente de la BD
// updateTaskStatus   — cambia solo el estado de una tarea
// assignUsersToTask  — agrega usuarios al arreglo assignedUsers de una tarea
// getAssignedUsers   — lista los usuarios asignados a una tarea
// removeUserFromTask — quita un usuario del arreglo assignedUsers de una tarea
// filterTasks        — filtra tareas por estado y/o usuario asignado
// getDashboard       — retorna estadísticas del panel de control
import {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    assignUsersToTask,
    getAssignedUsers,
    removeUserFromTask,
    filterTasks,
    getDashboard,
} from '../controller/tasks.controller.js';

// Importamos validateSchema que es el middleware genérico de validación con Zod
// Recibe un schema y retorna un middleware que valida req.body contra ese schema
// Si la validación falla, responde 400 con los errores antes de llegar al controlador
import { validateSchema } from '../middlewares/validator.middleware.js';

// Importamos los cuatro schemas de validación para las operaciones de tareas
// createTaskSchema       — valida el body de POST /api/tasks
// updateTaskSchema       — valida el body de PUT /api/tasks/:id (todos opcionales)
// updateTaskStatusSchema — valida el body de PATCH /api/tasks/:id/status
// assignUsersSchema      — valida el body de POST /api/tasks/:taskId/assign
import {
    createTaskSchema,
    updateTaskSchema,
    updateTaskStatusSchema,
    assignUsersSchema,
} from '../../schemas/task.schema.js';

// Importamos requireAdminOrInstructor para proteger los endpoints de escritura
// Solo admin e instructor pueden crear, actualizar, eliminar tareas o asignar usuarios
import { requireAdminOrInstructor } from '../middlewares/auth.middleware.js';

// Creamos la instancia del enrutador — este objeto registra todas las rutas de tareas
// y se monta en app.js bajo el prefijo /api/tasks
const router = Router();

// ── RUTAS SIN PARÁMETRO DINÁMICO (van PRIMERO) ─────────────────────────────
// Deben ir antes de /:id para que Express no las confunda con un parámetro dinámico

// GET /api/tasks/filter — filtra tareas por ?status y/o ?userId
// Accesible por todos los roles autenticados — el estudiante puede filtrar sus propias tareas
router.get('/filter', filterTasks);

// GET /api/tasks/dashboard — retorna estadísticas del panel de control
// requireAdminOrInstructor verifica que el usuario sea admin o instructor antes de continuar
router.get('/dashboard', requireAdminOrInstructor, getDashboard);

// ── RUTAS PRINCIPALES ──────────────────────────────────────────────────────

// GET /api/tasks — lista todas las tareas con los nombres de usuarios resueltos
// Accesible por todos los roles autenticados
router.get('/', getTasks);

// POST /api/tasks — crea una tarea nueva en la BD
// requireAdminOrInstructor verifica el rol antes de que Zod valide el body
// validateSchema(createTaskSchema) valida título, estado y usuarios antes de createTask
router.post('/', requireAdminOrInstructor, validateSchema(createTaskSchema), createTask);

// GET /api/tasks/:id — obtiene una tarea específica por su id numérico
// Accesible por todos los roles autenticados
router.get('/:id', getTaskById);

// PUT /api/tasks/:id — actualiza una tarea existente (todos los campos son opcionales)
// updateTaskSchema usa .partial() — el frontend puede enviar solo los campos que cambiaron
router.put('/:id', requireAdminOrInstructor, validateSchema(updateTaskSchema), updateTask);

// DELETE /api/tasks/:id — elimina una tarea permanentemente de la BD
// Solo admin e instructor pueden eliminar tareas — requireAdminOrInstructor lo verifica
router.delete('/:id', requireAdminOrInstructor, deleteTask);

// ── ESTADO ────────────────────────────────────────────────────────────────

// PATCH /api/tasks/:id/status — cambia solo el estado de una tarea
// Accesible por todos los roles — los estudiantes usan este endpoint para actualizar su progreso
// validateSchema(updateTaskStatusSchema) verifica que el estado sea uno de los cinco válidos
router.patch('/:id/status', validateSchema(updateTaskStatusSchema), updateTaskStatus);

// ── ASIGNACIÓN DE USUARIOS ────────────────────────────────────────────────

// POST /api/tasks/:taskId/assign — asigna usuarios a una tarea existente
// validateSchema(assignUsersSchema) verifica que userIds sea un arreglo con al menos un número
router.post('/:taskId/assign', requireAdminOrInstructor, validateSchema(assignUsersSchema), assignUsersToTask);

// GET /api/tasks/:taskId/users — lista los usuarios asignados a una tarea
// Accesible por todos los roles — el estudiante puede ver quién más tiene su tarea asignada
router.get('/:taskId/users', getAssignedUsers);

// DELETE /api/tasks/:taskId/users/:userId — quita un usuario de la lista assignedUsers de una tarea
// Solo admin e instructor pueden quitar usuarios asignados — requireAdminOrInstructor lo verifica
router.delete('/:taskId/users/:userId', requireAdminOrInstructor, removeUserFromTask);

// Exportamos el enrutador para que app.js lo registre bajo /api/tasks
export default router;
