# Análisis de Redundancia — Controladores del Backend

**Proyecto:** Sistema de Gestión de Tareas — servidor_backend_parejas  
**Autores:** Karol Torres, Sebastián Patiño, Paulo Zapata  
**SENA — Técnico en Programación de Software — Abril 2026**  
**Guía:** Optimización Arquitectónica y Estandarización de Servicios

---

## 1. Objetivo del Análisis

Identificar el porcentaje de código repetitivo en los controladores
del proyecto antes de aplicar el principio DRY, como evidencia del
problema que justifica la refactorización implementada en este hito.

El principio DRY (Don't Repeat Yourself) establece que si una lógica
se repite en múltiples lugares del código, debe centralizarse en un
único punto de control. Este documento demuestra cuántas veces se
repetía la misma lógica de manejo de errores y de formato de respuesta
antes de la refactorización.

---

## 2. Análisis de users.controller.js (antes de refactorizar)

### Bloques try/catch encontrados

| Función            | Tenía try/catch | Líneas de respuesta manual |
|:-------------------|:---------------:|:--------------------------:|
| getUsers           | Sí              | 2                          |
| getUserById        | Sí              | 3                          |
| createUser         | Sí              | 3                          |
| updateUser         | Sí              | 3                          |
| deleteUser         | Sí              | 3                          |
| getUserByDocumento | Sí              | 3                          |
| getUserTasks       | Sí              | 2                          |
| **Total**          | **7 bloques**   | **19 líneas**              |

### Estimación de redundancia

- Total de líneas del archivo original: aproximadamente 100
- Líneas dedicadas a try/catch y res.status().json(): aproximadamente 42
- **Porcentaje de código repetitivo: ~42%**

---

## 3. Análisis de tasks.controller.js (antes de refactorizar)

### Bloques try/catch encontrados

| Función            | Tenía try/catch | Líneas de respuesta manual |
|:-------------------|:---------------:|:--------------------------:|
| getTasks           | Sí              | 2                          |
| getTaskById        | Sí              | 3                          |
| createTask         | Sí              | 3                          |
| updateTask         | Sí              | 3                          |
| deleteTask         | Sí              | 3                          |
| updateTaskStatus   | Sí              | 4                          |
| assignUsersToTask  | Sí              | 4                          |
| getAssignedUsers   | Sí              | 3                          |
| removeUserFromTask | Sí              | 3                          |
| filterTasks        | Sí              | 2                          |
| getDashboard       | Sí              | 3                          |
| **Total**          | **11 bloques**  | **33 líneas**              |

### Estimación de redundancia

- Total de líneas del archivo original: aproximadamente 160
- Líneas dedicadas a try/catch y res.status().json(): aproximadamente 66
- **Porcentaje de código repetitivo: ~41%**

---

## 4. Comparación Antes vs Después

| Métrica                                 | Antes           | Después        |
|:----------------------------------------|:---------------:|:--------------:|
| Bloques try/catch totales               | 18              | 0              |
| Líneas de respuesta manual              | 52              | 0              |
| Archivos que manejan errores            | 2 controladores | 1 middleware   |
| Formato de respuesta definido en        | cada función    | 1 archivo util |
| Puntos de cambio si cambia el formato   | 18              | 1              |

---

## 5. Archivos nuevos implementados como solución

### src/utils/response.util.js

Centraliza el formato de respuesta. Exporta `successResponse` y
`errorResponse`. Antes de este archivo, cada controlador definía
su propio JSON de respuesta. Ahora todos usan el mismo contrato:
`{ success: boolean, message: string, data: any }`.

### src/utils/catchAsync.js

Función envolvente que elimina los bloques try/catch de los
controladores. Captura cualquier error async y lo pasa automáticamente
al middleware global mediante `next(error)`.

### src/middlewares/error.middleware.js

Middleware registrado al final de `app.js` que captura todos los
errores que llegan por `next(error)`. Responde con el formato estándar
sin que ningún controlador tenga que manejar el error manualmente.

---

## 6. Conclusión

Antes de la refactorización, el **41% promedio** del código de los
controladores era repetitivo y no tenía relación con la lógica de
negocio. Cada función definía su propio manejo de errores y su propio
formato de respuesta de forma independiente.

Con la implementación de `catchAsync.js`, `response.util.js` y
`error.middleware.js`, ese código repetitivo se centralizó en un único
punto de control. Ahora si el formato de respuesta cambia, solo se
modifica un archivo en lugar de 18 funciones distribuidas en 2
controladores.

Esto aplica directamente el principio DRY (Don't Repeat Yourself)
exigido por la guía de Optimización Arquitectónica, y demuestra que
la refactorización no cambió el comportamiento externo del sistema
sino que mejoró su estructura interna, reduciendo la deuda técnica
del proyecto.
