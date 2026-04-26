// MÓDULO: utils/resetCodes.js
// CAPA: Utils

// Responsabilidad única: almacenar temporalmente los códigos de recuperación
// de contraseña en memoria del servidor.

// Por qué en memoria y no en la BD:
//   Los códigos de reseteo son datos efímeros — existen solo por 15 minutos.
//   Guardarlos en MySQL requeriría una tabla extra y tareas de limpieza periódica.
//   Un Map en memoria es más simple, suficientemente seguro para el alcance del proyecto,
//   y los datos se limpian solos cuando el servidor reinicia.

// Estructura del Map:
//   clave  → email del usuario (string, en minúsculas)
//   valor  → { code: '123456', expiresAt: timestamp, verified: false }

// expiresAt: Date.now() + 15 minutos en milisegundos
// verified: se pone en true cuando el usuario ingresa el código correcto,
//           permitiéndole avanzar al paso de cambio de contraseña.
 
// Map en memoria que almacena los códigos temporales de recuperación
// Se exporta como const para que sea un singleton compartido entre todos los módulos
const codigosReset = new Map();
 
// TTL (Time To Live) de los códigos: 15 minutos en milisegundos
const CODIGO_TTL_MS = 15 * 60 * 1000;
 
// Genera un código numérico aleatorio de 6 dígitos.
// Math.random() * 900000 da un número entre 0 y 899999.
// Al sumar 100000 obtenemos un rango de 100000 a 999999 (siempre 6 dígitos).
// Math.floor elimina los decimales para quedarnos con un entero.
export function generarCodigo() {
    return String(Math.floor(100000 + Math.random() * 900000));
}
 
// Guarda o reemplaza el código de un email específico en el Map.
// Si ya existía un código para ese email, lo reemplaza (el usuario pidió un nuevo código).
// Parámetro: email — el email del usuario que solicita recuperación
// Retorna: el código generado (string de 6 dígitos)
export function guardarCodigo(email) {
    const emailNormalizado = email.toLowerCase().trim();
    const code             = generarCodigo();
    // expiresAt: momento exacto en que el código expira (15 minutos desde ahora)
    const expiresAt        = Date.now() + CODIGO_TTL_MS;
 
    codigosReset.set(emailNormalizado, {
        code,
        expiresAt,
        // verified: false indica que el usuario aún no ha ingresado el código
        // Se pone en true solo cuando verifyResetCode confirma el código correcto
        verified: false,
    });
 
    return code;
}
 
// Verifica si el código ingresado por el usuario es correcto y no ha expirado.
// Parámetro: email — el email del usuario
// Parámetro: codigoIngresado — el código de 6 dígitos que el usuario ingresó
// Retorna: { valido: true } si el código es correcto, o { valido: false, razon } si no
export function verificarCodigo(email, codigoIngresado) {
    const emailNormalizado = email.toLowerCase().trim();
    const entrada          = codigosReset.get(emailNormalizado);
 
    // Si no existe ningún código para este email
    if (!entrada) {
        return { valido: false, razon: 'No se encontró un código para este correo' };
    }
 
    // Verificar si el código ya expiró comparando el tiempo actual con expiresAt
    if (Date.now() > entrada.expiresAt) {
        // Limpiar el código vencido del Map para liberar memoria
        codigosReset.delete(emailNormalizado);
        return { valido: false, razon: 'El código ha expirado. Solicita uno nuevo.' };
    }
 
    // Comparar el código ingresado con el código guardado (ambos como strings)
    if (entrada.code !== String(codigoIngresado)) {
        return { valido: false, razon: 'El código ingresado es incorrecto' };
    }
 
    // El código es correcto y no ha expirado — marcarlo como verificado
    // Esto permite que el siguiente paso (resetPassword) proceda sin pedir el código de nuevo
    codigosReset.set(emailNormalizado, { ...entrada, verified: true });
    return { valido: true };
}
 
// Verifica si el email tiene un código verificado (para el paso de resetPassword).
// Parámetro: email — el email del usuario
// Retorna: true si el código fue verificado previamente y no ha expirado, false en caso contrario
export function codigoEsVerificado(email) {
    const emailNormalizado = email.toLowerCase().trim();
    const entrada          = codigosReset.get(emailNormalizado);
 
    if (!entrada)                     return false;
    if (Date.now() > entrada.expiresAt) return false;
    return entrada.verified === true;
}
 
// Elimina el código de un email del Map después de un reseteo exitoso.
// Parámetro: email — el email del usuario
// Se llama desde resetPassword para limpiar el código ya usado.
export function eliminarCodigo(email) {
    codigosReset.delete(email.toLowerCase().trim());
}