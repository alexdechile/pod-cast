// --- Lógica inicial del editor de sonido minimalista ---
	function setupEditorElements() {
		const editorRecordingSelect = document.getElementById('editor-recording-select');
		const editorAudioPreview = document.getElementById('editor-audio-preview');
		if (editorRecordingSelect && !editorRecordingSelect._listenerAdded) {
			editorRecordingSelect.addEventListener('change', function() {
				if (!window.dbAudio) return;
				const id = Number(this.value);
				if (!id) {
					editorAudioPreview.src = '';
					editorAudioPreview.style.display = 'none';
					return;
				}
				const tx = window.dbAudio.transaction(['recordings'], 'readonly');
				const store = tx.objectStore('recordings');
				const req = store.get(id);
				req.onsuccess = function(e) {
					const rec = e.target.result;
					if (rec && rec.blob) {
						editorAudioPreview.src = URL.createObjectURL(rec.blob);
						editorAudioPreview.style.display = 'block';
					}
				};
			});
			editorRecordingSelect._listenerAdded = true;
		}
	}
	function populateEditorRecordings() {
		const editorRecordingSelect = document.getElementById('editor-recording-select');
		const editorAudioPreview = document.getElementById('editor-audio-preview');
		if (!window.dbAudio || !editorRecordingSelect) return;
		const tx = window.dbAudio.transaction(['recordings'], 'readonly');
		const store = tx.objectStore('recordings');
		const req = store.getAll();
		req.onsuccess = function(e) {
			const recs = e.target.result;
			editorRecordingSelect.innerHTML = '';
			if (recs.length === 0) {
				const opt = document.createElement('option');
				opt.value = '';
				opt.textContent = 'No hay grabaciones';
				editorRecordingSelect.appendChild(opt);
				editorAudioPreview.src = '';
				editorAudioPreview.style.display = 'none';
				return;
			}
			recs.sort((a, b) => new Date(b.date) - new Date(a.date));
			recs.forEach(rec => {
				const opt = document.createElement('option');
				opt.value = rec.id;
				opt.textContent = rec.name;
				editorRecordingSelect.appendChild(opt);
			});
			editorRecordingSelect.value = recs[0].id;
			editorAudioPreview.src = URL.createObjectURL(recs[0].blob);
			editorAudioPreview.style.display = 'block';
		};
	}

    // Cargar la onda al seleccionar grabación
editorRecordingSelect?.addEventListener('change', function() {
  const id = Number(this.value);
  if (!id || !window.dbAudio) return;
  const tx = window.dbAudio.transaction(['recordings'], 'readonly');
  const store = tx.objectStore('recordings');
  const req = store.get(id);
  req.onsuccess = async function(e) {
    const rec = e.target.result;
    if (rec && rec.blob) {
      console.log('Seleccionada grabación id', id, 'blob:', rec.blob);
      // Decodificar el blob a AudioBuffer antes de cargar en WaveSurfer
      const arrayBuffer = await rec.blob.arrayBuffer();
      const audioCtx = window.editorWaveSurfer ? window.editorWaveSurfer.backend.ac : new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.decodeAudioData(arrayBuffer.slice(0), (audioBuffer) => {
        window.editorCurrentBuffer = audioBuffer;
        window.editorCurrentBlob = rec.blob;
        console.log('AudioBuffer decodificado y asignado:', audioBuffer);
        // --- Asegurar que WaveSurfer está cargado ---
        function createOrUpdateWaveSurfer() {
          if (!window.editorWaveSurfer) {
            window.editorWaveSurfer = WaveSurfer.create({
              container: '#sound-editor',
              waveColor: '#00c3ff',
              progressColor: '#fffc00',
              backgroundColor: '#18191a',
              height: 80,
              barWidth: 2,
              barGap: 1,
              barRadius: 2,
              cursorColor: '#ff0066',
              responsive: true,
              interact: true,
            });
            window.editorWaveSurfer.on('region-updated', region => {
              window.editorSelection.start = region.start / window.editorWaveSurfer.getDuration();
              window.editorSelection.end = region.end / window.editorWaveSurfer.getDuration();
              updateTrimSliders();
            });
            window.editorWaveSurfer.on('region-removed', () => {
              window.editorSelection = {start: 0, end: 1};
              updateTrimSliders();
            });
          } else {
            window.editorWaveSurfer.empty();
            window.editorWaveSurfer.clearRegions && window.editorWaveSurfer.clearRegions();
          }
          window.editorWaveSurfer.loadBlob(rec.blob);
          window.editorWaveSurfer.once('ready', () => {
            if (window.editorWaveSurfer.clearRegions) window.editorWaveSurfer.clearRegions();
            if (window.editorWaveSurfer.addRegion) {
              window.editorWaveSurfer.addRegion({
                start: 0,
                end: window.editorWaveSurfer.getDuration(),
                color: 'rgba(0,195,255,0.1)',
                drag: true,
                resize: true
              });
            }
            window.editorSelection = {start: 0, end: 1};
            updateTrimSliders();
          });
        }
        if (typeof WaveSurfer === 'undefined') {
          console.log('WaveSurfer.js no está cargado, cargando...');
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.min.js';
          script.onload = () => {
            console.log('WaveSurfer.js cargado');
            createOrUpdateWaveSurfer();
          };
          document.body.appendChild(script);
        } else {
          createOrUpdateWaveSurfer();
        }
      }, (err) => {
        window.editorCurrentBuffer = null;
        window.editorCurrentBlob = null;
        console.error('No se pudo decodificar el audio', err);
      });
    }
  };
});

// --- FUNCIONES GLOBALES DEL EDITOR DE SONIDO ---
window.updateTrimSliders = function updateTrimSliders() {
  if (!window.editorWaveSurfer) return;
  const dur = window.editorWaveSurfer.getDuration();
  const region = window.editorWaveSurfer.regionsList && Object.values(window.editorWaveSurfer.regionsList)[0];
  if (region) {
    window.editorTrimStart.value = Math.round((region.start / dur) * 100);
    window.editorTrimEnd.value = Math.round((region.end / dur) * 100);
  } else {
    window.editorTrimStart.value = 0;
    window.editorTrimEnd.value = 100;
  }
}

window.updateEditorBuffer = function updateEditorBuffer(buffer) {
  window.editorCurrentBuffer = buffer;
  // Convertir a Blob para previsualizar y exportar
  const wavBlob = bufferToWavBlob(buffer);
  window.editorCurrentBlob = wavBlob;
  if (window.editorWaveSurfer) {
    window.editorWaveSurfer.empty();
    window.editorWaveSurfer.clearRegions && window.editorWaveSurfer.clearRegions();
    window.editorWaveSurfer.loadBlob(wavBlob);
    window.editorWaveSurfer.once('ready', () => {
      if (window.editorWaveSurfer.clearRegions) window.editorWaveSurfer.clearRegions();
      if (window.editorWaveSurfer.addRegion) {
        window.editorWaveSurfer.addRegion({
          start: 0,
          end: window.editorWaveSurfer.getDuration(),
          color: 'rgba(0,195,255,0.1)',
          drag: true,
          resize: true
        });
      }
      window.updateTrimSliders();
    });
  }
  // Actualizar reproductor
  if (window.editorAudioPreview) {
    window.editorAudioPreview.src = URL.createObjectURL(wavBlob);
    window.editorAudioPreview.style.display = 'block';
  }
}

if (editorPitchSlider && editorPitchValue) {
  editorPitchSlider.addEventListener('input', () => {
    const val = parseInt(editorPitchSlider.value, 10);
    editorPitchValue.textContent = (val > 0 ? '+' : (val < 0 ? '' : '')) + val;
  });
}
if (editorEchoSlider && editorEchoValue) {
  editorEchoSlider.addEventListener('input', () => {
    editorEchoValue.textContent = editorEchoSlider.value + 'ms';
  });
}
