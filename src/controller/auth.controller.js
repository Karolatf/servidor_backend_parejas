// MÓDULO: controller/auth.controller.js
// CAPA: Controlador (recibe HTTP, llama el servicio, responde HTTP)
//
// Responsabilidad única: manejar las peticiones HTTP de autenticación.
// NUNCA contiene lógica de negocio — eso va en auth.service.js.

import { catchAsync }                     from '../utils/catchAsync.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { loginService }                   from '../services/auth.service.js';

// POST /api/auth/login
// Cuerpo: { documento, password }
// Respuesta exitosa 200: { success, message, data: { accessToken, refreshToken, user } }
// Error 400: campos faltantes
// Error 401: credenciales incorrectas
export const login = catchAsync(async (req, res) => {
    const { documento, password } = req.body;

    // El servicio valida las credenciales — retorna los datos o null
    const resultado = await loginService({ documento, password });

    // null significa credenciales incorrectas
    if (!resultado) {
        return errorResponse(res, 'Credenciales incorrectas', 401);
    }

    return successResponse(res, 'Inicio de sesión exitoso', resultado);
});