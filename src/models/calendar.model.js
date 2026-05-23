// MODULO: models/calendar.model.js
// CAPA: Modelo (datos y operaciones sobre la tabla calendar_events en MySQL)
//
// Responsabilidad unica: interactuar con la tabla calendar_events.
// NUNCA conoce req, res ni Express.
//
// Endpoints que usa este modelo:
//   GET    /api/calendar/instructor → getEventosInstructor(instructorId)
//   GET    /api/calendar/usuario    → getEventosUsuario(studentId)
//   POST   /api/calendar            → createEvento(datos)
//   DELETE /api/calendar/:id        → deleteEvento(id, userId)

// Importamos pool que es el grupo de conexiones a MySQL configurado en db.connection.js
// Reutiliza conexiones existentes en lugar de abrir una nueva por cada query
import pool from '../database/db.connection.js';

// ── formatearEvento ───────────────────────────────────────────────────────────
// Funcion privada que convierte una fila raw de MySQL al objeto camelCase del frontend
// MySQL usa snake_case (instructor_id, student_id, task_id)  el frontend espera camelCase
// Parametro: fila  objeto raw devuelto por pool.query (nombres con underscore)
// Retorna: objeto con nombres camelCase listo para enviar como JSON al frontend
function formatearEvento(fila) {
    // Si la fila es null o undefined, retornamos null  el controlador maneja ese caso
    if (!fila) return null;
    return {
        id:           fila.id,
        // instructorId: id del instructor que creo el evento  viene de la columna instructor_id
        instructorId: fila.instructor_id,
        // studentId: id del estudiante asignado al evento  null si es un evento propio del instructor
        studentId:    fila.student_id    || null,
        // taskId: id de la tarea relacionada con el evento  null si no hay tarea vinculada
        taskId:       fila.task_id       || null,
        // date: MySQL puede retornar la fecha como objeto Date o como string dependiendo de la version
        // toISOString().split('T')[0] extrae solo la parte YYYY-MM-DD sin la hora
        date:         fila.date instanceof Date
                          ? fila.date.toISOString().split('T')[0]
                          : fila.date,
        title:        fila.title,
        // color: color del evento en el calendario (hexadecimal)  viene de la columna color
        color:        fila.color,
        // tipo: distingue entre 'asignado' (para estudiante) y 'propio' (del instructor)
        tipo:         fila.tipo,
        // studentName: nombre del estudiante obtenido via JOIN con la tabla users
        // null si el evento no esta asignado a ningun estudiante
        studentName:  fila.student_name  || null,
        // taskTitle: titulo de la tarea obtenido via JOIN con la tabla tasks
        // null si el evento no esta relacionado con ninguna tarea
        taskTitle:    fila.task_title    || null,
        // taskStatus: estado actual de la tarea relacionada  null si no hay tarea vinculada
        taskStatus:   fila.task_status   || null,
    };
}

// ── getEventosInstructor ──────────────────────────────────────────────────────
// Exportamos la funcion getEventosInstructor que retorna todos los eventos creados
// por el instructor autenticado, ordenados cronologicamente
// Parametro: instructorId  id del instructor autenticado (viene de req.usuario.id)
// Retorna: arreglo de objetos de eventos formateados, puede estar vacio si no hay eventos
export async function getEventosInstructor(instructorId) {
    // Construimos la query con JOINs para obtener datos adicionales del estudiante y la tarea
    // LEFT JOIN users garantiza que los eventos sin estudiante asignado tambien aparezcan
    // LEFT JOIN tasks garantiza que los eventos sin tarea vinculada tambien aparezcan
    // ORDER BY date ASC, id ASC ordena por fecha y luego por orden de creacion dentro del mismo dia
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
    // Ejecutamos la query pasando instructorId como el ? del WHERE
    const [rows] = await pool.query(sql, [instructorId]);
    // Convertimos cada fila raw al objeto camelCase del frontend usando formatearEvento
    return rows.map(formatearEvento);
}

// ── getEventosUsuario ─────────────────────────────────────────────────────────
// Exportamos la funcion getEventosUsuario que retorna todos los eventos visibles
// para el estudiante autenticado: los asignados por el instructor y los propios
// Parametro: studentId  id del estudiante autenticado (viene de req.usuario.id)
// Retorna: arreglo de objetos de eventos formateados, puede estar vacio
export async function getEventosUsuario(studentId) {
    // La query retorna dos tipos de eventos combinados con OR:
    //   1. Eventos donde student_id = studentId (asignados al estudiante por el instructor)
    //   2. Eventos donde instructor_id = studentId AND tipo = 'propio' (creados por el propio usuario)
    // LEFT JOIN users y tasks incluyen el nombre del estudiante y datos de la tarea si existen
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
    // Pasamos studentId dos veces porque el WHERE tiene dos referencias al mismo id
    const [rows] = await pool.query(sql, [studentId, studentId]);
    // Convertimos cada fila raw al objeto camelCase del frontend usando formatearEvento
    return rows.map(formatearEvento);
}

// ── createEvento ──────────────────────────────────────────────────────────────
// Exportamos la funcion createEvento que inserta un evento nuevo en calendar_events
// Parametro: datos  objeto con los campos del evento enviados desde el controlador
// Retorna: el objeto del evento recien creado con los datos del JOIN incluidos
export async function createEvento(datos) {
    // Desestructuramos los campos del objeto datos que llego del controlador
    const { instructorId, studentId, taskId, date, title, color, tipo } = datos;

    // Construimos el INSERT con los siete campos de la tabla calendar_events
    const sql = `
        INSERT INTO calendar_events
            (instructor_id, student_id, task_id, date, title, color, tipo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    // Ejecutamos el INSERT  studentId y taskId usan || null para guardar NULL si no vienen
    // color tiene '#3b82f6' (azul) como color por defecto si el frontend no lo envia
    // tipo tiene 'propio' como tipo por defecto si el frontend no lo especifica
    const [result] = await pool.query(sql, [
        instructorId,
        studentId || null,
        taskId    || null,
        date,
        title,
        color     || '#3b82f6',
        tipo      || 'propio',
    ]);

    // Buscamos el evento recien creado con JOIN para incluir los nombres del estudiante y la tarea
    // Necesitamos hacer una query separada porque el INSERT no retorna los datos del JOIN
    const [rows] = await pool.query(
        `SELECT ce.*, u.name AS student_name, t.title AS task_title, t.status AS task_status
         FROM calendar_events ce
         LEFT JOIN users u ON u.id = ce.student_id
         LEFT JOIN tasks t ON t.id = ce.task_id
         WHERE ce.id = ?`,
        [result.insertId]
    );
    // Retornamos el evento formateado con camelCase listo para enviar al frontend
    return formatearEvento(rows[0]);
}

// ── deleteEvento ──────────────────────────────────────────────────────────────
// Exportamos la funcion deleteEvento que elimina un evento de calendar_events
// La clausula AND instructor_id = ? garantiza que solo el creador del evento pueda borrarlo
// Parametro: id      id del evento a eliminar (viene de req.params.id en el controlador)
// Parametro: userId  id del usuario autenticado (viene de req.usuario.id en el controlador)
// Retorna: true si se elimino el evento, false si no existia o no pertenecia al usuario
export async function deleteEvento(id, userId) {
    // DELETE con doble condicion  solo elimina si el id coincide Y el instructor_id tambien
    // Si el usuario no es el creador del evento, affectedRows sera 0 y retornamos false
    const sql = `
        DELETE FROM calendar_events
        WHERE id = ? AND instructor_id = ?
    `;
    // Ejecutamos el DELETE pasando el id del evento y el id del usuario como parametros seguros
    const [result] = await pool.query(sql, [id, userId]);
    // affectedRows > 0 significa que se encontro y elimino el evento  retornamos true
    return result.affectedRows > 0;
}
