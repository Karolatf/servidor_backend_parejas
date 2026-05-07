// MÓDULO: routes/calendar.routes.js
// CAPA: Rutas (conecta URLs con controladores)
//
// REGLA CRÍTICA DE ORDEN:
//   Las rutas /instructor y /usuario deben ir ANTES de /:id
//   para que Express no las capture como parámetros dinámicos.
//
// MONTAJE EN app.js:
//   import calendarRouter from './routes/calendar.routes.js';
//   app.use('/api/calendar', verifyToken, calendarRouter);

import { Router } from 'express';

import {
    getEventosInstructor,
    getEventosUsuario,
    crearEvento,
    eliminarEvento,
} from '../controller/calendar.controller.js';

const router = Router();

// ── RUTAS SIN PARÁMETRO DINÁMICO (van PRIMERO) ─────────────────────────────

// GET /api/calendar/instructor
// El instructor obtiene sus propios eventos (propios + para estudiantes)
router.get('/instructor', getEventosInstructor);

// GET /api/calendar/usuario
// El usuario/estudiante obtiene los eventos que el instructor le asignó
router.get('/usuario', getEventosUsuario);

// ── CRUD ────────────────────────────────────────────────────────────────────

// POST /api/calendar
// Crea un evento nuevo (solo el instructor puede crear eventos)
router.post('/', crearEvento);

// DELETE /api/calendar/:id
// Elimina un evento (solo el instructor que lo creó)
router.delete('/:id', eliminarEvento);

export default router;