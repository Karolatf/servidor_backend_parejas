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

const router = Router();

// ── RUTAS SIN PARÁMETRO DINÁMICO ──
// Deben ir PRIMERO para que Express no las confunda con /:id

// GET /api/tasks/filter — filtra por ?status y/o ?userId
router.get('/filter', filterTasks);

// GET /api/tasks/dashboard — estadísticas generales
router.get('/dashboard', getDashboard);

// ── RUTAS PRINCIPALES ──

// GET    /api/tasks      — lista todas las tareas
// POST   /api/tasks      — crea una tarea nueva
router.get('/',  getTasks);
router.post('/', createTask);

// GET    /api/tasks/:id  — obtiene una tarea por id
// PUT    /api/tasks/:id  — actualiza una tarea completa
// DELETE /api/tasks/:id  — elimina una tarea
router.get('/:id',    getTaskById);
router.put('/:id',    updateTask);
router.delete('/:id', deleteTask);

// ── ESTADO ──

// PATCH /api/tasks/:id/status — cambia solo el estado
// Cuerpo: { status: 'pendiente' | 'en_progreso' | 'completada' }
router.patch('/:id/status', updateTaskStatus);

// ── ASIGNACIÓN DE USUARIOS ──

// POST   /api/tasks/:taskId/assign         — asigna usuarios a una tarea
// GET    /api/tasks/:taskId/users          — lista usuarios asignados
// DELETE /api/tasks/:taskId/users/:userId  — quita un usuario de una tarea
router.post('/:taskId/assign',              assignUsersToTask);
router.get('/:taskId/users',               getAssignedUsers);
router.delete('/:taskId/users/:userId',    removeUserFromTask);

export default router;