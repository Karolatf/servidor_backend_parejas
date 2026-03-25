// MÓDULO: models/users.model.js
// CAPA: Modelo (datos y operaciones sobre la tabla users en MySQL)
//
// Responsabilidad única: interactuar con la tabla users de MySQL.
// NUNCA conoce req, res ni Express.
//
// pool.query retorna [filas, metadatos] — desestructuramos con [rows]
// para tomar solo las filas y descartar los metadatos que no necesitamos.

import pool from '../database/connection.js';

// RF03 — READ: retorna todos los usuarios de la tabla users
// el arreglo completo se usa en GET /api/users
export async function getAllUsers() {
    const [rows] = await pool.query('SELECT * FROM users');
    return rows;
}

// RF03 — READ: busca un usuario por su id numérico
// el ? es un placeholder que mysql2 reemplaza de forma segura (evita SQL injection)
// retorna el primer resultado, o undefined si no existe
export async function getUserById(id) {
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [Number(id)]
    );
    return rows[0];
}

// busca un usuario por su número de documento de identidad
// Karol lo usa desde el frontend para buscar por documento
export async function getUserByDocumento(documento) {
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE documento = ?',
        [documento.toString()]
    );
    return rows[0];
}

// RF02 — CREATE: inserta un usuario nuevo en la tabla users
// result.insertId contiene el id AUTO_INCREMENT que MySQL asignó
// retornamos el usuario completo llamando a getUserById para incluir timestamps
export async function createUser({ documento, name, email }) {
    const [result] = await pool.query(
        'INSERT INTO users (documento, name, email) VALUES (?, ?, ?)',
        [documento, name, email]
    );
    return getUserById(result.insertId);
}

// actualiza los campos de un usuario existente
// Object.keys(campos) construye dinámicamente el SET del UPDATE
// solo actualiza los campos que lleguen en el objeto (flexible)
export async function updateUser(id, campos) {
    const existente = await getUserById(id);
    if (!existente) return null;

    const parteSet = Object.keys(campos).map(c => `${c} = ?`).join(', ');
    const valores  = Object.values(campos);

    await pool.query(
        `UPDATE users SET ${parteSet} WHERE id = ?`,
        [...valores, Number(id)]
    );
    return getUserById(id);
}

// elimina un usuario de la tabla users
// primero guarda el objeto para retornarlo y confirmar qué se eliminó
export async function deleteUser(id) {
    const aEliminar = await getUserById(id);
    if (!aEliminar) return null;

    await pool.query('DELETE FROM users WHERE id = ?', [Number(id)]);
    return aEliminar;
}