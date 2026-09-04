// ========================================================
// HITUNG.JS - Wiraga App
// Halaman Hitung: tabel input, import Excel, validasi, kalkulasi
// ========================================================

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

            let varsCount = rumusObj.variables && rumusObj.variables.length > 0 ? rumusObj.variables.length : 1;
            const namaKolomHarapan = ['Nama', ...rumusObj.variables].join(', ');

            // =========================================================
            // VALIDASI: Cek jumlah kolom sesuai format yang diharapkan
            // =========================================================
            const headerRow = jsonRows[0] || [];
            if (headerRow.length < varsCount + 1) {
                const lanjut = confirm(
                    `⚠️ Jumlah kolom di file Excel (${headerRow.length}) tidak sesuai dengan yang diharapkan (${varsCount + 1}).\n\n` +
                    `Urutan kolom seharusnya: ${namaKolomHarapan}\n\n` +
                    `Kolom yang kosong akan diisi 0. Tetap lanjutkan impor?`
                );
                if (!lanjut) {
                    event.target.value = '';
                    return;
                }
            }

            while (table.rows.length > 1) {
                table.deleteRow(1);
            }

            let importedCount = 0;
            const barisDiabaikan = [];

            for (let i = 1; i < jsonRows.length; i++) {
                const rowData = jsonRows[i];
                if (!rowData || rowData.length === 0) continue;

                const nama = rowData[0] ? String(rowData[0]).trim() : '';
                if (!nama) continue;

                // =========================================================
                // VALIDASI: Setiap nilai variabel harus angka yang valid
                // =========================================================
                let adaNilaiInvalid = false;
                const nilaiPerVar = [];
                for (let vIdx = 0; vIdx < varsCount; vIdx++) {
                    const rawVal = rowData[vIdx + 1];
                    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
                        adaNilaiInvalid = true;
                        break;
                    }
                    const numVal = Number(rawVal);
                    if (isNaN(numVal)) {
                        adaNilaiInvalid = true;
                        break;
                    }
                    nilaiPerVar.push(numVal);
                }

                if (adaNilaiInvalid) {
                    barisDiabaikan.push(`Baris ${i + 1} ("${nama}") - nilai kosong/bukan angka`);
                    continue;
                }

                tambahBaris(rumusObj.id, table);
                const lastRow = table.rows[table.rows.length - 1];

                lastRow.cells[1].querySelector('input').value = nama;

                for (let vIdx = 0; vIdx < varsCount; vIdx++) {
                    if (lastRow.cells[2 + vIdx]) {
                        lastRow.cells[2 + vIdx].querySelector('input').value = nilaiPerVar[vIdx];
                    }
                }
                importedCount++;
            }

            let pesanHasil = `✅ Berhasil mengimpor ${importedCount} data siswa dari file Excel!`;
            if (barisDiabaikan.length > 0) {
                const tampilkan = barisDiabaikan.slice(0, 10).join('\n');
                const sisa = barisDiabaikan.length > 10 ? `\n...dan ${barisDiabaikan.length - 10} baris lainnya` : '';
                pesanHasil += `\n\n⚠️ ${barisDiabaikan.length} baris DILEWATI karena data tidak valid:\n${tampilkan}${sisa}`;
            }
            alert(pesanHasil);
            event.target.value = '';

        } catch (error) {
            alert('Gagal membaca file Excel. Pastikan format file sesuai! Error: ' + error.message);
        }
    };

    reader.readAsArrayBuffer(file);
}

// ==========================================
// VALIDASI: Urutan rubrik nilai harus logis
// ==========================================
function validasiUrutanRubrik(limitSB, limitB, limitC, isLowerBetter) {
    const masalah = [];
    if (isLowerBetter) {
        // Lower is better -> SB harus PALING KECIL, C paling besar
        if (limitSB !== null && limitB !== null && limitSB > limitB) {
            masalah.push('Batas "Sangat Baik" (' + limitSB + ') seharusnya lebih kecil atau sama dengan "Baik" (' + limitB + ') karena tes ini "Lower is Better".');
        }
        if (limitB !== null && limitC !== null && limitB > limitC) {
            masalah.push('Batas "Baik" (' + limitB + ') seharusnya lebih kecil atau sama dengan "Cukup" (' + limitC + ') karena tes ini "Lower is Better".');
        }
    } else {
        // Higher is better -> SB harus PALING BESAR, C paling kecil
        if (limitSB !== null && limitB !== null && limitSB < limitB) {
            masalah.push('Batas "Sangat Baik" (' + limitSB + ') seharusnya lebih besar atau sama dengan "Baik" (' + limitB + ') karena tes ini "Higher is Better".');
        }
        if (limitB !== null && limitC !== null && limitB < limitC) {
            masalah.push('Batas "Baik" (' + limitB + ') seharusnya lebih besar atau sama dengan "Cukup" (' + limitC + ') karena tes ini "Higher is Better".');
        }
    }
    return masalah;
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

    // =========================================================
    // VALIDASI: Urutan rubrik harus logis sesuai orientasi tes
    // =========================================================
    const masalahRubrik = validasiUrutanRubrik(limitSB, limitB, limitC, isLowerBetter);
    if (masalahRubrik.length > 0) {
        alert('⚠️ Rubrik nilai tidak logis:\n\n' + masalahRubrik.join('\n') + '\n\nSilakan perbaiki dulu batas rubriknya sebelum menghitung.');
        return;
    }

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
            // =========================================================
            // EVALUASI RUMUS AMAN MENGGUNAKAN MATH.JS
            // (menggantikan new Function() yang berisiko keamanan)
            // =========================================================
            const scope = {};
            vars.forEach((namaVar, j) => { scope[namaVar] = values[j]; });

            let hasil = math.evaluate(rumusObj.formula, scope);
            let result = Number(Number(hasil).toFixed(2));

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

