// MÓDULO: routes/tasks.routes.js
// CAPA: Rutas (conecta URLs con controladores)
//
// Responsabilidad única: definir qué función del controlador
// maneja cada combinación de método HTTP + ruta de tareas y comentarios.
//
// REGLA CRÍTICA DE ORDEN:
//   Las rutas /filter, /dashboard y /:taskId/comments deben ir ANTES de /:id.
//   Si /:id estuviera primero, Express capturaría "filter", "dashboard" y "comments"
//   como valores del parámetro :id y nunca llegaría a esas rutas específicas.
//
// MONTAJE EN app.js:
//   app.use('/api/tasks', verifyToken, tasksRouter)

import { Router } from 'express';

// Importamos los controladores de tareas
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

// Importamos los controladores de comentarios de tareas
import {
    getComments,
    createComment,
    deleteComment,
} from '../controller/comments.controller.js';

// Importamos validateSchema con los schemas Zod de tareas
import { validateSchema } from '../middlewares/validator.middleware.js';
import {
    createTaskSchema,
    updateTaskSchema,
    updateTaskStatusSchema,
    assignUsersSchema,
} from '../../schemas/task.schema.js';

// Importamos los middlewares de autorización
import { requireAdminOrInstructor, requirePermiso, requireAnyPermiso } from '../middlewares/auth.middleware.js';

const router = Router();

// ── RUTAS SIN PARÁMETRO DINÁMICO (van PRIMERO) ─────────────────────────────

// GET /api/tasks/filter — filtra tareas por ?status y/o ?userId
// Accesible por todos los roles — el estudiante puede filtrar sus propias tareas
router.get('/filter', filterTasks);

// GET /api/tasks/dashboard — estadísticas del panel de control
// tasks.view.all (admin/instructor) | auditor.reportes (auditor con permiso de reportes)
router.get('/dashboard', requireAnyPermiso(['tasks.view.all', 'auditor.reportes']), getDashboard);

// ── RUTAS PRINCIPALES ──────────────────────────────────────────────────────

// GET /api/tasks — lista todas las tareas con los nombres de usuarios resueltos
router.get('/', getTasks);

// POST /api/tasks — crea una tarea nueva
// requireAdminOrInstructor verifica el rol antes de que Zod valide el body
router.post('/', requireAdminOrInstructor, validateSchema(createTaskSchema), createTask);

// GET /api/tasks/:id — obtiene una tarea específica por su id numérico
router.get('/:id', getTaskById);

// PUT /api/tasks/:id — actualiza una tarea existente (todos los campos son opcionales)
router.put('/:id', requireAdminOrInstructor, validateSchema(updateTaskSchema), updateTask);

// DELETE /api/tasks/:id — elimina una tarea permanentemente
router.delete('/:id', requireAdminOrInstructor, deleteTask);

// ── ESTADO ────────────────────────────────────────────────────────────────

// PATCH /api/tasks/:id/status — cambia solo el estado de una tarea
// Accesible por todos los roles — los estudiantes actualizan su progreso con este endpoint
router.patch('/:id/status', validateSchema(updateTaskStatusSchema), updateTaskStatus);

// ── ASIGNACIÓN DE USUARIOS ────────────────────────────────────────────────

// POST /api/tasks/:taskId/assign — asigna usuarios a una tarea (agrega a task_users)
router.post('/:taskId/assign', requireAdminOrInstructor, validateSchema(assignUsersSchema), assignUsersToTask);

// GET /api/tasks/:taskId/users — lista los usuarios asignados a una tarea
router.get('/:taskId/users', getAssignedUsers);

// DELETE /api/tasks/:taskId/users/:userId — quita un usuario de task_users
router.delete('/:taskId/users/:userId', requireAdminOrInstructor, removeUserFromTask);

// ── COMENTARIOS DE TAREAS ─────────────────────────────────────────────────
// Los estudiantes comentan en tareas calificadas; el instructor los ve en su panel

// GET /api/tasks/:taskId/comments — lista todos los comentarios de una tarea
// Accesible por todos los roles autenticados
router.get('/:taskId/comments', getComments);

// POST /api/tasks/:taskId/comments — agrega un comentario a una tarea calificada
// Solo estudiante asignado, admin o instructor pueden comentar (verificado en el controlador)
router.post('/:taskId/comments', createComment);

// DELETE /api/tasks/:taskId/comments/:commentId — elimina un comentario
// Solo el autor o un admin pueden eliminar su comentario (verificado en el controlador)
router.delete('/:taskId/comments/:commentId', deleteComment);

export default router;
