// MÓDULO: middlewares/error.middleware.js
// CAPA: Middleware

// Middleware global de manejo de errores.
// Captura cualquier error que llegue mediante next(error) desde los
// controladores envueltos con catchAsync.

// Express identifica un middleware de errores porque tiene EXACTAMENTE
// 4 parámetros: (error, req, res, next). Si tiene 3, Express lo trata
// como middleware normal y nunca lo ejecuta para errores.

// Este middleware se registra en app.js DESPUÉS de todas las rutas.
// Si se registra antes, los errores de las rutas no llegarán aquí.

// Captura el error, lo registra en consola y responde con el formato
// estándar del proyecto.
// Parámetros:
//   error — objeto Error lanzado por el controlador
//   req   — objeto de petición de Express (no se usa aquí)
//   res   — objeto de respuesta para enviar el JSON de error
//   next  — función next de Express (requerida para que Express
//           reconozca este middleware como manejador de errores)
export function errorMiddleware(error, req, res, next) {

    // Se registra el error en consola para trazabilidad en el servidor
    console.error('Error capturado por el middleware global:', error.message);

    // Se usa el status del error si existe, si no se usa 500 por defecto
    const status = error.status || 500;

    // Se usa el mensaje del error si existe, si no un mensaje genérico
    const message = error.message || 'Error interno del servidor';

    // Se responde con el formato estándar del proyecto
    res.status(status).json({
        success: false,
        message,
        data: null,
    });
}