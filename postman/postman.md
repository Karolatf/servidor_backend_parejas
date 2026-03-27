# 📬 Postman — Colección del Proyecto

Este directorio contiene la colección de Postman con todos los endpoints del sistema de gestión de tareas.

---

## 📁 Archivos

| Archivo | Descripción |
|---|---|
| `SISTEMA_GESTIÓN_DE_TAREAS.postman_collection.json` | Colección con todos los endpoints de usuarios y tareas |

> Las variables de entorno **no se comparten** aquí. Cada colaborador usa su propio archivo `.env` local.

---

## 🚀 Cómo importar la colección

1. Abre **Postman**
2. Clic en **Import** (esquina superior izquierda)
3. Arrastra el archivo `SISTEMA_GESTIÓN_DE_TAREAS.postman_collection.json` o búscalo desde el explorador
4. Clic en **Import** para confirmar
5. La colección aparecerá en tu panel izquierdo bajo **Collections**

---

## ⚙️ Configurar tu variable de entorno

> ⚠️ Los requests tienen la URL base fija como `http://localhost:3000`. Si tu servidor corre en un puerto diferente, deberás cambiar ese valor manualmente en cada request.

### Pasos:

1. En Postman, clic en el selector de environments (arriba a la derecha, dice **No environment**)
2. Clic en **+ Add** → ponle un nombre, por ejemplo `Local`
3. Agrega la siguiente variable:

| Variable | Current value |
|---|---|
| `base_url` | `http://localhost:3000` |

4. Selecciona el environment `Local` en el selector
5. Asegúrate de que tu servidor backend esté corriendo antes de lanzar cualquier request

> 💡 Llena siempre el campo **Current value**, no el Initial value. El Current value es solo local y nunca se exporta.

---

## 🗂️ Endpoints disponibles

### 🌐 General
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Mensaje de bienvenida |

### 👤 Usuarios `/api/users`
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/users` | Obtener todos los usuarios |
| GET | `/api/users/:id` | Obtener usuario por ID |
| POST | `/api/users` | Crear nuevo usuario |
| PUT | `/api/users/:id` | Actualizar usuario |
| DELETE | `/api/users/:id` | Eliminar usuario |

**Body para POST:**
```json
{
  "documento": "1234567897",
  "name": "Nombre Apellido",
  "email": "correo@ejemplo.com"
}
```

**Body para PUT:**
```json
{
  "name": "Nombre Actualizado",
  "email": "nuevo@correo.com"
}
```

---

### ✅ Tareas `/api/tasks`
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/tasks` | Obtener todas las tareas |
| GET | `/api/tasks/:id` | Obtener tarea por ID |
| POST | `/api/tasks` | Crear nueva tarea |
| PUT | `/api/tasks/:id` | Actualizar tarea |
| DELETE | `/api/tasks/:id` | Eliminar tarea |

**Body para POST:**
```json
{
  "title": "Título de la tarea",
  "description": "Descripción de la tarea",
  "status": "pendiente",
  "assignedUsers": [1, 2, 3]
}
```

**Body para PUT:**
```json
{
  "title": "Título actualizado",
  "status": "en_progreso"
}
```

> Los valores válidos para `status` son: `pendiente`, `en_progreso`, `completada`

---

## 🔄 Mantener la colección actualizada

Cuando se añadan endpoints nuevos al proyecto:

1. El responsable exporta la colección actualizada desde Postman:
   - Clic derecho sobre la colección → **Export** → **Collection v2.1**
2. Reemplaza el archivo `.json` en este directorio
3. Haz commit y push al repositorio
4. Los demás colaboradores vuelven a importar el archivo actualizado

---

## ❓ Problemas comunes

**Los requests dan error de conexión**
→ Verifica que tu servidor local esté corriendo en el puerto `3000` con `node index.js` o `npm run dev`.

**Error `Cannot GET /api/...`**
→ Revisa que la ruta esté bien escrita y que el servidor esté levantado.

**Error `500` o falla de base de datos**
→ Verifica que tu archivo `.env` tenga los datos correctos de conexión a MySQL y que el servidor de MySQL esté activo.