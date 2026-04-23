// MÓDULO: controller/auth.controller.js
// CAPA: Controlador (recibe HTTP, llama el servicio, responde HTTP)
//
// Responsabilidad única: manejar las peticiones HTTP de autenticación.
// NUNCA contiene lógica de negocio — eso va en auth.service.js.

import { catchAsync }                     from '../utils/catchAsync.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { loginService, registerService }  from '../services/auth.service.js';

// POST /api/auth/login
// Cuerpo: { documento, password }
// Respuesta exitosa 200: { success, message, data: { accessToken, refreshToken, user } }
// Error 400: campos faltantes
// Error 401: credenciales incorrectas
export const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    //El servicio valida las credenciales - retorna los datos o NULL 
    const resultado = await loginService({ email, password });

    // null significa credenciales incorrectas
    if (!resultado) {
        return errorResponse(res, 'Credenciales incorrectas', 401);
    }

    return successResponse(res, 'Inicio de sesión exitoso', resultado);
});

// ── POST /api/auth/register ──────────────────────────────────────────────────
// Registra un nuevo usuario en el sistema.
// Cuerpo esperado (validado por validateSchema(registerSchema) en la ruta):
//   { name, documento, email, password }
//
// Respuesta exitosa 201: { success, message, data: { usuario sin password } }
// Error 409: el email o documento ya están registrados
// Error 400: datos inválidos (lo maneja el middleware de validación)
//
// catchAsync captura cualquier error async y lo pasa al middleware global
// de errores sin necesidad de un bloque try/catch manual aquí.
export const register = catchAsync(async (req, res) => {
    // req.body ya fue validado y limpiado por validateSchema(registerSchema)
    const { name, documento, email, password } = req.body;

    // registerService maneja la lógica: verifica duplicados, hashea y crea
    // Retorna { error, codigo } si hay conflicto, o { usuario } si fue exitoso
    const resultado = await registerService({ name, documento, email, password });

    // Si el servicio retornó un error significa que el email o documento ya existen
    if (resultado.error) {
        return errorResponse(res, resultado.error, resultado.codigo);
    }

    // Si llegamos aquí el registro fue exitoso — respondemos con 201 Created
    return successResponse(res, 'Usuario registrado correctamente', resultado.usuario, 201);
});