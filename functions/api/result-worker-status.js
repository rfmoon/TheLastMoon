
const COOKIE_NAME = "thelastmoon_session";
class ApiError extends Error {
  constructor(status,message,stage=""){super(message);this.status=status;this.stage=stage;}
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
function readCookie(header,name){for(const part of String(header||"").split(";")){const [key,...rest]=part.trim().split("=");if(key===name)return decodeURIComponent(rest.join("=")||"");}return "";}
async function sha256(value){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value||"")));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function requireMaster(request,db){
  const token=readCookie(request.headers.get("Cookie"),COOKIE_NAME);
  if(!token)throw new ApiError(401,"Sesi login habis.","session");
  const user=await db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1 LIMIT 1`).bind(await sha256(token),Date.now()).first();
  if(!user)throw new ApiError(401,"Sesi login habis.","session");
  if(Number(user.is_master)!==1)throw new ApiError(403,"MASTER ADMINISTRATOR ONLY.","master");
  return user;
}
async function ensureSchema(db){
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS lottery_results (
      result_key TEXT PRIMARY KEY,pool TEXT NOT NULL DEFAULT '',display_name TEXT NOT NULL,periode TEXT NOT NULL DEFAULT '',
      result_date TEXT NOT NULL,result_time TEXT NOT NULL DEFAULT '',n1 TEXT NOT NULL,n2 TEXT NOT NULL DEFAULT '',
      n3 TEXT NOT NULL DEFAULT '',shio TEXT NOT NULL DEFAULT '',result_text TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'luna-extension',received_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS result_worker_settings (
      id INTEGER PRIMARY KEY CHECK (id=1),worker_url TEXT NOT NULL DEFAULT 'https://thelastmoon-result-cron.thelastmoon.workers.dev',
      updated_by INTEGER,updated_at INTEGER NOT NULL)`)
  ]);
  const row=await db.prepare(`SELECT id FROM result_worker_settings WHERE id=1`).first();
  if(!row)await db.prepare(`INSERT INTO result_worker_settings(id,worker_url,updated_at) VALUES(1,?,?)`).bind("https://thelastmoon-result-cron.thelastmoon.workers.dev",Date.now()).run();
}
function cleanWorkerUrl(value){
  let u; try{u=new URL(String(value||"").trim());}catch(_){throw new ApiError(400,"URL Browser Worker tidak valid.","worker-url");}
  if(u.protocol!=="https:")throw new ApiError(400,"URL Browser Worker wajib HTTPS.","worker-url");
  return u.origin;
}
async function getStats(db){
  const t=await db.prepare(`SELECT COUNT(*) total,COUNT(DISTINCT result_date) dates,COUNT(DISTINCT pool) markets,MAX(updated_at) lastSyncAt FROM lottery_results`).first();
  const l=await db.prepare(`SELECT result_date date,COUNT(*) total FROM lottery_results GROUP BY result_date ORDER BY result_date DESC LIMIT 1`).first();
  return {total:Number(t?.total||0),dates:Number(t?.dates||0),markets:Number(t?.markets||0),lastSyncAt:Number(t?.lastSyncAt||0),latestDate:l?.date||"",latestDateTotal:Number(l?.total||0)};
}
async function fetchWorkerHealth(workerUrl){
  try{
    const r=await fetch(`${workerUrl}/health`,{headers:{Accept:"application/json"}});
    const text=await r.text(); let d={}; try{d=text?JSON.parse(text):{};}catch(_){}
    return {ok:Boolean(r.ok&&d?.ok&&d?.browserBinding&&d?.resultApiKeyConfigured),httpStatus:r.status,version:String(d?.version||""),browserBinding:Boolean(d?.browserBinding),resultApiKeyConfigured:Boolean(d?.resultApiKeyConfigured),sourceUrl:String(d?.sourceUrl||""),error:r.ok?"":(d?.error||`HTTP ${r.status}`)};
  }catch(e){return {ok:false,httpStatus:0,version:"",browserBinding:false,resultApiKeyConfigured:false,sourceUrl:"",error:e?.message||String(e)};}
}
export async function onRequestGet({request,env}){
  try{
    if(!env.DB)throw new ApiError(500,"Binding D1 DB belum ditemukan.","binding");
    await ensureSchema(env.DB); await requireMaster(request,env.DB);
    const s=await env.DB.prepare(`SELECT worker_url workerUrl FROM result_worker_settings WHERE id=1 LIMIT 1`).first();
    const workerUrl=cleanWorkerUrl(s?.workerUrl||"https://thelastmoon-result-cron.thelastmoon.workers.dev");
    const [worker,stats]=await Promise.all([fetchWorkerHealth(workerUrl),getStats(env.DB)]);
    return json({ok:true,masterOnly:true,workerUrl,worker,stats,cronInterval:"10 menit",liveCheckInterval:"5 detik"});
  }catch(e){return json({ok:false,error:e?.message||String(e),stage:e?.stage||undefined},e instanceof ApiError?e.status:500);}
}
export async function onRequestPut({request,env}){
  try{
    if(!env.DB)throw new ApiError(500,"Binding D1 DB belum ditemukan.","binding");
    await ensureSchema(env.DB); const user=await requireMaster(request,env.DB);
    const body=await request.json(); const workerUrl=cleanWorkerUrl(body?.workerUrl);
    await env.DB.prepare(`UPDATE result_worker_settings SET worker_url=?,updated_by=?,updated_at=? WHERE id=1`).bind(workerUrl,user.id,Date.now()).run();
    return json({ok:true,workerUrl});
  }catch(e){return json({ok:false,error:e?.message||String(e),stage:e?.stage||undefined},e instanceof ApiError?e.status:500);}
}
