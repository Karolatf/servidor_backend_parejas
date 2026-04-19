// MÓDULO: schemas/auth.schema.js
// CAPA: Schemas (moldes de validación de datos)
//
// Responsabilidad única: definir las reglas que deben cumplir
// las credenciales de login antes de llegar al controlador.
// Sigue el mismo patrón que user.schema.js y task.schema.js.

import { z } from 'zod';

// Esquema para LOGIN — POST /api/auth/login
// documento: mismas reglas que createUserSchema (user.schema.js)
// password: obligatoria, mínimo 6 caracteres, máximo 100,
//           debe contener al menos una letra y un número
export const loginSchema = z.object({

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

    password: z
        .string({
            required_error:     'La contraseña es obligatoria',
            invalid_type_error: 'La contraseña debe ser una cadena de texto',
        })
        .min(6,   'La contraseña debe tener al menos 6 caracteres')
        .max(100, 'La contraseña no puede exceder los 100 caracteres')
        .regex(
            /^(?=.*[a-zA-Z])(?=.*\d)/,
            'La contraseña debe contener al menos una letra y un número'
        ),
});