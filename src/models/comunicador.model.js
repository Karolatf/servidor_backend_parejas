// MODULO: models/comunicador.model.js
// CAPA: Modelo (datos y operaciones sobre las tablas del modulo comunicador)
//
// Tablas que maneja este modelo:
//   comunicador_anuncios               anuncios globales (todos los roles los ven)
//   comunicador_notificaciones         notificaciones por rol
//   comunicador_notificaciones_roles   pivote N:M: notificacion ↔ roles destino
//   comunicador_notificaciones_leidas  marca de leido por usuario
//
// NUNCA conoce req, res ni Express.

import pool from '../database/db.connection.js';

// ╔══════════════════════════════════════════════════════════════╗
// ║  ANUNCIOS                                                    ║
// ╚══════════════════════════════════════════════════════════════╝

// ── getAnuncioById ────────────────────────────────────────────────────────────
// Busca un anuncio por su id  incluye nombre y rol del autor (JOIN con users)
// Retorna el objeto del anuncio o null si no existe
export async function getAnuncioById(id) {
    // JOIN con users para obtener el nombre del autor en la misma query
    const [rows] = await pool.query(
        `SELECT ca.id,
                ca.autor_id,
                ca.titulo,
                ca.contenido,
                ca.created_at,
                u.name AS autor_name,
                u.role AS autor_role
         FROM comunicador_anuncios ca
         JOIN users u ON u.id = ca.autor_id
         WHERE ca.id = ?`,
        [Number(id)]
    );
    // rows[0] es el primer resultado; undefined si no existe el id
    return rows[0] || null;
}

// ── getAllAnuncios ─────────────────────────────────────────────────────────────
// Retorna todos los anuncios ordenados del mas reciente al mas antiguo
// Los anuncios son globales: todos los roles autenticados pueden verlos
export async function getAllAnuncios() {
    // ORDER BY created_at DESC para mostrar el mas reciente primero en el frontend
    const [rows] = await pool.query(
        `SELECT ca.id,
                ca.autor_id,
                ca.titulo,
                ca.contenido,
                ca.created_at,
                u.name AS autor_name,
                u.role AS autor_role
         FROM comunicador_anuncios ca
         JOIN users u ON u.id = ca.autor_id
         ORDER BY ca.created_at DESC`
    );
    return rows;
}

// ── crearAnuncio ──────────────────────────────────────────────────────────────
// Inserta un anuncio nuevo en comunicador_anuncios y retorna el objeto completo
// Parametros:
//   autorId    id del usuario que crea el anuncio (requiere comunicador.anuncios)
//   titulo     titulo corto del anuncio
//   contenido  cuerpo del anuncio
export async function crearAnuncio({ autorId, titulo, contenido }) {
    // Insertamos el anuncio con los 3 campos obligatorios
    const [result] = await pool.query(
        'INSERT INTO comunicador_anuncios (autor_id, titulo, contenido) VALUES (?, ?, ?)',
        [Number(autorId), titulo, contenido]
    );
    // Retornamos el anuncio completo con el id recien generado por MySQL
    return getAnuncioById(result.insertId);
}

// ── eliminarAnuncio ────────────────────────────────────────────────────────────
// Elimina un anuncio por su id  retorna el objeto antes de eliminarlo, o null si no existe
// La verificacion de si el usuario es el autor o es admin la hace el controlador
export async function eliminarAnuncio(id) {
    // Buscamos el anuncio antes de eliminarlo para poder devolverlo en la respuesta
    const existente = await getAnuncioById(Number(id));
    if (!existente) return null;

    // DELETE borra permanentemente el registro  las FKs de CASCADE borran dependencias
    await pool.query('DELETE FROM comunicador_anuncios WHERE id = ?', [Number(id)]);

    // Retornamos el objeto del anuncio que existia antes del DELETE
    return existente;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  NOTIFICACIONES                                              ║
// ╚══════════════════════════════════════════════════════════════╝

// ── getNotificacionById ───────────────────────────────────────────────────────
// Busca una notificacion por id, incluyendo su lista de roles destino
// La lista de roles se obtiene con un JOIN a comunicador_notificaciones_roles + roles
// Retorna null si no existe el id
export async function getNotificacionById(id) {
    // Obtenemos el registro principal de la notificacion
    const [rows] = await pool.query(
        `SELECT cn.id,
                cn.autor_id,
                cn.titulo,
                cn.contenido,
                cn.created_at,
                u.name AS autor_name,
                u.role AS autor_role
         FROM comunicador_notificaciones cn
         JOIN users u ON u.id = cn.autor_id
         WHERE cn.id = ?`,
        [Number(id)]
    );
    if (!rows[0]) return null;

    // Obtenemos los nombres de roles destino desde la tabla pivote (3FN, no JSON)
    const [roleRows] = await pool.query(
        `SELECT r.name
         FROM comunicador_notificaciones_roles cnr
         JOIN roles r ON r.id = cnr.role_id
         WHERE cnr.notificacion_id = ?`,
        [Number(id)]
    );

    // Adjuntamos el arreglo de nombres de roles al objeto de la notificacion
    rows[0].roles_destino = roleRows.map(r => r.name);
    return rows[0];
}

// ── crearNotificacion ─────────────────────────────────────────────────────────
// Inserta una notificacion y sus roles destino en la tabla pivote (3FN)
// Parametros:
//   autorId    id del usuario que crea la notificacion (requiere comunicador.notificaciones)
//   titulo     titulo de la notificacion
//   contenido  cuerpo de la notificacion
//   roles      arreglo de nombres de rol destino: ['admin', 'instructor', ...]
export async function crearNotificacion({ autorId, titulo, contenido, roles }) {
    // Insertamos la notificacion en la tabla principal (SIN la columna roles  esta normalizada)
    const [result] = await pool.query(
        'INSERT INTO comunicador_notificaciones (autor_id, titulo, contenido) VALUES (?, ?, ?)',
        [Number(autorId), titulo, contenido]
    );
    const notifId = result.insertId;

    // Insertamos los roles destino en la tabla pivote
    // SELECT desde roles para convertir nombres de rol → IDs sin hardcodear IDs numericos
    // INSERT IGNORE evita error si la combinacion (notificacion_id, role_id) ya existe
    if (roles && roles.length > 0) {
        await pool.query(
            `INSERT IGNORE INTO comunicador_notificaciones_roles (notificacion_id, role_id)
             SELECT ?, r.id
             FROM roles r
             WHERE r.name IN (?)`,
            [notifId, roles]
        );
    }

    // Retornamos el objeto completo de la notificacion ya con roles_destino incluidos
    return getNotificacionById(notifId);
}

// ── getNotificacionesPorRol ────────────────────────────────────────────────────
// Retorna las notificaciones destinadas al rol primario del usuario autenticado
// Incluye un campo `leida` (0 o 1) que indica si ESTE usuario especifico ya la leyo
//
// Parametros:
//   roleName  rol primario del usuario (req.usuario.role del JWT)
//   userId    id del usuario autenticado (para calcular el campo `leida`)
export async function getNotificacionesPorRol(roleName, userId) {
    // JOIN con comunicador_notificaciones_roles para filtrar solo las de este rol
    // LEFT JOIN con comunicador_notificaciones_leidas para saber si el usuario la leyo
    //   (si no hay fila de lectura para este usuario → leida = 0)
    //   (si hay fila de lectura → leida = 1)
    const [rows] = await pool.query(
        `SELECT
            cn.id,
            cn.autor_id,
            cn.titulo,
            cn.contenido,
            cn.created_at,
            u.name AS autor_name,
            CASE WHEN cnl.id IS NOT NULL THEN 1 ELSE 0 END AS leida
         FROM comunicador_notificaciones cn
         JOIN users u ON u.id = cn.autor_id
         JOIN comunicador_notificaciones_roles cnr ON cnr.notificacion_id = cn.id
         JOIN roles r ON r.id = cnr.role_id AND r.name = ?
         LEFT JOIN comunicador_notificaciones_leidas cnl
            ON cnl.notificacion_id = cn.id AND cnl.user_id = ?
         ORDER BY cn.created_at DESC`,
        [roleName, Number(userId)]
    );
    return rows;
}

// ── marcarNotificacionLeida ────────────────────────────────────────────────────
// Registra que el usuario leyo la notificacion  idempotente gracias a INSERT IGNORE
// INSERT IGNORE: si el usuario ya la marco como leida, no hace nada (no falla)
//
// Parametros:
//   notificacionId  id de la notificacion del comunicador
//   userId          id del usuario que la marco como leida
export async function marcarNotificacionLeida(notificacionId, userId) {
    // INSERT IGNORE evita el error de clave duplicada si ya existe la fila UNIQUE(notificacion_id, user_id)
    await pool.query(
        `INSERT IGNORE INTO comunicador_notificaciones_leidas (notificacion_id, user_id)
         VALUES (?, ?)`,
        [Number(notificacionId), Number(userId)]
    );
}
