// MÓDULO: routes/users.routes.js
// CAPA: Rutas (conecta URLs con controladores)
//
// Responsabilidad única: definir qué función del controlador
// maneja cada combinación de método HTTP + ruta de usuarios.
//
// CORRECCIÓN APLICADA EN ESTA VERSIÓN:
//   La ruta GET /:userId/tasks estaba DESPUÉS de GET /:id.
//   Express evalúa las rutas en el orden en que están definidas,
//   y /:id capturaba "tasks" como valor del parámetro id antes
//   de que Express llegara a evaluar /:userId/tasks.
//   Solución: mover /:userId/tasks ANTES de /:id.
//
// REGLA GENERAL:
//   Las rutas con segmentos fijos (como /tasks al final) deben definirse
//   ANTES que las rutas con parámetros dinámicos del mismo nivel (/:id).

import { Router } from 'express';

import {
    getUsers,
    getUserById,
    getUserByDocumento,
    createUser,
    updateUser,
    deleteUser,
    getUserTasks
} from '../controller/users.controller.js';

const router = Router();

// ── RUTAS SIN PARÁMETRO DINÁMICO ─────────────────────────────────────────────

// GET  /api/users — lista todos los usuarios del sistema
router.get('/', getUsers);

// POST /api/users — crea un usuario nuevo
// Cuerpo esperado: { documento, name, email }
router.post('/', createUser);

// ── RUTAS CON SEGMENTO FIJO AL FINAL (van ANTES de /:id) ─────────────────────

// GET /api/users/by-document/:documento — busca un usuario por su número de documento.
// CRÍTICO: va ANTES de /:id para que Express no interprete "by-document" como un id.
// El frontend lo usa en el modo usuario para buscar por documento sin traer todos los usuarios.
router.get('/by-document/:documento', getUserByDocumento);

// GET /api/users/:userId/tasks — retorna todas las tareas asignadas a un usuario.
// CORRECCIÓN: esta ruta va ANTES de /:id para que Express no interprete
// el segmento "tasks" como el valor del parámetro id.
// Si /:id estuviera primero, una petición a /api/users/3/tasks haría
// que Express llamara a getUserById con id="3" y el "/tasks" quedaría
// sin evaluar, devolviendo el usuario en lugar de sus tareas.
router.get('/:userId/tasks', getUserTasks);

// ── RUTAS CON PARÁMETRO DINÁMICO /:id (van DESPUÉS de las específicas) ────────

// GET    /api/users/:id — obtiene un usuario por su id numérico
router.get('/:id', getUserById);

// PUT    /api/users/:id — actualiza los datos de un usuario existente
// Cuerpo esperado: { documento?, name?, email? } (campos opcionales)
router.put('/:id', updateUser);

// DELETE /api/users/:id — elimina un usuario del sistema
router.delete('/:id', deleteUser);

export default router;