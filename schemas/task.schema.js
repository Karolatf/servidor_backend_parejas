// MODULO: schemas/task.schema.js
// CAPA: Schemas (moldes de validacion de datos)
//
// Responsabilidad unica: definir la forma y las reglas que deben cumplir
// los datos de una tarea antes de llegar al controlador.
// Este archivo NO toca el DOM, NO hace peticiones HTTP, NO accede a la BD.
//
// Se usa Zod como libreria estandar de validacion de esquemas.
//
// ACTUALIZACION v3.2.0:
//   Se agrega "pendiente_aprobacion" como cuarto estado valido del sistema.
//   Lo pone el usuario cuando considera que termino su tarea y necesita
//   que el admin la revise antes de marcarla como completada.
//
// ACTUALIZACION v3.3.0:
//   Se agrega "reprobada" como quinto estado valido del sistema.
//   Lo asigna automaticamente el sistema cuando el instructor califica
//   una tarea con nota menor a 70. El flujo completo es:
//     pendiente → en_progreso → pendiente_aprobacion → completada | reprobada

import { z } from 'zod';

// Lista centralizada de estados validos del sistema.
// Se define aqui para reutilizarla en los tres schemas sin repetirla.
const ESTADOS_VALIDOS = [
    'pendiente',
    'en_progreso',
    'pendiente_aprobacion',
    'completada',
    'reprobada',   // asignado automáticamente cuando la nota es < 70
];

// Esquema para CREAR una tarea  POST /api/tasks
// Define que campos son obligatorios y que restricciones tiene cada uno
export const createTaskSchema = z.object({

    // title: obligatorio, minimo 3 caracteres, maximo 200
    // Evita que se creen tareas sin nombre o con nombres sin sentido
    title: z
        .string({
            required_error:     'El título de la tarea es obligatorio',
            invalid_type_error: 'El título debe ser una cadena de texto',
        })
        .min(3,   'El título debe tener al menos 3 caracteres')
        .max(200, 'El título no puede exceder los 200 caracteres'),

    // description: opcional  puede no venir en el body
    // Si viene, no puede superar 500 caracteres
    description: z
        .string({ invalid_type_error: 'La descripción debe ser una cadena de texto' })
        .max(500, 'La descripción no puede exceder los 500 caracteres')
        .optional(),

    // status: obligatorio, solo acepta los cinco valores del sistema
    // ACTUALIZACION: se agrega "reprobada" como quinto estado
    status: z.enum(
        ESTADOS_VALIDOS,
        {
            required_error:     'El estado de la tarea es obligatorio',
            invalid_type_error: 'El estado debe ser una cadena de texto',
            message:            "El estado debe ser: 'pendiente', 'en_progreso', 'pendiente_aprobacion', 'completada' o 'reprobada'",
        }
    ),

    // assignedUsers: opcional  arreglo de numeros (IDs de usuarios)
    // Si viene, debe ser un arreglo y cada elemento debe ser un numero entero positivo
    assignedUsers: z
        .array(
            z.number({
                invalid_type_error: 'Cada ID de usuario debe ser un número',
            }).int('Los IDs de usuario deben ser números enteros')
              .positive('Los IDs de usuario deben ser números positivos'),
            { invalid_type_error: 'assignedUsers debe ser un arreglo' }
        )
        .optional(),

    // grade: nota numerica del instructor (0-100)  opcional, solo instructores
    grade: z
        .number({ invalid_type_error: 'La nota debe ser un número' })
        .min(0,   'La nota mínima es 0')
        .max(100, 'La nota máxima es 100')
        .nullable()
        .optional(),

    // gradeReason: motivo de la edicion de nota  requerido cuando se envia grade
    gradeReason: z
        .string({ invalid_type_error: 'El motivo debe ser una cadena de texto' })
        .optional(),

    // changeReason: justificacion cuando el instructor cambia estado sin calificar
    changeReason: z
        .string({ invalid_type_error: 'El motivo debe ser una cadena de texto' })
        .optional(),

    // resetGrade: flag para reiniciar la calificacion con justificacion obligatoria
    resetGrade: z.boolean().optional(),

    // justificacion: texto obligatorio cuando resetGrade es true
    justificacion: z
        .string({ invalid_type_error: 'La justificación debe ser una cadena de texto' })
        .optional(),
});

// Esquema para ACTUALIZAR una tarea completa  PUT /api/tasks/:id
// Igual que createTaskSchema pero todos los campos son opcionales (partial)
export const updateTaskSchema = createTaskSchema.partial();

// Esquema para CAMBIAR solo el estado  PATCH /api/tasks/:id/status
export const updateTaskStatusSchema = z.object({
    status: z.enum(
        ESTADOS_VALIDOS,
        {
            required_error: 'El estado es obligatorio',
            message:        "El estado debe ser: 'pendiente', 'en_progreso', 'pendiente_aprobacion', 'completada' o 'reprobada'",
        }
    ),
});

// Esquema para ASIGNAR usuarios a una tarea  POST /api/tasks/:taskId/assign
// userIds debe ser un arreglo con al menos un ID numerico
export const assignUsersSchema = z.object({
    userIds: z
        .array(
            z.number({
                invalid_type_error: 'Cada ID debe ser un número',
            }).int('Los IDs deben ser números enteros')
              .positive('Los IDs deben ser números positivos'),
            { invalid_type_error: 'userIds debe ser un arreglo' }
        )
        .min(1, 'Debes enviar al menos un ID de usuario'),
});