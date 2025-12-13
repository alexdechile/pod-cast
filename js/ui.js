// --- ELEMENTOS DEL DOM ---
// Grabador
const btnPermission = document.getElementById('btn-permission');
const btnAllowMic = document.getElementById('btn-allow-mic');
const permissionModal = new bootstrap.Modal(document.getElementById('permissionModal'));
const recorderControls = document.getElementById('recorder-controls');
const btnRecord = document.getElementById('btn-record');
const btnPause = document.getElementById('btn-pause');
const btnStop = document.getElementById('btn-stop');
const btnCompress = document.getElementById('btn-compress');
const inputVolume = document.getElementById('input-volume');
const waveformDiv = document.getElementById('waveform');
const playlistUl = document.getElementById('playlist');

// Editor
const editorAudioPreview = document.getElementById('editor-audio-preview');
const editorRecordingSelect = document.getElementById('editor-recording-select');
const editorTrimStart = document.getElementById('editor-trim-start');
const editorTrimEnd = document.getElementById('editor-trim-end');
const editorCutBtn = document.getElementById('editor-cut');
const editorCopyBtn = document.getElementById('editor-copy');
const editorPasteBtn = document.getElementById('editor-paste');
const editorTrimBtn = document.getElementById('editor-trim');
const editorTrackList = document.getElementById('editor-track-list');
const editorPitchSlider = document.getElementById('editor-pitch-slider');
const editorPitchValue = document.getElementById('editor-pitch-value');
const editorEchoSlider = document.getElementById('editor-echo-slider');
const editorEchoValue = document.getElementById('editor-echo-value');

// Efectos
const editorRobotBtn = document.getElementById('editor-robot');
const editorEchoBtn = document.getElementById('editor-echo');
const editorPitchBtn = document.getElementById('editor-pitch');
const editorNormalizeBtn = document.getElementById('editor-normalize');
const editorHPFBtn = document.getElementById('editor-hpf');
const editorLPFBtn = document.getElementById('editor-lpf');
const editorAntipopBtn = document.getElementById('editor-antipop');
const editorCompressBtn = document.getElementById('editor-compress');

// Tonos
const btnPacman = document.getElementById('btn-pacman');
const btnTeclaCassette = document.getElementById('btn-tecla-cassette');
const btnCortinaCierre = document.getElementById('btn-cortina-cierre');
const btnCortina = document.getElementById('btn-cortina');
