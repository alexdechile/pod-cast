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
      
      // Eventos
      multitrack.on('timeupdate', (time) => updateDAWTime(time));
      
      // Renderizar controles extra (Volumen/Mute/Solo)
      renderTrackControls();

  } catch (err) {
      console.error('❌ Error al crear Multitrack:', err);
      window.toast?.error('Error iniciando el editor');
  }
}

/**
 * Renderiza controles de pista (Vol, Mute, Solo) inyectándolos en el DOM del Multitrack
 */
function renderTrackControls() {
    if (!multitrack || !multitrack.rendering || !multitrack.rendering.containers) return;

    multitrack.tracks.forEach((track, index) => {
        if (track.id === 'start-track') return;

        const container = multitrack.rendering.containers[index];
        if (!container) return;

        // Verificar si ya tiene controles para no duplicar
        if (container.querySelector('.track-controls')) return;

        // Crear panel de controles
        const controls = document.createElement('div');
        controls.className = 'track-controls';
        controls.innerHTML = `
            <div class="d-flex align-items-center mb-1">
                <span class="track-name text-truncate small me-auto" style="max-width: 80px;" title="${track._name || 'Clip'}">${track._name || 'Clip'}</span>
                <button class="btn btn-xs btn-outline-secondary btn-mute me-1 ${track.muted ? 'active' : ''}" title="Mute">M</button>
                <button class="btn btn-xs btn-outline-secondary btn-solo ${track.solo ? 'active' : ''}" title="Solo">S</button>
            </div>
            <div class="d-flex align-items-center">
                <i class="fa-solid fa-volume-low small me-1 text-muted"></i>
                <input type="range" class="form-range track-volume" min="0" max="1" step="0.05" value="${track.volume ?? 1}">
            </div>
        `;

        // Estilos inline para asegurar visibilidad sobre el canvas
        Object.assign(controls.style, {
            position: 'absolute',
            left: '10px',
            top: '10px',
            zIndex: '100',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            padding: '8px',
            borderRadius: '6px',
            width: '160px',
            border: '1px solid rgba(255,255,255,0.1)'
        });

        // Event Listeners
        const btnMute = controls.querySelector('.btn-mute');
        const btnSolo = controls.querySelector('.btn-solo');
        const inputVol = controls.querySelector('.track-volume');

        btnMute.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar drag
            track.muted = !track.muted;
            // Actualizar estado visual
            btnMute.classList.toggle('active', track.muted);
            btnMute.classList.toggle('btn-danger', track.muted);
            btnMute.classList.toggle('btn-outline-secondary', !track.muted);
            // Aplicar al audio real
            if (multitrack.audios[index]) multitrack.audios[index].muted = track.muted;
        });

        btnSolo.addEventListener('click', (e) => {
            e.stopPropagation();
            track.solo = !track.solo;
            btnSolo.classList.toggle('active', track.solo);
            btnSolo.classList.toggle('btn-warning', track.solo);
            btnSolo.classList.toggle('btn-outline-secondary', !track.solo);
            
            // Lógica de Solo: Mutear todos los demás
            const hasSolo = tracks.some(t => t.solo);
            multitrack.tracks.forEach((t, i) => {
                if (t.id === 'start-track') return;
                const audio = multitrack.audios[i];
                if (!audio) return;
                
                if (hasSolo) {
                    // Si hay algún solo activo, mutear los que no son solo
                    audio.muted = !t.solo;
                } else {
                    // Si no hay solos, restaurar estado mute original
                    audio.muted = t.muted || false;
                }
            });
        });

        inputVol.addEventListener('input', (e) => {
            e.stopPropagation();
            const vol = parseFloat(e.target.value);
            track.volume = vol;
            if (multitrack.audios[index]) multitrack.audios[index].volume = vol;
        });
        
        // Prevenir que el drag del slider mueva la pista
        inputVol.addEventListener('mousedown', e => e.stopPropagation());
        controls.addEventListener('mousedown', e => e.stopPropagation());

        container.appendChild(controls);
    });
}

/**
 * Vincula los botones de la toolbar con el motor Multitrack
 */
function setupDAWControls() {
  const btnPlay = document.getElementById('daw-btn-play');
  const btnStop = document.getElementById('daw-btn-stop');
  const zoomSlider = document.getElementById('daw-zoom-slider');
  const btnExport = document.getElementById('daw-btn-export');
  const btnSaveProject = document.getElementById('daw-btn-save-project');
  const btnLoadProject = document.getElementById('daw-btn-load-project');
  const fileInput = document.getElementById('project-file-input');

  // Remover listeners antiguos para no duplicar (clonando nodo)
  const newBtnPlay = btnPlay?.cloneNode(true);
  if(btnPlay) btnPlay.parentNode.replaceChild(newBtnPlay, btnPlay);
  
  const newBtnStop = btnStop?.cloneNode(true);
  if(btnStop) btnStop.parentNode.replaceChild(newBtnStop, btnStop);

  const newBtnExport = btnExport?.cloneNode(true);
  if(btnExport) btnExport.parentNode.replaceChild(newBtnExport, btnExport);
  
  const newBtnSave = btnSaveProject?.cloneNode(true);
  if(btnSaveProject) btnSaveProject.parentNode.replaceChild(newBtnSave, btnSaveProject);
  
  const newBtnLoad = btnLoadProject?.cloneNode(true);
  if(btnLoadProject) btnLoadProject.parentNode.replaceChild(newBtnLoad, btnLoadProject);

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

  newBtnExport?.addEventListener('click', exportMix);
  newBtnSave?.addEventListener('click', saveProject);
  newBtnLoad?.addEventListener('click', () => fileInput?.click());
  
  fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) loadProject(e.target.files[0]);
      e.target.value = ''; // Reset
  });
}

/**
 * Guardar Proyecto completo (.pod / .zip)
 */
async function saveProject() {
    if (!tracks.length || (tracks.length === 1 && tracks[0].id === 'start-track')) {
        window.toast?.warning('No hay nada que guardar');
        return;
    }
    
    if (!window.JSZip) {
        window.toast?.error('Error: Librería de compresión no cargada');
        return;
    }

    window.toast?.info('📦 Empaquetando proyecto...');
    console.log('📦 Guardando proyecto...');

    try {
        const zip = new window.JSZip();
        const projectData = {
            version: '1.0',
            created: new Date().toISOString(),
            tracks: []
        };

        // Procesar pistas
        for (const track of tracks) {
            if (track.id === 'start-track') continue;

            const filename = `audio/${track.id}.blob`; // Usamos ID para nombre único
            
            // Obtener blob real
            const response = await fetch(track.url);
            const blob = await response.blob();
            
            // Añadir al ZIP
            zip.file(filename, blob);

            // Guardar metadatos (limpiando URL temporal)
            projectData.tracks.push({
                ...track,
                url: null, // No guardamos el blob URL local
                src: filename, // Referencia interna en el ZIP
                // Asegurar guardar estado
                muted: track.muted,
                solo: track.solo,
                volume: track.volume
            });
        }

        // Añadir JSON de receta
        zip.file('project.json', JSON.stringify(projectData, null, 2));

        // Generar archivo
        const content = await zip.generateAsync({type: 'blob'});
        
        // Descargar
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proyecto_podcast_${new Date().toISOString().slice(0,10)}.pod`;
        a.click();
        
        window.toast?.success('✅ Proyecto guardado correctamente');

    } catch (err) {
        console.error('❌ Error guardando proyecto:', err);
        window.toast?.error('Error al guardar el proyecto');
    }
}

/**
 * Cargar Proyecto (.pod)
 */
async function loadProject(file) {
    if (!window.JSZip) return;
    
    window.toast?.info('📂 Abriendo proyecto...');
    console.log('📂 Cargando:', file.name);

    try {
        const zip = await window.JSZip.loadAsync(file);
        
        // Leer receta
        const jsonFile = zip.file('project.json');
        if (!jsonFile) throw new Error('Archivo de proyecto inválido (falta project.json)');
        
        const projectData = JSON.parse(await jsonFile.async('string'));
        console.log('📄 Receta cargada:', projectData);

        // Reconstruir pistas
        const newTracks = [{ id: 'start-track', draggable: false }];
        
        for (const tData of projectData.tracks) {
            // Extraer audio del ZIP
            const audioFile = zip.file(tData.src);
            if (!audioFile) {
                console.warn('⚠️ Audio perdido:', tData.src);
                continue;
            }
            
            const blob = await audioFile.async('blob');
            const newUrl = URL.createObjectURL(blob);
            
            // Reconstruir objeto track completo
            newTracks.push({
                ...tData,
                url: newUrl, // Nueva URL viva
                draggable: true // Asegurar
            });
        }

        // Actualizar estado global
        tracks = newTracks;
        
        // Reiniciar DAW
        initDAW();
        
        window.toast?.success('✅ Proyecto cargado exitosamente');

    } catch (err) {
        console.error('❌ Error cargando proyecto:', err);
        window.toast?.error('No se pudo abrir el proyecto. Archivo dañado o formato incorrecto.');
    }
}

/**
 * Exportar mezcla final
 */
async function exportMix() {
  if (!multitrack || tracks.length <= 1) { // <= 1 porque start-track es fantasma
      window.toast?.warning('No hay pistas para exportar');
      return;
  }

  window.toast?.info('⏳ Renderizando mezcla...');
  console.log('⏳ Iniciando exportación...');

  try {
      // 1. Calcular duración total
      let maxDuration = 0;
      // Usar la instancia multitrack para obtener duraciones reales decodificadas
      // multitrack.wavesurfers es un array interno de instancias wavesurfer por pista
      const wavesurfers = multitrack.wavesurfers; 
      
      // Necesitamos mapear tracks lógicos a wavesurfers físicos
      // Asumiremos que el orden se mantiene, pero es arriesgado. 
      // Mejor: iterar sobre tracks y buscar su audio decodificado.
      
      // Estrategia más segura con la API pública de Multitrack (si existe) o iterando sources
      // Dado que multitrack v7 beta es limitado, usaremos Web Audio API nativa recomponiendo
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const sources = [];
      
      // Recorrer pistas (saltando la primera 'start-track' si es fantasma/vacía)
      for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          if (track.id === 'start-track') continue;
          
          const response = await fetch(track.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          sources.push({
              buffer: audioBuffer,
              startTime: track.startPosition || 0
          });
          
          const trackEnd = (track.startPosition || 0) + audioBuffer.duration;
          if (trackEnd > maxDuration) maxDuration = trackEnd;
      }

      if (maxDuration === 0) throw new Error("Duración total es 0");

      // 2. Offline Rendering
      const offlineCtx = new OfflineAudioContext(2, maxDuration * 44100, 44100);
      const hasSolo = tracks.some(t => t.solo);
      
      sources.forEach((src, idx) => {
          // Lógica de Mute/Solo
          const track = tracks.find(t => t.startPosition === src.startTime && t.url); // Búsqueda aproximada
          // Mejor usar el índice si es paralelo, pero sources se llenó en bucle
          // Vamos a re-implementar el loop de sources para incluir metadatos de volumen/mute
      });
      
      // Reiniciamos sources con lógica correcta
      sources.length = 0; // Limpiar
      
      for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          if (track.id === 'start-track') continue;
          
          // Verificar si debe sonar
          const shouldPlay = hasSolo ? track.solo : !track.muted;
          if (!shouldPlay) continue;

          const response = await fetch(track.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          sources.push({
              buffer: audioBuffer,
              startTime: track.startPosition || 0,
              volume: track.volume ?? 1
          });
          
          const trackEnd = (track.startPosition || 0) + audioBuffer.duration;
          if (trackEnd > maxDuration) maxDuration = trackEnd;
      }
      
      // Si todo está muteado
      if (sources.length === 0) {
          window.toast?.warning('No hay pistas activas para exportar (todo muteado)');
          return;
      }

      sources.forEach(src => {
          const source = offlineCtx.createBufferSource();
          source.buffer = src.buffer;
          
          // Gain Node para volumen
          const gainNode = offlineCtx.createGain();
          gainNode.gain.value = src.volume;
          
          source.connect(gainNode);
          gainNode.connect(offlineCtx.destination);
          
          source.start(src.startTime);
      });

      const renderedBuffer = await offlineCtx.startRendering();
      
      // 3. Convertir a WAV y Descargar
      const wavBlob = bufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `podcast_mix_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.wav`;
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
      }, 100);

      window.toast?.success('✅ Exportación completada');
      console.log('✅ Exportación exitosa');

  } catch (err) {
      console.error('❌ Error exportando:', err);
      window.toast?.error('Error al exportar audio');
  }
}

// Utilidad simple para WAV (PCM 16-bit)
function bufferToWav(abuffer) {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this demo)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while (pos < abuffer.length) {
    for (i = 0; i < numOfChan; i++) { // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true); // write 16-bit sample
      offset += 2;
    }
    pos++;
  }

  return new Blob([buffer], { type: "audio/wav" });

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}


/**
 * Función principal para añadir clips al timeline (Soporta Segmentos)
 */
async function addAudioToDAW(blobOrUrl, name = 'Clip', trackId = null, segments = []) {
  console.log(`📥 Añadiendo audio: ${name}, Segmentos: ${segments?.length || 0}`);

  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  
  // Calcular dónde insertar (al final de la pista más larga o 0)
  // Nota: En este motor simple, startPosition define el inicio en el timeline global
  let globalInsertionPoint = 0;
  if (tracks.length > 0) {
      // Buscar el punto final más lejano
      // (Estimado, ya que no tenemos duraciones exactas sin decodificar, pero startPosition ayuda)
      // Mejor: Si es el primer clip real, empezar en 0. Si ya hay, sumar un poco.
      // Por simplicidad, si hay segmentos, los ponemos en una nueva "fila" visual o escalonados.
      
      // Vamos a buscar el max startPosition de las pistas existentes para no solapar visualmente al inicio si no se quiere
      // Pero el usuario quiere "secuencialmente".
  }

  // Helper para tiempo
  const timeToSeconds = (timeStr) => {
    if (typeof timeStr === 'number') return timeStr;
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  if (segments && segments.length > 0) {
      // --- MODO MULTI-CLIP (Smart Split) ---
      console.log('✂️ Aplicando Smart Split...');
      
      // Necesitamos la duración total para calcular el final del último segmento
      // Como no podemos esperar a decodificar aquí síncronamente fácil, asumiremos que
      // los segmentos cubren lo que cubren.
      // Truco: Usaremos el mismo URL (blob) para todas las pistas generadas.
      
      let prevTime = 0;
      // Ordenar segmentos
      const sorted = [...segments].sort((a,b) => timeToSeconds(a.time) - timeToSeconds(b.time));
      
      // Calcular punto de inserción global: 
      // Buscamos el final de la última pista existente para pegar estos clips después.
      // Dado que no tenemos la duración exacta de las pistas previas en 'tracks' (solo url), 
      // usaremos una estimación o 0 si está vacío.
      // Para hacerlo bien, deberíamos consultar 'multitrack.durations' si existe.
      let currentTimelinePos = 0;
      
      if (multitrack && multitrack.maxDuration > 0) {
          currentTimelinePos = multitrack.maxDuration + 1; // 1 segundo de margen
      }

      // Crear una pista por cada segmento (escalonadas en el tiempo)
      for (let i = 0; i < sorted.length; i++) {
          const seg = sorted[i];
          const segTime = timeToSeconds(seg.time);
          
          // Clip: Desde prevTime hasta segTime
          // Si es muy corto, ignorar
          if (segTime - prevTime > 0.5) {
              tracks.push({
                  id: `track-${Date.now()}-${trackCount++}`,
                  url: url, // Mismo audio
                  startPosition: currentTimelinePos, // Posición en el timeline global
                  draggable: true,
                  options: {
                      waveColor: '#00c3ff',
                      progressColor: '#0077aa'
                  },
                  // Parámetros mágicos para recortar (si el motor los soporta)
                  startCue: prevTime,
                  endCue: segTime,
                  // Metadatos
                  _name: seg.name || `Parte ${i+1}`
              });
              
              // Avanzar cursor del timeline
              currentTimelinePos += (segTime - prevTime);
          }
          prevTime = segTime;
      }
      
      // Clip final (Resto del audio)
      // Como no sabemos la duración total aún, no podemos poner endCue fijo fácilmente.
      // Pero podemos poner startCue = prevTime y dejar que suene hasta el final.
      tracks.push({
          id: `track-${Date.now()}-${trackCount++}`,
          url: url,
          startPosition: currentTimelinePos,
          draggable: true,
          options: {
              waveColor: '#00c3ff',
              progressColor: '#0077aa'
          },
          startCue: prevTime,
          // endCue: undefined (hasta el final)
          _name: `${name} (Final)`
      });

  } else {
      // --- MODO SIMPLE (Archivo completo) ---
      
      // Encontrar hueco al final
      let startPos = 0;
      if (multitrack && multitrack.maxDuration > 0) {
          startPos = multitrack.maxDuration + 1;
      }

      const newTrackId = trackId || `track-${Date.now()}-${trackCount++}`;
      
      tracks.push({
          id: newTrackId,
          url: url,
          startPosition: startPos,
          draggable: true,
          options: {
            waveColor: '#00c3ff',
            progressColor: '#0077aa'
          },
          _name: name 
      });
  }

  // 2. Re-renderizar todo el DAW
  initDAW();
  
  window.toast?.success(`Importado: ${name}`);
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
        if (rec) addAudioToDAW(rec.blob, rec.name, null, rec.segments);
    };
}

// Exportar como función global para que recorder.js pueda usarla
// NOTA: Sobrescribimos la versión de recorder.js para integrar con este motor DAW
window.addRecordingToEditor = (rec) => {
    addAudioToDAW(rec.blob, rec.name, null, rec.segments);
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