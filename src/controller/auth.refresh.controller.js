// MODULO: controller/auth.refresh.controller.js
// CAPA: Controlador (recibe HTTP, llama el servicio, responde HTTP)
//
// Responsabilidad unica: manejar la renovacion del accessToken.
// Se separa de auth.controller.js para respetar el Principio de
// Responsabilidad Unica (SRP): cada controlador maneja una sola operacion.

// Importamos catchAsync para capturar errores async sin try/catch manuales
import { catchAsync }                     from '../utils/catchAsync.js';
// Importamos successResponse y errorResponse para respuestas con formato estandar
import { successResponse, errorResponse } from '../utils/response.util.js';
// Importamos renovarAccessTokenService que verifica el refreshToken y emite un nuevo accessToken
import { renovarAccessTokenService }      from '../services/auth.service.js';

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
// Recibe el refreshToken del cliente y genera un nuevo accessToken de 1 hora
// El cliente llama a este endpoint cuando el accessToken vence (cada hora)
// Cuerpo esperado: { refreshToken }
export const refresh = catchAsync(async (req, res) => {
    // Sacamos el refreshToken del cuerpo de la peticion que envio el cliente
    const { refreshToken } = req.body;

    // Si el refreshToken no llego en el cuerpo, el cliente debe hacer login completo de nuevo
    if (!refreshToken) {
        return errorResponse(res, 'Acceso denegado: Refresh token requerido', 401);
    }

    try {
        // Llamamos a renovarAccessTokenService que verifica la firma del refreshToken con JWT_REFRESH_SECRET,
        // comprueba que el usuario sigue existiendo en la BD y genera un nuevo accessToken de 1h
        // Si el usuario fue eliminado despues de emitir el token, retorna null
        const nuevoAccessToken = await renovarAccessTokenService(refreshToken);

        // Si renovarAccessTokenService retorno null el usuario ya no existe en la BD
        if (!nuevoAccessToken) {
            return errorResponse(res, 'Acceso denegado: Token inválido', 401);
        }

        // Llegamos aqui porque el token fue renovado  enviamos solo el nuevo accessToken
        // El refreshToken sigue siendo el mismo, no se rota en esta implementacion
        return successResponse(res, 'Token renovado correctamente', { accessToken: nuevoAccessToken });

    } catch (error) {
        // TokenExpiredError: el refreshToken tambien vencio  el usuario debe hacer login completo
        if (error.name === 'TokenExpiredError') {
            return errorResponse(
                res,
                'Acceso denegado: El token ha expirado, inicie sesión nuevamente',
                401
            );
        }
        // JsonWebTokenError u otro error: la firma del token es invalida o el token fue manipulado
        return errorResponse(res, 'Acceso denegado: Token inválido', 401);
    }
});
