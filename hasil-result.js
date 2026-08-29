const $=selector=>document.querySelector(selector);

let allRows=[];
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
    throw new Error(data.error || `HTTP ${response.status}`);
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

async function loadDates(){
  const data=await api("/api/results/dates");
  const select=$("#savedDates");
  const current=select.value;

  select.innerHTML='<option value="">Tanggal tersimpan</option>';

  for(const row of data.dates || []){
    const option=document.createElement("option");
    option.value=row.date;
    option.textContent=`${row.date} (${row.total})`;
    select.appendChild(option);
  }

  if(current){
    select.value=current;
  }
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
    (max,row)=>Math.max(max,Number(row.updatedAt || 0)),
    0
  );
  $("#resultUpdated").textContent=formatUpdated(latest);

  if(!rows.length){
    body.innerHTML='<tr><td colspan="7" class="empty">Tidak ada hasil pada tanggal / pencarian ini.</td></tr>';
    return;
  }

  body.innerHTML=rows.map((row,index)=>`
    <tr>
      <td class="market">${escapeHtml(row.display || "-")}</td>
      <td>${escapeHtml(row.date || "-")} ${escapeHtml(row.time || "")}</td>
      <td class="number">${escapeHtml(row.n1 || "-")}</td>
      <td class="number">${escapeHtml(row.n2 || "-")}</td>
      <td class="number">${escapeHtml(row.n3 || "-")}</td>
      <td>${escapeHtml(row.shio || "-")}</td>
      <td><button class="copy-btn" type="button" data-copy="${index}">COPY</button></td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-copy]").forEach(button=>{
    button.addEventListener("click",async()=>{
      const row=rows[Number(button.dataset.copy)];
      if(!row)return;

      try{
        await navigator.clipboard.writeText(
          String(row.resultText || "")
        );
        const old=button.textContent;
        button.textContent="OK";
        button.classList.add("ok");
        setTimeout(()=>{
          button.textContent=old;
          button.classList.remove("ok");
        },700);
      }catch(_){}
    });
  });
}

async function loadResults(showStatus=true){
  const date=$("#resultDate").value || todayYmd();

  if(showStatus)setStatus("Memuat...");

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

async function start(){
  $("#resultDate").value=todayYmd();

  $("#resultRefresh").addEventListener(
    "click",
    async()=>{
      await loadDates();
      await loadResults();
    }
  );

  $("#resultDate").addEventListener(
    "change",
    loadResults
  );

  $("#savedDates").addEventListener(
    "change",
    ()=>{
      if(!$("#savedDates").value)return;
      $("#resultDate").value=
        $("#savedDates").value;
      loadResults();
    }
  );

  $("#resultSearch").addEventListener(
    "input",
    render
  );

  await loadDates();
  await loadResults();

  refreshTimer=setInterval(
    ()=>loadResults(false),
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
