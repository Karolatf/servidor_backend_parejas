// MODULO: models/comment.model.js
// CAPA: Modelo (datos y operaciones sobre la tabla task_comments en MySQL)
//
// Responsabilidad unica: interactuar con la tabla task_comments de MySQL.
// NUNCA conoce req, res ni Express.
//
// Estructura normalizada:
//   tipo = 'comentario' → texto del estudiante asignado
//   tipo = 'respuesta'  → texto del instructor/admin en respuesta a un comentario
//   parent_id           → NULL = comentario raiz, valor = es respuesta a ese id
//   user_name_snapshot  → preserva el nombre aunque el usuario sea eliminado

import pool from '../database/db.connection.js';

// ── getComentariosPorTarea ────────────────────────────────────────────────────
// Retorna todos los comentarios de una tarea (raices + respuestas) ordenados por fecha
// LEFT JOIN con users para que los comentarios de usuarios eliminados sigan apareciendo
// El nombre del autor se resuelve con COALESCE: primero el nombre activo, luego el snapshot
//
// Parametro: taskId  id numerico de la tarea
// Retorna: arreglo de objetos {
//   id, taskId, userId, userName, tipo, parentId, comentario, createdAt
// }
export async function getComentariosPorTarea(taskId) {
    const [rows] = await pool.query(
        `SELECT
            tc.id,
            tc.task_id                                        AS taskId,
            tc.user_id                                        AS userId,
            COALESCE(u.name, tc.user_name_snapshot)           AS userName,
            tc.tipo,
            tc.parent_id                                      AS parentId,
            tc.comentario,
            tc.created_at                                     AS createdAt
         FROM task_comments tc
         LEFT JOIN users u ON u.id = tc.user_id
         WHERE tc.task_id = ?
         ORDER BY tc.created_at ASC`,
        [Number(taskId)]
    );
    return rows;
}

// ── crearComentario ───────────────────────────────────────────────────────────
// Inserta un comentario o respuesta en task_comments
// El controlador garantiza que:
//   - si tipo = 'respuesta', parentId apunta a un comentario raiz valido de la misma tarea
//   - solo estudiantes asignados crean 'comentario'; solo instructores/admins crean 'respuesta'
//
// Parametros:
//   taskId            id de la tarea
//   userId            id del autor (puede ser null si el usuario fue eliminado, pero en practica siempre viene del JWT)
//   comentario        texto del comentario
//   tipo              'comentario' | 'respuesta'
//   parentId          null (raiz) o id de un comentario existente de la misma tarea
//   userNameSnapshot  nombre del autor al momento de crear (preservado si el usuario es eliminado)
export async function crearComentario(taskId, userId, comentario, tipo = 'comentario', parentId = null, userNameSnapshot) {
    const [result] = await pool.query(
        `INSERT INTO task_comments
            (task_id, user_id, user_name_snapshot, tipo, parent_id, comentario)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            Number(taskId),
            userId ? Number(userId) : null,
            userNameSnapshot || 'Usuario',
            tipo,
            parentId ? Number(parentId) : null,
            comentario.trim(),
        ]
    );

    const [[nuevoComentario]] = await pool.query(
        `SELECT
            tc.id,
            tc.task_id                                        AS taskId,
            tc.user_id                                        AS userId,
            COALESCE(u.name, tc.user_name_snapshot)           AS userName,
            tc.tipo,
            tc.parent_id                                      AS parentId,
            tc.comentario,
            tc.created_at                                     AS createdAt
         FROM task_comments tc
         LEFT JOIN users u ON u.id = tc.user_id
         WHERE tc.id = ?`,
        [result.insertId]
    );

    return nuevoComentario;
}

// ── eliminarComentario ────────────────────────────────────────────────────────
// Elimina un comentario (y sus respuestas en cascada via FK fk_tc_parent)
// El controlador verifica que el userId sea el dueno del comentario o admin
//
// Parametro: comentarioId  id del comentario a eliminar
// Retorna: true si se elimino, false si no existia
export async function eliminarComentario(comentarioId) {
    const [result] = await pool.query(
        'DELETE FROM task_comments WHERE id = ?',
        [Number(comentarioId)]
    );
    return result.affectedRows > 0;
}
