# Autores: Karol Nicolle Torres Fuentes | Juan Sebastián Patiño Hernández
# Proyecto: Backend para el Sistema de Gestión de Tareas

# Análisis Técnico - Backend Servidor Parejas

## ¿Por qué separar las rutas en archivos independientes?

Cada archivo de rutas tiene una responsabilidad única: `users.routes.js` maneja todo lo relacionado con usuarios y `tasks.routes.js` con tareas. Esto permite modificar, depurar o ampliar una ruta sin afectar las demás, haciendo el código más limpio y fácil de mantener.

## ¿Qué ventajas tiene pensar en modularización desde el inicio?

Modularizar desde el inicio permite que el proyecto escale sin volverse caótico. Cuando se agreguen controladores, middlewares o conexión a base de datos, cada pieza tendrá su lugar definido. También facilita el trabajo en equipo, ya que cada integrante puede trabajar en un módulo sin generar conflictos con el otro.

## ¿Cómo facilitará esta estructura la conexión futura con el frontend?

El frontend consumirá endpoints claros como `GET /users` o `POST /tasks`. Al tener las rutas organizadas por recurso, es sencillo identificar qué endpoints existen, documentarlos y conectarlos con las peticiones HTTP del frontend sin confusión.

## ¿Qué problemas se presentarían sin una buena organización desde el inicio?

Un proyecto desorganizado crece de forma difícil de controlar: rutas mezcladas en un solo archivo, lógica duplicada, errores difíciles de rastrear y conflictos constantes al trabajar en equipo. Refactorizar un proyecto desordenado en etapas avanzadas consume mucho más tiempo que estructurarlo bien desde el principio.