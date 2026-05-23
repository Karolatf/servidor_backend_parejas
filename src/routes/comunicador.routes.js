// MODULO: routes/comunicador.routes.js
// CAPA: Rutas (conecta URLs con controladores del modulo comunicador)
//
// Responsabilidad unica: definir que funcion del controlador maneja
// cada combinacion de metodo HTTP + ruta del modulo comunicador.
//
// MONTAJE EN app.js:
//   app.use('/api/comunicador', verifyToken, comunicadorRouter)
//
// REGLA DE ORDEN:
//   Las rutas con segmento fijo ('mine', 'anuncios') van ANTES
//   que las rutas con parametro dinamico (':id') para que Express
//   no interprete el texto fijo como un parametro dinamico.

import { Router } from 'express';

import {
    getAnuncios,
    createAnuncio,
    deleteAnuncio,
    createNotificacion,
    getMyNotificaciones,
    marcarLeida,
} from '../controller/comunicador.controller.js';

// Importamos requirePermiso para proteger endpoints exclusivos del comunicador
import { requirePermiso } from '../middlewares/auth.middleware.js';

const router = Router();

// ╔══════════════════════════════════════════════════════════════╗
// ║  ANUNCIOS                                                    ║
// ╚══════════════════════════════════════════════════════════════╝

// GET /api/comunicador/anuncios  lista todos los anuncios del sistema
// ACCESO: todos los roles autenticados (los anuncios son broadcasts globales)
router.get('/anuncios', getAnuncios);

// POST /api/comunicador/anuncios  crea un anuncio nuevo
// ACCESO: requiere permiso 'comunicador.anuncios'  solo usuarios con ese permiso
//   (rol primario comunicador, o rol adicional con ese permiso seleccionado)
router.post('/anuncios', requirePermiso('comunicador.anuncios'), createAnuncio);

// DELETE /api/comunicador/anuncios/:id  elimina un anuncio
// ACCESO: todos los autenticados pueden intentarlo, pero el controlador
//   verifica que el solicitante sea el autor o tenga rol admin
router.delete('/anuncios/:id', deleteAnuncio);

// ╔══════════════════════════════════════════════════════════════╗
// ║  NOTIFICACIONES                                              ║
// ╚══════════════════════════════════════════════════════════════╝

// GET /api/comunicador/notificaciones/mine  notificaciones de MI rol
// IMPORTANTE: va ANTES de /:id para que 'mine' no sea capturado como parametro
// ACCESO: todos los roles autenticados (cada uno ve solo las de su rol primario)
router.get('/notificaciones/mine', getMyNotificaciones);

// POST /api/comunicador/notificaciones  crea una notificacion con roles destino
// ACCESO: requiere permiso 'comunicador.notificaciones'
// Body: { titulo, contenido, roles: ['admin', 'instructor', ...] }
router.post('/notificaciones', requirePermiso('comunicador.notificaciones'), createNotificacion);

// PATCH /api/comunicador/notificaciones/:id/leida  marca una notificacion como leida
// ACCESO: todos los roles autenticados (cada uno marca las suyas)
router.patch('/notificaciones/:id/leida', marcarLeida);

export default router;
