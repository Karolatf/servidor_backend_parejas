// MÓDULO: models/task.model.js
// CAPA: Modelo (datos y operaciones sobre la tabla tasks en MySQL)
//
// Responsabilidad única: interactuar con la tabla tasks de MySQL.
// NUNCA conoce req, res ni Express.
//
// CORRECCIONES APLICADAS EN ESTA VERSIÓN:
//   1. formatearTarea()  → incluye el campo 'comment' que faltaba.
//   2. createTask()      → inserta el campo 'comment' en el INSERT.
//   3. updateTask()      → permite actualizar el campo 'comment'.
//
// pool.query retorna [filas, metadatos] — desestructuramos con [rows]
// para tomar solo las filas y descartar los metadatos que no necesitamos.

import pool from '../database/db.connection.js';

// ── FUNCIONES PRIVADAS DE SERIALIZACIÓN ─────────────────────────────────────

// Convierte arreglo JS a JSON string para guardar en la columna assigned_users.
// MySQL no tiene tipo array nativo, así que guardamos el JSON como texto.
// Ejemplo: [1, 2, 3] → '[1,2,3]'
// Todos los ids se convierten a Number para que la comparación sea consistente.
function serializarUsuarios(arreglo) {
    if (!arreglo || !Array.isArray(arreglo)) return JSON.stringify([]);
    return JSON.stringify(arreglo.map(id => Number(id)));
}

// Convierte el valor de la columna assigned_users de MySQL a arreglo JS.
// MySQL puede retornar el campo ya como arreglo (columna JSON nativa) o como string.
// El try/catch evita que JSON.parse rompa la aplicación si el valor es inválido.
function deserializarUsuarios(valor) {
    if (Array.isArray(valor)) return valor;
    try { return JSON.parse(valor || '[]'); } catch { return []; }
}

// Formatea una fila de MySQL convirtiendo los nombres de columnas a camelCase
// y resolviendo el campo assigned_users de JSON a arreglo JS.
// CORRECCIÓN: se agrega el campo 'comment' que faltaba en la versión anterior.
//   Sin este campo, el frontend enviaba comment al editar una tarea,
//   pero la respuesta del servidor nunca lo incluía → la tabla mostraba '—' siempre.
// Parámetro: filaDb — objeto raw devuelto por pool.query (nombres con underscore).
// Retorna: objeto con nombres camelCase listo para enviar como JSON al frontend.
function formatearTarea(filaDb) {
    if (!filaDb) return null;
    return {
        id:            filaDb.id,
        title:         filaDb.title,
        description:   filaDb.description,
        status:        filaDb.status,
        // CORRECCIÓN: campo comment incluido. Usa || null para evitar undefined.
        // Si la columna es NULL en MySQL, MySQL2 lo devuelve como null de JS.
        comment:       filaDb.comment || null,
        assignedUsers: deserializarUsuarios(filaDb.assigned_users),
        createdAt:     filaDb.created_ud
    };
}

// ── FUNCIONES EXPORTADAS (usadas por el controlador) ────────────────────────

// RF03 — READ: retorna todas las tareas con los nombres de usuarios resueltos.
// Hace un cross-join en memoria entre tareas y usuarios para que el frontend
// pueda mostrar los nombres en lugar de los IDs numéricos.
// assignedUsersDisplay: string formateado listo para la columna "Usuario asignado".
export async function getAllTasks() {
    // Se obtienen todas las tareas de la tabla tasks
    const [rows]     = await pool.query('SELECT * FROM tasks');
    // Se obtienen todos los usuarios para resolver los IDs a nombres
    const [usuarios] = await pool.query('SELECT id, name, documento FROM users');

    return rows.map(function(fila) {
        const tarea   = formatearTarea(fila);

        const nombres = tarea.assignedUsers.map(function(id) {
            const encontrado = usuarios.find(u => u.id === Number(id));
            return encontrado ? encontrado.name : null;
        }).filter(Boolean);

        tarea.assignedUsersDisplay = nombres.length > 0 ? nombres.join(', ') : null;

        // assignedDocumentos: permite filtrar por documento en el panel admin
        tarea.assignedDocumentos = tarea.assignedUsers.map(function(id) {
            const encontrado = usuarios.find(u => u.id === Number(id));
            return encontrado ? encontrado.documento.toString() : null;
        }).filter(Boolean);

        return tarea;
    });
}

// RF03 — READ: busca una tarea por su id numérico.
// El ? es un placeholder que mysql2 reemplaza de forma segura (evita SQL injection).
// Retorna la tarea formateada, o null si no existe.
export async function getTaskById(id) {
    const [rows] = await pool.query(
        'SELECT * FROM tasks WHERE id = ?',
        [Number(id)]
    );
    // formatearTarea devuelve null si filaDb es undefined (tarea no encontrada)
    return formatearTarea(rows[0]);
}

// RF02 — CREATE: inserta una tarea nueva en la tabla tasks.
// CORRECCIÓN: se agrega 'comment' al INSERT para persistir el campo en MySQL.
//   En la versión anterior el INSERT no incluía comment, por lo que siempre
//   quedaba NULL en la base de datos aunque el frontend lo enviara.
// Parámetros desestructurados con valores por defecto para campos opcionales:
//   status       → 'pendiente' si no se especifica
//   assignedUsers → [] si no se especifica
//   comment      → null si no se especifica (es opcional)
// Retorna: el objeto de la tarea recién creada, con el id asignado por MySQL.
export async function createTask({
    title,
    description,
    status        = 'pendiente',
    assignedUsers = [],
    comment       = null
}) {
    const [result] = await pool.query(
        // CORRECCIÓN: se agrega la columna 'comment' al INSERT
        'INSERT INTO tasks (title, description, status, assigned_users, comment) VALUES (?, ?, ?, ?, ?)',
        [
            title,
            description || '',
            status,
            serializarUsuarios(assignedUsers),
            // Si comment es cadena vacía lo convertimos a null para consistencia
            comment || null
        ]
    );
    // result.insertId tiene el id AUTO_INCREMENT que MySQL asignó a la nueva fila
    return getTaskById(result.insertId);
}

// RF03 — UPDATE: actualiza los campos de una tarea existente.
// CORRECCIÓN: se agrega 'comment' a la lista de campos que se pueden actualizar.
//   En la versión anterior, aunque el frontend enviara comment al editar,
//   el modelo lo ignoraba y MySQL nunca guardaba el nuevo valor.
// Lista blanca de campos permitidos: cualquier otro campo del body se ignora.
// Retorna: la tarea actualizada, o null si el id no existe.
export async function updateTask(id, campos) {
    const existente = await getTaskById(id);
    if (!existente) return null;

    // Se construye el objeto de campos a actualizar solo con los permitidos
    const camposDb = {};

    // Verificamos cada campo permitido y lo incluimos solo si llegó en el body
    if (campos.title         !== undefined) camposDb.title          = campos.title;
    if (campos.description   !== undefined) camposDb.description    = campos.description;
    if (campos.status        !== undefined) camposDb.status         = campos.status;
    if (campos.assignedUsers !== undefined) camposDb.assigned_users = serializarUsuarios(campos.assignedUsers);
    // CORRECCIÓN: se permite actualizar el campo comment
    // Se convierte cadena vacía a null para que MySQL guarde NULL, no una cadena vacía
    if (campos.comment !== undefined) camposDb.comment = campos.comment || null;

    // Si no llegó ningún campo válido no se ejecuta el UPDATE innecesariamente
    if (Object.keys(camposDb).length === 0) return existente;

    // Se construye dinámicamente la parte SET del SQL: "title = ?, status = ?, ..."
    const parteSet = Object.keys(camposDb).map(c => `${c} = ?`).join(', ');
    await pool.query(
        `UPDATE tasks SET ${parteSet} WHERE id = ?`,
        [...Object.values(camposDb), Number(id)]
    );
    // Se retorna la tarea con los datos ya actualizados desde MySQL
    return getTaskById(id);
}

// RF04 — DELETE: elimina una tarea de la tabla tasks.
// Primero guarda el objeto para retornarlo como confirmación de lo que se eliminó.
// Retorna: el objeto de la tarea eliminada, o null si el id no existía.
export async function deleteTask(id) {
    const aEliminar = await getTaskById(id);
    if (!aEliminar) return null;

    await pool.query('DELETE FROM tasks WHERE id = ?', [Number(id)]);
    return aEliminar;
}

// FILTRO — retorna tareas filtradas por estado y/o usuario asignado.
// Se usa en GET /api/tasks/filter?status=pendiente&userId=1.
// Filtra en memoria después de cargar todas las tareas con getAllTasks().
export async function filterTasks({ status, userId } = {}) {
    let resultado = await getAllTasks();

    // Si llegó status solo se conservan las tareas con ese estado
    if (status) resultado = resultado.filter(t => t.status === status);
    // Si llegó userId solo se conservan las tareas donde ese id está en assignedUsers
    if (userId) resultado = resultado.filter(t => t.assignedUsers.includes(Number(userId)));

    return resultado;
}

// Retorna todas las tareas asignadas a un usuario específico.
// Se usa en GET /api/users/:userId/tasks.
export async function getTasksByUserId(userId) {
    const todas = await getAllTasks();
    return todas.filter(t => t.assignedUsers.includes(Number(userId)));
}

// Cambia solo el campo status de una tarea sin tocar los demás campos.
// Se usa en PATCH /api/tasks/:id/status.
export async function updateTaskStatus(id, status) {
    return updateTask(id, { status });
}

// Agrega usuarios a la lista assignedUsers de una tarea, sin duplicados.
// Usa Set para eliminar automáticamente los ids que ya estaban en la lista.
// Se usa en POST /api/tasks/:taskId/assign.
export async function assignUsersToTask(taskId, userIds) {
    const tarea = await getTaskById(taskId);
    if (!tarea) return null;

    // [...new Set(...)] elimina duplicados combinando los existentes y los nuevos
    const nuevosUsuarios = [...new Set([...tarea.assignedUsers, ...userIds.map(Number)])];
    return updateTask(taskId, { assignedUsers: nuevosUsuarios });
}

// Quita un usuario específico de la lista assignedUsers de una tarea.
// Se usa en DELETE /api/tasks/:taskId/users/:userId.
export async function removeUserFromTask(taskId, userId) {
    const tarea = await getTaskById(taskId);
    if (!tarea) return null;

    // filter devuelve todos los ids EXCEPTO el que se quiere eliminar
    const filtrados = tarea.assignedUsers.filter(id => id !== Number(userId));
    return updateTask(taskId, { assignedUsers: filtrados });
}