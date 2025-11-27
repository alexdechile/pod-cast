# Bitácora de desarrollo: pod-cast (grabador y playlist)

## Resumen

Esta bitácora documenta el desarrollo del grabador de audio y playlist para la aplicación pod-cast, orientada a podcasting y producción de audio.

## Técnicas y decisiones implementadas

- **Maquetado y UI**: Se utilizó Bootstrap 5, Font Awesome y Google Fonts (Anton y Montserrat) para un dashboard moderno, oscuro y con detalles metálicos. El diseño es responsivo y visualmente atractivo.
- **Grabador de audio**: Se implementó usando la API Web MediaRecorder, permitiendo grabar, pausar/reanudar y detener la grabación. El flujo de grabación es intuitivo y los controles se actualizan dinámicamente.
- **Compresión de audio**: Se añadió un botón para activar/desactivar compresión en tiempo real usando DynamicsCompressorNode de la Web Audio API. Esto mejora la calidad y uniformidad del audio grabado.
- **Visualización de onda**: Durante la grabación se muestra la onda en tiempo real usando un canvas y AnalyserNode. Al reproducir grabaciones, se utiliza WaveSurfer.js para mostrar la forma de onda y permitir navegación visual.
- **Playlist y almacenamiento**: Las grabaciones se almacenan en IndexedDB bajo el nombre de la app. Cada grabación puede ser renombrada, eliminada y reproducida desde la interfaz. Los nombres por defecto son fecha y hora.
- **Modal de permisos**: Por políticas de navegador, el acceso al micrófono se solicita tras una acción explícita del usuario, usando un modal Bootstrap para UX clara.
- **Código limpio y modular**: Todo el código está en archivos separados (`index.html`, `app.js`, `style.css`, `config.js`). No quedan restos de código anterior ni carpetas innecesarias.

## Recomendaciones para desarrolladores

- Mantener la lógica de compresión y grabación desacoplada para futuras mejoras (por ejemplo, agregar efectos o filtros adicionales).
- Si se requiere exportar a otros formatos, considerar el uso de bibliotecas externas para conversión.
- La UI es fácilmente extensible para agregar más controles o paneles.
- El backup de la app debe realizarse antes de cambios mayores.

## Estado actual

El grabador y playlist están listos para pruebas y uso real. El código es mantenible y preparado para futuras extensiones.
