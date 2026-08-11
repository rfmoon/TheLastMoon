const LEGACY_STORAGE_KEY = "rekening_database_v4";
const MIGRATION_KEY = "rekening_database_v4_migrated_to_d1";
const API_BASE = "/api/pencairan-xpay/accounts";
const SYNC_INTERVAL_MS = 15000;

const BANKS = [
  {code:"1",name:"BRI",aliases:["BANK RAKYAT INDONESIA","BRI"]},
  {code:"2",name:"MANDIRI",aliases:["BANK MANDIRI","MANDIRI"]},
  {code:"3",name:"BNI",aliases:["BANK NEGARA INDONESIA","BNI"]},
  {code:"4",name:"DANAMON",aliases:["BANK DANAMON INDONESIA","BANK DANAMON","DANAMON"]},
  {code:"5",name:"PERMATA",aliases:["BANK PERMATA","PERMATA","PERMATABANK"]},
  {code:"6",name:"BCA",aliases:["BANK CENTRAL ASIA","CENTRAL ASIA","BCA"]},
  {code:"7",name:"MAYBANK",aliases:["BANK MAYBANK INDONESIA","MAYBANK"]},
  {code:"8",name:"PANIN",aliases:["PANIN","BANK PANIN","PANIN BANK"]},
  {code:"9",name:"CIMB NIAGA",aliases:["BANK CIMB NIAGA","CIMB NIAGA","CIMB"]},
  {code:"10",name:"UOB",aliases:["BANK UOB INDONESIA","UOB"]},
  {code:"11",name:"OCBC",aliases:["BANK OCBC NISP","OCBC NISP","OCBC"]},
  {code:"12",name:"CITIBANK",aliases:["BANK CITIBANK","CITIBANK","CITI"]},
  {code:"14",name:"ARTHA GRAHA",aliases:["BANK ARTHA GRAHA INTERNASIONAL","ARTHA GRAHA"]},
  {code:"18",name:"BANK CAPITAL",aliases:["BANK CAPITAL INDONESIA","BANK CAPITAL","CAPITAL"]},
  {code:"19",name:"ANZ",aliases:["BANK ANZ INDONESIA","ANZ"]},
  {code:"21",name:"HSBC",aliases:["BANK HSBC INDONESIA","HSBC"]},
  {code:"24",name:"MAYAPADA",aliases:["BANK MAYAPADA","MAYAPADA"]},
  {code:"26",name:"MUAMALAT",aliases:["BANK MUAMALAT","MUAMALAT"]},
  {code:"28",name:"SINARMAS",aliases:["BANK SINARMAS","SINARMAS"]},
  {code:"29",name:"MASPION",aliases:["BANK MASPION","MASPION"]},
  {code:"30",name:"GANESHA",aliases:["BANK GANESHA","GANESHA"]},
  {code:"31",name:"ICBC",aliases:["BANK ICBC INDONESIA","ICBC"]},
  {code:"32",name:"QNB",aliases:["BANK QNB INDONESIA","QNB"]},
  {code:"33",name:"BTN",aliases:["BANK TABUNGAN NEGARA","BTN"]},
  {code:"34",name:"WOORI",aliases:["BANK WOORI SAUDARA","WOORI SAUDARA","WOORI"]},
  {code:"36",name:"VICTORIA SYARIAH",aliases:["BANK VICTORIA SYARIAH","VICTORIA SYARIAH"]},
  {code:"38",name:"BJB SYARIAH",aliases:["BANK BJB SYARIAH","BJB SYARIAH"]},
  {code:"39",name:"BANK MEGA",aliases:["BANK MEGA","MEGA"]},
  {code:"41",name:"BUKOPIN",aliases:["BANK BUKOPIN","BUKOPIN","KB BUKOPIN"]},
  {code:"43",name:"JASA JAKARTA",aliases:["BANK JASA JAKARTA","JASA JAKARTA"]},
  {code:"45",name:"MNC",aliases:["BANK MNC INTERNASIONAL","MNC BANK","MNC"]},
  {code:"48",name:"SBI",aliases:["BANK SBI INDONESIA","SBI"]},
  {code:"50",name:"NOBU",aliases:["BANK NATIONALNOBU","BANK NOBU","NOBU"]},
  {code:"51",name:"MEGA SYARIAH",aliases:["BANK MEGA SYARIAH","MEGA SYARIAH"]},
  {code:"52",name:"BANK INA",aliases:["BANK INA PERDANA","BANK INA","INA PERDANA"]},
  {code:"55",name:"BUKOPIN SYARIAH",aliases:["BANK SYARIAH BUKOPIN","BUKOPIN SYARIAH"]},
  {code:"56",name:"SAMPOERNA",aliases:["BANK SAHABAT SAMPOERNA","SAHABAT SAMPOERNA","SAMPOERNA"]},
  {code:"59",name:"BCA SYARIAH",aliases:["BANK BCA SYARIAH","BCA SYARIAH"]},
  {code:"60",name:"BANK JAGO",aliases:["BANK ARTOS","BANK JAGO","ARTOS","JAGO"]},
  {code:"69",name:"CTBC",aliases:["BANK CTBC INDONESIA","CTBC"]},
  {code:"99",name:"SEABANK",aliases:["PT BANK SEABANK INDONESIA","BANK SEABANK INDONESIA","BANK SEABANK","SEABANK"]},
  {code:"116",name:"BSI",aliases:["PT BANK SYARIAH INDONESIA","BANK SYARIAH INDONESIA","BSI"]},
  {code:"122",name:"COMMONWEALTH",aliases:["PT BANK COMMONWEALTH","BANK COMMONWEALTH","COMMONWEALTH"]},
  {code:"127",name:"BANK AMAR",aliases:["PT BANK AMAR INDONESIA","BANK AMAR INDONESIA","BANK AMAR","AMAR"]},
  {code:"129",name:"BANK OKE",aliases:["PT OKE INDONESIA TBK","BANK OKE INDONESIA","BANK OKE","OKE"]},
  {code:"135",name:"ALADIN SYARIAH",aliases:["PT BANK ALADIN SYARIAH TBK","BANK ALADIN SYARIAH","ALADIN SYARIAH","ALADIN"]},
  {code:"142",name:"RESONA",aliases:["PT BANK RESONA PERDANIA","BANK RESONA PERDANIA","RESONA PERDANIA","RESONA"]},
  {code:"149",name:"SHINHAN",aliases:["PT BANK SHINHAN INDONESIA","BANK SHINHAN INDONESIA","SHINHAN"]},
  {code:"161",name:"STANDARD CHARTERED",aliases:["STANDARD CHARTERED BANK","STANDARD CHARTERED","SCB"]},
  {code:"164",name:"OVO",aliases:["OVO"]},
  {code:"165",name:"DANA",aliases:["DANA"]},
  {code:"166",name:"LINKAJA",aliases:["LINKAJA","LINK AJA"]},
  {code:"167",name:"GOPAY",aliases:["GOPAY","GO PAY"]},
  {code:"168",name:"SHOPEEPAY",aliases:["SHOPEEPAY","SHOPEE PAY"]},
  {code:"299",name:"BANK NEO",aliases:["BANK NEO COMMERCE","NEO COMMERCE","BNC","BANK NEO"]}
];

const $ = id => document.getElementById(id);
let database = [];
let processedRows = [];
let syncTimer = null;
let loadingDatabase = false;
let syncFailureCount = 0;
let lastSyncAt = null;

function normalize(value){
  return String(value ?? "")
    .toUpperCase()
    .replace(/&/g," DAN ")
    .replace(/\bPT\.?\b/g," ")
    .replace(/\bTBK\.?\b/g," ")
    .replace(/[().,/_-]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function normalizeName(value){
  return normalize(value);
}

function cleanAccount(value){
  return String(value ?? "")
    .trim()
    .replace(/^['"`]+|['"`]+$/g,"")
    .replace(/[^\d]/g,"");
}

function normalizeAmount(value){
  const digits = String(value ?? "").replace(/[^\d-]/g,"");
  if(!digits || digits === "-") return {numeric:"",formatted:""};
  const number = Number(digits);
  if(!Number.isFinite(number)) return {numeric:"",formatted:""};
  return {
    numeric:String(number),
    formatted:new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(number)
  };
}

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function setMessage(el,text="",type=""){
  el.textContent=text;
  el.className="message"+(type?" "+type:"");
}

function loadLegacyDatabase(){
  try{
    const data=JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
    if(!Array.isArray(data)) return [];

    return data
      .map(row=>({
        bankCode:String(row.bankCode || ""),
        bankName:String(row.bankName || ""),
        name:String(row.name || "").trim(),
        account:cleanAccount(row.account || "")
      }))
      .filter(row=>row.bankCode && row.bankName && row.name && row.account);
  }catch{
    return [];
  }
}

async function api(path,options={}){
  const method=options.method || "GET";
  const attempts=method==="GET" ? 2 : 1;
  let lastError=null;

  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      const response=await fetch(path,{
        method,
        credentials:"same-origin",
        cache:"no-store",
        headers:options.body ? {"Content-Type":"application/json"} : {},
        body:options.body ? JSON.stringify(options.body) : undefined
      });

      const text=await response.text();
      let data={};

      if(text){
        try{
          data=JSON.parse(text);
        }catch{
          throw new Error(`Respons API tidak valid (HTTP ${response.status}).`);
        }
      }

      if(!response.ok){
        const detail=[
          data.error || `Terjadi kesalahan API (HTTP ${response.status}).`,
          data.stage ? `Tahap: ${data.stage}` : "",
          data.detail ? `Detail: ${data.detail}` : ""
        ].filter(Boolean).join(" • ");

        const error=new Error(detail);
        error.status=response.status;
        throw error;
      }

      return data;
    }catch(error){
      lastError=error;
      const retryable=
        method==="GET" &&
        attempt<attempts &&
        (!error.status || error.status>=500);

      if(!retryable) throw error;
      await new Promise(resolve=>setTimeout(resolve,450));
    }
  }

  throw lastError || new Error("API tidak dapat diakses.");
}

function syncStatusText(total){
  const time=lastSyncAt
    ? lastSyncAt.toLocaleTimeString("id-ID",{
        hour:"2-digit",
        minute:"2-digit",
        second:"2-digit"
      })
    : "-";

  return `Database bersama aktif • ${total} rekening • terakhir sinkron ${time}`;
}

function markSyncSuccess(total){
  syncFailureCount=0;
  lastSyncAt=new Date();
  setMessage($("dbMessage"),syncStatusText(total),"ok");
}

function markSyncFailure(error,{silent=false}={}){
  syncFailureCount++;
  if(silent && syncFailureCount<2) return;
  setMessage(
    $("dbMessage"),
    error.message || "Gagal menyinkronkan database bersama.",
    "error"
  );
}

async function loadSharedDatabase({silent=false,migrate=true}={}){
  if(loadingDatabase) return;
  loadingDatabase=true;

  try{
    if(!silent){
      setMessage($("dbMessage"),"Memuat database bersama dari Cloudflare D1...");
    }

    if(migrate && localStorage.getItem(MIGRATION_KEY)!=="1"){
      const legacy=loadLegacyDatabase();

      if(legacy.length){
        await api(`${API_BASE}/bulk`,{
          method:"POST",
          body:{accounts:legacy}
        });
      }

      localStorage.setItem(MIGRATION_KEY,"1");
    }

    const data=await api(API_BASE);
    database=Array.isArray(data.accounts) ? data.accounts : [];
    renderDatabase();
    markSyncSuccess(database.length);
  }catch(error){
    markSyncFailure(error,{silent});
  }finally{
    loadingDatabase=false;
  }
}

function startAutoSync(){
  if(syncTimer) clearInterval(syncTimer);

  syncTimer=setInterval(()=>{
    if(document.visibilityState==="visible"){
      loadSharedDatabase({silent:true,migrate:false});
    }
  },SYNC_INTERVAL_MS);

  window.addEventListener("focus",()=>{
    loadSharedDatabase({silent:true,migrate:false});
  });

  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible"){
      loadSharedDatabase({silent:true,migrate:false});
    }
  });
}


function bankByCode(code){
  return BANKS.find(bank => bank.code === String(code));
}

function findBankByText(text){
  const key=normalize(text);
  let best=null;
  for(const bank of BANKS){
    for(const alias of bank.aliases){
      const a=normalize(alias);
      if(key===a || key.startsWith(a+" ")){
        if(!best || a.length>best.aliasLength){
          best={bank,aliasLength:a.length};
        }
      }
    }
  }
  return best ? best.bank : null;
}

function renderDatabase(){
  $("dbCount").textContent=database.length;
  const body=$("dbBody");
  body.innerHTML="";

  if(!database.length){
    body.innerHTML='<tr><td colspan="5" class="empty">Database masih kosong.</td></tr>';
    return;
  }

  database.forEach((row)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${escapeHtml(row.bankName)}</td>
      <td>${escapeHtml(row.bankCode)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.account)}</td>
      <td>
        <div class="actions">
          <button class="danger small" data-delete="${row.id}">Hapus</button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });
}




async function deleteDatabase(id){
  const row=database.find(item=>Number(item.id)===Number(id));
  if(!row) return;

  if(!confirm(`Hapus rekening ${row.name} — ${row.account} dari database bersama?`)) return;

  try{
    await api(`${API_BASE}/${encodeURIComponent(id)}`,{method:"DELETE"});
    await loadSharedDatabase({silent:true,migrate:false});
    setMessage(
      $("bulkMessage"),
      "Data rekening berhasil dihapus dan tersinkron ke semua user.",
      "ok"
    );
  }catch(error){
    setMessage($("dbMessage"),error.message,"error");
  }
}

function parseDatabaseLine(line){
  const clean=String(line ?? "").trim();
  if(!clean) return {valid:false,error:"Baris kosong"};

  let parts=clean.split(/\t+/).map(v=>v.trim()).filter(Boolean);
  if(parts.length<3 && clean.includes(";")){
    parts=clean.split(";").map(v=>v.trim()).filter(Boolean);
  }

  let bank=null;
  let name="";
  let account="";

  if(parts.length>=3){
    bank=findBankByText(parts[0]);
    account=cleanAccount(parts[parts.length-1]);
    name=parts.slice(1,-1).join(" ").trim();
  }else{
    const tokens=clean.split(/\s+/).filter(Boolean);
    if(tokens.length<3){
      return {valid:false,error:"Format harus: BANK NAMA NOMOR_REKENING"};
    }

    account=cleanAccount(tokens[tokens.length-1]);
    const prefix=tokens.slice(0,-1).join(" ");
    bank=findBankByText(prefix);

    if(bank){
      const normalizedPrefix=normalize(prefix);
      const aliases=bank.aliases
        .map(alias=>({alias,normalized:normalize(alias)}))
        .filter(x=>normalizedPrefix===x.normalized || normalizedPrefix.startsWith(x.normalized+" "))
        .sort((a,b)=>b.normalized.length-a.normalized.length);

      if(aliases.length){
        const aliasWordCount=aliases[0].alias.split(/\s+/).length;
        name=prefix.split(/\s+/).slice(aliasWordCount).join(" ").trim();
      }
    }
  }

  if(!bank) return {valid:false,error:"Bank tidak dikenali"};
  if(!name) return {valid:false,error:"Nama rekening kosong"};
  if(!account) return {valid:false,error:"Nomor rekening kosong"};
  if(!/^\d+$/.test(account)) return {valid:false,error:"Nomor rekening harus berupa angka"};

  return {
    valid:true,
    record:{
      bankCode:bank.code,
      bankName:bank.name,
      name,
      account
    }
  };
}

async function importDatabase(){
  const lines=$("bulkDatabase").value
    .split(/\r?\n/)
    .map(x=>x.trim())
    .filter(Boolean);

  if(!lines.length){
    setMessage($("bulkMessage"),"Tempel data database terlebih dahulu.","warn");
    return;
  }

  const accounts=[];
  let failed=0;

  for(const line of lines){
    const parsed=parseDatabaseLine(line);
    if(!parsed.valid){
      failed++;
      continue;
    }
    accounts.push(parsed.record);
  }

  if(!accounts.length){
    setMessage(
      $("bulkMessage"),
      `Tidak ada rekening valid. ${failed} baris gagal.`,
      "error"
    );
    return;
  }

  try{
    setMessage($("bulkMessage"),"Menyimpan ke database bersama...");

    const result=await api(`${API_BASE}/bulk`,{
      method:"POST",
      body:{accounts}
    });

    await loadSharedDatabase({silent:true,migrate:false});

    setMessage(
      $("bulkMessage"),
      `Tersimpan ke semua user: ${result.added} ditambahkan, ${result.updated} diperbarui, ${failed + Number(result.failed || 0)} gagal.`,
      failed || result.failed ? "warn" : "ok"
    );
  }catch(error){
    setMessage($("bulkMessage"),error.message,"error");
  }
}

async function exportDatabase(){
  if(!database.length){
    setMessage($("bulkMessage"),"Database masih kosong.","warn");
    return;
  }
  const text=database.map(row=>
    [row.bankName,row.name,row.account].join("\t")
  ).join("\n");

  try{
    await navigator.clipboard.writeText(text);
    setMessage($("bulkMessage"),`${database.length} data rekening berhasil disalin.`,"ok");
  }catch{
    const temp=document.createElement("textarea");
    temp.value=text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    setMessage($("bulkMessage"),`${database.length} data rekening berhasil disalin.`,"ok");
  }
}

function findDatabaseMatch(name,account){
  const cleanAcc=cleanAccount(account);
  if(cleanAcc){
    const byAccount=database.find(row=>row.account===cleanAcc);
    if(byAccount) return {row:byAccount,method:"Nomor rekening"};
  }

  const cleanName=normalizeName(name);
  if(cleanName){
    const matches=database.filter(row=>normalizeName(row.name)===cleanName);
    if(matches.length===1) return {row:matches[0],method:"Nama rekening"};
  }
  return null;
}

function invalidTransaction(line,error,detail={}){
  return {
    source:line,
    amount:"",
    amountNumeric:"",
    code:"",
    account:detail.account || "",
    name:detail.name || "",
    valid:false,
    error
  };
}

function parseTransactionLine(line){
  const clean=String(line ?? "").trim();
  if(!clean) return invalidTransaction(line,"Baris kosong");

  let parts=clean.split(/\t+/).map(v=>v.trim()).filter(Boolean);
  if(parts.length<3 && clean.includes(";")){
    parts=clean.split(";").map(v=>v.trim()).filter(Boolean);
  }

  let amountRaw="";
  let account="";
  let inputName="";

  if(parts.length>=3){
    amountRaw=parts[parts.length-1];
    account=cleanAccount(parts[parts.length-2]);
    inputName=parts.slice(0,-2).join(" ").trim();
  }else{
    const tokens=clean.split(/\s+/).filter(Boolean);
    if(tokens.length<3){
      return invalidTransaction(line,"Format harus: NAMA NOMOR_REKENING NOMINAL");
    }

    amountRaw=tokens[tokens.length-1];
    account=cleanAccount(tokens[tokens.length-2]);
    inputName=tokens.slice(0,-2).join(" ").trim();
  }

  if(!account){
    return invalidTransaction(line,"Nomor rekening tidak ditemukan",{name:inputName});
  }

  const amount=normalizeAmount(amountRaw);
  if(!amount.numeric){
    return invalidTransaction(line,"Nominal wajib diisi",{account,name:inputName});
  }

  const match=findDatabaseMatch(inputName,account);
  if(!match){
    return invalidTransaction(
      line,
      "Rekening belum ada di database",
      {account,name:inputName}
    );
  }

  const bank=bankByCode(match.row.bankCode);
  if(!bank){
    return invalidTransaction(
      line,
      "Kode bank database tidak valid",
      {account,name:match.row.name}
    );
  }

  return {
    source:line,
    amount:amount.formatted,
    amountNumeric:amount.numeric,
    code:bank.code,
    account:match.row.account,
    name:match.row.name,
    valid:true,
    error:"",
    matchMethod:match.method
  };
}

function processTransactions(){
  const lines=$("inputData").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length){
    processedRows=[];
    renderResults();
    setMessage($("inputMessage"),"Tempel data transaksi terlebih dahulu.","warn");
    return;
  }

  processedRows=lines.map(parseTransactionLine);
  renderResults();

  const failed=processedRows.filter(row=>!row.valid).length;
  setMessage(
    $("inputMessage"),
    failed
      ? `${processedRows.length} baris diproses, ${failed} baris belum cocok dengan database.`
      : `${processedRows.length} baris berhasil diproses.`,
    failed ? "warn" : "ok"
  );
}

function renderResults(){
  const body=$("resultBody");
  body.innerHTML="";
  const valid=processedRows.filter(row=>row.valid);
  const invalid=processedRows.filter(row=>!row.valid);
  $("successCount").textContent=valid.length;
  $("errorCount").textContent=invalid.length;

  if(!processedRows.length){
    body.innerHTML='<tr><td colspan="5" class="empty">Belum ada data yang diproses.</td></tr>';
    return;
  }

  processedRows.forEach(row=>{
    const tr=document.createElement("tr");
    if(!row.valid) tr.className="bad";
    tr.innerHTML=`
      <td>${escapeHtml(row.amount || "-")}</td>
      <td>${escapeHtml(row.code || "-")}</td>
      <td>${escapeHtml(row.account || "-")}</td>
      <td>${escapeHtml(row.name || "-")}</td>
      <td class="${row.valid ? "ok-text" : "bad-text"}">
        ${row.valid ? "OK" : escapeHtml(row.error)}
      </td>
    `;
    body.appendChild(tr);
  });
}

function getValidRows(){
  return processedRows.filter(row=>row.valid);
}

function buildTSV(){
  return getValidRows().map(row=>
    [row.amount,row.code,row.account,row.name].join("\t")
  ).join("\n");
}

function buildHtmlTable(){
  let html="<table><tbody>";
  getValidRows().forEach(row=>{
    const accountJson=escapeHtml(JSON.stringify({1:2,2:row.account}));
    const formatJson=escapeHtml(JSON.stringify({1:2,2:"@"}));
    html+="<tr>";
    html+=`<td>${escapeHtml(row.amount)}</td>`;
    html+=`<td>${escapeHtml(row.code)}</td>`;
    html+=`<td style="mso-number-format:'\\@';white-space:nowrap"
               data-sheets-value="${accountJson}"
               data-sheets-numberformat="${formatJson}">${escapeHtml(row.account)}</td>`;
    html+=`<td>${escapeHtml(row.name)}</td>`;
    html+="</tr>";
  });
  html+="</tbody></table>";
  return html;
}

async function copyResults(){
  if(!processedRows.length) processTransactions();
  const rows=getValidRows();
  if(!rows.length){
    setMessage($("outputMessage"),"Tidak ada baris valid untuk disalin.","error");
    return;
  }

  const tsv=buildTSV();
  const html=buildHtmlTable();

  try{
    if(navigator.clipboard && window.ClipboardItem){
      const item=new ClipboardItem({
        "text/plain":new Blob([tsv],{type:"text/plain"}),
        "text/html":new Blob([html],{type:"text/html"})
      });
      await navigator.clipboard.write([item]);
    }else{
      throw new Error("ClipboardItem tidak tersedia");
    }
    setMessage($("outputMessage"),`${rows.length} baris disalin tanpa header dan tanpa petik.`,"ok");
  }catch{
    const holder=document.createElement("div");
    holder.contentEditable="true";
    holder.style.position="fixed";
    holder.style.left="-10000px";
    holder.innerHTML=html;
    document.body.appendChild(holder);

    const range=document.createRange();
    range.selectNodeContents(holder);
    const selection=window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
    holder.remove();

    setMessage($("outputMessage"),`${rows.length} baris disalin tanpa header dan tanpa petik.`,"ok");
  }
}

function xmlEscape(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&apos;");
}

function excelColumnName(number){
  let name="";
  while(number>0){
    const remainder=(number-1)%26;
    name=String.fromCharCode(65+remainder)+name;
    number=Math.floor((number-1)/26);
  }
  return name;
}

function crc32(bytes){
  if(!crc32.table){
    const table=new Uint32Array(256);
    for(let n=0;n<256;n++){
      let c=n;
      for(let k=0;k<8;k++){
        c=(c&1) ? (0xEDB88320^(c>>>1)) : (c>>>1);
      }
      table[n]=c>>>0;
    }
    crc32.table=table;
  }

  let crc=0xFFFFFFFF;
  for(let i=0;i<bytes.length;i++){
    crc=crc32.table[(crc^bytes[i])&0xFF]^(crc>>>8);
  }
  return (crc^0xFFFFFFFF)>>>0;
}

function writeU16(view,offset,value){
  view[offset]=value&0xFF;
  view[offset+1]=(value>>>8)&0xFF;
}

function writeU32(view,offset,value){
  view[offset]=value&0xFF;
  view[offset+1]=(value>>>8)&0xFF;
  view[offset+2]=(value>>>16)&0xFF;
  view[offset+3]=(value>>>24)&0xFF;
}

function zipDosDateTime(date){
  const year=Math.max(1980,date.getFullYear());
  const dosTime=
    (date.getHours()<<11) |
    (date.getMinutes()<<5) |
    Math.floor(date.getSeconds()/2);

  const dosDate=
    ((year-1980)<<9) |
    ((date.getMonth()+1)<<5) |
    date.getDate();

  return {dosTime,dosDate};
}

function concatUint8(arrays){
  const total=arrays.reduce((sum,a)=>sum+a.length,0);
  const out=new Uint8Array(total);
  let offset=0;
  arrays.forEach(a=>{
    out.set(a,offset);
    offset+=a.length;
  });
  return out;
}

function createZip(files){
  const encoder=new TextEncoder();
  const now=zipDosDateTime(new Date());
  const localParts=[];
  const centralParts=[];
  let localOffset=0;

  for(const file of files){
    const nameBytes=encoder.encode(file.name);
    const dataBytes=typeof file.data==="string" ? encoder.encode(file.data) : file.data;
    const crc=crc32(dataBytes);

    const localHeader=new Uint8Array(30+nameBytes.length);
    writeU32(localHeader,0,0x04034B50);
    writeU16(localHeader,4,20);
    writeU16(localHeader,6,0x0800);
    writeU16(localHeader,8,0);
    writeU16(localHeader,10,now.dosTime);
    writeU16(localHeader,12,now.dosDate);
    writeU32(localHeader,14,crc);
    writeU32(localHeader,18,dataBytes.length);
    writeU32(localHeader,22,dataBytes.length);
    writeU16(localHeader,26,nameBytes.length);
    writeU16(localHeader,28,0);
    localHeader.set(nameBytes,30);

    localParts.push(localHeader,dataBytes);

    const centralHeader=new Uint8Array(46+nameBytes.length);
    writeU32(centralHeader,0,0x02014B50);
    writeU16(centralHeader,4,20);
    writeU16(centralHeader,6,20);
    writeU16(centralHeader,8,0x0800);
    writeU16(centralHeader,10,0);
    writeU16(centralHeader,12,now.dosTime);
    writeU16(centralHeader,14,now.dosDate);
    writeU32(centralHeader,16,crc);
    writeU32(centralHeader,20,dataBytes.length);
    writeU32(centralHeader,24,dataBytes.length);
    writeU16(centralHeader,28,nameBytes.length);
    writeU16(centralHeader,30,0);
    writeU16(centralHeader,32,0);
    writeU16(centralHeader,34,0);
    writeU16(centralHeader,36,0);
    writeU32(centralHeader,38,0);
    writeU32(centralHeader,42,localOffset);
    centralHeader.set(nameBytes,46);
    centralParts.push(centralHeader);

    localOffset+=localHeader.length+dataBytes.length;
  }

  const centralData=concatUint8(centralParts);
  const end=new Uint8Array(22);
  writeU32(end,0,0x06054B50);
  writeU16(end,4,0);
  writeU16(end,6,0);
  writeU16(end,8,files.length);
  writeU16(end,10,files.length);
  writeU32(end,12,centralData.length);
  writeU32(end,16,localOffset);
  writeU16(end,20,0);

  return concatUint8([...localParts,centralData,end]);
}

function makeInlineStringCell(ref,value,styleId="0"){
  return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function makeNumberCell(ref,value,styleId="0"){
  const number=Number(value);
  return `<c r="${ref}" s="${styleId}"><v>${Number.isFinite(number) ? number : 0}</v></c>`;
}

function downloadExcel(){
  if(!processedRows.length) processTransactions();

  const rows=getValidRows();
  if(!rows.length){
    setMessage($("outputMessage"),"Tidak ada baris valid untuk dibuat menjadi Excel.","error");
    return;
  }

  const headers=["No","Amount","Bank Code","Bank Account","Bank Account Name"];

  let sheetRows="";
  sheetRows+=`<row r="1" ht="20" customHeight="1">`;
  headers.forEach((header,index)=>{
    sheetRows+=makeInlineStringCell(`${excelColumnName(index+1)}1`,header,"1");
  });
  sheetRows+="</row>";

  rows.forEach((row,index)=>{
    const excelRow=index+2;
    sheetRows+=`<row r="${excelRow}">`;
    sheetRows+=makeNumberCell(`A${excelRow}`,index+1,"0");
    sheetRows+=makeNumberCell(`B${excelRow}`,row.amountNumeric,"2");
    sheetRows+=makeNumberCell(`C${excelRow}`,row.code,"0");

    // Sangat penting: nomor rekening ditulis sebagai STRING/TEXT,
    // bukan sebagai angka, sehingga 0 di depan tetap tersimpan.
    sheetRows+=makeInlineStringCell(`D${excelRow}`,row.account,"3");
    sheetRows+=makeInlineStringCell(`E${excelRow}`,row.name,"0");
    sheetRows+="</row>";
  });

  const lastRow=rows.length+1;

  const worksheetXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:E${lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="7" customWidth="1"/>
    <col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="3" width="13" customWidth="1"/>
    <col min="4" max="4" width="22" customWidth="1"/>
    <col min="5" max="5" width="30" customWidth="1"/>
  </cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:E${lastRow}"/>
</worksheet>`;

  const stylesXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0"/>
    <numFmt numFmtId="165" formatCode="@"/>
  </numFmts>
  <fonts count="2">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
      <scheme val="minor"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
      <scheme val="minor"/>
    </font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFE7E6E6"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
  </fills>
  <borders count="2">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFBFBFBF"/></left>
      <right style="thin"><color rgb="FFBFBFBF"/></right>
      <top style="thin"><color rgb="FFBFBFBF"/></top>
      <bottom style="thin"><color rgb="FFBFBFBF"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0"
        applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0"
        applyNumberFormat="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0"
        applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

  const workbookXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/>
  </bookViews>
  <sheets>
    <sheet name="DATA REKENING" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
    Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
</Relationships>`;

  const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"
    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml"
    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml"
    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const files=[
    {name:"[Content_Types].xml",data:contentTypes},
    {name:"_rels/.rels",data:rootRels},
    {name:"xl/workbook.xml",data:workbookXml},
    {name:"xl/_rels/workbook.xml.rels",data:workbookRels},
    {name:"xl/worksheets/sheet1.xml",data:worksheetXml},
    {name:"xl/styles.xml",data:stylesXml}
  ];

  const xlsxBytes=createZip(files);
  const blob=new Blob(
    [xlsxBytes],
    {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
  );

  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="hasil-rekening.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(()=>URL.revokeObjectURL(url),1000);

  setMessage(
    $("outputMessage"),
    `${rows.length} baris berhasil dibuat menjadi Excel (.xlsx). Bank Account disimpan sebagai Text.`,
    "ok"
  );
}

$("importDbBtn").addEventListener("click",importDatabase);
$("exportDbBtn").addEventListener("click",exportDatabase);
$("refreshDbBtn").addEventListener("click",()=>{
  loadSharedDatabase({silent:false,migrate:false});
});
$("processBtn").addEventListener("click",processTransactions);
$("copyBtn").addEventListener("click",copyResults);
$("downloadExcelBtn").addEventListener("click",downloadExcel);

$("clearDbBtn").addEventListener("click",async()=>{
  if(!database.length){
    setMessage($("bulkMessage"),"Database sudah kosong.","warn");
    return;
  }

  if(!confirm(
    "Hapus seluruh database rekening bersama? Data akan hilang untuk semua user."
  )) return;

  try{
    const result=await api(API_BASE,{method:"DELETE"});
    database=[];
    renderDatabase();
    markSyncSuccess(0);

    setMessage(
      $("bulkMessage"),
      `${result.deleted} rekening dihapus dari database bersama.`,
      "ok"
    );
  }catch(error){
    setMessage($("bulkMessage"),error.message,"error");
  }
});

$("clearInputBtn").addEventListener("click",()=>{
  $("inputData").value="";
  processedRows=[];
  renderResults();
  setMessage($("inputMessage"));
  setMessage($("outputMessage"));
});

$("sampleBtn").addEventListener("click",()=>{
  $("inputData").value=[
    "Fabian Aditya 46545464564 25.000.000",
    "Imam Mustakim 65414994165 25.000.000"
  ].join("\n");
  processTransactions();
});

$("dbBody").addEventListener("click",event=>{
  const del=event.target.closest("[data-delete]");
  if(del) deleteDatabase(Number(del.dataset.delete));
});

$("inputData").addEventListener("keydown",event=>{
  if(event.ctrlKey && event.key==="Enter") processTransactions();
});

renderDatabase();
renderResults();
loadSharedDatabase({silent:false,migrate:true});
startAutoSync();