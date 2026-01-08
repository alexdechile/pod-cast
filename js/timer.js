// Componente de Timer de Grabación
class RecordingTimer {
    constructor() {
        this.startTime = null;
        this.pausedTime = 0;
        this.intervalId = null;
        this.element = this.createElement();
    }

    createElement() {
        const timer = document.createElement('div');
        timer.id = 'recording-timer';
        timer.style.cssText = `
            display: none;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%);
            border: 2px solid rgba(239, 68, 68, 0.4);
            border-radius: 12px;
            margin-bottom: 16px;
            font-family: 'Montserrat', sans-serif;
            animation: pulse 2s ease-in-out infinite;
        `;

        timer.innerHTML = `
            <div class="recording-indicator" style="
                width: 12px;
                height: 12px;
                background: #ef4444;
                border-radius: 50%;
                box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
                animation: blink 1s ease-in-out infinite;
            "></div>
            <span class="timer-text" style="
                font-size: 18px;
                font-weight: 700;
                color: #ef4444;
                letter-spacing: 0.05em;
                font-variant-numeric: tabular-nums;
            ">00:00</span>
            <span class="timer-label" style="
                font-size: 12px;
                color: #e0e0e0;
                opacity: 0.8;
                text-transform: uppercase;
                letter-spacing: 0.1em;
            ">GRABANDO</span>
        `;

        return timer;
    }

    start() {
        this.startTime = Date.now() - this.pausedTime;
        this.element.style.display = 'flex';

        this.intervalId = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);

            const timerText = this.element.querySelector('.timer-text');
            timerText.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 100);
    }

    pause() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.pausedTime = Date.now() - this.startTime;
            this.element.querySelector('.timer-label').textContent = 'PAUSADO';
            this.element.style.borderColor = 'rgba(251, 191, 36, 0.4)';
            this.element.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)';
            this.element.querySelector('.recording-indicator').style.background = '#fbbf24';
            this.element.querySelector('.timer-text').style.color = '#fbbf24';
        }
    }

    resume() {
        this.element.querySelector('.timer-label').textContent = 'GRABANDO';
        this.element.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        this.element.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)';
        this.element.querySelector('.recording-indicator').style.background = '#ef4444';
        this.element.querySelector('.timer-text').style.color = '#ef4444';
        this.start();
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.element.style.display = 'none';
        this.startTime = null;
        this.pausedTime = 0;
        this.element.querySelector('.timer-text').textContent = '00:00';
    }

    getElapsedTime() {
        if (!this.startTime) return 0;
        return Date.now() - this.startTime;
    }
}

// Crear instancia global
window.recordingTimer = new RecordingTimer();

// Agregar animaciones CSS
const timerStyle = document.createElement('style');
timerStyle.textContent = `
    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }

    @keyframes pulse {
        0%, 100% { 
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
        }
        50% { 
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
        }
    }
`;
document.head.appendChild(timerStyle);
