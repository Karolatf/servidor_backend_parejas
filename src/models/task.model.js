// MODULO: models/task.model.js
// CAPA: Modelo (datos y operaciones sobre las tablas tasks y task_users en MySQL)
//
// Responsabilidad unica: interactuar con las tablas tasks y task_users de MySQL.
// NUNCA conoce req, res ni Express.
//
// NORMALIZACION (reemplaza asigned_users JSON):
//   Las asignaciones de usuarios se gestionan en la tabla pivote task_users.
//   user_id puede ser NULL si el usuario fue eliminado forzosamente (ON DELETE SET NULL).
//   user_name_snapshot preserva el nombre aunque el usuario ya no exista en la BD.
//
// pool.query retorna [filas, metadatos]  desestructuramos con [rows]

import pool from '../database/db.connection.js';

// ── FUNCION PRIVADA: formatearTarea ──────────────────────────────────────────
// Convierte una fila raw de MySQL al objeto camelCase que espera el frontend
// Acepta el resultado de las queries que incluyen los campos aggregados de task_users
// Parametro: filaDb  objeto raw de pool.query con campos en snake_case
// Retorna: objeto camelCase listo para enviar como JSON al frontend, o null si no hay fila
function formatearTarea(filaDb) {
    if (!filaDb) return null;

    // Convertimos grade a Number  MySQL puede retornar decimales como strings
    const grade = filaDb.grade != null ? Number(filaDb.grade) : null;

    // Si la tarea tiene nota, el estado se recalcula para evitar inconsistencias en la BD
    // grade < 70 → 'reprobada' | grade >= 70 → 'completada' | sin nota → se respeta el status guardado
    const status = grade !== null
        ? (grade < 70 ? 'reprobada' : 'completada')
        : filaDb.status;

    // assignedUsers: arreglo de ids de usuarios asignados extraido del campo aggregado
    // assigned_user_ids viene de GROUP_CONCAT(tu.user_id) en la query JOIN
    const assignedUsers = filaDb.assigned_user_ids
        ? String(filaDb.assigned_user_ids).split(',').map(Number).filter(Boolean)
        : [];

    return {
        id:                   filaDb.id,
        title:                filaDb.title,
        description:          filaDb.description,
        // status: recalculado si hay nota, o el estado guardado en la BD si no hay nota
        status,
        // comment: comentario de seguimiento  null si no se escribio ninguno
        comment:              filaDb.comment || null,
        // grade: nota numerica (0-100) o null si el instructor aun no califico
        grade,
        // gradeReason: motivo de la calificacion escrito por el instructor  null si no hay nota
        gradeReason:          filaDb.grade_reason || null,
        // changeReason: justificacion cuando el instructor cambia estado sin calificar
        changeReason:         filaDb.change_reason || null,
        // assignedUsers: arreglo de ids de usuarios activos o eliminados con soft delete
        assignedUsers,
        // assignedUsersDisplay: string con nombres legibles para mostrar en la tabla
        assignedUsersDisplay: filaDb.assigned_users_display || null,
        // createdAt: timestamp de creacion de la tarea
        createdAt:            filaDb.created_at,
    };
}

// ── QUERY BASE: _selectTareasConUsuarios ──────────────────────────────────────
// Query reutilizable que obtiene tareas con los datos de usuarios asignados aggregados
// GROUP BY t.id agrupa multiples filas (una por usuario) en una sola fila por tarea
// GROUP_CONCAT construye strings concatenados de ids y nombres con el separador ','
// CASE maneja tres casos: usuario activo, inactivo o eliminado permanentemente (tu.user_id NULL)
async function _selectTareasConUsuarios(where = '', params = []) {
    const [rows] = await pool.query(
        `SELECT
            t.*,
            GROUP_CONCAT(DISTINCT tu.user_id ORDER BY tu.user_id SEPARATOR ',')
                AS assigned_user_ids,
            GROUP_CONCAT(DISTINCT
                CASE
                    WHEN tu.user_id IS NULL THEN CONCAT(tu.user_name_snapshot, ' (eliminado)')
                    WHEN u.is_active = 0    THEN CONCAT(u.name, ' (inactivo)')
                    ELSE u.name
                END
                ORDER BY tu.user_id SEPARATOR ', '
            ) AS assigned_users_display
        FROM tasks t
        LEFT JOIN task_users tu ON tu.task_id = t.id
        LEFT JOIN users u       ON u.id = tu.user_id
        ${where}
        GROUP BY t.id
        ORDER BY t.id DESC`,
        params
    );
    return rows;
}

// ── getAllTasks ───────────────────────────────────────────────────────────────
// Retorna todas las tareas del sistema con los nombres de usuarios resueltos
// Se usa en GET /api/tasks (solo admin e instructor pueden ver todas)
export async function getAllTasks() {
    const rows = await _selectTareasConUsuarios();
    return rows.map(formatearTarea);
}

// ── getTaskById ───────────────────────────────────────────────────────────────
// Busca una tarea por su id numerico  retorna el objeto formateado o null si no existe
// Se usa internamente por casi todas las funciones del modelo
export async function getTaskById(id) {
    const rows = await _selectTareasConUsuarios('WHERE t.id = ?', [Number(id)]);
    return rows[0] ? formatearTarea(rows[0]) : null;
}

// ── createTask ────────────────────────────────────────────────────────────────
// Inserta una tarea nueva en la tabla tasks y agrega los usuarios a task_users
// Valida que ningun usuario asignado este inactivo antes de crear la tarea
//
// Parametros con valores por defecto para los campos opcionales:
//   status       → 'pendiente' si el frontend no especifica estado
//   assignedUsers → [] si no se asigna ningun usuario
//   comment      → null si no se escribe comentario
export async function createTask({
    title,
    description,
    status        = 'pendiente',
    assignedUsers = [],
    comment       = null
}) {
    // Verificamos que ninguno de los usuarios asignados este inactivo antes de crear
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

    // Insertamos la tarea en la tabla tasks  grade y grade_reason empiezan en null
    const [result] = await pool.query(
        'INSERT INTO tasks (title, description, status, comment) VALUES (?, ?, ?, ?)',
        [title, description || '', status, comment || null]
    );
    const taskId = result.insertId;

    // Asignamos los usuarios en la tabla task_users si hay alguno
    if (assignedUsers && assignedUsers.length > 0) {
        await _asignarUsuariosEnPivot(taskId, assignedUsers);
    }

    // Retornamos la tarea completa con los usuarios ya resueltos
    return getTaskById(taskId);
}

// ── updateTask ────────────────────────────────────────────────────────────────
// Actualiza los campos de una tarea existente
// Solo actualiza los campos que llegaron en el body (undefined = no se envio = no se toca)
// Si llegan assignedUsers: sincroniza completamente la tabla task_users (reemplaza todos)
// Retorna: la tarea actualizada, o null si el id no existe
export async function updateTask(id, campos) {
    const existente = await getTaskById(id);
    if (!existente) return null;

    // Construimos el objeto con los campos a actualizar en la tabla tasks
    const camposDb = {};

    if (campos.title       !== undefined) camposDb.title       = campos.title;
    if (campos.description !== undefined) camposDb.description = campos.description;
    if (campos.comment     !== undefined) camposDb.comment     = campos.comment || null;

    // grade: cuando se actualiza, el estado se recalcula para mantener consistencia
    if (campos.grade !== undefined) {
        camposDb.grade = (campos.grade !== null && campos.grade !== '') ? Number(campos.grade) : null;
        if (camposDb.grade !== null) {
            camposDb.status = camposDb.grade < 70 ? 'reprobada' : 'completada';
        }
    }
    if (campos.gradeReason  !== undefined) camposDb.grade_reason  = campos.gradeReason  || null;
    if (campos.changeReason !== undefined) camposDb.change_reason = campos.changeReason || null;

    // Cuando el instructor cambia el status a un estado no final (pendiente / en_progreso /
    // pendiente_aprobacion), la nota se borra para que el estudiante pueda rehacer la tarea.
    // Tambien cubre el flujo "solo cambiar estado" donde grade llega null explicitamente
    // (null !== undefined, por eso se evalua por separado).
    const ESTADOS_ACTIVOS = ['pendiente', 'en_progreso', 'pendiente_aprobacion'];
    if (campos.status !== undefined && (campos.grade === undefined || campos.grade === null)) {
        camposDb.status = campos.status;
        if (ESTADOS_ACTIVOS.includes(campos.status)) {
            camposDb.grade        = null;
            camposDb.grade_reason = null;
        }
    }

    // Si hay campos de tabla tasks que actualizar, ejecutamos el UPDATE
    if (Object.keys(camposDb).length > 0) {
        const parteSet = Object.keys(camposDb).map(c => `${c} = ?`).join(', ');
        await pool.query(
            `UPDATE tasks SET ${parteSet} WHERE id = ?`,
            [...Object.values(camposDb), Number(id)]
        );
    }

    // Si llegaron assignedUsers, sincronizamos task_users completamente
    // Esto reemplaza toda la asignacion existente con la nueva lista enviada
    if (campos.assignedUsers !== undefined) {
        await _sincronizarAsignaciones(Number(id), campos.assignedUsers);
    }

    return getTaskById(id);
}

// ── deleteTask ────────────────────────────────────────────────────────────────
// Elimina una tarea permanentemente de la tabla tasks
// Las filas de task_users y task_comments se borran en cascada (FK ON DELETE CASCADE)
// Retorna: el objeto de la tarea antes de eliminarla, o null si no existia
export async function deleteTask(id) {
    const aEliminar = await getTaskById(id);
    if (!aEliminar) return null;

    await pool.query('DELETE FROM tasks WHERE id = ?', [Number(id)]);

    return aEliminar;
}

// ── filterTasks ───────────────────────────────────────────────────────────────
// Retorna tareas filtradas por estado y/o usuario asignado
// Se usa en GET /api/tasks/filter?status=pendiente&userId=1
export async function filterTasks({ status, userId } = {}) {
    let resultado = await getAllTasks();

    if (status) resultado = resultado.filter(t => t.status === status);
    // includes verifica si el userId esta en el arreglo assignedUsers de cada tarea
    if (userId) resultado = resultado.filter(t => t.assignedUsers.includes(Number(userId)));

    return resultado;
}

// ── getTasksByUserId ──────────────────────────────────────────────────────────
// Retorna todas las tareas asignadas a un usuario especifico via JOIN con task_users
// Se usa en GET /api/users/:userId/tasks
export async function getTasksByUserId(userId) {
    const rows = await _selectTareasConUsuarios(
        'WHERE tu.user_id = ?',
        [Number(userId)]
    );
    return rows.map(formatearTarea);
}

// ── updateTaskStatus ──────────────────────────────────────────────────────────
// Cambia el estado de una tarea y opcionalmente guarda un comentario del estudiante
// Se usa en PATCH /api/tasks/:id/status  accesible por todos los roles autenticados
export async function updateTaskStatus(id, status, comment) {
    const campos = { status };
    if (comment !== undefined) campos.comment = comment;
    return updateTask(id, campos);
}

// ── assignUsersToTask ─────────────────────────────────────────────────────────
// Agrega usuarios al pivote task_users sin eliminar los que ya estan asignados
// Usa Set internamente para no duplicar usuarios ya existentes
// Se usa en POST /api/tasks/:taskId/assign
export async function assignUsersToTask(taskId, userIds) {
    const tarea = await getTaskById(taskId);
    if (!tarea) return null;

    // Combinamos los usuarios existentes con los nuevos sin duplicar
    const existentes = tarea.assignedUsers;
    const nuevos     = userIds.map(Number).filter(id => !existentes.includes(id));

    if (nuevos.length > 0) {
        await _asignarUsuariosEnPivot(Number(taskId), nuevos);
    }

    return getTaskById(taskId);
}

// ── removeUserFromTask ────────────────────────────────────────────────────────
// Quita un usuario especifico de la tabla task_users para una tarea especifica
// Se usa en DELETE /api/tasks/:taskId/users/:userId
export async function removeUserFromTask(taskId, userId) {
    const tarea = await getTaskById(taskId);
    if (!tarea) return null;

    await pool.query(
        'DELETE FROM task_users WHERE task_id = ? AND user_id = ?',
        [Number(taskId), Number(userId)]
    );

    return getTaskById(taskId);
}

// ── FUNCION PRIVADA: _asignarUsuariosEnPivot ──────────────────────────────────
// Inserta filas en task_users para los userId dados, capturando el nombre como snapshot
// Si user_id no existe en la BD, no se inserta (INSERT IGNORE por FK)
// Consulta el nombre actual del usuario para guardarlo como snapshot de historial
async function _asignarUsuariosEnPivot(taskId, userIds) {
    if (!userIds || userIds.length === 0) return;

    // Obtenemos los nombres actuales de los usuarios para el snapshot
    const [usuarios] = await pool.query(
        'SELECT id, name FROM users WHERE id IN (?)',
        [userIds]
    );

    // Construimos las filas a insertar solo para los usuarios que existen en la BD
    const filas = usuarios.map(u => [taskId, u.id, u.name]);
    if (filas.length === 0) return;

    // INSERT IGNORE evita error si la combinacion (task_id, user_id) ya existe
    await pool.query(
        'INSERT IGNORE INTO task_users (task_id, user_id, user_name_snapshot) VALUES ?',
        [filas]
    );
}

// ── FUNCION PRIVADA: _sincronizarAsignaciones ─────────────────────────────────
// Reemplaza completamente las asignaciones de una tarea en task_users
// Primero elimina todas las filas existentes y luego inserta las nuevas
// Se usa cuando el admin edita la tarea con una lista completa de usuarios
async function _sincronizarAsignaciones(taskId, userIds) {
    // Eliminamos todas las asignaciones actuales de esta tarea
    await pool.query('DELETE FROM task_users WHERE task_id = ?', [Number(taskId)]);

    // Si el nuevo arreglo tiene usuarios, los insertamos con sus snapshots
    if (userIds && userIds.length > 0) {
        await _asignarUsuariosEnPivot(Number(taskId), userIds.map(Number));
    }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  NOTIFICACIONES DE CAMBIO DE ESTADO (task_state_notifications)║
// ╚══════════════════════════════════════════════════════════════╝

// ── crearNotificacionEstado ───────────────────────────────────────────────────
// Registra que un instructor cambio el estado de una tarea sin calificarla
// (accion "reiniciar calificacion"  resetGrade: true en el PUT de la tarea).
// Crea un registro en task_state_notifications y uno por cada estudiante asignado
// en task_state_notification_recipients para que aparezca en el panel del estudiante.
//
// Parametros:
//   taskId         id de la tarea cuyo estado fue modificado
//   instructorId   id del instructor que realizo el cambio
//   justificacion  texto explicativo del cambio (requerido por la UI, minimo 10 chars)
// Retorna: el id del registro creado en task_state_notifications
export async function crearNotificacionEstado(taskId, instructorId, justificacion) {
    // Insertamos la notificacion principal con la justificacion del instructor
    const [result] = await pool.query(
        `INSERT INTO task_state_notifications (task_id, instructor_id, justificacion)
         VALUES (?, ?, ?)`,
        [Number(taskId), Number(instructorId), justificacion]
    );
    const notifId = result.insertId;

    // Obtenemos todos los usuarios actualmente asignados a esta tarea en task_users
    // Solo los que tienen user_id NOT NULL (usuarios no eliminados forzosamente)
    const [usuarios] = await pool.query(
        'SELECT user_id FROM task_users WHERE task_id = ? AND user_id IS NOT NULL',
        [Number(taskId)]
    );

    // Insertamos un registro de destinatario por cada estudiante asignado a la tarea
    // Si no hay usuarios asignados, no hay destinatarios (la notificacion existe igual)
    if (usuarios.length > 0) {
        // Construimos el arreglo de filas [notifId, user_id] para el INSERT multiple
        const filas = usuarios.map(u => [notifId, u.user_id]);
        // INSERT IGNORE evita error si alguna combinacion (notification_id, user_id) ya existe
        await pool.query(
            `INSERT IGNORE INTO task_state_notification_recipients
             (notification_id, user_id) VALUES ?`,
            [filas]
        );
    }

    return notifId;
}

// ── getNotificacionesEstadoMine ───────────────────────────────────────────────
// Retorna las notificaciones de cambio de estado destinadas al usuario autenticado
// Incluye: titulo de la tarea, nombre del instructor, justificacion y si fue leida
// Se usa en GET /api/tasks/notifications/mine  accesible por el estudiante
//
// Parametro: userId  id del usuario autenticado (del JWT)
export async function getNotificacionesEstadoMine(userId) {
    // JOIN para obtener datos de la tarea y del instructor desde las tablas relacionadas
    // tsnr.leida: 0=no leida (badge rojo en el panel), 1=leida (sin badge)
    const [rows] = await pool.query(
        `SELECT
            tsn.id,
            tsn.task_id,
            tsn.justificacion,
            tsn.created_at,
            tsnr.leida,
            t.title  AS task_title,
            u.name   AS instructor_name
         FROM task_state_notification_recipients tsnr
         JOIN task_state_notifications tsn ON tsn.id = tsnr.notification_id
         JOIN tasks t ON t.id = tsn.task_id
         JOIN users u ON u.id = tsn.instructor_id
         WHERE tsnr.user_id = ?
         ORDER BY tsn.created_at DESC`,
        [Number(userId)]
    );
    return rows;
}

// ── marcarNotificacionEstadoLeida ─────────────────────────────────────────────
// Marca una notificacion de cambio de estado como leida para un usuario especifico
// Solo actualiza la fila en task_state_notification_recipients del usuario dado
// Idempotente: si ya estaba leida, el UPDATE no cambia nada
//
// Parametros:
//   notificacionId  id del registro en task_state_notifications
//   userId          id del estudiante que marco como leida (del JWT)
export async function marcarNotificacionEstadoLeida(notificacionId, userId) {
    // UPDATE solo la fila del recipient correspondiente a este usuario
    await pool.query(
        `UPDATE task_state_notification_recipients
         SET leida = 1
         WHERE notification_id = ? AND user_id = ?`,
        [Number(notificacionId), Number(userId)]
    );
}
