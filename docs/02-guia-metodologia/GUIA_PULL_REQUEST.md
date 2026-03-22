# Cómo pedir una revisión de código (Pull Request)

El PR es el documento de entrega de tu trabajo. No puedes simplemente
decir "ya acabé"; debes demostrar que seguiste los estándares, que el
código es limpio y que no rompiste nada.

---

## 1. Descripción del Cambio

Explica claramente qué hiciste y por qué es necesario.

- ❌ *"arreglé el código"*
- ✅ *"Creé el userModel con las funciones getAllUsers, getUserById,
  createUser, updateUser y deleteUser operando sobre un arreglo en
  memoria. Esto permite que el controlador opere sobre los datos sin
  conocer su estructura interna."*

---

## 2. Tipo de Cambio

Marca solo la opción que corresponda en la plantilla del PR.

---

## 3. Relación con Tareas

Escribe `Closes #ID` en la descripción del PR para que GitHub cierre
la Issue automáticamente al aprobar el merge.

---

## 4. Checklist de Calidad

Antes de enviar el PR, revisa honestamente:

- ¿Hiciste `git pull origin release` y resolviste conflictos?
- ¿Eliminaste todos los `console.log` de prueba?
- ¿Tus funciones tienen comentarios JSDoc?
- ¿Probaste todos los endpoints en Postman o Thunder Client?

---

## 5. Evidencia de Trabajo

Adjunta capturas del JSON de respuesta de tus endpoints en Postman.
Es la prueba de que tu código funciona antes de que el Líder lo revise.

---

## 6. Análisis de Impacto

Informa si tu cambio afecta a tus compañeros.

- *"Agregué la función `getTasksByUserId` al taskModel. El controlador
  de usuarios la necesita para el endpoint `GET /api/users/:userId/tasks`."*

---

## Regla de Oro

> *Si tú no estás orgulloso de tu PR, no lo envíes todavía. Un PR
> bien documentado habla mejor de ti que cualquier diploma.*
