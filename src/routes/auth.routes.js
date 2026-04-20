// MÓDULO: routes/auth.routes.js
// CAPA: Rutas
//
// Responsabilidad única: definir los endpoints de autenticación.
// El endpoint /refresh lo completa Paulo en su rama.

import { Router }         from 'express';
import { login }          from '../controller/auth.controller.js';
import { refresh }        from '../controller/auth.refresh.controller.js';
import { validateSchema } from '../middlewares/validator.middleware.js';
import { loginSchema }    from '../../schemas/auth.schema.js';

const router = Router();

// POST /api/auth/login — validateSchema(loginSchema) valida documento y password antes de llegar al controlador
router.post('/login', validateSchema(loginSchema), login);

// POST /api/auth/refresh — renueva el accessToken con el refreshToken de larga duración
router.post('/refresh', refresh);

export default router;