document.addEventListener('DOMContentLoaded', () => {
	// --- DEBUG: Versión del editor ---
	window.PODCAST_EDITOR_VERSION = 'editor-v2.3.0';
	console.log('PODCAST_EDITOR_VERSION:', window.PODCAST_EDITOR_VERSION);
	// --- VARIABLES GLOBALES DEL EDITOR DE SONIDO ---
	window.editorWaveSurfer = null;
	window.editorClipboard = null;
	window.editorCurrentBuffer = null;
	window.editorCurrentBlob = null;
	window.editorSelection = {start: 0, end: 1};

    // --- Inicialización ---
    initAudioDB();
    // Refrescar la lista del editor al cargar por primera vez
    setTimeout(populateEditorRecordings, 500);
});
