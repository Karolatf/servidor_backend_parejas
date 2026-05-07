// MÓDULO: controller/calendar.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)
//
// Responsabilidad única: manejar las peticiones HTTP del calendario.
// NUNCA maneja datos directamente — solo recibe req, llama el modelo y responde res.
//
// ENDPOINTS:
//   GET    /api/calendar/instructor  → getEventosInstructor (instructor autenticado)
//   GET    /api/calendar/usuario     → getEventosUsuario    (usuario autenticado)
//   POST   /api/calendar             → crearEvento          (solo instructor)
//   DELETE /api/calendar/:id         → eliminarEvento       (solo instructor propietario)

import { catchAsync }                     from '../utils/catchAsync.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

import {
    getEventosInstructor as fetchEventosInstructor,
    getEventosUsuario    as fetchEventosUsuario,
    createEvento         as insertEvento,
    deleteEvento         as removeEvento,
} from '../models/calendar.model.js';

// GET /api/calendar/instructor
// Devuelve todos los eventos creados por el instructor autenticado.
// req.usuario es adjuntado por verifyToken (auth.middleware.js).
export const getEventosInstructor = catchAsync(async (req, res) => {
    const instructorId = req.usuario.id;
    const eventos = await fetchEventosInstructor(instructorId);
    return successResponse(res, 'Eventos del instructor obtenidos', eventos);
});

// GET /api/calendar/usuario
// Devuelve todos los eventos asignados al usuario autenticado (estudiante).
export const getEventosUsuario = catchAsync(async (req, res) => {
    const studentId = req.usuario.id;
    const eventos = await fetchEventosUsuario(studentId);
    return successResponse(res, 'Eventos del estudiante obtenidos', eventos);
});

// POST /api/calendar
// Crea un evento nuevo.
// Body esperado: { date, title, tipo, studentId?, taskId?, color? }
//   tipo: 'propio' (sin estudiante) | 'estudiante' (asignado a un estudiante)
export const crearEvento = catchAsync(async (req, res) => {
    const instructorId = req.usuario.id;
    const { date, title, tipo, studentId, taskId, color } = req.body;

    // Validaciones básicas
    if (!date || !title || !tipo) {
        return errorResponse(res, 'Los campos date, title y tipo son obligatorios', 400);
    }
    if (tipo === 'estudiante' && !studentId) {
        return errorResponse(res, 'Para eventos de tipo estudiante, studentId es obligatorio', 400);
    }
    if (!['propio', 'estudiante'].includes(tipo)) {
        return errorResponse(res, "El tipo debe ser 'propio' o 'estudiante'", 400);
    }

    const nuevoEvento = await insertEvento({
        instructorId,
        studentId: tipo === 'estudiante' ? studentId : null,
        taskId:    taskId || null,
        date,
        title,
        color:     color || (tipo === 'propio' ? '#6366f1' : '#0ea5e9'),
        tipo,
    });

    return successResponse(res, 'Evento creado correctamente', nuevoEvento, 201);
});

// DELETE /api/calendar/:id
// Elimina un evento. Solo el instructor que lo creó puede borrarlo.
export const eliminarEvento = catchAsync(async (req, res) => {
    const { id }       = req.params;
    const instructorId = req.usuario.id;

    const eliminado = await removeEvento(id, instructorId);

    if (!eliminado) {
        return errorResponse(
            res,
            'Evento no encontrado o no tienes permiso para eliminarlo',
            404
        );
    }

    return successResponse(res, 'Evento eliminado correctamente', null);
});