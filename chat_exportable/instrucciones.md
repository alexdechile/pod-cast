
# Instrucciones de Integración del Chat de Marketing (Gemini)

**Fecha de Exportación:** 21 de agosto de 2025

Este paquete contiene los archivos necesarios para integrar un asistente de chat de marketing, impulsado por la API de Gemini, en un proyecto web.

## Archivos Incluidos

- `index.html`: Contiene la estructura HTML base y los elementos de la interfaz del chat.
- `style.css`: Define los estilos para la interfaz del chat, burbujas de mensajes, etc.
- `app.js`: Contiene toda la lógica de la aplicación, incluyendo la interacción con el DOM y las llamadas a la API de Gemini.
- `config.js`: Archivo para configurar la clave de la API.

---

## 1. Requisitos Previos

- **Clave de API de Gemini:** Debes tener una clave de API válida de Google AI Studio.
- **Servidor web local:** Dado que el navegador puede bloquear las solicitudes `fetch` a archivos locales por políticas de CORS, se recomienda servir estos archivos desde un servidor web simple. Puedes usar `http-server` de Node.js, `python -m http.server`, o la extensión "Live Server" de VSCode.

---

## 2. Pasos de Integración

### Paso 2.1: Configurar la API Key

1.  Abre el archivo `config.js`.
2.  Reemplaza el valor `'TU_API_KEY_AQUI'` con tu clave de API de Gemini.

    ```javascript
    // config.js
    const GEMINI_API_KEY = 'AQUI_VA_TU_CLAVE_REAL';
    ```

### Paso 2.2: Integrar el HTML

1.  Copia los archivos `app.js`, `style.css` y `config.js` a la carpeta de tu proyecto.
2.  En tu archivo HTML principal, identifica la sección donde deseas que aparezca el chat.
3.  Copia la siguiente estructura HTML de `index.html` y pégala en tu archivo:

    ```html
    <!-- Panel Derecho: Asistente IA -->
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">
                <h3><i class="bi bi-robot"></i> Asistente de Marketing</h3>
            </div>
            <div class="card-body d-flex flex-column">
                <div id="chat-messages" class="flex-grow-1 mb-3" style="overflow-y: auto;">
                    <!-- Los mensajes del chat aparecerán aquí -->
                    <div class="chat-bubble ai-bubble">¡Hola! Soy tu asistente de marketing.</div>
                </div>
                <form id="chat-form" class="mt-auto">
                    <div class="input-group">
                        <input type="text" id="chat-input" class="form-control" placeholder="Escribe tu mensaje aquí..." autocomplete="off">
                        <button class="btn btn-primary" type="submit" id="send-button">
                            <i class="bi bi-send-fill"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    ```

    **Nota:** Este HTML depende de **Bootstrap 5** y **Bootstrap Icons**. Asegúrate de que tu proyecto los tenga referenciados.

### Paso 2.3: Vincular CSS y JavaScript

En tu archivo HTML principal, asegúrate de incluir las siguientes etiquetas:

1.  **CSS (dentro de `<head>`):**
    ```html
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="ruta/a/tu/style.css">
    ```

2.  **JavaScript (al final de `<body>`):**
    ```html
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script> <!-- Para renderizar Markdown -->
    <script src="ruta/a/tu/config.js"></script>
    <script src="ruta/a/tu/app.js"></script>
    ```
    **Importante:** El orden de los scripts es crucial. `config.js` debe cargarse antes que `app.js`.

---

## 3. Personalización (Opcional)

- **Prompt del Asistente:** La lógica del prompt que se envía a Gemini se encuentra en la función `getAiResponse` dentro de `app.js`. Puedes modificar el `taskPrompt` para adaptar el comportamiento del asistente a tus necesidades.
- **Estilos:** Todos los estilos son personalizables en `style.css`. Las clases principales son `.chat-bubble`, `.ai-bubble`, y `.user-bubble`.
