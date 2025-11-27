// --- Efectos de audio en el editor de sonido ---
const editorRobotBtn = document.getElementById('editor-robot');
const editorEchoBtn = document.getElementById('editor-echo');
const editorPitchBtn = document.getElementById('editor-pitch');
const editorNormalizeBtn = document.getElementById('editor-normalize');
const editorHPFBtn = document.getElementById('editor-hpf');
const editorLPFBtn = document.getElementById('editor-lpf');
const editorAntipopBtn = document.getElementById('editor-antipop');
const editorCompressBtn = document.getElementById('editor-compress');

// Utilidad: obtener fragmento seleccionado como AudioBuffer
function getSelectedBuffer() {
	if (!editorCurrentBuffer || !editorWaveSurfer) return null;
	const dur = editorWaveSurfer.getDuration();
	const region = editorWaveSurfer.regionsList && Object.values(editorWaveSurfer.regionsList)[0];
	if (!region) return editorCurrentBuffer;
	const start = Math.max(0, region.start);
	const end = Math.min(dur, region.end);
	if (end <= start) return null;
	return editorCurrentBuffer.slice(start * editorCurrentBuffer.sampleRate, end * editorCurrentBuffer.sampleRate);
}

// Efecto: Robot (modulación por rectificación)
editorRobotBtn?.addEventListener('click', () => {
	const buf = getSelectedBuffer();
	if (!buf) return;
	const data = buf.getChannelData(0);
	for (let i = 0; i < data.length; i++) {
		data[i] = Math.abs(data[i]) * (data[i] < 0 ? -1 : 1); // rectificación
		data[i] *= Math.sin(2 * Math.PI * 70 * (i / buf.sampleRate)); // modulación
	}
	applyEffectToSelection(buf);
});

// Efecto: Eco (delay simple)
editorEchoBtn?.addEventListener('click', () => {
	const buf = getSelectedBuffer();
	if (!buf) return;
	const data = buf.getChannelData(0);
	const delaySamples = Math.floor(0.18 * buf.sampleRate);
	for (let i = delaySamples; i < data.length; i++) {
		data[i] += 0.4 * data[i - delaySamples];
	}
	applyEffectToSelection(buf);
});

// Efecto: Pitch (sube una nota)
editorPitchBtn?.addEventListener('click', () => {
	const buf = getSelectedBuffer();
	if (!buf) { console.log('Pitch: buffer vacío'); return; }
	try {
		// Simple: resamplear a 1.12x (aprox. +2 semitonos)
		const factor = 1.12;
		const newLen = Math.floor(buf.length / factor);
		// Robustecer obtención de AudioContext
		let ac;
		if (window.editorWaveSurfer && window.editorWaveSurfer.backend && window.editorWaveSurfer.backend.ac) {
			ac = window.editorWaveSurfer.backend.ac;
		} else {
			ac = new (window.AudioContext || window.webkitAudioContext)();
		}
		const newBuf = ac.createBuffer(1, newLen, buf.sampleRate);
		const src = buf.getChannelData(0);
		const dst = newBuf.getChannelData(0);
		console.log('Pitch: antes', src.slice(0,10));
		for (let i = 0; i < newLen; i++) {
			dst[i] = src[Math.floor(i * factor)] || 0;
		}
		console.log('Pitch: después', dst.slice(0,10));
		applyEffectToSelection(newBuf);
		showEffectFeedback(editorPitchBtn);
	} catch (err) {
		console.error('Error en efecto Pitch:', err);
		showEffectFeedback(editorPitchBtn, 'Error en Pitch');
	}
});

// Efecto: Normalizar
editorNormalizeBtn?.addEventListener('click', () => {
	const buf = getSelectedBuffer();
	if (!buf) return;
	const data = buf.getChannelData(0);
	let max = 0;
	for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
	if (max > 0) {
		for (let i = 0; i < data.length; i++) data[i] /= max;
	}
	applyEffectToSelection(buf);
});

// Efecto: Pasa altos (filtro simple)
editorHPFBtn?.addEventListener('click', () => {
	const buf = getSelectedBuffer();
	if (!buf) return;
	const data = buf.getChannelData(0);
	let prev = 0, alpha = 0.85;
	for (let i = 0; i < data.length; i++) {
		let hp = data[i] - prev + alpha * (prev || 0);
		prev = data[i];
		data[i] = hp;
	}
	applyEffectToSelection(buf);
});

// Efecto: Pasa bajos (filtro simple)
editorLPFBtn?.addEventListener('click', () => {
	const buf = getSelectedBuffer();
	if (!buf) return;
	const data = buf.getChannelData(0);
	let prev = data[0];
	for (let i = 1; i < data.length; i++) {
		data[i] = 0.7 * prev + 0.3 * data[i];
		prev = data[i];
	}
	applyEffectToSelection(buf);
});

// Efecto: Anti-pop (suaviza picos)
editorAntipopBtn?.addEventListener('click', () => {
	const buf = getSelectedBuffer();
	if (!buf) return;
	const data = buf.getChannelData(0);
	for (let i = 1; i < data.length - 1; i++) {
		if (Math.abs(data[i]) > 0.85) {
			data[i] = (data[i - 1] + data[i + 1]) / 2;
		}
	}
	applyEffectToSelection(buf);
});

// Efecto: Compresión extra (simple soft clipping)
editorCompressBtn?.addEventListener('click', () => {
	const buf = getSelectedBuffer();
	if (!buf) return;
	const data = buf.getChannelData(0);
	for (let i = 0; i < data.length; i++) {
		if (data[i] > 0.7) data[i] = 0.7 + 0.2 * (data[i] - 0.7);
		if (data[i] < -0.7) data[i] = -0.7 + 0.2 * (data[i] + 0.7);
	}
	applyEffectToSelection(buf);
});

// Aplica el buffer modificado a la selección o reemplaza todo
function applyEffectToSelection(effectBuffer) {
	if (!editorCurrentBuffer || !editorWaveSurfer) return;
	const dur = editorWaveSurfer.getDuration();
	const region = editorWaveSurfer.regionsList && Object.values(editorWaveSurfer.regionsList)[0];
	if (!region) {
		updateEditorBuffer(effectBuffer);
		return;
	}
	const start = Math.max(0, region.start);
	const end = Math.min(dur, region.end);
	if (end <= start) return;
	const before = editorCurrentBuffer.slice(0, start * editorCurrentBuffer.sampleRate);
	const after = editorCurrentBuffer.slice(end * editorCurrentBuffer.sampleRate);
	const newLength = before.length + effectBuffer.length + after.length;
	const newBuffer = editorWaveSurfer.backend.ac.createBuffer(1, newLength, editorCurrentBuffer.sampleRate);
	newBuffer.getChannelData(0).set(before, 0);
	newBuffer.getChannelData(0).set(effectBuffer.getChannelData(0), before.length);
	newBuffer.getChannelData(0).set(after, before.length + effectBuffer.length);
	updateEditorBuffer(newBuffer);
}
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
	// --- Simulación de sonido Pac-Man ---
	const btnPacman = document.getElementById('btn-pacman');
	if (btnPacman) {
		btnPacman.addEventListener('click', () => {
			const ctx = new (window.AudioContext || window.webkitAudioContext)();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'square';
			osc.frequency.setValueAtTime(880, ctx.currentTime); // nota aguda
			osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.18); // baja rápido
			gain.gain.setValueAtTime(0.22, ctx.currentTime);
			gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.19);
			osc.connect(gain).connect(ctx.destination);
			osc.start();
			osc.stop(ctx.currentTime + 0.2);
			setTimeout(() => ctx.close(), 300);
		});
	}
	// --- Simulación de tecla de grabadora de cassette ---
	const btnTeclaCassette = document.getElementById('btn-tecla-cassette');
	if (btnTeclaCassette) {
		btnTeclaCassette.addEventListener('click', () => {
			const ctx = new (window.AudioContext || window.webkitAudioContext)();
			const bufferSize = 2048;
			const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
			const data = buffer.getChannelData(0);
			// Generar ruido blanco
			for (let i = 0; i < bufferSize; i++) {
				data[i] = (Math.random() * 2 - 1) * 0.7;
			}
			const noise = ctx.createBufferSource();
			noise.buffer = buffer;
			// Filtro para simular el click mecánico
			const filter = ctx.createBiquadFilter();
			filter.type = 'highpass';
			filter.frequency.value = 1200;
			// Envolvente rápida
			const gain = ctx.createGain();
			gain.gain.setValueAtTime(0, ctx.currentTime);
			gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.01);
			gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.09);
			noise.connect(filter).connect(gain).connect(ctx.destination);
			noise.start();
			noise.stop(ctx.currentTime + 0.1);
			setTimeout(() => ctx.close(), 180);
		});
	}
	// --- Generador de tonos: Cortina cierre ---
	const btnCortinaCierre = document.getElementById('btn-cortina-cierre');
	if (btnCortinaCierre) {
		btnCortinaCierre.addEventListener('click', () => {
			// Notas invertidas: A4, G4, E4, C4, E4, G4, A4
			const notes = [440.00, 392.00, 329.63, 261.63, 329.63, 392.00, 440.00];
			const longDur = 0.64;
			const shortDur = 0.32;
			const durations = [longDur, longDur, longDur, shortDur, shortDur, shortDur, shortDur];
			const ctx = new (window.AudioContext || window.webkitAudioContext)();
			let now = ctx.currentTime;
			let t = now;
			notes.forEach((freq, i) => {
				// Voz principal
				const osc1 = ctx.createOscillator();
				const gain1 = ctx.createGain();
				osc1.type = 'triangle';
				osc1.frequency.value = freq;
				gain1.gain.value = 0.16;
				osc1.connect(gain1).connect(ctx.destination);
				osc1.start(t);
				osc1.stop(t + durations[i] - 0.04);
				// Segunda voz una octava abajo
				const osc2 = ctx.createOscillator();
				const gain2 = ctx.createGain();
				osc2.type = 'triangle';
				osc2.frequency.value = freq / 2;
				gain2.gain.value = 0.11;
				osc2.connect(gain2).connect(ctx.destination);
				osc2.start(t);
				osc2.stop(t + durations[i] - 0.04);
				t += durations[i];
			});
			setTimeout(() => ctx.close(), durations.reduce((a, b) => a + b, 0) * 1000 + 200);
		});
	}
	// --- Generador de tonos: Cortina ---
	const btnCortina = document.getElementById('btn-cortina');
		if (btnCortina) {
			btnCortina.addEventListener('click', () => {
				// Notas: C4, E4, G4, A4, G4, E4, C4
				const notes = [261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 261.63];
				const longDur = 0.64; // segundos (doble)
				const shortDur = 0.32; // segundos
				const durations = [longDur, longDur, longDur, shortDur, shortDur, shortDur, shortDur];
				const ctx = new (window.AudioContext || window.webkitAudioContext)();
				let now = ctx.currentTime;
				let t = now;
						notes.forEach((freq, i) => {
							// Voz principal
							const osc1 = ctx.createOscillator();
							const gain1 = ctx.createGain();
							osc1.type = 'triangle';
							osc1.frequency.value = freq;
							gain1.gain.value = 0.16;
							osc1.connect(gain1).connect(ctx.destination);
							osc1.start(t);
							osc1.stop(t + durations[i] - 0.04);
							// Segunda voz una octava abajo
							const osc2 = ctx.createOscillator();
							const gain2 = ctx.createGain();
							osc2.type = 'triangle';
							osc2.frequency.value = freq / 2;
							gain2.gain.value = 0.11;
							osc2.connect(gain2).connect(ctx.destination);
							osc2.start(t);
							osc2.stop(t + durations[i] - 0.04);
							t += durations[i];
						});
				setTimeout(() => ctx.close(), durations.reduce((a, b) => a + b, 0) * 1000 + 200);
			});
		}


// --- INICIO DE DOMContentLoaded ---
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

	// --- ELEMENTOS DEL DOM DEL EDITOR DE SONIDO ---
	window.editorAudioPreview = document.getElementById('editor-audio-preview');
	window.editorRecordingSelect = document.getElementById('editor-recording-select');
	window.editorTrimStart = document.getElementById('editor-trim-start');
	window.editorTrimEnd = document.getElementById('editor-trim-end');
	window.editorCutBtn = document.getElementById('editor-cut');
	window.editorCopyBtn = document.getElementById('editor-copy');
	window.editorPasteBtn = document.getElementById('editor-paste');
	window.editorTrimBtn = document.getElementById('editor-trim');
	window.editorTrackList = document.getElementById('editor-track-list');

	// --- FEEDBACK VISUAL AL APLICAR EFECTOS ---
		function showEffectFeedback(btn, msg = 'Efecto aplicado') {
			if (!btn) return;
			btn.classList.add('btn-success');
			btn.classList.remove('btn-outline-info','btn-outline-success','btn-outline-warning','btn-outline-danger','btn-outline-secondary');
			btn.disabled = true;
			const oldText = btn.innerHTML;
			btn.innerHTML = `<i class=\"fa-solid fa-check\"></i> ${msg}`;
			// Mensaje visual flotante
			let feedbackDiv = document.getElementById('editor-effect-feedback');
			if (!feedbackDiv) {
				feedbackDiv = document.createElement('div');
				feedbackDiv.id = 'editor-effect-feedback';
				feedbackDiv.style.position = 'fixed';
				feedbackDiv.style.top = '30px';
				feedbackDiv.style.right = '30px';
				feedbackDiv.style.zIndex = 9999;
				feedbackDiv.style.background = '#232526cc';
				feedbackDiv.style.color = '#fffc00';
				feedbackDiv.style.padding = '1rem 2rem';
				feedbackDiv.style.borderRadius = '1rem';
				feedbackDiv.style.fontWeight = 'bold';
				feedbackDiv.style.boxShadow = '0 2px 12px #0008';
				document.body.appendChild(feedbackDiv);
			}
			feedbackDiv.textContent = msg;
			feedbackDiv.style.display = 'block';
			setTimeout(() => {
				btn.innerHTML = oldText;
				btn.disabled = false;
				btn.classList.remove('btn-success');
				btn.classList.add('btn-outline-info');
				feedbackDiv.style.display = 'none';
			}, 1200);
		}

	// --- RESTO DE LA LÓGICA DEL EDITOR (copiar aquí todo el código de edición y efectos, usando window.editorCurrentBuffer, etc.) ---
	// ...existing code...

	// --- EFECTOS DE AUDIO (con feedback visual) ---
	const editorRobotBtn = document.getElementById('editor-robot');
	const editorEchoBtn = document.getElementById('editor-echo');
	const editorPitchBtn = document.getElementById('editor-pitch');
	const editorNormalizeBtn = document.getElementById('editor-normalize');
	const editorHPFBtn = document.getElementById('editor-hpf');
	const editorLPFBtn = document.getElementById('editor-lpf');
	const editorAntipopBtn = document.getElementById('editor-antipop');
	const editorCompressBtn = document.getElementById('editor-compress');

	// Utilidad: obtener fragmento seleccionado como AudioBuffer
	function getSelectedBuffer() {
		if (!window.editorCurrentBuffer || !window.editorWaveSurfer) {
			showEffectFeedback(null, 'No hay audio cargado');
			console.warn('getSelectedBuffer: No hay buffer cargado');
			return null;
		}
		const dur = window.editorWaveSurfer.getDuration();
		const region = window.editorWaveSurfer.regionsList && Object.values(window.editorWaveSurfer.regionsList)[0];
		if (!region) return window.editorCurrentBuffer;
		const start = Math.max(0, region.start);
		const end = Math.min(dur, region.end);
		if (end <= start) return null;
		// Polyfill para slice en AudioBuffer
		const len = Math.floor((end - start) * window.editorCurrentBuffer.sampleRate);
		// --- Robustecer obtención de AudioContext ---
		let ac;
		if (window.editorWaveSurfer && window.editorWaveSurfer.backend && window.editorWaveSurfer.backend.ac) {
			ac = window.editorWaveSurfer.backend.ac;
		} else {
			ac = new (window.AudioContext || window.webkitAudioContext)();
		}
		const newBuf = ac.createBuffer(1, len, window.editorCurrentBuffer.sampleRate);
		const src = window.editorCurrentBuffer.getChannelData(0);
		const dst = newBuf.getChannelData(0);
		const offset = Math.floor(start * window.editorCurrentBuffer.sampleRate);
		for (let i = 0; i < len; i++) dst[i] = src[offset + i] || 0;
		return newBuf;
	}

		// Efecto: Robot (modulación por rectificación)
		editorRobotBtn?.addEventListener('click', () => {
			const buf = getSelectedBuffer();
			if (!buf) { console.log('Robot: buffer vacío'); return; }
			const data = buf.getChannelData(0);
			console.log('Robot: antes', data.slice(0,10));
			for (let i = 0; i < data.length; i++) {
				data[i] = Math.abs(data[i]) * (data[i] < 0 ? -1 : 1);
				data[i] *= Math.sin(2 * Math.PI * 70 * (i / buf.sampleRate));
			}
			console.log('Robot: después', data.slice(0,10));
			applyEffectToSelection(buf);
			showEffectFeedback(editorRobotBtn);
		});
		editorEchoBtn?.addEventListener('click', () => {
			const buf = getSelectedBuffer();
			if (!buf) { console.log('Eco: buffer vacío'); return; }
			const data = buf.getChannelData(0);
			console.log('Eco: antes', data.slice(0,10));
			const delaySamples = Math.floor(0.18 * buf.sampleRate);
			for (let i = delaySamples; i < data.length; i++) {
				data[i] += 0.4 * data[i - delaySamples];
			}
			console.log('Eco: después', data.slice(0,10));
			applyEffectToSelection(buf);
			showEffectFeedback(editorEchoBtn);
		});
		editorPitchBtn?.addEventListener('click', () => {
			const buf = getSelectedBuffer();
			if (!buf) { console.log('Pitch: buffer vacío'); return; }
			try {
				// Simple: resamplear a 1.12x (aprox. +2 semitonos)
				const factor = 1.12;
				const newLen = Math.floor(buf.length / factor);
				// Robustecer obtención de AudioContext
				let ac;
				if (window.editorWaveSurfer && window.editorWaveSurfer.backend && window.editorWaveSurfer.backend.ac) {
					ac = window.editorWaveSurfer.backend.ac;
				} else {
					ac = new (window.AudioContext || window.webkitAudioContext)();
				}
				const newBuf = ac.createBuffer(1, newLen, buf.sampleRate);
				const src = buf.getChannelData(0);
				const dst = newBuf.getChannelData(0);
				console.log('Pitch: antes', src.slice(0,10));
				for (let i = 0; i < newLen; i++) {
					dst[i] = src[Math.floor(i * factor)] || 0;
				}
				console.log('Pitch: después', dst.slice(0,10));
				applyEffectToSelection(newBuf);
				showEffectFeedback(editorPitchBtn);
			} catch (err) {
				console.error('Error en efecto Pitch:', err);
				showEffectFeedback(editorPitchBtn, 'Error en Pitch');
			}
		});
		editorNormalizeBtn?.addEventListener('click', () => {
			const buf = getSelectedBuffer();
			if (!buf) { console.log('Normalizar: buffer vacío'); return; }
			const data = buf.getChannelData(0);
			let max = 0;
			for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
			console.log('Normalizar: antes', data.slice(0,10), 'max', max);
			if (max > 0) {
				for (let i = 0; i < data.length; i++) data[i] /= max;
			}
			console.log('Normalizar: después', data.slice(0,10));
			applyEffectToSelection(buf);
			showEffectFeedback(editorNormalizeBtn);
		});
	editorHPFBtn?.addEventListener('click', () => {
		const buf = getSelectedBuffer();
		if (!buf) return;
		const data = buf.getChannelData(0);
		let prev = 0, alpha = 0.85;
		for (let i = 0; i < data.length; i++) {
			let hp = data[i] - prev + alpha * (prev || 0);
			prev = data[i];
			data[i] = hp;
		}
		applyEffectToSelection(buf);
		showEffectFeedback(editorHPFBtn);
	});
	editorLPFBtn?.addEventListener('click', () => {
		const buf = getSelectedBuffer();
		if (!buf) return;
		const data = buf.getChannelData(0);
		let prev = data[0];
		for (let i = 1; i < data.length; i++) {
			data[i] = 0.7 * prev + 0.3 * data[i];
			prev = data[i];
		}
		applyEffectToSelection(buf);
		showEffectFeedback(editorLPFBtn);
	});
	editorAntipopBtn?.addEventListener('click', () => {
		const buf = getSelectedBuffer();
		if (!buf) return;
		const data = buf.getChannelData(0);
		for (let i = 1; i < data.length - 1; i++) {
			if (Math.abs(data[i]) > 0.85) {
				data[i] = (data[i - 1] + data[i + 1]) / 2;
			}
		}
		applyEffectToSelection(buf);
		showEffectFeedback(editorAntipopBtn);
	});
	editorCompressBtn?.addEventListener('click', () => {
		const buf = getSelectedBuffer();
		if (!buf) return;
		const data = buf.getChannelData(0);
		for (let i = 0; i < data.length; i++) {
			if (data[i] > 0.7) data[i] = 0.7 + 0.2 * (data[i] - 0.7);
			if (data[i] < -0.7) data[i] = -0.7 + 0.2 * (data[i] + 0.7);
		}
		applyEffectToSelection(buf);
		showEffectFeedback(editorCompressBtn);
	});

	// --- Pitch y Echo sliders ---
	const editorPitchSlider = document.getElementById('editor-pitch-slider');
	const editorPitchValue = document.getElementById('editor-pitch-value');
	const editorEchoSlider = document.getElementById('editor-echo-slider');
	const editorEchoValue = document.getElementById('editor-echo-value');

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

	// Efecto: Pitch (slider)
	editorPitchBtn?.addEventListener('click', () => {
	  const buf = getSelectedBuffer();
	  if (!buf) { console.log('Pitch: buffer vacío'); return; }
	  try {
		// Slider: semitonos de -12 a +12
		const semitones = editorPitchSlider ? parseInt(editorPitchSlider.value, 10) : 2;
		// Factor de resampleo: 2^(n/12)
		const factor = Math.pow(2, semitones / 12);
		const newLen = Math.floor(buf.length / factor);
		let ac;
		if (window.editorWaveSurfer && window.editorWaveSurfer.backend && window.editorWaveSurfer.backend.ac) {
		  ac = window.editorWaveSurfer.backend.ac;
		} else {
		  ac = new (window.AudioContext || window.webkitAudioContext)();
		}
		const newBuf = ac.createBuffer(1, newLen, buf.sampleRate);
		const src = buf.getChannelData(0);
		const dst = newBuf.getChannelData(0);
		for (let i = 0; i < newLen; i++) {
		  dst[i] = src[Math.floor(i * factor)] || 0;
		}
		applyEffectToSelection(newBuf);
		showEffectFeedback(editorPitchBtn, `Pitch ${semitones > 0 ? '+' : ''}${semitones}`);
	  } catch (err) {
		console.error('Error en efecto Pitch:', err);
		showEffectFeedback(editorPitchBtn, 'Error en Pitch');
	  }
	});

	// Efecto: Eco (slider)
	editorEchoBtn?.addEventListener('click', () => {
	  const buf = getSelectedBuffer();
	  if (!buf) { console.log('Eco: buffer vacío'); return; }
	  const data = buf.getChannelData(0);
	  // Slider: delay en ms
	  const delayMs = editorEchoSlider ? parseInt(editorEchoSlider.value, 10) : 180;
	  const delaySamples = Math.floor((delayMs / 1000) * buf.sampleRate);
	  for (let i = delaySamples; i < data.length; i++) {
		data[i] += 0.4 * data[i - delaySamples];
	  }
	  applyEffectToSelection(buf);
	  showEffectFeedback(editorEchoBtn, `Eco ${delayMs}ms`);
	});

	// --- Grabador de audio y playlist para pod-cast ---
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

	let mediaRecorder, audioChunks = [], audioStream = null, isRecording = false, isPaused = false, wavesurfer = null;
	let useCompressor = false;
	const DB_AUDIO = 'pod-cast';
	window.dbAudio = null;
	let audioContext = null, analyser = null, dataArray = null, animationId = null;

	// --- IndexedDB para grabaciones ---
	function initAudioDB() {
		const request = indexedDB.open(DB_AUDIO, 1);
		request.onupgradeneeded = function(e) {
			const db = e.target.result;
			if (!db.objectStoreNames.contains('recordings')) {
				db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
			}
		};
		request.onsuccess = function(e) {
			window.dbAudio = e.target.result;
			loadPlaylist();
		};
		request.onerror = function(e) {
			console.error('IndexedDB error:', e);
		};
	}

	function saveRecording(blob, name) {
		if (!window.dbAudio) return;
		const tx = window.dbAudio.transaction(['recordings'], 'readwrite');
		const store = tx.objectStore('recordings');
		const now = new Date();
		const defaultName = name || now.toISOString().replace(/[:.]/g, '-');
		store.add({ name: defaultName, date: now, blob });
		tx.oncomplete = loadPlaylist;
	}

	function loadPlaylist() {
		if (!window.dbAudio) return;
		const tx = window.dbAudio.transaction(['recordings'], 'readonly');
		const store = tx.objectStore('recordings');
		const req = store.getAll();
		req.onsuccess = function(e) {
			const recs = e.target.result;
			playlistUl.innerHTML = '';
			recs.sort((a, b) => new Date(b.date) - new Date(a.date));
			recs.forEach(rec => {
				const li = document.createElement('li');
				li.className = 'list-group-item d-flex align-items-center justify-content-between';
				li.style.background = 'transparent';
				li.innerHTML = `
					<audio controls src="${URL.createObjectURL(rec.blob)}" style="width: 60%;"></audio>
					<input type="text" value="${rec.name}" class="form-control form-control-sm w-25 me-2 rename-input" style="background:#232526; color:#e0e0e0; border:none;">
					<button class="btn btn-outline-danger btn-sm delete-recording"><i class="fa fa-trash"></i></button>
				`;
				// Renombrar
				li.querySelector('.rename-input').addEventListener('change', function() {
					const newName = this.value;
					const tx2 = window.dbAudio.transaction(['recordings'], 'readwrite');
					const store2 = tx2.objectStore('recordings');
					store2.get(rec.id).onsuccess = function(ev) {
						const data = ev.target.result;
						data.name = newName;
						store2.put(data);
					};
				});
				// Eliminar
				li.querySelector('.delete-recording').addEventListener('click', function() {
					const tx2 = window.dbAudio.transaction(['recordings'], 'readwrite');
					const store2 = tx2.objectStore('recordings');
					store2.delete(rec.id);
					tx2.oncomplete = loadPlaylist;
				});
				// Visualizar onda al hacer click en audio
				const audioElem = li.querySelector('audio');
				audioElem.addEventListener('play', function() {
					if (window.WaveSurfer && waveformDiv) {
						waveformDiv.innerHTML = '';
						if (!wavesurfer) {
							wavesurfer = WaveSurfer.create({
								container: waveformDiv,
								waveColor: '#00c3ff',
								progressColor: '#fffc00',
								backgroundColor: '#18191a',
								height: 60,
								barWidth: 2,
								barGap: 1,
								barRadius: 2,
								cursorColor: '#ff0066',
							});
						}
						wavesurfer.loadBlob(rec.blob);
						wavesurfer.play();
					}
				});
				playlistUl.appendChild(li);
			});
			// Refrescar el editor también
			populateEditorRecordings();
		};
	}

	// --- Modal de permiso ---
	btnPermission?.addEventListener('click', () => {
		permissionModal.show();
	});
	btnAllowMic?.addEventListener('click', async () => {
		try {
			let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			if (useCompressor) {
				const ctx = new (window.AudioContext || window.webkitAudioContext)();
				const source = ctx.createMediaStreamSource(stream);
				const compressor = ctx.createDynamicsCompressor();
				compressor.threshold.setValueAtTime(-30, ctx.currentTime);
				compressor.knee.setValueAtTime(20, ctx.currentTime);
				compressor.ratio.setValueAtTime(12, ctx.currentTime);
				compressor.attack.setValueAtTime(0.003, ctx.currentTime);
				compressor.release.setValueAtTime(0.25, ctx.currentTime);
				source.connect(compressor);
				const dest = ctx.createMediaStreamDestination();
				compressor.connect(dest);
				audioStream = dest.stream;
			} else {
				audioStream = stream;
			}
			enableRecorderControls();
			await loadWaveSurfer();
		} catch (e) {
			alert('No se pudo acceder al micrófono.');
		}
	});

	function enableRecorderControls() {
		recorderControls.style.opacity = 1;
		recorderControls.style.pointerEvents = 'auto';
		btnPermission.classList.remove('btn-secondary');
		btnPermission.classList.add('btn-success');
		btnPermission.innerHTML = '<i class="fa-solid fa-microphone"></i>';
		btnPermission.title = 'Grabador activo';
		btnPermission.style.background = 'linear-gradient(90deg,#1e5799,#2989d8,#207cca,#7db9e8)';
		btnPermission.style.color = '#fff';
	}

	// --- Carga dinámica de WaveSurfer ---
	async function loadWaveSurfer() {
		if (window.WaveSurfer) return;
		const script = document.createElement('script');
		script.src = 'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.min.js';
		document.body.appendChild(script);
		await new Promise(res => { script.onload = res; });
		if (!wavesurfer) {
			wavesurfer = WaveSurfer.create({
				container: waveformDiv,
				waveColor: '#00c3ff',
				progressColor: '#fffc00',
				backgroundColor: '#18191a',
				height: 60,
				barWidth: 2,
				barGap: 1,
				barRadius: 2,
				cursorColor: '#ff0066',
			});
		}
	}

	// Visualización de onda en tiempo real durante la grabación
	function startLiveWaveform() {
		if (!audioStream) return;
		if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
		const source = audioContext.createMediaStreamSource(audioStream);
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 256;
		dataArray = new Uint8Array(analyser.frequencyBinCount);
		source.connect(analyser);
		drawLiveWaveform();
	}
	function drawLiveWaveform() {
		const canvasId = 'live-waveform-canvas';
		let canvas = document.getElementById(canvasId);
		if (!canvas) {
			canvas = document.createElement('canvas');
			canvas.id = canvasId;
			canvas.width = waveformDiv.offsetWidth;
			canvas.height = waveformDiv.offsetHeight;
			canvas.style.position = 'absolute';
			canvas.style.left = 0;
			canvas.style.top = 0;
			canvas.style.zIndex = 2;
			waveformDiv.innerHTML = '';
			waveformDiv.appendChild(canvas);
		}
		const ctx = canvas.getContext('2d');
		function animate() {
			animationId = requestAnimationFrame(animate);
			analyser.getByteTimeDomainData(dataArray);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.lineWidth = 2;
			ctx.strokeStyle = '#00c3ff';
			ctx.beginPath();
			const sliceWidth = canvas.width * 1.0 / dataArray.length;
			let x = 0;
			for (let i = 0; i < dataArray.length; i++) {
				const v = dataArray[i] / 128.0;
				const y = v * canvas.height / 2;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
				x += sliceWidth;
			}
			ctx.lineTo(canvas.width, canvas.height / 2);
			ctx.stroke();
		}
		animate();
	}
	function stopLiveWaveform() {
		if (animationId) cancelAnimationFrame(animationId);
		animationId = null;
		if (audioContext) {
			audioContext.close();
			audioContext = null;
		}
		waveformDiv.innerHTML = '';
	}

	// --- Grabación de audio ---
		// --- Botón Grabar ---
		btnRecord?.addEventListener('click', async () => {
			if (!audioStream) return;
			if (!mediaRecorder) {
				mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
				mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
				mediaRecorder.onstop = () => {
					const blob = new Blob(audioChunks, { type: 'audio/webm' });
					saveRecording(blob);
					audioChunks = [];
					stopLiveWaveform();
					if (window.WaveSurfer && waveformDiv) {
						waveformDiv.innerHTML = '';
						if (!wavesurfer) {
							wavesurfer = WaveSurfer.create({
								container: waveformDiv,
								waveColor: '#00c3ff',
								progressColor: '#fffc00',
								backgroundColor: '#18191a',
								height: 60,
								barWidth: 2,
								barGap: 1,
								barRadius: 2,
								cursorColor: '#ff0066',
							});
						}
						wavesurfer.loadBlob(blob);
					}
				};
				mediaRecorder.onpause = () => {
					isPaused = true;
					btnPause.innerHTML = '<i class="fa-solid fa-play"></i>';
					btnPause.title = 'Reanudar';
				};
				mediaRecorder.onresume = () => {
					isPaused = false;
					btnPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
					btnPause.title = 'Pausar';
				};
			}
			if (!isRecording) {
				mediaRecorder.start();
				isRecording = true;
				isPaused = false;
				btnRecord.disabled = true;
				btnPause.disabled = false;
				btnStop.disabled = false;
				btnPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
				btnPause.title = 'Pausar';
				startLiveWaveform();
				btnRecord.classList.remove('btn-dark');
				btnRecord.classList.add('btn-danger');
				btnRecord.innerHTML = '<i class="fa-solid fa-circle"></i>';
				btnRecord.title = 'Grabando...';
				btnRecord.style.background = 'linear-gradient(90deg,#fffc00,#ff0066)';
				btnRecord.style.color = '#232526';
			}
		});

		// --- Botón Pausa/Reanudar ---
		btnPause?.addEventListener('click', () => {
			if (!mediaRecorder || !isRecording) return;
			if (!isPaused) {
				mediaRecorder.pause();
			} else {
				mediaRecorder.resume();
			}
		});

		// --- Botón Stop ---
		btnStop?.addEventListener('click', () => {
			if (!mediaRecorder || !isRecording) return;
			mediaRecorder.stop();
			isRecording = false;
			isPaused = false;
			btnRecord.disabled = false;
			btnPause.disabled = true;
			btnStop.disabled = true;
			btnRecord.classList.remove('btn-danger');
			btnRecord.classList.add('btn-dark');
			btnRecord.innerHTML = '<i class="fa-solid fa-circle"></i>';
			btnRecord.title = 'Grabar';
			btnRecord.style.background = '';
			btnRecord.style.color = '';
			btnPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
			btnPause.title = 'Pausar';
		});

	// --- Control de volumen de grabación ---
	inputVolume?.addEventListener('input', () => {
		if (audioStream) {
			const audioTracks = audioStream.getAudioTracks();
			if (audioTracks.length > 0 && audioTracks[0].applyConstraints) {
				audioTracks[0].applyConstraints({ volume: parseFloat(inputVolume.value) });
			}
		}
		inputVolume.style.background = `linear-gradient(90deg,#00c3ff ${(inputVolume.value*100)}%,#232526 ${(inputVolume.value*100)}%)`;
	});

	// --- Compresión/Mejora de audio real ---
	btnCompress?.addEventListener('click', () => {
		useCompressor = !useCompressor;
		btnCompress.classList.toggle('btn-warning', useCompressor);
		btnCompress.classList.toggle('btn-dark', !useCompressor);
		btnCompress.title = useCompressor ? 'Compresión activada' : 'Mejorar audio';
		btnCompress.innerHTML = useCompressor
			? '<i class="fa-solid fa-wand-magic-sparkles"></i> ON'
			: '<i class="fa-solid fa-wand-magic-sparkles"></i>';
	});

		// --- Inicialización ---
		initAudioDB();
		// Refrescar la lista del editor al cargar por primera vez
		setTimeout(populateEditorRecordings, 500);

// --- Asistente Podcast IA (integración segura) ---
	const assistantChatMessages = document.getElementById('assistant-chat-messages');
	const assistantChatForm = document.getElementById('assistant-chat-form');
	const assistantChatInput = document.getElementById('assistant-chat-input');
		// Base de datos coherente con la app principal
		const DB_ASSISTANT = 'podcastDB';
		let dbAssistant = null;
		// --- Línea editorial y fuente (localStorage) ---
		const editorialTextarea = document.getElementById('editorial-textarea');
		const saveEditorialBtn = document.getElementById('save-editorial-btn');
		const sourceTextarea = document.getElementById('source-textarea');
		const saveSourceBtn = document.getElementById('save-source-btn');
		// --- Favoritos ---
		const favoritesList = document.getElementById('favorites-list');
		// Inicializar base de datos para respuestas favoritas
		function initAssistantDB() {
			const request = indexedDB.open(DB_ASSISTANT, 1);
			request.onupgradeneeded = function(e) {
				const db = e.target.result;
				if (!db.objectStoreNames.contains('likedAssistantResponses')) {
					db.createObjectStore('likedAssistantResponses', { keyPath: 'id', autoIncrement: true });
				}
			};
			request.onsuccess = function(e) {
				dbAssistant = e.target.result;
			};
			request.onerror = function(e) {
				console.error('IndexedDB error (assistant):', e);
			};
		}
		initAssistantDB();

		// --- Línea editorial y fuente: guardar/cargar ---
		function loadEditorial() {
			if (editorialTextarea) editorialTextarea.value = localStorage.getItem('assistantEditorial') || '';
		}
		function saveEditorial() {
			if (editorialTextarea) localStorage.setItem('assistantEditorial', editorialTextarea.value);
		}
		function loadSource() {
			if (sourceTextarea) sourceTextarea.value = localStorage.getItem('assistantSource') || '';
		}
		function saveSource() {
			if (sourceTextarea) localStorage.setItem('assistantSource', sourceTextarea.value);
		}
		if (saveEditorialBtn) saveEditorialBtn.addEventListener('click', () => { saveEditorial(); });
		if (saveSourceBtn) saveSourceBtn.addEventListener('click', () => { saveSource(); });
		// Cargar al abrir modales
		document.getElementById('btn-editorial-modal')?.addEventListener('click', loadEditorial);
		document.getElementById('btn-source-modal')?.addEventListener('click', loadSource);

		// --- Favoritos: guardar y mostrar ---
		async function saveFavoriteResponse(aiMessage, userPrompt) {
			if (!dbAssistant) return;
			const tx = dbAssistant.transaction(['likedAssistantResponses'], 'readwrite');
			const store = tx.objectStore('likedAssistantResponses');
			await store.add({ aiMessage, userPrompt, timestamp: new Date() });
		}
		async function loadFavorites() {
			if (!dbAssistant || !favoritesList) return;
			const tx = dbAssistant.transaction(['likedAssistantResponses'], 'readonly');
			const store = tx.objectStore('likedAssistantResponses');
			const req = store.getAll();
			req.onsuccess = function(event) {
				const res = event.target.result;
				favoritesList.innerHTML = '';
				if (res.length === 0) {
					favoritesList.innerHTML = '<div class="text-muted">No hay respuestas guardadas.</div>';
					return;
				}
				res.reverse().forEach(r => {
					const card = document.createElement('div');
					card.className = 'card mb-2';
					card.innerHTML = `<div class="card-body"><div class="mb-2"><label class="form-label"><strong>Prompt:</strong></label><textarea class="form-control user-prompt-textarea" rows="2" readonly>${sanitizeText(r.userPrompt)}</textarea></div><div class="mb-2"><label class="form-label"><strong>Respuesta:</strong></label><div class="form-control ai-message-div" style="height: 120px; overflow-y: auto;" readonly>${sanitizeText(r.aiMessage)}</div></div><small class="text-muted d-block mt-1">${new Date(r.timestamp).toLocaleString()}</small></div>`;
					favoritesList.appendChild(card);
				});
			};
		}
		document.getElementById('btn-knowledge-modal')?.addEventListener('click', loadFavorites);

	// Sanitizar texto para evitar XSS (no HTML, solo texto plano)
	function sanitizeText(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

		function addAssistantMessage(message, sender, userPrompt) {
			const bubble = document.createElement('div');
			bubble.className = 'chat-bubble ' + (sender === 'user' ? 'user-bubble' : 'ai-bubble');
			bubble.innerHTML = sanitizeText(message);
			if (sender === 'ai') {
				const favBtn = document.createElement('button');
				favBtn.className = 'btn btn-sm btn-outline-warning ms-2';
				favBtn.innerHTML = '<i class="fa-solid fa-star"></i>';
				favBtn.title = 'Guardar en favoritos';
				favBtn.onclick = () => saveFavoriteResponse(message, userPrompt || '');
				bubble.appendChild(favBtn);
			}
			assistantChatMessages.appendChild(bubble);
			assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;
		}

		async function getAssistantResponse(userMessage) {
			if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY.includes('TU_API_KEY_AQUI')) {
				addAssistantMessage('Por favor, configura tu API Key en config.js', 'ai');
				return;
			}
			addAssistantMessage('Pensando...', 'ai');
			// Contexto: línea editorial y fuente
			const editorial = localStorage.getItem('assistantEditorial') || '';
			const source = localStorage.getItem('assistantSource') || '';
			let prompt = '';
			if (editorial) prompt += `Línea editorial: ${editorial}\n`;
			if (source) prompt += `Fuente: ${source}\n`;
			prompt += `Usuario: "${userMessage}"`;
			const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window.GEMINI_API_KEY}`;
			try {
				const response = await fetch(API_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
				});
				// Eliminar burbuja "Pensando..."
				assistantChatMessages.lastChild?.remove();
				if (!response.ok) {
					const errorData = await response.json();
					addAssistantMessage(`Error: ${sanitizeText(errorData.error?.message || 'No se pudo obtener respuesta.')}`, 'ai');
					return;
				}
				const data = await response.json();
				const rawMessage = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No obtuve una respuesta válida.';
				addAssistantMessage(rawMessage, 'ai', userMessage);
			} catch (error) {
				assistantChatMessages.lastChild?.remove();
				addAssistantMessage('No se pudo conectar con el asistente.', 'ai');
			}
		}

		if (assistantChatForm) {
			assistantChatForm.addEventListener('submit', async (e) => {
				e.preventDefault();
				const userMessage = assistantChatInput.value.trim();
				if (userMessage) {
					addAssistantMessage(userMessage, 'user');
					assistantChatInput.value = '';
					await getAssistantResponse(userMessage);
				}
			});
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

// --- UTILIDAD GLOBAL: convertir AudioBuffer a WAV Blob ---
window.bufferToWavBlob = function bufferToWavBlob(buffer) {
  // Solo mono
  const numOfChan = 1;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  // RIFF identifier
  window.writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * 2, true);
  window.writeString(view, 8, 'WAVE');
  window.writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);
  window.writeString(view, 36, 'data');
  view.setUint32(40, buffer.length * 2, true);
  // PCM samples
  let offset = 44;
  const chan = buffer.getChannelData(0);
  for (let i = 0; i < chan.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, chan[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([bufferArray], { type: 'audio/wav' });
}
window.writeString = function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
