const $=selector=>document.querySelector(selector);

let allRows=[];
let storedDates=[];
let refreshTimer=null;
let liveCheckTimer=null;
let minuteRefreshTimer=null;
let lastServerFingerprint="";
let sourceIsMaster=false;

function todayYmd(){
  const d=new Date();
  return [
    d.getFullYear(),
    String(d.getMonth()+1).padStart(2,"0"),
    String(d.getDate()).padStart(2,"0")
  ].join("-");
}

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

async function api(url){
  const response=await fetch(url,{
    credentials:"same-origin",
    cache:"no-store"
  });

  const data=await response.json().catch(()=>({}));

  if(!response.ok){
    const message=
      data.error ||
      `HTTP ${response.status}`;

    throw new Error(
      `${message} [${url}]`
    );
  }

  return data;
}

function setStatus(text,type=""){
  const el=$("#resultStatus");
  el.textContent=text;
  el.className=type;
}

function formatUpdated(value){
  if(!value)return "-";

  const d=new Date(Number(value));

  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleString("id-ID");
}

function setActiveDate(date){
  $("#resultDate").value=date || "";
  $("#activeDate").textContent=date || "-";

  $("#savedDates").value=
    storedDates.some(row=>row.date===date)
      ? date
      : "";

  renderDateHistory();
}

async function sourceApi(url,options={}){
  const response=await fetch(url,{
    credentials:"same-origin",
    cache:"no-store",
    ...options,
    headers:{
      "Content-Type":"application/json",
      ...(options.headers || {})
    }
  });

  const data=await response.json().catch(()=>({}));

  if(!response.ok){
    throw new Error(
      data.error ||
      `HTTP ${response.status}`
    );
  }

  return data;
}

function setSourceStatus(text,type=""){
  const el=$("#sourceStatus");
  el.textContent=text;
  el.className=
    "source-status" +
    (type ? " " + type : "");
}

function showSourceDiag(source){
  const box=$("#sourceDiag");

  if(!source){
    box.className="source-diagnostics";
    box.textContent="";
    return;
  }

  const lines=[
    `HTTP: ${source.status}`,
    `Final URL: ${source.finalUrl || "-"}`,
    `HTML: ${Number(source.htmlLength || 0)} chars`,
    `#pool-name: ${source.hasPoolName ? "ADA" : "TIDAK"}`,
    `#isihistory: ${source.hasIsiHistory ? "ADA" : "TIDAK"}`,
    `changeHistory: ${source.hasChangeHistory ? "ADA" : "TIDAK"}`,
    `Market default: ${source.market || "-"}`,
    `Result statis: ${Array.isArray(source.rows) ? source.rows.length : 0}`,
    source.historyCandidates?.length
      ? `Candidate history URL:\n- ${source.historyCandidates.join("\n- ")}`
      : "Candidate history URL: belum ditemukan"
  ];

  box.textContent=lines.join("\n");
  box.className="source-diagnostics show";
}

async function copyTextSafe(text){
  const value=String(text || "");

  try{
    await navigator.clipboard.writeText(value);
    return true;
  }catch(_){}

  const area=document.createElement("textarea");
  area.value=value;
  area.style.cssText=
    "position:fixed;left:-9999px;top:-9999px;";

  document.body.appendChild(area);
  area.select();

  let ok=false;

  try{
    ok=document.execCommand("copy");
  }catch(_){}

  area.remove();
  return ok;
}

async function copyAllForDate(date,button){
  const original=button?.textContent || "COPY ALL";

  if(button){
    button.disabled=true;
    button.textContent="...";
  }

  try{
    const data=await api(
      `/api/results?date=${encodeURIComponent(date)}`
    );

    const rows=Array.isArray(data.rows)
      ? data.rows
      : [];

    if(!rows.length){
      throw new Error("Tanggal ini belum ada result.");
    }

    const text=rows
      .map(row=>String(row.resultText || "").trim())
      .filter(Boolean)
      .join("\n\n");

    if(!text){
      throw new Error("Text result kosong.");
    }

    const copied=await copyTextSafe(text);

    if(!copied){
      throw new Error("Gagal copy clipboard.");
    }

    if(button){
      button.textContent="TERSALIN";
      button.classList.add("ok");

      setTimeout(()=>{
        button.textContent=original;
        button.classList.remove("ok");
        button.disabled=false;
      },900);
    }
  }catch(error){
    if(button){
      button.textContent="GAGAL";
      button.classList.add("error");

      setTimeout(()=>{
        button.textContent=original;
        button.classList.remove("error");
        button.disabled=false;
      },1100);
    }

    setStatus(error.message,"bad");
  }
}


async function loadSourceConfig(){
  const panel=$("#masterSourcePanel");

  if(panel){
    panel.classList.add("hidden");
  }

  sourceIsMaster=false;

  try{
    const data=await sourceApi(
      "/api/result-source"
    );

    if(!data?.isMaster){
      return;
    }

    sourceIsMaster=true;

    if(panel){
      panel.classList.remove("hidden");
    }

    const cfg=data.config || {};

    $("#sourceUrl").value=
      cfg.sourceUrl ||
      "https://luna34849.com/history/number";

    $("#sourceEnabled").checked=
      Number(cfg.enabled) === 1;

    if(cfg.lastTestAt){
      setSourceStatus(
        cfg.lastTestMessage ||
        "Sumber pernah dites.",
        Number(cfg.lastTestOk) === 1
          ? "ok"
          : "bad"
      );
    }
  }catch(error){
    // 403 untuk user non-master memang sengaja:
    // Auto Source Result tidak boleh terlihat sama sekali.
    if(
      String(error.message || "").includes("Master") ||
      String(error.message || "").includes("403")
    ){
      return;
    }

    if(panel){
      panel.classList.add("hidden");
    }
  }
}

async function saveSourceConfig(){
  setSourceStatus(
    "Menyimpan link..."
  );

  try{
    const data=await sourceApi(
      "/api/result-source",
      {
        method:"PUT",
        body:JSON.stringify({
          sourceUrl:
            $("#sourceUrl").value.trim(),
          enabled:
            $("#sourceEnabled").checked
        })
      }
    );

    setSourceStatus(
      `Link tersimpan • Cron ${data.enabled ? "AKTIF" : "NONAKTIF"}.`,
      "ok"
    );
  }catch(error){
    setSourceStatus(
      error.message,
      "bad"
    );
  }
}

async function testSource(){
  setSourceStatus(
    "Server sedang membuka link sumber..."
  );
  showSourceDiag(null);

  try{
    const data=await sourceApi(
      "/api/result-source",
      {
        method:"POST",
        body:JSON.stringify({
          action:"test"
        })
      }
    );

    const source=data.source || {};
    const rows=Array.isArray(source.rows)
      ? source.rows.length
      : 0;

    setSourceStatus(
      rows
        ? `HTML statis terbaca • ${rows} result ditemukan.`
        : (
          source.hasChangeHistory
            ? `HTTP ${source.status} • halaman dinamis terdeteksi (changeHistory/AJAX). Browser Run Worker diperlukan untuk membaca update.`
            : `HTTP ${source.status} • result statis belum terbaca.`
        ),
      rows ? "ok" : "bad"
    );

    showSourceDiag(source);
  }catch(error){
    setSourceStatus(
      `TEST GAGAL • ${error.message}`,
      "bad"
    );
  }
}

async function pullSourceNow(){
  setSourceStatus(
    "Menarik result dari server..."
  );

  try{
    const data=await sourceApi(
      "/api/result-source",
      {
        method:"POST",
        body:JSON.stringify({
          action:"pull"
        })
      }
    );

    showSourceDiag(data.source);

    setSourceStatus(
      data.saved
        ? `HTML statis terbaca • ${data.saved} result disimpan.`
        : (
          data.source?.hasChangeHistory
            ? "Halaman ini dinamis (changeHistory/AJAX). Fetch biasa tidak bisa membaca update. Gunakan Browser Run Worker V2 untuk scan otomatis."
            : "Server belum menemukan row result yang dapat disimpan."
        ),
      data.saved ? "ok" : "bad"
    );

    await refreshAll();
  }catch(error){
    setSourceStatus(
      `TARIK GAGAL • ${error.message}`,
      "bad"
    );
  }
}


async function loadServerStatus(){
  try{
    const data=await api(
      "/api/results-status"
    );

    $("#serverTotal").textContent=
      Number(data.total || 0);

    $("#serverDates").textContent=
      Number(data.dates || 0);

    let help=$("#resultSyncHelp");

    if(!help){
      help=document.createElement("div");
      help.id="resultSyncHelp";
      help.className="result-sync-help";

      const stats=$(".result-stats");
      stats.insertAdjacentElement(
        "afterend",
        help
      );
    }

    if(Number(data.total || 0) > 0){
      help.className=
        "result-sync-help ok";

      help.textContent=
        `Server sudah menerima ${Number(data.total || 0)} result dari ${Number(data.dates || 0)} tanggal.`;
    }else{
      help.className=
        "result-sync-help";

      help.textContent=
        "Server masih 0 result. Lihat panel LUNA RESULT: jika tertulis API BELUM SET / API OFF / API ERROR, data belum pernah dikirim ke TheLastMoon. Klik SET API di panel Luna lalu TEST & SYNC.";
    }

    const fingerprint=[
      Number(data.total || 0),
      Number(data.dates || 0),
      Number(data.latestUpdatedAt || 0)
    ].join("|");

    return {
      ...data,
      fingerprint
    };
  }catch(error){
    $("#serverTotal").textContent="ERR";
    $("#serverDates").textContent="-";
    throw error;
  }
}

async function loadDates(){
  const data=await api("/api/results/dates");

  storedDates=Array.isArray(data.dates)
    ? data.dates.slice(0,10)
    : [];

  const select=$("#savedDates");
  const current=select.value;

  select.innerHTML=
    '<option value="">Tanggal tersimpan</option>';

  for(const row of storedDates){
    const option=document.createElement("option");
    option.value=row.date;
    option.textContent=
      `${row.date} (${row.total} hasil)`;
    select.appendChild(option);
  }

  if(
    current &&
    storedDates.some(row=>row.date===current)
  ){
    select.value=current;
  }

  renderDateHistory();
  return storedDates;
}

function renderDateHistory(){
  const box=$("#dateHistory");
  const current=$("#resultDate").value;

  if(!storedDates.length){
    box.innerHTML="";
    return;
  }

  box.innerHTML=storedDates.map(row=>`
    <div class="date-card ${row.date===current ? "active" : ""}">
      <button
        class="date-main"
        type="button"
        data-date-open="${escapeHtml(row.date)}">
        <strong>${escapeHtml(row.date)}</strong>
        <small>${Number(row.total || 0)} hasil</small>
      </button>

      <button
        class="date-copy-all"
        type="button"
        data-date-copy="${escapeHtml(row.date)}">
        COPY ALL
      </button>
    </div>
  `).join("");

  box.querySelectorAll("[data-date-open]").forEach(button=>{
    button.addEventListener("click",()=>{
      setActiveDate(button.dataset.dateOpen);
      loadResults();
    });
  });

  box.querySelectorAll("[data-date-copy]").forEach(button=>{
    button.addEventListener("click",()=>{
      copyAllForDate(
        button.dataset.dateCopy,
        button
      );
    });
  });
}

function visibleRows(){
  const q=$("#resultSearch").value
    .trim()
    .toUpperCase();

  if(!q)return allRows;

  return allRows.filter(row=>
    [
      row.display,
      row.pool,
      row.periode,
      row.date,
      row.time,
      row.n1,
      row.n2,
      row.n3,
      row.shio
    ].join(" ").toUpperCase().includes(q)
  );
}

function render(){
  const rows=visibleRows();
  const body=$("#resultBody");

  $("#resultTotal").textContent=rows.length;

  const latest=allRows.reduce(
    (max,row)=>
      Math.max(
        max,
        Number(row.updatedAt || 0)
      ),
    0
  );

  $("#resultUpdated").textContent=
    formatUpdated(latest);

  $("#activeDate").textContent=
    $("#resultDate").value || "-";

  if(!rows.length){
    body.innerHTML=
      '<tr><td colspan="9" class="empty">Tidak ada hasil pada tanggal / pencarian ini.</td></tr>';
    return;
  }

  body.innerHTML=rows.map((row,index)=>`
    <tr>
      <td class="market">${escapeHtml(row.display || "-")}</td>
      <td>${escapeHtml(row.periode || "-")}</td>
      <td>${escapeHtml(row.date || "-")}</td>
      <td>${escapeHtml(row.time || "-")}</td>
      <td class="number">${escapeHtml(row.n1 || "-")}</td>
      <td class="number">${escapeHtml(row.n2 || "-")}</td>
      <td class="number">${escapeHtml(row.n3 || "-")}</td>
      <td>${escapeHtml(row.shio || "-")}</td>
      <td>
        <button
          class="copy-btn"
          type="button"
          data-copy="${index}">
          COPY
        </button>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-copy]").forEach(button=>{
    button.addEventListener("click",async()=>{
      const row=rows[
        Number(button.dataset.copy)
      ];

      if(!row)return;

      try{
        await navigator.clipboard.writeText(
          String(row.resultText || "")
        );

        button.textContent="OK";
        button.classList.add("ok");

        setTimeout(()=>{
          button.textContent="COPY";
          button.classList.remove("ok");
        },700);
      }catch(_){}
    });
  });
}

async function loadResults(showStatus=true){
  const date=$("#resultDate").value;

  if(!date){
    allRows=[];
    render();
    return;
  }

  if(showStatus){
    setStatus("Memuat...");
  }

  try{
    const data=await api(
      `/api/results?date=${encodeURIComponent(date)}`
    );

    allRows=Array.isArray(data.rows)
      ? data.rows
      : [];

    render();

    if(showStatus){
      setStatus(
        `${allRows.length} hasil`,
        "ok"
      );
    }
  }catch(error){
    setStatus(error.message,"bad");
  }
}

async function liveCheck(){
  try{
    const status=await loadServerStatus();

    if(
      lastServerFingerprint &&
      status.fingerprint !== lastServerFingerprint
    ){
      const current=$("#resultDate").value;

      await loadDates();

      if(current){
        setActiveDate(current);
      }

      await loadResults(false);

      setStatus(
        "DATA BARU • otomatis diperbarui",
        "ok"
      );
    }

    lastServerFingerprint=
      status.fingerprint;
  }catch(_){}
}

async function minuteRefresh(){
  try{
    const current=$("#resultDate").value;

    const status=await loadServerStatus();
    lastServerFingerprint=
      status.fingerprint;

    await loadDates();

    if(current){
      setActiveDate(current);
    }

    await loadResults(false);
  }catch(_){}
}


async function refreshAll(){
  const before=$("#resultDate").value;

  const serverStatus=await loadServerStatus();
  lastServerFingerprint=
    serverStatus.fingerprint || "";
  await loadDates();

  if(
    before &&
    (
      storedDates.some(row=>row.date===before) ||
      before===todayYmd()
    )
  ){
    setActiveDate(before);
  }else if(
    storedDates.some(row=>row.date===todayYmd())
  ){
    setActiveDate(todayYmd());
  }else if(storedDates[0]?.date){
    setActiveDate(storedDates[0].date);
  }else{
    setActiveDate(todayYmd());
  }

  await loadResults();
}

async function start(){
  $("#sourceSave").addEventListener(
    "click",
    saveSourceConfig
  );

  $("#sourceTest").addEventListener(
    "click",
    testSource
  );

  $("#sourcePull").addEventListener(
    "click",
    pullSourceNow
  );

  await loadSourceConfig();

  try{
    const health=await api("/api/results-health");

    if(
      !health?.ok ||
      !health?.dedicatedEndpoints
    ){
      throw new Error(
        "Dedicated Result API belum aktif."
      );
    }
  }catch(error){
    setStatus(
      error.message,
      "bad"
    );
  }

  $("#resultRefresh").addEventListener(
    "click",
    refreshAll
  );

  $("#resultToday").addEventListener(
    "click",
    ()=>{
      setActiveDate(todayYmd());
      loadResults();
    }
  );

  $("#resultDate").addEventListener(
    "change",
    ()=>{
      setActiveDate(
        $("#resultDate").value
      );
      loadResults();
    }
  );

  $("#savedDates").addEventListener(
    "change",
    ()=>{
      if(!$("#savedDates").value)return;

      setActiveDate(
        $("#savedDates").value
      );

      loadResults();
    }
  );

  $("#resultSearch").addEventListener(
    "input",
    render
  );

  await refreshAll();

  // Smart live update:
  // cek perubahan D1 setiap 5 detik, reload tabel hanya jika ada data baru.
  liveCheckTimer=setInterval(
    liveCheck,
    5000
  );

  // Fallback: refresh penuh setiap 1 menit.
  minuteRefreshTimer=setInterval(
    minuteRefresh,
    60000
  );
}

if(document.readyState==="loading"){
  document.addEventListener(
    "DOMContentLoaded",
    start,
    {once:true}
  );
}else{
  start();
}
