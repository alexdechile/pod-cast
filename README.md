# pod-cast: Grabador de Audio

"pod-cast" es una aplicación web diseñada para la grabación, edición simple y gestión de audio.

## Características Principales

- **Grabador de Audio Avanzado**: Permite grabar audio desde el micrófono con opciones para pausar, reanudar y detener.
- **Compresión en Tiempo Real**: Incluye una opción para activar un compresor (DynamicsCompressorNode) que mejora la calidad y consistencia del audio.
- **Visualización de Onda**: Muestra la forma de onda del audio en tiempo real durante la grabación (usando Canvas) y para las pistas guardadas (usando WaveSurfer.js).
- **Playlist Local**: Las grabaciones se guardan automáticamente en el navegador usando IndexedDB. Desde la playlist, puedes reproducir, renombrar y eliminar tus clips de audio.
- **Editor de Sonido**: Ofrece funcionalidades básicas de edición como aplicar efectos (robot, eco, pitch), normalizar, filtrar y más.
- **Interfaz Moderna**: Construida con Bootstrap 5 y un diseño oscuro, responsivo y fácil de usar.

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla).
- **APIs Web**:
    - `MediaRecorder`: para la grabación de audio.
    - `Web Audio API`: para efectos, compresión y visualización.
    - `IndexedDB`: para el almacenamiento local de las grabaciones.
- **Librerías**:
    - [Bootstrap 5](https://getbootstrap.com/): para la estructura y componentes de la UI.
    - [Font Awesome](https://fontawesome.com/): para los iconos.
    - [WaveSurfer.js](https://wavesurfer-js.org/): para la visualización de formas de onda.

## Cómo Empezar

1.  **Clona el repositorio**:
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd pod-cast
    ```
2.  **Abre `index.html`**:
    - Simplemente abre el archivo `index.html` en tu navegador web. No se requiere un servidor de desarrollo, aunque es recomendable para evitar problemas con algunas APIs.

## Despliegue en Cloudflare Pages

Este proyecto es un sitio estático y puede ser desplegado fácilmente en Cloudflare Pages.

1.  Sube este repositorio a tu cuenta de GitHub o GitLab.
2.  En tu dashboard de Cloudflare, ve a `Workers & Pages`.
3.  Haz clic en `Create application` > `Pages` > `Connect to Git`.
4.  Selecciona tu repositorio.
5.  Para la configuración de construcción (`Build settings`), no necesitas especificar ningún comando de construcción. Puedes dejarlo en blanco o usar un preset de "Static HTML". El directorio de salida es la raíz (`/`).
6.  Haz clic en `Save and Deploy`.

Cloudflare desplegará automáticamente tu sitio y te proporcionará una URL.
