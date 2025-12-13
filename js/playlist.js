// Sistema de búsqueda y filtrado de grabaciones
class PlaylistManager {
    constructor() {
        this.recordings = [];
        this.filteredRecordings = [];
        this.searchTerm = '';
        this.sortBy = 'date'; // date, name, duration, size
        this.sortOrder = 'desc'; // asc, desc
        this.init();
    }

    init() {
        this.createSearchBar();
        this.createSortControls();
    }

    createSearchBar() {
        const playlistSection = document.getElementById('playlist-section');
        if (!playlistSection) return;

        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = `
            padding: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        `;

        searchContainer.innerHTML = `
            <div style="position: relative;">
                <input 
                    type="text" 
                    id="playlist-search" 
                    placeholder="Buscar grabaciones... (Ctrl+F)"
                    style="
                        width: 100%;
                        padding: 10px 40px 10px 40px;
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        color: #e0e0e0;
                        font-family: 'Montserrat', sans-serif;
                        font-size: 14px;
                        transition: all 0.2s ease;
                    "
                    onfocus="this.style.borderColor='rgba(0, 195, 255, 0.5)'; this.style.background='rgba(255, 255, 255, 0.08)'"
                    onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.background='rgba(255, 255, 255, 0.05)'"
                >
                <i class="fa-solid fa-search" style="
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #b0b3b8;
                    pointer-events: none;
                "></i>
                <button id="clear-search" style="
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #b0b3b8;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    display: none;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'" onmouseout="this.style.background='none'">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
        `;

        const cardBody = playlistSection.querySelector('.card-body');
        cardBody.insertBefore(searchContainer, cardBody.firstChild);

        // Event listeners
        const searchInput = document.getElementById('playlist-search');
        const clearBtn = document.getElementById('clear-search');

        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            clearBtn.style.display = this.searchTerm ? 'block' : 'none';
            this.filterRecordings();
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.searchTerm = '';
            clearBtn.style.display = 'none';
            this.filterRecordings();
        });

        // Atajo Ctrl+F
        window.keyboard?.register('ctrl+f', () => {
            searchInput.focus();
            searchInput.select();
        });
    }

    createSortControls() {
        const playlistSection = document.getElementById('playlist-section');
        if (!playlistSection) return;

        const sortContainer = document.createElement('div');
        sortContainer.style.cssText = `
            padding: 8px 12px;
            display: flex;
            gap: 8px;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-wrap: wrap;
        `;

        sortContainer.innerHTML = `
            <span style="
                color: #b0b3b8;
                font-size: 12px;
                font-family: 'Montserrat', sans-serif;
            ">Ordenar:</span>
            <button class="sort-btn" data-sort="date" style="
                background: rgba(0, 195, 255, 0.2);
                border: 1px solid rgba(0, 195, 255, 0.4);
                color: #00c3ff;
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 11px;
                cursor: pointer;
                font-family: 'Montserrat', sans-serif;
                font-weight: 600;
                transition: all 0.2s ease;
            ">
                <i class="fa-solid fa-calendar"></i> Fecha
            </button>
            <button class="sort-btn" data-sort="name" style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #b0b3b8;
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 11px;
                cursor: pointer;
                font-family: 'Montserrat', sans-serif;
                font-weight: 600;
                transition: all 0.2s ease;
            ">
                <i class="fa-solid fa-font"></i> Nombre
            </button>
            <button class="sort-btn" data-sort="duration" style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #b0b3b8;
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 11px;
                cursor: pointer;
                font-family: 'Montserrat', sans-serif;
                font-weight: 600;
                transition: all 0.2s ease;
            ">
                <i class="fa-solid fa-clock"></i> Duración
            </button>
            <button class="sort-btn" data-sort="size" style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #b0b3b8;
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 11px;
                cursor: pointer;
                font-family: 'Montserrat', sans-serif;
                font-weight: 600;
                transition: all 0.2s ease;
            ">
                <i class="fa-solid fa-database"></i> Tamaño
            </button>
            <button id="sort-order-btn" style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #b0b3b8;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
            " title="Cambiar orden">
                <i class="fa-solid fa-arrow-down"></i>
            </button>
        `;

        const cardBody = playlistSection.querySelector('.card-body');
        const searchBar = cardBody.querySelector('div');
        cardBody.insertBefore(sortContainer, searchBar.nextSibling);

        // Event listeners para botones de ordenamiento
        const sortBtns = sortContainer.querySelectorAll('.sort-btn');
        sortBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.sortBy = btn.dataset.sort;

                // Actualizar estilos
                sortBtns.forEach(b => {
                    b.style.background = 'rgba(255, 255, 255, 0.05)';
                    b.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    b.style.color = '#b0b3b8';
                });
                btn.style.background = 'rgba(0, 195, 255, 0.2)';
                btn.style.borderColor = 'rgba(0, 195, 255, 0.4)';
                btn.style.color = '#00c3ff';

                this.sortRecordings();
            });
        });

        // Botón de orden
        const orderBtn = document.getElementById('sort-order-btn');
        orderBtn.addEventListener('click', () => {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            orderBtn.innerHTML = this.sortOrder === 'asc'
                ? '<i class="fa-solid fa-arrow-up"></i>'
                : '<i class="fa-solid fa-arrow-down"></i>';
            this.sortRecordings();
        });
    }

    setRecordings(recordings) {
        this.recordings = recordings;
        this.filterRecordings();
    }

    filterRecordings() {
        if (!this.searchTerm) {
            this.filteredRecordings = [...this.recordings];
        } else {
            this.filteredRecordings = this.recordings.filter(rec =>
                rec.name.toLowerCase().includes(this.searchTerm)
            );
        }
        this.sortRecordings();
    }

    sortRecordings() {
        this.filteredRecordings.sort((a, b) => {
            let comparison = 0;

            switch (this.sortBy) {
                case 'date':
                    comparison = new Date(a.date) - new Date(b.date);
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'duration':
                    comparison = (a.duration || 0) - (b.duration || 0);
                    break;
                case 'size':
                    comparison = (a.blob?.size || 0) - (b.blob?.size || 0);
                    break;
            }

            return this.sortOrder === 'asc' ? comparison : -comparison;
        });

        // Disparar evento para actualizar la UI
        window.dispatchEvent(new CustomEvent('playlistUpdated', {
            detail: { recordings: this.filteredRecordings }
        }));
    }

    formatDuration(seconds) {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    formatSize(bytes) {
        if (!bytes) return '0 KB';
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        const mb = kb / 1024;
        return `${mb.toFixed(1)} MB`;
    }
}

// Crear instancia global
window.playlistManager = new PlaylistManager();
