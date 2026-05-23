// MODULO: controller/users.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)
//
// Responsabilidad unica: manejar las peticiones HTTP de usuarios.
// NUNCA maneja datos directamente  solo recibe req, llama el modelo y responde res.

// Importamos catchAsync para capturar errores async sin bloques try/catch manuales
import { catchAsync }                     from '../utils/catchAsync.js';
// Importamos successResponse y errorResponse para respuestas con formato estandar
import { successResponse, errorResponse } from '../utils/response.util.js';

// Importamos las funciones del modelo con alias descriptivos para mayor legibilidad
import {
    getAllUsers,
    getUserById         as findUserById,
    getUserByDocumento  as findUserByDocumento,
    createUser          as insertUser,
    updateUser          as modifyUser,
    deleteUser          as removeUser,
    softDeleteUser,
    restoreUser,
    getDeletedUsers,
    updateUserRole,
    getUserRoles        as findUserRoles,
    assignRolToUser,
    removeRolFromUser,
    getAllRoles,
    deactivateUser      as disableUser,
    countUserActiveTasks,
    reactivateUser      as enableUser,
    updateUserPassword,
    getPermissionsByRoleName,
    setUserExtraPermissions,
    getUserExtraPermissions,
} from '../models/user.model.js';

// Importamos getTasksByUserId para traer las tareas de un usuario especifico
import { getTasksByUserId } from '../models/task.model.js';

// Importamos bcrypt para comparar la contrasena actual antes de permitir el cambio
import bcrypt from 'bcryptjs';

// ── GET /api/users ────────────────────────────────────────────────────────────
// Devuelve todos los usuarios del sistema  solo admin e instructor pueden acceder
export const getUsers = catchAsync(async (req, res) => {
    const usuarios = await getAllUsers();
    return successResponse(res, 'Usuarios obtenidos correctamente', usuarios);
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────
// Busca y devuelve un usuario por su id numerico
export const getUserById = catchAsync(async (req, res) => {
    const { id }  = req.params;
    const usuario = await findUserById(id);

    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    return successResponse(res, 'Usuario encontrado', usuario);
});

// ── POST /api/users ───────────────────────────────────────────────────────────
// Crea un usuario nuevo desde el panel admin sin contrasena inicial
// El modelo tambien agrega el rol 'user' en user_roles para el sistema RBAC
// Cuerpo esperado: { documento, name, email }
export const createUser = catchAsync(async (req, res) => {
    const { documento, name, email } = req.body;
    const nuevoUsuario = await insertUser({ documento, name, email });
    return successResponse(res, 'Usuario creado correctamente', nuevoUsuario, 201);
});

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
// Actualiza los datos de un usuario existente (documento, name, email)
// El modelo tiene lista blanca CAMPOS_ACTUALIZABLES  no se puede cambiar role ni password por aqui
export const updateUser = catchAsync(async (req, res) => {
    const { id }             = req.params;
    const campos             = req.body;
    const usuarioActualizado = await modifyUser(id, campos);

    if (!usuarioActualizado) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    return successResponse(res, 'Usuario actualizado correctamente', usuarioActualizado);
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
// Eliminacion estandar: borra el usuario solo si no tiene tareas activas (pendiente/en_progreso)
// Requiere body { reason } con al menos 10 caracteres para auditoria
export const deleteUser = catchAsync(async (req, res) => {
    const { id }     = req.params;
    const { reason } = req.body;

    if (!reason || String(reason).trim().length < 10) {
        return errorResponse(
            res,
            'El motivo de eliminación es obligatorio y debe tener al menos 10 caracteres',
            400
        );
    }

    const usuario = await findUserById(id);
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Regla de negocio: no se puede eliminar si tiene tareas pendientes o en progreso
    const tareasActivas = await countUserActiveTasks(id);
    if (tareasActivas > 0) {
        return errorResponse(
            res,
            `No se puede eliminar a ${usuario.name}: tiene ${tareasActivas} tarea(s) pendiente(s) o en progreso. Completa las tareas primero o usa el cierre forzoso.`,
            400
        );
    }

    await removeUser(id);

    return successResponse(
        res,
        `Usuario "${usuario.name}" eliminado correctamente. Motivo: ${String(reason).trim()}`
    );
});

// ── GET /api/users/by-document/:documento ─────────────────────────────────────
// Busca un usuario por su numero de documento de identidad
// Va ANTES de /:id en las rutas para que Express no interprete "by-document" como un id
export const getUserByDocumento = catchAsync(async (req, res) => {
    const { documento } = req.params;
    const usuario       = await findUserByDocumento(documento);

    if (!usuario) {
        return errorResponse(
            res,
            `No existe un usuario con el documento ${documento}`,
            404
        );
    }

    return successResponse(res, 'Usuario encontrado', usuario);
});

// ── GET /api/users/:userId/tasks ───────────────────────────────────────────────
// Devuelve todas las tareas asignadas a un usuario especifico
export const getUserTasks = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const tareas     = await getTasksByUserId(userId);
    return successResponse(res, 'Tareas del usuario obtenidas correctamente', tareas);
});

// ── PATCH /api/users/:id/role ─────────────────────────────────────────────────
// Cambia el rol primario de un usuario entre 'admin', 'instructor' y 'user'
// El modelo actualiza users.role y sincroniza user_roles para el sistema RBAC
// Solo admin puede ejecutar esta accion (requireAdmin en la ruta)
export const changeUserRole = catchAsync(async (req, res) => {
    const { id }   = req.params;
    const { role } = req.body;

    const usuarioActualizado = await updateUserRole(id, role);

    if (!usuarioActualizado) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    const { password: _ignorado, ...usuarioSinPassword } = usuarioActualizado;

    return successResponse(
        res,
        `Rol primario de ${usuarioActualizado.name} actualizado a '${role}' correctamente`,
        usuarioSinPassword
    );
});

// ── GET /api/users/:id/roles ──────────────────────────────────────────────────
// Devuelve todos los roles asignados a un usuario (arreglo de slugs)
// Se usa en el modal de gestion de roles del panel admin
export const getUserRolesController = catchAsync(async (req, res) => {
    const { id }  = req.params;
    const usuario = await findUserById(id);

    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    const roles = await findUserRoles(id);
    return successResponse(res, 'Roles del usuario obtenidos correctamente', roles);
});

// ── POST /api/users/:id/roles ─────────────────────────────────────────────────
// Asigna un rol secundario a un usuario con los permisos especificamente seleccionados.
// Cuerpo esperado: { roleName: 'auditor', permissions: ['auditor.reportes', ...] }
// Los permisos seleccionados se guardan en user_extra_permissions y se incluyen en el JWT.
export const addRolToUser = catchAsync(async (req, res) => {
    const { id }                          = req.params;
    const { roleName, permissions = [] }  = req.body;

    if (!roleName) {
        return errorResponse(res, 'El nombre del rol es obligatorio', 400);
    }

    const rolesValidos = ['admin', 'instructor', 'user', 'auditor', 'comunicador', 'soporte'];
    if (!rolesValidos.includes(roleName)) {
        return errorResponse(res, `El rol '${roleName}' no existe. Los roles válidos son: ${rolesValidos.join(', ')}`, 400);
    }

    const usuario = await findUserById(id);
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Agregar el rol a user_roles (sin cambiar el rol primario)
    await assignRolToUser(id, roleName);

    // Guardar los permisos seleccionados en user_extra_permissions.
    // Reemplaza los permisos de ESTE rol y conserva los de otros roles adicionales.
    const permisosDelRol   = await getPermissionsByRoleName(roleName);
    const codigosDelRol    = new Set(permisosDelRol.map(p => p.code));
    const actuales         = await getUserExtraPermissions(id);
    const deOtrosRoles     = actuales.filter(p => !codigosDelRol.has(p.code)).map(p => p.code);
    const codigos          = [...new Set([...deOtrosRoles, ...permissions])];
    await setUserExtraPermissions(id, codigos);

    const rolesActualizados = await findUserRoles(id);
    const permisosExtra      = await getUserExtraPermissions(id);

    return successResponse(
        res,
        `Rol '${roleName}' asignado a ${usuario.name} con ${permissions.length} permiso(s) seleccionado(s)`,
        { userId: Number(id), roles: rolesActualizados, permisosExtra }
    );
});

// ── GET /api/users/roles/:roleName/permissions ────────────────────────────────
// Retorna los permisos disponibles de un rol para mostrarselos al admin
// en el panel de "Gestionar Roles" (checkbox UI)
export const getRolePermissionsController = catchAsync(async (req, res) => {
    const { roleName } = req.params;
    const rolesValidos = ['admin', 'instructor', 'user', 'auditor', 'comunicador', 'soporte'];

    if (!rolesValidos.includes(roleName)) {
        return errorResponse(res, `Rol '${roleName}' no existe`, 400);
    }

    const permisos = await getPermissionsByRoleName(roleName);
    return successResponse(res, `Permisos del rol '${roleName}' obtenidos`, permisos);
});

// ── GET /api/users/:id/extra-permissions ──────────────────────────────────────
// Retorna los permisos extra (secundarios) asignados a un usuario
export const getUserExtraPermissionsController = catchAsync(async (req, res) => {
    const { id } = req.params;
    const usuario = await findUserById(id);
    if (!usuario) return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);

    const permisos = await getUserExtraPermissions(id);
    return successResponse(res, 'Permisos extra del usuario obtenidos', permisos);
});

// ── PUT /api/users/:id/extra-permissions ─────────────────────────────────────
// Reemplaza TODOS los permisos extra de un usuario (util para guardar cambios del panel)
// Cuerpo esperado: { permissions: ['auditor.reportes', 'soporte.sistema', ...] }
export const updateUserExtraPermissionsController = catchAsync(async (req, res) => {
    const { id }                          = req.params;
    const { permissions = [] }            = req.body;

    const usuario = await findUserById(id);
    if (!usuario) return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);

    await setUserExtraPermissions(id, permissions);
    const permisosActualizados = await getUserExtraPermissions(id);

    return successResponse(
        res,
        `Permisos extra de ${usuario.name} actualizados (${permisosActualizados.length} permiso(s))`,
        { userId: Number(id), permisosExtra: permisosActualizados }
    );
});

// ── DELETE /api/users/:id/roles/:roleName ─────────────────────────────────────
// Elimina un rol adicional de un usuario en la tabla user_roles
// No permite eliminar el rol primario (el que esta en users.role)
export const removeRolFromUserController = catchAsync(async (req, res) => {
    const { id, roleName } = req.params;

    const usuario = await findUserById(id);
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // No se puede eliminar el rol primario del usuario  debe cambiarse via PATCH /role
    if (usuario.role === roleName) {
        return errorResponse(
            res,
            `No se puede eliminar el rol primario '${roleName}'. Cambia el rol primario primero usando la opción 'Cambiar rol'.`,
            400
        );
    }

    await removeRolFromUser(id, roleName);
    const rolesActualizados = await findUserRoles(id);

    return successResponse(
        res,
        `Rol '${roleName}' eliminado de ${usuario.name} correctamente`,
        { userId: Number(id), roles: rolesActualizados }
    );
});

// ── GET /api/users/roles/available ────────────────────────────────────────────
// Devuelve todos los roles disponibles en el sistema con sus metadatos
// Se usa en el modal de gestion de roles para mostrar las opciones al admin
export const getAvailableRoles = catchAsync(async (req, res) => {
    const roles = await getAllRoles();
    return successResponse(res, 'Roles disponibles obtenidos correctamente', roles);
});

// ── PATCH /api/users/:id/password ─────────────────────────────────────────────
// Permite al usuario logueado cambiar su propia contrasena desde el panel Mi Perfil
// El controlador verifica que req.usuario.id coincida con req.params.id
// Cuerpo esperado: { currentPassword, newPassword }
export const changeUserPassword = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return errorResponse(res, 'La contraseña actual y la nueva contraseña son obligatorias', 400);
    }

    if (newPassword.length < 8) {
        return errorResponse(res, 'La nueva contraseña debe tener al menos 8 caracteres', 400);
    }

    // Verificamos que el usuario del token sea el mismo que el id de la URL
    if (Number(req.usuario.id) !== Number(id)) {
        return errorResponse(res, 'No tienes permiso para cambiar la contraseña de otro usuario', 403);
    }

    const usuario = await findUserById(Number(id));
    if (!usuario) {
        return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Comparamos la contrasena actual con el hash guardado en la BD
    const passwordCorrecta = await bcrypt.compare(currentPassword, usuario.password);
    if (!passwordCorrecta) {
        return errorResponse(res, 'La contraseña actual es incorrecta', 400);
    }

    const SALT_ROUNDS             = 10;
    const nuevaPasswordHasheada   = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await updateUserPassword(Number(id), nuevaPasswordHasheada);

    return successResponse(res, 'Contraseña actualizada correctamente', null);
});

// ── PATCH /api/users/:id/deactivate ───────────────────────────────────────────
// Desactiva logicamente al usuario (is_active = 0) sin eliminarlo de la BD
// Regla de negocio: no se puede desactivar si tiene tareas pendientes o en progreso
// Solo admin puede ejecutar esta accion
export const deactivateUser = catchAsync(async (req, res) => {
    const { id }     = req.params;
    const { reason } = req.body;

    const usuario = await findUserById(id);
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    if (usuario.is_active === 0 || usuario.is_active === false) {
        return errorResponse(res, 'El usuario ya está desactivado', 400);
    }

    const tareasActivas = await countUserActiveTasks(id);
    if (tareasActivas > 0) {
        return errorResponse(
            res,
            `No se puede desactivar a ${usuario.name}: tiene ${tareasActivas} tarea(s) pendiente(s) o en progreso. Deben completarse primero.`,
            400
        );
    }

    const usuarioDesactivado = await disableUser(id, reason || null);
    if (!usuarioDesactivado) {
        return errorResponse(res, 'Error al desactivar el usuario', 500);
    }

    return successResponse(
        res,
        `Usuario "${usuarioDesactivado.name}" desactivado correctamente`,
        usuarioDesactivado
    );
});

// ── PATCH /api/users/:id/reactivate ───────────────────────────────────────────
// Reactiva a un usuario previamente desactivado (is_active = 0 → 1)
// Solo admin puede ejecutar esta accion
export const reactivateUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    const usuario = await findUserById(id);
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    if (usuario.is_active === 1 || usuario.is_active === true) {
        return errorResponse(res, 'El usuario ya está activo', 400);
    }

    const usuarioReactivado = await enableUser(id);
    if (!usuarioReactivado) {
        return errorResponse(res, 'Error al reactivar el usuario', 500);
    }

    return successResponse(
        res,
        `Usuario "${usuarioReactivado.name}" reactivado correctamente`,
        usuarioReactivado
    );
});

// ── DELETE /api/users/:id/force ────────────────────────────────────────────────
// Eliminacion forzosa: borra al usuario sin verificar estado ni tareas pendientes
// Solo admin puede ejecutar esta accion
// Requiere body { reason } con al menos 10 caracteres de auditoria
export const forceDeleteUser = catchAsync(async (req, res) => {
    const { id }     = req.params;
    const { reason } = req.body;

    if (!reason || String(reason).trim().length < 10) {
        return errorResponse(
            res,
            'El motivo de eliminación es obligatorio y debe tener al menos 10 caracteres',
            400
        );
    }

    const usuario = await findUserById(id);
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Eliminamos el usuario  las filas en task_users quedan con user_id = NULL (ON DELETE SET NULL)
    // El user_name_snapshot preserva el nombre en el historial de tareas
    await removeUser(id);

    return successResponse(
        res,
        `Usuario "${usuario.name}" eliminado forzosamente. Motivo: ${String(reason).trim()}`
    );
});

// ── PATCH /api/users/:id/soft-delete ──────────────────────────────────────────
// Eliminacion estandar: marca deleted_at  recuperable dentro de 30 dias
export const softDeleteUserController = catchAsync(async (req, res) => {
    const { id }     = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
        return errorResponse(res, 'El motivo de eliminación debe tener al menos 10 caracteres', 400);
    }

    const usuario = await softDeleteUser(Number(id), reason.trim());
    if (!usuario) return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);

    return successResponse(
        res,
        `Usuario "${usuario.name}" eliminado. Puede recuperarse en los próximos 30 días.`,
        usuario
    );
});

// ── PATCH /api/users/:id/restore ──────────────────────────────────────────────
// Recupera un usuario eliminado con soft delete (solo si no pasaron 30 dias)
export const restoreUserController = catchAsync(async (req, res) => {
    const { id }  = req.params;
    const usuario = await restoreUser(Number(id));

    if (!usuario) {
        return errorResponse(
            res,
            'No se puede recuperar este usuario (no existe, no fue eliminado o el plazo de 30 días expiró)',
            404
        );
    }

    return successResponse(res, `Usuario "${usuario.name}" recuperado correctamente`, usuario);
});

// ── GET /api/users/deleted ─────────────────────────────────────────────────────
// Lista todos los usuarios con soft delete activo (solo admin)
export const getDeletedUsersController = catchAsync(async (req, res) => {
    const usuarios = await getDeletedUsers();
    return successResponse(res, 'Usuarios eliminados obtenidos', usuarios);
});
