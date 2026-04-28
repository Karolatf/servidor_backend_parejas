// MÓDULO: middlewares/error.middleware.js
// CAPA: Middleware
//
// Middleware global de manejo de errores.
// Captura cualquier error que llegue mediante next(error) desde los
// controladores envueltos con catchAsync.
//
// Express identifica un middleware de errores porque tiene EXACTAMENTE
// 4 parámetros: (error, req, res, next). Si tiene 3, Express lo trata
// como middleware normal y nunca lo ejecuta para errores.
//
// Este middleware se registra en app.js DESPUÉS de todas las rutas.

// Captura el error, lo registra en consola y responde con el formato
// estándar del proyecto.
// Parámetros:
//   error — objeto Error lanzado por el controlador
//   req   — objeto de petición de Express (no se usa aquí)
//   res   — objeto de respuesta para enviar el JSON de error
//   next  — función next de Express (requerida para que Express
//           reconozca este middleware como manejador de errores)
export function errorMiddleware(error, req, res, next) {

    // Registrar el error en consola para trazabilidad en el servidor
    // Se registra también el code si existe (ej: ACCOUNT_DISABLED) para facilitar el debug
    console.error(
        'Error capturado por el middleware global:',
        error.message,
        error.code ? `[code: ${error.code}]` : ''
    );

    // ── CASO ESPECIAL: cuenta de usuario desactivada ──────────────────────────
    // Este error lo lanza loginService cuando is_active = 0 en la BD.
    // Tiene error.code = 'ACCOUNT_DISABLED' y error.status = 403.
    // Lo manejamos explícitamente aquí para garantizar el status 403
    // y un mensaje claro que el frontend pueda mostrar al usuario.
    if (error.code === 'ACCOUNT_DISABLED') {
        return res.status(403).json({
            success: false,
            // El mensaje ya viene en español desde auth.service.js
            message: error.message,
            data:    null,
        });
    }

    // ── CASO GENERAL: cualquier otro error del sistema ────────────────────────
    // error.status es la propiedad estándar del proyecto (ver auth.service.js)
    // Si no viene status se usa 500 (error interno del servidor) por defecto
    const status  = error.status  || 500;
    const message = error.message || 'Error interno del servidor';

    res.status(status).json({
        success: false,
        message,
        data: null,
    });
}