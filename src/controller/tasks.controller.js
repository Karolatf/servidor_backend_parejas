// MÓDULO: controller/tasks.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)
//
// Responsabilidad única: manejar las peticiones HTTP de tareas.
// NUNCA maneja datos directamente — solo recibe req, llama el modelo y responde res.

// Importamos catchAsync para capturar errores async sin bloques try/catch manuales
import { catchAsync }                     from '../utils/catchAsync.js';
// Importamos successResponse y errorResponse para respuestas con formato estándar
import { successResponse, errorResponse } from '../utils/response.util.js';

// Importamos las funciones del modelo y les damos alias más legibles con 'as'
// para que el código del controlador se lea más naturalmente
import {
    getAllTasks,
    getTaskById         as findTaskById,      // buscar una tarea por su id
    createTask          as insertTask,         // insertar una tarea nueva en MySQL
    updateTask          as modifyTask,         // actualizar campos de una tarea existente
    deleteTask          as removeTask,         // eliminar una tarea permanentemente
    updateTaskStatus    as changeStatus,       // cambiar solo el campo status de la tarea
    assignUsersToTask   as addUsersToTask,     // agregar IDs al array JSON assigned_users
    removeUserFromTask  as detachUser,         // quitar un ID del array JSON assigned_users
    filterTasks         as filterTasksModel    // filtrar tareas por status y/o userId
} from '../models/task.model.js';

// ── GET /api/tasks ────────────────────────────────────────────────────────────
// Retorna todas las tareas del sistema con los nombres de usuarios ya resueltos
// Solo admin e instructor pueden acceder a esta ruta (requireAdminOrInstructor)
export const getTasks = catchAsync(async (req, res) => {
    // Llamamos a getAllTasks que obtiene todas las tareas de MySQL
    // y resuelve automáticamente los IDs de assignedUsers a nombres legibles
    const tareas = await getAllTasks();
    // Enviamos el arreglo completo de tareas al cliente con el mensaje de éxito
    return successResponse(res, 'Tareas obtenidas correctamente', tareas);
});

// ── GET /api/tasks/:id ────────────────────────────────────────────────────────
// Busca y retorna una sola tarea por su id numérico
// NOTA: esta ruta va DESPUÉS de /filter y /dashboard en tasks.routes.js
// para que Express no interprete esas palabras como un parámetro :id
export const getTaskById = catchAsync(async (req, res) => {
    // Sacamos el id de la URL — por ejemplo /api/tasks/5 nos da id = '5'
    const { id } = req.params;
    // Buscamos la tarea en MySQL por su id — retorna el objeto formateado o null si no existe
    const tarea  = await findTaskById(id);

    // Si findTaskById retornó null significa que no existe ninguna tarea con ese id
    if (!tarea) {
        return errorResponse(res, `Tarea con id ${id} no encontrada`, 404);
    }

    // Llegamos aquí porque la tarea existe — la enviamos completa al cliente
    return successResponse(res, 'Tarea encontrada', tarea);
});

// ── POST /api/tasks ───────────────────────────────────────────────────────────
// Recibe los datos del formulario de crear tarea y la guarda en MySQL
// Cuerpo esperado: { title, description, status, assignedUsers, comment }
// La validación de los campos la hace validateSchema(createTaskSchema) antes de llegar aquí
export const createTask = catchAsync(async (req, res) => {
    // Sacamos todos los campos del cuerpo — description y comment son opcionales
    const { title, description, status, assignedUsers, comment } = req.body;

    // Llamamos a insertTask que guarda la tarea en MySQL
    // También valida que los usuarios asignados estén activos — lanza error 400 si no
    const nuevaTarea = await insertTask({ title, description, status, assignedUsers, comment });
    // Respondemos con 201 Created y la tarea recién creada que ya incluye el id de MySQL
    return successResponse(res, 'Tarea creada correctamente', nuevaTarea, 201);
});

// ── PUT /api/tasks/:id ────────────────────────────────────────────────────────
// Actualiza los campos de una tarea existente
// Solo los campos que lleguen en el body se actualizan — el resto queda igual
export const updateTask = catchAsync(async (req, res) => {
    // Sacamos el id de la tarea a actualizar del parámetro de la URL
    const { id }           = req.params;
    // El body completo es el objeto de campos a actualizar — modifyTask filtra internamente
    const campos           = req.body;
    // Llamamos a modifyTask que hace el UPDATE en MySQL y retorna la tarea actualizada
    // Si el id no existe en la BD, retorna null
    const tareaActualizada = await modifyTask(id, campos);

    // Si modifyTask retornó null significa que no existe ninguna tarea con ese id
    if (!tareaActualizada) {
        return errorResponse(res, `Tarea con id ${id} no encontrada`, 404);
    }

    // Llegamos aquí porque la actualización fue exitosa — enviamos la tarea con los nuevos valores
    return successResponse(res, 'Tarea actualizada correctamente', tareaActualizada);
});

// ── DELETE /api/tasks/:id ─────────────────────────────────────────────────────
// Elimina una tarea permanentemente de la base de datos
// Solo admin e instructor pueden eliminar tareas (verificado en la ruta)
export const deleteTask = catchAsync(async (req, res) => {
    // Sacamos el id de la tarea a eliminar del parámetro de la URL
    const { id }         = req.params;
    // Llamamos a removeTask que primero guarda el objeto de la tarea,
    // luego la elimina de la BD y retorna el objeto para poder confirmar qué se borró
    // Si el id no existe, retorna null
    const tareaEliminada = await removeTask(id);

    // Si removeTask retornó null significa que no existe ninguna tarea con ese id
    if (!tareaEliminada) {
        return errorResponse(res, `Tarea con id ${id} no encontrada`, 404);
    }

    // Llegamos aquí porque la tarea fue eliminada — incluimos el título en el mensaje de confirmación
    return successResponse(
        res,
        `Tarea "${tareaEliminada.title}" eliminada correctamente`
    );
});

// ── PATCH /api/tasks/:id/status ───────────────────────────────────────────────
// Cambia el estado de una tarea y opcionalmente guarda un comentario del estudiante.
// Accesible por todos los roles — el estudiante lo usa para actualizar su progreso.
// Cuerpo esperado: { status: '...', comment?: '...' }
// La validación la hace validateSchema(updateTaskStatusSchema)
export const updateTaskStatus = catchAsync(async (req, res) => {
    // Sacamos el id de la tarea del parámetro de la URL
    const { id }               = req.params;
    // Sacamos el nuevo estado y el comentario opcional del cuerpo
    const { status, comment }  = req.body;

    // Llamamos a changeStatus pasando también comment para que lo persista en la BD
    // Retorna la tarea con el estado ya actualizado, o null si el id no existe
    const tareaActualizada = await changeStatus(id, status, comment);

    // Si changeStatus retornó null significa que no existe ninguna tarea con ese id
    if (!tareaActualizada) {
        return errorResponse(res, `Tarea con id ${id} no encontrada`, 404);
    }

    // Llegamos aquí porque el estado (y opcionalmente el comentario) cambió correctamente
    return successResponse(res, 'Estado actualizado correctamente', tareaActualizada);
});

// ── POST /api/tasks/:taskId/assign ────────────────────────────────────────────
// Agrega usuarios al arreglo assignedUsers de una tarea sin duplicar los que ya están
// Cuerpo esperado: { userIds: [1, 2, 3] }
// La validación del arreglo la hace validateSchema(assignUsersSchema)
export const assignUsersToTask = catchAsync(async (req, res) => {
    // Sacamos el id de la tarea del parámetro de la URL
    const { taskId }  = req.params;
    // Sacamos el arreglo de IDs de los usuarios que se van a asignar
    const { userIds } = req.body;

    // Llamamos a addUsersToTask que combina los usuarios existentes con los nuevos usando Set
    // (Set elimina automáticamente los IDs duplicados)
    // Retorna la tarea actualizada o null si el taskId no existe
    const tareaActualizada = await addUsersToTask(taskId, userIds);

    // Si addUsersToTask retornó null significa que no existe ninguna tarea con ese id
    if (!tareaActualizada) {
        return errorResponse(res, `Tarea con id ${taskId} no encontrada`, 404);
    }

    // Llegamos aquí porque los usuarios fueron asignados — enviamos la tarea con el arreglo actualizado
    return successResponse(res, 'Usuarios asignados correctamente', tareaActualizada);
});

// ── GET /api/tasks/:taskId/users ──────────────────────────────────────────────
// Retorna solo el arreglo de IDs de los usuarios asignados a una tarea
export const getAssignedUsers = catchAsync(async (req, res) => {
    // Sacamos el id de la tarea del parámetro de la URL
    const { taskId } = req.params;
    // Buscamos la tarea completa en MySQL para poder leer su arreglo assignedUsers
    const tarea      = await findTaskById(taskId);

    // Si findTaskById retornó null significa que no existe ninguna tarea con ese id
    if (!tarea) {
        return errorResponse(res, `Tarea con id ${taskId} no encontrada`, 404);
    }

    // Llegamos aquí porque la tarea existe — enviamos solo el arreglo de IDs, no la tarea completa
    return successResponse(
        res,
        'Usuarios asignados obtenidos correctamente',
        tarea.assignedUsers
    );
});

// ── DELETE /api/tasks/:taskId/users/:userId ───────────────────────────────────
// Quita un usuario específico del arreglo assignedUsers de una tarea
export const removeUserFromTask = catchAsync(async (req, res) => {
    // Sacamos el id de la tarea y el id del usuario a quitar de la URL
    const { taskId, userId } = req.params;
    // Llamamos a detachUser que filtra el userId del arreglo JSON y actualiza la tarea en MySQL
    // Retorna la tarea actualizada o null si el taskId no existe
    const tareaActualizada   = await detachUser(taskId, userId);

    // Si detachUser retornó null significa que no existe ninguna tarea con ese id
    if (!tareaActualizada) {
        return errorResponse(res, `Tarea con id ${taskId} no encontrada`, 404);
    }

    // Llegamos aquí porque el usuario fue removido — enviamos la tarea sin ese usuario
    return successResponse(
        res,
        'Usuario removido de la tarea correctamente',
        tareaActualizada
    );
});

// ── GET /api/tasks/filter ─────────────────────────────────────────────────────
// Filtra tareas por estado y/o usuario asignado según los query params de la URL
// IMPORTANTE: va ANTES de /:id en las rutas para que Express no lea "filter" como un id
// Ejemplos de uso: ?status=pendiente  ?userId=1  ?status=en_progreso&userId=2
export const filterTasks = catchAsync(async (req, res) => {
    // Sacamos los parámetros de filtrado de la URL — ambos son opcionales
    const { status, userId } = req.query;
    // Llamamos a filterTasksModel que carga todas las tareas y aplica los filtros en memoria
    const resultado          = await filterTasksModel({ status, userId });
    // Enviamos el arreglo de tareas que coinciden con los filtros aplicados
    return successResponse(res, 'Tareas filtradas correctamente', resultado);
});

// ── GET /api/tasks/dashboard ──────────────────────────────────────────────────
// Retorna los contadores de tareas por estado para el panel admin e instructor
// IMPORTANTE: va ANTES de /:id en las rutas por la misma razón que /filter
export const getDashboard = catchAsync(async (req, res) => {
    // Obtenemos todas las tareas del sistema para calcular los contadores
    const tareas = await getAllTasks();

    // Contamos cuántas tareas hay en cada estado usando filter y .length
    const pendientes  = tareas.filter(t => t.status === 'pendiente').length;
    const enProgreso  = tareas.filter(t => t.status === 'en_progreso').length;
    // pendiente_aprobacion: el usuario marcó la tarea como lista para revisión del instructor
    const aprobacion  = tareas.filter(t => t.status === 'pendiente_aprobacion').length;
    const completadas = tareas.filter(t => t.status === 'completada').length;
    // reprobada: el instructor calificó con nota < 70 y el sistema asignó este estado
    const reprobadas  = tareas.filter(t => t.status === 'reprobada').length;

    // Armamos el objeto con todos los contadores para las 6 tarjetas del dashboard
    const estadisticas = {
        total: tareas.length,   // total de tareas sin importar el estado
        pendientes,
        enProgreso,
        aprobacion,
        completadas,
        reprobadas,
    };

    // Enviamos las estadísticas al frontend para que llene las 6 tarjetas del panel
    return successResponse(
        res,
        'Estadísticas del dashboard obtenidas correctamente',
        estadisticas
    );
});
