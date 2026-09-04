// ========================================================
// RUMUS.JS - Wiraga App
// CRUD Rumus: parser smart, simpan, edit, hapus
// ========================================================

// ==========================================
// 3. PARSER & TAMBAH RUMUS SMART (FIXED)
// ==========================================

function parseRumusSmart() {
    const rawInput = document.getElementById('isiRumus').value.trim();
    const container = document.getElementById('smartPreviewContainer');
    const placeholder = document.getElementById('emptyPreviewPlaceholder');
    const chipsWrapper = document.getElementById('blockChipsWrapper');
    const statusDiv = document.getElementById('parenValidationStatus');
    const verbalSpan = document.getElementById('verbalText');

    if (!rawInput) {
        if (container) container.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
        isFormulaValid = false;
        return;
    }

    if (container) container.style.display = 'flex';
    if (placeholder) placeholder.style.display = 'none';

    // FIX REGEX: Karakter ^ di-escape (\^) agar dibaca sebagai simbol operator
    const tokens = rawInput.match(/sqrt|[a-zA-Z_]+|[0-9]+(?:\.[0-9]+)?|[\+\-\*\/\(\)\^\√]/g) || [];

    chipsWrapper.innerHTML = '';
    currentParsedVariables = [];
    let parenBalance = 0;
    let verbalWords = [];

    tokens.forEach(token => {
        let chipClass = '';
        let label = token;

        // 1. CEK FUNGSI AKAR
        if (token === 'sqrt' || token === '√') {
            chipClass = 'chip-fn';
            label = '√';
            verbalWords.push('akar kuadrat dari');
        } 
        // 2. CEK VARIABEL
        else if (/^[a-zA-Z_]+$/.test(token)) {
            chipClass = 'chip-var';
            label = `[${token}]`;
            if (!currentParsedVariables.includes(token)) {
                currentParsedVariables.push(token);
            }
            verbalWords.push(`<b>${token}</b>`);
        } 
        // 3. CEK ANGKA
        else if (/^[0-9]+(?:\.[0-9]+)?$/.test(token)) {
            chipClass = 'chip-num';
            verbalWords.push(token);
        } 
        // 4. CEK TANDA KURUNG
        else if (/^[\(\)]$/.test(token)) {
            chipClass = 'chip-paren';
            if (token === '(') {
                parenBalance++;
                verbalWords.push('(');
            } else {
                parenBalance--;
                verbalWords.push(')');
            }
        } 
        // 5. CEK OPERATOR (Termasuk Pangkat ^)
        else {
            chipClass = 'chip-op';
            const opMap = { 
                '+': 'ditambah', 
                '-': 'dikurangi', 
                '*': 'dikali', 
                '/': 'dibagi',
                '^': 'dipangkatkan'
            };
            const opSymbolMap = { 
                '*': '×', 
                '/': '÷',
                '^': '^' 
            };
            label = opSymbolMap[token] || token;
            verbalWords.push(opMap[token] || token);
        }

        const chipEl = document.createElement('span');
        chipEl.className = `chip ${chipClass}`;
        chipEl.innerHTML = label;
        chipsWrapper.appendChild(chipEl);
    });

    if (tokens.length === 0) {
        isFormulaValid = false;
    } else if (parenBalance === 0) {
        statusDiv.className = 'validation-badge-box status-valid';
        statusDiv.innerHTML = '<span style="color:#34d399;"><i class="fas fa-check-circle"></i> Formula valid & tanda kurung seimbang.</span>';
        isFormulaValid = true;
    } else if (parenBalance > 0) {
        statusDiv.className = 'validation-badge-box status-invalid';
        statusDiv.innerHTML = `<span style="color:#f87171;"><i class="fas fa-exclamation-triangle"></i> Kurang ${parenBalance} tanda kurung tutup <code>)</code>.</span>`;
        isFormulaValid = false;
    } else {
        statusDiv.className = 'validation-badge-box status-invalid';
        statusDiv.innerHTML = '<span style="color:#f87171;"><i class="fas fa-exclamation-triangle"></i> Kelebihan tanda kurung tutup <code>)</code>.</span>';
        isFormulaValid = false;
    }

    verbalSpan.innerHTML = verbalWords.length > 0 ? verbalWords.join(' ') : '...';
}

function simpanRumusSmart() {
    const nama = document.getElementById('namaRumus').value.trim();
    const formulaText = document.getElementById('isiRumus').value.trim();
    const deskripsi = document.getElementById('deskripsiRumus').value.trim();

    if (!nama || !formulaText) {
        alert('Mohon isi Nama Rumus dan Formula Rumus Matematika!');
        return;
    }

    if (!isFormulaValid) {
        alert('Formula belum valid! Periksa kembali susunan tanda kurung Anda.');
        return;
    }

    const dataRumusBaru = {
        id: 'rumus_' + Date.now(),
        nama: nama,
        formula: formulaText,
        variables: [...currentParsedVariables],
        deskripsi: deskripsi || 'Tidak ada deskripsi.'
    };

    daftarRumus.push(dataRumusBaru);
    simpanKeLocalStorage();

    alert(`✅ Rumus "${nama}" berhasil disimpan!`);

    document.getElementById('namaRumus').value = '';
    document.getElementById('isiRumus').value = '';
    document.getElementById('deskripsiRumus').value = '';
    if (document.getElementById('smartPreviewContainer')) {
        document.getElementById('smartPreviewContainer').style.display = 'none';
    }

    tampilHitung(dataRumusBaru.id);
}

function simpanRumus() {
    simpanRumusSmart();
}


// ==========================================
// LOGIKA EDIT RUMUS AKTIF
// ==========================================
let isEditFormulaValid = true;
let editParsedVariables = [];

function bukaModalEditRumus() {
    if (!activeRumusIdGlobal) return;
    const rumusObj = daftarRumus.find(r => r.id === activeRumusIdGlobal);
    if (!rumusObj) return;

    document.getElementById('editRumusNama').value = rumusObj.nama || '';
    document.getElementById('editRumusFormula').value = rumusObj.formula || '';
    document.getElementById('editRumusDeskripsi').value = rumusObj.deskripsi !== 'Tidak ada deskripsi.' ? (rumusObj.deskripsi || '') : '';

    document.getElementById('modalEditRumusAktif').style.display = 'flex';
    parseRumusSmartEdit();
}

function tutupModalEditRumus() {
    document.getElementById('modalEditRumusAktif').style.display = 'none';
}

function parseRumusSmartEdit() {
    const rawInput = document.getElementById('editRumusFormula').value.trim();
    const chipsWrapper = document.getElementById('editBlockChipsWrapper');
    const statusDiv = document.getElementById('editParenValidationStatus');
    const verbalSpan = document.getElementById('editVerbalText');

    if (!rawInput) {
        chipsWrapper.innerHTML = '';
        statusDiv.innerHTML = '';
        verbalSpan.innerHTML = '...';
        isEditFormulaValid = false;
        editParsedVariables = [];
        return;
    }

    // UPDATED REGEX EDIT: Mendukung sqrt, ^, dan √
    const tokens = rawInput.match(/sqrt|[a-zA-Z_]+|[0-9]+(?:\.[0-9]+)?|[\+\-\*\/\(\)\^\√]/g) || [];

    chipsWrapper.innerHTML = '';
    editParsedVariables = [];
    let parenBalance = 0;
    let verbalWords = [];

    tokens.forEach(token => {
        let chipClass = '';
        let label = token;

        if (token === 'sqrt' || token === '√') {
            chipClass = 'chip-fn';
            label = '√';
            verbalWords.push('akar kuadrat dari');
        } else if (/^[a-zA-Z_]+$/.test(token)) {
            chipClass = 'chip-var';
            label = `[${token}]`;
            if (!editParsedVariables.includes(token)) {
                editParsedVariables.push(token);
            }
            verbalWords.push(`<b>${token}</b>`);
        } else if (/^[0-9]+(?:\.[0-9]+)?$/.test(token)) {
            chipClass = 'chip-num';
            verbalWords.push(token);
        } else if (/^[\(\)]$/.test(token)) {
            chipClass = 'chip-paren';
            if (token === '(') {
                parenBalance++;
                verbalWords.push('(');
            } else {
                parenBalance--;
                verbalWords.push(')');
            }
        } else {
            chipClass = 'chip-op';
            const opMap = { 
                '+': 'ditambah', 
                '-': 'dikurangi', 
                '*': 'dikali', 
                '/': 'dibagi',
                '^': 'dipangkatkan'
            };
            const opSymbolMap = { 
                '*': '×', 
                '/': '÷',
                '^': '^' 
            };
            label = opSymbolMap[token] || token;
            verbalWords.push(opMap[token] || token);
        }

        const chipEl = document.createElement('span');
        chipEl.className = `chip ${chipClass}`;
        chipEl.innerHTML = label;
        chipsWrapper.appendChild(chipEl);
    });

    if (tokens.length === 0) {
        isEditFormulaValid = false;
    } else if (parenBalance === 0) {
        statusDiv.className = 'validation-badge-box status-valid';
        statusDiv.innerHTML = '<span style="color:#34d399;"><i class="fas fa-check-circle"></i> Formula valid & tanda kurung seimbang.</span>';
        isEditFormulaValid = true;
    } else if (parenBalance > 0) {
        statusDiv.className = 'validation-badge-box status-invalid';
        statusDiv.innerHTML = `<span style="color:#f87171;"><i class="fas fa-exclamation-triangle"></i> Kurang ${parenBalance} tanda kurung tutup <code>)</code>.</span>`;
        isEditFormulaValid = false;
    } else {
        statusDiv.className = 'validation-badge-box status-invalid';
        statusDiv.innerHTML = '<span style="color:#f87171;"><i class="fas fa-exclamation-triangle"></i> Kelebihan tanda kurung tutup <code>)</code>.</span>';
        isEditFormulaValid = false;
    }

    verbalSpan.innerHTML = verbalWords.length > 0 ? verbalWords.join(' ') : '...';
}

function simpanPerubahanRumusAktif() {
    if (!activeRumusIdGlobal) return;
    const rumusIdx = daftarRumus.findIndex(r => r.id === activeRumusIdGlobal);
    if (rumusIdx === -1) return;

    const namaBaru = document.getElementById('editRumusNama').value.trim();
    const formulaBaru = document.getElementById('editRumusFormula').value.trim();
    const deskripsiBaru = document.getElementById('editRumusDeskripsi').value.trim();

    if (!namaBaru || !formulaBaru) {
        alert('Mohon isi Nama Rumus dan Formula Rumus Matematika!');
        return;
    }

    if (!isEditFormulaValid) {
        alert('Formula belum valid! Periksa kembali susunan tanda kurung Anda.');
        return;
    }

    daftarRumus[rumusIdx].nama = namaBaru;
    daftarRumus[rumusIdx].formula = formulaBaru;
    daftarRumus[rumusIdx].variables = [...editParsedVariables];
    daftarRumus[rumusIdx].deskripsi = deskripsiBaru || 'Tidak ada deskripsi.';

    if (typeof simpanKeLocalStorage === 'function') simpanKeLocalStorage();
    if (typeof renderSidebarMenu === 'function') renderSidebarMenu();

    tutupModalEditRumus();
    tampilHitung(activeRumusIdGlobal);
    alert(`✅ Rumus "${namaBaru}" berhasil diperbarui!`);
}


function hapusRumus(rumusId) {
    let targetId = rumusId || activeRumusIdGlobal;
    let index = daftarRumus.findIndex(r => r.id === targetId);
    if (index === -1) return;

    if (confirm(`Hapus rumus "${daftarRumus[index].nama}"?`)) {
        daftarRumus.splice(index, 1);
        if (typeof simpanKeLocalStorage === 'function') simpanKeLocalStorage();
        if (typeof renderSidebarMenu === 'function') renderSidebarMenu();
        alert('Rumus berhasil dihapus!');

        document.getElementById('judulRumus').textContent = 'Pilih Rumus di Sidebar';
        document.getElementById('previewRumus').textContent = 'Silakan pilih salah satu tes dari menu sidebar untuk memulai perhitungan.';
        document.getElementById('tabContents').innerHTML = '';
        document.getElementById('hasilCard').innerHTML = '';
        document.querySelector('.primaryAction').innerHTML = '';
        document.getElementById('hapusRumusBtn').style.display = 'none';
        
        const btnGroup = document.getElementById('btnGroupRumusHeader');
        if (btnGroup) btnGroup.style.display = 'none';
    }
}

