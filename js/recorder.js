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
	console.log('💾 saveRecording() iniciado, blob size:', blob.size);
	return new Promise(async (resolve, reject) => {
		if (!window.dbAudio) {
			console.error('❌ window.dbAudio no disponible');
			window.toast?.error('Error: Base de datos no disponible');
			reject(new Error('DB not available'));
			return;
		}
		try {
			console.log('⏱️ Obteniendo duración del audio...');
			// Obtener duración del audio con timeout de 3 segundos
			const durationPromise = getAudioDuration(blob);
			const timeoutPromise = new Promise(r => setTimeout(() => r(0), 3000));
			// Si falla o tarda mucho, usa 0 (se corregirá al reproducir)
			const duration = await Promise.race([durationPromise, timeoutPromise]);
			console.log('⏱️ Duración obtenida:', duration, 'segundos');

			const tx = window.dbAudio.transaction(['recordings'], 'readwrite');
			const store = tx.objectStore('recordings');
			const now = new Date();
			const defaultName = name || now.toISOString().replace(/[:.]/g, '-');

			console.log('💾 Guardando en IndexedDB con nombre:', defaultName);
			// Guardar con metadata
			const req = store.add({
				name: defaultName,
				date: now,
				blob,
				duration: duration,
				size: blob.size,
				format: blob.type
			});

			tx.oncomplete = () => {
				console.log('✅ Transacción DB completada exitosamente');
				console.log('🔄 Llamando a loadPlaylist()...');
				loadPlaylist();

				const sizeStr = window.playlistManager?.formatSize(blob.size) || '';
				const durStr = window.playlistManager?.formatDuration(duration) || '';
				window.toast?.success(`Grabación guardada: ${durStr} • ${sizeStr}`);
				resolve();
			};
			tx.onerror = (e) => {
				console.error('❌ Error en transacción DB:', e.target.error);
				window.toast?.error('Error al guardar la grabación');
				reject(e.target.error);
			};
		} catch (e) {
			console.error('❌ Excepción en saveRecording:', e);
			window.toast?.error('Error al guardar: ' + e.message);
			reject(e);
		}
	});
}

// Función auxiliar para obtener duración del audio
function getAudioDuration(blob) {
	return new Promise((resolve) => {
		const audio = new Audio();
		audio.addEventListener('loadedmetadata', () => {
			resolve(audio.duration);
		});
		audio.addEventListener('error', () => {
			resolve(0);
		});
		audio.src = URL.createObjectURL(blob);
	});
}

function loadPlaylist() {
	if (!window.dbAudio) return;
	const tx = window.dbAudio.transaction(['recordings'], 'readonly');
	const store = tx.objectStore('recordings');
	const req = store.getAll();
	req.onsuccess = function (e) {
		const recs = e.target.result;

		// Actualizar playlist manager
		if (window.playlistManager) {
			window.playlistManager.setRecordings(recs);
		}

		playlistUl.innerHTML = '';
		recs.sort((a, b) => new Date(b.date) - new Date(a.date));

		recs.forEach(rec => {
			const li = document.createElement('li');
			li.className = 'list-group-item';
			li.style.cssText = `
				background: transparent;
				padding: 12px;
				border: 1px solid rgba(255, 255, 255, 0.05);
				border-radius: 8px;
				margin-bottom: 8px;
			`;

			const durationStr = window.playlistManager?.formatDuration(rec.duration) || '00:00';
			const sizeStr = window.playlistManager?.formatSize(rec.size) || '0 KB';
			const dateStr = new Date(rec.date).toLocaleString('es-CL', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});

			li.innerHTML = `
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<div style="display: flex; align-items: center; gap: 8px;">
						<input type="text" value="${rec.name}" class="form-control form-control-sm rename-input" style="
							background: rgba(255, 255, 255, 0.05);
							color: #e0e0e0;
							border: 1px solid rgba(255, 255, 255, 0.1);
							border-radius: 6px;
							padding: 6px 10px;
							flex: 1;
							font-family: 'Montserrat', sans-serif;
							font-size: 13px;
						">
						<button class="btn btn-outline-danger btn-sm delete-recording" style="padding: 6px 12px;">
							<i class="fa fa-trash"></i>
						</button>
					</div>
					<audio controls src="${URL.createObjectURL(rec.blob)}" style="
						width: 100%;
						height: 32px;
						border-radius: 6px;
					"></audio>
					<div style="
						display: flex;
						gap: 12px;
						font-size: 11px;
						color: #b0b3b8;
						font-family: 'Montserrat', sans-serif;
						flex-wrap: wrap;
					">
						<span><i class="fa-solid fa-clock" style="color: #00c3ff;"></i> ${durationStr}</span>
						<span><i class="fa-solid fa-database" style="color: #fffc00;"></i> ${sizeStr}</span>
						<span><i class="fa-solid fa-calendar" style="color: #ff9900;"></i> ${dateStr}</span>
					</div>
				</div>
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
window.UI.recorder.btnPermission?.addEventListener('click', () => {
	window.UI.modals.permissionModal.show();
});
window.UI.recorder.btnAllowMic?.addEventListener('click', async (e) => {
	// Prevenir múltiples clics
	if (window.UI.recorder.btnAllowMic.disabled) return;
	window.UI.recorder.btnAllowMic.disabled = true;
	window.UI.recorder.btnAllowMic.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Solicitando permiso...';

	try {
		// ... (rest of logic unchanged, just variable names) ...
		console.log('Solicitando permiso de micrófono...');

		// IMPORTANTE: Esta línea pide permiso al navegador
		let stream = await navigator.mediaDevices.getUserMedia({ audio: true });

		console.log('Permiso concedido, configurando audio...');

		if (useCompressor) {
			// ...
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

		// Cerrar el modal
		window.UI.modals.permissionModal.hide();

		window.toast?.success('✅ Micrófono activado correctamente');

		// Agregar el timer al DOM
		if (window.UI.recorder.timerContainer && window.recordingTimer) {
			window.UI.recorder.timerContainer.appendChild(window.recordingTimer.element);
		}

		console.log('Micrófono configurado exitosamente');

	} catch (e) {
		console.error('Error al acceder al micrófono:', e);

		// Restaurar botón
		window.UI.recorder.btnAllowMic.disabled = false;
		window.UI.recorder.btnAllowMic.innerHTML = '<i class="fa-solid fa-microphone"></i> Activar Micrófono';

		// Mensaje de error específico
		let errorMsg = '❌ No se pudo acceder al micrófono.';

		if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
			errorMsg = '❌ Permiso denegado. Por favor, permite el acceso al micrófono en tu navegador.';
		} else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
			errorMsg = '❌ No se encontró ningún micrófono. Verifica que esté conectado.';
		} else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
			errorMsg = '❌ El micrófono está siendo usado por otra aplicación.';
		} else if (e.name === 'OverconstrainedError') {
			errorMsg = '❌ No se encontró un micrófono compatible.';
		} else if (e.name === 'SecurityError') {
			errorMsg = '❌ Error de seguridad. Asegúrate de estar usando HTTPS o localhost.';
		}

		window.toast?.error(errorMsg, 6000);

		// Mostrar ayuda adicional
		setTimeout(() => {
			window.toast?.info('💡 Tip: Busca el ícono del micrófono en la barra de direcciones de tu navegador', 5000);
		}, 1000);
	}
});

function enableRecorderControls() {
	window.UI.recorder.recorderControls.style.opacity = 1;
	window.UI.recorder.recorderControls.style.pointerEvents = 'auto';
	window.UI.recorder.btnPermission.classList.remove('btn-secondary');
	window.UI.recorder.btnPermission.classList.add('btn-success');
	window.UI.recorder.btnPermission.innerHTML = '<i class="fa-solid fa-microphone"></i>';
	window.UI.recorder.btnPermission.title = 'Grabador activo';
	window.UI.recorder.btnPermission.style.background = 'linear-gradient(90deg,#1e5799,#2989d8,#207cca,#7db9e8)';
	window.UI.recorder.btnPermission.style.color = '#fff';
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
			container: window.UI.recorder.waveformDiv,
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
		canvas.width = window.UI.recorder.waveformDiv.offsetWidth;
		canvas.height = window.UI.recorder.waveformDiv.offsetHeight;
		canvas.style.position = 'absolute';
		canvas.style.left = 0;
		canvas.style.top = 0;
		canvas.style.zIndex = 2;
		window.UI.recorder.waveformDiv.innerHTML = '';
		window.UI.recorder.waveformDiv.appendChild(canvas);
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
	window.UI.recorder.waveformDiv.innerHTML = '';
}

// --- Grabación de audio ---
// --- Botón Grabar ---
window.UI.recorder.btnRecord?.addEventListener('click', async () => {
	if (!audioStream) return;
	if (!mediaRecorder) {
		mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
		mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
		mediaRecorder.onstop = async () => {
			console.log('🔴 STOP: Iniciando proceso de guardado...');
			console.log('🔴 audioChunks.length:', audioChunks.length);

			// UI Feedback: Guardando
			window.UI.recorder.btnRecord.disabled = true;
			window.UI.recorder.btnRecord.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
			window.UI.recorder.btnRecord.title = 'Guardando...';

			const blob = new Blob(audioChunks, { type: 'audio/webm' });
			console.log('🔴 Blob creado, tamaño:', blob.size, 'bytes');

			try {
				// IMPORTANTE: Await para asegurar que se complete
				await saveRecording(blob);
				console.log('✅ saveRecording() completado');

				// Forzar actualización de la UI con un pequeño delay
				setTimeout(() => {
					console.log('🔄 Forzando actualización de UI...');
					loadPlaylist();
					if (typeof populateEditorRecordings === 'function') {
						populateEditorRecordings();
					}
				}, 100);

			} catch (err) {
				console.error("❌ Error al guardar:", err);
				window.toast?.error('Error al guardar la grabación: ' + err.message);
			}

			audioChunks = [];
			stopLiveWaveform();

			// Restore UI
			window.UI.recorder.btnRecord.disabled = false;
			window.UI.recorder.btnPause.disabled = true;
			window.UI.recorder.btnStop.disabled = true;

			window.UI.recorder.btnRecord.classList.remove('btn-danger');
			window.UI.recorder.btnRecord.classList.add('btn-dark');
			window.UI.recorder.btnRecord.innerHTML = '<i class="fa-solid fa-circle"></i>';
			window.UI.recorder.btnRecord.title = 'Grabar';
			window.UI.recorder.btnRecord.style.background = '';
			window.UI.recorder.btnRecord.style.color = '';
			window.UI.recorder.btnPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
			window.UI.recorder.btnPause.title = 'Pausar';

			// Detener timer y VU Meter
			window.recordingTimer?.stop();
			if (window.vuMeter) {
				window.vuMeter.stop();
			}

			if (window.WaveSurfer && window.UI.recorder.waveformDiv) {
				window.UI.recorder.waveformDiv.innerHTML = '';
				if (!wavesurfer) {
					wavesurfer = WaveSurfer.create({
						container: window.UI.recorder.waveformDiv,
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
			window.UI.recorder.btnPause.innerHTML = '<i class="fa-solid fa-play"></i>';
			window.UI.recorder.btnPause.title = 'Reanudar';
		};
		mediaRecorder.onresume = () => {
			isPaused = false;
			window.UI.recorder.btnPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
			window.UI.recorder.btnPause.title = 'Pausar';
		};
	}
	if (!isRecording) {
		mediaRecorder.start();
		isRecording = true;
		isPaused = false;
		window.UI.recorder.btnRecord.disabled = true;
		window.UI.recorder.btnPause.disabled = false;
		window.UI.recorder.btnStop.disabled = false;
		window.UI.recorder.btnPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
		window.UI.recorder.btnPause.title = 'Pausar';
		startLiveWaveform();
		window.UI.recorder.btnRecord.classList.remove('btn-dark');
		window.UI.recorder.btnRecord.classList.add('btn-danger');
		window.UI.recorder.btnRecord.innerHTML = '<i class="fa-solid fa-circle"></i>';
		window.UI.recorder.btnRecord.title = 'Grabando...';
		window.UI.recorder.btnRecord.style.background = 'linear-gradient(90deg,#fffc00,#ff0066)';
		window.UI.recorder.btnRecord.style.color = '#232526';
		// Iniciar timer y VU Meter
		window.recordingTimer?.start();
		if (window.vuMeter && audioStream) {
			window.vuMeter.start(audioStream);
		}
		window.toast?.info('🎙️ Grabación iniciada');
	}
});

// --- Botón Pausa/Reanudar ---
window.UI.recorder.btnPause?.addEventListener('click', () => {
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
window.UI.recorder.btnStop?.addEventListener('click', () => {
	if (!mediaRecorder || !isRecording) return;
	mediaRecorder.stop();
	isRecording = false;
	isPaused = false;
	// UI Update happens in onstop event after saving
});

// --- Control de volumen de grabación ---
window.UI.recorder.inputVolume?.addEventListener('input', () => {
	const volInput = window.UI.recorder.inputVolume;
	if (audioStream) {
		const audioTracks = audioStream.getAudioTracks();
		if (audioTracks.length > 0 && audioTracks[0].applyConstraints) {
			audioTracks[0].applyConstraints({ volume: parseFloat(volInput.value) });
		}
	}
	volInput.style.background = `linear-gradient(90deg,#00c3ff ${(volInput.value * 100)}%,#232526 ${(volInput.value * 100)}%)`;
});

// --- Compresión/Mejora de audio real ---
window.UI.recorder.btnCompress?.addEventListener('click', () => {
	const btn = window.UI.recorder.btnCompress;
	useCompressor = !useCompressor;
	btn.classList.toggle('btn-warning', useCompressor);
	btn.classList.toggle('btn-dark', !useCompressor);
	btn.title = useCompressor ? 'Compresión activada' : 'Mejorar audio';
	btn.innerHTML = useCompressor
		? '<i class="fa-solid fa-wand-magic-sparkles"></i> ON'
		: '<i class="fa-solid fa-wand-magic-sparkles"></i>';
});

// --- Tonos y Efectos (UI Elements ya definidos en ui.js) ---

// --- Simulación de sonido Pac-Man ---
if (window.UI.tones.btnPacman) {
	window.UI.tones.btnPacman.addEventListener('click', () => {
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		// ... (rest unchanged) ...
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'square';
		osc.frequency.setValueAtTime(880, ctx.currentTime);
		osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.18);
		gain.gain.setValueAtTime(0.22, ctx.currentTime);
		gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.19);
		osc.connect(gain).connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.2);
		setTimeout(() => ctx.close(), 300);
	});
}

// --- Simulación de tecla de grabadora de cassette ---
if (window.UI.tones.btnTeclaCassette) {
	window.UI.tones.btnTeclaCassette.addEventListener('click', () => {
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		const bufferSize = 2048;
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * 0.7;
		}
		const noise = ctx.createBufferSource();
		noise.buffer = buffer;
		const filter = ctx.createBiquadFilter();
		filter.type = 'highpass';
		filter.frequency.value = 1200;
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
if (window.UI.tones.btnCortinaCierre) {
	window.UI.tones.btnCortinaCierre.addEventListener('click', () => {
		const notes = [440.00, 392.00, 329.63, 261.63, 329.63, 392.00, 440.00];
		// ... (rest unchanged) ...
		const longDur = 0.64;
		const shortDur = 0.32;
		const durations = [longDur, longDur, longDur, shortDur, shortDur, shortDur, shortDur];
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		let now = ctx.currentTime;
		let t = now;
		notes.forEach((freq, i) => {
			const osc1 = ctx.createOscillator();
			const gain1 = ctx.createGain();
			osc1.type = 'triangle';
			osc1.frequency.value = freq;
			gain1.gain.value = 0.16;
			osc1.connect(gain1).connect(ctx.destination);
			osc1.start(t);
			osc1.stop(t + durations[i] - 0.04);
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
if (window.UI.tones.btnCortina) {
	window.UI.tones.btnCortina.addEventListener('click', () => {
		const notes = [261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 261.63];
		const longDur = 0.64;
		const shortDur = 0.32;
		const durations = [longDur, longDur, longDur, shortDur, shortDur, shortDur, shortDur];
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		let now = ctx.currentTime;
		let t = now;
		notes.forEach((freq, i) => {
			const osc1 = ctx.createOscillator();
			const gain1 = ctx.createGain();
			osc1.type = 'triangle';
			osc1.frequency.value = freq;
			gain1.gain.value = 0.16;
			osc1.connect(gain1).connect(ctx.destination);
			osc1.start(t);
			osc1.stop(t + durations[i] - 0.04);
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
