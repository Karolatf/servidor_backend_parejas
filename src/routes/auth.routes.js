// MODULO: routes/auth.routes.js
// CAPA: Rutas
//
// Responsabilidad unica: definir los endpoints de autenticacion.
// ACTUALIZACION v4.0: se agregan las rutas del flujo de recuperacion de contrasena.
 
import { Router } from 'express';
import {
    login,
    register,
    forgotPassword,
    verifyResetCode,
    resetPassword,
} from '../controller/auth.controller.js';
import { refresh }        from '../controller/auth.refresh.controller.js';
import { validateSchema } from '../middlewares/validator.middleware.js';
import { loginSchema, registerSchema } from '../../schemas/auth.schema.js';
 
const router = Router();
 
// POST /api/auth/login  valida email y password antes de llegar al controlador
router.post('/login', validateSchema(loginSchema), login);
 
// POST /api/auth/refresh  renueva el accessToken con el refreshToken
router.post('/refresh', refresh);
 
// POST /api/auth/register  registro de usuarios nuevos desde la web
router.post('/register', validateSchema(registerSchema), register);
 
// ── FLUJO DE RECUPERACION DE CONTRASENA (3 pasos) ───────────────────────────
// Paso 1: el usuario ingresa su email para recibir el codigo por Mailtrap
router.post('/forgot-password', forgotPassword);
 
// Paso 2: el usuario ingresa el codigo de 6 digitos para verificarlo
router.post('/verify-reset-code', verifyResetCode);
 
// Paso 3: el usuario ingresa la nueva contrasena (requiere haber pasado el paso 2)
router.post('/reset-password', resetPassword);
 
export default router;