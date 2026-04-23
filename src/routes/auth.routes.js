// src/routes/auth.routes.js
// MÓDULO: routes/auth.routes.js
// CAPA: Rutas
//
// Responsabilidad única: definir los endpoints de autenticación.
// ACTUALIZACIÓN: se agrega la ruta de registro POST /register.

import { Router }         from 'express';
import { login, register } from '../controller/auth.controller.js';
import { refresh }        from '../controller/auth.refresh.controller.js';
import { validateSchema } from '../middlewares/validator.middleware.js';
import { loginSchema, registerSchema } from '../../schemas/auth.schema.js';

const router = Router();

// POST /api/auth/login — valida email y password con loginSchema antes de llegar al controlador
router.post('/login', validateSchema(loginSchema), login);

// POST /api/auth/refresh — renueva el accessToken con el refreshToken de larga duración
// No requiere validación de schema porque solo recibe el refreshToken
router.post('/refresh', refresh);

// POST /api/auth/register — nuevo endpoint para registro de usuarios desde la web
// validateSchema(registerSchema) valida name, documento, email y password
// antes de que la petición llegue al controlador
router.post('/register', validateSchema(registerSchema), register);

export default router;