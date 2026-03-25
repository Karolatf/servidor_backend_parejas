// MÓDULO: models/taskModel.js
// CAPA: Modelo (datos y operaciones sobre los datos)

// Responsabilidad única: manejar la fuente de datos de tareas.
// NUNCA conoce req, res ni Express.

// Arreglo en memoria — empieza vacío, las tareas se crean desde el frontend
let tareas = [];

// Contador para el próximo id automático
let contadorId = 1;

// Retorna una copia del arreglo completo de tareas
export function getAllTasks() {
    return tareas.slice();
}

// Busca una tarea por su id numérico
// Retorna el objeto tarea o undefined si no existe
export function getTaskById(id) {
    return tareas.find(t => t.id === Number(id));
}

// Crea una tarea nueva y la agrega al arreglo
// Parámetro: objeto con { title, description, status, assignedUsers }
// Retorna la tarea creada con id y createdAt asignados
export function createTask({ title, description, status = 'pendiente', assignedUsers = [] }) {
    const nuevaTarea = {
        id: contadorId,
        title,
        description,
        // Si no se envía status se usa 'pendiente' por defecto
        status,
        // Se convierten todos los ids a Number para que .includes() de Karol funcione
        assignedUsers: assignedUsers.map(id => Number(id)),
        // Fecha de creación en formato ISO
        createdAt: new Date().toISOString()
    };

    contadorId++;
    tareas.push(nuevaTarea);
    return nuevaTarea;
}

// Actualiza los campos de una tarea existente
// Retorna la tarea actualizada, o null si no existe
export function updateTask(id, campos) {
    const indice = tareas.findIndex(t => t.id === Number(id));
    if (indice === -1) return null;

    tareas[indice] = { ...tareas[indice], ...campos };
    return tareas[indice];
}

// Elimina una tarea por su id
// Retorna la tarea eliminada, o null si no existía
export function deleteTask(id) {
    const indice = tareas.findIndex(t => t.id === Number(id));
    if (indice === -1) return null;

    const [tareaEliminada] = tareas.splice(indice, 1);
    return tareaEliminada;
}

// Cambia solo el campo status de una tarea
// Parámetro: nuevoStatus — 'pendiente', 'en_progreso' o 'completada'
// Retorna la tarea actualizada, o null si no existe
export function updateTaskStatus(id, nuevoStatus) {
    const indice = tareas.findIndex(t => t.id === Number(id));
    if (indice === -1) return null;

    tareas[indice].status = nuevoStatus;
    return tareas[indice];
}

// Agrega ids de usuarios al arreglo assignedUsers de una tarea
// Evita duplicados: si un id ya está no se agrega dos veces
// Parámetro: userIds — arreglo de ids (pueden llegar como strings, se convierten)
// Retorna la tarea actualizada, o null si no existe
export function assignUsersToTask(taskId, userIds) {
    const indice = tareas.findIndex(t => t.id === Number(taskId));
    if (indice === -1) return null;

    userIds.forEach(function (uid) {
        const idNumerico = Number(uid);
        // Solo se agrega si no está ya en el arreglo
        if (!tareas[indice].assignedUsers.includes(idNumerico)) {
            tareas[indice].assignedUsers.push(idNumerico);
        }
    });

    return tareas[indice];
}

// Quita un usuario específico del arreglo assignedUsers de una tarea
// Retorna la tarea actualizada, o null si no existe
export function removeUserFromTask(taskId, userId) {
    const indice = tareas.findIndex(t => t.id === Number(taskId));
    if (indice === -1) return null;

    // filter crea un arreglo nuevo sin el id del usuario a quitar
    tareas[indice].assignedUsers = tareas[indice].assignedUsers.filter(
        uid => uid !== Number(userId)
    );

    return tareas[indice];
}

// Retorna todas las tareas que tengan asignado un usuario específico
// Karol usa esta lógica indirectamente: filtra en el frontend con .includes(usuario.id)
// Esta función hace lo mismo pero en el servidor para el endpoint GET /api/users/:userId/tasks
export function getTasksByUserId(userId) {
    return tareas.filter(t => t.assignedUsers.includes(Number(userId)));
}

// Filtra tareas por estado y/o por usuario asignado
// Parámetros opcionales: { status, userId }
// Se llama desde filterTasks del controlador con los query params
export function filterTasks({ status, userId } = {}) {
    let resultado = tareas.slice();

    if (status) {
        resultado = resultado.filter(t => t.status === status);
    }

    if (userId) {
        resultado = resultado.filter(t => t.assignedUsers.includes(Number(userId)));
    }

    return resultado;
}