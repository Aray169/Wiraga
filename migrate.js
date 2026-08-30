// =======================================================
// MIGRATE.JS - WIRAGA APP
// =======================================================
// Memindahkan data lama yang tersimpan di localStorage
// (dari sebelum ada sistem login) ke Firestore, terikat
// ke akun guru yang baru saja login. Berjalan OTOMATIS,
// SEKALI SAJA per akun (tidak akan menimpa data Firestore
// yang sudah ada di kunjungan berikutnya).
// =======================================================

async function migrasiDataLamaJikaPerlu(uid) {
    const penandaSelesai = 'wiraga_migrated_' + uid;

    // Sudah pernah dimigrasi di device/browser ini -> lewati
    if (localStorage.getItem(penandaSelesai) === 'true') {
        return;
    }

    // Ambil data lama dari localStorage (termasuk nama key cadangan/lama)
    let rumusLama = null;
    let riwayatLama = null;
    let agendaLama = null;
    let catatanLama = '';

    try { rumusLama = JSON.parse(localStorage.getItem('wiraga_rumus') || 'null'); } catch (e) {}
    try {
        riwayatLama = JSON.parse(
            localStorage.getItem('riwayatDB') ||
            localStorage.getItem('riwayat_wiraga') ||
            localStorage.getItem('dataRiwayat') ||
            localStorage.getItem('riwayatSesi') ||
            'null'
        );
    } catch (e) {}
    try { agendaLama = JSON.parse(localStorage.getItem('agendaDB') || 'null'); } catch (e) {}
    catatanLama = localStorage.getItem('coachNotes') || '';

    const adaDataLama =
        (Array.isArray(rumusLama) && rumusLama.length > 0) ||
        (Array.isArray(riwayatLama) && riwayatLama.length > 0) ||
        (Array.isArray(agendaLama) && agendaLama.length > 0) ||
        catatanLama.trim().length > 0;

    // Tidak ada data lama sama sekali -> tandai selesai, tidak perlu apa-apa
    if (!adaDataLama) {
        localStorage.setItem(penandaSelesai, 'true');
        return;
    }

    try {
        const docRef = db.collection('users').doc(uid);
        const docSnap = await docRef.get();

        // Kalau Firestore akun ini SUDAH pernah dimigrasi sebelumnya
        // (misal login dari device lain), jangan timpa - cukup tandai selesai.
        if (docSnap.exists && docSnap.data().migrated) {
            localStorage.setItem(penandaSelesai, 'true');
            return;
        }

        await docRef.set({
            rumus: Array.isArray(rumusLama) ? rumusLama : [],
            riwayat: Array.isArray(riwayatLama) ? riwayatLama : [],
            agenda: Array.isArray(agendaLama) ? agendaLama : [],
            catatan: catatanLama || '',
            migrated: true,
            migratedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        localStorage.setItem(penandaSelesai, 'true');
        console.log('✅ Data lama berhasil dipindahkan ke Firestore untuk akun ini.');
    } catch (error) {
        // Kalau migrasi gagal (misal offline), JANGAN tandai selesai,
        // supaya dicoba lagi di kunjungan berikutnya. Data lama tetap
        // aman di localStorage, tidak hilang.
        console.error('⚠️ Migrasi data lama gagal, akan dicoba lagi nanti:', error);
    }
}
