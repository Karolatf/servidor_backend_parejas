// MÓDULO: controller/tasks.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)
//
// Responsabilidad única: manejar las peticiones HTTP de tareas.
// NUNCA maneja datos directamente — solo recibe req, llama el modelo y responde res.
//
// REFACTORIZACIÓN APLICADA:
//   Se eliminaron todos los bloques try/catch manuales y las líneas
//   res.status().json() directas. Ahora se usan:
//   - catchAsync: para capturar errores async automáticamente
//   - successResponse: para respuestas exitosas con formato estándar
//   - errorResponse: para respuestas de error con formato estándar

import { catchAsync }                     from '../utils/catchAsync.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

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
// Retorna todas las tareas con el formato estándar
export const getTasks = catchAsync(async (req, res) => {
    const tareas = await getAllTasks();
    return successResponse(res, 'Tareas obtenidas correctamente', tareas);
});

// GET /api/tasks/:id
// Retorna una tarea por su id
// NOTA: en tasks.routes.js esta ruta va DESPUÉS de /filter y /dashboard
export const getTaskById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const tarea  = await findTaskById(id);

    if (!tarea) {
        return errorResponse(res, `Tarea con id ${id} no encontrada`, 404);
    }

    return successResponse(res, 'Tarea encontrada', tarea);
});

// POST /api/tasks
// Crea una tarea nueva
// Cuerpo esperado: { title, description, status, assignedUsers }
export const createTask = catchAsync(async (req, res) => {
    const { title, description, status, assignedUsers } = req.body;

    // El título es el único campo obligatorio para crear una tarea
    if (!title) {
        return errorResponse(res, 'El campo title es obligatorio', 400);
    }

    const nuevaTarea = await insertTask({ title, description, status, assignedUsers });
    return successResponse(res, 'Tarea creada correctamente', nuevaTarea, 201);
});

// PUT /api/tasks/:id
// Actualiza una tarea completa
export const updateTask = catchAsync(async (req, res) => {
    const { id }           = req.params;
    const campos           = req.body;
    const tareaActualizada = await modifyTask(id, campos);

    if (!tareaActualizada) {
        return errorResponse(res, `Tarea con id ${id} no encontrada`, 404);
    }

    return successResponse(res, 'Tarea actualizada correctamente', tareaActualizada);
});

// DELETE /api/tasks/:id
// Elimina una tarea
export const deleteTask = catchAsync(async (req, res) => {
    const { id }         = req.params;
    const tareaEliminada = await removeTask(id);

    if (!tareaEliminada) {
        return errorResponse(res, `Tarea con id ${id} no encontrada`, 404);
    }

    return successResponse(
        res,
        `Tarea "${tareaEliminada.title}" eliminada correctamente`
    );
});

// PATCH /api/tasks/:id/status
// Cambia solo el estado de una tarea
// Cuerpo esperado: { status: 'pendiente' | 'en_progreso' | 'completada' }
export const updateTaskStatus = catchAsync(async (req, res) => {
    const { id }     = req.params;
    const { status } = req.body;

    const estadosValidos = ['pendiente', 'en_progreso', 'completada'];
    if (!status || !estadosValidos.includes(status)) {
        return errorResponse(
            res,
            `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`,
            400
        );
    }

    const tareaActualizada = await changeStatus(id, status);

    if (!tareaActualizada) {
        return errorResponse(res, `Tarea con id ${id} no encontrada`, 404);
    }

    return successResponse(res, 'Estado actualizado correctamente', tareaActualizada);
});

// POST /api/tasks/:taskId/assign
// Asigna usuarios a una tarea
// Cuerpo esperado: { userIds: [1, 2, 3] }
export const assignUsersToTask = catchAsync(async (req, res) => {
    const { taskId }  = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return errorResponse(
            res,
            'Se requiere un arreglo userIds con al menos un id',
            400
        );
    }

    const tareaActualizada = await addUsersToTask(taskId, userIds);

    if (!tareaActualizada) {
        return errorResponse(res, `Tarea con id ${taskId} no encontrada`, 404);
    }

    return successResponse(res, 'Usuarios asignados correctamente', tareaActualizada);
});

// GET /api/tasks/:taskId/users
// Retorna los ids de usuarios asignados a una tarea
export const getAssignedUsers = catchAsync(async (req, res) => {
    const { taskId } = req.params;
    const tarea      = await findTaskById(taskId);

    if (!tarea) {
        return errorResponse(res, `Tarea con id ${taskId} no encontrada`, 404);
    }

    return successResponse(
        res,
        'Usuarios asignados obtenidos correctamente',
        tarea.assignedUsers
    );
});

// DELETE /api/tasks/:taskId/users/:userId
// Quita un usuario de una tarea
export const removeUserFromTask = catchAsync(async (req, res) => {
    const { taskId, userId } = req.params;
    const tareaActualizada   = await detachUser(taskId, userId);

    if (!tareaActualizada) {
        return errorResponse(res, `Tarea con id ${taskId} no encontrada`, 404);
    }

    return successResponse(
        res,
        'Usuario removido de la tarea correctamente',
        tareaActualizada
    );
});

// GET /api/tasks/filter
// Filtra tareas por estado y/o usuario
// IMPORTANTE: en tasks.routes.js esta ruta va ANTES de /:id
// Query params: ?status=pendiente  ?userId=1  ?status=en_progreso&userId=2
export const filterTasks = catchAsync(async (req, res) => {
    const { status, userId } = req.query;
    const resultado          = await filterTasksModel({ status, userId });
    return successResponse(res, 'Tareas filtradas correctamente', resultado);
});

// GET /api/tasks/dashboard
// Retorna estadísticas generales de tareas
// IMPORTANTE: en tasks.routes.js esta ruta va ANTES de /:id
export const getDashboard = catchAsync(async (req, res) => {
    const tareas = await getAllTasks();

    const pendientes  = tareas.filter(t => t.status === 'pendiente').length;
    const enProgreso  = tareas.filter(t => t.status === 'en_progreso').length;
    const completadas = tareas.filter(t => t.status === 'completada').length;

    const estadisticas = {
        total: tareas.length,
        pendientes,
        enProgreso,
        completadas,
    };

    return successResponse(
        res,
        'Estadísticas del dashboard obtenidas correctamente',
        estadisticas
    );
});