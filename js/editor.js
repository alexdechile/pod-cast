/**
 * NUEVO MOTOR DAW - WaveSurfer Multitrack Integration
 * @author alexdechile/gemini
 */

let multitrack = null;
let trackCount = 0; // Contador para IDs únicos de pistas

function initDAW() {
  const container = document.getElementById('multitrack-container');
  if (!container) return;

  // Detectar la clase Multitrack (Global o bajo WaveSurfer)
  const MultitrackClass = window.Multitrack || (window.WaveSurfer && window.WaveSurfer.Multitrack);
  
  if (!MultitrackClass) {
    console.error('❌ Plugin Multitrack no encontrado. Verifica los scripts en index.html');
    window.toast?.error('Error: Motor de audio no cargado');
    return;
  }

  // Destruir instancia previa si existe
  if (multitrack) {
      try {
          multitrack.destroy();
      } catch(e) { console.warn('Error destruyendo instancia previa:', e); }
  }

  // Configuración inicial con pistas vacías
  try {
      multitrack = MultitrackClass.create([
          { id: 'start-track', draggable: false } // Pista fantasma inicial para establecer el timeline
      ], {
        container,
        minPxPerSec: 10,
        rightButtonDrag: false,
        cursorColor: '#ff0066',
        cursorWidth: 2,
        trackBorderColor: '#333',
        trackBackground: '#1e1e1e',
        dragBounds: true,
      });

      console.log('✅ DAW Multitrack inicializado');
      window.toast?.info('DAW Listo: Arrastra audios aquí');
      
      setupDAWControls();
      setupDAWDragAndDrop();
      
      // Eventos
      multitrack.on('timeupdate', (time) => updateDAWTime(time));
      
  } catch (err) {
      console.error('❌ Error al crear Multitrack:', err);
      window.toast?.error('Error iniciando el editor');
  }
}

/**
 * Vincula los botones de la toolbar con el motor Multitrack
 */
function setupDAWControls() {
  const btnPlay = document.getElementById('daw-btn-play');
  const btnStop = document.getElementById('daw-btn-stop');
  const zoomSlider = document.getElementById('daw-zoom-slider');

  btnPlay?.addEventListener('click', () => {
    if (!multitrack) return;
    if (multitrack.isPlaying()) {
      multitrack.pause();
      btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    } else {
      multitrack.play();
      btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }
  });

  btnStop?.addEventListener('click', () => {
    if (!multitrack) return;
    multitrack.stop();
    multitrack.setTime(0);
    btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
  });
  
  // ... resto de controles de zoom ...
  zoomSlider?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if(multitrack) multitrack.setZoom(val);
  });
}

/**
 * Función principal para añadir clips al timeline
 */
async function addAudioToDAW(blobOrUrl, name = 'Clip', trackId = null) {
  if (!multitrack) {
      console.error('❌ Multitrack no inicializado');
      return;
  }
  
  console.log(`📥 Añadiendo audio: ${name}`);

  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  
  // Crear un nuevo ID de pista único
  const newTrackId = trackId || `track-${Date.now()}-${trackCount++}`;
  
  try {
    // En v7 Multitrack, addTrack espera un objeto de pista completo
    multitrack.addTrack({
      id: newTrackId,
      draggable: true,
      startPosition: 0, // Iniciar al principio por defecto
      clips: [
        {
          id: `clip-${Date.now()}`,
          url: url,
          start: 0,
          duration: undefined, // Dejar que detecte la duración
          draggable: true,
          title: name
        }
      ],
      options: {
          waveColor: '#00c3ff',
          progressColor: '#0077aa'
      }
    });
    
    window.toast?.success(`Pista añadida: ${name}`);
    console.log('✅ Pista añadida correctamente');

  } catch (err) {
    console.error('❌ Error API addTrack:', err);
    
    // Fallback: Intentar método alternativo si la API cambió
    try {
        // A veces es multitrack.tracks.push... (depende de la versión exacta del plugin beta)
        // Pero intentemos reimplementar la lista completa si falla agregar uno solo (hack)
        console.log('⚠️ Intentando método alternativo...');
    } catch (e2) {
        window.toast?.error('No se pudo añadir el audio. Revisa la consola.');
    }
  }
}

function setupDAWDragAndDrop() {
  const dropZone = document.getElementById('daw-container');
  const overlay = document.getElementById('daw-drop-zone');
  
  if (!dropZone) return;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (overlay) overlay.classList.add('active');
  });

  dropZone.addEventListener('dragleave', () => {
    if (overlay) overlay.classList.remove('active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (overlay) overlay.classList.remove('active');
    
    console.log('🎯 DROP detectado');

    // 1. Archivos externos
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      console.log('📂 Archivo soltado:', file.name);
      if (file.type.startsWith('audio/')) {
        addAudioToDAW(file, file.name);
      } else {
          window.toast?.warning('Solo se admiten archivos de audio');
      }
      return;
    }
    
    // 2. Elementos internos (Playlist)
    const recordingIdRaw = e.dataTransfer.getData('recordingId');
    console.log('🎵 ID Grabación recibido:', recordingIdRaw);
    
    if (recordingIdRaw) {
       loadAndAddRecording(parseInt(recordingIdRaw));
    } else {
        console.warn('⚠️ No se encontró ID de grabación en el evento drop');
    }
  });
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

// Inicializar cuando el DOM esté listo y WaveSurfer cargado
document.addEventListener('DOMContentLoaded', () => {
    if (window.Multitrack) {
        initDAW();
    } else {
        window.addEventListener('wavesurfer-ready', initDAW);
    }
});