/**
 * NUEVO MOTOR DAW - WaveSurfer Multitrack Integration
 * @author alexdechile/gemini
 */

let multitrack = null;
let trackCount = 0; 
let tracks = [
  { id: 'start-track', draggable: false } // Pista inicial por defecto
];

function initDAW() {
  const container = document.getElementById('multitrack-container');
  if (!container) return;

  // Detectar la clase Multitrack
  const MultitrackClass = window.Multitrack || (window.WaveSurfer && window.WaveSurfer.Multitrack);
  
  if (!MultitrackClass) {
    console.error('❌ Plugin Multitrack no encontrado.');
    return;
  }

  // Destruir instancia previa para recargar
  if (multitrack) {
      try {
          multitrack.destroy();
          multitrack = null;
          // Limpiar contenedor por si acaso
          container.innerHTML = '';
      } catch(e) { console.warn('Error limpiando DAW:', e); }
  }

  // Configuración inicial
  try {
      multitrack = MultitrackClass.create(tracks, {
        container,
        minPxPerSec: 10,
        rightButtonDrag: false,
        cursorColor: '#ff0066',
        cursorWidth: 2,
        trackBorderColor: '#333',
        trackBackground: '#1e1e1e',
        dragBounds: true,
      });

      console.log('✅ DAW Multitrack renderizado con', tracks.length, 'pistas');
      
      setupDAWControls();
      setupDAWDragAndDrop();
      
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

  // Remover listeners antiguos para no duplicar (clonando nodo)
  const newBtnPlay = btnPlay?.cloneNode(true);
  if(btnPlay) btnPlay.parentNode.replaceChild(newBtnPlay, btnPlay);
  
  const newBtnStop = btnStop?.cloneNode(true);
  if(btnStop) btnStop.parentNode.replaceChild(newBtnStop, btnStop);

  newBtnPlay?.addEventListener('click', () => {
    if (!multitrack) return;
    if (multitrack.isPlaying()) {
      multitrack.pause();
      newBtnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    } else {
      multitrack.play();
      newBtnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }
  });

  newBtnStop?.addEventListener('click', () => {
    if (!multitrack) return;
    multitrack.stop();
    multitrack.setTime(0);
    newBtnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
  });
  
  zoomSlider?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if(multitrack) multitrack.setZoom(val);
  });
}

/**
 * Función principal para añadir clips al timeline
 */
async function addAudioToDAW(blobOrUrl, name = 'Clip', trackId = null) {
  console.log(`📥 Añadiendo audio: ${name}`);

  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const newTrackId = trackId || `track-${Date.now()}-${trackCount++}`;
  
  // 1. Agregar a nuestro estado global de pistas
  tracks.push({
      id: newTrackId,
      url: url,
      startPosition: 0,
      draggable: true,
      options: {
        waveColor: '#00c3ff',
        progressColor: '#0077aa'
      },
      // Metadatos extra para nosotros
      _name: name 
  });

  // 2. Re-renderizar todo el DAW
  // Esta versión de Multitrack no soporta addTrack dinámico real, 
  // así que recreamos la instancia preservando el estado.
  initDAW();
  
  window.toast?.success(`Pista añadida: ${name}`);
}

function setupDAWDragAndDrop() {
  const dropZone = document.getElementById('daw-container');
  const overlay = document.getElementById('daw-drop-zone');
  
  if (!dropZone) {
      console.error('❌ Contenedor DAW no encontrado para eventos Drop');
      return;
  }

  // Usamos el contenedor principal para capturar eventos
  // IMPORTANTE: dragenter y dragover deben tener preventDefault()
  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (overlay) overlay.classList.add('active');
    console.log('➡️ Drag Enter DAW');
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (overlay && !overlay.classList.contains('active')) overlay.classList.add('active');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Solo quitar si salimos del contenedor padre, no si entramos en un hijo
    if (e.target === dropZone || e.target === overlay) {
       if (overlay) overlay.classList.remove('active');
       console.log('⬅️ Drag Leave DAW');
    }
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (overlay) overlay.classList.remove('active');
    
    console.log('🎯 DROP REALIZADO en DAW');
    console.log('   DataTransfer types:', e.dataTransfer.types);

    // 1. Archivos externos
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      console.log('📂 Archivo recibido:', file.name, file.type);
      if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
        addAudioToDAW(file, file.name);
      } else {
          window.toast?.warning('El archivo no parece ser de audio');
      }
      return;
    }
    
    // 2. Elementos internos (Playlist)
    // Intentar obtener texto/plain por si acaso
    const recordingIdRaw = e.dataTransfer.getData('recordingId');
    console.log('🎵 ID Grabación (recordingId):', recordingIdRaw);
    
    if (recordingIdRaw) {
       loadAndAddRecording(parseInt(recordingIdRaw));
    } else {
        console.warn('⚠️ No se detectaron archivos ni ID de grabación válido');
        window.toast?.warning('No se pudo leer el elemento arrastrado');
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 editor.js cargado. Esperando motor de audio...');
    
    if (window.Multitrack) {
        initDAW();
    } else {
        window.addEventListener('wavesurfer-ready', () => {
            console.log('⚡ Evento wavesurfer-ready recibido');
            initDAW();
        });
    }
});

function waitForMultitrack() {
    // Deprecated: Usamos eventos ahora
}

// Depuración Global de Drag & Drop
document.addEventListener('dragover', (e) => {
    // Esto es vital: Prevenir el default globalmente permite que el drop funcione en zonas específicas
    e.preventDefault(); 
}, false);

document.addEventListener('drop', (e) => {
    // Evitar que el navegador abra el archivo si se suelta fuera de la zona segura
    if (e.target.id !== 'daw-container' && !e.target.closest('#daw-container')) {
        e.preventDefault();
        console.log('⚠️ Drop fuera de zona detectado y prevenido');
    }
}, false);