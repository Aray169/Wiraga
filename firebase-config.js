// =======================================================
// KONFIGURASI FIREBASE - WIRAGA APP
// =======================================================
// File ini menghubungkan aplikasi Wiraga ke project Firebase kamu.
// Kode config di bawah ini AMAN untuk publik (bukan password rahasia),
// keamanan sebenarnya diatur lewat "Security Rules" di Firestore.
// =======================================================

const firebaseConfig = {
  apiKey: "AIzaSyAnpwsAx4Of67C0rv85iXnXxbB6bE3cOT4",
  authDomain: "wiraga-app.firebaseapp.com",
  projectId: "wiraga-app",
  storageBucket: "wiraga-app.firebasestorage.app",
  messagingSenderId: "370681267088",
  appId: "1:370681267088:web:3b24d4e56ad80bf03e6915",
  measurementId: "G-08PBR8Y14P"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);

// Siapkan koneksi ke Authentication dan Firestore
// supaya bisa dipakai di script.js nanti
const auth = firebase.auth();
const db = firebase.firestore();

console.log("✅ Firebase berhasil terhubung ke project: " + firebaseConfig.projectId);