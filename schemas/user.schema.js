// MODULO: schemas/user.schema.js
// CAPA: Schemas (moldes de validacion de datos)
//
// Responsabilidad unica: definir la forma y las reglas que deben cumplir
// los datos de un usuario antes de llegar al controlador.
// Este archivo NO toca el DOM, NO hace peticiones HTTP, NO accede a la BD.
//
// Se usa Zod como libreria estandar de validacion de esquemas.
// Sigue el mismo patron que task.schema.js  molde separado de la logica.

import { z } from 'zod';

// Esquema para CREAR un usuario  POST /api/users
// Los tres campos son obligatorios para registrar un usuario en el sistema
export const createUserSchema = z.object({

    // documento: obligatorio, solo numeros, minimo 5 digitos, maximo 20
    // Evita que se registren documentos vacios o con letras
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

    // name: obligatorio, minimo 3 caracteres, maximo 100
    // Evita registrar usuarios sin nombre o con nombres de un solo caracter
    name: z
        .string({
            required_error:     'El nombre es obligatorio',
            invalid_type_error: 'El nombre debe ser una cadena de texto',
        })
        .min(3,   'El nombre debe tener al menos 3 caracteres')
        .max(100, 'El nombre no puede exceder los 100 caracteres'),

    // email: obligatorio, formato de correo electronico valido
    // Zod valida automaticamente que tenga @ y dominio correcto
    email: z
        .string({
            required_error:     'El correo electrónico es obligatorio',
            invalid_type_error: 'El correo debe ser una cadena de texto',
        })
        .email('El correo electrónico no tiene un formato válido')
        .max(100, 'El correo no puede exceder los 100 caracteres'),
});

// Esquema para ACTUALIZAR un usuario  PUT /api/users/:id
// Igual que createUserSchema pero todos los campos son opcionales (partial)
// Permite actualizar solo documento, solo name, solo email o cualquier combinacion
export const updateUserSchema = createUserSchema.partial();

// ── SCHEMA PARA CAMBIAR ROL ──────────────────────────────────────────────────
// PATCH /api/users/:id/role
// Acepta los 6 roles del sistema: 3 base + 3 adicionales
export const changeRoleSchema = z.object({
    role: z.enum(
        ['admin', 'user', 'instructor', 'auditor', 'comunicador', 'soporte'],
        {
            required_error: 'El rol es obligatorio',
            message:        "El rol debe ser uno de: admin, user, instructor, auditor, comunicador, soporte",
        }
    ),
});