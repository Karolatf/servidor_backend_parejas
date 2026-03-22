# Cómo usar la Plantilla de Requerimientos (Issues)

En este proyecto no tiramos código al azar. Usamos **Issues** para
planificar, porque un programador que no planea, trabaja el doble.

---

## 1. El Título: Tu etiqueta de identificación

- **Formato:** `[FEAT]: nombre de la tarea`
- **Ejemplo:** `[FEAT]: Crear userModel con operaciones CRUD en memoria`
- **Tipos:** `FEAT` (funcionalidad), `BUG` (error), `DOCS`
  (documentación), `CHORE` (mantenimiento)

---

## 2. Descripción: El "Para qué"

Usa el formato de Historia de Usuario:

> *"Como desarrollador, quiero crear el modelo de usuarios para que el
> controlador pueda hacer operaciones CRUD sin tocar los datos directamente."*

---

## 3. Criterios de Aceptación

Define qué se considera "trabajo terminado y bien hecho":

- [ ] La funcionalidad cumple con la arquitectura MVC del proyecto.
- [ ] No existen errores en la consola del servidor.
- [ ] El código respeta la separación de capas (model / controller / routes).
- [ ] Se probaron los endpoints en Postman o Thunder Client.

---

## 4. Tareas Técnicas

Divide el problema en pasos pequeños:

1. [ ] Identificar en qué capa impacta el cambio.
2. [ ] Implementar la lógica en la capa correspondiente.
3. [ ] Realizar pruebas locales con el servidor corriendo.
4. [ ] Verificar que no se rompió ningún endpoint existente.

---

## 5. El comando mágico: `Closes #ID`

Al terminar tu trabajo y abrir el Pull Request, escribe en la
descripción: `Closes #5` (usa el número de tu Issue).

GitHub cerrará tu tarea automáticamente cuando el Líder apruebe el PR.

---

> *Un buen desarrollador dedica el 20% del tiempo a planear y el 80%
> a ejecutar. Llenar bien una Issue es ese 20% que garantiza el éxito.*
