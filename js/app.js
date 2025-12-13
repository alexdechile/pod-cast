document.addEventListener('DOMContentLoaded', () => {
	// --- DEBUG: Versión del editor ---
	window.PODCAST_EDITOR_VERSION = 'editor-v2.3.0';
	console.log('PODCAST_EDITOR_VERSION:', window.PODCAST_EDITOR_VERSION);
	// --- VARIABLES GLOBALES DEL EDITOR DE SONIDO ---
	window.editorWaveSurfer = null;
	window.editorClipboard = null;
	window.editorCurrentBuffer = null;
	window.editorCurrentBlob = null;
	window.editorSelection = { start: 0, end: 1 };

	// --- NUEVO MOTOR DE AUDIO (CORE) ---
	window.audioEngine = new window.EditorCore.AudioEngine();
	window.editorProject = new window.EditorCore.EditorProject();

	// --- Inicialización ---
	initAudioDB();
	// Refrescar la lista del editor al cargar por primera vez
	setTimeout(populateEditorRecordings, 500);

	// Mostrar modal de permisos automáticamente al cargar
	setTimeout(() => {
		if (window.UI && window.UI.modals && window.UI.modals.permissionModal) {
			window.UI.modals.permissionModal.show();
		}

		// Mostrar notificación de bienvenida
		window.toast?.info('👋 Bienvenido a pod-cast! Activa el micrófono para comenzar.', 4000);
	}, 800);
});
