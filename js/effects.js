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
