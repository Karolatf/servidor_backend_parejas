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
} from '../models/user.model.js';

import { getTasksByUserId } from '../models/task.model.js';

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