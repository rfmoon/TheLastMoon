(() => {
  "use strict";

  const DB_NAME = "ScreenshotPeriodeDB";
  const DB_VERSION = 1;
  const STORE = "records";
  const DEFAULT_ROWS = 20;

  let db = null;
  let currentDate = localDateISO(new Date());
  let rows = [];
  let saveTimer = null;

  const $ = (id) => document.getElementById(id);
  const tableBody = $("tableBody");
  const activeDate = $("activeDate");
  const historyDates = $("historyDates");
  const saveState = $("saveState");

  function localDateISO(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function displayDate(iso){
    if(!iso) return "";
    const [y,m,d] = iso.split("-");
    return `${m}-${d}-${y}`;
  }

  function addDays(iso, amount){
    const [y,m,d] = iso.split("-").map(Number);
    const dt = new Date(y, m-1, d);
    dt.setDate(dt.getDate()+amount);
    return localDateISO(dt);
  }

  function uid(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function blankRow(date=currentDate){
    return {
      id: uid(),
      date,
      userId: "",
      period: "",
      screenshot: "",
      xBet: "",
      checkNominal: "",
      prizeStatus: false,
      scannerStatus: "PENDING",
      updatedAt: Date.now()
    };
  }

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e)=>{
        const database = e.target.result;
        if(!database.objectStoreNames.contains(STORE)){
          const store = database.createObjectStore(STORE,{keyPath:"id"});
          store.createIndex("date","date",{unique:false});
          store.createIndex("updatedAt","updatedAt",{unique:false});
        }
      };
      req.onsuccess = ()=>{ db=req.result; resolve(db); };
      req.onerror = ()=>reject(req.error);
    });
  }

  function txStore(mode="readonly"){
    return db.transaction(STORE,mode).objectStore(STORE);
  }

  function getByDate(date){
    return new Promise((resolve,reject)=>{
      const req = txStore().index("date").getAll(date);
      req.onsuccess = ()=>resolve((req.result||[]).sort((a,b)=>(a.order??0)-(b.order??0)));
      req.onerror = ()=>reject(req.error);
    });
  }

  function getAll(){
    return new Promise((resolve,reject)=>{
      const req = txStore().getAll();
      req.onsuccess = ()=>resolve(req.result||[]);
      req.onerror = ()=>reject(req.error);
    });
  }

  function putMany(items){
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE,"readwrite");
      const store = tx.objectStore(STORE);
      items.forEach(item=>store.put(item));
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }

  function deleteByDate(date){
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE,"readwrite");
      const index = tx.objectStore(STORE).index("date");
      const req = index.openCursor(IDBKeyRange.only(date));
      req.onsuccess = (e)=>{
        const cursor=e.target.result;
        if(cursor){ cursor.delete(); cursor.continue(); }
      };
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }

  function clearAll(){
    return new Promise((resolve,reject)=>{
      const req=txStore("readwrite").clear();
      req.onsuccess=()=>resolve();
      req.onerror=()=>reject(req.error);
    });
  }

  async function ensureRows(){
    rows = await getByDate(currentDate);
    if(rows.length===0){
      rows = Array.from({length:DEFAULT_ROWS},(_,i)=>({...blankRow(),order:i}));
      await putMany(rows);
    }
  }

  function sanitizeNumber(v){
    if(v === null || v === undefined) return "";
    return String(v).replace(/[^\d-]/g,"");
  }

  function fmtNumber(v){
    const n=Number(String(v||"").replace(/[^\d-]/g,""));
    return Number.isFinite(n) && String(v).trim()!=="" ? n.toLocaleString("id-ID") : "";
  }

  function escapeHtml(str){
    return String(str??"").replace(/[&<>"']/g,s=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[s]));
  }

  function render(){
    $("dateBig").textContent = displayDate(currentDate);
    activeDate.value = currentDate;
    tableBody.innerHTML = "";

    rows.forEach((row,index)=>{
      row.order=index;

      // Data lama tetap aman: bila salah satu sudah DONE/tercentang,
      // keduanya otomatis disamakan.
      const isDone = row.prizeStatus === true || row.scannerStatus === "DONE";
      row.prizeStatus = isDone;
      row.scannerStatus = isDone ? "DONE" : "PENDING";

      const tr=document.createElement("tr");
      tr.dataset.id=row.id;
      if(row.scannerStatus==="DONE") tr.classList.add("done-row");

      tr.innerHTML = `
        <td class="rowno">${index+1}</td>
        <td><input type="text" value="${escapeHtml(displayDate(row.date))}" readonly></td>
        <td><input type="text" data-field="userId" value="${escapeHtml(row.userId)}" autocomplete="off"></td>
        <td><input type="text" data-field="period" value="${escapeHtml(row.period)}" autocomplete="off"></td>
        <td><input type="url" data-field="screenshot" value="${escapeHtml(row.screenshot)}" placeholder="https://..." autocomplete="off"></td>
        <td><input type="text" inputmode="numeric" data-field="xBet" value="${escapeHtml(row.xBet)}"></td>
        <td><input type="text" inputmode="numeric" data-field="checkNominal" value="${escapeHtml(row.checkNominal)}"></td>
        <td><label class="check-wrap"><input type="checkbox" data-field="prizeStatus" ${row.prizeStatus?"checked":""}></label></td>
        <td>
          <select class="scan-select ${row.scannerStatus==="DONE"?"done":"pending"}" data-field="scannerStatus">
            <option value="PENDING" ${row.scannerStatus!=="DONE"?"selected":""}>PENDING</option>
            <option value="DONE" ${row.scannerStatus==="DONE"?"selected":""}>DONE</option>
          </select>
        </td>
        <td class="formula-cell"><input class="formula-output" type="text" readonly data-output-field="period" value="${escapeHtml(row.period)}" title="Klik lalu Ctrl+C untuk menyalin"></td>
        <td class="formula-cell"><input class="formula-output" type="text" readonly data-output-field="checkNominal" value="${escapeHtml(row.checkNominal)}" title="Klik lalu Ctrl+C untuk menyalin"></td>
        <td class="formula-cell"><input class="formula-output" type="text" readonly data-output-field="userId" value="${escapeHtml(row.userId)}" title="Klik lalu Ctrl+C untuk menyalin"></td>
      `;
      tableBody.appendChild(tr);
    });

    $("emptyNote").style.display = rows.length ? "none":"block";
    updateScannerCount();
  }

  function rowFromElement(el){
    const tr=el.closest("tr");
    if(!tr) return null;
    return rows.find(r=>r.id===tr.dataset.id) || null;
  }

  function scheduleSave(){
    saveState.textContent="Menyimpan...";
    clearTimeout(saveTimer);
    saveTimer=setTimeout(async()=>{
      try{
        rows.forEach((r,i)=>{r.order=i;r.updatedAt=Date.now();});
        await putMany(rows);
        saveState.textContent="✓ Tersimpan otomatis";
        await refreshHistory();
      }catch(err){
        console.error(err);
        saveState.textContent="Gagal menyimpan";
        toast("Data gagal disimpan.");
      }
    },250);
  }

  function updateScannerCount(){
    const count=rows.filter(r=>r.scannerStatus==="DONE").length;
    $("scannerCount").textContent=count;
  }

  function syncStatusUI(tr,row){
    const isDone = row.scannerStatus === "DONE";
    row.prizeStatus = isDone;

    tr.classList.toggle("done-row",isDone);

    const checkbox = tr.querySelector('[data-field="prizeStatus"]');
    if(checkbox) checkbox.checked = isDone;

    const scanner = tr.querySelector('[data-field="scannerStatus"]');
    if(scanner){
      scanner.value = isDone ? "DONE" : "PENDING";
      scanner.classList.toggle("done",isDone);
      scanner.classList.toggle("pending",!isDone);
    }

    updateScannerCount();
  }

  tableBody.addEventListener("input",(e)=>{
    const field=e.target.dataset.field;
    if(!field || e.target.type==="checkbox" || e.target.tagName==="SELECT") return;

    const row=rowFromElement(e.target);
    if(!row) return;

    if(field==="xBet"){
      row[field]=sanitizeNumber(e.target.value);
    }else{
      // SSCHECK NOMINAL dipertahankan persis seperti input, misalnya 2,000.
      row[field]=e.target.value;
    }

    // Seperti rumus spreadsheet:
    // PERIODE kanan mengikuti PERIODE sumber,
    // NOMINAL kanan mengikuti SSCHECK NOMINAL,
    // USER ID kanan mengikuti USER ID sumber.
    const tr=e.target.closest("tr");
    const output=tr?.querySelector(`[data-output-field="${field}"]`);
    if(output){
      output.value = row[field] ?? "";
    }

    row.updatedAt=Date.now();
    scheduleSave();
  });

  tableBody.addEventListener("change",(e)=>{
    const field=e.target.dataset.field;
    if(!field) return;

    const row=rowFromElement(e.target);
    const tr=e.target.closest("tr");
    if(!row || !tr) return;

    if(field==="prizeStatus"){
      // Dicentang = Scanner DONE. Dilepas = kembali PENDING.
      row.prizeStatus=e.target.checked;
      row.scannerStatus=e.target.checked ? "DONE" : "PENDING";
      syncStatusUI(tr,row);
    }else if(field==="scannerStatus"){
      // Scanner juga tetap dapat dipilih manual dan checkbox ikut disamakan.
      row.scannerStatus=e.target.value==="DONE" ? "DONE" : "PENDING";
      row.prizeStatus=row.scannerStatus==="DONE";
      syncStatusUI(tr,row);
    }else{
      row[field]=e.target.value;
    }

    row.updatedAt=Date.now();
    scheduleSave();
  });

  tableBody.addEventListener("click",(e)=>{
    const output=e.target.closest(".formula-output");
    if(!output) return;
    output.focus();
    output.select();
  });

  tableBody.addEventListener("paste",(e)=>{
    const input=e.target.closest("input[data-field],select[data-field]");
    if(!input) return;
    const text=(e.clipboardData||window.clipboardData).getData("text");
    if(!text.includes("\t") && !text.includes("\n")) return;

    e.preventDefault();
    const startTr=input.closest("tr");
    const startIndex=Array.from(tableBody.children).indexOf(startTr);
    const fieldOrder=["userId","period","screenshot","xBet","checkNominal","prizeStatus","scannerStatus"];
    const startField=fieldOrder.indexOf(input.dataset.field);
    if(startField<0) return;

    const grid=text.replace(/\r/g,"").split("\n").filter((line,i,arr)=>line!=="" || i<arr.length-1).map(line=>line.split("\t"));
    while(rows.length < startIndex+grid.length){
      rows.push({...blankRow(),order:rows.length});
    }

    grid.forEach((cells,rOffset)=>{
      const row=rows[startIndex+rOffset];
      let pastedPrize=false;
      let pastedScanner=false;

      cells.forEach((value,cOffset)=>{
        const field=fieldOrder[startField+cOffset];
        if(!field) return;

        if(field==="prizeStatus"){
          row[field]=/^(1|true|ya|yes|done|✓)$/i.test(value.trim());
          pastedPrize=true;
        }else if(field==="scannerStatus"){
          row[field]=value.trim().toUpperCase()==="DONE" ? "DONE":"PENDING";
          pastedScanner=true;
        }else if(field==="xBet"){
          row[field]=sanitizeNumber(value);
        }else if(field==="checkNominal"){
          row[field]=value.trim();
        }else{
          row[field]=value.trim();
        }
      });

      if(pastedScanner){
        row.prizeStatus=row.scannerStatus==="DONE";
      }else if(pastedPrize){
        row.scannerStatus=row.prizeStatus ? "DONE":"PENDING";
      }
    });
    render();
    scheduleSave();
    toast(`${grid.length} baris ditempel.`);
  });

  async function loadDate(date){
    currentDate=date;
    await ensureRows();
    render();
    await refreshHistory();
  }

  async function refreshHistory(){
    const all=await getAll();
    const dates=[...new Set(all.map(x=>x.date))].sort((a,b)=>b.localeCompare(a));
    const old=historyDates.value;
    historyDates.innerHTML='<option value="">Pilih riwayat...</option>'+
      dates.map(d=>`<option value="${d}">${displayDate(d)} (${all.filter(x=>x.date===d).length} baris)</option>`).join("");
    if(dates.includes(old)) historyDates.value=old;
  }

  $("prevDate").addEventListener("click",()=>loadDate(addDays(currentDate,-1)));
  $("nextDate").addEventListener("click",()=>loadDate(addDays(currentDate,1)));
  $("todayDate").addEventListener("click",()=>loadDate(localDateISO(new Date())));
  activeDate.addEventListener("change",()=>{if(activeDate.value) loadDate(activeDate.value);});
  historyDates.addEventListener("change",()=>{if(historyDates.value) loadDate(historyDates.value);});

  $("addRows").addEventListener("click",()=>{
    const start=rows.length;
    for(let i=0;i<10;i++) rows.push({...blankRow(),order:start+i});
    render();
    scheduleSave();
    toast("10 baris baru ditambahkan.");
  });

  $("clearDate").addEventListener("click",async()=>{
    const ok=confirm(`Hapus semua data tanggal ${displayDate(currentDate)}? Tindakan ini tidak bisa dibatalkan.`);
    if(!ok) return;
    await deleteByDate(currentDate);
    rows=Array.from({length:DEFAULT_ROWS},(_,i)=>({...blankRow(),order:i}));
    await putMany(rows);
    render();
    await refreshHistory();
    toast("Data tanggal ini sudah dikosongkan.");
  });

  function csvEscape(v){
    const s=String(v??"");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }

  function downloadBlob(content,name,type){
    const blob=new Blob([content],{type});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
    }catch{
      const ta=document.createElement("textarea");
      ta.value=text;ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
    }
  }

  function toast(msg){
    const el=$("toast");
    el.textContent=msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t=setTimeout(()=>el.classList.remove("show"),2300);
  }

  function tick(){
    $("clock").textContent=new Date().toLocaleTimeString("id-ID",{hour12:false});
  }

  async function init(){
    try{
      await openDB();
      currentDate=localDateISO(new Date());
      await ensureRows();
      render();
      await refreshHistory();
      tick();
      setInterval(tick,1000);

      // Jika halaman tetap terbuka melewati tengah malam, otomatis pindah ke tanggal baru.
      setInterval(()=>{
        const today=localDateISO(new Date());
        if(currentDate !== today && activeDate.value === currentDate){
          // Tidak memaksa pindah saat user sedang melihat riwayat lama.
        }
      },60000);
    }catch(err){
      console.error(err);
      alert("Database browser tidak dapat dibuka. Coba gunakan Chrome/Edge terbaru dan jangan membuka dalam mode Incognito.");
    }
  }

  init();
})();