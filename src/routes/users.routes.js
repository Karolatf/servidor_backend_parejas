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
// ACTUALIZACIÓN — Validaciones con Zod:
//   Se agregó validateSchema en las rutas POST y PUT para proteger
//   la creación y actualización de usuarios con reglas de negocio.

import { Router } from 'express';

import {
    getUsers,
    getUserById,
    getUserByDocumento,
    createUser,
    updateUser,
    deleteUser,
    forceDeleteUser,
    getUserTasks,
    changeUserRole,          // ← nueva función
    changeUserPassword,
    // Importar el nuevo controlador de desactivación lógica
    deactivateUser,
    reactivateUser,
} from '../controller/users.controller.js';

// Se importa el middleware genérico de validación (creado por Sebastián)
import { validateSchema } from '../middlewares/validator.middleware.js';

// Se importan los esquemas de validación para las operaciones de usuarios
import {
    createUserSchema,
    updateUserSchema,
} from '../../schemas/user.schema.js';

import { requireAdmin } from '../middlewares/auth.middleware.js';
import { changeRoleSchema } from '../../schemas/user.schema.js';

import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// ── RUTAS SIN PARÁMETRO DINÁMICO ─────────────────────────────────────────────

// GET  /api/users — lista todos los usuarios del sistema (no requiere validación)
router.get('/', getUsers);

// POST /api/users — crea un usuario nuevo
// validateSchema(createUserSchema) valida documento, name y email antes de crear
router.post('/', validateSchema(createUserSchema), createUser);

// ── RUTAS CON SEGMENTO FIJO AL FINAL (van ANTES de /:id) ─────────────────────

// GET /api/users/by-document/:documento — busca un usuario por su número de documento.
// CRÍTICO: va ANTES de /:id para que Express no interprete "by-document" como un id.
router.get('/by-document/:documento', getUserByDocumento);

// GET /api/users/:userId/tasks — retorna todas las tareas asignadas a un usuario.
// CORRECCIÓN: esta ruta va ANTES de /:id para que Express no interprete
// el segmento "tasks" como el valor del parámetro id.
router.get('/:userId/tasks', getUserTasks);

// ── RUTAS CON PARÁMETRO DINÁMICO /:id (van DESPUÉS de las específicas) ────────

// PATCH /api/users/:id/password — cambio de contraseña del usuario logueado
// verifyToken verifica que la petición viene de un usuario autenticado
// Solo el usuario dueño del token puede cambiar su propia contraseña
router.patch('/:id/password', verifyToken, changeUserPassword);

// GET    /api/users/:id — obtiene un usuario por su id numérico (no requiere validación)
router.get('/:id', getUserById);

// PUT    /api/users/:id — actualiza los datos de un usuario existente
// updateUserSchema usa .partial() — los campos son opcionales pero si vienen, se validan
router.put('/:id', validateSchema(updateUserSchema), updateUser);

// PATCH /api/users/:id/deactivate — desactiva un usuario (is_active = 0)
// Solo el admin puede ejecutar esta acción — requireAdmin verifica el rol del token
// No elimina el usuario ni sus tareas — solo bloquea su acceso al sistema
router.patch('/:id/deactivate',  requireAdmin, deactivateUser);
// Reactivar usuario desactivado — solo admin, mismo patrón que deactivate
router.patch('/:id/reactivate',  requireAdmin, reactivateUser);

// DELETE /api/users/:id — eliminación estándar: borra de la BD si el usuario
// no tiene tareas pendientes/en_progreso. Requiere body { reason } y rol admin.
router.delete('/:id', requireAdmin, deleteUser);

// DELETE /api/users/:id/force — eliminación forzosa sin restricciones de estado ni tareas
// Requiere body { reason } con al menos 10 caracteres para auditoría
// Solo accesible para administradores (requireAdmin)
router.delete('/:id/force', requireAdmin, forceDeleteUser);

// PATCH /api/users/:id/role — cambia el rol de un usuario
// verifyToken ya se aplica en app.js para todas las rutas /api/users
// requireAdmin verifica adicionalmente que el usuario autenticado sea admin
// validateSchema(changeRoleSchema) valida que role sea 'admin' o 'user'
router.patch('/:id/role', requireAdmin, validateSchema(changeRoleSchema), changeUserRole);

export default router;