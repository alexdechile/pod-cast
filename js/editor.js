/**
 * NUEVO MOTOR DAW - WaveSurfer Multitrack Integration
 * @author alexdechile/gemini
 */

let multitrack = null;
const TRACKS_CONFIG = [
  { id: 0, label: 'Voz Principal', draggable: true },
  { id: 1, label: 'Ambiente/Música', draggable: true }
];

function initDAW() {
  const container = document.getElementById('multitrack-container');
  if (!container) return;

  // Destruir instancia previa si existe
  if (multitrack) multitrack.destroy();

  multitrack = Multitrack.create(TRACKS_CONFIG, {
    container,
    minPxPerSec: 10,
    rightButtonDrag: false,
    cursorColor: '#ff0066',
    cursorWidth: 2,
    trackBorderColor: '#222',
    dragBounds: true,
  });

  setupDAWControls();
  setupDAWDragAndDrop();
  
  // Eventos de Multitrack
  multitrack.on('timeupdate', (time) => {
    updateDAWTime(time);
  });

  window.toast?.info('DAW Inicializado: Listo para editar');
}

/**
 * Vincula los botones de la toolbar con el motor Multitrack
 */
function setupDAWControls() {
  const btnPlay = document.getElementById('daw-btn-play');
  const btnStop = document.getElementById('daw-btn-stop');
  const zoomSlider = document.getElementById('daw-zoom-slider');

  btnPlay?.addEventListener('click', () => {
    if (multitrack.isPlaying()) {
      multitrack.pause();
      btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    } else {
      multitrack.play();
      btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }
  });

  btnStop?.addEventListener('click', () => {
    multitrack.stop();
    multitrack.setTime(0);
    btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
  });

  zoomSlider?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    multitrack.setZoom(val);
  });

  document.getElementById('daw-btn-zoom-in')?.addEventListener('click', () => {
    zoomSlider.value = parseInt(zoomSlider.value) + 10;
    zoomSlider.dispatchEvent(new Event('input'));
  });

  document.getElementById('daw-btn-zoom-out')?.addEventListener('click', () => {
    zoomSlider.value = parseInt(zoomSlider.value) - 10;
    zoomSlider.dispatchEvent(new Event('input'));
  });
}

/**
 * Implementa el Drag & Drop desde la playlist o archivos externos
 */
function setupDAWDragAndDrop() {
  const dropZone = document.getElementById('daw-container');
  const overlay = document.getElementById('daw-drop-zone');

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    overlay.classList.add('active');
  });

  dropZone.addEventListener('dragleave', () => {
    overlay.classList.remove('active');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    overlay.classList.remove('active');

    // Manejar archivos soltados desde el explorador
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/')) {
        addAudioToDAW(file, file.name);
      }
    }
    
    // Manejar datos de la playlist (si implementamos setData en playlist.js)
    const recordingId = e.dataTransfer.getData('recordingId');
    if (recordingId) {
       // Lógica para recuperar de IndexedDB y añadir
       loadAndAddRecording(parseInt(recordingId));
    }
  });
}

/**
 * Función principal para añadir clips al timeline
 */
async function addAudioToDAW(blobOrUrl, name = 'Nuevo Clip', trackId = 0) {
  if (!multitrack) return;

  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  
  try {
    multitrack.addTrack({
      id: trackId, // Añade al track especificado o crea uno nuevo si v7 lo permite así
      clips: [
        {
          id: `clip_${Date.now()}`,
          start: multitrack.getCurrentTime(),
          url: url,
          draggable: true,
          title: name,
        }
      ]
    });
    window.toast?.success(`Clip añadido: ${name}`);
  } catch (err) {
    console.error('Error añadiendo clip:', err);
    window.toast?.error('No se pudo añadir el audio al DAW');
  }
}

function updateDAWTime(time) {
  const display = document.getElementById('daw-current-time');
  if (!display) return;
  
  const mins = Math.floor(time / 60).toString().padStart(2, '0');
  const secs = Math.floor(time % 60).toString().padStart(2, '0');
  const ms = Math.floor((time % 1) * 100).toString().padStart(2, '0');
  display.textContent = `${mins}:${secs}:${ms}`;
}

// Cargar desde DB (para integración con Playlist)
async function loadAndAddRecording(id) {
    if (!window.dbAudio) return;
    const tx = window.dbAudio.transaction(['recordings'], 'readonly');
    const store = tx.objectStore('recordings');
    const req = store.get(id);
    req.onsuccess = (e) => {
        const rec = e.target.result;
        if (rec) addAudioToDAW(rec.blob, rec.name);
    };
}

// Exportar como función global para que recorder.js pueda usarla
window.addRecordingToEditor = (rec) => {
    addAudioToDAW(rec.blob, rec.name);
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initDAW);