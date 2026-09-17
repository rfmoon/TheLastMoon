const COLS = [
  "ID","RECORD DATE","RECORD VALUE","RECORD FEE","MERCHANT","MEMBER",
  "APPROVE","PAYMENT","SETTLEMENT","PARTNER ID","VENDOR ID","STATUS","TICKET"
];

const CUTOFF_SECONDS = 23 * 3600 + 30 * 60; // 23:30:00 tetap
let sourceText = "";
let sourceFileName = "";
let filteredRows = [];

function fmtNum(n){
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

function parseMoney(v){
  if(v == null) return 0;
  let s = String(v).trim();
  if(!s) return 0;

  s = s.replace(/Rp/gi,"").replace(/\s/g,"");

  // 1.500.000 -> 1500000
  if(/^-?\d{1,3}(\.\d{3})+$/.test(s)){
    s = s.replace(/\./g,"");
  }
  // 1,500,000 -> 1500000
  else if(/^-?\d{1,3}(,\d{3})+$/.test(s)){
    s = s.replace(/,/g,"");
  }
  else{
    s = s.replace(/,/g,"");
  }

  const n = Number(s.replace(/[^\d.-]/g,""));
  return Number.isFinite(n) ? n : 0;
}

function getTime(str){
  const s = String(str || "");
  let m = s.match(/T(\d{2}):(\d{2}):(\d{2})/);
  if(!m) m = s.match(/\b(\d{1,2}):(\d{2}):(\d{2})\b/);
  if(!m) return null;

  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
}

function parseCSV(text){
  text = text.replace(/^\uFEFF/,"").replace(/\r/g,"").trim();
  if(!text) return [];

  const first = text.split("\n")[0];

  // Auto deteksi delimiter supaya CSV export XPay dari sumber berbeda
  // tetap bisa dibaca: TAB, koma, atau semicolon.
  const candidates = ["\t", ",", ";"];
  const delimiter = candidates
    .map(d => ({ d, count: first.split(d).length - 1 }))
    .sort((a,b) => b.count - a.count)[0].d;

  const rows = [];
  let row = [];
  let cell = "";
  let q = false;

  for(let i = 0; i < text.length; i++){
    const c = text[i];

    if(c === '"'){
      if(q && text[i+1] === '"'){
        cell += '"';
        i++;
      }else{
        q = !q;
      }
    }else if(c === delimiter && !q){
      row.push(cell);
      cell = "";
    }else if(c === "\n" && !q){
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    }else{
      cell += c;
    }
  }

  row.push(cell);
  rows.push(row);

  return rows.filter(r => r.some(x => String(x).trim() !== ""));
}

function normalizeRows(rows){
  if(!rows.length) return [];

  const header = rows[0].map(x => String(x).trim().toUpperCase());
  const hasHeader =
    header.includes("RECORD VALUE") &&
    header.includes("PAYMENT") &&
    header.includes("STATUS");

  if(hasHeader){
    const map = COLS.map(c => header.indexOf(c));
    return rows.slice(1).map(r =>
      map.map(i => i >= 0 ? (r[i] ?? "") : "")
    );
  }

  return rows.map(r => {
    const out = r.slice(0,13);
    while(out.length < 13) out.push("");
    return out;
  });
}

function run(){
  if(!sourceText){
    alert("Pilih file XPay terlebih dahulu.");
    return;
  }

  const rows = normalizeRows(parseCSV(sourceText));

  filteredRows = rows.filter(r => {
    const paymentTime = getTime(r[7]);
    const status = String(r[11] || "").trim().toUpperCase();

    return (
      paymentTime !== null &&
      paymentTime > CUTOFF_SECONDS &&
      status === "SUCCESS"
    );
  });

  const totalValue = filteredRows.reduce(
    (sum,r) => sum + parseMoney(r[2]), 0
  );

  const totalFee = filteredRows.reduce(
    (sum,r) => sum + parseMoney(r[3]), 0
  );

  document.getElementById("count").textContent = fmtNum(filteredRows.length);
  document.getElementById("value").textContent = fmtNum(totalValue);
  document.getElementById("fee").textContent = fmtNum(totalFee);
  document.getElementById("grand").textContent = fmtNum(totalValue + totalFee);

  const times = filteredRows
    .map(r => ({raw:r[7], sec:getTime(r[7])}))
    .filter(x => x.sec !== null)
    .sort((a,b) => a.sec - b.sec);

  document.getElementById("range").textContent =
    times.length
      ? `${times[0].raw} s/d ${times[times.length-1].raw}`
      : "";

  document.getElementById("statusline").textContent =
    `${sourceFileName} • Dibaca ${fmtNum(rows.length)} baris • Cutoff ${fmtNum(filteredRows.length)} baris`;

  renderTable();
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[m]));
}

function renderTable(){
  const box = document.getElementById("tablebox");

  if(!filteredRows.length){
    box.innerHTML = '<div class="empty">Tidak ada transaksi yang memenuhi cutoff.</div>';
    return;
  }

  let h = "<table><thead><tr>";
  h += COLS.map(c => `<th>${esc(c)}</th>`).join("");
  h += "</tr></thead><tbody>";

  h += filteredRows.map(r => {
    return "<tr>" + r.map((v,i) => {
      if(i === 2 || i === 3){
        return `<td>${fmtNum(parseMoney(v))}</td>`;
      }
      return `<td>${esc(v)}</td>`;
    }).join("") + "</tr>";
  }).join("");

  h += "</tbody></table>";
  box.innerHTML = h;
}

function rowsToTSV(rows){
  const converted = rows.map(r =>
    r.map((v,i) => (i === 2 || i === 3) ? fmtNum(parseMoney(v)) : v)
  );
  return [COLS, ...converted].map(r => r.join("\t")).join("\n");
}

function csvCell(v){
  const s = String(v ?? "");
  return /[",\n]/.test(s)
    ? '"' + s.replace(/"/g,'""') + '"'
    : s;
}

function rowsToCSV(rows){
  const converted = rows.map(r =>
    r.map((v,i) => (i === 2 || i === 3) ? fmtNum(parseMoney(v)) : v)
  );

  return [COLS, ...converted]
    .map(r => r.map(csvCell).join(","))
    .join("\n");
}

document.getElementById("file").addEventListener("change", async e => {
  const f = e.target.files[0];
  if(!f) return;

  sourceFileName = f.name;
  const status = document.getElementById("statusline");

  try{
    status.textContent = `${sourceFileName} sedang dibaca...`;

    sourceText = await f.text();

    if(!String(sourceText || "").trim()){
      throw new Error("File kosong atau tidak berisi teks CSV/TXT.");
    }

    status.textContent =
      `${sourceFileName} berhasil dibaca • ${fmtNum(f.size)} bytes`;

    run();
  }catch(err){
    sourceText = "";
    filteredRows = [];
    status.textContent =
      `Gagal membaca ${sourceFileName}: ${err.message || err}`;
    document.getElementById("tablebox").innerHTML =
      '<div class="empty">File gagal dibaca.</div>';
  }
});

document.getElementById("run").onclick = run;

document.getElementById("clear").onclick = () => {
  sourceText = "";
  sourceFileName = "";
  filteredRows = [];

  document.getElementById("file").value = "";
  document.getElementById("count").textContent = "0";
  document.getElementById("value").textContent = "0";
  document.getElementById("fee").textContent = "0";
  document.getElementById("grand").textContent = "0";
  document.getElementById("statusline").textContent = "Belum ada file.";
  document.getElementById("range").textContent = "";
  document.getElementById("tablebox").innerHTML =
    '<div class="empty">Belum ada hasil.</div>';
};

document.getElementById("copy").onclick = async () => {
  if(!filteredRows.length){
    alert("Belum ada data cutoff.");
    return;
  }

  await navigator.clipboard.writeText(rowsToTSV(filteredRows));
  alert("Data cutoff berhasil dicopy.");
};

document.getElementById("download").onclick = () => {
  if(!filteredRows.length){
    alert("Belum ada data cutoff.");
    return;
  }

  const blob = new Blob(
    ["\ufeff" + rowsToCSV(filteredRows)],
    {type:"text/csv;charset=utf-8"}
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "hasil_cutoff.csv";
  a.click();

  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
