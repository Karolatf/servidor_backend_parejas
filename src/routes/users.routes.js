// MODULO: routes/users.routes.js
// CAPA: Rutas (conecta URLs con controladores)
//
// Responsabilidad unica: definir que funcion del controlador
// maneja cada combinacion de metodo HTTP + ruta de usuarios.
//
// REGLA CRITICA DE ORDEN:
//   Express evalua las rutas en el orden en que estan definidas.
//   Las rutas con segmentos fijos (/deleted, /roles/available, /by-document/:doc)
//   DEBEN ir ANTES de /:id para que Express no las interprete como un parametro dinamico.
//
// MONTAJE EN app.js:
//   app.use('/api/users', verifyToken, usersRouter)
//   verifyToken esta aplicado globalmente  req.usuario esta disponible en todos los controladores.

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
    getRolePermissionsController,
    getUserExtraPermissionsController,
    updateUserExtraPermissionsController,
} from '../controller/users.controller.js';

// Importamos validateSchema que valida req.body con Zod antes de llegar al controlador
import { validateSchema } from '../middlewares/validator.middleware.js';

// Importamos los schemas de validacion para las operaciones de usuarios
import {
    createUserSchema,
    updateUserSchema,
    changeRoleSchema,
} from '../../schemas/user.schema.js';

// Importamos los middlewares de autorizacion por rol
import { requireAdmin, requireAdminOrInstructor, requirePermiso, requireAnyPermiso, verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// ── RUTAS SIN PARAMETRO DINAMICO (van PRIMERO) ─────────────────────────────
// Deben ir antes de /:id para que Express no las confunda con parametros

// GET /api/users  lista todos los usuarios de la BD (excluye deleted_at IS NOT NULL)
// requireAnyPermiso: users.view (admin/instructor) | auditor.usuarios | soporte.sistema
router.get('/', requireAnyPermiso(['users.view', 'auditor.usuarios', 'soporte.sistema']), getUsers);

// GET /api/users/deleted  lista usuarios con soft delete activo (solo admin)
router.get('/deleted', requireAdmin, getDeletedUsersController);

// GET /api/users/roles/available  lista todos los roles del sistema (para el modal de gestion)
// Va antes de /:id para que Express no interprete "roles" como un id
router.get('/roles/available', requireAdmin, getAvailableRoles);

// GET /api/users/roles/:roleName/permissions  permisos disponibles de un rol (checkbox UI)
router.get('/roles/:roleName/permissions', requireAdmin, getRolePermissionsController);

// POST /api/users  crea un usuario nuevo sin contrasena inicial
// requireAdmin: solo el admin puede crear usuarios desde el panel
router.post('/', requireAdmin, validateSchema(createUserSchema), createUser);

// ── RUTAS CON SEGMENTO FIJO AL FINAL (van ANTES de /:id) ───────────────────

// GET /api/users/by-document/:documento  busca un usuario por numero de documento
router.get('/by-document/:documento', requireAnyPermiso(['users.view', 'auditor.usuarios', 'soporte.sistema']), getUserByDocumento);

// GET /api/users/:userId/tasks  lista todas las tareas asignadas a un usuario
router.get('/:userId/tasks', requireAnyPermiso(['users.view', 'auditor.usuarios', 'soporte.sistema']), getUserTasks);

// ── RUTAS CON PARAMETRO DINAMICO /:id ──────────────────────────────────────

// PATCH /api/users/:id/password  cambia la contrasena del usuario autenticado
// verifyToken explicito para garantizar autenticacion en este endpoint
router.patch('/:id/password', verifyToken, changeUserPassword);

// GET /api/users/:id  obtiene un usuario especifico por su id numerico
router.get('/:id', requireAnyPermiso(['users.view', 'auditor.usuarios', 'soporte.sistema']), getUserById);

// PUT /api/users/:id  actualiza documento, name y email de un usuario
// Solo el usuario mismo puede actualizar su perfil (verificado en el controlador)
router.put('/:id', validateSchema(updateUserSchema), updateUser);

// PATCH /api/users/:id/deactivate  desactiva un usuario (is_active = 0)
router.patch('/:id/deactivate', requireAdmin, deactivateUser);

// PATCH /api/users/:id/reactivate  reactiva un usuario previamente desactivado
router.patch('/:id/reactivate', requireAdmin, reactivateUser);

// PATCH /api/users/:id/soft-delete  eliminacion estandar: soft delete recuperable 30 dias
router.patch('/:id/soft-delete', requireAdmin, softDeleteUserController);

// PATCH /api/users/:id/restore  recupera un usuario eliminado con soft delete
router.patch('/:id/restore', requireAdmin, restoreUserController);

// DELETE /api/users/:id  eliminacion permanente (sin tareas activas)
router.delete('/:id', requireAdmin, deleteUser);

// DELETE /api/users/:id/force  eliminacion forzosa sin restricciones
router.delete('/:id/force', requireAdmin, forceDeleteUser);

// ── GESTION DE ROLES MULTIPLES ─────────────────────────────────────────────
// Estas rutas permiten asignar y quitar roles adicionales en la tabla user_roles

// PATCH /api/users/:id/role  cambia el rol primario del usuario (users.role)
// validateSchema valida que role sea 'admin', 'user' o 'instructor'
router.patch('/:id/role', requireAdmin, validateSchema(changeRoleSchema), changeUserRole);

// GET /api/users/:id/roles  lista todos los roles asignados a un usuario
// verifyToken: cualquier usuario autenticado puede consultar roles (propio o de estudiantes)
// El estudiante lo llama para ver sus propios roles en el hero; el instructor para los badges
router.get('/:id/roles', getUserRolesController);

// POST /api/users/:id/roles  asigna un rol secundario con permisos seleccionados
// Cuerpo: { roleName, permissions: ['perm1', ...] }
router.post('/:id/roles', requireAdmin, addRolToUser);

// GET /api/users/:id/extra-permissions  permisos extra (secundarios) del usuario
router.get('/:id/extra-permissions', requireAdmin, getUserExtraPermissionsController);

// PUT /api/users/:id/extra-permissions  reemplaza todos los permisos extra del usuario
router.put('/:id/extra-permissions', requireAdmin, updateUserExtraPermissionsController);

// DELETE /api/users/:id/roles/:roleName  elimina un rol adicional del usuario
// No puede eliminar el rol primario (verificado en el controlador)
router.delete('/:id/roles/:roleName', requireAdmin, removeRolFromUserController);

export default router;
