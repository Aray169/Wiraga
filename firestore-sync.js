// =======================================================
// FIRESTORE-SYNC.JS - WIRAGA APP
// =======================================================
// TAHAP 1 MIGRASI: RUMUS
// Mengambil & menyimpan data rumus dari/ke Firestore,
// terikat ke akun guru yang sedang login (window.uidAktif).
// localStorage tetap diisi sebagai cadangan/cache offline,
// tapi Firestore adalah sumber data utama.
// =======================================================

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
