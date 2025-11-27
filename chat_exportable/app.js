// Lógica de la aplicación Copiloto Comerza

document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a Elementos del DOM ---
    const loadFileButton = document.getElementById('load-file-button');
    const fileInput = document.getElementById('file-input');
    // El div #editor será manejado por Quill

    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const editorialTextarea = document.getElementById('editorial-textarea');
    const saveEditorialButton = document.getElementById('save-editorial-button');
    const editorialModal = new bootstrap.Modal(document.getElementById('editorial-modal'));
    const sourceTextarea = document.getElementById('source-textarea');
    const saveSourceButton = document.getElementById('save-source-button');
    const sourceModal = new bootstrap.Modal(document.getElementById('source-modal'));
    const knowledgeBaseButton = document.getElementById('knowledge-base-button');
    const likedResponsesList = document.getElementById('liked-responses-list');
    const knowledgeBaseModal = new bootstrap.Modal(document.getElementById('knowledge-base-modal'));

    // --- Variables de Estado y Quill ---
    let db;
    let quill;

    // --- Inicialización de Quill.js ---
    const initializeQuill = () => {
        quill = new Quill('#editor', {
            theme: 'snow', // Tema con la barra de herramientas
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }], // Títulos h1, h2, h3
                    ['bold', 'italic', 'underline'], // Negrita, cursiva, subrayado
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Listas ordenadas y con viñetas
                    ['clean'] // Botón para limpiar formato
                ]
            },
            placeholder: 'Cargue un archivo o comience a escribir...'
        });
    };

    // --- Lógica de Carga de Archivos (Adaptada para Quill) ---
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file || !quill) return;

        quill.setText(`Cargando archivo: ${file.name}...`); // Feedback al usuario
        const reader = new FileReader();
        const extension = file.name.split('.').pop().toLowerCase();

        reader.onload = async (e) => {
            try {
                switch (extension) {
                    case 'txt':
                        quill.setText(e.target.result);
                        break;
                    case 'md':
                        const htmlFromMd = marked.parse(e.target.result);
                        quill.clipboard.dangerouslyPasteHTML(htmlFromMd);
                        break;
                    case 'html':
                        quill.clipboard.dangerouslyPasteHTML(e.target.result);
                        break;
                    case 'pdf':
                        const pdfData = new Uint8Array(e.target.result);
                        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                        }
                        quill.setText(fullText.trim());
                        break;
                    default:
                        throw new Error(`Formato de archivo .${extension} no soportado.`);
                }
            } catch (error) {
                console.error('Error al procesar el archivo:', error);
                quill.setText(`Error al leer el archivo: ${error.message}`);
            }
        };

        reader.onerror = (error) => {
            console.error('Error del FileReader:', error);
            quill.setText('No se pudo leer el archivo.');
        };

        if (extension === 'pdf') {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    };

    // --- Lógica de Línea Editorial, Fuente de Info y Base de Conocimiento (sin cambios) ---
    const loadEditorialLine = () => { if (localStorage.getItem('editorialLine')) editorialTextarea.value = localStorage.getItem('editorialLine'); };
    const saveEditorialLine = () => { localStorage.setItem('editorialLine', editorialTextarea.value); editorialModal.hide(); };
    const loadSource = () => { if (localStorage.getItem('sourceInfo')) sourceTextarea.value = localStorage.getItem('sourceInfo'); };
    const saveSource = () => { localStorage.setItem('sourceInfo', sourceTextarea.value); sourceModal.hide(); };
    const updateLikedResponse = async (id, newAiMessage, newUserPrompt) => { if (!db) return; const tx = db.transaction(['likedResponses'], 'readwrite'); const store = tx.objectStore('likedResponses'); const req = store.get(id); req.onsuccess = () => { const data = req.result; data.aiMessage = newAiMessage; data.userPrompt = newUserPrompt; store.put(data); }; };
    const loadLikedResponses = async () => { if (!db) return; const tx = db.transaction(['likedResponses'], 'readonly'); const store = tx.objectStore('likedResponses'); const req = store.getAll(); req.onsuccess = (event) => { const res = event.target.result; likedResponsesList.innerHTML = ''; if (res.length === 0) { likedResponsesList.innerHTML = `<div class="card mb-2"><div class="card-body"><p class="card-text">No hay respuestas guardadas.</p></div></div>`; return; } res.reverse().forEach(r => { const card = document.createElement('div'); card.className = 'card mb-2'; card.innerHTML = `<div class="card-body"><div class="mb-2"><label class="form-label"><strong>Prompt:</strong></label><textarea class="form-control user-prompt-textarea" rows="2">${r.userPrompt}</textarea></div><div class="mb-2"><label class="form-label"><strong>Respuesta:</strong></label><div class="form-control ai-message-div" contenteditable="true" style="height: 250px; overflow-y: auto;">${r.aiMessage}</div></div><small class="text-muted d-block mt-1">${new Date(r.timestamp).toLocaleString()}</small></div><div class="card-footer text-end"><button class="btn btn-sm btn-primary save-liked-response" data-response-id="${r.id}"><i class="bi bi-save"></i></button> <button class="btn btn-sm btn-danger delete-liked-response" data-response-id="${r.id}"><i class="bi bi-trash"></i></button></div>`; likedResponsesList.appendChild(card); }); likedResponsesList.querySelectorAll('.save-liked-response').forEach(b => b.addEventListener('click', (e) => { const id = parseInt(e.currentTarget.dataset.responseId); const card = e.currentTarget.closest('.card'); const aiMsg = card.querySelector('.ai-message-div').innerHTML; const userP = card.querySelector('.user-prompt-textarea').value; updateLikedResponse(id, aiMsg, userP); })); likedResponsesList.querySelectorAll('.delete-liked-response').forEach(b => b.addEventListener('click', (e) => { const id = parseInt(e.currentTarget.dataset.responseId); deleteLikedResponse(id); e.currentTarget.closest('.card').remove(); })); }; };

    // --- Lógica de Base de Datos (IndexedDB) ---
    const DB_NAME = 'comerzaDB';
    const initDB = () => { const request = indexedDB.open(DB_NAME, 4); request.onerror = (e) => console.error('Error IndexedDB:', e); request.onupgradeneeded = (e) => { const db = e.target.result; if (db.objectStoreNames.contains('recordings')) db.deleteObjectStore('recordings'); if (!db.objectStoreNames.contains('likedResponses')) db.createObjectStore('likedResponses', { keyPath: 'id', autoIncrement: true }); }; request.onsuccess = (e) => { db = e.target.result; }; };
    const saveLikedResponse = async (aiMessage, userPrompt) => { if (!db) return; const tx = db.transaction(['likedResponses'], 'readwrite'); const store = tx.objectStore('likedResponses'); try { await store.add({ aiMessage, userPrompt, timestamp: new Date() }); } catch (e) { console.error('Error al guardar:', e); } };
    const deleteLikedResponse = async (id) => { if (!db) return; const tx = db.transaction(['likedResponses'], 'readwrite'); const store = tx.objectStore('likedResponses'); try { await store.delete(id); } catch (e) { console.error('Error al eliminar:', e); } };

    // --- Lógica del Chat ---
    const addChatMessage = (message, sender, isHtml = false, userPromptForLiked = '') => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}-bubble`;

        if (isHtml && sender === 'ai') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = message;

            const headers = tempDiv.querySelectorAll('h3');
            headers.forEach(h3 => {
                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Copiar';
                copyBtn.className = 'btn btn-sm btn-outline-secondary copy-btn';
                
                copyBtn.onclick = () => {
                    const contentContainer = document.createElement('div');
                    let currentElement = h3.nextElementSibling;

                    while (currentElement && currentElement.tagName !== 'H3') {
                        contentContainer.appendChild(currentElement.cloneNode(true));
                        currentElement = currentElement.nextElementSibling;
                    }

                    if (contentContainer.innerHTML.trim() === '') return;

                    const tempCopyDiv = document.createElement('div');
                    tempCopyDiv.innerHTML = contentContainer.innerHTML;
                    tempCopyDiv.style.position = 'absolute';
                    tempCopyDiv.style.left = '-9999px';
                    document.body.appendChild(tempCopyDiv);

                    const range = document.createRange();
                    range.selectNodeContents(tempCopyDiv);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);

                    try {
                        document.execCommand('copy');
                        copyBtn.innerHTML = '<i class="bi bi-check-lg"></i> Copiado!';
                    } catch (err) {
                        console.error('Fallo al copiar con execCommand:', err);
                        copyBtn.textContent = 'Error';
                    }

                    window.getSelection().removeAllRanges();
                    document.body.removeChild(tempCopyDiv);

                    setTimeout(() => { copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Copiar'; }, 2000);
                };
                h3.appendChild(copyBtn);
            });
            bubble.appendChild(tempDiv);

        } else if (isHtml) {
            bubble.innerHTML = message;
        } else {
            bubble.textContent = message;
        }

        if (sender === 'ai') {
            const likeButton = document.createElement('button');
            likeButton.className = 'like-button'; // Se estiliza con CSS
            likeButton.innerHTML = '<i class="bi bi-heart"></i>';
            likeButton.title = 'Me gusta';
            likeButton.onclick = () => {
                // ... (lógica del botón de like sin cambios)
            };
            bubble.appendChild(likeButton);
        }

        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const getAiResponse = async (userMessage) => {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('TU_API_KEY_AQUI')) {
            addChatMessage('Por favor, configura tu API Key en config.js', 'ai');
            return;
        }
        addChatMessage('Escribiendo...', 'ai-loading');
        const editorialLine = localStorage.getItem('editorialLine') || 'No hay línea editorial definida.';
        const sourceInfo = localStorage.getItem('sourceInfo') || 'No hay fuentes adicionales.';
        const documentContent = quill.getText().trim(); // Usar quill.getText() para obtener el texto limpio
        
        let contextPrompt = `Línea Editorial: "${editorialLine}"\n\nFuentes (Modal): "${sourceInfo}"\n\n`;
        if (documentContent) {
            contextPrompt += `Documento Abierto (Producto): "${documentContent}"\n\n`;
        }

        const taskPrompt = `--- 
Tu rol es ser un Agente de marketing y redes sociales para la ferretería "Comerza".
Basado en la información del producto proporcionada y la solicitud del usuario ("${userMessage}"), genera el siguiente contenido en tres secciones claras y separadas usando formato Markdown:

### Post para Facebook
Crea un post para Facebook...

### Post para Instagram / TikTok
Crea un texto corto y atractivo...

### Ficha Técnica del Producto
Crea una ficha técnica concisa...

Asegúrate de que cada sección esté claramente separada por su título.`;

        const fullPrompt = contextPrompt + taskPrompt;
        const API_URL = 
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        try {
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }) });
            document.querySelector('.ai-loading-bubble')?.remove();
            if (!response.ok) { const errorData = await response.json(); addChatMessage(`Error: ${errorData.error?.message || 'No se pudo obtener respuesta.'}`, 'ai'); return; }
            const data = await response.json();
            const rawMessage = data.candidates[0]?.content?.parts[0]?.text.trim() || "No obtuve una respuesta válida.";
            const aiMessage = marked.parse(rawMessage);
            addChatMessage(aiMessage, 'ai', true, userMessage);
        } catch (error) {
            console.error('Error al llamar a la API de Gemini:', error);
            document.querySelector('.ai-loading-bubble')?.remove();
            addChatMessage('No se pudo conectar con el asistente.', 'ai');
        }
    };

    const handleChatSubmit = async (e) => { e.preventDefault(); const userMessage = chatInput.value.trim(); if (userMessage) { addChatMessage(userMessage, 'user'); chatInput.value = ''; await getAiResponse(userMessage); } };

    // --- Inicialización General ---
    initDB();
    initializeQuill(); // Activar el editor de texto enriquecido
    loadEditorialLine();
    loadSource();

    // Event Listeners
    loadFileButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    chatForm.addEventListener('submit', handleChatSubmit);
    saveEditorialButton.addEventListener('click', saveEditorialLine);
    saveSourceButton.addEventListener('click', saveSource);
    knowledgeBaseButton.addEventListener('click', loadLikedResponses);
});
