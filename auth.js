// =======================================================
// AUTH.JS - WIRAGA APP
// =======================================================
// Berisi semua logic yang berhubungan dengan login,
// daftar akun, login Google, logout, dan "penjaga pintu"
// yang memastikan hanya guru yang sudah login yang bisa
// membuka halaman utama aplikasi (index.html).
// =======================================================

const googleProvider = new firebase.auth.GoogleAuthProvider();

// ---------- Helper tampilan error & loading ----------
function showLoginError(message) {
    const box = document.getElementById('loginError');
    if (!box) return;
    box.textContent = message;
    box.style.display = 'block';
}

function clearLoginError() {
    const box = document.getElementById('loginError');
    if (!box) return;
    box.style.display = 'none';
    box.textContent = '';
}

function setLoginLoading(isLoading) {
    const loadingEl = document.getElementById('loginLoading');
    if (loadingEl) loadingEl.style.display = isLoading ? 'block' : 'none';

    document.querySelectorAll('.login-btn-primary, .login-btn-google').forEach(btn => {
        btn.disabled = isLoading;
    });
}

// ---------- Ganti tampilan form Masuk <-> Daftar ----------
function toggleForm(target) {
    clearLoginError();
    document.getElementById('formMasuk').style.display = target === 'masuk' ? 'block' : 'none';
    document.getElementById('formDaftar').style.display = target === 'daftar' ? 'block' : 'none';
}

// ---------- Terjemahkan kode error Firebase ke Bahasa Indonesia ----------
function terjemahErrorFirebase(error) {
    const map = {
        'auth/invalid-email': 'Format email tidak valid.',
        'auth/user-not-found': 'Email belum terdaftar. Silakan daftar dulu.',
        'auth/wrong-password': 'Kata sandi salah.',
        'auth/invalid-credential': 'Email atau kata sandi salah.',
        'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan masuk.',
        'auth/weak-password': 'Kata sandi minimal 6 karakter.',
        'auth/popup-closed-by-user': 'Jendela login Google ditutup sebelum selesai.',
        'auth/network-request-failed': 'Koneksi internet bermasalah. Coba lagi.'
    };
    return map[error.code] || ('Terjadi kesalahan: ' + error.message);
}

// ---------- Masuk dengan Email & Password ----------
function handleLoginEmail() {
    clearLoginError();
    const email = document.getElementById('masukEmail').value.trim();
    const password = document.getElementById('masukPassword').value;

    if (!email || !password) {
        showLoginError('Email dan kata sandi wajib diisi.');
        return;
    }

    setLoginLoading(true);
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch(error => {
            setLoginLoading(false);
            showLoginError(terjemahErrorFirebase(error));
        });
}

// ---------- Daftar Akun Baru dengan Email & Password ----------
function handleRegisterEmail() {
    clearLoginError();
    const nama = document.getElementById('daftarNama').value.trim();
    const email = document.getElementById('daftarEmail').value.trim();
    const password = document.getElementById('daftarPassword').value;

    if (!nama || !email || !password) {
        showLoginError('Semua kolom wajib diisi.');
        return;
    }
    if (password.length < 6) {
        showLoginError('Kata sandi minimal 6 karakter.');
        return;
    }

    setLoginLoading(true);
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            return userCredential.user.updateProfile({ displayName: nama });
        })
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch(error => {
            setLoginLoading(false);
            showLoginError(terjemahErrorFirebase(error));
        });
}

// ---------- Masuk / Daftar dengan Google ----------
function handleLoginGoogle() {
    clearLoginError();
    setLoginLoading(true);
    auth.signInWithPopup(googleProvider)
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch(error => {
            setLoginLoading(false);
            showLoginError(terjemahErrorFirebase(error));
        });
}

// ---------- Logout ----------
function handleLogout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}

// =======================================================
// PENJAGA PINTU (AUTH GUARD)
// =======================================================
// Berlaku beda tergantung sedang di halaman mana:
// - Di login.html  -> kalau ternyata SUDAH login, langsung lempar ke index.html
// - Di index.html  -> kalau ternyata BELUM login, langsung lempar ke login.html
// =======================================================

const halamanSaatIni = window.location.pathname.split('/').pop() || 'index.html';

// ---------- Jaring pengaman: kalau proses cek login macet > 6 detik ----------
let authSudahSelesai = false;
setTimeout(() => {
    if (!authSudahSelesai) {
        if (halamanSaatIni === 'login.html') {
            const ov = document.getElementById('loginCheckOverlay');
            if (ov) ov.remove(); // biarkan guru tetap bisa isi form manual
        } else {
            const teksEl = document.getElementById('authLoadingText');
            const btnEl = document.getElementById('authRetryBtn');
            const spinnerEl = document.getElementById('authSpinner');
            if (teksEl) teksEl.textContent = 'Gagal memeriksa status login. Periksa koneksi internet kamu.';
            if (spinnerEl) spinnerEl.style.display = 'none';
            if (btnEl) btnEl.style.display = 'inline-block';
        }
    }
}, 6000);

auth.onAuthStateChanged(user => {
    authSudahSelesai = true;

    if (halamanSaatIni === 'login.html') {
        const ov = document.getElementById('loginCheckOverlay');
        if (ov) ov.remove();
        if (user) {
            window.location.href = 'index.html';
        }
        return;
    }

    // Selain login.html, anggap ini halaman utama aplikasi (index.html)
    if (!user) {
        window.location.href = 'login.html';
    } else {
        // Tampilkan nama guru yang login (kalau elemennya ada di halaman)
        const namaEl = document.getElementById('namaUserAktif');
        if (namaEl) {
            namaEl.textContent = user.displayName || user.email;
        }

        // Simpan UID guru aktif secara global, dipakai file sinkronisasi lain
        window.uidAktif = user.uid;

        // Cek & pindahkan data lama (localStorage) ke Firestore, sekali saja
        const teksEl = document.getElementById('authLoadingText');
        if (teksEl) teksEl.textContent = 'Menyiapkan data kamu...';

        migrasiDataLamaJikaPerlu(user.uid)
            .then(() => {
                if (typeof muatRumusDariFirestore === 'function') {
                    return muatRumusDariFirestore(user.uid);
                }
            })
            .finally(() => {
                // Sembunyikan layar loading, tampilkan aplikasi
                const overlay = document.getElementById('authLoadingOverlay');
                if (overlay) overlay.remove();
            });
    }
});
