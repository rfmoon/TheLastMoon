const STORAGE_KEY = "rekening_database_v4";

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
let database = loadDatabase();
let processedRows = [];

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

function loadDatabase(){
  try{
    const data=JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if(!Array.isArray(data)) return [];

    return data
      .map(row=>({
        bankCode:String(row.bankCode || ""),
        bankName:String(row.bankName || ""),
        name:String(row.name || "").trim(),
        account:cleanAccount(row.account || "")
      }))
      .filter(row=>row.bankCode && row.name && row.account);
  }catch{
    return [];
  }
}

function saveDatabase(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(database));
  renderDatabase();
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

  database.forEach((row,index)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${escapeHtml(row.bankName)}</td>
      <td>${escapeHtml(row.bankCode)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.account)}</td>
      <td>
        <div class="actions">
          <button class="danger small" data-delete="${index}">Hapus</button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });
}




function deleteDatabase(index){
  const row=database[index];
  if(!row) return;
  if(!confirm(`Hapus rekening ${row.name} — ${row.account}?`)) return;
  database.splice(index,1);
  saveDatabase();
  setMessage($("dbMessage"),"Data rekening berhasil dihapus.","ok");
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

function importDatabase(){
  const lines=$("bulkDatabase").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length){
    setMessage($("bulkMessage"),"Tempel data database terlebih dahulu.","warn");
    return;
  }

  let added=0,updated=0,failed=0;
  for(const line of lines){
    const parsed=parseDatabaseLine(line);
    if(!parsed.valid){ failed++; continue; }

    const index=database.findIndex(row=>row.account===parsed.record.account);
    if(index>=0){
      database[index]=parsed.record;
      updated++;
    }else{
      database.push(parsed.record);
      added++;
    }
  }

  saveDatabase();
  setMessage(
    $("bulkMessage"),
    `Selesai: ${added} ditambahkan, ${updated} diperbarui, ${failed} gagal.`,
    failed ? "warn" : "ok"
  );
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

function downloadCsv(){
  if(!processedRows.length) processTransactions();
  const rows=getValidRows();
  if(!rows.length){
    setMessage($("outputMessage"),"Tidak ada baris valid untuk di-download.","error");
    return;
  }

  const csv="\uFEFF"+rows.map(row=>
    [row.amount,row.code,row.account,row.name]
      .map(value=>'"'+String(value).replace(/"/g,'""')+'"')
      .join(";")
  ).join("\r\n");

  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="hasil-rekening-tanpa-header.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setMessage($("outputMessage"),"CSV berhasil dibuat tanpa header.","ok");
}

$("importDbBtn").addEventListener("click",importDatabase);
$("exportDbBtn").addEventListener("click",exportDatabase);
$("processBtn").addEventListener("click",processTransactions);
$("copyBtn").addEventListener("click",copyResults);
$("downloadBtn").addEventListener("click",downloadCsv);

$("clearDbBtn").addEventListener("click",()=>{
  if(!database.length){
    setMessage($("bulkMessage"),"Database sudah kosong.","warn");
    return;
  }
  if(!confirm("Hapus seluruh database rekening?")) return;
  database=[];
  saveDatabase();
  setMessage($("bulkMessage"),"Seluruh database berhasil dihapus.","ok");
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