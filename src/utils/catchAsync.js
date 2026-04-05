// MÓDULO: utils/catchAsync.js
// CAPA: Utils

// Función envolvente (wrapper) que elimina la necesidad de bloques
// try/catch repetitivos en cada función de controlador.

// Cómo funciona:
//   En lugar de escribir try/catch en cada controlador, se envuelve
//   la función con catchAsync. Si la función async lanza un error,
//   catchAsync lo captura automáticamente y lo pasa a next(error),
//   que lo envía al middleware global de errores (error.middleware.js).

// Sin catchAsync (patrón repetitivo que eliminamos):
//   export async function getUsers(req, res) {
//     try { ... } catch (error) { res.status(500).json(...) }
//   }

// Con catchAsync (patrón limpio):
//   export const getUsers = catchAsync(async (req, res) => { ... });

// Recibe una función async del controlador y retorna una nueva función
// que envuelve la ejecución en un bloque de captura automático.
// Parámetro: fn — función async del controlador a proteger
export function catchAsync(fn) {
    // Se retorna una función normal de Express que recibe req, res, next
    return function(req, res, next) {
        // Promise.resolve garantiza que cualquier error async llegue al catch
        // El catch pasa el error a next() para que llegue al error.middleware
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}