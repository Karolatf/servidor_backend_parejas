// MÓDULO: models/notes.model.js
// CAPA: Modelo — operaciones sobre la tabla user_notes
//
// Endpoints:
//   GET    /api/notes        → getNotas(userId)
//   POST   /api/notes        → createNota(userId, texto, color)
//   DELETE /api/notes/:id    → deleteNota(id, userId)

import pool from '../database/db.connection.js';

// getNotas — devuelve todas las notas del usuario ordenadas por fecha
export async function getNotas(userId) {
    const [rows] = await pool.query(
        'SELECT id, texto, color, created_at FROM user_notes WHERE user_id = ? ORDER BY created_at ASC',
        [userId]
    );
    return rows.map(r => ({ id: r.id, texto: r.texto, color: r.color }));
}

// createNota — inserta una nota nueva y retorna el objeto creado
export async function createNota(userId, texto, color) {
    const [result] = await pool.query(
        'INSERT INTO user_notes (user_id, texto, color) VALUES (?, ?, ?)',
        [userId, texto, color || '#fef3c7']
    );
    const [rows] = await pool.query(
        'SELECT id, texto, color FROM user_notes WHERE id = ?',
        [result.insertId]
    );
    return rows[0] ? { id: rows[0].id, texto: rows[0].texto, color: rows[0].color } : null;
}

// deleteNota — elimina una nota. Solo el dueño puede borrarla.
// Retorna true si se eliminó, false si no existía o no pertenece al usuario.
export async function deleteNota(id, userId) {
    const [result] = await pool.query(
        'DELETE FROM user_notes WHERE id = ? AND user_id = ?',
        [id, userId]
    );
    return result.affectedRows > 0;
}