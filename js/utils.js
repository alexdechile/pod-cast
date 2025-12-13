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

// --- FEEDBACK VISUAL AL APLICAR EFECTOS ---
function showEffectFeedback(btn, msg = 'Efecto aplicado') {
    if (!btn) return;
    btn.classList.add('btn-success');
    btn.classList.remove('btn-outline-info','btn-outline-success','btn-outline-warning','btn-outline-danger','btn-outline-secondary');
    btn.disabled = true;
    const oldText = btn.innerHTML;
    btn.innerHTML = "<i class=\"fa-solid fa-check\"></i> ${msg}";
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

// --- UTILIDAD GLOBAL: convertir AudioBuffer a WAV Blob ---
function bufferToWavBlob(buffer) {
  // Solo mono
  const numOfChan = 1;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
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
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
