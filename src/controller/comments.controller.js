// MODULO: controller/comments.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)
//
// Responsabilidad unica: manejar las peticiones HTTP de comentarios de tareas.
//
// Semantica de tipos:
//   'comentario' → lo escribe el estudiante asignado a la tarea
//   'respuesta'  → lo escribe el instructor o admin, debe tener parent_id
//
// El campo tipo no viene forzado en la URL; se infiere del rol del autor:
//   si esAdminOInstructor → tipo forzado a 'respuesta'; parent_id obligatorio
//   si es estudiante      → tipo forzado a 'comentario'; parent_id no aplica

import { catchAsync }                     from '../utils/catchAsync.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

import {
    getComentariosPorTarea,
    crearComentario,
    eliminarComentario,
} from '../models/comment.model.js';

import { getTaskById } from '../models/task.model.js';

// ── GET /api/tasks/:taskId/comments ──────────────────────────────────────────
// Retorna todos los comentarios de una tarea (raices + respuestas) ordenados por fecha
// Accesible por admin, instructor y el estudiante asignado a la tarea
export const getComments = catchAsync(async (req, res) => {
    const { taskId } = req.params;

    const tarea = await getTaskById(taskId);
    if (!tarea) {
        return errorResponse(res, `Tarea con id ${taskId} no encontrada`, 404);
    }

    const comentarios = await getComentariosPorTarea(taskId);
    return successResponse(res, 'Comentarios obtenidos correctamente', comentarios);
});

// ── POST /api/tasks/:taskId/comments ─────────────────────────────────────────
// Agrega un comentario o respuesta a una tarea calificada.
//
// Cuerpo esperado:
//   { comentario: 'texto', parentId?: number }   ← parentId solo si el autor es instructor/admin
//
// Reglas:
//   - Solo se puede comentar si la tarea ya tiene nota (grade != null)
//   - Estudiante asignado → tipo = 'comentario', parentId ignorado
//   - Instructor / Admin  → tipo = 'respuesta',  parentId obligatorio y debe existir en la misma tarea
export const createComment = catchAsync(async (req, res) => {
    const { taskId }   = req.params;
    const { comentario, parentId } = req.body;

    if (!comentario || String(comentario).trim().length === 0) {
        return errorResponse(res, 'El comentario no puede estar vacío', 400);
    }

    const tarea = await getTaskById(taskId);
    if (!tarea) {
        return errorResponse(res, `Tarea con id ${taskId} no encontrada`, 404);
    }

    if (tarea.grade === null) {
        return errorResponse(
            res,
            'Solo puedes comentar en tareas que ya han sido calificadas',
            400
        );
    }

    const userId             = req.usuario.id;
    const userName           = req.usuario.name;
    const esAdminOInstructor = req.usuario.role === 'admin' || req.usuario.role === 'instructor';
    const estaAsignado       = tarea.assignedUsers.includes(Number(userId));

    if (!estaAsignado && !esAdminOInstructor) {
        return errorResponse(res, 'Solo puedes comentar en tareas que tienes asignadas', 403);
    }

    let tipo     = 'comentario';
    let parentFk = null;

    if (esAdminOInstructor) {
        tipo = 'respuesta';

        // El parentId es obligatorio para una respuesta
        if (!parentId) {
            return errorResponse(
                res,
                'Las respuestas del instructor deben indicar a qué comentario responden (parentId)',
                400
            );
        }

        // Verificamos que el comentario padre exista y pertenezca a la misma tarea
        const comentariosPadre = await getComentariosPorTarea(taskId);
        const padre = comentariosPadre.find(c => c.id === Number(parentId));
        if (!padre) {
            return errorResponse(
                res,
                `El comentario con id ${parentId} no existe en esta tarea`,
                404
            );
        }

        // No se pueden anidar respuestas: el padre debe ser un comentario raiz
        if (padre.tipo === 'respuesta') {
            return errorResponse(
                res,
                'No se puede responder a una respuesta  solo a comentarios raíz del estudiante',
                400
            );
        }

        parentFk = Number(parentId);
    }

    const nuevoComentario = await crearComentario(
        taskId,
        userId,
        String(comentario).trim(),
        tipo,
        parentFk,
        userName
    );

    return successResponse(res, 'Comentario agregado correctamente', nuevoComentario, 201);
});

// ── DELETE /api/tasks/:taskId/comments/:commentId ─────────────────────────────
// Elimina un comentario  solo puede hacerlo el autor del comentario o un admin
// Al eliminar un comentario raiz, sus respuestas se eliminan en cascada (FK fk_tc_parent)
export const deleteComment = catchAsync(async (req, res) => {
    const { taskId, commentId } = req.params;

    const comentarios          = await getComentariosPorTarea(taskId);
    const comentarioEncontrado = comentarios.find(c => c.id === Number(commentId));

    if (!comentarioEncontrado) {
        return errorResponse(res, `Comentario con id ${commentId} no encontrado`, 404);
    }

    const esAutor = Number(req.usuario.id) === Number(comentarioEncontrado.userId);
    const esAdmin = req.usuario.role === 'admin';

    if (!esAutor && !esAdmin) {
        return errorResponse(res, 'Solo puedes eliminar tus propios comentarios', 403);
    }

    const eliminado = await eliminarComentario(commentId);
    if (!eliminado) {
        return errorResponse(res, 'No se pudo eliminar el comentario', 500);
    }

    return successResponse(res, 'Comentario eliminado correctamente');
});
