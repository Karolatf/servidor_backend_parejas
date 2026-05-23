// MODULO: controller/comunicador.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)
//
// Responsabilidad unica: manejar las peticiones HTTP del modulo comunicador.
// NUNCA contiene queries SQL  solo orquesta llamadas al modelo y formatea respuestas.
//
// Endpoints que controla:
//   POST   /api/comunicador/anuncios           crear anuncio
//   GET    /api/comunicador/anuncios           listar todos los anuncios
//   DELETE /api/comunicador/anuncios/:id       eliminar anuncio (autor o admin)
//   POST   /api/comunicador/notificaciones     crear notificacion con roles destino
//   GET    /api/comunicador/notificaciones/mine  mis notificaciones (por rol)
//   PATCH  /api/comunicador/notificaciones/:id/leida  marcar como leida

import { catchAsync }                     from '../utils/catchAsync.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

// Importamos las funciones del modelo  cada funcion maneja exactamente una operacion de BD
import {
    getAllAnuncios,
    getAllAnunciosPorRol,
    getAnuncioById,
    crearAnuncio,
    eliminarAnuncio,
    crearNotificacion,
    getNotificacionesPorRol,
    marcarNotificacionLeida,
} from '../models/comunicador.model.js';

// ╔══════════════════════════════════════════════════════════════╗
// ║  ANUNCIOS                                                    ║
// ╚══════════════════════════════════════════════════════════════╝

// ── GET /api/comunicador/anuncios ────────────────────────────────────────────
// Retorna todos los anuncios del sistema, del mas reciente al mas antiguo
// ACCESO: todos los roles autenticados (verifyToken en app.js es suficiente)
// Los anuncios son broadcasts globales  cualquier usuario logueado puede verlos
export const getAnuncios = catchAsync(async (req, res) => {
    // ?all=true lo usa el panel de gestión del comunicador para ver y eliminar todos los anuncios
    const anuncios = req.query.all === 'true'
        ? await getAllAnuncios()
        : await getAllAnunciosPorRol(req.usuario.role);
    return successResponse(res, 'Anuncios obtenidos correctamente', anuncios);
});

// ── POST /api/comunicador/anuncios ───────────────────────────────────────────
// Crea un anuncio nuevo  el autor es el usuario autenticado (req.usuario.id)
// ACCESO: requiere permiso 'comunicador.anuncios' (verificado en la ruta)
// Cuerpo esperado: { titulo, contenido }
export const createAnuncio = catchAsync(async (req, res) => {
    const { titulo, contenido, target = 'todos' } = req.body;

    if (!titulo || !contenido) {
        return errorResponse(res, 'El título y el contenido son obligatorios', 400);
    }

    const rolesValidos = ['todos', 'admin', 'instructor', 'user', 'auditor', 'comunicador', 'soporte'];
    const targetFinal = rolesValidos.includes(target) ? target : 'todos';

    const nuevoAnuncio = await crearAnuncio({
        autorId:   req.usuario.id,
        titulo:    titulo.trim(),
        contenido: contenido.trim(),
        target:    targetFinal,
    });

    // Respondemos con 201 Created y el anuncio recien creado con su id de MySQL
    return successResponse(res, 'Anuncio creado correctamente', nuevoAnuncio, 201);
});

// ── DELETE /api/comunicador/anuncios/:id ─────────────────────────────────────
// Elimina un anuncio  solo el autor original o un admin pueden eliminarlo
// ACCESO: todos los roles autenticados pueden intentarlo, pero el controlador
//   verifica que sea el autor o sea admin antes de proceder
export const deleteAnuncio = catchAsync(async (req, res) => {
    // Sacamos el id del anuncio a eliminar del parametro de la URL
    const { id } = req.params;

    // Buscamos el anuncio para verificar que existe y quien es su autor
    const anuncio = await getAnuncioById(Number(id));
    if (!anuncio) {
        return errorResponse(res, `Anuncio con id ${id} no encontrado`, 404);
    }

    // Verificamos que el usuario es el autor del anuncio o tiene rol admin
    // Solo el autor puede eliminar su propio anuncio; el admin puede eliminar cualquiera
    const esAutor = anuncio.autor_id === req.usuario.id;
    const esAdmin  = req.usuario.role === 'admin';
    if (!esAutor && !esAdmin) {
        return errorResponse(res, 'Solo el autor o un administrador pueden eliminar este anuncio', 403);
    }

    // Eliminamos el anuncio  eliminarAnuncio retorna el objeto antes del DELETE
    await eliminarAnuncio(Number(id));

    return successResponse(res, `Anuncio "${anuncio.titulo}" eliminado correctamente`);
});

// ╔══════════════════════════════════════════════════════════════╗
// ║  NOTIFICACIONES                                              ║
// ╚══════════════════════════════════════════════════════════════╝

// ── POST /api/comunicador/notificaciones ─────────────────────────────────────
// Crea una notificacion personalizada con roles destino especificos
// ACCESO: requiere permiso 'comunicador.notificaciones' (verificado en la ruta)
// Cuerpo esperado: { titulo, contenido, roles: ['admin', 'instructor', ...] }
//   roles puede incluir cualquier subconjunto de los 6 roles del sistema
export const createNotificacion = catchAsync(async (req, res) => {
    // Sacamos los campos del cuerpo: titulo, contenido y arreglo de roles destino
    const { titulo, contenido, roles } = req.body;

    // Validamos los tres campos obligatorios
    if (!titulo || !contenido) {
        return errorResponse(res, 'El título y el contenido son obligatorios', 400);
    }

    // roles debe ser un arreglo no vacio  sin destinatarios la notificacion no tiene sentido
    if (!Array.isArray(roles) || roles.length === 0) {
        return errorResponse(res, 'Debes seleccionar al menos un rol destinatario', 400);
    }

    // Creamos la notificacion con sus roles destino en la tabla pivote (3FN)
    const nuevaNotif = await crearNotificacion({
        autorId:   req.usuario.id,  // id del comunicador que crea la notificación
        titulo:    titulo.trim(),
        contenido: contenido.trim(),
        roles,                       // arreglo de nombres de rol: ['admin', 'instructor', ...]
    });

    return successResponse(res, 'Notificación creada correctamente', nuevaNotif, 201);
});

// ── GET /api/comunicador/notificaciones/mine ─────────────────────────────────
// Retorna las notificaciones destinadas al ROL PRIMARIO del usuario autenticado
// Incluye el campo `leida` (0/1) especifico para ESTE usuario
// ACCESO: todos los roles autenticados  cada uno ve solo las que le corresponden
export const getMyNotificaciones = catchAsync(async (req, res) => {
    // req.usuario.role es el rol primario del JWT  determina que notificaciones recibe
    const roleName = req.usuario.role;
    // req.usuario.id se usa para calcular si ESTE usuario especifico ya la leyo
    const userId   = req.usuario.id;

    // Consultamos las notificaciones filtrando por rol primario y calculando `leida` por usuario
    const notificaciones = await getNotificacionesPorRol(roleName, userId);

    return successResponse(res, 'Notificaciones obtenidas correctamente', notificaciones);
});

// ── PATCH /api/comunicador/notificaciones/:id/leida ──────────────────────────
// Marca una notificacion como leida para el usuario autenticado
// ACCESO: todos los roles autenticados  cada uno marca las suyas
// Es idempotente: marcarla leida dos veces no genera error
export const marcarLeida = catchAsync(async (req, res) => {
    // Sacamos el id de la notificacion del parametro de la URL
    const { id }   = req.params;
    // req.usuario.id es el usuario que marca como leida  guardamos su registro de lectura
    const userId   = req.usuario.id;

    // INSERT IGNORE en la tabla de lecturas  no falla si ya existe la fila
    await marcarNotificacionLeida(Number(id), Number(userId));

    return successResponse(res, 'Notificación marcada como leída');
});
