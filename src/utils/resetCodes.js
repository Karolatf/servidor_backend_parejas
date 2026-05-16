// MÓDULO: utils/resetCodes.js
// CAPA: Utils
//
// Responsabilidad única: almacenar temporalmente los códigos de recuperación
// de contraseña en memoria del servidor.
//
// Por qué en memoria y no en la BD:
//   Los códigos de reseteo son datos efímeros — existen solo por 15 minutos.
//   Guardarlos en MySQL requeriría una tabla extra y tareas de limpieza periódica.
//   Un Map en memoria es más simple, suficientemente seguro para el alcance del proyecto,
//   y los datos se limpian solos cuando el servidor reinicia.
//
// Estructura del Map:
//   clave  → email del usuario (string, en minúsculas)
//   valor  → { code: '123456', expiresAt: timestamp, verified: false }
//
// expiresAt: Date.now() + 15 minutos en milisegundos
// verified: se pone en true cuando el usuario ingresa el código correcto,
//           permitiéndole avanzar al paso de cambio de contraseña.

// Creamos el Map en memoria que almacena los códigos temporales de recuperación
// Se declara como const para que sea un singleton compartido entre todos los módulos
const codigosReset = new Map();

// Definimos el TTL (Time To Live) de los códigos: 15 minutos expresados en milisegundos
const CODIGO_TTL_MS = 15 * 60 * 1000;

// ── generarCodigo ─────────────────────────────────────────────────────────────
// Exportamos la función generarCodigo que genera un número aleatorio de 6 dígitos
// Math.random() * 900000 da un número entre 0 y 899999
// Sumando 100000 obtenemos un rango de 100000 a 999999 — siempre exactamente 6 dígitos
// Math.floor elimina los decimales para obtener un número entero limpio
export function generarCodigo() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// ── guardarCodigo ─────────────────────────────────────────────────────────────
// Exportamos la función guardarCodigo que guarda o reemplaza el código de un email en el Map
// Si ya existía un código para ese email, lo reemplaza (el usuario pidió un nuevo código)
export function guardarCodigo(email) {
    // Normalizamos el email a minúsculas y sin espacios para que sea la clave exacta del Map
    const emailNormalizado = email.toLowerCase().trim();
    // Generamos el código de 6 dígitos llamando a generarCodigo
    const code             = generarCodigo();
    // Calculamos el momento exacto en que el código expirará — 15 minutos desde ahora
    const expiresAt        = Date.now() + CODIGO_TTL_MS;

    // Guardamos el código en el Map con su timestamp de expiración y verified en false
    codigosReset.set(emailNormalizado, {
        code,
        expiresAt,
        // verified: false indica que el usuario aún no ingresó el código en el paso 2
        // Se cambia a true solo cuando verificarCodigo confirma que el código es correcto
        verified: false,
    });

    // Retornamos el código generado para que el controlador lo envíe por correo
    return code;
}

// ── verificarCodigo ───────────────────────────────────────────────────────────
// Exportamos la función verificarCodigo que comprueba si el código ingresado por el usuario
// coincide con el guardado en el Map y si aún no ha vencido (TTL de 15 minutos)
// Retorna { valido: true } si el código es correcto, o { valido: false, razon } si no
export function verificarCodigo(email, codigoIngresado) {
    // Normalizamos el email para que coincida exactamente con la clave del Map
    const emailNormalizado = email.toLowerCase().trim();
    // Buscamos la entrada del email en el Map — retorna undefined si no existe
    const entrada          = codigosReset.get(emailNormalizado);

    // Si no existe ningún código para este email, informamos al usuario que no hay código
    if (!entrada) {
        return { valido: false, razon: 'No se encontró un código para este correo' };
    }

    // Comparamos el momento actual con expiresAt — si ya pasó, el código venció
    if (Date.now() > entrada.expiresAt) {
        // Eliminamos el código vencido del Map para liberar la memoria
        codigosReset.delete(emailNormalizado);
        return { valido: false, razon: 'El código ha expirado. Solicita uno nuevo.' };
    }

    // Comparamos el código ingresado con el código guardado como strings
    if (entrada.code !== String(codigoIngresado)) {
        // Los códigos no coinciden — el usuario escribió el código incorrectamente
        return { valido: false, razon: 'El código ingresado es incorrecto' };
    }

    // El código es correcto y no ha expirado — lo marcamos como verificado en el Map
    // Esto permite que el paso 3 (resetPassword) proceda sin pedir el código de nuevo
    codigosReset.set(emailNormalizado, { ...entrada, verified: true });
    // Retornamos { valido: true } para que el controlador responda con 200
    return { valido: true };
}

// ── codigoEsVerificado ────────────────────────────────────────────────────────
// Exportamos la función codigoEsVerificado que verifica si el email tiene
// un código que fue marcado como verificado en el paso 2 y que todavía no ha expirado
// Retorna true si puede proceder al paso 3, false si debe volver al paso 2
export function codigoEsVerificado(email) {
    // Normalizamos el email para encontrar la clave exacta en el Map
    const emailNormalizado = email.toLowerCase().trim();
    // Buscamos la entrada del email en el Map
    const entrada          = codigosReset.get(emailNormalizado);

    // Si no existe entrada para este email, no hay código — retornamos false
    if (!entrada)                       return false;
    // Si el código ya expiró aunque estuviera verificado — retornamos false
    if (Date.now() > entrada.expiresAt) return false;
    // Retornamos true solo si el código fue marcado como verificado en el paso 2
    return entrada.verified === true;
}

// ── eliminarCodigo ────────────────────────────────────────────────────────────
// Exportamos la función eliminarCodigo que borra la entrada del email del Map
// después de que el usuario cambió su contraseña exitosamente en el paso 3
// Así el código no puede reutilizarse para cambiar la contraseña de nuevo
export function eliminarCodigo(email) {
    // Eliminamos la entrada del Map usando el email normalizado como clave
    codigosReset.delete(email.toLowerCase().trim());
}
