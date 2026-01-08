// Sistema de confirmación elegante
class ConfirmDialog {
    constructor() {
        this.overlay = null;
        this.dialog = null;
    }

    show(options = {}) {
        return new Promise((resolve) => {
            const {
                title = '¿Estás seguro?',
                message = 'Esta acción no se puede deshacer.',
                confirmText = 'Confirmar',
                cancelText = 'Cancelar',
                type = 'warning', // warning, danger, info
                icon = 'fa-triangle-exclamation'
            } = options;

            // Crear overlay
            this.overlay = document.createElement('div');
            this.overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            `;

            // Crear diálogo
            this.dialog = document.createElement('div');
            this.dialog.style.cssText = `
                background: linear-gradient(135deg, #232526 0%, #2c3e50 100%);
                border-radius: 16px;
                padding: 32px;
                max-width: 420px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: scaleIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                border: 1px solid rgba(255, 255, 255, 0.1);
            `;

            const colors = {
                warning: '#f59e0b',
                danger: '#ef4444',
                info: '#3b82f6'
            };

            this.dialog.innerHTML = `
                <div style="text-align: center; margin-bottom: 24px;">
                    <i class="fa-solid ${icon}" style="
                        font-size: 48px;
                        color: ${colors[type]};
                        margin-bottom: 16px;
                        display: block;
                    "></i>
                    <h3 style="
                        color: #e0e0e0;
                        font-family: 'Montserrat', sans-serif;
                        font-size: 22px;
                        font-weight: 700;
                        margin: 0 0 12px 0;
                    ">${title}</h3>
                    <p style="
                        color: #b0b3b8;
                        font-family: 'Montserrat', sans-serif;
                        font-size: 14px;
                        margin: 0;
                        line-height: 1.6;
                    ">${message}</p>
                </div>
                <div style="
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                ">
                    <button class="confirm-cancel" style="
                        flex: 1;
                        padding: 12px 24px;
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        color: #e0e0e0;
                        font-family: 'Montserrat', sans-serif;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">${cancelText}</button>
                    <button class="confirm-ok" style="
                        flex: 1;
                        padding: 12px 24px;
                        background: ${colors[type]};
                        border: none;
                        border-radius: 8px;
                        color: white;
                        font-family: 'Montserrat', sans-serif;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">${confirmText}</button>
                </div>
            `;

            this.overlay.appendChild(this.dialog);
            document.body.appendChild(this.overlay);

            // Agregar hover effects
            const cancelBtn = this.dialog.querySelector('.confirm-cancel');
            const okBtn = this.dialog.querySelector('.confirm-ok');

            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.background = 'rgba(255, 255, 255, 0.15)';
                cancelBtn.style.transform = 'translateY(-2px)';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                cancelBtn.style.transform = 'translateY(0)';
            });

            okBtn.addEventListener('mouseenter', () => {
                okBtn.style.transform = 'translateY(-2px)';
                okBtn.style.boxShadow = `0 4px 12px ${colors[type]}66`;
            });
            okBtn.addEventListener('mouseleave', () => {
                okBtn.style.transform = 'translateY(0)';
                okBtn.style.boxShadow = 'none';
            });

            // Event listeners
            cancelBtn.addEventListener('click', () => {
                this.close();
                resolve(false);
            });

            okBtn.addEventListener('click', () => {
                this.close();
                resolve(true);
            });

            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.close();
                    resolve(false);
                }
            });

            // ESC key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.close();
                    resolve(false);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    close() {
        if (this.overlay) {
            this.overlay.style.animation = 'fadeOut 0.2s ease';
            this.dialog.style.animation = 'scaleOut 0.2s ease';
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    document.body.removeChild(this.overlay);
                }
                this.overlay = null;
                this.dialog = null;
            }, 200);
        }
    }
}

// Crear instancia global
window.confirm = new ConfirmDialog();

// Agregar animaciones CSS
const confirmStyle = document.createElement('style');
confirmStyle.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    @keyframes scaleIn {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    @keyframes scaleOut {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.8);
        }
    }
`;
document.head.appendChild(confirmStyle);
