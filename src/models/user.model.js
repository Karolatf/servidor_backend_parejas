// MÓDULO: models/user.model.js
// CAPA: Modelo (datos y operaciones sobre la tabla users en MySQL)
//
// Responsabilidad única: interactuar con la tabla users de MySQL.
// NUNCA conoce req, res ni Express.
//
// pool.query retorna [filas, metadatos] — desestructuramos con [rows]
// para tomar solo las filas y descartar los metadatos que no necesitamos.

// pool es el objeto de conexión a MySQL creado en db.connection.js
// Usar un pool (grupo de conexiones) es más eficiente que abrir una conexión nueva
// por cada petición — el pool reutiliza conexiones existentes automáticamente
import pool from '../database/db.connection.js';

// Lista blanca de campos que se pueden actualizar desde el exterior
// Cualquier otro campo que llegue en el body se ignora silenciosamente
// Esto evita que alguien actualice campos sensibles como 'password' o 'role'
// a través del endpoint genérico de actualización de usuario
const CAMPOS_ACTUALIZABLES = ['documento', 'name', 'email'];

// getAllUsers — retorna todos los usuarios de la tabla users
// Se usa en GET /api/users (accesible solo por admin e instructor)
// SELECT * incluye el campo password — el controlador debe filtrarlo antes de responder
export async function getAllUsers() {
    // pool.query retorna [rows, fields] — desestructuramos solo rows (las filas)
    // fields contiene metadatos de las columnas que no necesitamos
    const [rows] = await pool.query('SELECT * FROM users');
    // rows es un arreglo de objetos — puede estar vacío si no hay usuarios
    return rows;
}

// getUserById — busca un usuario por su id numérico
// Se usa internamente por casi todas las funciones de este módulo
// El ? es un placeholder que mysql2 reemplaza de forma segura (evita SQL injection)
// Si mysql2 recibiera el id como string en la query, podría ocurrir inyección SQL
export async function getUserById(id) {
    // Number(id) convierte strings a número para que la comparación sea correcta
    // Sin esto, '1' === 1 falla en JavaScript y la query podría no encontrar el usuario
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [Number(id)]
    );
    // rows[0] es el primer (y único) resultado — undefined si no existe el id
    return rows[0];
}

// getUserByDocumento — busca un usuario por su número de documento de identidad
// Se usa en registerService para verificar que el documento no esté ya registrado
// Retorna el usuario encontrado o undefined si no existe
export async function getUserByDocumento(documento) {
    // toString() garantiza que el documento llegue como string a la query
    // aunque el frontend lo envíe como número
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE documento = ?',
        [documento.toString()]
    );
    // rows[0] es undefined si no hay ningún usuario con ese documento
    return rows[0];
}

// createUser — inserta un usuario nuevo en la tabla users (sin password ni role)
// Se usa desde el panel admin para crear usuarios sin contraseña inicial
// Para el registro con contraseña, usar createUserWithPassword (más abajo)
// result.insertId contiene el id AUTO_INCREMENT que MySQL asignó a la nueva fila
export async function createUser({ documento, name, email }) {
    // El INSERT solo incluye los 3 campos básicos — password y role quedan con sus defaults de MySQL
    const [result] = await pool.query(
        'INSERT INTO users (documento, name, email) VALUES (?, ?, ?)',
        [documento, name, email]
    );
    // Se llama a getUserById para retornar el objeto completo con todos los campos
    // incluyendo created_at, is_active y role que MySQL asigna automáticamente
    return getUserById(result.insertId);
}

// updateUser — actualiza los campos de un usuario existente
// Solo se permiten los campos definidos en CAMPOS_ACTUALIZABLES
// Cualquier otro campo que llegue en el body se ignora para evitar corrupción de datos
export async function updateUser(id, campos) {
    // Verificar que el usuario existe antes de intentar actualizar
    const existente = await getUserById(id);
    // Si no existe retornamos null para que el controlador responda 404
    if (!existente) return null;

    // Construir el objeto con solo los campos que están en la lista blanca
    // y que realmente llegaron en el body (no undefined)
    const camposFiltrados = {};
    for (const campo of CAMPOS_ACTUALIZABLES) {
        // Solo incluir el campo si llegó en el body (undefined significa que no se envió)
        if (campos[campo] !== undefined) {
            camposFiltrados[campo] = campos[campo];
        }
    }

    // Si no hay campos válidos en el body, no ejecutar el UPDATE innecesariamente
    // Retornamos el usuario sin cambios para no hacer una petición vacía a MySQL
    if (Object.keys(camposFiltrados).length === 0) return existente;

    // Construir dinámicamente la parte SET del SQL: "documento = ?, name = ?, ..."
    // map genera ["documento = ?", "name = ?"] y join lo une con comas
    const parteSet = Object.keys(camposFiltrados).map(c => `${c} = ?`).join(', ');

    // Los valores van en el mismo orden que las columnas en parteSet
    const valores  = Object.values(camposFiltrados);

    // Ejecutar el UPDATE con los campos filtrados y el id del usuario
    await pool.query(
        `UPDATE users SET ${parteSet} WHERE id = ?`,
        // El spread agrega los valores de los campos y al final el id del WHERE
        [...valores, Number(id)]
    );

    // Retornar el usuario con los datos ya actualizados desde MySQL
    return getUserById(id);
}

// getUserByEmail — busca un usuario por su correo electrónico
// Se usa en loginService (para verificar credenciales) y en registerService
// (para verificar que el email no esté ya registrado)
// Retorna el usuario con el campo password incluido — bcrypt lo necesita para comparar
export async function getUserByEmail(email) {
    // toLowerCase().trim() normaliza el email para evitar problemas de mayúsculas o espacios
    // La query usa ? para evitar SQL injection
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email.toString().toLowerCase().trim()]
    );
    // rows[0] es el usuario encontrado o undefined si el email no existe
    return rows[0];
}

// createUserWithPassword — crea un usuario con contraseña y rol desde el registro
// Se usa exclusivamente desde registerService en auth.service.js
// La función createUser que ya existe no acepta password ni role — por eso existe esta variante
//
// Parámetros:
//   name      — nombre completo del usuario
//   documento — número de documento de identidad (solo dígitos)
//   email     — correo electrónico del usuario
//   password  — contraseña ya hasheada con bcrypt (NUNCA texto plano)
//   role      — rol del usuario ('user' por defecto — solo admin lo cambia después)
export async function createUserWithPassword({ name, documento, email, password, role = 'user' }) {
    // INSERT con los 5 campos: los 3 básicos más la contraseña hasheada y el rol
    // El orden de los ? debe coincidir exactamente con el orden del INSERT
    const [result] = await pool.query(
        'INSERT INTO users (name, documento, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [name, documento, email, password, role]
    );
    // result.insertId es el id AUTO_INCREMENT que MySQL asignó a la nueva fila
    // Se usa getUserById para retornar el objeto completo incluyendo created_at e is_active
    return getUserById(result.insertId);
}

// deleteUser — elimina un usuario de la tabla users permanentemente
// Primero guarda el objeto para retornarlo como confirmación de lo que se eliminó
// El controlador usa este objeto para responder con los datos del usuario eliminado
export async function deleteUser(id) {
    // Verificar que el usuario existe antes de intentar eliminar
    const aEliminar = await getUserById(id);
    // Si no existe retornamos null para que el controlador responda 404
    if (!aEliminar) return null;

    // DELETE con placeholder seguro — elimina la fila de la tabla users
    await pool.query('DELETE FROM users WHERE id = ?', [Number(id)]);

    // Retornamos el objeto del usuario antes de que se eliminara
    // El controlador lo envía como respuesta para confirmar qué se borró
    return aEliminar;
}

// updateUserRole — actualiza solo el campo role de un usuario
// Se usa desde changeUserRole en users.controller.js (PATCH /api/users/:id/role)
// Solo modifica el campo role — no toca ningún otro dato del usuario
//
// Parámetros:
//   id   — id numérico del usuario a modificar
//   role — nuevo rol: 'admin', 'instructor' o 'user' (validado por Zod antes de llegar aquí)
export async function updateUserRole(id, role) {
    // Verificar que el usuario existe antes de intentar actualizar
    const existente = await getUserById(id);
    // Si no existe retornamos null para que el controlador responda 404
    if (!existente) return null;

    // UPDATE solo modifica el campo role — ningún otro campo del usuario se toca
    // mysql2 reemplaza los ? por los valores de forma segura (evita SQL injection)
    await pool.query(
        'UPDATE users SET role = ? WHERE id = ?',
        [role, Number(id)]
    );

    // Retornar el usuario con el rol ya actualizado desde MySQL
    return getUserById(id);
}

// getUserRolesAndPermissions — obtiene los roles y permisos RBAC de un usuario
// Se usa en loginService (para incluirlos en la respuesta del login)
// y en authorization.middleware.js (para verificar permisos en rutas protegidas)
//
// Parámetro: userId — id numérico del usuario
// Retorna: arreglo de objetos [{ name: 'admin', permissions: ['tasks.create', ...] }]
// Si el usuario no tiene roles en user_roles, retorna []
export async function getUserRolesAndPermissions(userId) {

    // La query une las 4 tablas RBAC con INNER JOIN y LEFT JOINs:
    //   user_roles: vincula usuario con su rol
    //   roles: nombre del rol (admin, instructor, user)
    //   role_permissions: vincula rol con sus permisos (puede no existir → LEFT JOIN)
    //   permissions: código del permiso (tasks.create, users.delete, etc.) (LEFT JOIN)
    // LEFT JOIN en role_permissions y permissions garantiza que roles sin permisos
    // igual aparezcan en el resultado (con permissionCode = NULL) en vez de desaparecer
    const [rows] = await pool.query(
        `SELECT
            r.name        AS roleName,
            p.code        AS permissionCode
        FROM user_roles ur
        INNER JOIN roles       r  ON r.id  = ur.role_id
        LEFT  JOIN role_permissions rp ON rp.role_id = r.id
        LEFT  JOIN permissions  p  ON p.id  = rp.permission_id
        WHERE ur.user_id = ?
        ORDER BY r.name, p.code`,
        [Number(userId)]
    );

    // Si el resultado está vacío, el usuario no tiene filas en user_roles
    // Esto puede pasar con usuarios creados antes de ejecutar rbac.sql
    if (rows.length === 0) return [];

    // Agrupar las filas por nombre de rol, acumulando sus permisos en un arreglo
    // rows tiene múltiples filas con el mismo roleName (una por cada permiso)
    // Necesitamos convertirlas a: [{ name: 'admin', permissions: ['tasks.create', ...] }]
    const rolesMap = {};

    rows.forEach(function(fila) {
        // Si este rol todavía no está en el mapa, crear su entrada con arreglo vacío
        if (!rolesMap[fila.roleName]) {
            rolesMap[fila.roleName] = {
                name:        fila.roleName,
                permissions: [],
            };
        }
        // Solo agregar el permiso si no es NULL (roles sin permisos tienen permissionCode = null)
        if (fila.permissionCode) {
            rolesMap[fila.roleName].permissions.push(fila.permissionCode);
        }
    });

    // Object.values convierte el mapa { admin: {...}, user: {...} } a un arreglo de objetos
    return Object.values(rolesMap);
}

// updateUserPassword — actualiza solo el campo password de un usuario
// Se usa en:
//   1. PATCH /api/users/:id/password (cambio de contraseña desde el panel)
//   2. POST /api/auth/reset-password (restablecimiento por código de Mailtrap)
//
// Parámetro: id — id numérico del usuario
// Parámetro: nuevaPasswordHasheada — contraseña ya hasheada con bcrypt (NUNCA texto plano)
export async function updateUserPassword(id, nuevaPasswordHasheada) {
    // Verificar que el usuario existe antes de intentar actualizar
    const existente = await getUserById(id);
    // Si no existe retornamos null para que el controlador responda 404
    if (!existente) return null;

    // Solo actualiza la columna password — ningún otro campo del usuario se toca
    await pool.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [nuevaPasswordHasheada, Number(id)]
    );

    // Retornar el usuario con los datos actualizados desde MySQL
    return getUserById(id);
}

// deactivateUser — desactivación lógica del usuario (is_active = 0)
// No elimina el usuario de la BD — preserva todas sus tareas y datos históricos
// Se usa desde deactivateUser en users.controller.js (PATCH /api/users/:id/deactivate)
//
// Parámetro: id — id numérico del usuario a desactivar
// Retorna: el usuario actualizado con is_active = 0, o null si no existe
export async function deactivateUser(id) {
    // Verificar que el usuario existe antes de intentar actualizar
    const existente = await getUserById(id);
    // Si no existe retornamos null para que el controlador responda 404
    if (!existente) return null;

    // UPDATE solo modifica is_active = 0 — no toca ningún otro campo del usuario
    // El ? es el placeholder seguro de mysql2 que evita SQL injection
    await pool.query(
        'UPDATE users SET is_active = 0 WHERE id = ?',
        [Number(id)]
    );

    // Retornar el usuario actualizado para que el controlador lo devuelva al cliente
    return getUserById(id);
}

// countUserActiveTasks — cuenta cuántas tareas activas tiene un usuario
// Se usa en deactivateUser del controlador para verificar la regla de negocio:
// "no se puede desactivar un usuario con tareas pendientes o en progreso"
//
// Parámetro: userId — id numérico del usuario
// Retorna: número entero con la cantidad de tareas activas (0 = puede desactivarse)
export async function countUserActiveTasks(userId) {
    // JSON_CONTAINS(columna, valor, ruta) busca un valor dentro de un campo JSON
    // La columna assigned_users guarda los ids como JSON: "[1, 2, 3]"
    // CAST(? AS JSON) convierte el id numérico a JSON para que la comparación funcione
    // Sin CAST, MySQL no podría comparar el número con el array JSON correctamente
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM tasks
         WHERE (status = 'pendiente' OR status = 'en_progreso')
           AND JSON_CONTAINS(assigned_users, CAST(? AS JSON), '$')`,
        [Number(userId)]
    );
    // rows[0].total es el COUNT — 0 significa que el usuario puede desactivarse
    return rows[0].total;
}

// reactivateUser — reactiva un usuario desactivado (is_active = 0 → 1)
// Operación inversa a deactivateUser
// Solo el admin puede ejecutar esta acción (requireAdmin en la ruta)
// Retorna el usuario actualizado, o null si el id no existe
export async function reactivateUser(id) {
    // Verificar que el usuario existe antes de intentar actualizar
    const existente = await getUserById(id);
    // Si no existe retornamos null para que el controlador responda 404
    if (!existente) return null;

    // UPDATE solo modifica is_active = 1 — el usuario puede volver a iniciar sesión
    await pool.query(
        'UPDATE users SET is_active = 1 WHERE id = ?',
        [Number(id)]
    );

    // Retornar el usuario con is_active = 1 para confirmar la reactivación
    return getUserById(id);
}