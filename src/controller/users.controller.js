// MÓDULO: controller/users.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)
//
// Responsabilidad única: manejar las peticiones HTTP de usuarios.
// NUNCA maneja datos directamente — solo recibe req, llama el modelo y responde res.
//
// REFACTORIZACIÓN APLICADA:
//   Se eliminaron todos los bloques try/catch manuales y las líneas
//   res.status().json() directas. Ahora se usan:
//   - catchAsync: para capturar errores async automáticamente
//   - successResponse: para respuestas exitosas con formato estándar
//   - errorResponse: para respuestas de error con formato estándar

import { catchAsync }                     from '../utils/catchAsync.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

import {
    getAllUsers,
    getUserById         as findUserById,
    getUserByDocumento  as findUserByDocumento,
    createUser          as insertUser,
    updateUser          as modifyUser,
    deleteUser          as removeUser,
    updateUserRole,                          // ← nueva función
    // Funciones nuevas para la desactivación lógica de usuario
    deactivateUser      as disableUser,     // marca is_active = 0 en la BD
    countUserActiveTasks,                   // cuenta tareas pendientes/en_progreso del usuario
} from '../models/user.model.js';

import { getTasksByUserId } from '../models/task.model.js';

import bcrypt from 'bcryptjs';
import { updateUserPassword } from '../models/user.model.js';

// GET /api/users
// Retorna todos los usuarios con el formato estándar { success, message, data }
export const getUsers = catchAsync(async (req, res) => {
    const usuarios = await getAllUsers();
    return successResponse(res, 'Usuarios obtenidos correctamente', usuarios);
});

// GET /api/users/:id
// Retorna un usuario por su id o 404 si no existe
export const getUserById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const usuario = await findUserById(id);

    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    return successResponse(res, 'Usuario encontrado', usuario);
});

// POST /api/users
// Crea un usuario nuevo
// Cuerpo esperado: { documento, name, email }
// NOTA: la validación de campos obligatorios y formatos la realiza
// el middleware validateSchema(createUserSchema) antes de llegar aquí.
// El controlador solo recibe datos ya validados y limpios.
export const createUser = catchAsync(async (req, res) => {
    const { documento, name, email } = req.body;
    const nuevoUsuario = await insertUser({ documento, name, email });
    return successResponse(res, 'Usuario creado correctamente', nuevoUsuario, 201);
});

// PUT /api/users/:id
// Actualiza los datos de un usuario existente
// El modelo solo permite actualizar: documento, name, email
export const updateUser = catchAsync(async (req, res) => {
    const { id }             = req.params;
    const campos             = req.body;
    const usuarioActualizado = await modifyUser(id, campos);

    if (!usuarioActualizado) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    return successResponse(res, 'Usuario actualizado correctamente', usuarioActualizado);
});

// DELETE /api/users/:id
// Elimina un usuario y retorna confirmación
export const deleteUser = catchAsync(async (req, res) => {
    const { id }           = req.params;
    const usuarioEliminado = await removeUser(id);

    if (!usuarioEliminado) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    return successResponse(
        res,
        `Usuario "${usuarioEliminado.name}" eliminado correctamente`
    );
});

// GET /api/users/by-document/:documento
// Busca un usuario por su número de documento
// Va ANTES de /:id en las rutas para que Express no capture "by-document" como id
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

// GET /api/users/:userId/tasks
// Retorna todas las tareas asignadas a un usuario específico
export const getUserTasks = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const tareas     = await getTasksByUserId(userId);
    return successResponse(res, 'Tareas del usuario obtenidas correctamente', tareas);
});

// ── PATCH /api/users/:id/role ────────────────────────────────────────────────
// Cambia el rol de un usuario entre 'admin' y 'user'.
// Solo accesible para usuarios autenticados con role = 'admin'.
// (El middleware requireAdmin verifica esto antes de que llegue aquí.)
//
// Cuerpo esperado (validado por validateSchema(changeRoleSchema)):
//   { role: 'admin' | 'user' }
//
// Respuesta exitosa 200: { success, message, data: usuario sin password }
// Error 404: el id no existe
export const changeUserRole = catchAsync(async (req, res) => {
    const { id }       = req.params;
    const { role }     = req.body;

    // updateUserRole actualiza solo el campo role en MySQL
    // Retorna el usuario actualizado, o null si el id no existe
    const usuarioActualizado = await updateUserRole(id, role);

    if (!usuarioActualizado) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Construir la respuesta sin el campo password
    // Se usa desestructuración para excluir el campo sensible antes de enviar
    const { password: _ignorado, ...usuarioSinPassword } = usuarioActualizado;

    return successResponse(
        res,
        `Rol de ${usuarioActualizado.name} actualizado a '${role}' correctamente`,
        usuarioSinPassword
    );
});

// ── PATCH /api/users/:id/password ────────────────────────────────────────────
// Cambio de contraseña desde el panel del usuario logueado.
// Solo el usuario dueño del token puede cambiar su propia contraseña.
//
// Cuerpo esperado: { currentPassword, newPassword }
// Respuesta 200: contraseña actualizada correctamente
// Respuesta 400: contraseña actual incorrecta o datos inválidos
// Respuesta 403: el usuario intenta cambiar la contraseña de otro usuario
export const changeUserPassword = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
 
    // Validar que llegaron los campos necesarios
    if (!currentPassword || !newPassword) {
        return errorResponse(res, 'La contraseña actual y la nueva contraseña son obligatorias', 400);
    }
 
    // Validar longitud mínima de la nueva contraseña
    if (newPassword.length < 6) {
        return errorResponse(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
    }
 
    // Solo el usuario logueado puede cambiar su propia contraseña
    // req.usuario.id viene del token JWT verificado por verifyToken
    if (Number(req.usuario.id) !== Number(id)) {
        return errorResponse(res, 'No tienes permiso para cambiar la contraseña de otro usuario', 403);
    }
 
    // Obtener el usuario completo (incluyendo el hash de la contraseña)
    const usuario = await findUserById(Number(id));
    if (!usuario) {
        return errorResponse(res, 'Usuario no encontrado', 404);
    }
 
    // Verificar que la contraseña actual sea correcta con bcrypt
    const passwordCorrecta = await bcrypt.compare(currentPassword, usuario.password);
    if (!passwordCorrecta) {
        return errorResponse(res, 'La contraseña actual es incorrecta', 400);
    }
 
    // Hashear la nueva contraseña antes de guardarla
    const SALT_ROUNDS = 10;
    const nuevaPasswordHasheada = await bcrypt.hash(newPassword, SALT_ROUNDS);
 
    // Actualizar la contraseña en la BD
    await updateUserPassword(Number(id), nuevaPasswordHasheada);
 
    return successResponse(res, 'Contraseña actualizada correctamente', null);
});

// ── DESACTIVAR USUARIO ────────────────────────────────────────────────────────
// PATCH /api/users/:id/deactivate
//
// Regla de negocio: un usuario solo puede desactivarse si NO tiene tareas
// con estado 'pendiente' o 'en_progreso'. Si las tiene, se rechaza con 400.
//
// El usuario desactivado sigue existiendo en la BD (is_active = 0).
// Sus tareas NO se eliminan — solo pierde acceso al sistema.
// Solo el admin puede ejecutar esta acción (requireAdmin en la ruta).
//
// Flujo:
//   1. Verificar que el usuario existe → 404 si no
//   2. Contar tareas activas del usuario → 400 si tiene pendientes/en_progreso
//   3. Desactivar (UPDATE is_active = 0) → 200 con el usuario actualizado
export const deactivateUser = catchAsync(async (req, res) => {
    // 1. Leer el id del parámetro de la URL (/api/users/5/deactivate → id = 5)
    const { id } = req.params;

    // 2. Verificar que el usuario existe en la BD antes de seguir
    const usuario = await findUserById(id);
    // findUserById retorna undefined si no encuentra el id — respondemos 404
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // 3. Verificar si el usuario ya está desactivado para evitar operaciones redundantes
    // is_active puede llegar como número (1/0) o booleano según la versión de mysql2
    if (usuario.is_active === 0 || usuario.is_active === false) {
        return errorResponse(res, 'El usuario ya está desactivado', 400);
    }

    // 4. Contar cuántas tareas activas tiene el usuario (pendiente + en_progreso)
    // Si el conteo es mayor a 0, no se puede desactivar — regla de negocio
    const tareasActivas = await countUserActiveTasks(id);
    if (tareasActivas > 0) {
        return errorResponse(
            res,
            `No se puede desactivar a ${usuario.name}: tiene ${tareasActivas} tarea(s) pendiente(s) o en progreso. Deben completarse primero.`,
            400
        );
    }

    // 5. Desactivar al usuario — disableUser hace UPDATE is_active = 0
    const usuarioDesactivado = await disableUser(id);
    // Si disableUser retorna null algo salió mal en el UPDATE
    if (!usuarioDesactivado) {
        return errorResponse(res, 'Error al desactivar el usuario', 500);
    }

    // 6. Responder con éxito y el objeto actualizado del usuario
    return successResponse(
        res,
        `Usuario "${usuarioDesactivado.name}" desactivado correctamente`,
        usuarioDesactivado
    );
});