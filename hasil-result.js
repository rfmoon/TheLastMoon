const $=selector=>document.querySelector(selector);

let allRows=[];
let storedDates=[];
let refreshTimer=null;

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
    <button
      class="date-chip ${row.date===current ? "active" : ""}"
      type="button"
      data-date="${escapeHtml(row.date)}">
      <strong>${escapeHtml(row.date)}</strong>
      <small>${Number(row.total || 0)} hasil</small>
    </button>
  `).join("");

  box.querySelectorAll("[data-date]").forEach(button=>{
    button.addEventListener("click",()=>{
      setActiveDate(button.dataset.date);
      loadResults();
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

async function refreshAll(){
  const before=$("#resultDate").value;

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

  refreshTimer=setInterval(
    async()=>{
      try{
        const current=
          $("#resultDate").value;

        await loadDates();

        if(current){
          setActiveDate(current);
        }

        await loadResults(false);
      }catch(_){}
    },
    10000
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
