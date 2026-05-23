// MODULO: models/user.model.js
// CAPA: Modelo (datos y operaciones sobre la tabla users en MySQL)
//
// Responsabilidad unica: interactuar con la tabla users de MySQL.
// NUNCA conoce req, res ni Express.
//
// pool.query retorna [filas, metadatos]  desestructuramos con [rows]
// para tomar solo las filas y descartar los metadatos que no necesitamos.

// pool es el objeto de conexion a MySQL creado en db.connection.js
// Usar un pool (grupo de conexiones) es mas eficiente que abrir una conexion nueva
// por cada peticion  el pool reutiliza conexiones existentes automaticamente
import pool from '../database/db.connection.js';

// Lista blanca de campos que se pueden actualizar desde el exterior
// Cualquier otro campo que llegue en el body se ignora silenciosamente
// Esto evita que alguien actualice campos sensibles como 'password' o 'role'
// a traves del endpoint generico de actualizacion de usuario
const CAMPOS_ACTUALIZABLES = ['documento', 'name', 'email'];

// ── getAllUsers ────────────────────────────────────────────────────────────────
// Retorna todos los usuarios activos de la tabla users (sin soft-delete activo)
// Se usa en GET /api/users (accesible solo por admin e instructor)
// SELECT * incluye el campo password  el controlador debe filtrarlo antes de responder
export async function getAllUsers() {
    const [users] = await pool.query('SELECT * FROM users WHERE deleted_at IS NULL ORDER BY id');
    const [roleRows] = await pool.query(`
        SELECT ur.user_id, r.name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN users u ON u.id = ur.user_id
        WHERE u.deleted_at IS NULL
    `);
    const secMap = {};
    roleRows.forEach(function(r) {
        if (!secMap[r.user_id]) secMap[r.user_id] = [];
        secMap[r.user_id].push(r.name);
    });
    return users.map(function(u) {
        u.secondary_roles = (secMap[u.id] || []).filter(function(r) { return r !== u.role; });
        return u;
    });
}

// ── getUserById ───────────────────────────────────────────────────────────────
// Busca un usuario por su id numerico
// Se usa internamente por casi todas las funciones de este modulo
// El ? es un placeholder que mysql2 reemplaza de forma segura (evita SQL injection)
export async function getUserById(id) {
    // Number(id) convierte strings a numero para que la comparacion sea correcta
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [Number(id)]
    );
    // rows[0] es el primer (y unico) resultado  undefined si no existe el id
    return rows[0];
}

// ── getUserByDocumento ────────────────────────────────────────────────────────
// Busca un usuario por su numero de documento de identidad
// Se usa en registerService para verificar que el documento no este ya registrado
export async function getUserByDocumento(documento) {
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE documento = ?',
        [documento.toString()]
    );
    return rows[0];
}

// ── getUserByEmail ─────────────────────────────────────────────────────────────
// Busca un usuario por su correo electronico
// Se usa en loginService (para verificar credenciales) y en registerService
// Retorna el usuario con el campo password incluido  bcrypt lo necesita para comparar
export async function getUserByEmail(email) {
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email.toString().toLowerCase().trim()]
    );
    return rows[0];
}

// ── createUser ────────────────────────────────────────────────────────────────
// Inserta un usuario nuevo desde el panel admin (sin contrasena inicial)
// Tambien agrega el rol 'user' a la tabla user_roles para el sistema RBAC
// Retorna el objeto completo del usuario recien creado con todos sus campos
export async function createUser({ documento, name, email }) {
    // Insertamos el usuario con el rol primario 'user' por defecto
    const [result] = await pool.query(
        'INSERT INTO users (documento, name, email, role) VALUES (?, ?, ?, ?)',
        [documento, name, email, 'user']
    );
    const userId = result.insertId;

    // Asignamos el rol 'user' en la tabla RBAC para que tenga permisos desde el inicio
    await _asignarRolPorNombre(userId, 'user');

    // Retornamos el objeto completo del usuario con el id asignado por MySQL
    return getUserById(userId);
}

// ── createUserWithPassword ────────────────────────────────────────────────────
// Crea un usuario con contrasena y rol desde el flujo de registro
// Se usa exclusivamente desde registerService en auth.service.js
// Tambien registra el rol en user_roles para el sistema RBAC
//
// Parametros:
//   name       nombre completo del usuario
//   documento  numero de documento de identidad (solo digitos)
//   email      correo electronico del usuario
//   password   contrasena ya hasheada con bcrypt (NUNCA texto plano)
//   role       rol primario ('user' por defecto  solo admin lo cambia despues)
export async function createUserWithPassword({ name, documento, email, password, role = 'user' }) {
    // Insertamos el usuario con los 5 campos  el orden de los ? debe coincidir con el INSERT
    const [result] = await pool.query(
        'INSERT INTO users (name, documento, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [name, documento, email, password, role]
    );
    const userId = result.insertId;

    // Asignamos el rol correspondiente en la tabla RBAC para que el sistema de permisos funcione
    await _asignarRolPorNombre(userId, role);

    // Retornamos el usuario completo con el id asignado por MySQL
    return getUserById(userId);
}

// ── updateUser ────────────────────────────────────────────────────────────────
// Actualiza los campos de un usuario existente
// Solo se permiten los campos definidos en CAMPOS_ACTUALIZABLES
// Cualquier otro campo que llegue en el body se ignora para evitar corrupcion de datos
export async function updateUser(id, campos) {
    const existente = await getUserById(id);
    if (!existente) return null;

    // Construimos el objeto con solo los campos de la lista blanca que llegaron en el body
    const camposFiltrados = {};
    for (const campo of CAMPOS_ACTUALIZABLES) {
        if (campos[campo] !== undefined) {
            camposFiltrados[campo] = campos[campo];
        }
    }

    // Si no hay campos validos en el body, retornamos el usuario sin cambios
    if (Object.keys(camposFiltrados).length === 0) return existente;

    // Construimos dinamicamente la parte SET del SQL: "documento = ?, name = ?, ..."
    const parteSet = Object.keys(camposFiltrados).map(c => `${c} = ?`).join(', ');
    const valores  = Object.values(camposFiltrados);

    await pool.query(
        `UPDATE users SET ${parteSet} WHERE id = ?`,
        [...valores, Number(id)]
    );

    return getUserById(id);
}

// ── deleteUser ────────────────────────────────────────────────────────────────
// Elimina un usuario de la tabla users permanentemente
// Las filas en user_roles se borran en cascada por la FK definida en schema.sql
// Retorna el objeto del usuario antes de que se eliminara, o null si no existia
export async function deleteUser(id) {
    const aEliminar = await getUserById(id);
    if (!aEliminar) return null;

    await pool.query('DELETE FROM users WHERE id = ?', [Number(id)]);

    // Ajustamos el contador AUTO_INCREMENT para que MySQL no reutilice el ID eliminado
    // Se hace en dos pasos porque MySQL no permite subquery en la misma tabla del ALTER TABLE
    const [[{ maxId }]] = await pool.query(
        'SELECT COALESCE(MAX(id), 0) AS maxId FROM users'
    );
    await pool.query(`ALTER TABLE users AUTO_INCREMENT = ${maxId + 1}`);

    return aEliminar;
}

// ── softDeleteUser ────────────────────────────────────────────────────────────
// Marca un usuario como eliminado sin borrarlo fisicamente (soft delete)
// Guarda deleted_at y el motivo en soft_delete_reason (columna separada de deactivation_reason)
// El usuario puede recuperarse dentro de 30 dias via restoreUser
export async function softDeleteUser(id, motivo) {
    const existente = await getUserById(id);
    if (!existente) return null;

    await pool.query(
        'UPDATE users SET deleted_at = NOW(), soft_delete_reason = ? WHERE id = ?',
        [motivo || null, Number(id)]
    );

    return getUserById(id);
}

// ── restoreUser ───────────────────────────────────────────────────────────────
// Recupera un usuario eliminado con soft delete
// Solo funciona si deleted_at tiene menos de 30 dias desde la eliminacion
export async function restoreUser(id) {
    const [[row]] = await pool.query(
        'SELECT * FROM users WHERE id = ? AND deleted_at IS NOT NULL',
        [Number(id)]
    );
    if (!row) return null;

    const dias = (Date.now() - new Date(row.deleted_at).getTime()) / (1000 * 60 * 60 * 24);
    // Si pasaron mas de 30 dias, la recuperacion ya no esta disponible
    if (dias > 30) return null;

    await pool.query(
        'UPDATE users SET deleted_at = NULL, soft_delete_reason = NULL WHERE id = ?',
        [Number(id)]
    );

    return getUserById(id);
}

// ── getDeletedUsers ───────────────────────────────────────────────────────────
// Retorna todos los usuarios con soft delete activo (deleted_at IS NOT NULL)
// Se usa en GET /api/users/deleted  accesible solo por admin
export async function getDeletedUsers() {
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    );
    return rows;
}

// ── updateUserRole ────────────────────────────────────────────────────────────
// Cambia el rol primario de un usuario y sincroniza la tabla user_roles
// El rol primario determina que vista SPA se muestra al usuario
//
// Parametros:
//   id    id numerico del usuario a modificar
//   role  nuevo rol primario: 'admin', 'instructor' o 'user'
export async function updateUserRole(id, role) {
    const existente = await getUserById(id);
    if (!existente) return null;

    const rolAnterior = existente.role; // guardamos el rol primario antes de cambiarlo

    // Actualizamos el campo rol primario en la tabla users
    await pool.query(
        'UPDATE users SET role = ? WHERE id = ?',
        [role, Number(id)]
    );

    // Quitamos el rol primario anterior de user_roles solo si es distinto al nuevo
    // para evitar que aparezca como chip de "rol adicional" en el panel de gestionar roles
    if (rolAnterior && rolAnterior !== role) {
        await pool.query(
            `DELETE ur FROM user_roles ur
             INNER JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = ? AND r.name = ?`,
            [Number(id), rolAnterior]
        );
    }

    // Insertamos el nuevo rol primario en user_roles (INSERT IGNORE evita duplicado)
    await _asignarRolPorNombre(Number(id), role);

    return getUserById(id);
}

// ── getUserRoles ──────────────────────────────────────────────────────────────
// Retorna los nombres de todos los roles asignados a un usuario en user_roles
// Se usa en el panel admin para mostrar los roles actuales de un usuario
// Retorna: arreglo de strings ['admin', 'instructor']
export async function getUserRoles(userId) {
    const [rows] = await pool.query(
        `SELECT r.name
         FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ?
         ORDER BY r.name`,
        [Number(userId)]
    );
    // Extraemos solo el nombre del rol de cada fila  retornamos arreglo plano de strings
    return rows.map(r => r.name);
}

// ── assignRolToUser ───────────────────────────────────────────────────────────
// Agrega un rol adicional a un usuario en la tabla user_roles
// Si el usuario ya tiene ese rol, la insercion se ignora (no duplica)
// Se usa en PATCH /api/users/:id/roles para gestionar roles adicionales
//
// Parametros:
//   userId    id del usuario al que se le agrega el rol
//   roleName  nombre del rol a agregar ('admin', 'instructor', 'user')
export async function assignRolToUser(userId, roleName) {
    await _asignarRolPorNombre(Number(userId), roleName);
    return getUserById(Number(userId));
}

// ── removeRolFromUser ─────────────────────────────────────────────────────────
// Elimina un rol de la tabla user_roles para un usuario especifico
// No puede eliminar el rol primario del usuario (el que esta en users.role)
// Se usa en DELETE /api/users/:id/roles/:roleName
//
// Parametros:
//   userId    id del usuario al que se le quita el rol
//   roleName  nombre del rol a eliminar ('admin', 'instructor', 'user')
export async function removeRolFromUser(userId, roleName) {
    await pool.query(
        `DELETE ur FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ? AND r.name = ?`,
        [Number(userId), roleName]
    );
    return getUserById(Number(userId));
}

// ── getUserRolesAndPermissions ─────────────────────────────────────────────────
// Obtiene los roles y permisos del usuario:
//   - Rol PRIMARIO: todos sus permisos desde role_permissions
//   - Roles SECUNDARIOS: solo los permisos explicitamente elegidos en user_extra_permissions
// Se usa en loginService y en authorization.middleware.js
export async function getUserRolesAndPermissions(userId) {
    const uid = Number(userId);

    // Obtenemos el rol primario del usuario
    const [userRow] = await pool.query('SELECT role FROM users WHERE id = ?', [uid]);
    if (!userRow || userRow.length === 0) return [];
    const primaryRole = userRow[0].role;

    // Todos los roles asignados + sus permisos desde role_permissions
    const [rows] = await pool.query(
        `SELECT r.name AS roleName, p.code AS permissionCode
         FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         LEFT  JOIN role_permissions rp ON rp.role_id = r.id
         LEFT  JOIN permissions p ON p.id = rp.permission_id
         WHERE ur.user_id = ?
         ORDER BY r.name, p.code`,
        [uid]
    );
    if (rows.length === 0) return [];

    // Permisos extra explicitamente asignados (secundarios seleccionados a mano)
    const [extraRows] = await pool.query(
        `SELECT p.code FROM user_extra_permissions uep
         JOIN permissions p ON p.id = uep.permission_id
         WHERE uep.user_id = ?`,
        [uid]
    );
    const extraSet = new Set(extraRows.map(r => r.code));

    const rolesMap = {};
    rows.forEach(function(fila) {
        if (!rolesMap[fila.roleName]) {
            rolesMap[fila.roleName] = { name: fila.roleName, permissions: [] };
        }
        if (!fila.permissionCode) return;
        const esPrimario = fila.roleName === primaryRole;
        // Primario: incluye todos sus permisos. Secundario: solo los que el admin selecciono.
        if (esPrimario || extraSet.has(fila.permissionCode)) {
            rolesMap[fila.roleName].permissions.push(fila.permissionCode);
        }
    });

    return Object.values(rolesMap);
}

// ── getPermissionsByRoleName ───────────────────────────────────────────────────
// Retorna todos los permisos de un rol con codigo y descripcion
// Se usa en el panel admin para mostrar checkboxes al asignar un rol secundario
export async function getPermissionsByRoleName(roleName) {
    const [rows] = await pool.query(
        `SELECT p.code, p.descripcion
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         JOIN roles r ON r.id = rp.role_id
         WHERE r.name = ?
         ORDER BY p.code`,
        [roleName]
    );
    return rows;
}

// ── setUserExtraPermissions ────────────────────────────────────────────────────
// Reemplaza todos los permisos extra de un usuario con los codigos dados
// Si permissionCodes esta vacio, elimina todos los permisos extra del usuario
export async function setUserExtraPermissions(userId, permissionCodes) {
    const uid = Number(userId);
    // Eliminamos todos los permisos extra actuales
    await pool.query('DELETE FROM user_extra_permissions WHERE user_id = ?', [uid]);
    if (!permissionCodes || permissionCodes.length === 0) return;
    // Insertamos los nuevos permisos seleccionados
    await pool.query(
        `INSERT IGNORE INTO user_extra_permissions (user_id, permission_id)
         SELECT ?, p.id FROM permissions p WHERE p.code IN (?)`,
        [uid, permissionCodes]
    );
}

// ── getUserExtraPermissions ────────────────────────────────────────────────────
// Retorna los permisos extra del usuario con codigo y descripcion
export async function getUserExtraPermissions(userId) {
    const [rows] = await pool.query(
        `SELECT p.code, p.descripcion
         FROM user_extra_permissions uep
         JOIN permissions p ON p.id = uep.permission_id
         WHERE uep.user_id = ?
         ORDER BY p.code`,
        [Number(userId)]
    );
    return rows;
}

// ── getAllRoles ────────────────────────────────────────────────────────────────
// Retorna todos los roles disponibles en el sistema con sus metadatos
// Se usa en el panel admin para mostrar las opciones al gestionar roles de usuarios
export async function getAllRoles() {
    const [rows] = await pool.query(
        'SELECT id, name, label, color, descripcion FROM roles ORDER BY id'
    );
    return rows;
}

// ── updateUserPassword ────────────────────────────────────────────────────────
// Actualiza solo el campo password de un usuario
// Se usa en:
//   1. PATCH /api/users/:id/password (cambio de contrasena desde el panel)
//   2. POST /api/auth/reset-password (restablecimiento por codigo de Mailtrap)
//
// Parametro: id  id numerico del usuario
// Parametro: nuevaPasswordHasheada  contrasena ya hasheada con bcrypt (NUNCA texto plano)
export async function updateUserPassword(id, nuevaPasswordHasheada) {
    const existente = await getUserById(id);
    if (!existente) return null;

    // Solo actualiza la columna password  ningun otro campo del usuario se toca
    await pool.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [nuevaPasswordHasheada, Number(id)]
    );

    return getUserById(id);
}

// ── deactivateUser ────────────────────────────────────────────────────────────
// Desactivacion logica del usuario (is_active = 0)
// No elimina el usuario de la BD  preserva todas sus tareas y datos historicos
// Persiste deactivation_reason y deactivation_date para auditoria
//
// Parametro: id  id numerico del usuario a desactivar
// Parametro: reason  motivo de desactivacion (puede ser undefined → null en BD)
export async function deactivateUser(id, reason) {
    const existente = await getUserById(id);
    if (!existente) return null;

    // UPDATE persiste is_active = 0 + motivo + fecha actual de desactivacion
    await pool.query(
        'UPDATE users SET is_active = 0, deactivation_reason = ?, deactivation_date = NOW() WHERE id = ?',
        [reason || null, Number(id)]
    );

    return getUserById(id);
}

// ── reactivateUser ────────────────────────────────────────────────────────────
// Reactiva un usuario desactivado (is_active = 0 → 1)
// Limpia deactivation_reason y deactivation_date, y registra la fecha de reactivacion
// Operacion inversa a deactivateUser  restaura el acceso al sistema
export async function reactivateUser(id) {
    const existente = await getUserById(id);
    if (!existente) return null;

    await pool.query(
        `UPDATE users
         SET is_active = 1,
             deactivation_reason = NULL,
             deactivation_date   = NULL,
             reactivation_date   = NOW()
         WHERE id = ?`,
        [Number(id)]
    );

    return getUserById(id);
}

// ── countUserActiveTasks ──────────────────────────────────────────────────────
// Cuenta cuantas tareas activas tiene un usuario (pendiente + en_progreso)
// Se usa en deactivateUser del controlador para verificar la regla de negocio:
// "no se puede desactivar un usuario con tareas pendientes o en progreso"
// Usa la tabla pivote task_users (reemplaza el JSON assigned_users del esquema anterior)
//
// Parametro: userId  id numerico del usuario
// Retorna: numero entero con la cantidad de tareas activas (0 = puede desactivarse)
export async function countUserActiveTasks(userId) {
    // JOIN con task_users para verificar que tareas tiene asignadas el usuario
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM tasks t
         INNER JOIN task_users tu ON tu.task_id = t.id
         WHERE (t.status = 'pendiente' OR t.status = 'en_progreso')
           AND tu.user_id = ?`,
        [Number(userId)]
    );
    // rows[0].total es el COUNT  0 significa que el usuario puede desactivarse
    return rows[0].total;
}

// ── FUNCION PRIVADA: _asignarRolPorNombre ─────────────────────────────────────
// Asigna un rol a un usuario en la tabla user_roles buscando el rol por su nombre
// INSERT IGNORE evita error si la combinacion (user_id, role_id) ya existe
// Funcion interna  no se exporta porque solo la usan las funciones de este modulo
async function _asignarRolPorNombre(userId, roleName) {
    await pool.query(
        `INSERT IGNORE INTO user_roles (user_id, role_id)
         SELECT ?, id FROM roles WHERE name = ?`,
        [Number(userId), roleName]
    );
}
