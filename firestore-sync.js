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
