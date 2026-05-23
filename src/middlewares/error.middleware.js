// MODULO: middlewares/error.middleware.js
// CAPA: Middleware
//
// Middleware global de manejo de errores.
// Captura cualquier error que llegue mediante next(error) desde los
// controladores envueltos con catchAsync.
//
// Express identifica un middleware de errores porque tiene EXACTAMENTE
// 4 parametros: (error, req, res, next). Si tiene 3, Express lo trata
// como middleware normal y nunca lo ejecuta para errores.
//
// Este middleware se registra en app.js DESPUES de todas las rutas.

// Exportamos errorMiddleware que recibe el error lanzado en cualquier controlador,
// lo registra en consola y le responde al cliente con el formato estandar del proyecto
export function errorMiddleware(error, req, res, next) {

    // Registramos el error en la consola del servidor para trazabilidad y debugging
    // Si el error tiene un code especial (ej: ACCOUNT_DISABLED) tambien lo mostramos
    console.error(
        'Error capturado por el middleware global:',
        error.message,
        // Mostramos el code solo si existe  el operador ? verifica antes de usarlo
        error.code ? `[code: ${error.code}]` : ''
    );

    // ── CASO ESPECIAL: cuenta de usuario desactivada ──────────────────────────
    // Este error lo lanza loginService cuando is_active = 0 en la BD.
    // Tiene error.code = 'ACCOUNT_DISABLED' y error.status = 403.
    // Lo manejamos explicitamente para garantizar el codigo 403
    // y un mensaje claro que el frontend pueda mostrar al usuario desactivado
    if (error.code === 'ACCOUNT_DISABLED') {
        return res.status(403).json({
            success: false,
            // El mensaje ya viene en espanol desde auth.service.js  lo usamos directamente
            message: error.message,
            data:    null,
        });
    }

    // ── CASO GENERAL: cualquier otro error del sistema ────────────────────────
    // error.status es la propiedad que los controladores y servicios establecen
    // Si no viene ningun status usamos 500 (Error Interno del Servidor) por defecto
    const status  = error.status  || 500;
    // Si el error no tiene mensaje propio, usamos un mensaje generico en espanol
    const message = error.message || 'Error interno del servidor';

    // Respondemos al cliente con el codigo HTTP apropiado y el formato estandar
    res.status(status).json({
        success: false,   // indica que la operación falló
        message,          // mensaje descriptivo del error en español
        data: null,       // null porque no hay datos que retornar en una respuesta de error
    });
}
