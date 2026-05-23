// MODULO: utils/response.util.js
// CAPA: Utils
//
// Centraliza la estructura de todas las respuestas HTTP de la API.
// Garantiza que el frontend siempre reciba el mismo contrato JSON
// sin importar que endpoint respondio.
//
// Formato estandar acordado:
//   { success: boolean, message: string, data: any }
//
// Ningun controlador debe usar res.status().json() directamente.
// Siempre deben pasar por successResponse o errorResponse.

// Exportamos successResponse que recibe el objeto de respuesta de Express,
// un mensaje descriptivo, los datos a enviar y el codigo HTTP
// y construye la respuesta exitosa con el formato estandar del proyecto
export function successResponse(res, message, data = null, status = 200) {
    return res.status(status).json({
        success: true,    // indica que la operación fue exitosa  el frontend lo lee para confirmar
        message,          // mensaje en español que el frontend puede mostrar al usuario
        data,             // los datos de la respuesta: objeto, arreglo o null si no hay datos
    });
}

// Exportamos errorResponse que recibe el objeto de respuesta de Express,
// un mensaje de error, el codigo HTTP apropiado y datos opcionales del error
// y construye la respuesta de error con el formato estandar del proyecto
export function errorResponse(res, message, status = 500, data = null) {
    return res.status(status).json({
        success: false,   // indica que la operación falló  el frontend lo lee para mostrar el error
        message,          // mensaje en español que describe el error para el usuario
        data,             // información adicional del error  casi siempre null en este proyecto
    });
}
