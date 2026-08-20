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
    renderSubmenuHitung();
    updateBerandaStats();
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

// ==========================================
// 3. PARSER & TAMBAH RUMUS SMART
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

    const tokens = rawInput.match(/([a-zA-Z_]+|[0-9]+(?:\.[0-9]+)?|[\+\-\*\/\(\)])/g) || [];

    chipsWrapper.innerHTML = '';
    currentParsedVariables = [];
    let parenBalance = 0;
    let verbalWords = [];

    tokens.forEach(token => {
        let chipClass = '';
        let label = token;

        if (/^[a-zA-Z_]+$/.test(token)) {
            chipClass = 'chip-var';
            label = `[${token}]`;
            if (!currentParsedVariables.includes(token)) {
                currentParsedVariables.push(token);
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
            const opMap = { '+': 'ditambah', '-': 'dikurangi', '*': 'dikali', '/': 'dibagi' };
            const opSymbolMap = { '*': '×', '/': '÷' };
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
// 4. LOGIKA HALAMAN HITUNG (UPDATED)
// ==========================================

let activeRumusIdGlobal = null;

function tampilHitung(rumusId) {
    const rumusObj = daftarRumus.find(r => r.id === rumusId);
    if (!rumusObj) return;

    activeRumusIdGlobal = rumusId;
    showPage('hitung');

    const sub = document.getElementById('hitungSub');
    if (sub) sub.classList.add('show');

    const btnGroup = document.getElementById('btnGroupRumusHeader');
    if (btnGroup) btnGroup.style.display = 'flex';

    document.getElementById('judulRumus').textContent = 'Hitung: ' + rumusObj.nama;
    document.getElementById('previewRumus').textContent = (rumusObj.deskripsi ? rumusObj.deskripsi + ' | ' : '') + 'Formula: ' + rumusObj.formula;
    document.getElementById('hasilCard').innerHTML = '';

    const tabContents = document.getElementById('tabContents');
    tabContents.innerHTML = '';

    let table = buatTabelInput(rumusObj);
    tabContents.appendChild(table);
    tambahBaris(rumusObj.id, table);

    const primaryDiv = document.querySelector('.primaryAction');
    if (primaryDiv) {
        primaryDiv.innerHTML = '';

        const btnTambah = document.createElement('button');
        btnTambah.className = 'btn-primary';
        btnTambah.style.width = '50px';
        btnTambah.textContent = '+';
        btnTambah.onclick = () => tambahBaris(rumusObj.id);

        const btnHitung = document.createElement('button');
        btnHitung.className = 'btn-primary';
        btnHitung.style.flex = '1';
        btnHitung.textContent = 'HITUNG';
        btnHitung.onclick = () => hitungNilai(rumusObj.id);

        primaryDiv.appendChild(btnTambah);
        primaryDiv.appendChild(btnHitung);
    }

    const hapusBtn = document.getElementById('hapusRumusBtn');
    if (hapusBtn) {
        hapusBtn.style.display = 'inline-block';
        hapusBtn.onclick = () => hapusRumus(rumusObj.id);
    }

    const elTanggal = document.getElementById('inputTanggalTesHitung');
    if (elTanggal && !elTanggal.value) {
        elTanggal.value = new Date().toISOString().split('T')[0];
    }
}

function buatTabelInput(rumusObj) {
    let vars = rumusObj.variables && rumusObj.variables.length > 0 ? rumusObj.variables : ['x'];

    let t = document.createElement('table');
    t.className = 'custom-table';
    t.id = 'table_' + rumusObj.id;

    let th = '<tr><th>No</th><th>Nama Atlet</th>';
    vars.forEach(v => th += `<th>${v}</th>`);
    th += '<th>Aksi</th></tr>';

    t.innerHTML = th;
    return t;
}

function tambahBaris(rumusId, tableEl) {
    let rumusObj = daftarRumus.find(r => r.id === rumusId);
    let table = tableEl || document.getElementById('table_' + rumusId);
    if (!table || !rumusObj) return;

    let idx = table.rows.length;
    let vars = rumusObj.variables && rumusObj.variables.length > 0 ? rumusObj.variables : ['x'];

    let row = table.insertRow();
    let cells = `<td>${idx}</td><td><input type="text" placeholder="Nama Atlet" class="calc-input"/></td>`;
    vars.forEach(() => cells += '<td><input type="number" step="any" placeholder="0" class="calc-input"/></td>');
    cells += `<td><button onclick="hapusBaris(this)" style="background:none; border:none; color:#ef4444; cursor:pointer;">❌</button></td>`;
    row.innerHTML = cells;
}

function hapusBaris(btn) {
    let table = btn.closest('table');
    btn.parentElement.parentElement.remove();
    for (let i = 1; i < table.rows.length; i++) {
        table.rows[i].cells[0].textContent = i;
    }
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

    const tokens = rawInput.match(/([a-zA-Z_]+|[0-9]+(?:\.[0-9]+)?|[\+\-\*\/\(\)])/g) || [];

    chipsWrapper.innerHTML = '';
    editParsedVariables = [];
    let parenBalance = 0;
    let verbalWords = [];

    tokens.forEach(token => {
        let chipClass = '';
        let label = token;

        if (/^[a-zA-Z_]+$/.test(token)) {
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
            const opMap = { '+': 'ditambah', '-': 'dikurangi', '*': 'dikali', '/': 'dibagi' };
            const opSymbolMap = { '*': '×', '/': '÷' };
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

function filterTabelAtlet() {
    const searchInput = document.getElementById('searchAtletInput');
    if (!searchInput) return;
    const filter = searchInput.value.toLowerCase().trim();

    const tabContents = document.getElementById('tabContents');
    if (!tabContents) return;

    const rows = tabContents.querySelectorAll('tr');

    rows.forEach(row => {
        if (row.querySelector('th')) return;

        const textInputs = row.querySelectorAll('input[type="text"]');
        if (textInputs.length > 0) {
            const namaAtletInput = textInputs[0]; 
            const namaAtlet = (namaAtletInput.value || '').toLowerCase();

            if (namaAtlet.includes(filter)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// ==========================================
// LOGIKA IMPORT DATA DARI EXCEL / CSV
// ==========================================
function prosesImportExcel(event) {
    const file = event.target.files[0];
    if (!file || !activeRumusIdGlobal) return;

    const rumusObj = daftarRumus.find(r => r.id === activeRumusIdGlobal);
    if (!rumusObj) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (jsonRows.length < 2) {
                alert('File Excel kosong atau tidak memiliki baris data!');
                return;
            }

            const table = document.getElementById('table_' + rumusObj.id);
            if (!table) return;

            while (table.rows.length > 1) {
                table.deleteRow(1);
            }

            let varsCount = rumusObj.variables && rumusObj.variables.length > 0 ? rumusObj.variables.length : 1;

            let importedCount = 0;
            for (let i = 1; i < jsonRows.length; i++) {
                const rowData = jsonRows[i];
                if (!rowData || rowData.length === 0) continue;

                const nama = rowData[0] ? String(rowData[0]).trim() : '';
                if (!nama) continue;

                tambahBaris(rumusObj.id, table);
                const lastRow = table.rows[table.rows.length - 1];

                lastRow.cells[1].querySelector('input').value = nama;

                for (let vIdx = 0; vIdx < varsCount; vIdx++) {
                    const val = rowData[vIdx + 1] !== undefined ? rowData[vIdx + 1] : 0;
                    if (lastRow.cells[2 + vIdx]) {
                        lastRow.cells[2 + vIdx].querySelector('input').value = val;
                    }
                }
                importedCount++;
            }

            alert(`✅ Berhasil mengimpor ${importedCount} data siswa dari file Excel!`);
            event.target.value = '';

        } catch (error) {
            alert('Gagal membaca file Excel. Pastikan format file sesuai! Error: ' + error.message);
        }
    };

    reader.readAsArrayBuffer(file);
}

// ==========================================
// HITUNG NILAI & BACA LOGIKA
// ==========================================
function hitungNilai(rumusId) {
    let rumusObj = daftarRumus.find(r => r.id === rumusId);
    if (!rumusObj) return;

    let table = document.getElementById('table_' + rumusId);
    let vars = rumusObj.variables && rumusObj.variables.length > 0 ? rumusObj.variables : ['x'];
    hasilTerakhir = [];

    const benchmarkInput = Number(document.getElementById('inputBenchmarkHitung')?.value) || 0;
    const orientasiSelected = document.querySelector('input[name="orientasiTes"]:checked')?.value;
    const isLowerBetter = (orientasiSelected === 'lower');

    const valSB = document.getElementById('rubrikSangatBaik')?.value;
    const valB  = document.getElementById('rubrikBaik')?.value;
    const valC  = document.getElementById('rubrikCukup')?.value;

    const limitSB = valSB !== "" && valSB !== null ? Number(valSB) : null;
    const limitB  = valB  !== "" && valB  !== null ? Number(valB)  : null;
    const limitC  = valC  !== "" && valC  !== null ? Number(valC)  : null;

    function getKategoriRubrik(resultVal) {
        if (limitSB === null && limitB === null && limitC === null) {
            return { label: '-', color: '#94a3b8' };
        }

        if (isLowerBetter) {
            if (limitSB !== null && resultVal <= limitSB) return { label: 'Sangat Baik', color: '#2ed573' };
            if (limitB  !== null && resultVal <= limitB)  return { label: 'Baik',        color: '#38bdf8' };
            if (limitC  !== null && resultVal <= limitC)  return { label: 'Cukup',       color: '#feca57' };
            return { label: 'Kurang', color: '#ff4757' };
        } else {
            if (limitSB !== null && resultVal >= limitSB) return { label: 'Sangat Baik', color: '#2ed573' };
            if (limitB  !== null && resultVal >= limitB)  return { label: 'Baik',        color: '#38bdf8' };
            if (limitC  !== null && resultVal >= limitC)  return { label: 'Cukup',       color: '#feca57' };
            return { label: 'Kurang', color: '#ff4757' };
        }
    }

    let html = `
    <div style="overflow-x:auto;">
    <table class="custom-table" style="width:100%; font-size:12px;">
        <tr>
            <th>No</th>
            <th>Nama</th>
            <th>Result</th>
            <th>Kategori (Rubrik)</th>
            <th>Benchmark</th>
            <th>Presentase</th>
            <th>Gap</th>
            <th>% Result</th>
        </tr>`;

    let countValid = 0;

    for (let i = 1; i < table.rows.length; i++) {
        let r = table.rows[i];
        let namaInput = r.cells[1].querySelector('input');
        if (!namaInput) continue;
        let nama = namaInput.value.trim();
        if (!nama) continue;

        let values = vars.map((v, j) => parseFloat(r.cells[2 + j].querySelector('input').value));
        if (values.some(v => isNaN(v))) continue;

        try {
            let fn = new Function(...vars, 'return ' + rumusObj.formula);
            let hasil = fn(...values);
            let result = Number(hasil.toFixed(2));

            const kategoriObj = getKategoriRubrik(result);

            let presentase = 0;
            if (benchmarkInput > 0) {
                if (isLowerBetter) {
                    presentase = (2 - (result / benchmarkInput)) * 100;
                    if (presentase < 0) presentase = 0;
                } else {
                    presentase = (result / benchmarkInput) * 100;
                }
            }

            const percentResult = presentase > 100 ? 100 : presentase;
            const gap = (100 - presentase) < 0 ? 0 : (100 - presentase);

            countValid++;

            html += `
            <tr>
                <td>${countValid}</td>
                <td><b>${nama}</b></td>
                <td style="color:#38bdf8; font-weight:bold;">${result} ${rumusObj.satuan || ''}</td>
                <td style="color:${kategoriObj.color}; font-weight:bold;">${kategoriObj.label}</td>
                <td>${benchmarkInput || '-'}</td>
                <td>${presentase > 0 ? presentase.toFixed(2) + '%' : '-'}</td>
                <td style="color:#ffa502;">${gap > 0 ? gap.toFixed(2) + '%' : '-'}</td>
                <td style="font-weight:bold;">${percentResult > 0 ? percentResult.toFixed(2) + '%' : '-'}</td>
            </tr>`;

            let obj = { 
                nama: nama, 
                rumus: rumusObj.nama,
                component: rumusObj.kategori || 'Physical',
                itemTest: rumusObj.nama,
                unit: rumusObj.satuan || '',
                nilai: result,
                kategori: kategoriObj.label,
                benchmark: benchmarkInput,
                presentase: Number(presentase.toFixed(2)),
                gap: Number(gap.toFixed(2)),
                percentResult: Number(percentResult.toFixed(2)),
                isLowerBetter: isLowerBetter
            };
            
            vars.forEach((v, j) => obj[v] = values[j]);
            hasilTerakhir.push(obj);

        } catch (e) {
            alert('Gagal Menghitung: ' + e);
            return;
        }
    }

    if (countValid === 0) {
        alert('Harap isi minimal 1 data atlet dan nilai parameter!');
        return;
    }

    html += '</table></div>';
    document.getElementById('hasilCard').innerHTML = html;
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

// ==========================================
// LOGIKA MODUL RIWAYAT TINGKAT LANJUT
// ==========================================

let currentRiwayatTab = 'sesi';

function getKategoriBadgeHtml(kategori) {
    let color = '#94a3b8';
    let kat = kategori || '-';

    switch (kat) {
        case 'Sangat Baik': color = '#2ed573'; break;
        case 'Baik':        color = '#38bdf8'; break;
        case 'Cukup':       color = '#feca57'; break;
        case 'Kurang':      color = '#ff4757'; break;
    }

    return `<span style="color: ${color}; font-weight: bold;">${kat}</span>`;
}

function simpanRiwayat() {
    if (!hasilTerakhir || hasilTerakhir.length === 0) { 
        alert('⚠️ Belum ada hasil perhitungan untuk disimpan!'); 
        return; 
    }

    const inputKelas = document.getElementById('inputKelasTesHitung')?.value.trim() || 'Umum';
    const inputTanggal = document.getElementById('inputTanggalTesHitung')?.value || new Date().toISOString().split('T')[0];
    const inputCatatan = document.getElementById('inputCatatanHitung')?.value.trim() || '-';
    const inputBenchmark = Number(document.getElementById('inputBenchmarkHitung')?.value) || 0;
    const namaTes = hasilTerakhir[0]?.rumus || 'Tes Fisik';

    const orientasiVal = document.querySelector('input[name="orientasiTes"]:checked')?.value;
    const isLowerBetterForm = (orientasiVal === 'lower');

    const valSB = document.getElementById('rubrikSangatBaik')?.value;
    const valB  = document.getElementById('rubrikBaik')?.value;
    const valC  = document.getElementById('rubrikCukup')?.value;

    const rubrikLimits = {
        sb: valSB !== "" && valSB !== null && !isNaN(valSB) ? Number(valSB) : null,
        b:  valB  !== "" && valB  !== null && !isNaN(valB)  ? Number(valB)  : null,
        c:  valC  !== "" && valC  !== null && !isNaN(valC)  ? Number(valC)  : null
    };

    let totalPercentResult = 0;

    const dataSiswaLengkap = JSON.parse(JSON.stringify(hasilTerakhir)).map(item => {
        const result = Number(item.nilai !== undefined ? item.nilai : (item.result || 0));
        const benchmark = Number(item.benchmark || inputBenchmark || 0);
        
        const isLowerBetter = item.isLowerBetter !== undefined 
            ? item.isLowerBetter 
            : (orientasiVal !== undefined 
                ? isLowerBetterForm 
                : ['sprint', 'shuttle', 'run', 'lari', 'agility', 'time', 'detik', 'second'].some(k => 
                    String(item.itemTest || item.rumus || '').toLowerCase().includes(k)
                  )
              );

        let presentase = 0;

        if (benchmark > 0) {
            if (isLowerBetter) {
                presentase = (2 - (result / benchmark)) * 100;
                if (presentase < 0) presentase = 0;
            } else {
                presentase = (result / benchmark) * 100;
            }
        }

        const percentResult = presentase > 100 ? 100 : presentase;
        const gap = (100 - presentase) < 0 ? 0 : (100 - presentase);

        totalPercentResult += percentResult;

        let kategoriFix = item.kategori || '-';
        if (kategoriFix === '-' && (rubrikLimits.sb !== null || rubrikLimits.b !== null || rubrikLimits.c !== null)) {
            if (isLowerBetter) {
                if (rubrikLimits.sb !== null && result <= rubrikLimits.sb) kategoriFix = 'Sangat Baik';
                else if (rubrikLimits.b !== null && result <= rubrikLimits.b) kategoriFix = 'Baik';
                else if (rubrikLimits.c !== null && result <= rubrikLimits.c) kategoriFix = 'Cukup';
                else kategoriFix = 'Kurang';
            } else {
                if (rubrikLimits.sb !== null && result >= rubrikLimits.sb) kategoriFix = 'Sangat Baik';
                else if (rubrikLimits.b !== null && result >= rubrikLimits.b) kategoriFix = 'Baik';
                else if (rubrikLimits.c !== null && result >= rubrikLimits.c) kategoriFix = 'Cukup';
                else kategoriFix = 'Kurang';
            }
        }

        return {
            ...item,
            benchmark: benchmark,
            result: result,
            kategori: kategoriFix,
            presentase: Number(presentase.toFixed(2)),
            gap: Number(gap.toFixed(2)),
            percentResult: Number(percentResult.toFixed(2)),
            isLowerBetter: isLowerBetter
        };
    });

    const overallReadiness = Number((totalPercentResult / (hasilTerakhir.length || 1)).toFixed(2));

    const sesiBaru = {
        id: 'riwayat_' + Date.now(),
        tanggal: inputTanggal,
        waktuSimpan: new Date().toLocaleString('id-ID'),
        namaTes: namaTes,
        kelas: inputKelas,
        catatan: inputCatatan,
        benchmark: inputBenchmark,
        rubrikLimits: rubrikLimits,
        overallReadiness: overallReadiness,
        jumlahSiswa: hasilTerakhir.length,
        dataSiswa: dataSiswaLengkap
    };

    if (typeof riwayatDB === 'undefined') window.riwayatDB = [];
    riwayatDB.push(sesiBaru);
    localStorage.setItem('riwayatDB', JSON.stringify(riwayatDB));

    tampilRiwayat();
    if (typeof updateBerandaStats === 'function') updateBerandaStats();
    if (typeof renderPerformanceChart === 'function') renderPerformanceChart();

    alert(`✅ Riwayat tes "${namaTes}" (${inputKelas}) berhasil disimpan!`);
}

function switchTabRiwayat(tab) {
    currentRiwayatTab = tab;
    
    document.querySelectorAll('.btn-tab-riwayat').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    tampilRiwayat();
}

function tampilRiwayat() {
    const container = document.getElementById('riwayatList');
    if (!container) return;

    let db = [];
    if (typeof riwayatDB !== 'undefined' && Array.isArray(riwayatDB) && riwayatDB.length > 0) {
        db = riwayatDB;
    } else {
        const localData = localStorage.getItem('riwayatDB') || localStorage.getItem('dataRiwayat') || localStorage.getItem('riwayatSesi');
        if (localData) {
            try {
                db = JSON.parse(localData);
                if (typeof riwayatDB !== 'undefined') window.riwayatDB = db;
            } catch (e) {
                console.error("Gagal parse riwayat data:", e);
            }
        }
    }

    if (!db || db.length === 0) {
        container.innerHTML = `
            <div class="empty-state-box" style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-folder-open empty-state-icon" style="font-size: 36px; margin-bottom: 12px; display: block; color: #64748b;"></i>
                <h4 style="color: #f1f5f9; margin-bottom: 6px;">Belum Ada Riwayat Pengujian</h4>
                <p style="font-size: 13px; color: #94a3b8;">Data hasil pengujian fisik yang kamu simpan dari menu Hitung akan tersimpan di sini.</p>
            </div>`;
        return;
    }

    switch (currentRiwayatTab) {
        case 'kelas':
            renderRiwayatPerKelas(container);
            break;
        case 'siswa':
            renderRiwayatPerSiswa(container);
            break;
        case 'sesi':
        default:
            renderRiwayatPerSesi(container);
            break;
    }
}

window.activeRiwayatCharts = window.activeRiwayatCharts || {};

function renderRiwayatPerSesi(container) {
    const targetContainer = container || document.getElementById('riwayatList');
    if (!targetContainer) return;

    let sourceData = [];
    if (typeof riwayatDB !== 'undefined' && Array.isArray(riwayatDB) && riwayatDB.length > 0) {
        sourceData = riwayatDB;
    } else {
        const localData = localStorage.getItem('riwayatDB') || localStorage.getItem('dataRiwayat');
        if (localData) {
            try { 
                sourceData = JSON.parse(localData); 
                if (typeof riwayatDB !== 'undefined') window.riwayatDB = sourceData;
            } catch (e) {}
        }
    }

    if (!sourceData || sourceData.length === 0) {
        targetContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-folder-open" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                Belum ada riwayat tes tersimpan.
            </div>`;
        return;
    }

    let html = '<div class="riwayat-sesi-container">';
    const sortedData = [...sourceData].reverse();

    sortedData.forEach((sesi, index) => {
        const sesiId = sesi.id || `sesi_${index}_${Date.now()}`;
        
        const hasBenchmark = (sesi.benchmark && Number(sesi.benchmark) > 0) || 
                             (sesi.dataSiswa && sesi.dataSiswa.some(s => Number(s.benchmark) > 0));

        const readinessVal = sesi.overallReadiness !== undefined ? sesi.overallReadiness : (sesi.rataRata || '-');
        const countSiswa = sesi.jumlahSiswa || (sesi.dataSiswa ? sesi.dataSiswa.length : 0);

        // =========================================================
        // KALKULASI STATISTIK RINGKASAN SESI
        // =========================================================
        const listSiswa = sesi.dataSiswa || [];
        let avgNilai = 0, minNilai = 0, maxNilai = 0;
        let siswaTuntas = 0, totalSiswaStat = listSiswa.length;
        let persenTuntas = 0;

        if (totalSiswaStat > 0) {
            const arrNilai = listSiswa.map(s => Number(s.nilai !== undefined ? s.nilai : (s.result || 0)));
            
            const totalNilai = arrNilai.reduce((acc, curr) => acc + curr, 0);
            avgNilai = (totalNilai / totalSiswaStat).toFixed(1);
            minNilai = Math.min(...arrNilai);
            maxNilai = Math.max(...arrNilai);

            // Hitung Ketuntasan
            siswaTuntas = listSiswa.filter(s => {
                const rawPres = s.presentase !== undefined ? s.presentase : (s.percentResult !== undefined ? s.percentResult : 0);
                const bench = Number(s.benchmark !== undefined ? s.benchmark : (sesi.benchmark || 0));
                const val = Number(s.nilai !== undefined ? s.nilai : (s.result || 0));
                
                return Number(rawPres) >= 100 || (bench > 0 && val >= bench);
            }).length;

            persenTuntas = ((siswaTuntas / totalSiswaStat) * 100).toFixed(1);
        }

        html += `
        <div class="riwayat-item-card" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 15px; padding: 15px;">
            <div class="riwayat-item-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <span class="badge-kelas" style="background: #38bdf8; color: #0f172a; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; text-transform: uppercase;">
                        ${sesi.kelas || 'UMUM'}
                    </span>
                    <h4 style="color: #fff; margin: 6px 0 2px 0; font-size: 16px;">${sesi.namaTes}</h4>
                    <small style="color: #94a3b8; display: block;">
                        <i class="far fa-calendar-alt"></i> ${sesi.tanggal || '-'} | 
                        <i class="fas fa-users"></i> ${countSiswa} Siswa | 
                        ${hasBenchmark ? `Readiness: <b style="color:#ff6b6b">${readinessVal}%</b>` : `Rata-rata: <b style="color:#2ed573">${readinessVal}</b>`}
                    </small>
                </div>

                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn-detail" onclick="toggleDetailSesi('${sesiId}')" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-chevron-down"></i> Detail
                    </button>
                    <button type="button" class="btn-delete-item" onclick="hapusSesiRiwayat('${sesiId}')" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button type="button" class="btn-edit-sesi" onclick="editSesiRiwayat('${sesiId}')" style="background: rgba(254, 202, 87, 0.15); color: #feca57; border: 1px solid rgba(254, 202, 87, 0.3); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-sliders-h"></i> Edit Param
                    </button>
                </div>
            </div>

            <div id="detail_${sesiId}" style="display: none; padding-top: 15px; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.08);">
                
                ${sesi.catatan && sesi.catatan !== '-' ? `<p style="font-size: 12px; color: #feca57; margin-bottom: 12px;">📌 <i>Catatan: ${sesi.catatan}</i></p>` : ''}
                
                <!-- KARTU RINGKASAN STATISTIK -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 15px;">
                    <div style="background: rgba(30, 41, 59, 0.7); padding: 10px; border-radius: 8px; border-left: 3px solid #38bdf8;">
                        <span style="font-size: 11px; color: #94a3b8; display: block;">Rata-Rata Nilai</span>
                        <strong style="font-size: 15px; color: #38bdf8;">${avgNilai}</strong>
                    </div>
                    <div style="background: rgba(30, 41, 59, 0.7); padding: 10px; border-radius: 8px; border-left: 3px solid #2ed573;">
                        <span style="font-size: 11px; color: #94a3b8; display: block;">Skor Tertinggi</span>
                        <strong style="font-size: 15px; color: #2ed573;">${maxNilai}</strong>
                    </div>
                    <div style="background: rgba(30, 41, 59, 0.7); padding: 10px; border-radius: 8px; border-left: 3px solid #ff4757;">
                        <span style="font-size: 11px; color: #94a3b8; display: block;">Skor Terendah</span>
                        <strong style="font-size: 15px; color: #ff4757;">${minNilai}</strong>
                    </div>
                    <div style="background: rgba(30, 41, 59, 0.7); padding: 10px; border-radius: 8px; border-left: 3px solid #feca57;">
                        <span style="font-size: 11px; color: #94a3b8; display: block;">Ketuntasan</span>
                        <strong style="font-size: 14px; color: #feca57;">${persenTuntas}% <small style="font-weight: normal; font-size: 11px; color: #94a3b8;">(${siswaTuntas}/${totalSiswaStat})</small></strong>
                    </div>
                </div>

                <div style="overflow-x: auto; margin-bottom: 20px;">
                    <table class="custom-table" style="width:100%; font-size:12px; border-collapse: collapse;">
                        <thead>
                            <tr style="background: rgba(30, 41, 59, 0.8); text-align: left; color: #94a3b8;">
                                <th style="padding: 8px;">No</th>
                                <th style="padding: 8px;">Nama Siswa / Atlet</th>
                                <th style="padding: 8px;">Instrumen Test</th>
                                <th style="padding: 8px; text-align: center;">Hasil</th>
                                <th style="padding: 8px; text-align: center;">Kategori / Skala</th>
                                <th style="padding: 8px; text-align: center;">Benchmark</th>
                                <th style="padding: 8px; text-align: center;">Gap (%)</th>
                                <th style="padding: 8px; text-align: center;">Hasil (%)</th>
                                <th style="padding: 8px; text-align: center;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(sesi.dataSiswa || []).map((s, idx) => {
                                const valHasil = s.nilai !== undefined ? s.nilai : (s.result !== undefined ? s.result : 0);
                                const valBench = s.benchmark !== undefined ? s.benchmark : (sesi.benchmark || '-');
                                const valGap = s.gap !== undefined ? s.gap : '-';
                                const rawPres = s.presentase !== undefined ? s.presentase : (s.percentResult !== undefined ? s.percentResult : 0);
                                
                                let cappedPres = rawPres;
                                if (typeof rawPres === 'number' || !isNaN(Number(rawPres))) {
                                    cappedPres = Math.min(Number(rawPres), 100);
                                }

                                const valHasilPersen = typeof cappedPres === 'number' ? cappedPres.toFixed(2) : cappedPres;
                                const isLulus = Number(rawPres) >= 100;
                                const colorHasilPersen = isLulus ? '#2ed573' : '#ff4757';

                                return `
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <td style="padding: 8px;">${idx + 1}</td>
                                    <td style="padding: 8px;"><b>${s.nama || s.siswa || 'Siswa ' + (idx + 1)}</b></td>
                                    <td style="padding: 8px; color: #38bdf8;">${s.itemTest || s.rumus || sesi.namaTes}</td>
                                    <td style="padding: 8px; color: #2ed573; font-weight: bold; text-align: center;">${valHasil} ${s.unit || ''}</td>
                                    <td style="padding: 8px; text-align: center;">${getKategoriBadgeHtml(s.kategori)}</td>
                                    <td style="padding: 8px; color: #94a3b8; text-align: center;">${valBench}</td>
                                    <td style="padding: 8px; color: #f87171; font-weight: bold; text-align: center;">${valGap}${valGap !== '-' ? '%' : ''}</td>
                                    <td style="padding: 8px; color: ${colorHasilPersen}; font-weight: bold; text-align: center;">
                                        ${valHasilPersen}${valHasilPersen !== '-' ? '%' : ''}
                                    </td>
                                    <td style="padding: 8px; text-align: center;"><button type="button" onclick="editSiswaRiwayat('${sesiId}', ${idx})" style="background: rgba(254, 202, 87, 0.2); color: #feca57; border: 1px solid rgba(254, 202, 87, 0.4); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                        <i class="fas fa-edit"></i> Edit
                                            </button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- KONTAINER GRAFIK YANG SUDAH DISESUAIKAN -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; align-items: start; background: rgba(30, 41, 59, 0.4); padding: 15px; border-radius: 10px;">
                    <div>
                        <span style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 8px; font-weight: 600;">
                            <i class="fas fa-chart-bar" style="color: #38bdf8;"></i> Perbandingan Benchmark vs Result per Siswa
                        </span>
                        <!-- Wrapper Scrollable Vertikal -->
                        <div style="max-height: 300px; overflow-y: auto; overflow-x: hidden; position: relative; padding-right: 5px;">
                            <canvas id="chartBarGrouped_${sesiId}"></canvas>
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <span style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 8px; font-weight: 600;">
                            <i class="fas fa-chart-pie" style="color: #ff6b6b;"></i> Tingkat Ketuntasan Siswa
                        </span>
                        <div style="max-width: 180px; margin: 0 auto; height: 180px; position: relative;">
                            <canvas id="chartDoughnut_${sesiId}"></canvas>
                        </div>
                    </div>
                </div>

            </div>
        </div>`;
    });

    html += '</div>';
    targetContainer.innerHTML = html;
}

function renderChartsForSesi(id) {
    if (typeof Chart === 'undefined') return;

    if (!window.activeRiwayatCharts) window.activeRiwayatCharts = {};

    let sourceDB = (typeof riwayatDB !== 'undefined' && riwayatDB.length > 0) 
        ? riwayatDB 
        : JSON.parse(localStorage.getItem('riwayatDB') || '[]');

    const sesi = sourceDB.find(s => String(s.id) === String(id));
    if (!sesi || !sesi.dataSiswa) return;

    const dataSiswa = sesi.dataSiswa;
    
    // 1. Simpan Nama Asli untuk Tooltip Hover
    const labelsNama = dataSiswa.map(s => s.nama || s.siswa || 'Siswa');
    
    // 2. Buat Label Sumbu X berupa Nomor Absen (1, 2, 3, ... N)
    const labelsAbsen = dataSiswa.map((_, i) => i + 1);

    const dataNilai = dataSiswa.map(s => Number(s.nilai !== undefined ? s.nilai : (s.result || 0)));
    const dataBenchmark = dataSiswa.map(s => Number(s.benchmark !== undefined ? s.benchmark : (sesi.benchmark || 0)));
    
    const dataGapPersen = dataSiswa.map((s, idx) => {
        const valNilai = dataNilai[idx];
        const valBench = dataBenchmark[idx];
        if (valBench === 0) return 0;
        return Number((((valNilai - valBench) / valBench) * 100).toFixed(2));
    });

    const barColors = dataSiswa.map((s, idx) => {
        const valNilai = dataNilai[idx];
        const valBench = dataBenchmark[idx];
        if (valNilai > valBench) return 'rgba(46, 213, 115, 0.85)';  // Hijau
        if (valNilai === valBench) return 'rgba(56, 189, 248, 0.85)'; // Biru
        return 'rgba(255, 71, 87, 0.85)';                          // Merah
    });

    // =========================================================
    // COMBO DUAL-AXIS CHART
    // =========================================================
    const barCanvas = document.getElementById(`chartBarGrouped_${id}`);
    if (barCanvas) {
        if (window.activeRiwayatCharts[`chartBarGrouped_${id}`]) {
            window.activeRiwayatCharts[`chartBarGrouped_${id}`].destroy();
        }

        window.activeRiwayatCharts[`chartBarGrouped_${id}`] = new Chart(barCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                // GUNAKAN LABELS NOMOR ABSEN AGAR TERCETAK DI GAMBAR
                labels: labelsAbsen, 
                datasets: [
                    {
                        type: 'line',
                        label: 'Gap (%)',
                        data: dataGapPersen,
                        borderColor: '#feca57',
                        backgroundColor: '#feca57',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        yAxisID: 'y1'
                    },
                    {
                        type: 'line',
                        label: 'Benchmark',
                        data: dataBenchmark,
                        borderColor: '#ff4757',
                        borderWidth: 2,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        type: 'bar',
                        label: 'Nilai Mentah',
                        data: dataNilai,
                        backgroundColor: barColors,
                        borderRadius: 4,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        // TAMPILKAN NOMOR ABSEN DI SUMBU X
                        ticks: { 
                            display: true, 
                            color: '#64748b', 
                            font: { size: 10, weight: 'bold' },
                            maxRotation: 0, // Pastikan teks tegak/lurus
                            autoSkip: false // Tampilkan semua nomor absen tanpa ada yang terlewat
                        }, 
                        grid: { display: false },
                        title: {
                            display: true,
                            text: 'Nomor Absen / Urutan Siswa',
                            color: '#64748b',
                            font: { size: 10, italic: true }
                        }
                    },
                    y: { 
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Nilai Mentah', color: '#38bdf8', font: { size: 10 } },
                        beginAtZero: true, 
                        ticks: { color: '#94a3b8' }, 
                        grid: { color: 'rgba(255,255,255,0.05)' } 
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Gap (%)', color: '#feca57', font: { size: 10 } },
                        ticks: { 
                            color: '#feca57', 
                            callback: value => (value > 0 ? '+' : '') + value + '%' 
                        },
                        grid: { drawOnChartArea: false }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#cbd5e1', font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            // TOOLTIP TETAP MENAMPILKAN NAMA LENGKAP SISWA
                            title: (tooltipItems) => {
                                const idx = tooltipItems[0].dataIndex;
                                return `Absen ${idx + 1}: 👤 ${labelsNama[idx]}`;
                            },
                            label: (ctx) => {
                                const val = ctx.raw;
                                if (ctx.dataset.type === 'line' && ctx.dataset.label.includes('Gap')) {
                                    const sign = val > 0 ? '+' : '';
                                    return ` Gap Target: ${sign}${val}%`;
                                } else if (ctx.dataset.type === 'line') {
                                    return ` Benchmark: ${val}`;
                                }
                                return ` Nilai Mentah: ${val}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // =========================================================
    // DONUT CHART (SAMA SEPERTI SEBELUMNYA)
    // =========================================================
    const doughnutCanvas = document.getElementById(`chartDoughnut_${id}`);
    if (doughnutCanvas) {
        if (window.activeRiwayatCharts[`chartDoughnut_${id}`]) {
            window.activeRiwayatCharts[`chartDoughnut_${id}`].destroy();
        }

        let tuntas = 0;
        let belumTuntas = 0;

        dataSiswa.forEach((s, idx) => {
            if (dataNilai[idx] >= dataBenchmark[idx]) tuntas++;
            else belumTuntas++;
        });

        window.activeRiwayatCharts[`chartDoughnut_${id}`] = new Chart(doughnutCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Tuntas', 'Belum Tuntas'],
                datasets: [{
                    data: [tuntas, belumTuntas],
                    backgroundColor: ['#2ed573', '#ff4757'],
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 10 } } }
                }
            }
        });
    }
}

function toggleDetailSesi(id) {
    const el = document.getElementById('detail_' + id);
    if (!el) return;

    const isHidden = el.style.display === 'none' || el.style.display === '';
    el.style.display = isHidden ? 'block' : 'none';

    if (isHidden) {
        setTimeout(() => {
            renderChartsForSesi(id);
        }, 80);
    }
}
// ------------------------------------------
// TAB B: VIEW PER KELAS
// ------------------------------------------
function renderRiwayatPerKelas(container) {
    let sourceData = (typeof riwayatDB !== 'undefined' && Array.isArray(riwayatDB) && riwayatDB.length > 0) 
        ? riwayatDB 
        : JSON.parse(localStorage.getItem('riwayatDB') || '[]');

    if (!sourceData || sourceData.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Belum ada data riwayat tes.</div>`;
        return;
    }

    const listKelas = [...new Set(sourceData.map(r => r.kelas || 'Umum'))];

    let html = `
        <div style="margin-bottom: 15px; background: rgba(15, 23, 42, 0.6); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
            <label style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 5px;">Pilih Kelas:</label>
            <select id="selectFilterKelas" onchange="filterTampilanKelas(this.value)" style="width: 100%; padding: 10px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 8px;">
                <option value="">-- Pilih Kelas --</option>
                ${listKelas.map(k => `<option value="${k}">${k}</option>`).join('')}
            </select>
        </div>

        <div id="kontenRiwayatKelas">
            <p style="color: #64748b; font-size: 13px; text-align: center; padding: 20px;">Silakan pilih kelas untuk melihat rekap progres tes.</p>
        </div>
    `;

    container.innerHTML = html;
}

let currentKelasSelected = '';
let currentChartMode = 'bar';

function filterTampilanKelas(namaKelas) {
    const target = document.getElementById('kontenRiwayatKelas');
    if (!target || !namaKelas) {
        if (target) target.innerHTML = `<p style="color: #64748b; font-size: 13px; text-align: center; padding: 20px;">Silakan pilih kelas untuk melihat rekapitulasi.</p>`;
        return;
    }

    currentKelasSelected = namaKelas;

    let sourceDB = (typeof riwayatDB !== 'undefined' && Array.isArray(riwayatDB) && riwayatDB.length > 0) 
        ? riwayatDB 
        : JSON.parse(localStorage.getItem('riwayatDB') || '[]');

    let dataKelas = sourceDB.filter(s => (s.kelas || '').toLowerCase() === namaKelas.toLowerCase());

    if (dataKelas.length === 0) {
        target.innerHTML = `<p style="color: #64748b; padding:20px; text-align:center;">Belum ada riwayat tes untuk kelas <strong>${namaKelas}</strong>.</p>`;
        return;
    }

    let instrumenMap = {};
    dataKelas.forEach(sesi => {
        let namaTes = sesi.namaTes || sesi.itemTest || 'Tes Tanpa Nama';
        if (!instrumenMap[namaTes]) {
            instrumenMap[namaTes] = [];
        }
        instrumenMap[namaTes].push(sesi);
    });

    let keys = Object.keys(instrumenMap);
    let tesPertamaKey = keys[0];
    let sesiTesPertama = instrumenMap[tesPertamaKey];

    let dataSiswaTesPertama = [];
    let benchmarkTesPertama = 0;
    let unitTesPertama = '';

    sesiTesPertama.forEach(s => {
        benchmarkTesPertama = s.benchmark || benchmarkTesPertama;
        if (s.dataSiswa && Array.isArray(s.dataSiswa)) {
            s.dataSiswa.forEach(ds => {
                let res = Number(ds.result !== undefined ? ds.result : ds.nilai);
                let pct = Number(ds.percentResult !== undefined ? ds.percentResult : ds.presentase || 0);
                unitTesPertama = ds.unit || unitTesPertama;
                dataSiswaTesPertama.push({
                    nama: ds.nama || ds.siswa,
                    result: res,
                    percentResult: pct,
                    lulus: pct >= 100
                });
            });
        }
    });

    let totalSiswa = dataSiswaTesPertama.length;
    let jumlahLulus = dataSiswaTesPertama.filter(s => s.lulus).length;
    let persenKetuntasan = totalSiswa > 0 ? ((jumlahLulus / totalSiswa) * 100).toFixed(1) : 0;
    
    let scores = dataSiswaTesPertama.map(s => s.result);
    let maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    let minScore = scores.length > 0 ? Math.min(...scores) : 0;
    let avgScore = scores.length > 0 ? (scores.reduce((a,b)=>a+b, 0) / scores.length).toFixed(2) : 0;

    let daftarBulan = [...new Set(dataKelas.map(s => (s.tanggal || '').substring(0, 7)))].filter(Boolean).sort().reverse();

    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); padding: 15px; border-radius: 10px;">
                <span style="color: #94a3b8; font-size: 12px; font-weight: 600;">KETUNTASAN KELAS</span>
                <div style="font-size: 24px; font-weight: bold; color: ${persenKetuntasan >= 75 ? '#2ed573' : '#ffa502'}; margin-top: 5px;">
                    ${persenKetuntasan}% <span style="font-size: 13px; color: #94a3b8; font-weight: normal;">(${jumlahLulus}/${totalSiswa} Siswa)</span>
                </div>
            </div>
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); padding: 15px; border-radius: 10px;">
                <span style="color: #94a3b8; font-size: 12px; font-weight: 600;">RATA-RATA HARIAN</span>
                <div style="font-size: 24px; font-weight: bold; color: #38bdf8; margin-top: 5px;">
                    ${avgScore} <span style="font-size: 13px; color: #94a3b8; font-weight: normal;">${unitTesPertama}</span>
                </div>
            </div>
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); padding: 15px; border-radius: 10px;">
                <span style="color: #94a3b8; font-size: 12px; font-weight: 600;">RENTANG SKOR (MIN - MAX)</span>
                <div style="font-size: 20px; font-weight: bold; color: #fff; margin-top: 5px;">
                    ${minScore} - ${maxScore} <span style="font-size: 13px; color: #94a3b8; font-weight: normal;">${unitTesPertama}</span>
                </div>
            </div>
        </div>

        <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.08); padding: 18px; border-radius: 12px; margin-bottom: 25px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                <div style="background: #0f172a; padding: 4px; border-radius: 8px; border: 1px solid #334155; display: inline-flex;">
                    <button id="btnModeBar" type="button" onclick="setChartMode('bar')" style="padding: 6px 14px; border: none; border-radius: 6px; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                        📊 Bar Chart (Per Bulan)
                    </button>
                    <button id="btnModeLine" type="button" onclick="setChartMode('line')" style="padding: 6px 14px; border: none; border-radius: 6px; background: transparent; color: #94a3b8; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                        📈 Line Chart (Tren Semua Bulan)
                    </button>
                </div>

                <div id="wrapperFilterBulan" style="display: flex; align-items: center; gap: 8px;">
                    <select id="selectBulanTes" onchange="renderChartKelasSesuaiMode()" style="background: #1e293b; color: #fff; border: 1px solid #334155; padding: 6px 12px; border-radius: 6px; font-size: 13px;">
                        ${daftarBulan.map(b => `<option value="${b}">${b}</option>`).join('')}
                    </select>

                    <select id="selectInstrumenTes" onchange="renderChartKelasSesuaiMode()" style="background: #1e293b; color: #38bdf8; font-weight: bold; border: 1px solid #334155; padding: 6px 12px; border-radius: 6px; font-size: 13px;">
                        ${keys.map(k => `<option value="${k}">${k}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div style="height: 280px; position: relative;">
                <canvas id="chartProgresKelas"></canvas>
            </div>
        </div>

        <h4 style="color: #fff; margin-bottom: 12px;">📋 Rekap Aktivitas & Progres: ${namaKelas}</h4>
        <div style="overflow-x: auto;">
            <table class="custom-table" style="width:100%; font-size:13px; border-collapse: collapse; background: rgba(15, 23, 42, 0.6);">
                <thead>
                    <tr style="background: rgba(30, 41, 59, 0.9); color: #94a3b8; text-align: left;">
                        <th style="padding: 12px;">Instrumen Tes</th>
                        <th style="padding: 12px;">Frekuensi</th>
                        <th style="padding: 12px;">Tes Terakhir</th>
                        <th style="padding: 12px;">Rata-rata Hasil</th>
                        <th style="padding: 12px;">Benchmark</th>
                        <th style="padding: 12px;">Ketuntasan Kelas</th>
                        <th style="padding: 12px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${keys.map(k => {
                        let listSesi = instrumenMap[k];
                        let lastSesi = listSesi[listSesi.length - 1];

                        let totalRataSesi = listSesi.map(s => {
                            if (s.rataRataHasil !== undefined && Number(s.rataRataHasil) > 0) {
                                return Number(s.rataRataHasil);
                            }
                            if (s.dataSiswa && Array.isArray(s.dataSiswa) && s.dataSiswa.length > 0) {
                                let totalSiswa = s.dataSiswa.reduce((sum, ds) => sum + Number(ds.result !== undefined ? ds.result : ds.nilai || 0), 0);
                                return totalSiswa / s.dataSiswa.length;
                            }
                            return 0;
                        });

                        let totalAvg = (totalRataSesi.reduce((a, b) => a + b, 0) / listSesi.length).toFixed(2);
                        let bmark = lastSesi.benchmark || 0;
                        let isPass = Number(totalAvg) >= Number(bmark);

                        return `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 10px; font-weight:bold; color:#fff;">${k}</td>
                            <td style="padding: 10px; color:#94a3b8;">${listSesi.length}x Tes</td>
                            <td style="padding: 10px; color:#cbd5e1;">${lastSesi.tanggal || '-'}</td>
                            <td style="padding: 10px; font-weight:bold; color:#38bdf8;">${totalAvg} ${unitTesPertama}</td>
                            <td style="padding: 10px; color:#94a3b8;">${bmark}</td>
                            <td style="padding: 10px; color:#ffa502; font-weight:bold;">${persenKetuntasan}% Target</td>
                            <td style="padding: 10px; font-weight:bold; color:${isPass ? '#2ed573' : '#ff4757'};">
                                ${isPass ? '✓ Tercapai' : '⚠️ Perlu Evaluasi'}
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    target.innerHTML = html;

    setTimeout(() => {
        renderChartKelasSesuaiMode();
    }, 50);
}

function setChartMode(mode) {
    currentChartMode = mode;
    const btnBar = document.getElementById('btnModeBar');
    const btnLine = document.getElementById('btnModeLine');
    const wrapperBulan = document.getElementById('wrapperFilterBulan');

    if (mode === 'bar') {
        if(btnBar) { btnBar.style.background = '#38bdf8'; btnBar.style.color = '#0f172a'; }
        if(btnLine) { btnLine.style.background = 'transparent'; btnLine.style.color = '#94a3b8'; }
        if(wrapperBulan) wrapperBulan.style.display = 'flex';
    } else {
        if(btnLine) { btnLine.style.background = '#38bdf8'; btnLine.style.color = '#0f172a'; }
        if(btnBar) { btnBar.style.background = 'transparent'; btnBar.style.color = '#94a3b8'; }
        if(wrapperBulan) wrapperBulan.style.display = 'none';
    }

    renderChartKelasSesuaiMode();
}

function toggleDetailSub(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'table-row' : 'none';
    }
}

function renderChartKelasSesuaiMode() {
    const ctx = document.getElementById('chartProgresKelas');
    if (!ctx) return;

    if (window.kelasChartInstance) {
        window.kelasChartInstance.destroy();
    }

    let sourceDB = (typeof riwayatDB !== 'undefined' && Array.isArray(riwayatDB) && riwayatDB.length > 0) 
        ? riwayatDB 
        : JSON.parse(localStorage.getItem('riwayatDB') || '[]');

    let dataKelas = sourceDB.filter(s => (s.kelas || '').toLowerCase() === currentKelasSelected.toLowerCase());

    if (currentChartMode === 'bar') {
        const bulanSelected = document.getElementById('selectBulanTes')?.value;
        const instrumenSelected = document.getElementById('selectInstrumenTes')?.value;

        let sesiBulan = dataKelas.find(s => {
            let tglMatch = (s.tanggal || '').startsWith(bulanSelected);
            let namaTes = s.namaTes || s.itemTest || 'Tes Tanpa Nama';
            let tesMatch = instrumenSelected ? namaTes.toLowerCase() === instrumenSelected.toLowerCase() : true;
            return tglMatch && tesMatch;
        }) || dataKelas[0];

        if (!sesiBulan || !sesiBulan.dataSiswa) return;

        let labels = sesiBulan.dataSiswa.map(s => s.nama || s.siswa);
        let values = sesiBulan.dataSiswa.map(s => Number(s.result !== undefined ? s.result : s.nilai || 0));
        let bgColors = sesiBulan.dataSiswa.map(s => {
            let pct = Number(s.percentResult !== undefined ? s.percentResult : s.presentase || 0);
            return pct >= 100 ? 'rgba(46, 213, 115, 0.85)' : 'rgba(255, 71, 87, 0.85)';
        });

        window.kelasChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Hasil Siswa',
                    data: values,
                    backgroundColor: bgColors,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: '#fff' } }
                }
            }
        });

    } else {
        let instrumenMap = {};
        dataKelas.forEach(s => {
            let namaTes = s.namaTes || s.itemTest || 'Tes Tanpa Nama';
            if (!instrumenMap[namaTes]) instrumenMap[namaTes] = [];
            instrumenMap[namaTes].push(s);
        });

        let maxSesiCount = 0;
        Object.values(instrumenMap).forEach(arr => {
            if (arr.length > maxSesiCount) maxSesiCount = arr.length;
        });

        let labelsSesi = [];
        for (let i = 1; i <= maxSesiCount; i++) {
            labelsSesi.push(`Tes ke-${i}`);
        }

        const colors = [
            { border: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
            { border: '#2ed573', bg: 'rgba(46, 213, 115, 0.15)' },
            { border: '#ffa502', bg: 'rgba(255, 165, 2, 0.15)' }
        ];

        let datasets = Object.keys(instrumenMap).map((namaTes, index) => {
            let listSesi = instrumenMap[namaTes];
            let colorScheme = colors[index % colors.length];

            listSesi.sort((a, b) => new Date(a.tanggal || 0) - new Date(b.tanggal || 0));

            let dataRataRataPerSesi = listSesi.map(sesi => {
                if (sesi.dataSiswa && Array.isArray(sesi.dataSiswa) && sesi.dataSiswa.length > 0) {
                    let total = sesi.dataSiswa.reduce((sum, ds) => sum + Number(ds.result !== undefined ? ds.result : ds.nilai || 0), 0);
                    return Number((total / sesi.dataSiswa.length).toFixed(2));
                }
                return Number(sesi.rataRataHasil || 0);
            });

            return {
                label: `Rata-rata ${namaTes}`,
                data: dataRataRataPerSesi,
                borderColor: colorScheme.border,
                backgroundColor: colorScheme.bg,
                fill: false,
                tension: 0.2,
                pointRadius: 6,
                pointHoverRadius: 9,
                pointBackgroundColor: colorScheme.border
            };
        });

        window.kelasChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labelsSesi,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#fff', font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems) => {
                                let item = tooltipItems[0];
                                let datasetIndex = item.datasetIndex;
                                let dataIndex = item.dataIndex;
                                let namaTesKey = Object.keys(instrumenMap)[datasetIndex];
                                let sesiTarget = instrumenMap[namaTesKey]?.[dataIndex];
                                
                                return `${item.label} (${sesiTarget?.tanggal || 'Tanpa Tanggal'})`;
                            },
                            label: (ctx) => ` Rata-rata Skor: ${ctx.raw}`
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { color: '#94a3b8' }, 
                        grid: { color: 'rgba(255,255,255,0.05)' } 
                    },
                    x: { 
                        ticks: { color: '#fff', font: { weight: 'bold' } },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }
}

// ------------------------------------------
// TAB C: VIEW PER NAMA SISWA
// ------------------------------------------
function renderRiwayatPerSiswa(container) {
    let sourceDB = (typeof riwayatDB !== 'undefined' && riwayatDB.length > 0) 
        ? riwayatDB 
        : JSON.parse(localStorage.getItem('riwayatDB') || '[]');

    let daftarSiswa = [];
    sourceDB.forEach(r => {
        if (r.dataSiswa && Array.isArray(r.dataSiswa)) {
            r.dataSiswa.forEach(s => {
                if (s.nama && !daftarSiswa.includes(s.nama)) {
                    daftarSiswa.push(s.nama);
                }
            });
        }
    });

    daftarSiswa.sort();

    let html = `
        <div style="margin-bottom: 15px;">
            <label style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 5px;">Cari / Pilih Nama Siswa:</label>
            <select id="selectFilterSiswa" onchange="filterTampilanSiswa(this.value)" style="width: 100%; padding: 10px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 8px;">
                <option value="">-- Pilih Nama Siswa --</option>
                ${daftarSiswa.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
        </div>
        <div id="kontenRiwayatSiswa">
            <p style="color: #64748b; font-size: 13px;">Pilih nama siswa untuk melihat portofolio hasil tes fisiknya.</p>
        </div>
    `;

    container.innerHTML = html;
}

window.siswaChartInstances = window.siswaChartInstances || {};

function filterTampilanSiswa(namaSiswa) {
    const target = document.getElementById('kontenRiwayatSiswa');
    if (!target || !namaSiswa) {
        if(target) target.innerHTML = `<p style="color: #64748b; font-size: 13px;">Pilih nama siswa untuk melihat portofolio hasil tes fisiknya.</p>`;
        return;
    }

    let sourceDB = (typeof riwayatDB !== 'undefined' && riwayatDB.length > 0) 
        ? riwayatDB 
        : JSON.parse(localStorage.getItem('riwayatDB') || '[]');

    let rekapSiswa = [];
    sourceDB.forEach(sesi => {
        let match = (sesi.dataSiswa || []).find(s => (s.nama || '').toLowerCase() === namaSiswa.toLowerCase());
        if (match) {
            rekapSiswa.push({
                tanggal: sesi.tanggal,
                component: match.component || 'Physical',
                itemTest: match.itemTest || match.rumus || sesi.namaTes,
                unit: match.unit || '',
                benchmark: match.benchmark,
                result: match.result || match.nilai,
                kategori: match.kategori || '-',
                presentase: match.presentase || 0,
                gap: match.gap || 0,
                percentResult: match.percentResult || 0
            });
        }
    });

    if (rekapSiswa.length === 0) {
        target.innerHTML = `<p style="color: #64748b;">Data untuk ${namaSiswa} tidak ditemukan.</p>`;
        return;
    }

    const totalResult = rekapSiswa.reduce((acc, curr) => acc + (curr.percentResult || 0), 0);
    const overallReadiness = Number((totalResult / rekapSiswa.length).toFixed(2));
    const overallGap = Number((100 - overallReadiness).toFixed(2));

    let html = `
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="color: #fff; margin: 0;">👤 ${namaSiswa}</h3>
                <span style="background:#38bdf8; color:#0f172a; padding:4px 12px; border-radius:20px; font-weight:bold; font-size:14px;">
                    Readiness: ${overallReadiness}%
                </span>
            </div>
        </div>

        <div style="overflow-x: auto; margin-bottom: 25px;">
            <table class="custom-table" style="width:100%; font-size:12px; border-collapse: collapse; background: rgba(15, 23, 42, 0.6);">
                <thead>
                    <tr style="background: rgba(30, 41, 59, 0.9); color: #94a3b8; text-align: left;">
                        <th style="padding: 10px;">Tanggal</th>
                        <th style="padding: 10px;">Item Test</th>
                        <th style="padding: 10px;">Result</th>
                        <th style="padding: 10px; text-align: center;">Kategori / Skala</th>
                        <th style="padding: 10px;">Benchmark</th>
                        <th style="padding: 10px;">Presentase</th>
                        <th style="padding: 10px;">Gap</th>
                        <th style="padding: 10px;">% Result</th>
                    </tr>
                </thead>
                <tbody>
                    ${rekapSiswa.map(item => {
                        const isLulus = item.percentResult >= 100;
                        const statusColor = isLulus ? '#2ed573' : '#ff4757';
                        return `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 8px; color:#cbd5e1;">${item.tanggal || '-'}</td>
                            <td style="padding: 8px; font-weight:bold; color:#fff;">${item.itemTest}</td>
                            <td style="padding: 8px; font-weight:bold; color:#38bdf8;">${item.result} ${item.unit}</td>
                            <td style="padding: 8px; text-align: center;">${getKategoriBadgeHtml(item.kategori)}</td>
                            <td style="padding: 8px; color:#94a3b8;">${item.benchmark || '-'}</td>
                            <td style="padding: 8px;">${item.presentase}%</td>
                            <td style="padding: 8px; color:#ffa502;">${item.gap}%</td>
                            <td style="padding: 8px; font-weight:bold; color:${statusColor};">
                                ${item.percentResult}% ${isLulus ? '✓' : '⚠️'}
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; background: rgba(30, 41, 59, 0.4); padding: 20px; border-radius: 12px;">
            <div style="text-align: center; background: rgba(15, 23, 42, 0.5); padding: 15px; border-radius: 10px;">
                <h5 style="color: #94a3b8; margin-bottom: 15px;">Physical Condition (Overall Readiness)</h5>
                <div style="max-width: 200px; margin: 0 auto; position: relative;">
                    <canvas id="chartSiswaDoughnut"></canvas>
                </div>
                <div style="margin-top: 15px; font-size: 13px; color: #fff;">
                    <span style="color: #2ed573; margin-right: 15px;">■ Readiness: <b>${overallReadiness}%</b></span>
                    <span style="color: #ff4757;">■ Gap: <b>${overallGap}%</b></span>
                </div>
            </div>

            <div style="background: rgba(15, 23, 42, 0.5); padding: 15px; border-radius: 10px;">
                <h5 style="color: #94a3b8; margin-bottom: 10px;">Detail Capaian Item Tes (Kelemahan Teratas)</h5>
                <div style="height: 280px; position: relative;">
                    <canvas id="chartSiswaHorizontalBar"></canvas>
                </div>
            </div>
        </div>
    `;

    target.innerHTML = html;

    setTimeout(() => {
        const ctxDoughnut = document.getElementById('chartSiswaDoughnut');
        if (ctxDoughnut) {
            if (window.siswaChartInstances['doughnut']) window.siswaChartInstances['doughnut'].destroy();
            window.siswaChartInstances['doughnut'] = new Chart(ctxDoughnut, {
                type: 'doughnut',
                data: {
                    labels: ['Readiness', 'Gap'],
                    datasets: [{
                        data: [overallReadiness, overallGap],
                        backgroundColor: ['#2ed573', '#ff4757'],
                        borderWidth: 0
                    }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    cutout: '70%'
                }
            });
        }

        const ctxBar = document.getElementById('chartSiswaHorizontalBar');
        if (ctxBar) {
            if (window.siswaChartInstances['bar']) window.siswaChartInstances['bar'].destroy();

            const sortedItems = [...rekapSiswa].sort((a, b) => a.presentase - b.presentase);

            window.siswaChartInstances['bar'] = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: sortedItems.map(i => i.itemTest),
                    datasets: [{
                        label: '% Presentase Capaian',
                        data: sortedItems.map(i => i.presentase),
                        backgroundColor: sortedItems.map(i => i.presentase >= 100 ? '#2ed573' : '#ff4757'),
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { 
                            beginAtZero: true, 
                            max: 120,
                            ticks: { color: '#94a3b8', callback: v => v + '%' }, 
                            grid: { color: 'rgba(255,255,255,0.05)' } 
                        },
                        y: { 
                            ticks: { color: '#fff', font: { size: 11 } }, 
                            grid: { display: false } 
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` Capaian: ${ctx.raw}%`
                            }
                        }
                    }
                }
            });
        }
    }, 100);
}

function hapusSesiRiwayat(idSesi) {
    if (typeof riwayatDB === 'undefined') return;
    const idx = riwayatDB.findIndex(r => r.id === idSesi);
    if (idx === -1) return;

    if (confirm(`Hapus sesi tes "${riwayatDB[idx].namaTes}" (${riwayatDB[idx].tanggal})?`)) {
        riwayatDB.splice(idx, 1);
        localStorage.setItem('riwayatDB', JSON.stringify(riwayatDB));
        tampilRiwayat();
        if (typeof updateBerandaStats === 'function') updateBerandaStats();
        if (typeof renderPerformanceChart === 'function') renderPerformanceChart();
    }
}

function hapusSemuaRiwayat() {
    if (confirm('⚠️ APAKAH ANDA YAKIN?\nSeluruh riwayat tes fisik akan dihapus permanen!')) {
        if (typeof riwayatDB !== 'undefined') window.riwayatDB = [];
        localStorage.removeItem('riwayatDB');
        tampilRiwayat();
        if (typeof updateBerandaStats === 'function') updateBerandaStats();
        if (typeof renderPerformanceChart === 'function') renderPerformanceChart();
    }
}

// ==========================================
// FUNGSI EDIT DATA SISWA DALAM RIWAYAT
// ==========================================

let activeEditSesiId = null;
let activeEditSiswaIndex = null;

function editSiswaRiwayat(sesiId, indexSiswa) {
    let sourceDB = (typeof riwayatDB !== 'undefined' && riwayatDB.length > 0) 
        ? riwayatDB 
        : JSON.parse(localStorage.getItem('riwayatDB') || '[]');

    const sesi = sourceDB.find(s => String(s.id) === String(sesiId));
    if (!sesi || !sesi.dataSiswa || !sesi.dataSiswa[indexSiswa]) {
        alert('Data siswa tidak ditemukan!');
        return;
    }

    const siswa = sesi.dataSiswa[indexSiswa];
    activeEditSesiId = sesiId;
    activeEditSiswaIndex = indexSiswa;

    document.getElementById('editNamaSiswa').value = siswa.nama || siswa.siswa || '';
    document.getElementById('editNilaiSiswa').value = siswa.nilai !== undefined ? siswa.nilai : (siswa.result || 0);
    document.getElementById('editBenchmarkSiswa').value = siswa.benchmark !== undefined ? siswa.benchmark : (sesi.benchmark || 0);

    const modal = document.getElementById('modalEditSiswa');
    if (modal) modal.style.display = 'flex';
}

function tutupModalEditSiswa() {
    const modal = document.getElementById('modalEditSiswa');
    if (modal) modal.style.display = 'none';
    activeEditSesiId = null;
    activeEditSiswaIndex = null;
}

function simpanPerubahanSiswa() {
    if (!activeEditSesiId || activeEditSiswaIndex === null) return;

    let sourceDB = (typeof riwayatDB !== 'undefined' && riwayatDB.length > 0) 
        ? riwayatDB 
        : JSON.parse(localStorage.getItem('riwayatDB') || '[]');

    const sesiIndex = sourceDB.findIndex(s => String(s.id) === String(activeEditSesiId));
    if (sesiIndex === -1) return;

    const sesi = sourceDB[sesiIndex];
    const siswa = sesi.dataSiswa[activeEditSiswaIndex];

    const namaBaru = document.getElementById('editNamaSiswa').value.trim();
    const nilaiBaru = Number(document.getElementById('editNilaiSiswa').value);
    const benchmarkBaru = Number(document.getElementById('editBenchmarkSiswa').value);

    if (!namaBaru) {
        alert('Nama siswa tidak boleh kosong!');
        return;
    }

    siswa.nama = namaBaru;
    siswa.siswa = namaBaru;
    siswa.nilai = nilaiBaru;
    siswa.result = nilaiBaru;
    siswa.benchmark = benchmarkBaru;

    const isLowerBetter = siswa.isLowerBetter !== undefined ? siswa.isLowerBetter : false;
    let presentase = 0;

    if (benchmarkBaru > 0) {
        if (isLowerBetter) {
            presentase = (2 - (nilaiBaru / benchmarkBaru)) * 100;
            if (presentase < 0) presentase = 0;
        } else {
            presentase = (nilaiBaru / benchmarkBaru) * 100;
        }
    }

    const percentResult = presentase > 100 ? 100 : presentase;
    const gap = (100 - presentase) < 0 ? 0 : (100 - presentase);

    siswa.presentase = Number(presentase.toFixed(2));
    siswa.gap = Number(gap.toFixed(2));
    siswa.percentResult = Number(percentResult.toFixed(2));

    if (sesi.rubrikLimits) {
        const r = sesi.rubrikLimits;
        if (isLowerBetter) {
            if (r.sb !== null && nilaiBaru <= r.sb) siswa.kategori = 'Sangat Baik';
            else if (r.b !== null && nilaiBaru <= r.b) siswa.kategori = 'Baik';
            else if (r.c !== null && nilaiBaru <= r.c) siswa.kategori = 'Cukup';
            else siswa.kategori = 'Kurang';
        } else {
            if (r.sb !== null && nilaiBaru >= r.sb) siswa.kategori = 'Sangat Baik';
            else if (r.b !== null && nilaiBaru >= r.b) siswa.kategori = 'Baik';
            else if (r.c !== null && nilaiBaru >= r.c) siswa.kategori = 'Cukup';
            else siswa.kategori = 'Kurang';
        }
    }

    let totalPercent = sesi.dataSiswa.reduce((sum, s) => sum + (s.percentResult || 0), 0);
    sesi.overallReadiness = Number((totalPercent / (sesi.dataSiswa.length || 1)).toFixed(2));

    if (typeof riwayatDB !== 'undefined') window.riwayatDB = sourceDB;
    localStorage.setItem('riwayatDB', JSON.stringify(sourceDB));

    tutupModalEditSiswa();
    tampilRiwayat();
    
    if (typeof updateBerandaStats === 'function') updateBerandaStats();
    if (typeof renderPerformanceChart === 'function') renderPerformanceChart();

    alert('✅ Data siswa berhasil diperbarui!');
}

function updateBerandaStats() {
    const elRumus = document.getElementById('statTotalRumus');
    const elRiwayat = document.getElementById('statTotalRiwayat');
    const elSiswa = document.getElementById('statTotalSiswa');

    if (elRumus) elRumus.textContent = typeof daftarRumus !== 'undefined' ? daftarRumus.length : 0;
    if (elRiwayat) elRiwayat.textContent = Array.isArray(riwayatDB) ? riwayatDB.length : 0;

    if (elSiswa) {
        let setSiswaUnik = new Set();
        if (Array.isArray(riwayatDB)) {
            riwayatDB.forEach(r => {
                const listSiswa = r.data || r.dataSiswa || [];
                if (Array.isArray(listSiswa)) {
                    listSiswa.forEach(s => {
                        if (s.nama && s.nama.trim() !== '') {
                            setSiswaUnik.add(s.nama.trim().toLowerCase());
                        }
                    });
                }
            });
        }
        elSiswa.textContent = setSiswaUnik.size;
    }
}

// ==========================================
// FUNGSI EDIT PARAMETER SESI & RE-KALKULASI
// ==========================================

let activeEditSesiParamId = null;

// 1. Buka Modal Edit Sesi & Auto-Fill Form
function editSesiRiwayat(sesiId) {
    let sourceDB = (typeof riwayatDB !== 'undefined' && riwayatDB.length > 0) 
        ? riwayatDB 
        : JSON.parse(localStorage.getItem('riwayatDB') || '[]');

    const sesi = sourceDB.find(s => String(s.id) === String(sesiId));
    if (!sesi) {
        alert('Sesi tes tidak ditemukan!');
        return;
    }

    activeEditSesiParamId = sesiId;

    // Isi Form Nama & Kelas
    document.getElementById('editSesiNamaTes').value = sesi.namaTes || '';
    document.getElementById('editSesiKelas').value = sesi.kelas || 'Umum';
    document.getElementById('editSesiBenchmark').value = sesi.benchmark || 0;

    // Cek Orientasi Tes (lower / higher) dari siswa pertama
    const isLower = sesi.dataSiswa && sesi.dataSiswa.length > 0 ? sesi.dataSiswa[0].isLowerBetter : false;
    const radioOrientasi = document.querySelector(`input[name="editOrientasiTes"][value="${isLower ? 'lower' : 'higher'}"]`);
    if (radioOrientasi) radioOrientasi.checked = true;

    // Isi Rubrik Limits jika ada
    const r = sesi.rubrikLimits || {};
    document.getElementById('editRubrikSB').value = r.sb !== null && r.sb !== undefined ? r.sb : '';
    document.getElementById('editRubrikB').value  = r.b  !== null && r.b  !== undefined ? r.b  : '';
    document.getElementById('editRubrikC').value  = r.c  !== null && r.c  !== undefined ? r.c  : '';

    // Tampilkan Modal
    const modal = document.getElementById('modalEditSesi');
    if (modal) modal.style.display = 'flex';
}

// 2. Tutup Modal
function tutupModalEditSesi() {
    const modal = document.getElementById('modalEditSesi');
    if (modal) modal.style.display = 'none';
    activeEditSesiParamId = null;
}

// 3. Simpan Perubahan & Kalkulasi Ulang Seluruh Siswa di Sesi Tersebut
function simpanPerubahanSesi() {
    if (!activeEditSesiParamId) return;

    let sourceDB = (typeof riwayatDB !== 'undefined' && riwayatDB.length > 0) 
        ? riwayatDB 
        : JSON.parse(localStorage.getItem('riwayatDB') || '[]');

    const sesiIndex = sourceDB.findIndex(s => String(s.id) === String(activeEditSesiParamId));
    if (sesiIndex === -1) return;

    const sesi = sourceDB[sesiIndex];

    // Ambil Data Input Baru
    const newNamaTes = document.getElementById('editSesiNamaTes').value.trim() || sesi.namaTes;
    const newKelas = document.getElementById('editSesiKelas').value.trim() || sesi.kelas;
    const newBenchmark = Number(document.getElementById('editSesiBenchmark').value) || 0;
    
    const orientasiVal = document.querySelector('input[name="editOrientasiTes"]:checked')?.value;
    const isLowerBetter = (orientasiVal === 'lower');

    const valSB = document.getElementById('editRubrikSB').value;
    const valB  = document.getElementById('editRubrikB').value;
    const valC  = document.getElementById('editRubrikC').value;

    const newRubrikLimits = {
        sb: valSB !== "" && valSB !== null && !isNaN(valSB) ? Number(valSB) : null,
        b:  valB  !== "" && valB  !== null && !isNaN(valB)  ? Number(valB)  : null,
        c:  valC  !== "" && valC  !== null && !isNaN(valC)  ? Number(valC)  : null
    };

    // Update Header Sesi
    sesi.namaTes = newNamaTes;
    sesi.kelas = newKelas;
    sesi.benchmark = newBenchmark;
    sesi.rubrikLimits = newRubrikLimits;

    let totalPercentResult = 0;

    // RE-KALKULASI SEMUA SISWA DI SESI INI
    if (sesi.dataSiswa && Array.isArray(sesi.dataSiswa)) {
        sesi.dataSiswa = sesi.dataSiswa.map(s => {
            const result = Number(s.nilai !== undefined ? s.nilai : (s.result || 0));
            let presentase = 0;

            if (newBenchmark > 0) {
                if (isLowerBetter) {
                    // Lower is Better: (2 - (Result / Benchmark)) * 100
                    presentase = (2 - (result / newBenchmark)) * 100;
                    if (presentase < 0) presentase = 0;
                } else {
                    // Higher is Better: (Result / Benchmark) * 100
                    presentase = (result / newBenchmark) * 100;
                }
            }

            const percentResult = presentase > 100 ? 100 : presentase;
            const gap = (100 - presentase) < 0 ? 0 : (100 - presentase);
            totalPercentResult += percentResult;

            // Hitung Ulang Kategori Skala
            let kategoriFix = '-';
            if (newRubrikLimits.sb !== null || newRubrikLimits.b !== null || newRubrikLimits.c !== null) {
                if (isLowerBetter) {
                    if (newRubrikLimits.sb !== null && result <= newRubrikLimits.sb) kategoriFix = 'Sangat Baik';
                    else if (newRubrikLimits.b !== null && result <= newRubrikLimits.b) kategoriFix = 'Baik';
                    else if (newRubrikLimits.c !== null && result <= newRubrikLimits.c) kategoriFix = 'Cukup';
                    else kategoriFix = 'Kurang';
                } else {
                    if (newRubrikLimits.sb !== null && result >= newRubrikLimits.sb) kategoriFix = 'Sangat Baik';
                    else if (newRubrikLimits.b !== null && result >= newRubrikLimits.b) kategoriFix = 'Baik';
                    else if (newRubrikLimits.c !== null && result >= newRubrikLimits.c) kategoriFix = 'Cukup';
                    else kategoriFix = 'Kurang';
                }
            }

            return {
                ...s,
                itemTest: newNamaTes,
                benchmark: newBenchmark,
                isLowerBetter: isLowerBetter,
                kategori: kategoriFix,
                presentase: Number(presentase.toFixed(2)),
                gap: Number(gap.toFixed(2)),
                percentResult: Number(percentResult.toFixed(2))
            };
        });
    }

    // Update Readiness Sesi
    sesi.overallReadiness = Number((totalPercentResult / (sesi.dataSiswa.length || 1)).toFixed(2));

    // Simpan Ke LocalStorage
    if (typeof riwayatDB !== 'undefined') window.riwayatDB = sourceDB;
    localStorage.setItem('riwayatDB', JSON.stringify(sourceDB));

    tutupModalEditSesi();
    tampilRiwayat();

    // Refresh statistik & grafik
    if (typeof updateBerandaStats === 'function') updateBerandaStats();
    if (typeof renderPerformanceChart === 'function') renderPerformanceChart();

    alert(`✅ Sesi "${newNamaTes}" berhasil dikalkulasi ulang dan diperbarui!`);
}

// ==========================================
// 6. AGENDA, CATATAN & EXPORT EXCEL
// ==========================================

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

    if (!Array.isArray(agendaDB)) agendaDB = [];

    agendaDB.push({ nama, kelas, tanggal, jumlah });
    localStorage.setItem('agendaDB', JSON.stringify(agendaDB));

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
    tampilAgendaList();
}

function simpanCatatan() {
    const el = document.getElementById('coachNotes');
    if (el) {
        localStorage.setItem('coachNotes', el.value);
        alert('✅ Catatan berhasil disimpan!');
    }
}

function loadCatatan() {
    const el = document.getElementById('coachNotes');
    if (el) el.value = localStorage.getItem('coachNotes') || '';
}

// Buka Modal Export Excel
function bukaModalExportExcel() {
    const container = document.getElementById('daftarSesiExport');
    if (!container) return;
    container.innerHTML = '';

    const rawData = localStorage.getItem('riwayatDB') || 
                    localStorage.getItem('riwayat_wiraga') || 
                    localStorage.getItem('dataRiwayat');

    const dataRiwayat = rawData ? JSON.parse(rawData) : (window.riwayatDB || []);

    if (dataRiwayat.length === 0) {
        alert("Belum ada data riwayat tes yang tersimpan!");
        return;
    }

    dataRiwayat.forEach((item, index) => {
        const itemHtml = `
            <label class="sesi-item" style="display: flex; gap: 8px; margin-bottom: 6px; align-items: center;">
                <input type="checkbox" value="${item.id || index}" class="cb-sesi-export" checked>
                <span>
                    <strong>${item.kelas || item.namaKelas || 'Kelas'}</strong> - 
                    ${item.namaTes || item.namaRumus || 'Tes'} 
                    (${item.tanggal || 'N/A'})
                </span>
            </label>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
    });

    const modal = document.getElementById('modalExportExcel');
    if (modal) modal.style.display = 'flex';
}

function tutupModalExport() {
    const modal = document.getElementById('modalExportExcel');
    if (modal) modal.style.display = 'none';
}

function togglePilihSemuaSesi(masterCb) {
    const checkboxes = document.querySelectorAll('.cb-sesi-export');
    checkboxes.forEach(cb => cb.checked = masterCb.checked);
}

async function prosesDownloadExcel() {
    if (typeof ExcelJS === 'undefined') {
        alert("Library ExcelJS belum dimuat. Pastikan CDN ExcelJS telah terpasang di file HTML!");
        return;
    }

    const checkedBoxes = document.querySelectorAll('.cb-sesi-export:checked');
    if (checkedBoxes.length === 0) {
        alert("Silakan pilih minimal satu sesi untuk diekspor!");
        return;
    }

    const includeChartEl = document.getElementById('cbIncludeChart');
    const includeChart = includeChartEl ? includeChartEl.checked : false;

    const rawData = localStorage.getItem('riwayatDB') || localStorage.getItem('riwayat_wiraga') || localStorage.getItem('dataRiwayat');
    const dataRiwayat = rawData ? JSON.parse(rawData) : (window.riwayatDB || []);
    
    const workbook = new ExcelJS.Workbook();
    
    // Penampung informasi untuk penamaan file otomatis
    let firstKelas = '';
    let firstTes = '';
    let firstTanggal = '';

    let sheetCounter = 1; // Untuk penamaan Sheet 1, Sheet 2, dst.

    for (const cb of checkedBoxes) {
        const idSesi = cb.value;
        const sesiData = dataRiwayat.find((r, idx) => (r.id == idSesi || idx == idSesi));

        if (!sesiData) continue;

        // Ambil data dari sesi pertama untuk penamaan File
        if (!firstKelas) {
            firstKelas = sesiData.kelas || sesiData.namaKelas || 'Kelas';
            firstTes = sesiData.namaTes || sesiData.namaRumus || 'Tes';
            firstTanggal = sesiData.tanggal || 'Tanggal';
        }

        // 1. PENAMAAN SHEET MENGGUNAKAN "Sheet 1", "Sheet 2", DOKUMEN BEBAS CRASH
        const sheetName = `Sheet ${sheetCounter++}`;
        const sheet = workbook.addWorksheet(sheetName);

        const listSiswa = sesiData.dataSiswa || sesiData.data || [];
        const totalSiswaStat = listSiswa.length;

        // ==========================================
        // 2. KALKULASI RINGKASAN STATISTIK
        // ==========================================
        let avgNilai = 0, minNilai = 0, maxNilai = 0, persenTuntas = 0, siswaTuntas = 0;

        if (totalSiswaStat > 0) {
            const arrNilai = listSiswa.map(s => Number(s.nilai !== undefined ? s.nilai : (s.result || 0)));
            const totalNilai = arrNilai.reduce((acc, curr) => acc + curr, 0);

            avgNilai = (totalNilai / totalSiswaStat).toFixed(1);
            minNilai = Math.min(...arrNilai);
            maxNilai = Math.max(...arrNilai);

            siswaTuntas = listSiswa.filter(s => {
                const rawPres = s.presentase !== undefined ? s.presentase : (s.percentResult !== undefined ? s.percentResult : 0);
                const bench = Number(s.benchmark !== undefined ? s.benchmark : (sesiData.benchmark || 0));
                const val = Number(s.nilai !== undefined ? s.nilai : (s.result || 0));
                
                return Number(rawPres) >= 100 || (bench > 0 && val >= bench);
            }).length;

            persenTuntas = ((siswaTuntas / totalSiswaStat) * 100).toFixed(1);
        }

        // ==========================================
        // 3. ATUR LEBAR KOLOM
        // ==========================================
        sheet.getColumn(1).width = 6;  // Kolom A: No / Absen
        sheet.getColumn(2).width = 28; // Kolom B: Nama Atlet / Siswa
        sheet.getColumn(3).width = 18; // Kolom C: Hasil (Result)
        sheet.getColumn(4).width = 20; // Kolom D: Kategori / Skala
        sheet.getColumn(5).width = 16; // Kolom E: Benchmark
        sheet.getColumn(6).width = 18; // Kolom F: Capaian (%)

        // ==========================================
        // 4. HEADER KOP SESI (B2 - B4)
        // ==========================================
        sheet.getCell('A1').value = 'LAPORAN HASIL ASESMEN KEBUGARAN';
        sheet.getCell('A1').font = { bold: true, size: 14 };

        sheet.getCell('B2').value = 'Sesi / Kelas';
        sheet.getCell('C2').value = `: ${sesiData.kelas || sesiData.namaKelas || '-'}`;
        sheet.getCell('B3').value = 'Jenis Tes';
        sheet.getCell('C3').value = `: ${sesiData.namaTes || sesiData.namaRumus || '-'}`;
        sheet.getCell('B4').value = 'Tanggal';
        sheet.getCell('C4').value = `: ${sesiData.tanggal || '-'}`;

        ['B2', 'B3', 'B4'].forEach(cell => {
            sheet.getCell(cell).font = { bold: true, color: { argb: '475569' } };
        });

        // ==========================================
        // 5. STATISTIK CARDS
        // ==========================================
        sheet.getCell('A6').value = 'RINGKASAN STATISTIK SESI';
        sheet.getCell('A6').font = { bold: true, color: { argb: '1E1B4B' } };

        const statHeaderRow = sheet.getRow(7);
        statHeaderRow.getCell(1).value = 'Rata-Rata';
        statHeaderRow.getCell(2).value = 'Skor Max';
        statHeaderRow.getCell(3).value = 'Skor Min';
        statHeaderRow.getCell(4).value = 'Siswa Tuntas';
        statHeaderRow.getCell(5).value = 'Persentase Ketuntasan';

        for (let c = 1; c <= 5; c++) {
            const cell = statHeaderRow.getCell(c);
            cell.font = { bold: true, size: 9, color: { argb: 'FFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E1B4B' } };
        }

        const statValueRow = sheet.getRow(8);
        statValueRow.getCell(1).value = Number(avgNilai);
        statValueRow.getCell(2).value = Number(maxNilai);
        statValueRow.getCell(3).value = Number(minNilai);
        statValueRow.getCell(4).value = `${siswaTuntas} / ${totalSiswaStat}`;
        statValueRow.getCell(5).value = `${persenTuntas}%`;

        for (let c = 1; c <= 5; c++) {
            const cell = statValueRow.getCell(c);
            cell.font = { bold: true, size: 11, color: { argb: '1E293B' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'CBD5E1' } },
                left: { style: 'thin', color: { argb: 'CBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
                right: { style: 'thin', color: { argb: 'CBD5E1' } }
            };
        }

        // ==========================================
        // 6. TABEL DETAIL DATA SISWA
        // ==========================================
        const tableStartRow = 10;
        const headerRow = sheet.getRow(tableStartRow);
        
        const headers = ['No', 'Nama Atlet / Siswa', 'Hasil (Result)', 'Kategori / Skala', 'Benchmark', 'Capaian (%)'];
        headers.forEach((text, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = text;
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E1B4B' } };
        });

        let currentRow = tableStartRow + 1;

        if (totalSiswaStat > 0) {
            listSiswa.forEach((s, idx) => {
                const resVal = s.result !== undefined ? s.result : (s.nilai !== undefined ? s.nilai : 0);
                const row = sheet.getRow(currentRow);

                row.getCell(1).value = idx + 1;                                      // No (A) - Sesuai Nomor Absen
                row.getCell(2).value = s.nama || s.siswa || '-';                     // Nama (B)
                row.getCell(3).value = `${resVal} ${s.unit || ''}`.trim();           // Hasil (C)
                row.getCell(4).value = s.kategori || '-';                            // Kategori (D)
                row.getCell(5).value = s.benchmark || '-';                           // Benchmark (E)
                row.getCell(6).value = `${(s.percentResult !== undefined ? s.percentResult : (s.presentase || 0))}%`; // Capaian (F)

                for (let c = 1; c <= 6; c++) {
                    const cell = row.getCell(c);
                    cell.alignment = { 
                        horizontal: c === 2 ? 'left' : 'center', 
                        vertical: 'middle' 
                    };
                    cell.border = {
                        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
                        left: { style: 'thin', color: { argb: 'E2E8F0' } },
                        right: { style: 'thin', color: { argb: 'E2E8F0' } }
                    };
                }

                currentRow++;
            });
        }

        // ==========================================
        // 7. RENDER GRAFIK DI DALAM EXCEL (SUMBU X = ABSEN)
        // ==========================================
        if (includeChart) {
            let base64Image = sesiData.chartImageBase64;

            if (!base64Image && typeof Chart !== 'undefined') {
                try {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = 900;
                    tempCanvas.height = 420;
                    const tempCtx = tempCanvas.getContext('2d');

                    const dataBenchmark = listSiswa.map(s => Number(s.benchmark || sesiData.benchmark || 0));
                    const dataHasil = listSiswa.map(s => Number(s.nilai !== undefined ? s.nilai : (s.result || 0)));
                    const labelsAbsen = listSiswa.map((_, i) => i + 1);

                    const dataGapPersen = listSiswa.map((s, idx) => {
                        const valNilai = dataHasil[idx];
                        const valBench = dataBenchmark[idx];
                        if (valBench === 0) return 0;
                        return Number((((valNilai - valBench) / valBench) * 100).toFixed(2));
                    });

                    const tempChart = new Chart(tempCtx, {
                        type: 'bar',
                        data: {
                            labels: labelsAbsen,
                            datasets: [
                                {
                                    type: 'line',
                                    label: 'Gap (%)',
                                    data: dataGapPersen,
                                    borderColor: '#feca57',
                                    backgroundColor: '#feca57',
                                    borderWidth: 2,
                                    pointRadius: 3,
                                    yAxisID: 'y1'
                                },
                                {
                                    type: 'line',
                                    label: 'Benchmark',
                                    data: dataBenchmark,
                                    borderColor: '#ff4757',
                                    borderWidth: 2,
                                    borderDash: [4, 4],
                                    pointRadius: 0,
                                    yAxisID: 'y'
                                },
                                {
                                    type: 'bar',
                                    label: 'Hasil (Result)',
                                    data: dataHasil,
                                    backgroundColor: dataHasil.map((val, idx) => 
                                        val > dataBenchmark[idx] ? '#2ed573' : (val === dataBenchmark[idx] ? '#38bdf8' : '#ff4757')
                                    ),
                                    borderRadius: 3,
                                    yAxisID: 'y'
                                }
                            ]
                        },
                        options: {
                            responsive: false,
                            animation: false,
                            scales: {
                                x: { 
                                    ticks: { 
                                        display: true, 
                                        color: '#334155', 
                                        font: { size: 11, weight: 'bold' },
                                        autoSkip: false 
                                    }, 
                                    grid: { display: false },
                                    title: {
                                        display: true,
                                        text: 'Nomor Absen Siswa',
                                        color: '#475569',
                                        font: { size: 11, weight: 'bold' }
                                    }
                                },
                                y: { 
                                    beginAtZero: true, 
                                    position: 'left', 
                                    title: { display: true, text: 'Nilai Mentah', font: { size: 11 } } 
                                },
                                y1: { 
                                    position: 'right', 
                                    title: { display: true, text: 'Gap (%)', font: { size: 11 } }, 
                                    grid: { drawOnChartArea: false } 
                                }
                            }
                        }
                    });

                    base64Image = tempCanvas.toDataURL('image/png');
                    tempChart.destroy();
                } catch (e) {
                    console.warn("Gagal merender grafik sementara:", e);
                }
            }

            if (base64Image) {
                const imageId = workbook.addImage({
                    base64: base64Image,
                    extension: 'png',
                });

                const chartStartRow = currentRow + 2;

                sheet.getCell(`A${chartStartRow}`).value = 'VISUALISASI GRAFIK CAPAIAN SESI (BERDASARKAN NOMOR ABSEN)';
                sheet.getCell(`A${chartStartRow}`).font = { bold: true, size: 11, color: { argb: '1E1B4B' } };

                sheet.addImage(imageId, {
                    tl: { col: 0, row: chartStartRow },
                    ext: { width: 700, height: 330 }
                });
            }
        }
    }

    // ==========================================
    // 8. FORMAT PENAMAAN FILE AUTOMATIS
    // ==========================================
    const cleanKelas = (firstKelas || 'Kelas').replace(/[*?:/\\\[\]]/g, '').trim();
    const cleanTes = (firstTes || 'Tes').replace(/[*?:/\\\[\]]/g, '').trim();
    const cleanTanggal = (firstTanggal || '').replace(/[*?:/\\\[\]]/g, '').trim();

    let customFileName = `Laporan_${cleanKelas}_${cleanTes}`;
    if (cleanTanggal) {
        customFileName += `_${cleanTanggal}`;
    }
    
    // Jika mengekspor lebih dari 1 sesi, tambahkan penanda Gabungan
    if (checkedBoxes.length > 1) {
        customFileName += `_Gabungan`;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${customFileName}.xlsx`;
    link.click();

    if (typeof tutupModalExport === 'function') {
        tutupModalExport();
    }
}

// ==========================================
// FITUR HEADER: SIMPLE & RELIABLE VERSION
// ==========================================

// 1. FUNGSI MODE LAPANGAN (KONTRAST TINGGI)
function toggleOutdoorMode() {
    document.body.classList.toggle('outdoor-mode');
    
    // Simpan status di browser
    const isOutdoor = document.body.classList.contains('outdoor-mode');
    localStorage.setItem('outdoorMode', isOutdoor);
    
    // Feedback visual sederhana di tombol
    const btn = document.getElementById('btnOutdoor');
    if (btn) {
        btn.style.background = isOutdoor ? '#facc15' : '';
        btn.style.color = isOutdoor ? '#000000' : '';
    }
}

// Cek status tersimpan saat aplikasi dimuat
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('outdoorMode') === 'true') {
        document.body.classList.add('outdoor-mode');
        const btn = document.getElementById('btnOutdoor');
        if (btn) {
            btn.style.background = '#facc15';
            btn.style.color = '#000000';
        }
    }
});


// 2. FUNGSI PENCARIAN SISWA / TES (GLOBAL SEARCH)
function cariGlobal(keyword) {
    const q = keyword.toLowerCase().trim();
    
    // Cari semua baris tabel atlet/siswa yang sedang tampil
    const barisTabel = document.querySelectorAll('#tabelInputAtlet tbody tr, .tabel-atlet tbody tr');
    
    barisTabel.forEach(row => {
        const teksBaris = row.textContent.toLowerCase();
        // Sembunyikan baris jika tidak cocok dengan kata kunci
        if (teksBaris.includes(q)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}


// 3. FUNGSI UPDATE SESI / KELAS
function setNamaSesi(namaKelas) {
    const badgeText = document.getElementById('activeBadgeText');
    if (badgeText) {
        badgeText.textContent = namaKelas.trim() !== '' ? namaKelas : 'Umum / Belum Ada';
    }
}


// 4. SHORTCUT KEYBOARD (Ctrl + K) UNTUK PENCARIAN
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const inputCari = document.getElementById('globalQuickSearchInput');
        if (inputCari) inputCari.focus();
    }
});