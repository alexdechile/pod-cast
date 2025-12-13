// VU Meter - Medidor de nivel de audio en tiempo real
class VUMeter {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('VU Meter container not found:', containerId);
            return;
        }

        this.canvas = null;
        this.ctx = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        this.audioContext = null;
        this.isActive = false;

        this.createCanvas();
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'vu-meter-canvas';
        this.canvas.width = this.container.offsetWidth || 300;
        this.canvas.height = 80;
        this.canvas.style.cssText = `
            width: 100%;
            height: 80px;
            border-radius: 12px;
            background: linear-gradient(135deg, #18191a 0%, #232526 100%);
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
        `;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
    }

    start(audioStream) {
        if (!audioStream) {
            console.error('No audio stream provided');
            return;
        }

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(audioStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            source.connect(this.analyser);

            this.isActive = true;
            this.draw();
        } catch (e) {
            console.error('Error starting VU Meter:', e);
        }
    }

    draw() {
        if (!this.isActive) return;

        this.animationId = requestAnimationFrame(() => this.draw());

        this.analyser.getByteFrequencyData(this.dataArray);

        // Calcular nivel promedio
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        const normalizedLevel = average / 255; // 0 to 1

        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Dibujar fondo con gradiente
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGradient.addColorStop(0, '#18191a');
        bgGradient.addColorStop(1, '#232526');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Dibujar barras de frecuencia
        const barWidth = (this.canvas.width / this.dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.8;

            // Gradiente de color según nivel
            let color;
            const level = this.dataArray[i] / 255;
            if (level < 0.5) {
                color = `rgba(0, 195, 255, ${0.3 + level})`;
            } else if (level < 0.75) {
                color = `rgba(255, 252, 0, ${0.3 + level})`;
            } else {
                color = `rgba(255, 0, 102, ${0.3 + level})`;
            }

            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                x,
                this.canvas.height - barHeight,
                barWidth - 2,
                barHeight
            );

            x += barWidth;
        }

        // Dibujar medidor de nivel principal
        const meterWidth = this.canvas.width * normalizedLevel;
        const meterHeight = 20;
        const meterY = this.canvas.height - meterHeight - 5;

        // Fondo del medidor
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(5, meterY, this.canvas.width - 10, meterHeight);

        // Barra de nivel con gradiente
        const gradient = this.ctx.createLinearGradient(5, 0, this.canvas.width - 5, 0);
        gradient.addColorStop(0, '#00c3ff');
        gradient.addColorStop(0.5, '#fffc00');
        gradient.addColorStop(0.75, '#ff9900');
        gradient.addColorStop(1, '#ff0066');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(5, meterY, meterWidth - 10, meterHeight);

        // Marcadores de nivel
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const markX = (this.canvas.width / 10) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(markX, meterY);
            this.ctx.lineTo(markX, meterY + meterHeight);
            this.ctx.stroke();
        }

        // Texto de nivel
        const dbLevel = Math.round(normalizedLevel * 100);
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.font = 'bold 12px Montserrat';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${dbLevel}%`, this.canvas.width - 10, meterY - 5);

        // Indicador de pico
        if (normalizedLevel > 0.9) {
            this.ctx.fillStyle = '#ff0066';
            this.ctx.font = 'bold 14px Montserrat';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('⚠️ PEAK', 10, 20);
        }
    }

    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Limpiar canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Dibujar estado inactivo
            const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            bgGradient.addColorStop(0, '#18191a');
            bgGradient.addColorStop(1, '#232526');
            this.ctx.fillStyle = bgGradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.font = '14px Montserrat';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('VU Meter inactivo', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    resize() {
        if (this.canvas && this.container) {
            this.canvas.width = this.container.offsetWidth || 300;
        }
    }
}

// Crear instancia global
window.vuMeter = null;

// Inicializar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
    // Crear contenedor para VU Meter si no existe
    const recorderCard = document.getElementById('audio-recorder');
    if (recorderCard) {
        const vuContainer = document.createElement('div');
        vuContainer.id = 'vu-meter-container';
        vuContainer.style.cssText = `
            margin-top: 12px;
            margin-bottom: 12px;
            border-radius: 12px;
            overflow: hidden;
        `;

        // Insertar después del waveform
        const waveform = document.getElementById('waveform');
        if (waveform && waveform.parentNode) {
            waveform.parentNode.insertBefore(vuContainer, waveform.nextSibling);
        }

        window.vuMeter = new VUMeter('vu-meter-container');
    }
});

// Redimensionar al cambiar tamaño de ventana
window.addEventListener('resize', () => {
    if (window.vuMeter) {
        window.vuMeter.resize();
    }
});
