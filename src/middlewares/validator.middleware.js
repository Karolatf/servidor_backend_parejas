// MÓDULO: middlewares/validator.middleware.js
// CAPA: Middleware
//
// Responsabilidad única: recibir un esquema de Zod y devolver un middleware
// que valide req.body contra ese esquema antes de que llegue al controlador.
//
// Por qué un middleware genérico y no uno por ruta:
//   Si hiciéramos un middleware por cada endpoint, tendríamos cientos de if
//   duplicados y el código sería imposible de mantener. Este middleware
//   recibe cualquier esquema y lo aplica — es el "guardia universal".
//
// Flujo de una petición con este middleware:
//   Cliente → Ruta → validateSchema(esquema) → Controlador
//                          ↓ si falla
//                    400 Bad Request con lista de errores

// validateSchema es una función de orden superior (Higher-Order Function):
// recibe un esquema y retorna un middleware (req, res, next).
// Parámetro: schema — cualquier esquema creado con z.object() de Zod
export const validateSchema = (schema) => {
    return (req, res, next) => {

        // safeParse intenta validar req.body sin lanzar excepciones.
        // Retorna { success: true, data } o { success: false, error }
        const result = schema.safeParse(req.body);

        // Si la validación falló, se construye la lista de errores
        if (!result.success) {

            // result.error.issues es un arreglo con cada campo que falló.
            // Se mapea para extraer el campo afectado y el mensaje en español.
            const structuredErrors = result.error.issues.map((issue) => {

                let finalMessage = issue.message;

                // Zod escribe "Required" en inglés cuando un campo no llega.
                // Se reemplaza por un mensaje en español más claro.
                if (finalMessage.includes('received undefined') || finalMessage === 'Required') {
                    finalMessage = 'Este campo es obligatorio';
                }

                return {
                    // issue.path[0] es el nombre del campo que falló (ej: "title")
                    // Si path está vacío es un error del body completo
                    field:   issue.path.length > 0 ? issue.path[0] : 'body',
                    message: finalMessage,
                };
            });

            // Se crea un objeto Error con los detalles para pasarlo al
            // middleware global de errores mediante next()
            const validationError = new Error('Error de validación en los datos enviados');
            validationError.statusCode = 400;
            validationError.errors     = structuredErrors;

            // Se responde directamente con 400 y la lista de errores.
            // No se llama next(validationError) porque error.middleware.js
            // no maneja el campo 'errors' — respondemos aquí directamente.
            return res.status(400).json({
                success: false,
                message: validationError.message,
                data:    structuredErrors,
            });
        }

        // Si la validación fue exitosa, result.data contiene los datos
        // limpios y transformados por Zod (sin campos extra no declarados).
        // Se reemplaza req.body para que el controlador reciba datos seguros.
        req.body = result.data;

        // Se llama next() sin argumentos para que Express continúe
        // hacia el controlador
        next();
    };
};