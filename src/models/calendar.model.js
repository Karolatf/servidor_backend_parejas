// MÓDULO: models/calendar.model.js
// CAPA: Modelo (datos y operaciones sobre la tabla calendar_events en MySQL)
//
// Responsabilidad única: interactuar con la tabla calendar_events.
// NUNCA conoce req, res ni Express.
//
// ENDPOINTS que usa este modelo:
//   GET  /api/calendar/instructor     → getEventosInstructor
//   GET  /api/calendar/usuario        → getEventosUsuario
//   POST /api/calendar                → createEvento
//   DELETE /api/calendar/:id          → deleteEvento

import pool from '../database/db.connection.js';

// formatearEvento — convierte una fila raw de MySQL a objeto camelCase
function formatearEvento(fila) {
    if (!fila) return null;
    return {
        id:            fila.id,
        instructorId:  fila.instructor_id,
        studentId:     fila.student_id    || null,
        taskId:        fila.task_id       || null,
        date:          fila.date instanceof Date
                           ? fila.date.toISOString().split('T')[0]
                           : fila.date,
        title:         fila.title,
        color:         fila.color,
        tipo:          fila.tipo,
        // Datos del estudiante asignado (JOIN con users)
        studentName:   fila.student_name  || null,
        // Datos de la tarea relacionada (JOIN con tasks)
        taskTitle:     fila.task_title    || null,
        taskStatus:    fila.task_status   || null,
    };
}

// ── OBTENER EVENTOS DEL INSTRUCTOR ─────────────────────────────────────────
// Devuelve todos los eventos creados por el instructor dado.
// Incluye nombre del estudiante y datos de tarea (si existen) via JOIN.
// Parámetro: instructorId — id del instructor autenticado
export async function getEventosInstructor(instructorId) {
    const sql = `
        SELECT
            ce.id,
            ce.instructor_id,
            ce.student_id,
            ce.task_id,
            ce.date,
            ce.title,
            ce.color,
            ce.tipo,
            u.name  AS student_name,
            t.title AS task_title,
            t.status AS task_status
        FROM calendar_events ce
        LEFT JOIN users  u ON u.id = ce.student_id
        LEFT JOIN tasks  t ON t.id = ce.task_id
        WHERE ce.instructor_id = ?
        ORDER BY ce.date ASC, ce.id ASC
    `;
    const [rows] = await pool.query(sql, [instructorId]);
    return rows.map(formatearEvento);
}

// ── OBTENER EVENTOS DEL USUARIO (ESTUDIANTE) ───────────────────────────────
// Devuelve todos los eventos que el instructor asignó a este estudiante.
// El estudiante ve estos eventos en su propio calendario (solo lectura).
// Parámetro: studentId — id del usuario/estudiante autenticado
export async function getEventosUsuario(studentId) {
    // Devuelve:
    //   1. Eventos asignados al usuario por el instructor (student_id = userId)
    //   2. Eventos propios creados por el usuario mismo (instructor_id = userId, tipo = 'propio')
    const sql = `
        SELECT
            ce.id,
            ce.instructor_id,
            ce.student_id,
            ce.task_id,
            ce.date,
            ce.title,
            ce.color,
            ce.tipo,
            u.name  AS student_name,
            t.title AS task_title,
            t.status AS task_status
        FROM calendar_events ce
        LEFT JOIN users  u ON u.id = ce.student_id
        LEFT JOIN tasks  t ON t.id = ce.task_id
        WHERE ce.student_id = ?
           OR (ce.instructor_id = ? AND ce.tipo = 'propio')
        ORDER BY ce.date ASC, ce.id ASC
    `;
    const [rows] = await pool.query(sql, [studentId, studentId]);
    return rows.map(formatearEvento);
}

// ── CREAR EVENTO ────────────────────────────────────────────────────────────
// Inserta un evento nuevo en la tabla.
// Parámetro: datos — { instructorId, studentId, taskId, date, title, color, tipo }
export async function createEvento(datos) {
    const { instructorId, studentId, taskId, date, title, color, tipo } = datos;

    const sql = `
        INSERT INTO calendar_events
            (instructor_id, student_id, task_id, date, title, color, tipo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
        instructorId,
        studentId || null,
        taskId    || null,
        date,
        title,
        color     || '#3b82f6',
        tipo      || 'propio',
    ]);

    // Retornar el evento recién creado (con JOIN para incluir nombres)
    const [rows] = await pool.query(
        `SELECT ce.*, u.name AS student_name, t.title AS task_title, t.status AS task_status
         FROM calendar_events ce
         LEFT JOIN users u ON u.id = ce.student_id
         LEFT JOIN tasks t ON t.id = ce.task_id
         WHERE ce.id = ?`,
        [result.insertId]
    );
    return formatearEvento(rows[0]);
}

// ── ELIMINAR EVENTO ─────────────────────────────────────────────────────────
// Elimina un evento por id. Solo el instructor que lo creó puede borrarlo.
// Parámetro: id           — id del evento a eliminar
// Parámetro: instructorId — id del instructor autenticado (verificación de propiedad)
// Retorna: true si se eliminó, false si no existía o no pertenecía al instructor
// userId puede ser instructor o el propio usuario que creó el evento
export async function deleteEvento(id, userId) {
    const sql = `
        DELETE FROM calendar_events
        WHERE id = ? AND instructor_id = ?
    `;
    const [result] = await pool.query(sql, [id, userId]);
    return result.affectedRows > 0;
}