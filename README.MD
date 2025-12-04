---

# 📝 Notion Clone - AI Menu Edition

Este proyecto es una réplica funcional y ligera de la interfaz de **Notion**, desarrollada con tecnologías web estándar. Se centra en la experiencia de edición por bloques, la gestión de páginas en una barra lateral y simula el famoso **Menú de Comandos (Slash Menu)** con opciones de Inteligencia Artificial.

![Notion Clone Preview](https://via.placeholder.com/800x400?text=Vista+Previa+del+Proyecto) *(Puedes reemplazar esto con una captura real)*

## ✨ Características Principales

### 🔐 Autenticación y Persistencia
- **Login y Registro:** Sistema completo de autenticación contra una API externa.
- **Sesiones:** Mantiene la sesión activa mediante `localStorage` (Token JWT).
- **Sincronización:** Los cambios en el título y el contenido se guardan automáticamente (Auto-save) en la base de datos remota.

### ✍️ Editor de Texto por Bloques
- **Block-Based Editor:** Cada párrafo es un bloque independiente (`div` contenteditable).
- **Creación Dinámica:** Pulsa `Enter` para crear un nuevo bloque, `Backspace` para borrar bloques vacíos.
- **Drag & Drop:** Reordenamiento de bloques arrastrando desde el icono de control (⋮⋮) a la izquierda de cada bloque.

### 🤖 Slash Menu & Simulación de IA
- **Comando `/`:** Al escribir una barra diagonal al inicio de un bloque, se despliega un menú contextual flotante.
- **Navegación por Teclado:** Usa las flechas `Arriba/Abajo` y `Enter` para seleccionar opciones.
- **Opciones de IA:**
  - `Traduce al`: Simula una traducción.
  - `Continuar redactando`: Genera texto de relleno simulado.
  - `Hacer una pregunta`: Simula una respuesta de asistente.

### 🎨 Interfaz de Usuario (UI/UX)
- **Diseño Oscuro (Dark Mode):** Estilo visual idéntico al modo oscuro de Notion (`#191919`).
- **Sidebar Colapsable:** Barra lateral responsive para gestionar páginas.
- **Responsive:** Adaptado para funcionar en escritorio y dispositivos móviles (menú hamburguesa).
- **Tailwind CSS:** Estilizado utilizando clases de utilidad para un desarrollo rápido y limpio.

## 🛠️ Tecnologías Utilizadas

- **HTML5:** Estructura semántica.
- **CSS3:**
  - **Tailwind CSS (CDN):** Framework principal de estilos.
  - **CSS Custom:** Para scrollbars personalizados y lógica específica del editor.
- **JavaScript (Vanilla ES6+):**
  - Manejo del DOM.
  - `fetch` API para comunicación con el backend.
  - Lógica de Drag and Drop nativa.
- **Backend:** Conecta con `https://notion-back.vercel.app/api` (API REST).

## 🚀 Instalación y Uso

No requieres instalar dependencias de Node.js, ya que usa Tailwind vía CDN.

1. **Clonar o Descargar:**
   Descarga los archivos `index.html`, `style.css` y `script.js` en una misma carpeta.

2. **Ejecutar:**
   Simplemente abre el archivo `index.html` en tu navegador web preferido.
   
   > **Recomendación:** Para evitar problemas de CORS o carga de módulos (si se expandiera en el futuro), se recomienda usar una extensión como "Live Server" en VS Code o correr un servidor local simple con Python:
   > ```bash
   > python3 -m http.server
   > ```

3. **Primeros Pasos:**
   - Si no tienes cuenta, haz clic en **"Regístrate"** en el modal inicial.
   - Crea una nueva página desde la barra lateral.
   - Escribe `/` en el editor para probar el menú de comandos.

## 📂 Estructura del Proyecto

```text
.
├── index.html      # Estructura DOM, Modal de Auth, Layout Principal
├── style.css       # Estilos específicos (Scrollbars, cursores, overrides)
├── script.js       # Lógica de negocio, API, Eventos del Editor
└── README.md       # Documentación del proyecto
```

## ⚠️ Notas sobre la API

El proyecto está configurado para conectarse a:
`const API_URL = "https://notion-back.vercel.app/api";`

*Nota: Esta es una API de demostración. Si el servicio se encuentra inactivo, las funciones de registro, login y guardado no funcionarán correctamente. El frontend manejará errores 401/403 cerrando la sesión.*

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Si deseas mejorar la simulación de IA o añadir tipos de bloques (H1, Listas, Imágenes), siéntete libre de hacer un fork.

1. Fork el proyecto
2. Crea tu rama de características (`git checkout -b feature/NuevaCaracteristica`)
3. Commit a tus cambios (`git commit -m 'Añadir nueva característica'`)
4. Push a la rama (`git push origin feature/NuevaCaracteristica`)
5. Abre un Pull Request

---

**Desarrollado con fines educativos.**
