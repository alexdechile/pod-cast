// Sistema de notificaciones toast elegante
class ToastNotification {
    constructor() {
        this.container = this.createContainer();
        document.body.appendChild(this.container);
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        return container;
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-exclamation',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        toast.innerHTML = `
            <i class="fa-solid ${icons[type]}"></i>
            <span>${message}</span>
        `;

        toast.style.cssText = `
            background: rgba(35, 37, 38, 0.98);
            backdrop-filter: blur(10px);
            border-left: 4px solid ${colors[type]};
            color: #e0e0e0;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 300px;
            max-width: 400px;
            pointer-events: auto;
            animation: slideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            font-family: 'Montserrat', sans-serif;
            font-size: 14px;
            transform-origin: right center;
        `;

        toast.querySelector('i').style.cssText = `
            color: ${colors[type]};
            font-size: 20px;
            flex-shrink: 0;
        `;

        this.container.appendChild(toast);

        // Auto-remove
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            setTimeout(() => {
                this.container.removeChild(toast);
            }, 300);
        }, duration);

        return toast;
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// Crear instancia global
window.toast = new ToastNotification();

// Agregar animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%) scale(0.8);
        }
        to {
            opacity: 1;
            transform: translateX(0) scale(1);
        }
    }

    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0) scale(1);
        }
        to {
            opacity: 0;
            transform: translateX(100%) scale(0.8);
        }
    }

    .toast:hover {
        transform: scale(1.02);
        transition: transform 0.2s ease;
    }
`;
document.head.appendChild(style);
