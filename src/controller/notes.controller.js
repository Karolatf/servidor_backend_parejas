// MÓDULO: controller/notes.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)
//
// Responsabilidad única: manejar las peticiones HTTP de notas personales (post-its).
// NUNCA contiene lógica de negocio — solo recibe req, llama el modelo y responde res.
//
// Endpoints:
//   GET    /api/notes        → obtenerNotas   (cualquier usuario autenticado)
//   POST   /api/notes        → crearNota      (cualquier usuario autenticado)
//   DELETE /api/notes/:id    → eliminarNota   (cualquier usuario autenticado)

// Importamos catchAsync para capturar errores async sin try/catch manuales
import { catchAsync }                     from '../utils/catchAsync.js';
// Importamos successResponse y errorResponse para respuestas con formato estándar
import { successResponse, errorResponse } from '../utils/response.util.js';
// Importamos las 3 funciones del modelo que interactúan con la tabla user_notes en MySQL
import { getNotas, createNota, deleteNota } from '../models/notes.model.js';

// ── GET /api/notes ────────────────────────────────────────────────────────────
// Devuelve todas las notas que pertenecen al usuario que está logueado
// req.usuario.id viene del token JWT que verifyToken adjunta a la petición
export const obtenerNotas = catchAsync(async (req, res) => {
    // Llamamos a getNotas con el id del usuario del token para que MySQL filtre solo sus notas
    // (cada usuario solo puede ver las suyas, nunca las de otro usuario)
    const notas = await getNotas(req.usuario.id);
    // Enviamos el arreglo de notas al cliente — puede estar vacío si el usuario no tiene notas aún
    return successResponse(res, 'Notas obtenidas', notas);
});

// ── POST /api/notes ───────────────────────────────────────────────────────────
// Recibe el texto y el color del formulario de crear post-it y guarda la nota en MySQL
// Body: { texto, color? }  —  color es opcional, tiene un valor por defecto en el modelo
export const crearNota = catchAsync(async (req, res) => {
    // Sacamos el texto y el color del cuerpo de la petición — color puede llegar undefined
    const { texto, color } = req.body;
    // Validamos que el texto no esté vacío ni sea solo espacios en blanco
    if (!texto || texto.trim() === '') {
        // El texto de la nota es el contenido principal — sin él no tiene sentido guardarla
        return errorResponse(res, 'El texto de la nota es obligatorio', 400);
    }
    // Llamamos a createNota pasando el id del usuario del token, el texto limpio y el color
    // texto.trim() elimina espacios innecesarios al inicio y al final antes de guardar
    const nota = await createNota(req.usuario.id, texto.trim(), color);
    // Respondemos con 201 Created y la nota recién guardada que ya incluye el id de MySQL
    return successResponse(res, 'Nota creada', nota, 201);
});

// ── DELETE /api/notes/:id ─────────────────────────────────────────────────────
// Elimina la nota con ese id del usuario logueado
// El modelo verifica que la nota pertenezca al usuario — no puede eliminar notas de otro
export const eliminarNota = catchAsync(async (req, res) => {
    // Llamamos a deleteNota pasando el id de la nota de la URL y el id del usuario del token
    // El modelo busca la nota por ambos ids — retorna null si no existe o no pertenece al usuario
    const eliminada = await deleteNota(req.params.id, req.usuario.id);
    // Si deleteNota retornó null, la nota no existe o el usuario no tiene permiso para eliminarla
    if (!eliminada) {
        return errorResponse(res, 'Nota no encontrada o sin permiso', 404);
    }
    // Llegamos aquí porque la nota fue eliminada — enviamos null en data porque ya no existe
    return successResponse(res, 'Nota eliminada', null);
});
