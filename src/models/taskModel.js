// MÓDULO: models/tasks.model.js
// CAPA: Modelo (datos y operaciones sobre la tabla tasks en MySQL)
//
// MySQL no tiene tipo array nativo.
// assigned_users se guarda como JSON string en la columna assigned_users.
// serializarUsuarios y deserializarUsuarios convierten entre arreglo JS y string JSON.

import pool from '../database/connection.js';

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
// convierte assignedUsers → assigned_users antes del UPDATE
export async function updateTask(id, campos) {
    const existente = await getTaskById(id);
    if (!existente) return null;

    const camposDb = {};
    if (campos.title         !== undefined) camposDb.title          = campos.title;
    if (campos.description   !== undefined) camposDb.description    = campos.description;
    if (campos.status        !== undefined) camposDb.status         = campos.status;
    if (campos.assignedUsers !== undefined) {
        camposDb.assigned_users = serializarUsuarios(campos.assignedUsers);
    }

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

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES AGREGADAS — estas no existían y el controlador las necesitaba
// ─────────────────────────────────────────────────────────────────────────────

// AGREGADA: cambia solo el campo status de una tarea
// el controlador la importa como: updateTaskStatus as changeStatus
// se usa en PATCH /api/tasks/:id/status
export async function updateTaskStatus(id, status) {
    // llama a updateTask pasando solo el campo status
    // updateTask ya se encarga de verificar si la tarea existe (retorna null si no)
    return updateTask(id, { status });
}

// AGREGADA: agrega usuarios a la lista assignedUsers de una tarea
// el controlador la importa como: assignUsersToTask as addUsersToTask
// se usa en POST /api/tasks/:taskId/assign
// recibe: taskId (id de la tarea), userIds (arreglo de ids a agregar)
export async function assignUsersToTask(taskId, userIds) {
    // busca la tarea para obtener los usuarios que ya tiene asignados
    const tarea = await getTaskById(taskId);

    // si la tarea no existe retorna null para que el controlador responda 404
    if (!tarea) return null;

    // combina los usuarios existentes con los nuevos usando Set para evitar duplicados
    // tarea.assignedUsers → arreglo actual (ej: [1, 2])
    // userIds.map(Number) → convierte los nuevos ids a Number para consistencia (ej: [2, 3] → [2, 3])
    // new Set([...]) → elimina duplicados (ej: [1, 2, 2, 3] → {1, 2, 3})
    // [...new Set(...)] → convierte el Set de vuelta a arreglo (ej: [1, 2, 3])
    const nuevosUsuarios = [...new Set([...tarea.assignedUsers, ...userIds.map(Number)])];

    // llama a updateTask para guardar el arreglo actualizado en la BD
    return updateTask(taskId, { assignedUsers: nuevosUsuarios });
}

// AGREGADA: quita un usuario específico de la lista assignedUsers de una tarea
// el controlador la importa como: removeUserFromTask as detachUser
// se usa en DELETE /api/tasks/:taskId/users/:userId
// recibe: taskId (id de la tarea), userId (id del usuario a quitar)
export async function removeUserFromTask(taskId, userId) {
    // busca la tarea para obtener los usuarios actuales
    const tarea = await getTaskById(taskId);

    // si la tarea no existe retorna null para que el controlador responda 404
    if (!tarea) return null;

    // filtra el arreglo assignedUsers eliminando el usuario cuyo id coincide con userId
    // Number(userId) convierte el parámetro de URL (string) a número para comparar correctamente
    const filtrados = tarea.assignedUsers.filter(id => id !== Number(userId));

    // llama a updateTask para guardar el arreglo sin ese usuario en la BD
    return updateTask(taskId, { assignedUsers: filtrados });
}