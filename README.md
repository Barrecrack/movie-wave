# 🎬 Movie Wave

**Movie Wave** es una aplicación web moderna que combina el poder de **Supabase**, **Pexels API** y **Brevo API** para ofrecer una experiencia interactiva de búsqueda, autenticación y gestión de contenido multimedia.  
El proyecto cuenta con un backend desarrollado en **Node.js (Express + TypeScript)** con un middleware de seguridad **CORS** personalizado y conexión segura con el frontend.

---

## 🚀 Descripción del Proyecto

Movie Wave permite a los usuarios:
- Autenticarse mediante un sistema seguro basado en **Supabase Auth**.
- Buscar videos e imágenes utilizando la **API de Pexels**.
- Guardar y gestionar sus contenidos favoritos.
- Comunicarse con servicios externos como **Brevo** para funcionalidades futuras (notificaciones, emails, etc.).

Todo esto con una arquitectura modular, limpia y segura, siguiendo buenas prácticas de desarrollo backend.

---

## 🧩 Tecnologías Utilizadas

| Tipo | Tecnología |
|------|-------------|
| **Backend** | Node.js, Express, TypeScript |
| **Autenticación y Base de Datos** | Supabase |
| **APIs Externas** | Pexels API, Brevo API |
| **Seguridad** | Middleware CORS personalizado |
| **Entorno** | dotenv |
| **Frontend (conectado)** | React + Vite 

---

## ⚙️ Estructura del Proyecto

📂 movie-wave/
│
├── 📁 src/
│ ├── 📁 middlewares/
│ │ └── cors.ts # Middleware CORS con validación dinámica de orígenes
│ ├── 📁 routes/
│ │ ├── authRoutes.ts # Rutas de autenticación (login, registro)
│ │ ├── videosRoutes.ts # Rutas para búsqueda de videos desde Pexels API
│ │ └── favoriteRoutes.ts # Rutas para gestión de favoritos
│ ├── index.ts # Configuración principal del servidor Express
│ └── supabaseClient.ts # Conexión y configuración de Supabase
│
├── .env # Variables de entorno (no se sube al repositorio)
├── package.json
├── tsconfig.json
└── README.md


---

## 🔧 Variables de Entorno

Antes de ejecutar el proyecto, crea un archivo `.env` en la raíz con el siguiente contenido:

```bash
PORT=3000
FRONTEND_URL=http://localhost:5173
VITE_SUPABASE_URL=https://tusupabaseurl.supabase.co
SERVICE_ROLE_KEY=tu_service_role_key
PEXELS_API_KEY=tu_pexels_api_key
BREVO_API_KEY=tu_brevo_api_key


▶️ Ejecución del Proyecto

 Instalar dependencias

npm install


 Compilar el proyecto (TypeScript → JavaScript)

npm run build


 Ejecutar el servidor

npm run start


 Modo desarrollo (con nodemon)

npm run dev

🔍 Rutas Disponibles
Método	Ruta	Descripción
GET	/	Verifica el estado del servidor
GET	/debug	Muestra variables de entorno activas (modo seguro)
POST	/api/register	Registro de usuarios en Supabase
POST	/api/login	Inicio de sesión de usuarios
GET	/videos/search	Búsqueda de videos mediante la API de Pexels
GET	/api/favorites	Obtener lista de favoritos del usuario
POST	/api/favorites	Agregar un nuevo favorito
DELETE	/api/favorites/:id	Eliminar un favorito por ID

👨‍💻 Autor

Gean Franco Muñoz Toro
Proyecto académico y demostrativo — 2025
💻 Desarrollado con Node.js + Supabase + TypeScript

📜 Licencia

Este proyecto está licenciado bajo la MIT License.
Puedes usarlo, modificarlo y distribuirlo libremente con atribución al autor.