// MÓDULO: utils/response.util.js
// CAPA: Utils

// Centraliza la estructura de todas las respuestas HTTP de la API.
// Garantiza que el frontend siempre reciba el mismo contrato JSON
// sin importar qué endpoint respondió.

// Formato estándar acordado:
//   { success: boolean, message: string, data: any }

// Ningún controlador debe usar res.status().json() directamente.
// Siempre deben pasar por successResponse o errorResponse.

// Genera una respuesta exitosa con el formato estándar del proyecto.
// Parámetros:
//   res     — objeto de respuesta de Express
//   message — mensaje descriptivo del resultado para el frontend
//   data    — datos a retornar (arreglo, objeto o null si no hay datos)
//   status  — código HTTP (default 200, usar 201 para creaciones)
export function successResponse(res, message, data = null, status = 200) {
    return res.status(status).json({
        success: true,
        message,
        data,
    });
}

// Genera una respuesta de error con el formato estándar del proyecto.
// Parámetros:
//   res     — objeto de respuesta de Express
//   message — mensaje descriptivo del error para el frontend
//   status  — código HTTP (400 cliente, 404 no encontrado, 500 servidor)
//   data    — información adicional del error (opcional, casi siempre null)
export function errorResponse(res, message, status = 500, data = null) {
    return res.status(status).json({
        success: false,
        message,
        data,
    });
}