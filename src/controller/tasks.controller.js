// MÓDULO: controller/tasks.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)

// Responsabilidad única: manejar las peticiones HTTP de tareas.
// NUNCA maneja datos directamente — solo recibe req, llama el modelo y responde res.

import {
    getAllTasks,
    getTaskById         as findTaskById,
    createTask          as insertTask,
    updateTask          as modifyTask,
    deleteTask          as removeTask,
    updateTaskStatus    as changeStatus,
    assignUsersToTask   as addUsersToTask,
    removeUserFromTask  as detachUser,
    filterTasks         as filterTasksModel
} from '../models/task.model.js';

// GET /api/tasks
// Retorna todas las tareas
export async function getTasks(req, res) {
    try {
        const tareas = await getAllTasks();
        res.status(200).json(tareas);
    } catch (error) {
        console.error('Error en getTasks:', error);
        res.status(500).json({ error: 'Error al obtener las tareas' });
    }
}

// GET /api/tasks/:id
// Retorna una tarea por su id
// NOTA: en tasks.routes.js esta ruta va DESPUÉS de /filter y /dashboard
export async function getTaskById(req, res) {
    try {
        const { id } = req.params;
        const tarea = await findTaskById(id);

        if (!tarea) {
            return res.status(404).json({ error: `Tarea con id ${id} no encontrada` });
        }

        res.status(200).json(tarea);
    } catch (error) {
        console.error('Error en getTaskById:', error);
        res.status(500).json({ error: 'Error al obtener la tarea' });
    }
}

// POST /api/tasks
// Crea una tarea nueva
// Cuerpo: { title, description, status, assignedUsers }
export async function createTask(req, res) {
    try {
        const { title, description, status, assignedUsers } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'El campo title es obligatorio' });
        }

        const nuevaTarea = await insertTask({ title, description, status, assignedUsers });
        res.status(201).json(nuevaTarea);
    } catch (error) {
        console.error('Error en createTask:', error);
        res.status(500).json({ error: 'Error al crear la tarea' });
    }
}

// PUT /api/tasks/:id
// Actualiza una tarea completa
export async function updateTask(req, res) {
    try {
        const { id } = req.params;
        const campos = req.body;

        const tareaActualizada = await modifyTask(id, campos);

        if (!tareaActualizada) {
            return res.status(404).json({ error: `Tarea con id ${id} no encontrada` });
        }

        res.status(200).json(tareaActualizada);
    } catch (error) {
        console.error('Error en updateTask:', error);
        res.status(500).json({ error: 'Error al actualizar la tarea' });
    }
}

// DELETE /api/tasks/:id
// Elimina una tarea
export async function deleteTask(req, res) {
    try {
        const { id } = req.params;
        const tareaEliminada = await removeTask(id);

        if (!tareaEliminada) {
            return res.status(404).json({ error: `Tarea con id ${id} no encontrada` });
        }

        res.status(200).json({ mensaje: `Tarea "${tareaEliminada.title}" eliminada correctamente` });
    } catch (error) {
        console.error('Error en deleteTask:', error);
        res.status(500).json({ error: 'Error al eliminar la tarea' });
    }
}

// PATCH /api/tasks/:id/status
// Cambia solo el estado de una tarea
// Cuerpo: { status: 'pendiente' | 'en_progreso' | 'completada' }
export async function updateTaskStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const estadosValidos = ['pendiente', 'en_progreso', 'completada'];
        if (!status || !estadosValidos.includes(status)) {
            return res.status(400).json({
                error: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`
            });
        }

        const tareaActualizada = await changeStatus(id, status);

        if (!tareaActualizada) {
            return res.status(404).json({ error: `Tarea con id ${id} no encontrada` });
        }

        res.status(200).json(tareaActualizada);
    } catch (error) {
        console.error('Error en updateTaskStatus:', error);
        res.status(500).json({ error: 'Error al actualizar el estado' });
    }
}

// POST /api/tasks/:taskId/assign
// Asigna usuarios a una tarea
// Cuerpo: { userIds: [1, 2, 3] }
export async function assignUsersToTask(req, res) {
    try {
        const { taskId } = req.params;
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'Se requiere un arreglo userIds con al menos un id' });
        }

        const tareaActualizada = await addUsersToTask(taskId, userIds);

        if (!tareaActualizada) {
            return res.status(404).json({ error: `Tarea con id ${taskId} no encontrada` });
        }

        res.status(200).json(tareaActualizada);
    } catch (error) {
        console.error('Error en assignUsersToTask:', error);
        res.status(500).json({ error: 'Error al asignar usuarios' });
    }
}

// GET /api/tasks/:taskId/users
// Retorna los ids de usuarios asignados a una tarea
export async function getAssignedUsers(req, res) {
    try {
        const { taskId } = req.params;
        const tarea = await findTaskById(taskId);

        if (!tarea) {
            return res.status(404).json({ error: `Tarea con id ${taskId} no encontrada` });
        }

        res.status(200).json(tarea.assignedUsers);
    } catch (error) {
        console.error('Error en getAssignedUsers:', error);
        res.status(500).json({ error: 'Error al obtener los usuarios asignados' });
    }
}

// DELETE /api/tasks/:taskId/users/:userId
// Quita un usuario de una tarea
export async function removeUserFromTask(req, res) {
    try {
        const { taskId, userId } = req.params;
        const tareaActualizada = await detachUser(taskId, userId);

        if (!tareaActualizada) {
            return res.status(404).json({ error: `Tarea con id ${taskId} no encontrada` });
        }

        res.status(200).json(tareaActualizada);
    } catch (error) {
        console.error('Error en removeUserFromTask:', error);
        res.status(500).json({ error: 'Error al quitar el usuario de la tarea' });
    }
}

// GET /api/tasks/filter
// Filtra tareas por estado y/o usuario
// IMPORTANTE: en tasks.routes.js esta ruta va ANTES de /:id
// Query: ?status=pendiente   ?userId=1   ?status=en_progreso&userId=2
export async function filterTasks(req, res) {
    try {
        const { status, userId } = req.query;
        const resultado = await filterTasksModel({ status, userId });
        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error en filterTasks:', error);
        res.status(500).json({ error: 'Error al filtrar las tareas' });
    }
}

// GET /api/tasks/dashboard
// Retorna estadísticas generales: total, pendientes, enProgreso, completadas
// IMPORTANTE: en tasks.routes.js esta ruta va ANTES de /:id
export async function getDashboard(req, res) {
    try {
        const tareas = await getAllTasks();

        const pendientes  = tareas.filter(t => t.status === 'pendiente').length;
        const enProgreso  = tareas.filter(t => t.status === 'en_progreso').length;
        const completadas = tareas.filter(t => t.status === 'completada').length;

        res.status(200).json({
            total: tareas.length,
            pendientes,
            enProgreso,
            completadas
        });
    } catch (error) {
        console.error('Error en getDashboard:', error);
        res.status(500).json({ error: 'Error al obtener el dashboard' });
    }
}