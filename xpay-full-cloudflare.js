
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const API = '/api/xpay-cloud';

  let transactionRows = [];
  let settlementRows = [];
  let settlementDates = [];
  let disbursementRows = [];
  let balanceRows = [];
  let allTransactions = [];
  let selectedMarkIds = new Set();

  const today = new Date();
  const isoToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  ['checkDate','compareDate','balanceDate','disbDate','markDate'].forEach(id => { if ($(id)) $(id).value = isoToday; });

  function fmtRp(value){
    return 'Rp ' + Math.round(Number(value || 0)).toLocaleString('id-ID');
  }
  function fmtNum(value){
    return Math.round(Number(value || 0)).toLocaleString('id-ID');
  }
  function esc(value=''){
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function toast(message,type='ok'){
    const el=document.createElement('div');
    el.className=`toast ${type}`;
    el.textContent=message;
    $('toastHost').appendChild(el);
    setTimeout(()=>el.remove(),3500);
  }
  function status(id,message,type=''){
    const el=$(id);
    el.textContent=message;
    el.className='status'+(type?' '+type:'');
  }
  function setBusy(button,on,text='Memproses...'){
    if(!button) return;
    if(on){
      button.dataset.old=button.textContent;
      button.disabled=true;
      button.textContent=text;
    }else{
      button.disabled=false;
      if(button.dataset.old) button.textContent=button.dataset.old;
    }
  }
  async function api(action,{method='GET',params={},body=null}={}){
    const url=new URL(API,location.origin);
    url.searchParams.set('action',action);
    for(const [k,v] of Object.entries(params)){
      if(v!=='' && v!==null && v!==undefined) url.searchParams.set(k,v);
    }
    const response=await fetch(url,{
      method,
      credentials:'same-origin',
      cache:'no-store',
      headers:body?{'Content-Type':'application/json','Accept':'application/json'}:{'Accept':'application/json'},
      body:body?JSON.stringify(body):undefined
    });
    const text=await response.text();
    let data={};
    try{ data=text?JSON.parse(text):{}; }
    catch(_){ throw new Error(`Respons Cloudflare bukan JSON (HTTP ${response.status}).`); }
    if(!response.ok || data.success===false){
      if(response.status===503){
        throw new Error('Cloudflare Function timeout / sementara tidak tersedia (HTTP 503). V29 sudah mengurangi proses database saat membuka endpoint.');
      }
      const detail=[data.error,data.stage?`Tahap: ${data.stage}`:'',data.detail?`Detail: ${data.detail}`:'']
        .filter(Boolean).join(' • ');
      throw new Error(detail || `Cloudflare API HTTP ${response.status}.`);
    }
    return data;
  }

  function updateClock(){
    $('clock').textContent=new Date().toLocaleString('id-ID',{hour12:false});
  }
  updateClock(); setInterval(updateClock,1000);

  function switchMain(id){
    $$('.main-tab').forEach(b=>b.classList.toggle('active',b.dataset.main===id));
    $$('.main-panel').forEach(p=>p.classList.toggle('active',p.id===`main-${id}`));
    if(id==='withdraw') loadDisbursements();
  }
  $$('.main-tab').forEach(b=>b.addEventListener('click',()=>switchMain(b.dataset.main)));

  function switchDepositSub(id){
    $$('[data-deposit-sub]').forEach(b=>b.classList.toggle('active',b.dataset.depositSub===id));
    $$('#main-deposit .sub-panel').forEach(p=>p.classList.toggle('active',p.id===`deposit-${id}`));
    if(id==='batches') loadBatches();
    if(id==='data') loadTransactions();
    if(id==='balance') loadBalance();
  }
  $$('[data-deposit-sub]').forEach(b=>b.addEventListener('click',()=>switchDepositSub(b.dataset.depositSub)));

  function switchWithdrawSub(id){
    $$('[data-withdraw-sub]').forEach(b=>b.classList.toggle('active',b.dataset.withdrawSub===id));
    $$('#main-withdraw .withdraw-panel').forEach(p=>p.classList.toggle('active',p.id===`withdraw-${id}`));
    if(id==='list') loadDisbursements();
    if(id==='mark') loadMarkList();
    if(id==='batches') loadDisbursementBatches();
  }
  $$('[data-withdraw-sub]').forEach(b=>b.addEventListener('click',()=>switchWithdrawSub(b.dataset.withdrawSub)));

  $$('[data-balance-tab]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.balanceTab;
    $$('[data-balance-tab]').forEach(x=>x.classList.toggle('active',x===b));
    $$('.balance-panel').forEach(p=>p.classList.toggle('active',p.id===`balance-${id}`));
    if(id==='view') loadBalance();
    else loadBalanceBatches();
  }));

  async function readRows(file){
    if(!file) throw new Error('Pilih file terlebih dahulu.');
    if(typeof XLSX==='undefined') throw new Error('Library XLSX belum termuat. Refresh halaman.');
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:'array',cellDates:false});
    const sheet=workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''})
      .filter(row=>row.some(cell=>String(cell??'').trim()!==''));
  }
  function money(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=String(v??'').trim();
    if(!s) return 0;
    if(/^-?\d+(?:\.\d+)?$/.test(s)) return Number(s)||0;
    const neg=s.startsWith('-')||s.startsWith('(');
    const digits=s.replace(/[^0-9]/g,'');
    const n=digits?Number(digits):0;
    return neg?-n:n;
  }
  function paymentParts(s){
    const m=String(s||'').trim().match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
    if(!m) return null;
    return {date:m[1],sec:Number(m[2])*3600+Number(m[3])*60+Number(m[4])};
  }
  function addDays(dateStr,delta){
    const [y,m,d]=dateStr.split('-').map(Number);
    const dt=new Date(Date.UTC(y,m-1,d));
    dt.setUTCDate(dt.getUTCDate()+delta);
    return dt.toISOString().slice(0,10);
  }
  function settlementInfo(payment){
    const p=paymentParts(payment);
    if(!p) return null;
    if(p.sec>=23*3600+30*60){
      return {type:'CUTOFF',paymentDate:p.date,settlementDate:addDays(p.date,2)};
    }
    return {type:'SETTLEMENT',paymentDate:p.date,settlementDate:addDays(p.date,1)};
  }
  function uuid(v){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||'').trim()); }
  function batchId(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    return `batch_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}_${Math.floor(1000+Math.random()*9000)}`;
  }
  function parseFlexibleDate(value,format=''){
    const s=String(value||'').trim();
    let m;
    if(!s) return null;
    if((m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/))) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))){
      const a=Number(m[1]),b=Number(m[2]);
      if(format==='DD/MM/YYYY') return `${m[3]}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;
      if(format==='M/D/YYYY') return `${m[3]}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`;
      if(a>12&&b<=12) return `${m[3]}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;
      if(b>12&&a<=12) return `${m[3]}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`;
      return 'AMBIGUOUS';
    }
    if((m=s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    return null;
  }
  function isAmbiguousDate(v){
    const m=String(v||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return !!m && Number(m[1])<=12 && Number(m[2])<=12 && m[1]!==m[2];
  }
  function parseBalanceDate(v){
    const s=String(v||'').trim(); let m;
    if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[.:](\d{2})/)))
      return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')} ${String(m[4]).padStart(2,'0')}:${m[5]}:00`;
    if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)))
      return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')} 00:00:00`;
    if(/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return s;
    return null;
  }
  async function chunked(rows,size,fn){
    const results=[];
    for(let i=0;i<rows.length;i+=size){
      results.push(await fn(rows.slice(i,i+size),i));
      await new Promise(r=>setTimeout(r,0));
    }
    return results;
  }

  // ---------- SUMMARY ----------
  async function loadSummary(){
    try{
      const d=await api('summary');
      $('statTransactions').textContent=fmtNum(d.summary.total);
      $('statValue').textContent=fmtRp(d.summary.total_value);
      $('statFee').textContent=fmtRp(d.summary.total_fee);
      $('statNet').textContent=fmtRp(d.summary.total_net);
    }catch(e){ toast(e.message,'err'); }
  }
  $('refreshSummary').addEventListener('click',loadSummary);

  function normalizeHeader(value){
    return String(value ?? '').replace(/^\uFEFF/,'').trim().toUpperCase().replace(/[_\-]+/g,' ').replace(/\s+/g,' ');
  }
  function locateHeader(data, requiredNames=[], maxRows=20){
    const limit=Math.min(maxRows,data.length);
    for(let rowIndex=0;rowIndex<limit;rowIndex++){
      const headers=(data[rowIndex]||[]).map(normalizeHeader);
      if(requiredNames.every(group=>group.some(name=>headers.includes(normalizeHeader(name))))) return {rowIndex,headers};
    }
    return null;
  }
  function headerIndex(headers,names,fallback=-1){
    for(const name of names){const idx=headers.indexOf(normalizeHeader(name));if(idx>=0)return idx;}
    return fallback;
  }
  function parseSheetDate(value){
    const s=String(value ?? '').trim(); if(!s)return null; let m;
    if((m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/))) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))){
      const a=Number(m[1]),b=Number(m[2]);
      if(a>12 || b<=12) return `${m[3]}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;
      return `${m[3]}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`;
    }
    if((m=s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/))) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    return null;
  }
  function transactionRowsFromSheet(data,fileName){
    const located=locateHeader(data,[['PAYMENT'],['RECORD VALUE','VALUE','AMOUNT'],['PARTNER ID','PARTNER_ID','ORDER ID','ORDERID']]);
    if(!located) throw new Error(`${fileName}: header PAYMENT / RECORD VALUE / PARTNER ID tidak ditemukan.`);
    const H=located.headers;
    const I={
      id:headerIndex(H,['ID','TRANSACTION ID']), recordDate:headerIndex(H,['RECORD DATE']), value:headerIndex(H,['RECORD VALUE','VALUE','AMOUNT']),
      fee:headerIndex(H,['RECORD FEE','FEE']), merchant:headerIndex(H,['MERCHANT']), member:headerIndex(H,['MEMBER','USER ID','USERID']),
      payment:headerIndex(H,['PAYMENT','PAYMENT TIME']), settlement:headerIndex(H,['SETTLEMENT','SETTLEMENT DATE']),
      partner:headerIndex(H,['PARTNER ID','ORDER ID','ORDERID']), vendor:headerIndex(H,['VENDOR ID']), status:headerIndex(H,['STATUS','STATUS EXCEL']), ticket:headerIndex(H,['TICKET'])
    };
    const rows=[];let invalid=0;
    for(let i=located.rowIndex+1;i<data.length;i++){
      const r=data[i]||[];const payment=I.payment>=0?String(r[I.payment]??'').trim():'';const partner=I.partner>=0?String(r[I.partner]??'').trim():'';
      if(!payment||!partner||!uuid(partner))continue;const info=settlementInfo(payment);if(!info){invalid++;continue;}
      rows.push({rowNo:i+1,transactionId:I.id>=0?String(r[I.id]??'').trim():'',recordDate:I.recordDate>=0?String(r[I.recordDate]??'').trim():'',
        recordValue:I.value>=0?money(r[I.value]):0,recordFee:I.fee>=0?money(r[I.fee]):0,merchant:I.merchant>=0?String(r[I.merchant]??'').trim():'',
        member:I.member>=0?String(r[I.member]??'').trim():'',paymentTime:payment,settlementRaw:I.settlement>=0?String(r[I.settlement]??'').trim():'',partnerId:partner,
        vendorId:I.vendor>=0?String(r[I.vendor]??'').trim():'',statusExcel:I.status>=0?String(r[I.status]??'').trim():'',ticket:I.ticket>=0?String(r[I.ticket]??'').trim():'',
        settlementType:info.type,settlementDate:info.settlementDate,paymentDate:info.paymentDate,sourceFile:fileName});
    }
    return {rows,invalid};
  }
  function settlementRowsFromSheet(data,fileName){
    const located=locateHeader(data,[['SETTLEMENT','SETTLEMENT DATE'],['PARTNER ID'],['RECORD VALUE','AMOUNT','VALUE']]);
    if(!located) throw new Error(`${fileName}: header SETTLEMENT / PARTNER ID / RECORD VALUE tidak ditemukan.`);
    const H=located.headers;const sIdx=headerIndex(H,['SETTLEMENT','SETTLEMENT DATE']);const pIdx=headerIndex(H,['PARTNER ID']);const aIdx=headerIndex(H,['RECORD VALUE','AMOUNT','VALUE']);
    const rows=[];const counts=new Map();
    for(let i=located.rowIndex+1;i<data.length;i++){
      const r=data[i]||[];const raw=String(r[sIdx]??'').trim();const d=parseSheetDate(raw);if(d)counts.set(d,(counts.get(d)||0)+1);
      const partner=String(r[pIdx]??'').trim();const amount=money(r[aIdx]);if(uuid(partner)&&amount>0)rows.push({rowNo:i+1,partnerId:partner,amount,settlementRaw:raw,settlementDate:d,sourceFile:fileName});
    }
    return {rows,dateCounts:counts,headerRow:located.rowIndex+1};
  }

  // ---------- TRANSACTION UPLOAD ----------
  $('transactionFile').addEventListener('change',async()=>{
    const files=[...$('transactionFile').files];
    $('transactionFileName').textContent=files.length?files.map(f=>f.name).join(' • '):'Pilih 2 file transaksi atau lebih';
    transactionRows=[];if(!files.length)return;status('transactionUploadStatus',`Membaca ${files.length} file...`,'wait');
    try{
      let invalid=0;const details=[];
      for(const file of files){const data=await readRows(file);const parsed=transactionRowsFromSheet(data,file.name);transactionRows.push(...parsed.rows);invalid+=parsed.invalid;details.push(`${file.name}: ${parsed.rows.length.toLocaleString('id-ID')} trx`);}
      if(!transactionRows.length)throw new Error('Tidak ada transaksi valid dari file yang dipilih.');
      status('transactionUploadStatus',`${files.length} file terbaca • ${transactionRows.length.toLocaleString('id-ID')} transaksi valid${invalid?` • ${invalid} PAYMENT invalid`:''}. ${details.join(' | ')}`,'ok');
    }catch(e){status('transactionUploadStatus',e.message,'err');}
  });

  $('uploadTransactionBtn').addEventListener('click',async()=>{
    const files=[...$('transactionFile').files];
    if(!files.length||!transactionRows.length){toast('Pilih dan baca file transaksi terlebih dahulu.','err');return;}
    const btn=$('uploadTransactionBtn'); setBusy(btn,true,'Uploading...');
    const batch=batchId();
    const uploadName=files.map(f=>f.name).join(' + ');
    try{
      let saved=0,totalNet=0;
      await chunked(transactionRows,80,async(chunk,start)=>{
        status('transactionUploadStatus',`Upload ${Math.min(start+chunk.length,transactionRows.length).toLocaleString('id-ID')} / ${transactionRows.length.toLocaleString('id-ID')}...`,'wait');
        const r=await api('upload_transactions_chunk',{method:'POST',body:{batchId:batch,filename:uploadName,rows:chunk}});
        saved+=Number(r.saved||0); totalNet+=Number(r.totalNet||0);
      });
      status('transactionUploadStatus',`✅ BERHASIL! ${saved.toLocaleString('id-ID')} records • Batch ${batch} • Total Net ${fmtRp(totalNet)}`,'ok');
      toast('Transaction berhasil masuk Cloudflare.','ok');
      await loadSummary();
    }catch(e){status('transactionUploadStatus',e.message,'err');toast(e.message,'err');}
    finally{setBusy(btn,false);}
  });

  // ---------- SETTLEMENT UPLOAD ----------
  $('settlementFile').addEventListener('change',async()=>{
    const files=[...$('settlementFile').files];
    $('settlementFileName').textContent=files.length?files.map(f=>f.name).join(' • '):'Pilih 1 atau beberapa file settlement';
    settlementRows=[];settlementDates=[];$('settlementDateSelect').innerHTML='<option value="">Membaca...</option>';if(!files.length)return;
    status('settlementUploadStatus',`Mendeteksi header + tanggal dari ${files.length} file...`,'wait');
    try{
      const counts=new Map();const details=[];
      for(const file of files){const data=await readRows(file);const parsed=settlementRowsFromSheet(data,file.name);settlementRows.push(...parsed.rows);for(const [d,c] of parsed.dateCounts)counts.set(d,(counts.get(d)||0)+c);details.push(`${file.name}: ${parsed.rows.length.toLocaleString('id-ID')} rows`);}
      settlementDates=[...counts.keys()].sort((a,b)=>(counts.get(b)||0)-(counts.get(a)||0));
      $('settlementDateSelect').innerHTML=settlementDates.length?settlementDates.map(d=>`<option value="${esc(d)}">${esc(d)} • ${(counts.get(d)||0).toLocaleString('id-ID')} records</option>`).join(''):'<option value="">Tanggal SETTLEMENT tidak ditemukan</option>';
      if(!settlementRows.length)throw new Error('Tidak ada PARTNER ID + amount valid pada file settlement.');
      if(!settlementDates.length)throw new Error('Kolom SETTLEMENT ditemukan, tetapi isi tanggalnya tidak dapat dibaca.');
      status('settlementUploadStatus',`${files.length} file terbaca • ${settlementRows.length.toLocaleString('id-ID')} data settlement • ${settlementDates.length} tanggal terdeteksi. ${details.join(' | ')}`,'ok');
    }catch(e){status('settlementUploadStatus',e.message,'err');}
  });

  $('uploadSettlementBtn').addEventListener('click',async()=>{
    const files=[...$('settlementFile').files];
    const settlementDate=$('settlementDateSelect').value;
    if(!files.length||!settlementRows.length||!settlementDate){toast('Pilih file dan tanggal settlement.','err');return;}
    const settlementUploadName=files.map(f=>f.name).join(' + ');
    const btn=$('uploadSettlementBtn'); setBusy(btn,true,'Uploading...');
    const batch=batchId();
    try{
      const start=await api('upload_settlement_start',{method:'POST',body:{batchId:batch,filename:settlementUploadName,settlementDate}});
      let saved=0,totalAmount=0;
      await chunked(settlementRows,100,async(chunk,index)=>{
        status('settlementUploadStatus',`Upload ${Math.min(index+chunk.length,settlementRows.length).toLocaleString('id-ID')} / ${settlementRows.length.toLocaleString('id-ID')}...`,'wait');
        const r=await api('upload_settlement_chunk',{method:'POST',body:{fileId:start.fileId,rows:chunk}});
        saved+=Number(r.saved||0); totalAmount+=Number(r.totalAmount||0);
      });
      const done=await api('upload_settlement_finish',{method:'POST',body:{batchId:batch,fileId:start.fileId,filename:settlementUploadName,settlementDate,totalRecords:saved,totalAmount}});
      status('settlementUploadStatus',`✅ BERHASIL! ${saved.toLocaleString('id-ID')} records untuk ${settlementDate}. Match ${done.comparison.match} • Mismatch ${done.comparison.mismatch}`,'ok');
      toast('Settlement berhasil masuk Cloudflare.','ok');
    }catch(e){status('settlementUploadStatus',e.message,'err');toast(e.message,'err');}
    finally{setBusy(btn,false);}
  });

  // ---------- BATCHES ----------
  async function loadBatches(){
    const div=$('batchList'); div.innerHTML=loading();
    try{
      const d=await api('get_batches');
      if(!d.batches?.length){div.innerHTML=empty('Tidak ada batch');return;}
      div.innerHTML=table(['Waktu','File','Type','Records','Amount','User','Aksi'],d.batches.map(b=>[
        formatTime(b.uploaded_at), esc(b.filename), badge(b.file_type),
        fmtNum(b.total_records), fmtRp(b.total_amount), esc(b.uploaded_by),
        `<button class="btn danger small" data-del-batch="${esc(b.batch_id)}" data-type="${esc(b.file_type)}">Hapus</button>`
      ]));
      div.querySelectorAll('[data-del-batch]').forEach(btn=>btn.addEventListener('click',async()=>{
        if(!confirm(`Hapus batch ${btn.dataset.delBatch}?`)) return;
        try{
          const r=await api('delete_batch',{method:'POST',body:{batchId:btn.dataset.delBatch,fileType:btn.dataset.type}});
          toast(`Terhapus ${r.deleted} records.`,'ok'); loadBatches(); loadSummary();
        }catch(e){toast(e.message,'err');}
      }));
    }catch(e){div.innerHTML=empty(e.message);}
  }

  // ---------- CHECK SETTLEMENT ----------
  $('checkSettlementBtn').addEventListener('click',checkSettlement);
  async function checkSettlement(){
    const date=$('checkDate').value;if(!date)return;
    const div=$('checkResult');div.innerHTML=loading();
    try{
      const d=await api('check_settlement',{params:{date}});
      let html=`<div class="summary-grid">
        ${sumBox(`Settlement • ${d.settlement_source_date}`,`${d.settlement_count} trx`,[['Cair',d.settlement_amount_formatted],['Value',d.settlement_value_formatted],['Fee',d.settlement_fee_formatted]],'#e8c45a')}
        ${sumBox(`Cutoff • ${d.cutoff_source_date}`,`${d.cutoff_count} trx`,[['Cair',d.cutoff_amount_formatted],['Value',d.cutoff_value_formatted],['Fee',d.cutoff_fee_formatted]],'#ec4899')}
        ${sumBox(`TOTAL CAIR • ${date}`,`${d.total_count} trx`,[['Cair',d.total_amount_formatted],['Value',d.total_value_formatted],['Fee',d.total_fee_formatted]],'#10b981')}
      </div>`;
      if(d.cutoff_today_count>0) html+=`<div class="summary-grid">${sumBox(`Cutoff Hari Ini • ${d.cutoff_today_date}`,`${d.cutoff_today_count} trx`,[['Estimasi Cair',d.cutoff_today_amount_formatted],['Cair tanggal',d.cutoff_today_cair_date]],'#94a3b8')}</div>`;
      if(d.transactions?.length){
        html+=table(['Tgl','Time','Merchant','Member','Partner ID','Value','Fee','Net','Type'],d.transactions.map(t=>[
          esc(t.payment_date),esc(t.payment_time),esc(t.merchant),esc(t.member),`<code>${esc(t.partner_id)}</code>`,
          esc(t.record_value_formatted),esc(t.record_fee_formatted),`<span class="amount-pos">${esc(t.net_amount_formatted)}</span>`,badge(t.settlement_type)
        ]));
      }else html+=empty('Tidak ada data untuk tanggal ini');
      div.innerHTML=html;
    }catch(e){div.innerHTML=empty(e.message);}
  }

  // ---------- COMPARISON ----------
  $('compareBtn').addEventListener('click',loadComparison);
  async function loadComparison(){
    const date=$('compareDate').value;if(!date)return;
    const div=$('compareResult');div.innerHTML=loading();
    try{
      const d=await api('get_comparison',{params:{date}});
      if(!d.data?.length){div.innerHTML=empty('Tidak ada data comparison');return;}
      const s=d.summary;
      div.innerHTML=`<div class="summary-grid">
        ${metric('✅ Match',s.match,'#10b981')}${metric('❌ Mismatch',s.mismatch,'#ef4444')}
        ${metric('⚠ Missing Bank',s.missing_bank,'#f59e0b')}${metric('⚠ Missing Sistem',s.missing_system,'#8b5cf6')}
        ${metric('Total Expected',fmtRp(s.total_expected),'#e8c45a')}${metric('Total Actual',fmtRp(s.total_actual),'#10b981')}
        ${metric('Selisih',fmtRp(s.total_diff),Math.abs(Number(s.total_diff))<.01?'#10b981':'#ef4444')}
      </div>`+table(['Partner ID','Expected','Actual','Selisih','Count','Status'],d.data.map(r=>[
        `<code>${esc(r.partner_id)}</code>`,fmtRp(r.expected_amount),fmtRp(r.actual_amount),
        `<span class="${Math.abs(Number(r.difference))<.01?'':'amount-neg'}">${fmtRp(r.difference)}</span>`,
        fmtNum(r.transaction_count),comparisonBadge(r.status)
      ]));
    }catch(e){div.innerHTML=empty(e.message);}
  }

  // ---------- ALL TRANSACTIONS ----------
  $('loadTransactionsBtn').addEventListener('click',loadTransactions);
  $('transactionSearch').addEventListener('input',renderTransactions);
  async function loadTransactions(){
    const div=$('transactionTable');div.innerHTML=loading();
    try{
      const d=await api('get_transactions');
      allTransactions=d.data||[];
      renderTransactions();
    }catch(e){div.innerHTML=empty(e.message);}
  }
  function renderTransactions(){
    const q=$('transactionSearch').value.trim().toLowerCase();
    const rows=(q?allTransactions.filter(r=>`${r.payment_time} ${r.merchant} ${r.member} ${r.partner_id}`.toLowerCase().includes(q)):allTransactions).slice(0,5000);
    $('transactionTable').innerHTML=rows.length?table(['Payment','Merchant','Member','Partner ID','Value','Fee','Net','Type','Settlement'],rows.map(r=>[
      esc(r.payment_time),esc(r.merchant),esc(r.member),`<code>${esc(r.partner_id)}</code>`,
      fmtRp(r.record_value),fmtRp(r.record_fee),`<span class="amount-pos">${fmtRp(r.net_amount)}</span>`,badge(r.settlement_type),esc(r.settlement_date)
    ])):empty('Tidak ada data');
  }

  // ---------- DISBURSEMENT UPLOAD ----------
  $('disbursementFile').addEventListener('change',async()=>{
    const file=$('disbursementFile').files[0];
    $('disbursementFileName').textContent=file?.name||'Pilih file disbursement';
    disbursementRows=[];
    if(!file)return;
    status('disbursementUploadStatus','Membaca file...','wait');
    try{
      const data=await readRows(file);
      if(data.length<2) throw new Error('File kosong atau tidak valid.');
      data.shift();
      disbursementRows=data.map((row,i)=>({
        rowNo:i+2,transactionId:String(row[0]??'').trim(),dateRaw:String(row[1]??'').trim(),
        bankCode:String(row[2]??'').trim(),bankNo:String(row[3]??'').trim(),accountName:String(row[4]??'').trim(),
        amount:money(row[5]),refId:String(row[6]??'').trim(),vendorStatus:String(row[8]??'').trim()
      })).filter(r=>r.refId);
      const ambiguous=disbursementRows.filter(r=>isAmbiguousDate(r.dateRaw)).length;
      status('disbursementUploadStatus',`${disbursementRows.length.toLocaleString('id-ID')} baris siap • ${ambiguous} tanggal ambiguous${ambiguous?' (pilih format tanggal)':''}.`,'ok');
    }catch(e){status('disbursementUploadStatus',e.message,'err');}
  });
  $('uploadDisbursementBtn').addEventListener('click',async()=>{
    const file=$('disbursementFile').files[0];if(!file||!disbursementRows.length){toast('Pilih file disbursement.','err');return;}
    const format=$('disbursementDateFormat').value;
    const parsed=[];let invalid=0;
    for(const r of disbursementRows){
      const d=parseFlexibleDate(r.dateRaw,format);
      if(!d||d==='AMBIGUOUS'){invalid++;continue;}
      parsed.push({...r,dateDisbursement:d});
    }
    if(invalid){toast(`${invalid} tanggal belum bisa diparse. Pilih format tanggal yang benar.`,'err');return;}
    const batch=batchId(),btn=$('uploadDisbursementBtn');setBusy(btn,true,'Uploading...');
    let ins=0,upd=0,changed=0,preserved=0;
    try{
      await chunked(parsed,70,async(chunk,start)=>{
        status('disbursementUploadStatus',`Upload ${Math.min(start+chunk.length,parsed.length)} / ${parsed.length}...`,'wait');
        const d=await api('upload_disbursement_chunk',{method:'POST',body:{batchId:batch,rows:chunk}});
        ins+=Number(d.inserted||0);upd+=Number(d.updated||0);changed+=Number(d.statusChanged||0);preserved+=Number(d.preservedDone||0);
      });
      await api('finish_disbursement_upload',{method:'POST',body:{batchId:batch,filename:file.name,totalRecords:ins+upd}});
      status('disbursementUploadStatus',`✅ BERHASIL! Insert ${ins} • Update ${upd} • Status Changed ${changed} • Done Preserved ${preserved} • Batch ${batch}`,'ok');
      toast('Disbursement berhasil di-upload.','ok');
      loadDisbursements();
    }catch(e){status('disbursementUploadStatus',e.message,'err');toast(e.message,'err');}
    finally{setBusy(btn,false);}
  });

  // ---------- DISBURSEMENT LIST ----------
  $('loadDisbursementsBtn').addEventListener('click',loadDisbursements);
  async function loadDisbursements(){
    const list=$('disbList');list.innerHTML=loading();$('disbSummary').innerHTML='';
    try{
      const d=await api('get_disbursements',{params:{date:$('disbDate').value,status:$('disbStatus').value,done:$('disbDone').value}});
      const s=d.summary||{};
      $('disbSummary').innerHTML=`<div class="summary-grid">
        ${metric('Total',s.total||0,'#e8c45a')}${metric('Pending',s.pending_count||0,'#f59e0b')}
        ${metric('Failed',s.failed_count||0,'#ef4444')}${metric('Success',s.success_count||0,'#10b981')}
        ${metric('Done',s.done_count||0,'#06b6d4')}
      </div>`;
      if(!d.data?.length){list.innerHTML=empty('Tidak ada data');return;}
      let body='';
      for(const r of d.data){
        body+=`<tr>
          <td><button class="btn ghost small log-toggle" data-ref="${esc(r.ref_id)}">Log</button></td>
          <td>${esc(r.date_formatted)}</td><td><code>${esc(r.transaction_id)}</code></td><td>${esc(r.bank_code)}</td>
          <td><code>${esc(r.bank_no)}</code></td><td>${esc(r.account_name)}</td><td class="amount-pos">${esc(r.amount_formatted)}</td>
          <td><span class="ref-copy" data-copy="${esc(r.ref_id)}">${esc(r.ref_id)}</span></td><td>${statusBadge(r)}</td>
          <td>${Number(r.status_done)===1?'<span class="badge badge-done">DONE</span>':'—'}</td></tr>
          <tr class="log-row" id="logrow-${safeId(r.ref_id)}"><td colspan="10"><div class="log-box" id="logs-${safeId(r.ref_id)}">Loading...</div></td></tr>`;
      }
      list.innerHTML=`<div class="table-wrap"><table><thead><tr><th></th><th>Tgl</th><th>ID</th><th>Bank</th><th>No. Rek</th><th>Nama</th><th>Amount</th><th>REF ID</th><th>Status</th><th>Done</th></tr></thead><tbody>${body}</tbody></table></div>`;
      list.querySelectorAll('[data-copy]').forEach(el=>el.addEventListener('click',()=>copyText(el.dataset.copy)));
      list.querySelectorAll('.log-toggle').forEach(el=>el.addEventListener('click',()=>toggleLogs(el.dataset.ref)));
    }catch(e){list.innerHTML=empty(e.message);}
  }
  async function toggleLogs(ref){
    const row=$(`logrow-${safeId(ref)}`),box=$(`logs-${safeId(ref)}`);
    const opening=!row.classList.contains('active');row.classList.toggle('active');
    if(opening&&!box.dataset.loaded){
      box.dataset.loaded='1';
      try{
        const d=await api('get_disbursement_logs',{params:{ref_id:ref}});
        box.innerHTML=d.logs?.length?d.logs.map(l=>`<div class="log-item"><span class="log-action">${esc(l.action_type)}</span>${l.field_name?`<span>${esc(l.field_name)}: ${esc(l.old_value||'—')} → ${esc(l.new_value||'—')}</span>`:''}<span>${esc(l.changed_by)}</span><span class="log-time">${esc(l.changed_at_formatted)}</span></div>`).join(''):'<span class="muted">Belum ada audit log</span>';
      }catch(e){box.textContent=e.message;}
    }
  }

  // ---------- MARK DONE ----------
  $('loadMarkBtn').addEventListener('click',loadMarkList);
  $('markDoneBtn').addEventListener('click',()=>applyMark('mark'));
  $('unmarkBtn').addEventListener('click',()=>applyMark('unmark'));
  async function loadMarkList(){
    selectedMarkIds.clear();updateBulkBar();
    const list=$('markList');list.innerHTML=loading();
    try{
      const d=await api('get_disbursements',{params:{date:$('markDate').value,status:$('markStatus').value,done:$('markDone').value}});
      if(!d.data?.length){list.innerHTML=empty('Tidak ada data');return;}
      list.innerHTML=`<label style="display:flex;gap:8px;align-items:center;margin-bottom:8px;font-size:11px"><input type="checkbox" id="selectAllMark"> Pilih Semua (${d.data.length})</label>`+
        table(['','Tgl','Bank','No. Rek','Nama','Amount','REF ID','Status','Done'],d.data.map(r=>[
          `<input type="checkbox" class="mark-cb" value="${r.id}">`,esc(r.date_formatted),esc(r.bank_code),`<code>${esc(r.bank_no)}</code>`,esc(r.account_name),
          esc(r.amount_formatted),`<span class="ref-copy" data-copy="${esc(r.ref_id)}">${esc(r.ref_id)}</span>`,statusBadge(r),
          Number(r.status_done)===1?'<span class="badge badge-done">DONE</span>':'—'
        ]));
      $('selectAllMark').addEventListener('change',e=>{
        list.querySelectorAll('.mark-cb').forEach(cb=>{cb.checked=e.target.checked; if(cb.checked)selectedMarkIds.add(Number(cb.value));else selectedMarkIds.delete(Number(cb.value));});updateBulkBar();
      });
      list.querySelectorAll('.mark-cb').forEach(cb=>cb.addEventListener('change',()=>{
        if(cb.checked)selectedMarkIds.add(Number(cb.value));else selectedMarkIds.delete(Number(cb.value));updateBulkBar();
      }));
      list.querySelectorAll('[data-copy]').forEach(el=>el.addEventListener('click',()=>copyText(el.dataset.copy)));
    }catch(e){list.innerHTML=empty(e.message);}
  }
  function updateBulkBar(){
    $('selectedCount').textContent=`${selectedMarkIds.size} dipilih`;
    $('bulkBar').classList.toggle('active',selectedMarkIds.size>0);
  }
  async function applyMark(action){
    if(!selectedMarkIds.size){toast('Pilih minimal 1 data.','err');return;}
    if(!confirm(`${action==='mark'?'Mark DONE':'Unmark'} ${selectedMarkIds.size} data?`))return;
    try{
      const d=await api('mark_disbursement_done',{method:'POST',body:{ids:[...selectedMarkIds],actionType:action}});
      toast(`${d.changed} data berhasil diproses.`,'ok');loadMarkList();loadDisbursements();
    }catch(e){toast(e.message,'err');}
  }

  // ---------- DISBURSEMENT BATCH ----------
  async function loadDisbursementBatches(){
    const div=$('disbBatchList');div.innerHTML=loading();
    try{
      const d=await api('get_disbursement_batches');
      if(!d.batches?.length){div.innerHTML=empty('Belum ada batch disbursement');return;}
      div.innerHTML=table(['Waktu','File','Records','User','Aksi'],d.batches.map(b=>[
        formatTime(b.uploaded_at),esc(b.filename),fmtNum(b.total_records),esc(b.uploaded_by),
        `<button class="btn danger small" data-del-disb="${esc(b.batch_id)}">Hapus</button>`
      ]));
      div.querySelectorAll('[data-del-disb]').forEach(btn=>btn.addEventListener('click',async()=>{
        if(!confirm('Hapus batch, marks, dan audit log terkait?'))return;
        try{const d=await api('delete_disbursement_batch',{method:'POST',body:{batchId:btn.dataset.delDisb}});toast(`Terhapus ${d.deleted} data.`,'ok');loadDisbursementBatches();}catch(e){toast(e.message,'err');}
      }));
    }catch(e){div.innerHTML=empty(e.message);}
  }

  // ---------- BALANCE ----------
  $('balanceFile').addEventListener('change',async()=>{
    const file=$('balanceFile').files[0];$('balanceFileName').textContent=file?.name||'Pilih file balance';balanceRows=[];
    if(!file)return;
    status('balanceUploadStatus','Membaca file...','wait');
    try{
      const data=await readRows(file);if(data.length<2)throw new Error('File kosong atau tidak valid.');data.shift();
      balanceRows=data.map((r,i)=>({
        rowNo:i+2,recordId:String(r[0]??'').trim(),dateCreated:parseBalanceDate(r[1]),note:String(r[2]??'').trim(),
        credit:money(r[3]),debit:money(r[4]),balance:money(r[5])
      })).filter(r=>r.recordId&&r.dateCreated);
      status('balanceUploadStatus',`${balanceRows.length.toLocaleString('id-ID')} baris valid siap di-upload.`,'ok');
    }catch(e){status('balanceUploadStatus',e.message,'err');}
  });
  $('uploadBalanceBtn').addEventListener('click',async()=>{
    const file=$('balanceFile').files[0];if(!file||!balanceRows.length){toast('Pilih file balance.','err');return;}
    const batch=batchId(),btn=$('uploadBalanceBtn');setBusy(btn,true,'Uploading...');
    let saved=0;
    try{
      await chunked(balanceRows,100,async(chunk,start)=>{
        status('balanceUploadStatus',`Upload ${Math.min(start+chunk.length,balanceRows.length)} / ${balanceRows.length}...`,'wait');
        const d=await api('upload_balance_chunk',{method:'POST',body:{batchId:batch,rows:chunk}});saved+=Number(d.saved||0);
      });
      status('balanceUploadStatus',`✅ BERHASIL! Insert ${saved} records • Batch ${batch}`,'ok');toast('Balance berhasil di-upload.','ok');loadBalance();
    }catch(e){status('balanceUploadStatus',e.message,'err');toast(e.message,'err');}
    finally{setBusy(btn,false);}
  });
  $('loadBalanceBtn').addEventListener('click',loadBalance);
  async function loadBalance(){
    const list=$('balanceList');list.innerHTML=loading();$('balanceSummary').innerHTML='';
    try{
      const d=await api('get_balance_history',{params:{date:$('balanceDate').value}});
      const s=d.summary;
      $('balanceSummary').innerHTML=`<div class="summary-grid">
        ${metric('Seluruh biaya',fmtRp(s.sum_credit),'#10b981')}${metric('Refund biaya',s.sum_debit_formatted,'#ef4444')}
        ${metric('🎯 Total Biaya × -1',s.total_biaya_formatted,s.total_biaya>=0?'#e8c45a':'#ef4444')}
        ${metric('Total Records',fmtNum(s.total_records),'#8b5cf6')}
        ${metric('Total Credit Semua',s.total_credit_all_formatted,'#06b6d4')}${metric('Total Debit Semua',s.total_debit_all_formatted,'#ef4444')}
      </div>`;
      if(!d.data?.length){list.innerHTML=empty('Tidak ada data');return;}
      list.innerHTML=table(['ID','Tanggal','Note','Credit','Debit','Balance'],d.data.map(r=>[
        `<code>${esc(r.record_id)}</code>`,esc(r.date_formatted),`<span style="white-space:normal">${esc(r.note)}</span>`,
        `<span class="${Number(r.credit)<0?'amount-neg':'amount-pos'}">${esc(r.credit_formatted)}</span>`,
        `<span class="${Number(r.debit)>0?'amount-neg':''}">${esc(r.debit_formatted)}</span>`,esc(r.balance_formatted)
      ]));
    }catch(e){list.innerHTML=empty(e.message);}
  }
  async function loadBalanceBatches(){
    const div=$('balanceBatchList');div.innerHTML=loading();
    try{
      const d=await api('get_balance_batches');if(!d.batches?.length){div.innerHTML=empty('Belum ada batch balance');return;}
      div.innerHTML=table(['Waktu','Batch ID','Records','User','Aksi'],d.batches.map(b=>[
        esc(b.uploaded_at_formatted),`<code>${esc(b.batch_id)}</code>`,fmtNum(b.total_records),esc(b.uploaded_by),
        `<button class="btn danger small" data-del-balance="${esc(b.batch_id)}">Hapus</button>`
      ]));
      div.querySelectorAll('[data-del-balance]').forEach(btn=>btn.addEventListener('click',async()=>{
        if(!confirm('Hapus batch balance ini?'))return;
        try{const d=await api('delete_balance_batch',{method:'POST',body:{batchId:btn.dataset.delBalance}});toast(`Terhapus ${d.deleted} records.`,'ok');loadBalanceBatches();}catch(e){toast(e.message,'err');}
      }));
    }catch(e){div.innerHTML=empty(e.message);}
  }

  // ---------- HELPERS ----------
  function table(headers,rows){
    return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function empty(text){return `<div class="empty">${esc(text)}</div>`;}
  function loading(){return '<div class="empty">Memuat data...</div>';}
  function metric(label,value,color){return `<div class="summary-item" style="border-left:4px solid ${color}"><div class="summary-label">${label}</div><div class="summary-value">${value}</div></div>`;}
  function sumBox(label,value,lines,color){return `<div class="summary-item" style="border-left:4px solid ${color}"><div class="summary-label">${label}</div><div class="summary-value">${value}</div>${lines.map(x=>`<div style="font-size:10px;color:var(--muted);margin-top:4px">${x[0]}: <b style="color:#fff">${x[1]}</b></div>`).join('')}</div>`;}
  function badge(type){
    const t=String(type||'').toUpperCase();
    const cls=t==='SETTLEMENT'?'badge-settlement':t==='CUTOFF'?'badge-cutoff':t==='TRANSACTION'?'badge-transaction':t==='DISBURSEMENT'?'badge-disbursement':'badge-settlement-file';
    return `<span class="badge ${cls}">${esc(t||'-')}</span>`;
  }
  function comparisonBadge(s){
    const v=String(s||'');
    if(v==='MATCH')return '<span class="badge badge-success">MATCH</span>';
    if(v==='MISMATCH')return '<span class="badge badge-failed">MISMATCH</span>';
    return `<span class="badge badge-pending">${esc(v)}</span>`;
  }
  function statusBadge(r){
    if(Number(r.status_done)===1)return '<span class="badge badge-done">DONE</span>';
    const s=String(r.vendor_status||'').toLowerCase();
    if(!s||s==='pending')return '<span class="badge badge-pending">PENDING</span>';
    if(s.includes('failed')||s.includes('refund'))return '<span class="badge badge-failed">FAILED - REFUND</span>';
    if(s==='success')return '<span class="badge badge-success">SUCCESS</span>';
    return `<span class="badge">${esc(r.vendor_status)}</span>`;
  }
  function safeId(s){return String(s||'').replace(/[^a-zA-Z0-9_-]/g,'_');}
  async function copyText(text){
    try{await navigator.clipboard.writeText(text);}catch(_){
      const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
    }
    toast('REF ID copied','ok');
  }
  function formatTime(v){
    const n=Number(v);
    if(Number.isFinite(n)&&n>0)return new Date(n).toLocaleString('id-ID');
    return String(v||'');
  }

  loadSummary();
})();
