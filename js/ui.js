// --- ELEMENTOS DEL DOM CENTRALIZADOS ---
window.UI = {
    recorder: {
        btnPermission: document.getElementById('btn-permission'),
        btnAllowMic: document.getElementById('btn-allow-mic'),
        permissionModalElement: document.getElementById('permissionModal'),
        recorderControls: document.getElementById('recorder-controls'),
        btnRecord: document.getElementById('btn-record'),
        btnPause: document.getElementById('btn-pause'),
        btnStop: document.getElementById('btn-stop'),
        btnCompress: document.getElementById('btn-compress'),
        inputVolume: document.getElementById('input-volume'),
        waveformDiv: document.getElementById('waveform'),
        playlistUl: document.getElementById('playlist'),
        timerContainer: document.getElementById('timer-container'),
        segmentsSection: document.getElementById('recording-segments'),
        segmentNameInput: document.getElementById('current-segment-name'),
        btnSaveSegment: document.getElementById('btn-save-segment'),
        segmentsList: document.getElementById('segments-list')
    },
    editor: {
        // audioPreview: document.getElementById('editor-audio-preview'), // Deprecated
        btnPlay: document.getElementById('editor-btn-play'),
        btnStop: document.getElementById('editor-btn-stop'),
        timeDisplay: document.getElementById('editor-time-display'),
        recordingSelect: document.getElementById('editor-recording-select'),
        trimStart: document.getElementById('editor-trim-start'),
        trimEnd: document.getElementById('editor-trim-end'),
        btnCut: document.getElementById('editor-cut'),
        btnCopy: document.getElementById('editor-copy'),
        btnPaste: document.getElementById('editor-paste'),
        btnTrim: document.getElementById('editor-trim'),
        trackList: document.getElementById('editor-track-list'),
        pitchSlider: document.getElementById('editor-pitch-slider'),
        pitchValue: document.getElementById('editor-pitch-value'),
        echoSlider: document.getElementById('editor-echo-slider'),
        echoValue: document.getElementById('editor-echo-value'),
        echoValue: document.getElementById('editor-echo-value'),
        section: document.getElementById('sound-editor'),
        timeline: document.getElementById('editor-timeline-container'),
        btnExport: document.getElementById('editor-export')
    },
    effects: {
        btnRobot: document.getElementById('editor-robot'),
        btnEcho: document.getElementById('editor-echo'),
        btnPitch: document.getElementById('editor-pitch'),
        btnNormalize: document.getElementById('editor-normalize'),
        btnHPF: document.getElementById('editor-hpf'),
        btnLPF: document.getElementById('editor-lpf'),
        btnAntipop: document.getElementById('editor-antipop'),
        btnCompress: document.getElementById('editor-compress')
    },
    modals: {
        // Inicializar instancia de Bootstrap solo cuando sea necesario
        _permissionModal: null,
        get permissionModal() {
            if (!this._permissionModal && window.UI.recorder.permissionModalElement) {
                this._permissionModal = new bootstrap.Modal(window.UI.recorder.permissionModalElement);
            }
            return this._permissionModal;
        }
    }
};

// Lógica del Resizer
(function initResizer() {
    const resizer = document.getElementById('resizer');
    const sidebar = document.querySelector('.sidebar');
    let isResizing = false;

    if (!resizer || !sidebar) return;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
    });

    function handleMouseMove(e) {
        if (!isResizing) return;
        const newWidth = e.clientX;
        if (newWidth > 300 && newWidth < window.innerWidth * 0.6) {
            sidebar.style.width = `${newWidth}px`;
        }
    }

    function stopResizing() {
        isResizing = false;
        document.body.style.cursor = 'default';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
    }
})();


