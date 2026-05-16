// MÓDULO: routes/tasks.routes.js
// CAPA: Rutas (conecta URLs con controladores)

// Responsabilidad única: definir qué función del controlador
// maneja cada combinación de método HTTP + ruta de tareas.

// REGLA CRÍTICA DE ORDEN:
// Express evalúa las rutas en el orden en que están definidas.
// Las rutas /filter y /dashboard deben ir ANTES de /:id.
// Si /:id estuviera primero, Express capturaría "filter" y "dashboard"
// como valores del parámetro id y nunca llegaría a esas rutas específicas.

import { Router } from 'express';

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
    getDashboard
} from '../controller/tasks.controller.js';

// Se importa el middleware genérico de validación
import { validateSchema } from '../middlewares/validator.middleware.js';

// Se importan los esquemas de validación para cada operación de tareas
import {
    createTaskSchema,
    updateTaskSchema,
    updateTaskStatusSchema,
    assignUsersSchema,
} from '../../schemas/task.schema.js';

import { requireAdminOrInstructor } from '../middlewares/auth.middleware.js';

const router = Router();

// ── RUTAS SIN PARÁMETRO DINÁMICO ──
// Deben ir PRIMERO para que Express no las confunda con /:id

// GET /api/tasks/filter — filtra por ?status y/o ?userId (accesible por todos los roles)
router.get('/filter', filterTasks);

// GET /api/tasks/dashboard — estadísticas generales (solo admin e instructor)
router.get('/dashboard', requireAdminOrInstructor, getDashboard);

// ── RUTAS PRINCIPALES ──

// GET  /api/tasks — lista todas las tareas (accesible por todos los roles autenticados)
router.get('/', getTasks);

// POST /api/tasks — crea una tarea nueva (solo admin e instructor)
// validateSchema(createTaskSchema) actúa como guardia antes de createTask
router.post('/', requireAdminOrInstructor, validateSchema(createTaskSchema), createTask);

// GET    /api/tasks/:id — obtiene una tarea por id (accesible por todos los roles)
router.get('/:id', getTaskById);

// PUT    /api/tasks/:id — actualiza una tarea completa (solo admin e instructor)
// updateTaskSchema usa .partial() así que todos los campos son opcionales
router.put('/:id', requireAdminOrInstructor, validateSchema(updateTaskSchema), updateTask);

// DELETE /api/tasks/:id — elimina una tarea (solo admin e instructor)
router.delete('/:id', requireAdminOrInstructor, deleteTask);

// ── ESTADO ──

// PATCH /api/tasks/:id/status — cambia solo el estado (accesible por todos los roles)
// Los estudiantes usan este endpoint para actualizar el progreso de sus tareas
router.patch('/:id/status', validateSchema(updateTaskStatusSchema), updateTaskStatus);

// ── ASIGNACIÓN DE USUARIOS ──

// POST   /api/tasks/:taskId/assign — asigna usuarios a una tarea (solo admin e instructor)
// Valida que userIds sea un arreglo con al menos un número
router.post('/:taskId/assign', requireAdminOrInstructor, validateSchema(assignUsersSchema), assignUsersToTask);

// GET    /api/tasks/:taskId/users — lista usuarios asignados (accesible por todos los roles)
router.get('/:taskId/users', getAssignedUsers);

// DELETE /api/tasks/:taskId/users/:userId — quita un usuario (solo admin e instructor)
router.delete('/:taskId/users/:userId', requireAdminOrInstructor, removeUserFromTask);

export default router;