// Sistema de atajos de teclado
class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            // Ignorar si está escribiendo en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;
            const alt = e.altKey;

            const shortcutKey = `${ctrl ? 'ctrl+' : ''}${shift ? 'shift+' : ''}${alt ? 'alt+' : ''}${key}`;

            const handler = this.shortcuts.get(shortcutKey);
            if (handler) {
                e.preventDefault();
                handler(e);
            }
        });

        // Mostrar ayuda de atajos
        this.register('?', () => this.showHelp());
        this.register('shift+?', () => this.showHelp());
    }

    register(shortcut, handler, description = '') {
        this.shortcuts.set(shortcut.toLowerCase(), handler);
        if (description) {
            if (!this.descriptions) this.descriptions = new Map();
            this.descriptions.set(shortcut.toLowerCase(), description);
        }
    }

    unregister(shortcut) {
        this.shortcuts.delete(shortcut.toLowerCase());
        if (this.descriptions) {
            this.descriptions.delete(shortcut.toLowerCase());
        }
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    showHelp() {
        const shortcuts = [
            { key: 'Espacio', desc: 'Reproducir/Pausar audio seleccionado' },
            { key: 'R', desc: 'Iniciar/Detener grabación' },
            { key: 'P', desc: 'Pausar/Reanudar grabación' },
            { key: 'S', desc: 'Detener grabación' },
            { key: 'M', desc: 'Activar/Desactivar micrófono' },
            { key: 'C', desc: 'Activar/Desactivar compresión' },
            { key: 'Delete', desc: 'Eliminar grabación seleccionada' },
            { key: 'Ctrl+S', desc: 'Exportar grabación actual' },
            { key: 'Ctrl+F', desc: 'Buscar en grabaciones' },
            { key: '?', desc: 'Mostrar esta ayuda' },
            { key: 'Esc', desc: 'Cerrar diálogos' }
        ];

        const helpHtml = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #232526 0%, #2c3e50 100%);
                border-radius: 16px;
                padding: 32px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                z-index: 10001;
                border: 1px solid rgba(255, 255, 255, 0.1);
                animation: scaleIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            " id="keyboard-help">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="
                        color: #e0e0e0;
                        font-family: 'Montserrat', sans-serif;
                        font-size: 22px;
                        font-weight: 700;
                        margin: 0;
                    ">
                        <i class="fa-solid fa-keyboard" style="color: #00c3ff; margin-right: 12px;"></i>
                        Atajos de Teclado
                    </h3>
                    <button onclick="document.getElementById('keyboard-help-overlay').remove()" style="
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        color: #e0e0e0;
                        width: 32px;
                        height: 32px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 18px;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div style="
                    display: grid;
                    gap: 12px;
                    max-height: 400px;
                    overflow-y: auto;
                ">
                    ${shortcuts.map(s => `
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 12px;
                            background: rgba(255, 255, 255, 0.05);
                            border-radius: 8px;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'">
                            <span style="
                                color: #b0b3b8;
                                font-family: 'Montserrat', sans-serif;
                                font-size: 14px;
                            ">${s.desc}</span>
                            <kbd style="
                                background: linear-gradient(135deg, #00c3ff, #0099cc);
                                color: white;
                                padding: 6px 12px;
                                border-radius: 6px;
                                font-family: 'Montserrat', sans-serif;
                                font-size: 12px;
                                font-weight: 700;
                                box-shadow: 0 2px 8px rgba(0, 195, 255, 0.3);
                                min-width: 60px;
                                text-align: center;
                            ">${s.key}</kbd>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.id = 'keyboard-help-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        `;
        overlay.innerHTML = helpHtml;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        document.body.appendChild(overlay);

        // Cerrar con ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
}

// Crear instancia global
window.keyboard = new KeyboardShortcuts();

// Registrar atajos principales
window.addEventListener('DOMContentLoaded', () => {
    const R = window.UI.recorder;
    const E = window.UI.editor;
    const T = window.UI.tones;

    // R - Grabar/Detener
    window.keyboard.register('r', () => {
        if (R.btnRecord && !R.btnRecord.disabled) {
            R.btnRecord.click();
            window.toast?.info('Atajo: R - Grabar');
        } else if (R.btnStop && !R.btnStop.disabled) {
            R.btnStop.click();
        }
    }, 'Iniciar/Detener grabación');

    // P - Pausar/Reanudar
    window.keyboard.register('p', () => {
        if (R.btnPause && !R.btnPause.disabled) {
            R.btnPause.click();
        }
    }, 'Pausar/Reanudar grabación');

    // S - Stop
    window.keyboard.register('s', () => {
        if (R.btnStop && !R.btnStop.disabled) {
            R.btnStop.click();
        }
    }, 'Detener grabación');

    // M - Micrófono
    window.keyboard.register('m', () => {
        if (R.btnPermission) {
            R.btnPermission.click();
            window.toast?.info('Atajo: M - Micrófono');
        }
    }, 'Activar micrófono');

    // C - Compresión
    window.keyboard.register('c', () => {
        if (R.btnCompress) {
            R.btnCompress.click();
            window.toast?.info('Atajo: C - Compresión');
        }
    }, 'Toggle compresión');

    // Espacio - Play/Pause del audio seleccionado
    window.keyboard.register(' ', () => {
        const audioPreview = E.audioPreview;
        if (audioPreview && audioPreview.src) {
            if (audioPreview.paused) {
                audioPreview.play();
                window.toast?.info('▶️ Reproduciendo');
            } else {
                audioPreview.pause();
                window.toast?.info('⏸️ Pausado');
            }
        }
    }, 'Reproducir/Pausar');

    // Ctrl+S - Exportar
    window.keyboard.register('ctrl+s', () => {
        const btnExport = E.btnExport;
        if (btnExport) {
            btnExport.click();
            window.toast?.info('Atajo: Ctrl+S - Exportar');
        }
    }, 'Exportar grabación');

    // Mostrar notificación de atajos disponibles
    setTimeout(() => {
        window.toast?.info('Presiona ? para ver atajos de teclado', 5000);
    }, 2000);
});
