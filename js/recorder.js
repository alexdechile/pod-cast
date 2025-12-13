let mediaRecorder, audioChunks = [], audioStream = null, isRecording = false, isPaused = false, wavesurfer = null;
let useCompressor = false;
const DB_AUDIO = 'pod-cast';
window.dbAudio = null;
let audioContext = null, analyser = null, dataArray = null, animationId = null;

// --- IndexedDB para grabaciones ---
function initAudioDB() {
	const request = indexedDB.open(DB_AUDIO, 1);
	request.onupgradeneeded = function (e) {
		const db = e.target.result;
		if (!db.objectStoreNames.contains('recordings')) {
			db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
		}
	};
	request.onsuccess = function (e) {
		window.dbAudio = e.target.result;
		loadPlaylist();
	};
	request.onerror = function (e) {
		console.error('IndexedDB error:', e);
	};
}

function saveRecording(blob, name) {
	if (!window.dbAudio) {
		window.toast?.error('Error: Base de datos no disponible');
		return;
	}
	try {
		const tx = window.dbAudio.transaction(['recordings'], 'readwrite');
		const store = tx.objectStore('recordings');
		const now = new Date();
		const defaultName = name || now.toISOString().replace(/[:.]/g, '-');
		store.add({ name: defaultName, date: now, blob });
		tx.oncomplete = () => {
			loadPlaylist();
			window.toast?.success('Grabación guardada exitosamente');
		};
		tx.onerror = () => {
			window.toast?.error('Error al guardar la grabación');
		};
	} catch (e) {
		window.toast?.error('Error al guardar: ' + e.message);
	}
}

function loadPlaylist() {
	if (!window.dbAudio) return;
	const tx = window.dbAudio.transaction(['recordings'], 'readonly');
	const store = tx.objectStore('recordings');
	const req = store.getAll();
	req.onsuccess = function (e) {
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
			li.querySelector('.rename-input').addEventListener('change', function () {
				const newName = this.value;
				const tx2 = window.dbAudio.transaction(['recordings'], 'readwrite');
				const store2 = tx2.objectStore('recordings');
				store2.get(rec.id).onsuccess = function (ev) {
					const data = ev.target.result;
					data.name = newName;
					store2.put(data);
				};
			});
			// Eliminar con confirmación
			li.querySelector('.delete-recording').addEventListener('click', async function () {
				const confirmed = await window.confirm.show({
					title: '¿Eliminar grabación?',
					message: `¿Estás seguro de eliminar "${rec.name}"? Esta acción no se puede deshacer.`,
					confirmText: 'Eliminar',
					cancelText: 'Cancelar',
					type: 'danger',
					icon: 'fa-trash'
				});
				if (confirmed) {
					try {
						const tx2 = window.dbAudio.transaction(['recordings'], 'readwrite');
						const store2 = tx2.objectStore('recordings');
						store2.delete(rec.id);
						tx2.oncomplete = () => {
							loadPlaylist();
							window.toast?.success('Grabación eliminada');
						};
					} catch (e) {
						window.toast?.error('Error al eliminar: ' + e.message);
					}
				}
			});
			// Visualizar onda al hacer click en audio
			const audioElem = li.querySelector('audio');
			audioElem.addEventListener('play', function () {
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
		window.toast?.success('Micrófono activado correctamente');
		// Agregar el timer al DOM
		const timerContainer = document.getElementById('timer-container');
		if (timerContainer && window.recordingTimer) {
			timerContainer.appendChild(window.recordingTimer.element);
		}
	} catch (e) {
		window.toast?.error('No se pudo acceder al micrófono. Verifica los permisos.');
		console.error('Error al acceder al micrófono:', e);
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
		// Iniciar timer
		window.recordingTimer?.start();
		window.toast?.info('Grabación iniciada');
	}
});

// --- Botón Pausa/Reanudar ---
btnPause?.addEventListener('click', () => {
	if (!mediaRecorder || !isRecording) return;
	if (!isPaused) {
		mediaRecorder.pause();
		window.recordingTimer?.pause();
		window.toast?.warning('Grabación pausada');
	} else {
		mediaRecorder.resume();
		window.recordingTimer?.resume();
		window.toast?.info('Grabación reanudada');
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
	// Detener timer
	window.recordingTimer?.stop();
	window.toast?.success('Grabación finalizada');
});

// --- Control de volumen de grabación ---
inputVolume?.addEventListener('input', () => {
	if (audioStream) {
		const audioTracks = audioStream.getAudioTracks();
		if (audioTracks.length > 0 && audioTracks[0].applyConstraints) {
			audioTracks[0].applyConstraints({ volume: parseFloat(inputVolume.value) });
		}
	}
	inputVolume.style.background = `linear-gradient(90deg,#00c3ff ${(inputVolume.value * 100)}%,#232526 ${(inputVolume.value * 100)}%)`;
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
