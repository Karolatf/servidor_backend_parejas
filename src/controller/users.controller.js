// MÓDULO: controller/users.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)
//
// Responsabilidad única: manejar las peticiones HTTP de usuarios.
// NUNCA maneja datos directamente — solo recibe req, llama el modelo y responde res.

// Importamos catchAsync para capturar errores async sin try/catch manuales
import { catchAsync }                     from '../utils/catchAsync.js';
// Importamos successResponse y errorResponse para respuestas con formato estándar
import { successResponse, errorResponse } from '../utils/response.util.js';

// Importamos las funciones del modelo con alias descriptivos para mayor legibilidad
import {
    getAllUsers,
    getUserById         as findUserById,         // buscar un usuario por su id numérico
    getUserByDocumento  as findUserByDocumento,   // buscar un usuario por número de documento
    createUser          as insertUser,            // insertar un usuario sin password (panel admin)
    updateUser          as modifyUser,            // actualizar campos de un usuario existente
    deleteUser          as removeUser,            // eliminar un usuario permanentemente
    updateUserRole,                               // cambiar solo el campo role del usuario
    deactivateUser      as disableUser,           // marcar is_active = 0 en la BD (desactivación lógica)
    countUserActiveTasks,                         // contar tareas pendientes/en_progreso del usuario
    reactivateUser      as enableUser,            // marcar is_active = 1 en la BD (reactivación)
} from '../models/user.model.js';

// Importamos getTasksByUserId para traer las tareas de un usuario específico
// Importamos registrarNombreUsuarioEliminado para preservar el nombre en tareas antes de borrar el usuario
import { getTasksByUserId, registrarNombreUsuarioEliminado } from '../models/task.model.js';

// Importamos bcrypt para comparar la contraseña actual antes de permitir el cambio
import bcrypt from 'bcryptjs';
// Importamos updateUserPassword para actualizar solo el campo password en la BD
import { updateUserPassword } from '../models/user.model.js';

// ── GET /api/users ────────────────────────────────────────────────────────────
// Devuelve todos los usuarios del sistema — solo admin e instructor pueden acceder
export const getUsers = catchAsync(async (req, res) => {
    // Llamamos a getAllUsers que trae todos los registros de la tabla users de MySQL
    const usuarios = await getAllUsers();
    // Enviamos el arreglo de usuarios al cliente con el mensaje de éxito
    return successResponse(res, 'Usuarios obtenidos correctamente', usuarios);
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────
// Busca y devuelve un usuario por su id numérico
export const getUserById = catchAsync(async (req, res) => {
    // Sacamos el id del parámetro de la URL — por ejemplo /api/users/5 nos da id = '5'
    const { id } = req.params;
    // Buscamos el usuario en MySQL por su id — retorna el objeto completo o undefined si no existe
    const usuario = await findUserById(id);

    // Si findUserById retornó undefined significa que no existe ningún usuario con ese id
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Llegamos aquí porque el usuario existe — lo enviamos completo al cliente
    return successResponse(res, 'Usuario encontrado', usuario);
});

// ── POST /api/users ───────────────────────────────────────────────────────────
// Crea un usuario nuevo desde el panel admin sin contraseña inicial
// Cuerpo esperado: { documento, name, email }
// La validación de los campos la hace validateSchema(createUserSchema) antes de llegar aquí
export const createUser = catchAsync(async (req, res) => {
    // Sacamos los tres campos obligatorios del cuerpo ya validado por Zod
    const { documento, name, email } = req.body;
    // Llamamos a insertUser que crea el usuario en MySQL sin password ni role (quedan con defaults)
    const nuevoUsuario = await insertUser({ documento, name, email });
    // Respondemos con 201 Created y el objeto del usuario recién creado
    return successResponse(res, 'Usuario creado correctamente', nuevoUsuario, 201);
});

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
// Actualiza los datos de un usuario existente
// El modelo solo permite actualizar: documento, name, email (lista blanca CAMPOS_ACTUALIZABLES)
export const updateUser = catchAsync(async (req, res) => {
    // Sacamos el id del usuario a actualizar del parámetro de la URL
    const { id }             = req.params;
    // El body completo va al modelo — modifyUser filtra internamente los campos permitidos
    const campos             = req.body;
    // Llamamos a modifyUser que hace el UPDATE en MySQL y retorna el usuario actualizado
    // Si el id no existe en la BD, retorna null
    const usuarioActualizado = await modifyUser(id, campos);

    // Si modifyUser retornó null significa que no existe ningún usuario con ese id
    if (!usuarioActualizado) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Llegamos aquí porque la actualización fue exitosa — enviamos el usuario con los nuevos valores
    return successResponse(res, 'Usuario actualizado correctamente', usuarioActualizado);
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
// Eliminación estándar: borra el usuario permanentemente SOLO si no tiene tareas activas
// Si tiene tareas pendientes o en progreso, responde 400 indicando cuántas deben completarse
// Requiere body { reason } con al menos 10 caracteres para dejar registro de auditoría
//
// Diferencia con DELETE /api/users/:id/force:
//   - Este SÍ verifica tareas activas → 400 si las hay
//   - /force elimina sin importar estado ni tareas
export const deleteUser = catchAsync(async (req, res) => {
    // Sacamos el id del usuario a eliminar del parámetro de la URL
    const { id } = req.params;
    // Sacamos el motivo de eliminación del cuerpo — obligatorio para auditoría
    const { reason } = req.body;

    // Validamos que el motivo llegó y tiene al menos 10 caracteres
    if (!reason || String(reason).trim().length < 10) {
        return errorResponse(
            res,
            'El motivo de eliminación es obligatorio y debe tener al menos 10 caracteres',
            400
        );
    }

    // Verificamos que el usuario existe en la BD antes de continuar el proceso
    const usuario = await findUserById(id);
    // Si findUserById retornó undefined el usuario no existe — respondemos 404
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Contamos cuántas tareas activas tiene el usuario (pendiente + en_progreso)
    const tareasActivas = await countUserActiveTasks(id);
    // Si tiene tareas activas, no se puede eliminar todavía — regla de negocio
    if (tareasActivas > 0) {
        return errorResponse(
            res,
            `No se puede eliminar a ${usuario.name}: tiene ${tareasActivas} tarea(s) pendiente(s) o en progreso. Completa las tareas primero o usa el cierre forzoso.`,
            400
        );
    }

    // Eliminamos permanentemente al usuario de la BD — removeUser también ajusta AUTO_INCREMENT
    await removeUser(id);

    // Respondemos al cliente de inmediato antes de hacer el trabajo de background
    successResponse(
        res,
        `Usuario "${usuario.name}" eliminado correctamente. Motivo: ${String(reason).trim()}`
    );

    // BACKGROUND: guardamos el nombre del usuario en las tareas que lo tenían asignado
    // para que sigan mostrando su nombre aunque ya no esté en la BD
    // setImmediate garantiza que esto ocurre DESPUÉS de enviar la respuesta HTTP
    setImmediate(async () => {
        try {
            // registrarNombreUsuarioEliminado actualiza deleted_user_names en cada tarea afectada
            await registrarNombreUsuarioEliminado(Number(id), usuario.name);
        } catch (err) {
            // Si falla el registro en background se loguea el error — no afecta al cliente
            console.error(`[deleteUser] Error en background al registrar nombre de usuario ${id}:`, err);
        }
    });
});

// ── GET /api/users/by-document/:documento ─────────────────────────────────────
// Busca y devuelve un usuario por su número de documento de identidad
// Va ANTES de /:id en las rutas para que Express no interprete "by-document" como un id
export const getUserByDocumento = catchAsync(async (req, res) => {
    // Sacamos el número de documento del parámetro de la URL
    const { documento } = req.params;
    // Buscamos en MySQL por la columna documento — retorna el usuario o undefined
    const usuario       = await findUserByDocumento(documento);

    // Si findUserByDocumento retornó undefined no existe nadie con ese documento — respondemos 404
    if (!usuario) {
        return errorResponse(
            res,
            `No existe un usuario con el documento ${documento}`,
            404
        );
    }

    // Llegamos aquí porque el usuario existe — lo enviamos al cliente
    return successResponse(res, 'Usuario encontrado', usuario);
});

// ── GET /api/users/:userId/tasks ───────────────────────────────────────────────
// Devuelve todas las tareas asignadas a un usuario específico
export const getUserTasks = catchAsync(async (req, res) => {
    // Sacamos el id del usuario del parámetro de la URL
    const { userId } = req.params;
    // Llamamos a getTasksByUserId que filtra todas las tareas donde ese userId está en assignedUsers
    const tareas     = await getTasksByUserId(userId);
    // Enviamos el arreglo de tareas del usuario — puede estar vacío si no tiene ninguna
    return successResponse(res, 'Tareas del usuario obtenidas correctamente', tareas);
});

// ── PATCH /api/users/:id/role ─────────────────────────────────────────────────
// Cambia el rol de un usuario entre 'admin', 'instructor' y 'user'
// Solo admin puede ejecutar esta acción (requireAdmin en la ruta)
// Cuerpo esperado (validado por validateSchema(changeRoleSchema)):
//   { role: 'admin' | 'user' | 'instructor' }
export const changeUserRole = catchAsync(async (req, res) => {
    // Sacamos el id del usuario al que se le cambiará el rol del parámetro de la URL
    const { id }   = req.params;
    // Sacamos el nuevo rol del cuerpo — Zod ya validó que sea uno de los tres valores permitidos
    const { role } = req.body;

    // Llamamos a updateUserRole que actualiza solo el campo role en MySQL
    // Retorna el usuario con el rol ya actualizado, o null si el id no existe
    const usuarioActualizado = await updateUserRole(id, role);

    // Si updateUserRole retornó null significa que no existe ningún usuario con ese id
    if (!usuarioActualizado) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Excluimos el campo password del objeto antes de enviarlo al cliente
    // La desestructuración con alias descarta password y conserva el resto en usuarioSinPassword
    const { password: _ignorado, ...usuarioSinPassword } = usuarioActualizado;

    // Respondemos con el usuario actualizado (sin password) y un mensaje descriptivo del cambio
    return successResponse(
        res,
        `Rol de ${usuarioActualizado.name} actualizado a '${role}' correctamente`,
        usuarioSinPassword
    );
});

// ── PATCH /api/users/:id/password ─────────────────────────────────────────────
// Permite al usuario logueado cambiar su propia contraseña desde el panel
// Solo el dueño del token puede cambiar su contraseña — no puede cambiar la de otro
// Cuerpo esperado: { currentPassword, newPassword }
export const changeUserPassword = catchAsync(async (req, res) => {
    // Sacamos el id del usuario del parámetro de la URL
    const { id } = req.params;
    // Sacamos la contraseña actual (para verificar identidad) y la nueva del cuerpo
    const { currentPassword, newPassword } = req.body;

    // Validamos que llegaron los dos campos necesarios para el cambio de contraseña
    if (!currentPassword || !newPassword) {
        return errorResponse(res, 'La contraseña actual y la nueva contraseña son obligatorias', 400);
    }

    // Validamos que la nueva contraseña tenga al menos 6 caracteres — igual que loginSchema
    if (newPassword.length < 6) {
        return errorResponse(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
    }

    // Verificamos que el usuario del token sea el mismo que el id de la URL
    // req.usuario.id viene del JWT verificado por verifyToken — no se puede falsificar
    if (Number(req.usuario.id) !== Number(id)) {
        return errorResponse(res, 'No tienes permiso para cambiar la contraseña de otro usuario', 403);
    }

    // Buscamos el usuario completo en la BD — necesitamos el hash de la contraseña actual
    const usuario = await findUserById(Number(id));
    // Si el usuario no existe (caso muy raro si el token es válido), respondemos 404
    if (!usuario) {
        return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Comparamos la contraseña actual con el hash guardado en la BD usando bcrypt
    // bcrypt.compare retorna true si el texto plano coincide con el hash, false si no
    const passwordCorrecta = await bcrypt.compare(currentPassword, usuario.password);
    // Si la contraseña actual no coincide, rechazamos el cambio para proteger la cuenta
    if (!passwordCorrecta) {
        return errorResponse(res, 'La contraseña actual es incorrecta', 400);
    }

    // SALT_ROUNDS = 10: cantidad de rondas de hashing — estándar OWASP recomendado para bcrypt
    const SALT_ROUNDS = 10;
    // Hasheamos la nueva contraseña antes de guardarla — NUNCA se guarda texto plano en la BD
    const nuevaPasswordHasheada = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Actualizamos solo el campo password en la BD con el nuevo hash generado
    await updateUserPassword(Number(id), nuevaPasswordHasheada);

    // Llegamos aquí porque la contraseña fue cambiada exitosamente — null en data porque no hay objeto
    return successResponse(res, 'Contraseña actualizada correctamente', null);
});

// ── PATCH /api/users/:id/deactivate ───────────────────────────────────────────
// Desactiva lógicamente al usuario (is_active = 0) sin eliminarlo de la BD
// Regla de negocio: solo se puede desactivar si no tiene tareas pendientes o en progreso
// Solo admin puede ejecutar esta acción (requireAdmin en la ruta)
//
// Flujo:
//   1. Verificar que el usuario existe → 404 si no
//   2. Verificar que no esté ya desactivado → 400 si ya es inactivo
//   3. Contar tareas activas → 400 si tiene pendientes/en_progreso
//   4. Desactivar (UPDATE is_active = 0) → 200 con el usuario actualizado
export const deactivateUser = catchAsync(async (req, res) => {
    // Sacamos el id del usuario a desactivar del parámetro de la URL
    const { id } = req.params;
    // Sacamos el motivo de desactivación del cuerpo — se guarda en deactivation_reason
    const { reason } = req.body;

    // Buscamos al usuario en la BD para confirmar que existe antes de continuar
    const usuario = await findUserById(id);
    // Si findUserById retornó undefined, el usuario no existe — respondemos 404
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Verificamos si el usuario ya está desactivado para evitar operaciones innecesarias
    // mysql2 puede retornar is_active como número (1/0) o como booleano según la versión
    if (usuario.is_active === 0 || usuario.is_active === false) {
        return errorResponse(res, 'El usuario ya está desactivado', 400);
    }

    // Contamos cuántas tareas activas tiene el usuario (pendiente + en_progreso)
    const tareasActivas = await countUserActiveTasks(id);
    // Si tiene tareas activas, no se puede desactivar — las tareas deben completarse primero
    if (tareasActivas > 0) {
        return errorResponse(
            res,
            `No se puede desactivar a ${usuario.name}: tiene ${tareasActivas} tarea(s) pendiente(s) o en progreso. Deben completarse primero.`,
            400
        );
    }

    // Llamamos a disableUser que hace UPDATE is_active = 0 y guarda el motivo y la fecha de hoy
    const usuarioDesactivado = await disableUser(id, reason || null);
    // Si disableUser retornó null algo salió mal en el UPDATE de la BD — respondemos 500
    if (!usuarioDesactivado) {
        return errorResponse(res, 'Error al desactivar el usuario', 500);
    }

    // Llegamos aquí porque el usuario fue desactivado — enviamos el objeto con is_active = 0
    return successResponse(
        res,
        `Usuario "${usuarioDesactivado.name}" desactivado correctamente`,
        usuarioDesactivado
    );
});

// ── PATCH /api/users/:id/reactivate ───────────────────────────────────────────
// Reactiva a un usuario que fue desactivado previamente (is_active = 0 → 1)
// No tiene restricciones de tareas — se puede reactivar en cualquier momento
// Solo admin puede ejecutar esta acción (requireAdmin en la ruta)
export const reactivateUser = catchAsync(async (req, res) => {
    // Sacamos el id del usuario a reactivar del parámetro de la URL
    const { id } = req.params;

    // Buscamos al usuario en la BD para confirmar que existe antes de continuar
    const usuario = await findUserById(id);
    // Si findUserById retornó undefined el usuario no existe — respondemos 404
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Verificamos que el usuario esté efectivamente desactivado antes de reactivar
    // Si is_active = 1 ya está activo y no tiene sentido reactivarlo
    if (usuario.is_active === 1 || usuario.is_active === true) {
        return errorResponse(res, 'El usuario ya está activo', 400);
    }

    // Llamamos a enableUser que hace UPDATE is_active = 1 en la BD
    const usuarioReactivado = await enableUser(id);
    // Si enableUser retornó null algo salió mal en el UPDATE — respondemos 500
    if (!usuarioReactivado) {
        return errorResponse(res, 'Error al reactivar el usuario', 500);
    }

    // Llegamos aquí porque el usuario fue reactivado — ya puede volver a iniciar sesión
    return successResponse(
        res,
        `Usuario "${usuarioReactivado.name}" reactivado correctamente`,
        usuarioReactivado
    );
});

// ── DELETE /api/users/:id/force ────────────────────────────────────────────────
// Eliminación forzosa: borra al usuario sin verificar estado ni tareas pendientes
// Solo admin puede ejecutar esta acción (requireAdmin en la ruta)
// Requiere body { reason } con al menos 10 caracteres de auditoría
//
// Diferencias con DELETE /api/users/:id:
//   - No verifica is_active — elimina activo o inactivo sin distinción
//   - No verifica tareas pendientes — elimina aunque tenga tareas activas
//   - Requiere motivo de auditoría con mínimo 10 caracteres
export const forceDeleteUser = catchAsync(async (req, res) => {
    // Sacamos el id del usuario a eliminar forzosamente del parámetro de la URL
    const { id } = req.params;
    // Sacamos el motivo del cierre forzoso del cuerpo — obligatorio para auditoría
    const { reason } = req.body;

    // Validamos que el motivo llegó y tiene al menos 10 caracteres de longitud
    if (!reason || String(reason).trim().length < 10) {
        return errorResponse(
            res,
            'El motivo de eliminación es obligatorio y debe tener al menos 10 caracteres',
            400
        );
    }

    // Verificamos que el usuario existe en la BD antes de intentar eliminarlo
    const usuario = await findUserById(id);
    // Si findUserById retornó undefined el usuario no existe — respondemos 404
    if (!usuario) {
        return errorResponse(res, `Usuario con id ${id} no encontrado`, 404);
    }

    // Eliminamos permanentemente al usuario sin verificar tareas ni estado
    // Se elimina PRIMERO para que el cliente reciba la respuesta de inmediato
    await removeUser(id);

    // Respondemos al cliente YA — sin esperar el trabajo de background de las tareas
    // Esto evita que la UI se quede esperando hasta que terminen los UPDATEs de tareas
    successResponse(
        res,
        `Usuario "${usuario.name}" eliminado forzosamente. Motivo: ${reason.trim()}`
    );

    // BACKGROUND: guardamos el nombre del usuario en las tareas que lo tenían asignado
    // para que sigan mostrando su nombre aunque ya no esté en la BD
    // setImmediate garantiza que esto ocurre DESPUÉS de enviar la respuesta HTTP
    setImmediate(async () => {
        try {
            // registrarNombreUsuarioEliminado actualiza deleted_user_names en cada tarea afectada
            await registrarNombreUsuarioEliminado(Number(id), usuario.name);
        } catch (err) {
            // Si falla el registro en background se loguea el error — no afecta al cliente
            console.error(`[forceDeleteUser] Error en background al registrar nombre de usuario ${id}:`, err);
        }
    });
});
