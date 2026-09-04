// ========================================================
// AGENDA.JS - Wiraga App
// Agenda jadwal tes & Catatan Pelatih
// ========================================================

function toggleFormAgenda() {
    const form = document.getElementById('formAgendaInline');
    if (form) {
        form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
    }
}

function simpanJadwalBaru() {
    const nama = document.getElementById('inputNamaTes').value.trim();
    const kelas = document.getElementById('inputKelasTes').value.trim();
    const tanggal = document.getElementById('inputTanggalTes').value;
    const jumlah = document.getElementById('inputJumlahSiswa').value;

    if (!nama || !tanggal) {
        alert('Mohon isi nama tes dan tanggal!');
        return;
    }

    if (jumlah !== '' && jumlah !== null) {
        const jumlahNum = Number(jumlah);
        if (isNaN(jumlahNum) || jumlahNum < 0 || !Number.isInteger(jumlahNum)) {
            alert('⚠️ Jumlah Siswa harus berupa angka bulat positif (contoh: 28), tidak boleh negatif atau desimal.');
            return;
        }
    }

    if (!Array.isArray(agendaDB)) agendaDB = [];

    agendaDB.push({ nama, kelas, tanggal, jumlah });
    localStorage.setItem('agendaDB', JSON.stringify(agendaDB));
    if (typeof simpanAgendaKeFirestore === 'function') simpanAgendaKeFirestore();

    document.getElementById('inputNamaTes').value = '';
    document.getElementById('inputKelasTes').value = '';
    document.getElementById('inputTanggalTes').value = '';
    document.getElementById('inputJumlahSiswa').value = '';

    toggleFormAgenda();
    tampilAgendaList();
}

function tampilAgendaList() {
    const container = document.getElementById('agendaContainer');
    if (!container) return;

    agendaDB = JSON.parse(localStorage.getItem('agendaDB')) || [];

    if (agendaDB.length === 0) {
        container.innerHTML = `
            <div class="empty-agenda" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.4);">
                <i class="fas fa-calendar-minus" style="font-size: 1.5rem; margin-bottom: 6px;"></i>
                <p style="margin: 0; font-size: 12px;">Belum ada agenda tes mendatang.</p>
            </div>`;
        return;
    }

    let html = '';
    agendaDB.forEach((item, idx) => {
        html += `
            <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 10px; margin-bottom: 10px; border-left: 3px solid #48dbfb; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #fff; font-size: 14px;">${item.nama}</strong> <small style="color: #48dbfb;">(${item.kelas || 'Umum'})</small>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                        <i class="far fa-calendar"></i> ${item.tanggal} | <i class="fas fa-users"></i> ${item.jumlah || 0} Siswa
                    </div>
                </div>
                <button onclick="hapusAgenda(${idx})" style="background:none; border:none; color:#ef4444; cursor:pointer;" title="Hapus Agenda"><i class="fas fa-trash"></i></button>
            </div>`;
    });
    container.innerHTML = html;
}

function hapusAgenda(idx) {
    agendaDB.splice(idx, 1);
    localStorage.setItem('agendaDB', JSON.stringify(agendaDB));
    if (typeof simpanAgendaKeFirestore === 'function') simpanAgendaKeFirestore();
    tampilAgendaList();
}

function simpanCatatan() {
    const el = document.getElementById('coachNotes');
    if (el) {
        localStorage.setItem('coachNotes', el.value);
        if (typeof simpanCatatanKeFirestore === 'function') simpanCatatanKeFirestore(el.value);
        alert('✅ Catatan berhasil disimpan!');
    }
}

function loadCatatan() {
    const el = document.getElementById('coachNotes');
    if (el) el.value = localStorage.getItem('coachNotes') || '';
}

// Buka Modal Export Excel
