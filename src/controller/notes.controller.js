// MÓDULO: controller/notes.controller.js
// CAPA: Controlador
//
// Endpoints:
//   GET    /api/notes        → obtenerNotas
//   POST   /api/notes        → crearNota
//   DELETE /api/notes/:id    → eliminarNota

import { catchAsync }                     from '../utils/catchAsync.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { getNotas, createNota, deleteNota } from '../models/notes.model.js';

// GET /api/notes — devuelve las notas del usuario autenticado
export const obtenerNotas = catchAsync(async (req, res) => {
    const notas = await getNotas(req.usuario.id);
    return successResponse(res, 'Notas obtenidas', notas);
});

// POST /api/notes — crea una nota nueva
// Body: { texto, color? }
export const crearNota = catchAsync(async (req, res) => {
    const { texto, color } = req.body;
    if (!texto || texto.trim() === '') {
        return errorResponse(res, 'El texto de la nota es obligatorio', 400);
    }
    const nota = await createNota(req.usuario.id, texto.trim(), color);
    return successResponse(res, 'Nota creada', nota, 201);
});

// DELETE /api/notes/:id — elimina una nota del usuario autenticado
export const eliminarNota = catchAsync(async (req, res) => {
    const eliminada = await deleteNota(req.params.id, req.usuario.id);
    if (!eliminada) {
        return errorResponse(res, 'Nota no encontrada o sin permiso', 404);
    }
    return successResponse(res, 'Nota eliminada', null);
});