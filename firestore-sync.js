// =======================================================
// FIRESTORE-SYNC.JS - WIRAGA APP
// =======================================================
// TAHAP 1 MIGRASI: RUMUS
// Mengambil & menyimpan data rumus dari/ke Firestore,
// terikat ke akun guru yang sedang login (window.uidAktif).
// localStorage tetap diisi sebagai cadangan/cache offline,
// tapi Firestore adalah sumber data utama.
// =======================================================

// =======================================================
// PEMBERSIH DATA LOKAL SAAT GANTI AKUN
// =======================================================
// localStorage itu dipakai BERSAMA oleh semua akun di 1 browser
// (bukan per-akun). Fungsi ini memastikan cache lama milik akun
// sebelumnya tidak "nyasar" kebawa ke akun yang baru login.
// =======================================================

function bersihkanCacheLokalUntukAkunBaru() {
    localStorage.removeItem('wiraga_rumus');
    localStorage.removeItem('riwayatDB');
    localStorage.removeItem('agendaDB');
    localStorage.removeItem('coachNotes');
    localStorage.removeItem('dataRiwayat');
    localStorage.removeItem('riwayatSesi');
    localStorage.removeItem('riwayat_wiraga');

    // Reset variabel di memori juga (bukan cuma localStorage-nya)
    try { daftarRumus = []; } catch (e) {}
    try { riwayatDB = []; } catch (e) {}
    try { agendaDB = []; } catch (e) {}
    const notesEl = document.getElementById('coachNotes');
    if (notesEl) notesEl.value = '';
}

async function muatRumusDariFirestore(uid) {
    try {
        const docRef = db.collection('users').doc(uid);
        const docSnap = await docRef.get();

        if (docSnap.exists && Array.isArray(docSnap.data().rumus) && docSnap.data().rumus.length > 0) {
            daftarRumus = docSnap.data().rumus;
            localStorage.setItem('wiraga_rumus', JSON.stringify(daftarRumus));
        }
        // Kalau belum ada data di Firestore, biarkan daftarRumus
        // tetap pakai nilai default bawaan (rumus contoh VO2Max).

        // Refresh tampilan yang bergantung pada daftarRumus
        if (typeof renderSubmenuHitung === 'function') renderSubmenuHitung();
        if (typeof updateBerandaStats === 'function') updateBerandaStats();
    } catch (error) {
        console.error('⚠️ Gagal memuat rumus dari Firestore, memakai data lokal sementara:', error);
    }
}

async function simpanRumusKeFirestore() {
    if (!window.uidAktif) return;
    try {
        await db.collection('users').doc(window.uidAktif).set({
            rumus: daftarRumus
        }, { merge: true });
    } catch (error) {
        console.error('⚠️ Gagal menyimpan rumus ke Firestore (tersimpan lokal saja untuk sementara):', error);
    }
}

// =======================================================
// TAHAP 2 MIGRASI: AGENDA & CATATAN PELATIH
// =======================================================

async function muatAgendaDanCatatanDariFirestore(uid) {
    try {
        const docRef = db.collection('users').doc(uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();

            if (Array.isArray(data.agenda)) {
                agendaDB = data.agenda;
                localStorage.setItem('agendaDB', JSON.stringify(agendaDB));
            }

            if (typeof data.catatan === 'string') {
                localStorage.setItem('coachNotes', data.catatan);
                const el = document.getElementById('coachNotes');
                if (el) el.value = data.catatan;
            }
        }

        if (typeof tampilAgendaList === 'function') tampilAgendaList();
    } catch (error) {
        console.error('⚠️ Gagal memuat agenda/catatan dari Firestore, memakai data lokal sementara:', error);
    }
}

async function simpanAgendaKeFirestore() {
    if (!window.uidAktif) return;
    try {
        await db.collection('users').doc(window.uidAktif).set({
            agenda: agendaDB
        }, { merge: true });
    } catch (error) {
        console.error('⚠️ Gagal menyimpan agenda ke Firestore (tersimpan lokal saja untuk sementara):', error);
    }
}

async function simpanCatatanKeFirestore(teks) {
    if (!window.uidAktif) return;
    try {
        await db.collection('users').doc(window.uidAktif).set({
            catatan: teks
        }, { merge: true });
    } catch (error) {
        console.error('⚠️ Gagal menyimpan catatan ke Firestore (tersimpan lokal saja untuk sementara):', error);
    }
}

// =======================================================
// TAHAP 3 MIGRASI: RIWAYAT TES (bagian terakhir)
// =======================================================

async function muatRiwayatDariFirestore(uid) {
    try {
        const docRef = db.collection('users').doc(uid);
        const docSnap = await docRef.get();

        if (docSnap.exists && Array.isArray(docSnap.data().riwayat)) {
            riwayatDB = docSnap.data().riwayat;
            localStorage.setItem('riwayatDB', JSON.stringify(riwayatDB));
        }

        if (typeof tampilRiwayat === 'function') tampilRiwayat();
        if (typeof updateBerandaStats === 'function') updateBerandaStats();
        if (typeof renderPerformanceChart === 'function') renderPerformanceChart();
    } catch (error) {
        console.error('⚠️ Gagal memuat riwayat dari Firestore, memakai data lokal sementara:', error);
    }
}

async function simpanRiwayatKeFirestore() {
    if (!window.uidAktif) return;
    try {
        await db.collection('users').doc(window.uidAktif).set({
            riwayat: riwayatDB
        }, { merge: true });
    } catch (error) {
        console.error('⚠️ Gagal menyimpan riwayat ke Firestore (tersimpan lokal saja untuk sementara):', error);
    }
}
