// MÓDULO: controller/tasks.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)

// Responsabilidad única: manejar las peticiones HTTP de tareas.
// NUNCA maneja datos directamente.

// Paulo importa estas funciones en taskRoutes.js con estos nombres exactos:
//   getTasks, getTaskById, createTask, updateTask, deleteTask,
//   updateTaskStatus, assignUsersToTask, getAssignedUsers,
//   removeUserFromTask, filterTasks, getDashboard

// Se importan las funciones del modelo de tareas
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
} from '../models/taskModel.js';

// GET /api/tasks
// Retorna todas las tareas
// Paulo: router.get('/', getTasks)
// IMPORTANTE: Karol usa GET /api/tasks en adminPanel.js y en buscarUsuario.js
// La respuesta incluye assignedUsers como arreglo de números (garantizado por el modelo)
// CORREGIDO: se agregó async porque getAllTasks() es una función asíncrona (usa await internamente)
export async function getTasks(req, res) {
    try {
        // CORREGIDO: se agregó await para esperar el resultado de getAllTasks()
        // sin await, tareas sería una Promise pendiente en lugar del arreglo de tareas
        const tareas = await getAllTasks();
        res.status(200).json(tareas);
    } catch (error) {
        console.error('Error en getTasks:', error);
        res.status(500).json({ error: 'Error al obtener las tareas' });
    }
}

// GET /api/tasks/:id
// Retorna una tarea por su id
// Paulo: router.get('/:id', getTaskById)
// NOTA: Paulo define /filter y /dashboard ANTES de /:id para que Express no los confunda
// CORREGIDO: se agregó async porque findTaskById() es una función asíncrona
export async function getTaskById(req, res) {
    try {
        const { id } = req.params;
        // CORREGIDO: se agregó await para esperar el resultado de findTaskById()
        // sin await, tarea sería una Promise y el if (!tarea) nunca sería true aunque no exista
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
// Paulo: router.post('/', createTask)
// CORREGIDO: se agregó async porque insertTask() es una función asíncrona
export async function createTask(req, res) {
    try {
        const { title, description, status, assignedUsers } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'El campo title es obligatorio' });
        }

        // CORREGIDO: se agregó await para esperar que insertTask() termine de guardar en la BD
        // sin await, nuevaTarea sería una Promise y se enviaría como respuesta en lugar del objeto real
        const nuevaTarea = await insertTask({ title, description, status, assignedUsers });
        res.status(201).json(nuevaTarea);
    } catch (error) {
        console.error('Error en createTask:', error);
        res.status(500).json({ error: 'Error al crear la tarea' });
    }
}

// PUT /api/tasks/:id
// Actualiza una tarea
// Paulo: router.put('/:id', updateTask)
// CORREGIDO: se agregó async porque modifyTask() es una función asíncrona
export async function updateTask(req, res) {
    try {
        const { id } = req.params;
        const campos = req.body;

        // CORREGIDO: se agregó await para esperar el resultado de modifyTask()
        // sin await, tareaActualizada sería una Promise y el if (!tareaActualizada) nunca funcionaría
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
// Paulo: router.delete('/:id', deleteTask)
// CORREGIDO: se agregó async porque removeTask() es una función asíncrona
export async function deleteTask(req, res) {
    try {
        const { id } = req.params;
        // CORREGIDO: se agregó await para esperar que removeTask() termine de eliminar en la BD
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
// Paulo: router.patch('/:id/status', updateTaskStatus)
// CORREGIDO: se agregó async porque changeStatus() es una función asíncrona
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

        // CORREGIDO: se agregó await para esperar el resultado de changeStatus()
        // sin await, tareaActualizada sería una Promise y el if (!tareaActualizada) nunca funcionaría
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
// Paulo: router.post('/:taskId/assign', assignUsersToTask)
// Cuerpo: { userIds: [1, 2, 3] }
// CORREGIDO: se agregó async porque addUsersToTask() es una función asíncrona
export async function assignUsersToTask(req, res) {
    try {
        const { taskId } = req.params;
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'Se requiere un arreglo userIds con al menos un id' });
        }

        // CORREGIDO: se agregó await para esperar que addUsersToTask() termine de actualizar la BD
        // sin await, tareaActualizada sería una Promise y el if (!tareaActualizada) nunca funcionaría
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
// Paulo: router.get('/:taskId/users', getAssignedUsers)
// CORREGIDO: se agregó async porque findTaskById() es una función asíncrona
export async function getAssignedUsers(req, res) {
    try {
        const { taskId } = req.params;
        // CORREGIDO: se agregó await para esperar el resultado de findTaskById()
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
// Paulo: router.delete('/:taskId/users/:userId', removeUserFromTask)
// CORREGIDO: se agregó async porque detachUser() es una función asíncrona
export async function removeUserFromTask(req, res) {
    try {
        const { taskId, userId } = req.params;
        // CORREGIDO: se agregó await para esperar que detachUser() termine de actualizar la BD
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
// Paulo: router.get('/filter', filterTasks)
// IMPORTANTE: Paulo define esta ruta ANTES de /:id para evitar conflicto de parámetros
// Query: ?status=pendiente   ?userId=1   ?status=en_progreso&userId=2
// CORREGIDO: se agregó async porque filterTasksModel() es una función asíncrona
export async function filterTasks(req, res) {
    try {
        const { status, userId } = req.query;
        // CORREGIDO: se agregó await para esperar el arreglo filtrado de filterTasksModel()
        const resultado = await filterTasksModel({ status, userId });
        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error en filterTasks:', error);
        res.status(500).json({ error: 'Error al filtrar las tareas' });
    }
}

// GET /api/tasks/dashboard
// Retorna estadísticas generales del sistema
// Paulo: router.get('/dashboard', getDashboard)
// IMPORTANTE: Paulo define esta ruta ANTES de /:id para evitar conflicto de parámetros
// CORREGIDO: se agregó async porque getAllTasks() es una función asíncrona
export async function getDashboard(req, res) {
    try {
        // CORREGIDO: se agregó await para esperar el arreglo completo de tareas
        // sin await, tareas sería una Promise y .filter() lanzaría un error
        const tareas = await getAllTasks();

        // Se calculan totales por estado
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