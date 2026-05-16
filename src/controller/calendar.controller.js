// MÓDULO: controller/calendar.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)
//
// Responsabilidad única: manejar las peticiones HTTP del calendario.
// NUNCA maneja datos directamente — solo recibe req, llama el modelo y responde res.
//
// ENDPOINTS:
//   GET    /api/calendar/instructor  → getEventosInstructor (instructor autenticado)
//   GET    /api/calendar/usuario     → getEventosUsuario    (usuario autenticado)
//   POST   /api/calendar             → crearEvento          (solo instructor o admin)
//   DELETE /api/calendar/:id         → eliminarEvento       (solo el instructor que lo creó)

// Importamos catchAsync para capturar errores async sin try/catch manuales
import { catchAsync }                     from '../utils/catchAsync.js';
// Importamos successResponse y errorResponse para respuestas con formato estándar
import { successResponse, errorResponse } from '../utils/response.util.js';

// Importamos las funciones del modelo y les damos alias más descriptivos con 'as'
import {
    getEventosInstructor as fetchEventosInstructor,  // traer eventos del instructor desde MySQL
    getEventosUsuario    as fetchEventosUsuario,      // traer eventos del estudiante desde MySQL
    createEvento         as insertEvento,             // insertar un evento nuevo en la BD
    deleteEvento         as removeEvento,             // eliminar un evento de la BD
} from '../models/calendar.model.js';

// ── GET /api/calendar/instructor ──────────────────────────────────────────────
// Devuelve todos los eventos que el instructor logueado ha creado en el calendario
// req.usuario viene del token JWT verificado por verifyToken (auth.middleware.js)
export const getEventosInstructor = catchAsync(async (req, res) => {
    // Sacamos el id del instructor del token JWT que verifyToken adjuntó a la petición
    const instructorId = req.usuario.id;
    // Buscamos en MySQL todos los eventos donde instructor_id coincide con el id del token
    const eventos = await fetchEventosInstructor(instructorId);
    // Enviamos el arreglo de eventos al cliente — puede estar vacío si no ha creado ninguno
    return successResponse(res, 'Eventos del instructor obtenidos', eventos);
});

// ── GET /api/calendar/usuario ─────────────────────────────────────────────────
// Devuelve todos los eventos que el instructor asignó al estudiante logueado
export const getEventosUsuario = catchAsync(async (req, res) => {
    // Sacamos el id del estudiante del token JWT que verifyToken adjuntó a la petición
    const studentId = req.usuario.id;
    // Buscamos en MySQL todos los eventos donde student_id coincide con el id del token
    const eventos = await fetchEventosUsuario(studentId);
    // Enviamos el arreglo de eventos del estudiante al cliente
    return successResponse(res, 'Eventos del estudiante obtenidos', eventos);
});

// ── POST /api/calendar ────────────────────────────────────────────────────────
// Recibe los datos del formulario de crear evento y lo guarda en la BD
// Body esperado: { date, title, tipo, studentId?, taskId?, color? }
//   tipo: 'propio' = evento personal del instructor | 'estudiante' = asignado a un estudiante
export const crearEvento = catchAsync(async (req, res) => {
    // Sacamos el id y el rol del creador del token JWT — los necesitamos para las validaciones
    const creadorId  = req.usuario.id;
    const creadorRol = req.usuario.role;
    // Sacamos todos los campos del cuerpo — studentId, taskId y color son opcionales
    const { date, title, tipo, studentId, taskId, color } = req.body;

    // Validamos que los tres campos obligatorios llegaron en el cuerpo de la petición
    if (!date || !title || !tipo) {
        // Sin fecha, título o tipo no podemos crear el evento correctamente
        return errorResponse(res, 'Los campos date, title y tipo son obligatorios', 400);
    }
    // Validamos que tipo sea uno de los dos valores permitidos en el sistema
    if (!['propio', 'estudiante'].includes(tipo)) {
        return errorResponse(res, "El tipo debe ser 'propio' o 'estudiante'", 400);
    }
    // Solo instructor o admin puede crear eventos para estudiantes — el estudiante no puede
    if (tipo === 'estudiante' && creadorRol !== 'instructor' && creadorRol !== 'admin') {
        return errorResponse(res, 'Solo el instructor puede asignar eventos a estudiantes', 403);
    }
    // Si el tipo es 'estudiante', studentId es obligatorio para saber a quién asignarlo
    if (tipo === 'estudiante' && !studentId) {
        return errorResponse(res, 'Para eventos de tipo estudiante, studentId es obligatorio', 400);
    }

    // Llamamos a insertEvento con todos los datos ya validados para guardarlo en MySQL
    const nuevoEvento = await insertEvento({
        instructorId: creadorId,
        // Si el tipo es 'propio', no hay estudiante asignado — guardamos null en student_id
        studentId: tipo === 'estudiante' ? studentId : null,
        // taskId es opcional — puede estar vinculado a una tarea existente o ser null
        taskId:    taskId || null,
        date,
        title,
        // Si no especificaron color, usamos morado para eventos propios y azul para estudiantes
        color:     color || (tipo === 'propio' ? '#6366f1' : '#0ea5e9'),
        tipo,
    });

    // Respondemos con 201 Created y el evento recién guardado que ya incluye el id de MySQL
    return successResponse(res, 'Evento creado correctamente', nuevoEvento, 201);
});

// ── DELETE /api/calendar/:id ──────────────────────────────────────────────────
// Elimina un evento del calendario
// Solo el instructor que lo creó puede eliminarlo — el modelo verifica la autoría
export const eliminarEvento = catchAsync(async (req, res) => {
    // Sacamos el id del evento a eliminar del parámetro de la URL
    const { id }       = req.params;
    // Sacamos el id del instructor del token JWT para verificar que es el dueño del evento
    const instructorId = req.usuario.id;

    // Llamamos a removeEvento que busca el evento por id Y por instructor_id
    // Si el evento no existe, o si el instructor no fue quien lo creó, retorna null
    const eliminado = await removeEvento(id, instructorId);

    // Si removeEvento retornó null el evento no existe o el instructor no tiene permiso
    if (!eliminado) {
        return errorResponse(
            res,
            'Evento no encontrado o no tienes permiso para eliminarlo',
            404
        );
    }

    // Llegamos aquí porque el evento fue eliminado exitosamente — null en data porque ya no existe
    return successResponse(res, 'Evento eliminado correctamente', null);
});
