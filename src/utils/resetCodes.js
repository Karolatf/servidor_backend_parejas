// MODULO: utils/resetCodes.js
// CAPA: Utils
//
// Responsabilidad unica: almacenar temporalmente los codigos de recuperacion
// de contrasena en memoria del servidor.
//
// Por que en memoria y no en la BD:
//   Los codigos de reseteo son datos efimeros  existen solo por 15 minutos.
//   Guardarlos en MySQL requeriria una tabla extra y tareas de limpieza periodica.
//   Un Map en memoria es mas simple, suficientemente seguro para el alcance del proyecto,
//   y los datos se limpian solos cuando el servidor reinicia.
//
// Estructura del Map:
//   clave  → email del usuario (string, en minusculas)
//   valor  → { code: '123456', expiresAt: timestamp, verified: false }
//
// expiresAt: Date.now() + 15 minutos en milisegundos
// verified: se pone en true cuando el usuario ingresa el codigo correcto,
//           permitiendole avanzar al paso de cambio de contrasena.

// Creamos el Map en memoria que almacena los codigos temporales de recuperacion
// Se declara como const para que sea un singleton compartido entre todos los modulos
const codigosReset = new Map();

// Definimos el TTL (Time To Live) de los codigos: 15 minutos expresados en milisegundos
const CODIGO_TTL_MS = 15 * 60 * 1000;

// ── generarCodigo ─────────────────────────────────────────────────────────────
// Exportamos la funcion generarCodigo que genera un numero aleatorio de 6 digitos
// Math.random() * 900000 da un numero entre 0 y 899999
// Sumando 100000 obtenemos un rango de 100000 a 999999  siempre exactamente 6 digitos
// Math.floor elimina los decimales para obtener un numero entero limpio
export function generarCodigo() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// ── guardarCodigo ─────────────────────────────────────────────────────────────
// Exportamos la funcion guardarCodigo que guarda o reemplaza el codigo de un email en el Map
// Si ya existia un codigo para ese email, lo reemplaza (el usuario pidio un nuevo codigo)
export function guardarCodigo(email) {
    // Normalizamos el email a minusculas y sin espacios para que sea la clave exacta del Map
    const emailNormalizado = email.toLowerCase().trim();
    // Generamos el codigo de 6 digitos llamando a generarCodigo
    const code             = generarCodigo();
    // Calculamos el momento exacto en que el codigo expirara  15 minutos desde ahora
    const expiresAt        = Date.now() + CODIGO_TTL_MS;

    // Guardamos el codigo en el Map con su timestamp de expiracion y verified en false
    codigosReset.set(emailNormalizado, {
        code,
        expiresAt,
        // verified: false indica que el usuario aun no ingreso el codigo en el paso 2
        // Se cambia a true solo cuando verificarCodigo confirma que el codigo es correcto
        verified: false,
    });

    // Retornamos el codigo generado para que el controlador lo envie por correo
    return code;
}

// ── verificarCodigo ───────────────────────────────────────────────────────────
// Exportamos la funcion verificarCodigo que comprueba si el codigo ingresado por el usuario
// coincide con el guardado en el Map y si aun no ha vencido (TTL de 15 minutos)
// Retorna { valido: true } si el codigo es correcto, o { valido: false, razon } si no
export function verificarCodigo(email, codigoIngresado) {
    // Normalizamos el email para que coincida exactamente con la clave del Map
    const emailNormalizado = email.toLowerCase().trim();
    // Buscamos la entrada del email en el Map  retorna undefined si no existe
    const entrada          = codigosReset.get(emailNormalizado);

    // Si no existe ningun codigo para este email, informamos al usuario que no hay codigo
    if (!entrada) {
        return { valido: false, razon: 'No se encontró un código para este correo' };
    }

    // Comparamos el momento actual con expiresAt  si ya paso, el codigo vencio
    if (Date.now() > entrada.expiresAt) {
        // Eliminamos el codigo vencido del Map para liberar la memoria
        codigosReset.delete(emailNormalizado);
        return { valido: false, razon: 'El código ha expirado. Solicita uno nuevo.' };
    }

    // Comparamos el codigo ingresado con el codigo guardado como strings
    if (entrada.code !== String(codigoIngresado)) {
        // Los codigos no coinciden  el usuario escribio el codigo incorrectamente
        return { valido: false, razon: 'El código ingresado es incorrecto' };
    }

    // El codigo es correcto y no ha expirado  lo marcamos como verificado en el Map
    // Esto permite que el paso 3 (resetPassword) proceda sin pedir el codigo de nuevo
    codigosReset.set(emailNormalizado, { ...entrada, verified: true });
    // Retornamos { valido: true } para que el controlador responda con 200
    return { valido: true };
}

// ── codigoEsVerificado ────────────────────────────────────────────────────────
// Exportamos la funcion codigoEsVerificado que verifica si el email tiene
// un codigo que fue marcado como verificado en el paso 2 y que todavia no ha expirado
// Retorna true si puede proceder al paso 3, false si debe volver al paso 2
export function codigoEsVerificado(email) {
    // Normalizamos el email para encontrar la clave exacta en el Map
    const emailNormalizado = email.toLowerCase().trim();
    // Buscamos la entrada del email en el Map
    const entrada          = codigosReset.get(emailNormalizado);

    // Si no existe entrada para este email, no hay codigo  retornamos false
    if (!entrada)                       return false;
    // Si el codigo ya expiro aunque estuviera verificado  retornamos false
    if (Date.now() > entrada.expiresAt) return false;
    // Retornamos true solo si el codigo fue marcado como verificado en el paso 2
    return entrada.verified === true;
}

// ── eliminarCodigo ────────────────────────────────────────────────────────────
// Exportamos la funcion eliminarCodigo que borra la entrada del email del Map
// despues de que el usuario cambio su contrasena exitosamente en el paso 3
// Asi el codigo no puede reutilizarse para cambiar la contrasena de nuevo
export function eliminarCodigo(email) {
    // Eliminamos la entrada del Map usando el email normalizado como clave
    codigosReset.delete(email.toLowerCase().trim());
}
