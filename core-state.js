// ==========================================
// 1. DATABASE & INITIALIZATION (LOCALSTORAGE)
// ==========================================

// Database utama menggunakan Array
let daftarRumus = JSON.parse(localStorage.getItem('wiraga_rumus')) || [
    {
        id: 'default_vo2max',
        nama: 'Tes VO2Max Balke (15 Min)',
        formula: '((x - 133) * 0.172) + 33.3',
        variables: ['x'],
        deskripsi: 'Estimasi VO2Max berdasarkan jarak lari (x) dalam 15 menit.'
    }
];

let riwayatDB = JSON.parse(localStorage.getItem('riwayatDB')) || [];
let agendaDB = JSON.parse(localStorage.getItem('agendaDB')) || [];
let currentParsedVariables = [];
let isFormulaValid = false;
let hasilTerakhir = [];
let performanceChartInstance = null;
let currentChartFilter = { type: null, value: null, title: null };
let currentChartTab = 'progress';

// Event listener tunggal saat halaman selesai di-load
document.addEventListener('DOMContentLoaded', () => {
    renderSubmenuHitung();
    tampilRiwayat();
    updateBerandaStats();
    tampilAgendaList();
    loadCatatan();
});

function simpanKeLocalStorage() {
    localStorage.setItem('wiraga_rumus', JSON.stringify(daftarRumus));
    if (typeof simpanRumusKeFirestore === 'function') simpanRumusKeFirestore();
    renderSubmenuHitung();
    updateBerandaStats();
}

function bukaModalPanduanSimbol() {
    const modal = document.getElementById('modalPanduanSimbol');
    if (modal) modal.style.display = 'flex';
}

function tutupModalPanduanSimbol() {
    const modal = document.getElementById('modalPanduanSimbol');
    if (modal) modal.style.display = 'none';
}

// ==========================================
// 2. KONTROL NAVIGASI PAGE & SIDEBAR
// ==========================================

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => {
        p.style.display = 'none';
        p.style.opacity = '0';
        p.classList.remove('active');
    });

    let page = document.getElementById(id);
    if (page) {
        page.style.display = 'block';
        page.classList.add('active');
        setTimeout(() => {
            page.style.opacity = '1';
        }, 10);
    }
    highlightSidebar(id);
}

function highlightSidebar(id) {
    document.querySelectorAll('#sidebar a').forEach(a => a.classList.remove('activeSidebar'));
    switch (id) {
        case 'beranda': document.getElementById('linkBeranda')?.classList.add('activeSidebar'); break;
        case 'tambahRumus': document.getElementById('linkTambah')?.classList.add('activeSidebar'); break;
        case 'hitung': document.getElementById('linkHitung')?.classList.add('activeSidebar'); break;
        case 'riwayat': document.getElementById('linkRiwayat')?.classList.add('activeSidebar'); break;
        case 'tentang': document.getElementById('linkTentang')?.classList.add('activeSidebar'); break;
    }
}

function toggleSubmenu(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('show');
}

function renderSubmenuHitung() {
    const container = document.getElementById('hitungSub');
    if (!container) return;

    if (daftarRumus.length === 0) {
        container.innerHTML = `<small style="padding: 10px; color: #94a3b8; display: block;">Belum ada rumus</small>`;
        return;
    }

    container.innerHTML = '';
    daftarRumus.forEach(item => {
        let a = document.createElement('a');
        a.style.cursor = 'pointer';
        a.innerHTML = `<i class="fas fa-calculator nav-icon"></i> <span>${item.nama}</span>`;
        a.onclick = () => tampilHitung(item.id);
        container.appendChild(a);
    });
}

