// MÓDULO: models/notes.model.js
// CAPA: Modelo — operaciones sobre la tabla user_notes en MySQL
//
// Responsabilidad única: interactuar con la tabla user_notes.
// NUNCA conoce req, res ni Express.
//
// Endpoints que usa este modelo:
//   GET    /api/notes        → getNotas(userId)
//   POST   /api/notes        → createNota(userId, texto, color)
//   DELETE /api/notes/:id    → deleteNota(id, userId)

// Importamos pool que es el grupo de conexiones a MySQL configurado en db.connection.js
// Reutiliza conexiones existentes en lugar de abrir una nueva por cada query
import pool from '../database/db.connection.js';

// ── getNotas ──────────────────────────────────────────────────────────────────
// Exportamos la función getNotas que retorna todas las notas del usuario autenticado
// ordenadas cronológicamente de la más antigua a la más reciente
// Parámetro: userId — id del usuario autenticado (viene de req.usuario.id en el controlador)
export async function getNotas(userId) {
    // Ejecutamos la query que obtiene solo los campos que el frontend necesita mostrar
    // WHERE user_id = ? filtra únicamente las notas que pertenecen a este usuario
    // ORDER BY created_at ASC retorna las notas del más antiguo al más reciente
    const [rows] = await pool.query(
        'SELECT id, texto, color, created_at FROM user_notes WHERE user_id = ? ORDER BY created_at ASC',
        [userId]
    );
    // Convertimos cada fila de MySQL al objeto limpio que espera el frontend
    // Solo exponemos id, texto y color — omitimos user_id y created_at del objeto final
    return rows.map(r => ({ id: r.id, texto: r.texto, color: r.color }));
}

// ── createNota ────────────────────────────────────────────────────────────────
// Exportamos la función createNota que inserta una nota nueva del usuario en la tabla user_notes
// Parámetro: userId — id del usuario autenticado que crea la nota
// Parámetro: texto  — contenido de la nota enviado desde el formulario del frontend
// Parámetro: color  — color del fondo de la nota (valor hexadecimal)
// Retorna: el objeto de la nota recién creada, o null si la inserción falló
export async function createNota(userId, texto, color) {
    // Insertamos la nota en la BD — color tiene '#fef3c7' (amarillo pastel) como valor por defecto
    // El ? de color || '#fef3c7' garantiza que siempre haya un color aunque el frontend no lo envíe
    const [result] = await pool.query(
        'INSERT INTO user_notes (user_id, texto, color) VALUES (?, ?, ?)',
        [userId, texto, color || '#fef3c7']
    );
    // Buscamos la nota recién creada usando el id AUTO_INCREMENT que MySQL asignó
    // para retornar el objeto completo y confirmado desde la BD
    const [rows] = await pool.query(
        'SELECT id, texto, color FROM user_notes WHERE id = ?',
        [result.insertId]
    );
    // Si rows[0] existe, construimos el objeto limpio con solo los campos del frontend
    // Si rows[0] es undefined (caso muy raro), retornamos null para que el controlador lo maneje
    return rows[0] ? { id: rows[0].id, texto: rows[0].texto, color: rows[0].color } : null;
}

// ── deleteNota ────────────────────────────────────────────────────────────────
// Exportamos la función deleteNota que elimina una nota de la tabla user_notes
// La cláusula AND user_id = ? garantiza que un usuario no pueda borrar notas de otro
// Parámetro: id     — id de la nota a eliminar (viene de req.params.id en el controlador)
// Parámetro: userId — id del usuario autenticado (viene de req.usuario.id en el controlador)
// Retorna: true si la nota existía y pertenecía al usuario, false si no se encontró nada
export async function deleteNota(id, userId) {
    // DELETE con doble condición — solo elimina si el id coincide Y el user_id también coincide
    // affectedRows es 0 si la nota no existe o no pertenece al usuario autenticado
    const [result] = await pool.query(
        'DELETE FROM user_notes WHERE id = ? AND user_id = ?',
        [id, userId]
    );
    // Retornamos true si se eliminó al menos una fila, false si no se encontró nada
    return result.affectedRows > 0;
}
