// MÓDULO: routes/users.routes.js
// CAPA: Rutas (conecta URLs con controladores)
//
// Responsabilidad única: definir qué función del controlador
// maneja cada combinación de método HTTP + ruta de usuarios.
//
// REGLA CRÍTICA DE ORDEN:
//   Express evalúa las rutas en el orden en que están definidas.
//   Las rutas con segmentos fijos (/deleted, /roles/available, /by-document/:doc)
//   DEBEN ir ANTES de /:id para que Express no las interprete como un parámetro dinámico.
//
// MONTAJE EN app.js:
//   app.use('/api/users', verifyToken, usersRouter)
//   verifyToken está aplicado globalmente — req.usuario está disponible en todos los controladores.

import { Router } from 'express';

// Importamos todos los controladores de usuarios
import {
    getUsers,
    getUserById,
    getUserByDocumento,
    createUser,
    updateUser,
    deleteUser,
    forceDeleteUser,
    softDeleteUserController,
    restoreUserController,
    getDeletedUsersController,
    getUserTasks,
    changeUserRole,
    getUserRolesController,
    addRolToUser,
    removeRolFromUserController,
    getAvailableRoles,
    changeUserPassword,
    deactivateUser,
    reactivateUser,
} from '../controller/users.controller.js';

// Importamos validateSchema que valida req.body con Zod antes de llegar al controlador
import { validateSchema } from '../middlewares/validator.middleware.js';

// Importamos los schemas de validación para las operaciones de usuarios
import {
    createUserSchema,
    updateUserSchema,
    changeRoleSchema,
} from '../../schemas/user.schema.js';

// Importamos los middlewares de autorización por rol
import { requireAdmin, requireAdminOrInstructor, requirePermiso, requireAnyPermiso, verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// ── RUTAS SIN PARÁMETRO DINÁMICO (van PRIMERO) ─────────────────────────────
// Deben ir antes de /:id para que Express no las confunda con parámetros

// GET /api/users — lista todos los usuarios de la BD (excluye deleted_at IS NOT NULL)
// requireAnyPermiso: users.view (admin/instructor) | auditor.usuarios | soporte.sistema
router.get('/', requireAnyPermiso(['users.view', 'auditor.usuarios', 'soporte.sistema']), getUsers);

// GET /api/users/deleted — lista usuarios con soft delete activo (solo admin)
router.get('/deleted', requireAdmin, getDeletedUsersController);

// GET /api/users/roles/available — lista todos los roles del sistema (para el modal de gestión)
// Va antes de /:id para que Express no interprete "roles" como un id
router.get('/roles/available', requireAdmin, getAvailableRoles);

// POST /api/users — crea un usuario nuevo sin contraseña inicial
// requireAdmin: solo el admin puede crear usuarios desde el panel
router.post('/', requireAdmin, validateSchema(createUserSchema), createUser);

// ── RUTAS CON SEGMENTO FIJO AL FINAL (van ANTES de /:id) ───────────────────

// GET /api/users/by-document/:documento — busca un usuario por número de documento
router.get('/by-document/:documento', requireAnyPermiso(['users.view', 'auditor.usuarios', 'soporte.sistema']), getUserByDocumento);

// GET /api/users/:userId/tasks — lista todas las tareas asignadas a un usuario
router.get('/:userId/tasks', requireAnyPermiso(['users.view', 'auditor.usuarios', 'soporte.sistema']), getUserTasks);

// ── RUTAS CON PARÁMETRO DINÁMICO /:id ──────────────────────────────────────

// PATCH /api/users/:id/password — cambia la contraseña del usuario autenticado
// verifyToken explícito para garantizar autenticación en este endpoint
router.patch('/:id/password', verifyToken, changeUserPassword);

// GET /api/users/:id — obtiene un usuario específico por su id numérico
router.get('/:id', requireAnyPermiso(['users.view', 'auditor.usuarios', 'soporte.sistema']), getUserById);

// PUT /api/users/:id — actualiza documento, name y email de un usuario
// Solo el usuario mismo puede actualizar su perfil (verificado en el controlador)
router.put('/:id', validateSchema(updateUserSchema), updateUser);

// PATCH /api/users/:id/deactivate — desactiva un usuario (is_active = 0)
router.patch('/:id/deactivate', requireAdmin, deactivateUser);

// PATCH /api/users/:id/reactivate — reactiva un usuario previamente desactivado
router.patch('/:id/reactivate', requireAdmin, reactivateUser);

// PATCH /api/users/:id/soft-delete — eliminación estándar: soft delete recuperable 30 días
router.patch('/:id/soft-delete', requireAdmin, softDeleteUserController);

// PATCH /api/users/:id/restore — recupera un usuario eliminado con soft delete
router.patch('/:id/restore', requireAdmin, restoreUserController);

// DELETE /api/users/:id — eliminación permanente (sin tareas activas)
router.delete('/:id', requireAdmin, deleteUser);

// DELETE /api/users/:id/force — eliminación forzosa sin restricciones
router.delete('/:id/force', requireAdmin, forceDeleteUser);

// ── GESTIÓN DE ROLES MÚLTIPLES ─────────────────────────────────────────────
// Estas rutas permiten asignar y quitar roles adicionales en la tabla user_roles

// PATCH /api/users/:id/role — cambia el rol primario del usuario (users.role)
// validateSchema valida que role sea 'admin', 'user' o 'instructor'
router.patch('/:id/role', requireAdmin, validateSchema(changeRoleSchema), changeUserRole);

// GET /api/users/:id/roles — lista todos los roles asignados a un usuario
router.get('/:id/roles', requireAdmin, getUserRolesController);

// POST /api/users/:id/roles — agrega un rol adicional al usuario en user_roles
router.post('/:id/roles', requireAdmin, addRolToUser);

// DELETE /api/users/:id/roles/:roleName — elimina un rol adicional del usuario
// No puede eliminar el rol primario (verificado en el controlador)
router.delete('/:id/roles/:roleName', requireAdmin, removeRolFromUserController);

export default router;
