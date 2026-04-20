// MÓDULO: controller/auth.refresh.controller.js
// CAPA: Controlador (recibe HTTP, llama el servicio, responde HTTP)
//
// Responsabilidad única: manejar la renovación del accessToken.
// Se separa de auth.controller.js para respetar el Principio de
// Responsabilidad Única (SRP): cada controlador maneja una sola operación.

import { catchAsync }                     from '../utils/catchAsync.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { renovarAccessTokenService }      from '../services/auth.service.js';

// POST /api/auth/refresh
// Cuerpo esperado: { refreshToken }
// Respuesta exitosa 200: { success, message, data: { accessToken } }
// Error 401: refreshToken faltante, expirado o inválido (en español)
export const refresh = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;

    // Validar que venga el refreshToken en el body
    if (!refreshToken) {
        return errorResponse(res, 'Acceso denegado: Refresh token requerido', 401);
    }

    try {
        // El servicio de Sebas (auth.service.js) valida la firma con JWT_REFRESH_SECRET
        // y retorna un nuevo accessToken, o null si el usuario ya no existe
        const nuevoAccessToken = await renovarAccessTokenService(refreshToken);

        if (!nuevoAccessToken) {
            return errorResponse(res, 'Acceso denegado: Token inválido', 401);
        }

        // Retornar solo el nuevo accessToken — el refreshToken sigue siendo el mismo
        return successResponse(res, 'Token renovado correctamente', { accessToken: nuevoAccessToken });

    } catch (error) {
        // TokenExpiredError — el refreshToken también venció, el usuario debe hacer login
        if (error.name === 'TokenExpiredError') {
            return errorResponse(
                res,
                'Acceso denegado: El token ha expirado, inicie sesión nuevamente',
                401
            );
        }
        // JsonWebTokenError u otro error de firma
        return errorResponse(res, 'Acceso denegado: Token inválido', 401);
    }
});