# Guía de Metodología: Commits Convencionales

En nuestra Software Factory, no guardamos el código "porque sí". Cada
`git commit` crea un punto en la historia del proyecto. Para mantener
ese historial limpio y profesional, usamos **Conventional Commits**.

---

## La Estructura

```
tipo(alcance): descripción breve
```

- **Tipo:** ¿Qué clase de trabajo hiciste?
- **Alcance (opcional):** ¿Qué parte del backend tocaste? *(model, controller, routes, app)*
- **Descripción:** Frase corta en minúsculas, tiempo presente imperativo.

---

## Los Tipos Permitidos

| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Agregaste una nueva funcionalidad |
| `fix` | Solucionaste un error o bug |
| `docs` | Cambios exclusivos en documentación |
| `style` | Formato, espacios, puntos y coma (no afecta lógica) |
| `refactor` | Mejoraste código sin agregar ni arreglar nada |
| `chore` | Mantenimiento, dependencias, configuración del entorno |

---

## Ejemplos Reales

### ❌ El Novato (Prohibido)

```bash
git commit -m "arregle el modelo"
git commit -m "subiendo la tarea de hoy"
git commit -m "cambios en rutas y controlador y model"
git commit -m "x"
```

### ✅ El Profesional (Obligatorio)

```bash
git commit -m "feat(model): crear userModel con operaciones CRUD en memoria"
git commit -m "fix(controller): corregir validacion de campos en createUser"
git commit -m "docs: actualizar README con tabla de endpoints"
git commit -m "chore: agregar nodemon a dependencias de desarrollo"
```

---

## Conexión con Issues

Si estás resolviendo la **Issue #8**, referencia el número al final:

```bash
git commit -m "feat(routes): crear taskRoutes con los 11 endpoints (#8)"
```

---

## Regla de Oro

> *Tu código dice CÓMO hace las cosas el servidor, pero tus commits
> dicen POR QUÉ se hicieron. Si en un mes no entiendes tu propio
> historial, no aplicaste Conventional Commits.*
