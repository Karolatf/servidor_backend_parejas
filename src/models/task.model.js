// MÓDULO: models/task.model.js
// CAPA: Modelo (datos y operaciones sobre la tabla tasks en MySQL)
//
// MySQL no tiene tipo array nativo.
// assigned_users se guarda como JSON string en la columna assigned_users.
// serializarUsuarios y deserializarUsuarios convierten entre arreglo JS y string JSON.

import pool from '../database/db.connection.js';

// convierte arreglo JS a JSON string para guardar en MySQL
// ejemplo: [1, 2, 3] → '[1,2,3]'
// todos los ids se convierten a Number para consistencia
function serializarUsuarios(arreglo) {
    if (!arreglo || !Array.isArray(arreglo)) return JSON.stringify([]);
    return JSON.stringify(arreglo.map(id => Number(id)));
}

// convierte el valor de assigned_users de MySQL a arreglo JS
// MySQL puede retornar el campo ya como arreglo (JSON column) o como string
function deserializarUsuarios(valor) {
    if (Array.isArray(valor)) return valor;
    try { return JSON.parse(valor || '[]'); } catch { return []; }
}

// formatea una fila de MySQL: convierte nombres de columnas a camelCase
// assigned_users → assignedUsers, created_ud → createdAt
function formatearTarea(filaDb) {
    if (!filaDb) return null;
    return {
        id:            filaDb.id,
        title:         filaDb.title,
        description:   filaDb.description,
        status:        filaDb.status,
        assignedUsers: deserializarUsuarios(filaDb.assigned_users),
        createdAt:     filaDb.created_ud
    };
}

// RF03 — READ: retorna todas las tareas formateadas
// se usa en GET /api/tasks
export async function getAllTasks() {
    const [rows] = await pool.query('SELECT * FROM tasks');
    return rows.map(formatearTarea);
}

// RF03 — READ: busca una tarea por su id
// retorna la tarea formateada o null si no existe
export async function getTaskById(id) {
    const [rows] = await pool.query(
        'SELECT * FROM tasks WHERE id = ?',
        [Number(id)]
    );
    return formatearTarea(rows[0]);
}

// RF02 — CREATE: inserta una tarea nueva en la tabla tasks
// result.insertId tiene el id AUTO_INCREMENT que MySQL asignó
export async function createTask({ title, description, status = 'pendiente', assignedUsers = [] }) {
    const [result] = await pool.query(
        'INSERT INTO tasks (title, description, status, assigned_users) VALUES (?, ?, ?, ?)',
        [title, description || '', status, serializarUsuarios(assignedUsers)]
    );
    return getTaskById(result.insertId);
}

// actualiza los campos de una tarea existente
// lista blanca de campos permitidos para evitar actualizaciones no deseadas
export async function updateTask(id, campos) {
    const existente = await getTaskById(id);
    if (!existente) return null;

    // solo se permiten actualizar estos campos — cualquier otro se ignora
    const camposPermitidos = ['title', 'description', 'status', 'assignedUsers'];
    const camposDb = {};

    if (campos.title         !== undefined && camposPermitidos.includes('title'))
        camposDb.title = campos.title;
    if (campos.description   !== undefined)
        camposDb.description = campos.description;
    if (campos.status        !== undefined)
        camposDb.status = campos.status;
    if (campos.assignedUsers !== undefined)
        camposDb.assigned_users = serializarUsuarios(campos.assignedUsers);

    // si no hay campos válidos no se ejecuta el UPDATE
    if (Object.keys(camposDb).length === 0) return existente;

    const parteSet = Object.keys(camposDb).map(c => `${c} = ?`).join(', ');
    await pool.query(
        `UPDATE tasks SET ${parteSet} WHERE id = ?`,
        [...Object.values(camposDb), Number(id)]
    );
    return getTaskById(id);
}

// elimina una tarea de la tabla tasks
// retorna el objeto de la tarea eliminada para confirmación
export async function deleteTask(id) {
    const aEliminar = await getTaskById(id);
    if (!aEliminar) return null;

    await pool.query('DELETE FROM tasks WHERE id = ?', [Number(id)]);
    return aEliminar;
}

// retorna tareas filtradas por estado y/o usuario asignado
// se usa en GET /api/tasks/filter
export async function filterTasks({ status, userId } = {}) {
    let resultado = await getAllTasks();

    if (status)  resultado = resultado.filter(t => t.status === status);
    if (userId)  resultado = resultado.filter(t => t.assignedUsers.includes(Number(userId)));

    return resultado;
}

// retorna todas las tareas donde un usuario específico aparece en assignedUsers
// se usa en GET /api/users/:userId/tasks
export async function getTasksByUserId(userId) {
    const todas = await getAllTasks();
    return todas.filter(t => t.assignedUsers.includes(Number(userId)));
}

// cambia solo el campo status de una tarea
// se usa en PATCH /api/tasks/:id/status
export async function updateTaskStatus(id, status) {
    return updateTask(id, { status });
}

// agrega usuarios a la lista assignedUsers de una tarea sin duplicados
// se usa en POST /api/tasks/:taskId/assign
export async function assignUsersToTask(taskId, userIds) {
    const tarea = await getTaskById(taskId);
    if (!tarea) return null;

    const nuevosUsuarios = [...new Set([...tarea.assignedUsers, ...userIds.map(Number)])];
    return updateTask(taskId, { assignedUsers: nuevosUsuarios });
}

// quita un usuario específico de la lista assignedUsers de una tarea
// se usa en DELETE /api/tasks/:taskId/users/:userId
export async function removeUserFromTask(taskId, userId) {
    const tarea = await getTaskById(taskId);
    if (!tarea) return null;

    const filtrados = tarea.assignedUsers.filter(id => id !== Number(userId));
    return updateTask(taskId, { assignedUsers: filtrados });
}