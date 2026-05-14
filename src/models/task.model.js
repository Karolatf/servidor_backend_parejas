// MÓDULO: models/task.model.js
// CAPA: Modelo (datos y operaciones sobre la tabla tasks en MySQL)
//
// Responsabilidad única: interactuar con la tabla tasks de MySQL.
// NUNCA conoce req, res ni Express.
//
// CORRECCIONES APLICADAS EN ESTA VERSIÓN:
//   1. formatearTarea()  → incluye el campo 'comment' que faltaba.
//   2. createTask()      → inserta el campo 'comment' en el INSERT.
//   3. updateTask()      → permite actualizar el campo 'comment'.
//
// pool.query retorna [filas, metadatos] — desestructuramos con [rows]
// para tomar solo las filas y descartar los metadatos que no necesitamos.

// pool es el grupo de conexiones a MySQL configurado en db.connection.js
// Reutiliza conexiones existentes en lugar de abrir una nueva por cada query
import pool from '../database/db.connection.js';

// ── FUNCIONES PRIVADAS DE SERIALIZACIÓN ─────────────────────────────────────

// serializarUsuarios — convierte arreglo JS a JSON string para guardar en MySQL
// MySQL no tiene tipo array nativo, así que los IDs de usuarios asignados
// se guardan como texto JSON en la columna assigned_users
// Ejemplo: [1, 2, 3] → '[1,2,3]'
// Number(id) garantiza que todos los ids sean números y no strings
function serializarUsuarios(arreglo) {
    // Si no llega nada o no es un arreglo, guardar un arreglo vacío
    if (!arreglo || !Array.isArray(arreglo)) return JSON.stringify([]);
    // map convierte cada id a Number para consistencia antes de serializar
    return JSON.stringify(arreglo.map(id => Number(id)));
}

// deserializarUsuarios — convierte el valor de la columna assigned_users a arreglo JS
// MySQL puede retornar el campo ya como arreglo (columna JSON nativa) o como string
// dependiendo de la versión de mysql2 y la configuración de MySQL
// El try/catch evita que JSON.parse rompa la aplicación si el valor está malformado
function deserializarUsuarios(valor) {
    // Si mysql2 ya lo parseó como arreglo, retornarlo directamente
    if (Array.isArray(valor)) return valor;
    try {
        // JSON.parse convierte el string '[1,2,3]' al arreglo [1, 2, 3]
        // Si valor es null o undefined, usamos '[]' como fallback
        return JSON.parse(valor || '[]');
    } catch {
        // Si el JSON está malformado, retornar arreglo vacío en lugar de crashear
        return [];
    }
}

// formatearTarea — convierte una fila raw de MySQL a un objeto con nombres camelCase
// MySQL usa snake_case (assigned_users, created_at) — el frontend espera camelCase
// CORRECCIÓN: se agrega el campo 'comment' que faltaba en la versión anterior.
//   Sin este campo, el frontend enviaba comment al editar una tarea,
//   pero la respuesta del servidor nunca lo incluía → la tabla mostraba '—' siempre.
//
// Parámetro: filaDb — objeto raw devuelto por pool.query (nombres con underscore)
// Retorna: objeto con nombres camelCase listo para enviar como JSON al frontend
// parsearDeletedUserNames — convierte el campo deleted_user_names de MySQL a objeto JS
// Necesario porque mysql2 puede devolver el JSON como string o como objeto según la versión
// Retorna {} si el campo es null, undefined o no se puede parsear
function parsearDeletedUserNames(valor) {
    if (!valor) return {};
    if (typeof valor === 'object') return valor;
    try { return JSON.parse(valor); } catch { return {}; }
}

function formatearTarea(filaDb) {
    if (!filaDb) return null;
    const grade = filaDb.grade != null ? Number(filaDb.grade) : null;
    // Si la tarea tiene nota, el estado se recalcula automáticamente para evitar inconsistencias
    // que puedan haber quedado en la BD (ej. grade=100 con status='reprobada')
    const status = grade !== null
        ? (grade < 70 ? 'reprobada' : 'completada')
        : filaDb.status;
    return {
        id:               filaDb.id,
        title:            filaDb.title,
        description:      filaDb.description,
        status,
        comment:          filaDb.comment || null,
        grade,
        gradeReason:      filaDb.grade_reason || null,
        assignedUsers:    deserializarUsuarios(filaDb.assigned_users),
        deletedUserNames: parsearDeletedUserNames(filaDb.deleted_user_names),
        createdAt:        filaDb.created_ud
    };
}

// ── FUNCIONES EXPORTADAS (usadas por el controlador) ────────────────────────

// getAllTasks — retorna todas las tareas con los nombres de usuarios resueltos
// Se usa en GET /api/tasks (solo admin e instructor pueden ver todas)
// Hace dos queries: una para tareas y otra para usuarios, luego las combina en memoria
// assignedUsersDisplay: string formateado listo para mostrar en la tabla del panel
export async function getAllTasks() {
    // Query 1: obtener todas las tareas de la tabla tasks
    const [rows]     = await pool.query('SELECT * FROM tasks');
    // Query 2: obtener id, name y documento de todos los usuarios para resolver los IDs
    // Solo se traen los campos necesarios, no todo el objeto usuario (evita exponer passwords)
    const [usuarios] = await pool.query('SELECT id, name, documento, is_active FROM users');

    // Para cada tarea, resolver los IDs de usuarios asignados a nombres legibles
    return rows.map(function(fila) {
        // Convertir la fila raw de MySQL al formato camelCase del frontend
        const tarea = formatearTarea(fila);

        // Resolver cada ID del arreglo assignedUsers al nombre del usuario correspondiente
        const nombres = tarea.assignedUsers.map(function(id) {
            const encontrado = usuarios.find(u => u.id === Number(id));
            if (!encontrado) {
                // Buscar en el mapa de nombres de usuarios eliminados permanentemente
                const nombreGuardado = tarea.deletedUserNames[String(id)];
                return nombreGuardado ? `${nombreGuardado} (eliminado)` : `[Usuario eliminado]`;
            }
            if (encontrado.is_active === 0) return `${encontrado.name} (inactivo)`;
            return encontrado.name;
        });

        // assignedUsersDisplay: string con los nombres separados por coma
        // Si no hay usuarios asignados, null (el frontend muestra '—')
        tarea.assignedUsersDisplay = nombres.length > 0 ? nombres.join(', ') : null;

        // assignedDocumentos: permite al panel admin filtrar por documento de usuario
        tarea.assignedDocumentos = tarea.assignedUsers.map(function(id) {
            const encontrado = usuarios.find(u => u.id === Number(id));
            // toString() convierte el documento numérico a string para la búsqueda de texto
            return encontrado ? encontrado.documento.toString() : null;
        }).filter(Boolean);

        return tarea;
    });
}

// getTaskById — busca una tarea por su id numérico
// Se usa internamente por casi todas las funciones del modelo
// El ? es un placeholder que mysql2 reemplaza de forma segura (evita SQL injection)
// Retorna la tarea formateada, o null si no existe ninguna tarea con ese id
export async function getTaskById(id) {
    const [rows] = await pool.query(
        'SELECT * FROM tasks WHERE id = ?',
        [Number(id)]
    );
    if (!rows[0]) return null;

    const tarea = formatearTarea(rows[0]);

    // Resolver assignedUsersDisplay igual que getAllTasks
    // Sin esto, GET /api/tasks/:id devuelve los IDs pero no los nombres
    const [usuarios] = await pool.query('SELECT id, name, documento, is_active FROM users');
    const nombres = tarea.assignedUsers.map(function(uid) {
        const u = usuarios.find(u => u.id === Number(uid));
        if (!u) {
            const guardado = tarea.deletedUserNames[String(uid)];
            return guardado ? `${guardado} (eliminado)` : '[Usuario eliminado]';
        }
        return u.is_active === 0 ? `${u.name} (inactivo)` : u.name;
    });
    tarea.assignedUsersDisplay = nombres.length > 0 ? nombres.join(', ') : null;
    tarea.assignedDocumentos   = tarea.assignedUsers.map(function(uid) {
        const u = usuarios.find(u => u.id === Number(uid));
        return u ? u.documento.toString() : null;
    }).filter(Boolean);

    return tarea;
}

// createTask — inserta una tarea nueva en la tabla tasks
// CORRECCIÓN: se agrega 'comment' al INSERT para persistir el campo en MySQL.
//   En la versión anterior el INSERT no incluía comment, por lo que siempre
//   quedaba NULL en la base de datos aunque el frontend lo enviara.
//
// Los parámetros tienen valores por defecto para los campos opcionales:
//   status       → 'pendiente' si el frontend no especifica estado
//   assignedUsers → [] si no se asigna ningún usuario
//   comment      → null si no se escribe comentario
//
// Retorna: el objeto de la tarea recién creada con el id asignado por MySQL
export async function createTask({
    title,
    description,
    status        = 'pendiente',
    assignedUsers = [],
    comment       = null
}) {
    // Validar que ninguno de los usuarios asignados esté inactivo
    if (assignedUsers && assignedUsers.length > 0) {
        const [usuarios] = await pool.query(
            'SELECT id, name, is_active FROM users WHERE id IN (?)',
            [assignedUsers]
        );
        const inactivos = usuarios.filter(u => u.is_active === 0);
        if (inactivos.length > 0) {
            const nombres = inactivos.map(u => u.name).join(', ');
            const err = new Error(
                `No se puede crear la tarea: el siguiente usuario está inactivo y no puede recibir tareas: ${nombres}`
            );
            err.status = 400;
            throw err;
        }
    }

    // INSERT con los 5 campos — el orden de los ? debe coincidir con VALUES
    const [result] = await pool.query(
        'INSERT INTO tasks (title, description, status, assigned_users, comment, grade, grade_reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
            title,
            description || '',
            status,
            serializarUsuarios(assignedUsers),
            comment || null,
            null,   // grade empieza null — se asigna cuando el instructor califica
            null    // grade_reason empieza null
        ]
    );
    // result.insertId contiene el id AUTO_INCREMENT que MySQL asignó a la nueva fila
    // Se llama a getTaskById para retornar el objeto completo y formateado
    return getTaskById(result.insertId);
}

// updateTask — actualiza los campos de una tarea existente
// CORRECCIÓN: se agrega 'comment' a la lista de campos actualizables.
//   En la versión anterior el modelo ignoraba comment aunque el frontend lo enviara.
//
// Solo actualiza los campos que llegaron en el body (undefined = no se envió = no se toca)
// Retorna: la tarea actualizada, o null si el id no existe
export async function updateTask(id, campos) {
    // Verificar que la tarea existe antes de intentar actualizar
    const existente = await getTaskById(id);
    // Si no existe retornamos null para que el controlador responda 404
    if (!existente) return null;

    // Construir el objeto con los campos a actualizar en la BD (nombres de columnas MySQL)
    const camposDb = {};

    // Verificar campo por campo si llegó en el body (undefined = no enviar)
    if (campos.title         !== undefined) camposDb.title          = campos.title;
    if (campos.description   !== undefined) camposDb.description    = campos.description;
    // status: se aplica solo si no viene grade (grade siempre prevalece)
    if (campos.status !== undefined && campos.grade === undefined) camposDb.status = campos.status;
    // assignedUsers del frontend → assigned_users en MySQL (snake_case de la BD)
    if (campos.assignedUsers !== undefined) camposDb.assigned_users = serializarUsuarios(campos.assignedUsers);
    // comment
    if (campos.comment !== undefined) camposDb.comment = campos.comment || null;
    // grade: cuando se actualiza, el estado se recalcula automáticamente para mantener consistencia
    // grade < 70 → reprobada | grade >= 70 → completada (nunca quedan desincronizados)
    if (campos.grade !== undefined) {
        camposDb.grade  = (campos.grade !== null && campos.grade !== '') ? Number(campos.grade) : null;
        if (camposDb.grade !== null) {
            camposDb.status = camposDb.grade < 70 ? 'reprobada' : 'completada';
        }
    }
    // grade_reason: motivo de la última edición de nota
    if (campos.gradeReason !== undefined) camposDb.grade_reason = campos.gradeReason || null;

    // Si no llegó ningún campo válido, no ejecutar el UPDATE innecesariamente
    // Retornar la tarea sin cambios
    if (Object.keys(camposDb).length === 0) return existente;

    // Construir dinámicamente la parte SET: "title = ?, status = ?, assigned_users = ?"
    // map genera ["title = ?", "status = ?"] y join los une con comas
    const parteSet = Object.keys(camposDb).map(c => `${c} = ?`).join(', ');

    // Ejecutar el UPDATE — el spread agrega todos los valores y al final el id del WHERE
    await pool.query(
        `UPDATE tasks SET ${parteSet} WHERE id = ?`,
        [...Object.values(camposDb), Number(id)]
    );

    // Retornar la tarea con los datos ya actualizados desde MySQL
    return getTaskById(id);
}

// deleteTask — elimina una tarea de la tabla tasks permanentemente
// Guarda el objeto antes de eliminarlo para retornarlo como confirmación
// Retorna: el objeto de la tarea eliminada, o null si el id no existía
export async function deleteTask(id) {
    // Verificar que la tarea existe antes de intentar eliminar
    const aEliminar = await getTaskById(id);
    // Si no existe retornamos null para que el controlador responda 404
    if (!aEliminar) return null;

    // DELETE con placeholder seguro — elimina la fila de la tabla tasks
    await pool.query('DELETE FROM tasks WHERE id = ?', [Number(id)]);

    // Retornar el objeto de la tarea antes de que se eliminara como confirmación
    return aEliminar;
}

// filterTasks — retorna tareas filtradas por estado y/o usuario asignado
// Se usa en GET /api/tasks/filter?status=pendiente&userId=1
// Carga todas las tareas en memoria y luego filtra — funciona bien para volúmenes pequeños
export async function filterTasks({ status, userId } = {}) {
    // getAllTasks ya resuelve los nombres de usuarios y agrega assignedUsersDisplay
    let resultado = await getAllTasks();

    // Si llegó el parámetro status, conservar solo las tareas con ese estado exacto
    if (status) resultado = resultado.filter(t => t.status === status);
    // Si llegó userId, conservar solo las tareas donde ese id está en assignedUsers
    // Number(userId) convierte el string del query param al número del arreglo
    if (userId) resultado = resultado.filter(t => t.assignedUsers.includes(Number(userId)));

    return resultado;
}

// getTasksByUserId — retorna todas las tareas asignadas a un usuario específico
// Se usa en GET /api/users/:userId/tasks
// Usa getAllTasks (que ya resuelve nombres) y luego filtra por userId
export async function getTasksByUserId(userId) {
    const todas = await getAllTasks();
    // includes verifica si el userId está en el arreglo assignedUsers de cada tarea
    return todas.filter(t => t.assignedUsers.includes(Number(userId)));
}

// updateTaskStatus — cambia solo el campo status de una tarea
// Se usa en PATCH /api/tasks/:id/status (el usuario cambia el estado de su propia tarea)
// Llama a updateTask internamente para reutilizar la lógica de validación y retorno
export async function updateTaskStatus(id, status) {
    // Se pasa un objeto con solo el campo status para que updateTask actualice únicamente ese campo
    return updateTask(id, { status });
}

// assignUsersToTask — agrega usuarios al arreglo assignedUsers de una tarea
// Usa Set para eliminar automáticamente los IDs duplicados
// Se usa en POST /api/tasks/:taskId/assign
export async function assignUsersToTask(taskId, userIds) {
    // Verificar que la tarea existe antes de modificarla
    const tarea = await getTaskById(taskId);
    if (!tarea) return null;

    // Combinar los usuarios existentes con los nuevos y eliminar duplicados con Set
    // [...new Set([...arregloA, ...arregloB])] es el patrón estándar para unión sin duplicados
    const nuevosUsuarios = [...new Set([...tarea.assignedUsers, ...userIds.map(Number)])];

    // Actualizar la tarea con el arreglo combinado
    return updateTask(taskId, { assignedUsers: nuevosUsuarios });
}

// removeUserFromTask — quita un usuario específico de la lista assignedUsers
// Se usa en DELETE /api/tasks/:taskId/users/:userId
export async function removeUserFromTask(taskId, userId) {
    // Verificar que la tarea existe antes de modificarla
    const tarea = await getTaskById(taskId);
    if (!tarea) return null;

    // filter retorna todos los ids EXCEPTO el userId que se quiere quitar
    // Number(userId) convierte el string del parámetro de ruta al número del arreglo
    const filtrados = tarea.assignedUsers.filter(id => id !== Number(userId));

    // Actualizar la tarea con el arreglo sin el usuario eliminado
    return updateTask(taskId, { assignedUsers: filtrados });
}
// registrarNombreUsuarioEliminado — guarda el nombre de un usuario en deleted_user_names
// de TODAS las tareas que lo tienen asignado, antes de eliminarlo permanentemente.
// Se llama desde forceDeleteUser en users.controller.js justo antes del DELETE.
//
// Parámetro: userId — id del usuario que se va a eliminar
// Parámetro: userName — nombre del usuario a preservar
// Retorna: número de tareas actualizadas
export async function registrarNombreUsuarioEliminado(userId, userName) {
    // Buscar todas las tareas que tienen este userId en su assigned_users JSON
    const [rows] = await pool.query(
        `SELECT id, deleted_user_names FROM tasks
         WHERE JSON_CONTAINS(assigned_users, CAST(? AS JSON), '$')`,
        [Number(userId)]
    );

    if (rows.length === 0) return 0;

    // Para cada tarea, agregar la entrada { "userId": "nombre" } al mapa
    for (const fila of rows) {
        let mapa = {};
        try {
            if (fila.deleted_user_names) {
                mapa = typeof fila.deleted_user_names === 'object'
                    ? fila.deleted_user_names
                    : JSON.parse(fila.deleted_user_names);
            }
        } catch { mapa = {}; }

        mapa[String(userId)] = userName;

        await pool.query(
            'UPDATE tasks SET deleted_user_names = ? WHERE id = ?',
            [JSON.stringify(mapa), fila.id]
        );
    }

    return rows.length;
}