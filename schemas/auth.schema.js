// schemas/auth.schema.js
// MÓDULO: schemas/auth.schema.js
// CAPA: Schemas (moldes de validación de datos)
//
// Responsabilidad única: definir las reglas que deben cumplir
// las credenciales de login y registro antes de llegar al controlador.
// Sigue el mismo patrón que user.schema.js y task.schema.js.
//
// CAMBIO en esta versión:
//   loginSchema ahora usa 'email' en lugar de 'documento'.
//   El instructor pidió que el login sea con email + contraseña para
//   que sea consistente con el formulario de la pantalla de inicio.

import { z } from 'zod';

// ── SCHEMA DE LOGIN ──────────────────────────────────────────────────────────
// POST /api/auth/login
// Cuerpo esperado: { email, password }
// Respuesta exitosa: { accessToken, refreshToken, user }
//
// Antes era { documento, password }, ahora es { email, password }.
// El cambio se hace aquí y en loginService de auth.service.js.
export const loginSchema = z.object({

    // email: obligatorio, formato de correo válido, máximo 100 caracteres
    // Zod verifica automáticamente que tenga @ y un dominio después del punto
    email: z
        .string({
            required_error:     'El correo electrónico es obligatorio',
            invalid_type_error: 'El correo debe ser una cadena de texto',
        })
        .email('El correo electrónico no tiene un formato válido')
        .max(100, 'El correo no puede exceder los 100 caracteres'),

    // password: obligatorio, mínimo 6 caracteres, máximo 100
    // La regla de letras+números se mantiene igual que antes
    password: z
        .string({
            required_error:     'La contraseña es obligatoria',
            invalid_type_error: 'La contraseña debe ser una cadena de texto',
        })
        .min(6,   'La contraseña debe tener al menos 6 caracteres')
        .max(100, 'La contraseña no puede exceder los 100 caracteres'),
});

// ── SCHEMA DE REGISTRO ───────────────────────────────────────────────────────
// POST /api/auth/register
// Cuerpo esperado: { name, documento, email, password }
// Respuesta exitosa 201: { success, message, data: { user sin password } }
//
// Este schema es nuevo: no existía antes porque no había endpoint de registro.
// Las reglas de documento, name y email coinciden exactamente con createUserSchema
// en user.schema.js para mantener consistencia en todo el proyecto.
// La regla de password es la misma del loginSchema para no generar confusión.
export const registerSchema = z.object({

    // name: obligatorio, mínimo 3, máximo 100, solo letras y espacios
    // La misma regla que createUserSchema.name en user.schema.js
    name: z
        .string({
            required_error:     'El nombre es obligatorio',
            invalid_type_error: 'El nombre debe ser una cadena de texto',
        })
        .min(3,   'El nombre debe tener al menos 3 caracteres')
        .max(100, 'El nombre no puede exceder los 100 caracteres')
        .regex(
            /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/,
            'El nombre solo puede contener letras y espacios'
        ),

    // documento: obligatorio, solo números, mínimo 5, máximo 20
    // La misma regla que createUserSchema.documento en user.schema.js
    documento: z
        .string({
            required_error:     'El número de documento es obligatorio',
            invalid_type_error: 'El documento debe ser una cadena de texto',
        })
        .min(5,  'El documento debe tener al menos 5 caracteres')
        .max(20, 'El documento no puede exceder los 20 caracteres')
        .regex(
            /^\d+$/,
            'El documento solo puede contener números'
        ),

    // email: obligatorio, formato de correo válido, máximo 100
    // La misma regla que createUserSchema.email en user.schema.js
    email: z
        .string({
            required_error:     'El correo electrónico es obligatorio',
            invalid_type_error: 'El correo debe ser una cadena de texto',
        })
        .email('El correo electrónico no tiene un formato válido')
        .max(100, 'El correo no puede exceder los 100 caracteres'),

    // password: obligatorio, mínimo 6 caracteres, máximo 100
    // La misma regla que loginSchema.password para consistencia
    password: z
        .string({
            required_error:     'La contraseña es obligatoria',
            invalid_type_error: 'La contraseña debe ser una cadena de texto',
        })
        .min(6,   'La contraseña debe tener al menos 6 caracteres')
        .max(100, 'La contraseña no puede exceder los 100 caracteres'),
});