// MODULO: utils/catchAsync.js
// CAPA: Utils

// Funcion envolvente (wrapper) que elimina la necesidad de bloques
// try/catch repetitivos en cada funcion de controlador.

// Como funciona:
//   En lugar de escribir try/catch en cada controlador, se envuelve
//   la funcion con catchAsync. Si la funcion async lanza un error,
//   catchAsync lo captura automaticamente y lo pasa a next(error),
//   que lo envia al middleware global de errores (error.middleware.js).

// Sin catchAsync (patron repetitivo que eliminamos):
//   export async function getUsers(req, res) {
//     try { ... } catch (error) { res.status(500).json(...) }
//   }

// Con catchAsync (patron limpio):
//   export const getUsers = catchAsync(async (req, res) => { ... });

// Recibe una funcion async del controlador y retorna una nueva funcion
// que envuelve la ejecucion en un bloque de captura automatico.
// Parametro: fn  funcion async del controlador a proteger
export function catchAsync(fn) {
    // Se retorna una funcion normal de Express que recibe req, res, next
    return function(req, res, next) {
        // Promise.resolve garantiza que cualquier error async llegue al catch
        // El catch pasa el error a next() para que llegue al error.middleware
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}