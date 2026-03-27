// MÓDULO: routes/users.routes.js
// CAPA: Rutas (conecta URLs con controladores)

// Responsabilidad única: definir qué función del controlador
// maneja cada combinación de método HTTP + ruta de usuarios.

import { Router } from 'express';

import {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserTasks
} from '../controller/users.controller.js';

const router = Router();

// GET    /api/users      — lista todos los usuarios
// POST   /api/users      — crea un usuario nuevo
router.get('/',  getUsers);
router.post('/', createUser);

// GET    /api/users/:id  — obtiene un usuario por id
// PUT    /api/users/:id  — actualiza un usuario
// DELETE /api/users/:id  — elimina un usuario
router.get('/:id',    getUserById);
router.put('/:id',    updateUser);
router.delete('/:id', deleteUser);

// GET /api/users/:userId/tasks — tareas asignadas a un usuario
// :userId en lugar de :id para diferenciarlo del parámetro de usuario
router.get('/:userId/tasks', getUserTasks);

export default router;