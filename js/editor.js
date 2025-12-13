// --- LOGICA DEL EDITOR DE SONIDO (NUEVO MOTOR) ---

/**
 * Initializes the editor Logic: Listeners for recordings, buttons, etc.
 */
function setupEditor() {
  setupRecordingSelect();
  setupTransport();
  setupGlobalKeys();

  // Initial render
  renderTimeline();
}

function setupGlobalKeys() {
  document.addEventListener('keydown', (e) => {
    // Delete selected clip
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!window.editorProject) return;
      // Only if editor is focused or generally?
      // Let's check if we have a selection
      const selectedClip = window.editorProject.clips.find(c => c.selected);
      if (selectedClip) {
        window.editorProject.removeClip(selectedClip.id);
        renderTimeline();
      }
    }
  });
}


/**
 * Syncs the 'Select Recording' dropdown with IndexedDB
 * When a user selects a recording, it imports it as the SOLE clip (for now)
 */
function setupRecordingSelect() {
  const editorRecordingSelect = window.UI.editor.recordingSelect;
  if (!editorRecordingSelect) return;

  // Load available recordings into dropdown
  populateEditorRecordings();

  editorRecordingSelect.addEventListener('change', async function () {
    const id = Number(this.value);
    if (!id) return;

    if (!window.dbAudio) return; // DB not ready yet?

    try {
      const tx = window.dbAudio.transaction(['recordings'], 'readonly');
      const store = tx.objectStore('recordings');
      const rec = await new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (rec && rec.blob) {
        importRecordingToProject(rec);
      }
    } catch (err) {
      console.error("Error loading recording:", err);
    }
  });
}

function populateEditorRecordings() {
  console.log('📝 populateEditorRecordings() llamado');
  const editorRecordingSelect = window.UI.editor.recordingSelect;

  if (!window.dbAudio) {
    console.warn('⚠️ window.dbAudio no está listo, reintentando...');
    if (!populateEditorRecordings.retries) populateEditorRecordings.retries = 0;
    if (populateEditorRecordings.retries > 5) {
      console.error('❌ Demasiados reintentos, abortando');
      return;
    }
    populateEditorRecordings.retries++;
    setTimeout(populateEditorRecordings, 500);
    return;
  }

  try {
    const tx = window.dbAudio.transaction(['recordings'], 'readonly');
    const store = tx.objectStore('recordings');
    const req = store.getAll();

    req.onsuccess = function (e) {
      const recs = e.target.result;
      console.log('📝 Grabaciones encontradas en DB:', recs.length);

      editorRecordingSelect.innerHTML = '';

      if (recs.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No hay grabaciones';
        editorRecordingSelect.appendChild(opt);
        console.log('📝 No hay grabaciones disponibles');
        return;
      }

      // Add default placeholder
      const ph = document.createElement('option');
      ph.textContent = "Selecciona una grabación...";
      ph.value = "";
      editorRecordingSelect.appendChild(ph);

      recs.sort((a, b) => new Date(b.date) - new Date(a.date));
      recs.forEach(rec => {
        const opt = document.createElement('option');
        opt.value = rec.id;
        opt.textContent = rec.name;
        editorRecordingSelect.appendChild(opt);
        console.log('  ✅ Opción agregada al dropdown:', rec.name);
      });

      console.log('📝 Dropdown del editor actualizado con', recs.length, 'grabaciones');
      // Reset retry counter on success
      populateEditorRecordings.retries = 0;
    };

    req.onerror = (e) => {
      console.error('❌ Error al leer grabaciones desde DB:', e);
      populateEditorRecordings.retries = (populateEditorRecordings.retries || 0) + 1;
      if (populateEditorRecordings.retries <= 5) {
        console.warn('⚠️ Reintentando... (intento', populateEditorRecordings.retries, 'de 5)');
        setTimeout(populateEditorRecordings, 1000);
      }
    };
  } catch (err) {
    console.error('❌ Excepción en populateEditorRecordings:', err);
  }
}

/**
 * Imports a recording blob as a Clip in the project.
 * Currently clears the project first (Single-clip workflow emulation).
 */
async function importRecordingToProject(recordingRecord) {
  if (!window.audioEngine || !window.editorProject) {
    window.toast?.error("Error: Motor de audio no inicializado");
    console.error("Audio Engine or Project not initialized");
    return;
  }

  const toastId = window.toast?.info("Cargando grabación...", 0); // persistent toast

  try {
    console.log("Importing:", recordingRecord.name);

    if (window.audioEngine.ac.state === 'suspended') {
      await window.audioEngine.ac.resume();
    }

    // Decode audio data
    const arrayBuffer = await recordingRecord.blob.arrayBuffer();
    // Safety check for empty buffer
    if (arrayBuffer.byteLength === 0) {
      throw new Error("El archivo de audio está vacío.");
    }

    const audioBuffer = await window.audioEngine.decodeAudioData(arrayBuffer);

    console.log("Audio Decoded. Duration:", audioBuffer.duration, "Channels:", audioBuffer.numberOfChannels);

    // Create Clip
    const clipId = `clip_${Date.now()}`;
    // Store buffer in project cache
    window.editorProject.buffers.set(clipId, audioBuffer);

    const newClip = new window.EditorCore.Clip(clipId, clipId, audioBuffer.duration);
    newClip.name = recordingRecord.name;

    // RESET Project for this basic version
    window.editorProject.clips = [];
    window.editorProject.playhead = 0;

    window.editorProject.addClip(newClip);

    console.log("Clip added to project. Rendering timeline...");
    renderTimeline();

    // Explicitly update playhead pos (0)
    const ph = document.getElementById('editor-playhead');
    if (ph) ph.style.left = '0px';

    if (window.toast && toastId) {
      // Remove loading toast (if your toast lib supports remove, otherwise just show success)
      window.toast.success("Grabación cargada en el editor");
    }

  } catch (e) {
    console.error("Import failed:", e);
    window.toast?.error("Error al cargar audio: " + e.message);
  }
}

/**
 * Renders the timeline UI based on window.editorProject state
 */
function renderTimeline() {
  const container = window.UI.editor.timeline; // #editor-timeline-container
  if (!container) return;

  // Clear container logic
  container.innerHTML = '';

  // Set basic styles for timeline behavior
  container.style.position = 'relative';
  container.style.overflowX = 'auto'; // allow scroll
  container.style.overflowY = 'hidden';
  // Background already set in HTML class

  if (!window.editorProject) return;

  // Timeline Scale: Dynamic zoom to avoid Canvas limits (max ~32000px)
  // Default 50px/sec, but reduce if total duration * 50 > 30000
  // For better visibility, minimum zoom is 10px/sec (not 1px/sec)
  let pxPerSec = 50;
  if (window.editorProject.duration > 0) {
    // Max canvas width we want to use
    const maxCanvasWidth = 30000;
    const calculatedZoom = maxCanvasWidth / window.editorProject.duration;
    if (pxPerSec > calculatedZoom) pxPerSec = calculatedZoom;
  }
  // Min zoom to ensure visibility (10px/sec minimum for long recordings)
  const minZoom = 10;
  if (pxPerSec < minZoom) {
    pxPerSec = minZoom;
    console.warn(`⚠️ Grabación muy larga. Zoom limitado a ${minZoom}px/s. El canvas será de ${(window.editorProject.duration * pxPerSec).toFixed(0)}px`);
  }

  const totalCanvasWidth = window.editorProject.duration * pxPerSec;
  console.log(`📊 Render Timeline: Duration=${window.editorProject.duration.toFixed(2)}s, Zoom=${pxPerSec.toFixed(2)}px/s, Canvas width=${totalCanvasWidth.toFixed(0)}px`);

  window.editorProject.clips.forEach(clip => {
    const el = document.createElement('div');
    el.className = 'editor-clip';
    el.style.position = 'absolute';
    el.style.left = (clip.startTime * pxPerSec) + 'px';
    el.style.width = (clip.duration * pxPerSec) + 'px';
    el.style.height = '100px';
    el.style.top = '10px';
    el.style.backgroundColor = 'rgba(0, 195, 255, 0.2)';
    el.style.border = '1px solid #00c3ff';
    el.style.borderRadius = '4px';
    el.style.cursor = 'move';
    el.dataset.id = clip.id;

    // Ensure visible even if empty
    if ((clip.duration * pxPerSec) < 10) el.style.minWidth = '10px';

    // Clip Label
    const label = document.createElement('span');
    label.textContent = clip.name || 'Clip';
    label.style.position = 'absolute';
    label.style.top = '2px';
    label.style.left = '4px';
    label.style.color = '#fff';
    label.style.fontSize = '10px';
    label.style.pointerEvents = 'none'; // click through
    label.style.overflow = 'hidden';
    label.style.whiteSpace = 'nowrap';
    label.style.maxWidth = '100%';
    el.appendChild(label);

    // --- HANDLES FOR TRIMMING ---
    const handleLeft = document.createElement('div');
    handleLeft.className = 'clip-handle handle-left';
    styleHandle(handleLeft, 'left');
    el.appendChild(handleLeft);

    const handleRight = document.createElement('div');
    handleRight.className = 'clip-handle handle-right';
    styleHandle(handleRight, 'right');
    el.appendChild(handleRight);

    setupTrimHandles(handleLeft, handleRight, el, clip, pxPerSec);

    // --- WAVEFORM VISUALIZATION (Simple Canvas) ---
    const canvas = document.createElement('canvas');
    const canvasWidth = Math.floor(clip.duration * pxPerSec);
    canvas.width = canvasWidth;
    canvas.height = 100;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1';
    el.appendChild(canvas);

    console.log(`🎨 Drawing waveform: clip duration=${clip.duration.toFixed(2)}s, canvas width=${canvasWidth}px, zoom=${pxPerSec.toFixed(2)}px/s`);
    drawWaveform(canvas, window.editorProject.buffers.get(clip.bufferKey), clip);

    container.appendChild(el);

    // Setup Dragging (Simple implementation)
    setupClipDrag(el, clip, pxPerSec);
  });

  // Render Playhead
  const playhead = document.createElement('div');
  playhead.id = 'editor-playhead';
  playhead.style.position = 'absolute';
  playhead.style.left = (window.editorProject.playhead * pxPerSec) + 'px';
  playhead.style.top = '0';
  playhead.style.bottom = '0';
  playhead.style.width = '2px';
  playhead.style.backgroundColor = '#ff0066';
  playhead.style.zIndex = '10';
  playhead.style.pointerEvents = 'none'; // Click through
  container.appendChild(playhead);
}

function styleHandle(el, side) {
  el.style.position = 'absolute';
  el.style.top = '0';
  el.style.bottom = '0';
  el.style.width = '10px';
  el.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  el.style.cursor = 'col-resize';
  el.style.zIndex = '5';
  if (side === 'left') el.style.left = '0';
  else el.style.right = '0';
}

function drawWaveform(canvas, buffer, clip) {
  if (!buffer) {
    console.warn('⚠️ No buffer available for waveform');
    return;
  }

  const ctx = canvas.getContext('2d');
  const data = buffer.getChannelData(0);
  const amp = canvas.height / 2;

  ctx.fillStyle = '#00c3ff';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Find offset in samples
  const startSample = Math.floor(clip.offset * buffer.sampleRate);
  const durationSamples = Math.floor(clip.duration * buffer.sampleRate);

  // Calculate how many samples per pixel
  const samplesPerPixel = durationSamples / canvas.width;

  console.log(`🎨 Waveform: canvas=${canvas.width}x${canvas.height}, samples=${durationSamples}, samples/px=${samplesPerPixel.toFixed(2)}`);

  ctx.beginPath();
  for (let i = 0; i < canvas.width; i++) {
    let min = 1.0;
    let max = -1.0;

    // Calculate the range of samples for this pixel
    const sampleStart = Math.floor(startSample + (i * samplesPerPixel));
    const sampleEnd = Math.floor(startSample + ((i + 1) * samplesPerPixel));

    // Ensure we don't exceed buffer bounds
    if (sampleStart >= data.length) break;

    // Find min/max in the sample range for this pixel
    for (let j = sampleStart; j < Math.min(sampleEnd, data.length); j++) {
      const datum = data[j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }

    // Draw vertical line representing the amplitude range
    const height = Math.max(1, (max - min) * amp);
    const y = (1 + min) * amp;
    ctx.fillRect(i, y, 1, height);
  }
}

function setupTrimHandles(left, right, el, clip, pxPerSec) {
  function onMouseDown(e, isLeft) {
    e.stopPropagation(); // prevent drag
    const startX = e.clientX;
    const initialOffset = clip.offset;
    const initialDuration = clip.duration;
    const initialStartTime = clip.startTime;

    function onMouseMove(moveEvent) {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / pxPerSec;

      if (isLeft) {
        // Changing Start: 
        // offset increases (if dragging right), duration decreases, startTime increases
        // Limit: offset cannot be < 0. duration cannot be < 0.1

        let newOffset = initialOffset + deltaSec;
        let newDuration = initialDuration - deltaSec;
        let newStartTime = initialStartTime + deltaSec;

        if (newOffset < 0) {
          // hit start of file
          newOffset = 0;
          const diff = 0 - initialOffset; // negative
          newDuration = initialDuration - diff;
          newStartTime = initialStartTime + diff;
        }

        if (newDuration < 0.1) return; // min width

        clip.offset = newOffset;
        clip.duration = newDuration;
        clip.startTime = newStartTime;

      } else {
        // Changing End:
        // offset constant, duration changes (delta adds to it)
        let newDuration = initialDuration + deltaSec;

        // Limit: offset + duration cannot exceed buffer duration
        const buffer = window.editorProject.buffers.get(clip.bufferKey);
        if (buffer && (clip.offset + newDuration > buffer.duration)) {
          newDuration = buffer.duration - clip.offset;
        }

        if (newDuration < 0.1) return;
        clip.duration = newDuration;
      }
      // Re-render
      renderTimeline();
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  left.addEventListener('mousedown', (e) => onMouseDown(e, true));
  right.addEventListener('mousedown', (e) => onMouseDown(e, false));
}

function setupTransport() {
  window.UI.editor.btnPlay?.addEventListener('click', () => {
    if (!window.audioEngine || !window.editorProject) {
      console.error('❌ AudioEngine or EditorProject not initialized');
      return;
    }

    console.log('▶️ Play button clicked');
    console.log('  Clips:', window.editorProject.clips.length);
    console.log('  Playhead:', window.editorProject.playhead);
    console.log('  Duration:', window.editorProject.duration);

    if (window.editorProject.clips.length === 0) {
      console.warn('⚠️ No clips to play');
      window.toast?.warning('No hay audio cargado para reproducir');
      return;
    }

    window.UI.editor.btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    window.audioEngine.play(window.editorProject);
    startUIUpdateLoop();
  });

  window.UI.editor.btnStop?.addEventListener('click', () => {
    if (!window.audioEngine || !window.editorProject) return;

    console.log('⏹️ Stop button clicked');
    window.UI.editor.btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    window.audioEngine.stop(window.editorProject);
    window.editorProject.playhead = 0; // Reset to 0 on stop
    renderTimeline(); // Update playhead pos
    stopUIUpdateLoop();
  });
}



function setupClipDrag(el, clip, pxPerSec) {
  let isDragging = false;
  let startX = 0;
  let originalStartTime = 0;

  el.addEventListener('mousedown', (e) => {
    // Only drag if not clicking a handle (handled by stopPropagation in handles, but just in case)
    if (e.target.classList.contains('clip-handle')) return;

    isDragging = true;
    startX = e.clientX;
    originalStartTime = clip.startTime;
    el.style.opacity = '0.7';

    // Select clip logic
    window.editorProject.clips.forEach(c => c.selected = false);
    clip.selected = true;
    renderTimeline(); // Update selection visuals (TODO add border)
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaPx = e.clientX - startX;
    const deltaSec = deltaPx / pxPerSec;

    let newStartTime = originalStartTime + deltaSec;
    if (newStartTime < 0) newStartTime = 0;

    clip.startTime = newStartTime;
    // Optimization: Don't re-render entire timeline, just move this element
    el.style.left = (newStartTime * pxPerSec) + 'px';
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    el.style.opacity = '1';
    window.editorProject.updateDuration();
  });
}

// --- COMPATIBILITY WITH EFFECTS SYSTEM ---
// The effects.js uses: getSelectedBuffer, applyEffectToSelection
window.getSelectedBuffer = function () {
  // Return buffer of the currently selected clip, or the first one if none selected
  if (!window.editorProject || window.editorProject.clips.length === 0) return null;
  const selectedClip = window.editorProject.clips.find(c => c.selected) || window.editorProject.clips[0];
  if (!selectedClip) return null;

  return window.editorProject.buffers.get(selectedClip.bufferKey);
};

window.applyEffectToSelection = function (newBuffer) {
  if (!window.editorProject) return;
  const selectedClip = window.editorProject.clips.find(c => c.selected) || window.editorProject.clips[0];
  if (!selectedClip) return;

  // Non-destructive approach: Create a new buffer key for this "Take"
  const newKey = selectedClip.bufferKey + '_fx_' + Date.now();
  window.editorProject.buffers.set(newKey, newBuffer);

  // Update clip to point to new buffer
  selectedClip.bufferKey = newKey;
  // Update duration if effect changed it (e.g. echo tail, or pitch change)
  if (Math.abs(newBuffer.duration - selectedClip.duration) > 0.1) {
    // If it was full length, update entire duration. 
    // But wait, Clip has 'offset' and 'duration'.
    // If the effect was applied to the RAW buffer, we probably want to reset offset/duration if the length changed signifcantly?
    // Or just let it be.
  }

  console.log("Effect applied, new buffer key:", newKey);
  renderTimeline();

  // Feedback
  window.toast?.success('Efecto aplicado exitosamente');
};

let uiLoopId = null;
function startUIUpdateLoop() {
  if (uiLoopId) cancelAnimationFrame(uiLoopId);

  function loop() {
    if (!window.editorProject.isPlaying) return;

    // Update playhead visual
    // We need to estimate current playhead based on AudioContext
    const elapsed = window.audioEngine.ac.currentTime - window.audioEngine.startTimeGlobal;
    const currentPlayhead = window.audioEngine.playheadStart + elapsed;
    window.editorProject.playhead = currentPlayhead;

    // Direct DOM update for performance
    const ph = document.getElementById('editor-playhead');
    if (ph) {
      ph.style.left = (currentPlayhead * 50) + 'px';
    }

    // Update Time Display
    if (window.UI.editor.timeDisplay) {
      const mins = Math.floor(currentPlayhead / 60).toString().padStart(2, '0');
      const secs = Math.floor(currentPlayhead % 60).toString().padStart(2, '0');
      const ms = Math.floor((currentPlayhead % 1) * 100).toString().padStart(2, '0');
      window.UI.editor.timeDisplay.textContent = `${mins}:${secs}.${ms}`;
    }

    uiLoopId = requestAnimationFrame(loop);
  }
  loop();
}

function stopUIUpdateLoop() {
  if (uiLoopId) cancelAnimationFrame(uiLoopId);
}


// Start everything when script loads
document.addEventListener('DOMContentLoaded', setupEditor);
